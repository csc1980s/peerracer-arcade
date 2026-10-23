#!/usr/bin/env node
/**
 * PhotoCraft Texture Workflow
 * Applies professional textures and effects to playing card SVGs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Paths
const PHOTOCRAFT = 'D:/getartcraft/photocraft/photocraft-0.9.0-windows-x64-portable/photocraft-cli.exe';
const CARDS_DIR = 'D:/getartcraft/artcraft_workspace/decks/victorian_christmas';
const OUTPUT_DIR = 'D:/getartcraft/artcraft_workspace/outputs/textured_cards';
const STAGING_DIR = 'D:/getartcraft/artcraft_workspace/staging';

// Ensure output exists
[OUTPUT_DIR, STAGING_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('\n🎨 PhotoCraft Texture Workflow\n');
console.log('Adding professional textures to playing cards...\n');

/**
 * Process a single card through PhotoCraft
 */
async function processCard(svgFile) {
  const cardName = path.basename(svgFile, '.svg');
  const tempPng = `${STAGING_DIR}/${cardName}_base.png`;
  const outputFile = `${OUTPUT_DIR}/${cardName}.png`;

  console.log(`\n▶ Processing: ${cardName}`);

  try {
    // Step 1: Convert SVG to PNG with proper dimensions
    console.log('  1/4 Converting SVG to PNG...');
    await execAsync(`"${PHOTOCRAFT}" convert "${svgFile}" "${tempPng}"`);

    // Step 2: Apply paper texture (noise + slight blur)
    console.log('  2/4 Applying paper texture...');
    const texturedFile = `${STAGING_DIR}/${cardName}_textured.png`;
    await execAsync(`"${PHOTOCRAFT}" run "${tempPng}" ` +
      `--cmd "filter.noise.addNoise" ` +
      `--params "{\\"amount\\":2.5,\\"distribution\\":\\"gaussian\\",\\"monochromatic\\":true}" ` +
      `--cmd "filter.blur.gaussianBlur" ` +
      `--params "{\\"radius\\":0.2}" ` +
      `--out "${texturedFile}"`
    );

    // Step 3: Add vintage aging with color adjustments
    console.log('  3/4 Adding vintage color grading...');
    const gradedFile = `${STAGING_DIR}/${cardName}_graded.pcraft`;
    await execAsync(`"${PHOTOCRAFT}" run "${texturedFile}" ` +
      `--cmd "layer.newAdjustmentLayer.curves" ` +
      `--out "${gradedFile}"`
    );

    // Step 4: Export final card
    console.log('  4/4 Exporting final card...');
    await execAsync(`"${PHOTOCRAFT}" convert "${gradedFile}" "${outputFile}" --format png`);

    console.log(`  ✓ Complete: ${outputFile}`);

    // Clean up staging files
    [tempPng, texturedFile, gradedFile].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    return true;

  } catch (error) {
    console.error(`  ✗ Error processing ${cardName}:`, error.message);
    return false;
  }
}

/**
 * Main workflow
 */
async function main() {
  const startTime = Date.now();

  // Get all SVG files from the cards directory
  const svgFiles = fs.readdirSync(CARDS_DIR)
    .filter(f => f.endsWith('.svg'))
    .map(f => path.join(CARDS_DIR, f));

  if (svgFiles.length === 0) {
    console.error('❌ No SVG files found in:', CARDS_DIR);
    process.exit(1);
  }

  console.log(`Found ${svgFiles.length} cards to process`);

  // Process first 5 cards as a test
  const testCards = svgFiles.slice(0, 5);
  let successCount = 0;

  for (const svgFile of testCards) {
    const success = await processCard(svgFile);
    if (success) successCount++;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Processed ${successCount}/${testCards.length} cards successfully`);
  console.log(`⏱️  Total time: ${elapsed}s`);
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);
}

main().catch(error => {
  console.error('\n❌ Workflow failed:', error);
  process.exit(1);
});
