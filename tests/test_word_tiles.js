/**
 * Word Tiles: Sovereign Lexicon — Clean-Room Invariant & Rule Verification Suite
 * 
 * Verifies all 16 required engine invariants:
 * 1. Legal vs illegal opening moves.
 * 2. Disconnected and non-contiguous placements.
 * 3. Valid main word with invalid cross-word.
 * 4. Multiple cross-words formed in one move.
 * 5. Bridging existing tiles across gaps.
 * 6. Premium-cell reuse prevention (no multiplier reactivation).
 * 7. Blank assignment and 0-point scoring.
 * 8. Full-rack bonus (+50 points for 7 tiles).
 * 9. Invalid move rollback and atomicity.
 * 10. Exchange restrictions and tile conservation.
 * 11. Consecutive passes triggering game end.
 * 12. Final score adjustments for unplayed rack tiles.
 * 13. Deterministic seeded PRNG behavior.
 * 14. Save and load state roundtrip.
 * 15. Computer opponent move legality and same-engine validation.
 * 16. Duplicate commit prevention.
 */

import { WordTilesGame } from '../src/games/word_tiles.js';
import { WordBoard } from '../src/core/word_tiles/board.js';
import { Tile, TileBag } from '../src/core/word_tiles/bag.js';
import { WordDictionary } from '../src/core/word_tiles/dictionary.js';
import { BoardValidator } from '../src/core/word_tiles/validator.js';
import { BoardScorer } from '../src/core/word_tiles/scorer.js';
import { AIPlayer, AI_DIFFICULTY } from '../src/core/word_tiles/ai_player.js';
import { WordTilesP2PManager } from '../src/core/word_tiles/p2p_turn_manager.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log("=================================================");
console.log(" WORD TILES: SOVEREIGN LEXICON — ENGINE TESTS");
console.log("=================================================\n");

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Shared Dictionary
const dict = new WordDictionary();
const dictPath = path.resolve(__dirname, '../assets/dictionary/enable1.txt');
if (fs.existsSync(dictPath)) {
  dict.loadFromText(fs.readFileSync(dictPath, 'utf8'));
} else {
  dict.loadCoreSeedLexicon();
}

// ----------------------------------------------------------------------------
// TEST 1: Legal & Illegal Opening Moves
// ----------------------------------------------------------------------------
console.log("--- TEST 1: Opening Move Center Star Requirement ---");
{
  const board = new WordBoard();
  
  // Away from center: "CAT" at (0, 0), (0, 1), (0, 2)
  const illegalPlacements = [
    { row: 0, col: 0, tile: new Tile('t1', 'C', 3) },
    { row: 0, col: 1, tile: new Tile('t2', 'A', 1) },
    { row: 0, col: 2, tile: new Tile('t3', 'T', 1) }
  ];
  const resIllegal = BoardValidator.validateMove(board, illegalPlacements, dict);
  assert(!resIllegal.valid, "Move away from center on turn 1 is rejected");
  assert(resIllegal.errorCode === 'CENTER_REQUIRED', "Rejection code is CENTER_REQUIRED");

  // Legal opening move: "CAT" covering center (7, 7)
  const legalPlacements = [
    { row: 7, col: 6, tile: new Tile('t1', 'C', 3) },
    { row: 7, col: 7, tile: new Tile('t2', 'A', 1) }, // Covers Center Star
    { row: 7, col: 8, tile: new Tile('t3', 'T', 1) }
  ];
  const resLegal = BoardValidator.validateMove(board, legalPlacements, dict);
  assert(resLegal.valid, "Move covering center star [7, 7] is valid");
  assert(resLegal.words[0].text === 'CAT', "Extracted main word is 'CAT'");
}

