/**
 * Jimothy's Trash Conveyor Frenzy - UI controller
 *
 * Draws the factory on a 600 x 760 canvas and runs the loop while the mode is on
 * screen. Controls:
 *   Move:       Left / Right arrows or A / D (hold to keep moving), or drag on the board.
 *   Pick a bin: 1 2 3, Q W E, or J K L jump straight to Yellow, Green or Red.
 *               Up / Shift / Backspace step to the previous bin, Down / Space / Tab to the next.
 *   P pauses. On-screen buttons mirror every action for touch.
 */

import { WORLD, CANS, CAN_INFO, ITEM_TYPES, SPEEDS, DEFAULT_SPEED, LEVELS, LEVEL_SECONDS } from '../games/trash_conveyor.js?v=20261023_v1';
import { drawThemeBackground } from './trash_conveyor_backgrounds.js?v=20261023_v1';

const STORAGE_SPEED = 'jimothy_speed';
const STORAGE_BEST = 'jimothy_best';
const KEY_CAN = { 1: 0, 2: 1, 3: 2, q: 0, w: 1, e: 2, j: 0, k: 1, l: 2 };
const KEY_CYCLE_NEXT = new Set(['ArrowDown', ' ', 'Tab']);
const KEY_CYCLE_PREV = new Set(['ArrowUp', 'Shift', 'Backspace']);

function readStore(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* storage may be blocked */ }
}

/** Options for the app's next startNewGame() call. */
export function getTrashConveyorNewGameOptions() {
  const speed = readStore(STORAGE_SPEED, DEFAULT_SPEED);
  return { speed: SPEEDS[speed] ? speed : DEFAULT_SPEED };
}

export class TrashConveyorView {
  constructor(app, containerEl) {
    this.app = app;
    this.container = containerEl;
    this.game = null;
    this.paused = false;
    this.rafId = 0;
    this.lastTs = 0;
    this.keysDown = { left: false, right: false };
    this.particles = [];
    this.floaters = [];
    this.bob = 0;
    this.bounceFlash = {};
    this.bgCache = {};
    this.tilt = 0;
    this.lastX = 0;
    this.recorded = false;
    this.best = Number(readStore(STORAGE_BEST, 0)) || 0;
    this._initDom();
    this._bindEvents();
  }

