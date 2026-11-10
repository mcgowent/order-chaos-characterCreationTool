const nf = new Intl.NumberFormat('en-US');

/** 93001 → "93,001" */
export const fmt = (n: number): string => nf.format(n);

/** Bonus value as shown on slots and steppers: "+2", "0", "−1" (true minus sign). */
export const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "today, 9:42 AM", "yesterday", "Nov 4", or "Nov 4, 2025" for other years. */
export function relativeDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  if (sameDay(d, now)) {
    return `today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'yesterday';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

/** Digits-only parse for integer fields; returns null when there is nothing to parse. */
export function parseIntInput(s: string): number | null {
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isSafeInteger(n) ? n : null;
}
