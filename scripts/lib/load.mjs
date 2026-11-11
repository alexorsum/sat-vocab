// File loading helpers shared by the data scripts.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function readJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
}

export function loadBatches() {
  const dir = join(ROOT, 'data/words');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^batch-\d+\.json$/.test(f)).sort() : [];
  const entries = [];
  for (const f of files) {
    const arr = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const e of arr) entries.push({ ...e, _file: f });
  }
  return { files, entries };
}

export function loadContext() {
  const roots = readJson('data/roots.json');
  const list = readJson('data/wordlist.json');
  const pool = new Set(readJson('data/sat-pool.json'));
  if (existsSync(join(ROOT, 'data/extra-allowed.json'))) for (const w of readJson('data/extra-allowed.json')) pool.add(w);
  for (const w of list.words) pool.add(w.word);
  // Synonyms and antonyms may also come from the academic frequency band:
  // WordNet words that are neither everyday words nor very rare ones.
  const synPool = new Set(pool);
  for (const w of readJson('data/academic-band.json')) synPool.add(w);
  return {
    roots,
    list,
    ctx: { rootIds: new Set(roots.map((r) => r.id)), pool, synPool, listWords: new Set(list.words.map((w) => w.word)) },
  };
}
