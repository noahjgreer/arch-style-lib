/**
 * arch-style-lib :: window-manager
 * Free-floating, overlappable windows inside a workspace container — drag by
 * a handle, resize from any edge/corner, snap to screen halves/quadrants
 * when dragged near a workspace edge (Windows 11-style edge/corner
 * snapping), maximize/restore, and click-to-focus z-ordering. Generalized
 * from the same family of pointer-drag code as `panel-swap.js` (FLIP-free
 * here — windows move freely rather than trading grid slots, so there's
 * nothing to animate a "swap" between), but a distinct module rather than an
 * option on `makePanelSwap` since the interaction model (absolute
 * positioning, resize, snapping, z-order) doesn't overlap with grid-swap at
 * all.
 */

const MIN_VISIBLE = 80;

/** @type {WeakMap<HTMLElement, { left: number, top: number, width: number, height: number }>} */
const preSnapRects = new WeakMap();

const EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

/**
 * Enables free-floating drag/resize/snap/maximize behavior for `workspace`'s
 * windows.
 *
 * @param {HTMLElement} workspace a `position: relative` (or `absolute`)
 *   container with an explicit size — windows are positioned/clamped
 *   against its `clientWidth`/`clientHeight`
 * @param {object} [opts]
 * @param {string} [opts.itemSelector] selector (searched under `workspace`)
 *   identifying windows; defaults to ".arch-window"
 * @param {string} [opts.handleSelector] selector (relative to a window)
 *   that starts a drag; defaults to ".arch-window-handle"
 * @param {string} [opts.maximizeSelector] selector (relative to a window)
 *   for an optional maximize/restore button; defaults to
 *   ".arch-window-maximize". Double-clicking the handle also toggles
 *   maximize regardless of whether this button exists.
 * @param {number} [opts.minWidth] minimum window width in px; default 240
 * @param {number} [opts.minHeight] minimum window height in px; default 160
 * @param {number} [opts.snapDistance] pointer distance (px) from a workspace
 *   edge/corner that triggers a snap preview while dragging; default 32
 * @param {(win: HTMLElement) => boolean} [opts.isDropTarget] excludes a
 *   window from being draggable/resizable (e.g. a closed one) without
 *   removing it from the DOM; defaults to always-true
 * @param {(win: HTMLElement) => void} [opts.onChange] called after a move,
 *   resize, snap, or maximize/restore settles — the place to persist rect +
 *   snap/maximize state
 * @param {(win: HTMLElement) => void} [opts.onFocus] called whenever a
 *   window is raised to the front (pointerdown anywhere on it) — the place
 *   to persist z-order
 * @returns {() => void} cleanup function that removes all listeners
 */
