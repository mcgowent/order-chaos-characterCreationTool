import seed from '../../data/sample-characters.json';
import {
  advanceBlocker,
  advanceLevel,
  allocatePoint,
  applyPurchase,
  canAdvanceLevel,
  canPurchase,
  clampCurrent,
  createCharacter,
  filledSlotCount,
  gearBonuses,
  initials,
  maxResources,
  nextPointPrice,
  pointPrice,
  purchaseCost,
  regenRates,
  restoreAllResources,
  rollStartingAttributes,
  setCurrentResource,
  setSlotBonus,
  setSlotItem,
  setSlotName,
  sumAttributes,
  totalAttributes,
  undoAllocate,
  undoPurchase,
} from './formulas';
import { ATTRIBUTE_KEYS } from './attributes';
import { essenceToNextLevel, MAX_LEVEL, progressionTableLength } from './progression';
import { validateAppData } from './validate';
import type { Character } from './types';

const caldor = (): Character => structuredClone(validateAppData(seed).characters.find((c) => c.id === 'c-caldor')!);

const bare = (over: Partial<Character> = {}): Character => ({
  id: 'x', name: 'Test', classification: '', species: '', level: 1, essence: 0,
  reputation: { rank: 1, progress: 0 },
  baseAttributes: { constitution: 10, intellect: 10, endurance: 10, core: 10, concentration: 10, strength: 10 },
  unspentPoints: 0, pointsPurchasedThisLevel: 0, current: { health: 100, mana: 100, stamina: 100 }, equipment: {},
  createdAt: '', updatedAt: '', ...over,
});

describe('rollStartingAttributes', () => {
  it('maps the injected rng onto 10–15 inclusive', () => {
    expect(rollStartingAttributes(() => 0)).toEqual({ constitution: 10, intellect: 10, endurance: 10, core: 10, concentration: 10, strength: 10 });
    expect(Object.values(rollStartingAttributes(() => 0.9999999))).toEqual([15, 15, 15, 15, 15, 15]);
    expect(Object.values(rollStartingAttributes(() => 1))).toEqual([15, 15, 15, 15, 15, 15]);
    const seq = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
    let i = 0;
    expect(Object.values(rollStartingAttributes(() => seq[i++]!))).toEqual([10, 11, 12, 13, 14, 15]);
  });

  it('produces integers in 10–15 over 1,000 real rolls, hitting every value', () => {
    const seen = new Set<number>();
    for (let n = 0; n < 1000; n++) {
      for (const v of Object.values(rollStartingAttributes())) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(10);
        expect(v).toBeLessThanOrEqual(15);
        seen.add(v);
      }
    }
    expect([...seen].sort()).toEqual([10, 11, 12, 13, 14, 15]);
  });
});

describe('worked example — Caldor Miles', () => {
  const c = caldor();
  const totals = totalAttributes(c);

  it('sums gear bonuses across the 10 items', () => {
    expect(filledSlotCount(c.equipment)).toBe(10);
    expect(gearBonuses(c.equipment)).toEqual({ constitution: 4, intellect: 4, endurance: 2, core: 1, concentration: 3, strength: 5 });
  });

  it('computes totals, maxima and regeneration', () => {
    expect(totals).toEqual({ constitution: 43, intellect: 37, endurance: 31, core: 21, concentration: 28, strength: 44 });
    expect(maxResources(totals)).toEqual({ health: 430, mana: 370, stamina: 310 });
    expect(regenRates(totals)).toEqual({ health: 43, mana: 65, stamina: 31 });
  });

  it('has the seeded progression values', () => {
    expect(c.current).toEqual({ health: 430, mana: 370, stamina: 295 });
    expect(c.level).toBe(5);
    expect(essenceToNextLevel(c.level)).toBe(2250);
    expect(c.essence).toBe(93001);
    expect(c.reputation).toEqual({ rank: 2, progress: 6 });
  });
});

