import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router-dom';
import {
  ATTRIBUTES,
  createCharacter,
  maxResources,
  regenRates,
  rollStartingAttributes,
  STARTING_ATTRIBUTE_MAX,
  STARTING_ATTRIBUTE_MIN,
  STARTING_LEVEL,
  sumAttributes,
  type Rng,
} from '../rules';
import { useStore } from '../store/store';
import { newId } from '../store/storage';
import { InitialsTile } from '../components/InitialsTile';
import { Dialog } from '../components/Dialog';
import { ArrowLeftIcon, DieIcon } from '../components/Icons';
import './CreatePage.css';

const PIPS = Array.from({ length: STARTING_ATTRIBUTE_MAX - STARTING_ATTRIBUTE_MIN + 1 }, (_, i) => STARTING_ATTRIBUTE_MIN + i);

export function CreatePage({ rng = Math.random }: { rng?: Rng }) {
  const { addCharacter } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [classification, setClassification] = useState('');
  const [species, setSpecies] = useState('');
  const [roll, setRoll] = useState(() => ({ n: 1, attrs: rollStartingAttributes(rng) }));
  const created = useRef(false);

  const trimmed = name.trim();
  const dirty = trimmed !== '' && !created.current;
  const total = sumAttributes(roll.attrs);
  const max = maxResources(roll.attrs);
  const regen = regenRates(roll.attrs);
  const a = roll.attrs;

  // Reads the ref at navigation time so the post-create navigate is never blocked.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    trimmed !== '' && !created.current && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const c = createCharacter({ name: trimmed, classification, species, baseAttributes: roll.attrs }, newId(), now);
    created.current = true;
    addCharacter(c);
    navigate(`/character/${c.id}`);
  };

  const resources = [
    { key: 'health', name: 'Health', max: max.health, formula: `Constitution ${a.constitution} × 10`, regen: regen.health, regenFormula: 'Constitution per minute' },
    { key: 'mana', name: 'Mana', max: max.mana, formula: `Intellect ${a.intellect} × 10`, regen: regen.mana, regenFormula: `Intellect ${a.intellect} + Concentration ${a.concentration}` },
    { key: 'stamina', name: 'Stamina', max: max.stamina, formula: `Endurance ${a.endurance} × 10`, regen: regen.stamina, regenFormula: 'Endurance per minute' },
  ] as const;

  return (
    <main className="page create">
      <div className="create__head">
        <Link to="/" className="back-link"><ArrowLeftIcon />Back to Library</Link>
        <h1 className="create__title">Create a Character</h1>
        <p className="create__lead">
          Name them, roll their starting attributes, and check the resources they begin with. New characters start at <strong>Level 1</strong>.
        </p>
      </div>

      <div className="create__layout">
        <form id="create-form" className="create__form" onSubmit={onSubmit} noValidate>
          <section aria-labelledby="s-identity" className="panel create__section">
            <div className="step-head">
              <span className="step-num" aria-hidden="true">1</span>
              <h2 id="s-identity" className="section-title">Identity</h2>
            </div>
            <div className="fieldset">
              <label htmlFor="f-name" className="field-label">Name <span className="req" aria-hidden="true">*</span></label>
              <input
                id="f-name"
                className="input"
                required
                aria-required="true"
                maxLength={80}
                autoComplete="off"
                placeholder="e.g. Kestra Dunmere"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field-grid">
              <div className="fieldset">
                <label htmlFor="f-class" className="field-label">Classification</label>
                <input id="f-class" className="input" maxLength={120} autoComplete="off" placeholder="e.g. Arcane Knight, Rune Archivist" aria-describedby="h-class" value={classification} onChange={(e) => setClassification(e.target.value)} />
                <span id="h-class" className="helper">Free text — enter any classification.</span>
              </div>
              <div className="fieldset">
                <label htmlFor="f-species" className="field-label">Species</label>
                <input id="f-species" className="input" maxLength={120} autoComplete="off" placeholder="e.g. Human, Sylvari, Ogrekin" aria-describedby="h-species" value={species} onChange={(e) => setSpecies(e.target.value)} />
                <span id="h-species" className="helper">Free text — enter any species.</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="s-attr" className="panel create__section">
            <div className="step-head step-head--split">
              <div className="step-head">
                <span className="step-num" aria-hidden="true">2</span>
                <h2 id="s-attr" className="section-title">Starting Attributes</h2>
              </div>
              <button type="button" className="btn btn--secondary" onClick={() => setRoll((r) => ({ n: r.n + 1, attrs: rollStartingAttributes(rng) }))}>
                <DieIcon />Roll Starting Attributes
              </button>
            </div>
            <p className="create__roll-line">
              Each attribute rolls a whole number from <strong>10 to 15</strong>. Roll {roll.n} · Total <strong className="num">{total}</strong>
            </p>
            <div className="sr-only" aria-live="polite">
              Roll {roll.n}: {ATTRIBUTES.map((m) => `${m.name} ${a[m.key]}`).join(', ')}. Total {total}.
            </div>
            <ul className="roll-grid">
              {ATTRIBUTES.map((m) => (
                <li key={m.key} className="roll-tile">
                  <div className="roll-tile__top">
                    <span className="roll-tile__name">{m.name}</span>
                    <span className="roll-tile__abbr" aria-hidden="true">{m.abbr}</span>
                  </div>
                  <span className="roll-tile__value num" data-testid={`roll-${m.key}`}>{a[m.key]}</span>
                  <div className="pips" aria-hidden="true">
                    {PIPS.map((p) => <span key={p} className={p <= a[m.key] ? 'pip pip--on' : 'pip'} />)}
                  </div>
                  <span className="roll-tile__note">{m.createNote}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="s-res" className="panel create__section">
            <div className="step-head step-head--split">
              <div className="step-head">
                <span className="step-num" aria-hidden="true">3</span>
                <h2 id="s-res" className="section-title">Resource Preview</h2>
              </div>
              <span className="chip-calc"><span className="fx">ƒ</span>Calculated</span>
            </div>
            <ul className="res-preview">
              {resources.map((r) => (
                <li key={r.key} className="res-preview__row">
                  <div className="res-preview__label">
                    <span className={`res-swatch res-swatch--${r.key}`} aria-hidden="true" />
                    <span className="res-preview__text">
                      <span className="res-preview__name">Maximum {r.name}</span>
                      <span className="res-preview__formula">{r.formula}</span>
                    </span>
                  </div>
                  <span className="res-preview__max num">{r.max}</span>
                  <span className="res-preview__regen">
                    <span className="res-preview__rate num">+{r.regen} / min</span>
                    <span className="res-preview__formula">{r.regenFormula}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </form>

        <aside aria-label="Summary" className="create__aside">
          <div className="panel panel--featured preview">
            <span className="overline preview__overline">Character preview</span>
            <div className="preview__id">
              <InitialsTile name={trimmed} size={60} />
              <div className="preview__text">
                <span className="preview__name">{trimmed || 'Unnamed character'}</span>
                <span className="preview__class">{classification.trim() || 'Classification not set'}</span>
                <span className="preview__species">{species.trim() || 'Species not set'}</span>
              </div>
            </div>
            <dl className="preview__stats">
              <div><dt>Level</dt><dd>{STARTING_LEVEL}</dd></div>
              <div><dt>Attribute total</dt><dd className="num">{total}</dd></div>
            </dl>
            <p className="helper">Attribute points are earned from Level 2 (2 per level) or purchased with Essence on the character sheet.</p>
            <button type="submit" form="create-form" className="btn btn--primary btn--block preview__cta" disabled={!trimmed} aria-describedby={!trimmed ? 'need-name' : undefined}>
              Create Character
            </button>
            {!trimmed && <span id="need-name" className="preview__need">Add a name to create this character.</span>}
            <Link to="/" className="btn btn--ghost btn--block">Cancel</Link>
          </div>
        </aside>
      </div>

      {blocker.state === 'blocked' && (
        <Dialog
          title="Discard this character?"
          role="alertdialog"
          onClose={() => blocker.reset()}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => blocker.reset()}>Keep editing</button>
              <button type="button" className="btn btn--primary" onClick={() => blocker.proceed()}>Discard</button>
            </>
          }
        >
          <p className="dialog-text">“{trimmed}” hasn’t been created yet. Leaving now discards the name and rolled attributes.</p>
        </Dialog>
      )}
    </main>
  );
}
