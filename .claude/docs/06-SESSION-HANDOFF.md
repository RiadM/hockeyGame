# 06 - Session Handoff Guide
> Updated: 2026-04-01T00:45:00Z

## For New Claude Sessions

### Before Any Work
1. Read CLAUDE.md (root) - has ALL project rules, constraints, color palette, architecture
2. Read .claude/docs/01-PROJECT-OVERVIEW.md - file structure
3. Read .claude/docs/03-KNOWN-ISSUES.md - what's broken/missing
4. Read .claude/docs/02-ARCHITECTURE.md - module dependency graph

### Key Rules (from CLAUDE.md)
- Pure HTML/CSS/JS only. NO frameworks, build systems, transpilers
- Color palette: ONLY cyan + blue + slate. NO yellow/orange/green/purple
- Max 150 lines per file (aspiration, styles.css exceeds this)
- All state through GameState.js validated setters
- Game logic must be testable without DOM (use GameLogic.js)

### Current State (2026-04-01)
- Game works end-to-end in solo mode (5 rounds)
- Data entry page works (paste HockeyDB text -> JSON)
- Mobile responsive (horizontal scroll table)
- 5 players in database
- GitHub Pages compatible (auto-detects base path)

### Next Priorities
1. **Wire HintTooltip.js** into game.js (show hint cost on hover)
2. **Add more players** - use data-entry.html or python scraper
3. **Wire EventBus** - decouple game.js from UI components
4. **Error handling** - fallback UI when player JSON fails to load
5. **Accessibility** - ARIA labels, focus indicators, screen reader support
6. **Offline support** - service worker for caching player data

### Architecture Decision: game.js is the Controller
- game.js orchestrates: receives user input, updates GameState, tells UI components what to render
- UI components (TableRenderer, ScoreDisplay, WinModal) own their DOM
- GameLogic.js has pure functions (no DOM, no state mutation)
- PlayerService.js handles all data fetching with caching

### What NOT to Do
- Don't add build systems (webpack, vite, etc.)
- Don't add npm dependencies
- Don't create documentation unless explicitly asked
- Don't use yellow/orange/green in CSS
- Don't put temp files in project root
- Don't modify data format without updating 04-DATA-FORMAT.md
