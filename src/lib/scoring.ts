/** Scoring for quizzes, practice sets, and the speed game. */

export interface ItemResult {
  kind: string;
  wordId: string;
  /** Points earned and points possible (a matching board is worth one point per pair). */
  earned: number;
  possible: number;
}

export interface QuizSummary {
  earned: number;
  possible: number;
  percent: number;
  byKind: Record<string, { earned: number; possible: number }>;
  missed: string[];
}

export function summarize(results: readonly ItemResult[]): QuizSummary {
  let earned = 0;
  let possible = 0;
  const byKind: QuizSummary['byKind'] = {};
  const missed = new Set<string>();
  for (const r of results) {
    earned += r.earned;
    possible += r.possible;
    const k = (byKind[r.kind] ??= { earned: 0, possible: 0 });
    k.earned += r.earned;
    k.possible += r.possible;
    if (r.earned < r.possible) missed.add(r.wordId);
  }
  return {
    earned,
    possible,
    percent: possible === 0 ? 0 : Math.round((earned / possible) * 100),
    byKind,
    missed: [...missed],
  };
}

/** A matching board: one point per pair, minus one for each wrong attempt, never below zero. */
export function matchScore(pairs: number, wrongAttempts: number): number {
  return Math.max(0, pairs - wrongAttempts);
}

/** Speed game: 10 points per right answer plus a bonus that grows with the streak (capped). */
export function gamePoints(streakBefore: number): number {
  return 10 + Math.min(streakBefore, 5) * 2;
}

export interface PracticeSummary {
  correct: number;
  total: number;
  percent: number;
  unanswered: number;
  avgSeconds: number;
}

export function summarizePractice(
  answers: readonly (number | null)[],
  key: readonly number[],
  totalSeconds: number,
): PracticeSummary {
  let correct = 0;
  let unanswered = 0;
  answers.forEach((a, i) => {
    if (a === null) unanswered += 1;
    else if (a === key[i]) correct += 1;
  });
  const total = key.length;
  return {
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    unanswered,
    avgSeconds: total === 0 ? 0 : Math.round(totalSeconds / total),
  };
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
