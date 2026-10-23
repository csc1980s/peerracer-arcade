/**
 * Tank Minefield: Iron Perimeter — Grid Engine & Minesweeper Logic
 * 
 * Invariants:
 * - Deterministic seeded map generation.
 * - Guaranteed reachability from spawn to extraction.
 * - Authoritative 8-neighbor adjacent mine counts.
 * - Connected zero-mine region flood-reveal.
 * - Persistent crater tracking (mine detonations and shell impacts).
 * - Scanned mines revealed safely without detonation.
 * - Consumed mines never explode twice.
 */

import { CELL_STATE, CRATER_TYPE, TANK_RULES_V1 } from './rules_config.js';
import { SplitMix64 } from '../prng.js';

export class MineGridCell {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.hasMine = false;
    this.isMineConsumed = false; // Detonated or destroyed by shell
    this.state = CELL_STATE.UNEXPLORED;
    this.adjacentMines = 0;
    this.crater = CRATER_TYPE.NONE;
    this.isObstacle = false; // Solid rock/wall blocking movement and shells
    this.isScannedMine = false; // Known detected mine without detonation
    this.isExtraction = false;
    this.isSpawn = false;
  }

  isTraversable() {
    return !this.isObstacle;
  }

  isRevealed() {
    return this.state === CELL_STATE.REVEALED;
  }

  isFlagged() {
    return this.state === CELL_STATE.FLAGGED;
  }

  hasActiveMine() {
    return this.hasMine && !this.isMineConsumed;
  }
}

export class TankMineGrid {
  constructor(options = {}) {
    this.rows = options.rows || TANK_RULES_V1.singlePlayer.rows;
    this.cols = options.cols || TANK_RULES_V1.singlePlayer.cols;
    this.mineDensity = options.mineDensity !== undefined ? options.mineDensity : TANK_RULES_V1.singlePlayer.mineDensity;
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.prng = new SplitMix64(this.seed);

    this.startPos = options.startPos || { row: this.rows - 1, col: 0 };
    this.extractionPos = options.extractionPos || (options.isPvP ? null : { row: 0, col: this.cols - 1 });
    this.startSafeRadius = options.startSafeRadius !== undefined ? options.startSafeRadius : 1;
    this.isPvP = !!options.isPvP;
    this.spawnP2 = options.spawnP2 || null;
    this.autoRevealSpawn = options.autoRevealSpawn !== undefined ? options.autoRevealSpawn : true;

    this.cells = [];
    this._initGrid();
    this._generateField();
  }

