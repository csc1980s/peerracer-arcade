/**
 * Keystone Drop — Falling-Block Game Coordinator
 *
 * Seven four-block shapes fall into a 10-wide, 20-tall well. Slide and turn
 * them, then lock them in place; full rows disappear. Clear the goal number of
 * rows to win, or stack out the top and the run ends.
 *
 * The rules layer is time-driven through update(dtMs) so it can be tested
 * without a browser. Everything the view needs to draw is in `state`.
 *
 * Original rules and scoring written for Solitaire Sovereign:
 * - 7-shape shuffled bag, three previews, one hold per drop.
 * - Gravity speeds up every 10 rows; lock delay with limited resets.
 * - "Keystone" bonus: a perfect clear of the well scores a big bonus.
 */

import { SplitMix64 } from '../core/prng.js';

export const COLS = 10;
export const ROWS = 20;
export const HIDDEN = 2; // spawn rows above the visible well

export const GOAL_ROWS = 40;
export const PREVIEWS = 3;
export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;

// Each shape lists its cells in a square box; rotations are derived from it.
export const SHAPES = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }
};
export const SHAPE_IDS = Object.keys(SHAPES);

export const LINE_SCORES = [0, 100, 300, 500, 800];
export const KEYSTONE_BONUS = 1500;

/** Cells of a shape in rotation `rot` (0-3, clockwise) as [x, y] pairs. */
export function shapeCells(id, rot) {
  const { size, cells } = SHAPES[id];
  let out = cells.map(([x, y]) => [x, y]);
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) {
    out = out.map(([x, y]) => [size - 1 - y, x]);
  }
  return out;
}

/** Gravity interval in milliseconds for a level (level 1 = 800 ms). */
export function gravityMs(level) {
  return Math.max(60, Math.round(800 * Math.pow(0.85, level - 1)));
}

const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];

export class KeystoneDropGame {
  constructor(options = {}) {
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.goalRows = options.goalRows || GOAL_ROWS;
    this.dealCode = SplitMix64.formatDealCode('KD', this.seed);
    this.rng = new SplitMix64(this.seed);
    this.bagsDrawn = 0;

    this.state = {
      seed: this.seed,
      goalRows: this.goalRows,
      board: Array.from({ length: ROWS + HIDDEN }, () => new Array(COLS).fill(0)),
      queue: [],
      current: null,   // { id, rot, x, y }
      hold: null,
      holdUsed: false,
      score: 0,
      moves: 0,        // shapes locked
      rows: 0,
      level: 1,
      combo: -1,
      lastClear: null, // { rows, tspin:false, keystone, points } for the view's flash
      gravityAcc: 0,
      lockAcc: 0,
      lockResets: 0,
      elapsedMs: 0,
      bagsDrawn: 0,
      won: false,
      over: false
    };

    this._refill();
    this._spawn();
  }

  /** Rebuilds a game from a saved snapshot. */
  static fromState(saved) {
    const game = new KeystoneDropGame({ seed: saved.seed, goalRows: saved.goalRows });
    if (Array.isArray(saved.board) && saved.board.length === ROWS + HIDDEN) {
      game.state = JSON.parse(JSON.stringify({ ...game.state, ...saved }));
      // Re-align the shape bag: replay the draws already made.
      game.rng = new SplitMix64(saved.seed);
      game.bagsDrawn = 0;
      for (let i = 0; i < (saved.bagsDrawn || 0); i++) game._bag();
    }
    return game;
  }

  // ------------------------------------------------------------------
  // Shape supply
  // ------------------------------------------------------------------

  _bag() {
    this.bagsDrawn = (this.bagsDrawn || 0) + 1;
    this.state.bagsDrawn = this.bagsDrawn;
    return this.rng.shuffle([...SHAPE_IDS]);
  }

  _refill() {
    while (this.state.queue.length < PREVIEWS + 7) this.state.queue.push(...this._bag());
  }

  _spawn(id = null) {
    const s = this.state;
    this._refill();
    const shape = id || s.queue.shift();
    const { size } = SHAPES[shape];
    s.current = { id: shape, rot: 0, x: Math.floor((COLS - size) / 2), y: HIDDEN };
    s.gravityAcc = 0;
    s.lockAcc = 0;
    s.lockResets = 0;
    if (this._collides(s.current)) {
      s.over = true;
      s.current = null;
    }
  }

  // ------------------------------------------------------------------
  // Geometry
  // ------------------------------------------------------------------

  _collides(piece) {
    const board = this.state.board;
    for (const [cx, cy] of shapeCells(piece.id, piece.rot)) {
      const x = piece.x + cx;
      const y = piece.y + cy;
      if (x < 0 || x >= COLS || y >= ROWS + HIDDEN) return true;
      if (y >= 0 && board[y][x]) return true;
    }
    return false;
  }

  /** True if the current piece is resting on something. */
  isGrounded() {
    const p = this.state.current;
    return !!p && this._collides({ ...p, y: p.y + 1 });
  }

  /** Row the current piece would land on. */
  ghostY() {
    const p = this.state.current;
    if (!p) return 0;
    let y = p.y;
    while (!this._collides({ ...p, y: y + 1 })) y++;
    return y;
  }

  /** Cells of the current piece in board coordinates. */
  currentCells() {
    const p = this.state.current;
    return p ? shapeCells(p.id, p.rot).map(([x, y]) => [p.x + x, p.y + y]) : [];
  }

  // ------------------------------------------------------------------
  // Player actions
  // ------------------------------------------------------------------

  _active() {
    const s = this.state;
    return !s.over && !s.won && !!s.current;
  }

