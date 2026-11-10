# Design files

- `screens/` — screenshots of the approved design (1440px wide; the phone sheet is 390px).
  `5-style-reference.png` shows every button, input, stat card, attribute-row and resource-bar state.
- `tokens.css` — the palette, type and shape tokens. Import it once at the app root.
- `source/` — the design source for each screen. These are design-tool files, **not app code**: read them for exact
  measurements, colours, copy and states, then rebuild them as React components.

## Reading a `.dc.html` source file

- Everything visible is inside `<x-dc>`; styling is inline `style="…"` (that is the spec for each element).
- `<helmet><style>` holds hover/focus rules, e.g. `.card:hover { border-color: #8C7442 }`.
- `{{name}}` inserts a value from `renderVals()` in the `<script type="text/x-dc">` block at the bottom.
- `<sc-for list="{{items}}" as="item">…</sc-for>` repeats its content per item (sample data is in `renderVals()`).
- `<sc-if value="{{flag}}">…</sc-if>` shows its content only when the flag is true.
- `onClick="{{handler}}"` / `onChange="{{handler}}"` are prototype interactions — useful as behaviour hints,
  but `BUILD_SPEC.md` is the authority on behaviour.
- Links between screens use the design file names (`Main.dc.html` = the Library, renamed here to
  `Library.dc.html`; `Sheet.dc.html`, `Create.dc.html`, `Equipment.dc.html`). Map them to the routes in the spec.
- `support.js` (referenced in each file's head) is the design tool's runtime and is not included — not needed.
