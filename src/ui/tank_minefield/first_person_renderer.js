/**
 * Tank Minefield: Iron Perimeter — 3D First-Person Viewport Renderer
 * 
 * Features:
 * - Pure native HTML5 Canvas 3D projection engine (zero external dependencies).
 * - Authentic first-person view from inside/atop a green military tank.
 * - Visible tank hull, hatch rim, armored plates, and central recoil cannon barrel.
 * - Four distinctive preset insignias (US White Star, UN Roundel, USSR Red Star, DPRK Roundel).
 * - Perspective ground grid tiles with grass shading and boundary lines.
 * - Persistent exploded-mine craters and shell-impact craters in 3D perspective.
 * - 3D hazard flags, scanned mine beacons, and extraction beacon pillar.
 * - 3D faceted enemy tank model with faction markings in PvP mode.
 * - Particle explosion engine (flash, dirt/debris, smoke) and reduced-motion support.
 */

import { CARDINAL_DIRECTIONS, DIRECTION_VECTORS, CELL_STATE, CRATER_TYPE } from '../../core/tank_minefield/rules_config.js';

export class FirstPersonRenderer {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.reducedMotion = options.reducedMotion || false;

    // Animation & Effect States
    this.recoilOffset = 0; // Cannon barrel recoil
    this.shakeOffset = { x: 0, y: 0 };
    this.shakeIntensity = 0;
    this.particles = [];
    this.flashOpacity = 0;
    this.lastFrameTime = performance.now();

    // Turn & Driving motion dynamics
    this.currentCameraAngle = 0;
    this.targetCameraAngle = 0;
    this.driveBob = 0;
    this.lastTankRow = null;
    this.lastTankCol = null;
    this.lastTankFacing = null;
    this.treadAnimOffset = 0;

    // High-Resolution Artwork & Textures (Processed via PhotoCraft CLI)
    this.skyImage = new Image();
    this.skyImageLoaded = false;
    this.skyImage.onload = () => { this.skyImageLoaded = true; };
    this.skyImage.src = 'assets/tank_minefield/battlefield_sky.webp';

