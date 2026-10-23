/**
 * Solitaire Sovereign - Celebration & Audio System Invariant Tests
 * 
 * Verifies GameEventDetector, TriggerConditions, EventMapper, AudioManager,
 * and EffectPlayer integration invariants across integer & string card representations.
 */

import { GameEventDetector } from '../src/triggers/GameEventDetector.js';
import { TriggerConditions } from '../src/triggers/TriggerConditions.js';
import { EventMapper } from '../src/triggers/EventMapper.js';
import { AudioManager } from '../src/effects/AudioManager.js';
import { EffectPlayer } from '../src/effects/EffectPlayer.js';
import { Card } from '../src/core/card.js';
import { ModManager } from '../src/core/mod_manager.js';
import { DeckRenderer } from '../src/art/deck_renderer.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('=================================================');
console.log(' CELEBRATION & MULTI-VOICE SYSTEM INVARIANT TESTS');
console.log('=================================================\n');

// --- TEST 1: Detector Initialization ---
console.log('--- TEST 1: Detector Initialization ---');
const detector = new GameEventDetector();
assert(detector !== null, 'GameEventDetector initializes successfully');
assert(detector.moveHistory.length === 0, 'Move history starts empty');
assert(detector.foundationCards.hearts !== undefined, 'Foundation tracking initialized for hearts');
assert(detector.foundationCards.spades !== undefined, 'Foundation tracking initialized for spades');
assert(detector.foundationCards.diamonds !== undefined, 'Foundation tracking initialized for diamonds');
assert(detector.foundationCards.clubs !== undefined, 'Foundation tracking initialized for clubs');

// --- TEST 2: Face Card to Foundation Detection (String Representation) ---
console.log('\n--- TEST 2: Face Card to Foundation (String Reps) ---');
const kingMove = {
  card: { rank: 'K', suit: 'hearts', rankName: 'K', suitName: 'hearts' },
  fromPile: { type: 'tableau', index: 0 },
  toPile: { type: 'foundation', index: 2 },
  timestamp: 1000000
};
const kingEvent = detector.detectCelebration(kingMove);
assert(kingEvent !== null, 'King to foundation triggers celebration event');
assert(kingEvent.type === 'king', 'Event type is "king"');
assert(kingEvent.effectTemplate === 'king_celebration', 'Mapped template is "king_celebration"');
assert(kingEvent.audioVoice === 'king', 'Audio voice assigned is "king"');

// --- TEST 3: Cooldown Enforcement ---
console.log('\n--- TEST 3: Celebration Cooldown Enforcement ---');
const rapidMove = {
  card: { rank: 'Q', suit: 'hearts', rankName: 'Q', suitName: 'hearts' },
  fromPile: { type: 'tableau', index: 1 },
  toPile: { type: 'foundation', index: 2 },
  timestamp: 1000200 // Only 200ms later (cooldown is 1000ms)
};
const blockedEvent = detector.detectCelebration(rapidMove);
assert(blockedEvent === null, 'Rapid subsequent move blocked by cooldown (1000ms threshold)');

// --- TEST 4: Face Card Detection (Integer Representation from Canonical Card) ---
console.log('\n--- TEST 4: Face Card Detection (Integer Reps via Canonical Card) ---');
detector.lastCelebration = 0; // Clear cooldown

// Card ID 51: King of Spades (suit 3, rank 12)
const kingOfSpades = new Card(51, true);
assert(kingOfSpades.rank === 12, 'Card 51 rank is integer 12 (King)');
assert(kingOfSpades.suit === 3, 'Card 51 suit is integer 3 (Spades)');
assert(kingOfSpades.rankName === 'K', 'Card 51 rankName is "K"');
assert(kingOfSpades.suitName === 'spades', 'Card 51 suitName is "spades"');

const cardEvent = detector.detectCelebration({
  card: kingOfSpades,
  fromPile: { type: 'tableau', index: 2 },
  toPile: { type: 'foundation', index: 3 },
  timestamp: 2000000
});
assert(cardEvent !== null, 'Canonical Card King triggers celebration');
assert(cardEvent.type === 'king', 'Celebration type is "king"');
assert(cardEvent.effectTemplate === 'king_celebration', 'Template correctly resolves to "king_celebration"');
assert(cardEvent.audioVoice === 'king', 'Voice resolves to "king"');

