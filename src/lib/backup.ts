/** Shape and checking of the JSON backup file. */
import type { Card, DayLog, Mistake, Note, ReviewLog, Settings } from '../types';

export const BACKUP_APP = 'sat-vocab';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exported: string;
  cards: Card[];
  notes: Note[];
  reviews: ReviewLog[];
  mistakes: Mistake[];
  days: DayLog[];
  settings: Partial<Settings>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function fail(msg: string): never {
  throw new Error(`This does not look like a SAT Vocab backup file: ${msg}`);
}

/** Check a parsed backup file and return a clean copy. Throws a readable error if it is not valid. */
export function parseBackup(data: unknown): Backup {
  if (!isObj(data)) fail('the file is not a JSON object.');
  if (data.app !== BACKUP_APP) fail('the "app" field is missing.');
  if (!isNum(data.version) || data.version > BACKUP_VERSION) fail('it was made by a newer version of the app.');
  const list = (name: string): unknown[] => {
    const v = data[name];
    if (v === undefined) return [];
    if (!Array.isArray(v)) fail(`"${name}" should be a list.`);
    return v;
  };
  const cards = list('cards').map((c): Card => {
    if (!isObj(c) || !isStr(c.id) || !isNum(c.stability) || !isNum(c.difficulty) || !isNum(c.due)) fail('a card is damaged.');
    return {
      id: c.id,
      stability: c.stability,
      difficulty: c.difficulty,
      due: c.due,
      lastReview: isNum(c.lastReview) ? c.lastReview : null,
      reps: isNum(c.reps) ? c.reps : 0,
      lapses: isNum(c.lapses) ? c.lapses : 0,
      introduced: isNum(c.introduced) ? c.introduced : c.due,
      sentence: isStr(c.sentence) ? c.sentence : '',
    };
  });
  const notes = list('notes').map((n): Note => {
    if (!isObj(n) || !isStr(n.id)) fail('a note is damaged.');
    return { id: n.id, starred: n.starred === true, trick: isStr(n.trick) ? n.trick : '' };
  });
  const reviews = list('reviews').map((r): ReviewLog => {
    if (!isObj(r) || !isStr(r.wordId) || !isNum(r.ts) || !isNum(r.rating) || r.rating < 1 || r.rating > 4) fail('a review record is damaged.');
    return {
      wordId: r.wordId,
      ts: r.ts,
      rating: r.rating as ReviewLog['rating'],
      elapsedDays: isNum(r.elapsedDays) ? r.elapsedDays : 0,
      first: r.first === true,
    };
  });
  const mistakes = list('mistakes').map((m): Mistake => {
    if (!isObj(m) || !isStr(m.wordId) || !isNum(m.ts) || !isStr(m.reason) || !isStr(m.source)) fail('a mistake record is damaged.');
    return {
      wordId: m.wordId,
      ts: m.ts,
      source: m.source as Mistake['source'],
      reason: m.reason as Mistake['reason'],
      chosen: isStr(m.chosen) ? m.chosen : '',
      resolved: m.resolved === true,
    };
  });
  const days = list('days').map((d): DayLog => {
    if (!isObj(d) || !isStr(d.day) || !/^\d{4}-\d{2}-\d{2}$/.test(d.day)) fail('a daily record is damaged.');
    const n = (v: unknown) => (isNum(v) ? v : 0);
    return { day: d.day, reviews: n(d.reviews), learned: n(d.learned), practice: n(d.practice), quiz: n(d.quiz), game: n(d.game) };
  });
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exported: isStr(data.exported) ? data.exported : new Date().toISOString(),
    cards,
    notes,
    reviews,
    mistakes,
    days,
    settings: isObj(data.settings) ? cleanSettings(data.settings) : {},
  };
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  learnBatch: 10,
  desiredRetention: 0.9,
  theme: 'system',
  audio: false,
  tiers: [1, 2, 3],
  gameBest: 0,
};

/** Keep only known settings with sensible values. */
export function cleanSettings(raw: Record<string, unknown>): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (isNum(raw.newPerDay)) out.newPerDay = Math.min(100, Math.max(0, Math.round(raw.newPerDay)));
  if (isNum(raw.learnBatch)) out.learnBatch = Math.min(30, Math.max(1, Math.round(raw.learnBatch)));
  if (isNum(raw.desiredRetention)) out.desiredRetention = Math.min(0.97, Math.max(0.75, raw.desiredRetention));
  if (raw.theme === 'system' || raw.theme === 'light' || raw.theme === 'dark') out.theme = raw.theme;
  if (typeof raw.audio === 'boolean') out.audio = raw.audio;
  if (Array.isArray(raw.tiers)) {
    const tiers = raw.tiers.filter((t): t is 1 | 2 | 3 => t === 1 || t === 2 || t === 3);
    if (tiers.length > 0) out.tiers = [...new Set(tiers)].sort();
  }
  if (isNum(raw.gameBest)) out.gameBest = Math.max(0, Math.round(raw.gameBest));
  return out;
}
