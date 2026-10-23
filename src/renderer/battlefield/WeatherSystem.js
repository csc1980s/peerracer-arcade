import * as THREE from 'three';
import { atmosphere, LAYERS } from '../naval/theater/shared.js';

/**
 * Precipitation + lightning.
 *
 * Precipitation is a single instanced draw: N quads whose positions are a pure
 * function of (seed, time), wrapped into a box that follows the camera. Nothing is
 * simulated on the CPU, so 8k rain streaks cost the same as 800.
 *   rain  velocity-stretched streaks, slight wind slant
 *   snow  slow tumbling flakes with sway
 *   dust  blowing sand motes hugging the ground (desert)
 *
 * Lightning: random multi-flicker strikes with a branching bolt on the horizon;
 * `flash` (0..1) is read by the coordinator to brighten sky light and ambience.
 */

const vertexShader = /* glsl */ `
attribute vec4 iSeed;
uniform float uTime, uSpeed, uSize, uLength;
uniform vec3 uBox, uCam, uWind;
uniform int uMode;
varying vec2 vUv;
varying float vFade;
void main() {
  vec3 p = iSeed.xyz * uBox;
  float sp = uSpeed * (0.75 + 0.5 * iSeed.w);
  vec3 vel = vec3(uWind.x, -sp, uWind.z);
  if (uMode == 1) {
    p.x += sin(uTime * 1.1 + iSeed.w * 40.0) * 0.8;
    p.z += cos(uTime * 0.9 + iSeed.w * 23.0) * 0.8;
  }
  if (uMode == 2) {
    vel = vec3(uWind.x, sin(uTime * 2.0 + iSeed.w * 30.0) * 0.4, uWind.z) * (0.7 + 0.6 * iSeed.w);
  }
  p += vel * uTime;
  vec3 lo = uCam - uBox * 0.5;
  if (uMode == 2) lo.y = 0.0;
  p = lo + mod(p - lo, uBox);

  vec4 mv = viewMatrix * vec4(p, 1.0);
  vec2 c = position.xy;
  if (uMode == 0) {
    vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz;
    vec2 d = length(vv.xy) > 1e-3 ? normalize(vv.xy) : vec2(0.0, -1.0);
    vec2 n = vec2(-d.y, d.x);
    mv.xy += n * c.x * uSize + d * c.y * uLength;
  } else {
    mv.xy += c * uSize * (0.6 + 0.8 * iSeed.w);
  }
  vUv = c + 0.5;
  float dist = -mv.z;
  vFade = smoothstep(0.3, 2.0, dist) * (1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, dist));
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity, uFlash;
uniform int uMode;
uniform vec3 uSunColor, uAmbient;
varying vec2 vUv;
varying float vFade;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float a;
  if (uMode == 0) a = (1.0 - abs(p.x)) * smoothstep(-1.0, 0.2, p.y) * (1.0 - smoothstep(0.6, 1.0, p.y));
  else a = 1.0 - smoothstep(0.2, 1.0, length(p));
  vec3 col = uColor * (uAmbient * 1.4 + uSunColor * 0.35) + vec3(0.9, 0.92, 1.0) * uFlash * 3.0;
  gl_FragColor = vec4(col, a * uOpacity * vFade);
}
`;

const MODES = {
  rain: { mode: 0, count: 7000, box: [44, 26, 44], speed: 15, size: 0.022, length: 0.7, opacity: 0.5, color: [0.75, 0.8, 0.88], wind: [2.5, 0, 1] },
  snow: { mode: 1, count: 5000, box: [50, 28, 50], speed: 1.3, size: 0.07, length: 0, opacity: 0.85, color: [1.0, 1.0, 1.0], wind: [1.2, 0, 0.5] },
  dust: { mode: 2, count: 2600, box: [70, 5, 70], speed: 0, size: 0.04, length: 0, opacity: 0.35, color: [0.95, 0.78, 0.55], wind: [6, 0, 2.5] },
};

