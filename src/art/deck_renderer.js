/**
 * Solitaire Sovereign - 100% Original Vector SVG Deck & Card Back Art Engine
 * 
 * IP Provenance & Boundary:
 * All card faces, court cards (J, Q, K), suit pips, and card backs are mathematically
 * generated via clean-room SVG vector paths. Zero external textures, zero copyrighted
 * Microsoft Solitaire art, and zero scraped assets.
 */

import { SUITS } from '../core/card.js';

export const CARD_BACK_THEMES = Object.freeze({
  ROYAL_GUILLOCHE: 'royal_guilloche',
  OBSIDIAN_GOLD: 'obsidian_gold',
  CELESTIAL_NIGHT: 'celestial_night',
  CRIMSON_DAMASK: 'crimson_damask',
  EMERALD_FILIGREE: 'emerald_filigree'
});

export class DeckRenderer {
  /**
   * Return SVG vector path string for a suit symbol
   * @param {number} suit 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades
   * @param {number} size viewBox is 100x100
   */
  static getSuitPath(suit) {
    switch (suit) {
      case SUITS.CLUBS: // ♣ Three leaves, stem, base
        return `
          <circle cx="50" cy="35" r="18" fill="currentColor"/>
          <circle cx="34" cy="55" r="18" fill="currentColor"/>
          <circle cx="66" cy="55" r="18" fill="currentColor"/>
          <path d="M48 50 L45 82 L35 88 L65 88 L55 82 L52 50 Z" fill="currentColor"/>
          <circle cx="50" cy="50" r="10" fill="currentColor"/>
        `;
      case SUITS.DIAMONDS: // ♦ Sharp curved diamond
        return `
          <path d="M50 14 Q52 48 85 50 Q52 52 50 86 Q48 52 15 50 Q48 48 50 14 Z" fill="currentColor"/>
        `;
      case SUITS.HEARTS: // ♥ Balanced curved heart
        return `
          <path d="M50 84 C20 60 12 40 12 28 C12 16 22 14 32 14 C42 14 48 22 50 26 C52 22 58 14 68 14 C78 14 88 16 88 28 C88 40 80 60 50 84 Z" fill="currentColor"/>
        `;
      case SUITS.SPADES: // ♠ Inverted heart with stem
        return `
          <path d="M50 14 C32 38 14 52 14 66 C14 76 24 80 34 78 C42 76 47 70 50 64 C53 70 58 76 66 78 C76 80 86 76 86 66 C86 52 68 38 50 14 Z" fill="currentColor"/>
          <path d="M48 64 L44 88 L34 92 L66 92 L56 88 L52 64 Z" fill="currentColor"/>
        `;
      default:
        return '';
    }
  }

