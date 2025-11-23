// Room Management Logic
const crypto = require('crypto');
const config = require('./config');

class LobbyManager {
    constructor() {
        this.rooms = new Map(); // roomCode -> roomData
        this.passwordAttempts = new Map(); // ip -> roomCode -> [timestamps]
        this.startCleanupTimer();
    }

    startCleanupTimer() {
        setInterval(() => {
            const now = Date.now();
            for (const [code, room] of this.rooms.entries()) {
                if (now - room.lastHeartbeat > config.ROOM_TIMEOUT) {
                    console.log(`[CLEANUP] Room ${code} expired`);
                    this.rooms.delete(code);
                }
            }
        }, config.HEARTBEAT_INTERVAL);
    }

    hashPassword(password) {
        if (!password) return null;
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    verifyPassword(inputPassword, storedHash) {
        if (!storedHash) return true;
        const inputHash = this.hashPassword(inputPassword);
        return inputHash === storedHash;
    }

    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'Password required' };
        }
        const trimmed = password.trim();
        if (trimmed.length < 6) {
            return { valid: false, error: 'Password min 6 chars' };
        }
        if (trimmed.length > 50) {
            return { valid: false, error: 'Password max 50 chars' };
        }
        return { valid: true, password: trimmed };
    }

    checkRateLimit(ip, roomCode) {
        const now = Date.now();
        if (!this.passwordAttempts.has(ip)) {
            this.passwordAttempts.set(ip, new Map());
        }

        const ipAttempts = this.passwordAttempts.get(ip);
        if (!ipAttempts.has(roomCode)) {
            ipAttempts.set(roomCode, []);
        }

        const attempts = ipAttempts.get(roomCode);
        const recentAttempts = attempts.filter(t => now - t < config.RATE_LIMIT_WINDOW);
        ipAttempts.set(roomCode, recentAttempts);

        if (recentAttempts.length >= config.MAX_PASSWORD_ATTEMPTS) {
            const oldestAttempt = recentAttempts[0];
            const timeLeft = Math.ceil((config.RATE_LIMIT_WINDOW - (now - oldestAttempt)) / 1000);
            return { allowed: false, timeLeft };
        }

        return { allowed: true };
    }

    recordFailedAttempt(ip, roomCode) {
        const now = Date.now();
        if (!this.passwordAttempts.has(ip)) {
            this.passwordAttempts.set(ip, new Map());
        }
        const ipAttempts = this.passwordAttempts.get(ip);
        if (!ipAttempts.has(roomCode)) {
            ipAttempts.set(roomCode, []);
        }
        ipAttempts.get(roomCode).push(now);
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    createRoom(hostPeerID, hostName, isPrivate, password = null) {
        if (this.rooms.size >= config.MAX_ROOMS) {
            throw new Error('Server full');
        }

        let roomCode;
        do {
            roomCode = this.generateRoomCode();
        } while (this.rooms.has(roomCode));

        const passwordHash = password ? this.hashPassword(password) : null;

        const roomData = {
            roomCode,
            hostPeerID,
            hostName,
            playerCount: 1,
            maxPlayers: config.MAX_PLAYERS_PER_ROOM,
            isPrivate: !!isPrivate,
            passwordHash,
            createdAt: Date.now(),
            lastHeartbeat: Date.now()
        };

        this.rooms.set(roomCode, roomData);
        console.log(`[CREATE] Room ${roomCode} by ${hostName}`);
        return roomData;
    }

    updateHeartbeat(roomCode) {
        const room = this.rooms.get(roomCode);
        if (room) {
            room.lastHeartbeat = Date.now();
            return true;
        }
        return false;
    }

    updatePlayerCount(roomCode, count) {
        const room = this.rooms.get(roomCode);
        if (room) {
            room.playerCount = Math.min(count, room.maxPlayers);
            room.lastHeartbeat = Date.now();
            return true;
        }
        return false;
    }

    removeRoom(roomCode) {
        const deleted = this.rooms.delete(roomCode);
        if (deleted) {
            console.log(`[DELETE] Room ${roomCode}`);
        }
        return deleted;
    }

    getPublicRooms() {
        return Array.from(this.rooms.values())
            .filter(r => !r.isPrivate)
            .map(r => ({
                roomCode: r.roomCode,
                hostPeerID: r.hostPeerID,
                hostName: r.hostName,
                playerCount: r.playerCount,
                maxPlayers: r.maxPlayers,
                hasPassword: !!r.passwordHash,
                createdAt: r.createdAt
            }))
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    getRoom(roomCode) {
        return this.rooms.get(roomCode);
    }

    getRoomCount() {
        return this.rooms.size;
    }
}

module.exports = LobbyManager;
