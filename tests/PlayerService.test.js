// PlayerService Tests
// Tests lazy loading, caching, error handling
// NOTE: These tests require a working PlayerService implementation
// Run in browser console or Node.js with proper setup

// Simplified test framework (matches GameState.test.js pattern)
const tests = [];
const asyncTest = (name, fn) => tests.push({ name, fn, async: true });

// Test helpers
const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
};

const assertTrue = (value, message) => {
    if (!value) {
        throw new Error(`${message}: expected truthy value, got ${value}`);
    }
};

const assertGreaterThan = (actual, min, message) => {
    if (actual <= min) {
        throw new Error(`${message}: expected > ${min}, got ${actual}`);
    }
};

// Mock data
const createMockManifest = () => ({
    version: "1.0.0",
    description: "Player data manifest for hockey game",
    players: [
        { id: "holmstrom", name: "Tomas Holmstrom", file: "players/holmstrom.json" },
        { id: "redmond", name: "Mickey Redmond", file: "players/redmond.json" },
        { id: "oreilly", name: "Ryan O'Reilly", file: "players/oreilly.json" },
        { id: "mailloux", name: "Logan Mailloux", file: "players/mailloux.json" },
        { id: "kadri", name: "Nazem Kadri", file: "players/kadri.json" }
    ]
});

const createMockPlayer = (name) => ({
    name: name,
    position: "Center -- shoots L",
    birth_date: "Jan 1 1990",
    seasons: [
        {
            season: "2020-21",
            team: "Test Team",
            league: "NHL",
            gp: 82,
            g: 30,
            a: 40,
            pts: 70,
            pim: 20,
            plus_minus: "10",
            playoff_gp: 20,
            playoff_g: 5,
            playoff_a: 10,
            playoff_pts: 15,
            playoff_pim: 4
        }
    ]
});

// Tests
asyncTest('PlayerService loadManifest loads and caches manifest', async () => {
    const mockManifest = createMockManifest();
    let fetchCalls = 0;

    const originalFetch = global.fetch || window.fetch;
    const mockFetch = async (url) => {
        fetchCalls++;
        if (url.includes('manifest.json')) {
            return { ok: true, json: async () => mockManifest };
        }
        return { ok: false, status: 404 };
    };
    (typeof global !== 'undefined' ? global : window).fetch = mockFetch;

    try {
        const PlayerService = (await import('../src/services/PlayerService.js')).default;
        const service = new PlayerService();
        service.clearCache();
        service.manifest = null;

        const manifest1 = await service.loadManifest();
        const manifest2 = await service.loadManifest();

        assertEqual(manifest1.players.length, 5, 'Manifest should have 5 players');
        assertEqual(fetchCalls, 1, 'Should only fetch manifest once (cached)');
    } finally {
        (typeof global !== 'undefined' ? global : window).fetch = originalFetch;
    }
});

asyncTest('PlayerService loadPlayer caches player data', async () => {
    const mockManifest = createMockManifest();
    const mockPlayer = createMockPlayer('Tomas Holmstrom');
    let playerFetchCount = 0;

    const originalFetch = global.fetch || window.fetch;
    const mockFetch = async (url) => {
        if (url.includes('manifest.json')) {
            return { ok: true, json: async () => mockManifest };
        }
        if (url.includes('holmstrom.json')) {
            playerFetchCount++;
            return { ok: true, json: async () => mockPlayer };
        }
        return { ok: false, status: 404 };
    };
    (typeof global !== 'undefined' ? global : window).fetch = mockFetch;

    try {
        const PlayerService = (await import('../src/services/PlayerService.js')).default;
        const service = new PlayerService();
        service.clearCache();
        service.manifest = null;

        const player1 = await service.loadPlayer('holmstrom');
        const player2 = await service.loadPlayer('holmstrom');
        const player3 = await service.loadPlayer('holmstrom');

        assertEqual(player1.name, 'Tomas Holmstrom', 'Player name should match');
        assertTrue(player1.seasons && player1.seasons.length > 0, 'Player should have seasons');
        assertEqual(playerFetchCount, 1, 'Should only fetch player once (cached)');

        const stats = service.getCacheStats();
        assertEqual(stats.size, 1, 'Cache should contain 1 player');
        assertTrue(stats.players.includes('holmstrom'), 'Cache should contain holmstrom');
    } finally {
        (typeof global !== 'undefined' ? global : window).fetch = originalFetch;
    }
});

