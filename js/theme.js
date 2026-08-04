/**
 * arch-style-lib :: theme
 * Manual light/dark theme control (on top of the automatic prefers-color-scheme
 * handling already in css/tokens.css) plus a light/dark color classifier.
 */

const STORAGE_KEY = "arch-theme";

/**
 * Reads the persisted theme choice, if any.
 * @returns {"light"|"dark"|null}
 */
export function getStoredTheme() {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
}

/**
 * Applies a theme by setting data-theme on <html> and persisting the choice.
 * Pass null to clear the override and fall back to the OS preference.
 * @param {"light"|"dark"|null} theme
 */
export function setTheme(theme) {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") {
        root.setAttribute("data-theme", theme);
        localStorage.setItem(STORAGE_KEY, theme);
    } else {
        root.removeAttribute("data-theme");
        localStorage.removeItem(STORAGE_KEY);
    }
}

/** Restores any persisted theme override. Call once on page load. */
export function initTheme() {
    const stored = getStoredTheme();
    if (stored) document.documentElement.setAttribute("data-theme", stored);
}

/** Flips between light and dark, ignoring OS preference once toggled. */
export function toggleTheme() {
    const current =
        getStoredTheme() ??
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(current === "dark" ? "light" : "dark");
}

/**
 * Classifies a color as perceptually "light" or "dark" using the HSP model.
 * Accepts #hex, #hexa, rgb(), or rgba() strings.
 * @param {string} color
 * @returns {"light"|"dark"}
 */
export function lightOrDark(color) {
    let r, g, b;

    const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
        [, r, g, b] = rgbMatch.map(Number);
    } else {
        let hex = color.replace("#", "");
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split("").map((c) => c + c).join("");
        }
        const num = parseInt(hex.slice(0, 6), 16);
        r = (num >> 16) & 255;
        g = (num >> 8) & 255;
        b = num & 255;
    }

    const hsp = Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
    return hsp > 127.5 ? "light" : "dark";
}
