#!/usr/bin/env python3
"""
Hockey Game Project Cleanup Script
Organizes project into clean HTML/CSS/JS structure
Returns: 0 = success, 1 = failure
"""

import os
import shutil
from pathlib import Path

def main():
    print("=== HOCKEY GAME PROJECT CLEANUP ===")
    print()

    # Define base paths
    base_dir = Path(__file__).parent
    archive_dir = base_dir / "archive"
    claude_dir = base_dir / ".claude"

    # Files to delete (broken/obsolete)
    files_to_delete = [
        "claudtest.py",           # Broken imports
        "test_player_.py",        # JavaScript in .py file
        "fetchdata.py",           # Incomplete, replaced by src/python/scraper.py
        "scraped_content.txt",    # Working file
        "page_content.txt",       # Working file
    ]

    # Files to archive (old versions, keep for reference)
    files_to_archive = [
        "hockey.html",            # Old version
        "hockeydb.html",          # Old version
        "crosbytable.html",       # Old version
        "homepage_directus.html", # Abandoned CMS
        "homepage_directus_version_two.html",  # Abandoned CMS
        "exmple_version_1.PNG",   # Screenshot
        "photodb.PNG",            # Screenshot
        "384513865_330830852761007_7516720916155757911_n.png",  # Asset
        "data_player.txt",        # Raw data (archive, src/python has processed version)
        "extract_information_from_table.py",  # Old version, replaced by src/python/
        "EXECUTIVE_SUMMARY.txt",  # Move to .claude/docs/
        "REFACTORING_SUMMARY.txt", # Move to .claude/docs/
        "ANALYSIS_SUMMARY.txt",   # Move to .claude/docs/
    ]

    # Files to move
    files_to_move = {
        "CLAUDE.md": claude_dir / "CLAUDE.md",
    }

    # Create archive directory
    try:
        archive_dir.mkdir(exist_ok=True)
        print(f"Step 1: OK - Created archive directory")
    except Exception as e:
        print(f"Step 1: FAILED - {e}")
        return 1

    # Delete files
    deleted_count = 0
    for filename in files_to_delete:
        filepath = base_dir / filename
        try:
            if filepath.exists():
                filepath.unlink()
                deleted_count += 1
                print(f"Deleted: {filename}")
        except Exception as e:
            print(f"Step 2: FAILED - Could not delete {filename}: {e}")
            return 1
    print(f"Step 2: OK - Deleted {deleted_count} files")

    # Archive files
    archived_count = 0
    for filename in files_to_archive:
        filepath = base_dir / filename
        try:
            if filepath.exists():
                dest = archive_dir / filename
                shutil.move(str(filepath), str(dest))
                archived_count += 1
                print(f"Archived: {filename}")
        except Exception as e:
            print(f"Step 3: FAILED - Could not archive {filename}: {e}")
            return 1
    print(f"Step 3: OK - Archived {archived_count} files")

    # Move files to .claude
    moved_count = 0
    for src_name, dest_path in files_to_move.items():
        src_path = base_dir / src_name
        try:
            if src_path.exists():
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src_path), str(dest_path))
                moved_count += 1
                print(f"Moved: {src_name} -> {dest_path.relative_to(base_dir)}")
        except Exception as e:
            print(f"Step 4: FAILED - Could not move {src_name}: {e}")
            return 1
    print(f"Step 4: OK - Moved {moved_count} files to .claude/")

    # Validate final structure
    print()
    print("=== VALIDATION ===")

    required_files = [
        "hockey_version_25oct.html",
        "src/game.js",
        "src/styles.css",
        "src/python/models.py",
        "src/python/parser.py",
        "src/python/scraper.py",
        "src/python/api_client.py",
        "src/python/pipeline.py",
        ".claude/docs/PROJECT_OVERVIEW.md",
        ".claude/docs/GAME_RULES.md",
        ".claude/docs/DATA_SCHEMA.md",
    ]

    missing_files = []
    for filepath in required_files:
        if not (base_dir / filepath).exists():
            missing_files.append(filepath)
            print(f"Missing: {filepath}")

    if missing_files:
        print(f"Validation: FAILED - {len(missing_files)} required files missing")
        return 1

    print(f"Validation: OK - All required files present")

    # Print final structure
    print()
    print("=== FINAL PROJECT STRUCTURE ===")
    print("Root:")
    print("  hockey_version_25oct.html (main game file)")
    print("  .gitignore")
    print()
    print("src/")
    print("  game.js (game logic)")
    print("  styles.css (styles)")
    print("  python/")
    print("    models.py, parser.py, scraper.py")
    print("    api_client.py, pipeline.py")
    print("    requirements.txt, test_parser.py")
    print()
    print(".claude/")
    print("  CLAUDE.md (project rules)")
    print("  docs/")
    print("    PROJECT_OVERVIEW.md")
    print("    GAME_RULES.md")
    print("    DATA_SCHEMA.md")
    print()
    print("archive/")
    print(f"  {archived_count} archived files")
    print()
    print("=== CLEANUP COMPLETE ===")
    return 0

if __name__ == "__main__":
    exit(main())
