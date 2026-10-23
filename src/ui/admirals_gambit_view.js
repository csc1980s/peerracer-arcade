/**
 * Admiral's Gambit: Iron Fleet — Main UI Controller
 *
 * Implements the naval command bridge interface:
 * - 3D WebGL viewport with Cockpit Bridge & Tactical Orbit cameras
 * - Dual-channel CRT radar screens (Friendly Fleet Defense & Enemy Targeting)
 * - Command Points (CP) energy budget with battery pip indicators
 * - Asymmetric Tactical Gambits (Air Recon, 16-Inch Salvo, Radar Sweep, Depth Charge, Smoke)
 * - Real-time turret tracking, shell ballistics, and tactical combat feed
 */

import { AdmiralsGambitGame } from '../games/admirals_gambit.js';
import {
  GRID_SIZE,
  SHIP_CLASSES,
  COMMAND_POINTS,
  GAME_PHASE,
  CELL_STATE,
  coordToString
} from '../core/admirals_gambit/rules_config.js';
import { NavalSceneCoordinator } from '../renderer/naval/NavalSceneCoordinator.js';
import { NavalTheaterCoordinator } from '../renderer/naval/NavalTheaterCoordinator.js';
import { SHIP_SPRITE_DATA } from '../renderer/naval/ShipSpriteAssets.js';

export class AdmiralsGambitView {
  constructor(app, containerEl) {
    this.app = app;
    this.container = containerEl;
    this.game = null;

    // View state
    this.hoverCell = null;
    this.selectedGambit = null; // null | 'air_recon' | 'heavy_salvo' | 'radar_sweep' | 'depth_charge' | 'smoke_screen'
    this.cameraMode = 'orbit'; // 'orbit' | 'bridge'
    this.isFiringAnim = false;

    // 3D Scene Coordinator
    this.sceneCoord = null;

    this._initDom();
    this._initShipSprites();
    this._initSceneCoord();
    this._bindEvents();
  }

  setGame(game) {
    this.game = game;
    this.selectedGambit = null;

    if (!this.sceneCoord) {
      this._initSceneCoord();
    } else {
      this.sceneCoord.game = game;
      this.sceneCoord.syncFromGame();
    }

    this.render();
  }

  // ============================================================================
  // DOM LAYOUT
  // ============================================================================

