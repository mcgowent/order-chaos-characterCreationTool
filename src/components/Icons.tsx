import type { ResourceKey, SlotId } from '../rules';

type P = { size?: number; className?: string };

export const PlusIcon = ({ size = 14, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className={className}>
    <path d="M7 2 V12 M2 7 H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const MinusIcon = ({ size = 14, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className={className}>
    <path d="M2 7 H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = ({ size = 14 }: P) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);

export const CloseIcon = ({ size = 12 }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const PenIcon = ({ size = 15, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 15 15" aria-hidden="true" className={className}>
    <path d="M10 2 L13 5 L5 13 H2 V10 Z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
  </svg>
);

export const ArrowRightIcon = ({ size = 14 }: P) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 7 H11 M8 4 L11 7 L8 10" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </svg>
);

export const ArrowLeftIcon = ({ size = 14 }: P) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
    <path d="M11 7 H3 M6 4 L3 7 L6 10" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </svg>
);

export const ChevronLeftIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <path d="M11 3 L5 9 L11 15" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);

export const ChevronDownIcon = ({ size = 12 }: P) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.6" fill="none" />
  </svg>
);

export const DotsIcon = ({ size = 18, horizontal = false }: P & { horizontal?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    {horizontal ? (
      <>
        <circle cx="3.5" cy="9" r="1.5" fill="currentColor" />
        <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        <circle cx="14.5" cy="9" r="1.5" fill="currentColor" />
      </>
    ) : (
      <>
        <circle cx="9" cy="3.5" r="1.5" fill="currentColor" />
        <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        <circle cx="9" cy="14.5" r="1.5" fill="currentColor" />
      </>
    )}
  </svg>
);

export const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
    <path d="M12 12 L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    {[[1, 1], [9, 1], [1, 9], [9, 9]].map(([x, y]) => (
      <rect key={`${x}${y}`} x={x} y={y} width="6" height="6" rx="1" stroke="currentColor" fill="none" strokeWidth="1.4" />
    ))}
  </svg>
);

export const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1 3 H15 M1 8 H15 M1 13 H15" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const DieIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M9 1.5 L16 5.5 V12.5 L9 16.5 L2 12.5 V5.5 Z M2 5.5 L9 9.5 L16 5.5 M9 9.5 V16.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
  </svg>
);

export const EssenceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1 L12 8 L8 15 L4 8 Z" stroke="var(--ak-gold)" strokeWidth="1.2" fill="rgba(201,164,92,.15)" />
  </svg>
);

export const ShieldLogo = () => (
  <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true">
    <path d="M15 1 L28 6 V17 C28 25 22 30 15 33 C8 30 2 25 2 17 V6 Z" fill="var(--ak-surface)" stroke="var(--ak-gold)" strokeWidth="1.4" />
    <path d="M15 8 V26 M10 13 L15 8 L20 13 M10 20 H20" stroke="var(--ak-teal-text)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);

export const RuneStrip = ({ id }: { id: string }) => (
  <svg width="100%" height="8" aria-hidden="true" style={{ display: 'block' }}>
    <defs>
      <pattern id={id} width="28" height="8" patternUnits="userSpaceOnUse">
        <path d="M3 7 L7 1 L11 7 M16 1 V7 M16 4 H22 M25 1 L25 7" stroke="var(--ak-gold)" strokeWidth=".8" fill="none" />
      </pattern>
    </defs>
    <rect width="100%" height="8" fill={`url(#${id})`} opacity=".22" />
  </svg>
);

const RESOURCE_PATHS: Record<ResourceKey, string> = {
  health: 'M8 14 C3 10.5 1.5 8 1.5 5.5 C1.5 3.5 3 2 5 2 C6.3 2 7.4 2.7 8 3.7 C8.6 2.7 9.7 2 11 2 C13 2 14.5 3.5 14.5 5.5 C14.5 8 13 10.5 8 14 Z',
  mana: 'M8 1 C8 1 3 7 3 10 C3 12.8 5.2 15 8 15 C10.8 15 13 12.8 13 10 C13 7 8 1 8 1 Z',
  stamina: 'M9.5 1 L3 9 H7.5 L6.5 15 L13 7 H8.5 Z',
};

export const ResourceIcon = ({ kind, size = 16 }: { kind: ResourceKey; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path d={RESOURCE_PATHS[kind]} fill="currentColor" />
  </svg>
);

const SLOT_PATHS = {
  head: 'M5 14 C5 8 8 4 12 4 C16 4 19 8 19 14 V18 H14 V13 H10 V18 H5 Z',
  neck: 'M6 4 C6 10 9 13 12 13 C15 13 18 10 18 4 M12 13 V15 M12 15 L14 17.5 L12 20 L10 17.5 Z',
  shoulders: 'M3 16 C3 10 7 7 12 7 C17 7 21 10 21 16 M7 16 C7 12 9 10.5 12 10.5 C15 10.5 17 12 17 16',
  back: 'M8 4 H16 L19 20 L12 18 L5 20 Z M8 4 L12 9 L16 4',
  chest: 'M7 4 L10 6 H14 L17 4 L20 8 L18 11 V20 H6 V11 L4 8 Z',
  wrists: 'M7 5 H17 V19 H7 Z M7 10 H17 M7 14 H17',
  hands: 'M7 20 V11 L7 6 M10 11 V4 M13 11 V4 M16 11 V6 M7 11 H18 V15 C18 18 16 20 13 20 H7',
  waist: 'M3 10 H21 V14 H3 Z M10 9 H14 V15 H10 Z',
  legs: 'M7 4 H17 L16 20 H13 L12 10 L11 20 H8 Z',
  feet: 'M8 4 H14 V14 L19 17 V20 H5 V14 L8 12 Z',
  ring: 'M6.5 14 A5.5 5.5 0 1 0 17.5 14 A5.5 5.5 0 1 0 6.5 14 Z M10 6 L12 4 L14 6 L12 8 Z',
  trinket: 'M12 3 L19 12 L12 21 L5 12 Z M12 7.5 L15.5 12 L12 16.5 L8.5 12 Z',
  main: 'M18 3 H21 V6 L10 17 L7 14 Z M5.5 15.5 L8.5 18.5 M4 20 L6.5 17.5',
  off: 'M12 3 L19 6 V12 C19 16 16 19 12 21 C8 19 5 16 5 12 V6 Z M12 3 V21',
};

const SLOT_ICON: Record<SlotId, string> = {
  head: SLOT_PATHS.head, neck: SLOT_PATHS.neck, shoulders: SLOT_PATHS.shoulders, back: SLOT_PATHS.back,
  chest: SLOT_PATHS.chest, wrists: SLOT_PATHS.wrists, hands: SLOT_PATHS.hands, waist: SLOT_PATHS.waist,
  legs: SLOT_PATHS.legs, feet: SLOT_PATHS.feet, trinket1: SLOT_PATHS.trinket, trinket2: SLOT_PATHS.trinket,
  leftRing1: SLOT_PATHS.ring, leftRing2: SLOT_PATHS.ring, rightRing1: SLOT_PATHS.ring, rightRing2: SLOT_PATHS.ring,
  mainHand: SLOT_PATHS.main, offHand: SLOT_PATHS.off,
};

export const SlotIcon = ({ slot, size = 26 }: { slot: SlotId; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d={SLOT_ICON[slot]} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

export const EmptyDiamondIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 L19 12 L12 21 L5 12 Z" stroke="var(--ak-gold-dim)" strokeWidth="1.4" fill="none" />
  </svg>
);
