/**
 * arch-style-lib :: area-layout
 * Blender-style tiling window layout: the workspace is always fully covered
 * by non-overlapping, axis-aligned rectangular "areas" — no floating, no
 * gaps, no overlap. Drag a corner action-zone within an area to split it in
 * two (drag mostly horizontally for a left/right split, mostly vertically
 * for a top/bottom split, live-previewed as you drag); drag a corner zone
 * across into a neighboring area to join the two back into one, removing
 * whichever area you dragged into. Drag any shared border to resize —
 * every area border collinear with (and touching) the one you grabbed moves
 * together, so a border that's shared by more than two areas (a 3-way
 * junction) resizes as one run rather than leaving a gap or overlap behind.
 *
 * Modeled after Blender's own screen-area system (verts shared by reference
 * between areas, so moving a vert moves every area that touches it) but
 * simplified: Blender stores an explicit vert/edge graph and repairs it
 * after every split/join (`BKE_screen_remove_double_scredges` and friends).
 * Here there's no edge list at all — connectivity for the resize "ripple"
 * is derived directly from which areas' rects touch a given coordinate
 * (see `findAffectedVerts`), which is simpler to keep correct and doesn't
 * need any post-op graph repair, at the cost of only handling the simple
 * "shares one full border exactly" case for joins (see `canJoin`) rather
 * than Blender's fuzzy tolerance-based join/straighten.
 */

const EPS = 0.0005;

function approxEq(a, b) {
    return Math.abs(a - b) < EPS;
}

let uid = 1;
function makeId(prefix) {
    return `${prefix}${uid++}`;
}

function findOrCreateVert(state, x, y) {
    for (const v of state.verts.values()) {
        if (approxEq(v.x, x) && approxEq(v.y, y)) return v;
    }
    const v = { id: makeId("v"), x, y };
    state.verts.set(v.id, v);
    return v;
}

/** `{ left, top, right, bottom }` in fractional [0,1] workspace coordinates. */
function areaRect(state, area) {
    const v1 = state.verts.get(area.v1); // top-left
    const v3 = state.verts.get(area.v3); // bottom-right
    return { left: v1.x, top: v1.y, right: v3.x, bottom: v3.y };
}

function areaAt(state, x, y) {
    for (const area of state.areas.values()) {
        const r = areaRect(state, area);
        if (x >= r.left - EPS && x <= r.right + EPS && y >= r.top - EPS && y <= r.bottom + EPS) return area;
    }
    return null;
}

/**
 * Splits `area` into two along `axis` ("v" = vertical dividing line, left/
 * right children; "h" = horizontal dividing line, top/bottom children) at
 * `fraction` (0..1) of the area's own extent along that axis. Mutates
 * `area` in place into one child (so its id/contentId identity carries
 * over) and returns the newly-created other child.
 */
function splitArea(state, area, axis, fraction) {
    const rect = areaRect(state, area);
    const v1 = state.verts.get(area.v1);
    const v2 = state.verts.get(area.v2);
    const v3 = state.verts.get(area.v3);
    const v4 = state.verts.get(area.v4);

    if (axis === "v") {
        const x = rect.left + (rect.right - rect.left) * fraction;
        const top = findOrCreateVert(state, x, rect.top);
        const bottom = findOrCreateVert(state, x, rect.bottom);
        area.v2 = top.id;
        area.v3 = bottom.id;
        const right = { id: makeId("a"), v1: top.id, v2: v2.id, v3: v3.id, v4: bottom.id, contentId: null };
        state.areas.set(right.id, right);
        return right;
    }

    const y = rect.top + (rect.bottom - rect.top) * fraction;
    const left = findOrCreateVert(state, rect.left, y);
    const right = findOrCreateVert(state, rect.right, y);
    area.v3 = right.id;
    area.v4 = left.id;
    const bottom = { id: makeId("a"), v1: left.id, v2: right.id, v3: v3.id, v4: v4.id, contentId: null };
    state.areas.set(bottom.id, bottom);
    return bottom;
}

