/**
 * arch-style-lib :: icon data generator
 *
 * Regenerates `js/icons-data.js` from the `lucide-static` package. Run it
 * only when bumping Lucide — the output is committed and consumed directly,
 * so the library itself still has no build step (same arrangement as
 * `fonts/tools/` before it, back when icons were a font).
 *
 *   npm install
 *   npm run build:icons
 *
 * Lucide's `icon-nodes.json` is the structured source of truth: each icon is
 * a list of `[tag, attributes]` pairs with no presentation attributes on
 * them at all (no stroke, no fill, no viewBox). That's exactly what we want
 * — every one of those is set once by `.arch-icon` in `css/icons.css`, which
 * is what makes stroke width a live custom property rather than something
 * baked into the data.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_DIR = path.join(REPO_ROOT, "node_modules", "lucide-static");
const OUT_FILE = path.join(REPO_ROOT, "js", "icons-data.js");

/**
 * Presentation attributes that would break theming if they were baked into
 * the path data — they'd silently out-specify `.arch-icon`'s own, and that
 * icon would stop responding to `--arch-icon-stroke`/`currentColor` with no
 * visible error anywhere.
 *
 * `fill` is the one exception, and only as `currentColor`: ~19 icons
 * (`chart-scatter`'s plotted points, and similar) are deliberately solid
 * dots rather than outlines, and `currentColor` still themes correctly.
 */
const FORBIDDEN_ATTRS = new Set(["stroke", "stroke-width", "class", "style"]);

/** True if `attr`/`value` would override `.arch-icon`'s own theming. */
function breaksTheming(attr, value) {
    if (FORBIDDEN_ATTRS.has(attr)) return true;
    return attr === "fill" && value !== "currentColor";
}

/** Escapes a value for inclusion in a double-quoted SVG attribute. */
function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Serializes one icon's `[tag, attrs]` node list into an SVG markup string. */
function serializeIcon(name, nodes) {
    return nodes
        .map(([tag, attrs]) => {
            const pairs = Object.entries(attrs ?? {}).map(([key, value]) => {
                if (breaksTheming(key, value)) {
                    throw new Error(
                        `Icon "${name}" carries a presentation attribute ${key}="${value}" — ` +
                            `that would override .arch-icon's own theming. Update the generator.`,
                    );
                }
                return `${key}="${escapeAttr(value)}"`;
            });
            return `<${tag}${pairs.length ? ` ${pairs.join(" ")}` : ""}/>`;
        })
        .join("");
}

function main() {
    if (!fs.existsSync(PACKAGE_DIR)) {
        console.error("lucide-static not installed — run `npm install` first.");
        process.exit(1);
    }

    const { version } = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_DIR, "package.json"), "utf8"),
    );
    const nodes = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_DIR, "icon-nodes.json"), "utf8"),
    );

    const names = Object.keys(nodes).sort();
    const lines = names.map(
        (name) => `    ${JSON.stringify(name)}: ${JSON.stringify(serializeIcon(name, nodes[name]))},`,
    );

    const out = `/**
 * arch-style-lib :: icon data (GENERATED — do not edit by hand)
 *
 * Lucide ${version} (${names.length} icons), ISC licensed — see LICENSE-lucide.
 * Regenerate with \`npm run build:icons\`; the generator is tools/build-icons.mjs.
 *
 * Each value is the *inner* markup of the icon: no viewBox, stroke, fill or
 * size, all of which \`.arch-icon\` supplies (css/icons.css) so they stay
 * themeable at runtime. See docs/icons.md.
 */

/** @type {Record<string, string>} icon name -> inner SVG markup */
export const ICONS = {
${lines.join("\n")}
};

/** Version of Lucide this data was generated from. */
export const LUCIDE_VERSION = ${JSON.stringify(version)};
`;

    fs.writeFileSync(OUT_FILE, out);

    // Ship Lucide's own license alongside the data — ISC requires the notice
    // to travel with the copied work, and the path data is exactly that.
    fs.copyFileSync(path.join(PACKAGE_DIR, "LICENSE"), path.join(REPO_ROOT, "LICENSE-lucide"));

    console.log(
        `Wrote ${path.relative(REPO_ROOT, OUT_FILE)} — ${names.length} icons ` +
            `from lucide-static ${version} (${(out.length / 1024).toFixed(0)} KB).`,
    );
}

main();
