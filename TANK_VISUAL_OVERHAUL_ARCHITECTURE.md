# Tank Minefield: Visual Overhaul Architecture Specification

## Executive Summary

This document provides a comprehensive implementation roadmap for modernizing the Tank Minefield rendering pipeline from basic Canvas 2D to a WebGL2/Three.js PBR-based 3D engine with AAA-quality visual fidelity.

**Current State**: Canvas 2D with procedural rendering
**Target State**: WebGL2 + Three.js r186+ with full PBR pipeline
**Estimated Effort**: 120-160 development hours across 5 phases
**Performance Target**: 60 FPS on desktop, 30 FPS on mobile

---

## Phase 1: Foundation & Engine Migration (Weeks 1-2)

### 1.1 Rendering Engine Selection

**Chosen Framework**: **Three.js r186+** (Recommended over Babylon.js)

**Rationale**:
- Mature WebGL2 support with automatic fallback to WebGL1
- Extensive PBR material system (MeshStandardMaterial, MeshPhysicalMaterial)
- Built-in post-processing via EffectComposer
- Smaller bundle size (~600KB minified vs Babylon.js ~2MB)
- Better documentation and community examples
- Native support for GLTF/GLB with Draco compression

**Architecture Pattern**:
```
┌─────────────────────────────────────────────┐
│   TankMinefieldGame (Authoritative Logic)  │
│   - Grid state (12x12 / 24x24)             │
│   - Tank position [row, col, facing]        │
│   - Mine detection, combat resolution       │
└──────────────┬──────────────────────────────┘
               │ Event Bus
               │ (mine_detonation, scan_safe, etc.)
               ▼
┌─────────────────────────────────────────────┐
│   TankSceneCoordinator (Visual Manager)    │
│   - Translates grid [row,col] → world [x,z]│
│   - Spawns VFX, camera shakes, decals       │
│   - Manages on-demand render triggers       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│   Three.js WebGLRenderer                    │
│   - PBR materials, cascaded shadows         │
│   - Post-processing (SSAO, Bloom, DoF)      │
│   - GPU particle systems                    │
└─────────────────────────────────────────────┘
```

### 1.2 On-Demand Rendering Loop

**Current Issue**: Continuous 60 FPS loop wastes GPU power when scene is static
**Solution**: Event-driven rendering

```javascript
class TankSceneCoordinator {
  constructor(game, renderer, scene, camera) {
    this.game = game;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.needsRender = false;
    this.animationFrameId = null;

    // Listen to game state changes
    this.game.on('state_changed', () => this.requestRender());
    this.game.on('mine_detonation', (data) => this.onMineExplosion(data));
    this.game.on('turn', () => this.requestRender());

    // Camera controls trigger renders
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.addEventListener('change', () => this.requestRender());
  }

  requestRender() {
    if (!this.needsRender) {
      this.needsRender = true;
      this.animationFrameId = requestAnimationFrame(() => this.render());
    }
  }

  render() {
    this.needsRender = false;

    // Update active particle systems
    this.particleSystems.forEach(ps => ps.update(deltaTime));

    // Only render if particles active OR camera moving
    const hasActiveParticles = this.particleSystems.some(ps => ps.isActive);
    const isAnimating = this.controls.enabled && this.cameraMoving;

    if (hasActiveParticles || isAnimating) {
      this.requestRender(); // Continue loop
    }

    this.renderer.render(this.scene, this.camera);
  }
}
```

### 1.3 Coordinate System Mapping

**Grid Space → World Space Transformation**:
```javascript
const CELL_SIZE = 10.0; // 10 units per grid cell

function gridToWorld(row, col) {
  return new THREE.Vector3(
    col * CELL_SIZE,      // X axis (columns)
    0,                     // Y axis (height)
    row * CELL_SIZE       // Z axis (rows)
  );
}

function worldToGrid(position) {
  return {
    row: Math.floor(position.z / CELL_SIZE),
    col: Math.floor(position.x / CELL_SIZE)
  };
}
```

