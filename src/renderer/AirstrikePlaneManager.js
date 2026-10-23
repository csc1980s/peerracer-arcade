/**
 * Airstrike Plane & Distant Bombing Run Manager
 *
 * Responsibilities:
 * - High-speed military strike bomber flying high across the distant sky outside the grid.
 * - Spawns at recurring randomized intervals (every 16-28 seconds).
 * - Streaming white vapor contrails and flashing wingtip navigation strobe lights.
 * - Releases a stick of 3-5 falling bombs onto distant perimeter ridges.
 * - Dramatic distant fireball mushroom explosions, billowing smoke plumes, and dynamic horizon flash.
 * - Purely visual/cinematic: zero impact on gameplay grid or tank health.
 */

import * as THREE from 'three';

export class AirstrikePlaneManager {
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
    this.group.name = 'AirstrikePlaneGroup';
    this.scene.add(this.group);

    // Active entities
    this.currentPlane = null;
    this.fallingBombs = [];
    this.distantExplosions = [];
    this.contrails = [];

    // Scheduling
    this.nextFlightTimer = 5.0; // First flight early for immediate visual excitement
    this.flightInterval = 20.0;

    this._initMaterials();
  }

  _getHeight(x, z) {
    if (this.coordinator.battlefieldTerrain) {
      return this.coordinator.battlefieldTerrain.getHeightAt(x, z);
    }
    return 0;
  }

  _initMaterials() {
    // Military Strike Jet Fuselage
    this.fuselageMat = new THREE.MeshStandardMaterial({
      color: 0x2e353d,
      roughness: 0.65,
      metalness: 0.45
    });

    this.canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.2,
      metalness: 0.85
    });

    this.exhaustMat = new THREE.MeshBasicMaterial({
      color: 0xff7722
    });

    this.bombMat = new THREE.MeshStandardMaterial({
      color: 0x1f2421,
      roughness: 0.8,
      metalness: 0.3
    });

    this.contrailMat = new THREE.LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
  }

  // ============================================================================
  // 3D MILITARY STRIKE BOMBER AIRCRAFT
  // ============================================================================

  _buildPlaneMesh() {
    const plane = new THREE.Group();

    // Fuselage (Streamlined Body)
    const bodyGeo = new THREE.ConeGeometry(1.4, 14.0, 7);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, this.fuselageMat);
    body.position.set(0, 0, 1.5);
    plane.add(body);

    // Main Swept Delta Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 2.0);
    wingShape.lineTo(-11.0, -4.5);
    wingShape.lineTo(-10.5, -6.5);
    wingShape.lineTo(0, -3.5);
    wingShape.lineTo(10.5, -6.5);
    wingShape.lineTo(11.0, -4.5);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.25,
      bevelEnabled: false
    });
    wingGeo.rotateX(Math.PI / 2);
    const wings = new THREE.Mesh(wingGeo, this.fuselageMat);
    wings.position.set(0, 0, 0);
    plane.add(wings);

    // Twin Canting Vertical Stabilizers (Tails)
    const tailGeo = new THREE.BoxGeometry(0.18, 2.8, 2.2);
    const leftTail = new THREE.Mesh(tailGeo, this.fuselageMat);
    leftTail.position.set(-1.4, 1.3, -5.2);
    leftTail.rotation.z = -0.22;
    plane.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo, this.fuselageMat);
    rightTail.position.set(1.4, 1.3, -5.2);
    rightTail.rotation.z = 0.22;
    plane.add(rightTail);

    // Cockpit Tinted Canopy
    const canopyGeo = new THREE.SphereGeometry(0.75, 8, 8);
    canopyGeo.scale(0.8, 0.9, 2.2);
    const canopy = new THREE.Mesh(canopyGeo, this.canopyMat);
    canopy.position.set(0, 0.85, 2.2);
    plane.add(canopy);

    // Twin Afterburner Exhaust Cones
    const exhaustGeo = new THREE.CylinderGeometry(0.5, 0.65, 0.8, 8);
    exhaustGeo.rotateX(Math.PI / 2);
    const leftExhaust = new THREE.Mesh(exhaustGeo, this.exhaustMat);
    leftExhaust.position.set(-0.85, 0, -6.0);
    plane.add(leftExhaust);

    const rightExhaust = new THREE.Mesh(exhaustGeo, this.exhaustMat);
    rightExhaust.position.set(0.85, 0, -6.0);
    plane.add(rightExhaust);

    // Wingtip Strobe Lights
    const portStrobe = new THREE.PointLight(0xef4444, 2.5, 12); // Red port light
    portStrobe.position.set(-10.8, 0, -5.5);
    plane.add(portStrobe);

    const stbdStrobe = new THREE.PointLight(0x22c55e, 2.5, 12); // Green starboard light
    stbdStrobe.position.set(10.8, 0, -5.5);
    plane.add(stbdStrobe);

    // Contrail Anchor Points (Behind wingtips)
    const leftContrailAnchor = new THREE.Object3D();
    leftContrailAnchor.position.set(-10.5, 0, -6.0);
    plane.add(leftContrailAnchor);

    const rightContrailAnchor = new THREE.Object3D();
    rightContrailAnchor.position.set(10.5, 0, -6.0);
    plane.add(rightContrailAnchor);

    return {
      group: plane,
      portStrobe,
      stbdStrobe,
      leftAnchor: leftContrailAnchor,
      rightAnchor: rightContrailAnchor
    };
  }

  // ============================================================================
  // FLIGHT LAUNCH & TRAJECTORY
  // ============================================================================

  _launchFlightPass() {
    if (this.currentPlane) return; // Wait for active pass to complete

    const planeData = this._buildPlaneMesh();
    this.group.add(planeData.group);

    // Randomize flight vector across the distant horizon outside the grid
    // Altitudes 55 - 75 units, radius 130 - 180 units from center
    const angle = Math.random() * Math.PI * 2;
    const distance = 145.0 + Math.random() * 35.0;
    const altitude = 58.0 + Math.random() * 14.0;

    // Flight direction across the perimeter
    const startX = this.gridCenterX + Math.cos(angle) * distance;
    const startZ = this.gridCenterZ + Math.sin(angle) * distance;

    const endX = this.gridCenterX + Math.cos(angle + Math.PI * 0.75) * distance;
    const endZ = this.gridCenterZ + Math.sin(angle + Math.PI * 0.75) * distance;

    const startPos = new THREE.Vector3(startX, altitude, startZ);
    const endPos = new THREE.Vector3(endX, altitude - 4.0, endZ);

    const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
    const flightDist = startPos.distanceTo(endPos);
    const speed = 75.0; // High speed units/sec
    const duration = flightDist / speed;

    planeData.group.position.copy(startPos);
    // Orient plane forward along trajectory
    planeData.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    // Add slight banking roll
    planeData.group.rotateZ(0.24);

    this.currentPlane = {
      data: planeData,
      startPos,
      endPos,
      dir,
      speed,
      duration,
      elapsed: 0,
      bombsDropped: false,
      leftTrailPoints: [],
      rightTrailPoints: []
    };
  }

  // ============================================================================
  // BOMB RELEASE & DISTANT EXPLOSIONS
  // ============================================================================

  _dropBombSalvo(releasePos, planeDir) {
    const bombCount = 4;
    // Target distant ridgeline outside the grid
    const forwardDistance = 45.0;

    for (let i = 0; i < bombCount; i++) {
      const delay = i * 0.22;
      setTimeout(() => {
        const dropPoint = releasePos.clone().addScaledVector(planeDir, i * 6.0);
        // Distant impact target on terrain
        const targetX = dropPoint.x + planeDir.x * forwardDistance + (Math.random() - 0.5) * 8.0;
        const targetZ = dropPoint.z + planeDir.z * forwardDistance + (Math.random() - 0.5) * 8.0;
        const targetY = this._getHeight(targetX, targetZ);
        const targetPos = new THREE.Vector3(targetX, targetY, targetZ);

        this._spawnFallingBomb(dropPoint, targetPos, planeDir);
      }, delay * 1000);
    }
  }

  _spawnFallingBomb(startPos, targetPos, planeDir) {
    const geo = new THREE.ConeGeometry(0.35, 1.6, 6);
    geo.rotateX(-Math.PI / 2);
    const bomb = new THREE.Mesh(geo, this.bombMat);
    bomb.position.copy(startPos);
    bomb.castShadow = true;
    this.scene.add(bomb);

    const duration = 1.45;
    const initialVelocity = planeDir.clone().multiplyScalar(42.0);

    this.fallingBombs.push({
      mesh: bomb,
      pos: startPos.clone(),
      vel: initialVelocity,
      targetY: targetPos.y,
      targetPos,
      duration,
      elapsed: 0
    });
  }

  _triggerDistantDetonation(targetPos) {
    // 1. Dynamic Horizon Flash Light
    const flashLight = new THREE.PointLight(0xff6b1a, 8.5, 60.0);
    flashLight.position.set(targetPos.x, targetPos.y + 4.0, targetPos.z);
    this.scene.add(flashLight);

    // 2. Rising Fireball Sphere Mesh
    const blastGeo = new THREE.SphereGeometry(3.5, 12, 10);
    const blastMat = new THREE.MeshBasicMaterial({
      color: 0xff7722,
      transparent: true,
      opacity: 0.95
    });
    const blastMesh = new THREE.Mesh(blastGeo, blastMat);
    blastMesh.position.set(targetPos.x, targetPos.y + 2.5, targetPos.z);
    this.scene.add(blastMesh);

    // 3. Billowing Smoke Plume Particles
    const smokeCount = 30;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    const smokeVel = new Float32Array(smokeCount * 3);

    for (let i = 0; i < smokeCount; i++) {
      const i3 = i * 3;
      smokePos[i3] = targetPos.x + (Math.random() - 0.5) * 2.0;
      smokePos[i3 + 1] = targetPos.y + 1.0;
      smokePos[i3 + 2] = targetPos.z + (Math.random() - 0.5) * 2.0;

      smokeVel[i3] = (Math.random() - 0.5) * 6.0;
      smokeVel[i3 + 1] = 6.0 + Math.random() * 12.0; // Billows high
      smokeVel[i3 + 2] = (Math.random() - 0.5) * 6.0;
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    smokeGeo.setAttribute('velocity', new THREE.BufferAttribute(smokeVel, 3));

    const smokeMat = new THREE.PointsMaterial({
      color: 0x33261d,
      size: 2.8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    this.scene.add(smokePoints);

    let age = 0;
    const maxAge = 2.4;

    this.distantExplosions.push({
      update: (dt) => {
        age += dt;

        // Animate Fireball Expansion & Fade
        if (age < 0.6) {
          const s = 1.0 + age * 4.5;
          blastMesh.scale.set(s, s * 1.3, s);
          blastMat.opacity = Math.max(0, 1.0 - age / 0.6);
        } else if (blastMesh.parent) {
          this.scene.remove(blastMesh);
          blastGeo.dispose();
          blastMat.dispose();
        }

        // Animate Smoke Plume
        const pArr = smokeGeo.attributes.position.array;
        const vArr = smokeGeo.attributes.velocity.array;
        for (let i = 0; i < smokeCount; i++) {
          const i3 = i * 3;
          pArr[i3] += vArr[i3] * dt;
          pArr[i3 + 1] += vArr[i3 + 1] * dt;
          pArr[i3 + 2] += vArr[i3 + 2] * dt;
          vArr[i3] *= 0.98;
          vArr[i3 + 1] *= 0.96; // Air drag
          vArr[i3 + 2] *= 0.98;
        }
        smokeGeo.attributes.position.needsUpdate = true;
        smokeMat.opacity = Math.max(0, 0.85 * (1.0 - age / maxAge));

        // Light flash decay
        if (age > 0.18 && flashLight.parent) {
          this.scene.remove(flashLight);
          flashLight.dispose();
        }

        return age < maxAge;
      },
      destroy: () => {
        if (flashLight.parent) this.scene.remove(flashLight);
        if (blastMesh.parent) this.scene.remove(blastMesh);
        this.scene.remove(smokePoints);
        smokeGeo.dispose();
        smokeMat.dispose();
      }
    });
  }

  // ============================================================================
  // REAL-TIME UPDATE LOOP
  // ============================================================================

  update(time, dt) {
    // 1. Flight Scheduling
    this.nextFlightTimer -= dt;
    if (this.nextFlightTimer <= 0) {
      this._launchFlightPass();
      this.nextFlightTimer = 16.0 + Math.random() * 12.0; // Random interval 16 - 28s
    }

    // 2. Active Airplane Flight
    if (this.currentPlane) {
      const p = this.currentPlane;
      p.elapsed += dt;
      const progress = p.elapsed / p.duration;

      if (progress >= 1.0) {
        // Plane completed pass and exited horizon
        this.group.remove(p.data.group);
        p.data.group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.currentPlane = null;
      } else {
        // Interpolate position along flight path
        const currentPos = new THREE.Vector3().lerpVectors(p.startPos, p.endPos, progress);
        p.data.group.position.copy(currentPos);

        // Blinking Navigation Lights
        const strobe = Math.sin(time * 12.0) > 0.3;
        p.data.portStrobe.intensity = strobe ? 3.0 : 0.2;
        p.data.stbdStrobe.intensity = strobe ? 3.0 : 0.2;

        // Release Bomb Salvo at mid-flight (progress ~0.45)
        if (progress >= 0.42 && !p.bombsDropped) {
          p.bombsDropped = true;
          this._dropBombSalvo(currentPos, p.dir);
        }
      }
    }

    // 3. Falling Bombs
    for (let i = this.fallingBombs.length - 1; i >= 0; i--) {
      const b = this.fallingBombs[i];
      b.elapsed += dt;

      // Gravity and forward momentum
      b.vel.y -= 28.0 * dt; // Gravity
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);

      // Align bomb nose with velocity vector
      b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.vel.clone().normalize());

      // Check ground impact
      if (b.pos.y <= b.targetY || b.elapsed >= b.duration) {
        this._triggerDistantDetonation(b.targetPos);
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.fallingBombs.splice(i, 1);
      }
    }

    // 4. Distant Explosions & Smoke
    for (let i = this.distantExplosions.length - 1; i >= 0; i--) {
      const exp = this.distantExplosions[i];
      if (!exp.update(dt)) {
        exp.destroy();
        this.distantExplosions.splice(i, 1);
      }
    }
  }

  applyPreset(presetId) {
    // Plane remains stealth military slate, dynamic lighting adapts with scene
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.currentPlane) {
      this.group.remove(this.currentPlane.data.group);
      this.currentPlane = null;
    }
    this.fallingBombs.forEach(b => {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    });
    this.fallingBombs = [];

    this.distantExplosions.forEach(exp => exp.destroy());
    this.distantExplosions = [];
  }
}
