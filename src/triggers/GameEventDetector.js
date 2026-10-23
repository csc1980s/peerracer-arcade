/**
 * GameEventDetector - Detects celebration-worthy events in solitaire gameplay
 * Victorian Christmas Solitaire - Card Celebration System
 */

export class GameEventDetector {
  constructor() {
    this.moveHistory = [];
    this.consecutiveGoodMoves = 0;
    this.suitSequences = {
      hearts: [],
      diamonds: [],
      spades: [],
      clubs: []
    };
    this.foundationCards = {
      hearts: [],
      diamonds: [],
      spades: [],
      clubs: []
    };
    this.lastCelebration = null;
    this.celebrationCooldown = 1000; // ms between celebrations
  }

  /**
   * Main event detection method - call this after each card move
   * @param {Object} move - Move information {card, fromPile, toPile, timestamp}
   * @returns {Object|null} Celebration event or null
   */
  detectCelebration(move) {
    const { card, fromPile, toPile, timestamp } = move;

    // Check cooldown
    if (this.lastCelebration &&
        (timestamp - this.lastCelebration) < this.celebrationCooldown) {
      return null;
    }

    // Update move history
    this.moveHistory.push(move);
    if (this.moveHistory.length > 10) {
      this.moveHistory.shift(); // Keep last 10 moves
    }

    // Priority order of celebration checks:
    // 1. Game won (highest priority)
    if (this.isGameWon()) {
      return this.createCelebrationEvent('win_game', card, {
        moveCount: this.moveHistory.length,
        perfectGame: this.isPerfectGame()
      });
    }

    // 2. Face card to foundation
    if (toPile.type === 'foundation' && this.isFaceCard(card)) {
      return this.detectFaceCardCelebration(card, toPile);
    }

    // 3. Suit sequence completion
    const suitRun = this.detectSuitRun(toPile, card);
    if (suitRun) {
      return this.createCelebrationEvent('suit_combo', card, suitRun);
    }

    // 4. All face cards of a suit
    if (this.allSuitFaceCardsPlaced(card.suit)) {
      return this.createCelebrationEvent('all_face_cards', card, {
        suit: card.suit
      });
    }

    // 5. Good move (low priority, probability-based)
    if (this.isGoodMove(move) && Math.random() < 0.3) {
      return this.createCelebrationEvent('good_move', card, {
        moveType: this.categorizeMove(move)
      });
    }

    return null;
  }

  /**
   * Normalize suit to lowercase string ('clubs', 'diamonds', 'hearts', 'spades')
   */
  _getNormalizedSuit(card) {
    if (!card) return 'hearts';
    if (card.suitName) return card.suitName;
    if (typeof card.suit === 'number') {
      const names = ['clubs', 'diamonds', 'hearts', 'spades'];
      return names[card.suit] || 'hearts';
    }
    return String(card.suit || 'hearts').toLowerCase();
  }

  /**
   * Normalize rank to standard symbol ('A', '2'..'10', 'J', 'Q', 'K')
   */
  _getNormalizedRank(card) {
    if (!card) return '';
    if (card.rankName) return card.rankName;
    if (typeof card.rank === 'number') {
      const names = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      return names[card.rank] || String(card.rank);
    }
    return String(card.rank);
  }

  /**
   * Detect face card celebrations (King, Queen, Jack)
   */
  detectFaceCardCelebration(card, toPile) {
    const rank = this._getNormalizedRank(card);
    const suit = this._getNormalizedSuit(card);

    // Update foundation tracking
    if (!this.foundationCards[suit]) {
      this.foundationCards[suit] = [];
    }
    this.foundationCards[suit].push(card);

    // Determine celebration type
    let celebrationType;
    if (rank === 'K' || card.rank === 12) {
      celebrationType = 'king';
    } else if (rank === 'Q' || card.rank === 11) {
      celebrationType = 'queen';
    } else if (rank === 'J' || card.rank === 10) {
      celebrationType = 'jack';
    } else {
      return null; // Not a face card
    }

    return this.createCelebrationEvent(celebrationType, card, {
      suit: suit,
      foundationProgress: this.foundationCards[suit].length
    });
  }

  /**
   * Detect suit runs (3+ cards of same suit in sequence)
   */
  detectSuitRun(pile, card) {
    if (!pile.cards || pile.cards.length < 3) {
      return null;
    }

    const recentCards = pile.cards.slice(-4); // Check last 4 cards
    let runLength = 1;
    let suit = card.suit;

    // Check if we have a sequence of same suit
    for (let i = recentCards.length - 2; i >= 0; i--) {
      if (recentCards[i].suit === suit) {
        runLength++;
      } else {
        break;
      }
    }

    if (runLength >= 3) {
      return {
        suit: suit,
        length: runLength,
        cards: recentCards.slice(-runLength),
        triggerType: `${suit}_suit_run`
      };
    }

    return null;
  }

