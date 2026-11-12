import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
// The validator is plain JavaScript shared with the build scripts.
// @ts-expect-error no type declarations for the .mjs scripts
import { validateDataset, validateEntry, validateQuestion, validateRoots, countWords, resolveLemma } from '../../scripts/lib/rules.mjs';
// @ts-expect-error no type declarations for the .mjs scripts
import { loadBatches, loadContext } from '../../scripts/lib/load.mjs';

const root = path.resolve(__dirname, '../..');
const { entries } = loadBatches();
const { ctx, roots } = loadContext();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const sample = () => clone(entries.find((e: { word: string }) => e.word === 'plausible'));
const errorsFor = (e: unknown): string[] => validateEntry(e, ctx);

describe('the real word list', () => {
  it('passes every validation rule with at least 1,000 unique words', () => {
    const result = validateDataset(entries, ctx, { minWords: 1000, requireComplete: true });
    expect(result.errors).toEqual([]);
    const unique = new Set(entries.map((e: { word: string }) => e.word));
    expect(unique.size).toBe(entries.length);
    expect(unique.size).toBeGreaterThanOrEqual(1000);
  });

  it('has a valid roots dataset of about 100 or more parts, nearly all linked to words', () => {
    expect(validateRoots(roots)).toEqual([]);
    expect(roots.length).toBeGreaterThanOrEqual(100);
    const used = new Set(entries.flatMap((e: { parts: string[] }) => e.parts));
    expect(used.size / roots.length).toBeGreaterThan(0.95);
  });

  it('gives every word three contexts in different settings and one explained question', () => {
    for (const e of entries) {
      expect(new Set(e.examples.map((x: { setting: string }) => x.setting)).size).toBe(3);
      expect(e.questions.length).toBeGreaterThanOrEqual(1);
      for (const q of e.questions) {
        expect(q.distractors).toHaveLength(3);
        const n = countWords(q.passage);
        expect(n).toBeGreaterThanOrEqual(25);
        expect(n).toBeLessThanOrEqual(150);
      }
    }
  });
});

