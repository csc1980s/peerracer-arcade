/**
 * Solitaire Sovereign - Clean-Room Texas Hold'em Table Poker Engine
 * 
 * Rules & Features:
 * - 4-player table: Active user + 3 AI opponents (Victoria, Duke, Sovereign)
 * - Standard 52-card deck with SplitMix64 PRNG
 * - Game Phases: PREFLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN
 * - 2 hole cards per player + 5 community cards (Flop 3, Turn 1, River 1)
 * - Hand Evaluator: Computes the best 5-card combination out of 7 cards (21 combinations)
 * - Detailed hand ranking: Royal Flush down to High Card with winning card identification
 * - Pot, Blinds (SB $10 / BB $20), side pot handling, and continuous hand dealing
 */

import { Card, RANK_NAMES } from '../core/card.js';
import { PRNG } from '../core/prng.js';
import { PokerGame, POKER_VARIATIONS } from './poker.js';

export const HOLDEM_STAGES = {
  PREFLOP: 'PREFLOP',
  FLOP: 'FLOP',
  TURN: 'TURN',
  RIVER: 'RIVER',
  SHOWDOWN: 'SHOWDOWN'
};

export class HoldemGame {
  constructor(options = {}) {
    this.seed = options.seed || Date.now();
    this.prng = new PRNG(this.seed);
    this.dealCode = `TH-${this.seed.toString(36).toUpperCase()}`;

    this.smallBlind = options.smallBlind || 10;
    this.bigBlind = options.bigBlind || 20;

    // Players: 0 = User, 1 = Victoria, 2 = Duke, 3 = Sovereign
    this.players = [
      { id: 0, name: options.playerName || 'Player 1', avatar: '👑', isHuman: true, chips: options.chips || 1000, currentBet: 0, folded: false, holeCards: [], bestHand: null, lastAction: '' },
      { id: 1, name: 'Victoria', avatar: '🦁', isHuman: false, chips: 1000, currentBet: 0, folded: false, holeCards: [], bestHand: null, lastAction: '' },
      { id: 2, name: 'Duke', avatar: '🦅', isHuman: false, chips: 1000, currentBet: 0, folded: false, holeCards: [], bestHand: null, lastAction: '' },
      { id: 3, name: 'Sovereign', avatar: '🐺', isHuman: false, chips: 1000, currentBet: 0, folded: false, holeCards: [], bestHand: null, lastAction: '' }
    ];

    this.dealerButton = 0;
    this.stage = HOLDEM_STAGES.PREFLOP;
    this.deck = [];
    this.communityCards = []; // 0 to 5 cards
    this.pot = 0;
    this.currentHighBet = 0;
    this.activePlayerIndex = 0;
    this.winners = [];
    this.winningCardIds = new Set();
    this.lastMessage = 'Place your bets and deal.';

    this._evaluator = new PokerGame();
    this.dealHand();
  }

  dealHand() {
    // Reset round state
    this.deck = Card.createStandardDeck(1);
    this.prng.shuffle(this.deck);

    this.communityCards = [];
    this.pot = 0;
    this.currentHighBet = 0;
    this.winners = [];
    this.winningCardIds.clear();

    // Rotate dealer button
    this.dealerButton = (this.dealerButton + 1) % this.players.length;

    // Reset players
    this.players.forEach(p => {
      // Rebuy if busted
      if (p.chips < this.bigBlind) p.chips = 1000;
      p.currentBet = 0;
      p.folded = false;
      p.holeCards = [];
      p.bestHand = null;
      p.lastAction = '';
    });

    // Deal 2 hole cards to each player
    for (let c = 0; c < 2; c++) {
      for (const p of this.players) {
        const card = this.deck.pop();
        card.faceUp = p.isHuman; // Human hole cards start face up; AI cards start face down
        p.holeCards.push(card);
      }
    }

    // Post Blinds
    const sbPlayer = this.players[(this.dealerButton + 1) % this.players.length];
    const bbPlayer = this.players[(this.dealerButton + 2) % this.players.length];

    this._deductBet(sbPlayer, this.smallBlind, 'Small Blind $10');
    this._deductBet(bbPlayer, this.bigBlind, 'Big Blind $20');
    this.currentHighBet = this.bigBlind;

    this.stage = HOLDEM_STAGES.PREFLOP;
    this.activePlayerIndex = (this.dealerButton + 3) % this.players.length;
    this.lastMessage = `Pre-Flop: Blinds posted ($${this.smallBlind}/$${this.bigBlind}).`;

    // Calculate initial player hand strength
    this._updatePlayerBestHand();

    // If active player is AI, advance until human turn
    if (!this.players[this.activePlayerIndex].isHuman) {
      this._runAITurns();
    }
  }

