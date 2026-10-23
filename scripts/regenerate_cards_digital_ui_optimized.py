#!/usr/bin/env python3
"""
Regenerate Playing Cards with Digital UI Optimized Indices
Uses specification from "Playing Card Index Proportions.md"

Digital UI Optimized Profile (750×1050px final output):
- Safe Margin X: 38.57px (5.14%)
- Safe Margin Y: 42.86px (4.08%)
- Index Centerline: X = 98.57px
- Rank Height: 130.71px (12.45%)
- Suit Pip Height: 83.57px (7.96%)
- Vertical Gap: 12.86px (1.22%)
- Total Stack: 227.14px (21.63%)
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont
import glob

# Working with 1500×2100px during compositing (SCALE=2), then resize to 750×1050
SCALE = 2
WIDTH = int(750 * SCALE)   # 1500px
HEIGHT = int(1050 * SCALE)  # 2100px
CORNER_RADIUS = int(37.5 * SCALE)  # 75px

# Digital UI Optimized specification scaled to 1500×2100 (multiply by 2)
SPEC = {
    'safe_margin_x': int(38.57 * SCALE),      # 77.14px
    'safe_margin_y': int(42.86 * SCALE),      # 85.72px
    'centerline_x': int(98.57 * SCALE),       # 197.14px
    'rank_height': int(130.71 * SCALE),       # 261.42px
    'suit_pip_height': int(83.57 * SCALE),    # 167.14px
    'gap': int(12.86 * SCALE),                # 25.72px
}

# Card colors
COLORS = {
    'card_bg': (252, 250, 246, 255),      # Warm Antique Ivory
    'border_black': (24, 24, 27, 255),    # Deep Keyline Black
    'border_gold': (210, 160, 45, 255),   # Gilded Antique Ochre
    'rank_red': (185, 28, 28, 255),       # Casino Crimson
    'rank_black': (24, 24, 27, 255),      # Traditional Black
}

# Font loading
try:
    # Rank font size should produce 261.42px glyphs at this scale
    FONT_RANK = ImageFont.truetype("georgiab.ttf", int(SPEC['rank_height'] * 0.85))
    FONT_RANK_10 = ImageFont.truetype("georgiab.ttf", int(SPEC['rank_height'] * 0.70))  # Condensed for "10"
except Exception:
    FONT_RANK = ImageFont.load_default()
    FONT_RANK_10 = FONT_RANK

# -----------------------------------------------------------------------------
# DIGITAL UI OPTIMIZED CORNER STAMP
# -----------------------------------------------------------------------------
def create_digital_ui_corner_stamp(rank, suit, color):
    """
    Create corner index stamp using Digital UI Optimized proportions.

    Returns a transparent RGBA image with rank + suit pip vertically stacked,
    centered on the index centerline, matching the exact specification.
    """
    # Choose font based on rank
    font = FONT_RANK_10 if rank == "10" else FONT_RANK

    # Create temporary canvas for rank text
    temp_rank = Image.new("RGBA", (500, 500), (0, 0, 0, 0))
    draw_rank = ImageDraw.Draw(temp_rank)

    # Draw rank and get bounding box
    draw_rank.text((250, 250), rank, font=font, fill=color, anchor='mm')
    rank_bbox = temp_rank.getbbox()
    rank_crop = temp_rank.crop(rank_bbox)
    rank_width, rank_height = rank_crop.size

    # Create temporary canvas for suit pip
    temp_pip = Image.new("RGBA", (500, 500), (0, 0, 0, 0))
    draw_pip = ImageDraw.Draw(temp_pip)

    # Draw suit pip centered at (250, 250) with correct height
    draw_suit_pip(draw_pip, suit, 250, 250, SPEC['suit_pip_height'], color)
    pip_bbox = temp_pip.getbbox()
    pip_crop = temp_pip.crop(pip_bbox)
    pip_width, pip_height = pip_crop.size

    # Calculate final stamp dimensions
    max_width = max(rank_width, pip_width)
    total_height = rank_height + SPEC['gap'] + pip_height

    # Create final stamp canvas
    stamp = Image.new("RGBA", (max_width + 20, total_height + 20), (0, 0, 0, 0))

    # Paste rank centered horizontally at top
    rank_x = (stamp.width - rank_width) // 2
    stamp.paste(rank_crop, (rank_x, 0), rank_crop)

    # Paste pip centered horizontally below rank with gap
    pip_x = (stamp.width - pip_width) // 2
    pip_y = rank_height + SPEC['gap']
    stamp.paste(pip_crop, (pip_x, pip_y), pip_crop)

    return stamp

# -----------------------------------------------------------------------------
# SUIT PIP DRAWING (Hearts, Diamonds, Spades, Clubs)
# -----------------------------------------------------------------------------
def draw_suit_pip(draw, suit, cx, cy, size, color, flip=False):
    """Draw a suit pip symbol centered at (cx, cy)"""
    if suit == "hearts":
        draw_heart(draw, cx, cy, size, color, flip)
    elif suit == "diamonds":
        draw_diamond(draw, cx, cy, size, color, flip)
    elif suit == "spades":
        draw_spade(draw, cx, cy, size, color, flip)
    elif suit == "clubs":
        draw_club(draw, cx, cy, size, color, flip)

def draw_heart(draw, cx, cy, size, color, flip=False):
    """Draw a heart symbol"""
    s = size / 100.0
    pts = []
    # Heart path (simplified)
    pts = [
        (cx - 30*s, cy - 10*s), (cx - 20*s, cy - 25*s), (cx, cy - 25*s),
        (cx + 20*s, cy - 25*s), (cx + 30*s, cy - 10*s), (cx + 20*s, cy + 5*s),
        (cx, cy + 30*s), (cx - 20*s, cy + 5*s)
    ]
    draw.polygon(pts, fill=color)

def draw_diamond(draw, cx, cy, size, color, flip=False):
    """Draw a diamond symbol"""
    s = size / 100.0
    pts = [(cx, cy - 40*s), (cx + 25*s, cy), (cx, cy + 40*s), (cx - 25*s, cy)]
    draw.polygon(pts, fill=color)

def draw_spade(draw, cx, cy, size, color, flip=False):
    """Draw a spade symbol"""
    s = size / 100.0
    # Spade body
    pts = [
        (cx, cy - 35*s), (cx - 15*s, cy - 20*s), (cx - 25*s, cy - 5*s),
        (cx - 25*s, cy + 10*s), (cx - 10*s, cy + 20*s), (cx - 10*s, cy + 35*s),
        (cx + 10*s, cy + 35*s), (cx + 10*s, cy + 20*s), (cx + 25*s, cy + 10*s),
        (cx + 25*s, cy - 5*s), (cx + 15*s, cy - 20*s)
    ]
    draw.polygon(pts, fill=color)

def draw_club(draw, cx, cy, size, color, flip=False):
    """Draw a club symbol (three circles + stem)"""
    s = size / 100.0
    r = 15 * s
    # Three circles
    draw.ellipse([cx - r, cy - 35*s - r, cx + r, cy - 35*s + r], fill=color)
    draw.ellipse([cx - 25*s - r, cy - 5*s - r, cx - 25*s + r, cy - 5*s + r], fill=color)
    draw.ellipse([cx + 25*s - r, cy - 5*s - r, cx + 25*s + r, cy - 5*s + r], fill=color)
    # Stem
    stem_pts = [(cx - 8*s, cy + 10*s), (cx + 8*s, cy + 10*s),
                (cx + 8*s, cy + 35*s), (cx - 8*s, cy + 35*s)]
    draw.polygon(stem_pts, fill=color)

# -----------------------------------------------------------------------------
# APPLY DIGITAL UI INDICES TO EXISTING CARD IMAGES
# -----------------------------------------------------------------------------
def apply_digital_ui_indices(input_path, output_path, rank, suit):
    """
    Load existing card artwork and apply Digital UI Optimized indices.
    This preserves the artwork and only updates the corner index areas.
    """
    # Load the original card
    if not os.path.exists(input_path):
        print(f"  WARNING: Source not found: {input_path}")
        return False

    with Image.open(input_path) as img:
        # Work at 1500×2100 scale
        card = img.convert("RGBA").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)

    # Clear old index areas (white rectangles)
    draw = ImageDraw.Draw(card)

    # Top-left corner clear area (larger to ensure full coverage)
    clear_margin = 20
    tl_clear = (
        0,
        0,
        SPEC['centerline_x'] + int(100 * SCALE),
        SPEC['safe_margin_y'] + SPEC['rank_height'] + SPEC['gap'] + SPEC['suit_pip_height'] + int(30 * SCALE)
    )
    draw.rectangle(tl_clear, fill=COLORS['card_bg'])

    # Bottom-right corner clear area
    br_clear = (
        WIDTH - (SPEC['centerline_x'] + int(100 * SCALE)),
        HEIGHT - (SPEC['safe_margin_y'] + SPEC['rank_height'] + SPEC['gap'] + SPEC['suit_pip_height'] + int(30 * SCALE)),
        WIDTH,
        HEIGHT
    )
    draw.rectangle(br_clear, fill=COLORS['card_bg'])

    # Get index color
    color = COLORS['rank_red'] if suit in ['hearts', 'diamonds'] else COLORS['rank_black']

    # Create corner stamp with Digital UI Optimized proportions
    stamp = create_digital_ui_corner_stamp(rank, suit, color)

    # Position top-left stamp
    # The stamp should be centered on centerline_x, with top at safe_margin_y
    stamp_x = SPEC['centerline_x'] - (stamp.width // 2)
    stamp_y = SPEC['safe_margin_y']
    card.paste(stamp, (stamp_x, stamp_y), stamp)

    # Create bottom-right stamp (180° rotation)
    stamp_br = stamp.rotate(180, expand=True)
    stamp_br_x = WIDTH - stamp_x - stamp.width
    stamp_br_y = HEIGHT - stamp_y - stamp.height
    card.paste(stamp_br, (stamp_br_x, stamp_br_y), stamp_br)

    # Resize to final 750×1050
    final_card = card.resize((750, 1050), Image.Resampling.LANCZOS)
    final_card.save(output_path, "PNG", dpi=(300, 300))

    return True

# -----------------------------------------------------------------------------
# BATCH PROCESSING
# -----------------------------------------------------------------------------
def process_deck(deck_path):
    """Process all cards in a deck directory"""
    print(f"\nProcessing Processing deck: {os.path.basename(deck_path)}")

    # Card mapping
    ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    suits = ['clubs', 'diamonds', 'hearts', 'spades']

    updated_count = 0

    for suit in suits:
        for rank in ranks:
            # Try different filename patterns
            patterns = [
                f"{rank}_{suit}.png",
                f"{rank}_{suit[0].upper()}.png",
                f"{rank.lower()}_{suit}.png"
            ]

            input_path = None
            for pattern in patterns:
                test_path = os.path.join(deck_path, pattern)
                if os.path.exists(test_path):
                    input_path = test_path
                    break

            if not input_path:
                continue

            output_path = input_path  # Overwrite in place

            if apply_digital_ui_indices(input_path, output_path, rank, suit):
                print(f"  OK Updated: {os.path.basename(input_path)}")
                updated_count += 1

    return updated_count

def main():
    print("\n" + "="*60)
    print("DIGITAL UI OPTIMIZED CARD INDEX REGENERATOR")
    print("="*60)
    print("\nSpecification:")
    print(f"  • Card size: 750×1050px (final output)")
    print(f"  • Work scale: {WIDTH}×{HEIGHT}px (2× during processing)")
    print(f"  • Rank height: {SPEC['rank_height']//SCALE}px (12.45%)")
    print(f"  • Suit pip: {SPEC['suit_pip_height']//SCALE}px (7.96%)")
    print(f"  • Index centerline: {SPEC['centerline_x']//SCALE}px")
    print(f"  • Safe margins: X={SPEC['safe_margin_x']//SCALE}px, Y={SPEC['safe_margin_y']//SCALE}px")

    # Get deck directory
    solitaire_dir = r"D:\solitaire"
    decks_dir = os.path.join(solitaire_dir, "decks")

    if not os.path.exists(decks_dir):
        print(f"\nError: Decks directory not found: {decks_dir}")
        return

    # Process all deck subdirectories
    deck_names = [d for d in os.listdir(decks_dir) if os.path.isdir(os.path.join(decks_dir, d))]

    print(f"\nFound Found {len(deck_names)} deck themes")

    total_updated = 0

    for deck_name in sorted(deck_names):
        deck_path = os.path.join(decks_dir, deck_name)
        count = process_deck(deck_path)
        total_updated += count

    print("\n" + "="*60)
    print(f"COMPLETE! Updated {total_updated} cards")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
