/**
 * Keystone Drop — UI Controller
 *
 * Draws the well, the held shape and the previews on canvases, and runs the
 * game loop (gravity, lock delay, held-key repeat) while the mode is on screen.
 *
 * Controls: Left / Right slide, Down soft drop, Space hard drop,
 * Up or X turn clockwise, Z turn counter-clockwise, C or Shift hold, P pause.
 * On-screen buttons mirror the same actions for touch.
 */

import { COLS, ROWS, HIDDEN, SHAPES, SHAPE_IDS, shapeCells } from '../games/keystone_drop.js';

// One carved-stone colour per shape: [light, base, dark]
const PALETTE = {
  I: ['#8fe3e0', '#2bb3ae', '#17706d'],
  O: ['#ffe48a', '#e3b73a', '#9a7414'],
  T: ['#d8a8ff', '#9a5fd6', '#5c2f93'],
  S: ['#9be8b4', '#38b36a', '#1d703f'],
  Z: ['#ff9f96', '#d9483c', '#8f2219'],
  J: ['#9db8ff', '#4a6fd8', '#25407a'],
  L: ['#ffc98a', '#e8892f', '#9a5514']
};

const DAS_MS = 150;
const ARR_MS = 45;
const SOFT_MS = 40;
const STORAGE_BEST = 'keystone_drop_best';

function readBest() {
  try { return Number(localStorage.getItem(STORAGE_BEST)) || 0; } catch { return 0; }
}
function writeBest(v) {
  try { localStorage.setItem(STORAGE_BEST, String(v)); } catch {}
}

export class KeystoneDropView {
  constructor(app, containerEl) {
    this.app = app;
    this.container = containerEl;
    this.game = null;
    this.paused = false;
    this.rafId = 0;
    this.lastTs = 0;
    this.held = { left: 0, right: 0, down: 0 }; // ms held, 0 when released
    this.repeatAcc = { left: 0, right: 0, down: 0 };
    this.flash = null;         // { rows, until }
    this.best = readBest();

    this._initDom();
    this._bindEvents();
  }

  setGame(game) {
    this.game = game;
    this.paused = false;
    this.held = { left: 0, right: 0, down: 0 };
    this.flash = null;
    this._showOverlay(null);
    if (game.state.won) this._showOverlay({ title: 'Keystone set!', text: `You cleared ${game.state.goalRows} rows.`, button: 'Play again' });
    else if (game.state.over) this._showOverlay({ title: 'Stacked out', text: `Score ${game.state.score}.`, button: 'Try again' });
    this._startLoop();
    this.render();
  }

