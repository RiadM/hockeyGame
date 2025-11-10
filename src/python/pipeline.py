#!/usr/bin/env python3
"""
Complete hockey data pipeline: scrape -> parse -> upload
Comprehensive script following one-execution principle.
"""
import sys
import os
from typing import List
from pathlib import Path

# Add src/python to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from models import PlayerData
from parser import load_data_file, parse_player_data
from scraper import HockeyDBScraper
from api_client import DirectusClient, upload_player_data


def validate_environment() -> bool:
    """
    Validate environment variables are set.

    Returns:
        True if valid, False otherwise
    """
    required = ['DIRECTUS_URL', 'DIRECTUS_TOKEN']
    missing = [var for var in required if not os.getenv(var)]

    if missing:
        print(f"FAILED - Missing environment variables: {', '.join(missing)}")
        print("Set with:")
        for var in missing:
            print(f"  export {var}=<value>")
        return False

    return True


def scrape_players(player_ids: List[int], output_dir: str = '.') -> bool:
    """
    Scrape players from HockeyDB.

    Args:
        player_ids: List of player IDs to scrape
        output_dir: Directory to save scraped data

    Returns:
        True if all successful, False otherwise
    """
    print("\n=== SCRAPING PLAYERS ===")

    try:
        with HockeyDBScraper(headless=True) as scraper:
            success_count = 0

            for player_id in player_ids:
                content = scraper.scrape_player_by_id(player_id)

                if content:
                    file_path = f"{output_dir}/player_{player_id}.txt"
                    if scraper.save_to_file(content, file_path):
                        success_count += 1

            print(f"\nScraping: OK - {success_count}/{len(player_ids)} players")
            return success_count == len(player_ids)

    except Exception as e:
        print(f"\nScraping: FAILED - {e}")
        return False


def parse_data_file(file_path: str) -> List[PlayerData]:
    """
    Parse player data from file.

    Args:
        file_path: Path to data file

    Returns:
        List of PlayerData objects
    """
    print(f"\n=== PARSING DATA FILE ===")
    print(f"File: {file_path}")

    try:
        if not os.path.exists(file_path):
            print(f"FAILED - File not found: {file_path}")
            return []

        players = load_data_file(file_path)
        print(f"Parsing: OK - {len(players)} players found")

        for i, player_data in enumerate(players, 1):
            stats_count = len(player_data.seasons) + len(player_data.goalie_stats)
            print(f"  {i}. {player_data.player.name} ({stats_count} seasons)")

        return players

    except Exception as e:
        print(f"Parsing: FAILED - {e}")
        return []


def upload_data(players: List[PlayerData]) -> bool:
    """
    Upload player data to Directus.

    Args:
        players: List of PlayerData objects

    Returns:
        True if all successful, False otherwise
    """
    print("\n=== UPLOADING TO DIRECTUS ===")

    if not validate_environment():
        return False

    try:
        client = DirectusClient()
        success_count = 0

        for player_data in players:
            if upload_player_data(player_data, client):
                success_count += 1
            else:
                print(f"FAILED - {player_data.player.name}")

        print(f"\nUpload: OK - {success_count}/{len(players)} players")
        return success_count == len(players)

    except Exception as e:
        print(f"\nUpload: FAILED - {e}")
        return False


def main() -> int:
    """
    Main pipeline execution.

    Returns:
        0 on success, 1 on failure
    """
    print("=== HOCKEY DATA PIPELINE ===\n")

    # Configuration
    data_file = "C:\\Users\\Xena\\source\\repos\\hockeyGame\\data_player.txt"

    # Step 1: Parse data file
    players = parse_data_file(data_file)

    if not players:
        print("\n=== PIPELINE FAILED ===")
        print("No players parsed from data file")
        return 1

    # Step 2: Upload to Directus (optional - requires environment vars)
    if os.getenv('DIRECTUS_TOKEN'):
        if not upload_data(players):
            print("\n=== PIPELINE FAILED ===")
            print("Upload failed")
            return 1
    else:
        print("\n=== UPLOAD SKIPPED ===")
        print("Set DIRECTUS_TOKEN environment variable to enable upload")

    # Validation summary
    print("\n=== VALIDATION ===")
    total_seasons = sum(len(p.seasons) for p in players)
    total_goalie = sum(len(p.goalie_stats) for p in players)

    print(f"Players parsed: {len(players)}")
    print(f"Season records: {total_seasons}")
    print(f"Goalie records: {total_goalie}")

    print("\n=== PIPELINE COMPLETE ===")
    return 0


if __name__ == "__main__":
    exit(main())
