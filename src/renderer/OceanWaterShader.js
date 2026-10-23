/**
 * Ocean Water Shader - Realistic Naval Combat Water Surface
 *
 * Implements Gerstner waves for realistic ocean surface
 * Optimized for naval warfare viewport (not photorealistic, but convincing)
 */

import * as THREE from 'three';

/**
 * Ocean Water Shader Material
 * Based on simplified Gerstner wave equations
 */
export function createOceanWaterMaterial(options = {}) {
  const {
    deepColor = new THREE.Color(0x001a33),      // Deep ocean blue
    shallowColor = new THREE.Color(0x0d3d5c),   // Shallow water
    foamColor = new THREE.Color(0x8fb8d4),      // Wave foam
    waveHeight = 1.2,
    waveFrequency = 0.15,
    waveSpeed = 0.5,
    timeOfDay = 'twilight'  // 'daylight', 'twilight', 'night'
  } = options;

  // Adjust colors based on time of day
  let finalDeepColor = deepColor;
  let finalShallowColor = shallowColor;

  if (timeOfDay === 'daylight') {
    finalDeepColor = new THREE.Color(0x0a4d6e);
    finalShallowColor = new THREE.Color(0x2d6a8a);
  } else if (timeOfDay === 'night') {
    finalDeepColor = new THREE.Color(0x000511);
    finalShallowColor = new THREE.Color(0x0a1420);
  }

  const vertexShader = /* glsl */ `
    precision highp float;

    uniform float uTime;
    uniform float uWaveHeight;
    uniform float uWaveFrequency;
    uniform float uWaveSpeed;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vWaveHeight;

    // Gerstner wave function
    vec3 gerstnerWave(vec3 pos, float wavelength, float amplitude, vec2 direction, float speed, float time) {
      float k = 2.0 * 3.14159 / wavelength;
      float c = sqrt(9.8 / k); // Wave speed from gravity
      vec2 d = normalize(direction);
      float f = k * (dot(d, pos.xz) - c * speed * time);
      float a = amplitude / k;

      return vec3(
        d.x * a * cos(f),
        a * sin(f),
        d.y * a * cos(f)
      );
    }

    void main() {
      vec3 pos = position;
      float time = uTime * uWaveSpeed;

      // Multiple wave layers for realistic ocean
      vec3 wave1 = gerstnerWave(pos, 15.0, uWaveHeight * 0.6, vec2(1.0, 0.3), 1.0, time);
      vec3 wave2 = gerstnerWave(pos, 8.0, uWaveHeight * 0.4, vec2(-0.7, 1.0), 0.8, time);
      vec3 wave3 = gerstnerWave(pos, 22.0, uWaveHeight * 0.3, vec2(0.5, -0.8), 1.2, time);
      vec3 wave4 = gerstnerWave(pos, 5.0, uWaveHeight * 0.2, vec2(-1.0, -0.5), 0.6, time + 10.0);

      pos += wave1 + wave2 + wave3 + wave4;

      vWaveHeight = pos.y;
      vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

      // Calculate normal for lighting
      vec3 tangent = vec3(1.0, 0.0, 0.0);
      vec3 bitangent = vec3(0.0, 0.0, 1.0);
      vNormal = normalize(cross(tangent, bitangent));

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFoamColor;
    uniform float uTime;
    uniform vec3 uSunDirection;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vWaveHeight;

    void main() {
      // Depth-based color variation
      float depthFactor = smoothstep(-2.0, 2.0, vWaveHeight);
      vec3 waterColor = mix(uDeepColor, uShallowColor, depthFactor);

      // Foam on wave crests
      float foamMask = smoothstep(0.8, 1.2, vWaveHeight);
      waterColor = mix(waterColor, uFoamColor, foamMask * 0.4);

      // Simple specular highlight (sun reflection)
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 reflectDir = reflect(-uSunDirection, vNormal);
      float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
      waterColor += vec3(specular * 0.6);

      // Distance fog
      float dist = length(vWorldPos - cameraPosition);
      float fogFactor = smoothstep(80.0, 200.0, dist);
      vec3 fogColor = vec3(0.5, 0.6, 0.7);
      waterColor = mix(waterColor, fogColor, fogFactor);

      gl_FragColor = vec4(waterColor, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uWaveHeight: { value: waveHeight },
      uWaveFrequency: { value: waveFrequency },
      uWaveSpeed: { value: waveSpeed },
      uDeepColor: { value: finalDeepColor },
      uShallowColor: { value: finalShallowColor },
      uFoamColor: { value: foamColor },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
    },
    side: THREE.DoubleSide,
    wireframe: false
  });
}

/**
 * Simple flat ocean material (fallback/low-performance mode)
 */
export function createSimpleOceanMaterial(color = 0x0d3d5c) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.6,
    metalness: 0.1,
    flatShading: false
  });
}
