/**
 * Solitaire Sovereign - Reusable Poker Card & Hand Display System
 * 
 * Modular Components:
 * 1. PokerCardComponent: High-contrast vector card rendering with fallback error handling,
 *    corner indices, suit colors, card lift, and winning hand glow.
 * 2. PlayerHandComponent: Prominent bottom-center active player hole card display with
 *    best-hand evaluation badges.
 * 3. CommunityCardsComponent: Centered 5-slot Flop/Turn/River layout with static placeholders
 *    preventing table layout shifts.
 * 4. OpponentSeatComponent: Opponent seats with avatars, chip stacks, action status tags,
 *    and showdown card-reveal states.
 */

import { DeckRenderer, CARD_BACK_THEMES } from '../../art/deck_renderer.js';
import { Card, SUIT_SYMBOLS, SUIT_NAMES, RANK_NAMES } from '../../core/card.js';

export class PokerCardComponent {
  /**
   * Renders a DOM element for a single card with full error resilience
   * @param {Object|null} card Card instance or null for placeholder
   * @param {Object} options Configuration options
   * @returns {HTMLElement}
   */
  static renderCard(card, options = {}) {
    const {
      isPlayerHole = false,
      isWinningCard = false,
      isFolded = false,
      cardBackTheme = CARD_BACK_THEMES.ROYAL_GUILLOCHE,
      customClass = '',
      placeholderLabel = '',
      animateDeal = false
    } = options;

    const el = document.createElement('div');
    el.className = `poker-card-display ${customClass}`;

    // Handle null/missing card as clean placeholder slot
    if (!card) {
      el.classList.add('card-placeholder-slot');
      el.innerHTML = `
        <div class="placeholder-frame">
          <span class="placeholder-watermark">${placeholderLabel || '⬚'}</span>
        </div>
      `;
      el.setAttribute('aria-label', placeholderLabel ? `Empty ${placeholderLabel} slot` : 'Empty card slot');
      return el;
    }

    // Defensive error handling for corrupted card data
    const rank = card.rank !== undefined ? card.rank : 0;
    const suit = card.suit !== undefined ? card.suit : 0;
    const isRed = (suit === 1 || suit === 2);
    const rankName = card.rankName || RANK_NAMES[rank] || '?';
    const suitSymbol = card.suitSymbol || SUIT_SYMBOLS[suit] || '';
    const suitName = card.suitName || SUIT_NAMES[suit] || 'unknown';
    const faceUp = card.faceUp !== false;

    el.dataset.cardId = card.id !== undefined ? card.id : `${rank}-${suit}`;
    el.dataset.rank = rankName;
    el.dataset.suit = suitName;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', faceUp ? `${card.fullName || `${rankName} of ${suitName}`}` : 'Face down card');

    const isWild = !!card.isJoker || !!options.isWild || (options.variation === 'deuces_wild' && card.rank === 1);

    // Visual State Classes
    el.classList.toggle('face-up', faceUp);
    el.classList.toggle('face-down', !faceUp);
    el.classList.toggle('card-suit-red', isRed && !card.isJoker);
    el.classList.toggle('card-suit-black', !isRed && !card.isJoker);
    el.classList.toggle('card-joker', !!card.isJoker);
    el.classList.toggle('is-wild-card', isWild);
    el.classList.toggle('player-hole-card', isPlayerHole);
    el.classList.toggle('winning-highlight', isWinningCard);
    el.classList.toggle('folded-card', isFolded);
    if (animateDeal) el.classList.add('card-flip-enter');

    if (!faceUp) {
      // Face-down card back
      el.innerHTML = DeckRenderer.getCardBackSVG(cardBackTheme);
    } else {
      // Crisp Vector Card Face
      el.innerHTML = DeckRenderer.renderCardFaceSVG(card);

      // Add prominent glowing Wild Card Pill
      if (isWild) {
        const wildTag = document.createElement('div');
        wildTag.className = 'wild-card-pill';
        wildTag.textContent = card.isJoker ? '★ WILD JOKER ★' : '★ WILD DEUCE ★';
        el.appendChild(wildTag);
      }
    }

    return el;
  }
}

export class PlayerHandComponent {
  /**
   * Renders the active player's hole cards prominently at bottom center
   * @param {HTMLElement} container Parent DOM element
   * @param {Array<Object>} holeCards Array of 2 Card objects
   * @param {Object} handEvaluation Best 5-card evaluation result
   * @param {Set<number>} winningCardIds Set of card IDs that made the winning hand
   */
  static render(container, holeCards = [], handEvaluation = null, winningCardIds = new Set(), isFolded = false) {
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'player-hand-wrapper';

    // Best-Hand Name Feedback Badge
    if (handEvaluation && !isFolded) {
      const badge = document.createElement('div');
      badge.className = 'player-best-hand-badge';
      badge.innerHTML = `
        <span class="hand-badge-sparkle">✦</span>
        <span class="hand-badge-text">${handEvaluation.name}</span>
      `;
      wrapper.appendChild(badge);
    } else if (isFolded) {
      const foldedBadge = document.createElement('div');
      foldedBadge.className = 'player-best-hand-badge folded-badge';
      foldedBadge.textContent = 'FOLDED';
      wrapper.appendChild(foldedBadge);
    }

    // 2 Hole Cards Row
    const cardsRow = document.createElement('div');
    cardsRow.className = 'player-hole-cards-row';

    if (holeCards.length === 0) {
      // Show two placeholder slots
      cardsRow.appendChild(PokerCardComponent.renderCard(null, { placeholderLabel: 'CARD 1' }));
      cardsRow.appendChild(PokerCardComponent.renderCard(null, { placeholderLabel: 'CARD 2' }));
    } else {
      holeCards.forEach(card => {
        const isWinning = winningCardIds.has(card.id);
        const cardEl = PokerCardComponent.renderCard(card, {
          isPlayerHole: true,
          isWinningCard: isWinning,
          isFolded
        });
        cardsRow.appendChild(cardEl);
      });
    }

    wrapper.appendChild(cardsRow);
    container.appendChild(wrapper);
  }
}

