/**
 * Jade Pavilion — Mahjong Tile-Matching Game Coordinator
 *
 * Supports:
 * - Five layouts, from the quick 56-tile Lantern to the 144-tile Classic Turtle.
 * - Seeded deals that are always solvable, plus solvable re-shuffles.
 * - Free-tile rule (nothing on top, left or right side open).
 * - Undo of matches and shuffles, tactical hints, quick-match combo scoring.
 *
 * State is plain JSON so the app's save/resume can store it directly.
 */

import { SplitMix64 } from '../core/prng.js';
import { MAHJONG_LAYOUTS, DEFAULT_LAYOUT_ID, getLayoutPositions } from '../core/mahjong/layouts.js';
import { BoardGeometry, findRemovalOrder } from '../core/mahjong/board.js';
import { buildPairPool, facesMatch, pairValue, faceName, matchKey } from '../core/mahjong/tiles.js';

export const MAHJONG_SCORING = {
  comboWindowMs: 5000,  // match again within this window to grow the combo
  comboStep: 5,         // extra points per combo level
  comboCap: 25,
  shufflePenalty: 25,
  clearBonus: 250
};

export class MahjongGame {
  constructor(options = {}) {
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.layoutId = MAHJONG_LAYOUTS[options.layoutId] ? options.layoutId : DEFAULT_LAYOUT_ID;
    this.layout = MAHJONG_LAYOUTS[this.layoutId];
    this.dealCode = SplitMix64.formatDealCode('MJ', this.seed);

    this.geometry = new BoardGeometry(getLayoutPositions(this.layoutId));
    this.rng = new SplitMix64(this.seed);

    this.state = {
      seed: this.seed,
      layoutId: this.layoutId,
      tiles: this._deal(),
      score: 0,
      moves: 0,
      shuffles: 0,
      combo: 0,
      lastMatchAt: 0,
      won: false,
      history: []
    };
  }

  /** Rebuilds a game from a saved state snapshot. */
  static fromState(saved) {
    const game = new MahjongGame({ seed: saved.seed, layoutId: saved.layoutId });
    if (Array.isArray(saved.tiles) && saved.tiles.length === game.state.tiles.length) {
      game.state = JSON.parse(JSON.stringify({ ...game.state, ...saved }));
    }
    return game;
  }

  // ------------------------------------------------------------------
  // Dealing
  // ------------------------------------------------------------------

  _deal() {
    const count = this.geometry.positions.length;
    const pool = this.rng.shuffle(buildPairPool(this.rng)).slice(0, count / 2);
    const indices = this.geometry.positions.map((_, i) => i);
    const order = findRemovalOrder(this.geometry, indices, this.rng);

    const faces = new Array(count);
    if (order) {
      order.forEach(([a, b], k) => { faces[a] = pool[k][0]; faces[b] = pool[k][1]; });
    } else {
      // Fallback: plain random placement (never observed on bundled layouts).
      const flat = this.rng.shuffle(pool.flat());
      flat.forEach((f, i) => { faces[i] = f; });
    }

    return this.geometry.positions.map((p, i) => ({
      id: i, x: p.x, y: p.y, z: p.z, face: faces[i], removed: false
    }));
  }

  // ------------------------------------------------------------------
  // Queries
  // ------------------------------------------------------------------

  _present() {
    const tiles = this.state.tiles;
    return (j) => !tiles[j].removed;
  }

  isFree(id) {
    const t = this.state.tiles[id];
    if (!t || t.removed) return false;
    return this.geometry.isFree(id, this._present());
  }

  getRemainingTiles() {
    return this.state.tiles.filter(t => !t.removed);
  }

  getFreeTileIds() {
    const present = this._present();
    return this.state.tiles
      .filter(t => !t.removed && this.geometry.isFree(t.id, present))
      .map(t => t.id);
  }

  canMatch(a, b) {
    if (a === b) return false;
    const ta = this.state.tiles[a];
    const tb = this.state.tiles[b];
    if (!ta || !tb || ta.removed || tb.removed) return false;
    return facesMatch(ta.face, tb.face) && this.isFree(a) && this.isFree(b);
  }

