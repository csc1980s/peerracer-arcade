// Jimothy's Trash Conveyor Frenzy: timed levels, scoring, trampolines, determinism, slower falling food, save/resume, and a playable bot.
import {
  TrashConveyorGame, SPEEDS, WORLD, CANS, ITEM_TYPES, LEVELS, LEVEL_SECONDS,
  ROTTEN_PENALTY, BOUNCE_BONUS, STAR_BONUS
} from '../src/games/trash_conveyor.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL: ' + m); } };
const run = (g, seconds, onStep = null, dt = 1 / 60) => {
  const events = [];
  for (let t = 0; t < seconds && !g.state.over; t += dt) {
    if (onStep) onStep(g);
    events.push(...g.update(dt));
  }
  return events;
};
/** Plays whole levels, pressing Next level whenever the summary shows. */
const runAuto = (g, seconds, onStep = null, dt = 1 / 60) => {
  const events = [];
  for (let t = 0; t < seconds && !g.state.over; t += dt) {
    if (g.state.phase === 'between') g.startNextLevel();
    if (onStep) onStep(g);
    events.push(...g.update(dt));
  }
  return events;
};

// --- Level table is sane
ok(LEVELS.length === 5, 'five levels');
for (const L of LEVELS) {
  ok(L.belts.length >= 3 && L.belts.every((b, i, a) => i === 0 || b.yRatio > a[i - 1].yRatio), `level ${L.id} belts run top to bottom`);
  ok(['alley', 'dock', 'kitchen', 'garden', 'moon'].includes(L.theme), `level ${L.id} has a known background`);
  for (const b of L.bouncers) {
    const above = L.belts.filter(x => x.yRatio * WORLD.h < b.yRatio * WORLD.h - 24);
    ok(above.length > 0, `level ${L.id}: a trampoline always has a belt above it`);
    ok(b.cx - b.amp >= 0 && b.cx + b.amp <= 1, `level ${L.id}: a trampoline stays inside the walls`);
    ok(b.yRatio * WORLD.h < WORLD.h - 120, `level ${L.id}: a trampoline sits above Jimothy`);
  }
}
ok(LEVELS[0].bouncers.length === 0 && LEVELS.slice(1).every(L => L.bouncers.length >= 1), 'level 1 has no trampoline, every later level has one');
ok(LEVELS.every((L, i) => i === 0 || L.pace > LEVELS[i - 1].pace), 'each level is a little faster');

// --- Determinism: the same seed brings the same food, whatever the player does, across levels
const spawnLog = (seed) => {
  const g = new TrashConveyorGame({ seed, speed: 'normal' });
  const seen = [];
  runAuto(g, 100, (game) => { for (const i of game.state.items) if (!seen.some(s => s.id === i.id)) seen.push({ id: i.id, key: i.key, x: Math.round(i.x) }); });
  return JSON.stringify(seen);
};
ok(spawnLog(11) === spawnLog(11), 'same seed, same spawns');
ok(spawnLog(11) !== spawnLog(12), 'different seed, different spawns');
const firstSpawns = (moveDir) => {
  const game = new TrashConveyorGame({ seed: 5 });
  const seen = [];
  run(game, 25, (gg) => { gg.setMove(moveDir); for (const i of gg.state.items) if (!seen.some(x => x.id === i.id)) seen.push({ id: i.id, key: i.key, x: Math.round(i.x) }); });
  return JSON.stringify(seen.slice(0, 6));
};
ok(firstSpawns(0) === firstSpawns(1), 'player movement does not change what spawns');
// Waiting on the summary screen does not change what the next level brings
const afterPause = (waitSeconds) => {
  const game = new TrashConveyorGame({ seed: 8 });
  run(game, LEVEL_SECONDS + 1);
  for (let t = 0; t < waitSeconds; t += 1 / 60) game.update(1 / 60);
  game.startNextLevel();
  const seen = [];
  run(game, 20, (gg) => { for (const i of gg.state.items) if (!seen.some(x => x.id === i.id)) seen.push({ id: i.id, key: i.key, x: Math.round(i.x) }); });
  return JSON.stringify(seen);
};
ok(afterPause(0) === afterPause(30), 'time spent on the summary does not change the next level');

