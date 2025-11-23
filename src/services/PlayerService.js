// PlayerService - Lazy loading player data
// Loads player JSON only when needed, caches in memory

class PlayerService {
    constructor() {
        this.manifest = null;
        this.cache = new Map();
        this.manifestPath = './src/data/manifest.json';
    }

    /**
     * Load manifest.json (list of all players)
     * @returns {Promise<Object>} Manifest data
     */
    async loadManifest() {
        if (this.manifest) {
            return this.manifest;
        }

        try {
            const response = await fetch(this.manifestPath);
            if (!response.ok) {
                throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
            }
            this.manifest = await response.json();
            return this.manifest;
        } catch (error) {
            console.error('Error loading manifest:', error);
            throw new Error('Failed to load player manifest. Please refresh the page.');
        }
    }

    /**
     * Load a specific player by ID
     * @param {string} playerId - Player ID (e.g., "holmstrom")
     * @returns {Promise<Object>} Player data
     */
    async loadPlayer(playerId) {
        // Check cache first
        if (this.cache.has(playerId)) {
            return this.cache.get(playerId);
        }

        // Ensure manifest is loaded
        await this.loadManifest();

        // Find player in manifest
        const playerEntry = this.manifest.players.find(p => p.id === playerId);
        if (!playerEntry) {
            throw new Error(`Player not found: ${playerId}`);
        }

        try {
            const response = await fetch(`./src/data/${playerEntry.file}`);
            if (!response.ok) {
                throw new Error(`Failed to load player ${playerId}: ${response.status} ${response.statusText}`);
            }

            const playerData = await response.json();

            // Cache the player data
            this.cache.set(playerId, playerData);

            return playerData;
        } catch (error) {
            console.error(`Error loading player ${playerId}:`, error);
            throw new Error(`Failed to load player data. Please try again.`);
        }
    }

    /**
     * Get a random player from the manifest
     * @returns {Promise<Object>} Random player data
     */
    async getRandomPlayer() {
        await this.loadManifest();

        const players = this.manifest.players;
        const randomIndex = Math.floor(Math.random() * players.length);
        const randomPlayerEntry = players[randomIndex];

        return await this.loadPlayer(randomPlayerEntry.id);
    }

    /**
     * Get multiple random unique players
     * @param {number} count - Number of players to select
     * @returns {Promise<Array>} Array of player data
     */
    async getRandomPlayers(count) {
        await this.loadManifest();

        const players = this.manifest.players;
        if (count > players.length) {
            throw new Error(`Cannot select ${count} players, only ${players.length} available`);
        }

        // Shuffle and select
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        // Load all selected players
        const playerDataPromises = selected.map(p => this.loadPlayer(p.id));
        return await Promise.all(playerDataPromises);
    }

    /**
     * Preload multiple players (optional optimization)
     * @param {Array<string>} playerIds - Array of player IDs to preload
     * @returns {Promise<void>}
     */
    async preloadPlayers(playerIds) {
        const loadPromises = playerIds
            .filter(id => !this.cache.has(id))
            .map(id => this.loadPlayer(id));

        await Promise.all(loadPromises);
    }

    /**
     * Get all player names and IDs from manifest
     * @returns {Promise<Array>} Array of {id, name}
     */
    async getAllPlayerInfo() {
        await this.loadManifest();
        return this.manifest.players.map(p => ({
            id: p.id,
            name: p.name
        }));
    }

    /**
     * Clear cache (useful for testing or memory management)
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            players: Array.from(this.cache.keys())
        };
    }
}

// Export singleton instance
const playerService = new PlayerService();
export default playerService;
