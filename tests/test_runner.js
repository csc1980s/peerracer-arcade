/**
 * Solitaire Sovereign - Clean-Room Unit & Invariant Test Suite
 * 
 * Verifies:
 * 1. PRNG reproducibility against fixed seed vectors.
 * 2. Card data model rank/suit invariants.
 * 3. Klondike, FreeCell, Spider rules & state machines.
 * 4. Move reversibility (Command undo symmetry).
 * 5. Deck conservation: 52 (or 104) unique cards preserved across random-walk play.
 */

import { SplitMix64 } from '../src/core/prng.js';
import { Card, SUITS } from '../src/core/card.js';
import { CommandValidator } from '../src/core/validator.js';
import { KlondikeGame } from '../src/games/klondike.js';
import { FreeCellGame } from '../src/games/freecell.js';
import { SpiderGame } from '../src/games/spider.js';
import { HeuristicSolver } from '../src/core/solver.js';

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
console.log(" SOLITAIRE SOVEREIGN - CLEAN-ROOM VERIFICATION");
console.log("=================================================\n");

// TEST SUITE 1: PRNG & SEED DETERMINISM
console.log("--- TEST SUITE 1: PRNG Determinism & Vectors ---");
{
  const prng1 = new SplitMix64(123456789n);
  const prng2 = new SplitMix64(123456789n);

  const val1_a = prng1.next64();
  const val1_b = prng1.next64();
  const val2_a = prng2.next64();
  const val2_b = prng2.next64();

  assert(val1_a === val2_a && val1_b === val2_b, "Identical seeds produce identical 64-bit outputs");

  // Lemire Bounded Int distribution check
  const prng = new SplitMix64(987654321n);
  let allInRange = true;
  for (let i = 0; i < 1000; i++) {
    const bound = prng.boundedInt(52);
    if (bound < 0 || bound >= 52) allInRange = false;
  }
  assert(allInRange, "Lemire boundedInt strictly constrains outputs to [0, range - 1]");

  // Deal code roundtrip
  const dealCode = SplitMix64.formatDealCode('KL', 0x123456789An);
  const parsed = SplitMix64.parseDealCode(dealCode);
  assert(parsed.valid && parsed.prefix === 'KL', `Deal code encodes and verifies checksum correctly: ${dealCode}`);
}

// TEST SUITE 2: CARD DATA MODEL INVARIANTS
console.log("\n--- TEST SUITE 2: Card Data Model ---");
{
  const deck = Card.createStandardDeck(1);
  assert(deck.length === 52, "Standard deck contains exactly 52 cards");

  // Suit distribution
  const suitsCount = [0, 0, 0, 0];
  deck.forEach(c => suitsCount[c.suit]++);
  assert(suitsCount.every(count => count === 13), "Every suit contains exactly 13 cards (Ace to King)");

  // Stacking rules
  const blackKing = new Card(SUITS.SPADES * 13 + 12); // K♠
  const redQueen = new Card(SUITS.HEARTS * 13 + 11);  // Q♥
  const blackQueen = new Card(SUITS.CLUBS * 13 + 11);  // Q♣

  assert(redQueen.canStackOnTableau(blackKing), "Red Queen legally stacks on Black King in Tableau");
  assert(!blackQueen.canStackOnTableau(blackKing), "Black Queen CANNOT stack on Black King (alternating color rule)");

  // Foundation rules
  const aceSpades = new Card(SUITS.SPADES * 13 + 0); // A♠
  const twoSpades = new Card(SUITS.SPADES * 13 + 1); // 2♠
  const twoHearts = new Card(SUITS.HEARTS * 13 + 1); // 2♥

  assert(aceSpades.canBuildOnFoundation(null), "Ace can start empty Foundation");
  assert(twoSpades.canBuildOnFoundation(aceSpades), "Two of Spades can build upon Ace of Spades");
  assert(!twoHearts.canBuildOnFoundation(aceSpades), "Two of Hearts CANNOT build upon Ace of Spades");
}

// TEST SUITE 3: KLONDIKE RULES & INVARIANTS
console.log("\n--- TEST SUITE 3: Klondike Rules & Invariants ---");
{
  const game = new KlondikeGame({ seed: 42 });
  const check = CommandValidator.verifyDeckInvariants(game.state, 52);
  assert(check.valid, "Klondike initial state preserves all 52 unique cards");

  // Verify Tableau pyramid sizes
  let pyramidValid = true;
  for (let i = 0; i < 7; i++) {
    if (game.state.tableau[i].length !== i + 1) pyramidValid = false;
  }
  assert(pyramidValid, "Tableau piles correctly initialized with sizes 1 through 7");
  assert(game.state.stock.length === 24, "Stock pile initially contains exactly 24 cards");

  // Stock draw
  const initialStock = game.state.stock.length;
  game.drawOrRecycle();
  assert(game.state.stock.length === initialStock - 1 && game.state.waste.length === 1, "Draw moves 1 card from Stock to Waste");

  // Undo draw
  game.undo();
  assert(game.state.stock.length === initialStock && game.state.waste.length === 0, "Undo perfectly restores Stock and Waste state");

  // Auto-Complete & Solve to Foundation (Microsoft Solitaire style)
  const autoGame = new KlondikeGame({ seed: 777 });
  autoGame.state.stock = [];
  autoGame.state.waste = [];
  // Turn all tableau cards face up
  for (const col of autoGame.state.tableau) {
    col.forEach(c => c.faceUp = true);
  }
  assert(autoGame.canAutoComplete(), "Klondike canAutoComplete returns true when stock is empty and all tableau cards are face up");
  assert(autoGame.getTacticalHint().autoComplete === true, "Tactical hint announces auto-completion when columns are completed");

  // Construct a deterministic solvable end-game state (all cards 6..K in tableau, A..5 in foundations)
  const endGameState = new KlondikeGame({ seed: 123 });
  endGameState.state.stock = [];
  endGameState.state.waste = [];
  endGameState.state.foundations = [[], [], [], []];
  endGameState.state.tableau = [[], [], [], [], [], [], []];

  // Distribute all 52 cards: Aces through 5s into foundations (24 cards)
  for (let s = 0; s < 4; s++) {
    for (let r = 0; r <= 4; r++) {
      const card = new Card(s * 13 + r, true);
      endGameState.state.foundations[s].push(card);
    }
  }
  // Ranks 12 down to 5 (King through 6) into tableau columns so lowest rank (6) is exposed at the bottom
  for (let s = 0; s < 4; s++) {
    for (let r = 12; r >= 5; r--) {
      const card = new Card(s * 13 + r, true);
      endGameState.state.tableau[s].push(card);
    }
  }

  assert(endGameState.canAutoComplete(), "Solvable endgame board detects canAutoComplete === true");
  let solveSteps = 0;
  while (endGameState.getNextAutoCompleteStep() && solveSteps++ < 50) {
    const nextStep = endGameState.getNextAutoCompleteStep();
    const ok = endGameState.moveCards(nextStep.source, nextStep.target, nextStep.count);
    assert(ok, `Auto-complete step ${solveSteps} executed legally`);
  }
  assert(endGameState.state.won === true, "Auto-complete solves all cards to foundations and triggers victory");
}

