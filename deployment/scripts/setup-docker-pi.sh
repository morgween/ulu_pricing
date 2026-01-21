#!/bin/bash

# ========================================
# Ulu Calculator - Complete Docker Setup for Raspberry Pi
# ========================================
# Sets up complete containerized environment with Nginx, SSL, and security
# Works alongside other containers on your Pi
# Run as: ./setup-docker-pi.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
    echo ""
}

print_header "Ulu Calculator - Docker Setup for Raspberry Pi"

# Check if running as non-root
if [ "$EUID" -eq 0 ]; then
    print_error "Do not run this script as root!"
    print_info "Run as regular user with sudo privileges"
    exit 1
fi

print_success "Running as user: $USER"

# ========================================
# Step 1: Check Docker Installation
# ========================================
print_header "Step 1: Checking Docker"

if ! command -v docker &> /dev/null; then
    print_info "Docker not found. Installing Docker..."

    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh

    # Add user to docker group
    sudo usermod -aG docker $USER

    print_success "Docker installed"
    print_info "Please log out and back in for group changes to take effect"
    print_info "Then run this script again"
    exit 0
else
    print_success "Docker installed: $(docker --version)"
fi

# Check if user is in docker group
if ! groups | grep -q docker; then
    print_info "Adding user to docker group..."
    sudo usermod -aG docker $USER
    print_info "Please log out and back in, then run this script again"
    exit 0
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_info "Installing Docker Compose..."
    sudo apt update
    sudo apt install -y docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose installed: $(docker-compose --version)"
fi

# ========================================
# Step 2: Create Directory Structure
# ========================================
print_header "Step 2: Setting Up Directories"

# Create necessary directories
mkdir -p nginx/ssl
mkdir -p nginx/conf.d
mkdir -p data
mkdir -p logs/nginx
mkdir -p uploads
mkdir -p backups

print_success "Directories created"

# ========================================
# Step 3: Generate SSL Certificates
# ========================================
print_header "Step 3: SSL Certificate Setup"

echo "Choose SSL certificate option:"
echo "1) Self-signed certificate (for local network - FREE)"
echo "2) Let's Encrypt (for public domain - FREE, requires domain)"
echo "3) Skip (use existing certificates)"
read -p "Enter choice (1-3): " SSL_CHOICE

if [ "$SSL_CHOICE" = "1" ]; then
    print_info "Generating self-signed SSL certificate..."

    # Get local IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')

    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=IL/ST=Israel/L=UluWinery/O=UluWinery/CN=${LOCAL_IP}" \
        -addext "subjectAltName=IP:${LOCAL_IP},DNS:localhost,DNS:*.local"

    print_success "Self-signed certificate created"
    print_info "Valid for 1 year"
    print_info "Access via: https://${LOCAL_IP}"
    print_info "Your browser will show a security warning (normal for self-signed certs)"

