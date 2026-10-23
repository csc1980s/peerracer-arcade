/**
 * Solitaire Sovereign - Clean-Room Video Poker Engine
 * 
 * Variations Supported:
 * 1. 'jacks_or_better' (Standard 52-card, 9/6 full-pay table, min win: Pair of Jacks)
 * 2. 'deuces_wild'     (Standard 52-card, all 2s wild, min win: Three of a Kind)
 * 3. 'joker_poker'     (53-card deck with 1 Wild Joker, min win: Pair of Kings)
 * 
 * Features:
 * - 5-card draw with Hold toggles
 * - Realistic Vegas casino paytables (1 to 5 coin betting, 4000 Royal Flush on max bet)
 * - Wild card resolution algorithm (supports Deuces Wild & Joker Wild)
 * - Optimal Strategy Advisor (Auto-Hold tactical hint)
 * - Continuous play: One-click "Deal / Draw / Rebet" flow
 */

import { Card, SUITS, RANK_FULL_NAMES, RANK_PLURAL_NAMES } from '../core/card.js';
import { PRNG } from '../core/prng.js';

export const POKER_VARIATIONS = {
  JACKS_OR_BETTER: 'jacks_or_better',
  DEUCES_WILD: 'deuces_wild',
  JOKER_POKER: 'joker_poker'
};

export const PAYTABLES = {
  jacks_or_better: [
    { rank: 'ROYAL_FLUSH', name: 'Royal Flush', base: 250, maxBetBonus: 4000 },
    { rank: 'STRAIGHT_FLUSH', name: 'Straight Flush', base: 50 },
    { rank: 'FOUR_OF_A_KIND', name: 'Four of a Kind', base: 25 },
    { rank: 'FULL_HOUSE', name: 'Full House', base: 9 },
    { rank: 'FLUSH', name: 'Flush', base: 6 },
    { rank: 'STRAIGHT', name: 'Straight', base: 4 },
    { rank: 'THREE_OF_A_KIND', name: 'Three of a Kind', base: 3 },
    { rank: 'TWO_PAIR', name: 'Two Pair', base: 2 },
    { rank: 'JACKS_OR_BETTER', name: 'Jacks or Better', base: 1 }
  ],
  deuces_wild: [
    { rank: 'NATURAL_ROYAL', name: 'Natural Royal Flush', base: 250, maxBetBonus: 4000 },
    { rank: 'FOUR_DEUCES', name: 'Four Deuces', base: 200 },
    { rank: 'WILD_ROYAL', name: 'Wild Royal Flush', base: 25 },
    { rank: 'FIVE_OF_A_KIND', name: 'Five of a Kind', base: 15 },
    { rank: 'STRAIGHT_FLUSH', name: 'Straight Flush', base: 9 },
    { rank: 'FOUR_OF_A_KIND', name: 'Four of a Kind', base: 5 },
    { rank: 'FULL_HOUSE', name: 'Full House', base: 3 },
    { rank: 'FLUSH', name: 'Flush', base: 2 },
    { rank: 'STRAIGHT', name: 'Straight', base: 2 },
    { rank: 'THREE_OF_A_KIND', name: 'Three of a Kind', base: 1 }
  ],
  joker_poker: [
    { rank: 'NATURAL_ROYAL', name: 'Natural Royal Flush', base: 250, maxBetBonus: 4000 },
    { rank: 'FIVE_OF_A_KIND', name: 'Five of a Kind', base: 200 },
    { rank: 'JOKER_ROYAL', name: 'Wild Royal Flush', base: 100 },
    { rank: 'STRAIGHT_FLUSH', name: 'Straight Flush', base: 50 },
    { rank: 'FOUR_OF_A_KIND', name: 'Four of a Kind', base: 20 },
    { rank: 'FULL_HOUSE', name: 'Full House', base: 7 },
    { rank: 'FLUSH', name: 'Flush', base: 5 },
    { rank: 'STRAIGHT', name: 'Straight', base: 3 },
    { rank: 'THREE_OF_A_KIND', name: 'Three of a Kind', base: 2 },
    { rank: 'TWO_PAIR', name: 'Two Pair', base: 1 },
    { rank: 'KINGS_OR_BETTER', name: 'Kings or Better', base: 1 }
  ]
};

export class PokerGame {
  constructor(options = {}) {
    this.variation = options.variation || POKER_VARIATIONS.JACKS_OR_BETTER;
    this.seed = options.seed || Date.now();
    this.prng = new PRNG(this.seed);
    this.dealCode = `PK-${this.seed.toString(36).toUpperCase()}`;
    this.coinValue = options.coinValue || 25; // 25 credits per coin
    this.betCoins = Math.min(5, Math.max(1, options.betCoins || 5));
    this.credits = options.credits !== undefined ? options.credits : 1000;

    this.state = {
      phase: 'BETTING', // 'BETTING', 'HOLDING', 'EVALUATED'
      hand: [],         // 5 Card objects
      held: [false, false, false, false, false],
      deck: [],
      lastWin: null,    // { rank, name, payout, multiplier }
      lastPayout: 0,
      totalHands: 0,
      totalWonCredits: 0
    };
  }

  getPaytable() {
    return PAYTABLES[this.variation] || PAYTABLES.jacks_or_better;
  }

  createDeck() {
    const deck = Card.createStandardDeck(1);
    if (this.variation === POKER_VARIATIONS.JOKER_POKER) {
      // Add Joker (id 52)
      const joker = new Card(52, true);
      joker.isJoker = true;
      joker.rank = 99; // Wild marker
      joker.suit = 99;
      deck.push(joker);
    }
    return deck;
  }

