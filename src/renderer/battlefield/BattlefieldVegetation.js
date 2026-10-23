import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Vegetation and props around the minefield (replaces the low-poly cone forest).
 *
 *   conifers     tiered, jagged, drooping crowns with darker interiors; snow caps in the arctic
 *   broadleaf    clustered lumpy canopies (temperate theaters)
 *   shrubs       dry scrub (desert) / low bushes
 *   rocks        displaced boulders, partly sunk into the ground
 *   sandbags     revetments at the outposts where the infantry squads stand
 *
 * Everything is instanced (one draw per kind), sways in the wind in the vertex shader,
 * and is placed deterministically in forest clusters outside the field so the play
 * area stays readable. Same applyPreset / update / destroy API as the old manager.
 */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(geo, fn) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const c = fn(p.getX(i), p.getY(i), p.getZ(i));
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function jitter(geo, amount, r, keepBase = false) {
  const p = geo.attributes.position;
  // Displace shared positions consistently (indexed geometry keeps it watertight).
  const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let d = map.get(key);
    if (!d) { d = [(r() - 0.5) * amount, (r() - 0.5) * amount, (r() - 0.5) * amount]; map.set(key, d); }
    if (keepBase && p.getY(i) < 0.01) continue;
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

const prep = (g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; };

function coniferGeometry(seed) {
  const r = rng(seed);
  const parts = [];
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const radius = 2.6 * (1 - t * 0.78);
    const h = 2.6 - t * 0.9;
    const y = 2.0 + i * 1.45;
    const cone = new THREE.ConeGeometry(radius, h, 11, 2, true);
    // Droop the rim and make the silhouette ragged.
    const p = cone.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const yy = p.getY(k);
      if (yy < -h / 2 + 0.01) {
        const a = Math.atan2(p.getZ(k), p.getX(k));
        const s = 1 + 0.22 * Math.sin(a * 5 + i * 1.7) + (r() - 0.5) * 0.25;
        p.setXYZ(k, p.getX(k) * s, yy - 0.35 * r(), p.getZ(k) * s);
      }
    }
    jitter(cone, 0.18, r);
    cone.translate(0, y, 0);
    paint(cone, (x, yy, z) => {
      const rad = Math.hypot(x, z) / Math.max(radius, 0.01);
      const k = 0.45 + 0.55 * Math.min(1, rad) + t * 0.1;
      return [0.07 * k, 0.16 * k, 0.08 * k];
    });
    parts.push(prep(cone));
  }
  return mergeGeometries(parts);
}

function broadleafGeometry(seed) {
  const r = rng(seed);
  const parts = [];
  const blobs = 5;
  for (let i = 0; i < blobs; i++) {
    const s = 1.6 + r() * 1.3;
    const g = new THREE.IcosahedronGeometry(s, 2);
    jitter(g, 0.55, r);
    const a = r() * Math.PI * 2, d = i === 0 ? 0 : 1.4 + r() * 0.8;
    g.scale(1, 0.8, 1);
    g.translate(Math.cos(a) * d, 5.2 + r() * 1.8 + (i === 0 ? 1 : 0), Math.sin(a) * d);
    paint(g, (x, y, z) => { const k = 0.55 + 0.45 * Math.min(1, (y - 4) / 4); return [0.12 * k, 0.2 * k, 0.07 * k]; });
    parts.push(prep(g));
  }
  return mergeGeometries(parts);
}

function trunkGeometry(height, r0, r1) {
  const g = new THREE.CylinderGeometry(r1, r0, height, 7, 3);
  g.translate(0, height / 2, 0);
  paint(g, () => [0.16, 0.11, 0.07]);
  return prep(g);
}

function rockGeometry(seed) {
  const r = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.18 * Math.sin(x * 3.1 + z * 2.3) + 0.12 * Math.sin(y * 4.7 + x * 1.3);
    p.setXYZ(i, x * n * 1.3, y * n * 0.7, z * n);
  }
  jitter(g, 0.12, r);
  paint(g, (x, y) => { const k = 0.7 + 0.3 * y; return [0.36 * k, 0.35 * k, 0.33 * k]; });
  return prep(g);
}

function shrubGeometry(seed) {
  const r = rng(seed);
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.IcosahedronGeometry(0.6 + r() * 0.4, 1);
    jitter(g, 0.35, r);
    g.scale(1, 0.6, 1);
    g.translate((r() - 0.5) * 1.2, 0.35 + r() * 0.3, (r() - 0.5) * 1.2);
    paint(g, () => [0.3, 0.27, 0.15]);
    parts.push(prep(g));
  }
  return mergeGeometries(parts);
}

