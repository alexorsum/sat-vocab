/**
 * Turns FSRS memory states into due dates for cards.
 *
 * Rules (see docs/RESEARCH.md, section 3):
 *  - A newly learned word gets a card with stability 0 that is due right away.
 *  - The first rating sets the starting stability and difficulty.
 *  - "Again" brings the card back in about 10 minutes, in the same session.
 *  - Any other rating schedules the card a whole number of days ahead, so
 *    that the predicted chance of recall equals the desired retention.
 *  - No random "fuzz" is added, which keeps the schedule easy to test.
 */
import type { Card, Rating, ReviewLog, WordStatus } from '../types';
import { initState, nextInterval, nextState, retrievability } from './fsrs';
import { addDays, dayDiff, endOfDay, startOfDay } from './dates';

export const AGAIN_DELAY_MS = 10 * 60 * 1000;
/** A word counts as mastered once its memory is predicted to last three weeks. */
export const MASTERED_STABILITY = 21;

export function newCard(id: string, now: number, sentence = ''): Card {
  return {
    id,
    stability: 0,
    difficulty: 0,
    due: now,
    lastReview: null,
    reps: 0,
    lapses: 0,
    introduced: now,
    sentence,
  };
}

export interface RateResult {
  card: Card;
  log: ReviewLog;
  /** Days until the next review; 0 means "again in about 10 minutes". */
  intervalDays: number;
}

export function rateCard(card: Card, rating: Rating, now: number, desiredRetention: number): RateResult {
  const first = card.stability === 0 || card.lastReview === null;
  const elapsedDays = first ? 0 : Math.max(0, dayDiff(card.lastReview as number, now));
  const state = first
    ? initState(rating)
    : nextState({ stability: card.stability, difficulty: card.difficulty }, elapsedDays, rating);
  const intervalDays = rating === 1 ? 0 : nextInterval(state.stability, desiredRetention);
  const due = rating === 1 ? now + AGAIN_DELAY_MS : addDays(startOfDay(now), intervalDays);
  return {
    card: {
      ...card,
      stability: state.stability,
      difficulty: state.difficulty,
      due,
      lastReview: now,
      reps: card.reps + 1,
      lapses: card.lapses + (rating === 1 && !first ? 1 : 0),
    },
    log: { wordId: card.id, ts: now, rating, elapsedDays, first },
    intervalDays,
  };
}

/** The interval each button would give, for the labels under the rating buttons. */
export function previewIntervals(card: Card, now: number, desiredRetention: number): Record<Rating, number> {
  return {
    1: 0,
    2: rateCard(card, 2, now, desiredRetention).intervalDays,
    3: rateCard(card, 3, now, desiredRetention).intervalDays,
    4: rateCard(card, 4, now, desiredRetention).intervalDays,
  };
}

/** Due at some point today (includes cards waiting out the 10 minute "Again" delay). */
export function isDueToday(card: Card, now: number): boolean {
  return card.due <= endOfDay(now);
}

export function dueCards(cards: Iterable<Card>, now: number): Card[] {
  const out: Card[] = [];
  for (const c of cards) if (isDueToday(c, now)) out.push(c);
  return out.sort((a, b) => a.due - b.due || a.id.localeCompare(b.id));
}

export function cardStatus(card: Card | undefined): WordStatus {
  if (!card) return 'new';
  return card.stability >= MASTERED_STABILITY ? 'mastered' : 'learning';
}

/** Predicted chance of recalling the card right now (null before the first review). */
export function currentRecall(card: Card, now: number): number | null {
  if (card.stability === 0 || card.lastReview === null) return null;
  return retrievability(Math.max(0, dayDiff(card.lastReview, now)), card.stability);
}

/** Number of cards coming due on each of the next `days` days (index 0 = today, including overdue). */
export function forecast(cards: Iterable<Card>, now: number, days: number): number[] {
  const out = new Array<number>(days).fill(0);
  for (const c of cards) {
    const offset = Math.max(0, dayDiff(now, c.due));
    if (offset < days) out[offset] += 1;
  }
  return out;
}

/**
 * Share of real reviews (not first looks, not same-day repeats) where the word
 * was remembered. Returns null when there are no such reviews yet.
 */
export function retentionRate(logs: ReviewLog[], sinceTs = 0): { rate: number; count: number } | null {
  let total = 0;
  let passed = 0;
  for (const l of logs) {
    if (l.first || l.elapsedDays < 1 || l.ts < sinceTs) continue;
    total += 1;
    if (l.rating > 1) passed += 1;
  }
  return total === 0 ? null : { rate: passed / total, count: total };
}
