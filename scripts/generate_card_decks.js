#!/usr/bin/env node
/**
 * Detailed Playing Card SVG Generator
 * Richly detailed Victorian Christmas playing cards - Complete 54-card deck
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = 'D:/getartcraft/artcraft_workspace/decks';
const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Victorian Christmas theme colors
const colors = {
  primary: '#8B0000',      // Crimson
  secondary: '#004D00',    // Forest Green
  accent: '#FFD700',       // Gold
  background: '#F5F5DC',   // Aged Ivory
  darkBrown: '#3E2723',    // Dark brown
  holly: '#DC143C',        // Holly berry red
  snow: '#E8F4F8'          // Icy snow
};

console.log('\n🎄 Victorian Christmas Playing Card Generator\n');
console.log('Creating highly detailed, artistic card designs...\n');
console.log('Generating complete 54-card deck:\n');

/**
 * Common SVG defs for all cards
 */
function getCommonDefs() {
  return `
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
      </linearGradient>

      <linearGradient id="berryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#DC143C;stop-opacity:1" />
      </linearGradient>

      <pattern id="damask" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M20,5 Q25,15 20,25 Q15,15 20,5 M10,20 Q15,25 20,30 Q25,25 30,20 Q25,15 20,10 Q15,15 10,20"
              fill="none" stroke="#DDD" stroke-width="0.5" opacity="0.3"/>
      </pattern>

      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  `;
}

/**
 * Generate ornate border frame
 */
function generateOrnateFrame(width, height) {
  const thickness = 20;
  return `
    <!-- Outer gold border -->
    <rect x="${thickness/2}" y="${thickness/2}"
          width="${width - thickness}" height="${height - thickness}"
          fill="none" stroke="url(#goldGradient)" stroke-width="${thickness}"
          rx="20"/>

    <!-- Inner decorative line -->
    <rect x="${thickness + 5}" y="${thickness + 5}"
          width="${width - 2*thickness - 10}" height="${height - 2*thickness - 10}"
          fill="none" stroke="${colors.darkBrown}" stroke-width="2" opacity="0.5"
          rx="15"/>

    <!-- Corner ornaments -->
    <circle cx="30" cy="30" r="12" fill="url(#goldGradient)"/>
    <circle cx="30" cy="30" r="6" fill="${colors.holly}"/>

    <circle cx="${width - 30}" cy="30" r="12" fill="url(#goldGradient)"/>
    <circle cx="${width - 30}" cy="30" r="6" fill="${colors.holly}"/>

    <circle cx="30" cy="${height - 30}" r="12" fill="url(#goldGradient)"/>
    <circle cx="30" cy="${height - 30}" r="6" fill="${colors.holly}"/>

    <circle cx="${width - 30}" cy="${height - 30}" r="12" fill="url(#goldGradient)"/>
    <circle cx="${width - 30}" cy="${height - 30}" r="6" fill="${colors.holly}"/>
  `;
}

/**
 * Generate holly berry cluster (Hearts suit ♥)
 */
function generateHollyHeart(x, y, size = 80) {
  return `
    <g transform="translate(${x},${y})">
      <!-- Holly leaves -->
      ${[-1, 0, 1].map((offset) => `
        <path d="M${offset * size*0.3},${-size*0.2}
                 Q${size*0.4 + offset*size*0.3},${-size*0.3} ${size*0.5 + offset*size*0.3},${-size*0.1}
                 L${size*0.6 + offset*size*0.3},${size*0.1}
                 Q${size*0.7 + offset*size*0.3},${size*0.3} ${size*0.5 + offset*size*0.3},${size*0.4}
                 L${size*0.3 + offset*size*0.3},${size*0.6}
                 Q${offset*size*0.3},${size*0.7} ${-size*0.3 + offset*size*0.3},${size*0.6}
                 L${-size*0.5 + offset*size*0.3},${size*0.4}
                 Q${-size*0.7 + offset*size*0.3},${size*0.3} ${-size*0.6 + offset*size*0.3},${size*0.1}
                 L${-size*0.5 + offset*size*0.3},${-size*0.1}
                 Q${-size*0.4 + offset*size*0.3},${-size*0.3} ${offset*size*0.3},${-size*0.2} Z"
              fill="${colors.secondary}" stroke="${colors.darkBrown}" stroke-width="2"/>
      `).join('')}

      <!-- Holly berries in heart pattern -->
      ${[
        [-size*0.15, -size*0.05],
        [0, 0],
        [size*0.15, -size*0.05],
        [-size*0.08, size*0.15],
        [size*0.08, size*0.15]
      ].map(([bx, by]) => `
        <circle cx="${bx}" cy="${by}" r="${size*0.12}" fill="${colors.holly}"/>
        <circle cx="${bx}" cy="${by}" r="${size*0.12}" fill="url(#berryGradient)"/>
        <circle cx="${bx - size*0.04}" cy="${by - size*0.04}" r="${size*0.04}" fill="#FF6B6B" opacity="0.8"/>
      `).join('')}

      <!-- Gold ribbon -->
      <path d="M${-size*0.4},${size*0.5} Q0,${size*0.65} ${size*0.4},${size*0.5}"
            stroke="${colors.accent}" stroke-width="4" fill="none" opacity="0.9"/>
    </g>
  `;
}