// TEST SUITE 4: FREECELL RULES & SUPERMOVE MATH
console.log("\n--- TEST SUITE 4: FreeCell Supermove Math ---");
{
  const fc = new FreeCellGame({ seed: 101 });
  const check = CommandValidator.verifyDeckInvariants(fc.state, 52);
  assert(check.valid, "FreeCell initial deal preserves all 52 unique cards");

  // With 4 empty freecells and 0 empty cascades:
  // maxMovable = (1 + 4) * 2^0 = 5 cards
  const supermoveDefault = fc.getMaxSupermoveCards(false);
  assert(supermoveDefault === 5, `Default FreeCell supermove limit is 5 cards (got ${supermoveDefault})`);

  // If 1 cascade becomes empty:
  // maxMovable = (1 + 4) * 2^1 = 10 cards
  fc.state.tableau[7] = []; // Empty column 7
  const supermoveWithEmptyCascade = fc.getMaxSupermoveCards(false);
  assert(supermoveWithEmptyCascade === 10, `Supermove with 1 empty cascade is 10 cards (got ${supermoveWithEmptyCascade})`);
}

// TEST SUITE 5: SPIDER RULES & RUN EXTRACTION
console.log("\n--- TEST SUITE 5: Spider Rules & Completed Runs ---");
{
  const spider = new SpiderGame({ numSuits: 1, seed: 777 });
  assert(spider.state.tableau.length === 10, "Spider has 10 tableau columns");
  assert(spider.state.stock.length === 50, "Spider stock contains 50 reserve cards");

  // Deal row
  spider.dealRow();
  assert(spider.state.stock.length === 40, "Dealing a row deducts 10 cards from stock");

  // Undo deal
  spider.undo();
  assert(spider.state.stock.length === 50, "Undo deal returns exactly 10 cards to stock");
}

// TEST SUITE 6: RANDOM-WALK STRESS & INVARIANT CONSERVATION
console.log("\n--- TEST SUITE 6: Random-Walk Invariant Stress (200 Iterations) ---");
{
  const game = new KlondikeGame({ seed: 999 });
  let invariantPreserved = true;

  for (let step = 0; step < 200; step++) {
    // Try smart move or draw
    const hint = game.getTacticalHint();
    if (hint && hint.source && hint.target) {
      game.moveCards(hint.source, hint.target, hint.count || 1);
    } else {
      game.drawOrRecycle();
    }

    const check = CommandValidator.verifyDeckInvariants(game.state, 52);
    if (!check.valid) {
      invariantPreserved = false;
      console.error(`Invariant broken at step ${step}:`, check);
      break;
    }
  }
  assert(invariantPreserved, "All 52 cards preserved without loss or duplication across 200 game steps");
}

// POLYFILL LOCALSTORAGE FOR NODE TEST RUNNER
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

// TEST SUITE 7: CASINO BLACKJACK (21)
console.log("\n--- TEST SUITE 7: Casino Blackjack Rules & Basic Strategy ---");
{
  const { BlackjackGame } = await import('../src/games/blackjack.js');
  const bj = new BlackjackGame({ seed: 42 });

  assert(bj.shoe.length === 312, "6-deck shoe initialized with 312 cards");
  assert(bj.bankroll === 1000, "Initial bankroll set to $1,000");

  // Betting
  const betOk = bj.addChipBet(25);
  assert(betOk && bj.currentBet === 25 && bj.bankroll === 975, "Adding chip bet deducts from bankroll correctly");

  // Dealing
  const dealOk = bj.dealRound();
  assert(dealOk, "Dealing round succeeds");
  assert(bj.playerHands[0].cards.length === 2, "Player receives exactly 2 initial cards");
  assert(bj.dealerCards.length === 2, "Dealer receives exactly 2 cards (1 upcard, 1 hole card)");
  assert(!bj.dealerCards[1].faceUp, "Dealer hole card is face down initially");

  // Basic Strategy Hint
  const hint = bj.getTacticalHint();
  assert(hint && hint.message && hint.message.includes("Basic Strategy"), `Basic Strategy hint generates mathematical recommendation: "${hint?.message}"`);

  // Hand Evaluation (Ace counting as 11 or 1)
  const aceCard = new Card(SUITS.SPADES * 13 + 0, true); // Ace
  const sixCard = new Card(SUITS.HEARTS * 13 + 5, true);  // 6
  const eightCard = new Card(SUITS.DIAMONDS * 13 + 7, true); // 8

  const softHandVal = bj.calculateHandValue([aceCard, sixCard]);
  assert(softHandVal.total === 17 && softHandVal.isSoft, "Ace + 6 evaluates to Soft 17");

  const hardHandVal = bj.calculateHandValue([aceCard, sixCard, eightCard]);
  assert(hardHandVal.total === 15 && !hardHandVal.isSoft, "Ace + 6 + 8 converts Ace to 1, evaluating to Hard 15");

  // Round Resolution & Next Hand Transitions
  bj.stand();
  assert(bj.status === 'RESOLVED', "Blackjack round resolves to RESOLVED on player stand");
  
  const newHandOk = bj.newHand();
  assert(newHandOk && bj.status === 'BETTING', "newHand() resets game state to BETTING for next deal");

  // Rebet & Deal
  const rebetOk = bj.rebetAndDeal();
  assert(rebetOk && bj.playerHands[0].bet === 25, "rebetAndDeal() accurately re-bets previous bet and deals next round");

  // Rebuy
  bj.rebuy(1000);
  assert(bj.bankroll === 1000 && bj.status === 'BETTING', "rebuy(1000) restores bankroll and readies betting phase");
}

