/**
 * Naval Theater Coordinator — drop-in replacement for NavalSceneCoordinator.
 *
 * Presents Admiral's Gambit on the cinematic 3D theater (./theater/): Gerstner
 * ocean with wakes, volumetric sky, PBR warships, GPU combat VFX and sinking.
 * Same public surface the view already uses (syncFromGame, fireBattery,
 * aimTurretAt, toggleCameraMode, onResize, destroy), so admirals_gambit_view.js
 * only swaps the class it constructs.
 *
 * The game engine stays authoritative: this class only reads grid state and
 * animates outcomes it is handed. Enemy ships stay hidden until hit (fog of war).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NavalTheater } from './theater/NavalTheater.js';
import { LAYERS } from './theater/shared.js';
import { GRID_SIZE, CELL_STATE, ORIENTATION } from '../../core/admirals_gambit/rules_config.js';

const CLASS_CODES = { carrier: 'CV', battleship: 'BB', cruiser: 'CA', destroyer: 'DD', submarine: 'SS' };
const CELL = 60;                       // metres per grid cell
const BOARD_SPAN = CELL * GRID_SIZE;   // 600 m
const BOARDS = {
  player: { cx: 0, cz: 430 },
  enemy: { cx: 0, cz: -430 },
};
const ENEMY_LINE_ID = 'enemy_battle_line';

export class NavalTheaterCoordinator {
  constructor(containerEl, game, options = {}) {
    this.container = containerEl;
    this.game = game;
    this.cameraMode = 'bow';
    this.isDisposed = false;
    this.ready = false;
    this.queue = Promise.resolve();
    this.pending = new Map();      // ship key -> Promise while the mesh is being built
    this.sinkShown = new Set();
    this.seenPlayerShots = new Set();
    this.inFlight = new Set();     // targets of shells still in the air (revealed on impact)
    this.boundGame = null;

    containerEl.innerHTML = '';
    this.theater = new NavalTheater(containerEl, {
      quality: options.quality ?? 'auto',
      environment: options.environment ?? 'sunset',
      arena: { centerX: 0, centerZ: 0, size: 2800 },
    });
    this.readyPromise = this._init().catch((err) => {
      console.error('NavalTheaterCoordinator failed to start:', err);
      this.failed = true;
    });
  }

  async _init() {
    const th = this.theater;
    await th.init({ procedural: true });
    if (this.isDisposed) return;

    this.controls = new OrbitControls(th.camera, th.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 80;
    this.controls.maxDistance = 3200;
    th.onBeforeFrame = () => {
      this.controls.update();
      th.focusPoint.copy(this.controls.target);
    };

    this._addBoardGrid(BOARDS.enemy, 0xf87171);
    this._addBoardGrid(BOARDS.player, 0x38bdf8);

    // The enemy fleet's guns fire from a battle line beyond their board, so muzzle
    // flashes never reveal where hidden enemy ships are.
    const line = await th.addShip(ENEMY_LINE_ID, 'BB', { x: -200, z: BOARDS.enemy.cz - BOARD_SPAN / 2 - 450, heading: Math.PI / 2 });
    line.setCourse(Math.PI / 2, 0);

    this.ready = true;
    // Stop rendering while Admiral's Gambit is not on screen (another game mode is active).
    this._visibility = new IntersectionObserver(([entry]) => th.setActive(entry.isIntersecting));
    this._visibility.observe(this.container);
    this.setCameraMode(this.cameraMode);
    this.syncFromGame();
  }

  // ==========================================================================
  // GRID <-> WORLD
  // ==========================================================================

  gridToWorld(row, col, isEnemy = true) {
    const b = isEnemy ? BOARDS.enemy : BOARDS.player;
    return new THREE.Vector3(
      b.cx + (col + 0.5 - GRID_SIZE / 2) * CELL,
      0,
      b.cz + (row + 0.5 - GRID_SIZE / 2) * CELL,
    );
  }

  _addBoardGrid(board, color) {
    const grid = new THREE.GridHelper(BOARD_SPAN, GRID_SIZE, color, color);
    grid.position.set(board.cx, 4.5, board.cz);
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    grid.material.depthWrite = false;
    grid.layers.set(LAYERS.EFFECTS);
    this.theater.scene.add(grid);
  }

  _shipKey(isEnemy, shipId) { return `${isEnemy ? 'enemy' : 'friendly'}_${shipId}`; }

  /** Builds (once) and places a game ship on its board. */
  _ensureShip(isEnemy, ship) {
    const key = this._shipKey(isEnemy, ship.id);
    const th = this.theater;
    if (th.ships.has(key)) return th.ships.get(key);
    if (this.pending.has(key)) return null;
    const classId = CLASS_CODES[ship.id];
    if (!classId || !ship.cells?.length) return null;

    const build = th.addShip(key, classId).then((s) => {
      this.pending.delete(key);
      if (this.isDisposed) return;
      const cells = ship.cells;
      const sum = cells.reduce((a, c) => a.add(this.gridToWorld(c.row, c.col, isEnemy)), new THREE.Vector3());
      const center = sum.divideScalar(cells.length);
      const scale = Math.min(1, (cells.length * CELL * 0.9) / s.spec.length);
      s.model.scale.setScalar(scale);
      s.spec = { ...s.spec, length: s.spec.length * scale, beam: s.spec.beam * scale, freeboard: s.spec.freeboard * scale };
      const horizontal = ship.orientation === ORIENTATION.HORIZONTAL;
      // Player ships face the enemy board (bow towards -Z when vertical).
      const heading = horizontal ? Math.PI / 2 : (isEnemy ? 0 : Math.PI);
      s.place(center.x, center.z, heading);
      s.object.visible = !isEnemy || ship.hits > 0 || ship.sunk;
      this.syncFromGame();
    });
    this.pending.set(key, build);
    return null;
  }

  // ==========================================================================
  // FLEET SYNCHRONIZATION
  // ==========================================================================

  syncFromGame() {
    if (!this.ready || !this.game || this.isDisposed) return;
    const th = this.theater;

    // New game object, or the same game re-deployed (reset / new seed).
    const signature = this._fleetSignature();
    if (this.boundGame !== this.game || this.boundSignature !== signature) this._resetForNewGame(signature);

    for (const [isEnemy, grid] of [[false, this.game.playerGrid], [true, this.game.aiGrid]]) {
      if (!grid?.ships) continue;
      for (const ship of grid.ships.values()) {
        const s = this._ensureShip(isEnemy, ship);
        if (!s) continue;
        const key = this._shipKey(isEnemy, ship.id);
        if (this.inFlight.has(key)) continue;
        if (isEnemy && (ship.hits > 0 || ship.sunk)) s.object.visible = true;
        if (ship.sunk && !this.sinkShown.has(key)) {
          this.sinkShown.add(key);
          s.object.visible = true;
          th.sink(key);
        }
      }
    }

    this._queueEnemyShots();
  }

  _fleetSignature() {
    const part = (g) => (g?.ships ? [...g.ships.values()].map((s) => `${s.id}:${s.startRow},${s.startCol},${s.orientation}`).join('|') : '');
    return `${part(this.game.playerGrid)}/${part(this.game.aiGrid)}`;
  }

  _resetForNewGame(signature) {
    const th = this.theater;
    for (const id of [...th.ships.keys()]) if (id !== ENEMY_LINE_ID) th.removeShip(id);
    this.pending.clear();
    this.sinkShown.clear();
    this.inFlight.clear();
    this.seenPlayerShots.clear();
    // Shots already on the board (loaded game) are not replayed.
    this._forEachResolvedCell(this.game.playerGrid, (r, c) => this.seenPlayerShots.add(`${r},${c}`));
    this.boundGame = this.game;
    this.boundSignature = signature;
  }

  _forEachResolvedCell(grid, fn) {
    if (!grid?.cells) return;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const st = grid.cells[r][c].state;
        if (st === CELL_STATE.MISS || st === CELL_STATE.HIT || st === CELL_STATE.SUNK) fn(r, c, grid.cells[r][c]);
      }
    }
  }

  /** Animates enemy (AI) shots that landed on the player's board since the last sync. */
  _queueEnemyShots() {
    const grid = this.game.playerGrid;
    this._forEachResolvedCell(grid, (r, c, cell) => {
      const key = `${r},${c}`;
      if (this.seenPlayerShots.has(key)) return;
      this.seenPlayerShots.add(key);
      const ship = cell.shipId ? grid.ships.get(cell.shipId) : null;
      const isHit = cell.state !== CELL_STATE.MISS;
      const victimKey = ship ? this._shipKey(false, ship.id) : null;
      const sunk = !!ship?.sunk && !this.sinkShown.has(victimKey);
      if (sunk) this.sinkShown.add(victimKey);
      if (victimKey) this.inFlight.add(victimKey);
      this._enqueue(() => this.theater.fire(ENEMY_LINE_ID, isHit && victimKey ? { shipId: victimKey } : this.gridToWorld(r, c, false),
        { result: sunk ? 'sunk' : isHit ? 'hit' : 'miss', weapon: 'guns', point: this.gridToWorld(r, c, false) })
        .finally(() => { if (victimKey) this.inFlight.delete(victimKey); }));
    });
  }

  _enqueue(step) {
    this.queue = this.queue.then(step).catch((err) => console.error('[NavalTheaterCoordinator]', err));
    return this.queue;
  }

  // ==========================================================================
  // COMBAT ACTIONS
  // ==========================================================================

  _playerGunship() {
    const th = this.theater;
    const order = ['battleship', 'cruiser', 'destroyer', 'carrier'];
    for (const id of order) {
      const s = th.ships.get(this._shipKey(false, id));
      if (s && s.state === 'afloat') return s;
    }
    return null;
  }

  aimTurretAt(row, col) {
    const s = this._playerGunship();
    if (s) s.aimAt(this.gridToWorld(row, col, true).setY(5));
  }

  /** Player fires at an enemy cell. result: { isHit, isSunk }. Same signature as before. */
  fireBattery(toRow, toCol, result, onComplete) {
    const done = () => { if (onComplete) onComplete(result); };
    if (!this.ready) { this.syncFromGame(); done(); return; }
    const point = this.gridToWorld(toRow, toCol, true);
    const cell = this.game?.aiGrid?.cells?.[toRow]?.[toCol];
    const victimKey = result.isHit && cell?.shipId ? this._shipKey(true, cell.shipId) : null;
    if (result.isSunk && victimKey) this.sinkShown.add(victimKey);
    if (victimKey) this.inFlight.add(victimKey);

    this._enqueue(async () => {
      const attacker = this._playerGunship();
      if (attacker) {
        await this.theater.fire(attacker.id, victimKey ? { shipId: victimKey } : point,
          { result: result.isSunk ? 'sunk' : result.isHit ? 'hit' : 'miss', weapon: 'guns', point });
      }
      if (victimKey) this.inFlight.delete(victimKey);
      this.syncFromGame();
      done();
    });
  }

  /** Kept for API compatibility; enemy shots are now animated from grid state in syncFromGame(). */
  fireEnemySalvo(targetRow, targetCol, result, onComplete) {
    this.syncFromGame();
    this._enqueue(async () => onComplete?.(result));
  }

  requestRender() {}

  // ==========================================================================
  // CAMERA
  // ==========================================================================

  setCameraMode(mode) {
    this.cameraMode = ['bow', 'broadside', 'turret'].includes(mode) ? mode : 'bow';
    if (!this.ready) return;
    const cam = this.theater.camera;
    const flag = this._playerGunship()?.position ?? new THREE.Vector3(BOARDS.player.cx, 0, BOARDS.player.cz);
    if (this.cameraMode === 'broadside') {
      cam.position.set(flag.x + 520, 90, flag.z - 120);
      this.controls.target.set(flag.x, 10, flag.z - 160);
    } else if (this.cameraMode === 'turret') {
      cam.position.set(flag.x, 70, flag.z + 260);
      this.controls.target.set(BOARDS.enemy.cx, 0, BOARDS.enemy.cz);
    } else {
      cam.position.set(-640, 280, BOARDS.player.cz + 520);
      this.controls.target.set(0, 0, -80);
    }
    this.controls.update();
  }

  toggleCameraMode() {
    const modes = ['bow', 'broadside', 'turret'];
    this.setCameraMode(modes[(modes.indexOf(this.cameraMode) + 1) % modes.length]);
    return this.cameraMode;
  }

  /** The theater tracks its container with a ResizeObserver; nothing to do here. */
  onResize() {}

  setEnvironment(name) { if (this.ready) this.theater.setEnvironment(name); }

  destroy() {
    this.isDisposed = true;
    this._visibility?.disconnect();
    this.controls?.dispose();
    this.theater?.dispose();
  }
}
