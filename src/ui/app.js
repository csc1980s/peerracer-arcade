/**
 * Solitaire Sovereign - Main Application Controller & UI Coordinator
 * 
 * Orchestrates:
 * - Rules engines: Klondike, FreeCell, Spider, and Casino Blackjack (21).
 * - Multi-user profiles, all-time scoring, and competitive Hall of Fame.
 * - Atomic Game Save & Resume state persistence.
 * - User gameplay music player streaming from "game play music" folder.
 * - Dynamic SVG vector card face and card back rendering.
 * - Tactical Hint system with dual-element highlighting and toast banner.
 * - Drag-and-drop, smart click-to-move, and celebratory victory physics.
 */

import { KlondikeGame } from '../games/klondike.js?v=20261016_rev22';
import { FreeCellGame } from '../games/freecell.js?v=20261022_hintfix';
import { SpiderGame } from '../games/spider.js?v=20261022_hintfix';
import { BlackjackGame, HAND_STATUS } from '../games/blackjack.js?v=20261022_hintfix';
import { PyramidGame } from '../games/pyramid.js?v=20261016_rev22';
import { TriPeaksGame } from '../games/tripeaks.js?v=20261022_hintfix';
import { PokerGame, POKER_VARIATIONS, PAYTABLES } from '../games/poker.js?v=20261022_hintfix';
import { HoldemGame, HOLDEM_STAGES } from '../games/holdem.js?v=20261016_rev22';
import {
  PokerCardComponent,
  PlayerHandComponent,
  CommunityCardsComponent,
  OpponentSeatComponent
} from './components/poker_card_display.js?v=20261016_rev22';
import { P2PDuelManager } from '../core/p2p_duel.js?v=20261102_seedfix';
import { DeckRenderer, CARD_BACK_THEMES } from '../art/deck_renderer.js?v=20261016_rev22';
import { ProceduralSoundEngine } from '../audio/sound_synth.js?v=20261016_rev22';
import { GameplayMusicPlayer } from '../audio/music_player.js?v=20261016_rev22';
import { ProfileManager } from '../core/profile_manager.js?v=20261016_rev22';
import { VictoryCascade } from './victory_cascade.js?v=20261016_rev22';
import { HeuristicSolver } from '../core/solver.js?v=20261102_seedfix';
import { SplitMix64 } from '../core/prng.js?v=20261102_seedfix';
import { Card } from '../core/card.js?v=20261016_rev22';
import { PedagogicalCoach } from './pedagogical_coach.js?v=20261016_rev22';
import { ModManager } from '../core/mod_manager.js?v=20261016_rev22';
import { WordTilesGame } from '../games/word_tiles.js?v=20261016_rev22';
import { WordTilesView } from './word_tiles_view.js?v=20261016_rev22';
import { WordDictionary } from '../core/word_tiles/dictionary.js?v=20261016_rev22';
import { WordTileThemeManager, WORD_TILE_THEMES } from '../core/word_tiles/themes.js?v=20261017_rev1';
import { TankMinefieldGame } from '../games/tank_minefield.js?v=20261016_rev22';
import { TankMinefieldView } from './tank_minefield_view.js?v=20261016_rev22';
import { AdmiralsGambitGame } from '../games/admirals_gambit.js?v=20261019_v5';
import { AdmiralsGambitView } from './admirals_gambit_view.js?v=20261019_v5';
// Jade Pavilion (Mahjong tile matching)
import { MahjongGame } from '../games/mahjong.js?v=20261022_v1';
import { MahjongView, getSavedMahjongLayout } from './mahjong_view.js?v=20261022_v1';
// Ninefold (Sudoku)
import { SudokuGame } from '../games/sudoku.js?v=20261022_v1';
import { SudokuView, getSudokuNewGameOptions } from './sudoku_view.js?v=20261022_v1';
// Keystone Drop (falling blocks)
import { KeystoneDropGame } from '../games/keystone_drop.js?v=20261022_v2';
import { KeystoneDropView } from './keystone_drop_view.js?v=20261022_v2';
// Bone Yard (Dominoes)
import { RacePanel } from './race_panel.js?v=20261023_name';
import { DominoGame } from '../games/dominoes.js?v=20261022_v1';
import { DominoView, getDominoNewGameOptions } from './dominoes_view.js?v=20261022_v1';
// Jimothy's Trash Conveyor Frenzy
import { TrashConveyorGame } from '../games/trash_conveyor.js?v=20261023_v1';
import { TrashConveyorView, getTrashConveyorNewGameOptions } from './trash_conveyor_view.js?v=20261023_v1';
import { GameEventDetector } from '../triggers/GameEventDetector.js';
import { EventMapper } from '../triggers/EventMapper.js';
import { EffectPlayer } from '../effects/EffectPlayer.js';
import { AudioManager } from '../effects/AudioManager.js';

// Some browser features (autofill, extensions) send keyboard events with no key. Every shortcut handler
// reads e.key, so such events are dropped before they reach them.
for (const type of ['keydown', 'keyup']) {
  window.addEventListener(type, (e) => { if (typeof e.key !== 'string') e.stopImmediatePropagation(); }, true);
}

export class SolitaireApp {


  constructor() {
    this.sound = new ProceduralSoundEngine();
    this.music = new GameplayMusicPlayer();
    this.profiles = new ProfileManager();
    this.coach = new PedagogicalCoach(this);
    this.modManager = new ModManager(this);
    DeckRenderer.setModManager(this.modManager);

    // Apply active Word Tiles Theme
    WordTileThemeManager.applyTheme(WordTileThemeManager.getActiveThemeId());

    this.currentGame = null;
    this.gameType = localStorage.getItem('solitaire_last_mode') || 'klondike_1';
    this.cardBackTheme = localStorage.getItem('solitaire_card_back') || CARD_BACK_THEMES.ROYAL_GUILLOCHE;
    this.tableTheme = localStorage.getItem('solitaire_table_theme') || 'emerald';

    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.draggedCardData = null;
    this.cachedFaceImages = new Map();
    this.activeHintTimeouts = [];
    this.hasCelebratedWin = false;
    this.lastNonCasinoScore = 0;

    // DOM Elements
    this.tableEl = document.getElementById('card-table');
    this.solitaireView = document.getElementById('solitaire-view');
    this.blackjackView = document.getElementById('blackjack-view');
    this.pyramidView = document.getElementById('pyramid-view');
    this.tripeaksView = document.getElementById('tripeaks-view');
    this.pokerView = document.getElementById('poker-view');
    this.holdemView = document.getElementById('holdem-view');
    this.wordTilesViewEl = document.getElementById('word-tiles-view');
    this.tankMinefieldViewEl = document.getElementById('tank-minefield-view');
    this.admiralsGambitViewEl = document.getElementById('admirals-gambit-view');
    this.mahjongViewEl = document.getElementById('mahjong-view');
    this.sudokuViewEl = document.getElementById('sudoku-view');
    this.keystoneDropViewEl = document.getElementById('keystone-drop-view');
    this.dominoesViewEl = document.getElementById('dominoes-view');
    this.trashConveyorViewEl = document.getElementById('trash-conveyor-view');
    this.p2pGhostHud = document.getElementById('p2p-ghost-hud');


    this.stockEl = document.getElementById('stock-pile');
    this.wasteEl = document.getElementById('waste-pile');
    this.foundationsEl = document.getElementById('foundations-container');
    this.tableauEl = document.getElementById('tableau-container');
    this.freecellsEl = document.getElementById('freecells-container');
    this.autoCompleteBtn = document.getElementById('btn-auto-complete');
    this.autoSolveBanner = document.getElementById('auto-solve-banner');
    this.floatingAutoSolveBtn = document.getElementById('floating-auto-solve-btn');
    this.btnInstantSolve = document.getElementById('btn-instant-solve');
    this.btnPauseSolve = document.getElementById('btn-pause-solve');
    this.isAutoCompleting = false;
    this.autoSolveUserPaused = false;
    this.autoCompleteInterval = null;
    this.autoSolveDebounceTimer = null;
    this.hintBanner = document.getElementById('hint-banner');
    this.hintText = document.getElementById('hint-text');
    this.resumeBtn = document.getElementById('btn-resume-game');
    this.celebrationMode = localStorage.getItem('solitaire_celebration_mode') || 'grand_royale';

    // P2P 5-Player Time Challenge Arena Manager
    this.p2pRaceStopwatchTimer = null;
    this.p2pRaceStartTime = null;
    this.p2pDuel = new P2PDuelManager({
      playerName: this.profiles.getActiveProfile()?.name || 'Player 1',
      onOpponentUpdate: (op) => {
        const nameEl = document.getElementById('ghost-opponent-name');
        const scoreEl = document.getElementById('ghost-opponent-score');
        const cardsEl = document.getElementById('ghost-opponent-cards');
        const streakEl = document.getElementById('ghost-opponent-streak');
        if (nameEl) nameEl.textContent = `Opponent: ${op.name}`;
        if (scoreEl) scoreEl.textContent = op.score;
        if (cardsEl) cardsEl.textContent = op.cardsLeft;
        if (streakEl) streakEl.textContent = `x${op.streak || 0}`;
      },
      onPlayersUpdate: (players) => this._renderP2PRacers(players),
      onChallengeFinished: (results) => this._handleP2PChallengeFinished(results),
      onAvailableChallengesChange: (challenges) => this._renderAvailableChallenges(challenges),
      onHostInvite: (challenge) => this._showP2PInviteToast(challenge),
      onRaceStart: (duel) => this._handleP2PRaceStarted(duel)
    });


    const canvas = document.getElementById('victory-canvas');
    this.victoryCascade = new VictoryCascade(canvas, this.sound);
    this.victoryCascade.onCelebrationEnd = () => {
      this.hideHint();
      document.getElementById('win-modal')?.classList.remove('active');
    };

    // In-Game Multi-Voice Celebration System (Victorian Christmas Encouragement & Face Card FX)
    const celebEnabled = localStorage.getItem('solitaire_celebration_enabled') !== 'false';
    const celebParticles = localStorage.getItem('solitaire_celebration_particles') !== 'false';
    const celebIntensity = localStorage.getItem('solitaire_celebration_intensity') || 'medium';
    const voiceEnabled = localStorage.getItem('solitaire_celebration_voice_enabled') !== 'false';
    const voiceVol = localStorage.getItem('solitaire_celebration_volume') ? parseInt(localStorage.getItem('solitaire_celebration_volume'), 10) / 100 : 0.85;
    const voiceKing = localStorage.getItem('solitaire_voice_king') !== 'false';
    const voiceQueen = localStorage.getItem('solitaire_voice_queen') !== 'false';
    const voiceJack = localStorage.getItem('solitaire_voice_jack') !== 'false';

    this.celebrationDetector = new GameEventDetector();
    this.celebrationMapper = new EventMapper();
    this.celebrationEffects = new EffectPlayer({
      celebrationsEnabled: celebEnabled,
      particlesEnabled: celebParticles,
      intensity: celebIntensity,
      maxConcurrentEffects: 3
    });
    this.celebrationAudio = new AudioManager({
      masterVolume: voiceVol,
      audioEnabled: voiceEnabled,
      enabledVoices: {
        king: voiceKing,
        queen: voiceQueen,
        jack: voiceJack
      },
      maxSimultaneous: 1
    });
    this.celebrationMapper.loadEffectTemplates().catch(() => {});
    this.celebrationAudio.loadAllManifests().catch(() => {});

    this._bindEvents();
    this._bindMusicEvents();
    this.applyTableTheme(this.tableTheme);
    this.modManager.loadAvailableMods().then(() => {
      this.modManager.applyActiveBackground();
      this.modManager.applyActiveChips();
      this._syncDeckSelectorDropdown();
    });
    this._updateProfileBar();
    this._initP2PArena();

    // Word Tiles Engine & Lexicon Initialization
    this.wordDictionary = new WordDictionary();
    this.wordDictionary.loadCoreSeedLexicon();
    this.wordDictionary.addListener(() => {
      if (this.gameType === 'word_tiles') {
        this.wordTilesView?.render();
      }
    });

    if (typeof fetch === 'function') {
      const loadLexicon = (url) => fetch(url).then(res => res.ok ? res.text() : '');
      loadLexicon('assets/dictionary/enable1.txt')
        .then(txt => txt || loadLexicon('/assets/dictionary/enable1.txt'))
        .then(txt => {
          if (txt) {
            this.wordDictionary.loadFromText(txt);
          }
        })
        .catch(() => {});
    }
    if (this.wordTilesViewEl) {
      this.wordTilesView = new WordTilesView(this, this.wordTilesViewEl);
    }
    if (this.tankMinefieldViewEl) {
      this.tankMinefieldView = new TankMinefieldView(this, this.tankMinefieldViewEl);
    }
    if (this.admiralsGambitViewEl) {
      this.admiralsGambitView = new AdmiralsGambitView(this, this.admiralsGambitViewEl);
    }
    if (this.mahjongViewEl) {
      this.mahjongView = new MahjongView(this, this.mahjongViewEl);
    }
    if (this.sudokuViewEl) {
      this.sudokuView = new SudokuView(this, this.sudokuViewEl);
    }
    if (this.keystoneDropViewEl) {
      this.keystoneDropView = new KeystoneDropView(this, this.keystoneDropViewEl);
    }
    if (this.dominoesViewEl) {
      this.dominoesView = new DominoView(this, this.dominoesViewEl);
    }
    if (this.trashConveyorViewEl) {
      this.trashConveyorView = new TrashConveyorView(this, this.trashConveyorViewEl);
    }
    this.raceOverrides = null;
    this.racePanel = new RacePanel(this);

    // Restore saved card display scale if configured
    const savedCardScale = localStorage.getItem('solitaire_card_scale');
    if (savedCardScale) {
      this.setCardScale(savedCardScale);
    }

    // Check for saved game or start fresh
    this.startNewGame();
    window.solitaireApp = this;
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.victoryCascade.resize());

    // Header buttons
    document.getElementById('btn-new-game')?.addEventListener('click', () => this.startNewGame());
    document.getElementById('btn-undo')?.addEventListener('click', () => this.undoMove());
    document.getElementById('btn-teacher')?.addEventListener('click', () => this.coach.openTeacherModal());
    document.getElementById('btn-hint')?.addEventListener('click', () => this.showHint());
    document.getElementById('btn-close-hint')?.addEventListener('click', () => this.hideHint());
    document.getElementById('btn-solvable')?.addEventListener('click', () => this.openSolvableModal());
    document.getElementById('btn-settings')?.addEventListener('click', () => this.openSettingsModal());
    document.getElementById('btn-card-sizes')?.addEventListener('click', () => this.openSettingsModal('mod-panel-guide'));
    document.getElementById('btn-deck-studio')?.addEventListener('click', () => this.openSettingsModal('mod-panel-faces'));
    document.getElementById('btn-save-game')?.addEventListener('click', () => this.saveCurrentGame());

    // In-game Card Deck Selector dropdown
    const deckSelect = document.getElementById('select-deck-collection');
    if (deckSelect) {
      deckSelect.value = this.modManager.activeDeckTheme || '';
      deckSelect.addEventListener('change', (e) => {
        const themeId = e.target.value || null;
        this.modManager.setDeckTheme(themeId);
      });
    }
    document.getElementById('btn-test-celebration')?.addEventListener('click', () => this.launchCelebrationShow());
    this.resumeBtn?.addEventListener('click', () => this.resumeSavedGame());

