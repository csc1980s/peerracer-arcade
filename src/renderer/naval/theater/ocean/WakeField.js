import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/**
 * Persistent foam field over the combat area (top-down, world-locked render target).
 *
 * Every frame: previous field -> blur + decay -> new field, then ships / splashes
 * additively "stamp" foam into it. The ocean shader reads channel R as foam.
 * Channel G stores a short-lived turbulence value that roughens the normal.
 *
 * Cost: one 1024^2 half-float full-screen pass + a handful of instanced quads.
 */
export class WakeField {
  constructor(renderer, { centerX = 0, centerZ = 0, size = 3000, resolution = 1024, halfLife = 22, capacity = 512 } = {}) {
    this.renderer = renderer;
    this.size = size;
    this.halfLife = halfLife;
    this.rect = new THREE.Vector4(centerX - size / 2, centerZ - size / 2, size, 1 / size);

    const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.targets = [new THREE.WebGLRenderTarget(resolution, resolution, opts), new THREE.WebGLRenderTarget(resolution, resolution, opts)];
    this.index = 0;

    this.decayQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: {
        tPrev: { value: null },
        uTexel: { value: 1 / resolution },
        uDecay: { value: 1 },
        uDiffuse: { value: 0 },
        uAdvect: { value: new THREE.Vector2() },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tPrev; uniform float uTexel, uDecay, uDiffuse; uniform vec2 uAdvect;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv - uAdvect;
          vec4 c = texture2D(tPrev, uv);
          vec4 n = texture2D(tPrev, uv + vec2(0.0, uTexel)) + texture2D(tPrev, uv - vec2(0.0, uTexel))
                 + texture2D(tPrev, uv + vec2(uTexel, 0.0)) + texture2D(tPrev, uv - vec2(uTexel, 0.0));
          vec4 blurred = mix(c, n * 0.25, uDiffuse);
          // Turbulence (G) dies much faster than visible foam (R).
          gl_FragColor = vec4(blurred.r * uDecay, blurred.g * uDecay * uDecay * uDecay, 0.0, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    }));

    // Instanced soft-ellipse stamps written in clip space directly from world xz.
    const quad = new THREE.InstancedBufferGeometry();
    quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    this.capacity = capacity;
    this.stampA = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.stampB = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    quad.setAttribute('aStampA', this.stampA); // x, z, radius, foam
    quad.setAttribute('aStampB', this.stampB); // dirX, dirZ, elongation, turbulence
    quad.instanceCount = 0;
    this.stampGeometry = quad;

    this.stampMaterial = new THREE.ShaderMaterial({
      uniforms: { uRect: { value: this.rect } },
      vertexShader: /* glsl */ `
        attribute vec4 aStampA; attribute vec4 aStampB;
        uniform vec4 uRect;
        varying vec2 vLocal; varying vec2 vAmount; varying vec2 vSeed;
        void main() {
          vec2 dir = normalize(aStampB.xy + vec2(1e-5, 0.0));
          vec2 side = vec2(-dir.y, dir.x);
          vec2 world = aStampA.xy + (side * position.x + dir * position.y * aStampB.z) * aStampA.z;
          vec2 uv = (world - uRect.xy) * uRect.w;
          vLocal = position.xy; vAmount = vec2(aStampA.w, aStampB.w); vSeed = aStampA.xy;
          gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vLocal; varying vec2 vAmount; varying vec2 vSeed;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          float r = length(vLocal);
          float fall = 1.0 - smoothstep(0.2, 1.0, r);
          float grain = 0.65 + 0.35 * h(floor(vLocal * 6.0) + floor(vSeed));
          gl_FragColor = vec4(vAmount.x * fall * grain, vAmount.y * fall, 0.0, 1.0);
        }`,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.stampMesh = new THREE.Mesh(quad, this.stampMaterial);
    this.stampMesh.frustumCulled = false;
    this.stampScene = new THREE.Scene();
    this.stampScene.add(this.stampMesh);
    this.stampCamera = new THREE.Camera();
    this.count = 0;

    this.clear();
  }

  get texture() { return this.targets[this.index].texture; }

  clear() {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    const cc = r.getClearColor(new THREE.Color());
    const ca = r.getClearAlpha();
    r.setClearColor(0x000000, 1);
    for (const t of this.targets) { r.setRenderTarget(t); r.clear(true, false, false); }
    r.setClearColor(cc, ca);
    r.setRenderTarget(prev);
  }

  /**
   * Queue a foam stamp for this frame.
   * @param x,z world position   @param radius meters   @param foam 0..1+
   * @param dirX,dirZ elongation axis   @param elongation length/width ratio   @param turbulence normal roughening
   */
  stamp(x, z, radius, foam, dirX = 0, dirZ = 1, elongation = 1, turbulence = 0) {
    if (this.count >= this.capacity) return;
    const i = this.count++ * 4;
    const a = this.stampA.array, b = this.stampB.array;
    a[i] = x; a[i + 1] = z; a[i + 2] = radius; a[i + 3] = foam;
    b[i] = dirX; b[i + 1] = dirZ; b[i + 2] = elongation; b[i + 3] = turbulence;
  }

  update(dt, current = null) {
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAutoClear = r.autoClear;
    r.autoClear = false;

    const src = this.targets[this.index];
    const dst = this.targets[1 - this.index];
    const u = this.decayQuad.material.uniforms;
    u.tPrev.value = src.texture;
    u.uDecay.value = Math.pow(0.5, dt / this.halfLife);
    u.uDiffuse.value = Math.min(1, dt * 1.5);
    if (current) u.uAdvect.value.set(current.x * dt / this.size, current.y * dt / this.size);
    r.setRenderTarget(dst);
    this.decayQuad.render(r);

    if (this.count > 0) {
      this.stampGeometry.instanceCount = this.count;
      this.stampA.clearUpdateRanges(); this.stampA.addUpdateRange(0, this.count * 4); this.stampA.needsUpdate = true;
      this.stampB.clearUpdateRanges(); this.stampB.addUpdateRange(0, this.count * 4); this.stampB.needsUpdate = true;
      r.render(this.stampScene, this.stampCamera);
    }
    this.count = 0;
    this.index = 1 - this.index;

    r.autoClear = prevAutoClear;
    r.setRenderTarget(prevTarget);
  }

  dispose() {
    this.targets.forEach((t) => t.dispose());
    this.decayQuad.dispose();
    this.stampGeometry.dispose();
    this.stampMaterial.dispose();
  }
}
