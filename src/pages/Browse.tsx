import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/app';
import { useHotkeys, useTitle } from '../lib/hooks';
import { cardStatus } from '../lib/scheduler';
import { StarButton, StatusBadge } from '../components/WordBits';
import type { Pos, WordStatus } from '../types';

const PAGE = 60;

export default function Browse() {
  useTitle('Word Browser');
  const { data, user } = useApp();
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<'all' | '1' | '2' | '3'>('all');
  const [pos, setPos] = useState<'all' | Pos>('all');
  const [root, setRoot] = useState('all');
  const [status, setStatus] = useState<'all' | WordStatus>('all');
  const [starredOnly, setStarredOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => searchRef.current?.focus() });

  const rootOptions = useMemo(() => data.roots.filter((r) => r.words.length > 0), [data.roots]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.words.filter((w) => {
      if (tier !== 'all' && String(w.tier) !== tier) return false;
      if (pos !== 'all' && w.pos !== pos) return false;
      if (root !== 'all' && !w.parts.includes(root)) return false;
      if (status !== 'all' && cardStatus(user.cards.get(w.id)) !== status) return false;
      if (starredOnly && !user.notes.get(w.id)?.starred) return false;
      if (q === '') return true;
      return w.word.includes(q) || w.definition.toLowerCase().includes(q) || w.synonyms.some((s) => s.includes(q));
    });
  }, [data.words, user.cards, user.notes, query, tier, pos, root, status, starredOnly]);
  const reset = () => setLimit(PAGE);

  return (
    <>
      <h1>Word Browser</h1>
      <label className="sr-only" htmlFor="word-search">
        Search words, meanings, and synonyms
      </label>
      <input
        id="word-search"
        ref={searchRef}
        type="search"
        placeholder="Search words, meanings, synonyms"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          reset();
        }}
        data-testid="search"
      />
      <div className="filters">
        <div>
          <label htmlFor="f-tier">Tier</label>
          <select id="f-tier" value={tier} onChange={(e) => { setTier(e.target.value as typeof tier); reset(); }}>
            <option value="all">All tiers</option>
            <option value="1">Tier 1 (most common)</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3 (rarest)</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-pos">Part of speech</label>
          <select id="f-pos" value={pos} onChange={(e) => { setPos(e.target.value as typeof pos); reset(); }}>
            <option value="all">All</option>
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="adverb">Adverb</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-root">Root or affix</label>
          <select id="f-root" value={root} onChange={(e) => { setRoot(e.target.value); reset(); }}>
            <option value="all">Any</option>
            {rootOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.form} ({r.meaning})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); reset(); }}>
            <option value="all">Any</option>
            <option value="new">New</option>
            <option value="learning">Learning</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <label className="row" style={{ color: 'var(--text)', fontSize: '1rem', minHeight: 46 }}>
            <input type="checkbox" checked={starredOnly} onChange={(e) => { setStarredOnly(e.target.checked); reset(); }} style={{ width: 20, height: 20 }} />
            Starred only
          </label>
        </div>
      </div>
      <p className="muted small" role="status" data-testid="result-count">
        {results.length} {results.length === 1 ? 'word' : 'words'}
      </p>
      <ul className="wordlist" data-testid="word-list">
        {results.slice(0, limit).map((w) => (
          <li key={w.id}>
            <StarButton id={w.id} word={w.word} />
            <Link className="wordlink" to={`/word/${w.id}`}>
              <strong>{w.word}</strong> <span className="muted small">{w.pos}</span> <span className="badge">tier {w.tier}</span>{' '}
              <StatusBadge card={user.cards.get(w.id)} />
              <span className="def">{w.definition}</span>
            </Link>
          </li>
        ))}
      </ul>
      {results.length > limit && (
        <button className="btn block" style={{ marginTop: 12 }} onClick={() => setLimit(limit + PAGE * 2)}>
          Show more ({results.length - limit} left)
        </button>
      )}
    </>
  );
}
