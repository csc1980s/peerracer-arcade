import * as THREE from 'three';
import { NOISE_GLSL } from '../naval/theater/shared.js';
import { CELL_STATE, CRATER_TYPE } from '../../core/tank_minefield/rules_config.js';

/**
 * Battlefield terrain: one seamless heightfield mesh with a procedural PBR splat shader.
 *
 * Geometry
 *   - Dense vertices over the minefield (+ margin), then geometrically growing spacing
 *     out to a 1.5 km horizon of rolling hills and ridged mountains. One mesh, no seams.
 *   - Cell centres stay level so the tank sits flat; perimeter berm frames the field.
 *   - Craters are carved in the vertex shader from a per-cell state texture, so a mine
 *     blast deforms the ground without rebuilding geometry. getHeightAt() mirrors it.
 *
 * Shading (MeshStandardMaterial + onBeforeCompile: keeps shadows, IBL, fog, lights)
 *   - Grass / dirt / rock / sand / snow layers from noise, slope and height.
 *   - Revealed (de-mined) cells read as trampled, cleared ground; cells the tank drove
 *     through get tread ruts along the travel axis (puddles in the rain).
 *   - Craters: scorched bowl, ejecta rays, cooling embers.
 *   - Wetness for storms: darker albedo, low roughness, puddles with rain ripples.
 *   - Anti-aliased tactical grid lines (fwidth), active-cell outline, radar scan ring,
 *     hazard glow on scanned mines.
 *
 * Cell texture (RGBA8, cols x rows):
 *   R revealed (linear filtered -> soft organic cleared areas)
 *   G crater carve progress 0..1
 *   B (crater type << 6) | heat (0..63)
 *   A bits: 1 flagged, 2 scanned mine, 4 tracks N-S, 8 tracks E-W
 */

const CRATER_SHELL = 1;
const CRATER_MINE = 2;

const TERRAIN_GLSL_COMMON = /* glsl */ `
uniform sampler2D uCellTex;
uniform vec2 uGridDims;
uniform float uCellSize;

vec4 cellAt(vec2 xz) {
  vec2 c = floor(xz / uCellSize);
  if (c.x < 0.0 || c.y < 0.0 || c.x >= uGridDims.x || c.y >= uGridDims.y) return vec4(0.0);
  return texelFetch(uCellTex, ivec2(c), 0);
}

float craterProfile(float d) {
  float bowl = -(1.0 - d * d) * step(d, 1.0);
  float rim = exp(-pow((d - 1.0) / 0.28, 2.0)) * 0.32;
  return bowl + rim;
}

// Returns height offset; out: normalised distance to crater centre (d) and type (0 none, 1 shell, 2 mine).
float craterAt(vec2 xz, out float d, out float type) {
  vec4 c = cellAt(xz);
  d = 99.0;
  int bv = int(c.b * 255.0 + 0.5);
  type = float(bv >> 6);
  if (c.g <= 0.0 || type < 0.5) return 0.0;
  float mine = step(1.5, type);
  float radius = uCellSize * mix(0.22, 0.34, mine);
  float depth = mix(0.45, 0.95, mine);
  vec2 center = (floor(xz / uCellSize) + 0.5) * uCellSize;
  vec2 o = xz - center;
  float ang = atan(o.y, o.x);
  d = length(o) / radius;
  d *= 1.0 + 0.1 * sin(ang * 5.0 + center.x * 0.37) + 0.06 * sin(ang * 11.0 + center.y);
  return craterProfile(d) * depth * c.g;
}
`;

const VERTEX_HEAD = /* glsl */ `
${TERRAIN_GLSL_COMMON}
varying vec3 vWPos;
varying vec3 vWNormal;
float craterH(vec2 xz) { float d, t; return craterAt(xz, d, t); }
`;