// Card ID 24: Queen of Diamonds (suit 1, rank 11)
detector.lastCelebration = 0;
const queenOfDiamonds = new Card(24, true);
assert(queenOfDiamonds.rank === 11, 'Card 24 rank is integer 11 (Queen)');
const queenEvent = detector.detectCelebration({
  card: queenOfDiamonds,
  fromPile: { type: 'tableau', index: 3 },
  toPile: { type: 'foundation', index: 1 },
  timestamp: 3000000
});
assert(queenEvent !== null, 'Canonical Card Queen triggers celebration');
assert(queenEvent.type === 'queen', 'Celebration type is "queen"');
assert(queenEvent.effectTemplate === 'queen_celebration', 'Template resolves to "queen_celebration"');
assert(queenEvent.audioVoice === 'queen', 'Voice resolves to "queen"');

// Card ID 10: Jack of Clubs (suit 0, rank 10)
detector.lastCelebration = 0;
const jackOfClubs = new Card(10, true);
assert(jackOfClubs.rank === 10, 'Card 10 rank is integer 10 (Jack)');
const jackEvent = detector.detectCelebration({
  card: jackOfClubs,
  fromPile: { type: 'tableau', index: 4 },
  toPile: { type: 'foundation', index: 0 },
  timestamp: 4000000
});
assert(jackEvent !== null, 'Canonical Card Jack triggers celebration');
assert(jackEvent.type === 'jack', 'Celebration type is "jack"');
assert(jackEvent.effectTemplate === 'jack_celebration', 'Template resolves to "jack_celebration"');
assert(jackEvent.audioVoice === 'jack', 'Voice resolves to "jack"');

// --- TEST 5: Suit Template Resolution ---
console.log('\n--- TEST 5: Suit Template Resolution ---');
const heartsCard = new Card(38, true); // King of Hearts (id 38, suit 2, rank 12)
const spadesCard = new Card(51, true); // King of Spades (id 51, suit 3, rank 12)
const diamondsCard = new Card(24, true); // Queen of Diamonds (id 24, suit 1, rank 11)
const clubsCard = new Card(10, true); // Jack of Clubs (id 10, suit 0, rank 10)

assert(detector.getEffectTemplate('suit_combo', heartsCard) === 'hearts_suit_combo', 'Hearts combo resolves to hearts_suit_combo');
assert(detector.getEffectTemplate('suit_combo', spadesCard) === 'spades_suit_combo', 'Spades combo resolves to spades_suit_combo');
assert(detector.getEffectTemplate('suit_combo', diamondsCard) === 'diamonds_suit_combo', 'Diamonds combo resolves to diamonds_suit_combo');
assert(detector.getEffectTemplate('suit_combo', clubsCard) === 'clubs_suit_combo', 'Clubs combo resolves to clubs_suit_combo');

// --- TEST 6: Victory Celebration Detection ---
console.log('\n--- TEST 6: Victory Celebration Detection ---');
detector.reset();
// Populate all foundations with 13 cards each
['hearts', 'diamonds', 'spades', 'clubs'].forEach(suit => {
  for (let i = 0; i < 13; i++) {
    detector.foundationCards[suit].push({ rank: i, suit });
  }
});

const winEvent = detector.detectCelebration({
  card: { rank: 'K', suit: 'clubs' },
  fromPile: { type: 'tableau', index: 0 },
  toPile: { type: 'foundation', index: 0 },
  timestamp: 5000000
});
assert(winEvent !== null, 'Complete foundations trigger win celebration');
assert(winEvent.type === 'win_game', 'Win event has type "win_game"');
assert(winEvent.effectTemplate === 'win_game', 'Win event uses "win_game" template');
assert(winEvent.audioVoice === 'random_celebration', 'Win event uses random celebration voice');