export class WeatherSystem {
  constructor(scene, { scale = 1 } = {}) {
    this.scene = scene;
    this.scale = scale;
    this.flash = 0;
    this.lightningEnabled = false;
    this.nextStrike = 6;
    this.flicker = [];
    this.uniforms = {
      uTime: { value: 0 },
      uSpeed: { value: 10 },
      uSize: { value: 0.02 },
      uLength: { value: 0.5 },
      uBox: { value: new THREE.Vector3(40, 25, 40) },
      uCam: { value: new THREE.Vector3() },
      uWind: { value: new THREE.Vector3() },
      uMode: { value: 0 },
      uColor: { value: new THREE.Color(1, 1, 1) },
      uOpacity: { value: 0.3 },
      uFlash: { value: 0 },
      uSunColor: atmosphere.uSunColor,
      uAmbient: atmosphere.uAmbient,
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader, fragmentShader,
      transparent: true, depthWrite: false,
    });
    this.mesh = null;
    this._buildBolt();
  }

  _buildMesh(count) {
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
    if (!count) return;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    geo.instanceCount = count;
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    this.mesh.layers.set(LAYERS.EFFECTS);
    this.scene.add(this.mesh);
  }

  _buildBolt() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
    geo.setDrawRange(0, 0);
    this.boltMat = new THREE.LineBasicMaterial({ color: new THREE.Color(7, 7.5, 9), transparent: true, opacity: 1, fog: false });
    this.bolt = new THREE.LineSegments(geo, this.boltMat);
    this.bolt.frustumCulled = false;
    this.bolt.visible = false;
    this.bolt.layers.set(LAYERS.EFFECTS);
    this.scene.add(this.bolt);
  }

  setWeather(kind, { lightning = false } = {}) {
    this.kind = kind;
    this.lightningEnabled = lightning;
    this.nextStrike = 3 + Math.random() * 4;
    const m = MODES[kind];
    if (!m) { this._buildMesh(0); return; }
    const u = this.uniforms;
    u.uMode.value = m.mode;
    u.uBox.value.set(...m.box);
    u.uSpeed.value = m.speed;
    u.uSize.value = m.size;
    u.uLength.value = m.length;
    u.uOpacity.value = m.opacity;
    u.uColor.value.setRGB(...m.color);
    u.uWind.value.set(...m.wind);
    this._buildMesh(Math.floor(m.count * this.scale));
  }

  _strike(center) {
    const a = Math.random() * Math.PI * 2;
    const r = 350 + Math.random() * 500;
    let x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r, y = 420;
    const pos = this.bolt.geometry.attributes.position.array;
    let n = 0;
    const seg = (x0, y0, z0, x1, y1, z1) => {
      if (n + 6 > pos.length) return;
      pos[n++] = x0; pos[n++] = y0; pos[n++] = z0; pos[n++] = x1; pos[n++] = y1; pos[n++] = z1;
    };
    const branches = [];
    while (y > 0) {
      const ny = y - (10 + Math.random() * 22), nx = x + (Math.random() - 0.5) * 30, nz = z + (Math.random() - 0.5) * 30;
      seg(x, y, z, nx, Math.max(ny, 0), nz);
      if (Math.random() < 0.18) branches.push([nx, ny, nz]);
      x = nx; y = ny; z = nz;
    }
    for (const b of branches) {
      let [bx, by, bz] = b;
      for (let k = 0; k < 4; k++) {
        const nx = bx + (Math.random() - 0.5) * 40, ny = by - (8 + Math.random() * 18), nz = bz + (Math.random() - 0.5) * 40;
        seg(bx, by, bz, nx, ny, nz);
        bx = nx; by = ny; bz = nz;
      }
    }
    this.bolt.geometry.attributes.position.needsUpdate = true;
    this.bolt.geometry.setDrawRange(0, n / 3);
    const t0 = this.t;
    this.flicker = [[t0, t0 + 0.07, 1], [t0 + 0.11, t0 + 0.16, 0.6], [t0 + 0.24, t0 + 0.36, 0.9]];
  }

  update(dt, time, camera) {
    this.t = time;
    this.uniforms.uTime.value = time;
    this.uniforms.uCam.value.copy(camera.position);

    this.flash = 0;
    if (this.lightningEnabled) {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        this.nextStrike = 5 + Math.random() * 10;
        this._strike(camera.position);
      }
      for (const [a, b, k] of this.flicker) if (time >= a && time <= b) this.flash = Math.max(this.flash, k);
      this.bolt.visible = this.flash > 0;
    } else {
      this.bolt.visible = false;
    }
    this.uniforms.uFlash.value = this.flash;
    return this.flash;
  }

  dispose() {
    this._buildMesh(0);
    this.scene.remove(this.bolt);
    this.bolt.geometry.dispose();
    this.boltMat.dispose();
    this.material.dispose();
  }
}
