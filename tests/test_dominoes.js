/**
 * Bone Yard (Dominoes) — Unit & Invariant Test Suite
 *
 * 1. Sets: double-six has 28 tiles, double-nine 55; no duplicates.
 * 2. Deals: right hand sizes, every tile accounted for, deterministic by seed.
 * 3. Straight games: opening tile, matching, block passes, draw rules.
 * 4. All Fives: scoring on multiples of five, doubles counting both halves.
 * 5. Mexican Train: own/Mexican/open trains, markers, double must be covered.
 * 6. Chickenfoot: three branches first, double must be covered.
 * 7. Full simulated matches for every variant and player count finish with
 *    all tiles conserved and legal play only.
 * 8. Save/resume gives the same continuation.
 */

import { DominoGame, VARIANT_IDS, buildSet } from '../src/games/dominoes.js';

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.log(`  ❌ ${name}`); }
}

function countTiles(g) {
  const s = g.state;
  let n = s.stock.length + s.players.reduce((t, p) => t + p.hand.length, 0);
  n += s.ends.reduce((t, e) => t + e.tiles.length, 0);
  if (s.center) n += 1;
  return n;
}

console.log('\n🁣 Bone Yard — Dominoes Test Suite\n');

console.log('1-2. Sets and deals');
{
  assert(buildSet(6).length === 28 && buildSet(9).length === 55, 'double-six has 28 tiles, double-nine has 55');
  for (const v of VARIANT_IDS) {
    for (const opp of [1, 2, 3]) {
      const g = new DominoGame({ seed: 100 + opp, variant: v, opponents: opp });
      const all = new Set();
      g.state.players.forEach(p => p.hand.forEach(id => all.add(id)));
      g.state.stock.forEach(id => all.add(id));
      g.state.ends.forEach(e => e.tiles.forEach(t => all.add(t.id)));
      all.add(g.state.center.id);
      assert(all.size === countTiles(g) && all.size === buildSet(g.state.maxPip).length, `${v} / ${opp + 1} players: every tile in exactly one place`);
    }
  }
  const a = new DominoGame({ seed: 7, variant: 'draw', opponents: 2 });
  const b = new DominoGame({ seed: 7, variant: 'draw', opponents: 2 });
  assert(JSON.stringify(a.state.players) === JSON.stringify(b.state.players), 'same seed gives the same deal');
  const sizes = [7, 5, 5];
  assert(a.state.players.every(p => p.hand.length >= sizes[1] - 1), 'hands are dealt');
}

console.log('\n3. Straight games');
{
  const g = new DominoGame({ seed: 3, variant: 'block', opponents: 1 });
  const s = g.state;
  const opener = s.lastPlay.player;
  assert(s.turn === (opener + 1) % 2, 'turn passes after the opening tile');
  assert(g.legalMoves().every(m => {
    const [a, b] = g.tiles[m.tile];
    const e = s.ends.find(x => x.id === m.end);
    return a === e.value || b === e.value;
  }), 'every legal move matches an end');
  // Force a pass in the block game.
  const blk = new DominoGame({ seed: 4, variant: 'block', opponents: 1 });
  const p = blk.state.turn;
  blk.state.players[p].hand = blk.state.players[p].hand.filter(id => !blk.tiles[id].some(v => blk.state.ends.some(e => e.value === v)));
  if (!blk.state.players[p].hand.length) blk.state.players[p].hand = [0];
  const need = blk.turnNeeds(p);
  assert(need === 'pass' || need === 'play', 'block game never offers a draw');
  assert(blk.turnNeeds(p) !== 'draw', 'no draw in block');

  const d = new DominoGame({ seed: 5, variant: 'draw', opponents: 1 });
  const pd = d.state.turn;
  const stockBefore = d.state.stock.length;
  d.state.players[pd].hand = d.state.players[pd].hand.filter(id => !d.tiles[id].some(v => d.state.ends.some(e => e.value === v)));
  if (d.state.players[pd].hand.length === 0) d.state.players[pd].hand = [d.state.stock.pop()];
  if (d.turnNeeds(pd) === 'draw') {
    assert(d.draw().ok && d.state.stock.length === stockBefore - 1, 'draw game takes one tile from the boneyard');
  } else assert(true, 'draw game: player had a move');
  assert(!d.pass().ok || d.state.stock.length === 0, 'cannot pass while the boneyard has tiles and no move');
}

