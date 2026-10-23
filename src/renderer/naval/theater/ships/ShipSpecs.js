/**
 * Per-class data used by the builder, the controller (buoyancy / sinking) and the
 * asset pipeline. Dimensions are real-world metres (WW2-era references);
 * the theater scales models to fit the game-grid footprint (`cells`).
 */
export const SHIP_CLASSES = {
  CV: {
    name: 'Aircraft Carrier', cells: 5,
    length: 250, beam: 28, draft: 8.5, freeboard: 14, speed: 16,
    triBudget: [15000, 20000], gltf: 'models/cv_carrier.glb',
    response: 1.3,            // buoyancy smoothing (s): bigger = heavier, slower
    rollPeriod: 14,           // natural roll period (s)
    sink: { duration: 34, roll: 38, pitch: -6, depth: 40, rollDir: 1 },   // heavy list, capsizes slowly
    calibre: 0.35,
  },
  BB: {
    name: 'Heavy Battleship', cells: 4,
    length: 263, beam: 36.9, draft: 11, freeboard: 9, speed: 14,
    triBudget: [15000, 20000], gltf: 'models/bb_battleship.glb',
    response: 1.1, rollPeriod: 12,
    sink: { duration: 28, roll: 24, pitch: -14, depth: 48, rollDir: -1 },  // magazine hit: bow-down + list
    calibre: 1.0,
  },
  CA: {
    name: 'Guided Missile Cruiser', cells: 3,
    length: 173, beam: 17, draft: 7, freeboard: 7.5, speed: 16,
    triBudget: [10000, 15000], gltf: 'models/ca_cruiser.glb',
    response: 0.8, rollPeriod: 10,
    sink: { duration: 22, roll: 12, pitch: 22, depth: 38, rollDir: 1 },   // stern-first plunge
    calibre: 0.6,
  },
  DD: {
    name: 'Fast Destroyer', cells: 2,
    length: 115, beam: 11.5, draft: 4, freeboard: 5, speed: 18,
    triBudget: [6000, 10000], gltf: 'models/dd_destroyer.glb',
    response: 0.45, rollPeriod: 7,
    sink: { duration: 14, roll: 8, pitch: -32, depth: 30, rollDir: -1 },  // broken back, bow dives fast
    calibre: 0.35,
  },
  SS: {
    name: 'Attack Submarine', cells: 3,
    length: 110, beam: 10, draft: 8, freeboard: 1.6, speed: 10,
    triBudget: [5000, 8000], gltf: 'models/ss_submarine.glb',
    response: 0.6, rollPeriod: 6,
    sink: { duration: 12, roll: 4, pitch: 28, depth: 35, rollDir: 1 },    // stern rises, slides under
    calibre: 0.3,
  },
};
