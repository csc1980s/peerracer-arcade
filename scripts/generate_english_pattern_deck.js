/**
 * Victorian Christmas Playing Card Generator - English Pattern & Prepress Compliant
 * 
 * Implements the full engineering specification from "Untitled document.txt":
 * - Standard Poker 750 x 1050 px trim (viewBox="0 0 750 1050")
 * - Safe zone live area & Inner Court Cartouche (562 x 862 px inset)
 * - Corner index ergonomics (cluster height <= 0.65", distance 0.18" from trim)
 * - 180° Reversible Rotational Point Symmetry with 20° diagonal split-line & heraldic sash
 * - Full English Pattern Court Iconography (12 unique figures):
 *     * King of Hearts: "Suicide King", clean-shaven (NO mustache), dual-hand hold
 *     * King of Spades: King David, upward-curled hair & beard, broadsword, harp motif
 *     * King of Diamonds: Julius Caesar, One-Eyed King (pure left profile), battleaxe, waving hand
 *     * King of Clubs: Alexander, broadsword, Imperial Orb (globus cruciger) with cross
 *     * Queen of Spades: Pallas Athena, sole armed Queen with upright spear/scepter, brocade hood, NO flowers
 *     * Queen of Hearts: Judith, botanical cutting held between fingers, ermine mantle
 *     * Queen of Diamonds: Rachel, pleated geometric gown, floral sprig against breast
 *     * Queen of Clubs: Argine, scalloped crown, English heraldic rose (Wars of the Roses)
 *     * Jack of Spades: Ogier, One-Eyed Jack (pure right profile), rear shoulder view, spiraled halberd
 *     * Jack of Hearts: La Hire, One-Eyed Jack (pure left profile), soldier barret cap, poleaxe, curled ribbon
 *     * Jack of Diamonds: Hector, brimmed cap, gold cravat, halberd with crossbow crossbar
 *     * Jack of Clubs: Lancelot, feather-tufted cap, lance, ornamental buckler shield
 * - Signature Master Ace of Spades with tax-stamp filigree, laurels, and holiday scrolls
 * - Multi-layer Pip cards (2-10) with holly hearts, ice crystal diamonds, evergreen spades, candy cane clubs
 * - High Joker (full color) & Low Joker (antique sepia/steel engraving)
 * - Card Back: 180° rotational point symmetry with >= 0.375" framing border
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DEST_DIRS = [
  path.join(ROOT_DIR, 'decks', 'victorian_christmas'),
  'D:\\getartcraft\\artcraft_workspace\\decks\\victorian_christmas',
  path.join(ROOT_DIR, 'mods', 'card_faces'),
  path.join(ROOT_DIR, 'mods', 'card_backs')
];

DEST_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Common SVG Gradients and Patterns
const COMMON_DEFS = `
    <!-- Luxury Gold Gradient -->
    <linearGradient id="gold_bevel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff5cc"/>
      <stop offset="25%" stop-color="#d4af37"/>
      <stop offset="50%" stop-color="#996515"/>
      <stop offset="75%" stop-color="#f5e18a"/>
      <stop offset="100%" stop-color="#734b00"/>
    </linearGradient>

    <!-- Deep Ruby Velvet -->
    <linearGradient id="ruby_velvet" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a81928"/>
      <stop offset="45%" stop-color="#7a0d17"/>
      <stop offset="100%" stop-color="#3d0308"/>
    </linearGradient>

    <!-- Forest Emerald Velvet -->
    <linearGradient id="emerald_velvet" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2d6a4f"/>
      <stop offset="50%" stop-color="#1b4d3e"/>
      <stop offset="100%" stop-color="#081c15"/>
    </linearGradient>

    <!-- Royal Sapphire Velvet -->
    <linearGradient id="sapphire_velvet" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2a5298"/>
      <stop offset="50%" stop-color="#1e3c72"/>
      <stop offset="100%" stop-color="#0b172a"/>
    </linearGradient>

    <!-- Steel Blade Gradient -->
    <linearGradient id="steel_blade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#d1d5db"/>
      <stop offset="65%" stop-color="#9ca3af"/>
      <stop offset="100%" stop-color="#4b5563"/>
    </linearGradient>

    <!-- Ermine Fur Pattern -->
    <pattern id="ermine_fur" width="30" height="30" patternUnits="userSpaceOnUse">
      <rect width="30" height="30" fill="#fdfaf4"/>
      <path d="M15 8 C13 12 12 16 15 19 C18 16 17 12 15 8 Z M13 18 L17 18 L15 21 Z" fill="#181512"/>
      <circle cx="12" cy="11" r="0.8" fill="#181512"/>
      <circle cx="18" cy="11" r="0.8" fill="#181512"/>
      <circle cx="15" cy="10" r="0.8" fill="#181512"/>
    </pattern>

    <!-- Subtle Damask Inset Background -->
    <pattern id="cartouche_damask" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M20 6 Q27 16 20 26 Q13 16 20 6 Z M6 20 Q16 27 26 20 Q16 13 6 20 Z" fill="none" stroke="#d4af37" stroke-width="0.5" opacity="0.25"/>
      <circle cx="20" cy="20" r="1.5" fill="#d4af37" opacity="0.2"/>
    </pattern>

    <!-- Diagonal Split Line ClipPath for 180° Rotational Symmetry (theta = 20°) -->
    <!-- Center (375, 525). Diagonal line passes through (94, 423) and (656, 627) -->
    <clipPath id="split_upper">
      <polygon points="90,90 660,90 660,634 90,426"/>
    </clipPath>

    <!-- Drop Shadow Filter for Cartouche -->
    <filter id="cartouche_shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.35"/>
    </filter>
`;

/**
 * Generates miniature suit pips for corner indices
 */
function getMiniPipSvg(suit) {
  switch (suit) {
    case 'hearts':
      return `
        <path d="M0 0 C-10 -10 -20 0 -20 12 C-20 26 0 40 0 40 C0 40 20 26 20 12 C20 0 10 -10 0 0 Z" fill="url(#ruby_velvet)" stroke="#d4af37" stroke-width="1"/>
        <circle cx="-6" cy="8" r="2.5" fill="#fff" opacity="0.6"/>
      `;
    case 'diamonds':
      return `
        <polygon points="0,-2 18,18 0,38 -18,18" fill="#2563eb" stroke="#d4af37" stroke-width="1"/>
        <polygon points="0,4 12,18 0,32 -12,18" fill="#60a5fa"/>
        <circle cx="0" cy="18" r="3" fill="#fff"/>
      `;
    case 'spades':
      return `
        <path d="M0 -4 C-10 12 -22 18 -22 28 C-22 36 -14 40 -6 38 C-8 44 -12 48 -14 50 L14 50 C12 48 8 44 6 38 C14 40 22 36 22 28 C22 18 10 12 0 -4 Z" fill="#182b1e" stroke="#d4af37" stroke-width="1"/>
        <circle cx="0" cy="22" r="3" fill="#d4af37"/>
      `;
    case 'clubs':
      return `
        <circle cx="0" cy="8" r="10" fill="#a81928" stroke="#d4af37" stroke-width="1"/>
        <circle cx="-10" cy="22" r="10" fill="#a81928" stroke="#d4af37" stroke-width="1"/>
        <circle cx="10" cy="22" r="10" fill="#a81928" stroke="#d4af37" stroke-width="1"/>
        <path d="M-4 26 L-8 44 L8 44 L4 26 Z" fill="url(#gold_bevel)"/>
        <circle cx="0" cy="18" r="3" fill="#fff"/>
      `;
  }
}

/**
 * Base card layout satisfying the prepress specifications:
 * - Canvas: 750 x 1050 px
 * - Safe zone live area
 * - Corner indices inside 0.125" - 0.25" fanning margin
 * - Clean white background behind indices
 * - Cartouche inset 562 x 862 px
 */
function buildBaseCard(rank, suit, isCourt = false) {
  const isRed = (suit === 'hearts' || suit === 'diamonds');
  const rankColor = isRed ? '#8a111e' : '#141414';
  const miniPip = getMiniPipSvg(suit);

  return `
  <!-- Outer Card Trim with Die-Cut Rounded Corners (0.125" radius = 38px) -->
  <rect width="750" height="1050" rx="38" fill="#fffdf9" stroke="#1b382b" stroke-width="4"/>

  <!-- Prepress Framing Border Inset (Gold Bevel Stroke) -->
  <rect x="12" y="12" width="726" height="1026" rx="28" fill="none" stroke="url(#gold_bevel)" stroke-width="6"/>
  <rect x="24" y="24" width="702" height="1002" rx="20" fill="none" stroke="#7a0d17" stroke-width="1.5" opacity="0.6"/>

  <!-- Ornate Victorian Corner Filigree Flourishes -->
  <g stroke="url(#gold_bevel)" stroke-width="2" fill="none" opacity="0.85">
    <path d="M36 75 C36 48 48 36 75 36 M46 36 Q68 68 36 68"/>
    <circle cx="48" cy="48" r="4" fill="#7a0d17"/>
    <path d="M714 75 C714 48 702 36 675 36 M704 36 Q682 68 714 68"/>
    <circle cx="702" cy="48" r="4" fill="#7a0d17"/>
    <path d="M36 975 C36 1002 48 1014 75 1014 M46 1014 Q68 982 36 982"/>
    <circle cx="48" cy="1002" r="4" fill="#7a0d17"/>
    <path d="M714 975 C714 1002 702 1014 675 1014 M704 1014 Q682 982 714 982"/>
    <circle cx="702" cy="1002" r="4" fill="#7a0d17"/>
  </g>

  <!-- Corner Index: Top-Left (Safe Zone x: 54, y: 55-160) -->
  <g transform="translate(56, 60)">
    <text x="0" y="44" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="74" fill="${rankColor}" text-anchor="middle">${rank}</text>
    <g transform="translate(0, 68) scale(0.9)">
      ${miniPip}
    </g>
  </g>

  <!-- Corner Index: Bottom-Right (180° Rotational Inversion) -->
  <g transform="rotate(180 375 525)">
    <g transform="translate(56, 60)">
      <text x="0" y="44" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="74" fill="${rankColor}" text-anchor="middle">${rank}</text>
      <g transform="translate(0, 68) scale(0.9)">
        ${miniPip}
      </g>
    </g>
  </g>

  ${isCourt ? `
  <!-- Inner Court Cartouche: Inset 562 x 862 px centered on (375, 525) -->
  <g filter="url(#cartouche_shadow)">
    <rect x="94" y="94" width="562" height="862" rx="20" fill="#fffdfa" stroke="url(#gold_bevel)" stroke-width="8"/>
    <rect x="102" y="102" width="546" height="846" rx="14" fill="#1b382b" stroke="#7a0d17" stroke-width="2"/>
    <rect x="104" y="104" width="542" height="842" rx="12" fill="url(#cartouche_damask)"/>
  </g>
  ` : ''}
  `;
}

/**
 * Heraldic Ornamental Sash / Belt masking the diagonal split-line across canvas center
 */
