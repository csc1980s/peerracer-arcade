/**
 * Word Tiles: Sovereign Lexicon — Authoritative Move Validator
 */

export class BoardValidator {
  /**
   * Validate a tentative placement against the current committed board and dictionary.
   * 
   * @param {WordBoard} board - Current committed board state
   * @param {Array<{ row: number, col: number, tile: Tile }>} placements - Placed tiles
   * @param {WordDictionary} dictionary - Lexicon lookup instance
   * @returns {{ valid: boolean, errorCode?: string, error?: string, words?: Array }}
   */
  static validateMove(board, placements, dictionary) {
    if (!placements || placements.length === 0) {
      return { valid: false, errorCode: 'NO_TILES_PLACED', error: 'No tiles placed on the board.' };
    }

    // 1. Check for valid coordinates and cell collisions
    for (const p of placements) {
      if (p.row < 0 || p.row >= board.size || p.col < 0 || p.col >= board.size) {
        return { valid: false, errorCode: 'OUT_OF_BOUNDS', error: `Placement [${p.row}, ${p.col}] is outside the board.` };
      }
      const cell = board.getCell(p.row, p.col);
      if (cell && cell.isOccupied() && cell.committed) {
        return { valid: false, errorCode: 'CELL_ALREADY_OCCUPIED', error: `Cell [${p.row}, ${p.col}] already contains a committed tile.` };
      }
      if (!p.tile) {
        return { valid: false, errorCode: 'MISSING_TILE', error: `Placement at [${p.row}, ${p.col}] has no tile payload.` };
      }
      if (p.tile.isBlank && !p.tile.designatedLetter) {
        return { valid: false, errorCode: 'BLANK_UNASSIGNED', error: 'Blank tile must be assigned a letter before committing.' };
      }
    }

    // Check for duplicate placement at identical coordinate
    const coordSet = new Set();
    for (const p of placements) {
      const key = `${p.row},${p.col}`;
      if (coordSet.has(key)) {
        return { valid: false, errorCode: 'DUPLICATE_COORDINATE', error: `Multiple tiles placed at [${p.row}, ${p.col}].` };
      }
      coordSet.add(key);
    }

    // 2. Collinearity Check: All placed tiles must share a single row or single column
    let isHorizontal = true;
    let isVertical = true;
    const firstRow = placements[0].row;
    const firstCol = placements[0].col;

    for (let i = 1; i < placements.length; i++) {
      if (placements[i].row !== firstRow) isHorizontal = false;
      if (placements[i].col !== firstCol) isVertical = false;
    }

    if (!isHorizontal && !isVertical) {
      return { valid: false, errorCode: 'NON_LINEAR_PLACEMENT', error: 'Placed tiles must be in a single straight row or column.' };
    }

    // Build lookup for quick coordinate access of the tentative state
    const placementMap = new Map();
    for (const p of placements) {
      placementMap.set(`${p.row},${p.col}`, p.tile);
    }

    const getTileAt = (r, c) => {
      if (r < 0 || r >= board.size || c < 0 || c >= board.size) return null;
      if (placementMap.has(`${r},${c}`)) return placementMap.get(`${r},${c}`);
      const cell = board.getCell(r, c);
      return (cell && cell.isOccupied() && cell.committed) ? cell.tile : null;
    };

    // 3. Continuity / Gap-check: Along the line from min to max coordinate,
    // every cell must be occupied (either by a newly placed tile or an existing committed tile)
    if (isHorizontal) {
      const r = firstRow;
      let minCol = placements[0].col;
      let maxCol = placements[0].col;
      for (const p of placements) {
        if (p.col < minCol) minCol = p.col;
        if (p.col > maxCol) maxCol = p.col;
      }
      for (let c = minCol; c <= maxCol; c++) {
        if (!getTileAt(r, c)) {
          return { valid: false, errorCode: 'NON_CONTIGUOUS_PLACEMENT', error: 'Placed tiles must form a continuous line without empty gaps.' };
        }
      }
    } else {
      const c = firstCol;
      let minRow = placements[0].row;
      let maxRow = placements[0].row;
      for (const p of placements) {
        if (p.row < minRow) minRow = p.row;
        if (p.row > maxRow) maxRow = p.row;
      }
      for (let r = minRow; r <= maxRow; r++) {
        if (!getTileAt(r, c)) {
          return { valid: false, errorCode: 'NON_CONTIGUOUS_PLACEMENT', error: 'Placed tiles must form a continuous line without empty gaps.' };
        }
      }
    }

    // 4. Opening Turn vs Subsequent Turns Rules
    const isFirstMove = !board.hasCommittedTiles();
    const center = board.center;

    if (isFirstMove) {
      // Must cover center cell
      const coversCenter = placements.some(p => p.row === center.row && p.col === center.col);
      if (!coversCenter) {
        return { valid: false, errorCode: 'CENTER_REQUIRED', error: `Opening move must cover the center star [${center.row}, ${center.col}].` };
      }
      if (placements.length < 2) {
        return { valid: false, errorCode: 'OPENING_WORD_TOO_SHORT', error: 'Opening word must consist of at least 2 letters.' };
      }
    } else {
      // Subsequent move: At least one placed tile must connect to existing committed tiles
      let connectsToExisting = false;

      // Check orthogonal neighbors of all newly placed tiles
      for (const p of placements) {
        const neighbors = [
          [p.row - 1, p.col],
          [p.row + 1, p.col],
          [p.row, p.col - 1],
          [p.row, p.col + 1]
        ];
        for (const [nr, nc] of neighbors) {
          const cell = board.getCell(nr, nc);
          if (cell && cell.isOccupied() && cell.committed) {
            connectsToExisting = true;
            break;
          }
        }
        if (connectsToExisting) break;
      }

      if (!connectsToExisting) {
        return { valid: false, errorCode: 'DISCONNECTED_PLACEMENT', error: 'Word must connect to existing tiles on the board.' };
      }
    }

    // 5. Word Extraction
    // Determine primary direction if single tile placement
    let primaryDir = isHorizontal ? 'horizontal' : 'vertical';
    if (placements.length === 1) {
      const p = placements[0];
      const hasHorizNeighbors = getTileAt(p.row, p.col - 1) || getTileAt(p.row, p.col + 1);
      const hasVertNeighbors = getTileAt(p.row - 1, p.col) || getTileAt(p.row + 1, p.col);
      if (hasVertNeighbors && !hasHorizNeighbors) {
        primaryDir = 'vertical';
      } else {
        primaryDir = 'horizontal';
      }
    }

    const formedWords = [];

    // Helper to extract a continuous word span along an axis
    const extractWord = (startRow, startCol, direction) => {
      let r = startRow;
      let c = startCol;

      // Find beginning
      if (direction === 'horizontal') {
        while (c > 0 && getTileAt(r, c - 1)) {
          c--;
        }
      } else {
        while (r > 0 && getTileAt(r - 1, c)) {
          r--;
        }
      }

      const cells = [];
      let text = '';
      const beginRow = r;
      const beginCol = c;

      if (direction === 'horizontal') {
        while (c < board.size && getTileAt(r, c)) {
          const tile = getTileAt(r, c);
          const isNew = placementMap.has(`${r},${c}`);
          cells.push({ row: r, col: c, tile, isNew });
          text += tile.getEffectiveLetter();
          c++;
        }
      } else {
        while (r < board.size && getTileAt(r, c)) {
          const tile = getTileAt(r, c);
          const isNew = placementMap.has(`${r},${c}`);
          cells.push({ row: r, col: c, tile, isNew });
          text += tile.getEffectiveLetter();
          r++;
        }
      }

      return {
        text,
        row: beginRow,
        col: beginCol,
        direction,
        cells,
        hasNewTile: cells.some(c => c.isNew)
      };
    };

    // Extract Main Word
    const mainWord = extractWord(placements[0].row, placements[0].col, primaryDir);
    if (mainWord.text.length >= 2) {
      formedWords.push(mainWord);
    }

    // Extract Cross-Words for each placed tile
    const crossDir = (primaryDir === 'horizontal') ? 'vertical' : 'horizontal';
    for (const p of placements) {
      const crossWord = extractWord(p.row, p.col, crossDir);
      if (crossWord.text.length >= 2) {
        formedWords.push(crossWord);
      }
    }

    if (formedWords.length === 0) {
      return { valid: false, errorCode: 'NO_WORDS_FORMED', error: 'Placement does not form any words of 2 or more letters.' };
    }

    // 6. Dictionary Validation
    for (const word of formedWords) {
      if (!dictionary.isValidWord(word.text)) {
        return {
          valid: false,
          errorCode: 'INVALID_WORD',
          error: `'${word.text}' is not a recognized word in the dictionary.`,
          invalidWord: word.text
        };
      }
    }

    return {
      valid: true,
      words: formedWords,
      placements
    };
  }
}
