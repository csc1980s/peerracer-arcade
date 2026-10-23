/**
 * Jade Pavilion — Mahjong Tile-Matching UI Controller
 *
 * Features:
 * - Layered ivory tiles with jade edges, positioned from the layout geometry
 *   and scaled to fit the window.
 * - Click a free tile, then its partner. Blocked tiles nudge instead.
 * - Optional dimming of blocked tiles, live counters, hint glow,
 *   "no moves" banner with a one-click solvable shuffle.
 * - Works with the app's header buttons (New Game, Undo, Hint, Save/Resume).
 */

import { MAHJONG_LAYOUTS } from '../core/mahjong/layouts.js';
import { tileFaceSVG } from '../core/mahjong/tile_art.js';
import { faceName } from '../core/mahjong/tiles.js';

const STORAGE_LAYOUT = 'mahjong_layout';
const STORAGE_DIM = 'mahjong_dim_blocked';

export function getSavedMahjongLayout() {
  try { return localStorage.getItem(STORAGE_LAYOUT) || 'turtle'; } catch { return 'turtle'; }
}

export class MahjongView {
  constructor(app, containerEl) {
    this.app = app;
    this.container = containerEl;
    this.game = null;
    this.selectedId = null;
    this.hintIds = [];
    this.hintTimer = null;
    this.vanishing = new Set();
    try { this.dimBlocked = localStorage.getItem(STORAGE_DIM) !== 'false'; } catch { this.dimBlocked = true; }

    this._initDom();
    this._bindEvents();
  }

  setGame(game) {
    this.game = game;
    this.selectedId = null;
    this.hintIds = [];
    this.vanishing.clear();
    if (this.layoutSelect) this.layoutSelect.value = game.layoutId;
    this.render();
  }

  _initDom() {
    const options = Object.values(MAHJONG_LAYOUTS)
      .map(l => `<option value="${l.id}">${l.name} · ${l.build().length} tiles · ${l.difficulty}</option>`)
      .join('');

    this.container.innerHTML = `
      <div class="mj-layout">
        <div class="mj-toolbar">
          <div class="mj-brand">
            <span class="mj-brand-mark" aria-hidden="true">◈</span>
            <span class="mj-brand-name">Jade Pavilion</span>
          </div>
          <label class="mj-field">
            <span>Layout</span>
            <select class="mj-layout-select custom-select" aria-label="Board layout">${options}</select>
          </label>
          <div class="mj-actions">
            <button class="btn btn-secondary btn-sm mj-btn-hint" title="Show a matching pair">💡 Hint</button>
            <button class="btn btn-secondary btn-sm mj-btn-shuffle" title="Re-deal the remaining tiles (−25 points)">🔀 Shuffle</button>
            <button class="btn btn-secondary btn-sm mj-btn-undo" title="Undo last move">↶ Undo</button>
          </div>
          <label class="mj-toggle">
            <input type="checkbox" class="mj-dim-toggle" ${this.dimBlocked ? 'checked' : ''}>
            <span>Dim blocked tiles</span>
          </label>
          <div class="mj-stats">
            <div class="mj-stat"><span class="mj-stat-label">Tiles left</span><span class="mj-stat-val mj-tiles-left">0</span></div>
            <div class="mj-stat"><span class="mj-stat-label">Open pairs</span><span class="mj-stat-val mj-open-pairs">0</span></div>
            <div class="mj-stat mj-combo-stat"><span class="mj-stat-label">Combo</span><span class="mj-stat-val mj-combo">–</span></div>
          </div>
        </div>
        <div class="mj-board-wrap">
          <div class="mj-board" role="grid" aria-label="Mahjong board"></div>
          <div class="mj-banner hidden" role="status">
            <div class="mj-banner-title">No open pairs left</div>
            <div class="mj-banner-text">Shuffle the remaining tiles. The new arrangement can always be cleared.</div>
            <div class="mj-banner-actions">
              <button class="btn btn-primary btn-sm mj-banner-shuffle">🔀 Shuffle (−25)</button>
              <button class="btn btn-secondary btn-sm mj-banner-undo">↶ Undo</button>
            </div>
          </div>
          <div class="mj-toast" aria-live="polite"></div>
        </div>
      </div>`;

    this.boardWrap = this.container.querySelector('.mj-board-wrap');
    this.boardEl = this.container.querySelector('.mj-board');
    this.layoutSelect = this.container.querySelector('.mj-layout-select');
    this.bannerEl = this.container.querySelector('.mj-banner');
    this.toastEl = this.container.querySelector('.mj-toast');
    this.layoutSelect.value = getSavedMahjongLayout();
  }

