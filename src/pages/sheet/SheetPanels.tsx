import { useEffect, useId, useRef, useState } from 'react';
import {
  advanceBlocker,
  ATTRIBUTES,
  essenceToNextLevel,
  LEVEL_UP_CONSUMES_ESSENCE,
  MAX_LEVEL,
  nextPointPrice,
  pointPrice,
  POINTS_PER_LEVEL,
  purchaseCost,
  RESOURCES,
  type Character,
  type ResourceKey,
} from '../../rules';
import { fmt } from '../../lib/format';
import { EditableValue, NumberInput } from '../../components/NumberField';
import { MinusIcon, PlusIcon, ResourceIcon } from '../../components/Icons';
import { gearText, type Sheet } from './useSheet';

// ---- Level -----------------------------------------------------------------

export function LevelTileBody({ c, s }: { c: Character; s: Sheet }) {
  const next = c.level + 1;
  const cost = essenceToNextLevel(c.level);
  const blocker = advanceBlocker(c);
  const [confirming, setConfirming] = useState(false);
  const advanceBtn = useRef<HTMLButtonElement>(null);
  const helpId = useId();

  const help = blocker === 'not-enough-essence'
    ? `Needs ${fmt(cost!)} Essence — ${fmt(c.essence)} available.`
    : null;

  if (cost == null) {
    return (
      <div className="level__main">
        <span className="hero-num">{c.level}</span>
        <span className="level__target">
          <span className="level__target-label">Max level</span>
          <span className="level__target-value level__target-value--max">Level {MAX_LEVEL} is the highest level.</span>
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="level__main">
        <span className="hero-num">{c.level}</span>
        <span className="level__target">
          <span className="level__target-label">Essence to reach Level {next}</span>
          <span className="level__target-value num" data-testid="essence-to-next" title="Calculated from the progression curve">
            {fmt(cost)} <span className="fx" aria-hidden="true">ƒ</span>
          </span>
        </span>
      </div>
      <div className="level__foot">
        <div className="popover-anchor">
          <button
            ref={advanceBtn}
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={blocker !== null}
            aria-describedby={help ? helpId : undefined}
            aria-expanded={confirming}
            title={help ?? undefined}
            onClick={() => setConfirming(true)}
          >
            Advance to Level {next}
          </button>
          {confirming && (
            <AdvancePopover
              c={c}
              onCancel={() => { setConfirming(false); advanceBtn.current?.focus(); }}
              onConfirm={() => { setConfirming(false); s.advance(); }}
            />
          )}
        </div>
      </div>
      {help && <span id={helpId} className="level__help">{help}</span>}
    </>
  );
}

function AdvancePopover({ c, onCancel, onConfirm }: { c: Character; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const cost = essenceToNextLevel(c.level) ?? 0;

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('.btn--secondary')?.focus();
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onCancel(); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onCancel]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={titleId}
      className="popover"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
    >
      <p id={titleId} className="popover__title">Advance to Level {c.level + 1}?</p>
      <dl className="popover__dl num">
        {LEVEL_UP_CONSUMES_ESSENCE && <><dt>Cost</dt><dd className="gold">{fmt(cost)} Essence</dd></>}
        {LEVEL_UP_CONSUMES_ESSENCE && <><dt>Balance after</dt><dd>{fmt(c.essence - cost)}</dd></>}
        <dt>Points gained</dt><dd>+{POINTS_PER_LEVEL}</dd>
        {pointPrice(c.level + 1, 0) != null && <><dt>Next point price</dt><dd>{fmt(pointPrice(c.level + 1, 0)!)}</dd></>}
      </dl>
      <div className="popover__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onConfirm}>Advance</button>
      </div>
    </div>
  );
}

// ---- Essence ---------------------------------------------------------------

export function EssenceTileBody({ c, s }: { c: Character; s: Sheet }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">Available Essence</label>
      <NumberInput id={id} grouped className="input essence-input" value={c.essence} onCommit={s.setEssence} />
      <span className="helper">Spent on levels and on attribute points.</span>
    </>
  );
}

// ---- Reputation ------------------------------------------------------------

export function ReputationTileBody({ c, s }: { c: Character; s: Sheet }) {
  const { rank, progress } = c.reputation;
  return (
    <>
      <div className="rep__main">
        <span className="rep__rank-label">Rank</span>
        <EditableValue value={rank} onCommit={s.setRank} label="Reputation rank" display={(n) => <span className="hero-num">{n}</span>} className="rep__rank" inputClassName="edit-input--lg" />
        <EditableValue value={progress} onCommit={s.setProgress} max={100} label="Progress toward next rank, percent" display={(n) => `${n}%`} className="rep__pct" inputClassName="edit-input--sm" />
      </div>
      <div role="meter" aria-label="Reputation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${progress}% toward Rank ${rank + 1}`} className="rep__bar">
        <div style={{ width: `${progress}%` }} />
      </div>
      <span className="tbd rep__tbd">Rank mechanics · to be defined</span>
    </>
  );
}

