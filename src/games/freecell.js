/**
 * Solitaire Sovereign - FreeCell Rules Engine & Supermove Architecture
 * 
 * Rules Architecture:
 * - 8 Cascades dealt fully face up (columns 0..3: 7 cards, columns 4..7: 6 cards).
 * - 4 Open FreeCells (temporary storage).
 * - 4 Foundations (Ace through King by suit).
 * - Mathematical Supermove Algorithm:
 *   Max sequence movable = (1 + N_freecells) * 2^(N_empty_cascades)
 *   When moving onto an empty cascade, the target cascade is subtracted from the multiplier.
 */

import { Card } from '../core/card.js';
import { SplitMix64 } from '../core/prng.js';
import { CommandValidator } from '../core/validator.js';

export class FreeCellGame {
  constructor(options = {}) {
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.dealCode = SplitMix64.formatDealCode('FC', this.seed);
    this.state = this._createInitialState();
    this.undoStack = [];
    this.redoStack = [];
  }

  _createInitialState() {
    const prng = new SplitMix64(this.seed);
    const deck = Card.createStandardDeck(1);
    prng.shuffle(deck);

    // All FreeCell cards are face up
    deck.forEach(c => c.faceUp = true);

    const tableau = [[], [], [], [], [], [], [], []];
    for (let i = 0; i < 52; i++) {
      tableau[i % 8].push(deck[i]);
    }

    return {
      gameType: 'freecell',
      seed: this.seed,
      dealCode: this.dealCode,
      freecells: [null, null, null, null],
      foundations: [[], [], [], []],
      tableau,
      score: 0,
      moves: 0,
      timeSeconds: 0,
      won: false
    };
  }

  getEmptyFreecellCount() {
    return this.state.freecells.filter(c => c === null).length;
  }

  getEmptyCascadeCount(excludeColumn = -1) {
    let count = 0;
    for (let i = 0; i < 8; i++) {
      if (i === excludeColumn) continue;
      if (this.state.tableau[i].length === 0) count++;
    }
    return count;
  }

  /**
   * Calculates maximum number of cards that can be moved as a packed cascade
   * @param {boolean} isTargetEmpty 
   * @returns {number}
   */
  getMaxSupermoveCards(isTargetEmpty = false) {
    const freeCells = this.getEmptyFreecellCount();
    const emptyCascades = this.getEmptyCascadeCount() - (isTargetEmpty ? 1 : 0);
    const effectiveCascades = Math.max(0, emptyCascades);
    return (1 + freeCells) * Math.pow(2, effectiveCascades);
  }

  /**
   * Verify if a sub-sequence in a cascade is valid alternating-color descending order
   */
  isValidSequence(cards) {
    for (let i = 0; i < cards.length - 1; i++) {
      const parent = cards[i];
      const child = cards[i + 1];
      if (child.isRed === parent.isRed || child.rank !== parent.rank - 1) {
        return false;
      }
    }
    return true;
  }

  moveCards(source, target, count = 1) {
    // FreeCell supermove check for tableau-to-tableau multi-card moves
    if (source.zone === 'tableau' && target.zone === 'tableau' && count > 1) {
      const srcCol = this.state.tableau[source.index];
      const movingCards = srcCol.slice(srcCol.length - count);
      if (!this.isValidSequence(movingCards)) return false;

      const isTargetEmpty = this.state.tableau[target.index].length === 0;
      const maxAllowed = this.getMaxSupermoveCards(isTargetEmpty);
      if (count > maxAllowed) {
        return false;
      }
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
      this._checkWinCondition();
      return true;
    }
    return false;
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const rev = this.undoStack.pop();
    this.state = CommandValidator.applyReverse(this.state, rev);
    return true;
  }