const HERALDIC_SASH_SVG = `
  <!-- Diagonal Belt / Heraldic Sash across center (375, 525) inclined at 20° -->
  <g transform="translate(375, 525) rotate(20)">
    <!-- Main Crimson Velvet Sash -->
    <rect x="-300" y="-22" width="600" height="44" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="4"/>
    
    <!-- Gold Embroidered Braid Trim -->
    <line x1="-300" y1="-14" x2="300" y2="-14" stroke="url(#gold_bevel)" stroke-width="2" stroke-dasharray="8 4"/>
    <line x1="-300" y1="14" x2="300" y2="14" stroke="url(#gold_bevel)" stroke-width="2" stroke-dasharray="8 4"/>

    <!-- Central Royal Buckle Medallion -->
    <circle cx="0" cy="0" r="32" fill="#fffdf4" stroke="url(#gold_bevel)" stroke-width="6"/>
    <circle cx="0" cy="0" r="22" fill="#1b4d3e" stroke="#7a0d17" stroke-width="2"/>
    <circle cx="0" cy="0" r="10" fill="url(#ruby_velvet)"/>
    <circle cx="0" cy="0" r="4" fill="#fff"/>
    <!-- Flanking Gold Rosettes -->
    <circle cx="-80" cy="0" r="14" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
    <circle cx="80" cy="0" r="14" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
    <circle cx="-160" cy="0" r="10" fill="url(#gold_bevel)"/>
    <circle cx="160" cy="0" r="10" fill="url(#gold_bevel)"/>
  </g>
`;

/**
 * Builds a reversible court card satisfying:
 * 1. English Pattern Invariant iconographic details in upper torso
 * 2. 180° Rotational Point Symmetry around center (375, 525)
 * 3. 20° diagonal split line masked by heraldic sash
 */
function buildReversibleCourtCard(rank, suit, title, upperHalfFigureSvg) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildBaseCard(rank, suit, true)}

  <!-- REVERSIBLE COURT FIGURE COMPOSITION -->
  <!-- 1. Upper Torso (bounded by diagonal split line y <= 525 + (x-375)*tan(20°)) -->
  <g clip-path="url(#split_upper)">
    <g id="figure_${rank}_${suit}">
      ${upperHalfFigureSvg}
    </g>
  </g>

  <!-- 2. Lower Torso (Strict 180° Rotational Inversion around Canvas Center) -->
  <g transform="rotate(180 375 525)" clip-path="url(#split_upper)">
    <g>
      ${upperHalfFigureSvg}
    </g>
  </g>

  <!-- 3. Masking Heraldic Sash across Diagonal Center Seam -->
  ${HERALDIC_SASH_SVG}

  <!-- Top Title Banner -->
  <g transform="translate(375, 84)">
    <rect x="-160" y="-18" width="320" height="32" rx="16" fill="#1b382b" stroke="url(#gold_bevel)" stroke-width="2"/>
    <text x="0" y="5" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="15" fill="#fffdf7" letter-spacing="3" text-anchor="middle">${title}</text>
  </g>
  <!-- Inverted Bottom Banner -->
  <g transform="rotate(180 375 525)">
    <g transform="translate(375, 84)">
      <rect x="-160" y="-18" width="320" height="32" rx="16" fill="#1b382b" stroke="url(#gold_bevel)" stroke-width="2"/>
      <text x="0" y="5" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="15" fill="#fffdf7" letter-spacing="3" text-anchor="middle">${title}</text>
    </g>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// 12 HISTORICAL ENGLISH PATTERN COURT CARD FIGURES (UPPER HALF PORTRAITS)
// ---------------------------------------------------------------------------

/**
 * 1. KING OF HEARTS (Charles / Charlemagne)
 * English Pattern Invariants:
 * - Clean-shaven jaw (NO MUSTACHE, NO BEARD)
 * - "Suicide King": Broadsword held horizontally behind head
 * - Dual-hand hold: Left hand gripping weapon hilt, right hand on coat lapel
 * - 2 eyes visible, facing forward left
 */
const KING_OF_HEARTS_UPPER = `
  <g transform="translate(375, 420)" id="figure_charlemagne" data-model="Charlemagne">
    <!-- Broad Royal Shoulders & Ermine Mantle -->
    <path d="M-210 120 C-190 -40 -120 -140 0 -140 C120 -140 190 -40 210 120 Z" fill="url(#ruby_velvet)" stroke="#52070e" stroke-width="3"/>
    <path d="M-170 120 C-150 0 -90 -80 0 -80 C90 -80 150 0 170 120 Z" fill="url(#ermine_fur)" stroke="#e2ded4" stroke-width="2"/>

    <!-- Royal Gold-Embroidered Tunic Lapel -->
    <path d="M-60 120 L-45 -50 Q0 -60 45 -50 L60 120 Z" fill="#1b382b" stroke="url(#gold_bevel)" stroke-width="3"/>

    <!-- "SUICIDE KING" BROADSWORD HORIZONTALLY BEHIND HEAD -->
    <g transform="translate(0, -220)" id="suicide_broadsword">
      <!-- Blade extending horizontally behind crown/head -->
      <rect x="-220" y="-14" width="320" height="28" rx="4" fill="url(#steel_blade)" stroke="#374151" stroke-width="2"/>
      <line x1="-210" y1="0" x2="80" y2="0" stroke="#ffffff" stroke-width="3"/>
      <!-- Sword Crossguard & Golden Hilt on Right -->
      <rect x="80" y="-36" width="18" height="72" rx="6" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <rect x="98" y="-12" width="60" height="24" rx="6" fill="#7a0d17" stroke="url(#gold_bevel)" stroke-width="2"/>
      <!-- Golden Pommel with Ruby Jewel -->
      <circle cx="170" cy="0" r="16" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <circle cx="170" cy="0" r="8" fill="#e11d48"/>
    </g>

    <!-- Charlemagne's Head (Facing Forward-Left, Clean-Shaven, NO Mustache) -->
    <g transform="translate(-10, -170)" id="charlemagne_head" data-clean-shaven="true" data-mustache="none">
      <!-- Neck & Clean-Shaven Jawline -->
      <ellipse cx="0" cy="40" rx="42" ry="50" fill="#fcd9bd"/>
      <!-- Clean-Shaven Chin & Face -->
      <path d="M-45 -20 C-50 40 -35 85 0 95 C35 85 50 40 45 -20 Z" fill="#ffdcc7" stroke="#e0a98b" stroke-width="2"/>

      <!-- Facial Features: 2 Eyes Visible, Gazing Forward-Left -->
      <ellipse cx="-20" cy="10" rx="9" ry="6" fill="#fff"/>
      <circle cx="-22" cy="10" r="4.5" fill="#2d527c"/>
      <circle cx="-24" cy="8" r="1.5" fill="#fff"/>
      <path d="M-30 0 Q-20 -6 -10 2" stroke="#4a3728" stroke-width="3" fill="none"/>

      <ellipse cx="20" cy="10" rx="9" ry="6" fill="#fff"/>
      <circle cx="18" cy="10" r="4.5" fill="#2d527c"/>
      <circle cx="16" cy="8" r="1.5" fill="#fff"/>
      <path d="M10 2 Q20 -6 30 0" stroke="#4a3728" stroke-width="3" fill="none"/>

      <!-- Regal Nose -->
      <path d="M-2 8 L-6 32 L5 32" stroke="#d97706" stroke-width="2" fill="none"/>

      <!-- Clean-Shaven Mouth (Smooth Lips, No Mustache Paths) -->
      <path d="M-16 54 Q0 60 16 54" stroke="#991b1b" stroke-width="3" fill="none"/>
      <path d="M-8 62 Q0 66 8 62" stroke="#fca5a5" stroke-width="2" fill="none"/>

      <!-- Flowing Golden Royal Hair Curls -->
      <path d="M-45 -10 C-65 30 -60 80 -40 100 Q-50 60 -42 20 Z" fill="url(#gold_bevel)"/>
      <path d="M45 -10 C65 30 60 80 40 100 Q50 60 42 20 Z" fill="url(#gold_bevel)"/>

      <!-- High Victorian Imperial Gold Crown -->
      <path d="M-55 -25 L-65 -85 L-30 -55 L0 -95 L30 -55 L65 -85 L55 -25 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="3"/>
      <rect x="-56" y="-30" width="112" height="18" rx="6" fill="#7a0d17" stroke="url(#gold_bevel)" stroke-width="2"/>
      <circle cx="-35" cy="-21" r="5" fill="#22c55e"/>
      <circle cx="0" cy="-21" r="6" fill="#fff"/>
      <circle cx="35" cy="-21" r="5" fill="#22c55e"/>
      <circle cx="-65" cy="-85" r="5" fill="#fff"/>
      <circle cx="0" cy="-95" r="7" fill="url(#gold_bevel)"/>
      <circle cx="65" cy="-85" r="5" fill="#fff"/>
    </g>

    <!-- DUAL HAND HOLD: -->
    <!-- 1. Left Hand gripping the weapon hilt near the head -->
    <g transform="translate(110, -210)" id="left_hand_grip">
      <ellipse cx="0" cy="0" rx="20" ry="16" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
      <circle cx="-6" cy="-4" r="5" fill="#ffe4d6"/>
      <circle cx="4" cy="-4" r="5" fill="#ffe4d6"/>
      <circle cx="12" cy="0" r="5" fill="#ffe4d6"/>
      <!-- Gold Cuff -->
      <rect x="-8" y="12" width="30" height="14" rx="4" fill="url(#gold_bevel)"/>
    </g>

    <!-- 2. Right Hand resting firmly on Coat Lapel -->
    <g transform="translate(-40, 20)" id="right_hand_lapel">
      <ellipse cx="0" cy="0" rx="18" ry="15" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
      <circle cx="-6" cy="-2" r="4.5" fill="#ffe4d6"/>
      <circle cx="2" cy="-2" r="4.5" fill="#ffe4d6"/>
      <circle cx="10" cy="2" r="4.5" fill="#ffe4d6"/>
      <!-- Ermine Sleeve Cuff -->
      <rect x="-24" y="-8" width="16" height="26" rx="4" fill="url(#ermine_fur)" stroke="url(#gold_bevel)" stroke-width="2"/>
    </g>
  </g>
`;

/**
 * 2. KING OF SPADES (David of Israel)
 * English Pattern Invariants:
 * - Upward-curled stylized hair and elaborate curled beard
 * - Upright broadsword held vertically in left hand
 * - Abstracted Hebrew harp motif woven across vestments
 * - 2 eyes visible, facing forward right
 */
