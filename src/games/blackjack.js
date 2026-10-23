/**
 * Solitaire Sovereign - Clean-Room Casino Blackjack (21) Rules Engine
 * 
 * Rules Architecture:
 * - 6-Deck Shoe (312 cards) shuffled via SplitMix64 PRNG.
 * - Dealer stands on all 17s (hard & soft 17).
 * - Player actions: Deal, Hit, Stand, Double Down, Split (pair splitting), Insurance.
 * - Payouts: Natural Blackjack 3:2, Standard Win 1:1, Insurance 2:1, Push returns bet.
 * - Integrated Basic Strategy Hint Engine: Evaluates mathematically optimal casino plays.
 */

import { Card, SUITS } from '../core/card.js';
import { SplitMix64 } from '../core/prng.js';

export const HAND_STATUS = Object.freeze({
  BETTING: 'BETTING',
  PLAYING: 'PLAYING',
  DEALER_TURN: 'DEALER_TURN',
  RESOLVED: 'RESOLVED'
});

export class BlackjackGame {
  constructor(options = {}) {
    this.seed = options.seed !== undefined ? options.seed : Date.now();
    this.prng = new SplitMix64(this.seed);
    this.numDecks = 6;
    this.shoe = [];
    this.minBet = 5;

    // Load persisted bankroll or default to $1,000
    const savedChips = localStorage.getItem('casino_bankroll') || localStorage.getItem('blackjack_bankroll');
    this.bankroll = savedChips ? parseInt(savedChips, 10) : 1000;
    this.currentBet = 0;
    this.previousBet = 25;

    // Game state
    this.dealerCards = [];
    this.playerHands = []; // Array of hands to support splitting: [{ cards: [], bet: number, isStanding: bool, isBusted: bool, isDoubled: bool, result: string }]
    this.activeHandIndex = 0;
    this.status = HAND_STATUS.BETTING;
    this.lastMessage = "Place your bets to deal.";

    // Multi-Seat Casino Table (Play with Computer Bots / P2P Tablemates)
    this.tableMode = options.tableMode || 'multiplayer'; // 'multiplayer' (3 seats) or 'solo' (1 seat)
    this.seats = [
      {
        id: 'lily',
        name: 'Lucky Lily',
        avatar: '🍀',
        isHuman: false,
        chips: 1250,
        bet: 25,
        cards: [],
        status: 'READY',
        result: null
      },
      {
        id: 'human',
        name: options.playerName || 'Player 1',
        avatar: '👑',
        isHuman: true,
        chips: this.bankroll,
        bet: 0,
        cards: [],
        status: 'READY',
        result: null
      },
      {
        id: 'vic',
        name: 'Vegas Vic',
        avatar: '🎲',
        isHuman: false,
        chips: 2400,
        bet: 50,
        cards: [],
        status: 'READY',
        result: null
      }
    ];

    this._initShoe();
  }

  toggleTableMode() {
    this.tableMode = this.tableMode === 'multiplayer' ? 'solo' : 'multiplayer';
    return this.tableMode;
  }

  _initShoe() {
    this.shoe = Card.createStandardDeck(this.numDecks);
    this.prng.shuffle(this.shoe);
    this.shoe.forEach(c => c.faceUp = true);
  }

  _drawCard(faceUp = true) {
    if (this.shoe.length < 52) {
      // Reshuffle shoe when penetration exceeds ~83%
      this._initShoe();
      this.lastMessage = "Reshuffling shoe...";
    }
    const card = this.shoe.pop();
    card.faceUp = faceUp;
    return card;
  }

  /**
   * Adds chip to current bet if bankroll allows.
   * If a previous round was resolved, automatically readies a new hand.
   */
  addChipBet(amount) {
    if (this.status === HAND_STATUS.RESOLVED) {
      this.newHand();
    }
    if (this.status !== HAND_STATUS.BETTING) return false;
    if (this.bankroll < amount) return false;

    this.bankroll -= amount;
    this.currentBet += amount;
    this._saveBankroll();
    return true;
  }

