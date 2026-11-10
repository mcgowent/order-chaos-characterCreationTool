import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CloseIcon } from './Icons';
import './Toast.css';

interface ToastInput {
  message: string;
  /** Optional action, e.g. Undo. */
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastState extends ToastInput { key: number }

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);

  const show = useCallback((t: ToastInput) => setToast({ ...t, key: ++counter.current }), []);
  const dismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(dismiss, toast.durationMs ?? 5000);
    return () => window.clearTimeout(id);
  }, [toast, dismiss]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.key}>
            <span className="toast__msg">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => { toast.action!.onClick(); dismiss(); }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" className="toast__close" aria-label="Dismiss" onClick={dismiss}>
              <CloseIcon />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
