import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { learnedToday, newAllowance, unseenWords, useApp } from '../state/app';
import { useHotkeys, useTitle } from '../lib/hooks';
import { usesWord } from '../lib/spelling';
import { speak } from '../lib/speech';
import type { Word } from '../types';
import { WordDetail } from '../components/WordBits';
import Choices from '../components/Choices';
import { makeDefItem } from '../lib/quiz';
import { pickBatch } from '../lib/learn';

export default function Learn() {
  useTitle('Learn New Words');
  const { data, user, actions } = useApp();
  const [batch, setBatch] = useState<Word[] | null>(null);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<'study' | 'check' | 'write'>('study');
  const [picked, setPicked] = useState<number | null>(null);
  const [sentence, setSentence] = useState('');
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const unseen = unseenWords(data, user);
  const allowance = newAllowance(data, user);
  const word = batch?.[index];
  // A one-question check that the meaning went in, before asking for a sentence.
  const check = useMemo(() => (word ? makeDefItem(word, data.words, Math.random) : null), [word, data.words]);

  useEffect(() => {
    if (step === 'write') inputRef.current?.focus();
    else if (step === 'study') headingRef.current?.focus();
  }, [step, index]);

  useEffect(() => {
    if (word && step === 'study' && user.settings.audio) speak(word.word);
  }, [word, step, user.settings.audio]);

  const start = (size: number) => {
    setBatch(pickBatch(unseen, size));
    setIndex(0);
    setStep('study');
    setSentence('');
    setFinished(false);
  };

  const save = async () => {
    if (!word || !batch) return;
    const text = sentence.trim();
    const count = text.split(/\s+/).filter(Boolean).length;
    if (!usesWord(text, word.word)) {
      setError(`Use the word "${word.word}" in your sentence.`);
      return;
    }
    if (count < 4) {
      setError('Write a full sentence of at least four words.');
      return;
    }
    await actions.learnWord(word.id, text);
    setSentence('');
    setError('');
    if (index + 1 < batch.length) {
      setIndex(index + 1);
      setStep('study');
    } else {
      setFinished(true);
    }
  };

  const toCheck = () => {
    setPicked(null);
    setStep('check');
  };
  const afterCheck = () => {
    if (picked === null || !check) return;
    setStep(picked === check.answer ? 'write' : 'study');
    setPicked(null);
  };
  const keys: Record<string, () => void> = {
    enter: () => {
      if (step === 'study') toCheck();
      else if (step === 'check') afterCheck();
    },
  };
  [0, 1, 2, 3].forEach((i) => {
    const choose = () => step === 'check' && picked === null && setPicked(i);
    keys['abcd'[i]] = choose;
    keys[String(i + 1)] = choose;
  });
  useHotkeys(keys, Boolean(word) && !finished);

  if (finished && batch) {
    return (
      <>
        <h1>Nice work</h1>
        <div className="card center" role="status">
          <p style={{ fontSize: '1.2rem' }}>
            <strong>{batch.length}</strong> new {batch.length === 1 ? 'word is' : 'words are'} now in your review queue.
          </p>
          <p className="muted">Do a first review now while the words are fresh. After that, the app will bring each one back just before you would forget it.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn primary" to="/review">
              Review them now
            </Link>
            <Link className="btn" to="/">
              Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!batch || !word) {
    const size = Math.min(user.settings.learnBatch, allowance);
    const extra = Math.min(user.settings.learnBatch, unseen.length);
    return (
      <>
        <h1>Learn New Words</h1>
        <div className="card">
          {unseen.length === 0 ? (
            <p>
              You have learned every word in the tiers you selected. Change the tiers in <Link to="/settings">Settings</Link>, or keep up
              with your reviews.
            </p>
          ) : allowance > 0 ? (
            <>
              <p>
                For each word you will read the meaning, see it in three settings, look at its parts, pass a quick check, and then write your
                own sentence.
                Writing your own sentence is the step that makes the word yours.
              </p>
              <p className="muted">
                Learned today: {learnedToday(user)} of {user.settings.newPerDay}. Next up: the most common SAT words you have not seen.
              </p>
              <button className="btn primary" onClick={() => start(size)} data-testid="start-learn">
                Learn {size} {size === 1 ? 'word' : 'words'}
              </button>
            </>
          ) : (
            <>
              <p className="notice">
                You have reached today's limit of {user.settings.newPerDay} new words. A steady daily pace works better than cramming,
                because every new word adds reviews in the days ahead.
              </p>
              <div className="row">
                <Link className="btn primary" to="/review">
                  Go to review
                </Link>
                <button className="btn" onClick={() => start(extra)}>
                  Learn {extra} more anyway
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="row spread">
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>
          Learn: word {index + 1} of {batch.length}
        </h1>
      </div>
      <div className="progressbar" aria-hidden="true" style={{ marginBottom: 14 }}>
        <div style={{ width: `${Math.round((index / batch.length) * 100)}%` }} />
      </div>

      {step === 'study' ? (
        <>
          <div className="card" data-testid="study-card">
            <WordDetail word={word} />
          </div>
          <button className="btn primary block" onClick={toCheck} data-testid="to-check">
            Got it. Quick check <kbd>Enter</kbd>
          </button>
        </>
      ) : step === 'check' && check ? (
        <>
          <div className="card" data-testid="check-card">
            <p className="muted">Without looking back: which meaning fits this word?</p>
            <p className="headword" style={{ marginBottom: 14 }}>
              {word.word}
            </p>
            <Choices label="Meanings" choices={check.choices} selected={picked} reveal={picked === null ? null : check.answer} onSelect={(i) => picked === null && setPicked(i)} />
            {picked !== null && (
              <p role="status" className={`notice ${picked === check.answer ? 'good' : 'bad'}`} style={{ marginTop: 12 }}>
                {picked === check.answer ? 'Correct. Now make the word yours.' : 'Not quite. Take another look at the word, then try again.'}
              </p>
            )}
          </div>
          <button className="btn primary block" onClick={afterCheck} disabled={picked === null} data-testid="after-check">
            {picked !== null && picked !== check.answer ? 'Back to the word' : 'Write my own sentence'} <kbd>Enter</kbd>
          </button>
        </>
      ) : (
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p className="headword">{word.word}</p>
          <p className="definition">{word.definition}</p>
          <div>
            <label className="field" htmlFor="own-sentence">
              Write your own sentence using "{word.word}"
            </label>
            <textarea
              id="own-sentence"
              ref={inputRef}
              value={sentence}
              onChange={(e) => {
                setSentence(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void save();
                }
              }}
              aria-describedby="sentence-help"
              aria-invalid={error ? true : undefined}
              autoComplete="off"
              data-testid="sentence-input"
            />
            <p id="sentence-help" className="muted small">
              Make it about your own life if you can. Personal sentences are remembered best.
            </p>
            {error && (
              <p role="alert" className="notice bad">
                {error}
              </p>
            )}
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={() => setStep('study')}>
              Back to the word
            </button>
            <button type="submit" className="btn primary" data-testid="save-sentence">
              Save and continue <kbd>Enter</kbd>
            </button>
          </div>
        </form>
      )}
    </>
  );
}