// ----------------------------------------------------------------------------
// TEST 2: Disconnected and Non-Contiguous Placements
// ----------------------------------------------------------------------------
console.log("\n--- TEST 2: Disconnected & Non-Contiguous Placements ---");
{
  const board = new WordBoard();

  // Gap between tiles: 'C' at (7, 5), 'A' at (7, 7), 'T' at (7, 9) with gaps at 6 and 8
  const gapPlacements = [
    { row: 7, col: 5, tile: new Tile('t1', 'C', 3) },
    { row: 7, col: 7, tile: new Tile('t2', 'A', 1) },
    { row: 7, col: 9, tile: new Tile('t3', 'T', 1) }
  ];
  const resGap = BoardValidator.validateMove(board, gapPlacements, dict);
  assert(!resGap.valid, "Placement with empty gaps is rejected");
  assert(resGap.errorCode === 'NON_CONTIGUOUS_PLACEMENT', "Rejection code is NON_CONTIGUOUS_PLACEMENT");

  // Diagonal placement
  const diagonalPlacements = [
    { row: 6, col: 6, tile: new Tile('t1', 'C', 3) },
    { row: 7, col: 7, tile: new Tile('t2', 'A', 1) },
    { row: 8, col: 8, tile: new Tile('t3', 'T', 1) }
  ];
  const resDiag = BoardValidator.validateMove(board, diagonalPlacements, dict);
  assert(!resDiag.valid, "Diagonal placement is rejected");
  assert(resDiag.errorCode === 'NON_LINEAR_PLACEMENT', "Rejection code is NON_LINEAR_PLACEMENT");
}

// ----------------------------------------------------------------------------
// TEST 3: Bridging Existing Tiles
// ----------------------------------------------------------------------------
console.log("\n--- TEST 3: Bridging Existing Tiles Across Gaps ---");
{
  const board = new WordBoard();
  // Place "CAT" on center (7, 6), (7, 7), (7, 8)
  board.setTile(7, 6, new Tile('b1', 'C', 3), true);
  board.setTile(7, 7, new Tile('b2', 'A', 1), true);
  board.setTile(7, 8, new Tile('b3', 'T', 1), true);

  // Place 'S' at (7, 5) and 'S' at (7, 9) forming "SCATS" by bridging existing "CAT"
  dict.insert("SCATS");
  const bridgePlacements = [
    { row: 7, col: 5, tile: new Tile('t1', 'S', 1) },
    { row: 7, col: 9, tile: new Tile('t2', 'S', 1) }
  ];
  const resBridge = BoardValidator.validateMove(board, bridgePlacements, dict);
  assert(resBridge.valid, "Placements bridging existing committed tiles are valid");
  assert(resBridge.words[0].text === 'SCATS', "Bridged word extracted as 'SCATS'");
}

// ----------------------------------------------------------------------------
// TEST 4: Valid Main Word with Invalid Cross-Word
// ----------------------------------------------------------------------------
console.log("\n--- TEST 4: Valid Main Word with Invalid Cross-Word ---");
{
  const board = new WordBoard();
  // Existing word: "CAT" at row 7, cols 6-8
  board.setTile(7, 6, new Tile('b1', 'C', 3), true);
  board.setTile(7, 7, new Tile('b2', 'A', 1), true);
  board.setTile(7, 8, new Tile('b3', 'T', 1), true);

  // Placed tiles form valid main word "DOG" along row 8 at cols 6-8:
  // (8, 6)='D', (8, 7)='O', (8, 8)='G'.
  // This forms cross words:
  // Col 6: "CD" (Invalid!)
  // Col 7: "AO" (Invalid!)
  // Col 8: "TG" (Invalid!)
  const placements = [
    { row: 8, col: 6, tile: new Tile('t1', 'D', 2) },
    { row: 8, col: 7, tile: new Tile('t2', 'O', 1) },
    { row: 8, col: 8, tile: new Tile('t3', 'G', 2) }
  ];
  const res = BoardValidator.validateMove(board, placements, dict);
  assert(!res.valid, "Valid main word with invalid cross-word is rejected");
  assert(res.errorCode === 'INVALID_WORD', "Rejection code is INVALID_WORD");
}

