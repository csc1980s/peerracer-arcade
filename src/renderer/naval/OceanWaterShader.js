/**
 * Ocean Water Shader Material — Multi-Octave Gerstner Waves
 *
 * Implements physical wave displacement, dynamic foam crests,
 * sun glint specular highlights, and water ripple shockwaves.
 */

import * as THREE from 'three';

export function createOceanWaterMaterial(options = {}) {
  const vertexShader = /* glsl */ `
    precision highp float;

    uniform float uTime;
    uniform vec3 uSunDir;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vWaveHeight;
    varying vec2 vUv;

    // Gerstner Wave Component Function
    vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
      float steepness = wave.z;
      float wavelength = wave.w;
      float k = 2.0 * 3.14159265 / wavelength;
      float c = sqrt(9.8 / k);
      vec2 d = normalize(wave.xy);
      float f = k * (dot(d, p.xz) - c * uTime * 0.7);
      float a = steepness / k;

      tangent += vec3(
        -d.x * d.x * (steepness * sin(f)),
        d.x * (steepness * cos(f)),
        -d.x * d.y * (steepness * sin(f))
      );
      binormal += vec3(
        -d.x * d.y * (steepness * sin(f)),
        d.y * (steepness * cos(f)),
        -d.y * d.y * (steepness * sin(f))
      );

      return vec3(
        d.x * (a * cos(f)),
        a * sin(f),
        d.y * (a * cos(f))
      );
    }

    void main() {
      vUv = uv;
      vec3 gridPoint = position;

      vec3 tangent = vec3(1.0, 0.0, 0.0);
      vec3 binormal = vec3(0.0, 0.0, 1.0);
      vec3 p = gridPoint;

      // 4 Multi-Directional Gerstner Harmonic Waves: vec4(dirX, dirZ, steepness, wavelength)
      vec4 w1 = vec4(0.8, 0.6, 0.22, 45.0);
      vec4 w2 = vec4(-0.6, 0.8, 0.18, 28.0);
      vec4 w3 = vec4(0.95, -0.3, 0.14, 16.0);
      vec4 w4 = vec4(-0.4, -0.9, 0.10, 8.5);

      p += gerstnerWave(w1, gridPoint, tangent, binormal);
      p += gerstnerWave(w2, gridPoint, tangent, binormal);
      p += gerstnerWave(w3, gridPoint, tangent, binormal);
      p += gerstnerWave(w4, gridPoint, tangent, binormal);

      vec3 normal = normalize(cross(binormal, tangent));
      vNormal = normal;
      vWaveHeight = p.y;

      vec4 worldPos = modelMatrix * vec4(p, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uDeepWaterColor;
    uniform vec3 uShallowWaterColor;
    uniform vec3 uSSSColor;
    uniform vec3 uFoamColor;
    uniform float uTime;

    uniform sampler2D uNormalMap;
    uniform sampler2D uFoamMap;

    // Dynamic Geyser / Shell Splash Shockwaves
    uniform vec3 uSplashCenter;
    uniform float uSplashRadius;
    uniform float uSplashAlpha;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vWaveHeight;
    varying vec2 vUv;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPos);

      // Dual scrolling normal map octaves for high-frequency micro-ripples
      vec2 uv1 = vUv * 32.0 + vec2(uTime * 0.025, uTime * 0.018);
      vec2 uv2 = vUv * 48.0 + vec2(-uTime * 0.02, uTime * 0.03);
      vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
      vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
      vec3 waveRipple = normalize(n1 + n2);
      vec3 normal = normalize(vNormal + waveRipple * 0.42);

      // 1. Beer-Lambert Depth Absorption Gradient (Deep oceanic navy -> surface swell)
      float depthFactor = clamp((vWaveHeight + 1.2) / 2.6, 0.0, 1.0);
      vec3 waterColor = mix(uDeepWaterColor, uShallowWaterColor, depthFactor);

      // 2. Subsurface Scattering (Backlit wave crest emerald/cyan glow)
      vec3 sssDir = normalize(uSunDir + normal * 0.35);
      float sss = pow(clamp(dot(viewDir, -sssDir), 0.0, 1.0), 3.5) * depthFactor;
      waterColor += uSSSColor * sss * 0.75;

      // 3. Fresnel Sky Reflection (Crisp marine blue sky, NOT tan)
      float f0 = 0.02; // Water IOR 1.333
      float fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(viewDir, normal), 0.0), 4.5);
      vec3 skyReflectColor = mix(vec3(0.18, 0.32, 0.50), vec3(0.55, 0.72, 0.88), normal.y * 0.5 + 0.5);
      waterColor = mix(waterColor, skyReflectColor, fresnel * 0.85);

      // 4. GGX Microfacet Sun Specular Glints (Dancing diamond sparkle)
      vec3 halfDir = normalize(uSunDir + viewDir);
      float NdotH = max(dot(normal, halfDir), 0.0);
      float spec = pow(NdotH, 140.0);
      waterColor += uSunColor * spec * 2.5;

      // 5. Cellular Seafoam on Wave Crests
      vec4 foamTex = texture2D(uFoamMap, vUv * 16.0 + vec2(uTime * 0.012, uTime * 0.015));
      float crestFoam = smoothstep(0.85, 1.45, vWaveHeight) * foamTex.r * 0.85;
      waterColor = mix(waterColor, uFoamColor, crestFoam * 0.85);

      // 6. Artillery Splash Shockwave
      if (uSplashAlpha > 0.01) {
        float distToSplash = length(vWorldPos.xz - uSplashCenter.xz);
        float ring = abs(distToSplash - uSplashRadius);
        float ringAlpha = (1.0 - smoothstep(0.0, 2.5, ring)) * uSplashAlpha;
        waterColor = mix(waterColor, uFoamColor, ringAlpha * 0.9);
      }

      // 7. Distance Horizon Fog Blending (Deep marine blue haze)
      float distToCam = length(cameraPosition - vWorldPos);
      float fogFactor = 1.0 - exp(-distToCam * 0.0022);
      vec3 horizonColor = vec3(0.22, 0.34, 0.48);
      waterColor = mix(waterColor, horizonColor, fogFactor);

      gl_FragColor = vec4(waterColor, 0.98);
    }
  `;

  const texGen = options.textureGenerator;
  const normalMap = texGen ? texGen.getWaterNormalMap() : null;
  const foamMap = texGen ? texGen.getSeafoamTexture() : null;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uSunDir: { value: new THREE.Vector3(-60, 110, -50).normalize() },
      uSunColor: { value: new THREE.Color(0xffffff) },
      uDeepWaterColor: { value: new THREE.Color(0x061933) },     // Deep Abyssal Royal Navy
      uShallowWaterColor: { value: new THREE.Color(0x0e4572) },  // Swell Oceanic Blue
      uSSSColor: { value: new THREE.Color(0x0a708c) },           // Subsurface Cyan
      uFoamColor: { value: new THREE.Color(0xf1f8fe) },          // Churned White Seafoam
      uNormalMap: { value: normalMap },
      uFoamMap: { value: foamMap },
      uSplashCenter: { value: new THREE.Vector3(0, 0, 0) },
      uSplashRadius: { value: 0.0 },
      uSplashAlpha: { value: 0.0 }
    },
    transparent: true,
    side: THREE.DoubleSide
  });
}
