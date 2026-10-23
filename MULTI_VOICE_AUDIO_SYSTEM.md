# 🎤 Multi-Voice Audio Celebration System
## Different Voices for Kings, Queens, and Jacks

---

## 🗣️ VOICE CHARACTER SPECIFICATIONS

### **KING Voice** - Deep, Regal, Authoritative
**Character:** Wise monarch, powerful, commanding
**Voice Type:** Deep bass, slow cadence, noble tone
**Pitch:** Low (80-120 Hz)
**Speed:** Slow (130 words/min)
**Example Quotes:**
- "Magnificent move, worthy of royalty!"
- "A king recognizes excellence when he sees it!"
- "Your strategic brilliance honors the throne!"

---

### **QUEEN Voice** - Lady's Voice, Elegant, Warm
**Character:** Graceful, encouraging, sophisticated
**Voice Type:** Female, melodic, gentle but confident
**Pitch:** Medium-high (180-220 Hz)
**Speed:** Medium (150 words/min)
**Example Quotes:**
- "Darling, that was absolutely brilliant!"
- "Such grace and elegance in your play!"
- "You're a gem, my dear!"

---

### **JACK Voice** - Man's Mid-Range, Energetic, Friendly
**Character:** Young soldier, enthusiastic, upbeat
**Voice Type:** Male tenor, bright, energetic
**Pitch:** Medium (140-180 Hz)
**Speed:** Fast (170 words/min)
**Example Quotes:**
- "Outstanding move, soldier!"
- "You're on fire!"
- "Way to go, that was smooth!"

---

## 🔧 PYTHON TEXT-TO-SPEECH SETUP (FREE)

### **Installation:**
```bash
pip install pyttsx3
pip install pywin32  # For Windows voices
```

### **Voice Configuration Script:**
```python
# generate_multivoice_quotes.py
import pyttsx3
import json
import os

class MultiVoiceGenerator:
    def __init__(self):
        self.engine = pyttsx3.init()
        self.voices = self.engine.getProperty('voices')

        # Find appropriate voices (Windows has multiple)
        self.king_voice = self.find_voice('male', 'deep')
        self.queen_voice = self.find_voice('female')
        self.jack_voice = self.find_voice('male', 'mid')

    def find_voice(self, gender, tone='normal'):
        """Find best matching voice"""
        for voice in self.voices:
            voice_id = voice.id.lower()

            # King: Deep male voice
            if gender == 'male' and tone == 'deep':
                if 'david' in voice_id or 'george' in voice_id:
                    return voice.id
                if 'male' in voice_id:
                    return voice.id

            # Queen: Female voice
            elif gender == 'female':
                if 'zira' in voice_id or 'hazel' in voice_id or 'susan' in voice_id:
                    return voice.id
                if 'female' in voice_id:
                    return voice.id

            # Jack: Mid-range male
            elif gender == 'male' and tone == 'mid':
                if 'mark' in voice_id or 'richard' in voice_id:
                    return voice.id

        # Fallback
        return self.voices[0].id if gender == 'male' else self.voices[1].id

    def configure_king_voice(self):
        """Deep, slow, authoritative"""
        self.engine.setProperty('voice', self.king_voice)
        self.engine.setProperty('rate', 130)  # Slow
        self.engine.setProperty('volume', 1.0)
        self.engine.setProperty('pitch', 80)  # Low pitch (if supported)

    def configure_queen_voice(self):
        """Elegant, warm, feminine"""
        self.engine.setProperty('voice', self.queen_voice)
        self.engine.setProperty('rate', 150)  # Medium
        self.engine.setProperty('volume', 0.95)
        self.engine.setProperty('pitch', 200)  # Higher pitch

    def configure_jack_voice(self):
        """Energetic, friendly, upbeat"""
        self.engine.setProperty('voice', self.jack_voice)
        self.engine.setProperty('rate', 170)  # Fast
        self.engine.setProperty('volume', 1.0)
        self.engine.setProperty('pitch', 160)  # Mid-range

    def generate_audio(self, text, voice_type, filename):
        """Generate audio file with specified voice"""

        if voice_type == 'king':
            self.configure_king_voice()
        elif voice_type == 'queen':
            self.configure_queen_voice()
        elif voice_type == 'jack':
            self.configure_jack_voice()

        print(f"Generating {voice_type} voice: {text[:50]}...")

        # Save to file
        self.engine.save_to_file(text, filename)
        self.engine.runAndWait()

    def generate_all_quotes(self, quotes_data, output_dir):
        """Generate all audio files from quotes JSON"""

        os.makedirs(output_dir, exist_ok=True)

        # Counter for unique filenames
        counters = {'king': 1, 'queen': 1, 'jack': 1}

        for suit in ['hearts', 'diamonds', 'spades', 'clubs']:
            for card_type in ['king', 'queen', 'jack']:
                quotes = quotes_data[suit][card_type]

                for quote in quotes:
                    filename = f"{output_dir}/{suit}_{card_type}_{counters[card_type]:02d}.mp3"
                    self.generate_audio(quote, card_type, filename)
                    counters[card_type] += 1

# Usage
if __name__ == "__main__":
    generator = MultiVoiceGenerator()

    # Load quotes from your Word document (converted to JSON)
    with open('D:/solitaire/config/encouragement_quotes.json', 'r') as f:
        quotes = json.load(f)

    generator.generate_all_quotes(quotes, 'D:/solitaire/assets/audio/quotes')
```

