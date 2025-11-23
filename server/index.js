// Central Lobby Server - Node.js + Express + Socket.io
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const LobbyManager = require('./lobby');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: config.CORS_ORIGIN,
        methods: ['GET', 'POST']
    }
});

const lobby = new LobbyManager();

// Middleware
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // 100 requests per window
    message: 'Too many requests'
});

app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        rooms: lobby.getRoomCount(),
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// Get TURN server config (public endpoint)
app.get('/api/ice-servers', (req, res) => {
    res.json({ iceServers: config.TURN_SERVERS });
});

// Create room
app.post('/api/rooms', (req, res) => {
    try {
        const { hostPeerID, hostName, isPrivate, password } = req.body;

        if (!hostPeerID || !hostName) {
            return res.status(400).json({ error: 'Missing hostPeerID or hostName' });
        }

        if (password) {
            const validation = lobby.validatePassword(password);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
        }

        const room = lobby.createRoom(hostPeerID, hostName, isPrivate, password);

        // Broadcast new room to all connected clients (if public)
        if (!room.isPrivate) {
            io.emit('room-created', {
                roomCode: room.roomCode,
                hostPeerID: room.hostPeerID,
                hostName: room.hostName,
                playerCount: room.playerCount,
                maxPlayers: room.maxPlayers,
                hasPassword: !!room.passwordHash,
                createdAt: room.createdAt
            });
        }

        res.json({
            success: true,
            roomCode: room.roomCode,
            hostPeerID: room.hostPeerID
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List public rooms
app.get('/api/rooms', (req, res) => {
    const rooms = lobby.getPublicRooms();
    res.json(rooms);
});

// Join room (password check)
app.post('/api/rooms/:code/join', (req, res) => {
    const { code } = req.params;
    const { password } = req.body;
    const ip = req.ip;

    const room = lobby.getRoom(code);
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    // Rate limit check
    if (room.passwordHash) {
        const rateCheck = lobby.checkRateLimit(ip, code);
        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: 'Too many attempts',
                timeLeft: rateCheck.timeLeft
            });
        }

        // Password validation
        const validation = lobby.validatePassword(password);
        if (!validation.valid) {
            lobby.recordFailedAttempt(ip, code);
            return res.status(400).json({ error: validation.error });
        }

        // Password verification
        const valid = lobby.verifyPassword(validation.password, room.passwordHash);
        if (!valid) {
            lobby.recordFailedAttempt(ip, code);
            return res.status(401).json({ error: 'Invalid password' });
        }
    }

    res.json({
        success: true,
        roomCode: room.roomCode,
        hostPeerID: room.hostPeerID,
        hostName: room.hostName
    });
});

// Heartbeat
app.post('/api/rooms/:code/heartbeat', (req, res) => {
    const { code } = req.params;
    const { playerCount } = req.body;

    const updated = lobby.updateHeartbeat(code);
    if (!updated) {
        return res.status(404).json({ error: 'Room not found' });
    }

    if (typeof playerCount === 'number') {
        lobby.updatePlayerCount(code, playerCount);

        // Broadcast player count update
        io.emit('room-updated', {
            roomCode: code,
            playerCount
        });
    }

    res.json({ success: true });
});

// Delete room
app.delete('/api/rooms/:code', (req, res) => {
    const { code } = req.params;
    const deleted = lobby.removeRoom(code);

    if (deleted) {
        // Broadcast room closure
        io.emit('room-closed', { roomCode: code });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Room not found' });
    }
});

// WebSocket events
io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on('subscribe-lobby', () => {
        socket.join('lobby');
        const rooms = lobby.getPublicRooms();
        socket.emit('rooms-list', rooms);
    });

    socket.on('unsubscribe-lobby', () => {
        socket.leave('lobby');
    });

    socket.on('disconnect', () => {
        console.log(`[WS] Client disconnected: ${socket.id}`);
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(config.PORT, () => {
    console.log(`=================================`);
    console.log(`Hockey Game Lobby Server`);
    console.log(`=================================`);
    console.log(`Port: ${config.PORT}`);
    console.log(`CORS: ${config.CORS_ORIGIN}`);
    console.log(`Max Rooms: ${config.MAX_ROOMS}`);
    console.log(`Room Timeout: ${config.ROOM_TIMEOUT / 1000}s`);
    console.log(`=================================`);
});

module.exports = { app, server, io };
