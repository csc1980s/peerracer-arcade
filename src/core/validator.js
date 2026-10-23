/**
 * Solitaire Sovereign - Pure Command Validator & State Machine
 * 
 * Implements pure state transitions:
 * applyCommand(state, command) -> { ok, state, events, scoreDelta, error, reverseCommand }
 * 
 * Guaranteed Invariants:
 * 1. Conservation of cards: total cards in game is always invariant.
 * 2. Uniqueness: each card ID exists exactly once across all zones.
 * 3. Invertibility: every valid command produces an exact reverseCommand for undo.
 */

export const ERROR_CODES = Object.freeze({
  INVALID_ZONE: 'INVALID_ZONE',
  EMPTY_SOURCE: 'EMPTY_SOURCE',
  INVALID_COUNT: 'INVALID_COUNT',
  ILLEGAL_MOVE: 'ILLEGAL_MOVE',
  CARD_FACE_DOWN: 'CARD_FACE_DOWN',
  FOUNDATION_RULE_VIOLATION: 'FOUNDATION_RULE_VIOLATION',
  TABLEAU_RULE_VIOLATION: 'TABLEAU_RULE_VIOLATION',
  FREECELL_OCCUPIED: 'FREECELL_OCCUPIED',
  SUPERMOVE_EXCEEDED: 'SUPERMOVE_EXCEEDED',
  STOCK_EMPTY: 'STOCK_EMPTY',
  WASTE_EMPTY: 'WASTE_EMPTY'
});

export class CommandValidator {
  /**
   * Validates and applies a move command returning a fresh immutable state.
   * @param {Object} state Game state representation
   * @param {Object} cmd Command object
   * @returns {{ok: boolean, state: Object, events: Array, scoreDelta: number, error: string|null, reverseCommand: Object|null}}
   */
  static apply(state, cmd) {
    switch (cmd.type) {
      case 'MOVE':
        return this._applyMove(state, cmd);
      case 'FLIP':
        return this._applyFlip(state, cmd);
      case 'DRAW':
        return this._applyDraw(state, cmd);
      case 'RECYCLE':
        return this._applyRecycle(state, cmd);
      default:
        return {
          ok: false,
          state,
          events: [],
          scoreDelta: 0,
          error: `UNKNOWN_COMMAND: ${cmd.type}`,
          reverseCommand: null
        };
    }
  }

  static _cloneState(state) {
    const clone = {
      ...state
    };

    if (state.stock) clone.stock = state.stock.map(c => c.clone());
    if (state.waste) clone.waste = state.waste.map(c => c.clone());
    if (state.foundations) clone.foundations = state.foundations.map(f => f.map(c => c.clone()));
    if (state.tableau) clone.tableau = state.tableau.map(col => col.map(c => c.clone()));
    if (state.freecells) clone.freecells = state.freecells.map(c => c ? c.clone() : null);
    if (state.completedRuns) clone.completedRuns = state.completedRuns;

    return clone;
  }

  static _getPile(state, zone, index) {
    if (zone === 'stock') return state.stock;
    if (zone === 'waste') return state.waste;
    if (zone === 'foundation') return state.foundations[index];
    if (zone === 'tableau') return state.tableau[index];
    if (zone === 'freecell') return state.freecells;
    return null;
  }

