import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SHIP_CLASSES } from './ShipSpecs.js';
import { createSteelTextures, createDeckTextures } from './ProceduralTextures.js';

/**
 * Placeholder ships built from code (lofted hull + kit-bashed superstructure) so the
 * theater runs before authored GLB models exist. Node naming follows the same
 * convention the GLB pipeline expects (see ShipAssetLoader):
 *
 *   turret_<n>            yaw pivot
 *     barrels_<n>         pitch pivot
 *       muzzle_<n>_<k>    empty at each barrel tip, +Z = firing direction
 *
 * Bow points to +Z, waterline at y = 0, metres.
 */

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- materials

let sharedMaterials = null;

function addWaterline(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vLocalY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalY = position.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vLocalY;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.333));
        vec3 antifoul = vec3(0.2, 0.035, 0.025) * (0.6 + lum * 2.0);
        vec3 bootTop = vec3(0.03) * (0.7 + lum);
        float below = 1.0 - smoothstep(-0.9, -0.7, vLocalY);
        float boot = smoothstep(-0.9, -0.7, vLocalY) * (1.0 - smoothstep(1.0, 1.2, vLocalY));
        diffuseColor.rgb = mix(diffuseColor.rgb, antifoul, below);
        diffuseColor.rgb = mix(diffuseColor.rgb, bootTop, boot);`);
  };
  material.customProgramCacheKey = () => 'hull-waterline';
}

export function getShipMaterials() {
  if (sharedMaterials) return sharedMaterials;
  const steel = createSteelTextures({ seed: 3, base: [104, 110, 116] });
  const light = createSteelTextures({ seed: 5, base: [128, 133, 138], rust: 0.6 });
  const dark = createSteelTextures({ seed: 8, base: [46, 48, 51], rust: 0.3, panelW: 64, panelH: 64 });
  const deck = createDeckTextures({ seed: 11 });
  const std = (t, extra = {}) => new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, metalnessMap: t.metalnessMap,
    roughness: 1, metalness: 1, normalScale: new THREE.Vector2(0.9, 0.9), ...extra,
  });
  const hull = std(steel);
  addWaterline(hull);
  sharedMaterials = {
    hull,
    superstructure: std(light),
    dark: std(dark),
    deck: std(deck, { normalScale: new THREE.Vector2(0.6, 0.6) }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0b1418, roughness: 0.08, metalness: 0.2 }),
  };
  return sharedMaterials;
}

// ---------------------------------------------------------------- geometry helpers

/** Box-projected UVs in metres so texel density is constant across every part. */
function boxProjectUVs(geo, metersPerTile) {
  const g = geo.index ? geo : geo;
  const pos = g.attributes.position, nrm = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
    let u, v;
    if (ny >= nx && ny >= nz) { u = pos.getZ(i); v = pos.getX(i); }
    else if (nx >= nz) { u = pos.getZ(i); v = pos.getY(i); }
    else { u = pos.getX(i); v = pos.getY(i); }
    uv[i * 2] = u / metersPerTile; uv[i * 2 + 1] = v / metersPerTile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

class PartBucket {
  constructor() { this.parts = {}; }
  add(material, geo, tile = 12) {
    boxProjectUVs(geo, tile);
    const g = geo.index ? geo : geo;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    (this.parts[material] ??= []).push(g);
  }
  box(material, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz);
    g.translate(x, y + h / 2, z);
    this.add(material, g);
  }
  cyl(material, rTop, rBot, h, x, y, z, seg = 14, rx = 0, rz = 0) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    g.translate(0, h / 2, 0);
    g.rotateX(rx); g.rotateZ(rz);
    g.translate(x, y, z);
    this.add(material, g, 6);
  }
  build(materials, parent) {
    for (const [name, list] of Object.entries(this.parts)) {
      const merged = mergeGeometries(list.map((g) => (g.index ? g : g)), false);
      list.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, materials[name]);
      mesh.name = `merged_${name}`;
      mesh.castShadow = true; mesh.receiveShadow = true;
      parent.add(mesh);
    }
  }
}

/**
 * Lofted hull: S stations from stern to bow, each a U/V section from deck edge to keel.
 * Returns { hull, deck, deckY(z) }.
 */
function loftHull({ length: L, beam: B, draft: D, freeboard: F }, { stations = 44, half = 9, transom = 0.78 } = {}) {
  const hb = (t) => {
    let w = 1;
    if (t > 0.62) w = Math.pow((1 - t) / 0.38, 0.72);
    else if (t < 0.14) w = transom + (1 - transom) * smooth(0, 0.14, t);
    return (B / 2) * Math.max(w, 0.002);
  };
  const deckY = (t) => F * (1 + 0.28 * smooth(0.62, 1, t));
  const keelY = (t) => -D * (1 - 0.8 * smooth(0.82, 1, t)) * (0.5 + 0.5 * smooth(0, 0.12, t));
  const shapeP = (t) => 4 - 2.6 * smooth(0.55, 1, t) - 1.5 * (1 - smooth(0, 0.18, t));

  const pos = [], idx = [];
  const ring = half * 2 + 1;
  for (let i = 0; i <= stations; i++) {
    const t = i / stations, z = -L / 2 + t * L;
    const w = hb(t), top = deckY(t), bot = keelY(t), p = shapeP(t);
    for (let j = 0; j < ring; j++) {
      const sSigned = (j - half) / half;           // -1..1 (starboard deck -> keel -> port deck)
      const s = 1 - Math.abs(sSigned);              // 0 at deck edge, 1 at keel
      const y = top + (bot - top) * s;
      const x = Math.sign(-sSigned || 1) * w * (1 - Math.pow(s, p)) * (j === half ? 0 : 1);
      pos.push(x, y, z);
    }
  }
  const P = (a) => new THREE.Vector3(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]);
  const tri = (a, b, c, want) => {
    const n = new THREE.Vector3().subVectors(P(b), P(a)).cross(new THREE.Vector3().subVectors(P(c), P(a)));
    if (want && n.dot(want) < 0) idx.push(a, c, b); else idx.push(a, b, c);
  };
  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < ring - 1; j++) {
      const a = i * ring + j, b = (i + 1) * ring + j, c = b + 1, d = a + 1;
      const mid = P(a).add(P(c)).multiplyScalar(0.5);
      const out = new THREE.Vector3(mid.x, Math.min(mid.y, 0) * 0.3, 0); // outward ~ lateral
      tri(a, b, c, out); tri(a, c, d, out);
    }
  }
  // Transom.
  const cIdx = pos.length / 3;
  pos.push(0, (deckY(0) + keelY(0)) / 2, -L / 2);
  for (let j = 0; j < ring - 1; j++) tri(cIdx, j, j + 1, new THREE.Vector3(0, 0, -1));
  tri(cIdx, ring - 1, 0, new THREE.Vector3(0, 0, -1));

  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hull.setIndex(idx);
  hull.computeVertexNormals();

  // Deck surface.
  const dpos = [], didx = [];
  for (let i = 0; i <= stations; i++) {
    const t = i / stations, z = -L / 2 + t * L, w = hb(t), y = deckY(t) - 0.15;
    dpos.push(w, y, z, -w, y, z);
  }
  for (let i = 0; i < stations; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    // Wind so the normal points +Y.
    didx.push(a, b, c, b, d, c);
  }
  const deck = new THREE.BufferGeometry();
  deck.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
  deck.setIndex(didx);
  deck.computeVertexNormals();
  if (deck.attributes.normal.getY(0) < 0) { // ensure upward
    const ix = deck.index.array;
    for (let k = 0; k < ix.length; k += 3) { const tmp = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = tmp; }
    deck.computeVertexNormals();
  }
  return { hull, deck, deckY: (z) => deckY((z + L / 2) / L), halfBeam: (z) => hb((z + L / 2) / L) };
}

/**
 * Rotating turret with N barrels. Returns the turret record the controller animates.
 */
function makeTurret(materials, { n, barrels, width, height, depth, barrelLen, barrelR, spacing, x, y, z, yaw = 0, arc = [-2.4, 2.4], calibre }) {
  const pivot = new THREE.Group();
  pivot.name = `turret_${n}`;
  pivot.position.set(x, y, z);
  pivot.rotation.y = yaw;

  const house = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);
  // Bevel the front face (sloped turret face plate).
  const p = house.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) > 0 && p.getY(i) > 0) p.setZ(i, p.getZ(i) - depth * 0.22);
    if (p.getZ(i) < 0 && p.getY(i) > 0) p.setZ(i, p.getZ(i) + depth * 0.06);
  }
  house.computeVertexNormals();
  house.translate(0, height / 2, 0);
  boxProjectUVs(house, 8);
  const houseMesh = new THREE.Mesh(house, materials.superstructure);
  houseMesh.castShadow = houseMesh.receiveShadow = true;
  pivot.add(houseMesh);

  const barrelPivot = new THREE.Group();
  barrelPivot.name = `barrels_${n}`;
  barrelPivot.position.set(0, height * 0.45, depth * 0.3);
  pivot.add(barrelPivot);
  const muzzles = [];
  const bGeo = new THREE.CylinderGeometry(barrelR * 0.85, barrelR * 1.15, barrelLen, 10);
  bGeo.rotateX(Math.PI / 2);
  bGeo.translate(0, 0, barrelLen / 2);
  boxProjectUVs(bGeo, 4);
  for (let k = 0; k < barrels; k++) {
    const bx = (k - (barrels - 1) / 2) * spacing;
    const m = new THREE.Mesh(bGeo, materials.dark);
    m.position.x = bx;
    m.castShadow = true;
    barrelPivot.add(m);
    const muzzle = new THREE.Object3D();
    muzzle.name = `muzzle_${n}_${k}`;
    muzzle.position.set(bx, 0, barrelLen + 0.5);
    barrelPivot.add(muzzle);
    muzzles.push(muzzle);
  }
  return { pivot, barrelPivot, muzzles, restYaw: yaw, arc, calibre };
}

// ---------------------------------------------------------------- classes

function buildBB(spec, m, root, parts, turrets) {
  const { deckY } = spec._hull;
  const tY = (z) => deckY(z);
  parts.cyl('superstructure', 8, 8.5, 2.5, 0, tY(78) - 0.5, 78, 20);
  parts.cyl('superstructure', 8, 8.5, 5.5, 0, tY(55) - 0.5, 55, 20);
  parts.cyl('superstructure', 8, 8.5, 5, 0, tY(-78) - 0.5, -78, 20);
  const tdef = { barrels: 3, width: 14, height: 5, depth: 17, barrelLen: 21, barrelR: 0.55, spacing: 3.4, calibre: 1.0 };
  turrets.push(makeTurret(m, { ...tdef, n: 0, x: 0, y: tY(78) + 2, z: 78, arc: [-2.4, 2.4] }));
  turrets.push(makeTurret(m, { ...tdef, n: 1, x: 0, y: tY(55) + 5, z: 55, arc: [-2.4, 2.4] }));
  turrets.push(makeTurret(m, { ...tdef, n: 2, x: 0, y: tY(-78) + 4.5, z: -78, yaw: Math.PI, arc: [-2.4, 2.4] }));

  // Pagoda tower: stacked, tapering tiers.
  let y = tY(25);
  const tiers = [[18, 5, 30], [14, 4.5, 20], [11, 4, 14], [9, 4, 10], [7, 4, 8], [5.5, 3.5, 6], [4.5, 3, 5]];
  tiers.forEach(([w, h, d], i) => { parts.box('superstructure', w, h, d, 0, y, 28 - i * 0.8); y += h; });
  parts.box('dark', 16, 1.6, 2.6, 0, y, 26);                    // main rangefinder arms
  parts.box('glass', 7.2, 1.2, 0.3, 0, y - 6, 31.5);             // bridge windows
  parts.cyl('dark', 0.4, 0.6, 10, 0, y + 1.6, 25);               // mast
  // Raked funnel.
  parts.cyl('superstructure', 4.2, 5.4, 16, 0, tY(0), 2, 18, -0.28);
  parts.cyl('dark', 4.0, 4.2, 1.5, 0, tY(0) + 15.2, -2.4, 18, -0.28);
  // Aft superstructure + mainmast.
  parts.box('superstructure', 12, 7, 18, 0, tY(-35), -35);
  parts.box('superstructure', 8, 4, 10, 0, tY(-35) + 7, -36);
  parts.cyl('dark', 0.5, 0.8, 22, 0, tY(-35) + 11, -40);
  // Secondary battery houses + AA tubs along the sides.
  for (const sx of [-1, 1]) {
    for (const z of [12, -14]) parts.box('superstructure', 6, 3, 8, sx * 10, tY(z), z);
    for (let k = 0; k < 6; k++) parts.cyl('dark', 1.4, 1.6, 1.4, sx * 15.5, tY(-20 + k * 10), -20 + k * 10, 10);
  }
}

function buildCV(spec, m, root, parts, turrets) {
  const { deckY } = spec._hull;
  const top = deckY(0) + 2;
  // Overhanging flight deck on a steel gallery.
  parts.box('superstructure', 30, 2, spec.length * 0.86, 0, deckY(0), 0);
  const fd = new THREE.BoxGeometry(38, 1, spec.length * 0.93);
  fd.translate(0, top + 0.5, 2);
  parts.add('deck', fd, 10);
  // Island (starboard).
  const ix = 15.5;
  parts.box('superstructure', 7, 9, 34, ix, top + 1, 10);
  parts.box('superstructure', 9, 3.5, 14, ix, top + 10, 16);
  parts.box('glass', 9.2, 1.0, 0.3, ix, top + 11.5, 23.1);
  parts.box('superstructure', 6, 8, 11, ix, top + 10, 2);        // trunked funnel
  parts.box('dark', 6.2, 1, 11.2, ix, top + 18, 2);
  parts.cyl('dark', 0.4, 0.6, 14, ix, top + 13.5, 14);
  // Parked aircraft on the aft deck.
  for (let k = 0; k < 10; k++) {
    const x = (k % 2 ? -7 : 7) + (k % 4 < 2 ? 0 : 3), z = -40 - Math.floor(k / 2) * 14;
    parts.box('dark', 1.3, 1.3, 10, x, top + 1.2, z);
    parts.box('dark', 12, 0.3, 2.2, x, top + 1.8, z + 1.5);
    parts.box('dark', 4, 0.3, 1.4, x, top + 1.8, z - 4);
  }
  const tdef = { barrels: 2, width: 4.5, height: 2.6, depth: 5.5, barrelLen: 6.5, barrelR: 0.18, spacing: 1.4, calibre: 0.35 };
  turrets.push(makeTurret(m, { ...tdef, n: 0, x: ix, y: top + 9, z: 33, arc: [-2.6, 0.4] }));
  turrets.push(makeTurret(m, { ...tdef, n: 1, x: ix, y: top + 9, z: -12, yaw: Math.PI, arc: [-0.4, 2.6] }));
}

function buildCA(spec, m, root, parts, turrets) {
  const { deckY } = spec._hull;
  const tdef = { barrels: 2, width: 9, height: 3.6, depth: 11, barrelLen: 13, barrelR: 0.35, spacing: 2.6, calibre: 0.6 };
  parts.cyl('superstructure', 5, 5.5, 2, 0, deckY(55) - 0.5, 55, 16);
  parts.cyl('superstructure', 5, 5.5, 2, 0, deckY(-58) - 0.5, -58, 16);
  turrets.push(makeTurret(m, { ...tdef, n: 0, x: 0, y: deckY(55) + 1.5, z: 55 }));
  turrets.push(makeTurret(m, { ...tdef, n: 1, x: 0, y: deckY(-58) + 1.5, z: -58, yaw: Math.PI }));
  // Block superstructure with phased-array panels.
  const y0 = deckY(20);
  parts.box('superstructure', 13, 9, 30, 0, y0, 18);
  parts.box('superstructure', 10, 5, 14, 0, y0 + 9, 24);
  parts.box('glass', 9, 1.1, 0.3, 0, y0 + 11.5, 31.1);
  for (const [rx, ry] of [[0, 0], [0, Math.PI], [0, Math.PI / 2], [0, -Math.PI / 2]]) {
    const g = new THREE.BoxGeometry(5.5, 5.5, 0.35);
    g.rotateX(-0.3); g.rotateY(ry);
    const off = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    g.translate(off.x * 5.3, y0 + 10.5, 24 + off.z * 7.2);
    parts.add('dark', g, 6);
  }
  parts.cyl('dark', 0.5, 0.9, 16, 0, y0 + 14, 22);
  parts.box('superstructure', 6, 7, 8, 0, deckY(0), -2);
  parts.box('superstructure', 5, 6, 7, 0, deckY(-18), -18);
  parts.box('superstructure', 10, 5, 12, 0, deckY(-35), -35);
  // VLS hatches (fore + aft) and canted anti-ship missile canisters.
  for (const [cz, n] of [[40, 4], [-47, 3]]) {
    for (let r = 0; r < n; r++) for (let c = 0; c < 4; c++) parts.box('dark', 1.6, 0.35, 1.6, (c - 1.5) * 1.9, deckY(cz), cz + r * 1.9);
  }
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) parts.box('dark', 0.9, 0.9, 5, sx * (2.5 + k * 1.0), deckY(-8) + 1.5, -8, 0.35);
}

function buildDD(spec, m, root, parts, turrets) {
  const { deckY } = spec._hull;
  const tdef = { barrels: 1, width: 4.2, height: 2.8, depth: 5.5, barrelLen: 6.5, barrelR: 0.2, spacing: 0, calibre: 0.35 };
  parts.cyl('superstructure', 2.4, 2.4, 2.2, 0, deckY(30), 30, 12);
  turrets.push(makeTurret(m, { ...tdef, n: 0, x: 0, y: deckY(40), z: 40 }));
  turrets.push(makeTurret(m, { ...tdef, n: 1, x: 0, y: deckY(30) + 2.2, z: 30 }));
  turrets.push(makeTurret(m, { ...tdef, n: 2, x: 0, y: deckY(-45), z: -45, yaw: Math.PI }));
  const y0 = deckY(15);
  parts.box('superstructure', 8, 5, 12, 0, y0, 16);
  parts.box('superstructure', 6.5, 3, 6, 0, y0 + 5, 19);
  parts.box('glass', 6.6, 0.9, 0.3, 0, y0 + 6.5, 22.1);
  parts.cyl('dark', 0.3, 0.45, 11, 0, y0 + 8, 16);
  parts.cyl('superstructure', 1.8, 2.1, 8, 0, deckY(2), 2, 14, -0.15);
  parts.cyl('superstructure', 1.8, 2.1, 8, 0, deckY(-10), -10, 14, -0.15);
  parts.cyl('dark', 1.8, 1.8, 0.6, 0, deckY(2) + 7.8, 0.8, 14, -0.15);
  parts.cyl('dark', 1.8, 1.8, 0.6, 0, deckY(-10) + 7.8, -11.2, 14, -0.15);
  // Quad torpedo mount.
  parts.cyl('superstructure', 2.2, 2.4, 0.8, 0, deckY(-24), -24, 12);
  for (let k = 0; k < 4; k++) parts.cyl('dark', 0.32, 0.32, 8, (k - 1.5) * 0.8, deckY(-24) + 1.2, -28, 8, Math.PI / 2);
  parts.box('superstructure', 6, 3, 8, 0, deckY(-36), -34);
}

function buildSS(spec, m, root, parts, turrets) {
  const L = spec.length, R = spec.beam / 2, cy = spec.freeboard - R;
  const body = new THREE.CylinderGeometry(R, R, L * 0.72, 24, 1, true);
  body.rotateX(Math.PI / 2); body.translate(0, cy, 2);
  parts.add('dark', body, 8);
  const bow = new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  bow.rotateX(Math.PI / 2); bow.scale(1, 1, 1.9); bow.translate(0, cy, 2 + L * 0.36);
  parts.add('dark', bow, 8);
  const tail = new THREE.ConeGeometry(R, L * 0.26, 24, 1, true);
  tail.rotateX(-Math.PI / 2); tail.translate(0, cy, 2 - L * 0.36 - L * 0.13);
  parts.add('dark', tail, 8);
  parts.box('dark', 4, 1.2, L * 0.6, 0, spec.freeboard - 0.6, 6);       // deck casing
  parts.box('dark', 3.2, 8, 14, 0, spec.freeboard - 0.2, 22);           // sail
  parts.box('dark', 11, 0.4, 2.6, 0, spec.freeboard + 5, 24);           // sail planes
  parts.box('dark', 12, 0.4, 3, 0, cy, -L * 0.42);                       // stern planes
  parts.box('dark', 0.4, 10, 3, 0, cy - 5, -L * 0.42);                   // rudder
  parts.cyl('dark', 0.25, 0.3, 5, 0.6, spec.freeboard + 7.8, 21);        // periscopes
  parts.cyl('dark', 0.25, 0.3, 4, -0.6, spec.freeboard + 7.8, 19);
  // Torpedo "muzzles" in the bow (below water: the VFX layer launches torpedo wakes).
  const tube = { pivot: new THREE.Group(), barrelPivot: new THREE.Group(), muzzles: [], restYaw: 0, arc: [-Math.PI, Math.PI], calibre: 0.3, torpedo: true };
  tube.pivot.name = 'turret_0'; tube.barrelPivot.name = 'barrels_0';
  tube.pivot.position.set(0, cy, L * 0.45);
  tube.pivot.add(tube.barrelPivot);
  for (const sx of [-1, 1]) { const mz = new THREE.Object3D(); mz.position.set(sx * 1.2, 0, 2); mz.name = `muzzle_0_${sx > 0 ? 0 : 1}`; tube.barrelPivot.add(mz); tube.muzzles.push(mz); }
  turrets.push(tube);
}

const BUILDERS = { BB: buildBB, CV: buildCV, CA: buildCA, DD: buildDD, SS: buildSS };

/**
 * Build a ship of `classId`. Returns { root, turrets, spec }.
 */
export function buildProceduralShip(classId) {
  const spec = { ...SHIP_CLASSES[classId] };
  const materials = getShipMaterials();
  const root = new THREE.Group();
  root.name = `ship_${classId}`;
  const parts = new PartBucket();
  const turrets = [];

  if (classId !== 'SS') {
    const hull = loftHull(spec, { transom: classId === 'CV' ? 0.85 : 0.75 });
    spec._hull = hull;
    parts.add('hull', hull.hull, 14);
    parts.add('deck', hull.deck, 10);
  }
  BUILDERS[classId](spec, materials, root, parts, turrets);
  parts.build(materials, root);
  for (const t of turrets) root.add(t.pivot);
  delete spec._hull;
  return { root, turrets, spec };
}
