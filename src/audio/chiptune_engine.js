/**
 * NES/Game Boy Chiptune Engine for Solitaire Games
 *
 * Implements 4-channel NES-style audio:
 * - Square 1 (Pulse 25% duty)
 * - Square 2 (Pulse 50% duty)
 * - Triangle (Bass)
 * - Noise (Percussion)
 *
 * Based on composition blueprint for relaxing puzzle-game soundtrack suite
 */

import * as Tone from 'tone';

export class ChiptuneEngine {
  constructor() {
    this.isInitialized = false;
    this.currentTrack = null;
    this.channels = {
      square1: null,
      square2: null,
      triangle: null,
      noise: null
    };

    this.tracks = {
      title: null,
      gameplay: null,
      tension: null,
      victory: null
    };
  }

  /**
   * Initialize the audio engine (must be called after user interaction)
   */
  async initialize() {
    if (this.isInitialized) return;

    await Tone.start();
    console.log('Chiptune audio engine started');

    // Create Square 1 channel (25% duty cycle - bright lead)
    this.channels.square1 = new Tone.Synth({
      oscillator: {
        type: 'pulse',
        width: 0.25 // 25% duty cycle
      },
      envelope: {
        attack: 0.002,
        decay: 0.1,
        sustain: 0.5,
        release: 0.1
      }
    }).toDestination();
    this.channels.square1.volume.value = -8; // 75-85% volume

    // Create Square 2 channel (50% duty cycle - harmony)
    this.channels.square2 = new Tone.Synth({
      oscillator: {
        type: 'pulse',
        width: 0.5 // 50% duty cycle
      },
      envelope: {
        attack: 0.002,
        decay: 0.15,
        sustain: 0.4,
        release: 0.15
      }
    }).toDestination();
    this.channels.square2.volume.value = -12; // 50-65% volume

    // Create Triangle channel (bass)
    this.channels.triangle = new Tone.Synth({
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0.6,
        release: 0.2
      }
    }).toDestination();
    this.channels.triangle.volume.value = -10; // 65-75% volume

