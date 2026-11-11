import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { learnedWords, useApp } from '../state/app';
import { makeGameRound, type GameRound } from '../lib/quiz';
import { gamePoints } from '../lib/scoring';
import { useHotkeys, useTitle } from '../lib/hooks';

const GAME_SECONDS = 60;

export default function Game() {
  useTitle('Speed Game');
  const { data, user, actions } = useApp();
  const learned = useMemo(() => learnedWords(data, user), [data, user]);
  const pool = learned.length >= 10 ? learned : data.words;
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready');
  const [round, setRound] = useState<GameRound | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [right, setRight] = useState(0);
  const [total, setTotal] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [pulse, setPulse] = useState('');
  const [newBest, setNewBest] = useState(false);
  const scoreRef = useRef(0);
  const overRef = useRef(false);

  const start = () => {
    setRound(makeGameRound(pool, data.words, Math.random));
    setTimeLeft(GAME_SECONDS);
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    setRight(0);
    setTotal(0);
    setMissed([]);
    setNewBest(false);
    overRef.current = false;
    setPhase('play');
  };

  useEffect(() => {
    if (phase !== 'play') return;
    const t = window.setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'play' || timeLeft > 0 || overRef.current) return;
    overRef.current = true;
    setPhase('over');
    void actions.bumpDay('game');
    if (scoreRef.current > user.settings.gameBest) {
      setNewBest(true);
      void actions.updateSettings({ gameBest: scoreRef.current });
    }
  }, [timeLeft, phase, actions, user.settings.gameBest]);

  const answer = (saysMatch: boolean) => {
    if (phase !== 'play' || !round) return;
    const correct = saysMatch === round.matches;
    setTotal((n) => n + 1);
    if (correct) {
      const pts = gamePoints(streak);
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setStreak((s) => s + 1);
      setRight((n) => n + 1);
    } else {
      setStreak(0);
      setMissed((m) => (m.includes(round.wordId) ? m : [...m, round.wordId]));
    }
    setPulse(correct ? 'pulse-good' : 'pulse-bad');
    window.setTimeout(() => setPulse(''), 350);
    setRound(makeGameRound(pool, data.words, Math.random));
  };

  useHotkeys(
    {
      arrowleft: () => answer(false),
      n: () => answer(false),
      arrowright: () => answer(true),
      y: () => answer(true),
    },
    phase === 'play',
  );

  if (phase === 'ready') {
    return (
      <>
        <h1>Speed Game</h1>
        <div className="card center">
          <p>
            You have <strong>{GAME_SECONDS} seconds</strong>. A word and a meaning appear. Decide fast: do they match?
          </p>
          <p className="muted">
            Right answers in a row earn bonus points. {learned.length >= 10 ? 'The game uses words you have learned.' : 'Learn 10 words and the game will use your own words. For now it uses the whole list.'}
          </p>
          <p>
            Best score: <strong data-testid="best">{user.settings.gameBest}</strong>
          </p>
          <button className="btn primary" onClick={start} data-testid="start-game">
            Start
          </button>
          <p className="muted small" style={{ marginTop: 10 }}>
            Shortcuts: <kbd>→</kbd> or <kbd>Y</kbd> match, <kbd>←</kbd> or <kbd>N</kbd> no match.
          </p>
        </div>
      </>
    );
  }

  if (phase === 'over') {
    return (
      <>
        <h1>Time!</h1>
        <div className="card center" role="status">
          <p style={{ fontSize: '1.4rem' }}>
            Score: <strong data-testid="game-score">{score}</strong>
          </p>
          <p>
            {right} of {total} correct. {newBest ? 'New best score!' : `Best: ${user.settings.gameBest}`}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={start}>
              Play again
            </button>
            <Link className="btn" to="/">
              Home
            </Link>
          </div>
        </div>
        {missed.length > 0 && (
          <div className="card">
            <h2>Words that tripped you up</h2>
            <ul className="wordlist">
              {missed.map((id) => {
                const w = data.wordMap.get(id);
                return w ? (
                  <li key={id}>
                    <Link className="wordlink" to={`/word/${id}`}>
                      <strong>{w.word}</strong>
                      <span className="def">{w.definition}</span>
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Speed Game</h1>
      <div className="testbar">
        <span className={`timer${timeLeft <= 10 ? ' low' : ''}`} role="timer" aria-label={`${timeLeft} seconds left`} data-testid="game-timer">
          0:{String(timeLeft).padStart(2, '0')}
        </span>
        <span>
          Score <strong data-testid="live-score">{score}</strong>
        </span>
        <span className="muted">Streak {streak}</span>
      </div>
      <div className="progressbar" aria-hidden="true" style={{ marginBottom: 14 }}>
        <div style={{ width: `${(timeLeft / GAME_SECONDS) * 100}%` }} />
      </div>
      {round && (
        <div className={`card ${pulse}`} aria-live="polite" data-testid="game-card" data-matches={round.matches}>
          <p className="game-word">{round.word}</p>
          <p className="game-def">{round.definition}</p>
        </div>
      )}
      <div className="game-buttons">
        <button className="btn" onClick={() => answer(false)} data-testid="no-match">
          <kbd>←</kbd> No match
        </button>
        <button className="btn primary" onClick={() => answer(true)} data-testid="match">
          Match <kbd>→</kbd>
        </button>
      </div>
    </>
  );
}