  _initGrid() {
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const rowArr = [];
      for (let c = 0; c < this.cols; c++) {
        const cell = new MineGridCell(r, c);
        if (r === this.startPos.row && c === this.startPos.col) {
          cell.isSpawn = true;
        }
        if (this.extractionPos && r === this.extractionPos.row && c === this.extractionPos.col) {
          cell.isExtraction = true;
        }
        if (this.spawnP2 && r === this.spawnP2.row && c === this.spawnP2.col) {
          cell.isSpawn = true;
        }
        rowArr.push(cell);
      }
      this.cells.push(rowArr);
    }
  }

  isInBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  getCell(r, c) {
    if (!this.isInBounds(r, c)) return null;
    return this.cells[r][c];
  }

  getNeighbors(r, c) {
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (this.isInBounds(nr, nc)) {
          list.push(this.cells[nr][nc]);
        }
      }
    }
    return list;
  }

  getCardinalNeighbors(r, c) {
    const list = [];
    const deltas = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];
    for (const d of deltas) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (this.isInBounds(nr, nc)) {
        list.push(this.cells[nr][nc]);
      }
    }
    return list;
  }

  _generateField() {
    // 1. Identify guaranteed safe cells (Spawn zones and extraction point)
    const guaranteedSafe = new Set();

    const markSafeZone = (pos, radius) => {
      if (!pos) return;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = pos.row + dr;
          const nc = pos.col + dc;
          if (this.isInBounds(nr, nc)) {
            guaranteedSafe.add(`${nr},${nc}`);
          }
        }
      }
    };

    markSafeZone(this.startPos, this.startSafeRadius);
    if (this.spawnP2) {
      markSafeZone(this.spawnP2, this.startSafeRadius);
    }
    if (this.extractionPos) {
      guaranteedSafe.add(`${this.extractionPos.row},${this.extractionPos.col}`);
    }

    // 2. In single player, carve at least one guaranteed clean path to extraction
    if (!this.isPvP && this.extractionPos) {
      let curR = this.startPos.row;
      let curC = this.startPos.col;
      guaranteedSafe.add(`${curR},${curC}`);

      while (curR !== this.extractionPos.row || curC !== this.extractionPos.col) {
        const canMoveRow = curR !== this.extractionPos.row;
        const canMoveCol = curC !== this.extractionPos.col;

        let moveVertical = false;
        if (canMoveRow && canMoveCol) {
          moveVertical = this.prng.nextFloat() < 0.5;
        } else if (canMoveRow) {
          moveVertical = true;
        }

        if (moveVertical) {
          curR += (this.extractionPos.row > curR) ? 1 : -1;
        } else {
          curC += (this.extractionPos.col > curC) ? 1 : -1;
        }
        guaranteedSafe.add(`${curR},${curC}`);
      }
    }

    // 3. Populate mines based on density outside guaranteed safe zone
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!guaranteedSafe.has(`${r},${c}`)) {
          if (this.prng.nextFloat() < this.mineDensity) {
            this.cells[r][c].hasMine = true;
          }
        }
      }
    }

    // 4. Calculate adjacent mine counts
    this._recomputeAllClues();

    // 5. Reveal spawn area initially
    if (this.autoRevealSpawn) {
      this.revealCell(this.startPos.row, this.startPos.col);
    }
  }

  _recomputeAllClues() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        const neighbors = this.getNeighbors(r, c);
        cell.adjacentMines = neighbors.filter(n => n.hasActiveMine()).length;
      }
    }
  }

  /**
   * Flood reveal zero-mine regions and their boundaries
   * Optimized with visited set to prevent redundant checks
   */
  revealCell(row, col) {
    const cell = this.getCell(row, col);
    if (!cell || cell.state === CELL_STATE.REVEALED || cell.state === CELL_STATE.FLAGGED) {
      return [];
    }

    const revealedCells = [];
    const queue = [cell];
    const visited = new Set();
    const cellKey = `${cell.row},${cell.col}`;

    cell.state = CELL_STATE.REVEALED;
    revealedCells.push(cell);
    visited.add(cellKey);

    while (queue.length > 0) {
      const current = queue.shift();

      // If current cell has zero adjacent mines, cascade to all 8 neighbors
      if (current.adjacentMines === 0 && !current.hasActiveMine()) {
        const neighbors = this.getNeighbors(current.row, current.col);
        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.row},${neighbor.col}`;

          // Skip if already visited or processed
          if (visited.has(neighborKey)) continue;

          if (neighbor.state === CELL_STATE.UNEXPLORED && !neighbor.hasActiveMine()) {
            neighbor.state = CELL_STATE.REVEALED;
            revealedCells.push(neighbor);
            visited.add(neighborKey);

            // Only add to queue if it has potential to cascade further
            if (neighbor.adjacentMines === 0) {
              queue.push(neighbor);
            }
          }
        }
      }
    }

    return revealedCells;
  }

  /**
   * Scan cell ahead: Reveals without moving or detonating
   */
  scanCell(row, col) {
    const cell = this.getCell(row, col);
    if (!cell) return { valid: false, error: 'Out of bounds' };

    if (cell.hasActiveMine()) {
      cell.isScannedMine = true; // Confirmed detected mine
      return { valid: true, foundMine: true, cell };
    }

    // Safe cell: reveal it and any cascading 0-regions
    const revealed = this.revealCell(row, col);
    return { valid: true, foundMine: false, cell, revealed };
  }

  /**
   * Toggle player flag
   */
  toggleFlag(row, col) {
    const cell = this.getCell(row, col);
    if (!cell || cell.state === CELL_STATE.REVEALED) return false;

    if (cell.state === CELL_STATE.FLAGGED) {
      cell.state = CELL_STATE.UNEXPLORED;
    } else {
      cell.state = CELL_STATE.FLAGGED;
    }
    return true;
  }

  /**
   * Detonate a mine at cell: Consumes the mine, creates permanent crater
   */
  detonateMine(row, col) {
    const cell = this.getCell(row, col);
    if (!cell || !cell.hasActiveMine()) return false;

    cell.hasMine = false;
    cell.isMineConsumed = true;
    cell.crater = CRATER_TYPE.MINE_DETONATION;
    cell.state = CELL_STATE.REVEALED;
    cell.isScannedMine = false;

    // Recompute adjacent mine numbers for neighbors since this mine is consumed
    this._recomputeAllClues();
    return true;
  }

  /**
   * Shell impact on cell: Creates permanent shell crater.
   * If landing on a live mine, detonates and consumes that mine!
   */
  impactShell(row, col) {
    const cell = this.getCell(row, col);
    if (!cell) return null;

    let detonatedMine = false;
    if (cell.hasActiveMine()) {
      cell.hasMine = false;
      cell.isMineConsumed = true;
      detonatedMine = true;
    }

    cell.crater = CRATER_TYPE.SHELL_IMPACT;
    cell.state = CELL_STATE.REVEALED;
    cell.isScannedMine = false;

    if (detonatedMine) {
      this._recomputeAllClues();
    }

    return { cell, detonatedMine };
  }

  countRemainingActiveMines() {
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c].hasActiveMine()) count++;
      }
    }
    return count;
  }

  countTotalCraters() {
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c].crater !== CRATER_TYPE.NONE) count++;
      }
    }
    return count;
  }
}

/**
 * Advanced Minesweeper Logic Solver
 * Performs mathematical deduction to identify guaranteed safe cells and mines
 */
export class MinesweeperSolver {
  /**
   * Analyze a cell and determine if it's guaranteed safe or guaranteed mine
   * @param {TankMineGrid} grid
   * @param {number} row
   * @param {number} col
   * @returns {{isSafe: boolean, isMine: boolean, confidence: number, reason: string}}
   */
  static analyzeCell(grid, row, col) {
    const cell = grid.getCell(row, col);
    if (!cell) {
      return { isSafe: false, isMine: false, confidence: 0, reason: 'Out of bounds' };
    }

    // Already revealed cells
    if (cell.isRevealed()) {
      return {
        isSafe: !cell.hasActiveMine(),
        isMine: cell.hasActiveMine(),
        confidence: 1.0,
        reason: 'Cell already revealed'
      };
    }

    // Check all revealed neighbors for deduction
    const neighbors = grid.getNeighbors(row, col);

    for (const neighbor of neighbors) {
      if (!neighbor.isRevealed()) continue;

      const neighborNeighbors = grid.getNeighbors(neighbor.row, neighbor.col);
      const flaggedCount = neighborNeighbors.filter(n => n.isFlagged()).length;
      const unrevealedUnflagged = neighborNeighbors.filter(n => !n.isRevealed() && !n.isFlagged());

      // Rule 1: All mines accounted for → remaining unrevealed neighbors are safe
      if (flaggedCount === neighbor.adjacentMines && unrevealedUnflagged.length > 0) {
        if (unrevealedUnflagged.some(n => n.row === row && n.col === col)) {
          return {
            isSafe: true,
            isMine: false,
            confidence: 1.0,
            reason: `Neighbor at [${neighbor.row},${neighbor.col}] has ${neighbor.adjacentMines} mines, all flagged`
          };
        }
      }

      // Rule 2: Unrevealed cells equal remaining mines → all are mines
      const remainingMines = neighbor.adjacentMines - flaggedCount;
      if (remainingMines > 0 && unrevealedUnflagged.length === remainingMines) {
        if (unrevealedUnflagged.some(n => n.row === row && n.col === col)) {
          return {
            isSafe: false,
            isMine: true,
            confidence: 1.0,
            reason: `Neighbor at [${neighbor.row},${neighbor.col}] has ${remainingMines} unflagged mines, ${unrevealedUnflagged.length} unrevealed cells`
          };
        }
      }
    }

    // Advanced pattern: Check for overlapping constraints
    const constraints = this._gatherConstraints(grid, row, col);
    if (constraints.length >= 2) {
      const advanced = this._solveConstraints(constraints, row, col);
      if (advanced.confidence > 0.5) {
        return advanced;
      }
    }

    return {
      isSafe: false,
      isMine: false,
      confidence: 0,
      reason: 'Insufficient information for deduction'
    };
  }

  /**
   * Gather all revealed neighbors that constrain this cell
   */
  static _gatherConstraints(grid, targetRow, targetCol) {
    const constraints = [];
    const neighbors = grid.getNeighbors(targetRow, targetCol);

    for (const neighbor of neighbors) {
      if (!neighbor.isRevealed() || neighbor.adjacentMines === 0) continue;

      const neighborNeighbors = grid.getNeighbors(neighbor.row, neighbor.col);
      const flaggedCount = neighborNeighbors.filter(n => n.isFlagged()).length;
      const unrevealedUnflagged = neighborNeighbors.filter(n => !n.isRevealed() && !n.isFlagged());

      const remainingMines = neighbor.adjacentMines - flaggedCount;

      if (remainingMines > 0 && unrevealedUnflagged.length > 0) {
        constraints.push({
          clueCell: neighbor,
          remainingMines,
          unrevealedCells: unrevealedUnflagged
        });
      }
    }

    return constraints;
  }

  /**
   * Advanced constraint solving using set theory
   */
  static _solveConstraints(constraints, targetRow, targetCol) {
    // Look for subset relationships between constraints
    for (let i = 0; i < constraints.length; i++) {
      for (let j = i + 1; j < constraints.length; j++) {
        const c1 = constraints[i];
        const c2 = constraints[j];

        const set1 = new Set(c1.unrevealedCells.map(cell => `${cell.row},${cell.col}`));
        const set2 = new Set(c2.unrevealedCells.map(cell => `${cell.row},${cell.col}`));

        // Check if c1 is subset of c2
        const c1IsSubsetOfC2 = [...set1].every(key => set2.has(key));
        const c2IsSubsetOfC1 = [...set2].every(key => set1.has(key));

        if (c1IsSubsetOfC2 && set1.size < set2.size) {
          // c1 ⊂ c2: The difference (c2 - c1) has exactly (mines2 - mines1) mines
          const differenceSize = set2.size - set1.size;
          const differenceHasMines = c2.remainingMines - c1.remainingMines;

          if (differenceHasMines === differenceSize) {
            // All cells in difference are mines
            const difference = [...set2].filter(key => !set1.has(key));
            if (difference.includes(`${targetRow},${targetCol}`)) {
              return {
                isSafe: false,
                isMine: true,
                confidence: 1.0,
                reason: 'Subset constraint deduction'
              };
            }
          } else if (differenceHasMines === 0) {
            // All cells in difference are safe
            const difference = [...set2].filter(key => !set1.has(key));
            if (difference.includes(`${targetRow},${targetCol}`)) {
              return {
                isSafe: true,
                isMine: false,
                confidence: 1.0,
                reason: 'Subset constraint deduction'
              };
            }
          }
        }

        if (c2IsSubsetOfC1 && set2.size < set1.size) {
          // c2 ⊂ c1: The difference (c1 - c2) has exactly (mines1 - mines2) mines
          const differenceSize = set1.size - set2.size;
          const differenceHasMines = c1.remainingMines - c2.remainingMines;

          if (differenceHasMines === differenceSize) {
            // All cells in difference are mines
            const difference = [...set1].filter(key => !set2.has(key));
            if (difference.includes(`${targetRow},${targetCol}`)) {
              return {
                isSafe: false,
                isMine: true,
                confidence: 1.0,
                reason: 'Subset constraint deduction'
              };
            }
          } else if (differenceHasMines === 0) {
            // All cells in difference are safe
            const difference = [...set1].filter(key => !set2.has(key));
            if (difference.includes(`${targetRow},${targetCol}`)) {
              return {
                isSafe: true,
                isMine: false,
                confidence: 1.0,
                reason: 'Subset constraint deduction'
              };
            }
          }
        }
      }
    }

    return { isSafe: false, isMine: false, confidence: 0, reason: 'No subset patterns found' };
  }

  /**
   * Find all cells that are guaranteed safe
   */
  static findAllSafeCells(grid) {
    const safeCells = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(r, c);
        if (!cell.isRevealed() && !cell.isFlagged()) {
          const analysis = this.analyzeCell(grid, r, c);
          if (analysis.isSafe && analysis.confidence === 1.0) {
            safeCells.push({ row: r, col: c, reason: analysis.reason });
          }
        }
      }
    }
    return safeCells;
  }

  /**
   * Find all cells that are guaranteed mines
   */
  static findAllGuaranteedMines(grid) {
    const mines = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.getCell(r, c);
        if (!cell.isRevealed() && !cell.isFlagged()) {
          const analysis = this.analyzeCell(grid, r, c);
          if (analysis.isMine && analysis.confidence === 1.0) {
            mines.push({ row: r, col: c, reason: analysis.reason });
          }
        }
      }
    }
    return mines;
  }
}
