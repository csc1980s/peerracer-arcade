// Hint / Teacher checks: Spider and TriPeaks hints never loop, TriPeaks hints
// clear boards well, and Blackjack advice follows basic strategy.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { SpiderGame } = await import('../src/games/spider.js');
const { TriPeaksGame } = await import('../src/games/tripeaks.js');
const { BlackjackGame, HAND_STATUS } = await import('../src/games/blackjack.js');
const { Card } = await import('../src/core/card.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL: ' + m); } };

// --- Spider: following hints never revisits a position through a tableau move
const skey = g => JSON.stringify(g.state.tableau.map(c => c.map(x => x.shortCode + (x.faceUp ? '' : '#'))));
let spiderLoops = 0;
for (let seed = 1; seed <= 100; seed++) {
  const g = new SpiderGame({ seed });
  const seen = new Set([skey(g)]);
  for (let i = 0; i < 400; i++) {
    const h = g.getTacticalHint();
    if (!h) break;
    if (h.action === 'DEAL_ROW') { g.dealRow(); seen.clear(); seen.add(skey(g)); continue; }
    if (!g.moveCards(h.source, h.target, h.count)) { ok(false, `spider seed ${seed}: illegal hint`); break; }
    const k = skey(g);
    if (seen.has(k)) { spiderLoops++; break; }
    seen.add(k);
    if (g.state.won) break;
  }
}
ok(spiderLoops === 0, `spider hints looped in ${spiderLoops} of 100 games`);

// --- TriPeaks: lookahead hints should clear the board in a healthy share of deals
let won = 0;
for (let seed = 1; seed <= 200; seed++) {
  const g = new TriPeaksGame({ seed });
  for (let i = 0; i < 200; i++) {
    const h = g.getTacticalHint();
    if (!h || h.action === 'NO_MOVES') break;
    if (h.action === 'PLAY_TABLEAU') { if (!g.playTableauCard(h.index)) { ok(false, 'tripeaks illegal hint'); break; } }
    else g.drawFromStock();
    if (g.state.won) break;
  }
  if (g.state.won) won++;
}
ok(won >= 60, `tripeaks hint-following won ${won}/200 (expected at least 60)`);

// --- Blackjack basic strategy spot checks
const c = r => new Card(r); // rank 0=A .. 12=K (clubs)
function advice(player, up, bankroll = 1000) {
  const g = new BlackjackGame({ seed: 1 });
  player.forEach(x => { x.faceUp = true; });
  const hand = { cards: player, bet: 10, isStanding: false, isBusted: false };
  g.playerHands = [hand];
  g.activeHandIndex = 0;
  g.dealerCards = [Object.assign(up, { faceUp: true }), c(5)];
  g.bankroll = bankroll;
  g.status = HAND_STATUS.PLAYING;
  return g.getTacticalHint().action;
}
ok(advice([c(5), c(5)], c(3)) === 'SPLIT', '6,6 vs 4 should split');
ok(advice([c(5), c(5)], c(9)) !== 'SPLIT', '6,6 vs 10 should not split');
ok(advice([c(0), c(1)], c(3)) === 'HIT', 'A,2 vs 4 should hit');
ok(advice([c(0), c(1)], c(4)) === 'DOUBLE', 'A,2 vs 5 should double');
ok(advice([c(0), c(5)], c(2)) === 'DOUBLE', 'A,6 vs 3 should double');
ok(advice([c(0), c(0)], c(5), 0) === 'HIT', 'A,A (soft 12) that cannot split should hit');
ok(advice([c(9), c(2)], c(5)) === 'STAND', '10,3 vs 6 should stand');
ok(advice([c(9), c(2)], c(6)) === 'HIT', '10,3 vs 7 should hit');
ok(advice([c(9), c(1)], c(5)) === 'STAND', '10,2 vs 6 should stand');
ok(advice([c(9), c(1)], c(1)) === 'HIT', '10,2 vs 2 should hit');
ok(advice([c(5), c(4)], c(9)) === 'HIT' || advice([c(5), c(4)], c(9)) === 'DOUBLE', '6,5 vs 10 double/hit');

// --- Video Poker (Jacks or Better): junk must not be told to "hold all 5"
const { PokerGame } = await import('../src/games/poker.js');
const pk = t => t.split(' ').map(x => { const cd = new Card('cdhs'.indexOf(x[1]) * 13 + 'A23456789TJQK'.indexOf(x[0])); cd.faceUp = true; return cd; });
function pokerHold(str) { const g = new PokerGame({ seed: 5 }); g.state.phase = 'HOLDING'; g.state.hand = pk(str); return g.getTacticalHint().hold.filter(Boolean).length; }
ok(pokerHold('2s 2d 5s 6h 9d') === 2, 'low pair: hold the pair only');
ok(pokerHold('Jh Qs 9d 4c 2h') === 2, 'two high cards: hold both');
ok(pokerHold('3h 4h 5s 6d 9c') === 0, 'junk: draw five');
ok(pokerHold('Kd Kc 5s 6h 9d') === 2, 'paying pair: hold the pair');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
