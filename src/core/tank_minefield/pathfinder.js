/**
 * Tank Minefield: Iron Perimeter — Safe Pathfinding Engine
 * 
 * Invariants:
 * - Restricted exclusively to known, currently revealed safe cells.
 * - Never auto-routes through unexplored, unrevealed, or flagged cells.
 * - Clear diagnostics when no safe path exists.
 */

import { CELL_STATE } from './rules_config.js';

export class SafePathfinder {
  /**
   * Find shortest path between start and target through known revealed cells only.
   * Uses A* algorithm for optimal pathfinding with Manhattan distance heuristic.
   * @param {TankMineGrid} grid
   * @param {{row: number, col: number}} start
   * @param {{row: number, col: number}} target
   * @returns {{ success: boolean, path?: Array<{row: number, col: number}>, reason?: string }}
   */
  static findSafePath(grid, start, target) {
    if (!grid.isInBounds(start.row, start.col)) {
      return { success: false, reason: 'Start position out of bounds' };
    }
    if (!grid.isInBounds(target.row, target.col)) {
      return { success: false, reason: 'Target position out of bounds' };
    }

    if (start.row === target.row && start.col === target.col) {
      return { success: true, path: [start] };
    }

    const targetCell = grid.getCell(target.row, target.col);
    if (!targetCell) {
      return { success: false, reason: 'Target cell does not exist' };
    }

    if (targetCell.state !== CELL_STATE.REVEALED) {
      return {
        success: false,
        reason: 'Target cell is unexplored or flagged. Auto-routing is restricted to verified safe cells.'
      };
    }

    if (!targetCell.isTraversable()) {
      return { success: false, reason: 'Target cell is an impassable obstacle.' };
    }

    // A* pathfinding with Manhattan distance heuristic
    const heuristic = (row, col) => {
      return Math.abs(row - target.row) + Math.abs(col - target.col);
    };

    // Priority queue using array (for small grids this is efficient enough)
    const openSet = [{
      row: start.row,
      col: start.col,
      g: 0, // Distance from start
      h: heuristic(start.row, start.col), // Estimated distance to target
      f: heuristic(start.row, start.col), // g + h
      parent: null
    }];

    const closedSet = new Set();
    const gScores = new Map();
    gScores.set(`${start.row},${start.col}`, 0);

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();

      const currentKey = `${current.row},${current.col}`;

      // Check if we reached the target
      if (current.row === target.row && current.col === target.col) {
        // Reconstruct path
        const path = [];
        let node = current;
        while (node) {
          path.unshift({ row: node.row, col: node.col });
          node = node.parent;
        }
        return { success: true, path };
      }

      closedSet.add(currentKey);

      // Explore neighbors
      const cardinals = grid.getCardinalNeighbors(current.row, current.col);
      for (const neighbor of cardinals) {
        const neighborKey = `${neighbor.row},${neighbor.col}`;

        // Skip if already evaluated
        if (closedSet.has(neighborKey)) continue;

        // Path must consist ONLY of revealed, traversable cells
        if (neighbor.state !== CELL_STATE.REVEALED || !neighbor.isTraversable()) {
          continue;
        }

        // Calculate tentative g score (cost to reach this neighbor)
        const tentativeG = current.g + 1;

        // Check if this path to neighbor is better than any previous one
        const existingG = gScores.get(neighborKey);
        if (existingG === undefined || tentativeG < existingG) {
          gScores.set(neighborKey, tentativeG);

          const h = heuristic(neighbor.row, neighbor.col);
          const neighborNode = {
            row: neighbor.row,
            col: neighbor.col,
            g: tentativeG,
            h: h,
            f: tentativeG + h,
            parent: current
          };

          // Remove old entry if exists (to update with better score)
          const existingIndex = openSet.findIndex(n => n.row === neighbor.row && n.col === neighbor.col);
          if (existingIndex >= 0) {
            openSet.splice(existingIndex, 1);
          }

          openSet.push(neighborNode);
        }
      }
    }

    return {
      success: false,
      reason: 'No connected safe path found. Unexplored terrain or obstacles block the route.'
    };
  }

  /**
   * Check if a destination is immediately adjacent and unexplored (deliberate risky move)
   */
  static isAdjacentRiskyMove(grid, currentPos, targetPos) {
    if (!grid.isInBounds(targetPos.row, targetPos.col)) return false;
    const targetCell = grid.getCell(targetPos.row, targetPos.col);
    if (!targetCell || targetCell.state === CELL_STATE.REVEALED || !targetCell.isTraversable()) {
      return false;
    }

    const dRow = Math.abs(currentPos.row - targetPos.row);
    const dCol = Math.abs(currentPos.col - targetPos.col);

    // Cardinal adjacency only (distance 1, no diagonal)
    return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1);
  }
}
