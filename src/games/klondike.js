/**
 * Solitaire Sovereign - Klondike Rules Engine
 * 
 * Supports:
 * - Draw-1 and Draw-3 modes
 * - Vegas scoring or Standard scoring
 * - Solvable deal validation
 * - Auto-complete detection (when all hidden cards are exposed)
 * - Smart move suggestions
 */

import { Card } from '../core/card.js';
import { SplitMix64 } from '../core/prng.js';
import { CommandValidator } from '../core/validator.js';

export class KlondikeGame {
  /**
   * @param {Object} options
   * @param {number} options.drawCount 1 or 3
   * @param {string} options.scoring 'standard' | 'vegas'
   * @param {bigint|number|string} options.seed
   */
  constructor(options = {}) {
    this.drawCount = options.drawCount || 1;
    this.scoringMode = options.scoring || 'standard';
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.dealCode = SplitMix64.formatDealCode('KL', this.seed);

    this.state = this._createInitialState();
    this.undoStack = [];
    this.redoStack = [];
  }

  _createInitialState() {
    const prng = new SplitMix64(this.seed);
    const deck = Card.createStandardDeck(1);
    prng.shuffle(deck);

    const tableau = [[], [], [], [], [], [], []];
    let cardIdx = 0;

    // Deal 1 to 7 cards into tableau columns
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[cardIdx++];
        card.faceUp = (row === col); // Only top card face up
        tableau[col].push(card);
      }
    }

    // Remaining 24 cards go to stock (face down)
    const stock = deck.slice(cardIdx).map(c => {
      c.faceUp = false;
      return c;
    });

    return {
      gameType: 'klondike',
      drawCount: this.drawCount,
      scoringMode: this.scoringMode,
      seed: this.seed,
      dealCode: this.dealCode,
      stock,
      waste: [],
      foundations: [[], [], [], []],
      tableau,
      score: this.scoringMode === 'vegas' ? -52 : 0,
      moves: 0,
      timeSeconds: 0,
      won: false
    };
  }

  /**
   * Draw cards from stock to waste or recycle if empty
   */
  drawOrRecycle() {
    if (this.state.stock.length > 0) {
      const res = CommandValidator.apply(this.state, {
        type: 'DRAW',
        count: this.drawCount
      });
      if (res.ok) {
        this._recordMove(res);
        return true;
      }
    } else if (this.state.waste.length > 0) {
      const penalty = (this.scoringMode === 'standard') ? 15 : 0;
      const res = CommandValidator.apply(this.state, {
        type: 'RECYCLE',
        penalty
      });
      if (res.ok) {
        this._recordMove(res);
        return true;
      }
    }
    return false;
  }

  /**
   * Execute card movement
   */
  moveCards(source, target, count = 1) {
    const res = CommandValidator.apply(this.state, {
      type: 'MOVE',
      source,
      target,
      count
    });

    if (res.ok) {
      this._recordMove(res);
      this._checkWinCondition();
      return true;
    }
    return false;
  }

  _recordMove(result) {
    this.undoStack.push(result.reverseCommand);
    this.redoStack = []; // Clear redo on fresh move
    this.state = result.state;
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const revCmd = this.undoStack.pop();
    this.state = CommandValidator.applyReverse(this.state, revCmd);
    return true;
  }

  /**
   * Intelligently finds the best destination for a card on single-click
   * Priority: Foundation -> Tableau column (build on existing) -> Empty Tableau column
   */
  findSmartMove(source) {
    const pile = CommandValidator._getPile(this.state, source.zone, source.index);
    if (!pile || pile.length === 0) return null;

    const cardIndex = source.cardIndex !== undefined ? source.cardIndex : (pile.length - 1);
    const movingCard = pile[cardIndex];
    if (!movingCard || !movingCard.faceUp) return null;

    const count = pile.length - cardIndex;

    // 1. If single card, try foundations first
    if (count === 1) {
      for (let fIdx = 0; fIdx < 4; fIdx++) {
        const foundation = this.state.foundations[fIdx];
        const topF = foundation.length > 0 ? foundation[foundation.length - 1] : null;
        if (movingCard.canBuildOnFoundation(topF)) {
          return { target: { zone: 'foundation', index: fIdx }, count: 1 };
        }
      }
    }

    // 2. Try non-empty tableau columns (so we don't waste King space unnecessarily)
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      if (source.zone === 'tableau' && source.index === colIdx) continue;
      const col = this.state.tableau[colIdx];
      if (col.length > 0) {
        const topCard = col[col.length - 1];
        if (movingCard.canStackOnTableau(topCard)) {
          return { target: { zone: 'tableau', index: colIdx }, count };
        }
      }
    }

    // 3. Try empty tableau column (only if movingCard is a King and doesn't already sit at base)
    if (movingCard.rank === 12) {
      if (source.zone === 'tableau' && cardIndex === 0) {
        // Already at base of tableau, no benefit in moving to another empty column
        return null;
      }
      for (let colIdx = 0; colIdx < 7; colIdx++) {
        if (this.state.tableau[colIdx].length === 0) {
          return { target: { zone: 'tableau', index: colIdx }, count };
        }
      }
    }

    return null;
  }

  /**
   * Returns true if all hidden tableau cards are revealed and stock is empty.
   * At this point, the game is guaranteed winnable and can be safely auto-completed!
   */
  canAutoComplete() {
    if (this.state.won) return false;
    for (const col of this.state.tableau) {
      for (const card of col) {
        if (!card.faceUp) return false;
      }
    }
    if (this.state.stock.length > 0) return false;
    if (this.state.waste.length > 0) {
      return this.getNextAutoCompleteStep() !== null;
    }
    return true;
  }

  /**
   * Returns the next auto-complete move step if available (Microsoft Solitaire style).
   * Prioritizes lowest rank card that can legally build onto foundations.
   */
  getNextAutoCompleteStep() {
    if (this.state.won) return null;
    if (this.state.stock.length > 0) return null;
    for (const col of this.state.tableau) {
      for (const card of col) {
        if (!card.faceUp) return null;
      }
    }

    // Find lowest valid card in tableau to move to foundation
    let bestCandidate = null;
    let lowestRank = 99;

    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const col = this.state.tableau[colIdx];
      if (col.length === 0) continue;
      const card = col[col.length - 1];

      for (let fIdx = 0; fIdx < 4; fIdx++) {
        const foundation = this.state.foundations[fIdx];
        const topF = foundation.length > 0 ? foundation[foundation.length - 1] : null;
        if (card.canBuildOnFoundation(topF)) {
          if (card.rank < lowestRank) {
            lowestRank = card.rank;
            bestCandidate = {
              source: { zone: 'tableau', index: colIdx },
              target: { zone: 'foundation', index: fIdx },
              count: 1
            };
          }
        }
      }
    }

    // Check waste top card
    if (this.state.waste.length > 0) {
      const wasteCard = this.state.waste[this.state.waste.length - 1];
      for (let fIdx = 0; fIdx < 4; fIdx++) {
        const foundation = this.state.foundations[fIdx];
        const topF = foundation.length > 0 ? foundation[foundation.length - 1] : null;
        if (wasteCard.canBuildOnFoundation(topF)) {
          if (wasteCard.rank < lowestRank) {
            lowestRank = wasteCard.rank;
            bestCandidate = {
              source: { zone: 'waste', index: this.state.waste.length - 1 },
              target: { zone: 'foundation', index: fIdx },
              count: 1
            };
          }
        }
      }

      // If no foundation move found but waste has a card, check if it can stack onto a tableau column
      if (!bestCandidate) {
        for (let colIdx = 0; colIdx < 7; colIdx++) {
          const col = this.state.tableau[colIdx];
          const topCard = col.length > 0 ? col[col.length - 1] : null;
          if (wasteCard.canStackOnTableau(topCard)) {
            return {
              source: { zone: 'waste', index: this.state.waste.length - 1 },
              target: { zone: 'tableau', index: colIdx },
              count: 1
            };
          }
        }
      }
    }

    return bestCandidate;
  }

  /**
   * Evaluates all currently legal moves and returns a comprehensive tactical hint
   */
  getTacticalHint() {
    // 0. If all columns are completed, announce auto-completion
    if (this.canAutoComplete()) {
      return {
        autoComplete: true,
        message: 'All columns completed! Auto-solving to foundations...'
      };
    }

    // 1. Foundation moves from Tableau (prioritize Ace and Two, then safe builds)
    for (let col = 0; col < 7; col++) {
      const tableauCol = this.state.tableau[col];
      if (tableauCol.length > 0) {
        const card = tableauCol[tableauCol.length - 1];
        for (let f = 0; f < 4; f++) {
          const topF = this.state.foundations[f].length > 0 ? this.state.foundations[f][this.state.foundations[f].length - 1] : null;
          if (card.canBuildOnFoundation(topF)) {
            return {
              source: { zone: 'tableau', index: col, cardIndex: tableauCol.length - 1 },
              target: { zone: 'foundation', index: f },
              count: 1,
              message: `Move ${card.shortCode} from Column ${col + 1} to Foundation ${f + 1}.`
            };
          }
        }
      }
    }

    // 2. Foundation moves from Waste
    if (this.state.waste.length > 0) {
      const wasteCard = this.state.waste[this.state.waste.length - 1];
      for (let f = 0; f < 4; f++) {
        const topF = this.state.foundations[f].length > 0 ? this.state.foundations[f][this.state.foundations[f].length - 1] : null;
        if (wasteCard.canBuildOnFoundation(topF)) {
          return {
            source: { zone: 'waste', index: 0, cardIndex: this.state.waste.length - 1 },
            target: { zone: 'foundation', index: f },
            count: 1,
            message: `Play ${wasteCard.shortCode} from Waste to Foundation ${f + 1}.`
          };
        }
      }
    }

    // 3. Tableau moves that reveal a hidden face-down card
    for (let col = 0; col < 7; col++) {
      const tableauCol = this.state.tableau[col];
      for (let cIdx = 0; cIdx < tableauCol.length; cIdx++) {
        const card = tableauCol[cIdx];
        if (card.faceUp) {
          const willUncover = (cIdx > 0 && !tableauCol[cIdx - 1].faceUp);
          if (willUncover) {
            for (let targetCol = 0; targetCol < 7; targetCol++) {
              if (col === targetCol) continue;
              const targetColCards = this.state.tableau[targetCol];
              const targetTop = targetColCards.length > 0 ? targetColCards[targetColCards.length - 1] : null;

              if (card.canStackOnTableau(targetTop)) {
                return {
                  source: { zone: 'tableau', index: col, cardIndex: cIdx },
                  target: { zone: 'tableau', index: targetCol },
                  count: tableauCol.length - cIdx,
                  message: `Move ${card.shortCode} stack to Column ${targetCol + 1} to reveal a hidden card!`
                };
              }
            }
          }
        }
      }
    }

    // 4. Waste card to Tableau column
    if (this.state.waste.length > 0) {
      const wasteCard = this.state.waste[this.state.waste.length - 1];
      for (let col = 0; col < 7; col++) {
        const targetCol = this.state.tableau[col];
        const topCard = targetCol.length > 0 ? targetCol[targetCol.length - 1] : null;
        if (wasteCard.canStackOnTableau(topCard)) {
          return {
            source: { zone: 'waste', index: 0, cardIndex: this.state.waste.length - 1 },
            target: { zone: 'tableau', index: col },
            count: 1,
            message: `Move ${wasteCard.shortCode} from Waste onto Column ${col + 1}.`
          };
        }
      }
    }

    // 5. Tableau-to-Tableau moves that provide genuine strategic advantage:
    // Rule: Never suggest moving a partial sequence between columns when the card beneath is
    // already face-up unless that card beneath can immediately be banked to a foundation!
    // (Moving partial sequences without uncovering cards yields no strategic gain other than suit swap).
    for (let col = 0; col < 7; col++) {
      const tableauCol = this.state.tableau[col];
      if (tableauCol.length === 0) continue;

      for (let cIdx = 0; cIdx < tableauCol.length; cIdx++) {
        const card = tableauCol[cIdx];
        if (!card.faceUp) continue;

        // Don't move a King if it's already sitting on an empty spot (cIdx === 0)
        if (card.rank === 12 && cIdx === 0) continue;

        // Check if this move is a partial sequence move (card beneath is already face-up)
        if (cIdx > 0 && tableauCol[cIdx - 1].faceUp) {
          const cardBeneath = tableauCol[cIdx - 1];
          let canBankBeneath = false;
          for (let f = 0; f < 4; f++) {
            const topF = this.state.foundations[f].length > 0 ? this.state.foundations[f][this.state.foundations[f].length - 1] : null;
            if (cardBeneath.canBuildOnFoundation(topF)) {
              canBankBeneath = true;
              break;
            }
          }
          // If the card beneath cannot be banked, moving this partial sequence provides
          // ZERO advantage (only changes which suit is exposed). Strictly skip!
          if (!canBankBeneath) continue;
        }

        for (let targetCol = 0; targetCol < 7; targetCol++) {
          if (col === targetCol) continue;
          const targetColCards = this.state.tableau[targetCol];
          const targetTop = targetColCards.length > 0 ? targetColCards[targetColCards.length - 1] : null;

          if (card.canStackOnTableau(targetTop)) {
            // Avoid ping-ponging: don't move a stack if destination is empty and source is also at base
            if (!targetTop && cIdx === 0) continue;

            const isFreeingFoundation = (cIdx > 0 && tableauCol[cIdx - 1].faceUp);
            const msg = isFreeingFoundation
              ? `Move ${card.shortCode} to Column ${targetCol + 1} to unblock ${tableauCol[cIdx - 1].shortCode} for Foundation!`
              : `Move ${card.shortCode} stack to Column ${targetCol + 1} to free up an empty Column for a King.`;

            return {
              source: { zone: 'tableau', index: col, cardIndex: cIdx },
              target: { zone: 'tableau', index: targetCol },
              count: tableauCol.length - cIdx,
              message: msg
            };
          }
        }
      }
    }

    // 6. Draw from Stock or Recycle Waste
    if (this.state.stock.length > 0) {
      return {
        action: 'DRAW',
        source: { zone: 'stock', index: 0 },
        message: 'Draw new card(s) from the Stock pile.'
      };
    } else if (this.state.waste.length > 0) {
      return {
        action: 'RECYCLE',
        source: { zone: 'stock', index: 0 },
        message: 'Click the empty Stock pile to recycle the Waste pile.'
      };
    }

    return null;
  }

  _checkWinCondition() {
    let totalFoundationCards = 0;
    for (const f of this.state.foundations) {
      totalFoundationCards += f.length;
    }
    if (totalFoundationCards === 52) {
      this.state.won = true;
    }
    return this.state.won;
  }
}
