# 🚀 Quick Reference Card - Ulu Calculator Deployment

**Print this page or save it on your phone for easy reference during deployment**

---

## 📍 Start Here

1. **Read:** `READY-TO-DEPLOY.md` (5 minutes)
2. **Follow:** `DEPLOYMENT-DUCKDNS.md` (1 hour)
3. **Verify:** `PRE-DEPLOYMENT-CHECKLIST.md` (10 minutes)
4. **Go Live:** Share domain with users

---

## 🔑 Key Commands

### Check Application Status
```bash
pm2 status
pm2 logs ulu-calculator
```

### Restart Application
```bash
pm2 restart ulu-calculator
```

### Check Domain
```bash
nslookup ulu-winery.duckdns.org
```

### Check Web Server
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Verify SSL Certificate
```bash
sudo certbot certificates
```

### View Backups
```bash
ls -lh ~/backups/ulu-calculator/
```

### Manual Backup
```bash
~/backup-ulu.sh
```

### Restart Everything
```bash
sudo systemctl restart nginx
pm2 restart ulu-calculator
```

---

## 📋 Installation Steps Overview

```
1. Prepare Pi (apt update, install tools)
2. Setup DuckDNS (5 min)
3. Install Node.js (10 min)
4. Clone application (5 min)
5. Configure .env (2 min)
6. Install dependencies (30 sec)
7. Setup Nginx (10 min)
8. Get SSL certificate (5 min)
9. Start PM2 (2 min)
10. Test domain (5 min)
11. Share with users
```

**Total: ~1.5 hours**

---

## 🔐 Important Information

### Default Admin Credentials
```
Email: admin@ulu-winery.co.il
Password: Admin123!
```

⚠️ **Change immediately after first login!**

### Generate Session Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output → paste in `.env` as `SESSION_SECRET`

---

## 🌐 DuckDNS Setup (5 minutes)

1. Go to: https://www.duckdns.org/
2. Sign in with GitHub/Google (or create account)
3. Add domain: e.g., `ulu-winery`
4. Click "install" for instructions
5. Create shell script:
   ```bash
   mkdir ~/duckdns
   # See DEPLOYMENT-DUCKDNS.md for script content
   ```

---

## 🔒 SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d ulu-winery.duckdns.org

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 🌐 Nginx Configuration

```bash
# Create config
sudo nano /etc/nginx/sites-available/ulu-calculator

# Enable it
sudo ln -s /etc/nginx/sites-available/ulu-calculator /etc/nginx/sites-enabled/

# Test
sudo nginx -t

# Start
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 🚀 Process Manager (PM2)

```bash
# Install
sudo npm install -g pm2

# Start app
cd ~/apps/Ulu-calculator
pm2 start ecosystem.config.js --env production

# Auto-start on boot
pm2 startup
# Copy and run the command it shows
pm2 save

# View status
pm2 status
pm2 logs ulu-calculator
pm2 restart ulu-calculator
```

---

## 💾 Automatic Backups

```bash
# Create script at ~/backup-ulu.sh
# See DEPLOYMENT-DUCKDNS.md for full script

# Make executable
chmod +x ~/backup-ulu.sh

# Test
~/backup-ulu.sh

# Schedule daily (crontab -e)
0 2 * * * /home/pi/backup-ulu.sh
```

---

## 🔥 Firewall (UFW)

```bash
# Install
sudo apt install -y ufw

# Configure
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable
sudo ufw enable

# Check
sudo ufw status numbered
```

---

## 🆘 Troubleshooting Quick Fixes

### Domain Not Resolving
```bash
# Update DuckDNS
curl "https://www.duckdns.org/update?domains=ulu-winery&token=YOUR-TOKEN&ip="

# Verify
nslookup ulu-winery.duckdns.org
```

### Application Not Running
```bash
pm2 logs ulu-calculator
pm2 restart ulu-calculator
```

### SSL Certificate Issues
```bash
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

