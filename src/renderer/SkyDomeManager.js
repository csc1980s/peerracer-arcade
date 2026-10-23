/**
 * Sky Dome & Atmospheric Environment Manager
 *
 * Responsibilities:
 * - Renders a 360° celestial sky dome with procedural zenith-to-horizon gradients.
 * - Simulates celestial sun disc, solar halo flare, and distant jagged mountain silhouettes.
 * - Manages environmental IBL reflections for PBR tank armor and metallic beacons.
 * - Simulates dynamic storm weather (vertical falling rain streaks and intermittent lightning).
 */

import * as THREE from 'three';
import { ENVIRONMENT_PRESETS } from './EnvironmentPresets.js';

export class SkyDomeManager {
  constructor(scene, renderer, coordinator) {
    this.scene = scene;
    this.renderer = renderer;
    this.coordinator = coordinator;

    this.currentPresetId = 'twilight';
    this.preset = ENVIRONMENT_PRESETS.twilight;

    // Storm Weather Systems
    this.rainMesh = null;
    this.lightning = {
      active: false,
      timer: 0,
      nextInterval: 5.5,
      flashDuration: 0.22,
      intensity: 0
    };

    this._initSkyDome();
    this._initRainSystem();
    this.applyPreset(this.currentPresetId);
  }