  setBet(coins) {
    if (this.state.phase !== 'BETTING' && this.state.phase !== 'EVALUATED') return false;
    this.betCoins = Math.min(5, Math.max(1, coins));
    return true;
  }

  toggleHold(index) {
    if (this.state.phase !== 'HOLDING') return false;
    if (index < 0 || index >= 5) return false;
    this.state.held[index] = !this.state.held[index];
    return this.state.held[index];
  }

  deal() {
    // If evaluated, dealing starts a brand new hand with current bet
    const wager = this.betCoins * this.coinValue;
    if (this.credits < wager) {
      // Rebuy if bankrupt
      this.credits += 500;
    }

    this.credits -= wager;
    this.state.lastPayout = 0;
    this.state.lastWin = null;
    this.state.held = [false, false, false, false, false];

    // Shuffle fresh deck
    const deck = this.createDeck();
    this.prng.shuffle(deck);

    // Deal 5 cards
    this.state.hand = deck.slice(0, 5);
    this.state.hand.forEach(c => c.faceUp = true);
    this.state.deck = deck.slice(5);

    this.state.phase = 'HOLDING';
    this.state.totalHands++;

    return {
      hand: this.state.hand,
      held: this.state.held,
      credits: this.credits
    };
  }

  draw() {
    if (this.state.phase !== 'HOLDING') return false;

    // Replace unheld cards
    for (let i = 0; i < 5; i++) {
      if (!this.state.held[i]) {
        const replacement = this.state.deck.pop();
        replacement.faceUp = true;
        this.state.hand[i] = replacement;
      }
    }

    // Evaluate final 5-card hand
    const evaluation = this.evaluateHand(this.state.hand, this.variation);
    let payout = 0;

    if (evaluation) {
      const paytable = this.getPaytable();
      const row = paytable.find(p => p.rank === evaluation.rank);
      if (row) {
        if (this.betCoins === 5 && row.maxBetBonus) {
          payout = row.maxBetBonus * (this.coinValue / 25);
        } else {
          payout = row.base * this.betCoins * this.coinValue;
        }
      }
    }

    this.credits += payout;
    this.state.lastPayout = payout;
    this.state.lastWin = evaluation ? {
      ...evaluation,
      payout
    } : null;

    if (payout > 0) {
      this.state.totalWonCredits += payout;
    }

    this.state.phase = 'EVALUATED';

    return {
      hand: this.state.hand,
      evaluation: this.state.lastWin,
      payout,
      credits: this.credits
    };
  }

  evaluateHand(cards, variation = this.variation) {
    if (!cards || cards.length !== 5) return null;

    if (variation === POKER_VARIATIONS.JACKS_OR_BETTER) {
      return this._evaluateStandardPoker(cards);
    } else if (variation === POKER_VARIATIONS.DEUCES_WILD) {
      return this._evaluateDeucesWild(cards);
    } else if (variation === POKER_VARIATIONS.JOKER_POKER) {
      return this._evaluateJokerPoker(cards);
    }

    return this._evaluateStandardPoker(cards);
  }

  _evaluateStandardPoker(cards) {
    const ranks = cards.map(c => c.rank).sort((a, b) => a - b);
    const suits = cards.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = this._checkStraight(ranks);
    const counts = this._getRankCounts(ranks);
    const countValues = Object.values(counts).sort((a, b) => b - a);

    // Royal Flush: 10, J, Q, K, A (ranks: 0, 9, 10, 11, 12)
    const isAceHighStraight = (
      ranks[0] === 0 && ranks[1] === 9 && ranks[2] === 10 && ranks[3] === 11 && ranks[4] === 12
    );

    if (isFlush && isAceHighStraight) {
      return { rank: 'ROYAL_FLUSH', name: 'Royal Flush', multiplier: 250 };
    }
    if (isFlush && isStraight) {
      return { rank: 'STRAIGHT_FLUSH', name: 'Straight Flush', multiplier: 50 };
    }
    if (countValues[0] === 4) {
      return { rank: 'FOUR_OF_A_KIND', name: 'Four of a Kind', multiplier: 25 };
    }
    if (countValues[0] === 3 && countValues[1] === 2) {
      return { rank: 'FULL_HOUSE', name: 'Full House', multiplier: 9 };
    }
    if (isFlush) {
      return { rank: 'FLUSH', name: 'Flush', multiplier: 6 };
    }
    if (isStraight || isAceHighStraight) {
      return { rank: 'STRAIGHT', name: 'Straight', multiplier: 4 };
    }
    if (countValues[0] === 3) {
      return { rank: 'THREE_OF_A_KIND', name: 'Three of a Kind', multiplier: 3 };
    }
    if (countValues[0] === 2 && countValues[1] === 2) {
      return { rank: 'TWO_PAIR', name: 'Two Pair', multiplier: 2, pays: true };
    }
    if (countValues[0] === 2) {
      // Jacks or Better: pair of J (10), Q (11), K (12), or A (0)
      const pairRank = Number(Object.keys(counts).find(r => counts[r] === 2));
      if (pairRank === 0 || pairRank >= 10) {
        return { rank: 'JACKS_OR_BETTER', name: 'Jacks or Better', multiplier: 1, pays: true };
      }
      return { rank: 'PAIR_LOW', name: `Pair of ${RANK_PLURAL_NAMES[pairRank]}`, multiplier: 0, pays: false, explanation: 'Requires Jacks or Better' };
    }

    return { rank: 'HIGH_CARD', name: 'High Card', multiplier: 0, pays: false, explanation: 'No Payout' };
  }

