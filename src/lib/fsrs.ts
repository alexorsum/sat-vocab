/**
 * FSRS-6 memory model with the published default parameters.
 *
 * This is a small, dependency-free implementation of the formulas described in
 * docs/RESEARCH.md. The unit tests compare it step by step with the reference
 * library (ts-fsrs 6), so if a formula here drifts the tests fail.
 *
 * Each card has two numbers:
 *   stability  (S): days until the chance of recall falls to 90%
 *   difficulty (D): 1 (easy) to 10 (hard)
 */
import type { Rating } from '../types';

export const DEFAULT_WEIGHTS: readonly number[] = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
  0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

export const S_MIN = 0.001;
export const S_MAX = 36500;
export const MAX_INTERVAL = 36500;

export interface MemoryState {
  stability: number;
  difficulty: number;
}

const w = DEFAULT_WEIGHTS;
const DECAY = -w[20];
const round8 = (x: number) => Math.round(x * 1e8) / 1e8;
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);
const FACTOR = round8(Math.exp(Math.log(0.9) / DECAY) - 1);

/** Probability of recall after `elapsedDays` for a memory with the given stability. */
export function retrievability(elapsedDays: number, stability: number): number {
  return round8(Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY));
}

function initStability(g: Rating): number {
  return clamp(w[g - 1], S_MIN, S_MAX);
}

function initDifficulty(g: Rating): number {
  return round8(w[4] - Math.exp((g - 1) * w[5]) + 1);
}

function nextDifficulty(d: number, g: Rating): number {
  const delta = -w[6] * (g - 3);
  const damped = round8((delta * (10 - d)) / 9);
  const reverted = round8(w[7] * initDifficulty(4) + (1 - w[7]) * (d + damped));
  return clamp(reverted, 1, 10);
}

function recallStability(d: number, s: number, r: number, g: Rating): number {
  const hard = g === 2 ? w[15] : 1;
  const easy = g === 4 ? w[16] : 1;
  const grown =
    s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard * easy);
  return round8(clamp(grown, S_MIN, S_MAX));
}

function forgetStability(d: number, s: number, r: number): number {
  const v = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]);
  return round8(clamp(v, S_MIN, S_MAX));
}

function shortTermStability(s: number, g: Rating): number {
  const sinc = Math.pow(s, -w[19]) * Math.exp(w[17] * (g - 3 + w[18]));
  const masked = g >= 2 ? Math.max(sinc, 1) : sinc;
  return round8(clamp(s * masked, S_MIN, S_MAX));
}

/** State of a brand-new memory after its first rating. */
export function initState(g: Rating): MemoryState {
  return { stability: initStability(g), difficulty: clamp(initDifficulty(g), 1, 10) };
}

/**
 * State after reviewing an existing memory.
 * `elapsedDays` is the whole number of days since the previous review
 * (0 means a second look on the same day).
 */
export function nextState(prev: MemoryState, elapsedDays: number, g: Rating): MemoryState {
  const { stability: s, difficulty: d } = prev;
  const r = retrievability(elapsedDays, s);
  let stability: number;
  if (elapsedDays === 0) {
    stability = shortTermStability(s, g);
  } else if (g === 1) {
    const afterFail = forgetStability(d, s, r);
    const floor = s / Math.exp(w[17] * w[18]);
    stability = clamp(round8(floor), S_MIN, afterFail);
  } else {
    stability = recallStability(d, s, r, g);
  }
  return { stability, difficulty: nextDifficulty(d, g) };
}

/** Days to wait so that recall probability falls to `desiredRetention`. */
export function nextInterval(stability: number, desiredRetention: number): number {
  const raw = (stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.min(Math.max(Math.round(raw), 1), MAX_INTERVAL);
}
