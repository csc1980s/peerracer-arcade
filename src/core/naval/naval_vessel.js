/**
 * Naval Vessel - Ship Entity Class
 *
 * Represents a single ship in the fleet (player or enemy)
 */

import { SHIP_CLASSES } from './rules_config.js';

export class NavalVessel {
  constructor(shipType, faction = 'player') {
    const template = SHIP_CLASSES[shipType];
    if (!template) {
      throw new Error(`Unknown ship type: ${shipType}`);
    }

    this.id = `${faction}_${shipType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = shipType;
    this.faction = faction; // 'player' or 'enemy'

    // Copy stats from template
    this.name = template.name;
    this.displayName = template.displayName;
    this.length = template.length;
    this.maxHP = template.maxHP;
    this.currentHP = template.maxHP;
    this.firepower = template.firepower;
    this.speed = template.speed;
    this.special = template.special;
    this.weapons = [...template.weapons];
    this.color = template.color;
    this.symbol = template.symbol;
    this.description = template.description;

    // State
    this.gridPosition = null; // Set when placed on grid
    this.damagedSections = []; // Which cells have been hit
    this.status = 'operational'; // 'operational', 'damaged', 'sunk'

    // Combat stats
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.damageDealt = 0;
  }

  // Take damage
  takeDamage(amount) {
    this.currentHP -= amount;

    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.status = 'sunk';
      this.description = 'VESSEL DESTROYED';
    } else if (this.currentHP <= this.maxHP / 2) {
      this.status = 'damaged';
      this.description = 'Heavy Damage - Systems Critical';
    } else {
      this.status = 'damaged';
      this.description = 'Damage Sustained';
    }

    return this.currentHP;
  }

  // Repair damage
  repair(amount) {
    if (this.status === 'sunk') return false;

    this.currentHP = Math.min(this.currentHP + amount, this.maxHP);

    if (this.currentHP === this.maxHP) {
      this.status = 'operational';
      this.description = 'All Systems Operational';
    }

    return true;
  }

  // Check if sunk
  isSunk() {
    return this.status === 'sunk' || this.currentHP <= 0;
  }

  // Check if damaged
  isDamaged() {
    return this.currentHP < this.maxHP;
  }

  // Get health percentage
  getHealthPercent() {
    return (this.currentHP / this.maxHP) * 100;
  }

  // Record a shot fired
  recordShot(hit, damage = 0) {
    this.shotsFired++;
    if (hit) {
      this.shotsHit++;
      this.damageDealt += damage;
    }
  }

  // Get accuracy
  getAccuracy() {
    if (this.shotsFired === 0) return 0;
    return (this.shotsHit / this.shotsFired) * 100;
  }

  // Get ship info for display
  getInfo() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      displayName: this.displayName,
      faction: this.faction,
      hp: `${this.currentHP}/${this.maxHP}`,
      status: this.status,
      description: this.description,
      length: this.length,
      color: this.color,
      symbol: this.symbol,
      position: this.gridPosition,
      accuracy: this.getAccuracy().toFixed(1) + '%'
    };
  }

  // Serialize for save/network
  serialize() {
    return {
      id: this.id,
      type: this.type,
      faction: this.faction,
      currentHP: this.currentHP,
      status: this.status,
      gridPosition: this.gridPosition,
      damagedSections: this.damagedSections,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      damageDealt: this.damageDealt
    };
  }

  // Restore from serialized data
  static deserialize(data) {
    const vessel = new NavalVessel(data.type, data.faction);
    vessel.id = data.id;
    vessel.currentHP = data.currentHP;
    vessel.status = data.status;
    vessel.gridPosition = data.gridPosition;
    vessel.damagedSections = data.damagedSections;
    vessel.shotsFired = data.shotsFired;
    vessel.shotsHit = data.shotsHit;
    vessel.damageDealt = data.damageDealt;

    // Update description based on status
    if (vessel.isSunk()) {
      vessel.description = 'VESSEL DESTROYED';
    } else if (vessel.isDamaged()) {
      vessel.description = 'Damage Sustained';
    }

    return vessel;
  }
}