// ----------------------------------------------------------------------------
// TEST 5: Multiple Cross-Words Formed in One Move
// ----------------------------------------------------------------------------
console.log("\n--- TEST 5: Multiple Valid Cross-Words Formed ---");
{
  const board = new WordBoard();
  // Setup: (7, 6)='A', (7, 7)='A'
  board.setTile(7, 6, new Tile('b1', 'A', 1), true);
  board.setTile(7, 7, new Tile('b2', 'A', 1), true);

  // Place "AT" at (8, 6) and (8, 7)
  // Main word: "AT" (Row 8)
  // Cross word 1: "AA" (Col 6)
  // Cross word 2: "AT" (Col 7)
  const placements = [
    { row: 8, col: 6, tile: new Tile('t1', 'A', 1) },
    { row: 8, col: 7, tile: new Tile('t2', 'T', 1) }
  ];
  const res = BoardValidator.validateMove(board, placements, dict);
  assert(res.valid, "Move forming main word and 2 cross-words is valid");
  assert(res.words.length === 3, "Extracted exactly 3 valid words");
}

// ----------------------------------------------------------------------------
// TEST 6: Premium Square Multiplier Reuse Prevention
// ----------------------------------------------------------------------------
console.log("\n--- TEST 6: Premium Square Reuse Prevention ---");
{
  const board = new WordBoard();
  // Cell (0, 0) is a 3W (Triple Word) cell!
  // First Turn: Place "CAT" horizontally at (0,0), (0,1), (0,2).
  // Note: for this test, we temporarily bypass opening center check to test pure scoring behavior.
  const oldTiles = [
    { row: 0, col: 0, tile: new Tile('b1', 'C', 3) },
    { row: 0, col: 1, tile: new Tile('b2', 'A', 1) },
    { row: 0, col: 2, tile: new Tile('b3', 'T', 1) }
  ];
  // Calculate score when placed fresh on 3W:
  // Base: C(3) + A(1) + T(1) = 5. Multiplier: 3W => 5 * 3 = 15.
  const freshWords = [{
    text: 'CAT',
    cells: oldTiles.map(p => ({ row: p.row, col: p.col, tile: p.tile, isNew: true }))
  }];
  const freshScore = BoardScorer.calculateScore(board, freshWords, oldTiles);
  assert(freshScore.totalScore === 15, "Fresh placement on 3W awards 3x word multiplier (15 pts)");

  // Commit tiles to board
  for (const t of oldTiles) {
    board.setTile(t.row, t.col, t.tile, true);
  }

  // Second Turn: Extend vertically from (0,0) with "UP" at (1,0) and (2,0), forming "CUP"
  // (0,0) is already committed. Newly placed tiles are (1,0) and (2,0).
  const newPlacements = [
    { row: 1, col: 0, tile: new Tile('n1', 'U', 1) },
    { row: 2, col: 0, tile: new Tile('n2', 'P', 3) }
  ];
  const cupCells = [
    { row: 0, col: 0, tile: board.getCell(0, 0).tile, isNew: false },
    { row: 1, col: 0, tile: newPlacements[0].tile, isNew: true },
    { row: 2, col: 0, tile: newPlacements[1].tile, isNew: true }
  ];
  const cupWords = [{ text: 'CUP', cells: cupCells }];
  const cupScore = BoardScorer.calculateScore(board, cupWords, newPlacements);

  // (0, 0) is 3W, but because it is an EXISTING tile, 3W MUST NOT REACTIVATE!
  // Neither (1,0) nor (2,0) has a word multiplier.
  // Base sum: C(3) + U(1) + P(3) = 7. Multiplier: 1 => Total: 7 pts.
  assert(cupScore.totalScore === 7, `Existing 3W did not reactivate! Expected 7 pts, got ${cupScore.totalScore}`);
  assert(cupScore.breakdown[0].multiplier === 1, "Word multiplier remains 1 (no reactivation)");
}