export class CommunityCardsComponent {
  /**
   * Renders the 5 community card slots (Flop 1, 2, 3, Turn, River)
   * @param {HTMLElement} container Parent DOM element
   * @param {Array<Object>} communityCards Array of 0 to 5 dealt community cards
   * @param {Set<number>} winningCardIds Set of card IDs contributing to winning hand
   */
  static render(container, communityCards = [], winningCardIds = new Set()) {
    if (!container) return;
    container.innerHTML = '';

    const labels = ['FLOP', 'FLOP', 'FLOP', 'TURN', 'RIVER'];
    const row = document.createElement('div');
    row.className = 'community-cards-row';

    for (let i = 0; i < 5; i++) {
      const card = communityCards[i] || null;
      const isWinning = card ? winningCardIds.has(card.id) : false;
      const cardEl = PokerCardComponent.renderCard(card, {
        isWinningCard: isWinning,
        placeholderLabel: labels[i]
      });
      row.appendChild(cardEl);
    }

    container.appendChild(row);
  }
}

export class OpponentSeatComponent {
  /**
   * Renders an opponent seat with avatar, chips, current bet, action status, and hole cards
   * @param {Object} opponent Player state object
   * @param {boolean} isShowdown Whether round is at showdown
   * @param {Set<number>} winningCardIds Set of winning card IDs
   * @param {string} cardBackTheme Card back design
   * @returns {HTMLElement}
   */
  static renderSeat(opponent, isShowdown = false, winningCardIds = new Set(), cardBackTheme = CARD_BACK_THEMES.ROYAL_GUILLOCHE) {
    const seatEl = document.createElement('div');
    seatEl.className = `opponent-seat-box ${opponent.folded ? 'folded' : ''}`;
    seatEl.id = `opponent-seat-${opponent.id}`;

    // Header info (Avatar + Name + Stack)
    const header = document.createElement('div');
    header.className = 'opponent-info-header';
    header.innerHTML = `
      <span class="opponent-avatar">${opponent.avatar || '👤'}</span>
      <div class="opponent-meta">
        <span class="opponent-name">${opponent.name}</span>
        <span class="opponent-chips">$${opponent.chips.toLocaleString()}</span>
      </div>
    `;
    seatEl.appendChild(header);

    // 2 Hole Cards
    const cardsRow = document.createElement('div');
    cardsRow.className = 'opponent-cards-row';

    if (opponent.holeCards && opponent.holeCards.length > 0) {
      opponent.holeCards.forEach(card => {
        // At showdown (if not folded), reveal opponent cards!
        const reveal = isShowdown && !opponent.folded;
        const displayCard = card.clone();
        displayCard.faceUp = reveal;

        const isWinning = isShowdown && winningCardIds.has(card.id);
        const cardEl = PokerCardComponent.renderCard(displayCard, {
          isWinningCard: isWinning,
          isFolded: opponent.folded,
          cardBackTheme
        });
        cardsRow.appendChild(cardEl);
      });
    } else {
      cardsRow.appendChild(PokerCardComponent.renderCard(null, { placeholderLabel: '·' }));
      cardsRow.appendChild(PokerCardComponent.renderCard(null, { placeholderLabel: '·' }));
    }
    seatEl.appendChild(cardsRow);

    // Action / Status Pill
    const actionPill = document.createElement('div');
    actionPill.className = 'opponent-action-pill';
    if (opponent.folded) {
      actionPill.classList.add('status-folded');
      actionPill.textContent = 'FOLD';
    } else if (opponent.lastAction) {
      actionPill.classList.add('status-active');
      actionPill.textContent = opponent.lastAction;
    } else if (opponent.currentBet > 0) {
      actionPill.classList.add('status-bet');
      actionPill.textContent = `BET $${opponent.currentBet}`;
    } else {
      actionPill.textContent = 'WAITING';
    }
    seatEl.appendChild(actionPill);

    // Showdown Hand Name
    if (isShowdown && !opponent.folded && opponent.bestHand) {
      const handBadge = document.createElement('div');
      handBadge.className = 'opponent-hand-badge';
      handBadge.textContent = opponent.bestHand.name;
      seatEl.appendChild(handBadge);
    }

    return seatEl;
  }

  /**
   * Renders a list of opponent seats into a container
   * @param {HTMLElement} container
   * @param {Array<Object>} opponents
   * @param {boolean} isShowdown
   * @param {Set<number>} winningCardIds
   * @param {string} cardBackTheme
   */
  static renderRow(container, opponents = [], isShowdown = false, winningCardIds = new Set(), cardBackTheme = CARD_BACK_THEMES.ROYAL_GUILLOCHE) {
    if (!container) return;
    container.innerHTML = '';
    opponents.forEach(opponent => {
      container.appendChild(this.renderSeat(opponent, isShowdown, winningCardIds, cardBackTheme));
    });
  }
}
