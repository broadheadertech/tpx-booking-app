#!/usr/bin/env python3
"""
Fix ALL remaining hardcoded brand colors in hover, active, and focus states.
"""

import re
from pathlib import Path

BASE_DIR = Path('/Users/dale/Documents/tpx-booking-app/src')

# Complete list of brand color replacements
REPLACEMENTS = [
    # Active state orange colors (these are the ones we missed!)
    (r'active:from-\[#FF6B1A\]', 'active:from-[var(--color-accent)]'),
    (r'active:to-\[#FF6B1A\]', 'active:to-[var(--color-accent)]'),
    (r'active:to-\[#E8610F\]', 'active:brightness-75'),
    (r'active:from-\[#E8610F\]', 'active:brightness-75'),
    (r'active:bg-\[#4A4A4A\]', 'active:brightness-95'),  # Keep gray pattern consistent
    
    # Hover gradient ends with orange
    (r'hover:to-\[#FF6B1A\]', 'hover:brightness-110'),
    
    # Any remaining orange focus states
    (r'focus:ring-\[#FF8C42\]', 'focus:ring-[var(--color-primary)]'),
    (r'focus:ring-\[#FF7A2B\]', 'focus:ring-[var(--color-accent)]'),
    (r'focus:border-\[#FF8C42\]', 'focus:border-[var(--color-primary)]'),
    (r'focus:border-\[#FF7A2B\]', 'focus:border-[var(--color-accent)]'),
]

def fix_file(file_path):
    """Fix brand colors in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        changes = []
        
        for old_pattern, new_value in REPLACEMENTS:
            matches = re.findall(old_pattern, content)
            if matches:
                count = len(matches)
                content = re.sub(old_pattern, new_value, content)
                changes.append(f"  {old_pattern} → {new_value} ({count}x)")
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            rel_path = file_path.relative_to(BASE_DIR)
            print(f"✓ {rel_path}")
            for change in changes:
                print(change)
            return True
        
        return False
        
    except Exception as e:
        print(f"✗ Error: {file_path}: {e}")
        return False

def main():
    print("🎨 Fixing ALL remaining brand colors (hover, active, focus)...\n")
    
    total_files = 0
    fixed_files = 0
    
    # Process all React/TypeScript files
    for ext in ['*.jsx', '*.tsx', '*.js', '*.ts']:
        for file_path in BASE_DIR.rglob(ext):
            if file_path.is_file():
                total_files += 1
                if fix_file(file_path):
                    fixed_files += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Complete! All brand colors now use CSS variables")
    print(f"   Files scanned: {total_files}")
    print(f"   Files fixed: {fixed_files}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
