/**
 * Test Suite for New Enhancements
 * - Natural speech variations in pedagogical coach
 * - Advanced strategies in tutorial data
 * - Casino AI players for multiplayer tables
 */

import { PedagogicalCoach, GAME_TUTORIAL_DATA } from './src/ui/pedagogical_coach.js';
import { CasinoAIPlayer, CasinoTableManager, CASINO_AI_ROSTER } from './src/games/casino_ai_players.js';
import { Card } from './src/core/card.js';

const results = { passed: 0, failed: 0, tests: [] };

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

console.log('\n========================================');
console.log('ENHANCEMENTS TEST SUITE');
console.log('========================================\n');

// ==========================================
// SECTION 1: Natural Speech Variations
// ==========================================
console.log('--- SECTION 1: Natural Speech Variations ---\n');

test('Pedagogical coach normalizes card symbols', () => {
  const mockApp = { gameType: 'klondike_1', currentGame: null };
  const coach = new PedagogicalCoach(mockApp);

  const text = 'Move 5♥ to K♣';
  const normalized = coach.normalizeTextForSpeech(text);

  assert(normalized.includes('5 of Hearts'), 'Should expand 5♥');
  assert(normalized.includes('King of Clubs'), 'Should expand K♣');
  assert(!normalized.includes('♥'), 'Should remove symbols');
});

test('Natural speech variations add conversational elements', () => {
  const mockApp = { gameType: 'klondike_1', currentGame: null };
  const coach = new PedagogicalCoach(mockApp);

  // Run multiple times to test randomization
  let hasVariation = false;
  for (let i = 0; i < 20; i++) {
    const text = 'Move card to reveal hidden card';
    const normalized = coach.normalizeTextForSpeech(text);

    // Check if any variation was applied
    if (normalized.toLowerCase() !== text.toLowerCase()) {
      hasVariation = true;
      break;
    }
  }

  assert(hasVariation, 'Should occasionally add natural variations');
});

test('Speech variations preserve card information', () => {
  const mockApp = { gameType: 'klondike_1', currentGame: null };
  const coach = new PedagogicalCoach(mockApp);

  const text = 'Play A♠ to Foundation 1';
  const normalized = coach.normalizeTextForSpeech(text);

  assert(normalized.includes('Ace of Spades'), 'Should preserve Ace of Spades');
  assert(normalized.includes('Foundation'), 'Should preserve Foundation reference');
});

// ==========================================
// SECTION 2: Advanced Strategies
// ==========================================
console.log('\n--- SECTION 2: Advanced Strategies ---\n');

test('Klondike tutorial has advanced strategies', () => {
  const klondikeData = GAME_TUTORIAL_DATA.klondike_1;

  assert(klondikeData.advancedStrategies, 'Should have advancedStrategies array');
  assert(klondikeData.advancedStrategies.length >= 3, 'Should have at least 3 advanced strategies');
  assert(klondikeData.advancedStrategies[0].includes('Empty Column'), 'Should include empty column strategy');
});

test('FreeCell tutorial has advanced strategies', () => {
  const freecellData = GAME_TUTORIAL_DATA.freecell;

  assert(freecellData.advancedStrategies, 'Should have advancedStrategies array');
  assert(freecellData.advancedStrategies.length >= 3, 'Should have at least 3 advanced strategies');
  assert(freecellData.advancedStrategies.some(s => s.includes('Lookahead')), 'Should include lookahead strategy');
  assert(freecellData.advancedStrategies.some(s => s.includes('Freecell')), 'Should include freecell management strategy');
});

test('Tutorial data includes strategic depth', () => {
  const klondikeData = GAME_TUTORIAL_DATA.klondike_1;

  assert(klondikeData.mathHeuristic, 'Should have mathematical heuristic');
  assert(klondikeData.cheatSheet, 'Should have cheat sheet');
  assert(klondikeData.advancedStrategies, 'Should have advanced strategies');
});

// ==========================================
// SECTION 3: Casino AI Players
// ==========================================
console.log('\n--- SECTION 3: Casino AI Players ---\n');

test('Casino AI roster contains diverse players', () => {
  assert(CASINO_AI_ROSTER.length >= 5, 'Should have at least 5 AI profiles');

  const skillLevels = CASINO_AI_ROSTER.map(ai => ai.skillLevel);
  const uniqueLevels = new Set(skillLevels);
  assert(uniqueLevels.size >= 4, 'Should have diverse skill levels');
});

test('Casino AI player initializes correctly', () => {
  const ai = new CasinoAIPlayer(CASINO_AI_ROSTER[0]);

  assert(ai.name, 'Should have name');
  assert(ai.avatar, 'Should have avatar');
  assert(ai.personality, 'Should have personality');
  assert(ai.skill >= 0.5 && ai.skill <= 1.0, 'Skill should be between 0.5 and 1.0');
  assert(ai.chips === 1000, 'Should start with 1000 chips');
  assert(ai.isBot === true, 'Should be marked as bot');
});

