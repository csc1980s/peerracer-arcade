/**
 * Admiral's Gambit: Iron Fleet — Authoritative Game Engine
 *
 * Core turn state machine orchestrating:
 * - Fleet deployment & validation
 * - Command Points (CP) resource allocation
 * - Turn-based firing solutions and hit/miss/sunk resolution
 * - Special tactical gambits (Air Recon, Heavy Salvo, Radar Sweep, Depth Charge, Smoke)
 * - AI Admiral heuristic execution
 * - Victory/Defeat endgame conditions
 */

import {
  GRID_SIZE,
  CELL_STATE,
  SHIP_CLASSES,
  COMMAND_POINTS,
  GAME_PHASE,
  createPRNG,
  generateSeedString,
  seedStringToNumber
} from '../core/admirals_gambit/rules_config.js';

import { NavalGrid } from '../core/admirals_gambit/naval_grid.js';
import { AIAdmiralEngine } from '../core/admirals_gambit/ai_admiral_engine.js';

export class AdmiralsGambitGame {
  constructor(options = {}) {
    this.options = {
      autoDeploy: true,
      seed: options.seed || generateSeedString(),
      ...options
    };

    this.seedString = this.options.seed;
    this.prng = createPRNG(seedStringToNumber(this.seedString));

    this.playerGrid = new NavalGrid(true);
    this.aiGrid = new NavalGrid(false);
    this.aiEngine = new AIAdmiralEngine(this.aiGrid, this.playerGrid);

    this.phase = GAME_PHASE.DEPLOYMENT;
    this.turnCount = 1;

    // Command Points (CP)
    this.playerCP = COMMAND_POINTS.STARTING_PER_TURN;
    this.aiCP = COMMAND_POINTS.STARTING_PER_TURN;

    // Tactical Action Log
    this.actionLog = [];

    // Combat Stats
    this.stats = {
      playerShots: 0,
      playerHits: 0,
      aiShots: 0,
      aiHits: 0,
      playerShipsSunk: 0,
      aiShipsSunk: 0,
      gambitsUsed: 0
    };

    if (this.options.autoDeploy) {
      this.deployFleets();
    }
  }

  // ============================================================================
  // FLEET DEPLOYMENT & SEED MANAGEMENT
  // ============================================================================

  deployFleets() {
    // Deterministic placement using PRNG
    this.playerGrid.randomizeFleet(this.prng);
    this.aiGrid.randomizeFleet(this.prng);
    this.phase = GAME_PHASE.PLAYER_TURN;
    this.playerCP = COMMAND_POINTS.STARTING_PER_TURN;
    this.aiCP = COMMAND_POINTS.STARTING_PER_TURN;

    this._logAction('DEPLOYMENT', 'Fleet formations deployed. All batteries standing by.');
  }

  loadSeed(newSeedStr) {
    this.seedString = newSeedStr;
    this.prng = createPRNG(seedStringToNumber(this.seedString));
    this.reset();
  }

  reset() {
    this.playerGrid.reset();
    this.aiGrid.reset();
    this.turnCount = 1;
    this.playerCP = COMMAND_POINTS.STARTING_PER_TURN;
    this.aiCP = COMMAND_POINTS.STARTING_PER_TURN;
    this.actionLog = [];
    this.stats = {
      playerShots: 0,
      playerHits: 0,
      aiShots: 0,
      aiHits: 0,
      playerShipsSunk: 0,
      aiShipsSunk: 0,
      gambitsUsed: 0
    };
    this.deployFleets();
  }

  // ============================================================================
  // PLAYER ACTIONS
  // ============================================================================

  /**
   * Main Battery Fire at target coordinate
   */
  fireBattery(row, col) {
    if (this.phase !== GAME_PHASE.PLAYER_TURN) {
      return { success: false, error: 'NOT_PLAYER_TURN' };
    }

    if (this.playerCP < COMMAND_POINTS.BASE_FIRE_COST) {
      return { success: false, error: 'INSUFFICIENT_CP' };
    }

    const fireResult = this.aiGrid.receiveFire(row, col);
    if (!fireResult.valid) {
      return { success: false, error: fireResult.error };
    }

    this.playerCP -= COMMAND_POINTS.BASE_FIRE_COST;
    this.stats.playerShots++;

    if (fireResult.result === 'HIT' || fireResult.result === 'SUNK') {
      this.stats.playerHits++;
    }

    if (fireResult.sunk) {
      this.stats.aiShipsSunk++;
      this._logAction('SUNK', `Direct hit! Enemy ${fireResult.shipName} (${fireResult.shipCode}) has been sunk!`);
    } else if (fireResult.result === 'HIT') {
      this._logAction('HIT', `Direct hit confirmed on coordinate [${row}, ${col}]!`);
    } else {
      this._logAction('MISS', `Splash at [${row}, ${col}]. No contact.`);
    }

    // Check Victory
    if (fireResult.allSunk) {
      this.phase = GAME_PHASE.VICTORY;
      this._logAction('VICTORY', 'Hostile fleet completely neutralized. Admiral\'s Gambit Victory!');
      return { success: true, fireResult, phase: this.phase };
    }

    // Auto-advance turn if out of CP
    if (this.playerCP <= 0) {
      this._endPlayerTurn();
    }

    return { success: true, fireResult, phase: this.phase, remainingCP: this.playerCP };
  }

