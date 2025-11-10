#!/usr/bin/env python3
"""
Validation script for hockey game refactoring.
Verifies all modules work correctly.
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def check_imports() -> bool:
    """Verify all modules can be imported."""
    print("\n=== CHECKING IMPORTS ===")

    modules = [
        ('models', 'Player, Season, GoalieStats, PlayerData'),
        ('parser', 'parse_player_data, load_data_file'),
        ('scraper', 'HockeyDBScraper'),
        ('api_client', 'DirectusClient'),
        ('pipeline', 'main')
    ]

    failed = []

    for module, items in modules:
        try:
            exec(f"from {module} import {items}")
            print(f"  {module}: OK")
        except ImportError as e:
            print(f"  {module}: FAILED - {e}")
            failed.append(module)

    if failed:
        print(f"\nFAILED imports: {', '.join(failed)}")
        return False

    print("\nImports: OK - All modules loaded")
    return True


def check_data_file() -> bool:
    """Verify data_player.txt exists and is readable."""
    print("\n=== CHECKING DATA FILE ===")

    data_file = "C:\\Users\\Xena\\source\\repos\\hockeyGame\\data_player.txt"

    if not os.path.exists(data_file):
        print(f"FAILED - File not found: {data_file}")
        return False

    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = len(content.split('\n'))
        size = len(content)

        print(f"  File: {data_file}")
        print(f"  Size: {size} bytes")
        print(f"  Lines: {lines}")
        print("\nData file: OK")
        return True

    except Exception as e:
        print(f"FAILED - Error reading file: {e}")
        return False


def check_parser() -> bool:
    """Test parser functionality."""
    print("\n=== CHECKING PARSER ===")

    try:
        from parser import load_data_file

        data_file = "C:\\Users\\Xena\\source\\repos\\hockeyGame\\data_player.txt"
        players = load_data_file(data_file)

        if not players:
            print("FAILED - No players parsed")
            return False

        print(f"  Players parsed: {len(players)}")

        total_seasons = sum(len(p.seasons) for p in players)
        total_goalie = sum(len(p.goalie_stats) for p in players)

        print(f"  Season records: {total_seasons}")
        print(f"  Goalie records: {total_goalie}")

        # Show first 3 players
        print("\n  Sample players:")
        for i, player_data in enumerate(players[:3], 1):
            stats_count = len(player_data.seasons) + len(player_data.goalie_stats)
            print(f"    {i}. {player_data.player.name} ({stats_count} seasons)")

        print("\nParser: OK")
        return True

    except Exception as e:
        print(f"FAILED - Parser error: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_models() -> bool:
    """Test data models."""
    print("\n=== CHECKING MODELS ===")

    try:
        from models import Player, Season, GoalieStats, PlayerData

        # Test Player
        player = Player(
            name="Test Player",
            position="Center -- shoots L",
            birth_date="Jan 1 1990",
            birth_place="Test City, USA",
            height="6.01",
            weight="200",
            shoots="L",
            draft_info="Test Draft Info"
        )

        player_dict = player.to_dict()
        assert player_dict['name'] == "Test Player"
        print("  Player model: OK")

        # Test Season
        season = Season(
            season="2024-25",
            team="Test Team",
            league="NHL",
            gp=82,
            g=30,
            a=40,
            pts=70,
            pim=20
        )

        season_dict = season.to_dict()
        assert season_dict['games_played'] == 82
        print("  Season model: OK")

        # Test GoalieStats
        goalie = GoalieStats(
            season="2024-25",
            team="Test Team",
            league="NHL",
            gp=60,
            minutes=3600,
            ga=150,
            gaa=2.50,
            wins=35,
            losses=20,
            ties=5,
            saves=1800,
            save_pct=0.923,
            shutouts=5
        )

        goalie_dict = goalie.to_dict()
        assert goalie_dict['wins'] == 35
        print("  GoalieStats model: OK")

        # Test PlayerData
        player_data = PlayerData(
            player=player,
            seasons=[season]
        )

        assert len(player_data.seasons) == 1
        print("  PlayerData model: OK")

        print("\nModels: OK - All dataclasses working")
        return True

    except Exception as e:
        print(f"FAILED - Models error: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_requirements() -> bool:
    """Check if required packages are installed."""
    print("\n=== CHECKING REQUIREMENTS ===")

    packages = [
        ('selenium', 'selenium'),
        ('requests', 'requests'),
        ('webdriver_manager', 'webdriver-manager')
    ]

    missing = []

    for import_name, package_name in packages:
        try:
            __import__(import_name)
            print(f"  {package_name}: OK")
        except ImportError:
            print(f"  {package_name}: MISSING")
            missing.append(package_name)

    if missing:
        print(f"\nMissing packages: {', '.join(missing)}")
        print("Install with: pip install -r requirements.txt")
        return False

    print("\nRequirements: OK - All packages installed")
    return True


def check_structure() -> bool:
    """Verify directory structure."""
    print("\n=== CHECKING STRUCTURE ===")

    base = Path("C:/Users/Xena/source/repos/hockeyGame/src/python")

    required_files = [
        'models.py',
        'parser.py',
        'scraper.py',
        'api_client.py',
        'pipeline.py',
        'test_parser.py',
        'requirements.txt',
        'README.txt'
    ]

    missing = []

    for file in required_files:
        file_path = base / file
        if file_path.exists():
            print(f"  {file}: OK")
        else:
            print(f"  {file}: MISSING")
            missing.append(file)

    if missing:
        print(f"\nMissing files: {', '.join(missing)}")
        return False

    print("\nStructure: OK - All files present")
    return True


def main() -> int:
    """Run all validation checks."""
    print("=" * 50)
    print("HOCKEY GAME REFACTORING VALIDATION")
    print("=" * 50)

    checks = [
        ("Structure", check_structure),
        ("Requirements", check_requirements),
        ("Imports", check_imports),
        ("Models", check_models),
        ("Data File", check_data_file),
        ("Parser", check_parser)
    ]

    results = {}

    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"\n{name}: FAILED - Unexpected error: {e}")
            results[name] = False

    # Summary
    print("\n" + "=" * 50)
    print("VALIDATION SUMMARY")
    print("=" * 50)

    for name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {name}: {status}")

    passed_count = sum(results.values())
    total_count = len(results)

    print(f"\nTotal: {passed_count}/{total_count} checks passed")

    if passed_count == total_count:
        print("\n=== ALL CHECKS PASSED ===")
        print("Refactoring validated successfully!")
        return 0
    else:
        print("\n=== SOME CHECKS FAILED ===")
        print("Review errors above")
        return 1


if __name__ == "__main__":
    exit(main())