    // Create Noise channel (percussion)
    this.channels.noise = new Tone.NoiseSynth({
      noise: {
        type: 'white',
        playbackRate: 3
      },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0
      }
    }).toDestination();
    this.channels.noise.volume.value = -15; // 35-55% volume

    // Build all tracks
    this.buildTitleScreen();
    this.buildGameplay();
    this.buildTension();
    this.buildVictory();

    this.isInitialized = true;
  }

  /**
   * Track 1: "Cartridge Sunrise" - Title Screen / Main Menu
   * Tempo: 108 BPM, Key: C Major, 16-bar loop
   */
  buildTitleScreen() {
    const bpm = 108;
    const beatDuration = 60 / bpm; // Duration of one quarter note in seconds

    // Square 1 melody (main hook)
    const square1Melody = [
      // Bar 1-2
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['D4', 0.5],
      ['E4', 0.5], ['G4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 1.0],

      // Bar 3-4
      ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['E4', 0.5], ['G4', 1.0],
      ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 2.0],

      // Bar 5-6
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5],
      ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1.0],

      // Bar 7-8
      ['F4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['E4', 0.5], ['F4', 0.5], ['G4', 0.5],
      ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 2.0],

      // Bar 9-10
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['D4', 0.5],
      ['E4', 0.5], ['G4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1.0],

      // Bar 11-12
      ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1.0],
      ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 2.0],

      // Bar 13-14
      ['F4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 1.0],
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 1.0],

      // Bar 15-16
      ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 1.0],
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 2.0]
    ];

    // Square 2 harmony (arpeggios)
    const square2Harmony = [
      // C major arpeggio
      ['G3', 0.25], ['E4', 0.25], ['G4', 0.25], ['E4', 0.25],
      ['G3', 0.25], ['E4', 0.25], ['G4', 0.25], ['E4', 0.25],
      // G/B arpeggio
      ['D4', 0.25], ['G4', 0.25], ['D4', 0.25], ['G4', 0.25],
      ['D4', 0.25], ['G4', 0.25], ['D4', 0.25], ['G4', 0.25],
      // Continue pattern for other chords...
    ];

    // Triangle bass
    const triangleBass = [
      ['C2', 1.0], ['G2', 1.0], ['B1', 1.0], ['G1', 1.0],
      ['A1', 1.0], ['E2', 1.0], ['F1', 1.0], ['C2', 1.0],
      ['E2', 1.0], ['G1', 1.0], ['G1', 1.0], ['D2', 1.0],
      ['F1', 1.0], ['C2', 1.0], ['G1', 1.0], ['G2', 1.0]
      // Continue for all 16 bars...
    ];

    this.tracks.title = {
      square1: square1Melody,
      square2: square2Harmony,
      triangle: triangleBass,
      bpm: bpm,
      loop: true
    };
  }

  /**
   * Track 2: "Puzzle Parade" - Casual Gameplay / Stage Loop
   * Tempo: 126 BPM, Key: G Major, 16-bar loop
   */
  buildGameplay() {
    const bpm = 126;

    // Square 1 lead (bouncy melody)
    const square1Lead = [
      // Bar 1
      ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 0.5],
      // Bar 2
      ['A4', 0.5], ['C5', 0.5], ['F#5', 0.5], ['D5', 0.5], ['A4', 0.5], ['G4', 0.5], ['F#4', 0.5], ['G4', 0.5],
      // Continue for 16 bars...
    ];

    this.tracks.gameplay = {
      square1: square1Lead,
      bpm: bpm,
      loop: true
    };
  }

  /**
   * Track 3: "Combo Cascade" - Tension / Special Event
   * Tempo: 168 BPM, Key: A Minor, 8-bar loop
   */
  buildTension() {
    const bpm = 168;

    const square1Tension = [
      ['A5', 0.25], ['E5', 0.25], ['A5', 0.25], ['C6', 0.25], ['B5', 0.25], ['A5', 0.25], ['G5', 0.25], ['E5', 0.25],
      // Continue fast 16th note patterns...
    ];

    this.tracks.tension = {
      square1: square1Tension,
      bpm: bpm,
      loop: true
    };
  }

  /**
   * Track 4: "Clear the Board!" - Victory / Stage Clear Jingle
   * Tempo: 150 BPM, Key: C Major, 8 bars (no loop)
   */
  buildVictory() {
    const bpm = 150;

    const victoryFanfare = [
      // Bar 1-2
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 1.0],
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['D6', 0.5], ['A5', 0.5], ['F5', 0.5], ['D5', 1.0],
      // Continue through bar 8...
    ];

    this.tracks.victory = {
      square1: victoryFanfare,
      bpm: bpm,
      loop: false
    };
  }

  /**
   * Play a track
   */
  playTrack(trackName) {
    if (!this.isInitialized) {
      console.error('Audio engine not initialized. Call initialize() first.');
      return;
    }

    this.stopAll();

    const track = this.tracks[trackName];
    if (!track) {
      console.error(`Track "${trackName}" not found`);
      return;
    }

    Tone.Transport.bpm.value = track.bpm;
    this.currentTrack = trackName;

    // Schedule notes for each channel
    this.scheduleNotes(track);

    Tone.Transport.start();
  }

  /**
   * Schedule notes for all channels
   */
  scheduleNotes(track) {
    let time = 0;

    // Schedule Square 1 notes
    if (track.square1) {
      track.square1.forEach(([note, duration]) => {
        this.channels.square1.triggerAttackRelease(note, duration * 0.75, time);
        time += duration;
      });
    }

    // Schedule Square 2, Triangle, Noise similarly...
  }

  /**
   * Stop all audio
   */
  stopAll() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    this.currentTrack = null;
  }

  /**
   * Trigger a quick sound effect (card flip, etc.)
   */
  playCardFlip() {
    this.channels.noise.triggerAttackRelease('8n');
  }

  playCardPlace() {
    this.channels.square1.triggerAttackRelease('C4', '16n');
  }

  playWin() {
    // Quick rising arpeggio
    this.channels.square1.triggerAttackRelease('C5', '16n', '+0');
    this.channels.square1.triggerAttackRelease('E5', '16n', '+0.1');
    this.channels.square1.triggerAttackRelease('G5', '16n', '+0.2');
    this.channels.square1.triggerAttackRelease('C6', '8n', '+0.3');
  }
}
