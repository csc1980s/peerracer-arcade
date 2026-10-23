/**
 * Gerstner wave spectrum shared by the GPU ocean shader and CPU buoyancy.
 *
 * One source of truth: the same wave list feeds the vertex shader uniforms and
 * sampleHeight(), so ships ride exactly the surface that is drawn.
 */

export const GRAVITY = 9.81;
export const MAX_WAVES = 8;

// Sea states. `steepness` is the summed Gerstner steepness (must stay < 1 or crests loop).
export const SEA_STATES = {
  calm:  { wavelength: 70,  steepness: 0.55, windAngle: 0.6, spread: 1.8, count: 8, seed: 7 },
  swell: { wavelength: 110, steepness: 0.68, windAngle: 0.6, spread: 1.7, count: 8, seed: 11 },
  storm: { wavelength: 160, steepness: 0.86, windAngle: 0.9, spread: 1.9, count: 8, seed: 23 },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a deterministic wave list. Each wave: { dx, dz, steepness, k, c, phase, amplitude, wavelength }.
 * Wavelength falls off geometrically; steepness is split so long swells carry most of the height.
 */
export function createWaveSet(state = SEA_STATES.swell) {
  const rand = mulberry32(state.seed);
  const waves = [];
  const weights = [];
  for (let i = 0; i < state.count; i++) weights.push(Math.pow(0.84, i));
  const wSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < state.count; i++) {
    const wavelength = state.wavelength * Math.pow(0.66, i) * (0.85 + rand() * 0.3);
    const angle = state.windAngle + (rand() - 0.5) * state.spread * (0.6 + i * 0.12);
    const k = (2 * Math.PI) / wavelength;
    const steepness = (state.steepness * weights[i]) / wSum;
    waves.push({
      dx: Math.cos(angle),
      dz: Math.sin(angle),
      steepness,
      k,
      c: Math.sqrt(GRAVITY / k),
      phase: rand() * Math.PI * 2,
      amplitude: steepness / k,
      wavelength,
    });
  }
  return waves;
}

/** Small fragment-only waves for normal detail (never displace geometry). */
export function createDetailWaves(seed = 3) {
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < 6; i++) {
    const wavelength = 9 * Math.pow(0.62, i) * (0.8 + rand() * 0.4);
    const k = (2 * Math.PI) / wavelength;
    const angle = rand() * Math.PI * 2;
    out.push({ dx: Math.cos(angle), dz: Math.sin(angle), steepness: 0.05 + rand() * 0.04, k, c: Math.sqrt(GRAVITY / k), phase: rand() * 6.283 });
  }
  return out;
}

/** Packs waves into uniform arrays: A = (dx, dz, steepness, k), B = (c, phase). */
export function packWaves(waves, vec4ArrayA, vec2ArrayB) {
  for (let i = 0; i < vec4ArrayA.length; i++) {
    const w = waves[i];
    if (w) {
      vec4ArrayA[i].set(w.dx, w.dz, w.steepness, w.k);
      vec2ArrayB[i].set(w.c, w.phase);
    } else {
      vec4ArrayA[i].set(1, 0, 0, 1);
      vec2ArrayB[i].set(0, 0);
    }
  }
}

/** Gerstner displacement at an undisplaced grid point (x, z). Mirrors the GLSL exactly. */
export function gerstnerDisplacement(waves, x, z, t, out = { x: 0, y: 0, z: 0 }) {
  out.x = 0; out.y = 0; out.z = 0;
  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    const f = w.k * (w.dx * x + w.dz * z - w.c * t) + w.phase;
    const a = w.steepness / w.k;
    const cf = Math.cos(f);
    out.x += w.dx * a * cf;
    out.y += a * Math.sin(f);
    out.z += w.dz * a * cf;
  }
  return out;
}

const _d = { x: 0, y: 0, z: 0 };
/**
 * Water height at world (x, z). Gerstner moves points horizontally, so we invert
 * the horizontal displacement with a few fixed-point iterations (converges in 3-4).
 */
export function sampleHeight(waves, x, z, t, iterations = 4) {
  let px = x, pz = z;
  for (let i = 0; i < iterations; i++) {
    gerstnerDisplacement(waves, px, pz, t, _d);
    px -= (px + _d.x) - x;
    pz -= (pz + _d.z) - z;
  }
  gerstnerDisplacement(waves, px, pz, t, _d);
  return _d.y;
}

/** GLSL implementation (vertex stage). Requires uWaveA[], uWaveB[], uTime, WAVE_COUNT define. */
export const GERSTNER_GLSL = /* glsl */ `
uniform vec4 uWaveA[WAVE_COUNT];   // dir.x, dir.z, steepness, k
uniform vec2 uWaveB[WAVE_COUNT];   // phase speed c, phase offset

// Returns displacement; accumulates tangent/binormal and the 2x2 Jacobian used for foam.
vec3 gerstnerSum(vec2 p, float t, float lodDist, inout vec3 tangent, inout vec3 binormal, out float jacobian) {
  vec3 d = vec3(0.0);
  float jxx = 1.0, jzz = 1.0, jxz = 0.0;
  for (int i = 0; i < WAVE_COUNT; i++) {
    vec4 A = uWaveA[i];
    vec2 B = uWaveB[i];
    float k = A.w;
    // Fade waves that the grid can no longer resolve at this distance (prevents shimmer).
    float wavelength = 6.2831853 / k;
    float fade = 1.0 - smoothstep(wavelength * 25.0, wavelength * 60.0, lodDist);
    float s = A.z * fade;
    float f = k * (dot(A.xy, p) - B.x * t) + B.y;
    float a = s / k;
    float sf = sin(f), cf = cos(f);
    d.x += A.x * a * cf;
    d.y += a * sf;
    d.z += A.y * a * cf;
    tangent  += vec3(-A.x * A.x * s * sf, A.x * s * cf, -A.x * A.y * s * sf);
    binormal += vec3(-A.x * A.y * s * sf, A.y * s * cf, -A.y * A.y * s * sf);
    jxx -= A.x * A.x * s * sf;
    jzz -= A.y * A.y * s * sf;
    jxz -= A.x * A.y * s * sf;
  }
  jacobian = jxx * jzz - jxz * jxz;
  return d;
}
`;
