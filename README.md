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
- [Icons](./docs/icons.md)
- [JS behaviors](./docs/behaviors.md)

## Structure

```
css/            tokens, reset, glass utility, icons, components
js/             theme, glass, icons, popover, switcher, drag-reorder
fonts/          bundled icon font (+ FontForge source, build tools)
docs/           usage docs
index.html      live showcase / demo
```

See [CLAUDE.md](./CLAUDE.md) for conventions when extending this library.

## Utilizing the Library
If you want to use the library in your project, it is recommended that you link the stylesheets directly the github repository. You can do this by adding the following lines to your HTML file:

```html
<link rel="stylesheet" href="https://raw.githubusercontent.com/noahjgreer/arch-style-lib/main/css/arch.css">
<script type="module" src="https://raw.githubusercontent.com/noahjgreer/arch-style-lib/main/js/index.js"></script>
```