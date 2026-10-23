/**
 * Jade Pavilion (Mahjong tile matching) — Unit & Invariant Test Suite
 *
 * 1. Every layout has an even tile count and no overlapping tiles.
 * 2. Tile counts: Classic Turtle uses the full 144-tile set.
 * 3. Same seed + layout gives the same deal; different seeds differ.
 * 4. Every face family appears an even number of times.
 * 5. Free-tile rule: covered tiles and tiles boxed in on both sides are blocked.
 * 6. Non-matching or blocked pairs are rejected.
 * 7. Every deal is solvable: a greedy solver guided by hints + shuffles clears it.
 * 8. Shuffle keeps the same tile multiset and stays solvable.
 * 9. Undo restores matches, shuffles and score.
 * 10. Save/resume round trip through JSON.
 */

import { MahjongGame } from '../src/games/mahjong.js';
import { MAHJONG_LAYOUTS, getLayoutPositions } from '../src/core/mahjong/layouts.js';
import { BoardGeometry, findRemovalOrder } from '../src/core/mahjong/board.js';
import { matchKey } from '../src/core/mahjong/tiles.js';
import { SplitMix64 } from '../src/core/prng.js';

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

const EXPECTED_COUNTS = { lantern: 56, twin_peaks: 72, pagoda: 106, courtyard: 112, turtle: 144 };

console.log('\n🀄 Jade Pavilion — Mahjong Test Suite\n');

console.log('1-2. Layout geometry');
for (const id of Object.keys(MAHJONG_LAYOUTS)) {
  const pos = getLayoutPositions(id);
  const geo = new BoardGeometry(pos);
  assert(pos.length % 2 === 0, `${id}: even tile count (${pos.length})`);
  assert(pos.length === EXPECTED_COUNTS[id], `${id}: expected ${EXPECTED_COUNTS[id]} tiles`);
  assert(geo.findOverlaps().length === 0, `${id}: no overlapping tiles`);
  const floating = pos.filter((p, i) => p.z > 0 && !pos.some((q, j) => q.z === p.z - 1 && geo.above[j].includes(i)));
  assert(floating.length === 0, `${id}: every raised tile rests on a tile below`);
}

console.log('\n3-4. Deterministic deals');
{
  const a = new MahjongGame({ seed: 12345, layoutId: 'turtle' });
  const b = new MahjongGame({ seed: 12345, layoutId: 'turtle' });
  const c = new MahjongGame({ seed: 54321, layoutId: 'turtle' });
  const facesOf = g => g.state.tiles.map(t => t.face).join(',');
  assert(facesOf(a) === facesOf(b), 'same seed gives the same deal');
  assert(facesOf(a) !== facesOf(c), 'different seeds give different deals');
  const counts = {};
  for (const t of a.state.tiles) counts[t.face] = (counts[t.face] || 0) + 1;
  assert(Object.keys(counts).length === 42, 'turtle uses all 42 distinct faces');
  assert(Object.entries(counts).every(([f, n]) => f.startsWith('flower') || f.startsWith('season') ? n === 1 : n === 4),
    'turtle: four of each regular face, one of each bonus tile');
  for (const id of Object.keys(MAHJONG_LAYOUTS)) {
    const g = new MahjongGame({ seed: 777, layoutId: id });
    const fam = {};
    for (const t of g.state.tiles) fam[matchKey(t.face)] = (fam[matchKey(t.face)] || 0) + 1;
    assert(Object.values(fam).every(n => n % 2 === 0), `${id}: every match family has an even count`);
  }
}

console.log('\n5-6. Free-tile rule and match validation');
{
  const g = new MahjongGame({ seed: 1, layoutId: 'lantern' });
  const t = g.state.tiles;
  const top = t.filter(x => x.z === 2);
  const covered = t.find(x => x.z === 1 && x.x === 4 && x.y === 4);
  const middleGround = t.find(x => x.z === 0 && x.x === 4 && x.y === 0); // ground row 0, col 2: boxed in left+right
  const corner = t.find(x => x.z === 0 && x.x === 0 && x.y === 0);
  assert(top.every(x => g.isFree(x.id)), 'top-layer tiles with an open side are free');
  assert(covered && !g.isFree(covered.id), 'a covered tile is blocked');
  assert(middleGround && !g.isFree(middleGround.id), 'a tile with both sides blocked is blocked');
  assert(corner && g.isFree(corner.id), 'an end tile with an open side is free');

  const free = g.getFreeTileIds();
  const mismatched = free.flatMap(a => free.map(b => [a, b])).find(([a, b]) => a !== b && matchKey(t[a].face) !== matchKey(t[b].face));
  if (mismatched) assert(!g.matchTiles(...mismatched).ok, 'non-matching free tiles are rejected');
  const blockedSame = t.find(x => !g.isFree(x.id) && t.some(y => y.id !== x.id && g.isFree(y.id) && matchKey(y.face) === matchKey(x.face)));
  if (blockedSame) {
    const partner = t.find(y => y.id !== blockedSame.id && g.isFree(y.id) && matchKey(y.face) === matchKey(blockedSame.face));
    assert(!g.matchTiles(blockedSame.id, partner.id).ok, 'a blocked tile cannot be matched');
  }
  assert(!g.matchTiles(free[0], free[0]).ok, 'a tile cannot match itself');
}

