/**
 * arch-style-lib :: popover
 * Anchor-relative positioning for .arch-popover panels: clamps horizontally
 * to the viewport and flips above the anchor when there's no room below.
 */

/**
 * Positions `popover` (position: fixed) relative to `anchor`, clamping to
 * the viewport and flipping above the anchor if it would overflow below.
 * @param {HTMLElement} popover
 * @param {HTMLElement} anchor
 * @param {{ gap?: number, edgePadding?: number, reserveBottom?: number,
 *   align?: "center"|"start"|"end" }} [opts]
 *   reserveBottom: extra space to avoid at the bottom of the viewport, e.g.
 *   for a fixed tab bar or toolbar sitting below the popover's anchor area.
 *   align: which of the popover's edges lines up with the anchor's — "center"
 *   (default) for a notched popover hanging under a button, "start"/"end" for
 *   a menu, whose left (or right) edge is expected to sit flush with its
 *   trigger's rather than straddling it.
 */
export function positionPopover(popover, anchor, opts = {}) {
    const { gap = 10, edgePadding = 8, reserveBottom = 0, align = "center" } = opts;

    const anchorRect = anchor.getBoundingClientRect();
    const width = popover.offsetWidth || 140;
    const height = popover.offsetHeight || 180;

    const idealLeft =
        align === "start"
            ? anchorRect.left
            : align === "end"
              ? anchorRect.right - width
              : anchorRect.left + anchorRect.width / 2 - width / 2;
    const clampedLeft = Math.max(
        edgePadding,
        Math.min(idealLeft, window.innerWidth - width - edgePadding)
    );
    popover.style.left = `${clampedLeft}px`;

    const spaceBelow = window.innerHeight - reserveBottom - anchorRect.bottom - gap;
    if (spaceBelow < height && anchorRect.top > height + gap) {
        popover.style.top = `${anchorRect.top - height - gap}px`;
    } else {
        popover.style.top = `${anchorRect.bottom + gap}px`;
    }

    popover.style.setProperty(
        "--notch-left",
        `${anchorRect.left + anchorRect.width / 2 - clampedLeft}px`
    );
}

/**
 * Opens a popover: positions it against `anchor`, then adds the open class.
 * @param {HTMLElement} popover
 * @param {HTMLElement} anchor
 * @param {Parameters<typeof positionPopover>[2]} [opts]
 */
export function openPopover(popover, anchor, opts) {
    positionPopover(popover, anchor, opts);
    popover.classList.add("arch-popover--open");
}

/** Closes a popover opened with openPopover(). @param {HTMLElement} popover */
export function closePopover(popover) {
    popover.classList.remove("arch-popover--open");
}

/**
 * Wires up "click outside to close" for an open popover. Call once per
 * popover instance; returns a cleanup function.
 * @param {HTMLElement} popover
 * @param {HTMLElement} anchor
 * @param {() => void} onClose
 */
export function bindDismiss(popover, anchor, onClose) {
    const handler = (event) => {
        if (!popover.contains(event.target) && !anchor.contains(event.target)) {
            onClose();
        }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
}