const FRAGMENT_HEAD = /* glsl */ `
${TERRAIN_GLSL_COMMON}
${NOISE_GLSL}
uniform float uTime;
uniform vec3 uGrassA, uGrassB, uDirt, uRock, uScorch, uTrack, uGridColor;
uniform float uSnow, uWet, uSand, uGridStrength, uGridGlow, uRain;
uniform vec2 uActiveCell;
uniform vec3 uScanCenter;
uniform float uScanRadius, uScanPulseAlpha;
varying vec3 vWPos;
varying vec3 vWNormal;

vec3 tAlbedo; float tRough; vec3 tNormalW; vec3 tEmissive;

// Fine-scale height used only for shading normals.
float microHeight(vec2 p, float rut, float sandAmt) {
  float h = 0.03 * vnoise2(p * 1.9) + 0.018 * vnoise2(p * 6.3 + 3.1);
#ifndef TERRAIN_LOW
  h += 0.006 * vnoise2(p * 17.0);
#endif
  // Wind ripples on sand.
  h += sandAmt * 0.05 * sin(dot(p, vec2(0.86, 0.5)) * 2.6 + vnoise2(p * 0.4) * 5.0);
  h -= rut * 0.06;
  return h;
}

// Tread ruts through a visited cell: two parallel lanes per travel axis.
float rutMask(vec2 xz, int bits, out float tread) {
  vec2 local = xz - (floor(xz / uCellSize) + 0.5) * uCellSize;
  float r = 0.0; tread = 0.0;
  if ((bits & 4) != 0) {
    float a = abs(abs(local.x) - 1.65);
    float m = 1.0 - smoothstep(0.32, 0.5, a);
    r = max(r, m);
    tread = max(tread, m * step(0.5, fract(local.y * 1.6)));
  }
  if ((bits & 8) != 0) {
    float a = abs(abs(local.y) - 1.65);
    float m = 1.0 - smoothstep(0.32, 0.5, a);
    r = max(r, m);
    tread = max(tread, m * step(0.5, fract(local.x * 1.6)));
  }
  return r;
}

void terrainEval() {
  vec2 xz = vWPos.xz;
  vec3 n = normalize(vWNormal);
  float slope = 1.0 - n.y;
  vec2 gridSize = uGridDims * uCellSize;
  vec2 inside = smoothstep(vec2(-0.5), vec2(0.5), xz) * smoothstep(gridSize + 0.5, gridSize - 0.5, xz);
  float gridMask = inside.x * inside.y;

  float macro = fbm2(xz * 0.018);
  float mid = fbm2(xz * 0.11 + 7.0);
  float fine = vnoise2(xz * 1.9);
  float fine2 = vnoise2(xz * 6.3 + 3.1);

  vec4 cell = cellAt(xz);
  int bits = int(cell.a * 255.0 + 0.5);
  int bv = int(cell.b * 255.0 + 0.5);
  float heat = float(bv & 63) / 63.0;

  // Ground cover.
  vec3 col = mix(uGrassA, uGrassB, smoothstep(0.3, 0.7, macro));
  col *= 0.8 + 0.32 * mid;
  col *= 0.88 + 0.24 * fine;
  float tufts = smoothstep(0.62, 0.8, fine2) * (1.0 - uSand) * (1.0 - uSnow * 0.7);
  col *= 1.0 - tufts * 0.25;

  // Natural dirt patches + de-mined (revealed) ground.
  float dirtN = fbm2(xz * 0.05 + 31.0);
  float dirtMask = smoothstep(0.6, 0.74, dirtN + (fine - 0.5) * 0.15);
  vec2 uv = xz / gridSize;
  float rev = texture(uCellTex, uv).r * gridMask;
  float cleared = smoothstep(0.32, 0.62, rev + (mid - 0.5) * 0.35 + (fine - 0.5) * 0.12);
  vec3 dirtCol = uDirt * (0.78 + 0.44 * fine) * (0.9 + 0.2 * fine2);
  col = mix(col, dirtCol, max(dirtMask * 0.65, cleared * 0.72));

  float tread;
  float rut = rutMask(xz, bits, tread) * gridMask;
  col = mix(col, uTrack * (0.85 + 0.3 * fine), rut * 0.85);
  col *= 1.0 - tread * 0.18;

  // Rock on steep slopes and high ground (outside the field).
  float rockMask = smoothstep(0.2, 0.4, slope + (mid - 0.5) * 0.2) * (1.0 - gridMask);
  rockMask = max(rockMask, smoothstep(35.0, 70.0, vWPos.y + mid * 25.0));
  col = mix(col, uRock * (0.65 + 0.6 * mid) * (0.9 + 0.2 * fine), rockMask);

  // Snow: settles on flats, pushed aside by tracks, thin on de-mined ground.
  float snowMask = uSnow * smoothstep(0.5, 0.22, slope) * smoothstep(0.2, 0.42, macro + fine * 0.2);
  snowMask *= (1.0 - rut * 0.92) * (1.0 - cleared * 0.45);
  snowMask = max(snowMask, uSnow * smoothstep(55.0, 90.0, vWPos.y + mid * 20.0));
  col = mix(col, vec3(0.86, 0.89, 0.94) * (0.94 + 0.08 * fine), clamp(snowMask, 0.0, 1.0));

  // Craters.
  float cd, ctype;
  float ch = craterAt(xz, cd, ctype);
  float prog = cell.g;
  float scorch = 0.0, bowl = 0.0;
  if (ctype > 0.5 && prog > 0.0) {
    vec2 center = (floor(xz / uCellSize) + 0.5) * uCellSize;
    vec2 o = xz - center;
    float ang = atan(o.y, o.x);
    float rays = pow(0.5 + 0.5 * sin(ang * 9.0 + center.x + fine * 2.5), 5.0) * smoothstep(3.2, 1.1, cd) * smoothstep(0.7, 1.15, cd);
    float burn = smoothstep(2.3, 0.6, cd + (fine - 0.5) * 0.7);
    float strength = mix(0.75, 1.0, step(1.5, ctype));
    scorch = clamp(burn * 0.9 + rays * 0.7, 0.0, 1.0) * prog * strength;
    bowl = (1.0 - smoothstep(0.0, 1.0, cd)) * prog;
    // Embers: cooling glow in the bowl of a fresh blast.
    float ember = heat * (1.0 - smoothstep(0.2, 1.1, cd)) * pow(fine2, 3.0) * (0.75 + 0.25 * sin(uTime * 6.0 + fine * 12.0));
    tEmissive += vec3(4.0, 1.1, 0.25) * ember;
  }
  col = mix(col, uScorch * (0.8 + 0.4 * fine), scorch);
  col *= 1.0 - bowl * 0.3;

  // Wetness and puddles (storm).
  float puddle = uWet * clamp(smoothstep(0.6, 0.78, fbm2(xz * 0.07 + 3.0)) * gridMask + rut * 0.85 + bowl * 0.9, 0.0, 1.0);
  puddle *= 1.0 - rockMask;
  col *= mix(1.0, 0.72, uWet * 0.75);
  col = mix(col, col * 0.45, puddle);

  float rough = mix(0.94, 0.86, max(dirtMask, cleared));
  rough = mix(rough, 0.68, rockMask);
  rough = mix(rough, 0.6, clamp(snowMask, 0.0, 1.0));
  rough = mix(rough, 0.97, scorch);
  rough = mix(rough, 0.42, uWet * 0.75);
  rough = mix(rough, 0.05, puddle);

  // Shading normal: geometric normal + micro relief, flattened in puddles.
  float sandAmt = uSand * (1.0 - cleared * 0.7);
  float e = 0.06;
  float h0 = microHeight(xz, rut, sandAmt);
  float hx = microHeight(xz + vec2(e, 0.0), rut, sandAmt);
  float hz = microHeight(xz + vec2(0.0, e), rut, sandAmt);
  float relief = mix(1.0, 0.35, clamp(snowMask, 0.0, 1.0));
  vec3 nW = normalize(n - vec3(hx - h0, 0.0, hz - h0) / e * relief);
  if (uRain > 0.0 && puddle > 0.05) {
    // Rain ripples: expanding rings in a jittered lattice.
    vec2 rp = xz * 1.3;
    vec2 ci = floor(rp);
    vec2 cf = fract(rp) - 0.5 - (vec2(hash12(ci), hash12(ci + 7.1)) - 0.5) * 0.6;
    float ph = fract(uTime * 1.1 + hash12(ci + 3.3));
    float rr = length(cf);
    float ring = sin((rr - ph * 0.5) * 60.0) * (1.0 - ph) * smoothstep(0.5 * ph + 0.05, 0.5 * ph, rr);
    vec2 g = rr > 1e-3 ? cf / rr : vec2(0.0);
    vec3 rippleN = normalize(vec3(-g.x * ring * 0.35, 1.0, -g.y * ring * 0.35));
    nW = normalize(mix(nW, rippleN, puddle * uRain));
  } else {
    nW = normalize(mix(nW, n, puddle));
  }

  // Tactical grid overlay.
  vec2 gc = xz / uCellSize;
  vec2 fw = max(fwidth(gc), vec2(1e-4));
  vec2 gLine = abs(fract(gc - 0.5) - 0.5) / fw;
  float line = 1.0 - min(min(gLine.x, gLine.y) / 1.1, 1.0);
  float camDist = length(vWPos - cameraPosition);
  line *= gridMask * (1.0 - smoothstep(110.0, 260.0, camDist));
  col = mix(col, uGridColor, line * uGridStrength);
  tEmissive += uGridColor * line * uGridGlow;

  // Active cell outline.
  vec2 cellId = floor(gc);
  if (all(equal(cellId, floor(uActiveCell)))) {
    vec2 f = fract(gc);
    float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float glow = (1.0 - smoothstep(0.0, 0.035, edge)) * (0.65 + 0.35 * sin(uTime * 3.0));
    tEmissive += uGridColor * glow * 0.9;
    col = mix(col, uGridColor, glow * 0.25);
  }

  // Radar scan ring.
  float sd = length(xz - uScanCenter.xz);
  float scanRing = (1.0 - smoothstep(0.0, 0.9, abs(sd - uScanRadius))) * uScanPulseAlpha;
  tEmissive += vec3(0.25, 1.4, 1.8) * scanRing;

  // Confirmed (scanned) mine: pulsing hazard disc.
  if ((bits & 2) != 0) {
    vec2 local = xz - (cellId + 0.5) * uCellSize;
    float r = length(local);
    float hz2 = (1.0 - smoothstep(2.2, 2.6, r)) * smoothstep(1.7, 2.1, r);
    float stripes = step(0.5, fract((local.x + local.y) * 0.6)) * (1.0 - smoothstep(1.7, 1.9, r));
    float pulse = 0.6 + 0.4 * sin(uTime * 4.0);
    tEmissive += vec3(2.2, 0.35, 0.1) * (hz2 * pulse + stripes * 0.18);
  }
  // Flagged cell: painted warning ring.
  if ((bits & 1) != 0) {
    float r = length(xz - (cellId + 0.5) * uCellSize);
    float ring = (1.0 - smoothstep(3.0, 3.25, r)) * smoothstep(2.75, 3.0, r);
    col = mix(col, vec3(0.75, 0.12, 0.08), ring * 0.8);
  }

  tAlbedo = col;
  tRough = rough;
  tNormalW = nW;
}
`;

