// HockeyDB Text Parser + JSON Generator
// Parses pasted HockeyDB text format into game-compatible JSON

function safeInt(value, defaultVal = 0) {
    if (!value || value === '--' || value.trim() === '') return defaultVal;
    const n = parseInt(value, 10);
    return isNaN(n) ? defaultVal : n;
}

function parsePlayerText(text) {
    const lines = text.trim().split('\n').map(l => l.replace(/\r/g, ''));
    if (lines.length < 5) throw new Error('Not enough data. Paste the full player page text.');

    const players = [];
    const playerStarts = [];

    // Find player boundaries by position lines
    for (let i = 0; i < lines.length; i++) {
        if (/(?:Center|Left Wing|Right Wing|Defense|Goalie|Wing)\s+--\s+(?:shoots|catches)\s+[LR]/i.test(lines[i])) {
            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                const trimmed = lines[j].trim();
                if (trimmed && !trimmed.startsWith('[') && !trimmed.includes('photo')) {
                    playerStarts.push(j);
                    break;
                }
            }
        }
    }

    if (playerStarts.length === 0) throw new Error('Could not find player data. Make sure you paste the text view from HockeyDB.');

    for (let p = 0; p < playerStarts.length; p++) {
        const start = playerStarts[p];
        const end = p + 1 < playerStarts.length ? playerStarts[p + 1] : lines.length;
        const section = lines.slice(start, end);

        try {
            players.push(parseSinglePlayer(section));
        } catch (e) {
            console.warn('Failed to parse player at line ' + start, e);
        }
    }

    return players;
}

function parseSinglePlayer(lines) {
    const name = lines[0].trim();
    const position = lines.length > 1 ? lines[1].trim() : 'Unknown';

    let birthDate = null, birthPlace = null, height = null, weight = null, shoots = null, draftInfo = null;

    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];

        const birthMatch = line.match(/Born\s+(.+?)\s+--\s+(.+?)(?:\[|$)/);
        if (birthMatch) {
            birthDate = birthMatch[1].trim();
            birthPlace = birthMatch[2].trim();
        }

        const heightMatch = line.match(/Height\s+([\d.]+)/);
        if (heightMatch) height = heightMatch[1];

        const weightMatch = line.match(/Weight\s+([\d.]+)/);
        if (weightMatch) weight = weightMatch[1];

        const shootsMatch = line.match(/(?:shoots|catches)\s+([LR])/i);
        if (shootsMatch) shoots = shootsMatch[1];

        if (line.includes('NHL Entry Draft') || line.includes('Drafted by')) {
            draftInfo = (draftInfo ? draftInfo + ' ' : '') + line.trim();
        }
    }

    // Merge multi-line draft info
    if (draftInfo) draftInfo = draftInfo.replace(/\s+/g, ' ').trim();

    const seasons = parseSeasons(lines);

    return {
        name, position, birth_date: birthDate, birth_place: birthPlace,
        height, weight, shoots, draft_info: draftInfo, seasons
    };
}

function parseSeasons(lines) {
    const seasons = [];
    let startIdx = 0;

    // Find header row with GP, G, A, Pts
    for (let i = 0; i < lines.length; i++) {
        if (/\bGP\b.*\bG\b.*\bA\b.*\bPts\b/i.test(lines[i])) {
            startIdx = i + 1;
            break;
        }
    }

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes('---') || line.includes('Totals') ||
            line.includes('Awards') || line.includes('Tournaments') ||
            line.includes('Statistics Unavailable')) continue;

        // Split by tab first, then by multiple spaces
        let parts;
        if (line.includes('\t')) {
            parts = line.split('\t').map(p => p.trim()).filter(p => p);
        } else {
            parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
            if (parts.length < 5) parts = line.split(/\s+/);
        }

        if (parts.length < 5) continue;
        if (!/^\d{4}-\d{2}/.test(parts[0])) continue;

        try {
            const season = parts[0];

            // Find league (2+ uppercase chars)
            let leagueIdx = null;
            for (let j = 1; j < parts.length; j++) {
                const clean = parts[j].replace(/[^A-Za-z0-9-]/g, '');
                if (/^[A-Z][A-Z0-9-]+$/.test(clean) && clean.length >= 2 && clean.length <= 8) {
                    leagueIdx = j;
                    break;
                }
            }
            if (leagueIdx === null) continue;

            const team = parts.slice(1, leagueIdx).join(' ').replace(/[^a-zA-Z0-9\s.'-]/g, '').trim();
            const league = parts[leagueIdx].replace(/[^A-Za-z0-9-]/g, '').trim();
            const stats = parts.slice(leagueIdx + 1);

            if (stats.length < 5) continue;

            seasons.push({
                season,
                team,
                league,
                gp: safeInt(stats[0]),
                g: safeInt(stats[1]),
                a: safeInt(stats[2]),
                pts: safeInt(stats[3]),
                pim: safeInt(stats[4]),
                plus_minus: (stats.length > 5 && stats[5] !== '--' && stats[5].trim()) ? stats[5].trim() : null,
                playoff_gp: safeInt(stats[6]),
                playoff_g: safeInt(stats[7]),
                playoff_a: safeInt(stats[8]),
                playoff_pts: safeInt(stats[9]),
                playoff_pim: safeInt(stats[10])
            });
        } catch (e) {
            continue;
        }
    }

    return seasons;
}

