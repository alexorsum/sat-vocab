/**
 * Builds quiz items from the word data. Everything here is pure: pass a seeded
 * random number generator to get repeatable quizzes in tests.
 */
import type { Connotation, MistakeReason, Question, Root, Word } from '../types';
import { pick, sample, shuffle, type Rng } from './rng';

export type QuizKind = 'typed' | 'mc-def' | 'mc-word' | 'synonym' | 'antonym' | 'match' | 'tone';

export const QUIZ_KINDS: QuizKind[] = ['typed', 'mc-def', 'mc-word', 'synonym', 'antonym', 'match', 'tone'];

export const KIND_LABEL: Record<QuizKind, string> = {
  typed: 'Typed recall',
  'mc-def': 'Word to meaning',
  'mc-word': 'Meaning to word',
  synonym: 'Synonyms',
  antonym: 'Antonyms',
  match: 'Matching',
  tone: 'Tone sorting',
};

export interface ChoiceItem {
  kind: 'mc-def' | 'mc-word' | 'synonym' | 'antonym';
  wordId: string;
  prompt: string;
  /** The text the student is asked about (a word or a definition). */
  stem: string;
  choices: string[];
  answer: number;
  /** For each choice, the word id it came from (used to tag mistakes). */
  choiceWordIds: (string | null)[];
}

export interface TypedItem {
  kind: 'typed';
  wordId: string;
  definition: string;
  pos: string;
  firstLetter: string;
  length: number;
}

export interface MatchItem {
  kind: 'match';
  relation: 'synonym' | 'antonym';
  wordId: string;
  /** Left column words and the right column partners, already shuffled. */
  left: { wordId: string; text: string }[];
  right: { wordId: string; text: string }[];
}

export interface ToneItem {
  kind: 'tone';
  wordId: string;
  word: string;
  answer: Connotation;
}

export type QuizItem = ChoiceItem | TypedItem | MatchItem | ToneItem;

function related(a: Word, b: Word): boolean {
  return (
    a.id === b.id ||
    a.synonyms.includes(b.word) ||
    b.synonyms.includes(a.word) ||
    a.synonyms.some((s) => b.synonyms.includes(s))
  );
}

/** Three other words to use as wrong choices: same part of speech, not synonyms of the target. */
export function pickDistractorWords(target: Word, all: readonly Word[], rng: Rng, count = 3): Word[] {
  const samePos = all.filter((w) => w.pos === target.pos && !related(target, w));
  const near = samePos.filter((w) => Math.abs(w.tier - target.tier) <= 1);
  const pool = near.length >= count * 3 ? near : samePos.length >= count ? samePos : all.filter((w) => !related(target, w));
  return sample(pool, count, rng);
}

function placeAnswer(correct: string, wrong: string[], rng: Rng): { choices: string[]; answer: number } {
  const choices = shuffle([correct, ...wrong], rng);
  return { choices, answer: choices.indexOf(correct) };
}

export function makeDefItem(target: Word, all: readonly Word[], rng: Rng): ChoiceItem {
  const others = pickDistractorWords(target, all, rng);
  const { choices, answer } = placeAnswer(target.definition, others.map((o) => o.definition), rng);
  const byDef = new Map<string, string>([[target.definition, target.id], ...others.map((o) => [o.definition, o.id] as [string, string])]);
  return {
    kind: 'mc-def',
    wordId: target.id,
    prompt: 'Which meaning fits this word?',
    stem: target.word,
    choices,
    answer,
    choiceWordIds: choices.map((c) => byDef.get(c) ?? null),
  };
}

export function makeWordItem(target: Word, all: readonly Word[], rng: Rng): ChoiceItem {
  const others = pickDistractorWords(target, all, rng);
  const { choices, answer } = placeAnswer(target.word, others.map((o) => o.word), rng);
  return {
    kind: 'mc-word',
    wordId: target.id,
    prompt: 'Which word has this meaning?',
    stem: target.definition,
    choices,
    answer,
    choiceWordIds: choices.map((c) => all.find((w) => w.word === c)?.id ?? null),
  };
}

