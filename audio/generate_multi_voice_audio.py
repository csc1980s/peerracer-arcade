#!/usr/bin/env python3
"""
Multi-Voice Audio Generator for Victorian Christmas Solitaire
Generates high-fidelity encouragement audio with 3 distinct neural voices:
- King: en-GB-RyanNeural (deep, majestic, authoritative Victorian monarch)
- Queen: en-GB-SoniaNeural (elegant, warm, gracious Victorian lady)
- Jack: en-GB-ThomasNeural (spirited, crisp, energetic young knight/courtier)

Falls back gracefully to pyttsx3 system SAPI5 voices if edge-tts is unavailable.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

VOICE_CONFIG = {
    'king': {
        'voice': 'en-GB-RyanNeural',
        'rate': '-4%',
        'pitch': '-2Hz'
    },
    'queen': {
        'voice': 'en-GB-SoniaNeural',
        'rate': '-2%',
        'pitch': '+1Hz'
    },
    'jack': {
        'voice': 'en-GB-ThomasNeural',
        'rate': '+5%',
        'pitch': '+2Hz'
    }
}

class MultiVoiceGenerator:
    def __init__(self, use_edge_tts=True):
        self.output_dir = Path(__file__).parent / 'encouragement'
        self.output_dir.mkdir(exist_ok=True)
        self.use_edge_tts = use_edge_tts
        self.engine = None
        self.edge_tts = None

        if self.use_edge_tts:
            try:
                import edge_tts
                self.edge_tts = edge_tts
                print(">> [Neural Mode] Edge Neural TTS initialized for Victorian Solitaire voices.")
            except ImportError:
                print(">> [Fallback] edge-tts not found, falling back to pyttsx3.")
                self.use_edge_tts = False

        if not self.use_edge_tts:
            import pyttsx3
            self.engine = pyttsx3.init()
            self.voices = self.engine.getProperty('voices')
            self.king_voice = self._find_voice('male', 'deep')
            self.queen_voice = self._find_voice('female')
            self.jack_voice = self._find_voice('male', 'mid')

    def _find_voice(self, gender, tone=None):
        for voice in self.voices:
            voice_id = voice.id.lower()
            if gender == 'female':
                if 'female' in voice_id or 'zira' in voice_id or 'hazel' in voice_id:
                    return voice.id
            elif gender == 'male':
                if tone == 'deep' and ('david' in voice_id or 'male' in voice_id):
                    return voice.id
                elif tone == 'mid' and ('mark' in voice_id or 'male' in voice_id):
                    return voice.id
        for voice in self.voices:
            if gender in voice.id.lower():
                return voice.id
        return self.voices[0].id

    async def _generate_audio_neural(self, text, voice_type, output_path):
        cfg = VOICE_CONFIG.get(voice_type, VOICE_CONFIG['queen'])
        communicate = self.edge_tts.Communicate(
            text=text,
            voice=cfg['voice'],
            rate=cfg['rate'],
            pitch=cfg['pitch']
        )
        await communicate.save(str(output_path))
        return output_path

    def generate_audio(self, text, voice_type, output_filename):
        if voice_type not in ['king', 'queen', 'jack']:
            raise ValueError(f"Unknown voice type: {voice_type}")

        output_subdir = self.output_dir / voice_type
        output_subdir.mkdir(exist_ok=True)
        output_path = output_subdir / output_filename

        if self.use_edge_tts:
            asyncio.run(self._generate_audio_neural(text, voice_type, output_path))
        else:
            if voice_type == 'king':
                self.engine.setProperty('voice', self.king_voice)
                self.engine.setProperty('rate', 130)
                self.engine.setProperty('volume', 0.9)
            elif voice_type == 'queen':
                self.engine.setProperty('voice', self.queen_voice)
                self.engine.setProperty('rate', 150)
                self.engine.setProperty('volume', 0.85)
            elif voice_type == 'jack':
                self.engine.setProperty('voice', self.jack_voice)
                self.engine.setProperty('rate', 170)
                self.engine.setProperty('volume', 0.9)

            self.engine.save_to_file(text, str(output_path))
            self.engine.runAndWait()

        return output_path

    def generate_all_from_quotes(self, quotes_file):
        with open(quotes_file, 'r', encoding='utf-8') as f:
            quotes_data = json.load(f)

        total = 0

        # Suit quotes
        for suit, suit_quotes in quotes_data.get('suits', {}).items():
            print(f"\n{'='*60}\nGenerating {suit.upper()} suit quotes...\n{'='*60}")
            for idx, quote_obj in enumerate(suit_quotes, 1):
                quote_text = quote_obj['quote']
                card_type = quote_obj.get('cardType', 'generic')
                if card_type == 'king' or 'king' in quote_text.lower():
                    voice_type = 'king'
                elif card_type == 'queen' or 'queen' in quote_text.lower():
                    voice_type = 'queen'
                elif card_type == 'jack' or 'jack' in quote_text.lower():
                    voice_type = 'jack'
                else:
                    voice_type = quote_obj.get('voicePreference', 'queen')

                filename = f"{suit}_quote_{idx:03d}_{voice_type}.mp3"
                print(f"Generating {voice_type} voice: {filename}")
                self.generate_audio(quote_text, voice_type, filename)
                total += 1

        # General encouragement quotes
        if 'general' in quotes_data:
            print(f"\n{'='*60}\nGenerating GENERAL encouragement quotes...\n{'='*60}")
            for idx, quote_obj in enumerate(quotes_data['general'], 1):
                quote_text = quote_obj['quote']
                for voice_type in ['king', 'queen', 'jack']:
                    filename = f"general_quote_{idx:03d}_{voice_type}.mp3"
                    print(f"Generating {voice_type} voice: {filename}")
                    self.generate_audio(quote_text, voice_type, filename)
                    total += 1

        print(f"\n{'='*60}\nGENERATION COMPLETE ({total} files)\n{'='*60}")
        return total

def main():
    print("=" * 60)
    print("  Multi-Voice Neural Audio Generator")
    print("  Victorian Christmas Solitaire")
    print("=" * 60)

    generator = MultiVoiceGenerator(use_edge_tts=True)
    quotes_file = Path(__file__).parent / 'encouragement_quotes.json'

    if not quotes_file.exists():
        print(f"ERROR: Quotes file not found: {quotes_file}")
        sys.exit(1)

    total = generator.generate_all_from_quotes(quotes_file)
    print(f"\nSuccessfully generated {total} natural audio files!")

    # Automatically refresh manifests
    try:
        from create_audio_manifest import create_manifest
        print("\nRebuilding audio manifests...")
        create_manifest()
    except Exception as e:
        print("Note: Manifest rebuild:", e)

if __name__ == "__main__":
    main()