**Tank Facing → 3D Rotation**:
```javascript
const FACING_ROTATIONS = {
  [CARDINAL_DIRECTIONS.NORTH]: 0,        // 0°
  [CARDINAL_DIRECTIONS.EAST]: Math.PI/2,  // 90°
  [CARDINAL_DIRECTIONS.SOUTH]: Math.PI,   // 180°
  [CARDINAL_DIRECTIONS.WEST]: -Math.PI/2  // 270°
};

tankMesh.rotation.y = FACING_ROTATIONS[game.tank.facing];
```

---

## Phase 2: Anti-Aliased Grid Shader System (Week 3)

### 2.1 Screen-Space Grid Shader

**Problem**: Traditional wireframe geometries suffer severe aliasing at shallow angles
**Solution**: Fragment shader using `fwidth()` screen-space derivatives

**Vertex Shader** (grid.vert.glsl):
```glsl
#version 300 es
precision highp float;

in vec3 position;
in vec2 uv;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

out vec2 vUv;
out vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
```

**Fragment Shader** (grid.frag.glsl):
```glsl
#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vWorldPos;

uniform vec3 uGridColor;
uniform vec3 uBackgroundColor;
uniform float uCellSize;
uniform float uLineWidth;
uniform float uFadeStart;
uniform float uFadeEnd;

out vec4 fragColor;

void main() {
  // Convert world position to grid coordinates
  vec2 gridCoord = vWorldPos.xz / uCellSize;

  // Compute screen-space derivatives
  vec2 derivative = fwidth(gridCoord);

  // Distance to nearest grid line
  vec2 grid = abs(fract(gridCoord - 0.5) - 0.5) / derivative;
  float lineDistance = min(grid.x, grid.y);

  // Smooth anti-aliased alpha
  float lineAlpha = 1.0 - smoothstep(uLineWidth - 1.0, uLineWidth + 1.0, lineDistance);

  // Distance-based fade
  float distanceToCamera = length(vWorldPos - cameraPosition);
  float fadeFactor = 1.0 - smoothstep(uFadeStart, uFadeEnd, distanceToCamera);
  lineAlpha *= fadeFactor;

  // Mix grid lines with background
  vec3 color = mix(uBackgroundColor, uGridColor, lineAlpha);

  fragColor = vec4(color, 1.0);
}
```

**Three.js Integration**:
```javascript
const gridMaterial = new THREE.ShaderMaterial({
  vertexShader: gridVertexShader,
  fragmentShader: gridFragmentShader,
  uniforms: {
    uGridColor: { value: new THREE.Color(0x407350) },
    uBackgroundColor: { value: new THREE.Color(0x1d3122) },
    uCellSize: { value: 10.0 },
    uLineWidth: { value: 1.5 },
    uFadeStart: { value: 50.0 },
    uFadeEnd: { value: 80.0 }
  },
  transparent: false,
  depthWrite: true
});

const gridGeometry = new THREE.PlaneGeometry(120, 120, 1, 1);
gridGeometry.rotateX(-Math.PI / 2); // Horizontal plane
const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
scene.add(gridMesh);
```

### 2.2 Procedural Ground Material

**Triplanar Texture Mapping** to avoid UV distortion:
```glsl
// Triplanar projection shader
vec3 triplanarMapping(sampler2D tex, vec3 worldPos, vec3 worldNormal) {
  vec3 blending = abs(worldNormal);
  blending = normalize(max(blending, 0.00001));
  float b = blending.x + blending.y + blending.z;
  blending /= vec3(b, b, b);

  vec3 xaxis = texture(tex, worldPos.yz).rgb;
  vec3 yaxis = texture(tex, worldPos.xz).rgb;
  vec3 zaxis = texture(tex, worldPos.xy).rgb;

  return xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;
}
```

---

## Phase 3: PBR Material Pipeline (Weeks 4-5)

### 3.1 Texture Channel Specification

**Standard PBR Metallic-Roughness Workflow**:

| Texture Map | Resolution | Format | Channels | Purpose |
|-------------|------------|--------|----------|---------|
| Base Color (Albedo) | 2048×2048 | sRGB | RGB | Diffuse paint/dirt color |
| Normal Map | 2048×2048 | Linear | RGB | Surface micro-detail |
| ORM (Packed) | 2048×2048 | Linear | R=AO, G=Rough, B=Metal | Material properties |
| Emissive | 1024×1024 | sRGB | RGB | Self-illumination (gauges, lights) |

