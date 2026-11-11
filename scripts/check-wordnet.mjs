#!/usr/bin/env node
// Checks every entry against WordNet 3.1 (open dictionary, via the wordnet-db package).
//
// 1. The word must exist in WordNet with the part of speech the entry claims.
// 2. The entry's definition and synonyms are compared with WordNet's glosses and
//    synonym sets. Entries that share no content word with WordNet are flagged
//    for a human look (a flag is a prompt to review, not proof of an error).
//
// Usage:
//   node scripts/check-wordnet.mjs              summary and flagged entries
//   node scripts/check-wordnet.mjs --show=abate print WordNet senses for one word
//   node scripts/check-wordnet.mjs --strict     exit 1 if a word is missing from WordNet
//                                               and not listed in data/wordnet-exceptions.json
//   node scripts/check-wordnet.mjs --batch=3    limit to one batch file

import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { ROOT, loadBatches } from './lib/load.mjs';

const require = createRequire(import.meta.url);
const WN_DIR = require('wordnet-db').path;
const POS_FILE = { noun: 'noun', verb: 'verb', adjective: 'adj', adverb: 'adv' };

const indexCache = new Map();
function loadIndex(pos) {
  if (indexCache.has(pos)) return indexCache.get(pos);
  const map = new Map();
  for (const line of readFileSync(join(WN_DIR, `index.${pos}`), 'utf8').split('\n')) {
    if (!line || line.startsWith(' ')) continue;
    const parts = line.trim().split(/\s+/);
    const lemma = parts[0];
    const synsetCount = Number(parts[2]);
    map.set(lemma, parts.slice(parts.length - synsetCount).map(Number));
  }
  indexCache.set(pos, map);
  return map;
}

const fdCache = new Map();
function readSynset(pos, offset) {
  if (!fdCache.has(pos)) fdCache.set(pos, openSync(join(WN_DIR, `data.${pos}`), 'r'));
  const buf = Buffer.alloc(4096);
  const n = readSync(fdCache.get(pos), buf, 0, 4096, offset);
  const line = buf.subarray(0, n).toString('utf8').split('\n')[0];
  const [head, gloss] = line.split(' | ');
  const f = head.split(' ');
  const wCount = parseInt(f[3], 16);
  const words = [];
  for (let i = 0; i < wCount; i++) words.push(f[4 + i * 2].replace(/\(.*\)$/, '').replace(/_/g, ' ').toLowerCase());
  return { words, gloss: (gloss ?? '').trim() };
}

export function senses(word, pos) {
  const file = POS_FILE[pos];
  if (!file) return [];
  const offsets = loadIndex(file).get(word.toLowerCase()) ?? [];
  return offsets.map((o) => readSynset(file, o));
}

const STOP = new Set(
  'a an the of to in on for and or with by from as at that which who whom is are be being been it its not very more most than into something someone thing things person people one ones make made having have has do does done act state quality way used use using esp especially usually often some any other others out up off over so such this these those can may when where while without about your their his her'.split(' '),
);
function keys(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.slice(0, 5)),
  );
}

function main() {
  const args = process.argv.slice(2);
  const get = (n) => (args.find((a) => a.startsWith(`--${n}=`)) ?? '').split('=')[1];
  const show = get('show');
  if (show) {
    for (const pos of Object.keys(POS_FILE)) {
      const s = senses(show, pos);
      if (s.length) console.log(`\n${show} (${pos})`);
      s.forEach((x, i) => console.log(`  ${i + 1}. [${x.words.join(', ')}] ${x.gloss.split('; "')[0]}`));
    }
    return;
  }
  const strict = args.includes('--strict');
  const batch = get('batch');
  const exceptionsPath = join(ROOT, 'data/wordnet-exceptions.json');
  const exceptions = new Set(existsSync(exceptionsPath) ? JSON.parse(readFileSync(exceptionsPath, 'utf8')) : []);
  let { entries } = loadBatches();
  if (batch) entries = entries.filter((e) => e._file === `batch-${String(batch).padStart(2, '0')}.json`);

  const missing = [];
  const flagged = [];
  for (const e of entries) {
    const s = senses(e.word, e.pos);
    if (!s.length) {
      const elsewhere = Object.keys(POS_FILE).filter((p) => senses(e.word, p).length);
      if (!exceptions.has(e.word)) missing.push(`${e.word} (${e.pos})${elsewhere.length ? `: WordNet has it only as ${elsewhere.join(', ')}` : ': not in WordNet'}`);
      continue;
    }
    const mine = keys(`${e.definition} ${e.synonyms.join(' ')}`);
    const theirs = keys(s.map((x) => `${x.words.join(' ')} ${x.gloss.split('; "')[0]}`).join(' '));
    let overlap = 0;
    for (const k of mine) if (theirs.has(k)) overlap++;
    if (overlap === 0) flagged.push({ word: e.word, pos: e.pos, mine: e.definition, wordnet: s.slice(0, 3).map((x) => x.gloss.split('; "')[0]) });
  }
  for (const fd of fdCache.values()) closeSync(fd);

  for (const f of flagged) {
    console.log(`REVIEW ${f.word} (${f.pos})\n  ours:    ${f.mine}\n  wordnet: ${f.wordnet.join(' / ')}`);
  }
  for (const m of missing) console.log(`MISSING ${m}`);
  console.log(`\nChecked ${entries.length} entries: ${missing.length} not found with the stated part of speech, ${flagged.length} flagged for review.`);
  if (strict && missing.length) process.exit(1);
}

// Run only when called directly, so other scripts can import senses().
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
