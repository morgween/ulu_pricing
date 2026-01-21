# Ulu Winery Calculator - Deployment Guide

**Complete deployment guide for Raspberry Pi | FREE | 30-60 minutes**

---

## Quick Start

### Prerequisites
- Raspberry Pi 3B+ or newer (4GB+ RAM recommended)
- 32GB+ microSD card
- Internet connection
- SSH access enabled

### Choose Your Deployment Method

**Option A: Docker (Recommended)**
- Container isolation
- Easy updates
- Works alongside other containers
- Auto-restart

**Option B: PM2**
- Lighter resource usage
- Direct Node.js control
- Simpler for single app

---

## Option A: Docker Deployment (Recommended)

### 1. Transfer Files to Raspberry Pi

```bash
# From your computer:
scp -r * pi@<raspberry-pi-ip>:~/ulu-calculator/

# SSH into Pi:
ssh pi@<raspberry-pi-ip>
cd ~/ulu-calculator
```

### 2. Run Setup Script

```bash
chmod +x deployment/scripts/setup-docker-pi.sh
./deployment/scripts/setup-docker-pi.sh
```

The script will:
- Install Docker & Docker Compose
- Generate SSL certificates
- Create secure environment
- Build and start containers
- Setup automated backups

### 3. Access Application

**Local network:**
```
https://192.168.1.xxx  # Your Pi's IP
```

**Default login:**
- Email: `admin@ulu-winery.co.il`
- Password: `Admin123!`
- Change immediately after first login!

### 4. Docker Management

```bash
# Check status
docker-compose -f deployment/docker/docker-compose.production.yml ps

# View logs
docker logs ulu-calculator -f

# Restart
docker-compose -f deployment/docker/docker-compose.production.yml restart

# Stop
docker-compose -f deployment/docker/docker-compose.production.yml down

# Start
docker-compose -f deployment/docker/docker-compose.production.yml up -d
```

---

## Option B: PM2 Deployment

### 1. Install Node.js

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v18.x.x+
```

### 2. Setup Application

```bash
cd ~/ulu-calculator
npm install

# Create environment file
cp .env.example .env
nano .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### 3. Install & Configure PM2

```bash
sudo npm install -g pm2

# Start application
pm2 start deployment/docker/ecosystem.config.js --env production

# Enable auto-start on boot
pm2 startup
pm2 save
```

### 4. Setup Nginx & SSL

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy nginx config
sudo cp deployment/nginx/conf.d/ulu-calculator.conf /etc/nginx/sites-available/ulu-calculator
sudo ln -s /etc/nginx/sites-available/ulu-calculator /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and start
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. PM2 Management

```bash
# Check status
pm2 status

# View logs
pm2 logs ulu-calculator

# Restart
pm2 restart ulu-calculator

# Stop
pm2 stop ulu-calculator
```

---

## Network Access Options

### Local Network (Default - FREE)
**Already configured**
```
Access: https://192.168.1.xxx
Cost: FREE
Setup: None needed
```

### Tailscale VPN (Remote Team - FREE)
**Best for remote team access**

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Access from anywhere: https://<tailscale-ip>
```

Benefits:
- FREE (up to 100 devices)
- Encrypted VPN
- No port forwarding
- Access from anywhere

### Cloudflare Tunnel (Public Website - ~$12/year)
**Best for customer access**

```bash
./deployment/scripts/setup-cloudflare-tunnel.sh
# Access: https://your-domain.com
```

Benefits:
- Professional domain
- Free SSL certificate
- DDoS protection
- No port forwarding

### DuckDNS (Public Website - FREE)
**Free alternative to Cloudflare**

```bash
# Create account at https://www.duckdns.org/
# Get token and domain

mkdir ~/duckdns
cat > ~/duckdns/duck.sh << 'EOF'
#!/bin/bash
TOKEN="your-token"
DOMAIN="your-domain"
while true; do
  curl "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip="
  sleep 600
done
EOF

chmod +x ~/duckdns/duck.sh

# Add to crontab
crontab -e
# Add: @reboot /home/pi/duckdns/duck.sh > /home/pi/duckdns/duck.log 2>&1 &

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.duckdns.org
```

---

## Security Setup

### Firewall

```bash
sudo apt install -y ufw

sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

sudo ufw status
```

### Fail2Ban (Optional)

```bash
sudo apt install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## Automated Backups

### Docker Deployment

Backups are automatically configured at 2 AM daily.

```bash
# Check backups
ls -lh ~/backups/ulu-calculator/

# Manual backup
./backup-docker-ulu.sh
```

### PM2 Deployment

```bash
# Create backup script
mkdir -p ~/backups/ulu-calculator

cat > ~/backup-ulu.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/backups/ulu-calculator"
APP_DIR="$HOME/ulu-calculator"
DATE=$(date +%Y%m%d_%H%M%S)

tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" \
    "$APP_DIR/server/data" \
    "$APP_DIR/.env"

# Keep last 30 backups
cd "$BACKUP_DIR"
ls -t backup_*.tar.gz | tail -n +31 | xargs -r rm
EOF

chmod +x ~/backup-ulu.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/pi/backup-ulu.sh
```

---

## Pre-Deployment Checklist

Before going live, verify:

- [ ] Application starts without errors
- [ ] Database initializes correctly
- [ ] API health endpoint works: `curl http://localhost:3000/api/health`
- [ ] Login works with default credentials
- [ ] NODE_ENV set to production
- [ ] SESSION_SECRET is securely generated (not default)
- [ ] Firewall is configured
- [ ] Backups are scheduled
- [ ] HTTPS is working
- [ ] Can access from other devices on network

---

## Troubleshooting

### Container/App Won't Start

**Docker:**
```bash
docker logs ulu-calculator
docker-compose -f deployment/docker/docker-compose.production.yml up -d --build --force-recreate
```

**PM2:**
```bash
pm2 logs ulu-calculator
pm2 restart ulu-calculator
```

### Can't Access from Network

```bash
# Check containers/app running
docker ps  # or: pm2 status

# Test locally
curl -k https://localhost/api/health

# Check firewall
sudo ufw status

# Find Pi IP
hostname -I
```

### SSL Certificate Issues

**Self-signed (local network):**
```bash
# Regenerate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deployment/nginx/ssl/key.pem \
  -out deployment/nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Restart nginx
sudo systemctl restart nginx
```

**Let's Encrypt (DuckDNS):**
```bash
# Check status
sudo certbot certificates

# Renew
sudo certbot renew --force-renewal
```

### Database Locked

```bash
# Docker
docker-compose -f deployment/docker/docker-compose.production.yml down
sleep 5
docker-compose -f deployment/docker/docker-compose.production.yml up -d

# PM2
pm2 stop ulu-calculator
sleep 5
pm2 start ulu-calculator
```

---

## Updates

```bash
# Backup first
./backup-ulu.sh  # or ./backup-docker-ulu.sh

# Update code
cd ~/ulu-calculator
git pull
npm install

# Restart
docker-compose -f deployment/docker/docker-compose.production.yml up -d --build
# or: pm2 restart ulu-calculator
```

---

## Cost Summary

| Component | Cost |
|-----------|------|
| Docker/PM2 Setup | FREE |
| SSL (self-signed) | FREE |
| Local Network | FREE |
| Tailscale VPN | FREE |
| DuckDNS | FREE |
| Cloudflare Tunnel | ~$12/year (domain) |

**Total: $0 for local deployment**

---

## Quick Reference

### Health Checks

```bash
# Docker
docker ps
docker logs ulu-calculator --tail 50
curl -k https://localhost/api/health

# PM2
pm2 status
pm2 logs ulu-calculator
curl http://localhost:3000/api/health
```

### Restart Everything

```bash
# Docker
docker-compose -f deployment/docker/docker-compose.production.yml restart

# PM2
pm2 restart ulu-calculator
sudo systemctl restart nginx
```

### View Logs

```bash
# Docker
docker logs ulu-calculator -f
docker logs ulu-nginx -f

# PM2
pm2 logs ulu-calculator
sudo tail -f /var/log/nginx/ulu-calculator.error.log
```

---

## Support

For issues or questions:
- Check troubleshooting section above
- Review logs for error messages
- Ensure all services are running
- Verify firewall and network settings

---

Made with care for Ulu Winery
