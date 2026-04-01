# 03 - Known Issues & TODO
> Updated: 2026-04-01T00:45:00Z

## Open Issues

### HIGH Priority

1. **HintTooltip not wired** - src/ui/HintTooltip.js exists but game.js doesn't import/use it. Users don't see hint cost preview on hover.

2. **EventBus unused** - pub/sub system exists but game.js does direct DOM manipulation instead of emitting events. Future: emit events from game.js, let UI components subscribe.

3. **No error recovery on player load failure** - If a player JSON 404s, game shows blank table with no retry option. Need fallback UI.

4. **KeyboardHandler modal registration unused** - registerModal/unregisterModal methods exist but never called. Escape works via direct event listener instead.

### MEDIUM Priority

5. **styles.css is 1740 lines** - Should be split into modules (base, table, sidebar, modals, responsive) if it grows further. Currently manageable.

6. **Only 5 players** - Game needs more player data to be interesting. Data entry page exists to help with this.

7. **No offline support** - Player data fetched every time. Could use service worker or IndexedDB cache.

8. **Accessibility gaps** - No ARIA labels on modals/buttons, no visible focus indicators, keyboard nav partially implemented.

### LOW Priority

9. **archive/ folder cleanup** - Contains old dev artifacts, images, Python scripts. Not harmful but adds repo size.

10. **src/python/ folder** - HockeyDB scraper tools. Works but requires selenium/chrome. Not used by the game itself.

## Recently Fixed (2026-04-01)

- Table row ordering: removed .sort() that broke same-season entries
- mailloux.json: removed 11 corrupt entries from wrong player
- game.js monolith: refactored from 843 to ~310 lines using modular components
- Dead code: deleted ~5000 lines (multiplayer/, server/, stubs)
- Mobile CSS: added responsive layout, horizontal scroll table
- GitHub Pages: PlayerService now auto-detects base path
- Data entry page: created data-entry.html for pasting HockeyDB text
- Missing CSS: added .header-row, .subheader-row, .regular-season, .playoffs styles
- Color compliance: hint button orange -> cyan
- Emoji parsing: data-entry.js handles unicode in team names
- Loading screen: shows spinner, detects file:// protocol
