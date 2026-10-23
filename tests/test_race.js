// PeerRacer Arcade: ranking, result codes, relay rooms, and the client talking to a real server.
import http from 'http';
import { raceRelay, handleRace, rooms } from '../src/core/race_relay.js';
import { compareResults, standings, raceOver, snapshotGame, encodeResultCode, decodeResultCode, RaceClient, describeResult, isRaceGame } from '../src/core/race_match.js';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { MahjongGame } = await import('../src/games/mahjong.js');
const { SudokuGame } = await import('../src/games/sudoku.js');
const { KeystoneDropGame } = await import('../src/games/keystone_drop.js');
const { DominoGame } = await import('../src/games/dominoes.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL: ' + m); } };

// --- Ranking
const win = (time, penalty = 0) => ({ finished: true, won: true, time, penalty, progress: 1, score: 0, mode: 'time' });
ok(compareResults(win(100), win(120)) < 0, 'faster win ranks first');
ok(compareResults(win(100, 60), win(120)) > 0, 'penalty counts against a faster time');
ok(compareResults(win(500), { finished: false, progress: 0.9, score: 0 }) < 0, 'a win beats a player still going');
ok(compareResults({ finished: false, progress: 0.5, score: 0 }, { finished: true, won: false, progress: 0.8, score: 0 }) < 0, 'still playing beats a finished loss');
ok(compareResults({ finished: false, progress: 0.7, score: 0 }, { finished: false, progress: 0.4, score: 0 }) < 0, 'further along ranks first');
ok(compareResults({ forfeit: true }, { finished: true, won: false, progress: 0, score: 0 }) > 0, 'forfeit ranks last');
const dm = (margin) => ({ finished: true, won: true, margin, time: 100, progress: 1, mode: 'margin' });
ok(compareResults(dm(30), dm(10)) < 0, 'bigger domino margin ranks first');
ok(standings({ a: { name: 'A', data: win(200) }, b: { name: 'B', data: win(150) } })[0].id === 'b', 'standings sorted');
ok(raceOver({ a: { data: win(1) }, b: { data: { forfeit: true } } }), 'race over when all finished or left');
ok(!raceOver({ a: { data: win(1) }, b: { data: null } }), 'race not over while a player has not reported');
ok(describeResult(win(125, 45)).startsWith('2:50'), 'result text adds the penalty');

// --- Snapshots read each game
const mj = new MahjongGame({ seed: 5 });
let snap = snapshotGame('mahjong', mj, 10);
ok(snap.progress === 0 && !snap.finished, 'fresh mahjong has no progress');
mj.state.tiles.forEach(t => { t.removed = true; }); mj.state.won = true; mj.state.shuffles = 2;
snap = snapshotGame('mahjong', mj, 90);
ok(snap.finished && snap.won && snap.progress === 1 && snap.penalty === 40, 'mahjong win snapshot with shuffle penalty');
const sd = new SudokuGame({ seed: 5, difficulty: 'easy' });
ok(snapshotGame('sudoku', sd, 0).progress === 0, 'fresh sudoku has no progress');
for (let i = 0; i < 81; i++) sd.state.values[i] = sd.state.solution[i];
sd.state.won = true; sd.state.mistakes = 1; sd.state.hints = 1;
snap = snapshotGame('sudoku', sd, 200);
ok(snap.progress === 1 && snap.finished && snap.penalty === 75, 'sudoku solved snapshot with penalties');
const kd = new KeystoneDropGame({ seed: 5 });
kd.state.rows = 20;
ok(snapshotGame('keystone_drop', kd, 0).progress === 0.5, 'keystone progress is rows over goal');
kd.state.over = true;
ok(snapshotGame('keystone_drop', kd, 0).finished && !snapshotGame('keystone_drop', kd, 0).won, 'keystone game over is finished, not won');
const dg = new DominoGame({ seed: 5, variant: 'draw' });
ok(!snapshotGame('dominoes', dg, 0).finished, 'fresh dominoes not finished');
dg.state.players[0].score = 80; dg.state.won = true;
snap = snapshotGame('dominoes', dg, 0);
ok(snap.finished && snap.won && snap.margin === 80 - Math.max(...dg.state.players.slice(1).map(p => p.score)), 'dominoes margin');
ok(isRaceGame('sudoku') && !isRaceGame('klondike_1'), 'only arcade games race');