  _initDom() {
    this.container.innerHTML = `
      <div class="kd-layout">
        <aside class="kd-side kd-left">
          <div class="kd-brand"><span class="kd-brand-mark" aria-hidden="true">▣</span><span class="kd-brand-name">Keystone Drop</span></div>
          <div class="kd-box"><div class="kd-box-title">Hold</div><canvas class="kd-hold" width="170" height="120"></canvas></div>
          <div class="kd-stats">
            <div class="kd-stat"><span class="kd-stat-label">Level</span><span class="kd-stat-val kd-level">1</span></div>
            <div class="kd-stat"><span class="kd-stat-label">Rows</span><span class="kd-stat-val"><span class="kd-rows">0</span> / <span class="kd-goal">40</span></span></div>
            <div class="kd-stat"><span class="kd-stat-label">Best score</span><span class="kd-stat-val kd-best">0</span></div>
          </div>
        </aside>
        <div class="kd-well-col">
          <div class="kd-well-wrap">
            <canvas class="kd-well" width="400" height="800" aria-label="Keystone Drop well"></canvas>
            <div class="kd-overlay hidden" role="status">
              <div class="kd-overlay-title"></div>
              <div class="kd-overlay-text"></div>
              <div class="kd-overlay-actions">
                <button class="btn btn-primary btn-sm kd-overlay-main"></button>
              </div>
            </div>
            <div class="kd-popup" aria-live="polite"></div>
          </div>
        </div>
        <aside class="kd-side kd-right">
          <div class="kd-box"><div class="kd-box-title">Next</div><canvas class="kd-next" width="170" height="360"></canvas></div>
          <div class="kd-actions">
            <button class="btn btn-secondary btn-sm kd-btn-pause">⏸ Pause</button>
          </div>
          <div class="kd-controls">
            <div><kbd>←</kbd><kbd>→</kbd> slide</div>
            <div><kbd>↑</kbd> / <kbd>X</kbd> turn · <kbd>Z</kbd> turn back</div>
            <div><kbd>↓</kbd> soft drop · <kbd>Space</kbd> hard drop</div>
            <div><kbd>C</kbd> / <kbd>Shift</kbd> hold · <kbd>P</kbd> pause</div>
          </div>
          <div class="kd-touch">
            <button class="kd-tbtn" data-act="left" aria-label="Left">◀</button>
            <button class="kd-tbtn" data-act="rotate" aria-label="Turn">↻</button>
            <button class="kd-tbtn" data-act="right" aria-label="Right">▶</button>
            <button class="kd-tbtn" data-act="hold" aria-label="Hold">⇄</button>
            <button class="kd-tbtn" data-act="down" aria-label="Soft drop">▼</button>
            <button class="kd-tbtn" data-act="drop" aria-label="Hard drop">⤓</button>
          </div>
        </aside>
      </div>`;

    const q = (s) => this.container.querySelector(s);
    this.wellCanvas = q('.kd-well');
    this.holdCanvas = q('.kd-hold');
    this.nextCanvas = q('.kd-next');
    this.overlayEl = q('.kd-overlay');
    this.popupEl = q('.kd-popup');
    this.wellCtx = this.wellCanvas.getContext('2d');
    this.holdCtx = this.holdCanvas.getContext('2d');
    this.nextCtx = this.nextCanvas.getContext('2d');
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));
    window.addEventListener('blur', () => { this.held = { left: 0, right: 0, down: 0 }; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this._pause(true); });

    this.container.querySelector('.kd-btn-pause').addEventListener('click', () => this._pause(!this.paused));
    this.container.querySelector('.kd-overlay-main').addEventListener('click', () => {
      const g = this.game;
      if (g && (g.state.over || g.state.won)) this.app.startNewGame();
      else this._pause(false);
    });

    for (const btn of this.container.querySelectorAll('.kd-tbtn')) {
      const act = btn.dataset.act;
      const press = (e) => { e.preventDefault(); this._doAction(act, true); };
      const release = (e) => { e.preventDefault(); this._doAction(act, false); };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
    }
  }

  _isActive() {
    return this.app?.gameType === 'keystone_drop' && !!this.game;
  }

  _onKeyDown(e) {
    if (!this._isActive()) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
    if (document.querySelector('.modal-overlay.active')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate',
      ' ': 'drop', x: 'rotate', X: 'rotate', z: 'rotateBack', Z: 'rotateBack',
      c: 'hold', C: 'hold', Shift: 'hold', p: 'pause', P: 'pause'
    };
    const act = map[e.key];
    if (!act) return;
    e.preventDefault();
    if (e.repeat && !['left', 'right', 'down'].includes(act)) return;
    if (e.repeat) return; // held-key repeat is driven by the loop
    this._doAction(act, true);
  }

  _onKeyUp(e) {
    if (!this._isActive()) return;
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down' };
    const act = map[e.key];
    if (act) this._doAction(act, false);
  }

  _doAction(act, down) {
    const g = this.game;
    if (!g) return;
    if (act === 'pause') { if (down) this._pause(!this.paused); return; }

    if (['left', 'right', 'down'].includes(act)) {
      if (down) {
        if (this.paused || g.state.over || g.state.won) return;
        this.held[act] = 1;           // 1 = pressed this frame
        this.repeatAcc[act] = 0;
        if (act === 'left') { this.held.right = 0; g.move(-1); }
        if (act === 'right') { this.held.left = 0; g.move(1); }
        if (act === 'down') g.softDrop();
        this.render();
      } else {
        this.held[act] = 0;
      }
      return;
    }

    if (!down || this.paused) return;
    if (act === 'rotate') g.rotate(1);
    else if (act === 'rotateBack') g.rotate(-1);
    else if (act === 'hold') { if (g.holdPiece()) this.app.sound?.playCardFlip?.(); }
    else if (act === 'drop') { this._afterLock(g.hardDrop()); }
    this.render();
  }

  _pause(on) {
    const g = this.game;
    if (!g || g.state.over || g.state.won) return;
    this.paused = on;
    this.container.querySelector('.kd-btn-pause').textContent = on ? '▶ Resume' : '⏸ Pause';
    this._showOverlay(on ? { title: 'Paused', text: 'Take a breath. The well is waiting.', button: 'Resume' } : null);
    this.render();
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
      this._tick(dt);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  _tick(dt) {
    const g = this.game;
    if (!g || !this._isActive()) return;
    if (this.container.classList.contains('hidden')) return;
    if (!this.paused && !g.state.over && !g.state.won) {
      // Held-key repeat: wait DAS_MS, then repeat every ARR_MS (soft drop uses SOFT_MS).
      for (const dir of ['left', 'right', 'down']) {
        if (!this.held[dir]) continue;
        this.held[dir] += dt;
        const delay = dir === 'down' ? SOFT_MS : DAS_MS;
        const every = dir === 'down' ? SOFT_MS : ARR_MS;
        if (this.held[dir] >= delay) {
          this.repeatAcc[dir] += dt;
          while (this.repeatAcc[dir] >= every) {
            this.repeatAcc[dir] -= every;
            if (dir === 'left') g.move(-1);
            else if (dir === 'right') g.move(1);
            else g.softDrop();
          }
        }
      }
      this._afterLock(g.update(dt));
    }
    this._draw();
  }

  _afterLock(res) {
    if (!res || !res.locked) return;
    const g = this.game;
    const s = g.state;
    this.app.sound?.playCardSnap?.();

    if (res.cleared) {
      this.flash = { rows: res.cleared, until: performance.now() + 260 };
      const names = ['', 'Single', 'Double', 'Triple', 'Quad'];
      let text = names[res.cleared];
      if (res.keystone) text = 'KEYSTONE! ' + text;
      if (s.combo > 0) text += ` · combo ×${s.combo + 1}`;
      this._popup(`${text}  +${res.points}`);
      this.app.sound?.playFoundationSnap?.(Math.min(12, res.cleared * 3));
    }

    if (s.score > this.best) { this.best = s.score; writeBest(this.best); }

    if (s.won) {
      this._showOverlay({ title: 'Keystone set!', text: `You cleared ${s.goalRows} rows.`, button: 'Play again' });
    } else if (s.over) {
      this._showOverlay({ title: 'Stacked out', text: `Score ${s.score}. ${s.rows} of ${s.goalRows} rows cleared.`, button: 'Try again' });
      this.app.sound?.playMineExplosion?.();
    }
    this.app.render();
    this.app._autoSaveState?.();
  }

  _showOverlay(info) {
    if (!info) { this.overlayEl.classList.add('hidden'); return; }
    this.overlayEl.querySelector('.kd-overlay-title').textContent = info.title;
    this.overlayEl.querySelector('.kd-overlay-text').textContent = info.text;
    this.overlayEl.querySelector('.kd-overlay-main').textContent = info.button;
    this.overlayEl.classList.remove('hidden');
  }

  _popup(text) {
    this.popupEl.textContent = text;
    this.popupEl.classList.remove('show');
    void this.popupEl.offsetWidth;
    this.popupEl.classList.add('show');
  }

  // ------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------

  render() {
    const g = this.game;
    if (!g) return;
    const s = g.state;
    const q = (sel) => this.container.querySelector(sel);
    q('.kd-level').textContent = s.level;
    q('.kd-rows').textContent = s.rows;
    q('.kd-goal').textContent = s.goalRows;
    q('.kd-best').textContent = Math.max(this.best, s.score);
    this._draw();
  }

  _cell(ctx, x, y, size, id, alpha = 1) {
    const [light, base, dark] = PALETTE[id];
    ctx.globalAlpha = alpha;
    ctx.fillStyle = base;
    ctx.fillRect(x, y, size, size);
    const b = Math.max(2, Math.round(size * 0.14));
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + size, y); ctx.lineTo(x + size - b, y + b); ctx.lineTo(x + b, y + b); ctx.lineTo(x + b, y + size - b); ctx.lineTo(x, y + size);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + size, y + size); ctx.lineTo(x, y + size); ctx.lineTo(x + b, y + size - b); ctx.lineTo(x + size - b, y + size - b); ctx.lineTo(x + size - b, y + b); ctx.lineTo(x + size, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + b + 1, y + b + 1, size - 2 * b - 2, Math.max(2, (size - 2 * b) * 0.3));
    ctx.globalAlpha = 1;
  }

  _draw() {
    const g = this.game;
    if (!g) return;
    const s = g.state;
    const ctx = this.wellCtx;
    const W = this.wellCanvas.width, H = this.wellCanvas.height;
    const cs = W / COLS;

    // Well background with a faint grid.
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0e1a15'); bg.addColorStop(1, '#0a1210');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) { ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, H); }
    for (let y = 1; y < ROWS; y++) { ctx.moveTo(0, y * cs); ctx.lineTo(W, y * cs); }
    ctx.stroke();

    // Settled blocks.
    for (let y = HIDDEN; y < ROWS + HIDDEN; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = s.board[y][x];
        if (v) this._cell(ctx, x * cs, (y - HIDDEN) * cs, cs, SHAPE_IDS[v - 1]);
      }
    }

    // Ghost and current piece.
    if (s.current && !s.over) {
      const gy = g.ghostY();
      const p = s.current;
      for (const [cx, cy] of shapeCells(p.id, p.rot)) {
        const gyr = gy + cy - HIDDEN;
        if (gyr >= 0) {
          ctx.strokeStyle = PALETTE[p.id][0];
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 2;
          ctx.strokeRect((p.x + cx) * cs + 2, gyr * cs + 2, cs - 4, cs - 4);
          ctx.globalAlpha = 1;
        }
      }
      const lockFrac = g.isGrounded() ? Math.min(1, s.lockAcc / 500) : 0;
      for (const [cx, cy] of shapeCells(p.id, p.rot)) {
        const yr = p.y + cy - HIDDEN;
        if (yr >= -HIDDEN) this._cell(ctx, (p.x + cx) * cs, yr * cs, cs, p.id, 1 - lockFrac * 0.35);
      }
    }

    // Row-clear flash.
    if (this.flash && performance.now() < this.flash.until) {
      const a = (this.flash.until - performance.now()) / 260;
      ctx.fillStyle = `rgba(255, 240, 180, ${0.35 * a})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Side panels.
    this._drawPreview(this.holdCtx, this.holdCanvas, s.hold ? [s.hold] : [], s.holdUsed ? 0.4 : 1);
    this._drawPreview(this.nextCtx, this.nextCanvas, g.previews(), 1);
  }

  _drawPreview(ctx, canvas, ids, alpha) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cs = 30;
    const slot = canvas.height > 150 ? Math.floor(canvas.height / 3) : canvas.height;
    ids.forEach((id, n) => {
      const cells = shapeCells(id, 0);
      const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
      const w = Math.max(...xs) - Math.min(...xs) + 1;
      const h = Math.max(...ys) - Math.min(...ys) + 1;
      const ox = (canvas.width - w * cs) / 2 - Math.min(...xs) * cs;
      const oy = n * slot + (slot - h * cs) / 2 - Math.min(...ys) * cs;
      for (const [cx, cy] of cells) this._cell(ctx, ox + cx * cs, oy + cy * cs, cs, id, alpha);
    });
  }
}
