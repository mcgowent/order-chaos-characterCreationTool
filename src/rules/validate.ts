import { ATTRIBUTE_KEYS, SLOT_IDS } from './attributes';
import { MAX_LEVEL } from './progression';
import type { AppData, Attributes, Character, EquippedItem, SlotId } from './types';

export class ValidationError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

function fail(path: string, msg: string): never {
  throw new ValidationError(`${path}: ${msg}`);
}

function str(v: unknown, path: string, min: number, max: number): string {
  if (typeof v !== 'string') fail(path, 'must be text');
  const s = v.trim();
  if (s.length < min || s.length > max) fail(path, `must be ${min}–${max} characters`);
  return s;
}

function int(v: unknown, path: string, min = -Infinity, max = Infinity): number {
  if (!isInt(v) || v < min || v > max) fail(path, `must be a whole number${min > -Infinity ? ` ≥ ${min}` : ''}`);
  return v;
}

function attributes(v: unknown, path: string): Attributes {
  if (!isObj(v)) fail(path, 'missing');
  const out = {} as Attributes;
  for (const k of ATTRIBUTE_KEYS) out[k] = int(v[k], `${path}.${k}`, 0);
  return out;
}

function item(v: unknown, path: string): EquippedItem {
  if (!isObj(v)) fail(path, 'must be an item');
  const name = v.name === undefined ? '' : str(v.name, `${path}.name`, 0, 200);
  const bonuses: Partial<Attributes> = {};
  if (v.bonuses !== undefined) {
    if (!isObj(v.bonuses)) fail(`${path}.bonuses`, 'must be an object');
    for (const k of ATTRIBUTE_KEYS) {
      const b = v.bonuses[k];
      if (b === undefined || b === 0) continue;
      bonuses[k] = int(b, `${path}.bonuses.${k}`);
    }
  }
  return { name, bonuses };
}

/** Validates one character object; returns a cleaned copy or throws ValidationError. */
export function validateCharacter(v: unknown, path = 'character'): Character {
  if (!isObj(v)) fail(path, 'must be an object');
  const id = str(v.id, `${path}.id`, 1, 200);
  const name = str(v.name, `${path}.name`, 1, 80);
  const p = `${path} "${name}"`;
  const rep = v.reputation;
  if (!isObj(rep)) fail(`${p}.reputation`, 'missing');
  const cur = v.current;
  if (!isObj(cur)) fail(`${p}.current`, 'missing');
  const eq = v.equipment ?? {};
  if (!isObj(eq)) fail(`${p}.equipment`, 'must be an object');
  const equipment: Partial<Record<SlotId, EquippedItem>> = {};
  for (const [slot, it] of Object.entries(eq)) {
    if (!SLOT_IDS.includes(slot as SlotId)) fail(`${p}.equipment`, `unknown slot "${slot}"`);
    if (it == null) continue;
    equipment[slot as SlotId] = item(it, `${p}.equipment.${slot}`);
  }
  // `essenceToNextLevel` from older files is ignored: it now comes from the progression curve.
  const portrait = v.portrait;
  if (portrait !== undefined && (typeof portrait !== 'string' || !portrait.startsWith('data:image/'))) {
    fail(`${p}.portrait`, 'must be an image data URL');
  }
  const now = new Date().toISOString();
  const date = (d: unknown) => (typeof d === 'string' && !Number.isNaN(Date.parse(d)) ? d : now);
  return {
    id,
    name,
    classification: v.classification === undefined ? '' : str(v.classification, `${p}.classification`, 0, 120),
    species: v.species === undefined ? '' : str(v.species, `${p}.species`, 0, 120),
    level: int(v.level, `${p}.level`, 1, MAX_LEVEL),
    essence: int(v.essence, `${p}.essence`, 0),
    reputation: { rank: int(rep.rank, `${p}.reputation.rank`, 0), progress: int(rep.progress, `${p}.reputation.progress`, 0, 100) },
    baseAttributes: attributes(v.baseAttributes, `${p}.baseAttributes`),
    unspentPoints: int(v.unspentPoints, `${p}.unspentPoints`, 0),
    // Absent in data saved before rising point prices existed.
    pointsPurchasedThisLevel: v.pointsPurchasedThisLevel === undefined ? 0 : int(v.pointsPurchasedThisLevel, `${p}.pointsPurchasedThisLevel`, 0),
    current: {
      health: int(cur.health, `${p}.current.health`, 0),
      mana: int(cur.mana, `${p}.current.mana`, 0),
      stamina: int(cur.stamina, `${p}.current.stamina`, 0),
    },
    equipment,
    ...(portrait ? { portrait: portrait as string } : {}),
    createdAt: date(v.createdAt),
    updatedAt: date(v.updatedAt),
  };
}

/** Validates a full AppData document (export file or stored data). */
export function validateAppData(v: unknown): AppData {
  if (!isObj(v)) fail('file', 'is not a JSON object');
  if (v.version !== 1) fail('file', 'unsupported version (expected 1)');
  if (!Array.isArray(v.characters)) fail('file', 'has no characters list');
  return { version: 1, characters: v.characters.map((c, i) => validateCharacter(c, `characters[${i}]`)) };
}

/**
 * Prepares characters for import: never overwrites existing ids — duplicates
 * (with existing data or within the file) get fresh ids.
 */
export function prepareImport(incoming: Character[], existingIds: Iterable<string>, newId: () => string): Character[] {
  const taken = new Set(existingIds);
  return incoming.map((c) => {
    let id = c.id;
    while (taken.has(id)) id = newId();
    taken.add(id);
    return id === c.id ? c : { ...c, id };
  });
}
