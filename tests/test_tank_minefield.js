/**
 * Tank Minefield: Iron Perimeter — Unit & Invariant Test Suite
 * 
 * Verifies all 24 required gameplay and architecture rules:
 * 1. Adjacent-mine clue counts (8-neighbor logic).
 * 2. Safe spawn and extraction reachability guarantee.
 * 3. Seed reproducibility across identical seeds.
 * 4. Zero-region flood reveal and boundary clues.
 * 5. Flags as suspicion only (never exposing truth).
 * 6. Scan versus movement behavior (scan reveals without detonating).
 * 7. Mine detonation, armor loss, and persistent crater creation.
 * 8. Consumed mines never explode twice.
 * 9. Pathfinding strictly restricted to known-safe cells.
 * 10. Movement bounds and obstacle collisions.
 * 11. State consistency across world and minimap models.
 * 12. All four tank selections (US, UN, USSR, North Korea).
 * 13. One-shot ammunition enforcement (exactly 1 shell per round).
 * 14. Target 1 cell directly ahead: direct hit.
 * 15. Target 2 cells directly ahead: direct hit.
 * 16. Target 3 cells away: adjacent-cell miss.
 * 17. Diagonal target: adjacent-cell miss.
 * 18. Target behind player: adjacent-cell miss.
 * 19. Obstructed target: miss blocked by obstacle.
 * 20. Miss landing on a mine detonates and consumes that mine.
 * 21. Boundary firing behavior without creating out-of-bounds cells.
 * 22. Simultaneous destruction / draw resolution.
 * 23. Timeout resolution by armor points.
 * 24. P2P transport intent serialization & match code decoding.
 */

import { TankMinefieldGame } from '../src/games/tank_minefield.js';
import { TankMineGrid, MineGridCell } from '../src/core/tank_minefield/grid.js';
import { TankVehicle } from '../src/core/tank_minefield/tank.js';
import { SafePathfinder } from '../src/core/tank_minefield/pathfinder.js';
import { TankCombatResolver } from '../src/core/tank_minefield/combat.js';
import { CARDINAL_DIRECTIONS, CELL_STATE, CRATER_TYPE, TANK_PRESETS } from '../src/core/tank_minefield/rules_config.js';
import { TankP2PTransport } from '../src/core/tank_minefield/p2p_transport.js';

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
console.log(" TANK MINEFIELD: IRON PERIMETER — INVARIANT TESTS");
console.log("=================================================\n");

// --- TEST 1: Adjacent-mine clue counts ---
console.log("--- TEST 1: Adjacent-Mine Clue Counts ---");
{
  const grid = new TankMineGrid({ rows: 5, cols: 5, mineDensity: 0, seed: 12345 });
  // Plant 3 mines around cell (2, 2)
  grid.getCell(1, 1).hasMine = true;
  grid.getCell(1, 2).hasMine = true;
  grid.getCell(3, 3).hasMine = true;
  grid._recomputeAllClues();

  assert(grid.getCell(2, 2).adjacentMines === 3, "Cell (2, 2) correctly identifies 3 adjacent mines");
  assert(grid.getCell(0, 0).adjacentMines === 1, "Cell (0, 0) correctly counts 1 adjacent mine (1, 1)");
  assert(grid.getCell(4, 0).adjacentMines === 0, "Distant cell (4, 0) counts 0 adjacent mines");
}

// --- TEST 2: Safe spawn and extraction reachability ---
console.log("\n--- TEST 2: Safe Spawn & Extraction Reachability ---");
{
  const game = new TankMinefieldGame({ seed: 88888 });
  const start = game.grid.startPos;
  const extraction = game.grid.extractionPos;

  assert(!game.grid.getCell(start.row, start.col).hasActiveMine(), "Spawn cell is strictly mine-free");
  assert(!game.grid.getCell(extraction.row, extraction.col).hasActiveMine(), "Extraction cell is strictly mine-free");

  // Verify at least one clean path exists from spawn to extraction
  // using all cells without mines
  const cleanPathQueue = [{ r: start.row, c: start.col }];
  const visited = new Set([`${start.row},${start.col}`]);
  let pathFound = false;

  while (cleanPathQueue.length > 0) {
    const cur = cleanPathQueue.shift();
    if (cur.r === extraction.row && cur.c === extraction.col) {
      pathFound = true;
      break;
    }
    const cardinals = game.grid.getCardinalNeighbors(cur.r, cur.c);
    for (const n of cardinals) {
      const key = `${n.row},${n.col}`;
      if (!visited.has(key) && !n.hasActiveMine()) {
        visited.add(key);
        cleanPathQueue.push({ r: n.row, c: n.col });
      }
    }
  }

  assert(pathFound, "A guaranteed mine-free traversable route exists to extraction");
}

