/** IndexedDB storage. Everything the student does stays on this device. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card, DayLog, Mistake, Note, ReviewLog, Settings } from '../types';
import { BACKUP_APP, BACKUP_VERSION, DEFAULT_SETTINGS, cleanSettings, parseBackup, type Backup } from '../lib/backup';

interface Schema extends DBSchema {
  cards: { key: string; value: Card };
  notes: { key: string; value: Note };
  reviews: { key: number; value: ReviewLog; indexes: { ts: number } };
  mistakes: { key: number; value: Mistake };
  days: { key: string; value: DayLog };
  kv: { key: string; value: unknown };
}

const DB_NAME = 'sat-vocab';
let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

export function getDb(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('cards', { keyPath: 'id' });
        db.createObjectStore('notes', { keyPath: 'id' });
        const reviews = db.createObjectStore('reviews', { keyPath: 'key', autoIncrement: true });
        reviews.createIndex('ts', 'ts');
        db.createObjectStore('mistakes', { keyPath: 'key', autoIncrement: true });
        db.createObjectStore('days', { keyPath: 'day' });
        db.createObjectStore('kv');
      },
    });
  }
  return dbPromise;
}

/** For tests: forget the cached connection. */
export async function closeDb(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

export interface Loaded {
  cards: Card[];
  notes: Note[];
  mistakes: Mistake[];
  days: DayLog[];
  settings: Settings;
}

export async function loadAll(): Promise<Loaded> {
  const db = await getDb();
  const [cards, notes, mistakes, days, rawSettings] = await Promise.all([
    db.getAll('cards'),
    db.getAll('notes'),
    db.getAll('mistakes'),
    db.getAll('days'),
    db.get('kv', 'settings'),
  ]);
  const saved = typeof rawSettings === 'object' && rawSettings !== null ? cleanSettings(rawSettings as Record<string, unknown>) : {};
  return { cards, notes, mistakes, days, settings: { ...DEFAULT_SETTINGS, ...saved } };
}

export async function putCard(card: Card): Promise<void> {
  await (await getDb()).put('cards', card);
}

export async function putCards(cards: Card[]): Promise<void> {
  const tx = (await getDb()).transaction('cards', 'readwrite');
  await Promise.all([...cards.map((c) => tx.store.put(c)), tx.done]);
}

export async function putNote(note: Note): Promise<void> {
  await (await getDb()).put('notes', note);
}

export async function addReview(log: ReviewLog): Promise<void> {
  await (await getDb()).add('reviews', log);
}

export async function getReviews(): Promise<ReviewLog[]> {
  return (await getDb()).getAll('reviews');
}

export async function addMistake(m: Mistake): Promise<number> {
  return (await getDb()).add('mistakes', m);
}

export async function putMistake(m: Mistake): Promise<void> {
  await (await getDb()).put('mistakes', m);
}

export async function deleteMistake(key: number): Promise<void> {
  await (await getDb()).delete('mistakes', key);
}

export async function putDay(day: DayLog): Promise<void> {
  await (await getDb()).put('days', day);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await getDb()).put('kv', settings, 'settings');
}

export async function exportAll(): Promise<Backup> {
  const db = await getDb();
  const [cards, notes, reviews, mistakes, days, settings] = await Promise.all([
    db.getAll('cards'),
    db.getAll('notes'),
    db.getAll('reviews'),
    db.getAll('mistakes'),
    db.getAll('days'),
    db.get('kv', 'settings'),
  ]);
  const strip = <T extends { key?: number }>(rows: T[]) => rows.map(({ key: _key, ...rest }) => rest as T);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exported: new Date().toISOString(),
    cards,
    notes,
    reviews: strip(reviews),
    mistakes: strip(mistakes),
    days,
    settings: typeof settings === 'object' && settings !== null ? cleanSettings(settings as Record<string, unknown>) : {},
  };
}

/** Replace everything on this device with the contents of a backup file. */
export async function importAll(data: unknown): Promise<Backup> {
  const backup = parseBackup(data);
  const db = await getDb();
  const tx = db.transaction(['cards', 'notes', 'reviews', 'mistakes', 'days', 'kv'], 'readwrite');
  await Promise.all([
    tx.objectStore('cards').clear(),
    tx.objectStore('notes').clear(),
    tx.objectStore('reviews').clear(),
    tx.objectStore('mistakes').clear(),
    tx.objectStore('days').clear(),
  ]);
  for (const c of backup.cards) void tx.objectStore('cards').put(c);
  for (const n of backup.notes) void tx.objectStore('notes').put(n);
  for (const r of backup.reviews) void tx.objectStore('reviews').add(r);
  for (const m of backup.mistakes) void tx.objectStore('mistakes').add(m);
  for (const d of backup.days) void tx.objectStore('days').put(d);
  void tx.objectStore('kv').put({ ...DEFAULT_SETTINGS, ...backup.settings }, 'settings');
  await tx.done;
  return backup;
}

export async function resetAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['cards', 'notes', 'reviews', 'mistakes', 'days', 'kv'], 'readwrite');
  await Promise.all([
    tx.objectStore('cards').clear(),
    tx.objectStore('notes').clear(),
    tx.objectStore('reviews').clear(),
    tx.objectStore('mistakes').clear(),
    tx.objectStore('days').clear(),
    tx.objectStore('kv').clear(),
    tx.done,
  ]);
}