  _deductBet(player, amount, actionName) {
    const betAmount = Math.min(player.chips, amount);
    player.chips -= betAmount;
    player.currentBet += betAmount;
    this.pot += betAmount;
    player.lastAction = actionName;
    if (player.currentBet > this.currentHighBet) {
      this.currentHighBet = player.currentBet;
    }
  }

  userFold() {
    if (this.stage === HOLDEM_STAGES.SHOWDOWN) return false;
    const human = this.players[0];
    human.folded = true;
    human.lastAction = 'FOLD';
    this.lastMessage = 'You folded this hand.';
    this._advanceTurn();
    return true;
  }

  userCheck() {
    const human = this.players[0];
    if (human.currentBet < this.currentHighBet) {
      // Must call to stay in
      return this.userCall();
    }
    human.lastAction = 'CHECK';
    this.lastMessage = 'You checked.';
    this._advanceTurn();
    return true;
  }

  userCall() {
    const human = this.players[0];
    const callAmount = this.currentHighBet - human.currentBet;
    this._deductBet(human, callAmount, `CALL $${callAmount}`);
    this.lastMessage = callAmount > 0 ? `You called $${callAmount}.` : 'You checked.';
    this._advanceTurn();
    return true;
  }

  userRaise(raiseAmount = this.bigBlind) {
    const human = this.players[0];
    const toCall = this.currentHighBet - human.currentBet;
    const totalRaise = toCall + raiseAmount;
    this._deductBet(human, totalRaise, `RAISE $${totalRaise}`);
    this.lastMessage = `You raised to $${human.currentBet}.`;
    this._advanceTurn();
    return true;
  }

  _advanceTurn() {
    // Check if only 1 active player remains (everyone else folded)
    const active = this.players.filter(p => !p.folded);
    if (active.length === 1) {
      this._awardPotToLastStanding(active[0]);
      return;
    }

    // Advance to next active player
    let nextIdx = (this.activePlayerIndex + 1) % this.players.length;
    let iterations = 0;
    while ((this.players[nextIdx].folded || this.players[nextIdx].chips === 0) && iterations < 4) {
      nextIdx = (nextIdx + 1) % this.players.length;
      iterations++;
    }

    // Check if betting round complete (all players acted and bets match)
    const allBetsEqual = this.players.every(p => p.folded || p.chips === 0 || p.currentBet === this.currentHighBet);
    const allActed = this.players.every(p => p.folded || p.lastAction !== '');

    if (allBetsEqual && allActed) {
      this._advanceStage();
    } else {
      this.activePlayerIndex = nextIdx;
      if (!this.players[this.activePlayerIndex].isHuman && this.stage !== HOLDEM_STAGES.SHOWDOWN) {
        this._runAITurns();
      }
    }
  }

