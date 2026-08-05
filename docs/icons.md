# Icons

Icons are custom glyphs from a bundled symbol font (`fonts/SF-AlfredoSymbols.ttf`),
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

## ⚠️ Placeholder codepoints

`js/icons.js`'s `ICONS` map currently ships with **unverified placeholder**
codepoints. The font's internal glyph names (`u100184`, `NameMe.242`, ...)
carry no semantic meaning, so there's no automatic way to know which
codepoint is actually an archive-box glyph, a trash-can glyph, etc.

To fill in real mappings:

1. Open `fonts/SF-AlfredoSymbols.sfd` in [FontForge](https://fontforge.org/).
2. Find the glyph you want visually; note its encoding/codepoint (the
   `StartChar:`/`Encoding:` line, or FontForge's glyph inspector).
3. Add or correct the entry in `js/icons.js`. Icon names commonly contain
   dots (mirroring SF Symbols naming, e.g. `square.and.arrow.down`), which
   aren't valid in a bare object key — **quote the key**:

   ```js
   export const ICONS = {
       "square.and.arrow.down": "\u{100184}", // confirmed against SF-AlfredoSymbols.sfd
       "trash": "\u{100233}",
   };
   ```

   Or register icons from your own project without editing the library:

   ```js
   import { defineIcons } from "/js/icons.js";
   defineIcons({ "square.and.arrow.down": "\u{100184}" });
   ```

## Adding new glyphs to the font

`fonts/SF-AlfredoSymbols.sfd` is the editable FontForge source;
`fonts/SF-AlfredoSymbols.ttf` is the compiled font `css/icons.css` actually
loads. To add a glyph:

1. Open the `.sfd` in FontForge, import/draw the new glyph, assign it an
   unused Private Use Area codepoint (`u10xxxx`).
2. Run `fonts/tools/centerglyphs.py` (FontForge's built-in scripting console:
   *Tools → Execute Script*) on the selected glyph(s) to vertically center
   them on the font's midline, matching the rest of the set.
3. **File → Generate Fonts…** → overwrite `SF-AlfredoSymbols.ttf`.
4. Add the new name/codepoint pair to `js/icons.js`.
5. Add a demo entry to `index.html`'s icon showcase.

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
