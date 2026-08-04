# Getting started

`arch-style-lib` has no build step. Copy (or git-submodule / npm-link) the
`css/` and `js/` folders into your project and reference them directly.

## 1. Add the stylesheet

```html
<link rel="stylesheet" href="/css/arch.css">
```

`arch.css` `@import`s the rest of the library in the right order (tokens →
reset → glass → components). If you only need part of the library, link the
individual files instead — just make sure `tokens.css` loads first, since
everything else reads its custom properties:

```html
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/glass.css">
<link rel="stylesheet" href="/css/components/button.css">
```

## 2. Add behaviors you need

Each behavior lives in its own ES module under `js/`. Import only what you
use:

```html
<script type="module">
    import { initTheme, toggleTheme } from "/js/theme.js";
    import { openPopover, closePopover } from "/js/popover.js";

    initTheme();
    document.querySelector("#theme-toggle").addEventListener("click", toggleTheme);
</script>
```

Or pull in everything at once via the barrel file:

```js
import * as arch from "/js/index.js";
```

## 3. Try it live

Open `index.html` in a browser (no server or build required) for a working
showcase of every component and behavior — copy markup straight from it.

## Browser support

The glass effect relies on `backdrop-filter` and `color-mix()`; the reset and
components use native CSS nesting. This targets current evergreen browsers
(Safari 16.4+, Chrome/Edge 111+, Firefox 128+). There's no fallback for older
browsers — if you need one, drop `color-mix()` usages in `glass.css` for
plain rgba colors.

## Next

- [Tokens & theming](./tokens-and-theming.md)
- [Components](./components.md)
- [JS behaviors](./behaviors.md)
