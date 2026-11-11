#!/usr/bin/env node
// Validates the source data, then writes the files the app loads:
//   public/data/words.json  (all entries, sorted by rank)
//   public/data/roots.json  (roots and affixes with linked word ids)
// The build stops with exit code 1 if validation fails.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateDataset, validateRoots } from './lib/rules.mjs';
import { ROOT, loadBatches, loadContext } from './lib/load.mjs';

const MIN_WORDS = Number(process.env.MIN_WORDS ?? 1000);

const { roots, ctx } = loadContext();
const { entries } = loadBatches();
const rootErrors = validateRoots(roots);
const { errors } = validateDataset(entries, ctx, { minWords: MIN_WORDS });
const all = [...rootErrors, ...errors];
if (all.length) {
  for (const e of all.slice(0, 50)) console.error(`error: ${e}`);
  console.error(`\nData validation failed with ${all.length} error(s). Build stopped.`);
  process.exit(1);
}

const words = entries
  .map(({ _file, ...e }) => e)
  .sort((a, b) => a.rank - b.rank || a.word.localeCompare(b.word));

const byRoot = new Map(roots.map((r) => [r.id, []]));
for (const w of words) for (const p of w.parts) byRoot.get(p).push(w.id);
const rootsOut = roots.map((r) => ({ ...r, words: byRoot.get(r.id) }));

const outDir = join(ROOT, 'public/data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'words.json'), JSON.stringify({ version: 1, count: words.length, words }));
writeFileSync(join(outDir, 'roots.json'), JSON.stringify({ version: 1, count: rootsOut.length, roots: rootsOut }));
console.log(`Data built: ${words.length} words, ${rootsOut.length} roots and affixes.`);