  _advanceStage() {
    // Reset round bets
    this.players.forEach(p => {
      p.currentBet = 0;
      if (!p.folded) p.lastAction = '';
    });
    this.currentHighBet = 0;

    if (this.stage === HOLDEM_STAGES.PREFLOP) {
      // Deal Flop (3 cards)
      this.stage = HOLDEM_STAGES.FLOP;
      for (let i = 0; i < 3; i++) {
        const card = this.deck.pop();
        card.faceUp = true;
        this.communityCards.push(card);
      }
      this.lastMessage = 'The Flop is dealt.';
    } else if (this.stage === HOLDEM_STAGES.FLOP) {
      // Deal Turn (1 card)
      this.stage = HOLDEM_STAGES.TURN;
      const card = this.deck.pop();
      card.faceUp = true;
      this.communityCards.push(card);
      this.lastMessage = 'The Turn is dealt.';
    } else if (this.stage === HOLDEM_STAGES.TURN) {
      // Deal River (1 card)
      this.stage = HOLDEM_STAGES.RIVER;
      const card = this.deck.pop();
      card.faceUp = true;
      this.communityCards.push(card);
      this.lastMessage = 'The River is dealt.';
    } else if (this.stage === HOLDEM_STAGES.RIVER) {
      // Showdown!
      this._resolveShowdown();
      return;
    }

    this._updatePlayerBestHand();

    // Start betting after dealer button
    this.activePlayerIndex = (this.dealerButton + 1) % this.players.length;
    while (this.players[this.activePlayerIndex].folded || this.players[this.activePlayerIndex].chips === 0) {
      this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    }

    if (!this.players[this.activePlayerIndex].isHuman) {
      this._runAITurns();
    }
  }

  _runAITurns() {
    while (!this.players[this.activePlayerIndex].isHuman && this.stage !== HOLDEM_STAGES.SHOWDOWN) {
      const ai = this.players[this.activePlayerIndex];
      if (ai.folded || ai.chips === 0) {
        this._advanceTurn();
        continue;
      }

      this._executeAIMove(ai);

      // Check if advancing stage or turn
      const allBetsEqual = this.players.every(p => p.folded || p.chips === 0 || p.currentBet === this.currentHighBet);
      const allActed = this.players.every(p => p.folded || p.lastAction !== '');

      if (allBetsEqual && allActed) {
        this._advanceStage();
        break;
      } else {
        this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
      }
    }
  }

  _executeAIMove(ai) {
    const callCost = this.currentHighBet - ai.currentBet;
    const handScore = this._evaluate7CardHand([...ai.holeCards, ...this.communityCards]);
    const scoreVal = handScore ? handScore.multiplier : 0;

    if (callCost === 0) {
      // Free to check
      if (scoreVal >= 3 && this.prng.boundedInt(100) < 40) {
        this._deductBet(ai, this.bigBlind, `RAISE $${this.bigBlind}`);
      } else {
        ai.lastAction = 'CHECK';
      }
    } else if (callCost <= this.bigBlind) {
      // Cheap to call
      if (scoreVal >= 1 || this.prng.boundedInt(100) < 80) {
        this._deductBet(ai, callCost, `CALL $${callCost}`);
      } else {
        ai.folded = true;
        ai.lastAction = 'FOLD';
      }
    } else {
      // High bet facing AI
      if (scoreVal >= 2 || (scoreVal >= 1 && this.prng.boundedInt(100) < 60)) {
        this._deductBet(ai, callCost, `CALL $${callCost}`);
      } else {
        ai.folded = true;
        ai.lastAction = 'FOLD';
      }
    }
  }

  _resolveShowdown() {
    this.stage = HOLDEM_STAGES.SHOWDOWN;

    // Reveal all remaining active players' cards
    this.players.forEach(p => {
      if (!p.folded) {
        p.holeCards.forEach(c => c.faceUp = true);
        p.bestHand = this._evaluate7CardHand([...p.holeCards, ...this.communityCards]);
      }
    });

    // Find highest ranked player(s)
    const active = this.players.filter(p => !p.folded && p.bestHand);
    if (active.length === 0) return;

    active.sort((a, b) => b.bestHand.rankScore - a.bestHand.rankScore);
    const topScore = active[0].bestHand.rankScore;
    this.winners = active.filter(p => p.bestHand.rankScore === topScore);

    // Split pot if tie
    const splitPot = Math.floor(this.pot / this.winners.length);
    this.winners.forEach(w => {
      w.chips += splitPot;
      // Mark winning 5 cards to glow
      w.bestHand.bestCards.forEach(c => this.winningCardIds.add(c.id));
    });

    if (this.winners.length === 1) {
      const winner = this.winners[0];
      this.lastMessage = `${winner.name} wins $${this.pot} with ${winner.bestHand.name}!`;
    } else {
      const names = this.winners.map(w => w.name).join(' & ');
      this.lastMessage = `Split Pot! ${names} split $${this.pot} with ${this.winners[0].bestHand.name}.`;
    }
  }

