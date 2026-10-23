# Multi-Voice Audio System Setup Guide

## Overview
This audio system generates encouragement quotes with three distinct character voices:
- **King**: Deep, authoritative male voice (130 wpm, low pitch)
- **Queen**: Elegant female voice (150 wpm, medium pitch)
- **Jack**: Energetic male tenor voice (170 wpm, higher pitch)

## Quick Start

### 1. Install Python Dependencies
```bash
cd D:\solitaire\audio
pip install -r requirements.txt
```

### 2. Install FFmpeg (Optional but Recommended)
For enhanced voice effects, install FFmpeg:

**Option A - Chocolatey:**
```bash
choco install ffmpeg
```

**Option B - Winget:**
```bash
winget install ffmpeg
```

**Option C - Manual:**
Download from https://ffmpeg.org/download.html and add to PATH

### 3. Create Your Quotes File
Copy the template and add your 30 quotes:
```bash
copy encouragement_quotes_template.json encouragement_quotes.json
```

Edit `encouragement_quotes.json` and replace example quotes with your actual quotes from:
```
C:\Users\caldw\Downloads\im looking for 30 encouragement quotes i can use....docx
```

### 4. Generate Audio Files
```bash
python generate_multi_voice_audio.py
```

This will generate all audio files in `audio/encouragement/` organized by voice:
```
audio/encouragement/
├── king/
│   ├── hearts_quote_001_king.mp3
│   ├── diamonds_quote_001_king.mp3
│   └── ...
├── queen/
│   ├── hearts_quote_001_queen.mp3
│   ├── diamonds_quote_001_queen.mp3
│   └── ...
└── jack/
    ├── hearts_quote_001_jack.mp3
    ├── diamonds_quote_001_jack.mp3
    └── ...
```

## Quote File Format

### Suit-Specific Quotes
Quotes organized by suit with voice assignments:

```json
{
  "suits": {
    "hearts": [
      {
        "quote": "Your quote text here",
        "cardType": "king",
        "voicePreference": "king",
        "triggers": ["king_placed", "hearts_suit_run"]
      }
    ]
  }
}
```

### General Quotes
Quotes that work for any suit:

```json
{
  "general": [
    {
      "quote": "Victory is yours!",
      "context": "game_won",
      "triggers": ["game_won", "perfect_game"]
    }
  ]
}
```

## Voice Characteristics

### King Voice
- **Pitch**: 80-120 Hz (deep bass)
- **Speed**: 130 words per minute (slow, deliberate)
- **Character**: Authoritative, commanding, wise
- **Audio Effects**: Bass boost, low-pass filter at 3kHz
- **Best For**: Major achievements, completing runs, winning

### Queen Voice
- **Pitch**: 180-220 Hz (female melodic)
- **Speed**: 150 words per minute (medium pace)
- **Character**: Elegant, warm, encouraging
- **Audio Effects**: Treble boost, high-pass filter at 200Hz
- **Best For**: Graceful plays, completing sequences, general encouragement

### Jack Voice
- **Pitch**: 140-180 Hz (male tenor)
- **Speed**: 170 words per minute (fast, energetic)
- **Character**: Enthusiastic, quick, lively
- **Audio Effects**: Mid-range boost, high-pass filter at 150Hz
- **Best For**: Quick combos, energetic plays, rapid sequences

## Customizing Quotes

### Quote Writing Tips
1. **Keep it short**: 5-10 words works best
2. **Match character**:
   - King: Formal, powerful ("Magnificent strategy!")
   - Queen: Elegant, warm ("Wonderfully played, dear!")
   - Jack: Casual, energetic ("Nice move!")
3. **Suit themes**:
   - Hearts: Love, holly, warmth
   - Diamonds: Ice, crystal, sparkle
   - Spades: Forest, nature, woodland
   - Clubs: Candy, sweets, holiday cheer

### Example Quotes by Character

**King Quotes:**
- "Brilliant strategy, well executed!"
- "Your wisdom guides you to victory!"
- "Magnificent! A move worthy of royalty!"

**Queen Quotes:**
- "Marvelous play, simply delightful!"
- "Your grace in the game is remarkable!"
- "Beautifully done, my dear!"

**Jack Quotes:**
- "Great job! Keep it going!"
- "Nice move! You're on fire!"
- "Excellent work! Way to go!"

## Testing Generated Audio

### Test Individual Voices
```bash
# List available system voices
python generate_multi_voice_audio.py --list-voices

# Test king voice
python -c "import pyttsx3; e = pyttsx3.init(); e.setProperty('rate', 130); e.say('Testing king voice'); e.runAndWait()"

# Test queen voice
python -c "import pyttsx3; e = pyttsx3.init(); e.setProperty('rate', 150); e.say('Testing queen voice'); e.runAndWait()"

# Test jack voice
python -c "import pyttsx3; e = pyttsx3.init(); e.setProperty('rate', 170); e.say('Testing jack voice'); e.runAndWait()"
```

