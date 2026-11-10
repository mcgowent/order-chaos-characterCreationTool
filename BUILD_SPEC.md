# Arcane Knight Character Creator — Build Specification

A writing companion for authors working in Timothy McGowen's Arcane Knight universe. Authors create
characters, keep a consistent character sheet, track resources, spend Essence, and equip items while writing.

Single user, runs in the browser, data stored locally (see CLAUDE.md for stack).

---

## 1. Routes and navigation

| Route | Screen | Screenshot | Design source |
|---|---|---|---|
| `/` | Character Library | `1-library.png` | `Library.dc.html` |
| `/new` | Character Creation | `2-create.png` | `Create.dc.html` |
| `/character/:id` | Character Sheet / Editor | `3-sheet.png`, `3b-sheet-phone.png` | `Sheet.dc.html`, `SheetMobile.dc.html` |
| `/character/:id/equipment` | Equipment | `4-equipment.png` | `Equipment.dc.html` |

- Top bar on every screen: shield emblem + "ARCANE KNIGHT / Character Creator" (links to `/`), primary nav
  **Library** and **New Character** (active item: white text, 2px teal underline), author badge on the right
  (initials + "Author workspace"; static text is fine). A faint gold rune strip runs under the bar.
- Character Sheet and Equipment share an identity header with two tabs: **Character Sheet** | **Equipment**.
  The Equipment tab shows a badge "N / 18" (slots filled).
- Breadcrumbs: `Library / {Character name}` and `Library / {Character name} / Equipment`.
- Unknown character id → redirect to `/` with a small "Character not found" notice.

## 2. Data model

```ts
type AttributeKey = 'constitution' | 'intellect' | 'endurance' | 'core' | 'concentration' | 'strength';
type Attributes = Record<AttributeKey, number>;

type SlotId =
  | 'head' | 'neck' | 'shoulders' | 'back' | 'chest' | 'wrists'
  | 'hands' | 'waist' | 'legs' | 'feet' | 'trinket1' | 'trinket2'
  | 'leftRing1' | 'leftRing2' | 'mainHand' | 'offHand' | 'rightRing1' | 'rightRing2';

interface EquippedItem {
  name: string;                         // optional to the author; '' allowed → shown as "Unnamed item"
  bonuses: Partial<Attributes>;         // integers, may be negative; 0/absent = no bonus
}

interface Character {
  id: string;                           // uuid
  name: string;                         // required, trimmed, 1–80 chars
  classification: string;               // free text, 0–120 chars (NOT a dropdown)
  species: string;                      // free text, 0–120 chars (NOT a dropdown)
  level: number;                        // integer ≥ 1
  essence: number;                      // available Essence, integer ≥ 0
                                        // (Essence to next level is derived from the curve — see §3)
  reputation: { rank: number; progress: number }; // author-entered; progress 0–100 (%)
  baseAttributes: Attributes;           // attributes WITHOUT gear
  unspentPoints: number;                // integer ≥ 0
  pointsPurchasedThisLevel: number;     // points bought since reaching this level (price escalation); 0 on level up
  current: { health: number; mana: number; stamina: number };
  equipment: Partial<Record<SlotId, EquippedItem>>;
  portrait?: string;                    // optional data URL (see §5.4)
  createdAt: string; updatedAt: string; // ISO timestamps
}

interface AppData { version: 1; characters: Character[] }
```

Persist `AppData` to `localStorage['arcane-knight:v1']`. Save on every change (debounced ~300 ms) and show
"✓ All changes saved" in the sheet's top row after a save (shows "Saving…" in muted text while pending).
If storage is unavailable, keep working in memory and show "Changes are not being saved in this browser".

On first launch (no stored data) seed from `data/sample-characters.json`.

## 3. Rules and formulas (put all of these in `src/rules/`, with unit tests)

