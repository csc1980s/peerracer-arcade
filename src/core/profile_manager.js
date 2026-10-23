/**
 * Solitaire Sovereign - Multi-User Profile, High Score & Persistence Engine
 * 
 * Features:
 * - Multi-user profile management (switch players, avatars, names).
 * - All-time cumulative score and per-game high scores.
 * - Hall of Fame / Leaderboard ranking for competitive player comparison.
 * - Atomic game state serialization (Save & Resume system).
 */

export class ProfileManager {
  static STORAGE_KEY = 'solitaire_sovereign_profiles_v1';
  static ACTIVE_USER_KEY = 'solitaire_sovereign_active_user_v1';
  static SAVED_GAMES_KEY = 'solitaire_sovereign_saves_v1';

  static DEFAULT_AVATARS = ['👑', '♠', '♥', '♦', '♣', '🦁', '🦅', '🐺', '🐉', '⭐'];

  constructor() {
    this.profiles = this._loadProfiles();
    this.activeUserId = localStorage.getItem(ProfileManager.ACTIVE_USER_KEY);

    if (!this.activeUserId || !this.profiles[this.activeUserId]) {
      // Ensure at least one default profile exists
      if (Object.keys(this.profiles).length === 0) {
        const defaultUser = this.createProfile('Player 1', '👑');
        this.activeUserId = defaultUser.id;
      } else {
        this.activeUserId = Object.keys(this.profiles)[0];
      }
      this._saveActiveUserId();
    }
  }

