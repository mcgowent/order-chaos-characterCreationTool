# Arcane Knight Character Creator — instructions for Claude Code

You are building a working web application from an approved visual design.
The design is final: match it closely. Behavior is specified in `BUILD_SPEC.md`.

## Read first, in this order

1. `BUILD_SPEC.md` — what the app does, the data model, every rule and formula, and the acceptance criteria.
2. `design/screens/*.png` — screenshots of the approved design. Treat these as the visual target.
3. `design/tokens.css` — colors, fonts, radii, spacing. Use these variables; do not invent new colors.
4. `design/source/*.dc.html` — the design source for each screen. The exact sizes, borders, spacing, copy and
   states are in the inline styles. `design/README.md` explains the template syntax used in those files.
5. `data/sample-characters.json` — seed data for first launch.

## Stack (defaults — keep unless the owner says otherwise)

- React 18 + TypeScript + Vite.
- Plain CSS with the custom properties from `design/tokens.css` (CSS Modules or one stylesheet per component).
  No UI component library; the look is custom.
- React Router for the four routes in the spec.
- State: a small store (React context + reducer, or Zustand). Persist to `localStorage` under the key
  `arcane-knight:v1`, with JSON export/import so authors can back up their characters.
- Fonts: Cinzel (500/600/700) and Inter (400/500/600/700). Self-host with `@fontsource/cinzel` and `@fontsource/inter`.
- Tests: Vitest for all rule/formula functions; React Testing Library for the key flows listed in the spec.

## Working rules

- Put every game rule in one pure module (`src/rules/`) with unit tests. Components never re-implement a formula.
- Derived values (attribute totals, max resources, regeneration) are computed, never stored.
- Copy, labels and helper text come from the design files. Keep them.
- Do not invent formulas for Level progression or Reputation. The spec says exactly how to handle them.
- Real `<button>`, `<a>`, `<label>`/`<input>`; visible focus ring (2px teal, 2px offset) on every control.
- Desktop first; the layouts must also work at 390px wide (see the phone screenshot and spec).

## Commands to set up

```
npm create vite@latest . -- --template react-ts
npm i react-router-dom @fontsource/cinzel @fontsource/inter
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add `"test": "vitest"` to package.json scripts.

## Definition of done

Every item in **Acceptance criteria** in `BUILD_SPEC.md` passes, `npm test` is green, `npm run build` succeeds,
and each screen, viewed at 1440px and 390px wide, matches its screenshot.
