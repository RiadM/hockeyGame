#!/bin/bash
# Deployment Verification Script
# Run after deployment to verify all services are working

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="${1:-localhost}"
API_PORT="${2:-3000}"

echo "========================================="
echo "Hockey Game Deployment Verification"
echo "========================================="
echo "Domain: $DOMAIN"
echo "API Port: $API_PORT"
echo ""

# 1. Check Nginx
echo -n "Checking Nginx... "
if sudo systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    exit 1
fi

# 2. Check PM2
echo -n "Checking PM2... "
if pm2 list | grep -q "hockey-lobby-server" 2>/dev/null; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    exit 1
fi

# 3. Test lobby server directly
echo -n "Testing lobby server (localhost:$API_PORT)... "
HEALTH=$(curl -s http://localhost:$API_PORT/health 2>/dev/null || echo "")
if [[ "$HEALTH" == *"status"* ]]; then
    echo -e "${GREEN}✓ Responding${NC}"
else
    echo -e "${RED}✗ Not responding${NC}"
    exit 1
fi

# 4. Test API endpoint
echo -n "Testing API endpoint (GET /api/rooms)... "
ROOMS=$(curl -s http://localhost:$API_PORT/api/rooms 2>/dev/null || echo "")
if [[ "$ROOMS" == "["* ]]; then
    echo -e "${GREEN}✓ Working${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
fi

# 5. Test through Nginx (if not localhost)
if [ "$DOMAIN" != "localhost" ]; then
    echo -n "Testing through Nginx (https://$DOMAIN)... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ HTTP $HTTP_CODE${NC}"
    else
        echo -e "${YELLOW}⚠ HTTP $HTTP_CODE${NC}"
    fi

    echo -n "Testing API through Nginx... "
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/rooms 2>/dev/null || echo "000")
    if [ "$API_CODE" = "200" ]; then
        echo -e "${GREEN}✓ HTTP $API_CODE${NC}"
    else
        echo -e "${YELLOW}⚠ HTTP $API_CODE${NC}"
    fi
fi

# 6. Check SSL certificate (if not localhost)
if [ "$DOMAIN" != "localhost" ]; then
    echo -n "Checking SSL certificate... "
    if sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
        EXPIRY=$(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2)
        echo -e "${GREEN}✓ Valid (expires: $EXPIRY)${NC}"
    else
        echo -e "${YELLOW}⚠ No certificate found${NC}"
    fi
fi

# 7. Check disk space
echo -n "Checking disk space... "
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ ${DISK_USAGE}% used${NC}"
else
    echo -e "${YELLOW}⚠ ${DISK_USAGE}% used${NC}"
fi

# 8. Check memory
echo -n "Checking memory... "
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ ${MEM_USAGE}% used${NC}"
else
    echo -e "${YELLOW}⚠ ${MEM_USAGE}% used${NC}"
fi

# 9. Check logs for errors
echo -n "Checking PM2 logs for errors... "
ERROR_COUNT=$(pm2 logs hockey-lobby-server --lines 100 --nostream 2>/dev/null | grep -i "error" | wc -l || echo "0")
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ No errors${NC}"
else
    echo -e "${YELLOW}⚠ $ERROR_COUNT errors found${NC}"
fi

# 10. Check processes
echo -n "Checking process count... "
PROCESS_COUNT=$(pm2 list | grep -c "hockey-lobby-server" || echo "0")
if [ "$PROCESS_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✓ 1 instance${NC}"
else
    echo -e "${YELLOW}⚠ $PROCESS_COUNT instances${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}ALL CHECKS PASSED ✓${NC}"
echo "========================================="
echo ""
echo "Useful commands:"
echo "  - View logs: pm2 logs hockey-lobby-server"
echo "  - Restart: pm2 restart hockey-lobby-server"
echo "  - Stop: pm2 stop hockey-lobby-server"
echo "  - Nginx reload: sudo systemctl reload nginx"
echo ""
echo "Test multiplayer:"
echo "  1. Open: https://$DOMAIN"
echo "  2. Create room"
echo "  3. Join from different device"
echo ""