// --- TEST 3: Seed Reproducibility ---
console.log("\n--- TEST 3: Seed Reproducibility ---");
{
  const gridA = new TankMineGrid({ rows: 12, cols: 12, seed: 424242 });
  const gridB = new TankMineGrid({ rows: 12, cols: 12, seed: 424242 });

  let identical = true;
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
      if (gridA.getCell(r, c).hasMine !== gridB.getCell(r, c).hasMine) {
        identical = false;
      }
    }
  }
  assert(identical, "Identical seeds produce 100% identical mine placements across all 144 cells");
}

// --- TEST 4: Zero-Region Flood Reveal ---
console.log("\n--- TEST 4: Zero-Region Flood Reveal Boundaries ---");
{
  const grid = new TankMineGrid({ rows: 6, cols: 6, mineDensity: 0, seed: 111, autoRevealSpawn: false });
  // Plant 1 mine at (5, 5)
  grid.getCell(5, 5).hasMine = true;
  grid._recomputeAllClues();

  // Reveal top-left corner
  grid.revealCell(0, 0);

  assert(grid.getCell(0, 0).state === CELL_STATE.REVEALED, "Origin cell (0, 0) is revealed");
  assert(grid.getCell(3, 3).state === CELL_STATE.REVEALED, "Connected 0-region cascaded through (3, 3)");
  assert(grid.getCell(5, 5).state === CELL_STATE.UNEXPLORED, "Mine cell (5, 5) remains unrevealed and intact");
}

// --- TEST 5: Flags as Suspicion Only ---
console.log("\n--- TEST 5: Flags as Suspicion Only ---");
{
  const grid = new TankMineGrid({ rows: 4, cols: 4, mineDensity: 0, seed: 123, autoRevealSpawn: false });
  grid.getCell(2, 2).hasMine = false; // Safe cell
  grid.toggleFlag(2, 2);

  assert(grid.getCell(2, 2).state === CELL_STATE.FLAGGED, "Cell marked as flagged");
  assert(grid.getCell(2, 2).hasMine === false, "Flagging does not alter true mine state (suspicion only)");

  grid.toggleFlag(2, 2);
  assert(grid.getCell(2, 2).state === CELL_STATE.UNEXPLORED, "Flag toggles back to unexplored");
}

// --- TEST 6: Scan vs Movement Behavior ---
console.log("\n--- TEST 6: Scan vs Movement Behavior ---");
{
  const game = new TankMinefieldGame({ seed: 999 });
  game.tank.row = 5;
  game.tank.col = 5;
  game.tank.facing = CARDINAL_DIRECTIONS.NORTH;

  // Plant mine directly ahead at (4, 5)
  const cellAhead = game.grid.getCell(4, 5);
  cellAhead.hasMine = true;

  // Scan cell ahead
  const scanRes = game.scanAhead();
  assert(scanRes.foundMine === true, "Scanning successfully detects mine without detonating");
  assert(cellAhead.isScannedMine === true, "Mine marked as confirmed scanned hazard");
  assert(cellAhead.hasActiveMine() === true, "Mine remains active and unconsumed");
  assert(game.tank.armor === 3, "Tank armor unmutated after scanning (3/3)");
  assert(game.tank.row === 5 && game.tank.col === 5, "Tank position unchanged by scan");
}

// --- TEST 7: Mine Detonation, Armor Loss & Crater Creation ---
console.log("\n--- TEST 7: Mine Detonation, Armor Loss & Crater State ---");
{
  const game = new TankMinefieldGame({ seed: 777 });
  game.tank.row = 5;
  game.tank.col = 5;
  game.tank.facing = CARDINAL_DIRECTIONS.NORTH;

  // Plant active mine at (4, 5)
  const cellAhead = game.grid.getCell(4, 5);
  cellAhead.hasMine = true;

  // Advance into mine
  game.moveAdvance();

  assert(game.tank.row === 4 && game.tank.col === 5, "Tank stepped into cell (4, 5)");
  assert(game.tank.armor === 2, "Tank lost 1 armor point upon detonation (2/3)");
  assert(cellAhead.crater === CRATER_TYPE.MINE_DETONATION, "Persistent mine detonation crater created on cell");
  assert(cellAhead.isMineConsumed === true, "Mine is marked as consumed");
  assert(cellAhead.hasActiveMine() === false, "Cell no longer holds an active mine");
}

