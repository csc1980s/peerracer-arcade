/**
 * Battlefield Environmental Presets & Theaters
 *
 * Defines 4 distinct atmospheric tactical theaters:
 * 1. Twilight Perimeter (Default): Cool twilight moonlight, deep slate fog, cyan radar grid.
 * 2. Desert Dunes: Warm sunset ochre, raking low golden sun with long shadows, amber terracotta grid.
 * 3. Arctic Frost: Sub-zero glacial ice-blue blizzard mist, cold stark illumination, ice cyan grid.
 * 4. Industrial Rainstorm: Thunderous overcast gloom, radar emerald grid, falling rain streaks, and distant lightning flashes.
 */

import * as THREE from 'three';

export const ENVIRONMENT_PRESETS = {
  daylight: {
    id: 'daylight',
    name: 'Daylight Combat',
    buttonLabel: '☀️ Daylight',
    clearColor: 0x87ceeb,        // Bright sky blue
    fogColor: 0xa8d8ea,          // Light blue haze
    fogDensity: 0.003,           // Less dense fog for visibility
    sun: {
      color: 0xfffaeb,           // Bright warm sunlight
      intensity: 3.2,            // Very bright sun
      position: [80, 120, 60]    // High noon position
    },
    hemi: {
      skyColor: 0x87ceeb,        // Bright sky blue
      groundColor: 0x5a7c3e,     // Sunlit grass green
      intensity: 1.2             // Bright ambient
    },
    grid: {
      gridColor: new THREE.Color(0x6b8e4e),      // Olive green grid (visible on grass)
      subGridColor: new THREE.Color(0x3d5236),   // Dark olive subgrid
      backgroundColor: new THREE.Color(0x4a6b3a) // Bright grass green
    },
    sky: {
      zenithColor: new THREE.Color(0x5ba3d0),    // Bright blue zenith
      horizonColor: new THREE.Color(0xb8d4e8),   // Light blue-white horizon
      sunColor: new THREE.Color(0xfffef2),       // Bright yellow sun
      sunSize: 0.028,                            // Large visible sun
      mountainHeight: 0.06,
      mountainColor: new THREE.Color(0x4a6854)   // Green-tinted mountains
    },
    hasRain: false
  },

  twilight: {
    id: 'twilight',
    name: 'Twilight Perimeter',
    buttonLabel: '🌐 Twilight',
    clearColor: 0x070c14,
    fogColor: 0x0c1622,
    fogDensity: 0.0075,
    sun: {
      color: 0xfff7ed,
      intensity: 1.4,
      position: [70, 95, 55]
    },
    hemi: {
      skyColor: 0x7ea0ba,
      groundColor: 0x1f2922,
      intensity: 0.55
    },
    grid: {
      gridColor: new THREE.Color(0x38bdf8),      // Cyan tactical grid
      subGridColor: new THREE.Color(0x13263b),   // Deep navy subgrid
      backgroundColor: new THREE.Color(0x090f17) // Slate ground
    },
    sky: {
      zenithColor: new THREE.Color(0x050c18),
      horizonColor: new THREE.Color(0x152338),
      sunColor: new THREE.Color(0xffeedd),
      sunSize: 0.015,
      mountainHeight: 0.08,
      mountainColor: new THREE.Color(0x09111c)
    },
    hasRain: false
  },

  desert: {
    id: 'desert',
    name: 'Desert Dunes',
    buttonLabel: '🏜️ Desert',
    clearColor: 0x1a0f08,
    fogColor: 0x2d1a0e,
    fogDensity: 0.0065,
    sun: {
      color: 0xffaa55,
      intensity: 2.2,
      position: [95, 42, 60] // Low raking angle for dramatic long shadows
    },
    hemi: {
      skyColor: 0xf59e0b,
      groundColor: 0x3e1f0e,
      intensity: 0.65
    },
    grid: {
      gridColor: new THREE.Color(0xf59e0b),      // Amber sand grid
      subGridColor: new THREE.Color(0x78350f),   // Dark brass / clay subgrid
      backgroundColor: new THREE.Color(0x1c1008) // Terracotta desert ground
    },
    sky: {
      zenithColor: new THREE.Color(0x1a0c06),
      horizonColor: new THREE.Color(0x7c3412),
      sunColor: new THREE.Color(0xffbb66),
      sunSize: 0.024,
      mountainHeight: 0.06,
      mountainColor: new THREE.Color(0x27140a)
    },
    hasRain: false
  },

  arctic: {
    id: 'arctic',
    name: 'Arctic Frost',
    buttonLabel: '❄️ Arctic',
    clearColor: 0x040b16,
    fogColor: 0x09192c,
    fogDensity: 0.009,
    sun: {
      color: 0xe0f2fe,
      intensity: 1.7,
      position: [50, 110, 40]
    },
    hemi: {
      skyColor: 0x38bdf8,
      groundColor: 0x0f172a,
      intensity: 0.6
    },
    grid: {
      gridColor: new THREE.Color(0x38bdf8),      // Frozen ice cyan
      subGridColor: new THREE.Color(0x0e7490),   // Deep glacial teal
      backgroundColor: new THREE.Color(0x08101c) // Dark frozen permafrost
    },
    sky: {
      zenithColor: new THREE.Color(0x020712),
      horizonColor: new THREE.Color(0x0f2b48),
      sunColor: new THREE.Color(0xdbeafe),
      sunSize: 0.016,
      mountainHeight: 0.10,
      mountainColor: new THREE.Color(0x06111f)
    },
    hasRain: false
  },

  storm: {
    id: 'storm',
    name: 'Industrial Rainstorm',
    buttonLabel: '⛈️ Storm',
    clearColor: 0x06090e,
    fogColor: 0x0e1520,
    fogDensity: 0.0095,
    sun: {
      color: 0x94a3b8,
      intensity: 0.95,
      position: [40, 85, 50] // Diffused overcast illumination
    },
    hemi: {
      skyColor: 0x475569,
      groundColor: 0x1e293b,
      intensity: 0.45
    },
    grid: {
      gridColor: new THREE.Color(0x10b981),      // Radar emerald grid
      subGridColor: new THREE.Color(0x064e3b),   // Dark military green
      backgroundColor: new THREE.Color(0x080e14) // Wet asphalt ground
    },
    sky: {
      zenithColor: new THREE.Color(0x04070a),
      horizonColor: new THREE.Color(0x131d28),
      sunColor: new THREE.Color(0xa0aec0),
      sunSize: 0.012,
      mountainHeight: 0.07,
      mountainColor: new THREE.Color(0x070c12)
    },
    hasRain: true
  }
};
