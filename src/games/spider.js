/**
 * Solitaire Sovereign - Spider Rules Engine
 * 
 * Rules Architecture:
 * - 104 cards (2 standard decks).
 * - Suit modes: 1-suit (Spades), 2-suits (Spades & Hearts), 4-suits (Standard 2 decks).
 * - 10 Tableau columns: 54 cards initial deal (4 cols of 6 cards, 6 cols of 5 cards).
 * - Stock contains 50 cards (dealt 10 cards at a time, 1 to each column).
 * - Any descending sequence of same-suit cards can be moved as a unit.
 * - Completed run: King through Ace of identical suit is automatically cleared to foundation.
 * - Win: 8 completed suit runs.
 */

import { Card, SUITS } from '../core/card.js';
import { SplitMix64 } from '../core/prng.js';
import { CommandValidator } from '../core/validator.js';

export class SpiderGame {
  /**
   * @param {Object} options
   * @param {number} options.numSuits 1, 2, or 4
   * @param {bigint|number|string} options.seed
   */
  constructor(options = {}) {
    this.numSuits = options.numSuits || 1;
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.dealCode = SplitMix64.formatDealCode(`SP${this.numSuits}`, this.seed);

    this.state = this._createInitialState();
    this.undoStack = [];
    this.redoStack = [];
  }

  _createInitialState() {
    const prng = new SplitMix64(this.seed);
    const deck = [];

    // Construct 104 cards based on suit mode
    if (this.numSuits === 1) {
      // 8 decks of 13 Spades
      for (let run = 0; run < 8; run++) {
        for (let r = 0; r < 13; r++) {
          const c = new Card(SUITS.SPADES * 13 + r, false);
          c.id = run * 13 + r;
          deck.push(c);
        }
      }
    } else if (this.numSuits === 2) {
      // 4 sets of 13 Spades, 4 sets of 13 Hearts
      for (let run = 0; run < 4; run++) {
        for (let r = 0; r < 13; r++) {
          const cSpade = new Card(SUITS.SPADES * 13 + r, false);
          cSpade.id = run * 26 + r;
          deck.push(cSpade);

          const cHeart = new Card(SUITS.HEARTS * 13 + r, false);
          cHeart.id = run * 26 + 13 + r;
          deck.push(cHeart);
        }
      }
    } else {
      // 2 standard decks (4 suits)
      const d1 = Card.createStandardDeck(1);
      const d2 = Card.createStandardDeck(1).map(c => {
        c.id += 52;
        return c;
      });
      deck.push(...d1, ...d2);
    }

    prng.shuffle(deck);

    // Deal 54 cards to 10 tableau columns
    const tableau = Array.from({ length: 10 }, () => []);
    let cardIdx = 0;

    for (let c = 0; c < 10; c++) {
      const colSize = (c < 4) ? 6 : 5;
      for (let r = 0; r < colSize; r++) {
        const card = deck[cardIdx++];
        card.faceUp = (r === colSize - 1);
        tableau[c].push(card);
      }
    }

    // Remaining 50 cards to stock in 5 deals of 10
    const stock = deck.slice(cardIdx).map(c => {
      c.faceUp = false;
      return c;
    });

    return {
      gameType: 'spider',
      numSuits: this.numSuits,
      seed: this.seed,
      dealCode: this.dealCode,
      tableau,
      stock,
      foundations: [], // Completed runs stored here
      completedRuns: 0,
      score: 1000,
      moves: 0,
      timeSeconds: 0,
      won: false
    };
  }

  /**
   * Deal 10 cards from stock (one to each column)
   */
  dealRow() {
    if (this.state.stock.length < 10) return false;

    // Check if empty columns exist (classic rule: columns must not be empty)
    // Relaxed option: allow dealing even with empty columns
    const nextState = CommandValidator._cloneState(this.state);
    for (let c = 0; c < 10; c++) {
      const card = nextState.stock.pop();
      card.faceUp = true;
      nextState.tableau[c].push(card);
    }

    nextState.moves += 1;
    this.undoStack.push({ type: 'REVERSE_SPIDER_DEAL' });
    this.redoStack = [];
    this.state = nextState;

    // Check for newly completed runs
    this._checkAndClearCompletedRuns();
    return true;
  }

  /**
   * Verify if cards forms a valid same-suit descending sequence
   */
  isValidSameSuitSequence(cards) {
    for (let i = 0; i < cards.length - 1; i++) {
      const parent = cards[i];
      const child = cards[i + 1];
      if (child.suit !== parent.suit || child.rank !== parent.rank - 1) {
        return false;
      }
    }
    return true;
  }

