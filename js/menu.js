/**
 * arch-style-lib :: menu
 * Builds a desktop-style application menu bar from a plain definition array —
 * triggers, dropped panels, sections, checkable rows, submenus, hover-to-
 * switch between open menus, and keyboard navigation.
 *
 * The definition is deliberately plain data (no functions required), so a
 * consuming app can keep it in a JSON file and edit its menus without touching
 * code. Anything that *can't* be expressed as data — what a row actually does,
 * or a whole custom control embedded in the menu — arrives through the
 * `onSelect`/`onToggle`/`renderers` callbacks instead, keyed by the row's id.
 *
 * See css/components/menu.css for the markup this produces and docs/behaviors.md
 * for the API.
 */

import { positionPopover, closePopover } from "./popover.js";

/**
 * @typedef {object} ArchMenuItem
 * @property {string} [type] "item" (default), "check", "separator", "group",
 *   "text" or "custom".
 * @property {string} [id] Identifier passed back to onSelect/onToggle/renderers.
 * @property {string} [name] Row label (or section caption, for a group).
 * @property {string} [icon] arch-style-lib icon name for the leading slot.
 * @property {string} [shortcut] Right-aligned accelerator text, display only —
 *   this module does not bind accelerators.
 * @property {boolean} [disabled]
 * @property {boolean} [checked] Initial state of a "check" row.
 * @property {ArchMenuItem[]} [items] Submenu rows, or a group's own rows.
 */

/**
 * @typedef {object} ArchMenu
 * @property {string} [id]
 * @property {string} name Trigger label.
 * @property {"start"|"end"} [align] "end" pushes this menu (and any after it)
 *   to the far end of the bar.
 * @property {ArchMenuItem[]} [items]
 */

const SUBMENU_OPEN_DELAY = 120;

/** Rows that can take keyboard focus / be activated. */
function isInteractive(item) {
    const type = item.type ?? "item";
    return (type === "item" || type === "check") && !item.disabled;
}

/**
 * Builds a menu bar into `root` and returns a handle for updating or removing
 * it.
 *
 * Panels are appended to `document.body` rather than to `root`: `.arch-glass`
 * establishes a containing block and clips its overflow, so a panel nested
 * inside a glass header would be cropped to that header's bounds.
 *
 * @param {HTMLElement} root Container for the trigger row (gets `.arch-menu-bar`).
 * @param {object} options
 * @param {ArchMenu[]} options.menus
 * @param {(id: string, item: ArchMenuItem) => void} [options.onSelect] An
 *   action row was activated. The menu closes first, so a handler is free to
 *   open a dialog or move focus.
 * @param {(id: string, checked: boolean, item: ArchMenuItem) => void} [options.onToggle]
 *   A checkable row changed. The menu deliberately stays open — flipping two
 *   related switches shouldn't cost two trips through the bar.
 * @param {Record<string, (container: HTMLElement) => void>} [options.renderers]
 *   Builders for `type: "custom"` rows, keyed by the row's id. Called once per
 *   (re)build with the row's own container.
 * @param {(root?: HTMLElement) => void} [options.renderIcons] Pass `renderIcons`
 *   from icons.js to fill in icon glyphs; omit if the consumer renders icons
 *   itself afterwards.
 * @returns {{ setMenus: (menus: ArchMenu[]) => void, closeAll: () => void,
 *   setChecked: (id: string, checked: boolean) => void,
 *   setDisabled: (id: string, disabled: boolean) => void,
 *   setLabel: (id: string, label: string) => void, destroy: () => void }}
 */
