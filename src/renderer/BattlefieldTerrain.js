/**
 * Battlefield 3D Undulating Terrain System
 *
 * Provides realistic non-flat terrain with:
 * - Inner Playable Terrain: subtle organic micro-undulations that keep cell centers level for stable tank movement.
 * - Perimeter Earth Berms & Ramparts: defensive raised embankments enclosing the minefield.
 * - Expansive Outer War Zone Terrain: rolling 3D perimeter hills, dunes, ridges, and trenches extending out to 220+ units.
 * - Dynamic PBR Materials: adapts seamlessly to environmental presets (Daylight, Twilight, Desert, Arctic, Storm).
 * - Exact Elevation Query: `getHeightAt(x, z)` for snapping trees, soldiers, and bomb impacts to terrain.
 */

import * as THREE from 'three';

export class BattlefieldTerrain {
  constructor(scene, coordinator) {
    this.scene = scene;
    this.coordinator = coordinator;

    const rows = coordinator.game?.grid?.rows || 12;
    const cols = coordinator.game?.grid?.cols || 12;
    this.cellSize = coordinator.options.cellSize || 10.0;
    this.gridWidth = cols * this.cellSize;
    this.gridHeight = rows * this.cellSize;
    this.gridCenterX = this.gridWidth / 2;
    this.gridCenterZ = this.gridHeight / 2;

    this.group = new THREE.Group();
    this.group.name = 'BattlefieldTerrainGroup';
    this.scene.add(this.group);

    this._initTerrainMesh();
  }

  _elevationNoise(x, z) {
    // Multi-octave natural terrain height function
    const s1 = 0.035;
    const s2 = 0.08;
    const s3 = 0.16;

    const n1 = Math.sin(x * s1 + 0.4) * Math.cos(z * s1 - 0.7) * 4.8;
    const n2 = Math.cos(x * s2 + 1.8) * Math.sin(z * s2 + 2.2) * 2.2;
    const n3 = Math.sin((x + z) * s3) * 0.9;
    return n1 + n2 + n3;
  }

  getHeightAt(x, z) {
    // Determine distance from grid boundary
    const minX = 0;
    const maxX = this.gridWidth;
    const minZ = 0;
    const maxZ = this.gridHeight;

    const insideX = x >= minX && x <= maxX;
    const insideZ = z >= minZ && z <= maxZ;

    if (insideX && insideZ) {
      // Inside playable grid: very gentle micro-elevation (damped near cell centers)
      const cellCol = Math.floor(x / this.cellSize);
      const cellRow = Math.floor(z / this.cellSize);
      const centerX = (cellCol + 0.5) * this.cellSize;
      const centerZ = (cellRow + 0.5) * this.cellSize;
      const distFromCenter = Math.hypot(x - centerX, z - centerZ) / (this.cellSize * 0.5);

      // Damp micro-undulation in cell center so tank stays level
      const damp = Math.min(1.0, Math.max(0.0, distFromCenter - 0.25) * 1.5);
      const micro = (Math.sin(x * 0.45) * Math.cos(z * 0.45) * 0.14 + Math.sin(x * 0.9) * 0.06) * damp;
      return micro;
    }

    // Distance outside the grid perimeter
    const dx = x < minX ? minX - x : (x > maxX ? x - maxX : 0);
    const dz = z < minZ ? minZ - z : (z > maxZ ? z - maxZ : 0);
    const distOutside = Math.hypot(dx, dz);

    if (distOutside < 7.0) {
      // Perimeter berm embankment: raised perimeter ramparts (up to ~1.2 units)
      const bermFactor = Math.sin((distOutside / 7.0) * Math.PI);
      return bermFactor * 1.35 + (Math.sin(x * 0.2) + Math.cos(z * 0.2)) * 0.18;
    }

    // Outer rolling terrain: transitions into rolling hills and ridgelines
    const blend = Math.min(1.0, (distOutside - 7.0) / 25.0);
    const rawElevation = this._elevationNoise(x, z);
    const hillHeight = Math.max(-0.5, rawElevation);
    return 0.3 + hillHeight * blend * 1.4;
  }

  _initTerrainMesh() {
    // Create high-detail outer terrain geometry
    const terrainSize = Math.max(380, Math.max(this.gridWidth, this.gridHeight) * 3.2);
    const segments = 80;
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i) + this.gridCenterX;
      const z = pos.getZ(i) + this.gridCenterZ;
      const y = this.getHeightAt(x, z);

