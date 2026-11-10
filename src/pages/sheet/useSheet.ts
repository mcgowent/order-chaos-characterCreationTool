import { useMemo } from 'react';
import {
  advanceLevel,
  allocatePoint,
  applyPurchase,
  attributeMeta,
  canPurchase,
  gearBonuses,
  maxResources,
  regenRates,
  restoreAllResources,
  setCurrentResource,
  totalAttributes,
  undoAllocate,
  undoPurchase,
  type AttributeKey,
  type Character,
  type ResourceKey,
} from '../../rules';
import { useStore } from '../../store/store';
import { useToast } from '../../components/Toast';

/** Derived values + actions for one character. All math is delegated to src/rules. */
export function useSheet(c: Character) {
  const { updateCharacter } = useStore();
  const toast = useToast();
  const id = c.id;

  const derived = useMemo(() => {
    const gear = gearBonuses(c.equipment);
    const totals = totalAttributes(c);
    return { gear, totals, max: maxResources(totals), regen: regenRates(totals) };
  }, [c]);

  const actions = useMemo(() => ({
    update: (fn: (x: Character) => Character) => updateCharacter(id, fn),
    setEssence: (n: number) => updateCharacter(id, (x) => (x.essence === n ? x : { ...x, essence: Math.max(0, n) })),
    setRank: (n: number) => updateCharacter(id, (x) => (x.reputation.rank === n ? x : { ...x, reputation: { ...x.reputation, rank: Math.max(0, n) } })),
    setProgress: (n: number) => updateCharacter(id, (x) => {
      const p = Math.min(100, Math.max(0, n));
      return x.reputation.progress === p ? x : { ...x, reputation: { ...x.reputation, progress: p } };
    }),
    setCurrent: (k: ResourceKey, n: number) => updateCharacter(id, (x) => {
      const next = setCurrentResource(x, k, n);
      return next.current[k] === x.current[k] ? x : next;
    }),
    restoreAll: () => updateCharacter(id, restoreAllResources),
    advance: () => updateCharacter(id, advanceLevel),
    allocate: (k: AttributeKey) => {
      updateCharacter(id, (x) => allocatePoint(x, k));
      toast({
        message: `Allocated 1 point to ${attributeMeta(k).name}`,
        action: { label: 'Undo', onClick: () => updateCharacter(id, (x) => undoAllocate(x, k)) },
      });
    },
    purchase: (qty: number, from: Pick<Character, 'essence' | 'level' | 'pointsPurchasedThisLevel'>) => {
      if (!canPurchase(from, qty)) return false;
      updateCharacter(id, (x) => applyPurchase(x, qty));
      toast({
        message: `Purchased ${qty} point${qty === 1 ? '' : 's'}`,
        action: { label: 'Undo', onClick: () => updateCharacter(id, (x) => undoPurchase(x, qty, from.level)) },
      });
      return true;
    },
  }), [id, updateCharacter, toast]);

  return { ...derived, ...actions };
}

export type Sheet = ReturnType<typeof useSheet>;

export const gearText = (g: number): string => (g > 0 ? `+${g} gear` : g < 0 ? `−${Math.abs(g)} gear` : '');
