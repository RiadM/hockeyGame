"""
Parser for hockey player text data.
Extracts player information and statistics from HockeyDB text format.
"""
import re
from typing import List, Tuple, Optional
from models import Player, Season, GoalieStats, PlayerData


def _safe_int(value: str, default: int = 0) -> int:
    """Convert string to int, return default if invalid."""
    if value in ('--', '', None):
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _safe_float(value: str, default: float = 0.0) -> float:
    """Convert string to float, return default if invalid."""
    if value in ('--', '', None):
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def parse_player_info(lines: List[str]) -> Player:
    """
    Extract player biographical information from text lines.

    Args:
        lines: List of text lines from player data

    Returns:
        Player object with extracted information
    """
    name = lines[0].strip() if lines else "Unknown"
    position = lines[1].strip() if len(lines) > 1 else "Unknown"

    birth_date = None
    birth_place = None
    height = None
    weight = None
    shoots = None
    draft_info = None

    # Extract biographical data
    for line in lines[:10]:
        # Birth info: "Born Feb 7 1990 -- Markham, ONT"
        if "Born" in line:
            match = re.search(r'Born\s+(.+?)\s+--\s+(.+?)(?:\[|$)', line)
            if match:
                birth_date = match.group(1).strip()
                birth_place = match.group(2).strip()

        # Height/Weight/Shoots: "Height 6.01 -- Weight 193 [185 cm/88 kg]"
        elif "Height" in line:
            match = re.search(r'Height\s+([\d.]+)', line)
            if match:
                height = match.group(1)
            match = re.search(r'Weight\s+([\d.]+)', line)
            if match:
                weight = match.group(1)

        # Shoots/Catches
        elif "shoots" in line.lower() or "catches" in line.lower():
            match = re.search(r'(shoots|catches)\s+([LR])', line, re.IGNORECASE)
            if match:
                shoots = match.group(2)

        # Draft info
        elif "NHL Entry Draft" in line or "Drafted by" in line:
            draft_info = line.strip()

    return Player(
        name=name,
        position=position,
        birth_date=birth_date,
        birth_place=birth_place,
        height=height,
        weight=weight,
        shoots=shoots,
        draft_info=draft_info
    )


def parse_season_stats(lines: List[str]) -> List[Season]:
    """
    Extract season statistics from text table.

    Args:
        lines: List of text lines containing season data

    Returns:
        List of Season objects
    """
    seasons = []

    # Find table start (after header line with GP, G, A, etc.)
    start_idx = 0
    for i, line in enumerate(lines):
        if re.search(r'\bGP\b.*\bG\b.*\bA\b.*\bPts\b', line, re.IGNORECASE):
            start_idx = i + 1
            break

    # Parse each season line
    for line in lines[start_idx:]:
        line = line.strip()

        # Skip empty, separator, or total lines
        if not line or '---' in line or 'Totals' in line or 'Awards' in line or 'Tournaments' in line:
            continue

        # Split by tabs first (data format uses tabs), then spaces
        if '\t' in line:
            parts = [p.strip() for p in line.split('\t') if p.strip()]
        else:
            parts = line.split()

        # Need at least: season, team, league, GP, G, A, Pts, PIM
        if len(parts) < 8:
            continue

        # Skip non-season lines (Awards, Tournaments, etc.)
        if not re.match(r'\d{4}-\d{2}', parts[0]):
            continue

        try:
            season = parts[0]

            # Find league (OHL, NHL, AHL, etc.) - typically 2-5 char uppercase
            league_idx = None
            for i, part in enumerate(parts[1:], 1):
                if re.match(r'^[A-Z]{2,}[A-Z0-9-]*$', part.replace('-', '').replace('🏆', '')):
                    league_idx = i
                    break

            if league_idx is None:
                continue

            # Team is everything between season and league
            team = ' '.join(parts[1:league_idx]).replace('🏆', '').strip()
            league = parts[league_idx].replace('🏆', '').strip()

            # Stats start after league
            stats_start = league_idx + 1
            stat_parts = parts[stats_start:]

            # Need at least 5 values: GP, G, A, Pts, PIM
            if len(stat_parts) < 5:
                continue

            gp = _safe_int(stat_parts[0])
            g = _safe_int(stat_parts[1])
            a = _safe_int(stat_parts[2])
            pts = _safe_int(stat_parts[3])
            pim = _safe_int(stat_parts[4])

            plus_minus = stat_parts[5] if len(stat_parts) > 5 and stat_parts[5] not in ('--', '') else None

            # Playoff stats (if present)
            playoff_gp = _safe_int(stat_parts[6]) if len(stat_parts) > 6 else 0
            playoff_g = _safe_int(stat_parts[7]) if len(stat_parts) > 7 else 0
            playoff_a = _safe_int(stat_parts[8]) if len(stat_parts) > 8 else 0
            playoff_pts = _safe_int(stat_parts[9]) if len(stat_parts) > 9 else 0
            playoff_pim = _safe_int(stat_parts[10]) if len(stat_parts) > 10 else 0

            seasons.append(Season(
                season=season,
                team=team,
                league=league,
                gp=gp,
                g=g,
                a=a,
                pts=pts,
                pim=pim,
                plus_minus=plus_minus,
                playoff_gp=playoff_gp,
                playoff_g=playoff_g,
                playoff_a=playoff_a,
                playoff_pts=playoff_pts,
                playoff_pim=playoff_pim
            ))

        except (ValueError, IndexError) as e:
            # Skip lines that can't be parsed
            continue

    return seasons


