/**
 * Tank Minefield: Iron Perimeter — Rules Configuration
 * 
 * Centralized, isolated parameters for Single-Player and PvP modes.
 */

export const CARDINAL_DIRECTIONS = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3
};

export const DIRECTION_VECTORS = {
  [CARDINAL_DIRECTIONS.NORTH]: { dRow: -1, dCol: 0, name: 'North', short: 'N' },
  [CARDINAL_DIRECTIONS.EAST]:  { dRow: 0,  dCol: 1,  name: 'East',  short: 'E' },
  [CARDINAL_DIRECTIONS.SOUTH]: { dRow: 1,  dCol: 0,  name: 'South', short: 'S' },
  [CARDINAL_DIRECTIONS.WEST]:  { dRow: 0,  dCol: -1, name: 'West',  short: 'W' }
};

export const TANK_PRESETS = {
  US: {
    id: 'US',
    name: 'US Armed Forces',
    designation: 'M48-A2 Patton Spearhead',
    country: 'United States',
    primaryColor: '#3d5236', // Olive drab green
    accentColor: '#ffffff',
    emblemType: 'white_star',
    insignia: '★ White Star',
    description: 'Rugged olive drab finish with bold white allied star insignia.'
  },
  UN: {
    id: 'UN',
    name: 'UN Peacekeeper',
    designation: 'Centurion MK-5 Vanguard',
    country: 'United Nations',
    primaryColor: '#36533f', // Peacekeeper forest green
    accentColor: '#38bdf8', // Cyan blue
    emblemType: 'un_roundel',
    insignia: '🌐 Cyan Roundel',
    description: 'Deep military green with peacekeeper cyan roundel identification.'
  },
  USSR: {
    id: 'USSR',
    name: 'Soviet Guards',
    designation: 'T-55A Iron Bastion',
    country: 'USSR',
    primaryColor: '#2b442b', // Deep Russian armor green
    accentColor: '#ef4444', // Red star
    emblemType: 'red_star',
    insignia: '★ Crimson Star',
    description: 'Heavy armor plate in dark forest green with guards red star.'
  },
  NORTH_KOREA: {
    id: 'NORTH_KOREA',
    name: 'DPRK Armored Corps',
    designation: 'Chonma-Ho Type 68',
    country: 'North Korea',
    primaryColor: '#314833', // Camo green
    accentColor: '#3b82f6', // Red-white-blue roundel
    emblemType: 'dprk_roundel',
    insignia: '🎖️ Tri-Color Roundel',
    description: 'Aggressive military green featuring red-white-blue tri-band roundel.'
  }
};

export const CELL_STATE = {
  UNEXPLORED: 'unexplored',
  REVEALED: 'revealed',
  FLAGGED: 'flagged'
};

export const CRATER_TYPE = {
  NONE: 'none',
  MINE_DETONATION: 'mine',
  SHELL_IMPACT: 'shell'
};

export const TANK_RULES_V1 = {
  // Single Player
  singlePlayer: {
    rows: 12,
    cols: 12,
    mineDensity: 0.16, // ~16% mines
    startingArmor: 3,
    startPos: { row: 11, col: 0 },
    startSafeRadius: 1, // 3x3 safe zone around spawn
    extractionPos: { row: 0, col: 11 }
  },

  // PvP Mode
  pvp: {
    rows: 24,
    cols: 24,
    mineDensity: 0.14,
    startingArmor: 3,
    startingShells: 1, // Strict One-Shot rule per round
    roundDurationSec: 180, // 3 minutes
    visibilityDistance: 8, // Cells in 3D first-person view
    spawnP1: { row: 22, col: 1, facing: CARDINAL_DIRECTIONS.NORTH },
    spawnP2: { row: 1, col: 22, facing: CARDINAL_DIRECTIONS.SOUTH },
    spawnSafeRadius: 2
  },

  // Damage
  damage: {
    mineDetonationArmorLoss: 1,
    directShellHitArmorLoss: 999 // Instant kill / round win
  },

  // Firing Range (Strict Rule)
  firing: {
    minHitRange: 1,
    maxHitRange: 2,
    shellVelocityCellsPerSec: 6
  }
};