  _initDom() {
    this.container.innerHTML = `
      <div class="admirals-gambit-layout">
        <div class="ag-bridge-container">

          <!-- Top Command Header -->
          <div class="ag-header">
            <div class="ag-header-left">
              <span class="ag-mission-title">⚓ ADMIRAL'S GAMBIT: IRON FLEET</span>
              <span class="ag-seed-tag" id="ag-seed-tag">SEED: ADM-INIT</span>
              <span class="ag-turn-pill" id="ag-turn-pill">TURN 1</span>
            </div>

            <!-- Command Points (CP) Battery Meter -->
            <div class="ag-header-center">
              <div class="ag-cp-container">
                <span class="ag-cp-label">COMMAND POINTS</span>
                <div class="ag-cp-meter" id="ag-cp-meter">
                  <span class="ag-cp-pip active">⚡</span>
                  <span class="ag-cp-pip active">⚡</span>
                  <span class="ag-cp-pip active">⚡</span>
                </div>
                <span class="ag-cp-numeric" id="ag-cp-numeric">3 / 3 CP</span>
              </div>
            </div>

            <div class="ag-header-right">
              <button id="btn-ag-cam-mode" class="btn btn-sm btn-cam-mode" title="Toggle 3D Viewport Angle">
                🚢 3/4 Bow View
              </button>
              <button id="btn-ag-rules" class="btn btn-sm btn-secondary">📖 Field Manual</button>
              <button id="btn-ag-reset" class="btn btn-sm btn-secondary">✦ New Fleet</button>
            </div>
          </div>

          <!-- Main 3-Panel Tactical Command Center -->
          <div class="ag-tactical-display">

            <!-- Left Panel: Friendly Fleet Defense Grid -->
            <div class="ag-panel ag-fleet-panel">
              <div class="ag-panel-header">
                <span class="ag-panel-title">🛡️ FRIENDLY FLEET DEFENSE</span>
                <span class="ag-friendly-status" id="ag-friendly-status">5 / 5 OPERATIONAL</span>
              </div>

              <div class="ag-fleet-grid-container">
                <div class="ag-grid-labels ag-grid-labels-top">
                  <span></span>
                  ${Array.from({ length: GRID_SIZE }, (_, i) => `<span>${i + 1}</span>`).join('')}
                </div>
                <div class="ag-grid-with-labels">
                  <div class="ag-grid-labels ag-grid-labels-left">
                    ${Array.from({ length: GRID_SIZE }, (_, i) => `<span>${String.fromCharCode(65 + i)}</span>`).join('')}
                  </div>
                  <canvas id="ag-player-grid-canvas" class="ag-grid-canvas" width="380" height="380"></canvas>
                </div>
              </div>

              <!-- Warship Hull Health Ribbons -->
              <div class="ag-fleet-status-list" id="ag-fleet-status-list"></div>

              <!-- Smoke Screen Quick Button -->
              <div class="ag-defense-actions">
                <button id="btn-gambit-smoke" class="btn btn-sm btn-defense-smoke" title="Deploy Smoke Screen (2 CP)">
                  💨 Deploy Smoke Screen [2 CP]
                </button>
              </div>
            </div>

            <!-- Center Panel: 3D Naval Warfare Viewport -->
            <div class="ag-panel ag-ocean-panel">
              <div class="ag-panel-header">
                <span class="ag-panel-title">🌊 3D NAVAL COMBAT THEATER</span>
                <span class="ag-phase-indicator phase-combat" id="ag-phase-indicator">YOUR TURN</span>
              </div>

              <div class="ag-ocean-viewport" id="ag-ocean-viewport"></div>

              <!-- Tactical Combat Feed -->
              <div class="ag-combat-log-container">
                <div class="ag-combat-log-header">
                  <span>TACTICAL COMBAT TELETYPE FEED</span>
                  <span id="ag-log-status" class="ag-log-status">● LIVE</span>
                </div>
                <div class="ag-combat-log" id="ag-combat-log"></div>
              </div>
            </div>

            <!-- Right Panel: Enemy Waters & Gambit Actions -->
            <div class="ag-panel ag-enemy-panel">
              <div class="ag-panel-header">
                <span class="ag-panel-title">🎯 HOSTILE WATERS (TARGETING)</span>
                <span class="ag-targeting-status" id="ag-targeting-status">READY TO FIRE</span>
              </div>

              <div class="ag-fleet-grid-container">
                <div class="ag-grid-labels ag-grid-labels-top">
                  <span></span>
                  ${Array.from({ length: GRID_SIZE }, (_, i) => `<span>${i + 1}</span>`).join('')}
                </div>
                <div class="ag-grid-with-labels">
                  <div class="ag-grid-labels ag-grid-labels-left">
                    ${Array.from({ length: GRID_SIZE }, (_, i) => `<span>${String.fromCharCode(65 + i)}</span>`).join('')}
                  </div>
                  <canvas id="ag-enemy-grid-canvas" class="ag-grid-canvas" width="380" height="380"></canvas>
                </div>
              </div>

              <!-- Tactical Gambits Bar -->
              <div class="ag-gambit-cards-container">
                <div class="ag-gambits-title">TACTICAL GAMBITS</div>
                <div class="ag-gambit-cards-row">
                  <button id="btn-gambit-fire" class="ag-gambit-btn active" data-gambit="battery" title="Main 16-inch Battery (1 CP)">
                    <span class="g-icon">🎯</span>
                    <span class="g-name">Main Battery</span>
                    <span class="g-cost">1 CP</span>
                  </button>

                  <button id="btn-gambit-air" class="ag-gambit-btn" data-gambit="air_recon" title="Air Reconnaissance 3x3 (2 CP)">
                    <span class="g-icon">✈️</span>
                    <span class="g-name">Air Recon</span>
                    <span class="g-cost">2 CP</span>
                  </button>

                  <button id="btn-gambit-salvo" class="ag-gambit-btn" data-gambit="heavy_salvo" title="Heavy 16-inch Salvo (3 CP)">
                    <span class="g-icon">⚓</span>
                    <span class="g-name">Heavy Salvo</span>
                    <span class="g-cost">3 CP</span>
                  </button>

                  <button id="btn-gambit-radar" class="ag-gambit-btn" data-gambit="radar_sweep" title="Surface Radar Sweep (2 CP)">
                    <span class="g-icon">📡</span>
                    <span class="g-name">Radar Sweep</span>
                    <span class="g-cost">2 CP</span>
                  </button>

                  <button id="btn-gambit-depth" class="ag-gambit-btn" data-gambit="depth_charge" title="Depth Charge Line (2 CP)">
                    <span class="g-icon">🌊</span>
                    <span class="g-name">Depth Charge</span>
                    <span class="g-cost">2 CP</span>
                  </button>
                </div>
              </div>

              <!-- Fire Button & End Turn Action -->
              <div class="ag-fire-action-row">
                <button id="btn-ag-fire" class="btn btn-lg btn-fire">FIRE BATTERY! [SPACE]</button>
                <button id="btn-ag-end-turn" class="btn btn-sm btn-secondary btn-end-turn">PASS TURN ❯❯</button>
              </div>

            </div>

          </div>

          <!-- Bottom Telemetry Status Bar -->
          <div class="ag-status-bar">
            <div class="ag-stats">
              <span class="ag-stat">ENEMY SHIPS SUNK: <strong id="ag-enemy-sunk">0 / 5</strong></span>
              <span class="ag-stat">YOUR SHIPS SUNK: <strong id="ag-player-sunk">0 / 5</strong></span>
              <span class="ag-stat">BATTERY ACCURACY: <strong id="ag-accuracy">0%</strong></span>
              <span class="ag-stat">GAMBITS EXECUTED: <strong id="ag-gambits-count">0</strong></span>
            </div>
            <div class="ag-actions">
              <button id="btn-ag-redeploy" class="btn btn-sm btn-secondary">🎲 Randomize Fleet</button>
            </div>
          </div>

        </div>

        <!-- Victory / Defeat Modal -->
        <div id="ag-victory-modal" class="wt-modal-backdrop hidden">
          <div class="wt-modal-content wt-modal-victory">
            <div class="wt-victory-header">
              <span class="wt-trophy-icon" id="ag-outcome-icon">🏆</span>
              <h2 id="ag-outcome-title">ADMIRAL'S GAMBIT VICTORY</h2>
              <p id="ag-outcome-subtitle">Hostile naval fleet completely neutralized!</p>
            </div>
            <div class="wt-final-scores-card">
              <div class="wt-final-score-row">
                <span>Final Engagement Score:</span>
                <strong class="wt-final-val gold" id="ag-final-score">2,500</strong>
              </div>
              <div class="wt-final-score-row">
                <span>Enemy Ships Sunk:</span>
                <strong class="wt-final-val" id="ag-final-sunk">5 / 5</strong>
              </div>
              <div class="wt-final-score-row">
                <span>Gunfire Accuracy:</span>
                <strong class="wt-final-val" id="ag-final-accuracy">0%</strong>
              </div>
              <div class="wt-final-score-row">
                <span>Turns to Victory:</span>
                <strong class="wt-final-val" id="ag-final-turns">1</strong>
              </div>
            </div>
            <div class="wt-modal-actions">
              <button id="btn-ag-play-again" class="btn btn-gold btn-large">✦ New Engagement</button>
              <button id="btn-ag-close-victory" class="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>

        <!-- Field Manual / Rules Modal -->
        <div id="ag-rules-modal" class="wt-modal-backdrop hidden">
          <div class="wt-modal-content wt-rules-dialog">
            <div class="wt-modal-header">
              <h3>ADMIRAL'S GAMBIT: IRON FLEET — FIELD MANUAL</h3>
              <button id="btn-ag-close-rules" class="wt-close-icon">&times;</button>
            </div>
            <div class="wt-rules-body">
              <h4>Clean-Room Naval Strategy & Original Mechanics</h4>
              <p>Admiral's Gambit is an authentic 3D naval warfare simulation built from clean-room mathematical principles and historical naval plotting tactics.</p>

              <h4>Command Points (CP) & Firing Economy</h4>
              <ul>
                <li>You receive <strong>3 Command Points (CP)</strong> at the start of each turn.</li>
                <li><strong>Main Battery Fire</strong> costs <strong>1 CP</strong> per high-explosive shell.</li>
                <li>You can fire up to 3 times in a single turn, or conserve CP for high-impact Gambits!</li>
              </ul>

              <h4>Tactical Gambits (Requires Vessel Operational)</h4>
              <ul>
                <li>✈️ <strong>Air Reconnaissance (2 CP)</strong>: Carrier launches a reconnaissance aircraft to scan a 3×3 sector. Reports if any enemy hull is present.</li>
                <li>⚓ <strong>Heavy 16-Inch Salvo (3 CP)</strong>: Battleship unleashes a twin-shell broadside hitting target cell and an adjacent cell simultaneously.</li>
                <li>📡 <strong>Surface Radar Sweep (2 CP)</strong>: Cruiser sweeps an entire row or column, returning the exact count of hostile hull segments.</li>
                <li>🌊 <strong>Depth Charge Line (2 CP)</strong>: Destroyer drops 3 depth charges in a row, revealing and damaging submerged submarines.</li>
                <li>💨 <strong>Tactical Smoke Screen (2 CP)</strong>: Deploys thermal smoke over friendly waters, protecting vessels from hostile radar.</li>
                <li>🦈 <strong>Silent Running (Passive Submarine)</strong>: Submarines remain invisible to standard radar sweeps until damaged.</li>
              </ul>

              <h4>3D Viewport & Controls</h4>
              <ul>
                <li><strong>Targeting:</strong> Hover over Hostile Waters to guide the 3D bridge gun turret.</li>
                <li><strong>Camera:</strong> Toggle between 🎯 First-Person Cockpit Bridge and 🔭 Tactical Orbit.</li>
                <li><strong>Firing:</strong> Click cell or press [SPACE] to fire battery.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    `;

    this.playerCanvas = this.container.querySelector('#ag-player-grid-canvas');
    this.enemyCanvas = this.container.querySelector('#ag-enemy-grid-canvas');
    this.playerCtx = this.playerCanvas.getContext('2d');
    this.enemyCtx = this.enemyCanvas.getContext('2d');
  }

