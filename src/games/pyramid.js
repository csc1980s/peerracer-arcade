/**
 * Solitaire Sovereign - Clean-Room Pyramid Solitaire Engine
 * 
 * Rules:
 * - 28 cards dealt into a 7-row overlapping pyramid.
 * - Card (row, col) is blocked if (row+1, col) or (row+1, col+1) is present.
 * - Cards are removed in pairs summing to 13:
 *   - King (13) = removed solo
 *   - Queen (12) + Ace (1) = 13
 *   - Jack (11) + 2 = 13
 *   - 10 + 3 = 13
 *   - 9 + 4 = 13
 *   - 8 + 5 = 13
 *   - 7 + 6 = 13
 * - Stock deals 1 card to Waste. Waste can be recycled up to 3 times.
 * - Win condition: All 28 pyramid cards removed!
 */

import { Card } from '../core/card.js';
import { PRNG } from '../core/prng.js';
import { HeuristicSolver } from '../core/solver.js';

export class PyramidGame {
  constructor(options = {}) {
    this.seed = options.seed || Date.now();
    this.prng = new PRNG(this.seed);
    this.dealCode = HeuristicSolver.generateDealCode ? HeuristicSolver.generateDealCode('pyramid', this.seed) : `PY-${this.seed.toString(36).toUpperCase()}`;

    this.maxRecycles = options.maxRecycles !== undefined ? options.maxRecycles : 3;

    this.state = {
      // 28 pyramid cards: array of { card, row, col, index, removed: bool }
      pyramid: [],
      stock: [],
      waste: [],
      removedCards: [],
      recyclesRemaining: this.maxRecycles,
      score: 0,
      moves: 0,
      won: false
    };

    this.selectedCard = null; // { zone: 'pyramid'|'waste', index: number }
    this.undoStack = [];

    this._deal();
  }

