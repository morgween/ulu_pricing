# 🔒 Secure Raspberry Pi Deployment Guide

Complete guide for deploying the Ulu Winery Calculator on Raspberry Pi with enterprise-level security.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Raspberry Pi Setup](#initial-raspberry-pi-setup)
3. [Security Hardening](#security-hardening)
4. [Application Deployment](#application-deployment)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [Firewall Configuration](#firewall-configuration)
7. [Automated Backups](#automated-backups)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Hardware Requirements
- Raspberry Pi 3B+ or newer (4GB RAM recommended)
- 32GB+ microSD card (Class 10 or better)
- Stable power supply (official Raspberry Pi adapter recommended)
- Ethernet connection (recommended for server) or WiFi

### Software Requirements
- Raspberry Pi OS Lite (64-bit recommended)
- Internet connection
- Domain name (optional but recommended for SSL)

### Before You Start
- [ ] Fresh Raspberry Pi OS installation
- [ ] SSH enabled
- [ ] Static IP configured (or DHCP reservation)
- [ ] Domain pointed to your public IP (if using domain)

---

## 🔧 Initial Raspberry Pi Setup

### 1. Update System

```bash
# SSH into your Raspberry Pi
ssh pi@192.168.1.x

# Update package lists and upgrade
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget nano htop ufw fail2ban
```

### 2. Create Dedicated User

**Never run the app as root or pi user!**

```bash
# Create dedicated user for the application
sudo adduser ulu-app --disabled-password --gecos ""

# Add to necessary groups
sudo usermod -aG sudo ulu-app

# Set strong password
sudo passwd ulu-app
```

### 3. Configure SSH Security

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

**Add/modify these settings:**
```bash
# Disable root login
PermitRootLogin no

# Disable password authentication (use SSH keys only)
PasswordAuthentication no
PubkeyAuthentication yes

# Change default port (optional but recommended)
Port 2222

# Limit users who can SSH
AllowUsers ulu-app

# Disable empty passwords
PermitEmptyPasswords no

# Enable strict mode
StrictModes yes

# Set login grace time
LoginGraceTime 30

# Max authentication attempts
MaxAuthTries 3
```

**Restart SSH:**
```bash
sudo systemctl restart ssh
```

### 4. Set Up SSH Keys

**On your local machine:**
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "ulu-deployment"

# Copy public key to Raspberry Pi
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 2222 ulu-app@192.168.1.x
```

**Test SSH key login:**
```bash
ssh -p 2222 ulu-app@192.168.1.x
```

---

## 🔒 Security Hardening

### 1. Configure Firewall (UFW)

```bash
# Default deny all incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (use your custom port)
sudo ufw allow 2222/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 2. Install & Configure Fail2Ban

```bash
# Install fail2ban
sudo apt install fail2ban -y

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local
```

**Configure fail2ban:**
```ini
[DEFAULT]
# Ban for 1 hour
bantime = 3600

# After 5 failed attempts
maxretry = 5

# Within 10 minutes
findtime = 600

# Email alerts (optional)
destemail = admin@ulu-winery.co.il
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

**Start fail2ban:**
```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status
```

### 3. Automatic Security Updates

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades apt-listchanges -y

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades

# Enable automatic updates
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

**Add:**
```
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
Unattended-Upgrade::Mail "admin@ulu-winery.co.il";
```

---

## 📦 Application Deployment

### 1. Install Node.js (Latest LTS)

```bash
# Switch to app user
su - ulu-app

# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 18 LTS
nvm install 18
nvm use 18
nvm alias default 18

# Verify
node --version
npm --version
```

### 2. Clone Repository

```bash
# Create application directory
mkdir -p ~/apps
cd ~/apps

# Clone repository
git clone <your-repo-url> ulu-calculator
cd ulu-calculator

# Or transfer files from your Windows machine
# From Windows (in project directory):
# scp -P 2222 -r . ulu-app@192.168.1.x:~/apps/ulu-calculator/
```

### 3. Configure Environment

```bash
# Create production environment file
nano .env
```

**Production .env:**
```bash
# Server
NODE_ENV=production
PORT=3000

# Security - Generate strong secret!
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">

# Database
DB_PATH=./server/data/users.sqlite

# Admin
ADMIN_EMAIL=admin@ulu-winery.co.il

# Optional: Email for password reset
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@ulu-winery.co.il

# Logging
LOG_LEVEL=info
```

**Generate strong session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Install Dependencies & Test

```bash
# Install production dependencies
npm ci --production

# Test the application
npm start
```

**Open another terminal and test:**
```bash
curl http://localhost:3000/api/health
```

**Stop test server:** Press Ctrl+C

### 5. Install & Configure PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Copy and run the command PM2 shows
```

**Configure PM2 to start on boot:**
```bash
# Enable PM2 startup
sudo env PATH=$PATH:/home/ulu-app/.nvm/versions/node/v18.x.x/bin pm2 startup systemd -u ulu-app --hp /home/ulu-app
```

**PM2 Commands:**
```bash
# Status
pm2 status

# Logs
pm2 logs ulu-calculator

# Monitor
pm2 monit

# Restart
pm2 restart ulu-calculator

# Stop
pm2 stop ulu-calculator
```

---

## 🔐 SSL/HTTPS Setup

### Option 1: Let's Encrypt (Free SSL) - Recommended

**Prerequisites:**
- Domain name pointing to your Raspberry Pi's public IP
- Port 80 and 443 forwarded to Raspberry Pi

### 1. Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

### 2. Configure Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/ulu-calculator
```

**Nginx configuration:**
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other requests to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS (will add after SSL certificate)
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/ulu-calculator /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Install Certbot & Get SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect option (2)
```

### 4. Complete Nginx HTTPS Configuration

**Certbot will auto-configure, but here's the full config:**
```bash
sudo nano /etc/nginx/sites-available/ulu-calculator
```

```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Client max body size (for file uploads)
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/ulu-calculator-access.log;
    error_log /var/log/nginx/ulu-calculator-error.log;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Don't cache
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Rate limiting for API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Rate limit zone (add to http block in /etc/nginx/nginx.conf)
# limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

**Add rate limiting to nginx.conf:**
```bash
sudo nano /etc/nginx/nginx.conf
```

**Add inside `http` block:**
```nginx
http {
    # ... existing config ...

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_status 429;
}
```

**Test and restart:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Auto-Renew SSL Certificate

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is already set up via systemd timer
sudo systemctl list-timers | grep certbot
```

---

## 🔥 Firewall Configuration

### Advanced UFW Rules

```bash
# Allow Nginx Full (HTTP + HTTPS)
sudo ufw allow 'Nginx Full'

# Delete individual HTTP/HTTPS rules if you added them
sudo ufw status numbered
sudo ufw delete [rule-number]

# Allow from specific IP only (optional - for admin access)
sudo ufw allow from 192.168.1.100 to any port 2222 proto tcp

# Enable logging
sudo ufw logging on

# Check status
sudo ufw status verbose
```

### Port Forwarding on Router

**Configure on your router:**
1. Forward port 80 → Raspberry Pi IP:80
2. Forward port 443 → Raspberry Pi IP:443
3. Forward port 2222 → Raspberry Pi IP:2222 (optional, for external SSH)

---

## 💾 Automated Backups

### 1. Create Backup Script

```bash
# Create scripts directory
mkdir -p ~/scripts
nano ~/scripts/backup-ulu.sh
```

**Backup script:**
```bash
#!/bin/bash

# Configuration
APP_DIR="/home/ulu-app/apps/ulu-calculator"
BACKUP_DIR="/home/ulu-app/backups/ulu-calculator"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database..."
cp "$APP_DIR/server/data/users.sqlite" "$BACKUP_DIR/users_$DATE.sqlite"

# Backup configuration
echo "Backing up configuration..."
cp "$APP_DIR/server/data/config.json" "$BACKUP_DIR/config_$DATE.json"
cp "$APP_DIR/server/data/quotas.json" "$BACKUP_DIR/quotas_$DATE.json"

# Backup .env
cp "$APP_DIR/.env" "$BACKUP_DIR/env_$DATE.txt"

# Create tarball of entire app (optional)
echo "Creating full backup archive..."
tar -czf "$BACKUP_DIR/full-backup_$DATE.tar.gz" \
    -C "$(dirname $APP_DIR)" \
    --exclude='node_modules' \
    --exclude='.git' \
    "$(basename $APP_DIR)"

# Delete old backups
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*.sqlite" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.txt" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Count backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR" | wc -l)
echo "Backup completed: $DATE"
echo "Total backups: $BACKUP_COUNT files"

# Optional: Upload to cloud storage (e.g., rclone)
# rclone copy "$BACKUP_DIR" remote:ulu-calculator-backups/

exit 0
```

**Make executable:**
```bash
chmod +x ~/scripts/backup-ulu.sh

# Test backup
~/scripts/backup-ulu.sh
```

### 2. Schedule Automatic Backups

```bash
# Edit crontab
crontab -e
```

**Add backup schedule:**
```bash
# Backup daily at 2 AM
0 2 * * * /home/ulu-app/scripts/backup-ulu.sh >> /home/ulu-app/logs/backup.log 2>&1

# Backup database every 6 hours
0 */6 * * * cp /home/ulu-app/apps/ulu-calculator/server/data/users.sqlite /home/ulu-app/backups/ulu-calculator/users_$(date +\%Y\%m\%d_\%H\%M).sqlite

# Clean old logs weekly
0 3 * * 0 find /home/ulu-app/logs -name "*.log" -mtime +7 -delete
```

### 3. Cloud Backup (Optional)

**Install rclone:**
```bash
curl https://rclone.org/install.sh | sudo bash

# Configure rclone (Google Drive, Dropbox, etc.)
rclone config
```

**Add to backup script:**
```bash
# At end of backup script
rclone copy "$BACKUP_DIR" gdrive:ulu-calculator-backups/ --max-age 7d
```

---

## 📊 Monitoring & Maintenance

### 1. System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Check system resources
htop

# Check disk usage
df -h

# Check memory
free -h

# Check temperature (Raspberry Pi specific)
vcgencmd measure_temp
```

### 2. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check logs
pm2 logs ulu-calculator --lines 100

# Application health check
curl https://your-domain.com/api/health
```

### 3. Log Rotation

```bash
# PM2 log rotation
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 4. Monitoring Script

```bash
nano ~/scripts/health-check.sh
```

```bash
#!/bin/bash

# Health check script
ENDPOINT="https://your-domain.com/api/health"
LOG_FILE="/home/ulu-app/logs/health-check.log"

# Check if application is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ $HTTP_CODE -eq 200 ]; then
    echo "$(date): OK - Application is healthy" >> $LOG_FILE
else
    echo "$(date): ERROR - Application returned HTTP $HTTP_CODE" >> $LOG_FILE

    # Restart application
    pm2 restart ulu-calculator

    # Send alert (optional)
    echo "Application restarted at $(date)" | mail -s "Ulu Calculator Alert" admin@ulu-winery.co.il
fi
```

**Schedule health checks:**
```bash
crontab -e

# Check every 5 minutes
*/5 * * * * /home/ulu-app/scripts/health-check.sh
```

---

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs ulu-calculator --err

# Check Node.js version
node --version

# Check permissions
ls -la ~/apps/ulu-calculator/server/data/

# Restart application
pm2 restart ulu-calculator
```

### Can't Access from Internet

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx config
sudo nginx -t

# Check firewall
sudo ufw status verbose

# Check port forwarding on router
# Verify: https://www.yougetsignal.com/tools/open-ports/

# Check if application is listening
sudo netstat -tulpn | grep :3000
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
```

### High CPU/Memory Usage

```bash
# Check resources
htop

# Check PM2
pm2 monit

# Restart application
pm2 restart ulu-calculator

# Check for memory leaks
pm2 logs ulu-calculator --lines 1000 | grep -i "memory\|heap"
```

### Database Corruption

```bash
# Stop application
pm2 stop ulu-calculator

# Restore from backup
cp ~/backups/ulu-calculator/users_YYYYMMDD_HHMMSS.sqlite ~/apps/ulu-calculator/server/data/users.sqlite

# Start application
pm2 start ulu-calculator
```

---

## 🎯 Post-Deployment Checklist

- [ ] Application accessible via HTTPS
- [ ] SSL certificate valid
- [ ] Firewall configured and enabled
- [ ] Fail2ban active
- [ ] PM2 auto-starts on boot
- [ ] Automatic backups scheduled
- [ ] Health monitoring configured
- [ ] Default admin password changed
- [ ] SSH keys configured (password auth disabled)
- [ ] System updates automated
- [ ] Logs rotating properly
- [ ] Domain DNS configured
- [ ] Port forwarding set up

---

## 📞 Support & Resources

- **Application Logs:** `pm2 logs ulu-calculator`
- **Nginx Logs:** `/var/log/nginx/`
- **System Logs:** `sudo journalctl -xe`
- **Backup Location:** `~/backups/ulu-calculator/`

---

## 🎉 You're Deployed!

Your Ulu Calculator is now running securely on Raspberry Pi with:

✅ HTTPS/SSL encryption
✅ Firewall protection
✅ Automated backups
✅ Process monitoring
✅ Auto-restart on failure
✅ Security hardening
✅ Automatic updates

**Access:** https://your-domain.com

**Monitor:** `pm2 monit`

---

Made with ❤️ and 🍷 by Ulu Winery