// --- Speeds: the default is much slower than the original game
const dropSeconds = (speed) => {
  const g = new TrashConveyorGame({ seed: 1, speed });
  g.state.nextSpawn = 999;
  g.state.jimothy.x = g.state.jimothy.targetX = 560;
  g.state.items.push({ id: 1, born: 0, key: 'BANANA', x: 15, y: 10, vx: 0, vy: 60 * g.mult, onBelt: -1, rotation: 0, rotSpeed: 0, magnetized: false, bounces: 0, dead: false });
  for (const ev of run(g, 30)) if (ev.type === 'miss') return ev.age;
  return 0;
};
const tOriginal = dropSeconds('original'), tNormal = dropSeconds('normal'), tRelaxed = dropSeconds('relaxed');
ok(tOriginal > 0 && tNormal > tOriginal * 1.4, `normal falls at least 1.4x slower than the original (${tOriginal.toFixed(2)}s vs ${tNormal.toFixed(2)}s)`);
ok(tRelaxed > tNormal, 'relaxed is slower still');
ok(new TrashConveyorGame({ seed: 1, speed: 'bogus' }).speedId === 'normal', 'unknown speed falls back to normal');
ok(SPEEDS.normal.mult < 1 && SPEEDS.original.mult === 1, 'speed table');

// --- Bins and keys-worth of switching
const g = new TrashConveyorGame({ seed: 3 });
ok(g.state.activeCan === 'YELLOW', 'starts on yellow');
ok(g.cycleCan(1) && g.state.activeCan === 'GREEN', 'next bin');
ok(g.cycleCan(1) && g.state.activeCan === 'RED', 'next bin again');
ok(g.cycleCan(1) && g.state.activeCan === 'YELLOW', 'wraps forward');
ok(g.cycleCan(-1) && g.state.activeCan === 'RED', 'wraps backward');
ok(g.setCan('GREEN') && !g.setCan('GREEN') && !g.setCan('PURPLE'), 'setCan only accepts a new, real bin');

// --- Scoring (place items by hand so the rule is what is tested)
const place = (game, key, dx = 0, y = null) => {
  const j = game.state.jimothy;
  game.state.items.push({ id: ++game.state.itemSeq, born: game.state.time, key, x: j.x + dx, y: y ?? game.jimothyY() - 70, vx: 0, vy: 30, onBelt: -1, rotation: 0, rotSpeed: 0, magnetized: false, bounces: 0, dead: false });
};
const fresh = () => { const x = new TrashConveyorGame({ seed: 9 }); x.state.nextSpawn = 999; return x; };
let r = fresh(); place(r, 'BANANA'); run(r, 1);
ok(r.state.score === 100 && r.state.moves === 1 && r.state.combo === 1, 'banana in yellow scores 100');
r = fresh(); r.setCan('RED'); place(r, 'BANANA'); run(r, 1);
ok(r.state.score === 0 && r.state.moves === 0, 'banana in red scores nothing');
r = fresh(); for (let i = 0; i < 3; i++) { place(r, 'BANANA'); run(r, 1); }
r.setCan('RED'); place(r, 'BANANA'); const offEvents = run(r, 1);
ok(r.state.score === 300 && r.state.combo === 3 && offEvents.some(e => e.type === 'offcolor'), 'a wrong-bin catch keeps the streak and adds no points');
r = fresh(); for (let i = 0; i < 4; i++) { place(r, 'BANANA'); run(r, 1); }
ok(r.state.multiplier === 2 && r.state.score === 100 * 3 + 200, 'four catches raise the multiplier to 2x');
// Rotten trash: lose points, never below zero, streak gone
r = fresh(); r.state.score = 500; r.state.combo = 6; r.state.multiplier = 2; place(r, 'ROTTEN'); const rotEvents = run(r, 1);
ok(r.state.score === 500 - ROTTEN_PENALTY && r.state.combo === 0 && r.state.multiplier === 1 && rotEvents.some(e => e.type === 'rotten' && e.lost === ROTTEN_PENALTY), 'rotten trash costs points and the streak');
r = fresh(); r.state.score = 30; place(r, 'ROTTEN'); run(r, 1);
ok(r.state.score === 0 && !r.state.over, 'rotten trash cannot push the score below zero');
// Dropped food: the streak ends, the score stays
r = fresh(); r.state.score = 400; r.state.combo = 5; r.state.multiplier = 2; place(r, 'BANANA', 250); const missEvents = run(r, 4);
ok(r.state.score === 400 && r.state.combo === 0 && r.state.multiplier === 1 && missEvents.some(e => e.type === 'miss'), 'dropped food only ends the streak');
// Food never leaves the screen sideways
const edgeGame = new TrashConveyorGame({ seed: 31, speed: 'original' });
let worst = 0;
runAuto(edgeGame, 120, (gg) => { gg.state.jimothy.x = gg.state.jimothy.targetX = WORLD.w / 2; for (const i of gg.state.items) worst = Math.max(worst, Math.abs(i.x - WORLD.w / 2)); });
ok(worst <= WORLD.w / 2, `food stays inside the walls (${Math.round(worst)})`);
r = fresh(); place(r, 'DONUT'); run(r, 1);
ok(r.state.score === 300, 'donut gives 300');
r = fresh(); place(r, 'FREEZE'); run(r, 0.5);
ok(r.state.freezeTimer > 4, 'freeze clock starts a timer');
r = fresh(); place(r, 'MAGNET'); run(r, 0.5);
ok(r.state.magnetTimer > 5, 'magnet starts a timer');

