/**
 * Infantry Skirmish Manager
 *
 * Responsibilities:
 * - Renders Friendly and Enemy 3D soldier squads at fortified perimeter redoubts.
 * - Dynamic combat animations: ducking cover, aiming, and firing small-arms bursts.
 * - Bright muzzle flashes and high-velocity tracer rounds crisscrossing the battlefield.
 * - Periodic grenade tosses with parabolic trajectories and ground explosion bursts.
 * - Harmless potshots at the player's armored tank: sparks deflect off heavy armor with NO damage.
 */

import * as THREE from 'three';

export class InfantrySkirmishManager {
  constructor(scene, coordinator) {
    this.scene = scene;
    this.coordinator = coordinator;

    const rows = coordinator.game?.grid?.rows || 12;
    const cols = coordinator.game?.grid?.cols || 12;
    this.cellSize = coordinator.options.cellSize || 10.0;
    this.gridWidth = cols * this.cellSize;
    this.gridHeight = rows * this.cellSize;
    this.gridCenterX = this.gridWidth / 2;
    this.gridCenterZ = this.gridHeight / 2;

    this.group = new THREE.Group();
    this.group.name = 'InfantrySkirmishGroup';
    this.scene.add(this.group);

    // Active projectiles & VFX
    this.tracers = [];
    this.grenades = [];
    this.particles = [];
    this.soldiers = [];

    this.lastGrenadeTime = 0;
    this.lastTankSparksTime = 0;

    this._initMaterials();
    this._spawnSoldiers();
  }

  _getHeight(x, z) {
    if (this.coordinator.battlefieldTerrain) {
      return this.coordinator.battlefieldTerrain.getHeightAt(x, z);
    }
    return 0;
  }

