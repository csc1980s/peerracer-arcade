/**
 * Ninefold (Sudoku) — Unit & Invariant Test Suite
 *
 * 1. Full grids are valid; solution counter detects 0, 1 and many solutions.
 * 2. Every generated puzzle has exactly one solution that matches the stored one.
 * 3. Difficulty grading lands in the intended technique tier.
 * 4. Same seed gives the same puzzle; daily puzzles are stable per date.
 * 5. Givens are locked; correct and wrong placements score as intended.
 * 6. Notes toggle and are tidied when a digit is placed.
 * 7. Undo restores values, notes and score.
 * 8. Hints: fix wrong entries first, explain singles, and hint-only play wins.
 * 9. Save/resume round trip through JSON.
 */

import { SudokuGame, dailySeed } from '../src/games/sudoku.js';
import { SplitMix64 } from '../src/core/prng.js';
import {
  buildFullGrid, countSolutions, generatePuzzle, gradePuzzle, findConflicts, UNITS, DIFFICULTIES, bit
} from '../src/core/sudoku/engine.js';

let passed = 0;
let failed = 0;

function assert(cond, name) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

const validGrid = (g) => g.every(v => v >= 1 && v <= 9) &&
  UNITS.every(u => new Set(u.map(i => g[i])).size === 9);

console.log('\n🔢 Ninefold — Sudoku Test Suite\n');

console.log('1. Grids and solution counting');
{
  const g = buildFullGrid(new SplitMix64(1));
  assert(validGrid(g), 'full grid is a valid solution');
  assert(countSolutions(g, 2) === 1, 'a full grid has exactly one solution');
  const empty = new Array(81).fill(0);
  assert(countSolutions(empty, 2) === 2, 'an empty grid has many solutions');
  const broken = g.slice(); broken[1] = broken[0];
  assert(countSolutions(broken, 2) === 0, 'a grid with a clash has no solution');
}

console.log('\n2-3. Generated puzzles');
for (const d of Object.keys(DIFFICULTIES)) {
  let unique = 0, matches = 0, inTier = 0, cluesOk = 0;
  const N = 12;
  for (let s = 0; s < N; s++) {
    const { puzzle, solution, level, clues } = generatePuzzle(new SplitMix64(900 + s), d);
    const out = new Array(81).fill(0);
    if (countSolutions(puzzle, 2, out) === 1) unique++;
    if (out.every((v, i) => v === solution[i]) && validGrid(solution)) matches++;
    const cfg = DIFFICULTIES[d];
    if (level >= cfg.minLevel && level <= cfg.maxLevel && gradePuzzle(puzzle).level === level) inTier++;
    if (clues === puzzle.filter(v => v).length && puzzle.every((v, i) => !v || v === solution[i])) cluesOk++;
  }
  assert(unique === N, `${d}: every puzzle has exactly one solution (${unique}/${N})`);
  assert(matches === N, `${d}: stored solution is the real solution`);
  assert(inTier >= N - 1, `${d}: graded in its technique tier (${inTier}/${N})`);
  assert(cluesOk === N, `${d}: clue count and givens are consistent`);
}

console.log('\n4. Seeds and daily puzzles');
{
  const a = new SudokuGame({ seed: 42, difficulty: 'hard' });
  const b = new SudokuGame({ seed: 42, difficulty: 'hard' });
  const c = new SudokuGame({ seed: 43, difficulty: 'hard' });
  assert(a.state.puzzle.join('') === b.state.puzzle.join(''), 'same seed gives the same puzzle');
  assert(a.state.puzzle.join('') !== c.state.puzzle.join(''), 'different seeds differ');
  const d1 = new SudokuGame({ daily: '2026-10-22', difficulty: 'easy' });
  const d2 = new SudokuGame({ daily: '2026-10-22', difficulty: 'easy', seed: 999 });
  const d3 = new SudokuGame({ daily: '2026-10-23', difficulty: 'easy' });
  assert(d1.state.puzzle.join('') === d2.state.puzzle.join(''), 'daily puzzle ignores the random seed');
  assert(d1.state.puzzle.join('') !== d3.state.puzzle.join(''), 'each date gets a new daily puzzle');
  assert(dailySeed('2026-10-22', 'easy') !== dailySeed('2026-10-22', 'expert'), 'each difficulty has its own daily');
}

