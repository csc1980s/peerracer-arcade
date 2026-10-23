/**
 * Word Tiles: Sovereign Lexicon — Tile Bag & Conservation Manager
 */

import { RULES_CONFIG_V1 } from './rules_config.js';
import { PRNG } from '../prng.js';

export class Tile {
  constructor(id, letter, score, isBlank = false) {
    this.id = id;
    this.letter = letter; // 'A'-'Z' or '_'
    this.score = score;
    this.isBlank = isBlank;
    this.designatedLetter = null; // Set when blank is played on board
  }

  getEffectiveLetter() {
    return this.isBlank ? (this.designatedLetter || '?') : this.letter;
  }

  getEffectiveScore() {
    return this.isBlank ? 0 : this.score;
  }

  clone() {
    const copy = new Tile(this.id, this.letter, this.score, this.isBlank);
    copy.designatedLetter = this.designatedLetter;
    return copy;
  }
}

export class TileBag {
  constructor(options = {}) {
    this.config = options.config || RULES_CONFIG_V1;
    this.seed = options.seed || Date.now();
    this.prng = new PRNG(this.seed);
    this.tiles = [];
    this._initializeBag();
  }

  _initializeBag() {
    this.tiles = [];
    let tileIndex = 0;

    for (const [letter, count] of Object.entries(this.config.tileDistribution)) {
      const isBlank = (letter === '_');
      const score = this.config.tileScores[letter] || 0;

      for (let i = 0; i < count; i++) {
        this.tiles.push(new Tile(`tile_${tileIndex++}`, letter, score, isBlank));
      }
    }

    this.shuffle();
  }

  shuffle() {
    this.prng.shuffle(this.tiles);
  }

  count() {
    return this.tiles.length;
  }

  draw(count) {
    const drawn = [];
    const numToDraw = Math.min(count, this.tiles.length);
    for (let i = 0; i < numToDraw; i++) {
      drawn.push(this.tiles.pop());
    }
    return drawn;
  }

  exchange(returnedTiles) {
    if (this.tiles.length < this.config.exchangeMinimumBag) {
      throw new Error(`Cannot exchange tiles: bag contains fewer than ${this.config.exchangeMinimumBag} tiles.`);
    }

    const drawn = this.draw(returnedTiles.length);
    for (const tile of returnedTiles) {
      tile.designatedLetter = null;
      this.tiles.push(tile);
    }
    this.shuffle();
    return drawn;
  }

  returnTiles(returnedTiles) {
    for (const tile of returnedTiles) {
      tile.designatedLetter = null;
      this.tiles.push(tile);
    }
  }

  serialize() {
    return {
      seed: this.seed,
      tiles: this.tiles.map(t => ({
        id: t.id,
        letter: t.letter,
        score: t.score,
        isBlank: t.isBlank,
        designatedLetter: t.designatedLetter
      }))
    };
  }

  deserialize(data) {
    if (data && Array.isArray(data.tiles)) {
      this.seed = data.seed || this.seed;
      this.tiles = data.tiles.map(t => {
        const tile = new Tile(t.id, t.letter, t.score, t.isBlank);
        tile.designatedLetter = t.designatedLetter;
        return tile;
      });
    }
  }

  /**
   * Diagnostic Invariant Check: Asserts that exactly 100 tiles exist
   * across Bag, Human Rack, AI Rack, Board, and any Temporary Placements.
   */
  static verifyConservation(bag, humanRack, aiRack, board, tempPlacements = []) {
    const totalTiles = 100;
    const allTiles = new Map();

    const record = (tile, source) => {
      if (!tile || !tile.id) return;
      if (allTiles.has(tile.id)) {
        throw new Error(`Tile Conservation Invariant Violated! Duplicate tile ID '${tile.id}' in ${source} and ${allTiles.get(tile.id)}`);
      }
      allTiles.set(tile.id, source);
    };

    bag.tiles.forEach(t => record(t, 'bag'));
    humanRack.forEach(t => record(t, 'humanRack'));
    aiRack.forEach(t => record(t, 'aiRack'));
    tempPlacements.forEach(p => record(p.tile, 'temporaryPlacement'));

    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        const cell = board.getCell(r, c);
        if (cell && cell.tile) {
          record(cell.tile, `board[${r},${c}]`);
        }
      }
    }

    if (allTiles.size !== totalTiles) {
      throw new Error(`Tile Conservation Invariant Violated! Expected ${totalTiles} total tiles, found ${allTiles.size}.`);
    }

    return true;
  }
}
