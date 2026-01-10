# Simplify Game UI - Implementation Plan

## Goal
Remove username input card and right side panel to reduce complexity.
Keep multiplayer code intact for future use.

## Current File Structure

```
index.html (16KB)           <- MAIN entry point (modular)
  └── uses: src/styles.css, src/ui.js

hockey_version_25oct.html   <- ARCHIVE (monolithic backup)
  └── all CSS/JS inline

src/
├── styles.css (42KB)       <- Main styles
├── ui.js (16KB)            <- UI initialization + multiplayer setup
├── game.js (38KB)          <- HockeyGameDashboard class
├── config.js               <- Game constants
├── data.js                 <- Player data
├── services/               <- PlayerService etc.
├── models/                 <- GameState
├── multiplayer/            <- Multiplayer modules
└── utils/                  <- EventBus, KeyboardHandler
```

## Current UI Layout (3 columns)

```
┌─────────────────────────────────────────────────────────┐
│                      HEADER                             │
├──────────┬─────────────────────────────┬────────────────┤
│  LEFT    │                             │    RIGHT       │
│ SIDEBAR  │       MAIN CONTENT          │   SIDEBAR      │
│  (15%)   │         (1fr)               │    (20%)       │
│          │                             │                │
│ - Score  │    Stats Table              │ - Room Info    │
│ - Hints  │                             │ - Leaderboard  │
│ - Input  │                             │ - Chat         │
│ - NewGame│                             │                │
└──────────┴─────────────────────────────┴────────────────┘

         ┌──────────────────────┐
         │    MODE MODAL        │  <- Blocks UI on load
         │  - Username input    │
         │  - Solo button       │
         │  - Multiplayer opts  │
         └──────────────────────┘
```

## Target UI Layout (2 columns)

```
┌─────────────────────────────────────────────────────────┐
│                      HEADER                             │
├──────────┬──────────────────────────────────────────────┤
│  LEFT    │                                              │
│ SIDEBAR  │            MAIN CONTENT                      │
│  (15%)   │              (1fr)                           │
│          │                                              │
│ - Score  │         Stats Table                          │
│ - Hints  │                                              │
│ - Input  │                                              │
│ - NewGame│                                              │
└──────────┴──────────────────────────────────────────────┘

No modal on load - game starts immediately in solo mode.
Right sidebar hidden (code preserved).
```

## Changes Required

### 1. src/styles.css
- [ ] Change grid: `grid-template-columns: 15% 1fr 20%` → `15% 1fr`

### 2. src/ui.js
- [ ] Auto-start solo mode on DOMContentLoaded
- [ ] Hide mode-modal immediately
- [ ] Keep right-sidebar hidden
- [ ] Preserve all event listeners for future multiplayer use

### 3. Files NOT modified (preserved for future)
- index.html - HTML structure unchanged
- hockey_version_25oct.html - Archive untouched
- src/multiplayer/* - All multiplayer code intact
- All modal HTML - Just hidden, not removed

## Execution Steps

1. Read src/styles.css - find grid definition
2. Edit grid-template-columns in styles.css
3. Read src/ui.js - find DOMContentLoaded handler
4. Edit ui.js - add auto-start solo mode logic
5. Test game loads without modal
6. Commit with clear message
7. Push to branch

## Rollback Plan
```bash
git checkout HEAD~1 -- src/styles.css src/ui.js
```
