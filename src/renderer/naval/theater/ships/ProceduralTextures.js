import * as THREE from 'three';

/**
 * Runtime-generated PBR texture sets used by the placeholder ships, and a reference
 * for what the authored textures should contain:
 *
 *   steel:  panel seams + rivet rows (normal), paint mottling, rust streaks bleeding
 *           down from seams, chipped paint exposing bare metal (metalness 1 only there)
 *   deck:   teak planks with tar caulking, butt joints, per-plank tone variation
 *
 * All maps tile. Generated once at load (~40 ms each at 512^2); production assets
 * replace these with baked KTX2 textures.
 */

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise: lattice wraps at `period`. */
function makeNoise(seed) {
  const rng = makeRng(seed);
  const perm = new Float32Array(256 * 256);
  for (let i = 0; i < perm.length; i++) perm[i] = rng();
  const lat = (x, y, period) => perm[((y % period + period) % period) * 256 + ((x % period + period) % period)];
  const noise = (x, y, period) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = lat(xi, yi, period), b = lat(xi + 1, yi, period), c = lat(xi, yi + 1, period), d = lat(xi + 1, yi + 1, period);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  return (u, v, basePeriod, octaves = 4) => {
    let s = 0, amp = 0.5, p = basePeriod;
    for (let o = 0; o < octaves; o++) { s += amp * noise(u * p, v * p, p); amp *= 0.5; p *= 2; }
    return s;
  };
}

function heightToNormal(height, size, strength) {
  const out = new Uint8Array(size * size * 4);
  const h = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      out[o] = (-dx * inv * 0.5 + 0.5) * 255;
      out[o + 1] = (dy * inv * 0.5 + 0.5) * 255;
      out[o + 2] = (inv * 0.5 + 0.5) * 255;
      out[o + 3] = 255;
    }
  }
  return out;
}

function tex(data, size, srgb) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/**
 * Weathered naval steel. Returns { map, normalMap, roughnessMap, metalnessMap }.
 * Roughness/metalness are packed glTF-style into one texture (G = roughness, B = metalness)
 * so the same texture object can serve both slots.
 */
