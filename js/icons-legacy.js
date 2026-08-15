/**
 * arch-style-lib :: legacy icon-name aliases
 *
 * Icons were an SF Symbols-derived symbol font until 2026-08-15, when the
 * set was replaced with Lucide (see docs/icons.md for why). Names went from
 * SF's dotted style (`square.and.arrow.down`) to Lucide's kebab-case
 * (`download`), which breaks every consuming project at once.
 *
 * This table maps the names that were actually in use across those projects
 * to their Lucide equivalents, so an un-migrated consumer keeps rendering
 * while it catches up. `iconSvg` resolves through it and warns once per
 * name — it is a migration shim, not a supported naming scheme.
 *
 * **This file is intended to be deleted.** Drop it (and its import in
 * `icons.js`) once every consumer is on Lucide names; anything still
 * relying on it will then fail loudly with the unknown-icon fallback, which
 * is the correct outcome rather than carrying Apple's naming forever.
 */

/** @type {Record<string, string>} old SF Symbols name -> Lucide name */
export const LEGACY_ICON_ALIASES = {
    "apple.terminal": "terminal",
    "arrow.clockwise": "rotate-cw",
    "arrow.down.circle": "circle-arrow-down",
    "arrow.down.document": "file-down",
    "arrow.up.left.and.arrow.down.right": "maximize-2",
    "arrow.uturn.backward": "undo-2",
    "arrow.uturn.forward": "redo-2",
    bolt: "zap",
    bookmark: "bookmark",
    camera: "camera",
    "chevron.down": "chevron-down",
    "chevron.right": "chevron-right",
    "chevron.up": "chevron-up",
    cube: "box",
    "document.on.document": "copy",
    eye: "eye",
    flame: "flame",
    flask: "flask-conical",
    folder: "folder",
    "folder.badge.gearshape": "folder-cog",
    gearshape: "settings",
    hammer: "hammer",
    heart: "heart",
    house: "house",
    internaldrive: "hard-drive",
    leaf: "leaf",
    lightbulb: "lightbulb",
    "line.3.horizontal": "menu",
    "line.3.horizontal.decrease": "list-filter",
    "location.north.line": "navigation",
    macwindow: "app-window",
    map: "map",
    minus: "minus",
    "minus.magnifyingglass": "zoom-out",
    "move.3d": "move-3d",
    paintbrush: "paintbrush",
    "paintbrush.pointed": "pen-tool",
    paintpalette: "palette",
    pawprint: "paw-print",
    pencil: "pencil",
    photo: "image",
    pin: "pin",
    plus: "plus",
    "plus.magnifyingglass": "zoom-in",
    printer: "printer",
    "rectangle.portrait.and.arrow.right": "log-out",
    ruler: "ruler",
    scissors: "scissors",
    seal: "stamp",
    "slider.horizontal.3": "sliders-horizontal",
    sparkles: "sparkles",
    "square.and.arrow.down": "download",
    "square.and.arrow.up": "upload",
    "square.grid.3x3.square": "grid-3x3",
    star: "star",
    tag: "tag",
    tray: "inbox",
    trash: "trash-2",
    "wrench.and.screwdriver": "wrench",
    xmark: "x",
};