  findSmartMove(source) {
    let movingCard = null;
    let count = 1;

    if (source.zone === 'freecell') {
      movingCard = this.state.freecells[source.index];
      if (!movingCard) return null;
      count = 1;
    } else if (source.zone === 'tableau') {
      const col = this.state.tableau[source.index];
      if (col.length === 0) return null;
      const cIdx = source.cardIndex !== undefined ? source.cardIndex : col.length - 1;
      movingCard = col[cIdx];
      count = col.length - cIdx;

      // Check if sequence is valid
      const movingSeq = col.slice(cIdx);
      if (!this.isValidSequence(movingSeq)) return null;
    }

    if (!movingCard) return null;

    // 1. Foundation if single card
    if (count === 1) {
      for (let f = 0; f < 4; f++) {
        const topF = this.state.foundations[f].length > 0 ? this.state.foundations[f][this.state.foundations[f].length - 1] : null;
        if (movingCard.canBuildOnFoundation(topF)) {
          return { target: { zone: 'foundation', index: f }, count: 1 };
        }
      }
    }

    // 2. Tableau columns (non-empty)
    for (let colIdx = 0; colIdx < 8; colIdx++) {
      if (source.zone === 'tableau' && source.index === colIdx) continue;
      const col = this.state.tableau[colIdx];
      if (col.length > 0) {
        const topCard = col[col.length - 1];
        if (movingCard.canStackOnTableau(topCard)) {
          if (count <= this.getMaxSupermoveCards(false)) {
            return { target: { zone: 'tableau', index: colIdx }, count };
          }
        }
      }
    }

    // 3. Move single card to open FreeCell (if from tableau)
    if (source.zone === 'tableau' && count === 1) {
      for (let fc = 0; fc < 4; fc++) {
        if (this.state.freecells[fc] === null) {
          return { target: { zone: 'freecell', index: fc }, count: 1 };
        }
      }
    }

    // 4. Move to empty cascade if available
    for (let colIdx = 0; colIdx < 8; colIdx++) {
      if (source.zone === 'tableau' && source.index === colIdx) continue;
      if (this.state.tableau[colIdx].length === 0) {
        if (count <= this.getMaxSupermoveCards(true)) {
          return { target: { zone: 'tableau', index: colIdx }, count };
        }
      }
    }

    return null;
  }

