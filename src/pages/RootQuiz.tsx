import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/app';
import { buildRootQuiz } from '../lib/quiz';
import { useHotkeys, useTitle } from '../lib/hooks';
import Choices from '../components/Choices';

export default function RootQuiz() {
  useTitle('Roots quiz');
  const { data, actions } = useApp();
  const [round, setRound] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => buildRootQuiz(data.roots, data.wordMap, 10, Math.random), [data, round]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const item = items[idx];
  const root = item ? data.rootMap.get(item.rootId) : undefined;

  const pick = (i: number) => {
    if (selected !== null || !item) return;
    setSelected(i);
    if (i === item.answer) setScore((s) => s + 1);
  };
  const next = async () => {
    if (selected === null) return;
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setSelected(null);
    } else {
      await actions.bumpDay('quiz', items.length);
      setFinished(true);
    }
  };
  useEffect(() => {
    if (selected !== null) nextRef.current?.focus();
  }, [selected]);
  const keys: Record<string, () => void> = { enter: () => void next() };
  [0, 1, 2, 3].forEach((i) => {
    keys['abcd'[i]] = () => pick(i);
    keys[String(i + 1)] = () => pick(i);
  });
  useHotkeys(keys, !finished);

  if (finished) {
    return (
      <>
        <h1>Roots quiz results</h1>
        <div className="card center" role="status">
          <p style={{ fontSize: '1.3rem' }} data-testid="root-score">
            <strong>
              {score} / {items.length}
            </strong>{' '}
            correct
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button
              className="btn primary"
              onClick={() => {
                setRound(round + 1);
                setIdx(0);
                setSelected(null);
                setScore(0);
                setFinished(false);
              }}
            >
              Try another round
            </button>
            <Link className="btn" to="/roots">
              Back to roots
            </Link>
          </div>
        </div>
      </>
    );
  }
  if (!item) return null;
  return (
    <>
      <div className="row spread">
        <h1>Roots quiz</h1>
        <span className="muted">
          {idx + 1} of {items.length}
        </span>
      </div>
      <div className="card">
        <p className="muted">{item.prompt}</p>
        <p className="headword" style={{ marginBottom: 14 }}>
          {item.stem}
        </p>
        <Choices label={item.prompt} choices={item.choices} selected={selected} reveal={selected === null ? null : item.answer} onSelect={pick} />
        {selected !== null && root && (
          <p role="status" className={`notice ${selected === item.answer ? 'good' : 'bad'}`} style={{ marginTop: 12 }}>
            <strong>{root.form}</strong> means "{root.meaning}".{' '}
            {root.words.length > 0 && <>Family: {root.words.slice(0, 5).join(', ')}. </>}
            <Link to={`/roots/${encodeURIComponent(root.id)}`}>See the family</Link>
          </p>
        )}
      </div>
      <button ref={nextRef} className="btn primary block" disabled={selected === null} onClick={() => void next()} data-testid="root-next">
        {idx + 1 < items.length ? 'Next' : 'See results'} <kbd>Enter</kbd>
      </button>
    </>
  );
}
