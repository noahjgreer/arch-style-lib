# Icons

Icons are [Lucide](https://lucide.dev) (ISC licensed, ~1,770 icons),
rendered as **inline SVG** and referenced in markup by **name**.

## Usage

```html
<span class="arch-icon" data-icon="download"></span>
```

```js
import { renderIcons } from "/js/icons.js";
renderIcons(); // fills every [data-icon] element on the page with its SVG
```

`renderIcons()` adds the `arch-icon` class automatically if it's missing, so
`<span data-icon="download"></span>` alone works too. It also sets
`aria-hidden="true"` on icons that don't already have an `aria-label` or
`aria-hidden`, since icons are decorative by default — add
`aria-label="Save"` yourself when an icon is the only content of an
interactive element (e.g. an icon-only button).

Call `renderIcons()` again after inserting new icon markup dynamically, or
use `watchIcons(root)` once on page load to auto-render icons added later via
a `MutationObserver`. To change an already-rendered icon, use
`setIcon(el, name)` rather than rewriting the attribute yourself — it keeps
the element identity, so a stored reference to it stays valid.

Names are Lucide's own, in kebab-case — browse them at
[lucide.dev/icons](https://lucide.dev/icons/). An unknown name renders a
`circle-question-mark` fallback and logs a console warning, so a typo is
visible on the page rather than silently blank.

## Sizing, color and stroke weight

```html
<span class="arch-icon" data-icon="download"
      style="--arch-icon-size: 2rem; --arch-icon-stroke: 2; color: var(--arch-blue);"></span>
```

| Property | Default | Notes |
|---|---|---|
| `--arch-icon-size` | `1.5rem` (tokens.css) | Sets both width and height. |
| `--arch-icon-stroke` | `2.5` (tokens.css) | In the icons' own 24-unit box, so it scales *with* the icon rather than being a fixed pixel width — matching Lucide's own behavior. Lucide's stock default is `2`. |
| `color` | inherited | Icons stroke with `currentColor`. |

`.arch-icon` sets `fill`, `stroke`, `stroke-width` and the line caps/joins on
the wrapper, and SVG inherits all of them into the paths — which is the whole
reason the icon data holds nothing but geometry. Don't put presentation
attributes on icon markup; set the custom properties instead.

## Why SVG rather than a font or a sprite

Icons were a bundled SF Symbols-derived symbol font until 2026-08-15. Three
things drove the change, in order of importance:

1. **Licensing.** SF Symbols is only licensed for use in Apple environments;
   shipping it in a web library used on any platform isn't permitted. Lucide
   is ISC — free for commercial and personal use, notice retention being the
   only condition (see `LICENSE-lucide`).
2. **Stroke weight.** A font bakes stroke weight into the glyph outlines.
   With SVG it's a live custom property, which is what makes
   `--arch-icon-stroke` possible at all.
3. **Weight on the wire.** The font was a 2.9 MB TTF plus a ~250 KB
   codepoint map. `js/icons-data.js` is 369 KB raw / ~79 KB gzipped, and
   there's no font file at all.

An external SVG sprite (`<use href="…/sprite.svg#name">`) would be smaller
still, but browsers restrict external `<use>` to **same-origin** documents,
and this library is deliberately consumed cross-origin from
`style.muffinmode.net`. It could never have resolved, so it isn't an option
here regardless of its merits elsewhere.

### Legacy names

`js/icons-legacy.js` maps the old SF Symbols names that were in use
(`square.and.arrow.down` → `download`, `trash` → `trash-2`, …) so a consumer
that hasn't migrated keeps rendering; each aliased name warns once in the
console. **That file is meant to be deleted** once every consumer is on
Lucide names — it's a migration shim, not a supported naming scheme.

`iconChar()` is gone in all but name: icons have no character to return. It
still exists as a deprecated no-op that warns, rather than throwing, so an
un-migrated consumer degrades instead of crashing. Use `iconSvg(name)` when
building an HTML string, or `setIcon(el, name)` for an element.

## Updating the icon set

`js/icons-data.js` is **generated** — don't hand-edit it.

```bash
npm install          # devDependency: lucide-static
npm run build:icons  # regenerates js/icons-data.js + LICENSE-lucide
```

The generator (`tools/build-icons.mjs`) reads `lucide-static`'s
`icon-nodes.json` and serializes each icon's node list to inner SVG markup.
It **fails loudly** if an icon carries a presentation attribute
(`stroke`, `stroke-width`, `class`, `style`, or a `fill` other than
`currentColor`), since that would silently out-specify `.arch-icon` and leave
that one icon unresponsive to theming — if Lucide ever introduces one
legitimately, decide deliberately, then update the generator's allowance.

This is a *generation* step, not a build step: the output is committed and
consumed directly, so the library still needs no toolchain to use — same
arrangement the FontForge scripts in `fonts/tools/` had before it.

To register a project-specific icon without editing the library, pass the
inner markup of a `0 0 24 24` SVG:

```js
import { defineIcons } from "/js/icons.js";
defineIcons({ "my-glyph": '<path d="M4 4h16"/>' });
```

## API reference

`js/icons.js`

| Function | Description |
|---|---|
| `iconSvg(name)` | Returns the complete `<svg>` markup for `name` (fallback icon + a console warning if unknown). For building HTML strings. |
| `setIcon(el, name)` | Points an existing element at an icon, replacing its contents and keeping its identity. |
| `defineIcons(entries)` | Merges additional `{ name: innerSvgMarkup }` pairs into the shared map. |
| `renderIcons(root?, opts?)` | Fills in every unrendered `[data-icon]` element in `root` (default `document`), including `root` itself if it carries the attribute. Pass `{ force: true }` to re-render already-rendered icons. |
| `watchIcons(root?)` | Renders icons now, then keeps rendering new/changed `[data-icon]` elements under `root` via a `MutationObserver`. Returns the observer (`.disconnect()` to stop). |
| `iconChar(name)` | **Deprecated**, renders nothing — see "Legacy names" above. |

`js/icons-data.js` also exports `ICONS` (name → inner markup) and
`LUCIDE_VERSION`.
