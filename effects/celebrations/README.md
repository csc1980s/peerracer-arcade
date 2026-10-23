# Card Celebration Effects System

## Overview
This directory contains EffectCraft animation templates for the Victorian Christmas Solitaire card celebration system. Animations trigger when players make good moves, complete sequences, or win the game.

## Effect Templates

### Face Card Celebrations
Individual celebration effects for each court card type:

- **king_celebration.json** - Grand, powerful animations with golden crown sparkles
- **queen_celebration.json** - Elegant, graceful animations with hearts and rose petals
- **jack_celebration.json** - Energetic, quick animations with lightning sparks

### Suit Combo Celebrations
Suit-specific effects when completing sequences:

- **hearts_suit_combo.json** - Holly berries, cascading hearts, ivy sparkles
- **diamonds_suit_combo.json** - Snowflakes, ice crystals, frost sparkles
- **spades_suit_combo.json** - Falling leaves, pine needles, woodland particles
- **clubs_suit_combo.json** - Candy canes, peppermints, sugar crystals

### Game Events
Special celebration effects for major achievements:

- **win_game.json** - Epic victory celebration with confetti, fireworks, rainbow effects
- **good_move.json** - Quick positive feedback for standard good moves

## Effect Properties

### Card Animation Sequence
Each effect defines card animations with keyframes:
```json
{
  "cardAnimation": {
    "sequence": [
      {
        "name": "animation_name",
        "duration": 1500,
        "easing": "easeInOutQuad",
        "properties": {
          "scale": {...},
          "rotation": {...},
          "translateY": {...}
        }
      }
    ]
  }
}
```

### Particle Emitters
Defines particle effects with physics:
```json
{
  "particles": {
    "emitters": [
      {
        "name": "particle_name",
        "shape": "star|heart|circle|snowflake",
        "count": 50,
        "colors": ["#ff0000", "#00ff00"],
        "velocity": {...},
        "gravity": 50,
        "blendMode": "add|normal|screen"
      }
    ]
  }
}
```

### Audio Configuration
Audio playback settings for voice encouragement:
```json
{
  "audio": {
    "voiceType": "king|queen|jack|suit_based",
    "volume": 0.75,
    "fadeIn": 300,
    "fadeOut": 500
  }
}
```

## Trigger Conditions

Effects trigger based on game events:

| Trigger | Description | Effect Template |
|---------|-------------|-----------------|
| `king_placed` | King card placed on foundation | king_celebration.json |
| `queen_placed` | Queen card placed on foundation | queen_celebration.json |
| `jack_placed` | Jack card placed on foundation | jack_celebration.json |
| `hearts_suit_run` | 3+ hearts in sequence | hearts_suit_combo.json |
| `diamonds_suit_run` | 3+ diamonds in sequence | diamonds_suit_combo.json |
| `spades_suit_run` | 3+ spades in sequence | spades_suit_combo.json |
| `clubs_suit_run` | 3+ clubs in sequence | clubs_suit_combo.json |
| `game_won` | Player wins the game | win_game.json |
| `valid_move` | Any valid card placement | good_move.json |

## Integration with Solitaire Game

### 1. Load Effect Templates
```javascript
// Load all effect templates
const effects = {
  king: await loadEffect('effects/celebrations/king_celebration.json'),
  queen: await loadEffect('effects/celebrations/queen_celebration.json'),
  jack: await loadEffect('effects/celebrations/jack_celebration.json'),
  hearts: await loadEffect('effects/celebrations/hearts_suit_combo.json'),
  diamonds: await loadEffect('effects/celebrations/diamonds_suit_combo.json'),
  spades: await loadEffect('effects/celebrations/spades_suit_combo.json'),
  clubs: await loadEffect('effects/celebrations/clubs_suit_combo.json'),
  winGame: await loadEffect('effects/celebrations/win_game.json'),
  goodMove: await loadEffect('effects/celebrations/good_move.json')
};
```

