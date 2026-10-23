/**
 * PeerRacer Arcade - direct two-player connection (WebRTC).
 *
 * One player hosts, the other joins, and the two browsers talk straight to each
 * other with no game server in between. There is no signalling server either:
 * the players swap two short codes by chat or text message (an "offer" from the
 * host and an "answer" from the guest), exactly once.
 *
 * Once the data channel is open this behaves like the room client in
 * race_match.js (same methods), so the race screen does not care which one it
 * has. The host's browser plays the part of the relay: it runs the same room
 * rules (handleRace) and pushes the room to the guest after every change.
 */

import { handleRace } from './race_relay.js';
import { RaceClient } from './race_match.js';

export const DEFAULT_ICE = [{ urls: 'stun:stun.l.google.com:19302' }];
const GATHER_TIMEOUT_MS = 5000;
const REQUEST_TIMEOUT_MS = 6000;

// ---- Signal codes: a session description packed into a short string ----

const toB64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (text) => Uint8Array.from(atob(text), c => c.charCodeAt(0));

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/** { type, sdp } -> "PRP1z.<base64>" (deflated when the browser can) */
export async function packSignal(desc) {
  const bytes = new TextEncoder().encode(JSON.stringify({ t: desc.type, s: desc.sdp }));
  if (typeof CompressionStream !== 'undefined') return `PRP1z.${toB64(await pipe(bytes, new CompressionStream('deflate-raw')))}`;
  return `PRP1.${toB64(bytes)}`;
}

