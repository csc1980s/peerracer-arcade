import * as THREE from 'three';
import { atmosphere, LAYERS } from './shared.js';
import { QUALITY, detectQuality } from './quality.js';
import { OceanSurface } from './ocean/OceanSurface.js';
import { WakeField } from './ocean/WakeField.js';
import { SEA_STATES, sampleHeight } from './ocean/waves.js';
import { SkySystem, SKY_PRESETS } from './env/SkySystem.js';
import { PostPipeline } from './post/PostPipeline.js';
import { CombatVFX } from './vfx/CombatVFX.js';
import { ShipAssetLoader } from './ships/ShipAssetLoader.js';
import { ShipController } from './ships/ShipController.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The 3D Naval Combat Theater: a self-contained view the turn-based game drives
 * through a small promise-based API. The game engine stays authoritative (it
 * decides hit/miss/sunk); the theater only *presents* outcomes.
 *
 *   const theater = new NavalTheater(el, { quality: 'auto', environment: 'sunset' });
 *   await theater.init();
 *   await theater.addShip('p-bb', 'BB', { x: 0, z: -600, heading: 0 });
 *   await theater.fire('p-bb', { shipId: 'e-ca' }, { result: 'hit' });
 *   await theater.sink('e-ca');
 */
export class NavalTheater {
  constructor(container, { quality = 'auto', environment = 'sunset', arena = { centerX: 0, centerZ: 0, size: 3200 }, assetBasePath = './assets/' } = {}) {
    this.container = container;
    this.arena = arena;
    this.assetBasePath = assetBasePath;
    this.environmentName = environment;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    this.renderer = renderer;

    this.qualityName = quality === 'auto' ? detectQuality(renderer) : quality;
    this.quality = QUALITY[this.qualityName];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 2, 30000);
    this.camera.layers.enableAll();
    this.camera.position.set(arena.centerX + 900, 320, arena.centerZ + 1300);
    this.focusPoint = new THREE.Vector3(arena.centerX, 0, arena.centerZ);
    this.camera.lookAt(this.focusPoint);

