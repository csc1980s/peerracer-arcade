/**
 * PeerRacer Arcade - race panel.
 *
 * A small dock on the arcade games that lets players meet in a room, start on a
 * shared countdown, play the same deal, and see who finishes first. The rules and
 * relay client live in core/race_match.js; this file is the screen for them.
 */

import { P2PRaceClient } from '../core/race_p2p.js';
import { RaceClient, RACE_GAMES, isRaceGame, snapshotGame, standings, raceOver, describeResult, encodeResultCode, decodeResultCode, compareResults } from '../core/race_match.js';

export const ARCADE_GAMES = new Set(['mahjong', 'sudoku', 'keystone_drop', 'dominoes', 'trash_conveyor', 'word_tiles', 'tank_minefield', 'admirals_gambit']);
const POLL_MS = 1000;
const NAME_KEY = 'peerracer_name';

const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ordinal = (n) => { const v = n % 100; return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th'); };

export class RacePanel {
  constructor(app) {
    this.app = app;
    this.client = new RaceClient();
    this.state = 'idle';          // idle | lobby | countdown | racing | finished
    this.round = 0;
    this.finalSent = false;
    this.lastResult = null;       // my final record for the result code
    this.message = '';
    this.open = false;
    this.p2p = null;              // direct-connection setup: { role, step, offer, answer, busy }

    this.el = document.createElement('div');
    this.el.id = 'race-dock';
    this.el.className = 'race-dock hidden';
    this.el.innerHTML = `
      <button type="button" class="race-toggle" aria-expanded="false">🏁 <span>Race</span></button>
      <div class="race-body hidden"></div>
      <div class="race-countdown hidden" aria-live="assertive"></div>`;
    document.body.appendChild(this.el);
    this.toggleBtn = this.el.querySelector('.race-toggle');
    this.body = this.el.querySelector('.race-body');
    this.countdownEl = this.el.querySelector('.race-countdown');

    this.toggleBtn.addEventListener('click', () => this._setOpen(!this.open));
    this.body.addEventListener('click', (e) => this._onClick(e));
    this.body.addEventListener('input', (e) => {
      if (e.target.classList?.contains('race-name') && e.target.value.trim()) { try { localStorage.setItem(NAME_KEY, e.target.value.trim()); } catch { /* storage may be blocked */ } }
    });
    this.timer = setInterval(() => this._tick(), POLL_MS);
    this._drawBody();
  }

  // ---- Visibility and branding ----

  /** Called from the app's render(): shows the dock on racing games. */
  sync() {
    const type = this.app.gameType;
    const inRace = this.state !== 'idle';
    this.el.classList.toggle('hidden', !(isRaceGame(type) || inRace));
  }

  _setOpen(open) {
    this.open = open;
    this.body.classList.toggle('hidden', !open);
    this.toggleBtn.setAttribute('aria-expanded', String(open));
    if (open) this._drawBody();
  }

  // ---- Names and options ----

  _name() {
    const typed = this.body.querySelector('.race-name')?.value?.trim();
    if (typed) { try { localStorage.setItem(NAME_KEY, typed); } catch { /* storage may be blocked */ } return typed; }
    try { const saved = localStorage.getItem(NAME_KEY); if (saved) return saved; } catch { /* ignore */ }
    return this.app.profiles?.getActiveProfile?.()?.name || 'Player';
  }

  // ---- Actions ----

  async _onClick(e) {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    try {
      if (act === 'host') await this._host();
      else if (act === 'join') await this._join();
      else if (act === 'start') { await this.client.start(); this._applyRoom(this.client.room); }
      else if (act === 'leave') await this._leave();
      else if (act === 'p2p-host') await this._p2pHost();
      else if (act === 'p2p-accept') await this._p2pAccept();
      else if (act === 'p2p-join') { this.p2p = { role: 'guest', step: 'paste' }; this._drawBody(); }
      else if (act === 'p2p-answer') await this._p2pAnswer();
      else if (act === 'p2p-cancel') await this._leave();
      else if (act === 'copy-offer') await this._copy(this.p2p.offer, e.target);
      else if (act === 'copy-answer') await this._copy(this.p2p.answer, e.target);
      else if (act === 'rematch') { await this.client.rematch(Math.floor(Math.random() * 2147483647)); this._applyRoom(this.client.room); }
      else if (act === 'copy-code') await this._copy(this.client.room.room, e.target);
      else if (act === 'copy-result') await this._copy(this._myResultCode(), e.target);
      else if (act === 'compare') this._compare();
    } catch (err) {
      this.message = err.message || 'Something went wrong';
      this._drawBody();
    }
  }

  // ---- Direct two-player connection (no server) ----

  _p2pFail(err) {
    this.message = err.message || 'Could not connect';
    this._drawBody();
  }

  async _p2pHost() {
    const game = this.app.gameType;
    if (!isRaceGame(game)) throw new Error('Pick one of the racing games first.');
    const client = new P2PRaceClient();
    this.client = client;
    await client.create({ game, seed: Math.floor(Math.random() * 2147483647), options: this.app.getRaceOptions(game), name: this._name() });
    this.message = '';
    this.state = 'lobby';
    this.p2p = { role: 'host', step: 'offer', busy: true };
    this._setOpen(true);
    this._drawBody();
    try {
      this.p2p.offer = await client.hostOffer();
      this.p2p.busy = false;
    } catch (err) { this.p2p = null; await this._leave(); return this._p2pFail(err); }
    client.whenOpen().then(() => { if (this.client === client) { this.p2p = null; this.message = ''; this._drawBody(); } }, () => {});
    this._drawBody();
  }

  async _p2pAccept() {
    const code = this.body.querySelector('.race-p2p-input')?.value;
    this.message = '';
    this.p2p.busy = true;
    this._drawBody();
    try { await this.client.acceptAnswer(code); this.p2p.step = 'connecting'; }
    catch (err) { this.message = err.message; }
    this.p2p.busy = false;
    this._drawBody();
  }

  async _p2pAnswer() {
    const code = this.body.querySelector('.race-p2p-input')?.value;
    const client = new P2PRaceClient();
    this.message = '';
    this.p2p = { role: 'guest', step: 'paste', busy: true };
    this._drawBody();
    try {
      this.p2p.answer = await client.guestAnswer(code);
    } catch (err) { this.p2p = { role: 'guest', step: 'paste' }; return this._p2pFail(err); }
    this.client = client;
    this.p2p.step = 'answer';
    this.p2p.busy = false;
    this._drawBody();
    client.whenOpen().then(async () => {
      if (this.client !== client) return;
      await client.join(null, this._name());
      this.p2p = null;
      this.state = 'lobby';
      this._applyRoom(client.room);
    }).catch((err) => { if (this.client === client) { this.p2p = null; this._p2pFail(err); } });
  }

  _p2pSetupHtml(esc) {
    const p = this.p2p;
    const msg = this.message ? `<p class="race-msg">${esc(this.message)}</p>` : '';
    const cancel = '<button type="button" class="race-btn race-quiet" data-act="p2p-cancel">Cancel</button>';
    if (p.role === 'host') {
      if (p.busy && !p.offer) return `<h3>Direct race (P2P)</h3><p class="race-help">Preparing your connection code\u2026</p>${cancel}`;
      return `<h3>Direct race (P2P)</h3>
        <p class="race-help"><b>1.</b> Send this code to your opponent.</p>
        <textarea class="race-p2p-code" readonly rows="3">${esc(p.offer || '')}</textarea>
        <button type="button" class="race-btn" data-act="copy-offer">Copy code</button>
        <p class="race-help"><b>2.</b> Paste the reply code they send back.</p>
        <textarea class="race-p2p-input" rows="3" placeholder="Reply code (starts with PRP1)"></textarea>
        <button type="button" class="race-btn race-primary" data-act="p2p-accept"${p.busy ? ' disabled' : ''}>${p.step === 'connecting' ? 'Connecting\u2026' : 'Connect'}</button>
        ${msg}${cancel}`;
    }
    if (p.step === 'answer') {
      return `<h3>Direct race (P2P)</h3>
        <p class="race-help"><b>2.</b> Send this reply code back to the host. You connect as soon as they paste it.</p>
        <textarea class="race-p2p-code" readonly rows="3">${esc(p.answer || '')}</textarea>
        <button type="button" class="race-btn" data-act="copy-answer">Copy reply code</button>
        ${msg}${cancel}`;
    }
    return `<h3>Join a direct race</h3>
      <p class="race-help"><b>1.</b> Paste the code your friend sent you.</p>
      <textarea class="race-p2p-input" rows="3" placeholder="Host code (starts with PRP1)"></textarea>
      <button type="button" class="race-btn race-primary" data-act="p2p-answer"${p.busy ? ' disabled' : ''}>${p.busy ? 'Working\u2026' : 'Make reply code'}</button>
      ${msg}${cancel}`;
  }

  async _copy(text, btn) {
    try { await navigator.clipboard.writeText(text); const was = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = was; }, 1200); }
    catch { this.message = 'Copy failed. Select the text and copy it by hand.'; this._drawBody(); }
  }

  async _host() {
    const game = this.app.gameType;
    if (!isRaceGame(game)) throw new Error('Pick one of the racing games first.');
    const seed = Math.floor(Math.random() * 2147483647);
    await this.client.create({ game, seed, options: this.app.getRaceOptions(game), name: this._name() });
    this.message = '';
    this.state = 'lobby';
    this._setOpen(true);
    this._drawBody();
  }

  async _join() {
    const code = this.body.querySelector('.race-code-input')?.value?.trim().toUpperCase();
    if (!code) throw new Error('Type the five-letter room code first.');
    await this.client.join(code, this._name());
    this.message = '';
    this.state = 'lobby';
    this._applyRoom(this.client.room);
  }

  async _leave() {
    if (this.state === 'racing' && !this.finalSent) await this._sendForfeit();
    await this.client.leave();
    this.client = new RaceClient();
    this.p2p = null;
    this._reset();
  }

  _reset() {
    this.state = 'idle';
    this.finalSent = false;
    this.lastResult = null;
    this.countdownEl.classList.add('hidden');
    this.message = '';
    this._drawBody();
  }

  async _sendForfeit() {
    try { await this.client.report({ forfeit: true, finished: true }); } catch { /* the room may be gone */ }
    this.finalSent = true;
  }

  /** The app calls this when the player starts a game on their own. */
  onManualNewGame() {
    if (this.state === 'racing' && !this.finalSent) {
      this.message = 'You left the race by starting a new game.';
      this._sendForfeit().then(() => this._drawBody());
      this.state = 'finished';
    }
  }

  // ---- Room updates ----

  async _tick() {
    if (!this.client.room) return;
    try {
      if (this.state === 'racing' && !this.finalSent) await this._report();
      await this.client.poll();
      this._applyRoom(this.client.room);
    } catch (err) {
      if (/not found/i.test(err.message)) {
        try { await this.client.leave(); } catch { /* already gone */ }
        this.client = new RaceClient();
        this.p2p = null;
        this.message = 'The room has closed.';
        this._reset();
      }
    }
  }

  _applyRoom(room) {
    if (!room) return;
    if (room.status === 'lobby' && this.state !== 'lobby' && this.state !== 'idle') {
      this.state = 'lobby';           // host set up a rematch
      this.finalSent = false;
      this.lastResult = null;
      this.countdownEl.classList.add('hidden');
    }
    if (room.status === 'racing' && room.round !== this.round && this.state !== 'countdown') {
      this.round = room.round;
      this.state = 'countdown';
      this.finalSent = false;
      this._setOpen(false);
      this._runCountdown(room);
    }
    if (this.state === 'racing' && raceOver(room.players)) this.state = 'finished';
    if (this.open) this._drawBody();
  }

  _runCountdown(room) {
    this.countdownEl.classList.remove('hidden');
    const step = () => {
      const left = room.startAt - this.client.serverNow();
      if (left <= 0) {
        this.countdownEl.textContent = 'GO!';
        setTimeout(() => this.countdownEl.classList.add('hidden'), 700);
        this._go(room);
        return;
      }
      this.countdownEl.textContent = String(Math.ceil(left / 1000));
      setTimeout(step, Math.min(200, left));
    };
    step();
  }

  _go(room) {
    const app = this.app;
    app.raceOverrides = { seed: room.seed, options: room.options || {} };
    app.gameType = room.game;
    const select = document.getElementById('select-game-mode');
    if (select) select.value = room.game;
    try { localStorage.setItem('solitaire_last_mode', room.game); } catch { /* ignore */ }
    app.startNewGame(room.seed);
    this.state = 'racing';
    this.finalSent = false;
    this._report();
    this._drawBody();
  }

  async _report() {
    const app = this.app;
    const snap = snapshotGame(app.gameType, app.currentGame, app.elapsedSeconds);
    if (!snap) return;
    if (snap.finished) {
      this.finalSent = true;
      this.lastResult = snap;
    }
    await this.client.report(snap);
  }

  // ---- Drawing ----

  _myResultCode() {
    const room = this.client.room;
    return encodeResultCode({ game: room.game, seed: room.seed, options: room.options, name: this._name(), data: this.lastResult || room.players[this.client.id]?.data });
  }

  _compare() {
    const room = this.client.room;
    const box = this.body.querySelector('.race-compare-out');
    const rival = decodeResultCode(this.body.querySelector('.race-rival-input')?.value);
    const mine = this.lastResult || room?.players[this.client.id]?.data;
    if (!rival) { box.textContent = 'That result code is not valid.'; return; }
    if (!room || rival.game !== room.game || rival.seed !== room.seed) { box.textContent = 'That result is from a different deal, so it cannot be compared.'; return; }
    const c = compareResults(mine, rival.data);
    box.textContent = c === 0 ? `A tie with ${rival.name}.` : (c < 0 ? `You beat ${rival.name}: ${describeResult(mine)} vs ${describeResult(rival.data)}.` : `${rival.name} beat you: ${describeResult(rival.data)} vs ${describeResult(mine)}.`);
  }

  _drawBody() {
    if (!this.open && this.body.classList.contains('hidden')) return;
    const room = this.client.room;
    const game = RACE_GAMES[room ? room.game : this.app.gameType];
    const gameName = game ? game.label : '';
    const keep = { name: this.body.querySelector('.race-name')?.value, code: this.body.querySelector('.race-code-input')?.value, rival: this.body.querySelector('.race-rival-input')?.value };
    let html = '';
    if (this.p2p) {
      const keepIn = this.body.querySelector('.race-p2p-input')?.value;
      this.body.innerHTML = this._p2pSetupHtml(esc);
      const input = this.body.querySelector('.race-p2p-input');
      if (input && keepIn) input.value = keepIn;
      return;
    }
    const msg = this.message ? `<p class="race-msg">${esc(this.message)}</p>` : '';

    if (this.state === 'idle' || !room) {
      html = `
        <h3>PeerRacer Race</h3>
        <p class="race-help">Everyone plays the same ${esc(gameName || 'deal')}. Fastest clean finish wins.</p>
        <label class="race-label">Your name <input class="race-name" maxlength="20" value="${esc(keep.name ?? this._name())}"></label>
        <button type="button" class="race-btn race-primary" data-act="host"${isRaceGame(this.app.gameType) ? '' : ' disabled'}>Host a race</button>
        <div class="race-or">or join a friend</div>
        <div class="race-row"><input class="race-code-input" maxlength="5" placeholder="CODE" value="${esc(keep.code ?? '')}" autocomplete="off"><button type="button" class="race-btn" data-act="join">Join</button></div>
        <p class="race-help">A friend on your network opens this page from your computer's address, for example <code>http://your-pc-address:3000</code>, then joins with the code.</p>
        <div class="race-or">or play direct, 2 players, no server</div>
        <div class="race-row"><button type="button" class="race-btn" data-act="p2p-host"${isRaceGame(this.app.gameType) ? '' : ' disabled'}>Host direct</button><button type="button" class="race-btn" data-act="p2p-join">Join direct</button></div>
        <p class="race-help">You swap two codes by message, then your browsers connect straight to each other.</p>
        ${msg}`;
    } else {
      const list = standings(room.players);
      const meId = this.client.id;
      const rows = list.map((p, i) => {
        const d = p.data;
        const pct = Math.round((d?.progress || 0) * 100);
        const done = d && d.finished && !d.forfeit;
        return `<li class="${p.id === meId ? 'race-me' : ''}">
          <span class="race-rank">${this.state === 'lobby' ? '•' : ordinal(i + 1)}</span>
          <span class="race-pname">${esc(p.name)}${p.id === room.hostId ? ' ★' : ''}</span>
          <span class="race-bar"><i style="width:${d ? pct : 0}%"></i></span>
          <span class="race-res">${this.state === 'lobby' ? 'ready' : esc(describeResult(d))}${done && d.won ? ' ✓' : ''}</span></li>`;
      }).join('');
      const count = Object.keys(room.players).length;
      const host = this.client.isHost();
      let head = '';
      let foot = '';
      if (this.state === 'lobby') {
        head = `<h3>${esc(gameName)} room</h3>
          <div class="race-roomcode"><b>${esc(room.room)}</b><button type="button" class="race-btn" data-act="copy-code">Copy code</button></div>
          <p class="race-help">Friends join with this code. ${count} in the room.</p>`;
        foot = host
          ? `<button type="button" class="race-btn race-primary" data-act="start"${count < 2 ? ' disabled' : ''}>${count < 2 ? 'Waiting for an opponent' : 'Start race'}</button>`
          : '<p class="race-help">Waiting for the host to start.</p>';
      } else if (this.state === 'finished') {
        const place = list.findIndex(p => p.id === meId) + 1;
        head = `<h3>${place === 1 ? '🏆 You won the race!' : `You finished ${ordinal(place)}`}</h3>`;
        foot = `${host ? '<button type="button" class="race-btn race-primary" data-act="rematch">Rematch on a new deal</button>' : '<p class="race-help">The host can start a rematch.</p>'}
          <details class="race-share"><summary>Share or compare a result</summary>
            <button type="button" class="race-btn" data-act="copy-result">Copy my result code</button>
            <input class="race-rival-input" placeholder="Paste a rival's result code" value="${esc(keep.rival ?? '')}">
            <button type="button" class="race-btn" data-act="compare">Compare</button>
            <p class="race-compare-out race-help"></p></details>`;
      } else {
        head = `<h3>${esc(gameName)} race</h3>`;
      }
      html = `${head}<ol class="race-list">${rows}</ol>${foot}${msg}<button type="button" class="race-btn race-quiet" data-act="leave">${this.state === 'racing' ? 'Forfeit and leave' : 'Leave room'}</button>`;
    }
    this.body.innerHTML = html;
  }
}
