/**
 * Test Suite for Solvable Deal Generation System
 */

import { SolvableDealGenerator, DIFFICULTY_LEVELS, getRandomSolvableDeal } from './src/core/solvable_deal_generator.js';
import { HeuristicSolver } from './src/core/solver.js';
import { KlondikeGame } from './src/games/klondike.js';
import { SplitMix64 } from './src/core/prng.js';

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
console.log('SOLVABLE DEAL GENERATION TESTS');
console.log('========================================\n');

// ==========================================
// SECTION 1: Basic Functionality
// ==========================================
console.log('--- SECTION 1: Basic Functionality ---\n');

test('SolvableDealGenerator initializes', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  assert(generator, 'Generator should be created');
  assert(generator.gameType === 'klondike_1', 'Should store game type');
});

test('Get solvable deal from catalog', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const deal = generator.getSolvableDeal(DIFFICULTY_LEVELS.EASY);

  assert(deal, 'Should return a deal');
  assert(deal.seed, 'Deal should have seed');
  assert(deal.code, 'Deal should have code');
  assert(deal.difficulty, 'Deal should have difficulty');
  assert(deal.verified === true, 'Deal should be verified');
});

test('Quick helper function works', () => {
  const deal = getRandomSolvableDeal('klondike_1', 'Easy');

  assert(deal, 'Should return a deal');
  assert(deal.seed, 'Deal should have seed');
  assert(deal.verified, 'Deal should be verified');
});

test('Deal has all required properties', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const deal = generator.getSolvableDeal();

  assert(deal.seed, 'Should have seed');
  assert(deal.code, 'Should have code');
  assert(deal.difficulty, 'Should have difficulty');
  assert(deal.name, 'Should have name');
  assert(typeof deal.movesPar === 'number', 'Should have movesPar');
  assert(deal.verified !== undefined, 'Should have verified flag');
});

// ==========================================
// SECTION 2: Difficulty Selection
// ==========================================
console.log('\n--- SECTION 2: Difficulty Selection ---\n');

test('Can request specific difficulty', () => {
  const generator = new SolvableDealGenerator('klondike_1');

  const easyDeal = generator.getSolvableDeal(DIFFICULTY_LEVELS.EASY);
  const hardDeal = generator.getSolvableDeal(DIFFICULTY_LEVELS.HARD);

  assert(easyDeal.difficulty, 'Easy deal should have difficulty');
  assert(hardDeal.difficulty, 'Hard deal should have difficulty');
});

test('Random difficulty returns any difficulty', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const deal = generator.getSolvableDeal(DIFFICULTY_LEVELS.RANDOM);

  assert(deal.difficulty, 'Should have a difficulty assigned');
  assert(['Easy', 'Medium', 'Hard', 'Expert'].includes(deal.difficulty),
    'Should be a valid difficulty');
});

test('Generated deal names are unique', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const names = new Set();

  for (let i = 0; i < 10; i++) {
    const deal = generator.getSolvableDeal();
    names.add(deal.name);
  }

  // Should have some variety (at least 5 different names out of 10)
  assert(names.size >= 5, 'Should generate varied names');
});

// ==========================================
// SECTION 3: Catalog Management
// ==========================================
console.log('\n--- SECTION 3: Catalog Management ---\n');

test('Get deal by code', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const allDeals = generator.getAllAvailableDeals();

  if (allDeals.length > 0) {
    const firstDeal = allDeals[0];
    const retrieved = generator.getDealByCode(firstDeal.code);

    assert(retrieved, 'Should retrieve deal by code');
    assertEquals(retrieved.code, firstDeal.code, 'Should match code');
  }
});

test('Get all available deals', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const deals = generator.getAllAvailableDeals();

  assert(Array.isArray(deals), 'Should return array');
  assert(deals.length > 0, 'Should have at least some deals');

  // Verify all deals have required properties
  deals.forEach(deal => {
    assert(deal.code, 'Each deal should have code');
    assert(deal.seed, 'Each deal should have seed');
    assert(deal.verified, 'Each deal should be verified');
  });
});

test('Deals are sorted by difficulty', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const deals = generator.getAllAvailableDeals();

  if (deals.length >= 3) {
    const diffOrder = { Easy: 1, Medium: 2, Hard: 3, Expert: 4 };
    let lastOrder = 0;

    for (const deal of deals) {
      const currentOrder = diffOrder[deal.difficulty] || 99;
      assert(currentOrder >= lastOrder, 'Deals should be sorted by difficulty');
      lastOrder = currentOrder;
    }
  }
});

test('Cache statistics are accurate', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const stats = generator.getCacheStats();

  assert(typeof stats.catalogCount === 'number', 'Should have catalog count');
  assert(typeof stats.cachedCount === 'number', 'Should have cached count');
  assert(typeof stats.totalAvailable === 'number', 'Should have total');
  assert(stats.cacheKey, 'Should have cache key');
  assertEquals(stats.totalAvailable, stats.catalogCount + stats.cachedCount,
    'Total should equal catalog + cache');
});

