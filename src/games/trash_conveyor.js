/**
 * Jimothy's Trash Conveyor Frenzy - rules and physics.
 *
 * Jimothy the raccoon holds one of three coloured bins. Food drops from chutes
 * onto conveyor belts that sometimes reverse; catch each item in the bin that
 * matches it for full points. A catch in the wrong bin is allowed but scores
 * nothing. Rotten trash costs 100 points and food on the floor breaks your
 * streak. Power-ups: golden donut (bonus), freeze clock, food magnet.
 *
 * The run is five timed levels. Each level has its own belt layout, its own
 * background and (from level 2) trampolines that slide back and forth and kick
 * food up onto higher belts; food that was kicked and then caught in the right
 * bin earns a bounce bonus. When the time is up the level ends with a score
 * summary and the player starts the next one. There is no way to lose: the
 * run ends after the last level.
 *
 * The layer is time-driven through update(dtSeconds) and uses a seeded generator
 * for spawns and belt reversals, so the same seed always brings the same food
 * (which is what makes a PeerRacer race fair). World size is a fixed 600 x 760.
 *
 * Based on the game design in jimothy_the_raccoon_trash_conveyor_frenzy.html,
 * with slower falling food and a speed setting.
 */

import { SplitMix64 } from '../core/prng.js';

export const WORLD = { w: 600, h: 760 };

/** Speed multiplier applied to falling, belt travel and spawn rate. 1 is the original game. */
export const SPEEDS = {
  relaxed: { id: 'relaxed', label: 'Relaxed', mult: 0.45 },
  normal: { id: 'normal', label: 'Normal', mult: 0.6 },
  quick: { id: 'quick', label: 'Quick', mult: 0.8 },
  original: { id: 'original', label: 'Original', mult: 1 }
};
export const DEFAULT_SPEED = 'normal';

export const CANS = ['YELLOW', 'GREEN', 'RED'];
export const CAN_INFO = {
  YELLOW: { color: '#eab308', ringColor: '#fef08a', name: 'Banana', emoji: '🍌', label: 'Yellow' },
  GREEN: { color: '#22c55e', ringColor: '#bbf7d0', name: 'Lettuce', emoji: '🥗', label: 'Green' },
  RED: { color: '#ef4444', ringColor: '#fecaca', name: 'Apple', emoji: '🍎', label: 'Red' }
};

export const ITEM_TYPES = {
  BANANA: { type: 'food', matchCan: 'YELLOW', emoji: '🍌', score: 100, radius: 17, color: '#facc15' },
  LETTUCE: { type: 'food', matchCan: 'GREEN', emoji: '🥗', score: 100, radius: 17, color: '#4ade80' },
  APPLE: { type: 'food', matchCan: 'RED', emoji: '🍎', score: 100, radius: 17, color: '#f87171' },
  DONUT: { type: 'power', effect: 'BONUS', emoji: '🍩', score: 300, radius: 18, color: '#fbbf24' },
  FREEZE: { type: 'power', effect: 'FREEZE', emoji: '⏱️', score: 50, radius: 17, color: '#38bdf8' },
  MAGNET: { type: 'power', effect: 'MAGNET', emoji: '🧲', score: 50, radius: 17, color: '#ec4899' },
  ROTTEN: { type: 'hazard', effect: 'DAMAGE', emoji: '☠️', score: 0, radius: 18, color: '#71717a' }
};

export const LEVEL_SECONDS = 50;
export const ROTTEN_PENALTY = 100;   // points lost for catching rotten trash
export const BOUNCE_BONUS = 50;      // extra points for a right catch after a trampoline kick
export const MAX_BOUNCES = 1;        // a piece of food is kicked once
export const STAR_BONUS = 200;       // per star, added when a level ends

/**
 * Levels. Belts: y/width/offset are ratios of the world; offset 0 hugs the left wall and 1 the right.
 * Bouncers: cx is the centre of the slide as a ratio of the width, amp how far it slides each way
 * (ratio of the width), period the seconds for one trip there and back.
 */