  moveCards(source, target, count = 1) {
    const srcCol = this.state.tableau[source.index];
    if (srcCol.length < count) return false;

    const movingCards = srcCol.slice(srcCol.length - count);
    if (!this.isValidSameSuitSequence(movingCards)) return false;

    const tgtCol = this.state.tableau[target.index];
    const topTgt = tgtCol.length > 0 ? tgtCol[tgtCol.length - 1] : null;

    if (!movingCards[0].canStackOnSpider(topTgt)) {
      return false;
    }

    const res = CommandValidator.apply(this.state, {
      type: 'MOVE',
      source,
      target,
      count
    });

    if (res.ok) {
      this.undoStack.push(res.reverseCommand);
      this.redoStack = [];
      this.state = res.state;

      // Award bonus if same suit build
      if (topTgt && topTgt.suit === movingCards[0].suit) {
        this.state.score += 5;
      }

      this._checkAndClearCompletedRuns();
      this._checkWinCondition();
      return true;
    }
    return false;
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const rev = this.undoStack.pop();

    if (rev.type === 'REVERSE_SPIDER_DEAL') {
      const nextState = CommandValidator._cloneState(this.state);
      for (let c = 9; c >= 0; c--) {
        const card = nextState.tableau[c].pop();
        card.faceUp = false;
        nextState.stock.push(card);
      }
      nextState.moves = Math.max(0, nextState.moves - 1);
      this.state = nextState;
      return true;
    }

    this.state = CommandValidator.applyReverse(this.state, rev);
    return true;
  }

