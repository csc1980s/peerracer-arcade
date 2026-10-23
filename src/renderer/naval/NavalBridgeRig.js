/**
 * Naval Bridge Rig — First-Person Command Bridge & Warship Cockpit
 *
 * Provides an authentic, tactile first-person command post:
 * - Armored bridge bulkhead with reinforced window frames & rivets
 * - Brass compass binnacle with glowing compass dial
 * - Wooden & brass 8-spoke ship's helm wheel
 * - Twin-lever naval engine order telegraph
 * - Circular P-7 phosphor CRT radar scope with rotating sweep line & contacts
 * - Forward forecastle deck with swiveling 16-inch triple-gun battery that tracks targets
 */

import * as THREE from 'three';

export class NavalBridgeRig extends THREE.Group {
  constructor(options = {}) {
    super();

    this.options = {
      bridgeWidth: 16.0,
      bridgeHeight: 7.0,
      bridgeDepth: 8.0,
      ...options
    };

    this.radarContacts = [];
    this.radarSweepAngle = 0;
    this.turretTargetBearing = 0;
    this.turretCurrentBearing = 0;
    this.turretRecoil = 0;

    this._initMaterials();
    this._buildBridgeBulkhead();
    this._buildHelmAndBinnacle();
    this._buildEngineTelegraph();
    this._buildRadarCRT();
    this._buildForecastleDeck();
  }

