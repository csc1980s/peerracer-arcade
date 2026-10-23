/**
 * Admiral's Gambit: Iron Fleet — Heuristic AI Admiral Engine
 *
 * Implements high-level naval tactics:
 * 1. Probability Heat-Mapping: Superposition of all remaining ship geometries.
 * 2. Parity Checkerboard Hunting: Optimal mathematical search preventing wasted shots.
 * 3. Line-of-Fire Kill Streak Targeting: Once a vessel is hit, walks the axis until sunk.
 * 4. Tactical Gambit Execution: Intelligently launches Air Recon or Radar Sweeps.
 */

import { GRID_SIZE, CELL_STATE, ORIENTATION } from './rules_config.js';

export class AIAdmiralEngine {
  constructor(aiGrid, playerGrid) {
    this.aiGrid = aiGrid;
    this.playerGrid = playerGrid;
    this.gridSize = GRID_SIZE;
  }

  /**
   * Decide the best tactical move for the AI turn
   */
  decideTurn(availableCP = 3) {
    // 1. Check if we should execute a Tactical Gambit
    const gambit = this._evaluateGambitOpportunity(availableCP);
    if (gambit) {
      return gambit;
    }

    // 2. Main Firing Solution (Targeting vs Hunting)
    const targetCoord = this._getBestFiringCoordinate();
    return {
      type: 'FIRE',
      row: targetCoord.row,
      col: targetCoord.col,
      cpCost: 1
    };
  }

  // ============================================================================
  // FIRING COORDINATE SELECTION (TARGETING VS HUNTING)
  // ============================================================================

  _getBestFiringCoordinate() {
    // Check for active unsunk hits (Targeting Mode)
    const activeHits = this._findActiveUnsunkHits();
    if (activeHits.length > 0) {
      const targetMove = this._solveTargetingMode(activeHits);
      if (targetMove) return targetMove;
    }

    // No active hits: execute Parity Probability Heat-Map (Hunting Mode)
    return this._solveHuntingMode();
  }

