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
`.arch-panel-handle` child to grab — it needs no inner content, its `⠿`
grip glyph renders via CSS. Optional drop containers just need to match
`containerSelector`. To make a panel closable, wire your own close button
to add `.arch-panel--hidden` (`display: none`) and pass
`isDropTarget: (item) => !item.classList.contains("arch-panel--hidden")`
so a hidden panel drops out of hit-testing too — persistence and a "reopen"
affordance (e.g. a menu listing closed panels by name) are left to you,
the same division of labor as `onSwap`/`onSettle`.

```js
import { makePanelSwap } from "/js/panel-swap.js";
makePanelSwap(document.querySelector("#dashboard"), {
    containerSelector: ".panel-column",
    onSettle: (root) => saveLayout(root),
});
```

## Window manager

`js/window-manager.js`

Free-floating, overlappable windows inside a workspace container — the
Windows-11-style alternative to panel-swap's fixed-slot grid-swap. Drag by a
handle to move (with edge/corner snap previews), resize from any of 8
handles auto-injected around each window, maximize/restore (button or
double-click the handle), and click-anywhere-on-a-window to raise it to the
front.

| Function | Description |
|---|---|
| `makeWindowManager(workspace, opts?)` | Enables drag/resize/snap/maximize/focus for `workspace`'s windows. Returns a cleanup function. |
| `getWindowRect(win)` | Reads a window's current `{ left, top, width, height }` in px — the shape to persist in `onChange`. |
| `setWindowRect(win, workspace, rect, opts?)` | Applies a rect to `win`, clamped to `workspace`'s current bounds — use this to hydrate a persisted layout on load, so restored windows get the same clamping a live drag/resize would. `opts: { minWidth, minHeight }`. |

Options: `itemSelector` (default `.arch-window`), `handleSelector` (default
`.arch-window-handle`), `maximizeSelector` (default `.arch-window-maximize`
— an optional button inside the window; double-clicking the handle toggles
maximize regardless of whether this button exists), `minWidth`/`minHeight`
(px, default 240/160), `snapDistance` (px from a workspace edge/corner that
triggers a snap preview while dragging; default 32), `isDropTarget(win)`
(exclude a window from drag/resize/focus, e.g. a closed one, without
removing it from the DOM), `onChange(win)` (fired after a move, resize,
snap, or maximize/restore settles — the place to persist layout),
`onFocus(win)` (fired when a window is raised to the front — the place to
persist z-order).

