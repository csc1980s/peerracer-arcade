/**
 * Tank Minefield: Iron Perimeter — Authoritative Game Coordinator
 * 
 * Supports:
 * - Single-Player: 12x12 minefield, 3 armor, guaranteed extraction route.
 * - PvP Mode: 24x24 shared arena, one shell per round, custom adjacent-miss ballistics, round timer.
 * - Strict grid movement, cardinal facings, and atomic collision/detonation resolution.
 */

import { CARDINAL_DIRECTIONS, TANK_RULES_V1, CELL_STATE } from '../core/tank_minefield/rules_config.js';
import { TankMineGrid, MinesweeperSolver } from '../core/tank_minefield/grid.js';
import { TankVehicle } from '../core/tank_minefield/tank.js';
import { SafePathfinder } from '../core/tank_minefield/pathfinder.js';
import { TankCombatResolver } from '../core/tank_minefield/combat.js';

export class TankMinefieldGame {
  constructor(options = {}) {
    this.mode = options.mode || 'single_player'; // 'single_player' | 'pvp'
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.dealCode = `TM-${Math.abs(this.seed).toString(36).toUpperCase()}`;

    const config = this.mode === 'pvp' ? TANK_RULES_V1.pvp : TANK_RULES_V1.singlePlayer;
    this.config = config;

    // Grid Initialization
    this.grid = new TankMineGrid({
      rows: config.rows,
      cols: config.cols,
      mineDensity: config.mineDensity,
      seed: this.seed,
      startPos: this.mode === 'pvp' ? config.spawnP1 : config.startPos,
      extractionPos: this.mode === 'pvp' ? null : config.extractionPos,
      startSafeRadius: config.startSafeRadius,
      isPvP: this.mode === 'pvp',
      spawnP2: this.mode === 'pvp' ? config.spawnP2 : null
    });

    // Player 1 Tank
    this.tank = new TankVehicle({
      id: 'player_1',
      name: options.playerName || 'Commander',
      presetId: options.presetId || 'US',
      row: this.grid.startPos.row,
      col: this.grid.startPos.col,
      facing: (this.mode === 'pvp' && config.spawnP1) ? config.spawnP1.facing : CARDINAL_DIRECTIONS.NORTH,
      armor: config.startingArmor,
      shells: this.mode === 'pvp' ? config.startingShells : 0
    });

    // Player 2 Opponent Tank (PvP only)
    this.opponentTank = null;
    if (this.mode === 'pvp') {
      this.opponentTank = new TankVehicle({
        id: 'player_2',
        name: options.opponentName || 'Opponent',
        presetId: options.opponentPresetId || 'USSR',
        row: config.spawnP2.row,
        col: config.spawnP2.col,
        facing: config.spawnP2.facing,
        armor: config.startingArmor,
        shells: config.startingShells
      });
    }

    // Planned Route Navigation
    this.activePlannedRoute = null;

    // Game Lifecycle State
    this.state = {
      score: 0,
      moves: 0,
      scans: 0,
      minesDetonated: 0,
      gameOver: false,
      won: false,
      roundOutcome: 'in_progress', // 'in_progress' | 'victory' | 'defeat' | 'draw'
      roundEndReason: null, // 'extracted' | 'armor_depleted' | 'shell_destroyed' | 'timeout'
      timeRemainingSec: this.mode === 'pvp' ? config.roundDurationSec : 0,
      lastEvent: null // For visual feedback triggers (e.g. { type: 'mine_explosion', row, col })
    };

    // Events log
    this.actionLog = [];
  }

  // --------------------------------------------------------------------------
  // MOVEMENT CONTROLS
  // --------------------------------------------------------------------------

  turnLeft() {
    if (this.state.gameOver || !this.tank.isAlive) return false;
    this.tank.turnLeft();
    this.state.lastEvent = { type: 'turn', direction: 'left', facing: this.tank.facing };
    return true;
  }

  turnRight() {
    if (this.state.gameOver || !this.tank.isAlive) return false;
    this.tank.turnRight();
    this.state.lastEvent = { type: 'turn', direction: 'right', facing: this.tank.facing };
    return true;
  }

  moveAdvance() {
    if (this.state.gameOver || !this.tank.isAlive) return false;
    const target = this.tank.getCellAhead(1);
    return this._executeStepTo(target.row, target.col, 'advance');
  }