  _initSkyDome() {
    const domeGeo = new THREE.SphereGeometry(320, 32, 16);

    const vertexShader = /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = /* glsl */ `
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uSunSize;
      uniform float uMountainHeight;
      uniform vec3 uMountainColor;
      uniform float uLightningFlash;
      uniform float uTime;
      varying vec3 vWorldPos;

      void main() {
        vec3 dir = normalize(vWorldPos);

        // Zenith to Horizon Vertical Gradient
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 skyColor = mix(uHorizonColor, uZenithColor, pow(h, 0.55));

        // Celestial Sun / Moon Disc & Solar Halo
        float cosAngle = dot(dir, normalize(uSunDir));
        if (cosAngle > 0.0) {
          float sunDisc = smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.25, cosAngle);
          float sunHalo = pow(cosAngle, 28.0) * 0.45;
          skyColor = mix(skyColor, uSunColor, sunHalo);
          skyColor = mix(skyColor, uSunColor * 1.5, sunDisc);
        }

        // Procedural Distant Mountain Silhouette along Horizon
        float azimuth = atan(dir.x, dir.z);
        float mNoise = sin(azimuth * 4.0) * 0.45 +
                       sin(azimuth * 9.0 + 1.2) * 0.3 +
                       sin(azimuth * 21.0 + 2.5) * 0.15 +
                       sin(azimuth * 43.0) * 0.08;
        float mountainLine = uMountainHeight * (0.55 + mNoise * 0.45);

        if (dir.y < mountainLine && dir.y > -0.05) {
          float edgeAlpha = smoothstep(mountainLine, mountainLine - 0.015, dir.y);
          skyColor = mix(skyColor, uMountainColor, edgeAlpha * 0.95);
        }

        // Storm Lightning Flash Illumination
        if (uLightningFlash > 0.01) {
          skyColor += vec3(0.55, 0.62, 0.75) * uLightningFlash;
        }

        gl_FragColor = vec4(skyColor, 1.0);
      }
    `;

    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uZenithColor: { value: this.preset.sky.zenithColor.clone() },
        uHorizonColor: { value: this.preset.sky.horizonColor.clone() },
        uSunColor: { value: this.preset.sky.sunColor.clone() },
        uSunDir: { value: new THREE.Vector3(...this.preset.sun.position).normalize() },
        uSunSize: { value: this.preset.sky.sunSize },
        uMountainHeight: { value: this.preset.sky.mountainHeight },
        uMountainColor: { value: this.preset.sky.mountainColor.clone() },
        uLightningFlash: { value: 0.0 },
        uTime: { value: 0.0 }
      },
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(domeGeo, this.skyMaterial);
    this.scene.add(this.skyDome);
  }

  _initRainSystem() {
    const rainCount = 750;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 6); // 2 vertices per line streak

    for (let i = 0; i < rainCount; i++) {
      const i6 = i * 6;
      const x = (Math.random() - 0.5) * 120;
      const y = Math.random() * 45;
      const z = (Math.random() - 0.5) * 120;
      const streakLength = 1.2 + Math.random() * 0.8;

      positions[i6] = x;
      positions[i6 + 1] = y;
      positions[i6 + 2] = z;

      positions[i6 + 3] = x;
      positions[i6 + 4] = y - streakLength;
      positions[i6 + 5] = z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    this.rainMesh = new THREE.LineSegments(geometry, material);
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);
  }

  applyPreset(presetId) {
    const preset = ENVIRONMENT_PRESETS[presetId] || ENVIRONMENT_PRESETS.twilight;
    this.currentPresetId = presetId;
    this.preset = preset;

    // 1. Update Sky Dome Shader Uniforms
    if (this.skyMaterial && this.skyMaterial.uniforms) {
      this.skyMaterial.uniforms.uZenithColor.value.copy(preset.sky.zenithColor);
      this.skyMaterial.uniforms.uHorizonColor.value.copy(preset.sky.horizonColor);
      this.skyMaterial.uniforms.uSunColor.value.copy(preset.sky.sunColor);
      this.skyMaterial.uniforms.uSunDir.value.set(...preset.sun.position).normalize();
      this.skyMaterial.uniforms.uSunSize.value = preset.sky.sunSize;
      this.skyMaterial.uniforms.uMountainHeight.value = preset.sky.mountainHeight;
      this.skyMaterial.uniforms.uMountainColor.value.copy(preset.sky.mountainColor);
    }

    // 2. Update Renderer Clear Color & Atmospheric Fog
    if (this.renderer) {
      this.renderer.setClearColor(preset.clearColor);
    }
    if (this.scene.fog) {
      this.scene.fog.color.setHex(preset.fogColor);
      this.scene.fog.density = preset.fogDensity;
    }

    // 3. Update Tactical Sun & Ambient Lights in Coordinator
    if (this.coordinator.sunLight) {
      this.coordinator.sunLight.color.setHex(preset.sun.color);
      this.coordinator.sunLight.intensity = preset.sun.intensity;
      this.coordinator.sunLight.position.set(...preset.sun.position);
    }
    if (this.coordinator.hemiLight) {
      this.coordinator.hemiLight.color.setHex(preset.hemi.skyColor);
      this.coordinator.hemiLight.groundColor.setHex(preset.hemi.groundColor);
      this.coordinator.hemiLight.intensity = preset.hemi.intensity;
    }

    // 4. Update Ground Grid Shader Colors
    if (this.coordinator.gridMaterial && this.coordinator.gridMaterial.uniforms) {
      this.coordinator.gridMaterial.uniforms.uGridColor.value.copy(preset.grid.gridColor);
      this.coordinator.gridMaterial.uniforms.uSubGridColor.value.copy(preset.grid.subGridColor);
      this.coordinator.gridMaterial.uniforms.uBackgroundColor.value.copy(preset.grid.backgroundColor);
    }

    // 5. Toggle Rain System Visibility
    if (this.rainMesh) {
      this.rainMesh.visible = !!preset.hasRain;
    }

    // 6. Generate IBL Ambient Reflection
    this._updateEnvironmentReflection(preset);

    this.coordinator.requestRender();
  }

  _updateEnvironmentReflection(preset) {
    try {
      if (this.cubeRenderTarget) {
        this.cubeRenderTarget.dispose();
      }
      this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter
      });

      const cubeCamera = new THREE.CubeCamera(1, 400, this.cubeRenderTarget);
      cubeCamera.position.set(0, 5, 0);

      const wasCockpitVisible = this.coordinator?.cockpitGroup?.visible;
      if (this.coordinator?.cockpitGroup) {
        this.coordinator.cockpitGroup.visible = false;
      }

      cubeCamera.update(this.renderer, this.scene);

      if (this.coordinator?.cockpitGroup && wasCockpitVisible) {
        this.coordinator.cockpitGroup.visible = true;
      }

      this.scene.environment = this.cubeRenderTarget.texture;
    } catch (e) {
      // Fallback: PMREM / cubemap skipped
    }
  }

  update(time, deltaTime, tankWorldPos) {
    // Keep Sky Dome centered around camera
    if (this.coordinator.camera) {
      this.skyDome.position.copy(this.coordinator.camera.position);
    }

    // Update Sky Shader time
    if (this.skyMaterial?.uniforms) {
      this.skyMaterial.uniforms.uTime.value = time;
    }

    // Storm Weather Simulation (Rain & Lightning)
    if (this.preset.hasRain && this.rainMesh && this.rainMesh.visible) {
      const posAttr = this.rainMesh.geometry.attributes.position;
      const pos = posAttr.array;
      const speed = 48.0 * deltaTime;

      const centerX = tankWorldPos ? tankWorldPos.x : 60;
      const centerZ = tankWorldPos ? tankWorldPos.z : 60;

      for (let i = 0; i < pos.length / 6; i++) {
        const i6 = i * 6;
        pos[i6 + 1] -= speed;
        pos[i6 + 4] -= speed;

        // Reset falling rain streak when hitting ground
        if (pos[i6 + 1] < 0) {
          const rx = centerX + (Math.random() - 0.5) * 120;
          const rz = centerZ + (Math.random() - 0.5) * 120;
          const ry = 38.0 + Math.random() * 8.0;
          const streakLen = 1.2 + Math.random() * 0.8;

          pos[i6] = rx;
          pos[i6 + 1] = ry;
          pos[i6 + 2] = rz;

          pos[i6 + 3] = rx;
          pos[i6 + 4] = ry - streakLen;
          pos[i6 + 5] = rz;
        }
      }
      posAttr.needsUpdate = true;

      // Intermittent Distant Lightning Generator
      this.lightning.timer += deltaTime;
      if (this.lightning.timer >= this.lightning.nextInterval) {
        this.lightning.active = true;
        this.lightning.timer = 0;
        this.lightning.nextInterval = 4.5 + Math.random() * 6.0;
        this.lightning.flashTimer = 0;
      }

      if (this.lightning.active) {
        this.lightning.flashTimer += deltaTime;
        if (this.lightning.flashTimer >= this.lightning.flashDuration) {
          this.lightning.active = false;
          this.lightning.intensity = 0;
          if (this.skyMaterial?.uniforms) {
            this.skyMaterial.uniforms.uLightningFlash.value = 0;
          }
          if (this.coordinator.sunLight) {
            this.coordinator.sunLight.intensity = this.preset.sun.intensity;
          }
        } else {
          // Double-strobe thunder strike effect
          const strobe = Math.abs(Math.sin(this.lightning.flashTimer * 38.0));
          this.lightning.intensity = strobe * (1.0 - this.lightning.flashTimer / this.lightning.flashDuration);
          if (this.skyMaterial?.uniforms) {
            this.skyMaterial.uniforms.uLightningFlash.value = this.lightning.intensity;
          }
          if (this.coordinator.sunLight) {
            this.coordinator.sunLight.intensity = this.preset.sun.intensity + this.lightning.intensity * 2.8;
          }
        }
      }
    }
  }

  destroy() {
    this.scene.remove(this.skyDome);
    if (this.skyDome.geometry) this.skyDome.geometry.dispose();
    if (this.skyMaterial) this.skyMaterial.dispose();

    if (this.rainMesh) {
      this.scene.remove(this.rainMesh);
      if (this.rainMesh.geometry) this.rainMesh.geometry.dispose();
      if (this.rainMesh.material) this.rainMesh.material.dispose();
    }

    if (this.cubeRenderTarget) {
      this.cubeRenderTarget.dispose();
      this.cubeRenderTarget = null;
    }
    if (this.scene.environment) {
      this.scene.environment = null;
    }
  }
}