    // Celebration mode buttons in Win Modal
    document.getElementById('win-celebration-modes')?.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('win-celebration-modes').querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.celebrationMode = btn.dataset.mode;
        localStorage.setItem('solitaire_celebration_mode', this.celebrationMode);
        this.launchCelebrationShow(this.celebrationMode);
      });
    });

    // Profile & Leaderboard
    document.getElementById('btn-profile-pill')?.addEventListener('click', () => this.openLeaderboardModal());
    document.getElementById('btn-leaderboard')?.addEventListener('click', () => this.openLeaderboardModal());
    document.getElementById('btn-create-profile')?.addEventListener('click', () => this.createNewProfile());

    // Casino Vault Modal
    document.getElementById('btn-casino-vault')?.addEventListener('click', () => this.openCasinoVaultModal());
    document.getElementById('btn-close-vault-modal')?.addEventListener('click', () => {
      document.getElementById('casino-vault-modal')?.classList.remove('active');
    });
    document.getElementById('btn-vault-rebuy-quick')?.addEventListener('click', () => {
      this.profiles.setCasinoBankroll(1000);
      this._updateCasinoVaultDisplay();
      const balEl = document.getElementById('vault-modal-balance');
      if (balEl) balEl.textContent = '$1,000';
      this._triggerVaultGain(1000);
    });
    document.getElementById('btn-vault-play-solitaire')?.addEventListener('click', () => {
      document.getElementById('casino-vault-modal')?.classList.remove('active');
      const select = document.getElementById('select-game-mode');
      if (select) select.value = 'klondike_1';
      this.gameType = 'klondike_1';
      localStorage.setItem('solitaire_last_mode', 'klondike_1');
      this.startNewGame();
    });
    document.getElementById('btn-vault-play-casino')?.addEventListener('click', () => {
      document.getElementById('casino-vault-modal')?.classList.remove('active');
      const select = document.getElementById('select-game-mode');
      if (select) select.value = 'blackjack';
      this.gameType = 'blackjack';
      localStorage.setItem('solitaire_last_mode', 'blackjack');
      this.startNewGame();
    });

    // Video Poker Paytable Modal
    document.getElementById('btn-poker-view-paytable')?.addEventListener('click', () => this.openPokerPaytableModal());
    document.getElementById('btn-close-paytable-modal')?.addEventListener('click', () => {
      document.getElementById('poker-paytable-modal')?.classList.remove('active');
    });

    // Game Mode Dropdown
    const modeSelect = document.getElementById('select-game-mode');
    if (modeSelect) {
      modeSelect.value = this.gameType;
      modeSelect.addEventListener('change', (e) => {
        this.gameType = e.target.value;
        localStorage.setItem('solitaire_last_mode', this.gameType);
        this.startNewGame();
      });
    }

    // Sound toggle with localStorage persistence and Web Audio unlock
    const soundToggle = document.getElementById('btn-toggle-sound');
    const soundInitial = localStorage.getItem('solitaire_sound_enabled') !== 'false';
    this.sound.toggleSound(soundInitial);
    if (soundToggle) {
      soundToggle.classList.toggle('muted', !soundInitial);
      soundToggle.title = soundInitial ? 'Mute Audio' : 'Unmute Audio';
    }
    soundToggle?.addEventListener('click', () => {
      const state = this.sound.toggleSound();
      soundToggle.classList.toggle('muted', !state);
      soundToggle.title = state ? 'Mute Audio' : 'Unmute Audio';
      localStorage.setItem('solitaire_sound_enabled', state ? 'true' : 'false');
      if (state && this.sound.ctx && this.sound.ctx.state === 'suspended') {
        this.sound.ctx.resume().catch(() => {});
      }
    });

    // Global audio unlocker on user gesture
    const unlockAudio = () => {
      if (this.sound && this.sound.ctx && this.sound.ctx.state === 'suspended') {
        this.sound.ctx.resume().catch(() => {});
      }
      if (this.celebrationAudio && this.celebrationAudio.audioContext && this.celebrationAudio.audioContext.state === 'suspended') {
        this.celebrationAudio.audioContext.resume().catch(() => {});
      }
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    };
    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(evt => {
      document.addEventListener(evt, unlockAudio, { passive: true });
    });

    // Auto-solve controls (Microsoft Solitaire style)
    this.autoCompleteBtn?.addEventListener('click', () => this.runAutoComplete());
    this.floatingAutoSolveBtn?.addEventListener('click', () => this.runAutoComplete());
    this.btnInstantSolve?.addEventListener('click', () => this.instantSolveToFoundation());
    this.btnPauseSolve?.addEventListener('click', () => this.togglePauseAutoComplete());

    // Right-click anywhere on table to solve to foundation if completed (Microsoft Solitaire style)
    document.getElementById('solitaire-view')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.currentGame?.canAutoComplete && this.currentGame.canAutoComplete()) {
        this.runAutoComplete();
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {

      if (this.gameType === 'trash_conveyor' && this.trashConveyorView?.ownsKey(e)) return;

      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        if (this.coach) {
          this.coach.closeTeacherModal();
        }
        this.hideHint();
        return;
      }


      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undoMove();
      } else if (e.key === ' ' || e.key === 'Enter') {

        // Space / Enter deals next hand in Blackjack, Poker, or Hold'em
        if (this.gameType === 'blackjack' && this.currentGame) {
          if (this.currentGame.status === 'BETTING' || this.currentGame.status === 'RESOLVED') {
            e.preventDefault();
            this.hasCelebratedWin = false;
            this.victoryCascade.stop();
            this.hideHint();
            if (this.currentGame.dealRound()) {
              this.sound.playShuffle();
              this.render();
            }
          }
        } else if (['poker_jacks', 'poker_deuces', 'poker_joker'].includes(this.gameType) && this.currentGame) {
          e.preventDefault();
          this.handlePokerDealDraw();
        } else if (this.gameType === 'poker_holdem' && this.currentGame) {
          e.preventDefault();
          if (this.currentGame.stage === HOLDEM_STAGES.SHOWDOWN) {
            this.handleHoldemNextHand();
          } else {
            this.handleHoldemCheckCall();
          }
        }
      } else if (['1', '2', '3', '4', '5'].includes(e.key) && ['poker_jacks', 'poker_deuces', 'poker_joker'].includes(this.gameType) && this.currentGame) {
        const cardIdx = parseInt(e.key, 10) - 1;
        if (this.currentGame.state.phase === 'HOLDING') {
          this.currentGame.toggleHold(cardIdx);
          this.sound.playCardSnap();
          this.render();
        }
      } else if (e.key.toLowerCase() === 'f' && this.gameType === 'poker_holdem') {
        this.handleHoldemFold();
      } else if (e.key.toLowerCase() === 'c' && this.gameType === 'poker_holdem') {
        this.handleHoldemCheckCall();
      } else if (e.key.toLowerCase() === 'r' && this.gameType === 'poker_holdem') {
        this.handleHoldemRaise();
      } else if (e.key.toLowerCase() === 't') {
        this.coach.openTeacherModal();
      } else if (e.key.toLowerCase() === 'h') {
        if (this.gameType === 'blackjack' && this.currentGame && this.currentGame.status === 'PLAYING') {
          this.currentGame.hit();
          this.sound.playCardFlip();
          this.render();
        } else {
          this.showHint();
        }
      } else if (e.key.toLowerCase() === 's') {
        if (this.gameType === 'blackjack' && this.currentGame && this.currentGame.status === 'PLAYING') {
          this.currentGame.stand();
          this.sound.playCardSnap();
          this.render();
        }
      } else if (e.key.toLowerCase() === 'n') {
        if (this.gameType === 'blackjack') {
          this.hasCelebratedWin = false;
          this.victoryCascade.stop();
          this.hideHint();
          this.currentGame.newHand();
          this.render();
        } else if (this.gameType === 'poker_holdem') {
          this.handleHoldemNextHand();
        } else {
          this.startNewGame();
        }
      } else if (e.key.toLowerCase() === 'd') {
        if (this.gameType === 'blackjack') {
          this.hasCelebratedWin = false;
          this.victoryCascade.stop();
          this.hideHint();
          if (this.currentGame.dealRound()) {
            this.sound.playShuffle();
            this.render();
          }
        } else if (this.gameType === 'pyramid' && this.currentGame) {
          this.handlePyramidStockClick();
        } else if (this.gameType === 'tripeaks' && this.currentGame) {
          this.handleTriPeaksStockClick();
        } else {
          this.handleStockClick();
        }
      } else if (e.key.toLowerCase() === 'm') {
        // Toggle Settings & Customization Studio Menu
        const modal = document.getElementById('settings-modal');
        if (modal && modal.classList.contains('active')) {
          modal.classList.remove('active');
        } else {
          this.openSettingsModal();
        }
      }
    });

    // Win Modal Buttons
    document.getElementById('victory-canvas')?.addEventListener('click', () => {
      this.victoryCascade.stop();
      document.getElementById('win-modal')?.classList.remove('active');
    });

    document.getElementById('btn-win-play-again')?.addEventListener('click', () => {
      this.victoryCascade.stop();
      document.getElementById('win-modal')?.classList.remove('active');
      this.startNewGame();
    });

    // Blackjack Actions
    this._bindBlackjackControls();

    // Pyramid, TriPeaks, Poker, Hold'em, and P2P Duels Controls
    this._bindPyramidAndTriPeaksControls();
    this._bindPokerControls();
    this._bindHoldemControls();
    this._bindP2PControls();
  }


  _bindMusicEvents() {
    const playBtn = document.getElementById('btn-music-play');
    const prevBtn = document.getElementById('btn-music-prev');
    const nextBtn = document.getElementById('btn-music-next');
    const trackInfo = document.getElementById('btn-open-music-modal');
    const eqBars = document.getElementById('music-eq-anim');
    const trackTitle = document.getElementById('music-track-title');

    playBtn?.addEventListener('click', () => {
      this.music.togglePlay();
    });

    prevBtn?.addEventListener('click', () => this.music.prev());
    nextBtn?.addEventListener('click', () => this.music.next());
    trackInfo?.addEventListener('click', () => this.openMusicModal());

    document.getElementById('btn-close-music-modal')?.addEventListener('click', () => {
      document.getElementById('music-modal')?.classList.remove('active');
    });

    document.getElementById('btn-refresh-music')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-refresh-music');
      if (btn) {
        btn.textContent = '⏳ Scanning...';
        btn.disabled = true;
      }
      await this.music.fetchServerMusic();
      if (btn) {
        btn.textContent = '🔄 Scan Music Folder';
        btn.disabled = false;
      }
      const q = document.getElementById('input-search-music')?.value || '';
      this.openMusicModal(q);
    });

    // Real-time track search filter in music modal
    const musicSearchInput = document.getElementById('input-search-music');
    musicSearchInput?.addEventListener('input', (e) => {
      this.openMusicModal(e.target.value);
    });

    document.getElementById('btn-toggle-lofi-synth')?.addEventListener('click', () => {
      if (this.music.synthPlaying) this.music.stopSynth();
      else this.music.startSynth();
    });

    // Local file picker for music
    const filePicker = document.getElementById('music-file-picker');
    filePicker?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.music.loadUserFiles(e.target.files);
      }
    });

    // Volume slider
    const volumeSlider = document.getElementById('slider-music-volume');
    const volumeLbl = document.getElementById('lbl-music-volume');
    volumeSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (volumeLbl) volumeLbl.textContent = `${val}%`;
      this.music.setVolume(val / 100);
    });

    // Update UI on music state change
    this.music.onStateChange = (state) => {
      if (playBtn) playBtn.textContent = state.isPlaying ? '⏸' : '▶';
      if (eqBars) eqBars.classList.toggle('playing', state.isPlaying);
      if (trackTitle) trackTitle.textContent = state.currentTrack;
    };
  }

  _bindBlackjackControls() {
    window.addEventListener('resize', () => this._fitBlackjackCards());
    // Chips Tray
    const chipsTray = document.getElementById('bj-chips-tray');
    chipsTray?.querySelectorAll('.casino-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (this.gameType !== 'blackjack') return;
        const val = parseInt(chip.dataset.val, 10);
        if (this.currentGame && this.currentGame.addChipBet(val)) {
          this.sound.playCardSnap();
          this.render();
        }
      });
    });

    // Deal button
    document.getElementById('btn-bj-deal')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.hasCelebratedWin = false;
        this.victoryCascade.stop();
        this.hideHint();
        if (this.currentGame.dealRound()) {
          this.sound.playShuffle();
          this.render();
        }
      }
    });

    // Clear bet button
    document.getElementById('btn-bj-clear-bet')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.currentGame.clearBet();
        this.render();
      }
    });

    // Hit, Stand, Double, Split
    document.getElementById('btn-bj-hit')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.currentGame.hit();
        this.sound.playCardFlip();
        this.render();
      }
    });

    document.getElementById('btn-bj-stand')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.currentGame.stand();
        this.sound.playCardSnap();
        this.render();
      }
    });

    document.getElementById('btn-bj-double')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.currentGame.doubleDown();
        this.sound.playCardSnap();
        this.render();
      }
    });

    document.getElementById('btn-bj-split')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.currentGame.split();
        this.sound.playCardFlip();
        this.render();
      }
    });

    // Next Hand button (when round is resolved)
    document.getElementById('btn-bj-next-hand')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.hasCelebratedWin = false;
        this.victoryCascade.stop();
        this.hideHint();
        this.currentGame.newHand();
        this.render();
      }
    });

    // Rebet & Deal button
    document.getElementById('btn-bj-rebet-deal')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.hasCelebratedWin = false;
        this.victoryCascade.stop();
        this.hideHint();
        if (this.currentGame.rebetAndDeal()) {
          this.sound.playShuffle();
        }
        this.render();
      }
    });

    // Rebuy $1,000 button
    document.getElementById('btn-bj-rebuy')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.hasCelebratedWin = false;
        this.victoryCascade.stop();
        this.hideHint();
        this.currentGame.rebuy(1000);
        this.sound.playCardSnap();
        this.render();
      }
    });

    // Toggle 3-Player Table or Solo Table button
    document.getElementById('btn-bj-toggle-seats')?.addEventListener('click', () => {
      if (this.gameType === 'blackjack' && this.currentGame) {
        this.currentGame.toggleTableMode();
        this.sound.playCardSnap();
        this.render();
      }
    });
  }

  /** Deal settings that every player in a PeerRacer race must share. */
  getRaceOptions(gameType) {
    if (gameType === 'mahjong') return { layoutId: getSavedMahjongLayout() };
    if (gameType === 'sudoku') return { difficulty: this.currentGame?.difficulty || getSudokuNewGameOptions().difficulty };
    if (gameType === 'dominoes') return { ...getDominoNewGameOptions() };
    if (gameType === 'trash_conveyor') return { ...getTrashConveyorNewGameOptions() };
    return {};
  }

  startNewGame(specificSeed = null) {
    this.hasCelebratedWin = false;
    this.victoryCascade.stop();
    document.getElementById('win-modal')?.classList.remove('active');
    this.hideHint();
    this._stopTimer();
    if (this.coach) {
      this.coach.cancelSpeech();
      this.coach.lastInteractionTime = Date.now();
      this.coach.hesitationState = 'active';
      this.coach._removeAmbientPulsing();
    }

    if (this.autoCompleteInterval) {
      clearInterval(this.autoCompleteInterval);
      this.autoCompleteInterval = null;
    }
    if (this.autoSolveDebounceTimer) {
      clearTimeout(this.autoSolveDebounceTimer);
      this.autoSolveDebounceTimer = null;
    }
    this.isAutoCompleting = false;
    this.autoSolveUserPaused = false;
    this.autoSolveBanner?.classList.add('hidden');
    this.floatingAutoSolveBtn?.classList.add('hidden');

    // Catalog seeds arrive as BigInt from parseDealCode; keep seeds as Numbers so saves can JSON them.
    const seed = specificSeed === null ? SplitMix64.newSeed()
      : (typeof specificSeed === 'bigint' ? Number(specificSeed) : specificSeed);
    // A PeerRacer race supplies the deal settings; a player starting a game on their own leaves any race.
    const raceDeal = this.raceOverrides;
    this.raceOverrides = null;
    if (!raceDeal) this.racePanel?.onManualNewGame();
    const raceOptions = raceDeal ? raceDeal.options : null;

    if (this.gameType === 'klondike_1') {
      this.currentGame = new KlondikeGame({ drawCount: 1, seed });
    } else if (this.gameType === 'klondike_3') {
      this.currentGame = new KlondikeGame({ drawCount: 3, seed });
    } else if (this.gameType === 'freecell') {
      this.currentGame = new FreeCellGame({ seed });
    } else if (this.gameType === 'spider_1') {
      this.currentGame = new SpiderGame({ numSuits: 1, seed });
    } else if (this.gameType === 'spider_2') {
      this.currentGame = new SpiderGame({ numSuits: 2, seed });
    } else if (this.gameType === 'spider_4') {
      this.currentGame = new SpiderGame({ numSuits: 4, seed });
    } else if (this.gameType === 'blackjack') {
      this.currentGame = new BlackjackGame({ seed });
      this.currentGame.bankroll = this.profiles.getCasinoBankroll();
    } else if (this.gameType === 'pyramid') {
      this.currentGame = new PyramidGame({ seed });
    } else if (this.gameType === 'tripeaks') {
      this.currentGame = new TriPeaksGame({ seed });
    } else if (this.gameType === 'poker_jacks') {
      this.currentGame = new PokerGame({ variation: POKER_VARIATIONS.JACKS_OR_BETTER, seed, credits: this.profiles.getCasinoBankroll() });
      this.currentGame.deal();
    } else if (this.gameType === 'poker_deuces') {
      this.currentGame = new PokerGame({ variation: POKER_VARIATIONS.DEUCES_WILD, seed, credits: this.profiles.getCasinoBankroll() });
      this.currentGame.deal();
    } else if (this.gameType === 'poker_joker') {
      this.currentGame = new PokerGame({ variation: POKER_VARIATIONS.JOKER_POKER, seed, credits: this.profiles.getCasinoBankroll() });
      this.currentGame.deal();
    } else if (this.gameType === 'poker_holdem') {
      this.currentGame = new HoldemGame({ seed, playerName: this.profiles.getActiveProfile()?.name || 'Player 1', chips: this.profiles.getCasinoBankroll() });
    } else if (this.gameType === 'word_tiles') {
      this.currentGame = new WordTilesGame({ seed, dictionary: this.wordDictionary });
      this.wordTilesView?.setGame(this.currentGame);
    } else if (this.gameType === 'tank_minefield') {
      const selectedPreset = localStorage.getItem('tm_selected_tank') || 'US';
      this.currentGame = new TankMinefieldGame({ seed, presetId: selectedPreset });
      this.tankMinefieldView?.setGame(this.currentGame);
    } else if (this.gameType === 'admirals_gambit') {
      this.currentGame = new AdmiralsGambitGame({ seed });
      this.admiralsGambitView?.setGame(this.currentGame);
    } else if (this.gameType === 'mahjong') {
      this.currentGame = new MahjongGame({ seed, layoutId: raceOptions ? raceOptions.layoutId : getSavedMahjongLayout() });
      this.mahjongView?.setGame(this.currentGame);
    } else if (this.gameType === 'sudoku') {
      this.currentGame = new SudokuGame({ seed, ...(raceOptions ? { difficulty: raceOptions.difficulty, daily: null } : getSudokuNewGameOptions()) });
      this.sudokuView?.setGame(this.currentGame);
    } else if (this.gameType === 'keystone_drop') {
      this.currentGame = new KeystoneDropGame({ seed });
      this.keystoneDropView?.setGame(this.currentGame);
    } else if (this.gameType === 'dominoes') {
      this.currentGame = new DominoGame({ seed, ...(raceOptions || getDominoNewGameOptions()) });
      this.dominoesView?.setGame(this.currentGame);
    } else if (this.gameType === 'trash_conveyor') {
      this.currentGame = new TrashConveyorGame({ seed, ...(raceOptions || getTrashConveyorNewGameOptions()) });
      this.trashConveyorView?.setGame(this.currentGame);
    }

    this.lastNonCasinoScore = 0;

    this.sound.playShuffle();
    this._startTimer();
    this.render();
    this._checkResumeAvailability();
  }

  _startTimer() {
    this.elapsedSeconds = 0;
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
      const min = String(Math.floor(this.elapsedSeconds / 60)).padStart(2, '0');
      const sec = String(this.elapsedSeconds % 60).padStart(2, '0');
      const el = document.getElementById('timer-display');
      if (el) el.textContent = `${min}:${sec}`;
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  render() {
    this.racePanel?.sync();
    const isBlackjack = this.gameType === 'blackjack';
    const isPyramid = this.gameType === 'pyramid';
    const isTriPeaks = this.gameType === 'tripeaks';
    const isVideoPoker = ['poker_jacks', 'poker_deuces', 'poker_joker'].includes(this.gameType);
    const isHoldem = this.gameType === 'poker_holdem';
    const isWordTiles = this.gameType === 'word_tiles';
    const isTankMinefield = this.gameType === 'tank_minefield';
    const isAdmiralsGambit = this.gameType === 'admirals_gambit';
    const isMahjong = this.gameType === 'mahjong';
    const isSudoku = this.gameType === 'sudoku';
    const isKeystoneDrop = this.gameType === 'keystone_drop';
    const isDominoes = this.gameType === 'dominoes';
    const isTrashConveyor = this.gameType === 'trash_conveyor';
    const isFreeCell = this.gameType === 'freecell';
    const isSpider = this.gameType.startsWith('spider');
    const isSolitaire = !isBlackjack && !isPyramid && !isTriPeaks && !isVideoPoker && !isHoldem && !isWordTiles && !isTankMinefield && !isAdmiralsGambit && !isMahjong && !isSudoku && !isKeystoneDrop && !isDominoes && !isTrashConveyor;

    // Sync body mode classes for CSS card dimensions
    document.body.classList.toggle('mode-freecell', isFreeCell);
    document.body.classList.toggle('mode-spider', isSpider);
    document.body.classList.toggle('mode-pyramid', isPyramid);
    document.body.classList.toggle('mode-tripeaks', isTriPeaks);

    // Toggle Views
    this.solitaireView.classList.toggle('hidden', !isSolitaire);
    this.blackjackView.classList.toggle('hidden', !isBlackjack);
    this.pyramidView?.classList.toggle('hidden', !isPyramid);
    this.tripeaksView?.classList.toggle('hidden', !isTriPeaks);
    this.pokerView?.classList.toggle('hidden', !isVideoPoker);
    this.holdemView?.classList.toggle('hidden', !isHoldem);
    this.wordTilesViewEl?.classList.toggle('hidden', !isWordTiles);
    this.tankMinefieldViewEl?.classList.toggle('hidden', !isTankMinefield);
    this.admiralsGambitViewEl?.classList.toggle('hidden', !isAdmiralsGambit);
    this.mahjongViewEl?.classList.toggle('hidden', !isMahjong);
    this.sudokuViewEl?.classList.toggle('hidden', !isSudoku);
    this.keystoneDropViewEl?.classList.toggle('hidden', !isKeystoneDrop);
    this.dominoesViewEl?.classList.toggle('hidden', !isDominoes);
    this.trashConveyorViewEl?.classList.toggle('hidden', !isTrashConveyor);
    document.getElementById('p2p-challenge-dock')?.classList.toggle('hidden', isWordTiles || isTankMinefield || isAdmiralsGambit || isMahjong || isSudoku || isKeystoneDrop || isDominoes || isTrashConveyor || !isSolitaire);
    // Cross-Game Casino Vault Bankroll update for non-casino games
    const isCasino = isBlackjack || isVideoPoker || isHoldem;
    if (!isCasino && this.currentGame && this.currentGame.state && typeof this.currentGame.state.score === 'number') {
      const curScore = Number(this.currentGame.state.score) || 0;
      if (this.lastNonCasinoScore !== undefined && curScore > this.lastNonCasinoScore) {
        const delta = curScore - this.lastNonCasinoScore;
        const chipsEarned = Math.max(1, Math.floor(delta / 4));
        this.profiles.addCasinoBankroll(chipsEarned);
        this._triggerVaultGain(chipsEarned);
      }
      this.lastNonCasinoScore = curScore;
    }
    this._updateCasinoVaultDisplay();

    if (isBlackjack) {
      this._renderBlackjackTable();
      return;
    }
    if (isPyramid) {
      this._renderPyramidTable();
      return;
    }
    if (isTriPeaks) {
      this._renderTriPeaksTable();
      return;
    }
    if (isVideoPoker) {
      this._renderPokerTable();
      return;
    }
    if (isHoldem) {
      this._renderHoldemTable();
      return;
    }
    if (isWordTiles) {
      this.wordTilesView?.render();
      document.getElementById('score-display').textContent = this.currentGame?.state?.humanScore || 0;
      document.getElementById('moves-display').textContent = this.currentGame?.state?.moves || 0;
      document.getElementById('deal-code-badge').textContent = this.currentGame?.dealCode || 'WT-0000';
      const activeProfile = this.profiles.getActiveProfile();
      const highScore = activeProfile?.gameStats?.word_tiles?.highScore || 0;
      document.getElementById('high-score-display').textContent = highScore;
      return;
    }
    if (isTankMinefield) {
      this.tankMinefieldView?.render();
      document.getElementById('score-display').textContent = this.currentGame?.state?.score || 0;
      document.getElementById('moves-display').textContent = this.currentGame?.state?.moves || 0;
      document.getElementById('deal-code-badge').textContent = this.currentGame?.dealCode || 'TM-0000';
      return;
    }
    if (isAdmiralsGambit) {
      this.admiralsGambitView?.render();
      document.getElementById('score-display').textContent = this.currentGame?.state?.score || 0;
      document.getElementById('moves-display').textContent = this.currentGame?.state?.turn || 0;
      document.getElementById('deal-code-badge').textContent = this.currentGame?.state?.seed?.toString().slice(-4).padStart(4, '0') ? 'AG-' + this.currentGame.state.seed.toString().slice(-4).padStart(4, '0') : 'AG-0000';
      return;
    }
    if (isMahjong) {
      this.mahjongView?.render();
      document.getElementById('score-display').textContent = this.currentGame?.state?.score || 0;
      document.getElementById('moves-display').textContent = this.currentGame?.state?.moves || 0;
      document.getElementById('deal-code-badge').textContent = this.currentGame?.dealCode || 'MJ-0000';
      const mjHigh = this.profiles.getActiveProfile()?.gameStats?.mahjong?.highScore || 0;
      document.getElementById('high-score-display').textContent = mjHigh;
      if (this.currentGame?.state?.won && !this.hasCelebratedWin) {
        this.hasCelebratedWin = true;
        this._triggerWinCelebration();
      }
      return;
    }
    if (isSudoku) {
      this.sudokuView?.render();
      document.getElementById('score-display').textContent = this.currentGame?.state?.score || 0;
      document.getElementById('moves-display').textContent = this.currentGame?.state?.moves || 0;
      document.getElementById('deal-code-badge').textContent = this.currentGame?.dealCode || 'SU-0000';
      const sdHigh = this.profiles.getActiveProfile()?.gameStats?.sudoku?.highScore || 0;
      document.getElementById('high-score-display').textContent = sdHigh;
      if (this.currentGame?.state?.won && !this.hasCelebratedWin) {
        this.hasCelebratedWin = true;
        this._triggerWinCelebration();
      }
      return;
    }
    if (isKeystoneDrop) {
      this.keystoneDropView?.render();
      document.getElementById('score-display').textContent = this.currentGame?.state?.score || 0;
      document.getElementById('moves-display').textContent = this.currentGame?.state?.moves || 0;
      document.getElementById('deal-code-badge').textContent = this.currentGame?.dealCode || 'KD-0000';
      const kdHigh = this.profiles.getActiveProfile()?.gameStats?.keystone_drop?.highScore || 0;
      document.getElementById('high-score-display').textContent = kdHigh;
      if (this.currentGame?.state?.won && !this.hasCelebratedWin) {
        this.hasCelebratedWin = true;
        this._triggerWinCelebration();
      }
      return;
    }
    if (isDominoes) {
      this.dominoesView?.render();
      document.getElementById('score-display').textContent = this.currentGame?.state?.score || 0;
      document.getElementById('moves-display').textContent = this.currentGame?.state?.moves || 0;
      document.getElementById('deal-code-badge').textContent = this.currentGame?.dealCode || 'DM-0000';
      const dmHigh = this.profiles.getActiveProfile()?.gameStats?.dominoes?.highScore || 0;
      document.getElementById('high-score-display').textContent = dmHigh;
      if (this.currentGame?.state?.won && !this.hasCelebratedWin) {
        this.hasCelebratedWin = true;
        this._triggerWinCelebration();
      }
      return;
    }
    if (isTrashConveyor) {
      this.trashConveyorView?.render();
      document.getElementById('score-display').textContent = this.currentGame?.state?.score || 0;
      document.getElementById('moves-display').textContent = this.currentGame?.state?.moves || 0;
      document.getElementById('deal-code-badge').textContent = this.currentGame?.dealCode || 'JM-0000';
      const jmHigh = this.profiles.getActiveProfile()?.gameStats?.trash_conveyor?.highScore || 0;
      document.getElementById('high-score-display').textContent = jmHigh;
      return;
    }

    // Solitaire Modes Rendering
    document.body.classList.toggle('mode-freecell', isFreeCell);
    document.body.classList.toggle('mode-spider', isSpider);
    document.body.classList.toggle('mode-klondike', isSolitaire && !isFreeCell && !isSpider);

    this._renderFoundations();
    this._renderTableau();


    if (isFreeCell) {
      this._renderFreecells();
    } else if (!isSpider) {
      this._renderStockAndWaste();
    } else {
      this._renderSpiderStock();
    }

    // Status Indicators
    document.getElementById('score-display').textContent = this.currentGame.state.score;
    document.getElementById('moves-display').textContent = this.currentGame.state.moves;
    document.getElementById('deal-code-badge').textContent = this.currentGame.dealCode;

    // High Score for Active User
    const activeProfile = this.profiles.getActiveProfile();
    const highScore = activeProfile?.gameStats[this.gameType]?.highScore || 0;
    document.getElementById('high-score-display').textContent = highScore;

    // Auto-Complete Check (Microsoft Solitaire style)
    const isSolvable = !this.currentGame?.state?.won && this.currentGame?.canAutoComplete && this.currentGame.canAutoComplete();
    if (isSolvable) {
      this.autoCompleteBtn?.classList.remove('hidden');
      if (!this.isAutoCompleting) {
        this.floatingAutoSolveBtn?.classList.remove('hidden');
      }
      // If not already auto-completing and user hasn't explicitly paused, automatically solve to foundation!
      if (!this.isAutoCompleting && !this.autoSolveUserPaused) {
        this.autoSolveBanner?.classList.remove('hidden');
        if (!this.autoSolveDebounceTimer) {
          this.autoSolveDebounceTimer = setTimeout(() => {
            this.autoSolveDebounceTimer = null;
            if (this.currentGame?.canAutoComplete && this.currentGame.canAutoComplete() && !this.isAutoCompleting && !this.autoSolveUserPaused) {
              this.runAutoComplete();
            }
          }, 350);
        }
      }
    } else {
      if (!this.isAutoCompleting) {
        this.autoCompleteBtn?.classList.add('hidden');
        this.floatingAutoSolveBtn?.classList.add('hidden');
        this.autoSolveBanner?.classList.add('hidden');
      }
    }

    // Auto-Save after state change
    this._autoSaveState();

    // Real-Time P2P Time Challenge Advancement Telemetry (Up to 5 players)
    if (this.p2pDuel?.activeDuel && this.p2pDuel.activeDuel.status === 'RACING') {
      let cardsRemaining = 0;
      if (this.currentGame?.state?.foundations) {
        const totalInFoundations = this.currentGame.state.foundations.reduce((sum, f) => sum + f.length, 0);
        cardsRemaining = Math.max(0, this.p2pDuel.activeDuel.totalCards - totalInFoundations);
      } else if (this.gameType === 'tripeaks') {
        cardsRemaining = (this.currentGame?.state?.tableau?.filter(c => !c.removed)?.length || 0) + (this.currentGame?.state?.stock?.length || 0);
      } else if (this.gameType === 'pyramid') {
        cardsRemaining = (this.currentGame?.state?.pyramid?.filter(c => !c.removed)?.length || 0) + (this.currentGame?.state?.stock?.length || 0) + (this.currentGame?.state?.waste?.length || 0);
      }
      this.p2pDuel.sendProgress({
        score: this.currentGame?.state?.score || 0,
        moves: this.currentGame?.state?.moves || 0,
        cardsLeft: cardsRemaining,
        won: !!this.currentGame?.state?.won
      });
    }

    // Win Check
    if (this.currentGame.state && this.currentGame.state.won) {
      if (!this.hasCelebratedWin) {
        this.hasCelebratedWin = true;
        this._triggerWinCelebration();
      }
    }
  }

  /**
   * Keeps every blackjack hand inside its own seat. A hand that does not fit is fanned: cards overlap,
   * left to right, so each corner index stays readable and nothing covers a neighbouring seat.
   */
  _fitBlackjackCards() {
    const view = this.blackjackView;
    if (!view || view.classList.contains('hidden')) return;
    const fit = (row, avail) => {
      const cards = row.querySelectorAll('.solitaire-card');
      row.style.removeProperty('--bj-mr');
      if (cards.length < 2 || avail <= 0) return;
      const cw = cards[0].getBoundingClientRect().width || 0;
      const gap = 8;
      const natural = cards.length * cw + (cards.length - 1) * gap;
      if (natural <= avail) return;
      const mr = Math.max(-(cw - 30), (avail - cards.length * cw) / (cards.length - 1));
      row.style.setProperty('--bj-mr', `${mr.toFixed(1)}px`);
    };
    const dealer = document.getElementById('bj-dealer-cards');
    if (dealer) fit(dealer, dealer.clientWidth - 24);
    for (const row of view.querySelectorAll('.bj-seat-cards')) fit(row, row.clientWidth - 6);
    const inner = document.getElementById('bj-human-hands-inner');
    if (inner) {
      const rows = inner.querySelectorAll('.bj-hand-cards');
      const share = (inner.clientWidth - 16 * (rows.length - 1)) / Math.max(1, rows.length) - 26;
      for (const row of rows) fit(row, share);
    }
    const grid = document.getElementById('bj-player-hands-container');
    if (grid && !inner) {
      const rows = grid.querySelectorAll('.bj-hand-cards');
      const share = (grid.clientWidth - 32 * (rows.length - 1)) / Math.max(1, rows.length) - 26;
      for (const row of rows) fit(row, share);
    }
  }

  _renderBlackjackTable() {
    const game = this.currentGame;
    if (!game) return;

    // Bankroll & Bet
    document.getElementById('bj-bankroll-val').textContent = `$${game.bankroll.toLocaleString()}`;
    document.getElementById('bj-bet-val').textContent = `$${game.currentBet.toLocaleString()}`;
    document.getElementById('bj-status-message').textContent = game.lastMessage;

    // Score & Moves indicators in HUD
    document.getElementById('score-display').textContent = `$${game.bankroll}`;
    document.getElementById('moves-display').textContent = `Bet $${game.currentBet}`;
    document.getElementById('deal-code-badge').textContent = `SHOE: ${game.shoe.length} Cards`;

    const activeProfile = this.profiles.getActiveProfile();
    const highScore = activeProfile?.gameStats['blackjack']?.highScore || 1000;
    document.getElementById('high-score-display').textContent = `$${highScore}`;

    // Render Dealer Cards
    const dealerCardsEl = document.getElementById('bj-dealer-cards');
    dealerCardsEl.innerHTML = '';
    game.dealerCards.forEach(card => {
      const cardEl = this._createCardElement(card, { zone: 'dealer', index: 0 });
      dealerCardsEl.appendChild(cardEl);
    });

    const dealerBadge = document.getElementById('dealer-total-badge');
    if (game.status === HAND_STATUS.BETTING) {
      dealerBadge.textContent = '--';
    } else if (game.status === HAND_STATUS.PLAYING) {
      // Show only upcard value
      const upcard = game.dealerCards[0];
      dealerBadge.textContent = upcard ? (upcard.rank === 0 ? '11 / 1' : Math.min(10, upcard.rank + 1)) : '--';
    } else {
      const dealerVal = game.calculateHandValue(game.dealerCards);
      dealerBadge.textContent = dealerVal.isBust ? `${dealerVal.total} (Bust!)` : dealerVal.total;
    }

    // Render Player Hands & Seats
    const playerHandsContainer = document.getElementById('bj-player-hands-container');
    playerHandsContainer.innerHTML = '';

    if (game.tableMode === 'multiplayer') {
      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'bj-multiplayer-table';

      // Left Seat: Lucky Lily
      const lily = game.seats[0];
      const lilyBox = document.createElement('div');
      lilyBox.className = 'bj-seat-box bj-bot-seat';
      lilyBox.innerHTML = `
        <div class="bj-seat-header">
          <span class="bj-seat-badge">${lily.avatar} ${lily.name}</span>
          <span class="bj-seat-chips">$${lily.chips.toLocaleString()}</span>
        </div>
        <div class="bj-seat-bet-tag">Bet: $${lily.bet}</div>
        <div class="bj-seat-cards" id="bj-cards-lily"></div>
        <div class="bj-seat-status ${lily.result ? 'status-' + lily.result.toLowerCase() : ''}">${lily.status || 'READY'}</div>
      `;
      const lilyCardsEl = lilyBox.querySelector('#bj-cards-lily');
      (lily.cards || []).forEach(card => {
        lilyCardsEl.appendChild(this._createCardElement(card, { zone: 'bot_lily', index: 0 }));
      });
      tableWrapper.appendChild(lilyBox);

      // Center Seat: Human Player
      const humanBox = document.createElement('div');
      humanBox.className = 'bj-seat-box bj-human-seat';
      humanBox.innerHTML = `
        <div class="bj-seat-header">
          <span class="bj-seat-badge">${this.profiles.getActiveProfile()?.avatar || '👑'} You (${this.profiles.getActiveProfile()?.name || 'Player 1'})</span>
          <span class="bj-seat-chips">$${game.bankroll.toLocaleString()}</span>
        </div>
        <div class="bj-human-hands-inner" id="bj-human-hands-inner"></div>
      `;
      const humanHandsInner = humanBox.querySelector('#bj-human-hands-inner');
      game.playerHands.forEach((hand, hIdx) => {
        const handBox = document.createElement('div');
        handBox.className = `bj-hand-box ${game.status === HAND_STATUS.PLAYING && game.activeHandIndex === hIdx ? 'active-hand' : ''}`;
        const cardsRow = document.createElement('div');
        cardsRow.className = 'bj-hand-cards';
        hand.cards.forEach(card => {
          cardsRow.appendChild(this._createCardElement(card, { zone: 'player', index: hIdx }));
        });
        handBox.appendChild(cardsRow);

        const val = game.calculateHandValue(hand.cards);
        const footer = document.createElement('div');
        footer.className = 'bj-hand-footer';
        footer.innerHTML = `
          <span>Total: <strong>${val.isBust ? val.total + ' (Bust)' : val.total}</strong></span>
          <span>&bull; Bet: $${hand.bet}</span>
          ${hand.result ? `<span class="bj-hand-result-tag tag-${hand.result.toLowerCase()}">${hand.result}</span>` : ''}
        `;
        handBox.appendChild(footer);
        humanHandsInner.appendChild(handBox);
      });
      tableWrapper.appendChild(humanBox);

      // Right Seat: Vegas Vic
      const vic = game.seats[2];
      const vicBox = document.createElement('div');
      vicBox.className = 'bj-seat-box bj-bot-seat';
      vicBox.innerHTML = `
        <div class="bj-seat-header">
          <span class="bj-seat-badge">${vic.avatar} ${vic.name}</span>
          <span class="bj-seat-chips">$${vic.chips.toLocaleString()}</span>
        </div>
        <div class="bj-seat-bet-tag">Bet: $${vic.bet}</div>
        <div class="bj-seat-cards" id="bj-cards-vic"></div>
        <div class="bj-seat-status ${vic.result ? 'status-' + vic.result.toLowerCase() : ''}">${vic.status || 'READY'}</div>
      `;
      const vicCardsEl = vicBox.querySelector('#bj-cards-vic');
      (vic.cards || []).forEach(card => {
        vicCardsEl.appendChild(this._createCardElement(card, { zone: 'bot_vic', index: 0 }));
      });
      tableWrapper.appendChild(vicBox);

      playerHandsContainer.appendChild(tableWrapper);
    } else {
      game.playerHands.forEach((hand, hIdx) => {
        const handBox = document.createElement('div');
        handBox.className = `bj-hand-box ${game.status === HAND_STATUS.PLAYING && game.activeHandIndex === hIdx ? 'active-hand' : ''}`;

        const cardsRow = document.createElement('div');
        cardsRow.className = 'bj-hand-cards';
        hand.cards.forEach(card => {
          const cardEl = this._createCardElement(card, { zone: 'player', index: hIdx });
          cardsRow.appendChild(cardEl);
        });
        handBox.appendChild(cardsRow);

        const val = game.calculateHandValue(hand.cards);
        const footer = document.createElement('div');
        footer.className = 'bj-hand-footer';
        footer.innerHTML = `
          <span>Total: <strong>${val.isBust ? val.total + ' (Bust)' : val.total}</strong></span>
          <span>&bull; Bet: $${hand.bet}</span>
          ${hand.result ? `<span class="bj-hand-result-tag tag-${hand.result.toLowerCase()}">${hand.result}</span>` : ''}
        `;
        handBox.appendChild(footer);

        playerHandsContainer.appendChild(handBox);
      });
    }

    this._fitBlackjackCards();

    // Update Seat toggle button label & tooltip
    const seatToggleBtn = document.getElementById('btn-bj-toggle-seats');
    if (seatToggleBtn) {
      seatToggleBtn.textContent = game.tableMode === 'multiplayer' ? '👤 Solo Table' : '👥 3-Player Table';
      seatToggleBtn.title = game.tableMode === 'multiplayer' ? 'Switch to Solo Table (1-on-1)' : 'Switch to 3-Player Table (Play alongside Lucky Lily & Vegas Vic)';
    }

    // Update Player Total Badge for active hand
    const activeHand = game.playerHands[game.activeHandIndex];
    const playerBadge = document.getElementById('player-total-badge');
    if (activeHand && activeHand.cards.length > 0) {
      const pVal = game.calculateHandValue(activeHand.cards);
      playerBadge.textContent = pVal.isBust ? `${pVal.total} (Bust)` : pVal.total;
    } else {
      playerBadge.textContent = '--';
    }

    // Toggle Control Button Groups
    const isBetting = game.status === HAND_STATUS.BETTING;
    const isPlaying = game.status === HAND_STATUS.PLAYING;
    const isResolved = game.status === HAND_STATUS.RESOLVED;

    // In betting or resolved mode, chips tray is visible!
    document.getElementById('bj-chips-tray')?.classList.toggle('hidden', isPlaying);
    document.getElementById('bj-betting-buttons')?.classList.toggle('hidden', !isBetting);
    document.getElementById('bj-play-buttons')?.classList.toggle('hidden', !isPlaying);
    document.getElementById('bj-resolved-buttons')?.classList.toggle('hidden', !isResolved);

    // Update Rebet button text and state
    const rebetBtn = document.getElementById('btn-bj-rebet-deal');
    if (rebetBtn) {
      const pBet = game.previousBet || 25;
      rebetBtn.textContent = `⚡ DEAL NEXT HAND ($${pBet})`;
      const canRebet = game.bankroll >= pBet;
      rebetBtn.disabled = !canRebet;
      rebetBtn.style.opacity = canRebet ? '1' : '0.4';
    }

    // Rebuy button visibility
    const rebuyBtn = document.getElementById('btn-bj-rebuy');
    if (rebuyBtn) {
      rebuyBtn.classList.toggle('hidden', game.bankroll >= game.minBet);
    }

    // Split button visibility
    const canSplit = isPlaying && activeHand && activeHand.cards.length === 2 &&
      activeHand.cards[0].rank === activeHand.cards[1].rank && game.bankroll >= activeHand.bet;
    document.getElementById('btn-bj-split')?.classList.toggle('hidden', !canSplit);

    // Double button disabled state
    const doubleBtn = document.getElementById('btn-bj-double');
    if (doubleBtn) {
      const canDouble = isPlaying && activeHand && activeHand.cards.length === 2 && game.bankroll >= activeHand.bet;
      doubleBtn.disabled = !canDouble;
      doubleBtn.style.opacity = canDouble ? '1' : '0.4';
    }

    // Auto-record Blackjack score & celebrate wins
    this.profiles.setCasinoBankroll(game.bankroll);
    this._updateCasinoVaultDisplay();

    if (isResolved) {
      this.profiles.recordGameResult('blackjack', game.bankroll, game.bankroll > 1000);
      this._updateProfileBar();

      if (game.bankroll < game.minBet) {
        this._displayHintMessage(`💡 Low on chips! Click 'Rebuy $1,000' or play Solitaire (Klondike, FreeCell, Spider) to build up your bankroll!`);
      }

      // Check if player won any hand
      const wonAnyHand = game.playerHands.some(h => h.result === 'WIN');
      const hasNaturalBJ = game.playerHands.some(h => h.result === 'BLACKJACK');

      if ((wonAnyHand || hasNaturalBJ) && !this.hasCelebratedWin) {
        this.hasCelebratedWin = true;
        this.sound.playVictoryFanfare();
        if (hasNaturalBJ) {
          this.launchCelebrationShow('grand_royale');
          this._displayHintMessage("👑 ROYAL BLACKJACK! 3:2 Payout Achieved! Fireworks & Golden Confetti show activated!");
        } else {
          this.launchCelebrationShow('golden_confetti');
          this._displayHintMessage("🎉 VICTORY! Dealer Defeated! Golden Confetti celebration activated!");
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // PYRAMID SOLITAIRE RENDERER & INTERACTION
  // --------------------------------------------------------------------------

  _renderPyramidTable() {
    const game = this.currentGame;
    if (!game) return;

    // HUD Stats
    document.getElementById('score-display').textContent = game.state.score;
    document.getElementById('moves-display').textContent = game.state.moves;
    document.getElementById('deal-code-badge').textContent = game.dealCode;

    const activeProfile = this.profiles.getActiveProfile();
    const highScore = activeProfile?.gameStats['pyramid']?.highScore || 0;
    document.getElementById('high-score-display').textContent = highScore;

    // P2P Progress Broadcast
    if (this.p2pDuel && this.p2pDuel.activeDuel) {
      this.p2pDuel.sendProgress({
        score: game.state.score,
        cardsLeft: game.state.pyramid.filter(p => !p.removed).length,
        streak: 0,
        won: game.state.won
      });
    }

    // Top Bar Piles
    const stockSlot = document.getElementById('pyr-stock-pile');
    if (stockSlot) {
      stockSlot.innerHTML = '';
      if (game.state.stock.length > 0) {
        stockSlot.innerHTML = DeckRenderer.getCardBackSVG(this.cardBackTheme);
        stockSlot.title = `Stock: ${game.state.stock.length} cards remaining. Click to draw.`;
      } else if (game.state.recyclesRemaining > 0 && game.state.waste.length > 0) {
        stockSlot.innerHTML = `<span class="slot-watermark">♻️ Recycle</span>`;
        stockSlot.title = `Recycle Waste to Stock (${game.state.recyclesRemaining} recycles left)`;
      } else {
        stockSlot.innerHTML = `<span class="slot-watermark">Empty</span>`;
        stockSlot.title = 'Stock exhausted';
      }
    }

    const wasteSlot = document.getElementById('pyr-waste-pile');
    if (wasteSlot) {
      wasteSlot.innerHTML = '';
      if (game.state.waste.length > 0) {
        const topWaste = game.state.waste[game.state.waste.length - 1];
        const cardEl = this._createCardElement(topWaste, { zone: 'waste', index: game.state.waste.length - 1 });
        if (game.selectedCard && game.selectedCard.zone === 'waste') {
          cardEl.classList.add('selected');
        }
        wasteSlot.appendChild(cardEl);
      } else {
        wasteSlot.innerHTML = `<span class="slot-watermark">Waste</span>`;
      }
    }

    // Status pill & recycles
    const recyclesBadge = document.getElementById('pyr-recycles-badge');
    if (recyclesBadge) recyclesBadge.textContent = `♻️ Recycles Left: ${game.state.recyclesRemaining}`;

    const selStatus = document.getElementById('pyr-selection-status');
    if (selStatus) {
      if (game.selectedCard) {
        const cardDesc = game.selectedCard.zone === 'waste'
          ? game.state.waste[game.state.waste.length - 1].shortCode
          : game.state.pyramid[game.selectedCard.index].card.shortCode;
        selStatus.textContent = `Selected: ${cardDesc} (${game.selectedCard.val}) — Pick matching card for 13`;
      } else {
        selStatus.textContent = 'Select an open card (Sum to 13)';
      }
    }

    // 7-Row Pyramid Grid
    const board = document.getElementById('pyramid-board');
    if (!board) return;
    board.innerHTML = '';

    let cardIdx = 0;
    for (let r = 0; r < 7; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'pyramid-row';
      rowEl.style.zIndex = r + 1;

      for (let c = 0; c <= r; c++) {
        const item = game.state.pyramid[cardIdx];
        const thisIdx = cardIdx++;

        const wrapper = document.createElement('div');
        wrapper.className = 'pyramid-card-wrapper';

        if (item.removed) {
          wrapper.classList.add('removed');
        } else {
          const isExp = game.isExposed(thisIdx);
          wrapper.classList.toggle('exposed', isExp);
          wrapper.classList.toggle('blocked', !isExp);

          if (game.selectedCard && game.selectedCard.zone === 'pyramid' && game.selectedCard.index === thisIdx) {
            wrapper.classList.add('selected');
          }

          const cardEl = this._createCardElement(item.card, { zone: 'pyramid', index: thisIdx });
          wrapper.appendChild(cardEl);

          wrapper.onclick = (e) => {
            e.stopPropagation();
            this.handlePyramidCardClick(thisIdx);
          };
        }

        rowEl.appendChild(wrapper);
      }
      board.appendChild(rowEl);
    }

    // Check Win
    if (game.state.won && !this.hasCelebratedWin) {
      this.hasCelebratedWin = true;
      this._triggerWinCelebration();
    }
  }

  handlePyramidStockClick() {
    if (!this.currentGame || this.gameType !== 'pyramid') return;
    const ok = this.currentGame.drawCard();
    if (ok) {
      this.sound.playCardFlip();
      this.render();
    }
  }

  handlePyramidWasteClick() {
    if (!this.currentGame || this.gameType !== 'pyramid') return;
    if (this.currentGame.state.waste.length === 0) return;
    const res = this.currentGame.selectCard('waste', 0);
    if (res.ok) {
      if (res.removed && res.removed.length > 0) {
        this.sound.playFoundationSnap(12);
      } else {
        this.sound.playCardSnap();
      }
      this._displayHintMessage(res.message);
      this.render();
    }
  }

  handlePyramidCardClick(index) {
    if (!this.currentGame || this.gameType !== 'pyramid') return;
    const res = this.currentGame.selectCard('pyramid', index);
    if (res.ok) {
      if (res.removed && res.removed.length > 0) {
        this.sound.playFoundationSnap(12);
        this.p2pDuel?.recordMove('PLAY_TABLEAU', { index });
      } else {
        this.sound.playCardSnap();
      }
      this._displayHintMessage(res.message);
      this.render();
    } else {
      this._displayHintMessage(`⚠️ ${res.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TRIPEAKS SOLITAIRE RENDERER & INTERACTION
  // --------------------------------------------------------------------------

  _renderTriPeaksTable() {
    const game = this.currentGame;
    if (!game) return;

    // HUD Stats
    document.getElementById('score-display').textContent = game.state.score;
    document.getElementById('moves-display').textContent = game.state.moves;
    document.getElementById('deal-code-badge').textContent = game.dealCode;

    const activeProfile = this.profiles.getActiveProfile();
    const highScore = activeProfile?.gameStats['tripeaks']?.highScore || 0;
    document.getElementById('high-score-display').textContent = highScore;

    // P2P Progress Broadcast
    if (this.p2pDuel && this.p2pDuel.activeDuel) {
      this.p2pDuel.sendProgress({
        score: game.state.score,
        cardsLeft: game.getRemainingCardsCount(),
        streak: game.state.streak,
        won: game.state.won
      });
    }

    // Top Bar Stock & Waste
    const stockSlot = document.getElementById('tp-stock-pile');
    if (stockSlot) {
      stockSlot.innerHTML = '';
      if (game.state.stock.length > 0) {
        stockSlot.innerHTML = DeckRenderer.getCardBackSVG(this.cardBackTheme);
        const badge = document.createElement('span');
        badge.id = 'tp-stock-count-badge';
        badge.className = 'stock-counter-badge';
        badge.textContent = game.state.stock.length;
        stockSlot.appendChild(badge);
        stockSlot.title = `Stock: ${game.state.stock.length} cards. Click to draw.`;
      } else {
        stockSlot.innerHTML = `<span class="slot-watermark">Empty</span>`;
        stockSlot.title = 'Stock empty';
      }
    }

    const wasteSlot = document.getElementById('tp-waste-pile');
    if (wasteSlot) {
      wasteSlot.innerHTML = '';
      const topWaste = game.getTopWaste();
      if (topWaste) {
        const cardEl = this._createCardElement(topWaste, { zone: 'waste', index: 0 });
        wasteSlot.appendChild(cardEl);
      } else {
        wasteSlot.innerHTML = `<span class="slot-watermark">Waste</span>`;
      }
    }

    // Streak & Peaks Status
    const streakMeter = document.getElementById('tp-streak-meter');
    if (streakMeter) {
      streakMeter.textContent = `🔥 STREAK: x${game.state.streak} (+${game.state.streak * 10} pts)`;
    }

    document.getElementById('tp-peak-0')?.classList.toggle('cleared', game.state.peaksCleared[0]);
    document.getElementById('tp-peak-1')?.classList.toggle('cleared', game.state.peaksCleared[1]);
    document.getElementById('tp-peak-2')?.classList.toggle('cleared', game.state.peaksCleared[2]);

    // Render 3 Peaks Tableau
    const board = document.getElementById('tripeaks-board');
    if (!board) return;
    board.innerHTML = '';

    // Group tableau nodes by row (row 0: 3 cards, row 1: 6 cards, row 2: 9 cards, row 3: 10 cards)
    const rows = [[], [], [], []];
    game.state.tableau.forEach(node => {
      rows[node.row].push(node);
    });

    rows.forEach((rowNodes, rIdx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'tripeaks-row';
      rowEl.style.zIndex = rIdx + 1;

      rowNodes.forEach(node => {
        const wrapper = document.createElement('div');
        wrapper.className = 'tripeaks-card-wrapper';

        if (node.removed) {
          wrapper.classList.add('removed');
        } else {
          const isBlocked = game.isCardBlocked(node.index);
          const isPlayable = !isBlocked && node.faceUp && game.canPlayOnWaste(node.card);

          wrapper.classList.toggle('blocked', isBlocked);
          wrapper.classList.toggle('playable', isPlayable);

          const cardEl = this._createCardElement(node.card, { zone: 'tripeaks', index: node.index });
          wrapper.appendChild(cardEl);

          if (isPlayable) {
            wrapper.onclick = (e) => {
              e.stopPropagation();
              this.handleTriPeaksCardClick(node.index);
            };
          }
        }
        rowEl.appendChild(wrapper);
      });
      board.appendChild(rowEl);
    });

    // Check Win
    if (game.state.won && !this.hasCelebratedWin) {
      this.hasCelebratedWin = true;
      this._triggerWinCelebration();
    }
  }

  handleTriPeaksStockClick() {
    if (!this.currentGame || this.gameType !== 'tripeaks') return;
    const res = this.currentGame.drawFromStock();
    if (res && res.success) {
      this.sound.playCardFlip();
      this.p2pDuel?.recordMove('DRAW_STOCK');
      this.render();
    }
  }

  handleTriPeaksCardClick(index) {
    if (!this.currentGame || this.gameType !== 'tripeaks') return;
    const res = this.currentGame.playTableauCard(index);
    if (res && res.success) {
      this.sound.playCardSnap();
      this.p2pDuel?.recordMove('PLAY_TABLEAU', { index });
      if (res.streak >= 3) {
        this._displayHintMessage(`🔥 STREAK x${res.streak}! +${res.pointsAdded} points!`);
      }
      this.render();
    }
  }

  // --------------------------------------------------------------------------
  // VIDEO POKER CASINO RENDERER & INTERACTION
  // --------------------------------------------------------------------------

  _renderPokerTable() {
    const game = this.currentGame;
    if (!game) return;

    // HUD Stats
    document.getElementById('score-display').textContent = `${game.credits.toLocaleString()} pts`;
    document.getElementById('moves-display').textContent = `Hand #${game.state.totalHands}`;
    document.getElementById('deal-code-badge').textContent = `DEAL: ${game.dealCode}`;

    const activeProfile = this.profiles.getActiveProfile();
    const highScore = activeProfile?.gameStats[this.gameType]?.highScore || 1000;
    document.getElementById('high-score-display').textContent = `${highScore.toLocaleString()} pts`;

    // Clean Game Title & Hand Evaluation Feedback Banner
    const titleEl = document.getElementById('poker-variation-title');
    if (titleEl) {
      titleEl.textContent = game.variation.replace(/_/g, ' ').toUpperCase();
    }

    const evalBadge = document.getElementById('poker-hand-eval-badge');
    const evalText = document.getElementById('poker-hand-eval-text');
    if (evalText) {
      if (game.state.phase === 'HOLDING') {
        const currentEval = game.evaluateHand ? game.evaluateHand(game.state.hand, game.variation) : null;
        if (currentEval && currentEval.rank !== 'HIGH_CARD' && currentEval.rank !== 'NOTHING') {
          if (currentEval.pays !== false && currentEval.multiplier > 0) {
            evalText.textContent = `Current: ${currentEval.name} — Click cards to HOLD, then press DRAW`;
          } else {
            const note = currentEval.explanation ? ` (${currentEval.explanation})` : '';
            evalText.textContent = `Current: ${currentEval.name}${note} — Click cards to HOLD, then press DRAW`;
          }
        } else {
          evalText.textContent = 'Click any card you want to KEEP, then press DRAW';
        }
        evalBadge?.classList.remove('winner');
      } else {
        if (game.state.lastWin && game.state.lastPayout > 0) {
          evalText.textContent = `🎉 ${game.state.lastWin.name}! +${game.state.lastPayout} Points!`;
          evalBadge?.classList.add('winner');
        } else if (game.state.lastWin && game.state.lastWin.name && game.state.lastWin.rank !== 'HIGH_CARD') {
          const reason = game.state.lastWin.explanation ? ` (${game.state.lastWin.explanation})` : '';
          evalText.textContent = `${game.state.lastWin.name} Recognized${reason} — Press DEAL NEXT HAND`;
          evalBadge?.classList.remove('winner');
        } else {
          evalText.textContent = 'Hand complete. Press DEAL NEXT HAND to play again.';
          evalBadge?.classList.remove('winner');
        }
      }
    }

    // Sync bankroll
    this.profiles.setCasinoBankroll(game.credits);
    this._updateCasinoVaultDisplay();

    // Console Panels
    const credEl = document.getElementById('poker-credits-val');
    if (credEl) credEl.textContent = game.credits.toLocaleString();
    const winEl = document.getElementById('poker-win-payout-val');
    if (winEl) winEl.textContent = game.state.lastPayout ? `+${game.state.lastPayout}` : '0';

    // Action button state
    const actionBtn = document.getElementById('btn-poker-deal-draw');
    if (actionBtn) {
      if (game.state.phase === 'HOLDING') {
        actionBtn.textContent = 'DRAW CARDS';
        actionBtn.className = 'btn btn-primary btn-large-deal btn-draw-pulse';
      } else {
        actionBtn.textContent = 'DEAL NEXT HAND';
        actionBtn.className = 'btn btn-primary btn-large-deal';
      }
    }

    // 5 Video Poker Cards - Prominent, High-Contrast & Spread Arc
    const cardsRow = document.getElementById('poker-cards-container');
    if (cardsRow) {
      cardsRow.innerHTML = '';
      const isShowdown = game.state.phase !== 'HOLDING';
      const isWon = isShowdown && game.state.lastPayout > 0;

      game.state.hand.forEach((card, idx) => {
        const cardBox = document.createElement('div');
        const isHeld = game.state.held[idx];
        cardBox.className = `poker-card-box ${isHeld ? 'is-held' : ''} ${isWon ? 'card-winner-pulse' : ''}`;
        cardBox.dataset.index = idx;

        const isWildCard = card && (card.isJoker || (game.variation === 'deuces_wild' && card.rank === 1));

        // Render card element with PokerCardComponent for high-contrast crisp vector SVG faces & accessibility
        const cardEl = PokerCardComponent.renderCard(card, {
          isPlayerHole: false,
          isWinningCard: isWon,
          customClass: isHeld ? 'poker-card-held' : '',
          cardBackTheme: this.cardBackTheme,
          variation: game.variation
        });

        const holdBtn = document.createElement('button');
        holdBtn.className = `poker-hold-btn ${isHeld ? 'held' : ''} ${isWildCard ? 'hold-btn-wild' : ''}`;
        holdBtn.textContent = isHeld ? (isWildCard ? 'HELD ★' : 'HELD') : (isWildCard ? 'HOLD ★' : 'HOLD');
        holdBtn.setAttribute('aria-label', `Hold ${card.fullName}${isWildCard ? ' (Wild Card)' : ''}`);

        const toggle = (e) => {
          if (e) e.stopPropagation();
          if (game.state.phase === 'HOLDING') {
            game.toggleHold(idx);
            this.sound.playCardSnap();
            this.render();
          }
        };

        cardBox.onclick = toggle;
        cardBox.appendChild(cardEl);
        cardBox.appendChild(holdBtn);
        cardsRow.appendChild(cardBox);
      });
    }
  }

  handlePokerDealDraw() {
    const game = this.currentGame;
    if (!game || !['poker_jacks', 'poker_deuces', 'poker_joker'].includes(this.gameType)) return;

    if (game.state.phase === 'HOLDING') {
      const res = game.draw();
      this.sound.playShuffle();

      if (res.payout > 0) {
        this.sound.playVictoryFanfare();
        this._displayHintMessage(`🎉 ${res.evaluation.name}! Paid ${res.payout} credits!`);
        if (['ROYAL_FLUSH', 'NATURAL_ROYAL', 'FOUR_DEUCES', 'WILD_ROYAL', 'JOKER_ROYAL', 'FIVE_OF_A_KIND'].includes(res.evaluation.rank)) {
          this.launchCelebrationShow('grand_royale');
        } else {
          this.launchCelebrationShow('golden_confetti');
        }
      } else {
        if (res.evaluation && res.evaluation.rank === 'TWO_PAIR') {
          if (this.gameType === 'poker_deuces') {
            this._displayHintMessage('Two Pair recognized! In Deuces Wild casino rules, payouts start at Three of a Kind. Press DEAL NEXT HAND.');
          } else {
            this._displayHintMessage('Two Pair recognized! Press DEAL NEXT HAND.');
          }
        } else if (res.evaluation && res.evaluation.name && res.evaluation.rank !== 'HIGH_CARD') {
          const reason = res.evaluation.explanation ? ` (${res.evaluation.explanation})` : '';
          this._displayHintMessage(`${res.evaluation.name} recognized${reason}. Press DEAL NEXT HAND.`);
        } else {
          this._displayHintMessage('Hand over. Press DEAL NEXT HAND to play again.');
        }
      }

      this.profiles.setCasinoBankroll(game.credits);
      this.profiles.recordGameResult(this.gameType, game.credits, res.payout > 0);
      this._updateProfileBar();
      this.render();
    } else {
      // Deal next hand
      if (game.credits < game.betCoins * (game.coinValue / 25)) {
        this._displayHintMessage('💡 Low on casino credits! Play Klondike, FreeCell, Spider, Pyramid, or TriPeaks to earn free Casino Cash!');
      }
      this.hasCelebratedWin = false;
      this.victoryCascade.stop();
      this.hideHint();
      game.deal();
      this.profiles.setCasinoBankroll(game.credits);
      this.sound.playShuffle();
      this.render();
    }
  }

  _bindPyramidAndTriPeaksControls() {
    document.getElementById('pyr-stock-pile')?.addEventListener('click', () => this.handlePyramidStockClick());
    document.getElementById('pyr-waste-pile')?.addEventListener('click', () => this.handlePyramidWasteClick());
    document.getElementById('tp-stock-pile')?.addEventListener('click', () => this.handleTriPeaksStockClick());
  }

  _bindPokerControls() {
    document.getElementById('btn-poker-bet-one')?.addEventListener('click', () => {
      if (['poker_jacks', 'poker_deuces', 'poker_joker'].includes(this.gameType) && this.currentGame) {
        this.currentGame.setBet((this.currentGame.betCoins % 5) + 1);
        this.render();
      }
    });

    document.getElementById('btn-poker-bet-max')?.addEventListener('click', () => {
      if (['poker_jacks', 'poker_deuces', 'poker_joker'].includes(this.gameType) && this.currentGame) {
        this.currentGame.setBet(5);
        this.render();
      }
    });

    document.getElementById('btn-poker-auto-hold')?.addEventListener('click', () => {
      if (['poker_jacks', 'poker_deuces', 'poker_joker'].includes(this.gameType) && this.currentGame) {
        const hint = this.currentGame.getTacticalHint();
        if (hint && hint.hold) {
          this.currentGame.state.held = [...hint.hold];
          this.sound.playCardSnap();
          this._displayHintMessage(`💡 Auto-Hold Applied: ${hint.reason}`);
          this.render();
        }
      }
    });

    document.getElementById('btn-poker-deal-draw')?.addEventListener('click', () => this.handlePokerDealDraw());
  }

  // --------------------------------------------------------------------------
  // TEXAS HOLD'EM CASINO POKER RENDERER & INTERACTION
  // --------------------------------------------------------------------------

  _renderHoldemTable() {
    const game = this.currentGame;
    if (!game || this.gameType !== 'poker_holdem') return;

    const isShowdown = game.stage === HOLDEM_STAGES.SHOWDOWN;
    const human = game.players[0];

    // HUD Stats
    document.getElementById('score-display').textContent = `$${human.chips.toLocaleString()}`;
    document.getElementById('moves-display').textContent = `POT: $${game.pot.toLocaleString()}`;
    document.getElementById('deal-code-badge').textContent = game.dealCode;

    const activeProfile = this.profiles.getActiveProfile();
    const highScore = activeProfile?.gameStats['poker_holdem']?.highScore || 1000;
    document.getElementById('high-score-display').textContent = `$${highScore.toLocaleString()}`;

    // Pot & Status Message
    const potValEl = document.getElementById('holdem-pot-val');
    if (potValEl) potValEl.textContent = `$${game.pot.toLocaleString()}`;

    const statusMsgEl = document.getElementById('holdem-status-msg');
    if (statusMsgEl) statusMsgEl.textContent = game.lastMessage;

    // Player Chips & Current Bet
    const chipsValEl = document.getElementById('holdem-player-chips-val');
    if (chipsValEl) chipsValEl.textContent = `$${human.chips.toLocaleString()}`;

    this.profiles.setCasinoBankroll(human.chips);
    this._updateCasinoVaultDisplay();

    const betValEl = document.getElementById('holdem-player-bet-val');
    if (betValEl) betValEl.textContent = `$${human.currentBet.toLocaleString()}`;

    // 1. Render Opponent Seats (Victoria, Duke, Sovereign)
    const opponentsContainer = document.getElementById('holdem-opponents-row');
    if (opponentsContainer) {
      OpponentSeatComponent.renderRow(
        opponentsContainer,
        game.players.slice(1),
        isShowdown,
        game.winningCardIds,
        this.cardBackTheme
      );
    }

    // 2. Render 5 Community Cards with static empty placeholder frames (Zero Layout Shift)
    const communityContainer = document.getElementById('holdem-community-cards');
    if (communityContainer) {
      CommunityCardsComponent.render(
        communityContainer,
        game.communityCards,
        game.winningCardIds
      );
    }

    // 3. Render Active Player's Prominent Hole Cards at Bottom Center (Fanned & Lifted)
    const playerCardsContainer = document.getElementById('holdem-player-cards-container');
    if (playerCardsContainer) {
      PlayerHandComponent.render(
        playerCardsContainer,
        human.holeCards,
        human.bestHand,
        game.winningCardIds,
        human.folded
      );
    }

    // 4. Action Controls Bar
    const actionButtons = document.getElementById('holdem-action-buttons');
    const showdownButtons = document.getElementById('holdem-showdown-buttons');

    if (isShowdown) {
      actionButtons?.classList.add('hidden');
      showdownButtons?.classList.remove('hidden');

      // Check win for active player
      const userWon = game.winners.some(w => w.id === 0);
      if (userWon && !this.hasCelebratedWin) {
        this.hasCelebratedWin = true;
        this.sound.playVictoryFanfare();
        if (['Royal Flush', 'Straight Flush', 'Four of a Kind'].includes(human.bestHand?.name)) {
          this.launchCelebrationShow('grand_royale');
        } else {
          this.launchCelebrationShow('golden_confetti');
        }
        this._displayHintMessage(`👑 TABLE VICTORY! You won the $${game.pot} pot with a ${human.bestHand?.name || 'winning hand'}!`);
        this.profiles.recordGameResult(this.gameType, human.chips, true);
        this._updateProfileBar();
      }
    } else {
      actionButtons?.classList.remove('hidden');
      showdownButtons?.classList.add('hidden');

      // Dynamic Check vs Call Button
      const checkBtn = document.getElementById('btn-holdem-check');
      const callBtn = document.getElementById('btn-holdem-call');
      const toCall = game.currentHighBet - human.currentBet;

      if (toCall > 0) {
        checkBtn?.classList.add('hidden');
        callBtn?.classList.remove('hidden');
        if (callBtn) callBtn.textContent = `CALL $${toCall}`;
      } else {
        checkBtn?.classList.remove('hidden');
        callBtn?.classList.add('hidden');
      }

      // Dynamic Raise Button
      const raiseBtn = document.getElementById('btn-holdem-raise');
      if (raiseBtn) {
        const raiseAmt = game.bigBlind;
        raiseBtn.textContent = `RAISE $${raiseAmt}`;
      }
    }
  }

  _bindHoldemControls() {
    document.getElementById('btn-holdem-fold')?.addEventListener('click', () => this.handleHoldemFold());
    document.getElementById('btn-holdem-check')?.addEventListener('click', () => this.handleHoldemCheckCall());
    document.getElementById('btn-holdem-call')?.addEventListener('click', () => this.handleHoldemCheckCall());
    document.getElementById('btn-holdem-raise')?.addEventListener('click', () => this.handleHoldemRaise());
    document.getElementById('btn-holdem-allin')?.addEventListener('click', () => this.handleHoldemAllIn());
    document.getElementById('btn-holdem-next-hand')?.addEventListener('click', () => this.handleHoldemNextHand());
  }

  handleHoldemFold() {
    if (!this.currentGame || this.gameType !== 'poker_holdem') return;
    if (this.currentGame.userFold()) {
      this.sound.playCardSlide();
      this.render();
    }
  }

  handleHoldemCheckCall() {
    if (!this.currentGame || this.gameType !== 'poker_holdem') return;
    const human = this.currentGame.players[0];
    const toCall = this.currentGame.currentHighBet - human.currentBet;
    if (toCall > 0) {
      if (this.currentGame.userCall()) {
        this.sound.playCardSnap();
        this.render();
      }
    } else {
      if (this.currentGame.userCheck()) {
        this.sound.playCardSnap();
        this.render();
      }
    }
  }

  handleHoldemRaise() {
    if (!this.currentGame || this.gameType !== 'poker_holdem') return;
    if (this.currentGame.userRaise(this.currentGame.bigBlind)) {
      this.sound.playFoundationSnap(8);
      this.render();
    }
  }

  handleHoldemAllIn() {
    if (!this.currentGame || this.gameType !== 'poker_holdem') return;
    const human = this.currentGame.players[0];
    if (this.currentGame.userRaise(human.chips)) {
      this.sound.playFoundationSnap(12);
      this.render();
    }
  }

  handleHoldemNextHand() {
    if (!this.currentGame || this.gameType !== 'poker_holdem') return;
    this.hasCelebratedWin = false;
    this.victoryCascade.stop();
    this.hideHint();
    this.currentGame.dealHand();
    this.sound.playShuffle();
    this.render();
  }


  // --------------------------------------------------------------------------
  // P2P DUEL COMPETITION & MODAL CONTROLS
  // --------------------------------------------------------------------------

  openP2PModal() {
    const modal = document.getElementById('p2p-modal');
    modal?.classList.add('active');
  }

  _bindP2PControls() {
    document.getElementById('btn-p2p-duel')?.addEventListener('click', () => {
      if (this.gameType === 'word_tiles') {
        this.wordTilesView?.openP2PModal();
        return;
      }
      if (this.gameType === 'tank_minefield') {
        this.tankMinefieldView?.openPvPModal();
        return;
      }
      this.p2pDuel.queryNetworkChallenges();
      this._renderAvailableChallenges(this.p2pDuel.getAvailableChallenges());
      this.openP2PModal();
    });
    document.getElementById('btn-close-p2p-modal')?.addEventListener('click', () => {
      document.getElementById('p2p-modal')?.classList.remove('active');
    });

    // P2P Modal Tabs
    const availableTab = document.getElementById('tab-p2p-available');
    const hostTab = document.getElementById('tab-p2p-host');
    const joinTab = document.getElementById('tab-p2p-join');
    const verifyTab = document.getElementById('tab-p2p-verify');

    const availablePanel = document.getElementById('panel-p2p-available');
    const hostPanel = document.getElementById('panel-p2p-host');
    const joinPanel = document.getElementById('panel-p2p-join');
    const verifyPanel = document.getElementById('panel-p2p-verify');

    const allTabs = [availableTab, hostTab, joinTab, verifyTab];
    const allPanels = [availablePanel, hostPanel, joinPanel, verifyPanel];

    availableTab?.addEventListener('click', () => {
      allTabs.forEach(t => t?.classList.remove('active'));
      allPanels.forEach(p => p?.classList.add('hidden'));
      availableTab.classList.add('active');
      availablePanel?.classList.remove('hidden');
      this.p2pDuel.queryNetworkChallenges();
      this._renderAvailableChallenges(this.p2pDuel.getAvailableChallenges());
    });

    hostTab?.addEventListener('click', () => {
      allTabs.forEach(t => t?.classList.remove('active'));
      allPanels.forEach(p => p?.classList.add('hidden'));
      hostTab.classList.add('active');
      hostPanel?.classList.remove('hidden');
    });

    joinTab?.addEventListener('click', () => {
      allTabs.forEach(t => t?.classList.remove('active'));
      allPanels.forEach(p => p?.classList.add('hidden'));
      joinTab.classList.add('active');
      joinPanel?.classList.remove('hidden');
    });

    verifyTab?.addEventListener('click', () => {
      allTabs.forEach(t => t?.classList.remove('active'));
      allPanels.forEach(p => p?.classList.add('hidden'));
      verifyTab.classList.add('active');
      verifyPanel?.classList.remove('hidden');
    });

    // Network Scan Button in Modal
    document.getElementById('btn-scan-network')?.addEventListener('click', () => {
      this.p2pDuel.queryNetworkChallenges();
      this._renderAvailableChallenges(this.p2pDuel.getAvailableChallenges());
      this.sound.playCardSnap();
      this._displayHintMessage("🌐 Scanned P2P network for open hosted duels.");
    });

    // Host Duel Generation & Network Broadcast
    document.getElementById('btn-generate-duel')?.addEventListener('click', () => {
      const selectedGame = document.getElementById('select-p2p-game').value;
      const duel = this.p2pDuel.createDuel(selectedGame);
      const matchCode = this.p2pDuel.encodeMatchCode(duel);

      document.getElementById('input-host-match-code').value = matchCode;
      document.getElementById('host-code-display-box')?.classList.remove('hidden');

      this.gameType = selectedGame;
      const modeSelect = document.getElementById('select-game-mode');
      if (modeSelect) modeSelect.value = selectedGame;

      this.startNewGame(duel.seed);
      this._switchToRaceDock(true, duel.status);

      const roomIdEl = document.getElementById('race-room-id');
      const gameTagEl = document.getElementById('race-game-tag');
      if (roomIdEl) roomIdEl.textContent = duel.duelId;
      if (gameTagEl) gameTagEl.textContent = duel.gameType.toUpperCase();

      this._startRaceTimer(duel);
      this._renderP2PRacers(this.p2pDuel.getRankedLeaderboard());
      this._renderAvailableChallenges(this.p2pDuel.getAvailableChallenges());
      this._displayHintMessage(`👑 Duel hosted! Waiting for players. Race starts when 5 join or in 5 min.`);
    });

    // Copy Match Code
    document.getElementById('btn-copy-match-code')?.addEventListener('click', () => {
      const codeInput = document.getElementById('input-host-match-code');
      if (codeInput && codeInput.value) {
        navigator.clipboard.writeText(codeInput.value);
        this._displayHintMessage("📋 Match Code copied to clipboard! Share it with your opponent.");
      }
    });

    // Join Duel Launch
    document.getElementById('btn-start-joined-duel')?.addEventListener('click', () => {
      const codeInput = document.getElementById('input-join-match-code');
      if (!codeInput || !codeInput.value.trim()) {
        alert("Please paste a valid Match Code.");
        return;
      }

      try {
        const duel = this.p2pDuel.joinDuel(codeInput.value.trim());
        document.getElementById('p2p-modal')?.classList.remove('active');

        this.gameType = duel.gameType;
        const modeSelect = document.getElementById('select-game-mode');
        if (modeSelect) modeSelect.value = duel.gameType;

        this.startNewGame(duel.seed);
        this._switchToRaceDock(true, duel.status);

        const roomIdEl = document.getElementById('race-room-id');
        const gameTagEl = document.getElementById('race-game-tag');
        if (roomIdEl) roomIdEl.textContent = duel.duelId;
        if (gameTagEl) gameTagEl.textContent = duel.gameType.toUpperCase();

        this._startRaceTimer(duel);
        this._renderP2PRacers(this.p2pDuel.getRankedLeaderboard());
        const isWaiting = duel.status === 'WAITING';
        this._displayHintMessage(isWaiting
          ? `⚔️ Joined Duel ${duel.duelId}! Waiting for players (starts when 5 join or in 5 min).`
          : `⚔️ Joined Duplicate Duel against ${duel.hostName}! Both players have identical deals.`
        );
      } catch (err) {
        alert(`Error joining duel: ${err.message}`);
      }
    });

    // Leave Duel
    document.getElementById('btn-leave-p2p-duel')?.addEventListener('click', () => {
      this.p2pDuel.cleanup();
      this.p2pGhostHud?.classList.add('hidden');
      this._displayHintMessage("Left P2P Duel.");
    });

    // Run Move Verification
    document.getElementById('btn-run-verification')?.addEventListener('click', () => {
      const textarea = document.getElementById('textarea-cert-input');
      const verdictBox = document.getElementById('verification-verdict-box');
      if (!textarea || !textarea.value.trim() || !verdictBox) return;

      try {
        const cert = JSON.parse(textarea.value.trim());
        let EngineClass = TriPeaksGame;
        if (cert.gameType === 'pyramid') EngineClass = PyramidGame;
        else if (cert.gameType?.startsWith('klondike')) EngineClass = KlondikeGame;
        else if (cert.gameType === 'freecell') EngineClass = FreeCellGame;

        const check = P2PDuelManager.verifyCertificate(cert, EngineClass);
        verdictBox.classList.remove('hidden');
        if (check.valid) {
          verdictBox.className = 'verdict-box valid';
          verdictBox.innerHTML = `<strong>✅ 100% PROVABLY GENUINE:</strong> Opponent score of ${cert.finalScore} verified across ${cert.moveCount} deterministic moves. Zero memory modifications detected.`;
        } else {
          verdictBox.className = 'verdict-box invalid';
          verdictBox.innerHTML = `<strong>❌ REJECTED AS COUNTERFEIT:</strong> ${check.reason}`;
        }
      } catch (err) {
        alert(`Failed to parse certificate JSON: ${err.message}`);
      }
    });
  }

  _renderFoundations() {

    this.foundationsEl.innerHTML = '';
    const foundationPiles = this.currentGame.state.foundations;
    const numFoundations = (this.gameType.startsWith('spider')) ? 8 : 4;

    for (let f = 0; f < numFoundations; f++) {
      const slot = document.createElement('div');
      slot.className = 'card-slot foundation-slot';
      slot.id = `foundation-${f}`;
      slot.dataset.zone = 'foundation';
      slot.dataset.index = f;

      const pile = foundationPiles[f] || [];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        const cardEl = this._createCardElement(topCard, { zone: 'foundation', index: f });
        slot.appendChild(cardEl);
      } else {
        slot.innerHTML = `<span class="slot-watermark">${f < 4 ? ['♣', '♦', '♥', '♠'][f] : '★'}</span>`;
      }

      this._setupDropTarget(slot);
      this.foundationsEl.appendChild(slot);
    }
  }

  _renderFreecells() {
    this.freecellsEl.innerHTML = '';
    const freecells = this.currentGame.state.freecells;
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div');
      slot.className = 'card-slot freecell-slot';
      slot.id = `freecell-${i}`;
      slot.dataset.zone = 'freecell';
      slot.dataset.index = i;

      const card = freecells[i];
      if (card) {
        const cardEl = this._createCardElement(card, { zone: 'freecell', index: i });
        slot.appendChild(cardEl);
      } else {
        slot.innerHTML = `<span class="slot-watermark">⬚</span>`;
      }

      this._setupDropTarget(slot);
      this.freecellsEl.appendChild(slot);
    }
  }

  _renderStockAndWaste() {
    this.stockEl.innerHTML = '';
    const stock = this.currentGame.state.stock;
    if (stock.length > 0) {
      const topStock = stock[stock.length - 1];
      const cardEl = this._createCardElement(topStock, { zone: 'stock', index: 0 });
      this.stockEl.appendChild(cardEl);
      this.stockEl.classList.remove('empty');
    } else {
      this.stockEl.classList.add('empty');
      const waste = this.currentGame.state.waste;
      if (waste && waste.length > 0) {
        this.stockEl.innerHTML = `<div class="recycle-indicator" title="Recycle Waste">↻</div>`;
      } else {
        this.stockEl.innerHTML = '';
      }
    }

    this.stockEl.onclick = () => this.handleStockClick();

    this.wasteEl.innerHTML = '';
    const waste = this.currentGame.state.waste;
    if (waste.length > 0) {
      const topWaste = waste[waste.length - 1];
      const cardEl = this._createCardElement(topWaste, { zone: 'waste', index: waste.length - 1 });
      this.wasteEl.appendChild(cardEl);
    }
  }

  _renderSpiderStock() {
    this.stockEl.innerHTML = '';
    const stock = this.currentGame.state.stock;
    const dealsRemaining = Math.floor(stock.length / 10);
    if (dealsRemaining > 0) {
      this.stockEl.innerHTML = `
        <div class="card-back-container">${DeckRenderer.getCardBackSVG(this.cardBackTheme)}</div>
        <span class="stock-badge">${dealsRemaining}</span>
      `;
      this.stockEl.classList.remove('empty');
      this.stockEl.onclick = () => {
        if (this.currentGame.dealRow()) {
          this.sound.playCardFlip();
          this.render();
        }
      };
    } else {
      this.stockEl.classList.add('empty');
      this.stockEl.innerHTML = '';
    }
  }

  _renderTableau() {
    this.tableauEl.innerHTML = '';
    const columns = this.currentGame.state.tableau;

    columns.forEach((colCards, colIdx) => {
      const colEl = document.createElement('div');
      colEl.className = 'tableau-column';
      colEl.id = `tableau-col-${colIdx}`;
      colEl.dataset.zone = 'tableau';
      colEl.dataset.index = colIdx;

      // Dynamic vertical cascade: generous spacing for maximized cards, auto-compacting on deep stacks
      const count = colCards.length;
      let faceUpStep = 38;
      let faceDownStep = 18;
      if (count > 12) {
        faceUpStep = 22;
        faceDownStep = 11;
      } else if (count > 9) {
        faceUpStep = 28;
        faceDownStep = 14;
      } else if (count > 7) {
        faceUpStep = 33;
        faceDownStep = 16;
      }

      let topOffset = 0;
      colCards.forEach((card, cardIdx) => {
        const cardEl = this._createCardElement(card, {
          zone: 'tableau',
          index: colIdx,
          cardIndex: cardIdx
        });

        cardEl.style.top = `${topOffset}px`;
        colEl.appendChild(cardEl);
        topOffset += card.faceUp ? faceUpStep : faceDownStep;
      });

      this._setupDropTarget(colEl);
      this.tableauEl.appendChild(colEl);
    });
  }

  _createCardElement(card, sourceLocation) {
    const cardEl = document.createElement('div');
    cardEl.className = `solitaire-card ${card.faceUp ? 'face-up' : 'face-down'} ${card.isRed ? 'red' : 'black'}`;
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.zone = sourceLocation.zone;
    cardEl.dataset.colIndex = sourceLocation.index;
    if (sourceLocation.cardIndex !== undefined) {
      cardEl.dataset.cardIndex = sourceLocation.cardIndex;
    }

    if (card.faceUp) {
      cardEl.innerHTML = DeckRenderer.renderCardFaceSVG(card);
      const isCustomZone = ['dealer', 'player', 'bot_lily', 'bot_vic', 'poker', 'holdem', 'pyramid', 'tripeaks'].includes(sourceLocation.zone) || this.gameType === 'blackjack';
      if (!isCustomZone) {
        this._setupDraggable(cardEl, sourceLocation);
        cardEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleCardClick(sourceLocation);
        });
        cardEl.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          this.handleCardDoubleClick(sourceLocation);
        });
        cardEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleCardDoubleClick(sourceLocation);
        });
      }
    } else {
      cardEl.innerHTML = DeckRenderer.getCardBackSVG(this.cardBackTheme);
    }

    return cardEl;
  }

  handleStockClick() {
    if (this.gameType.startsWith('spider')) {
      if (this.currentGame.dealRow()) {
        this.sound.playCardFlip();
        this.render();
      }
      return;
    }
    if (!this.currentGame.drawOrRecycle) return;
    const drawn = this.currentGame.drawOrRecycle();
    if (drawn) {
      this.sound.playCardFlip();
      this.render();
    }
  }

  handleCardClick(source) {
    if (!this.currentGame.findSmartMove) return;
    const smartTarget = this.currentGame.findSmartMove(source);
    if (smartTarget) {
      const moved = this.currentGame.moveCards(source, smartTarget.target, smartTarget.count || 1);
      if (moved) {
        if (smartTarget.target.zone === 'foundation') {
          const f = this.currentGame.state.foundations[smartTarget.target.index];
          const topCard = f.length > 0 ? f[f.length - 1] : null;
          const rank = topCard ? topCard.rank : 0;
          this.sound.playFoundationSnap(rank);
          this._checkCelebrationTrigger(topCard, source, smartTarget.target);
        } else {
          this.sound.playCardSnap();
        }
        this.render();
      }
    }
  }

  handleCardDoubleClick(source) {
    const pile = this._getPileBySource(source);
    if (!pile || pile.length === 0) return;
    const card = pile[pile.length - 1];
    if (!card) return; // an empty free cell

    for (let f = 0; f < 4; f++) {
      const fPile = this.currentGame.state.foundations?.[f];
      if (!fPile) continue; // Spider has no foundation piles to double-click onto
      const topF = fPile.length > 0 ? fPile[fPile.length - 1] : null;
      if (card.canBuildOnFoundation(topF)) {
        if (this.currentGame.moveCards(source, { zone: 'foundation', index: f }, 1)) {
          this.sound.playFoundationSnap(card.rank);
          this._checkCelebrationTrigger(card, source, { zone: 'foundation', index: f });
          this.render();
          return;
        }
      }
    }
  }

  _getPileBySource(source) {
    if (source.zone === 'tableau') return this.currentGame.state.tableau[source.index];
    if (source.zone === 'waste') return this.currentGame.state.waste;
    if (source.zone === 'freecell') return [this.currentGame.state.freecells[source.index]];
    return null;
  }

  _setupDraggable(cardEl, source) {
    cardEl.draggable = true;

    cardEl.addEventListener('dragstart', (e) => {
      this.sound.playCardSlide();
      const colCards = this._getPileBySource(source);
      const cardIndex = source.cardIndex !== undefined ? source.cardIndex : colCards.length - 1;
      const count = colCards.length - cardIndex;

      this.draggedCardData = { source, count };
      e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedCardData));
      e.dataTransfer.effectAllowed = 'move';
      cardEl.classList.add('dragging');

      // Store current drag position for proximity detection
      this.currentDragPosition = { x: e.clientX, y: e.clientY };
    });

    cardEl.addEventListener('drag', (e) => {
      // Update drag position continuously (throttle for performance)
      if (e.clientX !== 0 && e.clientY !== 0) {
        this.currentDragPosition = { x: e.clientX, y: e.clientY };
      }
    });

    cardEl.addEventListener('dragend', (e) => {
      cardEl.classList.remove('dragging');

      // Proximity-based drop: find closest valid drop target if not directly over one
      if (this.draggedCardData && this.currentDragPosition) {
        const closestTarget = this._findClosestDropTarget(this.currentDragPosition);
        if (closestTarget) {
          // Trigger drop on the closest target
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            clientX: this.currentDragPosition.x,
            clientY: this.currentDragPosition.y
          });
          closestTarget.dispatchEvent(dropEvent);
        }
      }

      this.draggedCardData = null;
      this.currentDragPosition = null;

      // Remove any lingering drag-hover states
      document.querySelectorAll('.drag-hover').forEach(el => {
        el.classList.remove('drag-hover');
      });
    });
  }

  _setupDropTarget(targetEl) {
    targetEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      targetEl.classList.add('drag-hover');
    });

    targetEl.addEventListener('dragleave', () => {
      targetEl.classList.remove('drag-hover');
    });

    targetEl.addEventListener('drop', (e) => {
      e.preventDefault();
      targetEl.classList.remove('drag-hover');

      if (!this.draggedCardData) return;
      const { source, count } = this.draggedCardData;
      // Clear drag data immediately to prevent duplicate drop dispatch in dragend
      this.draggedCardData = null;
      this.currentDragPosition = null;

      const targetZone = targetEl.dataset.zone;
      const targetIndex = parseInt(targetEl.dataset.index, 10);

      const target = { zone: targetZone, index: targetIndex };
      const moved = this.currentGame.moveCards(source, target, count);
      if (moved) {
        if (targetZone === 'foundation') {
          const f = this.currentGame.state.foundations[targetIndex];
          const topCard = f.length > 0 ? f[f.length - 1] : null;
          const rank = topCard ? topCard.rank : 0;
          this.sound.playFoundationSnap(rank);
          this._checkCelebrationTrigger(topCard, source, target);
        } else {
          this.sound.playCardSnap();
        }
        this.render();
      }
    });
  }

  _findClosestDropTarget(dragPos) {
    // Find all valid drop targets
    const dropTargets = [
      ...document.querySelectorAll('.foundation-slot'),
      ...document.querySelectorAll('.freecell-slot'),
      ...document.querySelectorAll('.tableau-column')
    ];

    if (dropTargets.length === 0) return null;

    // Expanded hitbox: cards can be dropped if within this distance (pixels)
    const PROXIMITY_THRESHOLD = 120;

    let closestTarget = null;
    let closestDistance = Infinity;

    dropTargets.forEach(target => {
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from drag position to target center
      const dx = dragPos.x - centerX;
      const dy = dragPos.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only consider targets within proximity threshold
      if (distance < closestDistance && distance < PROXIMITY_THRESHOLD) {
        closestDistance = distance;
        closestTarget = target;
      }
    });

    return closestTarget;
  }

  undoMove() {
    if (this.autoCompleteInterval) {
      clearInterval(this.autoCompleteInterval);
      this.autoCompleteInterval = null;
    }
    if (this.autoSolveDebounceTimer) {
      clearTimeout(this.autoSolveDebounceTimer);
      this.autoSolveDebounceTimer = null;
    }
    this.isAutoCompleting = false;
    this.autoSolveUserPaused = false;
    this.autoSolveBanner?.classList.add('hidden');
    this.floatingAutoSolveBtn?.classList.add('hidden');

    if (this.currentGame.undo && this.currentGame.undo()) {
      this.sound.playUndo();
      this.render();
    }
  }

  // --------------------------------------------------------------------------
  // HINT ENGINE & DUAL-HIGHLIGHTING TOAST
  // --------------------------------------------------------------------------

  showHint() {
    this._clearHintHighlights();

    if (!this.currentGame || !this.currentGame.getTacticalHint) {
      this._displayHintMessage("No tactical hint available for this game mode.");
      return;
    }

    const hint = this.currentGame.getTacticalHint();
    if (!hint) {
      this._displayHintMessage("No obvious tactical moves found. Try drawing cards!");
      return;
    }

    this.sound.playFoundationSnap(5); // Helpful chime
    const message = hint.message || hint.reason || 'Tactical hint ready.';
    this._displayHintMessage(message);
    if (this.gameType === 'mahjong') this.mahjongView?.showHint(hint, { silent: true });
    if (this.gameType === 'sudoku') this.sudokuView?.showHint(hint, { silent: true });
    if (this.gameType === 'dominoes') this.dominoesView?.showHint(hint, { silent: true });

    if (this.coach) {
      if (this.celebrationAudio) {
        this.celebrationAudio.stopAll();
      }
      if (this.coach.voiceEnabled) {
        this.coach.speak(message, 0.95);
      }
      this.coach.showCoachToast(message, false);
    }

    if (hint.autoComplete) {
      this.runAutoComplete();
      return;
    }

    if (this.gameType.startsWith('poker') && hint.hold) {
      this.currentGame.state.held = [...hint.hold];
      this.render();
      return;
    }

    if (this.gameType === 'tripeaks' && hint.action === 'PLAY_TABLEAU') {
      const cardNodes = document.querySelectorAll('#tripeaks-board .tripeaks-card-wrapper');
      if (cardNodes[hint.index]) {
        cardNodes[hint.index].classList.add('hint-source-highlight');
      }
    } else if (this.gameType === 'tripeaks' && hint.action === 'DRAW_STOCK') {
      document.getElementById('tp-stock-pile')?.classList.add('hint-source-highlight');
    }

    if (this.gameType === 'pyramid') {
      if (hint.source && hint.source.zone === 'pyramid') {
        const pCards = document.querySelectorAll('#pyramid-board .pyramid-card-wrapper');
        if (pCards[hint.source.index]) pCards[hint.source.index].classList.add('hint-source-highlight');
      } else if (hint.source && hint.source.zone === 'waste') {
        document.getElementById('pyr-waste-pile')?.classList.add('hint-source-highlight');
      } else if (hint.source && hint.source.zone === 'stock') {
        document.getElementById('pyr-stock-pile')?.classList.add('hint-source-highlight');
      }

      if (hint.target && hint.target.zone === 'pyramid') {
        const pCards = document.querySelectorAll('#pyramid-board .pyramid-card-wrapper');
        if (pCards[hint.target.index]) pCards[hint.target.index].classList.add('hint-target-highlight');
      } else if (hint.target && hint.target.zone === 'waste') {
        document.getElementById('pyr-waste-pile')?.classList.add('hint-target-highlight');
      }
    }

    // Highlight Source Card for Klondike / FreeCell / Spider
    if (hint.source) {
      let srcEl = null;
      if (hint.source.zone === 'tableau') {
        const colEl = document.getElementById(`tableau-col-${hint.source.index}`);
        if (colEl) {
          const cIdx = hint.source.cardIndex !== undefined ? hint.source.cardIndex : colEl.children.length - 1;
          srcEl = colEl.children[cIdx] || colEl.lastElementChild;
        }
      } else if (hint.source.zone === 'waste') {
        srcEl = this.wasteEl.querySelector('.solitaire-card');
      } else if (hint.source.zone === 'freecell') {
        srcEl = document.getElementById(`freecell-${hint.source.index}`)?.querySelector('.solitaire-card');
      } else if (hint.source.zone === 'stock') {
        srcEl = this.stockEl;
      }

      if (srcEl) {
        srcEl.classList.add('hint-source-highlight');
      }
    }

    // Highlight Target Pile
    if (hint.target) {
      let tgtEl = null;
      if (hint.target.zone === 'tableau') {
        tgtEl = document.getElementById(`tableau-col-${hint.target.index}`);
      } else if (hint.target.zone === 'foundation') {
        tgtEl = document.getElementById(`foundation-${hint.target.index}`);
      } else if (hint.target.zone === 'freecell') {
        tgtEl = document.getElementById(`freecell-${hint.target.index}`);
      }

      if (tgtEl) {
        tgtEl.classList.add('hint-target-highlight');
      }
    }

    // Auto-clear highlights after 5 seconds
    const timeout = setTimeout(() => {
      this._clearHintHighlights();
    }, 5000);
    this.activeHintTimeouts.push(timeout);
  }


  _displayHintMessage(msg) {
    if (!this.hintBanner || !this.hintText) return;
    this.hintText.textContent = msg;
    this.hintBanner.classList.remove('hidden');
  }

  hideHint() {
    this._clearHintHighlights();
    if (this.coach) {
      this.coach.cancelSpeech();
    }
    if (this.hintBanner) {
      this.hintBanner.classList.add('hidden');
    }
  }

  _clearHintHighlights() {
    document.querySelectorAll('.hint-source-highlight').forEach(el => el.classList.remove('hint-source-highlight'));
    document.querySelectorAll('.hint-target-highlight').forEach(el => el.classList.remove('hint-target-highlight'));
    this.activeHintTimeouts.forEach(t => clearTimeout(t));
    this.activeHintTimeouts = [];
  }

  runAutoComplete() {
    if (!this.currentGame || !this.currentGame.getNextAutoCompleteStep) return;
    if (this.isAutoCompleting) return;

    this.isAutoCompleting = true;
    this.autoSolveUserPaused = false;

    if (this.autoSolveDebounceTimer) {
      clearTimeout(this.autoSolveDebounceTimer);
      this.autoSolveDebounceTimer = null;
    }

    // Update banner UI
    if (this.autoSolveBanner) {
      this.autoSolveBanner.classList.remove('hidden');
      const titleEl = document.getElementById('auto-solve-title');
      const subEl = document.getElementById('auto-solve-subtitle');
      const pIcon = document.getElementById('pause-solve-icon');
      const pText = document.getElementById('pause-solve-text');
      if (titleEl) titleEl.textContent = 'All Columns Completed!';
      if (subEl) subEl.textContent = 'Solving to foundations (Microsoft style)...';
      if (pIcon) pIcon.textContent = '⏸';
      if (pText) pText.textContent = 'Pause';
    }
    this.floatingAutoSolveBtn?.classList.add('hidden');

    if (this.autoCompleteInterval) clearInterval(this.autoCompleteInterval);

    this.autoCompleteInterval = setInterval(() => {
      if (!this.isAutoCompleting) {
        clearInterval(this.autoCompleteInterval);
        this.autoCompleteInterval = null;
        return;
      }

      const step = this.currentGame?.getNextAutoCompleteStep ? this.currentGame.getNextAutoCompleteStep() : null;
      if (!step || this.currentGame.state.won) {
        clearInterval(this.autoCompleteInterval);
        this.autoCompleteInterval = null;
        this.isAutoCompleting = false;
        this.autoSolveUserPaused = false;
        this.autoSolveBanner?.classList.add('hidden');
        this.floatingAutoSolveBtn?.classList.add('hidden');
        this.render();
        return;
      }

      this.currentGame.moveCards(step.source, step.target, step.count);
      if (step.target.zone === 'foundation') {
        const f = this.currentGame.state.foundations[step.target.index];
        const rank = f.length > 0 ? f[f.length - 1].rank : 0;
        this.sound.playFoundationSnap(rank);
      } else {
        this.sound.playCardSnap();
      }
      this.render();
    }, 70);
  }

  togglePauseAutoComplete() {
    if (this.isAutoCompleting) {
      if (this.autoCompleteInterval) {
        clearInterval(this.autoCompleteInterval);
        this.autoCompleteInterval = null;
      }
      this.isAutoCompleting = false;
      this.autoSolveUserPaused = true;
      if (this.autoSolveBanner) {
        const titleEl = document.getElementById('auto-solve-title');
        const subEl = document.getElementById('auto-solve-subtitle');
        const pIcon = document.getElementById('pause-solve-icon');
        const pText = document.getElementById('pause-solve-text');
        if (titleEl) titleEl.textContent = 'Auto-Solve Paused';
        if (subEl) subEl.textContent = 'Click Resume or Instant to complete the game.';
        if (pIcon) pIcon.textContent = '▶';
        if (pText) pText.textContent = 'Resume';
      }
      this.floatingAutoSolveBtn?.classList.remove('hidden');
    } else {
      this.autoSolveUserPaused = false;
      this.runAutoComplete();
    }
  }

  instantSolveToFoundation() {
    if (this.autoCompleteInterval) {
      clearInterval(this.autoCompleteInterval);
      this.autoCompleteInterval = null;
    }
    if (this.autoSolveDebounceTimer) {
      clearTimeout(this.autoSolveDebounceTimer);
      this.autoSolveDebounceTimer = null;
    }

    let iterations = 0;
    while (this.currentGame?.getNextAutoCompleteStep && iterations++ < 60) {
      const step = this.currentGame.getNextAutoCompleteStep();
      if (!step || this.currentGame.state.won) break;
      this.currentGame.moveCards(step.source, step.target, step.count);
    }

    this.isAutoCompleting = false;
    this.autoSolveUserPaused = false;
    this.sound.playFoundationSnap(12);
    this.autoSolveBanner?.classList.add('hidden');
    this.floatingAutoSolveBtn?.classList.add('hidden');
    this.render();
  }

  // --------------------------------------------------------------------------
  // GAME PERSISTENCE: ATOMIC SAVE & RESUME
  // --------------------------------------------------------------------------

  _autoSaveState() {
    if (!this.currentGame || this.gameType === 'blackjack') return;
    const snapshot = {
      gameType: this.gameType,
      state: this.gameType === 'word_tiles' ? this.currentGame.serialize() : this.currentGame.state,
      elapsedSeconds: this.elapsedSeconds
    };
    this.profiles.saveGame(this.gameType, snapshot);
    this._checkResumeAvailability();
  }

  saveCurrentGame() {
    if (!this.currentGame) return;
    const snapshot = {
      gameType: this.gameType,
      state: this.gameType === 'word_tiles' ? this.currentGame.serialize() : this.currentGame.state,
      elapsedSeconds: this.elapsedSeconds
    };
    const saved = this.profiles.saveGame(this.gameType, snapshot);
    if (saved) {
      this.sound.playCardSnap();
      this._displayHintMessage("💾 Game state saved successfully!");
      this._checkResumeAvailability();
    }
  }

  resumeSavedGame() {
    const saved = this.profiles.loadSavedGame(this.gameType);
    if (!saved || !saved.state) {
      alert("No saved game found for this mode.");
      return;
    }

    this._stopTimer();
    this.elapsedSeconds = saved.state.timeSeconds || saved.elapsedSeconds || 0;

    // Restore Game instance
    if (this.gameType.startsWith('klondike')) {
      this.currentGame = new KlondikeGame({ seed: saved.state.seed, drawCount: saved.state.drawCount || 1 });
      this._hydrateState(this.currentGame.state, saved.state);
    } else if (this.gameType === 'freecell') {
      this.currentGame = new FreeCellGame({ seed: saved.state.seed });
      this._hydrateState(this.currentGame.state, saved.state);
    } else if (this.gameType.startsWith('spider')) {
      this.currentGame = new SpiderGame({ seed: saved.state.seed, numSuits: saved.state.numSuits || 1 });
      this._hydrateState(this.currentGame.state, saved.state);
    } else if (this.gameType === 'word_tiles') {
      this.currentGame = new WordTilesGame({ seed: saved.state.seed, dictionary: this.wordDictionary });
      this.currentGame.deserialize(saved.state);
      this.wordTilesView?.setGame(this.currentGame);
    } else if (this.gameType === 'mahjong') {
      // Saves hold { gameType, state, elapsedSeconds } under saved.state.
      this.currentGame = MahjongGame.fromState(saved.state.state || saved.state);
      this.mahjongView?.setGame(this.currentGame);
      this.hasCelebratedWin = !!this.currentGame.state.won;
    } else if (this.gameType === 'sudoku') {
      this.currentGame = SudokuGame.fromState(saved.state.state || saved.state);
      this.sudokuView?.setGame(this.currentGame);
      this.hasCelebratedWin = !!this.currentGame.state.won;
    } else if (this.gameType === 'keystone_drop') {
      this.currentGame = KeystoneDropGame.fromState(saved.state.state || saved.state);
      this.keystoneDropView?.setGame(this.currentGame);
      this.hasCelebratedWin = !!this.currentGame.state.won;
    } else if (this.gameType === 'dominoes') {
      this.currentGame = DominoGame.fromState(saved.state.state || saved.state);
      this.dominoesView?.setGame(this.currentGame);
      this.hasCelebratedWin = !!this.currentGame.state.won;
    } else if (this.gameType === 'trash_conveyor') {
      this.currentGame = TrashConveyorGame.fromState(saved.state.state || saved.state);
      this.trashConveyorView?.setGame(this.currentGame);
    }

    this._startTimer();
    this.sound.playShuffle();
    this.render();
    this._displayHintMessage("📂 Saved game resumed successfully!");
  }

  _hydrateState(targetState, sourceState) {
    const hydrateCard = (c) => c ? new Card(c.id, c.faceUp) : null;

    if (sourceState.stock) targetState.stock = sourceState.stock.map(hydrateCard);
    if (sourceState.waste) targetState.waste = sourceState.waste.map(hydrateCard);
    if (sourceState.foundations) targetState.foundations = sourceState.foundations.map(f => f.map(hydrateCard));
    if (sourceState.tableau) targetState.tableau = sourceState.tableau.map(col => col.map(hydrateCard));
    if (sourceState.freecells) targetState.freecells = sourceState.freecells.map(hydrateCard);
    targetState.score = sourceState.score;
    targetState.moves = sourceState.moves;
    targetState.won = sourceState.won;
  }

  _checkResumeAvailability() {
    const hasSave = this.profiles.hasSavedGame(this.gameType);
    if (this.resumeBtn) {
      this.resumeBtn.classList.toggle('hidden', !hasSave || this.gameType === 'blackjack');
    }
  }

  // --------------------------------------------------------------------------
  // USER PROFILES & HALL OF FAME
  // --------------------------------------------------------------------------

  _updateProfileBar() {
    const active = this.profiles.getActiveProfile();
    if (!active) return;

    const avatarEl = document.getElementById('active-user-avatar');
    const nameEl = document.getElementById('active-user-name');
    const scoreEl = document.getElementById('active-user-score');

    if (avatarEl) avatarEl.textContent = active.avatar;
    if (nameEl) nameEl.textContent = active.name;
    if (scoreEl) scoreEl.textContent = `${active.allTimeScore.toLocaleString()} pts`;

    this._updateCasinoVaultDisplay();
  }

  _updateCasinoVaultDisplay() {
    const bankroll = this.profiles.getCasinoBankroll();
    const vaultValEl = document.getElementById('vault-bankroll-val');
    if (vaultValEl) {
      vaultValEl.textContent = `$${bankroll.toLocaleString()}`;
    }
    const modalBalEl = document.getElementById('vault-modal-balance');
    if (modalBalEl) {
      modalBalEl.textContent = `$${bankroll.toLocaleString()}`;
    }
  }

  _triggerVaultGain(amount) {
    this._updateCasinoVaultDisplay();
    const badge = document.getElementById('vault-gain-badge');
    if (!badge) return;
    badge.textContent = `+$${amount}`;
    badge.classList.remove('hidden');
    badge.classList.remove('gain-float-anim');
    void badge.offsetWidth; // Force CSS reflow to re-trigger animation
    badge.classList.add('gain-float-anim');
    setTimeout(() => {
      badge.classList.add('hidden');
      badge.classList.remove('gain-float-anim');
    }, 1800);
  }

  openCasinoVaultModal() {
    const modal = document.getElementById('casino-vault-modal');
    if (!modal) return;
    const balEl = document.getElementById('vault-modal-balance');
    if (balEl) balEl.textContent = `$${this.profiles.getCasinoBankroll().toLocaleString()}`;
    modal.classList.add('active');
  }

  openPokerPaytableModal() {
    const modal = document.getElementById('poker-paytable-modal');
    const titleEl = document.getElementById('poker-paytable-modal-title');
    const container = document.getElementById('poker-paytable-container');
    const notesEl = document.getElementById('poker-paytable-notes');
    if (!modal || !container) return;

    const game = this.currentGame;
    const variation = (game && game.variation) ? game.variation : 'deuces_wild';
    const paytable = (game && game.getPaytable) ? game.getPaytable() : (PAYTABLES[variation] || PAYTABLES.deuces_wild);

    const variationNames = {
      jacks_or_better: 'Jacks or Better (9/6 Full Pay)',
      deuces_wild: 'Deuces Wild (All Twos Wild)',
      joker_poker: 'Joker Poker (53-Card Deck with Wild Joker)'
    };

    if (titleEl) {
      titleEl.textContent = `📜 ${variationNames[variation] || 'Video Poker'} Paytable`;
    }

    let rowsHtml = '';
    paytable.forEach(row => {
      const b = row.base;
      const maxBonus = row.maxBetBonus || (b * 5);
      rowsHtml += `
        <tr>
          <td><strong>${row.name}</strong></td>
          <td>${b * 1}</td>
          <td>${b * 2}</td>
          <td>${b * 3}</td>
          <td>${b * 4}</td>
          <td class="pay-highlight">${maxBonus}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <table class="poker-paytable-table">
        <thead>
          <tr>
            <th>HAND</th>
            <th>1 COIN</th>
            <th>2 COINS</th>
            <th>3 COINS</th>
            <th>4 COINS</th>
            <th>5 COINS (MAX)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    if (notesEl) {
      if (variation === 'deuces_wild') {
        notesEl.innerHTML = `
          <strong>★ Deuces Wild Rules & Hand Rankings:</strong><br>
          • All four Twos (2♠, 2♥, 2♦, 2♣) are wild and substitute for any card or suit.<br>
          • <strong>Minimum Winning Hand:</strong> Three of a Kind (pays 1:1).<br>
          • <strong>Important:</strong> Two Pair and One Pair do <em>not</em> pay in Deuces Wild because 4 wild cards make pairs trivial to hit.<br>
          • <strong>Strategy Tip:</strong> Never discard a Deuce! If dealt Two Pair with zero deuces, hold the higher pair to target Three of a Kind or better.
        `;
      } else if (variation === 'joker_poker') {
        notesEl.innerHTML = `
          <strong>★ Joker Poker Rules & Hand Rankings:</strong><br>
          • <strong>Wild Joker:</strong> The 53rd card is the Wild Joker, which substitutes for <em>any</em> card to complete winning Straights, Flushes, Full Houses, Four of a Kind, and Five of a Kind.<br>
          • <strong>Minimum Winning Hand:</strong> Pair of Kings or Aces (Kings or Better pays 1:1).<br>
          • <strong>Important:</strong> Pairs of Queens, Jacks, or lower (even when paired with a Wild Joker) do <em>not</em> award credits. The Joker pairs with the highest card, but you need Kings or Aces to collect.<br>
          • <strong>Strategy Tip:</strong> Always hold the Wild Joker! If dealt a Joker with only low cards (Queens or lower), hold just the Joker and draw 4 fresh cards.<br>
          • <strong>Five of a Kind (200:1):</strong> Four of a kind plus the Wild Joker hits the 200:1 jackpot!
        `;
      } else {
        notesEl.innerHTML = `
          <strong>★ Jacks or Better Rules & Hand Rankings:</strong><br>
          • Standard 52-card deck with 9/6 full-pay casino odds.<br>
          • <strong>Minimum Winning Hand:</strong> Pair of Jacks, Queens, Kings, or Aces (Jacks or Better pays 1:1).<br>
          • Two Pair pays 2:1.
        `;
      }
    }

    modal.classList.add('active');
  }

  openLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    const tableContainer = document.getElementById('leaderboard-table-container');
    if (!modal || !tableContainer) return;

    const leaderboard = this.profiles.getLeaderboard('all_time');
    const activeId = this.profiles.activeUserId;

    let html = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>RANK</th>
            <th>PLAYER</th>
            <th>ALL-TIME SCORE</th>
            <th>VICTORIES</th>
            <th>WIN RATE</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
    `;

    leaderboard.forEach((player, idx) => {
      const isCurrent = player.id === activeId;
      const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : 'rank-n'));
      const winRate = player.totalGamesPlayed > 0 ? Math.round((player.totalGamesWon / player.totalGamesPlayed) * 100) : 0;

      html += `
        <tr class="leaderboard-row ${isCurrent ? 'active-user-row' : ''}">
          <td><span class="rank-badge ${rankClass}">${idx + 1}</span></td>
          <td>
            <div class="player-cell">
              <span class="user-avatar-tag">${player.avatar}</span>
              <span>${player.name}</span>
            </div>
          </td>
          <td><strong>${player.allTimeScore.toLocaleString()}</strong></td>
          <td>${player.totalGamesWon}</td>
          <td>${winRate}%</td>
          <td>
            ${isCurrent ? '<span style="color:var(--gold-primary); font-weight:700;">Active</span>' : 
              `<button class="btn btn-secondary btn-sm btn-switch-player" data-id="${player.id}">Switch</button>`}
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;

    // Attach switch player buttons
    tableContainer.querySelectorAll('.btn-switch-player').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.profiles.setActiveProfile(id);
        this._updateProfileBar();
        this.render();
        this.openLeaderboardModal(); // Refresh view
      });
    });

    modal.classList.add('active');
    document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  createNewProfile() {
    const nameInput = document.getElementById('input-new-username');
    const avatarSelect = document.getElementById('select-new-avatar');
    if (!nameInput) return;

    const name = nameInput.value.trim();
    const avatar = avatarSelect ? avatarSelect.value : '👑';
    if (!name) return;

    this.profiles.createProfile(name, avatar);
    nameInput.value = '';
    this._updateProfileBar();
    this.render();
    this.openLeaderboardModal();
  }

  openMusicModal(searchFilter = '') {
    const modal = document.getElementById('music-modal');
    if (!modal) return;

    const countEl = document.getElementById('playlist-track-count');
    const listEl = document.getElementById('modal-playlist-list');
    const searchInput = document.getElementById('input-search-music');
    if (searchInput && searchFilter === '' && searchInput.value) {
      searchFilter = searchInput.value;
    }

    const q = (searchFilter || '').trim().toLowerCase();
    const filteredTracks = q
      ? this.music.playlist.map((t, idx) => ({ track: t, originalIndex: idx })).filter(item => 
          item.track.name.toLowerCase().includes(q) || (item.track.filename && item.track.filename.toLowerCase().includes(q))
        )
      : this.music.playlist.map((t, idx) => ({ track: t, originalIndex: idx }));

    if (countEl) {
      countEl.textContent = q 
        ? `${filteredTracks.length} of ${this.music.playlist.length}`
        : this.music.playlist.length;
    }

    if (listEl) {
      listEl.innerHTML = '';
      if (this.music.playlist.length === 0) {
        listEl.innerHTML = `
          <div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.84rem;">
            No audio files loaded yet.<br>Drop your favorite music files into <strong>game play music/</strong> or select files above!
          </div>
        `;
      } else if (filteredTracks.length === 0) {
        listEl.innerHTML = `
          <div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.84rem;">
            No audio tracks match "${searchFilter}".<br>Try a different search query or clear the filter.
          </div>
        `;
      } else {
        filteredTracks.forEach(({ track, originalIndex }) => {
          const row = document.createElement('div');
          row.className = `playlist-track-row ${this.music.currentIndex === originalIndex ? 'active' : ''}`;
          row.innerHTML = `
            <span>${originalIndex + 1}. ${track.name}</span>
            <span style="font-size:0.7rem; color:#94a3b8;">${track.ext || 'AUDIO'}</span>
          `;
          row.onclick = () => {
            this.music.currentIndex = originalIndex;
            this.music.audio.src = track.url;
            this.music.play();
            this.openMusicModal(searchFilter);
          };
          listEl.appendChild(row);
        });
      }
    }

    modal.classList.add('active');
  }

  _triggerWinCelebration() {
    this._stopTimer();
    this.sound.playVictoryFanfare();

    // Cross-game non-casino victory reward
    const NON_CASINO_VICTORY_REWARDS = {
      klondike_1: 250,
      klondike_3: 500,
      freecell: 350,
      spider_1: 250,
      spider_2: 500,
      spider_4: 1000,
      tripeaks: 300,
      pyramid: 300,
      mahjong: 300,
      sudoku: 300,
      keystone_drop: 400,
      dominoes: 300
    };
    const winBonus = NON_CASINO_VICTORY_REWARDS[this.gameType] || 0;
    const winRewardRow = document.getElementById('win-casino-reward-row');
    const winRewardEl = document.getElementById('win-casino-reward-val');
    if (winBonus > 0) {
      this.profiles.addCasinoBankroll(winBonus);
      this._triggerVaultGain(winBonus);
      if (winRewardEl) winRewardEl.textContent = `+$${winBonus.toLocaleString()}`;
      if (winRewardRow) winRewardRow.classList.remove('hidden');
    } else {
      if (winRewardRow) winRewardRow.classList.add('hidden');
    }

    // Record stats under active profile
    this.profiles.recordGameResult(this.gameType, this.currentGame.state.score, true, this.elapsedSeconds, this.currentGame.state.moves);
    this._updateProfileBar();
    this.profiles.clearSavedGame(this.gameType);

    const winModal = document.getElementById('win-modal');
    if (winModal) {
      winModal.classList.add('active');
      document.getElementById('win-time').textContent = document.getElementById('timer-display').textContent;
      document.getElementById('win-moves').textContent = this.currentGame.state.moves;
      document.getElementById('win-score').textContent = this.currentGame.state.score;
    }

    this.launchCelebrationShow(this.celebrationMode);
  }

  launchCelebrationShow(mode = this.celebrationMode) {
    const renderCardFaceImg = (card) => {
      if (this.cachedFaceImages.has(card.id)) {
        return this.cachedFaceImages.get(card.id);
      }
      const svg = DeckRenderer.renderCardFaceSVG(card);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      this.cachedFaceImages.set(card.id, img);
      return img;
    };

    const foundations = (this.currentGame && this.currentGame.state && this.currentGame.state.foundations)
      ? this.currentGame.state.foundations
      : [];

    // Halt any active card celebrations, audio clips, or speech synthesis before victory show
    if (this.celebrationEffects) {
      this.celebrationEffects.stopAll();
    }
    if (this.celebrationAudio) {
      this.celebrationAudio.stopAll();
    }
    if (this.coach) {
      this.coach.cancelSpeech();
    }

    this.sound.playVictoryFanfare();
    this.victoryCascade.start(foundations, renderCardFaceImg, mode);
    this._displayHintMessage("🎆 Celebration Active! Enjoy the Fireworks & Golden Confetti show! (Click anywhere to dismiss)");

    // Trigger encouraging royal voice celebration
    if (this.celebrationAudio) {
      this.celebrationAudio.playAudio({
        voiceType: 'random_celebration',
        triggerId: 'game_won',
        force: true
      }).catch(() => {});
    }
  }

  _checkCelebrationTrigger(card, source, target) {
    if (!this.celebrationDetector || !card) return;
    // Suppress card celebration if game is won or victory show is in progress
    // to prevent two different celebration scripts running at the same time
    if (this.hasCelebratedWin || (this.currentGame && this.currentGame.state && this.currentGame.state.won)) {
      return;
    }
    const moveInfo = {
      card,
      fromPile: { type: source ? source.zone : 'tableau', index: source ? source.index : 0 },
      toPile: { type: target ? target.zone : 'foundation', index: target ? target.index : 0 },
      timestamp: Date.now()
    };
    const event = this.celebrationDetector.detectCelebration(moveInfo);
    if (event) {
      // If the detected event is win_game, let the victory cascade handle it exclusively
      if (event.type === 'win_game') {
        return;
      }
      this._playCelebrationEvent(event, card);
    }
  }

  async _playCelebrationEvent(event, card) {
    try {
      if (this.hasCelebratedWin || (this.currentGame && this.currentGame.state && this.currentGame.state.won)) {
        return;
      }
      // Stop coach speech so voices never speak concurrently
      if (this.coach) {
        this.coach.cancelSpeech();
      }
      if (this.celebrationMapper) {
        const template = await this.celebrationMapper.getEffectTemplate(event.effectTemplate);
        if (template && this.celebrationEffects) {
          const cardEl = document.querySelector(`.solitaire-card[data-card-id="${card.id}"]`) ||
                         document.querySelector(`.solitaire-card[data-rank="${card.rank}"][data-suit="${card.suit}"]`) ||
                         document.querySelector(`.solitaire-card:hover`);
          this.celebrationEffects.playEffect(template, cardEl);
        }
      }
      if (this.celebrationAudio) {
        await this.celebrationAudio.playAudio({
          voiceType: event.audioVoice,
          card,
          triggerId: event.type
        });
      }
    } catch (err) {
      console.warn('[Celebration] Event playback note:', err);
    }
  }

  applyTableTheme(themeName) {
    this.tableTheme = themeName;
    localStorage.setItem('solitaire_table_theme', themeName);
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${themeName}`);
  }

  applyCardBackTheme(themeName) {
    this.cardBackTheme = themeName;
    localStorage.setItem('solitaire_card_back', themeName);
    this.render();
  }

  openSolvableModal() {
    const modal = document.getElementById('solvable-modal');
    const catalog = HeuristicSolver.getVerifiedCatalog();
    const listEl = document.getElementById('solvable-deals-list');
    listEl.innerHTML = '';

    const catalogKeys = {
      klondike_1: 'klondike_draw1',
      klondike_3: 'klondike_draw3',
      freecell: 'freecell',
      spider_1: 'spider_1suit',
      spider_2: 'spider_2suit',
      spider_4: 'spider_4suit'
    };
    const deals = catalog[catalogKeys[this.gameType]] || [];
    if (deals.length === 0) {
      listEl.innerHTML = '<p class="modal-intro">No catalog deals for this game yet.</p>';
    }
    deals.forEach(deal => {
      const item = document.createElement('div');
      item.className = 'deal-catalog-item';
      item.innerHTML = `
        <div class="deal-info">
          <span class="deal-name">${deal.name}</span>
          <span class="deal-code">${deal.code}</span>
        </div>
        <div class="deal-meta">
          <span class="difficulty-tag diff-${deal.difficulty.toLowerCase()}">${deal.difficulty}</span>
          ${deal.verified ? '' : '<span class="difficulty-tag" title="Not checked by the solver">Unverified</span>'}
          <button class="btn btn-primary btn-sm">Play Deal</button>
        </div>
      `;
      item.querySelector('button').onclick = () => {
        const parsed = SplitMix64.parseDealCode(deal.code);
        modal.classList.remove('active');
        this.startNewGame(parsed.seed);
      };
      listEl.appendChild(item);
    });

    modal.classList.add('active');
    document.getElementById('btn-close-solvable')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  setCardScale(scale) {
    const s = parseFloat(scale) || 1.0;
    const baseW = 168;
    const baseH = 235;
    document.documentElement.style.setProperty('--card-width', `${Math.round(baseW * s)}px`);
    document.documentElement.style.setProperty('--card-height', `${Math.round(baseH * s)}px`);
    localStorage.setItem('solitaire_card_scale', s.toString());
  }

  openSettingsModal(forceTabId = null) {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.add('active');

    // Tab button switching
    const tabBtns = modal.querySelectorAll('.mod-studio-tabs-bar button[data-tab]');
    const tabPanels = modal.querySelectorAll('.mod-tab-panel');

    const switchTab = (tabId) => {
      this._activeSettingsTab = tabId;
      tabBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
      });
      tabPanels.forEach(p => {
        p.classList.toggle('hidden', p.id !== tabId);
      });
    };

    tabBtns.forEach(btn => {
      btn.onclick = () => switchTab(btn.dataset.tab);
    });

    if (forceTabId) {
      switchTab(forceTabId);
    } else if (this._activeSettingsTab) {
      switchTab(this._activeSettingsTab);
    }

    // --- TAB 1: BACKGROUNDS & FELTS ---
    const modBgContainer = document.getElementById('mod-background-options');
    if (modBgContainer) {
      modBgContainer.innerHTML = '';
      const bgs = this.modManager.mods.backgrounds || [];
      if (bgs.length === 0) {
        modBgContainer.innerHTML = '<p class="subtext" style="grid-column: 1 / -1; padding: 8px 0;">No mod backgrounds found in <code>mods/backgrounds/</code>. Drop 16:9 images into the folder or upload below!</p>';
      } else {
        bgs.forEach(bg => {
          const opt = document.createElement('div');
          const isAct = this.modManager.activeBackground === bg.url;
          opt.className = `theme-option-card ${isAct ? 'active' : ''}`;
          opt.innerHTML = `
            <div class="mod-preview-img-container">
              <img src="${bg.url}" alt="${bg.name}">
            </div>
            <span>${bg.name}</span>
          `;
          opt.onclick = () => {
            this.modManager.setBackground(bg.url, 'cover');
            this._refreshSettingsActiveStates();
          };
          modBgContainer.appendChild(opt);
        });
      }
    }

    const feltContainer = document.getElementById('table-felt-options');
    if (feltContainer) {
      feltContainer.innerHTML = '';
      const tableThemes = [
        { id: 'emerald', name: 'Royal Emerald Felt' },
        { id: 'sapphire', name: 'Midnight Sapphire' },
        { id: 'velvet', name: 'Cardinal Crimson' },
        { id: 'obsidian', name: 'Obsidian Modern' },
        { id: 'aurora', name: 'Cyber Aurora' }
      ];
      tableThemes.forEach(th => {
        const opt = document.createElement('div');
        const isAct = !this.modManager.activeBackground && this.tableTheme === th.id;
        opt.className = `felt-option-card felt-${th.id} ${isAct ? 'active' : ''}`;
        opt.innerHTML = `<span>${th.name}</span>`;
        opt.onclick = () => {
          this.modManager.setBackground(null);
          this.applyTableTheme(th.id);
          this._refreshSettingsActiveStates();
        };
        feltContainer.appendChild(opt);
      });
    }

    // Custom background file upload
    const bgUploader = document.getElementById('mod-upload-bg');
    if (bgUploader) {
      bgUploader.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          this.modManager.setBackground(evt.target.result, 'cover');
          this._refreshSettingsActiveStates();
        };
        reader.readAsDataURL(file);
      };
    }

    const clearBgBtn = document.getElementById('btn-clear-mod-bg');
    if (clearBgBtn) {
      clearBgBtn.onclick = () => {
        this.modManager.setBackground(null);
        this.applyTableTheme(this.tableTheme);
        this._refreshSettingsActiveStates();
      };
    }

    // --- TAB 2: CARD BACKS ---
    const modBacksContainer = document.getElementById('mod-card-backs-list');
    if (modBacksContainer) {
      modBacksContainer.innerHTML = '';
      const backs = this.modManager.mods.cardBacks || [];
      if (backs.length === 0) {
        modBacksContainer.innerHTML = '<p class="subtext" style="grid-column: 1 / -1; padding: 8px 0;">No mod card backs found in <code>mods/card_backs/</code>. Drop 5:7 images into the folder or upload below!</p>';
      } else {
        backs.forEach(b => {
          const opt = document.createElement('div');
          const isAct = this.modManager.activeCardBack === b.url;
          opt.className = `theme-option-card ${isAct ? 'active' : ''}`;
          opt.innerHTML = `
            <div class="card-preview">
              <img src="${b.url}" alt="${b.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
            </div>
            <span>${b.name}</span>
          `;
          opt.onclick = () => {
            this.modManager.setCardBack(b.url);
            this._refreshSettingsActiveStates();
          };
          modBacksContainer.appendChild(opt);
        });
      }
    }

    const backsContainer = document.getElementById('card-back-options');
    if (backsContainer) {
      backsContainer.innerHTML = '';
      Object.entries(CARD_BACK_THEMES).forEach(([key, val]) => {
        const opt = document.createElement('div');
        const isAct = !this.modManager.activeCardBack && this.cardBackTheme === val;
        opt.className = `theme-option-card ${isAct ? 'active' : ''}`;
        opt.innerHTML = `
          <div class="card-preview">${DeckRenderer.getCardBackSVG(val)}</div>
          <span>${key.replace(/_/g, ' ')}</span>
        `;
        opt.onclick = () => {
          this.modManager.setCardBack(null);
          this.applyCardBackTheme(val);
          this._refreshSettingsActiveStates();
        };
        backsContainer.appendChild(opt);
      });
    }

    // Custom card back upload
    const backUploader = document.getElementById('mod-upload-card-back');
    if (backUploader) {
      backUploader.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          this.modManager.setCardBack(evt.target.result);
          this._refreshSettingsActiveStates();
        };
        reader.readAsDataURL(file);
      };
    }

    const clearBackBtn = document.getElementById('btn-clear-mod-card-back');
    if (clearBackBtn) {
      clearBackBtn.onclick = () => {
        this.modManager.setCardBack(null);
        this.applyCardBackTheme(this.cardBackTheme);
        this._refreshSettingsActiveStates();
      };
    }

    // --- TAB 3: CARD FACES & SPRITES ---
    // Use dynamically loaded deck collections from ModManager
    const deckCollections = this.modManager.deckCollections || [];

    const deckThemesContainer = document.getElementById('mod-deck-themes-list');
    if (deckThemesContainer) {
      deckThemesContainer.innerHTML = '';

      if (deckCollections.length === 0) {
        deckThemesContainer.innerHTML = '<p class="subtext" style="grid-column: 1 / -1; padding: 20px; text-align: center;">⚠️ No deck collections found. Make sure server is running and decks are in /decks/ folder.</p>';
      }

      deckCollections.forEach(col => {
        const isAct = this.modManager.activeDeckTheme === col.id;
        const opt = document.createElement('div');
        opt.className = `theme-option-card ${isAct ? 'active' : ''}`;
        opt.id = `deck-theme-${col.id}`;
        opt.title = `Click to ${isAct ? 'deactivate' : 'activate'} ${col.name} Collection (${col.cardCount || 54} cards)`;
        opt.innerHTML = `
          <div class="card-preview" style="position: relative;">
            <img src="${col.sample}" alt="${col.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;display:block;"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div style="display:none;width:100%;height:100%;background:#2a2a2a;border-radius:6px;align-items:center;justify-content:center;color:#888;">
              <span style="font-size:2rem;">${col.icon || '🎴'}</span>
            </div>
            ${isAct ? '<span class="deck-active-pill" style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);">ACTIVE</span>' : ''}
          </div>
          <span style="font-size:0.78rem; line-height:1.2; font-weight:600;">${col.icon || '🎴'} ${col.name}</span>
        `;
        opt.onclick = () => {
          if (this.modManager.activeDeckTheme === col.id) {
            this.modManager.setDeckTheme(null);
          } else {
            this.modManager.setDeckTheme(col.id);
          }
          this._refreshSettingsActiveStates();
        };
        deckThemesContainer.appendChild(opt);
      });
    }

    const modFacesContainer = document.getElementById('mod-card-faces-list');
    if (modFacesContainer) {
      modFacesContainer.innerHTML = '';
      const faces = this.modManager.mods.cardFaces || [];
      if (faces.length === 0) {
        modFacesContainer.innerHTML = '<p class="subtext" style="grid-column: 1 / -1; padding: 8px 0;">No mod faces found in <code>mods/card_faces/</code>. Drop card artwork named <code>AS.png</code>, <code>JOKER.png</code>, etc. into the folder or upload below!</p>';
      } else {
        faces.forEach(f => {
          const opt = document.createElement('div');
          const isAct = this.modManager.cardFaceOverrides[f.id.toUpperCase()] === f.url;
          opt.className = `theme-option-card ${isAct ? 'active' : ''}`;
          opt.innerHTML = `
            <div class="card-preview">
              <img src="${f.url}" alt="${f.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
            </div>
            <span>${f.name}</span>
          `;
          opt.onclick = () => {
            this.modManager.setCardFaceOverride(f.id, f.url);
            this._refreshSettingsActiveStates();
          };
          modFacesContainer.appendChild(opt);
        });
      }
    }

    // Custom card face upload
    const faceUploader = document.getElementById('mod-upload-card-face');
    if (faceUploader) {
      faceUploader.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const targetCard = document.getElementById('mod-face-card-select')?.value || 'JOKER';
        const reader = new FileReader();
        reader.onload = (evt) => {
          this.modManager.setCardFaceOverride(targetCard, evt.target.result);
          this._refreshSettingsActiveStates();
        };
        reader.readAsDataURL(file);
      };
    }

    const clearFacesBtn = document.getElementById('btn-clear-mod-faces');
    if (clearFacesBtn) {
      clearFacesBtn.onclick = () => {
        this.modManager.clearCardFaceOverrides();
        this._refreshSettingsActiveStates();
      };
    }

    // --- TAB 4: CASINO CHIPS ---
    const modChipsContainer = document.getElementById('mod-chips-list');
    if (modChipsContainer) {
      modChipsContainer.innerHTML = '';
      const chips = this.modManager.mods.chips || [];
      if (chips.length === 0) {
        modChipsContainer.innerHTML = '<p class="subtext" style="grid-column: 1 / -1; padding: 8px 0;">No mod chips found in <code>mods/chips/</code>. Drop 1:1 circular chips into the folder or upload below!</p>';
      } else {
        chips.forEach(c => {
          const opt = document.createElement('div');
          const isAct = this.modManager.activeChipStyle === c.url;
          opt.className = `theme-option-card ${isAct ? 'active' : ''}`;
          opt.innerHTML = `
            <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;">
              <img src="${c.url}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <span>${c.name}</span>
          `;
          opt.onclick = () => {
            this.modManager.setChipStyle(c.url);
            this._refreshSettingsActiveStates();
          };
          modChipsContainer.appendChild(opt);
        });
      }
    }

    // Custom chip upload
    const chipUploader = document.getElementById('mod-upload-chip');
    if (chipUploader) {
      chipUploader.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          this.modManager.setChipStyle(evt.target.result);
          this._refreshSettingsActiveStates();
        };
        reader.readAsDataURL(file);
      };
    }

    const clearChipsBtn = document.getElementById('btn-clear-mod-chips');
    if (clearChipsBtn) {
      clearChipsBtn.onclick = () => {
        this.modManager.setChipStyle(null);
        this._refreshSettingsActiveStates();
      };
    }

    // Reset All Mods
    const resetAllBtn = document.getElementById('btn-reset-all-mods');
    if (resetAllBtn) {
      resetAllBtn.onclick = () => {
        this.modManager.resetAllMods();
        this.applyTableTheme('emerald');
        this.applyCardBackTheme(CARD_BACK_THEMES.ROYAL_GUILLOCHE);
        this._refreshSettingsActiveStates();
      };
    }

    // In-game Card Display Scale (Zoom)
    const cardScaleSelect = document.getElementById('select-card-scale');
    if (cardScaleSelect) {
      const savedScale = localStorage.getItem('solitaire_card_scale') || '1.0';
      cardScaleSelect.value = savedScale;
      cardScaleSelect.onchange = (e) => {
        this.setCardScale(e.target.value);
      };
    }

    // --- TAB: CELEBRATIONS & ROYAL VOICES ---
    const enableCelebCheck = document.getElementById('setting-enable-celebrations');
    const enablePartCheck = document.getElementById('setting-enable-particles');
    const intensitySelect = document.getElementById('setting-animation-intensity');
    const enableVoiceCheck = document.getElementById('setting-enable-voice');
    const voiceVolumeSlider = document.getElementById('setting-voice-volume');
    const voiceVolumeLabel = document.getElementById('label-voice-volume');
    const voiceKingCheck = document.getElementById('setting-voice-king');
    const voiceQueenCheck = document.getElementById('setting-voice-queen');
    const voiceJackCheck = document.getElementById('setting-voice-jack');

    if (enableCelebCheck) {
      enableCelebCheck.checked = this.celebrationEffects.celebrationsEnabled !== false;
      enableCelebCheck.onchange = () => {
        this.celebrationEffects.setEnabled(enableCelebCheck.checked);
        localStorage.setItem('solitaire_celebration_enabled', enableCelebCheck.checked ? 'true' : 'false');
      };
    }
    if (enablePartCheck) {
      enablePartCheck.checked = this.celebrationEffects.particlesEnabled !== false;
      enablePartCheck.onchange = () => {
        this.celebrationEffects.setParticlesEnabled(enablePartCheck.checked);
        localStorage.setItem('solitaire_celebration_particles', enablePartCheck.checked ? 'true' : 'false');
      };
    }
    const enableLivingCheck = document.getElementById('setting-enable-living-cards');
    if (enableLivingCheck) {
      enableLivingCheck.checked = this.modManager.livingCardsEnabled !== false;
      enableLivingCheck.onchange = () => {
        this.modManager.setLivingCardsEnabled(enableLivingCheck.checked);
      };
    }
    if (intensitySelect) {
      intensitySelect.value = this.celebrationEffects.intensity || 'medium';
      intensitySelect.onchange = () => {
        this.celebrationEffects.setIntensity(intensitySelect.value);
        localStorage.setItem('solitaire_celebration_intensity', intensitySelect.value);
      };
    }
    if (enableVoiceCheck) {
      enableVoiceCheck.checked = this.celebrationAudio.audioEnabled !== false;
      enableVoiceCheck.onchange = () => {
        this.celebrationAudio.setEnabled(enableVoiceCheck.checked);
        localStorage.setItem('solitaire_celebration_voice_enabled', enableVoiceCheck.checked ? 'true' : 'false');
      };
    }
    if (voiceVolumeSlider) {
      voiceVolumeSlider.value = Math.round(this.celebrationAudio.masterVolume * 100);
      if (voiceVolumeLabel) voiceVolumeLabel.textContent = `${voiceVolumeSlider.value}%`;
      voiceVolumeSlider.oninput = () => {
        const val = parseInt(voiceVolumeSlider.value, 10);
        if (voiceVolumeLabel) voiceVolumeLabel.textContent = `${val}%`;
        this.celebrationAudio.setVolume(val / 100);
        localStorage.setItem('solitaire_celebration_volume', String(val));
      };
    }
    if (voiceKingCheck) {
      voiceKingCheck.checked = this.celebrationAudio.enabledVoices.king !== false;
      voiceKingCheck.onchange = () => {
        this.celebrationAudio.setVoiceEnabled('king', voiceKingCheck.checked);
        localStorage.setItem('solitaire_voice_king', voiceKingCheck.checked ? 'true' : 'false');
      };
    }
    if (voiceQueenCheck) {
      voiceQueenCheck.checked = this.celebrationAudio.enabledVoices.queen !== false;
      voiceQueenCheck.onchange = () => {
        this.celebrationAudio.setVoiceEnabled('queen', voiceQueenCheck.checked);
        localStorage.setItem('solitaire_voice_queen', voiceQueenCheck.checked ? 'true' : 'false');
      };
    }
    if (voiceJackCheck) {
      voiceJackCheck.checked = this.celebrationAudio.enabledVoices.jack !== false;
      voiceJackCheck.onchange = () => {
        this.celebrationAudio.setVoiceEnabled('jack', voiceJackCheck.checked);
        localStorage.setItem('solitaire_voice_jack', voiceJackCheck.checked ? 'true' : 'false');
      };
    }

    // Audition preview buttons
    const btnKing = document.getElementById('btn-test-voice-king');
    if (btnKing && !btnKing._boundAudition) {
      btnKing._boundAudition = true;
      btnKing.addEventListener('click', () => this.celebrationAudio.testVoice('king'));
    }
    const btnQueen = document.getElementById('btn-test-voice-queen');
    if (btnQueen && !btnQueen._boundAudition) {
      btnQueen._boundAudition = true;
      btnQueen.addEventListener('click', () => this.celebrationAudio.testVoice('queen'));
    }
    const btnJack = document.getElementById('btn-test-voice-jack');
    if (btnJack && !btnJack._boundAudition) {
      btnJack._boundAudition = true;
      btnJack.addEventListener('click', () => this.celebrationAudio.testVoice('jack'));
    }

    // Coach Voice Toggle
    const enableCoachVoiceCheck = document.getElementById('setting-enable-coach-voice');
    if (enableCoachVoiceCheck) {
      enableCoachVoiceCheck.checked = this.coach.voiceEnabled !== false;
      enableCoachVoiceCheck.onchange = () => {
        this.coach.voiceEnabled = enableCoachVoiceCheck.checked;
        localStorage.setItem('solitaire_coach_voice', enableCoachVoiceCheck.checked ? 'true' : 'false');
      };
    }
    const btnCoachVoice = document.getElementById('btn-test-coach-voice');
    if (btnCoachVoice && !btnCoachVoice._boundAudition) {
      btnCoachVoice._boundAudition = true;
      btnCoachVoice.addEventListener('click', () => {
        if (!this.coach.voiceEnabled) {
          this.coach.voiceEnabled = true;
          if (enableCoachVoiceCheck) enableCoachVoiceCheck.checked = true;
          localStorage.setItem('solitaire_coach_voice', 'true');
        }
        this.coach.speak("PeerRacer Arcade pedagogical coach speech synthesis is online and working perfectly!");
      });
    }

    // --- TAB: WORD GAME THEMES ---
    const wtThemesContainer = document.getElementById('wt-theme-options-grid');
    if (wtThemesContainer) {
      wtThemesContainer.innerHTML = '';
      const activeThemeId = WordTileThemeManager.getActiveThemeId();

      WORD_TILE_THEMES.forEach(th => {
        const isAct = activeThemeId === th.id;
        const card = document.createElement('div');
        card.className = `wt-theme-card ${isAct ? 'active' : ''}`;
        card.title = `Activate ${th.name}`;

        card.innerHTML = `
          <div class="wt-theme-preview-box" style="background-image: url('${th.thumbnail}');">
            <div class="wt-theme-sample-tile" style="background: ${th.cssVars['--wt-tile-bg']}; color: ${th.cssVars['--wt-tile-color']}; border: ${th.cssVars['--wt-tile-border']}; box-shadow: ${th.cssVars['--wt-tile-shadow']};">
              <span>W</span>
              <span class="wt-theme-sample-score" style="color: ${th.cssVars['--wt-tile-score-color']};">4</span>
            </div>
            <div class="wt-theme-palette-row">
              <span class="wt-theme-mini-badge" style="background: ${th.cssVars['--wt-3w-bg']}; color: ${th.cssVars['--wt-3w-color']};">3W</span>
              <span class="wt-theme-mini-badge" style="background: ${th.cssVars['--wt-2w-bg']}; color: ${th.cssVars['--wt-2w-color']};">2W</span>
              <span class="wt-theme-mini-badge" style="background: ${th.cssVars['--wt-3l-bg']}; color: ${th.cssVars['--wt-3l-color']};">3L</span>
              <span class="wt-theme-mini-badge" style="background: ${th.cssVars['--wt-2l-bg']}; color: ${th.cssVars['--wt-2l-color']};">2L</span>
              <span class="wt-theme-mini-badge" style="background: ${th.cssVars['--wt-center-bg']}; color: ${th.cssVars['--wt-center-color']};">★</span>
            </div>
            ${isAct ? '<span class="deck-active-pill" style="position:absolute;top:6px;right:6px;margin:0;">ACTIVE</span>' : ''}
          </div>
          <div class="wt-theme-info">
            <span class="wt-theme-title">${th.name}</span>
            <span class="wt-theme-sub">${th.subtitle}</span>
          </div>
        `;

        card.onclick = () => {
          WordTileThemeManager.applyTheme(th.id);
          this._refreshSettingsActiveStates();
        };

        wtThemesContainer.appendChild(card);
      });
    }

    // Custom Word Tiles board background uploader
    const wtBoardUploader = document.getElementById('wt-upload-custom-board');
    if (wtBoardUploader) {
      wtBoardUploader.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const root = document.documentElement;
          root.style.setProperty('--wt-board-bg-image', `url("${evt.target.result}")`);
          localStorage.setItem('solitaire_wt_custom_board', evt.target.result);
          this._refreshSettingsActiveStates();
        };
        reader.readAsDataURL(file);
      };
    }

    // Reset button
    const btnResetWtTheme = document.getElementById('btn-reset-wt-theme');
    if (btnResetWtTheme) {
      btnResetWtTheme.onclick = () => {
        localStorage.removeItem('solitaire_wt_custom_board');
        WordTileThemeManager.applyTheme('victorian_christmas');
        this._refreshSettingsActiveStates();
      };
    }

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  _refreshSettingsActiveStates() {
    this._syncDeckSelectorDropdown();
    // Re-render settings modal options to show updated selection outlines without jumping tabs
    const modal = document.getElementById('settings-modal');
    if (modal && modal.classList.contains('active')) {
      this.openSettingsModal(this._activeSettingsTab);
    }
  }

  _syncDeckSelectorDropdown() {
    const deckSelect = document.getElementById('select-deck-collection');
    if (!deckSelect) return;

    const deckIcons = {
      classic_standard: '♠️',
      royal_cats: '🐱',
      cartoon_animals: '🦊',
      anime_fantasy: '⚔️',
      art_nouveau: '🌿',
      victorian_christmas: '🎄',
      art_deco_elegance: '✨',
      steampunk_clockwork: '⚙️',
      wild_west_frontier: '🤠',
      botanical_garden: '🌺',
      gothic_cathedral: '⛪',
      cyberpunk_neon: '🌃',
      minimalist_zen: '🎋',
      cosmic_constellation: '🌌',
      retro_synthwave: '🌆'
    };

    // Populate dropdown with available decks (only do this once)
    if (!deckSelect.dataset.populated && this.modManager.deckCollections.length > 0) {
      deckSelect.innerHTML = '';
      const optDefault = document.createElement('option');
      optDefault.value = '';
      optDefault.textContent = '🎴 Vector Clean-Room (SVG)';
      deckSelect.appendChild(optDefault);

      // Add all loaded deck collections (excluding backup directories)
      this.modManager.deckCollections
        .filter(d => !d.id.includes('backup'))
        .forEach(deck => {
          const opt = document.createElement('option');
          opt.value = deck.id;
          const icon = deck.icon || deckIcons[deck.id] || '🎴';
          opt.textContent = `${icon} ${deck.name}`;
          deckSelect.appendChild(opt);
        });

      deckSelect.dataset.populated = 'true';
    }

    // Set current selection
    deckSelect.value = this.modManager.activeDeckTheme || '';
  }

  /* =========================================================================
   * P2P 5-PLAYER SAME-SEED TIME CHALLENGE ARENA METHODS (LEFT DOCK)
   * ========================================================================= */

  _initP2PArena() {
    const dock = document.getElementById('p2p-challenge-dock');
    const toggleBtn = document.getElementById('btn-toggle-p2p-dock');
    const toggleIcon = document.getElementById('dock-toggle-icon');
    const toggleLabel = dock?.querySelector('.dock-toggle-label');

    const updateDockUI = () => {
      const isCollapsed = dock?.classList.contains('collapsed');
      if (toggleIcon) toggleIcon.textContent = isCollapsed ? '▶' : '◀';
      if (toggleLabel) toggleLabel.textContent = isCollapsed ? '⚔️ PVP ARENA' : '⚔️ PVP TIME ARENA';
    };

    // Toggle Collapse / Expand left dock
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dock?.classList.toggle('collapsed');
      updateDockUI();
    });

    // Also uncollapse dock if top header P2P duel button is clicked
    document.getElementById('btn-p2p-duel')?.addEventListener('click', (e) => {
      if (this.gameType === 'word_tiles' || this.gameType === 'tank_minefield') return;
      e.stopPropagation();
      dock?.classList.remove('collapsed');
      updateDockUI();
    });

    // Close button inside header
    document.getElementById('btn-dock-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dock?.classList.add('collapsed');
      updateDockUI();
    });

    // Click outside to collapse dock over playable area (capture phase guarantees event fires before stopPropagation)
    document.addEventListener('pointerdown', (e) => {
      if (!dock || dock.classList.contains('collapsed')) return;
      if (!dock.contains(e.target) && !document.getElementById('btn-p2p-duel')?.contains(e.target)) {
        dock.classList.add('collapsed');
        updateDockUI();
      }
    }, true);

    // Quick 5-Player Race
    document.getElementById('btn-dock-quick-race')?.addEventListener('click', () => {
      this.startQuick5PlayerRace();
    });

    // Create New Challenge
    document.getElementById('btn-dock-create-challenge')?.addEventListener('click', () => {
      this.createP2PTimeChallenge();
    });

    // Direct Match Code Join
    const handleJoinCode = () => {
      const input = document.getElementById('input-dock-match-code');
      if (!input || !input.value.trim()) {
        this._displayHintMessage("⚠️ Please enter a valid Match Code.");
        return;
      }
      this.joinP2PTimeChallenge(input.value.trim());
      input.value = '';
    };

    document.getElementById('btn-dock-join-code')?.addEventListener('click', handleJoinCode);
    document.getElementById('input-dock-match-code')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleJoinCode();
    });

    // Refresh challenges list
    document.getElementById('btn-refresh-challenges')?.addEventListener('click', () => {
      this.p2pDuel.queryNetworkChallenges();
      this._renderAvailableChallenges(this.p2pDuel.getAvailableChallenges());
      this.sound.playCardSnap();
      this._displayHintMessage("🌐 Scanned P2P network for hosted duels.");
    });

    // Listen for storage events so other tabs hosting duels appear immediately!
    window.addEventListener('storage', (e) => {
      if (e.key === 'solitaire_p2p_hosted_duels_v2') {
        this._renderAvailableChallenges(this.p2pDuel.getAvailableChallenges());
      }
    });

    // Periodic network query every 4 seconds to discover newly hosted duels in real time
    setInterval(() => {
      if (!this.p2pDuel.activeDuel || this.p2pDuel.activeDuel.status !== 'RACING') {
        this.p2pDuel.queryNetworkChallenges();
      }
    }, 4000);

    // Race controls: Share Code & Leave
    document.getElementById('btn-race-share-code')?.addEventListener('click', () => {
      if (!this.p2pDuel.activeDuel) return;
      const code = this.p2pDuel.encodeMatchCode();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          this._displayHintMessage("📋 Match code copied to clipboard! Share it with up to 4 friends.");
        }).catch(() => {
          prompt("Copy this Match Code:", code);
        });
      } else {
        prompt("Copy this Match Code:", code);
      }
    });

    // Host Early Start Button
    document.getElementById('btn-race-start-now')?.addEventListener('click', () => {
      if (this.p2pDuel.activeDuel && this.p2pDuel.activeDuel.status === 'WAITING') {
        this.p2pDuel.startDuelRace('HOST_START_NOW');
        this.sound.playCardSnap();
        this._displayHintMessage("⚡ Race started! Challenger slots filled and duel timer running!");
      }
    });

    document.getElementById('btn-race-leave')?.addEventListener('click', () => {
      this.leaveP2PTimeChallenge();
    });

    // Podium Modal controls
    document.getElementById('btn-close-podium')?.addEventListener('click', () => {
      document.getElementById('p2p-podium-modal')?.classList.remove('active');
    });

    document.getElementById('btn-podium-rematch')?.addEventListener('click', () => {
      document.getElementById('p2p-podium-modal')?.classList.remove('active');
      if (this.p2pDuel.activeDuel) {
        const seed = this.p2pDuel.activeDuel.seed;
        const gameType = this.p2pDuel.activeDuel.gameType;
        this.startQuick5PlayerRace(gameType, seed);
      }
    });

    document.getElementById('btn-podium-new-race')?.addEventListener('click', () => {
      document.getElementById('p2p-podium-modal')?.classList.remove('active');
      this.startQuick5PlayerRace();
    });

    // Initial render of available challenges
    this.p2pDuel.queryNetworkChallenges();
    this._renderAvailableChallenges(this.p2pDuel.getAvailableChallenges());
  }

  _showP2PInviteToast(challenge) {
    if (!challenge) return;
    const toast = document.getElementById('p2p-invite-toast');
    const desc = document.getElementById('invite-toast-desc');
    const joinBtn = document.getElementById('btn-invite-join');
    const dismissBtn = document.getElementById('btn-invite-dismiss');

    if (desc) {
      desc.textContent = `${challenge.hostName} hosted a ${challenge.gameType.toUpperCase()} challenge!`;
    }

    if (joinBtn) {
      joinBtn.onclick = () => {
        this._hideP2PInviteToast();
        if (challenge.matchCode) {
          this.joinP2PTimeChallenge(challenge.matchCode);
        } else {
          this.joinP2PTimeChallenge(challenge);
        }
      };
    }

    if (dismissBtn) {
      dismissBtn.onclick = () => this._hideP2PInviteToast();
    }

    toast?.classList.remove('hidden');
    this.sound.playCardSnap();

    if (this._inviteToastTimeout) clearTimeout(this._inviteToastTimeout);
    this._inviteToastTimeout = setTimeout(() => {
      this._hideP2PInviteToast();
    }, 15000);
  }

  _hideP2PInviteToast() {
    const toast = document.getElementById('p2p-invite-toast');
    toast?.classList.add('hidden');
    if (this._inviteToastTimeout) {
      clearTimeout(this._inviteToastTimeout);
      this._inviteToastTimeout = null;
    }
  }

  startQuick5PlayerRace(chosenGameType = null, chosenSeed = null) {
    const isCasino = this.gameType.startsWith('blackjack') || this.gameType.startsWith('poker');
    const targetMode = chosenGameType || (isCasino ? 'klondike_1' : this.gameType);

    const challenge = this.p2pDuel.startWithChallengers(targetMode, chosenSeed);
    this.gameType = challenge.gameType;

    const modeSelect = document.getElementById('select-game-mode');
    if (modeSelect) modeSelect.value = this.gameType;

    this.startNewGame(challenge.seed);
    this._switchToRaceDock(true, challenge.status);

    const roomIdEl = document.getElementById('race-room-id');
    const gameTagEl = document.getElementById('race-game-tag');
    if (roomIdEl) roomIdEl.textContent = challenge.duelId;
    if (gameTagEl) gameTagEl.textContent = challenge.gameType.toUpperCase();

    this._startRaceTimer(challenge);
    this._displayHintMessage(`⚡ 5-Player Time Challenge Started! First player to clear cards takes 1st place!`);
    this._renderP2PRacers(this.p2pDuel.getRankedLeaderboard());
  }

  createP2PTimeChallenge() {
    const isCasino = this.gameType.startsWith('blackjack') || this.gameType.startsWith('poker');
    const targetMode = isCasino ? 'klondike_1' : this.gameType;
    const seed = SplitMix64.newSeed();

    const challenge = this.p2pDuel.createTimeChallenge(targetMode, seed);
    this.gameType = challenge.gameType;

    const modeSelect = document.getElementById('select-game-mode');
    if (modeSelect) modeSelect.value = this.gameType;

    this.startNewGame(challenge.seed);
    this._switchToRaceDock(true, challenge.status);

    const roomIdEl = document.getElementById('race-room-id');
    const gameTagEl = document.getElementById('race-game-tag');
    if (roomIdEl) roomIdEl.textContent = challenge.duelId;
    if (gameTagEl) gameTagEl.textContent = challenge.gameType.toUpperCase();

    this._startRaceTimer(challenge);
    this._displayHintMessage(`👑 Created 5-Player Challenge ${challenge.duelId}! Waiting for players (starts when 5 join or in 5 min).`);
    this._renderP2PRacers(this.p2pDuel.getRankedLeaderboard());
  }

  joinP2PTimeChallenge(codeOrDuel) {
    try {
      let duel;
      if (typeof codeOrDuel === 'string') {
        duel = this.p2pDuel.joinDuel(codeOrDuel);
      } else if (codeOrDuel && codeOrDuel.duelId) {
        if (codeOrDuel.matchCode) {
          duel = this.p2pDuel.joinDuel(codeOrDuel.matchCode);
        } else {
          duel = this.p2pDuel.startWithChallengers(codeOrDuel.gameType, codeOrDuel.seed);
        }
      }

      if (!duel) throw new Error("Could not join duel.");

      this.gameType = duel.gameType;
      const modeSelect = document.getElementById('select-game-mode');
      if (modeSelect) modeSelect.value = this.gameType;

      this.startNewGame(duel.seed);
      this._switchToRaceDock(true, duel.status);

      const roomIdEl = document.getElementById('race-room-id');
      const gameTagEl = document.getElementById('race-game-tag');
      if (roomIdEl) roomIdEl.textContent = duel.duelId;
      if (gameTagEl) gameTagEl.textContent = duel.gameType.toUpperCase();

      this._startRaceTimer(duel);
      const isWaiting = duel.status === 'WAITING';
      this._displayHintMessage(isWaiting
        ? `⚔️ Joined 5-Player Challenge ${duel.duelId}! Waiting for players (starts when 5 join or in 5 min).`
        : `⚔️ Joined 5-Player Time Challenge ${duel.duelId}! Identical seed dealt.`
      );
      this._renderP2PRacers(this.p2pDuel.getRankedLeaderboard());
    } catch (err) {
      alert(`Error joining challenge: ${err.message}`);
    }
  }

  _switchToRaceDock(inRace, status = 'RACING') {
    document.getElementById('p2p-lobby-panel')?.classList.toggle('hidden', inRace);
    document.getElementById('p2p-race-panel')?.classList.toggle('hidden', !inRace);

    const isWaiting = inRace && status === 'WAITING';
    const waitingBanner = document.getElementById('race-waiting-banner');
    const startNowContainer = document.getElementById('race-start-now-container');
    const advTag = document.getElementById('dock-advancement-tag');

    if (waitingBanner) waitingBanner.classList.toggle('hidden', !isWaiting);
    if (startNowContainer) startNowContainer.classList.toggle('hidden', !isWaiting || !this.p2pDuel.isHost);
    if (advTag) advTag.textContent = isWaiting ? 'LOBBY ROSTER' : 'LIVE SYNC';

    const badge = document.getElementById('dock-status-badge');
    if (badge) {
      if (!inRace) {
        badge.className = 'dock-badge badge-lobby';
        badge.textContent = 'LOBBY';
      } else if (isWaiting) {
        const pCount = this.p2pDuel.activeDuel?.players?.length || 1;
        badge.className = 'dock-badge badge-waiting';
        badge.textContent = `WAITING (${pCount}/5)`;
      } else {
        badge.className = 'dock-badge badge-racing';
        badge.textContent = 'RACING';
      }
    }

    const dock = document.getElementById('p2p-challenge-dock');
    if (dock?.classList.contains('collapsed')) {
      dock.classList.remove('collapsed');
      const toggleIcon = document.getElementById('dock-toggle-icon');
      if (toggleIcon) toggleIcon.textContent = '◀';
    }
  }

  leaveP2PTimeChallenge() {
    this.p2pDuel.leaveChallenge();
    this._stopRaceStopwatch();
    this._switchToRaceDock(false);
    this._renderAvailableChallenges(this.p2pDuel.getAvailableChallenges());
    this._displayHintMessage("Left Time Challenge. Returned to solo arena.");
  }

  _startRaceTimer(duel = this.p2pDuel?.activeDuel) {
    this._stopRaceStopwatch();
    if (!duel) return;

    const stopwatchEl = document.getElementById('race-stopwatch');
    const timerLabelEl = document.getElementById('race-timer-label');
    const liveDotEl = document.getElementById('race-live-dot');

    if (duel.status === 'WAITING') {
      if (timerLabelEl) timerLabelEl.textContent = 'STARTS IN:';
      if (liveDotEl) liveDotEl.style.color = '#facc15';

      const updateWaitingCountdown = () => {
        if (!this.p2pDuel?.activeDuel || this.p2pDuel.activeDuel.status !== 'WAITING') {
          return;
        }
        const remainingMs = Math.max(0, (duel.joinDeadline || (Date.now() + 300000)) - Date.now());
        const totalSec = Math.ceil(remainingMs / 1000);
        const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const sec = String(totalSec % 60).padStart(2, '0');
        if (stopwatchEl) {
          stopwatchEl.textContent = `${min}:${sec}`;
        }
        if (remainingMs <= 0) {
          if (this.p2pDuel.isHost && this.p2pDuel.activeDuel?.status === 'WAITING') {
            this.p2pDuel.startDuelRace('TIMEOUT');
          }
        }
      };

      updateWaitingCountdown();
      this.p2pRaceStopwatchTimer = setInterval(updateWaitingCountdown, 500);

    } else if (duel.status === 'RACING') {
      if (timerLabelEl) timerLabelEl.textContent = 'STOPWATCH:';
      if (liveDotEl) liveDotEl.style.color = '#ef4444';

      this.p2pRaceStartTime = duel.startTime || Date.now();
      this.p2pRaceStopwatchTimer = setInterval(() => {
        const elapsed = Date.now() - (this.p2pRaceStartTime || Date.now());
        const totalSec = Math.floor(elapsed / 1000);
        const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const sec = String(totalSec % 60).padStart(2, '0');
        const tenths = Math.floor((elapsed % 1000) / 100);
        if (stopwatchEl) {
          stopwatchEl.textContent = `${min}:${sec}.${tenths}`;
        }
      }, 100);
    }
  }

  _startRaceStopwatch() {
    this._startRaceTimer(this.p2pDuel?.activeDuel);
  }

  _handleP2PRaceStarted(duel) {
    this._switchToRaceDock(true, 'RACING');
    this._startRaceTimer(duel);
    this.sound.playCardSnap();
    this._displayHintMessage("⚡ Duel race officially started! Fastest player to clear cards takes 1st place!");
    this._renderP2PRacers(this.p2pDuel.getRankedLeaderboard());
  }

  _stopRaceStopwatch() {
    if (this.p2pRaceStopwatchTimer) {
      clearInterval(this.p2pRaceStopwatchTimer);
      this.p2pRaceStopwatchTimer = null;
    }
  }

  _renderAvailableChallenges(challenges) {
    const listEl = document.getElementById('available-challenges-list');
    const modalListEl = document.getElementById('modal-available-duels-list');
    const countBadge = document.getElementById('p2p-modal-hosted-count');

    const liveCount = (challenges || []).filter(c => c.isLiveHost).length;
    if (countBadge) {
      countBadge.textContent = liveCount > 0 ? `${liveCount} Live` : '0';
      countBadge.className = `badge-pill ${liveCount > 0 ? 'badge-pill-live' : ''}`;
    }

    // 1. Render Left Dock List
    if (listEl) {
      if (!challenges || challenges.length === 0) {
        listEl.innerHTML = `<div class="challenge-empty-state">No challenges waiting. Click "Create New Challenge" or "Quick 5-Player Race" above!</div>`;
      } else {
        listEl.innerHTML = '';
        challenges.forEach(ch => {
          const item = document.createElement('div');
          item.className = `challenge-list-card ${ch.isLiveHost ? 'is-live-host' : ''}`;

          const hostBadgeHtml = ch.isLiveHost
            ? `<span class="challenge-mode-badge badge-live-host">🟢 LIVE HOST</span>`
            : `<span class="challenge-mode-badge">${(ch.gameType || 'klondike_1').toUpperCase()}</span>`;

          const buttonText = ch.isLiveHost ? `⚔️ Join Hosted Duel` : `⚔️ Join Race`;

          item.innerHTML = `
            <div class="challenge-card-top">
              <span class="challenge-card-title">${ch.roomTitle || ch.duelId}</span>
              <span class="challenge-player-pill">${ch.playerCount || 1}/${ch.maxPlayers || 5} 👤</span>
            </div>
            <div class="challenge-card-meta">
              ${hostBadgeHtml}
              <span class="challenge-host-name">👑 Host: <strong>${ch.hostName}</strong></span>
            </div>
            <button class="btn btn-sm ${ch.isLiveHost ? 'btn-primary' : 'btn-gold'} btn-block btn-join-card" style="margin-top: 6px;">
              ${buttonText}
            </button>
          `;

          item.querySelector('.btn-join-card')?.addEventListener('click', () => {
            if (ch.matchCode) {
              this.joinP2PTimeChallenge(ch.matchCode);
            } else {
              this.joinP2PTimeChallenge(ch);
            }
          });

          listEl.appendChild(item);
        });
      }
    }

    // 2. Render Modal List
    if (modalListEl) {
      if (!challenges || challenges.length === 0) {
        modalListEl.innerHTML = `<div class="challenge-empty-state" style="grid-column: 1 / -1; padding: 20px;">No duels currently hosted by other players on your local network. Click 'Host a Duel' to host your own!</div>`;
      } else {
        modalListEl.innerHTML = '';
        challenges.forEach(ch => {
          const card = document.createElement('div');
          card.className = `modal-duel-card ${ch.isLiveHost ? 'is-live-host' : ''}`;

          const hostBadge = ch.isLiveHost
            ? `<span class="challenge-mode-badge badge-live-host">🟢 LIVE HOST</span>`
            : `<span class="challenge-mode-badge">${(ch.gameType || 'klondike_1').toUpperCase()}</span>`;

          card.innerHTML = `
            <div class="modal-duel-top">
              <span class="modal-duel-title">${ch.roomTitle || ch.duelId}</span>
              <span class="challenge-player-pill">${ch.playerCount || 1}/${ch.maxPlayers || 5} 👤</span>
            </div>
            <div class="modal-duel-meta">
              ${hostBadge}
              <span>👑 Host: <strong>${ch.hostName}</strong></span>
            </div>
            ${ch.matchCode ? `<div class="modal-duel-code-box" title="Match Code: ${ch.matchCode}">${ch.matchCode.slice(0, 24)}...</div>` : ''}
            <button class="btn btn-sm ${ch.isLiveHost ? 'btn-primary' : 'btn-gold'} btn-block btn-join-modal-card" style="margin-top: 4px;">
              ⚔️ Launch & Join Duel
            </button>
          `;

          card.querySelector('.btn-join-modal-card')?.addEventListener('click', () => {
            document.getElementById('p2p-modal')?.classList.remove('active');
            if (ch.matchCode) {
              this.joinP2PTimeChallenge(ch.matchCode);
            } else {
              this.joinP2PTimeChallenge(ch);
            }
          });

          modalListEl.appendChild(card);
        });
      }
    }
  }

  _renderP2PRacers(players) {
    const listEl = document.getElementById('race-racers-list');
    if (!listEl || !players) return;

    listEl.innerHTML = '';
    const isWaiting = this.p2pDuel?.activeDuel?.status === 'WAITING';

    // Update dock badge with player count if waiting
    if (isWaiting) {
      const badge = document.getElementById('dock-status-badge');
      if (badge) {
        badge.className = 'dock-badge badge-waiting';
        badge.textContent = `WAITING (${players.length}/5)`;
      }
    }

    players.forEach(p => {
      const row = document.createElement('div');
      row.className = `racer-item ${p.isYou ? 'racer-item-you' : ''}`;

      let finishLabel = '';
      if (isWaiting) {
        finishLabel = p.isYou ? 'Ready 👑' : 'Joined 🟢';
      } else if (p.won && p.finishTimeMs) {
        const sec = (p.finishTimeMs / 1000).toFixed(1);
        finishLabel = `🏁 ${sec}s`;
      } else if (p.won) {
        finishLabel = `🏁 Finished`;
      } else {
        finishLabel = `${p.cardsLeft} left`;
      }

      let badgeHtml = '';
      if (p.isYou) {
        badgeHtml = `<span class="racer-skill-badge badge-you">👑 YOU</span>`;
      } else if (p.isBot || p.isGhost) {
        const tier = (p.skillLevel || 'Pro').toLowerCase();
        const label = p.botBadge || `🤖 ${p.skillLevel || 'Bot'}`;
        badgeHtml = `<span class="racer-skill-badge badge-bot-${tier}" title="Computer Stand-in Skill: ${((p.skill || 0.75) * 100).toFixed(0)}% (${p.skillLevel || 'Normal'})">${label}</span>`;
      } else {
        badgeHtml = `<span class="racer-skill-badge badge-human">🌐 Human</span>`;
      }

      const metaHtml = isWaiting
        ? `<span>Deal Seed: ${this.p2pDuel.activeDuel?.seed || 'Synced'}</span><span>${p.isYou ? 'Host Ready' : 'Challenger Ready'}</span>`
        : `<span>${p.progressPct || 0}% Cleared</span><span>${p.moves || 0} Moves &bull; ${p.score || 0} Pts</span>`;

      row.innerHTML = `
        <div class="racer-header-row">
          <div class="racer-ident">
            <span class="racer-rank-badge ${p.rank === 1 ? 'rank-1' : (p.rank === 2 ? 'rank-2' : (p.rank === 3 ? 'rank-3' : ''))}">${p.rankLabel || `${p.rank || 1}th`}</span>
            <span class="racer-avatar">${p.avatar || '👤'}</span>
            <div class="racer-name-block">
              <span class="racer-name ${p.isYou ? 'you-highlight' : ''}">${p.name}</span>
              ${badgeHtml}
            </div>
          </div>
          <span class="racer-status-tag ${p.won ? 'status-won' : (isWaiting ? 'status-waiting' : 'status-racing')}">${finishLabel}</span>
        </div>
        <div class="racer-progress-bar-track">
          <div class="racer-progress-bar-fill ${p.won ? 'fill-won' : (p.isYou ? 'fill-you' : '')}" style="width: ${p.progressPct || 0}%;"></div>
        </div>
        <div class="racer-footer-meta">
          ${metaHtml}
        </div>
      `;

      listEl.appendChild(row);
    });

    // If waiting and fewer than 5 players, show open slots
    if (isWaiting && players.length < 5) {
      const openCount = 5 - players.length;
      for (let i = 0; i < openCount; i++) {
        const slotIdx = players.length + i + 1;
        const emptyRow = document.createElement('div');
        emptyRow.className = 'racer-item racer-item-waiting';
        emptyRow.innerHTML = `
          <div class="racer-header-row">
            <div class="racer-ident">
              <span class="racer-rank-badge rank-waiting">Slot ${slotIdx}</span>
              <span class="racer-avatar">⏳</span>
              <span class="racer-name" style="color: #94a3b8;">Waiting for challenger...</span>
            </div>
            <span class="racer-status-tag status-waiting">Open Slot</span>
          </div>
          <div class="racer-waiting-note">Starts when all 5 join or in 5 min</div>
        `;
        listEl.appendChild(emptyRow);
      }
    }
  }

  _handleP2PChallengeFinished(leaderboard) {
    this._stopRaceStopwatch();

    const userIndex = leaderboard.findIndex(p => p.isYou);
    const userRank = userIndex >= 0 ? userIndex + 1 : 1;

    let prize = 25;
    if (userRank === 1) prize = 1000;
    else if (userRank === 2) prize = 300;
    else if (userRank === 3) prize = 100;

    this.profiles.addCasinoBankroll(prize);
    this._triggerVaultGain(prize);
    this._updateCasinoVaultDisplay();

    const titleEl = document.getElementById('podium-verdict-title');
    const descEl = document.getElementById('podium-verdict-desc');
    const chipsEl = document.getElementById('podium-award-chips');

    if (titleEl) {
      if (userRank === 1) titleEl.textContent = '🥇 1st Place Champion!';
      else if (userRank === 2) titleEl.textContent = '🥈 2nd Place Podium!';
      else if (userRank === 3) titleEl.textContent = '🥉 3rd Place Finish!';
      else titleEl.textContent = `${userRank}th Place Finish`;
    }

    if (descEl) {
      descEl.textContent = userRank === 1
        ? 'Incredible speedrun! You completed the same-seed challenge faster than all 4 competitors!'
        : `Great match! You finished rank #${userRank} in the 5-player duplicate challenge.`;
    }

    if (chipsEl) {
      chipsEl.textContent = `+$${prize.toLocaleString()}`;
    }

    const tbody = document.getElementById('podium-standings-body');
    if (tbody) {
      tbody.innerHTML = '';
      leaderboard.forEach(p => {
        const tr = document.createElement('tr');
        if (p.isYou) tr.className = 'podium-row-you';

        let formattedTime = 'DNF';
        if (p.finishTimeMs) {
          const totalSec = Math.floor(p.finishTimeMs / 1000);
          const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
          const sec = String(totalSec % 60).padStart(2, '0');
          const tenths = Math.floor((p.finishTimeMs % 1000) / 100);
          formattedTime = `${min}:${sec}.${tenths}`;
        } else if (!p.won) {
          formattedTime = 'DNF (Incomplete)';
        }

        let rowReward = '+$0';
        if (p.rank === 1) rowReward = '+$1,000';
        else if (p.rank === 2) rowReward = '+$300';
        else if (p.rank === 3) rowReward = '+$100';
        else rowReward = '+$25';

        tr.innerHTML = `
          <td><strong>${p.rankLabel || `${p.rank}th`}</strong></td>
          <td>${p.avatar || '👤'} ${p.name} ${p.isYou ? '<strong>(You)</strong>' : ''}</td>
          <td>${formattedTime}</td>
          <td>${p.cardsLeft}</td>
          <td>${p.moves}</td>
          <td class="text-gold"><strong>${rowReward}</strong></td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById('p2p-podium-modal')?.classList.add('active');
    this.sound.playWinFanfare();
  }
}

// Bootstrap when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.solitaireApp = new SolitaireApp();
});
