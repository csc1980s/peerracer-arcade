/**
 * Battlefield Foliage Manager
 *
 * Responsibilities:
 * - Instanced 3D Trees outside the playable grid on rolling perimeter hills.
 * - Instanced tactical vegetation (grass tufts, scrub bushes, field stones) on the grid corners.
 * - Adapts foliage colors and snow/frost styling to active environmental presets.
 * - Gentle wind sway dynamics in real-time update loop.
 */

import * as THREE from 'three';

export class BattlefieldFoliageManager {
  constructor(scene, coordinator) {
    this.scene = scene;
    this.coordinator = coordinator;
    this.terrain = coordinator.terrain;

    const rows = coordinator.game?.grid?.rows || 12;
    const cols = coordinator.game?.grid?.cols || 12;
    this.cellSize = coordinator.options.cellSize || 10.0;
    this.gridWidth = cols * this.cellSize;
    this.gridHeight = rows * this.cellSize;
    this.gridCenterX = this.gridWidth / 2;
    this.gridCenterZ = this.gridHeight / 2;

    this.group = new THREE.Group();
    this.group.name = 'BattlefieldFoliageGroup';
    this.scene.add(this.group);

    this.trees = [];
    this.windTime = 0;

    this._initOuterTrees();
    this._initGridVegetation();
  }

  _getHeight(x, z) {
    if (this.coordinator.battlefieldTerrain) {
      return this.coordinator.battlefieldTerrain.getHeightAt(x, z);
    }
    return 0;
  }

  // ============================================================================
  // TREES OUTSIDE THE GRID
  // ============================================================================

  _initOuterTrees() {
    const treeCount = 110;

    // Conifer Pine Tree Geometry: Trunk + 3 Stacked Cones
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.45, 2.8, 6);
    trunkGeo.translate(0, 1.4, 0);

    const foliage1Geo = new THREE.ConeGeometry(2.4, 3.2, 7);
    foliage1Geo.translate(0, 3.4, 0);

    const foliage2Geo = new THREE.ConeGeometry(1.8, 2.6, 7);
    foliage2Geo.translate(0, 4.8, 0);

    const foliage3Geo = new THREE.ConeGeometry(1.2, 2.0, 7);
    foliage3Geo.translate(0, 6.0, 0);

