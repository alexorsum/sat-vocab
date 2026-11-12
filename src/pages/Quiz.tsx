import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { learnedWords, missedWords, starredWords, useApp } from '../state/app';
import {
  KIND_LABEL,
  QUIZ_KINDS,
  buildQuiz,
  reasonForChoice,
  type ChoiceItem,
  type MatchItem,
  type QuizItem,
  type QuizKind,
  type ToneItem,
  type TypedItem,
} from '../lib/quiz';
import { matchScore, summarize, type ItemResult } from '../lib/scoring';
import { checkSpelling, normalizeAnswer } from '../lib/spelling';
import { useHotkeys, useTitle } from '../lib/hooks';
import type { Connotation, MistakeReason, Word } from '../types';
import Choices from '../components/Choices';

type Pool = 'learned' | 'all' | 'starred' | 'missed';
type Mode = 'mixed' | QuizKind;

/** What an item reports when the student has finished it. */
interface Outcome {
  earned: number;
  possible: number;
  /** Mistakes to log: one entry per missed word. */
  misses: { wordId: string; reason: MistakeReason; chosen: string }[];
}

export default function Quiz() {
  useTitle('Quiz');
  const { data, user, actions } = useApp();
  const [params] = useSearchParams();
  const learned = useMemo(() => learnedWords(data, user), [data, user]);
  const missed = useMemo(() => missedWords(data, user), [data, user]);
  const starred = useMemo(() => starredWords(data, user), [data, user]);

  const [phase, setPhase] = useState<'setup' | 'run' | 'results'>('setup');
  const [mode, setMode] = useState<Mode>('mixed');
  const [pool, setPool] = useState<Pool>(params.get('pool') === 'missed' && missed.length > 0 ? 'missed' : learned.length >= 5 ? 'learned' : 'all');
  const [count, setCount] = useState(10);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [results, setResults] = useState<ItemResult[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const item = items[idx];
  const target = item ? data.wordMap.get(item.wordId) : undefined;

  const start = () => {
    const source = pool === 'learned' ? learned : pool === 'missed' ? missed : pool === 'starred' ? starred : data.words;
    const kinds = mode === 'mixed' ? QUIZ_KINDS : [mode];
    const built = buildQuiz(source, data.words, kinds, count, Math.random);
    setItems(built);
    setIdx(0);
    setOutcome(null);
    setResults([]);
    setPhase('run');
  };

  const done = async (o: Outcome) => {
    if (!item || outcome) return;
    setOutcome(o);
    setResults((r) => [...r, { kind: item.kind, wordId: item.wordId, earned: o.earned, possible: o.possible }]);
    for (const m of o.misses) await actions.addMistake(m.wordId, 'quiz', m.reason, m.chosen);
    if (o.earned === o.possible && pool === 'missed') await actions.resolveMistakes(item.wordId);
  };

  const next = async () => {
    if (!outcome) return;
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setOutcome(null);
    } else {
      await actions.bumpDay('quiz', items.length);
      setPhase('results');
    }
  };

  useEffect(() => {
    if (outcome) nextRef.current?.focus();
  }, [outcome]);
  useEffect(() => {
    if (phase === 'results') headingRef.current?.focus();
  }, [phase]);

  useHotkeys({ enter: () => void next() }, phase === 'run' && outcome !== null);

  if (phase === 'setup') {
    return (
      <>
        <h1>Quiz</h1>
        <p className="muted">Quizzes are low stakes. Pulling a word out of memory is what strengthens it, even when you miss.</p>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <fieldset>
            <legend>Quiz type</legend>
            <div className="options">
              <Opt name="mode" checked={mode === 'mixed'} onChange={() => setMode('mixed')} label="Mixed (recommended)" />
              {QUIZ_KINDS.map((k) => (
                <Opt key={k} name="mode" checked={mode === k} onChange={() => setMode(k)} label={KIND_LABEL[k]} />
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 6 }}>
              Mixed shuffles every question type together. It feels harder than doing one type at a time, and it works better.
            </p>
          </fieldset>
          <fieldset>
            <legend>Which words</legend>
            <div className="options">
              <Opt name="pool" checked={pool === 'learned'} onChange={() => setPool('learned')} label={`Words I have learned (${learned.length})`} disabled={learned.length === 0} />
              <Opt name="pool" checked={pool === 'all'} onChange={() => setPool('all')} label={`All words (${data.words.length})`} />
              <Opt name="pool" checked={pool === 'starred'} onChange={() => setPool('starred')} label={`Starred (${starred.length})`} disabled={starred.length === 0} />
              <Opt name="pool" checked={pool === 'missed'} onChange={() => setPool('missed')} label={`Words I missed (${missed.length})`} disabled={missed.length === 0} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Length</legend>
            <div className="options">
              {[5, 10, 20].map((n) => (
                <Opt key={n} name="count" checked={count === n} onChange={() => setCount(n)} label={`${n} questions`} />
              ))}
            </div>
          </fieldset>
          <button type="submit" className="btn primary" data-testid="start-quiz">
            Start quiz
          </button>
        </form>
      </>
    );
  }

  if (phase === 'results') {
    const s = summarize(results);
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>
          Quiz results
        </h1>
        <div className="grid three" style={{ marginBottom: 16 }}>
          <div className="stat">
            <div className="value" data-testid="quiz-score">
              {s.earned} / {s.possible}
            </div>
            <div className="label">points ({s.percent}%)</div>
          </div>
        </div>
        <div className="card">
          <h2>By question type</h2>
          <table className="data">
            <thead>
              <tr>
                <th>Type</th>
                <th className="num">Points</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(s.byKind).map(([k, v]) => (
                <tr key={k}>
                  <td>{KIND_LABEL[k as QuizKind] ?? k}</td>
                  <td className="num">
                    {v.earned} / {v.possible}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {s.missed.length > 0 && (
          <div className="card">
            <h2>Words to look at again</h2>
            <ul className="chips">
              {s.missed.map((id) => (
                <li key={id}>
                  <Link to={`/word/${id}`}>{data.wordMap.get(id)?.word ?? id}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="row">
          <button className="btn primary" onClick={() => setPhase('setup')}>
            New quiz
          </button>
          <Link className="btn" to="/mistakes">
            Mistake log
          </Link>
        </div>
      </>
    );
  }

  if (!item || !target) return null;
  return (
    <>
      <div className="row spread">
        <h1>Quiz</h1>
        <span className="muted" data-testid="quiz-progress">
          {idx + 1} of {items.length} · {KIND_LABEL[item.kind]}
        </span>
      </div>
      <div className="progressbar" aria-hidden="true" style={{ marginBottom: 14 }}>
        <div style={{ width: `${Math.round((idx / items.length) * 100)}%` }} />
      </div>

      <div className="card" data-testid={`item-${item.kind}`} data-word={item.wordId}>
        {item.kind === 'typed' && <TypedView key={idx} item={item} word={target} onDone={done} />}
        {(item.kind === 'mc-def' || item.kind === 'mc-word' || item.kind === 'synonym' || item.kind === 'antonym') && (
          <ChoiceView key={idx} item={item} onDone={done} />
        )}
        {item.kind === 'match' && <MatchView key={idx} item={item} onDone={done} />}
        {item.kind === 'tone' && <ToneView key={idx} item={item} onDone={done} />}
      </div>

      {outcome && (
        <div className={`notice ${outcome.earned === outcome.possible ? 'good' : 'bad'}`} role="status" data-testid="quiz-feedback">
          <p style={{ margin: 0 }}>
            <strong>{target.word}</strong> ({target.pos}): {target.definition}{' '}
            <Link to={`/word/${target.id}`} className="small">
              Full entry
            </Link>
          </p>
        </div>
      )}
      <button ref={nextRef} className="btn primary block" onClick={() => void next()} disabled={!outcome} data-testid="quiz-next">
        {idx + 1 < items.length ? 'Next' : 'See results'} <kbd>Enter</kbd>
      </button>
    </>
  );
}

function Opt({ name, checked, onChange, label, disabled }: { name: string; checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <label className="option">
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

function ChoiceView({ item, onDone }: { item: ChoiceItem; onDone: (o: Outcome) => void }) {
  const { data } = useApp();
  const [selected, setSelected] = useState<number | null>(null);
  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    const right = i === item.answer;
    onDone({
      earned: right ? 1 : 0,
      possible: 1,
      misses: right ? [] : [{ wordId: item.wordId, reason: reasonForChoice(item, i, data.wordMap), chosen: item.choices[i] }],
    });
  };
  const keys: Record<string, () => void> = {};
  item.choices.forEach((_, i) => {
    keys['abcd'[i]] = () => pick(i);
    keys[String(i + 1)] = () => pick(i);
  });
  useHotkeys(keys, selected === null);
  const isWord = item.kind !== 'mc-word';
  return (
    <>
      <p className="muted">{item.prompt}</p>
      <p className={isWord ? 'headword' : 'definition'} style={{ marginBottom: 14 }} data-testid="quiz-stem">
        {item.stem}
      </p>
      <Choices label={item.prompt} choices={item.choices} selected={selected} reveal={selected === null ? null : item.answer} onSelect={pick} />
      {selected !== null && (
        <p role="status" className="small" style={{ marginTop: 10 }}>
          {selected === item.answer ? 'Correct.' : `Not quite. The answer is "${item.choices[item.answer]}".`}
        </p>
      )}
    </>
  );
}

function TypedView({ item, word, onDone }: { item: TypedItem; word: Word; onDone: (o: Outcome) => void }) {
  const { data } = useApp();
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<{ kind: 'good' | 'bad' | 'warn'; text: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [usedRetry, setUsedRetry] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const others = useMemo(() => new Set(data.words.map((w) => w.word)), [data.words]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const finish = (earned: number, kind: 'good' | 'bad', text: string, reason?: MistakeReason) => {
    setFinished(true);
    setMessage({ kind, text });
    onDone({ earned, possible: 1, misses: reason ? [{ wordId: item.wordId, reason, chosen: value.trim() }] : [] });
  };

  const submit = () => {
    if (finished) return;
    const typed = normalizeAnswer(value);
    if (!typed) {
      finish(0, 'bad', `The word is "${word.word}".`, 'forgot');
      return;
    }
    const result = checkSpelling(value, word.word, others);
    if (result.verdict === 'exact') {
      finish(1, 'good', 'Correct.');
    } else if (result.verdict === 'close') {
      finish(1, 'good', `Correct. Watch the spelling: ${word.word}.`);
    } else if (!usedRetry && word.synonyms.map(normalizeAnswer).includes(typed)) {
      setUsedRetry(true);
      setMessage({ kind: 'warn', text: `"${value.trim()}" is a good synonym, but we are looking for a different word. Try once more.` });
      setValue('');
      inputRef.current?.focus();
    } else if (result.verdict === 'other-word') {
      const confused = word.confused.some((c) => normalizeAnswer(c.word) === typed);
      finish(0, 'bad', `"${value.trim()}" is a different word. The word is "${word.word}".`, confused ? 'confused-word' : 'wrong-meaning');
    } else {
      // A near miss that is too far off to accept is a spelling problem; anything else is a recall problem.
      const near = result.distance <= Math.max(3, Math.ceil(word.word.length / 3));
      finish(0, 'bad', `The word is "${word.word}".`, near ? 'spelling' : 'forgot');
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="muted">Type the word that has this meaning.</p>
      <p className="definition" data-testid="quiz-stem">
        {item.definition}
      </p>
      <p className="muted small">
        {item.pos}, starts with "{item.firstLetter}", {item.length} letters
      </p>
      <label className="sr-only" htmlFor="typed-answer">
        Your answer
      </label>
      <div className="row">
        <input
          id="typed-answer"
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={finished}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{ flex: 1, minWidth: 160 }}
          data-testid="typed-input"
        />
        <button type="submit" className="btn primary" disabled={finished} data-testid="typed-check">
          Check
        </button>
      </div>
      <p className="muted small" style={{ marginTop: 6 }}>
        Small typos are forgiven. Leave it empty and press Check if you do not know.
      </p>
      {message && (
        <p role="status" className={`notice ${message.kind}`} data-testid="typed-message">
          {message.text}
        </p>
      )}
    </form>
  );
}

function MatchView({ item, onDone }: { item: MatchItem; onDone: (o: Outcome) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [pickedRight, setPickedRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [missIds, setMissIds] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);

  // Either side can be picked first; a pair is checked once both sides are chosen.
  const choose = (side: 'left' | 'right', id: string) => {
    const left = side === 'left' ? (picked === id ? null : id) : picked;
    const right = side === 'right' ? (pickedRight === id ? null : id) : pickedRight;
    if (left && right) {
      tryPair(left, right);
    } else {
      setPicked(left);
      setPickedRight(right);
    }
  };

  const tryPair = (leftId: string, rightId: string) => {
    setPickedRight(null);
    if (leftId === rightId) {
      const next = new Set(matched).add(leftId);
      setMatched(next);
      setPicked(null);
      if (next.size === item.left.length) {
        onDone({
          earned: matchScore(item.left.length, wrong),
          possible: item.left.length,
          misses: [...missIds].map((id) => ({ wordId: id, reason: 'wrong-meaning' as MistakeReason, chosen: '' })),
        });
      }
    } else {
      setWrong((w) => w + 1);
      setMissIds((s) => new Set(s).add(leftId));
      setFlash(rightId);
      window.setTimeout(() => setFlash(null), 500);
      setPicked(null);
    }
  };

  return (
    <>
      <p className="muted">
        Match each word with its {item.relation === 'synonym' ? 'synonym (closest meaning)' : 'antonym (opposite)'}. Pick a word, then its partner in the
        other column.
      </p>
      <div className="match-board" data-relation={item.relation}>
        <div className="stack" role="group" aria-label="Words">
          {item.left.map((l) => (
            <button
              key={l.wordId}
              type="button"
              className={`btn ${matched.has(l.wordId) ? 'done' : picked === l.wordId ? 'picked' : ''}`}
              disabled={matched.has(l.wordId)}
              aria-pressed={picked === l.wordId}
              onClick={() => choose('left', l.wordId)}
              data-left={l.wordId}
            >
              {l.text}
            </button>
          ))}
        </div>
        <div className="stack" role="group" aria-label={item.relation === 'synonym' ? 'Synonyms' : 'Antonyms'}>
          {item.right.map((r) => (
            <button
              key={r.wordId}
              type="button"
              className={`btn ${matched.has(r.wordId) ? 'done' : flash === r.wordId ? 'miss' : pickedRight === r.wordId ? 'picked' : ''}`}
              disabled={matched.has(r.wordId)}
              aria-pressed={pickedRight === r.wordId}
              onClick={() => choose('right', r.wordId)}
              data-right={r.wordId}
            >
              {r.text}
            </button>
          ))}
        </div>
      </div>
      <p role="status" className="small muted" style={{ marginTop: 10 }}>
        {matched.size} of {item.left.length} matched{wrong > 0 ? `, ${wrong} wrong ${wrong === 1 ? 'try' : 'tries'}` : ''}.
      </p>
    </>
  );
}

const TONES: { value: Connotation; label: string; key: string }[] = [
  { value: 'positive', label: 'Positive', key: '1' },
  { value: 'neutral', label: 'Neutral', key: '2' },
  { value: 'negative', label: 'Negative', key: '3' },
];

function ToneView({ item, onDone }: { item: ToneItem; onDone: (o: Outcome) => void }) {
  const [chosen, setChosen] = useState<Connotation | null>(null);
  const pick = (tone: Connotation) => {
    if (chosen) return;
    setChosen(tone);
    const right = tone === item.answer;
    onDone({ earned: right ? 1 : 0, possible: 1, misses: right ? [] : [{ wordId: item.wordId, reason: 'wrong-tone', chosen: tone }] });
  };
  useHotkeys({ '1': () => pick('positive'), '2': () => pick('neutral'), '3': () => pick('negative') }, chosen === null);
  return (
    <>
      <p className="muted">Sort this word by tone. Does it usually praise, criticize, or neither?</p>
      <p className="headword" style={{ marginBottom: 14 }} data-testid="quiz-stem">
        {item.word}
      </p>
      <div className="row" role="group" aria-label="Tone">
        {TONES.map((t) => {
          const cls = chosen === null ? '' : t.value === item.answer ? 'done' : chosen === t.value ? 'miss' : '';
          return (
            <button
              key={t.value}
              type="button"
              className="btn"
              style={
                cls === 'done'
                  ? { borderColor: 'var(--good)', background: 'var(--good-soft)' }
                  : cls === 'miss'
                    ? { borderColor: 'var(--bad)', background: 'var(--bad-soft)' }
                    : undefined
              }
              disabled={chosen !== null}
              onClick={() => pick(t.value)}
              data-tone={t.value}
            >
              {t.label} <kbd>{t.key}</kbd>
            </button>
          );
        })}
      </div>
      {chosen && (
        <p role="status" className="small" style={{ marginTop: 10 }}>
          {chosen === item.answer ? 'Correct.' : `Not quite. This word is usually ${item.answer}.`}
        </p>
      )}
    </>
  );
}
