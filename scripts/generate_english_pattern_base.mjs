#!/usr/bin/env node
/**
 * English Pattern (Anglo-American) base deck generator.
 *
 * Builds decks/english_pattern: number cards, aces, jokers, backs, spritesheet and manifest.
 * Court cards (J/Q/K) use AI art: drop one image per court into court_art/ and re-run.
 *   court_art/K_spades.png  (or KS.png)   ... 12 files: J, Q, K x spades, hearts, diamonds, clubs
 * A court without art gets a neutral placeholder so the deck is always complete.
 *
 * Index, notch and colour rules: card_build_rules.js / CARD_BUILD_RULES.md.
 * Everything is path-only SVG (no fonts), rendered to 750 x 1050 PNG with sharp.
 *
 * Usage (from D:\solitaire):
 *   node scripts/generate_english_pattern_base.mjs                 # -> decks/english_pattern
 *   node scripts/generate_english_pattern_base.mjs --out some/dir --art some/court_art
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INDEX, notchedRectPath, cornerIndexSvg, isRedSuit } from './card_build_rules.js';
import { GLYPHS } from './english_pattern_glyphs.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const ROOT = path.resolve(HERE, '..');
const OUT = path.resolve(opt('--out', path.join(ROOT, 'decks', 'english_pattern')));
const ART = path.resolve(opt('--art', path.join(ROOT, 'decks', 'english_pattern_court_art')));

const W = 750, H = 1050;
const PANEL = (opt('--panel', '94,94,562,862')).split(',').map(Number);   // x,y,w,h of the court art panel
const RED = '#d8232f', BLACK = '#14141a', PAPER = '#fffdf8', EDGE = '#cfc9bb';
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SHORT = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' };
const COURT_NAME = { J: 'Jack', Q: 'Queen', K: 'King' };

// ---------------------------------------------------------------- suit shapes (unit paths, 100 tall, centred on 0,0)
const SUIT_SVG = {
  hearts: (f) => `<path d="M0 50 C-18 34 -50 8 -50 -20 C-50 -40 -36 -50 -22 -50 C-10 -50 -3 -43 0 -34 C3 -43 10 -50 22 -50 C36 -50 50 -40 50 -20 C50 8 18 34 0 50 Z" fill="${f}"/>`,
  diamonds: (f) => `<path d="M0 -50 C10 -26 24 -10 40 0 C24 10 10 26 0 50 C-10 26 -24 10 -40 0 C-24 -10 -10 -26 0 -50 Z" fill="${f}"/>`,
  spades: (f) => `<path d="M0 -50 C10 -30 48 -14 48 12 C48 30 34 38 22 38 C14 38 8 35 5 31 C5 40 10 46 18 50 L-18 50 C-10 46 -5 40 -5 31 C-8 35 -14 38 -22 38 C-34 38 -48 30 -48 12 C-48 -14 -10 -30 0 -50 Z" fill="${f}"/>`,
  clubs: (f) => `<g fill="${f}"><circle cx="0" cy="-26" r="25"/><circle cx="-27" cy="12" r="25"/><circle cx="27" cy="12" r="25"/><circle cx="0" cy="2" r="19"/><path d="M-6 10 C-5 30 -9 42 -22 50 L22 50 C9 42 5 30 6 10 Z"/></g>`,
};
const inkOf = (suit) => (isRedSuit(suit) ? RED : BLACK);
const pip = (suit, x, y, h, flip = false) =>
  `<g transform="translate(${x} ${y}) scale(${(h / 100).toFixed(4)})${flip ? ' rotate(180)' : ''}">${SUIT_SVG[suit](inkOf(suit))}</g>`;

// ---------------------------------------------------------------- rank glyphs
function rankArt(rank, color) {
  const s = INDEX.rankHeight / 1000;
  if (rank === '10') {
    const a = GLYPHS['1'].adv, track = 0.9;            // tuck the 0 against the 1
    const total = a * (1 + track);
    const sx = Math.min(1, INDEX.boxWidth / (total * s));   // squeeze to the index box
    return `<g transform="scale(${(s * sx).toFixed(5)} ${s.toFixed(5)}) translate(${(-total / 2).toFixed(1)} 0)" fill="${color}">
      <path d="${GLYPHS['1'].d}"/><path transform="translate(${(a * track).toFixed(1)} 0)" d="${GLYPHS['0'].d}"/></g>`;
  }
  if (rank === 'JOKER') {
    // five-point star in the rank slot
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.42 : 1, a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(`${(Math.cos(a) * r * 500).toFixed(1)} ${(Math.sin(a) * r * 500 - 500).toFixed(1)}`);
    }
    return `<g transform="scale(${(s * 1.0).toFixed(5)})" fill="${color}"><polygon points="${pts.join(' ')}"/></g>`;
  }
  const g = GLYPHS[rank];
  return `<g transform="scale(${s.toFixed(5)}) translate(${(-g.adv / 2).toFixed(1)} 0)" fill="${color}"><path d="${g.d}"/></g>`;
}

function indexBlock(rank, suit, color, withPip = true) {
  const one = () => cornerIndexSvg({
    rank, suit, rankColor: color,
    rankSvg: rankArt(rank, color),
    miniPipSvg: withPip ? SUIT_SVG[suit](color) : '',
    pipBox: [-50, 100],
  });
  return `${one()}<g transform="rotate(180 ${W / 2} ${H / 2})">${one()}</g>`;
}

const cardShell = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="38" fill="${PAPER}" stroke="${EDGE}" stroke-width="3"/>
  ${inner}
</svg>`;

// ---------------------------------------------------------------- pip cards and aces
const T = 215, B = 835, MID = 525, L = 250, R = 500, C = 375;
const ROW4 = [T, T + (B - T) / 3, T + (2 * (B - T)) / 3, B];
const PIP_LAYOUT = {
  2: [[C, T], [C, B]],
  3: [[C, T], [C, MID], [C, B]],
  4: [[L, T], [R, T], [L, B], [R, B]],
  5: [[L, T], [R, T], [C, MID], [L, B], [R, B]],
  6: [[L, T], [R, T], [L, MID], [R, MID], [L, B], [R, B]],
  7: [[L, T], [R, T], [C, (T + MID) / 2], [L, MID], [R, MID], [L, B], [R, B]],
  8: [[L, T], [R, T], [C, (T + MID) / 2], [L, MID], [R, MID], [C, (MID + B) / 2], [L, B], [R, B]],
  9: [[L, ROW4[0]], [R, ROW4[0]], [L, ROW4[1]], [R, ROW4[1]], [C, MID], [L, ROW4[2]], [R, ROW4[2]], [L, ROW4[3]], [R, ROW4[3]]],
  10: [[L, ROW4[0]], [R, ROW4[0]], [C, (ROW4[0] + ROW4[1]) / 2], [L, ROW4[1]], [R, ROW4[1]], [L, ROW4[2]], [R, ROW4[2]], [C, (ROW4[2] + ROW4[3]) / 2], [L, ROW4[3]], [R, ROW4[3]]],
};

function pipCard(rank, suit) {
  const pips = PIP_LAYOUT[rank].map(([x, y]) => pip(suit, x, y, rank <= 3 ? 150 : 132, y > MID)).join('');
  return cardShell(`${indexBlock(String(rank), suit, inkOf(suit))}${pips}`);
}

function aceCard(suit) {
  const ring = suit === 'spades'
    ? `<circle cx="${C}" cy="${MID}" r="285" fill="none" stroke="${BLACK}" stroke-width="5"/>
       <circle cx="${C}" cy="${MID}" r="268" fill="none" stroke="${BLACK}" stroke-width="2"/>` : '';
  const big = suit === 'spades' ? 470 : 340;
  return cardShell(`${indexBlock('A', suit, inkOf(suit))}${ring}${pip(suit, C, MID, big)}`);
}

// ---------------------------------------------------------------- court cards
function findArt(rank, suit) {
  for (const name of [`${rank}_${suit}.png`, `${rank}${SHORT[suit]}.png`, `${rank}_${suit}.jpg`, `${rank}${SHORT[suit]}.jpg`, `${rank}_${suit}.webp`]) {
    const p = path.join(ART, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}
const mime = (p) => (p.endsWith('.png') ? 'image/png' : p.endsWith('.webp') ? 'image/webp' : 'image/jpeg');

function courtCard(rank, suit) {
  const ink = inkOf(suit);
  const outer = notchedRectPath(...PANEL, 20);
  const art = findArt(rank, suit);
  let body;
  if (art) {
    const data = fs.readFileSync(art).toString('base64');
    body = `<image href="data:${mime(art)};base64,${data}" x="${PANEL[0]}" y="${PANEL[1]}" width="${PANEL[2]}" height="${PANEL[3]}" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    // placeholder: pale panel, diagonal split, big rank + pip in both halves
    const half = (rot) => `<g ${rot ? `transform="rotate(180 ${C} ${MID})"` : ''}>
      <g transform="translate(${C} 330) scale(0.48 0.48)" opacity="0.18">${rankArt(rank, ink).replace(`scale(${(INDEX.rankHeight / 1000).toFixed(5)})`, 'scale(0.4)')}</g>
      ${pip(suit, C, 380, 150).replace(inkOf(suit), '#d9d2c0')}
    </g>`;
    body = `<rect x="94" y="94" width="562" height="862" fill="#f6efd6"/>${half(false)}${half(true)}
      <line x1="94" y1="590" x2="656" y2="460" stroke="#cfc6a8" stroke-width="3"/>`;
  }
  return cardShell(`
    <defs><clipPath id="panel"><path d="${outer}"/></clipPath></defs>
    <g clip-path="url(#panel)">${body}</g>
    <path d="${outer}" fill="none" stroke="${BLACK}" stroke-width="6"/>
    ${indexBlock(rank, suit, ink)}`);
}

// ---------------------------------------------------------------- jokers and backs
function jokerCard(colour) {
  const c = colour
    ? { a: '#d8232f', b: '#1f4e9c', c: '#f5c518', skin: '#f6d2b0' }
    : { a: '#2b2b30', b: '#8a8a90', c: '#d8d8dc', skin: '#ececec' };
  const o = `stroke="${BLACK}" stroke-width="7" stroke-linejoin="round"`;
  const art = `
    <g transform="translate(${C} ${MID + 20}) scale(0.78)">
      <path d="M-170 70 Q-290 -60 -250 -250 Q-170 -190 -120 -80 Z" fill="${c.a}" ${o}/>
      <path d="M170 70 Q290 -60 250 -250 Q170 -190 120 -80 Z" fill="${c.b}" ${o}/>
      <path d="M-70 -90 Q-60 -330 0 -380 Q60 -330 70 -90 Z" fill="${c.c}" ${o}/>
      <circle cx="-250" cy="-262" r="26" fill="${c.c}" ${o}/><circle cx="250" cy="-262" r="26" fill="${c.c}" ${o}/><circle cx="0" cy="-392" r="26" fill="${c.a}" ${o}/>
      <ellipse cx="0" cy="-10" rx="125" ry="150" fill="${c.skin}" ${o}/>
      <ellipse cx="-48" cy="-35" rx="14" ry="20" fill="${BLACK}"/><ellipse cx="48" cy="-35" rx="14" ry="20" fill="${BLACK}"/>
      <path d="M-70 45 Q0 120 70 45" fill="none" stroke="${BLACK}" stroke-width="9" stroke-linecap="round"/>
      <circle cx="0" cy="10" r="16" fill="${c.a}" ${o}/>
      <path d="M-200 150 L-100 210 L0 150 L100 210 L200 150 L240 330 L-240 330 Z" fill="#ffffff" ${o}/>
      <path d="M-240 330 L240 330 L300 470 L-300 470 Z" fill="${c.a}" ${o}/>
      <path d="M-120 330 L120 330 L150 470 L-150 470 Z" fill="${c.b}" ${o}/>
    </g>`;
  return cardShell(`${indexBlock('JOKER', colour ? 'hearts' : 'spades', colour ? RED : BLACK, false)}${art}`);
}

function backCard(base, light) {
  const pad = 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <pattern id="lat" width="60" height="84" patternUnits="userSpaceOnUse" patternTransform="translate(0 0)">
      <rect width="60" height="84" fill="${base}"/>
      <path d="M30 0 L60 42 L30 84 L0 42 Z" fill="none" stroke="${light}" stroke-width="3"/>
      <circle cx="30" cy="42" r="4" fill="${light}"/>
    </pattern>
    <clipPath id="inner"><rect x="${pad}" y="${pad}" width="${W - 2 * pad}" height="${H - 2 * pad}" rx="14"/></clipPath>
  </defs>
  <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="38" fill="${PAPER}" stroke="${EDGE}" stroke-width="3"/>
  <g clip-path="url(#inner)"><rect width="${W}" height="${H}" fill="url(#lat)"/></g>
  <rect x="${pad}" y="${pad}" width="${W - 2 * pad}" height="${H - 2 * pad}" rx="14" fill="none" stroke="${base}" stroke-width="6"/>
  <ellipse cx="${C}" cy="${MID}" rx="210" ry="300" fill="${PAPER}" stroke="${base}" stroke-width="8"/>
  <ellipse cx="${C}" cy="${MID}" rx="188" ry="278" fill="none" stroke="${light === '#ffffff' ? base : light}" stroke-width="3"/>
  <g transform="translate(${C} ${MID})">
    <path d="M0 -150 L100 0 L0 150 L-100 0 Z" fill="${base}"/>
    <path d="M0 -105 L70 0 L0 105 L-70 0 Z" fill="${PAPER}"/>
    <path d="M0 -60 L40 0 L0 60 L-40 0 Z" fill="${base}"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------- output
async function rasterizer() {
  try {
    const sharp = (await import('sharp')).default;
    return {
      png: (svg) => sharp(Buffer.from(svg)).png().toBuffer(),
      sheet: async (frames, cols, rows) => sharp({ create: { width: cols * 375, height: rows * 525, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(await Promise.all(frames.map(async (f, i) => ({
          input: await sharp(f).resize(375, 525).png().toBuffer(),
          left: (i % cols) * 375, top: Math.floor(i / cols) * 525,
        })))).png().toBuffer(),
    };
  } catch (e) {
    throw new Error('This generator needs the "sharp" package (npm install sharp). ' + e.message);
  }
}

async function main() {
  const r = await rasterizer();
  fs.mkdirSync(OUT, { recursive: true });
  const files = new Map();   // filename -> png buffer
  const frames = [];
  const frameKeys = [];
  const missing = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const svg = rank === 'A' ? aceCard(suit)
        : 'JQK'.includes(rank) ? courtCard(rank, suit)
        : pipCard(Number(rank), suit);
      if ('JQK'.includes(rank) && !findArt(rank, suit)) missing.push(`${rank}_${suit}`);
      const png = await r.png(svg);
      files.set(`${rank}_${suit}.png`, png);
      files.set(`${rank}${SHORT[suit]}.png`, png);
      if ('JQK'.includes(rank)) files.set(`${COURT_NAME[rank].toLowerCase()}_${suit}.png`, png);
      fs.writeFileSync(path.join(OUT, `${rank}_${suit}.svg`), svg.replace(/href="data:[^"]+"/, 'href="[embedded court art]"'));
      frames.push(png); frameKeys.push(`${rank}_${suit}`);
    }
  }
  // joker art (joker_1.png ... joker_4.png) in the art folder overrides the drawn placeholders; 3 and 4 are extras
  const jokerArt = (n) => { const jp = path.join(ART, `joker_${n}.png`); return fs.existsSync(jp) ? fs.readFileSync(jp) : null; };
  const j1 = jokerArt(1) || await r.png(jokerCard(true)), j2 = jokerArt(2) || await r.png(jokerCard(false));
  for (const n of [3, 4]) { const b = jokerArt(n); if (b) files.set(`joker_${n}.png`, b); }
  const bBlue = await r.png(backCard('#1f3a8a', '#ffffff')), bRed = await r.png(backCard('#b3202a', '#ffffff'));
  files.set('joker_1.png', j1); files.set('joker_2.png', j2);
  files.set('card_back.png', bBlue); files.set('card_back_blue.png', bBlue); files.set('card_back_red.png', bRed);
  frames.push(j1, j2, bBlue); frameKeys.push('joker_high', 'joker_low', 'card_back');

  for (const [name, buf] of files) fs.writeFileSync(path.join(OUT, name), buf);

  const sheet = await r.sheet(frames, 14, 4);
  fs.writeFileSync(path.join(OUT, 'deck_spritesheet.png'), sheet);
  const sprite = { meta: { theme: 'english_pattern', frame_w: 375, frame_h: 525, cols: 14, rows: 4 }, frames: {} };
  frameKeys.forEach((k, i) => { sprite.frames[k] = { x: (i % 14) * 375, y: Math.floor(i / 14) * 525, w: 375, h: 525 }; });
  fs.writeFileSync(path.join(OUT, 'deck_spritesheet.json'), JSON.stringify(sprite, null, 2));
  fs.writeFileSync(path.join(OUT, 'deck_manifest.json'), JSON.stringify({
    id: 'english_pattern',
    name: 'English Pattern (Standard)',
    era: 'Classic',
    icon: '\u2660\ufe0f',
    subtitle: 'Traditional Anglo-American pattern: flat colour, bold outlines, reversible courts',
    faceTitle: 'King of Spades',
    totalCards: 54,
    suits: { spades: 'Classic Spade', hearts: 'Classic Heart', diamonds: 'Classic Diamond', clubs: 'Classic Club' },
    generatedAt: new Date().toISOString(),
  }, null, 2));

  console.log(`english_pattern: ${files.size} images written to ${OUT}`);
  if (missing.length) console.log(`court art missing for ${missing.length} cards (placeholders used): ${missing.join(', ')}\nart folder: ${ART}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