describe('the validator catches broken entries', () => {
  it('accepts the unmodified sample', () => {
    expect(errorsFor(sample())).toEqual([]);
  });

  it('missing fields', () => {
    for (const field of ['definition', 'examples', 'synonyms', 'questions', 'pos', 'connotation', 'confused', 'parts']) {
      const e = sample();
      delete e[field];
      expect(errorsFor(e).length, `removing ${field}`).toBeGreaterThan(0);
    }
    const e = sample();
    e.questions[0].explanation = '';
    expect(errorsFor(e).join('\n')).toMatch(/explanation/);
  });

  it('duplicate words', () => {
    const two = [sample(), sample()];
    expect(validateDataset(two, ctx).errors.join('\n')).toMatch(/duplicate word "plausible"/);
  });

  it('more or fewer than one correct answer', () => {
    // A wrong choice that is a listed synonym could also be correct.
    const a = sample();
    const d = a.questions[0].distractors[0];
    const idx = a.questions[0].choices.indexOf(d.choice);
    a.questions[0].choices[idx] = a.synonyms[0];
    d.choice = a.synonyms[0];
    d.lemma = a.synonyms[0];
    expect(errorsFor(a).join('\n')).toMatch(/synonym of the answer/);

    // The answer index points at a wrong choice.
    const b = sample();
    b.questions[0].answer = (b.questions[0].answer + 1) % 4;
    expect(errorsFor(b).join('\n')).toMatch(/not a form of the word|do not match/);

    // The same choice twice.
    const c = sample();
    c.questions[0].choices[(c.questions[0].answer + 1) % 4] = c.questions[0].choices[c.questions[0].answer];
    expect(errorsFor(c).join('\n')).toMatch(/choices are repeated/);

    // Only three choices, or an answer index out of range.
    const dd = sample();
    dd.questions[0].choices.pop();
    expect(errorsFor(dd).join('\n')).toMatch(/exactly 4 choices/);
    const f = sample();
    f.questions[0].answer = 4;
    expect(errorsFor(f).join('\n')).toMatch(/index from 0 to 3/);
  });

  it('repeated or unexplained distractors', () => {
    const a = sample();
    a.questions[0].distractors[1].lemma = a.questions[0].distractors[0].lemma;
    expect(errorsFor(a).join('\n')).toMatch(/is repeated/);

    const b = sample();
    b.questions[0].distractors.pop();
    expect(errorsFor(b).join('\n')).toMatch(/exactly 3 explained distractors/);

    const c = sample();
    c.questions[0].distractors[0].choice = 'zebra';
    expect(errorsFor(c).join('\n')).toMatch(/do not match the 3 wrong choices/);

    const d = sample();
    d.questions[0].distractors[0].lemma = 'notarealsatword';
    expect(errorsFor(d).join('\n')).toMatch(/not a known SAT word/);

    const e = sample();
    e.questions[0].distractors[0].reason = 'because';
    expect(errorsFor(e).join('\n')).toMatch(/invalid reason/);
  });

  it('a distractor that is overused across the whole list', () => {
    const many = Array.from({ length: 13 }, (_, i) => {
      const e = sample();
      e.word = e.id = `word${'abcdefghijklm'[i]}`;
      return e;
    });
    const result = validateDataset(many, { ...ctx, listWords: null });
    expect(result.errors.join('\n')).toMatch(/is used 13 times \(limit 12\)/);
  });

  it('bad passages', () => {
    const q = () => sample().questions[0];
    const e = sample();
    const noBlank = q();
    noBlank.passage = noBlank.passage.replace('______', 'thing');
    expect(validateQuestion(noBlank, e, ctx).join('\n')).toMatch(/exactly one blank/);
    const twoBlanks = q();
    twoBlanks.passage += ' ______';
    expect(validateQuestion(twoBlanks, e, ctx).join('\n')).toMatch(/exactly one blank/);
    const short = q();
    short.passage = 'The plan seemed ______ to everyone.';
    expect(validateQuestion(short, e, ctx).join('\n')).toMatch(/25 to 150 words/);
    const long = q();
    long.passage = long.passage + ' and so on'.repeat(60);
    expect(validateQuestion(long, e, ctx).join('\n')).toMatch(/25 to 150 words/);
    const leak = q();
    leak.passage = leak.passage.replace('______', '______ (plausible)');
    expect(validateQuestion(leak, e, ctx).join('\n')).toMatch(/gives away the answer/);
  });

  it('dashes, bad examples, unknown roots, and self-references', () => {
    const a = sample();
    a.examples[0].text = a.examples[0].text.replace(' ', ' \u2014 ');
    expect(errorsFor(a).join('\n')).toMatch(/en dash or em dash/);

    const b = sample();
    b.examples[1].setting = b.examples[0].setting;
    expect(errorsFor(b).join('\n')).toMatch(/3 different settings/);

    const c = sample();
    c.examples[0].text = 'This sentence never uses the target at all, sadly.';
    expect(errorsFor(c).join('\n')).toMatch(/does not contain the word/);

    const d = sample();
    d.parts = ['not-a-root'];
    expect(errorsFor(d).join('\n')).toMatch(/not in the roots dataset/);

    const e = sample();
    e.definition = 'plausible in a way that seems plausible';
    expect(errorsFor(e).join('\n')).toMatch(/uses the word itself/);

    const f = sample();
    f.confused = [{ word: 'plausible', note: 'Same word.' }];
    expect(errorsFor(f).join('\n')).toMatch(/repeats the word itself/);

    const g = sample();
    g.synonyms = [];
    expect(errorsFor(g).join('\n')).toMatch(/1 to 6 synonyms/);
  });

  it('too few words', () => {
    const result = validateDataset([sample()], { ...ctx, listWords: null }, { minWords: 1000 });
    expect(result.errors.join('\n')).toMatch(/at least 1000 are required/);
  });
});

describe('helpers', () => {
  it('count words and resolve inflected forms', () => {
    expect(countWords('One two  three.')).toBe(3);
    expect(resolveLemma('necessitated', new Set(['necessitate']))).toBe('necessitate');
    expect(resolveLemma('undermines', new Set(['undermine']))).toBe('undermine');
  });
});

describe('the build fails when validation fails', () => {
  it('validate-data exits with an error code when a rule is broken', () => {
    const ok = spawnSync('node', ['scripts/validate-data.mjs', '--complete', '--min=1000', '--quiet'], { cwd: root });
    expect(ok.status).toBe(0);
    const bad = spawnSync('node', ['scripts/validate-data.mjs', '--min=99999', '--quiet'], { cwd: root });
    expect(bad.status).toBe(1);
  });

  it('build-data refuses to write app data when validation fails', () => {
    const bad = spawnSync('node', ['scripts/build-data.mjs'], { cwd: root, env: { ...process.env, MIN_WORDS: '99999' } });
    expect(bad.status).toBe(1);
  });
});
