import { describe, expect, it } from 'vitest';
import { AGAIN_DELAY_MS, MASTERED_STABILITY, cardStatus, currentRecall, dueCards, forecast, isDueToday, newCard, previewIntervals, rateCard, retentionRate } from '../../src/lib/scheduler';
import { addDays, computeStreak, dayDiff, dayKey, formatInterval, startOfDay } from '../../src/lib/dates';
import type { Card, Rating, ReviewLog } from '../../src/types';

const NOW = new Date(2026, 10, 11, 15, 30).getTime();

describe('card scheduling', () => {
  it('a newly learned word is due right away and unreviewed', () => {
    const c = newCard('plausible', NOW, 'My excuse was plausible.');
    expect(c.due).toBe(NOW);
    expect(c.stability).toBe(0);
    expect(c.reps).toBe(0);
    expect(isDueToday(c, NOW)).toBe(true);
    expect(cardStatus(c)).toBe('learning');
    expect(cardStatus(undefined)).toBe('new');
    expect(currentRecall(c, NOW)).toBeNull();
  });

  it('first ratings give the expected first intervals', () => {
    const c = newCard('a', NOW);
    expect(rateCard(c, 2, NOW, 0.9).intervalDays).toBe(1);
    expect(rateCard(c, 3, NOW, 0.9).intervalDays).toBe(2);
    expect(rateCard(c, 4, NOW, 0.9).intervalDays).toBe(8);
    expect(previewIntervals(c, NOW, 0.9)).toEqual({ 1: 0, 2: 1, 3: 2, 4: 8 });
  });

  it('"Again" brings the card back in ten minutes, the same day', () => {
    const { card, log, intervalDays } = rateCard(newCard('a', NOW), 1, NOW, 0.9);
    expect(intervalDays).toBe(0);
    expect(card.due).toBe(NOW + AGAIN_DELAY_MS);
    expect(isDueToday(card, NOW)).toBe(true);
    expect(card.lapses).toBe(0); // forgetting a brand-new word is not a lapse
    expect(log.first).toBe(true);
  });

  it('other ratings schedule on a whole later day, at midnight', () => {
    const { card } = rateCard(newCard('a', NOW), 3, NOW, 0.9);
    expect(card.due).toBe(addDays(startOfDay(NOW), 2));
    expect(isDueToday(card, NOW)).toBe(false);
    expect(isDueToday(card, addDays(NOW, 1))).toBe(false);
    expect(isDueToday(card, addDays(NOW, 2))).toBe(true);
    expect(card.lastReview).toBe(NOW);
    expect(card.reps).toBe(1);
  });

  it('intervals grow with successful reviews and reset after a lapse', () => {
    let card: Card = newCard('a', NOW);
    let t = NOW;
    const intervals: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = rateCard(card, 3, t, 0.9);
      intervals.push(r.intervalDays);
      card = r.card;
      t = card.due + 9 * 3600_000; // review on the due day, mid-morning
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    expect(card.stability).toBeGreaterThan(MASTERED_STABILITY);
    expect(cardStatus(card)).toBe('mastered');

    const lapse = rateCard(card, 1, t, 0.9);
    expect(lapse.card.lapses).toBe(1);
    expect(lapse.card.stability).toBeLessThan(card.stability);
    expect(lapse.log.first).toBe(false);
    expect(lapse.log.elapsedDays).toBeGreaterThan(0);
    // Relearning the same day uses the short-term rule and then schedules days ahead again.
    const relearn = rateCard(lapse.card, 3, t + AGAIN_DELAY_MS, 0.9);
    expect(relearn.log.elapsedDays).toBe(0);
    expect(relearn.intervalDays).toBeGreaterThanOrEqual(1);
    expect(relearn.intervalDays).toBeLessThan(intervals[intervals.length - 1]);
  });

  it('a higher retention target means shorter intervals', () => {
    let card: Card = newCard('a', NOW);
    card = rateCard(card, 3, NOW, 0.9).card;
    const later = card.due + 3600_000;
    expect(rateCard(card, 3, later, 0.93).intervalDays).toBeLessThan(rateCard(card, 3, later, 0.85).intervalDays);
  });

  it('predicted recall is 100% right after a review and about the target on the due date', () => {
    const card = rateCard(rateCard(newCard('a', NOW), 3, NOW, 0.9).card, 3, addDays(NOW, 2), 0.9).card;
    expect(currentRecall(card, card.lastReview as number)).toBe(1);
    const atDue = currentRecall(card, card.due) as number;
    expect(atDue).toBeGreaterThan(0.87);
    expect(atDue).toBeLessThan(0.93);
  });

  it('lists due cards oldest first and forecasts by day', () => {
    const mk = (id: string, dueInDays: number): Card => ({ ...newCard(id, NOW), stability: 5, lastReview: NOW, due: addDays(startOfDay(NOW), dueInDays) });
    const cards = [mk('today', 0), mk('overdue', -3), mk('tomorrow', 1), mk('nextweek', 7), mk('far', 40)];
    expect(dueCards(cards, NOW).map((c) => c.id)).toEqual(['overdue', 'today']);
    const f = forecast(cards, NOW, 14);
    expect(f).toHaveLength(14);
    expect(f[0]).toBe(2); // overdue counts as today
    expect(f[1]).toBe(1);
    expect(f[7]).toBe(1);
    expect(f.reduce((a, b) => a + b, 0)).toBe(4); // the far card is beyond the window
  });

  it('retention counts only spaced reviews', () => {
    const log = (rating: Rating, elapsedDays: number, first = false, ts = NOW): ReviewLog => ({ wordId: 'a', ts, rating, elapsedDays, first });
    expect(retentionRate([])).toBeNull();
    expect(retentionRate([log(3, 0, true), log(1, 0)])).toBeNull();
    const r = retentionRate([log(3, 0, true), log(3, 2), log(4, 5), log(2, 9), log(1, 12), log(1, 0)]);
    expect(r).toEqual({ rate: 0.75, count: 4 });
    expect(retentionRate([log(3, 2, false, NOW - 1000), log(1, 2, false, NOW)], NOW)).toEqual({ rate: 0, count: 1 });
  });
});

