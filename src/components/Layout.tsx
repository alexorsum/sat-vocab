import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../state/app';
import { dueCards } from '../lib/scheduler';
import { BrowseIcon, HomeIcon, PracticeIcon, ProgressIcon, ReviewIcon } from './Icons';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/review', label: 'Daily Review' },
  { to: '/learn', label: 'Learn New Words' },
  { to: '/practice', label: 'Words in Context' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/roots', label: 'Roots Explorer' },
  { to: '/mistakes', label: 'Mistake Log' },
  { to: '/browse', label: 'Word Browser' },
  { to: '/progress', label: 'Progress' },
  { to: '/game', label: 'Speed Game' },
  { to: '/how', label: 'How This App Works' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  const { user } = useApp();
  const due = dueCards(user.cards.values(), Date.now()).length;
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // On every page change, scroll to the top and move focus to the page so
  // screen reader and keyboard users start in the right place.
  // On first load, focus stays at the top so the skip link is the first Tab stop.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.key]);

  return (
    <div className="app">
      <button className="skip-link" onClick={() => mainRef.current?.focus()}>
        Skip to content
      </button>
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          SAT Vocab
        </NavLink>
        <NavLink to="/settings" className="btn quiet small">
          Settings
        </NavLink>
      </header>
      <nav className="sidenav" aria-label="Main">
        <NavLink to="/" className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          SAT Vocab
        </NavLink>
        <ul>
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.end} className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
                {n.label}
                {n.to === '/review' && due > 0 && (
                  <span className="count-badge">
                    {due}
                    <span className="sr-only"> due</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" ref={mainRef} tabIndex={-1}>
        {/* A new key on every navigation gives each visit a fresh page, so tapping a menu item restarts that activity. */}
        <Outlet key={location.key} />
      </main>
      <nav className="tabbar" aria-label="Quick links">
        <ul>
          <li>
            <NavLink to="/" end>
              <HomeIcon />
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/review">
              <ReviewIcon />
              Review
              {due > 0 && (
                <span className="count-badge">
                  {due}
                  <span className="sr-only"> due</span>
                </span>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink to="/practice">
              <PracticeIcon />
              Practice
            </NavLink>
          </li>
          <li>
            <NavLink to="/browse">
              <BrowseIcon />
              Words
            </NavLink>
          </li>
          <li>
            <NavLink to="/progress">
              <ProgressIcon />
              Progress
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}