      pos.setX(i, x);
      pos.setY(i, y);
      pos.setZ(i, z);

      // Height-based subtle shading
      const heightShade = Math.min(1.15, Math.max(0.85, 1.0 + y * 0.04));
      colors[i * 3] = heightShade;
      colors[i * 3 + 1] = heightShade;
      colors[i * 3 + 2] = heightShade;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Standard PBR terrain material
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d4f33,
      roughness: 0.92,
      metalness: 0.08,
      vertexColors: true,
      flatShading: false
    });

    this.terrainMesh = new THREE.Mesh(geometry, this.terrainMaterial);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = false;
    this.group.add(this.terrainMesh);

    // Defensive Sandbag Perimeter Berms at key perimeter choke points
    this._createPerimeterBerms();
  }

  _createPerimeterBerms() {
    // Add physical 3D sandbag revetment obstacles along perimeter
    const sandbagMat = new THREE.MeshStandardMaterial({
      color: 0x8c7853,
      roughness: 0.95,
      metalness: 0.05
    });

    const bagGeo = new THREE.BoxGeometry(1.4, 0.45, 0.7);

    // Place sandbag clusters at corners and midpoints outside grid border
    const bermPositions = [
      // South-West Friendly Outpost
      { x: -3.5, z: 8.0, rot: 0.25 },
      { x: -3.0, z: 9.5, rot: 0.35 },
      { x: -2.5, z: 11.0, rot: 0.15 },
      // North-East Enemy Outpost
      { x: this.gridWidth + 3.5, z: this.gridHeight - 8.0, rot: -0.3 },
      { x: this.gridWidth + 3.0, z: this.gridHeight - 9.5, rot: -0.25 },
      { x: this.gridWidth + 2.5, z: this.gridHeight - 11.0, rot: -0.15 },
      // North Edge Enemy Bunker
      { x: this.gridCenterX + 12, z: this.gridHeight + 3.5, rot: 1.57 },
      { x: this.gridCenterX + 13.5, z: this.gridHeight + 3.5, rot: 1.57 },
      // South Edge Friendly Rally Point
      { x: this.gridCenterX - 12, z: -3.5, rot: 1.57 },
      { x: this.gridCenterX - 10.5, z: -3.5, rot: 1.57 }
    ];

    bermPositions.forEach(p => {
      const y = this.getHeightAt(p.x, p.z);
      // Double stacked sandbags
      const bag1 = new THREE.Mesh(bagGeo, sandbagMat);
      bag1.position.set(p.x, y + 0.22, p.z);
      bag1.rotation.y = p.rot;
      bag1.castShadow = true;
      bag1.receiveShadow = true;
      this.group.add(bag1);

      const bag2 = new THREE.Mesh(bagGeo, sandbagMat);
      bag2.position.set(p.x, y + 0.65, p.z);
      bag2.rotation.y = p.rot + 0.08;
      bag2.castShadow = true;
      bag2.receiveShadow = true;
      this.group.add(bag2);
    });
  }

  applyPreset(presetId) {
    if (!this.terrainMaterial) return;

    // Harmonize terrain color, roughness, and tone with environment preset
    const presetPalettes = {
      daylight: {
        color: 0x4d6b38, // Sunlit grass green
        roughness: 0.90,
        metalness: 0.04
      },
      twilight: {
        color: 0x121b24, // Deep twilight slate / dark loam
        roughness: 0.88,
        metalness: 0.12
      },
      desert: {
        color: 0x8a5229, // Warm terracotta & sand dunes
        roughness: 0.96,
        metalness: 0.03
      },
      arctic: {
        color: 0x223547, // Dark frozen permafrost / sub-zero ice rock
        roughness: 0.85,
        metalness: 0.18
      },
      storm: {
        color: 0x141e24, // Wet muddy battlefield asphalt
        roughness: 0.65, // Glossier wet mud reflections
        metalness: 0.22
      }
    };

    const config = presetPalettes[presetId] || presetPalettes.twilight;
    this.terrainMaterial.color.setHex(config.color);
    this.terrainMaterial.roughness = config.roughness;
    this.terrainMaterial.metalness = config.metalness;
    this.terrainMaterial.needsUpdate = true;
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