describe('dates', () => {
  it('counts calendar days, not 24 hour blocks', () => {
    const lateNight = new Date(2026, 10, 11, 23, 50).getTime();
    const earlyMorning = new Date(2026, 10, 12, 0, 10).getTime();
    expect(dayDiff(lateNight, earlyMorning)).toBe(1);
    expect(dayDiff(NOW, NOW + 60_000)).toBe(0);
    expect(dayKey(NOW)).toBe('2026-11-11');
  });

  it('adds days safely across a daylight saving change', () => {
    const beforeChange = new Date(2026, 2, 7, 12).getTime(); // US clocks change on March 8, 2026
    const after = addDays(startOfDay(beforeChange), 2);
    expect(new Date(after).getHours()).toBe(0);
    expect(dayDiff(beforeChange, after)).toBe(2);
  });

  it('computes current and longest streaks', () => {
    const key = (offset: number) => dayKey(addDays(NOW, offset));
    expect(computeStreak([], NOW)).toEqual({ current: 0, longest: 0 });
    expect(computeStreak([key(0), key(-1), key(-2)], NOW)).toEqual({ current: 3, longest: 3 });
    // Not studied yet today: yesterday's streak is still alive.
    expect(computeStreak([key(-1), key(-2)], NOW)).toEqual({ current: 2, longest: 2 });
    // A gap ends the streak.
    expect(computeStreak([key(-2), key(-3), key(-4), key(-5)], NOW)).toEqual({ current: 0, longest: 4 });
    expect(computeStreak([key(0), key(-2), key(-3), key(-4)], NOW)).toEqual({ current: 1, longest: 3 });
  });

  it('formats intervals for the rating buttons', () => {
    expect(formatInterval(0)).toBe('10 min');
    expect(formatInterval(1)).toBe('1 day');
    expect(formatInterval(8)).toBe('8 days');
    expect(formatInterval(45)).toBe('1.5 mo');
    expect(formatInterval(730)).toBe('2 yr');
  });
});
