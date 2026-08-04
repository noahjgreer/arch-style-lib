/**
 * arch-style-lib :: icons
 * Name -> glyph lookup for the ArchSymbols icon font (css/icons.css,
 * fonts/SF-AlfredoSymbols.ttf). Reference icons by name in markup:
 *
 *   <span class="arch-icon" data-icon="archivebox"></span>
 *
 * then call renderIcons() once on page load (and again after inserting new
 * icon markup dynamically) to fill in the actual glyph.
 *
 * PLACEHOLDER MAP: the codepoints below are NOT verified against real
 * glyphs — the font's internal glyph names (u100184, NameMe.242, ...) carry
 * no semantic meaning, so each entry here needs to be confirmed/replaced by
 * opening fonts/SF-AlfredoSymbols.sfd in FontForge, finding the glyph you
 * want, and swapping in its actual codepoint. See docs/icons.md.
 */

/** @type {Record<string, string>} icon name -> glyph character */
export const ICONS = {
    // TODO: verify — placeholder codepoint, not confirmed to be an archive-box glyph
    archivebox: "\u{100184}",
};

/** Glyph shown when a requested icon name isn't in the map. */
const FALLBACK_GLYPH = "?";

/**
 * Registers additional name -> glyph pairs (or overrides existing ones).
 * @param {Record<string, string>} entries
 */
export function defineIcons(entries) {
    Object.assign(ICONS, entries);
}

/**
 * Looks up the glyph for an icon name.
 * @param {string} name
 * @returns {string}
 */
export function iconChar(name) {
    return ICONS[name] ?? FALLBACK_GLYPH;
}

/**
 * Fills in every unrendered `[data-icon]` element under `root` with its
 * glyph. Safe to call repeatedly — already-rendered icons are skipped
 * unless `force` is set (e.g. after calling defineIcons() with overrides).
 * @param {ParentNode} [root]
 * @param {{ force?: boolean }} [opts]
 */
export function renderIcons(root = document, opts = {}) {
    const { force = false } = opts;
    root.querySelectorAll("[data-icon]").forEach((el) => {
        if (!force && el.dataset.iconRendered === "true") return;

        const name = el.dataset.icon;
        el.textContent = iconChar(name);
        el.classList.add("arch-icon");
        el.dataset.iconRendered = "true";

        if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-hidden")) {
            el.setAttribute("aria-hidden", "true");
        }

        if (name && !(name in ICONS)) {
            console.warn(`[arch-icons] Unknown icon name "${name}" — using fallback glyph.`);
        }
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