export function createSteelTextures({ size = 512, seed = 1, base = [112, 118, 124], panelW = 128, panelH = 64, rust = 1 } = {}) {
  const rng = makeRng(seed);
  const fbm = makeNoise(seed);
  const n = size * size;
  const height = new Float32Array(n);
  const albedo = new Uint8Array(n * 4);
  const orm = new Uint8Array(n * 4);
  const rustMask = new Float32Array(n);

  // Rust streak sources along horizontal seams; streaks run "down" (+y in texture).
  const streaks = [];
  for (let i = 0; i < 40 * rust; i++) {
    streaks.push({ x: rng() * size, y: Math.floor(rng() * (size / panelH)) * panelH, len: 10 + rng() * 70, w: 1 + rng() * 3, s: 0.3 + rng() * 0.7 });
  }
  for (const s of streaks) {
    for (let y = 0; y < s.len; y++) {
      const fall = 1 - y / s.len;
      for (let dx = -s.w * 2; dx <= s.w * 2; dx++) {
        const px = Math.floor(s.x + dx + Math.sin(y * 0.15) * 1.5);
        const py = Math.floor(s.y + y);
        const idx = ((py % size + size) % size) * size + ((px % size + size) % size);
        rustMask[idx] = Math.max(rustMask[idx], fall * s.s * Math.exp(-(dx * dx) / (s.w * s.w)));
      }
    }
  }

  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / panelH);
    const offset = (row % 2) * (panelW / 2); // staggered plating
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const u = x / size, v = y / size;
      const lx = (x + offset) % panelW, ly = y % panelH;
      const seamDist = Math.min(lx, panelW - lx, ly, panelH - ly);
      let h = 0;
      if (seamDist < 1.5) h -= 1.0;                                 // weld seam groove
      // Rivet rows 5 px inside each horizontal seam, every 9 px.
      const ry = Math.min(Math.abs(ly - 5), Math.abs(ly - (panelH - 5)));
      const rx = (lx % 9) - 4.5;
      const rr = Math.hypot(rx, ry);
      if (rr < 1.8) h += 0.9 * (1 - rr / 1.8);
      // Slight plate "oil canning" between frames.
      h += Math.sin((lx / panelW) * Math.PI) * Math.sin((ly / panelH) * Math.PI) * 0.35;
      const mott = fbm(u, v, 8);
      h += (mott - 0.5) * 0.25;
      height[i] = h;

      const chip = fbm(u + 0.37, v + 0.11, 32, 3) > 0.69 ? 1 : 0;
      const grime = (seamDist < 3 ? 0.18 : 0) + (1 - mott) * 0.15;
      const rm = Math.min(1, rustMask[i] + (fbm(u + 0.7, v, 16, 3) > 0.72 ? 0.5 : 0) * rust);

      let r = base[0] * (0.9 + mott * 0.2) * (1 - grime);
      let g = base[1] * (0.9 + mott * 0.2) * (1 - grime);
      let b = base[2] * (0.9 + mott * 0.2) * (1 - grime);
      r = r * (1 - rm) + 110 * rm; g = g * (1 - rm) + 62 * rm; b = b * (1 - rm) + 36 * rm;
      if (chip) { r = 150; g = 150; b = 148; }
      const o = i * 4;
      albedo[o] = r; albedo[o + 1] = g; albedo[o + 2] = b; albedo[o + 3] = 255;

      // Painted steel is a dielectric in PBR terms; only bare chips are metal.
      const rough = chip ? 0.38 : 0.55 + mott * 0.2 + rm * 0.25 + grime * 0.3;
      orm[o] = 255;                                   // AO (baked per model in production)
      orm[o + 1] = Math.min(1, rough) * 255;
      orm[o + 2] = chip ? 255 : 10;
      orm[o + 3] = 255;
    }
  }

  const ormTex = tex(orm, size, false);
  return {
    map: tex(albedo, size, true),
    normalMap: tex(heightToNormal(height, size, 1.4), size, false),
    roughnessMap: ormTex,
    metalnessMap: ormTex,
  };
}

/** Teak deck planks with caulking. Planks run along texture U. */
export function createDeckTextures({ size = 512, seed = 9, plankW = 16 } = {}) {
  const rng = makeRng(seed);
  const fbm = makeNoise(seed);
  const n = size * size;
  const height = new Float32Array(n);
  const albedo = new Uint8Array(n * 4);
  const orm = new Uint8Array(n * 4);
  const rows = size / plankW;
  const tones = [], joints = [];
  for (let r = 0; r < rows; r++) { tones.push(0.82 + rng() * 0.3); joints.push(Math.floor(rng() * size)); }

  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / plankW);
    const ly = y % plankW;
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const u = x / size, v = y / size;
      const grain = fbm(u * 0.25, v * 4, 8, 4);  // stretched along the plank
      const butt = Math.abs(((x - joints[row]) % (size / 2) + size / 2) % (size / 2)) < 1.2;
      const caulk = ly < 1.5 || butt;
      height[i] = caulk ? -1 : (grain - 0.5) * 0.4;
      const tone = tones[row] * (0.85 + grain * 0.3);
      const o = i * 4;
      if (caulk) { albedo[o] = 28; albedo[o + 1] = 24; albedo[o + 2] = 20; }
      else { albedo[o] = 142 * tone; albedo[o + 1] = 112 * tone; albedo[o + 2] = 78 * tone; }
      albedo[o + 3] = 255;
      orm[o] = 255; orm[o + 1] = (caulk ? 0.5 : 0.72 + grain * 0.15) * 255; orm[o + 2] = 0; orm[o + 3] = 255;
    }
  }
  const ormTex = tex(orm, size, false);
  return {
    map: tex(albedo, size, true),
    normalMap: tex(heightToNormal(height, size, 1.2), size, false),
    roughnessMap: ormTex,
    metalnessMap: ormTex,
  };
}
