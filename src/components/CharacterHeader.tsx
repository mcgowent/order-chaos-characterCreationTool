import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { filledSlotCount, TOTAL_SLOTS, type Character } from '../rules';
import { useStore } from '../store/store';
import { InitialsTile } from './InitialsTile';
import { Dialog } from './Dialog';
import { Menu, type MenuItem } from './Menu';
import { SaveStatus } from './SaveStatus';
import { ChevronLeftIcon, DotsIcon, PenIcon } from './Icons';
import './CharacterHeader.css';

type View = 'sheet' | 'equipment';

function Tabs({ c, view }: { c: Character; view: View }) {
  const filled = filledSlotCount(c.equipment);
  return (
    <nav aria-label="Character views" className="char-tabs">
      <NavLink to={`/character/${c.id}`} end className={({ isActive }) => `char-tab${isActive ? ' is-active' : ''}`}>
        Character Sheet
      </NavLink>
      <NavLink to={`/character/${c.id}/equipment`} className={({ isActive }) => `char-tab${isActive ? ' is-active' : ''}`}>
        Equipment
        {view === 'sheet' && <span className="char-tab__badge num" aria-label={`${filled} of ${TOTAL_SLOTS} slots filled`}>{filled} / {TOTAL_SLOTS}</span>}
      </NavLink>
    </nav>
  );
}

/** Identity header for the Sheet (large, with Edit identity) and Equipment (compact). */
export function CharacterHeader({ c, view, onEdit }: { c: Character; view: View; onEdit: () => void }) {
  if (view === 'equipment') {
    const meta = [c.species, `Level ${c.level}`].filter(Boolean).join(' · ');
    return (
      <section aria-label="Identity" className="char-head char-head--compact">
        <div className="char-head__row">
          <InitialsTile name={c.name} portrait={c.portrait} size={52} variant="hero" />
          <div className="char-head__text">
            <h1 className="char-head__name char-head__name--compact">{c.name}</h1>
            <span className="char-head__line">
              {c.classification && <span className="char-head__class">{c.classification}</span>}
              <span className="char-head__muted">{c.classification ? ' · ' : ''}{meta}</span>
            </span>
          </div>
          <span className="char-head__slots"><strong className="num">{filledSlotCount(c.equipment)}</strong> of {TOTAL_SLOTS} slots equipped</span>
        </div>
        <Tabs c={c} view={view} />
      </section>
    );
  }
  return (
    <section aria-label="Identity" className="char-head">
      <div className="char-head__row">
        <InitialsTile name={c.name} portrait={c.portrait} size={72} variant="hero" />
        <div className="char-head__text char-head__text--wide">
          <h1 className="char-head__name">{c.name}</h1>
          <dl className="char-head__dl">
            <div><dt>Classification</dt><dd className="char-head__class">{c.classification || 'Not set'}</dd></div>
            <div><dt>Species</dt><dd className="char-head__species">{c.species || 'Not set'}</dd></div>
          </dl>
        </div>
        <button type="button" className="btn btn--outline" onClick={onEdit}><PenIcon />Edit identity</button>
      </div>
      <Tabs c={c} view={view} />
    </section>
  );
}

/** Phone identity card (sheet). */
export function PhoneIdentity({ c, onEdit }: { c: Character; onEdit: () => void }) {
  return (
    <section aria-label="Identity" className="phone-id">
      <InitialsTile name={c.name} portrait={c.portrait} size={56} variant="hero" />
      <div className="phone-id__text">
        <h1 className="phone-id__name">{c.name}</h1>
        {c.classification && <span className="char-head__class">{c.classification}</span>}
        {c.species && <span className="char-head__muted">{c.species}</span>}
      </div>
      <button type="button" className="icon-btn icon-btn--touch icon-btn--ghost" aria-label="Edit identity" onClick={onEdit}><PenIcon /></button>
    </section>
  );
}

/** Compact phone top bar: back arrow, title, save status, ⋯ menu. */
export function PhoneBar({ title, backTo, backLabel, items }: { title: string; backTo: string; backLabel: string; items: MenuItem[] }) {
  return (
    <header className="phone-bar">
      <Link to={backTo} className="phone-bar__back" aria-label={backLabel}><ChevronLeftIcon /></Link>
      <span className="phone-bar__title">{title}</span>
      <SaveStatus compact />
      <Menu label="More actions" trigger={<DotsIcon />} triggerClassName="phone-bar__more" items={items} />
    </header>
  );
}

/** Edit identity modal with the Delete character confirm step. */
export function IdentityDialog({ c, onClose }: { c: Character; onClose: () => void }) {
  const { updateCharacter, deleteCharacter } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState(c.name);
  const [classification, setClassification] = useState(c.classification);
  const [species, setSpecies] = useState(c.species);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trimmed = name.trim();

  const save = () => {
    if (!trimmed) return;
    updateCharacter(c.id, (x) =>
      x.name === trimmed && x.classification === classification.trim() && x.species === species.trim()
        ? x
        : { ...x, name: trimmed, classification: classification.trim(), species: species.trim() });
    onClose();
  };

  const doDelete = () => {
    navigate('/', { replace: true, state: { notice: `Deleted “${c.name}”` } });
    // After the route has left the sheet, so it never renders a missing character.
    setTimeout(() => deleteCharacter(c.id), 0);
  };

  if (confirmDelete) {
    return (
      <Dialog
        title="Delete character?"
        role="alertdialog"
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>Keep character</button>
            <button type="button" className="btn btn--primary btn--danger" onClick={doDelete}>Delete permanently</button>
          </>
        }
      >
        <p className="dialog-text">“{c.name}” and all of their stats and equipment will be removed from this browser. This can’t be undone — export a backup from the Library first if you might need it.</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Edit identity"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--danger-text" onClick={() => setConfirmDelete(true)}>Delete character</button>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="identity-form" className="btn btn--primary" disabled={!trimmed}>Save</button>
        </>
      }
    >
      <form id="identity-form" className="identity-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <div className="fieldset">
          <label htmlFor="id-name" className="field-label">Name <span className="req" aria-hidden="true">*</span></label>
          <input id="id-name" className="input" required aria-required="true" maxLength={80} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!trimmed} aria-describedby={!trimmed ? 'id-name-err' : undefined} />
          {!trimmed && <span id="id-name-err" className="field-error">A name is required.</span>}
        </div>
        <div className="fieldset">
          <label htmlFor="id-class" className="field-label">Classification</label>
          <input id="id-class" className="input" maxLength={120} autoComplete="off" placeholder="e.g. Arcane Knight, Rune Archivist" aria-describedby="id-class-h" value={classification} onChange={(e) => setClassification(e.target.value)} />
          <span id="id-class-h" className="helper">Free text — enter any classification.</span>
        </div>
        <div className="fieldset">
          <label htmlFor="id-species" className="field-label">Species</label>
          <input id="id-species" className="input" maxLength={120} autoComplete="off" placeholder="e.g. Human, Sylvari, Ogrekin" aria-describedby="id-species-h" value={species} onChange={(e) => setSpecies(e.target.value)} />
          <span id="id-species-h" className="helper">Free text — enter any species.</span>
        </div>
      </form>
    </Dialog>
  );
}
