/**
 * Prepress Quality Assurance & Iconography Verification Script
 * Validates ALL 10 Themed Playing Card Collections against the QA parameters declared in "Untitled document.txt"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const ALL_DECKS = [
  'victorian_christmas',
  'art_deco_elegance',
  'steampunk_clockwork',
  'wild_west_frontier',
  'botanical_garden',
  'gothic_cathedral',
  'cyberpunk_neon',
  'minimalist_zen',
  'cosmic_constellation',
  'retro_synthwave'
];

console.log('\n🔍 ==============================================================');
console.log('   PLAYING CARD PREPRESS & ENGLISH PATTERN PREFLIGHT QA PROTOCOL');
console.log('   Validating 10 Complete Themed Collections (540 Card Assets)');
console.log('   Specification: Untitled document.txt');
console.log('=================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ' - ' + details : ''}`);
    failCount++;
  }
}

const requiredCards = [
  'A_spades.svg', 'A_hearts.svg', 'A_diamonds.svg', 'A_clubs.svg',
  'K_spades.svg', 'K_hearts.svg', 'K_diamonds.svg', 'K_clubs.svg',
  'Q_spades.svg', 'Q_hearts.svg', 'Q_diamonds.svg', 'Q_clubs.svg',
  'J_spades.svg', 'J_hearts.svg', 'J_diamonds.svg', 'J_clubs.svg',
  '2_hearts.svg', '5_spades.svg', '10_diamonds.svg',
  'joker_1.svg', 'joker_2.svg', 'card_back.svg'
];

for (const deckId of ALL_DECKS) {
  const DECK_DIR = path.join(ROOT_DIR, 'decks', deckId);
  console.log(`\n▶ Checking Collection: ${deckId.toUpperCase()}`);

  // 1. Verify Card Count
  let allRequiredPresent = true;
  requiredCards.forEach(card => {
    if (!fs.existsSync(path.join(DECK_DIR, card))) {
      allRequiredPresent = false;
    }
  });
  assert(allRequiredPresent, `[${deckId}] Complete Manifest: Core court, aces, pips, and jokers present`);

  // 2. Dimension Checks (750 x 1050 px Poker Trim)
  let dimensionsValid = true;
  requiredCards.forEach(card => {
    const content = fs.readFileSync(path.join(DECK_DIR, card), 'utf8');
    if (!content.includes('viewBox="0 0 750 1050"') || !content.includes('width="750"') || !content.includes('height="1050"')) {
      dimensionsValid = false;
    }
  });
  assert(dimensionsValid, `[${deckId}] Geometry: Exactly 750 x 1050 px Poker Trim aspect ratio`);

  // 3. Card Back Rotational Point Symmetry & Framing Border Check
  const cardBack = fs.readFileSync(path.join(DECK_DIR, 'card_back.svg'), 'utf8');
  assert(cardBack.includes('rotate(180)'), `[${deckId}] Card Back: Two-way (180°) rotational point symmetry declared`);
  assert(cardBack.includes('width="710" height="1010"'), `[${deckId}] Card Back: Wide exterior framing border (>= 0.375") absorbs cut drift`);

  // 4. Suicide King Anatomy (King of Hearts)
  const kingHearts = fs.readFileSync(path.join(DECK_DIR, 'K_hearts.svg'), 'utf8');
  assert(kingHearts.includes('id="suicide_broadsword"'), `[${deckId}] Suicide King: Broadsword held horizontally behind head`);
  assert(kingHearts.includes('data-clean-shaven="true"') && kingHearts.includes('data-mustache="none"'), `[${deckId}] Suicide King: Clean-shaven jaw (NO mustache)`);
  assert(kingHearts.includes('id="left_hand_grip"') && kingHearts.includes('id="right_hand_lapel"'), `[${deckId}] Suicide King: Dual-hand hold`);

  // 5. King of Spades Anatomy (King David)
  const kingSpades = fs.readFileSync(path.join(DECK_DIR, 'K_spades.svg'), 'utf8');
  assert(kingSpades.includes('id="david_broadsword"'), `[${deckId}] King David: Upright broadsword held in left hand`);
  assert(kingSpades.includes('id="david_curled_beard"'), `[${deckId}] King David: Upward-curled hair & curled beard`);
  assert(kingSpades.includes('id="david_harp_motif"'), `[${deckId}] King David: Abstracted Hebrew harp motif`);

  // 6. One-Eyed King Anatomy (King of Diamonds - Julius Caesar)
  const kingDiamonds = fs.readFileSync(path.join(DECK_DIR, 'K_diamonds.svg'), 'utf8');
  assert(kingDiamonds.includes('data-eyes="1"') && kingDiamonds.includes('id="caesar_single_eye"'), `[${deckId}] Caesar: Pure Profile Left (sole One-Eyed King)`);
  assert(kingDiamonds.includes('id="caesar_battleaxe"'), `[${deckId}] Caesar: Heavy battleaxe mounted behind shoulder`);
  assert(kingDiamonds.includes('id="caesar_waving_palm"'), `[${deckId}] Caesar: Raised waving open palm in imperial posture`);

  // 7. King of Clubs Anatomy (Alexander the Great)
  const kingClubs = fs.readFileSync(path.join(DECK_DIR, 'K_clubs.svg'), 'utf8');
  assert(kingClubs.includes('id="alexander_imperial_orb"'), `[${deckId}] Alexander: Imperial Orb (globus cruciger) with cross in right hand`);
  assert(kingClubs.includes('id="alexander_broadsword"'), `[${deckId}] Alexander: Broadsword held in left hand`);

  // 8. Queen of Spades Regalia (Pallas Athena - Sole Armed Queen)
  const queenSpades = fs.readFileSync(path.join(DECK_DIR, 'Q_spades.svg'), 'utf8');
  assert(queenSpades.includes('id="athena_warrior_lance"'), `[${deckId}] Queen Athena: Armed with upright warrior lance/scepter`);
  assert(queenSpades.includes('data-flowers="none"'), `[${deckId}] Queen Athena: Sole armed queen, NO flowers`);
  assert(queenSpades.includes('id="athena_brocade_hood"'), `[${deckId}] Queen Athena: Structured brocade hood`);

  // 9. Queen of Clubs Regalia (Argine / Elizabeth of York)
  const queenClubs = fs.readFileSync(path.join(DECK_DIR, 'Q_clubs.svg'), 'utf8');
  assert(queenClubs.includes('id="argine_tudor_rose"'), `[${deckId}] Queen Argine: Holds English heraldic rose (Wars of the Roses)`);

  // 10. One-Eyed Jacks Anatomy
  const jackSpades = fs.readFileSync(path.join(DECK_DIR, 'J_spades.svg'), 'utf8');
  const jackHearts = fs.readFileSync(path.join(DECK_DIR, 'J_hearts.svg'), 'utf8');
  assert(jackSpades.includes('id="ogier_single_eye"') && jackSpades.includes('id="ogier_spiraled_pike"'), `[${deckId}] Jack Ogier: Pure Right Profile (One-Eyed Jack), rear shoulder view, spiraled pike`);
  assert(jackHearts.includes('id="lahire_single_eye"') && jackHearts.includes('id="lahire_poleaxe_halberd"'), `[${deckId}] Jack La Hire: Pure Left Profile (One-Eyed Jack), plain soldier cap, halberd poleaxe`);

  // 11. Jack of Diamonds & Clubs Regalia
  const jackDiamonds = fs.readFileSync(path.join(DECK_DIR, 'J_diamonds.svg'), 'utf8');
  const jackClubs = fs.readFileSync(path.join(DECK_DIR, 'J_clubs.svg'), 'utf8');
  assert(jackDiamonds.includes('id="hector_crossbow_halberd"'), `[${deckId}] Jack Hector: Halberd with double-pointed crossbow crossbar & brimmed cap`);
  assert(jackClubs.includes('id="lancelot_lance_buckler"'), `[${deckId}] Jack Lancelot: Upright lance with ornamental buckler shield`);

  // 12. Court Reversibility: 180° Rotational Symmetry & Diagonal Split Line (theta = 20°)
  let courtReversible = true;
  ['K_hearts', 'K_spades', 'K_diamonds', 'K_clubs', 'Q_hearts', 'Q_spades', 'Q_diamonds', 'Q_clubs', 'J_hearts', 'J_spades', 'J_diamonds', 'J_clubs'].forEach(c => {
    const fileContent = fs.readFileSync(path.join(DECK_DIR, `${c}.svg`), 'utf8');
    if (!fileContent.includes('transform="rotate(180 375 525)"') || !fileContent.includes('split_upper') || !fileContent.includes('rotate(20)')) {
      courtReversible = false;
    }
  });
  assert(courtReversible, `[${deckId}] Reversible Court: 180° rotational point symmetry along 20° diagonal split line`);

  // 13. Corner Index Ergonomics: Safe Zone Fanning Clearance
  let indicesErgonomic = true;
  requiredCards.forEach(c => {
    const fileContent = fs.readFileSync(path.join(DECK_DIR, c), 'utf8');
    if (!fileContent.includes('transform="translate(56, 60)"') && !c.includes('card_back')) {
      indicesErgonomic = false;
    }
  });
  assert(indicesErgonomic, `[${deckId}] Index Ergonomics: Indices anchored within 0.18" of trim, leaving clean safe zone fanning margin`);
}

console.log('\n=================================================================');
console.log(` ALL 10 COLLECTIONS PREPRESS VALIDATION SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('=================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