  /**
   * Generates authentic classic casino court card illustrations (Jack, Queen, King in Classic Casino / Vegas style)
   */
  static _getRoyalIllustration(rank, suit, isRed) {
    // Traditional casino palette
    const redColor = '#c0392b';
    const blueColor = '#1b3a57';
    const goldColor = '#e0a92c';
    const darkGold = '#b38119';
    const faceColor = '#fff2df';
    const hairColor = '#d49b38'; // Classic golden blonde / light auburn traditional court hair
    const outline = '#1a1a1a';

    // Primary robe colors: alternating red & blue with gold trim
    const primaryRobe = isRed ? redColor : blueColor;
    const secondaryRobe = isRed ? blueColor : redColor;

    let figure = '';

    if (rank === 12) {
      // KING: Traditional Imperial King with Arched Crown, Ermine Collar, Scepter/Sword, Curled Hair & Beard
      figure = `
        <!-- Royal Robes / Shoulders -->
        <path d="M22 68 L25 46 C25 40 33 38 38 41 L40 50 L48 50 L52 50 L60 50 L62 41 C67 38 75 40 75 46 L78 68 Z" fill="${primaryRobe}" stroke="${outline}" stroke-width="1.1"/>
        <!-- Robe Pattern Inserts (Traditional Chevron & Stripes) -->
        <path d="M26 52 L36 52 L38 68 L28 68 Z" fill="${secondaryRobe}" stroke="${outline}" stroke-width="0.8"/>
        <path d="M64 52 L74 52 L72 68 L62 68 Z" fill="${secondaryRobe}" stroke="${outline}" stroke-width="0.8"/>
        <!-- Gold Robe Trim & Ermine Fur Collar -->
        <path d="M38 43 C42 47 58 47 62 43 L63 50 C58 53 42 53 37 50 Z" fill="#ffffff" stroke="${outline}" stroke-width="0.9"/>
        <!-- Ermine spots -->
        <circle cx="45" cy="47" r="0.9" fill="${outline}"/>
        <circle cx="50" cy="48" r="0.9" fill="${outline}"/>
        <circle cx="55" cy="47" r="0.9" fill="${outline}"/>
        <!-- Center Gold Medallion & Robe Bands -->
        <rect x="47" y="50" width="6" height="18" fill="${goldColor}" stroke="${outline}" stroke-width="0.8"/>
        <line x1="50" y1="50" x2="50" y2="68" stroke="${darkGold}" stroke-width="0.8"/>
        <circle cx="50" cy="56" r="2.2" fill="${secondaryRobe}" stroke="${outline}" stroke-width="0.6"/>

        <!-- Scepter / Sword Held Upright (Viewer Left) -->
        <g>
          <!-- Blade / Scepter Staff -->
          <rect x="25.5" y="24" width="2" height="42" fill="#e2e8f0" stroke="${outline}" stroke-width="0.75"/>
          <line x1="26.5" y1="26" x2="26.5" y2="60" stroke="#94a3b8" stroke-width="0.6"/>
          <!-- Scepter Finial / Crossguard -->
          <path d="M23 32 L30 32 L28 30 L25 30 Z" fill="${goldColor}" stroke="${outline}" stroke-width="0.75"/>
          <circle cx="26.5" cy="22" r="2.8" fill="${goldColor}" stroke="${outline}" stroke-width="0.75"/>
          <circle cx="26.5" cy="22" r="1.2" fill="${primaryRobe}"/>
          <!-- King Hand / Gauntlet gripping scepter -->
          <rect x="24" y="52" width="5" height="6" rx="1.5" fill="${faceColor}" stroke="${outline}" stroke-width="0.75"/>
          <line x1="24" y1="54" x2="29" y2="54" stroke="${outline}" stroke-width="0.5"/>
          <line x1="24" y1="56" x2="29" y2="56" stroke="${outline}" stroke-width="0.5"/>
        </g>

        <!-- Traditional Curled Hair Framing Head -->
        <path d="M37 28 C34 32 32 38 34 46 C37 46 39 42 39 37 Z" fill="${hairColor}" stroke="${outline}" stroke-width="0.8"/>
        <path d="M63 28 C66 32 68 38 66 46 C63 46 61 42 61 37 Z" fill="${hairColor}" stroke="${outline}" stroke-width="0.8"/>
        <circle cx="34" cy="42" r="2.5" fill="${hairColor}" stroke="${outline}" stroke-width="0.7"/>
        <circle cx="66" cy="42" r="2.5" fill="${hairColor}" stroke="${outline}" stroke-width="0.7"/>

        <!-- Face, Classic Curled Beard & Mustache -->
        <path d="M41 27 C41 23 59 23 59 27 L59 36 C59 42 55 46 50 46 C45 46 41 42 41 36 Z" fill="${faceColor}" stroke="${outline}" stroke-width="0.9"/>
        <!-- Classic Curled Royal Mustache -->
        <path d="M43 38 C46 36 49 37 50 38 C51 37 54 36 57 38 C56 40 53 41 50 39.5 C47 41 44 40 43 38 Z" fill="${hairColor}" stroke="${outline}" stroke-width="0.75"/>
        <!-- Curled Royal Beard -->
        <path d="M43 40 C43 45 46 47 50 47 C54 47 57 45 57 40 C55 42 53 43 50 42 C47 43 45 42 43 40 Z" fill="${hairColor}" stroke="${outline}" stroke-width="0.75"/>
        <!-- Eyes & Classic Expression -->
        <ellipse cx="46" cy="33" rx="1.4" ry="0.9" fill="#ffffff" stroke="${outline}" stroke-width="0.55"/>
        <circle cx="46.3" cy="33" r="0.7" fill="${outline}"/>
        <ellipse cx="54" cy="33" rx="1.4" ry="0.9" fill="#ffffff" stroke="${outline}" stroke-width="0.55"/>
        <circle cx="53.7" cy="33" r="0.7" fill="${outline}"/>
        <path d="M43.5 30.5 Q46 29.5 48.5 30.5" fill="none" stroke="${outline}" stroke-width="0.85"/>
        <path d="M56.5 30.5 Q54 29.5 51.5 30.5" fill="none" stroke="${outline}" stroke-width="0.85"/>
        <path d="M49.5 31.5 L49 35 L51 35" fill="none" stroke="${outline}" stroke-width="0.7"/>

        <!-- Traditional Arched Imperial Crown -->
        <g>
          <!-- Crown Base Band -->
          <rect x="37" y="24" width="26" height="4" rx="0.5" fill="${goldColor}" stroke="${outline}" stroke-width="0.85"/>
          <circle cx="42" cy="26" r="1.1" fill="${primaryRobe}"/>
          <circle cx="50" cy="26" r="1.3" fill="${secondaryRobe}"/>
          <circle cx="58" cy="26" r="1.1" fill="${primaryRobe}"/>
          <!-- Crown Arches & Spires -->
          <path d="M37 24 L39 16 L44 21 L50 14 L56 21 L61 16 L63 24 Z" fill="${goldColor}" stroke="${outline}" stroke-width="0.95"/>
          <path d="M44 21 C44 17 56 17 56 21" fill="none" stroke="${outline}" stroke-width="0.7"/>
          <circle cx="50" cy="14" r="1.5" fill="${goldColor}" stroke="${outline}" stroke-width="0.6"/>
          <line x1="50" y1="12" x2="50" y2="10.5" stroke="${outline}" stroke-width="0.8"/>
          <line x1="48.5" y1="11.2" x2="51.5" y2="11.2" stroke="${outline}" stroke-width="0.8"/>
        </g>
      `;
    } else if (rank === 11) {
      // QUEEN: Traditional Queen with Royal Wimple, Gown with Chevron Patterns, and Holding Traditional Rose/Flower
      figure = `
        <!-- Traditional Royal Wimple / Draped Veil behind head -->
        <path d="M35 24 C31 34 29 46 30 68 L36 68 C35 55 37 42 39 31 Z" fill="${primaryRobe}" stroke="${outline}" stroke-width="0.85"/>
        <path d="M65 24 C69 34 71 46 70 68 L64 68 C65 55 63 42 61 31 Z" fill="${primaryRobe}" stroke="${outline}" stroke-width="0.85"/>

        <!-- Royal Gown / Shoulders -->
        <path d="M26 68 L28 46 C28 41 35 39 40 42 L42 50 L58 50 L60 42 C65 39 72 41 72 46 L74 68 Z" fill="${secondaryRobe}" stroke="${outline}" stroke-width="1.1"/>
        <!-- Bodice Patterns & Chevron Gold Fluting -->
        <path d="M42 45 L50 51 L58 45" fill="none" stroke="${goldColor}" stroke-width="1.2"/>
        <path d="M40 50 L50 58 L60 50" fill="none" stroke="${goldColor}" stroke-width="1.2"/>
        <path d="M38 56 L50 65 L62 56" fill="none" stroke="${goldColor}" stroke-width="1.2"/>
        <!-- Sleeve Trim -->
        <rect x="26" y="56" width="6" height="3" fill="${goldColor}" stroke="${outline}" stroke-width="0.6"/>
        <rect x="68" y="56" width="6" height="3" fill="${goldColor}" stroke="${outline}" stroke-width="0.6"/>

        <!-- Traditional Royal Flower / Rose Held Gracefully in Front -->
        <g>
          <!-- Flower Stem -->
          <path d="M36 62 Q33 55 32 46" fill="none" stroke="#27ae60" stroke-width="1"/>
          <path d="M32 50 Q28 48 29 44" fill="none" stroke="#27ae60" stroke-width="0.8"/>
          <!-- Four-Petaled Royal Blossom / Rose -->
          <circle cx="32" cy="43" r="3.2" fill="${redColor}" stroke="${outline}" stroke-width="0.75"/>
          <circle cx="32" cy="43" r="1.5" fill="${goldColor}"/>
          <!-- Delicate Queen Hand holding stem -->
          <circle cx="35" cy="58" r="2.6" fill="${faceColor}" stroke="${outline}" stroke-width="0.7"/>
          <circle cx="37" cy="57" r="1.4" fill="${faceColor}"/>
        </g>

        <!-- Classical Hair Locks -->
        <path d="M39 27 C36 32 36 38 38 43 L41 38 Z" fill="${hairColor}" stroke="${outline}" stroke-width="0.7"/>
        <path d="M61 27 C64 32 64 38 62 43 L59 38 Z" fill="${hairColor}" stroke="${outline}" stroke-width="0.7"/>

        <!-- Queen Face & Classical Features -->
        <path d="M42 26 C42 22 58 22 58 26 L58 35 C58 41 54 45 50 45 C46 45 42 41 42 35 Z" fill="${faceColor}" stroke="${outline}" stroke-width="0.85"/>
        <ellipse cx="44.5" cy="35" rx="1.6" ry="0.8" fill="#fda4af" fill-opacity="0.4"/>
        <ellipse cx="55.5" cy="35" rx="1.6" ry="0.8" fill="#fda4af" fill-opacity="0.4"/>
        <!-- Soft Arched Eyebrows & Eyes -->
        <path d="M44 29.5 Q46.5 28.5 49 29.5" fill="none" stroke="${outline}" stroke-width="0.8"/>
        <path d="M56 29.5 Q53.5 28.5 51 29.5" fill="none" stroke="${outline}" stroke-width="0.8"/>
        <ellipse cx="46.5" cy="32" rx="1.4" ry="0.9" fill="#ffffff" stroke="${outline}" stroke-width="0.55"/>
        <circle cx="46.8" cy="32" r="0.7" fill="${outline}"/>
        <ellipse cx="53.5" cy="32" rx="1.4" ry="0.9" fill="#ffffff" stroke="${outline}" stroke-width="0.55"/>
        <circle cx="53.2" cy="32" r="0.7" fill="${outline}"/>
        <!-- Nose & Delicate Red Lips -->
        <path d="M49.5 31 L49.5 34.5 L50.5 34.5" fill="none" stroke="${outline}" stroke-width="0.6"/>
        <path d="M47.5 37.5 Q50 36.5 52.5 37.5 Q50 39.5 47.5 37.5 Z" fill="${redColor}" stroke="${outline}" stroke-width="0.55"/>

        <!-- Traditional Queen Crown -->
        <g>
          <rect x="39" y="23" width="22" height="3.5" rx="0.5" fill="${goldColor}" stroke="${outline}" stroke-width="0.85"/>
          <path d="M39 23 L41 16 L45.5 20.5 L50 13 L54.5 20.5 L59 16 L61 23 Z" fill="${goldColor}" stroke="${outline}" stroke-width="0.95"/>
          <circle cx="50" cy="13" r="1.3" fill="${goldColor}" stroke="${outline}" stroke-width="0.5"/>
          <circle cx="45" cy="24.8" r="0.9" fill="${redColor}"/>
          <circle cx="55" cy="24.8" r="0.9" fill="${redColor}"/>
        </g>
      `;
    } else if (rank === 10) {
      // JACK: Traditional Royal Knave with Tudor Cap, Curled Feather, Striped Sleeves, Halberd / Staff
      figure = `
        <!-- Royal Doublet & Robe -->
        <path d="M24 68 L26 46 C26 40 34 38 39 41 L41 49 L59 49 L61 41 C66 38 74 40 74 46 L76 68 Z" fill="${primaryRobe}" stroke="${outline}" stroke-width="1.1"/>
        <!-- Striped Sleeves (Traditional Anglo-American Jack) -->
        <path d="M26 50 L36 50 L37 68 L27 68 Z" fill="${secondaryRobe}" stroke="${outline}" stroke-width="0.8"/>
        <line x1="28" y1="50" x2="29" y2="68" stroke="${goldColor}" stroke-width="1"/>
        <line x1="32" y1="50" x2="33" y2="68" stroke="${goldColor}" stroke-width="1"/>

        <path d="M64 50 L74 50 L73 68 L63 68 Z" fill="${secondaryRobe}" stroke="${outline}" stroke-width="0.8"/>
        <line x1="67" y1="50" x2="66" y2="68" stroke="${goldColor}" stroke-width="1"/>
        <line x1="71" y1="50" x2="70" y2="68" stroke="${goldColor}" stroke-width="1"/>

        <!-- Center Heraldic Chest Plaque & Sash -->
        <polygon points="41,49 59,49 50,65" fill="${goldColor}" stroke="${outline}" stroke-width="0.85"/>
        <polygon points="44,51 56,51 50,62" fill="${secondaryRobe}"/>
        <g transform="translate(46.5, 52) scale(0.07)" color="${goldColor}">
          ${this.getSuitPath(suit)}
        </g>

        <!-- Ceremonial Halberd / Staff (Viewer Left) -->
        <g>
          <rect x="21.5" y="20" width="2" height="48" fill="#718096" stroke="${outline}" stroke-width="0.75"/>
          <!-- Halberd Axe Blade / Spearhead -->
          <path d="M22.5 14 L25.5 20 L22.5 22 L19.5 20 Z" fill="#e2e8f0" stroke="${outline}" stroke-width="0.8"/>
          <path d="M16 20 C16 16 22.5 17 22.5 20 C22.5 23 16 24 16 20 Z" fill="${goldColor}" stroke="${outline}" stroke-width="0.7"/>
          <!-- Hand gripping halberd -->
          <rect x="20" y="50" width="5" height="6" rx="1.2" fill="${faceColor}" stroke="${outline}" stroke-width="0.75"/>
          <line x1="20" y1="52" x2="25" y2="52" stroke="${outline}" stroke-width="0.5"/>
          <line x1="20" y1="54" x2="25" y2="54" stroke="${outline}" stroke-width="0.5"/>
        </g>

        <!-- Traditional Curled Hair Cascading onto Shoulders -->
        <path d="M37 28 C34 33 33 40 35 46 C38 46 39 42 39 37 Z" fill="${hairColor}" stroke="${outline}" stroke-width="0.8"/>
        <path d="M63 28 C66 33 67 40 65 46 C62 46 61 42 61 37 Z" fill="${hairColor}" stroke="${outline}" stroke-width="0.8"/>
        <circle cx="35" cy="42" r="2.4" fill="${hairColor}" stroke="${outline}" stroke-width="0.7"/>
        <circle cx="65" cy="42" r="2.4" fill="${hairColor}" stroke="${outline}" stroke-width="0.7"/>

        <!-- Young Clean-Shaven Courtier Face -->
        <path d="M41 26 C41 22 59 22 59 26 L59 36 C59 42 55 46 50 46 C45 46 41 42 41 36 Z" fill="${faceColor}" stroke="${outline}" stroke-width="0.85"/>
        <!-- Eyes & Alert Eyebrows -->
        <path d="M43.5 29.5 L48 30.5" stroke="${outline}" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M56.5 29.5 L52 30.5" stroke="${outline}" stroke-width="1.1" stroke-linecap="round"/>
        <ellipse cx="46" cy="32.5" rx="1.4" ry="0.9" fill="#ffffff" stroke="${outline}" stroke-width="0.55"/>
        <circle cx="46.3" cy="32.5" r="0.75" fill="${outline}"/>
        <ellipse cx="54" cy="32.5" rx="1.4" ry="0.9" fill="#ffffff" stroke="${outline}" stroke-width="0.55"/>
        <circle cx="53.7" cy="32.5" r="0.75" fill="${outline}"/>
        <path d="M49.5 31 L49.5 35 L51 35" fill="none" stroke="${outline}" stroke-width="0.65"/>
        <line x1="47.5" y1="38" x2="52.5" y2="38" stroke="${outline}" stroke-width="0.9" stroke-linecap="round"/>

        <!-- Traditional Tudor Flat Cap / Beret with Curled Feather -->
        <g>
          <!-- Cap Brim -->
          <path d="M37 25 C43 23 57 23 63 25 L62 28 C56 26.5 44 26.5 38 28 Z" fill="${secondaryRobe}" stroke="${outline}" stroke-width="0.85"/>
          <!-- Cap Crown -->
          <path d="M38 25 C40 18 60 18 62 25 Z" fill="${secondaryRobe}" stroke="${outline}" stroke-width="0.9"/>
          <circle cx="50" cy="21" r="1.6" fill="${goldColor}" stroke="${outline}" stroke-width="0.6"/>
          <!-- Sweeping Curled Royal Feather / Plume -->
          <path d="M50 21 Q58 13 69 16 Q63 20 52 23" fill="#ffffff" stroke="${outline}" stroke-width="0.8"/>
          <line x1="51" y1="22" x2="67" y2="16" stroke="${goldColor}" stroke-width="0.6"/>
        </g>
      `;
    }

    return `
      <g class="court-figure">
        <!-- Classic Double Inner Court Frame -->
        <rect x="17" y="16" width="66" height="108" fill="#fffdfa" stroke="${outline}" stroke-width="1.2"/>
        <rect x="18.5" y="17.5" width="63" height="105" fill="none" stroke="${goldColor}" stroke-width="0.65" opacity="0.85"/>

        <!-- Top Half (Clipped at Center y=70) -->
        <g clip-path="url(#court-clip-top)">
          ${figure}
        </g>

        <!-- Center Divider Ribbon & Symmetrical Emblem -->
        <line x1="17" y1="69.2" x2="83" y2="69.2" stroke="${outline}" stroke-width="1.5"/>
        <line x1="17" y1="70.8" x2="83" y2="70.8" stroke="${goldColor}" stroke-width="0.75"/>
        <circle cx="50" cy="70" r="3.2" fill="${goldColor}" stroke="${outline}" stroke-width="0.75"/>
        <circle cx="50" cy="70" r="1.3" fill="${isRed ? redColor : blueColor}"/>

        <!-- Bottom Half (Rotated 180 deg around center 50, 70) -->
        <g transform="rotate(180 50 70)">
          <g clip-path="url(#court-clip-top)">
            ${figure}
          </g>
        </g>
      </g>
    `;
  }

