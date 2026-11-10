export type AttributeKey = 'constitution' | 'intellect' | 'endurance' | 'core' | 'concentration' | 'strength';
export type Attributes = Record<AttributeKey, number>;

export type SlotId =
  | 'head' | 'neck' | 'shoulders' | 'back' | 'chest' | 'wrists'
  | 'hands' | 'waist' | 'legs' | 'feet' | 'trinket1' | 'trinket2'
  | 'leftRing1' | 'leftRing2' | 'mainHand' | 'offHand' | 'rightRing1' | 'rightRing2';

export interface EquippedItem {
  name: string;
  bonuses: Partial<Attributes>;
}

export type ResourceKey = 'health' | 'mana' | 'stamina';
export type Resources = Record<ResourceKey, number>;

export interface Character {
  id: string;
  name: string;
  classification: string;
  species: string;
  level: number;
  essence: number;
  reputation: { rank: number; progress: number };
  baseAttributes: Attributes;
  unspentPoints: number;
  /** Points bought with Essence since reaching the current level (drives the rising price). */
  pointsPurchasedThisLevel: number;
  current: Resources;
  equipment: Partial<Record<SlotId, EquippedItem>>;
  portrait?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  version: 1;
  characters: Character[];
}
