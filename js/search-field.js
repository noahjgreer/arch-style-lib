/**
 * arch-style-lib :: search field
 * Behavior for .arch-search (see css/components/search-field.css): the clear
 * button, and Escape clearing the field.
 */

/**
 * Wires an .arch-search: its clear button empties the field and puts the
 * caret back in it, and Escape in a field holding text empties it. Either
 * way the input fires a bubbling "input" event, so whatever filters on the
 * field's value updates as though the user had deleted the text. An Escape
 * that clears goes no further (it's stopped and its default prevented), so a
 * dialog around the field closes only on an Escape in an empty field.
 * @param {HTMLElement} field  element with class "arch-search"
 */
export function bindSearchField(field) {
    const input = field.querySelector(".arch-search__input");
    const clear = () => {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    input.addEventListener("keydown", (event) => {
        // Mid-composition, Escape cancels the IME's text, not the field's.
        if (event.key !== "Escape" || event.isComposing || input.value === "") return;
        event.preventDefault();
        event.stopPropagation();
        clear();
    });
    field.querySelector(".arch-search__clear")?.addEventListener("click", () => {
        clear();
        input.focus();
    });
}