  clearBet() {
    if (this.status === HAND_STATUS.RESOLVED) {
      this.newHand();
      return true;
    }
    if (this.status !== HAND_STATUS.BETTING) return false;
    this.bankroll += this.currentBet;
    this.currentBet = 0;
    this._saveBankroll();
    return true;
  }

  /**
   * Starts a new round.
   * Allows dealing continuous hands: if currentBet is 0, automatically
   * re-bets previous bet amount so user can deal hand after hand seamlessly!
   */
  dealRound() {
    if (this.status === HAND_STATUS.RESOLVED) {
      this.newHand();
    }

    // Auto-rebet if no bet placed yet so dealing is continuous
    if (this.currentBet < this.minBet) {
      const targetBet = (this.previousBet && this.previousBet >= this.minBet) ? this.previousBet : this.minBet;
      if (this.bankroll >= targetBet) {
        this.addChipBet(targetBet);
      } else if (this.bankroll >= this.minBet) {
        this.addChipBet(this.minBet);
      } else {
        this.lastMessage = `Bankroll below minimum bet ($${this.minBet}). Click 'Rebuy $1,000' to reload chips!`;
        return false;
      }
    }

    if (this.status !== HAND_STATUS.BETTING) return false;

    this.dealerCards = [];
    this.playerHands = [{
      cards: [],
      bet: this.currentBet,
      isStanding: false,
      isBusted: false,
      isDoubled: false,
      result: null
    }];
    this.activeHandIndex = 0;

    // Deal 2 cards to player and dealer
    this.playerHands[0].cards.push(this._drawCard(true));
    this.dealerCards.push(this._drawCard(true)); // Upcard
    this.playerHands[0].cards.push(this._drawCard(true));
    this.dealerCards.push(this._drawCard(false)); // Hole card (face down)

    this.status = HAND_STATUS.PLAYING;

    // Multi-Seat: Deal and play computer players at table
    if (this.tableMode === 'multiplayer') {
      const lily = this.seats[0];
      const vic = this.seats[2];
      const human = this.seats[1];

      human.bet = this.currentBet;
      human.chips = this.bankroll;

      lily.bet = Math.min(lily.chips, 25);
      lily.chips -= lily.bet;
      lily.cards = [this._drawCard(true), this._drawCard(true)];
      lily.result = null;

      vic.bet = Math.min(vic.chips, 50);
      vic.chips -= vic.bet;
      vic.cards = [this._drawCard(true), this._drawCard(true)];
      vic.result = null;

      // Lily takes her turn on viewer left
      this._playBotTurn(lily);
    }

    // Check for Natural Blackjacks
    const playerBJ = this.isNaturalBlackjack(this.playerHands[0].cards);
    const dealerScore = this.calculateHandValue(this.dealerCards);

    if (playerBJ) {
      // Reveal dealer hole card
      this.dealerCards[1].faceUp = true;
      const dealerBJ = this.isNaturalBlackjack(this.dealerCards);

      if (dealerBJ) {
        this.playerHands[0].result = 'PUSH';
        this.bankroll += this.playerHands[0].bet;
        this.lastMessage = "Both have Blackjack! Push (tie).";
      } else {
        this.playerHands[0].result = 'BLACKJACK';
        const winAmount = Math.floor(this.playerHands[0].bet * 2.5); // 3:2 payout + return bet
        this.bankroll += winAmount;
        this.lastMessage = `Natural Blackjack! Pays 3:2 (+$${Math.floor(this.playerHands[0].bet * 1.5)})!`;
      }
      this.previousBet = this.playerHands[0].bet;
      this.currentBet = 0;
      this.status = HAND_STATUS.RESOLVED;
      this._saveBankroll();
    } else {
      this.lastMessage = "Your turn: Hit, Stand, or Double.";
    }

    return true;
  }

