import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/app';
import { useTitle } from '../lib/hooks';
import { cardStatus, forecast, retentionRate } from '../lib/scheduler';
import { DAY_MS, addDays, computeStreak, dayKey, startOfDay } from '../lib/dates';
import { getReviews } from '../db/db';
import type { DayLog, ReviewLog } from '../types';

const WEEKS = 18;
const FORECAST_DAYS = 14;

function dayTotal(d: DayLog | undefined): number {
  return d ? d.reviews + d.learned + d.practice + d.quiz + d.game : 0;
}
/** Heatmap steps: none, light, moderate, busy, very busy. */
function heatLevel(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total === 0) return 0;
  if (total < 10) return 1;
  if (total < 25) return 2;
  if (total < 50) return 3;
  return 4;
}
function describeDay(d: DayLog | undefined): string {
  if (!d || dayTotal(d) === 0) return 'no study';
  const parts: string[] = [];
  if (d.reviews) parts.push(`${d.reviews} ${d.reviews === 1 ? 'review' : 'reviews'}`);
  if (d.learned) parts.push(`${d.learned} new ${d.learned === 1 ? 'word' : 'words'}`);
  if (d.practice) parts.push(`${d.practice} practice ${d.practice === 1 ? 'question' : 'questions'}`);
  if (d.quiz) parts.push(`${d.quiz} quiz ${d.quiz === 1 ? 'question' : 'questions'}`);
  if (d.game) parts.push(`${d.game} ${d.game === 1 ? 'game' : 'games'}`);
  return parts.join(', ');
}
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export default function Progress() {
  useTitle('Progress');
  const { data, user } = useApp();
  const now = Date.now();
  const [logs, setLogs] = useState<ReviewLog[] | null>(null);
  const [heatNote, setHeatNote] = useState('');
  const [barNote, setBarNote] = useState('');

  useEffect(() => {
    let live = true;
    void getReviews().then((r) => live && setLogs(r));
    return () => {
      live = false;
    };
  }, [user.cards]);

  const counts = useMemo(() => {
    let learning = 0;
    let mastered = 0;
    for (const c of user.cards.values()) {
      if (cardStatus(c) === 'mastered') mastered += 1;
      else learning += 1;
    }
    return { learning, mastered, seen: user.cards.size, unseen: data.words.length - user.cards.size };
  }, [user.cards, data.words.length]);

  const streak = computeStreak(user.days.keys(), now);
  const retention = logs ? retentionRate(logs, now - 30 * DAY_MS) : null;
  const upcoming = useMemo(() => forecast(user.cards.values(), now, FORECAST_DAYS), [user.cards, now]);
  const maxBar = Math.max(1, ...upcoming);

  // Calendar grid: columns are weeks (Sunday at the top), ending with this week.
  const today = startOfDay(now);
  const gridStart = addDays(today, -(new Date(today).getDay() + (WEEKS - 1) * 7));
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const ts = addDays(gridStart, i);
    return { ts, log: user.days.get(dayKey(ts)), future: ts > today };
  });
  const recent = Array.from({ length: 14 }, (_, i) => addDays(today, -i));

  return (
    <>
      <h1>Progress</h1>
      <div className="grid three" style={{ marginBottom: 16 }}>
        <Stat value={counts.seen} label={`words seen of ${data.words.length}`} testId="stat-seen" />
        <Stat value={counts.learning} label="still learning" testId="stat-learning" />
        <Stat value={counts.mastered} label="mastered (memory lasts 3+ weeks)" testId="stat-mastered" />
        <Stat value={retention ? `${Math.round(retention.rate * 100)}%` : 'n/a'} label={retention ? `retention, last 30 days (${retention.count} reviews)` : 'retention (shows after your first spaced reviews)'} testId="stat-retention" />
        <Stat value={streak.current} label={`day streak (longest: ${streak.longest})`} testId="stat-streak" />
        <Stat value={counts.unseen} label="words not started" testId="stat-unseen" />
      </div>
      <div className="progressbar" role="img" aria-label={`${counts.seen} of ${data.words.length} words seen`} style={{ marginBottom: 20 }}>
        <div style={{ width: `${(counts.seen / data.words.length) * 100}%` }} />
      </div>

      <section className="card" aria-labelledby="heat-title">
        <h2 id="heat-title" className="chart-title">
          Study calendar
        </h2>
        <p className="muted small">Each square is one day over the last {WEEKS} weeks. A stronger color means more study.</p>
        <div className="heatmap-wrap">
          <div className="heatmap" role="group" aria-label="Study activity by day" data-testid="heatmap">
            {cells.map((c) => {
              const total = dayTotal(c.log);
              const text = `${fmtDate(c.ts)}: ${describeDay(c.log)}`;
              return (
                <button
                  key={c.ts}
                  type="button"
                  className={`cell l${heatLevel(total)}${c.future ? ' future' : ''}`}
                  aria-label={text}
                  tabIndex={c.future ? -1 : 0}
                  onMouseEnter={() => setHeatNote(text)}
                  onFocus={() => setHeatNote(text)}
                  onClick={() => setHeatNote(text)}
                />
              );
            })}
          </div>
        </div>
        <div className="heat-legend" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="cell" style={{ background: `var(--heat-${l})` }} />
          ))}
          More
        </div>
        <p className="chart-readout" aria-live="polite">
          {heatNote || 'Hover over or tab to a square to see that day.'}
        </p>
        <details>
          <summary>Show the last 14 days as a table</summary>
          <table className="data">
            <thead>
              <tr>
                <th>Day</th>
                <th className="num">Reviews</th>
                <th className="num">New words</th>
                <th className="num">Practice</th>
                <th className="num">Quiz</th>
                <th className="num">Games</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((ts) => {
                const d = user.days.get(dayKey(ts));
                return (
                  <tr key={ts}>
                    <td>{fmtDate(ts)}</td>
                    <td className="num">{d?.reviews ?? 0}</td>
                    <td className="num">{d?.learned ?? 0}</td>
                    <td className="num">{d?.practice ?? 0}</td>
                    <td className="num">{d?.quiz ?? 0}</td>
                    <td className="num">{d?.game ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      </section>

      <section className="card" aria-labelledby="forecast-title">
        <h2 id="forecast-title" className="chart-title">
          Reviews due, next {FORECAST_DAYS} days
        </h2>
        <p className="muted small">How many words the schedule will bring back each day. Today includes anything overdue.</p>
        {counts.seen === 0 ? (
          <p className="muted">
            Nothing is scheduled yet. <Link to="/learn">Learn your first words</Link> to start the schedule.
          </p>
        ) : (
          <>
            <div className="bars" role="group" aria-label="Reviews due per day" data-testid="forecast">
              {upcoming.map((n, i) => {
                const ts = addDays(today, i);
                const text = `${i === 0 ? 'Today' : fmtDate(ts)}: ${n} ${n === 1 ? 'review' : 'reviews'} due`;
                return (
                  <button key={i} type="button" className="slot" aria-label={text} onMouseEnter={() => setBarNote(text)} onFocus={() => setBarNote(text)} onClick={() => setBarNote(text)}>
                    <span className="cap" aria-hidden="true">
                      {n > 0 ? n : ''}
                    </span>
                    <span className="bar" style={{ height: `${(n / maxBar) * 82}%` }} />
                  </button>
                );
              })}
            </div>
            <div className="bar-labels" aria-hidden="true">
              {upcoming.map((_, i) => {
                const d = new Date(addDays(today, i));
                return <span key={i}>{i === 0 ? 'Today' : i % 2 === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : ''}</span>;
              })}
            </div>
            <p className="chart-readout" aria-live="polite">
              {barNote || 'Hover over or tab to a bar to see the exact day and count.'}
            </p>
            <details>
              <summary>Show the forecast as a table</summary>
              <table className="data">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th className="num">Reviews due</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((n, i) => (
                    <tr key={i}>
                      <td>{i === 0 ? 'Today' : fmtDate(addDays(today, i))}</td>
                      <td className="num">{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </section>
      <p className="muted small">
        These numbers come from what you actually recalled, not from how well you feel you know the words. That makes them a more honest
        guide.
      </p>
    </>
  );
}

function Stat({ value, label, testId }: { value: number | string; label: string; testId: string }) {
  return (
    <div className="stat">
      <div className="value" data-testid={testId}>
        {value}
      </div>
      <div className="label">{label}</div>
    </div>
  );
}
