/**
 * Keystone Drop (falling blocks) — Unit & Invariant Test Suite
 *
 * 1. Shapes: seven shapes, four cells each, four distinct rotations (O has one).
 * 2. Seeded supply: same seed, same order; every bag holds each shape once.
 * 3. Movement: walls stop sliding; rotation kicks off walls; floor stops drops.
 * 4. Gravity, lock delay and lock reset limits.
 * 5. Row clearing: 1-4 rows, stacking above, score and level.
 * 6. Hold: one swap per drop.
 * 7. Win at the goal rows; game over when the stack reaches the spawn.
 * 8. Perfect clear bonus.
 * 9. Save/resume gives the same future shapes.
 */

import {
  KeystoneDropGame, SHAPES, SHAPE_IDS, shapeCells, gravityMs, COLS, ROWS, HIDDEN,
  LOCK_DELAY_MS, MAX_LOCK_RESETS, LINE_SCORES, KEYSTONE_BONUS
} from '../src/games/keystone_drop.js';

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.log(`  ❌ ${name}`); }
}

const key = (cells) => cells.map(c => c.join(',')).sort().join(';');
const emptyRows = (g) => g.state.board.every(r => r.every(v => !v));

console.log('\n🧱 Keystone Drop — Test Suite\n');

console.log('1. Shapes');
{
  assert(SHAPE_IDS.length === 7, 'seven shapes');
  assert(SHAPE_IDS.every(id => shapeCells(id, 0).length === 4), 'every shape has four blocks');
  for (const id of SHAPE_IDS) {
    const rots = new Set([0, 1, 2, 3].map(r => key(shapeCells(id, r))));
    const expected = id === 'O' ? 1 : 4;
    assert(rots.size === expected, `${id}: ${expected} distinct orientation(s)`);
    assert(key(shapeCells(id, 4)) === key(shapeCells(id, 0)), `${id}: four turns return to the start`);
    const inBox = shapeCells(id, 1).every(([x, y]) => x >= 0 && y >= 0 && x < SHAPES[id].size && y < SHAPES[id].size);
    assert(inBox, `${id}: rotated cells stay inside the box`);
  }
}

console.log('\n2. Supply');
{
  const a = new KeystoneDropGame({ seed: 5 });
  const b = new KeystoneDropGame({ seed: 5 });
  const c = new KeystoneDropGame({ seed: 6 });
  assert(a.state.current.id === b.state.current.id && a.state.queue.join() === b.state.queue.join(), 'same seed gives the same shapes');
  assert(a.state.queue.join() !== c.state.queue.join(), 'different seeds differ');
  const seq = [a.state.current.id, ...a.state.queue.slice(0, 13)];
  const bags = [seq.slice(0, 7), seq.slice(7, 14)];
  assert(bags.every(bag => new Set(bag).size === 7), 'each bag of seven has every shape once');
  assert(a.previews().length === 3, 'three previews');
}

console.log('\n2b. Next shape and spawn');
{
  const g = new KeystoneDropGame({ seed: 77 });
  let allVisible = true, nextMatches = true;
  for (let i = 0; i < 30 && !g.state.over; i++) {
    if (!g.currentCells().every(([, y]) => y >= HIDDEN)) allVisible = false;
    const promised = g.previews()[0];
    g.move(i % 3 - 1);
    g.hardDrop();
    if (!g.state.over && g.state.current.id !== promised) nextMatches = false;
  }
  assert(allVisible, 'every new shape appears fully inside the visible well');
  assert(nextMatches, 'the first preview is always the next shape that arrives');
  const h = new KeystoneDropGame({ seed: 78 });
  const promised = h.previews()[0];
  h.holdPiece();
  assert(h.state.current.id === promised, 'holding an empty slot brings in the previewed shape');
}

console.log('\n3. Movement');
{
  const g = new KeystoneDropGame({ seed: 1 });
  for (let i = 0; i < 20; i++) g.move(-1);
  const minX = Math.min(...g.currentCells().map(c => c[0]));
  assert(minX === 0, 'sliding stops at the left wall');
  for (let i = 0; i < 20; i++) g.move(1);
  assert(Math.max(...g.currentCells().map(c => c[0])) === COLS - 1, 'sliding stops at the right wall');
  assert(!g.move(1), 'cannot slide further');

  const h = new KeystoneDropGame({ seed: 1 });
  h.state.current = { id: 'I', rot: 1, x: -2, y: 5 }; // vertical I hugging the left wall (x cell = 1 -> -1+... )
  const before = h.state.current.x;
  assert(h.rotate(1), 'rotation succeeds with a wall kick');
  assert(h.currentCells().every(([x]) => x >= 0 && x < COLS), 'kicked piece is inside the well');
  let drops = 0;
  while (h.softDrop()) drops++;
  assert(h.isGrounded() && Math.max(...h.currentCells().map(c => c[1])) === ROWS + HIDDEN - 1, 'soft drop ends on the floor');
  assert(h.state.score === drops, 'soft drop scores 1 per row');
}

