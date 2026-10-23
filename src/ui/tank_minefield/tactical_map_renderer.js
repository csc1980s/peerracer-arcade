/**
 * Tank Minefield: Iron Perimeter — Tactical Map (Minimap) Renderer
 * 
 * Features:
 * - Scalable grid minimap rendering to Canvas.
 * - Clear distinction of unexplored fog, safe revealed paths, clues, flags,
 *   scanned mines, persistent craters, extraction beacon, and player tank.
 * - Visual neon path overlay for planned safe routes.
 * - Interactive coordinate lookup for click-to-route navigation.
 * - Expandable full-screen tactical map view mode.
 */

import { CARDINAL_DIRECTIONS, CELL_STATE, CRATER_TYPE } from '../../core/tank_minefield/rules_config.js';

export class TacticalMapRenderer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.isExpanded = false;

    this.tankSprite = new Image();
    this.tankSpriteLoaded = false;
    this.tankSprite.onload = () => { this.tankSpriteLoaded = true; };
    this.tankSprite.src = '/assets/tank_minefield/tank_topdown_sprite.png';
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(game, plannedRoute = null, selectedCell = null) {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!game || !game.grid) return;

    const grid = game.grid;
    const rows = grid.rows;
    const cols = grid.cols;

    // Background
    ctx.fillStyle = '#0c140f';
    ctx.fillRect(0, 0, width, height);

    // Compute cell dimensions to fit canvas
    const padding = 6;
    const availW = width - padding * 2;
    const availH = height - padding * 2;
    const cellSize = Math.min(availW / cols, availH / rows);
    const offsetX = padding + (availW - cellSize * cols) / 2;
    const offsetY = padding + (availH - cellSize * rows) / 2;

    this._lastLayout = { offsetX, offsetY, cellSize, rows, cols };

    // 1. Draw Grid Cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid.getCell(r, c);
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;

        this._renderCell(ctx, cell, x, y, cellSize);
      }
    }

    // 2. Draw Planned Route Overlay (Neon pathway)
    if (plannedRoute && plannedRoute.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = Math.max(2, cellSize * 0.18);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      const startX = offsetX + (game.tank.col + 0.5) * cellSize;
      const startY = offsetY + (game.tank.row + 0.5) * cellSize;
      ctx.moveTo(startX, startY);

      for (const node of plannedRoute) {
        const nodeX = offsetX + (node.col + 0.5) * cellSize;
        const nodeY = offsetY + (node.row + 0.5) * cellSize;
        ctx.lineTo(nodeX, nodeY);
      }
      ctx.stroke();

      // Destination target reticle
      const lastNode = plannedRoute[plannedRoute.length - 1];
      const destX = offsetX + (lastNode.col + 0.5) * cellSize;
      const destY = offsetY + (lastNode.row + 0.5) * cellSize;
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(destX, destY, cellSize * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // 3. Draw Selected Cell Highlight (if any)
    if (selectedCell) {
      const sx = offsetX + selectedCell.col * cellSize;
      const sy = offsetY + selectedCell.row * cellSize;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);
    }

    // 4. Draw Opponent Tank (PvP mode, only when detected)
    if (game.opponentTank && game.opponentTank.isAlive) {
      // In PvP, show enemy if revealed cell or within proximity
      const dist = Math.abs(game.tank.row - game.opponentTank.row) + Math.abs(game.tank.col - game.opponentTank.col);
      const enemyCell = grid.getCell(game.opponentTank.row, game.opponentTank.col);
      const isDetected = enemyCell.isRevealed() || dist <= 4;

      if (isDetected) {
        const ex = offsetX + (game.opponentTank.col + 0.5) * cellSize;
        const ey = offsetY + (game.opponentTank.row + 0.5) * cellSize;
        this._renderTankMarker(ctx, ex, ey, cellSize, game.opponentTank.facing, '#ef4444', 'E');
      }
    }

    // 5. Draw Player Tank (Always visible)
    if (game.tank && game.tank.isAlive) {
      const px = offsetX + (game.tank.col + 0.5) * cellSize;
      const py = offsetY + (game.tank.row + 0.5) * cellSize;
      this._renderTankMarker(ctx, px, py, cellSize, game.tank.facing, '#22c55e', '▲');
    }

    // Outer Map Border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, cellSize * cols, cellSize * rows);
  }

  _renderCell(ctx, cell, x, y, size) {
    const isUnexplored = cell.state === CELL_STATE.UNEXPLORED;
    const isRevealed = cell.state === CELL_STATE.REVEALED;
    const isFlagged = cell.state === CELL_STATE.FLAGGED;

    // Fill Base
    if (isRevealed) {
      ctx.fillStyle = cell.isExtraction ? '#1e3a24' : '#17281d';
    } else {
      ctx.fillStyle = '#0a100c'; // Fog of war
    }
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    // Cell Grid Lines
    ctx.strokeStyle = isRevealed ? 'rgba(40, 70, 50, 0.6)' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);

    // Extraction Point Banner (Star)
    if (cell.isExtraction) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.max(10, size * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', x + size / 2, y + size / 2);
      return;
    }

    // Persistent Craters
    if (cell.crater !== CRATER_TYPE.NONE) {
      ctx.fillStyle = cell.crater === CRATER_TYPE.MINE_DETONATION ? '#18120c' : '#26201b';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cell.crater === CRATER_TYPE.MINE_DETONATION ? '#ff5722' : '#78716c';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Small crater marker
      ctx.fillStyle = '#f97316';
      ctx.font = `bold ${Math.max(8, size * 0.45)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('●', x + size / 2, y + size / 2);
      return;
    }

    // Flagged
    if (isFlagged) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.max(9, size * 0.55)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚑', x + size / 2, y + size / 2);
      return;
    }

    // Scanned Mine Hazard
    if (cell.isScannedMine) {
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${Math.max(9, size * 0.55)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', x + size / 2, y + size / 2);
      return;
    }

    // Revealed Clue Numbers
    if (isRevealed && cell.adjacentMines > 0) {
      const clueColors = [
        '#60a5fa', // 1: Blue
        '#4ade80', // 2: Green
        '#f87171', // 3: Red
        '#c084fc', // 4: Purple
        '#fb923c', // 5: Orange
        '#2dd4bf', // 6: Teal
        '#f43f5e', // 7: Crimson
        '#e2e8f0'  // 8: Silver
      ];
      ctx.fillStyle = clueColors[cell.adjacentMines - 1] || '#ffffff';
      ctx.font = `bold ${Math.max(9, size * 0.55)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.adjacentMines.toString(), x + size / 2, y + size / 2);
    }
  }

  _renderTankMarker(ctx, cx, cy, cellSize, facing, color, label) {
    const radius = Math.max(4, cellSize * 0.42);

    ctx.save();
    ctx.translate(cx, cy);

    // Rotate to match tank heading (0: N, 1: E, 2: S, 3: W)
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    ctx.rotate(angles[facing]);

    if (this.tankSpriteLoaded) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      const spriteSize = radius * 2.4;
      ctx.drawImage(this.tankSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.shadowBlur = 0;
    } else {
      // Outer Hull
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Directional Arrow Pointer
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -radius * 1.3); // Gun tip
      ctx.lineTo(radius * 0.6, radius * 0.7);
      ctx.lineTo(0, radius * 0.3);
      ctx.lineTo(-radius * 0.6, radius * 0.7);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  getCellFromScreenCoords(screenX, screenY) {
    if (!this._lastLayout) return null;
    const { offsetX, offsetY, cellSize, rows, cols } = this._lastLayout;

    const relX = screenX - offsetX;
    const relY = screenY - offsetY;

    if (relX < 0 || relY < 0 || relX >= cellSize * cols || relY >= cellSize * rows) {
      return null;
    }

    const col = Math.floor(relX / cellSize);
    const row = Math.floor(relY / cellSize);

    return { row, col };
  }
}
