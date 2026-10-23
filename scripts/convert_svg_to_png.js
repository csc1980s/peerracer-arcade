#!/usr/bin/env node
/**
 * Convert updated SVG cards to PNG format for game use
 *
 * Note: This requires either:
 * - sharp library (npm install sharp)
 * - OR running from command line with ImageMagick/Inkscape
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DECKS_DIR = path.join(__dirname, '..', 'decks');

// Check if we have conversion tools available
function checkConversionTool() {
  try {
    // Try Inkscape first (best quality)
    execSync('inkscape --version', { stdio: 'ignore' });
    return 'inkscape';
  } catch {
    try {
      // Try ImageMagick
      execSync('magick --version', { stdio: 'ignore' });
      return 'magick';
    } catch {
      try {
        // Try convert (older ImageMagick)
        execSync('convert --version', { stdio: 'ignore' });
        return 'convert';
      } catch {
        return null;
      }
    }
  }
}

function convertSVGtoPNG(svgPath, pngPath, tool) {
  try {
    if (tool === 'inkscape') {
      execSync(`inkscape "${svgPath}" --export-filename="${pngPath}" --export-width=750 --export-height=1050`, { stdio: 'ignore' });
    } else if (tool === 'magick') {
      execSync(`magick convert -density 300 -background none "${svgPath}" -resize 750x1050 "${pngPath}"`, { stdio: 'ignore' });
    } else if (tool === 'convert') {
      execSync(`convert -density 300 -background none "${svgPath}" -resize 750x1050 "${pngPath}"`, { stdio: 'ignore' });
    }
    return true;
  } catch (error) {
    console.error(`Error converting ${path.basename(svgPath)}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath, tool) {
  const files = fs.readdirSync(dirPath);
  let convertedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.svg') || file.endsWith('.bak')) {
      continue;
    }

    // Skip if this is a background or card_face template
    if (file.includes('background') || file === 'card_face.svg') {
      continue;
    }

    const svgPath = path.join(dirPath, file);
    const pngPath = path.join(dirPath, file.replace('.svg', '.png'));

    // Check if SVG is newer than PNG
    const svgStat = fs.statSync(svgPath);
    if (fs.existsSync(pngPath)) {
      const pngStat = fs.statSync(pngPath);
      if (pngStat.mtime > svgStat.mtime) {
        continue; // PNG is already up to date
      }
    }

    if (convertSVGtoPNG(svgPath, pngPath, tool)) {
      convertedCount++;
      console.log(`✓ Converted: ${path.basename(dirPath)}/${file}`);
    }
  }

  return convertedCount;
}

console.log('\n🖼️  SVG to PNG Converter');
console.log('======================\n');

const tool = checkConversionTool();

if (!tool) {
  console.error('❌ No conversion tool found!');
  console.error('\nPlease install one of:');
  console.error('  • Inkscape: https://inkscape.org/');
  console.error('  • ImageMagick: https://imagemagick.org/');
  console.error('\nOr use an online batch converter for the SVG files.');
  process.exit(1);
}

console.log(`Using conversion tool: ${tool}\n`);

let totalConverted = 0;

const deckDirs = fs.readdirSync(DECKS_DIR);
for (const deckName of deckDirs) {
  const deckPath = path.join(DECKS_DIR, deckName);
  const stat = fs.statSync(deckPath);

  if (!stat.isDirectory()) {
    continue;
  }

  console.log(`\nProcessing: ${deckName}`);
  const count = processDirectory(deckPath, tool);
  totalConverted += count;

  if (count === 0) {
    console.log('  (already up to date)');
  }
}

console.log('\n' + '='.repeat(50));
console.log(`✅ Total files converted: ${totalConverted}\n`);