export class BattlefieldTerrainPBR {
  /**
   * @param {THREE.Scene} scene
   * @param {{rows:number, cols:number, cellSize:number, quality:string}} opts
   */
  constructor(scene, { rows = 12, cols = 12, cellSize = 10, quality = 'high' } = {}) {
    this.scene = scene;
    this.rows = rows;
    this.cols = cols;
    this.cellSize = cellSize;
    this.gridWidth = cols * cellSize;
    this.gridHeight = rows * cellSize;
    this.quality = quality;

    this.cellData = new Uint8Array(rows * cols * 4);
    this.cellTex = new THREE.DataTexture(this.cellData, cols, rows, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.cellTex.magFilter = THREE.LinearFilter;
    this.cellTex.minFilter = THREE.LinearFilter;
    this.cellTex.wrapS = this.cellTex.wrapT = THREE.ClampToEdgeWrapping;
    this.cellTex.needsUpdate = true;

    // Per-cell crater animation state (CPU side).
    this.craterProg = new Float32Array(rows * cols);
    this.craterType = new Uint8Array(rows * cols);
    this.heat = new Float32Array(rows * cols);
    this.trackBits = new Uint8Array(rows * cols);
    this.dirty = true;

    this.uniforms = {
      uCellTex: { value: this.cellTex },
      uGridDims: { value: new THREE.Vector2(cols, rows) },
      uCellSize: { value: cellSize },
      uTime: { value: 0 },
      uGrassA: { value: new THREE.Color() },
      uGrassB: { value: new THREE.Color() },
      uDirt: { value: new THREE.Color() },
      uRock: { value: new THREE.Color() },
      uScorch: { value: new THREE.Color() },
      uTrack: { value: new THREE.Color() },
      uGridColor: { value: new THREE.Color() },
      uSnow: { value: 0 },
      uWet: { value: 0 },
      uSand: { value: 0 },
      uRain: { value: 0 },
      uGridStrength: { value: 0.15 },
      uGridGlow: { value: 0 },
      uActiveCell: { value: new THREE.Vector2(-10, -10) },
      uScanCenter: { value: new THREE.Vector3() },
      uScanRadius: { value: 0 },
      uScanPulseAlpha: { value: 0 },
    };

    this.group = new THREE.Group();
    this.group.name = 'BattlefieldTerrainPBR';
    scene.add(this.group);
    this._buildMesh();
  }

  // --------------------------------------------------------------------------
  // Height field (CPU). Mirrors geometry + crater carve in the vertex shader.
  // --------------------------------------------------------------------------

  _noise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const fx = x - xi, fz = z - zi;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const h = (a, b) => {
      let n = (a * 374761393 + b * 668265263) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  _fbm(x, z, oct = 5) {
    let s = 0, a = 0.5;
    for (let i = 0; i < oct; i++) { s += a * this._noise(x, z); x = x * 2.03 + 17.1; z = z * 2.03 + 9.7; a *= 0.5; }
    return s;
  }

  _ridged(x, z) {
    let s = 0, a = 0.5;
    for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(this._noise(x, z) * 2 - 1)); x = x * 2.1 + 5.3; z = z * 2.1 + 1.9; a *= 0.5; }
    return s;
  }

