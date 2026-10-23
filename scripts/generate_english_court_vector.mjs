#!/usr/bin/env node
/**
 * English Pattern (Anglo-American) court art, drawn as flat vector figures - no AI.
 * Follows "Anglo-American Face Card Design.md": 5 spot colours, two-fold rotational symmetry,
 * diagonal sash over the seam, canonical poses/attributes for each of the 12 figures.
 *
 * Output: one 562 x 862 art panel per court card (SVG + 2x PNG) for generate_english_pattern_base.mjs,
 * which adds the frame, notch and corner index.
 *
 * Usage (from D:\solitaire):
 *   node scripts/generate_english_court_vector.mjs [--out decks/english_pattern_court_art_vector] [CARD ...]
 *   node scripts/generate_english_pattern_base.mjs --art decks/english_pattern_court_art_vector --out decks/english_pattern_vector
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const oi = argv.indexOf('--out');
const OUT = path.resolve(oi >= 0 ? argv[oi + 1] : 'decks/english_pattern_court_art_vector');
const only = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out' && argv[i - 1] !== '--panel');
fs.mkdirSync(OUT, { recursive: true });

// panel size: default is the wide workspace (card is 750 x 1050, panel inset 30 px; the index notch is cut out by the deck builder)
const pi = argv.indexOf('--panel');
const [PX, PY, W, H] = (pi >= 0 ? argv[pi + 1] : '30,30,690,990').split(',').map(Number);
const CX = W / 2, CY = H / 2;
const R = '#D42027', B = '#0050A4', Y = '#F8D316', K = '#000000', P = '#FFFFFF';
const SW = 5;                                               // keyline weight
const yDiag = (x) => CY + (65 - (130 * x) / W) * (H / 862);                   // seam line (maps to itself under 180 deg rotation)

const st = (fill, w = SW) => `fill="${fill}" stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------------------------------------------------------------- patterns
const DEFS = `<defs>
  <pattern id="ermine" width="30" height="34" patternUnits="userSpaceOnUse"><rect width="30" height="34" fill="${P}"/>
    <path d="M15 4 C19 9 18 14 15 20 C12 14 11 9 15 4Z M15 20 L15 27 M11 24 L15 20 L19 24" fill="${K}" stroke="${K}" stroke-width="2.5"/></pattern>
  <pattern id="check" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="${Y}"/>
    <rect width="14" height="14" fill="${K}"/><rect x="14" y="14" width="14" height="14" fill="${K}"/></pattern>
  <pattern id="gold" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="22" height="22" fill="${Y}"/>
    <rect y="9" width="22" height="4" fill="${K}"/></pattern>
</defs>`;

// ---------------------------------------------------------------- small parts
const hand = (x, y, rot = 0, s = 1, open = false) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M-19 -6 C-19 -30 19 -30 19 -6 L19 22 C19 38 -19 38 -19 22Z" ${st(P)}/>
  <path d="M-7 -20 L-7 0 M2 -22 L2 0 M11 -18 L11 0" stroke="${K}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  ${open ? `<path d="M-19 4 C-30 0 -32 -14 -22 -18" ${st(P, 4)}/>` : `<path d="M-19 8 C-28 8 -28 -4 -19 -2" ${st(P, 4)}/>`}</g>`;

const sword = (x, y, len, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <path d="M-11 0 L-11 ${-len} L0 ${-len - 26} L11 ${-len} L11 0Z" ${st(P)}/>
  <path d="M0 ${-len - 14} L0 -8" stroke="${B}" stroke-width="4" fill="none"/>
  <rect x="-34" y="-4" width="68" height="15" rx="5" ${st(Y)}/>
  <rect x="-7" y="10" width="14" height="40" ${st(K)}/>
  <circle cx="0" cy="58" r="12" ${st(Y)}/></g>`;

const axe = (x, y, len, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <rect x="-8" y="${-len}" width="16" height="${len}" ${st(Y)}/>
  <path d="M-8 ${-len + 14} C-70 ${-len - 22} -96 ${-len + 20} -84 ${-len + 62} C-64 ${-len + 56} -34 ${-len + 62} -8 ${-len + 56}Z" ${st(B)}/>
  <path d="M-8 ${-len + 14} L8 ${-len - 14} L8 ${-len}" ${st(Y)}/></g>`;

const orb = (x, y, r) => `<g transform="translate(${x} ${y})">
  <circle r="${r}" ${st(Y)}/><path d="M${-r} 0 H${r}" stroke="${K}" stroke-width="4"/>
  <ellipse rx="${r * 0.42}" ry="${r}" ${st('none', 4)}/>
  <rect x="-6" y="${-r - 30}" width="12" height="30" ${st(Y)}/><rect x="-16" y="${-r - 22}" width="32" height="11" ${st(Y)}/>
  <circle cx="0" cy="0" r="${r * 0.3}" ${st(R, 3)}/></g>`;

const flower = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M0 0 L0 90" stroke="${K}" stroke-width="7" fill="none" stroke-linecap="round"/>
  ${[0, 90, 180, 270].map((a) => `<ellipse cx="0" cy="-21" rx="14" ry="22" transform="rotate(${a})" ${st(R, 4)}/>`).join('')}
  <circle r="10" ${st(Y, 4)}/></g>`;

const sceptre = (x, y, len) => `<g transform="translate(${x} ${y})">
  <rect x="-6" y="0" width="12" height="${len}" ${st(Y)}/>
  ${[0, 120, 240].map((a) => `<ellipse cx="0" cy="-26" rx="9" ry="22" transform="rotate(${a})" ${st(R, 4)}/>`).join('')}
  <circle r="10" ${st(Y, 4)}/><circle cx="0" cy="${len * 0.35}" r="12" ${st(B, 4)}/></g>`;

const pole = (x1, y1, x2, y2, bladeAt = 'top', bladeCol = B) => {
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const len = Math.hypot(x2 - x1, y2 - y1);
  return `<g transform="translate(${x1} ${y1}) rotate(${ang})"><rect x="0" y="-6" width="${len}" height="12" ${st(Y)}/>
    <path d="M${len - 6} -6 C${len + 20} -44 ${len + 74} -40 ${len + 86} 0 C${len + 74} 40 ${len + 20} 44 ${len - 6} 6Z" ${st(bladeCol)}/>
    <path d="M${len + 10} 0 H${len + 66}" stroke="${K}" stroke-width="3"/></g>`;
};

const leaf = (x, y, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 C-14 -14 -8 -40 0 -52 C8 -40 14 -14 0 0Z" ${st(B, 4)}/><path d="M0 0 V-44" stroke="${K}" stroke-width="3"/></g>`;

// ---------------------------------------------------------------- body (upright, centred on CX)
function body(c) {
  const { main, alt } = c;
  const lc = c.split ? c.split[0] : main, rc = c.split ? c.split[1] : main;     // torso halves
  const lm = c.split ? c.split[1] : alt, rm = c.split ? c.split[0] : alt;       // mantle colours (opposite of torso for split cloaks)
  return `
  <path d="M-60 660 L-60 262 C-60 242 110 228 200 226 L${CX} 226 L${CX} 660Z" ${st(lc)}/>
  <path d="M${CX} 226 L362 226 C452 228 622 242 622 262 L622 660 L${CX} 660Z" ${st(rc)}/>
  <path d="M-60 660 L-60 262 C-60 242 110 228 200 226 L206 238 L180 660Z" ${st(lm)}/>
  <path d="M622 660 L622 262 C622 242 452 228 362 226 L356 238 L382 660Z" ${st(rm)}/>
  <path d="M-30 270 C-30 252 110 240 204 232" fill="none" stroke="${K}" stroke-width="30" stroke-linecap="butt"/>
  <path d="M-30 270 C-30 252 110 240 204 232" fill="none" stroke="${Y}" stroke-width="20" stroke-linecap="butt"/>
  <path d="M592 270 C592 252 452 240 358 232" fill="none" stroke="${K}" stroke-width="30" stroke-linecap="butt"/>
  <path d="M592 270 C592 252 452 240 358 232" fill="none" stroke="${Y}" stroke-width="20" stroke-linecap="butt"/>
  <path d="M200 236 L244 236 L226 660 L176 660Z" fill="url(#ermine)" stroke="${K}" stroke-width="${SW}" stroke-linejoin="round"/>
  <path d="M318 236 L362 236 L386 660 L336 660Z" fill="url(#ermine)" stroke="${K}" stroke-width="${SW}" stroke-linejoin="round"/>
  <rect x="244" y="212" width="74" height="40" ${st(P)}/>`;
}

// ---------------------------------------------------------------- heads
function faceFront(hx, o) {
  const d = o.dir;           // -1 left, +1 right, 0 front
  const ex = hx + d * 8;
  const eye = (x) => `<path d="M${x - 15} 160 C${x - 6} 148 ${x + 6} 148 ${x + 15} 160 C${x + 6} 170 ${x - 6} 170 ${x - 15} 160Z" ${st(P, 3)}/><circle cx="${x + d * 3}" cy="160" r="5.5" fill="${B}" stroke="${K}" stroke-width="2"/>
    <path d="M${x - 17} 143 C${x - 6} 134 ${x + 8} 134 ${x + 17} 142" stroke="${K}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  let s = '';
  // back hair
  if (o.hair) s += `<path d="M${hx - 66} 150 C${hx - 82} 80 ${hx + 82} 80 ${hx + 66} 150 L${hx + 84} ${o.hairLen || 262} C${hx + 62} 276 ${hx + 70} 210 ${hx + 56} 176 L${hx - 56} 176 C${hx - 70} 210 ${hx - 62} 276 ${hx - 84} ${o.hairLen || 262}Z" ${st(o.hair)}/>`;
  if (o.hair) s += [[-70, 190], [-76, 230], [70, 190], [76, 230]].map(([dx, dy]) => `<path d="M${hx + dx - 10} ${dy - 10} C${hx + dx - 24} ${dy} ${hx + dx - 10} ${dy + 18} ${hx + dx + 4} ${dy + 6}" fill="none" stroke="${K}" stroke-width="3.5" stroke-linecap="round"/>`).join('');
  s += `<path d="M${hx - 56} 150 C${hx - 56} 96 ${hx + 56} 96 ${hx + 56} 150 C${hx + 56} 204 ${hx + 22} 246 ${hx} 246 C${hx - 22} 246 ${hx - 56} 204 ${hx - 56} 150Z" ${st(P)}/>`;
  if (o.beard) {
    const sq = o.beard === 'square';
    s += `<path d="M${hx - 58} 176 C${hx - 74} ${sq ? 270 : 250} ${hx - 44} ${sq ? 316 : 300} ${hx} ${sq ? 312 : 322} C${hx + 44} ${sq ? 316 : 300} ${hx + 74} ${sq ? 270 : 250} ${hx + 58} 176 C${hx + 40} 206 ${hx - 40} 206 ${hx - 58} 176Z" ${st(P)}/>
      <path d="M${hx - 44} 222 C${hx - 40} 252 ${hx - 26} 272 ${hx - 20} 290 M${hx - 8} 232 C${hx - 8} 262 ${hx - 4} 284 ${hx - 2} 304 M${hx + 24} 228 C${hx + 28} 256 ${hx + 30} 276 ${hx + 22} 294 M${hx + 46} 214 C${hx + 52} 240 ${hx + 50} 260 ${hx + 42} 276" stroke="${B}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  s += eye(ex - 24) + eye(ex + 24);
  s += `<path d="M${ex} 164 C${ex + 8 + d * 3} 186 ${ex + 10 + d * 4} 196 ${ex + 2} 200" stroke="${K}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (o.mustache) s += `<path d="M${ex - 38} 214 C${ex - 20} 196 ${ex - 4} 206 ${ex} 210 C${ex + 4} 206 ${ex + 20} 196 ${ex + 38} 214 C${ex + 24} 224 ${ex + 6} 218 ${ex} 216 C${ex - 6} 218 ${ex - 24} 224 ${ex - 38} 214Z" ${st(K, 3)}/>`;
  s += `<path d="M${ex - 17} ${o.beard ? 230 : 218} C${ex - 6} ${o.beard ? 238 : 226} ${ex + 6} ${o.beard ? 238 : 226} ${ex + 17} ${o.beard ? 230 : 218}" stroke="${K}" stroke-width="4" fill="${o.beard ? 'none' : R}" stroke-linecap="round"/>`;
  return s;
}

// profile facing LEFT, drawn about hx; mirrored for right
function faceProfile(hx, o) {
  const f = o.dir > 0 ? -1 : 1;
  const g = `<g transform="translate(${hx} 0) scale(${f} 1) translate(${-hx} 0)">
  ${o.hair ? `<path d="M${hx + 40} 100 C${hx + 96} 100 ${hx + 112} 190 ${hx + 90} 262 C${hx + 70} 240 ${hx + 56} 220 ${hx + 40} 200Z" ${st(o.hair)}/>` : ''}
  <path d="M${hx + 38} 116 C${hx + 22} 86 ${hx - 34} 90 ${hx - 46} 130 L${hx - 52} 154 L${hx - 70} 184 L${hx - 52} 192 L${hx - 56} 206 L${hx - 46} 212 L${hx - 52} 224 L${hx - 42} 244 C${hx - 28} 262 ${hx + 14} 266 ${hx + 44} 252 L${hx + 48} 116Z" ${st(P)}/>
  <path d="M${hx - 40} 142 C${hx - 28} 134 ${hx - 14} 134 ${hx - 4} 140" stroke="${K}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M${hx - 40} 156 C${hx - 28} 146 ${hx - 12} 148 ${hx - 4} 158 C${hx - 16} 166 ${hx - 32} 166 ${hx - 40} 156Z" ${st(P, 3)}/><circle cx="${hx - 28}" cy="156" r="5.5" fill="${B}" stroke="${K}" stroke-width="2"/>
  ${o.beard ? `<path d="M${hx - 50} 210 C${hx - 60} 262 ${hx - 20} 312 ${hx + 40} 300 C${hx + 70} 270 ${hx + 70} 220 ${hx + 46} 190 C${hx + 10} 214 ${hx - 20} 212 ${hx - 50} 210Z" ${st(P)}/>
    <path d="M${hx - 30} 232 C${hx - 28} 262 ${hx - 14} 282 ${hx - 4} 296 M${hx + 4} 232 C${hx + 6} 262 ${hx + 14} 280 ${hx + 22} 292 M${hx + 34} 222 C${hx + 40} 246 ${hx + 40} 266 ${hx + 32} 280" stroke="${B}" stroke-width="4" fill="none" stroke-linecap="round"/>` : ''}
  ${o.mustache ? `<path d="M${hx - 50} 208 C${hx - 30} 192 ${hx - 12} 204 ${hx + 6} 214 C${hx - 12} 224 ${hx - 34} 224 ${hx - 50} 208Z" ${st(K, 3)}/>` : ''}
  <path d="M${hx - 50} 222 L${hx - 30} 224" stroke="${o.beard ? K : R}" stroke-width="5" stroke-linecap="round"/>
  </g>`;
  return g;
}

// ---------------------------------------------------------------- headwear
const crown = (hx, w = 1) => `<g transform="translate(${hx} 0)">
  <path d="M${-60 * w} 118 L${-66 * w} 62 L${-32 * w} 90 L0 44 L${32 * w} 90 L${66 * w} 62 L${60 * w} 118Z" ${st(Y)}/>
  <rect x="${-62 * w}" y="98" width="${124 * w}" height="26" rx="6" ${st(Y)}/>
  <circle cx="0" cy="111" r="8" ${st(R, 3)}/><circle cx="${-34 * w}" cy="111" r="6" ${st(B, 3)}/><circle cx="${34 * w}" cy="111" r="6" ${st(B, 3)}/>
  <circle cx="0" cy="40" r="8" ${st(R, 3)}/><circle cx="${-66 * w}" cy="58" r="6" ${st(R, 3)}/><circle cx="${66 * w}" cy="58" r="6" ${st(R, 3)}/></g>`;

const veil = (hx) => `<path d="M${hx - 70} 112 C${hx - 112} 160 ${hx - 120} 250 ${hx - 100} 300 L${hx - 70} 240Z" ${st(P)}/>
  <path d="M${hx + 70} 112 C${hx + 112} 160 ${hx + 120} 250 ${hx + 100} 300 L${hx + 70} 240Z" ${st(P)}/>`;

const cap = (hx, col, panels = false) => `<g transform="translate(${hx} 0)">
  <path d="M-72 132 C-84 70 84 70 72 132 C50 118 -50 118 -72 132Z" ${st(col)}/>
  ${panels ? `<rect x="-40" y="92" width="80" height="24" fill="url(#check)" stroke="${K}" stroke-width="3"/>` : `<path d="M-60 118 C-30 106 30 106 60 118" stroke="${K}" stroke-width="4" fill="none"/>`}
  <path d="M-72 132 C-50 118 50 118 72 132 L66 144 C40 130 -40 130 -66 144Z" ${st(Y)}/></g>`;

// ---------------------------------------------------------------- the twelve figures
// layers: back items (behind head), body, head, front items. All coordinates upright, panel space.
const FIG = {
  K_hearts: { main: R, alt: B, hx: 270, dir: -1, hair: Y, crown: true, hairLen: 250,
    back: () => `<g transform="rotate(-6 281 120)">${sword(430, 150, 280, -90)}</g>`,
    front: () => `${hand(430, 112, 90, 1.05)}${hand(330, 330, -25, 1.1)}` },
  K_spades: { main: B, alt: R, hx: 296, dir: 1, hair: K, beard: 'square', mustache: true, crown: true, hairLen: 240,
    back: () => '',
    front: () => `${sword(160, 410, 330, 0)}${hand(160, 330, 0, 1.15)}` },
  K_diamonds: { main: R, alt: B, hx: 281, dir: -1, profile: true, hair: K, beard: true, mustache: true, crown: true,
    back: () => axe(400, 480, 400, 8),
    front: () => `${hand(170, 345, -10, 1.15, true)}` },
  K_clubs: { main: B, alt: R, hx: 266, dir: -1, hair: K, beard: true, mustache: true, crown: true, hairLen: 280,
    back: () => '',
    front: () => `${sword(420, 440, 310, 0)}${hand(420, 350, 0, 1.15)}${orb(150, 270, 40)}${hand(150, 345, 0, 1.15)}` },
  Q_hearts: { main: R, alt: B, hx: 268, dir: -1, hair: Y, crown: true, veil: true, hairLen: 270, collar: true,
    back: () => '',
    front: () => `${flower(130, 250, 1.05)}${hand(132, 345, 0, 1.15)}${medal()}` },
  Q_spades: { main: B, alt: R, hx: 294, dir: 1, hair: K, crown: true, veil: true, hairLen: 270,
    back: () => `${sceptre(120, 130, 340)}`,
    front: () => `${hand(120, 330, 0, 1.15)}${flower(430, 250, 1.05)}${hand(432, 345, 0, 1.15)}` },
  Q_diamonds: { main: R, alt: B, hx: 268, dir: -1, hair: K, headdress: true, collar: true,
    back: () => '',
    front: () => `${flower(130, 250, 1.05)}${hand(132, 345, 0, 1.15)}` },
  Q_clubs: { main: R, alt: B, split: [R, B], hx: 268, dir: -1, hair: Y, crown: true, hairLen: 270,
    back: () => '',
    front: () => `${flower(430, 250, 1.05)}${hand(432, 345, 0, 1.15)}${trefoil(120, 300)}${trefoil(440, 300)}` },
  J_hearts: { main: R, alt: B, hx: 281, dir: -1, profile: true, hair: K, mustache: true, cap: R,
    back: () => pole(420, 470, 400, 80),
    front: () => `${hand(190, 340, 0, 1.15)}${leaf(190, 305)}` },
  J_spades: { main: B, alt: Y, hx: 281, dir: 1, profile: true, hair: K, mustache: true, cap: B, panels: true,
    back: () => '',
    front: () => `${pole(130, 470, 250, 250)}${hand(260, 330, 0, 1.15)}` },
  J_diamonds: { main: B, alt: R, hx: 270, dir: -1, hair: Y, cap: Y, hairLen: 250,
    back: () => pole(440, 480, 350, 60),
    front: () => `${hand(400, 345, 0, 1.15)}` },
  J_clubs: { main: R, alt: B, hx: 292, dir: 1, hair: Y, cap: R, panels: true, hairLen: 240,
    back: () => '',
    front: () => `${pole(160, 480, 160, 70, 'top', Y)}<rect x="130" y="320" width="60" height="12" ${st(Y)}/>${hand(160, 360, 0, 1.15)}` },
};
const ARMS = {
  K_hearts: [[430, 112], [330, 330]], K_spades: [[160, 330]], K_diamonds: [[170, 345]], K_clubs: [[420, 350], [150, 345]],
  Q_hearts: [[132, 345]], Q_spades: [[120, 330], [432, 345]], Q_diamonds: [[132, 345]], Q_clubs: [[432, 345]],
  J_hearts: [[190, 340]], J_spades: [[260, 330]], J_diamonds: [[400, 345]], J_clubs: [[160, 360]],
};
function arm(hx, hy, hx0, c) {                     // sleeve tube from the shoulder to the hand, with a gold cuff
  const sx = hx < hx0 ? 70 : 492, sy = 300;
  const mx = (sx + hx) / 2 + (hx < hx0 ? -26 : 26), my = (sy + hy) / 2 + 24;
  const d = `M${sx} ${sy} Q${mx} ${my} ${hx} ${hy - 18}`;
  return `<path d="${d}" fill="none" stroke="${K}" stroke-width="60" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.alt}" stroke-width="50" stroke-linecap="round"/>
    <circle cx="${hx}" cy="${hy - 22}" r="30" ${st(Y, 4)}/>`;
}
function medal() { return `<circle cx="281" cy="372" r="22" ${st(Y)}/><circle cx="281" cy="372" r="9" ${st(R, 3)}/>`; }
function trefoil(x, y) { return `<g transform="translate(${x} ${y})">${[[0, -12], [-12, 8], [12, 8]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="11" ${st(K, 2)}/>`).join('')}</g>`; }

function figure(c, name) {
  const DY = 44, HS = 1.28;                        // body drop and head enlargement
  let s = `<g transform="translate(0 28)">${c.back()}</g>`;
  s += `<g transform="translate(0 ${DY})">${body(c)}${c.collar ? `<rect x="244" y="236" width="74" height="22" fill="url(#check)" stroke="${K}" stroke-width="3"/>` : ''}</g>`;
  s += `<g transform="translate(0 ${DY - 30})">${(ARMS[name] || []).map(([x, y]) => arm(x, y, 281, c)).join('')}</g>`;
  let hd = c.profile ? faceProfile(c.hx, c) : faceFront(c.hx, c);
  if (c.veil) hd += veil(c.hx);
  if (c.crown) hd += crown(c.hx, 1);
  if (c.cap) hd += cap(c.hx, c.cap, c.panels);
  if (c.headdress) hd += `<path d="M${c.hx - 72} 130 C${c.hx - 84} 66 ${c.hx + 84} 66 ${c.hx + 72} 130 C${c.hx + 50} 116 ${c.hx - 50} 116 ${c.hx - 72} 130Z" fill="url(#gold)" stroke="${K}" stroke-width="${SW}"/>`;
  s += `<g transform="translate(0 ${DY})"><g transform="translate(${c.hx} 250) scale(${HS}) translate(${-c.hx} -250)">${hd}</g></g>`;
  s += `<g transform="translate(0 28)">${c.front()}</g>`;
  return `<g transform="translate(${CX} 20) scale(${(1.22 * (W / 690)).toFixed(3)}) translate(-281 -20)">${s}</g>`;
}

function courtSvg(name) {
  const fig = figure(FIG[name], name);
  const top = `<clipPath id="top"><polygon points="0,0 ${W},0 ${W},${yDiag(W)} 0,${yDiag(0)}"/></clipPath>`;
  const bot = `<clipPath id="bot"><polygon points="0,${H} ${W},${H} ${W},${yDiag(W)} 0,${yDiag(0)}"/></clipPath>`;
  const sash = `<polygon points="0,${yDiag(0) + 26} ${W},${yDiag(W) + 26} ${W},${yDiag(W) - 26} 0,${yDiag(0) - 26}" ${st(Y)}/>
    <line x1="0" y1="${yDiag(0)}" x2="${W}" y2="${yDiag(W)}" stroke="${K}" stroke-width="4" stroke-dasharray="14 10"/>
    <line x1="0" y1="${yDiag(0) - 14}" x2="${W}" y2="${yDiag(W) - 14}" stroke="${K}" stroke-width="2.5"/>
    <line x1="0" y1="${yDiag(0) + 14}" x2="${W}" y2="${yDiag(W) + 14}" stroke="${K}" stroke-width="2.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  ${DEFS}<defs>${top}${bot}</defs>
  <rect width="${W}" height="${H}" fill="${P}"/>
  <g clip-path="url(#top)">${fig}</g>
  <g clip-path="url(#bot)"><g transform="rotate(180 ${CX} ${CY})">${fig}</g></g>
  ${sash}
</svg>`;
}

for (const name of Object.keys(FIG)) {
  if (only.length && !only.includes(name)) continue;
  const svg = courtSvg(name);
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg);
  await sharp(Buffer.from(svg), { density: 144 }).resize(W * 2, H * 2).png().toFile(path.join(OUT, `${name}.png`));
  console.log('wrote', name);
}
