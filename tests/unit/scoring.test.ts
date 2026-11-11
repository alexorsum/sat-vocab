import { describe, expect, it } from 'vitest';
import { formatClock, gamePoints, matchScore, summarize, summarizePractice } from '../../src/lib/scoring';

describe('quiz scoring', () => {
  it('adds up points overall and by question type', () => {
    const s = summarize([
      { kind: 'typed', wordId: 'a', earned: 1, possible: 1 },
      { kind: 'typed', wordId: 'b', earned: 0, possible: 1 },
      { kind: 'mc-def', wordId: 'c', earned: 1, possible: 1 },
      { kind: 'match', wordId: 'd', earned: 3, possible: 4 },
    ]);
    expect(s.earned).toBe(5);
    expect(s.possible).toBe(7);
    expect(s.percent).toBe(71);
    expect(s.byKind.typed).toEqual({ earned: 1, possible: 2 });
    expect(s.byKind.match).toEqual({ earned: 3, possible: 4 });
    expect(s.missed).toEqual(['b', 'd']);
  });

  it('handles an empty quiz and lists each missed word once', () => {
    expect(summarize([])).toEqual({ earned: 0, possible: 0, percent: 0, byKind: {}, missed: [] });
    const s = summarize([
      { kind: 'tone', wordId: 'a', earned: 0, possible: 1 },
      { kind: 'mc-word', wordId: 'a', earned: 0, possible: 1 },
    ]);
    expect(s.missed).toEqual(['a']);
  });

  it('scores a matching board: a point per pair, minus wrong tries, never negative', () => {
    expect(matchScore(4, 0)).toBe(4);
    expect(matchScore(4, 1)).toBe(3);
    expect(matchScore(4, 9)).toBe(0);
  });

  it('gives game points with a capped streak bonus', () => {
    expect(gamePoints(0)).toBe(10);
    expect(gamePoints(1)).toBe(12);
    expect(gamePoints(5)).toBe(20);
    expect(gamePoints(50)).toBe(20);
  });
});

describe('practice scoring', () => {
  it('counts correct, wrong, and unanswered questions', () => {
    const s = summarizePractice([0, 2, null, 3], [0, 1, 2, 3], 200);
    expect(s).toEqual({ correct: 2, total: 4, percent: 50, unanswered: 1, avgSeconds: 50 });
  });
  it('handles an empty set', () => {
    expect(summarizePractice([], [], 0)).toEqual({ correct: 0, total: 0, percent: 0, unanswered: 0, avgSeconds: 0 });
  });
  it('formats the countdown clock', () => {
    expect(formatClock(710)).toBe('11:50');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(-4)).toBe('0:00');
  });
});