  _micro(x, z) {
    const cs = this.cellSize;
    const cx = (Math.floor(x / cs) + 0.5) * cs;
    const cz = (Math.floor(z / cs) + 0.5) * cs;
    const dist = Math.hypot(x - cx, z - cz) / (cs * 0.5);
    const damp = Math.min(1, Math.max(0, dist - 0.3) * 1.5);
    return ((this._noise(x * 0.35, z * 0.35) - 0.5) * 0.32 + Math.sin(x * 0.45) * Math.cos(z * 0.45) * 0.08) * damp;
  }

  baseHeight(x, z) {
    const W = this.gridWidth, H = this.gridHeight;
    const dx = x < 0 ? -x : x > W ? x - W : 0;
    const dz = z < 0 ? -z : z > H ? z - H : 0;
    const d = Math.hypot(dx, dz);
    if (d === 0) return this._micro(x, z);

    const edge = this._micro(Math.min(Math.max(x, 0), W), Math.min(Math.max(z, 0), H)) * (1 - Math.min(1, d / 3));
    const bermT = Math.min(1, d / 9);
    const berm = Math.sin(bermT * Math.PI) * (1.45 + (this._noise(x * 0.15, z * 0.15) - 0.5) * 0.7) * (d < 9 ? 1 : 0);
    const blend = THREE.MathUtils.smoothstep(d, 8, 45);
    const hills = (this._fbm(x * 0.011, z * 0.011) - 0.42) * 26;
    const mtn = THREE.MathUtils.smoothstep(d, 260, 950) * Math.pow(this._ridged(x * 0.0022 + 3.1, z * 0.0022 + 7.7), 2.2) * 190;
    return edge + berm + Math.max(-1.2, hills) * blend + mtn;
  }

