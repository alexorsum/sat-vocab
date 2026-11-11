/** Forgiving spelling check for typed recall. */

/** Damerau-Levenshtein distance (insert, delete, substitute, swap neighbors). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = [];
  for (let i = 0; i <= m; i++) {
    d.push(new Array<number>(n + 1).fill(0));
    d[i][0] = i;
  }
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z-]/g, '');
}

/** How many slips to forgive: none for short words, one for medium, two for long. */
export function allowedDistance(length: number): number {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return 2;
}

/** Possible base forms of a typed word, so "necessitated" can match "necessitate". */
export function baseForms(input: string): string[] {
  const out = new Set<string>([input]);
  const add = (s: string) => {
    if (s.length >= 3) out.add(s);
  };
  if (input.endsWith('ies')) add(input.slice(0, -3) + 'y');
  if (input.endsWith('ied')) add(input.slice(0, -3) + 'y');
  if (input.endsWith('es')) add(input.slice(0, -2));
  if (input.endsWith('s')) add(input.slice(0, -1));
  if (input.endsWith('ed')) {
    add(input.slice(0, -2));
    add(input.slice(0, -1));
    if (input.length > 4 && input[input.length - 3] === input[input.length - 4]) add(input.slice(0, -3));
  }
  if (input.endsWith('ing')) {
    add(input.slice(0, -3));
    add(input.slice(0, -3) + 'e');
    if (input.length > 5 && input[input.length - 4] === input[input.length - 5]) add(input.slice(0, -4));
  }
  if (input.endsWith('ly')) add(input.slice(0, -2));
  return [...out];
}

export type SpellingVerdict = 'exact' | 'close' | 'other-word' | 'wrong';

export interface SpellingResult {
  verdict: SpellingVerdict;
  distance: number;
}

/**
 * Compare what the student typed with the target word.
 *  - exact: the word, or an inflected form of it
 *  - close: a small typo that we accept and then show the right spelling
 *  - other-word: a different word from the list (never accepted as a typo,
 *    so "elicit" is not taken for "illicit")
 *  - wrong: anything else
 */
export function checkSpelling(input: string, target: string, otherWords?: ReadonlySet<string>): SpellingResult {
  const typed = normalizeAnswer(input);
  const goal = normalizeAnswer(target);
  if (typed.length === 0) return { verdict: 'wrong', distance: goal.length };
  const forms = baseForms(typed);
  if (forms.includes(goal)) return { verdict: 'exact', distance: 0 };
  if (otherWords && forms.some((f) => f !== goal && otherWords.has(f))) {
    return { verdict: 'other-word', distance: editDistance(typed, goal) };
  }
  let best = Infinity;
  for (const f of forms) best = Math.min(best, editDistance(f, goal));
  if (best <= allowedDistance(goal.length)) return { verdict: 'close', distance: best };
  return { verdict: 'wrong', distance: best };
}

/** True if the sentence appears to use the word (any common form of it). */
export function usesWord(sentence: string, word: string): boolean {
  const goal = normalizeAnswer(word);
  const stem = goal.length > 5 ? goal.slice(0, goal.length - 2) : goal.slice(0, Math.max(3, goal.length - 1));
  const tokens = sentence.toLowerCase().match(/[a-z-]+/g) ?? [];
  return tokens.some((t) => baseForms(t).includes(goal) || (t.startsWith(stem) && Math.abs(t.length - goal.length) <= 4));
}
