/**
 * Bone Yard — Dominoes UI Controller
 *
 * Draws the table (opponents, layout, your hand, boneyard, scores) and drives
 * the computer players' turns. Click a tile in your hand to play it; if it
 * fits more than one open end, click the end you want.
 */

import { VARIANTS, VARIANT_IDS, buildSet } from '../games/dominoes.js';

const STORAGE_OPTS = 'dominoes_options';
const AI_DELAY_MS = 850;

const PIP_CELLS = {
  0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9], 7: [1, 3, 4, 5, 6, 7, 9], 8: [1, 2, 3, 4, 6, 7, 8, 9], 9: [1, 2, 3, 4, 5, 6, 7, 8, 9]
};

function loadOptions() {
  try {
    const o = JSON.parse(localStorage.getItem(STORAGE_OPTS) || '{}');
    return {
      variant: VARIANTS[o.variant] ? o.variant : 'draw',
      opponents: [1, 2, 3].includes(o.opponents) ? o.opponents : 2,
      rounds: [4, 7, 10].includes(o.rounds) ? o.rounds : 4
    };
  } catch {
    return { variant: 'draw', opponents: 2, rounds: 4 };
  }
}

function saveOptions(o) {
  try { localStorage.setItem(STORAGE_OPTS, JSON.stringify(o)); } catch {}
}

/** Options for the app's next startNewGame() call. */
export function getDominoNewGameOptions() {
  return loadOptions();
}

function halfHTML(n) {
  const dots = PIP_CELLS[n].map(c => `<i style="grid-row:${Math.ceil(c / 3)};grid-column:${((c - 1) % 3) + 1}"></i>`).join('');
  return `<div class="dm-half" data-n="${n}">${dots}</div>`;
}

function tileHTML(a, b, { vertical = false, id = null, cls = '' } = {}) {
  const idAttr = id === null ? '' : ` data-id="${id}"`;
  return `<div class="dm-tile ${vertical ? 'dm-v' : 'dm-h'} ${cls}"${idAttr}>${halfHTML(a)}<span class="dm-sep"></span>${halfHTML(b)}</div>`;
}

export class DominoView {
  constructor(app, containerEl) {
    this.app = app;
    this.container = containerEl;
    this.game = null;
    this.selectedTile = null;
    this.hint = null;
    this.hintTimer = null;
    this.aiTimer = null;
    this.opts = loadOptions();

    this._initDom();
    this._bindEvents();
  }

  setGame(game) {
    this.game = game;
    this.selectedTile = null;
    this.hint = null;
    clearTimeout(this.aiTimer);
    this.opts = { ...this.opts, variant: game.variant, opponents: game.state.players.length - 1 };
    this.variantSelect.value = game.variant;
    this.oppSelect.value = String(game.state.players.length - 1);
    if (game.state.rounds && game.isTrainGame) this.roundsSelect.value = String(game.state.rounds);
    this.render();
    this._schedule();
  }

  _initDom() {
    const variantOptions = VARIANT_IDS.map(id => `<option value="${id}">${VARIANTS[id].name}</option>`).join('');
    this.container.innerHTML = `
      <div class="dm-layout">
        <div class="dm-main">
          <div class="dm-opponents"></div>
          <div class="dm-table"><div class="dm-board"></div></div>
          <div class="dm-me">
            <div class="dm-banner"></div>
            <div class="dm-hand"></div>
            <div class="dm-actions">
              <button class="btn btn-secondary btn-sm dm-btn-draw">🂠 Draw</button>
              <button class="btn btn-secondary btn-sm dm-btn-pass">⏭ Pass</button>
              <button class="btn btn-secondary btn-sm dm-btn-hint">💡 Hint</button>
            </div>
          </div>
          <div class="dm-overlay hidden"></div>
        </div>
        <aside class="dm-panel">
          <div class="dm-brand"><span class="dm-brand-mark" aria-hidden="true">🁣</span><span class="dm-brand-name">Bone Yard</span></div>
          <label class="dm-field"><span>Game</span><select class="dm-variant custom-select">${variantOptions}</select></label>
          <div class="dm-row">
            <label class="dm-field"><span>Opponents</span>
              <select class="dm-opps custom-select"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>
            </label>
            <label class="dm-field dm-rounds-field"><span>Rounds</span>
              <select class="dm-rounds custom-select"><option value="4">4</option><option value="7">7</option><option value="10">10</option></select>
            </label>
          </div>
          <p class="dm-blurb"></p>
          <div class="dm-score"></div>
          <div class="dm-stock-row"><span class="dm-stock-label">Boneyard</span><span class="dm-stock-count">0</span></div>
          <div class="dm-log" aria-live="polite"></div>
        </aside>
      </div>`;

    const q = (s) => this.container.querySelector(s);
    this.opponentsEl = q('.dm-opponents');
    this.boardEl = q('.dm-board');
    this.handEl = q('.dm-hand');
    this.bannerEl = q('.dm-banner');
    this.overlayEl = q('.dm-overlay');
    this.scoreEl = q('.dm-score');
    this.logEl = q('.dm-log');
    this.drawBtn = q('.dm-btn-draw');
    this.passBtn = q('.dm-btn-pass');
    this.variantSelect = q('.dm-variant');
    this.oppSelect = q('.dm-opps');
    this.roundsSelect = q('.dm-rounds');
    this.variantSelect.value = this.opts.variant;
    this.oppSelect.value = String(this.opts.opponents);
    this.roundsSelect.value = String(this.opts.rounds);
  }