function generatePlayerId(name) {
    return name.toLowerCase()
        .replace(/['']/g, '')
        .replace(/[^a-z]/g, ' ')
        .trim()
        .split(/\s+/)
        .pop();  // Use last name
}

function generateManifestEntry(player) {
    const id = generatePlayerId(player.name);
    return { id, name: player.name, file: `players/${id}.json` };
}

// DOM bindings
document.addEventListener('DOMContentLoaded', () => {
    const pasteArea = document.getElementById('paste-area');
    const parseBtn = document.getElementById('parse-btn');
    const clearBtn = document.getElementById('clear-btn');
    const output = document.getElementById('output');
    const previewSection = document.getElementById('preview-section');
    const previewBody = document.getElementById('preview-body');
    const playerTabs = document.getElementById('player-tabs');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const statusMsg = document.getElementById('status-msg');

    let parsedPlayers = [];
    let activePlayerIdx = 0;

    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = 'status-msg ' + type;
        setTimeout(() => { statusMsg.className = 'status-msg'; }, 4000);
    }

    parseBtn.addEventListener('click', () => {
        const text = pasteArea.value.trim();
        if (!text) { showStatus('Paste HockeyDB text first', 'error'); return; }

        try {
            parsedPlayers = parsePlayerText(text);
            if (parsedPlayers.length === 0) throw new Error('No players found');
            activePlayerIdx = 0;
            renderTabs();
            renderPreview(0);
            renderJSON(0);
            previewSection.classList.remove('hidden');
            showStatus(parsedPlayers.length + ' player(s) parsed', 'success');
        } catch (e) {
            showStatus('Parse error: ' + e.message, 'error');
            previewSection.classList.add('hidden');
        }
    });

    clearBtn.addEventListener('click', () => {
        pasteArea.value = '';
        parsedPlayers = [];
        previewSection.classList.add('hidden');
        output.textContent = '';
    });

    function renderTabs() {
        playerTabs.textContent = '';
        parsedPlayers.forEach((p, i) => {
            const tab = document.createElement('button');
            tab.className = 'player-tab' + (i === activePlayerIdx ? ' active' : '');
            tab.textContent = p.name;
            tab.addEventListener('click', () => {
                activePlayerIdx = i;
                renderTabs();
                renderPreview(i);
                renderJSON(i);
            });
            playerTabs.appendChild(tab);
        });
    }

    function renderPreview(idx) {
        const player = parsedPlayers[idx];
        previewBody.textContent = '';

        player.seasons.forEach(s => {
            const tr = document.createElement('tr');
            const isNHL = s.league === 'NHL';
            tr.className = isNHL ? 'nhl-row' : 'junior-row';

            [s.season, s.league, s.team, s.gp, s.g, s.a, s.pts, s.pim,
             s.plus_minus || '--', s.playoff_gp || '--', s.playoff_g || '--',
             s.playoff_a || '--', s.playoff_pts || '--', s.playoff_pim || '--'
            ].forEach(val => {
                const td = document.createElement('td');
                td.textContent = val;
                tr.appendChild(td);
            });

            previewBody.appendChild(tr);
        });
    }

    function renderJSON(idx) {
        output.textContent = JSON.stringify(parsedPlayers[idx], null, 2);
    }

    copyBtn.addEventListener('click', () => {
        if (!output.textContent) return;
        navigator.clipboard.writeText(output.textContent)
            .then(() => showStatus('JSON copied to clipboard', 'success'))
            .catch(() => showStatus('Copy failed', 'error'));
    });

    downloadBtn.addEventListener('click', () => {
        if (parsedPlayers.length === 0) return;
        const player = parsedPlayers[activePlayerIdx];
        const id = generatePlayerId(player.name);
        const blob = new Blob([JSON.stringify(player, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = id + '.json';
        a.click();
        URL.revokeObjectURL(url);

        // Also show manifest entry
        const entry = generateManifestEntry(player);
        showStatus('Downloaded! Add to manifest.json: ' + JSON.stringify(entry), 'success');
    });
});
