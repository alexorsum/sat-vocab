import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { learnedWords, missedWords, useApp } from '../state/app';
import { buildPractice, type PracticeQuestion } from '../lib/quiz';
import { formatClock, summarizePractice } from '../lib/scoring';
import { useHotkeys, useTitle } from '../lib/hooks';
import Choices from '../components/Choices';
import { PassageText } from '../components/WordBits';
import { FlagIcon } from '../components/Icons';
import { REASON_LABEL } from '../lib/reasons';

/** The real test allows 64 minutes for 54 questions: about 71 seconds each. */
export const SECONDS_PER_QUESTION = 71;
const STEM = 'Which choice completes the text with the most logical and precise word or phrase?';

type Pool = 'all' | 'learned' | 'missed';
type Feedback = 'each' | 'end';
type Phase = 'setup' | 'run' | 'results';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function Practice() {
  useTitle('Words in Context');
  const { data, user, actions } = useApp();
  const [params] = useSearchParams();
  const learned = useMemo(() => learnedWords(data, user), [data, user]);
  const missed = useMemo(() => missedWords(data, user), [data, user]);

  const [phase, setPhase] = useState<Phase>('setup');
  const [timed, setTimed] = useState(false);
  const [count, setCount] = useState(10);
  const [pool, setPool] = useState<Pool>(params.get('pool') === 'missed' && missed.length > 0 ? 'missed' : 'all');
  const [feedback, setFeedback] = useState<Feedback>('each');

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [marked, setMarked] = useState<boolean[]>([]);
  const [eliminated, setEliminated] = useState<Set<number>[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const finishedRef = useRef(false);

  const q = questions[idx];
  const isChecked = checked[idx] ?? false;
  const paused = feedback === 'each' && isChecked;

  const start = () => {
    const source = pool === 'learned' ? learned : pool === 'missed' ? missed : data.words;
    const qs = buildPractice(source, count, Math.random);
    setQuestions(qs);
    setIdx(0);
    setAnswers(qs.map(() => null));
    setChecked(qs.map(() => false));
    setMarked(qs.map(() => false));
    setEliminated(qs.map(() => new Set<number>()));
    setSecondsLeft(qs.length * SECONDS_PER_QUESTION);
    setElapsed(0);
    setTimeUp(false);
    finishedRef.current = false;
    setPhase('run');
  };

  /** Record the outcome of one answered question in the mistake log. */
  const record = async (question: PracticeQuestion, answer: number | null) => {
    if (answer === null) return;
    if (answer === question.answer) {
      if (pool === 'missed') await actions.resolveMistakes(question.wordId);
      return;
    }
    const note = question.notes[answer];
    await actions.addMistake(question.wordId, 'practice', note?.reason ?? 'wrong-meaning', question.choices[answer]);
  };

  const finish = async (finalAnswers = answers) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (feedback === 'end') {
      for (let i = 0; i < questions.length; i++) await record(questions[i], finalAnswers[i]);
    }
    const answered = finalAnswers.filter((a) => a !== null).length;
    if (answered > 0) await actions.bumpDay('practice', answered);
    setPhase('results');
  };

  // One-second clock. It pauses while an explanation is on screen.
  useEffect(() => {
    if (phase !== 'run' || paused) return;
    const t = window.setInterval(() => {
      setElapsed((e) => e + 1);
      if (timed) setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, paused, timed]);

  useEffect(() => {
    if (phase === 'run' && timed && secondsLeft === 0 && questions.length > 0) {
      setTimeUp(true);
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase, timed]);

  useEffect(() => {
    if (phase !== 'setup') headingRef.current?.focus();
  }, [phase, idx]);

  const select = (i: number) => {
    if (!q || isChecked) return;
    setAnswers((a) => a.map((v, k) => (k === idx ? i : v)));
  };
  const toggleEliminate = (i: number) => {
    setEliminated((all) =>
      all.map((set, k) => {
        if (k !== idx) return set;
        const next = new Set(set);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      }),
    );
  };
  const check = async () => {
    if (!q || answers[idx] === null || isChecked) return;
    setChecked((c) => c.map((v, k) => (k === idx ? true : v)));
    await record(q, answers[idx]);
  };
  const next = () => {
    if (idx + 1 < questions.length) setIdx(idx + 1);
    else void finish();
  };
  const primary = () => {
    if (phase !== 'run' || !q) return;
    if (feedback === 'each' && !isChecked) void check();
    else next();
  };
  const toggleMark = () => setMarked((m) => m.map((v, k) => (k === idx ? !v : v)));

  const keys: Record<string, () => void> = {
    enter: primary,
    m: toggleMark,
    arrowright: () => feedback === 'end' && idx + 1 < questions.length && setIdx(idx + 1),
    arrowleft: () => feedback === 'end' && idx > 0 && setIdx(idx - 1),
  };
  LETTERS.forEach((l, i) => {
    keys[l.toLowerCase()] = () => select(i);
    keys[String(i + 1)] = () => select(i);
  });
  useHotkeys(keys, phase === 'run');

  if (phase === 'setup') {
    return (
      <>
        <h1>Words in Context</h1>
        <p className="muted">
          This is the question type the Digital SAT uses for vocabulary: a short passage with a blank and four choices. Pick the word that
          fits the meaning and tone of the passage most precisely.
        </p>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <fieldset>
            <legend>Timing</legend>
            <div className="options">
              <Option name="timed" checked={!timed} onChange={() => setTimed(false)} label="Untimed" />
              <Option name="timed" checked={timed} onChange={() => setTimed(true)} label={`Timed (${SECONDS_PER_QUESTION} seconds per question, like the test)`} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Number of questions</legend>
            <div className="options">
              {[5, 10, 15, 27].map((n) => (
                <Option key={n} name="count" checked={count === n} onChange={() => setCount(n)} label={n === 27 ? '27 (one full module)' : String(n)} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Which words</legend>
            <div className="options">
              <Option name="pool" checked={pool === 'all'} onChange={() => setPool('all')} label={`All words (${data.words.length})`} />
              <Option name="pool" checked={pool === 'learned'} onChange={() => setPool('learned')} label={`Words I have learned (${learned.length})`} disabled={learned.length === 0} />
              <Option name="pool" checked={pool === 'missed'} onChange={() => setPool('missed')} label={`Words I missed (${missed.length})`} disabled={missed.length === 0} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Explanations</legend>
            <div className="options">
              <Option name="feedback" checked={feedback === 'each'} onChange={() => setFeedback('each')} label="After each question" />
              <Option name="feedback" checked={feedback === 'end'} onChange={() => setFeedback('end')} label="At the end (test style)" />
            </div>
          </fieldset>
          <button type="submit" className="btn primary" data-testid="start-practice">
            Start practice
          </button>
        </form>
        <p className="muted small">
          Shortcuts: <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> pick a choice, <kbd>Enter</kbd> check or continue, <kbd>M</kbd> mark for
          review.
        </p>
      </>
    );
  }

  if (phase === 'results') {
    const summary = summarizePractice(answers, questions.map((x) => x.answer), elapsed);
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>
          Practice results
        </h1>
        {timeUp && <p className="notice warn">Time ran out. Unanswered questions count as missed.</p>}
        <div className="grid three" style={{ marginBottom: 16 }}>
          <div className="stat">
            <div className="value" data-testid="practice-score">
              {summary.correct} / {summary.total}
            </div>
            <div className="label">correct ({summary.percent}%)</div>
          </div>
          <div className="stat">
            <div className="value">{summary.avgSeconds}s</div>
            <div className="label">average per question (test pace: {SECONDS_PER_QUESTION}s)</div>
          </div>
          <div className="stat">
            <div className="value">{summary.unanswered}</div>
            <div className="label">unanswered</div>
          </div>
        </div>
        <div className="row" style={{ marginBottom: 18 }}>
          <button className="btn primary" onClick={() => setPhase('setup')}>
            Practice again
          </button>
          <Link className="btn" to="/mistakes">
            Mistake log
          </Link>
        </div>
        <h2>Review every question</h2>
        {questions.map((question, i) => (
          <section key={i} className="card" aria-label={`Question ${i + 1}`}>
            <p className="muted small">
              Question {i + 1}{' '}
              {answers[i] === question.answer ? <span className="badge good">correct</span> : answers[i] === null ? <span className="badge warn">unanswered</span> : <span className="badge bad">missed</span>}
            </p>
            <p className="passage">
              <PassageText text={question.passage} fill={question.choices[question.answer]} />
            </p>
            <Explanation question={question} chosen={answers[i]} />
          </section>
        ))}
      </>
    );
  }

  if (!q) return null;
  const low = timed && secondsLeft <= 30;
  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        Question {idx + 1} of {questions.length}
      </h1>
      <div className="testbar">
        <strong aria-hidden="true">
          Question {idx + 1} of {questions.length}
        </strong>
        {timed && (
          <span className={`timer${low ? ' low' : ''}`} role="timer" aria-label={`Time left ${formatClock(secondsLeft)}`} data-testid="timer">
            {formatClock(secondsLeft)}
          </span>
        )}
        <button type="button" className="btn small" aria-pressed={marked[idx]} onClick={toggleMark}>
          <span style={{ width: 16, height: 16, display: 'inline-flex', color: marked[idx] ? 'var(--bad)' : undefined }}>
            <FlagIcon filled={marked[idx]} />
          </span>
          {marked[idx] ? 'Marked for review' : 'Mark for review'}
        </button>
      </div>

      <p className="passage" data-testid="passage">
        <PassageText text={q.passage} />
      </p>
      <p className="stem">{STEM}</p>
      <Choices
        label="Answer choices"
        choices={q.choices}
        selected={answers[idx]}
        reveal={isChecked ? q.answer : null}
        onSelect={select}
        eliminated={eliminated[idx]}
        onEliminate={toggleEliminate}
      />

      {isChecked && (
        <div className="card explain" role="status" data-testid="explanation">
          <Explanation question={q} chosen={answers[idx]} />
        </div>
      )}

      <div className="row spread" style={{ marginTop: 16 }}>
        {feedback === 'end' ? (
          <button className="btn" onClick={() => setIdx(idx - 1)} disabled={idx === 0}>
            Back
          </button>
        ) : (
          <span />
        )}
        {feedback === 'each' && !isChecked ? (
          <button className="btn primary" onClick={() => void check()} disabled={answers[idx] === null} data-testid="check">
            Check answer <kbd>Enter</kbd>
          </button>
        ) : (
          <button className="btn primary" onClick={next} data-testid="next">
            {idx + 1 < questions.length ? 'Next' : 'Finish'} <kbd>Enter</kbd>
          </button>
        )}
      </div>

      {feedback === 'end' && (
        <nav className="navigator" aria-label="Question navigator">
          {questions.map((_, i) => (
            <button
              key={i}
              className={`${answers[i] !== null ? 'answered' : ''} ${i === idx ? 'current' : ''} ${marked[i] ? 'marked' : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`Question ${i + 1}${answers[i] !== null ? ', answered' : ', not answered'}${marked[i] ? ', marked for review' : ''}`}
              aria-current={i === idx ? 'step' : undefined}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}

function Option({ name, checked, onChange, label, disabled }: { name: string; checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <label className="option">
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

/** Why the right answer is right and why each wrong choice fails. */
export function Explanation({ question, chosen }: { question: PracticeQuestion; chosen: number | null }) {
  const correct = question.choices[question.answer];
  const right = chosen === question.answer;
  return (
    <div>
      <p>
        <strong className={right ? '' : ''}>{chosen === null ? 'Not answered.' : right ? 'Correct.' : 'Not quite.'}</strong> The answer is{' '}
        <strong>
          {LETTERS[question.answer]}, {correct}
        </strong>
        . {question.explanation}
      </p>
      <ul>
        {question.choices.map((c, i) => {
          const note = question.notes[i];
          if (!note) return null;
          return (
            <li key={c}>
              <strong>
                {LETTERS[i]}, {c}
              </strong>
              {chosen === i && <span className="badge bad" style={{ marginLeft: 6 }}>your answer</span>}
              <span className="badge" style={{ marginLeft: 6 }}>
                {REASON_LABEL[note.reason]}
              </span>
              <br />
              {note.why}
            </li>
          );
        })}
      </ul>
      <p className="small" style={{ marginTop: 8 }}>
        <Link to={`/word/${question.wordId}`}>See the full entry for {question.wordId}</Link>
      </p>
    </div>
  );
}
