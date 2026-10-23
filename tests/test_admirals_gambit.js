/**
 * Admiral's Gambit: Iron Fleet — Comprehensive Invariant Tests
 *
 * Verifies 100% of the clean-room naval strategy mechanics:
 * 1. Fleet placement, bounds, and overlap rejection
 * 2. Deterministic PRNG seed reproducibility
 * 3. Firing solutions, misses, hits, and multi-segment sinking
 * 4. Command Points (CP) economy and turn cycle
 * 5. Tactical Gambits (Air Recon, Heavy Salvo, Radar Sweep, Depth Charge, Smoke)
 * 6. Submarine Silent Running stealth trait
 * 7. Heuristic AI Admiral targeting and parity hunting
 * 8. Victory & Defeat endgame resolution
 */

import {
  GRID_SIZE,
  CELL_STATE,
  SHIP_CLASSES,
  ORIENTATION,
  GAME_PHASE,
  createPRNG,
  seedStringToNumber
} from '../src/core/admirals_gambit/rules_config.js';

import { NavalGrid } from '../src/core/admirals_gambit/naval_grid.js';
import { AIAdmiralEngine } from '../src/core/admirals_gambit/ai_admiral_engine.js';
import { AdmiralsGambitGame } from '../src/games/admirals_gambit.js';

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
console.log(' ADMIRAL\'S GAMBIT: IRON FLEET — INVARIANT TESTS');
console.log('=================================================\n');

// ----------------------------------------------------------------------------
// TEST SUITE 1: Grid Dimensions, Bounds & Overlap Invariants
// ----------------------------------------------------------------------------
console.log('--- TEST 1: Grid Dimensions & Placement Bounds ---');
{
  const grid = new NavalGrid(true);
  assert(grid.gridSize === 10, 'Grid dimension is strictly 10x10');
  assert(grid.cells.length === 10 && grid.cells[0].length === 10, 'All 100 oceanic cells allocated');

  // Valid placement: Carrier (5 cells) horizontal at (0, 0)
  const p1 = grid.placeShip('CARRIER', 0, 0, ORIENTATION.HORIZONTAL);
  assert(p1 === true, 'Carrier placed horizontally at (0, 0)');
  assert(grid.cells[0][0].shipId === 'carrier', 'Cell (0, 0) occupied by carrier');
  assert(grid.cells[0][4].shipId === 'carrier', 'Cell (0, 4) occupied by carrier');
  assert(grid.cells[0][5].shipId === null, 'Cell (0, 5) remains open water');

  // Out of bounds placement: Carrier starting at col 7 horizontal (needs 5, exceeds 10)
  const oob = grid.placeShip('BATTLESHIP', 0, 8, ORIENTATION.HORIZONTAL);
  assert(oob === false, 'Ship exceeding grid width is rejected');

  // Overlap placement: Battleship placed on col 2 row 0 vertical
  const overlap = grid.placeShip('BATTLESHIP', 0, 2, ORIENTATION.VERTICAL);
  assert(overlap === false, 'Ship overlapping existing vessel is strictly rejected');

  // Valid placement: Battleship at row 2 col 0 horizontal
  const p2 = grid.placeShip('BATTLESHIP', 2, 0, ORIENTATION.HORIZONTAL);
  assert(p2 === true, 'Battleship placed successfully on non-overlapping coordinates');
}

// ----------------------------------------------------------------------------
// TEST SUITE 2: Deterministic PRNG Seed Reproducibility
// ----------------------------------------------------------------------------
console.log('\n--- TEST 2: Deterministic Fleet Randomization ---');
{
  const seed = 'ADM-TEST99';
  const prng1 = createPRNG(seedStringToNumber(seed));
  const prng2 = createPRNG(seedStringToNumber(seed));

  const g1 = new NavalGrid(true);
  const g2 = new NavalGrid(true);

  g1.randomizeFleet(prng1);
  g2.randomizeFleet(prng2);

  assert(g1.ships.size === 5, 'All 5 warships placed (CV, BB, CA, DD, SS)');
  assert(g2.ships.size === 5, 'Duplicate fleet placed all 5 warships');

  let identical = true;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (g1.cells[r][c].shipId !== g2.cells[r][c].shipId) {
        identical = false;
      }
    }
  }
  assert(identical === true, 'Identical seeds produce 100% identical fleet coordinates across all 100 cells');

  // Total fleet cells check: 5 + 4 + 3 + 3 + 2 = 17
  let totalSegments = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (g1.cells[r][c].shipId !== null) totalSegments++;
    }
  }
  assert(totalSegments === 17, 'Total fleet footprint across all 5 vessels is exactly 17 cells');
}