asyncTest('PlayerService loadPlayer handles errors gracefully', async () => {
    const mockManifest = createMockManifest();

    const originalFetch = global.fetch || window.fetch;
    const mockFetch = async (url) => {
        if (url.includes('manifest.json')) {
            return { ok: true, json: async () => mockManifest };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
    };
    (typeof global !== 'undefined' ? global : window).fetch = mockFetch;

    try {
        const PlayerService = (await import('../src/services/PlayerService.js')).default;
        const service = new PlayerService();
        service.clearCache();
        service.manifest = null;

        let errorThrown = false;
        try {
            await service.loadPlayer('holmstrom');
        } catch (error) {
            errorThrown = true;
            assertTrue(error.message.includes('Failed to load'), 'Error message should mention failure');
        }

        assertTrue(errorThrown, 'Should throw error on failed fetch');
    } finally {
        (typeof global !== 'undefined' ? global : window).fetch = originalFetch;
    }
});

asyncTest('PlayerService getRandomPlayer returns valid player', async () => {
    const mockManifest = createMockManifest();
    const mockPlayers = {
        holmstrom: createMockPlayer('Tomas Holmstrom'),
        redmond: createMockPlayer('Mickey Redmond'),
        oreilly: createMockPlayer("Ryan O'Reilly"),
        mailloux: createMockPlayer('Logan Mailloux'),
        kadri: createMockPlayer('Nazem Kadri')
    };

    const originalFetch = global.fetch || window.fetch;
    const mockFetch = async (url) => {
        if (url.includes('manifest.json')) {
            return { ok: true, json: async () => mockManifest };
        }
        for (const [id, player] of Object.entries(mockPlayers)) {
            if (url.includes(`${id}.json`)) {
                return { ok: true, json: async () => player };
            }
        }
        return { ok: false, status: 404 };
    };
    (typeof global !== 'undefined' ? global : window).fetch = mockFetch;

    try {
        const PlayerService = (await import('../src/services/PlayerService.js')).default;
        const service = new PlayerService();
        service.clearCache();
        service.manifest = null;

        const player = await service.getRandomPlayer();

        assertTrue(player.name, 'Player should have a name');
        assertTrue(player.seasons && player.seasons.length > 0, 'Player should have seasons');

        const validNames = Object.values(mockPlayers).map(p => p.name);
        assertTrue(validNames.includes(player.name), 'Player should be from manifest');
    } finally {
        (typeof global !== 'undefined' ? global : window).fetch = originalFetch;
    }
});

asyncTest('PlayerService getRandomPlayers returns unique players', async () => {
    const mockManifest = createMockManifest();
    const mockPlayers = {
        holmstrom: createMockPlayer('Tomas Holmstrom'),
        redmond: createMockPlayer('Mickey Redmond'),
        oreilly: createMockPlayer("Ryan O'Reilly")
    };

    const originalFetch = global.fetch || window.fetch;
    const mockFetch = async (url) => {
        if (url.includes('manifest.json')) {
            return { ok: true, json: async () => mockManifest };
        }
        for (const [id, player] of Object.entries(mockPlayers)) {
            if (url.includes(`${id}.json`)) {
                return { ok: true, json: async () => player };
            }
        }
        return { ok: false, status: 404 };
    };
    (typeof global !== 'undefined' ? global : window).fetch = mockFetch;

    try {
        const PlayerService = (await import('../src/services/PlayerService.js')).default;
        const service = new PlayerService();
        service.clearCache();
        service.manifest = null;

        const players = await service.getRandomPlayers(3);

        assertEqual(players.length, 3, 'Should return 3 players');

        const names = players.map(p => p.name);
        const uniqueNames = new Set(names);
        assertEqual(uniqueNames.size, 3, 'All players should be unique');

        for (const player of players) {
            assertTrue(player.name, 'Each player should have a name');
            assertTrue(player.seasons, 'Each player should have seasons');
        }
    } finally {
        (typeof global !== 'undefined' ? global : window).fetch = originalFetch;
    }
});

asyncTest('PlayerService getAllPlayerInfo returns manifest data without loading players', async () => {
    const mockManifest = createMockManifest();
    let playerFetchCount = 0;

    const originalFetch = global.fetch || window.fetch;
    const mockFetch = async (url) => {
        if (url.includes('manifest.json')) {
            return { ok: true, json: async () => mockManifest };
        }
        if (url.includes('players/')) {
            playerFetchCount++;
        }
        return { ok: false, status: 404 };
    };
    (typeof global !== 'undefined' ? global : window).fetch = mockFetch;

    try {
        const PlayerService = (await import('../src/services/PlayerService.js')).default;
        const service = new PlayerService();
        service.clearCache();
        service.manifest = null;

        const playerInfo = await service.getAllPlayerInfo();

        assertEqual(playerInfo.length, 5, 'Should return all 5 players');
        assertEqual(playerFetchCount, 0, 'Should not fetch any player data');

        const holmstrom = playerInfo.find(p => p.id === 'holmstrom');
        assertTrue(holmstrom, 'Should include holmstrom');
        assertEqual(holmstrom.name, 'Tomas Holmstrom', 'Player name should match');
    } finally {
        (typeof global !== 'undefined' ? global : window).fetch = originalFetch;
    }
});

asyncTest('PlayerService clearCache removes all cached data', async () => {
    const mockManifest = createMockManifest();
    const mockPlayer = createMockPlayer('Tomas Holmstrom');

    const originalFetch = global.fetch || window.fetch;
    const mockFetch = async (url) => {
        if (url.includes('manifest.json')) {
            return { ok: true, json: async () => mockManifest };
        }
        if (url.includes('holmstrom.json')) {
            return { ok: true, json: async () => mockPlayer };
        }
        return { ok: false, status: 404 };
    };
    (typeof global !== 'undefined' ? global : window).fetch = mockFetch;

    try {
        const PlayerService = (await import('../src/services/PlayerService.js')).default;
        const service = new PlayerService();
        service.clearCache();
        service.manifest = null;

        await service.loadPlayer('holmstrom');

        let stats = service.getCacheStats();
        assertGreaterThan(stats.size, 0, 'Cache should have data');

        service.clearCache();

        stats = service.getCacheStats();
        assertEqual(stats.size, 0, 'Cache should be empty after clear');
    } finally {
        (typeof global !== 'undefined' ? global : window).fetch = originalFetch;
    }
});

// Run tests
console.log('Running PlayerService Tests...\n');

(async () => {
    let passed = 0;
    let failed = 0;

    for (const { name, fn } of tests) {
        try {
            await fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (error) {
            console.log(`✗ ${name}`);
            console.log(`  ${error.message}`);
            failed++;
        }
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed, ${tests.length} total`);

    if (failed > 0 && typeof process !== 'undefined') {
        process.exit(1);
    }
})();
