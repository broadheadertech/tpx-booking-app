#!/usr/bin/env python3
"""
Replace ALL hardcoded brand colors in hover states with CSS variables.
Keeps structural colors (grays, blacks) and semantic colors (reds for errors).
"""

import os
import re
from pathlib import Path

BASE_DIR = Path('/Users/dale/Documents/tpx-booking-app/src')

# Define what colors to replace
BRAND_COLOR_PATTERNS = [
    # Primary orange variations (darker shades for hover)
    (r'hover:bg-\[#E67A1F\]', 'hover:brightness-90'),
    (r'hover:bg-\[#E67E22\]', 'hover:brightness-90'),
    (r'hover:bg-\[#E8610F\]', 'hover:brightness-90'),
    (r'hover:bg-\[#F68B24\]', 'hover:bg-[var(--color-primary)]'),
    
    # Text colors
    (r'hover:text-\[#FF9D5C\]', 'hover:text-[var(--color-accent)]'),
    
    # Gradient ends
    (r'hover:to-\[#E67E37\]', 'hover:to-[var(--color-accent)]'),
    (r'hover:to-\[#FF9D5C\]', 'hover:to-[var(--color-accent)]'),
    
    # Active states (these are already being used, let's make them consistent)
    (r'active:bg-\[#4A4A4A\]', 'active:brightness-90'),
]

# Patterns to KEEP (structural/semantic colors - do NOT replace)
KEEP_PATTERNS = [
    # Grays/blacks (structural)
    r'hover:bg-\[#[0-9A-F]{6}\].*#[0-5][0-9A-F]{5}',  # Dark grays (#000000 - #555555)
    r'hover:border-\[#[0-9A-F]{6}\].*#[0-5][0-9A-F]{5}',
    r'hover:text-gray',
    r'hover:bg-white',
    r'hover:bg-black',
    
    # Reds (semantic - errors/warnings)
    r'hover:.*#FF4D4F',
    r'hover:.*red-',
    
    # Greens (semantic - success)
    r'hover:.*green-',
]

def should_keep_color(line):
    """Check if this line contains colors we should keep."""
    for pattern in KEEP_PATTERNS:
        if re.search(pattern, line):
            return True
    return False

def replace_colors_in_file(file_path):
    """Replace brand colors in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        modified = False
        new_lines = []
        changes = []
        
        for i, line in enumerate(lines):
            new_line = line
            
            # Skip if this line has colors we should keep
            if should_keep_color(line):
                new_lines.append(line)
                continue
            
            # Apply brand color replacements
            for old_pattern, new_value in BRAND_COLOR_PATTERNS:
                if re.search(old_pattern, new_line):
                    new_line = re.sub(old_pattern, new_value, new_line)
                    if new_line != line:
                        changes.append(f"  Line {i+1}: {old_pattern} → {new_value}")
                        modified = True
            
            new_lines.append(new_line)
        
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            
            rel_path = file_path.relative_to(BASE_DIR)
            print(f"✓ {rel_path}")
            for change in changes[:5]:  # Show first 5 changes
                print(change)
            if len(changes) > 5:
                print(f"  ... and {len(changes) - 5} more changes")
            return True
        
        return False
        
    except Exception as e:
        print(f"✗ Error: {file_path}: {e}")
        return False

def main():
    print("🎨 Replacing ALL hardcoded brand colors in hover states...\n")
    
    total_files = 0
    fixed_files = 0
    
    # Process all React/TypeScript files
    for pattern in ['**/*.jsx', '**/*.tsx', '**/*.js', '**/*.ts']:
        for file_path in BASE_DIR.glob(pattern):
            if file_path.is_file():
                total_files += 1
                if replace_colors_in_file(file_path):
                    fixed_files += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Brand color replacement complete!")
    print(f"   Files scanned: {total_files}")
    print(f"   Files modified: {fixed_files}")
    print(f"\n💡 Note: Kept structural colors (grays) and semantic colors (reds)")
    print(f"{'='*60}\n")
    
    print("📋 Next steps:")
    print("   1. Review changes: git diff")
    print("   2. Test build: npm run build")
    print("   3. Test visually with different color presets")

if __name__ == '__main__':
    main()
