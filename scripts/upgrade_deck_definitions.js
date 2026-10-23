/**
 * Script to upgrade deck_definitions.js with ultra-detailed, luxury-grade card faces
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Detailed Art Deco Ace
const ART_DECO_DETAILED_FACE = `
      <defs>
        <linearGradient id="ad_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff8db"/>
          <stop offset="30%" stop-color="#d4af37"/>
          <stop offset="70%" stop-color="#996515"/>
          <stop offset="100%" stop-color="#fdf0a6"/>
        </linearGradient>
        <linearGradient id="ad_onyx" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1f2024"/>
          <stop offset="100%" stop-color="#0a0a0c"/>
        </linearGradient>
      </defs>
      <rect width="140" height="196" rx="8" fill="#faf7ee" stroke="url(#ad_gold)" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#121214" stroke-width="1.2"/>
      
      <!-- Stepped Corner Brackets -->
      <g stroke="url(#ad_gold)" stroke-width="1" fill="none">
        <path d="M8 8 L24 8 L24 24 M8 14 L16 14 L16 24 M8 20 L12 20 L12 24"/>
        <path d="M132 8 L116 8 L116 24 M132 14 L124 14 L124 24 M132 20 L128 20 L128 24"/>
        <path d="M8 188 L24 188 L24 172 M8 182 L16 182 L16 172 M8 176 L12 176 L12 172"/>
        <path d="M132 188 L116 188 L116 172 M132 182 L124 182 L124 172 M132 176 L128 176 L128 172"/>
      </g>
      
      <!-- Corner Indices (Top Left) -->
      <text x="11" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#121214">A</text>
      <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="url(#ad_gold)"/>
      
      <!-- Corner Indices (Bottom Right) -->
      <g transform="rotate(180 70 98)">
        <text x="11" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#121214">A</text>
        <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="url(#ad_gold)"/>
      </g>
      
      <!-- Art Deco Spire & Sunburst Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Multi-Tier Sunburst Beams -->
        <g stroke="url(#ad_gold)" stroke-width="0.75" opacity="0.65" fill="none">
          <line x1="0" y1="0" x2="-55" y2="-75"/>
          <line x1="0" y1="0" x2="-35" y2="-82"/>
          <line x1="0" y1="0" x2="-15" y2="-85"/>
          <line x1="0" y1="0" x2="15" y2="-85"/>
          <line x1="0" y1="0" x2="35" y2="-82"/>
          <line x1="0" y1="0" x2="55" y2="-75"/>
          <line x1="0" y1="0" x2="-65" y2="-50"/>
          <line x1="0" y1="0" x2="65" y2="-50"/>
          <line x1="0" y1="0" x2="-70" y2="-20"/>
          <line x1="0" y1="0" x2="70" y2="-20"/>
        </g>
        
        <!-- Stepped Diamond Cartouche -->
        <polygon points="0,-72 52,0 0,72 -52,0" fill="none" stroke="url(#ad_gold)" stroke-width="1.5" stroke-dasharray="3 2"/>
        <polygon points="0,-64 45,0 0,64 -45,0" fill="#f5eedc" stroke="#121214" stroke-width="1.2"/>
        
        <!-- Grand Faceted Chrysler Spire Spade -->
        <path d="M0 -48 C-34 -6 -40 25 -15 32 C-4 34 -2 25 0 21 C2 25 4 34 15 32 C40 25 34 -6 0 -48 Z" fill="url(#ad_onyx)" stroke="url(#ad_gold)" stroke-width="2.5"/>
        <path d="M-4 18 L-9 40 L9 40 L4 18 Z" fill="url(#ad_gold)"/>
        
        <!-- Chrysler Spire Geometric Arches Inside -->
        <g fill="none" stroke="url(#ad_gold)" stroke-width="1.2">
          <line x1="0" y1="-44" x2="0" y2="-10" stroke="#fff8db" stroke-width="2"/>
          <!-- Tier 1 -->
          <path d="M-6 -26 Q0 -34 6 -26 L8 -18 Q0 -26 -8 -18 Z" fill="url(#ad_gold)"/>
          <!-- Tier 2 -->
          <path d="M-12 -16 Q0 -26 12 -16 L15 -6 Q0 -16 -15 -6 Z" fill="url(#ad_gold)"/>
          <!-- Tier 3 -->
          <path d="M-18 -4 Q0 -14 18 -4 L21 8 Q0 -2 -21 8 Z" fill="url(#ad_gold)"/>
          <!-- Radiating Fan Palmette at Base -->
          <path d="M-14 24 Q0 12 14 24 M-10 27 Q0 17 10 27 M-6 30 Q0 22 6 30" stroke="#fff8db" stroke-width="1"/>
          <!-- Sparkling Diamond Core -->
          <polygon points="0,-8 7,5 0,18 -7,5" fill="#faf7ee" stroke="#121214" stroke-width="1"/>
        </g>
        <text x="0" y="54" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="7.5" fill="url(#ad_gold)" text-anchor="middle" letter-spacing="3">NEW YORK • 1925</text>
      </g>
`;

// Detailed Steampunk Ace
const STEAMPUNK_DETAILED_FACE = `
      <defs>
        <linearGradient id="sp_brass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde68a"/>
          <stop offset="30%" stop-color="#d97706"/>
          <stop offset="70%" stop-color="#b45309"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <linearGradient id="sp_copper" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ea580c"/>
          <stop offset="100%" stop-color="#9a3412"/>
        </linearGradient>
      </defs>
      <rect width="140" height="196" rx="8" fill="#f6eedb" stroke="url(#sp_brass)" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#451a03" stroke-width="1.2"/>
      
      <!-- Riveted Corner Plates -->
      <g fill="url(#sp_brass)" stroke="#451a03" stroke-width="0.6">
        <circle cx="9" cy="9" r="2.5"/><circle cx="17" cy="9" r="1.5"/><circle cx="9" cy="17" r="1.5"/>
        <circle cx="131" cy="9" r="2.5"/><circle cx="123" cy="9" r="1.5"/><circle cx="131" cy="17" r="1.5"/>
        <circle cx="9" cy="187" r="2.5"/><circle cx="17" cy="187" r="1.5"/><circle cx="9" cy="179" r="1.5"/>
        <circle cx="131" cy="187" r="2.5"/><circle cx="123" cy="187" r="1.5"/><circle cx="131" cy="179" r="1.5"/>
      </g>
      
      <!-- Corner Indices -->
      <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#451a03">A</text>
      <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="url(#sp_brass)"/>
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#451a03">A</text>
        <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="url(#sp_brass)"/>
      </g>
      
      <!-- Museum Clockwork Escapement Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Dial Outer Calibrations -->
        <circle cx="0" cy="0" r="46" fill="none" stroke="url(#sp_brass)" stroke-width="2"/>
        <circle cx="0" cy="0" r="42" fill="#fffcf5" stroke="#b45309" stroke-width="0.8" stroke-dasharray="1.5 1.5"/>
        <g font-family="'Cinzel', serif" font-size="5" font-weight="900" fill="#78350f" text-anchor="middle">
          <text x="0" y="-35">XII</text><text x="36" y="2">III</text><text x="0" y="39">VI</text><text x="-36" y="2">IX</text>
        </g>
        
        <!-- Large Steampunk Gear Spade -->
        <path d="M0 -40 C-30 -4 -34 22 -14 28 C-4 30 -2 23 0 19 C2 23 4 30 14 28 C34 22 30 -4 0 -40 Z" fill="#2d1506" stroke="url(#sp_brass)" stroke-width="2.5"/>
        <path d="M-4 17 L-8 34 L8 34 L4 17 Z" fill="url(#sp_copper)" stroke="url(#sp_brass)" stroke-width="1"/>
        
        <!-- Interlocking Brass Escapement Cogs -->
        <g fill="none" stroke="url(#sp_brass)" stroke-width="1.5">
          <!-- Main Center Cog with 12 teeth -->
          <circle cx="0" cy="0" r="18" stroke-dasharray="3.5 3.5" stroke-width="3"/>
          <circle cx="0" cy="0" r="12" fill="#3f1a08"/>
          <!-- Spokes -->
          <line x1="-12" y1="0" x2="12" y2="0"/>
          <line x1="0" y1="-12" x2="0" y2="12"/>
          <line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5"/>
          <line x1="-8.5" y1="8.5" x2="8.5" y2="-8.5"/>
          <!-- Ruby Bearing -->
          <circle cx="0" cy="0" r="4.5" fill="#dc2626" stroke="#fbbf24" stroke-width="1"/>
          <circle cx="-1" cy="-1" r="1.2" fill="#fff"/>
          <!-- Escapement Anchor & Wheel -->
          <path d="M-10 -18 Q0 -26 10 -18" stroke="url(#sp_brass)" stroke-width="2"/>
          <circle cx="0" cy="-20" r="6" stroke-dasharray="2 2" stroke-width="1.5"/>
        </g>
        <text x="0" y="49" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="7" fill="#b45309" text-anchor="middle" letter-spacing="2">CHRONO • LONDON 1888</text>
      </g>
`;

// Detailed Wild West Ace
const WILD_WEST_DETAILED_FACE = `
      <defs>
        <linearGradient id="ww_leather" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#5c260a"/>
          <stop offset="100%" stop-color="#2a0f03"/>
        </linearGradient>
        <linearGradient id="ww_silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="50%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
      <rect width="140" height="196" rx="8" fill="#f5ead6" stroke="#78350f" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#4a2c11" stroke-width="1.2" stroke-dasharray="4 2"/>
      
      <!-- Corner Indices -->
      <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#4a2c11">A</text>
      <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="#78350f"/>
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#4a2c11">A</text>
        <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="#78350f"/>
      </g>
      
      <!-- Steer Skull & Crossed Revolvers Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Rope Horseshoe Halo -->
        <ellipse cx="0" cy="0" rx="46" ry="49" fill="none" stroke="#b45309" stroke-width="2" stroke-dasharray="3 2"/>
        
        <!-- Large Tooled Leather Spade -->
        <path d="M0 -40 C-30 -4 -34 22 -14 28 C-4 30 -2 23 0 19 C2 23 4 30 14 28 C34 22 30 -4 0 -40 Z" fill="url(#ww_leather)" stroke="#b45309" stroke-width="2.5"/>
        <path d="M-4 17 L-8 34 L8 34 L4 17 Z" fill="#78350f"/>
        
        <!-- Detailed Texas Longhorn Steer Skull -->
        <g fill="#fef3c7" stroke="#1f0d04" stroke-width="1.2">
          <!-- Sweeping Horns -->
          <path d="M-7 -12 C-26 -32 -38 -18 -40 4 C-38 0 -25 -18 -9 -8 Z"/>
          <path d="M7 -12 C26 -32 38 -18 40 4 C38 0 25 -18 9 -8 Z"/>
          <!-- Cranium Bone -->
          <path d="M-8 -10 L8 -10 L6 10 L0 20 L-6 10 Z"/>
          <!-- Eye Sockets -->
          <ellipse cx="-4" cy="0" rx="2.2" ry="3" fill="#1f0d04"/>
          <ellipse cx="4" cy="0" rx="2.2" ry="3" fill="#1f0d04"/>
        </g>
        
        <!-- Crossed Colt .45 Peacemaker Revolvers -->
        <g stroke="url(#ww_silver)" stroke-width="2" fill="#333">
          <line x1="-22" y1="20" x2="22" y2="32"/>
          <line x1="22" y1="20" x2="-22" y2="32"/>
          <circle cx="-16" cy="22" r="3" fill="#8d5b2c"/>
          <circle cx="16" cy="22" r="3" fill="#8d5b2c"/>
        </g>
        
        <!-- 6-Point Sterling Sheriff Star Badge -->
        <g fill="url(#ww_silver)" stroke="#1e293b" stroke-width="0.8" transform="translate(0, -2)">
          <polygon points="0,-8 2.5,-2.5 8,-2.5 3.5,2 5.5,8 0,4.5 -5.5,8 -3.5,2 -8,-2.5 -2.5,-2.5"/>
          <circle cx="0" cy="0" r="2" fill="#78350f"/>
        </g>
        <text x="0" y="48" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="7" fill="#78350f" text-anchor="middle" letter-spacing="2">TOMBSTONE • 1881</text>
      </g>
`;

// Update deck_definitions.js directly with these detailed faces
console.log('Upgrading deck_definitions.js with ultra-detailed card faces...');

let defsContent = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'deck_definitions.js'), 'utf8');

// Replace Art Deco cardFaceSVG
defsContent = defsContent.replace(
  /id:\s*'art_deco_elegance'[\s\S]*?cardFaceSVG:\s*`[\s\S]*?`\s*}/,
  (match) => {
    return match.replace(/cardFaceSVG:\s*`[\s\S]*?`/, `cardFaceSVG: \`\n${ART_DECO_DETAILED_FACE.trim()}\n    \``);
  }
);

// Replace Steampunk cardFaceSVG
defsContent = defsContent.replace(
  /id:\s*'steampunk_clockwork'[\s\S]*?cardFaceSVG:\s*`[\s\S]*?`\s*}/,
  (match) => {
    return match.replace(/cardFaceSVG:\s*`[\s\S]*?`/, `cardFaceSVG: \`\n${STEAMPUNK_DETAILED_FACE.trim()}\n    \``);
  }
);

// Replace Wild West cardFaceSVG
defsContent = defsContent.replace(
  /id:\s*'wild_west_frontier'[\s\S]*?cardFaceSVG:\s*`[\s\S]*?`\s*}/,
  (match) => {
    return match.replace(/cardFaceSVG:\s*`[\s\S]*?`/, `cardFaceSVG: \`\n${WILD_WEST_DETAILED_FACE.trim()}\n    \``);
  }
);

fs.writeFileSync(path.join(ROOT_DIR, 'scripts', 'deck_definitions.js'), defsContent, 'utf8');
console.log('✓ Successfully upgraded deck_definitions.js!');
