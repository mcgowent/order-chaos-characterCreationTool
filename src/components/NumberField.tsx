import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { fmt, parseIntInput } from '../lib/format';
import { PenIcon } from './Icons';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'defaultValue'>;

interface NumberInputProps extends InputProps {
  value: number;
  /** Called on Enter or blur with the parsed integer (clamping is the caller's rule). */
  onCommit: (n: number) => void;
  /** Show thousands separators when not focused. */
  grouped?: boolean;
  onCancel?: () => void;
}

/**
 * Integer field that edits a draft and commits on Enter/blur; Esc restores the stored value.
 * Non-digits are ignored, so values are always whole numbers ≥ 0.
 */
export function NumberInput({ value, onCommit, grouped = false, onCancel, onFocus, onBlur, onKeyDown, ...rest }: NumberInputProps) {
  const [draft, setDraftState] = useState<string | null>(null);
  // Mirror in a ref so Enter-then-blur cannot commit the same draft twice.
  const draftRef = useRef<string | null>(null);
  const setDraft = (d: string | null) => { draftRef.current = d; setDraftState(d); };
  const shown = draft ?? (grouped ? fmt(value) : String(value));

  const commit = () => {
    const d = draftRef.current;
    if (d == null) return;
    setDraft(null);
    const n = parseIntInput(d);
    if (n != null) onCommit(n); // callers clamp/normalise, even when unchanged
  };

  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      {...rest}
      value={shown}
      onFocus={(e) => { setDraft(String(value)); e.currentTarget.select(); onFocus?.(e); }}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d,\s]/g, ''))}
      onBlur={(e) => { commit(); onBlur?.(e); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur(); }
        if (e.key === 'Escape') {
          if (onCancel) { e.stopPropagation(); setDraft(null); onCancel(); }
          else { setDraft(null); e.currentTarget.blur(); }
        }
        onKeyDown?.(e);
      }}
    />
  );
}

interface EditableValueProps {
  value: number | null;
  onCommit: (n: number) => void;
  /** Accessible name, e.g. "Essence to reach Level 6". */
  label: string;
  display?: (n: number) => ReactNode;
  emptyText?: string;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
}

/** Click-to-edit author value: a button that turns into a number input (Enter/blur saves, Esc cancels). */
export function EditableValue({ value, onCommit, label, display = fmt, emptyText = 'Set amount', min = 0, max = Number.MAX_SAFE_INTEGER, className = '', inputClassName = '' }: EditableValueProps) {
  const [editing, setEditing] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  useEffect(() => {
    if (wasEditing.current && !editing) btn.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (editing) {
    return (
      <NumberInput
        autoFocus
        aria-label={label}
        className={`input input--num edit-input ${inputClassName}`}
        value={value ?? 0}
        onCommit={(n) => { onCommit(Math.min(max, Math.max(min, n))); setEditing(false); }}
        onBlur={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <button
      ref={btn}
      type="button"
      className={`edit-value ${value == null ? 'edit-value--empty' : ''} ${className}`}
      aria-label={`${label}: ${value == null ? 'not set' : fmt(value)}. Edit`}
      onClick={() => setEditing(true)}
    >
      <span className="num">{value == null ? emptyText : display(value)}</span>
      <PenIcon size={12} className="edit-value__pen" />
    </button>
  );
}
