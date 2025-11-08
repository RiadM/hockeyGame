# HockeyStats

A minimal single-page hockey guessing game. Each round surfaces a player's season-by-season resume – you supply the name.

## Getting Started

The project is a static bundle and does not require a build step.

### Option 1 — Open locally

1. Clone or download this repository.
2. Open `index.html` in a modern browser.
   - If your browser blocks `fetch` requests from the `file://` protocol, start a lightweight HTTP server instead (see below).

### Option 2 — Serve with a lightweight web server

From the repository root run any static file server (examples below) and then open the reported localhost URL.

```bash
# Python 3
python -m http.server

# Node.js (requires npx)
npx serve .
```

### Option 3 — GitHub Pages

Push the repository to GitHub and enable GitHub Pages for the branch that contains `index.html` (usually `main`). Choose the root
folder and Pages will publish the site automatically.

## Gameplay Notes

- A mystery player is selected at random from `data/players.json` each round.
- Review the regular-season and playoff rows to identify the player.
- Enter a name in the guess box. Correct answers increment the score and advance to the next player.
- Tap **Hint** to reveal lightweight biographical details (position, shooting side, birthplace, draft info, etc.).

## Data

Player data lives at `data/players.json` and follows a HockeyDB-style schema (season splits, playoffs, totals, and goalie stats).
Add or modify entries to extend the roster used by the game.
