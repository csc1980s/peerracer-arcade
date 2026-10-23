/**
 * Naval Vessel 3D Mesh Generator
 *
 * Procedurally generates low-poly 3D ship models for ocean viewport
 * Based on ship class (Carrier, Battleship, Cruiser, Submarine, Destroyer)
 */

import * as THREE from 'three';
import { SHIP_CLASSES } from '../core/naval/rules_config.js';

export class NavalVesselMesh extends THREE.Group {
  constructor(shipType, faction = 'player') {
    super();

    this.shipType = shipType;
    this.faction = faction;
    this.template = SHIP_CLASSES[shipType];

    if (!this.template) {
      console.error(`Unknown ship type: ${shipType}`);
      return;
    }

    this._buildShipMesh();
    this.bobOffset = Math.random() * Math.PI * 2; // Random bob phase
  }

  _buildShipMesh() {
    const length = this.template.length * 2; // Scale for visibility
    const color = this.faction === 'player' ? 0x4a5f5a : 0x6b3030;

    // Hull (main body)
    const hullGeo = new THREE.BoxGeometry(length * 0.8, 1.2, length * 0.3);
    const hullMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.3
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.5;
    this.add(hull);

    // Deck (top)
    const deckGeo = new THREE.BoxGeometry(length * 0.75, 0.2, length * 0.28);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a30,
      roughness: 0.9,
      metalness: 0.1
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 1.2;
    this.add(deck);

    // Superstructure (bridge/command tower)
    const bridgeGeo = new THREE.BoxGeometry(length * 0.25, 1.5, length * 0.2);
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x3d4f45,
      roughness: 0.8,
      metalness: 0.2
    });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 2.0, 0);
    this.add(bridge);

    // Bow (front pointed section)
    const bowGeo = new THREE.ConeGeometry(length * 0.15, length * 0.4, 4);
    bowGeo.rotateX(Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, hullMat);
    bow.position.set(length * 0.5, 0.5, 0);
    this.add(bow);

    // Ship-specific details
    if (this.shipType === 'CARRIER') {
      this._addCarrierDetails(length);
    } else if (this.shipType === 'BATTLESHIP') {
      this._addBattleshipDetails(length);
    } else if (this.shipType === 'SUBMARINE') {
      this._addSubmarineDetails(length);
    }

    // Faction marker (flag/symbol)
    const markerGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const markerColor = this.faction === 'player' ? 0x38bdf8 : 0xef4444;
    const markerMat = new THREE.MeshBasicMaterial({ color: markerColor });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 3.5, 0);
    this.add(marker);

    // Shadow plane (simple contact shadow)
    const shadowGeo = new THREE.PlaneGeometry(length, length * 0.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.1;
    this.add(shadow);
  }

  _addCarrierDetails(length) {
    // Flight deck (wide flat top)
    const flightDeckGeo = new THREE.BoxGeometry(length * 0.9, 0.15, length * 0.4);
    const flightDeckMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.95
    });
    const flightDeck = new THREE.Mesh(flightDeckGeo, flightDeckMat);
    flightDeck.position.y = 1.4;
    this.add(flightDeck);

    // Control tower (island)
    const towerGeo = new THREE.BoxGeometry(length * 0.15, 2.0, length * 0.15);
    const tower = new THREE.Mesh(towerGeo, new THREE.MeshStandardMaterial({ color: 0x4a5f5a }));
    tower.position.set(-length * 0.2, 2.5, 0);
    this.add(tower);
  }

  _addBattleshipDetails(length) {
    // Gun turrets (3 large turrets)
    for (let i = 0; i < 3; i++) {
      const turretGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.6, 8);
      const turretMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.6,
        roughness: 0.4
      });
      const turret = new THREE.Mesh(turretGeo, turretMat);
      turret.position.set((i - 1) * length * 0.25, 1.5, 0);
      this.add(turret);

      // Gun barrels
      const barrelGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, turretMat);
      barrel.position.set((i - 1) * length * 0.25, 1.8, 0.8);
      this.add(barrel);
    }
  }

  _addSubmarineDetails(length) {
    // Conning tower (sail)
    const sailGeo = new THREE.BoxGeometry(length * 0.2, 1.0, length * 0.15);
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a2a,
      metalness: 0.5
    });
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.set(0, 1.5, 0);
    this.add(sail);

    // Periscope
    const periscopeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const periscope = new THREE.Mesh(periscopeGeo, sailMat);
    periscope.position.set(0, 2.4, 0);
    this.add(periscope);
  }

  // Update bob animation
  update(time, deltaTime) {
    // Gentle rocking motion
    const bobSpeed = 0.8;
    const bobAmount = 0.15;
    this.position.y = Math.sin(time * bobSpeed + this.bobOffset) * bobAmount;

    // Slight pitch
    const pitchAmount = 0.03;
    this.rotation.x = Math.sin(time * bobSpeed * 1.3 + this.bobOffset) * pitchAmount;

    // Slight roll
    const rollAmount = 0.02;
    this.rotation.z = Math.cos(time * bobSpeed * 0.9 + this.bobOffset) * rollAmount;
  }

  // Set ship position on ocean grid
  setGridPosition(row, col, gridToWorldFunc) {
    const worldPos = gridToWorldFunc(row, col);
    this.position.x = worldPos.x;
    this.position.z = worldPos.z;
  }

  // Set ship heading (direction facing)
  setHeading(angle) {
    this.rotation.y = angle;
  }

  // Trigger destruction animation
  triggerDestruction() {
    // Simple sink animation
    const startY = this.position.y;
    const sinkDuration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / sinkDuration, 1);

      this.position.y = startY - progress * 5; // Sink 5 units down
      this.rotation.x = progress * Math.PI * 0.3; // Tilt forward
      this.rotation.z = Math.sin(progress * Math.PI) * 0.5; // Rock side to side

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.visible = false; // Hide when fully sunk
      }
    };

    animate();
  }

  dispose() {
    this.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