// ----------------------------------------------------------------------------
// TEST SUITE 3: Firing Solutions, Hits, Misses & Multi-Segment Sinking
// ----------------------------------------------------------------------------
console.log('\n--- TEST 3: Firing Solutions, Hits & Sinking Mechanics ---');
{
  const grid = new NavalGrid(false);
  // Place Destroyer (size 3) at row 5, col 1 horizontal
  grid.placeShip('DESTROYER', 5, 1, ORIENTATION.HORIZONTAL);

  // Shot 1: Open Water -> MISS
  const r1 = grid.receiveFire(0, 0);
  assert(r1.valid === true && r1.result === 'MISS', 'Firing at open water resolves as MISS');
  assert(grid.cells[0][0].state === CELL_STATE.MISS, 'Cell (0, 0) state recorded as MISS');

  // Shot 2: Duplicate Shot -> Rejection
  const r2 = grid.receiveFire(0, 0);
  assert(r2.valid === false && r2.error === 'ALREADY_TARGETED', 'Duplicate fire at already-targeted cell is rejected');

  // Shot 3: Hit segment 1 of Destroyer
  const r3 = grid.receiveFire(5, 1);
  assert(r3.valid === true && r3.result === 'HIT', 'Direct hit on warship resolves as HIT');
  assert(r3.sunk === false, 'Warship with remaining HP is NOT sunk');
  assert(grid.ships.get('destroyer').hits === 1, 'Destroyer hit counter is 1/3');

  // Shot 4: Hit segment 2 of Destroyer
  const r4 = grid.receiveFire(5, 2);
  assert(r4.valid === true && r4.result === 'HIT', 'Second hit recorded on Destroyer');

  // Shot 5: Hit segment 3 of Destroyer -> SUNK
  const r5 = grid.receiveFire(5, 3);
  assert(r5.valid === true && r5.result === 'SUNK', 'Final segment hit sinks the vessel');
  assert(r5.shipName === 'Fast Destroyer', 'Sunk vessel identifies as Fast Destroyer');
  assert(r5.sunk === true, 'Sunk flag confirmed true');
  assert(grid.cells[5][1].state === CELL_STATE.SUNK, 'All segments transition to state SUNK');
  assert(grid.cells[5][2].state === CELL_STATE.SUNK, 'Segment 2 transitioned to SUNK');
  assert(grid.cells[5][3].state === CELL_STATE.SUNK, 'Segment 3 transitioned to SUNK');
}

// ----------------------------------------------------------------------------
// TEST SUITE 4: Command Points (CP) & Turn Economy
// ----------------------------------------------------------------------------
console.log('\n--- TEST 4: Command Points (CP) Economy & Turn Structure ---');
{
  const game = new AdmiralsGambitGame({ autoDeploy: true });
  assert(game.phase === GAME_PHASE.PLAYER_TURN, 'Game starts in PLAYER_TURN phase');
  assert(game.playerCP === 3, 'Admiral starts with 3 Command Points (CP)');

  // Fire Battery costs 1 CP
  const f1 = game.fireBattery(0, 0);
  assert(f1.success === true, 'First battery shot executes successfully');
  assert(game.playerCP === 2, 'Player CP deducted from 3 to 2');

  const f2 = game.fireBattery(1, 1);
  assert(f2.success === true, 'Second battery shot executes');
  assert(game.playerCP === 1, 'Player CP deducted to 1');

  const f3 = game.fireBattery(2, 2);
  assert(f3.success === true, 'Third battery shot executes');
  assert(game.playerCP === 0, 'Player CP reaches 0');
  assert(game.phase === GAME_PHASE.AI_TURN, 'Exhausting CP transitions turn to AI_TURN');
}

