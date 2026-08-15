# Components

All classes are namespaced `arch-` to avoid collisions with app-specific
CSS. Markup examples below assume `css/arch.css` is loaded.

## Glass

The signature surface. Apply `.arch-glass` to any element — it keeps that
element's own `border-radius`. `.arch-glass-panel` adds sensible rounding +
padding for a card/panel; `.arch-glass-strong` increases the tint for
elements that need to stay legible over busy backgrounds.

```html
<div class="arch-glass arch-glass-panel">
    <h2>Card title</h2>
    <p>Body content.</p>
</div>
```

Tunable per-instance via inline custom properties:

```html
<div class="arch-glass" style="--arch-glass-blur: 16px; --arch-glass-mix: 20%;">…</div>
```

See [behaviors.md#glass](./behaviors.md#glass) for runtime blur control and
adaptive light/dark reflex based on a background image.

## Button — `.arch-btn`

```html
<button class="arch-btn">Solid</button>
<button class="arch-btn arch-btn--ghost">Ghost</button>
<button class="arch-btn arch-glass arch-btn--glass">Glass</button>
<button class="arch-btn arch-btn--icon" aria-label="Add">+</button>
<button class="arch-btn arch-btn--sm">Small</button>
```

Retint a single button with `style="--arch-accent: var(--arch-green)"`.

## Text field — `.arch-input`

A single-line text input, pill-rounded to match the rest of the library.
Pairs with `.arch-glass` the same way `.arch-btn` does — add
`.arch-input--glass` alongside `.arch-glass` for the frosted treatment; on
its own it falls back to a flat fill. `.arch-input--sm` shrinks padding/font
for compact contexts (inline with a small button, list rows).

```html
<input class="arch-input" type="text" placeholder="Untitled project" />
<input class="arch-input arch-glass arch-input--glass" type="text" placeholder="Untitled project" />
<input class="arch-input arch-input--sm" type="text" />
```

## Badge — `.arch-badge`, `.arch-dot`

```html
<span class="arch-badge">12</span>
<span class="arch-badge arch-badge--outline">Draft</span>
<span class="arch-dot"></span>
```

## Popover — `.arch-popover`

Chrome only — pair with [`js/popover.js`](./behaviors.md#popover) for
positioning and open/close state. **Place it outside any `.arch-glass`
ancestor** — see the gotcha note in [behaviors.md](./behaviors.md#popover).

```html
<div class="arch-popover arch-glass" id="menu" role="menu">
    <div class="arch-popover__notch"></div>
    …items…
</div>
```

## Menu — `.arch-menu-bar`, `.arch-menu`

A desktop-style application menu bar: a row of text triggers, each dropping a
stacked list of rows. Normally you don't write this markup —
[`js/menu.js`](./behaviors.md#menu) builds all of it from a definition array —
but the classes are here for anything hand-rolled.

Deliberately **not** a column of `.arch-btn`/`.arch-toggle-btn` pills in a
popover: a pill carries its own surface, so a stack of them reads as loose
buttons sharing a panel. A menu row has no surface until hovered, spans the
panel's full width, and aligns its label against every other row's — that
shared leading slot (`.arch-menu__lead`, always reserved whether or not the
row has an icon) is most of what makes a list read as one menu.

For the same reason, use `.arch-menu__item--check` for an on/off row *inside a
menu* even in a project that otherwise standardizes on `.arch-toggle-btn` — it
keeps that component's hollow→filled state dot, in the menu's own row idiom.

```html
<nav class="arch-menu-bar">
    <button class="arch-menu-bar__trigger" type="button" aria-haspopup="true">Project</button>
    <div class="arch-menu-bar__spacer"></div>
    <button class="arch-menu-bar__trigger" type="button" aria-haspopup="true">Account</button>
</nav>

<!-- Sibling of the bar at <body> level — same containing-block gotcha as any popover. -->
<div class="arch-popover arch-popover--menu arch-glass" data-arch-popover>
    <div class="arch-menu" role="menu">
        <button class="arch-menu__item" type="button" role="menuitem">
            <span class="arch-menu__lead"><span class="arch-icon" data-icon="plus"></span></span>
            <span class="arch-menu__label">New project</span>
            <span class="arch-menu__shortcut">Ctrl+N</span>
        </button>

        <div class="arch-menu__separator" role="separator"></div>
        <div class="arch-menu__group-label">Preferences</div>

        <label class="arch-menu__item arch-menu__item--check" role="menuitemcheckbox">
            <input class="arch-menu__check-input" type="checkbox" checked />
            <span class="arch-menu__lead"><span class="arch-menu__state"></span></span>
            <span class="arch-menu__label">Dark theme</span>
        </label>

        <button class="arch-menu__item" type="button" role="menuitem" aria-haspopup="true">
            <span class="arch-menu__lead"></span>
            <span class="arch-menu__label">Recent</span>
            <span class="arch-icon arch-menu__marker" data-icon="chevron.right"></span>
        </button>

        <div class="arch-menu__text">you@example.com</div>
        <div class="arch-menu__custom">…any control the app builds itself…</div>
    </div>
</div>
```

Rows: `.arch-menu__item` (`--check` / `--disabled` / `--active`, the last set by
`menu.js` on the keyboard-focused row so arrow keys and the mouse highlight
identically), `.arch-menu__separator`, `.arch-menu__group-label`,
`.arch-menu__text`, `.arch-menu__custom`. `.arch-menu-bar__spacer` pushes
everything after it to the far end of the bar.

## Modal — `.arch-modal`

Centered glass dialog over a dimmed, blurred backdrop. Chrome only — toggle
the `arch-modal-backdrop--open` class on the backdrop to show it. Dismissal
(backdrop click, Escape, focus return) is deliberately left to the consumer,
since a *blocking* dialog wants none of it.

Same containing-block gotcha as the popover: `position: fixed` inside a
`.arch-glass` (or any `backdrop-filter`) ancestor positions against that
ancestor, not the viewport — keep the backdrop a direct child of `<body>`.

```html
<div class="arch-modal-backdrop" id="picker">
    <div class="arch-modal arch-glass" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <h2 class="arch-modal__title" id="picker-title">Choose a project</h2>
        <div class="arch-modal__body">…scrolls if tall…</div>
        <div class="arch-modal__actions">
            <button class="arch-btn" type="button">Continue</button>
        </div>
    </div>
</div>
```

Tunables: `--arch-modal-width` (default `32rem`), `--arch-modal-max-block`
(default `85vh`).

## Switcher — `.arch-switcher`

Segmented control with an animated sliding pill. Pair with
[`initSwitcher()`](./behaviors.md#switcher).

```html
<div class="arch-switcher arch-glass" id="tabs">
    <button class="arch-switcher__tab arch-switcher__tab--active">Day</button>
    <button class="arch-switcher__tab">Week</button>
    <button class="arch-switcher__tab">Month</button>
</div>
```

For native keyboard/screen-reader semantics, build it from radio inputs
instead and pair with [`initRadioSwitcher()`](./behaviors.md#switcher) —
the active-tab highlight is handled by CSS `:has()`, no class toggling
needed:

```html
<fieldset class="arch-switcher arch-glass" id="tabs">
    <label class="arch-switcher__tab">
        <input type="radio" name="range" c-option="day" checked />Day
    </label>
    <label class="arch-switcher__tab">
        <input type="radio" name="range" c-option="week" />Week
    </label>
    <label class="arch-switcher__tab">
        <input type="radio" name="range" c-option="month" />Month
    </label>
</fieldset>
```

### Vertical — `.arch-switcher--vertical`

The same control turned down a sidebar: tabs stack, and the pill slides on Y.
A vertical tab lays its own contents out in a column too, so an icon over a
caption needs nothing but `.arch-switcher__label` on the caption — which stays
on one line (ellipsized), since a wrapped caption would make one tab taller
than its siblings and the sliding pill assumes every tab is an equal share of
the container.

```html
<div class="arch-switcher arch-switcher--vertical arch-glass" id="places">
    <button class="arch-switcher__tab arch-switcher__tab--active">
        <span class="arch-icon" data-icon="house"></span>
        <span class="arch-switcher__label">Home</span>
    </button>
    <button class="arch-switcher__tab">
        <span class="arch-icon" data-icon="tray"></span>
        <span class="arch-switcher__label">Inbox</span>
    </button>
</div>
```

## Toggle — `.arch-toggle`

An iOS-style switch. Built on a native `<input type="checkbox">` for
keyboard/screen-reader support — no JS required, driven entirely by
`:checked`. Retint like a button via `--arch-accent`.

```html
<label class="arch-toggle">
    <input class="arch-toggle__input" type="checkbox" />
    <span class="arch-toggle__track"></span>
    <span class="arch-toggle__label">Mirror seams</span>
</label>
```

## Toggle button — `.arch-toggle-btn`

A button-shaped toggle for toolbars and filter rows: a glass pill that reads
neutral (`--arch-fg`) when off and accent-tinted when on, with a small state
dot at its leading edge so it's recognizable as a toggle rather than an action
button. Deliberately quieter than `.arch-btn`'s solid fill — it's meant to sit
beside switchers and inputs without out-shouting the content it controls. Use
`.arch-toggle` instead when the control is a settings-style on/off switch in a
list of them; use this when it belongs in a row of buttons.

Combine with `.arch-glass` for the frosted surface. Both states only ever set
`background-color`, never `box-shadow`, so the glass reflex highlights survive
the accent tint rather than being replaced by it. Retint via `--arch-accent`.

Checkbox-driven (no JS — state lives in the input, keyboard/screen-reader
semantics come free; prefer this form):

```html
<label class="arch-toggle-btn arch-glass">
    <input class="arch-toggle-btn__input" type="checkbox" checked />
    <span class="arch-toggle-btn__label">Follow</span>
</label>
```

Button-driven, for when the state is owned elsewhere — flip `aria-pressed` in
your own code:

```html
<button class="arch-toggle-btn arch-glass" type="button" aria-pressed="true">
    <span class="arch-toggle-btn__label">Follow</span>
</button>
```

Sizing deliberately mirrors the button/input scale so the three read as peers
in one row: the base matches `.arch-btn`, and `.arch-toggle-btn--sm` matches
`.arch-btn--sm` and `.arch-input--sm`.

## Scrollbars

`css/scrollbar.css` restyles **every** scrolling element — slim, rounded,
transparent-tracked, drawn from the `--arch-fill-*` tokens so it adapts to
light/dark for free. There's no class to apply: a scrollbar isn't something
markup opts into, and the point is that a consuming app doesn't show chunky
square platform scrollbars (Windows 10 Chromium especially) beside its glass
panels.

Knobs, all on `:root`:

| Property | Default | Notes |
| --- | --- | --- |
| `--arch-scrollbar-size` | `0.75rem` | Width of the gutter, i.e. the grab target. |
| `--arch-scrollbar-inset` | `0.25rem` | Transparent border clipped out of the thumb, so the visible bar reads slimmer than the gutter without shrinking the hit area. |
| `--arch-scrollbar-radius` | `--arch-radius-round` | |
| `--arch-scrollbar-thumb` | `--arch-fill-4` | Resting thumb, Chromium/Safari. |
| `--arch-scrollbar-thumb-hover` | `--arch-fill-3` | Chromium/Safari only. |
| `--arch-scrollbar-thumb-active` | `--arch-fill-2` | Chromium/Safari only. |
| `--arch-scrollbar-thumb-static` | `--arch-fill-3` | Firefox's single, stateless thumb color — deliberately a step stronger than `--arch-scrollbar-thumb`, since there's no hover state to brighten it. |
| `--arch-scrollbar-track` | `transparent` | |

```html
<!-- Scrolls, but shows no scrollbar — for a region with its own affordance -->
<div class="arch-scrollbar-none">…</div>
```

**Two implementations, deliberately mutually exclusive.** Chromium and Safari
get `::-webkit-scrollbar` (transparent track, inset rounded thumb, hover and
active states); Firefox gets the standard `scrollbar-width: thin` +
`scrollbar-color`, which offers no radius or hover control but already draws a
rounded thumb at that width. They're split rather than both being declared,
because **Chromium 121+ ignores the `::-webkit-*` pseudo-elements on any
element that also sets the standard properties** — declaring both silently
downgrades Chromium to the plainer version.

The split probes `@supports not selector(::-webkit-scrollbar-thumb)`, **not
`::-webkit-scrollbar`** — Firefox parses that one for web-compat and reports
it supported, so gating on it turns off the Firefox branch *in Firefox* and
leaves platform scrollbars everywhere. Verified in Firefox 153.

Not set here, on purpose: `scrollbar-gutter: stable`. Reserving the gutter
whether or not content overflows is a per-layout decision (it prevents a
reflow when a list grows past its container, at the cost of a permanent strip
of dead space), so set it on the specific scroll containers that want it.

## Reset

`css/reset.css` normalizes box-sizing/margins, sets base typography
(`h1`–`h6`, `body`), and styles bare `<blockquote>`/`<cite>` elements
(`.align-left` modifier available). It's intentionally minimal — style
everything else yourself or add a new component file.
