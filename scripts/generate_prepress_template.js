#!/usr/bin/env node
/**
 * Professional Playing Card Generator - ArtCraft Prepress Workflow
 * Generates cards with proper bleed zones, trim lines, and safe areas
 * Specifications: 825×1125px canvas (2.75"×3.75" @ 300 DPI)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Professional Prepress Specifications (300 DPI)
const SPEC = {
  // Canvas with bleed
  CANVAS_WIDTH: 825,    // 2.75" with 0.125" bleed each side
  CANVAS_HEIGHT: 1125,  // 3.75" with 0.125" bleed each side

  // Trim line (actual card size)
  TRIM_INSET: 37.5,     // 0.125" bleed = 37.5px @ 300 DPI
  TRIM_WIDTH: 750,      // 2.5" poker size
  TRIM_HEIGHT: 1050,    // 3.5" standard height

  // Safe zone (live image area)
  SAFE_INSET: 75,       // 0.25" total (bleed + margin) = 75px
  SAFE_WIDTH: 675,      // 2.25" live area
  SAFE_HEIGHT: 975,     // 3.25" live area

  // Corner radius
  CORNER_RADIUS: 37.5,  // 0.125" = 37.5px

  // Index positioning (for fanning)
  INDEX_MARGIN: 56.25,  // 0.1875" from trim = 56.25px
  INDEX_HEIGHT: 225,    // 0.75" vertical envelope

  // Card back border (to absorb cut drift)
  BACK_BORDER: 112.5,   // 0.375" minimum = 112.5px

  DPI: 300
};

// Victorian Christmas theme colors
const colors = {
  primary: '#8B0000',      // Crimson
  secondary: '#004D00',    // Forest Green
  accent: '#FFD700',       // Gold
  background: '#F5F5DC',   // Aged Ivory
  darkBrown: '#3E2723',    // Dark brown
  holly: '#DC143C',        // Holly berry red
  snow: '#E8F4F8',         // Icy snow
  trimGuide: '#00FFFF',    // Cyan guide (non-printing)
  bleedGuide: '#FF00FF'    // Magenta guide (non-printing)
};

console.log('\n🎴 Professional Playing Card Generator - Prepress Standards\n');
console.log(`Canvas: ${SPEC.CANVAS_WIDTH}×${SPEC.CANVAS_HEIGHT}px (with bleed)`);
console.log(`Trim: ${SPEC.TRIM_WIDTH}×${SPEC.TRIM_HEIGHT}px (2.5"×3.5")`);
console.log(`Safe: ${SPEC.SAFE_WIDTH}×${SPEC.SAFE_HEIGHT}px (live area)\n`);

/**
 * Generate prepress guide layers (non-printing)
 */
function generatePrepressGuides() {
  return `
    <!-- PREPRESS GUIDES (Non-Printing Layer) -->
    <defs>
      <style>
        .guide { stroke-dasharray: 5,5; stroke-width: 1; fill: none; opacity: 0.5; }
      </style>
    </defs>

    <!-- Bleed Zone (outer edge) -->
    <rect x="0" y="0" width="${SPEC.CANVAS_WIDTH}" height="${SPEC.CANVAS_HEIGHT}"
          class="guide" stroke="${colors.bleedGuide}"/>

    <!-- Trim Line (cut boundary) -->
    <rect x="${SPEC.TRIM_INSET}" y="${SPEC.TRIM_INSET}"
          width="${SPEC.TRIM_WIDTH}" height="${SPEC.TRIM_HEIGHT}"
          class="guide" stroke="${colors.trimGuide}" rx="${SPEC.CORNER_RADIUS}"/>

    <!-- Safe Zone (live area) -->
    <rect x="${SPEC.SAFE_INSET}" y="${SPEC.SAFE_INSET}"
          width="${SPEC.SAFE_WIDTH}" height="${SPEC.SAFE_HEIGHT}"
          class="guide" stroke="#00FF00"/>

    <!-- Center crosshair -->
    <line x1="0" y1="${SPEC.CANVAS_HEIGHT/2}" x2="${SPEC.CANVAS_WIDTH}" y2="${SPEC.CANVAS_HEIGHT/2}"
          class="guide" stroke="#0000FF"/>
    <line x1="${SPEC.CANVAS_WIDTH/2}" y1="0" x2="${SPEC.CANVAS_WIDTH/2}" y2="${SPEC.CANVAS_HEIGHT}"
          class="guide" stroke="#0000FF"/>
  `;
}

/**
 * Generate background with proper bleed extension
 */
function generateBackground() {
  return `
    <!-- Background fills entire canvas including bleed -->
    <rect width="${SPEC.CANVAS_WIDTH}" height="${SPEC.CANVAS_HEIGHT}"
          fill="${colors.background}" rx="${SPEC.CORNER_RADIUS}"/>

    <!-- Damask pattern overlay -->
    <defs>
      <pattern id="damask" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M20,5 Q25,15 20,25 Q15,15 20,5 M10,20 Q15,25 20,30 Q25,25 30,20 Q25,15 20,10 Q15,15 10,20"
              fill="none" stroke="#DDD" stroke-width="0.5" opacity="0.3"/>
      </pattern>
    </defs>
    <rect width="${SPEC.CANVAS_WIDTH}" height="${SPEC.CANVAS_HEIGHT}"
          fill="url(#damask)" rx="${SPEC.CORNER_RADIUS}"/>
  `;
}