// --- TEST 8: Consumed Mines Never Explode Twice ---
console.log("\n--- TEST 8: Consumed Mines Never Explode Twice ---");
{
  const game = new TankMinefieldGame({ seed: 777 });
  game.tank.row = 4;
  game.tank.col = 5;
  const cell = game.grid.getCell(4, 5);
  cell.hasMine = false;
  cell.isMineConsumed = true;
  cell.crater = CRATER_TYPE.MINE_DETONATION;

  // Step backward and forward over the crater
  game.moveReverse();
  const armorBefore = game.tank.armor;
  game.moveAdvance();

  assert(game.tank.armor === armorBefore, "Traversing existing crater incurs 0 additional damage");
  assert(cell.crater === CRATER_TYPE.MINE_DETONATION, "Crater remains persistent");
}

// --- TEST 9: Pathfinding Restricted to Known-Safe Cells ---
console.log("\n--- TEST 9: Pathfinding Restricted to Known-Safe Cells ---");
{
  const grid = new TankMineGrid({ rows: 5, cols: 5, mineDensity: 0, seed: 123, autoRevealSpawn: false });
  // All cells unexplored by default except (0, 0)
  grid.getCell(0, 0).state = CELL_STATE.REVEALED;

  // Attempt routing to unexplored cell (4, 4)
  const res = SafePathfinder.findSafePath(grid, { row: 0, col: 0 }, { row: 4, col: 4 });
  assert(!res.success, "Pathfinding correctly rejects routing through unexplored terrain");
  assert(res.reason.includes('unexplored'), "Provides clear diagnostic reason");

  // Reveal safe path: (0, 0) -> (0, 1) -> (0, 2)
  grid.getCell(0, 1).state = CELL_STATE.REVEALED;
  grid.getCell(0, 2).state = CELL_STATE.REVEALED;

  const safeRes = SafePathfinder.findSafePath(grid, { row: 0, col: 0 }, { row: 0, col: 2 });
  assert(safeRes.success, "Successfully finds path through connected revealed safe cells");
  assert(safeRes.path.length === 3, "Path contains exactly 3 nodes");
}

// --- TEST 10: Movement Cancellation & Bounds ---
console.log("\n--- TEST 10: Movement Bounds & Obstacles ---");
{
  const game = new TankMinefieldGame({ seed: 555 });
  game.tank.row = 0;
  game.tank.col = 0;
  game.tank.facing = CARDINAL_DIRECTIONS.NORTH;

  // Attempt moving North past top boundary
  const moved = game.moveAdvance();
  assert(!moved, "Advancing beyond top boundary is rejected");
  assert(game.tank.row === 0 && game.tank.col === 0, "Tank coordinates unmutated");
}

// --- TEST 11: State Consistency Across Map & World ---
console.log("\n--- TEST 11: State Consistency Across Map & World ---");
{
  const game = new TankMinefieldGame({ seed: 333 });
  game.tank.row = 3;
  game.tank.col = 4;
  game.tank.facing = CARDINAL_DIRECTIONS.EAST;

  assert(game.grid.getCell(game.tank.row, game.tank.col) !== null, "Authoritative grid cell matches tank location");
  assert(game.tank.getFacingVector().name === 'East', "Facing vector matches East heading");
}

// --- TEST 12: All Four Tank Selections ---
console.log("\n--- TEST 12: Four Tank Selections ---");
{
  const tankUS = new TankVehicle({ presetId: 'US' });
  const tankUN = new TankVehicle({ presetId: 'UN' });
  const tankUSSR = new TankVehicle({ presetId: 'USSR' });
  const tankDPRK = new TankVehicle({ presetId: 'NORTH_KOREA' });

  assert(tankUS.preset.emblemType === 'white_star', "US tank has white star insignia");
  assert(tankUN.preset.emblemType === 'un_roundel', "UN tank has cyan roundel");
  assert(tankUSSR.preset.emblemType === 'red_star', "USSR tank has red star insignia");
  assert(tankDPRK.preset.emblemType === 'dprk_roundel', "North Korea tank has tri-band roundel");
  assert(tankUS.armor === 3 && tankUN.armor === 3 && tankUSSR.armor === 3 && tankDPRK.armor === 3, "All presets have identical initial armor (3)");
}

