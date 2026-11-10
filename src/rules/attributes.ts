import type { AttributeKey, ResourceKey, SlotId } from './types';

export interface AttributeMeta {
  key: AttributeKey;
  name: string;
  abbr: string;
  /** Effect line on the Character Sheet. */
  effect: string;
  /** Short note on the creation tiles. */
  createNote: string;
}

export const ATTRIBUTES: readonly AttributeMeta[] = [
  { key: 'constitution', name: 'Constitution', abbr: 'CON', effect: 'Max Health ×10 · Health regen', createNote: 'Health & regen' },
  { key: 'intellect', name: 'Intellect', abbr: 'INT', effect: 'Max Mana ×10 · Mana regen', createNote: 'Mana & regen' },
  { key: 'endurance', name: 'Endurance', abbr: 'END', effect: 'Max Stamina ×10 · Stamina regen', createNote: 'Stamina & regen' },
  { key: 'core', name: 'Core', abbr: 'COR', effect: 'Story-driven', createNote: 'Story-driven' },
  { key: 'concentration', name: 'Concentration', abbr: 'CNC', effect: 'Adds to Mana regen', createNote: 'Adds to Mana regen' },
  { key: 'strength', name: 'Strength', abbr: 'STR', effect: 'Story-driven', createNote: 'Story-driven' },
];

export const ATTRIBUTE_KEYS: readonly AttributeKey[] = ATTRIBUTES.map((a) => a.key);

export const attributeMeta = (key: AttributeKey): AttributeMeta => ATTRIBUTES.find((a) => a.key === key)!;

export interface ResourceMeta {
  key: ResourceKey;
  name: string;
  /** Attribute that sets the maximum. */
  maxFrom: AttributeKey;
  /** Human-readable regeneration source. */
  regenSource: string;
}

export const RESOURCES: readonly ResourceMeta[] = [
  { key: 'health', name: 'Health', maxFrom: 'constitution', regenSource: 'Constitution' },
  { key: 'mana', name: 'Mana', maxFrom: 'intellect', regenSource: 'Intellect + Concentration' },
  { key: 'stamina', name: 'Stamina', maxFrom: 'endurance', regenSource: 'Endurance' },
];

export interface SlotMeta {
  id: SlotId;
  /** Label on the slot button. */
  label: string;
  /** Title in the selected-slot panel. */
  title: string;
}

export const SLOTS: Record<SlotId, SlotMeta> = {
  head: { id: 'head', label: 'Head', title: 'Head' },
  neck: { id: 'neck', label: 'Neck', title: 'Neck' },
  shoulders: { id: 'shoulders', label: 'Shoulders', title: 'Shoulders' },
  back: { id: 'back', label: 'Back', title: 'Back' },
  chest: { id: 'chest', label: 'Chest', title: 'Chest' },
  wrists: { id: 'wrists', label: 'Wrists', title: 'Wrists' },
  hands: { id: 'hands', label: 'Hands', title: 'Hands' },
  waist: { id: 'waist', label: 'Waist', title: 'Waist' },
  legs: { id: 'legs', label: 'Legs', title: 'Legs' },
  feet: { id: 'feet', label: 'Feet', title: 'Feet' },
  trinket1: { id: 'trinket1', label: 'Trinket 1', title: 'Trinket 1' },
  trinket2: { id: 'trinket2', label: 'Trinket 2', title: 'Trinket 2' },
  leftRing1: { id: 'leftRing1', label: 'Ring 1', title: 'Left hand · Ring 1' },
  leftRing2: { id: 'leftRing2', label: 'Ring 2', title: 'Left hand · Ring 2' },
  mainHand: { id: 'mainHand', label: 'Main Hand', title: 'Main Hand' },
  offHand: { id: 'offHand', label: 'Off Hand', title: 'Off Hand' },
  rightRing1: { id: 'rightRing1', label: 'Ring 1', title: 'Right hand · Ring 1' },
  rightRing2: { id: 'rightRing2', label: 'Ring 2', title: 'Right hand · Ring 2' },
};

export const SLOT_IDS = Object.keys(SLOTS) as SlotId[];
