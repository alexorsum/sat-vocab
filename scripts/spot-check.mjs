#!/usr/bin/env node
// Prints a random sample of entries next to their WordNet 3.1 senses, for a
// human accuracy check. The sample is seeded so it can be reproduced.
//
// Usage: node scripts/spot-check.mjs [--n=30] [--seed=20261111]
import { loadBatches } from './lib/load.mjs';
import { senses } from './check-wordnet.mjs';

const arg = (name, fallback) => Number((process.argv.find((a) => a.startsWith(`--${name}=`)) ?? `=${fallback}`).split('=')[1]);
const n = arg('n', 30);
let seed = arg('seed', 20261111) >>> 0;
const rng = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { entries } = loadBatches();
const pool = entries.slice();
const sample = [];
while (sample.length < n && pool.length) sample.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);

for (const e of sample) {
  const q = e.questions[0];
  console.log(`\n=== ${e.word} (${e.pos}, ${e.connotation}, tier ${e.tier}, rank ${e.rank}) ===`);
  console.log(`definition: ${e.definition}`);
  console.log(`synonyms:   ${e.synonyms.join(', ')}   antonyms: ${e.antonyms.join(', ')}`);
  for (const ex of e.examples) console.log(`  [${ex.setting}] ${ex.text}`);
  for (const c of e.confused) console.log(`  confused: ${c.word}: ${c.note}`);
  console.log(`  Q: ${q.passage}`);
  console.log(`     choices: ${q.choices.map((c, i) => (i === q.answer ? `*${c}*` : c)).join(' | ')}`);
  console.log(`     why: ${q.explanation}`);
  for (const d of q.distractors) console.log(`     x ${d.choice} (${d.reason}): ${d.why}`);
  const wn = senses(e.word, e.pos);
  console.log(`WordNet (${wn.length} senses):`);
  for (const s of wn.slice(0, 4)) console.log(`  - [${s.words.slice(0, 5).join(', ')}] ${s.gloss.slice(0, 160)}`);
}
console.log(`\n${sample.length} entries sampled: ${sample.map((e) => e.word).join(', ')}`);
