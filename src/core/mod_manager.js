/**
 * Solitaire Sovereign - Clean-Room Game Mod & Custom Asset Manager
 * 
 * Supports:
 * - Dynamic discovery of custom backgrounds, card backs, card faces, and chips from /mods/
 * - In-browser file upload (drag & drop / file picker) with dataURL local persistence
 * - Seamless integration with DeckRenderer, table theme engine, and casino chip styling
 */

export class ModManager {
  constructor(app = null) {
    this.app = app;
    this.mods = {
      backgrounds: [],
      cardBacks: [],
      cardFaces: [],
      chips: []
    };
    this.deckCollections = []; // Available deck themes from /decks/ folder
    this.modsDir = '';

    // Active selections
    this.activeBackground = typeof localStorage !== 'undefined' ? localStorage.getItem('solitaire_mod_background') : null;
    this.backgroundFit = (typeof localStorage !== 'undefined' ? localStorage.getItem('solitaire_mod_bg_fit') : null) || 'cover'; // 'cover' or 'repeat'
    this.activeCardBack = typeof localStorage !== 'undefined' ? localStorage.getItem('solitaire_mod_card_back') : null;
    this.activeChipStyle = typeof localStorage !== 'undefined' ? localStorage.getItem('solitaire_mod_chip_style') : null;
    this.activeDeckTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('solitaire_mod_deck_theme') : null;
    this.livingCardsEnabled = typeof localStorage !== 'undefined' ? localStorage.getItem('solitaire_living_cards') !== 'false' : true;

    // Default start deck: English Pattern (standard Anglo-American set) until the player picks a deck themselves
    this.defaultDeckTheme = 'english_pattern';
    if (typeof localStorage !== 'undefined' && localStorage.getItem('solitaire_mod_deck_choice') === null && !this.activeDeckTheme) {
      this.activeDeckTheme = this.defaultDeckTheme;
      if (!this.activeCardBack) this.activeCardBack = `/decks/${this.defaultDeckTheme}/card_back.png`;
      if (!this.activeBackground) this.activeBackground = `/mods/backgrounds/${this.defaultDeckTheme}_felt.svg`;
    }

    // Cache-busting timestamp for forcing image reloads
    this.deckCacheBuster = Date.now();

    // Card face overrides (map: e.g. 'AS', 'KH', 'JOKER' -> url/dataURL)
    this.cardFaceOverrides = {};
    try {
      const savedFaces = typeof localStorage !== 'undefined' ? localStorage.getItem('solitaire_mod_card_faces') : null;
      if (savedFaces) {
        this.cardFaceOverrides = JSON.parse(savedFaces);
      }
    } catch (e) {
      this.cardFaceOverrides = {};
    }

    this.loaded = false;
  }

  async loadAvailableMods() {
    try {
      const res = await fetch('/api/mods');
      if (res.ok) {
        const data = await res.json();
        this.mods = {
          backgrounds: data.backgrounds || [],
          cardBacks: data.cardBacks || [],
          cardFaces: data.cardFaces || [],
          chips: data.chips || []
        };
        this.modsDir = data.modsDir || '';
        this.loaded = true;
      }
    } catch (err) {
      console.warn('[ModManager] /api/mods fetch failed or server offline; continuing with local storage mods:', err);
    }

    // Load available deck collections
    try {
      const decksRes = await fetch('/api/decks');
      if (decksRes.ok) {
        const decksData = await decksRes.json();
        this.deckCollections = decksData.decks || [];
        console.log(`[ModManager] ✅ Loaded ${this.deckCollections.length} deck collections`);
      }
    } catch (err) {
      console.warn('[ModManager] /api/decks fetch failed; using fallback deck list:', err);
      // Fallback to basic deck list if server unavailable
      this.deckCollections = [
        { id: 'classic_standard', name: 'Classic Casino Standard', sample: '/decks/classic_standard/K_spades.png' },
        { id: 'victorian_christmas', name: 'Victorian Christmas', sample: '/decks/victorian_christmas/K_hearts.png' }
      ];
    }

    return this.mods;
  }

  /**
   * Apply table background to body and game container
   */
  applyActiveBackground() {
    const bgUrl = this.activeBackground;
    const body = document.body;

    if (!bgUrl) {
      body.style.backgroundImage = '';
      body.style.backgroundSize = '';
      body.style.backgroundRepeat = '';
      body.style.backgroundPosition = '';
      return;
    }

    body.style.backgroundImage = `url("${bgUrl}")`;
    if (this.backgroundFit === 'repeat') {
      body.style.backgroundRepeat = 'repeat';
      body.style.backgroundSize = 'auto';
      body.style.backgroundPosition = 'top left';
    } else {
      body.style.backgroundRepeat = 'no-repeat';
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center center';
      body.style.backgroundAttachment = 'fixed';
    }
  }