  _bindEvents() {
    this.boardEl.addEventListener('click', (e) => {
      const tileEl = e.target.closest('.mj-tile');
      if (tileEl) this._onTileClick(Number(tileEl.dataset.id), tileEl);
      else this._clearSelection();
    });

    this.layoutSelect.addEventListener('change', () => {
      try { localStorage.setItem(STORAGE_LAYOUT, this.layoutSelect.value); } catch {}
      this.app.startNewGame();
    });

    this.container.querySelector('.mj-btn-hint').addEventListener('click', () => this.showHint());
    this.container.querySelector('.mj-btn-shuffle').addEventListener('click', () => this.shuffle());
    this.container.querySelector('.mj-btn-undo').addEventListener('click', () => this.app.undoMove());
    this.container.querySelector('.mj-banner-shuffle').addEventListener('click', () => this.shuffle());
    this.container.querySelector('.mj-banner-undo').addEventListener('click', () => this.app.undoMove());

    this.container.querySelector('.mj-dim-toggle').addEventListener('change', (e) => {
      this.dimBlocked = e.target.checked;
      try { localStorage.setItem(STORAGE_DIM, String(this.dimBlocked)); } catch {}
      this.render();
    });

    window.addEventListener('resize', () => {
      if (!this.container.classList.contains('hidden')) this._layoutBoard();
    });
  }

  // ------------------------------------------------------------------
  // Interaction
  // ------------------------------------------------------------------

  _onTileClick(id, tileEl) {
    const game = this.game;
    if (!game || game.state.won || this.vanishing.has(id)) return;

    if (!game.isFree(id)) {
      tileEl.classList.remove('mj-nudge');
      void tileEl.offsetWidth;
      tileEl.classList.add('mj-nudge');
      this.app.sound?.playCardSlide?.();
      return;
    }

    if (this.selectedId === null || this.selectedId === id) {
      this.selectedId = this.selectedId === id ? null : id;
      this.app.sound?.playCardFlip?.();
      this._paintSelection();
      return;
    }

    const first = this.selectedId;
    const result = game.matchTiles(first, id);
    if (!result.ok) {
      // Not a match: move the selection to the new tile.
      this.selectedId = id;
      this.app.sound?.playCardFlip?.();
      this._paintSelection();
      return;
    }

    this.selectedId = null;
    this._clearHint();
    this.app.sound?.playFoundationSnap?.(Math.min(12, result.combo + 1));
    if (result.combo > 0) this._toast(`Combo ×${result.combo + 1}  +${result.points}`);

    // Let the pair fade out, then redraw the board.
    this.vanishing.add(first);
    this.vanishing.add(id);
    for (const vid of [first, id]) {
      this.boardEl.querySelector(`.mj-tile[data-id="${vid}"]`)?.classList.add('mj-vanish');
    }
    setTimeout(() => {
      this.vanishing.delete(first);
      this.vanishing.delete(id);
      this.app.render();
      this.app._autoSaveState?.();
    }, 230);
  }

  _clearSelection() {
    if (this.selectedId === null) return;
    this.selectedId = null;
    this._paintSelection();
  }

  shuffle() {
    if (!this.game || this.game.state.won) return;
    if (this.game.shuffleRemaining()) {
      this.selectedId = null;
      this._clearHint();
      this.app.sound?.playShuffle?.();
      this._toast('Tiles re-dealt (−25)');
      this.app.render();
      this.app._autoSaveState?.();
    } else {
      this._toast('These tiles are stacked so no shuffle can clear them. Undo a few moves.');
    }
  }

  /** Highlights a hinted pair. `silent` skips the toast when the app already shows the message. */
  showHint(hint = this.game?.getTacticalHint(), { silent = false } = {}) {
    if (!hint) return;
    if (hint.action === 'SHUFFLE') {
      this.render();
      if (!silent) this._toast('No pairs left. Shuffle to continue.');
      return;
    }
    this._clearHint();
    this.hintIds = hint.tiles;
    this._paintSelection();
    if (!silent) this._toast(hint.message);
    this.hintTimer = setTimeout(() => { this._clearHint(); this._paintSelection(); }, 2600);
  }

  _clearHint() {
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
    this.hintIds = [];
  }

