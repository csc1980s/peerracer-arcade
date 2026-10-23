/**
 * Tank Minefield: Iron Perimeter — Main UI Controller & Viewport
 * 
 * Features:
 * - Primary First-Person 3D Tank Viewport (`FirstPersonRenderer`).
 * - Corner Tactical Minimap (`TacticalMapRenderer`) with click-to-route navigation.
 * - Expandable Fullscreen Tactical Map Overlay.
 * - Four Selectable Tank Presets (US, UN, USSR, North Korea) with persistent storage.
 * - On-screen Touch D-Pad for mobile and tablet devices.
 * - Comprehensive Keyboard Shortcuts: Arrows / WASD, Space to Scan, F to Flag, Enter to Fire.
 * - 2-Player Head-to-Head PvP Lobby (BroadcastChannel P2P & Local Hotseat).
 */

import { CARDINAL_DIRECTIONS, TANK_PRESETS } from '../core/tank_minefield/rules_config.js';
import { TankMinefieldGame } from '../games/tank_minefield.js';
import { FirstPersonRenderer } from './tank_minefield/first_person_renderer.js';
import { TacticalMapRenderer } from './tank_minefield/tactical_map_renderer.js';
import { TankP2PTransport, P2P_MATCH_STATE } from '../core/tank_minefield/p2p_transport.js';
import { TankSceneCoordinator } from '../renderer/TankSceneCoordinator.js';
import { BattlefieldTheaterCoordinator } from '../renderer/battlefield/BattlefieldTheaterCoordinator.js';

export class TankMinefieldView {
  constructor(app, containerEl) {
    this.app = app;
    this.container = containerEl;
    this.game = null;

    this.selectedPresetId = localStorage.getItem('tm_selected_tank') || 'US';
    this.selectedRouteTarget = null;
    this.animFrameId = null;
    this.use3D = localStorage.getItem('tm_view_mode') !== '2d';
    this.sceneCoordinator = null;

    // Transport for PvP
    this.p2pTransport = new TankP2PTransport({
      playerName: this.app.profiles?.getActiveProfile()?.name || 'Commander 1',
      presetId: this.selectedPresetId,
      onMatchConnected: (info) => this._onP2PMatchConnected(info),
      onRemoteIntent: (act, payload, from) => this._onP2PRemoteIntent(act, payload, from),
      onAvailableRoomsChange: (rooms) => this._onP2PAvailableRoomsChange(rooms)
    });

    this._initDom();
    this._initRenderers();
    this._bindEvents();
  }

  setGame(game) {
    this.game = game;
    this.selectedRouteTarget = null;
    if (this.sceneCoordinator) {
      this.sceneCoordinator.setGame(game);
    }
    this.render();
  }

