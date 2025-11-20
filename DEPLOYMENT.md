# Hockey Stats Game - Deployment Guide

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ server
- Domain name pointing to server IP
- SSH access with sudo privileges
- At least 1GB RAM, 1 CPU core
- 10GB disk space

## Quick Start (Automated)

```bash
# 1. Clone repository
git clone <your-repo-url> /var/www/hockey-game
cd /var/www/hockey-game

# 2. Configure domain
# Edit deploy.sh and change DOMAIN="yourdomain.com"
nano deploy.sh

# 3. Run deployment script
./deploy.sh production

# 4. Test deployment
curl https://yourdomain.com
```

## Manual Deployment

### 1. Server Setup

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify versions
node --version  # Should be v18+
npm --version   # Should be v9+

# Install system dependencies
sudo apt-get install -y nginx git certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Application Setup

```bash
# Create deployment directory
sudo mkdir -p /var/www/hockey-game
sudo chown -R $USER:$USER /var/www/hockey-game

# Clone repository
git clone <your-repo-url> /var/www/hockey-game
cd /var/www/hockey-game

# Install Node.js dependencies
npm install --production
```

### 3. Nginx Configuration

```bash
# Copy nginx config
sudo cp server/nginx.conf /etc/nginx/sites-available/hockey-game

# Edit config - replace yourdomain.com with your actual domain
sudo nano /etc/nginx/sites-available/hockey-game

# Enable site
sudo ln -s /etc/nginx/sites-available/hockey-game /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Obtain certificate (replace yourdomain.com)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

### 5. PM2 Process Manager

```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Edit PM2 config - update paths
nano server/ecosystem.config.js
# Change cwd: '/var/www/hockey-game' to your actual path
# Change CORS_ORIGIN to your domain

# Start lobby server
pm2 start server/ecosystem.config.js --env production

# Check status
pm2 status
pm2 logs hockey-lobby-server

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

### 6. DNS Configuration

Point your domain to server IP:

**A Records:**
```
Type: A
Name: @
Value: <your-server-ip>
TTL: 3600

Type: A
Name: www
Value: <your-server-ip>
TTL: 3600
```

**Wait 5-60 minutes for DNS propagation**

### 7. Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow SSH (if not already allowed)
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│           User's Browser                │
│  ┌──────────────────────────────────┐   │
│  │ Frontend (HTML/CSS/JS)           │   │
│  │ - PeerJS client                  │   │
│  │ - Game logic                     │   │
│  │ - Multiplayer UI                 │   │
│  └──────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │ HTTPS
              ▼