export const LEVELS = [
  {
    id: 1, name: 'Back Alley', theme: 'alley', pace: 1, rotten: 0.03,
    blurb: 'Three belts and a dumpster. Warm up and learn the bins.',
    belts: [
      { yRatio: 0.22, widthRatio: 0.68, xOffsetRatio: 0.85, speed: 95, dir: -1 },
      { yRatio: 0.44, widthRatio: 0.70, xOffsetRatio: 0.15, speed: 110, dir: 1 },
      { yRatio: 0.66, widthRatio: 0.68, xOffsetRatio: 0.80, speed: 115, dir: -1 }
    ],
    bouncers: []
  },
  {
    id: 2, name: 'Fish Market Dock', theme: 'dock', pace: 1.06, rotten: 0.04,
    blurb: 'A trampoline slides along the dock. Food that lands on it is kicked back up to the belt above.',
    belts: [
      { yRatio: 0.20, widthRatio: 0.62, xOffsetRatio: 0.10, speed: 100, dir: 1 },
      { yRatio: 0.40, widthRatio: 0.66, xOffsetRatio: 0.90, speed: 110, dir: -1 },
      { yRatio: 0.62, widthRatio: 0.70, xOffsetRatio: 0.50, speed: 120, dir: 1 }
    ],
    bouncers: [{ yRatio: 0.80, w: 96, cx: 0.5, amp: 0.30, period: 7, phase: 0 }]
  },
  {
    id: 3, name: 'Pizzeria Kitchen', theme: 'kitchen', pace: 1.12, rotten: 0.05,
    blurb: 'Four short belts packed close together and a trampoline that kicks food to the lowest belt.',
    belts: [
      { yRatio: 0.16, widthRatio: 0.58, xOffsetRatio: 0.90, speed: 100, dir: -1 },
      { yRatio: 0.32, widthRatio: 0.58, xOffsetRatio: 0.10, speed: 110, dir: 1 },
      { yRatio: 0.48, widthRatio: 0.58, xOffsetRatio: 0.90, speed: 118, dir: -1 },
      { yRatio: 0.64, widthRatio: 0.58, xOffsetRatio: 0.10, speed: 125, dir: 1 }
    ],
    bouncers: [{ yRatio: 0.80, w: 90, cx: 0.5, amp: 0.34, period: 6, phase: 1.2 }]
  },
  {
    id: 4, name: 'Rooftop Garden', theme: 'garden', pace: 1.18, rotten: 0.06,
    blurb: 'Two trampolines at different heights. Catch what they send flying.',
    belts: [
      { yRatio: 0.18, widthRatio: 0.52, xOffsetRatio: 0.15, speed: 105, dir: 1 },
      { yRatio: 0.44, widthRatio: 0.52, xOffsetRatio: 0.85, speed: 115, dir: -1 },
      { yRatio: 0.64, widthRatio: 0.62, xOffsetRatio: 0.35, speed: 125, dir: 1 }
    ],
    bouncers: [
      { yRatio: 0.34, w: 84, cx: 0.45, amp: 0.34, period: 6.5, phase: 0 },
      { yRatio: 0.80, w: 90, cx: 0.5, amp: 0.30, period: 5.5, phase: 2.4 }
    ]
  },
  {
    id: 5, name: 'Moon Dump', theme: 'moon', pace: 1.25, rotten: 0.08,
    blurb: 'Low gravity feel, fast belts and more rotten trash. Last level, give it everything.',
    belts: [
      { yRatio: 0.16, widthRatio: 0.55, xOffsetRatio: 0.88, speed: 110, dir: -1 },
      { yRatio: 0.34, widthRatio: 0.55, xOffsetRatio: 0.12, speed: 120, dir: 1 },
      { yRatio: 0.50, widthRatio: 0.55, xOffsetRatio: 0.88, speed: 128, dir: -1 },
      { yRatio: 0.66, widthRatio: 0.55, xOffsetRatio: 0.12, speed: 135, dir: 1 }
    ],
    bouncers: [
      { yRatio: 0.42, w: 80, cx: 0.5, amp: 0.36, period: 6, phase: 0.8 },
      { yRatio: 0.80, w: 88, cx: 0.5, amp: 0.32, period: 5, phase: 3.1 }
    ]
  }
];

