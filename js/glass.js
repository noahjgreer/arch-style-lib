/**
 * arch-style-lib :: glass
 * Runtime controls for the .arch-glass utility (see css/glass.css):
 * adjustable blur, and adaptive light/dark reflex based on a sampled image.
 */

/**
 * Sets the global glass blur radius (clamped 0-40px) on :root, so every
 * .arch-glass element updates at once.
 * @param {number} px
 * @param {{ root?: HTMLElement }} [opts]
 */
export function setGlassBlur(px, { root = document.documentElement } = {}) {
    const clamped = Math.max(0, Math.min(40, px));
    root.style.setProperty("--arch-glass-blur", `${clamped}px`);
    return clamped;
}

/**
 * Samples an image's average luminance to decide whether glass panels over
 * it should use light or dark reflex highlights. Resolves null if the image
 * fails to load (e.g. cross-origin without CORS headers).
 * @param {string} imageUrl
 * @returns {Promise<"light"|"dark"|null>}
 */
export function detectImageBrightness(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const size = 64;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, size, size);
            let data;
            try {
                data = ctx.getImageData(0, 0, size, size).data;
            } catch {
                resolve(null);
                return;
            }
            let total = 0;
            for (let i = 0; i < data.length; i += 4) {
                total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
            resolve(total / (data.length / 4) > 128 ? "light" : "dark");
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
}

/**
 * Samples `imageUrl` and stamps data-glass-scheme on `target` so its
 * .arch-glass reflex tokens flip for legibility over that background.
 * @param {string} imageUrl
 * @param {HTMLElement} [target]
 */
export async function applyAdaptiveGlass(imageUrl, target = document.documentElement) {
    const scheme = await detectImageBrightness(imageUrl);
    if (scheme) target.setAttribute("data-glass-scheme", scheme);
    return scheme;
}
