/**
 * Comprehensive Game Rules & Function Testing Suite
 * Tests actual gameplay scenarios against rule implementations
 */

import { Card } from './src/core/card.js';
import { CommandValidator } from './src/core/validator.js';
import { KlondikeGame } from './src/games/klondike.js';

// Test Results Collector
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

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
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

console.log('\n========================================');
console.log('SOLITAIRE GAME RULES VALIDATION TESTS');
console.log('========================================\n');

// ==========================================
// SECTION 1: Card Model & Rule Logic Tests
// ==========================================
console.log('--- SECTION 1: Card Model & Rule Logic ---\n');

test('Card creation and properties', () => {
  const card = new Card(0); // Ace of Clubs
  assertEquals(card.rank, 0, 'Ace should be rank 0');
  assertEquals(card.suit, 0, 'Clubs should be suit 0');
  assertEquals(card.isBlack, true, 'Clubs should be black');
  assertEquals(card.shortCode, 'A♣', 'Short code should be A♣');
});

test('Card suit and color calculations', () => {
  const aceClubs = new Card(0);     // Clubs = 0, Black
  const aceDiamonds = new Card(13); // Diamonds = 1, Red
  const aceHearts = new Card(26);   // Hearts = 2, Red
  const aceSpades = new Card(39);   // Spades = 3, Black

  assert(aceClubs.isBlack, 'Ace of Clubs should be black');
  assert(aceDiamonds.isRed, 'Ace of Diamonds should be red');
  assert(aceHearts.isRed, 'Ace of Hearts should be red');
  assert(aceSpades.isBlack, 'Ace of Spades should be black');
});

test('Tableau stacking rule - alternating colors', () => {
  const redSix = new Card(18);   // 6♦ (18 = 1*13 + 5, rank 5)
  const blackFive = new Card(4); // 5♣ (4 = 0*13 + 4, rank 4)
  const redFive = new Card(17);  // 5♦ (17 = 1*13 + 4, rank 4)

  redSix.faceUp = true;
  blackFive.faceUp = true;
  redFive.faceUp = true;

  // Black 5 can stack on Red 6 (alternating color, rank-1)
  assert(blackFive.canStackOnTableau(redSix), 'Black 5 should stack on Red 6');

  // Red 5 cannot stack on Red 6 (same color)
  assert(!redFive.canStackOnTableau(redSix), 'Red 5 should NOT stack on Red 6');
});

test('Tableau stacking rule - Kings on empty columns', () => {
  const king = new Card(12); // K♣
  king.faceUp = true;

  // King can be placed on null (empty column)
  assert(king.canStackOnTableau(null), 'King should go on empty column');

  const queen = new Card(11); // Q♣
  queen.faceUp = true;

  // Non-King cannot be placed on null
  assert(!queen.canStackOnTableau(null), 'Queen should NOT go on empty column');
});

test('Foundation building rule - Aces start foundations', () => {
  const ace = new Card(0); // A♣
  ace.faceUp = true;

  // Ace can start foundation (null = empty foundation)
  assert(ace.canBuildOnFoundation(null), 'Ace should start foundation');

  const two = new Card(1); // 2♣
  two.faceUp = true;

  // Non-Ace cannot start foundation
  assert(!two.canBuildOnFoundation(null), '2 should NOT start foundation');
});

test('Foundation building rule - same suit ascending', () => {
  const aceClubs = new Card(0);    // A♣
  const twoClubs = new Card(1);    // 2♣
  const twoDiamonds = new Card(14); // 2♦

  aceClubs.faceUp = true;
  twoClubs.faceUp = true;
  twoDiamonds.faceUp = true;

  // 2♣ can build on A♣ (same suit, rank+1)
  assert(twoClubs.canBuildOnFoundation(aceClubs), '2♣ should build on A♣');

  // 2♦ cannot build on A♣ (different suit)
  assert(!twoDiamonds.canBuildOnFoundation(aceClubs), '2♦ should NOT build on A♣');
});

test('Spider stacking rule - descending rank', () => {
  const seven = new Card(6);  // 7♣
  const six = new Card(5);    // 6♣
  const sixHearts = new Card(31); // 6♥

  seven.faceUp = true;
  six.faceUp = true;
  sixHearts.faceUp = true;

  // In Spider, 6 can stack on 7 (rank-1, any suit)
  assert(six.canStackOnSpider(seven), '6♣ should stack on 7♣ in Spider');
  assert(sixHearts.canStackOnSpider(seven), '6♥ should stack on 7♣ in Spider');

  // Any card can go on empty column in Spider
  assert(six.canStackOnSpider(null), '6 should go on empty column in Spider');
});

// ==========================================
// SECTION 2: Command Validator Tests
// ==========================================
console.log('\n--- SECTION 2: Command Validator Tests ---\n');

