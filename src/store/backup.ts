import { validateAppData, ValidationError, type AppData, type Character } from '../rules';

export function downloadExport(data: AppData, now = new Date()): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arcane-knight-characters-${now.toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type ParsedImport = { ok: true; characters: Character[] } | { ok: false; error: string };

export function parseImportText(text: string): ParsedImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  try {
    return { ok: true, characters: validateAppData(json).characters };
  } catch (err) {
    return { ok: false, error: err instanceof ValidationError ? `This file doesn’t match the character format — ${err.message}.` : 'This file could not be read.' };
  }
}
