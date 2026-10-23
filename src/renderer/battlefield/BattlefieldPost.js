import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { sceneBuffers, atmosphere, LAYERS } from '../naval/theater/shared.js';
import { TacticalVisionShader } from '../TacticalVisionShader.js';

/**
 * Frame graph
 *
 *   1. Depth pre-pass (optional, reduced res, depth only)   -> soft particles
 *   2. Main HDR pass (half float, MSAA, depth texture)
 *   3. Bloom on HDR values > 1 (fire, tracers, sun, muzzle flash, lightning)
 *   4. Output: ACES filmic tone map + sRGB
 *   5. Lens: colour grade (lift/gain/saturation), vignette, grain, shock aberration
 *   6. Tactical vision (existing NVG / FLIR shader, unchanged behaviour)
 *
 * Shadows are rendered once per frame. Without a pre-pass a 1x1 "far" depth is
 * bound, which turns soft particles into plain particles (low quality tier).
 */

const LensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uLift: { value: new THREE.Vector3() },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uSaturation: { value: 1 },
    uVignette: { value: 0.3 },
    uGrain: { value: 0.025 },
    uShock: { value: 0 },
    uFlash: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uSaturation, uVignette, uGrain, uShock, uFlash;
    uniform vec3 uLift, uGain;
    varying vec2 vUv;
    float h(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main() {
      vec2 c = vUv - 0.5;
      // Chromatic aberration only while the camera is shaken by a blast.
      float ca = uShock * 0.006;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + c * ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - c * ca).b;
      col = uLift + col * (uGain - uLift);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col += vec3(0.85, 0.9, 1.0) * uFlash * 0.12;
      float v = smoothstep(0.85, 0.2, length(c * vec2(1.0, 0.85)));
      col *= mix(1.0 - uVignette, 1.0, v);
      col += (h(vUv * 1024.0 + fract(uTime) * 91.0) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export class BattlefieldPost {
  constructor(renderer, scene, camera, { msaa = 4, prepassScale = 0.5, bloom = true } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.prepassScale = prepassScale;
    this.renderScale = 1;

    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: msaa });
    this.sceneRT.depthTexture = new THREE.DepthTexture(size.x, size.y);
    this.sceneRT.depthTexture.type = THREE.UnsignedIntType;

    if (prepassScale > 0) {
      this.depthRT = new THREE.WebGLRenderTarget(Math.max(1, size.x * prepassScale | 0), Math.max(1, size.y * prepassScale | 0));
      this.depthRT.depthTexture = new THREE.DepthTexture(this.depthRT.width, this.depthRT.height);
      this.depthRT.depthTexture.type = THREE.UnsignedIntType;
      sceneBuffers.uSceneDepth.value = this.depthRT.depthTexture;
      this.depthMaterial = new THREE.MeshBasicMaterial({ colorWrite: false });
    } else {
      this.farDepth = new THREE.DataTexture(new Float32Array([1, 1, 1, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType);
      this.farDepth.needsUpdate = true;
      sceneBuffers.uSceneDepth.value = this.farDepth;
    }

    this.composer = new EffectComposer(renderer);
    this.inputPass = new TexturePass(this.sceneRT.texture);
    this.inputPass.material.blending = THREE.NoBlending;
    this.composer.addPass(this.inputPass);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.55, 1.0);
    this.bloomPass.enabled = bloom;
    this.composer.addPass(this.bloomPass);

    this.composer.addPass(new OutputPass());

    this.lensPass = new ShaderPass(LensShader);
    this.composer.addPass(this.lensPass);

    this.visionPass = new ShaderPass(TacticalVisionShader);
    this.visionPass.uniforms.uResolution.value = [size.x, size.y];
    this.visionPass.enabled = false;
    this.composer.addPass(this.visionPass);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.autoUpdate = false;
  }

  setGrade(g) {
    const u = this.lensPass.uniforms;
    u.uLift.value.set(...g.lift);
    u.uGain.value.set(...g.gain);
    u.uSaturation.value = g.saturation;
    u.uVignette.value = g.vignette;
  }

  setVisionMode(mode) {
    this.visionPass.enabled = mode > 0;
    this.visionPass.uniforms.uMode.value = mode;
  }

  setSize(width, height, pixelRatio) {
    const w = Math.max(1, Math.floor(width * pixelRatio * this.renderScale));
    const h = Math.max(1, Math.floor(height * pixelRatio * this.renderScale));
    this.sceneRT.setSize(w, h);
    this.depthRT?.setSize(Math.max(1, w * this.prepassScale | 0), Math.max(1, h * this.prepassScale | 0));
    this.composer.setPixelRatio(pixelRatio * this.renderScale);
    this.composer.setSize(width, height);
    this.visionPass.uniforms.uResolution.value = [w, h];
  }

  render(dt, time) {
    const { renderer, scene, camera } = this;
    camera.updateMatrixWorld();
    sceneBuffers.uCameraNear.value = camera.near;
    sceneBuffers.uCameraFar.value = camera.far;
    renderer.getDrawingBufferSize(sceneBuffers.uResolution.value);
    sceneBuffers.uResolution.value.multiplyScalar(this.renderScale);
    sceneBuffers.uSunDirView.value.copy(atmosphere.uSunDir.value).transformDirection(camera.matrixWorldInverse);

    renderer.shadowMap.needsUpdate = true;
    const mask = camera.layers.mask;
    if (this.depthRT) {
      // Depth-only pre-pass of opaque geometry (no sky, no effects).
      camera.layers.set(LAYERS.OPAQUE);
      const bg = scene.background, ov = scene.overrideMaterial;
      scene.background = null;
      scene.overrideMaterial = this.depthMaterial;
      renderer.setRenderTarget(this.depthRT);
      renderer.clear();
      renderer.render(scene, camera);
      scene.background = bg;
      scene.overrideMaterial = ov;
      camera.layers.mask = mask;
    }

    renderer.setRenderTarget(this.sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    this.lensPass.uniforms.uTime.value = time;
    this.visionPass.uniforms.uTime.value = time;
    this.composer.render(dt);
  }

  dispose() {
    this.sceneRT.dispose();
    this.depthRT?.dispose();
    this.farDepth?.dispose();
    this.depthMaterial?.dispose();
    this.composer.dispose();
  }
}
