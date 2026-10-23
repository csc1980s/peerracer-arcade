#!/usr/bin/env node
/**
 * Update PNG card indices to Digital UI Optimized specification
 * Uses Sharp to composite SVG overlays onto PNG cards
 * Preserves card artwork while updating only the index areas
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DECKS_DIR = path.join(__dirname, '..', 'decks');

// Digital UI Optimized spec for 750×1050px
const SPEC = {
  width: 750,
  height: 1050,
  topMargin: 42.86,
  leftMargin: 38.57,
  centerlineX: 98.57,
  rankHeight: 130.71,
  rankBaseline: 95.4183, // 130.71 × 0.73
  suitPipHeight: 83.57,
  gap: 12.86,
  suitPipY: 143.57, // 130.71 + 12.86
};

const COLORS = {
  red: '#c82333',     // Hearts & Diamonds
  black: '#1c2833',   // Spades & Clubs
};

const SUIT_PATHS = {
  hearts: 'M0,-4 C-10,12 -20,20 0,40 C20,20 10,12 0,-4 Z',
  diamonds: 'M0,-15 L12,0 L0,15 L-12,0 Z',
  spades: 'M0,-15 C-7,-8 -12,-2 -12,5 C-12,12 -7,17 0,17 C7,17 12,12 12,5 C12,-2 7,-8 0,-15 Z M-6,17 L-3,30 L3,30 L6,17 Z',
  clubs: 'M0,-12 C-6,-12 -11,-7 -11,-1 C-11,3 -9,7 -5,9 C-8,10 -10,13 -10,17 C-10,22 -6,26 0,26 C6,26 10,22 10,17 C10,13 8,10 5,9 C9,7 11,3 11,-1 C11,-7 6,-12 0,-12 Z M-6,17 L-3,30 L3,30 L6,17 Z'
};

function getRankFromFilename(filename) {
  const base = path.basename(filename, '.png');
  if (base.startsWith('10')) return '10';
  const match = base.match(/^([AJQK2-9])/);
  return match ? match[1] : null;
}

function getSuitFromFilename(filename) {
  const base = path.basename(filename, '.png').toLowerCase();
  if (base.includes('heart') || base.endsWith('_h')) return 'hearts';
  if (base.includes('diamond') || base.endsWith('_d')) return 'diamonds';
  if (base.includes('spade') || base.endsWith('_s')) return 'spades';
  if (base.includes('club') || base.endsWith('_c')) return 'clubs';
  return null;
}

function isRedSuit(suit) {
  return suit === 'hearts' || suit === 'diamonds';
}

function generateIndexSVG(rank, suit) {
  const color = isRedSuit(suit) ? COLORS.red : COLORS.black;
  const suitPath = SUIT_PATHS[suit];
  const textLengthAttr = rank === '10' ? ' textLength="92.3" lengthAdjust="spacingAndGlyphs"' : '';

  // Top-left index
  const topLeft = `
    <g transform="translate(${SPEC.centerlineX}, ${SPEC.topMargin})">
      <text x="0" y="${SPEC.rankBaseline}"
            font-family="'Cinzel', Georgia, serif"
            font-weight="900"
            font-size="130.71"
            fill="${color}"
            text-anchor="middle"${textLengthAttr}>${rank}</text>
      <g transform="translate(0, ${SPEC.suitPipY}) scale(${SPEC.suitPipHeight / 100})">
        <path d="${suitPath}" fill="${color}" transform="translate(0, 0)"/>
      </g>
    </g>
  `;

  // Bottom-right index (180° rotation)
  const bottomRight = `
    <g transform="rotate(180 ${SPEC.width / 2} ${SPEC.height / 2})">
      <g transform="translate(${SPEC.centerlineX}, ${SPEC.topMargin})">
        <text x="0" y="${SPEC.rankBaseline}"
              font-family="'Cinzel', Georgia, serif"
              font-weight="900"
              font-size="130.71"
              fill="${color}"
              text-anchor="middle"${textLengthAttr}>${rank}</text>
        <g transform="translate(0, ${SPEC.suitPipY}) scale(${SPEC.suitPipHeight / 100})">
          <path d="${suitPath}" fill="${color}" transform="translate(0, 0)"/>
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

async function updateCardPNG(pngPath) {
  const rank = getRankFromFilename(pngPath);
  const suit = getSuitFromFilename(pngPath);

  if (!rank || !suit) {
    return false;
  }

  try {
    // Generate SVG overlay with new indices
    const indexSVG = generateIndexSVG(rank, suit);

    // Read original PNG
    const originalImage = sharp(pngPath);
    const metadata = await originalImage.metadata();

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

    // Composite: original + clear areas + new indices
    await sharp(pngPath)
      .composite([
        { input: clearTopLeft, blend: 'over' },
        { input: clearBottomRight, blend: 'over' },
        { input: Buffer.from(indexSVG), blend: 'over' }
      ])
      .png()
      .toFile(pngPath + '.tmp');

    // Replace original with updated version
    fs.renameSync(pngPath + '.tmp', pngPath);
    return true;

  } catch (err) {
    console.error(`Error processing ${path.basename(pngPath)}:`, err.message);
    return false;
  }
}

async function processDeck(deckPath) {
  const files = fs.readdirSync(deckPath);
  const pngFiles = files.filter(f => f.endsWith('.png') && !f.toLowerCase().includes('back') && !f.toLowerCase().includes('joker'));

  let updated = 0;

  for (const file of pngFiles) {
    const filePath = path.join(deckPath, file);
    const success = await updateCardPNG(filePath);
    if (success) {
      updated++;
      console.log(`✓ Updated: ${file}`);
    }
  }

  return updated;
}

async function main() {
  console.log('\n🖼️  PNG Index Updater (Sharp + SVG Overlay)');
  console.log('===========================================\n');

  if (!fs.existsSync(DECKS_DIR)) {
    console.error(`Error: Decks directory not found: ${DECKS_DIR}`);
    process.exit(1);
  }

  const deckNames = fs.readdirSync(DECKS_DIR).filter(name => {
    const fullPath = path.join(DECKS_DIR, name);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`Found ${deckNames.length} deck themes\n`);

  let totalUpdated = 0;

  for (const deckName of deckNames) {
    const deckPath = path.join(DECKS_DIR, deckName);
    console.log(`\nProcessing: ${deckName}`);
    const count = await processDeck(deckPath);
    totalUpdated += count;
    console.log(`  → ${count} cards updated`);
  }

  console.log(`\n✅ Total cards updated: ${totalUpdated}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
