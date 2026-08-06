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

## Reset

`css/reset.css` normalizes box-sizing/margins, sets base typography
(`h1`–`h6`, `body`), and styles bare `<blockquote>`/`<cite>` elements
(`.align-left` modifier available). It's intentionally minimal — style
everything else yourself or add a new component file.
