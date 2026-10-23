import * as THREE from 'three';
import { GERSTNER_GLSL, MAX_WAVES, createWaveSet, createDetailWaves, packWaves, SEA_STATES } from './waves.js';
import { atmosphere, sceneBuffers, LAYERS, NOISE_GLSL, DEPTH_GLSL } from '../shared.js';

export const MAX_SHIPS = 16;

/**
 * Camera-following, radially-dense ocean grid. Center spacing ~1 m, edge ~60 m,
 * radius 8 km so the horizon is always covered (fog hides the edge).
 */
function createOceanGeometry(segments, radius) {
  const g = new THREE.PlaneGeometry(2, 2, segments, segments);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const a = 0.03; // linear share -> controls center vertex spacing
  const remap = (u) => Math.sign(u) * radius * (a * Math.abs(u) + (1 - a) * u * u);
  for (let i = 0; i < p.count; i++) {
    p.setX(i, remap(p.getX(i)));
    p.setZ(i, remap(p.getZ(i)));
  }
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g.computeBoundingSphere();
  g.boundingSphere.radius = radius * 2;
  return g;
}

const vertexShader = /* glsl */ `
#define WAVE_COUNT ${MAX_WAVES}
#define MAX_SHIPS ${MAX_SHIPS}
uniform float uTime;
uniform vec4 uShipA[MAX_SHIPS];   // x, z, heading, speed (m/s)
uniform vec4 uShipB[MAX_SHIPS];   // length, beam, wake strength, unused
uniform int uShipCount;
uniform sampler2D uWakeMap;
uniform vec4 uWakeRect;           // minX, minZ, size, 1/size

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vFoam;
varying float vHeight;
varying vec3 vViewPos;
varying vec2 vWakeUv;

${GERSTNER_GLSL}

// Analytic Kelvin wake + bow wave for every ship. Returns (height, foam).
vec2 shipDisturbance(vec2 p) {
  vec2 acc = vec2(0.0);
  for (int i = 0; i < MAX_SHIPS; i++) {
    if (i >= uShipCount) break;
    vec4 A = uShipA[i];
    vec4 B = uShipB[i];
    float L = B.x, beam = B.y, strength = B.z;
    vec2 rel = p - A.xy;
    if (strength <= 0.0 || dot(rel, rel) > L * L * 36.0) continue;
    vec2 fwd = vec2(sin(A.z), cos(A.z));
    vec2 right = vec2(cos(A.z), -sin(A.z));
    float along = dot(rel, fwd);
    float side = dot(rel, right);
    float aside = abs(side);
    float speed = A.w;
    float sp = clamp(speed / 14.0, 0.0, 1.5) * strength;

    // Bow wave: water piled against the hull just aft of the stem.
    float bowZ = along - L * 0.38;
    float bow = exp(-bowZ * bowZ / (L * L * 0.012)) * exp(-(aside - beam * 0.6) * (aside - beam * 0.6) / (beam * beam * 0.35));
    acc.x += bow * 1.6 * sp;
    acc.y += bow * 1.1 * sp;

    // Kelvin wedge (19.47 deg half angle) behind the bow.
    float d = L * 0.5 - along;
    if (d > 0.0) {
      float armDist = aside - d * 0.3536 - beam * 0.4;
      float width = beam * 0.45 + d * 0.06;
      float arm = exp(-armDist * armDist / (width * width));
      float decay = exp(-d / (L * 3.5));
      float lambda = max(6.2831853 * speed * speed / 9.81, 8.0);
      float diverging = cos(6.2831853 * (d * 0.8 + aside * 0.6) / (lambda * 0.45));
      acc.x += arm * decay * (0.5 + 0.5 * diverging) * 0.9 * sp;
      float inside = smoothstep(0.0, -width, armDist);
      acc.x += inside * cos(6.2831853 * d / lambda) * exp(-d / (L * 2.0)) * 0.35 * sp;
      acc.y += arm * exp(-d / (L * 1.2)) * smoothstep(0.3, 1.0, 0.5 + 0.5 * diverging) * 0.8 * sp;
      // Propeller wash: turbulent centerline right behind the stern.
      float stern = d - L;
      if (stern > -L * 0.1) {
        float ww = max(beam * 0.5 + stern * 0.04, 1.0);
        float wash = exp(-side * side / (ww * ww)) * exp(-max(stern, 0.0) / (L * 1.5));
        acc.y += wash * 0.9 * sp;
        acc.x -= wash * 0.25 * sp;
      }
    }
  }
  return acc;
}

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 p = world.xz;
  float lodDist = length(p - cameraPosition.xz);

  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);
  float jac;
  vec3 disp = gerstnerSum(p, uTime, lodDist, tangent, binormal, jac);
  vec3 n = normalize(cross(binormal, tangent));

  // Ship-induced waves (finite differences for the normal).
  vec2 sd = shipDisturbance(p);
  if (sd.x != 0.0 || sd.y != 0.0) {
    float e = 1.5;
    float hx = shipDisturbance(p + vec2(e, 0.0)).x;
    float hz = shipDisturbance(p + vec2(0.0, e)).x;
    n = normalize(n + vec3(-(hx - sd.x) / e, 0.0, -(hz - sd.x) / e));
  }

  vec3 pos = vec3(p.x + disp.x, disp.y + sd.x, p.y + disp.z);

  // Wake map: turbulence (G) lowers the surface slightly behind propellers.
  vWakeUv = (pos.xz - uWakeRect.xy) * uWakeRect.w;

  vWorldPos = pos;
  vNormal = n;
  vHeight = disp.y;
  // Foam where the surface folds (Jacobian < threshold) plus ship foam.
  vFoam = clamp((0.62 - jac) * 2.2, 0.0, 1.0) + sd.y;
  vec4 mv = viewMatrix * vec4(pos, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
#define SSR_STEPS ${'${SSR_STEPS}'}
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform samplerCube uEnvMap;
uniform vec3 uDeepColor;
uniform vec3 uScatterColor;
uniform float uSunSpecular;
uniform sampler2D uWakeMap;
uniform vec4 uDetailA[6];
uniform vec2 uDetailB[6];
uniform sampler2D uSceneColor;
uniform sampler2D uSceneDepth;
uniform vec2 uResolution;
uniform float uCameraNear, uCameraFar;
uniform mat4 uProjection;
uniform float uSSRStrength;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vFoam;
varying float vHeight;
varying vec3 vViewPos;
varying vec2 vWakeUv;

${NOISE_GLSL}
${DEPTH_GLSL}

vec3 detailNormal(vec2 p, float dist) {
  vec3 t = vec3(1.0, 0.0, 0.0), b = vec3(0.0, 0.0, 1.0);
  for (int i = 0; i < 6; i++) {
    vec4 A = uDetailA[i];
    float k = A.w;
    float lambda = 6.2831853 / k;
    float s = A.z * (1.0 - smoothstep(lambda * 15.0, lambda * 45.0, dist));
    float f = k * (dot(A.xy, p) - uDetailB[i].x * uTime) + uDetailB[i].y;
    float sf = sin(f), cf = cos(f);
    t += vec3(-A.x * A.x * s * sf, A.x * s * cf, -A.x * A.y * s * sf);
    b += vec3(-A.x * A.y * s * sf, A.y * s * cf, -A.y * A.y * s * sf);
  }
  return normalize(cross(b, t));
}

// GGX specular for the sun; roughness grows with distance to stand in for unresolved waves.
float ggx(vec3 N, vec3 H, float r) {
  float a2 = r * r * r * r;
  float d = max(dot(N, H), 0.0);
  float k = d * d * (a2 - 1.0) + 1.0;
  return a2 / (3.14159 * k * k);
}

vec2 viewToUv(vec3 v) {
  vec4 c = uProjection * vec4(v, 1.0);
  return c.xy / c.w * 0.5 + 0.5;
}

// Water-specific SSR: march the reflected ray against the opaque pre-pass depth.
vec4 traceSSR(vec3 origin, vec3 dir, float jitter) {
#if SSR_STEPS > 0
  float t = 1.5 + jitter * 1.5;
  vec3 prev = origin;
  for (int i = 0; i < SSR_STEPS; i++) {
    vec3 p = origin + dir * t;
    vec2 uv = viewToUv(p);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || p.z > -uCameraNear) break;
    float sceneZ = linearDepth(texture2D(uSceneDepth, uv).r, uCameraNear, uCameraFar);
    float rayZ = -p.z;
    float diff = rayZ - sceneZ;
    if (diff > 0.0 && diff < t * 0.35 + 2.0) {
      // Binary refinement between prev and p.
      vec3 a = prev, b = p;
      for (int j = 0; j < 4; j++) {
        vec3 m = (a + b) * 0.5;
        vec2 muv = viewToUv(m);
        float mz = linearDepth(texture2D(uSceneDepth, muv).r, uCameraNear, uCameraFar);
        if (-m.z > mz) b = m; else a = m;
      }
      vec2 huv = viewToUv(b);
      vec2 edge = smoothstep(vec2(0.0), vec2(0.08), huv) * smoothstep(vec2(1.0), vec2(0.92), huv);
      float fade = edge.x * edge.y * (1.0 - float(i) / float(SSR_STEPS));
      return vec4(texture2D(uSceneColor, huv).rgb, fade);
    }
    prev = p;
    t *= 1.22;
  }
#endif
  return vec4(0.0);
}

void main() {
  vec3 toCam = cameraPosition - vWorldPos;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec3 L = normalize(uSunDir);

  vec3 Nd = detailNormal(vWorldPos.xz, dist);
  vec4 wake = vec4(0.0);
  if (all(greaterThan(vWakeUv, vec2(0.0))) && all(lessThan(vWakeUv, vec2(1.0)))) wake = texture2D(uWakeMap, vWakeUv);
  float turb = clamp(wake.g, 0.0, 1.0);
  vec3 N = normalize(vec3(vNormal.x + Nd.x * (1.0 + turb * 3.0), vNormal.y, vNormal.z + Nd.z * (1.0 + turb * 3.0)));
  // Blend towards up far away: kills sparkle aliasing at grazing angles.
  N = normalize(mix(N, vec3(0.0, 1.0, 0.0), smoothstep(1500.0, 7000.0, dist) * 0.7));

  float NdV = max(dot(N, V), 0.0);
  // Schlick, damped at grazing angles where unresolved micro-waves shadow the reflection.
  float fresnel = (0.02 + 0.98 * pow(1.0 - NdV, 5.0)) * 0.8;

  // Reflection: environment cube + screen-space hits on ships.
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 env = textureCube(uEnvMap, R).rgb;
  vec3 viewN = normalize((viewMatrix * vec4(N, 0.0)).xyz);
  vec3 viewR = reflect(normalize(vViewPos), viewN);
  vec4 ssr = traceSSR(vViewPos, viewR, hash12(gl_FragCoord.xy));
  vec3 reflection = mix(env, ssr.rgb, ssr.a * uSSRStrength);

  // Water body: deep absorption + subsurface scattering through backlit crests.
  float sunUp = clamp(L.y * 4.0, 0.0, 1.0);
  vec3 body = uDeepColor * (0.25 + 0.75 * sunUp) * (uSunColor * 0.4 + 0.6);
  float crest = clamp(vHeight * 0.35 + 0.45, 0.0, 1.0);
  float sssView = pow(clamp(dot(-V, L) * 0.5 + 0.5, 0.0, 1.0), 4.0);
  float sssNormal = pow(clamp(0.5 - 0.5 * dot(L, N), 0.0, 1.0), 2.0);
  body += uScatterColor * uSunColor * (sssView * sssNormal * crest * 2.5 + crest * 0.25 * sunUp);

  // Refraction of submerged geometry (sinking hulls, near-surface parts).
  vec2 suv = gl_FragCoord.xy / uResolution;
  float waterZ = -vViewPos.z;
  float sceneZ = linearDepth(texture2D(uSceneDepth, suv).r, uCameraNear, uCameraFar);
  float thickness = sceneZ - waterZ;
  if (thickness > 0.0 && thickness < 60.0) {
    vec2 ruv = suv + N.xz * 0.025 * clamp(thickness / 10.0, 0.0, 1.0);
    float rz = linearDepth(texture2D(uSceneDepth, ruv).r, uCameraNear, uCameraFar);
    if (rz < waterZ) ruv = suv;
    vec3 under = texture2D(uSceneColor, ruv).rgb;
    float transmit = exp(-thickness * 0.12);
    body = mix(body, under * vec3(0.35, 0.75, 0.8), transmit * 0.85);
  }

  vec3 color = mix(body, reflection, fresnel);

  // Sun glint (HDR: feeds bloom).
  vec3 H = normalize(L + V);
  float rough = mix(0.08, 0.28, smoothstep(50.0, 3000.0, dist));
  float spec = min(ggx(N, H, rough) * fresnel * uSunSpecular, 24.0);
  color += uSunColor * spec * step(0.0, L.y + 0.05);

  // Foam: crests (Jacobian), ship wakes (analytic), persistent trails (wake map).
  vec2 fp = vWorldPos.xz;
  float foamNoise = fbm2(fp * 0.11 + vec2(uTime * 0.05, 0.0)) * 0.6 + vnoise2(fp * 0.9 - uTime * 0.2) * 0.4;
  float foamAmt = clamp(vFoam + wake.r, 0.0, 2.0);
  float foam = smoothstep(1.0 - foamAmt * 0.9, 1.05 - foamAmt * 0.6, foamNoise) * min(foamAmt * 1.6, 1.0);
  foam *= 1.0 - smoothstep(2000.0, 6000.0, dist) * 0.8;
  vec3 foamCol = vec3(0.92, 0.95, 0.97) * (uSunColor * max(dot(N, L), 0.0) * 0.8 + env * 0.6);
  color = mix(color, foamCol, clamp(foam, 0.0, 1.0));

  // Horizon haze: fade to the sky colour exactly at the horizon so there is no seam.
  vec3 horizonDir = normalize(vec3(-V.x, 0.015, -V.z));
  vec3 haze = mix(uFogColor, textureCube(uEnvMap, horizonDir).rgb, 0.85);
  float fog = 1.0 - exp(-dist * uFogDensity);
  color = mix(color, haze, clamp(fog, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class OceanSurface {
  /**
   * @param {object} opts
   * @param {number} opts.segments  grid resolution (256 low, 384 medium, 512 high)
   * @param {number} opts.ssrSteps  0 disables SSR
   */
  constructor({ segments = 512, radius = 8000, ssrSteps = 24, seaState = SEA_STATES.swell, wakeField = null } = {}) {
    this.waves = createWaveSet(seaState);
    this.detailWaves = createDetailWaves();
    this.wakeField = wakeField;

    const waveA = Array.from({ length: MAX_WAVES }, () => new THREE.Vector4());
    const waveB = Array.from({ length: MAX_WAVES }, () => new THREE.Vector2());
    packWaves(this.waves, waveA, waveB);
    const detA = Array.from({ length: 6 }, () => new THREE.Vector4());
    const detB = Array.from({ length: 6 }, () => new THREE.Vector2());
    packWaves(this.detailWaves, detA, detB);

    this.uniforms = {
      uTime: atmosphere.uTime,
      uSunDir: atmosphere.uSunDir,
      uSunColor: atmosphere.uSunColor,
      uFogColor: atmosphere.uFogColor,
      uFogDensity: atmosphere.uFogDensity,
      uWaveA: { value: waveA },
      uWaveB: { value: waveB },
      uDetailA: { value: detA },
      uDetailB: { value: detB },
      uShipA: { value: Array.from({ length: MAX_SHIPS }, () => new THREE.Vector4()) },
      uShipB: { value: Array.from({ length: MAX_SHIPS }, () => new THREE.Vector4()) },
      uShipCount: { value: 0 },
      uWakeMap: { value: wakeField ? wakeField.texture : null },
      uWakeRect: { value: wakeField ? wakeField.rect : new THREE.Vector4(0, 0, 1, 1) },
      uEnvMap: { value: null },
      uDeepColor: { value: new THREE.Color(0.004, 0.03, 0.055) },
      uScatterColor: { value: new THREE.Color(0.03, 0.22, 0.2) },
      uSunSpecular: { value: 1.0 },
      uSSRStrength: { value: 1.0 },
      ...sceneBuffers,
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader: fragmentShader.replace('${SSR_STEPS}', String(ssrSteps | 0)),
    });

    this.mesh = new THREE.Mesh(createOceanGeometry(segments, radius), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(LAYERS.WATER);
    this.mesh.renderOrder = -1;
  }

  setSeaState(state) {
    this.waves = createWaveSet(state);
    packWaves(this.waves, this.uniforms.uWaveA.value, this.uniforms.uWaveB.value);
  }

  setWaterColors(deep, scatter) {
    this.uniforms.uDeepColor.value.copy(deep);
    this.uniforms.uScatterColor.value.copy(scatter);
  }

  /** Push ship transforms for analytic wakes. ships: [{x, z, heading, speed, length, beam, wakeStrength}] */
  setShips(ships) {
    const A = this.uniforms.uShipA.value, B = this.uniforms.uShipB.value;
    const n = Math.min(ships.length, MAX_SHIPS);
    for (let i = 0; i < n; i++) {
      const s = ships[i];
      A[i].set(s.x, s.z, s.heading, s.speed);
      B[i].set(s.length, s.beam, s.wakeStrength ?? 1, 0);
    }
    this.uniforms.uShipCount.value = n;
  }

  update(camera) {
    // Follow the camera, snapped to the finest grid spacing to avoid vertex swimming.
    const snap = 8;
    this.mesh.position.set(Math.round(camera.position.x / snap) * snap, 0, Math.round(camera.position.z / snap) * snap);
    if (this.wakeField) this.uniforms.uWakeMap.value = this.wakeField.texture;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