export const BELT_HEIGHT = 24;
const JIMOTHY_SPEED = 460;      // px per second, not scaled: slower food gives you more time
const FREEZE_FACTOR = 0.15;
const STEP = 1 / 60;
const BOUNCER_THICK = 14;

export class TrashConveyorGame {
  constructor(options = {}) {
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.speedId = SPEEDS[options.speed] ? options.speed : DEFAULT_SPEED;
    this.mult = SPEEDS[this.speedId].mult;
    this.lm = this.mult;
    this.dealCode = SplitMix64.formatDealCode('JM', this.seed);
    this.rng = new SplitMix64(this.seed);
    this.rngCount = 0;

    this.state = {
      seed: this.seed,
      speed: this.speedId,
      score: 0,
      moves: 0,           // items caught correctly
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      time: 0,            // seconds played in the whole run
      level: 1,
      totalLevels: LEVELS.length,
      levelSeconds: LEVEL_SECONDS,
      levelTime: 0,
      phase: 'play',      // play | between | done
      summary: null,      // set when a level ends
      levelResults: [],
      nextSpawn: 1.5,
      itemSeq: 0,
      freezeTimer: 0,
      magnetTimer: 0,
      activeCan: 'YELLOW',
      jimothy: { x: WORLD.w / 2, targetX: WORLD.w / 2, moveDir: 0, expression: 'normal', expressionTimer: 0 },
      belts: [],
      bouncers: [],
      items: [],
      stats: null,
      rngCount: this.rngCount,
      won: false,
      over: false
    };
    this._buildLevel(1);
  }

  /** Rebuilds a game from a saved snapshot. Snapshots from before the level system are ignored. */
  static fromState(saved) {
    const game = new TrashConveyorGame({ seed: saved.seed, speed: saved.speed });
    if (Array.isArray(saved.belts) && saved.belts.length && saved.level && saved.phase) {
      game.state = JSON.parse(JSON.stringify({ ...game.state, ...saved }));
      game.rng = new SplitMix64(saved.seed);
      game.rngCount = 0;
      for (let i = 0; i < (saved.rngCount || 0); i++) game._rand();
      game._applyPace();
    }
    return game;
  }

  _rand() {
    this.rngCount++;
    if (this.state) this.state.rngCount = this.rngCount;
    return this.rng.nextFloat();
  }

  levelDef() { return LEVELS[Math.min(this.state.level, LEVELS.length) - 1]; }

  _applyPace() { this.lm = this.mult * this.levelDef().pace; }

  /** Gravity in px/s^2, the same for falling food and for working out how hard a trampoline kicks. */
  _gravity() { return 460 * this.lm * this.lm; }

  _buildLevel(level) {
    const s = this.state;
    s.level = level;
    this._applyPace();
    const def = this.levelDef();
    s.belts = def.belts.map((d, i) => {
      const w = WORLD.w * d.widthRatio;
      return {
        id: i, x: (WORLD.w - w) * d.xOffsetRatio, y: WORLD.h * d.yRatio, w, h: BELT_HEIGHT,
        speed: d.speed * this.lm, dir: d.dir, offset: 0,
        reverseTimer: 6 + this._rand() * 5, warningTimer: 0
      };
    });
    s.bouncers = def.bouncers.map((d, i) => {
      const b = {
        id: i, y: WORLD.h * d.yRatio, w: d.w, cx: WORLD.w * d.cx, amp: WORLD.w * d.amp,
        period: d.period, phase: d.phase, x: 0
      };
      b.x = this._bouncerX(b, 0);
      return b;
    });
    s.items = [];
    s.levelTime = 0;
    s.nextSpawn = 1.5;
    s.freezeTimer = 0;
    s.magnetTimer = 0;
    s.combo = 0;
    s.multiplier = 1;
    s.phase = 'play';
    s.summary = null;
    s.stats = { startScore: s.score, caught: 0, offcolor: 0, missed: 0, rotten: 0, bounced: 0, maxCombo: 0 };
  }

