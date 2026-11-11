import { Link, useParams } from 'react-router-dom';
import { useApp } from '../state/app';
import { useTitle } from '../lib/hooks';
import { StatusBadge } from '../components/WordBits';

export default function RootDetail() {
  const { id = '' } = useParams();
  const { data, user } = useApp();
  const root = data.rootMap.get(id);
  useTitle(root ? `${root.form} word family` : 'Word part');
  if (!root) {
    return (
      <>
        <h1>Word part not found</h1>
        <Link to="/roots">Back to Roots Explorer</Link>
      </>
    );
  }
  const family = root.words.map((w) => data.wordMap.get(w)).filter((w): w is NonNullable<typeof w> => Boolean(w));
  return (
    <>
      <p className="small">
        <Link to="/roots">Roots Explorer</Link>
      </p>
      <h1 className="headword">{root.form}</h1>
      <div className="card stack">
        <div className="row">
          <span className="badge">{root.type}</span>
          <span className="badge">{root.origin}</span>
        </div>
        <p className="definition">
          Means: <strong>{root.meaning}</strong>
        </p>
        {root.examples.length > 0 && (
          <p>
            <span className="muted">Everyday examples: </span>
            {root.examples.join(', ')}
          </p>
        )}
      </div>
      <h2>Word family ({family.length})</h2>
      {family.length === 0 ? (
        <p className="muted">No words on the list use this part yet.</p>
      ) : (
        <ul className="wordlist">
          {family.map((w) => (
            <li key={w.id}>
              <Link className="wordlink" to={`/word/${w.id}`}>
                <strong>{w.word}</strong> <StatusBadge card={user.cards.get(w.id)} />
                <span className="def">{w.definition}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
