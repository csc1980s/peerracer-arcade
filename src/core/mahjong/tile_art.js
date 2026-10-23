/**
 * Jade Pavilion — Procedural Tile Face Art
 *
 * Every face is drawn here as SVG from scratch (no image assets). The style is
 * Jade Pavilion's own: carved-ivory faces with a jade, cinnabar and indigo ink
 * palette, plus a small Western index in the corner so players who do not read
 * Chinese numerals can still match Characters and Winds at a glance.
 *
 * Faces use a 60 x 80 viewBox. Results are cached per face.
 */

const INK = {
  jade: '#1f7a55',
  jadeDark: '#145a3d',
  jadeLight: '#4fb286',
  cinnabar: '#c2362b',
  cinnabarDark: '#8f2219',
  indigo: '#25407a',
  indigoLight: '#4f6fb3',
  gold: '#b8902b',
  ink: '#1c1a17'
};

const CJK_FONT = "'Microsoft YaHei','PingFang SC','Noto Sans CJK SC','Noto Serif CJK SC','SimSun','Songti SC',serif";
const INDEX_FONT = "'Outfit','Segoe UI',sans-serif";

const cache = new Map();

export function tileFaceSVG(face) {
  if (cache.has(face)) return cache.get(face);
  const [kind, v] = face.split('-');
  let body = '';
  switch (kind) {
    case 'dot': body = dots(Number(v)); break;
    case 'bam': body = bamboo(Number(v)); break;
    case 'char': body = characters(Number(v)); break;
    case 'wind': body = wind(v); break;
    case 'dragon': body = dragon(v); break;
    case 'flower': body = flower(Number(v)); break;
    case 'season': body = season(Number(v)); break;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" class="mj-face-svg" aria-hidden="true">${body}</svg>`;
  cache.set(face, svg);
  return svg;
}

function index(label, color = INK.ink) {
  return `<text x="5" y="11" font-family="${INDEX_FONT}" font-size="9" font-weight="700" fill="${color}" opacity="0.75">${label}</text>`;
}

// ---------------------------------------------------------------------------
// Dots: concentric "coin" medallions
// ---------------------------------------------------------------------------

const DOT_LAYOUTS = {
  1: [[30, 40]],
  2: [[30, 22], [30, 58]],
  3: [[15, 18], [30, 40], [45, 62]],
  4: [[18, 24], [42, 24], [18, 56], [42, 56]],
  5: [[17, 20], [43, 20], [30, 40], [17, 60], [43, 60]],
  6: [[19, 16], [41, 16], [19, 40], [41, 40], [19, 64], [41, 64]],
  7: [[13, 13], [30, 22], [47, 31], [19, 51], [41, 51], [19, 68], [41, 68]],
  8: [[19, 12], [41, 12], [19, 31], [41, 31], [19, 50], [41, 50], [19, 69], [41, 69]],
  9: [[14, 17], [30, 17], [46, 17], [14, 40], [30, 40], [46, 40], [14, 63], [30, 63], [46, 63]]
};

function coin(cx, cy, r, palette) {
  const [outer, mid, inner] = palette;
  const petals = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    petals.push(`<circle cx="${(cx + Math.cos(a) * r * 0.62).toFixed(2)}" cy="${(cy + Math.sin(a) * r * 0.62).toFixed(2)}" r="${(r * 0.12).toFixed(2)}" fill="${mid}"/>`);
  }
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${outer}"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.82).toFixed(2)}" fill="#fbf6e9"/>
    ${petals.join('')}
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.38).toFixed(2)}" fill="${inner}"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.15).toFixed(2)}" fill="#fbf6e9"/>
  </g>`;
}

function dots(n) {
  const pts = DOT_LAYOUTS[n];
  const r = n === 1 ? 19 : n <= 2 ? 13 : n <= 5 ? 10 : n <= 6 ? 9 : 8;
  const palettes = [
    [INK.jade, INK.jadeLight, INK.cinnabar],
    [INK.indigo, INK.indigoLight, INK.jade],
    [INK.cinnabar, INK.gold, INK.indigo]
  ];
  const out = pts.map(([x, y], i) => {
    // Colour bands give each count a recognisable rhythm.
    let p = palettes[i % 3];
    if (n === 1) p = [INK.cinnabar, INK.jade, INK.indigo];
    if (n === 7 && i < 3) p = palettes[1];
    if (n === 7 && i >= 3) p = palettes[2];
    if (n === 8) p = palettes[i < 4 ? 1 : 0];
    if (n === 9) p = palettes[Math.floor(i / 3)];
    return coin(x, y, r, p);
  });
  return index(n, INK.indigo) + out.join('');
}

// ---------------------------------------------------------------------------
// Bamboo: segmented stalks; the One is a bamboo sprout with leaves
// ---------------------------------------------------------------------------

function stalk(cx, cy, h, color) {
  const w = 5.2;
  const top = cy - h / 2;
  const segs = 2;
  const nodes = [];
  for (let i = 1; i < segs; i++) {
    const y = top + (h * i) / segs;
    nodes.push(`<rect x="${(cx - w / 2 - 0.8).toFixed(2)}" y="${(y - 1).toFixed(2)}" width="${(w + 1.6).toFixed(2)}" height="2" rx="1" fill="${color}"/>`);
  }
  return `<g>
    <rect x="${(cx - w / 2).toFixed(2)}" y="${top.toFixed(2)}" width="${w}" height="${h}" rx="2.4" fill="${color}"/>
    <rect x="${(cx - 0.6).toFixed(2)}" y="${(top + 2).toFixed(2)}" width="1.2" height="${(h - 4).toFixed(2)}" rx="0.6" fill="#fbf6e9" opacity="0.55"/>
    ${nodes.join('')}
  </g>`;
}

const BAM_LAYOUTS = {
  2: [[30, 22], [30, 58]],
  3: [[30, 22], [19, 58], [41, 58]],
  4: [[20, 22], [40, 22], [20, 58], [40, 58]],
  5: [[17, 22], [43, 22], [30, 40], [17, 58], [43, 58]],
  6: [[15, 24], [30, 24], [45, 24], [15, 57], [30, 57], [45, 57]],
  7: [[30, 14], [15, 41], [30, 41], [45, 41], [15, 67], [30, 67], [45, 67]],
  8: [[13, 24], [24, 24], [36, 24], [47, 24], [13, 57], [24, 57], [36, 57], [47, 57]],
  9: [[15, 15], [30, 15], [45, 15], [15, 40], [30, 40], [45, 40], [15, 65], [30, 65], [45, 65]]
};

function bamboo(n) {
  if (n === 1) {
    return index(1, INK.jade) + `<g>
      <path d="M30 70 C29 56 31 42 30 22" stroke="${INK.jade}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="26.5" y="44" width="7" height="2.4" rx="1.2" fill="${INK.jadeDark}"/>
      <rect x="26.5" y="58" width="7" height="2.4" rx="1.2" fill="${INK.jadeDark}"/>
      <path d="M30 34 C20 30 13 33 9 40 C17 41 24 39 30 34 Z" fill="${INK.jadeLight}"/>
      <path d="M30 28 C40 22 47 24 52 30 C44 33 37 32 30 28 Z" fill="${INK.jade}"/>
      <path d="M30 50 C39 47 46 50 49 56 C41 57 35 55 30 50 Z" fill="${INK.jadeLight}"/>
      <path d="M30 22 C27 16 28 11 31 7 C34 12 33 17 30 22 Z" fill="${INK.cinnabar}"/>
    </g>`;
  }
  const h = n >= 7 ? 20 : n === 5 ? 24 : 28;
  const out = BAM_LAYOUTS[n].map(([x, y], i) => {
    let color = INK.jade;
    if (n === 5 && i === 2) color = INK.cinnabar;
    if (n === 7 && i === 0) color = INK.cinnabar;
    if (n === 9 && i % 3 === 1) color = INK.cinnabar;
    if (n === 8 && (i === 1 || i === 2 || i === 5 || i === 6)) color = INK.indigo;
    if (n === 3 && i === 0) color = INK.indigo;
    return stalk(x, y, h, color);
  });
  return index(n, INK.jade) + out.join('');
}

// ---------------------------------------------------------------------------
// Characters: traditional numeral over the ten-thousand sign
// ---------------------------------------------------------------------------

const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

function characters(n) {
  return index(n, INK.indigo) + `
    <text x="30" y="36" text-anchor="middle" font-family="${CJK_FONT}" font-size="25" font-weight="700" fill="${INK.indigo}">${NUMERALS[n - 1]}</text>
    <text x="30" y="70" text-anchor="middle" font-family="${CJK_FONT}" font-size="27" font-weight="700" fill="${INK.cinnabar}">萬</text>`;
}

// ---------------------------------------------------------------------------
// Winds and Dragons
// ---------------------------------------------------------------------------

const WIND_GLYPHS = { E: '東', S: '南', W: '西', N: '北' };

function wind(w) {
  return index(w, INK.indigo) + `
    <circle cx="30" cy="44" r="21" fill="none" stroke="${INK.indigo}" stroke-width="1" opacity="0.25"/>
    <text x="30" y="56" text-anchor="middle" font-family="${CJK_FONT}" font-size="32" font-weight="700" fill="${INK.ink}">${WIND_GLYPHS[w]}</text>`;
}

function dragon(d) {
  if (d === 'R') {
    return `<text x="30" y="55" text-anchor="middle" font-family="${CJK_FONT}" font-size="38" font-weight="800" fill="${INK.cinnabar}">中</text>`;
  }
  if (d === 'G') {
    return `<text x="30" y="55" text-anchor="middle" font-family="${CJK_FONT}" font-size="34" font-weight="800" fill="${INK.jade}">發</text>`;
  }
  // Pale Dragon: an empty jade-and-indigo cartouche.
  return `<g fill="none">
    <rect x="10" y="12" width="40" height="56" rx="4" stroke="${INK.indigo}" stroke-width="3"/>
    <rect x="16" y="18" width="28" height="44" rx="2" stroke="${INK.jade}" stroke-width="1.6" stroke-dasharray="4 2.5"/>
  </g>`;
}

// ---------------------------------------------------------------------------
// Flowers and Seasons (bonus tiles)
// ---------------------------------------------------------------------------

function petals(cx, cy, count, len, wid, color, rot = 0) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = rot + (360 / count) * i;
    out.push(`<ellipse cx="${cx}" cy="${(cy - len / 2).toFixed(2)}" rx="${wid}" ry="${(len / 2).toFixed(2)}" fill="${color}" transform="rotate(${a.toFixed(1)} ${cx} ${cy})"/>`);
  }
  return out.join('');
}

function bonusFrame(label, n, color) {
  return `
    <rect x="4" y="4" width="52" height="72" rx="5" fill="none" stroke="${INK.gold}" stroke-width="1.2" opacity="0.8"/>
    <text x="9" y="15" font-family="${INDEX_FONT}" font-size="9" font-weight="700" fill="${color}">${n}</text>
    <text x="30" y="72" text-anchor="middle" font-family="${INDEX_FONT}" font-size="7" font-weight="600" letter-spacing="0.6" fill="${color}">${label}</text>`;
}

function stem(color = INK.jade) {
  return `<path d="M30 62 C30 54 29 48 30 42" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M30 54 C24 50 20 51 17 55 C22 57 26 56 30 54 Z" fill="${INK.jadeLight}"/>`;
}

