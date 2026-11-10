import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ATTRIBUTES,
  RESOURCES,
  setSlotBonus,
  setSlotItem,
  setSlotName,
  SLOTS,
  type Character,
  type EquippedItem,
  type SlotId,
} from '../rules';
import { fmt, signed } from '../lib/format';
import { useIsPhone } from '../lib/useMediaQuery';
import { checkPortraitFile, portraitDataUrl } from '../lib/portrait';
import { useStore } from '../store/store';
import { CharacterHeader, IdentityDialog, PhoneBar } from '../components/CharacterHeader';
import { Dialog } from '../components/Dialog';
import { SaveStatus } from '../components/SaveStatus';
import { useToast } from '../components/Toast';
import { CloseIcon, EmptyDiamondIcon, MinusIcon, PlusIcon, SlotIcon } from '../components/Icons';
import { useSheet } from './sheet/useSheet';
import './EquipmentPage.css';

const LEFT: SlotId[] = ['head', 'neck', 'shoulders', 'back', 'chest', 'wrists'];
const RIGHT: SlotId[] = ['hands', 'waist', 'legs', 'feet', 'trinket1', 'trinket2'];
const BOTTOM: { label: string; slots: SlotId[] }[] = [
  { label: 'Left hand rings', slots: ['leftRing1', 'leftRing2'] },
  { label: 'Weapons', slots: ['mainHand', 'offHand'] },
  { label: 'Right hand rings', slots: ['rightRing1', 'rightRing2'] },
];
const PHONE_GROUPS: { label: string; slots: SlotId[] }[] = [
  { label: 'Armour', slots: ['head', 'shoulders', 'chest', 'wrists', 'hands', 'waist', 'legs', 'feet'] },
  { label: 'Accessories', slots: ['neck', 'back', 'trinket1', 'trinket2'] },
  { label: 'Rings', slots: ['leftRing1', 'leftRing2', 'rightRing1', 'rightRing2'] },
  { label: 'Weapons', slots: ['mainHand', 'offHand'] },
];
const PHONE_LABEL: Partial<Record<SlotId, string>> = {
  leftRing1: 'Left ring 1', leftRing2: 'Left ring 2', rightRing1: 'Right ring 1', rightRing2: 'Right ring 2',
};
const BONUS_LIMIT = 99;

const ABBR = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, a.abbr])) as Record<string, string>;

export function bonusSummary(item: EquippedItem | undefined): string {
  if (!item) return '';
  return ATTRIBUTES.filter((a) => item.bonuses[a.key]).map((a) => `${signed(item.bonuses[a.key]!)} ${ABBR[a.key]}`).join(' · ');
}

const itemName = (item: EquippedItem) => item.name.trim() || 'Unnamed item';

export function slotAriaLabel(slot: SlotId, item: EquippedItem | undefined): string {
  const label = SLOTS[slot].title;
  if (!item) return `${label}: empty`;
  const b = bonusSummary(item);
  return `${label}: ${itemName(item)}${b ? `, ${b}` : ''}`;
}

type SlotLayout = 'left' | 'right' | 'bottom' | 'phone';

interface SlotButtonProps {
  slot: SlotId;
  item: EquippedItem | undefined;
  selected: boolean;
  layout: SlotLayout;
  onSelect: (s: SlotId) => void;
  register: (s: SlotId, el: HTMLButtonElement | null) => void;
}

function SlotButton({ slot, item, selected, layout, onSelect, register }: SlotButtonProps) {
  const state = selected ? 'selected' : item ? 'filled' : 'empty';
  const bonus = item ? bonusSummary(item) || 'No bonuses' : '';
  const label = layout === 'phone' ? PHONE_LABEL[slot] ?? SLOTS[slot].label : SLOTS[slot].label;
  return (
    <button
      ref={(el) => register(slot, el)}
      type="button"
      className={`slot slot--${layout} slot--${state}`}
      aria-pressed={selected}
      aria-label={slotAriaLabel(slot, item)}
      data-slot={slot}
      onClick={() => onSelect(slot)}
    >
      <span className="slot__box"><SlotIcon slot={slot} /></span>
      <span className="slot__text">
        <span className="slot__label">{label}</span>
        <span className="slot__item">{item ? itemName(item) : 'Empty'}</span>
        {(layout === 'bottom' || bonus) && <span className="slot__bonus num">{bonus}</span>}
      </span>
    </button>
  );
}

