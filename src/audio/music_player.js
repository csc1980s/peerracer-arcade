/**
 * Solitaire Sovereign - User Gameplay Music Player & Audio Engine
 * 
 * Copyright Compliance & IP Protection:
 * Rather than bundling copyrighted commercial audio files, this module dynamically
 * indexes and streams the user's personal audio files placed in the "game play music"
 * folder (or picked directly from browser disk).
 * 
 * Includes:
 * - Direct HTTP streaming from the local "game play music/" folder via /api/music.
 * - Browser file picker fallback for instant drag-and-drop / selection.
 * - Zero-copyright procedural Lo-Fi Casino Lounge synth fallback when no music is added.
 */

export class GameplayMusicPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.volume = parseFloat(localStorage.getItem('solitaire_music_volume') || '0.5');
    this.audio.volume = this.volume;

    // Procedural Lo-Fi Synth fallback state
    this.synthPlaying = false;
    this.synthCtx = null;
    this.synthTimer = null;

    // Callback on state change (for UI updates)
    this.onStateChange = null;

    this._bindEvents();
    this.fetchServerMusic();
  }

  _bindEvents() {
    this.audio.addEventListener('ended', () => {
      this.next();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[MusicPlayer] Audio playback error:', e);
      this.isPlaying = false;
      this._notify();
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this._notify();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this._notify();
    });
  }

  _notify() {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying || this.synthPlaying,
        currentTrack: this.getCurrentTrackName(),
        playlistCount: this.playlist.length,
        volume: this.volume,
        isSynth: this.synthPlaying
      });
    }
  }

  getCurrentTrackName() {
    if (this.synthPlaying) return "Procedural Casino Lounge (Original Synth)";
    if (this.playlist.length > 0 && this.playlist[this.currentIndex]) {
      return this.playlist[this.currentIndex].name;
    }
    return "No Music Loaded (Check 'game play music')";
  }

  /**
   * Fetches the tracks from the local folder /api/music
   */
  async fetchServerMusic() {
    try {
      const res = await fetch('/api/music');
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          this.playlist = data.tracks;
          this.currentIndex = 0;
          this.audio.src = this.playlist[0].url;
          console.log(`[MusicPlayer] Loaded ${this.playlist.length} tracks from 'game play music'`);
        } else {
          this.playlist = [];
        }
      }
    } catch (e) {
      console.warn('[MusicPlayer] Could not fetch /api/music:', e);
    }
    this._notify();
  }

  /**
   * Allows user to load audio files directly from browser dialog
   */
  loadUserFiles(fileList) {
    const newTracks = [];
    for (const file of fileList) {
      if (file.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(file.name)) {
        newTracks.push({
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: URL.createObjectURL(file),
          filename: file.name,
          isBlob: true
        });
      }
    }

    if (newTracks.length > 0) {
      this.stopSynth();
      this.playlist = newTracks;
      this.currentIndex = 0;
      this.audio.src = this.playlist[0].url;
      this.play();
    }
    this._notify();
  }

  play() {
    if (this.playlist.length > 0) {
      this.stopSynth();
      if (!this.audio.src && this.playlist[this.currentIndex]) {
        this.audio.src = this.playlist[this.currentIndex].url;
      }
      this.audio.play().catch(e => {
        console.log('[MusicPlayer] Autoplay prevented, requires user interaction:', e);
      });
    } else {
      // No custom files -> launch procedural lo-fi ambient synth!
      this.startSynth();
    }
  }

  pause() {
    if (this.synthPlaying) {
      this.stopSynth();
    } else {
      this.audio.pause();
    }
    this._notify();
  }

  togglePlay() {
    if (this.isPlaying || this.synthPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  next() {
    if (this.playlist.length <= 1) {
      if (this.playlist.length === 1) {
        this.audio.currentTime = 0;
        this.play();
      }
      return;
    }
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.audio.src = this.playlist[this.currentIndex].url;
    this.play();
  }

  prev() {
    if (this.playlist.length <= 1) return;
    this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.audio.src = this.playlist[this.currentIndex].url;
    this.play();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audio.volume = this.volume;
    localStorage.setItem('solitaire_music_volume', this.volume.toString());
    if (this.synthGain) {
      this.synthGain.gain.setValueAtTime(this.volume * 0.15, this.synthCtx.currentTime);
    }
    this._notify();
  }

  /**
   * Procedural Lo-Fi Casino Lounge Generator
   * Uses Web Audio API to create gentle, relaxing Rhodes chords and subtle ambient texture
   */
  startSynth() {
    this.stopSynth();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.synthCtx = new AudioCtx();
    this.synthGain = this.synthCtx.createGain();
    this.synthGain.gain.setValueAtTime(this.volume * 0.15, this.synthCtx.currentTime);
    this.synthGain.connect(this.synthCtx.destination);

    // Warm Lo-Fi Chords progression (Dm9 -> G13 -> Cmaj9 -> Am7)
    const chordProgressions = [
      [293.66, 349.23, 440.00, 523.25, 659.25], // Dm9
      [246.94, 329.63, 392.00, 493.88, 659.25], // G13
      [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
      [220.00, 261.63, 329.63, 392.00, 523.25]  // Am7
    ];

    let chordStep = 0;

    const playNextChord = () => {
      if (!this.synthPlaying || !this.synthCtx) return;
      const t = this.synthCtx.currentTime;
      const chord = chordProgressions[chordStep];
      chordStep = (chordStep + 1) % chordProgressions.length;

      chord.forEach((freq, i) => {
        const osc = this.synthCtx.createOscillator();
        const noteGain = this.synthCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        // Soft ADSR envelope for electric piano feel
        noteGain.gain.setValueAtTime(0.0001, t);
        noteGain.gain.linearRampToValueAtTime(0.035, t + 0.1 + i * 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);

        osc.connect(noteGain);
        noteGain.connect(this.synthGain);

        osc.start(t + i * 0.04);
        osc.stop(t + 4.0);
      });

      this.synthTimer = setTimeout(playNextChord, 3800);
    };

    this.synthPlaying = true;
    this.isPlaying = true;
    playNextChord();
    this._notify();
  }

  stopSynth() {
    this.synthPlaying = false;
    if (this.synthTimer) {
      clearTimeout(this.synthTimer);
      this.synthTimer = null;
    }
    if (this.synthCtx && this.synthCtx.state !== 'closed') {
      try {
        this.synthCtx.close();
      } catch (e) {}
      this.synthCtx = null;
    }
  }
}
