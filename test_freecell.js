/**
 * FreeCell Supermove Algorithm & Rules Testing
 */

import { Card } from './src/core/card.js';
import { FreeCellGame } from './src/games/freecell.js';

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
console.log('FREECELL SUPERMOVE ALGORITHM TESTS');
console.log('========================================\n');

// ==========================================
// SECTION 1: Supermove Formula Tests
// ==========================================
console.log('--- SECTION 1: Supermove Formula ---\n');

test('Supermove formula - no empty freecells, no empty cascades', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Fill all freecells
  game.state.freecells = [
    new Card(0),
    new Card(1),
    new Card(2),
    new Card(3)
  ];

  // (1 + 0) * 2^0 = 1 * 1 = 1
  const max = game.getMaxSupermoveCards(false);
  assertEquals(max, 1, 'Should allow 1 card with no empty freecells/cascades');
});

test('Supermove formula - 4 empty freecells, no empty cascades', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // All freecells empty by default
  // (1 + 4) * 2^0 = 5 * 1 = 5
  const max = game.getMaxSupermoveCards(false);
  assertEquals(max, 5, 'Should allow 5 cards with 4 empty freecells');
});

test('Supermove formula - 4 empty freecells, 1 empty cascade', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Empty one cascade
  game.state.tableau[0] = [];

  // (1 + 4) * 2^1 = 5 * 2 = 10
  const max = game.getMaxSupermoveCards(false);
  assertEquals(max, 10, 'Should allow 10 cards with 4 freecells and 1 empty cascade');
});

test('Supermove formula - 4 empty freecells, 2 empty cascades', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Empty two cascades
  game.state.tableau[0] = [];
  game.state.tableau[1] = [];

  // (1 + 4) * 2^2 = 5 * 4 = 20
  const max = game.getMaxSupermoveCards(false);
  assertEquals(max, 20, 'Should allow 20 cards with 4 freecells and 2 empty cascades');
});

test('Supermove formula - target is empty cascade (adjustment)', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Empty two cascades
  game.state.tableau[0] = [];
  game.state.tableau[1] = [];

  // When moving TO empty cascade, subtract 1 from empty count
  // (1 + 4) * 2^(2-1) = 5 * 2 = 10
  const max = game.getMaxSupermoveCards(true);
  assertEquals(max, 10, 'Should adjust for target being empty');
});

test('Supermove formula - 2 freecells, 3 empty cascades', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Use 2 freecells
  game.state.freecells[0] = new Card(0);
  game.state.freecells[1] = new Card(1);

  // Empty 3 cascades
  game.state.tableau[0] = [];
  game.state.tableau[1] = [];
  game.state.tableau[2] = [];

  // (1 + 2) * 2^3 = 3 * 8 = 24
  const max = game.getMaxSupermoveCards(false);
  assertEquals(max, 24, 'Should allow 24 cards with 2 freecells and 3 empty cascades');
});

// ==========================================
// SECTION 2: Valid Sequence Detection
// ==========================================
console.log('\n--- SECTION 2: Valid Sequence Detection ---\n');

test('Valid sequence - alternating colors descending', () => {
  const game = new FreeCellGame({ seed: 12345 });

  const king = new Card(12);   // K♣ (black)
  const queen = new Card(24);  // Q♦ (red)
  const jack = new Card(10);   // J♣ (black)

  king.faceUp = true;
  queen.faceUp = true;
  jack.faceUp = true;

  const valid = game.isValidSequence([king, queen, jack]);
  assert(valid, 'K♣-Q♦-J♣ should be valid sequence');
});

test('Invalid sequence - same color', () => {
  const game = new FreeCellGame({ seed: 12345 });

  const king = new Card(12);   // K♣ (black)
  const queen = new Card(50);  // Q♠ (black)

  king.faceUp = true;
  queen.faceUp = true;

  const valid = game.isValidSequence([king, queen]);
  assert(!valid, 'K♣-Q♠ should NOT be valid (same color)');
});

