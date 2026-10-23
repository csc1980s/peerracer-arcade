import * as THREE from 'three';
import { CELL_STATE, CRATER_TYPE } from '../core/tank_minefield/rules_config.js';

/**
 * 3D Cell Beacon & Decal Manager
 * Spawns and manages 3D hazard flags, blast craters, scanned mine beacons,
 * and the extraction zone light pillar.
 * Based on TANK_VISUAL_OVERHAUL_ARCHITECTURE.md (Phase 2.3)
 */
export class CellBeaconManager {
  constructor(scene, coordinator) {
    this.scene = scene;
    this.coordinator = coordinator;

    // Object pools and active instances mapped by "row,col"
    this.beacons = new Map();
    this.craters = new Map();
    this.numberLabels = new Map();
    this.extractionBeacon = null;

    // Shared geometries and materials for draw call optimization
    this._initSharedAssets();
  }

  _initSharedAssets() {
    // 1. Flagpole Assets
    this.poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.2, 8);
    this.poleMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25
    });

    this.flagBaseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.25, 12);
    this.flagBaseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.4
    });

    // Triangular Hazard Pennant Geometry
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(1.8, 0.6);
    flagShape.lineTo(0, 1.2);
    flagShape.closePath();
    this.flagPennantGeo = new THREE.ShapeGeometry(flagShape);
    this.flagPennantMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Safety red
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // 2. Scanned Hazard Beacon Assets (Hologram Ring + Spire)
    this.hazardRingGeo = new THREE.TorusGeometry(1.6, 0.08, 8, 24);
    this.hazardRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber hazard glow
      transparent: true,
      opacity: 0.85
    });

    this.hazardCoreGeo = new THREE.OctahedronGeometry(0.5);
    this.hazardCoreMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      wireframe: true
    });

    // 3. Mine Crater Assets
    this.craterGeo = new THREE.RingGeometry(0.2, 2.4, 16);
    this.craterGeo.rotateX(-Math.PI / 2); // Flat on ground
    this.mineCraterMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.95,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    this.shellCraterMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.9,
      metalness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    // 4. Extraction Zone Landing Pad & Light Pillar
    this.padGeo = new THREE.RingGeometry(0.5, 4.2, 24);
    this.padGeo.rotateX(-Math.PI / 2);
    this.padMat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Emerald green
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    this.pillarGeo = new THREE.CylinderGeometry(0.9, 2.2, 45, 16, 1, true);
    this.pillarMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  /**
   * Synchronize all visual 3D entities from authoritative game grid state
   */
  syncGrid(game) {
    if (!game || !game.grid) return;

    const rows = game.grid.rows;
    const cols = game.grid.cols;
    if (!rows || !cols) return;

    const currentFlagKeys = new Set();
    const currentCraterKeys = new Set();
    const currentScannedKeys = new Set();
    const currentNumberKeys = new Set();

    // 1. Process Grid Cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = game.grid.getCell ? game.grid.getCell(r, c) : game.grid.cells?.[r]?.[c];
        if (!cell) continue;

        const key = `${r},${c}`;
        const worldPos = this.coordinator.gridToWorld(r, c);

        // A. Extraction Zone Pillar
        if (cell.isExtraction) {
          if (!this.extractionBeacon) {
            this._spawnExtractionBeacon(worldPos);
          } else {
            this.extractionBeacon.position.copy(worldPos);
          }
        }

        // B. Flagged Hazard Markers
        const isFlagged = cell.isFlagged ? cell.isFlagged() : cell.state === CELL_STATE.FLAGGED;
        if (isFlagged) {
          currentFlagKeys.add(key);
          if (!this.beacons.has(key)) {
            const flagGroup = this._createFlagMesh(worldPos);
            this.scene.add(flagGroup);
            this.beacons.set(key, flagGroup);
          }
        }

        // C. Scanned Confirmed Mines (Holographic Beacon)
        if (cell.isScannedMine) {
          const scanKey = `scan_${key}`;
          currentScannedKeys.add(scanKey);
          if (!this.beacons.has(scanKey)) {
            const scanBeacon = this._createScannedMineBeacon(worldPos);
            this.scene.add(scanBeacon);
            this.beacons.set(scanKey, scanBeacon);
          }
        }

        // D. Explored Numbers (Clues)
        const isRevealed = cell.isRevealed ? cell.isRevealed() : cell.state === CELL_STATE.REVEALED;
        if (isRevealed && cell.adjacentMines > 0) {
          currentNumberKeys.add(key);
          if (!this.numberLabels.has(key)) {
            const label = this._createNumberSprite(cell.adjacentMines, worldPos);
            this.scene.add(label);
            this.numberLabels.set(key, label);
          }
        }

        // E. Blast Craters (Mine detonations & Shell impacts)
        if (cell.crater && cell.crater !== CRATER_TYPE.NONE) {
          const craterKey = `crater_${key}`;
          currentCraterKeys.add(craterKey);
          if (!this.craters.has(craterKey)) {
            const isShell = cell.crater === CRATER_TYPE.SHELL_IMPACT;
            const mat = isShell ? this.shellCraterMat : this.mineCraterMat;
            const mesh = new THREE.Mesh(this.craterGeo, mat);
            mesh.position.set(worldPos.x, 0.04, worldPos.z);
            mesh.rotation.y = (r * 13 + c * 7) % Math.PI;
            this.scene.add(mesh);
            this.craters.set(craterKey, mesh);
          }
        }
      }
    }

    // 2. Remove stale flags & scanned beacons
    for (const [key, mesh] of this.beacons.entries()) {
      if (key.startsWith('scan_')) {
        if (!currentScannedKeys.has(key)) {
          this.scene.remove(mesh);
          this.beacons.delete(key);
        }
      } else {
        if (!currentFlagKeys.has(key)) {
          this.scene.remove(mesh);
          this.beacons.delete(key);
        }
      }
    }

    // 3. Remove stale number labels
    for (const [key, sprite] of this.numberLabels.entries()) {
      if (!currentNumberKeys.has(key)) {
        this.scene.remove(sprite);
        if (sprite.material?.map) sprite.material.map.dispose();
        if (sprite.material) sprite.material.dispose();
        this.numberLabels.delete(key);
      }
    }

    // 4. Remove stale craters
    for (const [key, mesh] of this.craters.entries()) {
      if (!currentCraterKeys.has(key)) {
        this.scene.remove(mesh);
        this.craters.delete(key);
      }
    }
  }

  _createFlagMesh(worldPos) {
    const group = new THREE.Group();
    group.position.set(worldPos.x, 0, worldPos.z);

    // Ground mount base
    const base = new THREE.Mesh(this.flagBaseGeo, this.flagBaseMat);
    base.position.y = 0.12;
    group.add(base);

    // Mast
    const pole = new THREE.Mesh(this.poleGeo, this.poleMat);
    pole.position.y = 1.6;
    group.add(pole);

    // Triangular Pennant
    const pennant = new THREE.Mesh(this.flagPennantGeo, this.flagPennantMat);
    pennant.position.set(0, 1.8, 0);
    pennant.rotation.y = Math.PI / 4;
    group.add(pennant);

    return group;
  }

  _createScannedMineBeacon(worldPos) {
    const group = new THREE.Group();
    group.position.set(worldPos.x, 0.8, worldPos.z);

    const ring = new THREE.Mesh(this.hazardRingGeo, this.hazardRingMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const core = new THREE.Mesh(this.hazardCoreGeo, this.hazardCoreMat);
    core.position.y = 0.6;
    group.add(core);

    group.userData = { isPulse: true, ring, core };
    return group;
  }

  _spawnExtractionBeacon(worldPos) {
    const group = new THREE.Group();
    group.position.set(worldPos.x, 0, worldPos.z);

    // Ground Landing Pad
    const pad = new THREE.Mesh(this.padGeo, this.padMat);
    pad.position.y = 0.05;
    group.add(pad);

    // Light Beam
    const pillar = new THREE.Mesh(this.pillarGeo, this.pillarMat);
    pillar.position.y = 22.5;
    group.add(pillar);

    this.scene.add(group);
    this.extractionBeacon = group;
  }

  _createNumberSprite(count, worldPos) {
    // Generate high-DPI text canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const colors = {
      1: '#38bdf8', // Cyan
      2: '#34d399', // Emerald
      3: '#f97316', // Orange
      4: '#ef4444', // Red
      5: '#a855f7', // Purple
      6: '#ec4899', // Pink
      7: '#facc15', // Gold
      8: '#ffffff'
    };

    ctx.fillStyle = colors[count] || '#38bdf8';
    ctx.font = 'bold 72px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(String(count), 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(worldPos.x, 0.6, worldPos.z);
    sprite.scale.set(3.2, 3.2, 1);
    return sprite;
  }

  update(time, deltaTime) {
    // Animate glowing hazard beacons
    for (const [key, obj] of this.beacons.entries()) {
      if (obj.userData?.isPulse) {
        obj.userData.core.rotation.y += deltaTime * 2.5;
        obj.userData.core.rotation.x += deltaTime * 1.5;
        const scale = 1.0 + Math.sin(time * 4) * 0.12;
        obj.userData.ring.scale.set(scale, scale, scale);
      }
    }

    // Slowly rotate extraction light pillar
    if (this.extractionBeacon) {
      this.extractionBeacon.children[1].rotation.y += deltaTime * 0.4;
    }
  }

  clear() {
    for (const mesh of this.beacons.values()) this.scene.remove(mesh);
    for (const mesh of this.craters.values()) this.scene.remove(mesh);
    for (const sprite of this.numberLabels.values()) this.scene.remove(sprite);
    if (this.extractionBeacon) this.scene.remove(this.extractionBeacon);

    this.beacons.clear();
    this.craters.clear();
    this.numberLabels.clear();
    this.extractionBeacon = null;
  }
}
