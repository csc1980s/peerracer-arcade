import * as THREE from 'three';
import { sampleHeight } from '../ocean/waves.js';

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const easeInOut = (t) => t * t * (3 - 2 * t);
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();

/**
 * Drives one ship: steering, wave-following buoyancy (heave / pitch / roll springs),
 * turret slewing, recoil, wake stamping and the procedural sinking sequence.
 *
 * Transform stack:  object (x, heave, z; yaw-pitch-roll)  >  model root
 */
export class ShipController {
  constructor({ root, turrets, spec }, { waves, wakeField = null, vfx = null, id = '' } = {}) {
    this.id = id;
    this.spec = spec;
    this.waves = waves;
    this.wakeField = wakeField;
    this.vfx = vfx;
    this.object = new THREE.Group();
    this.object.name = `shipctl_${id}`;
    this.object.rotation.order = 'YXZ';
    this.object.add(root);
    this.model = root;
    this.turrets = turrets.map((t) => ({ ...t, yaw: t.restYaw, pitch: 0, targetYaw: t.restYaw, targetPitch: 0 }));

    this.heading = 0;
    this.speed = 0;
    this.targetSpeed = 0;
    this.targetHeading = null;
    this.turnRate = 0.06 * (200 / spec.length);  // rad/s, smaller ships turn faster
    this.accel = 0.4;
    this.waypoints = [];

    this.heave = 0;
    this.pitch = 0; this.pitchVel = 0;
    this.roll = 0; this.rollVel = 0;
    this.state = 'afloat';
    this.sinkT = 0;
    this.stampTimer = 0;
    this.fires = [];
    this._aimResolve = null;
    this._sinkResolve = null;
    this.wakeStrength = 1;
  }

  get position() { return this.object.position; }

  place(x, z, heading = 0) {
    this.object.position.set(x, 0, z);
    this.heading = heading;
    this.targetHeading = heading;
  }

  /** Steam along waypoints [{x, z}] at `speed` m/s. Resolves on arrival. */
  moveTo(points, speed = this.spec.speed) {
    this.waypoints = points.map((p) => new THREE.Vector2(p.x, p.z));
    this.targetSpeed = speed;
    return new Promise((res) => { this._moveResolve = res; });
  }

  setCourse(heading, speed) {
    this.waypoints = [];
    this.targetHeading = heading;
    this.targetSpeed = speed;
  }

  /** Slew every turret that can bear on `point`. Resolves when on target. */
  aimAt(point, flightTime = 3, gravity = 30) {
    this.object.updateMatrixWorld(true);
    let any = false;
    for (const t of this.turrets) {
      const parent = t.pivot.parent;
      const local = parent.worldToLocal(_p.copy(point));
      const dx = local.x - t.pivot.position.x, dz = local.z - t.pivot.position.z;
      const desired = Math.atan2(dx, dz);
      const rel = wrapAngle(desired - t.restYaw);
      t.canBear = rel >= t.arc[0] && rel <= t.arc[1];
      t.targetYaw = t.restYaw + THREE.MathUtils.clamp(rel, t.arc[0], t.arc[1]);
      const dist = Math.hypot(dx, dz);
      const vy = (point.y - 10 + 0.5 * gravity * flightTime * flightTime) / flightTime;
      t.targetPitch = t.torpedo ? 0 : Math.atan2(vy, dist / flightTime);
      any = any || t.canBear;
    }
    this._aimResolve?.();
    return new Promise((res) => { this._aimResolve = res; });
  }

  /** World-space muzzle positions/directions for turrets that can bear. */
  getMuzzles() {
    this.object.updateMatrixWorld(true);
    const out = [];
    this.turrets.forEach((t, ti) => {
      if (t.canBear === false) return;
      for (const m of t.muzzles) {
        const pos = m.getWorldPosition(new THREE.Vector3());
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(m.getWorldQuaternion(_q)).normalize();
        out.push({ pos, dir, turret: ti, calibre: t.calibre, torpedo: !!t.torpedo });
      }
    });
    return out;
  }

  /** Broadside recoil: kicks the roll spring away from the firing side. */
  applyRecoil(strength, worldDir) {
    const right = _d.set(Math.cos(this.heading), 0, -Math.sin(this.heading));
    const side = Math.sign(right.dot(worldDir)) || 1;
    this.rollVel += side * strength * 0.004;
  }