  _awardPotToLastStanding(winner) {
    this.stage = HOLDEM_STAGES.SHOWDOWN;
    winner.chips += this.pot;
    this.winners = [winner];
    this.lastMessage = `All opponents folded. ${winner.name} wins $${this.pot}!`;
  }

  _updatePlayerBestHand() {
    const human = this.players[0];
    if (human.folded) {
      human.bestHand = null;
      return;
    }
    const allCards = [...human.holeCards, ...this.communityCards];
    human.bestHand = this._evaluate7CardHand(allCards);
  }

  /**
   * Generates all C(N, 5) combinations and returns the highest evaluated 5-card hand
   */
  _evaluate7CardHand(cards) {
    if (!cards || cards.length < 5) {
      // Evaluate hole cards alone
      if (cards.length >= 2) {
        if (cards[0].rank === cards[1].rank) {
          return { rank: 'PAIR', name: `Pocket Pair of ${cards[0].rankName}s`, rankScore: 100 + cards[0].rank, bestCards: cards };
        }
        const highRank = Math.max(cards[0].rank, cards[1].rank);
        return { rank: 'HIGH_CARD', name: `High Card ${cards[0].rank > cards[1].rank ? cards[0].rankName : cards[1].rankName}`, rankScore: highRank, bestCards: cards };
      }
      return null;
    }

    const combos = this._getCombinations(cards, 5);
    let best = null;

    const RANK_TIERS = {
      'ROYAL_FLUSH': 9000,
      'STRAIGHT_FLUSH': 8000,
      'FOUR_OF_A_KIND': 7000,
      'FULL_HOUSE': 6000,
      'FLUSH': 5000,
      'STRAIGHT': 4000,
      'THREE_OF_A_KIND': 3000,
      'TWO_PAIR': 2000,
      'JACKS_OR_BETTER': 1000,
      'HIGH_CARD': 0
    };

    for (const combo of combos) {
      const res = this._evaluator._evaluateStandardPoker(combo);
      let rankKey = res ? res.rank : 'HIGH_CARD';
      let handName = res ? res.name : 'High Card';

      // Check for low pair (2..10) which _evaluateStandardPoker doesn't flag as Jacks or Better
      if (rankKey === 'HIGH_CARD') {
        const counts = {};
        combo.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
        const pairRank = Object.keys(counts).find(r => counts[r] === 2);
        if (pairRank !== undefined) {
          rankKey = 'PAIR';
          const rName = RANK_NAMES[pairRank] || pairRank;
          handName = `Pair of ${rName}s`;
        }
      }

      const baseScore = RANK_TIERS[rankKey] || 500;
      const tieBreaker = combo.reduce((sum, c) => sum + (c.rank === 0 ? 14 : c.rank + 1), 0);
      const totalScore = baseScore + tieBreaker;

      if (!best || totalScore > best.rankScore) {
        best = {
          rank: rankKey,
          name: handName,
          rankScore: totalScore,
          multiplier: res ? res.multiplier : 0,
          bestCards: combo
        };
      }
    }

    return best;
  }

  _getCombinations(array, k) {
    const result = [];
    function backtrack(start, combo) {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        backtrack(i + 1, combo);
        combo.pop();
      }
    }
    backtrack(0, []);
    return result;
  }

  getTacticalHint() {
    if (this.stage === HOLDEM_STAGES.SHOWDOWN) {
      return { reason: 'Hand complete. Click DEAL NEXT HAND to continue.' };
    }
    const human = this.players[0];
    const best = human.bestHand;
    const callCost = this.currentHighBet - human.currentBet;

    if (!best) return { reason: 'Play your hole cards.' };

    if (best.rankScore >= 2000) {
      return { reason: `Strong Hand: ${best.name}! Consider Raising or Calling.` };
    } else if (callCost === 0) {
      return { reason: `Made ${best.name}. Check to see free community cards.` };
    } else if (callCost <= this.bigBlind) {
      return { reason: `Small bet ($${callCost}). Worth calling with ${best.name}.` };
    } else {
      return { reason: `Facing bet of $${callCost} with ${best.name}. Consider Folding unless holding strong draws.` };
    }
  }
}