| Item | Rule |
|---|---|
| Starting level | 1 |
| Starting attributes | Each of the six rolls a uniform random integer **10–15 inclusive** |
| Level rewards | **+2 unspent attribute points per level gained**, starting at Level 2 (L1→L2 grants 2) |
| Level progression | Essence to advance from Level N to N+1 = row N of the progression curve (`src/rules/progression.ts`; e.g. L1→2 450, L5→6 2,250, L6→7 5,400). **Max level 120.** |
| Attribute purchase | First point bought at a level costs `essenceToNext(level) ÷ 2 × 0.75`; each further point **that level** costs **×1.25** the previous (shared across all attributes). Chain is exact; each point's price is **rounded up** to whole Essence. Resets to the new base on level up. Not available at Level 120. e.g. Level 1: 169, 211, 264, 330…; Level 5: 844, 1,055, 1,319… |
| Gear bonus | `gear[k]` = sum of `bonuses[k]` across all equipped items |
| Total attribute | `total[k] = baseAttributes[k] + gear[k]` |
| Maximum Health | `total.constitution × 10` |
| Maximum Mana | `total.intellect × 10` |
| Maximum Stamina | `total.endurance × 10` |
| Health regeneration | `total.constitution` per minute |
| Mana regeneration | `total.intellect + total.concentration` per minute |
| Stamina regeneration | `total.endurance` per minute |

- Core and Strength have no calculated effects (story-driven). Show them like the other attributes.
- Totals can be lower than base if bonuses are negative; clamp displayed totals and maxima at minimum 0.
- **Current resources are clamped**: whenever a maximum changes, `current = min(current, max)`. A maximum going
  up never raises current automatically.
- Required functions (suggested names): `rollStartingAttributes(rng)`, `gearBonuses(equipment)`,
  `totalAttributes(c)`, `maxResources(totals)`, `regenRates(totals)`, `purchaseCost(qty)`,
  `canPurchase(c, qty)`, `applyPurchase(c, qty)`, `allocatePoint(c, key)`, `advanceLevel(c)`,
  `clampCurrent(c)`. `rng` is injectable so tests are deterministic.

### Worked example (must hold in tests and in the seeded Caldor Miles)

Base: CON 39, INT 33, END 29, CORE 20, CNC 25, STR 39.
Gear (10 items, see seed): CON +4, INT +4, END +2, CORE +1, CNC +3, STR +5.
Totals: CON 43, INT 37, END 31, CORE 21, CNC 28, STR 44.
Max Health 430, Max Mana 370, Max Stamina 310. Regen: Health 43, Mana 65, Stamina 31 per minute.
Current: 430 / 370 / 295. Level 5, Essence to Level 6: 2,250 (from the curve), Available Essence 93,001, Reputation Rank 2, 6%.

## 4. Screen: Character Library (`/`)

Match `1-library.png`.

- Header: overline "ARCANE KNIGHT UNIVERSE" (gold), title "Character Library" (Cinzel), subtitle
  "{n} characters · Open a sheet to review stats while you write." Primary **Create Character** button → `/new`.
- Toolbar panel: search input (placeholder "Search by name, classification, or species"), **Sort** menu,
  **Grid / List** toggle.
  - Search: case-insensitive substring match on name, classification and species; filters live as you type.
  - Sort options: Recently edited (default, `updatedAt` desc), Name A–Z, Level (high → low).
  - Grid (default) shows cards; List shows one compact row per character (initials, name, classification,
    species, level, edited, "Open sheet") using the same tokens. Remember the choice in localStorage.
- Card (whole card is one link to `/character/:id`): initials tile (first letters of the first two capitalised
  words of the name), LEVEL + number top right, name (Cinzel, max 2 lines then ellipsis), CLASS (teal, max 2
  lines), SPECIES (1 line, ellipsis), footer "Edited {relative date}" + "Open sheet →". Full name in `title`.
  - Relative date: "today, 9:42 AM", "yesterday", otherwise "Nov 4" (add year if not current year).
  - Hover: gold border, slightly lighter surface, soft shadow. Focus: teal focus ring.
- Last tile is a dashed "New character" card → `/new`.
- No search results: show "No characters match "{query}"" with a **Clear search** button.
- No characters at all: show only the dashed New character tile, with the subtitle "No characters yet".

## 5. Screen: Character Creation (`/new`)

Match `2-create.png`. Two columns (form + summary aside); aside drops below the form on narrow screens.

1. **Identity** — Name (required), Classification, Species. Classification and Species are **free-text
   inputs** with helper text "Free text — enter any classification." / "Free text — enter any species."
   No dropdowns, no suggestions list.