// ----------------------------------------------------------------------------
// TEST 7: Blank Tile Assignment and Zero-Point Scoring
// ----------------------------------------------------------------------------
console.log("\n--- TEST 7: Blank Tile Assignment & 0-Point Scoring ---");
{
  const board = new WordBoard();
  const blankTile = new Tile('blank_1', '_', 0, true);
  blankTile.designatedLetter = 'Z'; // Designated as 'Z' (ordinarily worth 10 pts)

  const placements = [
    { row: 7, col: 7, tile: blankTile },
    { row: 7, col: 8, tile: new Tile('t1', 'O', 1) },
    { row: 7, col: 9, tile: new Tile('t2', 'O', 1) }
  ];
  // Forms word "ZOO"
  const val = BoardValidator.validateMove(board, placements, dict);
  assert(val.valid, "Blank designated as 'Z' forms valid word 'ZOO'");
  assert(val.words[0].text === 'ZOO', "Word text is 'ZOO'");

  const scoreObj = BoardScorer.calculateScore(board, val.words, placements);
  // Center (7,7) has 2W.
  // Letter scores: Z(Blank) = 0, O = 1, O = 1. Base sum = 2.
  // Word multiplier: 2W (from center) => 2 * 2 = 4 pts.
  // If blank incorrectly scored 10 points, total would be (10+1+1)*2 = 24.
  assert(scoreObj.totalScore === 4, `Blank tile scored exactly 0 letter points (Total: 4 pts with 2W, got ${scoreObj.totalScore})`);
}

// ----------------------------------------------------------------------------
// TEST 8: Full-Rack Bonus ("Bingo" +50 Points)
// ----------------------------------------------------------------------------
console.log("\n--- TEST 8: Full-Rack Bonus (+50 Points for 7 Tiles) ---");
{
  const board = new WordBoard();
  dict.insert("RESTING");
  const placements = [
    { row: 7, col: 4, tile: new Tile('t1', 'R', 1) },
    { row: 7, col: 5, tile: new Tile('t2', 'E', 1) },
    { row: 7, col: 6, tile: new Tile('t3', 'S', 1) },
    { row: 7, col: 7, tile: new Tile('t4', 'T', 1) }, // Center 2W
    { row: 7, col: 8, tile: new Tile('t5', 'I', 1) },
    { row: 7, col: 9, tile: new Tile('t6', 'N', 1) },
    { row: 7, col: 10, tile: new Tile('t7', 'G', 2) }
  ];
  const val = BoardValidator.validateMove(board, placements, dict);
  assert(val.valid, "7-letter opening word 'RESTING' is valid");

  const scoreObj = BoardScorer.calculateScore(board, val.words, placements);
  // Base sum: 1+1+1+1+1+1+2 = 8.
  // Center (7,7) 2W => 8 * 2 = 16.
  // Full rack bonus: +50 => Total: 66 pts.
  assert(scoreObj.bingo, "Full rack bonus detected as true");
  assert(scoreObj.totalScore === 66, `Full rack bonus awarded +50 points (Expected 66, got ${scoreObj.totalScore})`);
}

// ----------------------------------------------------------------------------
// TEST 9: Invalid Move Rollback & Atomicity
// ----------------------------------------------------------------------------
console.log("\n--- TEST 9: Invalid Move Rollback & Atomicity ---");
{
  const game = new WordTilesGame({ seed: 42 });
  const initialHumanScore = game.state.humanScore;
  const initialRackLen = game.humanRack.length;
  const initialBagCount = game.bag.count();

  // Try to commit an invalid opening move away from center
  game.placeTileFromRack(0, 0, 0); // Place at (0, 0)
  const result = game.commitHumanMove();

  assert(!result.success, "Invalid move is rejected on commit");
  assert(game.state.humanScore === initialHumanScore, "Human score is unmutated");
  assert(game.state.turn === 'human', "Turn ownership is preserved");
  assert(game.board.getCommittedTileCount() === 0, "Board remains empty of committed tiles");

  // Recall tiles back to rack
  game.recallAll();
  assert(game.humanRack.length === initialRackLen, "Rack length restored after recall");
  assert(game.bag.count() === initialBagCount, "Bag tile count unmutated");
}

