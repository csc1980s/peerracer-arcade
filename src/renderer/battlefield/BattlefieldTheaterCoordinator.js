/**
 * Battlefield Theater Coordinator: cinematic drop-in replacement for TankSceneCoordinator.
 *
 * Same public API as the classic coordinator, so TankMinefieldView needs only to
 * construct this class instead (the classic one stays available as a fallback):
 *   setGame, syncFromGame, onAdvance, onReverse, onTurn, triggerExplosion,
 *   triggerScanPulse, launchShellTo, triggerMuzzleFire, toggleCameraMode / setCameraMode,
 *   cycleVisionMode / setVisionMode, cycleEnvironment / applyEnvironment,
 *   getEnvironmentPreset, onResize, destroy, gridToWorld, worldToGrid, enemyTank.
 *
 * What changes visually
 *   - Sky: physically-motivated atmosphere + ray-marched volumetric clouds rendered to
 *     a cube map (one face per frame), used as background, fog tint and PBR image-based
 *     lighting. Five theaters: daylight, twilight, desert golden hour, arctic, storm.
 *   - Terrain: seamless 3 km heightfield with procedural PBR splatting, de-mined ground,
 *     tread ruts, carved craters with embers, puddles + rain ripples, AA tactical grid.
 *   - Tanks: detailed procedural PBR tanks with running tracks, environment grime and
 *     faction insignia, for the player (commander's-hatch and orbit views) and the
 *     PvP opponent (tracks the player, burns when destroyed).
 *   - Effects: GPU particle mine blasts, shell impacts, muzzle blasts, tracers, tread
 *     dust, exhaust, smouldering craters; pooled lights (no shader recompiles).
 *   - Weather: rain, snow, blowing sand, lightning.
 *   - Post: HDR + MSAA, bloom, ACES, colour grade, vignette, grain, shock aberration,
 *     and the existing NVG / FLIR vision modes.
 *
 * Gameplay-facing overlays (flags, scanned-mine beacons, clue numbers, extraction
 * pillar) still come from CellBeaconManager; infantry, foliage and air strikes reuse
 * the existing managers (their lights are routed through the light pool).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { CARDINAL_DIRECTIONS, TANK_PRESETS } from '../../core/tank_minefield/rules_config.js';
import { ENVIRONMENT_PRESETS } from '../EnvironmentPresets.js';
import { CellBeaconManager } from '../CellBeaconManager.js';
import { InfantrySkirmishManager } from '../InfantrySkirmishManager.js';
import { AirstrikePlaneManager } from '../AirstrikePlaneManager.js';

import { atmosphere, LAYERS } from '../naval/theater/shared.js';
import { SkySystem } from '../naval/theater/env/SkySystem.js';
import { detectQuality } from '../naval/theater/quality.js';

import { getBattlefieldPreset } from './BattlefieldPresets.js';
import { BattlefieldTerrainPBR } from './BattlefieldTerrainPBR.js';
import { BattlefieldPost } from './BattlefieldPost.js';
import { GroundCombatVFX } from './GroundCombatVFX.js';
import { PooledLights } from './PooledLights.js';
import { WeatherSystem } from './WeatherSystem.js';
import { ProceduralTankModel, tankGrime } from './ProceduralTankModel.js';
import { BattlefieldVegetation } from './BattlefieldVegetation.js';

export const BATTLEFIELD_QUALITY = {
  low: { maxPixelRatio: 1, msaa: 0, prepass: 0, skyCube: 128, cloudSteps: 14, shadowMap: 1024, terrain: 'low', particleScale: 0.5, weatherScale: 0.4, frameBudgetMs: 33 },
  medium: { maxPixelRatio: 1.25, msaa: 2, prepass: 0.35, skyCube: 256, cloudSteps: 22, shadowMap: 2048, terrain: 'medium', particleScale: 0.75, weatherScale: 0.7, frameBudgetMs: 16.7 },
  high: { maxPixelRatio: 2, msaa: 4, prepass: 0.5, skyCube: 384, cloudSteps: 30, shadowMap: 2048, terrain: 'high', particleScale: 1, weatherScale: 1, frameBudgetMs: 16.7 },
};

const FACING_ANGLE = {
  [CARDINAL_DIRECTIONS.NORTH]: 0,
  [CARDINAL_DIRECTIONS.EAST]: -Math.PI / 2,
  [CARDINAL_DIRECTIONS.SOUTH]: Math.PI,
  [CARDINAL_DIRECTIONS.WEST]: Math.PI / 2,
};

const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _fwd = new THREE.Vector3();

/** PvP opponent: same model, aims at the player, burns when destroyed. */
class EnemyTankActor {
  constructor(coordinator, opponentTank) {
    this.c = coordinator;
    this.tank = opponentTank;
    this.model = new ProceduralTankModel({ presetId: opponentTank.presetId || 'USSR', quality: coordinator.qualityName });
    coordinator.scene.add(this.model.group);
    this.group = this.model.group;
    this.isDestroyed = false;
    this.pos = coordinator.gridToWorld(opponentTank.row, opponentTank.col);
    this.heading = FACING_ANGLE[opponentTank.facing] ?? 0;
    this.targetPos = this.pos.clone();
    this.targetHeading = this.heading;
    this.sync(opponentTank);
    this._place();
  }

