# Tokens & theming

All visual values live as CSS custom properties in `css/tokens.css`. Override
any of them in your own stylesheet (loaded after `arch.css`) to re-theme a
project without touching library files.

## Color

| Token | Purpose |
|---|---|
| `--arch-bg`, `--arch-bg-2`, `--arch-bg-3` | Page/surface backgrounds, lightest → most elevated |
| `--arch-fg` | Primary text/foreground |
| `--arch-label-2/3/4` | Secondary/tertiary/quaternary text opacity steps |
| `--arch-fill-2/3/4` | Fill opacity steps for non-text UI (icons, dividers) |
| `--arch-separator`, `--arch-separator-opaque` | Hairline borders |
| `--arch-accent` | Default interactive tint (buttons, focus rings, badges) — defaults to `--arch-blue` |
| `--arch-red` … `--arch-gray-6` | Full Apple-style accent/gray ramp, available to use directly or to repoint `--arch-accent` |

All color tokens flip automatically under `prefers-color-scheme: dark`. To
force a theme regardless of OS setting, set `data-theme="light"` or
`data-theme="dark"` on `<html>` — see [behaviors.md](./behaviors.md#theme)
for the JS helper that manages this and persists the choice.

## Typography

`--arch-font-family`, `--arch-font-size-xs/sm/md/lg/h2/h1`, `--arch-line-height`
(`xs` is caption size — a label subordinate to what it names, e.g. a stacked
switcher tab's own caption).

## Spacing & radius

`--arch-space-xs/sm/md/lg/xl`, `--arch-gutter` (horizontal page padding as a
percentage), `--arch-radius-sm/md/lg/round`.

## Shadow & motion

`--arch-shadow-sm/md/common`, `--arch-ease` (slight-overshoot spring, for
things with personality — a picked-up drag ghost, a popover appearing),
`--arch-ease-out` (calm, non-bouncy settle — for things reflowing around a
user action rather than being the thing the user is directly manipulating,
e.g. drag-reorder's sibling shift), `--arch-duration-fast/md/slow`.

## Glass tokens

See [components.md#glass](./components.md#glass) for the full list
(`--arch-glass-tint`, `--arch-glass-blur`, `--arch-glass-mix`,
`--arch-glass-reflex-light/dark`).

## Retheming example

```css
/* your-theme.css, loaded after arch.css */
:root {
    --arch-accent: var(--arch-purple);
    --arch-radius-lg: 2rem;
}
```
