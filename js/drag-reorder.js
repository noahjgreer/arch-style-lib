/**
 * arch-style-lib :: drag-reorder
 * Pointer-based vertical list reordering with a floating ghost clone.
 * Framework-agnostic: works on any container of direct-child elements.
 */

const PICKUP_MS = 160;
const PUTDOWN_MS = 140;

/**
 * Enables drag-to-reorder on `container`'s direct children, triggered by
 * pointerdown on any element matching `handleSelector` inside a child.
 *
 * @param {HTMLElement} container
 * @param {object} [opts]
 * @param {string} [opts.handleSelector]  selector (relative to a child) that
 *   starts a drag; defaults to the child itself (whole row is a handle)
 * @param {string} [opts.itemSelector]    selector identifying reorderable
 *   direct children; defaults to ":scope > *"
 * @param {(el: HTMLElement) => boolean} [opts.canDrag]  extra gate, e.g. an
 *   "edit mode" check; return false to ignore the pointerdown
 * @param {number} [opts.threshold]  px the pointer must travel before the
 *   drag begins at all; default 0 (begin on pointerdown). Set this whenever
 *   the row *itself* is the handle and also does something on click — the
 *   press is then ambiguous until it moves, and starting a drag immediately
 *   flashes the ghost on every ordinary click. A drag that does begin
 *   swallows the `click` that follows it, so the row's own action doesn't
 *   fire as a side effect of having been dropped on itself.
 * @param {(order: { fromIndex: number, toIndex: number, item: HTMLElement }) => void} [opts.onReorder]
 *   called after the DOM has been reordered
 * @returns {() => void} cleanup function that removes the listener
 */