console.log('\n4. All Fives');
{
  const g = new DominoGame({ seed: 8, variant: 'allfives', opponents: 1 });
  const s = g.state;
  // Build a controlled layout: centre 5-5 double alone counts 10.
  s.center = { a: 5, b: 5, double: true, id: 0 };
  s.ends.forEach(e => { e.tiles = []; e.value = 5; });
  assert(g.openSum() === 10, 'a lone double counts both halves (5+5)');
  s.ends[0].tiles = [{ a: 5, b: 3, double: false, id: 1 }]; s.ends[0].value = 3;
  assert(g.openSum() === 3 + 10, 'double centre still counts double on the open side');
  s.ends[1].tiles = [{ a: 5, b: 2, double: false, id: 2 }]; s.ends[1].value = 2;
  assert(g.openSum() === 5, 'two plain ends: 3 + 2');
  s.ends[1].tiles.push({ a: 2, b: 2, double: true, id: 3 }); 
  assert(g.openSum() === 3 + 4, 'a double at an end counts twice');
  // Score on a real play
  const sc = new DominoGame({ seed: 9, variant: 'allfives', opponents: 1 });
  const t = sc.state.turn;
  const before = sc.state.players[t].score;
  const mv = sc.legalMoves(t);
  if (mv.length) {
    const sumAfter = (() => {
      const m = mv[0]; const [a, b] = sc.tiles[m.tile]; const e = sc.state.ends.find(x => x.id === m.end);
      const outer = a === e.value ? b : a;
      let sum = 0;
      for (const en of sc.state.ends) { const isT = en.id === m.end; const v = isT ? outer : en.value; const ld = isT ? a === b : (en.tiles.length ? en.tiles[en.tiles.length - 1].double : sc.state.center.double); sum += ld ? v * 2 : v; }
      return sum;
    })();
    const res = sc.play(mv[0].tile, mv[0].end);
    assert(res.points === (sumAfter > 0 && sumAfter % 5 === 0 ? sumAfter : 0), 'points equal the open sum when it is a multiple of five');
    assert(sc.state.players[t].score === before + res.points, 'score is added to the player');
  }
}

console.log('\n5. Mexican Train');
{
  const g = new DominoGame({ seed: 11, variant: 'mexican', opponents: 2 });
  const s = g.state;
  assert(s.ends.length === 4 && s.ends.every(e => e.value === s.center.a), 'one train per player plus the Mexican train, all at the hub value');
  const me = s.turn;
  const allowed = new Set(g.legalMoves(me).map(m => m.end));
  assert([...allowed].every(id => id === `T${me}` || id === 'M'), 'at the start you may only use your train or the Mexican train');
  s.ends.find(e => e.owner === (me + 1) % 3).marker = true;
  s.players[me].hand = [g.tiles.findIndex(([a, b]) => a === s.center.a && b === 0 && a !== 0 || false)].filter(i => i >= 0);
  if (!s.players[me].hand.length) s.players[me].hand = [g.tiles.findIndex(([a, b]) => b === s.center.a || a === s.center.a)];
  const ends2 = new Set(g.legalMoves(me).map(m => m.end));
  assert(ends2.has(`T${(me + 1) % 3}`), 'a marked train can be played on by others');

  // Double must be covered by the same player.
  const d = new DominoGame({ seed: 12, variant: 'mexican', opponents: 1 });
  const p = d.state.turn;
  const e = d.state.center.a;
  const dbl = d.tiles.findIndex(([a, b]) => a === b && a !== e && d.state.players.every(pl => !pl.hand.includes(d.tiles.findIndex(([x, y]) => x === a && y === b))));
  // Give the player a double that matches the hub: use the hub value's neighbour double via a controlled end value.
  d.state.ends.find(x => x.id === `T${p}`).value = d.tiles[dbl][0];
  d.state.players[p].hand = [dbl, d.tiles.findIndex(([a, b]) => (a === d.tiles[dbl][0] && b !== a) || (b === d.tiles[dbl][0] && a !== b))];
  const r = d.play(dbl, `T${p}`);
  assert(r.ok && d.state.turn === p && d.state.openDouble === `T${p}`, 'after a double the same player moves again and the double is open');
  const only = new Set(d.legalMoves(p).map(m => m.end));
  assert([...only].every(id => id === `T${p}`), 'only the open double can be played on');

  // Passing marks your train.
  const m = new DominoGame({ seed: 13, variant: 'mexican', opponents: 1 });
  const q = m.state.turn;
  m.state.players[q].hand = [m.tiles.length - 1 === m.state.center.id ? 0 : m.tiles.length - 1];
  m.state.players[q].hand = m.state.players[q].hand.filter(id => !m.tiles[id].includes(m.state.center.a));
  if (!m.state.players[q].hand.length) m.state.players[q].hand = [m.tiles.findIndex(([a, b]) => a !== m.state.center.a && b !== m.state.center.a)];
  m.state.stock = [];
  assert(m.turnNeeds(q) === 'pass', 'no move and no boneyard means pass');
  m.pass();
  assert(m.state.ends.find(e => e.owner === q).marker, 'passing marks your train open');
}

