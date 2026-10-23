/**
 * Bone Yard — Dominoes Game Coordinator
 *
 * Five classic types against 1-3 computer players:
 *   block       Match tile ends; if you cannot play you pass.
 *   draw        As block, but you draw from the boneyard until you can play.
 *   allfives    Draw game where open ends adding to a multiple of 5 score points.
 *   mexican     Each player builds a train from the hub; a public Mexican train
 *               and open (marked) trains can also be played on.
 *   chickenfoot The starting double becomes a spinner with three branches.
 *
 * One model covers them all: the board is a centre tile plus a list of "ends".
 * A tile is played on an end whose value it matches, and the end takes the
 * tile's other value. Block, draw and all-fives use two ends (left and right);
 * Mexican Train uses one end per player plus the Mexican train; Chickenfoot
 * uses three branch ends.
 *
 * State is plain JSON so the app's save/resume can store it directly.
 */

import { SplitMix64 } from '../core/prng.js';

export const VARIANTS = {
  block: {
    id: 'block', name: 'Block Game', maxPip: 6, target: 50,
    blurb: 'Match a tile end to the layout. If you cannot play, you pass. First to 50 points wins.'
  },
  draw: {
    id: 'draw', name: 'Draw Game', maxPip: 6, target: 75,
    blurb: 'Like Block, but when you cannot play you draw from the boneyard until you can. First to 75 points wins.'
  },
  allfives: {
    id: 'allfives', name: 'All Fives (Muggins)', maxPip: 6, target: 100,
    blurb: 'A draw game where you score whenever the open ends add up to a multiple of 5. First to 100 points wins.'
  },
  mexican: {
    id: 'mexican', name: 'Mexican Train', maxPip: 9, rounds: true,
    blurb: 'Build your own train from the hub, or play on the public Mexican train and on marked (open) trains. Lowest total pips after the last round wins.'
  },
  chickenfoot: {
    id: 'chickenfoot', name: 'Chickenfoot', maxPip: 9, rounds: true,
    blurb: 'The starting double is a spinner with three branches. Doubles must be covered right away. Lowest total pips after the last round wins.'
  }
};

export const VARIANT_IDS = Object.keys(VARIANTS);

const HAND_SIZES = {
  block:       [0, 0, 7, 5, 5],
  draw:        [0, 0, 7, 5, 5],
  allfives:    [0, 0, 7, 5, 5],
  mexican:     [0, 0, 12, 11, 10],
  chickenfoot: [0, 0, 10, 9, 8]
};

const AI_NAMES = ['Mira', 'Tobias', 'Sunny'];

/** The id -> [a, b] list for a set with the given highest pip. */
export function buildSet(maxPip) {
  const tiles = [];
  for (let a = 0; a <= maxPip; a++) for (let b = a; b <= maxPip; b++) tiles.push([a, b]);
  return tiles;
}

export class DominoGame {
  constructor(options = {}) {
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.variant = VARIANTS[options.variant] ? options.variant : 'draw';
    this.config = VARIANTS[this.variant];
    const opponents = Math.min(3, Math.max(1, options.opponents || 2));
    this.dealCode = SplitMix64.formatDealCode('DM', this.seed);
    this.rng = new SplitMix64(this.seed);
    this.tiles = buildSet(this.config.maxPip);

    const n = opponents + 1;
    this.state = {
      seed: this.seed,
      variant: this.variant,
      maxPip: this.config.maxPip,
      players: Array.from({ length: n }, (_, i) => ({
        name: i === 0 ? 'You' : AI_NAMES[i - 1],
        human: i === 0,
        hand: [],
        score: 0,       // points (straight games) or penalty pips (trains)
        roundsWon: 0
      })),
      stock: [],
      center: null,        // { a, b, double }
      ends: [],            // { id, label, value, tiles:[{a,b,double}], owner, marker, centerDouble }
      turn: 0,
      round: 1,
      rounds: this.config.rounds ? (options.rounds || 4) : 1,
      target: this.config.target || 0,
      openDouble: null,    // end id that must be covered next
      drewThisTurn: false,
      passesInRow: 0,
      phase: 'play',       // 'play' | 'roundEnd' | 'matchEnd'
      roundResult: null,
      lastPlay: null,      // { player, tile:[a,b], end, points }
      log: [],
      score: 0,            // what the app HUD shows
      moves: 0,
      winner: null,
      won: false,
      over: false
    };
    this._startRound();
  }