  _bouncerX(b, t) {
    return b.cx + b.amp * Math.sin((2 * Math.PI * t) / b.period + b.phase);
  }

  // ------------------------------------------------------------------
  // Player actions
  // ------------------------------------------------------------------

  _live() { return !this.state.over; }
  _playing() { return !this.state.over && this.state.phase === 'play'; }

  /** -1 left, 0 stop, 1 right: held-key movement. */
  setMove(dir) { this.state.jimothy.moveDir = dir; }

  setTargetX(x) { if (this._live()) this.state.jimothy.targetX = x; }

  nudge(px) { if (this._live()) this.state.jimothy.targetX = this.state.jimothy.x + px; }

  setCan(key) {
    if (!this._live() || !CAN_INFO[key] || this.state.activeCan === key) return false;
    this.state.activeCan = key;
    return true;
  }

  /** dir 1 = next bin, -1 = previous bin. */
  cycleCan(dir = 1) {
    const i = CANS.indexOf(this.state.activeCan);
    return this.setCan(CANS[(i + (dir >= 0 ? 1 : CANS.length - 1)) % CANS.length]);
  }

  /** Starts the next level from the score summary. Returns false when there is nothing to start. */
  startNextLevel() {
    const s = this.state;
    if (s.over || s.phase !== 'between') return false;
    this._buildLevel(s.level + 1);
    return true;
  }

  // ------------------------------------------------------------------
  // Time
  // ------------------------------------------------------------------

  /**
   * Advances the game by dt seconds.
   * @returns {Array<object>} events for the view: catch, bounce, offcolor, rotten, power, miss, levelEnd, over
   */
  update(dt) {
    const events = [];
    let left = Math.min(dt, 0.25);
    while (left > 1e-6 && this._playing()) {
      const step = Math.min(STEP, left);
      this._step(step, events);
      left -= step;
    }
    return events;
  }

  spawnInterval() {
    const s = this.state;
    const scale = Math.pow(this.lm, 0.8);
    const ramp = 1350 - 250 * Math.min(1, s.levelTime / LEVEL_SECONDS) - 60 * (s.level - 1);
    return Math.max(650 / scale, ramp / scale) / 1000;
  }

  _step(dt, events) {
    const s = this.state;
    s.time += dt;
    s.levelTime += dt;
    s.freezeTimer = Math.max(0, s.freezeTimer - dt);
    s.magnetTimer = Math.max(0, s.magnetTimer - dt);
    const frozen = s.freezeTimer > 0;

    s.nextSpawn -= dt;
    if (s.nextSpawn <= 0) {
      this._spawn(events);
      s.nextSpawn = this.spawnInterval();
    }

    for (const belt of s.belts) this._updateBelt(belt, dt, frozen, events);
    for (const b of s.bouncers) b.x = this._bouncerX(b, s.levelTime);
    this._updateJimothy(dt);

    const magnet = s.magnetTimer > 0;
    for (const item of s.items) this._updateItem(item, dt, magnet, frozen, events);
    s.items = s.items.filter(i => !i.dead);

    if (s.levelTime >= LEVEL_SECONDS) this._endLevel(events);
  }