---

## 📝 QUOTE STRUCTURE (Convert Word Doc to This Format)

### **encouragement_quotes.json**
```json
{
  "hearts": {
    "king": [
      "Your heart is in the right place, noble one!",
      "A move worthy of the throne of hearts!",
      "Magnificent strategy, your majesty!"
    ],
    "queen": [
      "Darling, that was absolutely divine!",
      "Such grace and elegance!",
      "You're playing with heart, my dear!"
    ],
    "jack": [
      "Love that move!",
      "You're on fire with those hearts!",
      "Smooth play, soldier!"
    ]
  },
  "diamonds": {
    "king": [
      "A brilliant move, worthy of diamonds!",
      "Your wisdom shines like a diamond!",
      "Masterful strategy, your highness!"
    ],
    "queen": [
      "You're a true gem, darling!",
      "Sparkling performance, my dear!",
      "Simply radiant, brilliant move!"
    ],
    "jack": [
      "Diamond quality right there!",
      "You're crushing it!",
      "Brilliant play!"
    ]
  },
  "spades": {
    "king": [
      "Rooted in excellence, well done!",
      "A powerful move from the forest king!",
      "Your strength is natural and true!"
    ],
    "queen": [
      "Growing stronger, my dear!",
      "Nature's wisdom guides you!",
      "Such natural talent!"
    ],
    "jack": [
      "You're digging deep!",
      "Natural talent on display!",
      "Way to grow your skills!"
    ]
  },
  "clubs": {
    "king": [
      "A sweet victory awaits, your majesty!",
      "Delightful strategy, noble one!",
      "Candy-coated perfection!"
    ],
    "queen": [
      "Sweet move, darling!",
      "You're on a sugar high!",
      "Absolutely delightful!"
    ],
    "jack": [
      "Sweet!",
      "You're on a roll!",
      "That's the spirit!"
    ]
  },
  "general": {
    "king": [
      "Regal excellence!",
      "A move fit for a king!",
      "Commanding performance!"
    ],
    "queen": [
      "Absolutely marvelous!",
      "Graceful play, dear!",
      "Simply wonderful!"
    ],
    "jack": [
      "Nice one!",
      "Keep it up!",
      "You've got this!"
    ]
  }
}
```

---

## 🎨 EFFECTCRAFT INTEGRATION

### **EffectCraft Animation Setup for Each Card Type:**

#### **KING Effects** - Powerful, Grand, Majestic
```javascript
// king_celebration.effect (EffectCraft template)
{
  "name": "King Celebration",
  "particles": {
    "type": "crown_sparkles",
    "count": 50,
    "size": [8, 12],
    "colors": ["#d4af37", "#ffd700", "#b8860b"],  // Gold tones
    "lifetime": 2000,
    "speed": [2, 4],
    "gravity": 0.5,
    "emission": "burst",
    "shape": "crown"
  },
  "glow": {
    "enabled": true,
    "color": "#d4af37",
    "intensity": 0.8,
    "pulseSpeed": 0.5
  },
  "animation": {
    "cardScale": [1, 1.15, 1],
    "cardRotate": [0, 5, -5, 0],
    "duration": 1500,
    "easing": "easeInOutQuad"
  },
  "trails": {
    "enabled": true,
    "color": "#d4af37",
    "width": 3,
    "fadeSpeed": 0.8
  }
}
```

