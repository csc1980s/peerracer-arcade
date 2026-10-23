import * as THREE from 'three';
import { atmosphere, sceneBuffers, LAYERS, NOISE_GLSL, DEPTH_GLSL, FOG_GLSL } from '../shared.js';

/**
 * Stateless GPU particles. Each particle is written ONCE at spawn (ring buffer);
 * its whole life (ballistics with drag, growth, colour ramp, fade) is evaluated in
 * the vertex shader from (spawn time, origin, velocity). No per-frame CPU work per
 * particle, one draw call per pool, and no allocations during combat.
 *
 * Kinds: 'fire' (additive HDR), 'smoke' (lit, alpha), 'spray' (white water, alpha),
 *        'debris' (dark shards + sparks, alpha-tested).
 */

const vertexShader = /* glsl */ `
attribute vec4 iA; // origin.xyz, spawn time
attribute vec4 iB; // velocity.xyz, lifetime
attribute vec4 iC; // size start, size end, spin, seed
attribute vec4 iD; // drag, gravity scale (negative = buoyant), brightness, opacity
attribute vec4 iE; // tint rgb, wind influence
uniform float uTime;
uniform vec3 uWind;
varying vec2 vUv;
varying float vLife;
varying vec4 vTint;
varying vec4 vParams;
varying float vSeed;
varying float vViewZ;
varying float vDist;
varying float vWaterFade;

void main() {
  float age = uTime - iA.w;
  float life = iB.w;
  vLife = age / life;
  if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }

  float drag = iD.x;
  vec3 g = vec3(0.0, -9.81 * iD.y, 0.0);
  vec3 pos;
  if (drag > 1e-3) {
    float e = exp(-drag * age);
    pos = iA.xyz + iB.xyz * (1.0 - e) / drag + g * (age / drag - (1.0 - e) / (drag * drag));
  } else {
    pos = iA.xyz + iB.xyz * age + 0.5 * g * age * age;
  }
  pos += uWind * iE.w * age;

  float size = mix(iC.x, iC.y, 1.0 - (1.0 - vLife) * (1.0 - vLife));
  float rot = iC.w * 6.2831 + iC.z * age;
  vec2 c = position.xy;
  c = vec2(c.x * cos(rot) - c.y * sin(rot), c.x * sin(rot) + c.y * cos(rot));

  vec4 mv = viewMatrix * vec4(pos, 1.0);
#ifdef STRETCH
  // Velocity-aligned streaks for sparks / tracers.
  vec3 vel = iB.xyz * exp(-drag * age) + g * age;
  vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz;
  vec2 dir2 = length(vv.xy) > 1e-3 ? normalize(vv.xy) : vec2(0.0, 1.0);
  vec2 perp = vec2(-dir2.y, dir2.x);
  mv.xy += perp * position.x * size + dir2 * position.y * size * (1.0 + length(vv.xy) * 0.04);
  vUv = position.xy + 0.5;
#else
  mv.xy += c * size;
  vUv = position.xy + 0.5;
#endif
  vTint = iE;
  vParams = iD;
  vSeed = iC.w;
  vViewZ = -mv.z;
  vDist = length(mv.xyz);
  vWaterFade = smoothstep(-2.5, 0.5, pos.y);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uSunColor;
uniform vec3 uSunDirView;
uniform vec3 uAmbient;
uniform sampler2D uSceneDepth;
uniform vec2 uResolution;
uniform float uCameraNear, uCameraFar;
uniform float uSoftness;
varying vec2 vUv;
varying float vLife;
varying vec4 vTint;
varying vec4 vParams;
varying float vSeed;
varying float vViewZ;
varying float vDist;
varying float vWaterFade;
${NOISE_GLSL}
${DEPTH_GLSL}
${FOG_GLSL}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;

  // Soft particles: fade where the billboard cuts into hulls.
  float sceneZ = linearDepth(texture2D(uSceneDepth, gl_FragCoord.xy / uResolution).r, uCameraNear, uCameraFar);
  float soft = clamp((sceneZ - vViewZ) / uSoftness, 0.0, 1.0);
  if (soft <= 0.0) discard;

  float n = fbm2(p * 1.6 + vSeed * 31.0 + vec2(0.0, vLife * 1.5));
  float bright = vParams.z;
  float opacity = vParams.w;

#if defined(KIND_FIRE)
  float core = (1.0 - r2) * (0.55 + 0.9 * n);
  float a = smoothstep(0.15, 0.7, core) * (1.0 - smoothstep(0.55, 1.0, vLife));
  // White-hot -> orange -> deep red -> sooty.
  vec3 hot = mix(vec3(6.0, 4.6, 2.6), vec3(4.0, 1.5, 0.3), smoothstep(0.0, 0.35, vLife));
  hot = mix(hot, vec3(0.6, 0.12, 0.03), smoothstep(0.35, 0.85, vLife));
  vec3 col = hot * bright * a * soft * vWaterFade;
  float fogAmt = 1.0 - exp(-vDist * uFogDensity);
  gl_FragColor = vec4(col * (1.0 - fogAmt) * opacity, 1.0);

#elif defined(KIND_SMOKE)
  float dens = smoothstep(1.0, 0.25, sqrt(r2) + (n - 0.5) * 0.7);
  float fadeIn = smoothstep(0.0, 0.06, vLife);
  float fadeOut = 1.0 - smoothstep(0.55, 1.0, vLife);
  float a = dens * fadeIn * fadeOut * opacity * soft * vWaterFade;
  // Pseudo-volumetric lighting: treat the billboard as a sphere facing the camera.
  vec3 nrm = normalize(vec3(p * 0.8 + (n - 0.5) * 0.6, sqrt(max(1.0 - r2, 0.0)) + 0.3));
  float lambert = clamp(dot(nrm, normalize(uSunDirView)) * 0.6 + 0.4, 0.0, 1.0);
  vec3 col = vTint.rgb * (uSunColor * lambert * 0.9 + uAmbient * 0.8);
  // Embers glowing from below during the first moments (muzzle / fire smoke).
  col += vec3(3.0, 1.1, 0.3) * bright * pow(1.0 - vLife, 6.0) * (0.5 + 0.5 * (1.0 - p.y));
  col = applyFog(col, vDist);
  gl_FragColor = vec4(col, a);

#elif defined(KIND_SPRAY)
  float dens = smoothstep(1.0, 0.1, sqrt(r2) + (n - 0.5) * 0.9);
  float a = dens * (1.0 - smoothstep(0.4, 1.0, vLife)) * smoothstep(0.0, 0.04, vLife) * opacity * soft;
  float back = pow(clamp(dot(vec3(0.0, 0.0, -1.0), normalize(uSunDirView)), 0.0, 1.0), 3.0);
  vec3 col = vTint.rgb * (uSunColor * (0.7 + back * 1.8) + uAmbient * 1.1);
  col = applyFog(col, vDist);
  gl_FragColor = vec4(col, a * vWaterFade);

#else // KIND_DEBRIS
  float ang = atan(p.y, p.x);
  float shard = 0.55 + 0.35 * sin(ang * 3.0 + vSeed * 20.0);
  if (sqrt(r2) > shard) discard;
  vec3 col = mix(vTint.rgb * (uAmbient + uSunColor * 0.4), vec3(5.0, 2.4, 0.6) * bright, step(0.5, bright) * (1.0 - vLife));
  col = applyFog(col, vDist);
  gl_FragColor = vec4(col, opacity * vWaterFade * (1.0 - smoothstep(0.8, 1.0, vLife)));
#endif
}
`;

