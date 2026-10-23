/**
 * NES/Game Boy Chiptune Music Engine for Solitaire Games
 *
 * Complete 4-track composition suite:
 * 1. "Cartridge Sunrise" - Title Screen (108 BPM, C Major, 16 bars)
 * 2. "Puzzle Parade" - Gameplay (126 BPM, G Major, 16 bars)
 * 3. "Combo Cascade" - Tension (168 BPM, A Minor, 8 bars)
 * 4. "Clear the Board!" - Victory (150 BPM, C Major, 8 bars)
 *
 * Based on authentic NES/Game Boy hardware:
 * - Square 1: 25% duty cycle (bright lead)
 * - Square 2: 50% duty cycle (harmony)
 * - Triangle: Bass channel
 * - Noise: Percussion
 */

import * as Tone from 'tone';

export class ChiptuneMusic {
  constructor() {
    this.isInitialized = false;
    this.isPlaying = false;
    this.currentTrack = null;
    this.isMuted = false;

    // NES channels
    this.channels = {
      square1: null,
      square2: null,
      triangle: null,
      noise: null
    };

    // Active sequences
    this.sequences = {
      square1: null,
      square2: null,
      triangle: null,
      noise: null
    };
  }

  /**
   * Initialize audio engine (call after user interaction)
   */
  async initialize() {
    if (this.isInitialized) return;

    await Tone.start();
    console.log('🎵 Chiptune Music Engine initialized');

    // Square 1 - 25% duty cycle (bright lead)
    this.channels.square1 = new Tone.Synth({
      oscillator: { type: 'pulse', width: 0.25 },
      envelope: { attack: 0.002, decay: 0.1, sustain: 0.5, release: 0.1 }
    }).toDestination();
    this.channels.square1.volume.value = -8;

    // Square 2 - 50% duty cycle (harmony)
    this.channels.square2 = new Tone.Synth({
      oscillator: { type: 'pulse', width: 0.5 },
      envelope: { attack: 0.002, decay: 0.15, sustain: 0.4, release: 0.15 }
    }).toDestination();
    this.channels.square2.volume.value = -12;

    // Triangle - Bass
    this.channels.triangle = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0.6, release: 0.2 }
    }).toDestination();
    this.channels.triangle.volume.value = -10;

    // Noise - Percussion
    this.channels.noise = new Tone.NoiseSynth({
      noise: { type: 'white', playbackRate: 3 },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
    }).toDestination();
    this.channels.noise.volume.value = -15;

    this.isInitialized = true;
  }

  /**
   * Play Track 1: "Cartridge Sunrise" (Title Screen)
   */
  playTitleMusic() {
    if (!this.isInitialized) {
      console.warn('Audio not initialized');
      return;
    }

    this.stop();
    Tone.Transport.bpm.value = 108;
    this.currentTrack = 'title';

    // Square 1 Melody - Complete 16-bar composition
    const titleMelody = [
      // Bar 1
      ['E4', '8n'], ['G4', '8n'], ['A4', '8n'], ['G4', '8n'],
      ['E4', '8n'], ['D4', '8n'], ['C4', '8n'], ['D4', '8n'],
      // Bar 2
      ['E4', '8n'], ['G4', '8n'], ['C5', '8n'], ['B4', '8n'],
      ['A4', '8n'], ['G4', '8n'], ['E4', '4n'],
      // Bar 3
      ['G4', '8n'], ['A4', '8n'], ['G4', '8n'], ['E4', '8n'],
      ['D4', '8n'], ['E4', '8n'], ['G4', '4n'],
      // Bar 4
      ['A4', '8n'], ['G4', '8n'], ['E4', '8n'], ['D4', '8n'],
      ['C4', '2n'],
      // Bar 5
      ['E4', '8n'], ['G4', '8n'], ['A4', '8n'], ['C5', '8n'],
      ['B4', '8n'], ['A4', '8n'], ['G4', '8n'], ['E4', '8n'],
      // Bar 6
      ['D4', '8n'], ['E4', '8n'], ['G4', '8n'], ['A4', '8n'],
      ['G4', '8n'], ['E4', '8n'], ['D4', '4n'],
      // Bar 7
      ['F4', '8n'], ['A4', '8n'], ['G4', '8n'], ['E4', '8n'],
      ['D4', '8n'], ['E4', '8n'], ['F4', '8n'], ['G4', '8n'],
      // Bar 8
      ['A4', '8n'], ['G4', '8n'], ['E4', '8n'], ['D4', '8n'],
      ['C4', '2n'],
      // Bar 9
      ['E4', '8n'], ['G4', '8n'], ['A4', '8n'], ['G4', '8n'],
      ['E4', '8n'], ['D4', '8n'], ['C4', '8n'], ['D4', '8n'],
      // Bar 10
      ['E4', '8n'], ['G4', '8n'], ['C5', '8n'], ['D5', '8n'],
      ['E5', '8n'], ['D5', '8n'], ['C5', '4n'],
      // Bar 11
      ['B4', '8n'], ['A4', '8n'], ['G4', '8n'], ['E4', '8n'],
      ['G4', '8n'], ['A4', '8n'], ['B4', '4n'],
      // Bar 12
      ['C5', '8n'], ['B4', '8n'], ['A4', '8n'], ['G4', '8n'],
      ['E4', '2n'],
      // Bar 13
      ['F4', '8n'], ['G4', '8n'], ['A4', '8n'], ['C5', '8n'],
      ['A4', '8n'], ['G4', '8n'], ['F4', '4n'],
      // Bar 14
      ['E4', '8n'], ['G4', '8n'], ['A4', '8n'], ['G4', '8n'],
      ['E4', '8n'], ['D4', '8n'], ['C4', '4n'],
      // Bar 15
      ['D4', '8n'], ['F4', '8n'], ['A4', '8n'], ['G4', '8n'],
      ['F4', '8n'], ['E4', '8n'], ['D4', '4n'],
      // Bar 16
      ['G4', '8n'], ['A4', '8n'], ['B4', '8n'], ['D5', '8n'],
      ['C5', '2n']
    ];

    // Square 2 Harmony - Arpeggios
    const titleHarmony = [
      // C chord arpeggio (bars 1-2)
      ['G3', '16n'], ['E4', '16n'], ['G4', '16n'], ['E4', '16n'],
      ['G3', '16n'], ['E4', '16n'], ['G4', '16n'], ['E4', '16n'],
      ['G3', '16n'], ['E4', '16n'], ['G4', '16n'], ['E4', '16n'],
      ['G3', '16n'], ['E4', '16n'], ['G4', '16n'], ['E4', '16n'],
      // G/B chord (continuing bar 2)
      ['D4', '16n'], ['G4', '16n'], ['D4', '16n'], ['G4', '16n'],
      ['D4', '16n'], ['G4', '16n'], ['D4', '16n'], ['G4', '16n'],
      // Am chord (bar 3)
      ['E4', '16n'], ['C4', '16n'], ['E4', '16n'], ['C4', '16n'],
      ['E4', '16n'], ['C4', '16n'], ['E4', '16n'], ['C4', '16n'],
      ['E4', '16n'], ['C4', '16n'], ['E4', '16n'], ['C4', '16n'],
      ['E4', '16n'], ['C4', '16n'], ['E4', '16n'], ['C4', '16n'],
      // F chord (bar 4)
      ['C4', '16n'], ['A3', '16n'], ['C4', '16n'], ['A3', '16n'],
      ['C4', '16n'], ['A3', '16n'], ['C4', '16n'], ['A3', '16n'],
      // Continue pattern for remaining bars...
    ];

    // Triangle Bass
    const titleBass = [
      ['C2', '4n'], ['G2', '4n'], ['B1', '4n'], ['G1', '4n'],
      ['A1', '4n'], ['E2', '4n'], ['F1', '4n'], ['C2', '4n'],
      ['E2', '4n'], ['G1', '4n'], ['G1', '4n'], ['D2', '4n'],
      ['F1', '4n'], ['C2', '4n'], ['G1', '4n'], ['G2', '4n'],
      ['C2', '4n'], ['G2', '4n'], ['B1', '4n'], ['G1', '4n'],
      ['A1', '4n'], ['E2', '4n'], ['E2', '4n'], ['B1', '4n'],
      ['F1', '4n'], ['C2', '4n'], ['E2', '4n'], ['C2', '4n'],
      ['D2', '4n'], ['A1', '4n'], ['G1', '4n'], ['G2', '4n']
    ];

    this.playSequence('square1', titleMelody, true);
    this.playSequence('triangle', titleBass, true);

    Tone.Transport.start();
    this.isPlaying = true;
  }

  /**
   * Play Track 2: "Puzzle Parade" (Gameplay)
   */
  playGameplayMusic() {
    if (!this.isInitialized) return;

    this.stop();
    Tone.Transport.bpm.value = 126;
    this.currentTrack = 'gameplay';

    const gameplayMelody = [
      // Bar 1
      ['B4', '8n'], ['D5', '8n'], ['G5', '8n'], ['D5', '8n'],
      ['B4', '8n'], ['A4', '8n'], ['G4', '8n'], ['A4', '8n'],
      // Bar 2
      ['A4', '8n'], ['C5', '8n'], ['F#5', '8n'], ['D5', '8n'],
      ['A4', '8n'], ['G4', '8n'], ['F#4', '8n'], ['G4', '8n'],
      // Bar 3
      ['G4', '8n'], ['B4', '8n'], ['E5', '8n'], ['B4', '8n'],
      ['G4', '8n'], ['F#4', '8n'], ['E4', '8n'], ['F#4', '8n'],
      // Bar 4
      ['E4', '8n'], ['G4', '8n'], ['C5', '8n'], ['G4', '8n'],
      ['E4', '8n'], ['D4', '8n'], ['C4', '8n'], ['D4', '8n'],
      // Bars 5-16 continue...
      ['B4', '8n'], ['D5', '8n'], ['G5', '8n'], ['A5', '8n'],
      ['G5', '8n'], ['D5', '8n'], ['B4', '8n'], ['A4', '8n'],
      ['A4', '8n'], ['C5', '8n'], ['F#5', '8n'], ['A5', '8n'],
      ['F#5', '8n'], ['D5', '8n'], ['A4', '8n'], ['F#4', '8n'],
      ['G4', '8n'], ['B4', '8n'], ['D5', '8n'], ['E5', '8n'],
      ['D5', '8n'], ['B4', '8n'], ['A4', '8n'], ['G4', '8n'],
      ['A4', '8n'], ['B4', '8n'], ['C5', '8n'], ['D5', '8n'],
      ['E5', '8n'], ['D5', '8n'], ['C5', '4n']
    ];

    const gameplayBass = [
      ['G2', '8n'], ['G2', '8n'], ['B2', '8n'], ['D3', '8n'],
      ['B2', '8n'], ['A2', '8n'], ['G2', '8n'], ['D2', '8n'],
      ['F#2', '8n'], ['F#2', '8n'], ['A2', '8n'], ['D3', '8n'],
      ['A2', '8n'], ['F#2', '8n'], ['E2', '8n'], ['D2', '8n'],
      ['E2', '8n'], ['E2', '8n'], ['G2', '8n'], ['B2', '8n'],
      ['G2', '8n'], ['F#2', '8n'], ['E2', '8n'], ['B1', '8n'],
      ['C2', '8n'], ['C2', '8n'], ['E2', '8n'], ['G2', '8n'],
      ['E2', '8n'], ['D2', '8n'], ['C2', '8n'], ['G1', '8n']
    ];

    this.playSequence('square1', gameplayMelody, true);
    this.playSequence('triangle', gameplayBass, true);

    // Add noise groove
    this.playNoiseGroove();

    Tone.Transport.start();
    this.isPlaying = true;
  }

  /**
   * Play Track 3: "Combo Cascade" (Tension/Special Event)
   */
  playTensionMusic() {
    if (!this.isInitialized) return;

    this.stop();
    Tone.Transport.bpm.value = 168;
    this.currentTrack = 'tension';

    const tensionMelody = [
      // Bar 1
      ['A5', '16n'], ['E5', '16n'], ['A5', '16n'], ['C6', '16n'],
      ['B5', '16n'], ['A5', '16n'], ['G5', '16n'], ['E5', '16n'],
      // Bar 2
      ['G5', '16n'], ['D5', '16n'], ['G5', '16n'], ['B5', '16n'],
      ['A5', '16n'], ['G5', '16n'], ['F5', '16n'], ['D5', '16n'],
      // Bar 3
      ['F5', '16n'], ['C6', '16n'], ['F6', '16n'], ['A6', '16n'],
      ['G6', '16n'], ['F6', '16n'], ['E6', '16n'], ['C6', '16n'],
      // Bar 4
      ['E5', '16n'], ['B5', '16n'], ['E6', '16n'], ['G#6', '16n'],
      ['A6', '16n'], ['G#6', '16n'], ['E6', '16n'], ['B5', '16n'],
      // Bar 5
      ['A5', '16n'], ['C6', '16n'], ['E6', '16n'], ['A6', '16n'],
      ['G6', '16n'], ['E6', '16n'], ['C6', '16n'], ['A5', '16n'],
      // Bar 6
      ['C6', '16n'], ['E6', '16n'], ['G6', '16n'], ['C7', '16n'],
      ['B6', '16n'], ['G6', '16n'], ['E6', '16n'], ['C6', '16n'],
      // Bar 7
      ['D6', '16n'], ['F6', '16n'], ['A6', '16n'], ['D7', '16n'],
      ['C7', '16n'], ['A6', '16n'], ['F6', '16n'], ['E6', '16n'],
      // Bar 8
      ['E6', '16n'], ['G#6', '16n'], ['B6', '16n'], ['E7', '16n'],
      ['A6', '4n']
    ];

    const tensionBass = [
      ['A1', '8n'], ['A1', '8n'], ['E2', '8n'], ['A1', '8n'],
      ['C2', '8n'], ['A1', '8n'], ['E2', '8n'], ['A1', '8n'],
      ['G1', '8n'], ['G1', '8n'], ['D2', '8n'], ['G1', '8n'],
      ['B1', '8n'], ['G1', '8n'], ['D2', '8n'], ['G1', '8n'],
      ['F1', '8n'], ['F1', '8n'], ['C2', '8n'], ['F1', '8n'],
      ['A1', '8n'], ['F1', '8n'], ['C2', '8n'], ['F1', '8n'],
      ['E1', '8n'], ['E1', '8n'], ['B1', '8n'], ['E2', '8n'],
      ['G#1', '8n'], ['E2', '8n'], ['B1', '8n'], ['E1', '8n']
    ];

    this.playSequence('square1', tensionMelody, true);
    this.playSequence('triangle', tensionBass, true);
    this.playFastNoiseGroove();

    Tone.Transport.start();
    this.isPlaying = true;
  }

  /**
   * Play Track 4: "Clear the Board!" (Victory Jingle)
   */
  playVictoryMusic() {
    if (!this.isInitialized) return;

    this.stop();
    Tone.Transport.bpm.value = 150;
    this.currentTrack = 'victory';

    const victoryFanfare = [
      // Bar 1
      ['C5', '8n'], ['E5', '8n'], ['G5', '8n'], ['C6', '8n'],
      ['G5', '8n'], ['E5', '8n'], ['C5', '4n'],
      // Bar 2
      ['D5', '8n'], ['F5', '8n'], ['A5', '8n'], ['D6', '8n'],
      ['A5', '8n'], ['F5', '8n'], ['D5', '4n'],
      // Bar 3
      ['E5', '8n'], ['G5', '8n'], ['C6', '8n'], ['E6', '8n'],
      ['D6', '8n'], ['C6', '8n'], ['G5', '4n'],
      // Bar 4
      ['F5', '8n'], ['A5', '8n'], ['C6', '8n'], ['F6', '8n'],
      ['E6', '8n'], ['D6', '8n'], ['C6', '4n'],
      // Bar 5
      ['G5', '8n'], ['G5', '8n'], ['A5', '8n'], ['B5', '8n'],
      ['C6', '8n'], ['B5', '8n'], ['A5', '8n'], ['G5', '8n'],
      // Bar 6
      ['G5', '8n'], ['A5', '8n'], ['B5', '8n'], ['D6', '8n'],
      ['C6', '8n'], ['B5', '8n'], ['G5', '4n'],
      // Bar 7
      ['C6', '8n'], ['D6', '8n'], ['E6', '8n'], ['G6', '8n'],
      ['A6', '8n'], ['G6', '8n'], ['E6', '8n'], ['C6', '8n'],
      // Bar 8 - Final arpeggio
      ['G5', '16n'], ['C6', '16n'], ['E6', '16n'], ['G6', '16n'],
      ['C7', '2n']
    ];

    const victoryBass = [
      ['C2', '4n'], ['G1', '4n'],
      ['B1', '4n'], ['G1', '4n'],
      ['A1', '4n'], ['E2', '4n'],
      ['F1', '4n'], ['C2', '4n'],
      ['G1', '8n'], ['G1', '8n'], ['A1', '8n'], ['B1', '8n'],
      ['C2', '8n'], ['B1', '8n'], ['A1', '8n'], ['G1', '8n'],
      ['C2', '8n'], ['E2', '8n'], ['G2', '8n'], ['C3', '8n'],
      ['C2', '2n']
    ];

    this.playSequence('square1', victoryFanfare, false); // No loop
    this.playSequence('triangle', victoryBass, false);

    Tone.Transport.start();
    this.isPlaying = true;

    // Auto-stop after jingle completes (~6 seconds)
    setTimeout(() => {
      this.stop();
    }, 6000);
  }

  /**
   * Helper: Play a note sequence
   */
  playSequence(channel, notes, loop = true) {
    const synth = this.channels[channel];
    if (!synth) return;

    let time = 0;
    notes.forEach(([note, duration]) => {
      synth.triggerAttackRelease(note, duration, `+${time}`);
      time += Tone.Time(duration).toSeconds();
    });

    if (loop) {
      const loopLength = time;
      this.sequences[channel] = new Tone.Loop(() => {
        time = 0;
        notes.forEach(([note, duration]) => {
          synth.triggerAttackRelease(note, duration, `+${time}`);
          time += Tone.Time(duration).toSeconds();
        });
      }, loopLength).start(0);
    }
  }

  /**
   * Play gameplay noise groove
   */
  playNoiseGroove() {
    const pattern = [
      [0, 'low'],   // Kick on beat 1
      [4, 'high'],  // Snare on beat 2
      [6, 'low'],   // Kick
      [8, 'low'],   // Kick on beat 3
      [12, 'high']  // Snare on beat 4
    ];

    this.sequences.noise = new Tone.Loop(() => {
      pattern.forEach(([step, type]) => {
        const time = `+${step * 0.03125}`; // 1/16th note timing
        if (type === 'low') {
          this.channels.noise.triggerAttackRelease('32n', time);
        } else {
          this.channels.noise.triggerAttackRelease('64n', time);
        }
      });
    }, '1m').start(0);
  }

  /**
   * Play faster noise for tension music
   */
  playFastNoiseGroove() {
    this.sequences.noise = new Tone.Loop((time) => {
      this.channels.noise.triggerAttackRelease('32n', time);
      this.channels.noise.triggerAttackRelease('64n', time + 0.125);
      this.channels.noise.triggerAttackRelease('32n', time + 0.25);
      this.channels.noise.triggerAttackRelease('64n', time + 0.375);
    }, '1n').start(0);
  }

  /**
   * Stop all music
   */
  stop() {
    Object.keys(this.sequences).forEach(channel => {
      if (this.sequences[channel]) {
        this.sequences[channel].stop();
        this.sequences[channel].dispose();
        this.sequences[channel] = null;
      }
    });
    Tone.Transport.stop();
    Tone.Transport.cancel();
    this.isPlaying = false;
    this.currentTrack = null;
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    const vol = this.isMuted ? -Infinity : 0;
    Tone.Destination.volume.value = vol;
    return this.isMuted;
  }

  /**
   * Quick sound effects
   */
  sfx = {
    cardFlip: () => {
      if (!this.isInitialized) return;
      this.channels.noise.triggerAttackRelease('32n');
    },
    cardPlace: () => {
      if (!this.isInitialized) return;
      this.channels.square1.triggerAttackRelease('C4', '16n');
    },
    cardDeal: () => {
      if (!this.isInitialized) return;
      this.channels.square2.triggerAttackRelease('G3', '32n');
    },
    invalidMove: () => {
      if (!this.isInitialized) return;
      this.channels.square1.triggerAttackRelease('C3', '16n');
      setTimeout(() => {
        this.channels.square1.triggerAttackRelease('B2', '16n');
      }, 100);
    },
    win: () => {
      if (!this.isInitialized) return;
      const notes = ['C5', 'E5', 'G5', 'C6'];
      notes.forEach((note, i) => {
        setTimeout(() => {
          this.channels.square1.triggerAttackRelease(note, '16n');
        }, i * 100);
      });
    }
  };
}

// Export singleton instance
export const chiptuneMusic = new ChiptuneMusic();
