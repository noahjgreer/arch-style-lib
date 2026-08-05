import fontforge

def keep_glyph_range(font_path, min_hex, max_hex, save_path=None):
    """
    Deletes all glyphs outside the specified Unicode range.
    """
    # Open the font file
    font = fontforge.open(font_path)
    
    # Convert hex strings to integers
    min_val = int(min_hex, 16)
    max_val = int(max_hex, 16)
    
    # Track glyphs to remove to avoid modifying the loop dynamically
    glyphs_to_remove = []
    
    # Iterate through all glyphs in the font
    for glyph in font.glyphs():
        # Get the primary unicode encoding value
        encoding = glyph.unicode
        
        # Check if the glyph falls outside the requested range
        # Note: encoding is -1 for glyphs with no assigned Unicode value (e.g., ligatures, .notdef)
        if encoding < min_val or encoding > max_val:
            # Optional: If you want to keep the .notdef glyph, skip it
            if glyph.glyphname == ".notdef":
                continue
            glyphs_to_remove.append(glyph.glyphname)
            
    # Remove the flagged glyphs from the font
    for name in glyphs_to_remove:
        font.removeGlyph(name)
        
    # Save the modified font
    if save_path:
        font.save(save_path)
        print(f"Subsetted font saved to: {save_path}")
    else:
        font.save()
        print("Font updated in place.")

# --- EXECUTION ---
# Replace these strings with your actual file paths
INPUT_FONT = "C:\\Projects\\Tools\\arch-style-lib\\fonts\\SF-Symbols.sfd"
OUTPUT_FONT = "C:\\Projects\\Tools\\arch-style-lib\\fonts\\SF-Symbols-Subset.sfd"

keep_glyph_range(INPUT_FONT, "2190", "10361C", OUTPUT_FONT)