export function makeDragReorder(container, opts = {}) {
    const {
        handleSelector = null,
        itemSelector = ":scope > *",
        canDrag = () => true,
        threshold = 0,
        onReorder = () => {},
    } = opts;

    const onPointerDown = (event) => {
        if (!canDrag(container)) return;

        const handle = handleSelector ? event.target.closest(handleSelector) : event.target;
        if (!handle || !container.contains(handle)) return;

        // On touch, let the first finger scroll; a handle-driven second
        // touch (or a non-touch pointer) starts the drag.
        if (event.pointerType === "touch" && event.isPrimary && handleSelector) return;

        const draggedEl = handle.closest(itemSelector);
        if (!draggedEl || draggedEl.parentElement !== container) return;

        if (threshold <= 0) {
            beginDrag(draggedEl, event);
            return;
        }

        // Nothing is committed to yet — no ghost, no preventDefault — so a
        // press that turns out to be a plain click behaves exactly as if this
        // module weren't here at all.
        const startX = event.clientX;
        const startY = event.clientY;
        const onPreMove = (moveEvent) => {
            if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < threshold) return;
            stopWaiting();
            beginDrag(draggedEl, moveEvent);
        };
        const stopWaiting = () => {
            document.removeEventListener("pointermove", onPreMove);
            document.removeEventListener("pointerup", stopWaiting);
            document.removeEventListener("pointercancel", stopWaiting);
        };
        document.addEventListener("pointermove", onPreMove);
        document.addEventListener("pointerup", stopWaiting);
        document.addEventListener("pointercancel", stopWaiting);
    };

    /**
     * Swallows the `click` the browser fires after the pointer is released,
     * once. Only relevant when the row itself is the handle: without it,
     * picking a row up and putting it down activates it.
     */
    const suppressNextClick = () => {
        const swallow = (clickEvent) => {
            clickEvent.stopPropagation();
            clickEvent.preventDefault();
        };
        document.addEventListener("click", swallow, { capture: true, once: true });
        // The click lands before this task does; the timeout is only so a
        // release that produces no click at all (dropped outside the window)
        // doesn't leave the listener armed for the user's next, unrelated one.
        setTimeout(() => document.removeEventListener("click", swallow, { capture: true }), 0);
    };

    function beginDrag(draggedEl, event) {
        event.preventDefault();

        const items = Array.from(container.querySelectorAll(itemSelector));
        const rects = items.map((el) => el.getBoundingClientRect());
        const draggedIndex = items.indexOf(draggedEl);
        if (draggedIndex === -1) return;

        const draggedRect = rects[draggedIndex];
        let insertIndex = draggedIndex;

        const ghost = document.createElement("div");
        ghost.className = "arch-drag-ghost arch-glass";
        const clone = draggedEl.cloneNode(true);
        clone.removeAttribute("id");
        ghost.appendChild(clone);
        Object.assign(ghost.style, {
            position: "fixed",
            top: `${draggedRect.top}px`,
            left: `${draggedRect.left}px`,
            width: `${draggedRect.width}px`,
            borderRadius: "var(--arch-radius-md)",
            pointerEvents: "none",
            zIndex: "9999",
            opacity: "0",
            transform: "scale(0.96)",
            transition: "none",
            margin: "0",
        });
        document.body.appendChild(ghost);
        draggedEl.style.opacity = "0";
        // A whole-row drag sweeps across the rows' own text; without this the
        // browser selects it as the pointer moves. Restored on release.
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = "none";

        // `--arch-ease` is a slight-overshoot spring (see tokens.css) — this is
        // what gives the pickup its "pop" rather than a flat linear/ease-in-out
        // scale-up, matching the feel this was originally generalized from
        // (F:\Alfredo\alfredo.client, see this repo's CLAUDE.md).
        requestAnimationFrame(() => {
            ghost.style.transition = `opacity ${PICKUP_MS}ms var(--arch-ease), transform ${PICKUP_MS}ms var(--arch-ease)`;
            ghost.style.opacity = "1";
            ghost.style.transform = "scale(1.02)";
        });

        const startY = event.clientY;

        const onMove = (moveEvent) => {
            const dy = moveEvent.clientY - startY;
            ghost.style.top = `${draggedRect.top + dy}px`;

            const midY = draggedRect.top + dy + draggedRect.height / 2;
            let newInsert = draggedIndex;
            for (let i = 0; i < rects.length; i++) {
                if (i === draggedIndex) continue;
                const mid = rects[i].top + rects[i].height / 2;
                if (i < draggedIndex && midY < mid) {
                    newInsert = i;
                    break;
                }
                if (i > draggedIndex && midY > mid) newInsert = i;
            }
            insertIndex = newInsert;

            items.forEach((el, i) => {
                if (i === draggedIndex) return;
                let shift = 0;
                if (draggedIndex < insertIndex && i > draggedIndex && i <= insertIndex) {
                    shift = -draggedRect.height;
                } else if (draggedIndex > insertIndex && i >= insertIndex && i < draggedIndex) {
                    shift = draggedRect.height;
                }
                el.style.transform = shift ? `translateY(${shift}px)` : "";
                // Deliberately not `--arch-ease` here — a bounce reads fine on
                // the single ghost the user is actively dragging, but on a
                // whole column of reflowing siblings it looks jittery, so
                // these settle with a calmer, non-overshooting ease-out.
                el.style.transition = `transform var(--arch-duration-md) var(--arch-ease-out)`;
            });
        };

        const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onUp);

            document.body.style.userSelect = previousUserSelect;
            suppressNextClick();

            ghost.style.transition = `opacity ${PUTDOWN_MS}ms var(--arch-ease), transform ${PUTDOWN_MS}ms var(--arch-ease)`;
            ghost.style.opacity = "0";
            ghost.style.transform = "scale(0.96)";
            setTimeout(() => ghost.remove(), PUTDOWN_MS);

            items.forEach((el) => {
                el.style.transform = "";
                el.style.transition = "";
            });
            draggedEl.style.opacity = "";

            if (insertIndex !== draggedIndex) {
                if (insertIndex > draggedIndex) {
                    container.insertBefore(draggedEl, items[insertIndex].nextSibling);
                } else {
                    container.insertBefore(draggedEl, items[insertIndex]);
                }
                onReorder({ fromIndex: draggedIndex, toIndex: insertIndex, item: draggedEl });
            }
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onUp);
    }

    container.addEventListener("pointerdown", onPointerDown);
    return () => container.removeEventListener("pointerdown", onPointerDown);
}