// ----------------------------------------------------------------------------
// TEST 10: Tile Exchange Restrictions & 100-Tile Conservation
// ----------------------------------------------------------------------------
console.log("\n--- TEST 10: Exchange Restrictions & Tile Conservation ---");
{
  const game = new WordTilesGame({ seed: 777 });
  assert(game.assertConservation(), "100 tiles conserved at initialization");

  // Legal exchange of 3 tiles
  const exRes = game.exchangeTiles([0, 1, 2]);
  assert(exRes.success, "Exchange succeeds when bag has >= 7 tiles");
  assert(game.humanRack.length === 7, "Rack refilled back to 7 tiles after exchange");
  assert(game.assertConservation(), "100 tiles conserved after exchange");

  // Artificially empty bag to below 7 tiles
  game.bag.draw(game.bag.count() - 5); // Bag now has 5 tiles
  const failExRes = game.exchangeTiles([0, 1]);
  assert(!failExRes.success, "Exchange rejected when bag has < 7 tiles");
}

// ----------------------------------------------------------------------------
// TEST 11: Consecutive Passes Game End Trigger
// ----------------------------------------------------------------------------
console.log("\n--- TEST 11: Consecutive Passes Trigger Game End ---");
{
  const game = new WordTilesGame({ seed: 101 });
  // Turn 1: Human pass
  game.passTurn();
  assert(game.state.consecutivePasses === 1, "Consecutive passes count is 1");
  assert(!game.state.gameOver, "Game not over after 1 pass");

  // Force passes up to 4
  game.state.turn = 'human';
  game.passTurn();
  game.state.turn = 'human';
  game.passTurn();
  game.state.turn = 'human';
  game.passTurn();

  assert(game.state.gameOver, "Game ends after 4 consecutive passes");
  assert(game.state.gameEndReason === 'consecutive_passes', "End reason recorded as consecutive_passes");
}

// ----------------------------------------------------------------------------
// TEST 12: Final Score Adjustments for Unplayed Rack Tiles
// ----------------------------------------------------------------------------
console.log("\n--- TEST 12: Final Score Adjustments ---");
{
  const game = new WordTilesGame({ seed: 202 });
  game.state.humanScore = 100;
  game.state.aiScore = 80;

  // Set explicit unplayed rack tiles
  game.humanRack = [new Tile('h1', 'A', 1), new Tile('h2', 'B', 3)]; // 4 pts
  game.aiRack = [new Tile('a1', 'Q', 10), new Tile('a2', 'Z', 10)]; // 20 pts

  // Simulate human emptying rack: human gets +20 (from AI), AI gets -20
  game._endGame('human_emptied_rack');
  assert(game.state.humanScore === 120, `Human gained AI unplayed tiles (100 + 20 = 120, got ${game.state.humanScore})`);
  assert(game.state.aiScore === 60, `AI deducted unplayed tiles (80 - 20 = 60, got ${game.state.aiScore})`);
  assert(game.state.winner === 'Human', "Human declared winner");
}

// ----------------------------------------------------------------------------
// TEST 13: Deterministic Seeded PRNG Behavior
// ----------------------------------------------------------------------------
console.log("\n--- TEST 13: Deterministic Seeded Behavior ---");
{
  const gameA = new WordTilesGame({ seed: 99999 });
  const gameB = new WordTilesGame({ seed: 99999 });

  const lettersA = gameA.humanRack.map(t => t.letter).join('');
  const lettersB = gameB.humanRack.map(t => t.letter).join('');
  assert(lettersA === lettersB, `Identical seeds produce identical rack deals: ${lettersA}`);

  const bagAFirst5 = gameA.bag.tiles.slice(-5).map(t => t.letter).join('');
  const bagBFirst5 = gameB.bag.tiles.slice(-5).map(t => t.letter).join('');
  assert(bagAFirst5 === bagBFirst5, `Identical seeds produce identical bag order: ${bagAFirst5}`);
}

