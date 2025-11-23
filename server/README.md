# Hockey Game Lobby Server

Central lobby server for multiplayer hockey game. Handles room discovery, password validation, and real-time updates via WebSocket.

## Tech Stack

- Node.js 16+
- Express 4.18
- Socket.io 4.6
- In-memory room storage (no database)

## Features

- Room creation with passwords
- Public room listing
- Password hashing (SHA-256)
- Rate limiting (3 attempts/room/min)
- Auto-cleanup stale rooms (5min timeout)
- Real-time WebSocket updates
- CORS enabled
- Health check endpoint

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed origins (* or specific domain)

Add TURN server in `server/config.js`:
```js
TURN_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:your-server.com:3478', username: 'user', credential: 'pass' }
]
```

## Running

Development:
```bash
npm start
```

Production (with PM2):
```bash
npm install -g pm2
pm2 start server/index.js --name hockey-lobby
pm2 save
pm2 startup
```

## API Endpoints

### Health Check
```
GET /health
Response: { status: 'ok', rooms: 5, uptime: 12345, timestamp: 1700000000 }
```

### Get ICE Servers
```
GET /api/ice-servers
Response: { iceServers: [...] }
```

### Create Room
```
POST /api/rooms
Body: { hostPeerID: 'abc123', hostName: 'Player1', isPrivate: false, password: 'secret' }
Response: { success: true, roomCode: 'ABC123', hostPeerID: 'abc123' }
```

### List Public Rooms
```
GET /api/rooms
Response: [{ roomCode: 'ABC123', hostName: 'Player1', playerCount: 2, maxPlayers: 8, hasPassword: true, createdAt: 1700000000 }]
```

### Join Room
```
POST /api/rooms/:code/join
Body: { password: 'secret' }
Response: { success: true, roomCode: 'ABC123', hostPeerID: 'abc123', hostName: 'Player1' }
Errors:
  404 - Room not found
  429 - Too many attempts (rate limit)
  401 - Invalid password
```

### Heartbeat
```
POST /api/rooms/:code/heartbeat
Body: { playerCount: 3 }
Response: { success: true }
```

### Delete Room
```
DELETE /api/rooms/:code
Response: { success: true }
```

## WebSocket Events

### Client -> Server
```js
socket.emit('subscribe-lobby');    // Start receiving room updates
socket.emit('unsubscribe-lobby');  // Stop receiving updates
```

### Server -> Client
```js
socket.on('rooms-list', (rooms) => { ... });           // Initial room list
socket.on('room-created', (room) => { ... });          // New room created
socket.on('room-updated', (update) => { ... });        // Player count changed
socket.on('room-closed', ({ roomCode }) => { ... });   // Room deleted
```

## Deployment

### Self-hosted VPS

1. SSH to server:
```bash
ssh user@your-server.com
```

2. Clone/upload code:
```bash
git clone <repo-url>
cd hockeyGame
```

3. Install dependencies:
```bash
npm install
```

4. Configure environment:
```bash
cp .env.example .env
nano .env  # Edit PORT and CORS_ORIGIN
```

5. Start with PM2:
```bash
npm install -g pm2
pm2 start server/index.js --name hockey-lobby
pm2 save
pm2 startup  # Follow instructions
```

6. Configure firewall:
```bash
sudo ufw allow 3000/tcp
```

7. Setup reverse proxy (Nginx):
```nginx
server {
    listen 80;
    server_name lobby.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. Enable SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d lobby.your-domain.com
```

### DigitalOcean/Linode/Vultr

Same as VPS, use $5/mo droplet:
- Ubuntu 22.04 LTS
- 1GB RAM minimum
- Open port 3000 or use reverse proxy

### Railway/Render/Fly.io

1. Connect GitHub repo
2. Set environment variables (PORT, CORS_ORIGIN)
3. Deploy automatically

### Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server ./server
EXPOSE 3000
CMD ["node", "server/index.js"]
```

Build and run:
```bash
docker build -t hockey-lobby .
docker run -p 3000:3000 -e CORS_ORIGIN=* hockey-lobby
```

## Security

- Passwords hashed with SHA-256
- Rate limiting (3 attempts/min per room)
- Input validation (6-50 chars)
- XSS protection (JSON only, no HTML)
- CORS configuration
- No persistent storage (privacy)

## Monitoring

PM2 monitoring:
```bash
pm2 status
pm2 logs hockey-lobby
pm2 monit
```

Health check:
```bash
curl http://localhost:3000/health
```

## Troubleshooting

**Server won't start:**
- Check port not in use: `lsof -i :3000`
- Check Node version: `node -v` (need 16+)
- Check dependencies: `npm install`

**CORS errors:**
- Set `CORS_ORIGIN` in `.env`
- Production: use specific domain, not `*`

**Rooms not appearing:**
- Check WebSocket connection in browser console
- Verify firewall allows WebSocket upgrade
- Check reverse proxy WebSocket config

**Memory leak:**
- Rooms auto-cleanup after 5min
- Rate limit maps cleared automatically
- Restart server if needed: `pm2 restart hockey-lobby`

## Performance

Current limits:
- Max 100 rooms
- Max 8 players per room
- 5min room timeout
- 30s heartbeat interval
- 100 requests/15min per IP

Scale up:
- Increase MAX_ROOMS in config.js
- Add Redis for multi-server setup
- Use load balancer for >1000 concurrent

## Client Integration

```js
// Fetch ICE servers
const res = await fetch('https://lobby.your-domain.com/api/ice-servers');
const { iceServers } = await res.json();

// Create room
const createRes = await fetch('https://lobby.your-domain.com/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostPeerID: 'abc', hostName: 'Player1', isPrivate: false, password: 'secret' })
});
const { roomCode } = await createRes.json();

// WebSocket connection
const socket = io('https://lobby.your-domain.com');
socket.emit('subscribe-lobby');
socket.on('rooms-list', (rooms) => console.log(rooms));
socket.on('room-created', (room) => console.log('New room:', room));
```

## License

MIT
