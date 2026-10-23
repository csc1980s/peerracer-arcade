/**
 * Admiral's Gambit: Iron Fleet - Naval Warfare Rules & Configuration
 *
 * Ship classes, weapon systems, and combat mechanics
 */

export const GRID_SIZE = 10; // 10×10 naval combat grid (like classic Battleship)
export const CELL_SIZE_METERS = 500; // Each cell = 500 meters

// Ship Classes & Specifications
export const SHIP_CLASSES = {
  CARRIER: {
    id: 'CARRIER',
    name: 'CVN-77 Carrier',
    displayName: 'Aircraft Carrier',
    length: 5, // Grid cells
    maxHP: 5,
    firepower: 0, // Carriers don't have direct weapons
    speed: 2, // Cells per turn
    special: 'Air Support',
    weapons: [],
    color: '#3b82f6', // Blue
    symbol: '⚓',
    description: 'All Systems Operational'
  },

  BATTLESHIP: {
    id: 'BATTLESHIP',
    name: 'BB-64 Battleship',
    displayName: 'Battleship',
    length: 4,
    maxHP: 4,
    firepower: 3,
    speed: 1,
    special: 'Heavy Armor',
    weapons: ['16_INCH_GUNS'],
    color: '#6b7280', // Gray
    symbol: '⚔️',
    description: 'Main Battery Ready'
  },

  CRUISER: {
    id: 'CRUISER',
    name: 'CG-63 Cruiser',
    displayName: 'Guided Missile Cruiser',
    length: 3,
    maxHP: 3,
    firepower: 2,
    speed: 2,
    special: 'Radar Lock',
    weapons: ['6_INCH_GUNS', 'MISSILES'],
    color: '#8b5cf6', // Purple
    symbol: '🎯',
    description: 'All Systems Online'
  },

  SUBMARINE: {
    id: 'SUBMARINE',
    name: 'SSN Submarine',
    displayName: 'Nuclear Submarine',
    length: 3,
    maxHP: 3,
    firepower: 3,
    speed: 1,
    special: 'Stealth',
    weapons: ['TORPEDOES'],
    color: '#06b6d4', // Cyan
    symbol: '🌊',
    description: 'Submerged'
  },

  DESTROYER: {
    id: 'DESTROYER',
    name: 'DDG-100 Destroyer',
    displayName: 'Guided Missile Destroyer',
    length: 2,
    maxHP: 2,
    firepower: 1,
    speed: 3,
    special: 'Fast Attack',
    weapons: ['5_INCH_GUNS'],
    color: '#22c55e', // Green
    symbol: '⚡',
    description: 'All Systems Green'
  }
};

// Weapon Systems
export const WEAPONS = {
  '16_INCH_GUNS': {
    id: '16_INCH_GUNS',
    name: '16" Main Battery',
    range: 8,
    damage: 2,
    accuracy: 0.7,
    ammoType: 'AP_SHELLS',
    rateOfFire: 1 // Shots per turn
  },

  '6_INCH_GUNS': {
    id: '6_INCH_GUNS',
    name: '6" Dual Purpose Guns',
    range: 6,
    damage: 1,
    accuracy: 0.8,
    ammoType: 'HE_SHELLS',
    rateOfFire: 1
  },

  '5_INCH_GUNS': {
    id: '5_INCH_GUNS',
    name: '5" Rapid Fire Guns',
    range: 5,
    damage: 1,
    accuracy: 0.85,
    ammoType: 'HE_SHELLS',
    rateOfFire: 2
  },

  MISSILES: {
    id: 'MISSILES',
    name: 'Cruise Missiles',
    range: 10,
    damage: 2,
    accuracy: 0.9,
    ammoType: 'GUIDED',
    rateOfFire: 1,
    ammoLimit: 4
  },

  TORPEDOES: {
    id: 'TORPEDOES',
    name: 'Mk 48 Torpedoes',
    range: 6,
    damage: 3,
    accuracy: 0.75,
    ammoType: 'TORPEDOES',
    rateOfFire: 1,
    ammoLimit: 6
  }
};

// Grid Cell States
export const CELL_STATE = {
  UNKNOWN: 'unknown',       // Fog of war
  WATER: 'water',           // Empty ocean
  MISS: 'miss',             // Shot fired, no hit
  HIT: 'hit',               // Enemy ship damaged
  SUNK: 'sunk',             // Enemy ship destroyed
  FRIENDLY: 'friendly'      // Your fleet
};