/**
 * Generate ornate border (stays within trim line)
 */
function generateOrnamentFrame() {
  const thickness = 20;
  const x = SPEC.TRIM_INSET;
  const y = SPEC.TRIM_INSET;
  const w = SPEC.TRIM_WIDTH;
  const h = SPEC.TRIM_HEIGHT;

  return `
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
      </linearGradient>
    </defs>

    <!-- Outer gold border -->
    <rect x="${x + thickness/2}" y="${y + thickness/2}"
          width="${w - thickness}" height="${h - thickness}"
          fill="none" stroke="url(#goldGradient)" stroke-width="${thickness}"
          rx="${SPEC.CORNER_RADIUS}"/>

    <!-- Inner decorative line -->
    <rect x="${x + thickness + 5}" y="${y + thickness + 5}"
          width="${w - 2*thickness - 10}" height="${h - 2*thickness - 10}"
          fill="none" stroke="${colors.darkBrown}" stroke-width="2" opacity="0.5"
          rx="${SPEC.CORNER_RADIUS - 5}"/>

    <!-- Corner ornaments (holly berries) -->
    ${[
      [x + 30, y + 30],
      [x + w - 30, y + 30],
      [x + 30, y + h - 30],
      [x + w - 30, y + h - 30]
    ].map(([cx, cy]) => `
      <circle cx="${cx}" cy="${cy}" r="12" fill="url(#goldGradient)"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="${colors.holly}"/>
    `).join('')}
  `;
}

/**
 * Generate corner index with proper safe zone positioning
 */
function generateCornerIndex(rank, suitColor, suitSymbol, position = 'top-left') {
  const margin = SPEC.INDEX_MARGIN;
  const trimInset = SPEC.TRIM_INSET;

  let x, y, anchor;
  if (position === 'top-left') {
    x = trimInset + margin;
    y = trimInset + margin + 72;
    anchor = 'middle';
  } else { // bottom-right (rotated 180°)
    x = SPEC.CANVAS_WIDTH - trimInset - margin;
    y = SPEC.CANVAS_HEIGHT - trimInset - margin - 72;
    anchor = 'middle';
  }

  return `
    <!-- ${position} index -->
    <g transform="${position === 'bottom-right' ? `rotate(180 ${SPEC.CANVAS_WIDTH/2} ${SPEC.CANVAS_HEIGHT/2})` : ''}">
      <text x="${trimInset + margin}" y="${trimInset + margin + 72}"
            font-family="Georgia, serif" font-size="72" font-weight="bold"
            fill="${suitColor}" text-anchor="middle">${rank}</text>
      <g transform="translate(${trimInset + margin}, ${trimInset + margin + 120})">
        ${suitSymbol}
      </g>
    </g>
  `;
}

/**
 * Generate test card with proper prepress layers
 */
function generateMasterTemplate() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SPEC.CANVAS_WIDTH}" height="${SPEC.CANVAS_HEIGHT}"
     viewBox="0 0 ${SPEC.CANVAS_WIDTH} ${SPEC.CANVAS_HEIGHT}"
     xmlns="http://www.w3.org/2000/svg">

  <title>Master Playing Card Template - Poker Size with Bleed</title>

  <!-- Layer 1: Background (extends to bleed) -->
  ${generateBackground()}

  <!-- Layer 2: Ornate frame (within trim line) -->
  ${generateOrnamentFrame()}

  <!-- Layer 3: Prepress guides (non-printing) -->
  ${generatePrepressGuides()}

  <!-- Annotations -->
  <text x="${SPEC.CANVAS_WIDTH/2}" y="30" text-anchor="middle"
        font-family="Arial" font-size="14" fill="#FF0000" opacity="0.7">
    ← Bleed Zone 0.125" (37.5px) → | 825×1125px @ 300 DPI | Poker Size 2.5"×3.5"
  </text>

  <text x="${SPEC.CANVAS_WIDTH/2}" y="${SPEC.CANVAS_HEIGHT - 15}" text-anchor="middle"
        font-family="Arial" font-size="12" fill="#0000FF" opacity="0.7">
    Safe Zone: 675×975px | Trim: 750×1050px | Corner Radius: 0.125"
  </text>
</svg>`;
}

// Generate output directory
const OUTPUT_DIR = 'D:/getartcraft/artcraft_workspace/inputs/card_templates';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Save master template
const masterFile = path.join(OUTPUT_DIR, 'master_poker_template.svg');
fs.writeFileSync(masterFile, generateMasterTemplate());

console.log('✓ Generated master template with prepress guides');
console.log(`📁 Output: ${masterFile}`);
console.log('\n📋 Specifications:');
console.log(`   • Canvas (with bleed): 825×1125px`);
console.log(`   • Trim line: 750×1050px (2.5"×3.5")`);
console.log(`   • Safe zone: 675×975px (2.25"×3.25")`);
console.log(`   • Corner radius: 37.5px (0.125")`);
console.log(`   • Index margins: 56.25px (0.1875" from trim)`);
console.log('\n✅ Ready for PhotoCraft import and texturing!\n');

// Export specifications for other scripts
export { SPEC, colors };
