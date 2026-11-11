import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../state/app';
import { useTitle } from '../lib/hooks';
import { currentRecall } from '../lib/scheduler';
import { SpeakButton, StarButton, StatusBadge, WordDetail } from '../components/WordBits';

export default function WordPage() {
  const { id = '' } = useParams();
  const { data, user, actions } = useApp();
  const word = data.wordMap.get(id);
  useTitle(word ? word.word : 'Word');
  const card = user.cards.get(id);
  const note = user.notes.get(id);
  const [trick, setTrick] = useState(note?.trick ?? '');
  const [sentence, setSentence] = useState(card?.sentence ?? '');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    setTrick(user.notes.get(id)?.trick ?? '');
    setSentence(user.cards.get(id)?.sentence ?? '');
    setSaved('');
    // Only reset the form when moving to a different word.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!word) {
    return (
      <>
        <h1>Word not found</h1>
        <p>
          "{id}" is not on the list. <Link to="/browse">Back to the Word Browser</Link>
        </p>
      </>
    );
  }
  const index = data.words.indexOf(word);
  const prev = data.words[index - 1];
  const next = data.words[index + 1];
  const recall = card ? currentRecall(card, Date.now()) : null;

  const saveTrick = async () => {
    if (trick === (note?.trick ?? '')) return;
    await actions.setTrick(word.id, trick.trim());
    setSaved('Memory trick saved.');
  };
  const saveSentence = async () => {
    if (!card || sentence === card.sentence) return;
    await actions.setSentence(word.id, sentence.trim());
    setSaved('Sentence saved.');
  };

  return (
    <>
      <p className="small">
        <Link to="/browse">Word Browser</Link> · rank {word.rank} of {data.words.length}
      </p>
      <div className="row">
        <h1 className="headword">{word.word}</h1>
        <SpeakButton text={word.word} />
        <StarButton id={word.id} word={word.word} />
        <StatusBadge card={card} />
      </div>
      <div className="card">
        <WordDetail word={word} showHead={false} />
      </div>

      <div className="card stack">
        <h2>Your notes</h2>
        <div>
          <label className="field" htmlFor="trick">
            Memory trick
          </label>
          <textarea
            id="trick"
            value={trick}
            onChange={(e) => setTrick(e.target.value)}
            onBlur={() => void saveTrick()}
            placeholder="A picture, rhyme, or link to something you know. Tricks you invent yourself work best."
            data-testid="trick"
          />
        </div>
        {card && (
          <div>
            <label className="field" htmlFor="my-sentence">
              Your sentence
            </label>
            <textarea id="my-sentence" value={sentence} onChange={(e) => setSentence(e.target.value)} onBlur={() => void saveSentence()} />
          </div>
        )}
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              void saveTrick();
              void saveSentence();
            }}
            data-testid="save-notes"
          >
            Save notes
          </button>
          <span role="status" className="muted small">
            {saved}
          </span>
        </div>
      </div>

      <div className="card">
        <h2>Your progress with this word</h2>
        {card ? (
          <dl className="facts">
            <dt>Reviews</dt>
            <dd>
              {card.reps} ({card.lapses} forgotten)
            </dd>
            <dt>Next review</dt>
            <dd>{new Date(card.due).toLocaleDateString()}</dd>
            <dt>Memory strength</dt>
            <dd>{card.stability === 0 ? 'not reviewed yet' : `about ${Math.round(card.stability)} ${Math.round(card.stability) === 1 ? 'day' : 'days'}`}</dd>
            {recall !== null && (
              <>
                <dt>Chance you recall it now</dt>
                <dd>{Math.round(recall * 100)}%</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="muted">
            You have not learned this word yet. It will come up in <Link to="/learn">Learn New Words</Link> in order of how common it is.
          </p>
        )}
      </div>

      <div className="row spread">
        {prev ? (
          <Link className="btn" to={`/word/${prev.id}`}>
            ← {prev.word}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="btn" to={`/word/${next.id}`}>
            {next.word} →
          </Link>
        )}
      </div>
    </>
  );
}
