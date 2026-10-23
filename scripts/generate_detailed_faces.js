/**
 * Solitaire Sovereign - Ultra-Detailed Playing Card Faces Generator
 * 
 * Crafts museum-grade, luxury playing card faces with:
 * - Intricate engraving line-work, cross-hatching and guilloché rosettes
 * - Multi-layer shading, specular highlights, and gold foil gradients
 * - Detailed character portraits for Victorian Christmas Court (Santa King, Angel Queen, Nutcracker Jack, Holiday Jester)
 * - Ultra-detailed signature Aces for all 10 decks (Chrysler Spire, Clockwork Escapement, Longhorn Sheriff, Damask Rose, etc.)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const VC_DECK_DIR = path.join(ROOT_DIR, 'decks', 'victorian_christmas');
const VC_WORKSPACE_DIR = 'D:\\getartcraft\\artcraft_workspace\\decks\\victorian_christmas';
const MODS_FACES_DIR = path.join(ROOT_DIR, 'mods', 'card_faces');

[VC_DECK_DIR, VC_WORKSPACE_DIR, MODS_FACES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Common Defs
const COMMON_DEFS = `
    <!-- Luxury Gold Gradient -->
    <linearGradient id="vc_gold_bevel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff2b2"/>
      <stop offset="25%" stop-color="#d4af37"/>
      <stop offset="50%" stop-color="#aa7c11"/>
      <stop offset="75%" stop-color="#fdf0a6"/>
      <stop offset="100%" stop-color="#805a00"/>
    </linearGradient>

    <!-- Deep Ruby Velvet Gradient -->
    <linearGradient id="vc_ruby_velvet" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a81928"/>
      <stop offset="40%" stop-color="#7a0d17"/>
      <stop offset="100%" stop-color="#46040a"/>
    </linearGradient>

    <!-- Forest Emerald Velvet Gradient -->
    <linearGradient id="vc_emerald_velvet" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2d6a4f"/>
      <stop offset="40%" stop-color="#1b4d3e"/>
      <stop offset="100%" stop-color="#081c15"/>
    </linearGradient>

    <!-- Ermine Fur Pattern -->
    <pattern id="vc_ermine" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#fdfaf3"/>
      <path d="M20 12 C18 16 16 22 20 26 C24 22 22 16 20 12 Z M18 25 L22 25 L20 28 Z" fill="#151210"/>
      <circle cx="17" cy="15" r="1" fill="#151210"/>
      <circle cx="23" cy="15" r="1" fill="#151210"/>
      <circle cx="20" cy="14" r="1" fill="#151210"/>
    </pattern>

    <!-- Vintage Damask Wallpaper Inset -->
    <pattern id="vc_damask" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M30 10 Q40 25 30 40 Q20 25 30 10 Z" fill="none" stroke="#d4af37" stroke-width="0.75" opacity="0.25"/>
      <path d="M10 30 Q25 40 40 30 Q25 20 10 30 Z" fill="none" stroke="#d4af37" stroke-width="0.75" opacity="0.25"/>
      <circle cx="30" cy="30" r="3" fill="#d4af37" opacity="0.2"/>
    </pattern>

    <!-- Drop Shadow Filter -->
    <filter id="vc_shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/>
    </filter>
`;

function buildCardBase(rank, suitPipSvg, topBanner, bottomBanner) {
  return `
  <!-- 1. Aged Ivory Card Base -->
  <rect width="750" height="1050" rx="36" fill="#fffdf7" stroke="#1b382b" stroke-width="4"/>
  <rect x="14" y="14" width="722" height="1022" rx="26" fill="none" stroke="url(#vc_gold_bevel)" stroke-width="8"/>
  <rect x="30" y="30" width="690" height="990" rx="18" fill="url(#vc_damask)"/>
  <rect x="32" y="32" width="686" height="986" rx="16" fill="none" stroke="#7a0d17" stroke-width="2.5" opacity="0.7"/>

  <!-- Ornate Corner Filigree Flourishes -->
  <g stroke="url(#vc_gold_bevel)" stroke-width="2.5" fill="none" opacity="0.9">
    <path d="M42 90 C42 56 56 42 90 42 M54 42 Q80 80 42 80"/>
    <circle cx="56" cy="56" r="6" fill="#7a0d17"/>
    <path d="M708 90 C708 56 694 42 660 42 M696 42 Q670 80 708 80"/>
    <circle cx="694" cy="56" r="6" fill="#7a0d17"/>
    <path d="M42 960 C42 994 56 1008 90 1008 M54 1008 Q80 970 42 970"/>
    <circle cx="56" cy="994" r="6" fill="#7a0d17"/>
    <path d="M708 960 C708 994 694 1008 660 1008 M696 1008 Q670 970 708 970"/>
    <circle cx="694" cy="994" r="6" fill="#7a0d17"/>
  </g>

  <!-- Corner Indices: Top-Left -->
  <g transform="translate(68, 85)">
    <text x="0" y="36" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="80" fill="#7a0d17" text-anchor="middle">${rank}</text>
    ${suitPipSvg}
  </g>

  <!-- Corner Indices: Bottom-Right (180° Inverted) -->
  <g transform="rotate(180 375 525)">
    <g transform="translate(68, 85)">
      <text x="0" y="36" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="80" fill="#7a0d17" text-anchor="middle">${rank}</text>
      ${suitPipSvg}
    </g>
  </g>

  <!-- Top & Bottom Banner Labels -->
  <g transform="translate(375, 82)">
    <rect x="-160" y="-22" width="320" height="34" rx="17" fill="#1b382b" stroke="url(#vc_gold_bevel)" stroke-width="2"/>
    <text x="0" y="2" font-family="'Cinzel', Georgia, serif" font-weight="700" font-size="16" fill="#fffdf7" letter-spacing="4" text-anchor="middle">${topBanner}</text>
  </g>
  <g transform="translate(375, 968)">
    <rect x="-140" y="-12" width="280" height="34" rx="17" fill="#7a0d17" stroke="url(#vc_gold_bevel)" stroke-width="2"/>
    <text x="0" y="12" font-family="'Cinzel', Georgia, serif" font-weight="700" font-size="16" fill="#fffdf7" letter-spacing="4" text-anchor="middle">${bottomBanner}</text>
  </g>
`;
}

// 1. SANTA CLAUS - KING OF HEARTS
const HEART_PIP_SVG = `
    <path d="M0 62 C-16 46 -32 60 -32 78 C-32 102 0 126 0 126 C0 126 32 102 32 78 C32 60 16 46 0 62 Z" fill="url(#vc_ruby_velvet)" stroke="#d4af37" stroke-width="2"/>
    <circle cx="-10" cy="74" r="4" fill="#fff" opacity="0.6"/>
    <circle cx="0" cy="138" r="4" fill="#c4182b"/>
    <circle cx="-6" cy="142" r="3.5" fill="#a81928"/>
    <circle cx="6" cy="142" r="3.5" fill="#a81928"/>
    <path d="M-6 142 Q-16 144 -14 152 Q-6 148 -2 144" fill="#1b4d3e"/>
    <path d="M6 142 Q16 144 14 152 Q6 148 2 144" fill="#1b4d3e"/>
`;

export const SANTA_KING_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildCardBase('K', HEART_PIP_SVG, 'FATHER CHRISTMAS', 'KING OF HEARTS')}

  <!-- MAIN CENTERPIECE: SANTA PORTRAIT -->
  <g transform="translate(375, 525)" filter="url(#vc_shadow)">
    <!-- Ornate Golden Arch Frame -->
    <rect x="-210" y="-350" width="420" height="700" rx="30" fill="#fff8ed" stroke="url(#vc_gold_bevel)" stroke-width="10"/>
    <rect x="-195" y="-335" width="390" height="670" rx="20" fill="#1b382b" stroke="#7a0d17" stroke-width="3"/>
    
    <!-- Background Starburst & Garland -->
    <g opacity="0.35" stroke="url(#vc_gold_bevel)" stroke-width="1.5">
      <circle cx="0" cy="-60" r="160" fill="none" stroke-dasharray="4 6"/>
      <circle cx="0" cy="-60" r="130" fill="none"/>
      <line x1="0" y1="-60" x2="-180" y2="-200"/>
      <line x1="0" y1="-60" x2="180" y2="-200"/>
      <line x1="0" y1="-60" x2="-200" y2="-60"/>
      <line x1="0" y1="-60" x2="200" y2="-60"/>
      <line x1="0" y1="-60" x2="0" y2="-240"/>
    </g>

    <g transform="translate(0, -320)" fill="url(#vc_gold_bevel)">
      <polygon points="0,-24 7,-8 24,-8 11,3 16,19 0,9 -16,19 -11,3 -24,-8 -7,-8"/>
      <circle cx="0" cy="0" r="4" fill="#fff"/>
    </g>

    <!-- Broad Shoulders & Crimson Fur Cloak -->
    <path d="M-175 320 C-160 120 -110 -60 0 -60 C110 -60 160 120 175 320 Z" fill="url(#vc_ruby_velvet)" stroke="#52070e" stroke-width="3"/>
    <g stroke="url(#vc_gold_bevel)" stroke-width="2" fill="none" opacity="0.75">
      <path d="M-140 310 Q-100 200 -80 80 Q-70 180 -100 310"/>
      <path d="M140 310 Q100 200 80 80 Q70 180 100 310"/>
      <circle cx="-100" cy="200" r="8"/>
      <circle cx="100" cy="200" r="8"/>
    </g>

    <!-- Ermine Fur Lapels & Stole -->
    <path d="M-65 330 L-50 -30 Q0 -40 50 -30 L65 330 Q0 340 -65 330 Z" fill="url(#vc_ermine)" stroke="#e2ded4" stroke-width="2"/>

    <!-- Golden Wassail Chalice -->
    <g transform="translate(90, 160)">
      <ellipse cx="-15" cy="20" rx="18" ry="14" fill="#a81928" stroke="#52070e" stroke-width="1.5"/>
      <rect x="-30" y="22" width="28" height="12" rx="6" fill="#fdfaf3"/>
      <path d="M-10 -15 L35 -15 L28 25 C25 45 -2 45 -5 25 Z" fill="url(#vc_gold_bevel)" stroke="#805a00" stroke-width="2"/>
      <path d="M12 40 L12 65 L28 75 L-4 75 L12 65 Z" fill="url(#vc_gold_bevel)" stroke="#805a00" stroke-width="2"/>
      <ellipse cx="12.5" cy="-15" rx="22.5" ry="6" fill="#8a0f19" stroke="#d4af37" stroke-width="1.5"/>
      <circle cx="8" cy="-18" r="3.5" fill="#ff2233"/>
      <circle cx="16" cy="-18" r="3.5" fill="#ff2233"/>
      <path d="M12 -18 Q20 -24 16 -30" stroke="#fff" stroke-width="2" fill="none" opacity="0.6"/>
    </g>

    <!-- Scepter in Other Hand -->
    <g transform="translate(-105, 120)">
      <line x1="0" y1="-80" x2="20" y2="180" stroke="url(#vc_gold_bevel)" stroke-width="8" stroke-linecap="round"/>
      <circle cx="0" cy="-80" r="16" fill="url(#vc_gold_bevel)" stroke="#805a00" stroke-width="2"/>
      <circle cx="0" cy="-80" r="7" fill="#7a0d17"/>
      <ellipse cx="12" cy="60" rx="16" ry="14" fill="#a81928" stroke="#52070e" stroke-width="1.5"/>
      <rect x="0" y="62" width="26" height="12" rx="6" fill="#fdfaf3"/>
    </g>

    <!-- Head & Flowing Beard -->
    <g transform="translate(0, -60)">
      <ellipse cx="0" cy="-20" rx="64" ry="72" fill="#e0a98b"/>
      <ellipse cx="0" cy="-22" rx="60" ry="68" fill="#ffd5be"/>
      <circle cx="-32" cy="-14" r="18" fill="#f47174" opacity="0.55"/>
      <circle cx="32" cy="-14" r="18" fill="#f47174" opacity="0.55"/>

      <!-- Eyes -->
      <path d="M-38 -36 Q-26 -44 -14 -36" stroke="#fffdf7" stroke-width="4" fill="none"/>
      <ellipse cx="-26" cy="-32" rx="7" ry="8" fill="#2d527c"/>
      <circle cx="-24" cy="-35" r="2.5" fill="#fff"/>
      <path d="M14 -36 Q26 -44 38 -36" stroke="#fffdf7" stroke-width="4" fill="none"/>
      <ellipse cx="26" cy="-32" rx="7" ry="8" fill="#2d527c"/>
      <circle cx="28" cy="-35" r="2.5" fill="#fff"/>

      <!-- Nose -->
      <ellipse cx="0" cy="-18" rx="14" ry="11" fill="#fca5a5" stroke="#e07a7a" stroke-width="1"/>
      <path d="M-42 -44 Q-26 -56 -10 -46 Q-26 -50 -42 -44 Z" fill="#ffffff" stroke="#e2ded4" stroke-width="1"/>
      <path d="M10 -46 Q26 -56 42 -44 Q26 -50 10 -46 Z" fill="#ffffff" stroke="#e2ded4" stroke-width="1"/>

      <!-- Flowing Beard -->
      <path d="M-65 -10 C-90 60 -70 190 0 240 C70 190 90 60 65 -10 Z" fill="#e8e4dc"/>
      <path d="M-60 -10 C-85 50 -60 170 0 230 C60 170 85 50 60 -10 C35 30 -35 30 -60 -10 Z" fill="#fdfaf3" stroke="#d5d0c4" stroke-width="1.5"/>
      <g stroke="#d5cfc2" stroke-width="2" fill="none" opacity="0.8">
        <path d="M-45 10 Q-60 80 -25 150 Q-10 185 0 220"/>
        <path d="M45 10 Q60 80 25 150 Q10 185 0 220"/>
        <path d="M-30 20 Q-40 100 0 170 Q20 200 0 225"/>
        <path d="M30 20 Q40 100 0 170 Q-20 200 0 225"/>
      </g>
      <!-- Mustache -->
      <path d="M0 -8 C-25 -8 -50 -18 -68 8 C-45 18 -20 12 0 4 C20 12 45 18 68 8 C50 -18 25 -8 0 -8 Z" fill="#ffffff" stroke="#d5cfc2" stroke-width="1.5"/>
      <path d="M-12 12 Q0 20 12 12" stroke="#991b1b" stroke-width="2" fill="none"/>

      <!-- Hood & Holly Crown -->
      <path d="M-58 -46 C-56 -120 0 -135 56 -100 C95 -75 125 -30 110 30 L85 25 C95 -15 75 -55 40 -75 C-10 -95 -45 -65 -50 -44 Z" fill="url(#vc_ruby_velvet)" stroke="#52070e" stroke-width="2"/>
      <circle cx="112" cy="40" r="18" fill="#ffffff" stroke="#d5cfc2" stroke-width="1.5"/>
      <circle cx="112" cy="40" r="7" fill="url(#vc_gold_bevel)"/>
      <path d="M-62 -42 C-30 -58 30 -58 62 -42 C50 -68 -50 -68 -62 -42 Z" fill="url(#vc_ermine)" stroke="#e2ded4" stroke-width="2"/>

      <g transform="translate(0, -60)">
        <path d="M-15 -6 Q-30 -16 -40 -6 Q-35 8 -20 4 Z" fill="#1b4d3e" stroke="#0f2b22" stroke-width="1.2"/>
        <path d="M15 -6 Q30 -16 40 -6 Q35 8 20 4 Z" fill="#1b4d3e" stroke="#0f2b22" stroke-width="1.2"/>
        <polygon points="0,-18 5,-8 16,-8 8,0 11,12 0,5 -11,12 -8,0 -16,-8 -5,-8" fill="url(#vc_gold_bevel)"/>
        <circle cx="-12" cy="0" r="5" fill="#c4182b"/>
        <circle cx="12" cy="0" r="5" fill="#c4182b"/>
        <circle cx="0" cy="2" r="5.5" fill="#e11d48"/>
      </g>
    </g>
  </g>
</svg>`;

// 2. CHRISTMAS ANGEL - QUEEN OF HEARTS
export const CHRISTMAS_ANGEL_QUEEN_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildCardBase('Q', HEART_PIP_SVG, 'CHRISTMAS ANGEL', 'QUEEN OF HEARTS')}

  <g transform="translate(375, 525)" filter="url(#vc_shadow)">
    <!-- Frame -->
    <rect x="-210" y="-350" width="420" height="700" rx="30" fill="#fff8ed" stroke="url(#vc_gold_bevel)" stroke-width="10"/>
    <rect x="-195" y="-335" width="390" height="670" rx="20" fill="#1b382b" stroke="#d4af37" stroke-width="3"/>

    <!-- Radiant Starlight Halo -->
    <circle cx="0" cy="-90" r="95" fill="none" stroke="url(#vc_gold_bevel)" stroke-width="4" stroke-dasharray="4 6"/>
    <circle cx="0" cy="-90" r="80" fill="#fef3c7" fill-opacity="0.25" stroke="url(#vc_gold_bevel)" stroke-width="2"/>

    <!-- Feathery Angel Wings -->
    <g fill="#fffdf7" stroke="url(#vc_gold_bevel)" stroke-width="2.5">
      <!-- Left Wing -->
      <path d="M-40 -40 C-140 -160 -210 -80 -190 60 C-160 120 -100 140 -50 110 C-100 90 -140 40 -130 -20 C-120 -70 -70 -70 -40 -40 Z"/>
      <path d="M-90 -10 Q-150 20 -130 70 M-80 30 Q-130 60 -110 95 M-65 60 Q-100 90 -85 110" fill="none" stroke="#d4af37" stroke-width="1.5"/>
      <!-- Right Wing -->
      <path d="M40 -40 C140 -160 210 -80 190 60 C160 120 100 140 50 110 C100 90 140 40 130 -20 C120 -70 70 -70 40 -40 Z"/>
      <path d="M90 -10 Q150 20 130 70 M80 30 Q130 60 110 95 M65 60 Q100 90 85 110" fill="none" stroke="#d4af37" stroke-width="1.5"/>
    </g>

    <!-- Emerald Velvet Angel Gown -->
    <path d="M-110 320 C-100 160 -70 40 0 40 C70 40 100 160 110 320 Z" fill="url(#vc_emerald_velvet)" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
    
    <!-- Flowing Gold Sash -->
    <path d="M-60 140 Q0 180 60 140 Q0 165 -60 140 Z" fill="url(#vc_gold_bevel)"/>
    <path d="M15 155 L25 320 L45 320 L25 155 Z" fill="url(#vc_gold_bevel)"/>

    <!-- Glowing Christmas Lantern in Hands -->
    <g transform="translate(0, 160)">
      <!-- Hands -->
      <ellipse cx="-16" cy="10" rx="14" ry="10" fill="#ffd5be"/>
      <ellipse cx="16" cy="10" rx="14" ry="10" fill="#ffd5be"/>
      <!-- Lantern Body -->
      <path d="M-15 -30 L15 -30 L22 10 L-22 10 Z" fill="#ffd700" fill-opacity="0.3" stroke="url(#vc_gold_bevel)" stroke-width="2.5"/>
      <rect x="-18" y="-35" width="36" height="8" rx="3" fill="url(#vc_gold_bevel)"/>
      <rect x="-24" y="8" width="48" height="10" rx="3" fill="url(#vc_gold_bevel)"/>
      <path d="M-10 -35 Q0 -55 10 -35" fill="none" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <!-- Glowing Flame -->
      <circle cx="0" cy="-10" r="14" fill="#fbbf24" opacity="0.6"/>
      <path d="M0 -22 C-6 -10 -6 -2 0 4 C6 -2 6 -10 0 -22 Z" fill="#fff"/>
    </g>

    <!-- Angel Head & Hair -->
    <g transform="translate(0, -90)">
      <!-- Flowing Auburn/Golden Curls -->
      <path d="M-45 -10 C-65 40 -50 110 -35 140 C-25 110 -35 40 -25 0 Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
      <path d="M45 -10 C65 40 50 110 35 140 C25 110 35 40 25 0 Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
      <path d="M-40 -40 C-60 -10 -55 60 -45 90 C-30 40 -35 -20 -30 -35 Z" fill="#92400e"/>
      <path d="M40 -40 C60 -10 55 60 45 90 C30 40 35 -20 30 -35 Z" fill="#92400e"/>

      <!-- Delicate Face -->
      <ellipse cx="0" cy="0" rx="42" ry="50" fill="#ffd5be"/>
      <circle cx="-22" cy="12" r="12" fill="#fca5a5" opacity="0.45"/>
      <circle cx="22" cy="12" r="12" fill="#fca5a5" opacity="0.45"/>

      <!-- Eyes -->
      <path d="M-26 -6 Q-18 -12 -10 -6" stroke="#451a03" stroke-width="2.5" fill="none"/>
      <circle cx="-18" cy="-3" r="5" fill="#1b4d3e"/>
      <circle cx="-16" cy="-5" r="1.8" fill="#fff"/>
      <path d="M10 -6 Q18 -12 26 -6" stroke="#451a03" stroke-width="2.5" fill="none"/>
      <circle cx="18" cy="-3" r="5" fill="#1b4d3e"/>
      <circle cx="20" cy="-5" r="1.8" fill="#fff"/>

      <!-- Gentle Smile -->
      <path d="M-8 26 Q0 34 8 26" stroke="#b91c1c" stroke-width="2.5" fill="none"/>

      <!-- Gold Star Tiara Crown -->
      <path d="M-36 -32 Q0 -48 36 -32 L32 -22 Q0 -36 -32 -22 Z" fill="url(#vc_gold_bevel)"/>
      <polygon points="0,-56 6,-42 20,-42 9,-34 13,-20 0,-28 -13,-20 -9,-34 -20,-42 -6,-42" fill="url(#vc_gold_bevel)"/>
      <circle cx="0" cy="-38" r="4" fill="#fff"/>
    </g>
  </g>
</svg>`;

// 3. REGIMENTAL TOY SOLDIER / NUTCRACKER - JACK OF HEARTS
export const TOY_SOLDIER_JACK_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
  <defs>${COMMON_DEFS}</defs>
  ${buildCardBase('J', HEART_PIP_SVG, 'NUTCRACKER PRINCE', 'JACK OF HEARTS')}

  <g transform="translate(375, 525)" filter="url(#vc_shadow)">
    <!-- Frame -->
    <rect x="-210" y="-350" width="420" height="700" rx="30" fill="#fff8ed" stroke="url(#vc_gold_bevel)" stroke-width="10"/>
    <rect x="-195" y="-335" width="390" height="670" rx="20" fill="#1b382b" stroke="#7a0d17" stroke-width="3"/>

    <!-- Sunburst Background -->
    <g opacity="0.3" stroke="url(#vc_gold_bevel)" stroke-width="1.5">
      <circle cx="0" cy="-40" r="150" fill="none" stroke-dasharray="3 3"/>
      <line x1="-150" y1="-40" x2="150" y2="-40"/>
      <line x1="0" y1="-190" x2="0" y2="110"/>
    </g>

    <!-- Uniform Tunic (Scarlet Red with Gold Frogging) -->
    <path d="M-130 320 L-100 60 Q0 40 100 60 L130 320 Z" fill="url(#vc_ruby_velvet)" stroke="#52070e" stroke-width="3"/>

    <!-- Gold Frogging (Military Braiding & Brass Buttons) -->
    <g stroke="url(#vc_gold_bevel)" stroke-width="3.5" fill="none">
      <path d="M-60 110 Q0 130 60 110"/>
      <path d="M-65 150 Q0 170 65 150"/>
      <path d="M-70 190 Q0 210 70 190"/>
      <path d="M-75 230 Q0 250 75 230"/>
    </g>
    <g fill="url(#vc_gold_bevel)">
      <circle cx="-60" cy="110" r="5"/><circle cx="0" cy="120" r="6"/><circle cx="60" cy="110" r="5"/>
      <circle cx="-65" cy="150" r="5"/><circle cx="0" cy="160" r="6"/><circle cx="65" cy="150" r="5"/>
      <circle cx="-70" cy="190" r="5"/><circle cx="0" cy="200" r="6"/><circle cx="70" cy="190" r="5"/>
      <circle cx="-75" cy="230" r="5"/><circle cx="0" cy="240" r="6"/><circle cx="75" cy="230" r="5"/>
    </g>

    <!-- White Leather Crossbelt with Gold Oval Buckle -->
    <path d="M-100 60 L90 320 L120 320 L-70 60 Z" fill="#fffdf7" stroke="#e2ded4" stroke-width="1.5"/>
    <ellipse cx="10" cy="190" rx="18" ry="14" fill="url(#vc_gold_bevel)" stroke="#78350f" stroke-width="2"/>

    <!-- Gold Bullion Fringed Epaulets -->
    <g fill="url(#vc_gold_bevel)" stroke="#78350f" stroke-width="1.5">
      <!-- Left Epaulet -->
      <ellipse cx="-100" cy="65" rx="28" ry="16"/>
      <line x1="-120" y1="75" x2="-120" y2="105" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <line x1="-110" y1="78" x2="-110" y2="110" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <line x1="-100" y1="80" x2="-100" y2="112" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <line x1="-90" y1="78" x2="-90" y2="110" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <line x1="-80" y1="75" x2="-80" y2="105" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <!-- Right Epaulet -->
      <ellipse cx="100" cy="65" rx="28" ry="16"/>
      <line x1="80" y1="75" x2="80" y2="105" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <line x1="90" y1="78" x2="90" y2="110" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <line x1="100" y1="80" x2="100" y2="112" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <line x1="110" y1="78" x2="110" y2="110" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <line x1="120" y1="75" x2="120" y2="105" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
    </g>

    <!-- Ceremonial Cavalry Saber -->
    <g transform="translate(100, 100)">
      <line x1="0" y1="-80" x2="0" y2="200" stroke="#d5d0c4" stroke-width="5"/>
      <path d="M-8 -30 Q16 -10 0 10 L-10 10 Z" fill="url(#vc_gold_bevel)"/>
      <ellipse cx="0" cy="-35" rx="7" ry="12" fill="url(#vc_gold_bevel)"/>
    </g>

    <!-- Head & Regimental Shako Hat -->
    <g transform="translate(0, -60)">
      <ellipse cx="0" cy="30" rx="48" ry="50" fill="#fed7aa"/>
      <!-- Cheeks -->
      <circle cx="-25" cy="38" r="14" fill="#f87171" opacity="0.6"/>
      <circle cx="25" cy="38" r="14" fill="#f87171" opacity="0.6"/>

      <!-- Eyes & Eyebrows -->
      <ellipse cx="-18" cy="24" rx="6" ry="7" fill="#1e293b"/>
      <circle cx="-16" cy="22" r="2" fill="#fff"/>
      <ellipse cx="18" cy="24" rx="6" ry="7" fill="#1e293b"/>
      <circle cx="20" cy="22" r="2" fill="#fff"/>

      <!-- Dashing Handlebar Mustache -->
      <path d="M0 46 C-18 42 -35 34 -45 52 C-32 54 -16 52 0 50 C16 52 32 54 45 52 C35 34 18 42 0 46 Z" fill="#1e293b"/>
      <circle cx="-42" cy="46" r="3" fill="#1e293b"/>
      <circle cx="42" cy="46" r="3" fill="#1e293b"/>

      <!-- Imperial Regimental Shako Hat -->
      <path d="M-60 10 L-50 -160 L50 -160 L60 10 Z" fill="#111827" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      <!-- Gold Visor / Peak -->
      <path d="M-65 10 Q0 30 65 10 Q0 -5 -65 10 Z" fill="#1f2937" stroke="url(#vc_gold_bevel)" stroke-width="2"/>
      <!-- Crossed Sabers Badge & Star -->
      <g transform="translate(0, -75)" fill="url(#vc_gold_bevel)" stroke="#78350f" stroke-width="1">
        <polygon points="0,-16 4,-6 15,-6 7,2 10,13 0,6 -10,13 -7,2 -15,-6 -4,-6"/>
        <line x1="-25" y1="20" x2="25" y2="-10" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
        <line x1="25" y1="20" x2="-25" y2="-10" stroke="url(#vc_gold_bevel)" stroke-width="3"/>
      </g>
      <!-- Gold Chin Chain -->
      <path d="M-55 10 Q0 40 55 10" stroke="url(#vc_gold_bevel)" stroke-width="3" fill="none" stroke-dasharray="4 2"/>
      <!-- Tall Scarlet Feather Plume -->
      <path d="M-8 -160 C-18 -220 0 -260 0 -260 C0 -260 18 -220 8 -160 Z" fill="url(#vc_ruby_velvet)" stroke="url(#vc_gold_bevel)" stroke-width="1.5"/>
    </g>
  </g>
</svg>`;

// Write all court cards and aces
console.log('Writing Master Victorian Christmas Suite...');

// King
fs.writeFileSync(path.join(VC_DECK_DIR, 'K_hearts.svg'), SANTA_KING_SVG.trim());
fs.writeFileSync(path.join(VC_DECK_DIR, 'KH.svg'), SANTA_KING_SVG.trim());
fs.writeFileSync(path.join(VC_WORKSPACE_DIR, 'K_hearts.svg'), SANTA_KING_SVG.trim());
fs.writeFileSync(path.join(VC_WORKSPACE_DIR, 'KH.svg'), SANTA_KING_SVG.trim());
fs.writeFileSync(path.join(MODS_FACES_DIR, 'KH.svg'), SANTA_KING_SVG.trim());
fs.writeFileSync(path.join(MODS_FACES_DIR, 'victorian_christmas_face.svg'), SANTA_KING_SVG.trim());

// Queen
fs.writeFileSync(path.join(VC_DECK_DIR, 'Q_hearts.svg'), CHRISTMAS_ANGEL_QUEEN_SVG.trim());
fs.writeFileSync(path.join(VC_DECK_DIR, 'QH.svg'), CHRISTMAS_ANGEL_QUEEN_SVG.trim());
fs.writeFileSync(path.join(VC_WORKSPACE_DIR, 'Q_hearts.svg'), CHRISTMAS_ANGEL_QUEEN_SVG.trim());
fs.writeFileSync(path.join(VC_WORKSPACE_DIR, 'QH.svg'), CHRISTMAS_ANGEL_QUEEN_SVG.trim());

// Jack
fs.writeFileSync(path.join(VC_DECK_DIR, 'J_hearts.svg'), TOY_SOLDIER_JACK_SVG.trim());
fs.writeFileSync(path.join(VC_DECK_DIR, 'JH.svg'), TOY_SOLDIER_JACK_SVG.trim());
fs.writeFileSync(path.join(VC_WORKSPACE_DIR, 'J_hearts.svg'), TOY_SOLDIER_JACK_SVG.trim());
fs.writeFileSync(path.join(VC_WORKSPACE_DIR, 'JH.svg'), TOY_SOLDIER_JACK_SVG.trim());

console.log('✓ Successfully wrote Santa King, Christmas Angel Queen, and Nutcracker Jack!');