  _evaluateDeucesWild(cards) {
    // Rank 1 is 2 (Deuce)
    const deucesCount = cards.filter(c => c.rank === 1).length;
    const nonDeuces = cards.filter(c => c.rank !== 1);

    if (deucesCount === 4) {
      return { rank: 'FOUR_DEUCES', name: 'Four Deuces', multiplier: 200, pays: true };
    }

    if (deucesCount === 0) {
      // Standard evaluation with Natural Royal check
      const std = this._evaluateStandardPoker(cards);
      if (std && std.rank === 'ROYAL_FLUSH') {
        return { rank: 'NATURAL_ROYAL', name: 'Natural Royal Flush', multiplier: 250, pays: true };
      }
      if (std && std.rank === 'STRAIGHT_FLUSH') return { rank: 'STRAIGHT_FLUSH', name: 'Straight Flush', multiplier: 9, pays: true };
      if (std && std.rank === 'FOUR_OF_A_KIND') return { rank: 'FOUR_OF_A_KIND', name: 'Four of a Kind', multiplier: 5, pays: true };
      if (std && std.rank === 'FULL_HOUSE') return { rank: 'FULL_HOUSE', name: 'Full House', multiplier: 3, pays: true };
      if (std && std.rank === 'FLUSH') return { rank: 'FLUSH', name: 'Flush', multiplier: 2, pays: true };
      if (std && std.rank === 'STRAIGHT') return { rank: 'STRAIGHT', name: 'Straight', multiplier: 2, pays: true };
      if (std && std.rank === 'THREE_OF_A_KIND') return { rank: 'THREE_OF_A_KIND', name: 'Three of a Kind', multiplier: 1, pays: true };
      if (std && std.rank === 'TWO_PAIR') {
        return { rank: 'TWO_PAIR', name: 'Two Pair', multiplier: 0, pays: false, explanation: 'No payout in Deuces Wild (Min. win is 3 of a Kind)' };
      }
      if (std && (std.rank === 'JACKS_OR_BETTER' || std.rank === 'PAIR_LOW' || std.rank === 'PAIR')) {
        return { rank: 'PAIR', name: std.name || 'One Pair', multiplier: 0, pays: false, explanation: 'No payout in Deuces Wild (Min. win is 3 of a Kind)' };
      }
      return { rank: 'HIGH_CARD', name: 'High Card', multiplier: 0, pays: false, explanation: 'No Payout' };
    }

    // With Deuces wild (1, 2, or 3 deuces)
    const counts = this._getRankCounts(nonDeuces.map(c => c.rank));
    const maxKind = Math.max(0, ...Object.values(counts)) + deucesCount;

    // Five of a kind
    if (maxKind >= 5) {
      return { rank: 'FIVE_OF_A_KIND', name: 'Five of a Kind', multiplier: 15 };
    }

    // Check Wild Royal Flush
    const nonDeuceSuits = new Set(nonDeuces.map(c => c.suit));
    if (nonDeuceSuits.size === 1) {
      const suit = nonDeuces[0].suit;
      const royalRanks = [0, 9, 10, 11, 12]; // A, 10, J, Q, K
      const nonDeuceRanks = nonDeuces.map(c => c.rank);
      const isRoyalSub = nonDeuceRanks.every(r => royalRanks.includes(r));
      if (isRoyalSub) {
        return { rank: 'WILD_ROYAL', name: 'Wild Royal Flush', multiplier: 25 };
      }
    }

    // Check Straight Flush with wild
    if (this._hasStraightFlushWild(nonDeuces, deucesCount)) {
      return { rank: 'STRAIGHT_FLUSH', name: 'Straight Flush', multiplier: 9 };
    }

    // Four of a kind
    if (maxKind >= 4) {
      return { rank: 'FOUR_OF_A_KIND', name: 'Four of a Kind', multiplier: 5 };
    }

    // Full House (Only possible with 1 deuce + two pairs)
    if (deucesCount === 1) {
      const distinctCounts = Object.values(counts).sort((a, b) => b - a);
      if (distinctCounts[0] === 2 && distinctCounts[1] === 2) {
        return { rank: 'FULL_HOUSE', name: 'Full House', multiplier: 3 };
      }
    }

    // Flush
    if (nonDeuceSuits.size === 1) {
      return { rank: 'FLUSH', name: 'Flush', multiplier: 2 };
    }

    // Straight with wild
    if (this._hasStraightWild(nonDeuces, deucesCount)) {
      return { rank: 'STRAIGHT', name: 'Straight', multiplier: 2 };
    }

    // Three of a kind
    if (maxKind >= 3) {
      return { rank: 'THREE_OF_A_KIND', name: 'Three of a Kind', multiplier: 1, pays: true };
    }

    if (maxKind === 2) {
      return { rank: 'PAIR', name: 'One Pair (with Wild Deuce)', multiplier: 0, pays: false, explanation: 'No payout in Deuces Wild (Min. win is 3 of a Kind)' };
    }

    return { rank: 'HIGH_CARD', name: 'High Card', multiplier: 0, pays: false, explanation: 'No Payout' };
  }

