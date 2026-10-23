#!/usr/bin/env node
/**
 * ArtCraft Playing Card Builder
 * Professional workflow using PhotoCraft CLI for texturing and finishing
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PHOTOCRAFT_CLI = 'D:/getartcraft/photocraft/photocraft-0.9.0-windows-x64-portable/photocraft-cli.exe';
const WORKSPACE = 'D:/getartcraft/artcraft_workspace';
const INPUT_DIR = `${WORKSPACE}/inputs`;
const OUTPUT_DIR = `${WORKSPACE}/outputs/victorian_christmas_prepress`;
const STAGING_DIR = `${WORKSPACE}/staging`;

// Ensure directories exist
[INPUT_DIR, OUTPUT_DIR, STAGING_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('\n🎴 ArtCraft Playing Card Builder - Professional Workflow\n');
console.log(`PhotoCraft: ${PHOTOCRAFT_CLI}`);
console.log(`Workspace: ${WORKSPACE}\n`);

/**
 * Execute PhotoCraft CLI command
 */
function runPhotoCraft(args) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ PhotoCraft: ${args.join(' ')}`);

    const proc = spawn(PHOTOCRAFT_CLI, args, {
      cwd: WORKSPACE,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`PhotoCraft exited with code ${code}\n${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Create a new PhotoCraft document with proper dimensions
 */
async function createMasterDocument() {
  console.log('\n═══ Step 1: Creating Master Document ═══');

  const params = JSON.stringify({
    width: 825,
    height: 1125,
    resolution: 300,
    mode: "RGB",
    depth: 8,
    fill: "white"
  });

  try {
    await runPhotoCraft([
      'run',
      '--new', params,
      '--cmd', 'file.new',
      '--out', `${STAGING_DIR}/master_card.pcraft`
    ]);

    console.log('✓ Created 825×1125px document @ 300 DPI');
    return true;
  } catch (error) {
    console.error('✗ Failed to create document:', error.message);
    return false;
  }
}

/**
 * Apply paper texture
 */
async function applyPaperTexture() {
  console.log('\n═══ Step 2: Applying Paper Texture ═══');

  try {
    // Add subtle noise for paper grain
    await runPhotoCraft([
      'run',
      `${STAGING_DIR}/master_card.pcraft`,
      '--cmd', 'filter.noise.addNoise',
      '--params', JSON.stringify({
        amount: 3.0,
        distribution: "gaussian",
        monochromatic: true
      }),
      '--out', `${STAGING_DIR}/master_card_textured.pcraft`
    ]);

    console.log('✓ Applied paper grain texture');
    return true;
  } catch (error) {
    console.error('✗ Failed to apply texture:', error.message);
    return false;
  }
}

/**
 * Add vintage color grading
 */
async function applyVintageGrading() {
  console.log('\n═══ Step 3: Applying Vintage Color Grading ═══');

  try {
    await runPhotoCraft([
      'run',
      `${STAGING_DIR}/master_card_textured.pcraft`,
      '--cmd', 'layer.newAdjustmentLayer.curves',
      '--params', JSON.stringify({
        name: "Vintage Tone"
      }),
      '--out', `${STAGING_DIR}/master_card_graded.pcraft`
    ]);

    console.log('✓ Applied vintage color curves');
    return true;
  } catch (error) {
    console.error('✗ Failed to apply grading:', error.message);
    return false;
  }
}

/**
 * Export final card
 */
async function exportFinalCard() {
  console.log('\n═══ Step 4: Exporting Final Card ═══');

  const outputFile = `${OUTPUT_DIR}/test_card_master.png`;

  try {
    await runPhotoCraft([
      'convert',
      `${STAGING_DIR}/master_card_graded.pcraft`,
      outputFile,
      '--format', 'png'
    ]);

    console.log(`✓ Exported: ${outputFile}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to export:', error.message);
    return false;
  }
}

/**
 * Main workflow
 */
async function main() {
  const startTime = Date.now();

  try {
    // Check if PhotoCraft CLI exists
    if (!fs.existsSync(PHOTOCRAFT_CLI)) {
      throw new Error(`PhotoCraft CLI not found at: ${PHOTOCRAFT_CLI}`);
    }

    console.log('Starting professional card generation workflow...\n');

    // Execute workflow steps
    await createMasterDocument();
    await applyPaperTexture();
    await applyVintageGrading();
    await exportFinalCard();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Card generation complete!');
    console.log(`⏱️  Total time: ${elapsed}s`);
    console.log(`📁 Output: ${OUTPUT_DIR}`);
    console.log('\n🎨 Next steps:');
    console.log('   1. Review the generated card in PhotoCraft GUI');
    console.log('   2. Add court card illustrations');
    console.log('   3. Apply additional textures and effects');
    console.log('   4. Generate complete 54-card deck\n');

  } catch (error) {
    console.error('\n❌ Workflow failed:', error.message);
    process.exit(1);
  }
}

main();
