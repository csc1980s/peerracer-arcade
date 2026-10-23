# Animation Trigger Detection System

## Overview
The trigger detection system monitors gameplay and detects celebration-worthy events, automatically triggering appropriate visual effects and audio encouragement.

## Components

### 1. GameEventDetector.js
Main event detection class that monitors game state and identifies celebration triggers.

**Key Features:**
- Tracks move history
- Detects face card placements (K, Q, J)
- Identifies suit runs and sequences
- Monitors foundation progress
- Detects win conditions
- Prevents celebration spam with cooldown system

**Usage:**
```javascript
const detector = new GameEventDetector();

// After each card move
const celebration = detector.detectCelebration({
  card: movedCard,
  fromPile: sourcePile,
  toPile: targetPile,
  timestamp: Date.now()
});

if (celebration) {
  playEffect(celebration);
}
```

### 2. TriggerConditions.js
Defines all trigger conditions with priorities and cooldowns.

**Trigger Categories:**
- **Face Cards**: king_placed, queen_placed, jack_placed, etc.
- **Suit Combos**: hearts_suit_run, diamonds_suit_run, etc.
- **Game Events**: game_won, perfect_game, all_suits_complete
- **Good Moves**: ace_to_foundation, card_flip, tableau_clear

**Usage:**
```javascript
const match = TriggerConditions.checkTriggers(move, gameState);

if (match) {
  console.log(`Triggered: ${match.triggerId}`);
  console.log(`Priority: ${match.trigger.priority}`);
}
```

### 3. EventMapper.js
Maps detected triggers to EffectCraft templates and audio files.

**Key Features:**
- Loads effect templates from `effects/celebrations/`
- Loads audio manifest from `audio/encouragement/`
- Maps triggers to appropriate effects
- Selects voice type based on card/event
- Provides random audio quote selection

**Usage:**
```javascript
const mapper = new EventMapper();
await mapper.loadEffectTemplates();
await mapper.loadAudioManifest();

const celebration = mapper.mapTriggerToCelebration(
  triggerId,
  move,
  gameState
);

// celebration contains:
// - effectTemplate: which effect to play
// - voiceType: which voice to use
// - audioFile: selected audio quote
```

## Trigger Priority System

Triggers are checked in priority order (highest first):

| Priority | Trigger Type | Examples |
|----------|--------------|----------|
| 10 | Game completion | game_won, perfect_game |
| 9 | Suit completion | hearts_sequence_complete |
| 8 | Face cards | king_placed, queen_placed, jack_placed |
| 7 | Face card combos | all_hearts_face_cards, king_sequence |
| 6 | Suit runs | hearts_suit_run, high_card_combo |
| 5 | Good moves | ace_to_foundation, tableau_clear |
| 4 | Card flips | card_flip |
| 1 | Basic moves | valid_move |

## Cooldown System

Prevents celebration spam by enforcing cooldowns:

- **No cooldown**: Face cards, suit completions, win events
- **1000ms**: Ace placements
- **2000ms**: King/Queen/Jack sequences, card flips
- **3000ms**: Suit runs, high card combos
- **4000ms**: Multiple good moves
- **5000ms**: Valid moves (with 30% probability)

## Integration Example

Complete integration with solitaire game:

```javascript
// Initialize system
const detector = new GameEventDetector();
const mapper = new EventMapper();

// Load assets on game start
async function initCelebrationSystem() {
  await mapper.loadEffectTemplates();
  await mapper.loadAudioManifest();
  console.log('✅ Celebration system ready');
}

// Handle card moves
function onCardMoved(card, fromPile, toPile) {
  const move = {
    card,
    fromPile,
    toPile,
    timestamp: Date.now(),
    causedFlip: didFlipCard(fromPile),
    invalid: false
  };

  // Detect celebration
  const celebration = detector.detectCelebration(move);

  if (celebration) {
    // Map to effect and audio
    const config = mapper.mapTriggerToCelebration(
      celebration.type,
      move,
      detector
    );

    // Play celebration
    playCelebration(config);
  }
}

// Play celebration
async function playCelebration(config) {
  // Load effect template
  const effect = await mapper.getEffectTemplate(config.effectTemplate);

  // Load audio
  const audio = await mapper.getRandomAudioQuote(
    config.voiceType,
    config.card.suit
  );

  // Trigger effect player
  effectPlayer.playEffect(effect, config.card);

  // Play audio
  if (audio) {
    audioPlayer.play(audio.path, effect.audio);
  }
}
```

