# PeerRacer Arcade

A browser game collection with original art and rules: Klondike, FreeCell, Spider, Pyramid, TriPeaks,
Blackjack, Texas Hold'em, Video Poker, plus the PeerRacer casual set (Word Tiles, Tank Minefield,
Admiral's Gambit, Jade Pavilion mahjong, Ninefold sudoku, Keystone Drop, Bone Yard dominoes and
Jimothy's Trash Conveyor Frenzy). Race a friend on the same deal over a room code or a direct connection.

## Run it

    npm install
    npm start          # then open http://localhost:3000

## Test it

    npm test           # rules tests for every game, the race system and the Teacher hints
    node tests/smoke_browser.mjs   # opens every game in a headless browser (needs playwright)

GitHub runs both automatically on every push (see `.github/workflows/test.yml`).

## Not in this repository

Only the two classic card decks (English Pattern and Classic Casino Standard) are included. The other
deck themes and local mods are left out to keep the repository small. Drop extra decks into `decks/` and
mods into `mods/` to add them.