  sync(opponentTank) {
    if (!opponentTank) return;
    this.tank = opponentTank;
    this.targetPos = this.c.gridToWorld(opponentTank.row, opponentTank.col);
    this.targetHeading = FACING_ANGLE[opponentTank.facing] ?? 0;
    if (this.model.presetId !== opponentTank.presetId && opponentTank.presetId) this.model.setPreset(opponentTank.presetId);
    if (!opponentTank.isAlive && !this.isDestroyed) this.triggerDestruction();
  }

  triggerDestruction() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.model.group.getWorldPosition(_v);
    _v.y += 1.8;
    this.c.vfx.armorHit(_v);
    this.c.vfx.mineBlast(_v.setY(_v.y - 1.5), 0.7);
    this.model.setDestroyed();
    this.fire = this.c.vfx.attachFire(this.model.group, new THREE.Vector3(0, 1.9, 0.6), 1.2);
    this.c.addTrauma(0.6, this.pos);
  }

  _place() {
    const g = this.model.group;
    g.position.set(this.pos.x, this.c.terrainHeight(this.pos.x, this.pos.z), this.pos.z);
    g.rotation.y = this.heading;
  }

  update(time, dt, playerWorldPos) {
    const prev = _v2.copy(this.pos);
    const k = 1 - Math.exp(-dt * 7);
    this.pos.lerp(this.targetPos, k);
    const dh = wrapAngle(this.targetHeading - this.heading) * Math.min(1, dt * 8);
    this.heading += dh;
    this._place();
    if (!this.isDestroyed) {
      const speed = prev.distanceTo(this.pos) / Math.max(dt, 1e-4);
      const sgn = Math.sign(_fwd.set(-Math.sin(this.heading), 0, -Math.cos(this.heading)).dot(_v.subVectors(this.pos, prev))) || 1;
      const w = dh / Math.max(dt, 1e-4);
      this.model.driveTracks(dt, sgn * speed - w * 1.42, sgn * speed + w * 1.42);
      if (playerWorldPos) {
        const a = Math.atan2(-(playerWorldPos.x - this.pos.x), -(playerWorldPos.z - this.pos.z)) - this.heading;
        const t = this.model.turret;
        t.rotation.y += wrapAngle(a - t.rotation.y) * Math.min(1, dt * 3);
      }
    }
    this.model.update(dt, time, false);
  }

  destroy() {
    this.fire?.stop();
    this.model.dispose();
  }
}

