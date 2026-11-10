import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { readPref, VIEW_KEY, writePref } from '../store/storage';
import { downloadExport, parseImportText, type ParsedImport } from '../store/backup';
import { relativeDate } from '../lib/format';
import type { Character } from '../rules';
import { InitialsTile } from '../components/InitialsTile';
import { Dialog } from '../components/Dialog';
import { Menu } from '../components/Menu';
import { useToast } from '../components/Toast';
import { ArrowRightIcon, ChevronDownIcon, CloseIcon, DotsIcon, GridIcon, ListIcon, PlusIcon, SearchIcon } from '../components/Icons';
import type { LibraryLocationState } from '../App';
import './LibraryPage.css';

type SortKey = 'recent' | 'name' | 'level';
type View = 'grid' | 'list';

const SORTS: Record<SortKey, { label: string; cmp: (a: Character, b: Character) => number }> = {
  recent: { label: 'Recently edited', cmp: (a, b) => b.updatedAt.localeCompare(a.updatedAt) },
  name: { label: 'Name A–Z', cmp: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) },
  level: { label: 'Level (high → low)', cmp: (a, b) => b.level - a.level || a.name.localeCompare(b.name) },
};

export function matchesQuery(c: Character, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [c.name, c.classification, c.species].some((s) => s.toLowerCase().includes(needle));
}

export function LibraryPage() {
  const { characters, exportData, importCharacters } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [notice, setNotice] = useState((location.state as LibraryLocationState | null)?.notice);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [view, setViewState] = useState<View>(() => (readPref(VIEW_KEY) === 'list' ? 'list' : 'grid'));
  const [pendingImport, setPendingImport] = useState<ParsedImport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const setView = (v: View) => { setViewState(v); writePref(VIEW_KEY, v); };

  const shown = useMemo(
    () => characters.filter((c) => matchesQuery(c, query)).sort(SORTS[sort].cmp),
    [characters, query, sort],
  );

  const n = characters.length;
  const subtitle = n === 0
    ? 'No characters yet'
    : `${n} character${n === 1 ? '' : 's'} · Open a sheet to review stats while you write.`;

  const dismissNotice = () => {
    setNotice(undefined);
    navigate('.', { replace: true, state: null });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setPendingImport(parseImportText(await file.text()));
    if (fileInput.current) fileInput.current.value = '';
  };

  const confirmImport = () => {
    if (!pendingImport?.ok) return;
    const added = importCharacters(pendingImport.characters);
    setPendingImport(null);
    toast({ message: `Imported ${added} character${added === 1 ? '' : 's'}` });
  };

  return (
    <main className="page library">
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" className="icon-btn icon-btn--ghost" aria-label="Dismiss notice" onClick={dismissNotice}>
            <CloseIcon />
          </button>
        </div>
      )}

      <div className="library__head">
        <div className="library__titles">
          <span className="overline">Arcane Knight universe</span>
          <h1 className="library__title">Character Library</h1>
          <p className="library__subtitle">{subtitle}</p>
        </div>
        <Link to="/new" className="btn btn--primary btn--lg btn--glow">
          <PlusIcon size={18} />Create Character
        </Link>
      </div>

      {n > 0 && (
        <div className="toolbar">
          <label className="toolbar__search">
            <span className="sr-only">Search characters</span>
            <span className="toolbar__search-icon"><SearchIcon /></span>
            <input
              ref={searchInput}
              type="search"
              className="input"
              placeholder="Search by name, classification, or species"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="toolbar__controls">
            <label className="sort">
              <span className="sort__prefix">Sort:</span>
              <select className="sort__select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort characters">
                {(Object.keys(SORTS) as SortKey[]).map((k) => <option key={k} value={k}>{SORTS[k].label}</option>)}
              </select>
              <ChevronDownIcon />
            </label>
            <div role="group" aria-label="View" className="view-toggle">
              <button type="button" aria-pressed={view === 'grid'} aria-label="Grid view" onClick={() => setView('grid')}><GridIcon /></button>
              <button type="button" aria-pressed={view === 'list'} aria-label="List view" onClick={() => setView('list')}><ListIcon /></button>
            </div>
            <Menu
              label="More library actions"
              trigger={<DotsIcon horizontal />}
              triggerClassName="toolbar__more"
              items={[
                { label: 'Export characters (JSON)', onSelect: () => downloadExport(exportData()) },
                { label: 'Import characters', onSelect: () => fileInput.current?.click() },
              ]}
            />
          </div>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {n > 0 && shown.length === 0 ? (
        <div className="no-results" role="status">
          <p>No characters match “{query.trim()}”</p>
          <button type="button" className="btn btn--outline" onClick={() => { setQuery(''); searchInput.current?.focus(); }}>Clear search</button>
        </div>
      ) : view === 'grid' || n === 0 ? (
        <ul className="card-grid" aria-label="Characters">
          {shown.map((c) => <li key={c.id}><CharacterCard c={c} /></li>)}
          <li>
            <Link to="/new" className="new-card">
              <span className="new-card__plus"><PlusIcon size={20} /></span>
              New character
              <span className="new-card__note">Starts at Level 1 with rolled attributes</span>
            </Link>
          </li>
        </ul>
      ) : (
        <ul className="char-list" aria-label="Characters">
          {shown.map((c) => <li key={c.id}><CharacterRow c={c} /></li>)}
          <li>
            <Link to="/new" className="char-row char-row--new"><PlusIcon />New character</Link>
          </li>
        </ul>
      )}

      {n === 0 && (
        <button type="button" className="btn btn--ghost library__import-empty" onClick={() => fileInput.current?.click()}>
          Import characters
        </button>
      )}

      {pendingImport && (
        <Dialog
          title="Import characters"
          onClose={() => setPendingImport(null)}
          footer={pendingImport.ok ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setPendingImport(null)}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={confirmImport} disabled={pendingImport.characters.length === 0}>
                Import {pendingImport.characters.length}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--outline" onClick={() => setPendingImport(null)}>Close</button>
          )}
        >
          {pendingImport.ok ? (
            <p>
              <strong className="num">{pendingImport.characters.length}</strong> character{pendingImport.characters.length === 1 ? '' : 's'} will be
              added to your library. Existing characters are never overwritten — any duplicates are added as copies.
            </p>
          ) : (
            <p className="import-error" role="alert">{pendingImport.error}</p>
          )}
        </Dialog>
      )}
    </main>
  );
}