  _updateBelt(belt, dt, frozen, events) {
    const speed = frozen ? belt.speed * FREEZE_FACTOR : belt.speed;
    belt.offset = (belt.offset + belt.dir * speed * dt) % 24;
    if (frozen) return;
    belt.reverseTimer -= dt;
    if (belt.reverseTimer <= 1.6 && belt.warningTimer <= 0 && belt.reverseTimer > 0) {
      belt.warningTimer = 1.6;
      events.push({ type: 'reverseWarn', belt: belt.id });
    }
    if (belt.warningTimer > 0) belt.warningTimer -= dt;
    if (belt.reverseTimer <= 0) {
      belt.dir = -belt.dir;
      belt.warningTimer = 0;
      belt.reverseTimer = 7 + this._rand() * 7;
      events.push({ type: 'reverse', belt: belt.id });
    }
  }

  _updateJimothy(dt) {
    const j = this.state.jimothy;
    const half = 36;
    if (j.moveDir) {
      j.x += j.moveDir * JIMOTHY_SPEED * dt;
      j.targetX = j.x;
    } else {
      const dx = j.targetX - j.x;
      const maxStep = JIMOTHY_SPEED * dt;
      if (Math.abs(dx) > 1) j.x += Math.sign(dx) * Math.min(Math.abs(dx), maxStep);
    }
    j.x = Math.max(half + 6, Math.min(WORLD.w - half - 6, j.x));
    j.targetX = Math.max(half + 6, Math.min(WORLD.w - half - 6, j.targetX));
    if (j.expressionTimer > 0) {
      j.expressionTimer -= dt;
      if (j.expressionTimer <= 0) j.expression = 'normal';
    }
  }

  jimothyY() { return WORLD.h - 46; }

  _spawn(events) {
    const def = this.levelDef();
    const x = 40 + this._rand() * (WORLD.w - 80);
    const roll = this._rand();
    const foodEach = (1 - 0.13 - def.rotten) / 3;
    let key;
    if (roll < foodEach) key = 'BANANA';
    else if (roll < foodEach * 2) key = 'LETTUCE';
    else if (roll < foodEach * 3) key = 'APPLE';
    else if (roll < foodEach * 3 + 0.05) key = 'DONUT';
    else if (roll < foodEach * 3 + 0.10) key = 'FREEZE';
    else if (roll < foodEach * 3 + 0.13) key = 'MAGNET';
    else key = 'ROTTEN';
    const rotSpeed = (this._rand() - 0.5) * 4;
    this.state.items.push({
      id: ++this.state.itemSeq, born: this.state.time, key, x, y: 10, vx: 0, vy: 60 * this.lm, onBelt: -1,
      rotation: 0, rotSpeed, magnetized: false, bounces: 0, dead: false
    });
    events.push({ type: 'spawn', x });
  }

  _updateItem(item, dt, magnet, frozen, events) {
    const s = this.state;
    const info = ITEM_TYPES[item.key];
    const j = s.jimothy;
    const m = this.lm;

    if (magnet && info.type === 'food' && info.matchCan === s.activeCan) {
      item.vx += (j.x - item.x) * 5 * dt;
      item.vy += (this.jimothyY() - 40 - item.y) * 5 * dt;
      item.onBelt = -1;
      item.magnetized = true;
    }

    const belt = item.onBelt >= 0 ? s.belts[item.onBelt] : null;
    if (belt) {
      const speed = frozen ? belt.speed * FREEZE_FACTOR : belt.speed;
      item.x += belt.dir * speed * dt;
      item.rotation += belt.dir * 4.5 * dt * m;
      if (item.x < belt.x - 4 || item.x > belt.x + belt.w + 4) {
        item.vx = belt.dir * speed * 0.7;
        item.vy = 40 * m;
        item.onBelt = -1;
      }
    } else {
      item.vy = Math.min(item.vy + this._gravity() * dt, item.magnetized ? 900 : 520 * m);
      if (!item.magnetized) item.vx *= Math.max(0, 1 - 1.4 * dt); // tumbling food loses its sideways push
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.rotation += item.rotSpeed * dt;
      // Side walls: food bounces back instead of leaving the screen where nobody can catch it.
      const edge = info.radius + 2;
      if (item.x < edge) { item.x = edge; item.vx = Math.abs(item.vx) * 0.4; }
      else if (item.x > WORLD.w - edge) { item.x = WORLD.w - edge; item.vx = -Math.abs(item.vx) * 0.4; }
      if (!item.magnetized) {
        for (const b of s.belts) {
          if (item.vy > 0 && item.x >= b.x - 4 && item.x <= b.x + b.w + 4 &&
              item.y + info.radius >= b.y && item.y - info.radius <= b.y + 12) {
            item.y = b.y - info.radius;
            item.vy = 0;
            item.vx = 0;
            item.onBelt = b.id;
            break;
          }
        }
        if (item.onBelt < 0 && item.vy > 0 && (item.bounces || 0) < MAX_BOUNCES) this._tryBounce(item, info, events);
      }
    }

    // Caught in the held bin?
    const zoneY = this.jimothyY() - 50;
    if (item.y >= zoneY - 14 && item.y <= zoneY + 28 && Math.abs(item.x - j.x) < 36) {
      item.dead = true;
      this._caught(item, info, events);
      return;
    }

    // Hit the floor.
    if (item.y > WORLD.h + 30) {
      item.dead = true;
      if (info.type === 'food') this._dropped(events, item);
    }
  }

