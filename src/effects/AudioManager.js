/**
 * AudioManager - Manages celebration audio playback with multi-voice support
 * Victorian Christmas Solitaire - Card Celebration System
 */

export class AudioManager {
  constructor(options = {}) {
    this.masterVolume = options.masterVolume !== undefined ? options.masterVolume : 0.75;
    this.audioEnabled = options.audioEnabled !== false;
    // Spoken encouragement must strictly be a single speaker channel by default
    this.maxSimultaneous = options.maxSimultaneous !== undefined ? options.maxSimultaneous : 1;

    this.audioManifests = {
      king: null,
      queen: null,
      jack: null
    };

    this.enabledVoices = {
      king: options.enabledVoices?.king !== false,
      queen: options.enabledVoices?.queen !== false,
      jack: options.enabledVoices?.jack !== false
    };

    this.audioContext = null;
    this.audioCache = new Map();
    this.activeSounds = [];
    this.playedQuotes = new Set();
    this.currentVoiceAudio = null;
    this.lastVoiceTime = 0;
    this.minVoiceInterval = 500; // ms minimum delay between spoken encouragement
  }

  /**
   * Load audio manifests for all voices
   */
  async loadAllManifests() {
    try {
      const masterResponse = await fetch('audio/encouragement/master_manifest.json');
      const masterManifest = await masterResponse.json();

      // Load individual voice manifests
      for (const [voiceName, voiceInfo] of Object.entries(masterManifest.voices)) {
        await this.loadVoiceManifest(voiceName, voiceInfo.manifestPath);
      }

      console.log('✅ Audio manifests loaded');
      return true;
    } catch (error) {
      console.error('❌ Failed to load audio manifests:', error);
      return false;
    }
  }

  /**
   * Load manifest for specific voice
   */
  async loadVoiceManifest(voiceName, manifestPath) {
    try {
      const response = await fetch(manifestPath);
      const manifest = await response.json();
      this.audioManifests[voiceName] = manifest;
      console.log(`✅ Loaded ${voiceName} voice (${manifest.fileCount} files)`);
      return manifest;
    } catch (error) {
      console.error(`❌ Failed to load ${voiceName} manifest:`, error);
      return null;
    }
  }

