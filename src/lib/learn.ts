/** Choosing which new words to teach together. */
import type { Word } from '../types';

/** True when two words are easy to mix up: near-synonyms or a listed confusing pair. */
export function tooSimilar(a: Word, b: Word): boolean {
  return (
    a.synonyms.includes(b.word) ||
    b.synonyms.includes(a.word) ||
    a.confused.some((c) => c.word === b.word) ||
    b.confused.some((c) => c.word === a.word)
  );
}

/**
 * Take the next `size` words in ranked order, but never put two similar words
 * in the same batch. Learning look-alike words side by side makes them blur
 * together, so the second one waits for a later batch.
 */
export function pickBatch(unseen: readonly Word[], size: number): Word[] {
  const batch: Word[] = [];
  for (const w of unseen) {
    if (batch.length >= size) break;
    if (batch.some((b) => tooSimilar(b, w))) continue;
    batch.push(w);
  }
  return batch;
}
