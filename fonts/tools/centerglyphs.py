import fontforge
import psMat

# Get the currently active font in FontForge
font = fontforge.activeFont()
if font is None:
    raise EnvironmentError("No active font found. Open a font before running this script.")

# Get font metrics
ascent = font.ascent
descent = font.descent
midline = (ascent - descent) / 2

# Loop through only selected glyphs
for glyph in font.selection.byGlyphs:
    if glyph.isWorthOutputting():
        xmin, ymin, xmax, ymax = glyph.boundingBox()
        glyph_center = (ymax + ymin) / 2
        shift = midline - glyph_center
        glyph.transform(psMat.translate(0, shift))

print("✅ Selected glyphs have been vertically centered.")