# Hockey Guess

A lightweight single-page guessing game inspired by HockeyDB cards. Spend tokens to reveal portions of a player's career resume and try to identify the mystery player before the round ends.

## Getting Started

The app is a static bundle and does not require a build step.

### Option 1 — Open locally

1. Clone or download this repository.
2. Open `index.html` directly in a modern browser.
   - Some browsers block `fetch` requests from the `file://` protocol. If that happens, use the lightweight server option below.

### Option 2 — Serve with a lightweight web server

From the repository root run any static file server (examples below) and then open the reported localhost URL.

```bash
# Python 3
python -m http.server

# Node.js (requires npx)
npx serve .
```

### Option 3 — GitHub Pages

Push the repository to GitHub and enable GitHub Pages for the main branch. The bundled assets load without extra configuration.

## Gameplay Notes

- Each round begins with six tokens.
- Reveal buttons spend tokens to surface regular season, playoff, international, awards, total, or identity information.
- Enter guesses in the input field. Correct guesses lock the round and automatically reveal the full dossier.
- The stats panel tracks your rounds played, wins, and streaks.

## Data

Player data lives at `data/players.json` and follows a HockeyDB-style schema (bio details, season splits, tournaments, awards, and totals). Add or modify entries to extend the roster used by the game.
