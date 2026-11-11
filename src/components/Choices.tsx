/** A list of lettered answer choices used by practice, quizzes, and the roots quiz. */
interface Props {
  choices: string[];
  /** Index currently picked (or null). */
  selected: number | null;
  /** When set, the answer is shown: the right choice turns green and a wrong pick turns red. */
  reveal?: number | null;
  onSelect: (index: number) => void;
  /** Choices the student has crossed out (practice only). */
  eliminated?: ReadonlySet<number>;
  onEliminate?: (index: number) => void;
  label: string;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function Choices({ choices, selected, reveal = null, onSelect, eliminated, onEliminate, label }: Props) {
  const revealed = reveal !== null;
  return (
    <div className="choices" role="radiogroup" aria-label={label}>
      {choices.map((c, i) => {
        const classes = ['choice'];
        if (selected === i) classes.push('selected');
        if (revealed && i === reveal) classes.push('correct');
        if (revealed && selected === i && i !== reveal) classes.push('wrong');
        if (eliminated?.has(i) && !revealed) classes.push('eliminated');
        return (
          <div key={`${i}-${c}`} className="choice-row">
            <button
              type="button"
              role="radio"
              aria-checked={selected === i}
              className={classes.join(' ')}
              disabled={revealed}
              onClick={() => onSelect(i)}
              data-choice={LETTERS[i]}
            >
              <span className="letter" aria-hidden="true">
                {LETTERS[i]}
              </span>
              <span className="choice-text">
                <span className="sr-only">{LETTERS[i]}. </span>
                {c}
              </span>
              {revealed && i === reveal && (
                <span className="mark" aria-label="correct answer">
                  ✓
                </span>
              )}
              {revealed && selected === i && i !== reveal && (
                <span className="mark" aria-label="your answer, incorrect">
                  ✗
                </span>
              )}
            </button>
            {onEliminate && !revealed && (
              <button
                type="button"
                className="icon-btn"
                aria-pressed={eliminated?.has(i) ?? false}
                aria-label={`Cross out choice ${LETTERS[i]}`}
                title="Cross out"
                onClick={() => onEliminate(i)}
              >
                <s aria-hidden="true">{LETTERS[i]}</s>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
