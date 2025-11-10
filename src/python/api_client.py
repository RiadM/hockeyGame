"""
Directus API client for uploading hockey player data.
Handles authentication and CRUD operations.
"""
import os
import json
from typing import Optional, List, Dict, Any
import requests


class DirectusClient:
    """Client for Directus CMS API."""

    def __init__(self, api_url: Optional[str] = None, token: Optional[str] = None):
        """
        Initialize Directus client.

        Args:
            api_url: Directus API base URL (default: from DIRECTUS_URL env var)
            token: Directus access token (default: from DIRECTUS_TOKEN env var)
        """
        self.api_url = api_url or os.getenv('DIRECTUS_URL', 'http://localhost:8055')
        self.token = token or os.getenv('DIRECTUS_TOKEN', '')

        if not self.token:
            raise ValueError("Directus token not provided (set DIRECTUS_TOKEN env var)")

        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        Make HTTP request to Directus API.

        Args:
            method: HTTP method (GET, POST, PATCH, DELETE)
            endpoint: API endpoint (e.g., 'items/players')
            data: Request body data

        Returns:
            Response JSON or None on failure
        """
        url = f"{self.api_url}/{endpoint}"

        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers)
            elif method == 'POST':
                response = requests.post(
                    url,
                    headers=self.headers,
                    data=json.dumps(data) if data else None
                )
            elif method == 'PATCH':
                response = requests.patch(
                    url,
                    headers=self.headers,
                    data=json.dumps(data) if data else None
                )
            elif method == 'DELETE':
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"API Error ({method} {endpoint}): {e}")
            return None

    def create_player(self, player_data: Dict[str, Any]) -> Optional[int]:
        """
        Create a new player record.

        Args:
            player_data: Player data dictionary

        Returns:
            Player ID if successful, None otherwise
        """
        result = self._make_request('POST', 'items/players', player_data)

        if result and 'data' in result:
            player_id = result['data'].get('id')
            print(f"Player created: ID={player_id}, Name={player_data.get('name')}")
            return player_id

        print(f"Failed to create player: {player_data.get('name')}")
        return None

    def create_statistics(
        self,
        player_id: int,
        statistics: List[Dict[str, Any]]
    ) -> bool:
        """
        Create multiple statistics records for a player.

        Args:
            player_id: Player ID to associate stats with
            statistics: List of statistics dictionaries

        Returns:
            True if all successful, False otherwise
        """
        # Add player_id to each statistic
        stats_with_player = [
            {**stat, 'player_id': player_id}
            for stat in statistics
        ]

        result = self._make_request('POST', 'items/statistics', stats_with_player)

        if result:
            count = len(statistics)
            print(f"Statistics created: {count} records for player {player_id}")
            return True

        print(f"Failed to create statistics for player {player_id}")
        return False

    def get_player_by_name(self, name: str) -> Optional[Dict]:
        """
        Find player by name.

        Args:
            name: Player name to search for

        Returns:
            Player data if found, None otherwise
        """
        endpoint = f"items/players?filter[name][_eq]={name}"
        result = self._make_request('GET', endpoint)

        if result and 'data' in result and result['data']:
            return result['data'][0]

        return None

    def update_player(self, player_id: int, updates: Dict[str, Any]) -> bool:
        """
        Update player record.

        Args:
            player_id: Player ID to update
            updates: Dictionary of fields to update

        Returns:
            True if successful, False otherwise
        """
        result = self._make_request('PATCH', f'items/players/{player_id}', updates)

        if result:
            print(f"Player updated: ID={player_id}")
            return True

        print(f"Failed to update player: ID={player_id}")
        return False

    def delete_player(self, player_id: int) -> bool:
        """
        Delete player record.

        Args:
            player_id: Player ID to delete

        Returns:
            True if successful, False otherwise
        """
        result = self._make_request('DELETE', f'items/players/{player_id}')

        if result is not None:
            print(f"Player deleted: ID={player_id}")
            return True

        print(f"Failed to delete player: ID={player_id}")
        return False

    def bulk_create_players(self, players_data: List[Dict]) -> List[int]:
        """
        Create multiple players in batch.

        Args:
            players_data: List of player data dictionaries

        Returns:
            List of created player IDs
        """
        created_ids = []

        for player_data in players_data:
            player_id = self.create_player(player_data)
            if player_id:
                created_ids.append(player_id)

        return created_ids


def upload_player_data(
    player_data,  # PlayerData from models.py
    client: DirectusClient
) -> bool:
    """
    Upload complete player data to Directus.

    Args:
        player_data: PlayerData object
        client: DirectusClient instance

    Returns:
        True if successful, False otherwise
    """
    # Create player record
    player_id = client.create_player(player_data.player.to_dict())

    if not player_id:
        return False

    # Upload season statistics
    if player_data.seasons:
        stats = [season.to_dict() for season in player_data.seasons]
        if not client.create_statistics(player_id, stats):
            print(f"Warning: Failed to upload stats for {player_data.player.name}")

    # Upload goalie statistics
    if player_data.goalie_stats:
        stats = [gs.to_dict() for gs in player_data.goalie_stats]
        if not client.create_statistics(player_id, stats):
            print(f"Warning: Failed to upload goalie stats for {player_data.player.name}")

    return True