export function makeWindowManager(workspace, opts = {}) {
    const {
        itemSelector = ".arch-window",
        handleSelector = ".arch-window-handle",
        maximizeSelector = ".arch-window-maximize",
        minWidth = 240,
        minHeight = 160,
        snapDistance = 32,
        isDropTarget = () => true,
        onChange = () => {},
        onFocus = () => {},
    } = opts;

    const items = () => Array.from(workspace.querySelectorAll(itemSelector)).filter(isDropTarget);

    let topZ = items().length;
    items().forEach((win, index) => {
        if (!win.style.zIndex) win.style.zIndex = String(index + 1);
        ensureResizeHandles(win);
    });

    const preview = document.createElement("div");
    preview.className = "arch-window-snap-preview";
    workspace.appendChild(preview);

    const focus = (win) => {
        topZ += 1;
        win.style.zIndex = String(topZ);
        onFocus(win);
    };

    const onWorkspacePointerDown = (event) => {
        const win = event.target.closest(itemSelector);
        if (win && workspace.contains(win) && isDropTarget(win)) focus(win);
    };
    workspace.addEventListener("pointerdown", onWorkspacePointerDown);

    const onHandlePointerDown = (event) => {
        const handle = event.target.closest(handleSelector);
        if (!handle) return;
        const win = handle.closest(itemSelector);
        if (!win || !workspace.contains(win) || !isDropTarget(win)) return;
        if (event.target.closest(maximizeSelector)) return;

        event.preventDefault();
        focus(win);
        startDrag(win, event);
    };
    workspace.addEventListener("pointerdown", onHandlePointerDown);

    const onDoubleClick = (event) => {
        const handle = event.target.closest(handleSelector);
        if (!handle) return;
        const win = handle.closest(itemSelector);
        if (!win || !workspace.contains(win) || !isDropTarget(win)) return;
        toggleMaximize(win);
    };
    workspace.addEventListener("dblclick", onDoubleClick);

    const onMaximizeClick = (event) => {
        const button = event.target.closest(maximizeSelector);
        if (!button) return;
        const win = button.closest(itemSelector);
        if (!win || !workspace.contains(win) || !isDropTarget(win)) return;
        event.preventDefault();
        toggleMaximize(win);
    };
    workspace.addEventListener("click", onMaximizeClick);

    const onResizePointerDown = (event) => {
        const handle = event.target.closest(".arch-window-resize");
        if (!handle) return;
        const win = handle.closest(itemSelector);
        if (!win || !workspace.contains(win) || !isDropTarget(win)) return;
        if (win.dataset.maximized === "true") return;

        event.preventDefault();
        focus(win);
        startResize(win, handle.dataset.edge, event);
    };
    workspace.addEventListener("pointerdown", onResizePointerDown);

    function startDrag(win, downEvent) {
        const wasMaximized = win.dataset.maximized === "true";
        const bounds = () => workspace.getBoundingClientRect();
        let rect = wasMaximized ? restoreRectFor(win) : currentRect(win);

        if (wasMaximized) {
            // Un-maximize under the pointer: keep the same relative x offset
            // within the title bar the pointer had, so the window doesn't
            // jump away from the cursor — matches Windows 11's drag-to-
            // restore behavior.
            const maxRect = currentRect(win);
            const relativeX = maxRect.width > 0 ? (downEvent.clientX - bounds().left) / maxRect.width : 0.5;
            rect = { ...rect, left: downEvent.clientX - bounds().left - rect.width * relativeX, top: 0 };
            win.dataset.maximized = "false";
            win.classList.remove("arch-window--maximized");
            applyRect(win, clampRect(rect, bounds(), minWidth, minHeight));
            rect = currentRect(win);
        }

        const offsetX = downEvent.clientX - (bounds().left + rect.left);
        const offsetY = downEvent.clientY - (bounds().top + rect.top);
        let snapZone = null;

        const onMove = (moveEvent) => {
            const b = bounds();
            const left = moveEvent.clientX - b.left - offsetX;
            const top = moveEvent.clientY - b.top - offsetY;
            const clamped = clampRect({ ...rect, left, top }, b, minWidth, minHeight, true);
            applyRect(win, clamped);

            const px = moveEvent.clientX - b.left;
            const py = moveEvent.clientY - b.top;
            snapZone = detectSnapZone(px, py, b.width, b.height, snapDistance);
            showSnapPreview(preview, snapZone, b.width, b.height);
        };

        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            hideSnapPreview(preview);

            const b = bounds();
            if (snapZone) {
                if (!wasMaximized) preSnapRects.set(win, currentRect(win));
                const snapped = snapZoneRect(snapZone, b.width, b.height);
                win.dataset.snapZone = snapZone;
                win.dataset.maximized = snapZone === "full" ? "true" : "false";
                win.classList.toggle("arch-window--maximized", snapZone === "full");
                applyRect(win, snapped);
            } else {
                delete win.dataset.snapZone;
                win.dataset.maximized = "false";
                win.classList.remove("arch-window--maximized");
            }
            onChange(win);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    }

    function startResize(win, edge, downEvent) {
        const bounds = () => workspace.getBoundingClientRect();
        const start = currentRect(win);
        const startX = downEvent.clientX;
        const startY = downEvent.clientY;

        const onMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            const b = bounds();
            let { left, top, width, height } = start;

            if (edge.includes("e")) width = start.width + dx;
            if (edge.includes("s")) height = start.height + dy;
            if (edge.includes("w")) {
                width = start.width - dx;
                left = start.left + dx;
            }
            if (edge.includes("n")) {
                height = start.height - dy;
                top = start.top + dy;
            }

            applyRect(win, clampRect({ left, top, width, height }, b, minWidth, minHeight));
        };

        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            onChange(win);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    }

    function toggleMaximize(win) {
        const bounds = workspace.getBoundingClientRect();
        if (win.dataset.maximized === "true") {
            const restore = restoreRectFor(win);
            win.dataset.maximized = "false";
            delete win.dataset.snapZone;
            win.classList.remove("arch-window--maximized");
            applyRect(win, clampRect(restore, bounds, minWidth, minHeight));
        } else {
            preSnapRects.set(win, currentRect(win));
            win.dataset.maximized = "true";
            win.dataset.snapZone = "full";
            win.classList.add("arch-window--maximized");
            applyRect(win, snapZoneRect("full", bounds.width, bounds.height));
        }
        onChange(win);
    }

    function restoreRectFor(win) {
        return preSnapRects.get(win) ?? currentRect(win);
    }

    return () => {
        workspace.removeEventListener("pointerdown", onWorkspacePointerDown);
        workspace.removeEventListener("pointerdown", onHandlePointerDown);
        workspace.removeEventListener("pointerdown", onResizePointerDown);
        workspace.removeEventListener("dblclick", onDoubleClick);
        workspace.removeEventListener("click", onMaximizeClick);
        preview.remove();
    };
}

