# Word Tiles: Sovereign Lexicon — Implemented Game Rules

## 1. Overview & Board Geometry
- **Internal Provisional Name:** Word Tiles (Sovereign Lexicon)
- **Version:** 1.0.0
- **Board Dimensions:** Exactly **$15 \times 15$** cells (Rows 0–14, Columns 0–14). Total of 225 grid cells.
- **Center Cell:** Located at row 7, column 7 `(7, 7)`, marked with a Center Star (`★`) and a pre-assigned Double Word (`2W`) bonus for the opening move.
- **Turn Ownership:** Strictly turn-based: Human Player $\leftrightarrow$ Computer AI.

---

## 2. Tile Distribution & Scoring Values
The game uses a standard 100-tile English letter distribution:

| Letter | Quantity | Point Value | Letter | Quantity | Point Value |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **A** | 9 | 1 pt | **N** | 6 | 1 pt |
| **B** | 2 | 3 pts | **O** | 8 | 1 pt |
| **C** | 2 | 3 pts | **P** | 2 | 3 pts |
| **D** | 4 | 2 pts | **Q** | 1 | 10 pts |
| **E** | 12 | 1 pt | **R** | 6 | 1 pt |
| **F** | 2 | 4 pts | **S** | 4 | 1 pt |
| **G** | 3 | 2 pts | **T** | 6 | 1 pt |
| **H** | 2 | 4 pts | **U** | 4 | 1 pt |
| **I** | 9 | 1 pt | **V** | 2 | 4 pts |
| **J** | 1 | 8 pts | **W** | 2 | 4 pts |
| **K** | 1 | 5 pts | **X** | 1 | 8 pts |
| **Y** | 2 | 4 pts | **Z** | 1 | 10 pts |
| **_ (Wildcard)** | 2 | 0 pts | **Total** | **100 Tiles** | — |

### Wildcard / Blank Tile Rules
- Blank tiles (`_`) score **0 letter points**.
- When placed on the board, the player designates which letter `[A-Z]` the tile represents for word formation.
- Once committed to the board, a blank tile permanently retains its designated letter.
- Words containing blanks still receive word multiplier bonuses (e.g., Double Word or Triple Word) applied to the rest of the word's letter sum.

---

## 3. Premium Squares & Multiplier Activation

The $15 \times 15$ board contains 61 symmetrical premium multiplier cells:
1. **Triple Word (3W - 8 cells):** Triples the score of any newly formed word covering the cell.
   - Coordinates: `(0,0)`, `(0,7)`, `(0,14)`, `(7,0)`, `(7,14)`, `(14,0)`, `(14,7)`, `(14,14)`.
2. **Double Word (2W - 17 cells):** Doubles the score of any newly formed word covering the cell.
   - Coordinates: Diagonals `(1,1)`, `(2,2)`, `(3,3)`, `(4,4)`, `(10,10)`, `(11,11)`, `(12,12)`, `(13,13)`, `(1,13)`, `(2,12)`, `(3,11)`, `(4,10)`, `(10,4)`, `(11,3)`, `(12,2)`, `(13,1)`, and Center Star `(7,7)`.
3. **Triple Letter (3L - 12 cells):** Triples the point value of the specific tile placed on this cell.
   - Coordinates: `(1,5)`, `(1,9)`, `(5,1)`, `(5,5)`, `(5,9)`, `(5,13)`, `(9,1)`, `(9,5)`, `(9,9)`, `(9,13)`, `(13,5)`, `(13,9)`.
4. **Double Letter (2L - 24 cells):** Doubles the point value of the specific tile placed on this cell.
   - Coordinates: `(0,3)`, `(0,11)`, `(2,6)`, `(2,8)`, `(3,0)`, `(3,7)`, `(3,14)`, `(6,2)`, `(6,6)`, `(6,8)`, `(6,12)`, `(7,3)`, `(7,11)`, `(8,2)`, `(8,6)`, `(8,8)`, `(8,12)`, `(11,0)`, `(11,7)`, `(11,14)`, `(12,6)`, `(12,8)`, `(14,3)`, `(14,11)`.

### Strict Multiplier Permanence Rule
> **Crucial Rule Invariant:** Premium multipliers apply **ONLY on the turn a newly placed tile covers the premium cell**.
> Cells covered in previous turns do **NOT** reactivate letter multipliers or word multipliers when new cross-words intersect them.

---

## 4. Placement & Movement Rules
1. **Rack Size:** Both players maintain a rack capacity of **7 tiles**.
2. **Opening Move:**
   - Must cover the designated Center Star coordinate `(7, 7)`.
   - Must form a continuous word of at least 2 letters.
3. **Collinearity:**
   - All newly placed tiles during a single turn must align along a single straight horizontal row or single vertical column.
   - Diagonal placements are illegal.
4. **Continuity & Bridging:**
   - Placed tiles must form a continuous sequence. Empty gaps between newly placed tiles are prohibited, *except* where existing committed board tiles bridge the gap.
5. **Connectivity:**
   - On Turn 2 and subsequent moves, at least one newly placed tile must touch (orthogonally adjacent: up, down, left, right) at least one previously committed tile on the board.
6. **Word Extraction & Validation:**
   - The primary word formed along the line of placement is validated.
   - Every perpendicular cross-word formed by newly placed tiles (length $\ge 2$) is extracted and validated.
   - **All** extracted words must exist in the license-verified dictionary (`enable1.txt`). If even one cross-word is invalid, the entire move is rejected.

---

## 5. Scoring Calculations & Bonuses
- **Main Word Score:** Sum of letter values (with any newly placed letter multipliers applied), multiplied by the product of all newly placed word multipliers.
- **Cross-Word Scores:** Each formed cross-word is scored independently using the same multiplier rules.
- **Full-Rack Bonus ("Bingo"):** If a player places all **7 tiles** from their rack in a single turn, an additional **+50 points** is added to their score after all word multipliers are evaluated.

---

## 6. Turn Progression, Passes & Tile Exchanges
- **Tile Recall:** Temporary uncommitted tiles placed on the board can be recalled back to the rack at any time before committing.
- **Tile Shuffle:** Players can shuffle the order of tiles in their rack without consuming a turn.
- **Tile Exchange:**
  - A player may swap 1 to 7 tiles from their rack with the bag.
  - **Eligibility Gate:** The common tile bag must contain at least **7 tiles**. Exchanges are disallowed if $< 7$ tiles remain.
  - Exchanging tiles consumes the player's turn.
- **Pass Behavior:**
  - A player may pass their turn.
  - If **4 consecutive passes** occur (2 consecutive rounds of passes by both players), the game terminates immediately.

---

## 7. End of Game & Final Score Adjustments
The game ends when:
1. The common tile bag is completely empty AND one player plays the final tile from their rack; OR
2. Four consecutive passes occur; OR
3. No legal moves can be generated.

### Final Scoring Adjustments:
- If a player empties their rack when the bag is empty:
  - That player is awarded the sum of the point values of all unplayed tiles remaining in the opponent's rack.
  - The opponent has the sum of the point values of their unplayed tiles deducted from their score.
- If the game ends due to consecutive passes:
  - Both players have the sum of their unplayed rack tiles deducted from their final score.
- The player with the highest final adjusted score is declared the winner.
