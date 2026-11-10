import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';
import './Dialog.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  title: string;
  /** Small gold overline above the title. */
  overline?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Element to focus on open; defaults to the first focusable control. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** 'sheet' docks to the bottom of the screen (phone bottom sheet). */
  variant?: 'center' | 'sheet';
  role?: 'dialog' | 'alertdialog';
  describedBy?: string;
}

/** Modal dialog: focus is trapped while open and returned on close; Esc closes. */
export function Dialog({ title, overline, onClose, children, footer, initialFocus, variant = 'center', role = 'dialog', describedBy }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current!;
    // Prefer the first form field, then the first non-close control, so the ✕ isn't the landing spot.
    const target = initialFocus?.current
      ?? node.querySelector<HTMLElement>('.dialog__body :is(input, select, textarea):not([disabled])')
      ?? node.querySelector<HTMLElement>(`.dialog__body :is(${FOCUSABLE}), .dialog__foot :is(${FOCUSABLE})`)
      ?? node;
    target.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- open/close lifecycle only

  return createPortal(
    <div className={`dialog-backdrop dialog-backdrop--${variant}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`dialog dialog--${variant}`}
      >
        <div className="dialog__head">
          <div className="dialog__titles">
            {overline && <span className="overline">{overline}</span>}
            <h2 id={titleId} className="section-title">{title}</h2>
          </div>
          <button type="button" className="icon-btn icon-btn--ghost" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer && <div className="dialog__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
