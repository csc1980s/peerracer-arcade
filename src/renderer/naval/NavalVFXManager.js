/**
 * Naval Visual Effects Manager — Artillery Ballistics, Water Geysers & Oil Fires
 *
 * Cinematic naval combat effects:
 * - Towering 20-meter ocean water geyser eruptions on misses
 * - Catastrophic armor-piercing shell detonations with metal shrapnel on hits
 * - Billowing black fuel oil smoke columns on damaged/sinking warships
 * - High-caliber naval battery muzzle flashes & expanding propellant smoke
 * - 3D parabolic artillery shell ballistics with glowing red/orange tracer wakes
 */

import * as THREE from 'three';

export class NavalVFXManager {
  constructor(scene, coordinator) {
    this.scene = scene;
    this.coordinator = coordinator;

    this.activeShells = [];
    this.particleSystems = [];
    this.smokeEmitters = [];
    this.dynamicLights = [];

    this._initMaterials();
  }

  _initMaterials() {
    // Water Geyser Spray Particles
    this.geyserMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.85,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Explosive Blast Shards & Fireball
    this.fireballMat = new THREE.PointsMaterial({
      color: 0xff6611,
      size: 1.4,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Billowing Black Fuel Oil Smoke
    this.oilSmokeMat = new THREE.PointsMaterial({
      color: 0x181c20,
      size: 2.2,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });

    // 16-inch AP Projectile
    this.shellMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      metalness: 0.8,
      roughness: 0.3
    });
  }

  // ============================================================================
  // PARABOLIC ARTILLERY SHELL BALLISTICS
  // ============================================================================

  launchShell(startPos, targetPos, onImpactCallback) {
    // Modeled AP shell
    const shellGeo = new THREE.ConeGeometry(0.35, 1.8, 8);
    shellGeo.rotateX(Math.PI / 2);
    const shellMesh = new THREE.Mesh(shellGeo, this.shellMat);
    shellMesh.position.copy(startPos);
    this.scene.add(shellMesh);

    // Tracer Line Geometry
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([startPos, startPos]);
    const tracerMat = new THREE.LineBasicMaterial({
      color: 0xff7722,
      linewidth: 3,
      blending: THREE.AdditiveBlending
    });
    const tracerLine = new THREE.Line(tracerGeo, tracerMat);
    this.scene.add(tracerLine);

    // Muzzle blast flash at firing point
    this.triggerMuzzleFlash(startPos);

    const distance = startPos.distanceTo(targetPos);
    const flightTime = Math.max(0.65, Math.min(1.8, distance * 0.018));
    const apexHeight = 12.0 + distance * 0.22;

    this.activeShells.push({
      mesh: shellMesh,
      tracer: tracerLine,
      tracerGeo,
      start: startPos.clone(),
      target: targetPos.clone(),
      flightTime,
      apexHeight,
      elapsed: 0,
      onImpact: onImpactCallback
    });

    this.coordinator.requestRender();
  }

  triggerMuzzleFlash(origin) {
    const flash = new THREE.PointLight(0xffa233, 8.0, 24.0);
    flash.position.copy(origin);
    this.scene.add(flash);

    setTimeout(() => {
      this.scene.remove(flash);
      flash.dispose();
    }, 85);
  }

  // ============================================================================
  // WATER GEYSER SPLASH (MISS)
  // ============================================================================