// ---- Resources -------------------------------------------------------------

const MAX_ATTR: Record<ResourceKey, string> = { health: 'Constitution', mana: 'Intellect', stamina: 'Endurance' };

export function ResourceMeter({ k, cur, max, phone = false }: { k: ResourceKey; cur: number; max: number; phone?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (cur / max) * 100)) : 0;
  const name = RESOURCES.find((r) => r.key === k)!.name;
  return (
    <div role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={max} aria-valuenow={cur} aria-valuetext={`${cur} of ${max}`} className={`meter meter--${k}${phone ? ' meter--phone' : ''}`}>
      <div className="meter__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function CurrentInput({ c, s, k, className = '' }: { c: Character; s: Sheet; k: ResourceKey; className?: string }) {
  const id = useId();
  const name = RESOURCES.find((r) => r.key === k)!.name;
  return (
    <>
      <label htmlFor={id} className={`res-row__cur-label ${className}`}>Current<span className="sr-only"> {name}</span></label>
      <NumberInput id={id} className="input input--num res-input" value={c.current[k]} onCommit={(n) => s.setCurrent(k, n)} />
    </>
  );
}

export function ResourcesPanel({ c, s }: { c: Character; s: Sheet }) {
  return (
    <section aria-labelledby="t-res" className="panel res-panel">
      <div className="panel-head">
        <h2 id="t-res" className="section-title">Resources</h2>
        <button type="button" className="btn btn--outline btn--sm" onClick={s.restoreAll}>Restore all to max</button>
      </div>
      {RESOURCES.map((r) => {
        const total = s.totals[r.maxFrom];
        return (
          <div key={r.key} className="res-row">
            <div className="res-row__top">
              <span className="res-row__name">
                <span className={`res-chip res-chip--${r.key}`}><ResourceIcon kind={r.key} /></span>{r.name}
              </span>
              <span className="res-row__values num">
                <CurrentInput c={c} s={s} k={r.key} />
                <span className="res-row__slash">/</span>
                <span className="res-row__max" title={`Calculated: ${MAX_ATTR[r.key]} ${total} × 10`}>{fmt(s.max[r.key])}</span>
                <span className="res-row__max-label">max</span>
              </span>
            </div>
            <ResourceMeter k={r.key} cur={c.current[r.key]} max={s.max[r.key]} />
            <div className="res-row__foot">
              <span className="res-row__formula"><span className="fx">ƒ</span> Max = {MAX_ATTR[r.key]} {total} × 10</span>
              <span className="res-row__regen">
                <span className="muted">Regeneration</span>
                <span className="regen num">+{s.regen[r.key]} / min</span>
                <span className="muted">({r.regenSource})</span>
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function PhoneResourcesPanel({ c, s }: { c: Character; s: Sheet }) {
  return (
    <section aria-labelledby="m-res" className="panel res-panel res-panel--phone">
      <h2 id="m-res" className="section-title section-title--sm">Resources</h2>
      {RESOURCES.map((r) => (
        <div key={r.key} className="pres">
          <div className="pres__top">
            <span className="pres__name"><span className={`res-dot res-dot--${r.key}`} aria-hidden="true" />{r.name}</span>
            <span className="pres__values num">
              <CurrentInput c={c} s={s} k={r.key} className="sr-only" />
              <span className="muted"> / {fmt(s.max[r.key])}</span>
            </span>
          </div>
          <ResourceMeter k={r.key} cur={c.current[r.key]} max={s.max[r.key]} phone />
          <span className="pres__regen">Regen <strong className="regen num">+{s.regen[r.key]} / min</strong> · {r.regenSource}</span>
        </div>
      ))}
    </section>
  );
}

// ---- Attributes ------------------------------------------------------------

export function AttributesPanel({ c, s, phone = false }: { c: Character; s: Sheet; phone?: boolean }) {
  const has = c.unspentPoints > 0;
  const pill = <strong className={`pill${has ? ' pill--on' : ''}`}>{c.unspentPoints}</strong>;
  return (
    <section aria-labelledby="t-attr" className={`panel attr-panel${phone ? ' attr-panel--phone' : ''}`}>
      <div className="panel-head">
        <h2 id="t-attr" className={`section-title${phone ? ' section-title--sm' : ''}`}>Attributes</h2>
        <span className="attr-panel__unspent">{phone ? 'Unspent' : 'Unspent points'} {pill}</span>
      </div>
      {phone ? (
        <ul className="attr-tiles">
          {ATTRIBUTES.map((m) => (
            <li key={m.key} className="attr-tile">
              <span className="attr-tile__text">
                <span className="abbr">{m.abbr}</span>
                <span className="attr-tile__name">{m.name}</span>
              </span>
              <span className="attr-tile__value num" title={`Base ${c.baseAttributes[m.key]} ${gearText(s.gear[m.key])}`.trim()}>{s.totals[m.key]}</span>
              {has && (
                <button type="button" className="icon-btn attr-add" aria-label={`Allocate 1 point to ${m.name}`} onClick={() => s.allocate(m.key)}>
                  <PlusIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="attr-rows">
          {ATTRIBUTES.map((m) => {
            const g = s.gear[m.key];
            return (
              <li key={m.key} className="attr-row">
                <span className="abbr attr-row__abbr">{m.abbr}</span>
                <span className="attr-row__text">
                  <span className="attr-row__name">{m.name}</span>
                  <span className="attr-row__effect">{m.effect}</span>
                </span>
                <span className="attr-row__nums">
                  <span className="attr-row__total num" data-testid={`total-${m.key}`}>{s.totals[m.key]}</span>
                  <span className="attr-row__base num">
                    Base {c.baseAttributes[m.key]}{g !== 0 && <> <span className={g > 0 ? 'regen' : 'warn'}>{gearText(g)}</span></>}
                  </span>
                </span>
                <button type="button" className="icon-btn attr-add" aria-label={`Allocate 1 point to ${m.name}`} disabled={!has} onClick={() => s.allocate(m.key)}>
                  <PlusIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---- Attribute points ------------------------------------------------------

export function PointsPanel({ c, s, phone = false }: { c: Character; s: Sheet; phone?: boolean }) {
  const [qty, setQty] = useState(1);
  const qtyId = useId();
  const cost = purchaseCost(c, qty);
  const nextPrice = nextPointPrice(c);
  const bought = c.pointsPurchasedThisLevel;

  const stepper = (
    <div className="stepper">
      <button type="button" className="stepper__btn" aria-label="Decrease points to purchase" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}><MinusIcon /></button>
      <NumberInput id={qtyId} className="stepper__input num" value={qty} onCommit={(n) => setQty(Math.max(1, n))} />
      <button type="button" className="stepper__btn" aria-label="Increase points to purchase" onClick={() => setQty((q) => q + 1)}><PlusIcon /></button>
    </div>
  );

  const intro = phone ? (
    <p className="points-panel__intro">{POINTS_PER_LEVEL} points per level from Level 2 · bought points cost 25% more each, resetting on level up.</p>
  ) : (
    <p className="points-panel__intro">
      Each level from Level 2 grants {POINTS_PER_LEVEL} points. Additional points cost ⅜ of this level’s Essence requirement,
      and each one bought this level costs 25% more than the last. Use <strong>+</strong> beside an attribute to allocate.
    </p>
  );

  if (cost == null || nextPrice == null) {
    return (
      <section aria-labelledby="t-buy" className={`panel points-panel${phone ? ' points-panel--phone' : ''}`}>
        <h2 id="t-buy" className="section-title section-title--sm">Attribute Points</h2>
        <p className="points-panel__intro">Points can’t be purchased at Level {MAX_LEVEL}, the maximum level.</p>
        {c.unspentPoints === 0 && !phone && <span className="helper helper--sm">Allocation buttons are disabled until unspent points are available.</span>}
      </section>
    );
  }

  const after = c.essence - cost;
  const short = cost > c.essence;
  const word = qty === 1 ? 'point' : 'points';

  const buy = () => { if (s.purchase(qty, c)) setQty(1); };

  return (
    <section aria-labelledby="t-buy" className={`panel points-panel${phone ? ' points-panel--phone' : ''}`}>
      <h2 id="t-buy" className="section-title section-title--sm">Attribute Points</h2>
      {intro}
      <div className="points-well">
        <div className="fieldset points-well__qty">
          <label htmlFor={qtyId} className="points-well__label">Points to purchase</label>
          {stepper}
        </div>
        <dl className="points-well__dl num">
          <div><dt>Cost</dt><dd className="gold">{fmt(cost)} Essence</dd></div>
          <div><dt>Balance after</dt><dd className={short ? 'warn' : ''}>{after < 0 ? `−${fmt(-after)}` : fmt(after)}</dd></div>
        </dl>
        <button type="button" className="btn btn--primary points-well__buy" disabled={short} aria-describedby={short ? `${qtyId}-short` : undefined} onClick={buy}>
          Purchase {qty} {word}
        </button>
      </div>
      <span className="helper helper--sm num" data-testid="next-point-price">
        Next point {fmt(nextPrice)} Essence · {bought} bought at Level {c.level}
      </span>
      {short && <span id={`${qtyId}-short`} className="helper warn">Not enough Essence</span>}
      {c.unspentPoints === 0 && !phone && <span className="helper helper--sm">Allocation buttons are disabled until unspent points are available.</span>}
    </section>
  );
}