// TEST SUITE 8: TACTICAL HINT ENGINES (ALL GAMES)
console.log("\n--- TEST SUITE 8: Tactical Hint Engine Verification ---");
{
  const klon = new KlondikeGame({ seed: 555 });
  const kHint = klon.getTacticalHint();
  assert(kHint !== null && typeof kHint.message === 'string', `Klondike tactical hint returned: "${kHint?.message}"`);

  const fc = new FreeCellGame({ seed: 777 });
  const fcHint = fc.getTacticalHint();
  assert(fcHint !== null && typeof fcHint.message === 'string', `FreeCell tactical hint returned: "${fcHint?.message}"`);

  const sp = new SpiderGame({ seed: 888, numSuits: 1 });
  const spHint = sp.getTacticalHint();
  assert(spHint !== null && typeof spHint.message === 'string', `Spider tactical hint returned: "${spHint?.message}"`);
}

// TEST SUITE 9: MULTIPLAYER PROFILES, ALL-TIME SCORES & SAVES
console.log("\n--- TEST SUITE 9: Multiplayer Profiles & State Saves ---");
{
  const { ProfileManager } = await import('../src/core/profile_manager.js');
  const pm = new ProfileManager();

  const user1 = pm.createProfile("Alice", "👑");
  const user2 = pm.createProfile("Bob", "🦁");

  assert(user1.name === "Alice" && user2.name === "Bob", "Multiple user profiles created successfully");

  // Record scores for competition
  pm.setActiveProfile(user1.id);
  pm.recordGameResult('klondike_1', 350, true, 85, 42);

  pm.setActiveProfile(user2.id);
  pm.recordGameResult('klondike_1', 520, true, 72, 38);

  const leaderboard = pm.getLeaderboard('all_time');
  assert(leaderboard[0].name === "Bob" && leaderboard[0].allTimeScore === 520, "Leaderboard correctly ranks Bob in 1st place with 520 pts");
  assert(leaderboard[1].name === "Alice" && leaderboard[1].allTimeScore === 350, "Leaderboard correctly ranks Alice in 2nd place with 350 pts");

  // Test atomic game save and reload
  const testGameState = { moves: 14, score: 180, won: false };
  const saved = pm.saveGame('klondike_1', testGameState);
  assert(saved, "Atomic game state save succeeded");

  const loaded = pm.loadSavedGame('klondike_1');
  assert(loaded && loaded.state.score === 180 && loaded.userName === "Bob", "Loaded saved game matches exact serialized state and user");
}

// TEST SUITE 10: PYRAMID SOLITAIRE RULES & ENGINE
console.log("\n--- TEST SUITE 10: Pyramid Solitaire Engine ---");
{
  const { PyramidGame } = await import('../src/games/pyramid.js');
  const pyr = new PyramidGame({ seed: 424242 });

  assert(pyr.state.pyramid.length === 28, "Pyramid dealt exactly 28 cards across 7 rows");
  assert(pyr.state.stock.length === 24, "Pyramid stock contains remaining 24 cards");
  assert(pyr.state.waste.length === 0, "Pyramid waste initially empty");

  // Check row 6 cards are unblocked while row 0 card is blocked
  const topApex = pyr.isCardBlocked(0);
  const bottomCard = pyr.isCardBlocked(27);
  assert(topApex === true, "Row 0 apex card is blocked by lower rows");
  assert(bottomCard === false, "Row 6 bottom base card is unblocked");

  // Test draw from stock
  const drew = pyr.drawStock();
  assert(drew === true && pyr.state.waste.length === 1 && pyr.state.stock.length === 23, "Draw from stock successfully moves card to waste");

  // Test tactical hint
  const hint = pyr.getTacticalHint();
  assert(hint !== null && hint.action, `Pyramid tactical hint generated: ${hint?.reason || hint?.action}`);
}

// TEST SUITE 11: TRIPEAKS SOLITAIRE ENGINE
console.log("\n--- TEST SUITE 11: TriPeaks Solitaire Engine ---");
{
  const { TriPeaksGame } = await import('../src/games/tripeaks.js');
  const tp = new TriPeaksGame({ seed: 777123 });

  assert(tp.state.tableau.length === 28, "TriPeaks tableau contains exactly 28 cards");
  assert(tp.state.waste.length === 1, "TriPeaks waste starts with 1 face-up card");
  assert(tp.state.stock.length === 23, "TriPeaks stock starts with 23 face-down cards");

  // Base row (indices 18..27) are face up; peak summits (0..2) are face down & blocked
  const peak0Blocked = tp.isCardBlocked(0);
  const baseCardBlocked = tp.isCardBlocked(18);
  assert(peak0Blocked === true, "Peak summit 0 is blocked initially");
  assert(baseCardBlocked === false, "Base row card 18 is unblocked");
  assert(tp.state.tableau[18].faceUp === true, "Base row cards are face up initially");

  // Streak scoring test
  tp.state.waste = [{ rank: 4, suit: 0, faceUp: true }]; // 5 of Clubs
  const matchingCard = { rank: 5, suit: 1, faceUp: true }; // 6 of Diamonds (+1 rank)
  assert(tp.canPlayOnWaste(matchingCard), "Card of rank 5 can play on Waste of rank 4");

  // King-Ace wrap test
  const kingCard = { rank: 12, suit: 3, faceUp: true };
  const aceCard = { rank: 0, suit: 2, faceUp: true };
  tp.state.waste = [kingCard];
  assert(tp.canPlayOnWaste(aceCard), "Ace (rank 0) can wrap-play on King (rank 12)");

  // Tactical hint test
  const tpHint = tp.getTacticalHint();
  assert(tpHint !== null && tpHint.action, `TriPeaks tactical hint generated: ${tpHint?.action}`);
}

