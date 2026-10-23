# Fix: Poker Games Not Using Custom Decks

## Quick Diagnosis

Open your browser console (F12) while playing poker and run:

```javascript
// Check 1: Is ModManager set up?
console.log('ModManager:', window.app?.modManager);
console.log('Active Deck:', window.app?.modManager?.activeDeckTheme);
console.log('Cache Buster:', window.app?.modManager?.deckCacheBuster);

// Check 2: Can we generate URLs?
const testCard = { rank: 12, suit: 2, rankName: 'K', suitName: 'hearts' };
const url = window.app?.modManager?.getCustomCardFace(testCard);
console.log('Generated URL:', url);

// Check 3: Test if DeckRenderer sees ModManager
console.log('DeckRenderer has ModManager:', !!window.DeckRenderer?._activeModManager);

// Check 4: Try loading the image
if (url) {
  fetch(url).then(r => console.log('Image fetch:', r.status, r.statusText));
}
```

## Common Issues & Solutions

### Issue 1: Browser Cache (Most Common)

**Symptoms:**
- URL is generated correctly
- Files exist in `/decks/` folder
- But browser shows old cards

**Solution:**
1. Hard refresh: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
2. Or clear browser cache:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images
   - Firefox: Settings → Privacy → Clear Data → Cache

### Issue 2: Deck Not Selected

**Symptoms:**
- `activeDeckTheme` is `null` or `'default'`

**Solution:**
1. Go to Settings → Deck Studio
2. Select a deck from the dropdown
3. Click apply or it should auto-apply
4. Start a new poker game

### Issue 3: Files Missing or Wrong Names

**Symptoms:**
- Console shows 404 errors for card images
- `fetch()` test returns 404

**Solution:**
Check file naming in `/decks/your_deck_name/`:
- Must be: `K_hearts.png` (not `king_hearts.png` or `KH.png`)
- Format: `{RANK}_{suit}.png`
- Ranks: `A`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `J`, `Q`, `K`
- Suits: `clubs`, `diamonds`, `hearts`, `spades` (lowercase!)

### Issue 4: Web Server Not Running

**Symptoms:**
- `fetch()` fails completely
- Network errors in console

**Solution:**
Make sure the dev server is running:
```bash
cd D:\solitaire
node server.js
```
Then access via `http://localhost:8080` (or whatever port)

### Issue 5: ModManager Not Initialized

**Symptoms:**
- `window.app.modManager` is undefined
- Console error about ModManager

**Solution:**
This is a code issue. Verify in `src/ui/app.js` constructor:
```javascript
this.modManager = new ModManager(this);
DeckRenderer.setModManager(this.modManager);
```

## Manual Test Procedure

### Step 1: Verify Files Exist
```bash
ls D:\solitaire\decks\victorian_christmas\K_hearts.png
```
Should show the file. If not, your deck is incomplete.

### Step 2: Test in Klondike First
1. Open Klondike solitaire
2. Select custom deck in settings
3. Start new game
4. Do you see custom cards?
   - **YES** → Deck works, issue is specific to poker
   - **NO** → Deck not loading at all

### Step 3: Test Poker Rendering
1. Open Blackjack
2. Deal cards
3. Inspect a card element in DevTools:
   ```html
   <div class="solitaire-card face-up">
     <!-- Should contain <img src="/decks/..."> -->
     <!-- If it shows <svg>, deck not being used -->
   </div>
   ```

### Step 4: Use Debug Tool
1. Open `DEBUG_POKER_DECK.html` in browser
2. Run all 4 diagnostic steps
3. Look for failed tests (red ❌)

## Expected File Structure

```
D:\solitaire\decks\victorian_christmas\
├── A_clubs.png
├── A_diamonds.png
├── A_hearts.png
├── A_spades.png
├── 2_clubs.png
...
├── K_clubs.png
├── K_diamonds.png
├── K_hearts.png
├── K_spades.png
├── Q_clubs.png
├── Q_diamonds.png
├── Q_hearts.png
├── Q_spades.png
├── J_clubs.png
...
├── 10_clubs.png
...
├── joker_1.png
└── card_back.png
```

## Code Verification Checklist

Verify these files have been modified:

**1. `src/core/mod_manager.js`**
- Line 29: `this.deckCacheBuster = Date.now();`
- Line 148: `const cacheBuster = ...`
- Line 151: `return .../joker_1.png${cacheBuster}`
- Line 175: `return .../${r}_${s}.png${cacheBuster}`
- Line 206: `this.deckCacheBuster = Date.now();` in setDeckTheme
- Line 109: `this.deckCacheBuster = Date.now();` in setCardBack

**2. `src/art/deck_renderer.js`**
- Line 307: `const cacheBuster = ...`
- Line 311: `const customUrl = ... + cacheBuster`
- Line 316: `return .../card_back.png${cacheBuster}`

If any of these are missing, the fix wasn't fully applied.

## Nuclear Option: Force Fresh Start

If nothing works:

```javascript
// In browser console:
localStorage.clear();
location.reload(true);
```

Then:
1. Reselect your custom deck
2. Start new poker game
3. Should work now

## Still Not Working?

If custom decks work in Klondike but NOT in poker games, there may be a rendering path issue. Try this diagnostic:

```javascript
// In browser console while playing Blackjack:
const game = window.app.currentGame;
const card = game.dealerCards[0]; // Get first dealer card

console.log('Card object:', card);
console.log('Card.rank:', card.rank, typeof card.rank);
console.log('Card.suit:', card.suit, typeof card.suit);
console.log('Card.rankName:', card.rankName);
console.log('Card.suitName:', card.suitName);

// Try to get URL
const url = window.app.modManager.getCustomCardFace(card);
console.log('Generated URL:', url);

// Try to render
const html = window.DeckRenderer.renderCardFaceSVG(card);
console.log('Rendered HTML:', html);
```

Send me the output and I can diagnose further.

## Success Indicators

When working correctly, you should see in browser DevTools:

**Network Tab:**
```
Status  Method  URL
200     GET     /decks/victorian_christmas/K_hearts.png?v=1729182345678
200     GET     /decks/victorian_christmas/Q_spades.png?v=1729182345678
```

**Elements Tab:**
```html
<div class="solitaire-card face-up">
  <img src="/decks/victorian_christmas/K_hearts.png?v=1729182345678"
       class="solitaire-card-face-svg custom-mod-card-face">
</div>
```

**Console:**
```
Active Deck: "victorian_christmas"
Cache Buster: 1729182345678
Generated URL: "/decks/victorian_christmas/K_hearts.png?v=1729182345678"
Image fetch: 200 OK
```
