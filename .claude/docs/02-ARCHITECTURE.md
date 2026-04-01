# 02 - Architecture & Module Graph
> Updated: 2026-04-01T00:45:00Z

## Dependency Graph (Hasse Diagram)

```
index.html
  └─ src/ui.js (bootstrap)
       └─ src/game.js (controller)
            ├─ src/models/GameState.js      (state)
            ├─ src/config.js                (constants)
            ├─ src/services/PlayerService.js (data loading)
            │    └─ fetch: src/data/manifest.json
            │    └─ fetch: src/data/players/*.json
            ├─ src/logic/GameLogic.js        (pure functions)
            │    └─ src/config.js
            ├─ src/ui/TableRenderer.js       (table DOM)
            ├─ src/ui/ScoreDisplay.js        (score DOM)
            │    └─ src/config.js
            ├─ src/ui/WinModal.js            (modals DOM)
            └─ src/utils/KeyboardHandler.js  (keyboard)

data-entry.html
  └─ src/data-entry.js (standalone, no shared JS with game)
```

## Data Flow

```
User Action → game.js → GameState mutation → UI Component update
                ↓
         GameLogic.js (pure validation/scoring)
                ↓
         PlayerService.js (fetch player JSON)
```

## Key Patterns

### State Management
- All state in GameState.js with validated setters
- No global state outside GameState (except window.hockeyGameInstance for debug)
- State mutations: setScore(), setGameWon(), incrementHintsUsed(), etc.

### UI Components
- Constructor takes {elementRefs} object
- game.js creates components in init(), passes DOM refs
- Components own their DOM updates, game.js orchestrates

### Player Data
- manifest.json lists all players (id, name, file path)
- Individual player JSONs loaded on demand via PlayerService
- PlayerService caches in memory Map
- Base path auto-detected for GitHub Pages compatibility

## Components NOT Yet Wired
- `src/ui/HintTooltip.js` - tooltip on hint button hover
- `src/utils/EventBus.js` - pub/sub for decoupled events