function flower(n) {
  switch (n) {
    case 1: // Plum: five round petals
      return bonusFrame('PLUM', 1, INK.cinnabar) + stem(INK.ink) +
        petals(30, 34, 5, 13, 6.5, '#e58a9a') + `<circle cx="30" cy="34" r="3.4" fill="${INK.gold}"/>`;
    case 2: // Orchid: long drooping petals
      return bonusFrame('ORCHID', 2, INK.indigo) + stem() +
        petals(30, 34, 3, 20, 4.5, '#8b6cc7', 0) + petals(30, 34, 3, 12, 3.5, '#c9b5ee', 60) +
        `<circle cx="30" cy="34" r="2.6" fill="${INK.gold}"/>`;
    case 3: // Chrysanthemum: many thin petals
      return bonusFrame('MUM', 3, INK.gold) + stem() +
        petals(30, 34, 16, 20, 2.2, '#e0a92e') + petals(30, 34, 12, 11, 2, '#f3cf61', 15) +
        `<circle cx="30" cy="34" r="3" fill="${INK.cinnabar}"/>`;
    default: // Bamboo blossom: sprig with leaves
      return bonusFrame('BAMBOO', 4, INK.jade) + `
        <path d="M30 64 L30 20" stroke="${INK.jade}" stroke-width="3.2" stroke-linecap="round"/>
        <rect x="27.4" y="34" width="5.2" height="1.8" rx="0.9" fill="${INK.jadeDark}"/>
        <rect x="27.4" y="49" width="5.2" height="1.8" rx="0.9" fill="${INK.jadeDark}"/>
        <path d="M30 28 C38 20 46 20 50 24 C44 29 37 30 30 28 Z" fill="${INK.jadeLight}"/>
        <path d="M30 40 C22 34 14 35 10 40 C17 44 24 43 30 40 Z" fill="${INK.jade}"/>
        <path d="M30 44 C38 40 45 42 48 47 C41 49 35 48 30 44 Z" fill="${INK.jadeLight}"/>`;
  }
}

