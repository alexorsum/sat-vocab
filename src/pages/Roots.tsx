import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/app';
import { useTitle } from '../lib/hooks';
import type { Root } from '../types';

const TYPES: { value: 'all' | Root['type']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'prefix', label: 'Prefixes' },
  { value: 'root', label: 'Roots' },
  { value: 'suffix', label: 'Suffixes' },
];

export default function Roots() {
  useTitle('Roots Explorer');
  const { data } = useApp();
  const [type, setType] = useState<'all' | Root['type']>('all');
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.roots.filter(
      (r) => (type === 'all' || r.type === type) && (q === '' || r.form.toLowerCase().includes(q) || r.meaning.toLowerCase().includes(q)),
    );
  }, [data.roots, type, query]);

  return (
    <>
      <div className="row spread">
        <h1>Roots Explorer</h1>
        <Link className="btn primary" to="/roots/quiz">
          Quiz me on roots
        </Link>
      </div>
      <p className="muted">
        Many SAT words are built from a small set of Latin and Greek parts. Knowing a part helps you remember a whole family of words and
        make a smart guess at a word you have never seen.
      </p>
      <div className="options" role="group" aria-label="Type of word part" style={{ marginBottom: 10 }}>
        {TYPES.map((t) => (
          <label key={t.value} className="option">
            <input type="radio" name="root-type" checked={type === t.value} onChange={() => setType(t.value)} />
            <span>{t.label}</span>
          </label>
        ))}
      </div>
      <label className="sr-only" htmlFor="root-search">
        Search word parts
      </label>
      <input id="root-search" type="search" placeholder="Search by part or meaning" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className="muted small" role="status" style={{ marginTop: 8 }}>
        {shown.length} word {shown.length === 1 ? 'part' : 'parts'}
      </p>
      <ul className="wordlist">
        {shown.map((r) => (
          <li key={r.id}>
            <Link className="wordlink" to={`/roots/${encodeURIComponent(r.id)}`}>
              <strong>{r.form}</strong> <span className="badge">{r.type}</span> <span className="badge">{r.words.length} words</span>
              <span className="def">{r.meaning}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