  /** All currently playable pairs as [idA, idB]. */
  getAvailablePairs() {
    const groups = new Map();
    for (const id of this.getFreeTileIds()) {
      const key = matchKey(this.state.tiles[id].face);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(id);
    }
    const pairs = [];
    for (const ids of groups.values()) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);
      }
    }
    return pairs;
  }

  hasMoves() {
    return this.getAvailablePairs().length > 0;
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  /**
   * Removes a matching pair of free tiles.
   * @returns {{ok:boolean, points?:number, combo?:number, won?:boolean, reason?:string}}
   */
  matchTiles(a, b, now = Date.now()) {
    if (this.state.won) return { ok: false, reason: 'finished' };
    if (!this.canMatch(a, b)) return { ok: false, reason: 'no_match' };

    const s = this.state;
    const prev = { score: s.score, combo: s.combo, lastMatchAt: s.lastMatchAt };

    s.combo = s.lastMatchAt && now - s.lastMatchAt <= MAHJONG_SCORING.comboWindowMs ? s.combo + 1 : 0;
    const comboBonus = Math.min(MAHJONG_SCORING.comboCap, s.combo * MAHJONG_SCORING.comboStep);
    let points = pairValue(s.tiles[a].face) + comboBonus;

    s.tiles[a].removed = true;
    s.tiles[b].removed = true;
    s.moves++;
    s.lastMatchAt = now;

    const won = s.tiles.every(t => t.removed);
    if (won) points += MAHJONG_SCORING.clearBonus;
    s.score += points;
    s.won = won;

    s.history.push({ type: 'match', ids: [a, b], prev });
    return { ok: true, points, combo: s.combo, won };
  }

  /**
   * Re-deals the faces of the tiles still on the board so that the remaining
   * position can always be cleared. Costs a small score penalty.
   */
  shuffleRemaining() {
    if (this.state.won) return false;
    const s = this.state;
    const remaining = s.tiles.filter(t => !t.removed);
    if (remaining.length < 2) return false;

    // Rebuild pairs from what is left, grouped by match family.
    const groups = new Map();
    for (const t of remaining) {
      const k = matchKey(t.face);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t.face);
    }
    const pairs = [];
    for (const faces of groups.values()) {
      for (let i = 0; i + 1 < faces.length; i += 2) pairs.push([faces[i], faces[i + 1]]);
    }
    this.rng.shuffle(pairs);

    const order = findRemovalOrder(this.geometry, remaining.map(t => t.id), this.rng);
    if (!order || order.length !== pairs.length) return false;

    const prevFaces = remaining.map(t => [t.id, t.face]);
    order.forEach(([a, b], k) => {
      s.tiles[a].face = pairs[k][0];
      s.tiles[b].face = pairs[k][1];
    });

    const prev = { score: s.score, combo: s.combo, lastMatchAt: s.lastMatchAt };
    s.score = Math.max(0, s.score - MAHJONG_SCORING.shufflePenalty);
    s.combo = 0;
    s.lastMatchAt = 0;
    s.shuffles++;
    s.history.push({ type: 'shuffle', faces: prevFaces, prev });
    return true;
  }

  undo() {
    const s = this.state;
    const last = s.history.pop();
    if (!last) return false;

    if (last.type === 'match') {
      for (const id of last.ids) s.tiles[id].removed = false;
      s.moves = Math.max(0, s.moves - 1);
      s.won = false;
    } else if (last.type === 'shuffle') {
      for (const [id, face] of last.faces) s.tiles[id].face = face;
      s.shuffles = Math.max(0, s.shuffles - 1);
    }
    s.score = last.prev.score;
    s.combo = last.prev.combo;
    s.lastMatchAt = last.prev.lastMatchAt;
    return true;
  }

  // ------------------------------------------------------------------
  // Hints
  // ------------------------------------------------------------------

  /**
   * Suggests a pair, preferring moves that open up the board: tiles that
   * sit on top of others, and families where all free copies can be cleared.
   */
  getTacticalHint() {
    if (this.state.won) return null;
    const pairs = this.getAvailablePairs();
    if (pairs.length === 0) {
      return {
        action: 'SHUFFLE',
        message: 'No matching free pairs are left. Press Shuffle to re-deal the remaining tiles (it can always be cleared).'
      };
    }

    const tiles = this.state.tiles;
    const coversCount = (id) => this.geometry.positions.reduce((n, p, j) => {
      return n + (!tiles[j].removed && this.geometry.above[j].includes(id) ? 1 : 0);
    }, 0);
    const sideCount = (id) =>
      this.geometry.left[id].filter(j => !tiles[j].removed).length +
      this.geometry.right[id].filter(j => !tiles[j].removed).length;

    const scored = pairs.map(([a, b]) => ({
      a, b,
      weight: (coversCount(a) + coversCount(b)) * 3 + sideCount(a) + sideCount(b) + tiles[a].z + tiles[b].z
    }));
    scored.sort((p, q) => q.weight - p.weight);

    // Skip moves that would leave tiles stacked so that no shuffle could ever
    // clear them (for example the last two tiles sitting on top of each other).
    const best = scored.slice(0, 12).find(({ a, b }) => this._leavesClearableShape([a, b])) || scored[0];

    const key = matchKey(tiles[best.a].face);
    const label = key === 'flower' ? 'Flower' : key === 'season' ? 'Season' : faceName(key);
    return {
      action: 'MATCH',
      tiles: [best.a, best.b],
      message: `Try matching the two ${label} tiles. That opens up the most of the board.`
    };
  }

  /** True if, after removing `ids`, the remaining positions can still be emptied by some deal. */
  _leavesClearableShape(ids) {
    const gone = new Set(ids);
    const rest = this.state.tiles.filter(t => !t.removed && !gone.has(t.id)).map(t => t.id);
    if (rest.length === 0) return true;
    return findRemovalOrder(this.geometry, rest, new SplitMix64(rest.length * 7919 + (ids[0] ?? 1)), 60) !== null;
  }

  /** True if Shuffle can produce a clearable position from the tiles left. */
  canShuffleHelp() {
    return this._leavesClearableShape([]);
  }

  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }
}