console.log('\n6. Chickenfoot');
{
  const g = new DominoGame({ seed: 21, variant: 'chickenfoot', opponents: 1 });
  const s = g.state;
  assert(s.ends.length === 3 && s.ends.every(e => e.value === s.center.a), 'three branches at the spinner value');
  const p = s.turn;
  const mv = g.legalMoves(p);
  if (mv.length) {
    const first = mv[0];
    g.play(first.tile, first.end);
    const used = s.ends.find(e => e.id === first.end);
    if (!s.openDouble) {
      const next = g.legalMoves(s.turn);
      assert(next.every(m => s.ends.find(e => e.id === m.end).tiles.length === 0), 'all three branches must be started first');
    } else assert(s.openDouble === first.end, 'a double on a branch must be covered');
  }
}

console.log('\n7. Simulated matches');
{
  let games = 0, bad = 0, steps = 0;
  for (const v of VARIANT_IDS) {
    for (const opp of [1, 2, 3]) {
      for (let k = 0; k < 6; k++) {
        const g = new DominoGame({ seed: 1000 * opp + k * 31 + v.length, variant: v, opponents: opp, rounds: 3 });
        let guard = 0;
        let ok = true;
        while (!g.state.won && !g.state.over && guard++ < 6000) {
          if (g.state.phase === 'roundEnd') { g.nextRound(); continue; }
          const before = countTiles(g);
          const moves = g.legalMoves().length;
          const res = g.autoStep();
          steps++;
          if (!res || res.ok === false) { ok = false; break; }
          if (countTiles(g) !== buildSet(g.state.maxPip).length) { ok = false; break; }
          if (moves === 0 && res.action === 'play') { ok = false; break; }
        }
        if (!ok || guard >= 6000 || !(g.state.won || g.state.over)) bad++;
        games++;
      }
    }
  }
  assert(bad === 0, `all ${games} simulated matches finish cleanly (${steps} actions)`);
}

console.log('\n8. Round end and scoring');
{
  const g = new DominoGame({ seed: 31, variant: 'block', opponents: 1 });
  const s = g.state;
  const w = s.turn;
  const l = (w + 1) % 2;
  // Give the player to move a single playable tile and the other a known hand.
  const mv = g.legalMoves(w);
  if (mv.length) {
    s.players[w].hand = [mv[0].tile];
    s.players[l].hand = [g.tiles.findIndex(([a, b]) => a === 6 && b === 6), g.tiles.findIndex(([a, b]) => a === 5 && b === 5)].filter(i => i >= 0 && !s.players[w].hand.includes(i));
    const expected = s.players[l].hand.reduce((t, id) => t + g.pipsOf(id), 0);
    const before = s.players[w].score;
    g.play(mv[0].tile, mv[0].end);
    assert(s.phase === 'roundEnd' || s.phase === 'matchEnd', 'going out ends the round');
    assert(s.players[w].score === before + expected, 'winner scores the pips left in the other hands');
  }
  const t = new DominoGame({ seed: 32, variant: 'mexican', opponents: 1, rounds: 2 });
  let guard = 0;
  while (t.state.phase !== 'matchEnd' && guard++ < 5000) { if (t.state.phase === 'roundEnd') t.nextRound(); else t.autoStep(); }
  assert(t.state.phase === 'matchEnd' && t.state.round === 2, 'train game ends after the chosen number of rounds');
  assert(t.state.won === (t.state.players[0].score <= t.state.players[1].score), 'lowest total pips wins a train match (human wins ties)');
}

console.log('\n9. Save and resume');
{
  const g = new DominoGame({ seed: 41, variant: 'mexican', opponents: 2 });
  for (let i = 0; i < 12; i++) if (g.state.phase === 'play') g.autoStep();
  const saved = JSON.parse(JSON.stringify(g.serialize()));
  const r = DominoGame.fromState(saved);
  assert(JSON.stringify(r.state) === JSON.stringify(g.state), 'state survives a round trip');
  for (let i = 0; i < 20; i++) { if (g.state.phase === 'play') { g.autoStep(); r.autoStep(); } }
  assert(JSON.stringify(r.state.ends) === JSON.stringify(g.state.ends), 'resumed game plays out identically');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
