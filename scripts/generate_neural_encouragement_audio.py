#!/usr/bin/env python3
"""
High-Fidelity Neural Audio Generator for Victorian Christmas Solitaire
Generates rich, human-like voice encouragement using Edge Neural TTS.
- King: en-GB-RyanNeural (deep, majestic, authoritative Victorian monarch)
- Queen: en-GB-SoniaNeural (elegant, warm, gracious Victorian lady)
- Jack: en-GB-ThomasNeural (spirited, crisp, energetic young knight/courtier)
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

async def generate_single_file(edge_tts, text, voice_type, output_path, sem):
    cfg = VOICE_CONFIG[voice_type]
    async with sem:
        communicate = edge_tts.Communicate(
            text=text,
            voice=cfg['voice'],
            rate=cfg['rate'],
            pitch=cfg['pitch']
        )
        await communicate.save(str(output_path))
        print(f"  [OK] {voice_type.upper()}: {output_path.name}")

async def main():
    try:
        import edge_tts
    except ImportError:
        print("ERROR: edge-tts is not installed. Run: pip install edge-tts")
        sys.exit(1)

    base_dir = Path(__file__).resolve().parent.parent / 'audio'
    quotes_file = base_dir / 'encouragement_quotes.json'
    output_dir = base_dir / 'encouragement'

    if not quotes_file.exists():
        print(f"ERROR: Quotes file not found: {quotes_file}")
        sys.exit(1)

    with open(quotes_file, 'r', encoding='utf-8') as f:
        quotes_data = json.load(f)

    # Ensure output directories exist
    for v in ['king', 'queen', 'jack']:
        (output_dir / v).mkdir(parents=True, exist_ok=True)

    tasks = []
    sem = asyncio.Semaphore(4) # Run up to 4 concurrent downloads to avoid rate limits

    print("=" * 60)
    print("Generating 48 Neural Audio Clips for Victorian Solitaire")
    print("=" * 60)

    # 1. Suit quotes
    for suit, suit_quotes in quotes_data.get('suits', {}).items():
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
            dest = output_dir / voice_type / filename
            tasks.append(generate_single_file(edge_tts, quote_text, voice_type, dest, sem))

    # 2. General quotes (all 3 voices for each)
    for idx, quote_obj in enumerate(quotes_data.get('general', []), 1):
        quote_text = quote_obj['quote']
        for voice_type in ['king', 'queen', 'jack']:
            filename = f"general_quote_{idx:03d}_{voice_type}.mp3"
            dest = output_dir / voice_type / filename
            tasks.append(generate_single_file(edge_tts, quote_text, voice_type, dest, sem))

    print(f"Scheduled {len(tasks)} files for neural synthesis...")
    await asyncio.gather(*tasks)

    print("=" * 60)
    print("Audio generation complete! Rebuilding manifests...")
    print("=" * 60)

    # Rebuild manifests
    sys.path.insert(0, str(base_dir))
    from create_audio_manifest import create_manifest
    create_manifest()

if __name__ == '__main__':
    asyncio.run(main())
