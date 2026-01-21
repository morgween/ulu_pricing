# 🚀 Raspberry Pi Quick Start Guide

Ultra-fast deployment guide for Raspberry Pi. For full details, see [RASPBERRY-PI-DEPLOYMENT.md](RASPBERRY-PI-DEPLOYMENT.md).

---

## ⚡ 10-Minute Deployment

### 1. Prepare Raspberry Pi (5 min)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y git curl wget nginx certbot python3-certbot-nginx ufw fail2ban

# Install Node.js 18
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install PM2
npm install -g pm2
```

### 2. Clone & Deploy (3 min)

```bash
# Clone from Windows machine or repository
cd ~
mkdir -p apps
cd apps

# Option A: Clone from Git
git clone <your-repo-url> ulu-calculator

# Option B: Copy from Windows
# On Windows: scp -r C:\Code\ulu-calculator\Ulu-win pi@192.168.1.x:~/apps/ulu-calculator

cd ulu-calculator

# Run automated deployment script
chmod +x deploy-raspi.sh
./deploy-raspi.sh
```

### 3. Configure SSL (2 min)

```bash
# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 4. Enable Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow 2222/tcp  # SSH (if using custom port)
sudo ufw enable
```

---

## 🔐 Quick Security Setup

```bash
# Disable root SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no

# Restart SSH
sudo systemctl restart ssh

# Enable fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Enable automatic updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📝 Essential Commands

### Application Management
```bash
pm2 status                    # Check status
pm2 logs ulu-calculator       # View logs
pm2 monit                     # Monitor resources
pm2 restart ulu-calculator    # Restart app
pm2 stop ulu-calculator       # Stop app
pm2 start ecosystem.config.js # Start app
```

### Backup
```bash
~/scripts/backup-ulu.sh       # Manual backup
ls -lh ~/backups/ulu-calculator/  # View backups
```

### Nginx
```bash
sudo nginx -t                 # Test config
sudo systemctl restart nginx  # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # View errors
```

### System
```bash
htop                          # Monitor resources
vcgencmd measure_temp         # Check temperature
df -h                         # Disk usage
free -h                       # Memory usage
```

---

## 🌐 Access Points

- **Local:** http://localhost:3000
- **Domain:** https://your-domain.com
- **Login:** admin@ulu-winery.co.il / Admin123!

---

## 🔧 Troubleshooting

### Application won't start
```bash
pm2 logs ulu-calculator --err
pm2 restart ulu-calculator
```

### Can't access from internet
```bash
sudo ufw status           # Check firewall
sudo systemctl status nginx  # Check Nginx
sudo nginx -t             # Test Nginx config
```

### SSL not working
```bash
sudo certbot certificates  # Check cert status
sudo certbot renew        # Renew cert
sudo nginx -t             # Test config
```

---

## 📞 Full Documentation

For complete setup with all security measures:
👉 [RASPBERRY-PI-DEPLOYMENT.md](RASPBERRY-PI-DEPLOYMENT.md)

---

Made with ❤️ and 🍷 by Ulu Winery