/**
 * Whether `a` and `b` share one full border exactly (same simple case
 * Blender calls `area_getorientation` for) — returns which side `b` is on
 * relative to `a`, or `null` if they're not cleanly joinable.
 */
function canJoin(state, a, b) {
    const ra = areaRect(state, a);
    const rb = areaRect(state, b);
    if (approxEq(ra.right, rb.left) && approxEq(ra.top, rb.top) && approxEq(ra.bottom, rb.bottom)) return "right";
    if (approxEq(ra.left, rb.right) && approxEq(ra.top, rb.top) && approxEq(ra.bottom, rb.bottom)) return "left";
    if (approxEq(ra.bottom, rb.top) && approxEq(ra.left, rb.left) && approxEq(ra.right, rb.right)) return "bottom";
    if (approxEq(ra.top, rb.bottom) && approxEq(ra.left, rb.left) && approxEq(ra.right, rb.right)) return "top";
    return null;
}

/** Merges `remove` into `keep` (which must `canJoin`) and deletes `remove`. `keep`'s rect becomes the union. */
function joinAreas(state, keep, remove) {
    const side = canJoin(state, keep, remove);
    if (!side) return false;
    if (side === "right") {
        keep.v2 = remove.v2;
        keep.v3 = remove.v3;
    } else if (side === "left") {
        keep.v1 = remove.v1;
        keep.v4 = remove.v4;
    } else if (side === "bottom") {
        keep.v4 = remove.v4;
        keep.v3 = remove.v3;
    } else {
        keep.v1 = remove.v1;
        keep.v2 = remove.v2;
    }
    state.areas.delete(remove.id);
    pruneUnusedVerts(state);
    return true;
}

function pruneUnusedVerts(state) {
    const used = new Set();
    for (const area of state.areas.values()) {
        used.add(area.v1);
        used.add(area.v2);
        used.add(area.v3);
        used.add(area.v4);
    }
    for (const id of Array.from(state.verts.keys())) {
        if (!used.has(id)) state.verts.delete(id);
    }
}

/**
 * Flood-fills outward from `seedVerts` (the two endpoints of the border the
 * user grabbed) to every vert connected to them by a straight run of area
 * borders exactly on `coord` along `axis` — the set of verts a resize drag
 * should move together. See the module doc comment for why this walks area
 * borders rather than an explicit edge list.
 */
function findAffectedVerts(state, axis, coord, seedVerts) {
    const affected = new Set(seedVerts.map((v) => v.id));
    let changed = true;
    while (changed) {
        changed = false;
        for (const area of state.areas.values()) {
            const r = areaRect(state, area);
            const onLine = axis === "x" ? approxEq(r.left, coord) || approxEq(r.right, coord) : approxEq(r.top, coord) || approxEq(r.bottom, coord);
            if (!onLine) continue;
            const [vA, vB] =
                axis === "x"
                    ? approxEq(r.left, coord)
                        ? [area.v1, area.v4]
                        : [area.v2, area.v3]
                    : approxEq(r.top, coord)
                      ? [area.v1, area.v2]
                      : [area.v4, area.v3];
            const hasA = affected.has(vA);
            const hasB = affected.has(vB);
            if (hasA !== hasB) {
                affected.add(vA);
                affected.add(vB);
                changed = true;
            }
        }
    }
    return affected;
}