  /**
   * Play audio encouragement
   * @param {Object} config - Audio configuration from EventMapper
   * @param {Object} audioSettings - Audio settings from effect template
   */
  async playAudio(config, audioSettings = {}) {
    if (!this.audioEnabled) {
      return null;
    }

    // Halt any active royal speech before starting a new one (single-voice channel)
    this.stopAll();

    // Cancel browser SpeechSynthesis if active so coach doesn't speak concurrently
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    // Debounce rapid moves to avoid overlapping chatter
    const now = Date.now();
    if (now - this.lastVoiceTime < this.minVoiceInterval && !config.force) {
      return null;
    }
    this.lastVoiceTime = now;

    // Resolve voice type
    const voiceType = this.resolveVoiceType(config.voiceType, config.card);
    if (!voiceType) {
      return null;
    }

    // Select audio file
    const audioFile = await this.selectAudioFile(
      voiceType,
      config.card?.suit,
      config.triggerId
    );

    if (!audioFile) {
      console.warn('No audio file found');
      return null;
    }

    // Create and configure audio element with voice-specific EQ routing
    const audio = await this.createAudioElement(audioFile, audioSettings, voiceType);

    // Track active sound
    this.activeSounds = [audio];
    this.currentVoiceAudio = audio;

    // Remove from active when complete or errored
    const cleanup = () => {
      this.removeFromActive(audio);
      if (this.currentVoiceAudio === audio) {
        this.currentVoiceAudio = null;
      }
    };
    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });

    // Play audio
    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      cleanup();
      return null;
    }

    return audio;
  }

  /**
   * Resolve voice type (handle 'suit_based', 'random', etc. respecting enabled voices)
   */
  resolveVoiceType(voiceType, card) {
    if (voiceType === 'suit_based') {
      // Select based on card rank
      let selected = 'queen';
      const r = card?.rankName || card?.rank;
      if (r === 'K' || r === 12) selected = 'king';
      else if (r === 'Q' || r === 11) selected = 'queen';
      else if (r === 'J' || r === 10) selected = 'jack';
      else {
        const suitVoices = {
          'hearts': 'queen',
          'diamonds': 'queen',
          'spades': 'king',
          'clubs': 'queen',
          0: 'queen',
          1: 'queen',
          2: 'queen',
          3: 'king'
        };
        selected = suitVoices[card?.suit] || 'queen';
      }

      // If selected voice is disabled, fallback to any available enabled voice
      if (this.enabledVoices[selected] === false) {
        const available = ['king', 'queen', 'jack'].filter(v => this.enabledVoices[v] !== false);
        return available.length > 0 ? available[0] : null;
      }
      return selected;
    }

    if (voiceType === 'random' || voiceType === 'random_celebration') {
      const available = ['king', 'queen', 'jack'].filter(v => this.enabledVoices[v] !== false);
      if (available.length === 0) return null;
      return available[Math.floor(Math.random() * available.length)];
    }

    if (this.enabledVoices[voiceType] === false) {
      return null;
    }

    return voiceType;
  }

  /**
   * Select appropriate audio file
   */
  async selectAudioFile(voiceType, suit, triggerId) {
    const manifest = this.audioManifests[voiceType];

    if (!manifest || !manifest.files || manifest.files.length === 0) {
      console.warn(`No audio files for voice: ${voiceType}`);
      return null;
    }

    // Filter by suit if available
    let candidates = manifest.files;

    if (suit) {
      const suitFiltered = candidates.filter(f => f.suit === suit);
      if (suitFiltered.length > 0) {
        candidates = suitFiltered;
      }
    }

    // Avoid recently played quotes
    const unplayed = candidates.filter(f =>
      !this.playedQuotes.has(f.filename)
    );

    if (unplayed.length > 0) {
      candidates = unplayed;
    }

    // Select random
    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    // Track as played
    this.playedQuotes.add(selected.filename);

    // Clear played history if it gets too large
    if (this.playedQuotes.size > 20) {
      this.playedQuotes.clear();
    }

    return selected;
  }

  /**
   * Create and configure audio element with voice routing
   */
  async createAudioElement(audioFile, settings, voiceType = null) {
    // Check cache first
    const cacheKey = audioFile.path;
    let audio;

    if (this.audioCache.has(cacheKey)) {
      audio = this.audioCache.get(cacheKey).cloneNode();
    } else {
      audio = new Audio(audioFile.path);
      audio.preload = 'auto';
      this.audioCache.set(cacheKey, audio);
    }

    this.configureAudio(audio, settings);

    if (voiceType) {
      this.applyVoiceEffects(audio, voiceType);
    }

    return audio;
  }

  /**
   * Apply voice-specific Web Audio BiquadFilter effects:
   * King: lowshelf boost at 200 Hz (+3 dB) for deep authoritative resonance
   * Queen: highshelf boost at 2000 Hz (+2 dB) for elegant brightness
   * Jack: peaking filter at 1000 Hz (Q: 0.5, +3 dB) for energetic midrange presence
   */
  applyVoiceEffects(audio, voiceType) {
    try {
      const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      if (audio._sourceConnected) return;
      const source = this.audioContext.createMediaElementSource(audio);
      audio._sourceConnected = true;
      const filter = this.audioContext.createBiquadFilter();

      if (voiceType === 'king') {
        filter.type = 'lowshelf';
        filter.frequency.value = 200;
        filter.gain.value = 3;
      } else if (voiceType === 'queen') {
        filter.type = 'highshelf';
        filter.frequency.value = 2000;
        filter.gain.value = 2;
      } else if (voiceType === 'jack') {
        filter.type = 'peaking';
        filter.frequency.value = 1000;
        filter.Q.value = 0.5;
        filter.gain.value = 3;
      }

      source.connect(filter);
      filter.connect(this.audioContext.destination);
    } catch (e) {
      // Audio element may already be connected or user gesture needed
    }
  }

  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(val) {
    this.audioEnabled = !!val;
  }

  setVoiceEnabled(voice, val) {
    if (this.enabledVoices.hasOwnProperty(voice)) {
      this.enabledVoices[voice] = !!val;
    }
  }

  /**
   * Configure audio element with settings
   */
  configureAudio(audio, settings) {
    // Volume
    const volume = settings.volume !== undefined
      ? settings.volume
      : this.masterVolume;

    audio.volume = Math.min(1.0, Math.max(0, volume));

    // Fade in
    if (settings.fadeIn) {
      this.fadeIn(audio, settings.fadeIn);
    }

    // Fade out
    if (settings.fadeOut) {
      audio.addEventListener('timeupdate', () => {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= settings.fadeOut / 1000) {
          this.fadeOut(audio, remaining * 1000);
        }
      });
    }
  }

  /**
   * Fade in audio
   */
  fadeIn(audio, duration) {
    const targetVolume = audio.volume;
    audio.volume = 0;

    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;

    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(targetVolume, audio.volume + volumeStep);

      if (currentStep >= steps) {
        clearInterval(fadeInterval);
      }
    }, stepDuration);
  }

  /**
   * Fade out audio
   */
  fadeOut(audio, duration) {
    const startVolume = audio.volume;

    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;

    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(0, audio.volume - volumeStep);

      if (currentStep >= steps || audio.volume === 0) {
        clearInterval(fadeInterval);
      }
    }, stepDuration);
  }

  /**
   * Remove audio from active list
   */
  removeFromActive(audio) {
    const index = this.activeSounds.indexOf(audio);
    if (index !== -1) {
      this.activeSounds.splice(index, 1);
    }
  }

  /**
   * Preload audio files for faster playback
   */
  async preloadAudioFiles(voiceType, count = 5) {
    const manifest = this.audioManifests[voiceType];

    if (!manifest || !manifest.files) {
      return;
    }

    const filesToPreload = manifest.files.slice(0, count);

    for (const file of filesToPreload) {
      if (!this.audioCache.has(file.path)) {
        const audio = new Audio(file.path);
        audio.preload = 'auto';
        this.audioCache.set(file.path, audio);
      }
    }

    console.log(`Preloaded ${filesToPreload.length} ${voiceType} audio files`);
  }

  /**
   * Preload all voices
   */
  async preloadAll() {
    await this.preloadAudioFiles('king', 5);
    await this.preloadAudioFiles('queen', 5);
    await this.preloadAudioFiles('jack', 5);
  }

  /**
   * Set master volume
   */
  setVolume(volume) {
    this.masterVolume = Math.min(1.0, Math.max(0, volume));

    // Update active sounds
    for (const audio of this.activeSounds) {
      audio.volume = this.masterVolume;
    }
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled) {
    this.audioEnabled = enabled;

    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * Stop all active audio
   */
  stopAll() {
    for (const audio of this.activeSounds) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
    }
    if (this.currentVoiceAudio) {
      try {
        this.currentVoiceAudio.pause();
        this.currentVoiceAudio.currentTime = 0;
      } catch (e) {}
    }
    this.activeSounds = [];
    this.currentVoiceAudio = null;
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  /**
   * Get audio statistics
   */
  getStats() {
    return {
      enabled: this.audioEnabled,
      masterVolume: this.masterVolume,
      activeSounds: this.activeSounds.length,
      cachedFiles: this.audioCache.size,
      playedQuotes: this.playedQuotes.size,
      manifests: {
        king: this.audioManifests.king?.fileCount || 0,
        queen: this.audioManifests.queen?.fileCount || 0,
        jack: this.audioManifests.jack?.fileCount || 0
      }
    };
  }

  /**
   * Test audio playback for a single voice
   */
  async testVoice(voiceType) {
    console.log(`Testing ${voiceType} voice...`);

    // Stop all active audio and cancel browser speech before playing test
    this.stopAll();

    const audioFile = await this.selectAudioFile(voiceType, null, 'test');
    if (!audioFile) {
      console.error(`No audio file found for ${voiceType}`);
      return null;
    }

    const audio = await this.createAudioElement(audioFile, {
      volume: this.masterVolume,
      fadeIn: 200,
      fadeOut: 400
    }, voiceType);

    this.activeSounds = [audio];
    this.currentVoiceAudio = audio;

    const cleanup = () => {
      this.removeFromActive(audio);
      if (this.currentVoiceAudio === audio) {
        this.currentVoiceAudio = null;
      }
    };
    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });

    try {
      await audio.play();
      console.log(`✅ Playing: ${audioFile.filename}`);
      return audio;
    } catch (error) {
      console.error(`❌ Failed to play ${voiceType} audio:`, error);
      cleanup();
      return null;
    }
  }

  /**
   * Test all voices sequentially without overlap
   */
  async testAllVoices() {
    console.log('Testing all voices sequentially...');

    const playSequential = (voiceType) => new Promise(async (resolve) => {
      const audio = await this.testVoice(voiceType);
      if (!audio) {
        resolve();
        return;
      }
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          setTimeout(resolve, 400); // 400ms pause between speakers
        }
      };
      audio.addEventListener('ended', done, { once: true });
      audio.addEventListener('error', done, { once: true });
      setTimeout(done, 5000); // safety fallback timeout
    });

    await playSequential('king');
    await playSequential('queen');
    await playSequential('jack');
  }
}

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}