function sandbagGeometry() {
  const g = new THREE.CapsuleGeometry(0.22, 0.75, 3, 8);
  g.rotateZ(Math.PI / 2);
  g.scale(1, 0.62, 1.2);
  paint(g, () => [0.5, 0.42, 0.29]);
  return prep(g);
}

export const vegetationUniforms = {
  uTime: { value: 0 },
  uSnow: { value: 0 },
  uWindStrength: { value: 1 },
};

function windMaterial({ sway, roughness = 0.9, snowable = true }) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, vegetationUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uWindStrength;\nvarying float vUpN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float h = max(position.y, 0.0);
          float k = ${sway.toFixed(4)} * h * h * uWindStrength;
          float ph = uTime * 1.3 + ip.x * 0.05 + ip.z * 0.07;
          transformed.x += (sin(ph) + 0.4 * sin(ph * 2.7)) * k;
          transformed.z += cos(ph * 0.8) * k * 0.6;
        }`)
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvUpN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSnow;\nvarying float vUpN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${snowable ? 'float snow = uSnow * smoothstep(0.25, 0.7, vUpN); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.88, 0.93), snow);' : ''}`);
  };
  m.customProgramCacheKey = () => `veg-${sway}-${snowable}`;
  return m;
}

export class BattlefieldVegetation {
  constructor(scene, coordinator, { quality = 'high' } = {}) {
    this.scene = scene;
    this.coordinator = coordinator;
    const rows = coordinator.game?.grid?.rows || 12;
    const cols = coordinator.game?.grid?.cols || 12;
    this.cellSize = coordinator.options.cellSize || 10;
    this.W = cols * this.cellSize;
    this.H = rows * this.cellSize;
    this.group = new THREE.Group();
    this.group.name = 'BattlefieldVegetation';
    scene.add(this.group);
    this.disposables = [];
    const density = { low: 0.45, medium: 0.75, high: 1 }[quality] ?? 0.75;

    const foliageMat = windMaterial({ sway: 0.0035, roughness: 0.85 });
    const trunkMat = windMaterial({ sway: 0.0035, roughness: 0.95, snowable: false });
    const broadMat = windMaterial({ sway: 0.0045, roughness: 0.8 });
    const rockMat = windMaterial({ sway: 0, roughness: 0.85 });
    const shrubMat = windMaterial({ sway: 0.03, roughness: 0.9 });
    const bagMat = windMaterial({ sway: 0, roughness: 0.95 });
    this.materials = { foliageMat, trunkMat, broadMat, rockMat, shrubMat, bagMat };
    this.disposables.push(...Object.values(this.materials));

    const r = rng(9137 + rows * 31 + cols);
    const height = (x, z) => coordinator.terrainHeight ? coordinator.terrainHeight(x, z) : coordinator.battlefieldTerrain?.getHeightAt(x, z) ?? 0;
    const outside = (x, z) => {
      const dx = x < 0 ? -x : x > this.W ? x - this.W : 0;
      const dz = z < 0 ? -z : z > this.H ? z - this.H : 0;
      return Math.hypot(dx, dz);
    };
    const cluster = (x, z) => 0.5 + 0.5 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.4) + 0.25 * Math.sin((x + z) * 0.05);

    const sample = (count, minD, maxD, accept) => {
      const out = [];
      let guard = count * 40;
      const cx = this.W / 2, cz = this.H / 2;
      const R = Math.max(this.W, this.H) / 2 + maxD;
      while (out.length < count && guard-- > 0) {
        const x = cx + (r() * 2 - 1) * R, z = cz + (r() * 2 - 1) * R;
        const d = outside(x, z);
        if (d < minD || d > maxD) continue;
        if (accept && !accept(x, z, d)) continue;
        out.push([x, z, d]);
      }
      return out;
    };