2. **Starting Attributes** — **Roll Starting Attributes** button (secondary/gold). Attributes are rolled once
   automatically when the page opens; the button re-rolls all six (unlimited re-rolls before creation).
   Line: "Each attribute rolls a whole number from 10 to 15. Roll {n} · Total {sum}".
   Six tiles in order Constitution, Intellect, Endurance, Core, Concentration, Strength: name, abbreviation
   (CON INT END COR CNC STR), large value, six-segment pip bar for 10–15 (segments up to the value are gold),
   short effect note. Announce new values to screen readers (`aria-live="polite"`).
3. **Resource Preview** (marked "ƒ Calculated") — rows for Maximum Health / Mana / Stamina with the formula
   using current values (e.g. "Constitution 13 × 10"), the maximum, and "+X / min" regeneration with its source.

Aside "Character preview": initials, name (or "Unnamed character"), classification (or "Classification not set"),
species (or "Species not set"), Level 1, Attribute total, note about how points are earned, **Create Character**
(primary), **Cancel** (ghost → `/`).

- Create Character is disabled until Name is non-empty after trimming; show "Add a name to create this character."
- On create: level 1, essence 0, reputation {rank: 1, progress: 0} (see §9),
  baseAttributes = the roll, unspentPoints 0, current = the maxima, equipment {}. Navigate to the new sheet.
- Leaving with a name typed asks "Discard this character?" (confirm dialog).

## 6. Screen: Character Sheet / Editor (`/character/:id`)

Match `3-sheet.png`. Reading order: identity → level / Essence / reputation → resources (with regeneration)
→ attributes → attribute points. Max content width 1240px.

Top row: breadcrumb left; right side a legend — "▢ Editable" (inset field swatch) and "ƒ Calculated" — and
the save status.

### 6.1 Identity header
Initials tile, name (Cinzel 34px), CLASSIFICATION (teal) and SPECIES labels. Long values wrap; never truncate here.
**Edit identity** opens a modal dialog with the same three free-text fields (name required), Save / Cancel,
Esc closes, focus is trapped and returned. A "⋯" or secondary action **Delete character** lives in that dialog
footer (danger text button) with a confirm step; afterwards go to `/`.
The Character Sheet | Equipment tabs sit at the bottom of this header.

### 6.2 Level · Available Essence · Reputation (three tiles)
- **Level** tile: level number (Cinzel 44px), "Next: Level {n+1}", "Essence to reach Level {n+1}" with the value.
  - The value comes from the progression curve (§3) and is shown as calculated (ƒ), not editable.
  - **Advance to Level {n+1}** button: enabled only when `essence ≥ cost`.
    On click (confirm in a small popover showing the cost): `essence -= cost`, `level += 1`,
    `unspentPoints += 2`. When disabled, a helper explains why.
  - At Level 120 the tile reads "Max level" and the Advance button is hidden.
    (Whether levelling consumes Essence is an assumption — see §9; keep it behind `LEVEL_UP_CONSUMES_ESSENCE = true`.)
- **Available Essence** tile: large editable number field (the author awards Essence here). Formats with
  thousands separators when not focused; integers ≥ 0 only. Helper "Spent on levels and on attribute points."
- **Reputation** tile: "Rank {n}", "{p}%" in gold, gold progress bar, "{p}% toward Rank {n+1}". Rank and
  progress are author-editable (click to edit; rank integer ≥ 0, progress 0–100). Dashed tag
  "Rank mechanics · to be defined".

### 6.3 Resources (left column)
Panel title "Resources", button **Restore all to max** (sets current = max for all three).
For each of Health (red), Mana (blue), Stamina (amber):
- Icon chip (heart / droplet / bolt) + label. Never rely on colour alone.
- "Current" editable numeric input (width ~76px) " / {max} max". Values outside 0–max are clamped on commit.
- Bar 14px high, track = resource colour at ~12% opacity, fill width = current/max, role="meter" with aria values.
- Under the bar: "ƒ Max = {Attribute} {total} × 10" (left) and "Regeneration +{n} / min ({source})" (right).

### 6.4 Attributes (right column)
Header "Attributes" with "Unspent points {n}" pill (teal tint when > 0, grey when 0).
Six rows: abbreviation (gold), name + effect line, total value (24px bold), under it "Base {b} +{g} gear"
(omit the gear part when 0; show negative as "−2 gear"), and a **+** icon button "Allocate 1 point to {name}".
- + is enabled only when unspentPoints > 0. Click: `baseAttributes[k] += 1`, `unspentPoints -= 1`.
- Rows highlight on hover. Effect lines: CON "Max Health ×10 · Health regen", INT "Max Mana ×10 · Mana regen",
  END "Max Stamina ×10 · Stamina regen", CORE "Story-driven", CNC "Adds to Mana regen", STR "Story-driven".