**Compression**: Basis Universal (KTX2) with UASTC encoding
**Memory Budget**: ~12MB GPU VRAM per tank asset

### 3.2 Tank Hull Material Example

```javascript
const tankHullMaterial = new THREE.MeshStandardMaterial({
  map: textureLoader.load('assets/tank/m48_albedo_bc1.ktx2'),
  normalMap: textureLoader.load('assets/tank/m48_normal_bc5.ktx2'),
  normalScale: new THREE.Vector2(1.5, 1.5),

  // ORM texture (AO in R, Roughness in G, Metallic in B)
  aoMap: textureLoader.load('assets/tank/m48_orm.ktx2'),
  aoMapIntensity: 0.8,
  roughnessMap: textureLoader.load('assets/tank/m48_orm.ktx2'),
  roughness: 0.7,
  metalnessMap: textureLoader.load('assets/tank/m48_orm.ktx2'),
  metalness: 0.3,

  emissiveMap: textureLoader.load('assets/tank/m48_emissive.ktx2'),
  emissive: new THREE.Color(0xff4400),
  emissiveIntensity: 2.0,

  envMapIntensity: 1.2 // HDRI reflections
});
```

### 3.3 Required External Assets

**CRITICAL**: These assets require professional 3D modeling software:

#### Tank Cockpit Model
- **Software**: Blender 4.0+ or Autodesk Maya
- **Poly Count**: 15,000-25,000 triangles (optimized for real-time)
- **Components**:
  - M48-A2 Patton hull front glacis
  - Main gun barrel with muzzle brake
  - Track fenders (left/right)
  - Driver periscope blocks
  - Interior gauges, switches, CRT monitor
- **Export Format**: GLTF 2.0 (.glb) with Draco compression
- **Naming Convention**: `m48_cockpit_lod0.glb`

#### Texture Authoring
- **Software**: Substance 3D Painter or Adobe Photoshop + Materialize
- **Workflow**:
  1. Import high-poly mesh in Substance Painter
  2. Auto-generate AO, curvature, normal maps from geometry
  3. Paint weathering, scratches, dirt using smart materials
  4. Export 4 texture sets: Albedo, Normal, ORM, Emissive
  5. Convert to KTX2 using `basisu` CLI tool

---

## Phase 4: Environmental Atmosphere (Week 6)

### 4.1 HDRI Skybox & Image-Based Lighting

