import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export interface WordData {
  id: string;
  word: string;
  pos: string;
  tier: number;
  definition: string;
  connotation: string;
  synonyms: string[];
  antonyms: string[];
  parts: string[];
  questions: { passage: string; choices: string[]; answer: number }[];
}

// The same data the app loads (public/data is produced by "npm run build:data").
const file = path.resolve(process.cwd(), 'public/data/words.json');
export const WORDS: WordData[] = JSON.parse(fs.readFileSync(file, 'utf8')).words;
export const BY_ID = new Map(WORDS.map((w) => [w.id, w]));
export const BY_DEFINITION = new Map(WORDS.map((w) => [w.definition, w]));
const BY_PASSAGE = new Map(WORDS.flatMap((w) => w.questions.map((q) => [q.passage.replace(/\s+/g, ' '), q] as const)));

export async function open(page: Page, route = ''): Promise<void> {
  await page.goto(`./#/${route}`);
  await expect(page.locator('h1').first()).toBeVisible();
}

/** Choose one of the pill-style radio or checkbox options by its visible label. */
export async function pickOption(page: Page, label: string | RegExp): Promise<void> {
  const text = typeof label === 'string' ? new RegExp(`^${escapeRe(label)}$`) : label;
  await page.locator('.option').filter({ hasText: text }).click();
}

/** Automatically accept confirm() dialogs (import, reset). */
const handled = new WeakSet<Page>();
export function acceptDialogs(page: Page): void {
  if (handled.has(page)) return;
  handled.add(page);
  page.on('dialog', (d) => void d.accept());
}

/** The "Question 3 of 10" label in the practice header. */
export const questionLabel = (page: Page) => page.locator('.testbar strong');

export async function setBatchSize(page: Page, n: number): Promise<void> {
  await open(page, 'settings');
  await page.getByLabel('Words per learning batch').fill(String(n));
  await expect(page.getByLabel('Words per learning batch')).toHaveValue(String(n));
}

/** Go through the Learn flow for one batch: study, pass the check, write a sentence. */
export async function learnBatch(page: Page, count: number): Promise<string[]> {
  await setBatchSize(page, count);
  await open(page, 'learn');
  await page.getByTestId('start-learn').click();
  const learned: string[] = [];
  for (let i = 0; i < count; i++) {
    const card = page.getByTestId('study-card');
    await expect(card).toBeVisible();
    const word = (await card.locator('.headword').innerText()).trim();
    const definition = (await card.locator('.definition').innerText()).trim();
    learned.push(word);
    await page.getByTestId('to-check').click();
    await page.getByTestId('check-card').getByRole('radio', { name: definition, exact: false }).click();
    await page.getByTestId('after-check').click();
    await page.getByTestId('sentence-input').fill(`My teacher used the word ${word} in class today.`);
    await page.getByTestId('save-sentence').click();
  }
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible();
  return learned;
}

/** The right answer text for the practice question now on screen. */
export async function practiceAnswer(page: Page): Promise<{ correct: string; wrong: string }> {
  const shown = (await page.getByTestId('passage').innerText()).replace(/\s+/g, ' ').trim();
  for (const [passage, q] of BY_PASSAGE) {
    const [before, after] = passage.split('______');
    if (shown.startsWith(before.trim()) && shown.endsWith(after.trim())) {
      const correct = q.choices[q.answer];
      return { correct, wrong: q.choices.find((c) => c !== correct) as string };
    }
  }
  throw new Error(`No question found for passage: ${shown}`);
}

export const choice = (page: Page, text: string) => page.locator('.choice').filter({ has: page.locator('.choice-text', { hasText: new RegExp(`^[A-D]\\. ${escapeRe(text)}$`) }) });

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DAY = 86_400_000;
const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** A backup file with some study history: 6 words learned over the last 5 days. */
export function seededBackup(now = Date.now()) {
  const today = startOfDay(now);
  const ids = WORDS.slice(0, 6).map((w) => w.id);
  const card = (id: string, stability: number, dueOffset: number, reps: number) => ({
    id,
    stability,
    difficulty: 5,
    due: today + dueOffset * DAY,
    lastReview: now - 2 * DAY,
    reps,
    lapses: 0,
    introduced: now - 5 * DAY,
    sentence: `A sentence with ${id} in it.`,
  });
  return {
    app: 'sat-vocab',
    version: 1,
    exported: new Date(now).toISOString(),
    cards: [card(ids[0], 40, 30, 6), card(ids[1], 25, 12, 5), card(ids[2], 6, 0, 3), card(ids[3], 3, -1, 2), card(ids[4], 2, 1, 2), card(ids[5], 1.2, 3, 1)],
    notes: [{ id: ids[0], starred: true, trick: 'seeded trick' }],
    reviews: [
      { wordId: ids[0], ts: now - 5 * DAY, rating: 3, elapsedDays: 0, first: true },
      { wordId: ids[0], ts: now - 3 * DAY, rating: 3, elapsedDays: 2, first: false },
      { wordId: ids[1], ts: now - 3 * DAY, rating: 4, elapsedDays: 2, first: false },
      { wordId: ids[2], ts: now - 2 * DAY, rating: 2, elapsedDays: 3, first: false },
      { wordId: ids[3], ts: now - 2 * DAY, rating: 1, elapsedDays: 3, first: false },
    ],
    mistakes: [{ wordId: ids[3], ts: now - 2 * DAY, source: 'review', reason: 'forgot', chosen: '', resolved: false }],
    days: [0, 1, 2].map((ago) => ({ day: dayKey(now - ago * DAY), reviews: 12 - ago * 4, learned: 2, practice: ago === 0 ? 5 : 0, quiz: 0, game: 0 })),
    settings: { newPerDay: 10, learnBatch: 10 },
  };
}

export async function importBackup(page: Page, backup: unknown): Promise<void> {
  acceptDialogs(page);
  await open(page, 'settings');
  await page.getByTestId('import').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByTestId('settings-message')).toHaveText('Backup restored.');
}