  /**
   * Evaluates all currently legal moves in FreeCell and returns a tactical hint
   */
  getTacticalHint() {
    // 1. Move to Foundation from Cascades
    for (let c = 0; c < 8; c++) {
      const col = this.state.tableau[c];
      if (col.length === 0) continue;
      const card = col[col.length - 1];

      for (let f = 0; f < 4; f++) {
        const topF = this.state.foundations[f].length > 0 ? this.state.foundations[f][this.state.foundations[f].length - 1] : null;
        if (card.canBuildOnFoundation(topF)) {
          return {
            source: { zone: 'tableau', index: c, cardIndex: col.length - 1 },
            target: { zone: 'foundation', index: f },
            count: 1,
            message: `Play ${card.shortCode} from Cascade ${c + 1} to Foundation ${f + 1}.`
          };
        }
      }
    }

    // 2. Move to Foundation from FreeCells
    for (let fc = 0; fc < 4; fc++) {
      const card = this.state.freecells[fc];
      if (!card) continue;

      for (let f = 0; f < 4; f++) {
        const topF = this.state.foundations[f].length > 0 ? this.state.foundations[f][this.state.foundations[f].length - 1] : null;
        if (card.canBuildOnFoundation(topF)) {
          return {
            source: { zone: 'freecell', index: fc },
            target: { zone: 'foundation', index: f },
            count: 1,
            message: `Play ${card.shortCode} from FreeCell ${fc + 1} to Foundation ${f + 1}.`
          };
        }
      }
    }

    // 3. Move from FreeCell to Cascade
    for (let fc = 0; fc < 4; fc++) {
      const card = this.state.freecells[fc];
      if (!card) continue;

      for (let c = 0; c < 8; c++) {
        const col = this.state.tableau[c];
        if (col.length === 0) continue;
        const topCard = col[col.length - 1];

        if (card.canStackOnTableau(topCard)) {
          return {
            source: { zone: 'freecell', index: fc },
            target: { zone: 'tableau', index: c },
            count: 1,
            message: `Move ${card.shortCode} from FreeCell onto ${topCard.shortCode} in Cascade ${c + 1}.`
          };
        }
      }
    }

    // 4. Cascade to Cascade moves. Only suggest a move that achieves something:
    //    it must start at the top of a whole run (never split a run that is already
    //    built), and it must either empty the column or uncover a card that can go
    //    to a foundation or onto another cascade. This also stops the hint from
    //    shuffling a run back and forth between two equal targets.
    const canGoUp = (card) => this.state.foundations.some(
      f => card.canBuildOnFoundation(f.length > 0 ? f[f.length - 1] : null));
    for (let srcC = 0; srcC < 8; srcC++) {
      const srcCol = this.state.tableau[srcC];
      if (srcCol.length === 0) continue;

      for (let cIdx = 0; cIdx < srcCol.length; cIdx++) {
        const movingSeq = srcCol.slice(cIdx);
        if (!this.isValidSequence(movingSeq)) continue;
        const card = movingSeq[0];
        const beneath = cIdx > 0 ? srcCol[cIdx - 1] : null;
        // Already part of a built run: moving it only splits the run.
        if (beneath && card.canStackOnTableau(beneath)) continue;

        const count = movingSeq.length;
        for (let tgtC = 0; tgtC < 8; tgtC++) {
          if (srcC === tgtC) continue;
          const tgtCol = this.state.tableau[tgtC];
          const topTgt = tgtCol.length > 0 ? tgtCol[tgtCol.length - 1] : null;
          if (!topTgt || !card.canStackOnTableau(topTgt)) continue;
          if (count > this.getMaxSupermoveCards(false)) continue;

          let useful = !beneath; // empties the column
          if (beneath) {
            if (canGoUp(beneath)) useful = true;
            else {
              for (let o = 0; o < 8 && !useful; o++) {
                if (o === srcC) continue;
                const oc = this.state.tableau[o];
                // The moved run lands on tgtC, so tgtC's top is no longer open.
                const oTop = o === tgtC ? card : (oc.length ? oc[oc.length - 1] : null);
                if (oTop && beneath.canStackOnTableau(oTop)) useful = true;
              }
            }
          }
          if (!useful) continue;
          return {
            source: { zone: 'tableau', index: srcC, cardIndex: cIdx },
            target: { zone: 'tableau', index: tgtC },
            count,
            message: `Move ${card.shortCode} sequence to ${topTgt.shortCode} in Cascade ${tgtC + 1}` +
              (beneath ? ` to uncover ${beneath.shortCode}.` : ' to empty the column.')
          };
        }
      }
    }

    // 5. Move single card to empty FreeCell if it opens up a move beneath it
    const emptyFc = this.state.freecells.findIndex(c => c === null);
    if (emptyFc !== -1) {
      for (let c = 0; c < 8; c++) {
        const col = this.state.tableau[c];
        if (col.length <= 1) continue; // Don't empty a 1-card column into a freecell unnecessarily
        const card = col[col.length - 1];
        const cardBeneath = col[col.length - 2];

        // If cardBeneath can go to foundation
        for (let f = 0; f < 4; f++) {
          const topF = this.state.foundations[f].length > 0 ? this.state.foundations[f][this.state.foundations[f].length - 1] : null;
          if (cardBeneath.canBuildOnFoundation(topF)) {
            return {
              source: { zone: 'tableau', index: c, cardIndex: col.length - 1 },
              target: { zone: 'freecell', index: emptyFc },
              count: 1,
              message: `Move ${card.shortCode} to FreeCell to unblock ${cardBeneath.shortCode} for Foundation!`
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Returns true if all cascades in FreeCell are clean descending runs and can auto-complete
   */
  canAutoComplete() {
    if (this.state.won) return false;
    let allCascadesOrdered = true;
    for (const col of this.state.tableau) {
      for (let i = 0; i < col.length - 1; i++) {
        const curr = col[i];
        const next = col[i + 1];
        if (!next.canStackOnTableau(curr)) {
          allCascadesOrdered = false;
          break;
        }
      }
      if (!allCascadesOrdered) break;
    }
    if (allCascadesOrdered) {
      return this.getNextAutoCompleteStep() !== null;
    }
    return false;
  }

  /**
   * Returns the next auto-complete step for FreeCell to solve to foundations
   */
  getNextAutoCompleteStep() {
    if (this.state.won) return null;
    let bestCandidate = null;
    let lowestRank = 99;

    // 1. Check freecells
    for (let fcIdx = 0; fcIdx < 4; fcIdx++) {
      const card = this.state.freecells[fcIdx];
      if (!card) continue;
      for (let fIdx = 0; fIdx < 4; fIdx++) {
        const foundation = this.state.foundations[fIdx];
        const topF = foundation.length > 0 ? foundation[foundation.length - 1] : null;
        if (card.canBuildOnFoundation(topF)) {
          if (card.rank < lowestRank) {
            lowestRank = card.rank;
            bestCandidate = {
              source: { zone: 'freecell', index: fcIdx },
              target: { zone: 'foundation', index: fIdx },
              count: 1
            };
          }
        }
      }
    }

    // 2. Check tableau cascades
    for (let colIdx = 0; colIdx < 8; colIdx++) {
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

    return bestCandidate;
  }

  _checkWinCondition() {
    let totalInFoundations = 0;
    for (const f of this.state.foundations) {
      totalInFoundations += f.length;
    }
    if (totalInFoundations === 52) {
      this.state.won = true;
    }
    return this.state.won;
  }
}
