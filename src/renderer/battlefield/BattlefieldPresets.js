/**
 * Battlefield theater presets: one entry per environment id used by the game
 * (EnvironmentPresets.js keeps the ids, names and button labels).
 *
 * Each preset drives four systems from one place:
 *   sky      -> SkySystem (analytic atmosphere + ray-marched clouds, IBL, sun, fog)
 *   terrain  -> BattlefieldTerrainPBR splat palette (grass / dirt / rock / snow / wetness)
 *   weather  -> rain / snow / blowing sand, lightning
 *   grade    -> final colour grade + vignette (LensPass)
 *
 * Units: 1 world unit = 1 metre, a grid cell is 10 m. Fog densities are per metre.
 */

const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

export const BATTLEFIELD_PRESETS = {
  daylight: {
    sky: {
      sunElevation: 46, sunAzimuth: 30,
      sunColor: [1.0, 0.96, 0.9], sunIntensity: 3.4, sunDisk: 40,
      zenith: [0.1, 0.27, 0.62], horizon: [0.62, 0.74, 0.86], sunsetTint: [0.9, 0.86, 0.8],
      cloudCoverage: 0.4, cloudDensity: 0.045, cloudBottom: 1300, cloudTop: 3000,
      cloudLight: [1.45, 1.4, 1.35], cloudAmbient: [0.36, 0.46, 0.6],
      fogColor: [0.6, 0.69, 0.79], fogDensity: 0.0012,
      exposure: 0.62, envIntensity: 1.0, sunSpecular: 0.8,
    },
    ambient: [0.36, 0.42, 0.5],
    hemi: { sky: 0x9cc4e8, ground: 0x4a5a32, intensity: 0.15 },
    headlight: 0,
    terrain: {
      grassA: rgb(0x3f5a26), grassB: rgb(0x6b7a34), dirt: rgb(0x6e5638), rock: rgb(0x7a7468),
      scorch: rgb(0x14110e), track: rgb(0x5a4632), snow: 0, wet: 0, sand: 0,
      grid: rgb(0xe8f0c8), gridStrength: 0.26, gridGlow: 0.0,
    },
    weather: null, lightning: false,
    grade: { lift: [0.0, 0.0, 0.01], gain: [1.02, 1.0, 0.97], saturation: 1.06, vignette: 0.28 },
  },

  twilight: {
    sky: {
      sunElevation: 1.2, sunAzimuth: 200,
      sunColor: [1.0, 0.5, 0.34], sunIntensity: 1.3, sunDisk: 6,
      zenith: [0.012, 0.025, 0.07], horizon: [0.3, 0.2, 0.26], sunsetTint: [0.9, 0.36, 0.2],
      cloudCoverage: 0.5, cloudDensity: 0.04, cloudBottom: 1500, cloudTop: 3300,
      cloudLight: [1.2, 0.55, 0.42], cloudAmbient: [0.05, 0.06, 0.12],
      fogColor: [0.11, 0.1, 0.15], fogDensity: 0.0026,
      exposure: 1.35, envIntensity: 1.0, sunSpecular: 0.6,
    },
    ambient: [0.08, 0.1, 0.18],
    hemi: { sky: 0x3a5078, ground: 0x141a16, intensity: 0.45 },
    headlight: 160,
    terrain: {
      grassA: rgb(0x26361c), grassB: rgb(0x3a4424), dirt: rgb(0x4e3e2c), rock: rgb(0x5a5650),
      scorch: rgb(0x0e0c0a), track: rgb(0x3e3226), snow: 0, wet: 0.15, sand: 0,
      grid: rgb(0x38bdf8), gridStrength: 0.12, gridGlow: 0.55,
    },
    weather: null, lightning: false,
    grade: { lift: [0.005, 0.008, 0.03], gain: [1.0, 0.98, 1.05], saturation: 0.96, vignette: 0.4 },
  },

  desert: {
    sky: {
      sunElevation: 9, sunAzimuth: 158,
      sunColor: [1.0, 0.68, 0.38], sunIntensity: 3.0, sunDisk: 50,
      zenith: [0.12, 0.2, 0.4], horizon: [0.86, 0.6, 0.38], sunsetTint: [1.25, 0.6, 0.26],
      cloudCoverage: 0.26, cloudDensity: 0.03, cloudBottom: 1800, cloudTop: 3200,
      cloudLight: [1.6, 0.95, 0.55], cloudAmbient: [0.3, 0.24, 0.24],
      fogColor: [0.66, 0.47, 0.32], fogDensity: 0.0013,
      exposure: 0.56, envIntensity: 0.9, sunSpecular: 0.9,
    },
    ambient: [0.42, 0.33, 0.26],
    hemi: { sky: 0xd8a878, ground: 0x8a6438, intensity: 0.12 },
    headlight: 0,
    terrain: {
      grassA: rgb(0xb98d5c), grassB: rgb(0xd2a56e), dirt: rgb(0x9a6d44), rock: rgb(0x8c5f3e),
      scorch: rgb(0x1c140e), track: rgb(0x8e6a46), snow: 0, wet: 0, sand: 1,
      grid: rgb(0xfff0d0), gridStrength: 0.3, gridGlow: 0.0,
    },
    weather: 'dust', lightning: false,
    grade: { lift: [0.01, 0.005, 0.0], gain: [1.04, 1.0, 0.94], saturation: 1.08, vignette: 0.32 },
  },

  arctic: {
    sky: {
      sunElevation: 13, sunAzimuth: 120,
      sunColor: [0.92, 0.94, 1.0], sunIntensity: 1.9, sunDisk: 22,
      zenith: [0.2, 0.3, 0.46], horizon: [0.72, 0.78, 0.86], sunsetTint: [0.9, 0.86, 0.9],
      cloudCoverage: 0.72, cloudDensity: 0.07, cloudBottom: 900, cloudTop: 3200,
      cloudLight: [1.15, 1.18, 1.25], cloudAmbient: [0.45, 0.5, 0.6],
      fogColor: [0.72, 0.77, 0.84], fogDensity: 0.0034,
      exposure: 0.62, envIntensity: 1.0, sunSpecular: 0.7,
    },
    ambient: [0.55, 0.6, 0.7],
    hemi: { sky: 0xcad8ea, ground: 0x8a96a6, intensity: 0.2 },
    headlight: 0,
    terrain: {
      grassA: rgb(0x46523a), grassB: rgb(0x5a5a46), dirt: rgb(0x4c4034), rock: rgb(0x5e646c),
      scorch: rgb(0x121212), track: rgb(0x5c564e), snow: 1, wet: 0.1, sand: 0,
      grid: rgb(0x3a6a9a), gridStrength: 0.2, gridGlow: 0.0,
    },
    weather: 'snow', lightning: false,
    grade: { lift: [0.0, 0.005, 0.015], gain: [0.97, 1.0, 1.05], saturation: 0.9, vignette: 0.3 },
  },

  storm: {
    sky: {
      sunElevation: 24, sunAzimuth: 210,
      sunColor: [0.72, 0.77, 0.86], sunIntensity: 1.1, sunDisk: 0,
      zenith: [0.1, 0.11, 0.13], horizon: [0.3, 0.32, 0.35], sunsetTint: [0.4, 0.42, 0.45],
      cloudCoverage: 0.9, cloudDensity: 0.1, cloudBottom: 600, cloudTop: 3800,
      cloudLight: [0.8, 0.82, 0.88], cloudAmbient: [0.15, 0.17, 0.2],
      fogColor: [0.24, 0.26, 0.28], fogDensity: 0.0048,
      exposure: 1.55, envIntensity: 1.2, sunSpecular: 0.15,
    },
    ambient: [0.2, 0.22, 0.26],
    hemi: { sky: 0x5a6470, ground: 0x1c1e1a, intensity: 0.3 },
    headlight: 110,
    terrain: {
      grassA: rgb(0x3c4a2c), grassB: rgb(0x525636), dirt: rgb(0x55442f), rock: rgb(0x5a5a5e),
      scorch: rgb(0x0c0a08), track: rgb(0x43372a), snow: 0, wet: 1, sand: 0,
      grid: rgb(0x34d399), gridStrength: 0.1, gridGlow: 0.18,
    },
    weather: 'rain', lightning: true,
    grade: { lift: [0.0, 0.006, 0.012], gain: [0.96, 1.0, 1.03], saturation: 0.82, vignette: 0.42 },
  },
};

export function getBattlefieldPreset(id) {
  return BATTLEFIELD_PRESETS[id] || BATTLEFIELD_PRESETS.daylight;
}
