import { Link, NavLink, useMatch } from 'react-router-dom';
import { RuneStrip, ShieldLogo } from './Icons';
import './TopBar.css';

export function TopBar({ className = '' }: { className?: string }) {
  // Sheet and Equipment belong to the Library section.
  const inCharacter = useMatch('/character/*');
  return (
    <header className={`topbar ${className}`}>
      <div className="topbar__inner">
        <Link to="/" className="topbar__brand">
          <ShieldLogo />
          <span className="topbar__brand-text">
            <span className="topbar__title">ARCANE KNIGHT</span>
            <span className="topbar__sub">Character Creator</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="topbar__nav">
          <NavLink
            to="/"
            end={!inCharacter}
            className={({ isActive }) => `topbar__link${isActive || inCharacter ? ' is-active' : ''}`}
            aria-current={inCharacter ? 'page' : undefined}
          >
            Library
          </NavLink>
          <NavLink to="/new" className={({ isActive }) => `topbar__link${isActive ? ' is-active' : ''}`}>
            New Character
          </NavLink>
        </nav>
        <div className="topbar__author">
          <span className="topbar__avatar" aria-hidden="true">TM</span>
          <span className="topbar__author-label">Author workspace</span>
        </div>
      </div>
      <RuneStrip id="rune-top" />
    </header>
  );
}