/**
 * Generate snowflake (Diamonds suit ♦)
 */
function generateSnowflake(x, y, size = 80) {
  return `
    <g transform="translate(${x},${y})">
      <!-- Center crystal -->
      <circle cx="0" cy="0" r="${size*0.15}" fill="${colors.snow}" stroke="#B0E0E6" stroke-width="2"/>

      <!-- Six main branches -->
      ${[0, 60, 120, 180, 240, 300].map(angle => `
        <g transform="rotate(${angle})">
          <!-- Main branch -->
          <line x1="0" y1="0" x2="0" y2="${-size*0.5}"
                stroke="#87CEEB" stroke-width="3" stroke-linecap="round"/>

          <!-- Side branches -->
          <line x1="0" y1="${-size*0.25}" x2="${-size*0.15}" y2="${-size*0.35}"
                stroke="#B0E0E6" stroke-width="2" stroke-linecap="round"/>
          <line x1="0" y1="${-size*0.25}" x2="${size*0.15}" y2="${-size*0.35}"
                stroke="#B0E0E6" stroke-width="2" stroke-linecap="round"/>

          <!-- End crystal -->
          <circle cx="0" cy="${-size*0.5}" r="${size*0.08}" fill="white" stroke="#87CEEB" stroke-width="1.5"/>
        </g>
      `).join('')}

      <!-- Ice sparkles -->
      ${[[size*0.3, 0], [-size*0.3, 0], [0, size*0.3], [0, -size*0.3]].map(([sx, sy]) => `
        <circle cx="${sx}" cy="${sy}" r="3" fill="white" opacity="0.8"/>
      `).join('')}
    </g>
  `;
}

/**
 * Generate Christmas tree (Spades suit ♠)
 */
function generateChristmasTree(x, y, size = 80) {
  return `
    <g transform="translate(${x},${y})">
      <!-- Tree triangles (3 tiers) -->
      ${[0, 1, 2].map(tier => {
        const tierSize = size * (0.5 - tier * 0.12);
        const tierY = -size*0.3 + tier * size*0.25;
        return `
          <path d="M0,${tierY} L${-tierSize},${tierY + tierSize*0.8} L${tierSize},${tierY + tierSize*0.8} Z"
                fill="${colors.secondary}" stroke="${colors.darkBrown}" stroke-width="2"/>
        `;
      }).join('')}

      <!-- Trunk -->
      <rect x="${-size*0.08}" y="${size*0.25}" width="${size*0.16}" height="${size*0.2}"
            fill="${colors.darkBrown}" stroke="${colors.darkBrown}" stroke-width="1"/>

      <!-- Ornaments -->
      ${[
        [0, -size*0.28, colors.holly],
        [-size*0.15, -size*0.15, colors.accent],
        [size*0.15, -size*0.15, '#FF6B6B'],
        [-size*0.22, 0, '#87CEEB'],
        [size*0.22, 0, colors.accent],
        [0, 0.1*size, colors.holly]
      ].map(([ox, oy, color]) => `
        <circle cx="${ox}" cy="${oy}" r="${size*0.06}" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="${ox - size*0.02}" cy="${oy - size*0.02}" r="${size*0.02}" fill="white" opacity="0.7"/>
      `).join('')}

      <!-- Star on top -->
      ${[0, 72, 144, 216, 288].map((angle) => {
        const nextAngle = angle + 36;
        return `
          <line x1="${Math.sin(angle * Math.PI/180) * size*0.12}"
                y1="${-size*0.45 + Math.cos(angle * Math.PI/180) * size*0.12}"
                x2="${Math.sin(nextAngle * Math.PI/180) * size*0.05}"
                y2="${-size*0.45 + Math.cos(nextAngle * Math.PI/180) * size*0.05}"
                stroke="${colors.accent}" stroke-width="2" stroke-linecap="round"/>
        `;
      }).join('')}
      <circle cx="0" cy="${-size*0.45}" r="${size*0.08}" fill="${colors.accent}"/>
    </g>
  `;
}

/**
 * Generate candy cane (Clubs suit ♣)
 */
