HOCKEY GAME DATA PIPELINE
=========================

REFACTORED PYTHON SCRIPTS FOR HOCKEY PLAYER DATA EXTRACTION

STRUCTURE:
---------
models.py       - Data models (Player, Season, GoalieStats)
parser.py       - Text parser for HockeyDB format
scraper.py      - Selenium web scraper
api_client.py   - Directus API client
pipeline.py     - Complete pipeline orchestration
test_parser.py  - Parser unit tests

INSTALL:
-------
pip install -r requirements.txt

USAGE:
-----

1. Parse existing data file:
   python pipeline.py

2. Run parser tests:
   python test_parser.py

3. Scrape player by ID:
   python scraper.py

4. Upload to Directus:
   Set environment variables:
     set DIRECTUS_URL=http://localhost:8055
     set DIRECTUS_TOKEN=your_token
   python pipeline.py

MODULES:
-------

models.py:
- Player: Biographical data
- Season: Regular season + playoff stats
- GoalieStats: Goalie-specific metrics
- PlayerData: Complete player record

parser.py:
- parse_player_data(text) -> PlayerData
- load_data_file(path) -> List[PlayerData]
- parse_multiple_players(text) -> List[PlayerData]

scraper.py:
- HockeyDBScraper.scrape_player(url) -> str
- HockeyDBScraper.scrape_player_by_id(id) -> str
- scrape_multiple_players(ids) -> dict

api_client.py:
- DirectusClient.create_player(data) -> int
- DirectusClient.create_statistics(player_id, stats) -> bool
- upload_player_data(player_data, client) -> bool

pipeline.py:
- main() -> Complete scrape/parse/upload workflow
- Returns exit code 0=success, 1=failure

CHANGES FROM ORIGINAL:
---------------------

extract_information_from_table.py -> parser.py + models.py:
- Separated concerns (models vs parsing)
- Reads data_player.txt instead of hardcoded example
- Added goalie stats support
- Type hints throughout
- Robust error handling
- Multi-player parsing

fetchdata.py -> scraper.py:
- Added headless mode
- Context manager support
- Error handling + retries
- Save to file functionality
- Batch scraping support

claudtest.py -> DELETED:
- Replaced by scraper.py
- Removed fragile GUI automation (pyautogui/pyperclip)
- Fixed missing imports issue

NEW FILES:
- api_client.py: Clean API abstraction
- pipeline.py: Unified workflow
- test_parser.py: Unit tests
- models.py: Type-safe data structures

WINDOWS COMPATIBILITY:
---------------------
- ASCII-only output in print statements
- No Unicode arrows/symbols
- Windows-compatible file paths
- CRLF line endings acceptable

PERFORMANCE:
-----------
- Batch API operations where possible
- Connection pooling in scraper
- Minimal dependencies (requests, selenium)
- Type hints for IDE optimization

ERROR HANDLING:
--------------
- Comprehensive try/except blocks
- Validation at each pipeline stage
- Clear error messages (ASCII-only)
- Exit codes for automation

TESTING:
-------
test_parser.py validates:
- Player info extraction
- Season stats parsing
- Goalie stats parsing
- Multi-player file loading

Run: python test_parser.py

EXAMPLE:
-------
from parser import load_data_file
from api_client import DirectusClient, upload_player_data

# Parse data
players = load_data_file('data_player.txt')

# Upload to Directus
client = DirectusClient()
for player in players:
    upload_player_data(player, client)
