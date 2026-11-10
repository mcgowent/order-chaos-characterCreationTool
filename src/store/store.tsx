import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { prepareImport, type AppData, type Character } from '../rules';
import { loadData, newId, saveData } from './storage';

export type SaveStatus = 'saved' | 'saving' | 'unavailable';

type Action =
  | { type: 'update'; id: string; fn: (c: Character) => Character; now: string }
  | { type: 'add'; character: Character }
  | { type: 'remove'; id: string }
  | { type: 'import'; characters: Character[] };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'update': {
      let changed = false;
      const characters = state.characters.map((c) => {
        if (c.id !== action.id) return c;
        const next = action.fn(c);
        if (next === c) return c;
        changed = true;
        return { ...next, id: c.id, updatedAt: action.now };
      });
      return changed ? { ...state, characters } : state;
    }
    case 'add':
      return { ...state, characters: [...state.characters, action.character] };
    case 'remove':
      return { ...state, characters: state.characters.filter((c) => c.id !== action.id) };
    case 'import':
      return { ...state, characters: [...state.characters, ...action.characters] };
  }
}

interface StoreValue {
  characters: Character[];
  saveStatus: SaveStatus;
  getCharacter: (id: string | undefined) => Character | undefined;
  /** Applies a pure rule to one character. Returning the same object is a no-op. */
  updateCharacter: (id: string, fn: (c: Character) => Character) => void;
  addCharacter: (c: Character) => void;
  deleteCharacter: (id: string) => void;
  /** Adds already-validated characters; duplicate ids get new ids. Returns how many were added. */
  importCharacters: (cs: Character[]) => number;
  exportData: () => AppData;
}

const StoreContext = createContext<StoreValue | null>(null);

const SAVE_DEBOUNCE_MS = 300;

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: AppData }) {
  const [boot] = useState(() => (initial ? { data: initial, available: true } : loadData()));
  const [data, dispatch] = useReducer(reducer, boot.data);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(boot.available ? 'saved' : 'unavailable');
  const available = useRef(boot.available);
  const lastSaved = useRef<AppData | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!available.current || data === lastSaved.current) return;
    if (lastSaved.current === null) {
      // Initial data: persist the seed on first launch so a reload sees the same data.
      lastSaved.current = data;
      if (!initial) saveData(data);
      return;
    }
    lastSaved.current = data;
    setSaveStatus('saving');
    const t = window.setTimeout(() => {
      if (saveData(data)) setSaveStatus('saved');
      else { available.current = false; setSaveStatus('unavailable'); }
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [data]);

  // Flush a pending save when the tab closes.
  useEffect(() => {
    const flush = () => { if (available.current) saveData(dataRef.current); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const getCharacter = useCallback((id: string | undefined) => data.characters.find((c) => c.id === id), [data]);
  const updateCharacter = useCallback(
    (id: string, fn: (c: Character) => Character) => dispatch({ type: 'update', id, fn, now: new Date().toISOString() }),
    [],
  );
  const addCharacter = useCallback((character: Character) => dispatch({ type: 'add', character }), []);
  const deleteCharacter = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const importCharacters = useCallback((cs: Character[]) => {
    const prepared = prepareImport(cs, dataRef.current.characters.map((c) => c.id), newId);
    dispatch({ type: 'import', characters: prepared });
    return prepared.length;
  }, []);
  const exportData = useCallback(() => dataRef.current, []);

  const value = useMemo<StoreValue>(
    () => ({ characters: data.characters, saveStatus, getCharacter, updateCharacter, addCharacter, deleteCharacter, importCharacters, exportData }),
    [data.characters, saveStatus, getCharacter, updateCharacter, addCharacter, deleteCharacter, importCharacters, exportData],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}
