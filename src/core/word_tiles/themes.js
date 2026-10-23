/**
 * Word Tiles: Sovereign Lexicon — Dynamic Theme Definitions
 * 
 * Supports luxury handcrafted board aesthetics, materials, tile textures,
 * multiplier palette colorways, and atmospheric rack styling.
 */

export const WORD_TILE_THEMES = [
  {
    id: 'victorian_christmas',
    name: 'Victorian Christmas & Mahogany',
    subtitle: 'Antique brass corners, carved mahogany wood board, warm holiday ivory & gold tiles',
    thumbnail: '/assets/word_tiles/themes/victorian_christmas/board_bg.png',
    boardBg: '/assets/word_tiles/themes/victorian_christmas/board_bg.png',
    cssVars: {
      '--wt-board-bg-image': "url('/assets/word_tiles/themes/victorian_christmas/board_bg.png')",
      '--wt-board-border': '2px solid rgba(212, 175, 55, 0.55)',
      '--wt-board-shadow': '0 16px 36px rgba(0, 0, 0, 0.7), 0 0 24px rgba(212, 175, 55, 0.25)',
      '--wt-grid-bg': '#1f130b',
      '--wt-cell-bg': 'rgba(48, 28, 18, 0.78)',
      '--wt-cell-hover': 'rgba(75, 45, 28, 0.92)',
      '--wt-cell-dragover': 'rgba(212, 175, 55, 0.45)',
      '--wt-3w-bg': '#7f1d1d',
      '--wt-3w-color': '#ffcccc',
      '--wt-2w-bg': '#991b1b',
      '--wt-2w-color': '#ffebee',
      '--wt-3l-bg': '#14532d',
      '--wt-3l-color': '#dcfce7',
      '--wt-2l-bg': '#166534',
      '--wt-2l-color': '#e8f5e9',
      '--wt-center-bg': '#b45309',
      '--wt-center-color': '#fff9db',
      '--wt-center-shadow': 'inset 0 0 10px rgba(255, 215, 0, 0.6)',
      '--wt-tile-bg': 'linear-gradient(145deg, #fffdf8 0%, #f7ecd7 50%, #eadcc0 100%)',
      '--wt-tile-border': '1px solid rgba(139, 94, 60, 0.35)',
      '--wt-tile-color': '#2c1808',
      '--wt-tile-score-color': '#b45309',
      '--wt-tile-shadow': '0 3px 6px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
      '--wt-tile-blank-color': '#b45309',
      '--wt-rack-bg': 'linear-gradient(180deg, #442416 0%, #25120a 100%)',
      '--wt-rack-border': '2px solid #5a3c2e',
      '--wt-rack-slot-bg': 'rgba(0, 0, 0, 0.45)',
      '--wt-preview-sparkle': '#fbbf24'
    }
  },
  {
    id: 'classic_maple',
    name: 'Classic Scrabble Artisan Maple',
    subtitle: 'Warm Nordic wood grain, polished ivory tiles, classic sapphire & burgundy multipliers',
    thumbnail: '/assets/word_tiles/word_tiles_board_bg.png',
    boardBg: '/assets/word_tiles/word_tiles_board_bg.png',
    cssVars: {
      '--wt-board-bg-image': "url('/assets/word_tiles/word_tiles_board_bg.png')",
      '--wt-board-border': '2px solid rgba(212, 175, 55, 0.35)',
      '--wt-board-shadow': '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(212, 175, 55, 0.15)',
      '--wt-grid-bg': '#0f1813',
      '--wt-cell-bg': 'rgba(30, 48, 38, 0.7)',
      '--wt-cell-hover': 'rgba(45, 72, 57, 0.85)',
      '--wt-cell-dragover': 'rgba(212, 175, 55, 0.35)',
      '--wt-3w-bg': '#8b0000',
      '--wt-3w-color': '#ffcccc',
      '--wt-2w-bg': '#b71c1c',
      '--wt-2w-color': '#ffebee',
      '--wt-3l-bg': '#0d47a1',
      '--wt-3l-color': '#e3f2fd',
      '--wt-2l-bg': '#006064',
      '--wt-2l-color': '#e0f7fa',
      '--wt-center-bg': '#997819',
      '--wt-center-color': '#fff9db',
      '--wt-center-shadow': 'inset 0 0 8px rgba(255, 235, 59, 0.4)',
      '--wt-tile-bg': 'linear-gradient(145deg, #fefcf6 0%, #ede5ce 100%)',
      '--wt-tile-border': '1px solid rgba(0, 0, 0, 0.1)',
      '--wt-tile-color': '#2b180d',
      '--wt-tile-score-color': '#5c3a21',
      '--wt-tile-shadow': '0 3px 6px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.8), inset 0 -1px 2px rgba(0, 0, 0, 0.15)',
      '--wt-tile-blank-color': '#b45309',
      '--wt-rack-bg': 'linear-gradient(180deg, #3d271d 0%, #22150f 100%)',
      '--wt-rack-border': '2px solid #5a3c2e',
      '--wt-rack-slot-bg': 'rgba(0, 0, 0, 0.35)',
      '--wt-preview-sparkle': '#d4af37'
    }
  },
  {
    id: 'royal_sovereign',
    name: 'Royal Sovereign Marble & Gold',
    subtitle: 'Polished Carrara marble slab, gilded 24k filigree, sapphire & amethyst multipliers',
    thumbnail: '/assets/word_tiles/themes/royal_sovereign/board_bg.png',
    boardBg: '/assets/word_tiles/themes/royal_sovereign/board_bg.png',
    cssVars: {
      '--wt-board-bg-image': "url('/assets/word_tiles/themes/royal_sovereign/board_bg.png')",
      '--wt-board-border': '2px solid #d4af37',
      '--wt-board-shadow': '0 16px 36px rgba(0, 0, 0, 0.8), 0 0 28px rgba(212, 175, 55, 0.3)',
      '--wt-grid-bg': '#0f172a',
      '--wt-cell-bg': 'rgba(30, 41, 59, 0.8)',
      '--wt-cell-hover': 'rgba(51, 65, 85, 0.95)',
      '--wt-cell-dragover': 'rgba(212, 175, 55, 0.5)',
      '--wt-3w-bg': '#581c87',
      '--wt-3w-color': '#f3e8ff',
      '--wt-2w-bg': '#7e22ce',
      '--wt-2w-color': '#faf5ff',
      '--wt-3l-bg': '#1e3a8a',
      '--wt-3l-color': '#eff6ff',
      '--wt-2l-bg': '#0284c7',
      '--wt-2l-color': '#f0f9ff',
      '--wt-center-bg': '#ca8a04',
      '--wt-center-color': '#fffbeb',
      '--wt-center-shadow': 'inset 0 0 10px rgba(250, 204, 21, 0.6)',
      '--wt-tile-bg': 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
      '--wt-tile-border': '1px solid rgba(212, 175, 55, 0.6)',
      '--wt-tile-color': '#0f172a',
      '--wt-tile-score-color': '#ca8a04',
      '--wt-tile-shadow': '0 3px 6px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 1), 0 0 6px rgba(212, 175, 55, 0.2)',
      '--wt-tile-blank-color': '#ca8a04',
      '--wt-rack-bg': 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      '--wt-rack-border': '2px solid #d4af37',
      '--wt-rack-slot-bg': 'rgba(0, 0, 0, 0.45)',
      '--wt-preview-sparkle': '#facc15'
    }
  }
];

export class WordTileThemeManager {
  static STORAGE_KEY = 'solitaire_word_tiles_theme';

  static getActiveThemeId() {
    return localStorage.getItem(this.STORAGE_KEY) || 'victorian_christmas';
  }

  static getTheme(themeId) {
    return WORD_TILE_THEMES.find(t => t.id === themeId) || WORD_TILE_THEMES[0];
  }

  static applyTheme(themeId) {
    const theme = this.getTheme(themeId);
    if (!theme) return;

    localStorage.setItem(this.STORAGE_KEY, theme.id);

    // Apply CSS variables to root / container
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(theme.cssVars)) {
      root.style.setProperty(prop, val);
    }

    console.log(`[WordTileThemeManager] ✅ Applied theme: ${theme.name}`);
    return theme;
  }
}