  setBackground(url, fit = 'cover') {
    this.activeBackground = url;
    this.backgroundFit = fit;
    if (url) {
      localStorage.setItem('solitaire_mod_background', url);
      localStorage.setItem('solitaire_mod_bg_fit', fit);
    } else {
      localStorage.removeItem('solitaire_mod_background');
      localStorage.removeItem('solitaire_mod_bg_fit');
    }
    this.applyActiveBackground();
  }

  setCardBack(url) {
    this.activeCardBack = url;
    // Update cache buster to force reload of card back images
    this.deckCacheBuster = Date.now();

    if (url) {
      localStorage.setItem('solitaire_mod_card_back', url);
    } else {
      localStorage.removeItem('solitaire_mod_card_back');
    }
    if (this.app) {
      this.app.render();
    }
  }

  setChipStyle(url) {
    this.activeChipStyle = url;
    if (url) {
      localStorage.setItem('solitaire_mod_chip_style', url);
    } else {
      localStorage.removeItem('solitaire_mod_chip_style');
    }
    this.applyActiveChips();
  }

  applyActiveChips() {
    const chipUrl = this.activeChipStyle;
    document.querySelectorAll('.casino-chip').forEach(chip => {
      if (chipUrl) {
        chip.style.backgroundImage = `url("${chipUrl}")`;
        chip.style.backgroundSize = 'cover';
        chip.style.backgroundPosition = 'center';
      } else {
        chip.style.backgroundImage = '';
        chip.style.backgroundSize = '';
        chip.style.backgroundPosition = '';
      }
    });
  }

  getCustomCardFace(card) {
    if (!card) return null;

    // 1. Check if an active full deck theme is selected (e.g. Classic Standard, Cartoon Animals, Anime Fantasy, etc.)
    if (this.activeDeckTheme && this.activeDeckTheme !== 'default') {
      const cacheBuster = this.deckCacheBuster ? `?v=${this.deckCacheBuster}` : '';

      if (card.isJoker || card.rank === 99 || card.id === 52) {
        const url = `/decks/${this.activeDeckTheme}/joker_1.png${cacheBuster}`;
        console.log('[ModManager] Joker URL:', url);
        return url;
      }
      const rankChars = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const suitNames = ['clubs', 'diamonds', 'hearts', 'spades'];

      let r = '';
      if (typeof card.rank === 'number' && card.rank >= 0 && card.rank <= 12) {
        r = rankChars[card.rank];
      } else if (card.rankName) {
        r = card.rankName;
      } else if (typeof card.rank === 'string') {
        r = card.rank;
      }

      let s = '';
      if (typeof card.suit === 'number' && card.suit >= 0 && card.suit <= 3) {
        s = suitNames[card.suit];
      } else if (card.suitName) {
        s = card.suitName.toLowerCase();
      } else if (typeof card.suit === 'string') {
        s = card.suit.toLowerCase();
      }

      if (r && s) {
        const isCourt = (r === 'K' || r === 'Q' || r === 'J' || card.rank >= 10);
        if (this.livingCardsEnabled && isCourt && this.hasLivingCard(this.activeDeckTheme, r, s)) {
          const animUrl = `/decks/${this.activeDeckTheme}/animated/${r}_${s}.webp${cacheBuster}`;
          return animUrl;
        }
        const url = `/decks/${this.activeDeckTheme}/${r}_${s}.png${cacheBuster}`;
        console.log(`[ModManager] Card URL: ${card.fullName || r+s} →`, url);
        return url;
      } else {
        console.warn('[ModManager] Failed to generate URL for card:', card);
      }
    } else {
      console.log('[ModManager] No active deck theme, using SVG fallback');
    }

    // 2. Individual card shorthand code, e.g. 'AS', 'KH', '10C', 'JOKER'
    let key = '';
    if (card.isJoker || card.rank === 99 || card.id === 52) {
      key = 'JOKER';
    } else {
      const rankChars = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const suitChars = ['C', 'D', 'H', 'S'];
      const rIdx = (typeof card.rank === 'number' && card.rank >= 0 && card.rank <= 12) ? card.rank : 0;
      const sIdx = (typeof card.suit === 'number' && card.suit >= 0 && card.suit <= 3) ? card.suit : 0;
      key = `${rankChars[rIdx]}${suitChars[sIdx]}`;
    }

    // Check user file overrides first
    if (this.cardFaceOverrides[key]) {
      return this.cardFaceOverrides[key];
    }

    // Check detected mods folder
    const modMatch = this.mods.cardFaces.find(f => f.id.toUpperCase() === key.toUpperCase());
    if (modMatch) {
      return modMatch.url;
    }

    return null;
  }