## Game State Requirements

The detector needs access to game state:

```javascript
const gameState = {
  moveHistory: [],          // Array of recent moves
  consecutiveGoodMoves: 0,  // Counter for streaks
  foundationCards: {        // Cards on foundation
    hearts: [],
    diamonds: [],
    spades: [],
    clubs: []
  },
  lastTriggered: {},        // Cooldown tracking
  lastCelebration: null     // Timestamp of last celebration
};
```

## Testing Triggers

Test individual triggers:

```javascript
// Test king placement
const testMove = {
  card: { rank: 'K', suit: 'hearts' },
  fromPile: { type: 'tableau' },
  toPile: { type: 'foundation' },
  timestamp: Date.now()
};

const celebration = detector.detectCelebration(testMove);
console.log('Celebration:', celebration);

// Test suit run
detector.foundationCards.hearts = [
  { rank: 'A', suit: 'hearts' },
  { rank: '2', suit: 'hearts' },
  { rank: '3', suit: 'hearts' }
];

const runMove = {
  card: { rank: '4', suit: 'hearts' },
  toPile: { type: 'foundation' },
  timestamp: Date.now()
};

const suitRun = detector.detectCelebration(runMove);
console.log('Suit run:', suitRun);
```

## Trigger to Effect Mapping

| Trigger | Effect Template | Voice Type |
|---------|----------------|------------|
| king_placed | king_celebration | king |
| queen_placed | queen_celebration | queen |
| jack_placed | jack_celebration | jack |
| hearts_suit_run | hearts_suit_combo | suit_based |
| diamonds_suit_run | diamonds_suit_combo | suit_based |
| spades_suit_run | spades_suit_combo | suit_based |
| clubs_suit_run | clubs_suit_combo | suit_based |
| game_won | win_game | random |
| ace_to_foundation | good_move | suit_based |

## Voice Resolution

**suit_based** voice selection:
- Card is King → use king voice
- Card is Queen → use queen voice
- Card is Jack → use jack voice
- Card is other rank → use suit preference:
  - Hearts: queen
  - Diamonds: queen
  - Spades: king
  - Clubs: queen

**random** voice selection:
- Randomly picks king, queen, or jack

## Performance Considerations

- **Move history**: Limited to last 10 moves to prevent memory bloat
- **Cooldowns**: Prevent excessive celebrations
- **Priority system**: Ensures important events take precedence
- **Probability checks**: Good moves only celebrate 30% of the time

## Debugging

Enable debug mode:

```javascript
detector.debug = true; // Log all trigger checks

// View current stats
console.log(detector.getStats());

// Output:
// {
//   totalMoves: 45,
//   consecutiveGoodMoves: 3,
//   foundationProgress: {
//     hearts: 7,
//     diamonds: 5,
//     spades: 8,
//     clubs: 4
//   },
//   gameComplete: false,
//   perfectGame: true
// }
```

## File Structure

```
D:\solitaire\src\triggers\
├── README.md (this file)
├── GameEventDetector.js
├── TriggerConditions.js
└── EventMapper.js
```

## Dependencies

Required assets:
- `effects/celebrations/*.json` - Effect templates
- `audio/encouragement/master_manifest.json` - Audio manifest
- `audio/encouragement/[voice]/manifest.json` - Voice manifests

## Next Steps

1. ✅ Create trigger detection system
2. ⏸️ Integrate with game engine
3. ⏸️ Create EffectPlayer class
4. ⏸️ Test all trigger conditions
5. ⏸️ Fine-tune priorities and cooldowns

## Browser Compatibility

- ES6 classes and async/await required
- Chrome 55+, Firefox 52+, Safari 10.1+, Edge 15+

## License

Part of Victorian Christmas Solitaire celebration system.