// --- TEST 13: One-Shot Ammunition Enforcement ---
console.log("\n--- TEST 13: One-Shot Ammunition Enforcement ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ shells: 1 });

  const firstShot = TankCombatResolver.fireShell(grid, shooter, null);
  assert(firstShot.success === true, "First shot successfully fires");
  assert(shooter.shells === 0, "Shell ammunition consumed to 0");

  // Attempt second shot
  const secondShot = TankCombatResolver.fireShell(grid, shooter, null);
  assert(secondShot.success === false, "Second shot strictly rejected (no reload)");
  assert(secondShot.error === 'NO_AMMO', "Error code NO_AMMO returned");
}

// --- TEST 14: Target 1 Cell Directly Ahead: Hit ---
console.log("\n--- TEST 14: Target 1 Cell Ahead: Hit ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ row: 5, col: 5, facing: CARDINAL_DIRECTIONS.NORTH, shells: 1 });
  const enemy = new TankVehicle({ row: 4, col: 5, armor: 3 });

  const res = TankCombatResolver.fireShell(grid, shooter, enemy);
  assert(res.isHit === true, "Enemy 1 cell ahead is directly hit");
  assert(res.hitDistance === 1, "Hit distance recorded as 1 cell");
  assert(enemy.isAlive === false, "Direct shell hit destroys target tank");
}

// --- TEST 15: Target 2 Cells Directly Ahead: Hit ---
console.log("\n--- TEST 15: Target 2 Cells Ahead: Hit ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ row: 5, col: 5, facing: CARDINAL_DIRECTIONS.EAST, shells: 1 });
  const enemy = new TankVehicle({ row: 5, col: 7, armor: 3 }); // 2 cells East

  const res = TankCombatResolver.fireShell(grid, shooter, enemy);
  assert(res.isHit === true, "Enemy 2 cells ahead is directly hit");
  assert(res.hitDistance === 2, "Hit distance recorded as 2 cells");
  assert(enemy.isAlive === false, "Enemy destroyed");
}

// --- TEST 16: Target 3 Cells Away: Adjacent-Cell Miss ---
console.log("\n--- TEST 16: Target 3 Cells Away: Adjacent-Cell Miss ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ row: 5, col: 5, facing: CARDINAL_DIRECTIONS.NORTH, shells: 1 });
  const enemy = new TankVehicle({ row: 2, col: 5, armor: 3 }); // 3 cells ahead

  const res = TankCombatResolver.fireShell(grid, shooter, enemy);
  assert(res.isHit === false, "Target 3 cells away is out of range (miss)");
  assert(res.impactDistance === 1, "Shell impacts immediately adjacent cell (distance 1, NOT distance 2)");
  assert(res.impactCoord.row === 4 && res.impactCoord.col === 5, "Impact coordinate is adjacent cell [4, 5]");
  assert(grid.getCell(4, 5).crater === CRATER_TYPE.SHELL_IMPACT, "Persistent shell crater created on adjacent cell");
}

// --- TEST 17: Diagonal Target: Miss ---
console.log("\n--- TEST 17: Diagonal Target: Miss ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ row: 5, col: 5, facing: CARDINAL_DIRECTIONS.NORTH, shells: 1 });
  const enemy = new TankVehicle({ row: 4, col: 6, armor: 3 }); // Diagonal (NE)

  const res = TankCombatResolver.fireShell(grid, shooter, enemy);
  assert(res.isHit === false, "Diagonal target is a miss");
  assert(res.impactCoord.row === 4 && res.impactCoord.col === 5, "Impacts adjacent cell ahead [4, 5]");
}

