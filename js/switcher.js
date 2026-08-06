/**
 * arch-style-lib :: switcher
 * Behavior for the .arch-switcher sliding-pill segmented control
 * (see css/components/switcher.css), plus a radio-group variant.
 */

/**
 * Wires click handling for a button-based .arch-switcher: updates
 * --arch-switcher-index (drives the sliding pill), toggles the active tab
 * class, and dispatches "archswitch" with { index } on the container.
 * @param {HTMLElement} container  element with class "arch-switcher"
 * @param {{ onChange?: (index: number) => void }} [opts]
 */
export function initSwitcher(container, opts = {}) {
    const tabs = Array.from(container.querySelectorAll(".arch-switcher__tab"));
    container.style.setProperty("--arch-switcher-count", String(tabs.length));

    const activate = (index) => {
        container.style.setProperty("--arch-switcher-index", String(index));
        tabs.forEach((tab, i) =>
            tab.classList.toggle("arch-switcher__tab--active", i === index)
        );
        opts.onChange?.(index);
        container.dispatchEvent(new CustomEvent("archswitch", { detail: { index } }));
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activate(index));
    });

    const initialIndex = tabs.findIndex((tab) =>
        tab.classList.contains("arch-switcher__tab--active")
    );
    activate(initialIndex === -1 ? 0 : initialIndex);

    return { activate };
}

/**
 * Wires a radio-group-based .arch-switcher: drives the same
 * --arch-switcher-count/--arch-switcher-index custom properties as
 * initSwitcher() (so the sliding pill works with native
 * <input type="radio"> tabs, for keyboard/screen-reader semantics), and
 * tracks the previously-checked value as a "c-previous" attribute on the
 * container — handy for animating from the old to the new selection. Each
 * radio should carry a "c-option" attribute with its identifying value.
 * Pair with a ".arch-switcher__tab:has(input:checked)" CSS rule (already in
 * css/components/switcher.css) for the active-tab opacity — no JS class
 * toggling needed, unlike the button-based initSwitcher().
 * @param {HTMLElement} container
 */
export function initRadioSwitcher(container) {
    const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
    let previous = null;

    container.style.setProperty("--arch-switcher-count", String(radios.length));

    const syncIndex = () => {
        const index = radios.findIndex((radio) => radio.checked);
        if (index !== -1) container.style.setProperty("--arch-switcher-index", String(index));
    };

    const initial = container.querySelector('input[type="radio"]:checked');
    if (initial) {
        previous = initial.getAttribute("c-option");
        container.setAttribute("c-previous", previous ?? "");
    }
    syncIndex();

    radios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (!radio.checked) return;
            container.setAttribute("c-previous", previous ?? "");
            previous = radio.getAttribute("c-option");
            syncIndex();
        });
    });
}
