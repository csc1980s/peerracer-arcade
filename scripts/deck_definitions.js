/**
 * Clean-Room Definition of the 10 Themed Playing Card Collections
 * Universal ES Module (works in Node.js, ArtCraft PhotoCraft pipelines, and Browser)
 * 
 * Each deck contains:
 * - Card Back SVG (Pattern, crest, filigree)
 * - Themed Table Felt Background SVG
 * - Dedicated Front Card Face SVG (Signature Ace of Spades or Court King)
 */

export const DECK_DEFINITIONS = [
  // ---------------------------------------------------------------------------
  // 1. Victorian Christmas (Vintage 🎄)
  // ---------------------------------------------------------------------------
  {
    id: 'victorian_christmas',
    name: 'Victorian Christmas',
    era: 'Vintage',
    icon: '🎄',
    subtitle: 'Holiday Magic & Victorian Opulence',
    primaryColor: '#a6192e',
    secondaryColor: '#1b4d3e',
    accentColor: '#d4af37',
    textColor: '#fdfbf7',
    faceTitle: 'Father Christmas (King of Hearts) 👑',
    faceFile: 'KH.svg',
    suits: {
      hearts: 'Holly Berries & Ivy',
      diamonds: 'Frosted Ice Crystal',
      spades: 'Fraser Fir Tree',
      clubs: 'Crossed Candy Canes'
    },
    court: {
      king: 'Victorian Father Christmas with snowy beard, ruby fur robe & gold wassail cup',
      queen: 'Victorian Caroler with warm velvet muff and glowing lantern',
      jack: 'Nutcracker Prince in regimental gold-braided shako',
      ace: 'Winter Solstice Wreath of pinecones, cinnamon sticks & gold bells',
      joker: 'Festive Holiday Jester with jingling gold bells and holly wreath'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#7d121f" stroke="#d4af37" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#235c3b" stroke-width="2"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#5c0e18"/>
      
      <!-- Victorian Gold Filigree Borders -->
      <g stroke="#d4af37" stroke-width="0.8" fill="none" opacity="0.9">
        <path d="M15 15 Q30 30 15 45 Q40 40 45 15"/>
        <path d="M125 15 Q110 30 125 45 Q100 40 95 15"/>
        <path d="M15 181 Q30 166 15 151 Q40 156 45 181"/>
        <path d="M125 181 Q110 166 125 151 Q100 156 95 181"/>
        <circle cx="70" cy="98" r="38" stroke-dasharray="3 3"/>
      </g>

      <!-- Center Christmas Wreath & Twin Golden Bells -->
      <g transform="translate(70, 98)">
        <circle cx="0" cy="0" r="32" fill="#1b4d3e" stroke="#d4af37" stroke-width="2"/>
        <circle cx="0" cy="0" r="22" fill="#5c0e18" stroke="#d4af37" stroke-width="1"/>
        
        <!-- Pine Needles & Holly Garland -->
        <path d="M-20 -15 Q-15 -30 0 -24 Q15 -30 20 -15 Q30 0 24 15 Q15 30 0 24 Q-15 30 -24 15 Z" fill="none" stroke="#2e8540" stroke-width="4"/>
        
        <!-- Twin Golden Bells -->
        <g fill="#d4af37" stroke="#996515" stroke-width="0.8">
          <path d="M-8 -6 C-8 -14 0 -14 0 -6 L-2 4 L-12 6 L-8 -6 Z"/>
          <path d="M8 -6 C8 -14 0 -14 0 -6 L2 4 L12 6 L8 -6 Z"/>
          <circle cx="-5" cy="5" r="2"/>
          <circle cx="5" cy="5" r="2"/>
        </g>
        
        <!-- Red Holly Berries -->
        <circle cx="0" cy="-14" r="3" fill="#e02438"/>
        <circle cx="-4" cy="-11" r="2.8" fill="#c4182b"/>
        <circle cx="4" cy="-11" r="2.8" fill="#c4182b"/>
        <circle cx="0" cy="18" r="3" fill="#e02438"/>
        <circle cx="-4" cy="15" r="2.8" fill="#c4182b"/>
        <circle cx="4" cy="15" r="2.8" fill="#c4182b"/>
      </g>

      <!-- Corner Snowflake Ornaments -->
      <g stroke="#d4af37" stroke-width="0.8" opacity="0.85">
        <path d="M26 26 L34 34 M34 26 L26 34 M30 24 L30 36 M24 30 L36 30"/>
        <path d="M106 26 L114 34 M114 26 L106 34 M110 24 L110 36 M104 30 L116 30"/>
        <path d="M26 162 L34 170 M34 162 L26 170 M30 160 L30 172 M24 166 L36 166"/>
        <path d="M106 162 L114 170 M114 162 L106 170 M110 160 L110 172 M104 166 L116 166"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="v_hearth" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#3d151c"/>
          <stop offset="60%" stop-color="#182b1e"/>
          <stop offset="100%" stop-color="#0c1710"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#v_hearth)"/>
      <g stroke="#d4af37" stroke-width="0.75" fill="none" opacity="0.15">
        <pattern id="v_pine_grid" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="60" cy="60" r="40"/>
          <path d="M60 20 L75 60 L60 100 L45 60 Z"/>
          <circle cx="60" cy="60" r="10"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#v_pine_grid)"/>
      </g>
    `,
    cardFaceSVG: `
      <rect width="140" height="196" rx="8" fill="#fffcf7" stroke="#d4af37" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#1b4d3e" stroke-width="1.2"/>
      
      <!-- Corner Indices (Top-Left) -->
      <text x="9" y="22" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="14" fill="#a6192e">K</text>
      <path d="M10 26 C8 24 5 26 5 28 C5 31 10 35 10 35 C10 35 15 31 15 28 C15 26 12 24 10 26 Z" fill="#a6192e"/>
      <circle cx="16" cy="27" r="1.5" fill="#2e8540"/>
      
      <!-- Corner Indices (Bottom-Right - Inverted) -->
      <g transform="rotate(180 70 98)">
        <text x="9" y="22" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="14" fill="#a6192e">K</text>
        <path d="M10 26 C8 24 5 26 5 28 C5 31 10 35 10 35 C10 35 15 31 15 28 C15 26 12 24 10 26 Z" fill="#a6192e"/>
        <circle cx="16" cy="27" r="1.5" fill="#2e8540"/>
      </g>
      
      <!-- Inner Gold Filigree Frame -->
      <g stroke="#d4af37" stroke-width="0.8" fill="none" opacity="0.85">
        <rect x="22" y="22" width="96" height="152" rx="4"/>
        <path d="M22 34 Q34 34 34 22"/>
        <path d="M118 34 Q106 34 106 22"/>
        <path d="M22 162 Q34 162 34 174"/>
        <path d="M118 162 Q106 162 106 174"/>
      </g>
      
      <!-- Center Father Christmas Portrait -->
      <g transform="translate(70, 98)">
        <!-- Golden Halo & Star of Bethlehem -->
        <circle cx="0" cy="-6" r="38" fill="#fdf3d8" stroke="#d4af37" stroke-width="1.5"/>
        <path d="M0 -42 L3 -32 L13 -32 L5 -26 L8 -16 L0 -22 L-8 -16 L-5 -26 L-13 -32 L-3 -32 Z" fill="#d4af37"/>
        
        <!-- Ruby Velvet Mantle & Ermine Fur -->
        <path d="M-30 38 C-25 15 -18 -8 0 -8 C18 -8 25 15 30 38 Z" fill="#8b0000" stroke="#d4af37" stroke-width="1"/>
        <path d="M-10 38 L-6 10 L6 10 L10 38 Z" fill="#f4f1ea"/>
        <circle cx="0" cy="18" r="1.5" fill="#111"/>
        <circle cx="0" cy="26" r="1.5" fill="#111"/>
        <circle cx="0" cy="34" r="1.5" fill="#111"/>
        
        <!-- Snowy Flowing Beard -->
        <path d="M-16 2 C-22 16 -12 36 0 38 C12 36 22 16 16 2 C10 12 -10 12 -16 2 Z" fill="#ffffff" stroke="#e0deda" stroke-width="0.8"/>
        
        <!-- Cheeks & Eyes -->
        <ellipse cx="0" cy="-2" rx="11" ry="12" fill="#ffd5be"/>
        <circle cx="-6" cy="2" r="3" fill="#ff9999" opacity="0.6"/>
        <circle cx="6" cy="2" r="3" fill="#ff9999" opacity="0.6"/>
        <path d="M-6 -6 Q-4 -8 -2 -6" stroke="#ffffff" stroke-width="1.5" fill="none"/>
        <path d="M2 -6 Q4 -8 6 -6" stroke="#ffffff" stroke-width="1.5" fill="none"/>
        <circle cx="-4" cy="-3" r="1.2" fill="#1f3a52"/>
        <circle cx="4" cy="-3" r="1.2" fill="#1f3a52"/>
        
        <!-- Red Santa Hood with Ermine Trim -->
        <path d="M-15 -6 C-14 -24 0 -30 14 -20 C24 -12 28 -2 24 10 L18 8 C20 0 16 -14 6 -18 C-4 -20 -10 -12 -12 -6 Z" fill="#a6192e"/>
        <circle cx="26" cy="14" r="4.5" fill="#ffffff" stroke="#ddd" stroke-width="0.6"/>
        <rect x="-14" y="-12" width="28" height="6" rx="3" fill="#ffffff" stroke="#ddd" stroke-width="0.6"/>
        
        <!-- Golden Wassail Chalice -->
        <g transform="translate(14, 18) scale(0.85)">
          <path d="M0 0 L10 0 L8 8 L2 8 Z" fill="#d4af37" stroke="#996515" stroke-width="0.6"/>
          <rect x="4" y="8" width="2" height="6" fill="#d4af37"/>
          <path d="M2 14 L8 14 L10 16 L0 16 Z" fill="#d4af37"/>
          <circle cx="2" cy="-1" r="1.2" fill="#2e8540"/>
          <circle cx="5" cy="-2" r="1.2" fill="#c4182b"/>
          <circle cx="8" cy="-1" r="1.2" fill="#2e8540"/>
        </g>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 2. Art Deco Elegance (Vintage ✨)
  // ---------------------------------------------------------------------------
  {
    id: 'art_deco_elegance',
    name: 'Art Deco Elegance',
    era: 'Vintage',
    icon: '✨',
    subtitle: '1920s Roaring Glamour & Geometric Sunbursts',
    primaryColor: '#121212',
    secondaryColor: '#242426',
    accentColor: '#d4af37',
    textColor: '#fdfbf7',
    faceTitle: 'Chrysler Spire (Ace of Spades) 🗽',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Stepped Fan Palmette',
      diamonds: 'Prismatic Chevron Lozenge',
      spades: 'Chrysler Spire Plume',
      clubs: 'Art Deco Lotus Fountain'
    },
    court: {
      king: 'Industrialist in tuxedo with gold pocket watch & diamond signet',
      queen: 'Gatsby Flapper with draped pearl necklace & peacock feather',
      jack: 'Speakeasy Jazz Trumpeter in pinstripe vest and fedora',
      ace: 'Towering Chrysler Spire surrounded by radiants and sunbursts',
      joker: 'Harlequin Pierrot with stepped gold-leaf mask'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#121214" stroke="#d4af37" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#e5c158" stroke-width="1.5"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#1c1c20"/>

      <!-- 1920s Art Deco Stepped Chevron Lines -->
      <g stroke="#d4af37" stroke-width="1" fill="none" opacity="0.85">
        <path d="M70 20 L120 70 L70 120 L20 70 Z"/>
        <path d="M70 76 L120 126 L70 176 L20 126 Z"/>
        <path d="M70 32 L108 70 L70 108 L32 70 Z"/>
        <path d="M70 88 L108 126 L70 164 L32 126 Z"/>
        
        <!-- Radiant Sunburst Fans -->
        <path d="M70 98 L18 18 M70 98 L122 18 M70 98 L18 178 M70 98 L122 178" stroke-width="0.5"/>
        <circle cx="70" cy="98" r="26" fill="#121214" stroke="#d4af37" stroke-width="2"/>
        <polygon points="70,76 88,98 70,120 52,98" fill="#d4af37" fill-opacity="0.25" stroke="#e5c158" stroke-width="1.2"/>
        <circle cx="70" cy="98" r="6" fill="#d4af37"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="ad_bg" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stop-color="#1f1d19"/>
          <stop offset="50%" stop-color="#141416"/>
          <stop offset="100%" stop-color="#08080a"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#ad_bg)"/>
      <g stroke="#d4af37" stroke-width="0.5" fill="none" opacity="0.18">
        <pattern id="ad_fan" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M0 80 Q40 40 80 80 M10 80 Q40 50 70 80 M20 80 Q40 60 60 80"/>
          <path d="M40 40 L40 0 M0 40 L80 40"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#ad_fan)"/>
      </g>
    `,
    cardFaceSVG: `
<defs>
        <linearGradient id="ad_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff8db"/>
          <stop offset="30%" stop-color="#d4af37"/>
          <stop offset="70%" stop-color="#996515"/>
          <stop offset="100%" stop-color="#fdf0a6"/>
        </linearGradient>
        <linearGradient id="ad_onyx" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1f2024"/>
          <stop offset="100%" stop-color="#0a0a0c"/>
        </linearGradient>
      </defs>
      <rect width="140" height="196" rx="8" fill="#faf7ee" stroke="url(#ad_gold)" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#121214" stroke-width="1.2"/>
      
      <!-- Stepped Corner Brackets -->
      <g stroke="url(#ad_gold)" stroke-width="1" fill="none">
        <path d="M8 8 L24 8 L24 24 M8 14 L16 14 L16 24 M8 20 L12 20 L12 24"/>
        <path d="M132 8 L116 8 L116 24 M132 14 L124 14 L124 24 M132 20 L128 20 L128 24"/>
        <path d="M8 188 L24 188 L24 172 M8 182 L16 182 L16 172 M8 176 L12 176 L12 172"/>
        <path d="M132 188 L116 188 L116 172 M132 182 L124 182 L124 172 M132 176 L128 176 L128 172"/>
      </g>
      
      <!-- Corner Indices (Top Left) -->
      <text x="11" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#121214">A</text>
      <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="url(#ad_gold)"/>
      
      <!-- Corner Indices (Bottom Right) -->
      <g transform="rotate(180 70 98)">
        <text x="11" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#121214">A</text>
        <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="url(#ad_gold)"/>
      </g>
      
      <!-- Art Deco Spire & Sunburst Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Multi-Tier Sunburst Beams -->
        <g stroke="url(#ad_gold)" stroke-width="0.75" opacity="0.65" fill="none">
          <line x1="0" y1="0" x2="-55" y2="-75"/>
          <line x1="0" y1="0" x2="-35" y2="-82"/>
          <line x1="0" y1="0" x2="-15" y2="-85"/>
          <line x1="0" y1="0" x2="15" y2="-85"/>
          <line x1="0" y1="0" x2="35" y2="-82"/>
          <line x1="0" y1="0" x2="55" y2="-75"/>
          <line x1="0" y1="0" x2="-65" y2="-50"/>
          <line x1="0" y1="0" x2="65" y2="-50"/>
          <line x1="0" y1="0" x2="-70" y2="-20"/>
          <line x1="0" y1="0" x2="70" y2="-20"/>
        </g>
        
        <!-- Stepped Diamond Cartouche -->
        <polygon points="0,-72 52,0 0,72 -52,0" fill="none" stroke="url(#ad_gold)" stroke-width="1.5" stroke-dasharray="3 2"/>
        <polygon points="0,-64 45,0 0,64 -45,0" fill="#f5eedc" stroke="#121214" stroke-width="1.2"/>
        
        <!-- Grand Faceted Chrysler Spire Spade -->
        <path d="M0 -48 C-34 -6 -40 25 -15 32 C-4 34 -2 25 0 21 C2 25 4 34 15 32 C40 25 34 -6 0 -48 Z" fill="url(#ad_onyx)" stroke="url(#ad_gold)" stroke-width="2.5"/>
        <path d="M-4 18 L-9 40 L9 40 L4 18 Z" fill="url(#ad_gold)"/>
        
        <!-- Chrysler Spire Geometric Arches Inside -->
        <g fill="none" stroke="url(#ad_gold)" stroke-width="1.2">
          <line x1="0" y1="-44" x2="0" y2="-10" stroke="#fff8db" stroke-width="2"/>
          <!-- Tier 1 -->
          <path d="M-6 -26 Q0 -34 6 -26 L8 -18 Q0 -26 -8 -18 Z" fill="url(#ad_gold)"/>
          <!-- Tier 2 -->
          <path d="M-12 -16 Q0 -26 12 -16 L15 -6 Q0 -16 -15 -6 Z" fill="url(#ad_gold)"/>
          <!-- Tier 3 -->
          <path d="M-18 -4 Q0 -14 18 -4 L21 8 Q0 -2 -21 8 Z" fill="url(#ad_gold)"/>
          <!-- Radiating Fan Palmette at Base -->
          <path d="M-14 24 Q0 12 14 24 M-10 27 Q0 17 10 27 M-6 30 Q0 22 6 30" stroke="#fff8db" stroke-width="1"/>
          <!-- Sparkling Diamond Core -->
          <polygon points="0,-8 7,5 0,18 -7,5" fill="#faf7ee" stroke="#121214" stroke-width="1"/>
        </g>
        <text x="0" y="54" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="7.5" fill="url(#ad_gold)" text-anchor="middle" letter-spacing="3">NEW YORK • 1925</text>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 3. Steampunk Clockwork (Vintage ⚙️)
  // ---------------------------------------------------------------------------
  {
    id: 'steampunk_clockwork',
    name: 'Steampunk Clockwork',
    era: 'Vintage',
    icon: '⚙️',
    subtitle: 'Victorian Brass, Rivets & Interlocking Escapements',
    primaryColor: '#78350f',
    secondaryColor: '#451a03',
    accentColor: '#d97706',
    textColor: '#fef3c7',
    faceTitle: 'Clockwork Escapement (Ace of Spades) ⚙️',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Pressure Gauge Dial',
      diamonds: 'Riveted Copper Lozenge',
      spades: 'Interlocking Cogwheel',
      clubs: 'Twin Piston Valves'
    },
    court: {
      king: 'Aeronaut Captain with leather flight helmet and brass sextant',
      queen: 'Automaton Countess with exposed clockwork heart and porcelain veil',
      jack: 'Boiler Technician with brass welding goggles and pneumatic wrench',
      ace: 'Mainspring escapement wheel surrounded by precision vernier scales',
      joker: 'Steam-Powered Mechanical Automaton with exhaust chimney'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#291508" stroke="#b45309" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#d97706" stroke-width="1.5"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#3f210d"/>

      <!-- Interlocking Brass Gear Train -->
      <g stroke="#d97706" stroke-width="1.2" fill="none">
        <!-- Main Central Gear -->
        <circle cx="70" cy="98" r="32" stroke="#f59e0b" stroke-width="2"/>
        <circle cx="70" cy="98" r="24" stroke-dasharray="4 4" stroke-width="3"/>
        <circle cx="70" cy="98" r="12" fill="#291508"/>
        
        <!-- Top & Bottom Interlocking Cogs -->
        <circle cx="70" cy="45" r="18" stroke-dasharray="3 3" stroke-width="2"/>
        <circle cx="70" cy="151" r="18" stroke-dasharray="3 3" stroke-width="2"/>
        <circle cx="35" cy="98" r="14" stroke-dasharray="2 2" stroke-width="2"/>
        <circle cx="105" cy="98" r="14" stroke-dasharray="2 2" stroke-width="2"/>
      </g>

      <!-- Brass Riveted Corner Brackets -->
      <g fill="#f59e0b" stroke="#78350f" stroke-width="0.8">
        <circle cx="16" cy="16" r="2.5"/><circle cx="24" cy="16" r="2.5"/><circle cx="16" cy="24" r="2.5"/>
        <circle cx="124" cy="16" r="2.5"/><circle cx="116" cy="16" r="2.5"/><circle cx="124" cy="24" r="2.5"/>
        <circle cx="16" cy="180" r="2.5"/><circle cx="24" cy="180" r="2.5"/><circle cx="16" cy="172" r="2.5"/>
        <circle cx="124" cy="180" r="2.5"/><circle cx="116" cy="180" r="2.5"/><circle cx="124" cy="172" r="2.5"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="sp_bg" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#361a09"/>
          <stop offset="60%" stop-color="#241005"/>
          <stop offset="100%" stop-color="#120802"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#sp_bg)"/>
      <g stroke="#b45309" stroke-width="0.6" fill="none" opacity="0.15">
        <pattern id="sp_cogs" width="100" height="100" patternUnits="userSpaceOnUse">
          <circle cx="50" cy="50" r="30" stroke-dasharray="4 4"/>
          <circle cx="50" cy="50" r="15"/>
          <circle cx="0" cy="0" r="20" stroke-dasharray="3 3"/>
          <circle cx="100" cy="100" r="20" stroke-dasharray="3 3"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#sp_cogs)"/>
      </g>
    `,
    cardFaceSVG: `
<defs>
        <linearGradient id="sp_brass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde68a"/>
          <stop offset="30%" stop-color="#d97706"/>
          <stop offset="70%" stop-color="#b45309"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <linearGradient id="sp_copper" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ea580c"/>
          <stop offset="100%" stop-color="#9a3412"/>
        </linearGradient>
      </defs>
      <rect width="140" height="196" rx="8" fill="#f6eedb" stroke="url(#sp_brass)" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#451a03" stroke-width="1.2"/>
      
      <!-- Riveted Corner Plates -->
      <g fill="url(#sp_brass)" stroke="#451a03" stroke-width="0.6">
        <circle cx="9" cy="9" r="2.5"/><circle cx="17" cy="9" r="1.5"/><circle cx="9" cy="17" r="1.5"/>
        <circle cx="131" cy="9" r="2.5"/><circle cx="123" cy="9" r="1.5"/><circle cx="131" cy="17" r="1.5"/>
        <circle cx="9" cy="187" r="2.5"/><circle cx="17" cy="187" r="1.5"/><circle cx="9" cy="179" r="1.5"/>
        <circle cx="131" cy="187" r="2.5"/><circle cx="123" cy="187" r="1.5"/><circle cx="131" cy="179" r="1.5"/>
      </g>
      
      <!-- Corner Indices -->
      <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#451a03">A</text>
      <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="url(#sp_brass)"/>
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#451a03">A</text>
        <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="url(#sp_brass)"/>
      </g>
      
      <!-- Museum Clockwork Escapement Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Dial Outer Calibrations -->
        <circle cx="0" cy="0" r="46" fill="none" stroke="url(#sp_brass)" stroke-width="2"/>
        <circle cx="0" cy="0" r="42" fill="#fffcf5" stroke="#b45309" stroke-width="0.8" stroke-dasharray="1.5 1.5"/>
        <g font-family="'Cinzel', serif" font-size="5" font-weight="900" fill="#78350f" text-anchor="middle">
          <text x="0" y="-35">XII</text><text x="36" y="2">III</text><text x="0" y="39">VI</text><text x="-36" y="2">IX</text>
        </g>
        
        <!-- Large Steampunk Gear Spade -->
        <path d="M0 -40 C-30 -4 -34 22 -14 28 C-4 30 -2 23 0 19 C2 23 4 30 14 28 C34 22 30 -4 0 -40 Z" fill="#2d1506" stroke="url(#sp_brass)" stroke-width="2.5"/>
        <path d="M-4 17 L-8 34 L8 34 L4 17 Z" fill="url(#sp_copper)" stroke="url(#sp_brass)" stroke-width="1"/>
        
        <!-- Interlocking Brass Escapement Cogs -->
        <g fill="none" stroke="url(#sp_brass)" stroke-width="1.5">
          <!-- Main Center Cog with 12 teeth -->
          <circle cx="0" cy="0" r="18" stroke-dasharray="3.5 3.5" stroke-width="3"/>
          <circle cx="0" cy="0" r="12" fill="#3f1a08"/>
          <!-- Spokes -->
          <line x1="-12" y1="0" x2="12" y2="0"/>
          <line x1="0" y1="-12" x2="0" y2="12"/>
          <line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5"/>
          <line x1="-8.5" y1="8.5" x2="8.5" y2="-8.5"/>
          <!-- Ruby Bearing -->
          <circle cx="0" cy="0" r="4.5" fill="#dc2626" stroke="#fbbf24" stroke-width="1"/>
          <circle cx="-1" cy="-1" r="1.2" fill="#fff"/>
          <!-- Escapement Anchor & Wheel -->
          <path d="M-10 -18 Q0 -26 10 -18" stroke="url(#sp_brass)" stroke-width="2"/>
          <circle cx="0" cy="-20" r="6" stroke-dasharray="2 2" stroke-width="1.5"/>
        </g>
        <text x="0" y="49" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="7" fill="#b45309" text-anchor="middle" letter-spacing="2">CHRONO • LONDON 1888</text>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 4. Wild West Frontier (Vintage 🤠)
  // ---------------------------------------------------------------------------
  {
    id: 'wild_west_frontier',
    name: 'Wild West Frontier',
    era: 'Vintage',
    icon: '🤠',
    subtitle: 'Tooled Saddle Leather, Steer Skull & Silver Colt .45',
    primaryColor: '#78350f',
    secondaryColor: '#3f1a08',
    accentColor: '#d97706',
    textColor: '#fef3c7',
    faceTitle: 'Sheriff Longhorn (Ace of Spades) 🤠',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Red Bandana Paisley',
      diamonds: 'Silver Star Concho',
      spades: 'Barbed Wire Spur',
      clubs: 'Twin Colt .45 Revolvers'
    },
    court: {
      king: 'Frontier Sheriff with 6-point sterling star, duster coat and Winchester',
      queen: 'Saloon Belle in ruffled crimson satin with hidden pearl derringer',
      jack: 'Riverboat Gambler with ivory-handled cane and sleeve ace card',
      ace: 'Weathered longhorn steer skull with twin crossed peacemaker revolvers',
      joker: 'Desert Outlaw with outlaw bandana mask and golden loot sack'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#451a03" stroke="#b45309" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4 2"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#5c260a"/>

      <!-- Tooled Leather Scrollwork & Steer Skull -->
      <g stroke="#d97706" stroke-width="1" fill="none">
        <!-- Horseshoe Oval Border -->
        <ellipse cx="70" cy="98" rx="34" ry="46" stroke="#f59e0b" stroke-width="2"/>
        
        <!-- Longhorn Steer Skull Centerpiece -->
        <g transform="translate(70, 98)" fill="#fef3c7" stroke="#3f1a08" stroke-width="1.2">
          <!-- Sweeping Horns -->
          <path d="M-8 -6 C-24 -24 -36 -12 -38 4 C-36 0 -24 -12 -10 -2 Z"/>
          <path d="M8 -6 C24 -24 36 -12 38 4 C36 0 24 -12 10 -2 Z"/>
          <!-- Skull Cranium -->
          <path d="M-8 -4 L8 -4 L6 14 L0 24 L-6 14 Z"/>
          <!-- Eye Sockets -->
          <ellipse cx="-4" cy="4" rx="2" ry="3" fill="#3f1a08"/>
          <ellipse cx="4" cy="4" rx="2" ry="3" fill="#3f1a08"/>
        </g>
        
        <!-- Crossed Colt .45 Revolvers -->
        <path d="M48 140 L92 156 M92 140 L48 156" stroke="#f59e0b" stroke-width="2"/>
        
        <!-- Western Stars -->
        <polygon points="70,30 73,38 82,38 75,43 78,51 70,46 62,51 65,43 58,38 67,38" fill="#d97706"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="ww_felt" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#3d210d"/>
          <stop offset="60%" stop-color="#261306"/>
          <stop offset="100%" stop-color="#140902"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#ww_felt)"/>
      <g stroke="#b45309" stroke-width="0.5" fill="none" opacity="0.12">
        <pattern id="ww_horseshoe" width="90" height="90" patternUnits="userSpaceOnUse">
          <circle cx="45" cy="45" r="25"/>
          <path d="M35 55 L35 35 Q45 25 55 35 L55 55"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#ww_horseshoe)"/>
      </g>
    `,
    cardFaceSVG: `
<defs>
        <linearGradient id="ww_leather" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#5c260a"/>
          <stop offset="100%" stop-color="#2a0f03"/>
        </linearGradient>
        <linearGradient id="ww_silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="50%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
      <rect width="140" height="196" rx="8" fill="#f5ead6" stroke="#78350f" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#4a2c11" stroke-width="1.2" stroke-dasharray="4 2"/>
      
      <!-- Corner Indices -->
      <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#4a2c11">A</text>
      <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="#78350f"/>
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#4a2c11">A</text>
        <path d="M11 27 L16 34 L6 34 Z M11 31 L11 37 L14 37 L14 38 L8 38 L8 37 L11 37 Z" fill="#78350f"/>
      </g>
      
      <!-- Steer Skull & Crossed Revolvers Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Rope Horseshoe Halo -->
        <ellipse cx="0" cy="0" rx="46" ry="49" fill="none" stroke="#b45309" stroke-width="2" stroke-dasharray="3 2"/>
        
        <!-- Large Tooled Leather Spade -->
        <path d="M0 -40 C-30 -4 -34 22 -14 28 C-4 30 -2 23 0 19 C2 23 4 30 14 28 C34 22 30 -4 0 -40 Z" fill="url(#ww_leather)" stroke="#b45309" stroke-width="2.5"/>
        <path d="M-4 17 L-8 34 L8 34 L4 17 Z" fill="#78350f"/>
        
        <!-- Detailed Texas Longhorn Steer Skull -->
        <g fill="#fef3c7" stroke="#1f0d04" stroke-width="1.2">
          <!-- Sweeping Horns -->
          <path d="M-7 -12 C-26 -32 -38 -18 -40 4 C-38 0 -25 -18 -9 -8 Z"/>
          <path d="M7 -12 C26 -32 38 -18 40 4 C38 0 25 -18 9 -8 Z"/>
          <!-- Cranium Bone -->
          <path d="M-8 -10 L8 -10 L6 10 L0 20 L-6 10 Z"/>
          <!-- Eye Sockets -->
          <ellipse cx="-4" cy="0" rx="2.2" ry="3" fill="#1f0d04"/>
          <ellipse cx="4" cy="0" rx="2.2" ry="3" fill="#1f0d04"/>
        </g>
        
        <!-- Crossed Colt .45 Peacemaker Revolvers -->
        <g stroke="url(#ww_silver)" stroke-width="2" fill="#333">
          <line x1="-22" y1="20" x2="22" y2="32"/>
          <line x1="22" y1="20" x2="-22" y2="32"/>
          <circle cx="-16" cy="22" r="3" fill="#8d5b2c"/>
          <circle cx="16" cy="22" r="3" fill="#8d5b2c"/>
        </g>
        
        <!-- 6-Point Sterling Sheriff Star Badge -->
        <g fill="url(#ww_silver)" stroke="#1e293b" stroke-width="0.8" transform="translate(0, -2)">
          <polygon points="0,-8 2.5,-2.5 8,-2.5 3.5,2 5.5,8 0,4.5 -5.5,8 -3.5,2 -8,-2.5 -2.5,-2.5"/>
          <circle cx="0" cy="0" r="2" fill="#78350f"/>
        </g>
        <text x="0" y="48" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="7" fill="#78350f" text-anchor="middle" letter-spacing="2">TOMBSTONE • 1881</text>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 5. Botanical Garden (Vintage 🌺)
  // ---------------------------------------------------------------------------
  {
    id: 'botanical_garden',
    name: 'Botanical Garden',
    era: 'Vintage',
    icon: '🌺',
    subtitle: 'Victorian Kew Glasshouse, Damask Roses & Pressed Ferns',
    primaryColor: '#1e3a1e',
    secondaryColor: '#122612',
    accentColor: '#15803d',
    textColor: '#f0fdf4',
    faceTitle: 'Royal Damask Rose (Ace of Spades) 🌹',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Bleeding Heart Blossom',
      diamonds: 'Prismatic Orchid Petal',
      spades: 'Fern Frond & Thistle',
      clubs: 'Four-Leaf Damask Clover'
    },
    court: {
      king: 'Royal Botanist in emerald velvet coat with magnifying glass & rare orchid',
      queen: 'Greenhouse Mistress with botanical shears, monstera leaf & calla lilies',
      jack: 'Arboretum Apprentice with leather satchel of rare pressed specimens',
      ace: 'Giant blooming Damask Rose entwined with wild forest fern fronds',
      joker: 'Forest Satyr with pan flute woven of willow reed stems'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#14301a" stroke="#22c55e" stroke-width="2.5"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#86efac" stroke-width="1.2"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#0d2112"/>

      <!-- Victorian Pressed Ferns & Blooming Roses -->
      <g stroke="#4ade80" stroke-width="1" fill="none">
        <!-- Oval Wreath -->
        <ellipse cx="70" cy="98" rx="36" ry="48" stroke="#16a34a" stroke-width="2"/>
        
        <!-- Woven Fern Leaves -->
        <path d="M70 50 Q85 70 70 98 Q55 126 70 146" stroke="#22c55e" stroke-width="1.5"/>
        <path d="M70 60 Q95 65 85 85"/>
        <path d="M70 80 Q95 85 85 105"/>
        <path d="M70 100 Q95 105 85 125"/>
        <path d="M70 60 Q45 65 55 85"/>
        <path d="M70 80 Q45 85 55 105"/>
        <path d="M70 100 Q45 105 55 125"/>
        
        <!-- Center Damask Rose -->
        <g transform="translate(70, 98)" fill="#e11d48">
          <circle cx="0" cy="0" r="10"/>
          <path d="M-6 -6 Q0 -14 6 -6 Q14 0 6 6 Q0 14 -6 6 Q-14 0 -6 -6 Z" fill="#f43f5e" opacity="0.8"/>
          <circle cx="0" cy="0" r="4" fill="#fbbf24"/>
        </g>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="bg_felt" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#142c19"/>
          <stop offset="60%" stop-color="#0d1f11"/>
          <stop offset="100%" stop-color="#061208"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#bg_felt)"/>
      <g stroke="#22c55e" stroke-width="0.5" fill="none" opacity="0.14">
        <pattern id="bg_leaf" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M40 0 Q60 40 40 80 Q20 40 40 0 Z"/>
          <line x1="40" y1="0" x2="40" y2="80"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#bg_leaf)"/>
      </g>
    `,
    cardFaceSVG: `
      <rect width="140" height="196" rx="8" fill="#f6f9f3" stroke="#15803d" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#1e3a1e" stroke-width="1.2"/>
      
      <!-- Leaf Vine Filigree Corners -->
      <g stroke="#15803d" stroke-width="0.8" fill="none">
        <path d="M8 18 Q14 14 18 8 M10 14 Q14 12 16 10"/>
        <path d="M132 18 Q126 14 122 8 M130 14 Q126 12 124 10"/>
        <path d="M8 178 Q14 182 18 188 M10 182 Q14 184 16 186"/>
        <path d="M132 178 Q126 182 122 188 M130 182 Q126 184 124 186"/>
      </g>
      
      <!-- Corner Indices (Top Left) -->
      <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#1e3a1e">A</text>
      <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#15803d"/>
      
      <!-- Corner Indices (Bottom Right - Inverted) -->
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#1e3a1e">A</text>
        <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#15803d"/>
      </g>
      
      <!-- Botanical Wreath & Damask Rose Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Oval Herbarium Frame -->
        <ellipse cx="0" cy="0" rx="42" ry="46" fill="none" stroke="#15803d" stroke-width="1.5" stroke-dasharray="3 3"/>
        
        <!-- Large Botanical Spade Silhouette -->
        <path d="M0 -38 C-28 -4 -32 20 -12 26 C-4 28 -2 22 0 18 C2 22 4 28 12 26 C32 20 28 -4 0 -38 Z" fill="#122612" stroke="#15803d" stroke-width="2"/>
        <path d="M-3 16 L-7 32 L7 32 L3 16 Z" fill="#1e3a1e"/>
        
        <!-- Blooming Damask Rose Inset -->
        <g transform="translate(0, -2)">
          <!-- Outer Crimson Petals -->
          <circle cx="0" cy="0" r="14" fill="#a82d46"/>
          <path d="M-10 -10 Q0 -18 10 -10 Q18 0 10 10 Q0 18 -10 10 Q-18 0 -10 -10 Z" fill="#c23b56" opacity="0.9"/>
          <path d="M-6 -6 Q0 -12 6 -6 Q12 0 6 6 Q0 12 -6 6 Q-12 0 -6 -6 Z" fill="#e11d48"/>
          <!-- Golden Pollen Stamen -->
          <circle cx="0" cy="0" r="3.5" fill="#fbbf24"/>
          
          <!-- Fern Tendrils -->
          <path d="M0 12 Q-14 20 -20 14" stroke="#4ade80" stroke-width="1.2" fill="none"/>
          <path d="M0 12 Q14 20 20 14" stroke="#4ade80" stroke-width="1.2" fill="none"/>
        </g>
        
        <!-- Perched Swallowtail Butterfly -->
        <g transform="translate(0, -32) scale(0.7)" fill="#fbbf24" stroke="#122612" stroke-width="0.8">
          <path d="M0 0 C-8 -10 -14 -4 -6 6 Z"/>
          <path d="M0 0 C8 -10 14 -4 6 6 Z"/>
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#122612" stroke-width="1"/>
        </g>
        
        <text x="0" y="46" font-family="'Cinzel', Georgia, serif" font-weight="700" font-size="7" fill="#15803d" text-anchor="middle" letter-spacing="2">KEW GARDENS • 1884</text>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 6. Gothic Cathedral (Vintage ⛪)
  // ---------------------------------------------------------------------------
  {
    id: 'gothic_cathedral',
    name: 'Gothic Cathedral',
    era: 'Vintage',
    icon: '⛪',
    subtitle: 'Pointed Arch Vaults, Stained Glass & Rose Windows',
    primaryColor: '#1e1b4b',
    secondaryColor: '#0f0e2a',
    accentColor: '#818cf8',
    textColor: '#e0e7ff',
    faceTitle: 'Rose Window (Ace of Spades) ⛪',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Ruby Stained Glass Chalice',
      diamonds: 'Pointed Lancet Arch Window',
      spades: 'Cathedral Spire & Cross',
      clubs: 'Gothic Trefoil Tracery'
    },
    court: {
      king: 'Gothic Sovereign in midnight mantle with iron crown and broadsword',
      queen: 'Cathedral Abbess with silver rosary, illuminated psalter and veil',
      jack: 'Master Stone Mason with iron chisel and architectural compass',
      ace: 'Towering Gothic pointed arch framing a radiant stained glass rose window',
      joker: 'Gargoyle Chimera perched upon high basalt stone corbel'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#110e26" stroke="#818cf8" stroke-width="2.5"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#c7d2fe" stroke-width="1.2"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#18153b"/>

      <!-- Radiant Stained Glass Rose Window -->
      <g stroke="#818cf8" stroke-width="1" fill="none">
        <!-- Pointed Arch Tracery -->
        <path d="M35 150 L35 70 Q70 15 105 70 L105 150 Z" stroke="#a5b4fc" stroke-width="1.5"/>
        
        <!-- Multi-Tier Rose Window -->
        <circle cx="70" cy="85" r="28" stroke="#818cf8" stroke-width="2"/>
        <circle cx="70" cy="85" r="20" stroke="#f43f5e" stroke-width="2"/>
        <circle cx="70" cy="85" r="12" stroke="#38bdf8" stroke-width="2"/>
        <circle cx="70" cy="85" r="4" fill="#fbbf24"/>
        
        <!-- 12 Radiating Petal Mullions -->
        <path d="M70 57 L70 113 M42 85 L98 85 M50 65 L90 105 M50 105 L90 65"/>
        
        <!-- Gothic Trefoils at base -->
        <circle cx="55" cy="130" r="8"/>
        <circle cx="85" cy="130" r="8"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="gc_bg" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#1d1945"/>
          <stop offset="60%" stop-color="#120f2e"/>
          <stop offset="100%" stop-color="#080617"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#gc_bg)"/>
      <g stroke="#818cf8" stroke-width="0.5" fill="none" opacity="0.14">
        <pattern id="gc_arch" width="80" height="120" patternUnits="userSpaceOnUse">
          <path d="M10 120 L10 60 Q40 10 70 60 L70 120"/>
          <circle cx="40" cy="65" r="15"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#gc_arch)"/>
      </g>
    `,
    cardFaceSVG: `
      <rect width="140" height="196" rx="8" fill="#f3f0f7" stroke="#1e1b4b" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#818cf8" stroke-width="1.2"/>
      
      <!-- Gothic Trefoil Corner Tracery -->
      <g stroke="#1e1b4b" stroke-width="0.8" fill="none">
        <circle cx="16" cy="16" r="3.5"/><circle cx="124" cy="16" r="3.5"/>
        <circle cx="16" cy="180" r="3.5"/><circle cx="124" cy="180" r="3.5"/>
      </g>
      
      <!-- Corner Indices (Top Left) -->
      <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#1e1b4b">A</text>
      <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#818cf8"/>
      
      <!-- Corner Indices (Bottom Right - Inverted) -->
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#1e1b4b">A</text>
        <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#818cf8"/>
      </g>
      
      <!-- Gothic Pointed Arch & Rose Window Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Soaring Pointed Arch Stone Frame -->
        <path d="M-38 42 L-38 -10 Q0 -60 38 -10 L38 42 Z" fill="#0f0e2a" stroke="#1e1b4b" stroke-width="2"/>
        
        <!-- Large Stained Glass Spade Silhouette -->
        <path d="M0 -38 C-28 -4 -32 20 -12 26 C-4 28 -2 22 0 18 C2 22 4 28 12 26 C32 20 28 -4 0 -38 Z" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.8"/>
        <path d="M-3 16 L-7 32 L7 32 L3 16 Z" fill="#818cf8"/>
        
        <!-- Multi-Color Rose Window Tracery Inset -->
        <g transform="translate(0, -6)">
          <!-- Outer Ruby Ring -->
          <circle cx="0" cy="0" r="18" fill="none" stroke="#e11d48" stroke-width="2.5"/>
          <!-- Middle Cobalt Ring -->
          <circle cx="0" cy="0" r="12" fill="none" stroke="#2563eb" stroke-width="2"/>
          <!-- Inner Gold Ring -->
          <circle cx="0" cy="0" r="6" fill="#fbbf24" stroke="#d4af37" stroke-width="1"/>
          
          <!-- Radiating 8-Petal Mullion Lines -->
          <g stroke="#ffffff" stroke-width="0.8" opacity="0.85">
            <line x1="0" y1="-18" x2="0" y2="18"/>
            <line x1="-18" y1="0" x2="18" y2="0"/>
            <line x1="-12" y1="-12" x2="12" y2="12"/>
            <line x1="-12" y1="12" x2="12" y2="-12"/>
          </g>
        </g>
        
        <!-- Gothic Spire Cross at Arch Apex -->
        <g stroke="#d4af37" stroke-width="1.2">
          <line x1="0" y1="-56" x2="0" y2="-42"/>
          <line x1="-4" y1="-50" x2="4" y2="-50"/>
        </g>
        
        <text x="0" y="46" font-family="'Cinzel', Georgia, serif" font-weight="700" font-size="7" fill="#818cf8" text-anchor="middle" letter-spacing="2">NOTRE DAME • 1250</text>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 7. Cyberpunk Neon (Modern 🌃)
  // ---------------------------------------------------------------------------
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    era: 'Modern',
    icon: '🌃',
    subtitle: 'High-Voltage Cyan & Laser Magenta Circuit Matrix',
    primaryColor: '#0a0a14',
    secondaryColor: '#121226',
    accentColor: '#00f3ff',
    textColor: '#ffffff',
    faceTitle: 'Holo-Circuit Matrix (Ace of Spades) ⚡',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Laser Holographic Heart',
      diamonds: 'Prismatic Neon Shard',
      spades: 'Cybernetic Monofilament Blade',
      clubs: 'Triple Biohazard Node'
    },
    court: {
      king: 'Chrome Netrunner with neural optic cyber-eyes & black trenchcoat',
      queen: 'Megacorp Executive in biometric armor with holo-katana',
      jack: 'Street Deck Hacker with cyberdeck rig & VR datagoggles',
      ace: 'Superconductive quantum processor core with laser bus lines',
      joker: 'Rogue Rogue AI with glitched holographic smile & corrupted RAM'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#06060c" stroke="#00f3ff" stroke-width="2.5"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#ff0055" stroke-width="1.2"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#0d0d1a"/>

      <!-- Glowing Neon Circuit Traces -->
      <g stroke="#00f3ff" stroke-width="1.2" fill="none">
        <!-- Center Cybernetic Processor Die -->
        <rect x="52" y="80" width="36" height="36" rx="4" fill="#06060c" stroke="#ff0055" stroke-width="2"/>
        <circle cx="70" cy="98" r="8" fill="#00f3ff"/>
        
        <!-- Bus Lines with 45-degree bends -->
        <path d="M70 80 L70 40 L50 20 L25 20"/>
        <path d="M70 116 L70 156 L90 176 L115 176"/>
        <path d="M52 98 L20 98 L15 103 L15 140"/>
        <path d="M88 98 L120 98 L125 93 L125 56"/>
        
        <!-- Solder Vias -->
        <circle cx="25" cy="20" r="2.5" fill="#00f3ff"/>
        <circle cx="115" cy="176" r="2.5" fill="#ff0055"/>
        <circle cx="15" cy="140" r="2.5" fill="#00f3ff"/>
        <circle cx="125" cy="56" r="2.5" fill="#ff0055"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="cp_bg" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#140f26"/>
          <stop offset="60%" stop-color="#090814"/>
          <stop offset="100%" stop-color="#020205"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#cp_bg)"/>
      <g stroke="#00f3ff" stroke-width="0.6" fill="none" opacity="0.18">
        <pattern id="cp_hex" width="60" height="104" patternUnits="userSpaceOnUse">
          <path d="M30 0 L60 17 L60 52 L30 69 L0 52 L0 17 Z M30 104 L60 87 L60 52 L30 35 L0 52 L0 87 Z"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#cp_hex)"/>
      </g>
    `,
    cardFaceSVG: `
      <rect width="140" height="196" rx="8" fill="#080914" stroke="#00f3ff" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#ff0055" stroke-width="1.2"/>
      
      <!-- Cyber HUD Corner Brackets -->
      <g stroke="#00f3ff" stroke-width="1.2" fill="none">
        <path d="M8 18 L8 8 L18 8"/>
        <path d="M132 18 L132 8 L122 8"/>
        <path d="M8 178 L8 188 L18 188"/>
        <path d="M132 178 L132 188 L122 188"/>
      </g>
      
      <!-- Corner Indices (Top Left) -->
      <text x="10" y="24" font-family="'Courier New', monospace" font-weight="900" font-size="16" fill="#00f3ff">A</text>
      <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#ff0055"/>
      
      <!-- Corner Indices (Bottom Right - Inverted) -->
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Courier New', monospace" font-weight="900" font-size="16" fill="#00f3ff">A</text>
        <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#ff0055"/>
      </g>
      
      <!-- Cyberpunk Holo-Spade Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Hex Grid Radar Reticle -->
        <circle cx="0" cy="0" r="44" fill="none" stroke="#00f3ff" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
        <circle cx="0" cy="0" r="38" fill="none" stroke="#ff0055" stroke-width="0.8" opacity="0.5"/>
        
        <!-- Large Dark Circuit Spade Silhouette -->
        <path d="M0 -38 C-28 -4 -32 20 -12 26 C-4 28 -2 22 0 18 C2 22 4 28 12 26 C32 20 28 -4 0 -38 Z" fill="#10132b" stroke="#00f3ff" stroke-width="2.2"/>
        <path d="M-3 16 L-7 32 L7 32 L3 16 Z" fill="#00f3ff"/>
        
        <!-- Internal Microprocessor Die & Laser Bus Traces -->
        <g stroke="#ff0055" stroke-width="1.2" fill="none">
          <!-- CPU Core Die -->
          <rect x="-10" y="-12" width="20" height="20" rx="3" fill="#080914" stroke="#00f3ff" stroke-width="1.5"/>
          <circle cx="0" cy="-2" r="4" fill="#ff0055"/>
          
          <!-- Circuit Paths with Vias -->
          <path d="M0 -12 L0 -28"/>
          <circle cx="0" cy="-28" r="2" fill="#00f3ff"/>
          <path d="M-10 -2 L-20 -2 L-24 6"/>
          <circle cx="-24" cy="6" r="2" fill="#00f3ff"/>
          <path d="M10 -2 L20 -2 L24 6"/>
          <circle cx="24" cy="6" r="2" fill="#00f3ff"/>
        </g>
        
        <text x="0" y="46" font-family="'Courier New', monospace" font-weight="700" font-size="7" fill="#00f3ff" text-anchor="middle" letter-spacing="2">SYS_OVERRIDE • 0x7F</text>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 8. Minimalist Zen (Modern 🎋)
  // ---------------------------------------------------------------------------
  {
    id: 'minimalist_zen',
    name: 'Minimalist Zen',
    era: 'Modern',
    icon: '🎋',
    subtitle: 'Washi Paper, Charcoal Sumi Ink Ensō & Sakura Petals',
    primaryColor: '#fafaf9',
    secondaryColor: '#e7e5e4',
    accentColor: '#1c1917',
    textColor: '#1c1917',
    faceTitle: 'Ensō Sakura (Ace of Spades) 🎋',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Single Vermillion Sakura Petal',
      diamonds: 'Folded Origami Crane Lozenge',
      spades: 'Charcoal Ensō Ink Brushstroke',
      clubs: 'Three River Pebbles'
    },
    court: {
      king: 'Zen Master Calligrapher with giant bamboo horsehair brush and stone inkwell',
      queen: 'Tea Ceremony Hostess in raw silk kimono whisking ceremonial matcha',
      jack: 'Bonsai Gardener with hand-forged shears shaping miniature juniper',
      ace: 'Sweeping Ensō ink circle transitioning into a poised spade tip',
      joker: 'Mischievous Kitsune Fox with crimson mask markings and golden bells'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#f5f5f4" stroke="#1c1917" stroke-width="2.5"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#e7e5e4" stroke-width="1.5"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#fafaf9"/>

      <!-- Zen Ensō Brushstroke Circle & Red Seal Stamp -->
      <g transform="translate(70, 98)">
        <!-- Ensō Circle (Dynamic Brush Texture) -->
        <path d="M0 -34 C24 -34 36 -16 36 6 C36 28 18 36 -4 36 C-24 36 -36 18 -36 -4 C-36 -24 -18 -34 -2 -34" fill="none" stroke="#1c1917" stroke-width="6" stroke-linecap="round"/>
        
        <!-- Vermillion Artist Hanko Seal -->
        <rect x="12" y="12" width="16" height="16" rx="2" fill="#dc2626"/>
        <text x="20" y="24" font-family="'Noto Serif JP', serif" font-weight="900" font-size="10" fill="#ffffff" text-anchor="middle">禅</text>
        
        <!-- Sakura Cherry Petals -->
        <ellipse cx="-16" cy="-10" rx="3" ry="5" fill="#fda4af" transform="rotate(-30 -16 -10)"/>
        <ellipse cx="-8" cy="18" rx="2.5" ry="4" fill="#fda4af" transform="rotate(20 -8 18)"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="zen_bg" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stop-color="#f5f5f4"/>
          <stop offset="60%" stop-color="#e7e5e4"/>
          <stop offset="100%" stop-color="#d6d3d1"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#zen_bg)"/>
      <g stroke="#1c1917" stroke-width="0.3" fill="none" opacity="0.12">
        <pattern id="zen_rings" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="60" cy="60" r="50"/>
          <circle cx="60" cy="60" r="35"/>
          <circle cx="60" cy="60" r="20"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#zen_rings)"/>
      </g>
    `,
    cardFaceSVG: `
      <rect width="140" height="196" rx="8" fill="#fbfbfa" stroke="#1c1917" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#e7e5e4" stroke-width="1.2"/>
      
      <!-- Corner Indices (Top Left) -->
      <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#1c1917">A</text>
      <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#1c1917"/>
      
      <!-- Corner Indices (Bottom Right - Inverted) -->
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#1c1917">A</text>
        <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#1c1917"/>
      </g>
      
      <!-- Ensō Sakura Brushstroke Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Ensō Calligraphic Spade Silhouette -->
        <path d="M0 -38 C-28 -4 -32 20 -12 26 C-4 28 -2 22 0 18 C2 22 4 28 12 26 C32 20 28 -4 0 -38 Z" fill="#1a1918"/>
        <path d="M-2 16 L-5 32 L5 32 L2 16 Z" fill="#1a1918"/>
        
        <!-- Ensō Circular Flow Arc -->
        <path d="M-24 -18 C-36 2 -26 28 0 32 C26 32 36 10 32 -14" fill="none" stroke="#fbfbfa" stroke-width="3" stroke-linecap="round"/>
        
        <!-- Floating Crimson Sakura Cherry Petals -->
        <g fill="#e11d48">
          <ellipse cx="-16" cy="-24" rx="3" ry="5" transform="rotate(-25 -16 -24)"/>
          <ellipse cx="18" cy="-18" rx="2.5" ry="4.5" transform="rotate(35 18 -18)"/>
          <ellipse cx="-22" cy="12" rx="2.8" ry="4.8" transform="rotate(-40 -22 12)"/>
          <ellipse cx="16" cy="22" rx="3" ry="5" transform="rotate(15 16 22)"/>
        </g>
        
        <!-- Red Square Artist Hanko Seal -->
        <rect x="18" y="6" width="14" height="14" rx="1.5" fill="#c82929"/>
        <text x="25" y="16.5" font-family="'Noto Serif JP', serif" font-weight="900" font-size="8" fill="#ffffff" text-anchor="middle">禅</text>
        
        <text x="0" y="46" font-family="'Cinzel', Georgia, serif" font-weight="700" font-size="7" fill="#1c1917" text-anchor="middle" letter-spacing="3">KYOTO • ZEN</text>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 9. Cosmic Constellation (Modern 🌌)
  // ---------------------------------------------------------------------------
  {
    id: 'cosmic_constellation',
    name: 'Cosmic Constellation',
    era: 'Modern',
    icon: '🌌',
    subtitle: 'Deep Space Nebula, Gold Celestial Astrolabe & Zodiac Stars',
    primaryColor: '#0a0818',
    secondaryColor: '#161233',
    accentColor: '#fbbf24',
    textColor: '#f8fafc',
    faceTitle: 'Celestial Astrolabe (Ace of Spades) 🌌',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Supernova Burst Heart',
      diamonds: 'Prismatic Quasar Lozenge',
      spades: 'Golden Astrolabe Planisphere',
      clubs: 'Triple Orbiting Satellite Moons'
    },
    court: {
      king: 'Cosmic Sovereign in star-forged mantle holding glowing pulsar orb',
      queen: 'Starlight Empress crowned with supernova halo & crescent scepter',
      jack: 'Deep Space Navigator plotting orbital trajectories with celestial dividers',
      ace: 'Golden celestial planisphere with coordinate grids and glowing constellations',
      joker: 'Supermassive Black Hole Singularity bending spacetime light rings'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#080614" stroke="#fbbf24" stroke-width="2.5"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#60a5fa" stroke-width="1.2"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#0f0c24"/>

      <!-- Celestial Planisphere Star Chart -->
      <g stroke="#fbbf24" stroke-width="1" fill="none">
        <!-- Astrolabe Coordinate Rings -->
        <circle cx="70" cy="98" r="38" stroke="#38bdf8" stroke-width="1.5"/>
        <circle cx="70" cy="98" r="28" stroke-dasharray="2 3"/>
        <circle cx="70" cy="98" r="14" stroke="#fbbf24" stroke-width="1.8"/>
        
        <!-- Major Constellations (Ursa Major / Cassiopeia) -->
        <g stroke="#ffffff" stroke-width="0.8">
          <polyline points="48,70 56,76 66,74 74,82 86,80 82,92 74,82"/>
          <circle cx="48" cy="70" r="1.8" fill="#fbbf24"/>
          <circle cx="56" cy="76" r="1.8" fill="#fbbf24"/>
          <circle cx="66" cy="74" r="1.8" fill="#fbbf24"/>
          <circle cx="74" cy="82" r="2.2" fill="#ffffff"/>
          <circle cx="86" cy="80" r="1.8" fill="#fbbf24"/>
          <circle cx="82" cy="92" r="1.8" fill="#fbbf24"/>
        </g>
        
        <!-- Moon Phases -->
        <path d="M70 54 A6 6 0 0 0 70 66 A4 6 0 0 1 70 54" fill="#fbbf24"/>
        <path d="M70 130 A6 6 0 0 1 70 142 A4 6 0 0 0 70 130" fill="#fbbf24"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <radialGradient id="cc_bg" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#161238"/>
          <stop offset="60%" stop-color="#0a071c"/>
          <stop offset="100%" stop-color="#030208"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#cc_bg)"/>
      <g stroke="#38bdf8" stroke-width="0.5" fill="none" opacity="0.16">
        <pattern id="cc_stars" width="100" height="100" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="30" r="1.5" fill="#fbbf24"/>
          <circle cx="80" cy="70" r="1.5" fill="#ffffff"/>
          <line x1="20" y1="30" x2="50" y2="40"/>
          <line x1="50" y1="40" x2="80" y2="70"/>
        </pattern>
        <rect width="1920" height="1080" fill="url(#cc_stars)"/>
      </g>
    `,
    cardFaceSVG: `
      <rect width="140" height="196" rx="8" fill="#090a18" stroke="#fbbf24" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#60a5fa" stroke-width="1.2"/>
      
      <!-- Starlight Corner Accents -->
      <g fill="#fbbf24">
        <polygon points="12,12 14,8 16,12 20,14 16,16 14,20 12,16 8,14"/>
        <polygon points="128,12 130,8 132,12 136,14 132,16 130,20 128,16 124,14"/>
        <polygon points="12,184 14,180 16,184 20,186 16,188 14,192 12,188 8,186"/>
        <polygon points="128,184 130,180 132,184 136,186 132,188 130,192 128,188 124,186"/>
      </g>
      
      <!-- Corner Indices (Top Left) -->
      <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#fbbf24">A</text>
      <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#60a5fa"/>
      
      <!-- Corner Indices (Bottom Right - Inverted) -->
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="15" fill="#fbbf24">A</text>
        <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#60a5fa"/>
      </g>
      
      <!-- Cosmic Astrolabe Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Astrolabe Celestial Orbit Rings -->
        <circle cx="0" cy="0" r="44" fill="none" stroke="#60a5fa" stroke-width="1" stroke-dasharray="2 3"/>
        <ellipse cx="0" cy="0" rx="42" ry="20" fill="none" stroke="#fbbf24" stroke-width="1" transform="rotate(-25)"/>
        
        <!-- Large Dark Cosmic Spade Silhouette -->
        <path d="M0 -38 C-28 -4 -32 20 -12 26 C-4 28 -2 22 0 18 C2 22 4 28 12 26 C32 20 28 -4 0 -38 Z" fill="#13173d" stroke="#fbbf24" stroke-width="2"/>
        <path d="M-3 16 L-7 32 L7 32 L3 16 Z" fill="#fbbf24"/>
        
        <!-- Glowing Constellation Nodes Inside Spade -->
        <g stroke="#ffffff" stroke-width="0.8" fill="#fbbf24">
          <polyline points="-16,-6 -6,4 4,-2 14,8 10,18" fill="none"/>
          <circle cx="-16" cy="-6" r="2"/>
          <circle cx="-6" cy="4" r="2.5" fill="#ffffff"/>
          <circle cx="4" cy="-2" r="2"/>
          <circle cx="14" cy="8" r="2.5" fill="#ffffff"/>
          <circle cx="10" cy="18" r="2"/>
        </g>
        
        <!-- Crescent Moons -->
        <path d="M0 -22 A4 4 0 0 0 0 -14 A3 4 0 0 1 0 -22" fill="#fbbf24"/>
        
        <text x="0" y="46" font-family="'Cinzel', Georgia, serif" font-weight="700" font-size="7" fill="#fbbf24" text-anchor="middle" letter-spacing="2">CELESTIAL • ORION</text>
      </g>
    `
  },

  // ---------------------------------------------------------------------------
  // 10. Retro Synthwave 1984 (Modern 🌆)
  // ---------------------------------------------------------------------------
  {
    id: 'retro_synthwave',
    name: 'Retro Synthwave 1984',
    era: 'Modern',
    icon: '🌆',
    subtitle: '80s Outrun Perspective Wireframe Grid & Neon Sunset',
    primaryColor: '#18072b',
    secondaryColor: '#2b0945',
    accentColor: '#ff007f',
    textColor: '#00f0ff',
    faceTitle: 'Outrun Sunset (Ace of Spades) 🌆',
    faceFile: 'AS.svg',
    suits: {
      hearts: 'Chrome Banded Sunset Heart',
      diamonds: 'Neon Outrun Vector Lozenge',
      spades: 'Wireframe Perspective Grid Spade',
      clubs: 'Twin Palm Silhouette'
    },
    court: {
      king: 'Turbo Driver in aviator shades and leather jacket with neon keytar',
      queen: 'Cyberpunk Aerobics Star in holographic lamé unitard with boombox',
      jack: 'Arcade Champion with fingerless gloves clutching joystick trophy',
      ace: 'Segmented horizontal neon sun dipping below perspective wireframe horizon',
      joker: 'VHS Tracking Error Glitch Joker with analog tape scanlines'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#10031f" stroke="#ff007f" stroke-width="2.5"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#00f0ff" stroke-width="1.2"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#1b0833"/>

      <!-- 80s Banded Neon Sunset & Perspective Grid -->
      <g>
        <!-- Segmented Neon Sun -->
        <g fill="#ff007f">
          <path d="M46 80 A24 24 0 0 1 94 80 Z"/>
          <rect x="44" y="82" width="52" height="3" fill="#ff4081"/>
          <rect x="46" y="87" width="48" height="4" fill="#ffab40"/>
          <rect x="49" y="93" width="42" height="5" fill="#ffd740"/>
        </g>
        
        <!-- Horizon Line -->
        <line x1="20" y1="100" x2="120" y2="100" stroke="#00f0ff" stroke-width="2"/>
        
        <!-- Perspective Wireframe Grid Lines -->
        <g stroke="#00f0ff" stroke-width="1" opacity="0.85">
          <line x1="70" y1="100" x2="70" y2="165"/>
          <line x1="70" y1="100" x2="45" y2="165"/>
          <line x1="70" y1="100" x2="95" y2="165"/>
          <line x1="70" y1="100" x2="20" y2="165"/>
          <line x1="70" y1="100" x2="120" y2="165"/>
          
          <!-- Transverse Grid Steps -->
          <line x1="45" y1="108" x2="95" y2="108"/>
          <line x1="38" y1="120" x2="102" y2="120"/>
          <line x1="30" y1="138" x2="110" y2="138"/>
          <line x1="20" y1="162" x2="120" y2="162"/>
        </g>
        
        <!-- Silhouette Palm Trees -->
        <path d="M36 100 Q40 85 45 75 Q42 70 34 76 M45 75 Q48 68 54 74 M45 75 Q45 65 42 62" stroke="#10031f" stroke-width="2" fill="none"/>
      </g>
    `,
    backgroundSVG: `
      <defs>
        <linearGradient id="sw_bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#140224"/>
          <stop offset="45%" stop-color="#36084d"/>
          <stop offset="50%" stop-color="#ff007f"/>
          <stop offset="52%" stop-color="#00f0ff"/>
          <stop offset="100%" stop-color="#080112"/>
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#sw_bg)"/>
      <g stroke="#00f0ff" stroke-width="1" opacity="0.35">
        <!-- Floor Grid -->
        <line x1="960" y1="560" x2="0" y2="1080"/>
        <line x1="960" y1="560" x2="480" y2="1080"/>
        <line x1="960" y1="560" x2="960" y2="1080"/>
        <line x1="960" y1="560" x2="1440" y2="1080"/>
        <line x1="960" y1="560" x2="1920" y2="1080"/>
        <line x1="0" y1="620" x2="1920" y2="620"/>
        <line x1="0" y1="720" x2="1920" y2="720"/>
        <line x1="0" y1="880" x2="1920" y2="880"/>
      </g>
    `,
    cardFaceSVG: `
      <rect width="140" height="196" rx="8" fill="#120924" stroke="#ff007f" stroke-width="2.5"/>
      <rect x="5" y="5" width="130" height="186" rx="6" fill="none" stroke="#00f0ff" stroke-width="1.2"/>
      
      <!-- Corner Indices (Top Left) -->
      <text x="10" y="24" font-family="'Impact', 'Arial Black', sans-serif" font-weight="900" font-size="16" fill="#ff007f" font-style="italic">A</text>
      <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#00f0ff"/>
      
      <!-- Corner Indices (Bottom Right - Inverted) -->
      <g transform="rotate(180 70 98)">
        <text x="10" y="24" font-family="'Impact', 'Arial Black', sans-serif" font-weight="900" font-size="16" fill="#ff007f" font-style="italic">A</text>
        <path d="M11 28 L15 34 L7 34 Z M11 32 L11 36 L13 36 L13 37 L9 37 L9 36 L11 36 Z" fill="#00f0ff"/>
      </g>
      
      <!-- Synthwave Outrun Sunset & Spade Centerpiece -->
      <g transform="translate(70, 98)">
        <!-- Banded Sunset -->
        <g transform="translate(0, -6)">
          <path d="M-28 0 A28 28 0 0 1 28 0 Z" fill="#ff007f"/>
          <rect x="-26" y="2" width="52" height="3" fill="#ff4081"/>
          <rect x="-24" y="7" width="48" height="3.5" fill="#ff9100"/>
          <rect x="-21" y="12.5" width="42" height="4" fill="#ffd600"/>
        </g>
        
        <!-- 3D Perspective Horizon Floor Wireframe -->
        <g stroke="#00f0ff" stroke-width="1" opacity="0.8">
          <line x1="-38" y1="14" x2="38" y2="14"/>
          <line x1="0" y1="14" x2="-32" y2="38"/>
          <line x1="0" y1="14" x2="0" y2="38"/>
          <line x1="0" y1="14" x2="32" y2="38"/>
          <line x1="-22" y1="24" x2="22" y2="24"/>
          <line x1="-30" y1="34" x2="30" y2="34"/>
        </g>
        
        <!-- Chrome Overlay Spade Silhouette -->
        <path d="M0 -38 C-28 -4 -32 20 -12 26 C-4 28 -2 22 0 18 C2 22 4 28 12 26 C32 20 28 -4 0 -38 Z" fill="none" stroke="#00f0ff" stroke-width="2.5"/>
        <path d="M-3 16 L-7 32 L7 32 L3 16 Z" fill="#00f0ff"/>
        
        <text x="0" y="46" font-family="'Impact', 'Arial Black', sans-serif" font-weight="700" font-size="8" fill="#ff007f" text-anchor="middle" letter-spacing="3" font-style="italic">OUTRUN 1984</text>
      </g>
    `
  },
  // ---------------------------------------------------------------------------
  // 11. Classic Casino Standard (Classic ♠️)
  // ---------------------------------------------------------------------------
  {
    id: 'classic_standard',
    name: 'Classic Casino Standard',
    era: 'Classic',
    icon: '♠️',
    subtitle: '19th-Century American Intaglio Engraving & Casino Heritage',
    primaryColor: '#0a2342',
    secondaryColor: '#ba131a',
    accentColor: '#d4af37',
    textColor: '#1a1a1a',
    faceTitle: 'King David (King of Spades) 👑',
    faceFile: 'K_spades.png',
    suits: {
      hearts: 'Regal Intaglio French Heart',
      diamonds: 'Geometric Chiseled Diamond',
      spades: 'Late Victorian Acanthus Spade',
      clubs: 'Trefoil Intaglio Club'
    },
    court: {
      king: 'Reversible 180° Intaglio Engraved King with Scepter & Broadsword',
      queen: 'Reversible Neoclassical Queen with Scepter',
      jack: 'Reversible Heraldic Jack in 15th-Century Doublet',
      ace: 'Intaglio Engraved Ornate Casino Spire Ace',
      joker: 'Authentic 1880s High/Low Casino Jester'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#0d2b52" stroke="#d4af37" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#2a528a" stroke-width="2"/>
      <rect x="11" y="11" width="118" height="174" rx="5" fill="#071b34"/>
      <circle cx="70" cy="98" r="32" stroke="#d4af37" stroke-width="1.5" fill="none"/>
      <circle cx="70" cy="98" r="22" stroke="#d4af37" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
    `
  },
  // ---------------------------------------------------------------------------
  // 12. Cartoon Animals Fable (Modern 🦊)
  // ---------------------------------------------------------------------------
  {
    id: 'cartoon_animals',
    name: 'Cartoon Animals Fable',
    era: 'Modern',
    icon: '🦊',
    subtitle: 'Golden-Age 1940s Cel Animation Animals',
    primaryColor: '#d97706',
    secondaryColor: '#1e3a8a',
    accentColor: '#fbbf24',
    textColor: '#18181b',
    faceTitle: 'Lion Monarch (King of Spades) 👑',
    faceFile: 'K_spades.png',
    suits: {
      hearts: 'Bouncy Rubber-Hose Cartoon Heart',
      diamonds: 'Sparkling Cartoon Star-Diamond',
      spades: 'Whimsical Ink-Wash Spade',
      clubs: 'Three-Leaf Clover Club'
    },
    court: {
      king: 'Reversible Lion King with cartoon crown & ermine cape',
      queen: 'Reversible Vixen Fox Queen with pearl necklace',
      jack: 'Reversible Wolf Musketeer with feathered chapeau',
      ace: 'Classic Golden-Age Animation Title Card Ace',
      joker: 'Original Non-Disney Mouse Minstrel Playing Mandolin'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#3b1d11" stroke="#fbbf24" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="70" cy="98" r="30" fill="#241108" stroke="#fbbf24" stroke-width="1.5"/>
    `
  },
  // ---------------------------------------------------------------------------
  // 13. Anime Fantasy Shonen (Modern ⚔️)
  // ---------------------------------------------------------------------------
  {
    id: 'anime_fantasy',
    name: 'Anime Fantasy Shonen',
    era: 'Modern',
    icon: '⚔️',
    subtitle: 'Epic Shonen Manga & Astral Magic Fantasy',
    primaryColor: '#6366f1',
    secondaryColor: '#0ea5e9',
    accentColor: '#ec4899',
    textColor: '#0f172a',
    faceTitle: 'Astral Blade Emperor (King of Spades) 👑',
    faceFile: 'K_spades.png',
    suits: {
      hearts: 'Soul Core Crimson Gem Heart',
      diamonds: 'Mana Shard Cyan Diamond',
      spades: 'Void Blade Indigo Spade',
      clubs: 'Druidic Crest Violet Club'
    },
    court: {
      king: 'Reversible Shonen Blade Emperor with radiant celestial blade',
      queen: 'Reversible Arch-Mage Sorceress in starry celestial robes',
      jack: 'Reversible Shadow Rogue with twin glowing daggers',
      ace: 'Astral Magic Circle Blade Ace of Spades',
      joker: 'Cosmic Fox Spirit Kitsune Jester'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#1e1838" stroke="#a855f7" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#818cf8" stroke-width="2"/>
      <circle cx="70" cy="98" r="30" fill="#0f0e21" stroke="#38bdf8" stroke-width="1.5"/>
    `
  },
  // ---------------------------------------------------------------------------
  // 14. Art Nouveau Stile Liberty (Vintage 🌿)
  // ---------------------------------------------------------------------------
  {
    id: 'art_nouveau',
    name: 'Art Nouveau Stile Liberty',
    era: 'Vintage',
    icon: '🌿',
    subtitle: 'Fin-de-Siècle Parisian Elegance & Whiplash Curves',
    primaryColor: '#166534',
    secondaryColor: '#b45309',
    accentColor: '#eab308',
    textColor: '#1c1917',
    faceTitle: 'Imperial Romanesque Sovereign (King of Diamonds) 👑',
    faceFile: 'K_diamonds.png',
    suits: {
      hearts: 'Flowing Botanical Vine Heart',
      diamonds: 'Gilded Stained-Glass Diamond',
      spades: 'Peacock Feather Arabesque Spade',
      clubs: 'Water Lily Leaf Trefoil'
    },
    court: {
      king: 'Reversible Byzantine Emperor with laurel wreath & golden globe',
      queen: 'Reversible Mucha-Style Spring Maiden with flowing floral hair',
      jack: 'Reversible Bohemian Troubadour with lute',
      ace: 'Stile Liberty Peacock Ace of Spades',
      joker: 'Gilded Pierrot Jester with theatrical masks'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#182c23" stroke="#d4af37" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#4ade80" stroke-width="2"/>
      <circle cx="70" cy="98" r="30" fill="#0f1c16" stroke="#d4af37" stroke-width="1.5"/>
    `
  },
  // ---------------------------------------------------------------------------
  // 15. Classic Casino Bicycle Standard (Benchmark ♠️)
  // ---------------------------------------------------------------------------
  {
    id: 'classic_standard',
    name: 'Classic Bicycle Standard',
    era: 'Classic',
    icon: '♠️',
    subtitle: '1885 Victorian Rider Back & Historical USPC Commercial Engraving',
    primaryColor: '#18181b',
    secondaryColor: '#1e3a8a',
    accentColor: '#d4af37',
    textColor: '#f8fafc',
    faceTitle: 'King David (King of Spades) 👑',
    faceFile: 'K_spades.png',
    suits: {
      hearts: 'Classic Casino Ruby Heart',
      diamonds: 'Faceted Casino Amber Diamond',
      spades: 'Victorian Engraved Black Spade',
      clubs: 'Traditional Trefoil Royal Club'
    },
    court: {
      king: 'King David & Suicide King Charlemagne in 1880s double-ended woodcut engraving',
      queen: 'Queen Pallas Athena & Queen Judith with royal scepter and heraldic rose',
      jack: 'Ogier the Dane & La Hire with halberd poleaxe and feather beret',
      ace: 'Monumental 1885 Vintage Engraved Ace of Spades with filigree cartouche',
      joker: '1885 High Joker astride vintage high-wheel penny-farthing bicycle'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#1e3a8a" stroke="#d4af37" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#60a5fa" stroke-width="2"/>
      <circle cx="70" cy="98" r="30" fill="#0f172a" stroke="#d4af37" stroke-width="1.5"/>
    `
  },
  // ---------------------------------------------------------------------------
  // 16. Royal Cats (Puss in Boots Animation Style 🐱)
  // ---------------------------------------------------------------------------
  {
    id: 'royal_cats',
    name: 'Royal Cats (Puss in Boots)',
    era: 'Fantasy / Animation',
    icon: '🐱',
    subtitle: 'DreamWorks Fairytale Animation & Swashbuckling Royal Felines',
    primaryColor: '#b45309',
    secondaryColor: '#1e293b',
    accentColor: '#fbbf24',
    textColor: '#f8fafc',
    faceTitle: 'Don Gato the Swashbuckler (Jack of Spades) 🗡️',
    faceFile: 'JS.png',
    suits: {
      hearts: 'Ruby Crimson Heart with Sleeping Curled Cat',
      diamonds: 'Gilded Topaz Diamond with Seated Regal Cat',
      spades: 'Midnight Shadow Spade with Stretching Feline Silhouette',
      clubs: 'Triple Clover Club with Peeking Feline Faces'
    },
    court: {
      king: 'King Leo the Brave & King Fluffington the Just in regal ermine robes',
      queen: 'Queen Kitty Softpaws & Queen Pallas the Shadow with jeweled masks and tiaras',
      jack: 'Don Gato the Swashbuckler & Sir Puss the Daring with feathered cavalier hats and rapiers',
      ace: 'Custom Feline Silhouette Aces: Sleeping Cat Heart, Stretching Cat Spade, Peeking Cats Club, Seated Cat Diamond',
      joker: 'Calico Jester Cat with jingling bells & Cheshire Trickster'
    },
    cardBackSVG: `
      <rect width="140" height="196" rx="10" fill="#881337" stroke="#fbbf24" stroke-width="3"/>
      <rect x="7" y="7" width="126" height="182" rx="7" fill="none" stroke="#f43f5e" stroke-width="2"/>
      <circle cx="70" cy="98" r="30" fill="#4c0519" stroke="#fbbf24" stroke-width="1.5"/>
    `
  }
];