  _loadProfiles() {
    try {
      const raw = localStorage.getItem(ProfileManager.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[ProfileManager] Failed to load profiles:', e);
      return {};
    }
  }

  _saveProfiles() {
    try {
      localStorage.setItem(ProfileManager.STORAGE_KEY, JSON.stringify(this.profiles));
    } catch (e) {
      console.error('[ProfileManager] Failed to save profiles:', e);
    }
  }

  _saveActiveUserId() {
    if (this.activeUserId) {
      localStorage.setItem(ProfileManager.ACTIVE_USER_KEY, this.activeUserId);
    }
  }

  getAllProfiles() {
    return Object.values(this.profiles);
  }

  getActiveProfile() {
    return this.profiles[this.activeUserId] || null;
  }

  setActiveProfile(id) {
    if (this.profiles[id]) {
      this.activeUserId = id;
      this._saveActiveUserId();
      return this.profiles[id];
    }
    return null;
  }

  createProfile(name, avatar = '👑') {
    const cleanName = (name || '').trim().slice(0, 18) || `Player ${Object.keys(this.profiles).length + 1}`;
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    const newProfile = {
      id,
      name: cleanName,
      avatar: avatar || '👑',
      createdAt: Date.now(),
      allTimeScore: 0,
      totalGamesPlayed: 0,
      totalGamesWon: 0,
      casinoBankroll: 1000,
      blackjackBankroll: 1000,
      gameStats: {
        klondike_1: { played: 0, won: 0, highScore: 0, bestTime: 9999, fewestMoves: 9999 },
        klondike_3: { played: 0, won: 0, highScore: 0, bestTime: 9999, fewestMoves: 9999 },
        freecell: { played: 0, won: 0, highScore: 0, bestTime: 9999, fewestMoves: 9999 },
        spider_1: { played: 0, won: 0, highScore: 0, bestTime: 9999, fewestMoves: 9999 },
        spider_2: { played: 0, won: 0, highScore: 0, bestTime: 9999, fewestMoves: 9999 },
        spider_4: { played: 0, won: 0, highScore: 0, bestTime: 9999, fewestMoves: 9999 },
        blackjack: { played: 0, won: 0, highScore: 0, netEarnings: 0 },
        word_tiles: { played: 0, won: 0, highScore: 0, bestScore: 0 }
      }
    };

    this.profiles[id] = newProfile;
    this.activeUserId = id;
    this._saveProfiles();
    this._saveActiveUserId();
    return newProfile;
  }

  deleteProfile(id) {
    if (Object.keys(this.profiles).length <= 1) {
      return false; // Prevent deleting the sole remaining profile
    }
    delete this.profiles[id];
    if (this.activeUserId === id) {
      this.activeUserId = Object.keys(this.profiles)[0];
      this._saveActiveUserId();
    }
    this._saveProfiles();
    return true;
  }

  /**
   * Records a finished game's score and statistics under the active profile
   */
  recordGameResult(gameType, score, won, timeSeconds = 0, moves = 0, trackHighScore = false) {
    // trackHighScore: endless score-attack games (trash_conveyor) keep a best score even without a win.
    const user = this.getActiveProfile();
    if (!user) return;

    user.totalGamesPlayed += 1;
    if (won) user.totalGamesWon += 1;
    user.allTimeScore += Math.max(0, score);

    if (!user.gameStats[gameType]) {
      user.gameStats[gameType] = { played: 0, won: 0, highScore: 0, bestTime: 9999, fewestMoves: 9999 };
    }

    const st = user.gameStats[gameType];
    st.played += 1;
    if (!won && trackHighScore && score > st.highScore) st.highScore = score;
    if (won) {
      st.won += 1;
      if (score > st.highScore) st.highScore = score;
      if (timeSeconds > 0 && timeSeconds < st.bestTime) st.bestTime = timeSeconds;
      if (moves > 0 && moves < st.fewestMoves) st.fewestMoves = moves;
    }

    this._saveProfiles();
  }

  /**
   * Returns leaderboard ranking of all users
   * @param {string} mode 'all_time' | 'klondike_1' | 'freecell' | 'spider' | 'blackjack'
   */
  getLeaderboard(mode = 'all_time') {
    const list = Object.values(this.profiles);

    if (mode === 'all_time') {
      return list.sort((a, b) => b.allTimeScore - a.allTimeScore);
    }

    return list.sort((a, b) => {
      const scoreA = a.gameStats[mode]?.highScore || 0;
      const scoreB = b.gameStats[mode]?.highScore || 0;
      return scoreB - scoreA;
    });
  }

  // -------------------------------------------------------------
  // ATOMIC GAME STATE SAVE & RESUME SYSTEM
  // -------------------------------------------------------------

  /**
   * Save active game state for user & mode
   */
  saveGame(gameType, stateSnapshot) {
    if (!this.activeUserId) return false;
    try {
      const key = `${ProfileManager.SAVED_GAMES_KEY}_${this.activeUserId}_${gameType}`;
      const payload = {
        timestamp: Date.now(),
        userId: this.activeUserId,
        userName: this.getActiveProfile()?.name || 'Player',
        gameType,
        state: stateSnapshot
      };
      localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[ProfileManager] Save game failed:', e);
      return false;
    }
  }

  /**
   * Load saved game state for current user & mode
   */
  loadSavedGame(gameType) {
    if (!this.activeUserId) return null;
    try {
      const key = `${ProfileManager.SAVED_GAMES_KEY}_${this.activeUserId}_${gameType}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[ProfileManager] Load game failed:', e);
      return null;
    }
  }

  hasSavedGame(gameType) {
    if (!this.activeUserId) return false;
    const key = `${ProfileManager.SAVED_GAMES_KEY}_${this.activeUserId}_${gameType}`;
    return localStorage.getItem(key) !== null;
  }

  clearSavedGame(gameType) {
    if (!this.activeUserId) return;
    const key = `${ProfileManager.SAVED_GAMES_KEY}_${this.activeUserId}_${gameType}`;
    localStorage.removeItem(key);
  }

  // --------------------------------------------------------------------------
  // CROSS-GAME CASINO BANKROLL & REWARD SYSTEM
  // --------------------------------------------------------------------------

  getCasinoBankroll() {
    const user = this.getActiveProfile();
    if (!user) {
      const saved = localStorage.getItem('casino_bankroll') || localStorage.getItem('blackjack_bankroll');
      return saved ? parseInt(saved, 10) : 1000;
    }
    if (user.casinoBankroll === undefined) {
      const saved = localStorage.getItem('casino_bankroll') || localStorage.getItem('blackjack_bankroll');
      user.casinoBankroll = saved ? parseInt(saved, 10) : (user.blackjackBankroll || 1000);
      user.blackjackBankroll = user.casinoBankroll;
      this._saveProfiles();
    }
    return user.casinoBankroll;
  }

  setCasinoBankroll(amount) {
    const user = this.getActiveProfile();
    const val = Math.max(0, Math.floor(amount));
    if (user) {
      user.casinoBankroll = val;
      user.blackjackBankroll = val;
      this._saveProfiles();
    }
    localStorage.setItem('casino_bankroll', val.toString());
    localStorage.setItem('blackjack_bankroll', val.toString());
    return val;
  }

  addCasinoBankroll(amount) {
    const prev = this.getCasinoBankroll();
    const updated = this.setCasinoBankroll(prev + amount);
    return { previous: prev, current: updated, delta: amount };
  }
}