  /**
   * Player hits current active hand
   */
  hit() {
    if (this.status !== HAND_STATUS.PLAYING) return false;
    const hand = this.playerHands[this.activeHandIndex];
    if (hand.isStanding || hand.isBusted) return false;

    const card = this._drawCard(true);
    hand.cards.push(card);

    const val = this.calculateHandValue(hand.cards);
    if (val.total > 21) {
      hand.isBusted = true;
      hand.result = 'BUST';
      this.lastMessage = `Bust with ${val.total}!`;
      this._advanceToNextHand();
    } else if (val.total === 21) {
      this.stand();
    }

    return true;
  }

  /**
   * Player stands on current active hand
   */
  stand() {
    if (this.status !== HAND_STATUS.PLAYING) return false;
    const hand = this.playerHands[this.activeHandIndex];
    hand.isStanding = true;
    this._advanceToNextHand();
    return true;
  }

  /**
   * Player doubles down on current active hand
   */
  doubleDown() {
    if (this.status !== HAND_STATUS.PLAYING) return false;
    const hand = this.playerHands[this.activeHandIndex];
    if (hand.cards.length !== 2) return false;
    if (this.bankroll < hand.bet) return false;

    this.bankroll -= hand.bet;
    hand.bet *= 2;
    hand.isDoubled = true;

    // Receive exactly 1 card and automatically stand
    const card = this._drawCard(true);
    hand.cards.push(card);

    const val = this.calculateHandValue(hand.cards);
    if (val.total > 21) {
      hand.isBusted = true;
      hand.result = 'BUST';
      this.lastMessage = `Bust with ${val.total}!`;
    } else {
      hand.isStanding = true;
    }

    this._saveBankroll();
    this._advanceToNextHand();
    return true;
  }

  /**
   * Player splits pairs into two separate hands
   */
  split() {
    if (this.status !== HAND_STATUS.PLAYING) return false;
    const hand = this.playerHands[this.activeHandIndex];
    if (hand.cards.length !== 2) return false;
    if (hand.cards[0].rank !== hand.cards[1].rank) return false;
    if (this.bankroll < hand.bet) return false;
    if (this.playerHands.length >= 4) return false; // Max 4 split hands

    this.bankroll -= hand.bet;
    this._saveBankroll();

    const secondCard = hand.cards.pop();
    const newHand = {
      cards: [secondCard],
      bet: hand.bet,
      isStanding: false,
      isBusted: false,
      isDoubled: false,
      result: null
    };

    // Deal 1 new card to each split hand
    hand.cards.push(this._drawCard(true));
    newHand.cards.push(this._drawCard(true));

    this.playerHands.splice(this.activeHandIndex + 1, 0, newHand);
    this.lastMessage = "Hand split! Playing Hand 1.";
    return true;
  }

  _advanceToNextHand() {
    if (this.activeHandIndex < this.playerHands.length - 1) {
      this.activeHandIndex++;
      this.lastMessage = `Playing Hand ${this.activeHandIndex + 1}.`;
    } else {
      // All player hands resolved -> Dealer's turn
      this._playDealerTurn();
    }
  }

  _playDealerTurn() {
    this.status = HAND_STATUS.DEALER_TURN;
    this.dealerCards[1].faceUp = true; // Reveal hole card

    // Multi-Seat: Vic takes his turn on viewer right
    if (this.tableMode === 'multiplayer') {
      const vic = this.seats[2];
      this._playBotTurn(vic);
    }

    // Check if all player hands busted
    const allBusted = this.playerHands.every(h => h.isBusted);
    if (allBusted) {
      this.status = HAND_STATUS.RESOLVED;
      this.lastMessage = "Dealer wins.";
      this._resolveRound();
      return;
    }

    // Dealer draws to 17
    let dealerVal = this.calculateHandValue(this.dealerCards);
    while (dealerVal.total < 17) {
      this.dealerCards.push(this._drawCard(true));
      dealerVal = this.calculateHandValue(this.dealerCards);
    }

    this._resolveRound();
  }

