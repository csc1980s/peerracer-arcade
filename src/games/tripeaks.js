/**
 * Solitaire Sovereign - Clean-Room TriPeaks Solitaire Engine
 * 
 * Rules:
 * - 28 cards dealt into 3 overlapping peaks (4 rows: 3, 6, 9, 10 cards).
 * - Row 3 (bottom 10 cards) dealt face up; Rows 0, 1, 2 dealt face down.
 * - When all covering children of a card are removed, the card turns face up and becomes playable.
 * - Playable cards whose rank is +/- 1 from the top of the Waste pile (with King-Ace wrap) can be played.
 * - Consecutive cards played without drawing from Stock build a streak multiplier.
 * - Clearing each peak awards a massive peak-clear bonus!
 * - Stock: 23 cards face down, 1 card dealt initially to Waste.
 */

import { Card } from '../core/card.js';
import { PRNG } from '../core/prng.js';

export class TriPeaksGame {
  // Static child-coverage graph for the 28 tableau cards
  static CHILDREN_MAP = {
    0: [3, 4],
    1: [5, 6],
    2: [7, 8],
    3: [9, 10],
    4: [10, 11],
    5: [12, 13],
    6: [13, 14],
    7: [15, 16],
    8: [16, 17],
    9: [18, 19],
    10: [19, 20],
    11: [20, 21],
    12: [21, 22],
    13: [22, 23],
    14: [23, 24],
    15: [24, 25],
    16: [25, 26],
    17: [26, 27]
  };

  constructor(options = {}) {
    this.seed = options.seed || Date.now();
    this.prng = new PRNG(this.seed);
    this.dealCode = `TP-${this.seed.toString(36).toUpperCase()}`;

    this.state = {
      // 28 tableau nodes: { index, row, col, peak, card, removed, faceUp }
      tableau: [],
      stock: [],
      waste: [],
      streak: 0,
      peaksCleared: [false, false, false],
      score: 0,
      moves: 0,
      won: false
    };

    this.undoStack = [];
    this._deal();
  }

  _deal() {
    const deck = Card.createStandardDeck(1);
    this.prng.shuffle(deck);

    let cardIdx = 0;
    this.state.tableau = [];

    // Row 0: 3 peak summits (indices 0, 1, 2)
    for (let i = 0; i < 3; i++) {
      const card = deck[cardIdx++];
      card.faceUp = false;
      this.state.tableau.push({
        index: i,
        row: 0,
        col: i * 3,
        peak: i,
        card,
        removed: false,
        faceUp: false
      });
    }

    // Row 1: 6 cards (indices 3..8)
    for (let p = 0; p < 3; p++) {
      for (let c = 0; c < 2; c++) {
        const idx = this.state.tableau.length;
        const card = deck[cardIdx++];
        card.faceUp = false;
        this.state.tableau.push({
          index: idx,
          row: 1,
          col: p * 3 + c,
          peak: p,
          card,
          removed: false,
          faceUp: false
        });
      }
    }

    // Row 2: 9 cards (indices 9..17)
    for (let p = 0; p < 3; p++) {
      for (let c = 0; c < 3; c++) {
        const idx = this.state.tableau.length;
        const card = deck[cardIdx++];
        card.faceUp = false;
        this.state.tableau.push({
          index: idx,
          row: 2,
          col: p * 3 + c,
          peak: p,
          card,
          removed: false,
          faceUp: false
        });
      }
    }

    // Row 3: 10 base cards (indices 18..27) - all start FACE UP!
    for (let c = 0; c < 10; c++) {
      const idx = this.state.tableau.length;
      const card = deck[cardIdx++];
      card.faceUp = true;
      this.state.tableau.push({
        index: idx,
        row: 3,
        col: c,
        peak: Math.min(2, Math.floor(c / 3)),
        card,
        removed: false,
        faceUp: true
      });
    }

    // Waste gets 1 card face up
    const firstWaste = deck[cardIdx++];
    firstWaste.faceUp = true;
    this.state.waste = [firstWaste];

    // Stock gets remaining 23 cards face down
    this.state.stock = deck.slice(cardIdx);
    this.state.stock.forEach(c => c.faceUp = false);

    this.state.streak = 0;
    this.state.peaksCleared = [false, false, false];
    this.state.score = 0;
    this.state.moves = 0;
    this.state.won = false;
  }

