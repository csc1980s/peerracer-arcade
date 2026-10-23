#!/usr/bin/env node
/**
 * Test PNG index update on a single card
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TEST_CARD = path.join(__dirname, '..', 'decks', 'botanical_garden', 'QS.png');
const OUTPUT_CARD = path.join(__dirname, '..', 'test_card_output.png');

// Digital UI Optimized spec for 750×1050px
const SPEC = {
  width: 750,
  height: 1050,
  topMargin: 42.86,
  centerlineX: 98.57,
  rankBaseline: 95.4183,
  suitPipY: 143.57,
  suitPipHeight: 83.57,
};

const COLORS = {
  black: '#1c2833',
};

const SUIT_PATHS = {
  spades: 'M0,-15 C-7,-8 -12,-2 -12,5 C-12,12 -7,17 0,17 C7,17 12,12 12,5 C12,-2 7,-8 0,-15 Z M-6,17 L-3,30 L3,30 L6,17 Z',
};

function generateIndexSVG(rank, suit) {
  const color = COLORS.black;
  const suitPath = SUIT_PATHS[suit];

  const topLeft = `
    <g transform="translate(${SPEC.centerlineX}, ${SPEC.topMargin})">
      <text x="0" y="${SPEC.rankBaseline}"
            font-family="'Cinzel', Georgia, serif"
            font-weight="900"
            font-size="130.71"
            fill="${color}"
            text-anchor="middle">Q</text>
      <g transform="translate(0, ${SPEC.suitPipY}) scale(${SPEC.suitPipHeight / 100})">
        <path d="${suitPath}" fill="${color}"/>
      </g>
    </g>
  `;

  const bottomRight = `
    <g transform="rotate(180 ${SPEC.width / 2} ${SPEC.height / 2})">
      <g transform="translate(${SPEC.centerlineX}, ${SPEC.topMargin})">
        <text x="0" y="${SPEC.rankBaseline}"
              font-family="'Cinzel', Georgia, serif"
              font-weight="900"
              font-size="130.71"
              fill="${color}"
              text-anchor="middle">Q</text>
        <g transform="translate(0, ${SPEC.suitPipY}) scale(${SPEC.suitPipHeight / 100})">
          <path d="${suitPath}" fill="${color}"/>
        </g>
      </g>
    </g>
  `;

  return `
    <svg width="${SPEC.width}" height="${SPEC.height}" xmlns="http://www.w3.org/2000/svg">
      ${topLeft}
      ${bottomRight}
    </svg>
  `.trim();
}

async function test() {
  console.log('Testing PNG index update...');
  console.log('Input:', TEST_CARD);
  console.log('Output:', OUTPUT_CARD);

  const indexSVG = generateIndexSVG('Q', 'spades');

  // Create white rectangles to clear old index areas
  const clearTopLeft = Buffer.from(`
    <svg width="${SPEC.width}" height="${SPEC.height}">
      <rect x="0" y="0" width="200" height="250" fill="white"/>
    </svg>
  `);

  const clearBottomRight = Buffer.from(`
    <svg width="${SPEC.width}" height="${SPEC.height}">
      <rect x="${SPEC.width - 200}" y="${SPEC.height - 250}" width="200" height="250" fill="white"/>
    </svg>
  `);

  // Composite layers
  await sharp(TEST_CARD)
    .composite([
      { input: clearTopLeft, blend: 'over' },
      { input: clearBottomRight, blend: 'over' },
      { input: Buffer.from(indexSVG), blend: 'over' }
    ])
    .png()
    .toFile(OUTPUT_CARD);

  console.log('✅ Test complete! Check:', OUTPUT_CARD);
}

test().catch(err => console.error('Error:', err));
