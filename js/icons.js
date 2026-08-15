/**
 * arch-style-lib :: icons
 * Name -> inline SVG lookup for the Lucide icon set (js/icons-data.js,
 * css/icons.css). Reference icons by name in markup:
 *
 *   <span class="arch-icon" data-icon="download"></span>
 *
 * then call renderIcons() once on page load (and again after inserting new
 * icon markup dynamically) to fill in the actual SVG.
 *
 * Icons are **inline SVG, not a font** (they were an SF Symbols-derived
 * symbol font until 2026-08-15 — see docs/icons.md). The practical
 * consequence for callers: every presentation attribute lives in CSS on
 * `.arch-icon`, so stroke weight is a live custom property
 * (`--arch-icon-stroke`, default 2.5) rather than something baked into the
 * glyph outlines. An external `<use href="…#name">` sprite would have been
 * smaller still, but browsers restrict external `<use>` to same-origin
 * documents — and this library is deliberately consumed cross-origin from
 * style.muffinmode.net, so it could never have resolved.
 */

import { ICONS } from "./icons-data.js";
import { LEGACY_ICON_ALIASES } from "./icons-legacy.js";

export { ICONS };
export { LUCIDE_VERSION } from "./icons-data.js";

/** Drawn in place of an unknown name, so a typo is visible rather than blank. */
const FALLBACK_ICON = "circle-question-mark";

/** Names already warned about, so one bad icon doesn't flood the console. */
const warned = new Set();

/** Wraps an icon's inner markup in the `<svg>` element `.arch-icon` styles. */
function wrapSvg(inner) {
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
        `focusable="false" aria-hidden="true">${inner}</svg>`
    );
}

/**
 * Resolves a name to its inner SVG markup, following legacy aliases and
 * falling back to {@link FALLBACK_ICON} for an unknown name.
 * @param {string} name
 * @returns {string}
 */
function resolve(name) {
    const direct = ICONS[name];
    if (direct !== undefined) return direct;

    const alias = LEGACY_ICON_ALIASES[name];
    if (alias !== undefined) {
        if (!warned.has(name)) {
            warned.add(name);
            console.warn(
                `[arch-icons] "${name}" is a legacy SF Symbols name — use "${alias}". ` +
                    "See docs/icons.md; the alias table is temporary.",
            );
        }
        return ICONS[alias] ?? ICONS[FALLBACK_ICON];
    }

    if (!warned.has(name)) {
        warned.add(name);
        console.warn(`[arch-icons] Unknown icon name "${name}" — using fallback glyph.`);
    }
    return ICONS[FALLBACK_ICON];
}

/**
 * Returns the complete `<svg>` markup for `name` — for building HTML
 * strings, where creating an element just to read it back would be pure
 * overhead. Prefer `data-icon` + {@link renderIcons} in normal markup.
 *
 * The returned SVG carries no size, color or stroke of its own: wrap it in
 * (or place it inside) an `.arch-icon` element, which supplies all three.
 * @param {string} name
 * @returns {string}
 */
export function iconSvg(name) {
    return wrapSvg(resolve(name));
}

/**
 * Points an existing element at an icon, replacing whatever it held. Use
 * when an icon's name changes after render — it keeps the element identity,
 * so callers holding a reference to it stay valid.
 * @param {Element} el
 * @param {string} name
 */
export function setIcon(el, name) {
    el.classList.add("arch-icon");
    el.dataset.icon = name;
    el.innerHTML = iconSvg(name);
    el.dataset.iconRendered = "true";
    if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-hidden")) {
        el.setAttribute("aria-hidden", "true");
    }
}

/**
 * Merges additional `{ name: innerSvgMarkup }` pairs into the shared map —
 * use this from a consuming project to register a project-specific icon
 * instead of editing the library. The value is the *inner* markup of a
 * `0 0 24 24` SVG (e.g. `'<path d="M4 4h16"/>'`), with no stroke, fill or
 * size of its own, matching what the generated data holds.
 * @param {Record<string, string>} entries
 */
export function defineIcons(entries) {
    Object.assign(ICONS, entries);
    for (const name of Object.keys(entries)) warned.delete(name);
}

/**
 * Fills in every unrendered `[data-icon]` element under `root` with its SVG.
 * Safe to call repeatedly — already-rendered icons are skipped unless
 * `force` is set (e.g. after calling defineIcons() with overrides).
 * @param {ParentNode} [root]
 * @param {{ force?: boolean }} [opts]
 */
export function renderIcons(root = document, opts = {}) {
    const { force = false } = opts;
    root.querySelectorAll("[data-icon]").forEach((el) => {
        if (!force && el.dataset.iconRendered === "true") return;
        setIcon(el, el.dataset.icon ?? "");
    });
}

/**
 * Renders icons now, then watches `root` for added/changed `[data-icon]`
 * elements and renders those too. Returns the MutationObserver so callers
 * can `.disconnect()` it.
 * @param {Node} [root]
 * @returns {MutationObserver}
 */
export function watchIcons(root = document.body) {
    renderIcons(root);
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes" && mutation.target instanceof Element) {
                mutation.target.dataset.iconRendered = "false";
                renderIcons(mutation.target.parentNode ?? root);
            }
            mutation.addedNodes.forEach((node) => {
                if (node instanceof Element) renderIcons(node);
            });
        }
    });
    observer.observe(root, {
        childList: true,
        subtree: true,
        attributeFilter: ["data-icon"],
    });
    return observer;
}

/**
 * @deprecated Icons are SVG, not font glyphs — there is no character to
 * return. Use {@link iconSvg} for markup or {@link setIcon} for an element.
 * Kept only so a consumer that hasn't migrated logs a clear warning instead
 * of throwing; it renders nothing. Removed with `icons-legacy.js`.
 * @param {string} name
 * @returns {string}
 */
export function iconChar(name) {
    if (!warned.has(`char:${name}`)) {
        warned.add(`char:${name}`);
        console.warn(
            `[arch-icons] iconChar("${name}") is gone — icons are SVG now. ` +
                "Use iconSvg() for markup, or setIcon(el, name) for an element.",
        );
    }
    return "";
}
