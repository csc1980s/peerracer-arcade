/**
 * Word Tiles: Sovereign Lexicon — Fair Computer Opponent AI
 * 
 * IP Provenance & Boundary:
 * - 100% original search algorithm.
 * - Does NOT use or copy decompiled Outspell / WordsSearcher / settings.json tables.
 * - Inspects ONLY the computer's own rack, the visible board, and the approved dictionary.
 * - Never inspects human rack or future bag draws.
 * - All moves are validated through authoritative BoardValidator.
 */

import { BoardValidator } from './validator.js';
import { BoardScorer } from './scorer.js';
import { Tile } from './bag.js';

export const AI_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

export class AIPlayer {
  constructor(options = {}) {
    this.difficulty = options.difficulty || AI_DIFFICULTY.MEDIUM;
    this.timeBudgetMs = options.timeBudgetMs || 1500; // 1.5 seconds max search budget
  }

  setDifficulty(diff) {
    if (Object.values(AI_DIFFICULTY).includes(diff)) {
      this.difficulty = diff;
    }
  }

  /**
   * Find and execute the best move according to difficulty tier
   * 
   * @param {WordBoard} board - Board state
   * @param {Array<Tile>} rack - Computer's rack
   * @param {WordDictionary} dictionary - Lexicon
   * @param {TileBag} bag - Bag (only to check count if exchange needed)
   * @param {{ isCancelled: boolean }} cancelToken - Cancellation hook
   * @returns {{ action: 'play'|'exchange'|'pass', placements?: Array, exchangeTileIds?: Array, score?: number, words?: Array }}
   */
  async findBestMove(board, rack, dictionary, bag, cancelToken = { isCancelled: false }) {
    const startTime = Date.now();
    const candidateMoves = [];

    // Identify candidate anchor cells
    const anchors = this._findAnchors(board);
    if (anchors.length === 0) {
      return { action: 'pass' };
    }

    const rackLetters = rack.map(t => t.letter);

    // Search across anchors
    for (const anchor of anchors) {
      if (cancelToken.isCancelled) return null;
      if (Date.now() - startTime > this.timeBudgetMs) break;

      // Try horizontal and vertical words
      for (const dir of ['horizontal', 'vertical']) {
        const moves = this._generateMovesAtAnchor(board, anchor, dir, rack, dictionary, startTime, cancelToken);
        for (const m of moves) {
          candidateMoves.push(m);
        }
      }
    }

    if (cancelToken.isCancelled) return null;

    if (candidateMoves.length === 0) {
      // If bag has at least 7 tiles, exchange up to 4 tiles
      if (bag.count() >= 7 && rack.length > 0) {
        const numToSwap = Math.min(3, rack.length);
        const swapIds = rack.slice(0, numToSwap).map(t => t.id);
        return { action: 'exchange', exchangeTileIds: swapIds };
      }
      return { action: 'pass' };
    }

    // Sort by total score descending
    candidateMoves.sort((a, b) => b.score - a.score);

    // Select candidate based on difficulty tier
    let chosen;
    if (this.difficulty === AI_DIFFICULTY.EASY) {
      // Pick a lower-scoring or short word move (bottom 40% of moves)
      const lowIndex = Math.min(candidateMoves.length - 1, Math.floor(candidateMoves.length * 0.65));
      chosen = candidateMoves[lowIndex] || candidateMoves[0];
    } else if (this.difficulty === AI_DIFFICULTY.MEDIUM) {
      // Pick a balanced mid-tier move (40th to 60th percentile)
      const midIndex = Math.floor(candidateMoves.length * 0.35);
      chosen = candidateMoves[midIndex] || candidateMoves[0];
    } else {
      // HARD: Pick the best scoring legal move found
      chosen = candidateMoves[0];
    }

    return {
      action: 'play',
      placements: chosen.placements,
      score: chosen.score,
      words: chosen.words
    };
  }

