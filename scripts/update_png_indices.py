#!/usr/bin/env python3
"""
Update PNG card indices to Digital UI Optimized specification
Overwrites only the corner index areas, preserving the card artwork
"""

import os
from PIL import Image, ImageDraw, ImageFont
import glob

DECKS_DIR = r"D:\solitaire\decks"

# Digital UI Optimized spec for 750×1050px
SPEC = {
    'top_margin': 42.86,
    'left_margin': 38.57,
    'rank_height': 130.71,
    'suit_pip_height': 83.57,
    'gap': 12.86,
    'centerline_x': 98.57,
}

COLORS = {
    'red': (200, 35, 51),     # Hearts & Diamonds
    'black': (28, 40, 51),     # Spades & Clubs
    'white': (255, 255, 255),  # Background
}

def get_rank_from_filename(filename):
    """Extract rank from filename"""
    base = os.path.basename(filename)
    if base.startswith('10'):
        return '10'
    elif base[0] in 'AJQK23456789':
        return base[0]
    return None

def get_suit_from_filename(filename):
    """Extract suit from filename"""
    base = os.path.basename(filename).lower()
    if 'heart' in base or base.endswith('h.png'):
        return 'hearts'
    elif 'diamond' in base or base.endswith('d.png'):
        return 'diamonds'
    elif 'spade' in base or base.endswith('s.png'):
        return 'spades'
    elif 'club' in base or base.endswith('c.png'):
        return 'clubs'
    return None

def is_red_suit(suit):
    return suit in ['hearts', 'diamonds']

def draw_suit_pip(draw, x, y, suit, color, size):
    """Draw a suit pip symbol"""
    # This is a simplified version - you may want to load SVG paths or use Unicode symbols
    # For now, using text symbols
    symbols = {'hearts': '♥', 'diamonds': '♦', 'spades': '♠', 'clubs': '♣'}
    if suit in symbols:
        try:
            font = ImageFont.truetype("arial.ttf", int(size))
        except:
            font = ImageFont.load_default()
        draw.text((x, y), symbols[suit], fill=color, font=font, anchor='mm')

def update_card_indices(png_path):
    """Update indices on a PNG card"""
    rank = get_rank_from_filename(png_path)
    suit = get_suit_from_filename(png_path)

    if not rank or not suit:
        return False

    img = Image.open(png_path).convert('RGBA')
    draw = ImageDraw.Draw(img)

    color = COLORS['red'] if is_red_suit(suit) else COLORS['black']

    # Load font
    rank_size = int(SPEC['rank_height'])
    try:
        font = ImageFont.truetype("arialbd.ttf", rank_size)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", rank_size)
        except:
            font = ImageFont.load_default()

    # Clear top-left corner area
    tl_box = (0, 0, 150, 180)
    draw.rectangle(tl_box, fill=(255, 255, 255, 0))

    # Clear bottom-right corner area
    br_box = (600, 870, 750, 1050)
    draw.rectangle(br_box, fill=(255, 255, 255, 0))

    # Draw top-left index
    centerline_x = SPEC['centerline_x']
    rank_y = SPEC['top_margin'] + SPEC['rank_height'] * 0.73

    # Draw rank
    draw.text((centerline_x, rank_y), rank, fill=color, font=font, anchor='mm')

    # Draw suit pip
    pip_y = rank_y + SPEC['gap'] + SPEC['suit_pip_height'] / 2
    draw_suit_pip(draw, centerline_x, pip_y, suit, color, SPEC['suit_pip_height'])

    # Draw bottom-right index (rotated 180°)
    # Coordinates: x' = W - x, y' = H - y
    br_centerline_x = 750 - centerline_x
    br_rank_y = 1050 - rank_y
    br_pip_y = 1050 - pip_y

    # Rotate the drawing context isn't straightforward, so draw inverted
    img_rotated = img.rotate(180)
    draw_r = ImageDraw.Draw(img_rotated)

    draw_r.text((centerline_x, rank_y), rank, fill=color, font=font, anchor='mm')
    draw_r.text((centerline_x, pip_y), get_suit_symbol(suit), fill=color, font=font, anchor='mm')

    # Rotate back
    img = img_rotated.rotate(180)

    # Save
    img.save(png_path)
    return True

def get_suit_symbol(suit):
    symbols = {'hearts': '♥', 'diamonds': '♦', 'spades': '♠', 'clubs': '♣'}
    return symbols.get(suit, '')

def process_deck(deck_path):
    """Process all PNG files in a deck"""
    png_files = glob.glob(os.path.join(deck_path, "*.png"))
    updated = 0

    for png in png_files:
        if 'back' in os.path.basename(png).lower():
            continue
        if update_card_indices(png):
            updated += 1
            print(f"✓ Updated: {os.path.basename(png)}")

    return updated

if __name__ == "__main__":
    print("\n🖼️  PNG Index Updater")
    print("====================\n")
    print("Requirements: pip install Pillow\n")

    total = 0
    for deck_name in os.listdir(DECKS_DIR):
        deck_path = os.path.join(DECKS_DIR, deck_name)
        if os.path.isdir(deck_path):
            print(f"\nProcessing: {deck_name}")
            count = process_deck(deck_path)
            total += count

    print(f"\n✅ Total updated: {total}\n")
