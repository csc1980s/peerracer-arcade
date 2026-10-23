import * as THREE from 'three';
import { GPUParticlePool } from './GPUParticlePool.js';
import { atmosphere } from '../shared.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _q = new THREE.Vector3();
const _up = new THREE.Vector3();
const _t1 = new THREE.Vector3();
const _t2 = new THREE.Vector3();
const _dir = new THREE.Vector3();

/** Random unit vector inside a cone around `dir` (half-angle in radians). */
function coneDir(dir, halfAngle, out) {
  const u = Math.random(), v = Math.random();
  const cosT = 1 - u * (1 - Math.cos(halfAngle));
  const sinT = Math.sqrt(1 - cosT * cosT);
  const phi = v * Math.PI * 2;
  // Orthonormal basis around dir.
  const d = _dir.copy(dir);
  const up = Math.abs(d.y) < 0.99 ? _up.set(0, 1, 0) : _up.set(1, 0, 0);
  const t1 = _t1.crossVectors(up, d).normalize();
  const t2 = _t2.crossVectors(d, t1);
  return out.copy(d).multiplyScalar(cosT).addScaledVector(t1, Math.cos(phi) * sinT).addScaledVector(t2, Math.sin(phi) * sinT);
}

const SMOKE_DARK = [0.06, 0.055, 0.05];
const SMOKE_GRAY = [0.32, 0.31, 0.3];
const SPRAY_WHITE = [0.85, 0.9, 0.92];

/**
 * Combat effects facade. Owns four particle pools, a fixed pool of flash lights
 * (constant light count = no shader recompiles mid-battle), continuous emitters
 * (hull fires, sinking smoke) and ballistic shells with tracers.
 */