test('Deck invariant verification - standard deck', () => {
  const deck = Card.createStandardDeck(1);
  const mockState = {
    stock: deck,
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []]
  };

  const validation = CommandValidator.verifyDeckInvariants(mockState, 52);
  assert(validation.valid, 'Standard deck should be valid');
  assertEquals(validation.totalFound, 52, 'Should find 52 cards');
  assertEquals(validation.duplicates.length, 0, 'Should have no duplicates');
  assertEquals(validation.missing.length, 0, 'Should have no missing cards');
});

test('Deck invariant verification - detects duplicates', () => {
  const card = new Card(0);
  const mockState = {
    stock: [card],
    waste: [card], // Same card in two places!
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []]
  };

  const validation = CommandValidator.verifyDeckInvariants(mockState, 52);
  assert(!validation.valid, 'Should detect duplicate card');
  assert(validation.duplicates.length > 0, 'Should report duplicate');
});

test('MOVE command - valid tableau to foundation', () => {
  const ace = new Card(0); // A♣
  ace.faceUp = true;

  const state = {
    gameType: 'klondike',
    tableau: [[ace], [], [], [], [], [], []],
    foundations: [[], [], [], []],
    stock: [],
    waste: [],
    score: 0,
    moves: 0,
    won: false
  };

  const result = CommandValidator.apply(state, {
    type: 'MOVE',
    source: { zone: 'tableau', index: 0 },
    target: { zone: 'foundation', index: 0 },
    count: 1
  });

  assert(result.ok, 'Move should succeed');
  assertEquals(result.state.tableau[0].length, 0, 'Source tableau should be empty');
  assertEquals(result.state.foundations[0].length, 1, 'Foundation should have 1 card');
  assert(result.scoreDelta > 0, 'Should award points for foundation move');
});

test('MOVE command - invalid move rejected', () => {
  const two = new Card(1); // 2♣
  two.faceUp = true;

  const state = {
    gameType: 'klondike',
    tableau: [[two], [], [], [], [], [], []],
    foundations: [[], [], [], []],
    stock: [],
    waste: [],
    score: 0,
    moves: 0,
    won: false
  };

  // Try to put 2♣ on empty foundation (only Ace allowed)
  const result = CommandValidator.apply(state, {
    type: 'MOVE',
    source: { zone: 'tableau', index: 0 },
    target: { zone: 'foundation', index: 0 },
    count: 1
  });

  assert(!result.ok, 'Invalid move should be rejected');
  assertEquals(result.error, 'FOUNDATION_RULE_VIOLATION', 'Should report correct error');
});

test('MOVE command - face-down card rejected', () => {
  const card = new Card(0);
  card.faceUp = false; // Face down!

  const state = {
    gameType: 'klondike',
    tableau: [[card], [], [], [], [], [], []],
    foundations: [[], [], [], []],
    stock: [],
    waste: [],
    score: 0,
    moves: 0,
    won: false
  };

  const result = CommandValidator.apply(state, {
    type: 'MOVE',
    source: { zone: 'tableau', index: 0 },
    target: { zone: 'foundation', index: 0 },
    count: 1
  });

  assert(!result.ok, 'Face-down card move should be rejected');
  assertEquals(result.error, 'CARD_FACE_DOWN', 'Should report face-down error');
});

test('DRAW command - draws cards from stock to waste', () => {
  const card1 = new Card(0);
  const card2 = new Card(1);
  const card3 = new Card(2);
  card1.faceUp = false;
  card2.faceUp = false;
  card3.faceUp = false;

  const state = {
    stock: [card1, card2, card3],
    waste: [],
    moves: 0
  };

  const result = CommandValidator.apply(state, {
    type: 'DRAW',
    count: 3
  });

  assert(result.ok, 'Draw should succeed');
  assertEquals(result.state.stock.length, 0, 'Stock should be empty');
  assertEquals(result.state.waste.length, 3, 'Waste should have 3 cards');
  assert(result.state.waste[2].faceUp, 'Drawn cards should be face up');
});

test('RECYCLE command - moves waste back to stock', () => {
  const card1 = new Card(0);
  const card2 = new Card(1);
  card1.faceUp = true;
  card2.faceUp = true;

  const state = {
    stock: [],
    waste: [card1, card2],
    score: 100,
    moves: 0
  };

  const result = CommandValidator.apply(state, {
    type: 'RECYCLE',
    penalty: 15
  });

  assert(result.ok, 'Recycle should succeed');
  assertEquals(result.state.stock.length, 2, 'Stock should have 2 cards');
  assertEquals(result.state.waste.length, 0, 'Waste should be empty');
  assert(!result.state.stock[0].faceUp, 'Recycled cards should be face down');
  assertEquals(result.state.score, 85, 'Score should be reduced by penalty');
});