describe('gear bonuses', () => {
  it('handles negative bonuses and lowers totals', () => {
    const c = bare({ equipment: { head: { name: '', bonuses: { constitution: -2, intellect: 3 } }, feet: { name: '', bonuses: { constitution: -1 } } } });
    expect(gearBonuses(c.equipment).constitution).toBe(-3);
    expect(totalAttributes(c).constitution).toBe(7);
    expect(totalAttributes(c).intellect).toBe(13);
  });

  it('clamps totals and maxima at 0', () => {
    const c = bare({ equipment: { head: { name: '', bonuses: { constitution: -50 } } } });
    expect(totalAttributes(c).constitution).toBe(0);
    expect(maxResources(totalAttributes(c)).health).toBe(0);
    expect(regenRates(totalAttributes(c)).health).toBe(0);
  });

  it('returns zeros for no equipment', () => {
    expect(sumAttributes(gearBonuses({}))).toBe(0);
  });
});

describe('point prices', () => {
  it('starts at ⅜ of the level cost and rises ×1.25 per point, rounded up', () => {
    // Level 1: 450 ÷ 2 × 0.75 = 168.75 → 210.9375 → 263.671875 → 329.58984375
    expect([0, 1, 2, 3].map((n) => pointPrice(1, n))).toEqual([169, 211, 264, 330]);
    // Level 5 (Caldor): 843.75 → 1,054.6875 → 1,318.359375
    expect([0, 1, 2].map((n) => pointPrice(5, n))).toEqual([844, 1055, 1319]);
  });

  it('does not round up exact whole prices (no floating-point drift)', () => {
    expect(pointPrice(6, 0)).toBe(2025); // 5,400 × ⅜ exactly
    expect(pointPrice(6, 1)).toBe(2532); // 2,531.25
    expect(pointPrice(21, 0)).toBe(24807); // 66,150 × ⅜ = 24,806.25
  });

  it('is unavailable at max level', () => {
    expect(pointPrice(120, 0)).toBeNull();
    expect(nextPointPrice({ level: 120, pointsPurchasedThisLevel: 0 })).toBeNull();
    expect(purchaseCost({ level: 120, pointsPurchasedThisLevel: 0 }, 1)).toBeNull();
    expect(canPurchase(bare({ level: 120, essence: 99_999_999 }), 1)).toBe(false);
  });

  it('sums prices from the points already bought this level', () => {
    expect(purchaseCost({ level: 1, pointsPurchasedThisLevel: 0 }, 3)).toBe(169 + 211 + 264);
    expect(purchaseCost({ level: 1, pointsPurchasedThisLevel: 2 }, 2)).toBe(264 + 330);
    expect(purchaseCost({ level: 1, pointsPurchasedThisLevel: 0 }, 0)).toBe(0);
  });

  it('buying one at a time costs the same as buying together', () => {
    let a = bare({ essence: 10_000 });
    for (let i = 0; i < 4; i++) a = applyPurchase(a, 1);
    const b = applyPurchase(bare({ essence: 10_000 }), 4);
    expect(a.essence).toBe(b.essence);
    expect(a.pointsPurchasedThisLevel).toBe(4);
  });

  it('resets on level up', () => {
    let c = applyPurchase(bare({ essence: 10_000 }), 3);
    expect(nextPointPrice(c)).toBe(330);
    c = advanceLevel(c);
    expect(c.pointsPurchasedThisLevel).toBe(0);
    expect(nextPointPrice(c)).toBe(338); // Level 2: 900 × ⅜ = 337.5
  });
});

describe('purchasing points', () => {
  it('acceptance 5: purchase 3 from 93,001, allocate to CON', () => {
    let c = applyPurchase(caldor(), 3);
    expect(c.essence).toBe(93001 - 3218);
    expect(c.essence).toBe(89783);
    expect(c.unspentPoints).toBe(3);
    expect(c.pointsPurchasedThisLevel).toBe(3);
    c = allocatePoint(c, 'constitution');
    const t = totalAttributes(c);
    expect(t.constitution).toBe(44);
    expect(maxResources(t).health).toBe(440);
    expect(regenRates(t).health).toBe(44);
    expect(c.current.health).toBe(430);
    expect(c.unspentPoints).toBe(2);
  });

  it('acceptance 6: disabled when cost exceeds Essence', () => {
    const c = bare({ essence: 643 }); // 3 points at Level 1 cost 644
    expect(canPurchase(c, 2)).toBe(true);
    expect(canPurchase(c, 3)).toBe(false);
    expect(canPurchase(c, 0)).toBe(false);
    expect(applyPurchase(c, 3)).toBe(c);
  });

  it('allows spending exactly all Essence', () => {
    expect(applyPurchase(bare({ essence: 644 }), 3).essence).toBe(0);
  });
});

