import { Link } from 'react-router-dom';
import { newAllowance, useApp } from '../state/app';
import { cardStatus, dueCards } from '../lib/scheduler';
import { computeStreak } from '../lib/dates';
import { useTitle } from '../lib/hooks';

const MODES = [
  { to: '/practice', title: 'Words in Context', text: 'SAT-style questions, timed or untimed.' },
  { to: '/quiz', title: 'Quiz', text: 'Typed recall, multiple choice, matching, tone.' },
  { to: '/roots', title: 'Roots Explorer', text: 'Prefixes, roots, and the word families they build.' },
  { to: '/mistakes', title: 'Mistake Log', text: 'See why you missed words and drill them.' },
  { to: '/browse', title: 'Word Browser', text: 'Search, filter, star, and add memory tricks.' },
  { to: '/progress', title: 'Progress', text: 'Retention, streak, calendar, and forecast.' },
  { to: '/game', title: 'Speed Game', text: 'A 60 second match-or-not sprint.' },
  { to: '/how', title: 'How This App Works', text: 'The learning science, in plain language.' },
];

export default function Home() {
  useTitle('Home');
  const { data, user } = useApp();
  const now = Date.now();
  const due = dueCards(user.cards.values(), now).length;
  const allowance = newAllowance(data, user, now);
  const streak = computeStreak(user.days.keys(), now);
  let mastered = 0;
  for (const c of user.cards.values()) if (cardStatus(c) === 'mastered') mastered += 1;
  const learned = user.cards.size;
  const total = data.words.length;
  const firstVisit = learned === 0;

  return (
    <>
      <h1>Today</h1>
      {firstVisit && (
        <p className="notice">
          Welcome. Start by learning your first {Math.min(user.settings.learnBatch, allowance)} words. Each day, do your review first, then
          learn a few new words. Ten to fifteen minutes a day beats a long session once a week.
        </p>
      )}
      <div className="grid two">
        <section className="card" aria-labelledby="home-review">
          <h2 id="home-review">Daily Review</h2>
          <p>
            <strong data-testid="due-count" style={{ fontSize: '1.6rem' }}>
              {due}
            </strong>{' '}
            {due === 1 ? 'word is' : 'words are'} due today.
          </p>
          {due > 0 ? (
            <Link className="btn primary block" to="/review">
              Start review
            </Link>
          ) : (
            <p className="muted">{learned === 0 ? 'Learn some words and they will show up here.' : 'All caught up. Nice work.'}</p>
          )}
        </section>
        <section className="card" aria-labelledby="home-learn">
          <h2 id="home-learn">Learn New Words</h2>
          <p>
            <strong data-testid="new-count" style={{ fontSize: '1.6rem' }}>
              {allowance}
            </strong>{' '}
            new {allowance === 1 ? 'word' : 'words'} left in today's limit of {user.settings.newPerDay}.
          </p>
          <Link className={`btn block ${due === 0 ? 'primary' : ''}`} to="/learn">
            Learn new words
          </Link>
        </section>
      </div>

      <div className="grid three" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="value">{streak.current}</div>
          <div className="label">day streak</div>
        </div>
        <div className="stat">
          <div className="value">
            {learned}
            <span className="muted" style={{ fontSize: '1rem', fontWeight: 500 }}>
              {' '}
              / {total}
            </span>
          </div>
          <div className="label">words seen</div>
        </div>
        <div className="stat">
          <div className="value">{mastered}</div>
          <div className="label">mastered</div>
        </div>
      </div>

      <h2>More ways to study</h2>
      <div className="grid two">
        {MODES.map((m) => (
          <Link key={m.to} to={m.to} className="tile">
            <strong>{m.title}</strong>
            <span>{m.text}</span>
          </Link>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 18 }}>
        Your progress is saved on this device only. Back it up from <Link to="/settings">Settings</Link>.
      </p>
    </>
  );
}