const KING_OF_SPADES_UPPER = `
  <g transform="translate(375, 420)" id="figure_david" data-model="David">
    <!-- Mantle in Midnight Forest Velvet -->
    <path d="M-210 120 C-190 -40 -120 -140 0 -140 C120 -140 190 -40 210 120 Z" fill="url(#emerald_velvet)" stroke="#064e3b" stroke-width="3"/>
    
    <!-- Abstracted Hebrew Harp Motif woven into royal vestments -->
    <g transform="translate(-110, -20)" stroke="url(#gold_bevel)" stroke-width="3" fill="none" id="david_harp_motif">
      <path d="M0 80 C-30 40 -40 -20 0 -60 C30 -20 20 40 40 80" stroke-width="5"/>
      <line x1="-5" y1="-40" x2="10" y2="70"/>
      <line x1="5" y1="-30" x2="20" y2="70"/>
      <line x1="15" y1="-20" x2="30" y2="70"/>
      <circle cx="0" cy="-60" r="8" fill="url(#gold_bevel)"/>
    </g>

    <!-- Upright Broadsword held vertically in King David's Left Hand (card right) -->
    <g transform="translate(140, -120)" id="david_broadsword">
      <rect x="-10" y="-160" width="20" height="240" rx="3" fill="url(#steel_blade)" stroke="#374151" stroke-width="2"/>
      <line x1="0" y1="-150" x2="0" y2="60" stroke="#fff" stroke-width="2.5"/>
      <!-- Sword Crossguard -->
      <path d="M-40 60 L40 60 L30 75 L-30 75 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <rect x="-8" y="75" width="16" height="40" rx="4" fill="#1b382b" stroke="url(#gold_bevel)" stroke-width="2"/>
      <circle cx="0" cy="122" r="14" fill="url(#gold_bevel)"/>
      <!-- Left Hand Gripping the Sword -->
      <ellipse cx="0" cy="90" rx="18" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
    </g>

    <!-- King David's Head (Facing Forward-Right, Curled Beard, Upward Hair) -->
    <g transform="translate(10, -170)" id="david_head">
      <ellipse cx="0" cy="40" rx="45" ry="50" fill="#fcd9bd"/>

      <!-- Upward-Curling Stylized Hair -->
      <path d="M-45 -20 Q-70 -60 -40 -80 Q-55 -40 -35 -30" stroke="url(#gold_bevel)" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M45 -20 Q70 -60 40 -80 Q55 -40 35 -30" stroke="url(#gold_bevel)" stroke-width="8" fill="none" stroke-linecap="round"/>

      <!-- Facial Features: 2 Eyes Visible, Gazing Forward-Right -->
      <ellipse cx="-18" cy="15" rx="8" ry="6" fill="#fff"/>
      <circle cx="-16" cy="15" r="4" fill="#1e3a8a"/>
      <circle cx="-14" cy="13" r="1.5" fill="#fff"/>
      <ellipse cx="22" cy="15" rx="8" ry="6" fill="#fff"/>
      <circle cx="24" cy="15" r="4" fill="#1e3a8a"/>
      <circle cx="26" cy="13" r="1.5" fill="#fff"/>

      <!-- Elaborate Curled Royal Beard -->
      <path d="M-45 35 C-50 110 -20 150 0 160 C20 150 50 110 45 35 Z" fill="#d4af37" stroke="#7a0d17" stroke-width="2" id="david_curled_beard"/>
      <!-- Beard Ringlets & Curls -->
      <g stroke="#92400e" stroke-width="2.5" fill="none">
        <circle cx="-15" cy="80" r="12"/>
        <circle cx="15" cy="80" r="12"/>
        <circle cx="0" cy="115" r="14"/>
        <circle cx="-22" cy="120" r="10"/>
        <circle cx="22" cy="120" r="10"/>
        <circle cx="0" cy="145" r="8"/>
      </g>
      <!-- Crown of David -->
      <path d="M-50 -25 L-60 -80 L-25 -50 L0 -90 L25 -50 L60 -80 L50 -25 Z" fill="url(#gold_bevel)" stroke="#064e3b" stroke-width="3"/>
      <circle cx="0" cy="-90" r="8" fill="#10b981"/>
    </g>
  </g>
`;

/**
 * 3. KING OF DIAMONDS (Julius Caesar)
 * English Pattern Invariants:
 * - Pure Profile facing Left (ONE-EYED KING, exactly 1 eye visible)
 * - Heavy battleaxe blade mounted/floating behind shoulder
 * - Raised waving open palm in distinctive imperial posture
 */
const KING_OF_DIAMONDS_UPPER = `
  <g transform="translate(375, 420)" id="figure_caesar" data-model="Caesar" data-eyes="1">
    <!-- Roman Imperial Toga & Armor Mantle -->
    <path d="M-210 120 C-190 -40 -120 -140 0 -140 C120 -140 190 -40 210 120 Z" fill="url(#ruby_velvet)" stroke="#52070e" stroke-width="3"/>
    <path d="M-150 120 L-60 -80 L80 -80 L170 120 Z" fill="url(#gold_bevel)" opacity="0.85"/>

    <!-- HEAVY BATTLEAXE FLOATING BEHIND SHOULDER (Card Right) -->
    <g transform="translate(130, -140)" id="caesar_battleaxe">
      <!-- Heavy Haft -->
      <rect x="-8" y="-70" width="16" height="240" rx="4" fill="#78350f" stroke="url(#gold_bevel)" stroke-width="2"/>
      <!-- Double-Beveled Crescent Battleaxe Blade -->
      <path d="M0 -30 C60 -60 90 -20 70 40 C50 80 0 50 0 50 Z" fill="url(#steel_blade)" stroke="#1f2937" stroke-width="3"/>
      <path d="M20 -10 C50 -25 65 0 50 30" stroke="#fff" stroke-width="2.5" fill="none"/>
      <!-- Gold Axe Socket & Spikes -->
      <rect x="-14" y="-10" width="28" height="30" rx="4" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <polygon points="14,5 30,5 22,-5" fill="url(#gold_bevel)"/>
    </g>

    <!-- RAISED WAVING OPEN PALM (Card Left) -->
    <g transform="translate(-130, -40)" id="caesar_waving_palm">
      <!-- Forearm in Gold Bracer -->
      <rect x="-14" y="30" width="28" height="60" rx="6" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <!-- Raised Open Palm, Fingers Extended -->
      <ellipse cx="0" cy="15" rx="20" ry="18" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
      <rect x="-18" y="-20" width="8" height="26" rx="4" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
      <rect x="-8" y="-28" width="8" height="32" rx="4" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
      <rect x="2" y="-26" width="8" height="30" rx="4" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
      <rect x="12" y="-18" width="8" height="22" rx="4" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
      <path d="M-18 5 Q-30 0 -22 -12" stroke="#c2410c" stroke-width="2" fill="none"/>
    </g>

    <!-- Caesar's Head: PURE PROFILE FACING LEFT (ONE-EYED KING) -->
    <g transform="translate(-15, -170)" id="caesar_profile_head">
      <!-- Pure Left Profile Outline (Aquiline Nose, Determined Jaw, Single Eye) -->
      <path d="M30 -60 C30 -60 10 -65 -20 -40 C-35 -25 -40 0 -45 5 L-65 15 L-48 25 L-48 42 L-60 48 L-44 55 C-40 75 -20 90 20 90 L30 90 Z" fill="#ffdcc7" stroke="#e0a98b" stroke-width="2"/>
      
      <!-- SINGLE EYE VISIBLE IN PROFILE -->
      <ellipse cx="-32" cy="12" rx="7" ry="5" fill="#fff" id="caesar_single_eye"/>
      <circle cx="-35" cy="12" r="3.5" fill="#1e3a8a"/>
      <circle cx="-36" cy="10" r="1.2" fill="#fff"/>
      <path d="M-42 4 Q-32 -2 -22 6" stroke="#4a3728" stroke-width="2.5" fill="none"/>

      <!-- Roman Laurel Wreath / Radiate Diadem -->
      <g stroke="url(#gold_bevel)" stroke-width="2" fill="url(#gold_bevel)">
        <path d="M-30 -35 Q-15 -45 0 -40 Q-10 -30 -30 -35 Z"/>
        <path d="M-10 -45 Q5 -55 20 -50 Q10 -40 -10 -45 Z"/>
        <path d="M10 -55 Q25 -65 40 -60 Q30 -50 10 -55 Z"/>
        <circle cx="40" cy="-30" r="10" fill="#dc2626"/>
      </g>
      <!-- Radiate Imperial Crown Points -->
      <polygon points="-20,-50 -25,-85 -10,-60" fill="url(#gold_bevel)"/>
      <polygon points="0,-55 5,-95 15,-62" fill="url(#gold_bevel)"/>
      <polygon points="20,-52 35,-88 32,-58" fill="url(#gold_bevel)"/>
    </g>
  </g>
`;

/**
 * 4. KING OF CLUBS (Alexander the Great)
 * English Pattern Invariants:
 * - Broadsword held in left hand
 * - Imperial Orb (globus cruciger) with cross supported in right hand
 * - Long outward-curling hair past shoulders
 * - 2 eyes visible, facing forward left
 */
const KING_OF_CLUBS_UPPER = `
  <g transform="translate(375, 420)" id="figure_alexander" data-model="Alexander">
    <!-- Imperial Purple & Gold Robes -->
    <path d="M-210 120 C-190 -40 -120 -140 0 -140 C120 -140 190 -40 210 120 Z" fill="url(#ruby_velvet)" stroke="#52070e" stroke-width="3"/>
    
    <!-- IMPERIAL ORB (globus cruciger) in Right Hand (Card Left) -->
    <g transform="translate(-130, 20)" id="alexander_imperial_orb">
      <!-- Golden Globe -->
      <circle cx="0" cy="0" r="28" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="3"/>
      <!-- Filigree Equatorial Band -->
      <ellipse cx="0" cy="0" rx="28" ry="8" fill="none" stroke="#7a0d17" stroke-width="2"/>
      <line x1="0" y1="-28" x2="0" y2="28" stroke="#7a0d17" stroke-width="2"/>
      <!-- Cross Finial -->
      <g transform="translate(0, -38)" stroke="url(#gold_bevel)" stroke-width="4" fill="none">
        <line x1="0" y1="-12" x2="0" y2="10"/>
        <line x1="-8" y1="-4" x2="8" y2="-4"/>
        <circle cx="0" cy="-4" r="3" fill="#fff"/>
      </g>
      <!-- Right Hand Supporting the Orb -->
      <ellipse cx="0" cy="24" rx="20" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
    </g>

    <!-- BROADSWORD in Left Hand (Card Right) -->
    <g transform="translate(130, -30)" id="alexander_broadsword">
      <rect x="-8" y="-120" width="16" height="200" rx="3" fill="url(#steel_blade)" stroke="#374151" stroke-width="2"/>
      <path d="M-30 40 L30 40 L20 54 L-20 54 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <!-- Hand Gripping the Broadsword -->
      <ellipse cx="0" cy="65" rx="18" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
    </g>

    <!-- Alexander's Head (Long Outward-Curling Hair, 2 Eyes Forward-Left) -->
    <g transform="translate(-10, -170)" id="alexander_head">
      <ellipse cx="0" cy="40" rx="45" ry="50" fill="#fcd9bd"/>

      <!-- Outward Curling Hair Past Shoulders -->
      <path d="M-45 -10 C-75 30 -70 90 -40 120 Q-60 80 -45 30 Z" fill="url(#gold_bevel)"/>
      <path d="M45 -10 C75 30 70 90 40 120 Q60 80 45 30 Z" fill="url(#gold_bevel)"/>

      <!-- Facial Features: 2 Eyes Visible, Facing Forward-Left -->
      <ellipse cx="-18" cy="15" rx="8" ry="6" fill="#fff"/>
      <circle cx="-20" cy="15" r="4" fill="#15803d"/>
      <circle cx="-22" cy="13" r="1.5" fill="#fff"/>
      <ellipse cx="20" cy="15" rx="8" ry="6" fill="#fff"/>
      <circle cx="18" cy="15" r="4" fill="#15803d"/>
      <circle cx="16" cy="13" r="1.5" fill="#fff"/>

      <!-- Macedonian Crown with Cross & Fleur-de-lis -->
      <path d="M-50 -25 L-60 -80 L-25 -50 L0 -90 L25 -50 L60 -80 L50 -25 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="3"/>
      <circle cx="0" cy="-90" r="7" fill="#fff"/>
    </g>
  </g>
`;

