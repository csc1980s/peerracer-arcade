/**
 * EventMapper - Maps game events to celebration effects and audio
 * Victorian Christmas Solitaire - Card Celebration System
 */

export class EventMapper {
  constructor() {
    // Load effect templates index
    this.effectTemplates = null;
    this.audioManifest = null;

    // Mapping of trigger types to effect templates
    this.triggerToEffectMap = {
      // Face Cards
      'king_placed': 'king_celebration',
      'king_sequence': 'king_celebration',
      'high_card_combo_king': 'king_celebration',

      'queen_placed': 'queen_celebration',
      'queen_sequence': 'queen_celebration',
      'high_card_combo_queen': 'queen_celebration',

      'jack_placed': 'jack_celebration',
      'jack_sequence': 'jack_celebration',
      'high_card_combo_jack': 'jack_celebration',

      // Suit Combos
      'hearts_suit_run': 'hearts_suit_combo',
      'hearts_sequence_complete': 'hearts_suit_combo',
      'all_hearts_face_cards': 'hearts_suit_combo',

      'diamonds_suit_run': 'diamonds_suit_combo',
      'diamonds_sequence_complete': 'diamonds_suit_combo',
      'all_diamonds_face_cards': 'diamonds_suit_combo',

      'spades_suit_run': 'spades_suit_combo',
      'spades_sequence_complete': 'spades_suit_combo',
      'all_spades_face_cards': 'spades_suit_combo',

      'clubs_suit_run': 'clubs_suit_combo',
      'clubs_sequence_complete': 'clubs_suit_combo',
      'all_clubs_face_cards': 'clubs_suit_combo',

      // Game Events
      'game_won': 'win_game',
      'perfect_game': 'win_game',
      'all_suits_complete': 'win_game',

      // Good Moves
      'ace_to_foundation': 'good_move',
      'valid_move': 'good_move',
      'card_flip': 'good_move',
      'tableau_clear': 'good_move',
      'multiple_good_moves': 'good_move'
    };

    // Mapping of trigger types to voice types
    this.triggerToVoiceMap = {
      // Face Cards
      'king_placed': 'king',
      'king_sequence': 'king',
      'high_card_combo_king': 'king',

      'queen_placed': 'queen',
      'queen_sequence': 'queen',
      'high_card_combo_queen': 'queen',

      'jack_placed': 'jack',
      'jack_sequence': 'jack',
      'high_card_combo_jack': 'jack',

      // Suit Combos - use highest card in sequence
      'hearts_suit_run': 'suit_based',
      'diamonds_suit_run': 'suit_based',
      'spades_suit_run': 'suit_based',
      'clubs_suit_run': 'suit_based',

      'hearts_sequence_complete': 'queen',
      'diamonds_sequence_complete': 'queen',
      'spades_sequence_complete': 'king',
      'clubs_sequence_complete': 'queen',

      'all_hearts_face_cards': 'queen',
      'all_diamonds_face_cards': 'queen',
      'all_spades_face_cards': 'king',
      'all_clubs_face_cards': 'queen',

      // Game Events - random celebration
      'game_won': 'random',
      'perfect_game': 'random',
      'all_suits_complete': 'random',

      // Good Moves - suit based
      'ace_to_foundation': 'suit_based',
      'valid_move': 'suit_based',
      'card_flip': 'suit_based',
      'tableau_clear': 'suit_based',
      'multiple_good_moves': 'suit_based'
    };
  }

  /**
   * Load effect templates from index
   */
  async loadEffectTemplates() {
    try {
      const response = await fetch('effects/celebrations/index.json');
      this.effectTemplates = await response.json();
      console.log('✅ Effect templates loaded');
      return this.effectTemplates;
    } catch (error) {
      console.error('❌ Failed to load effect templates:', error);
      return null;
    }
  }

  /**
   * Load audio manifest
   */
  async loadAudioManifest() {
    try {
      const response = await fetch('audio/encouragement/master_manifest.json');
      this.audioManifest = await response.json();
      console.log('✅ Audio manifest loaded');
      return this.audioManifest;
    } catch (error) {
      console.error('❌ Failed to load audio manifest:', error);
      return null;
    }
  }

