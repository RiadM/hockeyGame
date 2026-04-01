# 05 - Deployment & Running
> Updated: 2026-04-01T00:45:00Z

## Local Development

```bash
# Any of these work:
python3 -m http.server 8080
npx serve .
php -S localhost:8080
```
Open http://localhost:8080

**Cannot open index.html via file:// protocol** - ES modules require a web server. Loading screen will show an error if file:// detected.

## GitHub Pages

1. Push to main branch
2. Settings > Pages > Source: Deploy from branch (main, / root)
3. Game auto-deploys to https://<user>.github.io/hockeyGame/

### Path Handling
PlayerService.js auto-detects the base path by finding the script tag for ui.js. This handles GitHub Pages subpath (e.g. /hockeyGame/) automatically.

### CSP Headers
index.html includes Content-Security-Policy meta tag:
- default-src 'self'
- script-src 'self'
- style-src 'self' 'unsafe-inline'
- img-src 'self' data:
- object-src 'none'

## Requirements
- Modern browser (ES6 modules support)
- No Node.js needed (package.json has no dependencies)
- No build step