export class BattlefieldTheaterCoordinator {
  constructor(containerEl, game, options = {}) {
    this.container = containerEl;
    this.game = game;
    this.options = {
      cellSize: 10.0,
      cameraMode: 'cockpit',
      visionMode: 0,
      environment: 'daylight',
      quality: 'auto',
      ...options,
    };
    this.cameraMode = this.options.cameraMode;
    this.visionMode = this.options.visionMode;
    this.environment = ENVIRONMENT_PRESETS[this.options.environment] ? this.options.environment : 'daylight';

    // Compatibility with the classic coordinator's public fields.
    this.particleSystems = [];
    this.flashLights = [];
    this.enemyTank = null;
    this.trauma = 0;
    this.needsRender = true;

    this.clock = new THREE.Clock();
    this.time = 0;
    this.frameTimes = [];
    this.lastResAdjust = 0;
    this.visible = true;

    this.scanPulse = { active: false, elapsed: 0, duration: 0.85 };
    this.pendingCraters = new Set();
    this.lastTankCell = null;
    this.recoil = 0;
    this.dustAcc = 0;
    this.exhaustAcc = 0;

    this._initRenderer();
    this._initScene();
    this._initWorld();
    this.applyEnvironment(this.environment);

    if (this.game) this.syncFromGame();
    this._snapTank();
    if (this.terrain) this.terrain.settleCraters();
    this.setCameraMode(this.cameraMode);

    this._resizeHandler = () => this.onResize();
    window.addEventListener('resize', this._resizeHandler);
    if (typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver((entries) => { this.visible = entries[0]?.isIntersecting !== false; });
      this._io.observe(this.container);
    }
    this._startRenderLoop();
  }

