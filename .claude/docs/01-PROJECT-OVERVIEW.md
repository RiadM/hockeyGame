# 01 - Project Overview
> Updated: 2026-04-01T00:45:00Z

## What This Is
Hockey stats guessing game. Player sees career stats (no name/team), guesses who the player is. 5 rounds per game, 3 hints per round, scoring system.

## Tech Stack
- Pure HTML5 + CSS3 + Vanilla JS (ES6 modules)
- No frameworks, no build systems, no transpilers
- Requires web server for ES modules (python3 -m http.server)
- Target deployment: GitHub Pages

## Entry Points
- `index.html` - Game (loads src/ui.js -> src/game.js)
- `data-entry.html` - Player data tool (loads src/data-entry.js)

## File Structure
```
index.html                    Game page
data-entry.html               Data entry page
package.json                  Project metadata (no deps)
CLAUDE.md                     AI assistant instructions
.gitignore

src/
  ui.js                       Bootstrap (6 lines)
  game.js                     Game controller (~310 lines)
  config.js                   GAME_CONFIG constants (38 lines)
  styles.css                  All game CSS (~1740 lines)
  data-entry.js               HockeyDB text parser (289 lines)
  data-entry.css              Data entry page styles

  models/
    GameState.js              Centralized state with validated setters (267 lines)

  services/
    PlayerService.js          Lazy-load player JSON with caching (165 lines)

  logic/
    GameLogic.js              Pure functions: scoring, validation, shuffle (209 lines)

  ui/
    TableRenderer.js           Table population + column reveal (120 lines)
    ScoreDisplay.js            Score animation + progress bar (93 lines)
    WinModal.js                Final score modal + breakdown (146 lines)
    HintTooltip.js             Hint tooltip on hover (114 lines, NOT YET WIRED)

  utils/
    EventBus.js               Pub/sub system (114 lines, available but unused)
    KeyboardHandler.js         Space/Enter/Escape shortcuts (110 lines)

  data/
    manifest.json             Player index (5 players)
    players/
      holmstrom.json          Tomas Holmstrom (19 seasons)
      redmond.json            Mickey Redmond (16 seasons)
      oreilly.json            Ryan O'Reilly (22 seasons)
      kadri.json              Nazem Kadri (24 seasons)
      mailloux.json           Logan Mailloux (9 seasons)

  python/                     HockeyDB scraper tools (not used by game)
```

## Game Mechanics
- Start: 100pts per round, 5 rounds total
- Hint 1 (-20): reveal playoff columns
- Hint 2 (-20): reveal team column
- Hint 3 (-20): show 4 multiple choice buttons
- Correct guess: +50pts
- Wrong multiple choice: -10pts
- Max score: 750 (5 rounds x 150)
- Grade: A+ (90%+), A (80%+), B (70%+), C (60%+), D (50%+), F (<50%)

## Color Palette (STRICT)
- Cyan: #06b6d4, #0891b2, #0e7490
- Blue: #dbeafe, #bfdbfe, #e0f2fe, #bae6fd, #a5f3fc, #67e8f9, #cffafe
- Slate: #f1f5f9, #e2e8f0, #cbd5e1, #94a3b8, #64748b, #334155
- BANNED: yellow, orange, green, purple (except error states)
