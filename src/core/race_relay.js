/**
 * PeerRacer Arcade - race relay.
 *
 * A tiny in-memory room service that lives inside server.js. Players who open
 * the game from the same server (same computer, home network or a forwarded
 * port) meet in a room, start together on a shared countdown, and see each
 * other's progress. No dependencies and nothing is stored on disk.
 *
 * Wire format: POST /api/race {op, ...} and GET /api/race?room=CODE.
 */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ROOMS = 200;
const MAX_PLAYERS = 6;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const COUNTDOWN_MS = 5000;
const MAX_BODY = 8192;

export const rooms = new Map();

function newCode() {
  for (let tries = 0; tries < 50; tries++) {
    let code = '';
    for (let i = 0; i < 5; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(code)) return code;
  }
  return null;
}

function sweep(now) {
  for (const [code, room] of rooms) if (now - room.touched > ROOM_TTL_MS) rooms.delete(code);
  while (rooms.size > MAX_ROOMS) rooms.delete(rooms.keys().next().value);
}

const cleanName = (n) => String(n || 'Player').replace(/[<>&"']/g, '').slice(0, 20) || 'Player';
const cleanId = (s) => String(s || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);

function view(room, now) {
  return {
    room: room.code, game: room.game, seed: room.seed, options: room.options,
    hostId: room.hostId, status: room.status, startAt: room.startAt, round: room.round, now,
    players: Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, { name: p.name, data: p.data, t: p.t }]))
  };
}

/** Pure handler, exported for tests. Returns { status, body }. */
export function handleRace(method, query, payload, now = Date.now()) {
  sweep(now);
  if (method === 'GET') {
    const room = rooms.get(String(query.room || '').toUpperCase());
    return room ? { status: 200, body: { ok: true, ...view(room, now) } } : { status: 404, body: { ok: false, error: 'Room not found' } };
  }
  if (method !== 'POST' || !payload || typeof payload !== 'object') return { status: 400, body: { ok: false, error: 'Bad request' } };

  const fail = (error, status = 400) => ({ status, body: { ok: false, error } });
  const id = cleanId(payload.id);
  if (!id) return fail('Missing player id');

  if (payload.op === 'create') {
    const code = newCode();
    if (!code) return fail('Server is busy', 503);
    const seed = Number(payload.seed);
    if (!Number.isFinite(seed) || typeof payload.game !== 'string') return fail('Missing game or seed');
    const room = {
      code, game: payload.game.slice(0, 30), seed, options: payload.options && typeof payload.options === 'object' ? payload.options : {},
      hostId: id, status: 'lobby', startAt: null, round: 0, touched: now,
      players: { [id]: { name: cleanName(payload.name), data: null, t: now } }
    };
    rooms.set(code, room);
    return { status: 200, body: { ok: true, ...view(room, now) } };
  }

  const room = rooms.get(String(payload.room || '').toUpperCase());
  if (!room) return fail('Room not found', 404);
  room.touched = now;

  switch (payload.op) {
    case 'join':
      if (!room.players[id]) {
        if (room.status !== 'lobby') return fail('That race has already started');
        if (Object.keys(room.players).length >= MAX_PLAYERS) return fail('Room is full');
        room.players[id] = { name: cleanName(payload.name), data: null, t: now };
      }
      break;
    case 'start':
      if (room.hostId !== id) return fail('Only the host can start', 403);
      if (Object.keys(room.players).length < 2) return fail('Waiting for an opponent');
      room.status = 'racing';
      room.round++;
      room.startAt = now + COUNTDOWN_MS;
      for (const p of Object.values(room.players)) p.data = null;
      break;
    case 'report': {
      const p = room.players[id];
      if (!p) return fail('Not in this room', 403);
      const text = JSON.stringify(payload.data || null);
      if (text.length > 600) return fail('Report too large');
      // A finished result is final for the round.
      if (!(p.data && p.data.finished)) { p.data = payload.data || null; p.t = now; }
      break;
    }
    case 'rematch':
      if (room.hostId !== id) return fail('Only the host can set up a rematch', 403);
      room.status = 'lobby';
      room.startAt = null;
      if (Number.isFinite(Number(payload.seed))) room.seed = Number(payload.seed);
      for (const p of Object.values(room.players)) p.data = null;
      break;
    case 'leave':
      delete room.players[id];
      if (Object.keys(room.players).length === 0) { rooms.delete(room.code); return { status: 200, body: { ok: true, closed: true } }; }
      if (room.hostId === id) room.hostId = Object.keys(room.players)[0];
      break;
    default:
      return fail('Unknown op');
  }
  return { status: 200, body: { ok: true, ...view(room, now) } };
}

/** Node http adapter; returns true when it handled the request. */
export function raceRelay(req, res, pathname, search = '') {
  if (pathname !== '/api/race') return false;
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  const send = ({ status, body }) => { res.writeHead(status, headers); res.end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return true; }
  if (req.method === 'GET') {
    send(handleRace('GET', Object.fromEntries(new URLSearchParams(search))));
    return true;
  }
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) { send({ status: 413, body: { ok: false, error: 'Too large' } }); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => {
    if (res.writableEnded) return;
    let payload = null;
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* falls through to Bad request */ }
    send(handleRace('POST', {}, payload));
  });
  return true;
}
