# 🚀 Deployment Guide - Ulu Winery Calculator

Complete guide for deploying the Ulu Winery Event Pricing Calculator to production.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [Post-Deployment Steps](#post-deployment-steps)
5. [Maintenance & Updates](#maintenance--updates)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Node.js 18+ installed on target server
- [ ] Git repository access
- [ ] Domain name (optional but recommended)
- [ ] SSL certificate (for HTTPS)
- [ ] Backup of current configuration
- [ ] Admin email for default account

---

## 🔧 Environment Setup

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Security
SESSION_SECRET=your-super-secret-session-key-change-this-to-random-string

# Database
DB_PATH=./server/data/users.sqlite

# Admin Email (optional)
ADMIN_EMAIL=admin@ulu-winery.co.il

# Email Configuration (for password reset - optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM=noreply@ulu-winery.co.il
```

**⚠️ IMPORTANT:** Generate a strong `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Install Dependencies

```bash
cd Ulu-win
npm install --production
```

---

## 🌐 Deployment Options

### Option 1: VPS/Dedicated Server (Recommended)

Best for: Full control, custom domain, professional setup

#### Using PM2 (Process Manager)

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Create PM2 ecosystem file** (`ecosystem.config.js`):
   ```javascript
   module.exports = {
     apps: [{
       name: 'ulu-calculator',
       script: './server/index.js',
       instances: 1,
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
       merge_logs: true
     }]
   };
   ```

3. **Start application:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Set up Nginx reverse proxy** (recommended):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Redirect to HTTPS
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name your-domain.com;

       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Restart Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

### Option 2: Railway.app (Easy, Fast)

Best for: Quick deployment, automatic HTTPS, free tier available

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and initialize:**
   ```bash
   railway login
   railway init
   ```

3. **Set environment variables:**
   ```bash
   railway variables set SESSION_SECRET=your-secret-key
   railway variables set NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Get deployment URL:**
   ```bash
   railway open
   ```

**Railway Configuration** (add to project):
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

### Option 3: Render.com (Free Tier)

Best for: Zero-cost deployment, automatic HTTPS

1. **Create `render.yaml` in project root:**
   ```yaml
   services:
     - type: web
       name: ulu-calculator
       env: node
       plan: free
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: SESSION_SECRET
           generateValue: true
         - key: PORT
           value: 10000
   ```

2. **Push to GitHub**

3. **Connect on Render.com:**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select branch
   - Deploy

---

### Option 4: Vercel (Serverless)

Best for: Global CDN, automatic scaling

**⚠️ Note:** Requires serverless adaptation. SQLite won't persist between requests.

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Create `vercel.json`:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "server/index.js"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

**⚠️ Limitation:** You'll need to switch to a cloud database (PostgreSQL/MySQL) instead of SQLite for Vercel.

---

### Option 5: Docker (Universal)

Best for: Containerized deployment, any cloud provider

1. **Create `Dockerfile`:**
   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   # Copy package files
   COPY package*.json ./

   # Install dependencies
   RUN npm ci --only=production

   # Copy application files
   COPY . .

   # Create data directory
   RUN mkdir -p server/data

   # Expose port
   EXPOSE 3000

   # Start application
   CMD ["npm", "start"]
   ```

2. **Create `.dockerignore`:**
   ```
   node_modules
   npm-debug.log
   .git
   .gitignore
   .env
   server/data/
   ```

3. **Build and run:**
   ```bash
   docker build -t ulu-calculator .
   docker run -d -p 3000:3000 --name ulu-app \
     -e SESSION_SECRET=your-secret \
     -e NODE_ENV=production \
     -v $(pwd)/server/data:/app/server/data \
     ulu-calculator
   ```

4. **Docker Compose** (`docker-compose.yml`):
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - SESSION_SECRET=${SESSION_SECRET}
       volumes:
         - ./server/data:/app/server/data
       restart: unless-stopped
   ```

   Run with: `docker-compose up -d`

---

## 🔐 Post-Deployment Steps

### 1. Initial Login

1. Navigate to: `https://your-domain.com/login.html`
2. Login with default credentials:
   - **Email:** `admin@ulu-winery.co.il`
   - **Password:** `Admin123!`
3. **IMMEDIATELY** change password when prompted

### 2. Configure Application

1. Go to Admin Panel: `https://your-domain.com/admin.html`
2. Update configuration:
   - VAT rate
   - Food pricing
   - Wine ratios
   - Staffing rates
   - Revenue targets
   - Branding (logo, colors)

### 3. Test All Features

- [ ] Create a test event in calculator
- [ ] Verify wine distribution (automatic calculation)
- [ ] Test addon pricing
- [ ] Generate PDF quote
- [ ] Export to Excel
- [ ] Verify all calculations match expected margins

### 4. Create Additional Users (Optional)

1. Go to: `https://your-domain.com/admin.html` → Users section
2. Add staff members with appropriate roles:
   - **Admin**: Full access
   - **User**: Calculator only

### 5. Backup Strategy

**Automated Backup Script** (`backup.sh`):
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Backup database
cp server/data/users.sqlite $BACKUP_DIR/users_$DATE.sqlite

# Backup configuration
cp server/data/config.json $BACKUP_DIR/config_$DATE.json
cp server/data/quotas.json $BACKUP_DIR/quotas_$DATE.json

# Keep only last 30 days
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.json" -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Schedule with cron** (daily at 2 AM):
```bash
crontab -e
# Add this line:
0 2 * * * /path/to/backup.sh >> /var/log/ulu-backup.log 2>&1
```

---

## 🔄 Maintenance & Updates

### Updating the Application

1. **Backup current data:**
   ```bash
   ./backup.sh
   ```

2. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

3. **Install new dependencies:**
   ```bash
   npm install --production
   ```

4. **Restart application:**
   ```bash
   # PM2
   pm2 restart ulu-calculator

   # Docker
   docker-compose down && docker-compose up -d --build

   # Railway
   railway up
   ```

### Monitoring

**View logs:**
```bash
# PM2
pm2 logs ulu-calculator

# Docker
docker logs -f ulu-app

# Railway
railway logs
```

**Check application status:**
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

---

## 🐛 Troubleshooting

### Issue: Port 3000 already in use

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /F /PID <PID>  # Windows
```

### Issue: Database locked

**Cause:** Multiple processes accessing SQLite

**Solution:**
```bash
# Stop all instances
pm2 stop all
# Or kill processes manually

# Restart single instance
pm2 start ecosystem.config.js
```

### Issue: Session not persisting

**Cause:** Cookie settings or HTTPS misconfiguration

**Solution:**
- Ensure `secure: true` in session config for HTTPS
- Check `sameSite` setting
- Verify domain/subdomain matches

### Issue: Configuration not saving

**Check:**
1. Server logs for errors
2. File permissions: `chmod 755 server/data`
3. Disk space: `df -h`

### Issue: PDF generation failing

**Cause:** Missing fonts or images

**Solution:**
- Upload logo to admin panel
- Verify font URLs are accessible
- Check browser console for errors

---

## 📊 Performance Optimization

### 1. Enable Compression

Add to `server/index.js`:
```javascript
import compression from 'compression';
app.use(compression());
```

Install: `npm install compression`

### 2. Cache Static Assets

Nginx configuration:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Database Optimization

For high traffic, consider migrating to PostgreSQL:
```bash
# Install PostgreSQL adapter
npm install pg pg-hstore

# Update sequelize config
dialect: 'postgres',
host: process.env.DB_HOST,
database: process.env.DB_NAME,
username: process.env.DB_USER,
password: process.env.DB_PASSWORD
```

---

## 🔒 Security Hardening

### 1. Environment Variables

**Never commit:**
- `.env` file
- `server/data/` directory
- Session secrets

### 2. Rate Limiting

Add to `server/index.js`:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Security Headers

```javascript
import helmet from 'helmet';
app.use(helmet());
```

### 4. HTTPS Only

Nginx:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 📱 Domain Configuration

### Custom Domain Setup

1. **Add DNS records:**
   ```
   Type: A
   Name: @
   Value: <your-server-ip>

   Type: CNAME
   Name: www
   Value: your-domain.com
   ```

2. **SSL Certificate (Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

3. **Auto-renewal:**
   ```bash
   sudo certbot renew --dry-run
   ```

---

## 📞 Support & Resources

- **Documentation:** See `README.md` and `CLAUDE.md`
- **Project Structure:** Review `CLAUDE.md` for detailed architecture
- **Git Repository:** Keep commits atomic and descriptive
- **Backup Location:** `./backups/` directory

---

## ✅ Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Default admin password changed
- [ ] Database backed up
- [ ] HTTPS enabled
- [ ] Domain configured
- [ ] All features tested
- [ ] Monitoring set up
- [ ] Backup script running
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Session secret is strong and unique
- [ ] Error pages customized (403, 404, 500)
- [ ] Contact information updated in branding

---

## 🎉 You're Live!

Your Ulu Winery Calculator is now deployed and ready for production use!

**Access Points:**
- 🏠 Calculator: `https://your-domain.com/`
- ⚙️ Admin: `https://your-domain.com/admin.html`
- 🔐 Login: `https://your-domain.com/login.html`

**Next Steps:**
1. Share login credentials with team
2. Train staff on calculator usage
3. Monitor logs for first few days
4. Collect user feedback
5. Iterate and improve

---

Made with ❤️ and 🍷 by Ulu Winery