### Play Generated Audio
Use any audio player:
```bash
# Windows Media Player
start audio/encouragement/king/hearts_quote_001_king.mp3

# Or use Python
python -c "import os; os.system('start audio/encouragement/king/hearts_quote_001_king.mp3')"
```

## Troubleshooting

### Issue: "No module named 'pyttsx3'"
**Solution:**
```bash
pip install pyttsx3
```

### Issue: "No module named 'pydub'"
**Solution:**
```bash
pip install pydub
# Also install ffmpeg (see step 2 above)
```

### Issue: Voices sound robotic or unnatural
**Solutions:**
1. Install better TTS voices from Microsoft Store (search "voices")
2. Adjust rate/pitch in `generate_multi_voice_audio.py`
3. Use pydub effects for enhancement (requires ffmpeg)

### Issue: Wrong voice selected for character
**Solution:**
Edit `generate_multi_voice_audio.py` and manually set voice IDs:
```python
self.king_voice = 'HKEY_LOCAL_MACHINE\SOFTWARE\...\David'
self.queen_voice = 'HKEY_LOCAL_MACHINE\SOFTWARE\...\Zira'
self.jack_voice = 'HKEY_LOCAL_MACHINE\SOFTWARE\...\Mark'
```

Run with `--list-voices` to see available voice IDs.

### Issue: Audio files not playing in game
**Check:**
1. Files exist in `audio/encouragement/` subdirectories
2. File paths in game code match generated structure
3. Browser/game has audio permissions enabled

## Advanced Customization

### Adjust Voice Parameters
Edit `generate_multi_voice_audio.py`:

```python
def configure_king_voice(self):
    self.engine.setProperty('rate', 120)  # Even slower
    self.engine.setProperty('volume', 1.0)  # Louder
```

### Custom Audio Effects
Install additional libraries:
```bash
pip install librosa soundfile
```

Add custom effects in `apply_voice_effects()` method.

### Batch Regenerate Specific Voice
```python
# Regenerate only king quotes
generator = MultiVoiceGenerator()
for quote_file in Path('audio/encouragement/king').glob('*.mp3'):
    quote_file.unlink()  # Delete old
# Then regenerate with updated settings
```

## Integration with Game

Once audio files are generated, integrate with celebration effects:

### Load Audio Files
```javascript
const audioManager = {
  king: [],
  queen: [],
  jack: [],

  async loadAll() {
    // Load king audio
    const kingFiles = await fetch('audio/encouragement/king/manifest.json');
    this.king = await kingFiles.json();

    // Load queen audio
    const queenFiles = await fetch('audio/encouragement/queen/manifest.json');
    this.queen = await queenFiles.json();

    // Load jack audio
    const jackFiles = await fetch('audio/encouragement/jack/manifest.json');
    this.jack = await jackFiles.json();
  }
};
```

### Play Audio Based on Card
```javascript
function playEncouragement(card, suit) {
  const voiceType = card.rank === 'K' ? 'king' :
                    card.rank === 'Q' ? 'queen' : 'jack';

  const audioFile = audioManager.selectQuote(voiceType, suit);
  const audio = new Audio(audioFile);
  audio.volume = 0.75;
  audio.play();
}
```

## File Structure

```
D:\solitaire\audio\
├── generate_multi_voice_audio.py    # Main generator script
├── encouragement_quotes.json        # Your 30 quotes (YOU CREATE THIS)
├── encouragement_quotes_template.json  # Template/example
├── requirements.txt                 # Python dependencies
├── AUDIO_SETUP_GUIDE.md            # This file
└── encouragement/                   # Generated audio (created by script)
    ├── king/
    │   ├── hearts_quote_001_king.mp3
    │   ├── diamonds_quote_001_king.mp3
    │   └── ...
    ├── queen/
    │   ├── hearts_quote_001_queen.mp3
    │   └── ...
    └── jack/
        ├── hearts_quote_001_jack.mp3
        └── ...
```

## Next Steps

1. ✅ Install dependencies (`pip install -r requirements.txt`)
2. ✅ Install FFmpeg (optional but recommended)
3. ⏸️  **WAITING**: Paste 30 quotes from Word document into `encouragement_quotes.json`
4. ⏸️  Generate audio files (`python generate_multi_voice_audio.py`)
5. ⏸️  Test audio playback
6. ⏸️  Integrate with game celebration system

## Performance Notes

- Generation time: ~5-10 seconds per audio file
- Total generation time: ~5-10 minutes for 90+ files (30 quotes × 3 voices)
- Audio file size: ~20-50 KB per MP3 file
- Total audio package: ~2-5 MB

## Credits

Part of Victorian Christmas Solitaire celebration system.
Multi-voice system designed for immersive gameplay experience.