  _bindEvents() {
    const restart = () => {
      this.opts = {
        variant: this.variantSelect.value,
        opponents: Number(this.oppSelect.value),
        rounds: Number(this.roundsSelect.value)
      };
      saveOptions(this.opts);
      this.app.startNewGame();
    };
    this.variantSelect.addEventListener('change', restart);
    this.oppSelect.addEventListener('change', restart);
    this.roundsSelect.addEventListener('change', restart);

    this.handEl.addEventListener('click', (e) => {
      const el = e.target.closest('.dm-tile');
      if (el) this._onHandClick(Number(el.dataset.id), el);
    });
    this.boardEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.dm-end');
      if (btn) this._onEndClick(btn.dataset.end);
    });

    this.drawBtn.addEventListener('click', () => this.draw());
    this.passBtn.addEventListener('click', () => this.pass());
    this.container.querySelector('.dm-btn-hint').addEventListener('click', () => this.showHint());
    this.container.querySelector('.dm-stock-row').addEventListener('click', () => this.draw());
  }

  _active() {
    return this.app?.gameType === 'dominoes' && !!this.game;
  }

  _humanTurn() {
    const g = this.game;
    return g && g.state.phase === 'play' && g.state.players[g.state.turn].human;
  }

  // ------------------------------------------------------------------
  // Human actions
  // ------------------------------------------------------------------

  _onHandClick(id, el) {
    const g = this.game;
    if (!this._humanTurn()) return;
    const moves = g.legalMoves(0).filter(m => m.tile === id);
    if (!moves.length) {
      el.classList.remove('dm-nudge'); void el.offsetWidth; el.classList.add('dm-nudge');
      this.app.sound?.playCardSlide?.();
      return;
    }
    if (moves.length === 1) { this._play(id, moves[0].end); return; }
    this.selectedTile = this.selectedTile === id ? null : id;
    this.app.sound?.playCardFlip?.();
    this.render();
  }

  _onEndClick(endId) {
    if (!this._humanTurn() || this.selectedTile === null) return;
    const ok = this.game.legalMoves(0).some(m => m.tile === this.selectedTile && m.end === endId);
    if (ok) this._play(this.selectedTile, endId);
  }

  _play(tile, end) {
    const res = this.game.play(tile, end);
    if (!res.ok) return;
    this.selectedTile = null;
    this.hint = null;
    this.app.sound?.playCardSnap?.();
    if (res.points) this.app.sound?.playFoundationSnap?.(Math.min(12, res.points / 5));
    this._changed();
  }

  draw() {
    if (!this._humanTurn() || this.game.turnNeeds(0) !== 'draw') return;
    if (this.game.draw().ok) { this.app.sound?.playCardFlip?.(); this.hint = null; this._changed(); }
  }

  pass() {
    if (!this._humanTurn() || this.game.turnNeeds(0) !== 'pass') return;
    if (this.game.pass().ok) { this.hint = null; this._changed(); }
  }

  showHint(hint = this.game?.getTacticalHint(), { silent = false } = {}) {
    if (!hint || !this._humanTurn()) return;
    this.hint = hint;
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => { this.hint = null; this.render(); }, 4500);
    if (!silent) this.bannerEl.textContent = hint.message;
    this.render();
  }

  _changed() {
    this.app.render();
    this.app._autoSaveState?.();
    this._schedule();
  }

  // ------------------------------------------------------------------
  // Computer turns
  // ------------------------------------------------------------------

  _schedule() {
    clearTimeout(this.aiTimer);
    const g = this.game;
    if (!g || !this._active()) return;
    const s = g.state;
    if (s.phase !== 'play' || s.players[s.turn].human) return;
    this.aiTimer = setTimeout(() => this._aiStep(g), AI_DELAY_MS);
  }

  _aiStep(game) {
    if (game !== this.game || !this._active()) return;
    if (game.state.phase !== 'play' || game.state.players[game.state.turn].human) return;
    const res = game.autoStep();
    if (res?.action === 'play') this.app.sound?.playCardSnap?.();
    else if (res?.action === 'draw') this.app.sound?.playCardFlip?.();
    this._changed();
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------

  render() {
    const g = this.game;
    if (!g) return;
    const s = g.state;
    const q = (sel) => this.container.querySelector(sel);

    q('.dm-blurb').textContent = g.config.blurb;
    q('.dm-rounds-field').classList.toggle('hidden', !g.isTrainGame);
    q('.dm-stock-count').textContent = s.stock.length;

    this._renderOpponents();
    this._renderBoard();
    this._renderHand();
    this._renderScore();
    this._renderBanner();
    this._renderOverlay();

    this.logEl.innerHTML = s.log.slice(-9).reverse().map((t, i) => `<div class="dm-log-line${i === 0 ? ' dm-log-new' : ''}">${t}</div>`).join('');
  }

  _renderOpponents() {
    const s = this.game.state;
    this.opponentsEl.innerHTML = s.players.slice(1).map((p, k) => {
      const i = k + 1;
      const backs = p.hand.map(() => '<span class="dm-back"></span>').join('');
      const active = s.phase === 'play' && s.turn === i;
      return `<div class="dm-opp${active ? ' dm-active' : ''}">
        <div class="dm-opp-name">${p.name}${active ? ' <span class="dm-thinking">thinking…</span>' : ''}</div>
        <div class="dm-backs">${backs}</div>
        <div class="dm-opp-count">${p.hand.length} tile${p.hand.length === 1 ? '' : 's'}</div>
      </div>`;
    }).join('');
  }

  _endTargets() {
    const g = this.game;
    if (!this._humanTurn()) return new Set();
    const moves = g.legalMoves(0);
    if (this.selectedTile !== null) return new Set(moves.filter(m => m.tile === this.selectedTile).map(m => m.end));
    return new Set();
  }

  _renderBoard() {
    const g = this.game;
    const s = g.state;
    const targets = this._endTargets();
    const hintEnd = this.hint && this.hint.action === 'PLAY' ? this.hint.end : null;
    const lastId = s.lastPlay && s.lastPlay.tile ? s.lastPlay.tile.join('-') : null;

    const endBtn = (e) => {
      const cls = ['dm-end'];
      if (targets.has(e.id)) cls.push('dm-target');
      if (hintEnd === e.id) cls.push('dm-hint');
      if (s.openDouble === e.id) cls.push('dm-open-double');
      return `<button class="${cls.join(' ')}" data-end="${e.id}" title="${e.label}"><span class="dm-end-val">${e.value}</span></button>`;
    };
    const boardTile = (t, flipped = false) => {
      const [x, y] = flipped ? [t.b, t.a] : [t.a, t.b];
      const last = lastId && `${Math.min(t.a, t.b)}-${Math.max(t.a, t.b)}` === lastId ? 'dm-last' : '';
      return tileHTML(x, y, { vertical: t.double, cls: last });
    };
    const centerHTML = tileHTML(s.center.a, s.center.b, { vertical: s.center.double, cls: 'dm-center' });

    if (!g.isTrainGame) {
      const L = s.ends.find(e => e.id === 'L');
      const R = s.ends.find(e => e.id === 'R');
      const left = [...L.tiles].reverse().map(t => boardTile(t, true)).join('');
      const right = R.tiles.map(t => boardTile(t)).join('');
      this.boardEl.innerHTML = `<div class="dm-line">${endBtn(L)}${left}${centerHTML}${right}${endBtn(R)}</div>`;
      return;
    }

    const rows = s.ends.map(e => {
      const owner = e.owner !== null && e.owner !== undefined ? s.players[e.owner] : null;
      const turnMark = owner && s.phase === 'play' && s.turn === e.owner ? ' dm-row-turn' : '';
      const flag = e.marker ? '<span class="dm-flag" title="Open train">⚑ open</span>' : '';
      return `<div class="dm-train${turnMark}"><div class="dm-train-label">${e.label} ${flag}</div>
        <div class="dm-train-line">${e.tiles.map(t => boardTile(t)).join('')}${endBtn(e)}</div></div>`;
    }).join('');
    this.boardEl.innerHTML = `<div class="dm-hub">${centerHTML}</div><div class="dm-trains">${rows}</div>`;
  }

  _renderHand() {
    const g = this.game;
    const s = g.state;
    const human = this._humanTurn();
    const playable = new Set(human ? g.legalMoves(0).map(m => m.tile) : []);
    const hintTile = this.hint && this.hint.action === 'PLAY' ? this.hint.tile : null;
    this.handEl.innerHTML = s.players[0].hand.map(id => {
      const [a, b] = g.tiles[id];
      const cls = [];
      if (human && playable.has(id)) cls.push('dm-playable');
      if (human && !playable.has(id)) cls.push('dm-dim');
      if (this.selectedTile === id) cls.push('dm-selected');
      if (hintTile === id) cls.push('dm-hint');
      return tileHTML(a, b, { vertical: true, id, cls: cls.join(' ') });
    }).join('');

    const needs = human ? g.turnNeeds(0) : 'none';
    this.drawBtn.disabled = needs !== 'draw';
    this.passBtn.disabled = needs !== 'pass';
    this.drawBtn.classList.toggle('dm-attention', needs === 'draw');
    this.passBtn.classList.toggle('dm-attention', needs === 'pass');
  }

  _renderBanner() {
    const g = this.game;
    const s = g.state;
    if (s.phase !== 'play') { this.bannerEl.textContent = ''; return; }
    if (!this._humanTurn()) { this.bannerEl.textContent = `${s.players[s.turn].name} is playing…`; return; }
    if (this.hint) return; // keep the hint text visible
    const needs = g.turnNeeds(0);
    let text;
    if (needs === 'draw') text = 'No tile fits. Draw from the boneyard.';
    else if (needs === 'pass') text = 'No move and nothing left to draw. Pass.';
    else if (s.openDouble) text = 'A double must be covered. Play on the highlighted end.';
    else if (this.selectedTile !== null) text = 'Choose which end to play on.';
    else text = 'Your turn. Click a glowing tile.';
    this.bannerEl.textContent = text;
  }

  _renderScore() {
    const g = this.game;
    const s = g.state;
    const train = g.isTrainGame;
    const head = train
      ? `<div class="dm-score-head">Round ${s.round} of ${s.rounds} · lowest total wins</div>`
      : `<div class="dm-score-head">First to ${s.target} points · round ${s.round}</div>`;
    const rows = s.players.map((p, i) => `<div class="dm-score-row${s.phase === 'play' && s.turn === i ? ' dm-active' : ''}">
        <span class="dm-score-name">${p.name}</span>
        <span class="dm-score-rw" title="Rounds won">${p.roundsWon}★</span>
        <span class="dm-score-val">${p.score}</span></div>`).join('');
    this.scoreEl.innerHTML = head + rows;
  }

  _renderOverlay() {
    const g = this.game;
    const s = g.state;
    if (s.phase === 'play' || !s.roundResult) { this.overlayEl.classList.add('hidden'); return; }
    const r = s.roundResult;
    const matchOver = s.phase === 'matchEnd';
    const title = matchOver
      ? (s.won ? 'You win the match!' : `${s.players[s.winner].name} wins the match`)
      : (r.winner === 0 ? 'You win the round!' : `${s.players[r.winner].name} wins the round`);
    const train = g.isTrainGame;
    const rows = s.players.map((p, i) => `<tr class="${i === r.winner ? 'dm-win' : ''}">
        <td>${p.name}</td><td>${r.pips[i]}</td><td>${r.gains[i] ? '+' + r.gains[i] : '–'}</td><td>${p.score}</td></tr>`).join('');
    this.overlayEl.innerHTML = `<div class="dm-card">
      <div class="dm-card-title">${title}</div>
      <div class="dm-card-sub">${r.blocked ? 'The game was blocked; the lowest hand wins.' : 'Round complete.'}</div>
      <table class="dm-table-sum"><thead><tr><th></th><th>Pips left</th><th>${train ? 'Added' : 'Scored'}</th><th>${train ? 'Total pips' : 'Total'}</th></tr></thead><tbody>${rows}</tbody></table>
      <button class="btn btn-primary dm-next">${matchOver ? 'New match' : 'Next round'}</button>
    </div>`;
    this.overlayEl.classList.remove('hidden');
    this.overlayEl.querySelector('.dm-next').addEventListener('click', () => {
      if (matchOver) { this.app.startNewGame(); return; }
      this.game.nextRound();
      this.selectedTile = null;
      this._changed();
    });
  }
}

export { buildSet };