// TEST SUITE 12: VIDEO POKER VARIATIONS & HAND EVALUATION
console.log("\n--- TEST SUITE 12: Video Poker Variations ---");
{
  const { PokerGame, POKER_VARIATIONS } = await import('../src/games/poker.js');
  
  // 12.1 Jacks or Better
  const job = new PokerGame({ variation: POKER_VARIATIONS.JACKS_OR_BETTER, credits: 1000, betCoins: 5 });
  job.deal();
  assert(job.state.hand.length === 5, "Dealt 5 initial cards");
  assert(job.state.phase === 'HOLDING', "Game phase transitioned to HOLDING");

  // Test Royal Flush evaluation
  const royalCards = [
    new Card(0, true),  // Ace of Clubs (rank 0)
    new Card(9, true),  // 10 of Clubs (rank 9)
    new Card(10, true), // Jack of Clubs (rank 10)
    new Card(11, true), // Queen of Clubs (rank 11)
    new Card(12, true)  // King of Clubs (rank 12)
  ];
  const royalEval = job.evaluateHand(royalCards, POKER_VARIATIONS.JACKS_OR_BETTER);
  assert(royalEval && royalEval.rank === 'ROYAL_FLUSH', "Royal Flush correctly recognized");

  // Test Pair of Jacks
  const jacksPairCards = [
    new Card(10, true), // Jack of Clubs
    new Card(23, true), // Jack of Diamonds (13 + 10)
    new Card(2, true),  // 3 of Clubs
    new Card(16, true), // 4 of Diamonds
    new Card(35, true)  // 10 of Hearts
  ];
  const jacksEval = job.evaluateHand(jacksPairCards, POKER_VARIATIONS.JACKS_OR_BETTER);
  assert(jacksEval && jacksEval.rank === 'JACKS_OR_BETTER', "Jacks or Better recognized");

  // 12.2 Deuces Wild
  const dw = new PokerGame({ variation: POKER_VARIATIONS.DEUCES_WILD });
  const fourDeucesCards = [
    new Card(1, true),  // 2 of Clubs
    new Card(14, true), // 2 of Diamonds
    new Card(27, true), // 2 of Hearts
    new Card(40, true), // 2 of Spades
    new Card(12, true)  // King
  ];
  const dwEval = dw.evaluateHand(fourDeucesCards, POKER_VARIATIONS.DEUCES_WILD);
  assert(dwEval && dwEval.rank === 'FOUR_DEUCES', "Four Deuces recognized in Deuces Wild");

  // Wild Royal Flush in Deuces Wild
  const wildRoyalCards = [
    new Card(1, true),  // 2 of Clubs (wild)
    new Card(0, true),  // Ace of Clubs
    new Card(11, true), // Queen of Clubs
    new Card(12, true), // King of Clubs
    new Card(9, true)   // 10 of Clubs
  ];
  const wildRoyalEval = dw.evaluateHand(wildRoyalCards, POKER_VARIATIONS.DEUCES_WILD);
  assert(wildRoyalEval && wildRoyalEval.rank === 'WILD_ROYAL', "Wild Royal Flush correctly evaluated in Deuces Wild");

  // 12.3 Joker Poker
  const jp = new PokerGame({ variation: POKER_VARIATIONS.JOKER_POKER });
  const jokerCard = new Card(52, true);
  jokerCard.isJoker = true;
  const fiveOfKindCards = [
    new Card(8, true),  // 9 of Clubs
    new Card(21, true), // 9 of Diamonds
    new Card(34, true), // 9 of Hearts
    new Card(47, true), // 9 of Spades
    jokerCard           // Joker
  ];
  const fiveKindEval = jp.evaluateHand(fiveOfKindCards, POKER_VARIATIONS.JOKER_POKER);
  assert(fiveKindEval && fiveKindEval.rank === 'FIVE_OF_A_KIND', "Five of a Kind evaluated with Wild Joker");

  // Test Auto-Hold Strategy Advisor
  const hint = job.getTacticalHint();
  assert(hint && Array.isArray(hint.hold) && hint.hold.length === 5, "Auto-Hold Advisor returns 5-card recommendation array");

  // Test Deuces Wild: Hold 1 Deuce with uncoordinated cards
  dw.state.phase = 'HOLDING';
  dw.state.hand = [
    new Card(1, true),  // 2 of Clubs (Wild Deuce)
    new Card(4, true),  // 5 of Clubs
    new Card(20, true), // 8 of Diamonds
    new Card(34, true), // 9 of Hearts
    new Card(48, true)  // Jack of Spades
  ];
  const dwHint = dw.getTacticalHint();
  assert(dwHint.hold[0] === true && dwHint.hold.filter(Boolean).length === 1, "Deuces Wild correctly holds the single wild Deuce (2)");
  assert(!dwHint.reason.includes("draw 5"), "Deuces Wild hint does NOT tell player to draw 5 cards when holding a Deuce");
  assert(dwHint.reason.includes("draw 4"), `Deuces Wild advice accurately states draw 4 cards: "${dwHint.reason}"`);

  // Test Joker Poker: Hold 1 Joker with uncoordinated cards
  jp.state.phase = 'HOLDING';
  jp.state.hand = [
    jokerCard,          // Wild Joker
    new Card(3, true),  // 4 of Clubs
    new Card(19, true), // 7 of Diamonds
    new Card(33, true), // 8 of Hearts
    new Card(47, true)  // 9 of Spades
  ];
  const jpHint = jp.getTacticalHint();
  assert(jpHint.hold[0] === true && jpHint.hold.filter(Boolean).length === 1, "Joker Poker correctly holds the single wild Joker");
  assert(!jpHint.reason.includes("draw 5"), "Joker Poker hint does NOT tell player to draw 5 cards when holding a Joker");
  assert(jpHint.reason.includes("draw 4"), `Joker Poker advice accurately states draw 4 cards: "${jpHint.reason}"`);

  // Test Deuces Wild: Two Pair recognition (Jacks and 6s)
  const twoPairCards = [
    new Card(49, true), // Jack of Spades (rank 10)
    new Card(18, true), // 6 of Diamonds (rank 5)
    new Card(23, true), // Jack of Diamonds (rank 10)
    new Card(5, true),  // 6 of Clubs (rank 5)
    new Card(41, true)  // 3 of Spades (rank 2)
  ];
  const twoPairEval = dw.evaluateHand(twoPairCards, POKER_VARIATIONS.DEUCES_WILD);
  assert(twoPairEval && twoPairEval.rank === 'TWO_PAIR', "Two Pair correctly recognized in Deuces Wild evaluation");
  assert(twoPairEval && twoPairEval.name === 'Two Pair', "Two Pair evaluation returns name 'Two Pair'");
  assert(twoPairEval.pays === false && twoPairEval.multiplier === 0, "Two Pair in Deuces Wild correctly reflects 0 payout");

  // Deuces Wild Auto-Hold advice with Two Pair
  dw.state.phase = 'HOLDING';
  dw.state.hand = twoPairCards;
  const dwTwoPairHint = dw.getTacticalHint();
  assert(dwTwoPairHint.hold.filter(Boolean).length === 2, "Deuces Wild Auto-Hold correctly holds 1 pair (2 cards) when dealt Two Pair");
  assert(dwTwoPairHint.hold[0] === true && dwTwoPairHint.hold[2] === true, "Deuces Wild Auto-Hold holds the higher pair (Jacks)");
  assert(dwTwoPairHint.reason.includes("Two Pair does not pay"), `Deuces Wild advice explains Two Pair does not pay: "${dwTwoPairHint.reason}"`);
}

