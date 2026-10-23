/**
 * Naval Scene Coordinator — 3D Naval Warfare Viewport & Camera Controller
 *
 * Coordinates Three.js rendering for Admiral's Gambit:
 * - Dynamic Gerstner wave ocean with physical displacement & foam crests
 * - First-Person Command Bridge Rig (helm, binnacle, glowing CRT radar, forward turrets)
 * - Dual camera modes: 🎯 Command Bridge (Cockpit) / 🔭 Tactical Orbit (Birds-Eye)
 * - Procedural 3D Warships (CV, BB, CA, DD, SS) with damage states & sinking physics
 * - Cinematic VFX: 16-inch parabolic artillery shells, water geysers, detonations & smoke
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createOceanWaterMaterial } from './OceanWaterShader.js';
import { WarshipMeshFactory } from './WarshipMeshFactory.js';
import { NavalBridgeRig } from './NavalBridgeRig.js';
import { NavalVFXManager } from './NavalVFXManager.js';
import { GRID_SIZE, CELL_STATE } from '../../core/admirals_gambit/rules_config.js';

export class NavalSceneCoordinator {
  constructor(containerEl, game, options = {}) {
    this.container = containerEl;
    this.game = game;
    this.options = {
      gridSize: GRID_SIZE,
      cellSize: 7.5,
      cameraMode: 'bridge', // 'bridge' | 'orbit'
      ...options
    };

    this.clock = new THREE.Clock();
    this.cameraMode = this.options.cameraMode;
    this.shipMeshes = new Map(); // id => mesh
    this.animFrameId = null;
    this.isDisposed = false;

    this.meshFactory = new WarshipMeshFactory();

    this._initRenderer();
    this._initScene();
    this._initCameras();
    this._initLights();
    this._initOcean();
    this._initFlagship();
    this._initBridgeRig();
    this._initVFX();
    this._initControls();

    this.setCameraMode(this.cameraMode);
    this.syncFromGame();
    this._startRenderLoop();

    this._resizeHandler = () => this.onResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();

    // Dramatic Sunset Horizon Sky Dome Mesh
    if (this.meshFactory?.texGen) {
      const skyTex = this.meshFactory.texGen.createSkyboxDome();
      const skyGeo = new THREE.SphereGeometry(750, 32, 16);
      const skyMat = new THREE.MeshBasicMaterial({
        map: skyTex,
        side: THREE.BackSide,
        depthWrite: false
      });
      this.skyDome = new THREE.Mesh(skyGeo, skyMat);
      this.scene.add(this.skyDome);
      this.scene.environment = skyTex; // Enables realistic metallic reflections
    }

    // Atmospheric maritime horizon fog blending ocean into skybox
    this.scene.fog = new THREE.FogExp2(0x2d4157, 0.0022);
  }

  _initCameras() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;
    const aspect = width / height;

    this.mainCamera = new THREE.PerspectiveCamera(46, aspect, 0.5, 1200);
    // Majestic Front 3/4 Port Bow Perspective (Matching naval Yamato reference)
    this.mainCamera.position.set(-36, 18, -48);
    this.mainCamera.lookAt(0, 3, -12);

    this.activeCamera = this.mainCamera;
  }

  _initLights() {
    // Ambient / Hemisphere marine daylight ocean lighting (Sky blue zenith, deep ocean navy horizon)
    this.hemiLight = new THREE.HemisphereLight(0xcfd8e3, 0x0a192f, 1.25);
    this.scene.add(this.hemiLight);

    // Directional High Sun shining crisp daylight across the forecastle deck & gun turrets
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sunLight.position.set(-60, 110, -50);
    this.sunLight.castShadow = true;

    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 350;

    const d = 90;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
  }

  _initOcean() {
    const oceanSize = 360.0;
    const oceanGeo = new THREE.PlaneGeometry(oceanSize, oceanSize, 120, 120);
    oceanGeo.rotateX(-Math.PI / 2);

    this.oceanMaterial = createOceanWaterMaterial({
      textureGenerator: this.meshFactory?.texGen,
      waveHeight: 0.45,  // Realistic heavy ocean swell
      waveSpeed: 0.55
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, this.oceanMaterial);
    this.oceanMesh.position.set(0, -0.8, -35);
    this.oceanMesh.receiveShadow = true;
    this.scene.add(this.oceanMesh);

    // Subtle tactical coordinate grid on ocean surface
    const gridWorldSize = this.options.gridSize * this.options.cellSize;
    const gridHelper = new THREE.GridHelper(
      gridWorldSize,
      this.options.gridSize,
      0x38bdf8,
      0x0f2744
    );
    // Center grid in enemy engagement theater, above wave crests
    gridHelper.position.set(0, -0.35, -60);
    gridHelper.material.opacity = 0.35;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  _initFlagship() {
    this.flagship = this.meshFactory.createWarship('battleship', true);
    // Position 3D Dreadnought Flagship cutting through waves heading towards -Z
    this.flagship.group.position.set(0, -0.6, -10);
    this.scene.add(this.flagship.group);
  }

  _initVFX() {
    this.vfx = new NavalVFXManager(this.scene, this);
  }

  _initControls() {
    this.orbitControls = new OrbitControls(this.mainCamera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't dip below water
    this.orbitControls.minDistance = 12;
    this.orbitControls.maxDistance = 200;
    this.orbitControls.target.set(0, 3, -10);
    this.orbitControls.enabled = true;
  }

  // ============================================================================
  // CAMERA SWITCHING (3 CLEAR 3D WARSHIP PRESETS)
  // ============================================================================

  setCameraMode(mode) {
    this.cameraMode = mode;

    if (mode === 'broadside') {
      // Full Profile Broadside View
      this.mainCamera.position.set(48, 12, -10);
      this.orbitControls.target.set(0, 3, -10);
    } else if (mode === 'turret') {
      // Gun Captain View - looking forward over the 16-inch turrets
      this.mainCamera.position.set(0, 8.5, 0);
      this.orbitControls.target.set(0, 4.5, -60);
    } else {
      // Default: Front 3/4 Majestic Bow View (like Yamato/Iowa naval reference)
      this.cameraMode = 'bow';
      this.mainCamera.position.set(-36, 18, -48);
      this.orbitControls.target.set(0, 3, -12);
    }

    this.orbitControls.update();
    this.onResize();
  }

  toggleCameraMode() {
    const modes = ['bow', 'broadside', 'turret'];
    const currentIdx = modes.indexOf(this.cameraMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    this.setCameraMode(nextMode);
    return this.cameraMode;
  }

  // ============================================================================
  // COORDINATE SYSTEM & TARGETING
  // ============================================================================

  /**
   * Transforms 10x10 grid coordinates into 3D world space
   * @param {number} row (0..9)
   * @param {number} col (0..9)
   * @param {boolean} isEnemy
   */
  gridToWorld(row, col, isEnemy = true) {
    const cellSize = this.options.cellSize;
    const halfGrid = (this.options.gridSize * cellSize) / 2;

    const x = (col * cellSize + cellSize / 2) - halfGrid;
    // Enemy grid is centered at Z = -60 ahead of the player's bridge
    // Player grid is positioned at Z = +20 or alongside
    const centerZ = isEnemy ? -60 : 35;
    const z = (row * cellSize + cellSize / 2) - halfGrid + centerZ;

    return new THREE.Vector3(x, 0, z);
  }

  aimTurretAt(row, col) {
    const targetPos = this.gridToWorld(row, col, true);
    if (this.bridgeRig) {
      this.bridgeRig.aimTurretAt(targetPos.x, targetPos.z);
    }
    if (this.flagship?.group?.aimTurrets) {
      this.flagship.group.aimTurrets(targetPos.x, targetPos.z);
    }
  }

  // ============================================================================
  // FLEET SYNCHRONIZATION
  // ============================================================================

  syncFromGame() {
    if (!this.game) return;

    // 1. Sync radar contacts for Bridge CRT
    const contacts = [];
    if (this.game.aiGrid) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cell = this.game.aiGrid.cells[r][c];
          if (cell.state === CELL_STATE.HIT || cell.state === CELL_STATE.SUNK || cell.state === CELL_STATE.MISS) {
            contacts.push({
              row: r,
              col: c,
              isHit: (cell.state === CELL_STATE.HIT || cell.state === CELL_STATE.SUNK),
              isFriendly: false
            });
          }
        }
      }
    }
    this.bridgeRig?.setRadarContacts(contacts);

    // 2. Sync 3D Friendly Fleet Ships (Naval battle line escort formation)
    if (this.game.playerGrid?.ships) {
      const escortOffsets = {
        carrier: { pos: new THREE.Vector3(56, -0.6, 60), rotY: 0 },       // Aft Starboard
        cruiser: { pos: new THREE.Vector3(-46, -0.6, 15), rotY: 0 },      // Port Flank Escort
        destroyer: { pos: new THREE.Vector3(42, -0.6, -35), rotY: 0 },    // Starboard Bow Screening
        submarine: { pos: new THREE.Vector3(-36, -1.8, -25), rotY: 0 }    // Port Bow Submerged Picket
      };

      for (const ship of this.game.playerGrid.ships.values()) {
        if (ship.id === 'battleship') {
          // Battleship is represented by the lead flagship
          if (ship.sunk && !this.flagshipSunkAnimated) {
            this.flagshipSunkAnimated = true;
            this._animateSinking(this.flagship.group);
          }
          continue;
        }

        const meshKey = `friendly_${ship.id}`;
        let shipEntry = this.shipMeshes.get(meshKey);

        if (!shipEntry) {
          const warshipObj = this.meshFactory.createWarship(ship.id, true);
          this.scene.add(warshipObj.group);
          shipEntry = {
            ship,
            obj: warshipObj,
            isEnemy: false,
            sunkAnimated: false
          };
          this.shipMeshes.set(meshKey, shipEntry);
        }

        // Set realistic escort position & heading toward -Z
        const escort = escortOffsets[ship.id];
        if (escort) {
          shipEntry.obj.group.position.copy(escort.pos);
          shipEntry.obj.group.rotation.y = escort.rotY;
        }

        shipEntry.obj.group.visible = true;

        if (ship.sunk && !shipEntry.sunkAnimated) {
          shipEntry.sunkAnimated = true;
          this._animateSinking(shipEntry.obj.group);
        }
      }
    }

    // 3. Sync 3D Enemy Ship Meshes (Reveal damaged/sunk vessels)
    if (this.game.aiGrid?.ships) {
      // ships is a Map, iterate over values
      for (const ship of this.game.aiGrid.ships.values()) {
        const meshKey = `enemy_${ship.id}`;
        let shipEntry = this.shipMeshes.get(meshKey);

        if (!shipEntry) {
          const warshipObj = this.meshFactory.createWarship(ship.id, false);
          this.scene.add(warshipObj.group);
          shipEntry = {
            ship,
            obj: warshipObj,
            isEnemy: true,
            sunkAnimated: false
          };
          this.shipMeshes.set(meshKey, shipEntry);
        }

        // Position ship at center of its grid footprint
        if (ship.cells && ship.cells.length > 0) {
          const midIdx = Math.floor(ship.cells.length / 2);
          const midCoord = ship.cells[midIdx];
          const worldPos = this.gridToWorld(midCoord.row, midCoord.col, true);

          shipEntry.obj.group.position.copy(worldPos);

          if (ship.orientation === 1) { // VERTICAL
            shipEntry.obj.group.rotation.y = 0; // along Z axis
          } else {
            shipEntry.obj.group.rotation.y = Math.PI / 2; // along X axis
          }
        }

        // Only reveal if sunk or damaged
        const isDamaged = ship.hits > 0;
        const isSunk = !!ship.sunk;
        shipEntry.obj.group.visible = isDamaged || isSunk;

        // Animate sinking
        if (isSunk && !shipEntry.sunkAnimated) {
          shipEntry.sunkAnimated = true;
          this._animateSinking(shipEntry.obj.group);
        }
      }
    }
  }

  _animateSinking(group) {
    let elapsed = 0;
    const duration = 6.0;
    const initialY = group.position.y;
    const listAngle = (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.2);

    const sinkInterval = setInterval(() => {
      elapsed += 0.05;
      const progress = Math.min(1.0, elapsed / duration);

      group.position.y = initialY - progress * 12.0;
      group.rotation.z = listAngle * progress;
      group.rotation.x = -0.25 * progress; // bow rises or dips

      if (progress >= 1.0) {
        clearInterval(sinkInterval);
        group.visible = false;
      }
    }, 50);
  }

  // ============================================================================
  // COMBAT ACTIONS & BALLISTICS
  // ============================================================================

  fireBattery(toRow, toCol, result, onComplete) {
    const targetPos = this.gridToWorld(toRow, toCol, true);

    // Muzzle origin at bridge forward 16-inch turret (world 0, 1.8, -16)
    const muzzlePos = new THREE.Vector3(0, 2.2, -18);

    // Recoil bridge turret
    this.bridgeRig?.recoilTurret();

    // Launch ballistic 16-inch AP artillery shell
    this.vfx.launchShell(muzzlePos, targetPos, () => {
      if (result.isHit) {
        this.vfx.triggerExplosion(targetPos, result.isSunk);
      } else {
        this.vfx.triggerWaterGeyser(targetPos);
      }

      this.syncFromGame();

      if (onComplete) onComplete(result);
    });
  }

  fireEnemySalvo(targetRow, targetCol, result, onComplete) {
    // Enemy fires back from distant waters towards player
    const sourcePos = new THREE.Vector3(
      (Math.random() - 0.5) * 50,
      3.0,
      -95
    );
    const targetPos = this.gridToWorld(targetRow, targetCol, false);

    this.vfx.launchShell(sourcePos, targetPos, () => {
      if (result.isHit) {
        this.vfx.triggerExplosion(targetPos, result.isSunk);
      } else {
        this.vfx.triggerWaterGeyser(targetPos);
      }

      this.syncFromGame();
      if (onComplete) onComplete(result);
    });
  }

  requestRender() {
    // Triggered by VFX on new shell launch
  }

  // ============================================================================
  // RENDER LOOP
  // ============================================================================

  _startRenderLoop() {
    const animate = () => {
      if (this.isDisposed) return;
      this.animFrameId = requestAnimationFrame(animate);

      const deltaTime = Math.min(this.clock.getDelta(), 0.1);
      const elapsedTime = this.clock.getElapsedTime();

      // Update Gerstner wave ocean
      if (this.oceanMaterial.uniforms?.uTime) {
        this.oceanMaterial.uniforms.uTime.value = elapsedTime;
      }

      // Update Bridge interior rig (radar sweep, compass drift, turret)
      if (this.bridgeRig) {
        this.bridgeRig.update(elapsedTime, deltaTime);
      }

      // Update Naval VFX (artillery shells, geysers, explosions, smoke)
      if (this.vfx) {
        this.vfx.update(deltaTime);
      }

      // Animate 3D Dreadnought Flagship roll, pitch, and heave on ocean swells
      if (this.flagship?.group) {
        this.flagship.group.rotation.z = Math.sin(elapsedTime * 1.2) * 0.016; // Roll
        this.flagship.group.rotation.x = Math.cos(elapsedTime * 0.8) * 0.012; // Pitch
        this.flagship.group.position.y = -0.6 + Math.sin(elapsedTime * 1.5) * 0.12; // Heave
      }

      // Always update Orbit controls for smooth interaction
      if (this.orbitControls) {
        this.orbitControls.update();
      }

      this.renderer.render(this.scene, this.activeCamera);
    };

    animate();
  }

  onResize() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;
    const aspect = width / height;

    if (this.bridgeCamera) {
      this.bridgeCamera.aspect = aspect;
      this.bridgeCamera.updateProjectionMatrix();
    }

    if (this.orbitCamera) {
      this.orbitCamera.aspect = aspect;
      this.orbitCamera.updateProjectionMatrix();
    }

    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  destroy() {
    this.isDisposed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    window.removeEventListener('resize', this._resizeHandler);

    this.orbitControls?.dispose();
    this.vfx?.destroy();
    this.bridgeRig?.children?.forEach(c => c.geometry?.dispose());
    this.renderer?.dispose();
  }
}