Markup: `workspace` needs `position: relative` (or `absolute`) and an
explicit size — windows are clamped against its `clientWidth`/
`clientHeight`. Each window needs `.arch-window` (compose `.arch-glass`
alongside it yourself, same as `.arch-panel`) with an explicit inline
`left`/`top`/`width`/`height` (or restore one via `setWindowRect` before
the user's first drag) and a `.arch-window-handle` child to grab — same
handle look/glyph as `.arch-panel-handle` (`css/components/panel-swap.css`
styles both). Resize handles are injected automatically, one set per
window, on `makeWindowManager` init — no markup needed for those. A
maximize button is optional; give it `.arch-window-maximize` and any icon
you like, this module only wires the click.

Windows-11-style edge/corner snapping: dragging a window's handle within
`snapDistance` of the workspace's top edge previews a full-size snap;
within the left/right edge previews a half-width snap; within a corner
(near two edges at once) previews a quadrant. Releasing while a preview is
showing snaps into that rect and remembers the window's prior floating
rect; dragging the handle again restores that prior size before continuing
the free drag, positioned under the pointer — matches how Windows 11
"un-snaps" a tiled window when you start dragging it away.

```js
import { makeWindowManager, getWindowRect, setWindowRect } from "/js/window-manager.js";

const workspace = document.querySelector("#workspace");
for (const win of workspace.querySelectorAll(".arch-window")) {
    const saved = loadRect(win.id);
    if (saved) setWindowRect(win, workspace, saved);
}

makeWindowManager(workspace, {
    onChange: (win) => saveRect(win.id, getWindowRect(win)),
    onFocus: (win) => saveZ(win.id, win.style.zIndex),
});
```

## Area layout

`js/area-layout.js`

Blender-style tiling window layout — the alternative to both panel-swap and
window-manager for apps that want areas to always fully cover the
workspace, never overlapping, never leaving a gap. The workspace is a
planar graph of shared verts and rectangular areas (modeled after Blender's
own screen-area system, see the module's doc comment for exactly how and
where it simplifies that model): drag a corner action-zone inward, staying
inside the same area, to split it in two (mostly-horizontal drag → left/
right split, mostly-vertical → top/bottom, both live-previewed); drag a
corner zone across into a neighboring area to join the two back into one,
removing whichever area you dragged into; drag any shared border to
resize — every border collinear with (and touching) the one you grabbed
moves together, so a 3-way junction resizes as one run rather than opening
a gap. Content types are duplicable by default (the same type can be
assigned to any number of areas at once, each getting its own independent
instance — matching Blender's own multi-viewport-style editors); flag one
`{ singleton: true }` to restrict it to at most one area at a time instead.
Each area shows its current content type as a small floating icon-button
chip in its top-left corner, clear of the corner action zone there (not a
wide `<select>`, and not a full-width header bar either) — click it to
open a small popover (this library's own `popover.js`/`popover.css`)
listing the available types to switch to.

| Function | Description |
|---|---|
| `makeAreaLayout(workspace, opts)` | Builds and wires the whole tiling layout inside `workspace`. Returns `{ destroy(), getLayout() }`. |

Options: `contentTypes` (`{ id, label, icon?, singleton? }[]` — every
content type an area can show, offered in the popover its type chip
opens; `icon` is an icon name from `js/icons.js`'s `ICONS` map, shown on
the button and next to the entry in the popover, falling back to a generic
icon if omitted; duplicable across areas unless `singleton: true`, in which
case it's offered in every *other* area's popover only once no area
currently holds it), `defaultContentId` (what the very first area shows
when `initialLayout` isn't given), `initialLayout` (a previously-`getLayout()`'d layout to
restore), `minWidth`/`minHeight` (px, default 200/120), `borderHitPx` (how
close the pointer must be to a border to grab it for resizing; default 6),
`gap` (visual-only gutter in px rendered between areas, insetting each
area's box by half this on every side — the underlying tiling stays
edge-to-edge, so the gap becomes part of the grabbable border region
rather than dead space; default 0), `onMount(contentId, body)` (an area
started showing `contentId` — build or otherwise obtain that specific
area's own instance and append it into `body`; whatever this returns is
handed back to the matching `onUnmount` call for that same area, a
convenient place to stash a cleanup handle), `onUnmount(contentId, body,
instance)` (an area stopped showing `contentId` — reassigned, or the area
itself was joined away; `instance` is whatever `onMount` returned, tear it
down here), `onChange(layout)` (fired after any split/join/resize settles,
or a content reassignment — the place to persist `getLayout()`'s return
value), `onInteractionStart()`/`onInteractionEnd()` (fired around every
split/join/border-resize drag — for a consumer whose content is expensive
to resize continuously, e.g. a GPU canvas reconfiguring its render targets
on every intermediate size, the place to pause that work for the drag's
duration).

Markup: none needed beyond `workspace` itself having `position: relative`
(or `absolute`) and an explicit size — every area, its header, body,
corner zones, and the split/join preview overlays are all created by this
module.

```js
import { makeAreaLayout } from "/js/area-layout.js";

makeAreaLayout(document.querySelector("#workspace"), {
    contentTypes: [
        { id: "outliner", label: "Outliner" }, // duplicable — two Outliners is fine
        { id: "properties", label: "Properties" },
        { id: "timeline", label: "Timeline", singleton: true }, // at most one at a time
    ],
    defaultContentId: "outliner",
    initialLayout: loadLayout(),
    onMount: (id, body) => {
        const el = createPanel(id); // a fresh instance for this specific area
        body.appendChild(el);
        return el;
    },
    onUnmount: (id, body, el) => el.remove(),
    onChange: (layout) => saveLayout(layout),
});
```