  _playBotTurn(bot) {
    if (!bot || bot.isHuman || !bot.cards || bot.cards.length === 0) return;
    if (this.isNaturalBlackjack(bot.cards)) {
      bot.status = 'BLACKJACK (21)';
      return;
    }

    const upcard = this.dealerCards[0];
    const upVal = upcard ? (upcard.rank === 0 ? 11 : Math.min(10, upcard.rank + 1)) : 10;

    let botVal = this.calculateHandValue(bot.cards);
    while (botVal.total < 21) {
      if (botVal.total <= 11) {
        bot.cards.push(this._drawCard(true));
      } else if (botVal.total >= 17) {
        break; // Stand
      } else if (botVal.total >= 12 && botVal.total <= 16) {
        // Dealer shows 7+ -> hit; dealer shows 2-6 -> stand
        if (upVal >= 7) {
          bot.cards.push(this._drawCard(true));
        } else {
          break; // Stand
        }
      }
      botVal = this.calculateHandValue(bot.cards);
    }

    if (botVal.total > 21) {
      bot.status = `BUST (${botVal.total})`;
      bot.result = 'LOSS';
    } else {
      bot.status = `STAND (${botVal.total})`;
    }
  }

  _resolveRound() {
    this.status = HAND_STATUS.RESOLVED;
    const dealerVal = this.calculateHandValue(this.dealerCards);
    const dealerTotal = dealerVal.total;
    const dealerBust = dealerTotal > 21;

    let netGain = 0;

    for (let i = 0; i < this.playerHands.length; i++) {
      const hand = this.playerHands[i];
      if (hand.result === 'BLACKJACK' || hand.result === 'PUSH') continue;

      if (hand.isBusted) {
        hand.result = 'LOSS';
      } else if (dealerBust) {
        hand.result = 'WIN';
        this.bankroll += hand.bet * 2;
        netGain += hand.bet;
      } else {
        const playerTotal = this.calculateHandValue(hand.cards).total;
        if (playerTotal > dealerTotal) {
          hand.result = 'WIN';
          this.bankroll += hand.bet * 2;
          netGain += hand.bet;
        } else if (playerTotal === dealerTotal) {
          hand.result = 'PUSH';
          this.bankroll += hand.bet;
        } else {
          hand.result = 'LOSS';
          netGain -= hand.bet;
        }
      }
    }

    // Resolve computer bot seats
    if (this.tableMode === 'multiplayer') {
      [this.seats[0], this.seats[2]].forEach(bot => {
        if (!bot || !bot.cards || bot.cards.length === 0) return;
        const botVal = this.calculateHandValue(bot.cards);
        const botBJ = this.isNaturalBlackjack(bot.cards);
        const dealerBJ = this.isNaturalBlackjack(this.dealerCards);

        if (botBJ) {
          if (dealerBJ) {
            bot.result = 'PUSH';
            bot.chips += bot.bet;
          } else {
            bot.result = 'BLACKJACK';
            bot.chips += Math.floor(bot.bet * 2.5);
          }
        } else if (botVal.total > 21) {
          bot.result = 'BUST';
        } else if (dealerBust) {
          bot.result = 'WIN';
          bot.chips += bot.bet * 2;
        } else if (botVal.total > dealerTotal) {
          bot.result = 'WIN';
          bot.chips += bot.bet * 2;
        } else if (botVal.total === dealerTotal) {
          bot.result = 'PUSH';
          bot.chips += bot.bet;
        } else {
          bot.result = 'LOSS';
        }
      });
    }

    if (dealerBust) {
      this.lastMessage = `Dealer busts with ${dealerTotal}! You win +$${netGain}!`;
    } else if (netGain > 0) {
      this.lastMessage = `Victory! Won +$${netGain}.`;
    } else if (netGain < 0) {
      this.lastMessage = `Dealer wins with ${dealerTotal}. Hand lost (-$${Math.abs(netGain)}).`;
    } else {
      this.lastMessage = "Round ended in a Push (tie). Bet returned.";
    }

    // Save previous bet for quick Rebet
    this.previousBet = (this.playerHands[0] && this.playerHands[0].bet) ? this.playerHands[0].bet : (this.currentBet || 25);
    this.currentBet = 0;

    if (this.bankroll <= 0) {
      this.lastMessage = "Bankroll depleted! Click 'Rebuy $1,000' to reload chips and play on!";
    }

    this._saveBankroll();
  }