console.log('\n4. Gravity and lock delay');
{
  const g = new KeystoneDropGame({ seed: 2 });
  const y0 = g.state.current.y;
  g.update(gravityMs(1));
  assert(g.state.current.y === y0 + 1, 'one gravity interval drops one row');
  assert(gravityMs(5) < gravityMs(1) && gravityMs(99) >= 60, 'gravity speeds up to a floor');
  while (!g.isGrounded()) g.state.current.y++;
  const moves0 = g.state.moves;
  g.update(LOCK_DELAY_MS - 50);
  assert(g.state.moves === moves0, 'no lock before the delay passes');
  const res = g.update(100);
  assert(res && res.locked && g.state.moves === moves0 + 1, 'locks after the delay');

  const r = new KeystoneDropGame({ seed: 3 });
  while (!r.isGrounded()) r.state.current.y++;
  for (let i = 0; i < MAX_LOCK_RESETS + 5; i++) { r.update(LOCK_DELAY_MS - 10); r.move(i % 2 ? 1 : -1); if (r.state.moves) break; }
  assert(r.state.moves >= 1, 'endless sliding cannot stall a piece forever');
}

console.log('\n5. Row clearing');
{
  for (const n of [1, 2, 3, 4]) {
    const g = new KeystoneDropGame({ seed: 10 + n });
    for (let r = 0; r < n; r++) {
      const y = ROWS + HIDDEN - 1 - r;
      for (let x = 0; x < COLS; x++) if (x !== 9) g.state.board[y][x] = 1;
    }
    g.state.board[ROWS + HIDDEN - 6][0] = 3; // a marker block that must fall by n rows
    g.state.current = { id: 'I', rot: 1, x: 7, y: 10 }; // vertical I: column x+2 = 9
    const res = g.hardDrop();
    assert(res.cleared === n, `${n} row(s) cleared`);
    assert(g.state.rows === n && g.state.score >= LINE_SCORES[n] * 1, `${n}: score includes the clear value`);
    assert(g.state.board[ROWS + HIDDEN - 6 + n][0] === 3, `${n}: blocks above fall down`);
  }
  const g = new KeystoneDropGame({ seed: 20 });
  g.state.rows = 9;
  for (let x = 0; x < COLS; x++) if (x !== 9) g.state.board[ROWS + HIDDEN - 1][x] = 1;
  g.state.board[ROWS + HIDDEN - 5][0] = 2;
  g.state.current = { id: 'I', rot: 1, x: 7, y: 10 };
  g.hardDrop();
  assert(g.state.level === 2, 'level rises every ten rows');
}

console.log('\n6. Hold');
{
  const g = new KeystoneDropGame({ seed: 30 });
  const first = g.state.current.id;
  const nextUp = g.state.queue[0];
  assert(g.holdPiece() && g.state.hold === first && g.state.current.id === nextUp, 'hold stores the piece and brings the next one');
  assert(!g.holdPiece(), 'only one hold per drop');
  g.hardDrop();
  const cur = g.state.current.id;
  assert(g.holdPiece() && g.state.current.id === first && g.state.hold === cur, 'next drop can swap with the held piece');
}

console.log('\n7. Win and game over');
{
  const g = new KeystoneDropGame({ seed: 40, goalRows: 1 });
  for (let x = 0; x < COLS; x++) if (x !== 9) g.state.board[ROWS + HIDDEN - 1][x] = 1;
  g.state.board[ROWS + HIDDEN - 5][0] = 2;
  g.state.current = { id: 'I', rot: 1, x: 7, y: 10 };
  const res = g.hardDrop();
  assert(res.won && g.state.won && !g.state.over, 'reaching the goal wins');
  assert(!g.move(1) && !g.hardDrop(), 'no input after the win');

  const o = new KeystoneDropGame({ seed: 41 });
  for (let y = HIDDEN; y < ROWS + HIDDEN; y++) for (let x = 0; x < COLS - 1; x++) o.state.board[y][x] = 1;
  o.state.current = { id: 'O', rot: 0, x: 4, y: 0 };
  const lockRes = o.hardDrop();
  assert(lockRes.over && o.state.over && !o.state.won, 'locking inside the spawn rows ends the run');
  const top = new KeystoneDropGame({ seed: 42 });
  for (let y = 0; y < ROWS + HIDDEN; y++) for (let x = 0; x < COLS; x++) top.state.board[y][x] = 1;
  top.state.current = null;
  top._spawn();
  assert(top.state.over, 'a blocked spawn ends the game');
  assert(!top.move(1) && top.update(500) === null, 'no action after game over');
}

console.log('\n8. Perfect clear');
{
  const g = new KeystoneDropGame({ seed: 50 });
  for (let r = 0; r < 4; r++) for (let x = 0; x < COLS; x++) if (x !== 9) g.state.board[ROWS + HIDDEN - 1 - r][x] = 1;
  g.state.current = { id: 'I', rot: 1, x: 7, y: 10 };
  const res = g.hardDrop();
  assert(res.cleared === 4 && res.keystone && emptyRows(g), 'clearing everything counts as a keystone');
  assert(g.state.score >= LINE_SCORES[4] + KEYSTONE_BONUS, 'keystone bonus is added');
}

console.log('\n9. Save and resume');
{
  const g = new KeystoneDropGame({ seed: 60 });
  for (let i = 0; i < 6; i++) { g.move(i % 2 ? 1 : -1); g.hardDrop(); if (g.state.over) break; }
  const saved = JSON.parse(JSON.stringify(g.serialize()));
  const r = KeystoneDropGame.fromState(saved);
  assert(r.state.score === g.state.score && r.state.moves === g.state.moves, 'score and counts survive');
  assert(JSON.stringify(r.state.board) === JSON.stringify(g.state.board), 'board survives');
  const futureA = [], futureB = [];
  for (let i = 0; i < 25; i++) { futureA.push(g.state.current.id); futureB.push(r.state.current.id); g.hardDrop(); r.hardDrop(); if (g.state.over || r.state.over) break; }
  assert(futureA.join() === futureB.join(), 'resumed game deals the same upcoming shapes');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
