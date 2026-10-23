/**
 * Solitaire Sovereign - Canonical Card Data Model
 * 
 * Mathematical Representation:
 * - Card ID: integer 0..51 (or higher with multiple decks)
 * - Suit: Math.floor((id % 52) / 13) -> 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades
 * - Rank: (id % 52) % 13 -> 0=Ace, 1=2, ..., 9=10, 10=Jack, 11=Queen, 12=King
 * - Color: (suit === 1 || suit === 2) ? 'red' : 'black'
 */

export const SUITS = Object.freeze({
  CLUBS: 0,
  DIAMONDS: 1,
  HEARTS: 2,
  SPADES: 3
});

export const SUIT_NAMES = ['clubs', 'diamonds', 'hearts', 'spades'];
export const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'];
export const RANK_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RANK_FULL_NAMES = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'
];
export const RANK_PLURAL_NAMES = [
  'Aces', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings'
];

export class Card {
  /**
   * @param {number} id Unique integer ID [0..51] or multi-deck index (52 = Joker)
   * @param {boolean} faceUp Initial visibility
   */
  constructor(id, faceUp = false) {
    this.id = id;
    this.deckIndex = Math.floor(id / 52);
    const standardId = id % 52;
    this.suit = Math.floor(standardId / 13);
    this.rank = standardId % 13;
    this.isRed = (this.suit === SUITS.DIAMONDS || this.suit === SUITS.HEARTS);
    this.isBlack = !this.isRed;
    this.faceUp = faceUp;
    this._isJoker = false;

    // Special handling for Wild Joker (card ID 52 or rank 99)
    if (id === 52) {
      this._isJoker = true;
      this.suit = 99;
      this.rank = 99;
      this.isRed = false;
      this.isBlack = false;
    }
  }

  get isJoker() {
    return this._isJoker === true || this.id === 52 || this.rank === 99;
  }

  set isJoker(val) {
    this._isJoker = !!val;
    if (this._isJoker) {
      this.rank = 99;
      this.suit = 99;
      this.isRed = false;
      this.isBlack = false;
    }
  }

  get rankName() {
    if (this.isJoker) return 'JOKER';
    return RANK_NAMES[this.rank];
  }

  get suitName() {
    if (this.isJoker) return 'wild';
    return SUIT_NAMES[this.suit];
  }

  get suitSymbol() {
    if (this.isJoker) return '★';
    return SUIT_SYMBOLS[this.suit];
  }

  get fullName() {
    if (this.isJoker) return 'Wild Joker';
    return `${RANK_FULL_NAMES[this.rank]} of ${this.suitName.charAt(0).toUpperCase() + this.suitName.slice(1)}`;
  }

  get shortCode() {
    if (this.isJoker) return 'JK★';
    return `${this.rankName}${this.suitSymbol}`;
  }

  /**
   * Standard Klondike/FreeCell tableau alternating color stacking rule:
   * this card can be placed onto parentCard if parentCard is exactly 1 rank higher and opposite color.
   */
  canStackOnTableau(parentCard) {
    if (!parentCard) return this.rank === 12; // Only King can be placed on empty tableau in Klondike
    return (parentCard.rank === this.rank + 1) && (this.isRed !== parentCard.isRed);
  }

  /**
   * Standard Spider tableau stacking rule:
   * can stack on any card with rank + 1 (same or different suit; same suit is preferred for run building)
   */
  canStackOnSpider(parentCard) {
    if (!parentCard) return true; // Any card or sequence can be placed on an empty column in Spider
    return parentCard.rank === this.rank + 1;
  }

  /**
   * Foundation build rule:
   * Ace (0) onto empty foundation, otherwise same suit and rank + 1.
   */
  canBuildOnFoundation(topFoundationCard) {
    if (!topFoundationCard) return this.rank === 0; // Ace begins foundation
    return (topFoundationCard.suit === this.suit) && (this.rank === topFoundationCard.rank + 1);
  }

  clone() {
    const c = new Card(this.id, this.faceUp);
    if (this.isJoker) {
      c.isJoker = true;
      c.rank = this.rank;
      c.suit = this.suit;
    }
    return c;
  }

  static createStandardDeck(numDecks = 1) {
    const deck = [];
    for (let d = 0; d < numDecks; d++) {
      for (let i = 0; i < 52; i++) {
        deck.push(new Card(d * 52 + i, false));
      }
    }
    return deck;
  }
}