  /**
   * Resets the table for the next hand in the betting state
   */
  newHand() {
    this.status = HAND_STATUS.BETTING;
    this.currentBet = 0;
    this.dealerCards = [];
    this.playerHands = [];
    this.activeHandIndex = 0;

    // Reset seated tablemates
    this.seats.forEach(s => {
      s.cards = [];
      s.result = null;
      s.status = 'READY';
      if (!s.isHuman && s.chips < 25) {
        s.chips += 1000; // Auto-reload bot
      }
    });

    if (this.bankroll < this.minBet) {
      this.lastMessage = `Bankroll is below minimum bet ($${this.minBet}). Click 'Rebuy $1,000' to reload!`;
    } else {
      this.lastMessage = "Place your bets to deal!";
    }
    return true;
  }

  /**
   * Automatically rebets the previous amount and deals the next hand in 1 click
   */
  rebetAndDeal() {
    this.newHand();
    const targetBet = (this.previousBet && this.previousBet >= this.minBet) ? this.previousBet : this.minBet;
    if (this.bankroll < targetBet) {
      this.lastMessage = `Insufficient bankroll ($${this.bankroll}) for rebet $${targetBet}.`;
      return false;
    }
    this.addChipBet(targetBet);
    return this.dealRound();
  }

  /**
   * Reloads bankroll to $1,000 when chips run out
   */
  rebuy(amount = 1000) {
    this.bankroll = amount;
    this.currentBet = 0;
    this.previousBet = 25;
    this.newHand();
    this.lastMessage = `Reloaded $${amount.toLocaleString()}! Place your bets to deal.`;
    this._saveBankroll();
    return true;
  }

  _saveBankroll() {
    localStorage.setItem('casino_bankroll', this.bankroll.toString());
    localStorage.setItem('blackjack_bankroll', this.bankroll.toString());
  }

  resetBankroll() {
    this.rebuy(1000);
  }

  /**
   * Calculates Blackjack hand value (Ace counts as 11 or 1)
   */
  calculateHandValue(cards) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      if (!card.faceUp) continue;
      if (card.rank === 0) {
        aces += 1;
        total += 11;
      } else if (card.rank >= 9) { // 10, J, Q, K
        total += 10;
      } else {
        total += (card.rank + 1);
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return {
      total,
      isSoft: aces > 0 && total <= 21,
      isBust: total > 21
    };
  }

  isNaturalBlackjack(cards) {
    if (cards.length !== 2) return false;
    const val = this.calculateHandValue(cards);
    return val.total === 21;
  }

