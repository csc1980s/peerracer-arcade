import * as THREE from 'three';

/**
 * Uniform objects shared by every custom shader (ocean, particles, wake).
 * They are referenced, not copied, so SkySystem updates propagate for free.
 */
export const atmosphere = {
  uSunDir: { value: new THREE.Vector3(0.3, 0.2, -0.9).normalize() },
  uSunColor: { value: new THREE.Color(1, 0.8, 0.6) },
  uAmbient: { value: new THREE.Color(0.3, 0.35, 0.4) },
  uFogColor: { value: new THREE.Color(0.6, 0.6, 0.65) },
  uFogDensity: { value: 0.00015 },
  uWind: { value: new THREE.Vector3(3, 0, 1) },
  uTime: { value: 0 },
};

/** Screen-space buffers from the opaque pre-pass (filled by PostPipeline). */
export const sceneBuffers = {
  uSceneColor: { value: null },
  uSceneDepth: { value: null },
  uResolution: { value: new THREE.Vector2(1, 1) },
  uCameraNear: { value: 1 },
  uCameraFar: { value: 20000 },
  uProjection: { value: new THREE.Matrix4() },
  uSunDirView: { value: new THREE.Vector3() },
};

export const LAYERS = {
  OPAQUE: 0,     // ships, props: rendered in the reflection/refraction pre-pass
  WATER: 1,      // ocean surface
  EFFECTS: 2,    // particles
};

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x),
                 mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x),
                 mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
float fbm2(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise2(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
`;

export const DEPTH_GLSL = /* glsl */ `
float linearDepth(float d, float n, float f) {
  float z = d * 2.0 - 1.0;
  return 2.0 * n * f / (f + n - z * (f - n));
}
`;

export const FOG_GLSL = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
vec3 applyFog(vec3 col, float dist) {
  float f = 1.0 - exp(-dist * uFogDensity);
  return mix(col, uFogColor, clamp(f, 0.0, 1.0));
}
`;