// ----------------------------------------------------------------------------
// TEST 14: Save and Load State Roundtrip
// ----------------------------------------------------------------------------
console.log("\n--- TEST 14: Save & Load State Serialization ---");
{
  const game = new WordTilesGame({ seed: 12345 });
  const tileFromRack = game.humanRack.pop();
  tileFromRack.letter = 'A';
  game.board.setTile(7, 7, tileFromRack, true);
  game.state.humanScore = 45;
  game.state.aiScore = 32;

  const snapshot = game.serialize();
  assert(snapshot && snapshot.board && snapshot.bag, "Game serialized successfully");

  const restoredGame = new WordTilesGame({ seed: 999 });
  const success = restoredGame.deserialize(snapshot);
  assert(success, "Game deserialized successfully");
  assert(restoredGame.state.humanScore === 45, "Restored human score matches (45)");
  assert(restoredGame.state.aiScore === 32, "Restored AI score matches (32)");
  assert(restoredGame.board.getCell(7, 7).tile.letter === 'A', "Restored board tile matches 'A'");
  assert(restoredGame.assertConservation(), "100 tiles conserved after restore");
}

// ----------------------------------------------------------------------------
// TEST 15: Computer Opponent Move Legality & Same-Engine Validation
// ----------------------------------------------------------------------------
console.log("\n--- TEST 15: AI Opponent Legality & Validation ---");
{
  const game = new WordTilesGame({ seed: 54321 });
  // Give AI a deterministic rack capable of playing "AT" on center star (7, 7)
  const letters = ['A', 'T', 'S', 'E', 'R', 'P', 'D'];
  for (let i = 0; i < 7; i++) {
    game.aiRack[i].letter = letters[i];
    game.aiRack[i].score = (letters[i] === 'P' ? 3 : (letters[i] === 'D' ? 2 : 1));
  }
  game.state.turn = 'ai';

  // Execute AI turn asynchronously
  const aiDecision = await game.aiPlayer.findBestMove(game.board, game.aiRack, dict, game.bag);
  assert(aiDecision && aiDecision.action === 'play', "AI found a valid opening move");
  
  // Verify using authoritative validator
  const validation = BoardValidator.validateMove(game.board, aiDecision.placements, dict);
  assert(validation.valid, `AI move verified legal by authoritative validator: '${validation.words[0].text}'`);
}

// ----------------------------------------------------------------------------
// TEST 16: Duplicate Commit Prevention
// ----------------------------------------------------------------------------
console.log("\n--- TEST 16: Duplicate Commit Prevention ---");
{
  const game = new WordTilesGame({ seed: 8888 });
  dict.insert('NO');
  game.humanRack[0].letter = 'N';
  game.humanRack[0].score = 1;
  game.humanRack[1].letter = 'O';
  game.humanRack[1].score = 1;
  game.placeTileFromRack(0, 7, 7);
  game.placeTileFromRack(0, 7, 8);

  const firstCommit = game.commitHumanMove();
  assert(firstCommit.success, "First commit succeeds");

  // Attempt immediate duplicate commit
  const secondCommit = game.commitHumanMove();
  assert(!secondCommit.success, "Duplicate commit is rejected (no uncommitted tiles / not human turn)");
}

