# 🐳 Docker Quick Start for Raspberry Pi

**Complete containerized setup - works alongside your existing containers**

---

## ⚡ 5-Minute Setup

### 1. Copy Files to Raspberry Pi

```bash
# On Windows (from Ulu-win directory):
scp -r * pi@<raspberry-pi-ip>:~/ulu-calculator/

# Then SSH into Pi:
ssh pi@<raspberry-pi-ip>
cd ~/ulu-calculator
```

### 2. Run Setup Script

```bash
chmod +x setup-docker-pi.sh
./setup-docker-pi.sh
```

**The script will:**
- ✅ Install Docker & Docker Compose (if needed)
- ✅ Generate SSL certificates (self-signed for local network)
- ✅ Create secure .env file with random session secret
- ✅ Build and start containers
- ✅ Set up automated backups
- ✅ Configure firewall (optional)

### 3. Access Your Application

```bash
# From Raspberry Pi:
https://localhost

# From other devices on your network:
https://192.168.1.xxx  # (Pi's IP address)
```

**Login:**
- Email: `admin@ulu-winery.co.il`
- Password: `Admin123!`
- ⚠️ **Change password immediately!**

---

## 🔧 What Gets Installed

### Container Architecture

```
┌─────────────────────────────────────┐
│     Docker Network (Bridge)         │
│                                     │
│  ┌──────────┐    ┌──────────────┐  │
│  │  Nginx   │◄───┤ Ulu Calc App │  │
│  │  :80,443 │    │    :3000     │  │
│  └──────────┘    └──────────────┘  │
│                                     │
│  Isolated from other containers     │
└─────────────────────────────────────┘
```

### Services Running

| Container | Purpose | Ports |
|-----------|---------|-------|
| **ulu-nginx** | Reverse proxy, SSL, rate limiting | 80, 443 |
| **ulu-calculator** | Node.js application | 3000 (internal) |

### Volumes (Persistent Data)

```
./data/          → Database, config, quotas
./logs/          → Application & Nginx logs
./uploads/       → Uploaded files (if any)
./backups/       → Automated backups
./nginx/ssl/     → SSL certificates
```

---

## 🌐 Network Access Options

### Option 1: Local Network Only (Current Setup)
**FREE - No configuration needed**

```
Access from same WiFi/LAN: https://192.168.1.xxx
✅ Secure, simple, private
```

### Option 2: Tailscale VPN (Remote Team Access)
**FREE for up to 100 devices**

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Share access with team
# Access from anywhere: https://<tailscale-ip>
```

**Benefits:**
- ✅ Access from anywhere (encrypted VPN)
- ✅ No port forwarding
- ✅ Team management via dashboard

### Option 3: Cloudflare Tunnel (Public Website)
**~$12/year (domain name only)**

```bash
# Run automated setup
./setup-cloudflare-tunnel.sh

# Access: https://ulu-winery.com
```

**Benefits:**
- ✅ Professional domain
- ✅ Free SSL certificate
- ✅ DDoS protection
- ✅ No port forwarding

### Comparison

| Feature | Local Only | Tailscale VPN | Cloudflare Tunnel |
|---------|-----------|---------------|-------------------|
| **Cost** | FREE | FREE | ~$12/year |
| **Access** | Same network | Anywhere (VPN) | Anywhere (public) |
| **Security** | Excellent | Excellent | Very good |
| **Setup** | Done ✅ | 2 minutes | 5 minutes |
| **Best For** | Home use | Small team | Customers |

---

## 🐳 Docker Commands

### Daily Operations

```bash
# Check status
docker-compose -f docker-compose.production.yml ps

# View logs (live)
docker-compose -f docker-compose.production.yml logs -f

# View app logs only
docker logs ulu-calculator -f

# View nginx logs only
docker logs ulu-nginx -f
```

### Control Services

```bash
# Restart all
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart ulu-app

# Stop all
docker-compose -f docker-compose.production.yml down

# Start all
docker-compose -f docker-compose.production.yml up -d
```

### Updates

```bash
# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Rebuild and restart
docker-compose -f docker-compose.production.yml up -d --build
```

### Maintenance

```bash
# Enter container shell
docker exec -it ulu-calculator sh

# View container stats
docker stats

# Clean up old images/volumes
docker system prune -a
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
# Run backup now
./backup-docker-ulu.sh

# Backups saved to:
~/backups/ulu-calculator/users_YYYYMMDD_HHMMSS.sqlite
~/backups/ulu-calculator/config_YYYYMMDD_HHMMSS.json
```

### Restore from Backup

```bash
# Stop containers
docker-compose -f docker-compose.production.yml down

# Restore database
cp ~/backups/ulu-calculator/users_20250118_020000.sqlite data/users.sqlite