    this.ships = new Map();
    this.elapsed = 0;
    this.timeScale = 1;
    this.active = false;
    this.autoFocus = true;
    this._frameMs = 16;
    this._slowTime = 0;
    this._fastTime = 0;
  }

  async init({ procedural = false } = {}) {
    const q = this.quality;
    const { renderer, scene, camera } = this;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.maxPixelRatio));

    this.wakeField = new WakeField(renderer, { centerX: this.arena.centerX, centerZ: this.arena.centerZ, size: this.arena.size, resolution: q.wakeResolution });
    this.sky = new SkySystem(renderer, { cubeSize: q.skyCube, cloudSteps: q.cloudSteps, facesPerFrame: q.skyFacesPerFrame });
    this.sky.sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    scene.add(this.sky.sun, this.sky.sun.target);

    this.ocean = new OceanSurface({ segments: q.oceanSegments, ssrSteps: q.ssrSteps, wakeField: this.wakeField });
    this.ocean.uniforms.uEnvMap.value = this.sky.texture;
    scene.add(this.ocean.mesh);

    this.vfx = new CombatVFX(scene, { wakeField: this.wakeField, scale: q.particleScale });
    this.post = new PostPipeline(renderer, scene, camera, { msaa: q.msaa, reflectionScale: q.reflectionScale, bloom: q.bloom, dof: q.dof });
    this.assets = new ShipAssetLoader(renderer, { basePath: this.assetBasePath });

    this.setEnvironment(this.environmentName);
    await this.assets.preload(undefined, { procedural });

    this._resize();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.container);
    this._onVisibility = () => this.setActive(!document.hidden && this._wantActive !== false);
    document.addEventListener('visibilitychange', this._onVisibility);

    // Compile every program up front: no hitch on the first salvo.
    await renderer.compileAsync(scene, camera);
    this.setActive(true);
  }

  // ------------------------------------------------------------------ setup API

  setEnvironment(name) {
    this.environmentName = name;
    const p = this.sky.setPreset(name, this.scene);
    atmosphere.uAmbient.value.setRGB(...p.zenith).multiplyScalar(0.9).add(new THREE.Color(...p.horizon).multiplyScalar(0.25));
    this.ocean.setWaterColors(new THREE.Color(...p.deepWater), new THREE.Color(...p.scatterWater));
    this.ocean.setSeaState(SEA_STATES[p.seaState]);
    this.ocean.uniforms.uSunSpecular.value = p.sunSpecular ?? 1;
    atmosphere.uWind.value.set(p.seaState === 'storm' ? 9 : 3.5, 0, p.seaState === 'storm' ? 4 : 1.2);
    for (const s of this.ships.values()) s.waves = this.ocean.waves;
  }

  async addShip(id, classId, { x = 0, z = 0, heading = 0, scale = 1 } = {}) {
    const asset = await this.assets.create(classId);
    if (scale !== 1) asset.root.scale.setScalar(scale);
    const ship = new ShipController(asset, { waves: this.ocean.waves, wakeField: this.wakeField, vfx: this.vfx, id });
    ship.place(x, z, heading);
    ship.object.traverse((o) => o.layers.set(LAYERS.OPAQUE));
    this.scene.add(ship.object);
    this.ships.set(id, ship);
    return ship;
  }

  /**
   * Grid helper for a Battleship-style board. Scales the model so its length fits
   * `cells * cellSize`. orientation: 'h' (along +X) or 'v' (along +Z).
   */
  async placeOnGrid(id, classId, board, col, row, orientation = 'h') {
    const { originX, originZ, cellSize } = board;
    const ship = await this.addShip(id, classId);
    const cells = ship.spec.cells;
    const span = cells * cellSize;
    const scale = Math.min(1, (span * 0.92) / ship.spec.length);
    ship.model.scale.setScalar(scale);
    ship.spec = { ...ship.spec, length: ship.spec.length * scale, beam: ship.spec.beam * scale, freeboard: ship.spec.freeboard * scale };
    const horizontal = orientation === 'h';
    const cx = originX + (col + (horizontal ? cells / 2 : 0.5)) * cellSize;
    const cz = originZ + (row + (horizontal ? 0.5 : cells / 2)) * cellSize;
    ship.place(cx, cz, horizontal ? Math.PI / 2 : 0);
    return ship;
  }

  removeShip(id) {
    const s = this.ships.get(id);
    if (!s) return;
    s.fires.forEach((f) => f.stop());
    this.scene.remove(s.object);
    this.ships.delete(id);
  }

  // ------------------------------------------------------------------ combat API

  /**
   * Present one attack. `target` is { shipId } or { x, z }.
   * `outcome.result`: 'miss' | 'hit' | 'sunk' (decided by the game engine).
   * `outcome.weapon`: 'guns' | 'torpedo' | 'any' (default).
   * `outcome.point`: optional THREE.Vector3; shells land exactly there (grid games).
   * Resolves when every shell has landed (and the ship has gone under for 'sunk'
   * when outcome.awaitSink is true).
   */
  async fire(attackerId, target, outcome = { result: 'miss' }) {
    const attacker = this.ships.get(attackerId);
    if (!attacker || attacker.state !== 'afloat') return;
    const victim = target.shipId ? this.ships.get(target.shipId) : null;
    const aimPoint = victim ? victim.position.clone().setY(victim.spec.freeboard) : new THREE.Vector3(target.x, 0, target.z);

    const dist = attacker.position.distanceTo(aimPoint);
    const flightTime = THREE.MathUtils.clamp(dist / 420, 2.2, 5.5);
    await Promise.race([attacker.aimAt(aimPoint, flightTime), wait(4500 / this.timeScale)]);

    const weapon = outcome.weapon ?? 'any';
    const muzzles = attacker.getMuzzles().filter((m) => weapon === 'any' || (weapon === 'torpedo') === m.torpedo);
    if (!muzzles.length) return;
    const hitting = outcome.result !== 'miss';
    const hitShells = hitting ? Math.max(1, Math.round(muzzles.length * 0.3)) : 0;
    const impacts = [];

    // Ripple fire: turrets in sequence, barrels in a turret nearly together.
    let lastTurret = -1, delay = 0;
    const order = muzzles.map((m, i) => ({ m, r: Math.random(), i })).sort((a, b) => a.m.turret - b.m.turret || a.r - b.r);
    order.forEach(({ m }, k) => {
      if (m.turret !== lastTurret) { delay += lastTurret < 0 ? 0 : 0.35; lastTurret = m.turret; } else delay += 0.06;
      const isHit = k < hitShells;
      impacts.push(new Promise((resolve) => {
        this.vfx.after(delay, () => {
          const calibre = m.calibre;
          if (m.torpedo) {
            const dest = victim ? victim.position.clone() : aimPoint.clone();
            if (!isHit) dest.add(new THREE.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).setLength(rnd(60, 140)));
            this.vfx.fireTorpedo(m.pos, dest, 28, (p) => { this._impact(p, victim, isHit, 0.8, true); resolve(); });
            return;
          }
          this.vfx.muzzleFlash(m.pos, m.dir, calibre);
          attacker.applyRecoil(calibre, m.dir);
          const dest = this._shellDestination(aimPoint, victim, isHit, flightTime, outcome.point, k);
          this.vfx.fireShell(m.pos, dest, flightTime * rnd(0.97, 1.03), (p) => { this._impact(p, victim, isHit, calibre); resolve(); });
        });
      }));
    });

    if (this.autoFocus && victim) this.focusPoint.copy(victim.position);
    await Promise.all(impacts);

    if (outcome.result === 'sunk' && victim) {
      await wait(1200 / this.timeScale);
      const sinking = this.sink(victim.id);
      if (outcome.awaitSink) await sinking;
    }
  }

  _shellDestination(aim, victim, isHit, T, point = null, k = 0) {
    if (point) {
      // Exact grid impact: hits (and the first shell of a miss) land on the cell, the rest straddle it.
      const jitter = (r) => new THREE.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).setLength(rnd(0, r));
      if (isHit) return point.clone().setY(victim ? victim.spec.freeboard + 2 : 0).add(jitter(6));
      return point.clone().setY(0).add(k === 0 ? jitter(3) : jitter(40));
    }
    if (isHit && victim) {
      // Lead the target and pick a point on the hull.
      const lead = new THREE.Vector3(Math.sin(victim.heading), 0, Math.cos(victim.heading)).multiplyScalar(victim.speed * T);
      const along = rnd(-0.35, 0.35) * victim.spec.length;
      return victim.position.clone().add(lead).add(new THREE.Vector3(Math.sin(victim.heading) * along, victim.spec.freeboard + 2, Math.cos(victim.heading) * along));
    }
    // Straddle pattern: long/short and left/right of the aim point.
    const spread = victim ? victim.spec.length * 0.6 : 60;
    return aim.clone().setY(0).add(new THREE.Vector3(rnd(-1, 1) * spread, 0, rnd(-1, 1) * spread)).add(new THREE.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).setLength(rnd(25, 70)));
  }

  _impact(p, victim, isHit, calibre, torpedo = false) {
    if (isHit && victim) victim.object.visible = true; // a hit reveals a hidden ship
    if (!isHit || !victim || victim.state === 'sunk') {
      p.y = 0;
      this.vfx.waterSplash(p, torpedo ? 1.4 : calibre);
      return;
    }
    if (torpedo) this.vfx.waterSplash(p, 1.6);
    const local = victim.model.worldToLocal(p.clone());
    local.y = Math.max(local.y, victim.spec.freeboard / (victim.model.scale.x || 1));
    const world = victim.model.localToWorld(local.clone());
    this.vfx.hitExplosion(world, Math.max(0.6, calibre));
    if (victim.fires.length < 4) victim.fires.push(this.vfx.attachFire(victim.model, local, rnd(0.6, 1.2)));
    victim.rollVel += rnd(-0.02, 0.02) * calibre;
  }

  /** Start the sinking sequence for a ship. Resolves when it is under. */
  sink(id) {
    const ship = this.ships.get(id);
    if (!ship) return Promise.resolve();
    // Extra fires break out as she goes down.
    for (let i = 0; i < 2; i++) {
      const local = new THREE.Vector3(rnd(-0.2, 0.2) * ship.spec.beam, ship.spec.freeboard, rnd(-0.4, 0.4) * ship.spec.length).divideScalar(ship.model.scale.x || 1);
      ship.fires.push(this.vfx.attachFire(ship.model, local, 1.3));
    }
    return ship.sink();
  }

  /** Run a list of async presentation steps in order (one turn's worth of events). */
  async playSequence(steps) {
    for (const step of steps) await step(this);
  }

  // ------------------------------------------------------------------ lifecycle

  setActive(on) {
    this._wantActive = on;
    const run = on && !document.hidden;
    if (run === this.active) return;
    this.active = run;
    if (run) {
      this._last = performance.now();
      this.renderer.setAnimationLoop((t) => this._frame(t));
    } else {
      this.renderer.setAnimationLoop(null);
    }
  }

  _resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize(w, h, this.renderer.getPixelRatio());
  }

  _frame(now) {
    const realDt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    const dt = Math.min(0.05, realDt) * this.timeScale;
    this.elapsed += dt;
    atmosphere.uTime.value = this.elapsed;
    this.onBeforeFrame?.(dt, this.elapsed);

    const t = this.elapsed;
    const wakes = [];
    for (const s of this.ships.values()) {
      s.update(dt, t);
      if (s.state !== 'sunk' && s.object.visible) wakes.push(s.wakeInfo());
    }
    this.ocean.setShips(wakes);
    const waves = this.ocean.waves;
    this.vfx.update(dt, t, (x, z) => sampleHeight(waves, x, z, t, 2));
    this.wakeField.update(dt);
    this.sky.update(dt, this.focusPoint, this.scene);
    this.ocean.update(this.camera);

    if (this.autoFocus) {
      const d = this.camera.position.distanceTo(this.focusPoint);
      this.post.setFocus(d);
    }
    this.post.render(dt);
    this._adaptResolution(realDt * 1000);
  }

  /** Dynamic resolution: trade pixels for frame rate before dropping frames. */
  _adaptResolution(ms) {
    this._frameMs += (ms - this._frameMs) * 0.05;
    const budget = this.quality.frameBudgetMs;
    if (this._frameMs > budget * 1.2) { this._slowTime += ms; this._fastTime = 0; }
    else if (this._frameMs < budget * 0.7) { this._fastTime += ms; this._slowTime = 0; }
    else { this._slowTime = 0; this._fastTime = 0; }
    const s = this.post.renderScale;
    if (this._slowTime > 1000 && s > 0.6) { this.post.renderScale = Math.max(0.6, s - 0.1); this._slowTime = 0; this._resize(); }
    if (this._fastTime > 4000 && s < 1) { this.post.renderScale = Math.min(1, s + 0.1); this._fastTime = 0; this._resize(); }
  }

  dispose() {
    this.setActive(false);
    this._resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', this._onVisibility);
    for (const id of [...this.ships.keys()]) this.removeShip(id);
    this.vfx.dispose();
    this.ocean.dispose();
    this.wakeField.dispose();
    this.sky.dispose();
    this.post.dispose();
    this.assets.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export { SKY_PRESETS };
