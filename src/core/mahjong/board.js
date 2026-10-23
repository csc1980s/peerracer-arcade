/**
 * Jade Pavilion — Board Geometry & Solvable Dealer
 *
 * A tile is FREE when nothing rests on top of it and at least one of its long
 * sides (left or right) is open. Geometry is precomputed once per layout so the
 * free check is a handful of array lookups.
 *
 * Solvable deals are built backwards: we repeatedly take two positions that are
 * free at the same moment, "remove" them, and give that pair matching faces.
 * Replaying those removals is a guaranteed winning line, so every deal (and
 * every in-game shuffle) can always be cleared.
 */

export class BoardGeometry {
  /** @param {{x:number,y:number,z:number}[]} positions half-tile units */
  constructor(positions) {
    this.positions = positions;
    const n = positions.length;
    this.above = Array.from({ length: n }, () => []);
    this.left = Array.from({ length: n }, () => []);
    this.right = Array.from({ length: n }, () => []);

    for (let i = 0; i < n; i++) {
      const a = positions[i];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = positions[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapY = Math.abs(dy) < 2;
        if (b.z === a.z + 1 && Math.abs(dx) < 2 && overlapY) this.above[i].push(j);
        if (b.z === a.z && overlapY && dx === -2) this.left[i].push(j);
        if (b.z === a.z && overlapY && dx === 2) this.right[i].push(j);
      }
    }
  }

  /**
   * @param {number} i position index
   * @param {(j:number)=>boolean} present whether position j still holds a tile
   */
  isFree(i, present) {
    if (this.above[i].some(present)) return false;
    return !this.left[i].some(present) || !this.right[i].some(present);
  }

  /** Validates that no two tiles on the same layer overlap. */
  findOverlaps() {
    const bad = [];
    const p = this.positions;
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        if (p[i].z === p[j].z && Math.abs(p[i].x - p[j].x) < 2 && Math.abs(p[i].y - p[j].y) < 2) {
          bad.push([i, j]);
        }
      }
    }
    return bad;
  }
}

/**
 * Finds a removal order for the given positions: an array of [i, j] pairs
 * where both tiles are free at the moment they are taken.
 * Returns null if every attempt dead-ends (extremely rare for real layouts).
 *
 * @param {BoardGeometry} geo
 * @param {number[]} indices positions that hold tiles
 * @param {{boundedInt:(n:number)=>number}} rng
 */
export function findRemovalOrder(geo, indices, rng, maxAttempts = 400) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const present = new Set(indices);
    const isPresent = (j) => present.has(j);
    const order = [];
    let stuck = false;

    while (present.size > 0) {
      const free = [];
      for (const i of present) if (geo.isFree(i, isPresent)) free.push(i);
      if (free.length < 2) { stuck = true; break; }

      // Favour higher tiles slightly: digging from the top keeps more of the
      // board open and greatly cuts the number of dead-end attempts.
      const pick = () => {
        const a = free[rng.boundedInt(free.length)];
        const b = free[rng.boundedInt(free.length)];
        return geo.positions[a].z >= geo.positions[b].z ? a : b;
      };
      const first = pick();
      let second = first;
      while (second === first) second = free[rng.boundedInt(free.length)];

      present.delete(first);
      present.delete(second);
      order.push([first, second]);
    }

    if (!stuck) return order;
  }
  return null;
}