function season(n) {
  switch (n) {
    case 1: // Spring: a budding sprout
      return bonusFrame('SPRING', 1, INK.jade) + `
        <path d="M30 62 C30 50 30 42 30 34" stroke="${INK.jade}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M30 40 C20 38 15 30 16 22 C25 24 30 31 30 40 Z" fill="${INK.jadeLight}"/>
        <path d="M30 36 C40 34 45 26 44 18 C35 20 30 27 30 36 Z" fill="${INK.jade}"/>
        <ellipse cx="22" cy="64" rx="12" ry="2.5" fill="#a07a4a" opacity="0.5"/>`;
    case 2: // Summer: a radiant sun
      return bonusFrame('SUMMER', 2, INK.cinnabar) +
        petals(30, 38, 12, 34, 2.4, '#e9a33a') +
        `<circle cx="30" cy="38" r="10" fill="${INK.cinnabar}"/><circle cx="30" cy="38" r="6" fill="#f2c14e"/>`;
    case 3: // Autumn: a maple-like leaf
      return bonusFrame('AUTUMN', 3, INK.gold) + `
        <path d="M30 18 L34 30 L45 25 L40 36 L50 40 L39 44 L42 55 L31 48 L30 62 L29 48 L18 55 L21 44 L10 40 L20 36 L15 25 L26 30 Z"
              fill="#d2691e" stroke="${INK.cinnabarDark}" stroke-width="1" stroke-linejoin="round"/>
        <path d="M30 24 L30 60" stroke="${INK.cinnabarDark}" stroke-width="1"/>`;
    default: // Winter: a six-armed snow crystal
      return bonusFrame('WINTER', 4, INK.indigo) + `<g stroke="${INK.indigoLight}" stroke-width="2.2" stroke-linecap="round">
        ${[0, 60, 120].map(a => `<line x1="30" y1="20" x2="30" y2="58" transform="rotate(${a} 30 39)"/>`).join('')}
        ${[0, 60, 120, 180, 240, 300].map(a => `<path d="M26 26 L30 30 L34 26" fill="none" transform="rotate(${a} 30 39)"/>`).join('')}
      </g><circle cx="30" cy="39" r="3" fill="${INK.indigo}"/>`;
  }
}
