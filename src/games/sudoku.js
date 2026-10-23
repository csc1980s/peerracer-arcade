/**
 * Ninefold — Sudoku Game Coordinator
 *
 * Supports:
 * - Four difficulties graded by the techniques a person needs (Easy to Expert),
 *   every puzzle with exactly one solution.
 * - A daily puzzle per difficulty, the same for everyone on that date.
 * - Pencil notes with automatic clean-up, mistake checking, explained hints,
 *   unlimited undo.
 *
 * State is plain JSON so the app's save/resume can store it directly.
 */

import { SplitMix64 } from '../core/prng.js';
import {
  DIFFICULTIES, PEERS, UNIT_NAMES, bit, bitsToDigits, rowOf, colOf, boxOf,
  generatePuzzle, buildCandidates, findSingle, findConflicts
} from '../core/sudoku/engine.js';

export const SUDOKU_SCORING = {
  mistakePenalty: 10,
  hintPenalty: 0
};

/** Stable numeric seed for a date's daily puzzle at a difficulty. */
export function dailySeed(dateStr, difficulty) {
  const text = `ninefold-daily-${dateStr}-${difficulty}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h || 1;
}

export function todayString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class SudokuGame {
  constructor(options = {}) {
    this.difficulty = DIFFICULTIES[options.difficulty] ? options.difficulty : 'medium';
    this.daily = options.daily || null; // 'YYYY-MM-DD' for the daily puzzle
    this.seed = this.daily
      ? dailySeed(this.daily, this.difficulty)
      : (options.seed !== undefined ? options.seed : Date.now());
    this.config = DIFFICULTIES[this.difficulty];
    this.dealCode = SplitMix64.formatDealCode('SU', this.seed);

    const { puzzle, solution, level, clues } = generatePuzzle(new SplitMix64(this.seed), this.difficulty);

    this.state = {
      seed: this.seed,
      difficulty: this.difficulty,
      daily: this.daily,
      level,
      clues,
      puzzle,
      solution,
      values: puzzle.slice(),
      notes: new Array(81).fill(0),
      awarded: new Array(81).fill(0), // cells that already earned placement points
      score: 0,
      moves: 0,
      mistakes: 0,
      hints: 0,
      won: false,
      history: []
    };
  }

  /** Rebuilds a game from a saved state snapshot. */
  static fromState(saved) {
    const game = new SudokuGame({ seed: saved.seed, difficulty: saved.difficulty, daily: saved.daily });
    if (Array.isArray(saved.values) && saved.values.length === 81) {
      game.state = JSON.parse(JSON.stringify({ ...game.state, ...saved }));
    }
    return game;
  }

  // ------------------------------------------------------------------
  // Queries
  // ------------------------------------------------------------------

  isGiven(i) {
    return this.state.puzzle[i] !== 0;
  }

  isWrong(i) {
    const v = this.state.values[i];
    return v !== 0 && v !== this.state.solution[i];
  }

  /** How many of each digit are correctly placed (index 1..9). */
  digitCounts() {
    const counts = new Array(10).fill(0);
    this.state.values.forEach((v, i) => { if (v && v === this.state.solution[i]) counts[v]++; });
    return counts;
  }

  conflicts() {
    return findConflicts(this.state.values);
  }

  emptyCount() {
    return this.state.values.filter(v => !v).length;
  }

  // ------------------------------------------------------------------
  // Actions (each returns a result object; all are undoable)
  // ------------------------------------------------------------------

  _snapshot() {
    const s = this.state;
    return {
      values: s.values.slice(), notes: s.notes.slice(), awarded: s.awarded.slice(),
      score: s.score, moves: s.moves, mistakes: s.mistakes, hints: s.hints, won: s.won
    };
  }

  _push() {
    this.state.history.push(this._snapshot());
    if (this.state.history.length > 400) this.state.history.shift();
  }

  /** Places a digit (or clears with 0). */
  setValue(i, d) {
    const s = this.state;
    if (s.won || this.isGiven(i) || i < 0 || i > 80) return { ok: false };
    if (s.values[i] === d) return { ok: false };

    this._push();
    s.values[i] = d;
    s.notes[i] = 0;
    s.moves++;

    if (!d) return { ok: true, cleared: true };

    const correct = d === s.solution[i];
    let points = 0;
    if (correct) {
      // Placing a digit tidies matching notes in its row, column and box.
      for (const p of PEERS[i]) s.notes[p] &= ~bit(d);
      if (!s.awarded[i]) { s.awarded[i] = 1; points = this.config.placePoints; }
    } else {
      s.mistakes++;
      points = -SUDOKU_SCORING.mistakePenalty;
    }
    s.score = Math.max(0, s.score + points);

    const won = s.values.every((v, k) => v === s.solution[k]);
    if (won) {
      s.won = true;
      const bonus = Math.max(0, this.config.winBonus - s.hints * 50 - s.mistakes * 25);
      s.score += bonus;
      return { ok: true, correct, points: points + bonus, won: true };
    }
    return { ok: true, correct, points, won: false };
  }

  toggleNote(i, d) {
    const s = this.state;
    if (s.won || this.isGiven(i) || s.values[i]) return { ok: false };
    this._push();
    s.notes[i] ^= bit(d);
    return { ok: true };
  }

  /** Fills every empty cell's notes with its possible digits. */
  fillAllNotes() {
    const s = this.state;
    if (s.won) return { ok: false };
    this._push();
    const cand = buildCandidates(s.values);
    for (let i = 0; i < 81; i++) if (!s.values[i]) s.notes[i] = cand[i];
    return { ok: true };
  }

  undo() {
    const last = this.state.history.pop();
    if (!last) return false;
    Object.assign(this.state, last);
    return true;
  }

  // ------------------------------------------------------------------
  // Hints
  // ------------------------------------------------------------------

  /**
   * Explains the next step. Wrong entries are pointed out first; otherwise
   * the easiest logical placement is described. If none exists the hint
   * reveals the most constrained cell.
   */
  getTacticalHint() {
    const s = this.state;
    if (s.won) return null;

    const wrong = s.values.findIndex((v, i) => v && v !== s.solution[i]);
    if (wrong >= 0) {
      return {
        action: 'FIX', cell: wrong,
        message: `The ${s.values[wrong]} at row ${rowOf(wrong) + 1}, column ${colOf(wrong) + 1} doesn't belong there. Clear it first.`
      };
    }

    const cand = buildCandidates(s.values);
    const single = findSingle(s.values, cand);
    if (single) {
      const where = `row ${rowOf(single.cell) + 1}, column ${colOf(single.cell) + 1}`;
      const message = single.technique === 'naked_single'
        ? `Look at ${where}: every digit except ${single.digit} already appears in its row, column or box.`
        : `In ${UNIT_NAMES[single.unit]}, the ${single.digit} can only go at ${where}.`;
      return { action: 'PLACE', cell: single.cell, digit: single.digit, technique: single.technique, unit: single.unit, message };
    }

    // No single available: point at the cell with the fewest options.
    let best = -1, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (s.values[i]) continue;
      const n = bitsToDigits(cand[i]).length;
      if (n < bestN) { best = i; bestN = n; }
    }
    return {
      action: 'REVEAL', cell: best, digit: s.solution[best],
      message: `This one takes advanced logic. Row ${rowOf(best) + 1}, column ${colOf(best) + 1} has only ${bestN} options, and it's a ${s.solution[best]}.`
    };
  }

  /** Places the hinted digit for the player (counts as a hint). */
  applyHint(hint = this.getTacticalHint()) {
    if (!hint || hint.cell === undefined || hint.cell < 0) return { ok: false };
    if (hint.action === 'FIX') {
      const r = this.setValue(hint.cell, 0);
      if (r.ok) this.state.hints++;
      return r;
    }
    const before = this.state.awarded[hint.cell];
    this.state.awarded[hint.cell] = 1; // hinted cells earn no placement points
    const r = this.setValue(hint.cell, hint.digit);
    if (r.ok) {
      this.state.hints++;
      // setValue's undo snapshot was taken after we flagged the cell; unflag it there.
      this.state.history[this.state.history.length - 1].awarded[hint.cell] = before;
    } else {
      this.state.awarded[hint.cell] = before;
    }
    return r;
  }

  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

export { DIFFICULTIES, rowOf, colOf, boxOf };
