# Poker Games - Custom Deck Rendering Fix

## Issue Diagnosis

The poker games (Blackjack, Video Poker, Texas Hold'em) are already using the DeckRenderer system which should display custom deck cards. However, users may experience issues where custom decks don't appear in poker games.

## System Architecture (Already Correct)

### Card Rendering Chain:
```
1. Poker Game → PokerCardComponent.renderCard()
2. PokerCardComponent → DeckRenderer.renderCardFaceSVG(card)
3. DeckRenderer → ModManager.getCustomCardFace(card)
4. ModManager → Returns custom image URL or null
5. If custom URL exists → Returns <img> tag
6. If no custom URL → Returns SVG fallback
```

### Files Involved:
- `src/ui/components/poker_card_display.js` - PokerCardComponent (✅ Uses DeckRenderer)
- `src/art/deck_renderer.js` - DeckRenderer (✅ Checks ModManager)
- `src/core/mod_manager.js` - ModManager (✅ Loads custom decks)
- `src/ui/app.js` - Main app (✅ Sets ModManager on DeckRenderer)

## Potential Issues

### 1. **Browser Image Caching**
Custom deck images may be cached by browser, preventing new images from loading.

**Fix:** Force cache-busting when deck changes
```javascript
// In mod_manager.js setDeckTheme()
if (this.app && this.app.render) {
  // Clear any cached card images
  const timestamp = Date.now();
  this.deckCacheBuster = timestamp;
  this.app.render();
}

// In getCustomCardFace(), append cache buster
return `/decks/${this.activeDeckTheme}/${r}_${s}.png?v=${this.deckCacheBuster || Date.now()}`;
```

### 2. **Timing Issue - Deck Loads After Render**
ModManager.loadAvailableMods() is async, poker games may render before it completes.

**Fix:** Ensure poker games re-render after mods loaded
```javascript
// In app.js constructor
this.modManager.loadAvailableMods().then(() => {
  this.modManager.applyActiveBackground();
  this.modManager.applyActiveChips();

  // Force re-render if currently in a poker game
  if (this.currentGame && this.gameType.includes('poker') ||
      this.gameType === 'blackjack') {
    this.render();
  }
});
```

### 3. **Path Generation Mismatch**
Custom deck paths use lowercase suit names, but Card objects might have uppercase.

**Fix:** Normalize to lowercase in getCustomCardFace()
```javascript
// Already done on line 164:
s = card.suitName.toLowerCase();
```

### 4. **Missing Images Return 404**
If custom deck images don't exist, broken image icons appear.

**Fix:** Add image loading error handling
```javascript
// In DeckRenderer.renderCardFaceSVG()
if (customFaceUrl) {
  return `<img src="${customFaceUrl}"
               class="solitaire-card-face-svg custom-mod-card-face"
               alt="${card.fullName}"
               onerror="this.style.display='none'; this.parentElement.innerHTML=DeckRenderer._getFallbackSVG(${card.rank}, ${card.suit});"
               style="width:100%;height:100%;object-fit:cover;border-radius:7px;display:block;">`;
}
```

## Quick Diagnostic Test

### In Browser Console:
```javascript
// 1. Check if ModManager is set
console.log('ModManager:', window.app?.modManager);
console.log('Active Deck:', window.app?.modManager?.activeDeckTheme);

// 2. Check if DeckRenderer has access
console.log('DeckRenderer ModMgr:', DeckRenderer._activeModManager);

// 3. Test card face URL generation
const testCard = { rank: 12, suit: 2, rankName: 'K', suitName: 'hearts' };
console.log('Custom Face URL:', window.app?.modManager?.getCustomCardFace(testCard));

// 4. Force re-render
window.app?.render();
```

### Expected Output:
```
ModManager: ModManager {activeDeckTheme: "victorian_christmas", ...}
Active Deck: "victorian_christmas"
DeckRenderer ModMgr: ModManager {activeDeckTheme: "victorian_christmas", ...}
Custom Face URL: "/decks/victorian_christmas/K_hearts.png"
```

## Manual Fix Steps

If poker games still don't show custom cards:

### Step 1: Verify Deck Files Exist
```
D:\solitaire\decks\[your_deck_name]\
├── A_clubs.png
├── A_diamonds.png
├── A_hearts.png
├── A_spades.png
├── 2_clubs.png
├── ...
├── K_hearts.png
├── Q_spades.png
├── joker_1.png
└── card_back.png
```

### Step 2: Check Network Tab
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Start a poker game
4. Look for requests to `/decks/[name]/[card].png`
5. If 404 errors → images missing
6. If 200 OK → images loading correctly

### Step 3: Clear Browser Cache
```javascript
// In console:
localStorage.removeItem('solitaire_mod_deck_theme');
location.reload();
```

Then re-select the deck from settings.

## Recommended Code Fix

### Add Cache-Busting to ModManager

**File:** `src/core/mod_manager.js`

```javascript
// Add to constructor
this.deckCacheBuster = Date.now();

// Modify setDeckTheme
setDeckTheme(themeId) {
  this.activeDeckTheme = themeId;
  this.deckCacheBuster = Date.now(); // Force new image loads

  if (themeId) {
    localStorage.setItem('solitaire_mod_deck_theme', themeId);
    this.activeCardBack = `/decks/${themeId}/card_back.png`;
    this.activeBackground = `/mods/backgrounds/${themeId}_felt.svg`;
    localStorage.setItem('solitaire_mod_card_back', this.activeCardBack);
    localStorage.setItem('solitaire_mod_background', this.activeBackground);
    this.applyActiveBackground();
  } else {
    localStorage.removeItem('solitaire_mod_deck_theme');
    localStorage.removeItem('solitaire_mod_card_back');
    localStorage.removeItem('solitaire_mod_background');
    this.activeCardBack = null;
    this.activeBackground = null;
    this.applyActiveBackground();
  }

  if (this.app) {
    this.app.render();
    if (typeof this.app._syncDeckSelectorDropdown === 'function') {
      this.app._syncDeckSelectorDropdown();
    }
  }
}

// Modify getCustomCardFace to use cache buster
getCustomCardFace(card) {
  if (!card) return null;

  if (this.activeDeckTheme && this.activeDeckTheme !== 'default') {
    // ... existing rank/suit parsing ...

    const cacheBuster = this.deckCacheBuster ? `?v=${this.deckCacheBuster}` : '';
    return `/decks/${this.activeDeckTheme}/${r}_${s}.png${cacheBuster}`;
  }

  // ... rest of method ...
}
```

## Testing After Fix

### Test Procedure:
1. Open Solitaire app
2. Go to Settings → Deck Studio
3. Select a custom deck (e.g., "Victorian Christmas")
4. Play Klondike → Should see custom cards ✅
5. Switch to Blackjack → Should see same custom cards ✅
6. Switch to Video Poker → Should see same custom cards ✅
7. Switch to Texas Hold'em → Should see same custom cards ✅

### Success Criteria:
- All poker games show the selected custom deck
- Changing deck in settings immediately updates all games
- No broken image icons or fallback SVG when custom deck selected

## Summary

The poker games ARE using the DeckRenderer system correctly. Any issues are likely:
1. **Browser caching** - Solved by cache-busting timestamps
2. **Timing** - Solved by re-rendering after mods load
3. **Missing files** - User needs to verify deck images exist
4. **Path issues** - Already handled with lowercase normalization

The system is architecturally sound. Any fixes needed are minor enhancements for robustness.
