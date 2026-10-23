/**
 * Admiral's Gambit: Iron Fleet — Rules & Configuration Constants
 *
 * Clean-Room Specification for 10x10 Tactical Naval Strategy
 */

export const GRID_SIZE = 10;
export const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export const CELL_STATE = {
  WATER: 0,
  SHIP_INTACT: 1,
  MISS: 2,
  HIT: 3,
  SUNK: 4
};

export const SHIP_CLASSES = {
  CARRIER: {
    id: 'carrier',
    name: 'Aircraft Carrier',
    code: 'CV',
    size: 5,
    color: '#38bdf8',
    gambitId: 'AIR_RECON',
    gambitName: 'Air Reconnaissance',
    gambitDesc: 'Scouts a 3x3 oceanic grid sector. Detects whether any enemy vessel is present.',
    cpCost: 2
  },
  BATTLESHIP: {
    id: 'battleship',
    name: 'Heavy Battleship',
    code: 'BB',
    size: 4,
    color: '#f59e0b',
    gambitId: 'HEAVY_SALVO',
    gambitName: '16-Inch Twin Salvo',
    gambitDesc: 'Fires high-caliber armor-piercing shells striking primary coordinate and an adjacent cell.',
    cpCost: 3
  },
  CRUISER: {
    id: 'cruiser',
    name: 'Guided Missile Cruiser',
    code: 'CA',
    size: 3,
    color: '#10b981',
    gambitId: 'RADAR_SWEEP',
    gambitName: 'Surface Radar Sweep',
    gambitDesc: 'Active surface search radar sweeps an entire row or column. Reports hull count.',
    cpCost: 2
  },
  DESTROYER: {
    id: 'destroyer',
    name: 'Fast Destroyer',
    code: 'DD',
    size: 3,
    color: '#818cf8',
    gambitId: 'DEPTH_CHARGE',
    gambitName: 'Depth Charge Line',
    gambitDesc: 'Launches a line of 3 depth charges, damaging any surface ship or submerged submarine.',
    cpCost: 2
  },
  SUBMARINE: {
    id: 'submarine',
    name: 'Attack Submarine',
    code: 'SS',
    size: 2,
    color: '#ec4899',
    gambitId: 'ACOUSTIC_TORPEDO',
    gambitName: 'Acoustic Torpedo',
    gambitDesc: 'Fires a homing acoustic torpedo along a row or column that detonates on first hull hit.',
    cpCost: 2,
    isStealth: true
  }
};

export const COMMAND_POINTS = {
  STARTING_PER_TURN: 3,
  MAX_STORAGE: 6,
  BASE_FIRE_COST: 1,
  SMOKE_SCREEN_COST: 2,
  SMOKE_SCREEN_DURATION: 2
};

export const GAME_PHASE = {
  DEPLOYMENT: 'deployment',
  PLAYER_TURN: 'player_turn',
  AI_TURN: 'ai_turn',
  RESOLVING_SALVO: 'resolving_salvo',
  VICTORY: 'victory',
  DEFEAT: 'defeat'
};

export const ORIENTATION = {
  HORIZONTAL: 0,
  VERTICAL: 1
};

/**
 * SplitMix64 Deterministic PRNG for provably fair naval seed generation
 */
export function createPRNG(seedNumber) {
  let s = BigInt(Math.floor(seedNumber || Date.now()));
  if (s === 0n) s = 1n;

  return function nextFloat() {
    s = (s + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    let z = s;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    z = (z ^ (z >> 31n)) & 0xffffffffffffffffn;
    return Number(z & 0x1fffffffffffffn) / 0x20000000000000;
  };
}

export function generateSeedString() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let str = 'ADM-';
  for (let i = 0; i < 8; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

export function seedStringToNumber(seedStr) {
  let hash = 5381;
  const clean = String(seedStr || 'ADM-DEFAULT');
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function coordToString(row, col) {
  return `${COL_LABELS[col] || 'A'}${row + 1}`;
}

export function stringToCoord(coordStr) {
  if (!coordStr || typeof coordStr !== 'string') return null;
  const colChar = coordStr.charAt(0).toUpperCase();
  const col = COL_LABELS.indexOf(colChar);
  const row = parseInt(coordStr.slice(1), 10) - 1;
  if (col < 0 || col >= GRID_SIZE || isNaN(row) || row < 0 || row >= GRID_SIZE) {
    return null;
  }
  return { row, col };
}