// ==========================================
// SECTION 3: Klondike Game Logic Tests
// ==========================================
console.log('\n--- SECTION 3: Klondike Game Logic Tests ---\n');

test('Klondike initial state setup', () => {
  const game = new KlondikeGame({ seed: 12345, drawCount: 1 });
  const state = game.state;

  // Verify tableau structure (1, 2, 3, 4, 5, 6, 7 cards)
  let tableauTotal = 0;
  for (let i = 0; i < 7; i++) {
    assertEquals(state.tableau[i].length, i + 1, `Tableau column ${i} should have ${i + 1} cards`);
    tableauTotal += state.tableau[i].length;
  }
  assertEquals(tableauTotal, 28, 'Tableau should have 28 cards total');

  // Verify stock
  assertEquals(state.stock.length, 24, 'Stock should have 24 cards');

  // Verify empty waste and foundations
  assertEquals(state.waste.length, 0, 'Waste should be empty');
  assertEquals(state.foundations.length, 4, 'Should have 4 foundations');
});

test('Klondike draw functionality', () => {
  const game = new KlondikeGame({ seed: 12345, drawCount: 3 });
  const initialStock = game.state.stock.length;

  const success = game.drawOrRecycle();

  assert(success, 'Draw should succeed');
  assertEquals(game.state.stock.length, initialStock - 3, 'Stock should have 3 fewer cards');
  assert(game.state.waste.length > 0, 'Waste should have cards');
});

test('Klondike recycle functionality', () => {
  const game = new KlondikeGame({ seed: 12345, drawCount: 1 });

  // Draw all cards from stock
  while (game.state.stock.length > 0) {
    game.drawOrRecycle();
  }

  assertEquals(game.state.stock.length, 0, 'Stock should be empty');
  const wasteCount = game.state.waste.length;
  assert(wasteCount > 0, 'Waste should have cards');

  // Recycle
  const success = game.drawOrRecycle();

  assert(success, 'Recycle should succeed');
  assertEquals(game.state.stock.length, wasteCount, 'Stock should have all waste cards');
  assertEquals(game.state.waste.length, 0, 'Waste should be empty');
});

test('Klondike undo functionality', () => {
  const game = new KlondikeGame({ seed: 12345, drawCount: 1 });
  const initialState = JSON.stringify(game.state);

  // Make a move
  game.drawOrRecycle();
  const afterDraw = JSON.stringify(game.state);

  assert(initialState !== afterDraw, 'State should change after draw');

  // Undo
  const undoSuccess = game.undo();
  const afterUndo = JSON.stringify(game.state);

  assert(undoSuccess, 'Undo should succeed');
  assertEquals(afterUndo, initialState, 'Undo should restore initial state');
});

test('Klondike win condition detection', () => {
  const game = new KlondikeGame({ seed: 12345 });

  // Manually set all cards in foundations
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 0; rank < 13; rank++) {
      const card = new Card(suit * 13 + rank);
      card.faceUp = true;
      game.state.foundations[suit].push(card);
    }
  }

  game._checkWinCondition();

  assert(game.state.won, 'Game should be won when all 52 cards in foundations');
});

test('Klondike auto-complete detection', () => {
  const game = new KlondikeGame({ seed: 12345 });

  // Set up a state where all cards are face up and stock is empty
  game.state.stock = [];
  game.state.waste = [];
  for (let col of game.state.tableau) {
    for (let card of col) {
      card.faceUp = true;
    }
  }

  const canAutoComplete = game.canAutoComplete();

  assert(canAutoComplete, 'Should allow auto-complete when all cards are revealed');
});

test('Klondike smart move - foundation priority', () => {
  const game = new KlondikeGame({ seed: 12345 });

  // Place an Ace on tableau
  const ace = new Card(0); // A♣
  ace.faceUp = true;
  game.state.tableau[0] = [ace];

  const smartMove = game.findSmartMove({ zone: 'tableau', index: 0 });

  assert(smartMove !== null, 'Should find a smart move for Ace');
  assertEquals(smartMove.target.zone, 'foundation', 'Should prioritize foundation');
});

test('Klondike tactical hint system', () => {
  const game = new KlondikeGame({ seed: 12345 });

  // Place an Ace on tableau for easy foundation move
  const ace = new Card(0);
  ace.faceUp = true;
  game.state.tableau[0] = [ace];

  const hint = game.getTacticalHint();

  assert(hint !== null, 'Should provide a hint');
  assert(hint.message.length > 0, 'Hint should have a message');
  assertEquals(hint.source.zone, 'tableau', 'Hint should suggest moving from tableau');
  assertEquals(hint.target.zone, 'foundation', 'Hint should suggest foundation move');
});