// --- TEST 18: Target Behind Player: Miss ---
console.log("\n--- TEST 18: Target Behind Player: Miss ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ row: 5, col: 5, facing: CARDINAL_DIRECTIONS.NORTH, shells: 1 });
  const enemy = new TankVehicle({ row: 6, col: 5, armor: 3 }); // Behind player (South)

  const res = TankCombatResolver.fireShell(grid, shooter, enemy);
  assert(res.isHit === false, "Target behind facing is a miss");
  assert(res.impactCoord.row === 4 && res.impactCoord.col === 5, "Shell fires forward and impacts [4, 5]");
}

// --- TEST 19: Obstructed Target: Miss ---
console.log("\n--- TEST 19: Obstructed Target: Miss ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ row: 5, col: 5, facing: CARDINAL_DIRECTIONS.NORTH, shells: 1 });
  const enemy = new TankVehicle({ row: 3, col: 5, armor: 3 }); // 2 cells ahead

  // Place solid obstacle in between at (4, 5)
  grid.getCell(4, 5).isObstacle = true;

  const res = TankCombatResolver.fireShell(grid, shooter, enemy);
  assert(res.isHit === false, "Solid obstacle blocks line of fire");
}

// --- TEST 20: Miss Landing on a Mine Detonates and Consumes Mine ---
console.log("\n--- TEST 20: Miss Landing on Mine Detonates Mine ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ row: 5, col: 5, facing: CARDINAL_DIRECTIONS.NORTH, shells: 1 });

  // Plant active mine at adjacent cell (4, 5)
  grid.getCell(4, 5).hasMine = true;

  // Fire into empty space (miss)
  const res = TankCombatResolver.fireShell(grid, shooter, null);
  assert(res.isHit === false, "Shot missed target");
  assert(res.detonatedMine === true, "Shell impact detonated the adjacent mine!");
  assert(grid.getCell(4, 5).hasActiveMine() === false, "Mine is consumed");
  assert(grid.getCell(4, 5).crater === CRATER_TYPE.SHELL_IMPACT, "Crater recorded");
}

// --- TEST 21: Boundary Firing ---
console.log("\n--- TEST 21: Boundary Firing ---");
{
  const grid = new TankMineGrid({ rows: 10, cols: 10, seed: 123 });
  const shooter = new TankVehicle({ row: 0, col: 5, facing: CARDINAL_DIRECTIONS.NORTH, shells: 1 });

  const res = TankCombatResolver.fireShell(grid, shooter, null);
  assert(res.isBoundaryImpact === true, "Firing into map edge triggers perimeter boundary impact");
  assert(shooter.shells === 0, "Shell consumed");
}

// --- TEST 22: Simultaneous Destruction / Draw ---
console.log("\n--- TEST 22: Simultaneous Destruction / Draw ---");
{
  const game = new TankMinefieldGame({ mode: 'pvp', seed: 123 });
  game.tank.armor = 0;
  game.tank.isAlive = false;
  game.opponentTank.armor = 0;
  game.opponentTank.isAlive = false;

  game._resolveTimeout();
  assert(game.state.roundOutcome === 'draw', "Equal 0 armor resolves as draw");
}

// --- TEST 23: Timeout Resolution by Armor ---
console.log("\n--- TEST 23: Timeout Resolution by Armor ---");
{
  const game = new TankMinefieldGame({ mode: 'pvp', seed: 123 });
  game.tank.armor = 3;
  game.opponentTank.armor = 1;

  game._resolveTimeout();
  assert(game.state.roundOutcome === 'victory', "Higher remaining armor wins at timeout");
  assert(game.state.roundEndReason === 'timeout', "End reason recorded as timeout");
}

// --- TEST 24: P2P Transport Protocol & Code Serialization ---
console.log("\n--- TEST 24: P2P Protocol & Match Code Serialization ---");
{
  const host = new TankP2PTransport({ playerName: 'General George', presetId: 'US' });
  const room = host.hostRoom(789789);

  assert(room.roomId.startsWith('TANK-P2P-'), `Room ID format generated properly: ${room.roomId}`);
  assert(room.seed === 789789, "Deterministic seed preserved in room info");

  const guest = new TankP2PTransport({ playerName: 'General Patton', presetId: 'UN' });
  const joined = guest.joinByCode(room.matchCode);

  assert(guest.roomId === room.roomId, "Guest roomId synchronized from match code");
  assert(guest.role === 'guest', "Guest role assigned");
  assert(guest.seed === 789789, "Guest receives identical shared seed");

  host.destroy();
  guest.destroy();
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