/** Moves focus to the nearest slot in the arrow's direction (falls back to DOM order). */
function moveFocus(container: HTMLElement, from: HTMLElement, key: string) {
  const all = [...container.querySelectorAll<HTMLElement>('[data-slot]')];
  const i = all.indexOf(from);
  if (i < 0) return;
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key]!;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of all) {
    if (el === from) continue;
    const b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) continue;
    const dx = b.left + b.width / 2 - cx;
    const dy = b.top + b.height / 2 - cy;
    const along = dx * dir[0]! + dy * dir[1]!;
    if (along <= 4) continue;
    const across = Math.abs(dx * dir[1]! + dy * dir[0]!);
    const score = along + across * 2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (!best && r.width === 0) {
    // No layout (e.g. tests): use document order.
    const step = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1;
    best = all[(i + step + all.length) % all.length] ?? null;
  }
  best?.focus();
}

export function EquipmentPage({ character: c }: { character: Character }) {
  const s = useSheet(c);
  const { updateCharacter } = useStore();
  const isPhone = useIsPhone();
  const navigate = useNavigate();
  const toast = useToast();
  const [selected, setSelected] = useState<SlotId | null>(null);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const slotEls = useRef(new Map<SlotId, HTMLButtonElement>());
  const dollRef = useRef<HTMLDivElement>(null);
  const portraitInput = useRef<HTMLInputElement>(null);

  const register = useCallback((slot: SlotId, el: HTMLButtonElement | null) => {
    if (el) slotEls.current.set(slot, el);
    else slotEls.current.delete(slot);
  }, []);

  const close = useCallback(() => {
    const cur = selected;
    setSelected(null);
    // Return focus to the slot that was being edited.
    if (cur) setTimeout(() => slotEls.current.get(cur)?.focus(), 0);
  }, [selected]);

  // Esc closes the desktop panel (the phone bottom sheet handles its own Esc).
  useEffect(() => {
    if (!selected || isPhone) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, isPhone, close]);

  const onDollKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const t = e.target as HTMLElement;
    if (!t.matches('[data-slot]')) return;
    e.preventDefault();
    moveFocus(dollRef.current!, t, e.key);
  };

  const onPortrait = async (file: File | undefined) => {
    if (portraitInput.current) portraitInput.current.value = '';
    if (!file) return;
    const err = checkPortraitFile(file);
    if (err) { toast({ message: err }); return; }
    try {
      const url = await portraitDataUrl(file);
      updateCharacter(c.id, (x) => ({ ...x, portrait: url }));
      toast({ message: 'Portrait added' });
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : 'This image could not be read.' });
    }
  };

  const removePortrait = () => updateCharacter(c.id, (x) => { const { portrait: _p, ...rest } = x; return rest; });

  const slotProps = (slot: SlotId, layout: SlotLayout): SlotButtonProps => ({
    slot, item: c.equipment[slot], selected: selected === slot, layout,
    onSelect: (sl) => setSelected((cur) => (cur === sl && !isPhone ? null : sl)), register,
  });

  const editor = selected && (
    <SlotEditor
      slot={selected}
      item={c.equipment[selected]}
      onName={(name) => updateCharacter(c.id, (x) => setSlotName(x, selected, name))}
      onBonus={(k, v) => updateCharacter(c.id, (x) => setSlotBonus(x, selected, k, Math.max(-BONUS_LIMIT, Math.min(BONUS_LIMIT, v))))}
      onEmpty={() => updateCharacter(c.id, (x) => setSlotItem(x, selected, undefined))}
      onDone={close}
      inSheet={isPhone}
    />
  );

  const fileInput = (
    <input ref={portraitInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onPortrait(e.target.files?.[0])} />
  );

  if (isPhone) {
    return (
      <>
        <PhoneBar
          title="Equipment"
          backTo={`/character/${c.id}`}
          backLabel={`Back to ${c.name}'s character sheet`}
          items={[
            { label: 'Character Sheet', onSelect: () => navigate(`/character/${c.id}`) },
            { label: c.portrait ? 'Replace portrait' : 'Add portrait (optional)', onSelect: () => portraitInput.current?.click() },
            ...(c.portrait ? [{ label: 'Remove portrait', onSelect: removePortrait }] : []),
            { label: 'Edit identity', onSelect: () => setEditingIdentity(true) },
          ]}
        />
        <main className="page page--sheet equip equip--phone">
          <CharacterHeader c={c} view="equipment" onEdit={() => setEditingIdentity(true)} />
          <div ref={dollRef} onKeyDown={onDollKey} className="equip-groups">
            {PHONE_GROUPS.map((g) => (
              <section key={g.label} aria-label={g.label} className="panel equip-group">
                <h2 className="overline equip-group__title">{g.label}</h2>
                <div className="equip-group__grid">
                  {g.slots.map((sl) => <SlotButton key={sl} {...slotProps(sl, 'phone')} />)}
                </div>
              </section>
            ))}
          </div>
          <TotalsPanel c={c} s={s} />
        </main>
        {fileInput}
        {selected && (
          <Dialog title={SLOTS[selected].title} overline="Selected slot" variant="sheet" onClose={close}>
            {editor}
          </Dialog>
        )}
        {editingIdentity && <IdentityDialog c={c} onClose={() => setEditingIdentity(false)} />}
      </>
    );
  }

  return (
    <main className="page page--sheet equip">
      <div className="toprow">
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link to="/">Library</Link><span aria-hidden="true">/</span>
          <Link to={`/character/${c.id}`}>{c.name}</Link><span aria-hidden="true">/</span>
          <span aria-current="page">Equipment</span>
        </nav>
        <SaveStatus />
      </div>

      <CharacterHeader c={c} view="equipment" onEdit={() => setEditingIdentity(true)} />

      <div className="equip__cols">
        <section aria-labelledby="t-gear" className="panel doll-panel">
          <div className="panel-head">
            <h2 id="t-gear" className="section-title">Equipment</h2>
            <span className="helper">Select a slot to set its item and attribute bonuses.</span>
          </div>
          <div ref={dollRef} onKeyDown={onDollKey} className="doll">
            <div className="doll__main">
              <div className="doll__col">{LEFT.map((sl) => <SlotButton key={sl} {...slotProps(sl, 'left')} />)}</div>
              <div className="doll__figure">
                <Figure portrait={c.portrait} name={c.name} />
                <div className="doll__portrait-actions">
                  <button type="button" className="btn btn--sm doll__portrait-btn" onClick={() => portraitInput.current?.click()}>
                    {c.portrait ? 'Replace portrait' : 'Add portrait (optional)'}
                  </button>
                  {c.portrait && <button type="button" className="btn btn--ghost btn--sm" onClick={removePortrait}>Remove portrait</button>}
                </div>
              </div>
              <div className="doll__col doll__col--right">{RIGHT.map((sl) => <SlotButton key={sl} {...slotProps(sl, 'right')} />)}</div>
            </div>
            <div className="doll__bottom">
              {BOTTOM.map((g) => (
                <div key={g.label} role="group" aria-label={g.label} className="doll__group">
                  <span className="doll__group-label" aria-hidden="true">{g.label}</span>
                  <div className="doll__group-slots">
                    {g.slots.map((sl) => <SlotButton key={sl} {...slotProps(sl, 'bottom')} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="equip__side">
          <section aria-labelledby={selected ? 't-slot' : 't-noslot'} className={`panel slot-panel${selected ? ' slot-panel--active' : ''}`}>
            {selected ? (
              <>
                <div className="slot-panel__head">
                  <div className="slot-panel__titles">
                    <span className="overline">Selected slot</span>
                    <h2 id="t-slot" className="section-title">{SLOTS[selected].title}</h2>
                  </div>
                  <button type="button" className="icon-btn icon-btn--ghost" aria-label="Close slot editor" onClick={close}><CloseIcon /></button>
                </div>
                {editor}
              </>
            ) : (
              <div className="slot-panel__empty">
                <EmptyDiamondIcon />
                <h2 id="t-noslot" className="section-title section-title--sm">No slot selected</h2>
                <p className="helper">Choose any slot on the figure to name its item and set the attributes it grants.</p>
              </div>
            )}
          </section>
          <TotalsPanel c={c} s={s} />
        </div>
      </div>
      {fileInput}
      {editingIdentity && <IdentityDialog c={c} onClose={() => setEditingIdentity(false)} />}
    </main>
  );
}

function Figure({ portrait, name }: { portrait?: string; name: string }) {
  return (
    <div className="figure">
      <svg width="200" height="300" viewBox="0 0 200 300" aria-hidden="true" className="figure__svg">
        <circle cx="100" cy="150" r="94" stroke="var(--ak-gold)" strokeOpacity=".28" fill="none" />
        <circle cx="100" cy="150" r="82" stroke="var(--ak-teal)" strokeOpacity=".22" strokeDasharray="2 7" fill="none" />
        <path d="M100 56 L104 62 L100 68 L96 62 Z M100 232 L104 238 L100 244 L96 238 Z M6 150 L12 146 L18 150 L12 154 Z M182 150 L188 146 L194 150 L188 154 Z" fill="var(--ak-gold)" fillOpacity=".5" />
        {!portrait && (
          <>
            <circle cx="100" cy="64" r="20" fill="rgba(201,164,92,.06)" stroke="var(--ak-gold-dim)" strokeWidth="1.2" />
            <path d="M66 100 Q100 88 134 100 L146 172 L133 175 L125 128 L124 190 L118 272 H104 L100 200 L96 272 H82 L76 190 L75 128 L67 175 L54 172 Z" fill="rgba(201,164,92,.06)" stroke="var(--ak-gold-dim)" strokeWidth="1.2" strokeLinejoin="round" />
          </>
        )}
      </svg>
      {portrait && <img src={portrait} alt={`Portrait of ${name}`} className="figure__portrait" />}
    </div>
  );
}

interface SlotEditorProps {
  slot: SlotId;
  item: EquippedItem | undefined;
  onName: (name: string) => void;
  onBonus: (key: (typeof ATTRIBUTES)[number]['key'], value: number) => void;
  onEmpty: () => void;
  onDone: () => void;
  inSheet: boolean;
}

function SlotEditor({ slot, item, onName, onBonus, onEmpty, onDone, inSheet }: SlotEditorProps) {
  const nameId = `item-name-${slot}`;
  return (
    <div className="slot-editor">
      <div className="fieldset">
        <label htmlFor={nameId} className="field-label">Item name <span className="field-label__opt">(optional)</span></label>
        <input
          id={nameId}
          className="input slot-editor__name"
          maxLength={200}
          autoComplete="off"
          placeholder="e.g. Runeforged Breastplate"
          value={item?.name ?? ''}
          onChange={(e) => onName(e.target.value)}
        />
      </div>
      <div className="fieldset">
        <span className="field-label" id={`bonuses-${slot}`}>Attribute bonuses</span>
        <ul className="bonus-list" aria-labelledby={`bonuses-${slot}`}>
          {ATTRIBUTES.map((a) => {
            const v = item?.bonuses[a.key] ?? 0;
            return (
              <li key={a.key} className={`bonus-row${v ? ' bonus-row--on' : ''}`}>
                <span className="bonus-row__label"><span className="abbr bonus-row__abbr">{a.abbr}</span>{a.name}</span>
                <span className="bonus-row__ctrl">
                  <button type="button" className="icon-btn bonus-btn" aria-label={`Decrease ${a.name} bonus`} disabled={v <= -BONUS_LIMIT} onClick={() => onBonus(a.key, v - 1)}><MinusIcon size={10} /></button>
                  <output className={`bonus-row__value num${v ? ' bonus-row__value--on' : ''}`} aria-label={`${a.name} bonus`} aria-live="polite">{signed(v)}</output>
                  <button type="button" className="icon-btn bonus-btn" aria-label={`Increase ${a.name} bonus`} disabled={v >= BONUS_LIMIT} onClick={() => onBonus(a.key, v + 1)}><PlusIcon size={10} /></button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={`slot-editor__actions${inSheet ? ' slot-editor__actions--sheet' : ''}`}>
        <button type="button" className="btn btn--outline" disabled={!item} onClick={onEmpty}>Empty slot</button>
        <button type="button" className="btn btn--primary" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}

function TotalsPanel({ c, s }: { c: Character; s: ReturnType<typeof useSheet> }) {
  return (
    <section aria-labelledby="t-tot" className="panel totals-panel">
      <div className="panel-head">
        <h2 id="t-tot" className="section-title section-title--sm">Attributes with gear</h2>
        <span className="chip-calc chip-calc--bare"><span className="fx">ƒ</span>Calculated</span>
      </div>
      <table className="totals num">
        <thead>
          <tr><th scope="col">Attribute</th><th scope="col">Base</th><th scope="col">Gear</th><th scope="col">Total</th></tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map((a) => {
            const g = s.gear[a.key];
            return (
              <tr key={a.key}>
                <th scope="row"><span className="abbr totals__abbr">{a.abbr}</span>{a.name}</th>
                <td className="totals__base">{c.baseAttributes[a.key]}</td>
                <td className={g > 0 ? 'totals__gear' : g < 0 ? 'totals__gear warn' : 'totals__gear totals__gear--none'}>{g ? signed(g) : '—'}</td>
                <td className="totals__total" data-testid={`gear-total-${a.key}`}>{s.totals[a.key]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="totals__res">
        {RESOURCES.map((r) => (
          <li key={r.key}>
            <span className="totals__res-name"><span className={`res-dot res-dot--${r.key}`} aria-hidden="true" />Max {r.name}</span>
            <span className="num"><strong data-testid={`gear-max-${r.key}`}>{fmt(s.max[r.key])}</strong><span className="regen totals__regen">+{s.regen[r.key]} / min</span></span>
          </li>
        ))}
      </ul>
      <p className="helper helper--sm">Totals feed the Character Sheet’s attributes, resource maximums and regeneration.</p>
    </section>
  );
}