    this.armorImage = new Image();
    this.armorImageLoaded = false;
    this.armorPattern = null;
    this.armorImage.onload = () => {
      this.armorImageLoaded = true;
      try {
        this.armorPattern = this.ctx.createPattern(this.armorImage, 'repeat');
      } catch (e) {}
    };
    this.armorImage.src = 'assets/tank_minefield/tank_armor.webp';
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  triggerExplosion(cellX, cellZ) {
    this.flashOpacity = this.reducedMotion ? 0.2 : 0.85;

    if (!this.reducedMotion) {
      this.shakeIntensity = 18;
    }

    // Spawn 3D debris particles
    const particleCount = this.reducedMotion ? 12 : 45;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x: cellX + (Math.random() - 0.5) * 0.4,
        y: 0.2 + Math.random() * 0.3, // Height off ground
        z: cellZ + (Math.random() - 0.5) * 0.4,
        vx: Math.cos(angle) * speed * 0.05,
        vy: 0.15 + Math.random() * 0.25, // Upward velocity
        vz: Math.sin(angle) * speed * 0.05,
        gravity: 0.008,
        size: 3 + Math.random() * 6,
        color: Math.random() < 0.4 ? '#f97316' : (Math.random() < 0.7 ? '#3e2723' : '#1c1917'),
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        isSmoke: Math.random() < 0.5
      });
    }
  }

  triggerMuzzleFire() {
    this.recoilOffset = 28; // Recoil backward
    this.flashOpacity = this.reducedMotion ? 0.15 : 0.6;
    if (!this.reducedMotion) {
      this.shakeIntensity = 8;
    }
  }

  render(game) {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;

    // Detect driving displacement or turn to trigger kinetic chassis sway
    if (this.lastTankRow !== null && (game.tank.row !== this.lastTankRow || game.tank.col !== this.lastTankCol)) {
      this.driveBob = 1.0;
    }
    if (this.lastTankFacing !== null && game.tank.facing !== this.lastTankFacing) {
      this.driveBob = Math.max(this.driveBob, 0.6);
    }
    this.lastTankRow = game.tank.row;
    this.lastTankCol = game.tank.col;
    this.lastTankFacing = game.tank.facing;

    // 1. Update Animations
    this._updateEffects(dt);

    // Camera heading angle in radians (N: 0, E: PI/2, S: PI, W: 3PI/2)
    const targetAngle = game.tank.facing * (Math.PI / 2);
    // Smooth angle interpolation
    let diff = targetAngle - this.currentCameraAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.currentCameraAngle += diff * Math.min(1, dt * 15);

    ctx.save();
    // Apply camera shake if any
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
    }

    // 2. Render 360° Panoramic Mountains, Sky & Atmospheric Horizon
    this._renderSkyAndHorizon(ctx, width, height);

    // 3. Render 3D Perspective Grid & Terrain Objects
    this._render3DWorld(ctx, width, height, game);

    // 4. Render 3D Explosion Debris & Smoke Particles
    this._renderParticles(ctx, width, height);

    // 5. Render Authentic Cold War Tank Hull, Fenders, Cockpit & Recoil Cannon Barrel
    this._renderTankCockpit(ctx, width, height, game);

    // 6. Flash Overlay
    if (this.flashOpacity > 0.01) {
      ctx.fillStyle = `rgba(255, 200, 100, ${this.flashOpacity})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 7. Tactical HUD Overlay (Compass, Coordinates, Armor, Ammo)
    this._renderHUD(ctx, width, height, game);

    ctx.restore();
  }

  _updateEffects(dt) {
    // Recoil recovery
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dt * 120);
    }

    // Flash decay
    if (this.flashOpacity > 0) {
      this.flashOpacity = Math.max(0, this.flashOpacity - dt * 3.5);
    }

    // Shake decay
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 45);
    }

    // Drive bob decay and tread movement
    if (this.driveBob > 0) {
      this.driveBob = Math.max(0, this.driveBob - dt * 2.2);
    }
    this.treadAnimOffset += dt * 40 * (this.driveBob > 0.05 ? 1.6 : 0.2);

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.vy -= p.gravity;
      p.life -= p.decay;

      if (p.isSmoke) {
        p.size += dt * 8; // Smoke expands
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  _renderSkyAndHorizon(ctx, width, height) {
    const now = performance.now();
    const bobY = this.driveBob * Math.sin(now * 0.012) * 3.5;
    const horizonY = height * 0.44 + bobY;
    const camAngle = this.currentCameraAngle;

    // A. Sky Background (Cinematic Twilight Atmosphere)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#0a141d'); // Deep outer twilight
    skyGrad.addColorStop(0.55, '#172c38'); // Cold tactical atmosphere
    skyGrad.addColorStop(0.85, '#284144'); // Misty amber-teal glow
    skyGrad.addColorStop(1, '#3b5550'); // Horizon twilight band
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY + 2);

    // Parallax PhotoCraft Sky Panorama (if loaded)
    if (this.skyImageLoaded && this.skyImage.complete) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      const skyPanW = width * 1.8;
      // Parallax factor 0.30 for distant celestial dome
      let skyOffset = (- (camAngle / (Math.PI * 2)) * skyPanW) % skyPanW;
      if (skyOffset > 0) skyOffset -= skyPanW;
      for (let ox = skyOffset; ox < width; ox += skyPanW) {
        ctx.drawImage(this.skyImage, ox, 0, skyPanW, horizonY + 12);
      }
      ctx.restore();
    }

    // B. LAYER 1: Distant 360° Alpine Mountain Peaks (Snowcapped, Parallax 0.35)
    // Seamless 360° continuous periodic harmonic series
    ctx.save();
    const farSteps = Math.min(120, Math.floor(width / 6));
    const farPoints = [];

    for (let i = 0; i <= farSteps; i++) {
      const sx = (i / farSteps) * width;
      // Azimuth angle for this vertical screen slice
      let theta = camAngle + ((sx - width / 2) / width) * 1.35;
      while (theta < 0) theta += Math.PI * 2;
      while (theta >= Math.PI * 2) theta -= Math.PI * 2;

      // Harmonic elevation formula
      const hFar = 72 + 36 * Math.sin(3 * theta + 0.6)
                      + 26 * Math.cos(7 * theta + 1.5)
                      + 18 * Math.sin(13 * theta + 2.8)
                      + 12 * Math.abs(Math.cos(23 * theta))
                      + 7 * Math.sin(37 * theta);
      farPoints.push({ x: sx, y: horizonY - hFar, height: hFar });
    }

    // Draw Far Mountain Massifs
    const farGrad = ctx.createLinearGradient(0, horizonY - 140, 0, horizonY);
    farGrad.addColorStop(0, '#15222e');
    farGrad.addColorStop(0.6, '#203340');
    farGrad.addColorStop(1, '#2d4449');
    ctx.fillStyle = farGrad;

    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (const pt of farPoints) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();

    // Snowcaps on majestic high peaks (peaks > 86px)
    ctx.fillStyle = 'rgba(224, 242, 254, 0.72)';
    ctx.beginPath();
    for (let i = 0; i < farPoints.length; i++) {
      const pt = farPoints[i];
      if (pt.height > 86) {
        const capDepth = (pt.height - 86) * 0.45;
        ctx.moveTo(pt.x - 5, pt.y + capDepth);
        ctx.lineTo(pt.x, pt.y);
        ctx.lineTo(pt.x + 5, pt.y + capDepth);
      }
    }
    ctx.fill();
    ctx.restore();

    // C. LAYER 2: Mid-Ground Craggy Volcanic Ridges (Parallax 0.65)
    ctx.save();
    const midSteps = Math.min(100, Math.floor(width / 8));
    const midPoints = [];

    for (let i = 0; i <= midSteps; i++) {
      const sx = (i / midSteps) * width;
      let theta = camAngle + ((sx - width / 2) / width) * 1.75;
      while (theta < 0) theta += Math.PI * 2;
      while (theta >= Math.PI * 2) theta -= Math.PI * 2;

      const hMid = 40 + 24 * Math.cos(4 * theta + 1.8)
                      + 17 * Math.sin(9 * theta + 3.4)
                      + 12 * Math.abs(Math.sin(17 * theta + 0.8))
                      + 8 * Math.cos(31 * theta);
      midPoints.push({ x: sx, y: horizonY - hMid, height: hMid });
    }

    const midGrad = ctx.createLinearGradient(0, horizonY - 80, 0, horizonY);
    midGrad.addColorStop(0, '#101e16');
    midGrad.addColorStop(0.5, '#172b20');
    midGrad.addColorStop(1, '#233d2e');
    ctx.fillStyle = midGrad;

    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (const pt of midPoints) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();

    // Shadow ridges on left facets
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 2; i < midPoints.length - 2; i += 3) {
      const pt = midPoints[i];
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x - 7, pt.y + pt.height * 0.5);
    }
    ctx.stroke();
    ctx.restore();

    // D. LAYER 3: Near Horizon Berms & Defensive Revetments (Parallax 1.0)
    ctx.save();
    const nearSteps = Math.min(80, Math.floor(width / 10));
    ctx.fillStyle = '#17271d';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);

    for (let i = 0; i <= nearSteps; i++) {
      const sx = (i / nearSteps) * width;
      let theta = camAngle + ((sx - width / 2) / width) * 2.25;
      while (theta < 0) theta += Math.PI * 2;
      while (theta >= Math.PI * 2) theta -= Math.PI * 2;

      const hNear = 16 + 9 * Math.sin(5 * theta + 2.1)
                       + 6 * Math.cos(12 * theta + 0.9)
                       + 4 * Math.sin(26 * theta);
      ctx.lineTo(sx, horizonY - hNear);
    }
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // E. 360° ROTATING TACTICAL HORIZON LANDMARKS
    // Distinctive landmarks positioned at specific world bearings that scroll past when turning
    const landmarks = [
      { angle: 0.85, type: 'radar_tower', label: 'RADAR-01 (NE)' },
      { angle: 2.35, type: 'radio_mast', label: 'COMMS (SE)' },
      { angle: 3.95, type: 'fortress_bunker', label: 'BUNKER-A (SW)' },
      { angle: 5.45, type: 'watch_post', label: 'POST-04 (NW)' }
    ];

    ctx.save();
    for (const lm of landmarks) {
      let dAngle = lm.angle - camAngle;
      while (dAngle < -Math.PI) dAngle += Math.PI * 2;
      while (dAngle > Math.PI) dAngle -= Math.PI * 2;

      // Project azimuth to screen X coordinate
      const sx = width / 2 + dAngle * (width / 1.75);
      if (sx >= -40 && sx <= width + 40) {
        if (lm.type === 'radar_tower') {
          // Steel Lattice Radar Tower with blinking beacon
          const towerH = 48;
          ctx.strokeStyle = '#1b2d22';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx - 9, horizonY);
          ctx.lineTo(sx - 3, horizonY - towerH);
          ctx.lineTo(sx + 3, horizonY - towerH);
          ctx.lineTo(sx + 9, horizonY);
          // Cross-bracing
          ctx.moveTo(sx - 7, horizonY - towerH * 0.4);
          ctx.lineTo(sx + 7, horizonY - towerH * 0.4);
          ctx.moveTo(sx - 5, horizonY - towerH * 0.75);
          ctx.lineTo(sx + 5, horizonY - towerH * 0.75);
          ctx.stroke();

          // Radar dish
          ctx.fillStyle = '#223829';
          ctx.beginPath();
          ctx.arc(sx, horizonY - towerH - 4, 7, 0, Math.PI, true);
          ctx.fill();

          // Blinking Red Aviation Beacon
          if (Math.floor(now / 450) % 2 === 0) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(sx, horizonY - towerH - 9, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else if (lm.type === 'radio_mast') {
          // Transmission antenna mast
          const mastH = 58;
          ctx.strokeStyle = '#1a2a20';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(sx, horizonY);
          ctx.lineTo(sx, horizonY - mastH);
          // Guy wires
          ctx.moveTo(sx, horizonY - mastH * 0.8);
          ctx.lineTo(sx - 14, horizonY);
          ctx.moveTo(sx, horizonY - mastH * 0.8);
          ctx.lineTo(sx + 14, horizonY);
          ctx.stroke();

          // Dual Warning Lights
          if (Math.floor(now / 500) % 2 === 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(sx, horizonY - mastH, 2.5, 0, Math.PI * 2);
            ctx.arc(sx, horizonY - mastH * 0.5, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else if (lm.type === 'fortress_bunker') {
          // Reinforced Concrete Perimeter Bunker
          const bW = 28;
          const bH = 14;
          ctx.fillStyle = '#17251d';
          ctx.fillRect(sx - bW / 2, horizonY - bH, bW, bH);
          ctx.strokeStyle = '#0f1813';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx - bW / 2, horizonY - bH, bW, bH);
          // Dark observation slit
          ctx.fillStyle = '#060a08';
          ctx.fillRect(sx - bW / 2 + 4, horizonY - bH + 4, bW - 8, 3);
        } else if (lm.type === 'watch_post') {
          // Elevated guard tower
          const postH = 34;
          ctx.strokeStyle = '#18271e';
          ctx.lineWidth = 2;
          ctx.strokeRect(sx - 8, horizonY - postH, 16, 12);
          ctx.beginPath();
          ctx.moveTo(sx - 6, horizonY);
          ctx.lineTo(sx - 6, horizonY - postH);
          ctx.moveTo(sx + 6, horizonY);
          ctx.lineTo(sx + 6, horizonY - postH);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // F. Atmospheric Horizon Haze line (blends sky seamlessly into 3D ground plane)
    const hazeGrad = ctx.createLinearGradient(0, horizonY - 14, 0, horizonY + 24);
    hazeGrad.addColorStop(0, 'rgba(40, 56, 48, 0)');
    hazeGrad.addColorStop(0.5, 'rgba(40, 56, 48, 0.55)');
    hazeGrad.addColorStop(1, 'rgba(18, 30, 22, 0)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, horizonY - 14, width, 38);
  }

  _render3DWorld(ctx, width, height, game) {
    const horizonY = height * 0.44;
    const fov = width * 0.85; // Focal length
    const cameraHeight = 1.4; // Tank eye level above ground

    const tank = game.tank;
    const facingVec = tank.getFacingVector();

    // Right vector perpendicular to facing
    // N (dr: -1, dc: 0) -> right is E (dr: 0, dc: 1)
    // E (dr: 0, dc: 1)  -> right is S (dr: 1, dc: 0)
    // S (dr: 1, dc: 0)  -> right is W (dr: 0, dc: -1)
    // W (dr: 0, dc: -1) -> right is N (dr: -1, dc: 0)
    const rightVec = { dRow: facingVec.dCol, dCol: -facingVec.dRow };

    // Projection function: world coords (x: right, y: up, z: forward) -> screen (sx, sy)
    const project = (x, y, z) => {
      if (z <= 0.1) return null;
      const sx = width / 2 + (x * fov) / z;
      const sy = horizonY + ((cameraHeight - y) * fov) / z;
      return { x: sx, y: sy, scale: fov / z };
    };

    // Render cells back-to-front (depth = 8 down to 1)
    const maxDepth = 8;
    const halfWidth = 4;

    for (let z = maxDepth; z >= 1; z--) {
      for (let x = -halfWidth; x <= halfWidth; x++) {
        // Calculate cell grid coordinates
        const cellRow = tank.row + facingVec.dRow * z + rightVec.dRow * x;
        const cellCol = tank.col + facingVec.dCol * z + rightVec.dCol * x;

        const cell = game.grid.getCell(cellRow, cellCol);
        if (!cell) {
          // Out of bounds perimeter barrier
          this._renderPerimeterBarrier(ctx, project, x, z);
          continue;
        }

        // Draw Cell Ground Quad
        this._renderGroundCell(ctx, project, cell, x, z);

        // Draw Cell Objects (Crater, Clue, Flag, Mine Hazard, Extraction Beacon)
        this._renderCellObjects(ctx, project, cell, x, z);

        // Check if enemy tank is on this cell in PvP mode
        if (game.opponentTank && game.opponentTank.isAlive) {
          if (game.opponentTank.row === cellRow && game.opponentTank.col === cellCol) {
            this._renderEnemyTank(ctx, project, x, z, game.opponentTank);
          }
        }
      }
    }
  }

  _renderGroundCell(ctx, project, cell, x, z) {
    // 4 Corners of this grid cell in camera space
    // Cell centered at (x, z), extent is 0.5 in each direction
    const p00 = project(x - 0.5, 0, z - 0.5);
    const p10 = project(x + 0.5, 0, z - 0.5);
    const p11 = project(x + 0.5, 0, z + 0.5);
    const p01 = project(x - 0.5, 0, z + 0.5);

    if (!p00 || !p10 || !p11 || !p01) return;

    // Depth fog factor
    const depthFog = Math.max(0.2, 1 - z / 9);

    // Procedural terrain variation using deterministic hash
    const cellHash = (cell.row * 73 + cell.col * 127) % 1000;
    const terrainType = cellHash % 100;
    const isEven = (Math.abs(cell.row) + Math.abs(cell.col)) % 2 === 0;

    let baseColor;
    if (cell.isRevealed()) {
      if (cell.isExtraction) {
        baseColor = isEven ? '#1e482d' : '#173d24'; // Extraction zone bright emerald
      } else {
        // Procedural grass variation: normal grass, darker grass, rocky patches
        if (terrainType < 60) {
          baseColor = isEven ? '#243a29' : '#1d3122'; // Normal grass turf
        } else if (terrainType < 85) {
          baseColor = isEven ? '#1f3324' : '#192a1e'; // Darker grass patches
        } else {
          baseColor = isEven ? '#2a2f27' : '#21251f'; // Rocky dirt patches
        }
      }
    } else {
      // Unexplored fog turf with subtle variation
      if (terrainType < 70) {
        baseColor = isEven ? '#121e15' : '#0e1811';
      } else {
        baseColor = isEven ? '#0f1a13' : '#0c150f'; // Darker fog areas
      }
    }

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fill();

    // Procedural grass clumps and rocky details for revealed cells
    if (cell.isRevealed() && z <= 6) {
      ctx.save();
      const scale = p00.scale;

      // Add grass tufts on grass terrain
      if (terrainType < 85 && cellHash % 3 === 0) {
        const centerX = (p00.x + p10.x + p11.x + p01.x) / 4;
        const centerY = (p00.y + p10.y + p11.y + p01.y) / 4;

        const grassCount = 2 + (cellHash % 4);
        for (let i = 0; i < grassCount; i++) {
          const offsetSeed = cellHash + i * 31;
          const gx = centerX + ((offsetSeed % 60) - 30) * scale * 0.008;
          const gy = centerY + (((offsetSeed * 7) % 60) - 30) * scale * 0.008;

          ctx.fillStyle = `rgba(74, 115, 80, ${0.6 * depthFog})`;
          ctx.fillRect(gx - scale * 0.015, gy - scale * 0.02, scale * 0.03, scale * 0.04);
        }
      }

      // Add rocks on rocky terrain
      if (terrainType >= 85 && cellHash % 5 < 3) {
        const centerX = (p00.x + p10.x + p11.x + p01.x) / 4;
        const centerY = (p00.y + p10.y + p11.y + p01.y) / 4;

        const rockCount = 1 + (cellHash % 3);
        for (let i = 0; i < rockCount; i++) {
          const offsetSeed = cellHash + i * 47;
          const rx = centerX + ((offsetSeed % 70) - 35) * scale * 0.008;
          const ry = centerY + (((offsetSeed * 11) % 70) - 35) * scale * 0.008;
          const rockSize = (3 + (offsetSeed % 4)) * scale * 0.012;

          ctx.fillStyle = `rgba(96, 92, 82, ${0.7 * depthFog})`;
          ctx.beginPath();
          ctx.arc(rx, ry, rockSize, 0, Math.PI * 2);
          ctx.fill();

          // Rock highlight
          ctx.fillStyle = `rgba(140, 135, 120, ${0.4 * depthFog})`;
          ctx.beginPath();
          ctx.arc(rx - rockSize * 0.2, ry - rockSize * 0.2, rockSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // Cell Grid Lines
    ctx.strokeStyle = cell.isRevealed()
      ? `rgba(64, 115, 80, ${0.4 * depthFog})`
      : `rgba(40, 60, 45, ${0.25 * depthFog})`;
    ctx.lineWidth = Math.max(1, (p00.scale / 300));
    ctx.stroke();
  }

  _renderCellObjects(ctx, project, cell, x, z) {
    const centerProj = project(x, 0, z);
    if (!centerProj) return;

    const scale = centerProj.scale;
    const depthFog = Math.max(0.25, 1 - z / 8.5);

    // 1. Persistent Craters (Exploded mines and shell impacts)
    if (cell.crater !== CRATER_TYPE.NONE) {
      const radiusX = (scale * 0.42);
      const radiusY = (scale * 0.18); // Foreshortened on ground plane

      ctx.save();
      // Scorched outer rim
      ctx.fillStyle = cell.crater === CRATER_TYPE.MINE_DETONATION ? '#18120c' : '#221b16';
      ctx.beginPath();
      ctx.ellipse(centerProj.x, centerProj.y, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jagged crater ring
      ctx.strokeStyle = cell.crater === CRATER_TYPE.MINE_DETONATION ? '#ea580c' : '#78716c';
      ctx.lineWidth = Math.max(1.5, scale * 0.035);
      ctx.stroke();

      // Inner deep charcoal pit
      ctx.fillStyle = '#0a0705';
      ctx.beginPath();
      ctx.ellipse(centerProj.x, centerProj.y, radiusX * 0.65, radiusY * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 2. Extraction Zone 3D Beacon
    if (cell.isExtraction) {
      const beaconTop = project(x, 2.5, z);
      if (beaconTop) {
        ctx.save();
        // Golden light beam
        const beamGrad = ctx.createLinearGradient(centerProj.x, centerProj.y, beaconTop.x, beaconTop.y);
        beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.7)');
        beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0.05)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(centerProj.x - scale * 0.25, centerProj.y);
        ctx.lineTo(beaconTop.x - scale * 0.08, beaconTop.y);
        ctx.lineTo(beaconTop.x + scale * 0.08, beaconTop.y);
        ctx.lineTo(centerProj.x + scale * 0.25, centerProj.y);
        ctx.closePath();
        ctx.fill();

        // Beacon Star Marker
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.max(14, scale * 0.35)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ EXTRACTION', beaconTop.x, beaconTop.y - 12);
        ctx.restore();
      }
      return;
    }

    // 3. Scanned Confirmed Mine Hazard
    if (cell.isScannedMine) {
      const flagTop = project(x, 0.7, z);
      if (flagTop) {
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(2, scale * 0.03);
        ctx.beginPath();
        ctx.moveTo(centerProj.x, centerProj.y);
        ctx.lineTo(flagTop.x, flagTop.y);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${Math.max(12, scale * 0.32)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ MINE', flagTop.x, flagTop.y - 4);
        ctx.restore();
      }
      return;
    }

    // 4. Flagged Confirmed/Suspected Mine (includes auto-flagged scanned mines)
    if (cell.isFlagged()) {
      const flagTop = project(x, 0.75, z);
      const flagMid = project(x, 0.35, z);
      if (flagTop && flagMid) {
        ctx.save();

        // Pole (thicker, metallic silver)
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(3, scale * 0.04);
        ctx.beginPath();
        ctx.moveTo(centerProj.x, centerProj.y);
        ctx.lineTo(flagTop.x, flagTop.y);
        ctx.stroke();

        // Pole shadow line
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(1.5, scale * 0.02);
        ctx.beginPath();
        ctx.moveTo(centerProj.x + scale * 0.015, centerProj.y);
        ctx.lineTo(flagTop.x + scale * 0.015, flagTop.y);
        ctx.stroke();

        // Triangular flag (bright yellow-orange, scanned mines)
        const flagWidth = scale * 0.35;
        const flagHeight = scale * 0.22;

        // Flag shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(flagTop.x + scale * 0.01, flagTop.y + scale * 0.01);
        ctx.lineTo(flagTop.x + flagWidth + scale * 0.01, flagMid.y + scale * 0.01);
        ctx.lineTo(flagTop.x + scale * 0.01, flagMid.y + flagHeight + scale * 0.01);
        ctx.closePath();
        ctx.fill();

        // Main flag (gradient for 3D depth)
        const flagGrad = ctx.createLinearGradient(flagTop.x, flagTop.y, flagTop.x + flagWidth, flagMid.y);
        flagGrad.addColorStop(0, '#fbbf24');
        flagGrad.addColorStop(0.5, '#f59e0b');
        flagGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = flagGrad;
        ctx.beginPath();
        ctx.moveTo(flagTop.x, flagTop.y);
        ctx.lineTo(flagTop.x + flagWidth, flagMid.y);
        ctx.lineTo(flagTop.x, flagMid.y + flagHeight);
        ctx.closePath();
        ctx.fill();

        // Flag outline for definition
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = Math.max(1, scale * 0.015);
        ctx.stroke();

        // Hazard warning text above flag
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.font = `bold ${Math.max(10, scale * 0.28)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.strokeText('⚠ FLAGGED', flagTop.x, flagTop.y - scale * 0.08);
        ctx.fillText('⚠ FLAGGED', flagTop.x, flagTop.y - scale * 0.08);

        ctx.restore();
      }
      return;
    }

    // 5. Revealed Clue Numbers
    if (cell.isRevealed() && cell.adjacentMines > 0) {
      const clueColors = [
        '#60a5fa', '#4ade80', '#f87171', '#c084fc',
        '#fb923c', '#2dd4bf', '#f43f5e', '#e2e8f0'
      ];
      ctx.save();
      ctx.fillStyle = clueColors[cell.adjacentMines - 1] || '#ffffff';
      ctx.font = `bold ${Math.max(11, scale * 0.38)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(cell.adjacentMines.toString(), centerProj.x, centerProj.y - scale * 0.05);
      ctx.restore();
    }
  }

  _renderEnemyTank(ctx, project, x, z, enemyTank) {
    const baseProj = project(x, 0, z);
    const topProj = project(x, 1.2, z);
    if (!baseProj || !topProj) return;

    const scale = baseProj.scale;
    const widthHull = scale * 0.75;
    const heightHull = baseProj.y - topProj.y;

    ctx.save();

    // Shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(baseProj.x, baseProj.y, widthHull * 0.6, widthHull * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tank Hull (Armored Box)
    ctx.fillStyle = enemyTank.preset.primaryColor || '#2b442b';
    ctx.fillRect(baseProj.x - widthHull / 2, baseProj.y - heightHull * 0.65, widthHull, heightHull * 0.5);
    ctx.strokeStyle = '#152417';
    ctx.lineWidth = Math.max(1.5, scale * 0.03);
    ctx.strokeRect(baseProj.x - widthHull / 2, baseProj.y - heightHull * 0.65, widthHull, heightHull * 0.5);

    // Treads Left & Right
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(baseProj.x - widthHull / 2 - scale * 0.08, baseProj.y - heightHull * 0.45, scale * 0.12, heightHull * 0.4);
    ctx.fillRect(baseProj.x + widthHull / 2 - scale * 0.04, baseProj.y - heightHull * 0.45, scale * 0.12, heightHull * 0.4);

    // Turret Dome
    const turretRadius = widthHull * 0.28;
    ctx.fillStyle = enemyTank.preset.primaryColor || '#2b442b';
    ctx.beginPath();
    ctx.arc(baseProj.x, baseProj.y - heightHull * 0.7, turretRadius, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Gun Barrel pointing towards player
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(baseProj.x - scale * 0.035, baseProj.y - heightHull * 0.72, scale * 0.07, scale * 0.35);

    // Faction Emblem Badge on Turret
    ctx.fillStyle = enemyTank.preset.accentColor || '#ef4444';
    ctx.font = `bold ${Math.max(8, scale * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(enemyTank.preset.insignia.split(' ')[0], baseProj.x, baseProj.y - heightHull * 0.75);

    // Enemy Name Tag
    ctx.fillStyle = '#f87171';
    ctx.font = `bold ${Math.max(10, scale * 0.2)}px sans-serif`;
    ctx.fillText(`⚔️ ${enemyTank.name}`, baseProj.x, baseProj.y - heightHull * 1.15);

    ctx.restore();
  }

  _renderPerimeterBarrier(ctx, project, x, z) {
    const pBase = project(x, 0, z);
    const pTop = project(x, 0.8, z);
    if (!pBase || !pTop) return;

    const scale = pBase.scale;
    // Military warning fence post
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.6)';
    ctx.lineWidth = Math.max(2, scale * 0.035);
    ctx.beginPath();
    ctx.moveTo(pBase.x, pBase.y);
    ctx.lineTo(pTop.x, pTop.y);
    ctx.stroke();

    // Warning stripe sign
    ctx.fillStyle = '#b45309';
    ctx.fillRect(pTop.x - scale * 0.12, pTop.y, scale * 0.24, scale * 0.1);
  }

  _renderParticles(ctx, width, height) {
    const horizonY = height * 0.44;
    const fov = width * 0.85;

    for (const p of this.particles) {
      if (p.z <= 0.1) continue;
      const sx = width / 2 + (p.x * fov) / p.z;
      const sy = horizonY + ((1.4 - p.y) * fov) / p.z;
      const size = (p.size * fov) / (p.z * 180);

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.5, size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _renderTankCockpit(ctx, width, height, game) {
    const now = performance.now();
    const bobY = this.driveBob * Math.sin(now * 0.015) * 4;
    const centerX = width / 2;
    const tank = game.tank;
    const preset = tank.preset;
    const presetId = preset.id || 'US';

    ctx.save();

    // ------------------------------------------------------------------------
    // 1. LEFT & RIGHT HEAVY ARMORED TRACK FENDERS (MUDGUARDS)
    // ------------------------------------------------------------------------
    const fenderTopY = height * 0.69 + bobY;
    const leftFenderW = width * 0.22;
    const rightFenderX = width * 0.78;

    // A. Left Track Fender
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, fenderTopY + 12);
    ctx.lineTo(leftFenderW * 0.7, fenderTopY);
    ctx.lineTo(leftFenderW, fenderTopY + 8);
    ctx.lineTo(leftFenderW * 0.95, height);
    ctx.closePath();

    const leftFenderGrad = ctx.createLinearGradient(0, fenderTopY, leftFenderW, height);
    leftFenderGrad.addColorStop(0, '#1c281e');
    leftFenderGrad.addColorStop(0.3, preset.primaryColor || '#3d5236');
    leftFenderGrad.addColorStop(0.8, '#141d16');
    leftFenderGrad.addColorStop(1, '#0a0f0b');
    ctx.fillStyle = leftFenderGrad;
    ctx.fill();

    // Left Fender Metallic Edge & Rivets
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Left Fender Animated Steel Track Treads (outer 15% strip)
    ctx.fillStyle = '#121714';
    ctx.fillRect(0, fenderTopY + 16, width * 0.045, height - fenderTopY - 16);
    ctx.strokeStyle = '#2b382e';
    ctx.lineWidth = 2;
    const treadSpacing = 16;
    const tOffset = (this.treadAnimOffset || 0) % treadSpacing;
    for (let ty = fenderTopY + 20 + tOffset; ty < height; ty += treadSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, ty);
      ctx.lineTo(width * 0.045, ty - 4);
      ctx.stroke();
    }

    // Left Fender Rubber Mudflap at corner
    ctx.fillStyle = '#0f1411';
    ctx.fillRect(0, height - 32, width * 0.08, 32);
    ctx.strokeStyle = '#2d3b31';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, height - 32, width * 0.08, 32);

    // Left Fender Armored Stowage Box
    ctx.fillStyle = '#1e2b20';
    ctx.fillRect(width * 0.055, fenderTopY + 28, width * 0.12, height * 0.12);
    ctx.strokeStyle = '#0b110c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(width * 0.055, fenderTopY + 28, width * 0.12, height * 0.12);
    ctx.restore();

    // B. Right Track Fender
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width, fenderTopY + 12);
    ctx.lineTo(width - leftFenderW * 0.7, fenderTopY);
    ctx.lineTo(rightFenderX, fenderTopY + 8);
    ctx.lineTo(rightFenderX + leftFenderW * 0.05, height);
    ctx.closePath();

    const rightFenderGrad = ctx.createLinearGradient(width, fenderTopY, rightFenderX, height);
    rightFenderGrad.addColorStop(0, '#1c281e');
    rightFenderGrad.addColorStop(0.3, preset.primaryColor || '#3d5236');
    rightFenderGrad.addColorStop(0.8, '#141d16');
    rightFenderGrad.addColorStop(1, '#0a0f0b');
    ctx.fillStyle = rightFenderGrad;
    ctx.fill();

    // Right Fender Metallic Edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Right Fender Animated Steel Track Treads (outer 15% strip)
    ctx.fillStyle = '#121714';
    ctx.fillRect(width - width * 0.045, fenderTopY + 16, width * 0.045, height - fenderTopY - 16);
    ctx.strokeStyle = '#2b382e';
    ctx.lineWidth = 2;
    for (let ty = fenderTopY + 20 + tOffset; ty < height; ty += treadSpacing) {
      ctx.beginPath();
      ctx.moveTo(width - width * 0.045, ty - 4);
      ctx.lineTo(width, ty);
      ctx.stroke();
    }

    // Right Fender Rubber Mudflap
    ctx.fillStyle = '#0f1411';
    ctx.fillRect(width - width * 0.08, height - 32, width * 0.08, 32);
    ctx.strokeStyle = '#2d3b31';
    ctx.lineWidth = 2;
    ctx.strokeRect(width - width * 0.08, height - 32, width * 0.08, 32);

    // Right Fender Pioneer Tools / Unditching Beam
    if (presetId === 'USSR') {
      // Authentic Soviet Unditching Beam Log
      ctx.fillStyle = '#452c16';
      ctx.fillRect(rightFenderX + 8, fenderTopY + 32, width * 0.12, 14);
      ctx.strokeStyle = '#1a0f07';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rightFenderX + 8, fenderTopY + 32, width * 0.12, 14);
    } else {
      ctx.fillStyle = '#1e2b20';
      ctx.fillRect(rightFenderX + 8, fenderTopY + 28, width * 0.12, height * 0.12);
      ctx.strokeStyle = '#0b110c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rightFenderX + 8, fenderTopY + 28, width * 0.12, height * 0.12);
    }
    ctx.restore();

    // ------------------------------------------------------------------------
    // 2. MAIN COLD-WAR FRONT GLACIS HULL PLATE
    // ------------------------------------------------------------------------
    // Raised to height * 0.74 so the tank is clearly, proudly visible
    const glacisY = height * 0.74 + bobY;
    const glacisLeft = width * 0.18;
    const glacisRight = width * 0.82;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(width * 0.06, height);
    ctx.lineTo(glacisLeft, glacisY);
    ctx.lineTo(glacisRight, glacisY);
    ctx.lineTo(width * 0.94, height);
    ctx.closePath();
    ctx.clip();

    // Base Faction Military Finish
    ctx.fillStyle = preset.primaryColor || '#3d5236';
    ctx.fillRect(0, glacisY, width, height - glacisY);

    // Faction Specific Pattern / Texture
    if (presetId === 'NORTH_KOREA') {
      // Woodland Camouflage Blotches for DPRK Chonma-Ho Type 68
      ctx.fillStyle = '#223824';
      ctx.beginPath();
      ctx.ellipse(width * 0.32, glacisY + 45, 65, 35, 0.4, 0, Math.PI * 2);
      ctx.ellipse(width * 0.68, glacisY + 60, 75, 40, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a321d'; // Dark ochre camo
      ctx.beginPath();
      ctx.ellipse(width * 0.50, glacisY + 70, 50, 30, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (presetId === 'UN') {
      // British UN Peacekeeper Cyan Identification Stripes
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(width * 0.22, glacisY, 12, height - glacisY);
      ctx.fillRect(width * 0.76, glacisY, 12, height - glacisY);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(width * 0.235, glacisY, 4, height - glacisY);
      ctx.fillRect(width * 0.775, glacisY, 4, height - glacisY);
    }

    // Cast Homogenous Armor Plate Texture Overlay (PhotoCraft Processed)
    if (this.armorImageLoaded && this.armorImage.complete) {
      if (!this.armorPattern) {
        try {
          this.armorPattern = ctx.createPattern(this.armorImage, 'repeat');
        } catch (e) {}
      }
      if (this.armorPattern) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = this.armorPattern;
        ctx.fillRect(0, glacisY, width, height - glacisY);
        ctx.globalAlpha = 1.0;
      }
    }

    // Armored Glacis Depth & Bevel Gradient
    const hullGrad = ctx.createLinearGradient(0, glacisY, 0, height);
    hullGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)'); // Top crest highlight
    hullGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.05)');
    hullGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
    hullGrad.addColorStop(1, 'rgba(0, 0, 0, 0.75)'); // Deep shadow near foot well
    ctx.fillStyle = hullGrad;
    ctx.fillRect(0, glacisY, width, height - glacisY);

    // Soviet T-55A Cast Weld Seams
    if (presetId === 'USSR') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(glacisLeft + 25, glacisY + 15);
      ctx.lineTo(glacisRight - 25, glacisY + 15);
      ctx.stroke();
    }

    ctx.restore();

    // Glacis Plate Rim & Highlight Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.06, height);
    ctx.lineTo(glacisLeft, glacisY);
    ctx.lineTo(glacisRight, glacisY);
    ctx.lineTo(width * 0.94, height);
    ctx.stroke();

    // ------------------------------------------------------------------------
    // 3. DRIVER PERISCOPES & VISION BLOCKS
    // ------------------------------------------------------------------------
    // Dual armored periscope prism blocks along the glacis edge
    const periscopeW = 34;
    const periscopeH = 14;
    const periY = glacisY - 4;

    // Left Periscope
    ctx.save();
    ctx.fillStyle = '#152018';
    ctx.fillRect(width * 0.32 - periscopeW / 2, periY, periscopeW, periscopeH);
    ctx.strokeStyle = '#2c3e30';
    ctx.lineWidth = 2;
    ctx.strokeRect(width * 0.32 - periscopeW / 2, periY, periscopeW, periscopeH);
    // Multi-coated armored prism glass reflection (amber/cyan)
    const glassGradL = ctx.createLinearGradient(0, periY + 2, 0, periY + periscopeH - 2);
    glassGradL.addColorStop(0, '#f59e0b');
    glassGradL.addColorStop(1, '#0284c7');
    ctx.fillStyle = glassGradL;
    ctx.fillRect(width * 0.32 - periscopeW / 2 + 3, periY + 3, periscopeW - 6, periscopeH - 6);

    // Right Periscope
    ctx.fillStyle = '#152018';
    ctx.fillRect(width * 0.68 - periscopeW / 2, periY, periscopeW, periscopeH);
    ctx.strokeStyle = '#2c3e30';
    ctx.strokeRect(width * 0.68 - periscopeW / 2, periY, periscopeW, periscopeH);
    ctx.fillStyle = glassGradL;
    ctx.fillRect(width * 0.68 - periscopeW / 2 + 3, periY + 3, periscopeW - 6, periscopeH - 6);
    ctx.restore();

    // ------------------------------------------------------------------------
    // 4. AUTHENTIC COLD-WAR FACTION INSIGNIA & MARKINGS
    // ------------------------------------------------------------------------
    ctx.save();
    const stencily = glacisY + 44;

    if (presetId === 'US') {
      // US M48-A2 Patton: White Allied Star in circle
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Circular stencil ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width * 0.28, stencily, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('★', width * 0.28, stencily + 1);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'left';
      ctx.fillText('U.S. ARMY', width * 0.28 + 24, stencily - 5);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('M48-A2 PATTON', width * 0.28 + 24, stencily + 9);
    } else if (presetId === 'UN') {
      // UN Centurion: Cyan Peacekeeper Globe Roundel
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('🌐', width * 0.28, stencily);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText('UN FORCES', width * 0.28 + 22, stencily - 5);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText('CENTURION MK-5', width * 0.28 + 22, stencily + 9);
    } else if (presetId === 'USSR') {
      // Soviet T-55A: Crimson Guards Red Star with Gold Outline
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px sans-serif';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.fillText('★', width * 0.28, stencily);
      ctx.shadowBlur = 0;

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText('Т-55А ГВАРДИЯ', width * 0.28 + 22, stencily - 5);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText('IRON BASTION', width * 0.28 + 22, stencily + 9);
    } else if (presetId === 'NORTH_KOREA') {
      // DPRK Chonma-Ho Type 68: Tri-Color Roundel
      ctx.fillStyle = '#3b82f6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('🎖️', width * 0.28, stencily);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#f87171';
      ctx.textAlign = 'left';
      ctx.fillText('CHONMA-HO', width * 0.28 + 22, stencily - 5);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText('TYPE 68 ARMORED', width * 0.28 + 22, stencily + 9);
    }
    ctx.restore();

    // ------------------------------------------------------------------------
    // 5. FUNCTIONAL COCKPIT INSTRUMENT DIALS (LEFT & RIGHT)
    // ------------------------------------------------------------------------
    // Left: Real-Time Rotating Magnetic Compass Dial
    ctx.save();
    const compassX = width * 0.13;
    const compassY = height * 0.86;
    const dialR = 24;

    ctx.fillStyle = 'rgba(12, 18, 14, 0.9)';
    ctx.beginPath();
    ctx.arc(compassX, compassY, dialR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating Compass Card
    ctx.save();
    ctx.translate(compassX, compassY);
    ctx.rotate(-this.currentCameraAngle); // Rotates with camera
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, -dialR + 7);
    ctx.fillText('S', 0, dialR - 7);
    ctx.fillText('E', dialR - 7, 0);
    ctx.fillText('W', -dialR + 7, 0);
    ctx.restore();

    // Fixed Heading Pointer (Red Needle)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - dialR + 3);
    ctx.lineTo(compassX - 3.5, compassY - dialR + 10);
    ctx.lineTo(compassX + 3.5, compassY - dialR + 10);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText('COMPASS', compassX, compassY + dialR + 11);
    ctx.restore();

    // Right: Ballistic Armor Plating Meter
    ctx.save();
    const meterX = width * 0.87;
    const meterY = height * 0.86;

    ctx.fillStyle = 'rgba(12, 18, 14, 0.9)';
    ctx.beginPath();
    ctx.arc(meterX, meterY, dialR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3 Armor Plating Arcs
    for (let i = 0; i < 3; i++) {
      const startA = Math.PI * 0.75 + (i * Math.PI * 0.5);
      const endA = startA + Math.PI * 0.42;
      ctx.beginPath();
      ctx.arc(meterX, meterY, dialR - 6, startA, endA);
      ctx.strokeStyle = i < tank.armor ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${tank.armor}/3`, meterX, meterY);

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('ARMOR', meterX, meterY + dialR + 11);
    ctx.restore();

    // ------------------------------------------------------------------------
    // 6. CENTRAL GUN BARREL (PERSPECTIVE-FORESHORTENED HORIZONTAL CANNON)
    // ------------------------------------------------------------------------
    // Authentic 105mm rifled cannon barrel extending horizontally across tank
    const recoilShift = this.recoilOffset * 0.35;
    const baseW = Math.max(52, Math.min(84, width * 0.048)); // Thick base near your feet
    const tipW = Math.max(7, Math.round(baseW * 0.13));       // Tapers down at distant tip (~7-11px)
    const baseY = height + recoilShift * 0.3;                 // Starts right at your feet
    const tipY = height * 0.69 + recoilShift * 0.45;          // Compact forward horizontal reach

    // A. Turret Gun Mantlet / Breech Collar
    ctx.save();
    const mantletW = baseW * 1.55;
    const mantletGrad = ctx.createLinearGradient(0, height * 0.90, 0, height);
    mantletGrad.addColorStop(0, '#2b3b2d');
    mantletGrad.addColorStop(0.5, '#18241a');
    mantletGrad.addColorStop(1, '#0c140e');
    ctx.fillStyle = mantletGrad;

    ctx.beginPath();
    ctx.moveTo(centerX - mantletW * 0.5, height);
    ctx.lineTo(centerX - mantletW * 0.38, height * 0.92 + recoilShift * 0.2);
    ctx.lineTo(centerX + mantletW * 0.38, height * 0.92 + recoilShift * 0.2);
    ctx.lineTo(centerX + mantletW * 0.5, height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#080d09';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mantlet Rim Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.moveTo(centerX - mantletW * 0.36, height * 0.925 + recoilShift * 0.2);
    ctx.lineTo(centerX + mantletW * 0.36, height * 0.925 + recoilShift * 0.2);
    ctx.stroke();

    // B. Main Tapered Barrel Tube (Horizontal cylinder in 3D perspective)
    const barrelGrad = ctx.createLinearGradient(centerX - baseW * 0.5, 0, centerX + baseW * 0.5, 0);
    barrelGrad.addColorStop(0, '#0f1610');
    barrelGrad.addColorStop(0.22, '#273628');
    barrelGrad.addColorStop(0.46, '#567558'); // Top crest specular highlight
    barrelGrad.addColorStop(0.72, '#253426');
    barrelGrad.addColorStop(1, '#0a0f0b');
    ctx.fillStyle = barrelGrad;

    ctx.beginPath();
    ctx.moveTo(centerX - tipW * 0.5, tipY);     // Distant muzzle tip (left)
    ctx.lineTo(centerX + tipW * 0.5, tipY);     // Distant muzzle tip (right)
    ctx.lineTo(centerX + baseW * 0.5, baseY);   // Base near feet (right)
    ctx.lineTo(centerX - baseW * 0.5, baseY);   // Base near feet (left)
    ctx.closePath();
    ctx.fill();

    // Longitudinal metallic edges
    ctx.strokeStyle = '#060a07';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top Crest Specular Highlight Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(1.5, tipW * 0.3);
    ctx.beginPath();
    ctx.moveTo(centerX - tipW * 0.08, tipY + 2);
    ctx.lineTo(centerX - baseW * 0.08, baseY - 4);
    ctx.stroke();

    // C. Bore Evacuator / Fume Extractor (Horizontal cylindrical sleeve along barrel)
    const fumeT = 0.44;
    const fumeY = baseY + (tipY - baseY) * fumeT;
    const fumeW = (baseW + (tipW - baseW) * fumeT) * 1.34;
    const fumeH = Math.max(6, (baseY - tipY) * 0.12);

    const fumeGrad = ctx.createLinearGradient(centerX - fumeW * 0.5, 0, centerX + fumeW * 0.5, 0);
    fumeGrad.addColorStop(0, '#111712');
    fumeGrad.addColorStop(0.45, '#3e5440');
    fumeGrad.addColorStop(1, '#0b100c');
    ctx.fillStyle = fumeGrad;
    ctx.fillRect(centerX - fumeW * 0.5, fumeY - fumeH * 0.5, fumeW, fumeH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - fumeW * 0.5, fumeY - fumeH * 0.5, fumeW, fumeH);

    // D. Distant Muzzle Brake & Bore Opening
    const brakeW = tipW * 1.5;
    const brakeH = Math.max(3.5, tipW * 0.65);
    ctx.fillStyle = '#0e140f';
    ctx.fillRect(centerX - brakeW * 0.5, tipY - brakeH * 0.5, brakeW, brakeH);

    // Dark Bore Opening
    ctx.fillStyle = '#010302';
    ctx.beginPath();
    ctx.ellipse(centerX, tipY - brakeH * 0.15, tipW * 0.38, tipW * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // E. Muzzle Flash on Cannon Firing
    if (this.recoilOffset > 8) {
      const flashScale = Math.min(1, this.recoilOffset / 20);
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(centerX, tipY - brakeH * 0.5 - 5 * flashScale, (tipW * 2.8) * flashScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, tipY - brakeH * 0.5 - 3 * flashScale, (tipW * 1.4) * flashScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  }

  _renderHUD(ctx, width, height, game) {
    const tank = game.tank;
    const curCell = game.grid.getCell(tank.row, tank.col);

    ctx.save();

    // 1. Top Heading Compass Ribbon
    const compassW = 200;
    const compassX = (width - compassW) / 2;
    ctx.fillStyle = 'rgba(10, 16, 12, 0.75)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(compassX, 10, compassW, 28);
    ctx.strokeRect(compassX, 10, compassW, 28);

    const facingNames = ['NORTH (000°)', 'EAST (090°)', 'SOUTH (180°)', 'WEST (270°)'];
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HEAD: ${facingNames[tank.facing]}`, width / 2, 24);

    // 2. Current Coordinates & Sector Info (Top Left)
    ctx.fillStyle = 'rgba(10, 16, 12, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.fillRect(16, 14, 180, 56);
    ctx.strokeRect(16, 14, 180, 56);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SECTOR: [R:${tank.row}, C:${tank.col}]`, 26, 32);

    // Hazard Alert if adjacent mines > 0
    if (curCell && curCell.adjacentMines > 0) {
      ctx.fillStyle = '#f87171';
      ctx.fillText(`⚠️ PROXIMITY: ${curCell.adjacentMines} MINES`, 26, 52);
    } else {
      ctx.fillStyle = '#4ade80';
      ctx.fillText(`✓ SECTOR CLEAR: 0 MINES`, 26, 52);
    }

    // 3. Tank Armor & Shell Status (Stacked under Sector info on Top Left)
    const statusBoxW = 180;
    const statusBoxX = 16;
    const statusBoxY = 76;

    ctx.fillStyle = 'rgba(10, 16, 12, 0.85)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillRect(statusBoxX, statusBoxY, statusBoxW, 76);
    ctx.strokeRect(statusBoxX, statusBoxY, statusBoxW, 76);

    // Armor Pips
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ARMOR HULL PLATING:', statusBoxX + 10, statusBoxY + 18);

    for (let i = 0; i < 3; i++) {
      const pipX = statusBoxX + 10 + i * 36;
      const pipY = statusBoxY + 24;
      ctx.fillStyle = i < tank.armor ? '#22c55e' : '#ef4444';
      ctx.fillRect(pipX, pipY, 30, 8);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.strokeRect(pipX, pipY, 30, 8);
    }

    // Shell Ammunition Indicator (PvP Mode)
    if (game.mode === 'pvp') {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('105mm AP SHELL (1-SHOT):', statusBoxX + 10, statusBoxY + 48);
      if (tank.hasAmmo()) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('● READY [ENTER TO FIRE]', statusBoxX + 10, statusBoxY + 64);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('○ SPENT (0/1)', statusBoxX + 10, statusBoxY + 64);
      }
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('RADAR SCANNER:', statusBoxX + 10, statusBoxY + 48);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('[SPACE] SCAN CELL AHEAD', statusBoxX + 10, statusBoxY + 64);
    }

    ctx.restore();
  }
}