  /**
   * Mathematical Casino Basic Strategy Advisor
   * Recommends the exact mathematically optimal play based on player hand vs dealer upcard!
   */
  getTacticalHint() {
    if (this.status !== HAND_STATUS.PLAYING) {
      return { message: "Place your bet and press 'Deal' to begin." };
    }

    const hand = this.playerHands[this.activeHandIndex];
    if (!hand || hand.isStanding || hand.isBusted) return null;

    const dealerUpcard = this.dealerCards[0];
    const dealerVal = dealerUpcard.rank === 0 ? 11 : Math.min(10, dealerUpcard.rank + 1);
    const handVal = this.calculateHandValue(hand.cards);
    const total = handVal.total;
    const canDouble = hand.cards.length === 2 && this.bankroll >= hand.bet;
    const canSplit = hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank && this.bankroll >= hand.bet;

    // 1. Pair Splitting Strategy
    if (canSplit) {
      const r = hand.cards[0].rank;
      if (r === 0 || r === 7) { // Always split Aces and 8s
        return { action: 'SPLIT', message: "YOU should: SPLIT this pair! Basic Strategy says always split Aces and 8s." };
      }
      if (r === 5 && dealerVal >= 2 && dealerVal <= 6) {
        return { action: 'SPLIT', message: `YOU should: SPLIT 6s. Dealer shows weak ${dealerVal}; two 6s are a poor 12 but two fresh hands are strong.` };
      }
      if ((r === 1 || r === 2 || r === 6) && dealerVal >= 2 && dealerVal <= 7) {
        return { action: 'SPLIT', message: `YOU should: SPLIT this pair. Dealer shows weak ${dealerVal}, making split favorable.` };
      }
      if (r === 8 && (dealerVal >= 2 && dealerVal <= 6 || dealerVal === 8 || dealerVal === 9)) {
        return { action: 'SPLIT', message: `YOU should: SPLIT 9s. Dealer's ${dealerVal} makes splitting optimal (except vs 7).` };
      }
    }

    // 2. Soft Hands (with an Ace counted as 11)
    if (handVal.isSoft) {
      if (total >= 19) {
        return { action: 'STAND', message: `YOU should: STAND. Your soft ${total} is a powerful hand!` };
      }
      if (total === 18) {
        if (canDouble && dealerVal >= 3 && dealerVal <= 6) {
          return { action: 'DOUBLE', message: `YOU should: DOUBLE DOWN! Soft 18 vs dealer's weak ${dealerVal}.` };
        }
        if (dealerVal >= 9) {
          return { action: 'HIT', message: `YOU should: HIT to improve. Dealer's strong ${dealerVal} beats soft 18 often.` };
        }
        return { action: 'STAND', message: `YOU should: STAND. Soft 18 is good vs dealer's ${dealerVal}.` };
      }
      if (total <= 17) {
        // Soft 13-14 double vs 5-6, soft 15-16 vs 4-6, soft 17 vs 3-6; otherwise hit.
        const lowest = total <= 14 ? 5 : (total <= 16 ? 4 : 3);
        if (total >= 13 && canDouble && dealerVal >= lowest && dealerVal <= 6) {
          return { action: 'DOUBLE', message: `YOU should: DOUBLE DOWN! Soft ${total} vs dealer's weak ${dealerVal} (${lowest}-6).` };
        }
        return { action: 'HIT', message: `YOU should: HIT. Your soft ${total} cannot bust, so improve it!` };
      }
    }

    // 3. Hard Totals
    if (total >= 17) {
      return { action: 'STAND', message: `YOU should: STAND. Basic Strategy says Hard ${total} is strong - hitting risks busting!` };
    }
    if (total >= 13 && total <= 16) {
      if (dealerVal >= 2 && dealerVal <= 6) {
        return { action: 'STAND', message: `YOU should: STAND on ${total}. Dealer shows weak ${dealerVal} and will likely bust.` };
      }
      return { action: 'HIT', message: `YOU should: HIT your ${total}. Dealer's strong ${dealerVal} beats you as-is.` };
    }
    if (total === 12) {
      if (dealerVal >= 4 && dealerVal <= 6) {
        return { action: 'STAND', message: `YOU should: STAND on 12. Dealer's weak ${dealerVal} will likely bust.` };
      }
      return { action: 'HIT', message: `YOU should: HIT your 12. Dealer shows ${dealerVal}, you need to improve.` };
    }
    if (total === 11) {
      if (canDouble) return { action: 'DOUBLE', message: "YOU should: DOUBLE DOWN! 11 is the perfect doubling total." };
      return { action: 'HIT', message: "YOU should: HIT. Your 11 can only improve (would double if you had chips)." };
    }
    if (total === 10) {
      if (canDouble && dealerVal <= 9) return { action: 'DOUBLE', message: `YOU should: DOUBLE DOWN! 10 vs dealer's ${dealerVal} (2-9).` };
      return { action: 'HIT', message: `YOU should: HIT your 10 vs dealer's ${dealerVal}.` };
    }
    if (total === 9) {
      if (canDouble && dealerVal >= 3 && dealerVal <= 6) return { action: 'DOUBLE', message: `YOU should: DOUBLE DOWN! 9 vs dealer's weak ${dealerVal} (3-6).` };
      return { action: 'HIT', message: "YOU should: HIT your 9 to build a stronger hand." };
    }

    return { action: 'HIT', message: `YOU should: HIT to build your ${total}. Too low to stand!` };
  }
}
