/**
 * Ninefold — Sudoku UI Controller
 *
 * Features:
 * - 9x9 ivory board with gold box rules; row/column/box and same-digit
 *   highlighting around the selected cell.
 * - Number pad with remaining counts, Pencil (notes) mode, Auto-notes, Erase.
 * - Keyboard: 1-9 place, 0 / Backspace / Delete clear, arrows move, P toggles Pencil.
 * - Daily puzzle per difficulty with a completion mark.
 * - Works with the app's header buttons (New Game, Undo, Hint, Save/Resume).
 */

import { DIFFICULTIES, todayString } from '../games/sudoku.js';
import { PEERS, bit, rowOf, colOf, boxOf } from '../core/sudoku/engine.js';

const STORAGE_DIFFICULTY = 'sudoku_difficulty';
const STORAGE_DAILY_DONE = 'sudoku_daily_done';

let pendingDaily = null;

function readStore(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

/** Options for the app's next startNewGame() call. Consumes a pending Daily request. */
export function getSudokuNewGameOptions() {
  const difficulty = readStore(STORAGE_DIFFICULTY, 'medium');
  const daily = pendingDaily;
  pendingDaily = null;
  return { difficulty: DIFFICULTIES[difficulty] ? difficulty : 'medium', daily };
}

function dailyDoneMap() {
  try { return JSON.parse(readStore(STORAGE_DAILY_DONE, '{}')) || {}; } catch { return {}; }
}

export class SudokuView {
  constructor(app, containerEl) {
    this.app = app;
    this.container = containerEl;
    this.game = null;
    this.selected = -1;
    this.pencil = false;
    this.flashCell = -1;
    this.hintCell = -1;
    this.hintTimer = null;

    this._initDom();
    this._bindEvents();
  }

  setGame(game) {
    this.game = game;
    this.selected = -1;
    this.hintCell = -1;
    this.difficultySelect.value = game.difficulty;
    this.render();
  }

  _initDom() {
    const diffOptions = Object.values(DIFFICULTIES)
      .map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    const pad = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d =>
      `<button class="sd-pad-btn" data-digit="${d}" aria-label="${d}"><span class="sd-pad-digit">${d}</span><span class="sd-pad-left"></span></button>`).join('');

    this.container.innerHTML = `
      <div class="sd-layout">
        <div class="sd-board-col">
          <div class="sd-board" role="grid" aria-label="Sudoku board"></div>
          <div class="sd-toast" aria-live="polite"></div>
        </div>
        <aside class="sd-panel">
          <div class="sd-brand">
            <span class="sd-brand-mark" aria-hidden="true">✦</span>
            <span class="sd-brand-name">Ninefold</span>
            <span class="sd-daily-badge hidden">Daily</span>
          </div>
          <div class="sd-row">
            <label class="sd-field">
              <span>Difficulty</span>
              <select class="sd-difficulty custom-select" aria-label="Difficulty">${diffOptions}</select>
            </label>
            <button class="btn btn-secondary btn-sm sd-btn-daily" title="Today's puzzle for this difficulty">📅 Daily</button>
          </div>
          <div class="sd-stats">
            <div class="sd-stat"><span class="sd-stat-label">Mistakes</span><span class="sd-stat-val sd-mistakes">0</span></div>
            <div class="sd-stat"><span class="sd-stat-label">Hints</span><span class="sd-stat-val sd-hints">0</span></div>
            <div class="sd-stat"><span class="sd-stat-label">To fill</span><span class="sd-stat-val sd-left">0</span></div>
          </div>
          <div class="sd-tools">
            <button class="btn btn-secondary btn-sm sd-btn-pencil" aria-pressed="false" title="Pencil notes (P)">✏️ Pencil <b class="sd-pencil-state">Off</b></button>
            <button class="btn btn-secondary btn-sm sd-btn-autonotes" title="Fill in every possible note">📝 Auto-notes</button>
            <button class="btn btn-secondary btn-sm sd-btn-erase" title="Clear cell (Delete)">⌫ Erase</button>
            <button class="btn btn-secondary btn-sm sd-btn-undo" title="Undo (Ctrl+Z)">↶ Undo</button>
            <button class="btn btn-secondary btn-sm sd-btn-hint" title="Explain the next step">💡 Hint</button>
            <button class="btn btn-secondary btn-sm sd-btn-solve-step" title="Fill in the hinted cell">✔ Use hint</button>
          </div>
          <div class="sd-pad">${pad}</div>
          <p class="sd-help">Pick a cell, then a number. Keys: 1-9, Delete, arrows, P for pencil.</p>
        </aside>
      </div>`;

    this.boardEl = this.container.querySelector('.sd-board');
    this.toastEl = this.container.querySelector('.sd-toast');
    this.difficultySelect = this.container.querySelector('.sd-difficulty');
    this.difficultySelect.value = readStore(STORAGE_DIFFICULTY, 'medium');

    const cells = [];
    for (let i = 0; i < 81; i++) {
      const r = rowOf(i), c = colOf(i);
      const cls = ['sd-cell'];
      if (c % 3 === 2 && c < 8) cls.push('sd-edge-r');
      if (r % 3 === 2 && r < 8) cls.push('sd-edge-b');
      cells.push(`<div class="${cls.join(' ')}" data-i="${i}" role="gridcell" tabindex="-1"><span class="sd-val"></span><div class="sd-notes"></div></div>`);
    }
    this.boardEl.innerHTML = cells.join('');
    this.cellEls = [...this.boardEl.querySelectorAll('.sd-cell')];
    this.padBtns = [...this.container.querySelectorAll('.sd-pad-btn')];
  }

  _bindEvents() {
    this.boardEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.sd-cell');
      if (!cell) return;
      this.selected = Number(cell.dataset.i);
      this.render();
    });

    for (const btn of this.padBtns) {
      btn.addEventListener('click', () => this.input(Number(btn.dataset.digit)));
    }

    const q = (sel) => this.container.querySelector(sel);
    q('.sd-btn-pencil').addEventListener('click', () => this.togglePencil());
    q('.sd-btn-erase').addEventListener('click', () => this.input(0));
    q('.sd-btn-undo').addEventListener('click', () => this.app.undoMove());
    q('.sd-btn-hint').addEventListener('click', () => this.showHint());
    q('.sd-btn-solve-step').addEventListener('click', () => this.useHint());
    q('.sd-btn-autonotes').addEventListener('click', () => {
      if (this.game?.fillAllNotes().ok) { this._toast('Notes filled in for every empty cell'); this._changed(); }
    });

    this.difficultySelect.addEventListener('change', () => {
      writeStore(STORAGE_DIFFICULTY, this.difficultySelect.value);
      this.app.startNewGame();
    });

    q('.sd-btn-daily').addEventListener('click', () => {
      writeStore(STORAGE_DIFFICULTY, this.difficultySelect.value);
      pendingDaily = todayString();
      this.app.startNewGame();
    });

    window.addEventListener('keydown', (e) => {
      if (this.app?.gameType !== 'sudoku' || !this.game) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (document.querySelector('.modal-overlay.active')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        this.input(Number(e.key));
      } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        this.input(0);
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.togglePencil();
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const i = this.selected < 0 ? 40 : this.selected;
        let r = rowOf(i), c = colOf(i);
        if (e.key === 'ArrowUp') r = (r + 8) % 9;
        if (e.key === 'ArrowDown') r = (r + 1) % 9;
        if (e.key === 'ArrowLeft') c = (c + 8) % 9;
        if (e.key === 'ArrowRight') c = (c + 1) % 9;
        this.selected = r * 9 + c;
        this.render();
      }
    });
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  togglePencil() {
    this.pencil = !this.pencil;
    this.render();
  }

  input(digit) {
    const g = this.game;
    if (!g || g.state.won) return;
    const i = this.selected;
    if (i < 0) { this._toast('Pick a cell first'); return; }
    if (g.isGiven(i)) { this._toast('That number is part of the puzzle'); return; }

    if (digit && this.pencil && !g.state.values[i]) {
      if (g.toggleNote(i, digit).ok) { this.app.sound?.playCardFlip?.(); this._changed(); }
      return;
    }

    const r = g.setValue(i, digit);
    if (!r.ok) return;
    if (!digit) this.app.sound?.playUndo?.();
    else if (r.correct) this.app.sound?.playCardSnap?.();
    else { this.app.sound?.playCardSlide?.(); this._toast(`Not a ${digit} here. Mistakes: ${g.state.mistakes}`); }
    if (r.won) this._markDailyDone();
    this._changed();
  }

  showHint(hint = this.game?.getTacticalHint(), { silent = false } = {}) {
    if (!hint) return;
    this.lastHint = hint;
    this.hintCell = hint.cell;
    this.selected = hint.cell;
    if (!silent) this._toast(hint.message, 5200);
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => { this.hintCell = -1; this.render(); }, 5200);
    this.render();
  }

  useHint() {
    const g = this.game;
    if (!g || g.state.won) return;
    const hint = g.getTacticalHint();
    const r = g.applyHint(hint);
    if (!r.ok) return;
    this.selected = hint.cell;
    this.hintCell = -1;
    this._toast(hint.action === 'FIX' ? 'Wrong entry cleared' : `Placed ${hint.digit}. ${hint.message}`, 4200);
    this.app.sound?.playCardSnap?.();
    if (r.won) this._markDailyDone();
    this._changed();
  }

  _markDailyDone() {
    const s = this.game?.state;
    if (!s?.daily) return;
    const map = dailyDoneMap();
    map[`${s.daily}:${s.difficulty}`] = true;
    writeStore(STORAGE_DAILY_DONE, JSON.stringify(map));
  }

  _changed() {
    this.app.render();
    this.app._autoSaveState?.();
  }

  _toast(text, ms = 2600) {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.style.setProperty('--sd-toast-ms', `${ms}ms`);
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------

  render() {
    const g = this.game;
    if (!g || !this.cellEls) return;
    const s = g.state;
    const sel = this.selected;
    const selVal = sel >= 0 ? s.values[sel] : 0;
    const peers = sel >= 0 ? new Set(PEERS[sel]) : new Set();
    const conflicts = g.conflicts();

    for (let i = 0; i < 81; i++) {
      const el = this.cellEls[i];
      const v = s.values[i];
      const given = g.isGiven(i);
      el.classList.toggle('sd-given', given);
      el.classList.toggle('sd-entered', !given && !!v);
      el.classList.toggle('sd-wrong', !given && g.isWrong(i));
      el.classList.toggle('sd-conflict', conflicts.has(i) && !g.isWrong(i));
      el.classList.toggle('sd-selected', i === sel);
      el.classList.toggle('sd-peer', peers.has(i));
      el.classList.toggle('sd-same', !!selVal && v === selVal && i !== sel);
      el.classList.toggle('sd-hint', i === this.hintCell);
      el.querySelector('.sd-val').textContent = v || '';

      const notesEl = el.querySelector('.sd-notes');
      const mask = v ? 0 : s.notes[i];
      if (notesEl.dataset.mask !== String(mask) || notesEl.dataset.hl !== String(selVal)) {
        notesEl.dataset.mask = String(mask);
        notesEl.dataset.hl = String(selVal);
        notesEl.innerHTML = mask
          ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<span class="${selVal === d && (mask & bit(d)) ? 'sd-note-hl' : ''}">${mask & bit(d) ? d : ''}</span>`).join('')
          : '';
      }
      el.setAttribute('aria-label', `Row ${rowOf(i) + 1} column ${colOf(i) + 1}${v ? `, ${v}` : ', empty'}${given ? ', given' : ''}`);
    }

    const counts = g.digitCounts();
    for (const btn of this.padBtns) {
      const d = Number(btn.dataset.digit);
      const left = 9 - counts[d];
      btn.querySelector('.sd-pad-left').textContent = left > 0 ? left : '✓';
      btn.classList.toggle('sd-done', left <= 0);
      btn.classList.toggle('sd-pencil-mode', this.pencil);
    }

    const q = (sel2) => this.container.querySelector(sel2);
    q('.sd-mistakes').textContent = s.mistakes;
    q('.sd-hints').textContent = s.hints;
    q('.sd-left').textContent = g.emptyCount() + [...Array(81).keys()].filter(i => g.isWrong(i)).length;
    q('.sd-pencil-state').textContent = this.pencil ? 'On' : 'Off';
    q('.sd-btn-pencil').classList.toggle('sd-active', this.pencil);
    q('.sd-btn-pencil').setAttribute('aria-pressed', String(this.pencil));
    this.boardEl.classList.toggle('sd-won', s.won);

    const badge = q('.sd-daily-badge');
    badge.classList.toggle('hidden', !s.daily);
    if (s.daily) {
      const done = dailyDoneMap()[`${s.daily}:${s.difficulty}`];
      badge.textContent = `Daily ${s.daily}${done ? ' ✓' : ''}`;
    }
    const todayDone = dailyDoneMap()[`${todayString()}:${this.difficultySelect.value}`];
    q('.sd-btn-daily').textContent = todayDone ? '📅 Daily ✓' : '📅 Daily';
  }
}