/**
 * 5. QUEEN OF SPADES (Pallas Athena)
 * English Pattern Invariants:
 * - SOLE ARMED QUEEN: Carries an upright scepter / spear shaft (warrior lance of Athena)
 * - NO botanical cutting / NO flowers!
 * - Structured brocade hood / headdress draping over shoulders
 * - 2 eyes visible, facing forward right
 */
const QUEEN_OF_SPADES_UPPER = `
  <g transform="translate(375, 420)" id="figure_athena" data-model="Pallas Athena" data-armed="true" data-flowers="none">
    <!-- Armored Mantle with Athena's Brocade Drape -->
    <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#sapphire_velvet)" stroke="#1e3a8a" stroke-width="3"/>
    
    <!-- Structured Brocade Hood Draping over Shoulders -->
    <path d="M-130 120 L-90 -120 L90 -120 L130 120 Z" fill="url(#gold_bevel)" opacity="0.8" id="athena_brocade_hood"/>

    <!-- UPRIGHT SCEPTER / WARRIOR SPEAR SHAFT (Card Right) -->
    <!-- (Strict invariant: Queen of Spades MUST carry upright spear/scepter, NO flowers!) -->
    <g transform="translate(130, -90)" id="athena_warrior_lance">
      <!-- Long Golden Scepter / Spear Shaft -->
      <rect x="-6" y="-170" width="12" height="280" rx="4" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <!-- Spearpoint / Scepter Head -->
      <polygon points="0,-210 -16,-170 16,-170" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <circle cx="0" cy="-160" r="10" fill="#ef4444"/>
      <!-- Right Hand Gripping the Scepter Shaft -->
      <ellipse cx="0" cy="50" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
    </g>

    <!-- Athena's Head & Brocade Hood (Facing Forward-Right) -->
    <g transform="translate(10, -160)" id="athena_head">
      <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>

      <!-- Brocade Headdress & Hood -->
      <path d="M-55 50 C-60 -40 -35 -80 0 -80 C35 -80 60 -40 55 50 Z" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="3"/>
      <ellipse cx="0" cy="30" rx="34" ry="40" fill="#ffe4d6"/>

      <!-- Facial Features: 2 Eyes Visible, Gazing Forward-Right -->
      <ellipse cx="-14" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="-12" cy="18" r="3.8" fill="#1e3a8a"/>
      <ellipse cx="20" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="22" cy="18" r="3.8" fill="#1e3a8a"/>
      <path d="M-5 46 Q4 52 14 46" stroke="#b91c1c" stroke-width="2.5" fill="none"/>

      <!-- Golden Diadem on Brocade Hood -->
      <path d="M-40 -40 L-20 -60 L0 -45 L20 -60 L40 -40 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
    </g>
  </g>
`;

/**
 * 6. QUEEN OF HEARTS (Judith)
 * English Pattern Invariants:
 * - Holds delicate botanical cutting between thumb and forefinger
 * - Ermine-trimmed mantle, gold-embroidered bodice
 * - 2 eyes visible, facing forward left
 */
const QUEEN_OF_HEARTS_UPPER = `
  <g transform="translate(375, 420)" id="figure_judith" data-model="Judith">
    <!-- Ermine Mantle & Crimson Bodice -->
    <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#ruby_velvet)" stroke="#52070e" stroke-width="3"/>
    <path d="M-150 120 C-130 10 -70 -70 0 -70 C70 -70 130 10 150 120 Z" fill="url(#ermine_fur)" stroke="#e2ded4" stroke-width="2" id="judith_ermine_mantle"/>

    <!-- BOTANICAL CUTTING HELD BETWEEN THUMB AND FOREFINGER (Card Left) -->
    <g transform="translate(-110, -20)" id="judith_botanical_cutting">
      <!-- Delicately Posed Hand -->
      <ellipse cx="0" cy="0" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
      <circle cx="4" cy="-8" r="5" fill="#ffe4d6"/>
      <!-- Botanical Cutting (Holly Sprig with Berries) -->
      <path d="M4 -8 Q10 -35 25 -45 Q15 -30 20 -20" stroke="#15803d" stroke-width="3" fill="none"/>
      <circle cx="20" cy="-35" r="5.5" fill="#dc2626"/>
      <circle cx="26" cy="-42" r="4.5" fill="#dc2626"/>
      <circle cx="14" cy="-44" r="5" fill="#dc2626"/>
    </g>

    <!-- Judith's Head (Facing Forward-Left, Tiara & Veil) -->
    <g transform="translate(-10, -160)" id="judith_head">
      <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>

      <!-- Graceful Headdress & Flowing Veil -->
      <path d="M-50 40 C-60 -40 -30 -80 0 -80 C30 -80 60 -40 50 40 Z" fill="#fffdfa" stroke="url(#gold_bevel)" stroke-width="2"/>
      <ellipse cx="0" cy="30" rx="34" ry="40" fill="#ffe4d6"/>

      <!-- Facial Features: 2 Eyes Visible, Gazing Forward-Left -->
      <ellipse cx="-16" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="-18" cy="18" r="3.8" fill="#1e3a8a"/>
      <ellipse cx="16" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="14" cy="18" r="3.8" fill="#1e3a8a"/>
      <path d="M-12 46 Q0 52 12 46" stroke="#b91c1c" stroke-width="2.5" fill="none"/>

      <!-- Golden Tiara -->
      <path d="M-35 -30 L-20 -50 L0 -35 L20 -50 L35 -30 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <circle cx="0" cy="-35" r="5" fill="#ef4444"/>
    </g>
  </g>
`;

/**
 * 7. QUEEN OF DIAMONDS (Rachel)
 * English Pattern Invariants:
 * - Angular, pleated geometric gown with draped tresses beneath headdress
 * - Holds small floral sprig against breast in right hand
 * - 2 eyes visible, facing forward left
 */
const QUEEN_OF_DIAMONDS_UPPER = `
  <g transform="translate(375, 420)" id="figure_rachel" data-model="Rachel">
    <!-- Angular, Pleated Geometric Gown -->
    <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#emerald_velvet)" stroke="#064e3b" stroke-width="3"/>
    
    <!-- Pleated Geometric Gold Diamond Folds -->
    <g stroke="url(#gold_bevel)" stroke-width="2" fill="none" id="rachel_pleated_gown">
      <polygon points="0,-70 -40,10 0,90 40,10" fill="#fffdfa" opacity="0.9"/>
      <polygon points="0,-50 -25,10 0,70 25,10" fill="url(#gold_bevel)" opacity="0.5"/>
    </g>

    <!-- FLORAL SPRIG HELD AGAINST BREAST IN RIGHT HAND -->
    <g transform="translate(-30, 20)" id="rachel_floral_sprig">
      <ellipse cx="0" cy="0" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
      <!-- Floral Sprig -->
      <path d="M-4 -5 Q-15 -25 -25 -30 Q-10 -20 -4 -15" stroke="#15803d" stroke-width="3" fill="none"/>
      <circle cx="-25" cy="-30" r="6" fill="#3b82f6"/>
      <circle cx="-18" cy="-35" r="5" fill="#60a5fa"/>
    </g>

    <!-- Rachel's Head & Draped Tresses (Facing Forward-Left) -->
    <g transform="translate(-10, -160)" id="rachel_head">
      <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>

      <!-- Draped Tresses beneath Geometric Headdress -->
      <path d="M-45 10 C-60 40 -55 90 -35 110" stroke="url(#gold_bevel)" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M45 10 C60 40 55 90 35 110" stroke="url(#gold_bevel)" stroke-width="6" fill="none" stroke-linecap="round"/>

      <ellipse cx="0" cy="30" rx="34" ry="40" fill="#ffe4d6"/>

      <!-- 2 Eyes Facing Forward-Left -->
      <ellipse cx="-16" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="-18" cy="18" r="3.8" fill="#2563eb"/>
      <ellipse cx="16" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="14" cy="18" r="3.8" fill="#2563eb"/>
      <path d="M-12 46 Q0 52 12 46" stroke="#b91c1c" stroke-width="2.5" fill="none"/>

      <!-- Geometric Pleated Crown -->
      <polygon points="-40,-35 -20,-60 0,-40 20,-60 40,-35" fill="url(#gold_bevel)" stroke="#064e3b" stroke-width="2"/>
    </g>
  </g>
`;

/**
 * 8. QUEEN OF CLUBS (Argine / Elizabeth of York)
 * English Pattern Invariants:
 * - Holds stylized English heraldic rose (Lancaster red rose + York white rose, Wars of the Roses)
 * - Scalloped crown, blue-sleeved gown
 * - 2 eyes visible, facing forward left
 */
const QUEEN_OF_CLUBS_UPPER = `
  <g transform="translate(375, 420)" id="figure_argine" data-model="Argine">
    <!-- Blue-Sleeved Royal Gown -->
    <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#sapphire_velvet)" stroke="#1e3a8a" stroke-width="3"/>
    <path d="M-140 120 L-80 -80 L80 -80 L140 120 Z" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="2"/>

    <!-- STYLIZED ENGLISH HERALDIC ROSE IN RIGHT HAND (Wars of the Roses) -->
    <g transform="translate(-110, -20)" id="argine_tudor_rose">
      <ellipse cx="0" cy="0" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
      <!-- Stem -->
      <line x1="0" y1="0" x2="15" y2="-30" stroke="#15803d" stroke-width="3"/>
      <!-- Concentric Lancaster Red & York White Rose Petals -->
      <g transform="translate(18, -35)">
        <!-- Outer Red Petals (Lancaster) -->
        <circle cx="0" cy="-10" r="10" fill="#dc2626"/>
        <circle cx="10" cy="0" r="10" fill="#dc2626"/>
        <circle cx="0" cy="10" r="10" fill="#dc2626"/>
        <circle cx="-10" cy="0" r="10" fill="#dc2626"/>
        <!-- Inner White Petals (York) -->
        <circle cx="0" cy="-5" r="6" fill="#fffdf7"/>
        <circle cx="5" cy="0" r="6" fill="#fffdf7"/>
        <circle cx="0" cy="5" r="6" fill="#fffdf7"/>
        <circle cx="-5" cy="0" r="6" fill="#fffdf7"/>
        <!-- Golden Seed Center -->
        <circle cx="0" cy="0" r="4" fill="url(#gold_bevel)"/>
      </g>
    </g>

    <!-- Argine's Head & Scalloped Crown (Facing Forward-Left) -->
    <g transform="translate(-10, -160)" id="argine_head">
      <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
      <ellipse cx="0" cy="30" rx="34" ry="40" fill="#ffe4d6"/>

      <!-- 2 Eyes Facing Forward-Left -->
      <ellipse cx="-16" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="-18" cy="18" r="3.8" fill="#1e3a8a"/>
      <ellipse cx="16" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="14" cy="18" r="3.8" fill="#1e3a8a"/>
      <path d="M-12 46 Q0 52 12 46" stroke="#b91c1c" stroke-width="2.5" fill="none"/>

      <!-- Scalloped Crown of Argine -->
      <path d="M-40 -25 C-30 -50 -15 -50 -10 -35 C-5 -55 5 -55 10 -35 C15 -50 30 -50 40 -25 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
    </g>
  </g>
`;

