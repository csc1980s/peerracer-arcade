/**
 * Ocean Scene Coordinator - 3D Naval Warfare Viewport
 *
 * Manages Three.js scene for Admiral's Gambit ocean surface
 * Renders ships, water, and combat effects
 */

import * as THREE from 'three';
import { createOceanWaterMaterial } from './OceanWaterShader.js';
import { NavalVesselMesh } from './NavalVesselMesh.js';

export class OceanSceneCoordinator {
  constructor(containerEl, game, options = {}) {
    this.container = containerEl;
    this.game = game;
    this.options = {
      gridSize: 10,
      cellSize: 8.0,
      enableWaves: true,
      timeOfDay: 'twilight',
      ...options
    };

    this.clock = new THREE.Clock();
    this.shipMeshes = new Map(); // shipId => NavalVesselMesh
    this.splashEffects = [];
    this.explosionEffects = [];

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initOcean();
    this._startRenderLoop();

    // Resize handler
    this._resizeHandler = () => this.onResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 400;
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x5ba3d0); // Sky blue

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x8fb8d4, 0.008);
  }

  _initCamera() {
    const aspect = (this.container.clientWidth || 600) / (this.container.clientHeight || 400);
    this.camera = new THREE.PerspectiveCamera(50, aspect, 1, 500);

    // Elevated isometric-ish view of the battlefield
    const gridCenterX = (this.options.gridSize * this.options.cellSize) / 2;
    const gridCenterZ = (this.options.gridSize * this.options.cellSize) / 2;

    this.camera.position.set(
      gridCenterX + 30,
      45,
      gridCenterZ + 50
    );

    this.camera.lookAt(gridCenterX, 0, gridCenterZ);
  }

  _initLights() {
    // Hemisphere light (sky + ground ambient)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d5a7b, 0.6);
    this.scene.add(hemiLight);

    // Directional sun light
    this.sunLight = new THREE.DirectionalLight(0xfff8e1, 1.2);
    this.sunLight.position.set(50, 80, 40);
    this.sunLight.castShadow = true;

    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 200;
    const d = 60;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;

    this.scene.add(this.sunLight);
  }

  _initOcean() {
    const gridWorldSize = this.options.gridSize * this.options.cellSize;

    // Ocean surface
    const oceanGeo = new THREE.PlaneGeometry(gridWorldSize * 2, gridWorldSize * 2, 100, 100);
    oceanGeo.rotateX(-Math.PI / 2);

    if (this.options.enableWaves) {
      this.oceanMaterial = createOceanWaterMaterial({
        timeOfDay: this.options.timeOfDay,
        waveHeight: 0.6,
        waveSpeed: 0.4
      });
    } else {
      // Fallback flat ocean
      this.oceanMaterial = new THREE.MeshStandardMaterial({
        color: 0x0d3d5c,
        roughness: 0.6,
        metalness: 0.1
      });
    }

    this.oceanMesh = new THREE.Mesh(oceanGeo, this.oceanMaterial);
    this.oceanMesh.position.set(gridWorldSize / 2, 0, gridWorldSize / 2);
    this.oceanMesh.receiveShadow = true;
    this.scene.add(this.oceanMesh);

    // Grid helper (subtle)
    const gridHelper = new THREE.GridHelper(
      gridWorldSize,
      this.options.gridSize,
      0x38bdf8,
      0x1e3a5f
    );
    gridHelper.position.set(gridWorldSize / 2, 0.1, gridWorldSize / 2);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  // ============================================================================
  // GAME SYNC
  // ============================================================================

  syncFromGame() {
    if (!this.game) return;

    // Update player ships (visible)
    this._syncFleet(this.game.playerGrid, 'player');

    // Update AI ships (only show sunk ones or during special reveals)
    this._syncFleet(this.game.aiGrid, 'enemy', true);
  }

  _syncFleet(grid, faction, hideUnsunk = false) {
    if (!grid || !grid.ships) return;

    for (const ship of grid.ships) {
      const shipId = `${faction}_${ship.type}_${ship.id || 0}`;

      // Create mesh if doesn't exist
      if (!this.shipMeshes.has(shipId)) {
        const mesh = new NavalVesselMesh(ship.type, faction);
        this.shipMeshes.set(shipId, mesh);
        this.scene.add(mesh);
      }

      const mesh = this.shipMeshes.get(shipId);

      // Update position if ship has placement
      if (ship.gridPosition) {
        const { row, col } = ship.gridPosition;
        const worldPos = this.gridToWorld(row, col);
        mesh.position.x = worldPos.x;
        mesh.position.z = worldPos.z;

        // Set heading based on orientation
        if (ship.gridPosition.orientation === 'VERTICAL') {
          mesh.rotation.y = Math.PI / 2;
        } else {
          mesh.rotation.y = 0;
        }
      }

      // Hide enemy ships unless sunk
      if (hideUnsunk && ship.status !== 'sunk') {
        mesh.visible = false;
      } else {
        mesh.visible = true;
      }

      // Trigger destruction if newly sunk
      if (ship.status === 'sunk' && !mesh.userData.sinking) {
        mesh.userData.sinking = true;
        mesh.triggerDestruction();
      }
    }
  }

  gridToWorld(row, col) {
    const x = col * this.options.cellSize + this.options.cellSize / 2;
    const z = row * this.options.cellSize + this.options.cellSize / 2;
    return { x, y: 0, z };
  }

  // ============================================================================
  // COMBAT EFFECTS
  // ============================================================================

  showSplash(row, col) {
    const pos = this.gridToWorld(row, col);

    // Water splash particle
    const splashGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const splash = new THREE.Mesh(splashGeo, splashMat);
    splash.position.set(pos.x, 1, pos.z);
    splash.userData.startTime = this.clock.elapsedTime;
    splash.userData.duration = 1.0;

    this.scene.add(splash);
    this.splashEffects.push(splash);
  }

  showExplosion(row, col) {
    const pos = this.gridToWorld(row, col);

    // Explosion flash
    const explosionGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const explosionMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 1.0
    });
    const explosion = new THREE.Mesh(explosionGeo, explosionMat);
    explosion.position.set(pos.x, 2, pos.z);
    explosion.userData.startTime = this.clock.elapsedTime;
    explosion.userData.duration = 0.8;

    this.scene.add(explosion);
    this.explosionEffects.push(explosion);

    // Point light flash
    const flash = new THREE.PointLight(0xff6600, 10, 20);
    flash.position.copy(explosion.position);
    explosion.add(flash);
  }

  // ============================================================================
  // RENDER LOOP
  // ============================================================================

  _startRenderLoop() {
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);

      const deltaTime = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();

      // Update ocean waves
      if (this.oceanMaterial.uniforms && this.oceanMaterial.uniforms.uTime) {
        this.oceanMaterial.uniforms.uTime.value = elapsedTime;
      }

      // Update ship bob animation
      for (const mesh of this.shipMeshes.values()) {
        if (mesh.visible) {
          mesh.update(elapsedTime, deltaTime);
        }
      }

      // Update splash effects
      this.splashEffects = this.splashEffects.filter(splash => {
        const age = elapsedTime - splash.userData.startTime;
        if (age > splash.userData.duration) {
          this.scene.remove(splash);
          splash.geometry.dispose();
          splash.material.dispose();
          return false;
        }

        // Animate splash
        const progress = age / splash.userData.duration;
        splash.scale.setScalar(1 + progress * 2);
        splash.material.opacity = 1 - progress;
        splash.position.y = 1 + progress * 3;

        return true;
      });

      // Update explosion effects
      this.explosionEffects = this.explosionEffects.filter(exp => {
        const age = elapsedTime - exp.userData.startTime;
        if (age > exp.userData.duration) {
          this.scene.remove(exp);
          exp.geometry.dispose();
          exp.material.dispose();
          return false;
        }

        // Animate explosion
        const progress = age / exp.userData.duration;
        exp.scale.setScalar(1 + progress * 3);
        exp.material.opacity = 1 - Math.pow(progress, 0.5);

        return true;
      });

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  onResize() {
    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 400;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    window.removeEventListener('resize', this._resizeHandler);

    // Dispose ship meshes
    for (const mesh of this.shipMeshes.values()) {
      mesh.dispose();
      this.scene.remove(mesh);
    }
    this.shipMeshes.clear();

    // Dispose ocean
    if (this.oceanMesh) {
      this.oceanMesh.geometry.dispose();
      this.oceanMesh.material.dispose();
      this.scene.remove(this.oceanMesh);
    }

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