function generateCandyCane(x, y, size = 80) {
  return `
    <g transform="translate(${x},${y})">
      <!-- Main cane shape -->
      <path d="M${-size*0.15},${-size*0.4}
               Q${-size*0.15},${-size*0.55} 0,${-size*0.55}
               Q${size*0.15},${-size*0.55} ${size*0.15},${-size*0.4}
               L${size*0.08},${size*0.45}
               Q${size*0.08},${size*0.5} 0,${size*0.5}
               Q${-size*0.08},${size*0.5} ${-size*0.08},${size*0.45}
               L${-size*0.08},${-size*0.4} Z"
            fill="white" stroke="${colors.holly}" stroke-width="2"/>

      <!-- Red stripes -->
      ${[0, 1, 2, 3, 4, 5, 6].map(i => `
        <rect x="${-size*0.08}" y="${-size*0.35 + i*size*0.12}"
              width="${size*0.16}" height="${size*0.05}"
              fill="${colors.holly}" opacity="0.9"/>
      `).join('')}

      <!-- Curved top stripes -->
      <path d="M${-size*0.12},${-size*0.45} Q0,${-size*0.52} ${size*0.12},${-size*0.45}"
            fill="none" stroke="${colors.holly}" stroke-width="${size*0.05}"/>

      <!-- Peppermint shine -->
      <ellipse cx="${-size*0.05}" cy="${-size*0.48}" rx="${size*0.04}" ry="${size*0.06}"
               fill="white" opacity="0.6"/>

      <!-- Ribbon bow -->
      <path d="M${-size*0.2},${-size*0.3} Q${-size*0.25},${-size*0.35} ${-size*0.22},${-size*0.25}"
            fill="${colors.accent}" stroke="${colors.accent}" stroke-width="2"/>
      <path d="M${size*0.2},${-size*0.3} Q${size*0.25},${-size*0.35} ${size*0.22},${-size*0.25}"
            fill="${colors.accent}" stroke="${colors.accent}" stroke-width="2"/>
      <circle cx="0" cy="${-size*0.3}" r="${size*0.08}" fill="${colors.accent}"/>
    </g>
  `;
}

/**
 * Get suit symbol generator function
 */
function getSuitSymbol(suit) {
  switch(suit.toLowerCase()) {
    case 'hearts': return generateHollyHeart;
    case 'diamonds': return generateSnowflake;
    case 'spades': return generateChristmasTree;
    case 'clubs': return generateCandyCane;
    default: return generateHollyHeart;
  }
}

/**
 * Get suit color
 */
function getSuitColor(suit) {
  switch(suit.toLowerCase()) {
    case 'hearts': return colors.primary;
    case 'diamonds': return '#87CEEB';
    case 'spades': return colors.secondary;
    case 'clubs': return colors.holly;
    default: return colors.primary;
  }
}

/**
 * Generate pip card layout positions
 */
function getPipPositions(rank) {
  const positions = {
    'A': [[0.5, 0.5]],
    '2': [[0.5, 0.25], [0.5, 0.75]],
    '3': [[0.5, 0.25], [0.5, 0.5], [0.5, 0.75]],
    '4': [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
    '5': [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]],
    '6': [[0.3, 0.3], [0.7, 0.3], [0.3, 0.5], [0.7, 0.5], [0.3, 0.7], [0.7, 0.7]],
    '7': [[0.3, 0.3], [0.7, 0.3], [0.5, 0.4], [0.3, 0.5], [0.7, 0.5], [0.3, 0.7], [0.7, 0.7]],
    '8': [[0.3, 0.25], [0.7, 0.25], [0.3, 0.42], [0.7, 0.42], [0.3, 0.58], [0.7, 0.58], [0.3, 0.75], [0.7, 0.75]],
    '9': [[0.3, 0.25], [0.7, 0.25], [0.3, 0.42], [0.7, 0.42], [0.5, 0.5], [0.3, 0.58], [0.7, 0.58], [0.3, 0.75], [0.7, 0.75]],
    '10': [[0.3, 0.23], [0.7, 0.23], [0.5, 0.32], [0.3, 0.42], [0.7, 0.42], [0.3, 0.58], [0.7, 0.58], [0.5, 0.68], [0.3, 0.77], [0.7, 0.77]]
  };
  return positions[rank] || [[0.5, 0.5]];
}

/**
 * Generate a pip card (Ace through 10)
 */
