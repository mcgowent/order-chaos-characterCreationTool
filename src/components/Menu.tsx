import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import './Menu.css';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface Props {
  label: string;
  /** Trigger contents (icon). The accessible name comes from `label`. */
  trigger: ReactNode;
  items: MenuItem[];
  triggerClassName?: string;
  align?: 'start' | 'end';
}

/** Overflow menu: arrow keys move, Esc closes and returns focus, outside click closes. */
export function Menu({ label, trigger, items, triggerClassName = 'icon-btn icon-btn--touch', align = 'end' }: Props) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  const focusItem = (i: number) => {
    const els = list.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (!els?.length) return;
    els[(i + els.length) % els.length]!.focus();
  };

  useEffect(() => {
    if (!open) return;
    focusItem(0);
    const onDown = (e: MouseEvent) => {
      if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const els = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
    else if (e.key === 'End') { e.preventDefault(); focusItem(els.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
  };

  return (
    <div className="menu">
      <button
        ref={btn}
        type="button"
        className={triggerClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}
      >
        {trigger}
      </button>
      {open && (
        <div ref={list} id={id} role="menu" aria-label={label} className={`menu__list menu__list--${align}`} onKeyDown={onKeyDown}>
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={`menu__item${it.danger ? ' menu__item--danger' : ''}`}
              onClick={() => { close(); it.onSelect(); }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
