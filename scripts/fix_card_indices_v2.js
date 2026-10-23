#!/usr/bin/env node
/**
 * Batch Update All Card Indices to Digital UI Optimized Specification (V2)
 *
 * Simplified, robust implementation using line-by-line processing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DECKS_DIR = path.join(__dirname, '..', 'decks');

// Digital UI Optimized spec for 750×1050px
const SPEC = {
  topMargin: 42.86,
  centerlineX: 98.57,
  rankHeightPx: 130.71,
  rankBaselineRatio: 0.73, // SVG text baseline position ratio
  suitPipHeight: 83.57,
  gap: 12.86,
};

/**
 * Process a single SVG file
 */
function processCard(filePath, rank) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const outputLines = [];

  let inTopLeftIndex = false;
  let inBottomRightIndex = false;
  let inRotate180 = false;
  let textLineProcessed = false;
  let suitLineProcessed = false;

  // Calculate values
  const rankY = SPEC.rankHeightPx * SPEC.rankBaselineRatio;
  const suitY = SPEC.rankHeightPx + SPEC.gap;
  const suitScale = (SPEC.suitPipHeight / 100).toFixed(4);
  const textLengthAttr = rank === '10' ? ` textLength="92.3" lengthAdjust="spacingAndGlyphs"` : '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detect sections
    if (line.includes('Corner Index: Top-Left') || line.includes('translate(56, 60)')) {
      inTopLeftIndex = true;
      textLineProcessed = false;
      suitLineProcessed = false;
    } else if (line.includes('rotate(180')) {
      inRotate180 = true;
      inBottomRightIndex = false;
    } else if (inRotate180 && line.includes('translate(56, 60)') || (inRotate180 && line.includes(`translate(${SPEC.centerlineX},`))) {
      inBottomRightIndex = true;
      textLineProcessed = false;
      suitLineProcessed = false;
    }

    // Process top-left index
    if (inTopLeftIndex && !textLineProcessed && line.includes('<g transform="translate(')) {
      line = line.replace(/translate\([^,]+,\s*[^)]+\)/, `translate(${SPEC.centerlineX}, ${SPEC.topMargin})`);
    } else if (inTopLeftIndex && !textLineProcessed && line.includes('<text')) {
      // Update text element
      line = line
        .replace(/x="[^"]*"/, 'x="0"')
        .replace(/y="[^"]*"/, `y="${rankY.toFixed(4)}"`)
        .replace(/\s*text-anchor="[^"]*"/g, '')
        .replace(/\s*textLength="[^"]*"/g, '')
        .replace(/\s*lengthAdjust="[^"]*"/g, '');

      // Add text-anchor before the closing >
      line = line.replace(/>([^<]*)/, ` text-anchor="middle"${textLengthAttr}>$1`);
      textLineProcessed = true;
    } else if (inTopLeftIndex && !suitLineProcessed && line.includes('translate(') && line.includes('scale(')) {
      // Update suit pip transform
      line = line.replace(/translate\([^)]+\)\s*scale\([^)]+\)/, `translate(0, ${suitY.toFixed(2)}) scale(${suitScale})`);
      suitLineProcessed = true;
      inTopLeftIndex = false; // Done with top-left
    }

    // Process bottom-right index (inside rotate(180))
    if (inBottomRightIndex && !textLineProcessed && line.includes('<g transform="translate(')) {
      line = line.replace(/translate\([^,]+,\s*[^)]+\)/, `translate(${SPEC.centerlineX}, ${SPEC.topMargin})`);
    } else if (inBottomRightIndex && !textLineProcessed && line.includes('<text')) {
      // Update text element
      line = line
        .replace(/x="[^"]*"/, 'x="0"')
        .replace(/y="[^"]*"/, `y="${rankY.toFixed(4)}"`)
        .replace(/\s*text-anchor="[^"]*"/g, '')
        .replace(/\s*textLength="[^"]*"/g, '')
        .replace(/\s*lengthAdjust="[^"]*"/g, '');

      // Add text-anchor before the closing >
      line = line.replace(/>([^<]*)/, ` text-anchor="middle"${textLengthAttr}>$1`);
      textLineProcessed = true;
    } else if (inBottomRightIndex && !suitLineProcessed && line.includes('translate(') && line.includes('scale(')) {
      // Update suit pip transform
      line = line.replace(/translate\([^)]+\)\s*scale\([^)]+\)/, `translate(0, ${suitY.toFixed(2)}) scale(${suitScale})`);
      suitLineProcessed = true;
      inBottomRightIndex = false; // Done with bottom-right
    }

    // Reset flags when leaving sections
    if (line.trim() === '</g>' && (inTopLeftIndex || inBottomRightIndex)) {
      // Could be end of index group, but we already reset above
    }

    outputLines.push(line);
  }

  return outputLines.join('\n');
}

/**
 * Extract rank from filename
 */
function getRankFromFilename(filename) {
  const match = filename.match(/^(\d+|[AJQK])[_\-]?/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Process all SVG files in a directory
 */
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let updatedCount = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() || !file.endsWith('.svg')) {
      continue;
    }

    // Skip card backs and non-card files
    if (file.includes('back') || file.includes('background') || file.includes('card_face')) {
      continue;
    }

    const rank = getRankFromFilename(file);
    if (!rank) {
      continue;
    }

    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');

      // Check if this file has corner indices
      if (!originalContent.includes('Corner Index') && !originalContent.includes('translate(56, 60)') && !originalContent.includes(`translate(${SPEC.centerlineX},`)) {
        continue;
      }

      const updatedContent = processCard(filePath, rank);

      if (updatedContent !== originalContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        updatedCount++;
        console.log(`✓ Updated: ${path.basename(dirPath)}/${file}`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }

  return updatedCount;
}

/**
 * Main execution
 */
console.log('\n🃏 Card Index Batch Update Tool V2');
console.log('==================================\n');
console.log('Digital UI Optimized Specification:');
console.log(`  • Rank baseline: ${(SPEC.rankHeightPx * SPEC.rankBaselineRatio).toFixed(2)}px`);
console.log(`  • Suit pip Y: ${(SPEC.rankHeightPx + SPEC.gap).toFixed(2)}px`);
console.log(`  • Centerline X: ${SPEC.centerlineX}px\n`);

let totalUpdated = 0;

const deckDirs = fs.readdirSync(DECKS_DIR);
for (const deckName of deckDirs) {
  const deckPath = path.join(DECKS_DIR, deckName);
  const stat = fs.statSync(deckPath);

  if (!stat.isDirectory()) {
    continue;
  }

  console.log(`\nProcessing: ${deckName}`);
  const count = processDirectory(deckPath);
  totalUpdated += count;

  if (count === 0) {
    console.log('  (no updates needed)');
  }
}

console.log('\n' + '='.repeat(50));
console.log(`✅ Total cards updated: ${totalUpdated}\n`);
