/**
 * Ninefold — Sudoku Engine
 *
 * Grids are flat arrays of 81 numbers (0 = empty), row-major.
 * - Seeded full-grid builder (randomised backtracking).
 * - Fast solution counter (bitmask backtracking, most-constrained cell first).
 * - Human-style logical solver used to grade puzzles and to explain hints.
 * - Puzzle generator that digs symmetric holes while keeping exactly one
 *   solution and the target difficulty.
 *
 * Written from scratch for Solitaire Sovereign.
 */

export const ALL = 0x3FE; // bits 1..9
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
export const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// Units: 9 rows, 9 columns, 9 boxes, each a list of cell indexes.
export const UNITS = [];
for (let r = 0; r < 9; r++) UNITS.push(DIGITS.map((_, c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITS.push(DIGITS.map((_, r) => r * 9 + c));
for (let b = 0; b < 9; b++) {
  const r0 = Math.floor(b / 3) * 3;
  const c0 = (b % 3) * 3;
  UNITS.push(DIGITS.map((_, k) => (r0 + Math.floor(k / 3)) * 9 + c0 + (k % 3)));
}
export const UNIT_NAMES = [
  ...DIGITS.map(n => `row ${n}`),
  ...DIGITS.map(n => `column ${n}`),
  ...DIGITS.map(n => `box ${n}`)
];

// Peers: the 20 cells sharing a row, column or box with each cell.
export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const set = new Set();
  for (let k = 0; k < 81; k++) {
    if (k !== i && (rowOf(k) === rowOf(i) || colOf(k) === colOf(i) || boxOf(k) === boxOf(i))) set.add(k);
  }
  return [...set];
});

export const bit = (d) => 1 << d;
export function bitCount(m) {
  let n = 0;
  while (m) { m &= m - 1; n++; }
  return n;
}
export function bitsToDigits(m) {
  return DIGITS.filter(d => m & bit(d));
}

/** Candidate mask for cell i given the digits already placed. */
export function candidatesAt(grid, i) {
  if (grid[i]) return 0;
  let m = ALL;
  for (const p of PEERS[i]) if (grid[p]) m &= ~bit(grid[p]);
  return m;
}

/** Cells whose value repeats another value in the same unit. */
export function findConflicts(grid) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    if (!grid[i]) continue;
    for (const p of PEERS[i]) if (grid[p] === grid[i]) { bad.add(i); bad.add(p); }
  }
  return bad;
}

// ---------------------------------------------------------------------------
// Backtracking: full grids and solution counting
// ---------------------------------------------------------------------------

/**
 * Counts solutions up to `limit`. If `out` is given, the first solution found
 * is copied into it.
 */
export function countSolutions(grid, limit = 2, out = null) {
  const g = grid.slice();
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const d = g[i];
    if (!d) continue;
    const b = bit(d);
    if ((rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]) & b) return 0;
    rows[rowOf(i)] |= b; cols[colOf(i)] |= b; boxes[boxOf(i)] |= b;
  }

  let count = 0;
  const search = () => {
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
      const n = bitCount(m);
      if (n === 0) return;
      if (n < bestCount) { best = i; bestMask = m; bestCount = n; if (n === 1) break; }
    }
    if (best === -1) {
      count++;
      if (out && count === 1) for (let i = 0; i < 81; i++) out[i] = g[i];
      return;
    }
    const r = rowOf(best), c = colOf(best), bx = boxOf(best);
    for (let d = 1; d <= 9 && count < limit; d++) {
      const b = bit(d);
      if (!(bestMask & b)) continue;
      g[best] = d; rows[r] |= b; cols[c] |= b; boxes[bx] |= b;
      search();
      g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b;
    }
  };
  search();
  return count;
}

