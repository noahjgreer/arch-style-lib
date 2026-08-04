# arch-style-lib

A shared, no-build-step styling and behavior library — a pseudo-glass
("liquid glass") design system meant to give every project a common,
recognizable look and feel.

- **Plain CSS**, no preprocessor or bundler required — just `<link>` it.
- **Small ES modules** for behavior — import only what you use.
- Everything namespaced `arch-` so it drops cleanly into any project.

## Quick start

```html
<link rel="stylesheet" href="/css/arch.css">
<script type="module">
    import { initTheme, toggleTheme } from "/js/theme.js";
    initTheme();
</script>
```

```html
<div class="arch-glass arch-glass-panel">
    <h2>Hello, glass</h2>
    <button class="arch-btn">Click me</button>
</div>
```

Open [`index.html`](./index.html) in a browser for a full live showcase.

## Docs

- [Getting started](./docs/getting-started.md)
- [Tokens & theming](./docs/tokens-and-theming.md)
- [Components](./docs/components.md)
- [JS behaviors](./docs/behaviors.md)

## Structure

```
css/            tokens, reset, glass utility, components
js/             theme, glass, popover, switcher, drag-reorder
docs/           usage docs
index.html      live showcase / demo
```

See [CLAUDE.md](./CLAUDE.md) for conventions when extending this library.
