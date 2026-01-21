# 🚀 Complete Guide: Deploy Ulu Calculator on Raspberry Pi with DuckDNS

**Estimated time: 45-60 minutes | Cost: $0**

This guide will help you deploy the Ulu Calculator on your Raspberry Pi and make it accessible to users worldwide using DuckDNS (free dynamic DNS service).

---

## 📋 What You'll Get

✅ Ulu Calculator running on your Raspberry Pi
✅ Free DuckDNS domain (e.g., `your-name.duckdns.org`)
✅ HTTPS encryption (free SSL certificate from Let's Encrypt)
✅ Accessible from anywhere in the world
✅ Automatic IP update when your ISP changes your IP
✅ User authentication system
✅ Admin panel for configuration

---

## 🛠️ Prerequisites

### Hardware & Network
- Raspberry Pi 3B+ or newer (4GB RAM minimum recommended)
- 32GB+ microSD card (Class 10)
- Stable internet connection (WiFi or ethernet)
- Power supply (official Raspberry Pi adapter recommended)
- **Important:** You need access to your home router or know your public IP

### What You Need to Have Ready
1. Your Raspberry Pi IP address on local network (e.g., `192.168.1.100`)
2. Your public IP address (find at https://whatismyip.com/)
3. A web browser
4. About 1 hour of your time

### Software Already Installed on Your Pi
- Raspberry Pi OS (any recent version)
- SSH enabled

---

## 📚 Step 0: Prepare Your Raspberry Pi

### 0.1 Find Your Local Pi IP Address

```bash
hostname -I
```

Example: `192.168.1.100` (write this down)

### 0.2 Find Your Public IP Address

```bash
curl -s https://api.ipify.org
```

Or visit: https://whatismyip.com/

Example: `203.0.113.42` (this is what the outside world sees)

### 0.3 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 0.4 Install Required Tools

```bash
sudo apt install -y git curl wget nano htop
```

---

## 🌐 Step 1: Setup DuckDNS

DuckDNS is a free dynamic DNS service. It will keep your domain pointing to your IP address even when it changes.

### 1.1 Create DuckDNS Account

1. Go to: https://www.duckdns.org/
2. Click "Sign In" (or use GitHub/Google login - free)
3. Create an account if needed
4. **SAVE YOUR TOKEN** - you'll need it!

### 1.2 Add Your Domain

1. On DuckDNS dashboard, type your desired subdomain (e.g., `ulu-winery`)
2. Click "add domain"
3. You'll get a domain: `ulu-winery.duckdns.org`
4. Click "install" to see installation options

### 1.3 Configure DuckDNS on Raspberry Pi

**OPTION A: Using Duck DNS Script (Easiest)**

```bash
# Create duckdns directory
mkdir -p ~/duckdns
cd ~/duckdns

# Create the update script
cat > duck.sh << 'EOF'
#!/bin/bash
TOKEN="your-duckdns-token-here"
DOMAIN="your-domain-here"

while true
do
  curl "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip="
  echo " Update sent at $(date)"
  sleep 600  # Update every 10 minutes
done
EOF

# Make executable
chmod +x duck.sh
```

**Replace:**
- `your-duckdns-token-here` with your DuckDNS token
- `your-domain-here` with your subdomain (just the name, not the full `.duckdns.org`)

### 1.4 Test DuckDNS Update

```bash
cd ~/duckdns
./duck.sh
```

**Expected output:**
```
OK Update sent at Wed Nov 18 12:34:56 UTC 2024
```

Press `Ctrl+C` to stop.

### 1.5 Setup DuckDNS to Run at Startup

```bash
# Edit crontab
crontab -e
```

Add these lines at the end:
```cron
@reboot /home/pi/duckdns/duck.sh > /home/pi/duckdns/duck.log 2>&1 &
*/5 * * * * grep -q "duck.sh" /proc/*/cmdline || (/home/pi/duckdns/duck.sh > /home/pi/duckdns/duck.log 2>&1 &)
```

This ensures:
- DuckDNS script starts on boot
- Script restarts if it crashes

Test it:
```bash
# Verify cron was added
crontab -l
```

---

## 🔧 Step 2: Install Node.js (18+)

### Option A: Using NodeSource Repository (Recommended)

```bash
# Download setup script
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify
node --version  # Should show v18.x.x
npm --version
```

### Option B: Using NVM (Alternative)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

exec bash

nvm install 18
nvm use 18
nvm alias default 18

node --version
```

---

## 📥 Step 3: Download and Setup the Application

### 3.1 Clone Repository

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/morgween/Ulu-calculator.git
cd Ulu-calculator
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Create Environment File

```bash
cp .env.example .env
nano .env
```

**Edit with these values:**

```env
PORT=3000
NODE_ENV=production

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-generated-random-string-here

DB_PATH=./server/data/users.sqlite
ADMIN_EMAIL=your-email@example.com
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output and paste in `.env`.

### 3.4 Test Application

```bash
npm start
```

**Expected output:**
```
✓ Database connection established
✓ Server running on http://localhost:3000
```

Press `Ctrl+C` to stop.

---

## 🔒 Step 4: Setup Nginx & HTTPS

### 4.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 4.2 Install Certbot (for Free SSL from Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 4.3 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/ulu-calculator
```

**Paste this** (replace `ulu-winery` with your DuckDNS domain):

```nginx
server {
    listen 80;
    server_name ulu-winery.duckdns.org;

    # Let certbot verify domain
    location ~ /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ulu-winery.duckdns.org;

    # SSL certificates (certbot will create these)
    ssl_certificate /etc/letsencrypt/live/ulu-winery.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ulu-winery.duckdns.org/privkey.pem;

    # Security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Logs
    access_log /var/log/nginx/ulu-calculator.access.log;
    error_log /var/log/nginx/ulu-calculator.error.log;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.4 Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ulu-calculator /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
```

Expected: `nginx: configuration file test is successful`

### 4.5 Get SSL Certificate from Let's Encrypt

**IMPORTANT:** Before running this, make sure:
1. DuckDNS is working (test at https://www.duckdns.org/)
2. Your domain resolves (takes 1-5 minutes after DuckDNS setup)
3. Port 80 is open in your router

```bash
# Wait if DuckDNS is new (5-10 minutes)
# Then test:
nslookup ulu-winery.duckdns.org

# Get certificate
sudo certbot certonly --standalone -d ulu-winery.duckdns.org
```

**Follow prompts:**
1. Enter email address
2. Agree to terms (A)
3. Yes to sharing email

**Expected output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/ulu-winery.duckdns.org/
```

### 4.6 Start Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx  # Enable on boot

# Check status
sudo systemctl status nginx
```

### 4.7 Auto-Renew SSL Certificate

```bash
# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check renewal schedule
sudo systemctl status certbot.timer
```

---

## 🚀 Step 5: Setup PM2 (Process Manager)

### 5.1 Install PM2

```bash
sudo npm install -g pm2
```

### 5.2 Start Application

```bash
cd ~/apps/Ulu-calculator
pm2 start ecosystem.config.js --env production
```

### 5.3 Enable Auto-Start on Boot

```bash
pm2 startup
# Copy and run the command it suggests (starts with: sudo env PATH=...)

pm2 save
```

### 5.4 Verify Running

```bash
pm2 status
pm2 logs ulu-calculator
```

---

## 💾 Step 6: Setup Automated Backups

### 6.1 Create Backup Script

```bash
mkdir -p ~/backups/ulu-calculator

cat > ~/backup-ulu.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="$HOME/backups/ulu-calculator"
APP_DIR="$HOME/apps/Ulu-calculator"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Create backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" \
    "$APP_DIR/server/data" \
    "$APP_DIR/.env"

# Keep only last 30 backups
cd "$BACKUP_DIR"
ls -t backup_*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm

echo "✓ Backup created: backup_$DATE.tar.gz"
EOF

chmod +x ~/backup-ulu.sh

# Test
~/backup-ulu.sh
```

### 6.2 Schedule Daily Backups

```bash
crontab -e
```

Add:
```cron
0 2 * * * /home/pi/backup-ulu.sh
```

---

## 🔐 Step 7: Security Setup

### 7.1 Setup Firewall

```bash
sudo apt install -y ufw

# Set defaults
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS (important for DuckDNS and Let's Encrypt)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable
sudo ufw enable

# Check
sudo ufw status
```

### 7.2 Setup Fail2Ban (Block Brute-Force)

```bash
sudo apt install -y fail2ban

sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## ✅ Step 8: Test Everything

### 8.1 Check DuckDNS is Active

```bash
nslookup ulu-winery.duckdns.org
```

Should show your public IP.

### 8.2 Test from Browser

Open: `https://ulu-winery.duckdns.org`

You should see the login page.

### 8.3 Default Credentials

```
Email: admin@ulu-winery.co.il
Password: Admin123!
```

**⚠️ Change this immediately!**

1. Click "Change Password"
2. Set a strong new password

---

## 📱 Step 9: Share with Users

Send users this link:

```
https://ulu-winery.duckdns.org
```

They can access from anywhere using any device.

---

## 🔄 Port Forwarding (If Behind Router)

If your Raspberry Pi is not directly on the internet:

### 9.1 Find Your Pi's Local IP

```bash
hostname -I
# Example: 192.168.1.100
```

### 9.2 Port Forward in Your Router

1. Login to your router (usually 192.168.1.1)
2. Find Port Forwarding section
3. Forward:
   - **External Port 80** → **Internal IP 192.168.1.100:80**
   - **External Port 443** → **Internal IP 192.168.1.100:443**
4. Save and reboot router

### 9.3 Test Port Forwarding

```bash
curl https://ulu-winery.duckdns.org
```

Should work from outside your network.

---

## 🛠️ Troubleshooting

### Domain Not Working

```bash
# Check DuckDNS is updated
curl "https://www.duckdns.org/update?domains=ulu-winery&token=YOUR-TOKEN&ip="

# Check DNS resolution
nslookup ulu-winery.duckdns.org

# Check firewall
sudo ufw status
```

### SSL Certificate Issues

```bash
# Check cert status
sudo certbot certificates

# Manual renewal
sudo certbot renew --force-renewal

# Check Nginx config
sudo nginx -t
```

### Application Not Running

```bash
# Check status
pm2 status

# View logs
pm2 logs ulu-calculator

# Restart
pm2 restart ulu-calculator
```

### Can't Access from Outside Home

1. Check firewall: `sudo ufw status`
2. Check port forwarding in router
3. Test port: `curl -I https://ulu-winery.duckdns.org`
4. Check DuckDNS script is running: `ps aux | grep duck.sh`

---

## 📊 Daily Maintenance

### Check Application

```bash
# View logs
pm2 logs ulu-calculator

# Check status
pm2 status

# Restart if needed
pm2 restart ulu-calculator
```

### Check DuckDNS

```bash
# Verify script is running
ps aux | grep duck.sh

# View DuckDNS log
tail -f ~/duckdns/duck.log
```

### Verify HTTPS

```bash
# Check certificate expiration
sudo certbot certificates

# Test SSL
curl -v https://ulu-winery.duckdns.org 2>&1 | grep "SSL connection"
```

---

## 🔄 Update Application

```bash
# Backup first
~/backup-ulu.sh

# Update code
cd ~/apps/Ulu-calculator
git pull

# Install dependencies
npm install

# Restart
pm2 restart ulu-calculator
```

---

## 📞 Useful Commands Reference

```bash
# Check if DuckDNS script is running
ps aux | grep duck.sh

# View DuckDNS log
tail ~/duckdns/duck.log

# Check Nginx status
sudo systemctl status nginx

# View Nginx errors
sudo tail -f /var/log/nginx/ulu-calculator.error.log

# Check PM2
pm2 status
pm2 logs ulu-calculator

# Test domain resolution
nslookup ulu-winery.duckdns.org

# Check open ports
sudo netstat -tlnp

# Restart all services
sudo systemctl restart nginx
pm2 restart ulu-calculator

# Backup now
~/backup-ulu.sh

# View backup
ls -lh ~/backups/ulu-calculator/
```

---

## ✨ Summary

**What you just set up:**

✅ Ulu Calculator running 24/7 on Raspberry Pi
✅ Free DuckDNS domain with automatic IP updates
✅ HTTPS encryption with auto-renewing certificates
✅ Automatic daily backups
✅ Firewall protection
✅ Process management with auto-restart
✅ User authentication
✅ Admin configuration panel

**Total cost:** $0
**Setup time:** ~1 hour
**Maintenance:** ~5 minutes per week

---

## 🎯 Next Steps

1. ✅ Test accessing from outside your home network
2. ✅ Change admin password
3. ✅ Configure pricing in admin panel
4. ✅ Test backup/restore process
5. ✅ Share domain with first users
6. ✅ Monitor logs regularly
7. ✅ Create user accounts for your team

---

**Last updated:** November 2024
**Application:** Ulu Winery Calculator
**Support:** https://github.com/morgween/Ulu-calculator