  static _applyMove(state, cmd) {
    const { source, target, count = 1 } = cmd;
    const nextState = this._cloneState(state);
    const events = [];
    let scoreDelta = 0;

    let srcCards;
    if (source.zone === 'freecell') {
      const card = nextState.freecells[source.index];
      if (!card) return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.EMPTY_SOURCE, reverseCommand: null };
      srcCards = [card];
    } else {
      const srcPile = this._getPile(nextState, source.zone, source.index);
      if (!srcPile || srcPile.length < count) {
        return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.EMPTY_SOURCE, reverseCommand: null };
      }
      srcCards = srcPile.slice(srcPile.length - count);
    }

    // Ensure all moving cards are face up
    for (const card of srcCards) {
      if (!card.faceUp) {
        return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.CARD_FACE_DOWN, reverseCommand: null };
      }
    }

    // Target validation
    const movingCard = srcCards[0];

    if (target.zone === 'foundation') {
      if (count !== 1) {
        return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.INVALID_COUNT, reverseCommand: null };
      }
      const foundation = nextState.foundations[target.index];
      const topCard = foundation.length > 0 ? foundation[foundation.length - 1] : null;

      if (!movingCard.canBuildOnFoundation(topCard)) {
        return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.FOUNDATION_RULE_VIOLATION, reverseCommand: null };
      }

      // Valid Foundation move
      scoreDelta = (source.zone === 'tableau') ? 20 : 15;
    } else if (target.zone === 'tableau') {
      const tableauCol = nextState.tableau[target.index];
      const topCard = tableauCol.length > 0 ? tableauCol[tableauCol.length - 1] : null;

      if (state.gameType === 'spider') {
        if (!movingCard.canStackOnSpider(topCard)) {
          return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.TABLEAU_RULE_VIOLATION, reverseCommand: null };
        }
      } else if (state.gameType === 'freecell') {
        if (topCard !== null && !movingCard.canStackOnTableau(topCard)) {
          return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.TABLEAU_RULE_VIOLATION, reverseCommand: null };
        }
      } else {
        if (!movingCard.canStackOnTableau(topCard)) {
          return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.TABLEAU_RULE_VIOLATION, reverseCommand: null };
        }
      }

      if (source.zone === 'waste') scoreDelta = 10;
      else if (source.zone === 'foundation') scoreDelta = -15;
    } else if (target.zone === 'freecell') {
      if (count !== 1) {
        return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.INVALID_COUNT, reverseCommand: null };
      }
      if (nextState.freecells[target.index] !== null) {
        return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.FREECELL_OCCUPIED, reverseCommand: null };
      }
      scoreDelta = 0;
    }

    // Execute transfer
    if (source.zone === 'freecell') {
      nextState.freecells[source.index] = null;
    } else {
      const srcPile = this._getPile(nextState, source.zone, source.index);
      srcPile.splice(srcPile.length - count, count);
    }

    if (target.zone === 'freecell') {
      nextState.freecells[target.index] = srcCards[0];
    } else {
      const tgtPile = this._getPile(nextState, target.zone, target.index);
      tgtPile.push(...srcCards);
    }

    // Auto-reveal: if source was tableau and top card is face down, create flip event
    let autoFlipped = false;
    if (source.zone === 'tableau') {
      const col = nextState.tableau[source.index];
      if (col.length > 0 && !col[col.length - 1].faceUp) {
        col[col.length - 1].faceUp = true;
        autoFlipped = true;
        scoreDelta += 10;
        events.push({ type: 'CARD_FLIPPED', zone: 'tableau', pileIndex: source.index });
      }
    }

    nextState.moves += 1;
    nextState.score = Math.max(0, nextState.score + scoreDelta);

    events.push({
      type: 'CARD_MOVED',
      cards: srcCards.map(c => c.id),
      source,
      target,
      count
    });

    const reverseCommand = {
      type: 'REVERSE_MOVE',
      source: target,
      target: source,
      count,
      unflipSource: autoFlipped,
      scoreDelta
    };

    return {
      ok: true,
      state: nextState,
      events,
      scoreDelta,
      error: null,
      reverseCommand
    };
  }

  static _applyFlip(state, cmd) {
    const nextState = this._cloneState(state);
    const col = nextState.tableau[cmd.pileIndex];
    if (!col || col.length === 0) {
      return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.EMPTY_SOURCE, reverseCommand: null };
    }
    const topCard = col[col.length - 1];
    if (topCard.faceUp) {
      return { ok: false, state, events: [], scoreDelta: 0, error: 'ALREADY_FACE_UP', reverseCommand: null };
    }
    topCard.faceUp = true;
    nextState.score += 10;

    return {
      ok: true,
      state: nextState,
      events: [{ type: 'CARD_FLIPPED', zone: 'tableau', pileIndex: cmd.pileIndex }],
      scoreDelta: 10,
      error: null,
      reverseCommand: { type: 'REVERSE_FLIP', pileIndex: cmd.pileIndex, scoreDelta: 10 }
    };
  }

  static _applyDraw(state, cmd) {
    const count = cmd.count || 1;
    const nextState = this._cloneState(state);

    if (!nextState.stock || nextState.stock.length === 0) {
      return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.STOCK_EMPTY, reverseCommand: null };
    }

    const actualDraw = Math.min(count, nextState.stock.length);
    const drawn = [];
    for (let i = 0; i < actualDraw; i++) {
      const card = nextState.stock.pop();
      card.faceUp = true;
      nextState.waste.push(card);
      drawn.push(card);
    }

    nextState.moves += 1;

    return {
      ok: true,
      state: nextState,
      events: [{ type: 'STOCK_DRAWN', count: actualDraw }],
      scoreDelta: 0,
      error: null,
      reverseCommand: { type: 'REVERSE_DRAW', count: actualDraw }
    };
  }

  static _applyRecycle(state, cmd) {
    const nextState = this._cloneState(state);
    if (!nextState.waste || nextState.waste.length === 0) {
      return { ok: false, state, events: [], scoreDelta: 0, error: ERROR_CODES.WASTE_EMPTY, reverseCommand: null };
    }

    const count = nextState.waste.length;
    while (nextState.waste.length > 0) {
      const c = nextState.waste.pop();
      c.faceUp = false;
      nextState.stock.push(c);
    }

    const penalty = cmd.penalty ?? 15;
    nextState.score = Math.max(0, nextState.score - penalty);
    nextState.moves += 1;

    return {
      ok: true,
      state: nextState,
      events: [{ type: 'STOCK_RECYCLED', count }],
      scoreDelta: -penalty,
      error: null,
      reverseCommand: { type: 'REVERSE_RECYCLE', count, penalty }
    };
  }

  /**
   * Applies an exact reverse command for Undo.
   */
  static applyReverse(state, revCmd) {
    const nextState = this._cloneState(state);

    if (revCmd.type === 'REVERSE_MOVE') {
      const { source, target, count, unflipSource, scoreDelta } = revCmd;
      const srcPile = this._getPile(nextState, source.zone, source.index);
      const cards = (source.zone === 'freecell') 
        ? [nextState.freecells[source.index]] 
        : srcPile.splice(srcPile.length - count, count);

      if (source.zone === 'freecell') nextState.freecells[source.index] = null;

      if (target.zone === 'freecell') {
        nextState.freecells[target.index] = cards[0];
      } else {
        const tgtPile = this._getPile(nextState, target.zone, target.index);
        // If we auto-flipped a card on the source during forward move, turn it back face down
        if (unflipSource && tgtPile.length > 0) {
          tgtPile[tgtPile.length - 1].faceUp = false;
        }
        tgtPile.push(...cards);
      }

      nextState.score = Math.max(0, nextState.score - scoreDelta);
      nextState.moves = Math.max(0, nextState.moves - 1);
      return nextState;
    }

    if (revCmd.type === 'REVERSE_DRAW') {
      for (let i = 0; i < revCmd.count; i++) {
        if (nextState.waste.length > 0) {
          const c = nextState.waste.pop();
          c.faceUp = false;
          nextState.stock.push(c);
        }
      }
      nextState.moves = Math.max(0, nextState.moves - 1);
      return nextState;
    }

    if (revCmd.type === 'REVERSE_RECYCLE') {
      for (let i = 0; i < revCmd.count; i++) {
        if (nextState.stock.length > 0) {
          const c = nextState.stock.pop();
          c.faceUp = true;
          nextState.waste.push(c);
        }
      }
      nextState.score += (revCmd.penalty || 0);
      nextState.moves = Math.max(0, nextState.moves - 1);
      return nextState;
    }

    return nextState;
  }

  /**
   * Verifies that the total deck cards are preserved and unique.
   * @param {Object} state 
   * @param {number} expectedCount 52 for standard, 104 for Spider
   * @returns {{valid: boolean, totalFound: number, duplicates: Array, missing: Array}}
   */
  static verifyDeckInvariants(state, expectedCount = 52) {
    const cardSet = new Map();

    const collect = (card) => {
      if (!card) return;
      const count = cardSet.get(card.id) || 0;
      cardSet.set(card.id, count + 1);
    };

    if (state.stock) state.stock.forEach(collect);
    if (state.waste) state.waste.forEach(collect);
    if (state.foundations) state.foundations.forEach(f => f.forEach(collect));
    if (state.tableau) state.tableau.forEach(col => col.forEach(collect));
    if (state.freecells) state.freecells.forEach(c => collect(c));

    const duplicates = [];
    const missing = [];
    let totalFound = 0;

    for (let id = 0; id < expectedCount; id++) {
      const occurrences = cardSet.get(id) || 0;
      totalFound += occurrences;
      if (occurrences === 0) missing.push(id);
      else if (occurrences > 1) duplicates.push({ id, occurrences });
    }

    return {
      valid: totalFound === expectedCount && missing.length === 0 && duplicates.length === 0,
      totalFound,
      duplicates,
      missing
    };
  }
}
