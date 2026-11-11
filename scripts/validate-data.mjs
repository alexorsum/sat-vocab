#!/usr/bin/env node
// Validates data/roots.json and every batch in data/words/.
// Exits with code 1 on any error, which fails the build and CI.
//
// Flags:
//   --min=<n>     require at least n words (default 0 while authoring)
//   --complete    require an entry for every word in data/wordlist.json
//   --quiet       print only the summary

import { validateDataset, validateRoots } from './lib/rules.mjs';
import { loadBatches, loadContext } from './lib/load.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const min = Number((flag('min') ?? '').split('=')[1] ?? 0);
const complete = Boolean(flag('complete'));
const quiet = Boolean(flag('quiet'));

const { roots, ctx } = loadContext();
const { files, entries } = loadBatches();

const rootErrors = validateRoots(roots);
const { errors, warnings, stats } = validateDataset(entries, ctx, { minWords: min, requireComplete: complete });
const all = [...rootErrors, ...errors];

if (!quiet) for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of all) console.error(`error: ${e}`);

const usedRoots = new Set(entries.flatMap((e) => e.parts ?? []));
console.log(
  `\n${files.length} batch file(s), ${stats.words} words, ${roots.length} roots and affixes ` +
    `(${usedRoots.size} linked to words), ${stats.distinctDistractors} distinct distractor words, ` +
    `${warnings.length} warning(s), ${all.length} error(s).`,
);
if (all.length) {
  console.error('Validation FAILED.');
  process.exit(1);
}
console.log('Validation passed.');
