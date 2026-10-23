#!/usr/bin/env node
/**
 * Batch Update All Card Indices to Digital UI Optimized Specification
 *
 * Updates corner rank/suit positioning across all pre-generated deck SVG files
 * to match the Digital UI Optimized layout specification.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DECKS_DIR = path.join(__dirname, '..', 'decks');

// Digital UI Optimized spec for 750×1050px (2.143x scale from 350×490)
const SPEC = {
  topMargin: 42.86,
  leftMargin: 38.57,
  rankHeight: 130.71,
  suitPipHeight: 83.57,
  gap: 12.86,
  indexWidth: 120,
  centerlineX: 98.57, // X position for text-anchor="middle"
};

/**
 * Update corner index positioning in an SVG file
 */
function updateCardIndex(svgContent, rank) {
  // Calculate suit pip Y position (rank baseline + gap)
  const suitY = SPEC.rankHeight + SPEC.gap;

  // For "10" rank, add textLength attribute for condensed typography
  const textLengthAttr = rank === '10' ? ' textLength="92.3" lengthAdjust="spacingAndGlyphs"' : '';

  // Pattern 1: Update top-left corner index (translate group position)
  svgContent = svgContent.replace(
    /<g transform="translate\([^,]+,\s*[^)]+\)">[\s\S]*?<text x="[^"]*" y="[^"]*"[^>]*?>[^<]*/,
    (match) => {
      return match.replace(
        /translate\([^,]+,\s*[^)]+\)/,
        `translate(${SPEC.centerlineX}, ${SPEC.topMargin})`
      ).replace(
        /<text x="[^"]*" y="[^"]*"([^>]*?)>([^<]*)/,
        (textMatch, attrs, content) => {
          // Remove any existing text-anchor or textLength attributes
          attrs = attrs.replace(/\s*text-anchor="[^"]*"/g, '');
          attrs = attrs.replace(/\s*textLength="[^"]*"/g, '');
          attrs = attrs.replace(/\s*lengthAdjust="[^"]*"/g, '');

          return `<text x="0" y="${SPEC.rankHeight * 0.73}"${attrs} text-anchor="middle"${textLengthAttr}>${content}`;
        }
      );
    }
  );

  // Pattern 2: Update suit pip position within the same group
  svgContent = svgContent.replace(
    /(<g transform="translate\([^)]+\)">[\s\S]*?<text[^>]*>.*?<\/text>\s*<g transform="translate\()[^,]+,\s*[^)]+(\)\s*scale\()[^)]+\)/g,
    (match) => {
      const scaleValue = (SPEC.suitPipHeight / 100).toFixed(4); // Suit path is in 100x100 viewBox
      return match.replace(
        /translate\([^,]+,\s*[^)]+\)\s*scale\([^)]+\)/,
        `translate(0, ${suitY}) scale(${scaleValue})`
      );
    }
  );

  // Pattern 3: Update bottom-right rotated index (inside rotate(180) transform)
  // Find the rotate(180) group and update its nested translate and text attributes
  svgContent = svgContent.replace(
    /(<g transform="rotate\(180[^)]*\)">[\s\S]*?<g transform="translate\()[^,]+,\s*[^)]+(\)">[\s\S]*?<text x="[^"]*" y="[^"]*")([^>]*?>)/g,
    (match, p1, p2, attrs, closingBracket) => {
      // Update x and y attributes
      let updatedAttrs = ` x="0" y="${SPEC.rankHeight * 0.73}"`;

      // Remove any existing text-anchor or textLength attributes from the remaining attributes
      attrs = attrs.replace(/\s*text-anchor="[^"]*"/g, '');
      attrs = attrs.replace(/\s*textLength="[^"]*"/g, '');
      attrs = attrs.replace(/\s*lengthAdjust="[^"]*"/g, '');

      // Combine updated x/y with remaining attributes and add text-anchor + textLength
      const finalAttrs = `${updatedAttrs}${attrs} text-anchor="middle"${textLengthAttr}`;

      return `${p1}${SPEC.centerlineX}, ${SPEC.topMargin}${p2}<text${finalAttrs}${closingBracket}`;
    }
  );

  // Update bottom-right suit pip
  svgContent = svgContent.replace(
    /(<g transform="rotate\(180[^)]*\)">[\s\S]*?<g transform="translate\()[^,]+,\s*[^)]+(\)\s*scale\()[^)]+(\)">)/g,
    (match) => {
      const scaleValue = (SPEC.suitPipHeight / 100).toFixed(4);
      return match.replace(
        /translate\([^,]+,\s*[^)]+\)\s*scale\([^)]+\)/,
        `translate(0, ${suitY}) scale(${scaleValue})`
      );
    }
  );

  return svgContent;
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

    if (stat.isDirectory()) {
      continue; // Skip subdirectories in this version
    }

    if (!file.endsWith('.svg')) {
      continue; // Only process SVG files
    }

    // Skip card backs and non-card files
    if (file.includes('back') || file.includes('background') || file.includes('card_face')) {
      continue;
    }

    const rank = getRankFromFilename(file);
    if (!rank) {
      console.log(`⚠️  Skipping ${file} - couldn't determine rank`);
      continue;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // Check if this file has corner indices to update
      if (!content.includes('Corner Index') && !content.includes('translate(56, 60)')) {
        continue;
      }

      const updatedContent = updateCardIndex(content, rank);

      if (updatedContent !== content) {
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
console.log('\n🃏 Card Index Batch Update Tool');
console.log('================================\n');
console.log('Digital UI Optimized Specification (750×1050px):');
console.log(`  • Rank height: ${SPEC.rankHeight.toFixed(2)}px (12.45%)`);
console.log(`  • Suit pip: ${SPEC.suitPipHeight.toFixed(2)}px (7.96%)`);
console.log(`  • Centerline X: ${SPEC.centerlineX.toFixed(2)}px`);
console.log(`  • Top margin: ${SPEC.topMargin.toFixed(2)}px\n`);

let totalUpdated = 0;

// Process each deck directory
const deckDirs = fs.readdirSync(DECKS_DIR);
for (const deckName of deckDirs) {
  const deckPath = path.join(DECKS_DIR, deckName);
  const stat = fs.statSync(deckPath);

  if (!stat.isDirectory()) {
    continue;
  }

  console.log(`\nProcessing deck: ${deckName}`);
  console.log('─'.repeat(50));

  const count = processDirectory(deckPath);
  totalUpdated += count;

  if (count === 0) {
    console.log('  No cards updated (may use different format)');
  }
}

console.log('\n' + '='.repeat(50));
console.log(`✅ Total cards updated: ${totalUpdated}`);
console.log('\nAll card indices now follow Digital UI Optimized specification!\n');
