# 🚀 Complete Guide: Deploy Ulu Calculator on Raspberry Pi with Free Domain

**Estimated time: 45-60 minutes | Cost: $0**

This guide will help you deploy the Ulu Calculator on your Raspberry Pi and make it accessible to users worldwide using a free domain name.

---

## 📋 What You'll Get

✅ Ulu Calculator running on your Raspberry Pi
✅ Free domain name (e.g., `ulu-winery.freedns.rocks`)
✅ HTTPS encryption (free SSL certificate)
✅ Accessible from anywhere in the world
✅ Automated backups
✅ User authentication system
✅ Admin panel for configuration

---

## 🛠️ Prerequisites

### Hardware & Network
- Raspberry Pi 3B+ or newer (4GB RAM minimum recommended)
- 32GB+ microSD card (Class 10)
- Stable internet connection (your home WiFi or ethernet)
- Power supply (official Raspberry Pi adapter strongly recommended)

### What You Need to Have Ready
1. Your Raspberry Pi IP address (e.g., `192.168.1.100`)
2. Access to your router settings (to note your public IP address)
3. A web browser
4. About 1 hour of your time
5. Email address (for domain registration, optional)

### Software Already Installed on Your Pi
- Raspberry Pi OS (any recent version)
- SSH enabled (so you can remotely access it)

---

## 📚 Step 0: Prepare Your Raspberry Pi

### 0.1 Find Your Pi's IP Address

**On your Raspberry Pi or via SSH:**
```bash
hostname -I
```

Example output: `192.168.1.100`

Write down this IP address - you'll need it.

### 0.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 0.3 Install Required Tools

```bash
sudo apt install -y git curl wget nano htop
```

---

## 🔧 Step 1: Install Node.js (18+)

### Option A: Using NodeSource Repository (Recommended - Fast)

```bash
# Download setup script
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

### Option B: Using NVM (If Option A fails)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
exec bash

# Install Node 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify
node --version
```

---

## 📥 Step 2: Download and Setup the Application

### 2.1 Clone the Repository

```bash
# Create apps directory
mkdir -p ~/apps
cd ~/apps

# Clone the calculator
git clone https://github.com/morgween/Ulu-calculator.git
cd Ulu-calculator

# Or if you prefer to copy from your current machine:
# scp -r /path/to/Ulu-calculator pi@192.168.1.100:~/apps/
```

### 2.2 Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 245 packages in ~30 seconds
```

### 2.3 Create Environment File

```bash
cp .env.example .env
nano .env
```

**Edit the `.env` file with these values:**

```env
# ============= SERVER =============
PORT=3000
NODE_ENV=production

# ============= SECURITY =============
# Generate a secure random string:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-generated-random-string-here-minimum-32-characters

# ============= DATABASE =============
DB_PATH=./server/data/users.sqlite

# ============= ADMIN =============
ADMIN_EMAIL=your-email@example.com

