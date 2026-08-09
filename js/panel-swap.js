/**
 * arch-style-lib :: panel-swap
 * Pointer-based grid-swap dragging: pick up a panel by a handle, drag it
 * over another panel and the two trade DOM positions (FLIP-animated); drag
 * it below the last panel in an empty/undersized container and it relocates
 * there instead. Generalized from F:\Alfredo\alfredo.client's island
 * dashboard (see this repo's CLAUDE.md "Where things came from") — that
 * version hardcoded `#island-grid`/`#col-left`/`#col-right`/localStorage
 * keys; here every one of those is a parameter, and persistence is left to
 * the caller (via `onSettle`), the same division of responsibility as
 * `drag-reorder.js`'s `onReorder`.
 */

const PICKUP_MS = 150;
const PUTDOWN_MS = 150;

/**
 * Enables pointer-based swap-dragging of `root`'s panels.
 *
 * @param {HTMLElement} root
 * @param {object} [opts]
 * @param {string} [opts.itemSelector] selector (searched under `root`)
 *   identifying draggable panels; defaults to ".arch-panel"
 * @param {string|null} [opts.handleSelector] selector (relative to a panel)
 *   that starts a drag; defaults to ".arch-panel-handle". Pass `null` to
 *   make the whole panel a handle.
 * @param {string|null} [opts.containerSelector] selector (searched under
 *   `root`) identifying drop containers panels live in (e.g. columns or
 *   slots). When set, dragging below the last panel in a container (or
 *   over an empty one) relocates the panel there instead of swapping.
 *   Omit to treat `root` itself as the only container.
 * @param {(root: HTMLElement) => boolean} [opts.canDrag] extra gate, e.g.
 *   an edit-mode check; return false to ignore the pointerdown
 * @param {(item: HTMLElement) => boolean} [opts.isDropTarget] excludes a
 *   panel from hit-testing (e.g. a collapsed one you don't want swapped
 *   into) without removing it from the DOM; defaults to always-true
 * @param {(swap: { a: HTMLElement, b: HTMLElement }) => void} [opts.onSwap]
 *   called every time two panels trade positions during a drag
 * @param {(root: HTMLElement) => void} [opts.onSettle] called once on
 *   pointerup — the natural place to persist panel order
 * @returns {() => void} cleanup function that removes the listener
 */