function generatePipCard(rank, suit) {
  const symbolFunc = getSuitSymbol(suit);
  const suitColor = getSuitColor(suit);
  const positions = getPipPositions(rank);

  // Calculate pip size based on count
  const pipCount = positions.length;
  const baseSize = rank === 'A' ? 150 : (pipCount <= 3 ? 100 : pipCount <= 6 ? 80 : 70);

  return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${getCommonDefs()}

      <!-- Background -->
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${colors.background}" rx="30"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#damask)"/>

      <!-- Ornate border -->
      ${generateOrnateFrame(CARD_WIDTH, CARD_HEIGHT)}

      <!-- Corner rank (top-left) -->
      <text x="60" y="90" font-family="Georgia, serif" font-size="72"
            font-weight="bold" fill="${suitColor}" text-anchor="middle">${rank}</text>
      <g transform="translate(60, 150)">
        ${symbolFunc(0, 0, 35)}
      </g>

      <!-- Corner rank (bottom-right, rotated) -->
      <g transform="rotate(180 ${CARD_WIDTH/2} ${CARD_HEIGHT/2})">
        <text x="60" y="90" font-family="Georgia, serif" font-size="72"
              font-weight="bold" fill="${suitColor}" text-anchor="middle">${rank}</text>
        <g transform="translate(60, 150)">
          ${symbolFunc(0, 0, 35)}
        </g>
      </g>

      <!-- Pip symbols -->
      ${positions.map(([xRatio, yRatio]) => {
        const x = CARD_WIDTH * xRatio;
        const y = CARD_HEIGHT * yRatio;
        return symbolFunc(x, y, baseSize);
      }).join('')}
    </svg>
  `;
}

/**
 * Generate Victorian Santa Claus portrait (for Kings)
 */
function generateSantaPortrait(centerX, centerY) {
  return `
    <g transform="translate(${centerX},${centerY - 50})">
      <!-- Santa's face circle -->
      <circle cx="0" cy="0" r="95" fill="#FFD4C4" stroke="${colors.darkBrown}" stroke-width="4"/>

      <!-- Rosy cheeks -->
      <circle cx="-50" cy="0" r="30" fill="${colors.holly}" opacity="0.3"/>
      <circle cx="50" cy="0" r="30" fill="${colors.holly}" opacity="0.3"/>

      <!-- Eyes -->
      <circle cx="-30" cy="-25" r="12" fill="white"/>
      <circle cx="30" cy="-25" r="12" fill="white"/>
      <circle cx="-28" cy="-25" r="8" fill="${colors.darkBrown}"/>
      <circle cx="32" cy="-25" r="8" fill="${colors.darkBrown}"/>
      <circle cx="-26" cy="-28" r="4" fill="white"/>
      <circle cx="34" cy="-28" r="4" fill="white"/>

      <!-- Glasses -->
      <circle cx="-30" cy="-25" r="22" fill="none" stroke="${colors.accent}" stroke-width="3"/>
      <circle cx="30" cy="-25" r="22" fill="none" stroke="${colors.accent}" stroke-width="3"/>
      <line x1="-8" y1="-25" x2="8" y2="-25" stroke="${colors.accent}" stroke-width="3"/>

      <!-- Eyebrows -->
      <path d="M-50,-45 Q-30,-50 -10,-45" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M10,-45 Q30,-50 50,-45" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/>

      <!-- Nose -->
      <circle cx="0" cy="-5" r="18" fill="#FFB4A0"/>
      <circle cx="-5" cy="-8" r="6" fill="#FFC8B8" opacity="0.8"/>

      <!-- Smile -->
      <path d="M-30,25 Q0,35 30,25" stroke="${colors.primary}" stroke-width="4" fill="none" stroke-linecap="round"/>

      <!-- Mustache -->
      <ellipse cx="-35" cy="10" rx="40" ry="20" fill="white" stroke="${colors.darkBrown}" stroke-width="2"/>
      <ellipse cx="35" cy="10" rx="40" ry="20" fill="white" stroke="${colors.darkBrown}" stroke-width="2"/>
      <rect x="-20" y="0" width="40" height="25" fill="white"/>

      <!-- Big fluffy beard -->
      <ellipse cx="0" cy="110" rx="110" ry="85" fill="white" stroke="${colors.darkBrown}" stroke-width="4"/>
      <ellipse cx="-50" cy="90" rx="45" ry="60" fill="white"/>
      <ellipse cx="50" cy="90" rx="45" ry="60" fill="white"/>
      <ellipse cx="0" cy="130" rx="80" ry="55" fill="white"/>

      <!-- Beard curls -->
      ${[-60, -30, 0, 30, 60].map(x => `
        <circle cx="${x}" cy="140" r="15" fill="white"/>
      `).join('')}

      <!-- Santa hat -->
      <path d="M-90,-80 L-10,-120 L60,-75 L0,-60 Z"
            fill="${colors.holly}" stroke="${colors.darkBrown}" stroke-width="4"/>
      <ellipse cx="60" cy="-75" rx="28" ry="28" fill="white"/>
      <circle cx="60" cy="-75" r="18" fill="white"/>
      <ellipse cx="0" cy="-65" rx="95" ry="18" fill="white" stroke="${colors.darkBrown}" stroke-width="3"/>

      <!-- Red coat with white fur -->
      <rect x="-120" y="160" width="240" height="100" fill="${colors.holly}" stroke="${colors.darkBrown}" stroke-width="4"/>
      <rect x="-120" y="160" width="240" height="25" fill="white"/>

      <!-- Gold buttons -->
      ${[180, 210, 240].map(y => `
        <circle cx="0" cy="${y}" r="12" fill="${colors.accent}" stroke="${colors.darkBrown}" stroke-width="3"/>
        <circle cx="0" cy="${y}" r="6" fill="${colors.accent}" opacity="0.5"/>
      `).join('')}
    </g>
  `;
}

/**
 * Generate Christmas Angel portrait (for Queens)
 */
function generateAngelPortrait(centerX, centerY) {
  return `
    <g transform="translate(${centerX},${centerY - 50})">
      <!-- Golden halo -->
      <ellipse cx="0" cy="-160" rx="70" ry="18"
               fill="none" stroke="${colors.accent}" stroke-width="10" opacity="0.9"/>
      <ellipse cx="0" cy="-160" rx="60" ry="15"
               fill="${colors.accent}" opacity="0.4"/>

      <!-- Angel face -->
      <circle cx="0" cy="-20" r="80" fill="#FFE5D4" stroke="${colors.darkBrown}" stroke-width="3"/>

      <!-- Flowing golden hair -->
      <path d="M-80,-30 Q-70,-100 -40,-110 Q-10,-115 0,-110 Q10,-115 40,-110 Q70,-100 80,-30"
            fill="${colors.accent}" opacity="0.7" stroke="${colors.accent}" stroke-width="2"/>
      ${[-70, -50, -30, 30, 50, 70].map(x => `
        <ellipse cx="${x}" cy="-50" rx="22" ry="80" fill="${colors.accent}" opacity="0.6"/>
      `).join('')}

      <!-- Eyes with long lashes -->
      <ellipse cx="-28" cy="-35" rx="10" ry="14" fill="${colors.darkBrown}"/>
      <ellipse cx="28" cy="-35" rx="10" ry="14" fill="${colors.darkBrown}"/>
      <circle cx="-26" cy="-38" r="4" fill="white"/>
      <circle cx="30" cy="-38" r="4" fill="white"/>
      ${[-32, -28, -24].map(x => `
        <line x1="${x}" y1="-50" x2="${x}" y2="-55" stroke="${colors.darkBrown}" stroke-width="2" stroke-linecap="round"/>
      `).join('')}
      ${[24, 28, 32].map(x => `
        <line x1="${x}" y1="-50" x2="${x}" y2="-55" stroke="${colors.darkBrown}" stroke-width="2" stroke-linecap="round"/>
      `).join('')}

      <!-- Gentle smile -->
      <path d="M-25,-5 Q0,0 25,-5" stroke="${colors.holly}" stroke-width="3" fill="none" stroke-linecap="round"/>

      <!-- Nose -->
      <ellipse cx="0" cy="-18" rx="10" ry="14" fill="#FFD5C4"/>

      <!-- Beautiful wings -->
      <g opacity="0.95">
        <!-- Left wing -->
        <path d="M-80,20 Q-160,-40 -180,-20 Q-190,10 -165,40 Q-130,60 -85,35 Z"
              fill="white" stroke="${colors.accent}" stroke-width="4"/>
        <path d="M-80,20 Q-145,-25 -160,-10 Q-155,20 -130,35 Q-100,45 -80,30"
              fill="white" opacity="0.8"/>
        ${[-150, -135, -120, -105].map((x, i) => `
          <path d="M${x},-5 Q${x-15},${10+i*8} ${x-10},${20+i*8}"
                stroke="${colors.accent}" stroke-width="2" fill="none" opacity="0.7"/>
        `).join('')}

        <!-- Right wing -->
        <path d="M80,20 Q160,-40 180,-20 Q190,10 165,40 Q130,60 85,35 Z"
              fill="white" stroke="${colors.accent}" stroke-width="4"/>
        <path d="M80,20 Q145,-25 160,-10 Q155,20 130,35 Q100,45 80,30"
              fill="white" opacity="0.8"/>
        ${[150, 135, 120, 105].map((x, i) => `
          <path d="M${x},-5 Q${x+15},${10+i*8} ${x+10},${20+i*8}"
                stroke="${colors.accent}" stroke-width="2" fill="none" opacity="0.7"/>
        `).join('')}
      </g>

      <!-- White flowing gown -->
      <path d="M-70,60 L-90,260 L90,260 L70,60 Z"
            fill="white" stroke="${colors.accent}" stroke-width="4"/>
      <path d="M-60,80 L-70,180 L70,180 L60,80 Z"
            fill="${colors.accent}" opacity="0.3"/>

      <!-- Gold star decorations on gown -->
      ${[100, 140, 180, 220].map(y =>
        [0, 72, 144, 216, 288].map(angle => {
          const x = Math.sin(angle * Math.PI/180) * 15;
          const cy = y + Math.cos(angle * Math.PI/180) * 15;
          return `<circle cx="${x}" r="3" fill="${colors.accent}"/>`;
        }).join('')
      ).join('')}
    </g>
  `;
}

/**
 * Generate Toy Soldier portrait (for Jacks)
 */
function generateToySoldierPortrait(centerX, centerY) {
  return `
    <g transform="translate(${centerX},${centerY - 50})">
      <!-- Tall military hat -->
      <rect x="-55" y="-180" width="110" height="90"
            fill="${colors.darkBrown}" stroke="black" stroke-width="4"/>
      <rect x="-60" y="-95" width="120" height="18"
            fill="${colors.accent}" stroke="black" stroke-width="3"/>
      <rect x="-55" y="-165" width="110" height="25"
            fill="${colors.holly}" stroke="black" stroke-width="3"/>

      <!-- Gold military emblem -->
      <circle cx="0" cy="-130" r="20" fill="${colors.accent}" stroke="black" stroke-width="3"/>
      <path d="M0,-145 L-8,-125 L-15,-118 L0,-125 L15,-118 L8,-125 Z"
            fill="${colors.holly}" stroke="black" stroke-width="2"/>

      <!-- Soldier's head -->
      <circle cx="0" cy="-15" r="65" fill="#FFE0C8" stroke="black" stroke-width="4"/>

      <!-- Military cap chin strap -->
      <path d="M-55,-75 Q-65,-40 -60,-10" stroke="black" stroke-width="4" fill="none"/>
      <path d="M55,-75 Q65,-40 60,-10" stroke="black" stroke-width="4" fill="none"/>

      <!-- Stern eyes -->
      <rect x="-35" y="-35" width="12" height="18" rx="6" fill="black"/>
      <rect x="23" y="-35" width="12" height="18" rx="6" fill="black"/>
      <circle cx="-29" cy="-30" r="3" fill="white"/>
      <circle cx="29" cy="-30" r="3" fill="white"/>

      <!-- Straight eyebrows -->
      <rect x="-42" y="-52" width="25" height="5" fill="black"/>
      <rect x="17" y="-52" width="25" height="5" fill="black"/>

      <!-- Nose -->
      <path d="M0,-20 L-8,0 L0,5 L8,0 Z" fill="#FFD0B8" stroke="black" stroke-width="2"/>

      <!-- Firm lips -->
      <rect x="-20" y="15" width="40" height="6" fill="${colors.primary}"/>

      <!-- Large handlebar mustache -->
      <ellipse cx="-45" cy="12" rx="35" ry="15" fill="black"/>
      <ellipse cx="45" cy="12" rx="35" ry="15" fill="black"/>
      <rect x="-25" y="5" width="50" height="20" fill="black"/>
      <path d="M-70,12 Q-75,8 -78,12" stroke="black" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M70,12 Q75,8 78,12" stroke="black" stroke-width="6" fill="none" stroke-linecap="round"/>

      <!-- Red military jacket -->
      <rect x="-85" y="50" width="170" height="140"
            fill="${colors.holly}" stroke="black" stroke-width="4"/>

      <!-- White cross-belts -->
      <rect x="-8" y="50" width="16" height="140" fill="white" stroke="black" stroke-width="2"/>
      <path d="M-85,50 L40,190" stroke="white" stroke-width="16"/>
      <path d="M85,50 L-40,190" stroke="white" stroke-width="16"/>
      <circle cx="0" cy="120" r="25" fill="white" stroke="black" stroke-width="3"/>

      <!-- Double row of gold buttons -->
      ${[70, 105, 140, 175].map(y => `
        <circle cx="-35" cy="${y}" r="10" fill="${colors.accent}" stroke="black" stroke-width="2"/>
        <circle cx="35" cy="${y}" r="10" fill="${colors.accent}" stroke="black" stroke-width="2"/>
      `).join('')}

      <!-- Gold epaulettes with fringe -->
      <rect x="-85" y="45" width="40" height="25" fill="${colors.accent}" stroke="black" stroke-width="3"/>
      <rect x="45" y="45" width="40" height="25" fill="${colors.accent}" stroke="black" stroke-width="3"/>
      ${[-65, 65].map(x =>
        [0, 1, 2, 3, 4].map(i => `
          <line x1="${x}" y1="${73 + i*4}" x2="${x}" y2="${77 + i*4}"
                stroke="${colors.accent}" stroke-width="3"/>
        `).join('')
      ).join('')}

      <!-- Service medal -->
      <circle cx="0" cy="120" r="22" fill="${colors.holly}" stroke="${colors.accent}" stroke-width="4"/>
      <circle cx="0" cy="120" r="15" fill="${colors.accent}"/>
      <path d="M0,108 L-6,120 L0,132 L6,120 Z" fill="${colors.holly}"/>

      <!-- Candy cane rifle on shoulder -->
      <g transform="translate(95, 90) rotate(45)">
        <rect x="-8" y="0" width="16" height="95" fill="white" stroke="${colors.holly}" stroke-width="3"/>
        ${[0, 1, 2, 3, 4, 5].map(i => `
          <rect x="-8" y="${i*16}" width="16" height="7" fill="${colors.holly}"/>
        `).join('')}
        <rect x="-12" y="-15" width="24" height="18" fill="${colors.darkBrown}" stroke="black" stroke-width="3"/>
      </g>
    </g>
  `;
}

/**
 * Generate face card (Jack, Queen, King)
 */
function generateFaceCard(rank, suit) {
  const symbolFunc = getSuitSymbol(suit);
  const suitColor = getSuitColor(suit);

  // Generate appropriate character portrait
  let characterPortrait;
  if (rank === 'K') {
    characterPortrait = generateSantaPortrait(CARD_WIDTH/2, CARD_HEIGHT/2);
  } else if (rank === 'Q') {
    characterPortrait = generateAngelPortrait(CARD_WIDTH/2, CARD_HEIGHT/2);
  } else {
    characterPortrait = generateToySoldierPortrait(CARD_WIDTH/2, CARD_HEIGHT/2);
  }

  return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${getCommonDefs()}

      <!-- Background -->
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${colors.background}" rx="30"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#damask)"/>

      <!-- Ornate border -->
      ${generateOrnateFrame(CARD_WIDTH, CARD_HEIGHT)}

      <!-- Corner rank (top-left) -->
      <text x="60" y="90" font-family="Georgia, serif" font-size="72"
            font-weight="bold" fill="${suitColor}" text-anchor="middle">${rank}</text>
      <g transform="translate(60, 150)">
        ${symbolFunc(0, 0, 35)}
      </g>

      <!-- Corner rank (bottom-right, rotated) -->
      <g transform="rotate(180 ${CARD_WIDTH/2} ${CARD_HEIGHT/2})">
        <text x="60" y="90" font-family="Georgia, serif" font-size="72"
              font-weight="bold" fill="${suitColor}" text-anchor="middle">${rank}</text>
        <g transform="translate(60, 150)">
          ${symbolFunc(0, 0, 35)}
        </g>
      </g>

      <!-- Detailed character portrait -->
      ${characterPortrait}

      <!-- Decorative suit symbols in corners -->
      ${symbolFunc(120, 180, 45)}
      ${symbolFunc(CARD_WIDTH - 120, 180, 45)}
      ${symbolFunc(120, CARD_HEIGHT - 180, 45)}
      ${symbolFunc(CARD_WIDTH - 120, CARD_HEIGHT - 180, 45)}
    </svg>
  `;
}

