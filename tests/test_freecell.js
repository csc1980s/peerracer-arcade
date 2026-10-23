// FreeCell hint regression: following the hint must never ping-pong a run
// between cascades, and every cascade-to-cascade hint must accomplish something.
import { FreeCellGame } from '../src/games/freecell.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL: ' + m); } };

const key = (g) => JSON.stringify([
  g.state.tableau.map(c => c.map(x => x.shortCode)),
  g.state.freecells.map(x => x && x.shortCode),
  g.state.foundations.map(f => f.length)
]);

let repeats = 0, games = 0, steps = 0, won = 0;
for (let seed = 1; seed <= 300; seed++) {
  const g = new FreeCellGame({ seed });
  const seen = new Set([key(g)]);
  games++;
  for (let i = 0; i < 400; i++) {
    const h = g.getTacticalHint();
    if (!h) break;
    const src = h.source.zone === 'tableau'
      ? { zone: 'tableau', index: h.source.index }
      : { zone: h.source.zone, index: h.source.index };
    if (!g.moveCards(src, h.target, h.count)) { ok(false, `seed ${seed}: hint illegal ${h.message}`); break; }
    steps++;
    const k = key(g);
    if (seen.has(k)) { repeats++; break; }
    seen.add(k);
    if (g.state.won) { won++; break; }
  }
}
ok(repeats === 0, `hint revisited a position in ${repeats} of ${games} games`);
console.log(`FreeCell hints: ${games} games, ${steps} hint moves, ${won} won, ${repeats} repeats`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