describe('allocatePoint', () => {
  it('does nothing with no unspent points', () => {
    const c = bare();
    expect(allocatePoint(c, 'strength')).toBe(c);
  });
  it('raises base by one for every attribute', () => {
    for (const k of ATTRIBUTE_KEYS) {
      const c = allocatePoint(bare({ unspentPoints: 1 }), k);
      expect(c.baseAttributes[k]).toBe(11);
      expect(c.unspentPoints).toBe(0);
    }
  });
});

describe('undo', () => {
  it('reverses a purchase while points are unspent', () => {
    const c = applyPurchase(applyPurchase(caldor(), 1), 2);
    const u = undoPurchase(c, 2, 5); // refunds the 2nd and 3rd prices
    expect(u.essence).toBe(93001 - 844);
    expect(u.unspentPoints).toBe(1);
    expect(u.pointsPurchasedThisLevel).toBe(1);
    const spent = allocatePoint(c, 'core');
    expect(undoPurchase(spent, 3, 5)).toBe(spent);
  });

  it('does not undo a purchase after a level change', () => {
    const c = advanceLevel(applyPurchase(caldor(), 1));
    expect(undoPurchase(c, 1, 5)).toBe(c);
  });

  it('reverses an allocation and clamps current', () => {
    let c = restoreAllResources(allocatePoint(applyPurchase(caldor(), 1), 'constitution'));
    expect(c.current.health).toBe(440);
    c = undoAllocate(c, 'constitution');
    expect(c.baseAttributes.constitution).toBe(39);
    expect(c.unspentPoints).toBe(1);
    expect(c.current.health).toBe(430);
  });
});

describe('progression curve', () => {
  it('has 120 rows and spot values from the table', () => {
    expect(progressionTableLength).toBe(120);
    expect(essenceToNextLevel(1)).toBe(450);
    expect(essenceToNextLevel(5)).toBe(2250);
    expect(essenceToNextLevel(6)).toBe(5400);
    expect(essenceToNextLevel(21)).toBe(66150);
    expect(essenceToNextLevel(50)).toBe(787500);
    expect(essenceToNextLevel(90)).toBe(3564000);
    expect(essenceToNextLevel(119)).toBe(11245500);
  });

  it('is non-decreasing', () => {
    for (let l = 2; l < MAX_LEVEL; l++) expect(essenceToNextLevel(l)!).toBeGreaterThanOrEqual(essenceToNextLevel(l - 1)!);
  });

  it('returns null at and beyond the maximum level, and for invalid levels', () => {
    expect(MAX_LEVEL).toBe(120);
    expect(essenceToNextLevel(120)).toBeNull();
    expect(essenceToNextLevel(121)).toBeNull();
    expect(essenceToNextLevel(0)).toBeNull();
    expect(essenceToNextLevel(2.5)).toBeNull();
  });
});

describe('advanceLevel', () => {
  it('acceptance 7: Level 5 spends 2,250 from 93,001 → Level 6, 90,751, +2 unspent', () => {
    const c = advanceLevel(caldor());
    expect(c.level).toBe(6);
    expect(c.essence).toBe(90751);
    expect(c.unspentPoints).toBe(2);
    expect(essenceToNextLevel(c.level)).toBe(5400);
  });

  it('is blocked with too little Essence or at max level', () => {
    expect(advanceBlocker(bare({ level: 1, essence: 449 }))).toBe('not-enough-essence');
    expect(canAdvanceLevel(bare({ level: 1, essence: 450 }))).toBe(true);
    expect(advanceLevel(bare({ level: 1, essence: 450 })).essence).toBe(0);
    const maxed = bare({ level: 120, essence: 99_999_999 });
    expect(advanceBlocker(maxed)).toBe('max-level');
    expect(advanceLevel(maxed)).toBe(maxed);
    const poor = bare();
    expect(advanceLevel(poor)).toBe(poor);
  });
});