  craterHeight(x, z) {
    const cs = this.cellSize;
    const col = Math.floor(x / cs), row = Math.floor(z / cs);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return 0;
    const i = row * this.cols + col;
    const prog = this.craterProg[i], type = this.craterType[i];
    if (prog <= 0 || !type) return 0;
    const mine = type === CRATER_MINE ? 1 : 0;
    const radius = cs * (0.22 + 0.12 * mine);
    const depth = 0.45 + 0.5 * mine;
    const d = Math.hypot(x - (col + 0.5) * cs, z - (row + 0.5) * cs) / radius;
    const bowl = d <= 1 ? -(1 - d * d) : 0;
    const rim = Math.exp(-Math.pow((d - 1) / 0.28, 2)) * 0.32;
    return (bowl + rim) * depth * prog;
  }

  getHeightAt(x, z) {
    return this.baseHeight(x, z) + this.craterHeight(x, z);
  }

  // --------------------------------------------------------------------------
  // Mesh
  // --------------------------------------------------------------------------

  _axis(len, step, extent) {
    const margin = 16;
    const a = -margin, b = len + margin;
    const dense = [];
    for (let x = a; x <= b + 1e-6; x += step) dense.push(x);
    const outer = (start, dir) => {
      const out = [];
      let s = step, x = start;
      while (Math.abs(x - start) < extent) { s *= 1.13; x += dir * s; out.push(x); }
      return out;
    };
    return [...outer(a, -1).reverse(), ...dense, ...outer(dense[dense.length - 1], 1)];
  }

