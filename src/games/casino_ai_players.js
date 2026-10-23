/**
 * Solitaire Sovereign - Casino AI Players & Table Opponents
 *
 * Provides realistic computer opponents for casino games:
 * - Blackjack: Multi-seat table with 1-6 AI players
 * - Poker: Texas Hold'em table opponents with varying play styles
 * - Casino Duels: Competitive AI for P2P casino challenges
 *
 * Features:
 * - Diverse personalities (Conservative, Aggressive, Optimal, Recreational)
 * - Basic Strategy adherence for Blackjack
 * - Variable skill levels (0.60 - 0.95)
 * - Realistic betting patterns and decision timing
 * - Chat/emote system for immersion
 */

export const AI_PLAYER_PERSONALITIES = {
  CONSERVATIVE: 'conservative',
  OPTIMAL: 'optimal',
  AGGRESSIVE: 'aggressive',
  RECREATIONAL: 'recreational',
  CARD_COUNTER: 'card_counter'
};

/**
 * Casino AI Player Roster - Diverse characters for table games
 */
export const CASINO_AI_ROSTER = [
  {
    name: 'Lucky Lucy',
    avatar: '🍀',
    personality: AI_PLAYER_PERSONALITIES.RECREATIONAL,
    skill: 0.62,
    skillLevel: 'Casual',
    description: 'Plays for fun, follows hunches, occasional basic strategy deviations.',
    bettingStyle: 'flat', // Always bets the same amount
    chatty: true,
    catchphrases: ['Feeling lucky!', 'Here goes nothing!', 'Lady luck is with me!']
  },
  {
    name: 'Steady Steve',
    avatar: '📊',
    personality: AI_PLAYER_PERSONALITIES.CONSERVATIVE,
    skill: 0.72,
    skillLevel: 'Intermediate',
    description: 'Conservative player, strict basic strategy, minimal risk.',
    bettingStyle: 'conservative', // Small, safe bets
    chatty: false,
    catchphrases: ['Play the odds.', 'Steady wins.', 'Never chase losses.']
  },
  {
    name: 'Ace Anderson',
    avatar: '🎯',
    personality: AI_PLAYER_PERSONALITIES.OPTIMAL,
    skill: 0.88,
    skillLevel: 'Expert',
    description: 'Mathematically optimal play, perfect basic strategy execution.',
    bettingStyle: 'optimal', // Adjusts bet size based on count/advantage
    chatty: false,
    catchphrases: ['Math doesn\'t lie.', 'Expected value.', 'Playing the percentages.']
  },
  {
    name: 'High Roller Harry',
    avatar: '💎',
    personality: AI_PLAYER_PERSONALITIES.AGGRESSIVE,
    skill: 0.78,
    skillLevel: 'Advanced',
    description: 'Aggressive betting, takes risks, doubles and splits frequently.',
    bettingStyle: 'aggressive', // Large bets, progressive betting
    chatty: true,
    catchphrases: ['Go big or go home!', 'Double it!', 'All in!']
  },
  {
    name: 'Card Shark Clara',
    avatar: '🦈',
    personality: AI_PLAYER_PERSONALITIES.CARD_COUNTER,
    skill: 0.94,
    skillLevel: 'Master',
    description: 'Elite player with card counting, varies bet based on true count.',
    bettingStyle: 'advantage', // Counts cards, varies bets with advantage
    chatty: false,
    catchphrases: ['The count is hot.', 'Deck is rich.', 'Mathematical advantage.']
  },
  {
    name: 'Friendly Frank',
    avatar: '😊',
    personality: AI_PLAYER_PERSONALITIES.RECREATIONAL,
    skill: 0.68,
    skillLevel: 'Novice',
    description: 'Social player, enjoys the game, makes occasional mistakes.',
    bettingStyle: 'flat',
    chatty: true,
    catchphrases: ['Good luck everyone!', 'Nice hand!', 'Dealer\'s looking tough!']
  }
];

/**
 * Casino AI Player - Makes decisions for casino table games
 */
export class CasinoAIPlayer {
  constructor(profile = null) {
    if (!profile) {
      // Random AI from roster
      profile = CASINO_AI_ROSTER[Math.floor(Math.random() * CASINO_AI_ROSTER.length)];
    }

    this.name = profile.name;
    this.avatar = profile.avatar;
    this.personality = profile.personality;
    this.skill = profile.skill;
    this.skillLevel = profile.skillLevel;
    this.description = profile.description;
    this.bettingStyle = profile.bettingStyle;
    this.chatty = profile.chatty;
    this.catchphrases = profile.catchphrases || [];

    this.chips = 1000;
    this.currentBet = 0;
    this.isBot = true;
    this.runningCount = 0; // For card counting personalities
    this.decksRemaining = 6;
  }

