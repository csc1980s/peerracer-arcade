/**
 * Level backgrounds for Jimothy's Trash Conveyor Frenzy.
 * Each one is drawn once with canvas shapes (no image files) onto a cached canvas by the view.
 * The view dims it a little afterwards so belts and food stay easy to read.
 */

/** Small repeatable random source so a background looks the same every time. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vertical(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function alley(ctx, w, h) {
  const rnd = seeded(101);
  vertical(ctx, w, h, [[0, '#0a0f1f'], [1, '#1b2440']]);
  // Brick wall
  const bh = 22, bw = 54;
  for (let row = 0, y = 0; y < h; row++, y += bh) {
    for (let x = -(row % 2) * (bw / 2); x < w; x += bw) {
      ctx.fillStyle = `rgba(${150 + rnd() * 40 | 0},${70 + rnd() * 30 | 0},${60 + rnd() * 20 | 0},${0.05 + rnd() * 0.05})`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
  // Moon
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath(); ctx.arc(506, 84, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f1730';
  ctx.beginPath(); ctx.arc(494, 76, 30, 0, Math.PI * 2); ctx.fill();
  // Windows
  const wins = [[40, 60], [120, 60], [40, 190], [450, 230], [520, 330], [60, 330], [470, 470], [40, 470]];
  wins.forEach(([x, y], i) => {
    ctx.fillStyle = i % 3 === 0 ? 'rgba(252,211,77,0.55)' : '#0b1222';
    ctx.fillRect(x, y, 34, 46);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.strokeRect(x, y, 34, 46);
    ctx.beginPath(); ctx.moveTo(x + 17, y); ctx.lineTo(x + 17, y + 46); ctx.moveTo(x, y + 23); ctx.lineTo(x + 34, y + 23); ctx.stroke();
  });
  // Drain pipe and fire escape
  const pipe = ctx.createLinearGradient(566, 0, 584, 0);
  pipe.addColorStop(0, '#1e293b'); pipe.addColorStop(0.5, '#64748b'); pipe.addColorStop(1, '#1e293b');
  ctx.fillStyle = pipe; ctx.fillRect(566, 0, 18, h);
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
  for (const y of [150, 410]) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(130, y); ctx.stroke();
    for (let x = 8; x < 130; x += 16) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 12); ctx.stroke(); }
  }
  // Dumpsters at the bottom
  for (const [x, col] of [[18, '#14532d'], [490, '#1e3a8a']]) {
    ctx.fillStyle = col; ctx.fillRect(x, h - 96, 92, 62);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, h - 96, 92, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 4, h - 104, 100, 10);
  }
}

function dock(ctx, w, h) {
  const rnd = seeded(202);
  vertical(ctx, w, h, [[0, '#1e1b4b'], [0.35, '#9d174d'], [0.6, '#f59e0b'], [0.7, '#fde68a'], [0.72, '#0e3a5f'], [1, '#06243a']]);
  ctx.fillStyle = 'rgba(254,243,199,0.9)';
  ctx.beginPath(); ctx.arc(300, h * 0.66, 62, Math.PI, 0); ctx.fill();
  // Water ripples
  ctx.strokeStyle = 'rgba(186,230,253,0.18)'; ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const y = h * 0.74 + rnd() * h * 0.24, x = rnd() * w, len = 20 + rnd() * 50;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len / 2, y - 5, x + len, y); ctx.stroke();
  }
  // Pier posts
  for (const x of [70, 190, 410, 530]) {
    ctx.fillStyle = '#3b2a1a'; ctx.fillRect(x, h * 0.70, 16, h * 0.30);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, h * 0.70, 4, h * 0.30);
  }
  ctx.fillStyle = '#2a1d12'; ctx.fillRect(0, h * 0.70, w, 14);
  // Crates and a lantern
  for (const [x, y, s] of [[20, h - 118, 56], [78, h - 100, 48], [510, h - 118, 56], [470, h - 96, 42]]) {
    ctx.fillStyle = '#7c4a21'; ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 3; ctx.strokeRect(x, y, s, s);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y); ctx.lineTo(x, y + s); ctx.stroke();
  }
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(300, 70); ctx.stroke();
  ctx.fillStyle = '#fde047'; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(300, 82, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  // Gulls
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3;
  for (const [x, y] of [[90, 120], [150, 90], [470, 140], [410, 80]]) {
    ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.quadraticCurveTo(x - 7, y - 10, x, y); ctx.quadraticCurveTo(x + 7, y - 10, x + 14, y); ctx.stroke();
  }
}

function kitchen(ctx, w, h) {
  const rnd = seeded(303);
  vertical(ctx, w, h, [[0, '#3a1f1a'], [1, '#2a1612']]);
  // Tiles
  const t = 40;
  for (let y = 0; y < h; y += t) {
    for (let x = 0; x < w; x += t) {
      ctx.fillStyle = ((x + y) / t) % 2 === 0 ? 'rgba(254,226,226,0.08)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, y, t, t);
    }
  }
  // Shelves with jars
  for (const y of [86, 330]) {
    ctx.fillStyle = '#5b3a29'; ctx.fillRect(0, y, w, 8);
    for (let x = 16; x < w - 30; x += 44 + rnd() * 18) {
      const jh = 26 + rnd() * 22, col = ['#ef4444', '#facc15', '#22c55e', '#f97316', '#e5e7eb'][rnd() * 5 | 0];
      ctx.fillStyle = col; ctx.globalAlpha = 0.6; ctx.fillRect(x, y - jh, 22, jh); ctx.globalAlpha = 1;
      ctx.fillStyle = '#d6d3d1'; ctx.fillRect(x - 1, y - jh - 5, 24, 5);
    }
  }
  // Hanging pans
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(w, 22); ctx.stroke();
  for (const x of [90, 190, 360, 470, 540]) {
    ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x, 52); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(x, 74, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(x, 74, 16, 0, Math.PI * 2); ctx.fill();
  }
  // Pizza oven glow
  const glow = ctx.createRadialGradient(w / 2, h - 40, 10, w / 2, h - 40, 200);
  glow.addColorStop(0, 'rgba(251,146,60,0.55)'); glow.addColorStop(1, 'rgba(251,146,60,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, h - 260, w, 260);
  ctx.fillStyle = '#44261a';
  ctx.beginPath(); ctx.moveTo(w / 2 - 130, h - 20); ctx.lineTo(w / 2 - 130, h - 90); ctx.arc(w / 2, h - 90, 130, Math.PI, 0); ctx.lineTo(w / 2 + 130, h - 20); ctx.fill();
  ctx.fillStyle = '#f97316'; ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(w / 2, h - 60, 56, Math.PI, 0); ctx.fill(); ctx.shadowBlur = 0;
}

function garden(ctx, w, h) {
  const rnd = seeded(404);
  vertical(ctx, w, h, [[0, '#082f49'], [0.5, '#155e75'], [1, '#1e293b']]);
  // Moon
  ctx.fillStyle = '#ecfeff'; ctx.beginPath(); ctx.arc(110, 110, 26, 0, Math.PI * 2); ctx.fill();
  // Skyline
  let x = 0;
  while (x < w) {
    const bw = 36 + rnd() * 50, bh = 140 + rnd() * 240;
    ctx.fillStyle = '#0b1b2b'; ctx.fillRect(x, h - bh - 60, bw, bh + 60);
    for (let wy = h - bh - 50; wy < h - 70; wy += 18) {
      for (let wx = x + 6; wx < x + bw - 10; wx += 14) {
        if (rnd() < 0.35) { ctx.fillStyle = 'rgba(253,224,71,0.55)'; ctx.fillRect(wx, wy, 7, 9); }
      }
    }
    x += bw + 4;
  }
  // String lights
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 16); ctx.quadraticCurveTo(w / 2, 90, w, 16); ctx.stroke();
  const cols = ['#fde047', '#f472b6', '#38bdf8', '#4ade80'];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, bx = u * w, by = 16 + 2 * u * (1 - u) * 74 + 4;
    ctx.fillStyle = cols[i % 4]; ctx.shadowColor = cols[i % 4]; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(bx, by + 6, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  // Planters
  for (const px of [30, 230, 440]) {
    ctx.fillStyle = '#7c2d12'; ctx.fillRect(px, h - 90, 70, 34);
    ctx.fillStyle = '#166534';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(px + 10 + i * 10, h - 96 - (i % 2) * 10, 14, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(px + 22, h - 112, 5, 0, Math.PI * 2); ctx.arc(px + 50, h - 108, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function moon(ctx, w, h) {
  const rnd = seeded(505);
  vertical(ctx, w, h, [[0, '#02030a'], [1, '#0d1233']]);
  for (let i = 0; i < 130; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`;
    const r = rnd() < 0.1 ? 2 : 1;
    ctx.fillRect(rnd() * w, rnd() * h * 0.85, r, r);
  }
  // Earth
  const earth = ctx.createRadialGradient(125, 130, 10, 140, 150, 80);
  earth.addColorStop(0, '#60a5fa'); earth.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = earth; ctx.beginPath(); ctx.arc(140, 150, 70, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(74,222,128,0.75)';
  ctx.beginPath(); ctx.ellipse(120, 135, 22, 14, 0.5, 0, Math.PI * 2); ctx.ellipse(168, 175, 18, 24, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(150, 120, 24, 6, 0.2, 0, Math.PI * 2); ctx.ellipse(110, 170, 18, 5, -0.2, 0, Math.PI * 2); ctx.fill();
  // A distant ringed planet
  ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.arc(480, 260, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(221,214,254,0.8)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(480, 260, 46, 10, -0.35, 0, Math.PI * 2); ctx.stroke();
  // Lunar ground with craters
  const ground = ctx.createLinearGradient(0, h - 150, 0, h);
  ground.addColorStop(0, '#6b7280'); ground.addColorStop(1, '#374151');
  ctx.fillStyle = ground;
  ctx.beginPath(); ctx.moveTo(0, h - 90);
  for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h - 90 - Math.sin(x * 0.02) * 16 - rnd() * 10);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (const [x, y, r] of [[80, h - 50, 22], [260, h - 34, 16], [420, h - 58, 26], [540, h - 30, 14]]) {
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }
}

const THEMES = { alley, dock, kitchen, garden, moon };

/** Draws the named level background onto ctx (already scaled so 1 unit is 1 world pixel). */
export function drawThemeBackground(ctx, theme, w, h) {
  (THEMES[theme] || alley)(ctx, w, h);
}
