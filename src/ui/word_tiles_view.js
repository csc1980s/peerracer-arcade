/**
 * Word Tiles: Sovereign Lexicon — UI Presentation & Interaction Controller
 * 
 * Features:
 * - 15x15 CSS Grid Board with responsive cell sizing.
 * - Distinctive luxury wooden/ivory tile aesthetic with crisp letter weights.
 * - Symmetrical premium cell indicators (3W, 2W, 3L, 2L, Center Star).
 * - Full Drag-and-Drop and Click-to-Place support for desktop & mobile.
 * - Real-time tentative word and score preview before commit.
 * - Blank tile assignment modal [A-Z].
 * - Tile exchange modal with bag count verification.
 * - Chronological Move History Log.
 * - Web Audio API synthesized acoustic sound integration.
 * - True Turn-Based Head-to-Head P2P Multiplayer on a single shared board.
 *   (Not a race: players alternate turns building words off each other's tiles).
 */

import { RULES_CONFIG_V1 } from '../core/word_tiles/rules_config.js';
import { AI_DIFFICULTY } from '../core/word_tiles/ai_player.js';
import { WordTilesP2PManager, P2P_MATCH_STATUS } from '../core/word_tiles/p2p_turn_manager.js';
import { WordTilesGame } from '../games/word_tiles.js';
import { WordTileThemeManager } from '../core/word_tiles/themes.js?v=20261017_rev1';

export class WordTilesView {
  constructor(app, containerEl) {
    this.app = app;
    this.container = containerEl;
    this.game = null;

    this.selectedRackIndex = null;
    this.selectedBoardCell = null;
    this.draggedTileData = null; // { source: 'rack'|'board', rackIndex, row, col, tile }
    this.pendingBlankCoord = null;
    this.isP2P = false;

    // Head-to-head turn-based P2P manager
    this.p2pManager = new WordTilesP2PManager({
      playerName: this.app.profiles?.getActiveProfile()?.name || 'Player 1',
      onMatchConnected: (matchInfo) => this._onP2PMatchConnected(matchInfo),
      onRemoteMove: (moveData, fromName) => this._onP2PRemoteMove(moveData, fromName),
      onRemotePass: (fromName) => this._onP2PRemotePass(fromName),
      onRemoteExchange: (count, fromName) => this._onP2PRemoteExchange(count, fromName),
      onAvailableRoomsChange: (rooms) => this._onP2PAvailableRoomsChange(rooms)
    });

    this._initDom();
    this._bindEvents();
  }

  setGame(game) {
    this.game = game;
    this.selectedRackIndex = null;
    this.selectedBoardCell = null;
    WordTileThemeManager.applyTheme(WordTileThemeManager.getActiveThemeId());
    this.render();
  }