elif [ "$SSL_CHOICE" = "2" ]; then
    print_info "Let's Encrypt setup requires:"
    print_info "1. A registered domain name"
    print_info "2. Domain pointing to your public IP"
    print_info "3. Port 80 and 443 forwarded to this Pi"

    read -p "Enter your domain (e.g., ulu-winery.com): " DOMAIN

    print_info "Installing certbot..."
    sudo apt update
    sudo apt install -y certbot

    # Create webroot for challenge
    mkdir -p /var/www/certbot

    print_info "Getting SSL certificate from Let's Encrypt..."
    sudo certbot certonly --standalone \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --agree-tos \
        --non-interactive \
        --email "admin@${DOMAIN}"

    # Copy certificates
    sudo cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" nginx/ssl/cert.pem
    sudo cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" nginx/ssl/key.pem
    sudo chown $USER:$USER nginx/ssl/*.pem

    print_success "Let's Encrypt certificate installed"
    print_info "Certificate auto-renews via certbot"

else
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        print_error "SSL certificates not found!"
        print_info "Please place cert.pem and key.pem in nginx/ssl/"
        exit 1
    fi
    print_success "Using existing SSL certificates"
fi

# ========================================
# Step 4: Create Environment File
# ========================================
print_header "Step 4: Configuring Environment"

if [ ! -f ".env" ]; then
    print_info "Creating .env file..."

    # Generate random session secret
    SESSION_SECRET=$(openssl rand -hex 64)

    cat > .env << EOF
# Ulu Calculator Environment Configuration
NODE_ENV=production
PORT=3000

# Session Secret (auto-generated)
SESSION_SECRET=${SESSION_SECRET}

# Database
DATABASE_PATH=/app/data/users.sqlite

# Optional: Enable auto-updates (uncomment to enable)
# COMPOSE_PROFILES=auto-update
EOF

    print_success ".env file created with secure session secret"
else
    print_success ".env file already exists"
fi

# ========================================
# Step 5: Build and Start Containers
# ========================================
print_header "Step 5: Building and Starting Containers"

print_info "Building Docker images (this may take a few minutes)..."
docker-compose -f docker-compose.production.yml build

print_info "Starting containers..."
docker-compose -f docker-compose.production.yml up -d

print_success "Containers started"

# ========================================
# Step 6: Wait for Health Checks
# ========================================
print_header "Step 6: Verifying Installation"

print_info "Waiting for application to start..."
sleep 10

# Check container status
if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    print_success "Containers are running"
else
    print_error "Containers failed to start"
    print_info "Check logs with: docker-compose -f docker-compose.production.yml logs"
    exit 1
fi

# Test health endpoint
if curl -k -s https://localhost/api/health > /dev/null 2>&1; then
    print_success "Application is responding"
else
    print_info "Waiting for application to fully start..."
    sleep 10
    if curl -k -s https://localhost/api/health > /dev/null 2>&1; then
        print_success "Application is responding"
    else
        print_error "Application not responding"
        print_info "Check logs with: docker-compose -f docker-compose.production.yml logs ulu-app"
    fi
fi

# ========================================
# Step 7: Create Backup Script
# ========================================
print_header "Step 7: Setting Up Backups"

cat > backup-docker-ulu.sh << 'EOF'
#!/bin/bash

# Backup script for containerized Ulu Calculator
BACKUP_DIR="$HOME/backups/ulu-calculator"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database..."
docker exec ulu-calculator cat /app/data/users.sqlite > "$BACKUP_DIR/users_${DATE}.sqlite"

# Backup config (if exists)
if docker exec ulu-calculator test -f /app/data/config.json; then
    docker exec ulu-calculator cat /app/data/config.json > "$BACKUP_DIR/config_${DATE}.json"
fi

# Backup quotas (if exists)
if docker exec ulu-calculator test -f /app/data/quotas.json; then
    docker exec ulu-calculator cat /app/data/quotas.json > "$BACKUP_DIR/quotas_${DATE}.json"
fi

# Backup .env
cp .env "$BACKUP_DIR/env_${DATE}.txt" 2>/dev/null || true

# Clean old backups
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "*.sqlite" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.txt" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup-docker-ulu.sh
print_success "Backup script created: backup-docker-ulu.sh"

# Setup cron job
if ! crontab -l 2>/dev/null | grep -q "backup-docker-ulu.sh"; then
    print_info "Setting up daily backup cron job..."
    (crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/backup-docker-ulu.sh >> $(pwd)/logs/backup.log 2>&1") | crontab -
    print_success "Daily backup scheduled for 2 AM"
else
    print_success "Backup cron job already configured"
fi

# ========================================
# Step 8: Configure Firewall (Optional)
# ========================================
print_header "Step 8: Firewall Configuration"

if command -v ufw &> /dev/null; then
    read -p "Configure UFW firewall? (y/n): " SETUP_FW
    if [[ $SETUP_FW =~ ^[Yy]$ ]]; then
        print_info "Configuring firewall..."
        sudo ufw allow 80/tcp comment 'HTTP for Ulu Calculator'
        sudo ufw allow 443/tcp comment 'HTTPS for Ulu Calculator'
        sudo ufw allow ssh comment 'SSH access'

        if ! sudo ufw status | grep -q "Status: active"; then
            print_info "Enable firewall now? (y/n): "
            read -p "" ENABLE_FW
            if [[ $ENABLE_FW =~ ^[Yy]$ ]]; then
                sudo ufw --force enable
                print_success "Firewall enabled"
            fi
        else
            print_success "Firewall rules added"
        fi
    fi
else
    print_info "UFW not installed. Install with: sudo apt install ufw"
fi

# ========================================
# Completion
# ========================================
print_header "Installation Complete!"

LOCAL_IP=$(hostname -I | awk '{print $1}')

cat << EOF
${GREEN}✓${NC} Ulu Calculator is now running in Docker!

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${YELLOW}📱 Access Points:${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

Local Network:
  ${GREEN}https://${LOCAL_IP}${NC}
  ${GREEN}https://localhost${NC}

From Other Devices on Network:
  ${GREEN}https://<raspberry-pi-hostname>.local${NC}

${YELLOW}⚠️  Browser Security Warning:${NC}
Self-signed certificates will show a warning.
Click "Advanced" → "Proceed" (safe for local use)

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${YELLOW}🔐 Default Credentials:${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

Email:    ${GREEN}admin@ulu-winery.co.il${NC}
Password: ${GREEN}Admin123!${NC}

${RED}⚠️  CHANGE PASSWORD IMMEDIATELY!${NC}

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${YELLOW}🐳 Docker Commands:${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

View Status:
  ${GREEN}docker-compose -f docker-compose.production.yml ps${NC}

View Logs:
  ${GREEN}docker-compose -f docker-compose.production.yml logs -f${NC}

Restart:
  ${GREEN}docker-compose -f docker-compose.production.yml restart${NC}

Stop:
  ${GREEN}docker-compose -f docker-compose.production.yml down${NC}

Start:
  ${GREEN}docker-compose -f docker-compose.production.yml up -d${NC}

Update:
  ${GREEN}docker-compose -f docker-compose.production.yml pull${NC}
  ${GREEN}docker-compose -f docker-compose.production.yml up -d --build${NC}

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${YELLOW}💾 Backup:${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

Manual Backup:
  ${GREEN}./backup-docker-ulu.sh${NC}

Auto Backup:
  ${GREEN}Daily at 2 AM (configured)${NC}

View Backups:
  ${GREEN}ls -lh ~/backups/ulu-calculator/${NC}

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${YELLOW}🔧 Troubleshooting:${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

Check container health:
  ${GREEN}docker ps${NC}

View app logs:
  ${GREEN}docker logs ulu-calculator${NC}

View nginx logs:
  ${GREEN}docker logs ulu-nginx${NC}

Enter container:
  ${GREEN}docker exec -it ulu-calculator sh${NC}

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${YELLOW}📚 Next Steps:${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

1. Access the application and change admin password
2. Configure your network (see below)
3. Test from another device on your network
4. (Optional) Set up external access

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${YELLOW}🌐 Network Configuration Options:${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

Option A: Local Network Only (Current Setup)
  - Free, secure, no configuration needed
  - Access from devices on same WiFi/network
  - No internet access

Option B: VPN Access (Recommended for External)
  - Install Tailscale: ${GREEN}curl -fsSL https://tailscale.com/install.sh | sh${NC}
  - Free, secure, encrypted
  - Access from anywhere

Option C: Public Internet (Advanced)
  - Requires domain + Cloudflare Tunnel OR port forwarding
  - See: ${GREEN}./setup-cloudflare-tunnel.sh${NC}

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

Made with ❤️ and 🍷 by Ulu Winery

EOF

exit 0