# ============= EMAIL (Optional - for password resets) =============
# Skip this if you don't need password reset functionality
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM=noreply@ulu-winery.co.il
```

**To generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the `SESSION_SECRET` value.

### 2.4 Test the Application

```bash
npm start
```

**Expected output:**
```
✓ Database connection established
✓ Database models synchronized
✓ Server running on http://localhost:3000
```

**To stop the server:** Press `Ctrl+C`

---

## 🌐 Step 3: Get a Free Domain Name

You have **3 free options**. Choose one:

### Option 1: FreeDNS (Recommended - No Email Required)
**Website:** https://freedns.afraid.org/

**Steps:**
1. Go to https://freedns.afraid.org/
2. Click "Sign Up"
3. Fill in username and password
4. Verify email (if required)
5. Login and go to "Subdomains"
6. Click "Add a Subdomain"
7. Choose a subdomain name (e.g., `ulu-winery`)
8. Choose a domain from the list (e.g., `freedns.rocks`)
9. Set the target to your public IP (see below)
10. Click "Create!"

**Result:** `ulu-winery.freedns.rocks`

### Option 2: Dynu (Free Dynamic DNS)
**Website:** https://www.dynu.com/

1. Sign up for free account
2. Create a dynamic DNS name
3. Point it to your public IP address

### Option 3: NoIP (Free 30 Days)
**Website:** https://www.noip.com/

1. Sign up
2. Create hostname
3. Point to your IP

### Finding Your Public IP Address

**Easy way (from any computer):**
```bash
curl -s https://api.ipify.org
```

**Or go to:** https://whatismyip.com/

This is your **public IP address**. Use this when setting up your domain.

---

## 🔒 Step 4: Setup Nginx & SSL (HTTPS)

### 4.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 4.2 Install Certbot (for Free SSL Certificate)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 4.3 Create Nginx Configuration

```bash
# Create configuration file
sudo nano /etc/nginx/sites-available/ulu-calculator
```

**Paste this configuration** (replace `ulu-winery.freedns.rocks` with your domain):

```nginx
server {
    listen 80;
    server_name ulu-winery.freedns.rocks;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name ulu-winery.freedns.rocks;

    # SSL certificates will be added by certbot
    ssl_certificate /etc/letsencrypt/live/ulu-winery.freedns.rocks/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ulu-winery.freedns.rocks/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/ulu-calculator.access.log;
    error_log /var/log/nginx/ulu-calculator.error.log;

    # Proxy to Node.js application
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

### 4.4 Enable the Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ulu-calculator /etc/nginx/sites-enabled/

# Remove default configuration (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t
```

Expected: `nginx: configuration file test is successful`

### 4.5 Get Free SSL Certificate

```bash
# Replace with your domain name
sudo certbot certonly --nginx -d ulu-winery.freedns.rocks
```

**Follow the prompts:**
1. Enter your email address
2. Agree to terms (A)
3. Enter Y for sharing email

**Expected output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/ulu-winery.freedns.rocks/
```

### 4.6 Start Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx  # Start on boot

# Check status
sudo systemctl status nginx
```

---

## 🚀 Step 5: Setup PM2 (Process Manager)

PM2 keeps your application running even if it crashes, and starts it automatically on reboot.

### 5.1 Install PM2

```bash
sudo npm install -g pm2
```

### 5.2 Start Application with PM2

```bash
cd ~/apps/Ulu-calculator
pm2 start ecosystem.config.js --env production
```

### 5.3 Setup Auto-Start on Boot

```bash
pm2 startup
# Copy and run the command it suggests (starts with sudo env PATH=...)

pm2 save
```

### 5.4 Verify Application is Running

```bash
pm2 status
pm2 logs ulu-calculator  # View logs
```

---

## 💾 Step 6: Setup Automated Backups

### 6.1 Create Backup Script

```bash
# Create backup directory
mkdir -p ~/backups/ulu-calculator

# Create backup script
nano ~/backup-ulu.sh
```

**Paste this content:**

```bash
#!/bin/bash

BACKUP_DIR="$HOME/backups/ulu-calculator"
APP_DIR="$HOME/apps/Ulu-calculator"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" \
    "$APP_DIR/server/data" \
    "$APP_DIR/.env"

# Keep only last 30 backups
cd "$BACKUP_DIR"
ls -t backup_*.tar.gz | tail -n +31 | xargs -r rm

echo "✓ Backup created: backup_$DATE.tar.gz"
```

### 6.2 Make Script Executable

```bash
chmod +x ~/backup-ulu.sh

# Test it
~/backup-ulu.sh
```

### 6.3 Schedule Daily Backups

```bash
crontab -e
```

Add this line at the end:
```
0 2 * * * /home/pi/backup-ulu.sh
```

This runs the backup every day at 2 AM.

---

## 🔐 Step 7: Security Setup

### 7.1 Setup Firewall

```bash
# Install UFW
sudo apt install -y ufw

# Set defaults
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 7.2 Setup Fail2Ban (Block Brute-Force Attacks)

```bash
sudo apt install -y fail2ban

# Create config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Start service
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## ✅ Step 8: Verify Everything Works

### 8.1 Test from Your Computer

Open your web browser and go to:
```
https://ulu-winery.freedns.rocks
```

You should see the login page.

### 8.2 Default Login Credentials

```
Email: admin@ulu-winery.co.il
Password: Admin123!
```

**⚠️ IMPORTANT:** Change this password immediately!

### 8.3 Change Admin Password

1. Login with default credentials
2. Click "Change Password" in the top menu
3. Set a strong new password

---

## 📱 Step 9: Share with Users

Your application is now live! Send users this link:

```
https://ulu-winery.freedns.rocks
```

Users can:
- Calculate event pricing using the calculator
- Print/export quotes as PDF
- Access from any device (mobile, tablet, computer)

---

## 🛠️ Troubleshooting

### Domain Not Resolving

1. Check your public IP is correct:
   ```bash
   curl https://api.ipify.org
   ```

2. Update your domain's IP address in FreeDNS:
   - Go to FreeDNS Dashboard
   - Edit the domain
   - Set IP to your current public IP

3. Wait 10-30 minutes for DNS to update (sometimes longer)

### Application Not Running

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs ulu-calculator

# Restart
pm2 restart ulu-calculator
```

### SSL Certificate Issues

```bash
# Renew certificate (do this monthly or use auto-renewal)
sudo certbot renew

# Check certificate expiration
sudo certbot certificates
```

### Nginx Not Working

```bash
# Check syntax
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/ulu-calculator.error.log
```

### Can't Access from Outside Home Network

1. Check firewall is open for ports 80 and 443:
   ```bash
   sudo ufw status
   ```

2. Check your ISP doesn't block port 80/443 (unlikely)

3. Try accessing from mobile hotspot instead of home WiFi

---

## 📊 Maintenance Commands

### Daily Operations

```bash
# View application logs
pm2 logs ulu-calculator

# Check if application is running
pm2 status

# Restart application (graceful)
pm2 restart ulu-calculator

# Check disk space
df -h

# Check Pi temperature
vcgencmd measure_temp  # Raspberry Pi specific
```

### Weekly Tasks

```bash
# Check system updates
sudo apt update

# Check PM2 monitoring
pm2 monit
```

### Monthly Tasks

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Renew SSL certificate (or set to auto-renew)
sudo certbot renew

# Check backup size
du -sh ~/backups/ulu-calculator
```

### Restore from Backup

```bash
# Stop application
pm2 stop ulu-calculator

# Restore backup
cd ~/
tar -xzf backups/ulu-calculator/backup_YYYYMMDD_HHMMSS.tar.gz

# Start application
pm2 start ecosystem.config.js --env production
```

---

## 🔄 Updating the Application

When you want to update to the latest version:

```bash
cd ~/apps/Ulu-calculator

# Backup first!
~/backup-ulu.sh

# Pull latest code
git pull

# Install dependencies
npm install

# Restart application
pm2 restart ulu-calculator
```

---

## 💡 Tips & Best Practices

### Performance
- Raspberry Pi 3B+ can handle 50-100 concurrent users
- For more load, upgrade to Raspberry Pi 4 or add load balancer

### Reliability
- Keep backups on external drive or cloud storage
- Test restore procedure monthly
- Monitor disk space (backups can grow)

### Customization
- Config changes: http://your-domain.com/admin.html
- Requires login with admin credentials
- Changes are saved automatically

### Privacy
- All data stays on your Raspberry Pi
- No data sent to third parties
- Full control over user data

---

## 🎯 Next Steps

1. ✅ Deploy the application (you just did this!)
2. ✅ Test from multiple devices
3. ✅ Change admin password
4. ✅ Configure pricing in admin panel
5. ✅ Create user accounts for your team
6. ✅ Share domain link with customers
7. ✅ Monitor application logs
8. ✅ Keep backups updated

---

## 📞 Getting Help

If something doesn't work:

1. **Check logs:**
   ```bash
   pm2 logs ulu-calculator
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status
   ```

3. **Check domain:**
   ```bash
   nslookup ulu-winery.freedns.rocks
   ```

4. **Restart everything:**
   ```bash
   sudo systemctl restart nginx
   pm2 restart ulu-calculator
   ```

5. **Check repository:** https://github.com/morgween/Ulu-calculator

---

## ✨ Summary

You now have:
- ✅ Ulu Calculator running 24/7 on your Raspberry Pi
- ✅ Free domain name pointing to your server
- ✅ HTTPS encryption for security
- ✅ Automated daily backups
- ✅ Firewall protecting your system
- ✅ Admin panel for configuration
- ✅ User authentication
- ✅ Professional application for your customers

**Total cost: $0**
**Setup time: ~1 hour**
**Maintenance: ~5 minutes per week**

---

**Last updated:** November 2024
**Application:** Ulu Winery Calculator
**Support:** https://github.com/morgween/Ulu-calculator