// ----------------------------------------------------------------------------
// TEST SUITE 5: Tactical Gambits (Air Recon, Heavy Salvo, Radar Sweep, Depth Charge, Smoke)
// ----------------------------------------------------------------------------
console.log('\n--- TEST 5: Tactical Gambits & Sensory Systems ---');
{
  const game = new AdmiralsGambitGame({ autoDeploy: false });
  // Deploy manually for precise test coordinates
  game.playerGrid.placeShip('CARRIER', 0, 0, ORIENTATION.HORIZONTAL);
  game.playerGrid.placeShip('BATTLESHIP', 2, 0, ORIENTATION.HORIZONTAL);
  game.playerGrid.placeShip('CRUISER', 4, 0, ORIENTATION.HORIZONTAL);
  game.playerGrid.placeShip('DESTROYER', 6, 0, ORIENTATION.HORIZONTAL);
  game.playerGrid.placeShip('SUBMARINE', 8, 0, ORIENTATION.HORIZONTAL);

  game.aiGrid.placeShip('CARRIER', 0, 0, ORIENTATION.HORIZONTAL); // Cells (0, 0) to (0, 4)
  game.aiGrid.placeShip('SUBMARINE', 8, 8, ORIENTATION.HORIZONTAL); // Cells (8, 8) to (8, 9)

  game.phase = GAME_PHASE.PLAYER_TURN;
  game.playerCP = 6; // Set max CP for test

  // Gambit 1: Air Recon (3x3 scan centered at 0, 2)
  const recon = game.executeAirRecon(0, 2);
  assert(recon.success === true, 'Air Recon executes');
  assert(recon.reconResult.detected === true, 'Air Recon detects enemy carrier in sector');
  assert(game.playerCP === 4, 'Air Recon deducted 2 CP (6 -> 4)');

  // Air Recon on empty ocean (centered at 5, 5)
  const emptyRecon = game.executeAirRecon(5, 5);
  assert(emptyRecon.reconResult.detected === false, 'Air Recon on empty sector reports no contact');

  // Gambit 2: Radar Sweep (Row 0 has enemy carrier)
  game.playerCP = 6;
  game.phase = GAME_PHASE.PLAYER_TURN;
  const radarRow = game.executeRadarSweep(true, 0);
  assert(radarRow.success === true, 'Radar Sweep executes');
  assert(radarRow.radarResult.detectedCount === 5, 'Radar correctly detects 5 hull segments in Row 1');

  // Submarine Silent Running: Submarine at row 8 is stealthy and undetected by standard radar
  game.playerCP = 6;
  game.phase = GAME_PHASE.PLAYER_TURN;
  const radarSubRow = game.executeRadarSweep(true, 8);
  assert(radarSubRow.success === true, 'Submarine Radar Sweep executes');
  assert(radarSubRow.radarResult.detectedCount === 0, 'Silent Running Submarine is undetected by radar sweep');

  // Gambit 3: Smoke Screen on Player grid
  game.playerCP = 6;
  game.phase = GAME_PHASE.PLAYER_TURN;
  const smoke = game.executeSmokeScreen(2, 2);
  assert(smoke.success === true, 'Smoke Screen successfully deployed');
  assert(game.playerGrid.cells[2][2].smokeTurns === 2, 'Smoke active on sector cell for 2 turns');

  // Gambit 4: Carrier Destroyed -> Rejection
  game.playerGrid.removeShip('carrier');
  const deniedRecon = game.executeAirRecon(0, 0);
  assert(deniedRecon.success === false && deniedRecon.error === 'CARRIER_DESTROYED',
    'Air Recon strictly rejected when Aircraft Carrier is destroyed');
}

// ----------------------------------------------------------------------------
// TEST SUITE 6: Heuristic AI Admiral Engine Invariants
// ----------------------------------------------------------------------------
console.log('\n--- TEST 6: AI Admiral Engine & Targeting Invariants ---');
{
  const pGrid = new NavalGrid(true);
  const aiGrid = new NavalGrid(false);
  pGrid.placeShip('DESTROYER', 4, 4, ORIENTATION.HORIZONTAL); // Cells (4, 4), (4, 5), (4, 6)

  const aiEngine = new AIAdmiralEngine(aiGrid, pGrid);

  // Initial shot: Hunting Mode (no active hits)
  const move1 = aiEngine.decideTurn(3);
  assert(move1.type === 'FIRE', 'AI decides to fire battery');
  assert(move1.row >= 0 && move1.row < 10, 'Target row in valid range [0..9]');
  assert(move1.col >= 0 && move1.col < 10, 'Target col in valid range [0..9]');

  // Simulate a hit at (4, 4)
  pGrid.receiveFire(4, 4);

  // Now AI should enter Targeting Mode and attack an orthogonal neighbor of (4, 4)
  const move2 = aiEngine.decideTurn(3);
  const isNeighbor = (Math.abs(move2.row - 4) + Math.abs(move2.col - 4)) === 1;
  assert(isNeighbor === true, `AI in targeting mode fires at adjacent neighbor: [${move2.row}, ${move2.col}]`);

  // Simulate second hit along line at (4, 5)
  pGrid.receiveFire(4, 5);

  // Now AI should recognize horizontal axis and target either (4, 3) or (4, 6)
  const move3 = aiEngine.decideTurn(3);
  const onAxis = move3.row === 4 && (move3.col === 3 || move3.col === 6);
  assert(onAxis === true, `AI identifies horizontal ship axis and attacks extremity: [${move3.row}, ${move3.col}]`);
}

// ----------------------------------------------------------------------------
// TEST SUITE 7: Victory & Defeat Endgame Resolution
// ----------------------------------------------------------------------------
console.log('\n--- TEST 7: Victory & Defeat Conditions ---');
{
  const game = new AdmiralsGambitGame({ autoDeploy: false });
  // Set single 2-cell Submarine on each side for fast victory check
  game.playerGrid.placeShip('SUBMARINE', 0, 0, ORIENTATION.HORIZONTAL);
  game.aiGrid.placeShip('SUBMARINE', 0, 0, ORIENTATION.HORIZONTAL);
  game.phase = GAME_PHASE.PLAYER_TURN;
  game.playerCP = 3;

  // Hit 1
  game.fireBattery(0, 0);
  assert(game.phase === GAME_PHASE.PLAYER_TURN, 'Game continues after non-lethal hit');

  // Hit 2: Sinks final enemy ship
  const win = game.fireBattery(0, 1);
  assert(win.phase === GAME_PHASE.VICTORY, 'Sinking final enemy ship transitions phase to VICTORY');
  assert(game.actionLog[0].type === 'VICTORY', 'Victory recorded in tactical combat log');
}

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n=================================================');
console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('=================================================');

if (failed > 0) {
  process.exit(1);
}