**HDRI Source**: [Poly Haven](https://polyhaven.com/hdris) - Free CC0 HDRIs
**Recommended**: `overcast_soil_puresky_4k.exr` (4096×2048, 32-bit float)

```javascript
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envMapLoader = new THREE.HDRLoader();

envMapLoader.load('assets/env/overcast_soil_4k.hdr', (hdrTexture) => {
  const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
  scene.environment = envMap; // IBL for all PBR materials
  scene.background = envMap;  // Skybox
  hdrTexture.dispose();
  pmremGenerator.dispose();
});
```

### 4.2 Volumetric Fog (Froxel Grid)

**Implementation**: Three.js `FogExp2` (exponential fog)

```javascript
scene.fog = new THREE.FogExp2(0x283844, 0.015); // Color, density
```

**Advanced**: Custom froxel compute shader (requires WebGL2 compute or WebGPU):
- 3D texture grid (128×72×64 froxels)
- Rayleigh + Mie scattering simulation
- Light shafts through fog volume

### 4.3 Cascaded Shadow Maps

```javascript
const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.5);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;

// CSM configuration
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 250;
dirLight.shadow.mapSize.width = 4096;
dirLight.shadow.mapSize.height = 4096;
dirLight.shadow.bias = -0.0001;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
```

---

## Phase 5: VFX & Post-Processing (Week 7-8)

### 5.1 GPU Particle Systems

**Mine Explosion Effect**:
```javascript
class MineExplosionVFX {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position.clone();
    this.particleCount = 300;
    this.particles = [];
    this.age = 0;
    this.lifetime = 2.5; // seconds

    this.createParticles();
  }

  createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Initial position (at explosion center)
      positions[i3] = this.position.x + (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = this.position.y + Math.random() * 0.3;
      positions[i3 + 2] = this.position.z + (Math.random() - 0.5) * 0.5;

      // Random velocity (radial explosion)
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      velocities[i3] = Math.cos(angle) * speed;
      velocities[i3 + 1] = 5 + Math.random() * 15; // Upward
      velocities[i3 + 2] = Math.sin(angle) * speed;

      // Color (fire orange to black smoke)
      const heat = Math.random();
      colors[i3] = heat > 0.6 ? 1.0 : 0.3; // R
      colors[i3 + 1] = heat > 0.6 ? 0.4 : 0.2; // G
      colors[i3 + 2] = 0.0; // B
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  update(deltaTime) {
    this.age += deltaTime;

    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = this.particleSystem.geometry.attributes.velocity.array;
    const gravity = -9.8;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Update position
      positions[i3] += velocities[i3] * deltaTime;
      positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
      positions[i3 + 2] += velocities[i3 + 2] * deltaTime;

      // Apply gravity
      velocities[i3 + 1] += gravity * deltaTime;

      // Air resistance
      velocities[i3] *= 0.98;
      velocities[i3 + 2] *= 0.98;
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;

    // Fade out
    this.particleSystem.material.opacity = 1.0 - (this.age / this.lifetime);

    return this.age < this.lifetime;
  }

  destroy() {
    this.scene.remove(this.particleSystem);
    this.particleSystem.geometry.dispose();
    this.particleSystem.material.dispose();
  }
}
```

### 5.2 Post-Processing Stack

```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAShaderPass';

const composer = new EffectComposer(renderer);

// Pass 1: Render scene
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Pass 2: SSAO (Screen-Space Ambient Occlusion)
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16;
ssaoPass.minDistance = 0.005;
ssaoPass.maxDistance = 0.1;
composer.addPass(ssaoPass);

// Pass 3: Bloom (for explosions, lasers, lights)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6,  // Strength
  0.4,  // Radius
  0.85  // Threshold
);
composer.addPass(bloomPass);

// Pass 4: FXAA (Fast Approximate Anti-Aliasing)
const fxaaPass = new FXAAPass();
fxaaPass.material.uniforms['resolution'].value.set(
  1 / window.innerWidth,
  1 / window.innerHeight
);
composer.addPass(fxaaPass);

// Render loop
function animate() {
  composer.render();
}
```

---

## Asset Production Checklist

### Required 3D Models (Blender/Maya)
- [ ] M48-A2 Patton cockpit (15K tris, GLTF)
- [ ] Main gun barrel assembly (5K tris, GLTF)
- [ ] Track fenders (left/right, 3K tris each)
- [ ] Interior CRT monitor bezel (2K tris)
- [ ] Instrument gauges cluster (4K tris)
- [ ] Hazard flag beacon (1K tris)
- [ ] Mine crater decal mesh (500 tris)
- [ ] DEM mountain terrain (LOD 0-2, 20K-5K tris)

### Required Textures (Substance Painter)
- [ ] Tank hull PBR set (Albedo, Normal, ORM, Emissive @ 2048²)
- [ ] Gun barrel PBR set (1024²)
- [ ] Interior panel PBR set (2048²)
- [ ] Ground gravel triplanar (1024² tileable)
- [ ] Concrete tile triplanar (1024² tileable)
- [ ] Scorched earth decal (512²)

### HDRI & Skybox
- [ ] Download `overcast_soil_puresky_4k.hdr` from Poly Haven
- [ ] Convert to KTX2 UASTC using `basisu`

### Audio Assets (Already in place)
- ✅ Mine explosion sound
- ✅ Tank engine rumble
- ✅ Radar scanner ping
- ✅ Cannon fire

---

## Performance Budget

| Metric | Desktop Target | Mobile Target |
|--------|----------------|---------------|
| Frame Rate | 60 FPS | 30 FPS |
| Draw Calls | < 100 | < 50 |
| Triangles | < 100K | < 50K |
| GPU VRAM | < 256MB | < 128MB |
| Texture Memory | < 64MB | < 32MB |
| Shader Complexity | < 500 ALU ops | < 250 ALU ops |

**Optimization Techniques**:
- Geometry instancing for repeating elements (rocks, grass tufts)
- Texture atlasing (combine multiple textures into one)
- Mesh LOD (Level of Detail) with distance-based swapping
- Frustum culling (don't render off-screen objects)
- Occlusion culling (don't render objects behind mountains)

---

## File Structure

```
D:\solitaire\
├── src/
│   ├── games/
│   │   └── tank_minefield.js          (Logic - unchanged)
│   ├── core/
│   │   └── tank_minefield/            (Logic modules - unchanged)
│   ├── renderer/                      [NEW]
│   │   ├── TankSceneCoordinator.js    (Visual manager)
│   │   ├── GridShaderMaterial.js      (Custom grid shader)
│   │   ├── PBRMaterialFactory.js      (Material creation)
│   │   └── VFXManager.js              (Particle systems)
│   └── ui/
│       └── tank_minefield_view_3d.js  [NEW] (Three.js renderer)
├── assets/
│   ├── tank/
│   │   ├── models/
│   │   │   ├── m48_cockpit_lod0.glb
│   │   │   ├── m48_gun_barrel.glb
│   │   │   └── hazard_flag.glb
│   │   └── textures/
│   │       ├── m48_albedo_bc1.ktx2
│   │       ├── m48_normal_bc5.ktx2
│   │       ├── m48_orm.ktx2
│   │       └── m48_emissive.ktx2
│   ├── terrain/
│   │   ├── gravel_albedo.ktx2
│   │   ├── gravel_normal.ktx2
│   │   └── concrete_orm.ktx2
│   └── env/
│       └── overcast_soil_4k.hdr
└── shaders/                           [NEW]
    ├── grid.vert.glsl
    ├── grid.frag.glsl
    └── triplanar.glsl
```

---

## Next Steps - Immediate Actions

### Week 1 Tasks:
1. **Install Three.js**: `npm install three@0.186.0`
2. **Create base scene**: Camera, renderer, lighting setup
3. **Implement coordinate mapper**: Grid [row,col] ↔ World [x,y,z]
4. **Test render loop**: On-demand rendering with event bus

### Week 2 Tasks:
1. **Grid shader implementation**: Vertex + Fragment shaders with fwidth()
2. **Procedural ground plane**: Triplanar texture mapping
3. **Cell state visualization**: Flags, craters, extraction zone markers

### External Dependencies:
1. **3D Artist**: Commission M48 tank cockpit model (Est. 20-40 hours @ $30-60/hr)
2. **Texture Artist**: PBR texture set authoring (Est. 10-20 hours @ $25-50/hr)
3. **HDRI**: Download free from Poly Haven (0 hours, $0)

**Total Estimated External Cost**: $1,000 - $3,000 USD

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance degradation on mobile | High | High | Implement aggressive LOD, disable post-FX on mobile |
| Asset pipeline complexity | Medium | Medium | Use standard GLTF + KTX2 formats, automate with scripts |
| Three.js version breaking changes | Low | Medium | Lock version to r186, test updates in staging |
| Browser WebGL support gaps | Low | High | Provide WebGL1 fallback, detect capabilities |

---

## Conclusion

This overhaul transforms the tank game from a 2D Canvas rendering system to a full 3D PBR-based WebGL2 engine. The architecture separates game logic from visual presentation, enabling:

1. **Scalable Rendering**: On-demand GPU usage reduces power consumption
2. **AAA Visual Quality**: PBR materials, HDRI lighting, post-processing
3. **Maintainable Codebase**: Clear separation of concerns (logic vs visuals)
4. **Future-Proof**: Ready for WebGPU migration when widely supported

**Implementation Timeline**: 7-8 weeks (1 developer)
**External Asset Production**: 2-3 weeks (3D/texture artists)
**Total Project Duration**: ~10 weeks from start to production-ready

---

**Document Version**: 1.0
**Last Updated**: 2026-10-18
**Author**: Technical Architecture Specification
**Status**: Planning Phase - Awaiting approval to proceed with Phase 1