/**
 * Generate joker card
 */
function generateJoker(jokerNum) {
  return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${getCommonDefs()}

      <!-- Background with festive gradient -->
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${colors.background}" rx="30"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#damask)"/>

      <!-- Ornate border -->
      ${generateOrnateFrame(CARD_WIDTH, CARD_HEIGHT)}

      <!-- "JOKER" text at top -->
      <text x="${CARD_WIDTH/2}" y="120" font-family="Georgia, serif" font-size="84"
            font-weight="bold" fill="${colors.primary}" text-anchor="middle">JOKER</text>

      <!-- Jester hat and bells -->
      <path d="M${CARD_WIDTH/2},${CARD_HEIGHT/2 - 150}
               L${CARD_WIDTH/2 - 80},${CARD_HEIGHT/2 - 80}
               L${CARD_WIDTH/2 + 80},${CARD_HEIGHT/2 - 80} Z"
            fill="${colors.holly}" stroke="${colors.accent}" stroke-width="4"/>

      <!-- Hat bells -->
      ${[-80, 0, 80].map(offset => `
        <circle cx="${CARD_WIDTH/2 + offset}" cy="${CARD_HEIGHT/2 - 80}" r="20"
                fill="${colors.accent}" stroke="white" stroke-width="2"/>
        <circle cx="${CARD_WIDTH/2 + offset}" cy="${CARD_HEIGHT/2 - 80}" r="12"
                fill="${colors.holly}"/>
      `).join('')}

      <!-- All four suit symbols -->
      ${generateHollyHeart(CARD_WIDTH/2 - 120, CARD_HEIGHT/2 + 50, 80)}
      ${generateSnowflake(CARD_WIDTH/2 + 120, CARD_HEIGHT/2 + 50, 80)}
      ${generateChristmasTree(CARD_WIDTH/2 - 120, CARD_HEIGHT/2 + 200, 80)}
      ${generateCandyCane(CARD_WIDTH/2 + 120, CARD_HEIGHT/2 + 200, 80)}

      <!-- Joker number -->
      <text x="${CARD_WIDTH/2}" y="${CARD_HEIGHT - 80}" font-family="Georgia, serif" font-size="64"
            font-weight="bold" fill="${colors.accent}" text-anchor="middle">${jokerNum}</text>
    </svg>
  `;
}

/**
 * Generate card back
 */
function generateCardBack() {
  return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${getCommonDefs()}

      <!-- Background -->
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${colors.primary}" rx="30"/>

      <!-- Ornate border -->
      ${generateOrnateFrame(CARD_WIDTH, CARD_HEIGHT)}

      <!-- Central wreath -->
      <circle cx="${CARD_WIDTH/2}" cy="${CARD_HEIGHT/2}" r="250"
              fill="none" stroke="${colors.secondary}" stroke-width="40"/>
      <circle cx="${CARD_WIDTH/2}" cy="${CARD_HEIGHT/2}" r="270"
              fill="none" stroke="${colors.accent}" stroke-width="8"/>

      <!-- Holly berries around wreath -->
      ${Array.from({length: 12}, (_, i) => {
        const angle = (i * 30) * Math.PI / 180;
        const x = CARD_WIDTH/2 + Math.cos(angle) * 250;
        const y = CARD_HEIGHT/2 + Math.sin(angle) * 250;
        return `
          <circle cx="${x}" cy="${y}" r="20" fill="${colors.holly}"/>
          <circle cx="${x}" cy="${y}" r="20" fill="url(#berryGradient)"/>
        `;
      }).join('')}

      <!-- "Season's Greetings" text -->
      <text x="${CARD_WIDTH/2}" y="${CARD_HEIGHT/2 - 30}"
            font-family="Georgia, serif" font-size="56" font-style="italic"
            fill="${colors.accent}" text-anchor="middle">Season's</text>
      <text x="${CARD_WIDTH/2}" y="${CARD_HEIGHT/2 + 40}"
            font-family="Georgia, serif" font-size="56" font-style="italic"
            fill="${colors.accent}" text-anchor="middle">Greetings</text>

      <!-- Decorative snowflakes in corners -->
      ${[[150, 150], [CARD_WIDTH-150, 150], [150, CARD_HEIGHT-150], [CARD_WIDTH-150, CARD_HEIGHT-150]].map(([x, y]) =>
        generateSnowflake(x, y, 60)
      ).join('')}
    </svg>
  `;
}