export class GPUParticlePool {
  constructor(kind, capacity) {
    this.kind = kind;
    this.capacity = capacity;
    this.cursor = 0;
    this.dirtyStart = Infinity;
    this.dirtyEnd = -1;
    this.fullUpload = false;

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.attrs = {};
    for (const name of ['iA', 'iB', 'iC', 'iD', 'iE']) {
      const arr = new Float32Array(capacity * 4);
      if (name === 'iA') for (let i = 0; i < capacity; i++) arr[i * 4 + 3] = -1e6; // all dead
      if (name === 'iB') for (let i = 0; i < capacity; i++) arr[i * 4 + 3] = 1;
      const a = new THREE.InstancedBufferAttribute(arr, 4).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      this.attrs[name] = a;
    }
    geo.instanceCount = capacity;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);

    const defines = { [`KIND_${kind.toUpperCase()}`]: '' };
    if (kind === 'debris') defines.STRETCH = '';
    const additive = kind === 'fire';
    this.material = new THREE.ShaderMaterial({
      defines,
      uniforms: {
        uTime: atmosphere.uTime,
        uWind: atmosphere.uWind,
        uSunColor: atmosphere.uSunColor,
        uAmbient: atmosphere.uAmbient,
        uFogColor: atmosphere.uFogColor,
        uFogDensity: atmosphere.uFogDensity,
        uSunDirView: sceneBuffers.uSunDirView,
        uSceneDepth: sceneBuffers.uSceneDepth,
        uResolution: sceneBuffers.uResolution,
        uCameraNear: sceneBuffers.uCameraNear,
        uCameraFar: sceneBuffers.uCameraFar,
        uSoftness: { value: kind === 'fire' ? 3 : 8 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(LAYERS.EFFECTS);
    this.mesh.renderOrder = additive ? 12 : kind === 'smoke' ? 10 : 11;
    this.geometry = geo;
  }

  /**
   * Spawn one particle. All params are plain numbers to keep the hot path allocation-free.
   */
  spawn(time, x, y, z, vx, vy, vz, life, size0, size1, opts) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const o = i * 4;
    const A = this.attrs.iA.array, B = this.attrs.iB.array, C = this.attrs.iC.array, D = this.attrs.iD.array, E = this.attrs.iE.array;
    A[o] = x; A[o + 1] = y; A[o + 2] = z; A[o + 3] = time;
    B[o] = vx; B[o + 1] = vy; B[o + 2] = vz; B[o + 3] = life;
    C[o] = size0; C[o + 1] = size1; C[o + 2] = opts.spin ?? 0; C[o + 3] = Math.random();
    D[o] = opts.drag ?? 0; D[o + 1] = opts.gravity ?? 0; D[o + 2] = opts.brightness ?? 1; D[o + 3] = opts.opacity ?? 1;
    const t = opts.tint;
    E[o] = t ? t[0] : 1; E[o + 1] = t ? t[1] : 1; E[o + 2] = t ? t[2] : 1; E[o + 3] = opts.wind ?? 0;
    if (i < this.dirtyStart) this.dirtyStart = i;
    if (i > this.dirtyEnd) this.dirtyEnd = i;
    if (this.cursor === 0) this.fullUpload = true; // wrapped this frame
  }

  /** Upload only the slots written this frame. */
  flush() {
    if (this.dirtyEnd < 0) return;
    const start = this.fullUpload ? 0 : this.dirtyStart;
    const count = this.fullUpload ? this.capacity : this.dirtyEnd - this.dirtyStart + 1;
    for (const a of Object.values(this.attrs)) {
      a.clearUpdateRanges();
      a.addUpdateRange(start * 4, count * 4);
      a.needsUpdate = true;
    }
    this.dirtyStart = Infinity;
    this.dirtyEnd = -1;
    this.fullUpload = false;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
