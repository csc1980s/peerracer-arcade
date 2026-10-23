/**
 * TriggerConditions - Defines all celebration trigger conditions
 * Victorian Christmas Solitaire - Card Celebration System
 */

export const TriggerConditions = {
  /**
   * Face Card Triggers
   */
  faceCards: {
    king_placed: {
      name: 'King Placed',
      description: 'King card placed on foundation',
      check: (move, gameState) => {
        return TriggerConditions._normalizeRank(move.card) === 'K' &&
               move.toPile.type === 'foundation';
      },
      priority: 8,
      cooldown: 0
    },

    queen_placed: {
      name: 'Queen Placed',
      description: 'Queen card placed on foundation',
      check: (move, gameState) => {
        return TriggerConditions._normalizeRank(move.card) === 'Q' &&
               move.toPile.type === 'foundation';
      },
      priority: 8,
      cooldown: 0
    },

    jack_placed: {
      name: 'Jack Placed',
      description: 'Jack card placed on foundation',
      check: (move, gameState) => {
        return TriggerConditions._normalizeRank(move.card) === 'J' &&
               move.toPile.type === 'foundation';
      },
      priority: 8,
      cooldown: 0
    },

    king_sequence: {
      name: 'King Sequence',
      description: 'Multiple kings played in succession',
      check: (move, gameState) => {
        const recentMoves = gameState.moveHistory.slice(-3);
        const kingMoves = recentMoves.filter(m =>
          TriggerConditions._normalizeRank(m.card) === 'K' && m.toPile.type === 'foundation'
        );
        return kingMoves.length >= 2;
      },
      priority: 7,
      cooldown: 2000
    },

    queen_sequence: {
      name: 'Queen Sequence',
      description: 'Multiple queens played in succession',
      check: (move, gameState) => {
        const recentMoves = gameState.moveHistory.slice(-3);
        const queenMoves = recentMoves.filter(m =>
          TriggerConditions._normalizeRank(m.card) === 'Q' && m.toPile.type === 'foundation'
        );
        return queenMoves.length >= 2;
      },
      priority: 7,
      cooldown: 2000
    },

    jack_sequence: {
      name: 'Jack Sequence',
      description: 'Multiple jacks played in succession',
      check: (move, gameState) => {
        const recentMoves = gameState.moveHistory.slice(-3);
        const jackMoves = recentMoves.filter(m =>
          TriggerConditions._normalizeRank(m.card) === 'J' && m.toPile.type === 'foundation'
        );
        return jackMoves.length >= 2;
      },
      priority: 7,
      cooldown: 2000
    }
  },

  /**
   * Suit Combo Triggers
   */
  suits: {
    hearts_suit_run: {
      name: 'Hearts Suit Run',
      description: '3+ hearts cards in sequence',
      check: (move, gameState) => {
        return TriggerConditions._checkSuitRun(move, gameState, 'hearts', 3);
      },
      priority: 6,
      cooldown: 3000
    },

    diamonds_suit_run: {
      name: 'Diamonds Suit Run',
      description: '3+ diamonds cards in sequence',
      check: (move, gameState) => {
        return TriggerConditions._checkSuitRun(move, gameState, 'diamonds', 3);
      },
      priority: 6,
      cooldown: 3000
    },

    spades_suit_run: {
      name: 'Spades Suit Run',
      description: '3+ spades cards in sequence',
      check: (move, gameState) => {
        return TriggerConditions._checkSuitRun(move, gameState, 'spades', 3);
      },
      priority: 6,
      cooldown: 3000
    },

    clubs_suit_run: {
      name: 'Clubs Suit Run',
      description: '3+ clubs cards in sequence',
      check: (move, gameState) => {
        return TriggerConditions._checkSuitRun(move, gameState, 'clubs', 3);
      },
      priority: 6,
      cooldown: 3000
    },

    hearts_sequence_complete: {
      name: 'Hearts Sequence Complete',
      description: 'All hearts cards to foundation',
      check: (move, gameState) => {
        return TriggerConditions._checkSuitComplete(gameState, 'hearts');
      },
      priority: 9,
      cooldown: 0
    },

    diamonds_sequence_complete: {
      name: 'Diamonds Sequence Complete',
      description: 'All diamonds cards to foundation',
      check: (move, gameState) => {
        return TriggerConditions._checkSuitComplete(gameState, 'diamonds');
      },
      priority: 9,
      cooldown: 0
    },

    spades_sequence_complete: {
      name: 'Spades Sequence Complete',
      description: 'All spades cards to foundation',
      check: (move, gameState) => {
        return TriggerConditions._checkSuitComplete(gameState, 'spades');
      },
      priority: 9,
      cooldown: 0
    },

    clubs_sequence_complete: {
      name: 'Clubs Sequence Complete',
      description: 'All clubs cards to foundation',
      check: (move, gameState) => {
        return TriggerConditions._checkSuitComplete(gameState, 'clubs');
      },
      priority: 9,
      cooldown: 0
    },

    all_hearts_face_cards: {
      name: 'All Hearts Face Cards',
      description: 'K, Q, J of hearts all placed',
      check: (move, gameState) => {
        return TriggerConditions._checkAllFaceCards(gameState, 'hearts');
      },
      priority: 7,
      cooldown: 0
    },

    all_diamonds_face_cards: {
      name: 'All Diamonds Face Cards',
      description: 'K, Q, J of diamonds all placed',
      check: (move, gameState) => {
        return TriggerConditions._checkAllFaceCards(gameState, 'diamonds');
      },
      priority: 7,
      cooldown: 0
    },

    all_spades_face_cards: {
      name: 'All Spades Face Cards',
      description: 'K, Q, J of spades all placed',
      check: (move, gameState) => {
        return TriggerConditions._checkAllFaceCards(gameState, 'spades');
      },
      priority: 7,
      cooldown: 0
    },

    all_clubs_face_cards: {
      name: 'All Clubs Face Cards',
      description: 'K, Q, J of clubs all placed',
      check: (move, gameState) => {
        return TriggerConditions._checkAllFaceCards(gameState, 'clubs');
      },
      priority: 7,
      cooldown: 0
    }
  },

  /**
   * Game Event Triggers
   */
  gameEvents: {
    game_won: {
      name: 'Game Won',
      description: 'Player wins the game',
      check: (move, gameState) => {
        const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
        return suits.every(suit =>
          gameState.foundationCards[suit]?.length === 13
        );
      },
      priority: 10,
      cooldown: 0
    },

    perfect_game: {
      name: 'Perfect Game',
      description: 'Win with no invalid moves',
      check: (move, gameState) => {
        const gameWon = TriggerConditions.gameEvents.game_won.check(move, gameState);
        const noInvalidMoves = gameState.moveHistory.every(m => !m.invalid);
        return gameWon && noInvalidMoves;
      },
      priority: 10,
      cooldown: 0
    },

    all_suits_complete: {
      name: 'All Suits Complete',
      description: 'All four suits completed',
      check: (move, gameState) => {
        return TriggerConditions.gameEvents.game_won.check(move, gameState);
      },
      priority: 10,
      cooldown: 0
    }
  },

  /**
   * Good Move Triggers
   */
  goodMoves: {
    ace_to_foundation: {
      name: 'Ace to Foundation',
      description: 'Ace placed on foundation',
      check: (move, gameState) => {
        return move.card.rank === 'A' &&
               move.toPile.type === 'foundation';
      },
      priority: 5,
      cooldown: 1000
    },

    valid_move: {
      name: 'Valid Move',
      description: 'Any valid card placement',
      check: (move, gameState) => {
        return !move.invalid;
      },
      priority: 1,
      cooldown: 5000,
      probability: 0.3
    },

    card_flip: {
      name: 'Card Flip',
      description: 'Flipped a face-down card',
      check: (move, gameState) => {
        return move.fromPile.type === 'tableau' &&
               move.causedFlip === true;
      },
      priority: 4,
      cooldown: 2000
    },

    tableau_clear: {
      name: 'Tableau Clear',
      description: 'Cleared a tableau column',
      check: (move, gameState) => {
        return move.fromPile.type === 'tableau' &&
               move.fromPile.cards?.length === 0;
      },
      priority: 5,
      cooldown: 2000
    },

    high_card_combo_king: {
      name: 'High Card Combo - King',
      description: 'Multiple high cards including king',
      check: (move, gameState) => {
        return TriggerConditions._checkHighCardCombo(move, gameState, ['K', 'Q']);
      },
      priority: 6,
      cooldown: 3000
    },

    high_card_combo_queen: {
      name: 'High Card Combo - Queen',
      description: 'Multiple high cards including queen',
      check: (move, gameState) => {
        return TriggerConditions._checkHighCardCombo(move, gameState, ['Q', 'J']);
      },
      priority: 6,
      cooldown: 3000
    },

    high_card_combo_jack: {
      name: 'High Card Combo - Jack',
      description: 'Multiple high cards including jack',
      check: (move, gameState) => {
        return TriggerConditions._checkHighCardCombo(move, gameState, ['J', '10']);
      },
      priority: 6,
      cooldown: 3000
    },

    multiple_good_moves: {
      name: 'Multiple Good Moves',
      description: '3+ consecutive good moves',
      check: (move, gameState) => {
        return gameState.consecutiveGoodMoves >= 3;
      },
      priority: 5,
      cooldown: 4000
    }
  },

  /**
   * Helper Methods
   */

  _normalizeSuit(suitOrCard) {
    if (suitOrCard === undefined || suitOrCard === null) return 'hearts';
    if (typeof suitOrCard === 'object') {
      return suitOrCard.suitName || (typeof suitOrCard.suit === 'number' ? ['clubs', 'diamonds', 'hearts', 'spades'][suitOrCard.suit] : suitOrCard.suit) || 'hearts';
    }
    if (typeof suitOrCard === 'number') {
      return ['clubs', 'diamonds', 'hearts', 'spades'][suitOrCard] || 'hearts';
    }
    return String(suitOrCard).toLowerCase();
  },

  _normalizeRank(rankOrCard) {
    if (rankOrCard === undefined || rankOrCard === null) return '';
    if (typeof rankOrCard === 'object') {
      return rankOrCard.rankName || (typeof rankOrCard.rank === 'number' ? ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][rankOrCard.rank] : String(rankOrCard.rank));
    }
    if (typeof rankOrCard === 'number') {
      return ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][rankOrCard] || String(rankOrCard);
    }
    return String(rankOrCard);
  },

  _checkSuitRun(move, gameState, suit, minLength) {
    const recentMoves = gameState.moveHistory.slice(-5);
    const targetSuit = TriggerConditions._normalizeSuit(suit);
    const suitMoves = recentMoves.filter(m =>
      TriggerConditions._normalizeSuit(m.card) === targetSuit && m.toPile.type === 'foundation'
    );
    return suitMoves.length >= minLength;
  },

  _checkSuitComplete(gameState, suit) {
    const targetSuit = TriggerConditions._normalizeSuit(suit);
    const foundation = gameState.foundationCards[targetSuit];
    return foundation && foundation.length === 13;
  },

  _checkAllFaceCards(gameState, suit) {
    const targetSuit = TriggerConditions._normalizeSuit(suit);
    const foundation = gameState.foundationCards[targetSuit] || [];
    const faceRanks = ['K', 'Q', 'J'];
    return faceRanks.every(rank =>
      foundation.some(card => TriggerConditions._normalizeRank(card) === rank)
    );
  },

  _checkHighCardCombo(move, gameState, requiredRanks) {
    const recentMoves = gameState.moveHistory.slice(-4);
    const highCardMoves = recentMoves.filter(m =>
      requiredRanks.includes(TriggerConditions._normalizeRank(m.card)) &&
      m.toPile.type === 'foundation'
    );
    return highCardMoves.length >= 2;
  },

  /**
   * Get all triggers sorted by priority
   */
  getAllTriggers() {
    const allTriggers = {
      ...this.faceCards,
      ...this.suits,
      ...this.gameEvents,
      ...this.goodMoves
    };

    return Object.entries(allTriggers)
      .sort(([, a], [, b]) => b.priority - a.priority)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  },

  /**
   * Check all triggers for a move and return highest priority match
   */
  checkTriggers(move, gameState) {
    const allTriggers = this.getAllTriggers();
    const currentTime = Date.now();

    for (const [triggerId, trigger] of Object.entries(allTriggers)) {
      // Check cooldown
      const lastTriggered = gameState.lastTriggered?.[triggerId] || 0;
      if (currentTime - lastTriggered < trigger.cooldown) {
        continue;
      }

      // Check probability (for triggers that have it)
      if (trigger.probability && Math.random() > trigger.probability) {
        continue;
      }

      // Check trigger condition
      if (trigger.check(move, gameState)) {
        // Update last triggered time
        if (!gameState.lastTriggered) {
          gameState.lastTriggered = {};
        }
        gameState.lastTriggered[triggerId] = currentTime;

        return {
          triggerId,
          trigger,
          move,
          timestamp: currentTime
        };
      }
    }

    return null;
  }
};

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TriggerConditions;
}
