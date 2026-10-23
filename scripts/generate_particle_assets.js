/**
 * Generates Victorian Christmas Solitaire themed vector particle sprites (SVG).
 * Phase 1 Deliverables for ANIMATION_SYSTEM_HANDOFF.md
 */

import fs from 'fs';
import path from 'path';

const baseDir = path.resolve('D:/solitaire/assets/particles');

const assets = {
  hearts: {
    'heart_01.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="hGrad1" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ff4d6d"/>
      <stop offset="70%" stop-color="#c9184a"/>
      <stop offset="100%" stop-color="#800f2f"/>
    </radialGradient>
    <filter id="hGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#800f2f" flood-opacity="0.5"/>
    </filter>
  </defs>
  <path d="M32 56 C14 42 4 29 4 18 A14 14 0 0 1 28 9 C30 11 31 13 32 15 C33 13 34 11 36 9 A14 14 0 0 1 60 18 C60 29 50 42 32 56 Z" fill="url(#hGrad1)" filter="url(#hGlow)"/>
  <ellipse cx="20" cy="16" rx="5" ry="2.5" transform="rotate(-30 20 16)" fill="#ffccd5" opacity="0.6"/>
</svg>`,

    'heart_02.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="hGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe066"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#997a15"/>
    </linearGradient>
  </defs>
  <path d="M32 54 C16 40 6 28 6 18 A13 13 0 0 1 28 10 C30 12 31 14 32 16 C33 14 34 12 36 10 A13 13 0 0 1 58 18 C58 28 48 40 32 54 Z" fill="#b01432" stroke="url(#hGold)" stroke-width="3"/>
  <circle cx="32" cy="24" r="3" fill="#ffe066"/>
</svg>`,

    'holly_leaf_01.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2d6a4f"/>
      <stop offset="50%" stop-color="#1b4332"/>
      <stop offset="100%" stop-color="#081c15"/>
    </linearGradient>
  </defs>
  <path d="M32 4 C38 14 48 12 44 22 C52 24 54 36 44 40 C50 48 40 56 32 60 C24 56 14 48 20 40 C10 36 12 24 20 22 C16 12 26 14 32 4 Z" fill="url(#leafGrad)" stroke="#52b788" stroke-width="1.5"/>
  <path d="M32 8 L32 56" stroke="#74c69d" stroke-width="1.2" opacity="0.7"/>
</svg>`,

    'berry.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="berryGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ff4d4d"/>
      <stop offset="60%" stop-color="#cc0000"/>
      <stop offset="100%" stop-color="#660000"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="24" fill="url(#berryGrad)"/>
  <circle cx="24" cy="22" r="6" fill="#ffffff" opacity="0.6"/>
</svg>`,

    'sparkle_gold.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="spkGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="30%" stop-color="#ffe680"/>
      <stop offset="70%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="rgba(212,175,55,0)"/>
    </radialGradient>
  </defs>
  <polygon points="32,2 38,24 62,32 38,40 32,62 26,40 2,32 26,24" fill="url(#spkGold)"/>
  <circle cx="32" cy="32" r="5" fill="#ffffff"/>
</svg>`
  },

  diamonds: {
    'snowflake_01.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <g stroke="#b8e2f2" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="4" x2="32" y2="60"/>
    <line x1="4" y1="32" x2="60" y2="32"/>
    <line x1="12" y1="12" x2="52" y2="52"/>
    <line x1="52" y1="12" x2="12" y2="52"/>
  </g>
  <g stroke="#ffffff" stroke-width="2" stroke-linecap="round">
    <path d="M26 12 L32 18 L38 12 M26 52 L32 46 L38 52"/>
    <path d="M12 26 L18 32 L12 38 M52 26 L46 32 L52 38"/>
  </g>
  <circle cx="32" cy="32" r="4" fill="#ffffff"/>
</svg>`,

    'snowflake_02.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <g stroke="#80d4ff" stroke-width="2.5" stroke-linecap="round">
    <line x1="32" y1="6" x2="32" y2="58"/>
    <line x1="9" y1="19" x2="55" y2="45"/>
    <line x1="9" y1="45" x2="55" y2="19"/>
    <!-- Branch chevrons -->
    <path d="M28 14 L32 10 L36 14 M28 50 L32 54 L36 50" fill="none"/>
    <path d="M16 26 L13 21 L19 21 M48 38 L51 43 L45 43" fill="none"/>
    <path d="M16 38 L13 43 L19 43 M48 26 L51 21 L45 21" fill="none"/>
  </g>
  <polygon points="32,24 38,32 32,40 26,32" fill="#ffffff"/>
</svg>`,

    'diamond_crystal.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="crysGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0f7fa"/>
      <stop offset="50%" stop-color="#80deea"/>
      <stop offset="100%" stop-color="#00acc1"/>
    </linearGradient>
  </defs>
  <polygon points="32,4 56,32 32,60 8,32" fill="url(#crysGrad)" stroke="#ffffff" stroke-width="2"/>
  <polygon points="32,16 46,32 32,48 18,32" fill="#ffffff" opacity="0.4"/>
</svg>`,

    'ice_sparkle.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="iceGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#b3e5fc"/>
      <stop offset="100%" stop-color="rgba(179,229,252,0)"/>
    </radialGradient>
  </defs>
  <polygon points="32,0 36,26 64,32 36,38 32,64 28,38 0,32 28,26" fill="url(#iceGrad)"/>
  <polygon points="32,12 34,28 52,32 34,36 32,52 30,36 12,32 30,28" fill="#ffffff"/>
</svg>`
  },

  spades: {
    'leaf_maple.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="mapleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e76f51"/>
      <stop offset="50%" stop-color="#f4a261"/>
      <stop offset="100%" stop-color="#b54419"/>
    </linearGradient>
  </defs>
  <path d="M32 4 L36 18 L48 16 L44 26 L56 32 L46 40 L48 50 L36 46 L34 60 L30 60 L28 46 L16 50 L18 40 L8 32 L20 26 L16 16 L28 18 Z" fill="url(#mapleGrad)" stroke="#8d3010" stroke-width="1.5"/>
</svg>`,

    'leaf_oak.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="oakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a9d8f"/>
      <stop offset="60%" stop-color="#264653"/>
      <stop offset="100%" stop-color="#142129"/>
    </linearGradient>
  </defs>
  <path d="M32 4 C38 8 46 6 44 16 C50 20 50 28 44 32 C50 38 46 46 38 48 L34 60 L30 60 L26 48 C18 46 14 38 20 32 C14 28 14 20 20 16 C18 6 26 8 32 4 Z" fill="url(#oakGrad)" stroke="#52b788" stroke-width="1.5"/>
</svg>`,

    'pine_needle.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <g stroke="#2d6a4f" stroke-width="2.5" stroke-linecap="round">
    <line x1="32" y1="58" x2="32" y2="6"/>
    <line x1="32" y1="46" x2="16" y2="34"/>
    <line x1="32" y1="46" x2="48" y2="34"/>
    <line x1="32" y1="32" x2="18" y2="20"/>
    <line x1="32" y1="32" x2="46" y2="20"/>
    <line x1="32" y1="18" x2="22" y2="8"/>
    <line x1="32" y1="18" x2="42" y2="8"/>
  </g>
</svg>`,

    'acorn.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <path d="M22 22 C22 14 42 14 42 22 L44 26 C44 28 20 28 20 26 Z" fill="#6f4e37"/>
  <path d="M32 10 L32 16" stroke="#4a3324" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="32" cy="40" rx="14" ry="18" fill="#a07855"/>
  <ellipse cx="28" cy="36" rx="4" ry="8" fill="#c49a6c" opacity="0.6"/>
</svg>`
  },

  clubs: {
    'candy_stripe.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <clipPath id="candyCircle">
      <circle cx="32" cy="32" r="26"/>
    </clipPath>
  </defs>
  <circle cx="32" cy="32" r="26" fill="#ffffff" stroke="#c9184a" stroke-width="3"/>
  <g clip-path="url(#candyCircle)" fill="#d90429">
    <polygon points="0,0 12,0 0,12"/>
    <polygon points="16,0 36,0 0,36 0,16"/>
    <polygon points="40,0 60,0 0,60 0,40"/>
    <polygon points="64,4 64,24 24,64 4,64"/>
    <polygon points="64,28 64,48 48,64 28,64"/>
  </g>
</svg>`,

    'peppermint_swirl.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="26" fill="#ffffff" stroke="#d90429" stroke-width="2"/>
  <g fill="#d90429">
    <path d="M32 32 L32 6 A26 26 0 0 1 48 12 Z"/>
    <path d="M32 32 L58 32 A26 26 0 0 1 52 48 Z"/>
    <path d="M32 32 L32 58 A26 26 0 0 1 16 52 Z"/>
    <path d="M32 32 L6 32 A26 26 0 0 1 12 16 Z"/>
  </g>
  <circle cx="32" cy="32" r="5" fill="#ffffff"/>
</svg>`,

    'sugar_sparkle.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <polygon points="32,4 37,25 58,16 45,32 58,48 37,39 32,60 27,39 6,48 19,32 6,16 27,25" fill="#ffffff" stroke="#d4af37" stroke-width="1.5"/>
  <circle cx="32" cy="32" r="4" fill="#ffd700"/>
</svg>`,

    'ribbon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <path d="M8 12 Q32 28 56 12 Q40 40 52 56 Q32 44 12 56 Q24 40 8 12 Z" fill="#d90429" stroke="#ffe066" stroke-width="2"/>
  <circle cx="32" cy="32" r="4" fill="#ffd700"/>
</svg>`
  },

  crowns: {
    'crown_royal.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="crwGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff275"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#aa7c11"/>
    </linearGradient>
  </defs>
  <polygon points="8,50 56,50 52,24 40,36 32,16 24,36 12,24" fill="url(#crwGold)" stroke="#664d00" stroke-width="2"/>
  <circle cx="32" cy="14" r="3.5" fill="#e63946"/>
  <circle cx="12" cy="22" r="2.5" fill="#457b9d"/>
  <circle cx="52" cy="22" r="2.5" fill="#457b9d"/>
  <rect x="10" y="46" width="44" height="6" fill="#aa7c11"/>
</svg>`,

    'lightning_spark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0f7fa"/>
      <stop offset="50%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#0091ea"/>
    </linearGradient>
  </defs>
  <polygon points="36,2 14,34 30,34 26,62 50,26 34,26" fill="url(#boltGrad)" stroke="#ffffff" stroke-width="1.5"/>
</svg>`,

    'victory_star.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <polygon points="32,4 40,24 62,25 45,39 51,60 32,47 13,60 19,39 2,25 24,24" fill="#ffd700" stroke="#b8860b" stroke-width="2"/>
</svg>`
  }
};

let totalCreated = 0;
for (const [folder, files] of Object.entries(assets)) {
  const dirPath = path.join(baseDir, folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(dirPath, filename);
    fs.writeFileSync(filePath, content.trim(), 'utf8');
    totalCreated++;
    console.log(`Created: ${folder}/${filename}`);
  }
}

console.log(`\n✅ Generated ${totalCreated} particle assets in ${baseDir}`);