  // ============================================================================
  // TACTICAL GAMBITS (PLAYER)
  // ============================================================================

  executeAirRecon(centerRow, centerCol) {
    if (this.phase !== GAME_PHASE.PLAYER_TURN) return { success: false, error: 'NOT_PLAYER_TURN' };
    if (!this.playerGrid.isShipAlive('carrier')) return { success: false, error: 'CARRIER_DESTROYED' };

    const cost = SHIP_CLASSES.CARRIER.cpCost;
    if (this.playerCP < cost) return { success: false, error: 'INSUFFICIENT_CP' };

    this.playerCP -= cost;
    this.stats.gambitsUsed++;

    const reconResult = this.aiGrid.scanAirRecon(centerRow, centerCol);
    if (reconResult.detected) {
      this._logAction('GAMBIT', `✈️ Air Recon over [${centerRow}, ${centerCol}]: Enemy surface vessel spotted!`);
    } else {
      this._logAction('GAMBIT', `✈️ Air Recon over [${centerRow}, ${centerCol}]: Sector clear of surface contacts.`);
    }

    if (this.playerCP <= 0) this._endPlayerTurn();
    return { success: true, reconResult, remainingCP: this.playerCP };
  }

  executeHeavySalvo(row, col) {
    if (this.phase !== GAME_PHASE.PLAYER_TURN) return { success: false, error: 'NOT_PLAYER_TURN' };
    if (!this.playerGrid.isShipAlive('battleship')) return { success: false, error: 'BATTLESHIP_DESTROYED' };

    const cost = SHIP_CLASSES.BATTLESHIP.cpCost;
    if (this.playerCP < cost) return { success: false, error: 'INSUFFICIENT_CP' };

    this.playerCP -= cost;
    this.stats.gambitsUsed++;

    // Salvo hits primary cell and one adjacent cell
    const primary = this.aiGrid.receiveFire(row, col);
    let secondary = null;

    // Pick adjacent cell
    const adjCandidates = [
      { r: row, c: col + 1 },
      { r: row + 1, c: col },
      { r: row, c: col - 1 },
      { r: row - 1, c: col }
    ].filter(p => p.r >= 0 && p.r < GRID_SIZE && p.c >= 0 && p.c < GRID_SIZE);

    if (adjCandidates.length > 0) {
      const pick = adjCandidates[0];
      secondary = this.aiGrid.receiveFire(pick.r, pick.c);
    }

    this._logAction('GAMBIT', `⚓ 16-Inch Twin Salvo fired on [${row}, ${col}]!`);

    if (this.aiGrid.areAllShipsSunk()) {
      this.phase = GAME_PHASE.VICTORY;
      this._logAction('VICTORY', 'Hostile fleet eliminated. Victory!');
    } else if (this.playerCP <= 0) {
      this._endPlayerTurn();
    }

    return { success: true, primary, secondary, remainingCP: this.playerCP };
  }

  executeRadarSweep(isRow, index) {
    if (this.phase !== GAME_PHASE.PLAYER_TURN) return { success: false, error: 'NOT_PLAYER_TURN' };
    if (!this.playerGrid.isShipAlive('cruiser')) return { success: false, error: 'CRUISER_DESTROYED' };

    const cost = SHIP_CLASSES.CRUISER.cpCost;
    if (this.playerCP < cost) return { success: false, error: 'INSUFFICIENT_CP' };

    this.playerCP -= cost;
    this.stats.gambitsUsed++;

    const radarResult = this.aiGrid.radarSweep(isRow, index);
    const axis = isRow ? `Row ${index + 1}` : `Column ${index + 1}`;
    this._logAction('GAMBIT', `📡 Radar Sweep of ${axis}: Detected ${radarResult.detectedCount} hull segments.`);

    if (this.playerCP <= 0) this._endPlayerTurn();
    return { success: true, radarResult, remainingCP: this.playerCP };
  }

