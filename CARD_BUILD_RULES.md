# Card build rules (decks, 750 x 1050 px)

Source: "Playing Card Index Proportions.md", Digital UI Optimized profile, scaled x2.143 from 350 x 490.
The numbers live in `scripts/card_build_rules.js`; `scripts/generate_all_themed_decks.js` imports them.

| Part | Rule |
|---|---|
| Index stack | rank on top, 12.9 px gap, suit pip below |
| Rank | 130.7 px tall (12.45 % of height) |
| Pip | 83.6 px tall (about 64 % of the rank) |
| Margins | 38.6 px from the left edge, 42.9 px from the top |
| Index box | 120 px wide, centred on x = 98.6 (must stay under 16 % of card width) |
| Colour | one colour per index: red suits = red rank + red pip, black suits = black rank + black pip |
| Bottom-right | the top-left index rotated 180 degrees about (375, 525) |
| "10" | squeezed to the 120 px box (about 80 % of two full digits) |
| Art panel / frame | rounded notch cut from its top-left and bottom-right corners, 6 px right of and 8 px below the index; frame lines follow the notch |
| Pips | never clipped by the notch; pip columns start at x >= 240, the notch edge is at x = 164.6 |
| Corner ornaments | none under the index (top-left and bottom-right flourishes removed) |
| Art-style aces | same index; old index removed by filling from the surrounding gradient |

Fixing finished PNG decks that still have the old small index: `tools/card_index/fix_card_indices.py decks --apply`
(originals are saved in each deck's `_index_backup` folder).
Cards it skips on purpose: royal_cats K/Q of spades, classic_standard K/Q/J of spades, all victorian_christmas courts.