  /**
   * Check if all face cards of a suit have been placed
   */
  allSuitFaceCardsPlaced(suit) {
    const placed = this.foundationCards[suit] || [];
    const faceCardRanks = ['K', 'Q', 'J'];

    return faceCardRanks.every(rank =>
      placed.some(card => {
        const r = this._getNormalizedRank(card);
        return r === rank;
      })
    );
  }

  /**
   * Check if game is won (all cards to foundation)
   */
  isGameWon() {
    const suits = ['hearts', 'diamonds', 'spades', 'clubs'];

    return suits.every(suit => {
      const foundation = this.foundationCards[suit] || [];
      return foundation.length === 13; // All 13 cards of suit
    });
  }

  /**
   * Check if this was a perfect game (no invalid moves)
   */
  isPerfectGame() {
    // Count invalid move attempts from history
    const invalidMoves = this.moveHistory.filter(m => m.invalid).length;
    return invalidMoves === 0;
  }

  /**
   * Determine if a move is "good" (strategic, helpful)
   */
  isGoodMove(move) {
    const { card, fromPile, toPile } = move;

    // Moving to foundation is always good
    if (toPile.type === 'foundation') {
      this.consecutiveGoodMoves++;
      return true;
    }

    // Flipping a tableau card is good
    if (fromPile.type === 'tableau' && fromPile.topCard?.faceDown) {
      this.consecutiveGoodMoves++;
      return true;
    }

    // Clearing a tableau column is good
    if (fromPile.type === 'tableau' && fromPile.cards.length === 0) {
      this.consecutiveGoodMoves++;
      return true;
    }

    // Ace to foundation is excellent
    if (card.rank === 'A' && toPile.type === 'foundation') {
      this.consecutiveGoodMoves++;
      return true;
    }

    this.consecutiveGoodMoves = 0;
    return false;
  }

  /**
   * Categorize move type for analytics
   */
  categorizeMove(move) {
    const { card, fromPile, toPile } = move;

    if (toPile.type === 'foundation') {
      return card.rank === 'A' ? 'ace_to_foundation' : 'card_to_foundation';
    }

    if (fromPile.type === 'tableau' && fromPile.cards.length === 0) {
      return 'tableau_clear';
    }

    if (fromPile.topCard?.faceDown) {
      return 'card_flip';
    }

    return 'valid_move';
  }

  /**
   * Check if card is a face card (K, Q, J)
   */
  isFaceCard(card) {
    if (!card) return false;
    const r = card.rankName || card.rank;
    return ['K', 'Q', 'J'].includes(r) || [10, 11, 12].includes(card.rank);
  }

  /**
   * Create standardized celebration event object
   */
  createCelebrationEvent(type, card, details = {}) {
    const event = {
      type: type,
      card: card,
      timestamp: Date.now(),
      details: details,
      effectTemplate: this.getEffectTemplate(type, card),
      audioVoice: this.getVoiceType(type, card)
    };

    this.lastCelebration = event.timestamp;
    return event;
  }

  /**
   * Map celebration type to EffectCraft template
   */
  getEffectTemplate(type, card) {
    const suit = this._getNormalizedSuit(card);
    const templates = {
      'king': 'king_celebration',
      'queen': 'queen_celebration',
      'jack': 'jack_celebration',
      'suit_combo': `${suit}_suit_combo`,
      'all_face_cards': `${suit}_suit_combo`,
      'win_game': 'win_game',
      'good_move': 'good_move'
    };

    return templates[type] || 'good_move';
  }

  /**
   * Determine which voice to use for audio
   */
  getVoiceType(type, card) {
    // Face cards use their specific voice
    if (type === 'king') return 'king';
    if (type === 'queen') return 'queen';
    if (type === 'jack') return 'jack';

    // For suit combos, use highest card in sequence
    if (type === 'suit_combo' || type === 'all_face_cards') {
      // Default to queen for suit celebrations
      return 'suit_based';
    }

    // Win game uses random celebration voice
    if (type === 'win_game') {
      return 'random_celebration';
    }

    // Good moves use suit-based selection
    return 'suit_based';
  }

  /**
   * Get celebration statistics
   */
  getStats() {
    return {
      totalMoves: this.moveHistory.length,
      consecutiveGoodMoves: this.consecutiveGoodMoves,
      foundationProgress: {
        hearts: this.foundationCards.hearts?.length || 0,
        diamonds: this.foundationCards.diamonds?.length || 0,
        spades: this.foundationCards.spades?.length || 0,
        clubs: this.foundationCards.clubs?.length || 0
      },
      gameComplete: this.isGameWon(),
      perfectGame: this.isPerfectGame()
    };
  }

  /**
   * Reset detector for new game
   */
  reset() {
    this.moveHistory = [];
    this.consecutiveGoodMoves = 0;
    this.suitSequences = {
      hearts: [],
      diamonds: [],
      spades: [],
      clubs: []
    };
    this.foundationCards = {
      hearts: [],
      diamonds: [],
      spades: [],
      clubs: []
    };
    this.lastCelebration = null;
  }
}

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameEventDetector;
}