#### **QUEEN Effects** - Elegant, Graceful, Flowing
```javascript
// queen_celebration.effect
{
  "name": "Queen Celebration",
  "particles": {
    "type": "hearts_and_flowers",
    "count": 30,
    "size": [6, 10],
    "colors": ["#ff69b4", "#ffb6c1", "#ffc0cb"],  // Pink/rose tones
    "lifetime": 2500,
    "speed": [1, 3],
    "gravity": 0.3,
    "emission": "gentle_float",
    "shape": "heart"
  },
  "glow": {
    "enabled": true,
    "color": "#ffb6c1",
    "intensity": 0.6,
    "pulseSpeed": 0.7
  },
  "animation": {
    "cardScale": [1, 1.1, 1],
    "cardRotate": [0, 3, -3, 0],
    "duration": 1800,
    "easing": "easeInOutSine"
  },
  "trails": {
    "enabled": true,
    "color": "#ffb6c1",
    "width": 2,
    "fadeSpeed": 1.0
  }
}
```

#### **JACK Effects** - Energetic, Quick, Dynamic
```javascript
// jack_celebration.effect
{
  "name": "Jack Celebration",
  "particles": {
    "type": "lightning_sparks",
    "count": 40,
    "size": [4, 8],
    "colors": ["#00ffff", "#87ceeb", "#4682b4"],  // Electric blue
    "lifetime": 1000,
    "speed": [4, 7],
    "gravity": 0.2,
    "emission": "explosive",
    "shape": "star"
  },
  "glow": {
    "enabled": true,
    "color": "#00ffff",
    "intensity": 1.0,
    "pulseSpeed": 1.5
  },
  "animation": {
    "cardScale": [1, 1.2, 1],
    "cardRotate": [0, 10, -10, 0],
    "duration": 1000,
    "easing": "easeOutElastic"
  },
  "trails": {
    "enabled": true,
    "color": "#00ffff",
    "width": 4,
    "fadeSpeed": 0.5
  }
}
```

---

## 🎯 VOICE-TO-CARD MAPPING SYSTEM

### **Smart Quote Selection:**
```javascript
// QuoteSelector.js
class QuoteSelector {
  constructor(quotesData) {
    this.quotes = quotesData;
    this.playHistory = [];
    this.maxHistory = 10;
  }

  selectQuote(card) {
    // Determine card rank and suit
    const rank = card.rank;  // K, Q, J, or number
    const suit = card.suit.toLowerCase();  // hearts, diamonds, spades, clubs

    let voiceType, quotePool;

    // Select voice type based on card rank
    if (rank === 'K') {
      voiceType = 'king';
      quotePool = this.quotes[suit].king;
    } else if (rank === 'Q') {
      voiceType = 'queen';
      quotePool = this.quotes[suit].queen;
    } else if (rank === 'J') {
      voiceType = 'jack';
      quotePool = this.quotes[suit].jack;
    } else {
      // For number cards, use general quotes with mixed voices
      voiceType = this.getRandomVoice();
      quotePool = this.quotes.general[voiceType];
    }

    // Select quote, avoiding recent repeats
    const quote = this.getUniqueQuote(quotePool);

    return {
      text: quote,
      voiceType: voiceType,
      suit: suit,
      audioFile: this.getAudioFilename(suit, voiceType, quote)
    };
  }

  getUniqueQuote(pool) {
    // Filter out recently played quotes
    const available = pool.filter(q => !this.playHistory.includes(q));

    if (available.length === 0) {
      // All quotes used, reset history
      this.playHistory = [];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    const selected = available[Math.floor(Math.random() * available.length)];

    // Add to history
    this.playHistory.push(selected);
    if (this.playHistory.length > this.maxHistory) {
      this.playHistory.shift();
    }

    return selected;
  }

  getRandomVoice() {
    const voices = ['king', 'queen', 'jack'];
    return voices[Math.floor(Math.random() * voices.length)];
  }

  getAudioFilename(suit, voiceType, quote) {
    // Map quote text to pre-generated audio file
    const index = this.quotes[suit][voiceType].indexOf(quote) + 1;
    return `${suit}_${voiceType}_${index.toString().padStart(2, '0')}.mp3`;
  }
}
```

---

## 🔊 AUDIO PLAYBACK WITH VOICE ROUTING