# Restore config
cp ~/backups/ulu-calculator/config_20250118_020000.json data/config.json

# Start containers
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔒 Security Features

### ✅ Included Out-of-the-Box

- **HTTPS Encryption** - All traffic encrypted (TLS 1.2/1.3)
- **Container Isolation** - Separate from other containers
- **Non-root Containers** - Runs as unprivileged user
- **Rate Limiting** - 10 req/s API, 5 req/min login
- **Security Headers** - HSTS, X-Frame-Options, CSP, XSS protection
- **Session Security** - HttpOnly, SameSite cookies
- **Password Hashing** - Bcrypt with salt
- **SQL Injection Protection** - Sequelize parameterized queries
- **Read-only Filesystem** - Where possible
- **Capabilities Dropped** - Minimal Linux capabilities

### 🔐 Firewall Configuration

```bash
# Check firewall status
sudo ufw status

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow ssh

# Enable firewall
sudo ufw enable
```

### 📊 Security Monitoring

```bash
# View access logs
docker logs ulu-nginx | tail -100

# Monitor failed login attempts
docker logs ulu-calculator | grep "login failed"

# Check for suspicious activity
docker logs ulu-nginx | grep -E "40[134]|50[0-9]"
```

---

## 🚨 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Check specific container
docker logs ulu-calculator
docker logs ulu-nginx

# Rebuild containers
docker-compose -f docker-compose.production.yml up -d --build --force-recreate
```

### Can't Access from Network

```bash
# 1. Check containers are running
docker ps

# 2. Check firewall
sudo ufw status

# 3. Test locally first
curl -k https://localhost/api/health

# 4. Find Pi's IP
hostname -I

# 5. Test from Pi
curl -k https://192.168.1.xxx/api/health
```

### SSL Certificate Issues

```bash
# Regenerate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Restart nginx
docker-compose -f docker-compose.production.yml restart nginx
```

### Database Locked

```bash
# Stop containers
docker-compose -f docker-compose.production.yml down

# Wait 5 seconds
sleep 5

# Start containers
docker-compose -f docker-compose.production.yml up -d
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a --volumes

# Remove old logs
rm logs/nginx/*.log.*
rm logs/*.log.*

# Clean old backups (keep last 30 days)
find ~/backups/ulu-calculator/ -mtime +30 -delete
```

---

## 📚 Documentation

- **Full Guide:** `docs/RASPBERRY-PI-DEPLOYMENT.md`
- **Network Access:** `docs/LOCAL-NETWORK-ACCESS.md`
- **QA Checklist:** `docs/QA-CHECKLIST.md`
- **Verification Report:** `docs/VERIFICATION-REPORT.md`

---

## 🎯 Next Steps

### ✅ Immediate (Required)

1. **Change Admin Password**
   - Login to https://\<pi-ip>
   - Profile → Change Password

2. **Test from Another Device**
   - Connect phone/laptop to same WiFi
   - Visit https://\<pi-ip>
   - Accept security warning (normal for self-signed cert)

### 🔧 Optional Enhancements

3. **Set Up External Access** (if needed)
   - See "Network Access Options" above
   - Recommended: Tailscale for team access

4. **Configure Monitoring** (advanced)
   ```bash
   # Install Portainer (Docker GUI)
   docker volume create portainer_data
   docker run -d -p 9000:9000 --name portainer \
     --restart=always \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -v portainer_data:/data \
     portainer/portainer-ce:latest
   ```

5. **Enable Auto-Updates** (advanced)
   ```bash
   # Edit docker-compose.production.yml
   # Uncomment watchtower profile
   export COMPOSE_PROFILES=auto-update
   docker-compose -f docker-compose.production.yml up -d
   ```

---

## 💰 Cost Summary

| Component | Cost |
|-----------|------|
| **Docker Setup** | FREE ✅ |
| **SSL (self-signed)** | FREE ✅ |
| **Local Network Access** | FREE ✅ |
| **Tailscale VPN** | FREE ✅ (up to 100 devices) |
| **Cloudflare Tunnel** | ~$12/year (domain only) |

**Total for local deployment: $0**

---

## 📞 Support

### Get Help

```bash
# Container status
docker-compose -f docker-compose.production.yml ps

# All logs
docker-compose -f docker-compose.production.yml logs --tail 100

# Health check
curl -k https://localhost/api/health

# Container details
docker inspect ulu-calculator
docker inspect ulu-nginx
```

### Resources

- Docker Compose Docs: https://docs.docker.com/compose/
- Nginx Docs: https://nginx.org/en/docs/
- Tailscale Docs: https://tailscale.com/kb/
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/

---

Made with ❤️ and 🍷 by Ulu Winery

**Questions?** Check `docs/LOCAL-NETWORK-ACCESS.md` for detailed network setup.