  // ==========================================================================
  // INITIALISATION
  // ==========================================================================

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    const qName = this.options.quality === 'auto' ? detectQuality(this.renderer) : this.options.quality;
    this.qualityName = BATTLEFIELD_QUALITY[qName] ? qName : 'medium';
    this.q = BATTLEFIELD_QUALITY[this.qualityName];

    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.q.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 540;
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
  }

  _initScene() {
    this.scene = new THREE.Scene();
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 540;
    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 4000);
    this.camera.layers.enable(LAYERS.EFFECTS);
    this.scene.add(this.camera);

    this.sky = new SkySystem(this.renderer, { cubeSize: this.q.skyCube, cloudSteps: this.q.cloudSteps });
    this.sunLight = this.sky.sun;
    this.sunLight.shadow.mapSize.set(this.q.shadowMap, this.q.shadowMap);
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.04;
    this.scene.add(this.sunLight, this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x404040, 0);
    this.scene.add(this.hemiLight);

    // Night headlights (constant light count: intensity 0 when unused).
    this.headlight = new THREE.SpotLight(0xfff2d8, 0, 80, Math.PI / 5, 0.5, 2);
    this.headlightTarget = new THREE.Object3D();
    this.scene.add(this.headlight, this.headlightTarget);
    this.headlight.target = this.headlightTarget;

    this.lights = new PooledLights(this.scene, 6);
    this.legacyScene = this.lights.proxyScene(this.scene);

    this.post = new BattlefieldPost(this.renderer, this.scene, this.camera, { msaa: this.q.msaa, prepassScale: this.q.prepass });
    this.post.setSize(w, h, this.pixelRatio);
    this.post.setVisionMode(this.visionMode);

    this.vfx = new GroundCombatVFX(this.scene, this.lights, { scale: this.q.particleScale });
    this.weather = new WeatherSystem(this.scene, { scale: this.q.weatherScale });

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 320;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.enabled = false;

    this.playerTank = new ProceduralTankModel({ presetId: this.game?.tank?.presetId || 'US', quality: this.qualityName });
    this.scene.add(this.playerTank.group);
    this.tankPos = new THREE.Vector3();
    this.tankHeading = 0;
  }

  /** Grid-size dependent systems (rebuilt when a game with another grid size is set). */
  _initWorld() {
    const rows = this.game?.grid?.rows || 12;
    const cols = this.game?.grid?.cols || 12;
    this.gridDims = { rows, cols };
    this.terrain = new BattlefieldTerrainPBR(this.scene, { rows, cols, cellSize: this.options.cellSize, quality: this.q.terrain });
    this.battlefieldTerrain = this.terrain; // legacy managers query getHeightAt()
    this.gridMaterial = { uniforms: this.terrain.uniforms }; // legacy alias
    this.vfx.groundHeight = (x, z) => this.terrainHeight(x, z);

    const s = this.legacyScene;
    this.beaconManager = new CellBeaconManager(s, this);
    this.foliageManager = new BattlefieldVegetation(this.scene, this, { quality: this.qualityName });
    this.infantryManager = new InfantrySkirmishManager(s, this);
    this.airstrikeManager = new AirstrikePlaneManager(s, this);
    // Aircraft strobes become pooled virtual lights.
    const build = this.airstrikeManager._buildPlaneMesh?.bind(this.airstrikeManager);
    if (build) {
      this.airstrikeManager._buildPlaneMesh = () => {
        const d = build();
        this.lights.virtualizeChildren(d.group);
        return d;
      };
    }
    this._fitShadowFrustum();
  }

  _destroyWorld() {
    this.beaconManager?.clear();
    this.foliageManager?.destroy();
    this.infantryManager?.destroy();
    this.airstrikeManager?.destroy();
    this.terrain?.dispose();
    this.beaconManager = this.foliageManager = this.infantryManager = this.airstrikeManager = this.terrain = null;
  }

  _fitShadowFrustum() {
    const { rows, cols } = this.gridDims;
    const W = cols * this.options.cellSize, H = rows * this.options.cellSize;
    const half = Math.max(W, H) * 0.5 + 30;
    const sc = this.sunLight.shadow.camera;
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
    sc.near = 1; sc.far = 1600;
    sc.updateProjectionMatrix();
    this.shadowCenter = new THREE.Vector3(W / 2, 0, H / 2);
  }

  // ==========================================================================
  // COORDINATES
  // ==========================================================================

  gridToWorld(row, col) {
    return new THREE.Vector3((col + 0.5) * this.options.cellSize, 0, (row + 0.5) * this.options.cellSize);
  }

  worldToGrid(position) {
    return { row: Math.floor(position.z / this.options.cellSize), col: Math.floor(position.x / this.options.cellSize) };
  }

  terrainHeight(x, z) { return this.terrain ? this.terrain.getHeightAt(x, z) : 0; }

  _facingToAngle(facing) { return FACING_ANGLE[facing] ?? 0; }

  _getCannonMuzzleWorldPos() {
    this.playerTank.group.updateMatrixWorld(true);
    return this.playerTank.muzzle.getWorldPosition(new THREE.Vector3());
  }

  // ==========================================================================
  // GAME SYNC
  // ==========================================================================

  setGame(game) {
    const prevDims = this.gridDims;
    this.game = game;
    const rows = game?.grid?.rows || 12, cols = game?.grid?.cols || 12;
    if (!prevDims || prevDims.rows !== rows || prevDims.cols !== cols) {
      this._destroyWorld();
      this._initWorld();
      this.applyEnvironment(this.environment);
    } else {
      this.beaconManager.clear();
      this.terrain.trackBits.fill(0);
      this.terrain.craterType.fill(0);
      this.terrain.craterProg.fill(0);
      this.terrain.heat.fill(0);
    }
    if (this.enemyTank) { this.enemyTank.destroy(); this.enemyTank = null; }
    this.pendingCraters.clear();
    this.lastTankCell = null;
    this.syncFromGame();
    this.terrain.settleCraters();
    this._snapTank();
    if (this.cameraMode === 'orbit') this.setCameraMode('orbit');
  }

  syncFromGame() {
    if (!this.game || !this.game.tank) return;
    const tank = this.game.tank;

    // Tread ruts along the axis of travel.
    const cell = { row: tank.row, col: tank.col };
    if (this.lastTankCell && (this.lastTankCell.row !== cell.row || this.lastTankCell.col !== cell.col)) {
      const axis = this.lastTankCell.row !== cell.row ? 'ns' : 'ew';
      this.terrain.markTrack(this.lastTankCell.row, this.lastTankCell.col, axis);
      this.terrain.markTrack(cell.row, cell.col, axis);
    }
    if (!this.lastTankCell) this.terrain.markTrack(cell.row, cell.col, tank.facing % 2 === 0 ? 'ns' : 'ew');
    this.lastTankCell = cell;

    this.targetPos = this.gridToWorld(tank.row, tank.col);
    this.targetHeading = this._facingToAngle(tank.facing);
    this.terrain.setActiveCell(tank.row, tank.col);

    if (this.playerTank.presetId !== tank.presetId) this.playerTank.setPreset(tank.presetId);

    this.terrain.syncCells(this.game.grid, this.pendingCraters);
    this.beaconManager.syncGrid(this.game);
    this._tuneLegacyOverlays();

    if (this.game.mode === 'pvp' && this.game.opponentTank) {
      if (!this.enemyTank) this.enemyTank = new EnemyTankActor(this, this.game.opponentTank);
      else this.enemyTank.sync(this.game.opponentTank);
    } else if (this.enemyTank) {
      this.enemyTank.destroy();
      this.enemyTank = null;
    }
    this.requestRender();
  }

  /** Craters come from the terrain; clue numbers need HDR headroom to read after tone mapping. */
  _tuneLegacyOverlays() {
    const bm = this.beaconManager;
    if (!bm) return;
    for (const m of bm.craters.values()) m.visible = false;
    const k = 2.0 / Math.max(0.3, this.renderer.toneMappingExposure);
    for (const s of bm.numberLabels.values()) {
      s.material.color.setScalar(k);
      s.material.fog = false;
      s.layers.set(LAYERS.EFFECTS);
    }
    if (bm.pillarMat) bm.pillarMat.color.setRGB(0.8, 3.0, 2.0);
    if (bm.padMat) bm.padMat.color.setRGB(0.2, 1.6, 1.0);
    if (bm.hazardRingMat) bm.hazardRingMat.color.setRGB(3.0, 1.6, 0.2);
    if (bm.hazardCoreMat) bm.hazardCoreMat.color.setRGB(3.0, 0.1, 0.4);
  }

  _snapTank() {
    if (!this.game?.tank) return;
    this.targetPos = this.gridToWorld(this.game.tank.row, this.game.tank.col);
    this.targetHeading = this._facingToAngle(this.game.tank.facing);
    this.tankPos.copy(this.targetPos);
    this.tankHeading = this.targetHeading;
    this._placeTank(0);
  }

  // ==========================================================================
  // CAMERA, VISION, ENVIRONMENT
  // ==========================================================================

  setCameraMode(mode) {
    this.cameraMode = mode === 'orbit' ? 'orbit' : 'cockpit';
    if (this.cameraMode === 'orbit') {
      this.controls.enabled = true;
      const t = this.tankPos;
      const back = _fwd.set(Math.sin(this.tankHeading), 0, Math.cos(this.tankHeading));
      this.controls.target.set(t.x, 1.5, t.z);
      this.camera.position.set(t.x + back.x * 26 + 10, 18, t.z + back.z * 26);
      this.controls.update();
    } else {
      this.controls.enabled = false;
    }
    this.requestRender();
  }

  toggleCameraMode() {
    this.setCameraMode(this.cameraMode === 'cockpit' ? 'orbit' : 'cockpit');
    return this.cameraMode;
  }

  setVisionMode(mode) {
    this.visionMode = mode;
    this.post.setVisionMode(mode);
    this.requestRender();
  }

  cycleVisionMode() {
    this.setVisionMode(((this.visionMode || 0) + 1) % 3);
    return this.visionMode;
  }

  applyEnvironment(presetId) {
    if (!ENVIRONMENT_PRESETS[presetId]) presetId = 'daylight';
    this.environment = presetId;
    const p = getBattlefieldPreset(presetId);
    this.preset = p;

    this.sky.setPreset(p.sky, this.scene);
    this.baseEnvIntensity = p.sky.envIntensity;
    atmosphere.uAmbient.value.setRGB(...p.ambient);
    this.hemiLight.color.setHex(p.hemi.sky);
    this.hemiLight.groundColor.setHex(p.hemi.ground);
    this.hemiLight.intensity = this.baseHemi = p.hemi.intensity;
    this.sunBaseIntensity = p.sky.sunIntensity;
    this.headlight.intensity = p.headlight;
    this.playerTank.setLights(p.headlight > 0);

    // Directional light may sit higher than the visible sun (twilight keeps readable shadows).
    const el = THREE.MathUtils.degToRad(p.lightElevation ?? Math.max(p.sky.sunElevation, 8));
    const az = THREE.MathUtils.degToRad(p.sky.sunAzimuth);
    this.lightDir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();

    this.terrain.applyPreset(p);
    this.post.setGrade(p.grade);
    this.weather.setWeather(p.weather, { lightning: p.lightning });
    this.vfx.setEnvironment(presetId);
    const dust = { daylight: [0.42, 0.35, 0.25, 0.55], twilight: [0.3, 0.26, 0.22, 0.5], desert: [0.66, 0.5, 0.34, 0.85], arctic: [0.38, 0.33, 0.3, 0.35], storm: [0.18, 0.14, 0.1, 0.8] }[presetId];
    tankGrime.uDustColor.value.setRGB(dust[0], dust[1], dust[2], THREE.SRGBColorSpace);
    tankGrime.uDust.value = dust[3];
    tankGrime.uSnow.value = p.terrain.snow;
    tankGrime.uWet.value = p.terrain.wet * (p.weather === 'rain' ? 1 : 0.3);

    this.foliageManager?.applyPreset(presetId);
    this.infantryManager?.applyPreset(presetId);
    this.airstrikeManager?.applyPreset(presetId);
    this._tuneLegacyOverlays();
    this.requestRender();
    return this.environment;
  }

  cycleEnvironment() {
    const keys = Object.keys(ENVIRONMENT_PRESETS);
    const next = keys[(keys.indexOf(this.environment) + 1) % keys.length];
    return this.applyEnvironment(next);
  }

  getEnvironmentPreset() {
    return ENVIRONMENT_PRESETS[this.environment] || ENVIRONMENT_PRESETS.daylight;
  }

  addTrauma(amount, at) {
    let k = 1;
    if (at) k = THREE.MathUtils.clamp(1.2 - at.distanceTo(this.camera.position) / 90, 0.15, 1);
    this.trauma = Math.min(1, this.trauma + amount * k);
  }

  // ==========================================================================
  // EFFECTS (public API)
  // ==========================================================================

  launchShellTo(targetRow, targetCol, onImpact) {
    this.triggerMuzzleFire();
    const from = this._getCannonMuzzleWorldPos();
    const to = this.gridToWorld(targetRow, targetCol);
    const hitsEnemy = this.enemyTank && this.game?.opponentTank &&
      this.game.opponentTank.row === targetRow && this.game.opponentTank.col === targetCol;
    to.y = hitsEnemy ? this.terrainHeight(to.x, to.z) + 1.6 : this.terrainHeight(to.x, to.z) + 0.1;
    const key = targetRow * 1000 + targetCol;
    this.pendingCraters.add(key);
    const flight = Math.max(0.18, from.distanceTo(to) / 260);
    this.vfx.fireShell(from, to, flight, (p) => {
      this.pendingCraters.delete(key);
      if (hitsEnemy) this.vfx.armorHit(p);
      else this.vfx.shellImpact(p);
      this.addTrauma(0.35, p);
      this.syncFromGame();
      if (onImpact) onImpact(p);
    });
    this.requestRender();
  }

  triggerExplosion(row, col) {
    const p = this.gridToWorld(row, col);
    p.y = this.terrainHeight(p.x, p.z);
    this.vfx.mineBlast(p, 1);
    this.addTrauma(1.0, p);
    this.requestRender();
  }

  triggerMuzzleFire() {
    const from = this._getCannonMuzzleWorldPos();
    const dir = _fwd.set(-Math.sin(this.tankHeading), 0, -Math.cos(this.tankHeading)).clone();
    this.vfx.muzzleBlast(from, dir, this.terrainHeight(from.x, from.z));
    this.recoil = 1;
    this.addTrauma(0.45);
    this.requestRender();
  }

  triggerScanPulse(row, col, foundMine) {
    const p = this.gridToWorld(row, col);
    const u = this.terrain.uniforms;
    u.uScanCenter.value.copy(p);
    u.uScanRadius.value = 0.5;
    u.uScanPulseAlpha.value = 1;
    this.scanPulse.active = true;
    this.scanPulse.elapsed = 0;
    this.scanPulse.foundMine = !!foundMine;
    this.requestRender();
  }

  onAdvance() { this.syncFromGame(); }
  onReverse() { this.syncFromGame(); }
  onTurn() { this.syncFromGame(); }
  requestRender() { this.needsRender = true; }

  // ==========================================================================
  // FRAME
  // ==========================================================================

  _placeTank(dt) {
    const g = this.playerTank.group;
    const y = this.terrainHeight(this.tankPos.x, this.tankPos.z);
    g.position.set(this.tankPos.x, y, this.tankPos.z);
    g.rotation.y = this.tankHeading;
    // Recoil: the whole gun slides back, then returns on its recuperator.
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 3.2);
    this.playerTank.gun.position.z = -1.45 + this.recoil * this.recoil * 0.45;
    // Hull rocks back on firing.
    g.rotation.x = -this.recoil * this.recoil * 0.025;
  }

  _updateTank(dt) {
    if (!this.targetPos) return;
    const prev = _v2.copy(this.tankPos);
    const prevHeading = this.tankHeading;
    // Critically damped approach: a 10 m move takes ~0.45 s.
    this.tankPos.lerp(this.targetPos, 1 - Math.exp(-dt * 7.5));
    if (this.tankPos.distanceTo(this.targetPos) < 0.01) this.tankPos.copy(this.targetPos);
    this.tankHeading += wrapAngle(this.targetHeading - this.tankHeading) * Math.min(1, dt * 7);
    const dh = wrapAngle(this.tankHeading - prevHeading);
    this._placeTank(dt);

    const step = _v.subVectors(this.tankPos, prev);
    const dist = step.length();
    const speed = dist / Math.max(dt, 1e-4);
    const fwd = _fwd.set(-Math.sin(this.tankHeading), 0, -Math.cos(this.tankHeading));
    const sgn = Math.sign(fwd.dot(step)) || 1;
    const w = dh / Math.max(dt, 1e-4);
    this.playerTank.driveTracks(dt, sgn * speed - w * 1.42, sgn * speed + w * 1.42);
    this.moving = speed > 0.4 || Math.abs(w) > 0.2;
    this.playerTank.update(dt, this.time, this.moving);

    if (this.moving) {
      this.dustAcc += dt;
      if (this.dustAcc > 0.05) {
        this.dustAcc = 0;
        const moveDir = speed > 0.4 ? step.clone().normalize() : fwd.clone();
        this.vfx.treadDust(this.playerTank.group.position, moveDir, this.environment === 'storm' ? 0.6 : 1);
      }
    }
    // Diesel exhaust: heavier while moving.
    this.exhaustAcc += dt * (this.moving ? 14 : 3);
    while (this.exhaustAcc >= 1) {
      this.exhaustAcc -= 1;
      for (const e of this.playerTank.exhausts) {
        const p = this.playerTank.group.localToWorld(_v.copy(e));
        this.vfx.pools.smoke.spawn(this.time, p.x, p.y, p.z, -fwd.x * 0.8 + (Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.6, -fwd.z * 0.8,
          2.5 + Math.random() * 1.5, 0.25, 1.4 + Math.random(), { drag: 0.8, gravity: -0.03, brightness: 0, opacity: 0.18, tint: [0.12, 0.12, 0.12], wind: 1 });
      }
    }

    // Headlight follows the hull.
    const hp = this.playerTank.group.localToWorld(_v.set(0, 1.4, -3.4));
    this.headlight.position.copy(hp);
    this.headlightTarget.position.copy(this.playerTank.group.localToWorld(_v.set(0, 0, -30)));
  }

  _updateCamera(dt) {
    if (this.cameraMode === 'orbit') {
      // Keep the orbit pivot on the tank as it drives.
      const t = this.tankPos;
      const dx = t.x - this.controls.target.x, dz = t.z - this.controls.target.z;
      const k = Math.min(1, dt * 4);
      this.controls.target.x += dx * k; this.controls.target.z += dz * k;
      this.camera.position.x += dx * k; this.camera.position.z += dz * k;
      this.controls.update();
    } else {
      // Commander's hatch view, behind the cupola, looking over the gun.
      const g = this.playerTank.group;
      const idle = Math.sin(this.time * 31) * 0.004 + (this.moving ? Math.sin(this.time * 9) * 0.03 : 0);
      const eye = g.localToWorld(_v.set(0, 3.05 + idle, -0.2));
      this.camera.position.copy(eye);
      const look = g.localToWorld(_v2.set(0, 0.6, -24));
      this.camera.lookAt(look);
    }
    if (this.trauma > 0.001) {
      const s = this.trauma * this.trauma;
      const t = this.time;
      this.camera.position.x += (Math.sin(t * 47) + Math.sin(t * 83)) * 0.12 * s;
      this.camera.position.y += (Math.sin(t * 59) + Math.sin(t * 97)) * 0.1 * s;
      this.camera.rotateZ((Math.sin(t * 41) + Math.sin(t * 73)) * 0.015 * s);
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
    }
    this.post.lensPass.uniforms.uShock.value = this.trauma * this.trauma;
  }

  _updateLighting() {
    const flash = this.weather.flash;
    this.hemiLight.intensity = this.baseHemi + flash * 2.5;
    this.scene.environmentIntensity = this.baseEnvIntensity * (1 + flash * 2);
    this.sunLight.intensity = this.sunBaseIntensity;
    this.post.lensPass.uniforms.uFlash.value = flash;
    const c = this.shadowCenter;
    this.sunLight.position.copy(c).addScaledVector(this.lightDir, 700);
    this.sunLight.target.position.copy(c);
    this.sunLight.target.updateMatrixWorld();
  }

  _adjustResolution(frameMs) {
    this.frameTimes.push(frameMs);
    if (this.frameTimes.length < 40) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (this.time - this.lastResAdjust < 2) return;
    const budget = this.q.frameBudgetMs;
    let s = this.post.renderScale;
    if (avg > budget * 1.2 && s > 0.6) s = Math.max(0.6, s - 0.1);
    else if (avg < budget * 0.7 && s < 1) s = Math.min(1, s + 0.05);
    if (s !== this.post.renderScale) {
      this.post.renderScale = s;
      this.lastResAdjust = this.time;
      this.onResize();
    }
  }

  _frame(dt) {
    this.time += dt;
    atmosphere.uTime.value = this.time;

    this.sky.update(dt, null, this.scene);
    this._updateTank(dt);
    this.enemyTank?.update(this.time, dt, this.tankPos);
    this._updateCamera(dt);

    if (this.scanPulse.active) {
      const sp = this.scanPulse;
      sp.elapsed += dt;
      const k = sp.elapsed / sp.duration;
      const u = this.terrain.uniforms;
      if (k >= 1) { sp.active = false; u.uScanPulseAlpha.value = 0; u.uScanRadius.value = 0; }
      else { u.uScanRadius.value = k * this.options.cellSize * 1.8; u.uScanPulseAlpha.value = 1 - k; }
    }

    this.terrain.update(dt, this.time);
    this.beaconManager.update(this.time, dt);
    this.foliageManager.update(this.time, dt);
    this.infantryManager.update(this.time, dt, this.tankPos);
    this.airstrikeManager.update(this.time, dt);
    this.weather.update(dt, this.time, this.camera);
    this.vfx.update(dt, this.time);
    this.lights.update(dt);
    this._updateLighting();

    // Legacy particle systems pushed by other modules.
    for (let i = this.particleSystems.length - 1; i >= 0; i--) {
      const ps = this.particleSystems[i];
      if (!ps.update(dt)) { ps.destroy(); this.particleSystems.splice(i, 1); }
    }
    for (let i = this.flashLights.length - 1; i >= 0; i--) {
      const fl = this.flashLights[i];
      if (!fl.update(dt)) { fl.destroy(); this.flashLights.splice(i, 1); }
    }

    this.post.render(dt, this.time);
    this.needsRender = false;
  }

  _startRenderLoop() {
    const tick = () => {
      this.animFrameId = requestAnimationFrame(tick);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const w = this.container.clientWidth, h = this.container.clientHeight;
      if (!this.visible || !w || !h) return;
      if (w !== this._lastW || h !== this._lastH) this.onResize();
      this._frame(dt);
      this._adjustResolution(dt * 1000);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  onResize() {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 540;
    this._lastW = w; this._lastH = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h, this.pixelRatio);
    this.requestRender();
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = null;
    window.removeEventListener('resize', this._resizeHandler);
    this._io?.disconnect();
    this.controls?.dispose();
    this.enemyTank?.destroy();
    this.enemyTank = null;
    this._destroyWorld();
    this.playerTank?.dispose();
    this.vfx?.dispose();
    this.weather?.dispose();
    this.lights?.dispose();
    this.post?.dispose();
    this.sky?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement);
  }
}