  /** True for keys this game uses, so the app's own shortcuts stay out of the way. */
  ownsKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const k = e.key;
    if (k === 'Enter' && this.game?.state.phase === 'between') return true;
    return ['a', 'A', 'd', 'D', 'p', 'P', 'ArrowLeft', 'ArrowRight'].includes(k) ||
      KEY_CYCLE_NEXT.has(k) || KEY_CYCLE_PREV.has(k) || Object.prototype.hasOwnProperty.call(KEY_CAN, String(k).toLowerCase());
  }

  setGame(game) {
    this.game = game;
    this.paused = false;
    this.particles = [];
    this.floaters = [];
    this.keysDown = { left: false, right: false };
    this.recorded = false;
    this.lastX = game.state.jimothy.x;
    this.bounceFlash = {};
    const st = game.state;
    this._showOverlay(st.over ? this._overInfo() : (st.phase === 'between' ? this._summaryInfo() : null));
    if (!st.over && st.phase === 'play' && st.levelTime < 0.5) this._announceLevel();
    const sel = this.container.querySelector('.jm-speed');
    if (sel) sel.value = game.state.speed;
    this._startLoop();
    this.render();
  }

  _initDom() {
    const speedOptions = Object.values(SPEEDS).map(s => `<option value="${s.id}">${s.label}</option>`).join('');
    const canButtons = CANS.map((c, i) => `
      <button type="button" class="jm-can" data-can="${c}" style="--can:${CAN_INFO[c].color}">
        <span class="jm-can-emoji">${CAN_INFO[c].emoji}</span>
        <span class="jm-can-name">${CAN_INFO[c].label}</span>
        <span class="jm-can-keys"><kbd>${i + 1}</kbd><kbd>${'QWE'[i]}</kbd><kbd>${'JKL'[i]}</kbd></span>
      </button>`).join('');
    this.container.innerHTML = `
      <div class="jm-layout">
        <div class="jm-board-col">
          <div class="jm-board-wrap">
            <canvas class="jm-board" aria-label="Trash conveyor"></canvas>
            <div class="jm-banner" aria-live="polite"></div>
            <div class="jm-overlay hidden" role="status">
              <div class="jm-overlay-title"></div>
              <div class="jm-overlay-text"></div>
              <button class="btn btn-primary btn-sm jm-overlay-main"></button>
            </div>
          </div>
        </div>
        <aside class="jm-panel">
          <div class="jm-brand"><span class="jm-brand-mark" aria-hidden="true">🦝</span><span class="jm-brand-name">Jimothy's Trash Conveyor Frenzy</span></div>
          <div class="jm-stats">
            <div class="jm-stat"><span class="jm-stat-label">Level</span><span class="jm-stat-val jm-level">1/5</span></div>
            <div class="jm-stat"><span class="jm-stat-label">Time</span><span class="jm-stat-val jm-time">0:50</span></div>
            <div class="jm-stat"><span class="jm-stat-label">Combo</span><span class="jm-stat-val jm-combo">1x</span></div>
            <div class="jm-stat"><span class="jm-stat-label">Best</span><span class="jm-stat-val jm-best">0</span></div>
          </div>
          <div class="jm-tray"></div>
          <div class="jm-cans">${canButtons}</div>
          <div class="jm-row">
            <label class="jm-field">Speed
              <select class="jm-speed custom-select">${speedOptions}</select>
            </label>
            <button class="btn btn-secondary btn-sm jm-btn-pause">⏸ Pause</button>
          </div>
          <div class="jm-controls">
            <div><kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd> move (hold)</div>
            <div>Pick a bin: <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> · <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd> · <kbd>J</kbd><kbd>K</kbd><kbd>L</kbd></div>
            <div>Step bins: <kbd>↑</kbd> back · <kbd>↓</kbd> / <kbd>Space</kbd> next</div>
            <div><kbd>P</kbd> pause · <kbd>H</kbd> Teacher tip</div>
          </div>
          <div class="jm-touch">
            <button class="jm-tbtn" data-act="left" aria-label="Move left">◀</button>
            <button class="jm-tbtn" data-act="prev" aria-label="Previous bin">⟲</button>
            <button class="jm-tbtn" data-act="next" aria-label="Next bin">⟳</button>
            <button class="jm-tbtn" data-act="right" aria-label="Move right">▶</button>
          </div>
        </aside>
      </div>`;
    const q = (s) => this.container.querySelector(s);
    this.canvas = q('.jm-board');
    this.ctx = this.canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = WORLD.w * dpr;
    this.canvas.height = WORLD.h * dpr;
    this.dpr = dpr;
    this.overlayEl = q('.jm-overlay');
    this.bannerEl = q('.jm-banner');
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));
    window.addEventListener('blur', () => this._releaseKeys());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this._pause(true); });

    const q = (s) => this.container.querySelector(s);
    q('.jm-btn-pause').addEventListener('click', () => this._pause(!this.paused));
    q('.jm-overlay-main').addEventListener('click', () => {
      const g = this.game;
      if (g && g.state.over) this.app.startNewGame();
      else if (g && g.state.phase === 'between') this._nextLevel();
      else this._pause(false);
    });
    q('.jm-speed').addEventListener('change', (e) => {
      writeStore(STORAGE_SPEED, e.target.value);
      this.app.startNewGame();
    });
    for (const btn of this.container.querySelectorAll('.jm-can')) {
      btn.addEventListener('click', () => this._setCan(btn.dataset.can));
    }
    for (const btn of this.container.querySelectorAll('.jm-tbtn')) {
      const act = btn.dataset.act;
      const down = (e) => { e.preventDefault(); this._action(act, true); };
      const up = (e) => { e.preventDefault(); this._action(act, false); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
    }

    // Drag on the board to steer.
    let dragging = false;
    const steer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.game?.setTargetX(((e.clientX - rect.left) / rect.width) * WORLD.w);
    };
    this.canvas.addEventListener('pointerdown', (e) => { if (this.paused) return; dragging = true; this.canvas.setPointerCapture?.(e.pointerId); steer(e); });
    this.canvas.addEventListener('pointermove', (e) => { if (dragging && !this.paused) steer(e); });
    const stop = () => { dragging = false; };
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointercancel', stop);
  }

  _isActive() {
    return this.app?.gameType === 'trash_conveyor' && !!this.game;
  }

  _releaseKeys() {
    this.keysDown = { left: false, right: false };
    this._applyMove();
  }

  _applyMove() {
    const k = this.keysDown;
    this.game?.setMove((k.right ? 1 : 0) - (k.left ? 1 : 0));
  }

  _onKeyDown(e) {
    if (!this._isActive()) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
    if (document.querySelector('.modal-overlay.active')) return;
    if (!this.ownsKey(e)) return;
    e.preventDefault();
    const key = String(e.key).toLowerCase();
    if (this.game.state.phase === 'between') {
      if (key === 'enter' || key === ' ') this._nextLevel();
      return;
    }
    if (key === 'arrowleft' || key === 'a') this._action('left', true);
    else if (key === 'arrowright' || key === 'd') this._action('right', true);
    else if (key === 'p') { if (!e.repeat) this._pause(!this.paused); }
    else if (e.repeat) return;
    else if (KEY_CYCLE_NEXT.has(e.key)) this._action('next', true);
    else if (KEY_CYCLE_PREV.has(e.key)) this._action('prev', true);
    else if (Object.prototype.hasOwnProperty.call(KEY_CAN, key)) this._setCan(CANS[KEY_CAN[key]]);
  }

  _onKeyUp(e) {
    if (!this._isActive()) return;
    const key = String(e.key).toLowerCase();
    if (key === 'arrowleft' || key === 'a') this._action('left', false);
    else if (key === 'arrowright' || key === 'd') this._action('right', false);
  }

  _action(act, down) {
    const g = this.game;
    if (!g) return;
    if (act === 'left' || act === 'right') {
      this.keysDown[act] = down && !this.paused;
      this._applyMove();
      return;
    }
    if (!down || this.paused) return;
    const changed = g.cycleCan(act === 'next' ? 1 : -1);
    if (changed) this._canChanged();
  }

  _setCan(can) {
    if (!this.game || this.paused) return;
    if (this.game.setCan(can)) this._canChanged();
  }

  _canChanged() {
    this.app.sound?.playCardSnap?.();
    this._syncCans();
  }

  _pause(on) {
    const g = this.game;
    if (!g || g.state.over || g.state.phase !== 'play') return;
    this.paused = on;
    if (on) this._releaseKeys();
    this.container.querySelector('.jm-btn-pause').textContent = on ? '▶ Resume' : '⏸ Pause';
    this._showOverlay(on ? { title: 'Paused', text: 'Jimothy is resting in the dumpster.', button: 'Resume' } : null);
  }

  // ------------------------------------------------------------------
  // Loop
  // ------------------------------------------------------------------

  _startLoop() {
    cancelAnimationFrame(this.rafId);
    this.lastTs = 0;
    const frame = (ts) => {
      this.rafId = requestAnimationFrame(frame);
      const dt = this.lastTs ? Math.min(100, ts - this.lastTs) : 0;
      this.lastTs = ts;
      this._tick(dt / 1000);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  _tick(dt) {
    const g = this.game;
    if (!g || !this._isActive()) return;
    if (this.container.classList.contains('hidden')) return;
    if (!this.paused && !g.state.over && g.state.phase === 'play') {
      const events = g.update(dt);
      if (events.length) this._handleEvents(events);
    }
    const j = g.state.jimothy;
    const moved = j.x - this.lastX;
    this.lastX = j.x;
    if (Math.abs(moved) > 0.2) { this.tilt = Math.sign(moved) * 0.08; this.bob += dt * 14; }
    else { this.tilt *= 0.8; this.bob += dt * 3; }
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floaters) { f.y -= 45 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter(f => f.life > 0);
    for (const id of Object.keys(this.bounceFlash)) this.bounceFlash[id] = Math.max(0, this.bounceFlash[id] - dt);
    this._draw();
    this._syncTime();
  }

  _burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      const life = 0.6 + Math.random() * 0.4;
      this.particles.push({ x, y, color, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life, max: life, r: 3 + Math.random() * 4 });
    }
  }

  _float(text, x, y, color) {
    this.floaters.push({ text, x, y, color, life: 0.85, max: 0.85 });
  }

  _handleEvents(events) {
    const g = this.game;
    const s = g.state;
    const sound = this.app.sound;
    let dirty = false;
    for (const ev of events) {
      if (ev.type === 'catch') {
        sound?.playFoundationSnap?.(Math.min(12, 2 + ev.multiplier * 2));
        this._burst(ev.x, ev.y, ITEM_TYPES[ev.key].color);
        this._float(`+${ev.earned} (${ev.multiplier}x)`, ev.x, ev.y - 10, ITEM_TYPES[ev.key].color);
        if (ev.bounceBonus) this._float(`Bounce bonus +${ev.bounceBonus}`, ev.x, ev.y - 34, '#f9a8d4');
        if (ev.combo % 5 === 0) this._banner(`🔥 ${ev.combo} streak! (${ev.multiplier}x)`, '#facc15');
        dirty = true;
      } else if (ev.type === 'power') {
        sound?.playFoundationSnap?.(10);
        this._burst(ev.x, ev.y, { BONUS: '#fbbf24', FREEZE: '#38bdf8', MAGNET: '#ec4899' }[ev.effect], 18);
        const text = { BONUS: `🍩 Golden donut! +${ev.earned}`, FREEZE: '❄️ Conveyors slowed!', MAGNET: '🧲 Food magnet on!' }[ev.effect];
        this._banner(text, '#facc15');
        dirty = true;
      } else if (ev.type === 'offcolor') {
        sound?.playCardSnap?.();
        this._burst(ev.x, ev.y, '#94a3b8', 6);
        this._float('0 pts', ev.x, ev.y - 10, '#cbd5e1');
        this._banner('Wrong bin: 0 points', '#cbd5e1');
      } else if (ev.type === 'bounce') {
        sound?.playCardSnap?.();
        this.bounceFlash[ev.bouncer] = 0.25;
        this._burst(ev.x, ev.y, '#f472b6', 8);
        this._float('Boing!', ev.x, ev.y - 20, '#f9a8d4');
      } else if (ev.type === 'rotten') {
        sound?.playCardFlip?.();
        this._burst(ev.x, ev.y, '#ef4444', 12);
        this._float(ev.lost ? `-${ev.lost}` : '0', ev.x, ev.y - 10, '#fca5a5');
        this._banner(`Yuck! Rotten trash${ev.lost ? `: -${ev.lost} points` : ''}`, '#ef4444');
        dirty = true;
      } else if (ev.type === 'miss') {
        sound?.playCardFlip?.();
        this._burst(ev.x, ev.y, '#f59e0b', 8);
        this._banner('Food dropped: streak lost', '#fbbf24');
        dirty = true;
      } else if (ev.type === 'levelEnd') {
        if (!s.over) this._onLevelEnd();
        dirty = true;
      } else if (ev.type === 'reverseWarn' || ev.type === 'reverse') {
        // visual only: the belt flashes amber while the warning timer runs
      } else if (ev.type === 'over') {
        this._onOver();
        dirty = true;
      }
    }
    if (dirty) { this.render(); if (!s.over) this.app._autoSaveState?.(); }
  }

  _onOver() {
    const s = this.game.state;
    this.app.sound?.playMineExplosion?.();
    if (s.score > this.best) { this.best = s.score; writeStore(STORAGE_BEST, this.best); }
    if (!this.recorded) {
      this.recorded = true;
      this.app.profiles?.recordGameResult?.('trash_conveyor', s.score, true, this.app.elapsedSeconds, s.moves, true);
      this.app._updateProfileBar?.();
      this.app._stopTimer?.();
    }
    this._showOverlay(this._overInfo());
    this._releaseKeys();
    this.app.profiles?.clearSavedGame?.('trash_conveyor');
  }

  _onLevelEnd() {
    this.app.sound?.playFoundationSnap?.(12);
    this._releaseKeys();
    this._showOverlay(this._summaryInfo());
    this.app._autoSaveState?.();
  }

  _stars(n) { return '⭐'.repeat(n) + '☆'.repeat(3 - n); }

  /** Score summary shown when a level's time is up. */
  _summaryInfo() {
    const s = this.game.state;
    const m = s.summary;
    const next = LEVELS[Math.min(s.level, LEVELS.length - 1)];
    return {
      title: `Level ${m.level} clear! ${this._stars(m.stars)}`,
      text: [
        `${m.name}: +${m.levelScore.toLocaleString()} points (star bonus +${m.bonus})`,
        `Caught ${m.caught} · wrong bin ${m.offcolor} · dropped ${m.missed} · rotten ${m.rotten}`,
        `Best streak ${m.bestCombo}x · kicked food caught ${m.bounced}`,
        `Total score ${m.totalScore.toLocaleString()}`,
        '',
        `Next, level ${next.id}: ${next.name}`,
        next.blurb
      ].join('\n'),
      button: 'Next level ▶'
    };
  }

  _overInfo() {
    const s = this.game.state;
    const stars = s.levelResults.reduce((a, r) => a + r.stars, 0);
    const lines = s.levelResults.map(r => `${r.level}. ${r.name}  ${this._stars(r.stars)}  ${r.levelScore.toLocaleString()}`);
    return {
      title: 'Run complete!',
      text: [`Final score ${s.score.toLocaleString()} · ${stars}/${LEVELS.length * 3} stars`, ...lines, `Best streak ${s.maxCombo}x · ${s.moves} caught${s.score >= this.best && s.score > 0 ? ' · New best!' : ''}`].join('\n'),
      button: 'Play again'
    };
  }

  _nextLevel() {
    const g = this.game;
    if (!g || !g.startNextLevel()) return;
    this.particles = [];
    this.floaters = [];
    this._showOverlay(null);
    this._announceLevel();
    this.render();
    this.app._autoSaveState?.();
  }

  _announceLevel() {
    const L = LEVELS[Math.min(this.game.state.level, LEVELS.length) - 1];
    this._banner(`Level ${L.id}: ${L.name}`, '#fcd34d');
  }

  _syncTime() {
    const s = this.game?.state;
    if (!s) return;
    const left = Math.max(0, Math.ceil(LEVEL_SECONDS - s.levelTime));
    const text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const el = this.container.querySelector('.jm-time');
    if (el && el.textContent !== text) el.textContent = text;
  }

  _showOverlay(info) {
    if (!info) { this.overlayEl.classList.add('hidden'); return; }
    this.overlayEl.querySelector('.jm-overlay-title').textContent = info.title;
    this.overlayEl.querySelector('.jm-overlay-text').textContent = info.text;
    this.overlayEl.querySelector('.jm-overlay-main').textContent = info.button;
    this.overlayEl.classList.remove('hidden');
  }

  _banner(text, color) {
    this.bannerEl.textContent = text;
    this.bannerEl.style.color = color;
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
  }

  // ------------------------------------------------------------------
  // HUD
  // ------------------------------------------------------------------

  _syncCans() {
    const active = this.game?.state.activeCan;
    for (const btn of this.container.querySelectorAll('.jm-can')) btn.classList.toggle('active', btn.dataset.can === active);
  }

  render() {
    const g = this.game;
    if (!g) return;
    const s = g.state;
    const q = (sel) => this.container.querySelector(sel);
    q('.jm-level').textContent = `${s.level}/${LEVELS.length}`;
    this._syncTime();
    q('.jm-combo').textContent = `${s.multiplier}x`;
    q('.jm-best').textContent = Math.max(this.best, s.score).toLocaleString();
    const tray = [];
    if (s.freezeTimer > 0) tray.push(`⏱️ Freeze ${s.freezeTimer.toFixed(1)}s`);
    if (s.magnetTimer > 0) tray.push(`🧲 Magnet ${s.magnetTimer.toFixed(1)}s`);
    q('.jm-tray').textContent = tray.join('  |  ');
    this._syncCans();
    this._draw();
  }

  // ------------------------------------------------------------------
  // Drawing (ported from the original single-file game)
  // ------------------------------------------------------------------

  _draw() {
    const g = this.game;
    if (!g) return;
    const ctx = this.ctx;
    const s = g.state;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const L = LEVELS[Math.min(s.level, LEVELS.length) - 1];
    ctx.drawImage(this._background(L.theme), 0, 0, WORLD.w, WORLD.h);
    ctx.fillStyle = 'rgba(9,13,22,0.32)';
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    // Chutes
    const spacing = WORLD.w / 4;
    for (let i = 1; i <= 3; i++) {
      const cx = spacing * i;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.roundRect(cx - 24, 0, 48, 28, [0, 0, 8, 8]); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.fillRect(cx - 18, 0, 36, 16);
    }

    for (const belt of s.belts) this._drawBelt(ctx, belt);
    for (const b of s.bouncers) this._drawBouncer(ctx, b);
    for (const item of s.items) this._drawItem(ctx, item);

    // Floor
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, WORLD.h - 18, WORLD.w, 18);
    ctx.fillStyle = '#334155'; ctx.fillRect(0, WORLD.h - 18, WORLD.w, 3);

    this._drawJimothy(ctx, s);

    for (const p of this.particles) {
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const f of this.floaters) {
      ctx.save(); ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = f.color; ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(f.text, f.x, f.y); ctx.restore();
    }
    // Heads-up: score
    ctx.save();
    ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fcd34d';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.fillText(s.score.toLocaleString(), 14, WORLD.h - 28);
    ctx.restore();

    // Level clock: a bar across the top that turns amber and then red as time runs out.
    const frac = Math.max(0, Math.min(1, 1 - s.levelTime / LEVEL_SECONDS));
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, WORLD.w, 6);
    ctx.fillStyle = frac > 0.4 ? '#34d399' : (frac > 0.2 ? '#fbbf24' : '#ef4444');
    ctx.fillRect(0, 0, WORLD.w * frac, 6);
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#e2e8f0';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    ctx.fillText(`Level ${s.level} · ${L.name}`, WORLD.w - 14, WORLD.h - 28);
    ctx.restore();
  }

  _background(theme) {
    if (!this.bgCache[theme]) {
      const c = document.createElement('canvas');
      c.width = WORLD.w * this.dpr;
      c.height = WORLD.h * this.dpr;
      const cx = c.getContext('2d');
      cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      drawThemeBackground(cx, theme, WORLD.w, WORLD.h);
      this.bgCache[theme] = c;
    }
    return this.bgCache[theme];
  }

  _drawBouncer(ctx, b) {
    const flash = this.bounceFlash[b.id] || 0;
    const squash = flash > 0 ? 7 * (flash / 0.25) : 0;
    const top = b.y + squash;
    ctx.save();
    // The path it slides along.
    ctx.strokeStyle = 'rgba(244,114,182,0.30)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(b.cx - b.amp, b.y + 8); ctx.lineTo(b.cx + b.amp, b.y + 8); ctx.stroke();
    ctx.setLineDash([]);
    // Springs.
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3;
    for (const dx of [-b.w * 0.3, b.w * 0.3]) {
      ctx.beginPath();
      const x0 = b.x + dx, y0 = top + 14, y1 = b.y + 38;
      ctx.moveTo(x0, y0);
      for (let i = 1; i <= 5; i++) ctx.lineTo(x0 + (i % 2 ? 7 : -7), y0 + ((y1 - y0) * i) / 5);
      ctx.stroke();
    }
    // Pad.
    const grad = ctx.createLinearGradient(0, top, 0, top + 14);
    grad.addColorStop(0, '#f9a8d4'); grad.addColorStop(1, '#be185d');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#f472b6'; ctx.shadowBlur = flash > 0 ? 18 : 8;
    ctx.beginPath(); ctx.roundRect(b.x - b.w / 2, top, b.w, 14, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fdf2f8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = -1; i <= 1; i++) {
      const cx = b.x + i * (b.w / 4);
      ctx.beginPath(); ctx.moveTo(cx - 5, top + 10); ctx.lineTo(cx, top + 4); ctx.lineTo(cx + 5, top + 10); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  _drawBelt(ctx, belt) {
    const { x, y, w, h } = belt;
    const warn = belt.warningTimer > 0;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.roundRect(x - 2, y + 4, w + 4, h + 8, 8); ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.roundRect(x - 6, y - 2, w + 12, h + 8, 10); ctx.fill();
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.stroke();
    if (warn && Math.floor(Date.now() / 150) % 2 === 0) { ctx.strokeStyle = '#eab308'; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip();
    ctx.strokeStyle = warn ? '#f59e0b' : '#64748b'; ctx.lineWidth = 3;
    const sp = 22;
    const startX = (x - 30) + (((belt.offset % sp) + sp) % sp);
    for (let bx = startX; bx < x + w + 30; bx += sp) {
      ctx.beginPath();
      if (belt.dir > 0) { ctx.moveTo(bx - 5, y + 4); ctx.lineTo(bx + 3, y + h / 2); ctx.lineTo(bx - 5, y + h - 4); }
      else { ctx.moveTo(bx + 5, y + 4); ctx.lineTo(bx - 3, y + h / 2); ctx.lineTo(bx + 5, y + h - 4); }
      ctx.stroke();
    }
    ctx.restore();
    for (const rx of [x, x + w]) {
      ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(rx, y + h / 2, h / 2 - 1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(rx, y + h / 2, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = warn ? '#ef4444' : '#10b981';
    ctx.shadowColor = warn ? '#f87171' : '#34d399'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawItem(ctx, item) {
    const info = ITEM_TYPES[item.key];
    const r = info.radius + 4;
    ctx.save();
    ctx.translate(item.x, item.y);
    if (info.type === 'power') { ctx.shadowColor = info.color; ctx.shadowBlur = 14; }
    // A solid disc in the colour of the bin that takes this item, so the match is obvious at a glance.
    ctx.fillStyle = info.type === 'hazard' ? '#3f3f46' : info.color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = info.type === 'hazard' ? '#ef4444' : '#ffffff';
    ctx.stroke();
    ctx.font = `${info.radius * 1.4}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(info.emoji, 0, 1);
    if (info.type === 'food') {
      // Colour name under the item for players who cannot tell the colours apart.
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(CAN_INFO[info.matchCan].label[0], 0, r + 9);
    }
    if (item.magnetized) {
      ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  _drawJimothy(ctx, s) {
    const j = s.jimothy;
    const y = this.game.jimothyY();
    const bob = Math.sin(this.bob) * 3;
    ctx.save();
    ctx.translate(j.x, y);
    ctx.rotate(this.tilt);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 20, 36, 10, 0, 0, Math.PI * 2); ctx.fill();

    // Tail
    ctx.save();
    ctx.translate(-24, bob);
    ctx.rotate(-0.35 + Math.sin(this.bob * 0.7) * 0.15);
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.ellipse(-14, 0, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, -7); ctx.lineTo(-20, 7); ctx.moveTo(-12, -8); ctx.lineTo(-12, 8); ctx.moveTo(-4, -7); ctx.lineTo(-4, 7);
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.ellipse(0, 2 + bob, 26, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath(); ctx.ellipse(0, 4 + bob, 16, 14, 0, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.save();
    ctx.translate(0, -18 + bob);
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(-22, -8); ctx.lineTo(-15, -24); ctx.lineTo(-6, -12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(22, -8); ctx.lineTo(15, -24); ctx.lineTo(6, -12); ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath(); ctx.moveTo(-19, -9); ctx.lineTo(-15, -20); ctx.lineTo(-9, -12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(19, -9); ctx.lineTo(15, -20); ctx.lineTo(9, -12); ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.ellipse(0, -4, 25, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.ellipse(-10, -5, 11, 7, -0.15, 0, Math.PI * 2); ctx.ellipse(10, -5, 11, 7, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath(); ctx.arc(-16, 3, 7, 0, Math.PI * 2); ctx.arc(16, 3, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.ellipse(0, -3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (j.expression === 'happy') {
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(-10, -5, 5, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
      ctx.beginPath(); ctx.arc(10, -5, 5, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath(); ctx.arc(-14, 2, 3, 0, Math.PI * 2); ctx.arc(14, 2, 3, 0, Math.PI * 2); ctx.fill();
    } else if (j.expression === 'dizzy') {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-13, -8); ctx.lineTo(-7, -2); ctx.moveTo(-7, -8); ctx.lineTo(-13, -2);
      ctx.moveTo(7, -8); ctx.lineTo(13, -2); ctx.moveTo(13, -8); ctx.lineTo(7, -2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-10, -5, 5.5, 6, 0, 0, Math.PI * 2); ctx.ellipse(10, -5, 5.5, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#090d16';
      ctx.beginPath(); ctx.arc(-9, -5, 3.2, 0, Math.PI * 2); ctx.arc(9, -5, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-10, -6.5, 1.4, 0, Math.PI * 2); ctx.arc(8, -6.5, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Held bin
    const can = CAN_INFO[s.activeCan];
    ctx.save();
    ctx.translate(0, -38 + bob * 0.5);
    const w = 46, h = 32;
    ctx.shadowColor = can.color; ctx.shadowBlur = 12;
    ctx.fillStyle = can.color;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, 0); ctx.lineTo(w / 2 - 4, 0); ctx.lineTo(w / 2 - 8, h); ctx.lineTo(-w / 2 + 8, h);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2.5;
    for (const xo of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(xo, 4); ctx.lineTo(xo * 0.8, h - 3); ctx.stroke(); }
    ctx.fillStyle = can.ringColor;
    ctx.beginPath(); ctx.ellipse(0, 0, w / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "16px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(can.emoji, 0, h / 2);
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(-w / 2 + 2, 1, 5, 0, Math.PI * 2); ctx.arc(w / 2 - 2, 1, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
