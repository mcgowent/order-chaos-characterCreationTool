import seed from '../../data/sample-characters.json';
import { validateAppData, type AppData } from '../rules';

export const STORAGE_KEY = 'arcane-knight:v1';
export const VIEW_KEY = 'arcane-knight:library-view';

export interface LoadResult {
  data: AppData;
  /** False when localStorage is unavailable (private mode, blocked, quota). */
  available: boolean;
}

export const seedData = (): AppData => validateAppData(structuredClone(seed));

export function loadData(): LoadResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
    // Probe writability too: a readable but read-only storage still cannot save.
    window.localStorage.setItem(`${STORAGE_KEY}:probe`, '1');
    window.localStorage.removeItem(`${STORAGE_KEY}:probe`);
  } catch {
    return { data: seedData(), available: false };
  }
  if (raw == null) return { data: seedData(), available: true };
  try {
    return { data: validateAppData(JSON.parse(raw)), available: true };
  } catch (err) {
    // Keep the unreadable copy so nothing is lost, then start from the seed.
    console.error('Stored characters could not be read; a backup was kept.', err);
    try { window.localStorage.setItem(`${STORAGE_KEY}:corrupt-${Date.now()}`, raw); } catch { /* ignore */ }
    return { data: seedData(), available: true };
  }
}

export function saveData(data: AppData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readPref(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function writePref(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* preference only */ }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