  triggerWaterGeyser(pos) {
    const count = 75;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = pos.x + (Math.random() - 0.5) * 1.5;
      positions[i3 + 1] = pos.y + 0.1;
      positions[i3 + 2] = pos.z + (Math.random() - 0.5) * 1.5;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 4.5;
      velocities[i3] = Math.cos(angle) * speed;
      velocities[i3 + 1] = 16.0 + Math.random() * 18.0; // Towering vertical geyser
      velocities[i3 + 2] = Math.sin(angle) * speed;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const pMesh = new THREE.Points(geo, this.geyserMat);
    this.scene.add(pMesh);

    // Expand water ripple ring on ocean shader
    if (this.coordinator.oceanMaterial?.uniforms) {
      this.coordinator.oceanMaterial.uniforms.uSplashCenter.value.copy(pos);
      this.coordinator.oceanMaterial.uniforms.uSplashAlpha.value = 1.0;
      this.coordinator.oceanMaterial.uniforms.uSplashRadius.value = 0.5;
    }

    let age = 0;
    const maxAge = 1.35;

    this.particleSystems.push({
      update: (dt) => {
        age += dt;
        const pArr = geo.attributes.position.array;
        const vArr = geo.attributes.velocity.array;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          pArr[i3] += vArr[i3] * dt;
          vArr[i3 + 1] -= 32.0 * dt; // Gravity
          pArr[i3 + 1] = Math.max(pos.y, pArr[i3 + 1] + vArr[i3 + 1] * dt);
          pArr[i3 + 2] += vArr[i3 + 2] * dt;
          vArr[i3] *= 0.98;
          vArr[i3 + 2] *= 0.98;
        }
        geo.attributes.position.needsUpdate = true;

        // Propagate ocean ripple
        if (this.coordinator.oceanMaterial?.uniforms) {
          const progress = age / maxAge;
          this.coordinator.oceanMaterial.uniforms.uSplashRadius.value = progress * 14.0;
          this.coordinator.oceanMaterial.uniforms.uSplashAlpha.value = Math.max(0, 1.0 - progress);
        }

        return age < maxAge;
      },
      destroy: () => {
        this.scene.remove(pMesh);
        geo.dispose();
      }
    });
  }

  // ============================================================================
  // CATASTROPHIC SHELL HIT DETONATION (HIT & SUNK)
  // ============================================================================

  triggerExplosion(pos, isSunk = false) {
    const light = new THREE.PointLight(0xff5511, isSunk ? 14.0 : 8.0, 35.0);
    light.position.set(pos.x, pos.y + 2.0, pos.z);
    this.scene.add(light);

    const count = isSunk ? 120 : 65;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y + 1.2;
      positions[i3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * (isSunk ? 16.0 : 10.0);
      velocities[i3] = Math.cos(angle) * speed;
      velocities[i3 + 1] = 4.0 + Math.random() * (isSunk ? 18.0 : 12.0);
      velocities[i3 + 2] = Math.sin(angle) * speed;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const pMesh = new THREE.Points(geo, this.fireballMat);
    this.scene.add(pMesh);

    // If vessel is damaged or sunk, start persistent oil smoke plume
    this.spawnOilSmoke(pos, isSunk ? 18.0 : 8.0);

    let age = 0;
    const maxAge = isSunk ? 1.6 : 0.95;

    this.particleSystems.push({
      update: (dt) => {
        age += dt;
        const pArr = geo.attributes.position.array;
        const vArr = geo.attributes.velocity.array;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          pArr[i3] += vArr[i3] * dt;
          vArr[i3 + 1] -= 24.0 * dt;
          pArr[i3 + 1] = Math.max(pos.y, pArr[i3 + 1] + vArr[i3 + 1] * dt);
          pArr[i3 + 2] += vArr[i3 + 2] * dt;
        }
        geo.attributes.position.needsUpdate = true;

        if (age > 0.15 && light.parent) {
          this.scene.remove(light);
          light.dispose();
        }

        return age < maxAge;
      },
      destroy: () => {
        if (light.parent) this.scene.remove(light);
        this.scene.remove(pMesh);
        geo.dispose();
      }
    });
  }

  spawnOilSmoke(pos, duration = 8.0) {
    const smokeCount = 35;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(smokeCount * 3);
    const velocities = new Float32Array(smokeCount * 3);

    for (let i = 0; i < smokeCount; i++) {
      const i3 = i * 3;
      positions[i3] = pos.x + (Math.random() - 0.5) * 2.0;
      positions[i3 + 1] = pos.y + Math.random() * 1.5;
      positions[i3 + 2] = pos.z + (Math.random() - 0.5) * 2.0;

      velocities[i3] = (Math.random() - 0.5) * 1.2;
      velocities[i3 + 1] = 2.5 + Math.random() * 4.0; // Billows upward
      velocities[i3 + 2] = (Math.random() - 0.5) * 1.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const pMesh = new THREE.Points(geo, this.oilSmokeMat);
    this.scene.add(pMesh);

    let age = 0;

    this.particleSystems.push({
      update: (dt) => {
        age += dt;
        const pArr = geo.attributes.position.array;
        const vArr = geo.attributes.velocity.array;

        for (let i = 0; i < smokeCount; i++) {
          const i3 = i * 3;
          pArr[i3] += vArr[i3] * dt;
          pArr[i3 + 1] += vArr[i3 + 1] * dt;
          pArr[i3 + 2] += vArr[i3 + 2] * dt;

          // Recycle smoke particles back to hull deck
          if (pArr[i3 + 1] > pos.y + 14.0) {
            pArr[i3] = pos.x + (Math.random() - 0.5) * 2.0;
            pArr[i3 + 1] = pos.y + 0.5;
            pArr[i3 + 2] = pos.z + (Math.random() - 0.5) * 2.0;
          }
        }
        geo.attributes.position.needsUpdate = true;
        return age < duration;
      },
      destroy: () => {
        this.scene.remove(pMesh);
        geo.dispose();
      }
    });
  }

  // ============================================================================
  // UPDATE LOOP
  // ============================================================================

  update(dt) {
    let hasActiveEffects = false;

    // 1. Update In-Flight Shells
    for (let i = this.activeShells.length - 1; i >= 0; i--) {
      hasActiveEffects = true;
      const s = this.activeShells[i];
      s.elapsed += dt;
      const progress = s.elapsed / s.flightTime;

      if (progress >= 1.0) {
        // Impact!
        if (s.onImpact) s.onImpact(s.target);

        this.scene.remove(s.mesh);
        this.scene.remove(s.tracer);
        s.mesh.geometry.dispose();
        s.tracerGeo.dispose();
        this.activeShells.splice(i, 1);
      } else {
        const currentPos = new THREE.Vector3().lerpVectors(s.start, s.target, progress);
        const arc = 4.0 * progress * (1.0 - progress);
        currentPos.y += arc * s.apexHeight;

        s.mesh.position.copy(currentPos);

        // Update Tracer Line
        const trailProgress = Math.max(0, progress - 0.18);
        const trailPos = new THREE.Vector3().lerpVectors(s.start, s.target, trailProgress);
        trailPos.y += 4.0 * trailProgress * (1.0 - trailProgress) * s.apexHeight;

        s.tracerGeo.setFromPoints([trailPos, currentPos]);
      }
    }

    // 2. Update Active Particle Systems
    for (let i = this.particleSystems.length - 1; i >= 0; i--) {
      hasActiveEffects = true;
      const ps = this.particleSystems[i];
      if (!ps.update(dt)) {
        ps.destroy();
        this.particleSystems.splice(i, 1);
      }
    }

    return hasActiveEffects;
  }

  destroy() {
    this.activeShells.forEach(s => {
      this.scene.remove(s.mesh);
      this.scene.remove(s.tracer);
      s.mesh.geometry.dispose();
      s.tracerGeo.dispose();
    });
    this.activeShells = [];

    this.particleSystems.forEach(ps => ps.destroy());
    this.particleSystems = [];
  }
}