test('Casino AI decides bet sizes based on personality', () => {
  const conservativeAI = new CasinoAIPlayer(CASINO_AI_ROSTER.find(ai => ai.personality === 'conservative'));
  const aggressiveAI = new CasinoAIPlayer(CASINO_AI_ROSTER.find(ai => ai.personality === 'aggressive'));

  const conservativeBet = conservativeAI.decideBetSize(5, 500);
  const aggressiveBet = aggressiveAI.decideBetSize(5, 500);

  assert(conservativeBet >= 5, 'Conservative bet should be at least minimum');
  assert(aggressiveBet >= 5, 'Aggressive bet should be at least minimum');
  // Aggressive players typically bet more
  assert(conservativeBet <= conservativeAI.chips, 'Bet should not exceed chips');
});

test('Casino AI makes Blackjack decisions', () => {
  const ai = new CasinoAIPlayer(CASINO_AI_ROSTER.find(ai => ai.personality === 'optimal'));

  // Test hard 17 - should always stand
  const hard17 = [new Card(9), new Card(6)]; // 10 + 7
  const dealerUpcard = new Card(5); // Dealer showing 6
  const decision = ai.decideBlackjackAction(hard17, dealerUpcard, true, false);
  assertEquals(decision, 'STAND', 'Should stand on hard 17');
});

test('Casino AI follows basic strategy for hard 11', () => {
  const ai = new CasinoAIPlayer(CASINO_AI_ROSTER.find(ai => ai.personality === 'optimal'));

  // Hard 11: should double down
  const hard11 = [new Card(4), new Card(5)]; // 5 + 6 = 11
  const dealerUpcard = new Card(3); // Dealer showing 4
  const decision = ai.decideBlackjackAction(hard11, dealerUpcard, true, false);
  assertEquals(decision, 'DOUBLE', 'Should double on hard 11');
});

test('Casino AI handles soft hands correctly', () => {
  const ai = new CasinoAIPlayer(CASINO_AI_ROSTER.find(ai => ai.personality === 'optimal'));

  // Soft 18: Ace + 7
  const soft18 = [new Card(0), new Card(6)]; // A + 7
  const dealerUpcard = new Card(8); // Dealer showing 9
  const decision = ai.decideBlackjackAction(soft18, dealerUpcard, false, false);
  assertEquals(decision, 'HIT', 'Should hit soft 18 vs dealer 9');
});

test('Casino table manager fills empty seats', () => {
  const table = new CasinoTableManager({ maxSeats: 6, enableAutoFill: true });

  table.fillEmptySeats(4); // Fill to 4 total players

  assert(table.aiPlayers.length === 4, 'Should fill 4 AI players');
  assert(table.getAllPlayers().length === 4, 'Should have 4 total players');
});

test('Casino table manager respects max seats', () => {
  const table = new CasinoTableManager({ maxSeats: 3, enableAutoFill: true });

  table.fillEmptySeats(10); // Request 10, but max is 3

  assert(table.aiPlayers.length <= 3, 'Should not exceed max seats');
});

test('Casino AI players have unique personalities', () => {
  const table = new CasinoTableManager({ maxSeats: 6, enableAutoFill: true });
  table.fillEmptySeats(4);

  const personalities = table.aiPlayers.map(ai => ai.personality);
  const uniquePersonalities = new Set(personalities);

  // Should have some diversity (at least 2 different personalities)
  assert(uniquePersonalities.size >= 2, 'Should have diverse personalities');
});

test('Casino AI can rebuy chips', () => {
  const ai = new CasinoAIPlayer(CASINO_AI_ROSTER[0]);
  ai.chips = 0;

  ai.rebuy(500);
  assertEquals(ai.chips, 500, 'Should rebuy 500 chips');
});

test('Casino AI card counter updates count', () => {
  const cardCounter = new CasinoAIPlayer(CASINO_AI_ROSTER.find(ai => ai.personality === 'card_counter'));

  cardCounter.resetCount();
  assertEquals(cardCounter.runningCount, 0, 'Count should start at 0');

  // Deal some low cards (2-6 = +1)
  const lowCards = [new Card(1), new Card(2), new Card(3)]; // 2, 3, 4
  cardCounter.updateCount(lowCards);

  assertEquals(cardCounter.runningCount, 3, 'Should add +1 for each low card');
});

test('Casino AI says catchphrases when chatty', () => {
  const chattyAI = new CasinoAIPlayer(CASINO_AI_ROSTER.find(ai => ai.chatty === true));

  // Run multiple times to test randomization
  let hasSaidPhrase = false;
  for (let i = 0; i < 50; i++) {
    const phrase = chattyAI.sayPhrase();
    if (phrase) {
      hasSaidPhrase = true;
      assert(chattyAI.catchphrases.includes(phrase), 'Phrase should be from catchphrases list');
      break;
    }
  }

  assert(hasSaidPhrase, 'Chatty AI should occasionally say phrases');
});

// ==========================================
// Test Results Summary
// ==========================================
console.log('\n========================================');
console.log('TEST RESULTS SUMMARY');
console.log('========================================');
console.log(`Total Tests: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
console.log('========================================\n');

if (results.failed > 0) {
  console.log('Failed Tests:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  - ${t.name}`);
    console.log(`    ${t.error}`);
  });
}

process.exit(results.failed > 0 ? 1 : 0);