  _findAnchors(board) {
    const anchors = [];
    if (!board.hasCommittedTiles()) {
      anchors.push({ row: board.center.row, col: board.center.col });
      return anchors;
    }

    const visited = new Set();
    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        const cell = board.getCell(r, c);
        if (cell && !cell.isOccupied()) {
          // Check orthogonal neighbors
          const neighbors = [
            [r - 1, c], [r + 1, c],
            [r, c - 1], [r, c + 1]
          ];
          for (const [nr, nc] of neighbors) {
            const nCell = board.getCell(nr, nc);
            if (nCell && nCell.isOccupied() && nCell.committed) {
              const key = `${r},${c}`;
              if (!visited.has(key)) {
                visited.add(key);
                anchors.push({ row: r, col: c });
              }
              break;
            }
          }
        }
      }
    }
    return anchors;
  }

  _generateMovesAtAnchor(board, anchor, direction, rack, dictionary, startTime, cancelToken) {
    const validMoves = [];
    const isHoriz = direction === 'horizontal';

    // Try various word lengths from 2 up to 8
    const maxWordLen = Math.min(8, rack.length + 3);

    for (let len = 2; len <= maxWordLen; len++) {
      if (cancelToken.isCancelled || Date.now() - startTime > this.timeBudgetMs) break;

      // Try different offsets where anchor is at position offset within the word
      for (let offset = 0; offset < len; offset++) {
        const startRow = isHoriz ? anchor.row : anchor.row - offset;
        const startCol = isHoriz ? anchor.col - offset : anchor.col;

        if (startRow < 0 || startCol < 0) continue;
        const endRow = isHoriz ? startRow : startRow + len - 1;
        const endCol = isHoriz ? startCol + len - 1 : startCol;
        if (endRow >= board.size || endCol >= board.size) continue;

        // Collect existing letters along the line
        const fixedTiles = [];
        let neededTilesCount = 0;
        let canFit = true;

        for (let i = 0; i < len; i++) {
          const r = isHoriz ? startRow : startRow + i;
          const c = isHoriz ? startCol + i : startCol;
          const cell = board.getCell(r, c);
          if (cell && cell.isOccupied() && cell.committed) {
            fixedTiles.push({ index: i, letter: cell.tile.getEffectiveLetter() });
          } else {
            neededTilesCount++;
          }
        }

        if (neededTilesCount === 0 || neededTilesCount > rack.length) {
          continue; // Cannot place if no new tiles or not enough rack tiles
        }

        // Search words in dictionary Trie matching the pattern
        const matches = this._searchPatternInTrie(dictionary.root, len, fixedTiles);
        for (const wordStr of matches) {
          if (cancelToken.isCancelled || Date.now() - startTime > this.timeBudgetMs) break;

          // Check if rack can supply the missing letters
          const placementAttempt = this._buildPlacementFromRack(wordStr, startRow, startCol, isHoriz, fixedTiles, rack);
          if (!placementAttempt) continue;

          // Authoritative Validation
          const validation = BoardValidator.validateMove(board, placementAttempt, dictionary);
          if (validation.valid) {
            const scoreObj = BoardScorer.calculateScore(board, validation.words, placementAttempt);
            validMoves.push({
              placements: placementAttempt,
              score: scoreObj.totalScore,
              words: validation.words
            });
            if (validMoves.length >= 10) return validMoves; // Enough candidates for this anchor
          }
        }
      }
    }

    return validMoves;
  }

  _searchPatternInTrie(rootNode, targetLen, fixedTiles) {
    const fixedMap = new Map(fixedTiles.map(f => [f.index, f.letter]));
    const results = [];

    const dfs = (node, depth, currentWord) => {
      if (results.length >= 8) return; // Cap branch results
      if (depth === targetLen) {
        if (node.isWord) {
          results.push(currentWord);
        }
        return;
      }

      if (fixedMap.has(depth)) {
        const requiredChar = fixedMap.get(depth);
        if (node.children.has(requiredChar)) {
          dfs(node.children.get(requiredChar), depth + 1, currentWord + requiredChar);
        }
      } else {
        for (const [char, childNode] of node.children.entries()) {
          dfs(childNode, depth + 1, currentWord + char);
          if (results.length >= 8) break;
        }
      }
    };

    dfs(rootNode, 0, '');
    return results;
  }

  _buildPlacementFromRack(wordStr, startRow, startCol, isHoriz, fixedTiles, rack) {
    const fixedIndices = new Set(fixedTiles.map(f => f.index));
    const availableRack = [...rack];
    const placements = [];

    for (let i = 0; i < wordStr.length; i++) {
      if (fixedIndices.has(i)) continue;

      const targetLetter = wordStr[i];
      const r = isHoriz ? startRow : startRow + i;
      const c = isHoriz ? startCol + i : startCol;

      // Find direct matching tile
      let rackIdx = availableRack.findIndex(t => !t.isBlank && t.letter === targetLetter);
      if (rackIdx !== -1) {
        const tile = availableRack.splice(rackIdx, 1)[0].clone();
        placements.push({ row: r, col: c, tile });
        continue;
      }

      // Try using a blank tile
      rackIdx = availableRack.findIndex(t => t.isBlank);
      if (rackIdx !== -1) {
        const blankTile = availableRack.splice(rackIdx, 1)[0].clone();
        blankTile.designatedLetter = targetLetter;
        placements.push({ row: r, col: c, tile: blankTile });
        continue;
      }

      // Cannot satisfy letter from rack
      return null;
    }

    return placements;
  }
}