  _initDom() {
    this.container.innerHTML = `
      <div class="tank-minefield-layout">
        <!-- Main Primary Viewport (First-Person 3D Tank View) -->
        <div class="tm-viewport-container">
          <div id="tm-webgl-container" class="tm-webgl-container"></div>
          <canvas id="tm-first-person-canvas" class="tm-fp-canvas"></canvas>

          <!-- Top Status Ribbon -->
          <div class="tm-top-bar">
            <div class="tm-badge-group">
              <span class="tm-mode-tag" id="tm-mode-tag">MISSION: 12×12 MINEFIELD</span>
              <button id="btn-tm-tank-select" class="btn btn-sm btn-tank-badge" title="Change Tank Preset">
                <span id="tm-tank-insignia">★</span>
                <span id="tm-tank-name">US M48-A2 Patton</span>
              </button>
            </div>

            <div class="tm-top-actions">
              <button id="btn-tm-env-mode" class="btn btn-sm btn-secondary" title="Cycle Tactical Theater Environment (Twilight / Desert / Arctic / Storm)">🌐 Twilight</button>
              <button id="btn-tm-vision-mode" class="btn btn-sm btn-secondary" title="Cycle Tactical Vision (Standard / NVG Green / Thermal FLIR)">👁️ Standard</button>
              <button id="btn-tm-cam-mode" class="btn btn-sm btn-secondary" title="Toggle Cockpit / Tactical Orbit View">🎯 Cockpit</button>
              <button id="btn-tm-view-mode" class="btn btn-sm btn-secondary" title="Toggle 3D WebGL / 2D Canvas View">🎥 3D WebGL</button>
              <button id="btn-tm-rules" class="btn btn-sm btn-secondary" title="Rules and Field Manual">📖 Manual</button>
              <button id="btn-tm-pvp-open" class="btn btn-sm btn-gold" title="2-Player PvP Arena">⚔️ PvP Arena</button>
              <button id="btn-tm-reset" class="btn btn-sm btn-secondary" title="Restart Mission (N)">✦ New Mission</button>
            </div>
          </div>

          <!-- Tactical Minimap Overlay (Top-Right) -->
          <div class="tm-minimap-dock" id="tm-minimap-dock">
            <div class="tm-minimap-header">
              <span>TACTICAL MAP</span>
              <div class="tm-minimap-ctrls">
                <button id="btn-tm-expand-map" class="btn-icon-xs" title="Expand Fullscreen Map (M)">⛶</button>
              </div>
            </div>
            <canvas id="tm-minimap-canvas" width="160" height="160" class="tm-minimap-canvas"></canvas>
            <div class="tm-minimap-hint">Click revealed cell to safe-route</div>
          </div>

          <!-- Bottom Route Guidance Notice -->
          <div id="tm-route-banner" class="tm-route-banner hidden">
            <span class="tm-route-icon">⚡</span>
            <span id="tm-route-text" class="tm-route-text">Planned Route Active</span>
            <button id="btn-tm-step-route" class="btn btn-sm btn-gold">Step Forward</button>
            <button id="btn-tm-cancel-route" class="btn btn-sm btn-secondary">&times;</button>
          </div>

          <!-- Mobile / Touch Controls Overlay -->
          <div class="tm-touch-controls">
            <div class="tm-dpad">
              <button id="btn-touch-fwd" class="btn-touch btn-touch-up">▲</button>
              <div class="tm-dpad-middle">
                <button id="btn-touch-left" class="btn-touch btn-touch-left">◀</button>
                <button id="btn-touch-rev" class="btn-touch btn-touch-down">▼</button>
                <button id="btn-touch-right" class="btn-touch btn-touch-right">▶</button>
              </div>
            </div>
            <div class="tm-touch-actions">
              <button id="btn-touch-scan" class="btn btn-sm btn-action-scan">📡 SCAN [SPACE]</button>
              <button id="btn-touch-flag" class="btn btn-sm btn-action-flag">⚑ FLAG [F]</button>
              <button id="btn-touch-fire" class="btn btn-sm btn-action-fire hidden">💥 FIRE [ENTER]</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: Four Tank Selections -->
      <div id="tm-tank-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content tm-tank-dialog">
          <div class="wt-modal-header">
            <h3>SELECT VEHICLE COLD-WAR TANK PRESET</h3>
            <button id="btn-tm-close-tank-modal" class="wt-close-icon">&times;</button>
          </div>
          <p class="tm-modal-sub">Choose your armored vehicle. All variants feature identical military plating, speed, and 105mm firepower.</p>

          <div class="tm-tank-grid">
            <!-- US -->
            <div class="tm-tank-card" data-preset="US">
              <div class="tm-tank-card-header" style="border-left-color: #3d5236;">
                <span class="tm-tank-card-insignia">★</span>
                <div>
                  <h4>United States</h4>
                  <small>M48-A2 Patton Spearhead</small>
                </div>
              </div>
              <p class="tm-tank-desc">Rugged olive drab armor finish with bold allied white star insignia.</p>
              <button class="btn btn-sm btn-select-tank">Select US</button>
            </div>

            <!-- UN -->
            <div class="tm-tank-card" data-preset="UN">
              <div class="tm-tank-card-header" style="border-left-color: #38bdf8;">
                <span class="tm-tank-card-insignia" style="color: #38bdf8;">🌐</span>
                <div>
                  <h4>United Nations</h4>
                  <small>Centurion MK-5 Vanguard</small>
                </div>
              </div>
              <p class="tm-tank-desc">Peacekeeper forest green armor with vibrant cyan roundel markings.</p>
              <button class="btn btn-sm btn-select-tank">Select UN</button>
            </div>

            <!-- USSR -->
            <div class="tm-tank-card" data-preset="USSR">
              <div class="tm-tank-card-header" style="border-left-color: #ef4444;">
                <span class="tm-tank-card-insignia" style="color: #ef4444;">★</span>
                <div>
                  <h4>Soviet Guards</h4>
                  <small>T-55A Iron Bastion</small>
                </div>
              </div>
              <p class="tm-tank-desc">Dark Russian forest green armor plate bearing the red star insignia.</p>
              <button class="btn btn-sm btn-select-tank">Select USSR</button>
            </div>

            <!-- North Korea -->
            <div class="tm-tank-card" data-preset="NORTH_KOREA">
              <div class="tm-tank-card-header" style="border-left-color: #3b82f6;">
                <span class="tm-tank-card-insignia" style="color: #3b82f6;">🎖️</span>
                <div>
                  <h4>North Korea</h4>
                  <small>Chonma-Ho Type 68</small>
                </div>
              </div>
              <p class="tm-tank-desc">Aggressive military green featuring red-white-blue tri-band roundel.</p>
              <button class="btn btn-sm btn-select-tank">Select North Korea</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: Expanded Fullscreen Tactical Map Overlay -->
      <div id="tm-expanded-map-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content tm-expanded-map-dialog">
          <div class="wt-modal-header">
            <h3>EXPANDED TACTICAL GRID OVERLAY</h3>
            <button id="btn-tm-close-expanded-map" class="wt-close-icon">&times;</button>
          </div>
          <div class="tm-expanded-canvas-wrapper">
            <canvas id="tm-expanded-canvas" width="560" height="560"></canvas>
          </div>
          <div class="tm-expanded-legend">
            <span><strong style="color: #22c55e;">▲</strong> Your Tank</span>
            <span><strong style="color: #f59e0b;">★</strong> Extraction</span>
            <span><strong style="color: #ea580c;">●</strong> Crater</span>
            <span><strong style="color: #f59e0b;">⚑</strong> Flag</span>
            <span><strong style="color: #ef4444;">⚠️</strong> Scanned Mine</span>
          </div>
        </div>
      </div>

      <!-- MODAL: 2-Player PvP Arena Lobby -->
      <div id="tm-pvp-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content tm-pvp-dialog">
          <div class="wt-modal-header">
            <h3>2-PLAYER TANK DUEL (24×24 ARENA)</h3>
            <button id="btn-tm-close-pvp" class="wt-close-icon">&times;</button>
          </div>
          <p class="tm-modal-sub">One shot per round! Miss impacts adjacent cell. Navigate mines and destroy the enemy tank.</p>

          <div class="wt-p2p-tabs">
            <button id="tab-tm-hotseat" class="wt-p2p-tab active">Local 2-Player</button>
            <button id="tab-tm-host" class="wt-p2p-tab">Host Network Game</button>
            <button id="tab-tm-join" class="wt-p2p-tab">Join Network Game</button>
          </div>

          <!-- Hotseat Tab -->
          <div id="panel-tm-hotseat" class="wt-p2p-tab-panel active">
            <p>Play 2-player mode directly on this screen or with simulated competitive opponent:</p>
            <button id="btn-tm-launch-pvp-local" class="btn btn-gold btn-large">⚔️ Launch 24×24 Arena Duel</button>
          </div>

          <!-- Host Tab -->
          <div id="panel-tm-host" class="wt-p2p-tab-panel hidden">
            <label class="wt-p2p-label">MATCH CODE:</label>
            <div class="wt-p2p-code-box">
              <input type="text" id="tm-host-code-display" class="wt-code-input" readonly>
              <button id="btn-tm-copy-code" class="btn btn-gold">📋 Copy Code</button>
            </div>
            <div id="tm-copy-feedback" class="wt-copy-feedback hidden">✓ Copied!</div>
            <div class="wt-p2p-status-card">
              <div class="wt-spinner-ring"></div>
              <p>Waiting for opponent to join in another browser tab...</p>
            </div>
          </div>

          <!-- Join Tab -->
          <div id="panel-tm-join" class="wt-p2p-tab-panel hidden">
            <label class="wt-p2p-label">ENTER MATCH CODE OR ROOM ID:</label>
            <div class="wt-p2p-join-box">
              <input type="text" id="tm-join-code-input" class="wt-code-input" placeholder="Paste match code or enter TANK-P2P-...">
              <button id="btn-tm-submit-join" class="btn btn-gold">Join Match</button>
            </div>
            <div id="tm-join-error" class="wt-join-error hidden"></div>
            <div id="tm-available-rooms-list" class="wt-rooms-list" style="margin-top: 10px;"></div>
          </div>
        </div>
      </div>

      <!-- MODAL: Mission Outcome Summary -->
      <div id="tm-outcome-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content wt-modal-victory tm-outcome-dialog">
          <div class="wt-victory-header">
            <span class="wt-trophy-icon" id="tm-outcome-icon">🏆</span>
            <h2 id="tm-outcome-title">MISSION ACCOMPLISHED</h2>
            <p id="tm-outcome-reason">Extraction point reached safely!</p>
          </div>
          <div class="wt-final-scores-card">
            <div class="wt-final-score-row">
              <span>Final Armor Plating:</span>
              <strong class="wt-final-val gold" id="tm-final-armor">3 / 3</strong>
            </div>
            <div class="wt-final-score-row">
              <span>Mines Detonated:</span>
              <strong class="wt-final-val" id="tm-final-mines">0</strong>
            </div>
            <div class="wt-final-score-row">
              <span>Scans Performed:</span>
              <strong class="wt-final-val" id="tm-final-scans">0</strong>
            </div>
          </div>
          <div class="wt-modal-actions">
            <button id="btn-tm-play-again" class="btn btn-gold btn-large">✦ Play Again</button>
            <button id="btn-tm-close-outcome" class="btn btn-secondary">Close</button>
          </div>
        </div>
      </div>

      <!-- MODAL: Rules & Field Manual -->
      <div id="tm-rules-modal" class="wt-modal-backdrop hidden">
        <div class="wt-modal-content wt-rules-dialog">
          <div class="wt-modal-header">
            <h3>TANK MINEFIELD: FIELD MANUAL & CONTROLS</h3>
            <button id="btn-tm-close-rules" class="wt-close-icon">&times;</button>
          </div>
          <div class="wt-rules-body">
            <h4>Controls & Cockpit Commands</h4>
            <ul>
              <li><strong>Advance (▲ / W):</strong> Drive forward one grid cell.</li>
              <li><strong>Reverse (▼ / S):</strong> Reverse one grid cell without changing facing.</li>
              <li><strong>Turn Left (◀ / A):</strong> Rotate tank 90° to the left.</li>
              <li><strong>Turn Right (▶ / D):</strong> Rotate tank 90° to the right.</li>
              <li><strong>Radar Scan [SPACE]:</strong> Safely scans the cell directly ahead without moving or detonating mines.</li>
              <li><strong>Flag Suspected Mine [F]:</strong> Marks the cell ahead with a tactical hazard flag.</li>
              <li><strong>Minimap Navigation:</strong> Click any revealed safe cell to compute an automatic safe route.</li>
              <li><strong>Fire 105mm AP Shell [ENTER]:</strong> (PvP Mode) Fires your single shell.</li>
            </ul>

            <h4>Minesweeper Grid Logic & Armor</h4>
            <p>Each revealed cell shows the total number of active mines in its 8 surrounding neighbor cells. Your tank starts with <strong>3 Armor Plating points</strong>. Stepping onto a live mine removes 1 armor point and permanently consumes the mine, leaving a charred traversable crater. At 0 armor, your tank is destroyed.</p>

            <h4>PvP Arena Firing & Custom Miss Rule</h4>
            <p>In 24×24 PvP mode, each player receives exactly <strong>ONE shell per round</strong>:</p>
            <ul>
              <li><strong>Direct Hit:</strong> Enemy must be directly ahead at distance 1 or 2 cells. An unobstructed direct hit instantly destroys the enemy tank!</li>
              <li><strong>Adjacent Miss Impact:</strong> If out of range, diagonal, or obstructed, the shell impacts the <em>immediately adjacent cell</em> ahead (distance 1), leaving a permanent shell crater!</li>
              <li><strong>Mine Detonation on Miss:</strong> If your missed shell strikes a live hidden mine, it detonates and consumes that mine!</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  _initRenderers() {
    const fpCanvas = this.container.querySelector('#tm-first-person-canvas');
    const miniCanvas = this.container.querySelector('#tm-minimap-canvas');
    const expCanvas = this.container.querySelector('#tm-expanded-canvas');
    const webglContainer = this.container.querySelector('#tm-webgl-container');

    if (fpCanvas) {
      this.fpRenderer = new FirstPersonRenderer(fpCanvas);
      this._updateCanvasSize();
    }

    if (webglContainer && this.use3D) {
      try {
        const savedEnv = localStorage.getItem('solitaire_tank_env_preset') || 'daylight';
        this.sceneCoordinator = this._createSceneCoordinator(webglContainer, savedEnv);
      } catch (err) {
        console.error('[!] Three.js WebGL initialization failed, falling back to 2D canvas:', err);
        this.use3D = false;
      }
    }

    this._updateViewModeVisibility();

    if (miniCanvas) {
      this.miniRenderer = new TacticalMapRenderer(miniCanvas);
    }

    if (expCanvas) {
      this.expandedRenderer = new TacticalMapRenderer(expCanvas);
    }

    // Start 60fps render loop
    this._startRenderLoop();
  }

  /**
   * Cinematic battlefield view by default; `?tank=classic` (or a failure) uses the
   * original TankSceneCoordinator.
   */
  _createSceneCoordinator(webglContainer, environment) {
    const classic = new URLSearchParams(window.location.search).get('tank') === 'classic';
    if (!classic) {
      try {
        return new BattlefieldTheaterCoordinator(webglContainer, this.game, { environment, quality: 'auto' });
      } catch (err) {
        console.error('[!] Battlefield theater failed, using the classic 3D scene:', err);
      }
    }
    return new TankSceneCoordinator(webglContainer, this.game, { environment });
  }

  _updateViewModeVisibility() {
    const webglContainer = this.container.querySelector('#tm-webgl-container');
    const fpCanvas = this.container.querySelector('#tm-first-person-canvas');
    const viewBtn = this.container.querySelector('#btn-tm-view-mode');
    const camBtn = this.container.querySelector('#btn-tm-cam-mode');
    const visionBtn = this.container.querySelector('#btn-tm-vision-mode');
    const envBtn = this.container.querySelector('#btn-tm-env-mode');

    if (this.use3D) {
      if (webglContainer) webglContainer.style.display = 'block';
      if (fpCanvas) fpCanvas.style.display = 'none';
      if (viewBtn) {
        viewBtn.innerHTML = '🎥 3D WebGL';
        viewBtn.title = 'Switch to Canvas 2D View';
      }
      if (camBtn) {
        camBtn.style.display = 'inline-flex';
        camBtn.innerHTML = this.sceneCoordinator?.cameraMode === 'orbit' ? '🔭 Orbit' : '🎯 Cockpit';
      }
      if (visionBtn) {
        visionBtn.style.display = 'inline-flex';
        const visionLabels = ['👁️ Standard', '🟢 NVG Green', '🔥 FLIR Thermal'];
        visionBtn.innerHTML = visionLabels[this.sceneCoordinator?.visionMode || 0] || '👁️ Standard';
      }
      if (envBtn) {
        envBtn.style.display = 'inline-flex';
        const preset = this.sceneCoordinator?.getEnvironmentPreset?.();
        envBtn.innerHTML = preset?.buttonLabel || '🌐 Twilight';
      }
    } else {
      if (webglContainer) webglContainer.style.display = 'none';
      if (fpCanvas) fpCanvas.style.display = 'block';
      if (viewBtn) {
        viewBtn.innerHTML = '📐 Canvas 2D';
        viewBtn.title = 'Switch to 3D WebGL View';
      }
      if (camBtn) {
        camBtn.style.display = 'none';
      }
      if (visionBtn) {
        visionBtn.style.display = 'none';
      }
      if (envBtn) {
        envBtn.style.display = 'none';
      }
    }
  }

  _updateCanvasSize() {
    const fpCanvas = this.container.querySelector('#tm-first-person-canvas');
    if (!fpCanvas) return;
    const rect = fpCanvas.getBoundingClientRect();
    const w = Math.floor(rect.width || 800);
    const h = Math.floor(rect.height || 540);
    if (fpCanvas.width !== w || fpCanvas.height !== h) {
      fpCanvas.width = w;
      fpCanvas.height = h;
      this.fpRenderer?.resize(w, h);
    }
    if (this.sceneCoordinator) {
      this.sceneCoordinator.onResize();
    }
  }

  _startRenderLoop() {
    const loop = () => {
      if (this.game) {
        this.render();
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.sceneCoordinator) {
      this.sceneCoordinator.destroy();
      this.sceneCoordinator = null;
    }
    if (this.p2pTransport) {
      this.p2pTransport.destroy();
    }
  }

  render() {
    if (!this.game) return;

    this._updateCanvasSize();

    // 1. Render First Person 3D View
    this.fpRenderer?.render(this.game);

    // 2. Render Corner Minimap
    this.miniRenderer?.render(this.game, this.game.activePlannedRoute, this.selectedRouteTarget);

    // 3. Render Expanded Map (if modal is open)
    const expModal = this.container.querySelector('#tm-expanded-map-modal');
    if (expModal && !expModal.classList.contains('hidden')) {
      this.expandedRenderer?.render(this.game, this.game.activePlannedRoute, this.selectedRouteTarget);
    }

    // 4. Update Header Badges
    const tank = this.game.tank;
    const tankNameEl = this.container.querySelector('#tm-tank-name');
    const tankInsigniaEl = this.container.querySelector('#tm-tank-insignia');
    const modeTagEl = this.container.querySelector('#tm-mode-tag');

    if (tankNameEl) tankNameEl.textContent = tank.preset.name;
    if (tankInsigniaEl) tankInsigniaEl.textContent = tank.preset.insignia.split(' ')[0];
    if (modeTagEl) {
      modeTagEl.textContent = this.game.mode === 'pvp' ? 'MISSION: 24×24 ARENA DUEL' : 'MISSION: 12×12 MINEFIELD';
    }

    // Toggle touch fire button in PvP mode
    const touchFireBtn = this.container.querySelector('#btn-touch-fire');
    if (touchFireBtn) {
      touchFireBtn.classList.toggle('hidden', this.game.mode !== 'pvp');
    }

    // 5. Update Planned Route Banner
    const routeBanner = this.container.querySelector('#tm-route-banner');
    const routeText = this.container.querySelector('#tm-route-text');
    if (this.game.activePlannedRoute && this.game.activePlannedRoute.length > 0) {
      if (routeBanner) routeBanner.classList.remove('hidden');
      if (routeText) routeText.textContent = `Safe Route: ${this.game.activePlannedRoute.length} steps remaining`;
    } else {
      if (routeBanner) routeBanner.classList.add('hidden');
    }

    // 6. Check Game Over
    if (this.game.state.gameOver && !this._outcomeShown) {
      this._outcomeShown = true;
      this._showOutcomeModal();
    }
  }

  _bindEvents() {
    // Movement & Actions
    this.container.querySelector('#btn-touch-fwd')?.addEventListener('click', () => this.handleAdvance());
    this.container.querySelector('#btn-touch-rev')?.addEventListener('click', () => this.handleReverse());
    this.container.querySelector('#btn-touch-left')?.addEventListener('click', () => this.handleTurnLeft());
    this.container.querySelector('#btn-touch-right')?.addEventListener('click', () => this.handleTurnRight());
    this.container.querySelector('#btn-touch-scan')?.addEventListener('click', () => this.handleScan());
    this.container.querySelector('#btn-touch-flag')?.addEventListener('click', () => this.handleFlag());
    this.container.querySelector('#btn-touch-fire')?.addEventListener('click', () => this.handleFire());

    // Route banner buttons
    this.container.querySelector('#btn-tm-step-route')?.addEventListener('click', () => {
      if (this.game) {
        const stepped = this.game.stepPlannedRoute();
        if (stepped) {
          this.app.sound?.playTankEngine?.();
          this.sceneCoordinator?.onAdvance();
          if (this.game.state.lastEvent?.type === 'mine_detonation') {
            this.app.sound?.playMineExplosion?.();
            this.sceneCoordinator?.triggerExplosion(this.game.tank.row, this.game.tank.col);
            this.fpRenderer?.triggerExplosion(0, 1);
          }
        }
      }
    });
    this.container.querySelector('#btn-tm-cancel-route')?.addEventListener('click', () => {
      if (this.game) this.game.cancelPlannedRoute();
    });

    // Reset button
    this.container.querySelector('#btn-tm-reset')?.addEventListener('click', () => {
      this._outcomeShown = false;
      this.app.startNewGame();
    });

    // 3D View Mode Toggle (3D WebGL vs Canvas 2D)
    this.container.querySelector('#btn-tm-view-mode')?.addEventListener('click', () => {
      this.use3D = !this.use3D;
      localStorage.setItem('tm_view_mode', this.use3D ? '3d' : '2d');
      if (this.use3D && !this.sceneCoordinator) {
        const webglContainer = this.container.querySelector('#tm-webgl-container');
        if (webglContainer) {
          try {
            const savedEnv = localStorage.getItem('solitaire_tank_env_preset') || 'daylight';
            this.sceneCoordinator = this._createSceneCoordinator(webglContainer, savedEnv);
          } catch (e) {
            console.error('[!] Three.js WebGL initialization failed:', e);
            this.use3D = false;
          }
        }
      }
      if (this.use3D && this.sceneCoordinator) {
        this.sceneCoordinator.syncFromGame();
        this.sceneCoordinator.onResize();
      }
      this._updateViewModeVisibility();
    });

    // Tactical Environment Preset Toggle (Twilight / Desert / Arctic / Storm)
    this.container.querySelector('#btn-tm-env-mode')?.addEventListener('click', () => {
      if (this.sceneCoordinator) {
        const nextPresetId = this.sceneCoordinator.cycleEnvironment();
        try {
          localStorage.setItem('solitaire_tank_env_preset', nextPresetId);
        } catch (e) {}
        const envBtn = this.container.querySelector('#btn-tm-env-mode');
        const preset = this.sceneCoordinator.getEnvironmentPreset();
        if (envBtn && preset) {
          envBtn.innerHTML = preset.buttonLabel;
        }
      }
    });

    // Camera Mode Toggle (Cockpit vs Tactical Orbit)
    this.container.querySelector('#btn-tm-cam-mode')?.addEventListener('click', () => {
      if (this.sceneCoordinator) {
        const mode = this.sceneCoordinator.toggleCameraMode();
        const camBtn = this.container.querySelector('#btn-tm-cam-mode');
        if (camBtn) {
          camBtn.innerHTML = mode === 'orbit' ? '🔭 Orbit' : '🎯 Cockpit';
        }
      }
    });

    // Tactical Vision Mode Toggle (Standard / NVG Green / Thermal FLIR)
    this.container.querySelector('#btn-tm-vision-mode')?.addEventListener('click', () => {
      if (this.sceneCoordinator) {
        const mode = this.sceneCoordinator.cycleVisionMode();
        const visionBtn = this.container.querySelector('#btn-tm-vision-mode');
        const visionLabels = ['👁️ Standard', '🟢 NVG Green', '🔥 FLIR Thermal'];
        if (visionBtn) {
          visionBtn.innerHTML = visionLabels[mode] || '👁️ Standard';
        }
      }
    });

    // Minimap Click-to-Route
    const miniCanvas = this.container.querySelector('#tm-minimap-canvas');
    miniCanvas?.addEventListener('click', (e) => this._onMinimapClick(e, this.miniRenderer));

    // Expanded Map Click-to-Route
    const expCanvas = this.container.querySelector('#tm-expanded-canvas');
    expCanvas?.addEventListener('click', (e) => this._onMinimapClick(e, this.expandedRenderer));

    // Modals
    this.container.querySelector('#btn-tm-expand-map')?.addEventListener('click', () => {
      this.container.querySelector('#tm-expanded-map-modal')?.classList.remove('hidden');
    });
    this.container.querySelector('#btn-tm-close-expanded-map')?.addEventListener('click', () => {
      this.container.querySelector('#tm-expanded-map-modal')?.classList.add('hidden');
    });

    this.container.querySelector('#btn-tm-rules')?.addEventListener('click', () => {
      this.container.querySelector('#tm-rules-modal')?.classList.remove('hidden');
    });
    this.container.querySelector('#btn-tm-close-rules')?.addEventListener('click', () => {
      this.container.querySelector('#tm-rules-modal')?.classList.add('hidden');
    });

    this.container.querySelector('#btn-tm-tank-select')?.addEventListener('click', () => {
      this.container.querySelector('#tm-tank-modal')?.classList.remove('hidden');
    });
    this.container.querySelector('#btn-tm-close-tank-modal')?.addEventListener('click', () => {
      this.container.querySelector('#tm-tank-modal')?.classList.add('hidden');
    });

    // Tank Selection Cards
    this.container.querySelectorAll('.tm-tank-card').forEach(card => {
      card.addEventListener('click', () => {
        const preset = card.dataset.preset;
        if (preset) {
          this.selectedPresetId = preset;
          localStorage.setItem('tm_selected_tank', preset);
          if (this.game && this.game.tank) {
            this.game.tank.setPreset(preset);
            if (this.sceneCoordinator) {
              this.sceneCoordinator.syncFromGame();
            }
          }
          this.container.querySelector('#tm-tank-modal')?.classList.add('hidden');
        }
      });
    });

    // PvP Modal controls
    this.container.querySelector('#btn-tm-pvp-open')?.addEventListener('click', () => {
      this.container.querySelector('#tm-pvp-modal')?.classList.remove('hidden');
    });
    this.container.querySelector('#btn-tm-close-pvp')?.addEventListener('click', () => {
      this.container.querySelector('#tm-pvp-modal')?.classList.add('hidden');
    });

    this.container.querySelector('#tab-tm-hotseat')?.addEventListener('click', () => this._switchPvPTab('hotseat'));
    this.container.querySelector('#tab-tm-host')?.addEventListener('click', () => this._switchPvPTab('host'));
    this.container.querySelector('#tab-tm-join')?.addEventListener('click', () => this._switchPvPTab('join'));

    this.container.querySelector('#btn-tm-launch-pvp-local')?.addEventListener('click', () => {
      this.container.querySelector('#tm-pvp-modal')?.classList.add('hidden');
      this._launchPvPMode({ isLocal: true });
    });

    this.container.querySelector('#btn-tm-copy-code')?.addEventListener('click', () => this._copyHostCode());
    this.container.querySelector('#btn-tm-submit-join')?.addEventListener('click', () => this._submitJoinByInput());

    // Outcome modal
    this.container.querySelector('#btn-tm-play-again')?.addEventListener('click', () => {
      this.container.querySelector('#tm-outcome-modal')?.classList.add('hidden');
      this._outcomeShown = false;
      this.app.startNewGame();
    });
    this.container.querySelector('#btn-tm-close-outcome')?.addEventListener('click', () => {
      this.container.querySelector('#tm-outcome-modal')?.classList.add('hidden');
    });

    // Window Resize listener
    window.addEventListener('resize', () => this._updateCanvasSize());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (this.app?.gameType !== 'tank_minefield') return;
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (!this.game || this.game.state.gameOver) return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.handleAdvance();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.handleReverse();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.handleTurnLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.handleTurnRight();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.handleScan();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        this.handleFlag();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.game.mode === 'pvp') {
          this.handleFire();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const modal = this.container.querySelector('#tm-expanded-map-modal');
        modal?.classList.toggle('hidden');
      }
    });
  }

  openPvPModal() {
    this.container.querySelector('#tm-pvp-modal')?.classList.remove('hidden');
    this.p2pTransport?.queryOpenRooms();
  }

  // --------------------------------------------------------------------------
  // ACTION HANDLERS
  // --------------------------------------------------------------------------

  handleAdvance() {
    if (!this.game || this.game.state.gameOver) return;
    const moved = this.game.moveAdvance();
    if (moved) {
      if (this.game.mode === 'pvp') {
        this.p2pTransport?.sendIntent('MOVE_ADVANCE');
      }
      this.app.sound?.playTankEngine?.();
      this.sceneCoordinator?.onAdvance();
      if (this.game.state.lastEvent?.type === 'mine_detonation') {
        this.app.sound?.playMineExplosion?.();
        this.sceneCoordinator?.triggerExplosion(this.game.tank.row, this.game.tank.col);
        this.fpRenderer?.triggerExplosion(0, 1);
      }
    }
  }

  handleReverse() {
    if (!this.game || this.game.state.gameOver) return;
    const moved = this.game.moveReverse();
    if (moved) {
      if (this.game.mode === 'pvp') {
        this.p2pTransport?.sendIntent('MOVE_REVERSE');
      }
      this.app.sound?.playTankEngine?.();
      this.sceneCoordinator?.onReverse();
      if (this.game.state.lastEvent?.type === 'mine_detonation') {
        this.app.sound?.playMineExplosion?.();
        this.sceneCoordinator?.triggerExplosion(this.game.tank.row, this.game.tank.col);
        this.fpRenderer?.triggerExplosion(0, -1);
      }
    }
  }

  handleTurnLeft() {
    if (!this.game || this.game.state.gameOver) return;
    this.game.turnLeft();
    if (this.game.mode === 'pvp') {
      this.p2pTransport?.sendIntent('TURN_LEFT');
    }
    this.app.sound?.playCardSlide?.();
    this.sceneCoordinator?.onTurn();
  }

  handleTurnRight() {
    if (!this.game || this.game.state.gameOver) return;
    this.game.turnRight();
    if (this.game.mode === 'pvp') {
      this.p2pTransport?.sendIntent('TURN_RIGHT');
    }
    this.app.sound?.playCardSlide?.();
    this.sceneCoordinator?.onTurn();
  }

  handleScan() {
    if (!this.game || this.game.state.gameOver) return;
    const res = this.game.scanAhead();
    if (res && res.valid) {
      this.app.sound?.playScannerPing?.();
      this.sceneCoordinator?.triggerScanPulse(res.row, res.col, res.foundMine);
      this.sceneCoordinator?.syncFromGame();
      if (res.foundMine) {
        this.app._displayHintMessage(`⚠️ DANGER: Confirmed mine detected on sector ahead!`);
      } else {
        this.app._displayHintMessage(`✓ RADAR SCAN CLEAR: Safe terrain ahead.`);
      }
    }
  }

  handleFlag() {
    if (!this.game || this.game.state.gameOver) return;
    const toggled = this.game.toggleFlagAhead();
    if (toggled) {
      this.app.sound?.playFlag?.();
      this.sceneCoordinator?.syncFromGame();
    }
  }

  handleFire() {
    if (!this.game || this.game.state.gameOver || this.game.mode !== 'pvp') return;
    const res = this.game.firePlayerShell();
    if (res) {
      if (res.success) {
        this.p2pTransport?.sendIntent('FIRE_SHELL');
        this.app.sound?.playCannonFire?.();
        this.fpRenderer?.triggerMuzzleFire();

        const target = res.isHit ? (res.targetCoord || res.impactCoord) : res.impactCoord;
        if (target && this.sceneCoordinator) {
          this.sceneCoordinator.launchShellTo(target.row, target.col, () => {
            if (res.isHit) {
              this.app.sound?.playMineExplosion?.();
              this.fpRenderer?.triggerExplosion(0, res.hitDistance);
              if (this.sceneCoordinator.enemyTank) {
                this.sceneCoordinator.enemyTank.triggerDestruction();
              }
            } else if (res.detonatedMine) {
              this.app.sound?.playMineExplosion?.();
              this.fpRenderer?.triggerExplosion(0, 1);
            }
            this.sceneCoordinator.syncFromGame();
          });
        } else {
          this.sceneCoordinator?.triggerMuzzleFire();
          if (res.isHit) {
            this.app.sound?.playMineExplosion?.();
            this.fpRenderer?.triggerExplosion(0, res.hitDistance);
            if (res.targetCoord) {
              this.sceneCoordinator?.triggerExplosion(res.targetCoord.row, res.targetCoord.col);
            }
          } else if (res.detonatedMine) {
            this.app.sound?.playMineExplosion?.();
            this.fpRenderer?.triggerExplosion(0, 1);
            if (res.impactCoord) {
              this.sceneCoordinator?.triggerExplosion(res.impactCoord.row, res.impactCoord.col);
            }
          }
          this.sceneCoordinator?.syncFromGame();
        }
      } else {
        this.app._displayHintMessage(`⚠️ ${res.message}`);
      }
    }
  }

  _onMinimapClick(e, renderer) {
    if (!this.game || this.game.state.gameOver) return;

    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cell = renderer.getCellFromScreenCoords(x, y);
    if (!cell) return;

    this.selectedRouteTarget = cell;
    const routeRes = this.game.planRouteTo(cell);

    if (routeRes.success) {
      if (routeRes.isRiskyMove) {
        this.app._displayHintMessage(`⚠️ Risky move planned to adjacent unexplored cell. Advance to proceed.`);
      } else {
        this.app._displayHintMessage(`✓ Safe path planned (${routeRes.path.length - 1} steps).`);
      }
    } else {
      this.app._displayHintMessage(`⚠️ ${routeRes.reason}`);
    }
  }

  // --------------------------------------------------------------------------
  // PVP LOBBY & TRANSPORT
  // --------------------------------------------------------------------------

  _switchPvPTab(tab) {
    const panels = ['hotseat', 'host', 'join'];
    panels.forEach(p => {
      this.container.querySelector(`#tab-tm-${p}`)?.classList.toggle('active', p === tab);
      this.container.querySelector(`#panel-tm-${p}`)?.classList.toggle('hidden', p !== tab);
    });

    if (tab === 'host') {
      const room = this.p2pTransport.hostRoom();
      const input = this.container.querySelector('#tm-host-code-display');
      if (input) input.value = room.matchCode;
    } else if (tab === 'join') {
      this.p2pTransport.queryOpenRooms();
    }
  }

  async _copyHostCode() {
    const input = this.container.querySelector('#tm-host-code-display');
    if (!input || !input.value) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(input.value);
      } else {
        input.select();
        document.execCommand('copy');
      }
      const fb = this.container.querySelector('#tm-copy-feedback');
      fb?.classList.remove('hidden');
      setTimeout(() => fb?.classList.add('hidden'), 2500);
    } catch (err) {
      console.warn(err);
    }
  }

  _submitJoinByInput() {
    const input = this.container.querySelector('#tm-join-code-input');
    const err = this.container.querySelector('#tm-join-error');
    const val = input ? input.value.trim() : '';

    if (!val) {
      if (err) {
        err.textContent = 'Please enter a match code or room ID.';
        err.classList.remove('hidden');
      }
      return;
    }

    const res = this.p2pTransport.joinByCode(val, this.app.profiles?.getActiveProfile()?.name || 'Commander 2', this.selectedPresetId);
    if (res === false && err) {
      err.textContent = 'Invalid match code. Please check and try again.';
      err.classList.remove('hidden');
    }
  }

  _onP2PAvailableRoomsChange(rooms) {
    const list = this.container.querySelector('#tm-available-rooms-list');
    if (!list) return;

    if (!rooms || rooms.length === 0) {
      list.innerHTML = `<div class="wt-rooms-empty">Scanning for open PvP duels...</div>`;
      return;
    }

    list.innerHTML = '';
    for (const r of rooms) {
      const item = document.createElement('div');
      item.className = 'wt-room-item';
      item.innerHTML = `
        <div class="wt-room-meta">
          <span class="wt-room-host">⚔️ ${r.hostName || 'Host'} (${r.presetId || 'US'})</span>
          <span class="wt-room-id">${r.roomId}</span>
        </div>
        <button class="btn btn-gold btn-sm btn-join-pvp" data-room-id="${r.roomId}">Join Duel</button>
      `;
      item.querySelector('.btn-join-pvp')?.addEventListener('click', () => {
        this.p2pTransport.joinRoom(r.roomId, this.app.profiles?.getActiveProfile()?.name || 'Commander 2', this.selectedPresetId);
      });
      list.appendChild(item);
    }
  }

  _onP2PMatchConnected(matchInfo) {
    this.container.querySelector('#tm-pvp-modal')?.classList.add('hidden');
    this._launchPvPMode({
      seed: matchInfo.seed,
      opponentName: matchInfo.opponentName,
      opponentPresetId: matchInfo.opponentPresetId
    });
    this.app._displayHintMessage(`⚔️ Connected to PvP Duel against ${matchInfo.opponentName}!`);
  }

  _onP2PRemoteIntent(action, payload, fromName) {
    if (this.game && this.game.mode === 'pvp') {
      this.game.applyRemoteIntent(action, payload);
      this.sceneCoordinator?.syncFromGame();
      this.render();
    }
  }

  _launchPvPMode(options = {}) {
    const game = new TankMinefieldGame({
      mode: 'pvp',
      seed: options.seed || Date.now(),
      playerName: this.app.profiles?.getActiveProfile()?.name || 'Commander',
      presetId: this.selectedPresetId,
      opponentName: options.opponentName || 'Sovereign Rival',
      opponentPresetId: options.opponentPresetId || 'USSR'
    });

    this.app.currentGame = game;
    this.setGame(game);
  }

  _showOutcomeModal() {
    const modal = this.container.querySelector('#tm-outcome-modal');
    const iconEl = this.container.querySelector('#tm-outcome-icon');
    const titleEl = this.container.querySelector('#tm-outcome-title');
    const reasonEl = this.container.querySelector('#tm-outcome-reason');
    const armorEl = this.container.querySelector('#tm-final-armor');
    const minesEl = this.container.querySelector('#tm-final-mines');
    const scansEl = this.container.querySelector('#tm-final-scans');

    if (!modal) return;

    const won = this.game.state.won;
    const outcome = this.game.state.roundOutcome;
    const reason = this.game.state.roundEndReason;

    if (outcome === 'victory') {
      if (iconEl) iconEl.textContent = '🏆';
      if (titleEl) titleEl.textContent = 'MISSION ACCOMPLISHED';
      if (reasonEl) {
        reasonEl.textContent = reason === 'extracted'
          ? 'Extraction zone reached safely!'
          : 'Enemy tank destroyed by direct shell hit!';
      }
      this.app.sound?.playSuccess?.();
      this.app.victoryCascade?.start('grand_royale');
    } else if (outcome === 'defeat') {
      if (iconEl) iconEl.textContent = '💥';
      if (titleEl) titleEl.textContent = 'TANK DESTROYED';
      if (reasonEl) {
        reasonEl.textContent = reason === 'shell_destroyed'
          ? 'Destroyed by direct enemy shell impact!'
          : 'Armor depleted by minefield detonations!';
      }
    } else {
      if (iconEl) iconEl.textContent = '🤝';
      if (titleEl) titleEl.textContent = 'DUEL DRAW';
      if (reasonEl) reasonEl.textContent = 'Both tanks simultaneously destroyed or equal armor at timeout.';
    }

    if (armorEl) armorEl.textContent = `${this.game.tank.armor} / 3`;
    if (minesEl) minesEl.textContent = this.game.state.minesDetonated;
    if (scansEl) scansEl.textContent = this.game.state.scans;

    modal.classList.remove('hidden');
  }
}