// ----------------------------------------------------------------------------
// TEST 17: Turn-Based P2P Move Synchronization (Shared Board Head-to-Head)
// ----------------------------------------------------------------------------
console.log("\n--- TEST 17: Turn-Based P2P Move Synchronization ---");
{
  // Player 1 (Host) and Player 2 (Guest) connect with identical seed 77777
  const player1Game = new WordTilesGame({ seed: 77777, p2pRole: 'host', dictionary: dict });
  const player2Game = new WordTilesGame({ seed: 77777, p2pRole: 'guest', dictionary: dict });

  // Player 1 plays opening move "CAT" covering center star [7,7]
  dict.insert('CAT');
  player1Game.humanRack[0].letter = 'C'; player1Game.humanRack[0].score = 3;
  player1Game.humanRack[1].letter = 'A'; player1Game.humanRack[1].score = 1;
  player1Game.humanRack[2].letter = 'T'; player1Game.humanRack[2].score = 1;
  player1Game.placeTileFromRack(0, 7, 6);
  player1Game.placeTileFromRack(0, 7, 7);
  player1Game.placeTileFromRack(0, 7, 8);

  const p1Commit = player1Game.commitHumanMove();
  assert(p1Commit.success, "Player 1 committed opening move 'CAT'");
  assert(p1Commit.movePayload && p1Commit.movePayload.placements.length === 3, "Player 1 generated valid P2P move payload");

  // Transmit P2P move over network/channel to Player 2
  const syncSuccess = player2Game.applyRemoteMove(p1Commit.movePayload, 'Alice');
  assert(syncSuccess, "Player 2 successfully applied remote P2P move");
  assert(player2Game.board.getCell(7, 7).tile.letter === 'A', "Player 2's board synchronized 'A' on center [7, 7]");
  assert(player2Game.board.getCell(7, 6).tile.letter === 'C', "Player 2's board synchronized 'C' on [7, 6]");
  assert(player2Game.board.getCell(7, 8).tile.letter === 'T', "Player 2's board synchronized 'T' on [7, 8]");
  assert(player2Game.state.aiScore === player1Game.state.humanScore, "Player 2's recorded opponent score matches Player 1's score");
  assert(player2Game.state.turn === 'human', "Turn successfully handed to Player 2!");

  // Player 2 plays "AT" vertically connecting to 'C' at (7, 6) forming "CUP" or extends 'T'
  dict.insert('TO');
  player2Game.humanRack[0].letter = 'O'; player2Game.humanRack[0].score = 1;
  player2Game.placeTileFromRack(0, 8, 8); // (7, 8) is 'T', (8, 8) is 'O' => forms "TO"
  const p2Commit = player2Game.commitHumanMove();
  assert(p2Commit.success, "Player 2 committed connected cross-word 'TO'");

  // Transmit Player 2's move back to Player 1
  player1Game.applyRemoteMove(p2Commit.movePayload, 'Bob');
  assert(player1Game.board.getCell(8, 8).tile.letter === 'O', "Player 1's board synchronized Player 2's 'O'");
  assert(player1Game.state.turn === 'human', "Turn handed back to Player 1!");
  assert(player1Game.board.getCommittedTileCount() === player2Game.board.getCommittedTileCount(), "Both boards share identical committed tile count (4 tiles)");
}

// ----------------------------------------------------------------------------
// TEST 18: WordTilesP2PManager Protocol & Match Code Serialization
// ----------------------------------------------------------------------------
console.log("\n--- TEST 18: WordTilesP2PManager Protocol & Match Code Serialization ---");
{
  const hostMgr = new WordTilesP2PManager({ playerName: 'Alice' });
  const hostRoom = hostMgr.hostRoom(987654);

  assert(hostRoom.roomId.startsWith('WORD-P2P-'), `Room ID format generated properly: ${hostRoom.roomId}`);
  assert(hostRoom.seed === 987654, "Deterministic seed conserved in room info");
  assert(typeof hostRoom.matchCode === 'string' && hostRoom.matchCode.length > 0, "Base64 match code generated");

  // Guest joins using shareable match code
  const guestMgr = new WordTilesP2PManager({ playerName: 'Bob' });
  guestMgr.joinByCode(hostRoom.matchCode);

  assert(guestMgr.role === 'guest', "Guest role assigned");
  assert(guestMgr.roomId === hostRoom.roomId, "Guest roomId matches Host roomId");
  assert(guestMgr.seed === 987654, "Guest receives identical deterministic seed");

  // Clean up
  hostMgr.destroy();
  guestMgr.destroy();
}


// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log("\n=================================================");
console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
}
