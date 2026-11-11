/** Pieces for showing a word: speak button, star, status badge, full detail card. */
import { Link } from 'react-router-dom';
import type { Card, Word, WordStatus } from '../types';
import { useApp } from '../state/app';
import { canSpeak, speak } from '../lib/speech';
import { cardStatus } from '../lib/scheduler';
import { SpeakerIcon, StarIcon } from './Icons';

export function SpeakButton({ text }: { text: string }) {
  if (!canSpeak()) return null;
  return (
    <button type="button" className="icon-btn" onClick={() => speak(text)} aria-label={`Hear the word ${text}`} title="Hear it">
      <SpeakerIcon />
    </button>
  );
}

export function StarButton({ id, word }: { id: string; word: string }) {
  const { user, actions } = useApp();
  const starred = user.notes.get(id)?.starred ?? false;
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={starred}
      aria-label={starred ? `Remove star from ${word}` : `Star ${word}`}
      title={starred ? 'Starred' : 'Star this word'}
      onClick={() => void actions.toggleStar(id)}
    >
      <StarIcon filled={starred} />
    </button>
  );
}

const STATUS_CLASS: Record<WordStatus, string> = { new: '', learning: 'accent', mastered: 'good' };

export function StatusBadge({ card }: { card: Card | undefined }) {
  const status = cardStatus(card);
  return <span className={`badge ${STATUS_CLASS[status]}`}>{status}</span>;
}

export function ToneBadge({ tone }: { tone: Word['connotation'] }) {
  const cls = tone === 'positive' ? 'good' : tone === 'negative' ? 'bad' : '';
  return <span className={`badge ${cls}`}>{tone} tone</span>;
}

/** Split a passage at its blank and render the blank as a line (read aloud as "blank"). */
export function PassageText({ text, fill }: { text: string; fill?: string }) {
  const [before, after] = text.split('______');
  return (
    <>
      {before}
      {fill ? (
        <strong>{fill}</strong>
      ) : (
        <span className="blank" role="img" aria-label="blank" />
      )}
      {after}
    </>
  );
}

/** Replace the word (in any form) inside an example sentence with a blank. */
export function clozeSentence(sentence: string, word: string): string {
  const stem = word.length > 5 ? word.slice(0, word.length - 2) : word.slice(0, Math.max(3, word.length - 1));
  const re = new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z-]*`, 'i');
  return sentence.replace(re, '______');
}

interface DetailProps {
  word: Word;
  /** Hide the headword row when the page already shows it. */
  showHead?: boolean;
}

/** Everything we know about a word: meaning, contexts, parts, confusing pairs. */
export function WordDetail({ word, showHead = true }: DetailProps) {
  const { data } = useApp();
  const parts = word.parts.map((id) => data.rootMap.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
  const linkable = (w: string) => (data.wordMap.has(w) ? w : null);
  return (
    <div className="stack">
      {showHead && (
        <div className="row">
          <h2 className="headword">{word.word}</h2>
          <SpeakButton text={word.word} />
          <StarButton id={word.id} word={word.word} />
        </div>
      )}
      <div className="row">
        <span className="badge">{word.pos}</span>
        <ToneBadge tone={word.connotation} />
        <span className="badge">tier {word.tier}</span>
      </div>
      <p className="definition">{word.definition}</p>

      <section aria-label="Example sentences">
        <h3>In context</h3>
        <ul className="examples">
          {word.examples.map((ex) => (
            <li key={ex.setting}>
              <span className="setting">{ex.setting}</span>
              {ex.text}
            </li>
          ))}
        </ul>
      </section>

      {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
        <section aria-label="Related words">
          <dl className="facts">
            {word.synonyms.length > 0 && (
              <>
                <dt>Similar</dt>
                <dd>
                  <WordChips words={word.synonyms} linkable={linkable} />
                </dd>
              </>
            )}
            {word.antonyms.length > 0 && (
              <>
                <dt>Opposite</dt>
                <dd>
                  <WordChips words={word.antonyms} linkable={linkable} />
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

      {(parts.length > 0 || word.partsNote) && (
        <section aria-label="Word parts">
          <h3>Word parts</h3>
          {parts.length > 0 && (
            <ul className="chips">
              {parts.map((r) => (
                <li key={r.id}>
                  <Link to={`/roots/${encodeURIComponent(r.id)}`}>
                    <strong>{r.form}</strong>
                  </Link>{' '}
                  {r.meaning}
                </li>
              ))}
            </ul>
          )}
          {word.partsNote && <p className="muted small" style={{ marginTop: 6 }}>{word.partsNote}</p>}
        </section>
      )}

      {word.confused.length > 0 && (
        <section aria-label="Easily confused words">
          <h3>Do not confuse with</h3>
          {word.confused.map((c) => (
            <p key={c.word}>
              {linkable(c.word) ? (
                <Link to={`/word/${c.word}`}>
                  <strong>{c.word}</strong>
                </Link>
              ) : (
                <strong>{c.word}</strong>
              )}
              : {c.note}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

function WordChips({ words, linkable }: { words: string[]; linkable: (w: string) => string | null }) {
  return (
    <span className="chips">
      {words.map((w) =>
        linkable(w) ? (
          <Link key={w} className="chip" to={`/word/${w}`}>
            {w}
          </Link>
        ) : (
          <span key={w} className="chip">
            {w}
          </span>
        ),
      )}
    </span>
  );
}
