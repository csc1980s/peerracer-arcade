/**
 * Tactical Vision Post-Processing Shader
 * Supports:
 * - Mode 0: Standard (Passthrough)
 * - Mode 1: NVG (Night Vision Green phosphor CRT with scanlines, grain noise, and vignette)
 * - Mode 2: Thermal FLIR (Ironbow false-color infrared heat signature mode)
 */

export const TacticalVisionShader = {
  name: 'TacticalVisionShader',
  uniforms: {
    tDiffuse: { value: null },
    uMode: { value: 0 }, // 0: Standard, 1: NVG, 2: Thermal FLIR
    uTime: { value: 0.0 },
    uResolution: { value: [800.0, 540.0] },
    uNightVisionGain: { value: 1.45 },
    uThermalThreshold: { value: 0.15 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform int uMode;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uNightVisionGain;
    varying vec2 vUv;

    // Pseudo-random noise generator
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Thermal False-Color Palette (Ironbow)
    vec3 ironbow(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 c0 = vec3(0.03, 0.05, 0.16); // Cold background
      vec3 c1 = vec3(0.24, 0.04, 0.48); // Low heat (indigo/purple)
      vec3 c2 = vec3(0.72, 0.12, 0.38); // Medium-low heat (magenta)
      vec3 c3 = vec3(0.96, 0.48, 0.08); // Medium heat (orange)
      vec3 c4 = vec3(1.00, 0.88, 0.22); // High heat (yellow)
      vec3 c5 = vec3(1.00, 1.00, 0.95); // White hot

      if (t < 0.2) return mix(c0, c1, t / 0.2);
      if (t < 0.4) return mix(c1, c2, (t - 0.2) / 0.2);
      if (t < 0.65) return mix(c2, c3, (t - 0.4) / 0.25);
      if (t < 0.85) return mix(c3, c4, (t - 0.65) / 0.2);
      return mix(c4, c5, (t - 0.85) / 0.15);
    }

    void main() {
      vec4 sceneColor = texture2D(tDiffuse, vUv);

      if (uMode == 0) {
        // Standard View: Passthrough
        gl_FragColor = sceneColor;
        return;
      }

      // Mode 1: Night Vision (NVG Green Phosphor)
      if (uMode == 1) {
        // Compute perceptual luminance
        float lum = dot(sceneColor.rgb, vec3(0.299, 0.587, 0.114));
        lum = pow(lum * uNightVisionGain, 0.85);

        // Circular Night Vision Goggle Vignette
        vec2 centerDist = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
        float dist = length(centerDist);
        float vignette = smoothstep(0.78, 0.42, dist);

        // Animated High-Frequency Phosphor Noise Grain
        float noise = (hash(vUv * 640.0 + fract(uTime * 17.1)) - 0.5) * 0.18;

        // Subtle CRT scanline modulation
        float scanline = sin(vUv.y * uResolution.y * 1.8) * 0.06;

        float greenVal = clamp(lum + noise - scanline, 0.0, 1.0) * vignette;

        // Military P-43 Green Phosphor tint
        vec3 nvgColor = vec3(greenVal * 0.22, greenVal * 1.25, greenVal * 0.38);

        // Subtle optical distortion edge halo
        nvgColor += vec3(0.01, 0.05, 0.02) * (1.0 - vignette);

        gl_FragColor = vec4(nvgColor, 1.0);
        return;
      }

      // Mode 2: Thermal FLIR (Infrared Heat Signature)
      if (uMode == 2) {
        // Luminance + color intensity as temperature index
        float temp = dot(sceneColor.rgb, vec3(0.32, 0.55, 0.13));

        // High-contrast contrast curve for clear identification of vehicles, beacons & mines
        float heat = pow(temp, 0.95);

        // Add subtle sensor scanline artifact
        float flirScan = sin(vUv.y * uResolution.y * 1.2) * 0.025;
        heat = clamp(heat + flirScan, 0.0, 1.0);

        vec3 thermalColor = ironbow(heat);

        // Central FLIR Tactical Crosshair Overlay
        vec2 centerPixel = (vUv - 0.5) * uResolution;
        float dX = abs(centerPixel.x);
        float dY = abs(centerPixel.y);
        bool isCrosshair = (dX < 18.0 && dY < 1.0 && dX > 3.0) ||
                           (dY < 18.0 && dX < 1.0 && dY > 3.0);

        if (isCrosshair) {
          thermalColor = mix(thermalColor, vec3(0.1, 1.0, 0.2), 0.85);
        }

        gl_FragColor = vec4(thermalColor, 1.0);
        return;
      }

      gl_FragColor = sceneColor;
    }
  `
};