test('Invalid sequence - not descending', () => {
  const game = new FreeCellGame({ seed: 12345 });

  const king = new Card(12);   // K♣
  const ten = new Card(22);    // 10♦ (skips Queen)

  king.faceUp = true;
  ten.faceUp = true;

  const valid = game.isValidSequence([king, ten]);
  assert(!valid, 'K♣-10♦ should NOT be valid (skips rank)');
});

test('Valid sequence - single card', () => {
  const game = new FreeCellGame({ seed: 12345 });

  const ace = new Card(0);
  ace.faceUp = true;

  const valid = game.isValidSequence([ace]);
  assert(valid, 'Single card should always be valid sequence');
});

// ==========================================
// SECTION 3: Multi-card Move Validation
// ==========================================
console.log('\n--- SECTION 3: Multi-card Move Validation ---\n');

test('Multi-card move - within supermove limit', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Create valid sequence: 7♣-6♦-5♣
  const seven = new Card(6);   // 7♣
  const six = new Card(18);    // 6♦
  const five = new Card(4);    // 5♣

  seven.faceUp = true;
  six.faceUp = true;
  five.faceUp = true;

  game.state.tableau[0] = [seven, six, five];

  // Create target: 8♦
  const eight = new Card(20);  // 8♦
  eight.faceUp = true;
  game.state.tableau[1] = [eight];

  // Try to move 3-card sequence (7♣-6♦-5♣) onto 8♦
  // With 4 empty freecells: (1 + 4) * 2^0 = 5 cards allowed
  const success = game.moveCards(
    { zone: 'tableau', index: 0 },
    { zone: 'tableau', index: 1 },
    3
  );

  assert(success, '3-card sequence should move (within limit of 5)');
  assertEquals(game.state.tableau[1].length, 4, 'Target should have 4 cards');
});

test('Multi-card move - exceeds supermove limit', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Fill all freecells
  game.state.freecells = [
    new Card(0),
    new Card(1),
    new Card(2),
    new Card(3)
  ];

  // Create valid sequence of 3 cards
  const seven = new Card(6);
  const six = new Card(18);
  const five = new Card(4);

  seven.faceUp = true;
  six.faceUp = true;
  five.faceUp = true;

  game.state.tableau[0] = [seven, six, five];

  const eight = new Card(20);
  eight.faceUp = true;
  game.state.tableau[1] = [eight];

  // Try to move 3 cards, but limit is (1 + 0) * 2^0 = 1
  const success = game.moveCards(
    { zone: 'tableau', index: 0 },
    { zone: 'tableau', index: 1 },
    3
  );

  assert(!success, '3-card move should fail when limit is 1');
});

test('Multi-card move - invalid sequence rejected', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Create invalid sequence (same color): 7♣-6♠
  const seven = new Card(6);   // 7♣ (black)
  const six = new Card(44);    // 6♠ (black)

  seven.faceUp = true;
  six.faceUp = true;

  game.state.tableau[0] = [seven, six];

  const eight = new Card(20);
  eight.faceUp = true;
  game.state.tableau[1] = [eight];

  // Try to move invalid 2-card sequence
  const success = game.moveCards(
    { zone: 'tableau', index: 0 },
    { zone: 'tableau', index: 1 },
    2
  );

  assert(!success, 'Invalid sequence should be rejected');
});

// ==========================================
// SECTION 4: FreeCell Game Rules
// ==========================================
console.log('\n--- SECTION 4: FreeCell Game Rules ---\n');

test('FreeCell initial state - all cards face up', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Check all tableau cards are face up
  for (const col of game.state.tableau) {
    for (const card of col) {
      assert(card.faceUp, 'All FreeCell cards should be face up');
    }
  }
});