  // ============================================================================
  // SHIP SPRITES (3D MINIATURE FIGURE IMAGES)
  // ============================================================================

  _initShipSprites() {
    this.shipSprites = {};
    if (typeof SHIP_SPRITE_DATA !== 'undefined') {
      Object.entries(SHIP_SPRITE_DATA).forEach(([key, src]) => {
        const img = new Image();
        img.onload = () => {
          if (this.game) {
            this._renderPlayerGrid();
            this._renderEnemyGrid();
          }
        };
        img.src = src;
        this.shipSprites[key] = img;
      });
    }
  }

  // ============================================================================
  // 3D SCENE INITIALIZATION
  // ============================================================================

  _initSceneCoord() {
    const viewportEl = this.container.querySelector('#ag-ocean-viewport');
    if (!viewportEl) return;

    // Cinematic 3D theater; falls back to the classic scene if WebGL 2 is unavailable.
    // Add ?naval=classic to the URL to force the classic scene.
    const forceClassic = new URLSearchParams(location.search).get('naval') === 'classic';
    if (!forceClassic) {
      try {
        this.sceneCoord = new NavalTheaterCoordinator(viewportEl, this.game, { quality: 'auto', environment: 'sunset' });
        return;
      } catch (err) {
        console.warn('Naval theater unavailable, using classic scene:', err);
      }
    }

    try {
      this.sceneCoord = new NavalSceneCoordinator(viewportEl, this.game, {
        gridSize: GRID_SIZE,
        cameraMode: this.cameraMode
      });
    } catch (err) {
      console.error('Failed to initialize NavalSceneCoordinator:', err);
    }
  }