export async function unpackSignal(code) {
  const text = String(code || '').trim().replace(/\s+/g, '');
  const m = /^PRP1(z?)\.([A-Za-z0-9+/=]+)$/.exec(text);
  if (!m) throw new Error('That connection code is not valid. Copy the whole code.');
  try {
    let bytes = fromB64(m[2]);
    if (m[1] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    if (!o.t || !o.s) throw new Error('empty');
    return { type: o.t, sdp: o.s };
  } catch {
    throw new Error('That connection code is damaged. Copy the whole code again.');
  }
}

// ---- Client ----

export class P2PRaceClient extends RaceClient {
  constructor({ playerId = null, iceServers = DEFAULT_ICE, rtcFactory = (cfg) => new RTCPeerConnection(cfg) } = {}) {
    super({ fetchFn: null, playerId });
    this.iceServers = iceServers;
    this.rtcFactory = rtcFactory;
    this.role = null;          // 'host' | 'guest'
    this.pc = null;
    this.channel = null;
    this.guestId = null;       // host side: the guest's player id
    this.pending = new Map();
    this.nextRid = 1;
    this.closed = false;
    this.opened = new Promise((res, rej) => { this._open = res; this._fail = rej; });
    this.opened.catch(() => {}); // nobody may be waiting yet
  }

  whenOpen() { return this.opened; }
  isOpen() { return !!this.channel && this.channel.readyState === 'open'; }

  // ---- Connecting ----

  _makePc() {
    const pc = this.rtcFactory({ iceServers: this.iceServers });
    this.pc = pc;
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) this._onClose();
      if (pc.connectionState === 'disconnected') setTimeout(() => { if (pc.connectionState === 'disconnected') this._onClose(); }, 4000);
    };
    return pc;
  }

  _gathered(pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const done = () => { pc.removeEventListener?.('icegatheringstatechange', check); resolve(); };
      const check = () => { if (pc.iceGatheringState === 'complete') done(); };
      pc.addEventListener?.('icegatheringstatechange', check);
      setTimeout(done, GATHER_TIMEOUT_MS); // a partial list still works on a home network
    });
  }

  /** Host step 1: returns the offer code to send to the guest. */
  async hostOffer() {
    this.role = 'host';
    const pc = this._makePc();
    this._wire(pc.createDataChannel('race', { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await this._gathered(pc);
    return packSignal(pc.localDescription);
  }

  /** Host step 2: paste the guest's answer code. */
  async acceptAnswer(code) {
    const desc = await unpackSignal(code);
    if (desc.type !== 'answer') throw new Error('That is an offer code. Paste the answer code your opponent sent back.');
    await this.pc.setRemoteDescription(desc);
  }

  /** Guest: paste the host's offer code, get an answer code to send back. */
  async guestAnswer(offerCode) {
    const desc = await unpackSignal(offerCode);
    if (desc.type !== 'offer') throw new Error('That is an answer code. Paste the offer code the host sent you.');
    this.role = 'guest';
    const pc = this._makePc();
    pc.ondatachannel = (e) => this._wire(e.channel);
    await pc.setRemoteDescription(desc);
    await pc.setLocalDescription(await pc.createAnswer());
    await this._gathered(pc);
    return packSignal(pc.localDescription);
  }

  /** Attach an already-built channel (used by tests and by the WebRTC steps above). */
  attachChannel(channel, role) {
    if (role) this.role = role;
    this._wire(channel);
  }

  _wire(channel) {
    this.channel = channel;
    channel.onmessage = (e) => this._onMessage(e.data);
    channel.onclose = () => this._onClose();
    channel.onerror = () => {};
    if (channel.readyState === 'open') this._open();
    else channel.onopen = () => this._open();
  }

  _onClose() {
    if (this.closed) return;
    this.closed = true;
    this._fail(new Error('Connection closed'));
    for (const { reject } of this.pending.values()) reject(new Error('Connection closed'));
    this.pending.clear();
    if (this.role === 'host' && this.guestId && this.room) {
      handleRace('POST', {}, { op: 'leave', id: this.guestId, room: this.room.room });
    }
  }

  // ---- Messages ----

  _send(msg) {
    if (this.isOpen()) this.channel.send(JSON.stringify(msg));
  }

  _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (this.role === 'host' && msg.t === 'req') {
      // The first request names the guest; after that the link itself decides who is speaking.
      if (!this.guestId) this.guestId = String(msg.from || 'guest');
      const body = { ...msg.body, id: this.guestId, room: this.room.room };
      if (['start', 'rematch'].includes(body.op)) body.id = '#guest'; // only the host may do these
      const out = handleRace('POST', {}, body);
      this._send({ t: 'res', rid: msg.rid, json: out.body });
      this._refreshAndPush();
    } else if (this.role === 'guest' && msg.t === 'res') {
      const p = this.pending.get(msg.rid);
      if (p) { this.pending.delete(msg.rid); clearTimeout(p.timer); p.resolve(msg.json); }
    } else if (this.role === 'guest' && msg.t === 'view') {
      this._takeQuiet(msg.json);
    }
  }

  _takeQuiet(json) {
    if (json && json.ok && json.room) { this.room = json; this.clockOffset = json.now - Date.now(); }
  }

  _refreshAndPush() {
    const view = handleRace('GET', { room: this.room.room }).body;
    if (view.ok) {
      this._takeQuiet(view);
      this._send({ t: 'view', json: view });
    }
  }

  async _post(body) {
    const payload = { id: this.id, ...body };
    if (this.role === 'host') {
      const out = handleRace('POST', {}, payload).body;
      const json = this._take(out);
      if (this.isOpen()) this._refreshAndPush();
      return json;
    }
    if (!this.isOpen()) throw new Error('Connection closed');
    const rid = this.nextRid++;
    const answer = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(rid); reject(new Error('Opponent did not answer')); }, REQUEST_TIMEOUT_MS);
      this.pending.set(rid, { resolve, reject, timer });
      this._send({ t: 'req', rid, from: this.id, body: { ...body, room: '*' } });
    });
    return this._take(answer);
  }

  create(info) {
    this.role = 'host';
    return super.create(info);
  }

  join(_room, name) {
    return this._post({ op: 'join', name });
  }

  async poll() {
    if (!this.room) return null;
    if (this.closed && this.role === 'guest') throw new Error('Room not found');
    if (this.role === 'host') return this._take(handleRace('GET', { room: this.room.room }).body);
    return this.room;
  }

  async leave() {
    if (this.room && this.role === 'guest' && this.isOpen()) {
      try { await this._post({ op: 'leave' }); } catch { /* the host may already be gone */ }
    }
    if (this.role === 'host' && this.room) handleRace('POST', {}, { op: 'leave', id: this.id, room: this.room.room });
    this.room = null;
    this.closed = true;
    try { this.channel?.close(); } catch { /* already closed */ }
    try { this.pc?.close(); } catch { /* already closed */ }
  }
}
