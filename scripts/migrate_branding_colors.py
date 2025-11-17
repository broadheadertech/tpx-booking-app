#!/usr/bin/env python3
"""
Batch replace hardcoded orange colors with CSS variables from BrandingContext.
This script migrates all orange hex colors to use CSS custom properties.
"""

import os
import re
from pathlib import Path

# Color mappings
REPLACEMENTS = [
    # Primary orange
    (r'#FF8C42', 'var(--color-primary)'),
    # Accent orange
    (r'#FF7A2B', 'var(--color-accent)'),
]

# Directories to process
DIRECTORIES = [
    'src/components',
    'src/pages',
    'src/services',
]

# File extensions to process
EXTENSIONS = ['.jsx', '.tsx', '.js', '.ts', '.css']

def should_process_file(file_path):
    """Check if file should be processed."""
    return any(str(file_path).endswith(ext) for ext in EXTENSIONS)

def migrate_file(file_path):
    """Migrate a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = False
        
        # Apply each replacement
        for old_pattern, new_value in REPLACEMENTS:
            if old_pattern in content:
                content = content.replace(old_pattern, new_value)
                changes_made = True
        
        # Write back if changes were made
        if changes_made:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Count occurrences
            old_count = sum(original_content.count(old) for old, _ in REPLACEMENTS)
            print(f"✓ {file_path}: Replaced {old_count} occurrences")
            return True
        
        return False
    
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False

def main():
    """Main migration function."""
    base_dir = Path('/Users/dale/Documents/tpx-booking-app')
    
    print("🎨 Starting branding color migration...")
    print(f"Base directory: {base_dir}")
    print()
    
    total_files = 0
    migrated_files = 0
    
    # Process each directory
    for directory in DIRECTORIES:
        dir_path = base_dir / directory
        
        if not dir_path.exists():
            print(f"⚠ Directory not found: {dir_path}")
            continue
        
        print(f"\n📁 Processing {directory}...")
        
        # Walk through all files
        for file_path in dir_path.rglob('*'):
            if file_path.is_file() and should_process_file(file_path):
                total_files += 1
                if migrate_file(file_path):
                    migrated_files += 1
    
    print()
    print("="*60)
    print(f"✅ Migration complete!")
    print(f"   Total files scanned: {total_files}")
    print(f"   Files migrated: {migrated_files}")
    print()
    print("🔧 Next steps:")
    print("   1. Run: npm run build")
    print("   2. Test the application")
    print("   3. Verify branding admin UI works correctly")
    print("="*60)

if __name__ == '__main__':
    main()