  /** Rebuilds a game from a saved snapshot. */
  static fromState(saved) {
    const game = new DominoGame({ seed: saved.seed, variant: saved.variant, opponents: (saved.players || []).length - 1 });
    if (Array.isArray(saved.players) && Array.isArray(saved.stock)) {
      game.state = JSON.parse(JSON.stringify({ ...game.state, ...saved }));
    }
    return game;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  get isTrainGame() {
    return this.variant === 'mexican' || this.variant === 'chickenfoot';
  }

  pipsOf(id) {
    const [a, b] = this.tiles[id];
    if (this.isTrainGame && a === 0 && b === 0) return 50; // double-blank
    return a + b;
  }

  handPips(p) {
    return this.state.players[p].hand.reduce((sum, id) => sum + this.pipsOf(id), 0);
  }

  _log(text) {
    this.state.log.push(text);
    if (this.state.log.length > 40) this.state.log.shift();
  }

  _who(p) {
    return this.state.players[p].name;
  }

  /** Verb agreement for the log: 'You play' / 'Mira plays'. */
  _v(p, you, other) {
    return p === 0 ? you : other;
  }

  _endName(end) {
    return end.label.includes("'s") ? end.label : end.label.toLowerCase();
  }

  _tileName(id) {
    const [a, b] = this.tiles[id];
    return `${a}-${b}`;
  }

  // ------------------------------------------------------------------
  // Dealing
  // ------------------------------------------------------------------

  _startRound() {
    const s = this.state;
    const n = s.players.length;
    const ids = this.rng.shuffle(this.tiles.map((_, i) => i));
    s.players.forEach(p => { p.hand = []; });
    s.openDouble = null;
    s.drewThisTurn = false;
    s.passesInRow = 0;
    s.phase = 'play';
    s.roundResult = null;
    s.lastPlay = null;

    let engine = null;
    if (this.isTrainGame) {
      const e = s.maxPip - (s.round - 1);
      engine = this.tiles.findIndex(([a, b]) => a === e && b === e);
      ids.splice(ids.indexOf(engine), 1);
      s.center = { a: e, b: e, double: true, id: engine };
    }

    const size = HAND_SIZES[this.variant][n];
    for (let i = 0; i < size; i++) for (let p = 0; p < n; p++) s.players[p].hand.push(ids.shift());
    s.stock = ids;
    s.players.forEach(p => p.hand.sort((x, y) => x - y));

    if (this.variant === 'mexican') {
      const e = s.center.a;
      s.ends = s.players.map((p, i) => ({
        id: `T${i}`, label: p.human ? 'Your train' : `${p.name}'s train`, value: e, tiles: [], owner: i, marker: false
      }));
      s.ends.push({ id: 'M', label: 'Mexican train', value: e, tiles: [], owner: null, marker: false });
      s.turn = (s.round - 1) % n;
      this._log(`Round ${s.round}: the hub is the ${e}-${e}. ${this._who(s.turn)} ${s.turn === 0 ? 'start' : 'starts'}.`);
    } else if (this.variant === 'chickenfoot') {
      const e = s.center.a;
      s.ends = ['A', 'B', 'C'].map((id, i) => ({ id, label: `Branch ${i + 1}`, value: e, tiles: [], owner: null, marker: false }));
      s.turn = (s.round - 1) % n;
      this._log(`Round ${s.round}: the spinner is the ${e}-${e}. ${this._who(s.turn)} ${s.turn === 0 ? 'start' : 'starts'}.`);
    } else {
      this._openStraight();
    }
  }

  /** Straight games: the highest double (else heaviest tile) opens the layout. */
  _openStraight() {
    const s = this.state;
    let best = null;
    s.players.forEach((p, i) => {
      for (const id of p.hand) {
        const [a, b] = this.tiles[id];
        const key = a === b ? 1000 + a : a + b + b / 100;
        if (!best || key > best.key) best = { key, id, p: i };
      }
    });
    const [a, b] = this.tiles[best.id];
    const hand = s.players[best.p].hand;
    hand.splice(hand.indexOf(best.id), 1);
    s.center = { a, b, double: a === b, id: best.id };
    s.ends = [
      { id: 'L', label: 'Left end', value: a, tiles: [], owner: null, marker: false },
      { id: 'R', label: 'Right end', value: b, tiles: [], owner: null, marker: false }
    ];
    s.turn = (best.p + 1) % s.players.length;
    s.lastPlay = { player: best.p, tile: [a, b], end: null, points: 0 };
    this._log(`${this._who(best.p)} ${this._v(best.p, 'open', 'opens')} with the ${a}-${b}.`);

    if (this.variant === 'allfives') {
      const pts = this.openSum() % 5 === 0 ? this.openSum() : 0;
      if (pts > 0) {
        s.players[best.p].score += pts;
        s.lastPlay.points = pts;
        this._log(`${this._who(best.p)} ${this._v(best.p, 'score', 'scores')} ${pts}.`);
      }
    }
    this._syncHud();
    if (s.players[best.p].hand.length === 0) this._endRound(best.p, false);
  }

  // ------------------------------------------------------------------
  // Legal moves
  // ------------------------------------------------------------------

  /** Ends the given player may currently play on. */
  _allowedEnds(p) {
    const s = this.state;
    let ends = s.ends;
    if (s.openDouble) return ends.filter(e => e.id === s.openDouble);
    if (this.variant === 'chickenfoot') {
      const unstarted = ends.filter(e => e.tiles.length === 0);
      if (unstarted.length) return unstarted;
    }
    if (this.variant === 'mexican') {
      return ends.filter(e => e.owner === p || e.owner === null || e.marker);
    }
    return ends;
  }

  /** All { tile, end } moves for a player. */
  legalMoves(p = this.state.turn) {
    const s = this.state;
    if (s.phase !== 'play') return [];
    const moves = [];
    const ends = this._allowedEnds(p);
    for (const id of s.players[p].hand) {
      const [a, b] = this.tiles[id];
      for (const e of ends) if (a === e.value || b === e.value) moves.push({ tile: id, end: e.id });
    }
    return moves;
  }

  /** What the player to move must do next: 'play', 'draw' or 'pass'. */
  turnNeeds(p = this.state.turn) {
    const s = this.state;
    if (s.phase !== 'play') return 'none';
    if (this.legalMoves(p).length) return 'play';
    if (this.variant === 'block') return 'pass';
    if (this.variant === 'mexican') return (!s.drewThisTurn && s.stock.length) ? 'draw' : 'pass';
    return s.stock.length ? 'draw' : 'pass';
  }

  /** Sum of open ends for All Fives (a double at an end counts both halves). */
  openSum() {
    const s = this.state;
    if (s.ends.every(e => e.tiles.length === 0)) return s.center.a + s.center.b;
    let sum = 0;
    for (const e of s.ends) {
      const last = e.tiles.length ? e.tiles[e.tiles.length - 1] : s.center;
      sum += last.double ? e.value * 2 : e.value;
    }
    return sum;
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  /** Plays a tile for the player to move. */
  play(tileId, endId) {
    const s = this.state;
    const p = s.turn;
    if (s.phase !== 'play') return { ok: false, reason: 'not_playing' };
    const move = this.legalMoves(p).find(m => m.tile === tileId && m.end === endId);
    if (!move) return { ok: false, reason: 'illegal' };

    const player = s.players[p];
    player.hand.splice(player.hand.indexOf(tileId), 1);
    const [a, b] = this.tiles[tileId];
    const end = s.ends.find(e => e.id === endId);
    const inner = a === end.value ? a : b;
    const outer = inner === a ? b : a;
    const double = a === b;

    end.tiles.push({ a: inner, b: outer, double, id: tileId });
    end.value = outer;
    if (end.owner === p && end.marker) end.marker = false;

    if (s.openDouble === endId) s.openDouble = null;
    if (double && this.isTrainGame) s.openDouble = endId;

    let points = 0;
    if (this.variant === 'allfives') {
      const sum = this.openSum();
      if (sum > 0 && sum % 5 === 0) { points = sum; player.score += points; }
    }

    s.passesInRow = 0;
    s.drewThisTurn = false;
    s.lastPlay = { player: p, tile: [a, b], end: endId, points };
    if (player.human) s.moves++;
    this._log(`${player.name} ${this._v(p, 'play', 'plays')} ${a}-${b}${end.label ? ` on ${this._endName(end)}` : ''}${points ? ` and ${this._v(p, 'score', 'scores')} ${points}` : ''}.`);

    if (player.hand.length === 0) {
      this._endRound(p, false);
      return { ok: true, points, roundOver: true };
    }
    // A double in a train game must be covered by the same player right away.
    if (!(double && this.isTrainGame)) this._nextTurn();
    this._syncHud();
    return { ok: true, points };
  }

  /** Draws one tile for the player to move. */
  draw() {
    const s = this.state;
    const p = s.turn;
    if (this.turnNeeds(p) !== 'draw') return { ok: false, reason: 'cannot_draw' };
    const id = s.stock.pop();
    s.players[p].hand.push(id);
    s.players[p].hand.sort((x, y) => x - y);
    s.drewThisTurn = true;
    this._log(`${this._who(p)} ${p === 0 ? 'draw' : 'draws'} from the boneyard.`);
    this._syncHud();
    return { ok: true, tile: id };
  }

  /** Passes the turn (only when no move or draw is possible). */
  pass() {
    const s = this.state;
    const p = s.turn;
    if (this.turnNeeds(p) !== 'pass') return { ok: false, reason: 'cannot_pass' };

    if (this.variant === 'mexican') {
      const own = s.ends.find(e => e.owner === p);
      if (own && !own.marker) { own.marker = true; this._log(`${this._who(p)} ${this._v(p, 'pass', 'passes')} and ${this._v(p, 'mark', 'marks')} ${p === 0 ? 'your' : 'their'} train open.`); }
      else this._log(`${this._who(p)} ${this._v(p, 'pass', 'passes')}.`);
    } else {
      this._log(`${this._who(p)} ${this._v(p, 'pass', 'passes')}.`);
    }
    s.passesInRow++;
    if (s.passesInRow >= s.players.length && (this.variant === 'block' || s.stock.length === 0)) {
      this._endRound(null, true);
      return { ok: true, roundOver: true };
    }
    this._nextTurn();
    this._syncHud();
    return { ok: true };
  }

  _nextTurn() {
    const s = this.state;
    s.turn = (s.turn + 1) % s.players.length;
    s.drewThisTurn = false;
  }

  // ------------------------------------------------------------------
  // Computer players
  // ------------------------------------------------------------------

  /** Chooses the best move for a player, or null. */
  chooseMove(p = this.state.turn) {
    const s = this.state;
    const moves = this.legalMoves(p);
    if (!moves.length) return null;
    const hand = s.players[p].hand;

    const scored = moves.map(m => {
      const [a, b] = this.tiles[m.tile];
      const end = s.ends.find(e => e.id === m.end);
      const outer = a === end.value ? b : a;
      let score = this.pipsOf(m.tile);
      if (a === b) score += 8;

      if (this.variant === 'allfives') {
        // Temporarily compute the all-fives sum after this play.
        let sum = 0;
        for (const e of s.ends) {
          const isThis = e.id === m.end;
          const value = isThis ? outer : e.value;
          const lastDouble = isThis ? a === b : (e.tiles.length ? e.tiles[e.tiles.length - 1].double : s.center.double);
          sum += lastDouble ? value * 2 : value;
        }
        if (s.ends.every(e => e.tiles.length === 0) || sum > 0) {
          if (sum % 5 === 0) score += 60 + sum * 3;
        }
      } else if (this.variant === 'mexican') {
        if (end.owner === p) score += 25;
        else if (end.owner === null) score += 8;
        else score -= 6;
      } else if (this.variant === 'chickenfoot') {
        score += end.tiles.length === 0 ? 12 : 0;
      }

      // Prefer leaving an end we can follow up on.
      const follow = hand.filter(id => id !== m.tile && this.tiles[id].includes(outer)).length;
      score += follow * 3;
      return { m, score };
    });
    scored.sort((x, y) => y.score - x.score || x.m.tile - y.m.tile);
    return scored[0].m;
  }

  /** Performs one action (play, draw or pass) for the current player. */
  autoStep() {
    const s = this.state;
    if (s.phase !== 'play') return null;
    const p = s.turn;
    const needs = this.turnNeeds(p);
    if (needs === 'play') {
      const move = this.chooseMove(p);
      const res = this.play(move.tile, move.end);
      return { actor: p, action: 'play', tile: move.tile, end: move.end, ...res };
    }
    if (needs === 'draw') return { actor: p, action: 'draw', ...this.draw() };
    return { actor: p, action: 'pass', ...this.pass() };
  }

  /** A suggested move for the player to move (used for hints). */
  getTacticalHint() {
    const s = this.state;
    if (s.phase !== 'play') return null;
    const p = s.turn;
    const needs = this.turnNeeds(p);
    if (needs === 'draw') return { action: 'DRAW', message: 'You have no move. Draw from the boneyard.' };
    if (needs === 'pass') return { action: 'PASS', message: 'You have no move and nothing to draw. Pass.' };
    const move = this.chooseMove(p);
    const end = s.ends.find(e => e.id === move.end);
    const [a, b] = this.tiles[move.tile];
    return {
      action: 'PLAY', tile: move.tile, end: move.end,
      message: `Try the ${a}-${b}${end.label ? ` on ${end.label.includes("'s") || end.label.startsWith('Your') ? '' : 'the '}${this._endName(end)}` : ''}.`
    };
  }

  // ------------------------------------------------------------------
  // Round and match end
  // ------------------------------------------------------------------

  _endRound(winner, blocked) {
    const s = this.state;
    const n = s.players.length;
    const result = { winner, blocked, gains: new Array(n).fill(0), pips: s.players.map((_, i) => this.handPips(i)) };

    if (this.isTrainGame) {
      s.players.forEach((p, i) => { if (i !== winner) { p.score += result.pips[i]; result.gains[i] = result.pips[i]; } });
      if (winner !== null) s.players[winner].roundsWon++;
      else {
        const low = Math.min(...result.pips);
        const w = result.pips.indexOf(low);
        s.players[w].roundsWon++;
        result.winner = w;
        // A blocked round still scores everyone's pips except the lowest hand.
        s.players[w].score -= result.pips[w];
        result.gains[w] = 0;
      }
    } else {
      let w = winner;
      if (w === null) {
        const low = Math.min(...result.pips);
        w = result.pips.indexOf(low);
        result.winner = w;
      }
      let pool = 0;
      s.players.forEach((_, i) => { if (i !== w) pool += result.pips[i]; });
      let points = pool;
      if (this.variant === 'allfives') points = Math.round(pool / 5) * 5;
      s.players[w].score += points;
      result.gains[w] = points;
      s.players[w].roundsWon++;
    }

    const w = result.winner;
    this._log(blocked
      ? `Blocked! ${this._who(w)} ${this._v(w, 'have', 'has')} the lowest hand and ${this._v(w, 'win', 'wins')} the round.`
      : `${this._who(w)} ${this._v(w, 'go', 'goes')} out and ${this._v(w, 'win', 'wins')} the round.`);
    s.roundResult = result;
    s.phase = 'roundEnd';

    // Match over?
    if (this.isTrainGame) {
      if (s.round >= s.rounds) this._endMatch();
    } else {
      const top = Math.max(...s.players.map(p => p.score));
      if (top >= s.target) this._endMatch();
    }
    this._syncHud();
  }

  _endMatch() {
    const s = this.state;
    s.phase = 'matchEnd';
    let winnerIdx;
    if (this.isTrainGame) {
      const low = Math.min(...s.players.map(p => p.score));
      // The human wins ties.
      winnerIdx = s.players[0].score === low ? 0 : s.players.findIndex(p => p.score === low);
    } else {
      const top = Math.max(...s.players.map(p => p.score));
      winnerIdx = s.players[0].score === top ? 0 : s.players.findIndex(p => p.score === top);
    }
    s.winner = winnerIdx;
    if (winnerIdx === 0) s.won = true; else s.over = true;
    this._log(winnerIdx === 0 ? 'You win the match!' : `${this._who(winnerIdx)} wins the match.`);
  }

  /** Deals the next round after a round-end summary. */
  nextRound() {
    const s = this.state;
    if (s.phase !== 'roundEnd') return false;
    s.round++;
    this._startRound();
    this._syncHud();
    return true;
  }

  _syncHud() {
    const s = this.state;
    // Higher is always better on the HUD: points in point games, round wins in train games.
    s.score = this.isTrainGame ? s.players[0].roundsWon * 100 : s.players[0].score;
  }

  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }
}
