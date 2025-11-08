import re
import requests
import json
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Player:
    name: str
    position: str
    birth_date: Optional[str]
    birth_place: Optional[str]
    height: Optional[str]
    weight: Optional[str]
    shoots: Optional[str]
    draft_info: Optional[str]

@dataclass
class Season:
    season: str
    team: str
    league: str
    gp: int
    g: int
    a: int
    pts: int
    pim: int
    playoff_gp: int
    playoff_g: int
    playoff_a: int
    playoff_pts: int
    playoff_pim: int

def parse_table(table_content: str) -> tuple[Player, List[Season]]:
    lines = table_content.strip().split('\n')
    
    # Extract player information
    name = lines[0].strip()
    position = lines[1].strip() if len(lines) > 1 else None

    # Initialize optional fields
    birth_date = birth_place = height = weight = shoots = draft_info = None

    # Try to extract birth info, height, weight, and shooting hand
    for line in lines[2:6]:
        if "Born" in line:
            birth_match = re.search(r'Born (.*?)(?:\s+--\s+(.*?))?$', line)
            if birth_match:
                birth_date, birth_place = birth_match.groups()
        elif "Height" in line or "Weight" in line:
            hw_match = re.search(r'Height (.*?)(?:\s+--\s+Weight (.*?)(?:\s+--\s+Shoots (.*?))?)?$', line)
            if hw_match:
                height, weight, shoots = hw_match.groups()

    # Try to extract draft info
    for line in lines:
        if "NHL Entry Draft" in line:
            draft_info = line.strip()
            break

    player = Player(
        name=name,
        position=position,
        birth_date=birth_date,
        birth_place=birth_place,
        height=height,
        weight=weight,
        shoots=shoots,
        draft_info=draft_info
    )

    # Extract season information
    seasons = []
    start_index = next((i for i, line in enumerate(lines) if '---' in line), -1) + 1
    for line in lines[start_index:]:
        if line.strip() and not line.startswith('---'):
            parts = line.split()
            if len(parts) >= 13 and parts[0] != 'NHL':
                try:
                    season = Season(
                        season=parts[0],
                        team=' '.join(parts[1:-11]),
                        league=parts[-11],
                        gp=int(parts[-10]),
                        g=int(parts[-9]),
                        a=int(parts[-8]),
                        pts=int(parts[-7]),
                        pim=int(parts[-6]),
                        playoff_gp=int(parts[-5]) if parts[-5] != '--' else 0,
                        playoff_g=int(parts[-4]) if parts[-4] != '--' else 0,
                        playoff_a=int(parts[-3]) if parts[-3] != '--' else 0,
                        playoff_pts=int(parts[-2]) if parts[-2] != '--' else 0,
                        playoff_pim=int(parts[-1]) if parts[-1] != '--' else 0
                    )
                    seasons.append(season)
                except ValueError:
                    # Skip lines that can't be parsed as a season
                    continue

    return player, seasons

# Example usage
table_content = """
Steven Stamkos hockey player photo 

Regular Season  Playoffs

Season  Team    Lge GP  G   A   Pts PIM +/- GP  G   A   Pts PIM

2006-07 Sarnia Sting    OHL 63  42  50  92  56  13  4   3   3   6   0

2007-08 Sarnia Sting    OHL 61  58  47  105 88  18  9   11  0   11  20

2008-09 Tampa Bay Lightning NHL 79  23  23  46  39  -13 --  --  --  --  --

2009-10 Tampa Bay Lightning NHL 82  51  44  95  38  -2  --  --  --  --  --

2010-11 Tampa Bay Lightning NHL 82  45  46  91  74  3   18  6   7   13  6

2011-12 Tampa Bay Lightning NHL 82  60  37  97  66  7   --  --  --  --  --

2012-13 Tampa Bay Lightning NHL 48  29  28  57  32  -4  --  --  --  --  --

2013-14 Tampa Bay Lightning NHL 37  25  15  40  18  9   4   2   2   4   6

2014-15 Tampa Bay Lightning NHL 82  43  29  72  49  2   26  7   11  18  20

2015-16 Tampa Bay Lightning NHL 77  36  28  64  38  3   1   0   0   0   0

2016-17 Tampa Bay Lightning NHL 17  9   11  20  14  3   --  --  --  --  --

2017-18 Tampa Bay Lightning NHL 78  27  59  86  72  18  17  7   9   16  4

2018-19 Tampa Bay Lightning NHL 82  45  53  98  37  4   4   1   1   2   2

2019-20 Tampa Bay Lightning 🏆   NHL 57  29  37  66  22  14  1   1   0   1   0

2020-21 Tampa Bay Lightning 🏆   NHL 38  17  17  34  16  4   23  8   10  18  4

2021-22 Tampa Bay Lightning NHL 81  42  64  106 36  24  23  11  8   19  25

2022-23 Tampa Bay Lightning NHL 81  34  50  84  46  -5  6   2   2   4   9

2023-24 Tampa Bay Lightning NHL 79  40  41  81  34  -21 5   5   1   6   2

2024-25 Nashville Predators NHL 4   0   0   0   4   -3                  

NHL Totals      1086    555 582 1137    635     128 50  51  101 78"""

player, seasons = parse_table(table_content)

print(f"Player: {player}\n\n")
for season in seasons[:3]:  # Print first 3 seasons as an example
    print(f"Season: {season}\n")



# Define your Directus API URL and Access Token
api_url = 'http://localhost:8055'  # Replace with your Directus API URL
token = 'uUF_rNee6ZwD_kstrvFcc9nnxGdboTuD'  # Replace with your Directus API access token

# Define the headers for authentication and content type
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Function to create a new player
def create_player(player_data):
    try:
        response = requests.post(f'{api_url}/items/players', headers=headers, data=json.dumps(player_data))
        response.raise_for_status()
        player = response.json()
        print('Player created successfully:', player)
        return player['data']['id']  # Return the player ID
    except requests.exceptions.RequestException as e:
        print(f"Error creating player: {e}")
        return None

# Function to create multiple statistics entries for the player
def create_statistics(statistics_data):
    try:
        response = requests.post(f'{api_url}/items/statistics', headers=headers, data=json.dumps(statistics_data))
        response.raise_for_status()
        statistics = response.json()
        print('Statistics created successfully:', statistics)
    except requests.exceptions.RequestException as e:
        print(f"Error creating statistics: {e}")

# Step 1: Define the player data
new_player_data = {
    "name": "Player 1"  # Add more fields based on your schema if needed
}

# Step 2: Create the player and retrieve the player ID
player_id = create_player(new_player_data)

# Step 3: If the player is created successfully, add statistics for the player
if player_id:
    new_statistics_data = [
        {
            "player_id": player_id,  # Reference to the newly created player
            "points": 50,
            "games_played": 10
        },
        {
            "player_id": player_id,  # Reference to the newly created player
            "points": 30,
            "games_played": 8
        }
    ]
    # Step 4: Create statistics entries for the player
    create_statistics(new_statistics_data)