export class CombatVFX {
  constructor(scene, { wakeField = null, scale = 1, lightCount = 4 } = {}) {
    this.scene = scene;
    this.wakeField = wakeField;
    this.time = 0;
    const cap = (n) => Math.max(256, Math.floor(n * scale));
    this.pools = {
      fire: new GPUParticlePool('fire', cap(4096)),
      smoke: new GPUParticlePool('smoke', cap(6144)),
      spray: new GPUParticlePool('spray', cap(6144)),
      debris: new GPUParticlePool('debris', cap(1536)),
    };
    for (const p of Object.values(this.pools)) scene.add(p.mesh);

    this.lights = [];
    for (let i = 0; i < lightCount; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 400, 2);
      l.userData = { t: 0, dur: 1, peak: 0 };
      scene.add(l);
      this.lights.push(l);
    }
    this.lightCursor = 0;
    this.emitters = [];
    this.shells = [];
    this.timers = [];
    this.torpedoes = [];
  }

  flash(pos, color, intensity, duration) {
    const l = this.lights[this.lightCursor];
    this.lightCursor = (this.lightCursor + 1) % this.lights.length;
    l.position.copy(pos);
    l.color.set(color);
    l.userData.t = 0; l.userData.dur = duration; l.userData.peak = intensity;
    l.intensity = intensity;
  }

  after(seconds, fn) { this.timers.push({ at: this.time + seconds, fn }); }

  /**
   * Muzzle blast at a barrel tip. dir = barrel forward (unit). calibre 1 = 460 mm battleship gun.
   */
  muzzleFlash(pos, dir, calibre = 1) {
    const t = this.time, s = calibre;
    const { fire, smoke } = this.pools;
    this.flash(_v.copy(pos).addScaledVector(dir, 6 * s), 0xffb060, 2.5e4 * s, 0.18);

    // Flame plume: fast, drag-heavy, along the barrel.
    for (let i = 0; i < 26 * s + 6; i++) {
      coneDir(dir, 0.22, _v).multiplyScalar(rnd(60, 160) * s);
      fire.spawn(t, pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(0.12, 0.32), rnd(3, 6) * s, rnd(10, 22) * s, { drag: 7, brightness: rnd(1.2, 2.2) });
    }
    // Side flare ring (the "cross" seen on real naval gun flashes).
    for (let i = 0; i < 12; i++) {
      coneDir(dir, 1.4, _v).multiplyScalar(rnd(25, 60) * s);
      fire.spawn(t, pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(0.1, 0.2), 2 * s, 9 * s, { drag: 9, brightness: 1.2 });
    }
    // Billowing blast smoke: thrown forward, stopped by drag, then drifts and rises.
    for (let i = 0; i < 34 * s + 8; i++) {
      coneDir(dir, 0.45, _v).multiplyScalar(rnd(20, 90) * s);
      const gray = Math.random() < 0.6 ? SMOKE_GRAY : SMOKE_DARK;
      smoke.spawn(t + rnd(0, 0.08), pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(4, 9), rnd(5, 9) * s, rnd(28, 55) * s,
        { drag: 2.2, gravity: -0.035, brightness: 0.8, opacity: rnd(0.45, 0.75), tint: gray, wind: 1, spin: rnd(-0.3, 0.3) });
    }
    // Pressure wave flattens the water under the barrel.
    this.wakeField?.stamp(pos.x + dir.x * 25 * s, pos.z + dir.z * 25 * s, 30 * s, 0.35, dir.x, dir.z, 1.6, 1.0);
  }

  /** Miss: tall water column, crown, mist, foam ring. calibre scales column height. */
  waterSplash(pos, calibre = 1) {
    const t = this.time, s = calibre;
    const { spray } = this.pools;
    for (let i = 0; i < 140 * s + 30; i++) {
      const up = rnd(35, 75) * Math.sqrt(s);
      const a = Math.random() * 6.283, r = rnd(0, 6) * s;
      spray.spawn(t + rnd(0, 0.15), pos.x + Math.cos(a) * r, 0, pos.z + Math.sin(a) * r,
        Math.cos(a) * rnd(0, 4), up, Math.sin(a) * rnd(0, 4), rnd(2.2, 3.8), rnd(3, 6) * s, rnd(8, 16) * s,
        { drag: 0.35, gravity: 1, opacity: rnd(0.5, 0.9), tint: SPRAY_WHITE });
    }
    // Crown sheet.
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * 6.283;
      spray.spawn(t, pos.x, 0, pos.z, Math.cos(a) * rnd(12, 22) * s, rnd(12, 24) * s, Math.sin(a) * rnd(12, 22) * s,
        rnd(1.2, 2.0), 3 * s, 9 * s, { drag: 0.8, gravity: 1, opacity: 0.8, tint: SPRAY_WHITE });
    }
    // Lingering mist drifting downwind.
    for (let i = 0; i < 26; i++) {
      spray.spawn(t + rnd(0.6, 1.8), pos.x + rnd(-8, 8), rnd(10, 45) * s, pos.z + rnd(-8, 8), rnd(-3, 3), rnd(-1, 2), rnd(-3, 3),
        rnd(5, 9), 15 * s, rnd(40, 70) * s, { drag: 0.5, gravity: 0.02, opacity: 0.22, tint: SPRAY_WHITE, wind: 1.2 });
    }
    this.after(1.6, () => this.wakeField?.stamp(pos.x, pos.z, 26 * s, 1.4, 0, 1, 1, 1));
    this.wakeField?.stamp(pos.x, pos.z, 14 * s, 1.0, 0, 1, 1, 1);
  }

  /** Direct hit: fireball, sparks, shrapnel, black smoke. Returns nothing; attach hull fires separately. */
  hitExplosion(pos, calibre = 1) {
    const t = this.time, s = calibre;
    const { fire, smoke, debris } = this.pools;
    this.flash(pos, 0xff8840, 5e4 * s, 0.45);
    for (let i = 0; i < 40 * s + 10; i++) {
      coneDir(_w.set(0, 1, 0), 1.6, _v).multiplyScalar(rnd(10, 45) * s);
      fire.spawn(t + rnd(0, 0.1), pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(0.4, 1.0), rnd(5, 9) * s, rnd(18, 34) * s,
        { drag: 3.5, gravity: -0.15, brightness: rnd(1.2, 2.4) });
    }
    for (let i = 0; i < 70; i++) {
      coneDir(_w.set(0, 1, 0), 1.2, _v).multiplyScalar(rnd(30, 90) * s);
      const spark = Math.random() < 0.55;
      debris.spawn(t, pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(1.5, 3.5), spark ? 0.6 : rnd(0.8, 2.2), spark ? 0.4 : rnd(0.8, 2.2),
        { drag: spark ? 0.6 : 0.25, gravity: 1, brightness: spark ? 1 : 0, opacity: 1, tint: [0.08, 0.08, 0.08], spin: rnd(-8, 8) });
    }
    for (let i = 0; i < 30; i++) {
      coneDir(_w.set(0, 1, 0), 0.9, _v).multiplyScalar(rnd(8, 25) * s);
      smoke.spawn(t + rnd(0.1, 0.5), pos.x, pos.y, pos.z, _v.x, _v.y, _v.z, rnd(6, 12), 8 * s, rnd(40, 70) * s,
        { drag: 1.4, gravity: -0.06, brightness: 1, opacity: rnd(0.6, 0.85), tint: SMOKE_DARK, wind: 1, spin: rnd(-0.2, 0.2) });
    }
  }

  /**
   * Continuous fire + smoke attached to an Object3D (hull fire). Returns a handle with stop().
   * Emits only while the anchor is above water.
   */
  attachFire(anchor, localOffset, intensity = 1) {
    const e = { anchor, offset: localOffset.clone(), intensity, acc: 0, smokeAcc: 0, alive: true, stop() { this.alive = false; } };
    this.emitters.push(e);
    return e;
  }

  /**
   * Ballistic shell from muzzle to target with a glowing tracer. onImpact fires on arrival.
   * Flight is artistic (slow, high arc) so the player can follow it.
   */
  fireShell(from, to, flightTime, onImpact) {
    const g = 30; // exaggerated gravity -> visible arc
    const v = new THREE.Vector3(
      (to.x - from.x) / flightTime,
      (to.y - from.y + 0.5 * g * flightTime * flightTime) / flightTime,
      (to.z - from.z) / flightTime,
    );
    this.shells.push({ p0: from.clone(), v, g, t: 0, T: flightTime, onImpact, last: from.clone() });
  }

  /** Torpedo run: bubble trail just under the surface, then a hull-side water column. */
  fireTorpedo(from, to, speed, onImpact) {
    const dir = new THREE.Vector3(to.x - from.x, 0, to.z - from.z);
    const dist = dir.length();
    dir.divideScalar(dist || 1);
    this.torpedoes.push({ p: new THREE.Vector3(from.x, 0, from.z), dir, left: dist, speed, onImpact, acc: 0 });
  }

  /** `time` must be the same clock written to atmosphere.uTime (particles are evaluated against it). */
  update(dt, time, waterHeightAt) {
    this.time = time;
    const t = this.time;

    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.timers[i].at <= t) { const fn = this.timers[i].fn; this.timers.splice(i, 1); fn(); }
    }

    for (const l of this.lights) {
      if (l.intensity <= 0) continue;
      l.userData.t += dt;
      const k = l.userData.t / l.userData.dur;
      l.intensity = k >= 1 ? 0 : l.userData.peak * (1 - k) * (1 - k);
    }

    // Shells + tracers.
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.t = Math.min(s.t + dt, s.T);
      const p = _v.copy(s.p0).addScaledVector(s.v, s.t);
      p.y -= 0.5 * s.g * s.t * s.t;
      const steps = 3;
      for (let k = 0; k < steps; k++) {
        const f = k / steps;
        this.pools.fire.spawn(t, s.last.x + (p.x - s.last.x) * f, s.last.y + (p.y - s.last.y) * f, s.last.z + (p.z - s.last.z) * f,
          0, 0, 0, 0.22, 2.2, 0.6, { brightness: 2.2 });
      }
      s.last.copy(p);
      if (s.t >= s.T) { this.shells.splice(i, 1); s.onImpact?.(p.clone()); }
    }

    for (let i = this.torpedoes.length - 1; i >= 0; i--) {
      const tp = this.torpedoes[i];
      const step = Math.min(tp.left, tp.speed * dt);
      tp.p.addScaledVector(tp.dir, step);
      tp.left -= step;
      tp.acc += dt;
      if (tp.acc > 0.04) {
        tp.acc = 0;
        this.wakeField?.stamp(tp.p.x, tp.p.z, 3.5, 0.5, tp.dir.x, tp.dir.z, 3, 0.6);
        this.pools.spray.spawn(t, tp.p.x, 0, tp.p.z, rnd(-0.5, 0.5), rnd(0.5, 2), rnd(-0.5, 0.5), 1.2, 1.5, 4, { drag: 1, gravity: 0.3, opacity: 0.35, tint: SPRAY_WHITE });
      }
      if (tp.left <= 0) { this.torpedoes.splice(i, 1); tp.onImpact?.(tp.p.clone()); }
    }

    // Continuous hull fires.
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      if (!e.alive) { this.emitters.splice(i, 1); continue; }
      const wp = e.anchor.localToWorld(_w.copy(e.offset));
      const water = waterHeightAt ? waterHeightAt(wp.x, wp.z) : 0;
      if (wp.y < water + 0.5) {
        // Fire meets sea: burst of steam then extinguish.
        for (let k = 0; k < 30; k++) this.pools.spray.spawn(t, wp.x + rnd(-6, 6), water, wp.z + rnd(-6, 6), rnd(-3, 3), rnd(4, 14), rnd(-3, 3), rnd(3, 6), 8, 35,
          { drag: 0.8, gravity: -0.05, opacity: 0.35, tint: [0.9, 0.9, 0.9], wind: 1 });
        e.stop();
        continue;
      }
      e.acc += dt * 55 * e.intensity;
      while (e.acc >= 1) {
        e.acc -= 1;
        this.pools.fire.spawn(t, wp.x + rnd(-3, 3), wp.y, wp.z + rnd(-3, 3), rnd(-1.5, 1.5), rnd(6, 14), rnd(-1.5, 1.5), rnd(0.4, 0.9), rnd(2, 4), rnd(5, 9),
          { drag: 1.2, gravity: -0.1, brightness: rnd(0.35, 0.8) });
      }
      e.smokeAcc += dt * 9 * e.intensity;
      while (e.smokeAcc >= 1) {
        e.smokeAcc -= 1;
        this.pools.smoke.spawn(t, wp.x + rnd(-2, 2), wp.y + 4, wp.z + rnd(-2, 2), rnd(-1, 1), rnd(8, 14), rnd(-1, 1), rnd(10, 16), 8, rnd(45, 80),
          { drag: 0.35, gravity: -0.02, brightness: 0.6, opacity: rnd(0.5, 0.8), tint: SMOKE_DARK, wind: 2.2, spin: rnd(-0.15, 0.15) });
      }
    }

    for (const p of Object.values(this.pools)) p.flush();
  }

  dispose() {
    for (const p of Object.values(this.pools)) { this.scene.remove(p.mesh); p.dispose(); }
    for (const l of this.lights) this.scene.remove(l);
  }
}

export { SMOKE_DARK, SMOKE_GRAY, SPRAY_WHITE };
