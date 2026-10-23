/**
 * Tank Scene Coordinator - Visual Manager for Three.js WebGL2 3D Viewport
 *
 * Architecture:
 * - Coordinates Three.js Scene, Camera, WebGLRenderer, and Lighting.
 * - Screen-space anti-aliased grid shader ground plane (GridShaderMaterial).
 * - Procedural 3D cell beacons, flags, craters, and extraction beam (CellBeaconManager).
 * - First-person tank cockpit view (angled glacis armor, 90mm cannon with recoil, tread bob).
 * - 3D Opponent Tank Entity for 2-Player PvP Arena mode (EnemyTankMesh).
 * - 3D Ballistics Tracer & Shell Projectile Engine (BallisticsManager).
 * - Post-Processing Pipeline: UnrealBloomPass & Tactical Vision (Standard, NVG Green, Thermal FLIR).
 * - Dual camera modes: First-Person Cockpit (default) & Tactical Free Orbit (OrbitControls).
 * - GPU particle explosions, ground shockwave rings, muzzle flashes, and camera trauma shake.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import { CARDINAL_DIRECTIONS, TANK_PRESETS, CRATER_TYPE, CELL_STATE } from '../core/tank_minefield/rules_config.js';
import { createGridShaderMaterial } from './GridShaderMaterial.js';
import { CellBeaconManager } from './CellBeaconManager.js';
import { BallisticsManager } from './BallisticsManager.js';
import { EnemyTankMesh } from './EnemyTankMesh.js';
import { TacticalVisionShader } from './TacticalVisionShader.js';
import { ENVIRONMENT_PRESETS } from './EnvironmentPresets.js';
import { SkyDomeManager } from './SkyDomeManager.js';
import { BattlefieldTerrain } from './BattlefieldTerrain.js';
import { BattlefieldFoliageManager } from './BattlefieldFoliageManager.js';
import { InfantrySkirmishManager } from './InfantrySkirmishManager.js';
import { AirstrikePlaneManager } from './AirstrikePlaneManager.js';

export class TankSceneCoordinator {
  constructor(containerEl, game, options = {}) {
    this.container = containerEl;
    this.game = game;
    this.options = {
      cellSize: 10.0,
      enableShadows: true,
      cameraMode: 'cockpit', // 'cockpit' | 'orbit'
      enablePostProcessing: true,
      visionMode: 0, // 0: Standard, 1: NVG Night Vision, 2: Thermal FLIR
      environment: 'daylight',
      ...options
    };

    // Camera & Vision & Environment Modes
    this.cameraMode = this.options.cameraMode; // 'cockpit' or 'orbit'
    this.visionMode = this.options.visionMode; // 0: Standard, 1: NVG, 2: Thermal FLIR
    this.environment = this.options.environment || 'twilight';

    // Animation & Motion Dynamics
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    this.elapsedTime = 0;
    this.needsRender = false;
    this.animFrameId = null;

    // Cockpit Motion Smoothing
    this.currentHeading = this._facingToAngle(this.game?.tank?.facing ?? 0);
    this.targetHeading = this.currentHeading;
    this.cameraPos = new THREE.Vector3();
    this.cameraTarget = new THREE.Vector3();
    this.recoilOffset = 0;
    this.trauma = 0; // Camera shake trauma [0..1]
    this.driveBobTime = 0;
    this.isDriving = false;

    // Particle Systems & Dynamic Lights
    this.particleSystems = [];
    this.flashLights = [];

    // Scan Pulse Uniform Tracking
    this.scanPulse = {
      active: false,
      radius: 0,
      alpha: 0,
      center: new THREE.Vector3(),
      duration: 0.85,
      elapsed: 0
    };

    // Initialize 3D Engine
    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initControls();

    // Visual Subsystems
    this._initGround();
    this._initCockpitRig();
    this.skyManager = new SkyDomeManager(this.scene, this.renderer, this);
    this.beaconManager = new CellBeaconManager(this.scene, this);
    this.ballistics = new BallisticsManager(this.scene, this);
    this.foliageManager = new BattlefieldFoliageManager(this.scene, this);
    this.infantryManager = new InfantrySkirmishManager(this.scene, this);
    this.airstrikeManager = new AirstrikePlaneManager(this.scene, this);
    this.enemyTank = null;
    this.applyEnvironment(this.environment);

    // Post-Processing Pipeline (Bloom & Tactical Vision)
    if (this.options.enablePostProcessing) {
      this._initPostProcessing();
    }

    // Initial Sync
    if (this.game) {
      this.syncFromGame();
    }

    // Window Resize Handler
    this._resizeHandler = () => this.onResize();
    window.addEventListener('resize', this._resizeHandler);

    // Start Rendering Loop
    this._startRenderLoop();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 540;
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x070c14); // Deep twilight slate

    if (this.options.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Append canvas to container
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    // Atmospheric battle haze fog
    this.scene.fog = new THREE.FogExp2(0x0c1622, 0.0075);
  }

  _initCamera() {
    const aspect = (this.container.clientWidth || 800) / (this.container.clientHeight || 540);
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 400);

    // Position camera initially at tank's world position
    this._updateCameraTransform(0);
  }

  _initLights() {
    // Soft sky-ground hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0x7ea0ba, 0x1f2922, 0.55);
    this.scene.add(this.hemiLight);

    // Tactical Sun / Moon Directional Light with soft shadows
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    this.sunLight.position.set(70, 95, 55);
    this.sunLight.castShadow = this.options.enableShadows;

    if (this.sunLight.castShadow) {
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 0.5;
      this.sunLight.shadow.camera.far = 300;
      const d = 90;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0003;
    }
    this.scene.add(this.sunLight);

    // Subtle forward headlight attached to cockpit
    this.headlight = new THREE.SpotLight(0xfffbe8, 2.2, 55, Math.PI / 4, 0.45, 1.2);
    this.headlight.position.set(0, 1.8, 0);
    this.scene.add(this.headlight);
    this.headlightTarget = new THREE.Object3D();
    this.scene.add(this.headlightTarget);
    this.headlight.target = this.headlightTarget;

    // Cockpit illumination light attached to camera for rich armor definition
    const cockpitLight = new THREE.DirectionalLight(0xedf2f7, 1.4);
    cockpitLight.position.set(0, 2, 1);
    this.camera.add(cockpitLight);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 160;
    this.controls.maxPolarAngle = Math.PI / 2.08; // Prevent camera sinking beneath ground
    this.controls.enabled = (this.cameraMode === 'orbit');
    this.controls.addEventListener('change', () => this.requestRender());
  }

  _initPostProcessing() {
    try {
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 540;

      this.composer = new EffectComposer(this.renderer);

      // Pass 1: Primary Scene Render Pass
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      // Pass 2: Unreal Bloom (Laser pillars, scanned hazard rings, tracers, explosions)
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.55,  // Strength
        0.35,  // Radius
        0.75   // Threshold
      );
      this.composer.addPass(this.bloomPass);

      // Pass 3: Tactical Vision Modes (Standard / NVG Night Vision / Thermal FLIR)
      this.visionPass = new ShaderPass(TacticalVisionShader);
      this.visionPass.uniforms['uMode'].value = this.visionMode || 0;
      this.visionPass.uniforms['uResolution'].value = [width, height];
      this.composer.addPass(this.visionPass);

      this.postProcessingAvailable = true;
    } catch (e) {
      console.warn('[!] Post-processing setup skipped or unavailable:', e);
      this.postProcessingAvailable = false;
      this.composer = null;
    }
  }

  // ============================================================================
  // GROUND TERRAIN & SHADER PLANE
  // ============================================================================

  _initGround() {
    const rows = this.game?.grid?.rows || 12;
    const cols = this.game?.grid?.cols || 12;
    const worldWidth = cols * this.options.cellSize;
    const worldHeight = rows * this.options.cellSize;

    // 1. 3D Undulating Battlefield Terrain (rolling hills, sandbag berms, perimeter ramparts)
    this.battlefieldTerrain = new BattlefieldTerrain(this.scene, this);

    // 2. Tactical Grid Shader Overlay
    this.gridMaterial = createGridShaderMaterial({
      cellSize: this.options.cellSize,
      lineWidth: 0.75,
      gridColor: new THREE.Color(0x38bdf8),
      subGridColor: new THREE.Color(0x13263b),
      backgroundColor: new THREE.Color(0x090f17),
      fadeStart: 85.0,
      fadeEnd: 240.0
    });

    const gridGeo = new THREE.PlaneGeometry(worldWidth, worldHeight, 1, 1);
    gridGeo.rotateX(-Math.PI / 2);

    this.groundMesh = new THREE.Mesh(gridGeo, this.gridMaterial);
    this.groundMesh.receiveShadow = false;
    this.groundMesh.position.set(worldWidth / 2, 0.04, worldHeight / 2); // Hovering slightly above terrain surface
    this.scene.add(this.groundMesh);
  }

  // ============================================================================
  // FIRST-PERSON TANK COCKPIT RIG
  // ============================================================================

  _initCockpitRig() {
    this.cockpitGroup = new THREE.Group();
    this.camera.add(this.cockpitGroup);
    this.scene.add(this.camera);

    // Preset Armor Colors
    const presetId = this.game?.tank?.presetId || 'US';
    const preset = TANK_PRESETS[presetId] || TANK_PRESETS.US;
    const armorColor = new THREE.Color(preset.primaryColor || 0x3d5236);

    // Glacis Plate (Angled front armor)
    const glacisGeo = new THREE.BoxGeometry(2.4, 0.45, 1.8);
    this.glacisMat = new THREE.MeshStandardMaterial({
      color: armorColor,
      metalness: 0.65,
      roughness: 0.45
    });
    this.glacisMesh = new THREE.Mesh(glacisGeo, this.glacisMat);
    this.glacisMesh.position.set(0, -0.75, -1.3);
    this.glacisMesh.rotation.x = 0.28; // Forward sloping armor
    this.cockpitGroup.add(this.glacisMesh);

    // Left and Right Track Guard Fenders
    const fenderGeo = new THREE.BoxGeometry(0.42, 0.35, 2.2);
    this.fenderMat = new THREE.MeshStandardMaterial({
      color: 0x1f2922,
      metalness: 0.8,
      roughness: 0.6
    });

    this.leftFender = new THREE.Mesh(fenderGeo, this.fenderMat);
    this.leftFender.position.set(-1.3, -0.65, -1.4);
    this.cockpitGroup.add(this.leftFender);

    this.rightFender = new THREE.Mesh(fenderGeo, this.fenderMat);
    this.rightFender.position.set(1.3, -0.65, -1.4);
    this.cockpitGroup.add(this.rightFender);

    // Central 90mm Cannon Barrel Assembly
    this.cannonGroup = new THREE.Group();
    this.cannonGroup.position.set(0, -0.4, -0.9);

    // Breech Mantlet Collar
    const mantletGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.6, 12);
    mantletGeo.rotateX(Math.PI / 2);
    const mantletMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.85,
      roughness: 0.3
    });
    const mantlet = new THREE.Mesh(mantletGeo, mantletMat);
    this.cannonGroup.add(mantlet);

    // Main Tube Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.8, 16);
    barrelGeo.rotateX(Math.PI / 2);
    this.barrelMat = new THREE.MeshStandardMaterial({
      color: armorColor.clone().multiplyScalar(0.75),
      metalness: 0.8,
      roughness: 0.35
    });
    this.barrelMesh = new THREE.Mesh(barrelGeo, this.barrelMat);
    this.barrelMesh.position.set(0, 0, -1.4);
    this.cannonGroup.add(this.barrelMesh);

    // Muzzle Brake (Tip)
    const muzzleGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.35, 12);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzleMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.9,
      roughness: 0.25
    });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, 0, -2.85);
    this.cannonGroup.add(muzzle);

    // Muzzle flash point light
    this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 18);
    this.muzzleLight.position.set(0, 0, -3.1);
    this.cannonGroup.add(this.muzzleLight);

    this.cockpitGroup.add(this.cannonGroup);

    // Faction Decal Crest on Glacis
    this._createFactionDecal(preset);
  }

  _createFactionDecal(preset) {
    if (this.decalMesh) {
      this.cockpitGroup.remove(this.decalMesh);
      if (this.decalMesh.material?.map) this.decalMesh.material.map.dispose();
      if (this.decalMesh.material) this.decalMesh.material.dispose();
      if (this.decalMesh.geometry) this.decalMesh.geometry.dispose();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = preset.accentColor || '#ffffff';
    ctx.font = 'bold 80px "Cinzel", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbol = preset.insignia ? preset.insignia.split(' ')[0] : '★';
    ctx.fillText(symbol, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const decalGeo = new THREE.PlaneGeometry(0.45, 0.45);
    const decalMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    this.decalMesh = new THREE.Mesh(decalGeo, decalMat);
    this.decalMesh.position.set(0, -0.52, -1.1);
    this.decalMesh.rotation.x = -0.25;
    this.cockpitGroup.add(this.decalMesh);
  }

  // ============================================================================
  // COORDINATE SYSTEM & FACING
  // ============================================================================

  gridToWorld(row, col) {
    return new THREE.Vector3(
      (col + 0.5) * this.options.cellSize,
      0,
      (row + 0.5) * this.options.cellSize
    );
  }

  worldToGrid(position) {
    return {
      row: Math.floor(position.z / this.options.cellSize),
      col: Math.floor(position.x / this.options.cellSize)
    };
  }

  _facingToAngle(facing) {
    switch (facing) {
      case CARDINAL_DIRECTIONS.NORTH: return 0;
      case CARDINAL_DIRECTIONS.EAST:  return -Math.PI / 2;
      case CARDINAL_DIRECTIONS.SOUTH: return Math.PI;
      case CARDINAL_DIRECTIONS.WEST:  return Math.PI / 2;
      default: return 0;
    }
  }

  _getCannonMuzzleWorldPos() {
    const tank = this.game.tank;
    const worldPos = this.gridToWorld(tank.row, tank.col);
    // Tip of cannon barrel is 3.4 units in front of tank at eye level
    const x = worldPos.x - Math.sin(this.currentHeading) * 3.4;
    const z = worldPos.z - Math.cos(this.currentHeading) * 3.4;
    return new THREE.Vector3(x, 1.7, z);
  }

  // ============================================================================
  // SYNCHRONIZATION WITH GAME LOGIC
  // ============================================================================

  setGame(game) {
    this.game = game;
    if (this.beaconManager) {
      this.beaconManager.clear();
    }
    if (this.ballistics) {
      this.ballistics.clear();
    }
    if (this.enemyTank) {
      this.enemyTank.destroy();
      this.enemyTank = null;
    }
    this.syncFromGame();
  }

  syncFromGame() {
    if (!this.game || !this.game.tank) return;

    const tank = this.game.tank;
    this.targetHeading = this._facingToAngle(tank.facing);

    // Update active cell in grid shader
    if (this.gridMaterial && this.gridMaterial.uniforms) {
      this.gridMaterial.uniforms.uActiveCell.value.set(tank.col + 0.5, tank.row + 0.5);
    }

    // Update preset colors if changed
    const preset = TANK_PRESETS[tank.presetId] || TANK_PRESETS.US;
    if (this.glacisMat) {
      this.glacisMat.color.set(preset.primaryColor || 0x3d5236);
      this.barrelMat.color.set(new THREE.Color(preset.primaryColor || 0x3d5236).multiplyScalar(0.75));
      this._createFactionDecal(preset);
    }

    // Sync all flags, craters, clues, and extraction beam
    this.beaconManager.syncGrid(this.game);

    // Sync Opponent Tank in PvP Mode
    if (this.game.mode === 'pvp' && this.game.opponentTank) {
      if (!this.enemyTank) {
        this.enemyTank = new EnemyTankMesh(this.scene, this, this.game.opponentTank);
      } else {
        this.enemyTank.sync(this.game.opponentTank);
      }
    } else if (this.enemyTank) {
      this.enemyTank.destroy();
      this.enemyTank = null;
    }

    this.requestRender();
  }

  // ============================================================================
  // CAMERA & TACTICAL VISION MODES
  // ============================================================================

  setCameraMode(mode) {
    this.cameraMode = mode; // 'cockpit' | 'orbit'
    if (this.cameraMode === 'orbit') {
      this.controls.enabled = true;
      this.cockpitGroup.visible = false;
      const target = this.gridToWorld(this.game?.tank?.row ?? 6, this.game?.tank?.col ?? 6);
      this.controls.target.copy(target);
      this.camera.position.set(target.x, 32, target.z + 42);
      this.camera.lookAt(target);
      this.controls.update();
    } else {
      this.controls.enabled = false;
      this.cockpitGroup.visible = true;
      this.currentHeading = this._facingToAngle(this.game?.tank?.facing ?? 0);
      this.targetHeading = this.currentHeading;
      this._updateCameraTransform(0);
    }
    this.requestRender();
  }

  toggleCameraMode() {
    this.setCameraMode(this.cameraMode === 'cockpit' ? 'orbit' : 'cockpit');
    return this.cameraMode;
  }

  setVisionMode(mode) {
    this.visionMode = mode; // 0: Standard, 1: NVG, 2: Thermal FLIR
    if (this.visionPass) {
      this.visionPass.uniforms['uMode'].value = this.visionMode;
    }
    this.requestRender();
  }

  cycleVisionMode() {
    this.visionMode = ((this.visionMode || 0) + 1) % 3;
    if (this.visionPass) {
      this.visionPass.uniforms['uMode'].value = this.visionMode;
    }
    this.requestRender();
    return this.visionMode;
  }

  // ============================================================================
  // TACTICAL THEATER ENVIRONMENT MODES
  // ============================================================================

  applyEnvironment(presetId) {
    if (!ENVIRONMENT_PRESETS[presetId]) {
      presetId = 'twilight';
    }
    this.environment = presetId;
    if (this.skyManager) {
      this.skyManager.applyPreset(presetId);
    }
    if (this.battlefieldTerrain) {
      this.battlefieldTerrain.applyPreset(presetId);
    }
    if (this.foliageManager) {
      this.foliageManager.applyPreset(presetId);
    }
    if (this.infantryManager) {
      this.infantryManager.applyPreset(presetId);
    }
    if (this.airstrikeManager) {
      this.airstrikeManager.applyPreset(presetId);
    }
    this.requestRender();
    return this.environment;
  }

  cycleEnvironment() {
    const keys = Object.keys(ENVIRONMENT_PRESETS);
    const currentIndex = keys.indexOf(this.environment);
    const nextIndex = (currentIndex + 1) % keys.length;
    const nextPresetId = keys[nextIndex];
    return this.applyEnvironment(nextPresetId);
  }

  getEnvironmentPreset() {
    return ENVIRONMENT_PRESETS[this.environment] || ENVIRONMENT_PRESETS.twilight;
  }

  // ============================================================================
  // MOTION, DYNAMICS & CAMERA TRANSFORM
  // ============================================================================

  _updateCameraTransform(dt) {
    if (!this.game || !this.game.tank) return;

    if (this.cameraMode === 'orbit') {
      this.controls.update();
      return;
    }

    const tank = this.game.tank;
    const targetWorldPos = this.gridToWorld(tank.row, tank.col);

    // Smooth heading angle interpolation
    let angleDiff = this.targetHeading - this.currentHeading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.currentHeading += angleDiff * Math.min(1.0, dt * 10);

    // Drive bobbing oscillation
    if (this.isDriving) {
      this.driveBobTime += dt * 14;
    }
    const bobY = Math.sin(this.driveBobTime) * 0.045;
    const bobRoll = Math.cos(this.driveBobTime * 0.5) * 0.008;

    // Camera Trauma Shake (Trauma^2 displacement)
    let shakeX = 0;
    let shakeY = 0;
    let shakeRot = 0;
    if (this.trauma > 0.001) {
      const shakeMag = this.trauma * this.trauma;
      shakeX = (Math.random() - 0.5) * 0.35 * shakeMag;
      shakeY = (Math.random() - 0.5) * 0.35 * shakeMag;
      shakeRot = (Math.random() - 0.5) * 0.06 * shakeMag;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
    }

    // Eye height inside tank
    const eyeHeight = 2.1 + bobY + shakeY;

    // Set camera position smoothly
    this.camera.position.set(
      targetWorldPos.x + shakeX,
      eyeHeight,
      targetWorldPos.z
    );

    // Heading forward vector
    const lookDistance = 15;
    const lookX = targetWorldPos.x - Math.sin(this.currentHeading) * lookDistance;
    const lookZ = targetWorldPos.z - Math.cos(this.currentHeading) * lookDistance;
    const lookY = eyeHeight - 0.7; // Gentle pitch down to look ahead at grid

    this.camera.lookAt(lookX, lookY, lookZ);
    this.camera.rotation.z += bobRoll + shakeRot;

    // Headlight position & target
    this.headlight.position.copy(this.camera.position);
    this.headlightTarget.position.set(lookX, 0, lookZ);

    // Cannon Recoil Spring Dampener
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dt * 4.5);
      this.cannonGroup.position.z = -0.9 + this.recoilOffset * 0.45;
    }
  }

  // ============================================================================
  // BALLISTICS & WEAPONS FIRE
  // ============================================================================

  launchShellTo(targetRow, targetCol, onImpact) {
    this.triggerMuzzleFire();

    const fromPos = this._getCannonMuzzleWorldPos();
    const toPos = this.gridToWorld(targetRow, targetCol);
    toPos.y = 0.2;

    this.ballistics.launchShell({
      fromPos,
      toPos,
      onImpact: (impactPos) => {
        this.triggerExplosion(targetRow, targetCol);
        if (onImpact) onImpact(impactPos);
      }
    });
  }

  // ============================================================================
  // VISUAL EFFECTS TRIGGERS
  // ============================================================================

  triggerExplosion(row, col) {
    const worldPos = this.gridToWorld(row, col);
    this.trauma = 1.0; // Maximum trauma shake

    // Explosive light flash
    const flashLight = new THREE.PointLight(0xff7711, 5.5, 40);
    flashLight.position.set(worldPos.x, 1.2, worldPos.z);
    this.scene.add(flashLight);

    let lightAge = 0;
    this.flashLights.push({
      update: (dt) => {
        lightAge += dt;
        flashLight.intensity = 5.5 * Math.max(0, 1 - lightAge / 0.38);
        return lightAge < 0.38;
      },
      destroy: () => {
        this.scene.remove(flashLight);
        flashLight.dispose();
      }
    });

    // Spawn Ground Shockwave Ring
    if (this.ballistics) {
      this.ballistics.spawnShockwave(worldPos);
    }

    // 3D Blast Debris & Fireball Particle System (100 particles)
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = worldPos.x + (Math.random() - 0.5) * 0.8;
      positions[i3 + 1] = 0.4 + Math.random() * 0.6;
      positions[i3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.8;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 11.0;
      velocities[i3] = Math.cos(angle) * speed;
      velocities[i3 + 1] = 4.5 + Math.random() * 12.0; // Upward explosion lift
      velocities[i3 + 2] = Math.sin(angle) * speed;

      const heat = Math.random();
      if (heat > 0.65) {
        colors[i3] = 1.0;   // R
        colors[i3 + 1] = 0.8; // G (Yellow flame)
        colors[i3 + 2] = 0.2;
      } else if (heat > 0.35) {
        colors[i3] = 0.95;  // Fire orange
        colors[i3 + 1] = 0.35;
        colors[i3 + 2] = 0.05;
      } else {
        colors[i3] = 0.18;  // Soot / Smoke
        colors[i3 + 1] = 0.18;
        colors[i3 + 2] = 0.18;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const pMesh = new THREE.Points(geometry, pMat);
    this.scene.add(pMesh);

    let systemAge = 0;
    const lifetime = 1.1;

    this.particleSystems.push({
      update: (dt) => {
        systemAge += dt;
        const pos = geometry.attributes.position.array;
        const vel = geometry.attributes.velocity.array;

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          pos[i3] += vel[i3] * dt;
          vel[i3 + 1] -= 18.0 * dt; // Gravity
          pos[i3 + 1] = Math.max(0.08, pos[i3 + 1] + vel[i3 + 1] * dt);
          pos[i3 + 2] += vel[i3 + 2] * dt;
          // Air drag
          vel[i3] *= 0.97;
          vel[i3 + 2] *= 0.97;
        }
        geometry.attributes.position.needsUpdate = true;
        pMat.opacity = 0.95 * Math.max(0, 1.0 - systemAge / lifetime);

        return systemAge < lifetime;
      },
      destroy: () => {
        this.scene.remove(pMesh);
        geometry.dispose();
        pMat.dispose();
      }
    });

    this.requestRender();
  }

  triggerMuzzleFire() {
    this.recoilOffset = 1.0;
    this.trauma = Math.min(1.0, this.trauma + 0.45);

    if (this.muzzleLight) {
      this.muzzleLight.intensity = 5.0;
    }

    let flashTimer = 0;
    this.flashLights.push({
      update: (dt) => {
        flashTimer += dt;
        if (this.muzzleLight) {
          this.muzzleLight.intensity = 5.0 * Math.max(0, 1 - flashTimer / 0.12);
        }
        return flashTimer < 0.12;
      },
      destroy: () => {
        if (this.muzzleLight) this.muzzleLight.intensity = 0;
      }
    });

    this.requestRender();
  }

  triggerScanPulse(row, col, foundMine) {
    const worldPos = this.gridToWorld(row, col);
    this.scanPulse.active = true;
    this.scanPulse.radius = 0.5;
    this.scanPulse.alpha = 1.0;
    this.scanPulse.center.copy(worldPos);
    this.scanPulse.elapsed = 0;

    if (this.gridMaterial && this.gridMaterial.uniforms) {
      this.gridMaterial.uniforms.uScanCenter.value.copy(worldPos);
      this.gridMaterial.uniforms.uScanPulseAlpha.value = 1.0;
      this.gridMaterial.uniforms.uScanRadius.value = 0.5;
    }

    this.requestRender();
  }

  onAdvance() {
    this.isDriving = true;
    setTimeout(() => { this.isDriving = false; }, 320);
    this.syncFromGame();
  }

  onReverse() {
    this.isDriving = true;
    setTimeout(() => { this.isDriving = false; }, 320);
    this.syncFromGame();
  }

  onTurn() {
    this.syncFromGame();
  }

  // ============================================================================
  // RENDER LOOP & LIFECYCLE
  // ============================================================================

  requestRender() {
    this.needsRender = true;
  }

  _startRenderLoop() {
    const tick = () => {
      this.deltaTime = this.clock.getDelta();
      this.elapsedTime = this.clock.getElapsedTime();

      let mustKeepAnimating = false;

      // Update camera transform & dynamics
      this._updateCameraTransform(this.deltaTime);

      // Update Scan Pulse in Grid Shader
      if (this.scanPulse.active) {
        mustKeepAnimating = true;
        this.scanPulse.elapsed += this.deltaTime;
        const progress = this.scanPulse.elapsed / this.scanPulse.duration;
        if (progress >= 1.0) {
          this.scanPulse.active = false;
          if (this.gridMaterial?.uniforms) {
            this.gridMaterial.uniforms.uScanPulseAlpha.value = 0;
            this.gridMaterial.uniforms.uScanRadius.value = 0;
          }
        } else {
          this.scanPulse.radius = progress * (this.options.cellSize * 1.8);
          this.scanPulse.alpha = 1.0 - progress;
          if (this.gridMaterial?.uniforms) {
            this.gridMaterial.uniforms.uScanRadius.value = this.scanPulse.radius;
            this.gridMaterial.uniforms.uScanPulseAlpha.value = this.scanPulse.alpha;
          }
        }
      }

      // Update Grid Shader time
      if (this.gridMaterial?.uniforms) {
        this.gridMaterial.uniforms.uTime.value = this.elapsedTime;
      }

      // Update Atmospheric Sky Dome & Storm Weather
      if (this.skyManager) {
        const playerPos = this.game?.tank ? this.gridToWorld(this.game.tank.row, this.game.tank.col) : null;
        this.skyManager.update(this.elapsedTime, this.deltaTime, playerPos);
        if (this.skyManager.preset?.hasRain) {
          mustKeepAnimating = true;
        }
      }

      // Update Cell Beacons (pulsing scanned rings & rotating extraction beam)
      if (this.beaconManager) {
        this.beaconManager.update(this.elapsedTime, this.deltaTime);
        mustKeepAnimating = true;
      }

      // Update Foliage & Trees (Wind Sway)
      if (this.foliageManager) {
        this.foliageManager.update(this.elapsedTime, this.deltaTime);
      }

      // Update Infantry Skirmish Squads (Friendly & Enemy Gunfire, Grenades, Ricochets)
      if (this.infantryManager) {
        const playerPos = this.game?.tank ? this.gridToWorld(this.game.tank.row, this.game.tank.col) : null;
        this.infantryManager.update(this.elapsedTime, this.deltaTime, playerPos);
        mustKeepAnimating = true;
      }

      // Update Distant Airstrike Bomber & Distant Explosions
      if (this.airstrikeManager) {
        this.airstrikeManager.update(this.elapsedTime, this.deltaTime);
        mustKeepAnimating = true;
      }

      // Update 3D Projectile Ballistics & Tracers
      if (this.ballistics) {
        const hasActiveShells = this.ballistics.update(this.deltaTime);
        if (hasActiveShells) mustKeepAnimating = true;
      }

      // Update Opponent Tank (aiming & damage fire)
      if (this.enemyTank && this.game?.tank) {
        const playerPos = this.gridToWorld(this.game.tank.row, this.game.tank.col);
        this.enemyTank.update(this.elapsedTime, this.deltaTime, playerPos);
        mustKeepAnimating = true;
      }

      // Update Active Flash Lights
      for (let i = this.flashLights.length - 1; i >= 0; i--) {
        mustKeepAnimating = true;
        const fl = this.flashLights[i];
        if (!fl.update(this.deltaTime)) {
          fl.destroy();
          this.flashLights.splice(i, 1);
        }
      }

      // Update Active Particle Systems
      for (let i = this.particleSystems.length - 1; i >= 0; i--) {
        mustKeepAnimating = true;
        const ps = this.particleSystems[i];
        if (!ps.update(this.deltaTime)) {
          ps.destroy();
          this.particleSystems.splice(i, 1);
        }
      }

      // If driving or trauma active, keep loop alive
      if (this.isDriving || this.trauma > 0.001 || this.recoilOffset > 0) {
        mustKeepAnimating = true;
      }

      // Execute Frame (Post-processing or direct render)
      if (this.needsRender || mustKeepAnimating || this.cameraMode === 'orbit') {
        if (this.composer && this.postProcessingAvailable) {
          if (this.visionPass) {
            this.visionPass.uniforms['uTime'].value = this.elapsedTime;
            this.visionPass.uniforms['uMode'].value = this.visionMode || 0;
          }
          this.composer.render();
        } else {
          this.renderer.render(this.scene, this.camera);
        }
        this.needsRender = false;
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 540;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    if (this.composer) {
      this.composer.setSize(width, height);
      if (this.bloomPass) {
        this.bloomPass.resolution.set(width, height);
      }
      if (this.visionPass) {
        this.visionPass.uniforms['uResolution'].value = [width, height];
      }
    }

    this.requestRender();
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.skyManager) {
      this.skyManager.destroy();
      this.skyManager = null;
    }

    if (this.battlefieldTerrain) {
      this.battlefieldTerrain.destroy();
      this.battlefieldTerrain = null;
    }

    if (this.foliageManager) {
      this.foliageManager.destroy();
      this.foliageManager = null;
    }

    if (this.infantryManager) {
      this.infantryManager.destroy();
      this.infantryManager = null;
    }

    if (this.airstrikeManager) {
      this.airstrikeManager.destroy();
      this.airstrikeManager = null;
    }

    if (this.beaconManager) {
      this.beaconManager.clear();
    }

    if (this.ballistics) {
      this.ballistics.clear();
    }

    if (this.enemyTank) {
      this.enemyTank.destroy();
      this.enemyTank = null;
    }

    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