// --- TEST 7: EventMapper Mapping Integrity ---
console.log('\n--- TEST 7: EventMapper Mapping Integrity ---');
const mapper = new EventMapper();
assert(mapper.triggerToEffectMap['king_placed'] === 'king_celebration', 'EventMapper maps king_placed to king_celebration');
assert(mapper.triggerToEffectMap['queen_placed'] === 'queen_celebration', 'EventMapper maps queen_placed to queen_celebration');
assert(mapper.triggerToEffectMap['jack_placed'] === 'jack_celebration', 'EventMapper maps jack_placed to jack_celebration');
assert(mapper.triggerToEffectMap['hearts_suit_run'] === 'hearts_suit_combo', 'EventMapper maps hearts_suit_run to hearts_suit_combo');
assert(mapper.triggerToEffectMap['diamonds_suit_run'] === 'diamonds_suit_combo', 'EventMapper maps diamonds_suit_run to diamonds_suit_combo');
assert(mapper.triggerToEffectMap['spades_suit_run'] === 'spades_suit_combo', 'EventMapper maps spades_suit_run to spades_suit_combo');
assert(mapper.triggerToEffectMap['clubs_suit_run'] === 'clubs_suit_combo', 'EventMapper maps clubs_suit_run to clubs_suit_combo');
assert(mapper.triggerToEffectMap['game_won'] === 'win_game', 'EventMapper maps game_won to win_game');

// --- TEST 8: TriggerConditions Normalization & Priority Checks ---
console.log('\n--- TEST 8: TriggerConditions Normalization & Priority Checks ---');
assert(TriggerConditions._normalizeSuit(0) === 'clubs', 'Suit index 0 normalizes to "clubs"');
assert(TriggerConditions._normalizeSuit(1) === 'diamonds', 'Suit index 1 normalizes to "diamonds"');
assert(TriggerConditions._normalizeSuit(2) === 'hearts', 'Suit index 2 normalizes to "hearts"');
assert(TriggerConditions._normalizeSuit(3) === 'spades', 'Suit index 3 normalizes to "spades"');
assert(TriggerConditions._normalizeRank(12) === 'K', 'Rank index 12 normalizes to "K"');
assert(TriggerConditions._normalizeRank(11) === 'Q', 'Rank index 11 normalizes to "Q"');
assert(TriggerConditions._normalizeRank(10) === 'J', 'Rank index 10 normalizes to "J"');
assert(TriggerConditions._normalizeRank(0) === 'A', 'Rank index 0 normalizes to "A"');

const kingCondition = TriggerConditions.faceCards.king_placed;
assert(kingCondition.check({
  card: new Card(51, true), // King of Spades
  toPile: { type: 'foundation' }
}, {}), 'TriggerConditions recognizes Canonical Card King placed on foundation');

const queenCondition = TriggerConditions.faceCards.queen_placed;
assert(queenCondition.check({
  card: new Card(24, true), // Queen of Diamonds
  toPile: { type: 'foundation' }
}, {}), 'TriggerConditions recognizes Canonical Card Queen placed on foundation');

const jackCondition = TriggerConditions.faceCards.jack_placed;
assert(jackCondition.check({
  card: new Card(10, true), // Jack of Clubs
  toPile: { type: 'foundation' }
}, {}), 'TriggerConditions recognizes Canonical Card Jack placed on foundation');

// --- TEST 9: AudioManager Voice Type Resolution ---
console.log('\n--- TEST 9: AudioManager Voice Type Resolution ---');
const audioMgr = new AudioManager({ masterVolume: 0.8, audioEnabled: true, maxSimultaneous: 2 });
assert(audioMgr.masterVolume === 0.8, 'AudioManager initializes master volume');
assert(audioMgr.audioEnabled === true, 'AudioManager initializes audio enabled');
assert(audioMgr.maxSimultaneous === 2, 'AudioManager sets max simultaneous sounds');

// Explicit voice types
assert(audioMgr.resolveVoiceType('king', null) === 'king', 'Explicit king voice preserved');
assert(audioMgr.resolveVoiceType('queen', null) === 'queen', 'Explicit queen voice preserved');
assert(audioMgr.resolveVoiceType('jack', null) === 'jack', 'Explicit jack voice preserved');

// Suit based resolution
assert(audioMgr.resolveVoiceType('suit_based', new Card(51, true)) === 'king', 'King card resolves to king voice under suit_based');
assert(audioMgr.resolveVoiceType('suit_based', new Card(24, true)) === 'queen', 'Queen card resolves to queen voice under suit_based');
assert(audioMgr.resolveVoiceType('suit_based', new Card(10, true)) === 'jack', 'Jack card resolves to jack voice under suit_based');

