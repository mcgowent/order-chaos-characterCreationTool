import {
  LEVEL_UP_CONSUMES_ESSENCE,
  POINT_BASE_DIVISOR,
  POINT_BASE_FACTOR,
  POINT_PRICE_GROWTH,
  POINTS_PER_LEVEL,
  RESOURCE_MULTIPLIER,
  STARTING_ATTRIBUTE_MAX,
  STARTING_ATTRIBUTE_MIN,
  STARTING_ESSENCE,
  STARTING_LEVEL,
  STARTING_REPUTATION,
} from './config';
import { ATTRIBUTE_KEYS } from './attributes';
import { essenceToNextLevel } from './progression';
import type { AttributeKey, Attributes, Character, EquippedItem, ResourceKey, Resources, SlotId } from './types';

/** Returns a float in [0, 1), like Math.random. */
export type Rng = () => number;

const zeroAttributes = (): Attributes => ({
  constitution: 0, intellect: 0, endurance: 0, core: 0, concentration: 0, strength: 0,
});

const toInt = (n: number): number => (Number.isFinite(n) ? Math.trunc(n) : 0);

/** Each of the six attributes is a uniform random integer 10–15 inclusive. */
export function rollStartingAttributes(rng: Rng = Math.random): Attributes {
  const span = STARTING_ATTRIBUTE_MAX - STARTING_ATTRIBUTE_MIN + 1;
  const out = zeroAttributes();
  for (const k of ATTRIBUTE_KEYS) {
    // min() guards against an rng that returns exactly 1.
    out[k] = STARTING_ATTRIBUTE_MIN + Math.min(span - 1, Math.floor(rng() * span));
  }
  return out;
}

export const sumAttributes = (a: Attributes): number => ATTRIBUTE_KEYS.reduce((s, k) => s + a[k], 0);

/** gear[k] = sum of bonuses[k] across all equipped items. */
export function gearBonuses(equipment: Character['equipment']): Attributes {
  const out = zeroAttributes();
  for (const item of Object.values(equipment)) {
    if (!item) continue;
    for (const k of ATTRIBUTE_KEYS) out[k] += toInt(item.bonuses[k] ?? 0);
  }
  return out;
}

/** total[k] = base[k] + gear[k], clamped at 0 for display and derived maxima. */
export function totalAttributes(c: Pick<Character, 'baseAttributes' | 'equipment'>): Attributes {
  const gear = gearBonuses(c.equipment);
  const out = zeroAttributes();
  for (const k of ATTRIBUTE_KEYS) out[k] = Math.max(0, c.baseAttributes[k] + gear[k]);
  return out;
}

export function maxResources(totals: Attributes): Resources {
  return {
    health: Math.max(0, totals.constitution * RESOURCE_MULTIPLIER),
    mana: Math.max(0, totals.intellect * RESOURCE_MULTIPLIER),
    stamina: Math.max(0, totals.endurance * RESOURCE_MULTIPLIER),
  };
}

/** Regeneration per minute. */
export function regenRates(totals: Attributes): Resources {
  return {
    health: Math.max(0, totals.constitution),
    mana: Math.max(0, totals.intellect + totals.concentration),
    stamina: Math.max(0, totals.endurance),
  };
}

export const characterMaxima = (c: Pick<Character, 'baseAttributes' | 'equipment'>): Resources =>
  maxResources(totalAttributes(c));

/** current = min(current, max) for every resource (and never below 0). Never raises current. */
export function clampCurrent<C extends Character>(c: C): C {
  const max = characterMaxima(c);
  const current = { ...c.current };
  let changed = false;
  for (const k of Object.keys(current) as ResourceKey[]) {
    const v = Math.min(Math.max(0, current[k]), max[k]);
    if (v !== current[k]) { current[k] = v; changed = true; }
  }
  return changed ? { ...c, current } : c;
}

/** Author edits a current resource; the value is clamped to 0–max on commit. */
export function setCurrentResource(c: Character, key: ResourceKey, value: number): Character {
  const max = characterMaxima(c)[key];
  const v = Math.min(max, Math.max(0, toInt(value)));
  return { ...c, current: { ...c.current, [key]: v } };
}

export function restoreAllResources(c: Character): Character {
  return { ...c, current: characterMaxima(c) };
}

// --- Attribute points -------------------------------------------------------

type PurchaseState = Pick<Character, 'level' | 'pointsPurchasedThisLevel'>;

/**
 * Price of the `n`th point (0-based) bought at `level`, or null when points can't be bought (max level).
 * exact = levelCost ÷ 2 × 0.75 × 1.25ⁿ, computed with integers and rounded up.
 */
export function pointPrice(level: number, n: number): number | null {
  const levelCost = essenceToNextLevel(level);
  if (levelCost == null || !Number.isInteger(n) || n < 0) return null;
  const g = POINT_PRICE_GROWTH;
  const f = POINT_BASE_FACTOR;
  const num = BigInt(levelCost) * BigInt(f.num) * BigInt(g.num) ** BigInt(n);
  const den = BigInt(POINT_BASE_DIVISOR) * BigInt(f.den) * BigInt(g.den) ** BigInt(n);
  return Number((num + den - 1n) / den);
}

/** Price of the next point this character would buy; null at max level. */
export const nextPointPrice = (c: PurchaseState): number | null => pointPrice(c.level, c.pointsPurchasedThisLevel);

/** Total Essence for buying `qty` more points now; null at max level. */
export function purchaseCost(c: PurchaseState, qty: number): number | null {
  const q = Math.max(0, toInt(qty));
  let total = 0;
  for (let i = 0; i < q; i++) {
    const p = pointPrice(c.level, c.pointsPurchasedThisLevel + i);
    if (p == null) return null;
    total += p;
  }
  return total;
}

