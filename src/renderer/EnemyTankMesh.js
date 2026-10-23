/**
 * Enemy Tank Mesh - 3D Opponent Vehicle for PvP Arena Duel
 *
 * Responsibilities:
 * - Renders a complete 3D battle tank (chassis, treads, sloped armor hull, rotating turret, 105mm gun).
 * - Displays authentic faction paint schemes and insignias (USSR Red Star, UN Roundel, US Star, DPRK Roundel).
 * - Dynamically rotates its turret to track and aim at the player's tank in real-time.
 * - Transitions into a charred, burning destroyed state upon elimination (popped turret, fire, billowing smoke).
 */

import * as THREE from 'three';
import { TANK_PRESETS, CARDINAL_DIRECTIONS } from '../core/tank_minefield/rules_config.js';

export class EnemyTankMesh {
  constructor(scene, coordinator, opponentTank) {
    this.scene = scene;
    this.coordinator = coordinator;
    this.tank = opponentTank;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.isDestroyed = false;
    this.fireParticles = [];

    this._buildMesh();
    this.sync(opponentTank);
  }

  _buildMesh() {
    const preset = TANK_PRESETS[this.tank.presetId] || TANK_PRESETS.USSR;
    const armorColor = new THREE.Color(preset.primaryColor || 0x2e4632);

    // 1. Lower Chassis & Treads
    const treadGeo = new THREE.BoxGeometry(0.7, 0.7, 5.2);
    const treadMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.85,
      roughness: 0.55
    });

    const leftTread = new THREE.Mesh(treadGeo, treadMat);
    leftTread.position.set(-1.8, 0.35, 0);
    leftTread.castShadow = true;
    leftTread.receiveShadow = true;
    this.group.add(leftTread);

    const rightTread = new THREE.Mesh(treadGeo, treadMat);
    rightTread.position.set(1.8, 0.35, 0);
    rightTread.castShadow = true;
    rightTread.receiveShadow = true;
    this.group.add(rightTread);

    // 2. Main Armored Hull
    const hullGeo = new THREE.BoxGeometry(3.0, 0.9, 4.8);
    this.hullMat = new THREE.MeshStandardMaterial({
      color: armorColor,
      metalness: 0.7,
      roughness: 0.4
    });
    this.hullMesh = new THREE.Mesh(hullGeo, this.hullMat);
    this.hullMesh.position.set(0, 0.85, 0);
    this.hullMesh.castShadow = true;
    this.hullMesh.receiveShadow = true;
    this.group.add(this.hullMesh);

    // Glacis Sloped Front Plate
    const frontPlateGeo = new THREE.BoxGeometry(2.8, 0.4, 1.4);
    const frontPlate = new THREE.Mesh(frontPlateGeo, this.hullMat);
    frontPlate.position.set(0, 0.95, -2.1);
    frontPlate.rotation.x = 0.35;
    this.group.add(frontPlate);

    // 3. Rotating Turret Assembly
    this.turretGroup = new THREE.Group();
    this.turretGroup.position.set(0, 1.45, -0.2);

    const turretDomeGeo = new THREE.CylinderGeometry(1.3, 1.5, 0.75, 16);
    this.turretMat = new THREE.MeshStandardMaterial({
      color: armorColor,
      metalness: 0.7,
      roughness: 0.35
    });
    this.turretDome = new THREE.Mesh(turretDomeGeo, this.turretMat);
    this.turretDome.castShadow = true;
    this.turretGroup.add(this.turretDome);

    // 105mm Main Cannon Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.8, 16);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.85,
      roughness: 0.3
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0, 0.15, -2.4);
    barrel.castShadow = true;
    this.turretGroup.add(barrel);

    // Muzzle Brake
    const muzzleGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
    muzzle.position.set(0, 0.15, -4.3);
    this.turretGroup.add(muzzle);

    // Commander Cupola
    const cupolaGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12);
    const cupola = new THREE.Mesh(cupolaGeo, barrelMat);
    cupola.position.set(0.6, 0.45, 0.3);
    this.turretGroup.add(cupola);

    // Faction Emblem on Turret Sides
    this._addTurretInsignia(preset);

    this.group.add(this.turretGroup);

    // Burning Damage Light (Active upon destruction)
    this.fireLight = new THREE.PointLight(0xff4400, 0, 20);
    this.fireLight.position.set(0, 2.2, 0);
    this.group.add(this.fireLight);
  }

  _addTurretInsignia(preset) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = preset.accentColor || '#ef4444';
    ctx.font = 'bold 84px "Cinzel", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbol = preset.insignia ? preset.insignia.split(' ')[0] : '★';
    ctx.fillText(symbol, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const decalGeo = new THREE.PlaneGeometry(0.7, 0.7);
    const decalMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const leftDecal = new THREE.Mesh(decalGeo, decalMat);
    leftDecal.position.set(-1.42, 0.1, 0);
    leftDecal.rotation.y = -Math.PI / 2;
    this.turretGroup.add(leftDecal);

    const rightDecal = new THREE.Mesh(decalGeo, decalMat);
    rightDecal.position.set(1.42, 0.1, 0);
    rightDecal.rotation.y = Math.PI / 2;
    this.turretGroup.add(rightDecal);
  }

  sync(opponentTank) {
    if (!opponentTank) return;
    this.tank = opponentTank;

    const worldPos = this.coordinator.gridToWorld(opponentTank.row, opponentTank.col);
    this.group.position.copy(worldPos);

    // Hull orientation based on tank facing
    const facingAngles = {
      [CARDINAL_DIRECTIONS.NORTH]: 0,
      [CARDINAL_DIRECTIONS.EAST]: -Math.PI / 2,
      [CARDINAL_DIRECTIONS.SOUTH]: Math.PI,
      [CARDINAL_DIRECTIONS.WEST]: Math.PI / 2
    };
    this.group.rotation.y = facingAngles[opponentTank.facing] || 0;

    // Check Destruction
    if (!opponentTank.isAlive && !this.isDestroyed) {
      this.triggerDestruction();
    }
  }

  triggerDestruction() {
    this.isDestroyed = true;

    // Pop and tilt turret
    this.turretGroup.position.set(0.3, 1.65, 0.2);
    this.turretGroup.rotation.z = 0.45;
    this.turretGroup.rotation.x = -0.25;

    // Char armor materials
    if (this.hullMat) this.hullMat.color.set(0x18181b);
    if (this.turretMat) this.turretMat.color.set(0x18181b);

    // Activate flickering fire point light
    this.fireLight.intensity = 4.0;
  }

  update(time, deltaTime, playerWorldPos) {
    // Dynamically aim turret at player's tank if alive
    if (!this.isDestroyed && playerWorldPos) {
      const turretWorldPos = new THREE.Vector3();
      this.turretGroup.getWorldPosition(turretWorldPos);

      const dx = playerWorldPos.x - turretWorldPos.x;
      const dz = playerWorldPos.z - turretWorldPos.z;
      const targetAngle = Math.atan2(dx, dz) - this.group.rotation.y - Math.PI;

      // Smooth turret rotation
      let diff = targetAngle - this.turretGroup.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.turretGroup.rotation.y += diff * Math.min(1.0, deltaTime * 4.0);
    }

    // Animate fire and smoke if destroyed
    if (this.isDestroyed) {
      this.fireLight.intensity = 3.0 + Math.sin(time * 12.0) * 1.5;

      // Billow rising smoke particle
      if (Math.random() < 0.4) {
        const pGeo = new THREE.SphereGeometry(0.25 + Math.random() * 0.3, 8, 8);
        const isFire = Math.random() < 0.35;
        const pMat = new THREE.MeshBasicMaterial({
          color: isFire ? 0xff6600 : 0x27272a,
          transparent: true,
          opacity: 0.85
        });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.set(
          this.group.position.x + (Math.random() - 0.5) * 1.2,
          1.8 + Math.random() * 0.4,
          this.group.position.z + (Math.random() - 0.5) * 1.2
        );
        this.scene.add(p);
        this.fireParticles.push({
          mesh: p,
          vy: 2.0 + Math.random() * 2.5,
          age: 0,
          lifetime: 0.9 + Math.random() * 0.6
        });
      }

      // Update fire particles
      for (let i = this.fireParticles.length - 1; i >= 0; i--) {
        const fp = this.fireParticles[i];
        fp.age += deltaTime;
        if (fp.age >= fp.lifetime) {
          this.scene.remove(fp.mesh);
          fp.mesh.material.dispose();
          fp.mesh.geometry.dispose();
          this.fireParticles.splice(i, 1);
        } else {
          fp.mesh.position.y += fp.vy * deltaTime;
          const prog = fp.age / fp.lifetime;
          fp.mesh.scale.multiplyScalar(1.0 + deltaTime * 1.5);
          fp.mesh.material.opacity = 0.85 * (1.0 - prog);
        }
      }
    }
  }

  destroy() {
    this.scene.remove(this.group);
    for (const fp of this.fireParticles) {
      this.scene.remove(fp.mesh);
      fp.mesh.material.dispose();
      fp.mesh.geometry.dispose();
    }
    this.fireParticles = [];
  }
}