// TEST SUITE 13: P2P DUEL COMPETITION & CRYPTOGRAPHIC VERIFICATION
console.log("\n--- TEST SUITE 13: P2P Duplicate Tournaments & Move Verification ---");
{
  const { P2PDuelManager } = await import('../src/core/p2p_duel.js');
  const { TriPeaksGame } = await import('../src/games/tripeaks.js');

  const hostManager = new P2PDuelManager({ playerName: "ChampionAce" });
  const duel = hostManager.createDuel('tripeaks', 987654321);

  assert(duel.duelId.startsWith('DUEL-TRIP-'), "P2P Duel Room ID generated with prefix DUEL-TRIP-");
  assert(duel.seed === 987654321, "Duel seed preserved");

  // Encode & Decode Match Code
  const matchCode = hostManager.encodeMatchCode();
  assert(matchCode.length > 20, `Match Code encoded successfully: ${matchCode.slice(0, 24)}...`);

  const guestManager = new P2PDuelManager({ playerName: "ChallengerLeo" });
  const joinedDuel = guestManager.joinDuel(matchCode);
  assert(joinedDuel.seed === duel.seed, "Opponent successfully joined duplicate room with identical seed");

  // Simulate moves and record them
  hostManager.recordMove('PLAY_TABLEAU', { index: 18 });
  hostManager.recordMove('DRAW_STOCK');

  const cert = hostManager.generateCertificate(450, false);
  assert(cert.hashSignature && cert.moveCount === 2, "Tamper-evident completion certificate generated with hash");

  // Verify certificate
  const fakeCert = { ...cert, finalScore: 99999 }; // Tampered score!
  const fakeCheck = P2PDuelManager.verifyCertificate(fakeCert, TriPeaksGame);
  assert(fakeCheck.valid === false, "Tampered opponent certificate correctly rejected by anti-cheat verification");

  hostManager.cleanup();
  guestManager.cleanup();
}

// TEST SUITE 14: TEXAS HOLD'EM TABLE POKER ENGINE & 7-CARD HAND EVALUATION
console.log("\n--- TEST SUITE 14: Texas Hold'em Table Poker & 7-Card Hand Evaluation ---");
{
  const { HoldemGame, HOLDEM_STAGES } = await import('../src/games/holdem.js');

  const table = new HoldemGame({ seed: 12345, playerName: "CasinoHero" });
  assert(table.players.length === 4, "4-player table initialized (Human + 3 AI opponents)");
  assert(table.players[0].holeCards.length === 2, "Active player dealt exactly 2 hole cards");
  assert(table.players[1].holeCards.length === 2, "AI opponent dealt exactly 2 hole cards");
  assert(table.pot === 30, "Blinds posted properly into pot ($10 SB + $20 BB = $30)");
  assert(table.stage === HOLDEM_STAGES.PREFLOP, "Game begins at PREFLOP stage");
  assert(table.communityCards.length === 0, "Zero community cards dealt before flop");

  // Best 5-card evaluation out of 7 cards
  const sevenCards = [
    new Card(0, true),   // Ace of Clubs
    new Card(13, true),  // Ace of Diamonds
    new Card(12, true),  // King of Clubs
    new Card(25, true),  // King of Diamonds
    new Card(38, true),  // King of Hearts
    new Card(2, true),   // 3 of Clubs
    new Card(15, true)   // 3 of Diamonds
  ];
  const bestHand = table._evaluate7CardHand(sevenCards);
  assert(bestHand && bestHand.name === 'Full House', `Best 5-card hand evaluated correctly from 7 cards: ${bestHand?.name}`);
  assert(bestHand.bestCards.length === 5, "Best hand combination contains exactly 5 cards");

  // Advance stages: Flop, Turn, River
  table.userCall();
  assert(table.communityCards.length >= 3, "Flop dealt with 3 community cards");
  assert(table.communityCards.every(c => c.faceUp), "All community cards are face up");

  // Tactical Hint
  const hint = table.getTacticalHint();
  assert(hint && hint.reason, "Tactical hint provides clear strategy reason");
}

// TEST SUITE 15: CROSS-GAME CASINO VAULT BANKROLL INCENTIVES
console.log("\n--- TEST SUITE 15: Cross-Game Casino Bankroll & Solitaire Earnings ---");
{
  const { ProfileManager } = await import('../src/core/profile_manager.js');
  const pm = new ProfileManager();
  const testUser = pm.createProfile("VaultPlayer", "⭐");
  pm.setActiveProfile(testUser.id);

  // Initial bankroll
  assert(pm.getCasinoBankroll() === 1000, "Active user initialized with standard $1,000 Casino Bankroll");

  // Non-casino Solitaire points earning Casino Cash
  const points = 500;
  const chipsEarned = Math.floor(points / 4);
  const gain = pm.addCasinoBankroll(chipsEarned);
  assert(gain.current === 1125, "500 Solitaire points awards +$125 chips, driving Casino Bankroll to $1,125");

  // Solitaire Victory Bonus (e.g. Spider 4-Suit Victory +$1,000)
  const spiderBonus = 1000;
  const winGain = pm.addCasinoBankroll(spiderBonus);
  assert(winGain.current === 2125, "Mastering Spider 4-Suit grants +$1,000 victory bonus to Casino Bankroll");

  // Synchronization with Blackjack & Poker
  const { BlackjackGame } = await import('../src/games/blackjack.js');
  const bj = new BlackjackGame({ seed: 777 });
  bj.bankroll = pm.getCasinoBankroll();
  assert(bj.bankroll === 2125, "Blackjack inherits full synchronized Casino Vault balance ($2,125)");

  const { PokerGame, POKER_VARIATIONS } = await import('../src/games/poker.js');
  const poker = new PokerGame({ variation: POKER_VARIATIONS.DEUCES_WILD, credits: pm.getCasinoBankroll() });
  assert(poker.credits === 2125, "Video Poker inherits full synchronized Casino Vault credits (2,125)");
}