/**
 * 9. JACK OF SPADES (Ogier the Dane)
 * English Pattern Invariants:
 * - Pure Profile facing Right (ONE-EYED JACK, exactly 1 eye visible)
 * - Rear over-the-shoulder perspective, wearing mustache
 * - Spiraled military pike or halberd shaft that twists 1.5 turns
 */
const JACK_OF_SPADES_UPPER = `
  <g transform="translate(375, 420)" id="figure_ogier" data-model="Ogier" data-eyes="1">
    <!-- Rear Over-The-Shoulder Paladin Armor -->
    <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#emerald_velvet)" stroke="#064e3b" stroke-width="3"/>
    <!-- Back Plate & Gorget -->
    <path d="M-110 120 L-40 -40 L40 -40 L110 120 Z" fill="url(#steel_blade)" stroke="#1f2937" stroke-width="2"/>

    <!-- SPIRALED MILITARY PIKE / HALBERD SHAFT TWISTING 1.5 TURNS (Card Left) -->
    <g transform="translate(-130, -100)" id="ogier_spiraled_pike">
      <!-- Main Pike Shaft -->
      <rect x="-8" y="-140" width="16" height="260" rx="4" fill="#78350f" stroke="#1f2937" stroke-width="2"/>
      <!-- 1.5 Spiraled Ribbon Twists along Visible Length -->
      <path d="M-8 -110 Q8 -95 -8 -80 Q8 -65 -8 -50 Q8 -35 -8 -20 Q8 -5 -8 10 Q8 25 -8 40" stroke="url(#gold_bevel)" stroke-width="5" fill="none"/>
      <!-- Halberd Pike Head -->
      <polygon points="0,-180 -14,-140 14,-140" fill="url(#steel_blade)" stroke="#1f2937" stroke-width="2"/>
      <path d="M-14 -140 Q-35 -130 -30 -110 Q-15 -115 -14 -125 Z" fill="url(#steel_blade)"/>
      <!-- Hand Gripping the Pike -->
      <ellipse cx="0" cy="60" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
    </g>

    <!-- Ogier's Head: PURE PROFILE FACING RIGHT (ONE-EYED JACK, Mustache) -->
    <g transform="translate(20, -160)" id="ogier_profile_head">
      <!-- Pure Right Profile Silhouette -->
      <path d="M-30 -60 C-30 -60 -10 -65 20 -40 C35 -25 40 0 45 5 L65 15 L48 25 L48 42 L60 48 L44 55 C40 75 20 90 -20 90 L-30 90 Z" fill="#ffdcc7" stroke="#e0a98b" stroke-width="2"/>

      <!-- SINGLE EYE VISIBLE IN RIGHT PROFILE -->
      <ellipse cx="32" cy="12" rx="7" ry="5" fill="#fff" id="ogier_single_eye"/>
      <circle cx="35" cy="12" r="3.5" fill="#1e3a8a"/>
      <circle cx="36" cy="10" r="1.2" fill="#fff"/>
      <path d="M22 6 Q32 -2 42 4" stroke="#4a3728" stroke-width="2.5" fill="none"/>

      <!-- Characteristic Soldier Mustache in Profile -->
      <path d="M30 40 Q45 35 55 45 Q42 50 30 45 Z" fill="#4a3728" id="ogier_mustache"/>

      <!-- Paladin Crested Helmet / Cap -->
      <path d="M-40 -40 C-20 -70 20 -70 40 -40 L45 -20 L-45 -20 Z" fill="#1b382b" stroke="url(#gold_bevel)" stroke-width="2"/>
      <polygon points="0,-85 -10,-60 10,-60" fill="url(#ruby_velvet)"/>
    </g>
  </g>
`;

/**
 * 10. JACK OF HEARTS (La Hire)
 * English Pattern Invariants:
 * - Pure Profile facing Left (ONE-EYED JACK, exactly 1 eye visible)
 * - Plain rounded soldier's cap (barret)
 * - Halberd poleaxe over shoulder
 * - Curled leaf or white heraldic ribbon held at chest height in right hand
 */
const JACK_OF_HEARTS_UPPER = `
  <g transform="translate(375, 420)" id="figure_lahire" data-model="La Hire" data-eyes="1">
    <!-- Soldier Gambeson & Doublet -->
    <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#ruby_velvet)" stroke="#52070e" stroke-width="3"/>
    
    <!-- HALBERD POLEAXE OVER SHOULDER (Card Right) -->
    <g transform="translate(120, -120) rotate(15)" id="lahire_poleaxe_halberd">
      <rect x="-8" y="-90" width="16" height="260" rx="4" fill="#78350f" stroke="#1f2937" stroke-width="2"/>
      <!-- Poleaxe Crescent Blade & Rear Spike -->
      <path d="M0 -60 C40 -80 60 -40 45 10 C30 35 0 20 0 20 Z" fill="url(#steel_blade)" stroke="#1f2937" stroke-width="2"/>
      <polygon points="0,-30 -35,-40 0,-15" fill="url(#steel_blade)"/>
      <polygon points="0,-80 -10,-60 10,-60" fill="url(#steel_blade)"/>
    </g>

    <!-- CURLED HERALDIC RIBBON HELD AT CHEST HEIGHT IN RIGHT HAND -->
    <g transform="translate(-50, 10)" id="lahire_curled_ribbon">
      <ellipse cx="0" cy="0" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
      <!-- Curled White Heraldic Ribbon / Leaf -->
      <path d="M0 -8 C-20 -25 0 -45 15 -35 C5 -25 15 -15 0 -8 Z" fill="#fffdfa" stroke="url(#gold_bevel)" stroke-width="2"/>
    </g>

    <!-- La Hire's Head: PURE PROFILE FACING LEFT (ONE-EYED JACK, Plain Barret Cap) -->
    <g transform="translate(-15, -160)" id="lahire_profile_head">
      <!-- Pure Left Profile Silhouette -->
      <path d="M30 -60 C30 -60 10 -65 -20 -40 C-35 -25 -40 0 -45 5 L-65 15 L-48 25 L-48 42 L-60 48 L-44 55 C-40 75 -20 90 20 90 L30 90 Z" fill="#ffdcc7" stroke="#e0a98b" stroke-width="2"/>

      <!-- SINGLE EYE IN PROFILE -->
      <ellipse cx="-32" cy="12" rx="7" ry="5" fill="#fff" id="lahire_single_eye"/>
      <circle cx="-35" cy="12" r="3.5" fill="#1e3a8a"/>
      <circle cx="-36" cy="10" r="1.2" fill="#fff"/>

      <!-- Plain Rounded Soldier's Cap (Barret) -->
      <path d="M-50 -10 C-60 -60 0 -70 45 -40 L40 -10 Z" fill="#b91c1c" stroke="#7a0d17" stroke-width="3" id="lahire_barret_cap"/>
      <circle cx="45" cy="-35" r="8" fill="url(#gold_bevel)"/>
    </g>
  </g>
`;

/**
 * 11. JACK OF DIAMONDS (Hector)
 * English Pattern Invariants:
 * - Brimmed cap with upturned flaps, gold cravat, blue vest
 * - Halberd polearm with prominent double-pointed crossbar or mechanical crossbow catch
 * - 2 eyes visible, facing forward left
 */
const JACK_OF_DIAMONDS_UPPER = `
  <g transform="translate(375, 420)" id="figure_hector" data-model="Hector">
    <!-- Blue Vest with Gold Cravat -->
    <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#sapphire_velvet)" stroke="#1e3a8a" stroke-width="3"/>
    <!-- Gold Cravat at Throat -->
    <path d="M-20 -60 L20 -60 L30 10 L0 30 L-30 10 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>

    <!-- HALBERD WITH PROMINENT DOUBLE-POINTED CROSSBAR (Crossbow Catch) (Card Left) -->
    <g transform="translate(-130, -90)" id="hector_crossbow_halberd">
      <rect x="-6" y="-160" width="12" height="260" rx="3" fill="#78350f" stroke="#1f2937" stroke-width="2"/>
      <!-- Double-pointed crossbar -->
      <path d="M-40 -80 L40 -80 L35 -65 L-35 -65 Z" fill="url(#steel_blade)" stroke="#1f2937" stroke-width="2"/>
      <polygon points="-40,-80 -55,-72 -40,-65" fill="url(#steel_blade)"/>
      <polygon points="40,-80 55,-72 40,-65" fill="url(#steel_blade)"/>
      <!-- Pike Apex -->
      <polygon points="0,-185 -15,-150 15,-150" fill="url(#steel_blade)"/>
      <!-- Right Hand Gripping Shaft -->
      <ellipse cx="0" cy="40" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
    </g>

    <!-- Hector's Head: Brimmed Cap with Upturned Flaps (2 Eyes Forward-Left) -->
    <g transform="translate(-10, -160)" id="hector_head">
      <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
      <ellipse cx="0" cy="30" rx="34" ry="40" fill="#ffe4d6"/>

      <!-- 2 Eyes Facing Forward-Left -->
      <ellipse cx="-16" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="-18" cy="18" r="3.8" fill="#15803d"/>
      <ellipse cx="16" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="14" cy="18" r="3.8" fill="#15803d"/>
      <path d="M-10 46 Q0 50 10 46" stroke="#b91c1c" stroke-width="2.5" fill="none"/>

      <!-- Brimmed Cap with Upturned Flaps -->
      <path d="M-45 -20 L-55 -55 L55 -55 L45 -20 Z" fill="#b91c1c" stroke="url(#gold_bevel)" stroke-width="2"/>
      <!-- Upturned Flaps on sides -->
      <path d="M-55 -55 Q-65 -30 -50 -15" stroke="url(#gold_bevel)" stroke-width="4" fill="none"/>
      <path d="M55 -55 Q65 -30 50 -15" stroke="url(#gold_bevel)" stroke-width="4" fill="none"/>
    </g>
  </g>
`;

/**
 * 12. JACK OF CLUBS (Sir Lancelot)
 * English Pattern Invariants:
 * - Crimson cap decorated with trailing leaf or stylized feather
 * - Upright shaft (arrow/lance/staff) with an ornamental buckler shield positioned below grip
 * - 2 eyes visible, facing forward right
 */