// Random celebration resolution
const randomVoice = audioMgr.resolveVoiceType('random_celebration', null);
assert(['king', 'queen', 'jack'].includes(randomVoice), `Random celebration resolves to royal voice: ${randomVoice}`);

// --- TEST 10: EffectPlayer Configuration & Intensity ---
console.log('\n--- TEST 10: EffectPlayer Configuration & Intensity ---');
const player = new EffectPlayer({
  particlesEnabled: true,
  maxConcurrentEffects: 3,
  performanceMode: 'auto',
  intensity: 'medium'
});
assert(player.particlesEnabled === true, 'EffectPlayer initializes particles enabled');
assert(player.maxConcurrentEffects === 3, 'EffectPlayer sets max concurrent effects to 3');
assert(player.performanceMode === 'auto', 'EffectPlayer auto performance mode');
assert(player.intensity === 'medium', 'EffectPlayer default intensity is "medium"');

player.setIntensity('high');
assert(player.intensity === 'high', 'EffectPlayer switches intensity to "high"');
player.setIntensity('low');
assert(player.intensity === 'low', 'EffectPlayer switches intensity to "low"');

player.setEnabled(false);
assert(player.celebrationsEnabled === false, 'EffectPlayer can be disabled');
player.setEnabled(true);
assert(player.celebrationsEnabled === true, 'EffectPlayer can be re-enabled');

// Test particle sprite creation
const emitterConfig = {
  shape: 'heart',
  count: 10,
  colors: ['#a6192e'],
  velocity: { x: { min: -10, max: 10 }, y: { min: -10, max: 10 } }
};
const heartParticle = player.createParticle(emitterConfig, { x: 100, y: 100 }, 0);
assert(heartParticle.spritePath !== null, 'Heart shape maps to a themed SVG sprite asset');
assert(heartParticle.spritePath.includes('assets/particles/hearts/'), 'Heart sprite path points to assets/particles/hearts/');

// --- TEST 11: AudioManager Voice Toggling & Volume Controls ---
console.log('\n--- TEST 11: AudioManager Voice Toggling & Volume Controls ---');
audioMgr.setVolume(0.5);
assert(audioMgr.masterVolume === 0.5, 'Volume slider updates masterVolume to 0.5');

audioMgr.setVoiceEnabled('king', false);
assert(audioMgr.enabledVoices.king === false, 'King voice disabled successfully');
assert(audioMgr.resolveVoiceType('king', null) === null, 'Disabled king voice returns null');

audioMgr.setVoiceEnabled('king', true);
assert(audioMgr.enabledVoices.king === true, 'King voice re-enabled successfully');
assert(audioMgr.resolveVoiceType('king', null) === 'king', 'Re-enabled king voice returns "king"');

assert(typeof audioMgr.applyVoiceEffects === 'function', 'applyVoiceEffects Web Audio BiquadFilter method exists');

// --- TEST 12: Living Court Cards (Hearthstone Golden Loops) Invariants ---
console.log('\n--- TEST 12: Living Court Cards (Hearthstone Golden Loops) Invariants ---');
const modMgr = new ModManager();
DeckRenderer.setModManager(modMgr);

assert(modMgr.livingCardsEnabled === true, 'ModManager initializes with Living Cards enabled by default');
modMgr.setLivingCardsEnabled(false);
assert(modMgr.livingCardsEnabled === false, 'ModManager.setLivingCardsEnabled(false) disables living cards');
modMgr.setLivingCardsEnabled(true);
assert(modMgr.livingCardsEnabled === true, 'ModManager.setLivingCardsEnabled(true) re-enables living cards');

assert(modMgr.hasLivingCard('victorian_christmas', 'K', 'hearts') === true, 'Victorian Christmas King has living card');
assert(modMgr.hasLivingCard('victorian_christmas', 'Q', 'diamonds') === true, 'Victorian Christmas Queen has living card');
assert(modMgr.hasLivingCard('victorian_christmas', 'J', 'spades') === true, 'Victorian Christmas Jack has living card');
assert(modMgr.hasLivingCard('victorian_christmas', 'A', 'spades') === false, 'Ace correctly excluded from court living card set');
assert(modMgr.hasLivingCard('victorian_christmas', '6', 'hearts') === false, 'Card 6 correctly excluded from court living card set');

