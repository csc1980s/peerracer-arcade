/**
 * Ballistics Manager - 3D Shell Trajectory & Projectile Tracer Engine
 *
 * Responsibilities:
 * - Spawns 105mm AP projectiles with glowing tracer bases and aerodynamic geometry.
 * - Computes authentic parabolic ballistic arcs with peak trajectory heights.
 * - Simulates fiery smoke wake and real-time ground illumination during flight.
 * - Resolves impacts with ground shockwaves, debris bursts, and callback triggers.
 */

import * as THREE from 'three';

export class BallisticsManager {
  constructor(scene, coordinator) {
    this.scene = scene;
    this.coordinator = coordinator;
    this.activeShells = [];

    // Shared geometries and materials
    this._initSharedAssets();
  }

  _initSharedAssets() {
    // 105mm Armor-Piercing Projectile Geometry
    this.shellGroupTemplate = new THREE.Group();

    // Cylindrical Body
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 12);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.9,
      roughness: 0.25
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.shellGroupTemplate.add(body);

    // Ogive Nosecone
    const noseGeo = new THREE.ConeGeometry(0.18, 0.45, 12);
    noseGeo.rotateX(Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = -0.6;
    this.shellGroupTemplate.add(nose);

    // Glowing Tracer Base
    const tracerGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12);
    tracerGeo.rotateX(Math.PI / 2);
    const tracerMat = new THREE.MeshBasicMaterial({
      color: 0xff6600
    });
    const tracer = new THREE.Mesh(tracerGeo, tracerMat);
    tracer.position.z = 0.44;
    this.shellGroupTemplate.add(tracer);

    // Tracer Smoke Wake Particle Material
    this.smokeGeo = new THREE.SphereGeometry(0.16, 8, 8);
    this.smokeMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.85
    });

    // Expanding Ground Shockwave Ring Geometry
    this.shockwaveGeo = new THREE.RingGeometry(0.2, 0.6, 24);
    this.shockwaveGeo.rotateX(-Math.PI / 2);
    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xff8811,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
  }

  /**
   * Launch a 3D projectile along a parabolic arc
   */
  launchShell(options) {
    const {
      fromPos,
      toPos,
      onImpact
    } = options;

    const shell = this.shellGroupTemplate.clone();
    shell.position.copy(fromPos);
    this.scene.add(shell);

    // Dynamic Tracer Glow Light
    const tracerLight = new THREE.PointLight(0xff7711, 3.5, 16);
    tracerLight.position.copy(fromPos);
    this.scene.add(tracerLight);

    const distance = fromPos.distanceTo(toPos);
    // Flight time scales with distance (0.35s to 0.75s)
    const duration = Math.max(0.35, Math.min(0.85, distance * 0.035 + 0.25));
    const peakHeight = Math.max(1.8, distance * 0.15 + 1.2);

    const wakeParticles = [];

    const shellRecord = {
      mesh: shell,
      light: tracerLight,
      from: fromPos.clone(),
      to: toPos.clone(),
      duration,
      elapsed: 0,
      peakHeight,
      wakeParticles,
      onImpact
    };

    this.activeShells.push(shellRecord);
    this.coordinator.requestRender();
  }

  /**
   * Spawn expanding ground shockwave ring at detonation coordinate
   */
  spawnShockwave(worldPos) {
    const ring = new THREE.Mesh(this.shockwaveGeo, this.shockwaveMat.clone());
    ring.position.set(worldPos.x, 0.06, worldPos.z);
    this.scene.add(ring);

    let age = 0;
    const lifetime = 0.42;

    this.coordinator.particleSystems.push({
      update: (dt) => {
        age += dt;
        const progress = age / lifetime;
        const scale = 1.0 + progress * 7.5;
        ring.scale.set(scale, scale, scale);
        ring.material.opacity = 0.9 * (1.0 - progress);
        return age < lifetime;
      },
      destroy: () => {
        this.scene.remove(ring);
        ring.material.dispose();
      }
    });
  }

  update(deltaTime) {
    if (this.activeShells.length === 0) return false;

    for (let i = this.activeShells.length - 1; i >= 0; i--) {
      const s = this.activeShells[i];
      s.elapsed += deltaTime;
      const t = Math.min(1.0, s.elapsed / s.duration);

      // Parabolic Arc Position
      const x = THREE.MathUtils.lerp(s.from.x, s.to.x, t);
      const z = THREE.MathUtils.lerp(s.from.z, s.to.z, t);
      // y(t) = linear_y + 4 * peak * t * (1 - t)
      const linearY = THREE.MathUtils.lerp(s.from.y, s.to.y, t);
      const arcY = 4.0 * s.peakHeight * t * (1.0 - t);
      const y = Math.max(0.1, linearY + arcY);

      const currentPos = new THREE.Vector3(x, y, z);

      // Compute velocity vector for shell orientation
      const dt = 0.01;
      const tNext = Math.min(1.0, t + dt);
      const nextX = THREE.MathUtils.lerp(s.from.x, s.to.x, tNext);
      const nextZ = THREE.MathUtils.lerp(s.from.z, s.to.z, tNext);
      const nextY = THREE.MathUtils.lerp(s.from.y, s.to.y, tNext) + 4.0 * s.peakHeight * tNext * (1.0 - tNext);
      const nextPos = new THREE.Vector3(nextX, nextY, nextZ);

      s.mesh.position.copy(currentPos);
      s.mesh.lookAt(nextPos);
      s.light.position.copy(currentPos);

      // Spawn fiery wake particle
      if (Math.random() < 0.75) {
        const p = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
        p.position.copy(currentPos);
        p.scale.setScalar(0.4 + Math.random() * 0.4);
        this.scene.add(p);
        s.wakeParticles.push({
          mesh: p,
          age: 0,
          lifetime: 0.25
        });
      }

      // Update wake particles
      for (let j = s.wakeParticles.length - 1; j >= 0; j--) {
        const wp = s.wakeParticles[j];
        wp.age += deltaTime;
        if (wp.age >= wp.lifetime) {
          this.scene.remove(wp.mesh);
          wp.mesh.material.dispose();
          s.wakeParticles.splice(j, 1);
        } else {
          const prog = wp.age / wp.lifetime;
          wp.mesh.material.opacity = 0.85 * (1.0 - prog);
          wp.mesh.scale.multiplyScalar(1.0 + deltaTime * 2.0);
        }
      }

      // Impact Check
      if (t >= 1.0) {
        // Remove shell and tracer light
        this.scene.remove(s.mesh);
        this.scene.remove(s.light);
        s.light.dispose();

        // Spawn ground shockwave
        this.spawnShockwave(s.to);

        // Clean up remaining wake particles
        for (const wp of s.wakeParticles) {
          this.scene.remove(wp.mesh);
          wp.mesh.material.dispose();
        }

        // Trigger impact callback
        if (s.onImpact) {
          s.onImpact(s.to);
        }

        this.activeShells.splice(i, 1);
      }
    }

    return this.activeShells.length > 0;
  }

  clear() {
    for (const s of this.activeShells) {
      this.scene.remove(s.mesh);
      this.scene.remove(s.light);
      s.light.dispose();
      for (const wp of s.wakeParticles) {
        this.scene.remove(wp.mesh);
        wp.mesh.material.dispose();
      }
    }
    this.activeShells = [];
  }
}
