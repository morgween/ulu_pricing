# 🚀 Quick Deployment Summary - Ulu Winery Calculator

**Fast-track guide for deploying to production**

---

## 📦 What You Have

A complete, production-ready event pricing calculator with:
- ✅ User authentication & authorization
- ✅ Real-time configuration management
- ✅ Wine ratio distribution engine
- ✅ Addon commission system (15% winery, ₪10-60 customer)
- ✅ PDF & Excel export
- ✅ SQLite database (upgradeable to PostgreSQL)
- ✅ Hebrew RTL interface
- ✅ Admin panel with live sync

---

## 🎯 Quickest Deployment Options

### Option 1: Railway.app (Recommended - 5 minutes)
```bash
# Install CLI
npm install -g @railway/cli

# Login & deploy
railway login
railway init
railway up

# Get your URL
railway open
```

**Pros:** Free tier, automatic HTTPS, zero config
**Cons:** None for this use case

---

### Option 2: Your Own VPS (15 minutes)
```bash
# On your server
git clone <your-repo>
cd Ulu-win
npm install --production

# Create .env
cp .env.example .env
nano .env  # Set SESSION_SECRET

# Install PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup Nginx (optional)
# See DEPLOYMENT.md for full Nginx config
```

---

### Option 3: Docker (10 minutes)
```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## ⚙️ Essential Configuration

### 1. Environment Variables

**Minimum required:**
```bash
SESSION_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NODE_ENV=production
PORT=3000
```

### 2. First Login

**URL:** `https://your-domain.com/login.html`

**Credentials:**
- Email: `admin@ulu-winery.co.il`
- Password: `Admin123!`

**⚠️ CHANGE PASSWORD IMMEDIATELY**

### 3. Configure Application

**Admin Panel:** `https://your-domain.com/admin.html`

**Critical Settings to Review:**
- ✅ Wine ratios (default: 40% white, 40% rose, 20% red)
- ✅ Addon commissions (default: 15% winery, ₪10-60 customer)
- ✅ Revenue targets (margins by guest count)
- ✅ Staffing rates
- ✅ VAT rate (default: 18%)

---

## 📊 Application Structure

```
Ulu-win/
├── 📄 index.html              # Main calculator
├── 📄 admin.html              # Admin panel
├── 📄 login.html              # Login page
├── 📄 change-password.html    # Password change
│
├── 📁 server/                 # Backend
│   ├── index.js              # Express server
│   ├── db/database.js        # SQLite config
│   ├── models/User.js        # User model
│   ├── routes/               # API routes
│   │   ├── auth.js          # Authentication
│   │   └── users.js         # User management
│   ├── middleware/auth.js    # Auth middleware
│   └── data/                 # Runtime data (auto-created)
│       ├── config.json       # Live config
│       ├── quotas.json       # Addon presets
│       └── users.sqlite      # User database
│
├── 📁 src/                    # Frontend
│   ├── app/                   # Calculator
│   │   ├── index.js
│   │   └── PricingCalculator.js  # Core engine (2550 lines)
│   ├── admin/                 # Admin panel
│   │   ├── AdminApp.js       # Main orchestrator
│   │   ├── sections/         # 10 config sections
│   │   ├── state/            # State management
│   │   ├── ui/               # UI components
│   │   ├── api/              # API client
│   │   └── persistence/      # Save logic
│   ├── react/                 # React wrapper (minimal)
│   ├── pricing-engine.js      # Pricing algorithms (769 lines)
│   ├── config-override.js     # LocalStorage system
│   └── utils/                 # Shared utilities
│
├── 📁 styles/                 # CSS
│   ├── main.css              # Calculator styles
│   └── admin.css             # Admin styles
│
├── 📁 partials/               # HTML partials
│   └── calculator.html       # Calculator UI (loaded by HTMX)
│
├── 📄 config.js               # Base configuration
├── 📄 package.json            # Dependencies
│
└── 📁 Documentation
    ├── README.md             # Overview
    ├── DEPLOYMENT.md         # Full deployment guide (detailed)
    ├── DEPLOYMENT-SUMMARY.md # This file (quick start)
    ├── QA-CHECKLIST.md       # Testing checklist
    └── CLAUDE.md             # Architecture & development guide
```

---

## 🔑 Key Features Overview

### 1. Wine Distribution Engine
- **Automatic calculation** based on guest count
- **Ratio preservation**: e.g., 20% red / 40% rose / 40% white
- **Priority system**: Rose > White > Red for rounding
- **Always 3 types** (minimum 1 bottle each if guests >= threshold)
- **Hide zero-ratio wines** (if set to 0% in admin)

**Location:** `src/app/PricingCalculator.js` (lines 706-783)

### 2. Addon Commission System
Three types:
1. **Fixed price**: No commission
2. **Winery brings** (per event or per person): 15% commission added to vendor price
3. **Customer brings** (per person): ₪10-60 commission

**Formula:** Full Price = Vendor Price + Commission

**Configuration:** Admin panel → General Settings → Addon Commissions