  /**
   * Determines bet size for Blackjack based on personality and bankroll
   */
  decideBetSize(minBet = 5, maxBet = 500) {
    const bankrollPercent = this.chips / 1000;

    switch (this.bettingStyle) {
      case 'flat':
        // Always bet the minimum
        return Math.max(minBet, Math.min(minBet * 2, this.chips));

      case 'conservative':
        // Bet 1-2% of bankroll
        const conservativeBet = Math.floor(this.chips * 0.015);
        return Math.max(minBet, Math.min(conservativeBet, maxBet, this.chips));

      case 'aggressive':
        // Bet 5-10% of bankroll, more when winning
        const aggressiveBet = Math.floor(this.chips * (bankrollPercent > 1.5 ? 0.10 : 0.05));
        return Math.max(minBet, Math.min(aggressiveBet, maxBet, this.chips));

      case 'optimal':
        // Kelly Criterion approximation: bet based on perceived advantage
        const optimalBet = Math.floor(this.chips * 0.02);
        return Math.max(minBet, Math.min(optimalBet, maxBet, this.chips));

      case 'advantage':
        // Card counting: vary bet with true count
        const trueCount = this.getTrueCount();
        let advantage = 0;
        if (trueCount >= 2) advantage = 0.05;
        if (trueCount >= 3) advantage = 0.10;
        if (trueCount >= 4) advantage = 0.15;

        let countBet = trueCount > 1 ? Math.floor(this.chips * advantage) : minBet;
        return Math.max(minBet, Math.min(countBet, maxBet, this.chips));

      default:
        return minBet;
    }
  }

  /**
   * Blackjack Basic Strategy Decision Engine
   * @param {Array} hand - Player's cards
   * @param {Card} dealerUpcard - Dealer's visible card
   * @param {boolean} canDouble - Can player double down
   * @param {boolean} canSplit - Can player split
   * @returns {string} 'HIT', 'STAND', 'DOUBLE', 'SPLIT'
   */
  decideBlackjackAction(hand, dealerUpcard, canDouble = true, canSplit = true) {
    const handValue = this._calculateHandValue(hand);
    const dealerRank = dealerUpcard.rank;
    const isPair = hand.length === 2 && hand[0].rank === hand[1].rank;

    // Add skill-based mistakes for non-optimal players
    const makesOptimalPlay = Math.random() < this.skill;

    if (!makesOptimalPlay && this.personality !== AI_PLAYER_PERSONALITIES.OPTIMAL) {
      // Occasional deviation from basic strategy
      if (Math.random() < 0.15) {
        // Recreational mistake: hit on stiff hands against dealer bust cards
        if (handValue.total >= 12 && handValue.total <= 16 && dealerRank >= 2 && dealerRank <= 6) {
          if (Math.random() < 0.3) return 'HIT';
        }
      }
    }

    // Pair Splitting Strategy
    if (isPair && canSplit && hand.length === 2) {
      const pairRank = hand[0].rank;

      // Always split Aces and 8s
      if (pairRank === 0 || pairRank === 7) return 'SPLIT'; // Aces or 8s

      // Never split 10s, 5s, or 4s
      if (pairRank === 9 || pairRank === 4 || pairRank === 3) return 'STAND'; // 10s (treat as 20)
      if (pairRank === 5 || pairRank === 4) {
        // Treat 5-5 as 10, check double down
      } else {
        // Other pairs: split against dealer 2-6
        if (dealerRank >= 2 && dealerRank <= 5) return 'SPLIT';
      }
    }

    // Soft Hand Strategy (contains Ace counted as 11)
    if (handValue.isSoft) {
      // Soft 19-21: Always stand
      if (handValue.total >= 19) return 'STAND';

      // Soft 18: Stand vs 2-8, hit vs 9-A
      if (handValue.total === 18) {
        if (dealerRank >= 8 || dealerRank === 0) return 'HIT';
        if (canDouble && hand.length === 2 && (dealerRank >= 2 && dealerRank <= 6)) {
          return 'DOUBLE';
        }
        return 'STAND';
      }

      // Soft 17 or less: Double vs dealer 4-6, otherwise hit
      if (canDouble && hand.length === 2 && dealerRank >= 3 && dealerRank <= 5) {
        return 'DOUBLE';
      }
      return 'HIT';
    }

    // Hard Hand Strategy

    // Hard 17+: Always stand
    if (handValue.total >= 17) return 'STAND';

    // Hard 11: Always double if possible, otherwise hit
    if (handValue.total === 11) {
      return (canDouble && hand.length === 2) ? 'DOUBLE' : 'HIT';
    }

    // Hard 10: Double vs dealer 2-9, hit vs 10/A
    if (handValue.total === 10) {
      if (canDouble && hand.length === 2 && dealerRank >= 2 && dealerRank <= 8) {
        return 'DOUBLE';
      }
      return 'HIT';
    }

    // Hard 9: Double vs dealer 3-6, otherwise hit
    if (handValue.total === 9) {
      if (canDouble && hand.length === 2 && dealerRank >= 2 && dealerRank <= 5) {
        return 'DOUBLE';
      }
      return 'HIT';
    }

    // Hard 12-16 (Stiff hands)
    if (handValue.total >= 12 && handValue.total <= 16) {
      // Stand vs dealer 2-6 (dealer bust cards)
      if (dealerRank >= 2 && dealerRank <= 5) return 'STAND';
      // Hit vs dealer 7-A (dealer likely has 17+)
      return 'HIT';
    }

    // Hard 11 or less: Always hit
    return 'HIT';
  }

