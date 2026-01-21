# 🌐 Local Network Access Guide

Complete guide for accessing Ulu Calculator from other devices on your local network.

---

## 🎯 Quick Start (Same Network)

Your Raspberry Pi is accessible from any device on the **same WiFi/LAN network**.

### Find Your Pi's IP Address

```bash
# On the Raspberry Pi, run:
hostname -I

# Example output: 192.168.1.100
```

### Access from Other Devices

From any device on the **same network**:

```
https://192.168.1.100
```

**Note:** You'll see a security warning (normal for self-signed certificates)
- Click "Advanced" → "Proceed to 192.168.1.100"
- This is safe for local network use

---

## 📱 Tested Access Methods

### ✅ From Windows/Mac/Linux Computer
```
Browser: https://192.168.1.100
```

### ✅ From iPhone/iPad
```
Safari: https://192.168.1.100
Accept certificate warning → Continue
```

### ✅ From Android Phone/Tablet
```
Chrome: https://192.168.1.100
Click "Advanced" → "Proceed"
```

### ✅ Using Hostname (if mDNS works)
```
https://raspberrypi.local
# or
https://<your-hostname>.local
```

---

## 🔒 Network Security

### Current Setup (Secure for Local Network)

Your setup is **secure for local network use**:

✅ **HTTPS** - All traffic encrypted
✅ **Container Isolation** - Apps separated from host system
✅ **Rate Limiting** - Protection against brute force
✅ **Firewall Ready** - UFW configured for port control
✅ **Session Security** - HttpOnly cookies, secure sessions

### What You Have:

```
┌─────────────────────────────────────────┐
│        Your Local Network               │
│  ┌────────────┐      ┌──────────────┐   │
│  │   Laptop   │──────│ Raspberry Pi │   │
│  └────────────┘      │  (Docker)    │   │
│                      │              │   │
│  ┌────────────┐      │  Ulu Calc    │   │
│  │   Phone    │──────│  + Nginx     │   │
│  └────────────┘      │  + SSL       │   │
│                      └──────────────┘   │
│         🔒 All traffic encrypted         │
└─────────────────────────────────────────┘
```

### Firewall Status

Check firewall:
```bash
sudo ufw status

# Expected output:
# To                         Action      From
# --                         ------      ----
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
# 22/tcp                     ALLOW       Anywhere
```

---

## 🌍 Access from Outside Your Network

You have **3 FREE options** for external access:

### Option 1: Tailscale VPN (Recommended - Easiest & Most Secure)

**Best for:** Small team, remote access, maximum security

**Setup:**
```bash
# On Raspberry Pi
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Get access URL
tailscale status
```

**Share access:**
1. Go to https://login.tailscale.com
2. Invite team members via email
3. They install Tailscale on their devices
4. Access via Tailscale IP (e.g., `https://100.x.x.x`)

**Benefits:**
- ✅ 100% FREE (up to 100 devices)
- ✅ Zero-config encrypted VPN
- ✅ No port forwarding needed
- ✅ No public exposure
- ✅ Works anywhere (even cellular)

**Access URL after setup:**
```
https://<tailscale-ip>:443
# or with MagicDNS enabled:
https://ulu-pi.your-tailnet.ts.net
```

---

### Option 2: Cloudflare Tunnel (Public Website)

**Best for:** Public access, professional appearance, customers

**Setup:**
```bash
# Run the automated script
./setup-cloudflare-tunnel.sh
```

**Requirements:**
- Domain name (~$12/year)
- Cloudflare account (free)

**Benefits:**
- ✅ Free SSL certificate
- ✅ No port forwarding
- ✅ DDoS protection
- ✅ Global CDN
- ✅ Professional domain (e.g., ulu-winery.com)

**Access URL:**
```
https://ulu-winery.com
```

---

### Option 3: Router Port Forwarding (Traditional)

**Best for:** Full control, no third-party services

**Setup:**

1. **Set Static IP for Pi**
   ```bash
   sudo nano /etc/dhcpcd.conf

   # Add:
   interface eth0
   static ip_address=192.168.1.100/24
   static routers=192.168.1.1
   static domain_name_servers=8.8.8.8
   ```

2. **Configure Router**
   - Access router admin (usually 192.168.1.1)
   - Find "Port Forwarding" or "Virtual Server"
   - Add rules:
     ```
     External Port 80  → 192.168.1.100:80
     External Port 443 → 192.168.1.100:443
     ```

3. **Get Public IP**
   ```bash
   curl ifconfig.me
   # Example: 203.0.113.45
   ```

4. **Access from Internet**
   ```
   https://203.0.113.45
   ```

**⚠️ Important:**
- Requires firewall (`ufw enable`)
- Your IP changes (use DDNS like DuckDNS)
- Less secure than VPN
- ISP may block residential servers

---

## 🔧 Network Troubleshooting

### Can't Access from Other Devices?

**1. Check Pi is Running**
```bash
# On Raspberry Pi:
docker ps

# Should show:
# ulu-calculator   Up
# ulu-nginx        Up
```

**2. Test Locally First**
```bash
# On Raspberry Pi:
curl -k https://localhost/api/health

# Should return: {"status":"healthy"}
```

**3. Check Firewall**
```bash
sudo ufw status

# If inactive:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**4. Verify Network Connection**
```bash
# On other device, ping the Pi:
ping 192.168.1.100