export function makeMenuBar(root, options = {}) {
    const { onSelect, onToggle, renderers = {}, renderIcons } = options;

    root.classList.add("arch-menu-bar");

    /** Live panels/triggers, rebuilt wholesale by setMenus(). */
    let entries = [];
    /** Row id -> its rendered element, for the setChecked/setDisabled helpers. */
    let rowsById = new Map();
    /** Open submenu panels, innermost last. */
    let openSubmenus = [];
    let openIndex = -1;
    let submenuTimer = 0;

    function clearSubmenus(depth = 0) {
        while (openSubmenus.length > depth) {
            const panel = openSubmenus.pop();
            panel.remove();
        }
    }

    function closeAll() {
        window.clearTimeout(submenuTimer);
        clearSubmenus();
        if (openIndex >= 0) {
            const entry = entries[openIndex];
            closePopover(entry.panel);
            entry.trigger.classList.remove("arch-menu-bar__trigger--open");
            entry.trigger.setAttribute("aria-expanded", "false");
            openIndex = -1;
        }
        setActiveRow(null);
    }

    function openMenu(index) {
        if (index === openIndex) return;
        closeAll();
        const entry = entries[index];
        if (!entry) return;
        // Left-aligned to its trigger, the way a menu bar's drop is expected to
        // sit — except for an end-aligned menu, which would otherwise run off
        // the viewport's right edge.
        positionPopover(entry.panel, entry.trigger, {
            gap: 6,
            align: entry.menu.align === "end" ? "end" : "start",
        });
        entry.panel.classList.add("arch-popover--open");
        entry.trigger.classList.add("arch-menu-bar__trigger--open");
        entry.trigger.setAttribute("aria-expanded", "true");
        openIndex = index;
    }

    let activeRow = null;
    function setActiveRow(row) {
        activeRow?.classList.remove("arch-menu__item--active");
        activeRow = row;
        activeRow?.classList.add("arch-menu__item--active");
    }

    /** Every focusable row of the innermost open panel, in visual order. */
    function currentRows() {
        const panel = openSubmenus[openSubmenus.length - 1] ?? entries[openIndex]?.panel;
        if (!panel) return [];
        return [...panel.querySelectorAll(".arch-menu__item:not(.arch-menu__item--disabled)")];
    }

    function moveActive(step) {
        const rows = currentRows();
        if (rows.length === 0) return;
        const from = activeRow ? rows.indexOf(activeRow) : -1;
        // Entering a menu from its trigger starts at whichever end the first
        // keypress points at, rather than treating "no row yet" as row 0.
        const next =
            from < 0
                ? rows[step > 0 ? 0 : rows.length - 1]
                : rows[(from + step + rows.length) % rows.length];
        setActiveRow(next);
        next.focus?.();
    }

    function activate(row) {
        const item = row.__archMenuItem;
        // `.arch-menu__item--disabled`'s `pointer-events: none` already stops a
        // real click, but that's a styling rule — a caller reaching a row any
        // other way (a synthesized click, a future keyboard path) must not slip
        // past it, since "disabled" here often means "there's no project open
        // for this to act on".
        if (!item || row.classList.contains("arch-menu__item--disabled")) return;
        if (item.items?.length) {
            openSubmenu(row, item, Number(row.dataset.archMenuDepth ?? "0") + 1);
            return;
        }
        if ((item.type ?? "item") === "check") {
            const input = row.querySelector(".arch-menu__check-input");
            if (input) {
                input.checked = !input.checked;
                onToggle?.(item.id, input.checked, item);
            }
            return;
        }
        closeAll();
        if (item.id) onSelect?.(item.id, item);
    }

    /**
     * Opens `item`'s rows as a panel beside `row`. Submenu panels are built on
     * demand and destroyed on close rather than kept around — a submenu that
     * has never been opened costs nothing, and its rows are rebuilt against
     * whatever the definition says now.
     */
    function openSubmenu(row, item, depth) {
        clearSubmenus(depth - 1);
        const panel = document.createElement("div");
        panel.className = "arch-popover arch-popover--menu arch-glass arch-popover--open";
        panel.setAttribute("data-arch-popover", "");
        panel.appendChild(buildList(item.items, depth));
        document.body.appendChild(panel);
        renderIcons?.(panel);

        const anchor = row.getBoundingClientRect();
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const pad = 8;
        // Prefer opening rightwards; flip to the left only when that would
        // overflow, so a nested chain doesn't zig-zag across the viewport.
        let left = anchor.right + 2;
        if (left + width > window.innerWidth - pad) left = Math.max(pad, anchor.left - width - 2);
        panel.style.left = `${left}px`;
        panel.style.top = `${Math.max(pad, Math.min(anchor.top - 6, window.innerHeight - height - pad))}px`;

        openSubmenus.push(panel);
        return panel;
    }

    function buildRow(item, depth) {
        const type = item.type ?? "item";
        const checkable = type === "check";
        const row = document.createElement(checkable ? "label" : "button");
        row.className = `arch-menu__item${checkable ? " arch-menu__item--check" : ""}`;
        if (!checkable) row.type = "button";
        row.dataset.archMenuDepth = String(depth);
        row.__archMenuItem = item;
        if (item.disabled) {
            row.classList.add("arch-menu__item--disabled");
            // Real `disabled` on the button form too, not just the class —
            // that's what keeps it out of the tab order and tells assistive
            // tech, which a visual style alone doesn't.
            if (!checkable) row.disabled = true;
        }
        row.setAttribute("role", checkable ? "menuitemcheckbox" : "menuitem");
        if (item.items?.length) row.setAttribute("aria-haspopup", "true");

        const lead = document.createElement("span");
        lead.className = "arch-menu__lead";
        if (checkable) {
            const input = document.createElement("input");
            input.type = "checkbox";
            input.className = "arch-menu__check-input";
            input.checked = Boolean(item.checked);
            input.disabled = Boolean(item.disabled);
            row.appendChild(input);
            const state = document.createElement("span");
            state.className = "arch-menu__state";
            lead.appendChild(state);
            input.addEventListener("change", () => onToggle?.(item.id, input.checked, item));
        } else if (item.icon) {
            const icon = document.createElement("span");
            icon.className = "arch-icon";
            icon.dataset.icon = item.icon;
            icon.setAttribute("aria-hidden", "true");
            lead.appendChild(icon);
        }
        row.appendChild(lead);

        const label = document.createElement("span");
        label.className = "arch-menu__label";
        label.textContent = item.name ?? "";
        row.appendChild(label);

        if (item.items?.length) {
            const marker = document.createElement("span");
            marker.className = "arch-icon arch-menu__marker";
            marker.dataset.icon = "chevron.right";
            marker.setAttribute("aria-hidden", "true");
            row.appendChild(marker);
        } else if (item.shortcut) {
            const shortcut = document.createElement("span");
            shortcut.className = "arch-menu__shortcut";
            shortcut.textContent = item.shortcut;
            row.appendChild(shortcut);
        }

        row.addEventListener("pointerenter", () => {
            setActiveRow(row);
            window.clearTimeout(submenuTimer);
            if (item.items?.length) {
                submenuTimer = window.setTimeout(() => openSubmenu(row, item, depth + 1), SUBMENU_OPEN_DELAY);
            } else {
                // Leaving a submenu's parent row closes anything deeper, so a
                // sideways sweep through the list doesn't leave panels stacked.
                clearSubmenus(depth);
            }
        });

        if (checkable) {
            // The label's own click already flips the input (and fires the
            // change handler above); this only stops the click from reaching
            // the panel's dismiss handling.
            row.addEventListener("click", (event) => event.stopPropagation());
        } else {
            row.addEventListener("click", (event) => {
                event.stopPropagation();
                activate(row);
            });
        }

        if (item.id) rowsById.set(item.id, row);
        return row;
    }

    function buildList(items, depth) {
        const list = document.createElement("div");
        list.className = "arch-menu";
        list.setAttribute("role", "menu");

        items.forEach((item, index) => {
            const type = item.type ?? "item";
            if (type === "separator") {
                const rule = document.createElement("div");
                rule.className = "arch-menu__separator";
                rule.setAttribute("role", "separator");
                list.appendChild(rule);
                return;
            }
            if (type === "group") {
                // A group is its own caption plus its rows, with a rule above
                // it unless it opens the menu (nothing to divide it from).
                if (index > 0) {
                    const rule = document.createElement("div");
                    rule.className = "arch-menu__separator";
                    rule.setAttribute("role", "separator");
                    list.appendChild(rule);
                }
                if (item.name) {
                    const caption = document.createElement("div");
                    caption.className = "arch-menu__group-label";
                    caption.textContent = item.name;
                    list.appendChild(caption);
                }
                for (const child of item.items ?? []) {
                    const built = buildList([child], depth).firstElementChild;
                    if (built) list.appendChild(built);
                }
                return;
            }
            if (type === "text") {
                const text = document.createElement("div");
                text.className = "arch-menu__text";
                text.textContent = item.name ?? "";
                if (item.id) rowsById.set(item.id, text);
                list.appendChild(text);
                return;
            }
            if (type === "custom") {
                const container = document.createElement("div");
                container.className = "arch-menu__custom";
                // Clicks inside a custom control are that control's business —
                // toggling a switcher shouldn't dismiss the menu around it.
                container.addEventListener("click", (event) => event.stopPropagation());
                if (item.id) {
                    rowsById.set(item.id, container);
                    renderers[item.id]?.(container);
                }
                list.appendChild(container);
                return;
            }
            list.appendChild(buildRow(item, depth));
        });

        return list;
    }

    function buildBar(menus) {
        root.textContent = "";
        for (const entry of entries) entry.panel.remove();
        entries = [];
        rowsById = new Map();

        let spacerInserted = false;
        menus.forEach((menu) => {
            if (menu.align === "end" && !spacerInserted) {
                const spacer = document.createElement("div");
                spacer.className = "arch-menu-bar__spacer";
                root.appendChild(spacer);
                spacerInserted = true;
            }

            const index = entries.length;
            const trigger = document.createElement("button");
            trigger.type = "button";
            trigger.className = "arch-menu-bar__trigger";
            trigger.textContent = menu.name;
            trigger.setAttribute("aria-haspopup", "true");
            trigger.setAttribute("aria-expanded", "false");
            root.appendChild(trigger);

            const panel = document.createElement("div");
            panel.className = "arch-popover arch-popover--menu arch-glass";
            panel.setAttribute("data-arch-popover", "");
            panel.appendChild(buildList(menu.items ?? [], 0));
            document.body.appendChild(panel);

            trigger.addEventListener("click", (event) => {
                event.stopPropagation();
                if (openIndex === index) closeAll();
                else openMenu(index);
            });
            // Sweeping across the bar with a menu already open switches to the
            // one under the cursor — standard menu-bar behavior, and the reason
            // hovering does nothing while the bar is closed.
            trigger.addEventListener("pointerenter", () => {
                if (openIndex >= 0) openMenu(index);
            });

            entries.push({ menu, trigger, panel });
        });

        if (renderIcons) {
            renderIcons(root);
            for (const entry of entries) renderIcons(entry.panel);
        }
    }

    const onDocumentPointerDown = (event) => {
        if (openIndex < 0) return;
        const inside =
            root.contains(event.target) ||
            entries[openIndex].panel.contains(event.target) ||
            openSubmenus.some((panel) => panel.contains(event.target));
        if (!inside) closeAll();
    };

    const onKeyDown = (event) => {
        if (openIndex < 0) return;
        switch (event.key) {
            case "Escape":
                event.preventDefault();
                if (openSubmenus.length > 0) clearSubmenus(openSubmenus.length - 1);
                else closeAll();
                break;
            case "ArrowDown":
                event.preventDefault();
                moveActive(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                moveActive(-1);
                break;
            case "ArrowRight":
                // Inside a row with a submenu this descends into it; anywhere
                // else it walks to the next menu along the bar.
                if (activeRow?.__archMenuItem?.items?.length) {
                    event.preventDefault();
                    const panel = openSubmenu(activeRow, activeRow.__archMenuItem, openSubmenus.length + 1);
                    setActiveRow(panel.querySelector(".arch-menu__item:not(.arch-menu__item--disabled)"));
                } else {
                    event.preventDefault();
                    openMenu((openIndex + 1) % entries.length);
                }
                break;
            case "ArrowLeft":
                event.preventDefault();
                if (openSubmenus.length > 0) clearSubmenus(openSubmenus.length - 1);
                else openMenu((openIndex - 1 + entries.length) % entries.length);
                break;
            case "Enter":
            case " ":
                if (activeRow) {
                    event.preventDefault();
                    activate(activeRow);
                }
                break;
            default:
                break;
        }
    };

    const onWindowChange = () => closeAll();

    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onWindowChange);

    buildBar(options.menus ?? []);

    return {
        setMenus(menus) {
            closeAll();
            buildBar(menus);
        },
        closeAll,
        /** Flips a checkable row's state without firing onToggle. */
        setChecked(id, checked) {
            const input = rowsById.get(id)?.querySelector?.(".arch-menu__check-input");
            if (input) input.checked = checked;
        },
        setDisabled(id, disabled) {
            const row = rowsById.get(id);
            if (!row) return;
            row.classList.toggle("arch-menu__item--disabled", disabled);
            const input = row.querySelector?.(".arch-menu__check-input");
            if (input) input.disabled = disabled;
            else if (row instanceof HTMLButtonElement) row.disabled = disabled;
        },
        setLabel(id, label) {
            const row = rowsById.get(id);
            if (!row) return;
            const target = row.querySelector?.(".arch-menu__label") ?? row;
            target.textContent = label;
        },
        destroy() {
            closeAll();
            document.removeEventListener("pointerdown", onDocumentPointerDown, true);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onWindowChange);
            for (const entry of entries) entry.panel.remove();
            entries = [];
            rowsById = new Map();
            root.textContent = "";
            root.classList.remove("arch-menu-bar");
        },
    };
}