  _initMaterials() {
    // Weathered bridge interior paint (Navy Olive-Drab / Haze Grey)
    this.bulkheadMat = new THREE.MeshStandardMaterial({
      color: 0x242d38,
      roughness: 0.85,
      metalness: 0.25
    });

    // Darker framing & rivets
    this.frameMat = new THREE.MeshStandardMaterial({
      color: 0x181f26,
      roughness: 0.7,
      metalness: 0.5
    });

    // Polished Brass (Binnacle, Telegraph, Fittings)
    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.85
    });

    // Polished Helm Wood (Teak / Mahogany)
    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c2c16,
      roughness: 0.6,
      metalness: 0.1
    });

    // Glass Viewport
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88bbdd,
      transparent: true,
      opacity: 0.18,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      ior: 1.5
    });

    // Phosphor Green CRT Glass (P-7 Radar)
    this.crtFaceMat = new THREE.MeshBasicMaterial({
      color: 0x052e16
    });

    // CRT Screen Phosphor Glow Canvas Texture
    this.radarCanvas = document.createElement('canvas');
    this.radarCanvas.width = 256;
    this.radarCanvas.height = 256;
    this.radarCtx = this.radarCanvas.getContext('2d');
    this.radarTexture = new THREE.CanvasTexture(this.radarCanvas);

    this.radarDisplayMat = new THREE.MeshBasicMaterial({
      map: this.radarTexture,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    // Gun Turret Steel Armor
    this.turretMat = new THREE.MeshStandardMaterial({
      color: 0x3b4654,
      roughness: 0.65,
      metalness: 0.4
    });

    // Gun Barrels
    this.barrelMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.45,
      metalness: 0.75
    });
  }

  // ============================================================================
  // 1. ARMORED BRIDGE BULKHEAD & WINDOWS
  // ============================================================================

  _buildBridgeBulkhead() {
    this.bulkheadGroup = new THREE.Group();

    // Front Main Sill (Lower Console Bulkhead)
    const sillGeo = new THREE.BoxGeometry(16, 2.0, 1.8);
    const sill = new THREE.Mesh(sillGeo, this.bulkheadMat);
    sill.position.set(0, -0.6, -2.8);
    this.bulkheadGroup.add(sill);

    // Front Window Armor Pillars (3 wide observation panes)
    const pillarPositions = [-6.5, -2.2, 2.2, 6.5];
    pillarPositions.forEach(x => {
      const pillarGeo = new THREE.BoxGeometry(0.5, 3.2, 0.4);
      const pillar = new THREE.Mesh(pillarGeo, this.frameMat);
      pillar.position.set(x, 1.8, -2.8);
      this.bulkheadGroup.add(pillar);
    });

    // Upper Header Armor Plate
    const headerGeo = new THREE.BoxGeometry(16, 1.4, 1.6);
    const header = new THREE.Mesh(headerGeo, this.bulkheadMat);
    header.position.set(0, 3.8, -2.7);
    this.bulkheadGroup.add(header);

    // Armor Roof (Overhead bulkhead with rivets)
    const roofGeo = new THREE.BoxGeometry(16, 0.6, 6.5);
    const roof = new THREE.Mesh(roofGeo, this.bulkheadMat);
    roof.position.set(0, 4.2, 0);
    this.bulkheadGroup.add(roof);

    // Bridge Floor (Steel non-skid plating)
    const floorGeo = new THREE.BoxGeometry(16, 0.5, 7.0);
    const floor = new THREE.Mesh(floorGeo, this.frameMat);
    floor.position.set(0, -1.8, 0);
    this.bulkheadGroup.add(floor);

    // Port & Starboard Wing Walls
    const wallGeo = new THREE.BoxGeometry(0.6, 6.0, 7.0);
    const portWall = new THREE.Mesh(wallGeo, this.bulkheadMat);
    portWall.position.set(-8.0, 1.0, 0);
    this.bulkheadGroup.add(portWall);

    const stbdWall = new THREE.Mesh(wallGeo, this.bulkheadMat);
    stbdWall.position.set(8.0, 1.0, 0);
    this.bulkheadGroup.add(stbdWall);

    // Reinforced Glass Panes
    const windowPanes = [-4.35, 0, 4.35];
    windowPanes.forEach(x => {
      const paneGeo = new THREE.PlaneGeometry(3.8, 2.6);
      const pane = new THREE.Mesh(paneGeo, this.glassMat);
      pane.position.set(x, 1.8, -2.78);
      this.bulkheadGroup.add(pane);

      // Brass wiper arm
      const wiperGeo = new THREE.BoxGeometry(0.08, 1.4, 0.05);
      const wiper = new THREE.Mesh(wiperGeo, this.brassMat);
      wiper.position.set(x + 0.4, 2.0, -2.74);
      wiper.rotation.z = 0.25;
      this.bulkheadGroup.add(wiper);
    });

    this.add(this.bulkheadGroup);
  }

  // ============================================================================
  // 2. HELM WHEEL & BRASS COMPASS BINNACLE
  // ============================================================================

  _buildHelmAndBinnacle() {
    this.helmConsole = new THREE.Group();
    this.helmConsole.position.set(0, -0.6, -2.0);

    // Pedestal
    const pedGeo = new THREE.CylinderGeometry(0.45, 0.6, 1.5, 12);
    const ped = new THREE.Mesh(pedGeo, this.bulkheadMat);
    ped.position.set(0, 0, 0);
    this.helmConsole.add(ped);

    // Brass Compass Binnacle (left of helm)
    const binnacleGroup = new THREE.Group();
    binnacleGroup.position.set(-1.8, 0.2, 0);

    const binnacleBaseGeo = new THREE.CylinderGeometry(0.3, 0.38, 1.4, 12);
    const binnacleBase = new THREE.Mesh(binnacleBaseGeo, this.brassMat);
    binnacleGroup.add(binnacleBase);

    // Compass Hood / Helmet
    const hoodGeo = new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hood = new THREE.Mesh(hoodGeo, this.brassMat);
    hood.position.set(0, 0.7, 0);
    binnacleGroup.add(hood);

    // Compensating iron balls (Kelvin's balls: Red to port, Green to stbd)
    const ballGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const portBallMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const stbdBallMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });

    const portBall = new THREE.Mesh(ballGeo, portBallMat);
    portBall.position.set(-0.48, 0.7, 0);
    binnacleGroup.add(portBall);

    const stbdBall = new THREE.Mesh(ballGeo, stbdBallMat);
    stbdBall.position.set(0.48, 0.7, 0);
    binnacleGroup.add(stbdBall);

    // Compass Dial (glowing subtle amber)
    const dialGeo = new THREE.CircleGeometry(0.24, 16);
    const dialMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.compassDial = new THREE.Mesh(dialGeo, dialMat);
    this.compassDial.rotation.x = -Math.PI / 2;
    this.compassDial.position.set(0, 0.75, 0);
    binnacleGroup.add(this.compassDial);

    this.helmConsole.add(binnacleGroup);

    // 8-Spoke Wooden & Brass Ship's Helm Wheel
    this.wheelGroup = new THREE.Group();
    this.wheelGroup.position.set(0, 0.6, 0.25);
    this.wheelGroup.rotation.x = 0.2; // tilted towards helmsman

    // Brass Hub
    const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12);
    const hub = new THREE.Mesh(hubGeo, this.brassMat);
    hub.rotation.x = Math.PI / 2;
    this.wheelGroup.add(hub);

    // Outer Wooden Rim
    const rimGeo = new THREE.TorusGeometry(0.9, 0.08, 8, 24);
    const rim = new THREE.Mesh(rimGeo, this.woodMat);
    this.wheelGroup.add(rim);

    // Inner Brass Rim
    const innerRimGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 24);
    const innerRim = new THREE.Mesh(innerRimGeo, this.brassMat);
    this.wheelGroup.add(innerRim);

    // 8 Spokes with Handles
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
      const spoke = new THREE.Mesh(spokeGeo, this.woodMat);
      spoke.rotation.z = angle;
      this.wheelGroup.add(spoke);

      // Brass Handle Cap at end
      const handleGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.28, 6);
      const handle = new THREE.Mesh(handleGeo, this.brassMat);
      handle.position.set(Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, 0);
      handle.rotation.z = angle - Math.PI / 2;
      this.wheelGroup.add(handle);
    }

    this.helmConsole.add(this.wheelGroup);
    this.add(this.helmConsole);
  }

  // ============================================================================
  // 3. ENGINE ORDER TELEGRAPH
  // ============================================================================

  _buildEngineTelegraph() {
    this.telegraph = new THREE.Group();
    this.telegraph.position.set(2.0, -0.4, -2.0);

    // Stand
    const standGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.4, 10);
    const stand = new THREE.Mesh(standGeo, this.brassMat);
    this.telegraph.add(stand);

    // Head Dial Housing
    const headGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.25, 16);
    const head = new THREE.Mesh(headGeo, this.brassMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.8, 0);
    this.telegraph.add(head);

    // Dial face
    const faceGeo = new THREE.CircleGeometry(0.38, 16);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 0.8, 0.13);
    this.telegraph.add(face);

    // Twin Brass Handles
    this.telegraphHandleLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), this.brassMat);
    this.telegraphHandleLeft.position.set(-0.1, 1.05, 0.05);
    this.telegraphHandleLeft.rotation.z = 0.3;
    this.telegraph.add(this.telegraphHandleLeft);

    this.telegraphHandleRight = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), this.brassMat);
    this.telegraphHandleRight.position.set(0.1, 1.05, 0.05);
    this.telegraphHandleRight.rotation.z = -0.3;
    this.telegraph.add(this.telegraphHandleRight);

    this.add(this.telegraph);
  }

  // ============================================================================
  // 4. CIRCULAR P-7 CRT RADAR SCOPE
  // ============================================================================

  _buildRadarCRT() {
    this.radarGroup = new THREE.Group();
    this.radarGroup.position.set(-3.8, -0.2, -2.2);

    // Console Housing Box
    const boxGeo = new THREE.BoxGeometry(2.0, 1.8, 1.4);
    const box = new THREE.Mesh(boxGeo, this.bulkheadMat);
    this.radarGroup.add(box);

    // Rubber Visor / Shroud Ring
    const hoodGeo = new THREE.CylinderGeometry(0.72, 0.65, 0.3, 24, 1, true);
    hoodGeo.rotateX(Math.PI / 2);
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 0.1, 0.75);
    this.radarGroup.add(hood);

    // Deep Dark CRT Screen Face
    const screenGeo = new THREE.CircleGeometry(0.64, 32);
    const screenMesh = new THREE.Mesh(screenGeo, this.crtFaceMat);
    screenMesh.position.set(0, 0.1, 0.71);
    this.radarGroup.add(screenMesh);

    // Dynamic Phosphor Canvas Display
    const displayGeo = new THREE.CircleGeometry(0.63, 32);
    this.radarDisplayMesh = new THREE.Mesh(displayGeo, this.radarDisplayMat);
    this.radarDisplayMesh.position.set(0, 0.1, 0.72);
    this.radarGroup.add(this.radarDisplayMesh);

    // Subtle Green Phosphor Glow Light
    this.radarLight = new THREE.PointLight(0x22c55e, 1.2, 3.5);
    this.radarLight.position.set(0, 0.1, 1.0);
    this.radarGroup.add(this.radarLight);

    this.add(this.radarGroup);
  }

  // ============================================================================
  // 5. FORECASTLE DECK & SWIVELING 16-INCH TRIPLE GUN TURRET
  // ============================================================================

  _buildForecastleDeck() {
    this.foreDeckGroup = new THREE.Group();
    // Deck starts right outside the bridge window and stretches forward
    this.foreDeckGroup.position.set(0, -1.2, -3.2);

    // Forecastle Deck Plating
    const deckLength = 48.0;
    const deckGeo = new THREE.BoxGeometry(14.0, 1.2, deckLength);
    const deck = new THREE.Mesh(deckGeo, this.frameMat);
    deck.position.set(0, 0, -deckLength / 2);
    deck.receiveShadow = true;
    this.foreDeckGroup.add(deck);

    // Deck Center Rail / Non-skid Runner
    const runnerGeo = new THREE.BoxGeometry(2.0, 0.05, deckLength);
    const runnerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const runner = new THREE.Mesh(runnerGeo, runnerMat);
    runner.position.set(0, 0.63, -deckLength / 2);
    this.foreDeckGroup.add(runner);

    // Deck Bulwark / Railings (Left and Right)
    const railGeo = new THREE.BoxGeometry(0.2, 0.8, deckLength);
    const portRail = new THREE.Mesh(railGeo, this.bulkheadMat);
    portRail.position.set(-6.8, 1.0, -deckLength / 2);
    this.foreDeckGroup.add(portRail);

    const stbdRail = new THREE.Mesh(railGeo, this.bulkheadMat);
    stbdRail.position.set(6.8, 1.0, -deckLength / 2);
    this.foreDeckGroup.add(stbdRail);

    // ========================================================================
    // MAIN 16-INCH TRIPLE GUN TURRET (Turret Alpha)
    // Mounted forward on barbette at Z = -18.0
    // ========================================================================
    this.turretGroup = new THREE.Group();
    this.turretGroup.position.set(0, 0.6, -16.0);

    // Cylindrical Armored Barbette
    const barbetteGeo = new THREE.CylinderGeometry(4.2, 4.4, 1.6, 24);
    const barbette = new THREE.Mesh(barbetteGeo, this.turretMat);
    barbette.position.set(0, 0.8, 0);
    this.turretGroup.add(barbette);

    // Swiveling Gunhouse (Rotates toward target!)
    this.gunhouse = new THREE.Group();
    this.gunhouse.position.set(0, 1.6, 0);

    // Armored Turret Face & Sides
    const turretBodyGeo = new THREE.BoxGeometry(7.2, 2.4, 8.5);
    const turretBody = new THREE.Mesh(turretBodyGeo, this.turretMat);
    turretBody.position.set(0, 1.2, 0);
    turretBody.castShadow = true;
    this.gunhouse.add(turretBody);

    // Sloped Front Glacis Plate
    const frontGeo = new THREE.BoxGeometry(6.8, 1.8, 2.4);
    const front = new THREE.Mesh(frontGeo, this.turretMat);
    front.position.set(0, 1.0, -4.2);
    front.rotation.x = -0.35;
    this.gunhouse.add(front);

    // Optical Rangefinder Hoods (Ears on turret sides)
    const rangefinderGeo = new THREE.BoxGeometry(9.4, 0.8, 1.2);
    const rangefinder = new THREE.Mesh(rangefinderGeo, this.turretMat);
    rangefinder.position.set(0, 2.2, 1.5);
    this.gunhouse.add(rangefinder);

    // 3 Massive 16-Inch 50-Caliber Gun Barrels
    this.barrelsGroup = new THREE.Group();
    this.barrelsGroup.position.set(0, 1.1, -4.5);
    this.barrelsGroup.rotation.x = -0.08; // slight elevation above water

    const barrelSpacing = 1.9;
    this.barrelMeshes = [];

    [-barrelSpacing, 0, barrelSpacing].forEach((xOffset, i) => {
      const barrelHolder = new THREE.Group();
      barrelHolder.position.set(xOffset, 0, 0);

      // Canvas Blast Bag / Bloom Collar
      const bloomGeo = new THREE.CylinderGeometry(0.65, 0.75, 1.2, 12);
      bloomGeo.rotateX(Math.PI / 2);
      const bloomMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
      const bloom = new THREE.Mesh(bloomGeo, bloomMat);
      bloom.position.set(0, 0, -0.6);
      barrelHolder.add(bloom);

      // Long 16-Inch Steel Barrel
      const barrelGeo = new THREE.CylinderGeometry(0.38, 0.48, 14.5, 16);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, this.barrelMat);
      barrel.position.set(0, 0, -8.2);
      barrel.castShadow = true;
      barrelHolder.add(barrel);

      // Muzzle Crown
      const crownGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.6, 16);
      crownGeo.rotateX(Math.PI / 2);
      const crown = new THREE.Mesh(crownGeo, this.barrelMat);
      crown.position.set(0, 0, -15.4);
      barrelHolder.add(crown);

      this.barrelMeshes.push(barrelHolder);
      this.barrelsGroup.add(barrelHolder);
    });

    this.gunhouse.add(this.barrelsGroup);
    this.turretGroup.add(this.gunhouse);
    this.foreDeckGroup.add(this.turretGroup);

    this.add(this.foreDeckGroup);
  }

  // ============================================================================
  // UPDATE & ANIMATION LOOP
  // ============================================================================

  update(time, deltaTime) {
    // 1. Radar Sweep Line Animation
    this.radarSweepAngle = (this.radarSweepAngle + deltaTime * 1.8) % (Math.PI * 2);
    this._renderRadarCRT();

    // 2. Compass Dial Subtle Drift
    if (this.compassDial) {
      this.compassDial.rotation.z = Math.sin(time * 0.4) * 0.05;
    }

    // 3. Helm Wheel Idle Rock
    if (this.wheelGroup) {
      this.wheelGroup.rotation.z = Math.sin(time * 0.6) * 0.12;
    }

    // 4. Smooth Turret Traverse toward Target Bearing
    if (this.gunhouse) {
      const diff = this.turretTargetBearing - this.turretCurrentBearing;
      this.turretCurrentBearing += diff * Math.min(deltaTime * 2.5, 1.0);
      this.gunhouse.rotation.y = this.turretCurrentBearing;
    }

    // 5. Turret Recoil Recovery
    if (this.turretRecoil > 0) {
      this.turretRecoil = Math.max(0, this.turretRecoil - deltaTime * 3.5);
      this.barrelMeshes.forEach(b => {
        b.position.z = this.turretRecoil * 1.8;
      });
    }

    // 6. Natural Bridge Sea Sway (Pitch and Roll)
    const swellRoll = Math.sin(time * 0.8) * 0.018;
    const swellPitch = Math.cos(time * 0.65) * 0.012;
    this.rotation.z = swellRoll;
    this.rotation.x = swellPitch;
  }

  aimTurretAt(targetWorldX, targetWorldZ) {
    // Compute angle from turret position to target world position
    // Foredeck turret is at world (0, 0, -16) relative to bridge
    const dx = targetWorldX;
    const dz = targetWorldZ - (-16.0);
    // Relative yaw angle
    let angle = Math.atan2(dx, -dz);
    // Clamp to forward firing arc (-75 deg to +75 deg)
    const maxArc = (Math.PI / 180) * 80;
    angle = Math.max(-maxArc, Math.min(maxArc, angle));
    this.turretTargetBearing = angle;
  }

  recoilTurret() {
    this.turretRecoil = 1.0;
  }

  setRadarContacts(contacts) {
    // contacts = array of { x: normX, y: normY, isHit: bool, isFriendly: bool }
    this.radarContacts = contacts || [];
  }

  _renderRadarCRT() {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w * 0.46;

    // Clear background to phosphor dark green
    ctx.fillStyle = '#021808';
    ctx.fillRect(0, 0, w, h);

    // Range Rings
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
    ctx.lineWidth = 1.5;
    [0.3, 0.6, 0.9].forEach(frac => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs & Bearing Ticks
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Radar Contacts (Blips)
    this.radarContacts.forEach(contact => {
      const px = cx + (contact.col - 4.5) * (r / 5.2);
      const py = cy + (contact.row - 4.5) * (r / 5.2);

      // Check distance from sweep arm for phosphor flash
      const contactAngle = (Math.atan2(py - cy, px - cx) + Math.PI * 2) % (Math.PI * 2);
      const angleDiff = (this.radarSweepAngle - contactAngle + Math.PI * 2) % (Math.PI * 2);

      let alpha = 0.3;
      if (angleDiff < 0.6) {
        alpha = 1.0 - (angleDiff / 0.6) * 0.7;
      }

      ctx.fillStyle = contact.isHit
        ? `rgba(239, 68, 68, ${alpha})`
        : contact.isFriendly
        ? `rgba(56, 189, 248, ${alpha})`
        : `rgba(34, 197, 94, ${alpha})`;

      ctx.beginPath();
      ctx.arc(px, py, contact.isHit ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Phosphor Sweep Line with Gradient Trail
    const sweepEndX = cx + Math.cos(this.radarSweepAngle) * r;
    const sweepEndY = cy + Math.sin(this.radarSweepAngle) * r;

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    grad.addColorStop(0, 'rgba(74, 222, 128, 0.8)');
    grad.addColorStop(1, 'rgba(34, 197, 94, 0.9)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepEndX, sweepEndY);
    ctx.stroke();

    // Phosphor Trail Wedge
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, this.radarSweepAngle - 0.45, this.radarSweepAngle);
    ctx.closePath();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.fill();
    ctx.restore();

    this.radarTexture.needsUpdate = true;
  }
}
