/**
 * PeerRacer Arcade - race rules and client.
 *
 * Everyone in a race plays the same deal (shared seed and options) and the
 * panel ranks the results. This file holds the parts that need no DOM:
 * turning a game into a progress snapshot, ranking snapshots, the result
 * code for sharing without a connection, and the relay client.
 */

export const RACE_GAMES = {
  mahjong: { label: 'Jade Pavilion', metric: 'time' },
  sudoku: { label: 'Ninefold', metric: 'time' },
  keystone_drop: { label: 'Keystone Drop', metric: 'time' },
  dominoes: { label: 'Bone Yard', metric: 'margin' },
  trash_conveyor: { label: "Jimothy's Frenzy", metric: 'score' }
};

/** Seconds added to a finishing time for each assist or mistake. */
export const PENALTY_SECONDS = { shuffle: 20, mistake: 30, hint: 45 };

export function isRaceGame(gameType) {
  return Object.prototype.hasOwnProperty.call(RACE_GAMES, gameType);
}

/**
 * Reads a game into the small record that is sent to the other players.
 * `elapsedSeconds` is the app clock for the round; Keystone Drop keeps its own.
 */
export function snapshotGame(gameType, game, elapsedSeconds = 0) {
  const s = game?.state;
  if (!s) return null;
  const out = { progress: 0, finished: false, won: false, time: Math.round(elapsedSeconds), penalty: 0, score: s.score || 0, mode: RACE_GAMES[gameType]?.metric || 'time' };

  if (gameType === 'mahjong') {
    const total = s.tiles.length;
    const gone = s.tiles.filter(t => t.removed).length;
    out.progress = total ? gone / total : 0;
    out.won = !!s.won;
    out.finished = out.won;
    out.penalty = (s.shuffles || 0) * PENALTY_SECONDS.shuffle;
  } else if (gameType === 'sudoku') {
    let empty = 0, right = 0;
    for (let i = 0; i < 81; i++) {
      if (s.puzzle[i] === 0) { empty++; if (s.values[i] === s.solution[i]) right++; }
    }
    out.progress = empty ? right / empty : 1;
    out.won = !!s.won;
    out.finished = out.won;
    out.penalty = (s.mistakes || 0) * PENALTY_SECONDS.mistake + (s.hints || 0) * PENALTY_SECONDS.hint;
  } else if (gameType === 'keystone_drop') {
    out.progress = Math.min(1, (s.rows || 0) / (s.goalRows || 40));
    out.won = !!s.won;
    out.finished = !!(s.won || s.over);
    out.time = Math.round((s.elapsedMs || 0) / 1000);
  } else if (gameType === 'dominoes') {
    const trains = !s.target;
    out.finished = !!(s.won || s.over);
    out.won = !!s.won;
    const mine = s.players[0].score;
    const others = s.players.slice(1).map(p => p.score);
    // Margin over the best opponent, positive is better for the human.
    out.margin = trains ? Math.min(...others) - mine : mine - Math.max(...others);
    out.progress = out.finished ? 1 : (trains ? Math.max(0, (s.round - 1) / (s.rounds || 1)) : Math.min(0.95, mine / s.target));
  }
  else if (gameType === 'trash_conveyor') {
    // Five timed levels: everyone plays the whole run and the highest score wins.
    out.finished = !!s.over;
    out.won = out.finished;
    out.time = Math.round(s.time || 0);
    const levels = s.totalLevels || 5;
    out.progress = out.finished ? 1 : Math.min(0.95, ((s.level || 1) - 1 + Math.min(1, (s.levelTime || 0) / (s.levelSeconds || 50))) / levels);
  }
  out.progress = Math.max(0, Math.min(1, Math.round(out.progress * 1000) / 1000));
  return out;
}

/** Sort key, smaller is better. Compared element by element. */
export function rankKey(d) {
  if (!d) return [2, 0, 0];                  // not reported yet
  if (d.forfeit) return [4, 0, 0];
  if (d.finished && d.won) {
    if (d.mode === 'score') return [0, -(d.score || 0), d.time || 0];
    return [0, d.mode === 'margin' ? -(d.margin || 0) : (d.time || 0) + (d.penalty || 0), d.time || 0];
  }
  if (!d.finished) return [1, -(d.progress || 0), -(d.score || 0)]; // still playing
  return [3, -(d.progress || 0), -(d.score || 0)];                  // finished without winning
}

