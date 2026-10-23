import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/addons/postprocessing/TexturePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { sceneBuffers, atmosphere, LAYERS, DEPTH_GLSL } from '../shared.js';

/**
 * Frame graph:
 *
 *   1. Opaque pre-pass  (layer OPAQUE only, half res, colour + depth)
 *        -> water SSR, water refraction of submerged hulls, soft particles
 *   2. Main pass        (all layers, HDR half-float, MSAA, colour + depth)
 *   3. Depth of field   (gather bokeh driven by main depth)
 *   4. Bloom            (UnrealBloom on HDR values > 1: sun glint, fire, flashes)
 *   5. Output           (ACESFilmic tone mapping + sRGB)
 *
 * Shadow maps are rendered once (in pass 1) and reused by pass 2.
 */

const DofShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uNear: { value: 1 },
    uFar: { value: 20000 },
    uFocus: { value: 800 },
    uAperture: { value: 0.5 },
    uMaxBlur: { value: 6 },
    uTexel: { value: new THREE.Vector2() },
    uEnabled: { value: 1 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tDepth;
    uniform float uNear, uFar, uFocus, uAperture, uMaxBlur, uEnabled;
    uniform vec2 uTexel;
    varying vec2 vUv;
    ${DEPTH_GLSL}
    float coc(vec2 uv) {
      float z = linearDepth(texture2D(tDepth, uv).r, uNear, uFar);
      // Thin-lens circle of confusion: grows fast in front of the focus plane,
      // saturates gently towards the horizon (keeps the strategic view readable).
      return clamp(uAperture * abs(z - uFocus) / max(z, 1.0) - 0.04, 0.0, 1.0);
    }
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      float c0 = coc(vUv) * uEnabled;
      if (c0 < 0.01) { gl_FragColor = base; return; }
      vec3 acc = base.rgb; float wsum = 1.0;
      const float GOLDEN = 2.39996323;
      for (int i = 1; i < 24; i++) {
        float r = sqrt(float(i) / 24.0) * c0 * uMaxBlur;
        float a = float(i) * GOLDEN;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
        // Weight by the sample's own CoC so sharp foreground does not bleed.
        float w = clamp(coc(uv) * 1.5, 0.0, 1.0);
        acc += texture2D(tDiffuse, uv).rgb * w; wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, base.a);
    }`,
};

export class PostPipeline {
  constructor(renderer, scene, camera, { msaa = 4, reflectionScale = 0.5, bloom = true, dof = true } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.reflectionScale = reflectionScale;
    this.renderScale = 1;

    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const mk = (w, h, samples) => {
      const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples });
      rt.depthTexture = new THREE.DepthTexture(w, h);
      rt.depthTexture.type = THREE.UnsignedIntType;
      return rt;
    };
    this.opaqueRT = mk(Math.max(1, size.x * reflectionScale | 0), Math.max(1, size.y * reflectionScale | 0), 0);
    this.sceneRT = mk(size.x, size.y, msaa);

    sceneBuffers.uSceneColor.value = this.opaqueRT.texture;
    sceneBuffers.uSceneDepth.value = this.opaqueRT.depthTexture;

    this.composer = new EffectComposer(renderer);
    this.inputPass = new TexturePass(this.sceneRT.texture);
    this.inputPass.material.blending = THREE.NoBlending;
    this.composer.addPass(this.inputPass);

    this.dofPass = new ShaderPass(DofShader);
    this.dofPass.uniforms.tDepth.value = this.sceneRT.depthTexture;
    this.dofPass.enabled = dof;
    this.composer.addPass(this.dofPass);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.6, 1.0);
    this.bloomPass.enabled = bloom;
    this.composer.addPass(this.bloomPass);

    this.composer.addPass(new OutputPass());

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.autoUpdate = false;
  }

  setSize(width, height, pixelRatio) {
    const w = Math.max(1, Math.floor(width * pixelRatio * this.renderScale));
    const h = Math.max(1, Math.floor(height * pixelRatio * this.renderScale));
    this.sceneRT.setSize(w, h);
    this.opaqueRT.setSize(Math.max(1, w * this.reflectionScale | 0), Math.max(1, h * this.reflectionScale | 0));
    this.composer.setPixelRatio(pixelRatio * this.renderScale);
    this.composer.setSize(width, height);
  }

  /** aperture: blur strength (0.5 default; ~1.5 for close-up kill-cam shots). */
  setFocus(distance, aperture = this.dofPass.uniforms.uAperture.value) {
    this.dofPass.uniforms.uFocus.value = distance;
    this.dofPass.uniforms.uAperture.value = aperture;
  }

  render(dt) {
    const { renderer, scene, camera } = this;
    camera.updateMatrixWorld();

    sceneBuffers.uProjection.value.copy(camera.projectionMatrix);
    sceneBuffers.uCameraNear.value = camera.near;
    sceneBuffers.uCameraFar.value = camera.far;
    renderer.getDrawingBufferSize(sceneBuffers.uResolution.value);
    sceneBuffers.uResolution.value.multiplyScalar(this.renderScale);
    sceneBuffers.uSunDirView.value.copy(atmosphere.uSunDir.value).transformDirection(camera.matrixWorldInverse);

    // 1. Opaque pre-pass (also renders shadow maps once for the frame).
    const mask = camera.layers.mask;
    camera.layers.set(LAYERS.OPAQUE);
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(this.opaqueRT);
    renderer.clear();
    renderer.render(scene, camera);

    // 2. Main HDR pass.
    camera.layers.mask = mask;
    renderer.setRenderTarget(this.sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    // 3-5. Post.
    const d = this.dofPass.uniforms;
    d.uNear.value = camera.near; d.uFar.value = camera.far;
    d.uTexel.value.set(1 / this.sceneRT.width, 1 / this.sceneRT.height);
    this.composer.render(dt);
  }

  dispose() {
    this.opaqueRT.dispose();
    this.sceneRT.dispose();
    this.composer.dispose();
  }
}
