/**
 * Tank Minefield: Iron Perimeter — Combat & Ballistics Engine
 * 
 * Strict Rules:
 * - One-shot rule: exactly ONE shell per round. Miss consumes shell.
 * - Hit condition: Enemy must be directly ahead in the firing row/col at distance 1 or 2 cells.
 * - Diagonal targets do NOT count. Obstacles block fire.
 * - Direct hit destroys target tank.
 * - Custom Miss Behavior:
 *   - Shell impacts the immediately adjacent cell in firing direction (distance = 1).
 *   - The miss must NOT travel 2 cells before exploding.
 *   - Creates a persistent shell-impact crater on that adjacent cell.
 *   - If adjacent cell has a live mine, that mine detonates and is consumed.
 *   - Boundary firing impacts boundary safely.
 */

import { CRATER_TYPE, TANK_RULES_V1 } from './rules_config.js';

export class TankCombatResolver {
  /**
   * Check if shooter can hit target with a direct shot (no obstacles blocking)
   * @param {TankVehicle} shooterTank
   * @param {TankVehicle} targetTank
   * @param {TankMineGrid} grid
   * @returns {boolean} True if target is in firing line
   */
  static canHitTargetDirect(shooterTank, targetTank, grid) {
    if (!shooterTank.isAlive || !targetTank || !targetTank.isAlive) {
      return false;
    }

    const facingVec = shooterTank.getFacingVector();
    const cell1Ahead = { row: shooterTank.row + facingVec.dRow, col: shooterTank.col + facingVec.dCol };
    const cell2Ahead = { row: shooterTank.row + facingVec.dRow * 2, col: shooterTank.col + facingVec.dCol * 2 };

    // Check 1 cell ahead
    if (targetTank.row === cell1Ahead.row && targetTank.col === cell1Ahead.col) {
      const cell1 = grid.getCell(cell1Ahead.row, cell1Ahead.col);
      if (cell1 && !cell1.isObstacle) {
        return true;
      }
    }

    // Check 2 cells ahead (only if cell 1 is not blocking)
    if (targetTank.row === cell2Ahead.row && targetTank.col === cell2Ahead.col) {
      const cell1 = grid.getCell(cell1Ahead.row, cell1Ahead.col);
      const cell2 = grid.getCell(cell2Ahead.row, cell2Ahead.col);
      if (cell1 && !cell1.isObstacle && cell2 && !cell2.isObstacle) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolves firing a shell from shooterTank towards an optional targetTank.
   * @param {TankMineGrid} grid
   * @param {TankVehicle} shooterTank
   * @param {TankVehicle|null} targetTank
   * @returns {Object} Combat outcome report
   */
  static fireShell(grid, shooterTank, targetTank = null) {
    if (!shooterTank.hasAmmo()) {
      return { success: false, error: 'NO_AMMO', message: 'Shell already spent! One shot per round.' };
    }

    shooterTank.consumeShell();

    const facingVec = shooterTank.getFacingVector();
    const cell1Ahead = { row: shooterTank.row + facingVec.dRow, col: shooterTank.col + facingVec.dCol };
    const cell2Ahead = { row: shooterTank.row + facingVec.dRow * 2, col: shooterTank.col + facingVec.dCol * 2 };

    // 1. Check if target tank is valid hit (distance 1 or 2 directly ahead with no obstacle blocking)
    let isHit = false;
    let hitDistance = 0;

    if (targetTank && targetTank.isAlive) {
      // Check 1 cell ahead
      if (targetTank.row === cell1Ahead.row && targetTank.col === cell1Ahead.col) {
        const cell1 = grid.getCell(cell1Ahead.row, cell1Ahead.col);
        if (cell1 && !cell1.isObstacle) {
          isHit = true;
          hitDistance = 1;
        }
      }
      // Check 2 cells ahead (only if cell 1 is not blocking)
      else if (targetTank.row === cell2Ahead.row && targetTank.col === cell2Ahead.col) {
        const cell1 = grid.getCell(cell1Ahead.row, cell1Ahead.col);
        const cell2 = grid.getCell(cell2Ahead.row, cell2Ahead.col);
        if (cell1 && !cell1.isObstacle && cell2 && !cell2.isObstacle) {
          isHit = true;
          hitDistance = 2;
        }
      }
    }

    if (isHit) {
      targetTank.takeDamage(TANK_RULES_V1.damage.directShellHitArmorLoss);
      return {
        success: true,
        isHit: true,
        targetTankDestroyed: true,
        hitDistance,
        targetCoord: hitDistance === 1 ? cell1Ahead : cell2Ahead,
        shooterId: shooterTank.id,
        targetId: targetTank.id,
        message: 'Direct hit! Enemy tank destroyed!'
      };
    }

    // 2. Miss Behavior: Animate shell impacting the immediately adjacent cell in firing direction
    const isAdjacentInBounds = grid.isInBounds(cell1Ahead.row, cell1Ahead.col);
    let detonatedMine = false;
    let impactCell = null;

    if (isAdjacentInBounds) {
      const impactResult = grid.impactShell(cell1Ahead.row, cell1Ahead.col);
      impactCell = impactResult.cell;
      detonatedMine = impactResult.detonatedMine;
    }

    return {
      success: true,
      isHit: false,
      hitDistance: 0,
      impactDistance: 1, // Must be exactly 1 cell ahead
      impactCoord: cell1Ahead,
      isBoundaryImpact: !isAdjacentInBounds,
      detonatedMine,
      impactCell,
      shooterId: shooterTank.id,
      message: detonatedMine
        ? 'Missed target! Shell detonated a hidden mine on adjacent cell!'
        : (isAdjacentInBounds ? 'Missed target! Shell impacted adjacent ground, leaving a crater.' : 'Missed target! Shell struck perimeter boundary barrier.')
    };
  }
}