### Can't Access from Outside
```bash
# Check firewall
sudo ufw status

# Check port forwarding in router
# Check DuckDNS script
ps aux | grep duck.sh
```

---

## 📱 User Access

**Share this link with users:**
```
https://ulu-winery.duckdns.org
```

**Features available:**
- Event pricing calculator
- PDF export
- No installation needed
- Works on all devices

---

## 📊 Weekly Maintenance

```bash
# Check logs
pm2 logs ulu-calculator

# Check all services
pm2 status
sudo systemctl status nginx

# Check disk space
df -h

# View backups
ls -lh ~/backups/ulu-calculator/
```

**Time needed:** 5-10 minutes

---

## 🔄 Monthly Tasks

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Check certificate expiration
sudo certbot certificates

# Verify SSL auto-renewal
sudo systemctl status certbot.timer
```

---

## 📝 File Locations

```
Application: ~/apps/Ulu-calculator/
Data:        ~/apps/Ulu-calculator/server/data/
Backups:     ~/backups/ulu-calculator/
DuckDNS:     ~/duckdns/duck.sh
Logs:        ~/apps/Ulu-calculator/logs/
SSL Certs:   /etc/letsencrypt/live/ulu-winery.duckdns.org/
```

---

## 🆘 Emergency Commands

### Restart Everything
```bash
sudo systemctl restart nginx
pm2 restart ulu-calculator
sudo systemctl restart fail2ban
```

### Check Everything is Working
```bash
# Web server
curl https://ulu-winery.duckdns.org

# Domain
nslookup ulu-winery.duckdns.org

# App
pm2 status

# System
df -h && free -h
```

### Restore from Backup
```bash
pm2 stop ulu-calculator
cd ~
tar -xzf backups/ulu-calculator/backup_YYYYMMDD_HHMMSS.tar.gz
pm2 start ecosystem.config.js --env production
```

---

## 🎯 Post-Deployment Checklist

- [ ] Domain resolves: `nslookup ulu-winery.duckdns.org`
- [ ] HTTPS works: `curl https://ulu-winery.duckdns.org`
- [ ] Login page displays
- [ ] Can login with admin/password
- [ ] Changed admin password
- [ ] Calculator works
- [ ] Admin panel accessible
- [ ] Backups running
- [ ] All services enabled on boot
- [ ] Firewall active
- [ ] SSL certificate valid
- [ ] DuckDNS script running

---

## 📞 Need Help?

**Check these files in order:**

1. `READY-TO-DEPLOY.md` → FAQ section
2. `DEPLOYMENT-DUCKDNS.md` → Troubleshooting section
3. `PRE-DEPLOYMENT-CHECKLIST.md` → Verification procedures
4. `CLAUDE.md` → Architecture details

---

## 🎉 Final Check

Before sharing with users, verify:

```bash
# All services running
pm2 status              # Should show: online
sudo systemctl status nginx  # Should show: active (running)

# Domain working
curl -I https://ulu-winery.duckdns.org  # Should show: 200

# Backups working
ls -lh ~/backups/ulu-calculator/  # Should show: backup files

# No errors
pm2 logs ulu-calculator          # Should show: no errors
sudo tail -f /var/log/nginx/ulu-calculator.error.log  # Should show: nothing
```

**All green? You're ready to go live! 🚀**

---

## 💡 Pro Tips

1. **Always backup before updating:** `~/backup-ulu.sh`
2. **Check logs when something is wrong:** `pm2 logs ulu-calculator`
3. **Keep domain token safe:** Write it down in secure location
4. **Monitor backups monthly:** `du -sh ~/backups/ulu-calculator/`
5. **Restart services if confused:** `sudo systemctl restart nginx && pm2 restart ulu-calculator`
6. **Check disk space weekly:** `df -h`
7. **Update system monthly:** `sudo apt update && sudo apt upgrade -y`

---

**Last Updated:** November 2024
**Application:** Ulu Winery Calculator
**Status:** Production Ready ✅
