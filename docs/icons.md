# Icons

Icons are custom glyphs from a bundled symbol font (`fonts/SF-Symbols.ttf`),
referenced in markup by **name** rather than by raw character or codepoint.

## Usage

```html
<span class="arch-icon" data-icon="square.and.arrow.down"></span>
```

```js
import { renderIcons } from "/js/icons.js";
renderIcons(); // fills every [data-icon] element on the page with its glyph
```

`renderIcons()` adds the `arch-icon` class automatically if it's missing, so
`<span data-icon="square.and.arrow.down"></span>` alone works too. It also sets
`aria-hidden="true"` on icons that don't already have an `aria-label` or
`aria-hidden`, since icons are decorative by default — add
`aria-label="Save"` yourself when an icon is the only content of an
interactive element (e.g. an icon-only button).

Call `renderIcons()` again after inserting new icon markup dynamically, or
use `watchIcons(root)` once on page load to auto-render icons added later via
a `MutationObserver` (see [behaviors reference](#api-reference) below).

## Codepoint mapping

`js/icons.js`'s `ICONS` map holds real, verified name → codepoint pairs
(SF Symbols-style dotted names, e.g. `square.and.arrow.down`), extracted
from the source Figma catalog's PDF export — see the file's header comment
for exactly how (PDF content-stream `ToUnicode` CMap, not a text-layer
extraction, which mis-decodes supplementary-plane codepoints). Icon names
contain dots, which aren't valid in a bare object key — **quote the key**:

```js
export const ICONS = {
    "square.and.arrow.down": "\u{100184}",
    "trash": "\u{100233}",
};
```

To add a codepoint not yet in the map, confirm it against
`fonts/SF-Symbols.sfd` in [FontForge](https://fontforge.org/) (its
`StartChar:`/`Encoding:` line, or the glyph inspector) or via the same
Figma/PDF extraction process as the rest of the map — don't guess. Register
project-local additions without editing the library via:

```js
import { defineIcons } from "/js/icons.js";
defineIcons({ "square.and.arrow.down": "\u{100184}" });
```

## Adding new glyphs to the font

`fonts/SF-Symbols.sfd` is the editable FontForge source; `fonts/SF-Symbols.ttf`
is the compiled font `css/icons.css` actually loads. To add a glyph:

1. Open the `.sfd` in FontForge, import/draw the new glyph, assign it an
   unused Private Use Area codepoint (`u10xxxx`).
2. Run `fonts/tools/centerglyphs.py` (FontForge's built-in scripting console:
   *Tools → Execute Script*) on the selected glyph(s) to vertically center
   them on the font's midline, matching the rest of the set.
3. **File → Generate Fonts…** → overwrite `SF-Symbols.ttf`.
4. Add the new name/codepoint pair to `js/icons.js`.
5. Add a demo entry to `index.html`'s icon showcase.
6. **Verify the font still loads in a real browser** (open `index.html`,
   check the console). FontForge's "Generate Fonts…" doesn't reliably
   produce a spec-compliant `name` table — a malformed one gets the whole
   font silently rejected by the browser's OTS sanitizer (all glyphs
   disappear, not just the new one), with no error beyond a console
   warning like `rejected by sanitizer`. If you hit that, rebuild the
   `name` table with `fontTools` rather than re-exporting — see the
   "Icons" section of `CLAUDE.md` for the exact script.

## Sizing & color

Icons inherit `color` and size via `--arch-icon-size` (defaults to
`1.5rem`, from `tokens.css`):

```html
<span class="arch-icon" data-icon="square.and.arrow.down" style="--arch-icon-size: 2rem; color: var(--arch-blue);"></span>
```

## API reference

`js/icons.js`

| Function | Description |
|---|---|
| `iconChar(name)` | Returns the glyph for `name`, or a `"?"` fallback if unknown (and logs a console warning). |
| `defineIcons(entries)` | Merges additional `{ name: glyph }` pairs into the shared map — use this from a consuming project instead of editing the library. |
| `renderIcons(root?, opts?)` | Fills in every unrendered `[data-icon]` element under `root` (default `document`). Pass `{ force: true }` to re-render already-rendered icons (e.g. after `defineIcons()` changes an existing name). |
| `watchIcons(root?)` | Renders icons now, then keeps rendering new/changed `[data-icon]` elements under `root` via a `MutationObserver`. Returns the observer (`.disconnect()` to stop). |