  moveReverse() {
    if (this.state.gameOver || !this.tank.isAlive) return false;
    const target = this.tank.getCellBehind(1);
    return this._executeStepTo(target.row, target.col, 'reverse');
  }

  _executeStepTo(row, col, movementType = 'step') {
    // 1. Boundary & Obstacle checks
    if (!this.grid.isInBounds(row, col)) {
      this.state.lastEvent = { type: 'bump_boundary', row, col };
      return false;
    }

    const cell = this.grid.getCell(row, col);
    if (!cell || !cell.isTraversable()) {
      this.state.lastEvent = { type: 'bump_obstacle', row, col };
      return false;
    }

    // In PvP, prevent stepping into cell occupied by live opponent
    if (this.opponentTank && this.opponentTank.isAlive) {
      if (this.opponentTank.row === row && this.opponentTank.col === col) {
        this.state.lastEvent = { type: 'bump_tank', row, col };
        return false;
      }
    }

    // 2. Commit position
    this.tank.row = row;
    this.tank.col = col;
    this.tank.distanceTraveled++;
    this.state.moves++;

    // 3. Check for active mine detonation
    let hitMine = false;
    if (cell.hasActiveMine()) {
      hitMine = true;
      this.grid.detonateMine(row, col);
      this.tank.takeDamage(TANK_RULES_V1.damage.mineDetonationArmorLoss);
      this.tank.minesDetonated++;
      this.state.minesDetonated++;

      this.state.lastEvent = {
        type: 'mine_detonation',
        row,
        col,
        remainingArmor: this.tank.armor
      };
      this.actionLog.unshift(`⚠️ Mine detonated at [${row}, ${col}]! Armor: ${this.tank.armor}/3`);

      if (!this.tank.isAlive) {
        this._endGame('defeat', 'armor_depleted');
        return true;
      }
    } else {
      // Safe cell: reveal it and cascading regions
      this.grid.revealCell(row, col);
      this.state.score += 10;
      this.state.lastEvent = { type: movementType, row, col };
    }

    // 4. Check Single-Player Extraction Goal
    if (this.mode === 'single_player' && cell.isExtraction && this.tank.isAlive) {
      this.tank.isExtracted = true;
      this.state.score += 500;
      this._endGame('victory', 'extracted');
      this.actionLog.unshift(`🏆 Extraction zone reached! Mission accomplished!`);
      return true;
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // SCANNER & FLAGGING
  // --------------------------------------------------------------------------

  scanAhead() {
    if (this.state.gameOver || !this.tank.isAlive) return null;
    const target = this.tank.getCellAhead(1);
    if (!this.grid.isInBounds(target.row, target.col)) {
      return { valid: false, error: 'Out of bounds' };
    }

    this.tank.scansPerformed++;
    this.state.scans++;

    const scanResult = this.grid.scanCell(target.row, target.col);
    if (scanResult.foundMine) {
      // Auto-flag confirmed scanned mines for safety
      const cell = this.grid.getCell(target.row, target.col);
      if (!cell.isFlagged()) {
        this.grid.toggleFlag(target.row, target.col);
      }
      this.state.lastEvent = { type: 'scan_mine_detected', row: target.row, col: target.col };
      this.actionLog.unshift(`📡 Hazard detected! Mine confirmed at [${target.row}, ${target.col}]. Auto-flagged! 🚩`);
    } else {
      this.state.lastEvent = { type: 'scan_safe_revealed', row: target.row, col: target.col };
      this.actionLog.unshift(`📡 Scan clear! Cell [${target.row}, ${target.col}] revealed.`);
    }

    return scanResult;
  }

  toggleFlagAhead() {
    if (this.state.gameOver || !this.tank.isAlive) return false;
    const target = this.tank.getCellAhead(1);
    if (!this.grid.isInBounds(target.row, target.col)) return false;
    return this.toggleFlagAt(target.row, target.col);
  }

  toggleFlagAt(row, col) {
    if (this.state.gameOver) return false;
    const toggled = this.grid.toggleFlag(row, col);
    if (toggled) {
      const cell = this.grid.getCell(row, col);
      this.state.lastEvent = {
        type: cell.isFlagged() ? 'flag_placed' : 'flag_removed',
        row,
        col
      };
    }
    return toggled;
  }

  /**
   * Auto-flag all mathematically confirmed mines
   * @returns {number} Number of mines auto-flagged
   */
  autoFlagGuaranteedMines() {
    if (this.state.gameOver) return 0;

    const guaranteedMines = MinesweeperSolver.findAllGuaranteedMines(this.grid);
    let flaggedCount = 0;

    for (const mine of guaranteedMines) {
      const cell = this.grid.getCell(mine.row, mine.col);
      if (!cell.isFlagged()) {
        this.grid.toggleFlag(mine.row, mine.col);
        flaggedCount++;
      }
    }

    if (flaggedCount > 0) {
      this.state.lastEvent = {
        type: 'auto_flag_mines',
        count: flaggedCount
      };
      this.actionLog.unshift(`🚩 Auto-flagged ${flaggedCount} confirmed mine(s) using logic solver!`);
    }

    return flaggedCount;
  }

  /**
   * Reveal all mathematically confirmed safe cells
   * @returns {number} Number of safe cells revealed
   */
  autoRevealSafeCells() {
    if (this.state.gameOver || !this.tank.isAlive) return 0;

    const safeCells = MinesweeperSolver.findAllSafeCells(this.grid);
    let revealedCount = 0;

    for (const safe of safeCells) {
      const cell = this.grid.getCell(safe.row, safe.col);
      if (!cell.isRevealed()) {
        this.grid.revealCell(safe.row, safe.col);
        revealedCount++;
        this.state.score += 10;
      }
    }

    if (revealedCount > 0) {
      this.state.lastEvent = {
        type: 'auto_reveal_safe',
        count: revealedCount
      };
      this.actionLog.unshift(`✨ Auto-revealed ${revealedCount} confirmed safe cell(s) using logic solver!`);
    }

    return revealedCount;
  }

  // --------------------------------------------------------------------------
  // SAFE ROUTE NAVIGATION (MINIMAP ROUTING)
  // --------------------------------------------------------------------------

  planRouteTo(targetPos) {
    if (this.state.gameOver || !this.tank.isAlive) {
      return { success: false, reason: 'Game is not active' };
    }

    // Check if player clicked an adjacent unexplored cell for a risky move
    if (SafePathfinder.isAdjacentRiskyMove(this.grid, { row: this.tank.row, col: this.tank.col }, targetPos)) {
      return {
        success: true,
        isRiskyMove: true,
        path: [{ row: this.tank.row, col: this.tank.col }, targetPos]
      };
    }

    const routeResult = SafePathfinder.findSafePath(
      this.grid,
      { row: this.tank.row, col: this.tank.col },
      targetPos
    );

    if (routeResult.success) {
      // Omit first node which is current position
      this.activePlannedRoute = routeResult.path.slice(1);
    }

    return routeResult;
  }

  cancelPlannedRoute() {
    this.activePlannedRoute = null;
  }

  stepPlannedRoute() {
    if (!this.activePlannedRoute || this.activePlannedRoute.length === 0) {
      this.activePlannedRoute = null;
      return false;
    }

    const nextNode = this.activePlannedRoute.shift();
    const dRow = nextNode.row - this.tank.row;
    const dCol = nextNode.col - this.tank.col;

    // Face the required direction if not already facing
    if (dRow === -1 && dCol === 0) this.tank.facing = CARDINAL_DIRECTIONS.NORTH;
    else if (dRow === 1 && dCol === 0) this.tank.facing = CARDINAL_DIRECTIONS.SOUTH;
    else if (dRow === 0 && dCol === 1) this.tank.facing = CARDINAL_DIRECTIONS.EAST;
    else if (dRow === 0 && dCol === -1) this.tank.facing = CARDINAL_DIRECTIONS.WEST;

    return this._executeStepTo(nextNode.row, nextNode.col, 'advance');
  }

  // --------------------------------------------------------------------------
  // COMBAT & SHELL RESOLUTION
  // --------------------------------------------------------------------------

  firePlayerShell() {
    if (this.state.gameOver || !this.tank.isAlive) return null;

    const outcome = TankCombatResolver.fireShell(this.grid, this.tank, this.opponentTank);
    if (!outcome.success) return outcome;

    this.state.lastEvent = {
      type: 'fire_shell',
      isHit: outcome.isHit,
      targetCoord: outcome.targetCoord || outcome.impactCoord,
      detonatedMine: outcome.detonatedMine,
      isBoundary: outcome.isBoundaryImpact
    };

    if (outcome.isHit) {
      this.actionLog.unshift(`💥 DIRECT HIT! Enemy destroyed!`);
      this._endGame('victory', 'shell_destroyed');
    } else {
      this.actionLog.unshift(`💨 Missed! Shell impact at [${outcome.impactCoord.row}, ${outcome.impactCoord.col}].`);
    }

    return outcome;
  }

  fireOpponentShell() {
    if (this.state.gameOver || !this.opponentTank || !this.opponentTank.isAlive) return null;

    const outcome = TankCombatResolver.fireShell(this.grid, this.opponentTank, this.tank);
    if (!outcome.success) return outcome;

    this.state.lastEvent = {
      type: 'opponent_fire_shell',
      isHit: outcome.isHit,
      targetCoord: outcome.targetCoord || outcome.impactCoord,
      detonatedMine: outcome.detonatedMine
    };

    if (outcome.isHit) {
      this.actionLog.unshift(`💥 Your tank took a direct shell hit! Destroyed!`);
      this._endGame('defeat', 'shell_destroyed');
    }

    return outcome;
  }

  // --------------------------------------------------------------------------
  // TIMER & GAME OVER
  // --------------------------------------------------------------------------

  tickTimer(deltaSec = 1) {
    if (this.mode !== 'pvp' || this.state.gameOver) return;

    this.state.timeRemainingSec = Math.max(0, this.state.timeRemainingSec - deltaSec);
    if (this.state.timeRemainingSec <= 0) {
      this._resolveTimeout();
    }
  }

  _resolveTimeout() {
    if (this.tank.armor > this.opponentTank.armor) {
      this._endGame('victory', 'timeout');
    } else if (this.opponentTank.armor > this.tank.armor) {
      this._endGame('defeat', 'timeout');
    } else {
      this._endGame('draw', 'timeout');
    }
  }

  _endGame(outcome, reason) {
    this.state.gameOver = true;
    this.state.roundOutcome = outcome;
    this.state.won = outcome === 'victory';
    this.state.roundEndReason = reason;
    this.activePlannedRoute = null;
  }

  // --------------------------------------------------------------------------
  // P2P / REMOTE INTENTS (PVP MODE)
  // --------------------------------------------------------------------------

  applyRemoteIntent(action, payload = {}) {
    if (this.mode !== 'pvp' || !this.opponentTank) return;

    if (action === 'MOVE_ADVANCE') {
      const vec = this.opponentTank.getFacingVector();
      const target = { row: this.opponentTank.row + vec.dRow, col: this.opponentTank.col + vec.dCol };
      if (this.grid.isInBounds(target.row, target.col)) {
        this.opponentTank.row = target.row;
        this.opponentTank.col = target.col;
        const cell = this.grid.getCell(target.row, target.col);
        if (cell && cell.hasActiveMine()) {
          this.grid.detonateMine(target.row, target.col);
          this.opponentTank.takeDamage(1);
          if (!this.opponentTank.isAlive) {
            this._endGame('victory', 'armor_depleted');
          }
        }
      }
    } else if (action === 'MOVE_REVERSE') {
      const vec = this.opponentTank.getFacingVector();
      const target = { row: this.opponentTank.row - vec.dRow, col: this.opponentTank.col - vec.dCol };
      if (this.grid.isInBounds(target.row, target.col)) {
        this.opponentTank.row = target.row;
        this.opponentTank.col = target.col;
        const cell = this.grid.getCell(target.row, target.col);
        if (cell && cell.hasActiveMine()) {
          this.grid.detonateMine(target.row, target.col);
          this.opponentTank.takeDamage(1);
          if (!this.opponentTank.isAlive) {
            this._endGame('victory', 'armor_depleted');
          }
        }
      }
    } else if (action === 'TURN_LEFT') {
      this.opponentTank.turnLeft();
    } else if (action === 'TURN_RIGHT') {
      this.opponentTank.turnRight();
    } else if (action === 'FIRE_SHELL') {
      this.fireOpponentShell();
    }
  }

  /**
   * Tactical hint engine for Pedagogical Coach & In-Game Hint button
   */
  getTacticalHint() {
    if (this.state.gameOver) {
      return { message: "Mission concluded. Deploy again to launch a new operation!" };
    }

    if (!this.tank.isAlive) {
      return { message: "Tank neutralized. Start a new mission." };
    }

    // PvP Mode Firing Line Check
    if (this.mode === 'pvp' && this.opponentTank && this.opponentTank.isAlive) {
      if (this.tank.shells > 0) {
        const canHitDirect = TankCombatResolver.canHitTargetDirect(this.tank, this.opponentTank, this.grid);
        if (canHitDirect) {
          return {
            message: "🎯 TARGET ACQUIRED! Enemy tank directly in your crosshairs. Press ENTER to fire your 105mm AP shell!",
            action: 'FIRE'
          };
        }
      }
    }

    // Active Route Guidance
    if (this.activePlannedRoute && this.activePlannedRoute.length > 0) {
      return {
        message: `Planned Safe Route: ${this.activePlannedRoute.length} steps to target. Press W or Click 'Step Forward'!`,
        action: 'ROUTE_FOLLOW'
      };
    }

    const aheadPos = this.tank.getCellAhead();

    // Check perimeter boundary
    if (!this.grid.isInBounds(aheadPos.row, aheadPos.col)) {
      return {
        message: "Perimeter boundary ahead! Rotate your hull Left (A) or Right (D) to realign with the operational zone.",
        action: 'TURN'
      };
    }

    const aheadCell = this.grid.getCell(aheadPos.row, aheadPos.col);

    // Ahead cell already flagged
    if (aheadCell.isFlagged()) {
      return {
        message: "Cell ahead is flagged as a live hazard (⚑). Turn Left (A) or Right (D) to navigate around it.",
        action: 'AVOID'
      };
    }

    // Ahead cell already revealed
    if (aheadCell.isRevealed()) {
      if (aheadCell.hasActiveMine()) {
        return {
          message: "⚠️ ACTIVE MINE AHEAD! Do not advance. Turn away or flag this sector.",
          action: 'DANGER'
        };
      }
      return {
        message: "Sector ahead is confirmed safe and clear. Advance forward (W / ▲)!",
        action: 'ADVANCE'
      };
    }

    // Advanced Minesweeper Deduction using mathematical solver
    const analysis = MinesweeperSolver.analyzeCell(this.grid, aheadPos.row, aheadPos.col);

    if (analysis.confidence === 1.0) {
      if (analysis.isSafe) {
        return {
          message: `🧮 Advanced Logic: Cell ahead is 100% SAFE! ${analysis.reason}. Advance forward (W)!`,
          action: 'SAFE_ADVANCE',
          analysis
        };
      } else if (analysis.isMine) {
        return {
          message: `⚠️ Advanced Logic: Cell ahead is CONFIRMED MINE! ${analysis.reason}. Flag it with [F] or turn away!`,
          action: 'FLAG_HAZARD',
          analysis
        };
      }
    }

    // Check if there are any guaranteed safe moves nearby
    const safeCells = MinesweeperSolver.findAllSafeCells(this.grid);
    if (safeCells.length > 0) {
      // Find closest safe cell
      let closestSafe = null;
      let minDist = Infinity;
      for (const safe of safeCells) {
        const dist = Math.abs(safe.row - this.tank.row) + Math.abs(safe.col - this.tank.col);
        if (dist < minDist) {
          minDist = dist;
          closestSafe = safe;
        }
      }

      return {
        message: `💡 Logic Solver: Found ${safeCells.length} guaranteed safe cell(s). Closest at [${closestSafe.row},${closestSafe.col}] (${minDist} moves away). Click on minimap to route!`,
        action: 'ROUTE_TO_SAFE',
        safeCells,
        closestSafe
      };
    }

    // Check for guaranteed mines that should be flagged
    const guaranteedMines = MinesweeperSolver.findAllGuaranteedMines(this.grid);
    if (guaranteedMines.length > 0) {
      return {
        message: `🚩 Logic Solver: Found ${guaranteedMines.length} confirmed mine(s). Consider flagging them for safety!`,
        action: 'FLAG_MINES',
        guaranteedMines
      };
    }

    // Critical Armor Warning
    if (this.tank.armor === 1) {
      return {
        message: "CRITICAL: Armor plating at 1/3! Use Radar Scanner [SPACE] before advancing into any untested terrain.",
        action: 'SCAN_URGENT'
      };
    }

    // Recommend Scanner
    return {
      message: "Sector ahead is unmapped. Press Radar Scan [SPACE] to reveal hazard numbers safely without moving.",
      action: 'SCAN'
    };
  }
}