  /** Begin the class-specific sinking sequence. Resolves once fully submerged. */
  sink() {
    if (this.state !== 'afloat') return Promise.resolve();
    this.state = 'sinking';
    this.sinkT = 0;
    this.targetSpeed = 0;
    this.waypoints = [];
    const s = this.spec.sink;
    this.sinkRollSign = s.rollDir * (Math.random() < 0.25 ? -1 : 1);
    const pitchRad = THREE.MathUtils.degToRad(Math.abs(s.pitch));
    const rollRad = THREE.MathUtils.degToRad(s.roll);
    this.sinkDepth = s.depth + Math.sin(pitchRad) * this.spec.length * 0.5 + Math.sin(rollRad) * this.spec.beam * 0.5 + this.spec.freeboard * 2.5;
    return new Promise((res) => { this._sinkResolve = res; });
  }

  wakeInfo() {
    const p = this.object.position;
    return { x: p.x, z: p.z, heading: this.heading, speed: this.speed, length: this.spec.length, beam: this.spec.beam, wakeStrength: this.wakeStrength };
  }

  waterHeight(x, z, t) { return sampleHeight(this.waves, x, z, t, 3); }

  update(dt, time) {
    if (this.state === 'sunk') return;
    this._steer(dt);
    this._buoyancy(dt, time);
    this._turrets(dt);
    if (this.state === 'sinking') this._sinking(dt);
    this._applyTransform();
    this._stampWake(dt);
  }