console.log('\n7. Every deal can be cleared');
{
  // The deal's construction order is a winning line; check that replaying it
  // works by playing a fresh game and following findRemovalOrder's guarantee
  // through hints, shuffling only when the hint asks for it.
  let cleared = 0;
  let shuffles = 0;
  const runs = 60;
  for (let s = 0; s < runs; s++) {
    const layoutId = Object.keys(MAHJONG_LAYOUTS)[s % 5];
    const g = new MahjongGame({ seed: 1000 + s, layoutId });
    let guard = 0;
    while (!g.state.won && guard++ < 400) {
      const hint = g.getTacticalHint();
      if (hint.action === 'MATCH') g.matchTiles(...hint.tiles);
      else { g.shuffleRemaining(); shuffles++; }
    }
    if (g.state.won) cleared++;
  }
  assert(cleared === runs, `hint-guided play clears all ${runs} deals (${cleared}/${runs}, ${shuffles} shuffles used)`);

  // Strong check: replaying the construction order wins without any shuffle.
  let replayWins = 0;
  for (let s = 0; s < 40; s++) {
    const layoutId = Object.keys(MAHJONG_LAYOUTS)[s % 5];
    const geo = new BoardGeometry(getLayoutPositions(layoutId));
    const rng = new SplitMix64(s + 99);
    const order = findRemovalOrder(geo, geo.positions.map((_, i) => i), rng);
    const g = new MahjongGame({ seed: 5, layoutId });
    // Paint matching faces along the order, as the dealer does.
    order.forEach(([a, b], k) => { g.state.tiles[a].face = `dot-${(k % 9) + 1}`; g.state.tiles[b].face = `dot-${(k % 9) + 1}`; });
    let ok = true;
    for (const [a, b] of order) if (!g.matchTiles(a, b).ok) { ok = false; break; }
    if (ok && g.state.won) replayWins++;
  }
  assert(replayWins === 40, 'replaying a dealer removal order always wins (40/40)');
}

console.log('\n7b. Hints never walk into a dead stack');
{
  // Two same-family tiles stacked on each other can never be cleared.
  // Hint-guided play must finish every deal without hitting that shape.
  let impossible = 0;
  for (let s = 0; s < 120; s++) {
    const g = new MahjongGame({ seed: 5000 + s, layoutId: Object.keys(MAHJONG_LAYOUTS)[s % 5] });
    let guard = 0;
    while (!g.state.won && guard++ < 400) {
      const h = g.getTacticalHint();
      if (h.action === 'MATCH') g.matchTiles(...h.tiles);
      else if (!g.shuffleRemaining()) { impossible++; break; }
    }
  }
  assert(impossible === 0, `hint-guided play never reaches an unshufflable position (${impossible}/120)`);
  const g = new MahjongGame({ seed: 3, layoutId: 'lantern' });
  for (const t of g.state.tiles) t.removed = true;
  const top = g.state.tiles.find(t => t.z === 2);
  const below = g.state.tiles.find(t => t.z === 1 && g.geometry.above[t.id].includes(top.id));
  top.removed = false; below.removed = false;
  assert(!g.canShuffleHelp() && !g.shuffleRemaining(), 'a two-tile stack is reported as not shufflable');
}

console.log('\n8. Shuffle');
{
  const g = new MahjongGame({ seed: 4242, layoutId: 'turtle' });
  for (let i = 0; i < 10; i++) {
    const h = g.getTacticalHint();
    if (h.action === 'MATCH') g.matchTiles(...h.tiles);
  }
  const before = g.getRemainingTiles().map(t => t.face).sort().join(',');
  const scoreBefore = g.state.score;
  assert(g.shuffleRemaining(), 'shuffle succeeds mid-game');
  const after = g.getRemainingTiles().map(t => t.face).sort().join(',');
  assert(before === after, 'shuffle keeps exactly the same tiles');
  assert(g.state.score === Math.max(0, scoreBefore - 25), 'shuffle costs 25 points');
  assert(g.hasMoves(), 'board has a move after shuffling');
}

console.log('\n9. Undo');
{
  const g = new MahjongGame({ seed: 9, layoutId: 'pagoda' });
  const h = g.getTacticalHint();
  const facesBefore = g.state.tiles.map(t => t.face).join(',');
  g.matchTiles(...h.tiles, 1000);
  const afterMatch = g.state.tiles.map(t => t.face).join(',');
  g.shuffleRemaining();
  assert(g.undo(), 'undo a shuffle');
  assert(g.state.tiles.map(t => t.face).join(',') === afterMatch, 'shuffle undo restores faces');
  assert(g.undo(), 'undo a match');
  assert(g.state.tiles.every(t => !t.removed) && g.state.score === 0 && g.state.moves === 0, 'match undo restores tiles, score and moves');
  assert(g.state.tiles.map(t => t.face).join(',') === facesBefore, 'board is back to the deal');
  assert(!g.undo(), 'nothing left to undo');
}

console.log('\n10. Combo scoring and save/resume');
{
  const g = new MahjongGame({ seed: 31, layoutId: 'lantern' });
  const h1 = g.getTacticalHint(); const r1 = g.matchTiles(...h1.tiles, 10000);
  const h2 = g.getTacticalHint(); const r2 = g.matchTiles(...h2.tiles, 12000);
  const h3 = g.getTacticalHint(); const r3 = g.matchTiles(...h3.tiles, 30000);
  assert(r1.combo === 0 && r2.combo === 1 && r3.combo === 0, 'quick matches build a combo, slow ones reset it');
  assert(r2.points % 10 === 5, 'a combo adds 5 bonus points');

  const saved = JSON.parse(JSON.stringify(g.state));
  const restored = MahjongGame.fromState(saved);
  assert(restored.state.tiles.filter(t => t.removed).length === 6, 'resume keeps removed tiles');
  assert(restored.state.score === g.state.score && restored.dealCode === g.dealCode, 'resume keeps score and deal code');
  assert(restored.undo() && restored.state.tiles.filter(t => t.removed).length === 4, 'undo works after resume');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