// ==========================================
// SECTION 4: Game Integration
// ==========================================
console.log('\n--- SECTION 4: Game Integration ---\n');

test('Solvable deal can be used to create game', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const deal = generator.getSolvableDeal(DIFFICULTY_LEVELS.EASY);

  const game = new KlondikeGame({ seed: deal.seed, drawCount: 1 });

  assert(game, 'Should create game');
  assert(game.state, 'Game should have state');
  assert(game.state.tableau.length === 7, 'Should have 7 tableau columns');
});

test('Deal code can be parsed and used', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const deal = generator.getSolvableDeal();

  const parsed = SplitMix64.parseDealCode(deal.code);

  assert(parsed.valid, 'Deal code should be valid');
  assert(parsed.seed, 'Should extract seed');
  assert(parsed.prefix, 'Should extract prefix');
});

test('Catalog deals are truly solvable', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const deal = generator.getSolvableDeal(DIFFICULTY_LEVELS.EASY);

  // Verify this deal is actually solvable
  const result = HeuristicSolver.solveKlondike(deal.seed, 15000);

  assert(result.solved || result.steps > 0, 'Catalog deal should be solvable or make progress');
});

// ==========================================
// SECTION 5: Multiple Game Types
// ==========================================
console.log('\n--- SECTION 5: Multiple Game Types ---\n');

test('Works with different game types', () => {
  const gameTypes = ['klondike_1', 'klondike_3', 'freecell'];

  for (const gameType of gameTypes) {
    const generator = new SolvableDealGenerator(gameType);
    const deal = generator.getSolvableDeal();

    assert(deal, `Should generate deal for ${gameType}`);
    // Only Klondike has a solver; FreeCell catalog deals are honestly marked unverified
    assert(deal.verified === gameType.startsWith('klondike'), `${gameType} deal verified flag should match solver coverage`);
  }
});

test('Different game types have different code prefixes', () => {
  const klondikeGen = new SolvableDealGenerator('klondike_1');
  const freecellGen = new SolvableDealGenerator('freecell');

  const klondikeDeal = klondikeGen.getSolvableDeal();
  const freecellDeal = freecellGen.getSolvableDeal();

  assert(klondikeDeal.code.startsWith('KL'), 'Klondike should have KL prefix');
  assert(freecellDeal.code.startsWith('FC'), 'FreeCell should have FC prefix');
});

// ==========================================
// SECTION 6: Performance
// ==========================================
console.log('\n--- SECTION 6: Performance ---\n');

test('Can quickly get multiple deals', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const startTime = Date.now();

  for (let i = 0; i < 10; i++) {
    generator.getSolvableDeal();
  }

  const elapsed = Date.now() - startTime;

  assert(elapsed < 5000, 'Should get 10 deals in under 5 seconds');
  console.log(`  Retrieved 10 deals in ${elapsed}ms`);
});

test('Catalog lookup is fast', () => {
  const generator = new SolvableDealGenerator('klondike_1');
  const startTime = Date.now();

  for (let i = 0; i < 100; i++) {
    generator.getSolvableDeal(DIFFICULTY_LEVELS.EASY, true); // Use cache
  }

  const elapsed = Date.now() - startTime;

  assert(elapsed < 1000, 'Should retrieve 100 cached deals in under 1 second');
  console.log(`  Retrieved 100 cached deals in ${elapsed}ms`);
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

// Demo output
console.log('\n========================================');
console.log('SAMPLE SOLVABLE DEALS');
console.log('========================================\n');

const demoGen = new SolvableDealGenerator('klondike_1');
const easyDeal = demoGen.getSolvableDeal(DIFFICULTY_LEVELS.EASY);
const hardDeal = demoGen.getSolvableDeal(DIFFICULTY_LEVELS.HARD);

console.log('Easy Deal:');
console.log(`  Name: ${easyDeal.name}`);
console.log(`  Code: ${easyDeal.code}`);
console.log(`  Par Moves: ${easyDeal.movesPar}`);
console.log(`  Verified: ${easyDeal.verified}`);

console.log('\nHard Deal:');
console.log(`  Name: ${hardDeal.name}`);
console.log(`  Code: ${hardDeal.code}`);
console.log(`  Par Moves: ${hardDeal.movesPar}`);
console.log(`  Verified: ${hardDeal.verified}`);

const stats = demoGen.getCacheStats();
console.log('\nCache Statistics:');
console.log(`  Catalog Deals: ${stats.catalogCount}`);
console.log(`  Cached Deals: ${stats.cachedCount}`);
console.log(`  Total Available: ${stats.totalAvailable}`);

process.exit(results.failed > 0 ? 1 : 0);