// Generate complete deck
const deckDir = path.join(OUTPUT_DIR, 'victorian_christmas');
if (!fs.existsSync(deckDir)) {
  fs.mkdirSync(deckDir, { recursive: true });
}

const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
let cardCount = 0;

// Generate all standard cards
for (const suit of suits) {
  for (const rank of ranks) {
    let svg;
    if (['J', 'Q', 'K'].includes(rank)) {
      svg = generateFaceCard(rank, suit);
    } else {
      svg = generatePipCard(rank, suit);
    }

    const filename = `${rank}_${suit}.svg`;
    fs.writeFileSync(path.join(deckDir, filename), svg);
    cardCount++;
    console.log(`✓ Generated: ${rank} of ${suit}`);
  }
}

// Generate jokers
fs.writeFileSync(path.join(deckDir, 'joker_1.svg'), generateJoker(1));
console.log('✓ Generated: Joker 1');
cardCount++;

fs.writeFileSync(path.join(deckDir, 'joker_2.svg'), generateJoker(2));
console.log('✓ Generated: Joker 2');
cardCount++;

// Generate card back
fs.writeFileSync(path.join(deckDir, 'card_back.svg'), generateCardBack());
console.log('✓ Generated: Card Back');
cardCount++;

console.log(`\n✅ Complete deck generated! (${cardCount} cards total)`);
console.log(`📁 Output: ${deckDir}`);
console.log('\n🎨 Card breakdown:');
console.log(`   • 52 standard playing cards`);
console.log(`   • 2 jokers`);
console.log(`   • 1 card back`);
console.log('\n💡 Open any SVG file in a browser to see the detailed artwork!\n');