  /** A falling item that lands on a trampoline is kicked up to just above the nearest belt over it. */
  _tryBounce(item, info, events) {
    const s = this.state;
    for (const b of s.bouncers) {
      const bottom = item.y + info.radius;
      if (Math.abs(item.x - b.x) > b.w / 2 + 4 || bottom < b.y || bottom > b.y + BOUNCER_THICK + 10) continue;
      const above = s.belts.filter(bb => bb.y < b.y - 24).sort((p, q) => q.y - p.y)[0];
      const rise = above ? b.y - above.y + 46 : 260;
      item.y = b.y - info.radius;
      item.vy = -Math.sqrt(2 * this._gravity() * rise);
      const aim = above ? above.x + above.w / 2 : item.x;
      item.vx = Math.max(-170, Math.min(170, (aim - item.x) * 0.8));
      item.bounces = (item.bounces || 0) + 1;
      events.push({ type: 'bounce', x: item.x, y: b.y, bouncer: b.id, key: item.key });
      return;
    }
  }

  _caught(item, info, events) {
    const s = this.state;
    const j = s.jimothy;
    if (info.type === 'food') {
      if (info.matchCan === s.activeCan) {
        s.combo++;
        s.maxCombo = Math.max(s.maxCombo, s.combo);
        s.stats.maxCombo = Math.max(s.stats.maxCombo, s.combo);
        s.multiplier = Math.min(5, 1 + Math.floor(s.combo / 4));
        const bounceBonus = (item.bounces || 0) > 0 ? BOUNCE_BONUS : 0;
        const earned = info.score * s.multiplier + bounceBonus;
        s.score += earned;
        s.moves++;
        s.stats.caught++;
        if (bounceBonus) s.stats.bounced++;
        j.expression = 'happy'; j.expressionTimer = 0.5;
        events.push({ type: 'catch', x: item.x, y: item.y, key: item.key, age: s.time - item.born, earned, bounceBonus, multiplier: s.multiplier, combo: s.combo });
      } else {
        // Allowed, but worth nothing. The streak is kept.
        s.stats.offcolor++;
        events.push({ type: 'offcolor', x: item.x, y: item.y, key: item.key, age: s.time - item.born });
      }
    } else if (info.type === 'power') {
      if (info.effect === 'BONUS') {
        const bonus = 300 * s.multiplier;
        s.score += bonus;
        events.push({ type: 'power', effect: 'BONUS', x: item.x, y: item.y, earned: bonus });
      } else if (info.effect === 'FREEZE') {
        s.freezeTimer = 5;
        events.push({ type: 'power', effect: 'FREEZE', x: item.x, y: item.y });
      } else if (info.effect === 'MAGNET') {
        s.magnetTimer = 6;
        events.push({ type: 'power', effect: 'MAGNET', x: item.x, y: item.y });
      }
    } else {
      const lost = Math.min(s.score, ROTTEN_PENALTY);
      s.score -= lost;
      s.combo = 0;
      s.multiplier = 1;
      s.stats.rotten++;
      j.expression = 'dizzy'; j.expressionTimer = 0.6;
      events.push({ type: 'rotten', x: item.x, y: Math.min(item.y, WORLD.h - 30), key: item.key, lost, age: s.time - item.born });
    }
  }

