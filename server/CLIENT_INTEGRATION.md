# Client Integration Guide

How to integrate the frontend with the production lobby server.

## Server URL Configuration

Update `src/multiplayer/lobby.js`:

```js
// Change this line:
this.fallbackURL = 'https://your-server.com/api/lobby';

// To:
this.fallbackURL = 'https://your-domain.com/api';
```

## API Endpoints Used

### Create Room
```js
const response = await fetch('https://your-domain.com/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        hostPeerID: peerID,
        hostName: playerName,
        isPrivate: false,
        password: 'optional123'
    })
});
const { roomCode, hostPeerID } = await response.json();
```

### List Public Rooms
```js
const response = await fetch('https://your-domain.com/api/rooms');
const rooms = await response.json();
// rooms = [{ roomCode, hostName, playerCount, maxPlayers, hasPassword, createdAt }]
```

### Join Room (with password)
```js
const response = await fetch(`https://your-domain.com/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'secret123' })
});
const { success, roomCode, hostPeerID, hostName } = await response.json();
```

### Send Heartbeat
```js
setInterval(() => {
    fetch(`https://your-domain.com/api/rooms/${roomCode}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerCount: 3 })
    });
}, 30000); // Every 30s
```

### Delete Room
```js
await fetch(`https://your-domain.com/api/rooms/${roomCode}`, {
    method: 'DELETE'
});
```

### Get ICE Servers
```js
const response = await fetch('https://your-domain.com/api/ice-servers');
const { iceServers } = await response.json();

// Use in PeerJS config:
const peer = new Peer({
    config: { iceServers }
});
```

## WebSocket Integration

Add to your multiplayer manager:

```js
import io from 'socket.io-client';

class MultiplayerManager {
    constructor() {
        this.socket = null;
    }

    connectToLobby() {
        this.socket = io('https://your-domain.com');

        // Subscribe to lobby updates
        this.socket.emit('subscribe-lobby');

        // Listen for room updates
        this.socket.on('rooms-list', (rooms) => {
            this.updateRoomList(rooms);
        });

        this.socket.on('room-created', (room) => {
            console.log('New room:', room);
            this.addRoomToList(room);
        });

        this.socket.on('room-updated', ({ roomCode, playerCount }) => {
            console.log(`Room ${roomCode} now has ${playerCount} players`);
            this.updateRoomPlayerCount(roomCode, playerCount);
        });

        this.socket.on('room-closed', ({ roomCode }) => {
            console.log(`Room ${roomCode} closed`);
            this.removeRoomFromList(roomCode);
        });
    }

    disconnectFromLobby() {
        if (this.socket) {
            this.socket.emit('unsubscribe-lobby');
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
```

## Client Code Updates Needed

### 1. Update lobby.js fallback URL

File: `/home/user/hockeyGame/src/multiplayer/lobby.js`

Line 11:
```js
// OLD:
this.fallbackURL = 'https://your-server.com/api/lobby';

// NEW:
this.fallbackURL = 'https://your-domain.com/api';
```

Lines 314-322 (registerRoomFallback):
```js
// OLD:
await fetch(`${this.fallbackURL}/register`, {

// NEW:
await fetch(`${this.fallbackURL}/rooms`, {
```

Lines 324-332 (unregisterRoomFallback):
```js
// OLD:
await fetch(`${this.fallbackURL}/unregister`, {
    method: 'POST',
    body: JSON.stringify({ roomCode })
});

// NEW:
await fetch(`${this.fallbackURL}/rooms/${roomCode}`, {
    method: 'DELETE'
});
```

Lines 336-344 (fetchRoomsFallback):
```js
// OLD:
const response = await fetch(`${this.fallbackURL}/list`);

// NEW:
const response = await fetch(`${this.fallbackURL}/rooms`);
```

### 2. Add Socket.io to HTML

File: `/home/user/hockeyGame/index.html`

Add before other scripts:
```html
<script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
```

### 3. Update connection.js for TURN servers

File: `/home/user/hockeyGame/src/multiplayer/connection.js`

Add method to fetch ICE servers:
```js
async getICEServers() {
    try {
        const response = await fetch('https://your-domain.com/api/ice-servers');
        const { iceServers } = await response.json();
        return iceServers;
    } catch (err) {
        console.warn('Failed to fetch ICE servers, using defaults');
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
}

async initPeer() {
    const iceServers = await this.getICEServers();
    this.peer = new Peer({
        config: { iceServers }
    });
}
```

## Environment Variables

Production `.env`:
```bash
PORT=3000
CORS_ORIGIN=https://your-domain.com
```

Development `.env`:
```bash
PORT=3000
CORS_ORIGIN=*
```

## Testing Locally

1. Start server:
```bash
npm install
npm start
```

2. Test endpoints:
```bash
# Health check
curl http://localhost:3000/health

# Create room
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"hostPeerID":"test123","hostName":"Player1","isPrivate":false}'

# List rooms
curl http://localhost:3000/api/rooms
```

3. Update client to use `http://localhost:3000/api`

4. Open game in browser and test multiplayer

## Production Deployment Checklist

- [ ] Update `CORS_ORIGIN` in `.env` to your domain
- [ ] Update client `fallbackURL` to production domain
- [ ] Add TURN server credentials in `server/config.js`
- [ ] Setup PM2 with `server/ecosystem.config.js`
- [ ] Configure Nginx with `server/nginx.conf`
- [ ] Enable SSL with Let's Encrypt
- [ ] Test all endpoints from client
- [ ] Test WebSocket connection
- [ ] Monitor logs with `pm2 logs`

## Error Handling

Common errors:

**CORS error:**
- Update `CORS_ORIGIN` in server `.env`
- Check Nginx proxy headers

**WebSocket fails:**
- Verify Nginx WebSocket proxy config
- Check firewall allows WebSocket upgrade
- Use WSS (secure WebSocket) in production

**Room not found:**
- Room expired (5min timeout)
- Check heartbeat is sent every 30s
- Verify room code is correct

**Password rate limit:**
- Wait 60s after 3 failed attempts
- Check client IP not blocked

## Support

Check server logs:
```bash
pm2 logs hockey-lobby-server
tail -f /var/log/pm2/hockey-lobby-error.log
```

Monitor health:
```bash
curl https://your-domain.com/health
```
