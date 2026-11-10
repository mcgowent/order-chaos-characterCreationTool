// Open questions from BUILD_SPEC §9 — the stated defaults, kept in one place so they are easy to change.

/** Does advancing a level spend the author-entered `essenceToNextLevel`? */
export const LEVEL_UP_CONSUMES_ESSENCE = true;

/** Reputation for newly created characters (rank mechanics are not defined yet). */
export const STARTING_REPUTATION = { rank: 1, progress: 0 } as const;

/** Essence for newly created characters. */
export const STARTING_ESSENCE = 0;

export const STARTING_LEVEL = 1;
export const STARTING_ATTRIBUTE_MIN = 10;
export const STARTING_ATTRIBUTE_MAX = 15;
export const POINTS_PER_LEVEL = 2;

/**
 * Attribute point price: the first point bought at a level costs
 * (Essence to advance this level) ÷ POINT_BASE_DIVISOR × POINT_BASE_FACTOR;
 * each further point that level costs POINT_PRICE_GROWTH × the previous one.
 * The chain is exact; each point's price is rounded up to whole Essence.
 * Expressed as fractions so prices are computed without floating-point error.
 */
export const POINT_BASE_DIVISOR = 2;
export const POINT_BASE_FACTOR = { num: 3, den: 4 } as const;   // 0.75
export const POINT_PRICE_GROWTH = { num: 5, den: 4 } as const;  // 1.25
export const RESOURCE_MULTIPLIER = 10;
export const TOTAL_SLOTS = 18;
