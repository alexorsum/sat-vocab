import { describe, expect, it } from 'vitest';
// The reference implementation, used only as a test oracle.
import { FSRS6Model, FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6';
import { DEFAULT_WEIGHTS, initState, nextInterval, nextState, retrievability, type MemoryState } from '../../src/lib/fsrs';
import { mulberry32 } from '../../src/lib/rng';
import type { Rating } from '../../src/types';

const reference = FSRS6Model.create({
  config: { weights: [...FSRS6_DEFAULT_WEIGHTS], enableShortTerm: true, numRelearningSteps: 0 },
});

describe('FSRS-6 memory model', () => {
  it('uses the published default parameters', () => {
    expect([...DEFAULT_WEIGHTS]).toEqual([...FSRS6_DEFAULT_WEIGHTS]);
    expect(DEFAULT_WEIGHTS).toHaveLength(21);
  });

  it('matches the reference for every first rating', () => {
    for (const g of [1, 2, 3, 4] as Rating[]) {
      const ours = initState(g);
      const theirs = reference.step({ memoryState: null, rating: g, elapsedDays: 0 });
      expect(ours.stability).toBeCloseTo(theirs.stability, 8);
      expect(ours.difficulty).toBeCloseTo(theirs.difficulty, 8);
    }
  });

  it('gives the known starting intervals at 90% retention', () => {
    expect(nextInterval(initState(2).stability, 0.9)).toBe(1);
    expect(nextInterval(initState(3).stability, 0.9)).toBe(2);
    expect(nextInterval(initState(4).stability, 0.9)).toBe(8);
  });

  it('matches the reference over 300 random review histories', () => {
    const rng = mulberry32(20261111);
    for (let run = 0; run < 300; run++) {
      const first = (Math.floor(rng() * 4) + 1) as Rating;
      let ours: MemoryState = initState(first);
      let theirs = reference.step({ memoryState: null, rating: first, elapsedDays: 0 });
      for (let step = 0; step < 25; step++) {
        const rating = (rng() < 0.15 ? 1 : Math.floor(rng() * 3) + 2) as Rating;
        // Mix same-day repeats, on-time reviews, and long gaps.
        const roll = rng();
        const elapsed = roll < 0.15 ? 0 : roll < 0.8 ? Math.max(1, Math.round(ours.stability * (0.5 + rng()))) : Math.floor(rng() * 400);
        ours = nextState(ours, elapsed, rating);
        theirs = reference.step({ memoryState: theirs, rating, elapsedDays: elapsed });
        expect(ours.stability).toBeCloseTo(theirs.stability, 6);
        expect(ours.difficulty).toBeCloseTo(theirs.difficulty, 6);
        for (const retention of [0.8, 0.9, 0.95]) {
          // The reference scheduler caps intervals at 36,500 days; so do we.
          expect(nextInterval(ours.stability, retention)).toBe(Math.min(reference.nextInterval(theirs, retention), 36500));
        }
        expect(retrievability(elapsed, ours.stability)).toBeCloseTo(reference.forgettingCurve(theirs, elapsed), 8);
      }
    }
  });

  it('predicts 90% recall after exactly one stability period', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 6);
    expect(retrievability(0, 10)).toBe(1);
  });

  it('behaves sensibly: recall grows memory, forgetting shrinks it', () => {
    const start = initState(3);
    const good = nextState(start, 2, 3);
    const easy = nextState(start, 2, 4);
    const hard = nextState(start, 2, 2);
    const again = nextState(start, 2, 1);
    expect(good.stability).toBeGreaterThan(start.stability);
    expect(easy.stability).toBeGreaterThan(good.stability);
    expect(hard.stability).toBeLessThan(good.stability);
    expect(again.stability).toBeLessThan(start.stability);
    expect(again.difficulty).toBeGreaterThan(start.difficulty);
    expect(easy.difficulty).toBeLessThanOrEqual(start.difficulty);
  });

  it('keeps difficulty between 1 and 10 and stability positive', () => {
    let s = initState(1);
    for (let i = 0; i < 60; i++) {
      s = nextState(s, 1, 1);
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(10);
      expect(s.stability).toBeGreaterThan(0);
    }
    for (let i = 0; i < 60; i++) {
      s = nextState(s, Math.max(1, Math.round(s.stability)), 4);
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.stability).toBeLessThanOrEqual(36500);
    }
  });

  it('asks for shorter intervals when higher retention is wanted', () => {
    const s = 50;
    expect(nextInterval(s, 0.95)).toBeLessThan(nextInterval(s, 0.9));
    expect(nextInterval(s, 0.9)).toBe(50);
    expect(nextInterval(s, 0.8)).toBeGreaterThan(50);
  });
});