// --- Result codes
const code = encodeResultCode({ game: 'sudoku', seed: 77, options: { difficulty: 'hard' }, name: 'Chris ✓', data: win(321, 30) });
const back = decodeResultCode(code);
ok(back && back.game === 'sudoku' && back.seed === 77 && back.name === 'Chris ✓' && back.data.time === 321 && back.options.difficulty === 'hard', 'result code round trip');
ok(decodeResultCode(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')) === null, 'tampered code rejected');
ok(decodeResultCode('nonsense') === null, 'garbage code rejected');

// --- Relay rules (pure)
rooms.clear();
let r = handleRace('POST', {}, { op: 'create', id: 'h1', name: 'Host<b>', game: 'sudoku', seed: 42, options: { difficulty: 'easy' } }, 1000);
ok(r.status === 200 && r.body.room.length === 5 && r.body.players.h1.name === 'Hostb', 'create room and clean the name');
const room = r.body.room;
ok(handleRace('POST', {}, { op: 'start', id: 'h1', room }, 1100).status === 400, 'cannot start alone');
ok(handleRace('POST', {}, { op: 'join', id: 'g1', name: 'Guest', room: room.toLowerCase() }, 1200).body.players.g1, 'join with lowercase code');
ok(handleRace('POST', {}, { op: 'start', id: 'g1', room }, 1300).status === 403, 'only host starts');
r = handleRace('POST', {}, { op: 'start', id: 'h1', room }, 2000);
ok(r.body.status === 'racing' && r.body.startAt === 7000, 'start sets a 5 second countdown');
ok(handleRace('POST', {}, { op: 'join', id: 'late', name: 'Late', room }, 2100).status === 400, 'cannot join a started race');
handleRace('POST', {}, { op: 'report', id: 'g1', room, data: { progress: 0.4, finished: false } }, 8000);
handleRace('POST', {}, { op: 'report', id: 'g1', room, data: { progress: 1, finished: true, won: true, time: 90 } }, 9000);
r = handleRace('POST', {}, { op: 'report', id: 'g1', room, data: { progress: 0.1, finished: false } }, 9500);
ok(r.body.players.g1.data.finished === true, 'a finished result is final');
ok(handleRace('POST', {}, { op: 'report', id: 'g1', room, data: { pad: 'x'.repeat(700) } }, 9600).status === 400, 'oversized report refused');
r = handleRace('POST', {}, { op: 'rematch', id: 'h1', room, seed: 99 }, 10000);
ok(r.body.status === 'lobby' && r.body.seed === 99 && r.body.players.g1.data === null, 'rematch resets the room');
r = handleRace('POST', {}, { op: 'leave', id: 'h1', room }, 10100);
ok(r.body.hostId === 'g1', 'host passes to the next player');
ok(handleRace('POST', {}, { op: 'leave', id: 'g1', room }, 10200).body.closed, 'empty room closes');
ok(handleRace('GET', { room }, null, 10300).status === 404, 'closed room is gone');
handleRace('POST', {}, { op: 'create', id: 'x', game: 'sudoku', seed: 1 }, 0);
handleRace('GET', { room: 'ZZZZZ' }, null, 5 * 60 * 60 * 1000);
ok(rooms.size === 0, 'stale rooms are swept');

// --- Client against a real http server
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (!raceRelay(req, res, u.pathname, u.search.slice(1))) { res.writeHead(404); res.end(); }
});
await new Promise(res => server.listen(0, '127.0.0.1', res));
const base = `http://127.0.0.1:${server.address().port}/api/race`;
const host = new RaceClient({ base, playerId: 'hostid' });
const guest = new RaceClient({ base, playerId: 'guestid' });
const created = await host.create({ game: 'mahjong', seed: 1234, options: { layoutId: 'turtle' }, name: 'Chris' });
ok(host.isHost() && created.room.length === 5, 'client creates and hosts');
await guest.join(created.room, 'Sam');
ok(!guest.isHost() && guest.room.options.layoutId === 'turtle' && guest.room.seed === 1234, 'guest receives the deal settings');
await host.poll();
ok(Object.keys(host.room.players).length === 2, 'host sees the guest');
await host.start();
await guest.poll();
ok(guest.room.status === 'racing' && guest.room.startAt > guest.serverNow() - 10, 'guest sees the countdown');
await guest.report({ progress: 0.5, finished: false });
await host.poll();
ok(host.room.players.guestid.data.progress === 0.5, 'host sees guest progress');
let threw = false;
try { await guest.join('NOPE1', 'Sam'); } catch { threw = true; }
ok(threw, 'unknown room throws');
await guest.leave();
await host.poll();
ok(Object.keys(host.room.players).length === 1, 'leave removes the player');
server.close();

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