### 3. Revenue Targets
- **Dynamic margins** based on guest count
- **Interpolation** between breakpoints
- **Three food modes:**
  - `our_food`: Highest margins (67% @ 20 guests → 55% @ 100 guests)
  - `catering`: Medium margins (68% flat)
  - `customer_catering`: Lowest margins (48% @ 20 guests → 35% @ 100 guests)

**Location:** `config.js` → `revenueTargets`

### 4. Drinks Duration System
- **Short**: 1 hot, 1 cold per person
- **Medium**: 1.5 hot, 1.5 cold per person
- **Long**: 2 hot, 2 cold per person

**Child multipliers:** 0.75 for hot, 1.0 for cold

**Configuration:** Admin panel → Drinks section

### 5. Authentication
- **Session-based** (express-session)
- **SQLite database** (users.sqlite)
- **Two roles:** Admin (full access) & User (calculator only)
- **Force password change** on first login
- **24-hour session timeout**

**Location:** `server/` directory

---

## 🔒 Security Checklist

Before going live:

- [ ] Change default admin password
- [ ] Set strong `SESSION_SECRET` in `.env`
- [ ] Enable HTTPS (automatic on Railway/Render)
- [ ] Set `NODE_ENV=production`
- [ ] Review user permissions
- [ ] Enable rate limiting (see DEPLOYMENT.md)
- [ ] Set up backups (daily cron job)

---

## 📱 Access Points

After deployment:

- 🏠 **Calculator:** `https://your-domain.com/`
- ⚙️ **Admin Panel:** `https://your-domain.com/admin.html`
- 🔐 **Login:** `https://your-domain.com/login.html`
- 💊 **Health Check:** `https://your-domain.com/api/health`

---

## 🐛 Common Issues & Fixes

### Port already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Configuration not saving
1. Check server logs: `pm2 logs` or `docker logs`
2. Verify file permissions: `chmod 755 server/data`
3. Check API health: `curl localhost:3000/api/health`

### Wine ratio not working
- Ensure ratios sum to 100% in admin panel
- Check browser console for errors
- Clear browser cache and localStorage
- Verify config saved: `cat server/data/config.json | grep ratio`

### Session not persisting
- Check `SESSION_SECRET` is set
- Verify cookies enabled in browser
- Check HTTPS is enabled (required in production)
- Look for CORS issues in network tab

---

## 📊 Monitoring

### Health Check
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T12:00:00.000Z"
}
```

### View Logs

**PM2:**
```bash
pm2 logs ulu-calculator
pm2 monit
```

**Docker:**
```bash
docker-compose logs -f
```

**Railway:**
```bash
railway logs
```

---

## 💾 Backup Strategy

**Automated Script** (save as `backup.sh`):
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
cp server/data/users.sqlite backups/users_$DATE.sqlite
cp server/data/config.json backups/config_$DATE.json
cp server/data/quotas.json backups/quotas_$DATE.json
find backups -mtime +30 -delete  # Keep 30 days
```

**Schedule daily:**
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## 🔄 Update Process

```bash
# 1. Backup
./backup.sh

# 2. Pull changes
git pull origin main

# 3. Install dependencies
npm install --production

# 4. Restart
pm2 restart ulu-calculator
# OR
docker-compose down && docker-compose up -d --build
# OR
railway up
```

---

## 📞 Support Resources

- **Full Deployment Guide:** `DEPLOYMENT.md` (comprehensive, all platforms)
- **QA Testing:** `QA-CHECKLIST.md` (complete testing checklist)
- **Architecture:** `CLAUDE.md` (technical details for developers)
- **API Documentation:** See `server/index.js` comments
- **Git Repository:** Keep commits descriptive

---

## ✅ Deployment Checklist (Quick)

1. **Deploy**
   - [ ] Choose platform (Railway/VPS/Docker)
   - [ ] Deploy application
   - [ ] Get URL/domain

2. **Configure**
   - [ ] Set `SESSION_SECRET` environment variable
   - [ ] Set `NODE_ENV=production`
   - [ ] Enable HTTPS

3. **Initialize**
   - [ ] Login with default credentials
   - [ ] Change admin password immediately
   - [ ] Configure wine ratios
   - [ ] Set addon commission rates
   - [ ] Update branding (logo, footer)

4. **Test**
   - [ ] Create test event (50 guests)
   - [ ] Verify wine calculation (check ratios)
   - [ ] Test addon commissions (15%)
   - [ ] Export PDF and Excel
   - [ ] Verify all calculations

5. **Secure**
   - [ ] Review all user accounts
   - [ ] Enable rate limiting (optional)
   - [ ] Set up backups
   - [ ] Monitor logs for 24 hours

6. **Launch**
   - [ ] Share URL with team
   - [ ] Train users
   - [ ] Collect feedback
   - [ ] Iterate

---

## 🎉 You're Ready!

Everything is configured and tested. Choose your deployment platform and go live!

**Recommended:** Start with Railway.app for instant deployment, then migrate to VPS if needed.

---

**Questions?** Check `DEPLOYMENT.md` for detailed guides on each platform.

Made with ❤️ and 🍷 by Ulu Winery