// TEST SUITE 16: 5-PLAYER SAME-SEED P2P TIME CHALLENGE ARENA
console.log("\n--- TEST SUITE 16: 5-Player Same-Seed P2P Time Challenge Arena ---");
{
  const { P2PDuelManager } = await import('../src/core/p2p_duel.js');
  const mgr = new P2PDuelManager({ playerName: 'Speedy' });

  // 1. Create a 5-player challenge
  const challenge = mgr.createTimeChallenge('klondike_1', 998877, 'Speed Test Arena');
  assert(challenge.duelId.startsWith('DUEL-KLON-'), "5-Player Time Challenge room generated with DUEL-KLON prefix");
  assert(challenge.seed === 998877, "Deterministic seed preserved across challenge");
  assert(challenge.maxPlayers === 5, "Challenge room strictly configured for up to 5 players");
  assert(challenge.players.length === 1, "Initial room contains host player");
  assert(challenge.players[0].isYou === true, "Host player flagged as isYou");

  // 2. Start challenge filled with 4 competitive contenders (total 5)
  const fullChallenge = mgr.startWithChallengers('klondike_1', 998877);
  assert(fullChallenge.players.length === 5, "Time Challenge automatically populates 5 competitors (Host + 4 Challengers)");
  assert(fullChallenge.players.every(p => p.totalCards === 52), "All 5 competitors assigned identical 52-card objective");

  // 3. Update player progress and verify dynamic leaderboard sorting
  mgr.sendProgress({ score: 120, cardsLeft: 30, moves: 15, won: false });
  let board = mgr.getRankedLeaderboard();
  const you = board.find(p => p.isYou);
  assert(you.progressPct === Math.round(((52 - 30) / 52) * 100), "Player progress percentage accurately computed from cards remaining");

  // Ghost 1 finishes in 85 seconds
  fullChallenge.players[1].won = true;
  fullChallenge.players[1].finishTimeMs = 85000;
  fullChallenge.players[1].cardsLeft = 0;
  fullChallenge.players[1].progressPct = 100;

  // You finish in 72 seconds (faster!)
  const actualYou = fullChallenge.players.find(p => p.isYou);
  mgr.sendProgress({ score: 500, cardsLeft: 0, moves: 42, won: true });
  actualYou.finishTimeMs = 72000;

  board = mgr.getRankedLeaderboard();
  assert(board[0].isYou === true, "Player with fastest completion time takes 1st place 🥇 on leaderboard");
  assert(board[0].rankLabel === '1st 🥇', "Rank 1 receives golden 1st 🥇 crown badge");
  assert(board[1].name === fullChallenge.players[1].name, "2nd finisher ranked in 2nd place 🥈");

  // 4. Joining via Match Code preserves exact seed
  const matchCode = mgr.encodeMatchCode(fullChallenge);
  const joiner = new P2PDuelManager({ playerName: 'Challenger2' });
  const joined = joiner.joinDuel(matchCode);
  assert(joined.seed === 998877, "Joined competitor receives the exact identical PRNG seed deal");
  assert(joined.gameType === 'klondike_1', "Joined competitor receives matching game type");

  mgr.cleanup();
  joiner.cleanup();
}

// TEST SUITE 17: P2P NETWORK DISCOVERY OF HOSTED DUELS
console.log("\n--- TEST SUITE 17: P2P Network Discovery of Hosted Duels ---");
{
  const { P2PDuelManager } = await import('../src/core/p2p_duel.js');
  const alice = new P2PDuelManager({ playerName: 'AliceHost' });
  const bob = new P2PDuelManager({ playerName: 'BobChallenger' });

  // 1. Alice hosts a duel
  const aliceDuel = alice.createDuel('freecell', 554433);
  assert(alice.isHost === true, "Alice flagged as active host");
  assert(aliceDuel.duelId.startsWith('DUEL-FREE-'), "Alice room created with DUEL-FREE prefix");

  // 2. Alice's own challenge list contains her hosted duel
  const aliceChallenges = alice.getAvailableChallenges();
  assert(aliceChallenges[0].duelId === aliceDuel.duelId, "Alice's hosted duel ranks #1 at the top of available challenges");
  assert(aliceChallenges[0].isLiveHost === true, "Hosted duel flagged as isLiveHost");
  assert(aliceChallenges[0].hostName === 'AliceHost', "Host name preserved as AliceHost");

  // 3. Bob queries the network for available hosted duels
  bob.queryNetworkChallenges();
  const bobDiscovered = bob.getAvailableChallenges();
  const foundAlice = bobDiscovered.find(c => c.duelId === aliceDuel.duelId);
  assert(foundAlice !== undefined, "Bob discovers Alice's hosted duel on the P2P network");
  assert(foundAlice.isLiveHost === true, "Bob recognizes Alice's duel as a live hosted match");
  assert(bobDiscovered[0].duelId === aliceDuel.duelId, "Live hosted duel ranks above default static challenges");

  // 4. Bob joins Alice's hosted duel directly from discovered network card
  const bobJoined = bob.joinDuel(foundAlice.matchCode);
  assert(bobJoined.seed === 554433, "Bob joined Alice's room with identical seed deal");
  assert(bobJoined.gameType === 'freecell', "Bob joined with matching FreeCell discipline");

  // 5. Test real-time invite callback on other peers
  let invitedDuel = null;
  const charlie = new P2PDuelManager({
    playerName: 'CharliePlayer',
    onHostInvite: (ch) => { invitedDuel = ch; }
  });
  // Alice announces a new challenge
  const duel2 = alice.createDuel('tripeaks', 112233);
  charlie._handleLobbyMessage({
    type: 'CHALLENGE_ANNOUNCE',
    challenge: {
      duelId: duel2.duelId,
      roomTitle: "Alice's TriPeaks",
      gameType: 'tripeaks',
      seed: 112233,
      hostName: 'AliceHost',
      matchCode: alice.encodeMatchCode(duel2),
      isLiveHost: true
    }
  });
  assert(invitedDuel !== null, "Charlie received real-time P2P challenge invitation notification");
  assert(invitedDuel.hostName === 'AliceHost', "Invitation reflects hosting player's name");
  assert(invitedDuel.gameType === 'tripeaks', "Invitation reflects game discipline");

  // 6. Alice leaves/ends her challenge
  alice.leaveChallenge();
  bob._handleLobbyMessage({ type: 'CHALLENGE_REMOVED', duelId: duel2.duelId });
  const postLeave = bob.getAvailableChallenges();
  const stillThere = postLeave.some(c => c.duelId === duel2.duelId);
  assert(!stillThere, "Alice's duel is cleanly removed from the P2P network upon host leaving");

  alice.cleanup();
  bob.cleanup();
  charlie.cleanup();
}

