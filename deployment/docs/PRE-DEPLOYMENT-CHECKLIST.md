# ✅ Pre-Deployment Checklist

**Use this checklist before deploying to production to ensure everything is ready.**

---

## 🔍 Code & Application Status

- [ ] `npm install` runs successfully without errors
  ```bash
  npm install
  # Should complete with 245 packages installed
  ```

- [ ] Application starts without errors
  ```bash
  npm start
  # Should show: ✓ Server running on http://localhost:3000
  ```

- [ ] Database initializes correctly
  ```bash
  # After npm start, should see:
  # ✓ Database connection established
  # ✓ Database models synchronized
  ```

- [ ] API health endpoint works
  ```bash
  curl http://localhost:3000/api/health
  # Should return HTTP 200
  ```

- [ ] Frontend pages load
  - [ ] http://localhost:3000/index.html (Calculator)
  - [ ] http://localhost:3000/admin.html (Admin panel)
  - [ ] http://localhost:3000/login.html (Login page)

- [ ] Login functionality works
  - [ ] Email: `admin@ulu-winery.co.il`
  - [ ] Password: `Admin123!`
  - [ ] Can access admin panel after login

- [ ] Default data exists
  ```bash
  ls -la server/data/
  # Should have: config.json, quotas.json, users.sqlite
  ```

---

## 📦 Dependencies Status

- [ ] Node.js version 18+ installed
  ```bash
  node --version  # Should show v18.x.x or higher
  ```

- [ ] npm version 8+ installed
  ```bash
  npm --version  # Should show 8.x.x or higher
  ```

- [ ] All production dependencies are installed
  ```bash
  npm list
  # Should show express, sqlite3, bcrypt, sequelize, etc.
  ```

- [ ] No critical security vulnerabilities
  ```bash
  npm audit
  # Should show 0 critical vulnerabilities
  # (1 moderate is acceptable - legacy dependency)
  ```

---

## 🔒 Security Configuration

- [ ] `.env` file created and filled
  ```bash
  ls -la .env
  # Should exist (hidden file)
  ```

- [ ] SESSION_SECRET is securely generated
  ```bash
  cat .env | grep SESSION_SECRET
  # Should be 64+ character hex string, not default
  ```

- [ ] Default admin credentials will be changed post-deployment
  - [ ] Plan to change `admin@ulu-winery.co.il` password on first login
  - [ ] Plan to create dedicated user accounts
  - [ ] Plan to disable default admin if not needed

- [ ] .env is not in git history
  ```bash
  git log --all --full-history -- .env
  # Should be empty (no results)
  ```

- [ ] .env is in .gitignore
  ```bash
  cat .gitignore | grep "\.env"
  # Should find .env listed
  ```

---

## 🌐 Network & Domain

- [ ] DuckDNS account created
  - [ ] Token saved securely
  - [ ] Domain name reserved (e.g., `ulu-winery.duckdns.org`)

- [ ] Public IP address identified
  ```bash
  curl -s https://api.ipify.org
  # Should return your public IP
  ```

- [ ] Port forwarding configured (if behind router)
  - [ ] Port 80 → Pi:80
  - [ ] Port 443 → Pi:443

- [ ] Ports are open and accessible
  ```bash
  curl http://your-public-ip
  # Should respond (will redirect to https)
  ```

- [ ] Domain resolves correctly
  ```bash
  nslookup ulu-winery.duckdns.org
  # Should return your public IP
  ```

---

## 🚀 Deployment Components

### Node.js Application

- [ ] Application code is on the Raspberry Pi
- [ ] npm dependencies are installed (`node_modules` exists)
- [ ] `.env` file is created with production values
- [ ] `server/data/` directory exists and is writable

### Process Manager (PM2)

- [ ] PM2 is installed globally
  ```bash
  pm2 --version
  ```

- [ ] `ecosystem.config.js` is configured correctly
  ```bash
  cat ecosystem.config.js
  # Should have ulu-calculator app configured
  ```

- [ ] PM2 can start the application
  ```bash
  pm2 start ecosystem.config.js --env production
  pm2 status  # Should show ulu-calculator online
  pm2 delete ulu-calculator  # Clean up test
  ```

### Web Server (Nginx)