  _evaluateJokerPoker(cards) {
    const hasJoker = cards.some(c => c.isJoker);
    const regular = cards.filter(c => !c.isJoker);

    if (!hasJoker) {
      const std = this._evaluateStandardPoker(cards);
      if (std && std.rank === 'ROYAL_FLUSH') {
        return { rank: 'NATURAL_ROYAL', name: 'Natural Royal Flush', multiplier: 250, pays: true };
      }
      if (std) {
        // Kings or better rule in Joker Poker
        if (std.rank === 'JACKS_OR_BETTER') {
          // Check if pair is Kings or Aces
          const counts = this._getRankCounts(cards.map(c => c.rank));
          const pairRank = Number(Object.keys(counts).find(r => counts[r] === 2));
          if (pairRank === 0 || pairRank === 12) {
            return { rank: 'KINGS_OR_BETTER', name: 'Kings or Better', multiplier: 1, pays: true };
          }
          return { rank: 'PAIR_LOW', name: `Pair of ${RANK_PLURAL_NAMES[pairRank]}`, multiplier: 0, pays: false, explanation: 'Requires Kings or Better' };
        }
        if (std.rank === 'TWO_PAIR') {
          // In Joker Poker paytable, Two Pair pays 1:1
          return { rank: 'TWO_PAIR', name: 'Two Pair', multiplier: 1, pays: true };
        }
        if (std.rank === 'PAIR_LOW') {
          return { ...std, explanation: 'Requires Kings or Better' };
        }
        return { ...std, pays: (std.multiplier > 0) };
      }
      return { rank: 'HIGH_CARD', name: 'High Card', multiplier: 0, pays: false, explanation: 'No Payout' };
    }

    // Joker is present - evaluate best hand with Wild Joker substitution
    const counts = this._getRankCounts(regular.map(c => c.rank));
    const maxKind = Math.max(0, ...Object.values(counts)) + 1;
    const distinctCounts = Object.values(counts).sort((a, b) => b - a);

    // Five of a kind (4 of a kind + Wild Joker)
    if (maxKind >= 5) {
      const fourRank = Number(Object.keys(counts).find(r => counts[r] === 4));
      const rankPlural = RANK_PLURAL_NAMES[fourRank] || '';
      return { rank: 'FIVE_OF_A_KIND', name: rankPlural ? `Five of a Kind (Five ${rankPlural})` : 'Five of a Kind', multiplier: 200, pays: true };
    }

    // Wild Royal Flush (4 suited royal cards 10, J, Q, K, A + Wild Joker)
    const regSuits = new Set(regular.map(c => c.suit));
    if (regSuits.size === 1) {
      const royalRanks = [0, 9, 10, 11, 12];
      const isRoyalSub = regular.every(c => royalRanks.includes(c.rank));
      if (isRoyalSub) {
        return { rank: 'JOKER_ROYAL', name: 'Wild Royal Flush (with Wild Joker)', multiplier: 100, pays: true };
      }
    }

    // Straight Flush with 1 wild
    if (this._hasStraightFlushWild(regular, 1)) {
      return { rank: 'STRAIGHT_FLUSH', name: 'Straight Flush (with Wild Joker)', multiplier: 50, pays: true };
    }

    // Four of a kind (3 of a kind + Wild Joker)
    if (maxKind >= 4) {
      const tripRank = Number(Object.keys(counts).find(r => counts[r] === 3));
      const rankPlural = RANK_PLURAL_NAMES[tripRank] || '';
      return { rank: 'FOUR_OF_A_KIND', name: rankPlural ? `Four of a Kind (Four ${rankPlural})` : 'Four of a Kind', multiplier: 20, pays: true };
    }

    // Full House (with 1 wild joker + 2 pairs: Joker promotes higher pair to trips)
    if (distinctCounts[0] === 2 && distinctCounts[1] === 2) {
      const pairRanks = Object.keys(counts).filter(r => counts[r] === 2).map(Number);
      return { rank: 'FULL_HOUSE', name: `Full House (${RANK_PLURAL_NAMES[pairRanks[1]]} full of ${RANK_PLURAL_NAMES[pairRanks[0]]})`, multiplier: 7, pays: true };
    }

    // Flush (4 of same suit + Wild Joker)
    if (regSuits.size === 1) {
      return { rank: 'FLUSH', name: 'Flush (with Wild Joker)', multiplier: 5, pays: true };
    }

    // Straight with 1 wild
    if (this._hasStraightWild(regular, 1)) {
      return { rank: 'STRAIGHT', name: 'Straight (with Wild Joker)', multiplier: 3, pays: true };
    }

    // Three of a kind (1 natural pair + Wild Joker)
    if (maxKind >= 3) {
      const pairRank = Number(Object.keys(counts).find(r => counts[r] === 2));
      const rankPlural = RANK_PLURAL_NAMES[pairRank] || '';
      return { rank: 'THREE_OF_A_KIND', name: rankPlural ? `Three of a Kind (Three ${rankPlural})` : 'Three of a Kind', multiplier: 2, pays: true };
    }

    // Kings or Better (single King or Ace paired with Wild Joker)
    const highCard = regular.find(c => c.rank === 0 || c.rank === 12);
    if (highCard) {
      const highRankName = highCard.rank === 0 ? 'Aces' : 'Kings';
      return { rank: 'KINGS_OR_BETTER', name: `Kings or Better (Pair of ${highRankName} with Wild Joker)`, multiplier: 1, pays: true };
    }

    if (regular.length > 0) {
      // Wild Joker pairs with the highest card (Queens or lower)
      const sortedRanks = regular.map(c => c.rank).sort((a, b) => b - a);
      const bestPairRank = sortedRanks[0];
      const rankName = RANK_PLURAL_NAMES[bestPairRank] || 'Cards';
      return {
        rank: 'PAIR_LOW',
        name: `Pair of ${rankName} (with Wild Joker)`,
        multiplier: 0,
        pays: false,
        explanation: 'Requires Kings or Better to pay'
      };
    }

    return { rank: 'HIGH_CARD', name: 'High Card', multiplier: 0, pays: false, explanation: 'No Payout' };
  }

