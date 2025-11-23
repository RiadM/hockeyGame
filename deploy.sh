#!/bin/bash
# Hockey Stats Game - Automated Deployment Script
# Usage: ./deploy.sh [staging|production]

set -e  # Exit on error

# Configuration
DEPLOY_ENV="${1:-production}"
DOMAIN="yourdomain.com"  # CHANGE THIS
REPO_URL="https://github.com/yourusername/hockey-game.git"  # CHANGE THIS
DEPLOY_DIR="/var/www/hockey-game"
NGINX_CONFIG="/etc/nginx/sites-available/hockey-game"
PM2_CONFIG="/var/www/hockey-game/server/ecosystem.config.js"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Hockey Stats Game - Deployment${NC}"
echo -e "Environment: ${YELLOW}${DEPLOY_ENV}${NC}"
echo "----------------------------------------"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}ERROR: Do not run as root. Use sudo for specific commands.${NC}"
   exit 1
fi

# 1. Install system dependencies
echo -e "\n${YELLOW}[1/10] Installing system dependencies...${NC}"
sudo apt-get update
sudo apt-get install -y nginx nodejs npm git certbot python3-certbot-nginx

# 2. Install PM2 globally
echo -e "\n${YELLOW}[2/10] Installing PM2...${NC}"
sudo npm install -g pm2

# 3. Create deployment directory
echo -e "\n${YELLOW}[3/10] Creating deployment directory...${NC}"
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR

# 4. Clone or pull repository
echo -e "\n${YELLOW}[4/10] Deploying code...${NC}"
if [ -d "$DEPLOY_DIR/.git" ]; then
    echo "Repository exists, pulling latest..."
    cd $DEPLOY_DIR
    git fetch origin
    git reset --hard origin/main  # or master
    git pull origin main
else
    echo "Cloning repository..."
    git clone $REPO_URL $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

# 5. Install Node.js dependencies
echo -e "\n${YELLOW}[5/10] Installing Node.js dependencies...${NC}"
npm install --production

# 6. Configure Nginx
echo -e "\n${YELLOW}[6/10] Configuring Nginx...${NC}"
if [ ! -f "$NGINX_CONFIG" ]; then
    sudo cp server/nginx.conf $NGINX_CONFIG

    # Replace domain placeholder
    sudo sed -i "s/yourdomain.com/$DOMAIN/g" $NGINX_CONFIG

    # Enable site
    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/hockey-game

    # Test config
    sudo nginx -t

    echo -e "${GREEN}Nginx configured successfully${NC}"
else
    echo "Nginx config already exists, skipping..."
fi

# 7. Setup SSL with Let's Encrypt
echo -e "\n${YELLOW}[7/10] Setting up SSL...${NC}"
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Obtaining SSL certificate from Let's Encrypt..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

    # Setup auto-renewal
    sudo systemctl enable certbot.timer
    sudo systemctl start certbot.timer

    echo -e "${GREEN}SSL certificate obtained and auto-renewal configured${NC}"
else
    echo "SSL certificate already exists, skipping..."
fi

# 8. Configure and start PM2
echo -e "\n${YELLOW}[8/10] Starting lobby server with PM2...${NC}"

# Update PM2 config with correct path
sudo sed -i "s|/var/www/hockey-game|$DEPLOY_DIR|g" $PM2_CONFIG

# Create PM2 log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Start or restart PM2 app
pm2 delete hockey-lobby-server 2>/dev/null || true
pm2 start $PM2_CONFIG --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo -e "${GREEN}Lobby server started with PM2${NC}"

# 9. Reload Nginx
echo -e "\n${YELLOW}[9/10] Reloading Nginx...${NC}"
sudo systemctl reload nginx
sudo systemctl enable nginx

# 10. Verify deployment
echo -e "\n${YELLOW}[10/10] Verifying deployment...${NC}"

# Check Nginx status
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx is not running${NC}"
    exit 1
fi

# Check PM2 status
if pm2 list | grep -q "hockey-lobby-server"; then
    echo -e "${GREEN}✓ Lobby server is running${NC}"
else
    echo -e "${RED}✗ Lobby server is not running${NC}"
    exit 1
fi

# Check HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/index.html || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓ HTTP server responding (code: $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ HTTP server not responding (code: $HTTP_CODE)${NC}"
fi

# Check lobby API
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/lobby/list || echo "000")
if [ "$API_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Lobby API responding${NC}"
else
    echo -e "${YELLOW}⚠ Lobby API not responding (code: $API_CODE)${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo "========================================="
echo ""
echo "Game URL: https://$DOMAIN"
echo "Lobby API: https://$DOMAIN/api/lobby/list"
echo ""
echo "Useful commands:"
echo "  - View logs: pm2 logs hockey-lobby-server"
echo "  - Restart: pm2 restart hockey-lobby-server"
echo "  - Status: pm2 status"
echo "  - Nginx logs: sudo tail -f /var/log/nginx/hockey-game-*.log"
echo "  - Test SSL: sudo certbot renew --dry-run"
echo ""
echo "Next steps:"
echo "  1. Test game at https://$DOMAIN"
echo "  2. Create multiplayer room"
echo "  3. Join from different device"
echo "  4. Monitor logs for errors"
echo ""
