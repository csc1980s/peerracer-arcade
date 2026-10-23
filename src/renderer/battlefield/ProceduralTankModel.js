import * as THREE from 'three';
import { TANK_PRESETS } from '../../core/tank_minefield/rules_config.js';

/**
 * Procedural main battle tank (Patton / Centurion / T-55 class proportions, metres).
 *
 * Local frame: origin on the ground under the hull centre, forward = -Z, up = +Y.
 *   group            root (position / heading)
 *     hull           upper + lower hull, glacis, deck, engine grille, fenders, lights
 *     tracks         instanced track shoes that actually run around the wheels
 *     wheels         road wheels / sprocket / idler (spin with the tracks)
 *     turret         yaw pivot on the turret ring
 *       gun          pitch pivot at the mantlet, barrel + bore evacuator + muzzle brake
 *         muzzle     empty at the barrel tip (fire point)
 *
 * Materials are PBR with runtime-generated maps (mottled paint, cast-armour bumps,
 * worn edges in roughness) plus a shader layer that adds environment grime: dust on
 * the running gear and lower hull, snow on top faces in the arctic, wet sheen in rain.
 * Swap in an authored GLB later by keeping the same node names.
 */

const texCache = new Map();

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tileNoise(size, seed, period, octaves) {
  const r = rng(seed);
  const lat = new Float32Array(256 * 256);
  for (let i = 0; i < lat.length; i++) lat[i] = r();
  const L = (x, y, p) => lat[((y % p + p) % p) * 256 + ((x % p + p) % p)];
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0, amp = 0.5, p = period;
      for (let o = 0; o < octaves; o++) {
        const fx = (x / size) * p, fy = (y / size) * p;
        const xi = Math.floor(fx), yi = Math.floor(fy);
        const tx = fx - xi, ty = fy - yi;
        const ux = tx * tx * (3 - 2 * tx), uy = ty * ty * (3 - 2 * ty);
        const a = L(xi, yi, p), b = L(xi + 1, yi, p), c = L(xi, yi + 1, p), d = L(xi + 1, yi + 1, p);
        s += amp * (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy);
        amp *= 0.5; p *= 2;
      }
      out[y * size + x] = s;
    }
  }
  return out;
}

/** Paint albedo / roughness / normal for a base colour. Tileable, cached per colour. */
function paintTextures(hex, size = 512) {
  const key = `${hex}-${size}`;
  if (texCache.has(key)) return texCache.get(key);
  // Texture is tagged sRGB, so write sRGB-encoded values.
  const base = new THREE.Color(hex).convertLinearToSRGB();
  const big = tileNoise(size, 11, 4, 4);
  const mid = tileNoise(size, 23, 16, 3);
  const fine = tileNoise(size, 37, 64, 2);
  const alb = new Uint8Array(size * size * 4);
  const rough = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const mott = (big[i] - 0.5) * 0.35 + (mid[i] - 0.5) * 0.18;
    const grime = Math.max(0, mid[i] - 0.62) * 1.4;
    const chip = fine[i] > 0.78 && big[i] > 0.55 ? 1 : 0;
    let r = base.r * (1 + mott), g = base.g * (1 + mott), b = base.b * (1 + mott * 0.8);
    r = r * (1 - grime * 0.4) + grime * 0.06; g = g * (1 - grime * 0.4) + grime * 0.05; b = b * (1 - grime * 0.4) + grime * 0.04;
    if (chip) { r = 0.16; g = 0.15; b = 0.14; }
    alb[i * 4] = Math.min(255, Math.max(0, r * 255));
    alb[i * 4 + 1] = Math.min(255, Math.max(0, g * 255));
    alb[i * 4 + 2] = Math.min(255, Math.max(0, b * 255));
    alb[i * 4 + 3] = 255;
    const ro = 0.62 + (mid[i] - 0.5) * 0.25 + grime * 0.25 - chip * 0.3;
    rough[i * 4] = 255; rough[i * 4 + 1] = Math.min(255, Math.max(0, ro * 255)); rough[i * 4 + 2] = chip ? 200 : 0; rough[i * 4 + 3] = 255;
    height[i] = big[i] * 0.4 + mid[i] * 0.35 + fine[i] * 0.25 - chip * 0.3;
  }
  const nrm = new Uint8Array(size * size * 4);
  const h = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 3.0, dy = (h(x, y + 1) - h(x, y - 1)) * 3.0;
      const inv = 1 / Math.hypot(dx, dy, 1), o = (y * size + x) * 4;
      nrm[o] = (-dx * inv * 0.5 + 0.5) * 255; nrm[o + 1] = (dy * inv * 0.5 + 0.5) * 255; nrm[o + 2] = (inv * 0.5 + 0.5) * 255; nrm[o + 3] = 255;
    }
  }
  const mk = (data, srgb) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const set = { map: mk(alb, true), roughnessMap: mk(rough, false), normalMap: mk(nrm, false) };
  texCache.set(key, set);
  return set;
}

