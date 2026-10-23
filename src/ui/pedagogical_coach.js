/**
 * Solitaire Sovereign - Intelligent Pedagogical Coach & Voice Tutoring Engine
 * 
 * Provenance & Architecture:
 * Reconciles game complexity with Cognitive Load Theory via:
 * 1. Adaptive Latency Gating & Interaction Telemetry (Hesitation / Stalling detection)
 * 2. Multimodal Tutoring (On-demand Teacher Overviews + Dynamic In-Game Guidance)
 * 3. Neural Speech Synthesis & Phonetic SSML Normalization (Card symbol expansions)
 * 4. Web Audio Sidechain Ducking Envelope (-12dB background attenuation)
 * 5. Synchronized Audio-Visual Highlighting with 80ms Barge-In Cancellation
 * 
 * 100% clean-room vector & procedural code. Zero external dependencies.
 */

export const COACH_PHASES = Object.freeze({
  ACTIVE: 'active',
  AMBIGUOUS_PAUSE: 'phase1_pause',
  COGNITIVE_PARALYSIS: 'phase2_paralysis',
  EXTENDED_INACTION: 'phase3_inaction',
  AFK_SUSPENDED: 'afk_suspended'
});

export const GAME_TUTORIAL_DATA = {
  klondike_1: {
    title: "Klondike Solitaire (Draw 1)",
    category: "Patience / Single-Player",
    objective: "Build all 4 suit foundations from Ace to King in ascending order.",
    rules: [
      "Tableau builds down in alternating colors (e.g., Red 9 on Black 10).",
      "Only Kings (or stacks led by a King) can be placed in empty tableau columns.",
      "Partial Sequences: Avoid moving partial stacks between columns unless it enables a foundation play or uncovers a hidden card.",
      "Draw 1 card at a time from the stock with unlimited recycles.",
      "Foundations build up by suit starting with the Ace (A → 2 → 3 ... → K)."
    ],
    mathHeuristic: "Safe Foundation Rule: Aces and 2s can be banked immediately. Higher ranks (N) should only be banked if both opposite-color cards of rank (N-1) are already banked, preserving them as tableau landing spots. Partial Sequences: Moving partial stacks between columns without uncovering cards simply trades suits with no strategic gain.",
    spokeOverview: "Welcome to Klondike! Your goal is building four suit foundations from Ace up to King. In the tableau, build downward alternating red and black cards. Prioritize revealing face-down cards, and save empty columns for Kings. Avoid splitting face-up sequences between columns unless it unblocks a card for the foundation.",
    latencySeconds: 9,
    advancedStrategies: [
      "Empty Column Timing: Don't create an empty column unless you have a King ready to fill it, or you'll waste a valuable staging area.",
      "Stock Management: Before recycling the stock, exhaust all possible tableau moves to maximize the cards you can play.",
      "Build Symmetrically: Try to keep foundation piles at similar heights to maintain maximum flexibility for tableau moves.",
      "Waste Card Tracking: Remember which cards are deep in the waste pile - playing one card shifts what you'll see next cycle."
    ],
    cheatSheet: {
      headers: ["Rank Range", "Optimal Action", "Strategic Rationale"],
      rows: [
        ["Aces & Twos", "Bank Immediately", "Zero risk; they cannot serve as landing spots."],
        ["Threes to Sixes", "Hold on Tableau", "Keep active until opposite-color lower ranks are banked."],
        ["Partial Sequences", "Preserve Unless Banking", "Moving partial stacks without uncovering cards yields no strategic gain."],
        ["Empty Columns", "Reserve for Kings", "Never clear a column unless a King is ready to occupy it."],
        ["Hidden Cards", "Top Priority Excavation", "Always prefer moving stacks that reveal face-down cards."]
      ]
    }
  },
  klondike_3: {
    title: "Klondike Solitaire (Draw 3)",
    category: "Patience / Advanced",
    objective: "Build all 4 suit foundations while managing 3-card stock draw cycles.",
    rules: [
      "Tableau builds down in alternating colors.",
      "Draw 3 cards at a time from stock; only the top card of the waste is playable.",
      "Avoid splitting partial sequences unless it directly unblocks a foundation play.",
      "Playing a waste card shifts the 3-card cadence on your next stock pass."
    ],
    mathHeuristic: "Cadence Shift: Every card you play from the waste shifts the index of every subsequent draw by 1, revealing completely new playable cards on future passes.",
    spokeOverview: "In Draw Three Klondike, patience and sequence tracking are essential. Drawing three cards at a time means every card you play from the waste shifts the cycle for your next pass through the deck. Look ahead, excavate hidden tableau cards first, and manage empty columns carefully.",
    latencySeconds: 11,
    cheatSheet: {
      headers: ["Concept", "Rule of Thumb", "Impact"],
      rows: [
        ["Stock Cycling", "Track Deep Waste Cards", "Playing 1 card changes every triplet in the next pass."],
        ["Tableau Packing", "Keep Colors Balanced", "Don't stack all cards of one color in a single column."],
        ["Foundation Timing", "Conditional Banking", "Avoid banking intermediate cards that enable tableau transfers."]
      ]
    }
  },
  freecell: {
    title: "FreeCell Solitaire",
    category: "Open-Information / Combinatorial",
    objective: "Move all 52 cards to the four suit foundations using 4 open reserve cells.",
    rules: [
      "All 52 cards are dealt face-up in 8 cascades at the start (100% open information).",
      "Four freecells provide temporary single-card storage.",
      "Tableau builds down in alternating colors.",
      "Supermove formula: Max movable cards = (1 + k) * 2^h, where k is empty freecells and h is empty columns."
    ],
    mathHeuristic: "Supermove Capacity: With 3 freecells and 0 empty columns, you can move 4 cards. With 1 empty column, capacity doubles to 8. Never reduce freecells to zero without a verified extraction path.",
    spokeOverview: "FreeCell is a pure game of skill with open information. Every deal is solvable with proper lookahead. Your four freecells act as temporary staging space. The number of cards you can move at once equals one plus your freecells, multiplied by two for every empty column. Guard your freecells carefully!",
    latencySeconds: 11,
    advancedStrategies: [
      "Lookahead Planning: Before making a move, trace the extraction path for buried cards. Ensure you can later free any cards you're about to bury.",
      "Freecell Conservation: Try to keep at least 2 freecells open at all times for flexibility. Using all 4 freecells often leads to gridlock.",
      "Empty Column Power: Creating an empty column doubles your supermove capacity. Plan sequences that lead to column clearance.",
      "Home Cell Strategy: Build foundations evenly (within 1-2 ranks of each other) to avoid blocking tableau moves with cards you need.",
      "Deep Card Planning: Work backwards from buried cards. Identify which cards must move first to eventually free that deep target card."
    ],
    cheatSheet: {
      headers: ["Empty Freecells (k)", "Empty Columns (h)", "Max Movable Stack"],
      rows: [
        ["4 Freecells", "0 Columns", "5 Cards"],
        ["3 Freecells", "1 Column", "8 Cards"],
        ["2 Freecells", "1 Column", "6 Cards"],
        ["1 Freecell", "2 Columns", "8 Cards"],
        ["Auto-Bank Rule", "Safe Threshold", "Cards automatically bank when lower opposite ranks are secure."]
      ]
    }
  },
  spider_1: {
    title: "Spider Solitaire (1 Suit - Relaxed)",
    category: "Multi-Column Run Building",
    objective: "Assemble eight 13-card descending runs of Spades from King down to Ace.",
    rules: [
      "104 cards dealt across 10 tableau columns.",
      "Build descending runs: K → Q → J ... → A.",
      "Completed K-to-A runs are immediately removed from the board.",
      "Stock deals 1 card to every column; all columns must be non-empty to deal."
    ],
    mathHeuristic: "Exhaust All Moves: Never click the stock pile until every possible internal reorganization has been made to uncover hidden cards.",
    spokeOverview: "Spider Solitaire focuses on assembling complete King to Ace runs. In this single-suit edition, all cards can pack together. Your main goal is uncovering face-down cards and creating empty columns to stage long sequences. Always exhaust every possible tableau move before dealing ten fresh cards from the stock.",
    latencySeconds: 12,
    cheatSheet: {
      headers: ["Action", "Guideline", "Strategic Value"],
      rows: [
        ["Empty Columns", "Use for Sequence Staging", "Temporarily split long runs to dig up hidden cards."],
        ["Stock Deal", "Last Resort Only", "Dealing fresh cards covers your carefully built runs."],
        ["Completed Runs", "Clear King to Ace", "Removes 13 cards permanently, freeing massive board space."]
      ]
    }
  },
  spider_2: {
    title: "Spider Solitaire (2 Suits - Classic)",
    category: "Multi-Column Run Building",
    objective: "Assemble eight completed runs of Spades and Hearts.",
    rules: [
      "Build down regardless of suit, but ONLY same-suit runs can be moved as a unit.",
      "Mixed-suit sequences paralyze mobility until untangled.",
      "Prioritize in-suit builds whenever possible."
    ],
    mathHeuristic: "Same-Suit Integrity: A mixed-suit sequence cannot be moved as a stack. Only break suit alignment if it directly exposes a face-down card or creates an empty column.",
    spokeOverview: "In Two-Suit Spider, suit discipline is vital. While you can place any card on a rank one higher, only same-suit stacks can move together. Avoid breaking suit continuity unless it immediately uncovers a hidden card. Empty columns are your greatest asset for sorting mixed piles.",
    latencySeconds: 13,
    cheatSheet: {
      headers: ["Scenario", "Recommendation", "Risk Level"],
      rows: [
        ["In-Suit Build", "Always Prioritize", "Maintains full stack mobility."],
        ["Cross-Suit Build", "Accept only to uncover cards", "Freezes stack movement until separated."],
        ["Stock Preparation", "Clear all columns first", "Stock deal cannot occur with empty columns."]
      ]
    }
  },
  spider_4: {
    title: "Spider Solitaire (4 Suits - Master)",
    category: "Multi-Column Run Building",
    objective: "Master-level Spider across all four suits (Spades, Hearts, Diamonds, Clubs).",
    rules: [
      "Extreme combinatorial complexity; in-suit runs are rare and precious.",
      "Supermove staging requires deep multi-step lookahead.",
      "Empty columns must be preserved for run re-assembly."
    ],
    mathHeuristic: "Calculative Staging: S = n + 1 where n is empty columns. Use empty columns as intermediate registers to untangle cross-suit deadlocks.",
    spokeOverview: "Four-Suit Spider is the ultimate patience challenge. With four distinct suits, cross-suit breaks happen constantly. Treat empty columns like precious staging registers. Calculate your sequence moves in advance to avoid burying high cards under misaligned sequences.",
    latencySeconds: 14,
    cheatSheet: {
      headers: ["Priority", "Tactic", "Outcome"],
      rows: [
        ["1. Column Clearance", "Tunnel one column to empty", "Creates essential staging buffer."],
        ["2. Color Sorting", "Gather same-suit pairs", "Prepares runs for clean completion."],
        ["3. Stock Management", "Only deal when fully locked", "Minimizes random disruption."]
      ]
    }
  },
  pyramid: {
    title: "Pyramid Solitaire",
    category: "Parity Addition / Sum-13",
    objective: "Dismantle the 28-card pyramid by pairing exposed cards that sum exactly to 13.",
    rules: [
      "A card is only playable when both overlapping cards below it are removed.",
      "Kings equal 13 and are discarded singly.",
      "Complementary pairs: Queen (12) + Ace (1) = 13, Jack (11) + 2 = 13, 10 + 3 = 13, 9 + 4 = 13, 8 + 5 = 13, 7 + 6 = 13."
    ],
    mathHeuristic: "Partner Scarcity: Each rank has only 4 cards in the deck. Before removing a card, verify that its partner is not trapped beneath it, creating an impossible dead pair.",
    spokeOverview: "In Pyramid, your goal is pairing open cards that sum to 13. Kings discard alone. Queens pair with Aces, Jacks with Twos, Tens with Threes, and so on. Always check whether removing a card unblocks two parent cards, and beware of dead pairs where a card's only remaining partner is buried underneath it.",
    latencySeconds: 7,
    cheatSheet: {
      headers: ["Card A", "Card B", "Total"],
      rows: [
        ["King (13)", "Single Discard", "13 (Instant Removal)"],
        ["Queen (12)", "Ace (1)", "13"],
        ["Jack (11)", "Two (2)", "13"],
        ["Ten (10)", "Three (3)", "13"],
        ["Nine (9)", "Four (4)", "13"],
        ["Eight (8)", "Five (5)", "13"],
        ["Seven (7)", "Six (6)", "13"]
      ]
    }
  },
  tripeaks: {
    title: "TriPeaks Solitaire",
    category: "DAG Exposure / Sequence Clearing",
    objective: "Clear all three peaks by selecting open cards that are one rank higher or lower than the waste.",
    rules: [
      "Any exposed card with rank +/- 1 relative to the waste card can be played.",
      "Wraparound is permitted: King connects to Ace, and Ace connects to King.",
      "Draw from stock when no playable cards are exposed on the peaks."
    ],
    mathHeuristic: "Exposure Optimization: Prefer a move that frees two overlapping parent cards over a longer run that leaves the board graph unchanged. Level all three peaks symmetrically.",
    spokeOverview: "TriPeaks is fast and fluid. Tap exposed cards that are one rank above or below the active waste card. Aces wrap around to Kings. For maximum score and win rate, balance your clearance across all three peaks rather than digging a single deep trench, and prioritize cards that uncover two parents.",
    latencySeconds: 7,
    cheatSheet: {
      headers: ["Waste Card", "Playable Adjacent Ranks", "Special Connection"],
      rows: [
        ["Ace (A)", "King (K) or Two (2)", "Wraps around to King"],
        ["King (K)", "Queen (Q) or Ace (A)", "Wraps around to Ace"],
        ["Middle Ranks (2-Q)", "Rank - 1 or Rank + 1", "Standard sequential chain"],
        ["Peak Leveling", "Clear peaks symmetrically", "Maintains maximum landing options."]
      ]
    }
  },
  blackjack: {
    title: "Blackjack (Casino 21)",
    category: "Table Wagering / Basic Strategy",
    objective: "Beat the dealer's hand total without exceeding 21.",
    rules: [
      "Aces count as 1 or 11; face cards count as 10.",
      "Dealer must hit on 16 and stand on all 17s.",
      "Natural Blackjack (Ace + 10) pays 3 to 2.",
      "Decision hierarchy: Surrender → Split → Double Down → Hit / Stand."
    ],
    mathHeuristic: "Basic Strategy: Dealer showing 4, 5, or 6 has a >40% bust probability; stand on stiff totals (12-16). Dealer showing 7 through Ace has a >70% chance of making 17-21; you must hit stiff hands.",
    spokeOverview: "Welcome to Blackjack! The house edge drops under half a percent when you follow Basic Strategy. Check your decisions in strict order: first check surrender, then split pairs, then double down, then hit or stand. Always split Aces and Eights, never split Tens or Fives. If the dealer shows a four, five, or six, let them bust!",
    latencySeconds: 6,
    cheatSheet: {
      headers: ["Player Hand", "Dealer Upcard", "Basic Strategy Action"],
      rows: [
        ["Pair of Aces or 8s", "Any Dealer Card", "Always SPLIT (Greatly increases EV)"],
        ["Pair of 10s or 5s", "Any Dealer Card", "NEVER Split (Keep 20; Double 10)"],
        ["Hard 11", "Dealer 2 through 10", "DOUBLE DOWN (Hit vs Ace)"],
        ["Hard 12 to 16", "Dealer 2 through 6", "STAND (Let dealer bust)"],
        ["Hard 12 to 16", "Dealer 7 through Ace", "HIT (Dealer likely has 17+)"]
      ]
    }
  },
  poker_holdem: {
    title: "Texas Hold'em Poker (Table)",
    category: "Incomplete Information / Pot Odds",
    objective: "Win pots by making the best 5-card combination or betting opponents out.",
    rules: [
      "Each player is dealt 2 private hole cards.",
      "5 community cards dealt across Flop (3), Turn (1), and River (1).",
      "Betting rounds: Pre-Flop → Flop → Turn → River.",
      "Use any combination of your 2 hole cards and the 5 community cards."
    ],
    mathHeuristic: "Rule of 2 & 4: Flop Equity ≈ Outs * 4. Turn Equity ≈ Outs * 2. If Hand Equity > Pot Odds [Call / (Pot + Call)], calling is mathematically profitable (+EV).",
    spokeOverview: "In Texas Hold'em, position and poker math are everything. Late position gives you information advantage. On the flop, count your unseen outs and multiply by four to find your approximate winning equity. On the turn, multiply outs by two. If your equity is higher than the pot odds, calling is profitable!",
    latencySeconds: 8,
    cheatSheet: {
      headers: ["Draw Type", "Direct Outs", "Flop Equity (Outs * 4)"],
      rows: [
        ["Flush Draw (4 suited)", "9 Outs", "~36% (High Equity Draw)"],
        ["Open-Ended Straight", "8 Outs", "~32% (Strong Draw)"],
        ["Gutshot Straight", "4 Outs", "~16% (Needs high pot odds)"],
        ["Overcards (e.g. A-K)", "6 Outs", "~24% (Pairing chances)"],
        ["Pot Odds Formula", "Call / (Pot + Call)", "Call when Equity > Pot Odds"]
      ]
    }
  },
  poker_jacks: {
    title: "Video Poker (Jacks or Better)",
    category: "Draw Poker / Expected Value",
    objective: "Draw the highest paying 5-card poker hand; pair of Jacks or better pays.",
    rules: [
      "Dealt 5 cards; choose which cards to HOLD, then press DRAW.",
      "Discarded cards are replaced from the same 52-card deck.",
      "High pairs (Jacks, Queens, Kings, Aces) guarantee payouts."
    ],
    mathHeuristic: "Auto-Hold EV: Always hold a paying pair or better. Never break a made flush or straight unless holding 4 cards to a Royal Flush.",
    spokeOverview: "In Jacks or Better Video Poker, you are dealt five cards and decide which to hold before drawing replacements. Any pair of Jacks, Queens, Kings, or Aces guarantees a payout. Hold high pairs, four-card flushes, and open straights. Never break a winning hand unless you have four to a Royal Flush!",
    latencySeconds: 6,
    cheatSheet: {
      headers: ["Starting Hand", "Hold Decision", "EV Expected Return"],
      rows: [
        ["High Pair (J, Q, K, A)", "Hold Both Cards", "Guaranteed 1:1 payout minimum"],
        ["Low Pair (2 through 10)", "Hold Both Cards", "Draw 3 for trips/full house"],
        ["4 to a Royal Flush", "Break any hand except Royal", "Massive jackpot potential"],
        ["4 to a Flush or Straight", "Hold all 4 suited/ranked", "Strong probability of completion"]
      ]
    }
  },
  poker_deuces: {
    title: "Video Poker (Deuces Wild)",
    category: "Draw Poker / Wild Cards",
    objective: "Twos (Deuces) are wild and substitute for any rank or suit.",
    rules: [
      "All four 2s are wild cards.",
      "Lowest paying hand is Three of a Kind (due to wild advantage).",
      "Four Deuces pays a 200:1 jackpot!"
    ],
    mathHeuristic: "Never Discard a Deuce: Deuces multiply hand possibilities exponentially. Hold every 2 dealt, regardless of other cards.",
    spokeOverview: "In Deuces Wild, all four Twos are completely wild! Never discard a Two. Because wild cards make hands easier, the paytable starts at Three of a Kind. If you are dealt four Deuces, you've hit one of the highest payouts in the casino!",
    latencySeconds: 6,
    cheatSheet: {
      headers: ["Deuces Count", "Action", "Strategy Priority"],
      rows: [
        ["4 Deuces", "HOLD ALL 4", "Jackpot Payout (200:1)"],
        ["3 Deuces", "Hold Deuces + Wild Royal/5K", "Draw 1 or 2 cards"],
        ["2 Deuces", "Hold Deuces + 4 to Royal", "Never discard a Deuce"],
        ["1 Deuce", "Hold Deuce + High Potential", "Keep paying hands"]
      ]
    }
  },
  poker_joker: {
    title: "Video Poker (Joker Poker)",
    category: "Draw Poker / 53-Card Deck",
    objective: "53-card deck with 1 Wild Joker; Kings or Better pays.",
    rules: [
      "Includes 1 wild Joker that substitutes for any card.",
      "Minimum paying hand is Kings or Better.",
      "Five of a Kind is enabled and pays 200:1."
    ],
    mathHeuristic: "Joker Preservation: Always hold the Joker. Pair with Kings or Aces for guaranteed returns or hold with 4-card straights and flushes.",
    spokeOverview: "Joker Poker introduces a fifty-third card: the wild Joker! Minimum payout begins at a pair of Kings or Aces. The Joker allows Five of a Kind payouts. Hold the Joker whenever it appears, and look for straight and flush draws.",
    latencySeconds: 6,
    cheatSheet: {
      headers: ["Joker in Hand", "Secondary Holding", "Target Hand"],
      rows: [
        ["Joker + 4 Cards", "Hold all 5 if Flush/Straight", "Guaranteed win"],
        ["Joker + Kings/Aces", "Hold Joker + High Card", "Guaranteed minimum payout"],
        ["Joker Alone", "Hold Joker only", "Draw 4 fresh cards for wild builds"]
      ]
    }
  },
  word_tiles: {
    title: "Sovereign Lexicon (Word Tiles)",
    category: "Strategic Tile Placement / Vocabulary",
    objective: "Form intersecting valid dictionary words on the 15×15 board, maximizing score using premium multiplier squares (3W, 2W, 3L, 2L) and full-rack Bingo (+50 pts).",
    rules: [
      "The first word played must cover the Center Star (★) and contain at least 2 letters.",
      "All newly placed tiles in a turn must be played in a single continuous row or column.",
      "Every new tile must connect with existing board tiles or form valid words in cross-directions.",
      "All formed words must exist in the authoritative ENABLE1 dictionary (172,823 words).",
      "Playing all 7 tiles in one turn awards a massive +50 point Full-Rack Bingo bonus!",
      "Premium multipliers (3W, 2W, 3L, 2L) activate ONLY on the turn a new tile covers them."
    ],
    mathHeuristic: "Multiplier Stacking & Rack Balance: Placing a high-scoring tile (Q, Z, J, X, K) on a 3L or 2L square that simultaneously forms a cross-word multiplies points in both directions! Maintain rack harmony: aim for 3 vowels and 4 consonants to avoid getting bricked.",
    spokeOverview: "Welcome to Sovereign Lexicon! Place letter tiles on the board to build intersecting dictionary words. The opening word must cover the center star. Use premium colored squares to double or triple your letter and word values. Use all seven tiles in a single turn for a fifty-point Bingo bonus!",
    latencySeconds: 8,
    advancedStrategies: [
      "Rack Balancing: Always try to keep an equitable ratio of 3 vowels to 4 consonants. Don't waste all vowels in one turn.",
      "Parallel Plays: Placing a word directly adjacent to another word creates multiple 2-letter cross-words, racking up massive cumulative points.",
      "Stem Preservation: Letter stems like -ING, -ED, -ER, and -EST provide effortless Bingo setups when combined with root words.",
      "Defense Against Opponent: Avoid opening up easy triple-word score squares on the board edges for your opponent to exploit."
    ],
    cheatSheet: {
      headers: ["Square Type", "Score Multiplier", "Strategic Best Use"],
      rows: [
        ["Triple Word (3W)", "Triples Entire Word", "Hold for 5+ letter words or Bingos."],
        ["Double Word (2W)", "Doubles Entire Word", "Great for high-value root word expansions."],
        ["Triple Letter (3L)", "Triples Tile Value", "Reserve for Q (10), Z (10), J (8), X (8)."],
        ["Double Letter (2L)", "Doubles Tile Value", "Ideal for letters worth 3 to 5 points (B, C, M, P, F, H, V, W, Y)."],
        ["Bingo (+50 pts)", "Flat +50 Bonus", "Triggered by placing all 7 rack tiles in one move."]
      ]
    }
  },
  tank_minefield: {
    title: "Tank Minefield: Iron Perimeter",
    category: "Tactical First-Person Navigation & Logic",
    objective: "Command your 50-ton tank through a live minefield to the green extraction zone, using deductive perimeter scanning while preserving your 3 Armor Plating points.",
    rules: [
      "Navigate using W/A/S/D or Arrow keys. Primary view is the 3D first-person perspective.",
      "Revealed numbers indicate the total count of active mines in the 8 neighboring cells.",
      "Stepping on an unexploded mine detonates it, dealing 1 point of armor damage and leaving a charred crater.",
      "At 0 armor plating, your tank is neutralized. Conserve armor for critical breakthroughs.",
      "Use your Radar Scanner (Spacebar) to safely reveal the current cell's surrounding hazard count.",
      "Mark suspected mines with Tactical Hazard Flags (F key) to safeguard your route planner.",
      "In PvP 24×24 Arena, fire your main cannon (Enter) to engage the enemy tank with 1 shot per round!"
    ],
    mathHeuristic: "Deductive Certainty & Armor Budget: If a cell with number 1 has only 1 unflagged neighbor, that cell is 100% a live mine. If a cell with number 1 has 1 flagged neighbor, all other adjacent unrevealed cells are guaranteed 100% safe to traverse. Never guess blindly while deductive logic can prove a safe route.",
    spokeOverview: "Commander, welcome to Iron Perimeter! Drive your tank forward through the minefield to reach the extraction coordinates. The numbers revealed on the ground indicate how many mines are hidden in adjacent cells. Mark danger zones with hazard flags, use your scanner to reveal terrain, and preserve your three armor plating points at all costs!",
    latencySeconds: 7,
    advancedStrategies: [
      "Corner Deduction: Corner cells touching a 1 have only 3 neighbors total; edge numbers provide the highest deductive certainty.",
      "Flagging Discipline: Always flag confirmed mines immediately so your tactical map pathfinder knows to route around them.",
      "Crater Utilization: Once a mine has exploded, its crater is completely safe and traversable. Use craters as secure pathways.",
      "Controlled Armor Sacrifices: If surrounded by 50/50 guesses, sacrificing 1 armor point on a low-mine pathway can break a total deadlock."
    ],
    cheatSheet: {
      headers: ["Action / Symbol", "Key / Control", "Operational Effect"],
      rows: [
        ["Drive Forward / Rev", "W / S (Up / Down)", "Advance or reverse 1 cell across the grid."],
        ["Turn Left / Right", "A / D (Left / Right)", "Rotate hull and 3D panoramic viewport 90°."],
        ["Radar Scan", "Spacebar", "Scans terrain ahead, revealing mine counts safely."],
        ["Hazard Flag", "F Key", "Toggles high-visibility red warning flag on target cell."],
        ["Cannon Fire (PvP)", "Enter Key", "Fires 105mm armor-piercing shell directly ahead."],
        ["Armor Integrity", "3 Points Total", "Each mine detonation removes 1 point; 0 = Defeat."]
      ]
    }
  },
  mahjong: {
    title: "Jade Pavilion: Mahjong Tile Matching",
    category: "Tile-Matching Patience Puzzle",
    objective: "Clear every tile from the board by removing matching pairs of free tiles.",
    rules: [
      "Click two identical tiles to remove them as a pair.",
      "A tile is free only when nothing rests on top of it and its left or right side is open.",
      "Any Flower matches any other Flower, and any Season matches any other Season.",
      "Every deal can be cleared. If you run out of pairs, Shuffle re-deals the remaining tiles into a clearable position for 25 points.",
      "Matching again within 5 seconds builds a combo worth extra points."
    ],
    mathHeuristic: "Unlock First: prefer pairs that sit on top of other tiles or at the ends of long rows. When three copies of a tile are free, keep the one that blocks the most tiles for later and match the other two.",
    spokeOverview: "Welcome to Jade Pavilion! Match pairs of identical tiles to clear the board. A tile can only be taken when nothing is stacked on it and one of its long sides is open. Work from the top of the stacks and the ends of the rows, and every deal can be cleared.",
    latencySeconds: 9,
    advancedStrategies: [
      "Dig the Stacks: tall stacks hide the most tiles, so clear from the top down early.",
      "Open Long Rows: the ends of the longest rows free tiles fastest.",
      "Count Your Fours: when all four copies of a tile are free, clear both pairs at once with no risk.",
      "Do Not Bury a Partner: avoid matching two free copies when the other two are both stacked under the same tile."
    ],
    cheatSheet: {
      headers: ["Tile Family", "Matches With", "Pair Value"],
      rows: [
        ["Dots, Bamboo, Characters 1-9", "Identical tile only", "10 points"],
        ["Winds (E, S, W, N)", "Identical wind only", "10 points"],
        ["Dragons (Red, Green, Pale)", "Identical dragon only", "10 points"],
        ["Flowers", "Any Flower", "20 points"],
        ["Seasons", "Any Season", "20 points"],
        ["Quick combo", "Match within 5 seconds", "+5 per combo step (max +25)"],
        ["Board cleared", "Last pair removed", "+250 bonus"]
      ]
    }
  },
  sudoku: {
    title: "Ninefold: Sudoku Number Puzzle",
    category: "Logic Number Placement Puzzle",
    objective: "Fill every empty cell so each row, each column and each 3x3 box holds the digits 1 to 9 exactly once.",
    rules: [
      "Pick a cell, then a number from the pad or keyboard (1-9). Delete or 0 clears it.",
      "Each row, column and 3x3 box must contain 1 to 9 with no repeats.",
      "Every puzzle has exactly one solution, so it never needs a guess.",
      "Wrong numbers turn red and count as a mistake.",
      "Pencil mode (P) adds small notes; placing a number removes it from notes nearby.",
      "The Daily button gives today's puzzle for the chosen difficulty."
    ],
    mathHeuristic: "Elimination First: for each box, ask where a missing digit could still go. When the rest of the box is blocked by that digit in crossing rows and columns, only one cell is left.",
    spokeOverview: "Welcome to Ninefold! Fill the grid so every row, every column and every three by three box holds the numbers one to nine exactly once. Start with the digits that already appear most often, and use pencil notes when a cell has a few options.",
    latencySeconds: 10,
    advancedStrategies: [
      "Hidden Singles: scan one digit across the whole board and find the box where it has just one possible cell.",
      "Naked Singles: a cell whose row, column and box already use eight digits must be the ninth.",
      "Pointing Pairs: if a digit's options in a box sit in one row, that digit can be removed from the rest of that row.",
      "Naked Pairs: two cells in a unit sharing the same two options claim both digits; remove them elsewhere in that unit."
    ],
    cheatSheet: {
      headers: ["Difficulty", "Techniques Needed", "Points per Cell / Finish Bonus"],
      rows: [
        ["Easy", "Singles only, about 37 clues", "5 / +250"],
        ["Medium", "Singles, about 30 clues", "10 / +500"],
        ["Hard", "Pointing pairs and box-line", "15 / +800"],
        ["Expert", "Naked and hidden pairs", "20 / +1200"],
        ["Mistake", "Wrong number placed", "-10 points, -25 from finish bonus"],
        ["Hint used", "Explained step", "-50 from finish bonus"]
      ]
    }
  },
  keystone_drop: {
    title: "Keystone Drop: Falling Blocks",
    category: "Real-Time Stacking Puzzle",
    objective: "Guide falling four-block shapes into the well and clear 40 full rows before the stack reaches the top.",
    rules: [
      "Slide shapes with the left and right arrows and turn them with Up, X or Z.",
      "Down speeds a shape up; Space drops it instantly and locks it in place.",
      "A full row of ten blocks disappears and everything above it moves down.",
      "C or Shift holds one shape for later, once per drop.",
      "Every 10 rows the level rises and shapes fall faster.",
      "If a new shape has no room to appear, the run ends. Clear 40 rows to win."
    ],
    mathHeuristic: "Flat Surface, One Open Column: keep the top of the stack even and leave a single column empty. Feed it the long bar for a four-row clear, worth eight times a single row.",
    spokeOverview: "Welcome to Keystone Drop! Shapes fall into the well. Slide and turn them to fill complete rows, which then vanish. Keep the stack low and flat, hold the long bar for a four-row clear, and reach forty rows to win.",
    latencySeconds: 10,
    advancedStrategies: [
      "Read the previews: plan where the next three shapes will go before you place this one.",
      "Avoid buried gaps: a hole under a block stays until every row above it clears.",
      "Build a combo: clearing rows on back-to-back shapes adds a growing bonus.",
      "Chase a Keystone: emptying the whole well scores a large bonus."
    ],
    cheatSheet: {
      headers: ["Clear", "Points (x level)", "Notes"],
      rows: [
        ["Single (1 row)", "100", "Safe and steady"],
        ["Double (2 rows)", "300", "Two rows at once"],
        ["Triple (3 rows)", "500", "Keep one column open"],
        ["Quad (4 rows)", "800", "Drop the long bar into the open column"],
        ["Combo", "+50 per step", "Clear on consecutive shapes"],
        ["Keystone (empty well)", "+1500", "Perfect clear bonus"],
        ["Soft / hard drop", "1 / 2 per row", "Small, steady bonus"]
      ]
    }
  },
  dominoes: {
    title: "Bone Yard: Dominoes",
    category: "Tile Matching Table Game",
    objective: "Empty your hand first by matching tile ends to the open layout, then win the match by points or by the lowest pip total.",
    rules: [
      "Click a glowing tile to play it. If it fits two ends, click the end you want.",
      "Block Game: if you cannot play you pass. First to 50 points wins.",
      "Draw Game: if you cannot play, draw from the boneyard until you can. First to 75 wins.",
      "All Fives: score whenever the open ends add up to a multiple of 5. First to 100 wins.",
      "Mexican Train: build your own train from the hub, or play on the Mexican train or any marked train. A double must be covered at once. Lowest total pips wins.",
      "Chickenfoot: the starting double has three branches that must all be started first. Doubles must be covered at once. Lowest total pips wins."
    ],
    mathHeuristic: "Heavy First, Keep Options: play your high-pip tiles early so they cost less if you get stuck, and prefer plays that leave ends you can follow up with another tile in your hand.",
    spokeOverview: "Welcome to Bone Yard! Match the number on a tile to an open end of the layout. Empty your hand first to win the round. Pick Block, Draw, All Fives, Mexican Train or Chickenfoot from the game list on the side.",
    latencySeconds: 10,
    advancedStrategies: [
      "Count the suit: seven tiles carry each number in a double-six set. Track which are gone to guess what opponents hold.",
      "Dump doubles early: a double only matches one number and is hard to place late.",
      "All Fives: aim for ends that add to 10 or 15, and avoid leaving a 5 or 10 for the next player.",
      "Mexican Train: keep your train closed. Only mark it when you must, since others can then play on it."
    ],
    cheatSheet: {
      headers: ["Game", "Hand Size (2 / 3-4 players)", "Winning"],
      rows: [
        ["Block", "7 / 5", "First to 50 points"],
        ["Draw", "7 / 5", "First to 75 points"],
        ["All Fives", "7 / 5", "First to 100 points"],
        ["Mexican Train", "12 / 11 / 10 (2 / 3 / 4)", "Lowest total pips after the last round"],
        ["Chickenfoot", "10 / 9 / 8 (2 / 3 / 4)", "Lowest total pips after the last round"],
        ["Double-blank", "Counts 50 pips in train games", "Play it early"]
      ]
    }
  },
  trash_conveyor: {
    title: "Jimothy's Trash Conveyor Frenzy",
    category: "Real-Time Catch and Sort",
    objective: "Play five timed levels. Catch each piece of falling food in the bin that matches it, keep your streak going, and finish every level with as much score and as many stars as you can.",
    rules: [
      "Bananas go in the Yellow bin, salad in the Green bin, apples in the Red bin.",
      "Each level lasts 50 seconds. When the time is up you see a score summary and press Next level to continue. You cannot lose; the run ends after level 5.",
      "Catching food in the wrong bin is allowed, but it scores 0 points. Your streak is safe.",
      "Every 4 right catches in a row raises your multiplier, up to 5x. Dropping food on the floor or catching a rotten skull ends the streak, and the skull also costs 100 points.",
      "Levels end with 1 to 3 stars based on how much of the food you caught correctly, and each star adds 200 points.",
      "From level 2, pink trampolines slide back and forth. Food that lands on one is kicked up to the belt above, and catching it in the right bin afterwards earns 50 bonus points.",
      "Belts flash amber and then reverse direction, so watch where food will roll off.",
      "Power-ups: the golden donut gives bonus points, the clock slows the belts, the magnet pulls matching food to you."
    ],
    mathHeuristic: "Pre-select, then move: the bin matters more than where you stand. Look at the lowest food, press its bin key, then slide under it. A streak of 16 pays five times as much per catch as a streak of 3.",
    spokeOverview: "Welcome to Jimothy's Trash Conveyor Frenzy! Match each falling item to its coloured bin. Use the number keys, Q W E, or J K L to jump straight to a bin, and the arrow keys to slide. Keep your streak alive for a big multiplier, grab donuts for bonus points, and dodge the skulls.",
    latencySeconds: 8,
    advancedStrategies: [
      "Switch early: change bins while the food is still on the belt, then use the arrows to line up.",
      "Park near the middle: from the centre you can reach either side before the food lands.",
      "Read the belts: an amber flash means the belt is about to flip, so food will go the other way.",
      "Save the magnet and freeze for a crowded screen, not a quiet one.",
      "When the right bin is out of reach, catch the food in the bin you are holding for 0 points. That is better than dropping it, which costs a life."
    ],
    cheatSheet: {
      headers: ["Item", "Bin or effect", "Points"],
      rows: [
        ["Banana", "Yellow bin (1 / Q / J)", "100 x multiplier"],
        ["Salad", "Green bin (2 / W / K)", "100 x multiplier"],
        ["Apple", "Red bin (3 / E / L)", "100 x multiplier"],
        ["Golden donut", "Any bin", "300 x multiplier"],
        ["Clock / Magnet", "Any bin", "Slow belts 5s / pull food 6s"],
        ["Skull", "Avoid it", "Costs a life"]
      ]
    }
  }
};

