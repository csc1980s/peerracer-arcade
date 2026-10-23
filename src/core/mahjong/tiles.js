/**
 * Jade Pavilion — Tile Set Definition
 *
 * The traditional 144-tile set: three numbered suits (Dots, Bamboo, Characters)
 * of 1-9 with four copies each, four Winds and three Dragons with four copies
 * each, and eight one-off bonus tiles (four Flowers, four Seasons).
 *
 * Any Flower matches any other Flower, and any Season matches any other Season.
 * Every other tile matches only an identical face.
 */

export const SUITS = ['dot', 'bam', 'char'];
export const WINDS = ['E', 'S', 'W', 'N'];
export const DRAGONS = ['R', 'G', 'P']; // Red, Green, Pale (white)
export const FLOWERS = ['flower-1', 'flower-2', 'flower-3', 'flower-4'];
export const SEASONS = ['season-1', 'season-2', 'season-3', 'season-4'];

/** All 34 faces that come in sets of four. */
export function regularFaces() {
  const faces = [];
  for (const s of SUITS) for (let r = 1; r <= 9; r++) faces.push(`${s}-${r}`);
  for (const w of WINDS) faces.push(`wind-${w}`);
  for (const d of DRAGONS) faces.push(`dragon-${d}`);
  return faces;
}

/** The face family a tile matches against. */
export function matchKey(face) {
  if (face.startsWith('flower-')) return 'flower';
  if (face.startsWith('season-')) return 'season';
  return face;
}

export function facesMatch(a, b) {
  return matchKey(a) === matchKey(b);
}

/** Points for clearing a pair of this face (bonus tiles are worth double). */
export function pairValue(face) {
  const k = matchKey(face);
  return k === 'flower' || k === 'season' ? 20 : 10;
}

/** Plain-English tile name, used by hints and accessibility labels. */
export function faceName(face) {
  const [kind, v] = face.split('-');
  const windNames = { E: 'East', S: 'South', W: 'West', N: 'North' };
  const dragonNames = { R: 'Red', G: 'Green', P: 'Pale' };
  const flowerNames = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'];
  const seasonNames = ['Spring', 'Summer', 'Autumn', 'Winter'];
  switch (kind) {
    case 'dot': return `${v} of Dots`;
    case 'bam': return `${v} of Bamboo`;
    case 'char': return `${v} of Characters`;
    case 'wind': return `${windNames[v]} Wind`;
    case 'dragon': return `${dragonNames[v]} Dragon`;
    case 'flower': return `${flowerNames[Number(v) - 1]} Flower`;
    case 'season': return `${seasonNames[Number(v) - 1]} Season`;
    default: return face;
  }
}

/**
 * Builds the full list of 72 matching pairs in the 144-tile set.
 * Each regular face gives two pairs; Flowers and Seasons give two pairs each,
 * paired up randomly so the bonus tiles are spread across the deal.
 */
export function buildPairPool(rng) {
  const pairs = [];
  for (const f of regularFaces()) {
    pairs.push([f, f], [f, f]);
  }
  const flowers = rng.shuffle([...FLOWERS]);
  const seasons = rng.shuffle([...SEASONS]);
  pairs.push([flowers[0], flowers[1]], [flowers[2], flowers[3]]);
  pairs.push([seasons[0], seasons[1]], [seasons[2], seasons[3]]);
  return pairs;
}