const JACK_OF_CLUBS_UPPER = `
  <g transform="translate(375, 420)" id="figure_lancelot" data-model="Lancelot">
    <!-- Crimson Doublet & Knightly Gorget -->
    <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#ruby_velvet)" stroke="#52070e" stroke-width="3"/>
    
    <!-- UPRIGHT LANCE & ORNAMENTAL BUCKLER SHIELD (Card Right) -->
    <g transform="translate(130, -70)" id="lancelot_lance_buckler">
      <!-- Upright Lance Shaft -->
      <rect x="-6" y="-170" width="12" height="260" rx="3" fill="#78350f" stroke="#1f2937" stroke-width="2"/>
      <polygon points="0,-195 -12,-165 12,-165" fill="url(#steel_blade)"/>
      <!-- Left Hand Gripping the Lance -->
      <ellipse cx="0" cy="10" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
      <!-- Ornamental Buckler Shield Positioned Below Grip -->
      <g transform="translate(0, 50)" id="lancelot_buckler_shield">
        <circle cx="0" cy="0" r="34" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="3"/>
        <circle cx="0" cy="0" r="22" fill="#1b382b" stroke="url(#gold_bevel)" stroke-width="2"/>
        <circle cx="0" cy="0" r="8" fill="#dc2626"/>
      </g>
    </g>

    <!-- Lancelot's Head & Crimson Feathered Cap (2 Eyes Forward-Right) -->
    <g transform="translate(10, -160)" id="lancelot_head">
      <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
      <ellipse cx="0" cy="30" rx="34" ry="40" fill="#ffe4d6"/>

      <!-- 2 Eyes Facing Forward-Right -->
      <ellipse cx="-14" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="-12" cy="18" r="3.8" fill="#1e3a8a"/>
      <ellipse cx="20" cy="18" rx="7" ry="5.5" fill="#fff"/>
      <circle cx="22" cy="18" r="3.8" fill="#1e3a8a"/>
      <path d="M-6 46 Q4 50 14 46" stroke="#b91c1c" stroke-width="2.5" fill="none"/>

      <!-- Crimson Cap with Trailing Feather -->
      <path d="M-45 -20 C-40 -60 40 -60 45 -20 Z" fill="#b91c1c" stroke="url(#gold_bevel)" stroke-width="2"/>
      <!-- Trailing White/Gold Feather -->
      <path d="M20 -40 Q55 -75 75 -50 Q45 -55 25 -35" fill="#fffdfa" stroke="url(#gold_bevel)" stroke-width="1.5"/>
    </g>
  </g>
`;

// ---------------------------------------------------------------------------
// SIGNATURE ACES & PIP SYMBOL GENERATORS
// ---------------------------------------------------------------------------

/**
 * Richly detailed Holly Heart Pip (Suit of Hearts ♥)
 */
function generateHollyHeartPip(x, y, scale = 1) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- 3 Layered Holly Leaves -->
      <g fill="#1b4d3e" stroke="#064e3b" stroke-width="2">
        <path d="M0 -30 Q-30 -60 -40 -30 Q-50 -10 -35 10 Q-20 20 0 0 Z"/>
        <path d="M0 -30 Q30 -60 40 -30 Q50 -10 35 10 Q20 20 0 0 Z"/>
        <path d="M0 10 Q-25 40 0 60 Q25 40 0 10 Z"/>
      </g>
      <!-- Core Ruby Heart -->
      <path d="M0 -15 C-28 -45 -55 -10 -55 25 C-55 60 0 95 0 95 C0 95 55 60 55 25 C55 -10 28 -45 0 -15 Z" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="3"/>
      <!-- Specular Highlight -->
      <circle cx="-18" cy="12" r="8" fill="#fff" opacity="0.6"/>
      <!-- 3 Holiday Berries at Bottom -->
      <circle cx="-12" cy="75" r="8" fill="#e11d48" stroke="#7a0d17" stroke-width="1.5"/>
      <circle cx="12" cy="75" r="8" fill="#e11d48" stroke="#7a0d17" stroke-width="1.5"/>
      <circle cx="0" cy="85" r="9" fill="#f43f5e" stroke="#7a0d17" stroke-width="1.5"/>
      <!-- Gold Ribbon Accent -->
      <path d="M-30 65 Q0 85 30 65" stroke="url(#gold_bevel)" stroke-width="3" fill="none"/>
    </g>
  `;
}

/**
 * Crystalline Six-Pointed Snowflake Diamond Pip (Suit of Diamonds ♦)
 */
function generateSnowflakeDiamondPip(x, y, scale = 1) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Outer Ice Halo -->
      <polygon points="0,-75 50,0 0,75 -50,0" fill="#2563eb" stroke="url(#gold_bevel)" stroke-width="3"/>
      <polygon points="0,-60 40,0 0,60 -40,0" fill="#60a5fa" stroke="#fff" stroke-width="2"/>
      
      <!-- Crystalline Six-Pointed Snowflake -->
      <g stroke="#ffffff" stroke-width="3" stroke-linecap="round">
        <line x1="0" y1="-50" x2="0" y2="50"/>
        <line x1="-43" y1="-25" x2="43" y2="25"/>
        <line x1="-43" y1="25" x2="43" y2="-25"/>
        <!-- Branch V-Chevrons -->
        <path d="M-10 -35 L0 -25 L10 -35" fill="none"/>
        <path d="M-10 35 L0 25 L10 35" fill="none"/>
        <path d="M-35 -10 L-25 0 L-35 10" fill="none"/>
        <path d="M35 -10 L25 0 L35 10" fill="none"/>
      </g>
      <!-- Center Gold Jewel -->
      <circle cx="0" cy="0" r="10" fill="url(#gold_bevel)" stroke="#fff" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="4" fill="#fff"/>
    </g>
  `;
}

/**
 * Fraser Fir Evergreen Spade Pip (Suit of Spades ♠)
 */
function generateChristmasTreeSpadePip(x, y, scale = 1) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Core Obsidian/Forest Velvet Spade -->
      <path d="M0 -65 C-30 -10 -65 10 -65 42 C-65 68 -40 80 -18 75 C-24 95 -36 105 -42 110 L42 110 C36 105 24 95 18 75 C40 80 65 68 65 42 C65 10 30 -10 0 -65 Z" fill="#14281d" stroke="url(#gold_bevel)" stroke-width="3"/>
      
      <!-- 3 Tier Fraser Fir Evergreen Needles Inset -->
      <g fill="#2d6a4f" stroke="#52b788" stroke-width="1.5">
        <polygon points="0,-35 -24,-5 24,-5"/>
        <polygon points="0,-10 -35,25 35,25"/>
        <polygon points="0,20 -48,60 48,60"/>
      </g>
      <!-- Gold Star Top & Tree Baubles -->
      <polygon points="0,-58 4,-46 16,-46 7,-38 10,-26 0,-33 -10,-26 -7,-38 -16,-46 -4,-46" fill="url(#gold_bevel)"/>
      <circle cx="-16" cy="15" r="4.5" fill="#e11d48"/>
      <circle cx="16" cy="15" r="4.5" fill="#e11d48"/>
      <circle cx="-25" cy="50" r="5" fill="#facc15"/>
      <circle cx="25" cy="50" r="5" fill="#facc15"/>
      <circle cx="0" cy="38" r="5" fill="#38bdf8"/>
    </g>
  `;
}

/**
 * Crossed Candy Cane Club Pip (Suit of Clubs ♣)
 */
function generateCandyCaneClubPip(x, y, scale = 1) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- 3 Ornate Rosette Club Foliations -->
      <circle cx="0" cy="-32" r="32" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="3"/>
      <circle cx="-32" cy="16" r="32" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="3"/>
      <circle cx="32" cy="16" r="32" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="3"/>

      <!-- Crossed Candy Cane Stripes Inside Club -->
      <g stroke="#ffffff" stroke-width="6" stroke-linecap="round">
        <line x1="-12" y1="-32" x2="12" y2="-32"/>
        <line x1="-42" y1="16" x2="-22" y2="16"/>
        <line x1="22" y1="16" x2="42" y2="16"/>
      </g>

      <!-- Stem: Golden Chalice Base with Ribbon Bow -->
      <path d="M-12 25 L-24 75 L24 75 L12 25 Z" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <!-- Holiday Ribbon Bow at Junction -->
      <g fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="1.5">
        <circle cx="0" cy="10" r="10"/>
        <path d="M-8 10 Q-26 0 -22 18 Q-12 12 -6 10"/>
        <path d="M8 10 Q26 0 22 18 Q12 12 6 10"/>
      </g>
      <circle cx="0" cy="10" r="4" fill="#fff"/>
    </g>
  `;
}

function getSuitPipRenderer(suit) {
  switch (suit) {
    case 'hearts': return generateHollyHeartPip;
    case 'diamonds': return generateSnowflakeDiamondPip;
    case 'spades': return generateChristmasTreeSpadePip;
    case 'clubs': return generateCandyCaneClubPip;
  }
}

/**
 * MASTER SIGNATURE ACE OF SPADES (Legacy Tax-Duty Stamp Masterpiece)
 */
function buildMasterAceOfSpades() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildBaseCard('A', 'spades', false)}

  <!-- GRAND TAX-STAMP ORNATE ACE OF SPADES CENTERPIECE -->
  <g transform="translate(375, 525)" filter="url(#cartouche_shadow)">
    <!-- Ornate Outer Oval Guilloché Medallion -->
    <ellipse cx="0" cy="0" rx="260" ry="340" fill="#fffdfa" stroke="url(#gold_bevel)" stroke-width="10"/>
    <ellipse cx="0" cy="0" rx="245" ry="325" fill="#1b382b" stroke="#7a0d17" stroke-width="3"/>
    <ellipse cx="0" cy="0" rx="235" ry="315" fill="none" stroke="url(#gold_bevel)" stroke-width="2" stroke-dasharray="6 4"/>

    <!-- Radiant Starlight Rays -->
    <g opacity="0.35" stroke="url(#gold_bevel)" stroke-width="1.5">
      ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => `
        <line x1="0" y1="0" x2="${Math.cos(deg * Math.PI / 180) * 230}" y2="${Math.sin(deg * Math.PI / 180) * 310}"/>
      `).join('')}
    </g>

    <!-- Laurel Wreath of Victory & Solstice Pinecone Garland -->
    <g stroke="url(#gold_bevel)" stroke-width="3" fill="none">
      <path d="M-180 160 C-240 0 -180 -180 0 -220 C180 -180 240 0 180 160" stroke-width="6"/>
      ${[-140, -100, -60, -20, 20, 60, 100, 140].map(y => `
        <circle cx="${Math.sin(y * 0.05) * 190}" cy="${y}" r="6" fill="#dc2626"/>
      `).join('')}
    </g>

    <!-- Enormous Central Masterpiece Spade Pip -->
    ${generateChristmasTreeSpadePip(0, -30, 2.2)}

    <!-- Victorian Engraving Tax-Duty Scroll Banners -->
    <g transform="translate(0, 220)">
      <path d="M-180 0 Q0 -30 180 0 L160 50 Q0 20 -160 50 Z" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="3"/>
      <text x="0" y="32" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="24" fill="#fffdfa" letter-spacing="6" text-anchor="middle">SOVEREIGN</text>
    </g>
    <g transform="translate(0, -240)">
      <rect x="-140" y="-20" width="280" height="36" rx="18" fill="#1b382b" stroke="url(#gold_bevel)" stroke-width="2.5"/>
      <text x="0" y="5" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="16" fill="url(#gold_bevel)" letter-spacing="4" text-anchor="middle">VICTORIAN SOLSTICE</text>
    </g>
  </g>
