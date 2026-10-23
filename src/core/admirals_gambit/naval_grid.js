/**
 * Admiral's Gambit: Iron Fleet — Naval Grid Engine
 *
 * Authoritative 10x10 oceanic grid managing ship placements, firing solutions,
 * hit/miss detection, ship sinking mechanics, and special tactical scan queries.
 */

import { GRID_SIZE, CELL_STATE, SHIP_CLASSES, ORIENTATION, COMMAND_POINTS } from './rules_config.js';

export class NavalGrid {
  constructor(isPlayer = true) {
    this.isPlayer = isPlayer;
    this.gridSize = GRID_SIZE;
    this.ships = new Map();
    this.cells = this._createEmptyGrid();
    this.shotsFired = 0;
    this.hitsScored = 0;
  }

  _createEmptyGrid() {
    const grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      const row = [];
      for (let c = 0; c < this.gridSize; c++) {
        row.push({
          row: r,
          col: c,
          state: CELL_STATE.WATER,
          shipId: null,
          shipSegment: -1,
          smokeTurns: 0
        });
      }
      grid.push(row);
    }
    return grid;
  }

  reset() {
    this.ships.clear();
    this.cells = this._createEmptyGrid();
    this.shotsFired = 0;
    this.hitsScored = 0;
  }

  // ============================================================================
  // SHIP DEPLOYMENT
  // ============================================================================

  canPlaceShip(shipClassKey, startRow, startCol, orientation) {
    const shipDef = SHIP_CLASSES[shipClassKey] || Object.values(SHIP_CLASSES).find(s => s.id === shipClassKey);
    if (!shipDef) return false;

    const size = shipDef.size;
    const isHoriz = orientation === ORIENTATION.HORIZONTAL;

    for (let i = 0; i < size; i++) {
      const r = isHoriz ? startRow : startRow + i;
      const c = isHoriz ? startCol + i : startCol;

      // Bounds check
      if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) {
        return false;
      }

      // Overlap check
      if (this.cells[r][c].shipId !== null) {
        return false;
      }
    }

    return true;
  }

  placeShip(shipClassKey, startRow, startCol, orientation) {
    const shipDef = SHIP_CLASSES[shipClassKey] || Object.values(SHIP_CLASSES).find(s => s.id === shipClassKey);
    if (!shipDef) {
      throw new Error(`Unknown ship class: ${shipClassKey}`);
    }

    if (!this.canPlaceShip(shipClassKey, startRow, startCol, orientation)) {
      return false;
    }

    // Remove previous instance if already placed
    if (this.ships.has(shipDef.id)) {
      this.removeShip(shipDef.id);
    }

    const isHoriz = orientation === ORIENTATION.HORIZONTAL;
    const occupiedCells = [];

    for (let i = 0; i < shipDef.size; i++) {
      const r = isHoriz ? startRow : startRow + i;
      const c = isHoriz ? startCol + i : startCol;

      this.cells[r][c].state = CELL_STATE.SHIP_INTACT;
      this.cells[r][c].shipId = shipDef.id;
      this.cells[r][c].shipSegment = i;

      occupiedCells.push({ row: r, col: c });
    }

    this.ships.set(shipDef.id, {
      ...shipDef,
      orientation,
      startRow,
      startCol,
      cells: occupiedCells,
      hits: 0,
      sunk: false
    });

    return true;
  }

  removeShip(shipId) {
    const ship = this.ships.get(shipId);
    if (!ship) return false;

    ship.cells.forEach(({ row, col }) => {
      this.cells[row][col].state = CELL_STATE.WATER;
      this.cells[row][col].shipId = null;
      this.cells[row][col].shipSegment = -1;
    });

    this.ships.delete(shipId);
    return true;
  }

  randomizeFleet(prng = Math.random) {
    this.reset();
    const shipKeys = Object.keys(SHIP_CLASSES);

    for (const key of shipKeys) {
      const shipDef = SHIP_CLASSES[key];
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 200) {
        attempts++;
        const orientation = prng() < 0.5 ? ORIENTATION.HORIZONTAL : ORIENTATION.VERTICAL;
        const maxR = orientation === ORIENTATION.VERTICAL ? this.gridSize - shipDef.size : this.gridSize - 1;
        const maxC = orientation === ORIENTATION.HORIZONTAL ? this.gridSize - shipDef.size : this.gridSize - 1;

        const r = Math.floor(prng() * (maxR + 1));
        const c = Math.floor(prng() * (maxC + 1));

        if (this.placeShip(key, r, c, orientation)) {
          placed = true;
        }
      }

      if (!placed) {
        throw new Error(`Failed to place fleet deterministically: ${key}`);
      }
    }

    return this.ships.size === shipKeys.length;
  }

  // ============================================================================
  // FIRING & DAMAGE RESOLUTION
  // ============================================================================

  receiveFire(row, col) {
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      return { valid: false, error: 'OUT_OF_BOUNDS' };
    }

    const cell = this.cells[row][col];

    // Already targeted
    if (cell.state === CELL_STATE.MISS || cell.state === CELL_STATE.HIT || cell.state === CELL_STATE.SUNK) {
      return { valid: false, error: 'ALREADY_TARGETED', row, col };
    }

    this.shotsFired++;

    // Water -> Miss
    if (cell.state === CELL_STATE.WATER) {
      cell.state = CELL_STATE.MISS;
      return {
        valid: true,
        result: 'MISS',
        row,
        col,
        sunk: false,
        allSunk: false
      };
    }

    // Ship Intact -> Hit
    if (cell.state === CELL_STATE.SHIP_INTACT) {
      cell.state = CELL_STATE.HIT;
      this.hitsScored++;

      const ship = this.ships.get(cell.shipId);
      if (ship) {
        ship.hits++;

        // Check if vessel is sunk
        if (ship.hits >= ship.size) {
          ship.sunk = true;
          // Mark all ship segments as SUNK
          ship.cells.forEach(({ row: r, col: c }) => {
            this.cells[r][c].state = CELL_STATE.SUNK;
          });

          return {
            valid: true,
            result: 'SUNK',
            row,
            col,
            shipId: ship.id,
            shipName: ship.name,
            shipCode: ship.code,
            shipSize: ship.size,
            sunk: true,
            allSunk: this.areAllShipsSunk()
          };
        }

        return {
          valid: true,
          result: 'HIT',
          row,
          col,
          shipId: ship.id,
          shipName: ship.name,
          shipCode: ship.code,
          sunk: false,
          allSunk: false
        };
      }
    }

    return { valid: false, error: 'UNKNOWN_CELL_STATE' };
  }

  // ============================================================================
  // SPECIAL GAMBIT ACTIONS & SENSORS
  // ============================================================================

  scanAirRecon(centerRow, centerCol) {
    // 3x3 sector recon query
    let detected = false;
    let contactCount = 0;
    const scannedCells = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = centerRow + dr;
        const c = centerCol + dc;

        if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
          scannedCells.push({ row: r, col: c });
          const cell = this.cells[r][c];

          // Check for intact ship (Submarine has silent running stealth trait)
          if (cell.state === CELL_STATE.SHIP_INTACT) {
            const ship = this.ships.get(cell.shipId);
            if (!ship?.isStealth || ship.hits > 0) {
              detected = true;
              contactCount++;
            }
          }
        }
      }
    }

    return {
      centerRow,
      centerCol,
      detected,
      contactCount,
      scannedCells
    };
  }

  radarSweep(isRow, index) {
    if (index < 0 || index >= this.gridSize) {
      return { valid: false, error: 'OUT_OF_BOUNDS' };
    }

    let detectedCount = 0;
    const scannedCells = [];

    for (let i = 0; i < this.gridSize; i++) {
      const r = isRow ? index : i;
      const c = isRow ? i : index;
      scannedCells.push({ row: r, col: c });

      const cell = this.cells[r][c];
      if (cell.state === CELL_STATE.SHIP_INTACT) {
        const ship = this.ships.get(cell.shipId);
        // Submarines are stealthy unless previously hit
        if (!ship?.isStealth || ship.hits > 0) {
          detectedCount++;
        }
      }
    }

    return {
      valid: true,
      isRow,
      index,
      detectedCount,
      scannedCells
    };
  }

  deploySmokeScreen(centerRow, centerCol) {
    // 2x2 sector smoke screen
    const smokedCells = [];
    for (let dr = 0; dr <= 1; dr++) {
      for (let dc = 0; dc <= 1; dc++) {
        const r = centerRow + dr;
        const c = centerCol + dc;
        if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
          this.cells[r][c].smokeTurns = COMMAND_POINTS.SMOKE_SCREEN_DURATION;
          smokedCells.push({ row: r, col: c });
        }
      }
    }
    return smokedCells;
  }

  tickSmoke() {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.cells[r][c].smokeTurns > 0) {
          this.cells[r][c].smokeTurns--;
        }
      }
    }
  }

  // ============================================================================
  // FLEET STATUS & QUERIES
  // ============================================================================

  areAllShipsSunk() {
    if (this.ships.size === 0) return false;
    for (const ship of this.ships.values()) {
      if (!ship.sunk) return false;
    }
    return true;
  }

  getAliveShips() {
    return Array.from(this.ships.values()).filter(s => !s.sunk);
  }

  isShipAlive(shipId) {
    const s = this.ships.get(shipId);
    return !!(s && !s.sunk);
  }

  getPublicView() {
    // Return sanitized grid representation for opponent / radar overlay
    return this.cells.map(row => row.map(cell => {
      let visibleState = cell.state;
      // Mask intact ships as unrevealed water from opponent's perspective
      if (!this.isPlayer && visibleState === CELL_STATE.SHIP_INTACT) {
        visibleState = CELL_STATE.WATER;
      }
      return {
        row: cell.row,
        col: cell.col,
        state: visibleState,
        isSmoked: cell.smokeTurns > 0
      };
    }));
  }
}