console.log('\n5. Placing digits');
{
  const g = new SudokuGame({ seed: 7, difficulty: 'medium' });
  const s = g.state;
  const given = s.puzzle.findIndex(v => v);
  assert(!g.setValue(given, (s.puzzle[given] % 9) + 1).ok, 'givens cannot be changed');
  const empty = s.values.findIndex(v => !v);
  const wrongDigit = (s.solution[empty] % 9) + 1;
  const r1 = g.setValue(empty, wrongDigit);
  assert(r1.ok && !r1.correct && s.mistakes === 1 && g.isWrong(empty), 'a wrong digit counts as a mistake');
  assert(s.score === 0, 'score never drops below zero');
  const r2 = g.setValue(empty, s.solution[empty]);
  assert(r2.ok && r2.correct && s.score === DIFFICULTIES.medium.placePoints, 'a correct digit earns placement points');
  g.setValue(empty, 0);
  g.setValue(empty, s.solution[empty]);
  assert(s.score === DIFFICULTIES.medium.placePoints, 'a cell only earns points once');
}

console.log('\n6. Notes');
{
  const g = new SudokuGame({ seed: 11, difficulty: 'easy' });
  const s = g.state;
  const empties = s.values.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  const target = empties[0];
  const peer = empties.find(i => i !== target && (Math.floor(i / 9) === Math.floor(target / 9)));
  const d = s.solution[target];
  g.toggleNote(peer, d);
  g.toggleNote(peer, (d % 9) + 1);
  assert((s.notes[peer] & bit(d)) !== 0, 'a note can be added');
  g.setValue(target, d);
  assert((s.notes[peer] & bit(d)) === 0 && (s.notes[peer] & bit((d % 9) + 1)) !== 0, 'placing a digit removes it from notes in the same row');
  g.fillAllNotes();
  assert(empties.slice(1).every(i => s.values[i] || s.notes[i]), 'auto-notes fills every empty cell');
}

console.log('\n7. Undo');
{
  const g = new SudokuGame({ seed: 5, difficulty: 'easy' });
  const s = g.state;
  const start = JSON.stringify({ v: s.values, n: s.notes, sc: s.score });
  const empty = s.values.findIndex(v => !v);
  g.toggleNote(empty, 3);
  g.setValue(empty, s.solution[empty]);
  g.fillAllNotes();
  assert(g.undo() && g.undo() && g.undo(), 'three undos succeed');
  assert(JSON.stringify({ v: s.values, n: s.notes, sc: s.score }) === start, 'board, notes and score are restored');
  assert(!g.undo(), 'nothing left to undo');
}

console.log('\n8. Hints');
{
  const g = new SudokuGame({ seed: 21, difficulty: 'medium' });
  const s = g.state;
  const empty = s.values.findIndex(v => !v);
  g.setValue(empty, (s.solution[empty] % 9) + 1);
  const h1 = g.getTacticalHint();
  assert(h1.action === 'FIX' && h1.cell === empty, 'a wrong entry is pointed out first');
  g.applyHint(h1);
  const h2 = g.getTacticalHint();
  assert(h2.action === 'PLACE' && h2.digit === s.solution[h2.cell], 'single hint names the right digit');

  let wins = 0, reveals = 0;
  for (const d of Object.keys(DIFFICULTIES)) {
    for (let k = 0; k < 4; k++) {
      const game = new SudokuGame({ seed: 300 + k, difficulty: d });
      let guard = 0;
      while (!game.state.won && guard++ < 100) {
        const h = game.getTacticalHint();
        if (h.action === 'REVEAL') reveals++;
        game.applyHint(h);
      }
      if (game.state.won) wins++;
    }
  }
  assert(wins === 16, `hint-only play solves every puzzle (${wins}/16, ${reveals} reveals)`);
  const hg = new SudokuGame({ seed: 300, difficulty: 'easy' });
  while (!hg.state.won) hg.applyHint();
  assert(hg.state.score === Math.max(0, DIFFICULTIES.easy.winBonus - (hg.state.hints - 1) * 50), 'hinted cells earn no placement points');
  assert(findConflicts(hg.state.values).size === 0, 'finished grid has no conflicts');
}

console.log('\n9. Save and resume');
{
  const g = new SudokuGame({ seed: 77, difficulty: 'hard' });
  const s = g.state;
  const empty = s.values.findIndex(v => !v);
  g.setValue(empty, s.solution[empty]);
  g.toggleNote(s.values.findIndex(v => !v), 4);
  const restored = SudokuGame.fromState(JSON.parse(JSON.stringify(s)));
  assert(restored.state.values.join() === s.values.join() && restored.state.notes.join() === s.notes.join(), 'values and notes survive');
  assert(restored.dealCode === g.dealCode && restored.state.score === s.score, 'deal code and score survive');
  assert(restored.undo() && restored.undo() && restored.state.values.join() === s.puzzle.join(), 'undo works after resume');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
