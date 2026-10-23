/**
 * Warship Mesh Factory — Procedural 3D Naval Vessels
 *
 * Builds optimized, lightweight 3D models for all 5 fleet classes:
 * 1. Aircraft Carrier (CV): Angled flight deck, island superstructure, parked aircraft.
 * 2. Battleship (BB): Armored citadel, 3 swiveling triple-gun turrets, funnels.
 * 3. Cruiser (CA): Streamlined hull, radar mast, dual turrets, missile banks.
 * 4. Destroyer (DD): High-speed hull, torpedo tube mount, depth charge racks.
 * 5. Submarine (SS): Streamlined cigar hull, conning tower sail, dive planes.
 */

import * as THREE from 'three';
import { NavalTextureGenerator } from './NavalTextureGenerator.js';

export class WarshipMeshFactory {
  constructor() {
    this.texGen = new NavalTextureGenerator();
    this.textureLoader = new THREE.TextureLoader();
    this.texturesLoaded = false;
    this._initMaterials();
    this._loadShipTextures();
  }

  _initMaterials() {
    const armorPBR = this.texGen.getArmorSteelTextures();
    const teakPBR = this.texGen.getTeakDeckTextures();

    // High-Fidelity Naval Haze Grey Armor Plating (Welded plates & rivets)
    this.hullMat = new THREE.MeshStandardMaterial({
      map: armorPBR.diffuse,
      normalMap: armorPBR.normal,
      roughnessMap: armorPBR.roughness,
      metalness: 0.52,
      roughness: 0.45
    });

    // Superstructure & Citadel Towers
    this.superstructureMat = new THREE.MeshStandardMaterial({
      map: armorPBR.diffuse,
      normalMap: armorPBR.normal,
      color: 0xcfd8e3,
      metalness: 0.55,
      roughness: 0.42
    });

    // Real Teak Wood Deck with Planking & Pitch Seams
    this.woodDeckMat = new THREE.MeshStandardMaterial({
      map: teakPBR.diffuse,
      normalMap: teakPBR.normal,
      roughness: 0.58,
      metalness: 0.08
    });

    this.deckMat = this.woodDeckMat;

    // Battleship Primary Hull Material
    this.battleshipHullMat = this.hullMat;
    this.carrierHullMat = this.hullMat;
    this.cruiserHullMat = this.hullMat;
    this.destroyerHullMat = this.hullMat;
    this.submarineHullMat = this.hullMat;

    // Waterline Anti-Fouling Red Stripe
    this.bootToppingMat = new THREE.MeshStandardMaterial({
      color: 0x7c1d29,
      roughness: 0.72,
      metalness: 0.25
    });

    // Gun Barrels & Machined Metal
    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0x1e2631,
      roughness: 0.32,
      metalness: 0.88
    });

    // Submarine Stealth Hull
    this.subMat = new THREE.MeshStandardMaterial({
      map: armorPBR.diffuse,
      color: 0x333b45,
      roughness: 0.78,
      metalness: 0.32
    });

    // Runway Stripes (Carrier)
    this.stripeMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc
    });

    // Dark Waterline Armor Belt
    this.armorBeltMat = new THREE.MeshStandardMaterial({
      map: armorPBR.diffuse,
      color: 0x22272e,
      roughness: 0.75,
      metalness: 0.45
    });

    // Canvas Blast Bag mantlet
    this.blastBagMat = new THREE.MeshStandardMaterial({
      color: 0xf3ede3,
      roughness: 0.92,
      metalness: 0.05
    });

    // Polished Brass for searchlights and binnacles
    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xe5c158,
      roughness: 0.28,
      metalness: 0.88
    });

    // Photorealistic Seafoam Spray
    this.wakeFoamMat = new THREE.MeshBasicMaterial({
      map: this.texGen.getSeafoamTexture(),
      color: 0xf0f9ff,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  /**
   * Load AI-generated realistic PBR textures for each ship class
   * Falls back to procedural materials if textures don't exist
   */
  _loadShipTextures() {
    const basePath = 'assets/textures/warships/';

    // Carrier Textures
    this._loadShipTextures('carrier', basePath, (diffuse, normal, roughness) => {
      this.carrierHullMat = new THREE.MeshStandardMaterial({
        map: diffuse,
        normalMap: normal,
        roughnessMap: roughness,
        metalness: 0.6,
        roughness: 0.65
      });
      console.log('Loaded ship textures for Carrier');
    });

    // Battleship Textures
    this._loadShipTextures('battleship', basePath, (diffuse, normal, roughness) => {
      this.battleshipHullMat = new THREE.MeshStandardMaterial({
        map: diffuse,
        normalMap: normal,
        roughnessMap: roughness,
        metalness: 0.65,
        roughness: 0.7
      });
      console.log('Loaded ship textures for Battleship');
    });

    // Cruiser Textures
    this._loadShipTextures('cruiser', basePath, (diffuse, normal, roughness) => {
      this.cruiserHullMat = new THREE.MeshStandardMaterial({
        map: diffuse,
        normalMap: normal,
        roughnessMap: roughness,
        metalness: 0.55,
        roughness: 0.6
      });
      console.log('Loaded ship textures for Cruiser');
    });

    // Destroyer Textures
    this._loadShipTextures('destroyer', basePath, (diffuse, normal, roughness) => {
      this.destroyerHullMat = new THREE.MeshStandardMaterial({
        map: diffuse,
        normalMap: normal,
        roughnessMap: roughness,
        metalness: 0.6,
        roughness: 0.6
      });
      console.log('Loaded ship textures for Destroyer');
    });

    // Submarine Textures
    this._loadShipTextures('submarine', basePath, (diffuse, normal, roughness) => {
      this.submarineHullMat = new THREE.MeshStandardMaterial({
        map: diffuse,
        normalMap: normal,
        roughnessMap: roughness,
        metalness: 0.4,
        roughness: 0.85
      });
      console.log('Loaded ship textures for Submarine');
    });
  }

  _loadShipTextures(shipClass, basePath, callback) {
    const diffusePath = `${basePath}${shipClass}_hull_diffuse.png`;
    const normalPath = `${basePath}${shipClass}_hull_normal.png`;
    const roughnessPath = `${basePath}${shipClass}_hull_roughness.png`;

    let loaded = 0;
    let diffuse, normal, roughness;

    const checkComplete = () => {
      if (loaded === 3) {
        callback(diffuse, normal, roughness);
      }
    };

    // Load diffuse
    this.textureLoader.load(
      diffusePath,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        diffuse = texture;
        loaded++;
        checkComplete();
      },
      undefined,
      (err) => {
        console.log(`ship texture not found: ${diffusePath} (using fallback material)`);
      }
    );

    // Load normal
    this.textureLoader.load(
      normalPath,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        normal = texture;
        loaded++;
        checkComplete();
      },
      undefined,
      (err) => {
        console.log(`Normal map not found: ${normalPath}`);
      }
    );

    // Load roughness
    this.textureLoader.load(
      roughnessPath,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        roughness = texture;
        loaded++;
        checkComplete();
      },
      undefined,
      (err) => {
        console.log(`Roughness map not found: ${roughnessPath}`);
      }
    );
  }

  createWarship(shipClassId, isPlayer = true) {
    switch (shipClassId) {
      case 'carrier':
        return this._buildCarrier(isPlayer);
      case 'battleship':
        return this._buildBattleship(isPlayer);
      case 'cruiser':
        return this._buildCruiser(isPlayer);
      case 'destroyer':
        return this._buildDestroyer(isPlayer);
      case 'submarine':
        return this._buildSubmarine(isPlayer);
      default:
        return this._buildBattleship(isPlayer);
    }
  }

  // ============================================================================
  // 1. AIRCRAFT CARRIER (CV - Length ~48 units)
  // ============================================================================

  _buildCarrier(isPlayer) {
    const ship = new THREE.Group();
    const length = 46.0;
    const beam = 11.5;

    // Main Hull (tapered bow and stern) - Use ship texture if available
    const hullGeo = new THREE.BoxGeometry(beam * 0.8, 3.2, length * 0.75);
    const hull = new THREE.Mesh(hullGeo, this.carrierHullMat || this.hullMat);
    hull.position.set(0, 0.8, length * 0.02);
    hull.castShadow = true;
    hull.receiveShadow = true;
    ship.add(hull);

    // Tapered Carrier Cutwater Bow (Towards -Z)
    const bowLen = length * 0.25;
    const bowGeo = new THREE.CylinderGeometry(0.3, beam * 0.4, bowLen, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2); // Sharp tip points forward to -Z
    const bow = new THREE.Mesh(bowGeo, this.carrierHullMat || this.hullMat);
    bow.scale.set(1.0, 0.45, 1.0);
    bow.position.set(0, 0.8, -length * 0.35 - bowLen * 0.5);
    bow.castShadow = true;
    ship.add(bow);

    // Flight Deck (Broad Flat Surface)
    const deckGeo = new THREE.BoxGeometry(beam, 0.45, length);
    const deck = new THREE.Mesh(deckGeo, this.deckMat);
    deck.position.set(0, 2.5, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    ship.add(deck);

    // Runway Centerline Stripe
    const stripeGeo = new THREE.PlaneGeometry(0.5, length * 0.85);
    stripeGeo.rotateX(-Math.PI / 2);
    const stripe = new THREE.Mesh(stripeGeo, this.stripeMat);
    stripe.position.set(-1.0, 2.74, 0);
    ship.add(stripe);

    // Island Superstructure (Starboard / Right Side)
    const island = new THREE.Group();
    const islandBodyGeo = new THREE.BoxGeometry(1.8, 4.0, 7.5);
    const islandBody = new THREE.Mesh(islandBodyGeo, this.superstructureMat);
    islandBody.position.set(0, 2.0, 0);
    island.add(islandBody);

    // Radar Lattice Mast
    const mastGeo = new THREE.CylinderGeometry(0.12, 0.25, 4.2, 6);
    const mast = new THREE.Mesh(mastGeo, this.metalMat);
    mast.position.set(0, 5.8, -0.5);
    island.add(mast);

    island.position.set(beam * 0.4, 2.7, -length * 0.08);
    ship.add(island);

    // Parked Fighter Interceptors on Deck
    const planeGeo = new THREE.BoxGeometry(1.8, 0.4, 1.8);
    for (let i = 0; i < 3; i++) {
      const plane = new THREE.Mesh(planeGeo, this.superstructureMat);
      plane.position.set(2.2, 2.85, length * 0.22 + i * 2.6);
      plane.rotation.y = 0.35;
      ship.add(plane);
    }

    return {
      group: ship,
      turrets: [],
      length,
      beam
    };
  }

  // ============================================================================
  // 2. BATTLESHIP (BB - Length ~38 units, Swiveling Triple Gun Turrets)
  // ============================================================================

  // ============================================================================
  // 2. REALISTIC DREADNOUGHT BATTLESHIP (BB - Yamato/Iowa Class, Length ~52 units)
  // Modeled precisely after the majestic naval battleship reference
  // ============================================================================

  _buildBattleship(isPlayer = true) {
    const ship = new THREE.Group();
    const length = 52.0;
    const beam = 11.2;

    // --- A. MAIN ARMORED HULL WITH CLIPPER BOW & WATERLINE BELT ---
    // Hull Base Citadel
    const hullGeo = new THREE.BoxGeometry(beam, 3.8, length * 0.65);
    const hullMesh = new THREE.Mesh(hullGeo, this.battleshipHullMat || this.hullMat);
    hullMesh.position.set(0, 0.9, -length * 0.05);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    ship.add(hullMesh);

    // Dark Waterline Armor Belt (Torpedobulkhead skirt)
    const beltGeo = new THREE.BoxGeometry(beam + 0.6, 1.4, length * 0.68);
    const beltMesh = new THREE.Mesh(beltGeo, this.armorBeltMat);
    beltMesh.position.set(0, -0.2, -length * 0.05);
    ship.add(beltMesh);

    // Flared Clipper Bow (Tapering to sharp cutwater stem forward towards -Z)
    const bowLength = length * 0.35;
    const bowGeo = new THREE.CylinderGeometry(0.2, beam * 0.5, bowLength, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2); // FIXED: Sharp knife cutwater tip points forward to -Z
    const bowMesh = new THREE.Mesh(bowGeo, this.battleshipHullMat || this.hullMat);
    bowMesh.scale.set(1.0, 0.45, 1.0);
    bowMesh.position.set(0, 0.9, -length * 0.375 - bowLength * 0.5);
    bowMesh.castShadow = true;
    ship.add(bowMesh);

    // Rounded Counter Stern (Aft towards +Z)
    const sternLength = length * 0.22;
    const sternGeo = new THREE.CylinderGeometry(beam * 0.48, beam * 0.25, sternLength, 8);
    sternGeo.rotateX(-Math.PI / 2);
    const sternMesh = new THREE.Mesh(sternGeo, this.battleshipHullMat || this.hullMat);
    sternMesh.scale.set(1.0, 0.42, 1.0);
    sternMesh.position.set(0, 0.9, length * 0.275 + sternLength * 0.5);
    sternMesh.castShadow = true;
    ship.add(sternMesh);

    // --- B. PLANKED TEAK WOODEN MAIN DECK ---
    const deckGeo = new THREE.BoxGeometry(beam * 0.94, 0.35, length * 0.62);
    const deckMesh = new THREE.Mesh(deckGeo, this.woodDeckMat);
    deckMesh.position.set(0, 2.85, -length * 0.05);
    deckMesh.receiveShadow = true;
    ship.add(deckMesh);

    // Forecastle Teak Deck
    const foreDeckGeo = new THREE.CylinderGeometry(0.3, beam * 0.46, bowLength, 4);
    foreDeckGeo.rotateY(Math.PI / 4);
    foreDeckGeo.rotateX(-Math.PI / 2); // FIXED: Sharp deck tip points forward to -Z
    const foreDeckMesh = new THREE.Mesh(foreDeckGeo, this.woodDeckMat);
    foreDeckMesh.scale.set(1.0, 0.06, 1.0);
    foreDeckMesh.position.set(0, 2.85, -length * 0.375 - bowLength * 0.5);
    ship.add(foreDeckMesh);

    // V-shaped Forecastle Wave Breakwater (Protects Turret A from heavy swells)
    const breakwaterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    for (const side of [-1, 1]) {
      const bwGeo = new THREE.BoxGeometry(0.35, 1.1, 4.2);
      const bwMesh = new THREE.Mesh(bwGeo, breakwaterMat);
      bwMesh.position.set(side * 2.8, 3.4, -length * 0.38);
      bwMesh.rotation.y = side * 0.55;
      ship.add(bwMesh);
    }

    // Anchor Capstans & Hawse Pipes on Bow
    for (const side of [-1, 1]) {
      const capstanGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.6, 12);
      const capstan = new THREE.Mesh(capstanGeo, this.metalMat);
      capstan.position.set(side * 1.6, 3.1, -length * 0.44);
      ship.add(capstan);

      // Heavy Anchor Chain running across forecastle deck
      const chainGeo = new THREE.BoxGeometry(0.22, 0.12, 4.5);
      const chain = new THREE.Mesh(chainGeo, this.metalMat);
      chain.position.set(side * 1.9, 3.0, -length * 0.42);
      chain.rotation.y = side * 0.18;
      ship.add(chain);

      // Anchor Hawse Pipe Collar on Hull
      const hawseGeo = new THREE.TorusGeometry(0.42, 0.14, 8, 16);
      const hawse = new THREE.Mesh(hawseGeo, this.metalMat);
      hawse.position.set(side * 2.3, 1.8, -length * 0.46);
      hawse.rotation.y = side * Math.PI / 2;
      ship.add(hawse);
    }

    // Hull Portholes with Metallic Glass Glint
    const portholeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.95
    });
    for (const side of [-1, 1]) {
      for (let z = -length * 0.24; z <= length * 0.18; z += 2.8) {
        const phGeo = new THREE.CircleGeometry(0.22, 8);
        const ph = new THREE.Mesh(phGeo, portholeMat);
        ph.position.set(side * (beam * 0.505), 1.9, z);
        ph.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        ship.add(ph);
      }
    }

    // Perimeter Deck Safety Railings & Stanchions
    const railingMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.3
    });
    const railingH = 0.85;
    for (const side of [-1, 1]) {
      // Top Safety Wire Cable
      const wire1Geo = new THREE.BoxGeometry(0.06, 0.06, length * 0.58);
      const wire1 = new THREE.Mesh(wire1Geo, railingMat);
      wire1.position.set(side * (beam * 0.46), 3.45, -length * 0.04);
      ship.add(wire1);

      // Mid Safety Wire Cable
      const wire2Geo = new THREE.BoxGeometry(0.06, 0.06, length * 0.58);
      const wire2 = new THREE.Mesh(wire2Geo, railingMat);
      wire2.position.set(side * (beam * 0.46), 3.15, -length * 0.04);
      ship.add(wire2);

      // Vertical Stanchion Posts every 3.5 units
      for (let z = -length * 0.31; z <= length * 0.21; z += 3.5) {
        const postGeo = new THREE.CylinderGeometry(0.04, 0.04, railingH, 6);
        const post = new THREE.Mesh(postGeo, railingMat);
        post.position.set(side * (beam * 0.46), 3.25, z);
        ship.add(post);
      }
    }

    // --- C. TRIPLE 16-INCH GUN TURRETS (TURRET 1, 2, 3) ---
    const turrets = [];
    const turretConfigs = [
      { id: 'turret_1', z: -length * 0.28, raised: false, facing: 0 },         // Forward Lower Turret 1
      { id: 'turret_2', z: -length * 0.16, raised: true, facing: 0 },          // Forward Superfiring Turret 2
      { id: 'turret_3', z: length * 0.22, raised: false, facing: Math.PI }     // Aft Quarterdeck Turret 3
    ];

    turretConfigs.forEach(cfg => {
      const turretGroup = new THREE.Group();
      turretGroup.position.set(0, 0, cfg.z);

      // Armored Barbette Base
      const barbetteHeight = cfg.raised ? 3.0 : 0.8;
      const barbetteGeo = new THREE.CylinderGeometry(3.6, 3.8, barbetteHeight, 24);
      const barbette = new THREE.Mesh(barbetteGeo, this.battleshipHullMat || this.hullMat);
      barbette.position.set(0, 2.85 + barbetteHeight / 2, 0);
      barbette.castShadow = true;
      turretGroup.add(barbette);

      // Swiveling Gunhouse Head
      const gunhouse = new THREE.Group();
      const gunhouseY = 2.85 + barbetteHeight;
      gunhouse.position.set(0, gunhouseY, 0);

      // Armored Turret Body
      const bodyGeo = new THREE.BoxGeometry(5.6, 2.2, 7.2);
      const bodyMesh = new THREE.Mesh(bodyGeo, this.superstructureMat);
      bodyMesh.position.set(0, 1.1, 0);
      bodyMesh.castShadow = true;
      gunhouse.add(bodyMesh);

      // Sloped Armored Faceplate
      const faceGeo = new THREE.BoxGeometry(5.4, 1.8, 2.4);
      const faceMesh = new THREE.Mesh(faceGeo, this.superstructureMat);
      faceMesh.position.set(0, 0.9, -3.5);
      faceMesh.rotation.x = -0.32;
      gunhouse.add(faceMesh);

      // Stereo Optical Rangefinder Hoods (Ears on turret sides)
      const rfGeo = new THREE.BoxGeometry(7.6, 0.9, 1.4);
      const rfMesh = new THREE.Mesh(rfGeo, this.superstructureMat);
      rfMesh.position.set(0, 1.8, 1.4);
      gunhouse.add(rfMesh);

      // Triple Rifled 16-Inch Barrels with Canvas Blast Bags
      const barrelSpacing = 1.45;
      [-barrelSpacing, 0, barrelSpacing].forEach(bx => {
        // Canvas Blast Bag Mantlet
        const bagGeo = new THREE.CylinderGeometry(0.55, 0.65, 1.2, 12);
        bagGeo.rotateX(Math.PI / 2);
        const bag = new THREE.Mesh(bagGeo, this.blastBagMat);
        bag.position.set(bx, 0.95, -4.2);
        gunhouse.add(bag);

        // 16-Inch Tapered Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.24, 0.38, 10.5, 16);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, this.metalMat);
        barrel.position.set(bx, 0.95, -9.2);
        barrel.castShadow = true;
        gunhouse.add(barrel);
      });

      gunhouse.rotation.y = cfg.facing;
      turretGroup.add(gunhouse);
      turretGroup.userData = { gunhouse, defaultFacing: cfg.facing };

      ship.add(turretGroup);
      turrets.push(turretGroup);
    });

    // --- D. PAGODA CITADEL BRIDGE SUPERSTRUCTURE ---
    const citadel = new THREE.Group();
    citadel.position.set(0, 3.0, -length * 0.02);

    // Tier 1: Armored Conning Tower Base
    const conningGeo = new THREE.CylinderGeometry(3.2, 3.8, 3.2, 16);
    const conning = new THREE.Mesh(conningGeo, this.superstructureMat);
    conning.position.set(0, 1.6, -1.0);
    citadel.add(conning);

    // Tier 2: Navigation Bridge Deckhouse with Windows
    const navBridgeGeo = new THREE.BoxGeometry(7.2, 2.0, 5.5);
    const navBridge = new THREE.Mesh(navBridgeGeo, this.superstructureMat);
    navBridge.position.set(0, 4.2, -1.2);
    citadel.add(navBridge);

    // Wrap-around Bridge Windows
    const winGeo = new THREE.BoxGeometry(7.3, 0.6, 5.6);
    const winMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const winMesh = new THREE.Mesh(winGeo, winMat);
    winMesh.position.set(0, 4.4, -1.2);
    citadel.add(winMesh);

    // Bridge Wings extending out port and starboard with lookout compasses
    for (const bwSide of [-1, 1]) {
      const wingGeo = new THREE.BoxGeometry(2.2, 0.45, 2.0);
      const wing = new THREE.Mesh(wingGeo, this.superstructureMat);
      wing.position.set(bwSide * 4.5, 4.0, -1.2);
      citadel.add(wing);

      const pelGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8);
      const pel = new THREE.Mesh(pelGeo, this.brassMat);
      pel.position.set(bwSide * 5.0, 4.6, -1.2);
      citadel.add(pel);
    }

    // Tier 3: Admiral's Flag Bridge & Compass Platform
    const flagBridgeGeo = new THREE.BoxGeometry(5.8, 1.8, 4.2);
    const flagBridge = new THREE.Mesh(flagBridgeGeo, this.superstructureMat);
    flagBridge.position.set(0, 6.1, -1.2);
    citadel.add(flagBridge);

    // Brass Searchlights
    for (const side of [-1, 1]) {
      const slGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.7, 12);
      slGeo.rotateX(Math.PI / 2);
      const sl = new THREE.Mesh(slGeo, this.brassMat);
      sl.position.set(side * 2.8, 7.3, -1.2);
      citadel.add(sl);
    }

    // Tier 4: Top 15-Meter Optical Stereoscopic Rangefinder Director
    const directorGeo = new THREE.BoxGeometry(8.2, 0.8, 1.4);
    const director = new THREE.Mesh(directorGeo, this.superstructureMat);
    director.position.set(0, 7.8, -1.2);
    citadel.add(director);

    // Lattice Radar Tripod Mast
    const mastGeo = new THREE.CylinderGeometry(0.15, 0.35, 7.5, 6);
    const mast = new THREE.Mesh(mastGeo, this.metalMat);
    mast.position.set(0, 11.5, -1.5);
    citadel.add(mast);

    // Air-Search Radar Mattress (Type 21 rotating antenna)
    const radarGeo = new THREE.BoxGeometry(3.4, 1.6, 0.2);
    const radarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true });
    const radarMesh = new THREE.Mesh(radarGeo, radarMat);
    radarMesh.position.set(0, 14.5, -1.5);
    citadel.add(radarMesh);

    ship.add(citadel);

    // --- E. RAKED SMOKE FUNNEL WITH STEAM PIPES & BOILER SMOKE ---
    const funnelGroup = new THREE.Group();
    funnelGroup.position.set(0, 3.0, length * 0.08);

    const funnelGeo = new THREE.CylinderGeometry(1.4, 2.0, 5.8, 12);
    funnelGeo.scale(0.8, 1.0, 1.2);
    const funnelMesh = new THREE.Mesh(funnelGeo, this.superstructureMat);
    funnelMesh.position.set(0, 3.2, 0);
    funnelMesh.rotation.x = 0.12; // Raked backwards
    funnelGroup.add(funnelMesh);

    // Black Funnel Hood Cap
    const capGeo = new THREE.CylinderGeometry(1.45, 1.5, 0.7, 12);
    capGeo.scale(0.8, 1.0, 1.2);
    const capMesh = new THREE.Mesh(capGeo, this.metalMat);
    capMesh.position.set(0, 6.0, 0.35);
    capMesh.rotation.x = 0.12;
    funnelGroup.add(capMesh);

    // Steam Whistle Exhaust Pipes
    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.0, 6);
    const pipe = new THREE.Mesh(pipeGeo, this.brassMat);
    pipe.position.set(0.8, 3.2, -0.9);
    funnelGroup.add(pipe);

    // Subtle Translucent Boiler Smoke Plume
    const smokeGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.25
    });
    const smoke = new THREE.Mesh(smokeGeo, smokeMat);
    smoke.position.set(0, 7.2, 1.2);
    smoke.scale.set(0.9, 1.4, 1.8);
    funnelGroup.add(smoke);

    ship.add(funnelGroup);

    // --- F. SECONDARY DUAL-PURPOSE 5-INCH TURRETS & AA GUN TUBS ---
    for (const side of [-1, 1]) {
      for (const zOff of [-length * 0.04, length * 0.05]) {
        const secTurret = new THREE.Group();
        secTurret.position.set(side * 5.2, 3.4, zOff);

        const secBodyGeo = new THREE.BoxGeometry(1.8, 1.2, 2.2);
        const secBody = new THREE.Mesh(secBodyGeo, this.superstructureMat);
        secBody.position.set(0, 0.6, 0);
        secTurret.add(secBody);

        for (const bx of [-0.35, 0.35]) {
          const bGeo = new THREE.CylinderGeometry(0.1, 0.14, 2.8, 8);
          bGeo.rotateX(Math.PI / 2);
          const bMesh = new THREE.Mesh(bGeo, this.metalMat);
          bMesh.position.set(bx, 0.6, side * -1.8);
          secTurret.add(bMesh);
        }

        secTurret.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        ship.add(secTurret);
      }

      // Anti-Aircraft Bofors Gun Tubs
      for (const aaZ of [-length * 0.11, length * 0.14]) {
        const tubGeo = new THREE.CylinderGeometry(1.1, 1.2, 0.7, 12);
        const tub = new THREE.Mesh(tubGeo, this.superstructureMat);
        tub.position.set(side * 5.3, 3.4, aaZ);
        ship.add(tub);

        for (const aaBx of [-0.2, 0.2]) {
          const aaGunGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.5, 6);
          aaGunGeo.rotateX(Math.PI / 2);
          const aaGun = new THREE.Mesh(aaGunGeo, this.metalMat);
          aaGun.position.set(side * 5.3 + aaBx, 4.0, aaZ);
          aaGun.rotation.x = -0.38; // 22 degrees elevated
          ship.add(aaGun);
        }
      }
    }

    // --- G. AFT AVIATION CATAPULTS & SEAPLANE ---
    const catapultGroup = new THREE.Group();
    catapultGroup.position.set(0, 3.0, length * 0.36);

    for (const side of [-1, 1]) {
      const catGeo = new THREE.BoxGeometry(1.0, 0.6, 6.5);
      const catMesh = new THREE.Mesh(catGeo, this.metalMat);
      catMesh.position.set(side * 3.2, 0.3, 0);
      catMesh.rotation.y = side * 0.25;
      catapultGroup.add(catMesh);
    }

    // Stern Aircraft Recovery Crane
    const craneGroup = new THREE.Group();
    craneGroup.position.set(0, 0.3, 3.8);
    const mastCGeo = new THREE.CylinderGeometry(0.2, 0.35, 4.2, 8);
    const mastC = new THREE.Mesh(mastCGeo, this.metalMat);
    mastC.position.set(0, 2.1, 0);
    craneGroup.add(mastC);

    const boomGeo = new THREE.BoxGeometry(0.25, 0.3, 5.0);
    const boom = new THREE.Mesh(boomGeo, this.metalMat);
    boom.position.set(0, 4.0, -1.8);
    boom.rotation.x = -0.4;
    craneGroup.add(boom);
    catapultGroup.add(craneGroup);

    // Scout Seaplane on Starboard Catapult
    const plane = new THREE.Group();
    plane.position.set(3.2, 1.4, 0);
    plane.rotation.y = 0.25;

    const fusGeo = new THREE.CylinderGeometry(0.3, 0.2, 3.2, 8);
    fusGeo.rotateX(Math.PI / 2);
    const fus = new THREE.Mesh(fusGeo, this.battleshipHullMat || this.hullMat);
    plane.add(fus);

    const wingGeo = new THREE.BoxGeometry(4.8, 0.08, 1.0);
    const wing = new THREE.Mesh(wingGeo, this.superstructureMat);
    wing.position.set(0, 0.25, 0);
    plane.add(wing);

    for (const side of [-0.65, 0.65]) {
      const floatGeo = new THREE.CylinderGeometry(0.18, 0.12, 2.4, 6);
      floatGeo.rotateX(Math.PI / 2);
      const floatMesh = new THREE.Mesh(floatGeo, this.metalMat);
      floatMesh.position.set(side, -0.45, 0);
      plane.add(floatMesh);
    }
    catapultGroup.add(plane);

    ship.add(catapultGroup);

    // --- H. DYNAMIC BOW WAVE FOAM & WATER SPRAY ---
    const wakeGroup = new THREE.Group();
    wakeGroup.position.set(0, -0.65, 0);

    for (const side of [-1, 1]) {
      const bowWakeGeo = new THREE.PlaneGeometry(4.5, 24.0);
      bowWakeGeo.rotateX(-Math.PI / 2);
      const bowWake = new THREE.Mesh(bowWakeGeo, this.wakeFoamMat);
      bowWake.position.set(side * 4.5, 0.05, -length * 0.38);
      bowWake.rotation.y = side * 0.38;
      wakeGroup.add(bowWake);
    }

    // Stern Propeller Wash Patch
    const sternWakeGeo = new THREE.PlaneGeometry(14.0, 32.0);
    sternWakeGeo.rotateX(-Math.PI / 2);
    const sternWake = new THREE.Mesh(sternWakeGeo, this.wakeFoamMat);
    sternWake.position.set(0, 0.05, length * 0.52);
    wakeGroup.add(sternWake);

    ship.add(wakeGroup);

    // Dynamic targeting method: aim all 3 main turrets towards world coordinate
    ship.aimTurrets = (targetX, targetZ) => {
      turrets.forEach(tg => {
        const gh = tg.userData.gunhouse;
        if (!gh) return;
        const worldPos = new THREE.Vector3();
        tg.getWorldPosition(worldPos);
        const dx = targetX - worldPos.x;
        const dz = targetZ - worldPos.z;
        const targetAngle = Math.atan2(dx, dz);
        // Lerp rotation smoothly
        const diff = targetAngle - gh.rotation.y;
        gh.rotation.y += Math.sin(diff) * 0.15;
      });
    };

    return {
      group: ship,
      turrets,
      length,
      beam
    };
  }

  // ============================================================================
  // 3. GUIDED MISSILE CRUISER (CA - Length ~28 units)
  // ============================================================================

  _buildCruiser(isPlayer) {
    const ship = new THREE.Group();
    const length = 28.0;
    const beam = 6.4;

    // Main Citadel Hull
    const hullGeo = new THREE.BoxGeometry(beam, 2.8, length * 0.65);
    const hull = new THREE.Mesh(hullGeo, this.cruiserHullMat || this.hullMat);
    hull.position.set(0, 0.8, length * 0.02);
    hull.castShadow = true;
    ship.add(hull);

    // Tapered Cruiser Clipper Bow (Towards -Z)
    const bowLen = length * 0.35;
    const bowGeo = new THREE.CylinderGeometry(0.2, beam * 0.5, bowLen, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2); // Sharp tip points forward to -Z
    const bow = new THREE.Mesh(bowGeo, this.cruiserHullMat || this.hullMat);
    bow.scale.set(1.0, 0.45, 1.0);
    bow.position.set(0, 0.8, -length * 0.32 - bowLen * 0.5);
    bow.castShadow = true;
    ship.add(bow);

    // Forward Bridge Tower (Forward of Midships at -Z)
    const bridgeGeo = new THREE.BoxGeometry(beam * 0.6, 3.0, 5.0);
    const bridge = new THREE.Mesh(bridgeGeo, this.superstructureMat);
    bridge.position.set(0, 3.2, -length * 0.08);
    ship.add(bridge);

    // Raked Exhaust Funnel (Aft of Bridge, raking backwards towards +Z)
    const funnelGeo = new THREE.CylinderGeometry(0.65, 0.85, 2.8, 8);
    const funnel = new THREE.Mesh(funnelGeo, this.metalMat);
    funnel.position.set(0, 4.2, length * 0.12);
    funnel.rotation.x = -0.15; // Rakes back toward +Z
    ship.add(funnel);

    // Radar Lattice Mast (Above Bridge)
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.18, 3.6, 6);
    const mast = new THREE.Mesh(mastGeo, this.metalMat);
    mast.position.set(0, 5.8, -length * 0.08);
    ship.add(mast);

    // Forward Turret (at -Z, firing forward) & Aft Turret (at +Z, firing aft)
    const turrets = [];
    const turretConfigs = [
      { z: -length * 0.34, facing: 0 },         // Forward Turret A
      { z: length * 0.34, facing: Math.PI }      // Aft Turret B
    ];

    turretConfigs.forEach(cfg => {
      const tg = new THREE.Group();
      const gh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.6), this.superstructureMat);
      gh.position.set(0, 2.8, 0);
      tg.add(gh);

      [-0.45, 0.45].forEach(bx => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.8, 8), this.metalMat);
        b.geometry.rotateX(-Math.PI / 2); // Barrels point forward towards -Z
        b.position.set(bx, 2.8, -2.6);
        tg.add(b);
      });

      tg.position.set(0, 0, cfg.z);
      tg.rotation.y = cfg.facing;
      ship.add(tg);
      turrets.push(tg);
    });

    return {
      group: ship,
      turrets,
      length,
      beam
    };
  }

  // ============================================================================
  // 4. FAST DESTROYER (DD - Length ~24 units)
  // ============================================================================

  _buildDestroyer(isPlayer) {
    const ship = new THREE.Group();
    const length = 24.0;
    const beam = 4.8;

    // Main Hull
    const hullGeo = new THREE.BoxGeometry(beam, 2.2, length * 0.65);
    const hull = new THREE.Mesh(hullGeo, this.destroyerHullMat || this.hullMat);
    hull.position.set(0, 0.6, length * 0.02);
    hull.castShadow = true;
    ship.add(hull);

    // Tapered Knife Bow (Towards -Z)
    const bowLen = length * 0.35;
    const bowGeo = new THREE.CylinderGeometry(0.15, beam * 0.5, bowLen, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, this.destroyerHullMat || this.hullMat);
    bow.scale.set(1.0, 0.45, 1.0);
    bow.position.set(0, 0.6, -length * 0.32 - bowLen * 0.5);
    bow.castShadow = true;
    ship.add(bow);

    // Forward Bridge (Forward of Midships)
    const bridgeGeo = new THREE.BoxGeometry(beam * 0.65, 2.2, 4.0);
    const bridge = new THREE.Mesh(bridgeGeo, this.superstructureMat);
    bridge.position.set(0, 2.4, -length * 0.1);
    ship.add(bridge);

    // Twin Funnels (Midships)
    [-length * 0.01, length * 0.12].forEach(fz => {
      const funnelGeo = new THREE.CylinderGeometry(0.4, 0.55, 2.0, 8);
      const funnel = new THREE.Mesh(funnelGeo, this.metalMat);
      funnel.position.set(0, 3.0, fz);
      funnel.rotation.x = -0.12;
      ship.add(funnel);
    });

    // Torpedo Tube Bank (Aft Deck)
    const torpGeo = new THREE.BoxGeometry(1.6, 0.5, 2.2);
    const torp = new THREE.Mesh(torpGeo, this.metalMat);
    torp.position.set(0, 2.0, length * 0.24);
    ship.add(torp);

    // Forward Main Battery Turret (at -Z, firing forward)
    const turrets = [];
    const tg = new THREE.Group();
    const gh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 2.0), this.superstructureMat);
    gh.position.set(0, 2.2, 0);
    tg.add(gh);

    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3.0, 8), this.metalMat);
    b.geometry.rotateX(-Math.PI / 2); // Barrel points forward to -Z
    b.position.set(0, 2.2, -2.0);
    tg.add(b);

    tg.position.set(0, 0, -length * 0.32);
    ship.add(tg);
    turrets.push(tg);

    return {
      group: ship,
      turrets,
      length,
      beam
    };
  }

  // ============================================================================
  // 5. ATTACK SUBMARINE (SS - Length ~18 units)
  // ============================================================================

  _buildSubmarine(isPlayer) {
    const ship = new THREE.Group();
    const length = 18.0;
    const radius = 1.8;

    // Streamlined Cigar Pressure Hull (Forward at -Z, Stern at +Z)
    const hullGeo = new THREE.CylinderGeometry(radius, radius, length, 16);
    hullGeo.rotateX(Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, this.submarineHullMat || this.subMat);
    hull.position.set(0, 0.4, 0);
    hull.castShadow = true;
    ship.add(hull);

    // Hemispherical Rounded Bow Cap (Forward at -Z)
    const bowCapGeo = new THREE.SphereGeometry(radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    bowCapGeo.rotateX(-Math.PI / 2);
    const bowCap = new THREE.Mesh(bowCapGeo, this.submarineHullMat || this.subMat);
    bowCap.position.set(0, 0.4, -length * 0.5);
    ship.add(bowCap);

    // Conning Tower Sail (Forward of Midships at -Z)
    const sailGeo = new THREE.BoxGeometry(1.2, 2.4, 3.8);
    const sail = new THREE.Mesh(sailGeo, this.subMat);
    sail.position.set(0, 2.2, -length * 0.05);
    ship.add(sail);

    // Periscopes atop Sail
    const periGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6);
    const peri = new THREE.Mesh(periGeo, this.metalMat);
    peri.position.set(0, 3.8, -length * 0.05);
    ship.add(peri);

    // Forward Hydroplanes / Diving Planes (Forward at -Z)
    const divePlaneGeo = new THREE.BoxGeometry(3.6, 0.15, 1.0);
    const divePlane = new THREE.Mesh(divePlaneGeo, this.subMat);
    divePlane.position.set(0, 0.8, -length * 0.35);
    ship.add(divePlane);

    // Bronze Propeller Screw (Aft at +Z)
    const propGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 6);
    const propMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.3 });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(0, 0.4, length * 0.52);
    ship.add(prop);

    return {
      group: ship,
      turrets: [],
      length,
      beam: radius * 2
    };
  }
}