  _toast(text) {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------

  render() {
    const game = this.game;
    if (!game || !this.boardEl) return;

    const free = new Set(game.getFreeTileIds());
    const remaining = game.getRemainingTiles();
    const html = remaining.map(t => {
      const cls = ['mj-tile'];
      if (!free.has(t.id)) cls.push('mj-blocked');
      return `<div class="${cls.join(' ')}" data-id="${t.id}" data-z="${t.z}" role="gridcell"
        aria-label="${faceName(t.face)}${free.has(t.id) ? '' : ' (blocked)'}">
          <div class="mj-tile-face">${tileFaceSVG(t.face)}</div>
        </div>`;
    }).join('');
    this.boardEl.innerHTML = html;
    this.boardEl.classList.toggle('mj-dim-on', this.dimBlocked);

    this._layoutBoard();
    this._paintSelection();

    const pairs = game.getAvailablePairs().length;
    this.container.querySelector('.mj-tiles-left').textContent = remaining.length;
    this.container.querySelector('.mj-open-pairs').textContent = pairs;
    this.container.querySelector('.mj-combo').textContent = game.state.combo > 0 ? `×${game.state.combo + 1}` : '–';
    const stuck = !game.state.won && pairs === 0 && remaining.length > 0;
    this.bannerEl.classList.toggle('hidden', !stuck);
    if (stuck) {
      const canShuffle = game.canShuffleHelp();
      this.bannerEl.querySelector('.mj-banner-text').textContent = canShuffle
        ? 'Shuffle the remaining tiles. The new arrangement can always be cleared.'
        : 'The tiles left are stacked so no shuffle can clear them. Undo a few moves and try another pair.';
      this.bannerEl.querySelector('.mj-banner-shuffle').classList.toggle('hidden', !canShuffle);
    }
  }

  _paintSelection() {
    for (const el of this.boardEl.querySelectorAll('.mj-tile')) {
      const id = Number(el.dataset.id);
      el.classList.toggle('mj-selected', id === this.selectedId);
      el.classList.toggle('mj-hint', this.hintIds.includes(id));
    }
  }

  /** Positions every tile and scales the board to the space available. */
  _layoutBoard() {
    const game = this.game;
    if (!game) return;
    const positions = game.geometry.positions;

    let maxX = 0, maxY = 0, maxZ = 0;
    for (const p of positions) {
      maxX = Math.max(maxX, p.x + 2);
      maxY = Math.max(maxY, p.y + 2);
      maxZ = Math.max(maxZ, p.z);
    }
    const cols = maxX / 2;
    const rows = maxY / 2;
    const ASPECT = 4 / 3;     // tile height / width
    const DEPTH = 0.17;       // layer lift as a fraction of tile width

    const wrapRect = this.boardWrap.getBoundingClientRect();
    const availW = Math.max(240, (this.boardWrap.clientWidth || window.innerWidth) - 24);
    const top = wrapRect.top > 0 ? wrapRect.top : 180;
    const availH = Math.max(260, window.innerHeight - top - 28);

    let tw = Math.min(
      availW / (cols + DEPTH * (maxZ + 1)),
      availH / (rows * ASPECT + DEPTH * (maxZ + 1))
    );
    tw = Math.max(22, Math.min(78, Math.floor(tw)));
    const th = Math.round(tw * ASPECT);
    const depth = Math.max(3, Math.round(tw * DEPTH));

    const boardW = cols * tw + depth * (maxZ + 1);
    const boardH = rows * th + depth * (maxZ + 1);
    this.boardEl.style.width = `${boardW}px`;
    this.boardEl.style.height = `${boardH}px`;
    this.boardEl.style.setProperty('--mj-w', `${tw}px`);
    this.boardEl.style.setProperty('--mj-h', `${th}px`);
    this.boardEl.style.setProperty('--mj-d', `${depth}px`);
    this.boardWrap.style.minHeight = `${boardH + 24}px`;

    for (const el of this.boardEl.querySelectorAll('.mj-tile')) {
      const p = positions[Number(el.dataset.id)];
      // Higher layers are lifted up and to the left; edges show bottom-right.
      const left = (p.x / 2) * tw + depth * (maxZ - p.z);
      const topPx = (p.y / 2) * th + depth * (maxZ - p.z);
      el.style.left = `${left}px`;
      el.style.top = `${topPx}px`;
      el.style.zIndex = String(p.z * 1000 + p.x + p.y * 2);
    }
  }
}