// Test with Victorian Christmas active theme
modMgr.activeDeckTheme = 'victorian_christmas';

const khCard = new Card(2 * 13 + 12); // King of Hearts (rank 12, suit 2)
const qdCard = new Card(1 * 13 + 11); // Queen of Diamonds (rank 11, suit 1)
const jsCard = new Card(3 * 13 + 10); // Jack of Spades (rank 10, suit 3)
const jcCard = new Card(0 * 13 + 10); // Jack of Clubs (rank 10, suit 0)
const asCard = new Card(3 * 13 + 0);  // Ace of Spades (rank 0, suit 3)
const h6Card = new Card(2 * 13 + 5);  // 6 of Hearts (rank 5, suit 2)

const khUrl = modMgr.getCustomCardFace(khCard);
assert(khUrl && khUrl.includes('/decks/victorian_christmas/animated/K_hearts.webp'), `King of Hearts resolves to animated WebP: ${khUrl}`);

const qdUrl = modMgr.getCustomCardFace(qdCard);
assert(qdUrl && qdUrl.includes('/decks/victorian_christmas/animated/Q_diamonds.webp'), `Queen of Diamonds resolves to animated WebP: ${qdUrl}`);

const jsUrl = modMgr.getCustomCardFace(jsCard);
assert(jsUrl && jsUrl.includes('/decks/victorian_christmas/animated/J_spades.webp'), `Jack of Spades resolves to animated WebP: ${jsUrl}`);

const jcUrl = modMgr.getCustomCardFace(jcCard);
assert(jcUrl && jcUrl.includes('/decks/victorian_christmas/animated/J_clubs.webp'), `Jack of Clubs resolves to animated WebP: ${jcUrl}`);

const asUrl = modMgr.getCustomCardFace(asCard);
assert(asUrl && asUrl.includes('/decks/victorian_christmas/A_spades.png'), `Ace of Spades resolves to crisp static PNG: ${asUrl}`);

const h6Url = modMgr.getCustomCardFace(h6Card);
assert(h6Url && h6Url.includes('/decks/victorian_christmas/6_hearts.png'), `6 of Hearts resolves to crisp static PNG: ${h6Url}`);

// Fallback to static when Living Cards toggled off
modMgr.setLivingCardsEnabled(false);
const khStaticUrl = modMgr.getCustomCardFace(khCard);
assert(khStaticUrl && khStaticUrl.includes('/decks/victorian_christmas/K_hearts.png'), `With Living Cards disabled, King resolves to static PNG: ${khStaticUrl}`);
modMgr.setLivingCardsEnabled(true);

// DeckRenderer living card markup verification
const renderedKing = DeckRenderer.renderCardFaceSVG(khCard);
assert(renderedKing.includes('class="solitaire-card-face-svg custom-mod-card-face living-court-card"'), 'DeckRenderer renders living-court-card class for active living card');
assert(renderedKing.includes('data-living-card="true"'), 'DeckRenderer adds data-living-card="true" attribute');

const renderedAce = DeckRenderer.renderCardFaceSVG(asCard);
assert(!renderedAce.includes('living-court-card'), 'DeckRenderer does NOT add living-court-card class to Ace');

// On-disk asset verification for all 12 living court cards
const animDir = path.resolve('decks/victorian_christmas/animated');
const courtSuits = ['hearts', 'diamonds', 'spades', 'clubs'];
const courtRanks = ['K', 'Q', 'J'];
let allAssetsValid = true;

for (const rank of courtRanks) {
  for (const suit of courtSuits) {
    const fn = path.join(animDir, `${rank}_${suit}.webp`);
    if (!fs.existsSync(fn)) {
      allAssetsValid = false;
      console.error(`Missing living card asset: ${fn}`);
    } else {
      const stats = fs.statSync(fn);
      if (stats.size < 50 * 1024 || stats.size > 1500 * 1024) {
        allAssetsValid = false;
        console.error(`Invalid file size for ${fn}: ${stats.size} bytes`);
      }
    }
  }
}
assert(allAssetsValid, 'All 12 Victorian Christmas animated WebP court cards exist on disk with valid file sizes (200-500KB)');

console.log('\n=================================================');
console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('=================================================');

if (failed > 0) {
  process.exit(1);
}
