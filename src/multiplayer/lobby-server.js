// Optional Node.js Lobby Server (50 lines)
// Run: node lobby-server.js
// Self-hosted, no database, in-memory only

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const rooms = new Map();
const ROOM_TIMEOUT = 5 * 60 * 1000; // 5 min

setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
        if (now - room.lastHeartbeat > ROOM_TIMEOUT) {
            rooms.delete(code);
        }
    }
}, 30000);

app.post('/api/lobby/register', (req, res) => {
    const room = { ...req.body, lastHeartbeat: Date.now() };
    rooms.set(room.roomCode, room);
    res.json({ success: true });
});

app.post('/api/lobby/heartbeat', (req, res) => {
    const { roomCode } = req.body;
    if (rooms.has(roomCode)) {
        rooms.get(roomCode).lastHeartbeat = Date.now();
    }
    res.json({ success: true });
});

app.post('/api/lobby/unregister', (req, res) => {
    rooms.delete(req.body.roomCode);
    res.json({ success: true });
});

app.get('/api/lobby/list', (req, res) => {
    const publicRooms = Array.from(rooms.values())
        .filter(r => !r.isPrivate)
        .map(r => ({ ...r, passwordHash: r.passwordHash ? 'protected' : null }));
    res.json(publicRooms);
});

app.listen(3000, () => console.log('Lobby server: http://localhost:3000'));
