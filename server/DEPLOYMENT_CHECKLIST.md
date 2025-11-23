# Deployment Checklist

Quick deployment guide for production server.

## Pre-Deployment

- [ ] Node.js 16+ installed on server
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] Nginx installed
- [ ] Domain DNS pointed to server IP
- [ ] Firewall configured (ports 80, 443, 3000)

## Installation Steps

### 1. Upload Code
```bash
# SSH to server
ssh user@your-server.com

# Clone repo or upload files
git clone <repo-url> /var/www/hockey-game
cd /var/www/hockey-game

# Or use rsync
rsync -avz --exclude 'node_modules' ./ user@server:/var/www/hockey-game/
```

### 2. Install Dependencies
```bash
cd /var/www/hockey-game
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
nano .env
```

Set:
```
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

### 4. Update PM2 Config
```bash
nano server/ecosystem.config.js
```

Change `cwd` and `CORS_ORIGIN`:
```js
cwd: '/var/www/hockey-game',
env_production: {
    CORS_ORIGIN: 'https://yourdomain.com'
}
```

### 5. Start with PM2
```bash
pm2 start server/ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow instructions
```

### 6. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/hockey-game
```

Copy contents from `server/nginx.conf`, update:
- `server_name yourdomain.com www.yourdomain.com`
- All SSL certificate paths

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/hockey-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Setup SSL
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 8. Update Client Code

Edit `/var/www/hockey-game/src/multiplayer/lobby.js`:

Line 11:
```js
this.fallbackURL = 'https://yourdomain.com/api';
```

### 9. Test Everything

Health check:
```bash
curl https://yourdomain.com/health
```

Create room:
```bash
curl -X POST https://yourdomain.com/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"hostPeerID":"test","hostName":"Test","isPrivate":false}'
```

WebSocket (in browser console):
```js
const socket = io('https://yourdomain.com');
socket.emit('subscribe-lobby');
socket.on('rooms-list', console.log);
```

### 10. Monitor

```bash
pm2 logs hockey-lobby-server
pm2 monit
tail -f /var/log/nginx/hockey-game-access.log
tail -f /var/log/nginx/hockey-game-error.log
```

## Post-Deployment

- [ ] Test room creation from game UI
- [ ] Test room listing
- [ ] Test password-protected rooms
- [ ] Test WebSocket real-time updates
- [ ] Test heartbeat/auto-cleanup
- [ ] Load test with multiple clients
- [ ] Setup monitoring alerts
- [ ] Document server credentials

## Troubleshooting

**Server won't start:**
```bash
pm2 logs hockey-lobby-server --err
pm2 restart hockey-lobby-server
```

**Port conflict:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Nginx config error:**
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

**CORS errors:**
- Check `CORS_ORIGIN` in `.env`
- Restart PM2: `pm2 restart hockey-lobby-server`
- Check Nginx proxy headers

**WebSocket fails:**
- Verify Nginx `/socket.io/` location block
- Check firewall allows WebSocket upgrade
- Test with `wscat`: `wscat -c wss://yourdomain.com/socket.io/`

**Memory issues:**
```bash
pm2 restart hockey-lobby-server
# Increase max_memory_restart in ecosystem.config.js
```

## Maintenance

Daily:
```bash
pm2 status
curl https://yourdomain.com/health
```

Weekly:
```bash
pm2 logs --lines 100
sudo systemctl status nginx
df -h  # Check disk space
```

Monthly:
```bash
npm audit
npm update
sudo certbot renew  # Auto-renewed, but check
```

## Rollback Plan

If deployment fails:

1. Stop PM2:
```bash
pm2 stop hockey-lobby-server
```

2. Restore previous version:
```bash
git checkout <previous-commit>
npm install
```

3. Restart:
```bash
pm2 restart hockey-lobby-server
```

## Scaling

For >1000 concurrent users:

1. Add Redis for room storage
2. Use PM2 cluster mode (multiple instances)
3. Setup load balancer
4. Add monitoring (Datadog, New Relic)

## Contact

Server admin: [email]
Developer: [email]
Documentation: /home/user/hockeyGame/server/README.md
