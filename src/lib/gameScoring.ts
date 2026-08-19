import { Card } from '../types';

export function getPoints(value?: string | null): number {
  if (!value) return 0;
  if (value === 'J') return -2;
  if (value === 'K') return 0;
  if (value === 'Q') return 10;
  if (value === 'A') return 1;
  const num = parseInt(value, 10);
  return isNaN(num) ? 10 : num;
}

export interface ScoreOptions {
  onlyFaceUp?: boolean;
}

const ROWS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
];

const COLS = [
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
];

/**
 * Calculates the score of a 9-card (3x3 grid) Golf hand.
 * Matches of 3-of-a-kind in rows or columns zero out those card points.
 */
export function calculateHandScore(cards: Partial<Card>[], options: ScoreOptions = {}): number {
  if (!cards || cards.length === 0) return 0;

  const onlyFaceUp = options.onlyFaceUp ?? false;
  const sortedHand = [...cards].sort((a, b) => (a.card_index ?? 0) - (b.card_index ?? 0));

  if (sortedHand.length < 9) {
    return sortedHand.reduce((total, c) => {
      if (!c || (onlyFaceUp && !c.is_face_up)) return total;
      return total + getPoints(c.value);
    }, 0);
  }

  const partOfSet = new Set<number>();

  const isCardCountable = (c?: Partial<Card>) => {
    if (!c || !c.value) return false;
    return !onlyFaceUp || Boolean(c.is_face_up);
  };

  // Check rows for 3 of a kind
  ROWS.forEach((indices) => {
    const c0 = sortedHand[indices[0]];
    const c1 = sortedHand[indices[1]];
    const c2 = sortedHand[indices[2]];
    if (
      isCardCountable(c0) &&
      isCardCountable(c1) &&
      isCardCountable(c2) &&
      c0?.value &&
      c0.value === c1?.value &&
      c1?.value === c2?.value
    ) {
      indices.forEach((i) => partOfSet.add(i));
    }
  });

  // Check columns for 3 of a kind
  COLS.forEach((indices) => {
    const c0 = sortedHand[indices[0]];
    const c1 = sortedHand[indices[1]];
    const c2 = sortedHand[indices[2]];
    if (
      isCardCountable(c0) &&
      isCardCountable(c1) &&
      isCardCountable(c2) &&
      c0?.value &&
      c0.value === c1?.value &&
      c1?.value === c2?.value
    ) {
      indices.forEach((i) => partOfSet.add(i));
    }
  });

  let total = 0;
  sortedHand.forEach((card, index) => {
    if (isCardCountable(card) && !partOfSet.has(index)) {
      total += getPoints(card.value);
    }
  });

  return total;
}

/**
 * Convenience helper to calculate score for a specific player from a card collection.
 */
export function calculatePlayerScore(cards: Partial<Card>[], playerId: string, options: ScoreOptions = { onlyFaceUp: true }): number {
  if (!cards) return 0;
  const playerCards = cards.filter((c) => c.player_id === playerId);
  return calculateHandScore(playerCards, options);
}