  // ============================================================================
  // EVENT BINDINGS
  // ============================================================================

  _bindEvents() {
    // Camera Mode Switcher (Bow, Broadside, Turret presets)
    const camBtn = this.container.querySelector('#btn-ag-cam-mode');
    camBtn?.addEventListener('click', () => {
      if (this.sceneCoord) {
        const newMode = this.sceneCoord.toggleCameraMode();
        this.cameraMode = newMode;
        const labels = {
          'bow': '🚢 3/4 Bow View',
          'broadside': '⚓ Broadside View',
          'turret': '🎯 Gun Deck View'
        };
        camBtn.textContent = labels[newMode] || '🚢 3/4 Bow View';
      }
    });

    // Reset / New Game
    this.container.querySelector('#btn-ag-reset')?.addEventListener('click', () => {
      this.app?.startNewGame();
    });

    this.container.querySelector('#btn-ag-redeploy')?.addEventListener('click', () => {
      if (this.game) {
        this.game.reset();
        this.render();
      }
    });

    // Pass / End Turn
    this.container.querySelector('#btn-ag-end-turn')?.addEventListener('click', () => {
      if (this.game && this.game.phase === GAME_PHASE.PLAYER_TURN) {
        this.game.endTurn();
        this.render();
      }
    });

    // Fire Battery Button
    this.container.querySelector('#btn-ag-fire')?.addEventListener('click', () => {
      if (this.hoverCell) {
        this._executeTargetAction(this.hoverCell.row, this.hoverCell.col);
      }
    });

    // Gambit Selection Buttons
    const gambitButtons = this.container.querySelectorAll('.ag-gambit-btn');
    gambitButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const gambitType = btn.dataset.gambit;
        if (this.selectedGambit === gambitType) {
          this.selectedGambit = null; // Toggle off
        } else {
          this.selectedGambit = gambitType === 'battery' ? null : gambitType;
        }
        this._updateGambitButtonStyles();
        this.render();
      });
    });

    // Smoke Screen Button
    this.container.querySelector('#btn-gambit-smoke')?.addEventListener('click', () => {
      if (this.game && this.game.phase === GAME_PHASE.PLAYER_TURN) {
        const res = this.game.executeSmokeScreen(4, 4);
        if (res.success) {
          this.render();
        } else {
          alert(`Smoke screen error: ${res.error}`);
        }
      }
    });

    // Enemy Canvas Hover & Click
    this.enemyCanvas?.addEventListener('mousemove', (e) => {
      const cell = this._getCellFromMouse(e, this.enemyCanvas);
      if (cell && (!this.hoverCell || this.hoverCell.row !== cell.row || this.hoverCell.col !== cell.col)) {
        this.hoverCell = cell;
        this.sceneCoord?.aimTurretAt(cell.row, cell.col);
        this._renderEnemyGrid();
      }
    });

    this.enemyCanvas?.addEventListener('mouseleave', () => {
      this.hoverCell = null;
      this._renderEnemyGrid();
    });

    this.enemyCanvas?.addEventListener('click', (e) => {
      const cell = this._getCellFromMouse(e, this.enemyCanvas);
      if (cell) {
        this._executeTargetAction(cell.row, cell.col);
      }
    });

    // Rules Modal
    this.container.querySelector('#btn-ag-rules')?.addEventListener('click', () => {
      this.container.querySelector('#ag-rules-modal')?.classList.remove('hidden');
    });
    this.container.querySelector('#btn-ag-close-rules')?.addEventListener('click', () => {
      this.container.querySelector('#ag-rules-modal')?.classList.add('hidden');
    });

    // Victory Modal
    this.container.querySelector('#btn-ag-play-again')?.addEventListener('click', () => {
      this.container.querySelector('#ag-victory-modal')?.classList.add('hidden');
      this.app?.startNewGame();
    });
    this.container.querySelector('#btn-ag-close-victory')?.addEventListener('click', () => {
      this.container.querySelector('#ag-victory-modal')?.classList.add('hidden');
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (this.app?.gameType !== 'admirals_gambit') return;
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (this.hoverCell) {
          this._executeTargetAction(this.hoverCell.row, this.hoverCell.col);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        this.sceneCoord?.toggleCameraMode();
      }
    });
  }

  // ============================================================================
  // COMBAT & GAMBIT EXECUTION
  // ============================================================================

  _executeTargetAction(row, col) {
    if (!this.game || this.game.phase !== GAME_PHASE.PLAYER_TURN || this.isFiringAnim) {
      return;
    }

    // 1. Air Recon Gambit
    if (this.selectedGambit === 'air_recon') {
      const res = this.game.executeAirRecon(row, col);
      if (res.success) {
        this.selectedGambit = null;
        this._updateGambitButtonStyles();
        this.render();
      } else {
        alert(`Air Recon: ${res.error}`);
      }
      return;
    }

    // 2. Heavy 16-Inch Salvo Gambit
    if (this.selectedGambit === 'heavy_salvo') {
      const res = this.game.executeHeavySalvo(row, col);
      if (res.success) {
        this.selectedGambit = null;
        this._updateGambitButtonStyles();
        this.isFiringAnim = true;
        this.sceneCoord?.fireBattery(row, col, { isHit: res.primary.result === 'HIT', isSunk: res.primary.sunk }, () => {
          this.isFiringAnim = false;
          this.render();
          this._checkEndgame();
        });
      } else {
        alert(`Heavy Salvo: ${res.error}`);
      }
      return;
    }

    // 3. Radar Sweep Gambit
    if (this.selectedGambit === 'radar_sweep') {
      const res = this.game.executeRadarSweep(true, row);
      if (res.success) {
        this.selectedGambit = null;
        this._updateGambitButtonStyles();
        this.render();
      } else {
        alert(`Radar Sweep: ${res.error}`);
      }
      return;
    }

    // 4. Depth Charge Gambit
    if (this.selectedGambit === 'depth_charge') {
      const res = this.game.executeDepthCharge(row, col);
      if (res.success) {
        this.selectedGambit = null;
        this._updateGambitButtonStyles();
        this.render();
        this._checkEndgame();
      } else {
        alert(`Depth Charge: ${res.error}`);
      }
      return;
    }

    // 5. Standard Battery Fire
    const preResult = this.game.fireBattery(row, col);
    if (!preResult.success) {
      if (preResult.error === 'INSUFFICIENT_CP') {
        alert('Insufficient Command Points (CP)! Pass your turn or await reinforcements.');
      }
      return;
    }

    // Trigger 3D artillery trajectory and geyser/explosion VFX
    this.isFiringAnim = true;
    const isHit = preResult.fireResult.result === 'HIT' || preResult.fireResult.result === 'SUNK';
    const isSunk = !!preResult.fireResult.sunk;

    this.sceneCoord?.fireBattery(row, col, { isHit, isSunk }, () => {
      this.isFiringAnim = false;
      this.render();
      this._checkEndgame();

      // If AI turn triggered, poll or render updates
      if (this.game.phase === GAME_PHASE.AI_TURN) {
        setTimeout(() => {
          this.render();
          this._checkEndgame();
        }, 350);
      }
    });

    this.render();
  }

  _checkEndgame() {
    if (!this.game) return;

    if (this.game.phase === GAME_PHASE.VICTORY) {
      setTimeout(() => this._showVictoryModal(true), 600);
    } else if (this.game.phase === GAME_PHASE.DEFEAT) {
      setTimeout(() => this._showVictoryModal(false), 600);
    }
  }

  _showVictoryModal(isWin) {
    const modal = this.container.querySelector('#ag-victory-modal');
    if (!modal) return;

    const titleEl = modal.querySelector('#ag-outcome-title');
    const subtitleEl = modal.querySelector('#ag-outcome-subtitle');
    const iconEl = modal.querySelector('#ag-outcome-icon');

    if (isWin) {
      titleEl.textContent = 'ADMIRAL\'S GAMBIT VICTORY';
      subtitleEl.textContent = 'Hostile fleet completely neutralized. The seas are secured!';
      iconEl.textContent = '🏆';
    } else {
      titleEl.textContent = 'FLEET COMPROMISED — DEFEAT';
      subtitleEl.textContent = 'All flagship divisions lost. Tactical retreat ordered.';
      iconEl.textContent = '💥';
    }

    modal.querySelector('#ag-final-score').textContent = isWin ? '3,500' : '450';
    modal.querySelector('#ag-final-sunk').textContent = `${this.game.stats.aiShipsSunk} / 5`;

    const total = this.game.stats.playerShots;
    const acc = total > 0 ? Math.round((this.game.stats.playerHits / total) * 100) : 0;
    modal.querySelector('#ag-final-accuracy').textContent = `${acc}%`;
    modal.querySelector('#ag-final-turns').textContent = String(this.game.turnCount);

    modal.classList.remove('hidden');
  }

  _getCellFromMouse(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellSize = canvas.width / GRID_SIZE;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }

  // ============================================================================
  // RENDERING & UI UPDATES
  // ============================================================================

  render() {
    if (!this.game) return;

    if (!this.sceneCoord) {
      this._initSceneCoord();
    } else {
      this.sceneCoord.onResize();
      this.sceneCoord.syncFromGame();
    }

    this._renderHeaderAndCP();
    this._renderPlayerGrid();
    this._renderEnemyGrid();
    this._renderFleetStatus();
    this._renderStats();
    this._renderCombatLog();
    this._updateGambitButtonStyles();
  }

  _renderHeaderAndCP() {
    // Seed tag
    const seedEl = this.container.querySelector('#ag-seed-tag');
    if (seedEl) seedEl.textContent = `SEED: ${this.game.seedString || 'ADM-LIVE'}`;

    // Turn counter
    const turnEl = this.container.querySelector('#ag-turn-pill');
    if (turnEl) turnEl.textContent = `TURN ${this.game.turnCount}`;

    // CP Pips
    const meterEl = this.container.querySelector('#ag-cp-meter');
    const numEl = this.container.querySelector('#ag-cp-numeric');
    if (meterEl && numEl) {
      const cp = this.game.playerCP;
      meterEl.innerHTML = Array.from({ length: COMMAND_POINTS.MAX_STORAGE }, (_, i) => {
        const active = i < cp ? 'active' : '';
        return `<span class="ag-cp-pip ${active}">⚡</span>`;
      }).join('');
      numEl.textContent = `${cp} / ${COMMAND_POINTS.MAX_STORAGE} CP`;
    }

    // Phase Indicator
    const phaseEl = this.container.querySelector('#ag-phase-indicator');
    if (phaseEl) {
      if (this.game.phase === GAME_PHASE.PLAYER_TURN) {
        phaseEl.textContent = 'YOUR COMMAND';
        phaseEl.className = 'ag-phase-indicator phase-combat';
      } else if (this.game.phase === GAME_PHASE.AI_TURN) {
        phaseEl.textContent = 'ENEMY SALVO INCOMING...';
        phaseEl.className = 'ag-phase-indicator phase-deployment';
      } else if (this.game.phase === GAME_PHASE.VICTORY) {
        phaseEl.textContent = 'VICTORY';
        phaseEl.className = 'ag-phase-indicator phase-combat';
      } else {
        phaseEl.textContent = 'DEFEAT';
        phaseEl.className = 'ag-phase-indicator phase-deployment';
      }
    }
  }

  _renderPlayerGrid() {
    const ctx = this.playerCtx;
    const canvas = this.playerCanvas;
    const w = canvas.width;
    const cellSize = w / GRID_SIZE;

    // Dark radar ocean background
    ctx.fillStyle = '#08121e';
    ctx.fillRect(0, 0, w, w);

    // Subtle Grid Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, w);
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(w, i * cellSize);
      ctx.stroke();
    }

    if (!this.game.playerGrid) return;

    // Draw Friendly Warships using 3D-printed miniature ship sprites
    this.game.playerGrid.ships.forEach(ship => {
      const isHoriz = ship.orientation === 0;
      const spriteKey = `${ship.id}_${isHoriz ? 'h' : 'v'}`;
      const sprite = this.shipSprites?.[spriteKey];

      let minRow = 999, maxRow = -1, minCol = 999, maxCol = -1;
      if (ship.cells && ship.cells.length > 0) {
        ship.cells.forEach(coord => {
          minRow = Math.min(minRow, coord.row);
          maxRow = Math.max(maxRow, coord.row);
          minCol = Math.min(minCol, coord.col);
          maxCol = Math.max(maxCol, coord.col);
        });
      } else {
        minRow = ship.startRow || 0;
        minCol = ship.startCol || 0;
        maxRow = isHoriz ? minRow : minRow + ship.size - 1;
        maxCol = isHoriz ? minCol + ship.size - 1 : minCol;
      }

      const shipW = (maxCol - minCol + 1) * cellSize;
      const shipH = (maxRow - minRow + 1) * cellSize;
      const sx = minCol * cellSize;
      const sy = minRow * cellSize;

      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.save();
        if (ship.sunk) {
          ctx.filter = 'grayscale(100%) brightness(55%) drop-shadow(0 0 6px rgba(239, 68, 68, 0.9))';
        } else {
          ctx.filter = 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.75))';
        }
        ctx.drawImage(sprite, sx + 2, sy + 2, shipW - 4, shipH - 4);
        ctx.restore();
      } else {
        // Fallback block
        ctx.fillStyle = ship.sunk ? '#475569' : '#1e3a5f';
        ctx.fillRect(sx + 2, sy + 2, shipW - 4, shipH - 4);
        ctx.strokeStyle = ship.sunk ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx + 2, sy + 2, shipW - 4, shipH - 4);
      }

      // Draw red damage pegs for hit cells directly over the miniature's pin holes
      if (ship.cells) {
        ship.cells.forEach(coord => {
          const cell = this.game.playerGrid.cells[coord.row][coord.col];
          const cx = coord.col * cellSize + cellSize / 2;
          const cy = coord.row * cellSize + cellSize / 2;

          if (cell.state === CELL_STATE.HIT || cell.state === CELL_STATE.SUNK) {
            ctx.save();
            // Glowing red damage peg
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.28, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Specular glint
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 1.2, cy - 1.2, cellSize * 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }
    });

    // Draw Incoming Misses
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.game.playerGrid.cells[r][c];
        const cx = c * cellSize + cellSize / 2;
        const cy = r * cellSize + cellSize / 2;

        if (cell.state === CELL_STATE.MISS) {
          // Enemy Miss Splash
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 5, cy - 5);
          ctx.lineTo(cx + 5, cy + 5);
          ctx.moveTo(cx + 5, cy - 5);
          ctx.lineTo(cx - 5, cy + 5);
          ctx.stroke();
        }
      }
    }
  }

  _renderEnemyGrid() {
    const ctx = this.enemyCtx;
    const canvas = this.enemyCanvas;
    const w = canvas.width;
    const cellSize = w / GRID_SIZE;

    // Dark targeting grid background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, w);

    // Target Grid Lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, w);
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(w, i * cellSize);
      ctx.stroke();
    }

    if (!this.game.aiGrid) return;

    // Render Revealed Sunk Enemy Ships using 3D-printed miniature ship sprites
    this.game.aiGrid.ships.forEach(ship => {
      if (ship.sunk) {
        const isHoriz = ship.orientation === 0;
        const spriteKey = `${ship.id}_${isHoriz ? 'h' : 'v'}`;
        const sprite = this.shipSprites?.[spriteKey];

        let minRow = 999, maxRow = -1, minCol = 999, maxCol = -1;
        if (ship.cells && ship.cells.length > 0) {
          ship.cells.forEach(coord => {
            minRow = Math.min(minRow, coord.row);
            maxRow = Math.max(maxRow, coord.row);
            minCol = Math.min(minCol, coord.col);
            maxCol = Math.max(maxCol, coord.col);
          });
        }

        const shipW = (maxCol - minCol + 1) * cellSize;
        const shipH = (maxRow - minRow + 1) * cellSize;
        const sx = minCol * cellSize;
        const sy = minRow * cellSize;

        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          ctx.save();
          ctx.filter = 'sepia(100%) saturate(300%) hue-rotate(320deg) brightness(85%) drop-shadow(0 0 6px #ef4444)';
          ctx.drawImage(sprite, sx + 2, sy + 2, shipW - 4, shipH - 4);
          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.fillRect(sx + 2, sy + 2, shipW - 4, shipH - 4);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 2, sy + 2, shipW - 4, shipH - 4);
        }
      }
    });

    // Render Hits, Misses & Scanned Zones
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.game.aiGrid.cells[r][c];
        const cx = c * cellSize + cellSize / 2;
        const cy = r * cellSize + cellSize / 2;

        if (cell.state === CELL_STATE.HIT || cell.state === CELL_STATE.SUNK) {
          // Direct Hit Marker
          ctx.save();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.35, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Glint
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx - 1.5, cy - 1.5, cellSize * 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (cell.state === CELL_STATE.MISS) {
          // Water Miss Splash
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 6, cy - 6);
          ctx.lineTo(cx + 6, cy + 6);
          ctx.moveTo(cx + 6, cy - 6);
          ctx.lineTo(cx - 6, cy + 6);
          ctx.stroke();
        }
      }
    }

    // Hover Highlight / Reticle
    if (this.hoverCell) {
      const { row, col } = this.hoverCell;
      const x = col * cellSize;
      const y = row * cellSize;

      ctx.strokeStyle = this.selectedGambit ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      // Crosshair
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _renderFleetStatus() {
    const listEl = this.container.querySelector('#ag-fleet-status-list');
    if (!listEl || !this.game.playerGrid) return;

    listEl.innerHTML = Array.from(this.game.playerGrid.ships.values()).map(ship => {
      const remainingHp = ship.size - ship.hits;
      const hpPercent = Math.max(0, Math.round((remainingHp / ship.size) * 100));
      const statusClass = ship.sunk ? 'sunk' : remainingHp < ship.size ? 'damaged' : 'healthy';

      return `
        <div class="ag-ship-status-card ${statusClass}">
          <div class="ag-ship-thumb-col">
            <img src="assets/images/ships/${ship.id}_h.png" class="ag-ship-mini-img" alt="${ship.name}">
          </div>
          <div class="ag-ship-info-col">
            <div class="ag-ship-meta">
              <span class="ag-ship-name">${ship.name} (${ship.code})</span>
              <span class="ag-ship-hp">${remainingHp}/${ship.size} HP</span>
            </div>
            <div class="ag-ship-hp-bar">
              <div class="ag-ship-hp-fill" style="width: ${hpPercent}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const operational = Array.from(this.game.playerGrid.ships.values()).filter(s => !s.sunk).length;
    const friendlyStatusEl = this.container.querySelector('#ag-friendly-status');
    if (friendlyStatusEl) {
      friendlyStatusEl.textContent = `${operational} / 5 OPERATIONAL`;
    }
  }

  _renderStats() {
    const enemySunkEl = this.container.querySelector('#ag-enemy-sunk');
    const playerSunkEl = this.container.querySelector('#ag-player-sunk');
    const accEl = this.container.querySelector('#ag-accuracy');
    const gambitsEl = this.container.querySelector('#ag-gambits-count');

    if (enemySunkEl) enemySunkEl.textContent = `${this.game.stats.aiShipsSunk} / 5`;
    if (playerSunkEl) playerSunkEl.textContent = `${this.game.stats.playerShipsSunk} / 5`;

    const total = this.game.stats.playerShots;
    const acc = total > 0 ? Math.round((this.game.stats.playerHits / total) * 100) : 0;
    if (accEl) accEl.textContent = `${acc}%`;
    if (gambitsEl) gambitsEl.textContent = String(this.game.stats.gambitsUsed);
  }

  _renderCombatLog() {
    const logEl = this.container.querySelector('#ag-combat-log');
    if (!logEl || !this.game.actionLog) return;

    logEl.innerHTML = this.game.actionLog.slice(-12).reverse().map(item => {
      let color = '#cbd5e1';
      if (item.type === 'HIT') color = '#f87171';
      if (item.type === 'SUNK') color = '#ef4444';
      if (item.type === 'GAMBIT') color = '#38bdf8';
      if (item.type === 'VICTORY') color = '#fbbf24';

      return `<div class="ag-log-entry" style="color: ${color}">[${item.timestamp || 'LOG'}] ${item.message}</div>`;
    }).join('');
  }

  _updateGambitButtonStyles() {
    const buttons = this.container.querySelectorAll('.ag-gambit-btn');
    buttons.forEach(btn => {
      const gType = btn.dataset.gambit;
      const isActive = (this.selectedGambit === gType) || (!this.selectedGambit && gType === 'battery');
      btn.classList.toggle('active', isActive);

      // Disable if ship is destroyed or insufficient CP
      let disabled = false;
      const cp = this.game?.playerCP || 0;

      if (gType === 'battery' && cp < COMMAND_POINTS.BASE_FIRE_COST) disabled = true;
      if (gType === 'air_recon' && (!this.game?.playerGrid?.isShipAlive('carrier') || cp < 2)) disabled = true;
      if (gType === 'heavy_salvo' && (!this.game?.playerGrid?.isShipAlive('battleship') || cp < 3)) disabled = true;
      if (gType === 'radar_sweep' && (!this.game?.playerGrid?.isShipAlive('cruiser') || cp < 2)) disabled = true;
      if (gType === 'depth_charge' && (!this.game?.playerGrid?.isShipAlive('destroyer') || cp < 2)) disabled = true;

      btn.disabled = disabled;
    });
  }

  destroy() {
    this.sceneCoord?.destroy();
  }
}