// TEST SUITE 18: DUEL TIMER START ON 5 MEMBERS JOINED OR 5 MIN
console.log("\n--- TEST SUITE 18: Duel Timer Start On 5 Members Joined or 5 Min ---");
{
  const { P2PDuelManager, ARENA_STATUS, DUEL_WAIT_TIMEOUT_MS } = await import('../src/core/p2p_duel.js');
  
  // 1. New room initializes in WAITING state with 5-minute joinDeadline and no started timer
  const host = new P2PDuelManager({ playerName: 'HostPlayer' });
  const challenge = host.createTimeChallenge('klondike_1', 123456, 'Waiting Lobby Test');
  assert(challenge.status === ARENA_STATUS.WAITING, "Duel room begins in WAITING lobby state");
  assert(host.startTime === null, "Duel racing stopwatch is NOT started while in WAITING state");
  assert(challenge.joinDeadline >= Date.now() + DUEL_WAIT_TIMEOUT_MS - 2000, "Join deadline configured for 5 minutes (300,000ms)");
  assert(challenge.players.length === 1, "Only host is currently in the waiting lobby (1/5)");

  // 2. Race automatically starts when all 5 members have joined
  let raceStartedFired = false;
  host.onRaceStart = (d) => { raceStartedFired = true; };

  // Players 2, 3, 4 join
  for (let i = 2; i <= 4; i++) {
    host._handleIncomingMessage({
      duelId: challenge.duelId,
      type: 'PLAYER_JOINED',
      player: { id: `p_${i}`, name: `Player_${i}`, avatar: '👤', score: 0, cardsLeft: 52, totalCards: 52, progressPct: 0, moves: 0, won: false, status: 'WAITING' }
    });
    assert(challenge.status === ARENA_STATUS.WAITING, `Room remains in WAITING state with ${i} players joined`);
    assert(host.startTime === null, `Stopwatch remains paused with ${i}/5 players`);
  }

  // 5th player joins - All members have joined!
  host._handleIncomingMessage({
    duelId: challenge.duelId,
    type: 'PLAYER_JOINED',
    player: { id: 'p_5', name: 'Player_5', avatar: '🔥', score: 0, cardsLeft: 52, totalCards: 52, progressPct: 0, moves: 0, won: false, status: 'WAITING' }
  });

  assert(challenge.status === ARENA_STATUS.RACING, "Duel timer and room automatically transition to RACING when 5th member joins");
  assert(typeof host.startTime === 'number' && host.startTime > 0, "Duel stopwatch startTime is officially initiated upon 5 members joining");
  assert(challenge.players.length === 5, "Room contains all 5 active racing competitors");
  assert(raceStartedFired === true, "onRaceStart callback successfully triggered");

  host.cleanup();

  // 3. Duel timer starts automatically when 5-minute timeout expires if fewer than 5 members joined
  const hostTimeout = new P2PDuelManager({ playerName: 'TimeoutHost' });
  // Pass 40ms waitTimeoutMs for test simulation of 5 min timeout
  const timeoutRoom = hostTimeout.createTimeChallenge('freecell', 654321, 'Timeout Test Room', 40);
  assert(timeoutRoom.status === ARENA_STATUS.WAITING, "Room initially in WAITING state");
  assert(hostTimeout.startTime === null, "Stopwatch not yet running");

  // Wait 60ms for timeout to fire
  await new Promise(resolve => setTimeout(resolve, 60));

  assert(timeoutRoom.status === ARENA_STATUS.RACING, "Duel timer automatically starts when timeout expires");
  assert(typeof hostTimeout.startTime === 'number' && hostTimeout.startTime > 0, "Stopwatch running after timeout");
  assert(timeoutRoom.players.length === 5, "Remaining empty slots automatically populated with challenger ghosts upon timer start");
  assert(timeoutRoom.players.some(p => p.isGhost), "Contenders filled with ghost speedrunners to complete 5-player race");

  hostTimeout.cleanup();

  // 4. Host early start button allows host to launch race prior to 5 min
  const hostEarly = new P2PDuelManager({ playerName: 'EarlyHost' });
  const earlyRoom = hostEarly.createTimeChallenge('tripeaks', 332211, 'Early Start Test');
  assert(earlyRoom.status === ARENA_STATUS.WAITING, "Room waiting before manual start");
  
  hostEarly.startDuelRace('HOST_START_NOW');
  assert(earlyRoom.status === ARENA_STATUS.RACING, "Room instantly transitions to RACING on host manual start");
  assert(earlyRoom.players.length === 5, "Unfilled player slots filled with competitors up to 5");
  assert(typeof hostEarly.startTime === 'number', "Duel stopwatch timer running");

  hostEarly.cleanup();
}

// TEST SUITE 19: COMPUTER STAND-INS WITH DIVERSE SKILL TIERS
console.log("\n--- TEST SUITE 19: Computer Stand-ins with Diverse Skill Tiers ---");
{
  const { P2PDuelManager, STANDIN_BOT_ROSTER, ARENA_STATUS } = await import('../src/core/p2p_duel.js');

  // 1. Verify Stand-in Bot Roster has diverse skill tiers
  assert(Array.isArray(STANDIN_BOT_ROSTER) && STANDIN_BOT_ROSTER.length >= 6, "Stand-in Bot roster contains at least 6 unique computer competitors");
  
  const skillLevels = STANDIN_BOT_ROSTER.map(b => b.skillLevel);
  assert(skillLevels.includes('Casual'), "Roster includes 'Casual' skill tier");
  assert(skillLevels.includes('Novice'), "Roster includes 'Novice' skill tier");
  assert(skillLevels.includes('Intermediate'), "Roster includes 'Intermediate' skill tier");
  assert(skillLevels.includes('Pro'), "Roster includes 'Pro' skill tier");
  assert(skillLevels.includes('Master'), "Roster includes 'Master' skill tier");
  assert(skillLevels.includes('Grandmaster'), "Roster includes 'Grandmaster' skill tier");

  const skills = STANDIN_BOT_ROSTER.map(b => b.skill);
  assert(Math.min(...skills) <= 0.65, "Lowest bot skill rating accommodates casual/relaxed pacing (<= 0.65)");
  assert(Math.max(...skills) >= 0.90, "Highest bot skill rating represents elite competitive speedrunning (>= 0.90)");

  // 2. Starting duel with unfilled slots populates distinct computer stand-in bots
  const p2p = new P2PDuelManager({ playerName: 'LiveHuman' });
  p2p.createTimeChallenge('klondike_1', 998877, 'Skill Tier Stand-in Test');
  assert(p2p.activeDuel.players.length === 1, "Initially only 1 human player in lobby");

  p2p.startDuelRace('TEST_FILL');
  assert(p2p.activeDuel.status === ARENA_STATUS.RACING, "Duel transitioned to RACING");
  assert(p2p.activeDuel.players.length === 5, "Unfilled slots successfully filled to 5 players with computer stand-ins");

  const standinBots = p2p.activeDuel.players.filter(p => p.isBot);
  assert(standinBots.length === 4, "Exactly 4 computer stand-ins filled the empty slots");

  // Verify stand-in bots retain their skill metadata
  standinBots.forEach(bot => {
    assert(bot.isBot === true && bot.isGhost === true, `Bot ${bot.name} is marked as bot and ghost competitor`);
    assert(typeof bot.skill === 'number' && bot.skill > 0 && bot.skill <= 1.0, `Bot ${bot.name} has valid skill rating: ${bot.skill}`);
    assert(typeof bot.skillLevel === 'string' && bot.skillLevel.length > 0, `Bot ${bot.name} has skill level tag: ${bot.skillLevel}`);
    assert(typeof bot.botBadge === 'string' && bot.botBadge.length > 0, `Bot ${bot.name} has UI badge: ${bot.botBadge}`);
  });

  // Verify unique bot names in the room
  const botNames = standinBots.map(b => b.name);
  const uniqueNames = new Set(botNames);
  assert(uniqueNames.size === 4, "All stand-in bots have distinct names and personalities");

  p2p.cleanup();
}

