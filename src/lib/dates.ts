/** Local-calendar date helpers. All "days" in the app are the student's local days. */

export const DAY_MS = 86_400_000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Add whole calendar days (safe across daylight saving changes). */
export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Number of calendar days from `from` to `to` (0 if the same day). */
export function dayDiff(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

/** YYYY-MM-DD in local time. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDayKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * Current and longest streak of active days.
 * The current streak still counts if today has no activity yet but yesterday did.
 */
export function computeStreak(activeDays: Iterable<string>, now: number): { current: number; longest: number } {
  const set = new Set(activeDays);
  if (set.size === 0) return { current: 0, longest: 0 };
  let current = 0;
  let cursor = startOfDay(now);
  if (!set.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  while (set.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const key of sorted) {
    const ts = parseDayKey(key);
    run = prev !== null && dayDiff(prev, ts) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = ts;
  }
  return { current, longest: Math.max(longest, current) };
}

export function formatInterval(days: number): string {
  if (days < 1) return '10 min';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.round((days / 30) * 10) / 10;
    return `${months} mo`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return `${years} yr`;
}
