/**
 * Word Tiles: Sovereign Lexicon — Explicit Versioned Rules Configuration
 * 
 * Version: 1.0.0
 * Architecture: Clean-Room Original Implementation
 * 
 * Rule Definitions:
 * - Board: 15x15 grid with Center Star at [7, 7]
 * - Rack: 7 tiles
 * - Total Bag: 100 tiles (standard English distribution)
 * - Multiplier behavior: Multipliers activate ONLY when a newly placed tile covers them.
 *   Occupied squares NEVER re-score multipliers on subsequent turns.
 * - Blank tiles: Score 0 letter points; retain designated letter for word formation.
 * - Full-Rack Bonus ("Bingo"): +50 points when all 7 rack tiles are committed in a single turn.
 * - Exchange requirement: Common tile bag must contain at least 7 tiles.
 * - Pass limit: 4 consecutive passes (2 rounds of passes) triggers game end.
 */

export const RULES_CONFIG_V1 = {
  version: '1.0.0',
  name: 'Word Tiles: Sovereign Lexicon',
  boardSize: 15,
  centerCoord: { row: 7, col: 7 },
  rackCapacity: 7,
  fullRackBonus: 50,
  exchangeMinimumBag: 7,
  consecutivePassEndCount: 4,

  // Symmetrical 15x15 Premium Multiplier Scheme
  // 3W = Triple Word, 2W = Double Word, 3L = Triple Letter, 2L = Double Letter
  premiumScheme: {
    // 8 Triple Word cells (Corners and mid-edges)
    '3W': [
      [0, 0], [0, 7], [0, 14],
      [7, 0],         [7, 14],
      [14, 0], [14, 7], [14, 14]
    ],
    // 17 Double Word cells (Diagonals and Center Star [7,7])
    '2W': [
      [1, 1], [2, 2], [3, 3], [4, 4],
      [1, 13], [2, 12], [3, 11], [4, 10],
      [10, 4], [11, 3], [12, 2], [13, 1],
      [10, 10], [11, 11], [12, 12], [13, 13],
      [7, 7] // Center Star also carries 2W bonus on opening turn
    ],
    // 12 Triple Letter cells
    '3L': [
      [1, 5], [1, 9],
      [5, 1], [5, 5], [5, 9], [5, 13],
      [9, 1], [9, 5], [9, 9], [9, 13],
      [13, 5], [13, 9]
    ],
    // 24 Double Letter cells
    '2L': [
      [0, 3], [0, 11],
      [2, 6], [2, 8],
      [3, 0], [3, 7], [3, 14],
      [6, 2], [6, 6], [6, 8], [6, 12],
      [7, 3], [7, 11],
      [8, 2], [8, 6], [8, 8], [8, 12],
      [11, 0], [11, 7], [11, 14],
      [12, 6], [12, 8],
      [14, 3], [14, 11]
    ]
  },

  // 100-Tile English Distribution (Letter: Count)
  tileDistribution: {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2, 'I': 9,
    'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2, 'Q': 1, 'R': 6,
    'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1, 'Y': 2, 'Z': 1, '_': 2
  },

  // Letter Point Values
  tileScores: {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
    'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
    'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10, '_': 0
  }
};
