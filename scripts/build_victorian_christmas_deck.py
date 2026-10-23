#!/usr/bin/env python3
"""
Solitaire Sovereign - Victorian Christmas Deck Face Cards & Number 6 Generator
Generates cards using AI image generator AI master paintings:
- Kings: Santa Claus (Father Christmas)
- Queens: Mrs. Santa (Mrs. Claus)
- Jacks: Jack Frost (Diamonds & Spades) and Reindeer (Hearts & Clubs)
- Jokers: Reindeer (Joker 1) and Jack Frost (Joker 2)
- Number 6 cards: High-visibility 6s with crystal-clear corner indices

Features:
- Authentic vintage oil painting aesthetic
- Feathered vignette alpha masking (edges of painting smoothly dissolve into ivory card paper)
- Maximum corner index visibility for gameplay readability (prominent Georgia Bold serif typography)
"""

import math
import os
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT_DIR = Path(__file__).resolve().parent.parent
DECK_DIR = ROOT_DIR / 'decks' / 'victorian_christmas'
WORKSPACE_DIR = Path("D:/getartcraft/artcraft_workspace/decks/victorian_christmas")
MODS_FACES_DIR = ROOT_DIR / 'mods' / 'card_faces'
SCRATCH_DIR = ROOT_DIR / 'scratch'

CARD_W, CARD_H = 750, 1050

# Fonts
FONT_RANK = ImageFont.truetype('C:/Windows/Fonts/georgiab.ttf', 86)
FONT_LABEL = ImageFont.truetype('C:/Windows/Fonts/georgia.ttf', 24)

# Color Palette
IVORY_PAPER = (254, 252, 246, 255)
GOLD_BORDER = (212, 175, 55, 255)
GOLD_LIGHT = (250, 235, 160, 255)
GOLD_DARK = (150, 110, 20, 255)
EVERGREEN_FRAME = (27, 56, 43, 255)
RUBY_RED = (139, 17, 30, 255)
FOREST_BLACK = (18, 34, 26, 255)

def draw_pip(draw, suit, cx, cy, s, color):
    """Draw mathematically crisp playing card suit pips"""
    if suit == 'hearts':
        pts = []
        for t in range(0, 360, 5):
            rad = math.radians(t)
            x = cx + (s / 32.0) * (16 * math.sin(rad)**3)
            y = cy - (s / 32.0) * (13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad))
            pts.append((x, y))
        draw.polygon(pts, fill=color)
    elif suit == 'diamonds':
        hw = s * 0.44
        hh = s * 0.58
        draw.polygon([(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)], fill=color)
    elif suit == 'spades':
        pts = []
        for t in range(0, 360, 5):
            rad = math.radians(t)
            x = cx + (s / 32.0) * (16 * math.sin(rad)**3)
            y = (cy - s*0.1) + (s / 32.0) * (13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad))
            pts.append((x, y))
        draw.polygon(pts, fill=color)
        draw.polygon([(cx - s*0.06, cy + s*0.1), (cx + s*0.06, cy + s*0.1), (cx + s*0.22, cy + s*0.48), (cx - s*0.22, cy + s*0.48)], fill=color)
    elif suit == 'clubs':
        r = s * 0.22
        draw.ellipse([(cx - r, cy - s*0.38 - r), (cx + r, cy - s*0.38 + r)], fill=color)
        draw.ellipse([(cx - s*0.24 - r, cy - s*0.04 - r), (cx - s*0.24 + r, cy - s*0.04 + r)], fill=color)
        draw.ellipse([(cx + s*0.24 - r, cy - s*0.04 - r), (cx + s*0.24 + r, cy - s*0.04 + r)], fill=color)
        draw.ellipse([(cx - r*0.8, cy - s*0.16 - r*0.8), (cx + r*0.8, cy - s*0.16 + r*0.8)], fill=color)
        draw.polygon([(cx - s*0.06, cy - s*0.05), (cx + s*0.06, cy - s*0.05), (cx + s*0.22, cy + s*0.45), (cx - s*0.22, cy + s*0.45)], fill=color)