export function compareResults(a, b) {
  const ka = rankKey(a), kb = rankKey(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return 0;
}

/** Players sorted best first. `players` is the relay's { id: { name, data } } map. */
export function standings(players) {
  return Object.entries(players)
    .map(([id, p]) => ({ id, name: p.name, data: p.data }))
    .sort((x, y) => compareResults(x.data, y.data));
}

export function raceOver(players) {
  const list = Object.values(players);
  return list.length > 0 && list.every(p => p.data && (p.data.finished || p.data.forfeit));
}

/** Short text for a finished record: "3:42 (+0:45)" or "+12 pips". */
export function describeResult(d) {
  if (!d) return 'waiting';
  if (d.forfeit) return 'left the race';
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  if (d.finished && d.won) {
    if (d.mode === 'margin') return `won by ${d.margin >= 0 ? '+' : ''}${d.margin}`;
    if (d.mode === 'score') return `${(d.score || 0).toLocaleString()} pts`;
    return d.penalty ? `${mmss(d.time + d.penalty)} (${mmss(d.time)} + ${mmss(d.penalty)} penalty)` : mmss(d.time);
  }
  if (d.finished) return `out at ${Math.round(d.progress * 100)}%`;
  return `${Math.round(d.progress * 100)}%`;
}

// ---- Result codes: share a finished result when no connection is possible ----

const b64 = (text) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(text))) : Buffer.from(text, 'utf8').toString('base64'));
const unb64 = (text) => (typeof atob === 'function' ? decodeURIComponent(escape(atob(text))) : Buffer.from(text, 'base64').toString('utf8'));
const checksum = (text) => { let h = 7; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 46656; return h.toString(36).padStart(3, '0'); };

export function encodeResultCode({ game, seed, options, name, data }) {
  const body = b64(JSON.stringify({ g: game, s: seed, o: options || {}, n: name, d: data }));
  return `PRR.${body}.${checksum(body)}`;
}

export function decodeResultCode(code) {
  const parts = String(code || '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'PRR' || checksum(parts[1]) !== parts[2]) return null;
  try {
    const o = JSON.parse(unb64(parts[1]));
    return { game: o.g, seed: o.s, options: o.o || {}, name: o.n, data: o.d };
  } catch { return null; }
}

// ---- Relay client ----

export class RaceClient {
  constructor({ fetchFn = (typeof fetch === 'function' ? fetch.bind(globalThis) : null), base = '/api/race', playerId = null } = {}) {
    this.fetchFn = fetchFn;
    this.base = base;
    this.id = playerId || `p${Math.random().toString(36).slice(2, 10)}`;
    this.room = null;       // last room view from the relay
    this.clockOffset = 0;   // server time minus local time
  }

  async _post(body) {
    const res = await this.fetchFn(this.base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: this.id, ...body }) });
    return this._take(await res.json());
  }

  _take(json) {
    if (json && json.ok && json.room) {
      this.room = json;
      this.clockOffset = json.now - Date.now();
    }
    if (!json || !json.ok) throw new Error((json && json.error) || 'Race server did not answer');
    return json;
  }

  serverNow() { return Date.now() + this.clockOffset; }
  isHost() { return !!this.room && this.room.hostId === this.id; }

  create({ game, seed, options, name }) { return this._post({ op: 'create', game, seed, options, name }); }
  join(room, name) { return this._post({ op: 'join', room, name }); }
  start() { return this._post({ op: 'start', room: this.room.room }); }
  report(data) { return this._post({ op: 'report', room: this.room.room, data }); }
  rematch(seed) { return this._post({ op: 'rematch', room: this.room.room, seed }); }
  async leave() {
    if (!this.room) return;
    const room = this.room.room;
    this.room = null;
    try { await this._post({ op: 'leave', room }); } catch { /* the room may already be gone */ }
  }
  async poll() {
    if (!this.room) return null;
    const res = await this.fetchFn(`${this.base}?room=${encodeURIComponent(this.room.room)}`);
    return this._take(await res.json());
  }
}