  executeDepthCharge(row, col) {
    if (this.phase !== GAME_PHASE.PLAYER_TURN) return { success: false, error: 'NOT_PLAYER_TURN' };
    if (!this.playerGrid.isShipAlive('destroyer')) return { success: false, error: 'DESTROYER_DESTROYED' };

    const cost = SHIP_CLASSES.DESTROYER.cpCost;
    if (this.playerCP < cost) return { success: false, error: 'INSUFFICIENT_CP' };

    this.playerCP -= cost;
    this.stats.gambitsUsed++;

    // Hits a line of 3 cells centered at (row, col)
    const hits = [];
    for (let dc = -1; dc <= 1; dc++) {
      const c = col + dc;
      if (c >= 0 && c < GRID_SIZE) {
        hits.push(this.aiGrid.receiveFire(row, c));
      }
    }

    this._logAction('GAMBIT', `🌊 Depth Charge Line launched along Row ${row + 1} at Column ${col + 1}!`);

    if (this.aiGrid.areAllShipsSunk()) {
      this.phase = GAME_PHASE.VICTORY;
    } else if (this.playerCP <= 0) {
      this._endPlayerTurn();
    }

    return { success: true, results: hits, remainingCP: this.playerCP };
  }

  executeSmokeScreen(centerRow, centerCol) {
    if (this.phase !== GAME_PHASE.PLAYER_TURN) return { success: false, error: 'NOT_PLAYER_TURN' };
    const cost = COMMAND_POINTS.SMOKE_SCREEN_COST;
    if (this.playerCP < cost) return { success: false, error: 'INSUFFICIENT_CP' };

    this.playerCP -= cost;
    this.stats.gambitsUsed++;

    const smoked = this.playerGrid.deploySmokeScreen(centerRow, centerCol);
    this._logAction('GAMBIT', `💨 Tactical Smoke Screen deployed covering 2x2 sector.`);

    if (this.playerCP <= 0) this._endPlayerTurn();
    return { success: true, smoked, remainingCP: this.playerCP };
  }

  endTurn() {
    if (this.phase === GAME_PHASE.PLAYER_TURN) {
      this._endPlayerTurn();
      return true;
    }
    return false;
  }

  // ============================================================================
  // TURN CYCLE & AI EXECUTION
  // ============================================================================

  _endPlayerTurn() {
    this.phase = GAME_PHASE.AI_TURN;
    this.playerGrid.tickSmoke();

    // Give AI its Command Points
    this.aiCP = Math.min(COMMAND_POINTS.MAX_STORAGE, this.aiCP + COMMAND_POINTS.STARTING_PER_TURN);

    // Execute AI actions
    setTimeout(() => {
      this._executeAITurn();
    }, 200);
  }

  _executeAITurn() {
    if (this.phase !== GAME_PHASE.AI_TURN) return;

    let movesMade = 0;
    while (this.aiCP > 0 && this.phase === GAME_PHASE.AI_TURN && movesMade < 4) {
      movesMade++;
      const decision = this.aiEngine.decideTurn(this.aiCP);

      if (decision.type === 'FIRE') {
        this.aiCP -= decision.cpCost || 1;
        this.stats.aiShots++;

        const fireResult = this.playerGrid.receiveFire(decision.row, decision.col);
        if (fireResult.result === 'HIT' || fireResult.result === 'SUNK') {
          this.stats.aiHits++;
        }

        if (fireResult.sunk) {
          this.stats.playerShipsSunk++;
          this._logAction('AI_ATTACK', `⚠️ Alert! Hostile battery fire sank our ${fireResult.shipName}!`);
        } else if (fireResult.result === 'HIT') {
          this._logAction('AI_ATTACK', `Incoming fire struck our fleet at [${decision.row}, ${decision.col}]!`);
        } else {
          this._logAction('AI_ATTACK', `Enemy shell splashed harmlessly at [${decision.row}, ${decision.col}].`);
        }

        if (fireResult.allSunk) {
          this.phase = GAME_PHASE.DEFEAT;
          this._logAction('DEFEAT', 'Our fleet has been destroyed. Tactical Defeat.');
          return;
        }
      } else if (decision.type === 'GAMBIT_AIR_RECON') {
        this.aiCP -= decision.cpCost;
        this.playerGrid.scanAirRecon(decision.row, decision.col);
        this._logAction('AI_GAMBIT', 'Enemy scout aircraft sighted conducting reconnaissance!');
      } else if (decision.type === 'GAMBIT_RADAR_SWEEP') {
        this.aiCP -= decision.cpCost;
        this.playerGrid.radarSweep(decision.isRow, decision.index);
        this._logAction('AI_GAMBIT', 'High-frequency enemy radar emission detected!');
      }
    }

    // Complete AI turn & return to Player
    if (this.phase === GAME_PHASE.AI_TURN) {
      this.turnCount++;
      this.playerCP = Math.min(COMMAND_POINTS.MAX_STORAGE, this.playerCP + COMMAND_POINTS.STARTING_PER_TURN);
      this.aiGrid.tickSmoke();
      this.phase = GAME_PHASE.PLAYER_TURN;
      this._logAction('TURN', `--- Turn ${this.turnCount} Commenced (3 CP Awarded) ---`);
    }
  }

  _logAction(type, message) {
    this.actionLog.unshift({
      turn: this.turnCount,
      type,
      message,
      timestamp: Date.now()
    });
    if (this.actionLog.length > 50) {
      this.actionLog.pop();
    }
  }
}
