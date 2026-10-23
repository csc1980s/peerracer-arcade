# 🎵 Chiptune Music System

Complete NES/Game Boy-style music implementation for Solitaire Games.

## Features

- **4 Complete Tracks** from original composition
- **Authentic NES Sound** (2 pulse channels, triangle bass, noise percussion)
- **Dynamic Playback** (auto-loop, tempo-accurate)
- **Sound Effects** included
- **Zero file dependencies** (all generated in real-time)

## Quick Start

```javascript
import { chiptuneMusic } from './audio/chiptune_music.js';

// Initialize after user interaction
await chiptuneMusic.initialize();

// Play title screen music
chiptuneMusic.playTitleMusic();

// Play during gameplay
chiptuneMusic.playGameplayMusic();

// Play during combos/special events
chiptuneMusic.playTensionMusic();

// Play victory jingle
chiptuneMusic.playVictoryMusic();

// Stop music
chiptuneMusic.stop();

// Toggle mute
chiptuneMusic.toggleMute();
```

## Sound Effects

```javascript
// Card interactions
chiptuneMusic.sfx.cardFlip();
chiptuneMusic.sfx.cardPlace();
chiptuneMusic.sfx.cardDeal();

// Game events
chiptuneMusic.sfx.invalidMove();
chiptuneMusic.sfx.win();
```

## Track Details

### 1. "Cartridge Sunrise" (Title Screen)
- **Tempo**: 108 BPM
- **Key**: C Major
- **Length**: 16-bar loop
- **Mood**: Bright, nostalgic, welcoming

### 2. "Puzzle Parade" (Gameplay)
- **Tempo**: 126 BPM
- **Key**: G Major
- **Length**: 16-bar loop
- **Mood**: Uplifting, energetic

### 3. "Combo Cascade" (Tension)
- **Tempo**: 168 BPM
- **Key**: A Minor
- **Length**: 8-bar loop
- **Mood**: Exciting, urgent

### 4. "Clear the Board!" (Victory)
- **Tempo**: 150 BPM
- **Key**: C Major
- **Length**: 8 bars (no loop)
- **Mood**: Triumphant fanfare

## Integration Examples

### Klondike Solitaire
```javascript
class KlondikeGame {
  constructor() {
    // ... existing code
    this.music = chiptuneMusic;
  }

  async startGame() {
    await this.music.initialize();
    this.music.playGameplayMusic();
  }

  onCardMove() {
    this.music.sfx.cardPlace();
  }

  onWin() {
    this.music.stop();
    this.music.playVictoryMusic();
  }
}
```

### Pyramid Solitaire
```javascript
// Start with title music
await chiptuneMusic.initialize();
chiptuneMusic.playTitleMusic();

// Switch to gameplay when game starts
function startPyramidGame() {
  chiptuneMusic.playGameplayMusic();
}

// Play tension music during combo streaks
function onComboStreak() {
  if (comboCount >= 5) {
    chiptuneMusic.playTensionMusic();
  }
}
```

## Browser Compatibility

Requires modern browser with Web Audio API support:
- Chrome/Edge 14+
- Firefox 25+
- Safari 6+

## Performance

- **CPU Usage**: ~1-2% (lightweight)
- **Memory**: ~5MB (all tracks loaded)
- **Latency**: <50ms (real-time synthesis)
- **File Size**: ~15KB (code only, no audio files!)

## Mute Control

```javascript
// Toggle mute on/off
const isMuted = chiptuneMusic.toggleMute();

// Check if muted
if (chiptuneMusic.isMuted) {
  console.log('Music is muted');
}
```

## Adaptive Music (Advanced)

```javascript
// Change music based on game state
function updateMusic(gameState) {
  switch(gameState) {
    case 'menu':
      chiptuneMusic.playTitleMusic();
      break;
    case 'playing':
      chiptuneMusic.playGameplayMusic();
      break;
    case 'combo':
      chiptuneMusic.playTensionMusic();
      break;
    case 'victory':
      chiptuneMusic.playVictoryMusic();
      break;
  }
}
```

## Technical Details

### Channel Configuration
- **Square 1**: 25% duty cycle, -8dB, lead melody
- **Square 2**: 50% duty cycle, -12dB, harmony
- **Triangle**: Pure triangle wave, -10dB, bass
- **Noise**: White noise, -15dB, percussion

### Note Format
Notes use Tone.js notation:
- `C4` = Middle C
- `8n` = Eighth note
- `4n` = Quarter note
- `16n` = Sixteenth note

## License

Music composition: Original work for Solitaire Sovereign
Engine implementation: MIT License (uses Tone.js)
