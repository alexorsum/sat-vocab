/** App-wide state: the word data (read-only) and the student's saved progress. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Card, DayLog, Mistake, MistakeReason, MistakeSource, Note, Rating, Root, Settings, Word } from '../types';
import * as db from '../db/db';
import { DEFAULT_SETTINGS, type Backup } from '../lib/backup';
import { dayKey } from '../lib/dates';
import { newCard, rateCard, type RateResult } from '../lib/scheduler';

export interface AppData {
  words: Word[];
  wordMap: Map<string, Word>;
  roots: Root[];
  rootMap: Map<string, Root>;
}

export interface UserState {
  cards: Map<string, Card>;
  notes: Map<string, Note>;
  mistakes: Mistake[];
  days: Map<string, DayLog>;
  settings: Settings;
}

export interface Actions {
  learnWord(id: string, sentence: string): Promise<void>;
  review(card: Card, rating: Rating): Promise<RateResult>;
  addMistake(wordId: string, source: MistakeSource, reason: MistakeReason, chosen: string): Promise<void>;
  setMistakeReason(key: number, reason: MistakeReason): Promise<void>;
  resolveMistakes(wordId: string): Promise<void>;
  setMistakeResolved(key: number, resolved: boolean): Promise<void>;
  toggleStar(id: string): Promise<void>;
  setTrick(id: string, trick: string): Promise<void>;
  setSentence(id: string, sentence: string): Promise<void>;
  bumpDay(field: keyof Omit<DayLog, 'day'>, by?: number): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  exportBackup(): Promise<Backup>;
  importBackup(data: unknown): Promise<void>;
  resetAll(): Promise<void>;
}

interface Ctx {
  data: AppData;
  user: UserState;
  actions: Actions;
}

const AppContext = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

const emptyDay = (day: string): DayLog => ({ day, reviews: 0, learned: 0, practice: 0, quiz: 0, game: 0 });

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return (await res.json()) as T;
}

function toUserState(loaded: db.Loaded): UserState {
  return {
    cards: new Map(loaded.cards.map((c) => [c.id, c])),
    notes: new Map(loaded.notes.map((n) => [n.id, n])),
    mistakes: loaded.mistakes,
    days: new Map(loaded.days.map((d) => [d.day, d])),
    settings: loaded.settings,
  };
}

function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem('sat-vocab-theme', theme);
  } catch {
    // Private browsing may block localStorage; the theme still applies for this visit.
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [user, setUser] = useState<UserState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userRef = useRef<UserState | null>(null);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wordFile, rootFile, loaded] = await Promise.all([
          fetchJson<{ words: Word[] }>('data/words.json'),
          fetchJson<{ roots: Root[] }>('data/roots.json'),
          db.loadAll(),
        ]);
        if (cancelled) return;
        setData({
          words: wordFile.words,
          wordMap: new Map(wordFile.words.map((w) => [w.id, w])),
          roots: rootFile.roots,
          rootMap: new Map(rootFile.roots.map((r) => [r.id, r])),
        });
        setUser(toUserState(loaded));
        applyTheme(loaded.settings.theme);
        // Ask the browser not to clear our data when storage runs low.
        void navigator.storage?.persist?.().catch(() => false);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((fn: (u: UserState) => UserState) => {
    setUser((u) => (u ? fn(u) : u));
  }, []);

  const bumpDay = useCallback<Actions['bumpDay']>(
    async (field, by = 1) => {
      const key = dayKey(Date.now());
      const current = userRef.current?.days.get(key) ?? emptyDay(key);
      const next = { ...current, [field]: current[field] + by };
      update((u) => ({ ...u, days: new Map(u.days).set(key, next) }));
      // Keep the ref fresh so several bumps in one tick add up.
      if (userRef.current) userRef.current = { ...userRef.current, days: new Map(userRef.current.days).set(key, next) };
      await db.putDay(next);
    },
    [update],
  );

  const actions = useMemo<Actions>(() => {
    const putNote = async (id: string, patch: Partial<Note>) => {
      const current = userRef.current?.notes.get(id) ?? { id, starred: false, trick: '' };
      const next = { ...current, ...patch };
      update((u) => ({ ...u, notes: new Map(u.notes).set(id, next) }));
      await db.putNote(next);
    };
    const saveCard = async (card: Card) => {
      update((u) => ({ ...u, cards: new Map(u.cards).set(card.id, card) }));
      await db.putCard(card);
    };
    const replaceMistake = async (m: Mistake) => {
      update((u) => ({ ...u, mistakes: u.mistakes.map((x) => (x.key === m.key ? m : x)) }));
      await db.putMistake(m);
    };
    return {
      async learnWord(id, sentence) {
        if (userRef.current?.cards.has(id)) return;
        await saveCard(newCard(id, Date.now(), sentence.trim()));
        await bumpDay('learned');
      },
      async review(card, rating) {
        const retention = userRef.current?.settings.desiredRetention ?? DEFAULT_SETTINGS.desiredRetention;
        const result = rateCard(card, rating, Date.now(), retention);
        await saveCard(result.card);
        await db.addReview(result.log);
        await bumpDay('reviews');
        return result;
      },
      async addMistake(wordId, source, reason, chosen) {
        const m: Mistake = { wordId, ts: Date.now(), source, reason, chosen, resolved: false };
        const key = await db.addMistake(m);
        update((u) => ({ ...u, mistakes: [...u.mistakes, { ...m, key }] }));
      },
      async setMistakeReason(key, reason) {
        const m = userRef.current?.mistakes.find((x) => x.key === key);
        if (m) await replaceMistake({ ...m, reason });
      },
      async setMistakeResolved(key, resolved) {
        const m = userRef.current?.mistakes.find((x) => x.key === key);
        if (m) await replaceMistake({ ...m, resolved });
      },
      async resolveMistakes(wordId) {
        const open = (userRef.current?.mistakes ?? []).filter((m) => m.wordId === wordId && !m.resolved);
        for (const m of open) await replaceMistake({ ...m, resolved: true });
      },
      async toggleStar(id) {
        await putNote(id, { starred: !(userRef.current?.notes.get(id)?.starred ?? false) });
      },
      async setTrick(id, trick) {
        await putNote(id, { trick });
      },
      async setSentence(id, sentence) {
        const card = userRef.current?.cards.get(id);
        if (card) await saveCard({ ...card, sentence });
      },
      bumpDay,
      async updateSettings(patch) {
        const next = { ...(userRef.current?.settings ?? DEFAULT_SETTINGS), ...patch };
        update((u) => ({ ...u, settings: next }));
        if (patch.theme) applyTheme(next.theme);
        await db.saveSettings(next);
      },
      exportBackup: () => db.exportAll(),
      async importBackup(raw) {
        await db.importAll(raw);
        const loaded = await db.loadAll();
        setUser(toUserState(loaded));
        applyTheme(loaded.settings.theme);
      },
      async resetAll() {
        await db.resetAll();
        const loaded = await db.loadAll();
        setUser(toUserState(loaded));
        applyTheme(loaded.settings.theme);
      },
    };
  }, [bumpDay, update]);

  if (error) {
    return (
      <div className="boot" role="alert">
        <h1>Something went wrong</h1>
        <p>The app could not load its data: {error}</p>
        <p>Check your connection and reload the page. Once the app has loaded one time, it works offline.</p>
        <button className="btn primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
  if (!data || !user) {
    return (
      <div className="boot" role="status" aria-live="polite">
        <p>Loading your words…</p>
      </div>
    );
  }
  return <AppContext.Provider value={{ data, user, actions }}>{children}</AppContext.Provider>;
}

// ---------- Selectors shared by several pages ----------

/** Words not yet learned, in ranked order, limited to the tiers chosen in Settings. */
export function unseenWords(data: AppData, user: UserState): Word[] {
  const tiers = new Set(user.settings.tiers);
  return data.words.filter((w) => !user.cards.has(w.id) && tiers.has(w.tier));
}

export function learnedToday(user: UserState, now = Date.now()): number {
  return user.days.get(dayKey(now))?.learned ?? 0;
}

/** How many new words the daily limit still allows today. */
export function newAllowance(data: AppData, user: UserState, now = Date.now()): number {
  const left = Math.max(0, user.settings.newPerDay - learnedToday(user, now));
  return Math.min(left, unseenWords(data, user).length);
}

export function learnedWords(data: AppData, user: UserState): Word[] {
  return data.words.filter((w) => user.cards.has(w.id));
}

export function missedWords(data: AppData, user: UserState): Word[] {
  const ids = new Set(user.mistakes.filter((m) => !m.resolved).map((m) => m.wordId));
  return data.words.filter((w) => ids.has(w.id));
}

export function starredWords(data: AppData, user: UserState): Word[] {
  return data.words.filter((w) => user.notes.get(w.id)?.starred);
}