// --- Levels end on time, with a summary, and the next one starts on request
const idle = new TrashConveyorGame({ seed: 5 });
const idleEvents = run(idle, LEVEL_SECONDS - 1);
ok(idle.state.phase === 'play' && idle.state.level === 1 && !idle.state.over, 'level one is still running just before the time is up');
idleEvents.push(...run(idle, 3));
const endEvent = idleEvents.find(e => e.type === 'levelEnd');
ok(idle.state.phase === 'between' && endEvent && !idle.state.over, 'level one ends on time with a summary and no game over');
ok(idle.state.items.length === 0, 'the board is cleared between levels');
ok(idle.update(5).length === 0 && idle.state.levelTime < LEVEL_SECONDS + 0.5, 'nothing moves while the summary is showing');
const sm = idle.state.summary;
ok(sm.level === 1 && sm.name === 'Back Alley' && sm.stars === 1 && sm.bonus === STAR_BONUS && idle.state.score === STAR_BONUS, 'an idle player gets one star and its bonus');
ok(sm.totalScore === idle.state.score && sm.levelScore === idle.state.score, 'summary totals match the score');
ok(idle.startNextLevel() && idle.state.level === 2 && idle.state.phase === 'play' && idle.state.levelTime === 0, 'next level starts fresh');
ok(idle.state.belts.length === LEVELS[1].belts.length && idle.state.bouncers.length === 1, 'level two brings its own belts and a trampoline');
ok(!idle.startNextLevel(), 'Next level only works from the summary');
// Stars
r = fresh(); r.state.levelTime = LEVEL_SECONDS - 9;
for (let i = 0; i < 9; i++) { place(r, 'BANANA'); run(r, 0.5); }
r.state.items = []; place(r, 'BANANA', 250); run(r, 6);
ok(r.state.phase === 'between' && r.state.summary.stars === 3 && r.state.summary.accuracy >= 0.8, 'catching nearly everything gives three stars');
// The last level ends the run
const full = new TrashConveyorGame({ seed: 2 });
const fullEvents = runAuto(full, LEVEL_SECONDS * LEVELS.length + 10);
ok(full.state.over && full.state.won && full.state.phase === 'done' && full.state.level === LEVELS.length, 'the run ends after the last level');
ok(fullEvents.filter(e => e.type === 'levelEnd').length === LEVELS.length && fullEvents.filter(e => e.type === 'over').length === 1, 'one summary per level and one end of run');
ok(full.state.levelResults.length === LEVELS.length && full.update(1).length === 0 && !full.cycleCan(1), 'nothing happens after the run is over');

