# Card Celebration System - Integration Guide

## Overview
Complete guide for integrating the celebration system into your Victorian Christmas Solitaire game.

## Prerequisites

### Required Files
All celebration system files should be in place:

```
D:\solitaire\
├── effects\
│   └── celebrations\           # 9 effect templates + index
├── audio\
│   └── encouragement\          # Generated audio files (king/queen/jack)
└── src\
    ├── triggers\
    │   ├── GameEventDetector.js
    │   ├── TriggerConditions.js
    │   └── EventMapper.js
    └── effects\
        ├── EffectPlayer.js
        └── AudioManager.js
```

### Required Libraries

Add to your HTML `<head>`:

```html
<!-- Animation Library (choose one) -->
<!-- Option A: Anime.js (recommended) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>

<!-- Option B: GSAP -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

<!-- Celebration System Scripts -->
<script src="src/triggers/GameEventDetector.js"></script>
<script src="src/triggers/TriggerConditions.js"></script>
<script src="src/triggers/EventMapper.js"></script>
<script src="src/effects/EffectPlayer.js"></script>
<script src="src/effects/AudioManager.js"></script>
```

## Step-by-Step Integration

### Step 1: Initialize Celebration System

Add to your game initialization:

```javascript
class SolitaireGame {
  constructor() {
    // ... existing game code ...

    // Initialize celebration system
    this.celebrationSystem = {
      detector: new GameEventDetector(),
      mapper: new EventMapper(),
      effectPlayer: new EffectPlayer({
        animationLibrary: 'anime', // or 'gsap'
        particlesEnabled: true,
        maxConcurrentEffects: 3
      }),
      audioManager: new AudioManager({
        masterVolume: 0.75,
        audioEnabled: true,
        maxSimultaneous: 3
      })
    };

    this.initCelebrationSystem();
  }

  async initCelebrationSystem() {
    console.log('🎉 Initializing celebration system...');

    // Load effect templates
    await this.celebrationSystem.mapper.loadEffectTemplates();

    // Load audio manifests
    await this.celebrationSystem.audioManager.loadAllManifests();

    // Preload some audio for faster playback
    await this.celebrationSystem.audioManager.preloadAll();

    console.log('✅ Celebration system ready');
  }
}
```

### Step 2: Hook into Card Move Events

Modify your card movement handler:

```javascript
class SolitaireGame {
  // ... existing code ...

  moveCard(card, fromPile, toPile) {
    // Perform the actual move
    const moveSuccess = this.performMove(card, fromPile, toPile);

    if (!moveSuccess) {
      return false;
    }

    // Update display
    this.updateDisplay();

    // CHECK FOR CELEBRATION
    this.checkForCelebration({
      card: card,
      fromPile: fromPile,
      toPile: toPile,
      timestamp: Date.now(),
      causedFlip: this.didMoveFlipCard(fromPile),
      invalid: false
    });

    return true;
  }

  async checkForCelebration(move) {
    const { detector, mapper, effectPlayer, audioManager } = this.celebrationSystem;

    // Detect celebration event
    const celebration = detector.detectCelebration(move);

    if (!celebration) {
      return; // No celebration triggered
    }

    console.log('🎊 Celebration triggered:', celebration.type);

    // Map to effect and audio
    const config = mapper.mapTriggerToCelebration(
      celebration.type,
      move,
      detector
    );

    // Load effect template
    const effectTemplate = await mapper.getEffectTemplate(config.effectTemplate);

    if (!effectTemplate) {
      console.error('Failed to load effect template:', config.effectTemplate);
      return;
    }

    // Get card DOM element
    const cardElement = this.getCardElement(move.card);

    if (!cardElement) {
      console.error('Card element not found');
      return;
    }

    // Play visual effect
    effectPlayer.playEffect(effectTemplate, cardElement);

    // Play audio encouragement
    audioManager.playAudio(config, effectTemplate.audio);
  }

  getCardElement(card) {
    // Return the DOM element for the card
    // This depends on your existing game structure
    const cardId = `card-${card.suit}-${card.rank}`;
    return document.getElementById(cardId);
  }

  didMoveFlipCard(pile) {
    // Check if this move caused a card to flip
    // This depends on your game logic
    return pile.type === 'tableau' &&
           pile.cards.length > 0 &&
           pile.cards[pile.cards.length - 1].faceDown === false;
  }
}
```

