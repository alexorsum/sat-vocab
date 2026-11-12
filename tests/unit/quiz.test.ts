import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  QUIZ_KINDS,
  buildPractice,
  buildQuiz,
  buildRootQuiz,
  makeDefItem,
  makeGameRound,
  makeMatchItem,
  makeRelationItem,
  makeWordItem,
  pickDistractorWords,
  preparePracticeQuestion,
  reasonForChoice,
  type ChoiceItem,
} from '../../src/lib/quiz';
import { mulberry32, shuffle } from '../../src/lib/rng';
import type { Root, Word } from '../../src/types';

// Use the real word data, straight from the batch files.
const dir = path.resolve(__dirname, '../../data/words');
const words: Word[] = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Word[]);
const wordMap = new Map(words.map((w) => [w.id, w]));
const rawRoots = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/roots.json'), 'utf8')) as Omit<Root, 'words'>[];
const roots: Root[] = rawRoots.map((r) => ({ ...r, words: words.filter((w) => w.parts.includes(r.id)).map((w) => w.id) }));

describe('random helpers', () => {
  it('are repeatable with a seed', () => {
    expect(shuffle([1, 2, 3, 4, 5, 6], mulberry32(7))).toEqual(shuffle([1, 2, 3, 4, 5, 6], mulberry32(7)));
    expect(shuffle([1, 2, 3, 4, 5, 6], mulberry32(7)).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('multiple choice items', () => {
  it('have four different choices with the right answer among them, for every word', () => {
    const rng = mulberry32(1);
    for (const w of words) {
      const def = makeDefItem(w, words, rng);
      expect(new Set(def.choices).size).toBe(4);
      expect(def.choices[def.answer]).toBe(w.definition);
      const back = makeWordItem(w, words, rng);
      expect(new Set(back.choices).size).toBe(4);
      expect(back.choices[back.answer]).toBe(w.word);
    }
  });

  it('never use a synonym of the target as a wrong choice', () => {
    const rng = mulberry32(2);
    for (const w of words.slice(0, 300)) {
      for (const d of pickDistractorWords(w, words, rng)) {
        expect(d.id).not.toBe(w.id);
        expect(w.synonyms).not.toContain(d.word);
        expect(d.synonyms).not.toContain(w.word);
        expect(d.pos).toBe(w.pos);
      }
    }
  });

  it('build synonym and antonym items whose wrong choices are not also correct', () => {
    const rng = mulberry32(3);
    let made = 0;
    for (const w of words.slice(0, 400)) {
      for (const relation of ['synonym', 'antonym'] as const) {
        const item = makeRelationItem(w, words, relation, rng);
        if (!item) continue;
        made += 1;
        const own = relation === 'synonym' ? w.synonyms : w.antonyms;
        expect(own).toContain(item.choices[item.answer]);
        item.choices.forEach((c, i) => {
          if (i !== item.answer) {
            expect(own).not.toContain(c);
            expect(c).not.toBe(w.word);
          }
        });
        expect(new Set(item.choices).size).toBe(4);
      }
    }
    expect(made).toBeGreaterThan(700);
  });

  it('tag a wrong pick with a useful reason', () => {
    const target = words.find((w) => w.confused.some((c) => wordMap.has(c.word))) as Word;
    const lookalike = wordMap.get(target.confused.find((c) => wordMap.has(c.word))!.word) as Word;
    const item: ChoiceItem = {
      kind: 'mc-word',
      wordId: target.id,
      prompt: '',
      stem: target.definition,
      choices: [target.word, lookalike.word, 'zzz', 'yyy'],
      answer: 0,
      choiceWordIds: [target.id, lookalike.id, null, null],
    };
    expect(reasonForChoice(item, 1, wordMap)).toBe('confused-word');
    expect(reasonForChoice(item, 2, wordMap)).toBe('wrong-meaning');
    const withAntonym = words.find((w) => w.antonyms.length > 0) as Word;
    const syn: ChoiceItem = { ...item, kind: 'synonym', wordId: withAntonym.id, choices: [withAntonym.synonyms[0], withAntonym.antonyms[0], 'x', 'y'], choiceWordIds: [null, null, null, null] };
    expect(reasonForChoice(syn, 1, wordMap)).toBe('opposite');
  });
});

describe('matching boards', () => {
  it('pair four words with partners that fit only one word each', () => {
    const rng = mulberry32(4);
    let made = 0;
    for (const w of words.slice(0, 200)) {
      const board = makeMatchItem(w, words, 'synonym', rng);
      if (!board) continue;
      made += 1;
      expect(board.left).toHaveLength(4);
      expect(board.right).toHaveLength(4);
      expect(new Set(board.left.map((l) => l.wordId)).size).toBe(4);
      expect(new Set(board.right.map((r) => r.text)).size).toBe(4);
      expect(board.left.map((l) => l.wordId)).toContain(w.id);
      for (const r of board.right) {
        const owner = wordMap.get(r.wordId) as Word;
        expect(owner.synonyms).toContain(r.text);
        for (const l of board.left) {
          if (l.wordId !== r.wordId) expect((wordMap.get(l.wordId) as Word).synonyms).not.toContain(r.text);
        }
      }
    }
    expect(made).toBeGreaterThan(190);
  });
});

describe('quiz builder', () => {
  it('returns the requested number of items and mixes the kinds', () => {
    const quiz = buildQuiz(words.slice(0, 40), words, QUIZ_KINDS, 21, mulberry32(5));
    expect(quiz).toHaveLength(21);
    const kinds = new Set(quiz.map((q) => q.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(5);
    // Interleaving: the same kind does not come twice in a row within a round of kinds.
    let repeats = 0;
    for (let i = 1; i < quiz.length; i++) if (quiz[i].kind === quiz[i - 1].kind) repeats += 1;
    expect(repeats).toBeLessThanOrEqual(3);
  });

  it('works with a tiny pool by repeating words', () => {
    const quiz = buildQuiz(words.slice(0, 2), words, ['mc-def'], 5, mulberry32(6));
    expect(quiz).toHaveLength(5);
    expect(new Set(quiz.map((q) => q.wordId)).size).toBe(2);
  });

  it('returns nothing for an empty pool', () => {
    expect(buildQuiz([], words, QUIZ_KINDS, 10, mulberry32(1))).toEqual([]);
  });

  it('honors a single chosen kind', () => {
    for (const kind of ['typed', 'tone', 'mc-word'] as const) {
      const quiz = buildQuiz(words.slice(0, 30), words, [kind], 8, mulberry32(8));
      expect(quiz.every((q) => q.kind === kind)).toBe(true);
    }
  });
});

describe('Words in Context practice', () => {
  it('shuffles choices but keeps the right answer and every explanation', () => {
    const rng = mulberry32(9);
    const positions = [0, 0, 0, 0];
    for (const w of words) {
      const q = w.questions[0];
      const p = preparePracticeQuestion(w, q, rng);
      expect(p.choices.slice().sort()).toEqual(q.choices.slice().sort());
      expect(p.choices[p.answer]).toBe(q.choices[q.answer]);
      expect(p.notes[p.answer]).toBeNull();
      p.notes.forEach((n, i) => {
        if (i !== p.answer) {
          expect(n).not.toBeNull();
          expect(n!.why.length).toBeGreaterThan(10);
        }
      });
      positions[p.answer] += 1;
    }
    // After shuffling, each answer position is used about a quarter of the time.
    for (const count of positions) {
      expect(count / words.length).toBeGreaterThan(0.2);
      expect(count / words.length).toBeLessThan(0.3);
    }
  });

  it('builds a set with no repeated words', () => {
    const set = buildPractice(words, 27, mulberry32(10));
    expect(set).toHaveLength(27);
    expect(new Set(set.map((q) => q.wordId)).size).toBe(27);
    expect(buildPractice(words.slice(0, 3), 10, mulberry32(10))).toHaveLength(3);
  });
});

describe('roots quiz and game', () => {
  it('builds root questions with one right answer', () => {
    const items = buildRootQuiz(roots, wordMap, 10, mulberry32(11));
    expect(items).toHaveLength(10);
    for (const item of items) {
      expect(new Set(item.choices).size).toBe(4);
      const root = roots.find((r) => r.id === item.rootId) as Root;
      const right = item.choices[item.answer];
      if (item.prompt.startsWith('What does')) {
        expect(right).toBe(root.meaning);
      } else {
        expect(root.words).toContain(right);
        item.choices.forEach((c, i) => {
          if (i !== item.answer) expect((wordMap.get(c) as Word).parts).not.toContain(root.id);
        });
      }
    }
  });

  it('makes game rounds that are true about half the time and labeled correctly', () => {
    const rng = mulberry32(12);
    let matches = 0;
    for (let i = 0; i < 400; i++) {
      const round = makeGameRound(words, words, rng);
      const w = wordMap.get(round.wordId) as Word;
      expect(round.matches).toBe(round.definition === w.definition);
      if (round.matches) matches += 1;
    }
    expect(matches).toBeGreaterThan(150);
    expect(matches).toBeLessThan(250);
  });
});

import { pickBatch, tooSimilar } from '../../src/lib/learn';

describe('learning batches', () => {
  it('never put near-synonyms or confusing pairs in the same batch', () => {
    let rest = words.slice();
    let batches = 0;
    while (rest.length > 0) {
      const batch = pickBatch(rest, 10);
      expect(batch.length).toBeGreaterThan(0);
      for (let i = 0; i < batch.length; i++) {
        for (let j = i + 1; j < batch.length; j++) expect(tooSimilar(batch[i], batch[j]), `${batch[i].word} / ${batch[j].word}`).toBe(false);
      }
      const taken = new Set(batch.map((w) => w.id));
      rest = rest.filter((w) => !taken.has(w.id));
      batches += 1;
    }
    // Every word is still taught, in about the same number of batches.
    expect(batches).toBeLessThanOrEqual(Math.ceil(words.length / 10) + 3);
  });

  it('keeps ranked order and defers only the similar word', () => {
    const abate = wordMap.get('abate') as Word;
    const abet = wordMap.get('abet') as Word;
    const other = words.find((w) => !tooSimilar(w, abate) && !tooSimilar(w, abet) && w.id !== 'abate' && w.id !== 'abet') as Word;
    expect(tooSimilar(abate, abet)).toBe(true);
    expect(pickBatch([abate, abet, other], 2).map((w) => w.id)).toEqual(['abate', other.id]);
    expect(pickBatch([abate, abet], 5).map((w) => w.id)).toEqual(['abate']);
    expect(pickBatch(words, 10).map((w) => w.id)[0]).toBe(words[0].id);
  });
});

describe('contrasting confusing pairs', () => {
  it('uses a known look-alike as a wrong choice in meaning-to-word questions', () => {
    const abate = wordMap.get('abate') as Word;
    const abet = wordMap.get('abet') as Word;
    const item = makeWordItem(abate, words, mulberry32(21), [abate, abet]);
    expect(item.choices).toContain('abet');
    expect(item.choices[item.answer]).toBe('abate');
    expect(new Set(item.choices).size).toBe(4);
    expect(reasonForChoice(item, item.choices.indexOf('abet'), wordMap)).toBe('confused-word');
    // Not used when the look-alike has not been learned.
    const plain = makeWordItem(abate, words, mulberry32(21), [abate]);
    expect(plain.choices[plain.answer]).toBe('abate');
  });
});
