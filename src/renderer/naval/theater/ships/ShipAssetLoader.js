import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { SHIP_CLASSES } from './ShipSpecs.js';
import { buildProceduralShip } from './ProceduralShipBuilder.js';

/**
 * Loads authored ship GLBs (Draco/Meshopt geometry, KTX2 textures), caches one
 * template per class and hands out cheap clones (geometry + materials shared).
 * Falls back to the procedural placeholder when a GLB is missing, so art can land
 * class by class without code changes.
 *
 * Required GLB conventions (see PLAN.md, section 1):
 *   - metres, +Y up, bow towards +Z, waterline at y = 0
 *   - nodes: turret_<n> (yaw) > barrels_<n> (pitch) > muzzle_<n>_<k> (empty, +Z out)
 *   - optional LOD children: <name>_LOD0/_LOD1/_LOD2 -> wrapped in THREE.LOD
 *   - reserved (phase 4): fire_<k> hull-fire anchors, funnel_<k> smoke emitters
 */
export class ShipAssetLoader {
  constructor(renderer, { basePath = './assets/', decoderPath = 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/' } = {}) {
    this.basePath = basePath;
    this.templates = new Map();
    const draco = new DRACOLoader().setDecoderPath(`${decoderPath}draco/gltf/`);
    const ktx2 = new KTX2Loader().setTranscoderPath(`${decoderPath}basis/`).detectSupport(renderer);
    this.gltf = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
    this.draco = draco;
    this.ktx2 = ktx2;
  }

  async preload(classIds = Object.keys(SHIP_CLASSES), { procedural = false } = {}) {
    await Promise.all(classIds.map((id) => this._loadTemplate(id, procedural)));
  }

  async _loadTemplate(classId, forceProcedural) {
    if (this.templates.has(classId)) return this.templates.get(classId);
    let template = null;
    if (!forceProcedural) {
      try {
        const gltf = await this.gltf.loadAsync(this.basePath + SHIP_CLASSES[classId].gltf);
        template = { source: 'gltf', scene: this._prepare(gltf.scene) };
      } catch (err) {
        console.info(`[ShipAssetLoader] ${classId}: GLB not found, using procedural placeholder`);
      }
    }
    if (!template) template = { source: 'procedural' };
    this.templates.set(classId, template);
    return template;
  }

  /** One-time fix-ups on the loaded template: shadows, LOD wrapping, texture settings. */
  _prepare(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
            if (m[k]) m[k].anisotropy = 8;
          }
          m.envMapIntensity = 1;
        }
      }
    });
    // Wrap *_LOD0/1/2 siblings in a THREE.LOD.
    const groups = new Map();
    root.traverse((o) => {
      const m = /^(.*)_LOD(\d)$/.exec(o.name);
      if (m) {
        const key = o.parent.uuid + m[1];
        if (!groups.has(key)) groups.set(key, { parent: o.parent, levels: [] });
        groups.get(key).levels[+m[2]] = o;
      }
    });
    const distances = [0, 900, 2200];
    for (const { parent, levels } of groups.values()) {
      const lod = new THREE.LOD();
      levels.forEach((lvl, i) => { if (lvl) { parent.remove(lvl); lod.addLevel(lvl, distances[i] ?? 4000); } });
      parent.add(lod);
    }
    return root;
  }

  /** Returns { root, turrets, spec } exactly like buildProceduralShip(). */
  async create(classId) {
    const tpl = await this._loadTemplate(classId);
    if (tpl.source === 'procedural') return buildProceduralShip(classId);

    const root = tpl.scene.clone(true);
    const turrets = [];
    root.traverse((o) => {
      const m = /^turret_(\d+)$/.exec(o.name);
      if (!m) return;
      const barrelPivot = o.getObjectByName(`barrels_${m[1]}`) ?? o;
      const muzzles = [];
      barrelPivot.traverse((c) => { if (c.name.startsWith(`muzzle_${m[1]}_`)) muzzles.push(c); });
      turrets.push({
        pivot: o, barrelPivot, muzzles, restYaw: o.rotation.y,
        arc: o.userData.arc ?? [-2.4, 2.4],
        calibre: o.userData.calibre ?? SHIP_CLASSES[classId].calibre,
        torpedo: !!o.userData.torpedo,
      });
    });
    return { root, turrets, spec: { ...SHIP_CLASSES[classId] } };
  }

  dispose() {
    this.draco.dispose();
    this.ktx2.dispose();
  }
}
