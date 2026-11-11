import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import * as db from '../../src/db/db';
import { DEFAULT_SETTINGS, cleanSettings, parseBackup } from '../../src/lib/backup';
import { newCard, rateCard } from '../../src/lib/scheduler';

const NOW = new Date(2026, 10, 11, 9).getTime();

beforeEach(async () => {
  await db.resetAll();
});

describe('saving and loading', () => {
  it('starts empty with default settings', async () => {
    const loaded = await db.loadAll();
    expect(loaded.cards).toEqual([]);
    expect(loaded.mistakes).toEqual([]);
    expect(loaded.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps cards, notes, reviews, mistakes, days, and settings', async () => {
    const { card, log } = rateCard(newCard('plausible', NOW, 'A plausible excuse.'), 3, NOW, 0.9);
    await db.putCard(card);
    await db.addReview(log);
    await db.putNote({ id: 'plausible', starred: true, trick: 'applause-ible' });
    const key = await db.addMistake({ wordId: 'austere', ts: NOW, source: 'practice', reason: 'wrong-tone', chosen: 'ornate', resolved: false });
    await db.putDay({ day: '2026-11-11', reviews: 1, learned: 1, practice: 0, quiz: 0, game: 0 });
    await db.saveSettings({ ...DEFAULT_SETTINGS, newPerDay: 15, theme: 'dark' });

    const loaded = await db.loadAll();
    expect(loaded.cards).toEqual([card]);
    expect(loaded.notes).toEqual([{ id: 'plausible', starred: true, trick: 'applause-ible' }]);
    expect(loaded.mistakes).toEqual([{ key, wordId: 'austere', ts: NOW, source: 'practice', reason: 'wrong-tone', chosen: 'ornate', resolved: false }]);
    expect(loaded.days).toHaveLength(1);
    expect(loaded.settings.newPerDay).toBe(15);
    expect(loaded.settings.theme).toBe('dark');
    expect(await db.getReviews()).toHaveLength(1);
  });
});

describe('backup export and import', () => {
  it('round-trips everything through a JSON file', async () => {
    const { card, log } = rateCard(newCard('plausible', NOW, 'A plausible excuse.'), 4, NOW, 0.9);
    await db.putCards([card, newCard('austere', NOW, 'An austere room.')]);
    await db.addReview(log);
    await db.putNote({ id: 'austere', starred: true, trick: '' });
    await db.addMistake({ wordId: 'austere', ts: NOW, source: 'quiz', reason: 'spelling', chosen: 'austeer', resolved: true });
    await db.putDay({ day: '2026-11-11', reviews: 1, learned: 2, practice: 3, quiz: 4, game: 1 });
    await db.saveSettings({ ...DEFAULT_SETTINGS, desiredRetention: 0.85, tiers: [1, 2] });

    const file = JSON.stringify(await db.exportAll());
    expect(JSON.parse(file).app).toBe('sat-vocab');
    await db.resetAll();
    expect((await db.loadAll()).cards).toEqual([]);

    await db.importAll(JSON.parse(file));
    const loaded = await db.loadAll();
    expect(loaded.cards.map((c) => c.id).sort()).toEqual(['austere', 'plausible']);
    expect(loaded.cards.find((c) => c.id === 'plausible')).toEqual(card);
    expect(loaded.notes).toEqual([{ id: 'austere', starred: true, trick: '' }]);
    expect(loaded.mistakes).toHaveLength(1);
    expect(loaded.mistakes[0]).toMatchObject({ wordId: 'austere', reason: 'spelling', resolved: true });
    expect(loaded.days[0]).toEqual({ day: '2026-11-11', reviews: 1, learned: 2, practice: 3, quiz: 4, game: 1 });
    expect(loaded.settings.desiredRetention).toBe(0.85);
    expect(loaded.settings.tiers).toEqual([1, 2]);
    expect(await db.getReviews()).toHaveLength(1);
  });

  it('importing replaces what was there', async () => {
    await db.putCard(newCard('old', NOW));
    await db.importAll({ app: 'sat-vocab', version: 1, cards: [newCard('fresh', NOW)] });
    expect((await db.loadAll()).cards.map((c) => c.id)).toEqual(['fresh']);
  });

  it('rejects files that are not backups, and leaves data untouched', async () => {
    await db.putCard(newCard('keep', NOW));
    await expect(db.importAll({ hello: 'world' })).rejects.toThrow(/does not look like a SAT Vocab backup/);
    await expect(db.importAll([1, 2, 3])).rejects.toThrow();
    await expect(db.importAll({ app: 'sat-vocab', version: 99 })).rejects.toThrow(/newer version/);
    await expect(db.importAll({ app: 'sat-vocab', version: 1, cards: [{ id: 'x' }] })).rejects.toThrow(/card is damaged/);
    await expect(db.importAll({ app: 'sat-vocab', version: 1, cards: 'nope' })).rejects.toThrow(/should be a list/);
    expect((await db.loadAll()).cards.map((c) => c.id)).toEqual(['keep']);
  });

  it('fills in missing optional fields', () => {
    const b = parseBackup({ app: 'sat-vocab', version: 1, cards: [{ id: 'a', stability: 2, difficulty: 5, due: NOW }], reviews: [{ wordId: 'a', ts: NOW, rating: 3 }] });
    expect(b.cards[0]).toMatchObject({ reps: 0, lapses: 0, sentence: '', lastReview: null });
    expect(b.reviews[0]).toMatchObject({ elapsedDays: 0, first: false });
    expect(b.notes).toEqual([]);
  });

  it('cleans settings to safe values', () => {
    expect(cleanSettings({ newPerDay: 5000, learnBatch: 0, desiredRetention: 0.2, theme: 'neon', tiers: [9], audio: 'yes' })).toEqual({
      newPerDay: 100,
      learnBatch: 1,
      desiredRetention: 0.75,
    });
    expect(cleanSettings({ theme: 'dark', tiers: [3, 1, 1], audio: true })).toEqual({ theme: 'dark', tiers: [1, 3], audio: true });
  });
});
