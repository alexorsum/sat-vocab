import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/app';
import { dueCards, previewIntervals } from '../lib/scheduler';
import { formatInterval } from '../lib/dates';
import { useHotkeys, useTitle } from '../lib/hooks';
import { speak } from '../lib/speech';
import type { Rating } from '../types';
import { PassageText, SpeakButton, StarButton, clozeSentence } from '../components/WordBits';

const RATINGS: { rating: Rating; label: string; hint: string }[] = [
  { rating: 1, label: 'Again', hint: 'I did not remember' },
  { rating: 2, label: 'Hard', hint: 'I remembered with effort' },
  { rating: 3, label: 'Good', hint: 'I remembered' },
  { rating: 4, label: 'Easy', hint: 'I knew it instantly' },
];

export default function Review() {
  useTitle('Daily Review');
  const { data, user, actions } = useApp();
  // The queue is fixed when the session starts; "Again" cards go to the back.
  const [queue, setQueue] = useState<string[]>(() => dueCards(user.cards.values(), Date.now()).map((c) => c.id));
  const [startCount] = useState(queue.length);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [forgot, setForgot] = useState(0);
  const [busy, setBusy] = useState(false);

  const id = queue[0];
  const card = id ? user.cards.get(id) : undefined;
  const word = id ? data.wordMap.get(id) : undefined;
  // Alternate the direction of recall so the word is practiced both ways.
  const cloze = card ? card.reps % 2 === 1 : false;
  const example = word && card ? word.examples[card.reps % word.examples.length] : undefined;
  const intervals = useMemo(
    () => (card ? previewIntervals(card, Date.now(), user.settings.desiredRetention) : null),
    [card, user.settings.desiredRetention],
  );

  useEffect(() => {
    if (!word || !user.settings.audio) return;
    if (!cloze || revealed) speak(word.word);
  }, [word, cloze, revealed, user.settings.audio]);

  const rate = async (rating: Rating) => {
    if (!card || !revealed || busy) return;
    setBusy(true);
    try {
      const result = await actions.review(card, rating);
      if (rating === 1) {
        setForgot((n) => n + 1);
        if (!result.log.first) await actions.addMistake(card.id, 'review', 'forgot', '');
        setQueue((q) => [...q.slice(1), card.id]);
      } else {
        setQueue((q) => q.slice(1));
      }
      setReviewed((n) => n + 1);
      setRevealed(false);
    } finally {
      setBusy(false);
    }
  };

  useHotkeys({
    ' ': () => setRevealed(true),
    enter: () => setRevealed(true),
    '1': () => void rate(1),
    '2': () => void rate(2),
    '3': () => void rate(3),
    '4': () => void rate(4),
  });

  if (startCount === 0) {
    return (
      <>
        <h1>Daily Review</h1>
        <div className="card center">
          <p>Nothing is due right now.</p>
          <p className="muted">Reviews appear here on the day the app predicts you are about to forget a word.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn primary" to="/learn">
              Learn new words
            </Link>
            <Link className="btn" to="/practice">
              Practice in context
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!card || !word) {
    return (
      <>
        <h1>Review complete</h1>
        <div className="card center" role="status">
          <p style={{ fontSize: '1.2rem' }}>
            You reviewed <strong>{startCount}</strong> {startCount === 1 ? 'word' : 'words'} in {reviewed} {reviewed === 1 ? 'card' : 'cards'}.
          </p>
          {forgot > 0 && <p className="muted">{forgot} came back for a second look. That is normal, and it is how they stick.</p>}
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn primary" to="/learn">
              Learn new words
            </Link>
            <Link className="btn" to="/practice">
              Practice in context
            </Link>
            <Link className="btn" to="/">
              Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  const remaining = queue.length;
  const trick = user.notes.get(word.id)?.trick;

  return (
    <>
      <div className="row spread">
        <h1>Daily Review</h1>
        <span className="muted" aria-live="polite" data-testid="remaining">
          {remaining} left
        </span>
      </div>
      <div className="progressbar" aria-hidden="true" style={{ marginBottom: 14 }}>
        <div style={{ width: `${Math.round(((startCount - new Set(queue).size) / startCount) * 100)}%` }} />
      </div>

      <div className="card flash">
        {cloze && example ? (
          <>
            <p className="muted small">Which word fits? Say it to yourself, then check.</p>
            <p className="definition">{word.definition}</p>
            <p className="passage" style={{ textAlign: 'left' }}>
              <PassageText text={clozeSentence(example.text, word.word)} fill={revealed ? undefined : undefined} />
            </p>
          </>
        ) : (
          <>
            <p className="muted small">What does this word mean? Say it to yourself, then check.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <p className="headword" data-testid="review-word">
                {word.word}
              </p>
              <SpeakButton text={word.word} />
            </div>
            <p className="muted">{word.pos}</p>
          </>
        )}

        {!revealed ? (
          <button className="btn primary block" onClick={() => setRevealed(true)} data-testid="reveal">
            Show answer <kbd>Space</kbd>
          </button>
        ) : (
          <div aria-live="polite" style={{ textAlign: 'left' }} className="stack" data-testid="answer">
            <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />
            <div className="row">
              <p className="headword" style={{ fontSize: '1.6rem' }}>
                {word.word}
              </p>
              <SpeakButton text={word.word} />
              <StarButton id={word.id} word={word.word} />
            </div>
            <p className="definition">{word.definition}</p>
            {example && (
              <ul className="examples">
                <li>
                  <span className="setting">{example.setting}</span>
                  {example.text}
                </li>
              </ul>
            )}
            {card.sentence && (
              <p className="small">
                <span className="muted">Your sentence: </span>
                {card.sentence}
              </p>
            )}
            {trick && (
              <p className="small">
                <span className="muted">Your memory trick: </span>
                {trick}
              </p>
            )}
            <p className="small">
              <Link to={`/word/${word.id}`}>Full entry</Link>
            </p>
          </div>
        )}
      </div>

      {revealed && intervals && (
        <div className="rating-row" role="group" aria-label="How well did you remember?">
          {RATINGS.map((r) => (
            <button key={r.rating} className={`btn rate-${r.rating}`} onClick={() => void rate(r.rating)} disabled={busy} title={r.hint} data-rating={r.rating}>
              <span>
                {r.label} <kbd>{r.rating}</kbd>
              </span>
              <span className="ivl">{formatInterval(intervals[r.rating])}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