def parse_goalie_stats(lines: List[str]) -> List[GoalieStats]:
    """
    Extract goalie statistics from text table.

    Args:
        lines: List of text lines containing goalie data

    Returns:
        List of GoalieStats objects
    """
    stats = []

    # Find goalie table start
    start_idx = 0
    for i, line in enumerate(lines):
        if re.search(r'\bMin\b.*\bGA\b.*\bGAA\b', line, re.IGNORECASE):
            start_idx = i + 1
            break

    if start_idx == 0:
        return []

    for line in lines[start_idx:]:
        line = line.strip()

        if not line or '---' in line:
            continue

        parts = line.split()

        if len(parts) < 10:
            continue

        # Skip non-season lines
        if not re.match(r'\d{4}-\d{2}', parts[0]):
            continue

        try:
            season = parts[0]

            # Find league
            league_idx = None
            for i, part in enumerate(parts[1:], 1):
                if re.match(r'^[A-Z]{2,5}$', part):
                    league_idx = i
                    break

            if league_idx is None:
                continue

            team = ' '.join(parts[1:league_idx]).replace('🏆', '').strip()
            league = parts[league_idx]

            # Goalie stats: GP, A, PIM, Min, GA, EN, SO, GAA, W, L, T, Svs, Pct
            stat_parts = parts[league_idx + 1:]

            if len(stat_parts) < 10:
                continue

            gp = _safe_int(stat_parts[0])
            minutes = _safe_int(stat_parts[3])
            ga = _safe_int(stat_parts[4])
            shutouts = _safe_int(stat_parts[6])
            gaa = _safe_float(stat_parts[7])
            wins = _safe_int(stat_parts[8])
            losses = _safe_int(stat_parts[9])
            ties = _safe_int(stat_parts[10]) if len(stat_parts) > 10 else 0
            saves = _safe_int(stat_parts[11]) if len(stat_parts) > 11 else 0
            save_pct = _safe_float(stat_parts[12]) if len(stat_parts) > 12 else 0.0

            stats.append(GoalieStats(
                season=season,
                team=team,
                league=league,
                gp=gp,
                minutes=minutes,
                ga=ga,
                gaa=gaa,
                wins=wins,
                losses=losses,
                ties=ties,
                saves=saves,
                save_pct=save_pct,
                shutouts=shutouts
            ))

        except (ValueError, IndexError):
            continue

    return stats


def parse_player_data(text: str) -> PlayerData:
    """
    Parse complete player data from text format.

    Args:
        text: Complete player text data

    Returns:
        PlayerData object with player info and statistics
    """
    lines = text.strip().split('\n')

    player = parse_player_info(lines)

    # Check if goalie (has goalie stats table)
    is_goalie = any('GAA' in line for line in lines)

    if is_goalie:
        goalie_stats = parse_goalie_stats(lines)
        return PlayerData(player=player, goalie_stats=goalie_stats)
    else:
        seasons = parse_season_stats(lines)
        return PlayerData(player=player, seasons=seasons)


def parse_multiple_players(text: str) -> List[PlayerData]:
    """
    Parse multiple players from single text file.

    Players are separated by detecting name lines followed by position lines.

    Args:
        text: Text containing multiple players

    Returns:
        List of PlayerData objects
    """
    players = []
    lines = text.strip().split('\n')

    # Find player boundaries by detecting position lines
    player_starts = []
    for i, line in enumerate(lines):
        # Position line pattern: "Position -- shoots X" or "Goalie -- catches X"
        if re.search(r'(Center|Left Wing|Right Wing|Defense|Goalie|Wing)\s+--\s+(shoots|catches)\s+[LR]', line):
            # Player name is on previous non-empty line
            for j in range(i-1, max(0, i-5), -1):
                if lines[j].strip() and not lines[j].strip().startswith('['):
                    player_starts.append(j)
                    break

    # Parse each player section
    for i, start_idx in enumerate(player_starts):
        # Determine end of this player's data
        if i + 1 < len(player_starts):
            end_idx = player_starts[i + 1]
        else:
            end_idx = len(lines)

        # Extract player section
        player_lines = lines[start_idx:end_idx]
        player_text = '\n'.join(player_lines)

        try:
            player_data = parse_player_data(player_text)
            if player_data.player.name and player_data.player.name != "Unknown":
                players.append(player_data)
        except Exception as e:
            # Skip players that fail to parse
            continue

    return players


def load_data_file(file_path: str) -> List[PlayerData]:
    """
    Load and parse player data from file.

    Args:
        file_path: Path to data file

    Returns:
        List of PlayerData objects
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    return parse_multiple_players(content)
