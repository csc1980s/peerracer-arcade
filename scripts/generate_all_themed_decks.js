/**
 * Master Themed Playing Card Deck Generator for Solitaire Sovereign
 * 
 * Generates complete 54-card decks for all 10 Collections adhering strictly to:
 * - "Untitled document.txt" Prepress Standards (750x1050 px, 38px corner radius, 562x862 cartouche)
 * - Corner index ergonomics (envelope <= 0.65", distance 0.18" from trim)
 * - 180° reversible rotational point symmetry with 20° diagonal split-line
 * - English Pattern Court Iconography (12 figures with historic invariants)
 * 
 * Collections generated:
 * 1. victorian_christmas (Vintage 🎄)
 * 2. art_deco_elegance (Vintage ✨)
 * 3. steampunk_clockwork (Vintage ⚙️)
 * 4. wild_west_frontier (Vintage 🤠)
 * 5. botanical_garden (Vintage 🌺)
 * 6. gothic_cathedral (Vintage ⛪)
 * 7. cyberpunk_neon (Modern 🌃)
 * 8. minimalist_zen (Modern 🎋)
 * 9. cosmic_constellation (Modern 🌌)
 * 10. retro_synthwave (Modern 🌆)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cornerIndexSvg, notchedRectPath } from './card_build_rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const THEMES = [
  {
    id: 'art_deco_elegance',
    name: 'Art Deco Elegance',
    era: 'Vintage',
    icon: '✨',
    cardBg: '#0b0f17',
    cartoucheBg: '#111827',
    damaskStroke: '#e6c667',
    primaryRed: '#c2185b',
    primaryBlack: '#e6c667',
    accentGold: '#e6c667',
    velvetRuby: ['#be123c', '#881337', '#4c0519'],
    velvetDark: ['#1e293b', '#0f172a', '#020617'],
    borderStroke: '#e6c667',
    title: 'THE ROARING TWENTIES'
  },
  {
    id: 'steampunk_clockwork',
    name: 'Steampunk Clockwork',
    era: 'Vintage',
    icon: '⚙️',
    cardBg: '#fef3c7',
    cartoucheBg: '#1c1917',
    damaskStroke: '#d97706',
    primaryRed: '#b45309',
    primaryBlack: '#451a03',
    accentGold: '#f59e0b',
    velvetRuby: ['#c2410c', '#9a3412', '#431407'],
    velvetDark: ['#292524', '#1c1917', '#0c0a09'],
    borderStroke: '#d97706',
    title: 'VICTORIAN HOROLOGY'
  },
  {
    id: 'wild_west_frontier',
    name: 'Wild West Frontier',
    era: 'Vintage',
    icon: '🤠',
    cardBg: '#fffbeb',
    cartoucheBg: '#292524',
    damaskStroke: '#b45309',
    primaryRed: '#991b1b',
    primaryBlack: '#1c1917',
    accentGold: '#d97706',
    velvetRuby: ['#b91c1c', '#7f1d1d', '#450a0a'],
    velvetDark: ['#44403c', '#292524', '#1c1917'],
    borderStroke: '#b45309',
    title: 'FRONTIER MARSHAL'
  },
  {
    id: 'botanical_garden',
    name: 'Botanical Garden',
    era: 'Vintage',
    icon: '🌺',
    cardBg: '#fdfbf7',
    cartoucheBg: '#064e3b',
    damaskStroke: '#ca8a04',
    primaryRed: '#e11d48',
    primaryBlack: '#14532d',
    accentGold: '#eab308',
    velvetRuby: ['#f43f5e', '#be123c', '#881337'],
    velvetDark: ['#065f46', '#064e3b', '#022c22'],
    borderStroke: '#ca8a04',
    title: 'ROYAL HERBARIUM'
  },
  {
    id: 'gothic_cathedral',
    name: 'Gothic Cathedral',
    era: 'Vintage',
    icon: '⛪',
    cardBg: '#f8fafc',
    cartoucheBg: '#0f172a',
    damaskStroke: '#eab308',
    primaryRed: '#991b1b',
    primaryBlack: '#1e3a8a',
    accentGold: '#facc15',
    velvetRuby: ['#b91c1c', '#7f1d1d', '#450a0a'],
    velvetDark: ['#1e293b', '#0f172a', '#020617'],
    borderStroke: '#eab308',
    title: 'NOTRE DAME ROSETTE'
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    era: 'Modern',
    icon: '🌃',
    cardBg: '#090a15',
    cartoucheBg: '#05050d',
    damaskStroke: '#00f0ff',
    primaryRed: '#ff007f',
    primaryBlack: '#00f0ff',
    accentGold: '#ffb700',
    velvetRuby: ['#ff007f', '#d90429', '#7a0026'],
    velvetDark: ['#00f0ff', '#0077b6', '#03045e'],
    borderStroke: '#00f0ff',
    title: 'NEO TOKYO MATRIX'
  },
  {
    id: 'minimalist_zen',
    name: 'Minimalist Zen',
    era: 'Modern',
    icon: '🎋',
    cardBg: '#fafaf9',
    cartoucheBg: '#18181b',
    damaskStroke: '#15803d',
    primaryRed: '#dc2626',
    primaryBlack: '#18181b',
    accentGold: '#ca8a04',
    velvetRuby: ['#ef4444', '#b91c1c', '#7f1d1d'],
    velvetDark: ['#27272a', '#18181b', '#09090b'],
    borderStroke: '#ca8a04',
    title: 'SUMI-E ENSO'
  },
  {
    id: 'cosmic_constellation',
    name: 'Cosmic Constellation',
    era: 'Modern',
    icon: '🌌',
    cardBg: '#040714',
    cartoucheBg: '#02040a',
    damaskStroke: '#7c3aed',
    primaryRed: '#f43f5e',
    primaryBlack: '#38bdf8',
    accentGold: '#f59e0b',
    velvetRuby: ['#ec4899', '#be185d', '#701a75'],
    velvetDark: ['#6366f1', '#4338ca', '#1e1b4b'],
    borderStroke: '#7c3aed',
    title: 'ASTRAL HORIZON'
  },
  {
    id: 'retro_synthwave',
    name: 'Retro Synthwave 1984',
    era: 'Modern',
    icon: '🌆',
    cardBg: '#0b0d1b',
    cartoucheBg: '#050711',
    damaskStroke: '#ec4899',
    primaryRed: '#f43f5e',
    primaryBlack: '#06b6d4',
    accentGold: '#facc15',
    velvetRuby: ['#f43f5e', '#be123c', '#881337'],
    velvetDark: ['#8b5cf6', '#6d28d9', '#3b0764'],
    borderStroke: '#06b6d4',
    title: 'MIAMI NIGHTS 1984'
  }
];

// Helper: Common SVG Definitions per Theme
function getThemeDefs(theme) {
  return `
    <linearGradient id="${theme.id}_gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff5cc"/>
      <stop offset="25%" stop-color="${theme.accentGold}"/>
      <stop offset="50%" stop-color="#996515"/>
      <stop offset="75%" stop-color="${theme.accentGold}"/>
      <stop offset="100%" stop-color="#734b00"/>
    </linearGradient>

    <linearGradient id="${theme.id}_ruby" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${theme.velvetRuby[0]}"/>
      <stop offset="50%" stop-color="${theme.velvetRuby[1]}"/>
      <stop offset="100%" stop-color="${theme.velvetRuby[2]}"/>
    </linearGradient>

    <linearGradient id="${theme.id}_dark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${theme.velvetDark[0]}"/>
      <stop offset="50%" stop-color="${theme.velvetDark[1]}"/>
      <stop offset="100%" stop-color="${theme.velvetDark[2]}"/>
    </linearGradient>

    <linearGradient id="${theme.id}_steel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#cbd5e1"/>
      <stop offset="70%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>

    <pattern id="${theme.id}_damask" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M20 6 Q27 16 20 26 Q13 16 20 6 Z M6 20 Q16 27 26 20 Q16 13 6 20 Z" fill="none" stroke="${theme.damaskStroke}" stroke-width="0.5" opacity="0.25"/>
      <circle cx="20" cy="20" r="1.5" fill="${theme.damaskStroke}" opacity="0.2"/>
    </pattern>

    <clipPath id="${theme.id}_split_upper">
      <polygon points="90,90 660,90 660,634 90,426"/>
    </clipPath>

    <filter id="${theme.id}_shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  `;
}

// Corner Mini Pip
function getMiniPipSvg(theme, suit) {
  const isRed = (suit === 'hearts' || suit === 'diamonds');
  const fill = isRed ? `url(#${theme.id}_ruby)` : (theme.primaryBlack.startsWith('#') ? theme.primaryBlack : `url(#${theme.id}_dark)`);

  switch (suit) {
    case 'hearts':
      return `
        <path d="M0 0 C-10 -10 -20 0 -20 12 C-20 26 0 40 0 40 C0 40 20 26 20 12 C20 0 10 -10 0 0 Z" fill="${fill}" stroke="url(#${theme.id}_gold)" stroke-width="1.2"/>
        <circle cx="-6" cy="8" r="2.5" fill="#fff" opacity="0.6"/>
      `;
    case 'diamonds':
      return `
        <polygon points="0,-2 18,18 0,38 -18,18" fill="${fill}" stroke="url(#${theme.id}_gold)" stroke-width="1.2"/>
        <polygon points="0,4 12,18 0,32 -12,18" fill="#fff" opacity="0.3"/>
        <circle cx="0" cy="18" r="3" fill="#fff"/>
      `;
    case 'spades':
      return `
        <path d="M0 -4 C-10 12 -22 18 -22 28 C-22 36 -14 40 -6 38 C-8 44 -12 48 -14 50 L14 50 C12 48 8 44 6 38 C14 40 22 36 22 28 C22 18 10 12 0 -4 Z" fill="${fill}" stroke="url(#${theme.id}_gold)" stroke-width="1.2"/>
        <circle cx="0" cy="22" r="3" fill="url(#${theme.id}_gold)"/>
      `;
    case 'clubs':
      return `
        <circle cx="0" cy="8" r="10" fill="${fill}" stroke="url(#${theme.id}_gold)" stroke-width="1.2"/>
        <circle cx="-10" cy="22" r="10" fill="${fill}" stroke="url(#${theme.id}_gold)" stroke-width="1.2"/>
        <circle cx="10" cy="22" r="10" fill="${fill}" stroke="url(#${theme.id}_gold)" stroke-width="1.2"/>
        <path d="M-4 26 L-8 44 L8 44 L4 26 Z" fill="url(#${theme.id}_gold)"/>
        <circle cx="0" cy="18" r="3" fill="#fff"/>
      `;
  }
}

// Base Card
function buildThemeBaseCard(theme, rank, suit, isCourt = false) {
  const isRed = (suit === 'hearts' || suit === 'diamonds');
  const rankColor = isRed ? theme.primaryRed : theme.primaryBlack;
  const miniPip = getMiniPipSvg(theme, suit);

  return `
  <!-- Outer Card Trim with Die-Cut Rounded Corners (0.125" radius = 38px) -->
  <rect width="750" height="1050" rx="38" fill="${theme.cardBg}" stroke="${theme.borderStroke}" stroke-width="4"/>

  <!-- Prepress Framing Border Inset -->
  <rect x="12" y="12" width="726" height="1026" rx="28" fill="none" stroke="url(#${theme.id}_gold)" stroke-width="6"/>
  <rect x="24" y="24" width="702" height="1002" rx="20" fill="none" stroke="${theme.primaryRed}" stroke-width="1.5" opacity="0.6"/>

  <!-- Corner Filigree Flourishes -->
  <g stroke="url(#${theme.id}_gold)" stroke-width="2" fill="none" opacity="0.85">
    <!-- top-left and bottom-right flourishes removed: the corner index lives there (card_build_rules.js) -->
    <path d="M714 75 C714 48 702 36 675 36 M704 36 Q682 68 714 68"/>
    <circle cx="702" cy="48" r="4" fill="${theme.primaryRed}"/>
    <path d="M36 975 C36 1002 48 1014 75 1014 M46 1014 Q68 982 36 982"/>
    <circle cx="48" cy="1002" r="4" fill="${theme.primaryRed}"/>
  </g>

  <!-- Corner Index (Digital UI Optimized profile, see card_build_rules.js) -->
  ${cornerIndexSvg({ rank, suit, rankColor, miniPipSvg: miniPip })}
  <g transform="rotate(180 375 525)">
    ${cornerIndexSvg({ rank, suit, rankColor, miniPipSvg: miniPip })}
  </g>

  ${isCourt ? `
  <!-- Inner Court Cartouche: Inset 562 x 862 px centered on (375, 525) -->
  <g filter="url(#${theme.id}_shadow)">
    <path d="${notchedRectPath(94, 94, 562, 862, 20)}" fill="${theme.cardBg}" stroke="url(#${theme.id}_gold)" stroke-width="8"/>
    <path d="${notchedRectPath(94, 94, 562, 862, 20, 8)}" fill="${theme.cartoucheBg}" stroke="${theme.borderStroke}" stroke-width="2"/>
    <path d="${notchedRectPath(94, 94, 562, 862, 20, 10)}" fill="url(#${theme.id}_damask)"/>
  </g>
  ` : ''}
  `;
}

// Themed Heraldic Sash
function getThemeSash(theme) {
  return `
  <g transform="translate(375, 525) rotate(20)">
    <!-- Main Velvet Sash -->
    <rect x="-300" y="-22" width="600" height="44" fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="4"/>
    <line x1="-300" y1="-14" x2="300" y2="-14" stroke="url(#${theme.id}_gold)" stroke-width="2" stroke-dasharray="8 4"/>
    <line x1="-300" y1="14" x2="300" y2="14" stroke="url(#${theme.id}_gold)" stroke-width="2" stroke-dasharray="8 4"/>

    <!-- Central Buckle Medallion -->
    <circle cx="0" cy="0" r="32" fill="${theme.cardBg}" stroke="url(#${theme.id}_gold)" stroke-width="6"/>
    <circle cx="0" cy="0" r="22" fill="${theme.cartoucheBg}" stroke="${theme.primaryRed}" stroke-width="2"/>
    <circle cx="0" cy="0" r="10" fill="url(#${theme.id}_ruby)"/>
    <circle cx="0" cy="0" r="4" fill="#fff"/>
    <circle cx="-80" cy="0" r="14" fill="url(#${theme.id}_gold)" stroke="${theme.primaryRed}" stroke-width="2"/>
    <circle cx="80" cy="0" r="14" fill="url(#${theme.id}_gold)" stroke="${theme.primaryRed}" stroke-width="2"/>
    <circle cx="-160" cy="0" r="10" fill="url(#${theme.id}_gold)"/>
    <circle cx="160" cy="0" r="10" fill="url(#${theme.id}_gold)"/>
  </g>
  `;
}

// Themed Suit Pip Renderers (Hearts, Diamonds, Spades, Clubs)
function getThemedSuitPipRenderer(theme, suit) {
  return function(x, y, scale = 1) {
    switch (suit) {
      case 'hearts':
        return `
          <g transform="translate(${x}, ${y}) scale(${scale})">
            <!-- Radiating Sunburst / Chevron Petals -->
            <g stroke="url(#${theme.id}_gold)" stroke-width="2" fill="none" opacity="0.8">
              <path d="M0 -30 Q-35 -65 -45 -30 Q-55 -10 -35 15 Q-15 30 0 10 Z"/>
              <path d="M0 -30 Q35 -65 45 -30 Q55 -10 35 15 Q15 30 0 10 Z"/>
            </g>
            <path d="M0 -15 C-28 -45 -55 -10 -55 25 C-55 60 0 95 0 95 C0 95 55 60 55 25 C55 -10 28 -45 0 -15 Z" fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="3"/>
            <circle cx="-18" cy="12" r="8" fill="#fff" opacity="0.6"/>
            <!-- Bottom Accents -->
            <circle cx="-12" cy="75" r="7" fill="${theme.primaryRed}" stroke="url(#${theme.id}_gold)" stroke-width="1.5"/>
            <circle cx="12" cy="75" r="7" fill="${theme.primaryRed}" stroke="url(#${theme.id}_gold)" stroke-width="1.5"/>
            <circle cx="0" cy="85" r="8" fill="url(#${theme.id}_gold)"/>
          </g>
        `;
      case 'diamonds':
        return `
          <g transform="translate(${x}, ${y}) scale(${scale})">
            <!-- Stepped Ziggurat / Star Rhombus -->
            <polygon points="0,-75 50,0 0,75 -50,0" fill="url(#${theme.id}_dark)" stroke="url(#${theme.id}_gold)" stroke-width="3"/>
            <polygon points="0,-60 40,0 0,60 -40,0" fill="${theme.primaryBlack.startsWith('#') ? theme.primaryBlack : theme.accentGold}" stroke="#fff" stroke-width="2" opacity="0.8"/>
            <polygon points="0,-45 30,0 0,45 -30,0" fill="url(#${theme.id}_gold)" opacity="0.6"/>
            <g stroke="#ffffff" stroke-width="2.5" stroke-linecap="round">
              <line x1="0" y1="-45" x2="0" y2="45"/>
              <line x1="-30" y1="0" x2="30" y2="0"/>
            </g>
            <circle cx="0" cy="0" r="8" fill="url(#${theme.id}_gold)" stroke="#fff" stroke-width="1.5"/>
            <circle cx="0" cy="0" r="3" fill="#fff"/>
          </g>
        `;
      case 'spades':
        return `
          <g transform="translate(${x}, ${y}) scale(${scale})">
            <!-- Architectural Spire Spade -->
            <path d="M0 -65 C-30 -10 -65 10 -65 42 C-65 68 -40 80 -18 75 C-24 95 -36 105 -42 110 L42 110 C36 105 24 95 18 75 C40 80 65 68 65 42 C65 10 30 -10 0 -65 Z" fill="url(#${theme.id}_dark)" stroke="url(#${theme.id}_gold)" stroke-width="3"/>
            <!-- Tiered Stepped Ribs / Spire Inset -->
            <g fill="${theme.primaryBlack.startsWith('#') ? theme.primaryBlack : theme.accentGold}" stroke="url(#${theme.id}_gold)" stroke-width="1.5" opacity="0.85">
              <polygon points="0,-40 -20,-10 20,-10"/>
              <polygon points="0,-15 -32,20 32,20"/>
              <polygon points="0,15 -44,55 44,55"/>
            </g>
            <circle cx="0" cy="-45" r="6" fill="url(#${theme.id}_gold)"/>
            <circle cx="-20" cy="35" r="5" fill="${theme.primaryRed}"/>
            <circle cx="20" cy="35" r="5" fill="${theme.primaryRed}"/>
          </g>
        `;
      case 'clubs':
        return `
          <g transform="translate(${x}, ${y}) scale(${scale})">
            <!-- Triple Rosette / Gear Foliations -->
            <circle cx="0" cy="-32" r="32" fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="3"/>
            <circle cx="-32" cy="16" r="32" fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="3"/>
            <circle cx="32" cy="16" r="32" fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="3"/>
            <circle cx="0" cy="-32" r="16" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/>
            <circle cx="-32" cy="16" r="16" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/>
            <circle cx="32" cy="16" r="16" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/>
            <!-- Chalice Stem Base -->
            <path d="M-12 25 L-24 75 L24 75 L12 25 Z" fill="url(#${theme.id}_gold)" stroke="${theme.primaryRed}" stroke-width="2"/>
            <circle cx="0" cy="10" r="9" fill="url(#${theme.id}_gold)"/>
            <circle cx="0" cy="10" r="4" fill="#fff"/>
          </g>
        `;
    }
  };
}

// Reversible Court Card Builder
function buildThemeCourtCard(theme, rank, suit, title, upperFigureSvg) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${getThemeDefs(theme)}</defs>
  ${buildThemeBaseCard(theme, rank, suit, true)}

  <!-- REVERSIBLE COURT FIGURE COMPOSITION -->
  <!-- 1. Upper Torso -->
  <g clip-path="url(#${theme.id}_split_upper)">
    <g id="figure_${rank}_${suit}">
      ${upperFigureSvg}
    </g>
  </g>

  <!-- 2. Lower Torso (180° Inversion) -->
  <g transform="rotate(180 375 525)" clip-path="url(#${theme.id}_split_upper)">
    <g>
      ${upperFigureSvg}
    </g>
  </g>

  <!-- 3. Masking Heraldic Sash -->
  ${getThemeSash(theme)}

  <!-- Title Banners -->
  <g transform="translate(375, 84)">
    <rect x="-160" y="-18" width="320" height="32" rx="16" fill="${theme.cartoucheBg}" stroke="url(#${theme.id}_gold)" stroke-width="2"/>
    <text x="0" y="5" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="15" fill="#fffdf7" letter-spacing="3" text-anchor="middle">${title}</text>
  </g>
  <g transform="rotate(180 375 525)">
    <g transform="translate(375, 84)">
      <rect x="-160" y="-18" width="320" height="32" rx="16" fill="${theme.cartoucheBg}" stroke="url(#${theme.id}_gold)" stroke-width="2"/>
      <text x="0" y="5" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="15" fill="#fffdf7" letter-spacing="3" text-anchor="middle">${title}</text>
    </g>
  </g>
</svg>`;
}

// Generate Court Upper Body according to English Pattern Invariants
function getEnglishPatternUpper(theme, rank, suit) {
  const gId = `${theme.id}_gold`;
  const rId = `${theme.id}_ruby`;
  const dId = `${theme.id}_dark`;
  const sId = `${theme.id}_steel`;

  if (rank === 'K' && suit === 'hearts') {
    // 1. King of Hearts (Charles / Suicide King, Clean Shaven)
    return `
      <g transform="translate(375, 420)" id="figure_charlemagne" data-model="Charlemagne">
        <path d="M-210 120 C-190 -40 -120 -140 0 -140 C120 -140 190 -40 210 120 Z" fill="url(#${rId})" stroke="${theme.primaryRed}" stroke-width="3"/>
        <path d="M-170 120 C-150 0 -90 -80 0 -80 C90 -80 150 0 170 120 Z" fill="url(#${theme.id}_damask)" stroke="url(#${gId})" stroke-width="2"/>
        <path d="M-60 120 L-45 -50 Q0 -60 45 -50 L60 120 Z" fill="url(#${dId})" stroke="url(#${gId})" stroke-width="3"/>

        <!-- Suicide Sword Horizontally Behind Head -->
        <g transform="translate(0, -220)" id="suicide_broadsword">
          <rect x="-220" y="-14" width="320" height="28" rx="4" fill="url(#${sId})" stroke="#374151" stroke-width="2"/>
          <line x1="-210" y1="0" x2="80" y2="0" stroke="#fff" stroke-width="3"/>
          <rect x="80" y="-36" width="18" height="72" rx="6" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="2"/>
          <rect x="98" y="-12" width="60" height="24" rx="6" fill="${theme.primaryRed}" stroke="url(#${gId})" stroke-width="2"/>
          <circle cx="170" cy="0" r="16" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="2"/>
          <circle cx="170" cy="0" r="8" fill="#e11d48"/>
        </g>

        <!-- Head: Clean-Shaven (NO Mustache) -->
        <g transform="translate(-10, -170)" id="charlemagne_head" data-clean-shaven="true" data-mustache="none">
          <ellipse cx="0" cy="40" rx="42" ry="50" fill="#fcd9bd"/>
          <path d="M-45 -20 C-50 40 -35 85 0 95 C35 85 50 40 45 -20 Z" fill="#ffdcc7" stroke="#e0a98b" stroke-width="2"/>
          <ellipse cx="-20" cy="10" rx="9" ry="6" fill="#fff"/>
          <circle cx="-22" cy="10" r="4.5" fill="#2d527c"/>
          <ellipse cx="20" cy="10" rx="9" ry="6" fill="#fff"/>
          <circle cx="18" cy="10" r="4.5" fill="#2d527c"/>
          <path d="M-2 8 L-6 32 L5 32" stroke="#d97706" stroke-width="2" fill="none"/>
          <!-- Smooth Clean Lips (No Mustache) -->
          <path d="M-16 54 Q0 60 16 54" stroke="#991b1b" stroke-width="3" fill="none"/>
          <path d="M-45 -10 C-65 30 -60 80 -40 100 Q-50 60 -42 20 Z" fill="url(#${gId})"/>
          <path d="M45 -10 C65 30 60 80 40 100 Q50 60 42 20 Z" fill="url(#${gId})"/>
          <!-- Crown -->
          <path d="M-55 -25 L-65 -85 L-30 -55 L0 -95 L30 -55 L65 -85 L55 -25 Z" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="3"/>
          <circle cx="0" cy="-95" r="7" fill="url(#${gId})"/>
        </g>
        <!-- Dual Hand Hold -->
        <g transform="translate(110, -210)" id="left_hand_grip">
          <ellipse cx="0" cy="0" rx="20" ry="16" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
        </g>
        <g transform="translate(-40, 20)" id="right_hand_lapel">
          <ellipse cx="0" cy="0" rx="18" ry="15" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
        </g>
      </g>
    `;
  }

  if (rank === 'K' && suit === 'spades') {
    // 2. King of Spades (David / Curled Beard, Harp, Upright Broadsword)
    return `
      <g transform="translate(375, 420)" id="figure_david" data-model="David">
        <path d="M-210 120 C-190 -40 -120 -140 0 -140 C120 -140 190 -40 210 120 Z" fill="url(#${dId})" stroke="${theme.borderStroke}" stroke-width="3"/>
        <!-- Harp Motif -->
        <g transform="translate(-110, -20)" stroke="url(#${gId})" stroke-width="3" fill="none" id="david_harp_motif">
          <path d="M0 80 C-30 40 -40 -20 0 -60 C30 -20 20 40 40 80" stroke-width="5"/>
          <line x1="-5" y1="-40" x2="10" y2="70"/>
          <line x1="5" y1="-30" x2="20" y2="70"/>
          <line x1="15" y1="-20" x2="30" y2="70"/>
        </g>
        <!-- Upright Broadsword in Left Hand -->
        <g transform="translate(140, -120)" id="david_broadsword">
          <rect x="-10" y="-160" width="20" height="240" rx="3" fill="url(#${sId})" stroke="#374151" stroke-width="2"/>
          <path d="M-40 60 L40 60 L30 75 L-30 75 Z" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="2"/>
          <ellipse cx="0" cy="90" rx="18" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
        </g>
        <!-- Head with Upward Hair & Curled Beard -->
        <g transform="translate(10, -170)" id="david_head">
          <ellipse cx="0" cy="40" rx="45" ry="50" fill="#fcd9bd"/>
          <path d="M-45 -20 Q-70 -60 -40 -80 Q-55 -40 -35 -30" stroke="url(#${gId})" stroke-width="8" fill="none"/>
          <path d="M45 -20 Q70 -60 40 -80 Q55 -40 35 -30" stroke="url(#${gId})" stroke-width="8" fill="none"/>
          <ellipse cx="-18" cy="15" rx="8" ry="6" fill="#fff"/>
          <circle cx="-16" cy="15" r="4" fill="#1e3a8a"/>
          <ellipse cx="22" cy="15" rx="8" ry="6" fill="#fff"/>
          <circle cx="24" cy="15" r="4" fill="#1e3a8a"/>
          <path d="M-45 35 C-50 110 -20 150 0 160 C20 150 50 110 45 35 Z" fill="url(#${gId})" stroke="#7a0d17" stroke-width="2" id="david_curled_beard"/>
          <path d="M-50 -25 L-60 -80 L-25 -50 L0 -90 L25 -50 L60 -80 L50 -25 Z" fill="url(#${gId})" stroke="${theme.borderStroke}" stroke-width="3"/>
        </g>
      </g>
    `;
  }

  if (rank === 'K' && suit === 'diamonds') {
    // 3. King of Diamonds (Caesar / One-Eyed Profile Left, Battleaxe, Waving Hand)
    return `
      <g transform="translate(375, 420)" id="figure_caesar" data-model="Caesar" data-eyes="1">
        <path d="M-210 120 C-190 -40 -120 -140 0 -140 C120 -140 190 -40 210 120 Z" fill="url(#${rId})" stroke="${theme.primaryRed}" stroke-width="3"/>
        <!-- Floating Battleaxe Behind Shoulder -->
        <g transform="translate(130, -140)" id="caesar_battleaxe">
          <rect x="-8" y="-70" width="16" height="240" rx="4" fill="#78350f" stroke="url(#${gId})" stroke-width="2"/>
          <path d="M0 -30 C60 -60 90 -20 70 40 C50 80 0 50 0 50 Z" fill="url(#${sId})" stroke="#1f2937" stroke-width="3"/>
        </g>
        <!-- Raised Waving Open Palm -->
        <g transform="translate(-130, -40)" id="caesar_waving_palm">
          <ellipse cx="0" cy="15" rx="20" ry="18" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
          <rect x="-18" y="-20" width="8" height="26" rx="4" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
          <rect x="-8" y="-28" width="8" height="32" rx="4" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
          <rect x="2" y="-26" width="8" height="30" rx="4" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
          <rect x="12" y="-18" width="8" height="22" rx="4" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
        </g>
        <!-- Profile Head: Pure Left Profile -->
        <g transform="translate(-15, -170)" id="caesar_profile_head">
          <path d="M30 -60 C30 -60 10 -65 -20 -40 C-35 -25 -40 0 -45 5 L-65 15 L-48 25 L-48 42 L-60 48 L-44 55 C-40 75 -20 90 20 90 L30 90 Z" fill="#ffdcc7" stroke="#e0a98b" stroke-width="2"/>
          <ellipse cx="-32" cy="12" rx="7" ry="5" fill="#fff" id="caesar_single_eye"/>
          <circle cx="-35" cy="12" r="3.5" fill="#1e3a8a"/>
          <polygon points="-20,-50 -25,-85 -10,-60" fill="url(#${gId})"/>
          <polygon points="0,-55 5,-95 15,-62" fill="url(#${gId})"/>
          <polygon points="20,-52 35,-88 32,-58" fill="url(#${gId})"/>
        </g>
      </g>
    `;
  }

  if (rank === 'K' && suit === 'clubs') {
    // 4. King of Clubs (Alexander / Broadsword, Imperial Orb)
    return `
      <g transform="translate(375, 420)" id="figure_alexander" data-model="Alexander">
        <path d="M-210 120 C-190 -40 -120 -140 0 -140 C120 -140 190 -40 210 120 Z" fill="url(#${dId})" stroke="${theme.borderStroke}" stroke-width="3"/>
        <!-- Imperial Orb in Right Hand -->
        <g transform="translate(-130, 20)" id="alexander_imperial_orb">
          <circle cx="0" cy="0" r="28" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="3"/>
          <g transform="translate(0, -38)" stroke="url(#${gId})" stroke-width="4" fill="none">
            <line x1="0" y1="-12" x2="0" y2="10"/>
            <line x1="-8" y1="-4" x2="8" y2="-4"/>
          </g>
          <ellipse cx="0" cy="24" rx="20" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
        </g>
        <!-- Broadsword in Left Hand -->
        <g transform="translate(130, -30)" id="alexander_broadsword">
          <rect x="-8" y="-120" width="16" height="200" rx="3" fill="url(#${sId})" stroke="#374151" stroke-width="2"/>
          <ellipse cx="0" cy="65" rx="18" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
        </g>
        <g transform="translate(-10, -170)" id="alexander_head">
          <ellipse cx="0" cy="40" rx="45" ry="50" fill="#fcd9bd"/>
          <path d="M-45 -10 C-75 30 -70 90 -40 120 Q-60 80 -45 30 Z" fill="url(#${gId})"/>
          <path d="M45 -10 C75 30 70 90 40 120 Q60 80 45 30 Z" fill="url(#${gId})"/>
          <ellipse cx="-18" cy="15" rx="8" ry="6" fill="#fff"/>
          <circle cx="-20" cy="15" r="4" fill="#15803d"/>
          <ellipse cx="20" cy="15" rx="8" ry="6" fill="#fff"/>
          <circle cx="18" cy="15" r="4" fill="#15803d"/>
          <path d="M-50 -25 L-60 -80 L-25 -50 L0 -90 L25 -50 L60 -80 L50 -25 Z" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="3"/>
        </g>
      </g>
    `;
  }

  if (rank === 'Q' && suit === 'spades') {
    // 5. Queen of Spades (Athena / Upright Spear, Brocade Hood, NO Flowers)
    return `
      <g transform="translate(375, 420)" id="figure_athena" data-model="Pallas Athena" data-armed="true" data-flowers="none">
        <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#${dId})" stroke="${theme.borderStroke}" stroke-width="3"/>
        <path d="M-130 120 L-90 -120 L90 -120 L130 120 Z" fill="url(#${gId})" opacity="0.8" id="athena_brocade_hood"/>
        <!-- Upright Warrior Spear / Scepter -->
        <g transform="translate(130, -90)" id="athena_warrior_lance">
          <rect x="-6" y="-170" width="12" height="280" rx="4" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="2"/>
          <polygon points="0,-210 -16,-170 16,-170" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="2"/>
          <circle cx="0" cy="-160" r="10" fill="#ef4444"/>
          <ellipse cx="0" cy="50" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
        </g>
        <!-- Athena Head & Brocade Hood -->
        <g transform="translate(10, -160)" id="athena_head">
          <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
          <path d="M-55 50 C-60 -40 -35 -80 0 -80 C35 -80 60 -40 55 50 Z" fill="url(#${rId})" stroke="url(#${gId})" stroke-width="3"/>
          <ellipse cx="0" cy="30" rx="34" ry="40" fill="#ffe4d6"/>
          <ellipse cx="-14" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="-12" cy="18" r="3.8" fill="#1e3a8a"/>
          <ellipse cx="20" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="22" cy="18" r="3.8" fill="#1e3a8a"/>
        </g>
      </g>
    `;
  }

  if (rank === 'Q' && suit === 'hearts') {
    // 6. Queen of Hearts (Judith / Botanical Cutting, Ermine Mantle)
    return `
      <g transform="translate(375, 420)" id="figure_judith" data-model="Judith">
        <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#${rId})" stroke="${theme.primaryRed}" stroke-width="3"/>
        <path d="M-150 120 C-130 10 -70 -70 0 -70 C70 -70 130 10 150 120 Z" fill="url(#${theme.id}_damask)" stroke="url(#${gId})" stroke-width="2" id="judith_ermine_mantle"/>
        <!-- Botanical Cutting Held in Hand -->
        <g transform="translate(-110, -20)" id="judith_botanical_cutting">
          <ellipse cx="0" cy="0" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
          <path d="M4 -8 Q10 -35 25 -45 Q15 -30 20 -20" stroke="#15803d" stroke-width="3" fill="none"/>
          <circle cx="20" cy="-35" r="5.5" fill="#dc2626"/>
          <circle cx="26" cy="-42" r="4.5" fill="#dc2626"/>
        </g>
        <g transform="translate(-10, -160)" id="judith_head">
          <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
          <ellipse cx="0" cy="30" rx="34" ry="40" fill="#ffe4d6"/>
          <ellipse cx="-16" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="-18" cy="18" r="3.8" fill="#1e3a8a"/>
          <ellipse cx="16" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="14" cy="18" r="3.8" fill="#1e3a8a"/>
          <path d="M-35 -30 L-20 -50 L0 -35 L20 -50 L35 -30 Z" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="2"/>
        </g>
      </g>
    `;
  }

  if (rank === 'Q' && suit === 'diamonds') {
    // 7. Queen of Diamonds (Rachel / Floral Sprig, Pleated Geometric Gown)
    return `
      <g transform="translate(375, 420)" id="figure_rachel" data-model="Rachel">
        <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#${dId})" stroke="${theme.borderStroke}" stroke-width="3"/>
        <g stroke="url(#${gId})" stroke-width="2" fill="none" id="rachel_pleated_gown">
          <polygon points="0,-70 -40,10 0,90 40,10" fill="${theme.cardBg}" opacity="0.9"/>
          <polygon points="0,-50 -25,10 0,70 25,10" fill="url(#${gId})" opacity="0.5"/>
        </g>
        <!-- Floral Sprig -->
        <g transform="translate(-30, 20)" id="rachel_floral_sprig">
          <ellipse cx="0" cy="0" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
          <path d="M-4 -5 Q-15 -25 -25 -30 Q-10 -20 -4 -15" stroke="#15803d" stroke-width="3" fill="none"/>
          <circle cx="-25" cy="-30" r="6" fill="#3b82f6"/>
        </g>
        <g transform="translate(-10, -160)" id="rachel_head">
          <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
          <ellipse cx="-16" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="-18" cy="18" r="3.8" fill="#2563eb"/>
          <ellipse cx="16" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="14" cy="18" r="3.8" fill="#2563eb"/>
          <polygon points="-40,-35 -20,-60 0,-40 20,-60 40,-35" fill="url(#${gId})" stroke="${theme.borderStroke}" stroke-width="2"/>
        </g>
      </g>
    `;
  }

  if (rank === 'Q' && suit === 'clubs') {
    // 8. Queen of Clubs (Argine / Tudor English Heraldic Rose)
    return `
      <g transform="translate(375, 420)" id="figure_argine" data-model="Argine">
        <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#${dId})" stroke="${theme.borderStroke}" stroke-width="3"/>
        <path d="M-140 120 L-80 -80 L80 -80 L140 120 Z" fill="url(#${rId})" stroke="url(#${gId})" stroke-width="2"/>
        <!-- Tudor English Heraldic Rose -->
        <g transform="translate(-110, -20)" id="argine_tudor_rose">
          <ellipse cx="0" cy="0" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
          <g transform="translate(18, -35)">
            <circle cx="0" cy="-10" r="10" fill="#dc2626"/>
            <circle cx="10" cy="0" r="10" fill="#dc2626"/>
            <circle cx="0" cy="10" r="10" fill="#dc2626"/>
            <circle cx="-10" cy="0" r="10" fill="#dc2626"/>
            <circle cx="0" cy="0" r="6" fill="#fffdf7"/>
            <circle cx="0" cy="0" r="3" fill="url(#${gId})"/>
          </g>
        </g>
        <g transform="translate(-10, -160)" id="argine_head">
          <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
          <ellipse cx="-16" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="-18" cy="18" r="3.8" fill="#1e3a8a"/>
          <ellipse cx="16" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="14" cy="18" r="3.8" fill="#1e3a8a"/>
          <path d="M-40 -25 C-30 -50 -15 -50 -10 -35 C-5 -55 5 -55 10 -35 C15 -50 30 -50 40 -25 Z" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="2"/>
        </g>
      </g>
    `;
  }

  if (rank === 'J' && suit === 'spades') {
    // 9. Jack of Spades (Ogier / Profile Right, Mustache, Spiraled Pike)
    return `
      <g transform="translate(375, 420)" id="figure_ogier" data-model="Ogier" data-eyes="1">
        <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#${dId})" stroke="${theme.borderStroke}" stroke-width="3"/>
        <!-- Spiraled Pike Shaft -->
        <g transform="translate(-130, -100)" id="ogier_spiraled_pike">
          <rect x="-8" y="-140" width="16" height="260" rx="4" fill="#78350f" stroke="#1f2937" stroke-width="2"/>
          <path d="M-8 -110 Q8 -95 -8 -80 Q8 -65 -8 -50 Q8 -35 -8 -20 Q8 -5 -8 10 Q8 25 -8 40" stroke="url(#${gId})" stroke-width="5" fill="none"/>
          <polygon points="0,-180 -14,-140 14,-140" fill="url(#${sId})" stroke="#1f2937" stroke-width="2"/>
          <ellipse cx="0" cy="60" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
        </g>
        <!-- Profile Right with Mustache -->
        <g transform="translate(20, -160)" id="ogier_profile_head">
          <path d="M-30 -60 C-30 -60 -10 -65 20 -40 C35 -25 40 0 45 5 L65 15 L48 25 L48 42 L60 48 L44 55 C40 75 20 90 -20 90 L-30 90 Z" fill="#ffdcc7" stroke="#e0a98b" stroke-width="2"/>
          <ellipse cx="32" cy="12" rx="7" ry="5" fill="#fff" id="ogier_single_eye"/>
          <circle cx="35" cy="12" r="3.5" fill="#1e3a8a"/>
          <path d="M30 40 Q45 35 55 45 Q42 50 30 45 Z" fill="#4a3728" id="ogier_mustache"/>
          <path d="M-40 -40 C-20 -70 20 -70 40 -40 L45 -20 L-45 -20 Z" fill="url(#${dId})" stroke="url(#${gId})" stroke-width="2"/>
        </g>
      </g>
    `;
  }

  if (rank === 'J' && suit === 'hearts') {
    // 10. Jack of Hearts (La Hire / Profile Left, Soldier Cap, Poleaxe, Curled Ribbon)
    return `
      <g transform="translate(375, 420)" id="figure_lahire" data-model="La Hire" data-eyes="1">
        <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#${rId})" stroke="${theme.primaryRed}" stroke-width="3"/>
        <!-- Halberd Poleaxe -->
        <g transform="translate(120, -120) rotate(15)" id="lahire_poleaxe_halberd">
          <rect x="-8" y="-90" width="16" height="260" rx="4" fill="#78350f" stroke="#1f2937" stroke-width="2"/>
          <path d="M0 -60 C40 -80 60 -40 45 10 C30 35 0 20 0 20 Z" fill="url(#${sId})" stroke="#1f2937" stroke-width="2"/>
          <polygon points="0,-30 -35,-40 0,-15" fill="url(#${sId})"/>
        </g>
        <!-- Curled Ribbon -->
        <g transform="translate(-50, 10)" id="lahire_curled_ribbon">
          <ellipse cx="0" cy="0" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="1.5"/>
          <path d="M0 -8 C-20 -25 0 -45 15 -35 C5 -25 15 -15 0 -8 Z" fill="#fffdfa" stroke="url(#${gId})" stroke-width="2"/>
        </g>
        <!-- Profile Left with Barret Cap -->
        <g transform="translate(-15, -160)" id="lahire_profile_head">
          <path d="M30 -60 C30 -60 10 -65 -20 -40 C-35 -25 -40 0 -45 5 L-65 15 L-48 25 L-48 42 L-60 48 L-44 55 C-40 75 -20 90 20 90 L30 90 Z" fill="#ffdcc7" stroke="#e0a98b" stroke-width="2"/>
          <ellipse cx="-32" cy="12" rx="7" ry="5" fill="#fff" id="lahire_single_eye"/>
          <circle cx="-35" cy="12" r="3.5" fill="#1e3a8a"/>
          <path d="M-50 -10 C-60 -60 0 -70 45 -40 L40 -10 Z" fill="${theme.primaryRed}" stroke="url(#${gId})" stroke-width="3" id="lahire_barret_cap"/>
        </g>
      </g>
    `;
  }

  if (rank === 'J' && suit === 'diamonds') {
    // 11. Jack of Diamonds (Hector / Crossbow Crossbar Halberd, Brimmed Cap)
    return `
      <g transform="translate(375, 420)" id="figure_hector" data-model="Hector">
        <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#${dId})" stroke="${theme.borderStroke}" stroke-width="3"/>
        <path d="M-20 -60 L20 -60 L30 10 L0 30 L-30 10 Z" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="2"/>
        <!-- Halberd with Crossbow Catch Crossbar -->
        <g transform="translate(-130, -90)" id="hector_crossbow_halberd">
          <rect x="-6" y="-160" width="12" height="260" rx="3" fill="#78350f" stroke="#1f2937" stroke-width="2"/>
          <path d="M-40 -80 L40 -80 L35 -65 L-35 -65 Z" fill="url(#${sId})" stroke="#1f2937" stroke-width="2"/>
          <polygon points="-40,-80 -55,-72 -40,-65" fill="url(#${sId})"/>
          <polygon points="40,-80 55,-72 40,-65" fill="url(#${sId})"/>
          <polygon points="0,-185 -15,-150 15,-150" fill="url(#${sId})"/>
          <ellipse cx="0" cy="40" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
        </g>
        <!-- Brimmed Cap with Upturned Flaps -->
        <g transform="translate(-10, -160)" id="hector_head">
          <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
          <ellipse cx="-16" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="-18" cy="18" r="3.8" fill="#15803d"/>
          <ellipse cx="16" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="14" cy="18" r="3.8" fill="#15803d"/>
          <path d="M-45 -20 L-55 -55 L55 -55 L45 -20 Z" fill="${theme.primaryRed}" stroke="url(#${gId})" stroke-width="2"/>
          <path d="M-55 -55 Q-65 -30 -50 -15" stroke="url(#${gId})" stroke-width="4" fill="none"/>
          <path d="M55 -55 Q65 -30 50 -15" stroke="url(#${gId})" stroke-width="4" fill="none"/>
        </g>
      </g>
    `;
  }

  if (rank === 'J' && suit === 'clubs') {
    // 12. Jack of Clubs (Lancelot / Lance & Buckler Shield, Feather Cap)
    return `
      <g transform="translate(375, 420)" id="figure_lancelot" data-model="Lancelot">
        <path d="M-200 120 C-180 -30 -110 -120 0 -120 C110 -120 180 -30 200 120 Z" fill="url(#${rId})" stroke="${theme.primaryRed}" stroke-width="3"/>
        <!-- Upright Lance & Buckler Shield -->
        <g transform="translate(130, -70)" id="lancelot_lance_buckler">
          <rect x="-6" y="-170" width="12" height="260" rx="3" fill="#78350f" stroke="#1f2937" stroke-width="2"/>
          <polygon points="0,-195 -12,-165 12,-165" fill="url(#${sId})"/>
          <ellipse cx="0" cy="10" rx="16" ry="14" fill="#fcd9bd" stroke="#c2410c" stroke-width="2"/>
          <g transform="translate(0, 50)" id="lancelot_buckler_shield">
            <circle cx="0" cy="0" r="34" fill="url(#${gId})" stroke="${theme.primaryRed}" stroke-width="3"/>
            <circle cx="0" cy="0" r="22" fill="url(#${dId})" stroke="url(#${gId})" stroke-width="2"/>
            <circle cx="0" cy="0" r="8" fill="#dc2626"/>
          </g>
        </g>
        <!-- Feathered Cap -->
        <g transform="translate(10, -160)" id="lancelot_head">
          <ellipse cx="0" cy="35" rx="38" ry="46" fill="#fcd9bd"/>
          <ellipse cx="-14" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="-12" cy="18" r="3.8" fill="#1e3a8a"/>
          <ellipse cx="20" cy="18" rx="7" ry="5.5" fill="#fff"/>
          <circle cx="22" cy="18" r="3.8" fill="#1e3a8a"/>
          <path d="M-45 -20 C-40 -60 40 -60 45 -20 Z" fill="${theme.primaryRed}" stroke="url(#${gId})" stroke-width="2"/>
          <path d="M20 -40 Q55 -75 75 -50 Q45 -55 25 -35" fill="#fffdfa" stroke="url(#${gId})" stroke-width="1.5"/>
        </g>
      </g>
    `;
  }
}

// Master Ace of Spades per Theme
function buildThemeMasterAce(theme) {
  const pipFunc = getThemedSuitPipRenderer(theme, 'spades');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${getThemeDefs(theme)}</defs>
  ${buildThemeBaseCard(theme, 'A', 'spades', false)}

  <!-- GRAND MASTER ACE OF SPADES -->
  <g transform="translate(375, 525)" filter="url(#${theme.id}_shadow)">
    <!-- Ornate Outer Guilloché Oval -->
    <ellipse cx="0" cy="0" rx="260" ry="340" fill="${theme.cardBg}" stroke="url(#${theme.id}_gold)" stroke-width="10"/>
    <ellipse cx="0" cy="0" rx="245" ry="325" fill="${theme.cartoucheBg}" stroke="${theme.primaryRed}" stroke-width="3"/>
    <ellipse cx="0" cy="0" rx="235" ry="315" fill="none" stroke="url(#${theme.id}_gold)" stroke-width="2" stroke-dasharray="6 4"/>

    <!-- Radiant Starlight Rays -->
    <g opacity="0.35" stroke="url(#${theme.id}_gold)" stroke-width="1.5">
      ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => `
        <line x1="0" y1="0" x2="${Math.cos(deg * Math.PI / 180) * 230}" y2="${Math.sin(deg * Math.PI / 180) * 310}"/>
      `).join('')}
    </g>

    <!-- Grand Master Spade Pip -->
    ${pipFunc(0, -30, 2.2)}

    <!-- Tax-Stamp Banners -->
    <g transform="translate(0, 220)">
      <path d="M-180 0 Q0 -30 180 0 L160 50 Q0 20 -160 50 Z" fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="3"/>
      <text x="0" y="32" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="24" fill="#fffdfa" letter-spacing="6" text-anchor="middle">SOVEREIGN</text>
    </g>
    <g transform="translate(0, -240)">
      <rect x="-140" y="-20" width="280" height="36" rx="18" fill="${theme.cartoucheBg}" stroke="url(#${theme.id}_gold)" stroke-width="2.5"/>
      <text x="0" y="5" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="16" fill="url(#${theme.id}_gold)" letter-spacing="4" text-anchor="middle">${theme.title}</text>
    </g>
  </g>
</svg>`;
}

// Themed Aces (Hearts, Diamonds, Clubs)
function buildThemeAce(theme, suit, title) {
  const pipFunc = getThemedSuitPipRenderer(theme, suit);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${getThemeDefs(theme)}</defs>
  ${buildThemeBaseCard(theme, 'A', suit, false)}

  <g transform="translate(375, 525)" filter="url(#${theme.id}_shadow)">
    <ellipse cx="0" cy="0" rx="250" ry="330" fill="${theme.cardBg}" stroke="url(#${theme.id}_gold)" stroke-width="8"/>
    <ellipse cx="0" cy="0" rx="235" ry="315" fill="${theme.cartoucheBg}" stroke="${theme.primaryRed}" stroke-width="3"/>

    <g opacity="0.3" stroke="url(#${theme.id}_gold)" stroke-width="1.5">
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
        <line x1="0" y1="0" x2="${Math.cos(deg * Math.PI / 180) * 220}" y2="${Math.sin(deg * Math.PI / 180) * 300}"/>
      `).join('')}
    </g>

    ${pipFunc(0, -20, 2.0)}

    <g transform="translate(0, 230)">
      <rect x="-150" y="-18" width="300" height="36" rx="18" fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="2.5"/>
      <text x="0" y="6" font-family="'Cinzel', 'Georgia', serif" font-weight="700" font-size="16" fill="#fffdfa" letter-spacing="4" text-anchor="middle">${title}</text>
    </g>
  </g>
</svg>`;
}

// Pip Cards (2-10)
function buildThemePipCard(theme, rank, suit) {
  const pipFunc = getThemedSuitPipRenderer(theme, suit);

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
  <defs>${getThemeDefs(theme)}</defs>
  ${buildThemeBaseCard(theme, rank, suit, false)}

  <path d="${notchedRectPath(94, 94, 562, 862, 16)}" fill="none" stroke="url(#${theme.id}_gold)" stroke-width="2" opacity="0.6"/>

  ${positions.map(([rx, ry]) => {
    const px = Math.round(750 * rx);
    const py = Math.round(1050 * ry);
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

// Themed High Joker & Low Joker
function buildThemeHighJoker(theme) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${getThemeDefs(theme)}</defs>
  ${buildThemeBaseCard(theme, '★', 'hearts', true)}

  <g transform="translate(375, 525)" filter="url(#${theme.id}_shadow)">
    <path d="M-180 180 C-150 20 -80 -40 0 -40 C80 -40 150 20 180 180 Z" fill="url(#${theme.id}_ruby)" stroke="${theme.primaryRed}" stroke-width="3"/>
    <g fill="url(#${theme.id}_gold)" stroke="${theme.primaryRed}" stroke-width="2">
      <polygon points="0,-20 -20,60 0,30 20,60"/>
      <polygon points="-40,-10 -70,60 -40,30 -20,60"/>
      <polygon points="40,-10 70,60 40,30 20,60"/>
      <circle cx="-70" cy="65" r="8"/>
      <circle cx="-20" cy="65" r="8"/>
      <circle cx="20" cy="65" r="8"/>
      <circle cx="70" cy="65" r="8"/>
    </g>
    <ellipse cx="0" cy="-60" rx="45" ry="52" fill="#ffdcc7"/>
    <ellipse cx="-18" cy="-70" rx="7" ry="5.5" fill="#fff"/>
    <circle cx="-16" cy="-70" r="3.5" fill="#1e3a8a"/>
    <ellipse cx="18" cy="-70" rx="7" ry="5.5" fill="#fff"/>
    <circle cx="16" cy="-70" r="3.5" fill="#1e3a8a"/>
    <path d="M-18 -40 Q0 -25 18 -40" stroke="#b91c1c" stroke-width="3.5" fill="none"/>
    <g fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="3">
      <path d="M-30 -100 C-70 -140 -130 -140 -120 -80 C-100 -90 -50 -90 -20 -100 Z"/>
      <path d="M30 -100 C70 -140 130 -140 120 -80 C100 -90 50 -90 20 -100 Z" fill="url(#${theme.id}_dark)"/>
      <path d="M-25 -100 C-10 -180 10 -180 25 -100 Z" fill="url(#${theme.id}_gold)"/>
      <circle cx="-120" cy="-80" r="10" fill="url(#${theme.id}_gold)"/>
      <circle cx="120" cy="-80" r="10" fill="url(#${theme.id}_gold)"/>
      <circle cx="0" cy="-180" r="12" fill="url(#${theme.id}_gold)"/>
    </g>
    <g transform="translate(0, 180)">
      <rect x="-160" y="-22" width="320" height="44" rx="22" fill="${theme.cartoucheBg}" stroke="url(#${theme.id}_gold)" stroke-width="3"/>
      <text x="0" y="8" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="20" fill="url(#${theme.id}_gold)" letter-spacing="6" text-anchor="middle">WILD JOKER</text>
    </g>
  </g>
</svg>`;
}

function buildThemeLowJoker(theme) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${getThemeDefs(theme)}</defs>
  ${buildThemeBaseCard(theme, '★', 'spades', true)}

  <g transform="translate(375, 525)" filter="url(#${theme.id}_shadow)">
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
    <ellipse cx="0" cy="-60" rx="45" ry="52" fill="#edf2f7"/>
    <ellipse cx="-18" cy="-70" rx="7" ry="5.5" fill="#fff"/>
    <circle cx="-16" cy="-70" r="3.5" fill="#1a202c"/>
    <ellipse cx="18" cy="-70" rx="7" ry="5.5" fill="#fff"/>
    <circle cx="16" cy="-70" r="3.5" fill="#1a202c"/>
    <path d="M-18 -40 Q0 -25 18 -40" stroke="#1a202c" stroke-width="3.5" fill="none"/>
    <g fill="#4a5568" stroke="#1a202c" stroke-width="3">
      <path d="M-30 -100 C-70 -140 -130 -140 -120 -80 C-100 -90 -50 -90 -20 -100 Z"/>
      <path d="M30 -100 C70 -140 130 -140 120 -80 C100 -90 50 -90 20 -100 Z" fill="#718096"/>
      <path d="M-25 -100 C-10 -180 10 -180 25 -100 Z" fill="#cbd5e1"/>
      <circle cx="-120" cy="-80" r="10" fill="#e2e8f0"/>
      <circle cx="120" cy="-80" r="10" fill="#e2e8f0"/>
      <circle cx="0" cy="-180" r="12" fill="#e2e8f0"/>
    </g>
    <g transform="translate(0, 180)">
      <rect x="-140" y="-22" width="280" height="44" rx="22" fill="#1a202c" stroke="#e2e8f0" stroke-width="2.5"/>
      <text x="0" y="8" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="20" fill="#f8fafc" letter-spacing="6" text-anchor="middle">JOKER</text>
    </g>
  </g>
</svg>`;
}

// Themed Card Back (180° Rotational Point Symmetry, Border >= 0.375")
function buildThemeCardBack(theme) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${getThemeDefs(theme)}</defs>

  <!-- Exterior Security Framing Border (width >= 0.375") -->
  <rect width="750" height="1050" rx="38" fill="${theme.cardBg}" stroke="${theme.borderStroke}" stroke-width="4"/>
  <rect x="20" y="20" width="710" height="1010" rx="26" fill="none" stroke="url(#${theme.id}_gold)" stroke-width="8"/>
  <rect x="45" y="45" width="660" height="960" rx="18" fill="${theme.cartoucheBg}" stroke="${theme.borderStroke}" stroke-width="4"/>
  <rect x="52" y="52" width="646" height="946" rx="14" fill="${theme.cartoucheBg}" stroke="url(#${theme.id}_gold)" stroke-width="2"/>

  <!-- Wallpaper Inset -->
  <rect x="58" y="58" width="634" height="934" rx="10" fill="url(#${theme.id}_damask)"/>

  <!-- Two-Way 180° Point-Symmetric Lattice -->
  <g stroke="url(#${theme.id}_gold)" stroke-width="1.5" fill="none" opacity="0.85">
    <path d="M75 140 C140 100 240 100 300 150 M450 150 C510 100 610 100 675 140"/>
    <path d="M100 75 C100 140 100 240 150 300 M650 75 C650 140 650 240 600 300"/>
    <path d="M75 910 C140 950 240 950 300 900 M450 900 C510 950 610 950 675 910"/>
    <path d="M100 975 C100 910 100 810 150 750 M650 975 C650 910 650 810 600 750"/>
  </g>

  <!-- Central Two-Way Symmetric Medallion -->
  <g transform="translate(375, 525)">
    <circle cx="0" cy="0" r="170" fill="${theme.cardBg}" stroke="url(#${theme.id}_gold)" stroke-width="10"/>
    <circle cx="0" cy="0" r="152" fill="${theme.cartoucheBg}" stroke="${theme.primaryRed}" stroke-width="4"/>
    <circle cx="0" cy="0" r="138" fill="url(#${theme.id}_ruby)" stroke="url(#${theme.id}_gold)" stroke-width="2"/>
    <circle cx="0" cy="0" r="115" stroke-dasharray="6 4" fill="none" stroke="url(#${theme.id}_gold)" stroke-width="2.5"/>

    <g transform="translate(0, -45)">
      <circle cx="0" cy="0" r="30" fill="url(#${theme.id}_gold)" stroke="${theme.primaryRed}" stroke-width="2"/>
      <circle cx="0" cy="0" r="12" fill="${theme.primaryRed}"/>
      <circle cx="-20" cy="0" r="5" fill="${theme.primaryRed}"/>
      <circle cx="20" cy="0" r="5" fill="${theme.primaryRed}"/>
    </g>
    <g transform="translate(0, 45) rotate(180)">
      <circle cx="0" cy="0" r="30" fill="url(#${theme.id}_gold)" stroke="${theme.primaryRed}" stroke-width="2"/>
      <circle cx="0" cy="0" r="12" fill="${theme.primaryRed}"/>
      <circle cx="-20" cy="0" r="5" fill="${theme.primaryRed}"/>
      <circle cx="20" cy="0" r="5" fill="${theme.primaryRed}"/>
    </g>

    <!-- Center Star (180° Invariant) -->
    <polygon points="0,-26 7,-8 26,-8 11,3 16,21 0,10 -16,21 -11,3 -26,-8 -7,-8" fill="url(#${theme.id}_gold)" stroke="#fff" stroke-width="1.5"/>
    <circle cx="0" cy="0" r="4" fill="#fff"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// EXECUTE GENERATION ACROSS ALL REMAINING THEMES
// ---------------------------------------------------------------------------

console.log('🏛️ GENERATING ALL 9 REMAINING PLAYING CARD COLLECTIONS...');

const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
const suitCodes = { hearts: 'H', diamonds: 'D', spades: 'S', clubs: 'C' };
const pipRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10'];

const courtTitles = {
  'K_hearts': 'KING OF HEARTS',
  'K_spades': 'KING OF SPADES',
  'K_diamonds': 'KING OF DIAMONDS',
  'K_clubs': 'KING OF CLUBS',
  'Q_spades': 'QUEEN OF SPADES',
  'Q_hearts': 'QUEEN OF HEARTS',
  'Q_diamonds': 'QUEEN OF DIAMONDS',
  'Q_clubs': 'QUEEN OF CLUBS',
  'J_spades': 'JACK OF SPADES',
  'J_hearts': 'JACK OF HEARTS',
  'J_diamonds': 'JACK OF DIAMONDS',
  'J_clubs': 'JACK OF CLUBS'
};

const courtCardList = [
  { rank: 'K', suit: 'hearts', key: 'K_hearts' },
  { rank: 'K', suit: 'spades', key: 'K_spades' },
  { rank: 'K', suit: 'diamonds', key: 'K_diamonds' },
  { rank: 'K', suit: 'clubs', key: 'K_clubs' },
  { rank: 'Q', suit: 'spades', key: 'Q_spades' },
  { rank: 'Q', suit: 'hearts', key: 'Q_hearts' },
  { rank: 'Q', suit: 'diamonds', key: 'Q_diamonds' },
  { rank: 'Q', suit: 'clubs', key: 'Q_clubs' },
  { rank: 'J', suit: 'spades', key: 'J_spades' },
  { rank: 'J', suit: 'hearts', key: 'J_hearts' },
  { rank: 'J', suit: 'diamonds', key: 'J_diamonds' },
  { rank: 'J', suit: 'clubs', key: 'J_clubs' }
];

let totalEmitted = 0;

for (const theme of THEMES) {
  console.log(`\n▶ Generating Complete 54-Card Deck for: ${theme.name} (${theme.icon})...`);
  const deckFiles = new Map();

  // 1. 12 English Pattern Court Cards
  for (const c of courtCardList) {
    const upperFigure = getEnglishPatternUpper(theme, c.rank, c.suit);
    const title = courtTitles[c.key];
    const courtSvg = buildThemeCourtCard(theme, c.rank, c.suit, title, upperFigure);
    deckFiles.set(`${c.rank}_${c.suit}.svg`, courtSvg);
    deckFiles.set(`${c.rank}${suitCodes[c.suit]}.svg`, courtSvg);
  }

  // 2. Master Ace of Spades + 3 Themed Aces
  const masterAceOfSpades = buildThemeMasterAce(theme);
  deckFiles.set('A_spades.svg', masterAceOfSpades);
  deckFiles.set('AS.svg', masterAceOfSpades);

  const aceHearts = buildThemeAce(theme, 'hearts', 'SACRED HEART');
  deckFiles.set('A_hearts.svg', aceHearts);
  deckFiles.set('AH.svg', aceHearts);

  const aceDiamonds = buildThemeAce(theme, 'diamonds', 'CRYSTAL LOZENGE');
  deckFiles.set('A_diamonds.svg', aceDiamonds);
  deckFiles.set('AD.svg', aceDiamonds);

  const aceClubs = buildThemeAce(theme, 'clubs', 'IMPERIAL CLOVER');
  deckFiles.set('A_clubs.svg', aceClubs);
  deckFiles.set('AC.svg', aceClubs);

  // 3. Pip Cards 2 through 10 (4 suits * 9 ranks = 36 cards)
  for (const suit of suits) {
    for (const rank of pipRanks) {
      const pipSvg = buildThemePipCard(theme, rank, suit);
      deckFiles.set(`${rank}_${suit}.svg`, pipSvg);
      deckFiles.set(`${rank}${suitCodes[suit]}.svg`, pipSvg);
    }
  }

  // 4. Jokers
  const highJoker = buildThemeHighJoker(theme);
  const lowJoker = buildThemeLowJoker(theme);
  deckFiles.set('joker_1.svg', highJoker);
  deckFiles.set('joker_2.svg', lowJoker);
  deckFiles.set('JOKER.svg', highJoker);

  // 5. Card Back
  const cardBack = buildThemeCardBack(theme);
  deckFiles.set('card_back.svg', cardBack);

  // Write to d:/solitaire/decks/${theme.id}/ and D:/getartcraft/artcraft_workspace/decks/${theme.id}/
  const targetDir1 = path.join(ROOT_DIR, 'decks', theme.id);
  const targetDir2 = `D:\\getartcraft\\artcraft_workspace\\decks\\${theme.id}`;
  const modsBacksDir = path.join(ROOT_DIR, 'mods', 'card_backs');
  const modsFacesDir = path.join(ROOT_DIR, 'mods', 'card_faces');

  [targetDir1, targetDir2, modsBacksDir, modsFacesDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  for (const [filename, content] of deckFiles.entries()) {
    fs.writeFileSync(path.join(targetDir1, filename), content, 'utf8');
    fs.writeFileSync(path.join(targetDir2, filename), content, 'utf8');
  }

  // Publish signature assets to mods/
  fs.writeFileSync(path.join(modsBacksDir, `${theme.id}.svg`), cardBack, 'utf8');
  fs.writeFileSync(path.join(modsFacesDir, `${theme.id}_face.svg`), masterAceOfSpades, 'utf8');

  console.log(`  ✓ Emitted ${deckFiles.size} card assets into ${theme.id}`);
  totalEmitted += deckFiles.size;
}

console.log(`\n🎉 MASTER DECK PIPELINE COMPLETE! Total ${totalEmitted} card assets generated across all 9 decks!`);
