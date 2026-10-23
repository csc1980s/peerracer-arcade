/**
 * Tank Minefield: Iron Perimeter — Tank Vehicle Model
 * 
 * Features:
 * - Four selectable tank presets: US, UN, USSR, North Korea.
 * - Exact cardinal grid coordinates & 90-degree discrete facings.
 * - Armor points and one-shot shell ammunition tracking.
 * - Advance, reverse, and turn kinematics.
 */

import { CARDINAL_DIRECTIONS, DIRECTION_VECTORS, TANK_PRESETS, TANK_RULES_V1 } from './rules_config.js';

export class TankVehicle {
  constructor(options = {}) {
    this.id = options.id || 'player_1';
    this.name = options.name || 'Player 1';
    this.presetId = options.presetId || 'US';
    this.preset = TANK_PRESETS[this.presetId] || TANK_PRESETS.US;

    this.row = options.row !== undefined ? options.row : 0;
    this.col = options.col !== undefined ? options.col : 0;
    this.facing = options.facing !== undefined ? options.facing : CARDINAL_DIRECTIONS.NORTH;

    this.armor = options.armor !== undefined ? options.armor : TANK_RULES_V1.singlePlayer.startingArmor;
    this.maxArmor = this.armor;
    this.shells = options.shells !== undefined ? options.shells : 0; // 0 in single-player, 1 in PvP
    this.maxShells = this.shells;

    this.isAlive = true;
    this.isExtracted = false;
    this.distanceTraveled = 0;
    this.minesDetonated = 0;
    this.scansPerformed = 0;
  }

  setPreset(presetId) {
    if (TANK_PRESETS[presetId]) {
      this.presetId = presetId;
      this.preset = TANK_PRESETS[presetId];
    }
  }

  getFacingVector() {
    return DIRECTION_VECTORS[this.facing];
  }

  turnLeft() {
    if (!this.isAlive) return this.facing;
    this.facing = (this.facing + 3) % 4;
    return this.facing;
  }

  turnRight() {
    if (!this.isAlive) return this.facing;
    this.facing = (this.facing + 1) % 4;
    return this.facing;
  }

  getCellAhead(distance = 1) {
    const vec = this.getFacingVector();
    return {
      row: this.row + vec.dRow * distance,
      col: this.col + vec.dCol * distance
    };
  }

  getCellBehind(distance = 1) {
    const vec = this.getFacingVector();
    return {
      row: this.row - vec.dRow * distance,
      col: this.col - vec.dCol * distance
    };
  }

  takeDamage(amount = 1) {
    this.armor = Math.max(0, this.armor - amount);
    if (this.armor <= 0) {
      this.isAlive = false;
    }
    return this.armor;
  }

  hasAmmo() {
    return this.shells > 0;
  }

  consumeShell() {
    if (this.shells <= 0) return false;
    this.shells--;
    return true;
  }
}