function CharacterCard({ c }: { c: Character }) {
  return (
    <Link
      to={`/character/${c.id}`}
      className="card"
      title={c.name}
      aria-label={`Open ${c.name}${c.classification ? `, ${c.classification}` : ''}${c.species ? `, ${c.species}` : ''}, level ${c.level}`}
    >
      <div className="card__top">
        <InitialsTile name={c.name} portrait={c.portrait} size={56} />
        <span className="card__level"><span className="card__level-label">LEVEL</span><span className="card__level-num num">{c.level}</span></span>
      </div>
      <div className="card__body">
        <h2 className="card__name">{c.name}</h2>
        <dl className="card__meta">
          <dt>Class</dt><dd className="card__class">{c.classification || '—'}</dd>
          <dt>Species</dt><dd className="card__species">{c.species || '—'}</dd>
        </dl>
      </div>
      <div className="card__foot">
        <span className="card__edited">Edited {relativeDate(c.updatedAt)}</span>
        <span className="card__open">Open sheet<ArrowRightIcon /></span>
      </div>
    </Link>
  );
}

function CharacterRow({ c }: { c: Character }) {
  return (
    <Link to={`/character/${c.id}`} className="char-row" title={c.name} aria-label={`Open ${c.name}, level ${c.level}`}>
      <InitialsTile name={c.name} portrait={c.portrait} size={40} />
      <span className="char-row__name">{c.name}</span>
      <span className="char-row__class">{c.classification || '—'}</span>
      <span className="char-row__species">{c.species || '—'}</span>
      <span className="char-row__level"><span className="char-row__level-label">LV</span> <span className="num">{c.level}</span></span>
      <span className="char-row__edited">{relativeDate(c.updatedAt)}</span>
      <span className="card__open">Open sheet<ArrowRightIcon /></span>
    </Link>
  );
}
