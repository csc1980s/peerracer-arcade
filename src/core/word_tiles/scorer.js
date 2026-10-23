/**
 * Word Tiles: Sovereign Lexicon — Authoritative Scorer
 * 
 * Rules:
 * - Premium squares apply ONLY to newly placed tiles.
 * - Occupied squares from previous turns NEVER reactivate letter or word multipliers.
 * - Blanks score 0 letter points.
 * - +50 point bonus awarded when all 7 rack tiles are committed in a single turn.
 */

import { RULES_CONFIG_V1 } from './rules_config.js';

export class BoardScorer {
  /**
   * Calculate exact score breakdown for validated move
   * 
   * @param {WordBoard} board - Board state
   * @param {Array} words - Array of extracted words from BoardValidator
   * @param {Array<{ row, col, tile }>} placements - Newly placed tiles
   * @returns {{ totalScore: number, breakdown: Array, bingo: boolean }}
   */
  static calculateScore(board, words, placements) {
    const newPlacementCoords = new Set(placements.map(p => `${p.row},${p.col}`));
    const breakdown = [];
    let moveTotal = 0;

    for (let i = 0; i < words.length; i++) {
      const wordObj = words[i];
      let wordBaseLetterSum = 0;
      let wordMultiplier = 1;

      for (const cellInfo of wordObj.cells) {
        const { row, col, tile } = cellInfo;
        const isNewlyPlaced = newPlacementCoords.has(`${row},${col}`);
        const boardCell = board.getCell(row, col);
        const premium = boardCell ? boardCell.premium : null;

        // Base letter score (0 if blank)
        let letterScore = tile.isBlank ? 0 : tile.score;

        if (isNewlyPlaced && premium) {
          // Apply letter multipliers
          if (premium === '2L') {
            letterScore *= 2;
          } else if (premium === '3L') {
            letterScore *= 3;
          }

          // Accumulate word multipliers
          if (premium === '2W') {
            wordMultiplier *= 2;
          } else if (premium === '3W') {
            wordMultiplier *= 3;
          }
        }

        wordBaseLetterSum += letterScore;
      }

      const wordFinalScore = wordBaseLetterSum * wordMultiplier;
      moveTotal += wordFinalScore;

      breakdown.push({
        word: wordObj.text,
        baseScore: wordBaseLetterSum,
        multiplier: wordMultiplier,
        finalScore: wordFinalScore,
        isCross: i > 0
      });
    }

    // Full-Rack Bonus ("Bingo")
    const isBingo = (placements.length === RULES_CONFIG_V1.rackCapacity);
    if (isBingo) {
      moveTotal += RULES_CONFIG_V1.fullRackBonus;
    }

    return {
      totalScore: moveTotal,
      breakdown,
      bingo: isBingo,
      bingoBonus: isBingo ? RULES_CONFIG_V1.fullRackBonus : 0
    };
  }
}
