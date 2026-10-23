/**
 * Word Tiles: Sovereign Lexicon — Main Game Coordinator
 * 
 * Rules:
 * - 15x15 board, 7-tile racks, 100-tile English bag.
 * - Human vs Fair Computer Opponent.
 * - Atomic move commitment with full rollback on validation failure.
 * - Turn-based lifecycle: Human Turn -> AI Turn -> Game Over.
 */

import { RULES_CONFIG_V1 } from '../core/word_tiles/rules_config.js';
import { WordBoard } from '../core/word_tiles/board.js';
import { TileBag, Tile } from '../core/word_tiles/bag.js';
import { WordDictionary } from '../core/word_tiles/dictionary.js';
import { BoardValidator } from '../core/word_tiles/validator.js';
import { BoardScorer } from '../core/word_tiles/scorer.js';
import { AIPlayer, AI_DIFFICULTY } from '../core/word_tiles/ai_player.js';
import { PRNG } from '../core/prng.js';

export class WordTilesGame {
  constructor(options = {}) {
    this.config = options.config || RULES_CONFIG_V1;
    this.seed = options.seed || Date.now();
    this.prng = new PRNG(this.seed);
    this.dealCode = `WT-${Math.abs(this.seed).toString(36).toUpperCase()}`;

    // Initialize Components
    this.board = new WordBoard(this.config);
    this.bag = new TileBag({ config: this.config, seed: this.seed });
    this.dictionary = options.dictionary || new WordDictionary();

    if (!this.dictionary.isLoaded) {
      this.dictionary.loadCoreSeedLexicon();
    }

    this.aiPlayer = new AIPlayer({
      difficulty: options.difficulty || AI_DIFFICULTY.MEDIUM,
      timeBudgetMs: options.aiTimeBudgetMs || 1500
    });

    this.cancelToken = { isCancelled: false };

    // Game State
    this.state = {
      score: 0, // Human score (for platform HUD)
      humanScore: 0,
      aiScore: 0,
      moves: 0,
      won: false,
      turn: 'human', // 'human' | 'ai' | 'game_over'
      consecutivePasses: 0,
      gameOver: false,
      winner: null,
      gameEndReason: null,
      finalScoreAdjustments: null
    };

    this.humanRack = [];
    this.aiRack = [];
    this.temporaryPlacements = []; // Array<{ row, col, tile, originRackIndex }>
    this.moveHistory = [];
    this.p2pRole = options.p2pRole || null;
    this.playerName = options.playerName || 'Player 1';
    this.opponentName = options.opponentName || 'Opponent';
    this._dealInitialRacks(this.p2pRole);
  }

  _dealInitialRacks(p2pRole = null) {
    this.humanRack = this.bag.draw(this.config.rackCapacity);
    this.aiRack = this.bag.draw(this.config.rackCapacity);
    if (p2pRole === 'guest') {
      // For Guest player, swap humanRack and aiRack so local playable rack is Rack 2
      const temp = this.humanRack;
      this.humanRack = this.aiRack;
      this.aiRack = temp;
      this.state.turn = 'ai'; // Guest waits for Host (Player 1)
    }
    this.assertConservation();
  }

  setDifficulty(diff) {
    this.aiPlayer.setDifficulty(diff);
  }

  // --------------------------------------------------------------------------
  // TEMPORARY PLACEMENT (UNCOMMITTED DRAG / CLICK ACTIONS)
  // --------------------------------------------------------------------------

  placeTileFromRack(rackIndex, row, col) {
    if (this.state.turn !== 'human' || this.state.gameOver) return false;
    if (rackIndex < 0 || rackIndex >= this.humanRack.length) return false;

    // Check if cell is occupied on board
    const cell = this.board.getCell(row, col);
    if (!cell || (cell.isOccupied() && cell.committed)) return false;

    // Check if another temporary tile is already on this cell
    if (this.temporaryPlacements.some(p => p.row === row && p.col === col)) {
      return false;
    }

    // Move tile from rack to temporary placement
    const tile = this.humanRack.splice(rackIndex, 1)[0];
    this.temporaryPlacements.push({ row, col, tile, originRackIndex: rackIndex });
    this.assertConservation();
    return true;
  }

