// Server Configuration
module.exports = {
    PORT: process.env.PORT || 3000,
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    ROOM_TIMEOUT: 5 * 60 * 1000, // 5 min stale cleanup
    HEARTBEAT_INTERVAL: 30000, // 30s
    MAX_PASSWORD_ATTEMPTS: 3,
    RATE_LIMIT_WINDOW: 60000, // 1 min
    MAX_ROOMS: 100,
    MAX_PLAYERS_PER_ROOM: 8,
    TURN_SERVERS: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN server if available:
        // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
    ]
};