    const make = (geo, mat, points, scaleFn, sink = 0, castShadow = true) => {
      this.disposables.push(geo);
      const im = new THREE.InstancedMesh(geo, mat, Math.max(1, points.length));
      im.count = points.length;
      const m = new THREE.Object3D();
      const c = new THREE.Color();
      points.forEach(([x, z], i) => {
        const s = scaleFn();
        m.position.set(x, height(x, z) - sink * s, z);
        m.rotation.set((r() - 0.5) * 0.06, r() * Math.PI * 2, (r() - 0.5) * 0.06);
        m.scale.setScalar(s);
        m.updateMatrix();
        im.setMatrixAt(i, m.matrix);
        const v = 0.8 + r() * 0.4;
        im.setColorAt(i, c.setRGB(v, v * (0.95 + r() * 0.1), v * (0.9 + r() * 0.1)));
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = castShadow;
      im.receiveShadow = true;
      im.frustumCulled = false;
      this.group.add(im);
      return im;
    };

    // Forest clusters: dense patches, plus scattered singles. Keep a clear ring near the berm.
    const forestPts = sample(Math.floor(620 * density), 16, 330, (x, z, d) => cluster(x, z) > 0.62 || r() < 0.08);
    const conifers = [], broad = [];
    for (const p of forestPts) (r() < 0.7 ? conifers : broad).push(p);
    const coniferGeo = coniferGeometry(7);
    const broadGeo = broadleafGeometry(11);
    this.conifer = make(coniferGeo, foliageMat, conifers, () => 0.8 + r() * 0.7);
    this.coniferTrunk = make(trunkGeometry(3.4, 0.38, 0.2), trunkMat, conifers, () => 0.8 + r() * 0.7);
    this.broad = make(broadGeo, broadMat, broad, () => 0.7 + r() * 0.6);
    this.broadTrunk = make(trunkGeometry(5.2, 0.42, 0.24), trunkMat, broad, () => 0.7 + r() * 0.6);
    // Re-use the same matrices for trunks so crowns sit on their trunks.
    this._copyMatrices(this.conifer, this.coniferTrunk);
    this._copyMatrices(this.broad, this.broadTrunk);

    const rockPts = sample(Math.floor(170 * density), 5, 260);
    this.rocks = make(rockGeometry(5), rockMat, rockPts, () => 0.4 + Math.pow(r(), 2.5) * 2.6, 0.35);
    const shrubPts = sample(Math.floor(260 * density), 6, 200);
    this.shrubs = make(shrubGeometry(3), shrubMat, shrubPts, () => 0.7 + r() * 0.8, 0.1, false);

    // Sandbag revetments at the infantry outposts (same spots the old berms used).
    const posts = [
      [-3.4, 9.5, 0.45], [this.W + 3.3, this.H - 9.5, -0.3], [this.W / 2 + 12.8, this.H + 3.4, 1.57], [this.W / 2 - 11.2, -3.4, 1.57],
    ];
    const bags = [];
    for (const [x, z, rot] of posts) {
      for (let row = 0; row < 3; row++) {
        for (let i = -3; i <= 3; i++) {
          const off = i * 0.78 + (row % 2) * 0.39;
          const bx = x + Math.cos(rot) * off, bz = z - Math.sin(rot) * off;
          bags.push([bx, bz, row, rot]);
        }
      }
    }
    const bagGeo = sandbagGeometry();
    this.disposables.push(bagGeo);
    this.sandbags = new THREE.InstancedMesh(bagGeo, bagMat, bags.length);
    const m = new THREE.Object3D();
    bags.forEach(([x, z, row, rot], i) => {
      m.position.set(x, height(x, z) + 0.12 + row * 0.26, z);
      m.rotation.set((r() - 0.5) * 0.1, rot + (r() - 0.5) * 0.15, (r() - 0.5) * 0.08);
      m.scale.setScalar(1);
      m.updateMatrix();
      this.sandbags.setMatrixAt(i, m.matrix);
    });
    this.sandbags.castShadow = this.sandbags.receiveShadow = true;
    this.group.add(this.sandbags);
  }

  _copyMatrices(from, to) {
    const m = new THREE.Matrix4();
    for (let i = 0; i < from.count; i++) { from.getMatrixAt(i, m); to.setMatrixAt(i, m); }
    to.instanceMatrix.needsUpdate = true;
  }

  applyPreset(presetId) {
    const desert = presetId === 'desert';
    const arctic = presetId === 'arctic';
    this.conifer.visible = this.coniferTrunk.visible = !desert;
    this.broad.visible = this.broadTrunk.visible = !desert && !arctic;
    this.shrubs.visible = !arctic;
    vegetationUniforms.uSnow.value = arctic ? 1 : 0;
    vegetationUniforms.uWindStrength.value = presetId === 'storm' ? 2.6 : desert ? 1.4 : 1;
    const tint = { daylight: [1, 1, 1], twilight: [0.8, 0.85, 0.95], desert: [1.25, 1.05, 0.8], arctic: [0.9, 0.95, 1.0], storm: [0.8, 0.85, 0.8] }[presetId] || [1, 1, 1];
    for (const m of [this.materials.foliageMat, this.materials.broadMat, this.materials.shrubMat]) m.color.setRGB(...tint);
    this.materials.shrubMat.color.multiplyScalar(desert ? 1.3 : 0.7);
  }

  update(time) { vegetationUniforms.uTime.value = time; }

  destroy() {
    this.scene.remove(this.group);
    for (const d of this.disposables) d.dispose?.();
    for (const c of this.group.children) c.dispose?.();
  }
}