  /**
   * Scans all columns for a complete 13-card K -> A run of the same suit
   */
  _checkAndClearCompletedRuns() {
    let clearedAny = false;
    for (let c = 0; c < 10; c++) {
      const col = this.state.tableau[c];
      if (col.length < 13) continue;

      // Scan from bottom up for King down to Ace
      const top13 = col.slice(col.length - 13);
      if (top13[0].rank === 12 && top13[12].rank === 0 && this.isValidSameSuitSequence(top13)) {
        // Remove 13 cards
        col.splice(col.length - 13, 13);
        this.state.foundations.push(top13);
        this.state.completedRuns += 1;
        this.state.score += 200;
        clearedAny = true;

        // Auto-flip newly exposed card
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1].faceUp = true;
          this.state.score += 10;
        }
      }
    }
    return clearedAny;
  }

  /**
   * Evaluates all currently legal moves in Spider and returns a tactical hint
   */
  getTacticalHint() {
    // A card that already sits on its same-suit predecessor is part of a built
    // run; moving it only splits the run, so no hint should ever do that.
    const splitsRun = (col, cIdx) => {
      if (cIdx === 0) return false;
      const below = col[cIdx - 1];
      const card = col[cIdx];
      return below.faceUp && below.suit === card.suit && below.rank === card.rank + 1;
    };
    // True if the card exposed by moving col[cIdx] away is face down or can then
    // make a same-suit build on another column's top card.
    const exposesBuild = (srcC, col, cIdx) => {
      if (cIdx === 0) return false;
      const below = col[cIdx - 1];
      if (!below.faceUp) return true;
      for (let o = 0; o < 10; o++) {
        if (o === srcC) continue;
        const oc = this.state.tableau[o];
        const top = oc.length ? oc[oc.length - 1] : null;
        if (top && top.suit === below.suit && top.rank === below.rank + 1) return true;
      }
      return false;
    };
    // 1. Same-suit moves that reveal a face-down card
    for (let c = 0; c < 10; c++) {
      const col = this.state.tableau[c];
      if (col.length === 0) continue;

      for (let cIdx = 0; cIdx < col.length; cIdx++) {
        const card = col[cIdx];
        if (!card.faceUp) continue;

        const movingCards = col.slice(cIdx);
        if (!this.isValidSameSuitSequence(movingCards)) continue;
        if (splitsRun(col, cIdx)) continue;

        const willUncover = (cIdx > 0 && !col[cIdx - 1].faceUp);

        for (let targetC = 0; targetC < 10; targetC++) {
          if (c === targetC) continue;
          const targetCol = this.state.tableau[targetC];
          if (targetCol.length === 0) continue;
          const topTgt = targetCol[targetCol.length - 1];

          // Same-suit build
          if (topTgt.suit === card.suit && topTgt.rank === card.rank + 1) {
            return {
              source: { zone: 'tableau', index: c, cardIndex: cIdx },
              target: { zone: 'tableau', index: targetC },
              count: movingCards.length,
              message: `Same-Suit Build: Move ${card.shortCode} onto ${topTgt.shortCode} in Column ${targetC + 1}${willUncover ? ' to reveal hidden card!' : '.'}`
            };
          }
        }
      }
    }

    // 2. Different-suit moves that reveal a face-down card
    for (let c = 0; c < 10; c++) {
      const col = this.state.tableau[c];
      if (col.length === 0) continue;

      for (let cIdx = 0; cIdx < col.length; cIdx++) {
        const card = col[cIdx];
        if (!card.faceUp) continue;

        const movingCards = col.slice(cIdx);
        if (!this.isValidSameSuitSequence(movingCards)) continue;
        if (splitsRun(col, cIdx)) continue;

        const willUncover = (cIdx > 0 && !col[cIdx - 1].faceUp);
        if (!willUncover) continue;

        for (let targetC = 0; targetC < 10; targetC++) {
          if (c === targetC) continue;
          const targetCol = this.state.tableau[targetC];
          const topTgt = targetCol.length > 0 ? targetCol[targetCol.length - 1] : null;

          if (topTgt && topTgt.rank === card.rank + 1) {
            return {
              source: { zone: 'tableau', index: c, cardIndex: cIdx },
              target: { zone: 'tableau', index: targetC },
              count: movingCards.length,
              message: `Move ${card.shortCode} stack onto ${topTgt.shortCode} in Column ${targetC + 1} to reveal a hidden card!`
            };
          }
        }
      }
    }

    // 3. Move into empty columns if revealing a card
    for (let c = 0; c < 10; c++) {
      const col = this.state.tableau[c];
      if (col.length <= 1) continue;

      for (let cIdx = 0; cIdx < col.length; cIdx++) {
        const card = col[cIdx];
        if (!card.faceUp) continue;
        const willUncover = (cIdx > 0 && !col[cIdx - 1].faceUp);
        if (!willUncover) continue;

        const movingCards = col.slice(cIdx);
        if (!this.isValidSameSuitSequence(movingCards)) continue;
        if (splitsRun(col, cIdx)) continue;

        for (let targetC = 0; targetC < 10; targetC++) {
          if (c === targetC) continue;
          if (this.state.tableau[targetC].length === 0) {
            return {
              source: { zone: 'tableau', index: c, cardIndex: cIdx },
              target: { zone: 'tableau', index: targetC },
              count: movingCards.length,
              message: `Move ${card.shortCode} stack to empty Column ${targetC + 1} to expose hidden card.`
            };
          }
        }
      }
    }

    // 4. Any legal build
    for (let c = 0; c < 10; c++) {
      const col = this.state.tableau[c];
      if (col.length === 0) continue;

      for (let cIdx = 0; cIdx < col.length; cIdx++) {
        const card = col[cIdx];
        if (!card.faceUp) continue;

        const movingCards = col.slice(cIdx);
        if (!this.isValidSameSuitSequence(movingCards)) continue;
        if (splitsRun(col, cIdx)) continue;
        // Only worthwhile if it empties the column or uncovers something that can build.
        if (cIdx !== 0 && !exposesBuild(c, col, cIdx)) continue;

        for (let targetC = 0; targetC < 10; targetC++) {
          if (c === targetC) continue;
          const targetCol = this.state.tableau[targetC];
          const topTgt = targetCol.length > 0 ? targetCol[targetCol.length - 1] : null;

          if (topTgt && topTgt.rank === card.rank + 1) {
            return {
              source: { zone: 'tableau', index: c, cardIndex: cIdx },
              target: { zone: 'tableau', index: targetC },
              count: movingCards.length,
              message: `Move ${card.shortCode} onto ${topTgt.shortCode} in Column ${targetC + 1}.`
            };
          }
        }
      }
    }

    // 5. Deal row from stock
    if (this.state.stock.length >= 10) {
      return {
        action: 'DEAL_ROW',
        source: { zone: 'stock', index: 0 },
        message: 'Deal another row of 10 cards from the Stock.'
      };
    }

    return null;
  }

  _checkWinCondition() {
    if (this.state.completedRuns === 8) {
      this.state.won = true;
      this.state.score += 500;
    }
    return this.state.won;
  }
}