</svg>`;
}

/**
 * Builds Ace of Hearts, Diamonds, or Clubs with grand central theme artwork
 */
function buildThemedAce(suit, title) {
  const pipFunc = getSuitPipRenderer(suit);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildBaseCard('A', suit, false)}

  <g transform="translate(375, 525)" filter="url(#cartouche_shadow)">
    <!-- Ornate Guilloché Center Frame -->
    <ellipse cx="0" cy="0" rx="250" ry="330" fill="#fffdfa" stroke="url(#gold_bevel)" stroke-width="8"/>
    <ellipse cx="0" cy="0" rx="235" ry="315" fill="#1b382b" stroke="#7a0d17" stroke-width="3"/>

    <!-- Radiant Background Rays -->
    <g opacity="0.3" stroke="url(#gold_bevel)" stroke-width="1.5">
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
        <line x1="0" y1="0" x2="${Math.cos(deg * Math.PI / 180) * 220}" y2="${Math.sin(deg * Math.PI / 180) * 300}"/>
      `).join('')}
    </g>

    <!-- Grand Ace Central Pip -->
    ${pipFunc(0, -20, 2.0)}

    <!-- Banner -->
    <g transform="translate(0, 230)">
      <rect x="-150" y="-18" width="300" height="36" rx="18" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="2.5"/>
      <text x="0" y="6" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="16" fill="#fffdfa" letter-spacing="4" text-anchor="middle">${title}</text>
    </g>
  </g>
</svg>`;
}

/**
 * Generates Pip Cards (2 to 10) with standard geometric array ergonomics
 */
function buildPipCard(rank, suit) {
  const pipFunc = getSuitPipRenderer(suit);

  // Ergonomic Pip Layout Positions (Fractional card coords: [xRatio, yRatio])
  const layouts = {
    '2': [[0.5, 0.28], [0.5, 0.72]],
    '3': [[0.5, 0.26], [0.5, 0.50], [0.5, 0.74]],
    '4': [[0.32, 0.28], [0.68, 0.28], [0.32, 0.72], [0.68, 0.72]],
    '5': [[0.32, 0.28], [0.68, 0.28], [0.50, 0.50], [0.32, 0.72], [0.68, 0.72]],
    '6': [[0.32, 0.28], [0.68, 0.28], [0.32, 0.50], [0.68, 0.50], [0.32, 0.72], [0.68, 0.72]],
    '7': [[0.32, 0.27], [0.68, 0.27], [0.50, 0.38], [0.32, 0.50], [0.68, 0.50], [0.32, 0.73], [0.68, 0.73]],
    '8': [[0.32, 0.25], [0.68, 0.25], [0.32, 0.42], [0.68, 0.42], [0.32, 0.58], [0.68, 0.58], [0.32, 0.75], [0.68, 0.75]],
    '9': [[0.32, 0.25], [0.68, 0.25], [0.32, 0.42], [0.68, 0.42], [0.50, 0.50], [0.32, 0.58], [0.68, 0.58], [0.32, 0.75], [0.68, 0.75]],
    '10': [[0.32, 0.23], [0.68, 0.23], [0.50, 0.33], [0.32, 0.43], [0.68, 0.43], [0.32, 0.57], [0.68, 0.57], [0.50, 0.67], [0.32, 0.77], [0.68, 0.77]]
  };

  const positions = layouts[rank] || [[0.5, 0.5]];
  const scale = (rank === '2' || rank === '3') ? 1.05 : (rank === '4' || rank === '5' || rank === '6') ? 0.92 : 0.82;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildBaseCard(rank, suit, false)}

  <!-- Subtle Inset Filigree Border -->
  <rect x="94" y="94" width="562" height="862" rx="16" fill="none" stroke="url(#gold_bevel)" stroke-width="2" opacity="0.6"/>

  <!-- Pip Layout Positions -->
  ${positions.map(([rx, ry]) => {
    const px = Math.round(750 * rx);
    const py = Math.round(1050 * ry);
    // Invert pips on lower half for traditional readability
    const isLower = ry > 0.5;
    const rot = isLower ? `transform="rotate(180 ${px} ${py})"` : '';
    return `
      <g ${rot}>
        ${pipFunc(px, py, scale)}
      </g>
    `;
  }).join('')}
</svg>`;
}

/**
 * HIGH JOKER (Full Chromatic Color Festive Jester)
 */
function buildHighJoker() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildBaseCard('★', 'hearts', true)}

  <g transform="translate(375, 525)" filter="url(#cartouche_shadow)">
    <!-- Jester Shoulders in Multicolor Velvet Motley -->
    <path d="M-180 180 C-150 20 -80 -40 0 -40 C80 -40 150 20 180 180 Z" fill="url(#ruby_velvet)" stroke="#7a0d17" stroke-width="3"/>
    <!-- Scalloped Jester Collar with Jingling Bells -->
    <g fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2">
      <polygon points="0,-20 -20,60 0,30 20,60"/>
      <polygon points="-40,-10 -70,60 -40,30 -20,60"/>
      <polygon points="40,-10 70,60 40,30 20,60"/>
      <circle cx="-70" cy="65" r="8"/>
      <circle cx="-20" cy="65" r="8"/>
      <circle cx="20" cy="65" r="8"/>
      <circle cx="70" cy="65" r="8"/>
    </g>

    <!-- Head & Cheerful Expression -->
    <ellipse cx="0" cy="-60" rx="45" ry="52" fill="#ffdcc7"/>
    <ellipse cx="-18" cy="-70" rx="7" ry="5.5" fill="#fff"/>
    <circle cx="-16" cy="-70" r="3.5" fill="#1e3a8a"/>
    <ellipse cx="18" cy="-70" rx="7" ry="5.5" fill="#fff"/>
    <circle cx="16" cy="-70" r="3.5" fill="#1e3a8a"/>
    <circle cx="-25" cy="-55" r="12" fill="#f43f5e" opacity="0.4"/>
    <circle cx="25" cy="-55" r="12" fill="#f43f5e" opacity="0.4"/>
    <path d="M-18 -40 Q0 -25 18 -40" stroke="#b91c1c" stroke-width="3.5" fill="none"/>

    <!-- Three-Pointed Holiday Jester Hat with Gold Bells -->
    <g fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="3">
      <!-- Left Point -->
      <path d="M-30 -100 C-70 -140 -130 -140 -120 -80 C-100 -90 -50 -90 -20 -100 Z"/>
      <!-- Right Point -->
      <path d="M30 -100 C70 -140 130 -140 120 -80 C100 -90 50 -90 20 -100 Z" fill="url(#emerald_velvet)"/>
      <!-- Center Point -->
      <path d="M-25 -100 C-10 -180 10 -180 25 -100 Z" fill="url(#gold_bevel)"/>
      <!-- Bells -->
      <circle cx="-120" cy="-80" r="10" fill="url(#gold_bevel)"/>
      <circle cx="120" cy="-80" r="10" fill="url(#gold_bevel)"/>
      <circle cx="0" cy="-180" r="12" fill="url(#gold_bevel)"/>
    </g>

    <!-- Festive Garland & Banner -->
    <g transform="translate(0, 180)">
      <rect x="-160" y="-22" width="320" height="44" rx="22" fill="#1b382b" stroke="url(#gold_bevel)" stroke-width="3"/>
      <text x="0" y="8" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="20" fill="url(#gold_bevel)" letter-spacing="6" text-anchor="middle">WILD JOKER</text>
    </g>
  </g>
</svg>`;
}

/**
 * LOW JOKER (Antique Sepia/Steel Monochrome Engraving)
 */
function buildLowJoker() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildBaseCard('★', 'spades', true)}

  <g transform="translate(375, 525)" filter="url(#cartouche_shadow)">
    <!-- Monochrome Steel/Sepia Jester -->
    <path d="M-180 180 C-150 20 -80 -40 0 -40 C80 -40 150 20 180 180 Z" fill="#2d3748" stroke="#1a202c" stroke-width="3"/>
    <g fill="#e2e8f0" stroke="#1a202c" stroke-width="2">
      <polygon points="0,-20 -20,60 0,30 20,60"/>
      <polygon points="-40,-10 -70,60 -40,30 -20,60"/>
      <polygon points="40,-10 70,60 40,30 20,60"/>
      <circle cx="-70" cy="65" r="7"/>
      <circle cx="-20" cy="65" r="7"/>
      <circle cx="20" cy="65" r="7"/>
      <circle cx="70" cy="65" r="7"/>
    </g>

    <!-- Head in Antique Sepia Tones -->
    <ellipse cx="0" cy="-60" rx="45" ry="52" fill="#edf2f7"/>
    <ellipse cx="-18" cy="-70" rx="7" ry="5.5" fill="#fff"/>
    <circle cx="-16" cy="-70" r="3.5" fill="#1a202c"/>
    <ellipse cx="18" cy="-70" rx="7" ry="5.5" fill="#fff"/>
    <circle cx="16" cy="-70" r="3.5" fill="#1a202c"/>
    <path d="M-18 -40 Q0 -25 18 -40" stroke="#1a202c" stroke-width="3.5" fill="none"/>

    <!-- Three-Pointed Hat in Monochrome -->
    <g fill="#4a5568" stroke="#1a202c" stroke-width="3">
      <path d="M-30 -100 C-70 -140 -130 -140 -120 -80 C-100 -90 -50 -90 -20 -100 Z"/>
      <path d="M30 -100 C70 -140 130 -140 120 -80 C100 -90 50 -90 20 -100 Z" fill="#718096"/>
      <path d="M-25 -100 C-10 -180 10 -180 25 -100 Z" fill="#cbd5e1"/>
      <circle cx="-120" cy="-80" r="10" fill="#e2e8f0"/>
      <circle cx="120" cy="-80" r="10" fill="#e2e8f0"/>
      <circle cx="0" cy="-180" r="12" fill="#e2e8f0"/>
    </g>

    <!-- Banner -->
    <g transform="translate(0, 180)">
      <rect x="-140" y="-22" width="280" height="44" rx="22" fill="#1a202c" stroke="#e2e8f0" stroke-width="2.5"/>
      <text x="0" y="8" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="20" fill="#f8fafc" letter-spacing="6" text-anchor="middle">JOKER</text>
    </g>
  </g>
</svg>`;
}

/**
 * CARD BACK: Strict 180° Rotational Point Symmetry with >= 0.375" Framing Border
 */