  isCardBlocked(index) {
    const node = this.state.tableau[index];
    if (!node || node.removed) return false;

    const children = TriPeaksGame.CHILDREN_MAP[index];
    if (!children) return false; // Row 3 cards have no children

    // If any covering child is NOT removed, this card is blocked
    for (const childIdx of children) {
      if (!this.state.tableau[childIdx].removed) {
        return true;
      }
    }
    return false;
  }

  getTopWaste() {
    return this.state.waste.length > 0 ? this.state.waste[this.state.waste.length - 1] : null;
  }

  canPlayOnWaste(card) {
    const topWaste = this.getTopWaste();
    if (!topWaste) return true; // If waste is empty, any card can play

    const r1 = card.rank;
    const r2 = topWaste.rank;

    // Check rank +/- 1 with Ace (0) and King (12) wrap-around
    const diff = Math.abs(r1 - r2);
    return diff === 1 || diff === 12;
  }

  playTableauCard(index) {
    if (this.state.won) return false;
    const node = this.state.tableau[index];
    if (!node || node.removed || !node.faceUp || this.isCardBlocked(index)) {
      return false;
    }

    if (!this.canPlayOnWaste(node.card)) {
      return false;
    }

    // Record undo state
    this._saveUndo();

    // Remove node
    node.removed = true;
    const playedCard = node.card;
    playedCard.faceUp = true;
    this.state.waste.push(playedCard);

    // Update streak and score
    this.state.streak++;
    const streakPoints = this.state.streak * 10;
    let bonusPoints = 0;

    // Check if a peak summit was cleared (index 0, 1, or 2)
    if (index === 0 && !this.state.peaksCleared[0]) {
      this.state.peaksCleared[0] = true;
      bonusPoints += 150;
    } else if (index === 1 && !this.state.peaksCleared[1]) {
      this.state.peaksCleared[1] = true;
      bonusPoints += 250;
    } else if (index === 2 && !this.state.peaksCleared[2]) {
      this.state.peaksCleared[2] = true;
      bonusPoints += 500;
    }

    this.state.score += streakPoints + bonusPoints;
    this.state.moves++;

    // Turn newly unblocked parent cards face up
    this._updateExposedCards();

    // Check win condition
    const allCleared = this.state.tableau.every(n => n.removed);
    if (allCleared) {
      this.state.won = true;
      // Bonus: 50 pts per unused stock card
      const stockBonus = this.state.stock.length * 50;
      this.state.score += 1000 + stockBonus;
    }

    return {
      success: true,
      card: playedCard,
      streak: this.state.streak,
      pointsAdded: streakPoints + bonusPoints,
      won: this.state.won
    };
  }

  drawFromStock() {
    if (this.state.stock.length === 0 || this.state.won) return false;

    this._saveUndo();

    const drawnCard = this.state.stock.pop();
    drawnCard.faceUp = true;
    this.state.waste.push(drawnCard);

    // Drawing resets streak
    this.state.streak = 0;
    this.state.moves++;
    if (this.state.score >= 5) {
      this.state.score -= 5;
    }

    return {
      success: true,
      card: drawnCard
    };
  }

  _updateExposedCards() {
    const revealed = [];
    for (const node of this.state.tableau) {
      if (!node.removed && !node.faceUp && !this.isCardBlocked(node.index)) {
        node.faceUp = true;
        node.card.faceUp = true;
        revealed.push(node);
      }
    }
    return revealed;
  }