- [ ] Nginx is installed
  ```bash
  nginx --version
  ```

- [ ] Nginx configuration is created
  ```bash
  sudo cat /etc/nginx/sites-available/ulu-calculator
  # Should have proper config with SSL directives
  ```

- [ ] Nginx configuration is enabled
  ```bash
  sudo ls -l /etc/nginx/sites-enabled/ulu-calculator
  # Should exist as symlink
  ```

- [ ] Nginx syntax is valid
  ```bash
  sudo nginx -t
  # Should output: nginx: configuration file test is successful
  ```

### SSL Certificate

- [ ] Let's Encrypt certificate is obtained
  ```bash
  sudo certbot certificates
  # Should list your domain with valid certificate
  ```

- [ ] Certificate is valid
  ```bash
  sudo certbot certificates | grep -A 5 "ulu-winery.duckdns.org"
  # Should show expiration in future
  ```

- [ ] Certificate auto-renewal is configured
  ```bash
  sudo systemctl status certbot.timer
  # Should be active and running
  ```

### DuckDNS Update Service

- [ ] DuckDNS script is created
  ```bash
  cat ~/duckdns/duck.sh
  # Should contain TOKEN and DOMAIN
  ```

- [ ] DuckDNS script is executable
  ```bash
  ls -la ~/duckdns/duck.sh | grep "^-rwx"
  # Should show executable (x) flag
  ```

- [ ] DuckDNS script is scheduled in crontab
  ```bash
  crontab -l | grep duck.sh
  # Should appear in cron schedule
  ```

- [ ] DuckDNS is working
  ```bash
  curl "https://www.duckdns.org/update?domains=ulu-winery&token=YOUR-TOKEN&ip="
  # Should return OK
  ```

### Firewall

- [ ] UFW firewall is configured
  ```bash
  sudo ufw status
  # Should show numbered rules for 22, 80, 443
  ```

- [ ] SSH access is allowed
  ```bash
  sudo ufw status | grep 22
  # Should show port 22 allowed
  ```

- [ ] HTTP/HTTPS are allowed
  ```bash
  sudo ufw status | grep -E "80|443"
  # Should show both ports allowed
  ```

### Backups

- [ ] Backup script is created
  ```bash
  ls -la ~/backup-ulu.sh
  # Should exist and be executable
  ```

- [ ] Backup script works
  ```bash
  ~/backup-ulu.sh
  # Should complete successfully with "Backup created" message
  ```

- [ ] Backup is scheduled
  ```bash
  crontab -l | grep backup
  # Should show backup scheduled (daily at 2 AM)
  ```

- [ ] Backup is verified
  ```bash
  ls -lh ~/backups/ulu-calculator/
  # Should contain backup_*.tar.gz files
  ```

---

## 🧪 Testing

### Database & Data

- [ ] Database file exists
  ```bash
  ls -la server/data/users.sqlite
  # Should be ~16KB (initialized with tables)
  ```

- [ ] Config file exists
  ```bash
  ls -la server/data/config.json
  # Should exist with valid JSON
  ```

- [ ] Sample data exists
  ```bash
  test -f server/data/quotas.json && echo "Found"
  ```

### API Endpoints

- [ ] Health check endpoint works
  ```bash
  curl http://localhost:3000/api/health
  # Should return 200
  ```

