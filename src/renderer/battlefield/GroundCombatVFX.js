import * as THREE from 'three';
import { GPUParticlePool } from '../naval/theater/vfx/GPUParticlePool.js';

/**
 * Ground-combat effects at tank scale (metres), built on the stateless GPU particle
 * pools from the naval theater: every particle is written once at spawn and animated
 * entirely in the vertex shader, one draw call per pool, no per-frame allocations.
 *
 *   mineBlast     buried charge: flash, fireball, soil geyser, clods, shock-dust ring,
 *                 lingering smoke column
 *   shellImpact   AP shell on soil: dirt fountain, sparks, dust
 *   armorHit      shell on armour: white-hot spark burst, fireball, black smoke
 *   muzzleBlast   tank gun: flame, side flare, brake-vented smoke, ground dust kick
 *   treadDust     tracks churning dust / mud / snow / sand
 *   fireShell     flat, fast AP round with a bright tracer
 *   attachFire    persistent fire + smoke on a wreck
 *   smolder       a crater that keeps smoking for a while
 */

const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _up = new THREE.Vector3();
const _t1 = new THREE.Vector3();
const _t2 = new THREE.Vector3();
const _dir = new THREE.Vector3();

function coneDir(dir, halfAngle, out) {
  const u = Math.random(), v = Math.random();
  const cosT = 1 - u * (1 - Math.cos(halfAngle));
  const sinT = Math.sqrt(1 - cosT * cosT);
  const phi = v * Math.PI * 2;
  const d = _dir.copy(dir);
  const up = Math.abs(d.y) < 0.99 ? _up.set(0, 1, 0) : _up.set(1, 0, 0);
  const t1 = _t1.crossVectors(up, d).normalize();
  const t2 = _t2.crossVectors(d, t1);
  return out.copy(d).multiplyScalar(cosT).addScaledVector(t1, Math.cos(phi) * sinT).addScaledVector(t2, Math.sin(phi) * sinT);
}

const SMOKE_DARK = [0.05, 0.045, 0.04];
const SMOKE_GRAY = [0.3, 0.29, 0.27];
const UP = new THREE.Vector3(0, 1, 0);

/** Soil colours per environment: [dust, clod]. */
const SOIL = {
  daylight: [[0.42, 0.34, 0.24], [0.18, 0.13, 0.08]],
  twilight: [[0.3, 0.26, 0.22], [0.12, 0.09, 0.06]],
  desert: [[0.7, 0.54, 0.36], [0.38, 0.26, 0.15]],
  arctic: [[0.82, 0.85, 0.9], [0.2, 0.17, 0.14]],
  storm: [[0.26, 0.22, 0.18], [0.09, 0.07, 0.05]],
};

export class GroundCombatVFX {
  constructor(scene, lights, { scale = 1 } = {}) {
    this.scene = scene;
    this.lights = lights;
    this.time = 0;
    const cap = (n) => Math.max(256, Math.floor(n * scale));
    this.pools = {
      fire: new GPUParticlePool('fire', cap(3072)),
      smoke: new GPUParticlePool('smoke', cap(4096)),
      dust: new GPUParticlePool('spray', cap(4096)),
      debris: new GPUParticlePool('debris', cap(1536)),
    };
    // Tank-scale soft-particle distances.
    this.pools.fire.material.uniforms.uSoftness.value = 0.6;
    this.pools.smoke.material.uniforms.uSoftness.value = 1.5;
    this.pools.dust.material.uniforms.uSoftness.value = 1.2;
    this.pools.debris.material.uniforms.uSoftness.value = 0.2;
    for (const p of Object.values(this.pools)) scene.add(p.mesh);

    this.soil = SOIL.daylight;
    this.emitters = [];
    this.shells = [];
    this.timers = [];
    this.groundHeight = () => 0;
  }

