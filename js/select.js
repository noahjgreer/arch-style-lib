/**
 * arch-style-lib :: select
 * Replaces a native <select>'s look with a glass trigger and a dropped
 * .arch-menu listbox, while the <select> itself (hidden) stays the single
 * source of truth: `select.value`, `selectedIndex`, option `dataset`s and
 * "change" listeners all keep working, so existing code reading the select
 * needs no changes.
 *
 * See css/components/select.css for the markup this produces and
 * docs/behaviors.md for the API.
 */

import { positionPopover, closePopover } from "./popover.js";

/**
 * Builds the custom control next to `select` and hides the native one.
 *
 * Options repopulated later (innerHTML, appendChild, disabled toggles…) are
 * picked up automatically by a MutationObserver. Setting `select.value` from
 * code mutates nothing observable, so call `sync()` afterwards — or dispatch
 * a "change" event, which this listens for too.
 *
 * @param {HTMLSelectElement} select
 * @param {object} [options]
 * @param {(root?: HTMLElement) => void} [options.renderIcons] Pass
 *   `renderIcons` from icons.js to fill in the chevron/check glyphs; omit if
 *   the consumer renders icons itself (e.g. via watchIcons).
 * @param {object|(() => object)} [options.positionOptions] Passed through to
 *   positionPopover() on every open (a function is called each time, for
 *   values like a mobile tab bar's height that change with the viewport).
 * @returns {{ trigger: HTMLButtonElement, panel: HTMLElement, sync: () => void,
 *   open: () => void, close: () => void, destroy: () => void }}
 */
export function makeSelect(select, options = {}) {
    const { renderIcons, positionOptions } = options;

    const trigger = document.createElement("button");
    trigger.type = "button";
    // Carry the select's own classes (e.g. arch-glass) so it keeps its surface.
    trigger.className = `${select.className} arch-select`.trim();
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const ariaLabel = select.getAttribute("aria-label") || select.title;
    if (ariaLabel) trigger.setAttribute("aria-label", ariaLabel);
    trigger.innerHTML = `
        <span class="arch-select__value"></span>
        <span class="arch-icon arch-select__chevron" data-icon="chevron-down"></span>
    `;
    const valueEl = trigger.querySelector(".arch-select__value");
    select.after(trigger);
    select.hidden = true;

    // Appended to <body>: a panel inside an .arch-glass ancestor would be
    // positioned against (and clipped by) that ancestor — see popover.js.
    const panel = document.createElement("div");
    panel.className = "arch-popover arch-popover--menu arch-glass arch-select-panel";
    panel.innerHTML = `<div class="arch-menu" role="listbox"></div>`;
    const list = panel.firstElementChild;
    document.body.appendChild(panel);

    let isOpen = false;
    let activeRow = null;

    function setActiveRow(row) {
        activeRow?.classList.remove("arch-menu__item--active");
        activeRow = row;
        activeRow?.classList.add("arch-menu__item--active");
        activeRow?.scrollIntoView({ block: "nearest" });
    }

    function rows() {
        return [...list.querySelectorAll(".arch-menu__item:not(.arch-menu__item--disabled)")];
    }

    function buildRow(option) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "arch-menu__item";
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", String(option.selected));
        row.innerHTML = `
            <span class="arch-menu__lead">${option.selected ? '<span class="arch-icon" data-icon="check"></span>' : ""}</span>
            <span class="arch-menu__label"></span>
        `;
        row.querySelector(".arch-menu__label").textContent = option.textContent;
        if (option.disabled) {
            row.classList.add("arch-menu__item--disabled");
            row.disabled = true;
        }
        row.addEventListener("click", () => choose(option));
        row.addEventListener("pointermove", () => setActiveRow(row));
        return row;
    }

    function buildList() {
        list.innerHTML = "";
        [...select.children].forEach((child, i) => {
            if (child instanceof HTMLOptGroupElement) {
                if (i > 0) {
                    const separator = list.appendChild(document.createElement("div"));
                    separator.className = "arch-menu__separator";
                    separator.setAttribute("role", "separator");
                }
                if (child.label) {
                    const caption = list.appendChild(document.createElement("div"));
                    caption.className = "arch-menu__group-label";
                    caption.textContent = child.label;
                }
                [...child.children].forEach((option) => list.appendChild(buildRow(option)));
            } else if (child instanceof HTMLOptionElement) {
                list.appendChild(buildRow(child));
            }
        });
        renderIcons?.(panel);
    }

    function sync() {
        const option = select.options[select.selectedIndex];
        valueEl.textContent = option?.textContent ?? "";
        trigger.disabled = select.disabled;
        renderIcons?.(trigger);
        if (isOpen) buildList();
    }

    function choose(option) {
        close();
        trigger.focus();
        if (option.disabled || option.selected) return;
        option.selected = true;
        sync();
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function open() {
        if (isOpen || select.disabled) return;
        isOpen = true;
        buildList();
        // At least as wide as its trigger, the way a native select's list is.
        panel.style.minWidth = `${trigger.offsetWidth}px`;
        const opts = typeof positionOptions === "function" ? positionOptions() : positionOptions;
        positionPopover(panel, trigger, { gap: 6, align: "start", ...opts });
        panel.classList.add("arch-popover--open");
        trigger.setAttribute("aria-expanded", "true");
        setActiveRow(list.querySelector('[aria-selected="true"]') ?? rows()[0] ?? null);
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        closePopover(panel);
        trigger.setAttribute("aria-expanded", "false");
        setActiveRow(null);
    }

    function moveActive(step) {
        const all = rows();
        if (!all.length) return;
        const index = all.indexOf(activeRow);
        setActiveRow(all[(index + step + all.length) % all.length]);
    }

    trigger.addEventListener("click", () => (isOpen ? close() : open()));

    trigger.addEventListener("keydown", (event) => {
        if (!isOpen) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                open();
            }
            return;
        }
        switch (event.key) {
            case "ArrowDown": event.preventDefault(); moveActive(1); break;
            case "ArrowUp": event.preventDefault(); moveActive(-1); break;
            case "Home": event.preventDefault(); setActiveRow(rows()[0] ?? null); break;
            case "End": event.preventDefault(); setActiveRow(rows().at(-1) ?? null); break;
            case "Enter":
            case " ":
                event.preventDefault();
                activeRow?.click();
                break;
            case "Escape": event.preventDefault(); close(); break;
            case "Tab": close(); break;
        }
    });

    const onPointerDown = (event) => {
        if (isOpen && !panel.contains(event.target) && !trigger.contains(event.target)) close();
    };
    // A fixed panel would detach from its trigger once the page scrolls under it.
    const onScroll = (event) => {
        if (isOpen && !panel.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);

    // Only reads the select, never writes to it — an observer writing back to
    // what it watches would loop forever.
    const observer = new MutationObserver(sync);
    observer.observe(select, { childList: true, subtree: true, characterData: true, attributes: true });
    select.addEventListener("change", sync);

    sync();

    function destroy() {
        observer.disconnect();
        select.removeEventListener("change", sync);
        document.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", close);
        trigger.remove();
        panel.remove();
        select.hidden = false;
    }

    return { trigger, panel, sync, open, close, destroy };
}