### **AudioManager with Multi-Voice Support:**
```javascript
// AudioManager.js
class AudioManager {
  constructor() {
    this.audioPath = 'D:/solitaire/assets/audio/quotes/';
    this.currentAudio = null;
    this.volume = 0.7;
    this.enabled = true;

    // Preload common audio files
    this.audioCache = {};
  }

  play(quoteData) {
    if (!this.enabled) return;

    // Stop current audio if playing
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    const filename = quoteData.audioFile;
    const filepath = `${this.audioPath}${filename}`;

    // Check cache
    if (!this.audioCache[filename]) {
      this.audioCache[filename] = new Audio(filepath);
    }

    this.currentAudio = this.audioCache[filename];
    this.currentAudio.volume = this.volume;

    // Add voice-specific audio effects
    this.applyVoiceEffects(this.currentAudio, quoteData.voiceType);

    this.currentAudio.play().catch(err => {
      console.error('Audio playback failed:', err);
    });
  }

  applyVoiceEffects(audio, voiceType) {
    // Apply audio context filters based on voice type
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    const filter = audioContext.createBiquadFilter();

    if (voiceType === 'king') {
      // Enhance bass for king voice
      filter.type = 'lowshelf';
      filter.frequency.value = 200;
      filter.gain.value = 3;
    } else if (voiceType === 'queen') {
      // Brighten queen voice
      filter.type = 'highshelf';
      filter.frequency.value = 2000;
      filter.gain.value = 2;
    } else if (voiceType === 'jack') {
      // Mid-range boost for jack
      filter.type = 'peaking';
      filter.frequency.value = 1000;
      filter.Q.value = 0.5;
      filter.gain.value = 3;
    }

    source.connect(filter);
    filter.connect(audioContext.destination);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggle() {
    this.enabled = !this.enabled;
  }
}
```

---

## 📊 COMPLETE WORKFLOW

### **Step 1: Convert Word Doc Quotes**
```
Manual Task:
1. Open: C:\Users\caldw\Downloads\im looking for  30 encouragement quotes i can use....docx
2. Organize quotes by:
   - Suit (Hearts, Diamonds, Spades, Clubs)
   - Card type (King, Queen, Jack)
3. Save as JSON format (see encouragement_quotes.json template above)
```

### **Step 2: Generate Audio Files**
```bash
cd D:\solitaire\scripts
python generate_multivoice_quotes.py
```
**Output:** 90+ MP3 files in `D:\solitaire\assets\audio\quotes\`

### **Step 3: Create EffectCraft Templates**
```
1. Open EffectCraft
2. Create 3 effect templates:
   - king_celebration.effect (grand, powerful)
   - queen_celebration.effect (elegant, flowing)
   - jack_celebration.effect (energetic, quick)
3. Export to: D:\solitaire\assets\effects\
```

### **Step 4: Integrate with Game**
```javascript
// In your solitaire game main.js
const quoteSelector = new QuoteSelector(quotes);
const audioManager = new AudioManager();
const effectCraft = new EffectCraftRenderer();

// When card is played
function onCardPlayed(card) {
  // Select appropriate quote and voice
  const quoteData = quoteSelector.selectQuote(card);

  // Trigger EffectCraft animation based on card rank
  const effectTemplate = card.rank === 'K' ? 'king_celebration' :
                         card.rank === 'Q' ? 'queen_celebration' :
                         card.rank === 'J' ? 'jack_celebration' : null;

  if (effectTemplate) {
    effectCraft.play(effectTemplate, card.position);
  }

  // Play audio with appropriate voice
  audioManager.play(quoteData);
}
```

---

## 🎛️ USER SETTINGS PANEL

```html
<!-- Settings UI -->
<div class="celebration-settings">
  <h3>Card Celebrations</h3>

  <label>
    <input type="checkbox" id="enableCelebrations" checked>
    Enable Celebrations
  </label>

  <label>
    Audio Volume:
    <input type="range" id="audioVolume" min="0" max="100" value="70">
  </label>

  <label>
    Animation Intensity:
    <select id="animationIntensity">
      <option value="low">Low</option>
      <option value="medium" selected>Medium</option>
      <option value="high">High</option>
    </select>
  </label>

  <h4>Voice Settings</h4>
  <label>
    <input type="checkbox" id="enableKingVoice" checked>
    King Voice (Deep)
  </label>
  <label>
    <input type="checkbox" id="enableQueenVoice" checked>
    Queen Voice (Lady)
  </label>
  <label>
    <input type="checkbox" id="enableJackVoice" checked>
    Jack Voice (Mid-Range)
  </label>
</div>
```

---

## ✅ DELIVERABLES

1. **Python script:** `generate_multivoice_quotes.py`
2. **Quote data:** `encouragement_quotes.json`
3. **Audio files:** 90+ MP3 files (3 voices × 30 quotes)
4. **EffectCraft templates:** `king_celebration.effect`, `queen_celebration.effect`, `jack_celebration.effect`
5. **JavaScript classes:** `QuoteSelector.js`, `AudioManager.js`
6. **Integration code:** Main game integration
7. **Settings UI:** User controls

---

**NEXT STEP:** Please paste the contents of your Word document so I can convert the 30 quotes into the JSON format!