  setEnvironment(id) {
    // Palette is authored in sRGB; particle tints are linear.
    const toLin = (c) => { const k = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); return [k.r, k.g, k.b]; };
    this.soil = (SOIL[id] || SOIL.daylight).map(toLin);
  }

  after(seconds, fn) { this.timers.push({ at: this.time + seconds, fn }); }

  /** Buried anti-tank mine. s: 1 = full charge. */
  mineBlast(pos, s = 1) {
    const t = this.time;
    const { fire, smoke, dust, debris } = this.pools;
    const [dustCol, clodCol] = this.soil;
    this.lights.flash(_v.set(pos.x, pos.y + 2, pos.z), 0xff9a50, 380 * s, 0.5, 70);

    // Fireball: short-lived, rises through the soil column.
    for (let i = 0; i < 46 * s; i++) {
      coneDir(UP, 0.9, _v).multiplyScalar(rnd(4, 16) * s);
      fire.spawn(t + rnd(0, 0.06), pos.x + rnd(-0.8, 0.8), pos.y + 0.3, pos.z + rnd(-0.8, 0.8), _v.x, _v.y, _v.z,
        rnd(0.3, 0.7), rnd(0.8, 1.4) * s, rnd(2.6, 4.5) * s, { drag: 3.2, gravity: -0.2, brightness: rnd(0.35, 0.8) });
    }
    // Soil geyser: tall column of earth thrown up, falls back under gravity.
    for (let i = 0; i < 120 * s; i++) {
      coneDir(UP, 0.42, _v).multiplyScalar(rnd(8, 26) * s);
      dust.spawn(t + rnd(0, 0.1), pos.x + rnd(-0.6, 0.6), pos.y + 0.2, pos.z + rnd(-0.6, 0.6), _v.x, _v.y, _v.z,
        rnd(1.6, 3.2), rnd(0.6, 1.2) * s, rnd(2.5, 4.5) * s, { drag: 0.6, gravity: 1, opacity: rnd(0.55, 0.95), tint: dustCol });
    }
    // Clods + stones + sparks.
    for (let i = 0; i < 90 * s; i++) {
      coneDir(UP, 0.75, _v).multiplyScalar(rnd(6, 24) * s);
      const spark = Math.random() < 0.25;
      debris.spawn(t, pos.x, pos.y + 0.3, pos.z, _v.x, _v.y, _v.z, rnd(1.4, 2.8),
        spark ? 0.12 : rnd(0.12, 0.35), spark ? 0.08 : rnd(0.12, 0.35),
        { drag: spark ? 0.5 : 0.15, gravity: 1, brightness: spark ? 1 : 0, opacity: 1, tint: clodCol, spin: rnd(-10, 10) });
    }
    // Ground-hugging shock ring of dust.
    for (let i = 0; i < 64 * s; i++) {
      const a = (i / (64 * s)) * Math.PI * 2 + rnd(-0.05, 0.05);
      const sp = rnd(10, 18) * s;
      dust.spawn(t + 0.02, pos.x, pos.y + 0.3, pos.z, Math.cos(a) * sp, rnd(0.5, 2), Math.sin(a) * sp,
        rnd(1.6, 2.6), rnd(1, 1.6) * s, rnd(4, 7) * s, { drag: 2.4, gravity: 0.05, opacity: rnd(0.35, 0.6), tint: dustCol, wind: 0.6 });
    }
    // Rolling smoke column, darkening as it rises.
    for (let i = 0; i < 34 * s; i++) {
      coneDir(UP, 0.5, _v).multiplyScalar(rnd(2, 7) * s);
      smoke.spawn(t + rnd(0.1, 0.7), pos.x + rnd(-1, 1), pos.y + rnd(0.5, 2.5), pos.z + rnd(-1, 1), _v.x, _v.y, _v.z,
        rnd(5, 9), rnd(1.5, 2.5) * s, rnd(7, 12) * s,
        { drag: 0.9, gravity: -0.05, brightness: 0.3, opacity: rnd(0.5, 0.8), tint: Math.random() < 0.6 ? SMOKE_DARK : SMOKE_GRAY, wind: 1, spin: rnd(-0.3, 0.3) });
    }
    this.smolder(pos, 9);
  }

  /** AP shell striking soil. */
  shellImpact(pos) {
    const t = this.time;
    const { fire, dust, debris, smoke } = this.pools;
    const [dustCol, clodCol] = this.soil;
    this.lights.flash(_v.set(pos.x, pos.y + 1, pos.z), 0xffb070, 140, 0.25, 40);
    for (let i = 0; i < 14; i++) {
      coneDir(UP, 1.0, _v).multiplyScalar(rnd(3, 9));
      fire.spawn(t, pos.x, pos.y + 0.2, pos.z, _v.x, _v.y, _v.z, rnd(0.15, 0.35), 0.5, rnd(1.4, 2.2), { drag: 4, brightness: 0.6 });
    }
    for (let i = 0; i < 70; i++) {
      coneDir(UP, 0.55, _v).multiplyScalar(rnd(6, 16));
      dust.spawn(t + rnd(0, 0.05), pos.x, pos.y + 0.2, pos.z, _v.x, _v.y, _v.z, rnd(1.2, 2.4), 0.5, rnd(1.8, 3.2),
        { drag: 0.8, gravity: 1, opacity: rnd(0.5, 0.85), tint: dustCol });
    }
    for (let i = 0; i < 40; i++) {
      coneDir(UP, 0.8, _v).multiplyScalar(rnd(5, 15));
      debris.spawn(t, pos.x, pos.y + 0.2, pos.z, _v.x, _v.y, _v.z, rnd(1, 2), rnd(0.08, 0.22), rnd(0.08, 0.2),
        { drag: 0.2, gravity: 1, brightness: Math.random() < 0.3 ? 1 : 0, tint: clodCol, spin: rnd(-10, 10) });
    }
    for (let i = 0; i < 12; i++) {
      smoke.spawn(t + rnd(0.05, 0.3), pos.x + rnd(-0.5, 0.5), pos.y + 0.8, pos.z + rnd(-0.5, 0.5), rnd(-1, 1), rnd(1, 3), rnd(-1, 1),
        rnd(4, 6), 1.2, rnd(4, 7), { drag: 0.8, gravity: -0.03, brightness: 0, opacity: 0.45, tint: SMOKE_GRAY, wind: 1 });
    }
    this.smolder(pos, 4);
  }

  /** Shell on armour. */
  armorHit(pos) {
    const t = this.time;
    const { fire, smoke, debris } = this.pools;
    this.lights.flash(pos, 0xffc080, 450, 0.4, 60);
    for (let i = 0; i < 40; i++) {
      coneDir(UP, 1.5, _v).multiplyScalar(rnd(3, 12));
      fire.spawn(t + rnd(0, 0.08), pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(0.3, 0.8), rnd(0.8, 1.4), rnd(3, 5),
        { drag: 3, gravity: -0.2, brightness: rnd(0.5, 1.0) });
    }
    for (let i = 0; i < 90; i++) {
      coneDir(UP, 1.3, _v).multiplyScalar(rnd(8, 30));
      debris.spawn(t, pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(0.6, 1.6), 0.1, 0.06, { drag: 0.4, gravity: 1, brightness: 1, tint: [0.1, 0.1, 0.1], spin: 0 });
    }
    for (let i = 0; i < 26; i++) {
      coneDir(UP, 0.6, _v).multiplyScalar(rnd(2, 6));
      smoke.spawn(t + rnd(0.1, 0.5), pos.x, pos.y + 0.5, pos.z, _v.x, _v.y, _v.z, rnd(5, 9), 1.6, rnd(7, 11),
        { drag: 0.8, gravity: -0.05, brightness: 1, opacity: rnd(0.6, 0.85), tint: SMOKE_DARK, wind: 1, spin: rnd(-0.2, 0.2) });
    }
  }

  /** Gun blast at a muzzle. dir: barrel forward (unit). groundY: terrain under the muzzle. */
  muzzleBlast(pos, dir, groundY = 0) {
    const t = this.time;
    const { fire, smoke, dust } = this.pools;
    this.lights.flash(_v.copy(pos).addScaledVector(dir, 1.5), 0xffb060, 260, 0.14, 45);
    for (let i = 0; i < 30; i++) {
      coneDir(dir, 0.2, _v).multiplyScalar(rnd(25, 60));
      fire.spawn(t, pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(0.08, 0.2), rnd(0.4, 0.8), rnd(1.6, 2.8), { drag: 9, brightness: rnd(0.6, 1.1) });
    }
    // Muzzle-brake side jets.
    _w.crossVectors(dir, UP).normalize();
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      _v.copy(_w).multiplyScalar(side * rnd(12, 24)).addScaledVector(dir, rnd(-2, 4));
      fire.spawn(t, pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(0.08, 0.16), 0.4, 1.2, { drag: 10, brightness: 0.7 });
      smoke.spawn(t + rnd(0, 0.04), pos.x, pos.y, pos.z, _v.x * 0.5, _v.y * 0.5 + 1, _v.z * 0.5, rnd(2.5, 4.5), 0.8, rnd(3.5, 6),
        { drag: 2.2, gravity: -0.03, brightness: 0.2, opacity: rnd(0.4, 0.6), tint: SMOKE_GRAY, wind: 1, spin: rnd(-0.4, 0.4) });
    }
    for (let i = 0; i < 26; i++) {
      coneDir(dir, 0.35, _v).multiplyScalar(rnd(8, 28));
      smoke.spawn(t + rnd(0, 0.06), pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(3, 6), rnd(0.8, 1.2), rnd(4, 8),
        { drag: 2.0, gravity: -0.03, brightness: 0.3, opacity: rnd(0.45, 0.7), tint: SMOKE_GRAY, wind: 1, spin: rnd(-0.3, 0.3) });
    }
    // Overpressure kicks dust off the ground below the barrel.
    const [dustCol] = this.soil;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const cx = pos.x + dir.x * 3, cz = pos.z + dir.z * 3;
      dust.spawn(t + 0.02, cx + Math.cos(a) * rnd(0, 2), groundY + 0.2, cz + Math.sin(a) * rnd(0, 2),
        Math.cos(a) * rnd(4, 9) + dir.x * 4, rnd(0.3, 1.5), Math.sin(a) * rnd(4, 9) + dir.z * 4,
        rnd(1.2, 2.2), 0.8, rnd(2.5, 4.5), { drag: 2.5, gravity: 0.05, opacity: rnd(0.25, 0.45), tint: dustCol, wind: 0.6 });
    }
  }

  /** Dust thrown up by tracks. dir: travel direction. */
  treadDust(pos, dir, amount = 1) {
    const t = this.time;
    const [dustCol] = this.soil;
    _w.crossVectors(dir, UP).normalize();
    for (let i = 0; i < 6 * amount; i++) {
      const side = i % 2 ? 1 : -1;
      const x = pos.x + _w.x * side * 1.65 - dir.x * 2.6;
      const z = pos.z + _w.z * side * 1.65 - dir.z * 2.6;
      this.pools.dust.spawn(t, x + rnd(-0.3, 0.3), pos.y + 0.3, z + rnd(-0.3, 0.3),
        -dir.x * rnd(1, 3) + rnd(-0.8, 0.8), rnd(0.6, 2.2), -dir.z * rnd(1, 3) + rnd(-0.8, 0.8),
        rnd(1.4, 2.6), 0.5, rnd(2, 3.6), { drag: 1.2, gravity: 0.08, opacity: rnd(0.2, 0.4), tint: dustCol, wind: 0.8 });
    }
  }

  /** Flat-trajectory AP round. Fast (tank shells cross the field in a fraction of a second). */
  fireShell(from, to, flightTime, onImpact) {
    const g = 6;
    const v = new THREE.Vector3(
      (to.x - from.x) / flightTime,
      (to.y - from.y + 0.5 * g * flightTime * flightTime) / flightTime,
      (to.z - from.z) / flightTime,
    );
    this.shells.push({ p0: from.clone(), v, g, t: 0, T: flightTime, onImpact, last: from.clone() });
  }

  attachFire(anchor, localOffset, intensity = 1) {
    const e = { anchor, offset: localOffset.clone(), intensity, acc: 0, smokeAcc: 0, alive: true, stop() { this.alive = false; } };
    this.emitters.push(e);
    return e;
  }

  /** Crater keeps smoking for `seconds`, thinning out. */
  smolder(pos, seconds) {
    const e = { pos: pos.clone(), left: seconds, total: seconds, acc: 0, alive: true, smolder: true, stop() { this.alive = false; } };
    this.emitters.push(e);
    return e;
  }

  update(dt, time) {
    this.time = time;
    const t = time;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.timers[i].at <= t) { const fn = this.timers[i].fn; this.timers.splice(i, 1); fn(); }
    }

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.t = Math.min(s.t + dt, s.T);
      const p = _v.copy(s.p0).addScaledVector(s.v, s.t);
      p.y -= 0.5 * s.g * s.t * s.t;
      const steps = 8;
      for (let k = 0; k < steps; k++) {
        const f = k / steps;
        this.pools.fire.spawn(t, s.last.x + (p.x - s.last.x) * f, s.last.y + (p.y - s.last.y) * f, s.last.z + (p.z - s.last.z) * f,
          0, 0, 0, 0.14, 0.3, 0.1, { brightness: 1.6 });
      }
      s.last.copy(p);
      if (s.t >= s.T) { this.shells.splice(i, 1); s.onImpact?.(p.clone()); }
    }

    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      if (!e.alive) { this.emitters.splice(i, 1); continue; }
      if (e.smolder) {
        e.left -= dt;
        if (e.left <= 0) { this.emitters.splice(i, 1); continue; }
        const k = e.left / e.total;
        e.acc += dt * 6 * k;
        while (e.acc >= 1) {
          e.acc -= 1;
          this.pools.smoke.spawn(t, e.pos.x + rnd(-1.2, 1.2), e.pos.y + 0.2, e.pos.z + rnd(-1.2, 1.2), rnd(-0.3, 0.3), rnd(1.2, 2.5), rnd(-0.3, 0.3),
            rnd(5, 8), 0.8, rnd(4, 7), { drag: 0.4, gravity: -0.02, brightness: 0.4 * k, opacity: rnd(0.25, 0.45) * (0.4 + 0.6 * k), tint: SMOKE_GRAY, wind: 1.6, spin: rnd(-0.2, 0.2) });
        }
        continue;
      }
      const wp = e.anchor.localToWorld(_w.copy(e.offset));
      e.acc += dt * 40 * e.intensity;
      while (e.acc >= 1) {
        e.acc -= 1;
        this.pools.fire.spawn(t, wp.x + rnd(-0.8, 0.8), wp.y, wp.z + rnd(-0.8, 0.8), rnd(-0.5, 0.5), rnd(2, 5), rnd(-0.5, 0.5), rnd(0.4, 0.9),
          rnd(0.5, 0.9), rnd(1.4, 2.4), { drag: 1.2, gravity: -0.1, brightness: rnd(0.25, 0.5) });
      }
      e.smokeAcc += dt * 8 * e.intensity;
      while (e.smokeAcc >= 1) {
        e.smokeAcc -= 1;
        this.pools.smoke.spawn(t, wp.x + rnd(-0.5, 0.5), wp.y + 1, wp.z + rnd(-0.5, 0.5), rnd(-0.4, 0.4), rnd(2.5, 4.5), rnd(-0.4, 0.4), rnd(7, 11),
          1.2, rnd(7, 12), { drag: 0.35, gravity: -0.02, brightness: 0.7, opacity: rnd(0.5, 0.75), tint: SMOKE_DARK, wind: 2, spin: rnd(-0.15, 0.15) });
      }
    }

    for (const p of Object.values(this.pools)) p.flush();
  }

  hasActiveWork() { return this.shells.length > 0 || this.emitters.length > 0; }

  dispose() {
    for (const p of Object.values(this.pools)) { this.scene.remove(p.mesh); p.dispose(); }
    this.emitters = []; this.shells = []; this.timers = [];
  }
}