  /**
   * Updates running count for card counters (Hi-Lo system)
   */
  updateCount(cards) {
    if (this.personality !== AI_PLAYER_PERSONALITIES.CARD_COUNTER) return;

    for (const card of cards) {
      const rank = card.rank;
      // Hi-Lo: 2-6 = +1, 7-9 = 0, 10-A = -1
      if (rank >= 1 && rank <= 5) this.runningCount += 1; // 2-6
      else if (rank >= 9 || rank === 0) this.runningCount -= 1; // 10-A
    }
  }

  getTrueCount() {
    if (this.decksRemaining <= 0) return 0;
    return this.runningCount / this.decksRemaining;
  }

  resetCount() {
    this.runningCount = 0;
    this.decksRemaining = 6;
  }

  /**
   * Says a random catchphrase if chatty
   */
  sayPhrase() {
    if (!this.chatty || this.catchphrases.length === 0) return null;
    if (Math.random() < 0.20) { // 20% chance to speak
      return this.catchphrases[Math.floor(Math.random() * this.catchphrases.length)];
    }
    return null;
  }

  /**
   * Internal helper to calculate hand value for decision making
   */
  _calculateHandValue(cards) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      const rank = card.rank;
      if (rank === 0) { // Ace
        aces++;
        total += 11;
      } else if (rank >= 9) { // 10, J, Q, K
        total += 10;
      } else {
        total += rank + 1; // 2-9
      }
    }

    // Adjust for Aces
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return {
      total,
      isSoft: aces > 0
    };
  }

  /**
   * Rebuys chips when busted
   */
  rebuy(amount = 1000) {
    this.chips = amount;
  }
}

/**
 * Casino Table Manager - Manages AI players at casino tables
 */
export class CasinoTableManager {
  constructor(options = {}) {
    this.maxSeats = options.maxSeats || 6; // Blackjack: up to 6 players
    this.minBet = options.minBet || 5;
    this.maxBet = options.maxBet || 500;
    this.humanPlayer = options.humanPlayer || null;
    this.aiPlayers = [];
    this.enableAutoFill = options.enableAutoFill !== false; // Auto-fill empty seats by default
  }

  /**
   * Fills empty seats with AI players
   * @param {number} targetCount - Number of total players desired (including human)
   */
  fillEmptySeats(targetCount = null) {
    if (!this.enableAutoFill) return;

    const currentPlayers = this.aiPlayers.length + (this.humanPlayer ? 1 : 0);
    const target = targetCount || this.maxSeats;
    const seatsToFill = Math.max(0, Math.min(target - currentPlayers, this.maxSeats - currentPlayers));

    // Select diverse AI players from roster
    const availableProfiles = [...CASINO_AI_ROSTER];
    const selectedProfiles = [];

    for (let i = 0; i < seatsToFill; i++) {
      if (availableProfiles.length === 0) break;
      const randomIndex = Math.floor(Math.random() * availableProfiles.length);
      const profile = availableProfiles.splice(randomIndex, 1)[0];
      selectedProfiles.push(profile);
    }

    // Create AI players
    for (const profile of selectedProfiles) {
      const ai = new CasinoAIPlayer(profile);
      this.aiPlayers.push(ai);
    }

    return this.aiPlayers;
  }

  /**
   * Gets all players at the table (human + AI)
   */
  getAllPlayers() {
    const players = [];
    if (this.humanPlayer) players.push(this.humanPlayer);
    players.push(...this.aiPlayers);
    return players;
  }

  /**
   * Removes AI players who have busted out
   */
  removeAIPlayersByBankroll(minChips = 5) {
    this.aiPlayers = this.aiPlayers.filter(ai => ai.chips >= minChips);
  }

  /**
   * Clears all AI players from the table
   */
  clearAIPlayers() {
    this.aiPlayers = [];
  }

  /**
   * Gets a random AI player from the roster
   */
  static getRandomAI() {
    const profile = CASINO_AI_ROSTER[Math.floor(Math.random() * CASINO_AI_ROSTER.length)];
    return new CasinoAIPlayer(profile);
  }
}