┌─────────────────────────────────────────┐
│         Nginx (Port 80/443)             │
│  ┌──────────────────────────────────┐   │
│  │ SSL Termination                  │   │
│  │ Static file serving              │   │
│  │ Reverse proxy (/api/lobby)       │   │
│  └──────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │
              ├─ Static files (HTML/CSS/JS)
              │
              └─ Proxy /api/lobby/* ──────►
                                            │
                ┌───────────────────────────▼──┐
                │  Node.js Lobby Server        │
                │  (PM2 managed, Port 3000)    │
                │  ┌────────────────────────┐  │
                │  │ Express app            │  │
                │  │ - Room registry        │  │
                │  │ - Room discovery       │  │
                │  │ - In-memory storage    │  │
                │  └────────────────────────┘  │
                └──────────────────────────────┘

┌─────────────────────────────────────────┐
│      PeerJS Cloud (0.peerjs.com)        │
│  - WebRTC signaling                     │
│  - NAT traversal (STUN)                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   OpenRelay TURN (openrelay.metered.ca) │
│  - NAT/firewall relay                   │
│  - Fallback for strict networks         │
└─────────────────────────────────────────┘
```

## File Structure

```
/var/www/hockey-game/
├── index.html                    # Main entry point
├── hockey_version_25oct.html     # Legacy entry point
├── src/
│   ├── game.js                   # Game logic
│   ├── styles.css                # Styles
│   ├── config.js                 # Configuration
│   ├── data.js                   # Player data
│   ├── ui/                       # UI components
│   ├── multiplayer/              # Multiplayer modules
│   │   ├── lobby-server.js       # Node.js lobby server
│   │   ├── lobby.js              # Client-side lobby
│   │   ├── connection.js         # PeerJS connection
│   │   ├── chat.js               # Chat system
│   │   ├── sync.js               # State synchronization
│   │   ├── host-migration.js     # Host migration
│   │   └── reconnection.js       # Reconnection logic
│   └── services/                 # Service modules
├── server/
│   ├── ecosystem.config.js       # PM2 configuration
│   └── nginx.conf                # Nginx configuration
├── package.json                  # Node.js dependencies
├── deploy.sh                     # Deployment script
└── .github/workflows/
    └── deploy.yml                # CI/CD pipeline
```

## Environment Variables

Create `/var/www/hockey-game/.env` (optional):

```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

Load in `lobby-server.js`:
```javascript
require('dotenv').config();
const PORT = process.env.PORT || 3000;
```

## Monitoring & Maintenance

### Check Service Status

```bash
# Nginx
sudo systemctl status nginx
sudo nginx -t

# PM2
pm2 status
pm2 monit

# SSL certificate
sudo certbot certificates
```

### View Logs

```bash
# PM2 logs
pm2 logs hockey-lobby-server
pm2 logs --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/hockey-game-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/hockey-game-error.log

# System logs
sudo journalctl -u nginx -f
```

### Restart Services

```bash
# Restart lobby server
pm2 restart hockey-lobby-server

# Restart all PM2 apps
pm2 restart all

# Reload nginx (zero downtime)
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx
```

### Update Deployment

```bash
cd /var/www/hockey-game

# Pull latest code
git pull origin main

# Install new dependencies
npm install --production

# Restart lobby server
pm2 restart hockey-lobby-server

# Reload nginx (if config changed)
sudo systemctl reload nginx
```

### SSL Certificate Renewal

```bash
# Renew certificate (automatic via cron/systemd timer)
sudo certbot renew

# Force renew (testing)
sudo certbot renew --force-renewal

# Check auto-renewal timer
sudo systemctl status certbot.timer
```

## CI/CD Setup (GitHub Actions)

### 1. Generate SSH Key on Server

```bash
# On server
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github-actions  # Copy this private key
```

### 2. Add GitHub Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
- `SERVER_HOST`: Your server IP or domain
- `SERVER_USER`: SSH username (e.g., ubuntu, root, deploy)
- `SERVER_SSH_KEY`: Private key from step 1
- `SLACK_WEBHOOK`: (Optional) Slack webhook URL for notifications

### 3. Push to Main Branch

```bash
git add .
git commit -m "Add deployment pipeline"
git push origin main
```

Deployment runs automatically on push to `main`.

## Testing Deployment

### 1. Basic Health Check

```bash
# Check HTTP response
curl -I https://yourdomain.com

# Check API endpoint
curl https://yourdomain.com/api/lobby/list

# Check lobby server directly
curl http://localhost:3000/api/lobby/list
```

### 2. Single Player Test

1. Open https://yourdomain.com
2. Click "Solo Mode"
3. Play one round
4. Verify no console errors

### 3. Multiplayer Test

1. Device A: Create room
2. Note room code
3. Device B (different network): Join room with code
4. Verify both players appear in leaderboard
5. Test chat messages
6. Play one round
7. Verify score synchronization

### 4. Performance Test

```bash
# Run Lighthouse
npm install -g lighthouse
lighthouse https://yourdomain.com --view

# Load testing (optional)
npm install -g artillery
artillery quick --count 10 --num 50 https://yourdomain.com
```

## Troubleshooting

### Nginx won't start

```bash
# Check config syntax
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check if port 80/443 is already in use
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Kill conflicting process
sudo systemctl stop apache2  # If Apache is running
```

### PM2 app crashes

```bash
# Check logs
pm2 logs hockey-lobby-server --err

# Check if port 3000 is available
sudo netstat -tlnp | grep :3000

# Restart app
pm2 restart hockey-lobby-server

# Delete and recreate
pm2 delete hockey-lobby-server
pm2 start server/ecosystem.config.js --env production
```

### SSL certificate issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

### Players can't connect (multiplayer)

**Possible causes:**

1. **CORS issues**: Check browser console for CORS errors
   - Fix: Update CORS_ORIGIN in ecosystem.config.js

2. **WebRTC blocked**: Corporate firewall blocking WebRTC
   - Fix: Ensure TURN servers configured in game code

3. **HTTPS required**: WebRTC requires HTTPS
   - Fix: Ensure SSL certificate is valid

4. **PeerJS server down**: Check 0.peerjs.com status
   - Fix: Consider self-hosting PeerJS server

### Check logs for errors

```bash
# All logs at once
pm2 logs hockey-lobby-server --lines 50 &
sudo tail -f /var/log/nginx/hockey-game-error.log
```

## Performance Optimization

### Enable Nginx Caching

Add to nginx.conf (already included):

```nginx
location ~* \.(html|css|js|json|jpg|jpeg|png|gif|ico|svg)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

### Enable Gzip Compression

Already included in nginx.conf

### Use CDN (Optional)

- Cloudflare (free plan available)
- AWS CloudFront
- Fastly

Point DNS to CDN, CDN pulls from origin server.

## Security Hardening

### 1. Disable Root SSH

```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

### 2. Setup Fail2Ban

```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Auto Security Updates

```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 4. Monitor with Uptime Robot

- Sign up at uptimerobot.com
- Add monitor: https://yourdomain.com
- Get alerts via email/SMS when site goes down

## Scaling Considerations

### Current Limits

- **Players**: 8 per room (PeerJS P2P mesh)
- **Concurrent rooms**: ~100 (limited by lobby server memory)
- **Bandwidth**: Minimal (P2P after initial connection)

### If You Need More

1. **More players per room**: Switch from mesh to SFU (Selective Forwarding Unit)
   - Use Janus, Mediasoup, or LiveKit

2. **More concurrent rooms**: Add Redis for lobby storage
   - Install Redis
   - Update lobby-server.js to use Redis instead of Map

3. **Global distribution**: Deploy to multiple regions
   - Use Cloudflare Workers for edge routing
   - Run lobby servers in US, EU, Asia

4. **High availability**: Multiple backend servers
   - Load balancer (nginx, HAProxy, Cloudflare)
   - PM2 cluster mode: `instances: 'max'`

## Costs

**Minimal setup (self-hosted):**
- Server: $5-10/month (DigitalOcean, Linode, Vultr)
- Domain: $10-15/year (Namecheap, Google Domains)
- SSL: Free (Let's Encrypt)
- **Total: ~$6-11/month**

**With upgrades:**
- TURN server (Twilio): $0.0004/min per participant
- CDN (Cloudflare): Free or $20/month
- Monitoring (Sentry): Free tier or $26/month

## Support

- TURN server issues: https://github.com/coturn/coturn
- PeerJS issues: https://github.com/peers/peerjs
- Nginx docs: https://nginx.org/en/docs/
- PM2 docs: https://pm2.keymetrics.io/docs/
- Let's Encrypt: https://letsencrypt.org/docs/

## Rollback Plan

```bash
# If deployment fails, rollback to previous version
cd /var/www/hockey-game
git log --oneline  # Find previous commit
git reset --hard <commit-hash>
pm2 restart hockey-lobby-server
sudo systemctl reload nginx
```

## Backup Strategy

```bash
# Backup script
#!/bin/bash
BACKUP_DIR="/var/backups/hockey-game"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cd /var/www/hockey-game

# Backup code
tar -czf $BACKUP_DIR/code-$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  .

# Keep last 7 days of backups
find $BACKUP_DIR -name "code-*.tar.gz" -mtime +7 -delete
```

Run daily via cron:
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

**Deployment completed!** Game should be live at https://yourdomain.com