  setLivingCardsEnabled(enabled) {
    this.livingCardsEnabled = !!enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('solitaire_living_cards', this.livingCardsEnabled ? 'true' : 'false');
    }
    if (this.app) {
      this.app.render();
    }
  }

  hasLivingCard(theme, r, s) {
    if (!theme) return false;
    if (theme === 'victorian_christmas') {
      return (r === 'K' || r === 'Q' || r === 'J');
    }
    return false;
  }

  getLivingCardFace(card, theme = null) {
    const targetTheme = theme || this.activeDeckTheme || 'victorian_christmas';
    if (!card) return null;
    const rankChars = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suitNames = ['clubs', 'diamonds', 'hearts', 'spades'];

    let r = '';
    if (typeof card.rank === 'number' && card.rank >= 0 && card.rank <= 12) {
      r = rankChars[card.rank];
    } else if (card.rankName) {
      r = card.rankName;
    } else if (typeof card.rank === 'string') {
      r = card.rank;
    }

    let s = '';
    if (typeof card.suit === 'number' && card.suit >= 0 && card.suit <= 3) {
      s = suitNames[card.suit];
    } else if (card.suitName) {
      s = card.suitName.toLowerCase();
    } else if (typeof card.suit === 'string') {
      s = card.suit.toLowerCase();
    }

    if (!r || !s || !this.hasLivingCard(targetTheme, r, s)) return null;
    const cacheBuster = this.deckCacheBuster ? `?v=${this.deckCacheBuster}` : '';
    return `/decks/${targetTheme}/animated/${r}_${s}.webp${cacheBuster}`;
  }

  setDeckTheme(themeId) {
    this.activeDeckTheme = themeId;
    if (typeof localStorage !== 'undefined') localStorage.setItem('solitaire_mod_deck_choice', '1');   // explicit pick (incl. plain vector) beats the default
    // Update cache buster to force reload of all card images
    this.deckCacheBuster = Date.now();

    if (themeId) {
      console.log(`[ModManager] ✅ Deck theme set to: ${themeId} (cache: ${this.deckCacheBuster})`);
      localStorage.setItem('solitaire_mod_deck_theme', themeId);
      // Auto-set matching card back and background felt if available
      this.activeCardBack = `/decks/${themeId}/card_back.png`;
      this.activeBackground = `/mods/backgrounds/${themeId}_felt.svg`;
      localStorage.setItem('solitaire_mod_card_back', this.activeCardBack);
      localStorage.setItem('solitaire_mod_background', this.activeBackground);
      this.applyActiveBackground();
    } else {
      console.log('[ModManager] Deck theme cleared (using default SVG)');
      localStorage.removeItem('solitaire_mod_deck_theme');
      localStorage.removeItem('solitaire_mod_card_back');
      localStorage.removeItem('solitaire_mod_background');
      this.activeCardBack = null;
      this.activeBackground = null;
      this.applyActiveBackground();
    }
    if (this.app) {
      this.app.render();
      if (typeof this.app._syncDeckSelectorDropdown === 'function') {
        this.app._syncDeckSelectorDropdown();
      }
    }
  }

  setCardFaceOverride(key, url) {
    this.cardFaceOverrides[key.toUpperCase()] = url;
    localStorage.setItem('solitaire_mod_card_faces', JSON.stringify(this.cardFaceOverrides));
    if (this.app) {
      this.app.render();
    }
  }

  clearCardFaceOverrides() {
    this.cardFaceOverrides = {};
    localStorage.removeItem('solitaire_mod_card_faces');
    if (this.app) {
      this.app.render();
    }
  }

  resetAllMods() {
    this.activeBackground = null;
    this.activeCardBack = null;
    this.activeChipStyle = null;
    this.activeDeckTheme = this.defaultDeckTheme;      // back to the standard start deck
    this.activeCardBack = `/decks/${this.defaultDeckTheme}/card_back.png`;
    this.activeBackground = `/mods/backgrounds/${this.defaultDeckTheme}_felt.svg`;
    this.cardFaceOverrides = {};

    localStorage.removeItem('solitaire_mod_deck_choice');
    localStorage.removeItem('solitaire_mod_background');
    localStorage.removeItem('solitaire_mod_bg_fit');
    localStorage.removeItem('solitaire_mod_card_back');
    localStorage.removeItem('solitaire_mod_chip_style');
    localStorage.removeItem('solitaire_mod_deck_theme');
    localStorage.removeItem('solitaire_mod_card_faces');

    this.applyActiveBackground();
    this.applyActiveChips();
    if (this.app) {
      this.app.render();
    }
  }
}
