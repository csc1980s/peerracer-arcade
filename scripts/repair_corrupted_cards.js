#!/usr/bin/env node
/**
 * Repair corrupted card SVG files from previous update
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DECKS_DIR = path.join(__dirname, '..', 'decks');

function repairFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Pattern: <text x="0" y="95.4183"<text x="0" y="95.4183" font-family="95.4183" ...>...
  // Fix: Remove the duplicated/corrupted part and restore proper structure
  const corrupted = content.match(/<text x="0" y="95.4183"<text x="0" y="95.4183"[^>]+>([^<]*?)</);

  if (!corrupted) {
    return false; // Not corrupted
  }

  // Extract the rank text (last part before closing tag)
  const rankText = corrupted[1].trim();

  // Replace the entire corrupted line with a clean placeholder
  // The v2 script will then properly update it
  let fixed = content.replace(
    /<text x="0" y="95.4183"<text x="0" y="95.4183"[^>]+>[^<]*<\/text>/g,
    `<text x="56" y="44" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="74" fill="#c2185b">${rankText}</text>`
  );

  fs.writeFileSync(filePath, fixed, 'utf8');
  return true;
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let repairedCount = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() || !file.endsWith('.svg')) {
      continue;
    }

    try {
      if (repairFile(filePath)) {
        repairedCount++;
        console.log(`✓ Repaired: ${path.basename(dirPath)}/${file}`);
      }
    } catch (error) {
      console.error(`✗ Error repairing ${file}:`, error.message);
    }
  }

  return repairedCount;
}

console.log('\n🔧 Card Repair Tool');
console.log('===================\n');

let totalRepaired = 0;

const deckDirs = fs.readdirSync(DECKS_DIR);
for (const deckName of deckDirs) {
  const deckPath = path.join(DECKS_DIR, deckName);
  const stat = fs.statSync(deckPath);

  if (!stat.isDirectory()) {
    continue;
  }

  const count = processDirectory(deckPath);
  totalRepaired += count;

  if (count > 0) {
    console.log(`  ${deckName}: ${count} files repaired`);
  }
}

console.log(`\n✅ Total files repaired: ${totalRepaired}\n`);
