/**
 * Ocean Grid - Naval Combat Battlefield
 *
 * Manages the 10×10 tactical ocean grid for ship placement and combat
 */

import { GRID_SIZE, CELL_STATE, isInBounds, ORIENTATION } from './rules_config.js';

export class OceanGrid {
  constructor(gridSize = GRID_SIZE) {
    this.size = gridSize;
    this.cells = [];
    this.ships = []; // Ships placed on this grid
    this._initGrid();
  }

  _initGrid() {
    for (let row = 0; row < this.size; row++) {
      this.cells[row] = [];
      for (let col = 0; col < this.size; col++) {
        this.cells[row][col] = {
          state: CELL_STATE.WATER,
          ship: null,      // Reference to ship if occupied
          hit: false,      // Has this cell been fired upon?
          revealed: false  // Is this cell visible to player (for enemy grid)
        };
      }
    }
  }

  // Get cell data
  getCell(row, col) {
    if (!isInBounds(row, col, this.size)) return null;
    return this.cells[row][col];
  }

  // Check if cell is valid for ship placement
  canPlaceShip(row, col, length, orientation) {
    if (!isInBounds(row, col, this.size)) return false;

    const cells = this._getShipCells(row, col, length, orientation);
    if (!cells) return false;

    // Check all cells are empty
    for (const { r, c } of cells) {
      const cell = this.getCell(r, c);
      if (!cell || cell.ship !== null) return false;
    }

    return true;
  }

  // Place a ship on the grid
  placeShip(ship, row, col, orientation) {
    if (!this.canPlaceShip(row, col, ship.length, orientation)) {
      return false;
    }

    const cells = this._getShipCells(row, col, ship.length, orientation);

    // Mark cells as occupied
    for (const { r, c } of cells) {
      this.cells[r][c].ship = ship;
      this.cells[r][c].state = CELL_STATE.FRIENDLY;
    }

    // Store ship placement info
    ship.gridPosition = {
      row,
      col,
      orientation,
      cells: cells.map(({ r, c }) => ({ row: r, col: c }))
    };

    this.ships.push(ship);
    return true;
  }

  // Remove ship from grid
  removeShip(ship) {
    if (!ship.gridPosition) return false;

    for (const { row, col } of ship.gridPosition.cells) {
      const cell = this.getCell(row, col);
      if (cell && cell.ship === ship) {
        cell.ship = null;
        cell.state = CELL_STATE.WATER;
      }
    }

    const index = this.ships.indexOf(ship);
    if (index >= 0) {
      this.ships.splice(index, 1);
    }

    ship.gridPosition = null;
    return true;
  }

  // Fire at a cell
  fireAt(row, col) {
    if (!isInBounds(row, col, this.size)) {
      return { valid: false, reason: 'Out of bounds' };
    }

    const cell = this.getCell(row, col);

    if (cell.hit) {
      return { valid: false, reason: 'Already fired at this location' };
    }

    // Mark as fired upon
    cell.hit = true;
    cell.revealed = true;

    // Check for hit
    if (cell.ship) {
      cell.state = CELL_STATE.HIT;
      cell.ship.takeDamage(1);

      const isSunk = cell.ship.isSunk();
      if (isSunk) {
        this._markShipAsSunk(cell.ship);
      }

      return {
        valid: true,
        hit: true,
        ship: cell.ship,
        sunk: isSunk,
        row,
        col
      };
    } else {
      cell.state = CELL_STATE.MISS;
      return {
        valid: true,
        hit: false,
        row,
        col
      };
    }
  }

  // Mark all cells of a sunk ship
  _markShipAsSunk(ship) {
    if (!ship.gridPosition) return;

    for (const { row, col } of ship.gridPosition.cells) {
      const cell = this.getCell(row, col);
      if (cell) {
        cell.state = CELL_STATE.SUNK;
      }
    }
  }

  // Get list of cells occupied by ship at position
  _getShipCells(row, col, length, orientation) {
    const cells = [];

    for (let i = 0; i < length; i++) {
      let r = row;
      let c = col;

      if (orientation === ORIENTATION.HORIZONTAL) {
        c = col + i;
      } else {
        r = row + i;
      }

      if (!isInBounds(r, c, this.size)) {
        return null; // Ship extends beyond grid
      }

      cells.push({ r, c });
    }

    return cells;
  }

  // Check if all ships are destroyed
  areAllShipsSunk() {
    return this.ships.every(ship => ship.isSunk());
  }

  // Get remaining ships
  getRemainingShips() {
    return this.ships.filter(ship => !ship.isSunk());
  }

  // Count hits and misses
  getStats() {
    let hits = 0;
    let misses = 0;
    let sunk = 0;

    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const cell = this.cells[row][col];
        if (cell.hit) {
          if (cell.state === CELL_STATE.HIT || cell.state === CELL_STATE.SUNK) {
            hits++;
          } else {
            misses++;
          }
        }
      }
    }

    sunk = this.ships.filter(s => s.isSunk()).length;

    return { hits, misses, sunk, total: this.ships.length };
  }

  // Reveal a cell (for radar scans)
  revealCell(row, col) {
    const cell = this.getCell(row, col);
    if (cell) {
      cell.revealed = true;
    }
  }

  // Reveal area (radar scan)
  revealArea(centerRow, centerCol, radius) {
    const revealed = [];

    for (let row = centerRow - radius; row <= centerRow + radius; row++) {
      for (let col = centerCol - radius; col <= centerCol + radius; col++) {
        if (isInBounds(row, col, this.size)) {
          const cell = this.getCell(row, col);
          if (cell && !cell.revealed) {
            cell.revealed = true;
            revealed.push({ row, col, hasShip: cell.ship !== null });
          }
        }
      }
    }

    return revealed;
  }

  // Clone grid (for AI opponent)
  clone() {
    const clone = new OceanGrid(this.size);
    // Deep copy cells
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        clone.cells[row][col] = { ...this.cells[row][col] };
      }
    }
    return clone;
  }

  // Serialize for save/network
  serialize() {
    return {
      size: this.size,
      cells: this.cells.map(row =>
        row.map(cell => ({
          state: cell.state,
          hit: cell.hit,
          revealed: cell.revealed,
          hasShip: cell.ship !== null
        }))
      ),
      ships: this.ships.map(ship => ship.serialize())
    };
  }
}
