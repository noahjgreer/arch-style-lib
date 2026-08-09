# JS behaviors

Each module in `js/` is a standalone ES module of plain functions — no
global state beyond `localStorage` (theme) and whatever DOM you pass in.
Import the file you need, or `js/index.js` for everything.

## Theme

`js/theme.js`

| Function | Description |
|---|---|
| `initTheme()` | Restores a persisted `data-theme` override. Call once on page load. |
| `setTheme(theme)` | Sets `"light"`, `"dark"`, or `null` (clear override, follow OS). Persists to `localStorage`. |
| `getStoredTheme()` | Returns the persisted override, or `null`. |
| `toggleTheme()` | Flips between light/dark. |
| `lightOrDark(color)` | Classifies a `#hex`/`rgb()`/`rgba()` string as `"light"` or `"dark"` (HSP luminance model). |

```js
import { initTheme, toggleTheme } from "/js/theme.js";
initTheme();
document.querySelector("#theme-toggle").addEventListener("click", toggleTheme);
```

## Glass

`js/glass.js`

| Function | Description |
|---|---|
| `setGlassBlur(px, opts?)` | Sets `--arch-glass-blur` on `:root` (or `opts.root`), clamped 0–40px. |
| `detectImageBrightness(url)` | Samples an image and resolves `"light"`, `"dark"`, or `null` (load/CORS failure). |
| `applyAdaptiveGlass(url, target?)` | Samples `url` and stamps `data-glass-scheme` on `target` (default `<html>`), which flips `.arch-glass` reflex tokens for legibility over that background. |

```js
import { applyAdaptiveGlass } from "/js/glass.js";
await applyAdaptiveGlass("/backgrounds/sunset.jpg");
```

## Popover

`js/popover.js`

| Function | Description |
|---|---|
| `positionPopover(popover, anchor, opts?)` | Positions a `position: fixed` popover against an anchor, clamped to the viewport, flipping above the anchor if there's no room below. `opts: { gap, edgePadding, reserveBottom }`. |
| `openPopover(popover, anchor, opts?)` | Positions, then adds `.arch-popover--open`. |
| `closePopover(popover)` | Removes `.arch-popover--open`. |
| `bindDismiss(popover, anchor, onClose)` | Closes on outside pointerdown. Returns a cleanup function. |

```js
import { openPopover, closePopover, bindDismiss } from "/js/popover.js";
btn.addEventListener("click", () => openPopover(popover, btn));
bindDismiss(popover, btn, () => closePopover(popover));
```

> **Gotcha:** never nest a `.arch-popover` inside an `.arch-glass` (or any
> other `backdrop-filter`) ancestor. `backdrop-filter` creates a new
> containing block, so a `position: fixed` descendant positions itself
> relative to *that* ancestor instead of the viewport. Keep popovers as
> siblings at the end of `<body>` — see `index.html` for the pattern.

## Switcher

`js/switcher.js`

| Function | Description |
|---|---|
| `initSwitcher(container, opts?)` | Wires an `.arch-switcher`'s tab clicks: updates the sliding-pill position and active state, fires `archswitch` on the container. `opts: { onChange(index) }`. |
| `initRadioSwitcher(container)` | For radio-group segmented controls: drives the same sliding-pill `--arch-switcher-count`/`--arch-switcher-index` properties as `initSwitcher()` off the checked radio (active-tab styling is handled by CSS `:has()`, not a JS class), and tracks the previously-checked `c-option` as a `c-previous` attribute, useful for animating the transition. |

```js
import { initSwitcher } from "/js/switcher.js";
initSwitcher(document.querySelector("#tabs"), {
    onChange: (index) => console.log("active tab", index),
});
```

```js
import { initRadioSwitcher } from "/js/switcher.js";
initRadioSwitcher(document.querySelector("#tabs"));
document.querySelector("#tabs").addEventListener("change", (e) => {
    console.log("active option", e.target.getAttribute("c-option"));
});
```

## Drag reorder

`js/drag-reorder.js`

| Function | Description |
|---|---|
| `makeDragReorder(container, opts?)` | Enables pointer-based reordering of `container`'s direct children with a floating ghost clone. Returns a cleanup function. |

Options: `handleSelector` (limit drag start to a handle within each row;
omit to make the whole row draggable), `itemSelector` (default
`:scope > *`), `canDrag(container)` (extra gate, e.g. an edit-mode check),
`onReorder({ fromIndex, toIndex, item })`.

```js
import { makeDragReorder } from "/js/drag-reorder.js";
makeDragReorder(document.querySelector("#list"), {
    handleSelector: ".drag-handle",
    onReorder: ({ fromIndex, toIndex }) => saveOrder(fromIndex, toIndex),
});
```

## Panel swap

`js/panel-swap.js`

| Function | Description |
|---|---|
| `makePanelSwap(root, opts?)` | Enables pointer-based grid-swap dragging of `root`'s panels with a floating ghost clone: drag one onto another and they trade DOM positions (FLIP-animated); drag below the last panel in a container and it relocates there instead. Returns a cleanup function. |

Options: `itemSelector` (default `.arch-panel`), `handleSelector` (limit
drag start to a handle within each panel; default `.arch-panel-handle`,
pass `null` to make the whole panel a handle), `containerSelector` (selector
for drop containers — e.g. columns or slots — that panels can relocate
into; omit to treat `root` itself as the only container), `canDrag(root)`
(extra gate, e.g. an edit-mode check), `isDropTarget(item)` (exclude a
panel from hit-testing, e.g. one you've collapsed, without removing it from
the DOM), `onSwap({ a, b })` (fired every time two panels trade positions
during a drag), `onSettle(root)` (fired once on pointerup — the place to
persist panel order).

Markup: give each panel `.arch-panel` (compose `.arch-glass` alongside it
yourself — this module doesn't bake glass styling in) and a
`.arch-panel-handle` child to grab. Optional drop containers just need to
match `containerSelector`.

```js
import { makePanelSwap } from "/js/panel-swap.js";
makePanelSwap(document.querySelector("#dashboard"), {
    containerSelector: ".panel-column",
    onSettle: (root) => saveLayout(root),
});
```
