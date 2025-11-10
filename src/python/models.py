"""
Data models for hockey player information.
"""
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Player:
    """Player biographical information."""
    name: str
    position: str
    birth_date: Optional[str] = None
    birth_place: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    shoots: Optional[str] = None
    draft_info: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for API serialization."""
        return {
            'name': self.name,
            'position': self.position,
            'birth_date': self.birth_date,
            'birth_place': self.birth_place,
            'height': self.height,
            'weight': self.weight,
            'shoots': self.shoots,
            'draft_info': self.draft_info
        }


@dataclass
class Season:
    """Player season statistics."""
    season: str
    team: str
    league: str
    gp: int
    g: int
    a: int
    pts: int
    pim: int
    plus_minus: Optional[str] = None
    playoff_gp: int = 0
    playoff_g: int = 0
    playoff_a: int = 0
    playoff_pts: int = 0
    playoff_pim: int = 0

    def to_dict(self) -> dict:
        """Convert to dictionary for API serialization."""
        return {
            'season': self.season,
            'team': self.team,
            'league': self.league,
            'games_played': self.gp,
            'goals': self.g,
            'assists': self.a,
            'points': self.pts,
            'penalty_minutes': self.pim,
            'plus_minus': self.plus_minus,
            'playoff_gp': self.playoff_gp,
            'playoff_g': self.playoff_g,
            'playoff_a': self.playoff_a,
            'playoff_pts': self.playoff_pts,
            'playoff_pim': self.playoff_pim
        }


@dataclass
class GoalieStats:
    """Goalie season statistics."""
    season: str
    team: str
    league: str
    gp: int
    minutes: int
    ga: int
    gaa: float
    wins: int
    losses: int
    ties: int
    saves: int
    save_pct: float
    shutouts: int = 0

    def to_dict(self) -> dict:
        """Convert to dictionary for API serialization."""
        return {
            'season': self.season,
            'team': self.team,
            'league': self.league,
            'games_played': self.gp,
            'minutes': self.minutes,
            'goals_against': self.ga,
            'gaa': self.gaa,
            'wins': self.wins,
            'losses': self.losses,
            'ties': self.ties,
            'saves': self.saves,
            'save_percentage': self.save_pct,
            'shutouts': self.shutouts
        }


@dataclass
class PlayerData:
    """Complete player data with stats."""
    player: Player
    seasons: List[Season] = field(default_factory=list)
    goalie_stats: List[GoalieStats] = field(default_factory=list)
