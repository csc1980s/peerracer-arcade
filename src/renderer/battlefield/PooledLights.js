import * as THREE from 'three';

/**
 * Fixed pool of point lights shared by every effect.
 *
 * Three.js recompiles every lit material whenever the number of lights in the scene
 * changes, which is the stutter you get when each rifle flash or grenade adds its own
 * PointLight. Here the scene always holds exactly `size` lights; effects submit
 * "virtual" lights and each frame the brightest ones are mapped onto the pool.
 *
 * proxyScene(scene) wraps a scene for legacy managers: any PointLight they add or
 * remove becomes a virtual light, everything else passes straight through.
 */
export class PooledLights {
  constructor(scene, size = 6) {
    this.scene = scene;
    this.real = [];
    for (let i = 0; i < size; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 30, 2);
      l.castShadow = false;
      scene.add(l);
      this.real.push(l);
    }
    this.virtual = new Set();
    this.timed = [];
  }

  /** Adopt an existing PointLight object (not added to the scene). */
  adopt(light) {
    light.userData.__pooledAt = performance.now();
    this.virtual.add(light);
  }

  release(light) { this.virtual.delete(light); }

  /** Fire-and-forget flash with quadratic falloff. Intensity in candela. */
  flash(pos, color, intensity, duration, distance = 40) {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.copy(pos);
    this.timed.push({ l, t: 0, dur: duration, peak: intensity });
    this.virtual.add(l);
    return l;
  }

  update(dt) {
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const f = this.timed[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) { this.virtual.delete(f.l); this.timed.splice(i, 1); continue; }
      f.l.intensity = f.peak * (1 - k) * (1 - k);
    }
    // Legacy lights that were never removed: drop after 4 s.
    const now = performance.now();
    const list = [];
    for (const l of this.virtual) {
      if (l.userData.__pooledAt && now - l.userData.__pooledAt > 4000) { this.virtual.delete(l); continue; }
      if (l.intensity > 0 && l.visible !== false) list.push(l);
    }
    list.sort((a, b) => b.intensity - a.intensity);
    for (let i = 0; i < this.real.length; i++) {
      const r = this.real[i], v = list[i];
      if (!v) { r.intensity = 0; continue; }
      if (v.parent) v.getWorldPosition(r.position); else r.position.copy(v.position);
      r.color.copy(v.color);
      r.intensity = v.intensity;
      r.distance = v.distance;
      r.decay = v.decay;
    }
  }

  proxyScene(scene) {
    const pool = this;
    return new Proxy(scene, {
      get(target, prop) {
        if (prop === 'add') {
          return (...objs) => {
            for (const o of objs) {
              if (o && o.isPointLight) pool.adopt(o);
              else target.add(o);
            }
            return target;
          };
        }
        if (prop === 'remove') {
          return (...objs) => {
            for (const o of objs) {
              if (o && o.isPointLight) pool.release(o);
              else target.remove(o);
            }
            return target;
          };
        }
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
  }

  /**
   * Replace PointLights inside an object tree with virtual lights that follow
   * their old parent (e.g. aircraft strobes). Keeps the scene light count constant.
   */
  virtualizeChildren(root) {
    const found = [];
    root.traverse((o) => { if (o.isPointLight) found.push(o); });
    for (const l of found) {
      const anchor = new THREE.Object3D();
      anchor.position.copy(l.position);
      l.parent.add(anchor);
      l.parent.remove(l);
      // The legacy code keeps animating `l.intensity`; the pool reads it through the anchor.
      const proxy = l;
      proxy.getWorldPosition = (out) => anchor.getWorldPosition(out);
      Object.defineProperty(proxy, 'parent', { get: () => anchor, configurable: true });
      delete proxy.userData.__pooledAt;
      this.virtual.add(proxy);
      anchor.addEventListener('removed', () => this.virtual.delete(proxy));
      root.addEventListener('removed', () => this.virtual.delete(proxy));
    }
  }

  dispose() {
    for (const l of this.real) this.scene.remove(l);
    this.virtual.clear();
    this.timed = [];
  }
}
