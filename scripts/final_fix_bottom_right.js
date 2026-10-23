#!/usr/bin/env node
/**
 * Fix bottom-right indices using rank from filename
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DECKS_DIR = path.join(__dirname, '..', 'decks');

const SPEC = {
  rankHeightPx: 130.71,
  rankBaselineRatio: 0.73,
};

function getRankFromFilename(filename) {
  const match = filename.match(/^(\d+|[AJQK])[_\-]?/i);
  return match ? match[1].toUpperCase() : null;
}

function fixFile(filePath, rank) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const rankY = (SPEC.rankHeightPx * SPEC.rankBaselineRatio).toFixed(4);
  const textLengthAttr = rank === '10' ? ` textLength="92.3" lengthAdjust="spacingAndGlyphs"` : '';

  // Find and fix the bottom-right text element (inside rotate(180))
  let inRotate180 = false;
  let foundBottomRight = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('rotate(180')) {
      inRotate180 = true;
    }

    // Look for text element inside rotate(180) group
    if (inRotate180 && !foundBottomRight && lines[i].includes('<text ') && lines[i].includes(`y="${rankY}"`)) {
      // This is the bottom-right text element - fix the rank text
      lines[i] = lines[i].replace(/>[^<]*<\/text>/, `>${rank}</text>`);
      foundBottomRight = true;
      break; // Done
    }
  }

  if (!foundBottomRight) {
    return false;
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return true;
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() || !file.endsWith('.svg')) {
      continue;
    }

    if (file.includes('back') || file.includes('background') || file.includes('card_face')) {
      continue;
    }

    const rank = getRankFromFilename(file);
    if (!rank) {
      continue;
    }

    try {
      if (fixFile(filePath, rank)) {
        fixedCount++;
        console.log(`✓ Fixed: ${path.basename(dirPath)}/${file}`);
      }
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error.message);
    }
  }

  return fixedCount;
}

console.log('\n🔧 Bottom-Right Index Fix');
console.log('========================\n');

let totalFixed = 0;

const deckDirs = fs.readdirSync(DECKS_DIR);
for (const deckName of deckDirs) {
  const deckPath = path.join(DECKS_DIR, deckName);
  const stat = fs.statSync(deckPath);

  if (!stat.isDirectory()) {
    continue;
  }

  const count = processDirectory(deckPath);
  totalFixed += count;

  if (count > 0) {
    console.log(`  ${deckName}: ${count} files`);
  }
}

console.log(`\n✅ Total fixed: ${totalFixed}\n`);
