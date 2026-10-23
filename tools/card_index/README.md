# Corner index fixer

    python fix_card_indices.py D:\solitaire\decks            # preview into D:\solitaire\decks_index_preview
    python fix_card_indices.py D:\solitaire\decks --apply    # write into the decks (originals saved in <deck>\_index_backup)
    python fix_card_indices.py D:\solitaire\decks --deck botanical_garden --card JH

Reads the original <R><S>.png (JH.png) and writes the <R>_<suit>.png (J_hearts.png) the game loads.
Needs Python 3, Pillow, numpy. Keep the fonts/ folder next to the script.
