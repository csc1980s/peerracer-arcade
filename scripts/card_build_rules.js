/**
 * Card build rules for Solitaire Sovereign decks (750 x 1050 px faces).
 *
 * Source of truth: "Playing Card Index Proportions.md" - Digital UI Optimized profile.
 * Every number below is that profile (written for 350 x 490) scaled by 750 / 350.
 *
 * RULES
 *  1. Index = rank on top, 12.9 px gap, suit pip below. 130.7 px rank cap height, 83.6 px pip.
 *     Left margin 38.6 px, top margin 42.9 px, index box 120 px wide, centred on x = 98.6.
 *  2. One colour per index: red suits (hearts, diamonds) -> red rank AND red pip,
 *     black suits (spades, clubs) -> black rank AND black pip. Never mixed.
 *  3. The bottom-right index is the top-left one rotated 180 degrees about the card centre (375, 525).
 *  4. The "10" is squeezed (textLength) to exactly the 120 px index box so it never crowds the art.
 *  5. Court cards and pip cards that have an inner frame/art panel get a rounded NOTCH cut out of the
 *     panel's top-left and bottom-right corners so the index sits on the plain card border,
 *     never over the art. Frame lines follow the notch.
 *  6. The notch stays tight to the index (6 px right of it, 8 px below it) and pips must never be
 *     clipped by it: pip columns sit at x >= 0.32 * 750 = 240, well right of the notch edge (x = 164.6).
 *  7. Corner ornaments must not touch the index: the top-left and bottom-right flourishes are
 *     dropped, only the other two corners keep them.
 *  8. Art-style aces (full-art centre) get the same index; old index pixels are removed by
 *     filling from the surrounding gradient, not with a flat colour.
 *  9. After any change, run the index checker on the finished PNGs (tools/card_index/fix_card_indices.py
 *     --apply fixes decks that were built with the older, smaller index).
 */

export const CARD_W = 750;
export const CARD_H = 1050;
const S = CARD_W / 350;

export const INDEX = {
  marginX: 18 * S,          // 38.57
  marginY: 20 * S,          // 42.86
  boxWidth: 56 * S,         // 120
  rankHeight: 61 * S,       // 130.71
  gap: 6 * S,               // 12.86
  pipHeight: 39 * S,        // 83.57
};
INDEX.centerX = INDEX.marginX + INDEX.boxWidth / 2;                       // 98.57
INDEX.pipTop = INDEX.marginY + INDEX.rankHeight + INDEX.gap;              // 186.9
INDEX.bottom = INDEX.pipTop + INDEX.pipHeight;                            // 270.4

export const NOTCH = {
  right: INDEX.marginX + INDEX.boxWidth + 6,   // 164.6
  bottom: INDEX.bottom + 8,                    // 278.4
  concaveRadius: 20,
  convexRadius: 12,
};

export const isRedSuit = (suit) => suit === 'hearts' || suit === 'diamonds';

/** Vertical extent of each mini pip's path (see getMiniPipSvg): [top y, height], x centred on 0. */
const PIP_BOX = { hearts: [0, 40], diamonds: [-2, 40], spades: [-4, 54], clubs: [-2, 46] };

/**
 * Corner index SVG for the top-left corner (wrap in a rotate(180 375 525) group for bottom-right).
 * `miniPipSvg` is the pip drawn around x = 0 using the path coordinates of getMiniPipSvg.
 */
export function cornerIndexSvg({ rank, suit, rankColor, miniPipSvg, rankSvg, pipBox, fontFamily = "'Cinzel', 'Georgia', serif" }) {
  // rankSvg: optional pre-built rank artwork drawn around x = 0 with its baseline at y = 0 (cap height = INDEX.rankHeight)
  // pipBox: optional [top y, height] of miniPipSvg when it does not use the old getMiniPipSvg coordinates
  const [y0, h] = pipBox || PIP_BOX[suit] || [0, 40];
  const pipScale = INDEX.pipHeight / h;
  const baseline = INDEX.marginY + INDEX.rankHeight;
  const fontSize = Math.round(INDEX.rankHeight / 0.7);   // cap height of Cinzel / Georgia lining figures ~0.7 em
  const condensed = String(rank).length > 1;
  const rankText = rankSvg || `<text x="0" y="0" font-family="${fontFamily}" font-weight="900" font-size="${fontSize}" fill="${rankColor}" text-anchor="middle"${condensed ? ` textLength="${INDEX.boxWidth}" lengthAdjust="spacingAndGlyphs"` : ''}>${rank}</text>`;
  return `
  <g transform="translate(${INDEX.centerX.toFixed(2)}, ${baseline.toFixed(2)})">${rankText}</g>
  <g transform="translate(${INDEX.centerX.toFixed(2)}, ${INDEX.pipTop.toFixed(2)}) scale(${pipScale.toFixed(4)}) translate(0, ${-y0})">
    ${miniPipSvg}
  </g>`;
}

/**
 * Path for a rounded rectangle with the index notch cut out of the top-left and bottom-right corners.
 * `inset` shrinks the rectangle (for inner frames); the notch grows by the same amount so the
 * frame lines stay evenly spaced around it.
 */
export function notchedRectPath(x, y, w, h, r, inset = 0) {
  const x0 = x + inset, y0 = y + inset, x1 = x + w - inset, y1 = y + h - inset;
  const rr = Math.max(r - inset, 2);
  const kr = Math.max(NOTCH.convexRadius - inset, 2), nr = NOTCH.concaveRadius + inset;
  const nx = NOTCH.right + inset, ny = NOTCH.bottom + inset;
  const bx = CARD_W - nx, by = CARD_H - ny;
  const f = (n) => +n.toFixed(2);
  return [
    `M${f(nx + kr)} ${f(y0)}`,
    `L${f(x1 - rr)} ${f(y0)}`, `A${f(rr)} ${f(rr)} 0 0 1 ${f(x1)} ${f(y0 + rr)}`,
    `L${f(x1)} ${f(by - kr)}`, `A${f(kr)} ${f(kr)} 0 0 1 ${f(x1 - kr)} ${f(by)}`,
    `L${f(bx + nr)} ${f(by)}`, `A${f(nr)} ${f(nr)} 0 0 0 ${f(bx)} ${f(by + nr)}`,
    `L${f(bx)} ${f(y1 - kr)}`, `A${f(kr)} ${f(kr)} 0 0 1 ${f(bx - kr)} ${f(y1)}`,
    `L${f(x0 + rr)} ${f(y1)}`, `A${f(rr)} ${f(rr)} 0 0 1 ${f(x0)} ${f(y1 - rr)}`,
    `L${f(x0)} ${f(ny + kr)}`, `A${f(kr)} ${f(kr)} 0 0 1 ${f(x0 + kr)} ${f(ny)}`,
    `L${f(nx - nr)} ${f(ny)}`, `A${f(nr)} ${f(nr)} 0 0 0 ${f(nx)} ${f(ny - nr)}`,
    `L${f(nx)} ${f(y0 + kr)}`, `A${f(kr)} ${f(kr)} 0 0 1 ${f(nx + kr)} ${f(y0)}`,
    'Z',
  ].join(' ');
}
