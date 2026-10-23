/**
 * Word Tiles: Sovereign Lexicon — 15x15 Board Grid Model
 */

import { RULES_CONFIG_V1 } from './rules_config.js';

export class BoardCell {
  constructor(row, col, premium = null, isCenter = false) {
    this.row = row;
    this.col = col;
    this.premium = premium; // '3W' | '2W' | '3L' | '2L' | null
    this.isCenter = isCenter;
    this.tile = null; // Tile object if committed
    this.committed = false;
  }

  isOccupied() {
    return this.tile !== null;
  }

  clone() {
    const copy = new BoardCell(this.row, this.col, this.premium, this.isCenter);
    copy.tile = this.tile ? { ...this.tile } : null;
    copy.committed = this.committed;
    return copy;
  }
}

export class WordBoard {
  constructor(config = RULES_CONFIG_V1) {
    this.config = config;
    this.size = config.boardSize;
    this.center = config.centerCoord;
    this.grid = this._initializeGrid();
  }

  _initializeGrid() {
    const grid = [];
    const premiumLookup = new Map();

    for (const [premiumType, coords] of Object.entries(this.config.premiumScheme)) {
      for (const [r, c] of coords) {
        premiumLookup.set(`${r},${c}`, premiumType);
      }
    }

    for (let r = 0; r < this.size; r++) {
      const row = [];
      for (let c = 0; c < this.size; c++) {
        const isCenter = (r === this.center.row && c === this.center.col);
        const premium = premiumLookup.get(`${r},${c}`) || null;
        row.push(new BoardCell(r, c, premium, isCenter));
      }
      grid.push(row);
    }
    return grid;
  }

  getCell(row, col) {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      return null;
    }
    return this.grid[row][col];
  }

  setTile(row, col, tile, committed = true) {
    const cell = this.getCell(row, col);
    if (!cell) return false;
    cell.tile = tile;
    cell.committed = committed;
    return true;
  }

  removeTile(row, col) {
    const cell = this.getCell(row, col);
    if (!cell || cell.committed) return null;
    const tile = cell.tile;
    cell.tile = null;
    return tile;
  }

  hasCommittedTiles() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c].isOccupied() && this.grid[r][c].committed) {
          return true;
        }
      }
    }
    return false;
  }

  getCommittedTileCount() {
    let count = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c].isOccupied() && this.grid[r][c].committed) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Clone board state for non-mutating validation and AI hypothetical move exploration
   */
  clone() {
    const cloneBoard = new WordBoard(this.config);
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        cloneBoard.grid[r][c] = this.grid[r][c].clone();
      }
    }
    return cloneBoard;
  }

  serialize() {
    const cellsData = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.grid[r][c];
        if (cell.tile) {
          cellsData.push({
            r, c,
            tile: { ...cell.tile },
            committed: cell.committed
          });
        }
      }
    }
    return {
      size: this.size,
      cells: cellsData
    };
  }

  deserialize(data) {
    this.grid = this._initializeGrid();
    if (data && Array.isArray(data.cells)) {
      for (const item of data.cells) {
        const cell = this.getCell(item.r, item.c);
        if (cell) {
          cell.tile = item.tile;
          cell.committed = item.committed !== undefined ? item.committed : true;
        }
      }
    }
  }
}