  _initMaterials() {
    // Friendly Allied Uniform: Olive Drab / Green Helmet / Blue squad markings
    this.friendlyUniformMat = new THREE.MeshStandardMaterial({
      color: 0x425838,
      roughness: 0.85,
      metalness: 0.1
    });
    this.friendlyHelmetMat = new THREE.MeshStandardMaterial({
      color: 0x2e3f28,
      roughness: 0.65,
      metalness: 0.35
    });

    // Enemy OpFor Uniform: Dark Charcoal Camo / Steel Helmet / Red squad markings
    this.enemyUniformMat = new THREE.MeshStandardMaterial({
      color: 0x2b2f33,
      roughness: 0.85,
      metalness: 0.1
    });
    this.enemyHelmetMat = new THREE.MeshStandardMaterial({
      color: 0x1d2124,
      roughness: 0.65,
      metalness: 0.4
    });

    // Equipment & Weapons
    this.gearMat = new THREE.MeshStandardMaterial({
      color: 0x181a1b,
      roughness: 0.7,
      metalness: 0.6
    });

    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0xc8987b,
      roughness: 0.9,
      metalness: 0.0
    });

    // Tracers & FX Materials
    this.tracerMaterial = new THREE.LineBasicMaterial({
      color: 0xffaa33,
      linewidth: 2,
      blending: THREE.AdditiveBlending
    });

    this.sparkMaterial = new THREE.PointsMaterial({
      color: 0xffea78,
      size: 0.4,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
  }

  // ============================================================================
  // PROCEDURAL 3D SOLDIER CREATION
  // ============================================================================

  _createSoldierMesh(isFriendly, isCrouching = false) {
    const soldier = new THREE.Group();
    const uMat = isFriendly ? this.friendlyUniformMat : this.enemyUniformMat;
    const hMat = isFriendly ? this.friendlyHelmetMat : this.enemyHelmetMat;

    // Legs / Boots
    const legGeo = new THREE.BoxGeometry(0.32, isCrouching ? 0.65 : 1.0, 0.35);
    const leftLeg = new THREE.Mesh(legGeo, uMat);
    leftLeg.position.set(-0.22, isCrouching ? 0.32 : 0.5, 0);
    soldier.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, uMat);
    rightLeg.position.set(0.22, isCrouching ? 0.32 : 0.5, isCrouching ? 0.2 : 0);
    soldier.add(rightLeg);

    // Torso with Tactical Vest
    const torsoY = isCrouching ? 0.85 : 1.35;
    const torsoGeo = new THREE.BoxGeometry(0.72, 0.75, 0.45);
    const torso = new THREE.Mesh(torsoGeo, uMat);
    torso.position.set(0, torsoY, 0);
    soldier.add(torso);

    const vestGeo = new THREE.BoxGeometry(0.76, 0.55, 0.5);
    const vest = new THREE.Mesh(vestGeo, this.gearMat);
    vest.position.set(0, torsoY, 0);
    soldier.add(vest);

    // Head
    const headY = torsoY + 0.55;
    const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const head = new THREE.Mesh(headGeo, this.skinMat);
    head.position.set(0, headY, 0);
    soldier.add(head);

    // Ballistic Helmet
    const helmetGeo = new THREE.SphereGeometry(0.26, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const helmet = new THREE.Mesh(helmetGeo, hMat);
    helmet.position.set(0, headY + 0.04, 0);
    soldier.add(helmet);

    // Faction Badge
    const badgeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
    const badgeMat = new THREE.MeshBasicMaterial({
      color: isFriendly ? 0x38bdf8 : 0xef4444 // Cyan friendly, Red enemy
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0.38, torsoY + 0.15, 0);
    soldier.add(badge);

    // Assault Rifle
    const rifle = new THREE.Group();
    const receiverGeo = new THREE.BoxGeometry(0.12, 0.18, 0.85);
    const receiver = new THREE.Mesh(receiverGeo, this.gearMat);
    receiver.position.set(0, 0, 0);
    rifle.add(receiver);

    const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, this.gearMat);
    barrel.position.set(0, 0.02, 0.65);
    rifle.add(barrel);

    // Muzzle Tip (Flash Point)
    const muzzleTip = new THREE.Object3D();
    muzzleTip.position.set(0, 0.02, 1.05);
    rifle.add(muzzleTip);

    rifle.position.set(0.28, torsoY - 0.05, 0.45);
    soldier.add(rifle);

    // Cast shadows
    soldier.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return {
      group: soldier,
      rifle,
      muzzleTip,
      head,
      torso,
      baseY: isCrouching ? 0 : 0
    };
  }

  // ============================================================================
  // SQUAD DEPLOYMENT AT PERIMETER DEFENSIVE REDOUBTS
  // ============================================================================

  _spawnSoldiers() {
    // 3 Friendly Soldiers at South-West Defensive Berms
    const friendlySpawns = [
      { x: -3.2, z: 8.8, rotY: 0.55, crouching: true },
      { x: -2.8, z: 10.4, rotY: 0.65, crouching: false },
      { x: this.gridCenterX - 11.2, z: -3.0, rotY: 1.57, crouching: true }
    ];

    friendlySpawns.forEach((s, idx) => {
      const meshData = this._createSoldierMesh(true, s.crouching);
      const y = this._getHeight(s.x, s.z);
      meshData.group.position.set(s.x, y, s.z);
      meshData.group.rotation.y = s.rotY;
      this.group.add(meshData.group);

      this.soldiers.push({
        id: `friendly_${idx}`,
        isFriendly: true,
        meshData,
        pos: new THREE.Vector3(s.x, y, s.z),
        crouching: s.crouching,
        fireTimer: Math.random() * 3.0,
        fireInterval: 2.5 + Math.random() * 2.5,
        targetPos: new THREE.Vector3(this.gridWidth + 5.0, 1.5, this.gridHeight - 8.0)
      });
    });

    // 3 Enemy Soldiers at North-East Outpost & North Ridge
    const enemySpawns = [
      { x: this.gridWidth + 3.2, z: this.gridHeight - 8.8, rotY: -2.6, crouching: true },
      { x: this.gridWidth + 2.6, z: this.gridHeight - 10.2, rotY: -2.4, crouching: false },
      { x: this.gridCenterX + 12.8, z: this.gridHeight + 3.0, rotY: -1.57, crouching: true }
    ];

    enemySpawns.forEach((s, idx) => {
      const meshData = this._createSoldierMesh(false, s.crouching);
      const y = this._getHeight(s.x, s.z);
      meshData.group.position.set(s.x, y, s.z);
      meshData.group.rotation.y = s.rotY;
      this.group.add(meshData.group);

      this.soldiers.push({
        id: `enemy_${idx}`,
        isFriendly: false,
        meshData,
        pos: new THREE.Vector3(s.x, y, s.z),
        crouching: s.crouching,
        fireTimer: Math.random() * 3.0,
        fireInterval: 2.2 + Math.random() * 2.8,
        targetPos: new THREE.Vector3(-3.0, 1.5, 9.5)
      });
    });
  }

  // ============================================================================
  // FIRING & BULLET TRACERS
  // ============================================================================

  _fireRifleBurst(soldier, target) {
    const muzzleWorld = new THREE.Vector3();
    soldier.meshData.muzzleTip.getWorldPosition(muzzleWorld);

    // Aim rifle at target
    const dir = new THREE.Vector3().subVectors(target, muzzleWorld).normalize();

    // Muzzle Flash Light & Sprite
    this._triggerMuzzleFlash(muzzleWorld);

    // Spawn 2-3 rapid tracer rounds
    for (let i = 0; i < 2; i++) {
      const delay = i * 0.08;
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 1.5
      );
      const endPos = new THREE.Vector3().copy(target).add(spread);

      setTimeout(() => {
        this._spawnTracer(muzzleWorld, endPos);
      }, delay * 1000);
    }
  }

  _triggerMuzzleFlash(pos) {
    const flash = new THREE.PointLight(0xffb74d, 3.5, 6.0);
    flash.position.copy(pos);
    this.scene.add(flash);

    setTimeout(() => {
      this.scene.remove(flash);
      flash.dispose();
    }, 55);
  }

  _spawnTracer(start, end) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, start]);
    const line = new THREE.Line(geo, this.tracerMaterial);
    this.scene.add(line);

    this.tracers.push({
      line,
      geo,
      start: start.clone(),
      end: end.clone(),
      progress: 0,
      speed: 3.8 // Fast projectile speed
    });
  }

  // ============================================================================
  // HARMLESS RICOCHET SPARKS ON ARMORED TANK
  // ============================================================================

  _triggerTankRicochet(tankPos) {
    // Enemy bullets glance off heavy armor with metallic spark shower
    const sparkCount = 18;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(sparkCount * 3);
    const vel = new Float32Array(sparkCount * 3);

    // Hit front glacis / turret armor
    const hitOrigin = new THREE.Vector3(
      tankPos.x + (Math.random() - 0.5) * 1.6,
      tankPos.y + 1.2 + Math.random() * 0.8,
      tankPos.z + (Math.random() - 0.5) * 1.6
    );

    for (let i = 0; i < sparkCount; i++) {
      const i3 = i * 3;
      pos[i3] = hitOrigin.x;
      pos[i3 + 1] = hitOrigin.y;
      pos[i3 + 2] = hitOrigin.z;

      // Deflection ricochet angle upward and away
      vel[i3] = (Math.random() - 0.5) * 8.0;
      vel[i3 + 1] = 3.0 + Math.random() * 7.0; // Ricochet sparks spray upward
      vel[i3 + 2] = (Math.random() - 0.5) * 8.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(vel, 3));

    const pMesh = new THREE.Points(geo, this.sparkMaterial);
    this.scene.add(pMesh);

    // Spark flash point
    const ricochetLight = new THREE.PointLight(0xfff275, 2.5, 4.0);
    ricochetLight.position.copy(hitOrigin);
    this.scene.add(ricochetLight);

    let life = 0;
    const maxLife = 0.35;

    this.particles.push({
      update: (dt) => {
        life += dt;
        const pArr = geo.attributes.position.array;
        const vArr = geo.attributes.velocity.array;

        for (let i = 0; i < sparkCount; i++) {
          const i3 = i * 3;
          pArr[i3] += vArr[i3] * dt;
          vArr[i3 + 1] -= 22.0 * dt; // Gravity pull down
          pArr[i3 + 1] += vArr[i3 + 1] * dt;
          pArr[i3 + 2] += vArr[i3 + 2] * dt;
        }
        geo.attributes.position.needsUpdate = true;

        if (life > 0.08 && ricochetLight.parent) {
          this.scene.remove(ricochetLight);
          ricochetLight.dispose();
        }

        return life < maxLife;
      },
      destroy: () => {
        if (ricochetLight.parent) this.scene.remove(ricochetLight);
        this.scene.remove(pMesh);
        geo.dispose();
      }
    });
  }

  // ============================================================================
  // GRENADE THROW & BURST SIMULATION
  // ============================================================================

  _tossGrenade(soldier, target) {
    const start = new THREE.Vector3();
    soldier.meshData.muzzleTip.getWorldPosition(start);
    start.y += 0.3;

    // Small grenade sphere
    const geo = new THREE.SphereGeometry(0.18, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3d4432,
      roughness: 0.9,
      metalness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(start);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const flightDuration = 1.35;
    const apexHeight = 5.5 + Math.random() * 2.5;

    this.grenades.push({
      mesh,
      start: start.clone(),
      target: target.clone(),
      apexHeight,
      duration: flightDuration,
      elapsed: 0
    });
  }

  _explodeGrenade(pos) {
    // Explosive blast flash
    const blastLight = new THREE.PointLight(0xff7722, 5.0, 12.0);
    blastLight.position.copy(pos);
    this.scene.add(blastLight);

    // Explosive debris & fireball particles
    const pCount = 35;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pVel = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const i3 = i * 3;
      pPos[i3] = pos.x;
      pPos[i3 + 1] = pos.y + 0.2;
      pPos[i3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 9.0;
      pVel[i3] = Math.cos(angle) * speed;
      pVel[i3 + 1] = 3.5 + Math.random() * 8.0;
      pVel[i3 + 2] = Math.sin(angle) * speed;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('velocity', new THREE.BufferAttribute(pVel, 3));

    const debrisMat = new THREE.PointsMaterial({
      color: 0xff6622,
      size: 0.65,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    const pMesh = new THREE.Points(pGeo, debrisMat);
    this.scene.add(pMesh);

    let age = 0;
    const maxAge = 0.65;

    this.particles.push({
      update: (dt) => {
        age += dt;
        const pArr = pGeo.attributes.position.array;
        const vArr = pGeo.attributes.velocity.array;

        for (let i = 0; i < pCount; i++) {
          const i3 = i * 3;
          pArr[i3] += vArr[i3] * dt;
          vArr[i3 + 1] -= 18.0 * dt;
          pArr[i3 + 1] = Math.max(pos.y, pArr[i3 + 1] + vArr[i3 + 1] * dt);
          pArr[i3 + 2] += vArr[i3 + 2] * dt;
        }
        pGeo.attributes.position.needsUpdate = true;
        debrisMat.opacity = Math.max(0, 1.0 - age / maxAge);

        if (age > 0.12 && blastLight.parent) {
          this.scene.remove(blastLight);
          blastLight.dispose();
        }

        return age < maxAge;
      },
      destroy: () => {
        if (blastLight.parent) this.scene.remove(blastLight);
        this.scene.remove(pMesh);
        pGeo.dispose();
        debrisMat.dispose();
      }
    });
  }

  // ============================================================================
  // UPDATE LOOP & TIMERS
  // ============================================================================

  update(time, dt, tankWorldPos) {
    // 1. Update Soldiers firing logic
    this.soldiers.forEach(soldier => {
      soldier.fireTimer += dt;
      if (soldier.fireTimer >= soldier.fireInterval) {
        soldier.fireTimer = 0;
        soldier.fireInterval = 2.2 + Math.random() * 3.5;

        // Determine target: occasionally target tank (harmlessly) or enemy position
        if (!soldier.isFriendly && tankWorldPos && Math.random() < 0.35) {
          // Enemy fires a burst at the armored player tank!
          this._fireRifleBurst(soldier, tankWorldPos);
          setTimeout(() => {
            if (tankWorldPos) this._triggerTankRicochet(tankWorldPos);
          }, 240);
        } else {
          // Standard crossfire toward enemy lines
          this._fireRifleBurst(soldier, soldier.targetPos);
        }
      }

      // Micro-aim bobbing animation
      const breath = Math.sin(time * 2.2 + soldier.pos.x) * 0.02;
      soldier.meshData.rifle.rotation.x = breath;
    });

    // 2. Periodic Grenade Tosses
    if (time - this.lastGrenadeTime > 8.5) {
      this.lastGrenadeTime = time;
      const thrower = this.soldiers[Math.floor(Math.random() * this.soldiers.length)];
      if (thrower) {
        const noMansLand = new THREE.Vector3(
          this.gridCenterX + (Math.random() - 0.5) * 18,
          0,
          this.gridCenterZ + (Math.random() - 0.5) * 18
        );
        noMansLand.y = this._getHeight(noMansLand.x, noMansLand.z);
        this._tossGrenade(thrower, noMansLand);
      }
    }

    // 3. Update Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.progress += t.speed * dt;

      if (t.progress >= 1.0) {
        this.scene.remove(t.line);
        t.geo.dispose();
        this.tracers.splice(i, 1);
      } else {
        const lead = Math.min(1.0, t.progress);
        const trail = Math.max(0.0, t.progress - 0.22);

        const curHead = new THREE.Vector3().lerpVectors(t.start, t.end, lead);
        const curTail = new THREE.Vector3().lerpVectors(t.start, t.end, trail);

        t.geo.setFromPoints([curTail, curHead]);
      }
    }

    // 4. Update Flying Grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.elapsed += dt;
      const p = g.elapsed / g.duration;

      if (p >= 1.0) {
        this._explodeGrenade(g.target);
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        g.mesh.material.dispose();
        this.grenades.splice(i, 1);
      } else {
        // Parabolic flight arc
        const currentPos = new THREE.Vector3().lerpVectors(g.start, g.target, p);
        const arc = 4.0 * p * (1.0 - p); // Parabola peaking at p = 0.5
        currentPos.y += arc * g.apexHeight;

        g.mesh.position.copy(currentPos);
        g.mesh.rotation.x += dt * 12.0;
        g.mesh.rotation.z += dt * 8.0;
      }
    }

    // 5. Update Particle Systems (Sparks & Explosions)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const ps = this.particles[i];
      if (!ps.update(dt)) {
        ps.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  // ============================================================================
  // ENVIRONMENT PRESET ADAPTATION
  // ============================================================================

  applyPreset(presetId) {
    if (presetId === 'arctic') {
      // Winter camouflage
      this.friendlyUniformMat.color.setHex(0x5a6e78);
      this.friendlyHelmetMat.color.setHex(0xd8e4eb);
      this.enemyUniformMat.color.setHex(0x384147);
      this.enemyHelmetMat.color.setHex(0xb2c2cc);
    } else if (presetId === 'desert') {
      // Desert khaki / sand multicam
      this.friendlyUniformMat.color.setHex(0xa88c5d);
      this.friendlyHelmetMat.color.setHex(0x8f754a);
      this.enemyUniformMat.color.setHex(0x544330);
      this.enemyHelmetMat.color.setHex(0x403120);
    } else {
      // Standard woodland / tactical slate
      this.friendlyUniformMat.color.setHex(0x425838);
      this.friendlyHelmetMat.color.setHex(0x2e3f28);
      this.enemyUniformMat.color.setHex(0x2b2f33);
      this.enemyHelmetMat.color.setHex(0x1d2124);
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.tracers.forEach(t => {
      this.scene.remove(t.line);
      t.geo.dispose();
    });
    this.tracers = [];

    this.grenades.forEach(g => {
      this.scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
    });
    this.grenades = [];

    this.particles.forEach(p => p.destroy());
    this.particles = [];

    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }
}