  _buildMesh() {
    const step = { low: 1.25, medium: 0.8, high: 0.55 }[this.quality] ?? 0.8;
    const xs = this._axis(this.gridWidth, step, 1500);
    const zs = this._axis(this.gridHeight, step, 1500);
    const nx = xs.length, nz = zs.length;
    const pos = new Float32Array(nx * nz * 3);
    let o = 0;
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const x = xs[i], z = zs[j];
        pos[o++] = x; pos[o++] = this.baseHeight(x, z); pos[o++] = z;
      }
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    o = 0;
    for (let j = 0; j < nz - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        idx[o++] = a; idx[o++] = c; idx[o++] = b;
        idx[o++] = b; idx[o++] = c; idx[o++] = d;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
    const low = this.quality === 'low';
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      if (low) shader.defines = { ...(shader.defines || {}), TERRAIN_LOW: '' };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          float tCh = craterH(position.xz);
          {
            float e = 0.3;
            float chx = craterH(position.xz + vec2(e, 0.0)) - craterH(position.xz - vec2(e, 0.0));
            float chz = craterH(position.xz + vec2(0.0, e)) - craterH(position.xz - vec2(0.0, e));
            objectNormal = normalize(objectNormal - vec3(chx, 0.0, chz) / (2.0 * e));
          }`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          transformed.y += tCh;
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vWNormal = normalize(mat3(modelMatrix) * objectNormal);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          tEmissive = vec3(0.0);
          terrainEval();
          diffuseColor.rgb = tAlbedo;`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = tRough;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          normal = normalize((viewMatrix * vec4(tNormalW, 0.0)).xyz);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += tEmissive;`);
    };
    mat.customProgramCacheKey = () => `bf-terrain-${low ? 'l' : 'h'}`;

    this.material = mat;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false; // low sun + hills would bury the field in shadow
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }

  // --------------------------------------------------------------------------
  // Presets & state
  // --------------------------------------------------------------------------

  applyPreset(p) {
    const t = p.terrain, u = this.uniforms;
    u.uGrassA.value.setRGB(...t.grassA, THREE.SRGBColorSpace);
    u.uGrassB.value.setRGB(...t.grassB, THREE.SRGBColorSpace);
    u.uDirt.value.setRGB(...t.dirt, THREE.SRGBColorSpace);
    u.uRock.value.setRGB(...t.rock, THREE.SRGBColorSpace);
    u.uScorch.value.setRGB(...t.scorch, THREE.SRGBColorSpace);
    u.uTrack.value.setRGB(...t.track, THREE.SRGBColorSpace);
    u.uGridColor.value.setRGB(...t.grid, THREE.SRGBColorSpace);
    u.uSnow.value = t.snow;
    u.uWet.value = t.wet;
    u.uSand.value = t.sand;
    u.uRain.value = p.weather === 'rain' ? 1 : 0;
    u.uGridStrength.value = t.gridStrength;
    u.uGridGlow.value = t.gridGlow;
  }

  /** Mark tread ruts. axis: 'ns' (moved along rows) or 'ew'. */
  markTrack(row, col, axis) {
    if (row < 0 || col < 0 || row >= this.rows || col >= this.cols) return;
    this.trackBits[row * this.cols + col] |= axis === 'ns' ? 4 : 8;
    this.dirty = true;
  }

  /** Read the authoritative grid. New craters start carving (animated in update()). */
  syncCells(grid, skip = null) {
    if (!grid) return;
    this._skip = skip;
    const { rows, cols } = this;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid.getCell ? grid.getCell(r, c) : grid.cells?.[r]?.[c];
        if (!cell) continue;
        const i = r * cols + c;
        if (skip && skip.has(r * 1000 + c)) continue;
        const type = cell.crater === CRATER_TYPE.MINE_DETONATION ? CRATER_MINE : cell.crater === CRATER_TYPE.SHELL_IMPACT ? CRATER_SHELL : 0;
        if (type && !this.craterType[i]) {
          this.craterType[i] = type;
          this.craterProg[i] = 0.001;
          this.heat[i] = type === CRATER_MINE ? 1 : 0.6;
        } else if (!type && this.craterType[i]) {
          this.craterType[i] = 0; this.craterProg[i] = 0; this.heat[i] = 0;
        }
      }
    }
    this._grid = grid;
    this.dirty = true;
  }

  /** Craters already present when a game loads appear fully formed (no blast). */
  settleCraters() {
    for (let i = 0; i < this.craterProg.length; i++) {
      if (this.craterType[i]) { this.craterProg[i] = 1; this.heat[i] = 0; }
    }
    this.dirty = true;
  }

  _writeTexture() {
    const grid = this._grid;
    const d = this.cellData;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c, o = i * 4;
        const cell = grid ? (grid.getCell ? grid.getCell(r, c) : grid.cells?.[r]?.[c]) : null;
        const revealed = cell && (cell.isRevealed ? cell.isRevealed() : cell.state === CELL_STATE.REVEALED);
        const flagged = cell && (cell.isFlagged ? cell.isFlagged() : cell.state === CELL_STATE.FLAGGED);
        const pending = this._skip && this._skip.has(r * 1000 + c);
        d[o] = revealed || (!pending && cell && cell.crater && cell.crater !== CRATER_TYPE.NONE) ? 255 : 0;
        d[o + 1] = Math.round(Math.min(1, this.craterProg[i]) * 255);
        d[o + 2] = (this.craterType[i] << 6) | Math.round(this.heat[i] * 63);
        d[o + 3] = (flagged ? 1 : 0) | (cell?.isScannedMine ? 2 : 0) | this.trackBits[i];
      }
    }
    this.cellTex.needsUpdate = true;
  }

  update(dt, time) {
    this.uniforms.uTime.value = time;
    let animating = false;
    for (let i = 0; i < this.craterProg.length; i++) {
      if (!this.craterType[i]) continue;
      if (this.craterProg[i] < 1) {
        // Fast carve: the ground is thrown out in the first ~0.25 s of the blast.
        this.craterProg[i] = Math.min(1, this.craterProg[i] + dt * 4.5);
        animating = true;
      }
      if (this.heat[i] > 0) {
        this.heat[i] = Math.max(0, this.heat[i] - dt / 14);
        animating = true;
      }
    }
    if (animating) this.dirty = true;
    if (this.dirty) { this._writeTexture(); this.dirty = false; }
  }

  setActiveCell(row, col) {
    this.uniforms.uActiveCell.value.set(col + 0.5, row + 0.5);
  }

  dispose() {
    this.scene.remove(this.group);
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.cellTex.dispose();
  }
}