  /**
   * Map trigger event to celebration configuration
   * @param {string} triggerId - Trigger identifier
   * @param {Object} move - Move that triggered celebration
   * @param {Object} gameState - Current game state
   * @returns {Object} Celebration configuration
   */
  mapTriggerToCelebration(triggerId, move, gameState) {
    const effectTemplate = this.triggerToEffectMap[triggerId];
    const voiceType = this.resolveVoiceType(
      this.triggerToVoiceMap[triggerId],
      move,
      gameState
    );

    const audioFile = this.selectAudioFile(voiceType, move.card.suit, triggerId);

    return {
      triggerId,
      effectTemplate,
      effectPath: `effects/celebrations/${effectTemplate}.json`,
      voiceType,
      audioFile,
      card: move.card,
      timestamp: Date.now(),
      metadata: {
        suit: move.card.suit,
        rank: move.card.rank,
        moveType: move.toPile.type
      }
    };
  }

  /**
   * Resolve voice type (handle 'suit_based', 'random', etc.)
   */
  resolveVoiceType(voiceType, move, gameState) {
    if (voiceType === 'suit_based') {
      // Select voice based on card rank
      const rank = move.card.rank;
      if (rank === 'K') return 'king';
      if (rank === 'Q') return 'queen';
      if (rank === 'J') return 'jack';

      // For other ranks, use suit preference
      const suitVoices = {
        'hearts': 'queen',
        'diamonds': 'queen',
        'spades': 'king',
        'clubs': 'queen'
      };
      return suitVoices[move.card.suit] || 'queen';
    }

    if (voiceType === 'random') {
      const voices = ['king', 'queen', 'jack'];
      return voices[Math.floor(Math.random() * voices.length)];
    }

    return voiceType;
  }

  /**
   * Select appropriate audio file
   */
  selectAudioFile(voiceType, suit, triggerId) {
    if (!this.audioManifest) {
      console.warn('Audio manifest not loaded');
      return null;
    }

    const voiceManifest = this.audioManifest.voices[voiceType];
    if (!voiceManifest) {
      console.warn(`No audio manifest for voice: ${voiceType}`);
      return null;
    }

    // Build audio file path
    // For now, return manifest path - actual file selection happens at load time
    return {
      voiceType,
      suit,
      triggerId,
      manifestPath: voiceManifest.manifestPath
    };
  }

  /**
   * Get all available effect templates
   */
  getEffectTemplates() {
    return this.effectTemplates;
  }

  /**
   * Get effect template by ID
   */
  async getEffectTemplate(templateId) {
    if (!this.effectTemplates) {
      await this.loadEffectTemplates();
    }

    const templatePath = `effects/celebrations/${templateId}.json`;

    try {
      const response = await fetch(templatePath);
      const template = await response.json();
      return template;
    } catch (error) {
      console.error(`Failed to load effect template: ${templateId}`, error);
      return null;
    }
  }

  /**
   * Get random audio quote for voice and suit
   */
  async getRandomAudioQuote(voiceType, suit = null) {
    if (!this.audioManifest) {
      await this.loadAudioManifest();
    }

    const voiceManifest = this.audioManifest.voices[voiceType];
    if (!voiceManifest) {
      return null;
    }

    // Load voice-specific manifest
    try {
      const response = await fetch(voiceManifest.manifestPath);
      const manifest = await response.json();

      let candidates = manifest.files;

      // Filter by suit if specified
      if (suit) {
        const suitFiltered = candidates.filter(f => f.suit === suit);
        if (suitFiltered.length > 0) {
          candidates = suitFiltered;
        }
      }

      // Select random
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex];
    } catch (error) {
      console.error('Failed to load audio quote:', error);
      return null;
    }
  }

  /**
   * Validate that all required files exist
   */
  async validateAssets() {
    const validation = {
      effectTemplates: false,
      audioManifest: false,
      errors: []
    };

    // Check effect templates
    try {
      await this.loadEffectTemplates();
      validation.effectTemplates = true;
    } catch (error) {
      validation.errors.push(`Effect templates: ${error.message}`);
    }

    // Check audio manifest
    try {
      await this.loadAudioManifest();
      validation.audioManifest = true;
    } catch (error) {
      validation.errors.push(`Audio manifest: ${error.message}`);
    }

    validation.valid = validation.effectTemplates && validation.audioManifest;

    return validation;
  }

  /**
   * Get celebration preview for testing
   */
  async getCelebrationPreview(triggerId) {
    const effectTemplate = this.triggerToEffectMap[triggerId];
    const voiceType = this.triggerToVoiceMap[triggerId];

    return {
      triggerId,
      effectTemplate,
      voiceType,
      effectPreview: await this.getEffectTemplate(effectTemplate),
      audioPreview: await this.getRandomAudioQuote(voiceType)
    };
  }
}

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventMapper;
}