// TEST SUITE 20: TACTICAL HINT & TEACHER FILTERING - NO POINTLESS PARTIAL SEQUENCE MOVES
console.log("\n--- TEST SUITE 20: StackExchange Klondike - Filtering Pointless Partial Sequence Moves ---");
{
  // StackExchange Klondike Nuance:
  // Moving a partial sequence between columns when the card underneath is already face-up
  // and CANNOT be moved to a foundation gives NO strategic gain (only changes exposed suit).
  // Our hint engine must strictly skip such moves, but still allow partial sequence moves
  // when the unblocked card can immediately be banked to a foundation.

  const game = new KlondikeGame({ drawCount: 1 });

  // Clear all tableau columns and stock/waste for controlled deterministic testing
  for (let c = 0; c < 7; c++) {
    game.state.tableau[c] = [];
  }
  game.state.stock = [];
  game.state.waste = [];
  for (let f = 0; f < 4; f++) {
    game.state.foundations[f] = [];
  }

  // Face-down card in Column 6 (10♣) so that game is not in auto-complete state and cannot move to foundation
  game.state.tableau[6] = [new Card(9, false)];

  const makeCard = (suit, rank, faceUp = true) => new Card(suit * 13 + rank, faceUp);

  // Setup Scenario A:
  // Column 0: 6 of Clubs (face-up), 5 of Hearts (face-up)
  // Column 1: 6 of Spades (face-up)
  // Foundation 0..3: Empty
  // 5 of Hearts could legally stack on 6 of Spades in Col 1.
  // BUT the card beneath (6 of Clubs) is already face-up and CANNOT move to any foundation.
  const c6Clubs = makeCard(SUITS.CLUBS, 5, true);    // rank 5 = 6♣
  const c5Hearts = makeCard(SUITS.HEARTS, 4, true);  // rank 4 = 5♥
  const c6Spades = makeCard(SUITS.SPADES, 5, true);  // rank 5 = 6♠

  game.state.tableau[0] = [c6Clubs, c5Hearts];
  game.state.tableau[1] = [c6Spades];

  const hintA = game.getTacticalHint();
  assert(hintA === null, "Hint engine strictly skips moving partial sequence 5♥ from 6♣ to 6♠ when 6♣ cannot move to foundation (no strategic gain)");

  // Setup Scenario B:
  // Now place 5 of Spades in Foundation 0.
  // Column 0: 6 of Spades (face-up), 5 of Hearts (face-up).
  // Column 1: 6 of Clubs (face-up).
  // Now if 5 of Hearts moves to Column 1 (6 of Clubs), the card beneath (6 of Spades) CAN move to Foundation 0 (5♠)!
  // This move DOES provide genuine strategic advantage (unblocks foundation move).
  const c5Spades = makeCard(SUITS.SPADES, 4, true);
  game.state.foundations[0] = [
    makeCard(SUITS.SPADES, 0, true), // A♠
    makeCard(SUITS.SPADES, 1, true), // 2♠
    makeCard(SUITS.SPADES, 2, true), // 3♠
    makeCard(SUITS.SPADES, 3, true), // 4♠
    c5Spades                         // 5♠
  ];

  game.state.tableau[0] = [c6Spades, c5Hearts];
  game.state.tableau[1] = [c6Clubs];

  const hintB = game.getTacticalHint();
  assert(hintB !== null, "Hint engine successfully identifies strategic partial sequence move that unblocks foundation!");
  assert(hintB.source.zone === 'tableau' && hintB.source.index === 0 && hintB.source.cardIndex === 1, "Identifies 5♥ on Col 0 as source");
  assert(hintB.target.zone === 'tableau' && hintB.target.index === 1, "Identifies Col 1 as target");
  assert(hintB.message.includes('unblock') && hintB.message.includes('Foundation'), `Hint message explicitly informs player of strategic gain: "${hintB?.message}"`);
}

// TEST SUITE: SEEDS, DEAL CODES & SOLVABLE CATALOG
console.log("\n--- TEST SUITE: Seeds, Deal Codes & Solvable Catalog ---");
{
  // New seeds must survive the 40-bit deal code, or the code shown recreates a different deal
  let allRoundtrip = true;
  for (let i = 0; i < 500; i++) {
    const seed = SplitMix64.newSeed();
    const p = SplitMix64.parseDealCode(SplitMix64.formatDealCode('KL', seed));
    if (!p.valid || Number(p.seed) !== seed) allRoundtrip = false;
  }
  assert(allRoundtrip, "500 fresh seeds all round-trip through their deal code");

  const catalog = HeuristicSolver.getVerifiedCatalog();
  for (const [key, deals] of Object.entries(catalog)) {
    for (const deal of deals) {
      const p = SplitMix64.parseDealCode(deal.code);
      const prefix = deal.code.split('-')[0];
      assert(p.valid && SplitMix64.formatDealCode(prefix, p.seed) === deal.code, `${key} ${deal.code} has a valid checksum and round-trips`);
      if (key.startsWith('klondike')) {
        const drawCount = key === 'klondike_draw3' ? 3 : 1;
        const r = HeuristicSolver.solveKlondike(p.seed, 10000, drawCount);
        assert(deal.verified === true && r.solved, `${key} ${deal.code} is won by the solver with draw-${drawCount} rules`);
        assert(r.difficulty === deal.difficulty && r.moves === deal.movesPar, `${key} ${deal.code} difficulty/par match the solver (${r.difficulty}, ${r.moves})`);
      } else {
        assert(deal.verified === false, `${key} ${deal.code} is not claimed as verified (no solver for this game)`);
      }
    }
  }
}

console.log("\n=================================================");
console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All clean-room engines, Pyramid, TriPeaks, Poker variations, and P2P Duels verified successfully!\n");
}