export function makePanelSwap(root, opts = {}) {
    const {
        itemSelector = ".arch-panel",
        handleSelector = ".arch-panel-handle",
        containerSelector = null,
        canDrag = () => true,
        isDropTarget = () => true,
        onSwap = () => {},
        onSettle = () => {},
    } = opts;

    const getContainers = () =>
        containerSelector ? Array.from(root.querySelectorAll(containerSelector)) : [root];

    const liveItems = (excluding) =>
        Array.from(root.querySelectorAll(itemSelector)).filter(
            (el) => el !== excluding && isDropTarget(el),
        );

    const onPointerDown = (event) => {
        if (!canDrag(root)) return;

        const handle = handleSelector ? event.target.closest(handleSelector) : event.target;
        if (!handle || !root.contains(handle)) return;

        if (event.pointerType === "touch" && event.isPrimary && handleSelector) return;

        const panel = handle.closest(itemSelector);
        if (!panel || !root.contains(panel)) return;

        event.preventDefault();

        const rect = panel.getBoundingClientRect();

        const ghost = document.createElement("div");
        // Carries the source panel's own classes (not just its content) onto
        // the ghost, so any presentational state expressed as a class (a
        // collapsed variant, an active/disabled look, ...) still reads
        // correctly on the clone that's actually visible while dragging.
        ghost.className = `arch-panel-ghost arch-glass ${panel.className}`;
        Object.assign(ghost.style, {
            position: "fixed",
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            pointerEvents: "none",
            zIndex: "9999",
            borderRadius: getComputedStyle(panel).borderRadius,
            opacity: "0",
            transform: "scale(0.97)",
            transition: "none",
        });
        ghost.innerHTML = panel.innerHTML;
        document.body.appendChild(ghost);
        requestAnimationFrame(() => {
            ghost.style.transition = `opacity ${PICKUP_MS}ms var(--arch-ease), transform ${PICKUP_MS}ms var(--arch-ease)`;
            ghost.style.opacity = "0.85";
            ghost.style.transform = "scale(1.02)";
        });

        panel.classList.add("arch-panel-swap-source");
        root.classList.add("arch-panel-swap-active");

        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        let lastTarget = null;

        const onMove = (moveEvent) => {
            const left = moveEvent.clientX - offsetX;
            const top = moveEvent.clientY - offsetY;
            ghost.style.left = `${left}px`;
            ghost.style.top = `${top}px`;

            const cx = left + rect.width / 2;
            const cy = top + rect.height / 2;

            let hit = null;
            for (const other of liveItems(panel)) {
                const r = other.getBoundingClientRect();
                if (cx > r.left && cx < r.right && cy > r.top && cy < r.bottom) {
                    hit = other;
                    break;
                }
            }

            if (hit && hit !== lastTarget) {
                lastTarget = hit;
                swapPanelsAnimated(panel, hit, onSwap);
            } else if (!hit) {
                // Not over any panel — check whether the ghost is horizontally
                // over a container but below all of its live panels, i.e. an
                // explicit relocation rather than a swap.
                for (const container of getContainers()) {
                    const containerRect = container.getBoundingClientRect();
                    if (cx < containerRect.left || cx > containerRect.right) continue;
                    const siblings = liveItems(panel).filter((el) => container.contains(el));
                    const isAtBottom =
                        siblings.length === 0 ||
                        cy > siblings[siblings.length - 1].getBoundingClientRect().bottom;
                    if (isAtBottom && (panel.parentNode !== container || container.lastElementChild !== panel)) {
                        container.appendChild(panel);
                        lastTarget = null;
                    }
                    break;
                }
            }
        };

        const onUp = () => {
            ghost.style.transition = `opacity ${PUTDOWN_MS}ms var(--arch-ease), transform ${PUTDOWN_MS}ms var(--arch-ease)`;
            ghost.style.opacity = "0";
            ghost.style.transform = "scale(0.97)";
            setTimeout(() => ghost.remove(), PUTDOWN_MS);

            panel.classList.remove("arch-panel-swap-source");
            root.classList.remove("arch-panel-swap-active");
            lastTarget = null;

            onSettle(root);

            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    };

    root.addEventListener("pointerdown", onPointerDown);
    return () => root.removeEventListener("pointerdown", onPointerDown);
}

function swapPanelsAnimated(a, b, onSwap) {
    const bRect = b.getBoundingClientRect();

    const aParent = a.parentNode;
    const bParent = b.parentNode;
    const aNext = a.nextElementSibling;
    const bNext = b.nextElementSibling;

    if (aParent === bParent) {
        if (aNext === b) {
            aParent.insertBefore(b, a);
        } else if (bNext === a) {
            aParent.insertBefore(a, b);
        } else {
            aParent.insertBefore(b, aNext);
            aParent.insertBefore(a, bNext);
        }
    } else {
        // Cross-container: each panel moves into the other's container at
        // the other's slot.
        aParent.insertBefore(b, aNext);
        bParent.insertBefore(a, bNext);
    }

    // FLIP: animate b from its old position to its new one so the swap reads
    // as a trade rather than a teleport.
    const bNewRect = b.getBoundingClientRect();
    const dx = bRect.left - bNewRect.left;
    const dy = bRect.top - bNewRect.top;
    b.style.transition = "none";
    b.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
        b.style.transition = "transform var(--arch-duration-md) var(--arch-ease-out)";
        b.style.transform = "";
        b.addEventListener(
            "transitionend",
            () => {
                b.style.transition = "";
                b.style.transform = "";
            },
            { once: true },
        );
    });

    onSwap({ a, b });
}
