import * as THREE from 'three';
import { atmosphere, NOISE_GLSL } from '../shared.js';

/**
 * Procedural sky + ray-marched volumetric cloud layer, rendered into a cube map.
 *
 * The expensive cloud march never runs at screen resolution: one cube face is
 * refreshed per frame (round robin), so a 512^2 cube costs ~1/6 of a face per frame.
 * The cube is then used three ways: scene.background, ocean reflections + horizon
 * haze, and (via PMREM) image-based lighting for the PBR ships.
 */

export const SKY_PRESETS = {
  sunset: {
    sunElevation: 5.5, sunAzimuth: 248,
    sunColor: [1.0, 0.52, 0.26], sunIntensity: 3.2, sunDisk: 60,
    zenith: [0.05, 0.08, 0.2], horizon: [0.8, 0.38, 0.22], sunsetTint: [1.3, 0.42, 0.14],
    cloudCoverage: 0.48, cloudDensity: 0.045, cloudBottom: 1400, cloudTop: 3400,
    cloudLight: [1.6, 0.75, 0.4], cloudAmbient: [0.2, 0.18, 0.26],
    fogColor: [0.5, 0.33, 0.27], fogDensity: 0.00016,
    exposure: 0.85, envIntensity: 0.75, sunSpecular: 1.0,
    deepWater: [0.006, 0.022, 0.04], scatterWater: [0.05, 0.16, 0.13],
    seaState: 'swell',
  },
  storm: {
    sunElevation: 22, sunAzimuth: 210,
    sunColor: [0.75, 0.8, 0.88], sunIntensity: 0.9, sunDisk: 0,
    zenith: [0.13, 0.15, 0.18], horizon: [0.42, 0.45, 0.48], sunsetTint: [0.5, 0.52, 0.55],
    cloudCoverage: 0.86, cloudDensity: 0.09, cloudBottom: 700, cloudTop: 3800,
    cloudLight: [0.9, 0.92, 0.98], cloudAmbient: [0.2, 0.22, 0.26],
    fogColor: [0.36, 0.39, 0.42], fogDensity: 0.00038,
    exposure: 1.25, envIntensity: 1.0, sunSpecular: 0.12,
    deepWater: [0.01, 0.028, 0.035], scatterWater: [0.04, 0.12, 0.11],
    seaState: 'storm',
  },
  day: {
    sunElevation: 38, sunAzimuth: 160,
    sunColor: [1.0, 0.95, 0.88], sunIntensity: 3.0, sunDisk: 40,
    zenith: [0.1, 0.25, 0.6], horizon: [0.6, 0.72, 0.85], sunsetTint: [0.9, 0.85, 0.8],
    cloudCoverage: 0.36, cloudDensity: 0.04, cloudBottom: 1500, cloudTop: 3000,
    cloudLight: [1.4, 1.35, 1.3], cloudAmbient: [0.35, 0.45, 0.6],
    fogColor: [0.62, 0.7, 0.8], fogDensity: 0.00012,
    exposure: 0.6, envIntensity: 1.0, sunSpecular: 0.8,
    deepWater: [0.004, 0.035, 0.07], scatterWater: [0.02, 0.2, 0.22],
    seaState: 'calm',
  },
};

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const skyFragment = /* glsl */ `
#define CLOUD_STEPS __CLOUD_STEPS__
#define LIGHT_STEPS 4
#define PLANET_R 6360000.0
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform float uSunDisk;
uniform vec3 uZenith, uHorizon, uSunsetTint;
uniform float uCoverage, uDensity, uBottom, uTop;
uniform vec3 uCloudLight, uCloudAmbient;
uniform float uTime;
uniform vec3 uWind;
varying vec3 vDir;

${NOISE_GLSL}

float hg(float mu, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
}

vec3 atmosphereColor(vec3 dir) {
  float y = max(dir.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(y, 0.42));
  float mu = dot(dir, uSunDir);
  // Warm band around the sun's azimuth near the horizon.
  vec2 dh = normalize(dir.xz + 1e-5), sh = normalize(uSunDir.xz + 1e-5);
  float az = pow(max(dot(dh, sh), 0.0), 3.0);
  col = mix(col, uSunsetTint, az * pow(1.0 - y, 6.0) * 0.8);
  col += uSunColor * hg(mu, 0.76) * 0.6 * uSunIntensity * 0.12;  // Mie halo
  return col;
}

vec2 sphereHits(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

float cloudDensity(vec3 p, float hFrac) {
  vec3 q = p * 0.00028 + uWind * uTime * 0.00004;
  float base = vnoise3(q) * 0.55 + vnoise3(q * 2.3) * 0.28 + vnoise3(q * 5.1) * 0.12 + vnoise3(q * 11.0) * 0.05;
  float shape = smoothstep(0.0, 0.18, hFrac) * smoothstep(1.0, 0.55, hFrac);
  float d = (base * shape - (1.0 - uCoverage)) / max(uCoverage, 0.05);
  return clamp(d, 0.0, 1.0) * uDensity;
}

void main() {
  vec3 dir = normalize(vDir);
  vec3 sky = atmosphereColor(dir);

  // Sun disk (HDR so bloom picks it up).
  float mu = dot(dir, uSunDir);
  float disk = smoothstep(0.99985, 0.99993, mu) * uSunDisk;
  vec3 col = sky + uSunColor * disk;

  if (dir.y > 0.0) {
    vec3 ro = vec3(0.0, PLANET_R + 30.0, 0.0);
    float t0 = sphereHits(ro, dir, PLANET_R + uBottom).y;
    float t1 = sphereHits(ro, dir, PLANET_R + uTop).y;
    float len = min(t1 - t0, 9000.0);
    float stepLen = len / float(CLOUD_STEPS);
    float trans = 1.0;
    vec3 scatter = vec3(0.0);
    float phase = mix(hg(mu, 0.6), hg(mu, -0.2), 0.35) * 4.0 + 0.4;
    float jitter = hash12(gl_FragCoord.xy + fract(uTime));
    for (int i = 0; i < CLOUD_STEPS; i++) {
      float t = t0 + stepLen * (float(i) + jitter);
      vec3 p = ro + dir * t;
      float hFrac = (length(p) - PLANET_R - uBottom) / (uTop - uBottom);
      float d = cloudDensity(p, hFrac);
      if (d > 0.001) {
        float ld = 0.0;
        for (int j = 0; j < LIGHT_STEPS; j++) {
          vec3 lp = p + uSunDir * (float(j) + 0.5) * 180.0;
          float lh = (length(lp) - PLANET_R - uBottom) / (uTop - uBottom);
          ld += cloudDensity(lp, lh);
        }
        float lightT = exp(-ld * 180.0 * 0.9);
        float powder = 1.0 - exp(-d * 60.0);
        vec3 lit = uCloudLight * uSunColor * lightT * phase * mix(1.0, powder, 0.5) + uCloudAmbient * (0.4 + 0.6 * hFrac);
        float sigma = d;
        float stepT = exp(-sigma * stepLen);
        scatter += trans * lit * (1.0 - stepT);
        trans *= stepT;
        if (trans < 0.02) break;
      }
    }
    // Distant clouds dissolve into haze.
    float far = 1.0 - exp(-t0 * 0.000035);
    vec3 cloudCol = mix(scatter, sky * (1.0 - trans), far);
    col = col * trans + cloudCol;
  } else {
    col = uHorizon;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export class SkySystem {
  constructor(renderer, { cubeSize = 512, cloudSteps = 32, facesPerFrame = 1 } = {}) {
    this.renderer = renderer;
    this.facesPerFrame = facesPerFrame;
    this.face = 0;

    this.uniforms = {
      uSunDir: atmosphere.uSunDir,
      uSunColor: atmosphere.uSunColor,
      uSunIntensity: { value: 3 },
      uSunDisk: { value: 50 },
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunsetTint: { value: new THREE.Color() },
      uCoverage: { value: 0.5 },
      uDensity: { value: 0.05 },
      uBottom: { value: 1500 },
      uTop: { value: 3500 },
      uCloudLight: { value: new THREE.Color() },
      uCloudAmbient: { value: new THREE.Color() },
      uTime: atmosphere.uTime,
      uWind: atmosphere.uWind,
    };

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: skyVertex,
      fragmentShader: skyFragment.replace('__CLOUD_STEPS__', String(cloudSteps)),
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
    this.skyScene = new THREE.Scene();
    this.skyScene.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), this.skyMaterial));

    this.cubeTarget = new THREE.WebGLCubeRenderTarget(cubeSize, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    this.cubeCamera = new THREE.CubeCamera(1, 100, this.cubeTarget);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envTarget = null;
    this.envAge = Infinity;

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -450; sc.right = 450; sc.top = 450; sc.bottom = -450; sc.near = 10; sc.far = 3000;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.preset = null;
  }

  get texture() { return this.cubeTarget.texture; }

  /**
   * Apply a preset by name, or pass a preset object with the same fields (other
   * games define their own). Returns the preset object.
   */
  setPreset(name, scene) {
    const p = typeof name === 'string' ? SKY_PRESETS[name] : name;
    if (!p) throw new Error(`Unknown sky preset ${name}`);
    this.preset = p;
    const el = THREE.MathUtils.degToRad(p.sunElevation);
    const az = THREE.MathUtils.degToRad(p.sunAzimuth);
    atmosphere.uSunDir.value.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
    atmosphere.uSunColor.value.setRGB(...p.sunColor);
    atmosphere.uFogColor.value.setRGB(...p.fogColor);
    atmosphere.uFogDensity.value = p.fogDensity;
    const u = this.uniforms;
    u.uSunIntensity.value = p.sunIntensity;
    u.uSunDisk.value = p.sunDisk;
    u.uZenith.value.setRGB(...p.zenith);
    u.uHorizon.value.setRGB(...p.horizon);
    u.uSunsetTint.value.setRGB(...p.sunsetTint);
    u.uCoverage.value = p.cloudCoverage;
    u.uDensity.value = p.cloudDensity;
    u.uBottom.value = p.cloudBottom;
    u.uTop.value = p.cloudTop;
    u.uCloudLight.value.setRGB(...p.cloudLight);
    u.uCloudAmbient.value.setRGB(...p.cloudAmbient);

    this.sun.color.setRGB(...p.sunColor);
    this.sun.intensity = p.sunIntensity;
    this.renderer.toneMappingExposure = p.exposure;

    if (scene) {
      scene.fog = new THREE.FogExp2(new THREE.Color(...p.fogColor), p.fogDensity);
      scene.background = this.cubeTarget.texture;
      scene.environmentIntensity = p.envIntensity;
    }
    this.renderFull();
    this.refreshEnvironment(scene);
    return p;
  }

  renderFull() {
    this.cubeCamera.update(this.renderer, this.skyScene);
    this.face = 0;
  }

  refreshEnvironment(scene) {
    if (this.envTarget) this.envTarget.dispose();
    this.envTarget = this.pmrem.fromCubemap(this.cubeTarget.texture);
    if (scene) scene.environment = this.envTarget.texture;
    this.envAge = 0;
  }

  /** Round-robin face update + keep the sun's shadow frustum on the area of interest. */
  update(dt, focus, scene) {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    const cams = this.cubeCamera.children;
    for (let i = 0; i < this.facesPerFrame; i++) {
      const last = this.face === 5;
      this.cubeTarget.texture.generateMipmaps = last;
      r.setRenderTarget(this.cubeTarget, this.face);
      r.render(this.skyScene, cams[this.face]);
      this.face = (this.face + 1) % 6;
    }
    this.cubeTarget.texture.generateMipmaps = true;
    r.setRenderTarget(prev);

    // IBL drifts slowly with the clouds; refresh every few seconds.
    this.envAge += dt;
    if (this.envAge > 6) this.refreshEnvironment(scene);

    if (focus) {
      const d = atmosphere.uSunDir.value;
      this.sun.position.set(focus.x + d.x * 1500, d.y * 1500, focus.z + d.z * 1500);
      this.sun.target.position.set(focus.x, 0, focus.z);
      this.sun.target.updateMatrixWorld();
    }
  }

  dispose() {
    this.cubeTarget.dispose();
    this.envTarget?.dispose();
    this.pmrem.dispose();
    this.skyMaterial.dispose();
  }
}