/**
 * Applies an explicit `{ left, top, width, height }` rect (px, relative to
 * the workspace) to `win` and clamps it into `workspace`'s current bounds.
 * The pairing helper consumers restoring a persisted layout on load should
 * use, so restored rects get the same clamping a live drag/resize would.
 *
 * @param {HTMLElement} win
 * @param {HTMLElement} workspace
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @param {{ minWidth?: number, minHeight?: number }} [opts]
 */
export function setWindowRect(win, workspace, rect, opts = {}) {
    const bounds = workspace.getBoundingClientRect();
    applyRect(win, clampRect(rect, bounds, opts.minWidth ?? 240, opts.minHeight ?? 160));
}

/**
 * Reads a window's current rect as plain numbers (px, relative to its
 * offsetParent) — the shape to persist via `onChange`.
 *
 * @param {HTMLElement} win
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function getWindowRect(win) {
    return currentRect(win);
}

function currentRect(win) {
    return {
        left: parseFloat(win.style.left) || 0,
        top: parseFloat(win.style.top) || 0,
        width: parseFloat(win.style.width) || win.offsetWidth,
        height: parseFloat(win.style.height) || win.offsetHeight,
    };
}

function applyRect(win, rect) {
    win.style.left = `${rect.left}px`;
    win.style.top = `${rect.top}px`;
    win.style.width = `${rect.width}px`;
    win.style.height = `${rect.height}px`;
}

function clampRect(rect, bounds, minWidth, minHeight, keepPositionLoose = false) {
    const width = Math.max(minWidth, Math.min(rect.width, bounds.width));
    const height = Math.max(minHeight, Math.min(rect.height, bounds.height));
    const minLeft = keepPositionLoose ? MIN_VISIBLE - width : 0;
    const maxLeft = keepPositionLoose ? bounds.width - MIN_VISIBLE : Math.max(0, bounds.width - width);
    const left = Math.min(Math.max(rect.left, minLeft), Math.max(minLeft, maxLeft));
    const maxTop = keepPositionLoose ? bounds.height - MIN_VISIBLE : Math.max(0, bounds.height - height);
    const top = Math.min(Math.max(rect.top, 0), Math.max(0, maxTop));
    return { left, top, width, height };
}

function detectSnapZone(px, py, w, h, dist) {
    const nearLeft = px < dist;
    const nearRight = px > w - dist;
    const nearTop = py < dist;
    const nearBottom = py > h - dist;
    if (nearLeft && nearTop) return "nw";
    if (nearRight && nearTop) return "ne";
    if (nearLeft && nearBottom) return "sw";
    if (nearRight && nearBottom) return "se";
    if (nearTop) return "full";
    if (nearLeft) return "left";
    if (nearRight) return "right";
    return null;
}

function snapZoneRect(zone, w, h) {
    switch (zone) {
        case "full":
            return { left: 0, top: 0, width: w, height: h };
        case "left":
            return { left: 0, top: 0, width: w / 2, height: h };
        case "right":
            return { left: w / 2, top: 0, width: w / 2, height: h };
        case "nw":
            return { left: 0, top: 0, width: w / 2, height: h / 2 };
        case "ne":
            return { left: w / 2, top: 0, width: w / 2, height: h / 2 };
        case "sw":
            return { left: 0, top: h / 2, width: w / 2, height: h / 2 };
        case "se":
            return { left: w / 2, top: h / 2, width: w / 2, height: h / 2 };
        default:
            return { left: 0, top: 0, width: w, height: h };
    }
}

function showSnapPreview(preview, zone, w, h) {
    if (!zone) {
        preview.classList.remove("arch-window-snap-preview--visible");
        return;
    }
    const rect = snapZoneRect(zone, w, h);
    Object.assign(preview.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
    });
    preview.classList.add("arch-window-snap-preview--visible");
}

function hideSnapPreview(preview) {
    preview.classList.remove("arch-window-snap-preview--visible");
}

function ensureResizeHandles(win) {
    if (win.querySelector(":scope > .arch-window-resize")) return;
    for (const edge of EDGES) {
        const handle = document.createElement("div");
        handle.className = `arch-window-resize arch-window-resize--${edge}`;
        handle.dataset.edge = edge;
        win.appendChild(handle);
    }
}
