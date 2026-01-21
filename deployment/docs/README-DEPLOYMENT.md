# 🚀 Deployment Guide

Quick reference for deploying Ulu Calculator to your Raspberry Pi.

---

## 📦 What You Have

A **complete containerized setup** that runs securely on your Raspberry Pi alongside your existing containers.

### Files Overview

```
📁 Your Project
├── 🐳 docker-compose.production.yml  # Main Docker setup
├── 🔧 setup-docker-pi.sh            # Automated installation
├── 🌐 setup-cloudflare-tunnel.sh    # External access (optional)
├── 💾 backup-docker-ulu.sh          # Created by setup script
├── 📝 DOCKER-QUICK-START.md         # Quick reference
├── 🌐 docs/LOCAL-NETWORK-ACCESS.md  # Network setup guide
├── 📚 docs/RASPBERRY-PI-DEPLOYMENT.md # Full deployment guide
└── 🔐 nginx/                        # Nginx configuration
    ├── nginx.conf                   # Main config
    ├── conf.d/ulu-calculator.conf   # App-specific config
    └── ssl/                         # SSL certificates (generated)
```

---

## ⚡ Quick Start (5 Minutes)

### 1️⃣ Transfer to Raspberry Pi

**Option A: Using SCP (from Windows)**
```powershell
# From Ulu-win directory:
scp -r * pi@<raspberry-pi-ip>:~/ulu-calculator/
```

**Option B: Using Git (if repository is set up)**
```bash
# On Raspberry Pi:
git clone <your-repo-url> ~/ulu-calculator
cd ~/ulu-calculator
```

### 2️⃣ Run Setup

```bash
# SSH into Raspberry Pi
ssh pi@<raspberry-pi-ip>

# Navigate to directory
cd ~/ulu-calculator

# Make script executable and run
chmod +x setup-docker-pi.sh
./setup-docker-pi.sh
```

**The script handles everything:**
- ✅ Installs Docker & Docker Compose (if needed)
- ✅ Generates SSL certificates
- ✅ Creates secure environment
- ✅ Builds and starts containers
- ✅ Sets up automated backups

### 3️⃣ Access Your Application

```bash
# From Raspberry Pi:
https://localhost

# From other devices on your network:
https://192.168.1.xxx  # Your Pi's IP address
```

**Default Login:**
- Email: `admin@ulu-winery.co.il`
- Password: `Admin123!`
- ⚠️ **Change immediately after first login!**

---

## 🌐 Network Access Options

### 🏠 Local Network (Default - FREE)
**Already configured** - Access from devices on same WiFi/LAN

```
Access: https://192.168.1.xxx
Cost: FREE ✅
Setup: None needed ✅
```

### 👥 Remote Team Access (Tailscale - FREE)
**Best for:** Small team, remote access

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Share with team via Tailscale dashboard
# Access from anywhere: https://<tailscale-ip>
```

**Benefits:**
- ✅ FREE (up to 100 devices)
- ✅ Encrypted VPN
- ✅ Access from anywhere
- ✅ No port forwarding

### 🌍 Public Website (Cloudflare - ~$12/year)
**Best for:** Customer access, professional domain

```bash
./setup-cloudflare-tunnel.sh
# Access: https://ulu-winery.com
```

**Benefits:**
- ✅ Professional domain
- ✅ Free SSL certificate
- ✅ DDoS protection
- ✅ No port forwarding

**Comparison:**

| Feature | Local Only | Tailscale | Cloudflare |
|---------|-----------|-----------|------------|
| Cost | FREE | FREE | ~$12/year |
| Access | Same network | Anywhere (VPN) | Public internet |
| Setup | ✅ Done | 2 min | 5 min |
| Security | Excellent | Excellent | Very good |

---

## 🐳 Docker Management

### Check Status
```bash
docker-compose -f docker-compose.production.yml ps
```

### View Logs
```bash
# All logs
docker-compose -f docker-compose.production.yml logs -f

# App only
docker logs ulu-calculator -f

# Nginx only
docker logs ulu-nginx -f
```

### Control Services
```bash
# Restart
docker-compose -f docker-compose.production.yml restart

# Stop
docker-compose -f docker-compose.production.yml down