export function makeRelationItem(
  target: Word,
  all: readonly Word[],
  relation: 'synonym' | 'antonym',
  rng: Rng,
): ChoiceItem | null {
  const own = relation === 'synonym' ? target.synonyms : target.antonyms;
  if (own.length === 0) return null;
  const correct = pick(own, rng);
  const banned = new Set([target.word, ...target.synonyms, ...target.antonyms]);
  const wrong: string[] = [];
  const candidates = shuffle(all.filter((w) => w.pos === target.pos && !related(target, w)), rng);
  for (const w of candidates) {
    const options = (relation === 'synonym' ? w.synonyms : w.antonyms).filter((s) => !banned.has(s) && !wrong.includes(s));
    if (options.length === 0) continue;
    wrong.push(pick(options, rng));
    if (wrong.length === 3) break;
  }
  if (wrong.length < 3) return null;
  const { choices, answer } = placeAnswer(correct, wrong, rng);
  return {
    kind: relation,
    wordId: target.id,
    prompt: relation === 'synonym' ? 'Which word is closest in meaning?' : 'Which word is most nearly the opposite?',
    stem: target.word,
    choices,
    answer,
    choiceWordIds: choices.map(() => null),
  };
}

export function makeTypedItem(target: Word): TypedItem {
  return {
    kind: 'typed',
    wordId: target.id,
    definition: target.definition,
    pos: target.pos,
    firstLetter: target.word[0],
    length: target.word.length,
  };
}

export function makeToneItem(target: Word): ToneItem {
  return { kind: 'tone', wordId: target.id, word: target.word, answer: target.connotation };
}

export function makeMatchItem(
  target: Word,
  pool: readonly Word[],
  relation: 'synonym' | 'antonym',
  rng: Rng,
  size = 4,
): MatchItem | null {
  const partnersOf = (w: Word) => (relation === 'synonym' ? w.synonyms : w.antonyms);
  if (partnersOf(target).length === 0) return null;
  const chosen: Word[] = [target];
  const usedTexts = new Set<string>();
  const pairs: { wordId: string; left: string; right: string }[] = [];
  const addPair = (w: Word): boolean => {
    const options = partnersOf(w).filter((p) => !usedTexts.has(p));
    if (options.length === 0) return false;
    const partner = pick(options, rng);
    // Keep every partner unambiguous: it must not also fit another word on the board.
    for (const other of chosen) {
      if (other.id !== w.id && (partnersOf(other).includes(partner) || other.word === partner)) return false;
    }
    usedTexts.add(partner);
    pairs.push({ wordId: w.id, left: w.word, right: partner });
    return true;
  };
  if (!addPair(target)) return null;
  for (const w of shuffle(pool, rng)) {
    if (pairs.length === size) break;
    if (chosen.some((c) => related(c, w))) continue;
    if ([...usedTexts].some((t) => partnersOf(w).includes(t) || w.word === t)) continue;
    chosen.push(w);
    if (!addPair(w)) chosen.pop();
  }
  if (pairs.length < size) return null;
  return {
    kind: 'match',
    relation,
    wordId: target.id,
    left: shuffle(pairs, rng).map((p) => ({ wordId: p.wordId, text: p.left })),
    right: shuffle(pairs, rng).map((p) => ({ wordId: p.wordId, text: p.right })),
  };
}

export function makeItem(kind: QuizKind, target: Word, all: readonly Word[], pool: readonly Word[], rng: Rng): QuizItem {
  let item: QuizItem | null = null;
  if (kind === 'typed') item = makeTypedItem(target);
  else if (kind === 'mc-def') item = makeDefItem(target, all, rng);
  else if (kind === 'mc-word') item = makeWordItem(target, all, rng);
  else if (kind === 'synonym' || kind === 'antonym') item = makeRelationItem(target, all, kind, rng);
  else if (kind === 'tone') item = makeToneItem(target);
  else if (kind === 'match') {
    const relation = target.antonyms.length > 0 && rng() < 0.4 ? 'antonym' : 'synonym';
    const source = pool.length >= 12 ? pool : all;
    item = makeMatchItem(target, source, relation, rng) ?? makeMatchItem(target, all, 'synonym', rng);
  }
  return item ?? makeDefItem(target, all, rng);
}

/**
 * Build a quiz. With several kinds, the kinds are interleaved (mixed up) rather
 * than grouped, which research shows helps long-term learning.
 */
export function buildQuiz(
  pool: readonly Word[],
  all: readonly Word[],
  kinds: readonly QuizKind[],
  count: number,
  rng: Rng,
): QuizItem[] {
  if (pool.length === 0 || kinds.length === 0) return [];
  const targets: Word[] = [];
  while (targets.length < count) {
    const round = shuffle(pool, rng);
    for (const w of round) {
      if (targets.length === count) break;
      targets.push(w);
    }
  }
  const items: QuizItem[] = [];
  let bag: QuizKind[] = [];
  let last: QuizKind | null = null;
  for (const target of targets) {
    if (bag.length === 0) bag = shuffle(kinds, rng);
    // Avoid giving the same kind twice in a row when there is a choice.
    let idx = bag.findIndex((k) => k !== last);
    if (idx < 0) idx = 0;
    const kind = bag.splice(idx, 1)[0];
    last = kind;
    items.push(makeItem(kind, target, all, pool, rng));
  }
  return items;
}

