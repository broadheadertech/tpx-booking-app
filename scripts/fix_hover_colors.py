#!/usr/bin/env python3
"""
Fix hardcoded hover colors to use CSS variables or consistent patterns.
"""

import os
import re
from pathlib import Path

# Mappings for hover colors
HOVER_REPLACEMENTS = [
    # Orange hover states - use darker variants or CSS variables
    (r'hover:bg-\[#E67A1F\]', 'hover:brightness-90'),  # Slightly darker primary
    (r'hover:bg-\[#E67E22\]', 'hover:brightness-90'),  # Slightly darker primary
    (r'hover:bg-\[#E8610F\]', 'hover:brightness-90'),  # Slightly darker primary
    (r'hover:bg-\[#F68B24\]', 'hover:bg-[var(--color-primary)]'),
    (r'hover:to-\[#E67E37\]', 'hover:to-[var(--color-accent)]'),
    (r'hover:to-\[#FF9D5C\]', 'hover:to-[var(--color-accent)]'),
    (r'hover:text-\[#FF9D5C\]', 'hover:text-[var(--color-accent)]'),
    
    # Border hovers for brand colors (leave grays as-is)
    # Keep gray borders like hover:border-[#555555] etc as they're structural, not branded
]

BASE_DIR = Path('/Users/dale/Documents/tpx-booking-app/src')

def fix_file(file_path):
    """Apply hover color fixes to a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        changes = []
        
        for old_pattern, new_value in HOVER_REPLACEMENTS:
            if re.search(old_pattern, content):
                count = len(re.findall(old_pattern, content))
                content = re.sub(old_pattern, new_value, content)
                changes.append(f"  {old_pattern} → {new_value} ({count}x)")
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ {file_path}")
            for change in changes:
                print(change)
            return True
        return False
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False

def main():
    print("🎨 Fixing hardcoded hover colors...\n")
    
    files_fixed = 0
    files_scanned = 0
    
    # Process all .jsx and .tsx files
    for ext in ['.jsx', '.tsx', '.js', '.ts']:
        for file_path in BASE_DIR.rglob(f'*{ext}'):
            files_scanned += 1
            if fix_file(file_path):
                files_fixed += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Hover color fixes complete!")
    print(f"   Files scanned: {files_scanned}")
    print(f"   Files fixed: {files_fixed}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