    this.trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2714,
      roughness: 0.95,
      metalness: 0.05
    });

    this.foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f3822, // Deep conifer green
      roughness: 0.85,
      metalness: 0.08,
      flatShading: true
    });

    this.trunkInstanced = new THREE.InstancedMesh(trunkGeo, this.trunkMaterial, treeCount);
    this.foliage1Instanced = new THREE.InstancedMesh(foliage1Geo, this.foliageMaterial, treeCount);
    this.foliage2Instanced = new THREE.InstancedMesh(foliage2Geo, this.foliageMaterial, treeCount);
    this.foliage3Instanced = new THREE.InstancedMesh(foliage3Geo, this.foliageMaterial, treeCount);

    this.trunkInstanced.castShadow = true;
    this.trunkInstanced.receiveShadow = true;
    this.foliage1Instanced.castShadow = true;
    this.foliage1Instanced.receiveShadow = true;
    this.foliage2Instanced.castShadow = true;
    this.foliage2Instanced.receiveShadow = true;
    this.foliage3Instanced.castShadow = true;
    this.foliage3Instanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const minRadius = Math.max(this.gridWidth, this.gridHeight) * 0.62 + 8.0;
    const maxRadius = minRadius + 110.0;

    // Deterministic pseudo-random placement
    let seed = 42891;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    let placed = 0;
    for (let i = 0; i < treeCount; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = minRadius + Math.pow(rand(), 0.8) * (maxRadius - minRadius);

      const x = this.gridCenterX + Math.cos(angle) * dist;
      const z = this.gridCenterZ + Math.sin(angle) * dist;
      const y = this._getHeight(x, z);

      const scale = 0.85 + rand() * 0.55;
      const rotY = rand() * Math.PI * 2;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      this.trunkInstanced.setMatrixAt(i, dummy.matrix);
      this.foliage1Instanced.setMatrixAt(i, dummy.matrix);
      this.foliage2Instanced.setMatrixAt(i, dummy.matrix);
      this.foliage3Instanced.setMatrixAt(i, dummy.matrix);

      this.trees.push({
        basePos: new THREE.Vector3(x, y, z),
        rotY,
        scale,
        index: i
      });
      placed++;
    }

    this.trunkInstanced.instanceMatrix.needsUpdate = true;
    this.foliage1Instanced.instanceMatrix.needsUpdate = true;
    this.foliage2Instanced.instanceMatrix.needsUpdate = true;
    this.foliage3Instanced.instanceMatrix.needsUpdate = true;

    this.group.add(this.trunkInstanced);
    this.group.add(this.foliage1Instanced);
    this.group.add(this.foliage2Instanced);
    this.group.add(this.foliage3Instanced);
  }

  // ============================================================================
  // LOW VEGETATION ON THE PLAYABLE GRID (Clumps along Cell Edges)
  // ============================================================================

  _initGridVegetation() {
    // Small tactical scrub bushes & grass clumps placed at cell corners
    const rows = this.coordinator.game?.grid?.rows || 12;
    const cols = this.coordinator.game?.grid?.cols || 12;
    const scrubCount = Math.min(180, rows * cols);

    // Cross-billboard grass / scrub geometry
    const bladeGeo = new THREE.BufferGeometry();
    const width = 0.75;
    const height = 0.55;

    // 2 intersecting quads forming an 'X'
    const verts = new Float32Array([
      -width, 0, 0,
       width, 0, 0,
       width, height, 0,
      -width, height, 0,

      0, 0, -width,
      0, 0,  width,
      0, height,  width,
      0, height, -width
    ]);

    const indices = [
      0, 1, 2,  0, 2, 3,
      4, 5, 6,  4, 6, 7
    ];

    bladeGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    bladeGeo.setIndex(indices);
    bladeGeo.computeVertexNormals();

    this.scrubMaterial = new THREE.MeshStandardMaterial({
      color: 0x486b3b,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.scrubInstanced = new THREE.InstancedMesh(bladeGeo, this.scrubMaterial, scrubCount);
    this.scrubInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (idx >= scrubCount) break;

        // Deterministic check: place in ~40% of cell corners/edges
        const hash = (r * 37 + c * 73) % 100;
        if (hash < 45) {
          // Place near cell corner (never center)
          const offsetCornerX = (hash % 2 === 0 ? 0.15 : 0.85) * this.cellSize;
          const offsetCornerZ = (hash % 4 < 2 ? 0.15 : 0.85) * this.cellSize;

          const x = c * this.cellSize + offsetCornerX;
          const z = r * this.cellSize + offsetCornerZ;
          const y = this._getHeight(x, z);

          const scale = 0.65 + (hash % 10) * 0.06;
          const rotY = (hash / 100) * Math.PI * 2;

          dummy.position.set(x, y, z);
          dummy.rotation.set(0, rotY, 0);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();

          this.scrubInstanced.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
    }

    this.scrubInstanced.instanceMatrix.needsUpdate = true;
    this.group.add(this.scrubInstanced);
  }

  // ============================================================================
  // ENVIRONMENT PRESET ADAPTATION
  // ============================================================================

  applyPreset(presetId) {
    const configs = {
      daylight: {
        foliageColor: 0x2e5e2e, // Lush forest pine green
        trunkColor: 0x4a3219,
        scrubColor: 0x5a8a42
      },
      twilight: {
        foliageColor: 0x142b1e, // Deep tactical spruce
        trunkColor: 0x24180d,
        scrubColor: 0x2d4d38
      },
      desert: {
        foliageColor: 0x8a723e, // Arid desert scrub / dry acacia olive
        trunkColor: 0x6e4e2c,
        scrubColor: 0xa88c4d
      },
      arctic: {
        foliageColor: 0x5b757a, // Frosted icy spruce with pale blue-white needles
        trunkColor: 0x1a242c,
        scrubColor: 0x47636e
      },
      storm: {
        foliageColor: 0x18241b, // Dark wet drenched conifer
        trunkColor: 0x1f1914,
        scrubColor: 0x263b28
      }
    };

    const c = configs[presetId] || configs.twilight;

    if (this.foliageMaterial) {
      this.foliageMaterial.color.setHex(c.foliageColor);
      this.foliageMaterial.needsUpdate = true;
    }
    if (this.trunkMaterial) {
      this.trunkMaterial.color.setHex(c.trunkColor);
      this.trunkMaterial.needsUpdate = true;
    }
    if (this.scrubMaterial) {
      this.scrubMaterial.color.setHex(c.scrubColor);
      this.scrubMaterial.needsUpdate = true;
    }
  }

  // ============================================================================
  // REAL-TIME WIND ANIMATION
  // ============================================================================

  update(time, dt) {
    this.windTime += dt;
    // Micro-sway applied to the entire foliage group
    const wind = Math.sin(this.windTime * 1.8) * 0.003;
    this.group.rotation.z = wind;
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }
}