export function canPurchase(c: PurchaseState & Pick<Character, 'essence'>, qty: number): boolean {
  if (toInt(qty) < 1) return false;
  const cost = purchaseCost(c, qty);
  return cost != null && cost <= c.essence;
}

export function applyPurchase(c: Character, qty: number): Character {
  if (!canPurchase(c, qty)) return c;
  const q = toInt(qty);
  return {
    ...c,
    essence: c.essence - purchaseCost(c, q)!,
    unspentPoints: c.unspentPoints + q,
    pointsPurchasedThisLevel: c.pointsPurchasedThisLevel + q,
  };
}

export const canAllocate = (c: Pick<Character, 'unspentPoints'>): boolean => c.unspentPoints > 0;

export function allocatePoint(c: Character, key: AttributeKey): Character {
  if (!canAllocate(c)) return c;
  return {
    ...c,
    baseAttributes: { ...c.baseAttributes, [key]: c.baseAttributes[key] + 1 },
    unspentPoints: c.unspentPoints - 1,
  };
}

/**
 * Reverses the latest purchase of `qty` points made at `atLevel` (Undo toast).
 * Only possible while those points are still unspent and the level hasn't changed.
 */
export function undoPurchase(c: Character, qty: number, atLevel: number): Character {
  const q = toInt(qty);
  if (q < 1 || c.level !== atLevel || c.unspentPoints < q || c.pointsPurchasedThisLevel < q) return c;
  const before = { level: c.level, pointsPurchasedThisLevel: c.pointsPurchasedThisLevel - q };
  return {
    ...c,
    essence: c.essence + purchaseCost(before, q)!,
    unspentPoints: c.unspentPoints - q,
    pointsPurchasedThisLevel: before.pointsPurchasedThisLevel,
  };
}

/** Reverses one allocation (Undo toast). A lower base can lower a maximum, so current is clamped. */
export function undoAllocate(c: Character, key: AttributeKey): Character {
  if (c.baseAttributes[key] < 1) return c;
  return clampCurrent({
    ...c,
    baseAttributes: { ...c.baseAttributes, [key]: c.baseAttributes[key] - 1 },
    unspentPoints: c.unspentPoints + 1,
  });
}

// --- Levels -----------------------------------------------------------------

export type AdvanceBlocker = 'max-level' | 'not-enough-essence' | null;

export function advanceBlocker(c: Pick<Character, 'essence' | 'level'>): AdvanceBlocker {
  const cost = essenceToNextLevel(c.level);
  if (cost == null) return 'max-level';
  if (LEVEL_UP_CONSUMES_ESSENCE && c.essence < cost) return 'not-enough-essence';
  return null;
}

export const canAdvanceLevel = (c: Pick<Character, 'essence' | 'level'>): boolean =>
  advanceBlocker(c) === null;

/** Level +1 and +2 unspent points; spends the curve's Essence for the current level (see config). */
export function advanceLevel(c: Character): Character {
  if (!canAdvanceLevel(c)) return c;
  const cost = LEVEL_UP_CONSUMES_ESSENCE ? essenceToNextLevel(c.level)! : 0;
  return {
    ...c,
    essence: c.essence - cost,
    level: c.level + 1,
    unspentPoints: c.unspentPoints + POINTS_PER_LEVEL,
    pointsPurchasedThisLevel: 0, // point prices restart from the new level's base
  };
}

// --- Equipment --------------------------------------------------------------

/** Sets (or with `undefined`, empties) a slot. Lowering a maximum clamps current resources. */
export function setSlotItem(c: Character, slot: SlotId, item: EquippedItem | undefined): Character {
  const equipment = { ...c.equipment };
  if (item) equipment[slot] = item;
  else delete equipment[slot];
  return clampCurrent({ ...c, equipment });
}

export function setSlotBonus(c: Character, slot: SlotId, key: AttributeKey, value: number): Character {
  const item = c.equipment[slot] ?? { name: '', bonuses: {} };
  const bonuses = { ...item.bonuses };
  const v = toInt(value);
  if (v === 0) delete bonuses[key];
  else bonuses[key] = v;
  return setSlotItem(c, slot, { ...item, bonuses });
}

export function setSlotName(c: Character, slot: SlotId, name: string): Character {
  const item = c.equipment[slot] ?? { name: '', bonuses: {} };
  return setSlotItem(c, slot, { ...item, name });
}

export const filledSlotCount = (equipment: Character['equipment']): number =>
  Object.values(equipment).filter(Boolean).length;

// --- Creation ---------------------------------------------------------------

export interface NewCharacterInput {
  name: string;
  classification: string;
  species: string;
  baseAttributes: Attributes;
}

export function createCharacter(input: NewCharacterInput, id: string, now: string): Character {
  const base = { ...input.baseAttributes };
  return {
    id,
    name: input.name.trim(),
    classification: input.classification.trim(),
    species: input.species.trim(),
    level: STARTING_LEVEL,
    essence: STARTING_ESSENCE,
    reputation: { ...STARTING_REPUTATION },
    baseAttributes: base,
    unspentPoints: 0,
    pointsPurchasedThisLevel: 0,
    current: maxResources(totalAttributes({ baseAttributes: base, equipment: {} })),
    equipment: {},
    createdAt: now,
    updatedAt: now,
  };
}

/** First letters of the first two capitalised words of the name. */
export function initials(name: string): string {
  const caps = name.trim().split(/\s+/).filter((w) => /^\p{Lu}/u.test(w));
  const words = caps.length ? caps : name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}