  _saveUndo() {
    this.undoStack.push({
      tableau: this.state.tableau.map(n => ({
        index: n.index,
        removed: n.removed,
        faceUp: n.faceUp,
        cardFaceUp: n.card.faceUp
      })),
      stockLength: this.state.stock.length,
      stockCards: [...this.state.stock],
      wasteCards: [...this.state.waste],
      streak: this.state.streak,
      peaksCleared: [...this.state.peaksCleared],
      score: this.state.score,
      moves: this.state.moves,
      won: this.state.won
    });

    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const snap = this.undoStack.pop();

    for (const savedNode of snap.tableau) {
      const node = this.state.tableau[savedNode.index];
      node.removed = savedNode.removed;
      node.faceUp = savedNode.faceUp;
      node.card.faceUp = savedNode.cardFaceUp;
    }

    this.state.stock = snap.stockCards;
    this.state.waste = snap.wasteCards;
    this.state.streak = snap.streak;
    this.state.peaksCleared = snap.peaksCleared;
    this.state.score = snap.score;
    this.state.moves = snap.moves;
    this.state.won = snap.won;

    return true;
  }

  getTacticalHint() {
    if (this.state.won) return null;

    const topWaste = this.getTopWaste();
    if (!topWaste) return null;

    // Look ahead: for each playable card, count how many cards the best chain
    // of plays (no drawing) clears afterwards. Longer chains win; ties go to the
    // card that sits higher in a peak, since freeing parents opens more options.
    const nodes = this.state.tableau;
    const removed = new Set();
    for (const n of nodes) if (n.removed) removed.add(n.index);
    const adjacent = (a, b) => { const d = Math.abs(a - b); return d === 1 || d === 12; };
    const blocked = (i, gone) => {
      const kids = TriPeaksGame.CHILDREN_MAP[i];
      return !!kids && kids.some(k => !gone.has(k));
    };
    const memo = new Map();
    const chain = (gone, rank, depth) => {
      if (depth === 0) return 0;
      const key = [...gone].sort((x, y) => x - y).join(',') + '|' + rank;
      if (memo.has(key)) return memo.get(key);
      let best = 0;
      for (const n of nodes) {
        if (gone.has(n.index) || blocked(n.index, gone) || !adjacent(n.card.rank, rank)) continue;
        gone.add(n.index);
        best = Math.max(best, 1 + chain(gone, n.card.rank, depth - 1));
        gone.delete(n.index);
      }
      memo.set(key, best);
      return best;
    };

    const playable = [];
    for (const node of nodes) {
      if (!node.removed && node.faceUp && !this.isCardBlocked(node.index) && this.canPlayOnWaste(node.card)) {
        removed.add(node.index);
        const run = 1 + chain(removed, node.card.rank, 13);
        removed.delete(node.index);
        const weight = run * 1000 + (node.row === 0 ? 100 : node.row === 1 ? 30 : node.row === 2 ? 15 : 0);
        playable.push({ node, weight, run });
      }
    }

    if (playable.length > 0) {
      playable.sort((a, b) => b.weight - a.weight);
      const best = playable[0].node;
      const run = playable[0].run;
      return {
        action: 'PLAY_TABLEAU',
        index: best.index,
        card: best.card,
        reason: `Play ${best.card.fullName} (${best.card.shortCode}) onto Waste` +
          (run > 1 ? ` — it starts a run of ${run} cards.` : '.')
      };
    }

    if (this.state.stock.length > 0) {
      return {
        action: 'DRAW_STOCK',
        reason: `No playable peak cards match ${topWaste.shortCode}. Draw from Stock.`
      };
    }

    return {
      action: 'NO_MOVES',
      reason: 'No remaining moves or stock cards. Deal is blocked.'
    };
  }

  getRemainingCardsCount() {
    return this.state.tableau.filter(n => !n.removed).length;
  }
}