- [ ] Login endpoint works
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@ulu-winery.co.il","password":"Admin123!"}'
  # Should return 200 with token
  ```

- [ ] Config endpoint works
  ```bash
  curl http://localhost:3000/api/config
  # Should return config JSON
  ```

### HTTPS

- [ ] HTTPS works without certificate warnings
  ```bash
  curl -v https://ulu-winery.duckdns.org 2>&1 | grep "SSL"
  # Should show successful SSL connection
  ```

- [ ] HTTP redirects to HTTPS
  ```bash
  curl -I http://ulu-winery.duckdns.org
  # Should show 301/308 redirect to https
  ```

### Browser Accessibility

- [ ] Login page accessible via HTTPS
  ```
  https://ulu-winery.duckdns.org/login.html
  # Should display login form
  ```

- [ ] Can login with default credentials
  - Email: `admin@ulu-winery.co.il`
  - Password: `Admin123!`
  - Should redirect to admin or calculator

- [ ] Calculator accessible after login
  ```
  https://ulu-winery.duckdns.org/index.html
  # Should display calculator interface
  ```

- [ ] Admin panel accessible after login
  ```
  https://ulu-winery.duckdns.org/admin.html
  # Should display admin configuration tabs
  ```

---

## 📋 Pre-Deployment Verification

- [ ] All logs are clean (no errors)
  ```bash
  pm2 logs ulu-calculator | grep -i error
  # Should show no lines (clean logs)
  ```

- [ ] No disk space issues
  ```bash
  df -h
  # Root filesystem should have >5GB free
  ```

- [ ] No memory issues
  ```bash
  free -h
  # Should show >500MB available
  ```

- [ ] System can handle restart
  ```bash
  sudo reboot
  # After reboot, check:
  pm2 status  # Should show ulu-calculator online
  ```

- [ ] DuckDNS persists after restart
  ```bash
  ps aux | grep duck.sh
  # Should show duck.sh running
  ```

- [ ] Nginx persists after restart
  ```bash
  sudo systemctl status nginx
  # Should show active and running
  ```

---

## 🔐 Security Verification

- [ ] SSH uses key-based authentication (not password)
  ```bash
  grep "PasswordAuthentication" /etc/ssh/sshd_config
  # Should show: PasswordAuthentication no
  ```

- [ ] Default SSH port is changed (optional but recommended)
  ```bash
  grep "^Port" /etc/ssh/sshd_config
  # Should show custom port (not 22)
  ```

- [ ] Fail2ban is running
  ```bash
  sudo systemctl status fail2ban
  # Should show active and running
  ```

- [ ] Firewall blocks unnecessary ports
  ```bash
  sudo ufw status numbered
  # Should only show 22, 80, 443 (or custom SSH port)
  ```

- [ ] HTTPS headers are secure
  ```bash
  curl -v https://ulu-winery.duckdns.org 2>&1 | grep "Strict-Transport-Security"
  # Should show HSTS header
  ```

---

## 📝 Documentation & Handoff

- [ ] Deployment guide is saved locally
  - [ ] DEPLOYMENT-DUCKDNS.md on Raspberry Pi
  - [ ] Backup copy on secure location
  - [ ] Printed copy for reference (optional)

- [ ] Important information is documented
  ```
  Admin Email: admin@ulu-winery.co.il
  Admin Password: [CHANGED - write secure password here]
  Domain: ulu-winery.duckdns.org
  DuckDNS Token: [SAVED SECURELY]
  Backup Location: ~/backups/ulu-calculator/
  Application Directory: ~/apps/Ulu-calculator/
  ```

- [ ] Access information is ready to share
  ```
  Website: https://ulu-winery.duckdns.org
  Login: [Provide credentials]
  Support: [Your contact info]
  ```

- [ ] Team members know how to:
  - [ ] Access the application
  - [ ] Change event pricing
  - [ ] Create user accounts
  - [ ] Access daily reports
  - [ ] Contact support if issues arise

---

## ✨ Final Sign-Off

**Deployment Readiness Assessment:**

- [ ] All infrastructure components are in place
- [ ] All tests pass successfully
- [ ] Security measures are active
- [ ] Backups are working
- [ ] Documentation is complete
- [ ] Team is trained
- [ ] Emergency procedures documented

**Ready for Production:** ✅ YES / ❌ NO

**Date Deployment Completed:** _________________

**Deployed By:** _________________

**Verified By:** _________________

---

## 🆘 If Something Fails

**Before contacting support, check:**

1. All services are running:
   ```bash
   pm2 status
   sudo systemctl status nginx
   ps aux | grep duck.sh
   ```

2. Check logs for errors:
   ```bash
   pm2 logs ulu-calculator
   sudo tail -f /var/log/nginx/ulu-calculator.error.log
   tail ~/duckdns/duck.log
   ```

3. Verify connectivity:
   ```bash
   ping 8.8.8.8  # Internet
   nslookup ulu-winery.duckdns.org  # DNS
   curl https://ulu-winery.duckdns.org  # Application
   ```

4. Check resources:
   ```bash
   df -h  # Disk space
   free -h  # Memory
   htop  # Overall system
   ```

---

**You are ready to deploy! 🎉**

Good luck with your deployment!