  _initDom() {
    this.container.innerHTML = `
      <div class="word-tiles-layout">
        <!-- Left Sidebar / Stats & Controls -->
        <aside class="word-tiles-sidebar">
          <!-- Active P2P Session Banner -->
          <div id="wt-p2p-active-banner" class="wt-panel wt-p2p-active-banner hidden">
            <div class="wt-p2p-badge-row">
              <span class="wt-p2p-live-tag">⚔️ SHARED BOARD MATCH</span>
              <span id="wt-p2p-room-code-tag" class="wt-p2p-code-tag">WORD-P2P</span>
            </div>
            <div class="wt-p2p-role-row">
              <span id="wt-p2p-role-text">You: Player 1 (Host)</span>
              <button id="btn-wt-leave-p2p" class="btn btn-sm btn-secondary wt-btn-leave" title="Leave 2-player match and return to solo">Leave</button>
            </div>
          </div>

          <!-- Matchup Score Card -->
          <div class="wt-panel wt-matchup-card">
            <div class="wt-player-box active-player" id="wt-human-box">
              <span class="wt-player-avatar" id="wt-human-avatar">👑</span>
              <div class="wt-player-info">
                <span class="wt-player-label" id="wt-human-label">YOU (HUMAN)</span>
                <span class="wt-player-score" id="wt-human-score">0 pts</span>
              </div>
            </div>

            <div class="wt-vs-divider">VS</div>

            <div class="wt-player-box" id="wt-ai-box">
              <span class="wt-player-avatar" id="wt-ai-avatar">🤖</span>
              <div class="wt-player-info">
                <span class="wt-player-label" id="wt-ai-label">SOVEREIGN AI</span>
                <span class="wt-player-score" id="wt-ai-score">0 pts</span>
              </div>
            </div>
          </div>

          <!-- Turn & Bag Indicator -->
          <div class="wt-panel wt-turn-panel">
            <div class="wt-turn-status" id="wt-turn-status">
              <span class="wt-pulse-dot">●</span>
              <span id="wt-turn-text">Your Turn</span>
            </div>
            <div class="wt-bag-badge" id="wt-bag-badge" title="Tiles remaining in the bag">
              <span class="wt-bag-icon">🎒</span>
              <span class="wt-bag-lbl">BAG:</span>
              <strong id="wt-bag-count">86</strong>
            </div>
          </div>

          <!-- 2-Player P2P Launch Panel (Solo Mode) -->
          <div class="wt-panel wt-p2p-launch-panel" id="wt-p2p-launch-panel">
            <button id="btn-wt-open-p2p" class="btn btn-gold btn-block wt-btn-p2p" title="Play against another human on this shared board">
              <span>⚔️</span> 2-Player Match (Shared Board)
            </button>
          </div>

          <!-- Difficulty Selector (Hidden in P2P mode) -->
          <div class="wt-panel wt-diff-panel" id="wt-diff-panel">
            <span class="wt-sidebar-lbl">AI DIFFICULTY:</span>
            <div class="wt-diff-buttons">
              <button class="btn btn-sm btn-diff" data-diff="easy">Easy</button>
              <button class="btn btn-sm btn-diff active" data-diff="medium">Medium</button>
              <button class="btn btn-sm btn-diff" data-diff="hard">Hard</button>
            </div>
          </div>

          <!-- Move History -->
          <div class="wt-panel wt-history-panel">
            <div class="wt-history-header">
              <span>MOVE LOG</span>
              <span class="wt-history-count" id="wt-history-count">0 moves</span>
            </div>
            <div class="wt-history-list" id="wt-history-list">
              <div class="wt-history-empty">Game begins! Place your first word covering the center star.</div>
            </div>
          </div>
        </aside>

        <!-- Center Game Board & Rack -->
        <div class="word-tiles-center">
          <!-- Main 15x15 Board Grid -->
          <div class="wt-board-wrapper">
            <div class="wt-board-grid" id="wt-board-grid"></div>
          </div>

          <!-- Tentative Score Preview Callout -->
          <div class="wt-preview-callout" id="wt-preview-callout">
            <span class="wt-preview-sparkle">✦</span>
            <span id="wt-preview-text">Place tiles on board</span>
          </div>

          <!-- Player Rack Tray -->
          <div class="wt-rack-section">
            <div class="wt-rack-tray" id="wt-rack-tray"></div>
          </div>

          <!-- Action Controls Bar -->
          <div class="wt-action-bar">
            <button id="btn-wt-commit" class="btn btn-gold btn-large" disabled title="Commit move (Enter)">
              <span>✓</span> <span id="btn-wt-commit-text">Commit</span>
            </button>
            <button id="btn-wt-recall" class="btn btn-secondary" title="Recall all placed tiles (R)">
              <span>↩</span> Recall
            </button>
            <button id="btn-wt-shuffle" class="btn btn-secondary" title="Shuffle rack tiles (S)">
              <span>🔀</span> Shuffle
            </button>
            <button id="btn-wt-exchange" class="btn btn-secondary" title="Exchange tiles with bag (X)">
              <span>🔄</span> Exchange
            </button>
            <button id="btn-wt-pass" class="btn btn-secondary" title="Pass turn (P)">
              <span>⏭</span> Pass
            </button>
            <button id="btn-wt-rules" class="btn btn-secondary" title="Rules and scoring guide">
              <span>📖</span> Rules
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: 2-Player P2P Head-to-Head (Shared Board) -->
      <div id="wt-p2p-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content wt-p2p-dialog">
          <div class="wt-modal-header">
            <div class="wt-p2p-header-title">
              <span class="wt-p2p-icon">⚔️</span>
              <div>
                <h3>2-PLAYER HEAD-TO-HEAD MATCH</h3>
                <p class="wt-modal-subtitle">Turn-based play on a single shared 15×15 board. Not a race — alternate turns building off each other's tiles.</p>
              </div>
            </div>
            <button id="btn-wt-close-p2p" class="wt-close-icon">&times;</button>
          </div>

          <!-- Tabs -->
          <div class="wt-p2p-tabs">
            <button id="tab-wt-host" class="wt-p2p-tab active" type="button">Host Match</button>
            <button id="tab-wt-join" class="wt-p2p-tab" type="button">Join Match</button>
          </div>

          <!-- Host Tab Body -->
          <div id="panel-wt-host" class="wt-p2p-tab-panel active">
            <div class="wt-p2p-field-group">
              <label class="wt-p2p-label">YOUR ROOM CODE & MATCH CODE:</label>
              <div class="wt-p2p-code-box">
                <input type="text" id="wt-host-code-display" class="wt-code-input" readonly>
                <button id="btn-wt-copy-code" class="btn btn-gold" type="button">📋 Copy Code</button>
              </div>
              <div id="wt-copy-success" class="wt-copy-feedback hidden">✓ Match code copied to clipboard!</div>
            </div>

            <div class="wt-p2p-status-card">
              <div class="wt-spinner-ring"></div>
              <div class="wt-status-text-block">
                <strong>Hosting match: Waiting for Player 2 to connect...</strong>
                <p>Open another tab or window in this browser and click <em>Join Match</em>, or paste the Match Code to connect instantly!</p>
              </div>
            </div>

            <div class="wt-modal-actions">
              <button id="btn-wt-cancel-host" class="btn btn-secondary" type="button">Cancel</button>
            </div>
          </div>

          <!-- Join Tab Body -->
          <div id="panel-wt-join" class="wt-p2p-tab-panel hidden">
            <div class="wt-p2p-field-group">
              <label class="wt-p2p-label">ENTER MATCH CODE OR ROOM ID:</label>
              <div class="wt-p2p-join-box">
                <input type="text" id="wt-join-code-input" class="wt-code-input" placeholder="Paste match code or enter WORD-P2P-...">
                <button id="btn-wt-submit-join" class="btn btn-gold" type="button">Connect</button>
              </div>
              <div id="wt-join-error" class="wt-join-error hidden"></div>
            </div>

            <div class="wt-p2p-divider">
              <span>OR CONNECT TO OPEN ROOM</span>
            </div>

            <div class="wt-p2p-rooms-section">
              <label class="wt-p2p-label">AVAILABLE ROOMS (DETECTED ON THIS BROWSER):</label>
              <div id="wt-available-rooms-list" class="wt-rooms-list">
                <div class="wt-rooms-empty">Scanning for open rooms in other tabs...</div>
              </div>
            </div>

            <div class="wt-modal-actions">
              <button id="btn-wt-cancel-join" class="btn btn-secondary" type="button">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: Blank Tile Letter Chooser -->
      <div id="wt-blank-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content">
          <div class="wt-modal-header">
            <h3>DESIGNATE BLANK TILE</h3>
            <p>Choose which letter this wildcard represents (scores 0 letter points):</p>
          </div>
          <div class="wt-letter-grid" id="wt-blank-letter-grid"></div>
        </div>
      </div>

      <!-- MODAL: Tile Exchange -->
      <div id="wt-exchange-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content">
          <div class="wt-modal-header">
            <h3>EXCHANGE TILES</h3>
            <p>Select the tiles from your rack you wish to return to the bag (costs 1 turn):</p>
          </div>
          <div class="wt-exchange-rack-select" id="wt-exchange-rack-select"></div>
          <div class="wt-modal-actions">
            <button id="btn-wt-confirm-exchange" class="btn btn-primary" disabled>Swap Selected</button>
            <button id="btn-wt-cancel-exchange" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Game Over Summary -->
      <div id="wt-gameover-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content wt-modal-victory">
          <div class="wt-victory-header">
            <span class="wt-trophy-icon" id="wt-gov-icon">🏆</span>
            <h2 id="wt-gov-title">GAME COMPLETED</h2>
            <p id="wt-gov-reason">Rack emptied!</p>
          </div>
          <div class="wt-final-scores-card">
            <div class="wt-final-score-row">
              <span class="wt-final-lbl">Your Final Score:</span>
              <strong class="wt-final-val gold" id="wt-gov-human-score">0</strong>
            </div>
            <div class="wt-final-score-row">
              <span class="wt-final-lbl" id="wt-gov-ai-score-label">Computer Final Score:</span>
              <strong class="wt-final-val" id="wt-gov-ai-score">0</strong>
            </div>
            <div class="wt-final-adjustment-text" id="wt-gov-adj-text"></div>
          </div>
          <div class="wt-modal-actions">
            <button id="btn-wt-new-game" class="btn btn-gold btn-large">✦ Play Again</button>
            <button id="btn-wt-close-gameover" class="btn btn-secondary">Close</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Rules & Scoring -->
      <div id="wt-rules-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content wt-rules-dialog">
          <div class="wt-modal-header">
            <h3>WORD TILES: RULES & SCORING</h3>
            <button id="btn-wt-close-rules" class="wt-close-icon">&times;</button>
          </div>
          <div class="wt-rules-body">
            <h4>Board & Opening Move</h4>
            <p>The game is played on a 15×15 grid. The first word played must cover the <strong>Center Star (★)</strong> and be at least 2 letters long.</p>
            <h4>Word Formation & Bridging</h4>
            <p>All newly placed tiles must be placed in a single straight row or column without gaps. Tiles from previous turns can bridge spaces between new tiles. Later moves must connect with at least one existing tile.</p>
            <h4>Turn-Based 2-Player Head-to-Head</h4>
            <p>Unlike racing or speed challenges, this is a <strong>shared-board, turn-based game</strong>. You and your opponent play on the exact same board, building off each other's words and strategizing around premium multiplier squares!</p>
            <h4>Premium Multiplier Squares</h4>
            <ul>
              <li><strong style="color: #ff5252;">3W (Triple Word)</strong>: Triples entire word score.</li>
              <li><strong style="color: #ff9100;">2W (Double Word)</strong>: Doubles entire word score (includes Center Star).</li>
              <li><strong style="color: #448aff;">3L (Triple Letter)</strong>: Triples the value of the tile placed on it.</li>
              <li><strong style="color: #00e5ff;">2L (Double Letter)</strong>: Doubles the value of the tile placed on it.</li>
            </ul>
            <p><strong>Strict Fair-Play Rule:</strong> Multipliers activate <em>only on the turn a new tile covers them</em>. Occupied squares never re-trigger bonuses on subsequent turns!</p>
            <h4>Special Bonuses</h4>
            <p><strong>Full-Rack Bingo (+50 pts):</strong> Awarded when all 7 tiles from your rack are played in a single turn.</p>
            <p><strong>Wildcard / Blank Tiles:</strong> Blank tiles score 0 points and can represent any letter from A to Z.</p>
          </div>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    // Commit
    this.container.querySelector('#btn-wt-commit')?.addEventListener('click', () => this.handleCommit());
    // Recall
    this.container.querySelector('#btn-wt-recall')?.addEventListener('click', () => {
      if (this.game && this.game.state.turn === 'human' && !this.game.state.gameOver) {
        this.game.recallAll();
        this.app.sound?.playCardSlide?.();
        this.render();
      }
    });
    // Shuffle
    this.container.querySelector('#btn-wt-shuffle')?.addEventListener('click', () => {
      if (this.game && this.game.state.turn === 'human' && !this.game.state.gameOver) {
        this.game.shuffleHumanRack();
        this.app.sound?.playShuffle?.();
        this.render();
      }
    });
    // Pass
    this.container.querySelector('#btn-wt-pass')?.addEventListener('click', () => this.handlePass());
    // Exchange
    this.container.querySelector('#btn-wt-exchange')?.addEventListener('click', () => this.openExchangeModal());
    // Rules
    this.container.querySelector('#btn-wt-rules')?.addEventListener('click', () => {
      this.container.querySelector('#wt-rules-modal')?.classList.remove('hidden');
    });
    this.container.querySelector('#btn-wt-close-rules')?.addEventListener('click', () => {
      this.container.querySelector('#wt-rules-modal')?.classList.add('hidden');
    });

    // P2P Launcher & Leave buttons
    this.container.querySelector('#btn-wt-open-p2p')?.addEventListener('click', () => this.openP2PModal());
    this.container.querySelector('#btn-wt-leave-p2p')?.addEventListener('click', () => this.leaveP2PMatch());

    // P2P Modal controls
    this.container.querySelector('#btn-wt-close-p2p')?.addEventListener('click', () => this.closeP2PModal());
    this.container.querySelector('#btn-wt-cancel-host')?.addEventListener('click', () => this.closeP2PModal());
    this.container.querySelector('#btn-wt-cancel-join')?.addEventListener('click', () => this.closeP2PModal());

    this.container.querySelector('#tab-wt-host')?.addEventListener('click', () => this._switchP2PTab('host'));
    this.container.querySelector('#tab-wt-join')?.addEventListener('click', () => this._switchP2PTab('join'));
    this.container.querySelector('#btn-wt-copy-code')?.addEventListener('click', () => this._copyHostCode());
    this.container.querySelector('#btn-wt-submit-join')?.addEventListener('click', () => this._submitJoinByInput());
    this.container.querySelector('#wt-join-code-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._submitJoinByInput();
      }
    });

    // Difficulty buttons
    this.container.querySelectorAll('.btn-diff').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const diff = e.target.dataset.diff;
        if (this.game && diff) {
          this.game.setDifficulty(diff);
          this.container.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
        }
      });
    });

    // Blank chooser letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const grid = this.container.querySelector('#wt-blank-letter-grid');
    if (grid) {
      grid.innerHTML = '';
      for (let i = 0; i < alphabet.length; i++) {
        const char = alphabet[i];
        const btn = document.createElement('button');
        btn.className = 'wt-blank-letter-btn';
        btn.textContent = char;
        btn.addEventListener('click', () => this.selectBlankLetter(char));
        grid.appendChild(btn);
      }
    }

    // Exchange modal controls
    this.container.querySelector('#btn-wt-cancel-exchange')?.addEventListener('click', () => {
      this.container.querySelector('#wt-exchange-modal')?.classList.add('hidden');
    });
    this.container.querySelector('#btn-wt-confirm-exchange')?.addEventListener('click', () => {
      this.confirmExchange();
    });

    // Game Over controls
    this.container.querySelector('#btn-wt-new-game')?.addEventListener('click', () => {
      this.container.querySelector('#wt-gameover-modal')?.classList.add('hidden');
      if (this.isP2P) {
        this.leaveP2PMatch();
      } else {
        this.app.startNewGame();
      }
    });
    this.container.querySelector('#btn-wt-close-gameover')?.addEventListener('click', () => {
      this.container.querySelector('#wt-gameover-modal')?.classList.add('hidden');
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (this.app?.gameType !== 'word_tiles') return;
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (!this.game || this.game.state.turn !== 'human' || this.game.state.gameOver) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleCommit();
      } else if (e.key === 'r' || e.key === 'R') {
        this.game.recallAll();
        this.app.sound?.playCardSlide();
        this.render();
      } else if (e.key === 's' || e.key === 'S') {
        this.game.shuffleHumanRack();
        this.app.sound?.playShuffle();
        this.render();
      } else if (e.key === 'p' || e.key === 'P') {
        this.handlePass();
      } else if (e.key === 'x' || e.key === 'X') {
        this.openExchangeModal();
      }
    });
  }

  // --------------------------------------------------------------------------
  // P2P MATCH DIALOG & PROTOCOL HANDLING
  // --------------------------------------------------------------------------

  openP2PModal() {
    const modal = this.container.querySelector('#wt-p2p-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this._switchP2PTab('host');
  }

  closeP2PModal() {
    const modal = this.container.querySelector('#wt-p2p-modal');
    if (modal) modal.classList.add('hidden');
    if (this.p2pManager && this.p2pManager.status === P2P_MATCH_STATUS.HOSTING && !this.isP2P) {
      this.p2pManager.stopAnnouncing();
    }
  }

  _switchP2PTab(tab) {
    const hostTab = this.container.querySelector('#tab-wt-host');
    const joinTab = this.container.querySelector('#tab-wt-join');
    const hostPanel = this.container.querySelector('#panel-wt-host');
    const joinPanel = this.container.querySelector('#panel-wt-join');
    const errorEl = this.container.querySelector('#wt-join-error');
    if (errorEl) errorEl.classList.add('hidden');

    if (tab === 'host') {
      hostTab?.classList.add('active');
      joinTab?.classList.remove('active');
      hostPanel?.classList.remove('hidden');
      joinPanel?.classList.add('hidden');
      this._startHosting();
    } else {
      joinTab?.classList.add('active');
      hostTab?.classList.remove('active');
      joinPanel?.classList.remove('hidden');
      hostPanel?.classList.add('hidden');
      this.p2pManager.stopAnnouncing();
      this.p2pManager.queryOpenRooms();
      this._onP2PAvailableRoomsChange(Array.from(this.p2pManager.availableRooms.values()));
    }
  }

  _startHosting() {
    this.p2pManager.playerName = this.app.profiles?.getActiveProfile()?.name || 'Player 1';
    const roomInfo = this.p2pManager.hostRoom();
    const displayInput = this.container.querySelector('#wt-host-code-display');
    if (displayInput) {
      displayInput.value = roomInfo.matchCode;
    }
  }

  async _copyHostCode() {
    const input = this.container.querySelector('#wt-host-code-display');
    const code = input?.value || '';
    if (!code) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        input.select();
        document.execCommand('copy');
      }
      const feedback = this.container.querySelector('#wt-copy-success');
      if (feedback) {
        feedback.classList.remove('hidden');
        setTimeout(() => feedback.classList.add('hidden'), 3000);
      }
    } catch (err) {
      console.warn('[WordTiles] Copy to clipboard failed:', err);
    }
  }

  _submitJoinByInput() {
    const input = this.container.querySelector('#wt-join-code-input');
    const errorEl = this.container.querySelector('#wt-join-error');
    const val = input ? input.value.trim() : '';

    if (!val) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a match code or room ID.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    const myName = this.app.profiles?.getActiveProfile()?.name || 'Player 2';
    if (val.toUpperCase().startsWith('WORD-P2P')) {
      this.p2pManager.joinRoom(val.toUpperCase(), myName);
      if (errorEl) errorEl.classList.add('hidden');
    } else {
      const res = this.p2pManager.joinByCode(val, myName);
      if (res === false && errorEl) {
        errorEl.textContent = 'Invalid match code. Please check and try again.';
        errorEl.classList.remove('hidden');
      } else if (errorEl) {
        errorEl.classList.add('hidden');
      }
    }
  }

  _onP2PAvailableRoomsChange(rooms) {
    const listEl = this.container.querySelector('#wt-available-rooms-list');
    if (!listEl) return;

    if (!rooms || rooms.length === 0) {
      listEl.innerHTML = `<div class="wt-rooms-empty">Scanning for open rooms in other tabs or windows...</div>`;
      return;
    }

    listEl.innerHTML = '';
    for (const r of rooms) {
      const item = document.createElement('div');
      item.className = 'wt-room-item';
      item.innerHTML = `
        <div class="wt-room-meta">
          <span class="wt-room-host">👑 ${r.hostName || 'Player 1'}</span>
          <span class="wt-room-id">${r.roomId}</span>
        </div>
        <button class="btn btn-gold btn-sm btn-join-room" data-room-id="${r.roomId}">Join Room</button>
      `;
      item.querySelector('.btn-join-room')?.addEventListener('click', () => {
        const myName = this.app.profiles?.getActiveProfile()?.name || 'Player 2';
        this.p2pManager.joinRoom(r.roomId, myName);
      });
      listEl.appendChild(item);
    }
  }

  _onP2PMatchConnected(matchInfo) {
    this.isP2P = true;
    const newGame = new WordTilesGame({
      seed: matchInfo.seed,
      dictionary: this.app.wordDictionary,
      p2pRole: matchInfo.role,
      playerName: this.p2pManager.playerName,
      opponentName: matchInfo.opponentName
    });

    this.app.currentGame = newGame;
    this.setGame(newGame);
    this.closeP2PModal();
    this.app.sound?.playSuccess?.();
    this.app._displayHintMessage(`⚔️ Connected! Turn-based match with ${matchInfo.opponentName} started on shared board.`);
    this.render();
  }

  _onP2PRemoteMove(moveData, fromName) {
    if (!this.game) return;
    const applied = this.game.applyRemoteMove(moveData, fromName);
    if (applied) {
      this.app.sound?.playCardSnap?.();
      const wordList = moveData.words?.map(w => w.text).join(', ') || 'a word';
      this.app._displayHintMessage(`⚔️ ${fromName} played ${wordList} for +${moveData.score} pts! It's your turn.`);
      this.render();
      if (this.game.state.gameOver) {
        this._showGameOver();
      }
    }
  }

  _onP2PRemotePass(fromName) {
    if (!this.game) return;
    this.game.applyRemotePass(fromName);
    this.app.sound?.playCardSlide?.();
    this.app._displayHintMessage(`⚔️ ${fromName} passed their turn. It's your turn.`);
    this.render();
    if (this.game.state.gameOver) {
      this._showGameOver();
    }
  }

  _onP2PRemoteExchange(count, fromName) {
    if (!this.game) return;
    this.game.applyRemoteExchange(count, fromName);
    this.app.sound?.playShuffle?.();
    this.app._displayHintMessage(`⚔️ ${fromName} exchanged ${count} tiles with the bag. It's your turn.`);
    this.render();
  }

  leaveP2PMatch() {
    this.p2pManager.leaveMatch();
    this.isP2P = false;
    this.app.startNewGame();
    this.app._displayHintMessage('Returned to Solo vs AI Word Tiles game.');
  }

  // --------------------------------------------------------------------------
  // RENDERING
  // --------------------------------------------------------------------------

  render() {
    if (!this.game) return;

    // 1. Render Scoreboard & Turn info
    const humanScoreEl = this.container.querySelector('#wt-human-score');
    const aiScoreEl = this.container.querySelector('#wt-ai-score');
    const bagCountEl = this.container.querySelector('#wt-bag-count');
    const turnTextEl = this.container.querySelector('#wt-turn-text');
    const humanBoxEl = this.container.querySelector('#wt-human-box');
    const aiBoxEl = this.container.querySelector('#wt-ai-box');
    const humanLbl = this.container.querySelector('#wt-human-label');
    const aiLbl = this.container.querySelector('#wt-ai-label');
    const aiAvatar = this.container.querySelector('#wt-ai-avatar');

    if (humanScoreEl) humanScoreEl.textContent = `${this.game.state.humanScore} pts`;
    if (aiScoreEl) aiScoreEl.textContent = `${this.game.state.aiScore} pts`;
    if (bagCountEl) bagCountEl.textContent = this.game.bag.count();

    const isHumanTurn = this.game.state.turn === 'human' && !this.game.state.gameOver;
    humanBoxEl?.classList.toggle('active-player', isHumanTurn);
    aiBoxEl?.classList.toggle('active-player', !isHumanTurn);

    // Dynamic Player Labels & Avatars
    if (this.isP2P) {
      if (humanLbl) {
        humanLbl.textContent = this.p2pManager.role === 'host' ? 'YOU (HOST)' : 'YOU (GUEST)';
      }
      if (aiLbl) {
        aiLbl.textContent = (this.game.opponentName || 'OPPONENT').toUpperCase();
      }
      if (aiAvatar) {
        aiAvatar.textContent = '👤';
      }
    } else {
      if (humanLbl) humanLbl.textContent = 'YOU (HUMAN)';
      if (aiLbl) aiLbl.textContent = 'SOVEREIGN AI';
      if (aiAvatar) aiAvatar.textContent = '🤖';
    }

    // Turn indicator text
    if (this.game.state.gameOver) {
      const winnerName = this.isP2P && this.game.state.winner === 'Computer'
        ? (this.game.opponentName || 'Opponent')
        : this.game.state.winner;
      if (turnTextEl) turnTextEl.textContent = `Game Over (${winnerName} Wins)`;
    } else if (isHumanTurn) {
      if (turnTextEl) turnTextEl.textContent = 'Your Turn';
    } else {
      if (turnTextEl) {
        turnTextEl.textContent = this.isP2P
          ? `${this.game.opponentName || 'Opponent'}'s Turn`
          : 'Computer Thinking...';
      }
    }

    // P2P Active Banner & Launch Panel visibility
    const activeBanner = this.container.querySelector('#wt-p2p-active-banner');
    const launchPanel = this.container.querySelector('#wt-p2p-launch-panel');
    const diffPanel = this.container.querySelector('#wt-diff-panel');
    const roomCodeTag = this.container.querySelector('#wt-p2p-room-code-tag');
    const roleText = this.container.querySelector('#wt-p2p-role-text');

    if (activeBanner) activeBanner.classList.toggle('hidden', !this.isP2P);
    if (launchPanel) launchPanel.classList.toggle('hidden', this.isP2P);
    if (diffPanel) diffPanel.classList.toggle('hidden', this.isP2P);

    if (this.isP2P) {
      if (roomCodeTag) roomCodeTag.textContent = this.p2pManager.roomId || 'WORD-P2P';
      if (roleText) {
        roleText.textContent = this.p2pManager.role === 'host'
          ? 'You: Player 1 (Host)'
          : 'You: Player 2 (Guest)';
      }
    }

    // Action button states based on turn ownership
    const recallBtn = this.container.querySelector('#btn-wt-recall');
    const shuffleBtn = this.container.querySelector('#btn-wt-shuffle');
    const exchangeBtn = this.container.querySelector('#btn-wt-exchange');
    const passBtn = this.container.querySelector('#btn-wt-pass');

    if (recallBtn) recallBtn.disabled = !isHumanTurn;
    if (shuffleBtn) shuffleBtn.disabled = !isHumanTurn;
    if (exchangeBtn) {
      exchangeBtn.disabled = !isHumanTurn || this.game.bag.count() < RULES_CONFIG_V1.exchangeMinimumBag;
    }
    if (passBtn) passBtn.disabled = !isHumanTurn;

    // 2. Render 15x15 Board Grid
    this._renderBoard();

    // 3. Render Rack
    this._renderRack();

    // 4. Update Move History
    this._renderHistory();

    // 5. Update Tentative Validation & Preview
    this._updateTentativePreview();
  }

  _renderBoard() {
    const gridEl = this.container.querySelector('#wt-board-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const tempPlacementMap = new Map();
    for (const p of this.game.temporaryPlacements) {
      tempPlacementMap.set(`${p.row},${p.col}`, p.tile);
    }

    for (let r = 0; r < this.game.board.size; r++) {
      for (let c = 0; c < this.game.board.size; c++) {
        const cell = this.game.board.getCell(r, c);
        const cellEl = document.createElement('div');
        cellEl.className = 'wt-cell';
        cellEl.dataset.row = r;
        cellEl.dataset.col = c;

        // Premium cell labeling
        if (cell.isCenter) {
          cellEl.classList.add('premium-center');
          cellEl.innerHTML = `<span class="wt-cell-badge">★</span>`;
        } else if (cell.premium === '3W') {
          cellEl.classList.add('premium-3w');
          cellEl.innerHTML = `<span class="wt-cell-badge">3W</span>`;
        } else if (cell.premium === '2W') {
          cellEl.classList.add('premium-2w');
          cellEl.innerHTML = `<span class="wt-cell-badge">2W</span>`;
        } else if (cell.premium === '3L') {
          cellEl.classList.add('premium-3l');
          cellEl.innerHTML = `<span class="wt-cell-badge">3L</span>`;
        } else if (cell.premium === '2L') {
          cellEl.classList.add('premium-2l');
          cellEl.innerHTML = `<span class="wt-cell-badge">2L</span>`;
        }

        // Render Tile (Committed or Temporary)
        const isTemporary = tempPlacementMap.has(`${r},${c}`);
        const tile = isTemporary ? tempPlacementMap.get(`${r},${c}`) : (cell.isOccupied() ? cell.tile : null);

        if (tile) {
          const tileEl = document.createElement('div');
          tileEl.className = 'wt-tile' + (isTemporary ? ' wt-tile-temporary' : ' wt-tile-committed');
          tileEl.innerHTML = `
            <span class="wt-tile-letter">${tile.getEffectiveLetter()}</span>
            <span class="wt-tile-score">${tile.isBlank ? '0' : tile.score}</span>
          `;
          if (tile.isBlank) {
            tileEl.classList.add('wt-tile-blank');
          }

          // Temporary tiles can be dragged or clicked to recall
          if (isTemporary && this.game.state.turn === 'human' && !this.game.state.gameOver) {
            tileEl.draggable = true;
            tileEl.addEventListener('dragstart', (e) => this._onTileDragStart(e, { source: 'board', row: r, col: c, tile }));
            tileEl.addEventListener('click', (e) => {
              e.stopPropagation();
              if (tile.isBlank && !tile.designatedLetter) {
                this.promptBlankLetter(r, c);
              } else {
                this.game.recallTile(r, c);
                this.app.sound?.playCardSlide();
                this.render();
              }
            });
          }

          cellEl.appendChild(tileEl);
        }

        // Drag & Drop Listeners on Board Cell
        cellEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (this.game.state.turn === 'human' && !this.game.state.gameOver) {
            e.dataTransfer.dropEffect = 'move';
            cellEl.classList.add('wt-cell-dragover');
          }
        });
        cellEl.addEventListener('dragleave', () => {
          cellEl.classList.remove('wt-cell-dragover');
        });
        cellEl.addEventListener('drop', (e) => this._onCellDrop(e, r, c));

        // Click-to-place listener
        cellEl.addEventListener('click', () => this._onCellClick(r, c));

        gridEl.appendChild(cellEl);
      }
    }
  }

  _renderRack() {
    const trayEl = this.container.querySelector('#wt-rack-tray');
    if (!trayEl) return;
    trayEl.innerHTML = '';

    const isHumanTurn = this.game.state.turn === 'human' && !this.game.state.gameOver;

    for (let i = 0; i < RULES_CONFIG_V1.rackCapacity; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'wt-rack-slot';
      slotEl.dataset.slotIndex = i;

      const tile = this.game.humanRack[i];
      if (tile) {
        const tileEl = document.createElement('div');
        tileEl.className = 'wt-tile wt-tile-rack';
        if (this.selectedRackIndex === i) {
          tileEl.classList.add('selected');
        }
        tileEl.draggable = isHumanTurn;
        tileEl.innerHTML = `
          <span class="wt-tile-letter">${tile.letter === '_' ? '★' : tile.letter}</span>
          <span class="wt-tile-score">${tile.score}</span>
        `;
        if (tile.isBlank) {
          tileEl.classList.add('wt-tile-blank');
        }

        if (isHumanTurn) {
          // Drag Start
          tileEl.addEventListener('dragstart', (e) => this._onTileDragStart(e, { source: 'rack', rackIndex: i, tile }));

          // Click to select
          tileEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.selectedRackIndex === i) {
              this.selectedRackIndex = null;
            } else {
              this.selectedRackIndex = i;
            }
            this.render();
          });
        }

        slotEl.appendChild(tileEl);
      }

      trayEl.appendChild(slotEl);
    }
  }

  _renderHistory() {
    const listEl = this.container.querySelector('#wt-history-list');
    const countEl = this.container.querySelector('#wt-history-count');
    if (!listEl) return;

    if (countEl) countEl.textContent = `${this.game.moveHistory.length} moves`;

    if (this.game.moveHistory.length === 0) {
      listEl.innerHTML = `<div class="wt-history-empty">Game begins! Place your first word covering the center star.</div>`;
      return;
    }

    listEl.innerHTML = '';
    for (const item of this.game.moveHistory) {
      const rowEl = document.createElement('div');
      rowEl.className = `wt-history-item wt-hist-${(item.player || '').toLowerCase()}`;

      let details = '';
      if (item.action === 'play') {
        details = `<strong>${item.word}</strong> <span class="wt-hist-pts">+${item.score} pts</span>`;
        if (item.bingo) details += ` <span class="wt-bingo-tag">BINGO!</span>`;
      } else if (item.action === 'exchange') {
        details = `<em>Exchanged ${item.count} tiles</em>`;
      } else {
        details = `<em>Passed turn</em>`;
      }

      rowEl.innerHTML = `
        <span class="wt-hist-player">${item.player}:</span>
        <span class="wt-hist-details">${details}</span>
      `;
      listEl.appendChild(rowEl);
    }
  }

  _updateTentativePreview() {
    const calloutEl = this.container.querySelector('#wt-preview-callout');
    const textEl = this.container.querySelector('#wt-preview-text');
    const commitBtn = this.container.querySelector('#btn-wt-commit');
    const commitText = this.container.querySelector('#btn-wt-commit-text');

    if (!calloutEl || !textEl || !commitBtn) return;

    if (this.game.state.turn !== 'human' || this.game.state.gameOver) {
      commitBtn.disabled = true;
      if (commitText) commitText.textContent = 'Commit';
      calloutEl.className = 'wt-preview-callout wt-preview-idle';
      if (this.game.state.gameOver) {
        textEl.textContent = 'Game Completed';
      } else if (this.isP2P) {
        textEl.textContent = `Waiting for ${this.game.opponentName || 'Opponent'} to place a word on the shared board...`;
      } else {
        textEl.textContent = 'Opponent is choosing a move...';
      }
      return;
    }

    if (this.game.temporaryPlacements.length === 0) {
      commitBtn.disabled = true;
      if (commitText) commitText.textContent = 'Commit';
      calloutEl.className = 'wt-preview-callout wt-preview-idle';
      textEl.textContent = 'Select or drag tiles to the board to form a word';
      return;
    }

    const validation = this.game.getTentativeValidation();
    if (!validation.valid) {
      commitBtn.disabled = true;
      if (commitText) commitText.textContent = 'Commit';
      calloutEl.className = 'wt-preview-callout wt-preview-invalid';
      textEl.textContent = `⚠️ ${validation.error || 'Invalid placement'}`;
    } else {
      commitBtn.disabled = false;
      const wordNames = validation.words.map(w => w.text).join(' & ');
      let bonusText = validation.bingo ? ' (Includes +50 Bingo Bonus!)' : '';
      if (commitText) commitText.textContent = `Commit (+${validation.score} pts)`;
      calloutEl.className = 'wt-preview-callout wt-preview-valid';
      textEl.innerHTML = `<strong>${wordNames}</strong>: +${validation.score} pts${bonusText}`;
    }
  }

  // --------------------------------------------------------------------------
  // INPUT & DRAG-AND-DROP HANDLERS
  // --------------------------------------------------------------------------

  _onTileDragStart(e, data) {
    if (this.game.state.turn !== 'human' || this.game.state.gameOver) {
      e.preventDefault();
      return;
    }
    this.draggedTileData = data;
    e.dataTransfer.setData('text/plain', JSON.stringify({ source: data.source }));
  }

  _onCellDrop(e, row, col) {
    e.preventDefault();
    const cellEl = e.currentTarget;
    cellEl.classList.remove('wt-cell-dragover');

    if (!this.draggedTileData || this.game.state.turn !== 'human' || this.game.state.gameOver) return;

    if (this.draggedTileData.source === 'rack') {
      const rackIndex = this.draggedTileData.rackIndex;
      const tile = this.game.humanRack[rackIndex];
      const placed = this.game.placeTileFromRack(rackIndex, row, col);
      if (placed) {
        this.app.sound?.playCardSnap?.();
        if (tile && tile.isBlank && !tile.designatedLetter) {
          this.promptBlankLetter(row, col);
        }
        this.render();
      }
    } else if (this.draggedTileData.source === 'board') {
      const fromRow = this.draggedTileData.row;
      const fromCol = this.draggedTileData.col;
      if (fromRow !== row || fromCol !== col) {
        const tile = this.game.temporaryPlacements.find(p => p.row === fromRow && p.col === fromCol)?.tile;
        if (tile && this.game.recallTile(fromRow, fromCol)) {
          const rackIdx = this.game.humanRack.findIndex(t => t.id === tile.id);
          this.game.placeTileFromRack(rackIdx, row, col);
          this.app.sound?.playCardSnap?.();
          this.render();
        }
      }
    }

    this.draggedTileData = null;
  }

  _onCellClick(row, col) {
    if (this.game.state.turn !== 'human' || this.game.state.gameOver) return;

    if (this.selectedRackIndex !== null) {
      const tile = this.game.humanRack[this.selectedRackIndex];
      const placed = this.game.placeTileFromRack(this.selectedRackIndex, row, col);
      if (placed) {
        this.app.sound?.playCardSnap?.();
        if (tile && tile.isBlank && !tile.designatedLetter) {
          this.promptBlankLetter(row, col);
        }
        this.selectedRackIndex = null;
        this.render();
      }
    }
  }

  promptBlankLetter(row, col) {
    this.pendingBlankCoord = { row, col };
    const modal = this.container.querySelector('#wt-blank-modal');
    modal?.classList.remove('hidden');
  }

  selectBlankLetter(char) {
    if (this.pendingBlankCoord && this.game) {
      this.game.assignBlankLetter(this.pendingBlankCoord.row, this.pendingBlankCoord.col, char);
      this.pendingBlankCoord = null;
      this.container.querySelector('#wt-blank-modal')?.classList.add('hidden');
      this.render();
    }
  }

  // --------------------------------------------------------------------------
  // ACTIONS (COMMIT, PASS, EXCHANGE)
  // --------------------------------------------------------------------------

  async handleCommit() {
    if (!this.game) return;
    if (this.game.state.gameOver) {
      this.app._displayHintMessage("The match has concluded. Start a new game to play again.");
      return;
    }
    if (this.game.state.turn !== 'human') {
      this.app._displayHintMessage("Please wait for your opponent's move to finish.");
      return;
    }
    if (this.game.temporaryPlacements.length === 0) {
      this.app._displayHintMessage("No tiles placed! Drag or click tiles from your rack onto the board first.");
      return;
    }

    const res = this.game.commitHumanMove();
    if (!res.success) {
      this.app._displayHintMessage(`⚠️ ${res.error}`);
      return;
    }

    this.app.sound?.playSuccess?.();
    this.render();

    // In Turn-Based P2P mode, broadcast the move and wait for opponent's turn on shared board
    if (this.isP2P) {
      this.p2pManager.sendMove(res.movePayload);
      if (res.gameOver) {
        this._showGameOver();
      }
      return;
    }

    if (res.gameOver) {
      this._showGameOver();
      return;
    }

    // Trigger AI Turn in Solo Mode
    await this._triggerAITurn();
  }

  async handlePass() {
    if (!this.game || this.game.state.turn !== 'human' || this.game.state.gameOver) return;

    this.game.passTurn();
    this.app.sound?.playCardSlide?.();
    this.render();

    if (this.isP2P) {
      this.p2pManager.sendPass();
      if (this.game.state.gameOver) {
        this._showGameOver();
      }
      return;
    }

    if (this.game.state.gameOver) {
      this._showGameOver();
      return;
    }

    await this._triggerAITurn();
  }

  async _triggerAITurn() {
    this.render();

    setTimeout(async () => {
      if (!this.game || this.game.state.turn !== 'ai' || this.game.state.gameOver) return;

      const aiRes = await this.game.executeAITurn();
      if (aiRes) {
        if (aiRes.action === 'play') {
          this.app.sound?.playCardSnap?.();
        } else {
          this.app.sound?.playCardSlide?.();
        }
      }

      this.render();

      if (this.game.state.gameOver) {
        this._showGameOver();
      }
    }, 600);
  }

  openExchangeModal() {
    if (!this.game || this.game.state.turn !== 'human' || this.game.state.gameOver) return;

    if (this.game.bag.count() < RULES_CONFIG_V1.exchangeMinimumBag) {
      this.app._displayHintMessage(`Cannot exchange: bag has fewer than ${RULES_CONFIG_V1.exchangeMinimumBag} tiles remaining.`);
      return;
    }

    this.game.recallAll();
    this.render();

    const rackContainer = this.container.querySelector('#wt-exchange-rack-select');
    const confirmBtn = this.container.querySelector('#btn-wt-confirm-exchange');
    if (!rackContainer || !confirmBtn) return;

    rackContainer.innerHTML = '';
    const selectedIndices = new Set();

    for (let i = 0; i < this.game.humanRack.length; i++) {
      const tile = this.game.humanRack[i];
      const tilePill = document.createElement('button');
      tilePill.className = 'wt-tile wt-tile-rack';
      tilePill.innerHTML = `
        <span class="wt-tile-letter">${tile.letter === '_' ? '★' : tile.letter}</span>
        <span class="wt-tile-score">${tile.score}</span>
      `;
      tilePill.addEventListener('click', () => {
        if (selectedIndices.has(i)) {
          selectedIndices.delete(i);
          tilePill.classList.remove('selected');
        } else {
          selectedIndices.add(i);
          tilePill.classList.add('selected');
        }
        confirmBtn.disabled = selectedIndices.size === 0;
      });
      rackContainer.appendChild(tilePill);
    }

    confirmBtn.disabled = true;
    confirmBtn.dataset.indices = '';
    this.pendingExchangeSet = selectedIndices;

    this.container.querySelector('#wt-exchange-modal')?.classList.remove('hidden');
  }

  async confirmExchange() {
    if (!this.pendingExchangeSet || this.pendingExchangeSet.size === 0) return;

    const indices = Array.from(this.pendingExchangeSet);
    const res = this.game.exchangeTiles(indices);
    this.container.querySelector('#wt-exchange-modal')?.classList.add('hidden');

    if (res.success) {
      this.app.sound?.playShuffle();
      this.render();

      if (this.isP2P) {
        this.p2pManager.sendExchange(indices.length);
        return;
      }

      await this._triggerAITurn();
    }
  }

  _showGameOver() {
    const modal = this.container.querySelector('#wt-gameover-modal');
    const titleEl = this.container.querySelector('#wt-gov-title');
    const reasonEl = this.container.querySelector('#wt-gov-reason');
    const humanScoreEl = this.container.querySelector('#wt-gov-human-score');
    const aiScoreEl = this.container.querySelector('#wt-gov-ai-score');
    const aiScoreLbl = this.container.querySelector('#wt-gov-ai-score-label');
    const adjTextEl = this.container.querySelector('#wt-gov-adj-text');

    if (!modal) return;

    const winner = this.game.state.winner;
    const opponentDisplay = this.isP2P ? (this.game.opponentName || 'Player 2') : 'Computer';

    if (aiScoreLbl) {
      aiScoreLbl.textContent = `${opponentDisplay} Final Score:`;
    }

    if (titleEl) {
      if (winner === 'Human') {
        titleEl.textContent = '🎉 YOU WIN!';
      } else if (winner === 'Computer') {
        titleEl.textContent = `⚔️ ${opponentDisplay.toUpperCase()} WINS!`;
      } else {
        titleEl.textContent = '🤝 TIE GAME!';
      }
    }

    if (reasonEl) {
      const r = this.game.state.gameEndReason;
      reasonEl.textContent = r === 'human_emptied_rack'
        ? 'You played all your tiles and the bag is empty!'
        : (r === 'ai_emptied_rack' ? `${opponentDisplay} played all their tiles!` : 'Game ended after consecutive passes.');
    }

    if (humanScoreEl) humanScoreEl.textContent = this.game.state.humanScore;
    if (aiScoreEl) aiScoreEl.textContent = this.game.state.aiScore;

    if (adjTextEl && this.game.state.finalScoreAdjustments) {
      const adj = this.game.state.finalScoreAdjustments;
      adjTextEl.textContent = `Score adjustments: You ${adj.humanAdjustment >= 0 ? '+' : ''}${adj.humanAdjustment} pts, ${opponentDisplay} ${adj.aiAdjustment >= 0 ? '+' : ''}${adj.aiAdjustment} pts for remaining tiles.`;
    }

    modal.classList.remove('hidden');

    if (winner === 'Human') {
      this.app.sound?.playSuccess?.();
      this.app.victoryCascade?.start('grand_royale');
    }
  }
}
