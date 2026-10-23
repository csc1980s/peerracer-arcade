// PeerRacer Arcade direct 2-player connection: signal codes and the host/guest protocol over a stand-in channel.
import { P2PRaceClient, packSignal, unpackSignal } from '../src/core/race_p2p.js';
import { rooms } from '../src/core/race_relay.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL: ' + m); } };
const tick = () => new Promise(r => setTimeout(r, 5));

// --- Signal codes
const sdp = 'v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=candidate:1 1 udp 2113937151 192.0.2.1 54321 typ host\r\n'.repeat(6);
const code = await packSignal({ type: 'offer', sdp });
ok(/^PRP1z\.[A-Za-z0-9+/=]+$/.test(code), 'offer packs to a single copyable line');
ok(code.length < sdp.length, 'packed code is shorter than the raw description');
const back = await unpackSignal(`  ${code.slice(0, 20)}\n${code.slice(20)}  `);
ok(back.type === 'offer' && back.sdp === sdp, 'code survives line breaks and spaces');
for (const bad of ['', 'hello', 'PRP1z.@@@@', 'PRP1z.AAAA']) {
  let threw = false; try { await unpackSignal(bad); } catch (e) { threw = /code/.test(e.message); }
  ok(threw, `bad code rejected: ${JSON.stringify(bad)}`);
}

// --- Host and guest over a stand-in channel
function channelPair() {
  const mk = () => ({ readyState: 'open', onmessage: null, onclose: null, onopen: null });
  const a = mk(), b = mk();
  a.send = (m) => queueMicrotask(() => b.onmessage && b.onmessage({ data: m }));
  b.send = (m) => queueMicrotask(() => a.onmessage && a.onmessage({ data: m }));
  const close = () => { if (a.readyState === 'closed') return; a.readyState = b.readyState = 'closed'; queueMicrotask(() => { a.onclose?.(); b.onclose?.(); }); };
  a.close = b.close = close;
  return [a, b];
}

rooms.clear();
const host = new P2PRaceClient({ playerId: 'hostid' });
const guest = new P2PRaceClient({ playerId: 'guestid' });
const created = await host.create({ game: 'trash_conveyor', seed: 424242, options: { speed: 'normal' }, name: 'Chris' });
ok(host.isHost() && created.room.length === 5, 'host creates a room locally');
const [ch1, ch2] = channelPair();
host.attachChannel(ch1, 'host');
guest.attachChannel(ch2, 'guest');
await host.whenOpen(); await guest.whenOpen();
await guest.join(null, 'Sam');
ok(!guest.isHost() && guest.room.seed === 424242 && guest.room.options.speed === 'normal' && guest.room.game === 'trash_conveyor', 'guest receives the deal settings');
await tick();
ok(Object.keys(host.room.players).length === 2 && host.room.players.guestid.name === 'Sam', 'host sees the guest join');

let denied = false;
try { await guest.start(); } catch (e) { denied = /host/i.test(e.message); }
ok(denied, 'guest cannot start the race');

await host.start();
await tick();
ok(guest.room.status === 'racing' && guest.room.round === 1 && guest.room.startAt > Date.now() + 3000, 'guest is told about the countdown');
ok(Math.abs(guest.serverNow() - Date.now()) < 500, 'clocks line up');

await guest.report({ progress: 0.4, finished: false, score: 120 });
await tick();
ok(host.room.players.guestid.data.progress === 0.4, 'host sees guest progress at once');
await host.report({ progress: 1, finished: true, won: true, score: 900, mode: 'score', time: 70 });
await tick();
ok(guest.room.players.hostid.data.finished === true && guest.room.players.hostid.data.score === 900, 'guest sees the host finish');
await guest.report({ progress: 1, finished: true, won: true, score: 400, mode: 'score', time: 60 });
await tick();
ok(host.room.players.guestid.data.score === 400, 'host sees the guest finish');

await host.rematch(777);
await tick();
ok(guest.room.status === 'lobby' && guest.room.seed === 777 && guest.room.players.hostid.data === null, 'rematch resets both sides on a new deal');

// An id spoof from the guest side is ignored: reports always count for the guest.
guest.id = 'someoneelse';
await guest.report({ progress: 0.2, finished: false });
await tick();
ok(!host.room.players.someoneelse, 'guest cannot report as another player');
guest.id = 'guestid';

// --- Leaving
await guest.leave();
await tick();
ok(Object.keys(host.room.players).length === 1 || !host.room.players.guestid, 'host sees the guest leave');
let gone = false;
try { await guest.poll(); } catch { gone = true; }
ok(gone || guest.room === null, 'guest is out of the room');

// --- Connection dropping mid-race
rooms.clear();
const h2 = new P2PRaceClient({ playerId: 'h2' }), g2 = new P2PRaceClient({ playerId: 'g2' });
await h2.create({ game: 'sudoku', seed: 5, options: { difficulty: 'easy' }, name: 'H' });
const [c3, c4] = channelPair();
h2.attachChannel(c3, 'host'); g2.attachChannel(c4, 'guest');
await g2.join(null, 'G'); await tick();
await h2.start(); await tick();
c3.close(); await tick();
ok(!h2.room.players.g2 || Object.keys((await h2.poll()).players).length === 1, 'host drops the guest when the link breaks');
let closedErr = false;
try { await g2.poll(); } catch (e) { closedErr = /not found/i.test(e.message); }
ok(closedErr, 'guest learns the room is gone when the link breaks');
let reqErr = false;
try { await g2.report({ progress: 0.1 }); } catch { reqErr = true; }
ok(reqErr, 'guest requests fail cleanly after the link breaks');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