def build_card_base():
    """Create authentic vintage card blank with ornate gold border and corner filigree"""
    base = Image.new('RGBA', (CARD_W, CARD_H), IVORY_PAPER)
    draw = ImageDraw.Draw(base)

    # Outer border (deep evergreen)
    draw.rounded_rectangle([4, 4, CARD_W - 4, CARD_H - 4], radius=36, outline=EVERGREEN_FRAME, width=3)
    # Primary gold bevel frame
    draw.rounded_rectangle([14, 14, CARD_W - 14, CARD_H - 14], radius=26, outline=GOLD_BORDER, width=5)
    # Inner accent line
    draw.rounded_rectangle([22, 22, CARD_W - 22, CARD_H - 22], radius=20, outline=(122, 13, 23, 150), width=2)

    # Ornate corner filigree arcs
    corner_r = 32
    draw.arc([38, 38, 38 + corner_r*2, 38 + corner_r*2], start=180, end=270, fill=GOLD_BORDER, width=2)
    draw.arc([CARD_W - 38 - corner_r*2, 38, CARD_W - 38, 38 + corner_r*2], start=270, end=360, fill=GOLD_BORDER, width=2)
    draw.arc([38, CARD_H - 38 - corner_r*2, 38 + corner_r*2, CARD_H - 38], start=90, end=180, fill=GOLD_BORDER, width=2)
    draw.arc([CARD_W - 38 - corner_r*2, CARD_H - 38 - corner_r*2, CARD_W - 38, CARD_H - 38], start=0, end=90, fill=GOLD_BORDER, width=2)

    # Corner jewel accents
    draw.ellipse([46, 46, 54, 54], fill=RUBY_RED)
    draw.ellipse([CARD_W - 54, 46, CARD_W - 46, 54], fill=RUBY_RED)
    draw.ellipse([46, CARD_H - 54, 54, CARD_H - 46], fill=RUBY_RED)
    draw.ellipse([CARD_W - 54, CARD_H - 54, CARD_W - 46, CARD_H - 46], fill=RUBY_RED)

    return base

def apply_feathered_vignette(portrait_img, width=540, height=750):
    """
    Apply feathered vignette alpha mask so edges smoothly fade into the white/ivory card base
    """
    resized = portrait_img.resize((width, height), Image.Resampling.LANCZOS)
    mask = Image.new('L', (width, height), 0)
    mdraw = ImageDraw.Draw(mask)

    # Rounded rectangle core with heavy feathering
    inset_x, inset_y = 65, 75
    mdraw.rounded_rectangle(
        [inset_x, inset_y, width - inset_x, height - inset_y],
        radius=110,
        fill=255
    )
    # Heavy Gaussian blur gives beautiful soft fade into the ivory background
    feathered_mask = mask.filter(ImageFilter.GaussianBlur(radius=40))
    return resized, feathered_mask

