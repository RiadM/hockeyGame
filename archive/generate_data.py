#!/usr/bin/env python3
"""
Generate player data JSON for frontend from archived data_player.txt
Returns: 0 = success, 1 = failure
"""

import json
import sys
from pathlib import Path

# Add src/python to path
sys.path.insert(0, str(Path(__file__).parent / "src" / "python"))

from parser import parse_player_data

def main():
    print("=== GENERATING PLAYER DATA JSON ===")

    # Read archived data file
    data_file = Path(__file__).parent / "archive" / "data_player.txt"

    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"Step 1: OK - Read {len(content)} bytes from data_player.txt")
    except FileNotFoundError:
        print(f"Step 1: FAILED - File not found: {data_file}")
        return 1
    except Exception as e:
        print(f"Step 1: FAILED - {e}")
        return 1

    # Split by players (separated by 4+ blank lines)
    player_blocks = content.split('\n\n\n\n')
    player_blocks = [block.strip() for block in player_blocks if block.strip()]

    print(f"Step 2: OK - Found {len(player_blocks)} player blocks")

    # Parse each player
    players_json = []
    for i, block in enumerate(player_blocks):
        try:
            player_data = parse_player_data(block)

            # Filter out goalie players (we want skaters for the game)
            if player_data.goalie_stats:
                print(f"  Skipping goalie: {player_data.player.name}")
                continue

            # Filter out players with too few NHL seasons (game needs reasonable data)
            nhl_seasons = [s for s in player_data.seasons if s.league == 'NHL']
            if len(nhl_seasons) < 2:
                print(f"  Skipping {player_data.player.name}: only {len(nhl_seasons)} NHL season(s)")
                continue

            player_dict = {
                "name": player_data.player.name,
                "position": player_data.player.position,
                "birth_date": player_data.player.birth_date,
                "birth_place": player_data.player.birth_place,
                "height": player_data.player.height,
                "weight": player_data.player.weight,
                "shoots": player_data.player.shoots,
                "draft_info": player_data.player.draft_info,
                "seasons": [
                    {
                        "season": s.season,
                        "team": s.team,
                        "league": s.league,
                        "gp": s.gp,
                        "g": s.g,
                        "a": s.a,
                        "pts": s.pts,
                        "pim": s.pim,
                        "plus_minus": s.plus_minus if hasattr(s, 'plus_minus') else None,
                        "playoff_gp": s.playoff_gp,
                        "playoff_g": s.playoff_g,
                        "playoff_a": s.playoff_a,
                        "playoff_pts": s.playoff_pts,
                        "playoff_pim": s.playoff_pim
                    }
                    for s in player_data.seasons
                ]
            }
            players_json.append(player_dict)
            print(f"  Parsed: {player_data.player.name} ({len(player_data.seasons)} seasons)")
        except Exception as e:
            print(f"  ERROR parsing player block {i+1}: {e}")
            continue

    print(f"Step 3: OK - Converted {len(players_json)} players to JSON format")

    # Write to src/data.js
    output_file = Path(__file__).parent / "src" / "data.js"

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("// Auto-generated player data\n")
            f.write("const PLAYERS_DATA = ")
            f.write(json.dumps(players_json, indent=2))
            f.write(";\n\n")
            f.write("// Export for use in game.js\n")
            f.write("if (typeof module !== 'undefined' && module.exports) {\n")
            f.write("    module.exports = PLAYERS_DATA;\n")
            f.write("}\n")
        print(f"Step 4: OK - Wrote data to {output_file}")
    except Exception as e:
        print(f"Step 4: FAILED - {e}")
        return 1

    # Print summary
    print()
    print("=== PLAYER DATA SUMMARY ===")
    for player in players_json:
        print(f"- {player['name']}: {len(player['seasons'])} seasons ({player['position']})")

    print()
    print("=== GENERATION COMPLETE ===")
    return 0

if __name__ == "__main__":
    exit(main())
