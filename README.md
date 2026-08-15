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
tools/          icon-data generator (see docs/icons.md)
docs/           usage docs
index.html      live showcase / demo
```

See [CLAUDE.md](./CLAUDE.md) for conventions when extending this library.

## Utilizing the Library
If you want to use the library in your project, link the stylesheets and scripts from
`style.muffinmode.net` rather than GitHub — it's kept in sync with `main` automatically and is
meant for direct linking, unlike `raw.githubusercontent.com`. Add the following to your HTML file:

```html
<link rel="stylesheet" href="https://style.muffinmode.net/css/arch.css">
<script type="module" src="https://style.muffinmode.net/js/index.js"></script>
```