def composite_face_card(rank_char, suit_name, portrait_img, label_text=""):
    """Assemble complete high-resolution playing card with maximum index visibility"""
    card = build_card_base()

    # 1. Paste feathered vintage painting in center
    pw, ph = 540, 750
    px, py = (CARD_W - pw) // 2, (CARD_H - ph) // 2
    feathered_portrait, mask = apply_feathered_vignette(portrait_img, pw, ph)
    card.paste(feathered_portrait, (px, py), mask)

    # 2. Render Corner Indices (Top-Left and Bottom-Right)
    is_red = suit_name in ['hearts', 'diamonds']
    color = RUBY_RED if is_red else FOREST_BLACK

    # Stamp for corner index (160x240 px safe area)
    c_w, c_h = 160, 240
    stamp = Image.new('RGBA', (c_w, c_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(stamp)

    # Rank letter
    bbox = FONT_RANK.getbbox(rank_char)
    tw = bbox[2] - bbox[0]
    rx = 68 - (tw / 2)
    sdraw.text((rx, 50), rank_char, font=FONT_RANK, fill=color)

    # Suit pip directly beneath rank
    draw_pip(sdraw, suit_name, 68, 164, 46, color)

    # Paste Top-Left stamp
    card.alpha_composite(stamp, (0, 0))

    # Invert 180° and paste Bottom-Right stamp
    stamp_inv = stamp.rotate(180)
    card.alpha_composite(stamp_inv, (CARD_W - c_w, CARD_H - c_h))

    # Optional character name label at bottom center
    if label_text:
        draw = ImageDraw.Draw(card)
        lbox = FONT_LABEL.getbbox(label_text)
        lw = lbox[2] - lbox[0]
        lx = (CARD_W - lw) // 2
        # Soft gold-bordered ribbon
        draw.rounded_rectangle([lx - 16, 946, lx + lw + 16, 982], radius=10, fill=(254, 252, 246, 230), outline=GOLD_BORDER, width=1)
        draw.text((lx, 950), label_text, font=FONT_LABEL, fill=(90, 60, 10, 255))

    return card

def composite_pip_6_card(suit_name):
    """
    Generate ultra-high-visibility card 6 with prominent corner indices and classic 6-pip layout
    """
    card = build_card_base()
    draw = ImageDraw.Draw(card)

    is_red = suit_name in ['hearts', 'diamonds']
    color = RUBY_RED if is_red else FOREST_BLACK

    # Corner indices
    c_w, c_h = 160, 240
    stamp = Image.new('RGBA', (c_w, c_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(stamp)

    bbox = FONT_RANK.getbbox('6')
    tw = bbox[2] - bbox[0]
    sdraw.text((68 - tw/2, 50), '6', font=FONT_RANK, fill=color)
    draw_pip(sdraw, suit_name, 68, 164, 46, color)

    card.alpha_composite(stamp, (0, 0))
    stamp_inv = stamp.rotate(180)
    card.alpha_composite(stamp_inv, (CARD_W - c_w, CARD_H - c_h))

    # 6 Pips in center (2 columns of 3)
    col_left = 265
    col_right = 485
    row_top = 260
    row_mid = 525
    row_bot = 790
    pip_size = 76

    for x in [col_left, col_right]:
        for y in [row_top, row_mid, row_bot]:
            draw_pip(draw, suit_name, x, y, pip_size, color)

    return card

def save_card_all_aliases(card_img, base_name, rank_code, suit_code, suit_full, deck_dir):
    """Save PNG under all expected naming conventions"""
    deck_dir.mkdir(parents=True, exist_ok=True)

    # Primary filename, e.g. K_hearts.png or 6_diamonds.png
    primary_name = f"{base_name}_{suit_full}.png"
    p_path = deck_dir / primary_name
    card_img.save(p_path, 'PNG', optimize=True)

    # Shorthand alias, e.g. KH.png or 6D.png
    s_name = f"{rank_code}{suit_code}.png"
    s_path = deck_dir / s_name
    card_img.save(s_path, 'PNG', optimize=True)

    # Word alias for court cards, e.g. king_hearts.png
    words = {'K': 'king', 'Q': 'queen', 'J': 'jack'}
    if rank_code in words:
        w_name = f"{words[rank_code]}_{suit_full}.png"
        card_img.save(deck_dir / w_name, 'PNG', optimize=True)

    print(f"  [SAVED] {primary_name} (+ aliases {s_name})")

def main():
    print("=" * 60)
    print("  Victorian Christmas Face Cards & Card 6 Generator")
    print("  Powered by AI Neural Paintings")
    print("=" * 60)

    # Verify input paintings from the image generator
    santa_path = SCRATCH_DIR / 'santa_test.png'
    mrs_santa_path = SCRATCH_DIR / 'mrs_santa_test.png'
    jack_frost_path = SCRATCH_DIR / 'jack_frost_test.png'
    reindeer_path = SCRATCH_DIR / 'reindeer_test.png'

    missing = [p for p in [santa_path, mrs_santa_path, jack_frost_path, reindeer_path] if not p.exists()]
    if missing:
        print("ERROR: Missing master paintings:", missing)
        return

    santa = Image.open(santa_path).convert('RGBA')
    mrs_santa = Image.open(mrs_santa_path).convert('RGBA')
    jack_frost = Image.open(jack_frost_path).convert('RGBA')
    reindeer = Image.open(reindeer_path).convert('RGBA')

    print("Master paintings loaded from the image generator:")
    print("  - Santa Claus:", santa.size)
    print("  - Mrs. Santa:", mrs_santa.size)
    print("  - Jack Frost:", jack_frost.size)
    print("  - Reindeer:", reindeer.size)
    print()

    # 1. Generate KINGS (Santa Claus)
    print("Generating Kings (Santa Claus)...")
    for suit_code, suit_full in [('H', 'hearts'), ('D', 'diamonds'), ('S', 'spades'), ('C', 'clubs')]:
        card = composite_face_card('K', suit_full, santa, "Santa Claus")
        save_card_all_aliases(card, 'K', 'K', suit_code, suit_full, DECK_DIR)

    # 2. Generate QUEENS (Mrs. Santa)
    print("\nGenerating Queens (Mrs. Santa)...")
    for suit_code, suit_full in [('H', 'hearts'), ('D', 'diamonds'), ('S', 'spades'), ('C', 'clubs')]:
        card = composite_face_card('Q', suit_full, mrs_santa, "Mrs. Santa")
        save_card_all_aliases(card, 'Q', 'Q', suit_code, suit_full, DECK_DIR)

    # 3. Generate JACKS (Jack Frost & Reindeer)
    print("\nGenerating Jacks (Jack Frost & Reindeer)...")
    # Hearts: Festive Reindeer (Rudolph with holly & bells)
    j_hearts = composite_face_card('J', 'hearts', reindeer, "Holiday Reindeer")
    save_card_all_aliases(j_hearts, 'J', 'J', 'H', 'hearts', DECK_DIR)

    # Diamonds: Jack Frost (Ice Crystal Spirit)
    j_diamonds = composite_face_card('J', 'diamonds', jack_frost, "Jack Frost")
    save_card_all_aliases(j_diamonds, 'J', 'J', 'D', 'diamonds', DECK_DIR)

    # Spades: Jack Frost (Winter Frost Staff)
    j_spades = composite_face_card('J', 'spades', jack_frost, "Jack Frost")
    save_card_all_aliases(j_spades, 'J', 'J', 'S', 'spades', DECK_DIR)

    # Clubs: Noble Woodland Reindeer Stag
    j_clubs = composite_face_card('J', 'clubs', reindeer, "Woodland Reindeer")
    save_card_all_aliases(j_clubs, 'J', 'J', 'C', 'clubs', DECK_DIR)

    # 4. Generate JOKERS
    print("\nGenerating Jokers (Reindeer & Jack Frost)...")
    joker1 = composite_face_card('★', 'hearts', reindeer, "Holiday Reindeer")
    joker1.save(DECK_DIR / 'joker_1.png', 'PNG')
    joker1.save(DECK_DIR / 'JOKER_COLOR.png', 'PNG')
    print("  [SAVED] joker_1.png / JOKER_COLOR.png (Reindeer)")

    joker2 = composite_face_card('★', 'spades', jack_frost, "Jack Frost")
    joker2.save(DECK_DIR / 'joker_2.png', 'PNG')
    joker2.save(DECK_DIR / 'JOKER_MONO.png', 'PNG')
    print("  [SAVED] joker_2.png / JOKER_MONO.png (Jack Frost)")

    # 5. Generate high-visibility CARD 6
    print("\nGenerating Card 6 (Ensuring prominent visible value)...")
    for suit_code, suit_full in [('H', 'hearts'), ('D', 'diamonds'), ('S', 'spades'), ('C', 'clubs')]:
        card6 = composite_pip_6_card(suit_full)
        save_card_all_aliases(card6, '6', '6', suit_code, suit_full, DECK_DIR)

    # 6. Copy to workspace dir and mods faces dir
    if WORKSPACE_DIR.exists():
        print(f"\nMirroring to {WORKSPACE_DIR}...")
        for f in DECK_DIR.glob('*.png'):
            shutil.copy2(f, WORKSPACE_DIR / f.name)

    if MODS_FACES_DIR.exists():
        print(f"\nMirroring to {MODS_FACES_DIR}...")
        for rank in ['K', 'Q', 'J']:
            for s in ['H', 'D', 'S', 'C']:
                src = DECK_DIR / f"{rank}{s}.png"
                if src.exists():
                    shutil.copy2(src, MODS_FACES_DIR / f"victorian_christmas_{rank}{s}.png")
                    shutil.copy2(src, MODS_FACES_DIR / f"{rank}{s}.png")

    print("\n" + "=" * 60)
    print("  ALL CARDS SUCCESSFULLY GENERATED & INTEGRATED!")
    print("=" * 60)

if __name__ == '__main__':
    main()
