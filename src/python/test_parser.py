"""
Tests for parser module.
Run with: python test_parser.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from parser import parse_player_data, load_data_file


def test_parse_stamkos():
    """Test parsing Steven Stamkos data."""
    # Use tab-delimited format like actual data
    test_data = """Steven Stamkos
Center -- shoots R
Born Feb 7 1990 -- Markham, ONT
[34 yrs. ago]
Height 6.01 -- Weight 193 [185 cm/88 kg]
Drafted by Tampa Bay Lightning
- round 1 #1 overall 2008 NHL Entry Draft

	Regular Season 	Playoffs
Season 	Team 	Lge 	GP 	G 	A 	Pts 	PIM 	+/- 	GP 	G 	A 	Pts 	PIM
2008-09 	Tampa Bay Lightning 	NHL 	79 	23 	23 	46 	39 	-13 	-- 	-- 	-- 	-- 	--
2009-10 	Tampa Bay Lightning 	NHL 	82 	51 	44 	95 	38 	-2 	-- 	-- 	-- 	-- 	--"""

    player_data = parse_player_data(test_data)

    # Validate player info
    assert player_data.player.name == "Steven Stamkos", f"Name was: {player_data.player.name}"
    assert "Center" in player_data.player.position, f"Position was: {player_data.player.position}"
    assert player_data.player.birth_place and "Markham" in player_data.player.birth_place
    assert player_data.player.height == "6.01"
    assert player_data.player.draft_info and "Tampa Bay Lightning" in player_data.player.draft_info

    # Validate seasons
    assert len(player_data.seasons) >= 2, f"Got {len(player_data.seasons)} seasons"

    first_season = player_data.seasons[0]
    assert first_season.season == "2008-09"
    assert first_season.team == "Tampa Bay Lightning"
    assert first_season.league == "NHL"
    assert first_season.gp == 79
    assert first_season.g == 23
    assert first_season.a == 23
    assert first_season.pts == 46

    print("OK - test_parse_stamkos passed")


def test_parse_goalie():
    """Test parsing goalie data."""
    test_data = """Jacob Fowler
Goalie -- catches L
Born Nov 24 2004 -- Melbourne, FL

	RS Scoring 	RS Goalie Stats
Season 	Team 	Lge 	GP 	A 	PIM 	Min 	GA 	EN 	SO 	GAA 	W 	L 	T 	Svs 	Pct
2023-24 	Boston College 	H-East 	39 	2 	0 	2327 	83 	0 	3 	2.14 	32 	6 	1 	103 	0.926"""

    player_data = parse_player_data(test_data)

    # Validate player info
    assert player_data.player.name == "Jacob Fowler", f"Name was: {player_data.player.name}"
    assert "Goalie" in player_data.player.position, f"Position was: {player_data.player.position}"

    # Validate goalie stats
    assert len(player_data.goalie_stats) >= 1, f"Got {len(player_data.goalie_stats)} goalie stats"

    stats = player_data.goalie_stats[0]
    assert stats.season == "2023-24"
    assert stats.team == "Boston College"
    assert stats.gaa == 2.14
    assert stats.wins == 32

    print("OK - test_parse_goalie passed")


def test_load_data_file():
    """Test loading real data file."""
    file_path = "C:\\Users\\Xena\\source\\repos\\hockeyGame\\data_player.txt"

    try:
        players = load_data_file(file_path)

        print(f"\nLoaded {len(players)} players from data_player.txt:")
        for i, player_data in enumerate(players[:5], 1):  # Show first 5
            stats_count = len(player_data.seasons) + len(player_data.goalie_stats)
            print(f"  {i}. {player_data.player.name} ({stats_count} seasons)")

        assert len(players) > 0
        print("\nOK - test_load_data_file passed")

    except FileNotFoundError:
        print("SKIP - data_player.txt not found")


def main():
    """Run all tests."""
    print("=== PARSER TESTS ===\n")

    tests = [
        test_parse_stamkos,
        test_parse_goalie,
        test_load_data_file
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"FAILED - {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"ERROR - {test.__name__}: {e}")
            failed += 1

    print(f"\n=== RESULTS ===")
    print(f"Passed: {passed}/{len(tests)}")
    print(f"Failed: {failed}/{len(tests)}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit(main())
