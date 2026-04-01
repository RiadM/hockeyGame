# 04 - Data Format & Adding Players
> Updated: 2026-04-01T00:45:00Z

## Player JSON Schema

```json
{
  "name": "string",
  "position": "string (e.g. 'Center -- shoots L')",
  "birth_date": "string (e.g. 'Feb 7 1991')",
  "birth_place": "string (e.g. 'Clinton, ONT')",
  "height": "string (e.g. '6.01')",
  "weight": "string (e.g. '207')",
  "shoots": "L|R",
  "draft_info": "string|null",
  "seasons": [
    {
      "season": "YYYY-YY (e.g. '2003-04')",
      "team": "string",
      "league": "string (NHL, AHL, OHL, WHL, SEL, etc.)",
      "gp": "number", "g": "number", "a": "number",
      "pts": "number", "pim": "number",
      "plus_minus": "string|null",
      "playoff_gp": "number", "playoff_g": "number",
      "playoff_a": "number", "playoff_pts": "number",
      "playoff_pim": "number"
    }
  ]
}
```

## Season Order
- MUST be chronological (oldest first)
- Same-season entries (e.g. traded mid-season) keep natural order
- DO NOT sort alphabetically - the game preserves JSON order

## Adding a Player

### Method 1: Data Entry Page
1. Go to HockeyDB player page, click "View as text"
2. Select all text, copy
3. Open data-entry.html in browser
4. Paste text, click "Parse Data"
5. Review preview table for accuracy
6. Click "Download .json"
7. Move file to src/data/players/
8. Add entry to src/data/manifest.json:
   ```json
   { "id": "lastname", "name": "Full Name", "file": "players/lastname.json" }
   ```

### Method 2: Python Scraper
```bash
cd src/python
pip install -r requirements.txt
python pipeline.py <hockeydb_url>
```
Requires Chrome + ChromeDriver.

## Manifest Format

src/data/manifest.json:
```json
{
  "version": "1.0.0",
  "players": [
    { "id": "holmstrom", "name": "Tomas Holmstrom", "file": "players/holmstrom.json" }
  ]
}
```

## Current Players (5)
| ID | Name | Seasons | Leagues |
|----|------|---------|---------|
| holmstrom | Tomas Holmstrom | 19 | SEL, AHL, NHL |
| redmond | Mickey Redmond | 16 | OHA, CPHL, NHL |
| oreilly | Ryan O'Reilly | 22 | OPJHL, OHL, NHL, KHL |
| kadri | Nazem Kadri | 24 | OHL, NHL, AHL |
| mailloux | Logan Mailloux | 9 | OHL, GOJHL, AHL, NHL |
