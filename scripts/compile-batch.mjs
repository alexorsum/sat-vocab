#!/usr/bin/env node
// Converts a compact authoring file into a JSON batch in data/words/.
//
// Usage: node scripts/compile-batch.mjs <source.txt> <batch-number>
//
// Authoring format (one block per word):
//
//   ## word | pos | connotation
//   = short definition
//   S science: example sentence
//   S history: example sentence
//   S everyday: example sentence          (settings: science, history, literature, everyday)
//   + synonym, synonym
//   - antonym, antonym                    (optional)
//   P rootId, rootId | optional note      (optional; ids from data/roots.json)
//   C otherword: one-line note on the difference   (optional, repeatable)
//   Q passage text with one ______ blank
//   A form | why this choice is right     (use form=lemma when the form is irregular)
//   X form | code | why this choice fails (three lines; codes: m t o e c u)
//
// Codes: m wrong meaning, t wrong tone, o opposite, e too extreme,
//        c confused word, u wrong context.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REASONS, resolveLemma } from './lib/rules.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed || 1;
  const rnd = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function splitList(s) {
  return s
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function parseChoice(raw) {
  const [form, lemma] = raw.split('=').map((x) => x.trim());
  return { form, lemma: lemma ? lemma.toLowerCase() : null };
}

export function parseSource(text, { listByWord, pool }) {
  const entries = [];
  const problems = [];
  let cur = null;
  let q = null;
  const lines = text.split(/\r?\n/);
  const finishQuestion = () => {
    if (!q || !cur) return;
    if (!q.answer || q.wrong.length !== 3) {
      problems.push(`${cur.word}: question needs 1 A line and 3 X lines`);
      q = null;
      return;
    }
    const order = seededShuffle([q.answer.form, ...q.wrong.map((w) => w.form)], hashSeed(cur.word + q.passage.length));
    cur.questions.push({
      passage: q.passage,
      choices: order,
      answer: order.indexOf(q.answer.form),
      ...(q.answer.lemma ? { answerLemma: q.answer.lemma } : {}),
      explanation: q.answer.why,
      distractors: q.wrong.map((w) => ({ choice: w.form, lemma: w.lemma, reason: w.reason, why: w.why })),
    });
    q = null;
  };
  const finishEntry = () => {
    finishQuestion();
    if (cur) entries.push(cur);
    cur = null;
  };
  lines.forEach((line, idx) => {
    const ln = idx + 1;
    const t = line.trim();
    if (!t || t.startsWith('//')) return;
    if (t.startsWith('## ')) {
      finishEntry();
      const [word, pos, connotation] = t.slice(3).split('|').map((x) => x.trim().toLowerCase());
      const meta = listByWord.get(word);
      if (!meta) problems.push(`line ${ln}: "${word}" is not in data/wordlist.json`);
      cur = {
        id: word,
        word,
        pos,
        rank: meta?.rank ?? 0,
        sourceCount: meta?.sourceCount ?? 0,
        tier: meta?.tier ?? 0,
        definition: '',
        connotation,
        examples: [],
        synonyms: [],
        antonyms: [],
        parts: [],
        confused: [],
        questions: [],
      };
      return;
    }
    if (!cur) {
      problems.push(`line ${ln}: text before the first "## word" header`);
      return;
    }
    const tag = t[0];
    const rest = t.slice(1).trim();
    if (tag === '=') cur.definition = rest;
    else if (tag === 'S') {
      const m = rest.match(/^(\w+):\s*(.+)$/);
      if (!m) problems.push(`line ${ln}: example needs "S setting: sentence"`);
      else cur.examples.push({ setting: m[1].toLowerCase(), text: m[2].trim() });
    } else if (tag === '+') cur.synonyms = splitList(rest);
    else if (tag === '-') cur.antonyms = splitList(rest);
    else if (tag === 'P') {
      const [ids, note] = rest.split('|').map((x) => x.trim());
      cur.parts = ids.split(',').map((x) => x.trim()).filter(Boolean);
      if (note) cur.partsNote = note;
    } else if (tag === 'C') {
      const m = rest.match(/^([a-zA-Z]+):\s*(.+)$/);
      if (!m) problems.push(`line ${ln}: confused word needs "C word: note"`);
      else cur.confused.push({ word: m[1].toLowerCase(), note: m[2].trim() });
    } else if (tag === 'Q') {
      finishQuestion();
      q = { passage: rest, answer: null, wrong: [] };
    } else if (tag === 'A') {
      if (!q) return problems.push(`line ${ln}: A line without a Q line`);
      const i = rest.indexOf('|');
      if (i < 0) return problems.push(`line ${ln}: A line needs "form | explanation"`);
      const c = parseChoice(rest.slice(0, i));
      q.answer = { form: c.form, lemma: c.lemma, why: rest.slice(i + 1).trim() };
    } else if (tag === 'X') {
      if (!q) return problems.push(`line ${ln}: X line without a Q line`);
      const parts = rest.split('|').map((x) => x.trim());
      if (parts.length < 3) return problems.push(`line ${ln}: X line needs "form | code | explanation"`);
      const c = parseChoice(parts[0]);
      const reason = REASONS[parts[1].toLowerCase()];
      if (!reason) problems.push(`line ${ln}: unknown reason code "${parts[1]}"`);
      const lemma = c.lemma ?? resolveLemma(c.form, pool);
      if (!lemma) problems.push(`line ${ln}: cannot find the base form of distractor "${c.form}" in the SAT pool (use form=lemma)`);
      q.wrong.push({ form: c.form, lemma, reason, why: parts.slice(2).join(' | ') });
    } else {
      problems.push(`line ${ln}: unrecognized line "${t.slice(0, 40)}"`);
    }
  });
  finishEntry();
  return { entries, problems };
}

function main() {
  const [src, num] = process.argv.slice(2);
  if (!src || !num) {
    console.error('Usage: node scripts/compile-batch.mjs <source.txt> <batch-number>');
    process.exit(2);
  }
  const list = JSON.parse(readFileSync(join(ROOT, 'data/wordlist.json'), 'utf8'));
  const pool = new Set(JSON.parse(readFileSync(join(ROOT, 'data/sat-pool.json'), 'utf8')));
  try {
    for (const w of JSON.parse(readFileSync(join(ROOT, 'data/extra-allowed.json'), 'utf8'))) pool.add(w);
  } catch {
    /* optional file */
  }
  const listByWord = new Map(list.words.map((w) => [w.word, w]));
  const { entries, problems } = parseSource(readFileSync(src, 'utf8'), { listByWord, pool });
  if (problems.length) {
    console.error(problems.join('\n'));
    console.error(`\n${problems.length} problem(s). Nothing written.`);
    process.exit(1);
  }
  const out = join(ROOT, 'data/words', `batch-${String(num).padStart(2, '0')}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, '[\n' + entries.map((e) => JSON.stringify(e)).join(',\n') + '\n]\n');
  console.log(`Wrote ${entries.length} entries to ${out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