  static setModManager(manager) {
    this._modManager = manager;
    if (typeof globalThis !== 'undefined') globalThis.__deckModManager = manager;
  }

  static get _activeModManager() {
    return this._modManager || (typeof globalThis !== 'undefined' ? globalThis.__deckModManager : null);
  }

  /**
   * Generates card back SVG patterns or custom mod textures
   */
  static getCardBackSVG(theme = CARD_BACK_THEMES.ROYAL_GUILLOCHE) {
    const modMgr = this._activeModManager;
    const cacheBuster = modMgr && modMgr.deckCacheBuster ? `?v=${modMgr.deckCacheBuster}` : '';

    // Check if custom mod card back is active
    if (modMgr && modMgr.activeCardBack) {
      const customUrl = modMgr.activeCardBack + cacheBuster;
      return `<img src="${customUrl}" class="solitaire-card-back-svg custom-mod-card-back" alt="Custom Card Back" style="width:100%;height:100%;object-fit:cover;border-radius:7px;display:block;">`;
    }
    // Check if an active deck theme has a custom card back
    if (modMgr && modMgr.activeDeckTheme && modMgr.activeDeckTheme !== 'default') {
      return `<img src="/decks/${modMgr.activeDeckTheme}/card_back.png${cacheBuster}" class="solitaire-card-back-svg custom-mod-card-back" alt="Deck Card Back" style="width:100%;height:100%;object-fit:cover;border-radius:7px;display:block;">`;
    }
    // Also support direct URL or dataURL as theme
    if (theme && (theme.startsWith('/') || theme.startsWith('data:') || theme.startsWith('http'))) {
      return `<img src="${theme}" class="solitaire-card-back-svg custom-mod-card-back" alt="Custom Card Back" style="width:100%;height:100%;object-fit:cover;border-radius:7px;display:block;">`;
    }

    let patternContent = '';

    if (theme === CARD_BACK_THEMES.OBSIDIAN_GOLD) {
      patternContent = `
        <rect width="140" height="196" rx="10" fill="#14181f" stroke="#d4af37" stroke-width="3"/>
        <rect x="8" y="8" width="124" height="180" rx="8" fill="none" stroke="#8c7322" stroke-width="1.5"/>
        <!-- Geometric Gold Tessellation -->
        <g stroke="#d4af37" stroke-width="0.75" fill="none" opacity="0.8">
          <path d="M70 18 L122 70 L70 122 L18 70 Z"/>
          <path d="M70 74 L122 126 L70 178 L18 126 Z"/>
          <path d="M70 30 L110 70 L70 110 L30 70 Z"/>
          <path d="M70 86 L110 126 L70 166 L30 126 Z"/>
          <circle cx="70" cy="70" r="24"/>
          <circle cx="70" cy="126" r="24"/>
          <circle cx="70" cy="98" r="14" fill="#d4af37" fill-opacity="0.15"/>
        </g>
        <circle cx="70" cy="98" r="8" fill="#d4af37"/>
        <circle cx="70" cy="98" r="4" fill="#14181f"/>
      `;
    } else if (theme === CARD_BACK_THEMES.CELESTIAL_NIGHT) {
      patternContent = `
        <rect width="140" height="196" rx="10" fill="#0f192c" stroke="#4a7eb8" stroke-width="3"/>
        <rect x="8" y="8" width="124" height="180" rx="8" fill="none" stroke="#254168" stroke-width="1.5"/>
        <!-- Starbursts and Moon -->
        <g fill="#a8c5ea" opacity="0.85">
          <circle cx="70" cy="98" r="28" fill="#162744" stroke="#7aa3d6" stroke-width="1.5"/>
          <path d="M70 74 L73 95 L94 98 L73 101 L70 122 L67 101 L46 98 L67 95 Z" fill="#d9e6f5"/>
          <circle cx="40" cy="40" r="2.5"/>
          <circle cx="100" cy="40" r="2.5"/>
          <circle cx="40" cy="156" r="2.5"/>
          <circle cx="100" cy="156" r="2.5"/>
          <path d="M40 32 L40 48 M32 40 L48 40" stroke="#7aa3d6" stroke-width="1"/>
          <path d="M100 32 L100 48 M92 40 L108 40" stroke="#7aa3d6" stroke-width="1"/>
          <path d="M40 148 L40 164 M32 156 L48 156" stroke="#7aa3d6" stroke-width="1"/>
          <path d="M100 148 L100 164 M92 156 L108 156" stroke="#7aa3d6" stroke-width="1"/>
        </g>
      `;
    } else if (theme === CARD_BACK_THEMES.CRIMSON_DAMASK) {
      patternContent = `
        <rect width="140" height="196" rx="10" fill="#7a121d" stroke="#f0b429" stroke-width="3"/>
        <rect x="8" y="8" width="124" height="180" rx="8" fill="none" stroke="#b02534" stroke-width="1.5"/>
        <g stroke="#f0b429" stroke-width="0.8" fill="none" opacity="0.75">
          <path d="M70 20 C90 50 120 70 120 98 C120 126 90 146 70 176 C50 146 20 126 20 98 C20 70 50 50 70 20 Z"/>
          <circle cx="70" cy="98" r="22"/>
          <circle cx="70" cy="98" r="12" fill="#f0b429" fill-opacity="0.3"/>
          <path d="M50 80 Q70 65 90 80 Q70 95 50 80"/>
          <path d="M50 116 Q70 101 90 116 Q70 131 50 116"/>
        </g>
      `;
    } else if (theme === CARD_BACK_THEMES.EMERALD_FILIGREE) {
      patternContent = `
        <rect width="140" height="196" rx="10" fill="#0d3b24" stroke="#d4af37" stroke-width="3"/>
        <rect x="8" y="8" width="124" height="180" rx="8" fill="none" stroke="#1d6b43" stroke-width="1.5"/>
        <g stroke="#d4af37" stroke-width="1" fill="none" opacity="0.8">
          <circle cx="70" cy="98" r="32"/>
          <path d="M70 42 C85 70 100 80 110 98 C100 116 85 126 70 154 C55 126 40 116 30 98 C40 80 55 70 70 42 Z"/>
          <circle cx="70" cy="98" r="16" fill="#145233"/>
          <circle cx="70" cy="98" r="6" fill="#d4af37"/>
        </g>
      `;
    } else {
      // Default: ROYAL_GUILLOCHE (Trigonometric Lace Spiral)
      patternContent = `
        <rect width="140" height="196" rx="10" fill="#1a2536" stroke="#c59b27" stroke-width="3"/>
        <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#486581" stroke-width="1.5"/>
        <rect x="11" y="11" width="118" height="174" rx="5" fill="#101924"/>
        <!-- Guilloche Rosette Rings -->
        <g stroke="#c59b27" stroke-width="0.85" fill="none" opacity="0.85">
          <circle cx="70" cy="98" r="42"/>
          <circle cx="70" cy="98" r="36"/>
          <circle cx="70" cy="98" r="30"/>
          <circle cx="70" cy="98" r="24"/>
          <circle cx="70" cy="98" r="18"/>
          <circle cx="70" cy="98" r="12" fill="#c59b27" fill-opacity="0.2"/>
          <path d="M70 56 Q85 80 112 98 Q85 116 70 140 Q55 116 28 98 Q55 80 70 56 Z"/>
          <path d="M40 68 Q70 85 100 68 Q85 98 100 128 Q70 111 40 128 Q55 98 40 68 Z"/>
        </g>
        <circle cx="70" cy="98" r="5" fill="#c59b27"/>
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 196" class="solitaire-card-back-svg" width="100%" height="100%">
        ${patternContent}
      </svg>
    `;
  }

  /**
   * Renders the complete vector SVG for any card face
   * @param {Object} card 
   */
  static renderCardFaceSVG(card) {
    // Check if custom mod card face exists for this card
    const modMgr = this._activeModManager;
    if (modMgr) {
      const customFaceUrl = modMgr.getCustomCardFace(card);
      if (customFaceUrl) {
        const isLiving = customFaceUrl.includes('.webp') && (card.rank >= 10 || ['K', 'Q', 'J'].includes(card.rankName));
        const extraClass = isLiving ? ' living-court-card' : '';
        const livingAttr = isLiving ? ' data-living-card="true"' : '';
        return `<img src="${customFaceUrl}" class="solitaire-card-face-svg custom-mod-card-face${extraClass}"${livingAttr} alt="${card.fullName}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;display:block;">`;
      }
    }

    if (card.isJoker) {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" class="solitaire-card-face-svg joker-card" width="100%" height="100%">
          <rect width="100" height="140" rx="7" fill="#fffdfa" stroke="#8e44ad" stroke-width="1.5"/>
          <rect x="3" y="3" width="94" height="134" rx="5" fill="none" stroke="#f39c12" stroke-width="0.8" stroke-dasharray="2 2"/>

          <!-- Corner Labels (Digital UI Optimized positioning) -->
          <text x="13.14" y="16.3" font-family="'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="8.7" text-anchor="middle" fill="#8e44ad">JOKER</text>
          <text x="13.14" y="28.3" font-size="11.1" text-anchor="middle" fill="#f39c12">★</text>

          <g transform="rotate(180 50 70)">
            <text x="13.14" y="16.3" font-family="'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="8.7" text-anchor="middle" fill="#8e44ad">JOKER</text>
            <text x="13.14" y="28.3" font-size="11.1" text-anchor="middle" fill="#f39c12">★</text>
          </g>
          
          <!-- Center Jester Emblem -->
          <g transform="translate(50, 68)">
            <!-- Golden Sunburst -->
            <circle cx="0" cy="0" r="28" fill="#fcf3cf" stroke="#f39c12" stroke-width="1"/>
            <path d="M0 -34 L5 -24 L-5 -24 Z" fill="#f39c12"/>
            <path d="M0 34 L5 24 L-5 24 Z" fill="#f39c12"/>
            <path d="M-34 0 L-24 5 L-24 -5 Z" fill="#f39c12"/>
            <path d="M34 0 L24 5 L24 -5 Z" fill="#f39c12"/>
            
            <!-- Jester Hat -->
            <path d="M-18 6 C-22 -14 -12 -22 0 -12 C12 -22 22 -14 18 6 Z" fill="#8e44ad" stroke="#5b2c6f" stroke-width="1"/>
            <path d="M-6 -10 C-18 -26 -30 -14 -24 -6" fill="none" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>
            <path d="M6 -10 C18 -26 30 -14 24 -6" fill="none" stroke="#3498db" stroke-width="3" stroke-linecap="round"/>
            <path d="M0 -12 C0 -28 6 -32 0 -30" fill="none" stroke="#f39c12" stroke-width="3" stroke-linecap="round"/>
            
            <!-- Jester Bells -->
            <circle cx="-24" cy="-6" r="3" fill="#f39c12" stroke="#b7950b" stroke-width="0.8"/>
            <circle cx="24" cy="-6" r="3" fill="#f39c12" stroke="#b7950b" stroke-width="0.8"/>
            <circle cx="0" cy="-30" r="3" fill="#f39c12" stroke="#b7950b" stroke-width="0.8"/>
            
            <!-- Smiling Jester Face -->
            <circle cx="0" cy="8" r="11" fill="#fff2df" stroke="#2c3e50" stroke-width="0.9"/>
            <!-- Eyes -->
            <circle cx="-4" cy="6" r="1.3" fill="#2c3e50"/>
            <circle cx="4" cy="6" r="1.3" fill="#2c3e50"/>
            <!-- Smile -->
            <path d="M-5 11 Q0 16 5 11" fill="none" stroke="#c0392b" stroke-width="1.2" stroke-linecap="round"/>
            <!-- Cheeks -->
            <circle cx="-6.5" cy="10" r="1.5" fill="#f1948a" opacity="0.7"/>
            <circle cx="6.5" cy="10" r="1.5" fill="#f1948a" opacity="0.7"/>
            
            <!-- Jester Ruffled Collar -->
            <path d="M-14 18 L-8 23 L0 19 L8 23 L14 18 L0 25 Z" fill="#f39c12" stroke="#d68910" stroke-width="0.8"/>
            
            <!-- WILD Ribbon -->
            <rect x="-26" y="27" width="52" height="13" rx="3" fill="#8e44ad" stroke="#f39c12" stroke-width="0.9"/>
            <text x="0" y="37" font-family="'Segoe UI', -apple-system, sans-serif" font-weight="900" font-size="9" fill="#ffffff" text-anchor="middle" letter-spacing="1">★ WILD ★</text>
          </g>
        </svg>
      `;
    }

    const isRed = card.isRed;
    const colorHex = isRed ? '#c82333' : '#1c2833';
    const suitSvgPath = this.getSuitPath(card.suit);

    let innerContent = '';

    if (card.rank >= 10) {
      // Court cards: Jack (10), Queen (11), King (12)
      innerContent = this._getRoyalIllustration(card.rank, card.suit, isRed);
    } else if (card.rank === 0) {
      // Ace: Grand Center Pip with Ornate Emblem
      innerContent = `
        <g transform="translate(35, 45) scale(0.7)" color="${colorHex}">
          ${suitSvgPath}
        </g>
      `;
    } else {
      // Number Cards (2..10): Pip Layout System
      innerContent = this._renderNumberCardPips(card.rank, suitSvgPath, colorHex);
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" class="solitaire-card-face-svg" width="100%" height="100%">
        <defs>
          <clipPath id="court-clip-top">
            <rect x="17" y="16" width="66" height="54"/>
          </clipPath>
        </defs>

        <!-- Card Base Surface -->
        <rect width="100" height="140" rx="7" fill="#ffffff" stroke="#d5dbe1" stroke-width="1.2"/>

        <!-- Top-Left Index (Digital UI Optimized: 12.45% rank, 7.96% suit pip) -->
        <text x="13.14" y="21.57" font-family="'Cinzel', Georgia, 'Times New Roman', serif" font-weight="800" font-size="17.4" ${card.rankName === '10' ? 'textLength="13.7" lengthAdjust="spacingAndGlyphs"' : ''} text-anchor="middle" fill="${colorHex}">${card.rankName}</text>
        <g transform="translate(7.57, 24.86) scale(0.1114)" color="${colorHex}">
          ${suitSvgPath}
        </g>

        <!-- Bottom-Right Index (Inverted 180 deg, Digital UI Optimized) -->
        <g transform="rotate(180 50 70)">
          <text x="13.14" y="21.57" font-family="'Cinzel', Georgia, 'Times New Roman', serif" font-weight="800" font-size="17.4" ${card.rankName === '10' ? 'textLength="13.7" lengthAdjust="spacingAndGlyphs"' : ''} text-anchor="middle" fill="${colorHex}">${card.rankName}</text>
          <g transform="translate(7.57, 24.86) scale(0.1114)" color="${colorHex}">
            ${suitSvgPath}
          </g>
        </g>
        
        <!-- Main Card Center Area -->
        ${innerContent}
      </svg>
    `;
  }

  static _renderNumberCardPips(rank, suitSvgPath, colorHex) {
    const count = rank + 1; // 2..10
    const pips = [];

    const addPip = (x, y, scale = 0.22, flip = false) => {
      const transform = flip 
        ? `translate(${x + 10}, ${y + 10}) scale(${scale}) rotate(180 50 50)`
        : `translate(${x}, ${y}) scale(${scale})`;
      pips.push(`<g transform="${transform}" color="${colorHex}">${suitSvgPath}</g>`);
    };

    // Standard playing card pip geometry coordinate tables
    switch (count) {
      case 2:
        addPip(39, 28);
        addPip(39, 90, 0.22, true);
        break;
      case 3:
        addPip(39, 28);
        addPip(39, 59);
        addPip(39, 90, 0.22, true);
        break;
      case 4:
        addPip(26, 28);
        addPip(52, 28);
        addPip(26, 90, 0.22, true);
        addPip(52, 90, 0.22, true);
        break;
      case 5:
        addPip(26, 28);
        addPip(52, 28);
        addPip(39, 59);
        addPip(26, 90, 0.22, true);
        addPip(52, 90, 0.22, true);
        break;
      case 6:
        addPip(26, 28);
        addPip(52, 28);
        addPip(26, 59);
        addPip(52, 59);
        addPip(26, 90, 0.22, true);
        addPip(52, 90, 0.22, true);
        break;
      case 7:
        addPip(26, 28);
        addPip(52, 28);
        addPip(39, 43);
        addPip(26, 59);
        addPip(52, 59);
        addPip(26, 90, 0.22, true);
        addPip(52, 90, 0.22, true);
        break;
      case 8:
        addPip(26, 28);
        addPip(52, 28);
        addPip(39, 43);
        addPip(26, 59);
        addPip(52, 59);
        addPip(39, 75, 0.22, true);
        addPip(26, 90, 0.22, true);
        addPip(52, 90, 0.22, true);
        break;
      case 9:
        addPip(26, 26);
        addPip(52, 26);
        addPip(26, 48);
        addPip(52, 48);
        addPip(39, 59);
        addPip(26, 70, 0.22, true);
        addPip(52, 70, 0.22, true);
        addPip(26, 92, 0.22, true);
        addPip(52, 92, 0.22, true);
        break;
      case 10:
        addPip(26, 24);
        addPip(52, 24);
        addPip(39, 36);
        addPip(26, 48);
        addPip(52, 48);
        addPip(26, 72, 0.22, true);
        addPip(52, 72, 0.22, true);
        addPip(39, 82, 0.22, true);
        addPip(26, 94, 0.22, true);
        addPip(52, 94, 0.22, true);
        break;
    }

    return pips.join('\n');
  }
}