export class PedagogicalCoach {
  constructor(app) {
    this.app = app;
    const storage = typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {} };
    this.enabled = storage.getItem('solitaire_coach_enabled') !== 'false';
    this.voiceEnabled = storage.getItem('solitaire_coach_voice') !== 'false';
    this.latencyMultiplier = parseFloat(storage.getItem('solitaire_coach_latency') || '1.0');
    
    // Telemetry & Idle Tracking State
    this.lastInteractionTime = Date.now();
    this.hesitationState = COACH_PHASES.ACTIVE;
    this.lastVoiceHintTime = 0;
    this.voiceCooldownMs = 20000; // 20s hysteresis cooldown between automated spoken hints
    this.idleTimerId = null;
    this.isSpeaking = false;
    this.activeUtterance = null;
    
    // Sidechain Ducking State
    this.isDucked = false;
    this.originalMusicVolume = 0.5;

    // Web Speech API Voice Selection
    this.selectedVoice = null;
    this._initSpeechSynthesis();

    // DOM References
    this.modalEl = null;
    this.toastEl = null;
    this.teacherBtn = null;

    this._bindGlobalTelemetry();
    this._startIdleLoop();
  }

  // --------------------------------------------------------------------------
  // SPEECH SYNTHESIS & PHONETIC NORMALIZATION (SSML PARSER)
  // --------------------------------------------------------------------------

  _initSpeechSynthesis() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Prioritize natural, expressive female voices per VUI pedagogical guidelines
      const preferredVoices = [
        'Google US English',
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Microsoft Jenny',
        'Microsoft Zira',
        'Samantha',
        'Victoria',
        'Karen',
        'en-US'
      ];

      for (const pref of preferredVoices) {
        const found = voices.find(v => v.name.includes(pref) || v.lang.includes(pref));
        if (found) {
          this.selectedVoice = found;
          break;
        }
      }

      if (!this.selectedVoice) {
        this.selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Phonetically normalizes shorthand card strings and tactical card notations into natural speech
   */
  normalizeTextForSpeech(text) {
    if (!text) return '';

    let normalized = text
      // Expand rank-suit combos: e.g. "K♠", "10♥", "A♦", "7♣"
      .replace(/10\s*♠/gi, 'Ten of Spades')
      .replace(/10\s*♥/gi, 'Ten of Hearts')
      .replace(/10\s*♦/gi, 'Ten of Diamonds')
      .replace(/10\s*♣/gi, 'Ten of Clubs')
      .replace(/([2-9])\s*♠/gi, '$1 of Spades')
      .replace(/([2-9])\s*♥/gi, '$1 of Hearts')
      .replace(/([2-9])\s*♦/gi, '$1 of Diamonds')
      .replace(/([2-9])\s*♣/gi, '$1 of Clubs')
      .replace(/A\s*♠/gi, 'Ace of Spades')
      .replace(/A\s*♥/gi, 'Ace of Hearts')
      .replace(/A\s*♦/gi, 'Ace of Diamonds')
      .replace(/A\s*♣/gi, 'Ace of Clubs')
      .replace(/K\s*♠/gi, 'King of Spades')
      .replace(/K\s*♥/gi, 'King of Hearts')
      .replace(/K\s*♦/gi, 'King of Diamonds')
      .replace(/K\s*♣/gi, 'King of Clubs')
      .replace(/Q\s*♠/gi, 'Queen of Spades')
      .replace(/Q\s*♥/gi, 'Queen of Hearts')
      .replace(/Q\s*♦/gi, 'Queen of Diamonds')
      .replace(/Q\s*♣/gi, 'Queen of Clubs')
      .replace(/J\s*♠/gi, 'Jack of Spades')
      .replace(/J\s*♥/gi, 'Jack of Hearts')
      .replace(/J\s*♦/gi, 'Jack of Diamonds')
      .replace(/J\s*♣/gi, 'Jack of Clubs')
      // Expand column references: "Col 3" -> "Column three"
      .replace(/Col(?:umn)?\s*(\d+)/gi, 'Column $1')
      .replace(/Cascade\s*(\d+)/gi, 'Cascade $1')
      .replace(/Foundation\s*(\d+)/gi, 'Foundation $1')
      // Technical abbreviations
      .replace(/\+EV/gi, 'positive expected value')
      .replace(/-EV/gi, 'negative expected value')
      .replace(/EV/gi, 'expected value')
      .replace(/S17/gi, 'dealer stands on soft 17')
      .replace(/H17/gi, 'dealer hits on soft 17')
      // Remove symbols & bullet markers
      .replace(/[✦💡⚔️👑✨🎆→—•]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Add natural speech variations for more conversational flow
    return this._addNaturalSpeechVariations(normalized);
  }

  /**
   * Adds natural conversational variations to make speech more human-like
   */
  _addNaturalSpeechVariations(text) {
    if (!text) return '';

    // Add conversational openings (10% chance)
    const openings = ['Hey,', 'Alright,', 'Okay,', 'Listen,', 'So,', 'Well,', 'Here\'s a thought,', 'You know what?'];
    if (Math.random() < 0.10 && !this._hasOpening(text)) {
      const opening = openings[Math.floor(Math.random() * openings.length)];
      text = `${opening} ${text}`;
    }

    // Replace robotic phrases with natural alternatives
    const replacements = [
      { pattern: /^Move /i, alternatives: ['Try moving ', 'You could move ', 'How about moving ', 'Consider moving '] },
      { pattern: /^Consider /i, alternatives: ['Think about ', 'Maybe try ', 'You might want to '] },
      { pattern: /^Play /i, alternatives: ['Try playing ', 'You should play ', 'How about playing '] },
      { pattern: / to reveal/i, alternatives: [' and reveal', ' which reveals', ' to uncover'] },
      { pattern: / to unblock/i, alternatives: [' and unblock', ' which unblocks', ' so you can access'] },
      { pattern: / for Foundation/i, alternatives: [' to the Foundation', ' onto the Foundation'] }
    ];

    for (const { pattern, alternatives } of replacements) {
      if (pattern.test(text) && Math.random() < 0.40) {
        const alt = alternatives[Math.floor(Math.random() * alternatives.length)];
        text = text.replace(pattern, (match) => {
          // Preserve case
          if (match[0] === match[0].toUpperCase()) {
            return alt.charAt(0).toUpperCase() + alt.slice(1);
          }
          return alt;
        });
      }
    }

    // Add natural pauses with commas for longer sentences
    if (text.length > 60 && !text.includes(',')) {
      text = text.replace(/ (and|which|that|so|to) /i, (match, word) => `, ${word} `);
    }

    // Add affirmations for good moves (5% chance)
    const affirmations = ['Nice!', 'Good thinking!', 'Smart move!', 'Excellent!', 'Great choice!'];
    if (Math.random() < 0.05 && text.includes('to Foundation')) {
      const affirm = affirmations[Math.floor(Math.random() * affirmations.length)];
      text = `${affirm} ${text}`;
    }

    return text;
  }

  _hasOpening(text) {
    const openingPatterns = /^(Hey|Alright|Okay|Listen|So|Well|Here's|You know)/i;
    return openingPatterns.test(text);
  }

  /**
   * Speaks vocal instructions with sidechain music ducking and barge-in listeners
   * @param {string} text Spoken prompt
   * @param {number} rate Speech rate (0.95 for tactical prompts, 1.05 for overviews)
   * @param {Function} onStart Optional callback
   * @param {Function} onEnd Optional callback
   */
  speak(text, rate = 0.96, onStart = null, onEnd = null) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    const cleanText = this.normalizeTextForSpeech(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing speech immediately
    this.cancelSpeech();

    // Halt any active celebration audio so voices never talk over each other
    if (this.app && this.app.celebrationAudio) {
      try { this.app.celebrationAudio.stopAll(); } catch (e) {}
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.activeUtterance = utterance;
      this._applyAudioDucking(true);
      this._showSpeakingIndicator(true);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.activeUtterance = null;
      this._applyAudioDucking(false);
      this._showSpeakingIndicator(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('[Coach] Speech error:', e);
      }
      this.isSpeaking = false;
      this.activeUtterance = null;
      this._applyAudioDucking(false);
      this._showSpeakingIndicator(false);
      if (onEnd) onEnd();
    };

    // Chromium speech resilience: slight tick prevents synchronous cancel from wiping new utterance
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[Coach] Speech speak error:', err);
      }
    }, 40);
  }

  /**
   * 80ms Fast Barge-In Cancellation: Halts speech when player takes intentional action
   */
  cancelSpeech() {
    if (this.isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.activeUtterance = null;
      this._applyAudioDucking(false);
      this._showSpeakingIndicator(false);
    }
  }

  // --------------------------------------------------------------------------
  // SIDECHAIN AUDIO DUCKING (-12 dB ATTENUATION ENVELOPE)
  // --------------------------------------------------------------------------

  _applyAudioDucking(duck) {
    if (!this.app.music) return;

    if (duck && !this.isDucked) {
      this.isDucked = true;
      this.originalMusicVolume = this.app.music.volume || 0.5;
      // Attenuate music to approximately 25% of baseline (-12 dB)
      const duckedVol = Math.max(0.05, this.originalMusicVolume * 0.25);
      if (this.app.music.audio) {
        this.app.music.audio.volume = duckedVol;
      }
    } else if (!duck && this.isDucked) {
      this.isDucked = false;
      // Smooth restoration to nominal volume
      setTimeout(() => {
        if (!this.isDucked && this.app.music && this.app.music.audio) {
          this.app.music.audio.volume = this.originalMusicVolume;
        }
      }, 300);
    }
  }

  // --------------------------------------------------------------------------
  // TELEMETRY & ADAPTIVE HESITATION GATING
  // --------------------------------------------------------------------------

  _bindGlobalTelemetry() {
    if (typeof window === 'undefined') return;
    const notifyActivity = () => {
      // Barge-in: if user clicks, moves, or interacts while coach is talking, cancel speech
      if (this.isSpeaking) {
        this.cancelSpeech();
      }
      this.lastInteractionTime = Date.now();
      if (this.hesitationState !== COACH_PHASES.ACTIVE) {
        this.hesitationState = COACH_PHASES.ACTIVE;
        this._removeAmbientPulsing();
      }
    };

    window.addEventListener('pointerdown', notifyActivity, { passive: true });
    window.addEventListener('keydown', notifyActivity, { passive: true });
    window.addEventListener('dragstart', notifyActivity, { passive: true });

    // AFK Gating on window blur
    window.addEventListener('blur', () => {
      this.hesitationState = COACH_PHASES.AFK_SUSPENDED;
      this.cancelSpeech();
    });

    window.addEventListener('focus', () => {
      this.lastInteractionTime = Date.now();
      this.hesitationState = COACH_PHASES.ACTIVE;
    });
  }

  _startIdleLoop() {
    if (typeof window === 'undefined') return;
    if (this.idleTimerId) clearInterval(this.idleTimerId);
    this.idleTimerId = setInterval(() => this._evaluateHesitation(), 1000);
  }

  _evaluateHesitation() {
    if (!this.enabled) return;
    if (this.hesitationState === COACH_PHASES.AFK_SUSPENDED) return;
    if (!this.app.currentGame) return;

    const gameData = GAME_TUTORIAL_DATA[this.app.gameType] || GAME_TUTORIAL_DATA.klondike_1;
    const baseLatency = (gameData.latencySeconds || 8) * this.latencyMultiplier * 1000;
    const elapsed = Date.now() - this.lastInteractionTime;

    // AFK Threshold: 45 seconds of total inaction
    if (elapsed > 45000) {
      this.hesitationState = COACH_PHASES.AFK_SUSPENDED;
      this.cancelSpeech();
      this._removeAmbientPulsing();
      return;
    }

    // Phase 1: Ambiguous Pause (50% of latency threshold)
    if (elapsed >= baseLatency * 0.5 && this.hesitationState === COACH_PHASES.ACTIVE) {
      this.hesitationState = COACH_PHASES.AMBIGUOUS_PAUSE;
      this._triggerPhase1SubtlePulse();
    }

    // Phase 2: Cognitive Paralysis (100% of latency threshold)
    if (elapsed >= baseLatency && this.hesitationState === COACH_PHASES.AMBIGUOUS_PAUSE) {
      this.hesitationState = COACH_PHASES.COGNITIVE_PARALYSIS;
      this._triggerPhase2Intervention();
    }
  }

  _triggerPhase1SubtlePulse() {
    // Phase 1 ambient pulse on candidate cards without explicit solution arrows
    const candidate = document.querySelector('.solitaire-card[data-zone="tableau"], .solitaire-card[data-zone="poker"], .solitaire-card[data-zone="dealer"]');
    if (candidate) {
      candidate.classList.add('coach-ambient-pulse');
    }
  }

  _triggerPhase2Intervention() {
    this._removeAmbientPulsing();

    // Check hysteresis cooldown
    const now = Date.now();
    if (now - this.lastVoiceHintTime < this.voiceCooldownMs) {
      return;
    }
    this.lastVoiceHintTime = now;

    // Generate tactical guidance from active game solver
    if (!this.app.currentGame || !this.app.currentGame.getTacticalHint) return;
    const hint = this.app.currentGame.getTacticalHint();
    if (!hint) return;

    const message = hint.message || hint.reason || 'Consider your next strategic move.';

    // Play gentle advisory chime
    if (this.app.sound) {
      this.app.sound.playFoundationSnap(4);
    }

    // Display toast with animated microphone badge
    this.showCoachToast(message, true);

    // Coordinate spoken hint with visual highlighting
    if (this.voiceEnabled) {
      this.speak(message, 0.95);
    }

    // Activate visual directional highlights
    this.app.showHint();
  }

  _removeAmbientPulsing() {
    document.querySelectorAll('.coach-ambient-pulse').forEach(el => el.classList.remove('coach-ambient-pulse'));
  }

  // --------------------------------------------------------------------------
  // UI PRESENTATION: COACH TOAST & SPEAKING INDICATOR
  // --------------------------------------------------------------------------

  showCoachToast(message, isAutomated = false) {
    if (!this.toastEl) {
      this.toastEl = document.createElement('div');
      this.toastEl.id = 'coach-guidance-toast';
      this.toastEl.className = 'coach-guidance-toast';
      document.body.appendChild(this.toastEl);
    }

    this.toastEl.innerHTML = `
      <div class="coach-toast-inner">
        <div class="coach-avatar-badge" id="coach-speaking-wave">
          🎓
          <span class="coach-wave-bars">
            <span></span><span></span><span></span>
          </span>
        </div>
        <div class="coach-toast-content">
          <div class="coach-toast-header">
            <span class="coach-toast-title">Pedagogical Coach</span>
            <span class="coach-toast-badge">${isAutomated ? 'Adaptive Guidance' : 'Tactical Hint'}</span>
          </div>
          <div class="coach-toast-body">${message}</div>
        </div>
        <button class="coach-toast-close" title="Dismiss Guidance" id="btn-coach-toast-close">✕</button>
      </div>
    `;

    this.toastEl.classList.add('active');

    document.getElementById('btn-coach-toast-close')?.addEventListener('click', () => {
      this.cancelSpeech();
      this.toastEl.classList.remove('active');
    });

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      if (this.toastEl) this.toastEl.classList.remove('active');
    }, 7000);
  }

  _showSpeakingIndicator(isSpeaking) {
    const waveEl = document.getElementById('coach-speaking-wave');
    if (waveEl) {
      if (isSpeaking) waveEl.classList.add('speaking');
      else waveEl.classList.remove('speaking');
    }

    const modalWave = document.getElementById('modal-coach-eq-bars');
    if (modalWave) {
      if (isSpeaking) modalWave.classList.add('active');
      else modalWave.classList.remove('active');
    }
  }

  // --------------------------------------------------------------------------
  // ON-DEMAND "TEACHER" OVERVIEW MODAL
  // --------------------------------------------------------------------------

  closeTeacherModal() {
    this.cancelSpeech();
    const modal = document.getElementById('teacher-tutorial-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
    this.lastInteractionTime = Date.now();
    this.hesitationState = COACH_PHASES.ACTIVE;
  }

  openTeacherModal() {
    this.cancelSpeech();
    this.hesitationState = COACH_PHASES.AFK_SUSPENDED; // Pause idle triggers while reviewing tutorial

    const gameKey = this.app.gameType || 'klondike_1';
    const tutorial = GAME_TUTORIAL_DATA[gameKey] || GAME_TUTORIAL_DATA.klondike_1;

    let modal = document.getElementById('teacher-tutorial-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'teacher-tutorial-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    let cheatSheetHTML = '';
    if (tutorial.cheatSheet) {
      cheatSheetHTML = `
        <div class="teacher-cheat-sheet">
          <div class="cheat-sheet-title">✦ Strategic Decision Matrix & Heuristics</div>
          <table class="cheat-sheet-table">
            <thead>
              <tr>${tutorial.cheatSheet.headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${tutorial.cheatSheet.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="modal-card teacher-modal-card">
        <div class="modal-header">
          <div class="teacher-title-group">
            <span class="teacher-icon">🎓</span>
            <div>
              <div class="modal-title">${tutorial.title}</div>
              <div class="teacher-subtitle">${tutorial.category} &bull; Intelligent Coach Overview</div>
            </div>
          </div>
          <button class="modal-close" id="btn-close-teacher" title="Close Tutorial" onclick="window.solitaireApp?.coach?.closeTeacherModal?.()">✕</button>
        </div>

        <div class="teacher-modal-body">
          <!-- Voice Player Control Bar -->
          <div class="teacher-voice-bar">
            <div class="voice-bar-left">
              <button id="btn-teacher-voice-toggle" class="btn btn-primary btn-sm btn-voice-play">
                <span id="teacher-voice-icon">🔊</span>
                <span id="teacher-voice-label">Listen to Coach</span>
              </button>
              <button id="btn-teacher-voice-stop" class="btn btn-secondary btn-sm" title="Stop Audio">⏹</button>
              <div class="coach-eq-bars" id="modal-coach-eq-bars">
                <span></span><span></span><span></span><span></span>
              </div>
            </div>
            <div class="voice-bar-right">
              <label class="coach-switch-label">
                <input type="checkbox" id="chk-auto-voice" ${this.voiceEnabled ? 'checked' : ''}/>
                <span>Spoken Hesitation Hints</span>
              </label>
            </div>
          </div>

          <!-- Objective & Core Rules -->
          <div class="teacher-section">
            <div class="teacher-section-title">Macro Objective</div>
            <p class="teacher-objective-text">${tutorial.objective}</p>
          </div>

          <div class="teacher-section">
            <div class="teacher-section-title">Fundamental Mechanics & Constraints</div>
            <ul class="teacher-rules-list">
              ${tutorial.rules.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>

          <!-- Mathematical Solver & Heuristic Core -->
          <div class="teacher-section teacher-math-box">
            <div class="teacher-section-title">Mathematical Heuristic</div>
            <p class="teacher-math-text">${tutorial.mathHeuristic}</p>
          </div>

          <!-- Strategy Cheat Sheet Table -->
          ${cheatSheetHTML}
        </div>

        <div class="modal-footer teacher-footer">
          <button class="btn btn-secondary" id="btn-test-hint-now" onclick="window.solitaireApp?.coach?.closeTeacherModal?.(); window.solitaireApp?.showHint?.();">💡 Test Tactical Hint</button>
          <button class="btn btn-primary" id="btn-teacher-close-done" onclick="window.solitaireApp?.coach?.closeTeacherModal?.()">Return to Game</button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    modal.classList.add('active');

    // Bind Modal Events
    document.getElementById('btn-close-teacher')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTeacherModal();
    });

    document.getElementById('btn-teacher-close-done')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTeacherModal();
    });

    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closeTeacherModal();
      }
    };

    // Audio Play/Pause Button
    const playBtn = document.getElementById('btn-teacher-voice-toggle');
    const playLabel = document.getElementById('teacher-voice-label');
    const playIcon = document.getElementById('teacher-voice-icon');

    playBtn?.addEventListener('click', () => {
      if (this.isSpeaking) {
        this.cancelSpeech();
        if (playLabel) playLabel.textContent = "Listen to Coach";
        if (playIcon) playIcon.textContent = "🔊";
      } else {
        if (playLabel) playLabel.textContent = "Speaking...";
        if (playIcon) playIcon.textContent = "⏸";
        this.speak(tutorial.spokeOverview, 1.02, null, () => {
          if (playLabel) playLabel.textContent = "Replay Overview";
          if (playIcon) playIcon.textContent = "🔄";
        });
      }
    });

    document.getElementById('btn-teacher-voice-stop')?.addEventListener('click', () => {
      this.cancelSpeech();
      if (playLabel) playLabel.textContent = "Listen to Coach";
      if (playIcon) playIcon.textContent = "🔊";
    });

    // Checkbox for Auto-Voice
    document.getElementById('chk-auto-voice')?.addEventListener('change', (e) => {
      this.voiceEnabled = e.target.checked;
      localStorage.setItem('solitaire_coach_voice', this.voiceEnabled);
    });

    // Automatically speak overview upon opening if voice enabled
    if (this.voiceEnabled) {
      if (playLabel) playLabel.textContent = "Speaking...";
      if (playIcon) playIcon.textContent = "⏸";
      this.speak(tutorial.spokeOverview, 1.02, null, () => {
        if (playLabel) playLabel.textContent = "Replay Overview";
        if (playIcon) playIcon.textContent = "🔄";
      });
    }
  }
}