// Game Phases
export const GAME_PHASE = {
  DEPLOYMENT: 'deployment',   // Place your fleet
  COMBAT: 'combat',           // Active battle
  VICTORY: 'victory',         // You won
  DEFEAT: 'defeat'            // You lost
};

// Player Turn Actions
export const ACTION_TYPE = {
  FIRE_GUNS: 'fire_guns',
  FIRE_TORPEDO: 'fire_torpedo',
  LAUNCH_MISSILE: 'launch_missile',
  RADAR_SCAN: 'radar_scan',
  MOVE_SHIP: 'move_ship',
  DAMAGE_CONTROL: 'damage_control'
};

// Hit Result Types
export const HIT_RESULT = {
  MISS: 'miss',
  HIT: 'hit',
  CRITICAL_HIT: 'critical_hit',
  SUNK: 'sunk'
};

// Difficulty Levels
export const DIFFICULTY = {
  ENSIGN: {
    id: 'ensign',
    name: 'Ensign (Easy)',
    aiAccuracy: 0.3,
    enemyFleetSize: 3
  },
  LIEUTENANT: {
    id: 'lieutenant',
    name: 'Lieutenant (Normal)',
    aiAccuracy: 0.5,
    enemyFleetSize: 4
  },
  ADMIRAL: {
    id: 'admiral',
    name: 'Admiral (Hard)',
    aiAccuracy: 0.7,
    enemyFleetSize: 5
  }
};

// Standard Fleet Configurations
export const FLEET_PRESETS = {
  CLASSIC: {
    id: 'classic',
    name: 'Classic Fleet',
    ships: ['CARRIER', 'BATTLESHIP', 'CRUISER', 'SUBMARINE', 'DESTROYER']
  },
  MODERN: {
    id: 'modern',
    name: 'Modern Fleet',
    ships: ['CARRIER', 'CRUISER', 'CRUISER', 'DESTROYER', 'DESTROYER']
  },
  SUBMARINE_WOLF_PACK: {
    id: 'wolf_pack',
    name: 'Submarine Wolf Pack',
    ships: ['SUBMARINE', 'SUBMARINE', 'SUBMARINE', 'DESTROYER', 'DESTROYER']
  }
};

// Combat Event Messages
export const COMBAT_MESSAGES = {
  MISS: [
    'Shot splashes harmlessly into the ocean!',
    'Rounds fall short of target!',
    'Salvo misses wide!',
    'No contact, sir!'
  ],
  HIT: [
    'Direct hit on enemy vessel!',
    'Target struck amidships!',
    'Enemy taking damage!',
    'We\'re hitting them, Admiral!'
  ],
  CRITICAL_HIT: [
    'CRITICAL HIT! Enemy vessel heavily damaged!',
    'Magazine explosion detected!',
    'Catastrophic damage to enemy ship!',
    'Direct hit on enemy bridge!'
  ],
  SUNK: [
    'Enemy vessel destroyed!',
    'Target eliminated, sir!',
    'Enemy ship sinking!',
    'Confirmed kill!'
  ],
  PLAYER_HIT: [
    'We\'ve been hit!',
    'Damage report incoming!',
    'Enemy fire striking us!',
    'Taking damage!'
  ]
};

// Orientation (for ship placement)
export const ORIENTATION = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical'
};

// Grid Coordinate Utilities
export function coordToString(row, col) {
  const letters = 'ABCDEFGHIJ';
  return `${letters[row]}${col + 1}`;
}

export function stringToCoord(str) {
  const letters = 'ABCDEFGHIJ';
  const row = letters.indexOf(str[0]);
  const col = parseInt(str.slice(1)) - 1;
  return { row, col };
}

export function isInBounds(row, col, gridSize = GRID_SIZE) {
  return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
}

export function calculateDistance(row1, col1, row2, col2) {
  return Math.sqrt(Math.pow(row2 - row1, 2) + Math.pow(col2 - col1, 2));
}

export function isWithinRange(row1, col1, row2, col2, range) {
  return calculateDistance(row1, col1, row2, col2) <= range;
}