describe('clampCurrent and resources', () => {
  it('lowers current when a maximum drops, never raises it', () => {
    const c = bare({ current: { health: 100, mana: 40, stamina: 100 } });
    const debuffed = clampCurrent({ ...c, equipment: { head: { name: '', bonuses: { constitution: -2 } } } });
    expect(debuffed.current.health).toBe(80);
    const buffed = clampCurrent({ ...c, equipment: { head: { name: '', bonuses: { intellect: 5 } } } });
    expect(buffed.current.mana).toBe(40);
  });

  it('returns the same object when nothing changes', () => {
    const c = bare();
    expect(clampCurrent(c)).toBe(c);
  });

  it('clamps negative current to 0', () => {
    expect(clampCurrent(bare({ current: { health: -5, mana: 0, stamina: 0 } })).current.health).toBe(0);
  });

  it('acceptance 8: editing clamps to 0–max, restore sets max', () => {
    const c = caldor();
    expect(setCurrentResource(c, 'stamina', 9999).current.stamina).toBe(310);
    expect(setCurrentResource(c, 'stamina', -4).current.stamina).toBe(0);
    expect(setCurrentResource(c, 'stamina', 120.7).current.stamina).toBe(120);
    expect(restoreAllResources(setCurrentResource(c, 'mana', 3)).current).toEqual({ health: 430, mana: 370, stamina: 310 });
  });
});

describe('equipment edits', () => {
  it('removing an item that lowers a max clamps current', () => {
    const c = restoreAllResources(caldor());
    expect(c.current.health).toBe(430);
    const after = setSlotItem(c, 'head', undefined);
    expect(after.equipment.head).toBeUndefined();
    expect(characterHealthMax(after)).toBe(410);
    expect(after.current.health).toBe(410);
  });

  it('setting a bonus on an empty slot creates the item', () => {
    const c = setSlotBonus(bare(), 'waist', 'endurance', 2);
    expect(c.equipment.waist).toEqual({ name: '', bonuses: { endurance: 2 } });
    expect(setSlotBonus(c, 'waist', 'endurance', 0).equipment.waist).toEqual({ name: '', bonuses: {} });
  });

  it('naming an empty slot creates the item', () => {
    expect(setSlotName(bare(), 'feet', 'Boots').equipment.feet).toEqual({ name: 'Boots', bonuses: {} });
  });

  it('a negative bonus clamps current', () => {
    const c = setSlotBonus(bare(), 'chest', 'endurance', -3);
    expect(c.current.stamina).toBe(70);
  });
});

describe('createCharacter', () => {
  it('starts at Level 1 with current = maxima', () => {
    const roll = { constitution: 13, intellect: 14, endurance: 11, core: 12, concentration: 15, strength: 10 };
    const c = createCharacter({ name: '  Kestra Dunmere ', classification: 'Spellblade', species: '', baseAttributes: roll }, 'id1', 'now');
    expect(c).toMatchObject({
      name: 'Kestra Dunmere', level: 1, essence: 0, reputation: { rank: 1, progress: 0 },
      unspentPoints: 0, current: { health: 130, mana: 140, stamina: 110 }, equipment: {},
    });
    expect(c.baseAttributes).toEqual(roll);
    expect(c.baseAttributes).not.toBe(roll);
  });
});

describe('initials', () => {
  it('uses the first letters of the first two capitalised words', () => {
    expect(initials('Caldor Miles')).toBe('CM');
    expect(initials('Ilyth of the Quiet Vale')).toBe('IQ');
    expect(initials('Seraphine Ashvale-Corrigan')).toBe('SA');
    expect(initials('Kestra')).toBe('K');
    expect(initials('lowercase name')).toBe('LN');
    expect(initials('')).toBe('');
  });
});

function characterHealthMax(c: Character) {
  return maxResources(totalAttributes(c)).health;
}