/** Shared grime uniforms (one set for all tanks: they live in the same weather). */
export const tankGrime = {
  uDustColor: { value: new THREE.Color(0.42, 0.34, 0.24) },
  uDust: { value: 0.6 },
  uSnow: { value: 0 },
  uWet: { value: 0 },
};

function addGrime(material, lowerOnly = false) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, tankGrime);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrimeW;\nvarying vec3 vGrimeN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vGrimeW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vGrimeN = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uDustColor; uniform float uDust, uSnow, uWet;
        varying vec3 vGrimeW; varying vec3 vGrimeN;
        float gHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(gHash(i), gHash(i + vec2(1, 0)), u.x), mix(gHash(i + vec2(0, 1)), gHash(i + vec2(1, 1)), u.x), u.y); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        {
          float gy = vGrimeW.y;
          float n = gNoise(vGrimeW.xz * 3.0 + gy * 2.0) * 0.6 + gNoise(vGrimeW.xz * 11.0) * 0.4;
          float lower = ${lowerOnly ? '1.0 - smoothstep(0.4, 2.2, gy)' : '1.0 - smoothstep(0.5, 1.6, gy)'};
          float up = smoothstep(0.55, 0.95, vGrimeN.y);
          float dust = clamp(uDust * (lower * (0.55 + 0.6 * n) + up * 0.25 * n), 0.0, 0.95);
          diffuseColor.rgb = mix(diffuseColor.rgb, uDustColor * (0.8 + 0.4 * n), dust);
          roughnessFactor = mix(roughnessFactor, 0.95, dust);
          float snow = uSnow * up * smoothstep(0.35, 0.6, n);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.9, 0.95), snow);
          roughnessFactor = mix(roughnessFactor, 0.55, snow);
          diffuseColor.rgb *= mix(1.0, 0.7, uWet);
          roughnessFactor = mix(roughnessFactor, 0.22, uWet * (0.5 + 0.5 * up));
        }`);
  };
  material.customProgramCacheKey = () => `tank-grime-${lowerOnly ? 1 : 0}`;
  return material;
}

function insigniaTexture(preset) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  const col = preset.accentColor || '#ffffff';
  const star = (cx, cy, R, r, fill) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath(); g.fillStyle = fill; g.fill();
  };
  switch (preset.emblemType) {
    case 'white_star':
      g.lineWidth = 7; g.strokeStyle = col; g.beginPath(); g.arc(64, 66, 54, 0, Math.PI * 2); g.stroke();
      star(64, 68, 46, 18, col); break;
    case 'red_star':
      star(64, 68, 54, 22, col);
      g.lineWidth = 4; g.strokeStyle = '#f5d76e'; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 22 : 54; g.lineTo(64 + Math.cos(a) * rr, 68 + Math.sin(a) * rr); }
      g.closePath(); g.stroke(); break;
    case 'un_roundel':
      g.fillStyle = '#f8fafc'; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); g.fill();
      g.font = 'bold 44px sans-serif'; g.fillStyle = '#f8fafc'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('UN', 64, 66); break;
    default:
      g.fillStyle = '#1d4ed8'; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f8fafc'; g.beginPath(); g.arc(64, 64, 42, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#dc2626'; g.beginPath(); g.arc(64, 64, 34, 0, Math.PI * 2); g.fill();
      star(64, 66, 24, 10, '#f8fafc');
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Track contour (side view, z forward, y up), clockwise when seen from +X.
const TRACK_PATH = (() => {
  const pts = [];
  const arc = (cz, cy, r, a0, a1, n) => {
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  };
  // Bottom run (ground contact) rear -> front, front idler, top run, rear sprocket.
  pts.push([2.55, 0.06]);
  pts.push([-2.55, 0.06]);
  arc(-3.0, 0.66, 0.38, Math.PI * 1.35, Math.PI * 0.6, 8);
  pts.push([-2.4, 1.02]);
  pts.push([2.6, 1.02]);
  arc(3.05, 0.7, 0.36, Math.PI * 0.45, -Math.PI * 0.45, 8);
  // Close back to the start.
  const out = [];
  let L = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    out.push({ z: a[0], y: a[1], s: L });
    L += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { pts: out, length: L };
})();

function samplePath(s, out) {
  const { pts, length } = TRACK_PATH;
  s = ((s % length) + length) % length;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (pts[m].s <= s) lo = m; else hi = m - 1; }
  const a = pts[lo], b = pts[(lo + 1) % pts.length];
  const segLen = (lo + 1 < pts.length ? b.s : length) - a.s;
  const f = segLen > 0 ? (s - a.s) / segLen : 0;
  out.z = a.z + (b.z - a.z) * f;
  out.y = a.y + (b.y - a.y) * f;
  out.ang = Math.atan2(b.y - a.y, b.z - a.z);
  return out;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _e = new THREE.Euler();
const _sp = { z: 0, y: 0, ang: 0 };

export class ProceduralTankModel {
  constructor({ presetId = 'US', quality = 'high' } = {}) {
    this.quality = quality;
    this.group = new THREE.Group();
    this.group.name = 'TankModel';
    this.trackPhase = [0, 0];
    this.wheels = [[], []];
    this.disposables = [];
    this.destroyed = false;
    this._build();
    this.setPreset(presetId);
  }

  _mat(m) { this.disposables.push(m); return m; }
  _geo(g) { this.disposables.push(g); return g; }

  _add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, name) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    if (name) m.name = name;
    parent.add(m);
    return m;
  }

  _build() {
    const size = this.quality === 'low' ? 256 : 512;
    this.texSize = size;
    this.paint = this._mat(addGrime(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.15, roughness: 1, envMapIntensity: 1 })));
    this.steel = this._mat(addGrime(new THREE.MeshStandardMaterial({ color: 0x2a2a28, metalness: 0.75, roughness: 0.55 }), true));
    this.rubber = this._mat(addGrime(new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0, roughness: 0.9 }), true));
    this.darkMetal = this._mat(new THREE.MeshStandardMaterial({ color: 0x1b1b1a, metalness: 0.7, roughness: 0.62 }));
    this.glass = this._mat(new THREE.MeshStandardMaterial({ color: 0x223040, metalness: 0.2, roughness: 0.08, emissive: 0xfff2d0, emissiveIntensity: 0 }));
    this.periscope = this._mat(new THREE.MeshStandardMaterial({ color: 0x0c1418, metalness: 0.9, roughness: 0.05 }));

    const g = this.group;
    this.hull = new THREE.Group(); this.hull.name = 'hull'; g.add(this.hull);

    // Upper hull: sloped glacis, deck, rear plate (extruded side profile, full width over the tracks).
    const up = new THREE.Shape();
    [[-3.45, 1.02], [-2.3, 1.56], [2.95, 1.62], [3.3, 1.12], [3.25, 1.02]].forEach(([z, y], i) => (i ? up.lineTo(z, y) : up.moveTo(z, y)));
    up.closePath();
    const upGeo = this._geo(new THREE.ExtrudeGeometry(up, { depth: 3.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, steps: 1 }));
    upGeo.rotateY(-Math.PI / 2); upGeo.translate(1.75, 0, 0);
    this._scaleUV(upGeo, 0.35);
    this._add(this.hull, upGeo, this.paint);

    // Lower hull between the tracks.
    const lo = new THREE.Shape();
    [[-3.3, 0.55], [-3.45, 1.04], [3.25, 1.04], [3.2, 0.5], [-2.9, 0.4]].forEach(([z, y], i) => (i ? lo.lineTo(z, y) : lo.moveTo(z, y)));
    lo.closePath();
    const loGeo = this._geo(new THREE.ExtrudeGeometry(lo, { depth: 2.1, bevelEnabled: false }));
    loGeo.rotateY(-Math.PI / 2); loGeo.translate(1.05, 0, 0);
    this._scaleUV(loGeo, 0.35);
    this._add(this.hull, loGeo, this.paint);

    // Engine deck grille slats + exhaust boxes.
    const slat = this._geo(new THREE.BoxGeometry(2.4, 0.05, 0.08));
    for (let i = 0; i < 12; i++) this._add(this.hull, slat, this.darkMetal, 0, 1.66, 1.2 + i * 0.13);
    const exh = this._geo(new THREE.BoxGeometry(0.7, 0.35, 0.25));
    this._add(this.hull, exh, this.steel, -1.1, 1.35, 3.25);
    this._add(this.hull, exh, this.steel, 1.1, 1.35, 3.25);
    this.exhausts = [new THREE.Vector3(-1.1, 1.4, 3.4), new THREE.Vector3(1.1, 1.4, 3.4)];

    // Headlight housings with emissive lenses (lit at night).
    const lampGeo = this._geo(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 14));
    lampGeo.rotateX(Math.PI / 2);
    const lensGeo = this._geo(new THREE.CircleGeometry(0.1, 14));
    for (const sx of [-1.35, 1.35]) {
      this._add(this.hull, lampGeo, this.steel, sx, 1.34, -3.25);
      const lens = this._add(this.hull, lensGeo, this.glass, sx, 1.34, -3.33, 0, Math.PI, 0);
      lens.castShadow = false;
    }
    // Tow hooks + fender lips.
    const hook = this._geo(new THREE.TorusGeometry(0.12, 0.035, 6, 10));
    this._add(this.hull, hook, this.steel, -0.8, 0.75, -3.4, 0, Math.PI / 2, 0);
    this._add(this.hull, hook, this.steel, 0.8, 0.75, -3.4, 0, Math.PI / 2, 0);
    const lip = this._geo(new THREE.BoxGeometry(0.72, 0.04, 6.9));
    this._add(this.hull, lip, this.paint, -1.43, 1.06, -0.05);
    this._add(this.hull, lip, this.paint, 1.43, 1.06, -0.05);
    // Stowage boxes on the fenders.
    const box = this._geo(new THREE.BoxGeometry(0.62, 0.38, 1.1));
    this._add(this.hull, box, this.paint, -1.43, 1.3, 0.4);
    this._add(this.hull, box, this.paint, 1.43, 1.3, -0.9);
    const can = this._geo(new THREE.BoxGeometry(0.16, 0.46, 0.34));
    this._add(this.hull, can, this.paint, 1.55, 1.32, 1.6);
    this._add(this.hull, can, this.paint, 1.55, 1.32, 2.0);

    // Running gear.
    const wheelGeo = this._geo(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 20));
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = this._geo(new THREE.CylinderGeometry(0.14, 0.18, 0.26, 10));
    hubGeo.rotateZ(Math.PI / 2);
    const sprGeo = this._geo(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12));
    sprGeo.rotateZ(Math.PI / 2);
    const rollerGeo = this._geo(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10));
    rollerGeo.rotateZ(Math.PI / 2);
    const sides = [-1, 1];
    sides.forEach((sx, si) => {
      const x = sx * 1.42;
      for (let i = 0; i < 5; i++) {
        const z = -2.2 + i * 1.1;
        for (const off of [-0.17, 0.17]) {
          const w = this._add(this.hull, wheelGeo, this.rubber, x + off, 0.42, z);
          this.wheels[si].push({ mesh: w, r: 0.36 });
        }
        const hub = this._add(this.hull, hubGeo, this.steel, x + sx * 0.2, 0.42, z);
        this.wheels[si].push({ mesh: hub, r: 0.36 });
      }
      this.wheels[si].push({ mesh: this._add(this.hull, sprGeo, this.steel, x, 0.7, 3.05), r: 0.34 });
      this.wheels[si].push({ mesh: this._add(this.hull, sprGeo, this.steel, x, 0.66, -3.0), r: 0.32 });
      for (let i = 0; i < 3; i++) this._add(this.hull, rollerGeo, this.steel, x, 0.93, -1.6 + i * 1.6);
    });

    // Track shoes: instanced, run around TRACK_PATH.
    const pitch = 0.17;
    this.shoeCount = Math.floor(TRACK_PATH.length / pitch);
    this.pitch = TRACK_PATH.length / this.shoeCount;
    const shoeGeo = this._geo(new THREE.BoxGeometry(0.68, 0.07, this.pitch * 0.86));
    // Grouser bar.
    const grouser = new THREE.BoxGeometry(0.68, 0.05, 0.04);
    grouser.translate(0, 0.05, 0);
    const merged = this._mergeBoxes(shoeGeo, grouser);
    this.tracks = sides.map((sx) => {
      const im = new THREE.InstancedMesh(merged, this.steel, this.shoeCount);
      im.castShadow = true; im.receiveShadow = true;
      im.userData.x = sx * 1.42;
      im.frustumCulled = false;
      this.hull.add(im);
      return im;
    });
    this._layoutTracks();

    // Turret.
    this.turret = new THREE.Group(); this.turret.name = 'turret';
    this.turret.position.set(0, 1.62, 0.25);
    g.add(this.turret);
    const shell = this._geo(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.5));
    shell.scale(1.38, 0.62, 1.72);
    this._scaleUV(shell, 1.2);
    this._add(this.turret, shell, this.paint, 0, 0.02, 0);
    const ring = this._geo(new THREE.CylinderGeometry(1.3, 1.38, 0.12, 32));
    this._add(this.turret, ring, this.paint, 0, 0.04, 0);
    const bustle = this._geo(new THREE.BoxGeometry(1.9, 0.42, 0.9));
    this._add(this.turret, bustle, this.paint, 0, 0.26, 1.6);
    // Stowage basket on the bustle.
    const rail = this._geo(new THREE.BoxGeometry(2.1, 0.04, 0.04));
    for (let i = 0; i < 3; i++) this._add(this.turret, rail, this.steel, 0, 0.5 + i * 0.1, 2.1);
    const bedroll = this._geo(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 10));
    bedroll.rotateZ(Math.PI / 2);
    this._add(this.turret, bedroll, this.rubber, 0, 0.62, 1.85);

    // Commander's cupola with MG and periscopes; loader's hatch.
    const cup = this._geo(new THREE.CylinderGeometry(0.42, 0.46, 0.34, 20));
    this._add(this.turret, cup, this.paint, 0.48, 0.66, 0.35);
    const hatch = this._geo(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 18));
    this._add(this.turret, hatch, this.paint, 0.48, 0.86, 0.35);
    this._add(this.turret, hatch, this.paint, -0.55, 0.6, 0.55);
    const pGeo = this._geo(new THREE.BoxGeometry(0.12, 0.08, 0.06));
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      this._add(this.turret, pGeo, this.periscope, 0.48 + Math.cos(a) * 0.43, 0.72, 0.35 + Math.sin(a) * 0.43, 0, -a, 0);
    }
    const mg = this._geo(new THREE.CylinderGeometry(0.03, 0.035, 1.1, 8));
    mg.rotateX(Math.PI / 2);
    this._add(this.turret, mg, this.darkMetal, 0.48, 0.98, -0.25);
    // Antenna (sways).
    const ant = this._geo(new THREE.CylinderGeometry(0.008, 0.015, 2.6, 5));
    ant.translate(0, 1.3, 0);
    this.antenna = this._add(this.turret, ant, this.darkMetal, -0.75, 0.45, 1.75);
    this.antenna.castShadow = false;
    // Smoke dischargers.
    const sd = this._geo(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8));
    sd.rotateX(Math.PI / 2 - 0.4);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) this._add(this.turret, sd, this.steel, sx * 1.12, 0.22 + i * 0.1, 0.55 + i * 0.02, 0, sx * 1.1, 0);
    // Insignia on both turret cheeks.
    this.insigniaMat = this._mat(new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.7, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const ins = this._geo(new THREE.PlaneGeometry(0.62, 0.62));
    const insL = this._add(this.turret, ins, this.insigniaMat, -1.23, 0.28, 0.2, 0, -Math.PI / 2 - 0.12, 0);
    const insR = this._add(this.turret, ins, this.insigniaMat, 1.23, 0.28, 0.2, 0, Math.PI / 2 + 0.12, 0);
    insL.castShadow = insR.castShadow = false;

    // Gun: mantlet + barrel + bore evacuator + muzzle brake.
    this.gun = new THREE.Group(); this.gun.name = 'gun';
    this.gun.position.set(0, 0.3, -1.45);
    this.turret.add(this.gun);
    const mant = this._geo(new THREE.BoxGeometry(1.0, 0.56, 0.5));
    this._scaleUV(mant, 0.5);
    this._add(this.gun, mant, this.paint, 0, 0, 0.05);
    const collar = this._geo(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 16));
    collar.rotateX(Math.PI / 2);
    this._add(this.gun, collar, this.paint, 0, 0, -0.35);
    const barrel = this._geo(new THREE.CylinderGeometry(0.085, 0.11, 4.5, 18));
    barrel.rotateX(Math.PI / 2);
    this._scaleUV(barrel, 0.6);
    this._add(this.gun, barrel, this.paint, 0, 0, -2.6);
    const evac = this._geo(new THREE.CylinderGeometry(0.15, 0.15, 0.55, 16));
    evac.rotateX(Math.PI / 2);
    this._add(this.gun, evac, this.paint, 0, 0, -3.1);
    const brake = this._geo(new THREE.CylinderGeometry(0.15, 0.15, 0.38, 14));
    brake.rotateX(Math.PI / 2);
    this._add(this.gun, brake, this.paint, 0, 0, -4.95);
    const vent = this._geo(new THREE.BoxGeometry(0.34, 0.12, 0.1));
    this._add(this.gun, vent, this.steel, 0, 0, -4.92);
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, -5.18);
    this.gun.add(this.muzzle);
  }

  _scaleUV(geo, s) {
    const uv = geo.attributes.uv;
    if (!uv) return;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  }

  _mergeBoxes(a, b) {
    const pos = [], nrm = [], uv = [], idx = [];
    let base = 0;
    for (const g of [a, b]) {
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); }
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base);
      base += p.count;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    m.setIndex(idx);
    b.dispose();
    this.disposables.push(m);
    return m;
  }

  _layoutTracks() {
    this.tracks.forEach((im, si) => {
      const phase = this.trackPhase[si];
      for (let i = 0; i < this.shoeCount; i++) {
        samplePath(i * this.pitch + phase, _sp);
        _p.set(im.userData.x, _sp.y, _sp.z);
        // Shoe normal points away from the wheels: rotate around X by path angle.
        _e.set(-_sp.ang, 0, 0);
        _q.setFromEuler(_e);
        _m.compose(_p, _q, _s);
        im.setMatrixAt(i, _m);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }

  setPreset(presetId) {
    const preset = TANK_PRESETS[presetId] || TANK_PRESETS.US;
    this.presetId = presetId;
    const t = paintTextures(preset.primaryColor || '#3d5236', this.texSize);
    this.paint.map = t.map;
    this.paint.roughnessMap = t.roughnessMap;
    this.paint.normalMap = t.normalMap;
    this.paint.normalScale.set(0.6, 0.6);
    this.paint.needsUpdate = true;
    if (this.insigniaMat.map) this.insigniaMat.map.dispose();
    this.insigniaMat.map = insigniaTexture(preset);
    this.insigniaMat.needsUpdate = true;
  }

  /** Headlights on/off (night presets). */
  setLights(on) { this.glass.emissiveIntensity = on ? 6 : 0; }

  /**
   * Advance tracks. leftSpeed / rightSpeed in m/s along the ground (negative = reverse).
   * Shoes on the ground stay put relative to the ground: they move opposite to travel.
   */
  driveTracks(dt, leftSpeed, rightSpeed) {
    if (!leftSpeed && !rightSpeed) return;
    this.trackPhase[0] -= leftSpeed * dt;
    this.trackPhase[1] -= rightSpeed * dt;
    this._layoutTracks();
    [leftSpeed, rightSpeed].forEach((v, si) => {
      for (const w of this.wheels[si]) w.mesh.rotation.x -= (v * dt) / w.r;
    });
  }

  update(dt, time, moving) {
    if (this.antenna) {
      const sway = moving ? 0.12 : 0.03;
      this.antenna.rotation.x = Math.sin(time * 3.1) * sway;
      this.antenna.rotation.z = Math.cos(time * 2.3) * sway * 0.6;
    }
  }

  setDestroyed() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const m of [this.paint, this.steel, this.rubber]) {
      m.color.setRGB(0.12, 0.11, 0.1);
      m.roughness = 1;
      m.metalness = 0.1;
    }
    this.insigniaMat.opacity = 0.25;
    this.turret.position.set(0.35, 1.78, 0.45);
    this.turret.rotation.set(-0.22, this.turret.rotation.y + 0.5, 0.32);
    this.gun.rotation.x = -0.18;
    this.setLights(false);
  }

  dispose() {
    this.group.removeFromParent();
    for (const d of this.disposables) d.dispose?.();
    this.insigniaMat.map?.dispose();
  }
}