test('FreeCell initial state - 8 cascades with correct distribution', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // First 4 columns should have 7 cards
  for (let i = 0; i < 4; i++) {
    assertEquals(game.state.tableau[i].length, 7, `Column ${i} should have 7 cards`);
  }

  // Last 4 columns should have 6 cards
  for (let i = 4; i < 8; i++) {
    assertEquals(game.state.tableau[i].length, 6, `Column ${i} should have 6 cards`);
  }

  // Total should be 52
  let total = 0;
  for (const col of game.state.tableau) {
    total += col.length;
  }
  assertEquals(total, 52, 'Should have 52 cards total');
});

test('FreeCell - can move to empty freecell', () => {
  const game = new FreeCellGame({ seed: 12345 });

  const cardToMove = game.state.tableau[0][game.state.tableau[0].length - 1];

  const success = game.moveCards(
    { zone: 'tableau', index: 0 },
    { zone: 'freecell', index: 0 },
    1
  );

  assert(success, 'Should be able to move card to empty freecell');
  assert(game.state.freecells[0] !== null, 'Freecell should have card');
  assertEquals(game.state.freecells[0].id, cardToMove.id, 'Should be same card');
});

test('FreeCell - cannot move to occupied freecell', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Fill freecell 0
  const firstCard = game.state.tableau[0].pop();
  game.state.freecells[0] = firstCard;

  // Try to move another card to same freecell
  const success = game.moveCards(
    { zone: 'tableau', index: 1 },
    { zone: 'freecell', index: 0 },
    1
  );

  assert(!success, 'Should not be able to move to occupied freecell');
});

test('FreeCell - can move from freecell to tableau', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Put a card in freecell
  const card = new Card(24); // Q♦ (red, rank 11)
  card.faceUp = true;
  game.state.freecells[0] = card;

  // Put a King on tableau
  const king = new Card(12); // K♣ (black, rank 12)
  king.faceUp = true;
  game.state.tableau[0] = [king];

  // Move Q♦ from freecell onto K♣
  const success = game.moveCards(
    { zone: 'freecell', index: 0 },
    { zone: 'tableau', index: 0 },
    1
  );

  assert(success, 'Should be able to move from freecell to tableau');
  assert(game.state.freecells[0] === null, 'Freecell should be empty');
  assertEquals(game.state.tableau[0].length, 2, 'Tableau should have 2 cards');
});

test('FreeCell - win condition detection', () => {
  const game = new FreeCellGame({ seed: 12345 });

  // Fill all foundations
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 0; rank < 13; rank++) {
      const card = new Card(suit * 13 + rank);
      card.faceUp = true;
      game.state.foundations[suit].push(card);
    }
  }

  game._checkWinCondition();
  assert(game.state.won, 'Should detect win when all 52 cards in foundations');
});

test('FreeCell - empty freecell count', () => {
  const game = new FreeCellGame({ seed: 12345 });

  assertEquals(game.getEmptyFreecellCount(), 4, 'Should have 4 empty freecells initially');

  game.state.freecells[0] = new Card(0);
  assertEquals(game.getEmptyFreecellCount(), 3, 'Should have 3 empty freecells after using one');

  game.state.freecells[1] = new Card(1);
  game.state.freecells[2] = new Card(2);
  assertEquals(game.getEmptyFreecellCount(), 1, 'Should have 1 empty freecell after using three');
});

test('FreeCell - empty cascade count', () => {
  const game = new FreeCellGame({ seed: 12345 });

  assertEquals(game.getEmptyCascadeCount(), 0, 'Should have 0 empty cascades initially');

  game.state.tableau[0] = [];
  assertEquals(game.getEmptyCascadeCount(), 1, 'Should have 1 empty cascade');

  game.state.tableau[1] = [];
  game.state.tableau[2] = [];
  assertEquals(game.getEmptyCascadeCount(), 3, 'Should have 3 empty cascades');
});

test('FreeCell - empty cascade count with exclusion', () => {
  const game = new FreeCellGame({ seed: 12345 });

  game.state.tableau[0] = [];
  game.state.tableau[1] = [];

  // Exclude column 1 from count
  const count = game.getEmptyCascadeCount(1);
  assertEquals(count, 1, 'Should count only 1 empty cascade when excluding column 1');
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
