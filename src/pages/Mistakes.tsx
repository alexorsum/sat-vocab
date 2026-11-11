import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/app';
import { useTitle } from '../lib/hooks';
import { REASONS, REASON_HELP, REASON_LABEL } from '../lib/reasons';
import type { Mistake, MistakeReason } from '../types';

const SOURCE_LABEL: Record<Mistake['source'], string> = { review: 'Daily review', practice: 'Words in Context', quiz: 'Quiz' };

export default function Mistakes() {
  useTitle('Mistake Log');
  const { data, user, actions } = useApp();
  const [filter, setFilter] = useState<MistakeReason | 'all'>('all');
  const [showResolved, setShowResolved] = useState(false);

  const open = useMemo(() => user.mistakes.filter((m) => !m.resolved), [user.mistakes]);
  const counts = useMemo(() => {
    const c = new Map<MistakeReason, number>();
    for (const m of open) c.set(m.reason, (c.get(m.reason) ?? 0) + 1);
    return c;
  }, [open]);
  const visible = useMemo(() => {
    const list = (showResolved ? user.mistakes : open).filter((m) => filter === 'all' || m.reason === filter);
    const groups = new Map<string, Mistake[]>();
    for (const m of [...list].sort((a, b) => b.ts - a.ts)) {
      const g = groups.get(m.wordId);
      if (g) g.push(m);
      else groups.set(m.wordId, [m]);
    }
    return [...groups.entries()];
  }, [user.mistakes, open, filter, showResolved]);
  const missedCount = new Set(open.map((m) => m.wordId)).size;
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <h1>Mistake Log</h1>
      <p className="muted">
        Every miss is recorded with the reason it was wrong. Knowing your most common kind of mistake tells you what to watch for on test
        day.
      </p>

      {open.length === 0 ? (
        <div className="card center">
          <p>No open mistakes. Misses from reviews, practice, and quizzes will show up here.</p>
          <Link className="btn primary" to="/practice">
            Practice in context
          </Link>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>
              {missedCount} missed {missedCount === 1 ? 'word' : 'words'} to drill
            </h2>
            <div className="row">
              <Link className="btn primary" to="/quiz?pool=missed" data-testid="drill-quiz">
                Drill with a quiz
              </Link>
              <Link className="btn" to="/practice?pool=missed" data-testid="drill-practice">
                Drill in context
              </Link>
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>
              In a drill, a word leaves this list once you answer it correctly.
            </p>
          </div>
          {top && (
            <p className="notice">
              Your most common mistake: <strong>{REASON_LABEL[top[0]]}</strong> ({top[1]}). {REASON_HELP[top[0]]}
            </p>
          )}
        </>
      )}

      <div className="filters">
        <div>
          <label htmlFor="reason-filter">Reason</label>
          <select id="reason-filter" value={filter} onChange={(e) => setFilter(e.target.value as MistakeReason | 'all')}>
            <option value="all">All reasons ({open.length})</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {REASON_LABEL[r]} ({counts.get(r) ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <label className="row" style={{ color: 'var(--text)', fontSize: '1rem', minHeight: 46 }}>
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} style={{ width: 20, height: 20 }} />
            Show resolved
          </label>
        </div>
      </div>

      {visible.map(([wordId, list]) => {
        const word = data.wordMap.get(wordId);
        return (
          <section key={wordId} className="card" aria-label={`Mistakes for ${word?.word ?? wordId}`} data-testid="mistake-group">
            <h3 style={{ fontSize: '1.15rem' }}>
              <Link to={`/word/${wordId}`}>{word?.word ?? wordId}</Link>
            </h3>
            {word && <p className="muted">{word.definition}</p>}
            {list.map((m) => (
              <div key={m.key} className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                <span className="small muted" style={{ flex: '1 1 160px' }}>
                  {new Date(m.ts).toLocaleDateString()} · {SOURCE_LABEL[m.source]}
                  {m.chosen && (
                    <>
                      {' '}
                      · you answered <strong style={{ color: 'var(--text)' }}>{m.chosen}</strong>
                    </>
                  )}
                  {m.resolved && <span className="badge good" style={{ marginLeft: 6 }}>resolved</span>}
                </span>
                <span style={{ flex: '0 1 210px' }}>
                  <label className="sr-only" htmlFor={`reason-${m.key}`}>
                    Reason for this mistake
                  </label>
                  <select
                    id={`reason-${m.key}`}
                    value={m.reason}
                    onChange={(e) => m.key !== undefined && void actions.setMistakeReason(m.key, e.target.value as MistakeReason)}
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {REASON_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </span>
                <button className="btn small" onClick={() => m.key !== undefined && void actions.setMistakeResolved(m.key, !m.resolved)}>
                  {m.resolved ? 'Reopen' : 'Mark resolved'}
                </button>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