# Start
docker-compose -f docker-compose.production.yml up -d
```

### Updates
```bash
# Pull latest and rebuild
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d --build
```

---

## 💾 Backups

### Automated Backups
**Daily at 2 AM** - configured automatically

```bash
# Check backup schedule
crontab -l | grep backup

# View backups
ls -lh ~/backups/ulu-calculator/
```

### Manual Backup
```bash
./backup-docker-ulu.sh
```

### Restore
```bash
# Stop containers
docker-compose -f docker-compose.production.yml down

# Restore files
cp ~/backups/ulu-calculator/users_*.sqlite data/users.sqlite
cp ~/backups/ulu-calculator/config_*.json data/config.json

# Start containers
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔒 Security

### ✅ Included Features

- **HTTPS Encryption** (TLS 1.2/1.3)
- **Container Isolation**
- **Rate Limiting** (10 req/s API, 5 req/min login)
- **Security Headers** (HSTS, CSP, X-Frame-Options)
- **Password Hashing** (bcrypt)
- **Session Security** (HttpOnly, SameSite)
- **Non-root Containers**
- **SQL Injection Protection**

### 🔐 Firewall Setup

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow ssh

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 🎯 First Steps After Deployment

1. **Change Admin Password**
   - Login to https://\<pi-ip>
   - Profile → Change Password

2. **Test Access**
   - From another device on network
   - Accept security warning (self-signed cert)

3. **Check Logs**
   ```bash
   docker logs ulu-calculator --tail 50
   ```

---

## 🚨 Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Rebuild
docker-compose -f docker-compose.production.yml up -d --build --force-recreate
```

### Can't Access from Network
```bash
# 1. Check containers running
docker ps

# 2. Test locally
curl -k https://localhost/api/health

# 3. Check firewall
sudo ufw status

# 4. Find Pi IP
hostname -I
```

### SSL Warning on Browser
**This is normal for self-signed certificates!**

**How to proceed:**
- Chrome/Edge: "Advanced" → "Proceed"
- Firefox: "Advanced" → "Accept Risk"
- Safari (iOS): "Show Details" → "Visit Website"

**To avoid:** Use Cloudflare Tunnel for real SSL certificate

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **DOCKER-QUICK-START.md** | Quick reference commands |
| **docs/LOCAL-NETWORK-ACCESS.md** | Network setup guide |
| **docs/RASPBERRY-PI-DEPLOYMENT.md** | Full deployment guide |
| **docs/VERIFICATION-REPORT.md** | Complete verification |
| **docs/QA-CHECKLIST.md** | Testing checklist |

---

## 🎯 Deployment Options Comparison

### Docker (This Setup)
```
✅ Container isolation
✅ Easy updates
✅ Works with other containers
✅ Portable
✅ Auto-restart
```

### PM2 (Alternative)
```
✅ Lighter resource usage
✅ Direct Node.js control
✅ Simpler for single app
❌ Less isolation
See: docs/RASPBERRY-PI-DEPLOYMENT.md
```

### Both are FREE and fully supported!

---

## 💰 Cost Summary

| Component | Cost |
|-----------|------|
| Docker Setup | FREE ✅ |
| SSL (self-signed) | FREE ✅ |
| Local Network | FREE ✅ |
| Tailscale VPN | FREE ✅ |
| Cloudflare Tunnel | ~$12/year (optional) |

**Total: $0 for full local deployment**

---

## 📞 Get Help

### Quick Diagnostics
```bash
# Full health check
docker-compose -f docker-compose.production.yml ps
docker logs ulu-calculator --tail 50
docker logs ulu-nginx --tail 50
curl -k https://localhost/api/health
```

### Common Commands
```bash
# Status
docker ps

# Restart everything
docker-compose -f docker-compose.production.yml restart

# View all logs
docker-compose -f docker-compose.production.yml logs -f

# Clean up
docker system prune -a
```

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Containers are running (`docker ps`)
- [ ] Application accessible locally (`https://localhost`)
- [ ] Application accessible from network (`https://<pi-ip>`)
- [ ] Can login with default credentials
- [ ] Changed admin password
- [ ] Backups are scheduled (`crontab -l`)
- [ ] Firewall configured (`sudo ufw status`)

---

Made with ❤️ and 🍷 by Ulu Winery

**Need more details?** See `DOCKER-QUICK-START.md` or `docs/LOCAL-NETWORK-ACCESS.md`