// --- Trampolines
const level2 = () => { const x = new TrashConveyorGame({ seed: 4 }); x.state.nextSpawn = 999; x.state.score = 0; x._buildLevel(2); x.state.nextSpawn = 999; return x; };
let t2 = level2();
const bo = t2.state.bouncers[0];
const xs = [];
for (let i = 0; i < 60 * 8; i++) { t2.update(1 / 60); xs.push(bo.x); }
ok(Math.max(...xs) - Math.min(...xs) > 100 && Math.min(...xs) >= 0 && Math.max(...xs) <= WORLD.w, 'the trampoline slides back and forth inside the walls');
t2 = level2();
t2.state.jimothy.x = t2.state.jimothy.targetX = 40;
const target = t2.state.belts[2];
let kicked = false, landedAbove = false, maxHeight = Infinity;
t2.state.items.push({ id: 1, born: 0, key: 'APPLE', x: t2.state.bouncers[0].x, y: t2.state.bouncers[0].y - 60, vx: 0, vy: 80, onBelt: -1, rotation: 0, rotSpeed: 0, magnetized: false, bounces: 0, dead: false });
run(t2, 6, (gg) => {
  const it = gg.state.items[0]; if (!it) return;
  if (it.bounces > 0) { kicked = true; maxHeight = Math.min(maxHeight, it.y); }
  if (it.bounces > 0 && it.onBelt >= 0) landedAbove = true;
  it.x = gg.state.bouncers[0].x; // keep it over the pad until the kick
  if (it.bounces > 0) it.x = Math.max(target.x + 20, Math.min(target.x + target.w - 20, it.x));
});
ok(kicked && landedAbove, 'food kicked by a trampoline lands on the belt above it');
ok(maxHeight < target.y, `the kick carries the food higher than the belt (${Math.round(maxHeight)} vs ${Math.round(target.y)})`);
// Bounce bonus only for right-bin catches
t2 = level2();
t2.state.jimothy.x = t2.state.jimothy.targetX = 300;
place(t2, 'BANANA'); t2.state.items[0].bounces = 1; const bonusEvents = run(t2, 1);
ok(t2.state.score === 100 + BOUNCE_BONUS && bonusEvents.some(e => e.type === 'catch' && e.bounceBonus === BOUNCE_BONUS), 'a kicked banana caught in yellow earns the bounce bonus');
t2 = level2();
t2.state.jimothy.x = t2.state.jimothy.targetX = 300; t2.setCan('RED');
place(t2, 'BANANA'); t2.state.items[0].bounces = 1; run(t2, 1);
ok(t2.state.score === 0, 'no bounce bonus for the wrong bin');
// A piece of food is kicked only once
t2 = level2();
t2.state.items.push({ id: 1, born: 0, key: 'APPLE', x: t2.state.bouncers[0].x, y: t2.state.bouncers[0].y - 40, vx: 0, vy: 80, onBelt: -1, rotation: 0, rotSpeed: 0, magnetized: false, bounces: 1, dead: false });
const passEvents = run(t2, 1.2, (gg) => { if (gg.state.items[0]) gg.state.items[0].x = gg.state.bouncers[0].x; });
ok(!passEvents.some(e => e.type === 'bounce'), 'after its kick food falls straight through');

// --- Save and resume continues the same run, in the middle of a level and on the summary
const g1 = new TrashConveyorGame({ seed: 21, speed: 'quick' });
runAuto(g1, 55);
const snap = JSON.parse(JSON.stringify(g1.state));
const g2 = TrashConveyorGame.fromState(snap);
runAuto(g1, 60); runAuto(g2, 60);
ok(JSON.stringify(g1.state) === JSON.stringify(g2.state), 'resumed game matches the original');
const g3 = new TrashConveyorGame({ seed: 22 });
run(g3, LEVEL_SECONDS + 1);
const g4 = TrashConveyorGame.fromState(JSON.parse(JSON.stringify(g3.state)));
ok(g4.state.phase === 'between' && g4.startNextLevel() && g4.state.level === 2, 'a game saved on the summary resumes there');
ok(TrashConveyorGame.fromState({ seed: 5, speed: 'normal', belts: [{}], lives: 3 }).state.level === 1, 'an old save without levels starts over');

// --- Teacher tip
const h = new TrashConveyorGame({ seed: 4 });
h.state.nextSpawn = 999;
ok(h.getTacticalHint().action === 'WAIT', 'tip waits when nothing falls');
place(h, 'APPLE', 120);
const tip = h.getTacticalHint();
ok(tip.action === 'SWITCH' && tip.can === 'RED' && /key 3/.test(tip.message) && /right/.test(tip.message), 'tip names the bin, its key and the side');
h.setCan('RED');
ok(h.getTacticalHint().action === 'MOVE', 'tip just says move once the bin matches');
run(h, LEVEL_SECONDS + 1);
ok(/Next level/.test(h.getTacticalHint().message), 'tip points at the Next level button on the summary');

// --- A bot that follows the tip plays through the whole run
const bot = (game) => {
  if (game.state.phase !== 'play') return;
  const t = game.getTacticalHint();
  if (!t) return;
  if (t.action === 'SWITCH') game.setCan(t.can);
  const s = game.state;
  const target = s.items.filter(i => i.y < game.jimothyY() - 20).sort((p, q) => q.y - p.y)[0];
  if (target) game.setTargetX(target.x);
};
const botGame = new TrashConveyorGame({ seed: 77, speed: 'normal' });
runAuto(botGame, LEVEL_SECONDS * LEVELS.length + 10, bot);
ok(botGame.state.over && botGame.state.score > 4000, `bot finishes the run with a good score (${botGame.state.score})`);
ok(botGame.state.levelResults.reduce((a, x) => a + x.stars, 0) >= 8, 'bot earns at least eight stars over the run');
ok(botGame.state.levelResults.some(x => x.bounced > 0), 'bot catches at least one kicked food somewhere');
ok(WORLD.w === 600 && CANS.length === 3 && Object.keys(ITEM_TYPES).length === 7, 'world and item tables');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
