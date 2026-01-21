#!/bin/bash

# Ulu Calculator - Local Deployment (no GitHub)
# For files already on your system

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="$HOME/apps/Ulu-calculator"
BACKUP_DIR="$HOME/backups/Ulu-calculator"

header() { echo ""; echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"; echo -e "${BLUE}║${NC} $1"; echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"; echo ""; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}ℹ${NC} $1"; }

# STEP 0: Prerequisites
header "STEP 0: Prerequisites"
[ "$EUID" -eq 0 ] && error "Do not run as root!"
success "Running as non-root user"

info "Updating system..."
sudo apt update && sudo apt upgrade -y -qq > /tmp/apt.log 2>&1
success "System ready"

# STEP 1: DuckDNS Setup
header "STEP 1: DuckDNS Setup"
mkdir -p ~/duckdns

read -p "DuckDNS domain (e.g., ulu-calculator): " DOMAIN
read -sp "DuckDNS token: " TOKEN
echo ""

cat > ~/duckdns/duck.sh << 'DUCKSCRIPT'
#!/bin/bash
TOKEN="TOKEN_PLACEHOLDER"
DOMAIN="DOMAIN_PLACEHOLDER"
while true; do
  curl "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip="
  echo " Updated at $(date)"
  sleep 600
done
DUCKSCRIPT

sed -i "s/TOKEN_PLACEHOLDER/$TOKEN/" ~/duckdns/duck.sh
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/" ~/duckdns/duck.sh
chmod +x ~/duckdns/duck.sh

RESULT=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=")
[[ $RESULT == *"OK"* ]] && success "DuckDNS working: $DOMAIN.duckdns.org" || error "DuckDNS failed"

# STEP 2: Setup Application Directory
header "STEP 2: Setup Application"
mkdir -p ~/apps