  /**
   * Return a single tile from the board back to your rack
   * @param {number} row - Board row (0-14)
   * @param {number} col - Board column (0-14)
   * @returns {boolean} - True if tile was successfully returned to rack
   */
  recallTile(row, col) {
    if (this.state.turn !== 'human' || this.state.gameOver) return false;

    const idx = this.temporaryPlacements.findIndex(p => p.row === row && p.col === col);
    if (idx === -1) return false;

    const item = this.temporaryPlacements.splice(idx, 1)[0];
    if (item.tile.isBlank) {
      item.tile.designatedLetter = null;
    }
    this.humanRack.push(item.tile);
    this.assertConservation();
    return true;
  }

  /**
   * Return ALL tiles from the board back to your rack
   * This is useful when you want to start over with a different word
   */
  recallAll() {
    if (this.temporaryPlacements.length === 0) return;

    for (const item of this.temporaryPlacements) {
      if (item.tile.isBlank) {
        item.tile.designatedLetter = null;
      }
      this.humanRack.push(item.tile);
    }
    this.temporaryPlacements = [];
    this.assertConservation();
  }

  /**
   * NEW: Return a specific tile from your rack by clicking it
   * This returns the tile from the board if it's placed, otherwise does nothing
   * Use exchangeTiles() to swap rack tiles with the bag
   * @param {number} rackIndex - Index of tile in your rack (0-6)
   * @returns {boolean} - True if the rack position was empty (tile was on board and returned)
   */
  returnRackTile(rackIndex) {
    if (this.state.turn !== 'human' || this.state.gameOver) return false;
    if (rackIndex < 0 || rackIndex >= this.config.rackCapacity) return false;

    // Find if this rack tile is currently placed on the board
    const placement = this.temporaryPlacements.find(p => p.originRackIndex === rackIndex);
    if (placement) {
      return this.recallTile(placement.row, placement.col);
    }

    return false;
  }

  shuffleHumanRack() {
    this.prng.shuffle(this.humanRack);
  }