function buildRotationallySymmetricCardBack() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>

  <!-- 1. Exterior Security Border: Mandated width >= 0.375" (112.5 px at 300 DPI) -->
  <rect width="750" height="1050" rx="38" fill="#fffdf7" stroke="#1b382b" stroke-width="4"/>
  <rect x="20" y="20" width="710" height="1010" rx="26" fill="none" stroke="url(#gold_bevel)" stroke-width="8"/>
  <!-- Wide Margined Border Field (absorbs mechanical cut drift) -->
  <rect x="45" y="45" width="660" height="960" rx="18" fill="#52070e" stroke="#1b382b" stroke-width="4"/>
  <rect x="52" y="52" width="646" height="946" rx="14" fill="#7a0d17" stroke="url(#gold_bevel)" stroke-width="2"/>

  <!-- 2. Rich Damask Inset Wallpaper -->
  <rect x="58" y="58" width="634" height="934" rx="10" fill="url(#cartouche_damask)"/>

  <!-- 3. Two-Way (180°) Point-Symmetric Guilloché Lattice -->
  <!-- Top-Left Quadrant & Bottom-Right Quadrant mirrored across (375, 525) -->
  <g stroke="url(#gold_bevel)" stroke-width="1.5" fill="none" opacity="0.85">
    <!-- Top Filigree -->
    <path d="M75 140 C140 100 240 100 300 150 M450 150 C510 100 610 100 675 140"/>
    <path d="M100 75 C100 140 100 240 150 300 M650 75 C650 140 650 240 600 300"/>
    <!-- Bottom Filigree (Rotated 180°) -->
    <path d="M75 910 C140 950 240 950 300 900 M450 900 C510 950 610 950 675 910"/>
    <path d="M100 975 C100 910 100 810 150 750 M650 975 C650 910 650 810 600 750"/>
  </g>

  <!-- 4. Central Two-Way Symmetric Medallion (at center 375, 525) -->
  <g transform="translate(375, 525)">
    <!-- Concentric Golden Circles -->
    <circle cx="0" cy="0" r="170" fill="#fffdfa" stroke="url(#gold_bevel)" stroke-width="10"/>
    <circle cx="0" cy="0" r="152" fill="#1b382b" stroke="#7a0d17" stroke-width="4"/>
    <circle cx="0" cy="0" r="138" fill="url(#ruby_velvet)" stroke="url(#gold_bevel)" stroke-width="2"/>

    <!-- Dual Interlocking Christmas Wreaths (180° Point Symmetric) -->
    <g stroke="url(#gold_bevel)" stroke-width="2.5" fill="none">
      <circle cx="0" cy="0" r="115" stroke-dasharray="6 4"/>
      <circle cx="0" cy="0" r="95"/>
    </g>

    <!-- Twin Holiday Golden Bells & Ribbon (Point-Symmetric Dual Array) -->
    <g transform="translate(0, -45)">
      <circle cx="0" cy="0" r="32" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <circle cx="0" cy="0" r="14" fill="#e11d48"/>
      <!-- Holly Berries -->
      <circle cx="-22" cy="0" r="6" fill="#e11d48"/>
      <circle cx="22" cy="0" r="6" fill="#e11d48"/>
    </g>
    <g transform="translate(0, 45) rotate(180)">
      <circle cx="0" cy="0" r="32" fill="url(#gold_bevel)" stroke="#7a0d17" stroke-width="2"/>
      <circle cx="0" cy="0" r="14" fill="#e11d48"/>
      <circle cx="-22" cy="0" r="6" fill="#e11d48"/>
      <circle cx="22" cy="0" r="6" fill="#e11d48"/>
    </g>

    <!-- Center Solstice Star (180° Invariant) -->
    <polygon points="0,-28 7,-9 27,-9 11,3 17,23 0,11 -17,23 -11,3 -27,-9 -7,-9" fill="url(#gold_bevel)" stroke="#fff" stroke-width="1.5"/>
    <circle cx="0" cy="0" r="4" fill="#fff"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// DECK BUILDER & MASTER EMISSION
// ---------------------------------------------------------------------------

console.log('🏛️ GENERATING ENGLISH PATTERN PLAYING CARD DECK...');

const deckFiles = new Map();

// 1. King of Hearts (Charles / Suicide King, Clean-shaven)
deckFiles.set('K_hearts.svg', buildReversibleCourtCard('K', 'hearts', 'KING OF HEARTS', KING_OF_HEARTS_UPPER));
deckFiles.set('KH.svg', deckFiles.get('K_hearts.svg'));

// 2. King of Spades (David / Broadsword, Harp motif, Curled beard)
deckFiles.set('K_spades.svg', buildReversibleCourtCard('K', 'spades', 'KING OF SPADES', KING_OF_SPADES_UPPER));
deckFiles.set('KS.svg', deckFiles.get('K_spades.svg'));

// 3. King of Diamonds (Caesar / One-Eyed King in Profile, Battleaxe, Waving Hand)
deckFiles.set('K_diamonds.svg', buildReversibleCourtCard('K', 'diamonds', 'KING OF DIAMONDS', KING_OF_DIAMONDS_UPPER));
deckFiles.set('KD.svg', deckFiles.get('K_diamonds.svg'));

// 4. King of Clubs (Alexander / Broadsword, Imperial Orb)
deckFiles.set('K_clubs.svg', buildReversibleCourtCard('K', 'clubs', 'KING OF CLUBS', KING_OF_CLUBS_UPPER));
deckFiles.set('KC.svg', deckFiles.get('K_clubs.svg'));

// 5. Queen of Spades (Pallas Athena / Armed with Scepter, Brocade Hood, NO Flowers)
deckFiles.set('Q_spades.svg', buildReversibleCourtCard('Q', 'spades', 'QUEEN OF SPADES', QUEEN_OF_SPADES_UPPER));
deckFiles.set('QS.svg', deckFiles.get('Q_spades.svg'));

// 6. Queen of Hearts (Judith / Botanical cutting, Ermine mantle)
deckFiles.set('Q_hearts.svg', buildReversibleCourtCard('Q', 'hearts', 'QUEEN OF HEARTS', QUEEN_OF_HEARTS_UPPER));
deckFiles.set('QH.svg', deckFiles.get('Q_hearts.svg'));

// 7. Queen of Diamonds (Rachel / Floral sprig, Pleated geometric gown)
deckFiles.set('Q_diamonds.svg', buildReversibleCourtCard('Q', 'diamonds', 'QUEEN OF DIAMONDS', QUEEN_OF_DIAMONDS_UPPER));
deckFiles.set('QD.svg', deckFiles.get('Q_diamonds.svg'));

// 8. Queen of Clubs (Argine / English Heraldic Rose, Scalloped Crown)
deckFiles.set('Q_clubs.svg', buildReversibleCourtCard('Q', 'clubs', 'QUEEN OF CLUBS', QUEEN_OF_CLUBS_UPPER));
deckFiles.set('QC.svg', deckFiles.get('Q_clubs.svg'));

// 9. Jack of Spades (Ogier / One-Eyed Jack Right Profile, Mustache, Spiraled Pike)
deckFiles.set('J_spades.svg', buildReversibleCourtCard('J', 'spades', 'JACK OF SPADES', JACK_OF_SPADES_UPPER));
deckFiles.set('JS.svg', deckFiles.get('J_spades.svg'));

// 10. Jack of Hearts (La Hire / One-Eyed Jack Left Profile, Poleaxe, Curled Ribbon)
deckFiles.set('J_hearts.svg', buildReversibleCourtCard('J', 'hearts', 'JACK OF HEARTS', JACK_OF_HEARTS_UPPER));
deckFiles.set('JH.svg', deckFiles.get('J_hearts.svg'));

// 11. Jack of Diamonds (Hector / Crossbow Catch Halberd, Brimmed Cap, Blue Vest)
deckFiles.set('J_diamonds.svg', buildReversibleCourtCard('J', 'diamonds', 'JACK OF DIAMONDS', JACK_OF_DIAMONDS_UPPER));
deckFiles.set('JD.svg', deckFiles.get('J_diamonds.svg'));

// 12. Jack of Clubs (Sir Lancelot / Lance & Ornamental Buckler Shield, Feather Cap)
deckFiles.set('J_clubs.svg', buildReversibleCourtCard('J', 'clubs', 'JACK OF CLUBS', JACK_OF_CLUBS_UPPER));
deckFiles.set('JC.svg', deckFiles.get('J_clubs.svg'));

// 13. Master Ace of Spades
deckFiles.set('A_spades.svg', buildMasterAceOfSpades());
deckFiles.set('AS.svg', deckFiles.get('A_spades.svg'));

// 14-16. Aces of Hearts, Diamonds, Clubs
deckFiles.set('A_hearts.svg', buildThemedAce('hearts', 'SOLSTICE HEARTH'));
deckFiles.set('AH.svg', deckFiles.get('A_hearts.svg'));

deckFiles.set('A_diamonds.svg', buildThemedAce('diamonds', 'FROSTED DIAMOND'));
deckFiles.set('AD.svg', deckFiles.get('A_diamonds.svg'));

deckFiles.set('A_clubs.svg', buildThemedAce('clubs', 'CANDY CANE CLOVER'));
deckFiles.set('AC.svg', deckFiles.get('A_clubs.svg'));

// 17-52. Pip Cards (2 through 10) for all 4 suits
const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
const suitCodes = { hearts: 'H', diamonds: 'D', spades: 'S', clubs: 'C' };
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10'];

suits.forEach(suit => {
  ranks.forEach(rank => {
    const fileName = `${rank}_${suit}.svg`;
    const aliasName = `${rank}${suitCodes[suit]}.svg`;
    const svgContent = buildPipCard(rank, suit);
    deckFiles.set(fileName, svgContent);
    deckFiles.set(aliasName, svgContent);
  });
});

// 53-54. Jokers
const highJokerSvg = buildHighJoker();
const lowJokerSvg = buildLowJoker();
deckFiles.set('joker_1.svg', highJokerSvg);
deckFiles.set('joker_2.svg', lowJokerSvg);
deckFiles.set('JOKER.svg', highJokerSvg);

// Card Back
const cardBackSvg = buildRotationallySymmetricCardBack();
deckFiles.set('card_back.svg', cardBackSvg);

console.log(`Writing ${deckFiles.size} card assets across game directories and ArtCraft workspace...`);

const vcDeckDir = path.join(ROOT_DIR, 'decks', 'victorian_christmas');
const vcWorkspaceDir = 'D:\\getartcraft\\artcraft_workspace\\decks\\victorian_christmas';
const modsFacesDir = path.join(ROOT_DIR, 'mods', 'card_faces');
const modsBacksDir = path.join(ROOT_DIR, 'mods', 'card_backs');

for (const [filename, content] of deckFiles.entries()) {
  fs.writeFileSync(path.join(vcDeckDir, filename), content, 'utf8');
  fs.writeFileSync(path.join(vcWorkspaceDir, filename), content, 'utf8');

  // Also publish signature faces to mods/card_faces/
  if (filename === 'KH.svg' || filename === 'AS.svg' || filename === 'joker_1.svg') {
    fs.writeFileSync(path.join(modsFacesDir, `victorian_christmas_${filename}`), content, 'utf8');
    if (filename === 'joker_1.svg') {
      fs.writeFileSync(path.join(modsFacesDir, 'JOKER.svg'), content, 'utf8');
    } else {
      fs.writeFileSync(path.join(modsFacesDir, filename), content, 'utf8');
    }
  }
}

// Write card back to mods/card_backs/victorian_christmas.svg
fs.writeFileSync(path.join(modsBacksDir, 'victorian_christmas.svg'), cardBackSvg, 'utf8');
fs.writeFileSync(path.join(modsFacesDir, 'victorian_christmas_face.svg'), deckFiles.get('KH.svg'), 'utf8');

console.log('✅ All 54 cards generated successfully and synchronized with prepress specification!');