/** A random complete, valid grid. */
export function buildFullGrid(rng) {
  const g = new Array(81).fill(0);
  const fill = (i) => {
    if (i === 81) return true;
    const options = rng.shuffle(bitsToDigits(candidatesAt(g, i)));
    for (const d of options) {
      g[i] = d;
      if (fill(i + 1)) return true;
    }
    g[i] = 0;
    return false;
  };
  fill(0);
  return g;
}

// ---------------------------------------------------------------------------
// Logical solver (grading + hints)
// ---------------------------------------------------------------------------

export const TECHNIQUES = {
  NAKED_SINGLE: 1,
  HIDDEN_SINGLE: 1,
  LOCKED_CANDIDATES: 2,
  NAKED_PAIR: 3,
  HIDDEN_PAIR: 3,
  STUCK: 4
};

/** Fresh candidate masks for every cell. */
export function buildCandidates(grid) {
  return grid.map((_, i) => candidatesAt(grid, i));
}

/**
 * Finds one placement that follows directly from candidates:
 * a naked single (one candidate left) or a hidden single (only place in a unit).
 * Returns { cell, digit, technique, unit } or null.
 */
export function findSingle(grid, cand) {
  for (let i = 0; i < 81; i++) {
    if (!grid[i] && bitCount(cand[i]) === 1) {
      return { cell: i, digit: bitsToDigits(cand[i])[0], technique: 'naked_single' };
    }
  }
  // Boxes first: they are what people scan most naturally.
  const order = [18, 19, 20, 21, 22, 23, 24, 25, 26, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  for (const u of order) {
    for (const d of DIGITS) {
      let spot = -1, n = 0, placed = false;
      for (const i of UNITS[u]) {
        if (grid[i] === d) { placed = true; break; }
        if (!grid[i] && (cand[i] & bit(d))) { spot = i; n++; }
      }
      if (!placed && n === 1) return { cell: spot, digit: d, technique: 'hidden_single', unit: u };
    }
  }
  return null;
}

/** Locked candidates (pointing / claiming). Returns true if anything was eliminated. */
function lockedCandidates(grid, cand) {
  let changed = false;
  for (let b = 18; b < 27; b++) {
    for (const d of DIGITS) {
      const spots = UNITS[b].filter(i => !grid[i] && (cand[i] & bit(d)));
      if (spots.length < 2) continue;
      const sameRow = spots.every(i => rowOf(i) === rowOf(spots[0]));
      const sameCol = spots.every(i => colOf(i) === colOf(spots[0]));
      const line = sameRow ? UNITS[rowOf(spots[0])] : sameCol ? UNITS[9 + colOf(spots[0])] : null;
      if (!line) continue;
      for (const i of line) {
        if (boxOf(i) !== b - 18 && !grid[i] && (cand[i] & bit(d))) { cand[i] &= ~bit(d); changed = true; }
      }
    }
  }
  for (let u = 0; u < 18; u++) {
    for (const d of DIGITS) {
      const spots = UNITS[u].filter(i => !grid[i] && (cand[i] & bit(d)));
      if (spots.length < 2) continue;
      const bx = boxOf(spots[0]);
      if (!spots.every(i => boxOf(i) === bx)) continue;
      for (const i of UNITS[18 + bx]) {
        if (!UNITS[u].includes(i) && !grid[i] && (cand[i] & bit(d))) { cand[i] &= ~bit(d); changed = true; }
      }
    }
  }
  return changed;
}

/** Naked and hidden pairs. Returns true if anything was eliminated. */
function pairs(grid, cand) {
  let changed = false;
  for (const unit of UNITS) {
    const open = unit.filter(i => !grid[i]);
    // Naked pairs
    for (let a = 0; a < open.length; a++) {
      const ma = cand[open[a]];
      if (bitCount(ma) !== 2) continue;
      for (let b = a + 1; b < open.length; b++) {
        if (cand[open[b]] !== ma) continue;
        for (const i of open) {
          if (i !== open[a] && i !== open[b] && (cand[i] & ma)) { cand[i] &= ~ma; changed = true; }
        }
      }
    }
    // Hidden pairs
    for (let d1 = 1; d1 <= 9; d1++) {
      const s1 = open.filter(i => cand[i] & bit(d1));
      if (s1.length !== 2) continue;
      for (let d2 = d1 + 1; d2 <= 9; d2++) {
        const s2 = open.filter(i => cand[i] & bit(d2));
        if (s2.length !== 2 || s2[0] !== s1[0] || s2[1] !== s1[1]) continue;
        const keep = bit(d1) | bit(d2);
        for (const i of s1) {
          if (cand[i] & ~keep) { cand[i] &= keep; changed = true; }
        }
      }
    }
  }
  return changed;
}

/**
 * Solves as a person would, using the easiest technique that makes progress.
 * Returns { solved, level } where level is the hardest technique tier used
 * (1 singles, 2 locked candidates, 3 pairs, 4 needs something harder).
 */
export function gradePuzzle(puzzle) {
  const grid = puzzle.slice();
  const cand = buildCandidates(grid);
  let level = 1;

  const place = (i, d) => {
    grid[i] = d;
    cand[i] = 0;
    for (const p of PEERS[i]) cand[p] &= ~bit(d);
  };

  for (;;) {
    if (grid.every(v => v)) return { solved: true, level };
    const single = findSingle(grid, cand);
    if (single) { place(single.cell, single.digit); continue; }
    if (cand.some((m, i) => !grid[i] && m === 0)) return { solved: false, level: 4 };
    if (lockedCandidates(grid, cand)) { level = Math.max(level, 2); continue; }
    if (pairs(grid, cand)) { level = Math.max(level, 3); continue; }
    return { solved: false, level: 4 };
  }
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export const DIFFICULTIES = {
  easy:   { id: 'easy',   name: 'Easy',   minLevel: 1, maxLevel: 1, stopClues: 38, placePoints: 5,  winBonus: 250 },
  medium: { id: 'medium', name: 'Medium', minLevel: 1, maxLevel: 2, stopClues: 30, placePoints: 10, winBonus: 500 },
  hard:   { id: 'hard',   name: 'Hard',   minLevel: 2, maxLevel: 2, stopClues: 26, placePoints: 15, winBonus: 800 },
  expert: { id: 'expert', name: 'Expert', minLevel: 3, maxLevel: 3, stopClues: 22, placePoints: 20, winBonus: 1200 }
};

/**
 * Builds a puzzle with exactly one solution at the requested difficulty.
 * Holes are dug in symmetric pairs (cell and its mirror through the centre).
 * @returns {{ puzzle:number[], solution:number[], level:number, clues:number }}
 */
export function generatePuzzle(rng, difficultyId = 'medium', maxTries = 150) {
  const cfg = DIFFICULTIES[difficultyId] || DIFFICULTIES.medium;
  let best = null;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const solution = buildFullGrid(rng);
    const puzzle = solution.slice();
    const order = rng.shuffle(Array.from({ length: 41 }, (_, i) => i));
    let clues = 81;
    let level = 1;

    for (const i of order) {
      if (clues <= cfg.stopClues) break;
      const j = 80 - i;
      const keepI = puzzle[i], keepJ = puzzle[j];
      puzzle[i] = 0; puzzle[j] = 0;
      const removed = i === j ? 1 : 2;

      let ok = countSolutions(puzzle, 2) === 1;
      let g = null;
      if (ok) {
        g = gradePuzzle(puzzle);
        ok = g.level <= cfg.maxLevel;
      }
      if (ok) {
        clues -= removed;
        level = g.level;
      } else {
        puzzle[i] = keepI; puzzle[j] = keepJ;
      }
    }

    const result = { puzzle, solution, level, clues };
    if (level >= cfg.minLevel) return result;
    if (!best || level > best.level || (level === best.level && clues < best.clues)) best = result;
  }
  return best;
}