/** The [min, max] coordinate `affected` verts can move to without shrinking any touching area below `minSize` (fractional). */
function resizeBounds(state, axis, affected, minSize) {
    let min = 0;
    let max = 1;
    for (const area of state.areas.values()) {
        const r = areaRect(state, area);
        if (axis === "x") {
            const movesLeftEdge = affected.has(area.v1) && affected.has(area.v4);
            const movesRightEdge = affected.has(area.v2) && affected.has(area.v3);
            if (movesLeftEdge && !movesRightEdge) max = Math.min(max, r.right - minSize);
            if (movesRightEdge && !movesLeftEdge) min = Math.max(min, r.left + minSize);
        } else {
            const movesTopEdge = affected.has(area.v1) && affected.has(area.v2);
            const movesBottomEdge = affected.has(area.v4) && affected.has(area.v3);
            if (movesTopEdge && !movesBottomEdge) max = Math.min(max, r.bottom - minSize);
            if (movesBottomEdge && !movesTopEdge) min = Math.max(min, r.top + minSize);
        }
    }
    return [min, max];
}

/** A border near `(x, y)` within `tol` (fractional), or `null`. Skips the outer workspace edge — that's not draggable. */
function findBorderAt(state, x, y, tol) {
    for (const area of state.areas.values()) {
        const r = areaRect(state, area);
        if (r.left > EPS && Math.abs(x - r.left) < tol && y > r.top + EPS && y < r.bottom - EPS) {
            return { axis: "x", coord: r.left, seedVerts: [state.verts.get(area.v1), state.verts.get(area.v4)] };
        }
        if (r.right < 1 - EPS && Math.abs(x - r.right) < tol && y > r.top + EPS && y < r.bottom - EPS) {
            return { axis: "x", coord: r.right, seedVerts: [state.verts.get(area.v2), state.verts.get(area.v3)] };
        }
        if (r.top > EPS && Math.abs(y - r.top) < tol && x > r.left + EPS && x < r.right - EPS) {
            return { axis: "y", coord: r.top, seedVerts: [state.verts.get(area.v1), state.verts.get(area.v2)] };
        }
        if (r.bottom < 1 - EPS && Math.abs(y - r.bottom) < tol && x > r.left + EPS && x < r.right - EPS) {
            return { axis: "y", coord: r.bottom, seedVerts: [state.verts.get(area.v4), state.verts.get(area.v3)] };
        }
    }
    return null;
}

function defaultLayout(defaultContentId) {
    const state = { verts: new Map(), areas: new Map() };
    const v1 = findOrCreateVert(state, 0, 0);
    const v2 = findOrCreateVert(state, 1, 0);
    const v3 = findOrCreateVert(state, 1, 1);
    const v4 = findOrCreateVert(state, 0, 1);
    const area = { id: makeId("a"), v1: v1.id, v2: v2.id, v3: v3.id, v4: v4.id, contentId: defaultContentId ?? null };
    state.areas.set(area.id, area);
    return state;
}

function serialize(state) {
    return {
        verts: Array.from(state.verts.values()),
        areas: Array.from(state.areas.values()),
    };
}

function deserialize(layout) {
    return {
        verts: new Map(layout.verts.map((v) => [v.id, { ...v }])),
        areas: new Map(layout.areas.map((a) => [a.id, { ...a }])),
    };
}

/**
 * Creates a tiling area layout inside `workspace`.
 *
 * @param {HTMLElement} workspace a `position: relative` container with an
 *   explicit size
 * @param {object} opts
 * @param {{ id: string, label: string }[]} opts.contentTypes every content
 *   type an area can be assigned to show; each can be assigned to at most
 *   one area at a time (offered in a `<select>` in each area's header)
 * @param {string} [opts.defaultContentId] content id the very first area
 *   shows when `initialLayout` isn't given
 * @param {object} [opts.initialLayout] a previously-`getLayout()`'d layout
 *   to restore
 * @param {number} [opts.minWidth] minimum area width in px; default 200
 * @param {number} [opts.minHeight] minimum area height in px; default 120
 * @param {number} [opts.borderHitPx] how close (px) the pointer must be to
 *   a border to grab it for resizing; default 6
 * @param {(contentId: string, body: HTMLElement) => void} [opts.onMount]
 *   called when an area starts showing `contentId` — move that content's
 *   DOM into `body`
 * @param {(contentId: string, body: HTMLElement) => void} [opts.onUnmount]
 *   called just before an area stops showing `contentId` (reassigned, or
 *   the area itself was joined away) — move the content's DOM back out of
 *   `body` so it isn't destroyed
 * @param {(layout: object) => void} [opts.onChange] called after any
 *   split/join/resize settles, and after a content reassignment — the
 *   place to persist `getLayout()`'s return value
 * @returns {{ destroy(): void, getLayout(): object }}
 */