  _findActiveUnsunkHits() {
    const hits = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.playerGrid.cells[r][c];
        // HIT means a damaged segment of an unsunk ship
        if (cell.state === CELL_STATE.HIT) {
          hits.push({ row: r, col: c, shipId: cell.shipId });
        }
      }
    }
    return hits;
  }

  _solveTargetingMode(activeHits) {
    // Group hits by shipId if known, or consider cluster
    const cluster = activeHits;

    if (cluster.length === 1) {
      // Single hit: test 4 orthogonal neighbors
      const { row, col } = cluster[0];
      const neighbors = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 }
      ];

      // Shuffle neighbors for organic behavior
      neighbors.sort(() => Math.random() - 0.5);

      for (const n of neighbors) {
        if (this._isUntargeted(n.row, n.col)) {
          return n;
        }
      }
    } else {
      // 2 or more hits: determine axis (horizontal vs vertical)
      const sameRow = cluster.every(h => h.row === cluster[0].row);
      const sameCol = cluster.every(h => h.col === cluster[0].col);

      if (sameRow) {
        // Horizontal line: test left and right extremities
        const cols = cluster.map(h => h.col).sort((a, b) => a - b);
        const r = cluster[0].row;
        const leftCol = cols[0] - 1;
        const rightCol = cols[cols.length - 1] + 1;

        if (this._isUntargeted(r, leftCol)) return { row: r, col: leftCol };
        if (this._isUntargeted(r, rightCol)) return { row: r, col: rightCol };
      } else if (sameCol) {
        // Vertical line: test top and bottom extremities
        const rows = cluster.map(h => h.row).sort((a, b) => a - b);
        const c = cluster[0].col;
        const topRow = rows[0] - 1;
        const bottomRow = rows[rows.length - 1] + 1;

        if (this._isUntargeted(topRow, c)) return { row: topRow, col: c };
        if (this._isUntargeted(bottomRow, c)) return { row: bottomRow, col: c };
      }
    }

    return null;
  }

  _solveHuntingMode() {
    // 1. Build Probability Density Heat-Map
    const heatMap = this._generateProbabilityHeatMap();

    // 2. Identify smallest unsunk ship to apply parity
    const aliveShips = this.playerGrid.getAliveShips();
    const minShipSize = aliveShips.length > 0
      ? Math.min(...aliveShips.map(s => s.size))
      : 2;

    let bestScore = -1;
    let candidates = [];

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (!this._isUntargeted(r, c)) continue;

        let score = heatMap[r][c];

        // Parity bonus: cells matching checkerboard parity get bonus weight
        if ((r + c) % minShipSize === 0) {
          score *= 1.35;
        }

        if (score > bestScore) {
          bestScore = score;
          candidates = [{ row: r, col: c }];
        } else if (Math.abs(score - bestScore) < 0.001) {
          candidates.push({ row: r, col: c });
        }
      }
    }

    if (candidates.length > 0) {
      // Pick randomly among equal top-probability candidates
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Fallback: first available untargeted cell
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this._isUntargeted(r, c)) return { row: r, col: c };
      }
    }

    return { row: 0, col: 0 };
  }

  _generateProbabilityHeatMap() {
    const map = Array.from({ length: this.gridSize }, () => new Float32Array(this.gridSize));
    const aliveShips = this.playerGrid.getAliveShips();

    for (const ship of aliveShips) {
      const size = ship.size;

      // Test horizontal placements
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c <= this.gridSize - size; c++) {
          if (this._canShipFit(r, c, size, ORIENTATION.HORIZONTAL)) {
            for (let i = 0; i < size; i++) {
              map[r][c + i] += 1.0;
            }
          }
        }
      }

      // Test vertical placements
      for (let r = 0; r <= this.gridSize - size; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (this._canShipFit(r, c, size, ORIENTATION.VERTICAL)) {
            for (let i = 0; i < size; i++) {
              map[r + i][c] += 1.0;
            }
          }
        }
      }
    }

    return map;
  }

  _canShipFit(startRow, startCol, size, orientation) {
    const isHoriz = orientation === ORIENTATION.HORIZONTAL;
    for (let i = 0; i < size; i++) {
      const r = isHoriz ? startRow : startRow + i;
      const c = isHoriz ? startCol + i : startCol;

      const cell = this.playerGrid.cells[r][c];
      // A ship cannot fit if the cell was already confirmed as a MISS or a SUNK segment
      if (cell.state === CELL_STATE.MISS || cell.state === CELL_STATE.SUNK) {
        return false;
      }
    }
    return true;
  }

  _isUntargeted(row, col) {
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      return false;
    }
    const state = this.playerGrid.cells[row][col].state;
    // Untargeted means WATER or unrevealed intact SHIP
    return state === CELL_STATE.WATER || state === CELL_STATE.SHIP_INTACT;
  }

  // ============================================================================
  // GAMBIT EVALUATION
  // ============================================================================

  _evaluateGambitOpportunity(availableCP) {
    // Check if AI has surviving Carrier and enough CP for Air Recon
    if (availableCP >= 2 && this.aiGrid.isShipAlive('carrier')) {
      // Find a 3x3 sector with highest untargeted density
      const bestSector = this._findHighEntropySector();
      if (bestSector && Math.random() < 0.45) {
        return {
          type: 'GAMBIT_AIR_RECON',
          row: bestSector.row,
          col: bestSector.col,
          cpCost: 2
        };
      }
    }

    // Check if AI has surviving Cruiser for Radar Sweep
    if (availableCP >= 2 && this.aiGrid.isShipAlive('cruiser') && Math.random() < 0.35) {
      const rowOrCol = Math.random() < 0.5;
      const idx = Math.floor(Math.random() * this.gridSize);
      return {
        type: 'GAMBIT_RADAR_SWEEP',
        isRow: rowOrCol,
        index: idx,
        cpCost: 2
      };
    }

    return null;
  }

  _findHighEntropySector() {
    let bestCount = -1;
    let best = null;

    // Scan step 3x3 sectors centered at (1, 4, 7)
    for (const r of [2, 5, 8]) {
      for (const c of [2, 5, 8]) {
        let unrevealed = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (this._isUntargeted(r + dr, c + dc)) unrevealed++;
          }
        }
        if (unrevealed > bestCount && unrevealed >= 5) {
          bestCount = unrevealed;
          best = { row: r, col: c };
        }
      }
    }

    return best;
  }
}