/** Why a wrong multiple-choice pick was probably wrong, for the mistake log. */
export function reasonForChoice(item: ChoiceItem, chosenIndex: number, wordMap: ReadonlyMap<string, Word>): MistakeReason {
  const target = wordMap.get(item.wordId);
  const chosenText = item.choices[chosenIndex];
  if (!target) return 'wrong-meaning';
  if (item.kind === 'synonym' && target.antonyms.includes(chosenText)) return 'opposite';
  if (item.kind === 'antonym' && target.synonyms.includes(chosenText)) return 'opposite';
  const chosenId = item.choiceWordIds[chosenIndex];
  const chosenWord = chosenId ? wordMap.get(chosenId) : undefined;
  if (chosenWord && target.confused.some((c) => c.word === chosenWord.word)) return 'confused-word';
  if (chosenWord && target.antonyms.includes(chosenWord.word)) return 'opposite';
  return 'wrong-meaning';
}

// ---------- Words in Context practice ----------

export interface PracticeQuestion {
  wordId: string;
  passage: string;
  choices: string[];
  answer: number;
  explanation: string;
  /** Explanation and reason for each choice, in the shuffled order (null for the right answer). */
  notes: ({ reason: MistakeReason; why: string; lemma: string } | null)[];
}

/** Shuffle the stored answer choices so the right answer is not always in the same place. */
export function preparePracticeQuestion(word: Word, q: Question, rng: Rng): PracticeQuestion {
  const correct = q.choices[q.answer];
  const choices = shuffle(q.choices, rng);
  return {
    wordId: word.id,
    passage: q.passage,
    choices,
    answer: choices.indexOf(correct),
    explanation: q.explanation,
    notes: choices.map((c) => {
      if (c === correct) return null;
      const d = q.distractors.find((x) => x.choice === c);
      return d ? { reason: d.reason, why: d.why, lemma: d.lemma } : { reason: 'wrong-meaning', why: '', lemma: c };
    }),
  };
}

export function buildPractice(pool: readonly Word[], count: number, rng: Rng): PracticeQuestion[] {
  const withQuestions = pool.filter((w) => w.questions.length > 0);
  return sample(withQuestions, Math.min(count, withQuestions.length), rng).map((w) =>
    preparePracticeQuestion(w, pick(w.questions, rng), rng),
  );
}

// ---------- Roots quiz ----------

export interface RootItem {
  rootId: string;
  prompt: string;
  stem: string;
  choices: string[];
  answer: number;
}

export function buildRootQuiz(roots: readonly Root[], wordMap: ReadonlyMap<string, Word>, count: number, rng: Rng): RootItem[] {
  const usable = roots.filter((r) => r.words.length > 0);
  const targets = sample(usable, Math.min(count, usable.length), rng);
  return targets.map((root, i) => {
    const others = sample(
      roots.filter((r) => r.id !== root.id && r.meaning !== root.meaning),
      3,
      rng,
    );
    if (i % 2 === 0) {
      const { choices, answer } = placeAnswer(root.meaning, others.map((o) => o.meaning), rng);
      return {
        rootId: root.id,
        prompt: `What does this ${root.type === 'root' ? 'root' : root.type} mean?`,
        stem: root.form,
        choices,
        answer,
      };
    }
    const family = new Set(root.words);
    const correctWord = pick(root.words, rng);
    const wrongWords = sample(
      [...wordMap.values()].filter((w) => !family.has(w.id) && !w.parts.includes(root.id)),
      3,
      rng,
    ).map((w) => w.word);
    const { choices, answer } = placeAnswer(wordMap.get(correctWord)?.word ?? correctWord, wrongWords, rng);
    return {
      rootId: root.id,
      prompt: `Which word is built from a part meaning "${root.meaning}"?`,
      stem: `${root.form} (${root.origin})`,
      choices,
      answer,
    };
  });
}

// ---------- Speed game ----------

export interface GameRound {
  wordId: string;
  word: string;
  definition: string;
  /** True if the definition shown really belongs to the word. */
  matches: boolean;
}

export function makeGameRound(pool: readonly Word[], all: readonly Word[], rng: Rng): GameRound {
  const target = pick(pool, rng);
  if (rng() < 0.5) return { wordId: target.id, word: target.word, definition: target.definition, matches: true };
  const other = pickDistractorWords(target, all, rng, 1)[0];
  return { wordId: target.id, word: target.word, definition: other.definition, matches: false };
}