### Step 3: Track Game State

Update your game state tracking:

```javascript
class SolitaireGame {
  constructor() {
    // ... existing code ...

    // Ensure game state is accessible to detector
    this.celebrationSystem.detector.foundationCards = {
      hearts: [],
      diamonds: [],
      spades: [],
      clubs: []
    };
  }

  updateFoundation(card, suit) {
    // When a card is added to foundation
    this.celebrationSystem.detector.foundationCards[suit].push(card);

    // ... rest of your foundation logic ...
  }
}
```

### Step 4: Handle New Game

Reset celebration system when starting new game:

```javascript
class SolitaireGame {
  newGame() {
    // ... existing new game code ...

    // Reset celebration system
    this.celebrationSystem.detector.reset();
    this.celebrationSystem.effectPlayer.stopAll();
    this.celebrationSystem.audioManager.stopAll();

    console.log('Celebration system reset for new game');
  }
}
```

### Step 5: Add User Controls (Optional)

Add settings for audio/effects:

```javascript
class SolitaireGame {
  // Audio volume control
  setAudioVolume(volume) {
    this.celebrationSystem.audioManager.setVolume(volume);
  }

  // Enable/disable audio
  toggleAudio(enabled) {
    this.celebrationSystem.audioManager.setEnabled(enabled);
  }

  // Enable/disable particles
  toggleParticles(enabled) {
    this.celebrationSystem.effectPlayer.particlesEnabled = enabled;
  }

  // Test celebration system
  async testCelebration(type = 'king') {
    const testCard = {
      rank: type === 'king' ? 'K' : (type === 'queen' ? 'Q' : 'J'),
      suit: 'hearts'
    };

    const testMove = {
      card: testCard,
      fromPile: { type: 'tableau' },
      toPile: { type: 'foundation' },
      timestamp: Date.now(),
      causedFlip: false,
      invalid: false
    };

    await this.checkForCelebration(testMove);
  }
}
```

## HTML Structure Requirements

Your cards need to be DOM elements with unique IDs:

```html
<div id="game-container">
  <!-- Card example -->
  <div id="card-hearts-K" class="card king hearts" data-rank="K" data-suit="hearts">
    <!-- Card content -->
  </div>
</div>
```

## CSS Setup

Add basic styles for particles:

```css
.celebration-particle {
  position: absolute;
  pointer-events: none;
  will-change: transform, opacity;
}

#game-container {
  position: relative;
  transition: transform 0.1s;
}
```

## Testing the Integration

### Test Individual Components

```javascript
// Test effect player
const testCard = document.getElementById('card-hearts-K');
const testEffect = await celebrationSystem.mapper.getEffectTemplate('king_celebration');
celebrationSystem.effectPlayer.playEffect(testEffect, testCard);

// Test audio
celebrationSystem.audioManager.testVoice('king');

// Test detector
const testMove = {
  card: { rank: 'K', suit: 'hearts' },
  fromPile: { type: 'tableau' },
  toPile: { type: 'foundation' },
  timestamp: Date.now()
};
const celebration = celebrationSystem.detector.detectCelebration(testMove);
console.log('Detected:', celebration);
```

### Test Full Flow

```javascript
// Add to browser console
game.testCelebration('king');   // Test king celebration
game.testCelebration('queen');  // Test queen celebration
game.testCelebration('jack');   // Test jack celebration
```

## Common Integration Patterns

### Pattern 1: Minimal Integration

If you just want basic celebrations:

```javascript
// Simplified version
function onCardMoved(card, fromPile, toPile) {
  // Your existing move logic...

  // Simple celebration check
  if (toPile.type === 'foundation') {
    if (card.rank === 'K') triggerCelebration('king', card);
    else if (card.rank === 'Q') triggerCelebration('queen', card);
    else if (card.rank === 'J') triggerCelebration('jack', card);
  }
}

async function triggerCelebration(type, card) {
  const effect = await mapper.getEffectTemplate(`${type}_celebration`);
  const cardEl = document.getElementById(`card-${card.suit}-${card.rank}`);
  effectPlayer.playEffect(effect, cardEl);
  audioManager.playAudio({ voiceType: type, card }, effect.audio);
}
```

### Pattern 2: Advanced Integration

For full celebration system with all triggers:

```javascript
// Use full detection system
async function onCardMoved(card, fromPile, toPile) {
  const move = {
    card,
    fromPile,
    toPile,
    timestamp: Date.now(),
    causedFlip: checkIfFlipped(fromPile),
    invalid: false
  };

  // Full detection
  const trigger = TriggerConditions.checkTriggers(move, detector);

  if (trigger) {
    const config = mapper.mapTriggerToCelebration(
      trigger.triggerId,
      move,
      detector
    );

    await playCelebration(config);
  }
}
```

## Troubleshooting

### Issue: No effects playing

**Check:**
1. Effect templates loaded: `mapper.effectTemplates !== null`
2. Card element exists: `document.getElementById('card-...')` returns element
3. Animation library loaded: `typeof anime !== 'undefined'`

### Issue: No audio playing

**Check:**
1. Audio manifest loaded: `audioManager.audioManifests.king !== null`
2. Audio files exist in `audio/encouragement/`
3. Browser allows audio autoplay (may need user interaction first)
4. Audio enabled: `audioManager.audioEnabled === true`

### Issue: Effects playing but no particles

**Check:**
1. Particles enabled: `effectPlayer.particlesEnabled === true`
2. Canvas/DOM ready
3. Browser performance (try reducing particle count)

### Issue: Multiple celebrations at once

**Solution:**
Adjust cooldown and max concurrent:
```javascript
effectPlayer.maxConcurrentEffects = 1;
audioManager.maxSimultaneous = 1;
```

## Performance Optimization

### For Low-End Devices

```javascript
const effectPlayer = new EffectPlayer({
  performanceMode: 'low',
  particlesEnabled: true,
  maxConcurrentEffects: 1
});

// Reduce particle counts in effect templates
// Edit effects/celebrations/*.json
// Lower "count" values by 50%
```

### For High-End Devices

```javascript
const effectPlayer = new EffectPlayer({
  performanceMode: 'high',
  particlesEnabled: true,
  maxConcurrentEffects: 5
});
```

## Browser Compatibility

**Minimum Requirements:**
- Chrome 55+
- Firefox 52+
- Safari 10.1+
- Edge 15+

**Features Used:**
- ES6 Classes
- Async/Await
- Fetch API
- Audio API
- RequestAnimationFrame

## Next Steps

After integration:

1. ✅ Test all trigger conditions
2. ✅ Adjust effect timing and particles
3. ✅ Fine-tune audio volumes
4. ✅ Add user settings panel
5. ✅ Optimize for your target devices

## Example: Complete Minimal Integration

Here's a complete minimal example:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Victorian Christmas Solitaire</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>
  <script src="src/triggers/GameEventDetector.js"></script>
  <script src="src/triggers/EventMapper.js"></script>
  <script src="src/effects/EffectPlayer.js"></script>
  <script src="src/effects/AudioManager.js"></script>
</head>
<body>
  <div id="game-container">
    <div id="card-hearts-K" class="card">King of Hearts</div>
  </div>

  <script>
    // Initialize
    const detector = new GameEventDetector();
    const mapper = new EventMapper();
    const effectPlayer = new EffectPlayer({ animationLibrary: 'anime' });
    const audioManager = new AudioManager();

    // Load assets
    (async () => {
      await mapper.loadEffectTemplates();
      await audioManager.loadAllManifests();
      console.log('✅ Ready');
    })();

    // Card click handler
    document.getElementById('card-hearts-K').addEventListener('click', async () => {
      const move = {
        card: { rank: 'K', suit: 'hearts' },
        fromPile: { type: 'tableau' },
        toPile: { type: 'foundation' },
        timestamp: Date.now()
      };

      const celebration = detector.detectCelebration(move);

      if (celebration) {
        const config = mapper.mapTriggerToCelebration(celebration.type, move, detector);
        const effect = await mapper.getEffectTemplate(config.effectTemplate);
        const cardEl = document.getElementById('card-hearts-K');

        effectPlayer.playEffect(effect, cardEl);
        audioManager.playAudio(config, effect.audio);
      }
    });
  </script>
</body>
</html>
```

## Support

For issues or questions:
- Check README files in each component directory
- Review CELEBRATION_SYSTEM_STATUS.md for overall status
- Test individual components before full integration

---

**Congratulations!** Your Victorian Christmas Solitaire now has a complete celebration system! 🎉🎄
