/**
 * Jade Pavilion — Board Layouts
 *
 * Every position is { x, y, z } in HALF-TILE units: a tile covers x..x+2
 * horizontally, y..y+2 vertically, and sits on layer z. Half steps (odd values)
 * let a tile straddle two tiles below it, like the cap of the Classic Turtle.
 *
 * Layout shapes are traditional/geometric and authored here from scratch.
 */

// Helper: a solid block of tiles on one layer, in whole-tile coordinates.
function block(col0, row0, cols, rows, z) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: (col0 + c) * 2, y: (row0 + r) * 2, z });
    }
  }
  return out;
}

// Helper: one row of tiles from col a to col b inclusive.
function row(a, b, r, z) {
  return block(a, r, b - a + 1, 1, z);
}

function classicTurtle() {
  const p = [];
  // Ground layer: 8 staggered rows plus the three "head and tail" tiles.
  p.push(...row(1, 12, 0, 0));
  p.push(...row(3, 10, 1, 0));
  p.push(...row(2, 11, 2, 0));
  p.push(...row(1, 12, 3, 0));
  p.push(...row(1, 12, 4, 0));
  p.push(...row(2, 11, 5, 0));
  p.push(...row(3, 10, 6, 0));
  p.push(...row(1, 12, 7, 0));
  p.push({ x: 0, y: 7, z: 0 });
  p.push({ x: 26, y: 7, z: 0 });
  p.push({ x: 28, y: 7, z: 0 });
  // Upper shell.
  p.push(...block(4, 1, 6, 6, 1));
  p.push(...block(5, 2, 4, 4, 2));
  p.push(...block(6, 3, 2, 2, 3));
  // Cap straddles the 2x2 below it.
  p.push({ x: 13, y: 7, z: 4 });
  return p;
}

function pagoda() {
  const p = [];
  p.push(...block(0, 0, 10, 6, 0));
  p.push(...block(1, 1, 8, 4, 1));
  p.push(...block(2, 2, 6, 2, 2));
  p.push({ x: 8, y: 5, z: 3 });
  p.push({ x: 10, y: 5, z: 3 });
  return p;
}

function twinPeaks() {
  const p = [];
  p.push(...block(0, 0, 5, 5, 0));
  p.push(...block(6, 0, 5, 5, 0));
  p.push({ x: 10, y: 4, z: 0 }); // bridge
  p.push(...block(1, 1, 3, 3, 1));
  p.push(...block(7, 1, 3, 3, 1));
  p.push({ x: 10, y: 4, z: 1 }); // bridge keystone
  p.push({ x: 4, y: 4, z: 2 });
  p.push({ x: 16, y: 4, z: 2 });
  return p;
}

function courtyard() {
  const p = [];
  // Ground: 12x8 with an open 4x2 garden in the middle.
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 12; c++) {
      if (r >= 3 && r <= 4 && c >= 4 && c <= 7) continue;
      p.push({ x: c * 2, y: r * 2, z: 0 });
    }
  }
  // North and south walls.
  p.push(...row(0, 11, 0, 1));
  p.push(...row(0, 11, 7, 1));
  return p;
}

function lantern() {
  const p = [];
  p.push(...block(0, 0, 6, 6, 0));
  p.push(...block(1, 1, 4, 4, 1));
  p.push(...block(2, 2, 2, 2, 2));
  return p;
}

export const MAHJONG_LAYOUTS = {
  lantern:   { id: 'lantern',   name: 'Lantern',        difficulty: 'Easy',    build: lantern },
  twin_peaks:{ id: 'twin_peaks',name: 'Twin Peaks',     difficulty: 'Easy',    build: twinPeaks },
  pagoda:    { id: 'pagoda',    name: 'Pagoda',         difficulty: 'Medium',  build: pagoda },
  courtyard: { id: 'courtyard', name: 'Courtyard',      difficulty: 'Medium',  build: courtyard },
  turtle:    { id: 'turtle',    name: 'Classic Turtle', difficulty: 'Classic', build: classicTurtle }
};

export const DEFAULT_LAYOUT_ID = 'turtle';

export function getLayoutPositions(layoutId) {
  const layout = MAHJONG_LAYOUTS[layoutId] || MAHJONG_LAYOUTS[DEFAULT_LAYOUT_ID];
  return layout.build();
}
