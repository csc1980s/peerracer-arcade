/**
 * Solitaire Sovereign - Procedural Web Audio API Sound Synthesizer
 * 
 * IP Provenance & Boundary:
 * Microsoft Solitaire uses Audiokinetic Wwise banks ('init.bnk', 'soundbank.bnk').
 * Rather than licensing third-party samples or risking Freesound licensing conflicts,
 * this audio engine synthesizes all acoustic card sound events mathematically in real-time
 * using the native Web Audio API (white noise filters, ADSR envelopes, resonant sine crystals).
 * 
 * 100% original, zero audio file dependencies, zero copyright encumbrance.
 */

export class ProceduralSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.7;
  }

  _init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggleSound(forceState) {
    this.enabled = forceState !== undefined ? forceState : !this.enabled;
    return this.enabled;
  }

  /**
   * Synthesize tactile card slide across felt
   */
  playCardSlide() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    filter.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18 * this.volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(t);
  }

  /**
   * Synthesize firm tactile card snap / placement
   */
  playCardSnap() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Synthesize card flip flutter
   */
  playCardFlip() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    this.playCardSlide();
    setTimeout(() => this.playCardSnap(), 40);
  }

  /**
   * Synthesize resonant harmonic chime when placing a card on Foundation.
   * Pitch increases chromatically with card rank (Ace = lower tone, King = triumphant chime)
   * @param {number} rank 0..12
   */
  playFoundationSnap(rank = 0) {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Pentatonic scale frequencies starting around C5
    const baseFreq = 523.25; // C5
    const semitones = rank * 2; // Ascend by steps
    const freq = baseFreq * Math.pow(2, semitones / 12);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.01, t); // Shimmer overtone

    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.45);
    osc2.stop(t + 0.45);
  }

  /**
   * Synthesize gentle undo sweep
   */
  playUndo() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.15);

    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Synthesize rapid card shuffle sound
   */
  playShuffle() {
    if (!this.enabled) return;
    for (let i = 0; i < 7; i++) {
      setTimeout(() => this.playCardSlide(), i * 45);
    }
  }

  /**
   * Synthesize celebratory victory fanfare arpeggio sequence
   */
  playVictoryFanfare() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const chords = [
      523.25, // C5
      659.25, // E5
      783.99, // G5
      1046.50 // C6
    ];

    chords.forEach((note, index) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, t);

        const dur = (index === chords.length - 1) ? 1.2 : 0.4;
        gain.gain.setValueAtTime(0.3 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + dur);
      }, index * 140);
    });
  }

  /**
   * Synthesize realistic firework rocket launch whoosh & whistle
   */
  playFireworkLaunch() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Air rush / wind propellant whoosh
    const whooshBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.5), this.ctx.sampleRate);
    const whooshData = whooshBuffer.getChannelData(0);
    for (let i = 0; i < whooshData.length; i++) {
      whooshData[i] = (Math.random() * 2 - 1) * Math.sin((i / whooshData.length) * Math.PI);
    }
    const whooshSource = this.ctx.createBufferSource();
    whooshSource.buffer = whooshBuffer;

    const whooshFilter = this.ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(450, t);
    whooshFilter.frequency.exponentialRampToValueAtTime(1600, t + 0.45);
    whooshFilter.Q.setValueAtTime(3.0, t);

    const whooshGain = this.ctx.createGain();
    whooshGain.gain.setValueAtTime(0.001, t);
    whooshGain.gain.linearRampToValueAtTime(0.18 * this.volume, t + 0.1);
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);

    whooshSource.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(this.ctx.destination);
    whooshSource.start(t);

    // 2. Rising mortar tube whistle with Doppler accent
    const whistleOsc = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistleOsc.type = 'triangle';
    whistleOsc.frequency.setValueAtTime(380, t);
    whistleOsc.frequency.exponentialRampToValueAtTime(1450, t + 0.45);

    whistleGain.gain.setValueAtTime(0.001, t);
    whistleGain.gain.linearRampToValueAtTime(0.12 * this.volume, t + 0.12);
    whistleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);

    whistleOsc.connect(whistleGain);
    whistleGain.connect(this.ctx.destination);
    whistleOsc.start(t);
    whistleOsc.stop(t + 0.48);
  }

  /**
   * Synthesize powerful, realistic firework shell explosion & shimmering crackle
   */
  playFireworkBurst() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Sharp initial shell detonation crack (0ms - 25ms concussive pop)
    const crackBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
    const crackData = crackBuffer.getChannelData(0);
    for (let i = 0; i < crackData.length; i++) {
      crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
    }
    const crackSource = this.ctx.createBufferSource();
    crackSource.buffer = crackBuffer;

    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(600, t);

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.55 * this.volume, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    crackSource.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.ctx.destination);
    crackSource.start(t);

    // 2. Heavy low-frequency sub-bass detonation boom (chest thump)
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(160, t);
    boomOsc.frequency.exponentialRampToValueAtTime(32, t + 0.55);

    boomGain.gain.setValueAtTime(0.65 * this.volume, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boomOsc.start(t);
    boomOsc.stop(t + 0.6);

    // 3. Shimmering Dragon-Egg Crackle & Sparkle Pops (series of 8-12 micro-pops)
    const numPops = 8 + Math.floor(Math.random() * 5);
    for (let p = 0; p < numPops; p++) {
      const popDelay = 0.12 + Math.random() * 0.45;
      const popTime = t + popDelay;

      const popBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.025), this.ctx.sampleRate);
      const popData = popBuffer.getChannelData(0);
      for (let i = 0; i < popData.length; i++) {
        popData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.005));
      }
      const popSource = this.ctx.createBufferSource();
      popSource.buffer = popBuffer;

      const popFilter = this.ctx.createBiquadFilter();
      popFilter.type = 'bandpass';
      popFilter.frequency.setValueAtTime(1800 + Math.random() * 2200, popTime);
      popFilter.Q.setValueAtTime(4, popTime);

      const popGain = this.ctx.createGain();
      popGain.gain.setValueAtTime((0.15 + Math.random() * 0.15) * this.volume, popTime);
      popGain.gain.exponentialRampToValueAtTime(0.0001, popTime + 0.035);

      popSource.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(this.ctx.destination);
      popSource.start(popTime);
    }
  }

  /**
   * Synthesize tank diesel engine rumble / tread movement
   */
  playTankEngine() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.22);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25 * this.volume, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Synthesize acoustic radar scanner ping
   */
  playScannerPing() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.15);

    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Synthesize 105mm tank cannon firing
   */
  playCannonFire() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);

    gain.gain.setValueAtTime(0.8 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  /**
   * Synthesize ground mine detonation explosion
   */
  playMineExplosion() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 1. Low thunderous boom
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(160, t);
    boom.frequency.exponentialRampToValueAtTime(30, t + 0.55);

    boomGain.gain.setValueAtTime(0.85 * this.volume, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    boom.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boom.start(t);
    boom.stop(t + 0.6);

    // 2. White noise debris blast
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
  }

  /**
   * Synthesize flag placement / stake ping
   */
  playFlag() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.08);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Synthesize cheerful ascending success chime
   */
  playSuccess() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        const dur = (idx === notes.length - 1) ? 0.35 : 0.12;
        gain.gain.setValueAtTime(0.25 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + dur);
      }, idx * 60);
    });
  }

  /**
   * Synthesize heavy diesel tank engine & tread rumble
   */
  playTankEngine() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Low rumble oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(42, t);
    osc.frequency.linearRampToValueAtTime(58, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.28);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22 * this.volume, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }
}