  _checkStraight(sortedRanks) {
    // Normal 5-consecutive
    let consecutive = true;
    for (let i = 0; i < 4; i++) {
      if (sortedRanks[i + 1] !== sortedRanks[i] + 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return true;

    // Ace-high: A (0), 10 (9), J (10), Q (11), K (12)
    return (
      sortedRanks[0] === 0 &&
      sortedRanks[1] === 9 &&
      sortedRanks[2] === 10 &&
      sortedRanks[3] === 11 &&
      sortedRanks[4] === 12
    );
  }

  _hasStraightWild(nonWildCards, wildCount) {
    const ranks = [...new Set(nonWildCards.map(c => c.rank))];
    if (ranks.length + wildCount < 5) return false;

    // Test all possible 5-card windows from Ace-low (0..4) to Ace-high (9..12 + 0)
    for (let low = 0; low <= 9; low++) {
      const windowRanks = low === 9 ? [9, 10, 11, 12, 0] : [low, low + 1, low + 2, low + 3, low + 4];
      let matches = 0;
      for (const r of windowRanks) {
        if (ranks.includes(r)) matches++;
      }
      if (matches + wildCount >= 5) return true;
    }
    return false;
  }

  _hasStraightFlushWild(nonWildCards, wildCount) {
    const suits = new Set(nonWildCards.map(c => c.suit));
    if (suits.size > 1) return false;
    return this._hasStraightWild(nonWildCards, wildCount);
  }

  _getRankCounts(ranks) {
    const counts = {};
    for (const r of ranks) {
      counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }

  /**
   * Tactical Hint / Auto-Hold Advisor:
   * Returns an array of boolean flags [0..4] indicating which cards to hold, along with strategy rationale.
   */
  getTacticalHint() {
    if (this.state.phase !== 'HOLDING') return null;

    const cards = this.state.hand;
    let result = null;

    if (this.variation === POKER_VARIATIONS.DEUCES_WILD) {
      result = this._getDeucesWildHint(cards);
    } else if (this.variation === POKER_VARIATIONS.JOKER_POKER) {
      result = this._getJokerPokerHint(cards);
    } else {
      result = this._getJacksOrBetterHint(cards);
    }

    // Safety Invariant: Never tell player to draw 5 cards if any card is held
    const heldCount = result.hold.filter(Boolean).length;
    if (heldCount > 0 && result.reason.includes('draw 5')) {
      const drawCount = 5 - heldCount;
      result.reason = `Hold ${heldCount} card${heldCount > 1 ? 's' : ''} and draw ${drawCount} card${drawCount > 1 ? 's' : ''}.`;
    }

    return result;
  }

  _getDeucesWildHint(cards) {
    const deucesIndices = [];
    const nonDeucesIndices = [];
    cards.forEach((c, i) => {
      if (c.rank === 1) deucesIndices.push(i);
      else nonDeucesIndices.push(i);
    });

    const deuceCount = deucesIndices.length;
    const hold = [false, false, false, false, false];

    // Priority 0: In Deuces Wild, ALWAYS hold every deuce
    deucesIndices.forEach(i => hold[i] = true);

    const made = this.evaluateHand(cards, POKER_VARIATIONS.DEUCES_WILD);

    // FOUR DEUCES
    if (deuceCount === 4) {
      return {
        hold,
        reason: 'Four Deuces Jackpot (200:1)! Hold all 4 Deuces and draw 1 card.'
      };
    }

    // THREE DEUCES
    if (deuceCount === 3) {
      if (made && (made.rank === 'FIVE_OF_A_KIND' || made.rank === 'WILD_ROYAL')) {
        return {
          hold: [true, true, true, true, true],
          reason: `Made ${made.name}! Hold all 5 cards.`
        };
      }
      // Check 4 to a Wild Royal (3 deuces + 1 royal card 10, J, Q, K, A)
      const royalRanks = [0, 9, 10, 11, 12];
      const royalNonDeuces = nonDeucesIndices.filter(i => royalRanks.includes(cards[i].rank));
      if (royalNonDeuces.length > 0) {
        hold[royalNonDeuces[0]] = true;
        return {
          hold,
          reason: 'Deuces Wild: Hold 3 Deuces + suited royal (4 to a Wild Royal).'
        };
      }
      return {
        hold,
        reason: 'Deuces Wild: Hold all 3 wild Deuces (2s) and draw 2 cards for Five of a Kind.'
      };
    }

    // TWO DEUCES
    if (deuceCount === 2) {
      if (made && (made.rank === 'FIVE_OF_A_KIND' || made.rank === 'WILD_ROYAL' || made.rank === 'STRAIGHT_FLUSH')) {
        return {
          hold: [true, true, true, true, true],
          reason: `Made ${made.name}! Hold all 5 cards.`
        };
      }
      if (made && made.rank === 'FOUR_OF_A_KIND') {
        const counts = this._getRankCounts(nonDeucesIndices.map(i => cards[i].rank));
        for (const r in counts) {
          if (counts[r] === 2) {
            nonDeucesIndices.forEach(i => {
              if (cards[i].rank === Number(r)) hold[i] = true;
            });
          }
        }
        return {
          hold,
          reason: 'Made Four of a Kind! Hold 2 Deuces and pair to draw for Five of a Kind.'
        };
      }
      // Check 4 to a Wild Royal (2 deuces + 2 royal cards of same suit)
      const royalRanks = [0, 9, 10, 11, 12];
      const royalIndices = nonDeucesIndices.filter(i => royalRanks.includes(cards[i].rank));
      const royalSuits = {};
      royalIndices.forEach(i => {
        royalSuits[cards[i].suit] = (royalSuits[cards[i].suit] || []).concat(i);
      });
      for (const s in royalSuits) {
        if (royalSuits[s].length >= 2) {
          royalSuits[s].forEach(i => hold[i] = true);
          return {
            hold,
            reason: 'Deuces Wild: Hold 2 Deuces + suited royals (4 to a Wild Royal).'
          };
        }
      }
      // Check 4 to an open Straight Flush (2 deuces + 2 suited cards with gap <= 3)
      const suitMap = {};
      nonDeucesIndices.forEach(i => {
        suitMap[cards[i].suit] = (suitMap[cards[i].suit] || []).concat(i);
      });
      for (const s in suitMap) {
        if (suitMap[s].length >= 2) {
          const idxs = suitMap[s];
          const diff = Math.abs(cards[idxs[0]].rank - cards[idxs[1]].rank);
          if (diff <= 3) {
            idxs.forEach(i => hold[i] = true);
            return {
              hold,
              reason: 'Deuces Wild: Hold 2 Deuces with open straight flush draw.'
            };
          }
        }
      }
      return {
        hold,
        reason: 'Deuces Wild: Always hold both wild Deuces (2s) and draw 3 cards.'
      };
    }

    // ONE DEUCE
    if (deuceCount === 1) {
      if (made && ['WILD_ROYAL', 'FIVE_OF_A_KIND', 'STRAIGHT_FLUSH', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT'].includes(made.rank)) {
        return {
          hold: [true, true, true, true, true],
          reason: `Made ${made.name}! Hold all 5 cards.`
        };
      }
      // Four of a Kind (1 deuce + natural 3 of a kind)
      const counts = this._getRankCounts(nonDeucesIndices.map(i => cards[i].rank));
      for (const r in counts) {
        if (counts[r] === 3) {
          nonDeucesIndices.forEach(i => {
            if (cards[i].rank === Number(r)) hold[i] = true;
          });
          return {
            hold,
            reason: 'Made Four of a Kind! Hold wild Deuce and trips.'
          };
        }
      }
      // 4 to a Wild Royal Flush (1 deuce + 3 suited royals 10, J, Q, K, A)
      const royalRanks = [0, 9, 10, 11, 12];
      const royalIndices = nonDeucesIndices.filter(i => royalRanks.includes(cards[i].rank));
      const royalSuits = {};
      royalIndices.forEach(i => {
        royalSuits[cards[i].suit] = (royalSuits[cards[i].suit] || []).concat(i);
      });
      for (const s in royalSuits) {
        if (royalSuits[s].length >= 3) {
          royalSuits[s].forEach(i => hold[i] = true);
          return {
            hold,
            reason: 'Deuces Wild: Hold wild Deuce + 3 suited royals (4 to a Wild Royal).'
          };
        }
      }
      // Three of a Kind (1 deuce + natural pair)
      for (const r in counts) {
        if (counts[r] === 2) {
          nonDeucesIndices.forEach(i => {
            if (cards[i].rank === Number(r)) hold[i] = true;
          });
          return {
            hold,
            reason: 'Made Three of a Kind! Hold wild Deuce and pair.'
          };
        }
      }
      // 4 to a Flush (1 deuce + 3 suited cards)
      const allSuits = {};
      nonDeucesIndices.forEach(i => {
        allSuits[cards[i].suit] = (allSuits[cards[i].suit] || []).concat(i);
      });
      for (const s in allSuits) {
        if (allSuits[s].length >= 3) {
          allSuits[s].forEach(i => hold[i] = true);
          return {
            hold,
            reason: 'Deuces Wild: Hold wild Deuce with 4 to a Flush.'
          };
        }
      }
      // 3 to a Wild Royal Flush (1 deuce + 2 suited royals)
      for (const s in royalSuits) {
        if (royalSuits[s].length >= 2) {
          royalSuits[s].forEach(i => hold[i] = true);
          return {
            hold,
            reason: 'Deuces Wild: Hold wild Deuce + 2 suited royals (3 to a Wild Royal).'
          };
        }
      }
      // Default with 1 Deuce: Never discard a Deuce! Hold Deuce alone and draw 4
      return {
        hold,
        reason: 'Deuces Wild: Hold the wild Deuce (2) and draw 4 cards.'
      };
    }

    // ZERO DEUCES
    if (made && ['NATURAL_ROYAL', 'ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT', 'THREE_OF_A_KIND'].includes(made.rank)) {
      return {
        hold: [true, true, true, true, true],
        reason: `Made ${made.name}! Hold all 5 cards.`
      };
    }

    // 4 to a Royal Flush
    const royalRanks = [0, 9, 10, 11, 12];
    const royalIndices = [0, 1, 2, 3, 4].filter(i => royalRanks.includes(cards[i].rank));
    const royalSuits = {};
    royalIndices.forEach(i => {
      royalSuits[cards[i].suit] = (royalSuits[cards[i].suit] || []).concat(i);
    });
    for (const s in royalSuits) {
      if (royalSuits[s].length >= 4) {
        royalSuits[s].forEach(i => hold[i] = true);
        return {
          hold,
          reason: '4 to a Natural Royal Flush! Hold 4 suited royals.'
        };
      }
    }

    // Hold pairs (natural pair can make 3 of a kind or full house)
    const counts = this._getRankCounts(cards.map(c => c.rank));
    const pairRanks = Object.keys(counts).filter(r => counts[r] === 2).map(Number);
    if (pairRanks.length >= 2) {
      // In Deuces Wild, Two Pair doesn't pay! Optimal strategy dictates holding the HIGHER pair and drawing 3 cards to target Three of a Kind or better.
      pairRanks.sort((a, b) => {
        const valA = a === 0 ? 14 : a;
        const valB = b === 0 ? 14 : b;
        return valB - valA;
      });
      const highPair = pairRanks[0];
      cards.forEach((c, i) => {
        if (c.rank === highPair) hold[i] = true;
      });
      const cardName = RANK_FULL_NAMES[highPair];
      return {
        hold,
        reason: `Deuces Wild: Two Pair does not pay! Hold higher pair (${cardName}s) and draw 3 cards for Three of a Kind or better.`
      };
    }

    if (pairRanks.length === 1) {
      const pRank = pairRanks[0];
      cards.forEach((c, i) => {
        if (c.rank === pRank) hold[i] = true;
      });
      const cardName = RANK_FULL_NAMES[pRank];
      return {
        hold,
        reason: `Deuces Wild: Hold pair of ${cardName}s to draw for Three of a Kind or better.`
      };
    }

    // 4 to a Flush
    const flushSuits = {};
    cards.forEach((c, i) => {
      flushSuits[c.suit] = (flushSuits[c.suit] || []).concat(i);
    });
    for (const s in flushSuits) {
      if (flushSuits[s].length >= 4) {
        flushSuits[s].forEach(i => hold[i] = true);
        return {
          hold,
          reason: '4 to a Flush: Hold 4 suited cards.'
        };
      }
    }

    // 3 to a Royal Flush
    for (const s in royalSuits) {
      if (royalSuits[s].length >= 3) {
        royalSuits[s].forEach(i => hold[i] = true);
        return {
          hold,
          reason: '3 to a Royal Flush: Hold 3 suited royal cards.'
        };
      }
    }

    return {
      hold: [false, false, false, false, false],
      reason: 'No high-probability draws; draw 5 fresh cards.'
    };
  }

  _getJokerPokerHint(cards) {
    const jokerIndex = cards.findIndex(c => c.isJoker);
    const hasJoker = jokerIndex !== -1;
    const hold = [false, false, false, false, false];

    if (hasJoker) {
      hold[jokerIndex] = true;
      const regularIndices = [0, 1, 2, 3, 4].filter(i => i !== jokerIndex);
      const regularCards = regularIndices.map(i => cards[i]);
      const made = this.evaluateHand(cards, POKER_VARIATIONS.JOKER_POKER);

      if (made && ['FIVE_OF_A_KIND', 'ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT'].includes(made.rank)) {
        return {
          hold: [true, true, true, true, true],
          reason: `Made ${made.name}! Hold all 5 cards.`
        };
      }

      // Check 4 to a Wild Royal Flush (Joker + 3 suited royals 10, J, Q, K, A)
      const royalRanks = [0, 9, 10, 11, 12];
      const royalIndices = regularIndices.filter(i => royalRanks.includes(cards[i].rank));
      const royalSuits = {};
      royalIndices.forEach(i => {
        royalSuits[cards[i].suit] = (royalSuits[cards[i].suit] || []).concat(i);
      });
      for (const s in royalSuits) {
        if (royalSuits[s].length >= 3) {
          royalSuits[s].forEach(i => hold[i] = true);
          return {
            hold,
            reason: 'Joker Poker: Hold wild Joker + 3 suited royals (4 to a Wild Royal).'
          };
        }
      }

      // Check Three of a Kind (Joker + natural pair)
      const counts = this._getRankCounts(regularCards.map(c => c.rank));
      for (const r in counts) {
        if (counts[r] >= 2) {
          regularIndices.forEach(i => {
            if (cards[i].rank === Number(r)) hold[i] = true;
          });
          return {
            hold,
            reason: 'Made Three of a Kind! Hold wild Joker and pair.'
          };
        }
      }

      // Check 4 to a Flush (Joker + 3 suited cards)
      const suitCounts = {};
      regularIndices.forEach(i => {
        suitCounts[cards[i].suit] = (suitCounts[cards[i].suit] || []).concat(i);
      });
      for (const s in suitCounts) {
        if (suitCounts[s].length >= 3) {
          suitCounts[s].forEach(i => hold[i] = true);
          return {
            hold,
            reason: 'Joker Poker: Hold wild Joker with 4 to a Flush.'
          };
        }
      }

      // Check Joker + High Card (King or Ace: rank 12 or 0)
      const highCardIndices = regularIndices.filter(i => cards[i].rank === 0 || cards[i].rank === 12);
      if (highCardIndices.length > 0) {
        hold[highCardIndices[0]] = true;
        return {
          hold,
          reason: 'Joker Poker: Hold wild Joker + High Card (King or Ace) for guaranteed Kings or Better payout.'
        };
      }

      // Otherwise: Hold the wild Joker alone and draw 4 cards!
      return {
        hold,
        reason: 'Joker Poker: Hold the wild Joker and draw 4 cards (pairs of Queens or lower do not pay).'
      };
    }

    // No Joker in hand
    const made = this.evaluateHand(cards, POKER_VARIATIONS.JOKER_POKER);
    if (made && ['NATURAL_ROYAL', 'ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT', 'THREE_OF_A_KIND', 'TWO_PAIR', 'KINGS_OR_BETTER'].includes(made.rank)) {
      if (made.rank === 'KINGS_OR_BETTER') {
        const counts = this._getRankCounts(cards.map(c => c.rank));
        for (const r in counts) {
          if (counts[r] === 2) {
            cards.forEach((c, i) => {
              if (c.rank === Number(r)) hold[i] = true;
            });
          }
        }
        return {
          hold,
          reason: 'Made Kings or Better! Hold winning pair.'
        };
      }
      return {
        hold: [true, true, true, true, true],
        reason: `Made ${made.name}! Hold all 5 cards.`
      };
    }

    // Check low pair (2 through Queen)
    const counts = this._getRankCounts(cards.map(c => c.rank));
    for (const r in counts) {
      if (counts[r] >= 2) {
        cards.forEach((c, i) => {
          if (c.rank === Number(r)) hold[i] = true;
        });
        return {
          hold,
          reason: 'Joker Poker: Hold pair to draw for Three of a Kind or better.'
        };
      }
    }

    // Check 4 to a Flush
    const suitCounts = {};
    cards.forEach((c, i) => {
      suitCounts[c.suit] = (suitCounts[c.suit] || []).concat(i);
    });
    for (const s in suitCounts) {
      if (suitCounts[s].length >= 4) {
        suitCounts[s].forEach(i => hold[i] = true);
        return {
          hold,
          reason: '4 to a Flush: Hold 4 suited cards.'
        };
      }
    }

    // Check high cards (King or Ace)
    const highCardIndices = [0, 1, 2, 3, 4].filter(i => cards[i].rank === 0 || cards[i].rank === 12);
    if (highCardIndices.length > 0) {
      highCardIndices.forEach(i => hold[i] = true);
      return {
        hold,
        reason: 'Joker Poker: Hold High Card (King or Ace).'
      };
    }

    return {
      hold: [false, false, false, false, false],
      reason: 'No high-probability draws; draw 5 fresh cards.'
    };
  }

  _getJacksOrBetterHint(cards) {
    const hold = [false, false, false, false, false];
    const made = this.evaluateHand(cards, POKER_VARIATIONS.JACKS_OR_BETTER);

    // 4 to a Royal Flush takes precedence over made Flush or Straight
    const royalRanks = [0, 9, 10, 11, 12];
    const royalIndices = [0, 1, 2, 3, 4].filter(i => royalRanks.includes(cards[i].rank));
    const royalSuits = {};
    royalIndices.forEach(i => {
      royalSuits[cards[i].suit] = (royalSuits[cards[i].suit] || []).concat(i);
    });
    for (const s in royalSuits) {
      if (royalSuits[s].length === 4) {
        royalSuits[s].forEach(i => hold[i] = true);
        return {
          hold,
          reason: '4 to a Royal Flush! Break made hand to draw for Royal Flush.'
        };
      }
    }

    // Made winning hand
    if (made && made.pays !== false) {
      if (made.rank === 'JACKS_OR_BETTER') {
        const counts = this._getRankCounts(cards.map(c => c.rank));
        for (const r in counts) {
          if (counts[r] === 2) {
            cards.forEach((c, i) => {
              if (c.rank === Number(r)) hold[i] = true;
            });
          }
        }
        return {
          hold,
          reason: 'Made Jacks or Better! Hold paying pair.'
        };
      }
      if (made.rank === 'TWO_PAIR') {
        const counts = this._getRankCounts(cards.map(c => c.rank));
        for (const r in counts) {
          if (counts[r] === 2) {
            cards.forEach((c, i) => {
              if (c.rank === Number(r)) hold[i] = true;
            });
          }
        }
        return {
          hold,
          reason: 'Made Two Pair! Hold both pairs to draw for Full House.'
        };
      }
      if (made.rank === 'THREE_OF_A_KIND') {
        const counts = this._getRankCounts(cards.map(c => c.rank));
        for (const r in counts) {
          if (counts[r] === 3) {
            cards.forEach((c, i) => {
              if (c.rank === Number(r)) hold[i] = true;
            });
          }
        }
        return {
          hold,
          reason: 'Made Three of a Kind! Hold trips to draw for 4 of a Kind or Full House.'
        };
      }
      return {
        hold: [true, true, true, true, true],
        reason: `Made ${made.name}! Hold all 5 cards.`
      };
    }

    // Low pair (2 through 10)
    const counts = this._getRankCounts(cards.map(c => c.rank));
    for (const r in counts) {
      if (counts[r] === 2) {
        cards.forEach((c, i) => {
          if (c.rank === Number(r)) hold[i] = true;
        });
        return {
          hold,
          reason: 'Hold low pair to draw for Three of a Kind or Full House.'
        };
      }
    }

    // 4 to a Flush
    const suitCounts = {};
    cards.forEach((c, i) => {
      suitCounts[c.suit] = (suitCounts[c.suit] || []).concat(i);
    });
    for (const s in suitCounts) {
      if (suitCounts[s].length >= 4) {
        suitCounts[s].forEach(i => hold[i] = true);
        return {
          hold,
          reason: '4 to a Flush: Hold 4 suited cards.'
        };
      }
    }

    // 3 to a Royal Flush
    for (const s in royalSuits) {
      if (royalSuits[s].length >= 3) {
        royalSuits[s].forEach(i => hold[i] = true);
        return {
          hold,
          reason: '3 to a Royal Flush: Hold 3 suited royal cards.'
        };
      }
    }

    // High cards (J, Q, K, A)
    const highIndices = [0, 1, 2, 3, 4].filter(i => cards[i].rank === 0 || cards[i].rank >= 10);
    if (highIndices.length > 0) {
      // If suited high cards exist, prioritize suited
      const highSuits = {};
      highIndices.forEach(i => {
        highSuits[cards[i].suit] = (highSuits[cards[i].suit] || []).concat(i);
      });
      for (const s in highSuits) {
        if (highSuits[s].length >= 2) {
          highSuits[s].forEach(i => hold[i] = true);
          return {
            hold,
            reason: 'Hold 2 suited high cards for Royal/Straight/Pair chances.'
          };
        }
      }
      // Otherwise hold up to 2 unsuited high cards
      const toHold = highIndices.slice(0, 2);
      toHold.forEach(i => hold[i] = true);
      const cardWord = toHold.length === 1 ? 'high card' : 'high cards';
      return {
        hold,
        reason: `Hold ${cardWord} (Jacks or higher) to draw for paying pair.`
      };
    }

    return {
      hold: [false, false, false, false, false],
      reason: 'No high-probability draws; draw 5 fresh cards.'
    };
  }
}
