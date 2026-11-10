# Arcane Knight Character Creator — handoff package

## How to use this with Claude Code

1. Unzip this folder and make it your project folder (or copy its contents into an empty repo).
2. Open a terminal in the folder and run `claude`.
3. Paste the prompt below.

```
Build the Arcane Knight Character Creator in this folder. Start by reading CLAUDE.md, then BUILD_SPEC.md,
then look at every screenshot in design/screens and the matching source in design/source.
Work in this order and show me progress after each step:
1) scaffold the project and tokens, 2) the rules module with unit tests, 3) the data store with
localStorage + seed data, 4) Library, 5) Character Creation, 6) Character Sheet, 7) Equipment,
8) phone layouts, 9) import/export, 10) go through every acceptance criterion in BUILD_SPEC.md §11 and
report which pass. Match the screenshots closely. Ask me before changing any rule in §3 or §9.
```

## What's inside

| Path | What it is |
|---|---|
| `CLAUDE.md` | Standing instructions Claude Code reads automatically: stack, conventions, definition of done |
| `BUILD_SPEC.md` | Full behaviour spec: routes, data model, every formula, each screen, open questions, acceptance criteria |
| `design/screens/` | Screenshots of the approved design (Library, Creation, Sheet, Sheet on phone, Equipment, Style reference) |
| `design/tokens.css` | Colours, fonts, radii and effects as CSS variables |
| `design/source/` | The design source files (exact measurements, copy and states) + `design/README.md` on how to read them |
| `data/sample-characters.json` | Seed data: Caldor Miles with the exact sample values, plus five more characters |

## Decisions already made (change them in BUILD_SPEC.md before you start if you disagree)

- Web app, React + TypeScript + Vite, data saved in the browser with JSON export/import.
- Level progression and Reputation rules are not defined yet: the author types the Essence needed for the next
  level and the Reputation rank/percentage by hand. Levelling up spends that Essence and grants 2 points.
- Equipment bonuses add on top of base attributes; Caldor's sample numbers are totals including gear.