# Should get responses
```

**5. Check Containers**
```bash
docker-compose -f docker-compose.production.yml logs nginx
docker-compose -f docker-compose.production.yml logs ulu-app
```

---

### Browser Shows Security Warning?

**This is NORMAL for self-signed certificates on local networks.**

**How to proceed:**

**Chrome/Edge:**
1. Click "Advanced"
2. Click "Proceed to 192.168.1.100 (unsafe)"

**Firefox:**
1. Click "Advanced"
2. Click "Accept the Risk and Continue"

**Safari (iOS):**
1. Tap "Show Details"
2. Tap "visit this website"
3. Tap "Visit Website"

**To avoid warnings:** Use Option 1 (Tailscale) or Option 2 (Cloudflare Tunnel with real certificate)

---

### Can't Find Pi on Network?

**Find Pi's IP:**
```bash
# On Raspberry Pi:
hostname -I

# On another device (network scan):
# Linux/Mac:
arp -a | grep -i "b8:27:eb\|dc:a6:32\|e4:5f:01"

# Windows:
arp -a | findstr "b8-27-eb dc-a6-32 e4-5f-01"

# Or use mobile app:
# - Fing (iOS/Android)
# - Network Analyzer
```

---

## 📊 Network Architecture

### What's Running on Your Pi

```
┌─────────────────────────────────────────────────────┐
│                  Raspberry Pi OS                    │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │           Docker Network (Bridge)            │  │
│  │                                              │  │
│  │  ┌─────────────┐      ┌──────────────────┐  │  │
│  │  │   Nginx     │◄─────┤ Ulu Calculator   │  │  │
│  │  │   (Alpine)  │      │ (Node.js)        │  │  │
│  │  │             │      │                  │  │  │
│  │  │ - Port 80   │      │ - Internal 3000  │  │  │
│  │  │ - Port 443  │      │ - SQLite DB      │  │  │
│  │  │ - SSL/TLS   │      │ - Session mgmt   │  │  │
│  │  │ - Rate limit│      └──────────────────┘  │  │
│  │  └─────────────┘                            │  │
│  │        ▲                                    │  │
│  └────────┼────────────────────────────────────┘  │
│           │                                        │
│  ┌────────┴────────┐                               │
│  │  Host Firewall  │ (UFW)                         │
│  │  - Allow 80     │                               │
│  │  - Allow 443    │                               │
│  │  - Allow SSH    │                               │
│  └─────────────────┘                               │
│           ▲                                        │
└───────────┼────────────────────────────────────────┘
            │
            │ Your Local Network
            │ (192.168.1.x)
            ▼
  ┌──────────────────┐
  │  Other Devices   │
  │  - Laptops       │
  │  - Phones        │
  │  - Tablets       │
  └──────────────────┘
```

### Port Usage

| Port | Service | Purpose | Exposed |
|------|---------|---------|---------|
| **80** | Nginx | HTTP → HTTPS redirect | ✅ Network |
| **443** | Nginx | HTTPS (encrypted) | ✅ Network |
| **3000** | Node.js | Application server | ❌ Internal only |

---

## 🎯 Recommended Setup by Use Case

### 🏠 Home/Internal Use Only
**Setup:** Default (current)
- ✅ Access from local network
- ✅ Self-signed SSL
- ✅ No external access
- ✅ Free, simple, secure

### 👥 Small Team (2-10 people)
**Setup:** Tailscale VPN
- ✅ Encrypted private network
- ✅ Access from anywhere
- ✅ Easy to manage
- ✅ Free for up to 100 devices

### 🌍 Public/Customer Access
**Setup:** Cloudflare Tunnel
- ✅ Professional domain
- ✅ Real SSL certificate
- ✅ DDoS protection
- ✅ ~$12/year (domain only)

---

## 🔐 Security Best Practices

### ✅ Already Configured (You're Protected!)

- [x] HTTPS encryption
- [x] Container isolation
- [x] Non-root containers
- [x] Rate limiting (10 req/s API, 5 req/min login)
- [x] Security headers (X-Frame-Options, CSP, etc.)
- [x] Session security (httpOnly, sameSite)
- [x] Password hashing (bcrypt)

### 🎯 Additional Recommendations

**Change Default Password**
```
1. Login to https://<pi-ip>
2. Email: admin@ulu-winery.co.il
3. Password: Admin123!
4. Profile → Change Password
```

**Enable Fail2ban (SSH protection)**
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

**Monitor Access**
```bash
# View nginx access logs
docker logs ulu-nginx --tail 50

# View app logs
docker logs ulu-calculator --tail 50
```

**Regular Updates**
```bash
# Update container images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d --build

# Update Pi OS
sudo apt update && sudo apt upgrade -y
```

---

## 📞 Support

### Logs Location

```bash
# Application logs
docker logs ulu-calculator

# Nginx logs
docker logs ulu-nginx

# Or on host:
ls -lh logs/nginx/
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't access from phone | Check device is on same WiFi |
| Security warning | Normal for self-signed cert - click Advanced → Proceed |
| Container not starting | `docker-compose -f docker-compose.production.yml logs` |
| Forgot password | Reset via container exec |

### Quick Commands Reference

```bash
# Status
docker-compose -f docker-compose.production.yml ps

# Restart
docker-compose -f docker-compose.production.yml restart

# Logs (follow)
docker-compose -f docker-compose.production.yml logs -f

# Stop
docker-compose -f docker-compose.production.yml down

# Start
docker-compose -f docker-compose.production.yml up -d

# Backup
./backup-docker-ulu.sh
```

---

Made with ❤️ and 🍷 by Ulu Winery

*For more deployment options, see the full deployment guides in `/docs`*
