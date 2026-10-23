# Originality Notes & Reference Boundary Disclosure

## 1. Context Disclosure & Process Boundary

In compliance with professional reverse-engineering ethics and project guidelines:

> **Formal Process Disclosure:** The current implementation context previously inspected and analyzed client-side artifacts of the web game *Outspell* (`outspell.app`) for technical educational research. Consequently, this implementation is **not** characterized as a formally isolated clean-room procedure (which would necessitate a completely air-gapped developer with zero access to reference research).
> 
> However, an uncompromising **strict originality boundary** was maintained throughout the engineering of this game. No decompiled code, proprietary data structures, extracted dictionaries, or graphical/audio assets from the reference study were reused, translated, or adapted.

---

## 2. Independence Matrix: Reference Study vs. Word Tiles

The following matrix documents how the implemented game intentionally diverges from the reference study across all core dimensions:

| Dimension | Studied Game (Outspell) | Word Tiles: Sovereign Lexicon (This Implementation) | Originality Boundary |
|---|---|---|---|
| **Board Geometry** | $13 \times 13$ cells (Center `[6,6]`) | **$15 \times 15$ cells (Center `[7,7]`)** | **Original Geometry** |
| **Rack Capacity** | 6 tiles | **7 tiles** | **Standard Original** |
| **Full-Rack Bonus** | +50 pts for placing 6 tiles | **+50 pts for placing 7 tiles** | **Standard Original** |
| **Blank / Wildcard Scoring** | Adopts full point value of letter (e.g. Blank as 'Z' = 10 pts) | **Strictly 0 letter points** | **Fair-Play Classic Rule** |
| **Multiplier Permanence** | Multipliers permanently active; re-score on every crossing word | **Multipliers activate ONLY when newly placed tile covers cell** | **Prevents Snowball Exploits** |
| **End-Game Deduction** | Zero tile deduction; raw accumulated score | **Tournament penalty deduction for unplayed tiles** | **Standard Tournament Rule** |
| **Dictionary Source** | Extracted proprietary `user_words.txt` & `opponent_words.txt` | **Public Domain ENABLE1 (`enable1.txt`, 172,823 words)** | **Separately Sourced & Verified** |
| **Dictionary Indexing** | Decompiled `WordsTree` | **Original Set + 26-branch Prefix Trie (`WordDictionary`)** | **100% Original Code** |
| **AI Move Generator** | Decompiled `WordsSearcher` with `settings.json` strategies | **Original Anchor-finding DFS pattern search (`AIPlayer`)** | **100% Original Code** |
| **Engine Framework** | Phaser CE (v2.x) Canvas/WebGL bundle | **Native Vanilla JS ES Modules & DOM/CSS Grid** | **100% Original Platform Stack** |
| **Acoustic Audio** | Extracted / Arkadium arena sound | **Synthesized Web Audio API (`ProceduralSoundEngine`)** | **100% Original Synthesis** |
| **Visual Presentation** | Distinctive green/yellow cartoon aesthetic | **Luxury maple/ivory wooden tiles on dark emerald felt** | **Original Solitaire Sovereign Theme** |

---

## 3. Intellectual Property Boundaries & Legal Precedent

Under U.S. copyright law (**17 U.S.C. § 102(b)** and Copyright Office Circular 33):
> *"In no case does copyright protection for an original work of authorship extend to any idea, procedure, process, system, method of operation, concept, principle, or discovery, regardless of the form in which it is described, explained, illustrated, or embodied in such work."*

While the abstract rules of turn-based crossword board games (placing letter tiles on a grid to form intersecting words) constitute an unprotectable method of play, protection applies strictly to:
1. **Source code and compiled binaries:** 100% newly written original ES modules.
2. **Visual artwork, sprites, and typography:** Custom procedural CSS/SVG vector presentation aligned with the Solitaire Sovereign design system.
3. **Instructional text and rule explanations:** All instructions in `RULES.md` and UI modals are freshly authored in original language.
4. **Trademarks and Brand Identity:** The provisional title *"Word Tiles: Sovereign Lexicon"* is used internally; no claim of trademark clearance is made.

---

## 4. Unresolved Licensing & Distribution Considerations

- **Dictionary Verification:** The ENABLE1 word list is verified Public Domain (compiled in 1997 by Alan Beale and the Cooper family). It is free of copyright restrictions.
- **Sanctioned Tournament Lexicons:** If this game is ever offered for sanctioned competitive tournament play under specific organizational bodies (such as WESPA or NASPA), specific copyrighted lists (e.g., Collins Scrabble Words `CSW` or Official Tournament and Club Word List `NWL`) would require a commercial license from their respective rights-holders. For casual browser platform gaming, the public-domain ENABLE1 list is fully cleared and optimal.