  _deal() {
    const deck = Card.createStandardDeck(1);
    this.prng.shuffle(deck);

    // 28 cards into 7 rows
    let cardIdx = 0;
    this.state.pyramid = [];

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c <= r; c++) {
        const card = deck[cardIdx++];
        card.faceUp = true;
        this.state.pyramid.push({
          card,
          row: r,
          col: c,
          index: this.state.pyramid.length,
          removed: false
        });
      }
    }

    // Remaining 24 cards into Stock
    this.state.stock = [];
    while (cardIdx < 52) {
      const card = deck[cardIdx++];
      card.faceUp = false;
      this.state.stock.push(card);
    }

    this.state.waste = [];
  }

  /**
   * Card rank numeric value in Pyramid (Ace = 1, 2..10, Jack = 11, Queen = 12, King = 13)
   */
  getPyramidValue(card) {
    if (!card) return 0;
    return card.rank + 1; // rank 0=Ace -> 1, rank 12=King -> 13
  }

  /**
   * Checks if a pyramid card is currently exposed / uncovered
   */
  isExposed(pyramidIndex) {
    const item = this.state.pyramid[pyramidIndex];
    if (!item || item.removed) return false;

    const { row, col } = item;
    if (row === 6) return true; // Base row is always exposed if not removed

    // Child cards are in row + 1 at col and col + 1
    const leftChildIdx = this._getIndex(row + 1, col);
    const rightChildIdx = this._getIndex(row + 1, col + 1);

    const leftCover = leftChildIdx !== -1 && !this.state.pyramid[leftChildIdx].removed;
    const rightCover = rightChildIdx !== -1 && !this.state.pyramid[rightChildIdx].removed;

    return !leftCover && !rightCover;
  }

  _getIndex(row, col) {
    if (row < 0 || row > 6 || col < 0 || col > row) return -1;
    const startIdx = (row * (row + 1)) / 2;
    return startIdx + col;
  }

  /**
   * Draw 1 card from Stock to Waste
   */
  drawCard() {
    if (this.state.stock.length > 0) {
      const card = this.state.stock.pop();
      card.faceUp = true;
      this.state.waste.push(card);
      this.state.moves++;
      // Don't clear selection - let user keep pyramid card selected when drawing
      return true;
    } else if (this.state.recyclesRemaining > 0 && this.state.waste.length > 0) {
      // Recycle Waste to Stock
      this.state.recyclesRemaining--;
      while (this.state.waste.length > 0) {
        const card = this.state.waste.pop();
        card.faceUp = false;
        this.state.stock.push(card);
      }
      this.state.moves++;
      // Don't clear selection - let user keep pyramid card selected when recycling
      return true;
    }
    return false;
  }

  isCardBlocked(pyramidIndex) {
    return !this.isExposed(pyramidIndex);
  }

  drawStock() {
    return this.drawCard();
  }

  /**
   * Handles user tapping/clicking a card in Pyramid or Waste
   * Returns: { ok: bool, removed: Array, message: string }
   */
  selectCard(zone, index) {
    let card = null;
    let isPyramid = (zone === 'pyramid');

    if (isPyramid) {
      const item = this.state.pyramid[index];
      if (!item || item.removed || !this.isExposed(index)) {
        return { ok: false, message: 'Card is covered by cards below.' };
      }
      card = item.card;
    } else if (zone === 'waste') {
      if (this.state.waste.length === 0) return { ok: false, message: 'Waste is empty.' };
      card = this.state.waste[this.state.waste.length - 1];
    } else {
      return { ok: false, message: 'Invalid zone.' };
    }

    const val = this.getPyramidValue(card);

    // 1. King (13) can be removed solo!
    if (val === 13) {
      this._removeCards([{ zone, index }]);
      this.selectedCard = null;
      this.state.score += (isPyramid ? 10 : 5);
      this.state.moves++;
      this._checkWinCondition();
      return { ok: true, removed: [card], message: `King removed! (+${isPyramid ? 10 : 5} pts)` };
    }

    // 2. If no card previously selected, select this one
    if (!this.selectedCard) {
      this.selectedCard = { zone, index, val };
      return { ok: true, message: `Selected ${card.shortCode} (${val}). Select matching card summing to 13.` };
    }

    // 3. If clicking the already selected card, deselect it
    if (this.selectedCard.zone === zone && this.selectedCard.index === index) {
      this.selectedCard = null;
      return { ok: true, message: 'Deselected card.' };
    }

    // 4. Check if pair sums to 13
    const sum = this.selectedCard.val + val;
    if (sum === 13) {
      const firstTarget = { zone: this.selectedCard.zone, index: this.selectedCard.index };
      const secondTarget = { zone, index };

      // Store cards before clearing selection
      const firstCard = this.selectedCard.zone === 'pyramid'
        ? this.state.pyramid[this.selectedCard.index].card
        : this.state.waste[this.state.waste.length - 1];
      const secondCard = card;

      let pts = 0;
      if (firstTarget.zone === 'pyramid') pts += 10;
      if (secondTarget.zone === 'pyramid') pts += 10;
      if (pts === 0) pts = 5;

      this._removeCards([firstTarget, secondTarget]);
      const firstVal = this.selectedCard.val; // Store before clearing
      this.selectedCard = null;
      this.state.score += pts;
      this.state.moves++;
      this._checkWinCondition();

      return {
        ok: true,
        removed: [firstCard, secondCard],
        message: `Paired ${firstVal} + ${val} = 13! (+${pts} pts)`
      };
    } else {
      // Not 13 -> change selection to the new card
      this.selectedCard = { zone, index, val };
      return {
        ok: false,
        message: `${sum} is not 13. Selected ${card.shortCode} (${val}).`
      };
    }
  }

  _removeCards(targets) {
    this.undoStack.push({
      targets: targets.map(t => ({ ...t })),
      scoreDelta: 0
    });

    for (const t of targets) {
      if (t.zone === 'pyramid') {
        const item = this.state.pyramid[t.index];
        if (item) {
          item.removed = true;
          this.state.removedCards.push(item.card);
        }
      } else if (t.zone === 'waste') {
        const card = this.state.waste.pop();
        if (card) {
          this.state.removedCards.push(card);
        }
      }
    }
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const action = this.undoStack.pop();

    for (let i = action.targets.length - 1; i >= 0; i--) {
      const t = action.targets[i];
      const card = this.state.removedCards.pop();
      if (!card) continue;

      if (t.zone === 'pyramid') {
        const item = this.state.pyramid[t.index];
        if (item) item.removed = false;
      } else if (t.zone === 'waste') {
        card.faceUp = true;
        this.state.waste.push(card);
      }
    }

    this.selectedCard = null;
    this.state.won = false;
    return true;
  }

  _checkWinCondition() {
    const remainingPyramidCards = this.state.pyramid.filter(p => !p.removed).length;
    if (remainingPyramidCards === 0) {
      this.state.won = true;
      this.state.score += 500; // Win bonus
    }
    return this.state.won;
  }

  /**
   * Tactical hint: find any available King or any pair summing to 13
   */
  getTacticalHint() {
    const exposedPyramid = [];
    for (let i = 0; i < this.state.pyramid.length; i++) {
      if (this.isExposed(i)) {
        exposedPyramid.push({
          zone: 'pyramid',
          index: i,
          card: this.state.pyramid[i].card,
          val: this.getPyramidValue(this.state.pyramid[i].card)
        });
      }
    }

    // 1. Open King in pyramid
    const kingPyramid = exposedPyramid.find(p => p.val === 13);
    if (kingPyramid) {
      return {
        action: 'REMOVE_KING',
        source: { zone: 'pyramid', index: kingPyramid.index },
        message: `Remove King (${kingPyramid.card.shortCode}) from the Pyramid!`,
        reason: `Remove King (${kingPyramid.card.shortCode}) from the Pyramid!`
      };
    }

    // 2. Open King in waste
    if (this.state.waste.length > 0) {
      const topWaste = this.state.waste[this.state.waste.length - 1];
      if (this.getPyramidValue(topWaste) === 13) {
        return {
          action: 'REMOVE_KING',
          source: { zone: 'waste', index: this.state.waste.length - 1 },
          message: `Remove King (${topWaste.shortCode}) from the Waste pile!`,
          reason: `Remove King (${topWaste.shortCode}) from the Waste pile!`
        };
      }
    }

    // 3. Pair between two exposed pyramid cards
    for (let i = 0; i < exposedPyramid.length; i++) {
      for (let j = i + 1; j < exposedPyramid.length; j++) {
        if (exposedPyramid[i].val + exposedPyramid[j].val === 13) {
          return {
            action: 'PAIR',
            source: { zone: 'pyramid', index: exposedPyramid[i].index },
            target: { zone: 'pyramid', index: exposedPyramid[j].index },
            message: `Pair ${exposedPyramid[i].card.shortCode} with ${exposedPyramid[j].card.shortCode} (Sum: 13)!`,
            reason: `Pair ${exposedPyramid[i].card.shortCode} with ${exposedPyramid[j].card.shortCode} (Sum: 13)!`
          };
        }
      }
    }

    // 4. Pair between an exposed pyramid card and top of waste
    if (this.state.waste.length > 0) {
      const topWaste = this.state.waste[this.state.waste.length - 1];
      const wasteVal = this.getPyramidValue(topWaste);

      for (const p of exposedPyramid) {
        if (p.val + wasteVal === 13) {
          return {
            action: 'PAIR',
            source: { zone: 'pyramid', index: p.index },
            target: { zone: 'waste', index: this.state.waste.length - 1 },
            message: `Pair Pyramid ${p.card.shortCode} with Waste ${topWaste.shortCode} (Sum: 13)!`,
            reason: `Pair Pyramid ${p.card.shortCode} with Waste ${topWaste.shortCode} (Sum: 13)!`
          };
        }
      }
    }


    // 5. Draw from stock
    if (this.state.stock.length > 0) {
      return {
        action: 'DRAW',
        source: { zone: 'stock', index: 0 },
        message: 'No open pairs on the board. Draw a new card from the Stock.'
      };
    } else if (this.state.recyclesRemaining > 0 && this.state.waste.length > 0) {
      return {
        action: 'RECYCLE',
        source: { zone: 'stock', index: 0 },
        message: `Click empty Stock to recycle Waste (${this.state.recyclesRemaining} recycles left).`
      };
    }

    return {
      message: 'No remaining moves or recycles available. Game Over.'
    };
  }
}