// ==========================================
// SECTION 4: State Immutability Tests
// ==========================================
console.log('\n--- SECTION 4: State Immutability Tests ---\n');

test('CommandValidator returns new state object', () => {
  const ace = new Card(0);
  ace.faceUp = true;

  const originalState = {
    gameType: 'klondike',
    tableau: [[ace], [], [], [], [], [], []],
    foundations: [[], [], [], []],
    stock: [],
    waste: [],
    score: 0,
    moves: 0,
    won: false
  };

  const result = CommandValidator.apply(originalState, {
    type: 'MOVE',
    source: { zone: 'tableau', index: 0 },
    target: { zone: 'foundation', index: 0 },
    count: 1
  });

  // Original state should be unchanged
  assertEquals(originalState.tableau[0].length, 1, 'Original state should be unchanged');
  assertEquals(originalState.foundations[0].length, 0, 'Original state should be unchanged');

  // New state should have changes
  assertEquals(result.state.tableau[0].length, 0, 'New state should have changes');
  assertEquals(result.state.foundations[0].length, 1, 'New state should have changes');
});

test('Undo preserves state integrity', () => {
  const game = new KlondikeGame({ seed: 99999 });

  // Capture initial card count
  const initialValidation = CommandValidator.verifyDeckInvariants(game.state, 52);
  assert(initialValidation.valid, 'Initial state should be valid');

  // Make several moves
  game.drawOrRecycle();
  game.drawOrRecycle();
  game.drawOrRecycle();

  // Verify still valid
  const afterMoves = CommandValidator.verifyDeckInvariants(game.state, 52);
  assert(afterMoves.valid, 'State should be valid after moves');

  // Undo all
  game.undo();
  game.undo();
  game.undo();

  // Verify still valid
  const afterUndo = CommandValidator.verifyDeckInvariants(game.state, 52);
  assert(afterUndo.valid, 'State should be valid after undo');
});

// ==========================================
// SECTION 5: Edge Cases & Error Handling
// ==========================================
console.log('\n--- SECTION 5: Edge Cases & Error Handling ---\n');

test('Cannot move from empty pile', () => {
  const state = {
    gameType: 'klondike',
    tableau: [[], [], [], [], [], [], []],
    foundations: [[], [], [], []],
    stock: [],
    waste: [],
    score: 0,
    moves: 0,
    won: false
  };

  const result = CommandValidator.apply(state, {
    type: 'MOVE',
    source: { zone: 'tableau', index: 0 },
    target: { zone: 'foundation', index: 0 },
    count: 1
  });

  assert(!result.ok, 'Should not allow move from empty pile');
  assertEquals(result.error, 'EMPTY_SOURCE', 'Should report empty source error');
});

test('Cannot draw from empty stock', () => {
  const state = {
    stock: [],
    waste: [],
    moves: 0
  };

  const result = CommandValidator.apply(state, {
    type: 'DRAW',
    count: 1
  });

  assert(!result.ok, 'Should not allow draw from empty stock');
  assertEquals(result.error, 'STOCK_EMPTY', 'Should report stock empty error');
});

test('Score cannot go below zero', () => {
  const state = {
    stock: [],
    waste: [new Card(0)],
    score: 5,
    moves: 0
  };

  const result = CommandValidator.apply(state, {
    type: 'RECYCLE',
    penalty: 100
  });

  assert(result.ok, 'Recycle should succeed');
  assertEquals(result.state.score, 0, 'Score should not go below zero');
});

test('Multi-card moves maintain order', () => {
  const card1 = new Card(0);   // A♣ (base card)
  const card2 = new Card(38);  // K♥ (red King, can stack on empty column)
  const card3 = new Card(11);  // Q♣ (black Queen, stacks on K♥)
  card1.faceUp = true;
  card2.faceUp = true;
  card3.faceUp = true;

  const state = {
    gameType: 'klondike',
    tableau: [[card1, card2, card3], [], [], [], [], [], []],
    foundations: [[], [], [], []],
    stock: [],
    waste: [],
    score: 0,
    moves: 0,
    won: false
  };

  const result = CommandValidator.apply(state, {
    type: 'MOVE',
    source: { zone: 'tableau', index: 0, cardIndex: 1 },
    target: { zone: 'tableau', index: 1 },
    count: 2
  });

  assert(result.ok, 'Multi-card move should succeed');
  assertEquals(result.state.tableau[1].length, 2, 'Target should have 2 cards');
  assertEquals(result.state.tableau[1][0].id, card2.id, 'Card order should be preserved');
  assertEquals(result.state.tableau[1][1].id, card3.id, 'Card order should be preserved');
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

// Exit with error code if tests failed
process.exit(results.failed > 0 ? 1 : 0);