  _steer(dt) {
    const pos = this.object.position;
    if (this.waypoints.length) {
      const wp = this.waypoints[0];
      const dx = wp.x - pos.x, dz = wp.y - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < Math.max(20, this.spec.length * 0.25)) {
        this.waypoints.shift();
        if (!this.waypoints.length) { this.targetSpeed = 0; this._moveResolve?.(); this._moveResolve = null; }
      } else {
        this.targetHeading = Math.atan2(dx, dz);
      }
    }
    if (this.targetHeading !== null) {
      const diff = wrapAngle(this.targetHeading - this.heading);
      const maxTurn = this.turnRate * dt * Math.min(1, 0.3 + this.speed / 8);
      this.heading = wrapAngle(this.heading + THREE.MathUtils.clamp(diff, -maxTurn, maxTurn));
      // Ships heel outward in a turn.
      this.rollVel += -Math.sign(diff) * Math.min(Math.abs(diff), 0.3) * this.speed * 0.0006;
    }
    const ds = this.targetSpeed - this.speed;
    this.speed += THREE.MathUtils.clamp(ds, -this.accel * dt, this.accel * dt);
    pos.x += Math.sin(this.heading) * this.speed * dt;
    pos.z += Math.cos(this.heading) * this.speed * dt;
  }

  _buoyancy(dt, t) {
    const { length: L, beam: B } = this.spec;
    const p = this.object.position, h = this.heading;
    const fx = Math.sin(h), fz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
    const hb = this.waterHeight(p.x + fx * L * 0.42, p.z + fz * L * 0.42, t);
    const hs = this.waterHeight(p.x - fx * L * 0.42, p.z - fz * L * 0.42, t);
    const hp = this.waterHeight(p.x + rx * B * 0.5, p.z + rz * B * 0.5, t);
    const hst = this.waterHeight(p.x - rx * B * 0.5, p.z - rz * B * 0.5, t);
    const hc = this.waterHeight(p.x, p.z, t);
    const coupling = this.state === 'sinking' ? Math.max(0, 1 - this.sinkT * 1.5) : 1;

    const heaveTarget = ((hb + hs + hp + hst) * 0.5 + hc) / 3;
    const k = 1 - Math.exp(-dt / this.spec.response);
    this.heave += (heaveTarget * coupling - this.heave) * k;

    const pitchTarget = (Math.atan2(hb - hs, L * 0.84) + this.speed * 0.0015) * coupling;
    const rollTarget = Math.atan2(hp - hst, B) * 0.7 * coupling;
    const wr = (2 * Math.PI) / this.spec.rollPeriod, wp = wr * 1.6;
    this.rollVel += (wr * wr * (rollTarget - this.roll) - 2 * 0.22 * wr * this.rollVel) * dt;
    this.pitchVel += (wp * wp * (pitchTarget - this.pitch) - 2 * 0.65 * wp * this.pitchVel) * dt;
    this.roll += this.rollVel * dt;
    this.pitch += this.pitchVel * dt;
  }

  _turrets(dt) {
    let done = true;
    const yawRate = 0.5 * Math.min(1.5, 120 / this.spec.length + 0.4);
    for (const t of this.turrets) {
      const dy = wrapAngle(t.targetYaw - t.yaw);
      t.yaw += THREE.MathUtils.clamp(dy, -yawRate * dt, yawRate * dt);
      const dp = t.targetPitch - t.pitch;
      t.pitch += THREE.MathUtils.clamp(dp, -0.25 * dt, 0.25 * dt);
      t.pivot.rotation.y = t.yaw;
      t.barrelPivot.rotation.x = -t.pitch;
      if (Math.abs(dy) > 0.005 || Math.abs(dp) > 0.005) done = false;
    }
    if (done && this._aimResolve) { const r = this._aimResolve; this._aimResolve = null; r(); }
  }

  _sinking(dt) {
    const s = this.spec.sink;
    this.sinkT = Math.min(1, this.sinkT + dt / s.duration);
    const p = this.sinkT;
    this.wakeStrength = Math.max(0, 1 - p * 3);
    // Flooding: slow settle, then accelerating loss of buoyancy.
    this.sinkDepthNow = this.spec.freeboard * 0.4 * easeInOut(Math.min(1, p * 3)) + this.sinkDepth * Math.pow(p, 2.4);
    this.sinkRoll = THREE.MathUtils.degToRad(s.roll) * this.sinkRollSign * easeInOut(Math.min(1, p * 1.3));
    this.sinkPitch = THREE.MathUtils.degToRad(s.pitch) * Math.pow(easeInOut(p), 1.6);

    // Venting air + debris foam over the hull footprint.
    this.stampTimer += dt;
    if (this.wakeField && this.stampTimer > 0.08) {
      this.stampTimer = 0;
      const { length: L, beam: B } = this.spec;
      const along = (Math.random() - 0.5) * L * 0.9, side = (Math.random() - 0.5) * B * 1.6;
      const h = this.heading, x = this.position.x + Math.sin(h) * along + Math.cos(h) * side, z = this.position.z + Math.cos(h) * along - Math.sin(h) * side;
      this.wakeField.stamp(x, z, B * (0.5 + p), 0.25 + p * 0.6, Math.sin(h), Math.cos(h), 1.5, 0.8);
    }
    if (p >= 1) {
      this.state = 'sunk';
      this.object.visible = false;
      this.fires.forEach((f) => f.stop());
      if (this.wakeField) this.wakeField.stamp(this.position.x, this.position.z, this.spec.length * 0.5, 1.5, Math.sin(this.heading), Math.cos(this.heading), 2.2, 1);
      this._sinkResolve?.();
      this._sinkResolve = null;
    }
  }

  _applyTransform() {
    const o = this.object;
    o.position.y = this.heave - (this.sinkDepthNow ?? 0);
    o.rotation.set(-(this.pitch + (this.sinkPitch ?? 0)), this.heading, this.roll + (this.sinkRoll ?? 0));
  }

  _stampWake(dt) {
    if (!this.wakeField || this.state !== 'afloat' || this.speed < 0.5) return;
    this.stampTimer += dt;
    if (this.stampTimer < 0.05) return;
    this.stampTimer = 0;
    const { length: L, beam: B } = this.spec;
    const h = this.heading, fx = Math.sin(h), fz = Math.cos(h);
    const p = this.position;
    const sp = Math.min(1.3, this.speed / 14);
    // Propeller wash.
    this.wakeField.stamp(p.x - fx * L * 0.5, p.z - fz * L * 0.5, B * 0.75, 0.22 * sp, fx, fz, 2.5, 0.9 * sp);
    // Bow spray along both sides of the stem.
    for (const s of [-1, 1]) {
      const sx = Math.cos(h) * s * B * 0.6, sz = -Math.sin(h) * s * B * 0.6;
      this.wakeField.stamp(p.x + fx * L * 0.35 + sx, p.z + fz * L * 0.35 + sz, B * 0.4, 0.12 * sp, fx, fz, 2.0, 0.4 * sp);
    }
  }
}