### 6.5 Attribute Points (below attributes)
Text explains that points are earned per level and that purchased points cost ⅜ of the level's Essence requirement,
rising 25% per point bought this level. Stepper "Points to purchase" (− / value / +, min 1, default 1; design shows 3),
"Cost {purchaseCost(c, qty)} Essence", "Balance after {essence − cost}", primary button **Purchase {qty} point(s)**,
and a line "Next point {price} Essence · {n} bought at Level {level}".
- Disabled when cost > essence; then "Balance after" turns amber and helper reads "Not enough Essence".
- On purchase: `essence -= cost`, `unspentPoints += qty`, `pointsPurchasedThisLevel += qty`, reset qty to 1,
  brief toast "Purchased {qty} points" (Undo refunds the exact prices paid, if the level hasn't changed).
- At Level 120 purchasing is unavailable.
- When unspentPoints is 0 show "Allocation buttons are disabled until unspent points are available."

### 6.6 Phone layout (≤ 720px) — `3b-sheet-phone.png`
Compact top bar (back arrow, "Character Sheet", save status, ⋯ menu), identity card, the three progress
tiles in a 3-column row, resources, attributes as a 2-column grid of tiles (allocation + appears on each tile
when points are available), attribute points panel. Everything must remain usable at 390px.

## 7. Screen: Equipment (`/character/:id/equipment`)

Match `4-equipment.png`. No item creation system: an item is just an optional name plus attribute bonuses.

- Identity header (compact: initials, name, "Classification · Species · Level n", "{n} of 18 slots equipped") + tabs.
- **Paper doll panel**: left column Head, Neck, Shoulders, Back, Chest, Wrists; centre figure; right column
  Hands, Waist, Legs, Feet, Trinket 1, Trinket 2 (right column is mirrored: text right-aligned, icon on the
  right). Bottom row, three groups: **Left hand rings** (Ring 1, Ring 2), **Weapons** (Main Hand, Off Hand),
  **Right hand rings** (Ring 1, Ring 2). 18 slots total.
- Slot button: 56px icon box + uppercase slot label + item name + bonus summary ("+2 CON · +1 INT", teal).
  - Empty: dashed border, dim icon, "Empty".
  - Filled: solid gold-dim border, gold icon, inner glow.
  - Selected: teal border + 3px teal halo, teal label. `aria-pressed` reflects selection.
  - Hover: gold border. Accessible name: "{Slot}: {item}, {bonuses}" or "{Slot}: empty".
  - Slot icons: simple line icons (see the SVG paths in `Equipment.dc.html` renderVals → `I`).
- Centre figure: decorative outline figure in a faint rune circle; **Add portrait (optional)** lets the author
  pick an image (png/jpg/webp ≤ 2 MB, stored as a downscaled data URL ≤ 512px). With a portrait, show it in the
  circle and use it for the initials tile on all screens; offer "Remove portrait".
- **Selected slot panel** (right column, teal border when a slot is selected):
  overline "SELECTED SLOT", slot name (prefix "Left hand · " / "Right hand · " for rings), close ✕,
  "Item name (optional)" text input, "Attribute bonuses" — six rows (abbr, full name, − value +; value shows
  "+2", "0", "−1"; non-zero rows get a teal border), **Empty slot** (removes the item; disabled when empty)
  and **Done** (deselects). Editing any field of an empty slot creates the item. No slot selected → empty state
  "No slot selected — Choose any slot on the figure to name its item and set the attributes it grants."
- **Attributes with gear** panel ("ƒ Calculated"): table Attribute | Base | Gear | Total, then Max Health /
  Mana / Stamina with regeneration — all live as bonuses change. Footer "Totals feed the Character Sheet's
  attributes, resource maximums and regeneration."
- Keyboard: arrow keys move between slots in the paper doll; Enter/Space selects; Esc closes the panel.
- Phone: slots become a 2-column grid grouped as Armour, Accessories, Rings, Weapons; figure hidden; the
  selected-slot panel opens as a bottom sheet.

## 8. Visual system (see `design/tokens.css` and `5-style-reference.png`)

- Backgrounds: night `#0B0F17`, chrome `#0E1422`, surface `#121A2B`, raised `#172137`, inset `#0C1220`.
- Lines: `#24304A` (panels), `#33415F` (inputs), gold-dim `#8C7442` (featured frames).
- Accent: teal `#4FC1B5` (primary, focus, selection), teal-text `#8FE3D8` (regen, calculated); gold `#C9A45C`
  (overlines, ornament, progression), gold-light `#E2C98E`.
- Text: `#F2EFE8` headings/values, `#E7E4DC` body, `#A2ABBD` muted, `#8590A6` labels/helpers.
- Resources: Health `#E0525A`, Mana `#4C8EF0`, Stamina `#E9A23B` — always paired with a label and icon.
- Type: Cinzel for display/section titles only; Inter for everything else; numbers use `font-variant-numeric: tabular-nums`.
- Buttons: Primary (teal fill, dark text), Secondary (raised fill, gold-dim border, gold text — progression
  actions like Roll and Advance), Outline, Ghost. States: hover, focus (2px teal ring offset 2px), disabled
  (`#24304A` fill / `#5E6880`–`#7F8AA0` text, `cursor: not-allowed`). Min touch target 44px (36px allowed for
  dense icon buttons on desktop).
- Editable vs calculated: editable values sit in inset fields with a `#33415F` border; calculated values are
  plain text marked with an italic "ƒ" or the "ƒ Calculated" chip.
- Placeholders for undefined rules: dashed `#33415F` border, muted text, "· to be defined".
- Radii: 8px controls, 10px tiles, 12px panels, pills 999px. Decoration stays subtle: rune strip, faint glows only.

## 9. Open questions — implement the stated default, keep it easy to change

1. **Level progression** — resolved: fixed curve in `src/rules/progression.ts`, row N = cost to leave Level N, max level 120 (§3).
2. **Does levelling up consume Essence?** Default yes (`LEVEL_UP_CONSUMES_ESSENCE = true` in `src/rules/config.ts`).
3. **Reputation mechanics** are undefined → rank and % are author-entered. New characters start at Rank 1, 0%
   (`STARTING_REPUTATION` in config).
4. **Can points be un-allocated?** Not in this version. Add an "Undo" toast (5 s) after each allocation and purchase.
5. **Starting Essence** for new characters: 0 (`STARTING_ESSENCE` in config).

## 10. Data import / export
In the Library sort menu area add an overflow "⋯" menu with **Export characters (JSON)** and
**Import characters**. Import validates against the schema, shows how many characters will be added, and
never overwrites existing ids (imported duplicates get new ids).

## 11. Acceptance criteria

1. Library lists seeded characters as in `1-library.png`; search filters live; sort and grid/list work; cards open the sheet.
2. Long names/classifications (see Seraphine Ashvale-Corrigan) clamp to two lines on cards and wrap on the sheet.
3. Create: attributes are random integers within 10–15 (test with injected rng and 1,000 real rolls); re-roll works;
   Classification and Species accept any text; Create is disabled without a name; the new character opens at Level 1
   with current resources = maxima.
4. Sheet for Caldor Miles shows exactly the values in §3's worked example.
5. Purchasing 3 points at Level 5 from 93,001 Essence costs 844 + 1,055 + 1,319 = 3,218, leaving 89,783 and 3 unspent; + buttons become enabled; allocating to
   Constitution raises CON to 44, Max Health to 440, Health regen to 44, and leaves current Health at 430.
6. Purchase is disabled when cost exceeds Essence.
7. Advance to Level: Caldor at Level 5 (cost 2,250) with Essence 93,001 → Level 6, Essence 90,751, +2 unspent; next cost shows 5,400.
8. Editing current resources clamps to 0–max; Restore all sets them to max.
9. Equipment: all 18 slots present in the layout shown; changing a bonus updates the totals table and resource
   maxima immediately, and the Character Sheet reflects the same totals; removing an item that lowers a max clamps current.
10. All data survives a page reload; export → import round-trips.
11. Keyboard only: every action is reachable, focus is always visible, dialogs trap focus and close on Esc.
12. Text contrast ≥ 4.5:1 for body text (the token palette already meets this; do not lighten backgrounds).
13. Layouts work at 1440px and at 390px without horizontal page scroll.
14. Unit tests cover every function in §3 including negative gear bonuses and clamping.