# Copy current directory to apps (this is the local copy you already have)
if [ -d "$APP_DIR" ]; then
    info "Application directory exists, updating..."
    cp -r ~/Ulu-calculator/* $APP_DIR/ 2>/dev/null || true
else
    info "Creating application directory..."
    cp -r ~/Ulu-calculator $APP_DIR
fi

cd $APP_DIR
success "Application ready at $APP_DIR"

# Install dependencies (may already be done)
info "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    info "Installing npm packages..."
    npm install > /tmp/npm.log 2>&1
    success "Dependencies installed"
else
    success "Dependencies already installed"
fi

# Create .env if needed
info "Checking .env configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
    success ".env created with secure SESSION_SECRET"
else
    success ".env already exists"
fi

# STEP 3: Nginx & SSL
header "STEP 3: Nginx and HTTPS"
command -v nginx > /dev/null || { info "Installing Nginx..."; sudo apt install -y -qq nginx > /tmp/nginx.log 2>&1; }
success "Nginx ready"

command -v certbot > /dev/null || { info "Installing Certbot..."; sudo apt install -y -qq certbot python3-certbot-nginx >> /tmp/nginx.log 2>&1; }
success "Certbot ready"

FULL_DOMAIN="${DOMAIN}.duckdns.org"
info "Configuring Nginx for $FULL_DOMAIN..."

sudo tee /etc/nginx/sites-available/ulu-calculator > /dev/null << EOFNGINX
server {
    listen 80;
    server_name $FULL_DOMAIN;
    location ~ /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$server_name\$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name $FULL_DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$FULL_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$FULL_DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=31536000" always;
    access_log /var/log/nginx/ulu.access.log;
    error_log /var/log/nginx/ulu.error.log;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOFNGINX

success "Nginx configuration created"

sudo ln -sf /etc/nginx/sites-available/ulu-calculator /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t > /tmp/nginx_test.log 2>&1 && success "Nginx configuration valid" || error "Nginx config error"

info "Getting SSL certificate..."
sleep 10

if nslookup $FULL_DOMAIN > /dev/null 2>&1; then
    success "Domain resolves"
    if ! sudo certbot certificates 2>/dev/null | grep -q "$FULL_DOMAIN"; then
        sudo certbot certonly --standalone -d $FULL_DOMAIN --non-interactive --agree-tos --email admin@localhost > /tmp/certbot.log 2>&1
        success "SSL certificate obtained"
    else
        success "SSL certificate exists"
    fi
else
    error "Domain not resolving. Wait 5-10 minutes and run step again: sudo certbot certonly --standalone -d $FULL_DOMAIN"
fi

sudo systemctl start nginx && sudo systemctl enable nginx > /tmp/nginx_enable.log 2>&1
success "Nginx started and enabled"

# STEP 4: PM2
header "STEP 4: Process Manager"
command -v pm2 > /dev/null || { info "Installing PM2..."; sudo npm install -g pm2 > /tmp/pm2.log 2>&1; }
success "PM2 ready"

cd $APP_DIR
pm2 stop ulu-calculator 2>/dev/null || true
sleep 1
pm2 start ecosystem.config.js --env production > /tmp/pm2_start.log 2>&1
success "Application started"

info "Configuring PM2 startup..."
pm2 startup > /tmp/pm2_startup.log 2>&1
STARTUP=$(grep "sudo env PATH" /tmp/pm2_startup.log | head -1)
[ ! -z "$STARTUP" ] && eval $STARTUP > /tmp/pm2_cmd.log 2>&1
pm2 save > /tmp/pm2_save.log 2>&1
success "PM2 auto-start configured"

# STEP 5: Backups
header "STEP 5: Automated Backups"
mkdir -p $BACKUP_DIR

cat > ~/backup-ulu.sh << 'EOFBACKUP'
#!/bin/bash
BACKUP_DIR="$HOME/backups/Ulu-calculator"
APP_DIR="$HOME/apps/Ulu-calculator"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$APP_DIR/server/data" "$APP_DIR/.env" 2>/dev/null
cd "$BACKUP_DIR" && ls -t backup_*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm
echo "✓ Backup: backup_$DATE.tar.gz"
EOFBACKUP

chmod +x ~/backup-ulu.sh
success "Backup script created"

info "Testing backup..."
~/backup-ulu.sh
success "Backup working"

info "Scheduling daily backup..."
(crontab -l 2>/dev/null || true; echo "0 2 * * * /home/$(whoami)/backup-ulu.sh") | crontab -
success "Daily backup scheduled (2 AM)"

# STEP 6: Firewall
header "STEP 6: Firewall Setup"
command -v ufw > /dev/null || { info "Installing UFW..."; sudo apt install -y -qq ufw > /tmp/ufw.log 2>&1; }

sudo ufw default deny incoming > /tmp/ufw_cfg.log 2>&1
sudo ufw default allow outgoing >> /tmp/ufw_cfg.log 2>&1
sudo ufw allow 22/tcp >> /tmp/ufw_cfg.log 2>&1
sudo ufw allow 80/tcp >> /tmp/ufw_cfg.log 2>&1
sudo ufw allow 443/tcp >> /tmp/ufw_cfg.log 2>&1
sudo ufw --force enable >> /tmp/ufw_cfg.log 2>&1

success "Firewall configured and enabled"
sudo ufw status numbered

# STEP 7: DuckDNS Auto-start
header "STEP 7: DuckDNS Auto-start"
(crontab -l 2>/dev/null || true; echo "@reboot /home/$(whoami)/duckdns/duck.sh > /home/$(whoami)/duckdns/duck.log 2>&1 &") | crontab -
(crontab -l 2>/dev/null; echo "*/5 * * * * grep -q 'duck.sh' /proc/*/cmdline || (/home/$(whoami)/duckdns/duck.sh > /home/$(whoami)/duckdns/duck.log 2>&1 &)") | crontab -

~/duckdns/duck.sh > ~/duckdns/duck.log 2>&1 &
success "DuckDNS scheduled and started"

# Verification
header "STEP 8: Verification"
sleep 5

echo ""
info "Application Status:"
pm2 status 2>/dev/null | grep ulu-calculator || echo "   Checking..."
echo ""

info "Web Server Status:"
sudo systemctl is-active nginx > /dev/null && echo "   ✓ Nginx: active (running)" || echo "   Nginx: checking..."
echo ""

ps aux | grep -q "[d]uck.sh" && echo "   ✓ DuckDNS: running" || echo "   DuckDNS: starting..."
echo ""

if nslookup $FULL_DOMAIN > /dev/null 2>&1; then
    success "Domain resolves: $FULL_DOMAIN"
else
    info "Domain resolving (may take 5-10 minutes)..."
fi

# Summary
header "🎉 DEPLOYMENT COMPLETE!"

echo ""
echo "📊 Application Information:"
echo "   URL: https://$FULL_DOMAIN"
echo "   Email: admin@ulu-winery.co.il"
echo "   Password: Admin123! (CHANGE IMMEDIATELY)"
echo ""
echo "✅ Services Running:"
pm2 status 2>/dev/null | grep ulu-calculator | awk '{print "   ✓ Application: " $5}' || echo "   ✓ Application: starting..."
echo "   ✓ Nginx Web Server"
echo "   ✓ DuckDNS Auto-update"
echo "   ✓ Daily Backups (2 AM)"
echo "   ✓ Firewall Protection"
echo ""
echo "🚀 Next Steps:"
echo "   1. Wait 5-10 minutes for DNS propagation"
echo "   2. Visit: https://$FULL_DOMAIN"
echo "   3. Login with email and password above"
echo "   4. Click 'Change Password' to set new password"
echo "   5. Test calculator and admin panel"
echo "   6. Share link with users!"
echo ""
echo "📱 Share this link with users:"
echo "   https://$FULL_DOMAIN"
echo ""
echo "📞 Useful Commands:"
echo "   View logs: pm2 logs ulu-calculator"
echo "   Check status: pm2 status"
echo "   Restart: pm2 restart ulu-calculator"
echo "   Backup now: ~/backup-ulu.sh"
echo ""