export function makeAreaLayout(workspace, opts) {
    const { contentTypes, minWidth = 200, minHeight = 120, borderHitPx = 6, onMount = () => {}, onUnmount = () => {}, onChange = () => {} } = opts;

    let state = opts.initialLayout ? deserialize(opts.initialLayout) : defaultLayout(opts.defaultContentId);

    const elements = new Map(); // area id -> { root, select, body, contentId }

    const splitPreview = document.createElement("div");
    splitPreview.className = "arch-area-preview arch-area-preview--split";
    const joinPreview = document.createElement("div");
    joinPreview.className = "arch-area-preview arch-area-preview--join";
    workspace.appendChild(splitPreview);
    workspace.appendChild(joinPreview);

    function bounds() {
        return workspace.getBoundingClientRect();
    }

    function toFraction(clientX, clientY) {
        const b = bounds();
        return { x: (clientX - b.left) / b.width, y: (clientY - b.top) / b.height };
    }

    function usedContentIds(excludingAreaId) {
        const used = new Set();
        for (const area of state.areas.values()) {
            if (area.id !== excludingAreaId && area.contentId) used.add(area.contentId);
        }
        return used;
    }

    function pickUnusedContentType() {
        const used = usedContentIds(null);
        return contentTypes.find((t) => !used.has(t.id))?.id ?? null;
    }

    function createAreaElement(area) {
        const root = document.createElement("div");
        root.className = "arch-area arch-glass";

        const header = document.createElement("div");
        header.className = "arch-area__header";
        const select = document.createElement("select");
        select.className = "arch-area__type arch-glass";
        header.appendChild(select);
        root.appendChild(header);

        const body = document.createElement("div");
        body.className = "arch-area__body";
        root.appendChild(body);

        for (const corner of ["tl", "tr", "br", "bl"]) {
            const zone = document.createElement("div");
            zone.className = `arch-area__corner arch-area__corner--${corner}`;
            zone.dataset.corner = corner;
            zone.addEventListener("pointerdown", (event) => {
                event.preventDefault();
                event.stopPropagation();
                startCornerGesture(area.id, corner, event);
            });
            root.appendChild(zone);
        }

        select.addEventListener("change", () => {
            // Mutate the shared `area` object directly (this closure's copy
            // is the same object `state.areas` holds) — `render()` diffs
            // `record.contentId` against it and handles the mount/unmount
            // itself, the same path a split/join settling takes.
            area.contentId = select.value || null;
            render();
            onChange(serialize(state));
        });

        workspace.appendChild(root);
        return { root, select, body, contentId: undefined };
    }

    function positionAreaElement(record, area) {
        const r = areaRect(state, area);
        const b = bounds();
        Object.assign(record.root.style, {
            left: `${r.left * b.width}px`,
            top: `${r.top * b.height}px`,
            width: `${(r.right - r.left) * b.width}px`,
            height: `${(r.bottom - r.top) * b.height}px`,
        });
    }

    function syncOptions() {
        for (const [id, record] of elements) {
            const area = state.areas.get(id);
            if (!area) continue;
            const used = usedContentIds(area.id);
            const available = contentTypes.filter((t) => !used.has(t.id) || t.id === area.contentId);
            record.select.replaceChildren(
                new Option("—", ""),
                ...available.map((t) => new Option(t.label, t.id)),
            );
            record.select.value = area.contentId ?? "";
        }
    }

    function render() {
        const seen = new Set();
        for (const area of state.areas.values()) {
            seen.add(area.id);
            let record = elements.get(area.id);
            if (!record) {
                record = createAreaElement(area);
                elements.set(area.id, record);
            }
            positionAreaElement(record, area);
            if (record.contentId !== area.contentId) {
                if (record.contentId) onUnmount(record.contentId, record.body);
                if (area.contentId) onMount(area.contentId, record.body);
                record.contentId = area.contentId;
            }
        }
        for (const [id, record] of Array.from(elements)) {
            if (!seen.has(id)) {
                if (record.contentId) onUnmount(record.contentId, record.body);
                record.root.remove();
                elements.delete(id);
            }
        }
        syncOptions();
    }

    // --- Corner gesture: split within the origin area, or join if the
    // pointer crosses into a neighboring area. ---
    function startCornerGesture(originAreaId, corner, downEvent) {
        const originStart = toFraction(downEvent.clientX, downEvent.clientY);
        let mode = null; // "split" | "join" | null
        let splitAxis = null;
        let splitFraction = null;
        let joinTarget = null;

        const cornerPoint = (area) => {
            const r = areaRect(state, area);
            return {
                tl: { x: r.left, y: r.top },
                tr: { x: r.right, y: r.top },
                br: { x: r.right, y: r.bottom },
                bl: { x: r.left, y: r.bottom },
            }[corner];
        };

        const onMove = (event) => {
            const originArea = state.areas.get(originAreaId);
            if (!originArea) return;
            const pos = toFraction(event.clientX, event.clientY);
            const hit = areaAt(state, pos.x, pos.y);
            const b = bounds();

            if (!hit || hit.id === originAreaId) {
                mode = "split";
                joinPreview.classList.remove("arch-area-preview--visible");
                const origin = cornerPoint(originArea);
                const pxDx = (pos.x - origin.x) * b.width;
                const pxDy = (pos.y - origin.y) * b.height;
                splitAxis = Math.abs(pxDx) > Math.abs(pxDy) ? "v" : "h";
                const r = areaRect(state, originArea);
                const minFracW = minWidth / (b.width * (r.right - r.left));
                const minFracH = minHeight / (b.height * (r.bottom - r.top));
                if (splitAxis === "v") {
                    const raw = (pos.x - r.left) / (r.right - r.left);
                    splitFraction = Math.min(1 - minFracW, Math.max(minFracW, raw));
                } else {
                    const raw = (pos.y - r.top) / (r.bottom - r.top);
                    splitFraction = Math.min(1 - minFracH, Math.max(minFracH, raw));
                }
                showSplitPreview(r, splitAxis, splitFraction, b);
            } else {
                mode = "join";
                splitPreview.classList.remove("arch-area-preview--visible");
                joinTarget = canJoin(state, originArea, hit) ? hit : null;
                if (joinTarget) {
                    const r = areaRect(state, joinTarget);
                    Object.assign(joinPreview.style, {
                        left: `${r.left * b.width}px`,
                        top: `${r.top * b.height}px`,
                        width: `${(r.right - r.left) * b.width}px`,
                        height: `${(r.bottom - r.top) * b.height}px`,
                    });
                    joinPreview.classList.add("arch-area-preview--visible");
                } else {
                    joinPreview.classList.remove("arch-area-preview--visible");
                }
            }
        };

        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onCancel);
            splitPreview.classList.remove("arch-area-preview--visible");
            joinPreview.classList.remove("arch-area-preview--visible");

            const originArea = state.areas.get(originAreaId);
            if (!originArea) return;
            if (mode === "split" && splitAxis != null) {
                const newArea = splitArea(state, originArea, splitAxis, splitFraction);
                newArea.contentId = pickUnusedContentType();
                render();
                onChange(serialize(state));
            } else if (mode === "join" && joinTarget) {
                // `render()`'s own diff (below) already calls `onUnmount` for
                // any area id that disappears between renders, which is
                // exactly what `joinAreas` does to `joinTarget` — no need to
                // unmount it here too.
                joinAreas(state, originArea, joinTarget);
                render();
                onChange(serialize(state));
            }
        };

        const onCancel = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onCancel);
            splitPreview.classList.remove("arch-area-preview--visible");
            joinPreview.classList.remove("arch-area-preview--visible");
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onCancel);
        onMove(downEvent);
    }

    function showSplitPreview(rect, axis, fraction, b) {
        if (axis === "v") {
            const x = (rect.left + (rect.right - rect.left) * fraction) * b.width;
            Object.assign(splitPreview.style, {
                left: `${x - 1}px`,
                top: `${rect.top * b.height}px`,
                width: "2px",
                height: `${(rect.bottom - rect.top) * b.height}px`,
            });
        } else {
            const y = (rect.top + (rect.bottom - rect.top) * fraction) * b.height;
            Object.assign(splitPreview.style, {
                left: `${rect.left * b.width}px`,
                top: `${y - 1}px`,
                width: `${(rect.right - rect.left) * b.width}px`,
                height: "2px",
            });
        }
        splitPreview.classList.add("arch-area-preview--visible");
    }

    // --- Border resize drag ---
    function onWorkspacePointerMove(event) {
        if (resizing) return;
        const pos = toFraction(event.clientX, event.clientY);
        const b = bounds();
        const tolX = borderHitPx / b.width;
        const tolY = borderHitPx / b.height;
        const hit = findBorderAt(state, pos.x, pos.y, Math.max(tolX, tolY));
        workspace.style.cursor = hit ? (hit.axis === "x" ? "col-resize" : "row-resize") : "";
    }

    let resizing = false;
    function onWorkspacePointerDown(event) {
        // Corner zones handle their own gesture and stopPropagation before
        // this ever runs. Everything else (header/body content included)
        // only actually starts a resize if the pointer is within
        // `borderHitPx` of a real border — see `findBorderAt` below — so
        // ordinary clicks on a dropdown or button pass straight through.
        const pos = toFraction(event.clientX, event.clientY);
        const b = bounds();
        const tolX = borderHitPx / b.width;
        const tolY = borderHitPx / b.height;
        const hit = findBorderAt(state, pos.x, pos.y, Math.max(tolX, tolY));
        if (!hit) return;

        event.preventDefault();
        resizing = true;
        const minSize = hit.axis === "x" ? minWidth / b.width : minHeight / b.height;
        const affected = findAffectedVerts(state, hit.axis, hit.coord, hit.seedVerts);
        const [min, max] = resizeBounds(state, hit.axis, affected, minSize);

        const onMove = (moveEvent) => {
            const p = toFraction(moveEvent.clientX, moveEvent.clientY);
            const value = Math.min(max, Math.max(min, hit.axis === "x" ? p.x : p.y));
            for (const vid of affected) {
                const v = state.verts.get(vid);
                if (hit.axis === "x") v.x = value;
                else v.y = value;
            }
            for (const [id, record] of elements) {
                positionAreaElement(record, state.areas.get(id));
            }
        };
        const onUp = () => {
            resizing = false;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            onChange(serialize(state));
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    }

    workspace.addEventListener("pointermove", onWorkspacePointerMove);
    workspace.addEventListener("pointerdown", onWorkspacePointerDown);
    window.addEventListener("resize", render);

    render();

    return {
        destroy() {
            workspace.removeEventListener("pointermove", onWorkspacePointerMove);
            workspace.removeEventListener("pointerdown", onWorkspacePointerDown);
            window.removeEventListener("resize", render);
            splitPreview.remove();
            joinPreview.remove();
        },
        getLayout() {
            return serialize(state);
        },
    };
}