  _dropped(events, item) {
    const s = this.state;
    s.combo = 0;
    s.multiplier = 1;
    s.stats.missed++;
    events.push({ type: 'miss', x: item.x, y: WORLD.h - 30, key: item.key, age: s.time - item.born });
  }

  /** Closes the level: stars from accuracy, a bonus for them, then the summary (or the end of the run). */
  _endLevel(events) {
    const s = this.state;
    const st = s.stats;
    const food = st.caught + st.offcolor + st.missed;
    const accuracy = food ? st.caught / food : 0;
    const stars = accuracy >= 0.8 ? 3 : (accuracy >= 0.6 ? 2 : 1);
    const bonus = stars * STAR_BONUS;
    s.score += bonus;
    const def = this.levelDef();
    s.summary = {
      level: s.level, name: def.name, stars, accuracy, bonus,
      caught: st.caught, offcolor: st.offcolor, missed: st.missed, rotten: st.rotten, bounced: st.bounced,
      bestCombo: st.maxCombo, levelScore: s.score - st.startScore, totalScore: s.score,
      last: s.level >= LEVELS.length
    };
    s.levelResults.push(s.summary);
    s.items = [];
    s.freezeTimer = 0;
    s.magnetTimer = 0;
    s.combo = 0;
    s.multiplier = 1;
    events.push({ type: 'levelEnd', summary: s.summary });
    if (s.summary.last) {
      s.phase = 'done';
      s.won = true;
      s.over = true;
      events.push({ type: 'over' });
    } else {
      s.phase = 'between';
    }
  }

  // ------------------------------------------------------------------
  // Teacher
  // ------------------------------------------------------------------

  /** Points at the next item that matters and says which bin to hold. */
  getTacticalHint() {
    const s = this.state;
    if (s.over) return null;
    if (s.phase === 'between') return { action: 'WAIT', message: 'Level finished. Press Next level when you are ready.' };
    const zoneY = this.jimothyY() - 50;
    const upcoming = s.items
      .filter(i => i.y < zoneY + 30)
      .map(i => ({ i, info: ITEM_TYPES[i.key] }))
      .sort((a, b) => b.i.y - a.i.y);
    const next = upcoming.find(u => u.info.type !== 'power') || upcoming[0];
    if (!next) return { action: 'WAIT', message: 'Nothing is falling yet. Stay near the middle so you can reach either side.' };
    const { i, info } = next;
    const side = i.x < s.jimothy.x - 20 ? 'left' : (i.x > s.jimothy.x + 20 ? 'right' : 'above you');
    if (info.type === 'hazard') return { action: 'DODGE', message: `Rotten trash is coming down on your ${side}. Slide out of its way.` };
    if (info.type === 'power') return { action: 'GRAB', message: `${info.emoji} Power-up on your ${side}. Move under it for a bonus.` };
    const can = info.matchCan;
    const keyNo = CANS.indexOf(can) + 1;
    if (can === s.activeCan) return { action: 'MOVE', can, message: `${info.emoji} is on your ${side} and matches your ${CAN_INFO[can].label} bin. Just move under it.` };
    return { action: 'SWITCH', can, message: `Switch to the ${CAN_INFO[can].label} bin (key ${keyNo}) for the ${info.emoji}, then move to your ${side}.` };
  }

  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }
}
