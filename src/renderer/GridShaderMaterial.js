import * as THREE from 'three';

/**
 * Screen-Space Anti-Aliased Grid Shader Material
 * Uses screen-space derivatives (fwidth) to eliminate moiré and aliasing at shallow grazing angles.
 * Based on TANK_VISUAL_OVERHAUL_ARCHITECTURE.md (Phase 2.1)
 */
export function createGridShaderMaterial(options = {}) {
  const cellSize = options.cellSize || 10.0;
  const lineWidth = options.lineWidth || 1.6;
  const gridColor = options.gridColor || new THREE.Color(0x38bdf8); // Tactical cyan / radar blue
  const subGridColor = options.subGridColor || new THREE.Color(0x1e3a5f); // Deep muted secondary
  const backgroundColor = options.backgroundColor || new THREE.Color(0x0a101d); // Deep military slate
  const fadeStart = options.fadeStart || 80.0;
  const fadeEnd = options.fadeEnd || 180.0;

  const vertexShader = /* glsl */ `
    precision highp float;

    out vec2 vUv;
    out vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    in vec2 vUv;
    in vec3 vWorldPos;

    uniform vec3 uGridColor;
    uniform vec3 uSubGridColor;
    uniform vec3 uBackgroundColor;
    uniform float uCellSize;
    uniform float uLineWidth;
    uniform float uFadeStart;
    uniform float uFadeEnd;
    uniform vec2 uActiveCell; // Grid coord [col, row] of active tank cell
    uniform vec2 uTargetCell; // Grid coord [col, row] of target/hovered cell
    uniform float uScanRadius; // Holographic scan ring radius in world units
    uniform vec3 uScanCenter; // World pos of scan pulse
    uniform float uScanPulseAlpha; // Scan ring brightness
    uniform float uTime;

    out vec4 fragColor;

    void main() {
      // Primary grid coordinates
      vec2 gridCoord = vWorldPos.xz / uCellSize;

      // Compute screen-space derivatives to keep lines exactly N pixels wide
      vec2 derivative = fwidth(gridCoord);

      // Distance to nearest primary grid line (in pixels)
      vec2 grid = abs(fract(gridCoord - 0.5) - 0.5) / max(derivative, vec2(0.0001));
      float lineDistance = min(grid.x, grid.y);

      // Sub-grid (subdivided by 2 for fine tactical millimeter markers)
      vec2 subCoord = vWorldPos.xz / (uCellSize * 0.5);
      vec2 subDeriv = fwidth(subCoord);
      vec2 subGrid = abs(fract(subCoord - 0.5) - 0.5) / max(subDeriv, vec2(0.0001));
      float subDistance = min(subGrid.x, subGrid.y);

      // Smooth anti-aliased alpha
      float lineAlpha = 1.0 - smoothstep(uLineWidth - 1.0, uLineWidth + 1.0, lineDistance);
      float subAlpha = (1.0 - smoothstep(uLineWidth * 0.8 - 0.8, uLineWidth * 0.8 + 0.8, subDistance)) * 0.35;

      // Distance-based fade to horizon atmosphere
      float distanceToCamera = length(vWorldPos - cameraPosition);
      float fadeFactor = 1.0 - smoothstep(uFadeStart, uFadeEnd, distanceToCamera);
      lineAlpha *= fadeFactor;
      subAlpha *= fadeFactor;

      // Base background color with subtle radial tactical gradient
      vec3 color = uBackgroundColor;

      // Composite sub-grid lines
      color = mix(color, uSubGridColor, subAlpha);

      // Composite main grid lines
      color = mix(color, uGridColor, lineAlpha);

      // Calculate total line opacity for realistic blending
      float totalAlpha = max(lineAlpha, subAlpha);

      // Dynamic Holographic Radar Scan Pulse Ring
      if (uScanPulseAlpha > 0.01) {
        float distToScan = length(vWorldPos.xz - uScanCenter.xz);
        float ringDist = abs(distToScan - uScanRadius);
        float ringAlpha = (1.0 - smoothstep(0.0, 1.8, ringDist)) * uScanPulseAlpha * fadeFactor;
        color = mix(color, vec3(0.2, 0.9, 1.0), ringAlpha * 0.85);
        totalAlpha = max(totalAlpha, ringAlpha * 0.85);
      }

      // Active Tank Cell Ground Highlight (amber glow under tank)
      vec2 tankCellDiff = abs(gridCoord - uActiveCell);
      if (tankCellDiff.x < 0.48 && tankCellDiff.y < 0.48) {
        float borderDist = max(tankCellDiff.x, tankCellDiff.y);
        float cellBorderAlpha = smoothstep(0.40, 0.47, borderDist) * 0.6;
        color = mix(color, vec3(0.95, 0.75, 0.2), cellBorderAlpha);
        totalAlpha = max(totalAlpha, cellBorderAlpha);
      }

      fragColor = vec4(color, totalAlpha * 0.5); // Semi-transparent grid overlay
    }
  `;

  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms: {
      uGridColor: { value: gridColor },
      uSubGridColor: { value: subGridColor },
      uBackgroundColor: { value: backgroundColor },
      uCellSize: { value: cellSize },
      uLineWidth: { value: lineWidth },
      uFadeStart: { value: fadeStart },
      uFadeEnd: { value: fadeEnd },
      uActiveCell: { value: new THREE.Vector2(0, 0) },
      uTargetCell: { value: new THREE.Vector2(-1, -1) },
      uScanRadius: { value: 0.0 },
      uScanCenter: { value: new THREE.Vector3(0, 0, 0) },
      uScanPulseAlpha: { value: 0.0 },
      uTime: { value: 0.0 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
}