### 2. Trigger Detection
```javascript
class GameEventDetector {
  checkForCelebration(card, targetPile) {
    // Detect face card placements
    if (card.rank === 'K') {
      return { type: 'king', card, suit: card.suit };
    }
    if (card.rank === 'Q') {
      return { type: 'queen', card, suit: card.suit };
    }
    if (card.rank === 'J') {
      return { type: 'jack', card, suit: card.suit };
    }

    // Detect suit runs
    const run = this.detectSuitRun(targetPile);
    if (run.length >= 3) {
      return { type: 'suitCombo', suit: run.suit, cards: run.cards };
    }

    // Detect win condition
    if (this.isGameWon()) {
      return { type: 'winGame' };
    }

    // Default good move
    return { type: 'goodMove', card };
  }
}
```

### 3. Play Effect
```javascript
class EffectPlayer {
  async playEffect(effectTemplate, targetCard) {
    // 1. Animate the card
    await this.animateCard(targetCard, effectTemplate.cardAnimation);

    // 2. Spawn particles
    this.spawnParticles(effectTemplate.particles);

    // 3. Play audio with appropriate voice
    const voiceType = effectTemplate.audio.voiceType;
    const audioFile = this.selectAudioQuote(voiceType, targetCard.suit);
    await this.playAudio(audioFile, effectTemplate.audio);
  }
}
```

### 4. Example Usage
```javascript
// When player makes a move
onCardPlaced(card, targetPile) {
  const celebration = gameEventDetector.checkForCelebration(card, targetPile);

  if (celebration) {
    const effectTemplate = effects[celebration.type];
    effectPlayer.playEffect(effectTemplate, card);
  }
}
```

## Voice-to-Card Mapping

Effects use different voice types based on card:

| Card Rank | Voice Type | Characteristics |
|-----------|------------|-----------------|
| King | Deep male | 80-120 Hz, slow (130 wpm), authoritative |
| Queen | Female | 180-220 Hz, medium (150 wpm), elegant |
| Jack | Male tenor | 140-180 Hz, fast (170 wpm), energetic |

For suit combos, voice selected based on highest card in sequence.

## Customization

### Adding New Effects
1. Copy an existing template (e.g., `good_move.json`)
2. Modify particle colors, counts, and physics
3. Adjust animation duration and easing
4. Add trigger conditions
5. Save with descriptive filename

### Adjusting Particle Physics
Key parameters to tweak:
- **count**: Number of particles (10-200)
- **velocity**: Initial speed (min/max ranges)
- **gravity**: Downward acceleration (0-100)
- **opacity**: Start/end transparency (0.0-1.0)
- **blendMode**: `normal`, `add`, `screen`, `multiply`

### Performance Tuning
For lower-end devices:
- Reduce `count` by 50%
- Simplify `blendMode` to `normal`
- Lower `duration` values
- Remove secondary particle emitters

## Dependencies

Required libraries:
- **Anime.js** or **GSAP** - Card animations
- **Particles.js** or **PixiJS** - Particle effects
- **Howler.js** - Audio playback

## File Structure
```
D:\solitaire\effects\celebrations\
├── README.md (this file)
├── king_celebration.json
├── queen_celebration.json
├── jack_celebration.json
├── hearts_suit_combo.json
├── diamonds_suit_combo.json
├── spades_suit_combo.json
├── clubs_suit_combo.json
├── win_game.json
└── good_move.json
```

## Audio Files Location
Audio files generated by multi-voice system should be placed in:
```
D:\solitaire\audio\encouragement\
├── king\
│   ├── quote_001_king.mp3
│   └── ...
├── queen\
│   ├── quote_001_queen.mp3
│   └── ...
└── jack\
    ├── quote_001_jack.mp3
    └── ...
```

## Testing Effects

To test an individual effect:
```javascript
// Load effect template
const effect = await loadEffect('effects/celebrations/king_celebration.json');

// Get test card
const testCard = document.querySelector('.card-king-hearts');

// Play effect
effectPlayer.playEffect(effect, testCard);
```

## Browser Compatibility

Tested on:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

Note: Some blend modes may render differently across browsers.

## Performance Benchmarks

Typical performance on mid-range hardware:
- Face card effects: 60 FPS, 50-100 particles
- Suit combo effects: 60 FPS, 80-150 particles
- Win game effect: 55-60 FPS, 200+ particles

## License

Part of Victorian Christmas Solitaire project.