  assignBlankLetter(row, col, letter) {
    const item = this.temporaryPlacements.find(p => p.row === row && p.col === col);
    if (item && item.tile.isBlank) {
      item.tile.designatedLetter = letter.toUpperCase();
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // VALIDATION & LIVE SCORE PREVIEW
  // --------------------------------------------------------------------------

  getTentativeValidation() {
    if (this.temporaryPlacements.length === 0) {
      return { valid: false, error: 'Place tiles on the board to form a word.' };
    }

    const validation = BoardValidator.validateMove(this.board, this.temporaryPlacements, this.dictionary);
    if (!validation.valid) {
      return validation;
    }

    const scoreResult = BoardScorer.calculateScore(this.board, validation.words, this.temporaryPlacements);
    return {
      valid: true,
      words: validation.words,
      score: scoreResult.totalScore,
      breakdown: scoreResult.breakdown,
      bingo: scoreResult.bingo
    };
  }

  // --------------------------------------------------------------------------
  // ATOMIC MOVE COMMITMENT
  // --------------------------------------------------------------------------

  commitHumanMove() {
    if (this.state.turn !== 'human' || this.state.gameOver) {
      return { success: false, error: 'Not currently human turn.' };
    }

    const tentative = this.getTentativeValidation();
    if (!tentative.valid) {
      return { success: false, error: tentative.error, errorCode: tentative.errorCode };
    }

    // Atomic application to board
    for (const p of this.temporaryPlacements) {
      this.board.setTile(p.row, p.col, p.tile, true);
    }

    const pointsEarned = tentative.score;
    this.state.humanScore += pointsEarned;
    this.state.score = this.state.humanScore; // Platform HUD sync
    this.state.moves++;
    this.state.consecutivePasses = 0;

    const wordsSummary = tentative.words.map(w => w.text).join(', ');
    const committedPlacements = this.temporaryPlacements.map(p => ({
      row: p.row,
      col: p.col,
      tile: p.tile.clone()
    }));

    this.moveHistory.unshift({
      player: this.playerName || 'Human',
      action: 'play',
      word: wordsSummary,
      score: pointsEarned,
      bingo: tentative.bingo,
      breakdown: tentative.breakdown,
      timestamp: Date.now()
    });

    const tilesUsedCount = this.temporaryPlacements.length;
    this.temporaryPlacements = [];

    // Refill human rack from bag
    const drawn = this.bag.draw(tilesUsedCount);
    this.humanRack.push(...drawn);
    this.assertConservation();

    // Check game end condition: bag empty & human rack empty
    if (this.bag.count() === 0 && this.humanRack.length === 0) {
      this._endGame('human_emptied_rack');
      return {
        success: true,
        pointsEarned,
        gameOver: true,
        movePayload: {
          placements: committedPlacements,
          score: pointsEarned,
          words: tentative.words,
          bingo: tentative.bingo,
          breakdown: tentative.breakdown
        }
      };
    }

    // Switch turn
    this.state.turn = 'ai';
    return {
      success: true,
      pointsEarned,
      gameOver: false,
      movePayload: {
        placements: committedPlacements,
        score: pointsEarned,
        words: tentative.words,
        bingo: tentative.bingo,
        breakdown: tentative.breakdown
      }
    };
  }

  // --------------------------------------------------------------------------
  // MULTIPLAYER & P2P TURN-BASED ACTIONS
  // --------------------------------------------------------------------------

  applyRemoteMove(moveData, fromPlayerName = 'Opponent') {
    if (!moveData || !Array.isArray(moveData.placements)) return false;

    // Apply placements to board
    for (const p of moveData.placements) {
      const idx = this.aiRack.findIndex(t => t.id === p.tile.id);
      let tile;
      if (idx !== -1) {
        tile = this.aiRack.splice(idx, 1)[0];
        tile.letter = p.tile.letter;
        tile.score = p.tile.score;
        tile.isBlank = p.tile.isBlank;
        tile.designatedLetter = p.tile.designatedLetter;
      } else {
        tile = new Tile(p.tile.id, p.tile.letter, p.tile.score, p.tile.isBlank);
        tile.designatedLetter = p.tile.designatedLetter;
        if (this.aiRack.length > 0) this.aiRack.pop();
      }
      this.board.setTile(p.row, p.col, tile, true);
    }

    const points = moveData.score || 0;
    this.state.aiScore += points;
    this.state.moves++;
    this.state.consecutivePasses = 0;

    const wordsSummary = moveData.words ? moveData.words.map(w => w.text).join(', ') : 'Word';
    this.moveHistory.unshift({
      player: fromPlayerName,
      action: 'play',
      word: wordsSummary,
      score: points,
      bingo: moveData.bingo,
      breakdown: moveData.breakdown,
      timestamp: Date.now()
    });

    // Draw matching tiles from bag for remote player rack
    const drawn = this.bag.draw(moveData.placements.length);
    this.aiRack.push(...drawn);
    this.assertConservation();

    if (this.bag.count() === 0 && this.aiRack.length === 0) {
      this._endGame('ai_emptied_rack');
      return true;
    }

    // Hand turn to local player
    this.state.turn = 'human';
    return true;
  }

  applyRemotePass(fromPlayerName = 'Opponent') {
    this.state.consecutivePasses++;
    this.state.moves++;
    this.moveHistory.unshift({
      player: fromPlayerName,
      action: 'pass',
      score: 0,
      timestamp: Date.now()
    });

    if (this.state.consecutivePasses >= this.config.consecutivePassEndCount) {
      this._endGame('consecutive_passes');
      return true;
    }

    this.state.turn = 'human';
    return true;
  }

  applyRemoteExchange(count, fromPlayerName = 'Opponent') {
    this.state.consecutivePasses = 0;
    this.state.moves++;
    this.moveHistory.unshift({
      player: fromPlayerName,
      action: 'exchange',
      count,
      score: 0,
      timestamp: Date.now()
    });

    this.state.turn = 'human';
    return true;
  }

  passTurn() {
    if (this.state.turn !== 'human' || this.state.gameOver) return false;

    this.recallAll();
    this.state.consecutivePasses++;
    this.state.moves++;

    this.moveHistory.unshift({
      player: 'Human',
      action: 'pass',
      score: 0,
      timestamp: Date.now()
    });

    if (this.state.consecutivePasses >= this.config.consecutivePassEndCount) {
      this._endGame('consecutive_passes');
      return true;
    }

    this.state.turn = 'ai';
    return true;
  }

  exchangeTiles(rackIndices) {
    if (this.state.turn !== 'human' || this.state.gameOver) return false;
    if (this.bag.count() < this.config.exchangeMinimumBag) {
      return { success: false, error: `Bag must contain at least ${this.config.exchangeMinimumBag} tiles to exchange.` };
    }

    this.recallAll();

    // Sort descending so splicing by index works cleanly
    const sortedIndices = [...new Set(rackIndices)].sort((a, b) => b - a);
    const tilesToExchange = [];
    for (const idx of sortedIndices) {
      if (idx >= 0 && idx < this.humanRack.length) {
        tilesToExchange.push(this.humanRack.splice(idx, 1)[0]);
      }
    }

    if (tilesToExchange.length === 0) {
      return { success: false, error: 'No valid tiles selected for exchange.' };
    }

    const newTiles = this.bag.exchange(tilesToExchange);
    this.humanRack.push(...newTiles);
    this.assertConservation();

    this.state.consecutivePasses = 0;
    this.state.moves++;

    this.moveHistory.unshift({
      player: 'Human',
      action: 'exchange',
      count: tilesToExchange.length,
      score: 0,
      timestamp: Date.now()
    });

    this.state.turn = 'ai';
    return { success: true, exchangedCount: tilesToExchange.length };
  }

  // --------------------------------------------------------------------------
  // AI OPPONENT TURN RESOLUTION
  // --------------------------------------------------------------------------

  async executeAITurn() {
    if (this.state.turn !== 'ai' || this.state.gameOver) return null;

    const decision = await this.aiPlayer.findBestMove(
      this.board,
      this.aiRack,
      this.dictionary,
      this.bag,
      this.cancelToken
    );

    if (this.cancelToken.isCancelled) return null;

    if (!decision || decision.action === 'pass') {
      this.state.consecutivePasses++;
      this.moveHistory.unshift({
        player: 'Computer',
        action: 'pass',
        score: 0,
        timestamp: Date.now()
      });

      if (this.state.consecutivePasses >= this.config.consecutivePassEndCount) {
        this._endGame('consecutive_passes');
        return { action: 'pass', gameOver: true };
      }

      this.state.turn = 'human';
      return { action: 'pass', gameOver: false };
    }

    if (decision.action === 'exchange') {
      const tileIds = new Set(decision.exchangeTileIds);
      const tilesToExchange = [];
      this.aiRack = this.aiRack.filter(t => {
        if (tileIds.has(t.id)) {
          tilesToExchange.push(t);
          return false;
        }
        return true;
      });

      const newTiles = this.bag.exchange(tilesToExchange);
      this.aiRack.push(...newTiles);
      this.assertConservation();

      this.state.consecutivePasses = 0;
      this.moveHistory.unshift({
        player: 'Computer',
        action: 'exchange',
        count: tilesToExchange.length,
        score: 0,
        timestamp: Date.now()
      });

      this.state.turn = 'human';
      return { action: 'exchange', gameOver: false };
    }

    if (decision.action === 'play') {
      // Validate again for bulletproof invariant assurance
      const validation = BoardValidator.validateMove(this.board, decision.placements, this.dictionary);
      if (!validation.valid) {
        console.error('[AI Error] Generated illegal move:', validation.error);
        // Fallback to pass if illegal move produced
        this.state.consecutivePasses++;
        this.state.turn = 'human';
        return { action: 'pass', gameOver: false };
      }

      // Apply to board
      for (const p of decision.placements) {
        this.board.setTile(p.row, p.col, p.tile, true);
      }

      // Remove placed tiles from AI rack
      const usedIds = new Set(decision.placements.map(p => p.tile.id));
      this.aiRack = this.aiRack.filter(t => !usedIds.has(t.id));

      // Calculate score
      const scoreResult = BoardScorer.calculateScore(this.board, validation.words, decision.placements);
      this.state.aiScore += scoreResult.totalScore;
      this.state.consecutivePasses = 0;

      const wordsSummary = validation.words.map(w => w.text).join(', ');
      this.moveHistory.unshift({
        player: 'Computer',
        action: 'play',
        word: wordsSummary,
        score: scoreResult.totalScore,
        bingo: scoreResult.bingo,
        breakdown: scoreResult.breakdown,
        timestamp: Date.now()
      });

      // Refill AI rack
      const drawn = this.bag.draw(decision.placements.length);
      this.aiRack.push(...drawn);
      this.assertConservation();

      // Check game end condition: bag empty & AI rack empty
      if (this.bag.count() === 0 && this.aiRack.length === 0) {
        this._endGame('ai_emptied_rack');
        return { action: 'play', score: scoreResult.totalScore, words: wordsSummary, gameOver: true };
      }

      this.state.turn = 'human';
      return { action: 'play', score: scoreResult.totalScore, words: wordsSummary, gameOver: false };
    }

    this.state.turn = 'human';
    return null;
  }

  // --------------------------------------------------------------------------
  // GAME END & SCORING ADJUSTMENTS
  // --------------------------------------------------------------------------

  _endGame(reason) {
    this.state.gameOver = true;
    this.state.gameEndReason = reason;

    const humanUnplayed = this.humanRack.reduce((sum, t) => sum + t.getEffectiveScore(), 0);
    const aiUnplayed = this.aiRack.reduce((sum, t) => sum + t.getEffectiveScore(), 0);

    let humanAdjustment = 0;
    let aiAdjustment = 0;

    if (reason === 'human_emptied_rack') {
      // Human gets sum of AI's unplayed tiles; AI loses their unplayed tiles
      humanAdjustment = aiUnplayed;
      aiAdjustment = -aiUnplayed;
    } else if (reason === 'ai_emptied_rack') {
      // AI gets sum of Human's unplayed tiles; Human loses their unplayed tiles
      aiAdjustment = humanUnplayed;
      humanAdjustment = -humanUnplayed;
    } else {
      // Consecutive passes: both players lose unplayed tile points
      humanAdjustment = -humanUnplayed;
      aiAdjustment = -aiUnplayed;
    }

    const finalHumanScore = Math.max(0, this.state.humanScore + humanAdjustment);
    const finalAIScore = Math.max(0, this.state.aiScore + aiAdjustment);

    this.state.finalScoreAdjustments = {
      humanUnplayed,
      aiUnplayed,
      humanAdjustment,
      aiAdjustment,
      finalHumanScore,
      finalAIScore
    };

    this.state.humanScore = finalHumanScore;
    this.state.aiScore = finalAIScore;
    this.state.score = finalHumanScore;

    if (finalHumanScore > finalAIScore) {
      this.state.winner = 'Human';
      this.state.won = true;
    } else if (finalAIScore > finalHumanScore) {
      this.state.winner = 'Computer';
      this.state.won = false;
    } else {
      this.state.winner = 'Tie';
      this.state.won = false;
    }
  }

  // --------------------------------------------------------------------------
  // SERIALIZATION & INVARIANTS
  // --------------------------------------------------------------------------

  serialize() {
    return {
      version: this.config.version,
      seed: this.seed,
      dealCode: this.dealCode,
      state: { ...this.state },
      board: this.board.serialize(),
      bag: this.bag.serialize(),
      humanRack: this.humanRack.map(t => ({
        id: t.id, letter: t.letter, score: t.score, isBlank: t.isBlank, designatedLetter: t.designatedLetter
      })),
      aiRack: this.aiRack.map(t => ({
        id: t.id, letter: t.letter, score: t.score, isBlank: t.isBlank, designatedLetter: t.designatedLetter
      })),
      temporaryPlacements: this.temporaryPlacements.map(p => ({
        row: p.row, col: p.col,
        originRackIndex: p.originRackIndex,
        tile: { id: p.tile.id, letter: p.tile.letter, score: p.tile.score, isBlank: p.tile.isBlank, designatedLetter: p.tile.designatedLetter }
      })),
      moveHistory: [...this.moveHistory]
    };
  }

  deserialize(data) {
    if (!data || !data.state) return false;

    this.seed = data.seed || this.seed;
    this.dealCode = data.dealCode || this.dealCode;
    this.state = { ...data.state };

    if (data.board) this.board.deserialize(data.board);
    if (data.bag) this.bag.deserialize(data.bag);

    const deserializeTile = t => {
      const tile = new Tile(t.id, t.letter, t.score, t.isBlank);
      tile.designatedLetter = t.designatedLetter;
      return tile;
    };

    if (Array.isArray(data.humanRack)) {
      this.humanRack = data.humanRack.map(deserializeTile);
    }
    if (Array.isArray(data.aiRack)) {
      this.aiRack = data.aiRack.map(deserializeTile);
    }
    if (Array.isArray(data.temporaryPlacements)) {
      this.temporaryPlacements = data.temporaryPlacements.map(p => ({
        row: p.row, col: p.col,
        originRackIndex: p.originRackIndex,
        tile: deserializeTile(p.tile)
      }));
    }
    if (Array.isArray(data.moveHistory)) {
      this.moveHistory = [...data.moveHistory];
    }

    this.assertConservation();
    return true;
  }

  assertConservation() {
    return TileBag.verifyConservation(
      this.bag,
      this.humanRack,
      this.aiRack,
      this.board,
      this.temporaryPlacements
    );
  }

  /**
   * Tactical hint engine for Pedagogical Coach & In-Game Hint button
   */
  getTacticalHint() {
    if (this.state.gameOver) {
      return { message: "The game has concluded. Start a new match to continue playing!" };
    }

    if (this.state.turn !== 'human') {
      return { message: "Opponent is currently evaluating their move. Please stand by." };
    }

    // 1. If user already placed tiles on board, validate and guide
    if (this.temporaryPlacements.length > 0) {
      const val = this.getTentativeValidation();
      if (val.valid) {
        const wordsStr = val.words.map(w => w.text).join(' & ');
        const bonusStr = val.bingo ? ' (Includes +50 Bingo Bonus!)' : '';
        return {
          message: `Great formation! "${wordsStr}" is valid for +${val.score} pts${bonusStr}. Click Commit or press Enter!`,
          action: 'COMMIT'
        };
      } else {
        return {
          message: `Placement error: ${val.error || 'Invalid configuration'}. Adjust tiles or press Recall (R).`,
          action: 'ADJUST'
        };
      }
    }

    // 2. Rack composition analysis
    const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
    let vowelCount = 0;
    let consonantCount = 0;
    for (const t of this.humanRack) {
      if (vowels.has(t.letter.toUpperCase())) vowelCount++;
      else if (t.letter !== '_') consonantCount++;
    }

    // 3. Find highest-scoring tactical play using AI search
    try {
      const bestMove = this.aiPlayer.findBestMove(this.board, this.humanRack, this.dictionary);
      if (bestMove && bestMove.word) {
        const dirStr = bestMove.direction === 'horizontal' ? 'across' : 'down';
        return {
          message: `Tactical Play: Form "${bestMove.word}" ${dirStr} at (${bestMove.startRow + 1}, ${bestMove.startCol + 1}) for +${bestMove.score} pts!`,
          action: 'PLAY_SUGGESTION',
          word: bestMove.word,
          score: bestMove.score
        };
      }
    } catch (e) {}

    // 4. Strategic heuristic advice
    if (this.board.isEmpty()) {
      return {
        message: "Opening Move: Play your highest-value word across or down covering the Center Star (★).",
        action: 'CENTER_PLAY'
      };
    }

    if (vowelCount >= 5) {
      return {
        message: `Rack Warning: ${vowelCount} vowels detected. Play a vowel-heavy word or use Exchange (X) to balance your rack.`,
        action: 'EXCHANGE'
      };
    }

    if (consonantCount >= 6) {
      return {
        message: `Rack Warning: Too many consonants. Target 2-letter crosswords or use Exchange (X) with the bag.`,
        action: 'EXCHANGE'
      };
    }

    return {
      message: "Target high-scoring multiplier squares (3W, 2W, 3L) and look for parallel 2-letter crosswords to amplify points.",
      action: 'GENERAL'
    };
  }
}
