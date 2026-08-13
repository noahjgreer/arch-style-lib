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

`.arch-toggle-btn--sm` is the compact size, matching `.arch-btn--sm`.

## Reset

`css/reset.css` normalizes box-sizing/margins, sets base typography
(`h1`–`h6`, `body`), and styles bare `<blockquote>`/`<cite>` elements
(`.align-left` modifier available). It's intentionally minimal — style
everything else yourself or add a new component file.