  _touched() {
    const s = this.state;
    if (this.isGrounded() && s.lockResets < MAX_LOCK_RESETS) {
      s.lockAcc = 0;
      s.lockResets++;
    }
  }

  move(dx) {
    if (!this._active()) return false;
    const p = this.state.current;
    const next = { ...p, x: p.x + dx };
    if (this._collides(next)) return false;
    this.state.current = next;
    this._touched();
    return true;
  }

  rotate(dir = 1) {
    if (!this._active()) return false;
    const p = this.state.current;
    const rot = (p.rot + (dir > 0 ? 1 : 3)) % 4;
    for (const [kx, ky] of KICKS) {
      const next = { ...p, rot, x: p.x + kx, y: p.y + ky };
      if (!this._collides(next)) {
        this.state.current = next;
        this._touched();
        return true;
      }
    }
    return false;
  }

  /** Moves down one row. Returns true if it moved. */
  softDrop() {
    if (!this._active()) return false;
    const s = this.state;
    const p = s.current;
    const next = { ...p, y: p.y + 1 };
    if (this._collides(next)) return false;
    s.current = next;
    s.score += 1;
    s.gravityAcc = 0;
    return true;
  }

  /** Drops to the floor and locks immediately. */
  hardDrop() {
    if (!this._active()) return null;
    const s = this.state;
    const gy = this.ghostY();
    s.score += (gy - s.current.y) * 2;
    s.current = { ...s.current, y: gy };
    return this._lock();
  }

  holdPiece() {
    if (!this._active() || this.state.holdUsed) return false;
    const s = this.state;
    const swapped = s.hold;
    s.hold = s.current.id;
    this._spawn(swapped);
    s.holdUsed = true;
    return true;
  }

  // ------------------------------------------------------------------
  // Time
  // ------------------------------------------------------------------

  /**
   * Advances gravity and lock delay by dtMs.
   * @returns {object|null} the lock result if a piece locked during this call
   */
  update(dtMs) {
    const s = this.state;
    if (!this._active()) return null;
    s.elapsedMs += dtMs;

    const interval = gravityMs(s.level);
    s.gravityAcc += dtMs;
    while (s.gravityAcc >= interval && s.current) {
      s.gravityAcc -= interval;
      const next = { ...s.current, y: s.current.y + 1 };
      if (!this._collides(next)) s.current = next;
      else { s.gravityAcc = 0; break; }
    }

    if (s.current && this.isGrounded()) {
      s.lockAcc += dtMs;
      if (s.lockAcc >= LOCK_DELAY_MS) return this._lock();
    } else {
      s.lockAcc = 0;
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Locking and clearing
  // ------------------------------------------------------------------

  _lock() {
    const s = this.state;
    const p = s.current;
    const idx = SHAPE_IDS.indexOf(p.id) + 1;
    let aboveWell = true;
    for (const [x, y] of this.currentCells()) {
      if (y >= 0) s.board[y][x] = idx;
      if (y >= HIDDEN) aboveWell = false;
    }
    s.moves++;
    s.holdUsed = false;

    // Clear full rows.
    const full = [];
    for (let y = 0; y < ROWS + HIDDEN; y++) if (s.board[y].every(v => v)) full.push(y);
    let points = 0;
    let keystone = false;
    if (full.length) {
      for (const y of full) {
        s.board.splice(y, 1);
        s.board.unshift(new Array(COLS).fill(0));
      }
      s.combo++;
      keystone = s.board.every(row => row.every(v => !v));
      points = LINE_SCORES[full.length] * s.level + (s.combo > 0 ? 50 * s.combo * s.level : 0);
      if (keystone) points += KEYSTONE_BONUS * s.level;
      s.score += points;
      s.rows += full.length;
      s.level = 1 + Math.floor(s.rows / 10);
    } else {
      s.combo = -1;
    }

    s.lastClear = full.length ? { rows: full.length, keystone, points, at: s.moves } : null;
    s.current = null;

    if (s.rows >= this.goalRows) {
      s.won = true;
      return { locked: true, cleared: full.length, points, won: true, keystone };
    }
    if (aboveWell) {
      s.over = true;
      return { locked: true, cleared: full.length, points, over: true };
    }
    this._spawn();
    return { locked: true, cleared: full.length, points, over: s.over, keystone };
  }

  // ------------------------------------------------------------------
  // Misc
  // ------------------------------------------------------------------

  /** Upcoming shapes for the preview panel. */
  previews() {
    return this.state.queue.slice(0, PREVIEWS);
  }

  /** A short coaching tip based on the current stack (the game has no single best move). */
  getTacticalHint() {
    const s = this.state;
    if (s.over || s.won) return null;
    let top = ROWS;
    for (let y = HIDDEN; y < ROWS + HIDDEN; y++) {
      if (s.board[y].some(v => v)) { top = y - HIDDEN; break; }
    }
    const height = ROWS - top;
    let holes = 0;
    for (let x = 0; x < COLS; x++) {
      let seen = false;
      for (let y = HIDDEN; y < ROWS + HIDDEN; y++) {
        if (s.board[y][x]) seen = true;
        else if (seen) holes++;
      }
    }
    let message;
    if (height >= 15) message = 'The stack is getting tall. Clear rows now and keep the spawn area free.';
    else if (holes >= 4) message = 'There are several buried gaps. Aim to build flat and fill the gaps from the side.';
    else if (!s.hold) message = 'Press C to hold this shape. Save the long bar for a four-row clear.';
    else message = 'Keep the surface flat, leave one column open, and drop the long bar into it for a Quad.';
    return { action: 'TIP', message };
  }

  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }
}
