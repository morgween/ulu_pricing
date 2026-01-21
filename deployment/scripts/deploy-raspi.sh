#!/bin/bash

# ========================================
# Ulu Calculator - Raspberry Pi Deployment Script
# ========================================
# This script automates the deployment process
# Run as: ./deploy-raspi.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ulu-calculator"
APP_DIR="$HOME/apps/$APP_NAME"
BACKUP_DIR="$HOME/backups/$APP_NAME"
NODE_VERSION="18"

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_header() {
    echo ""
    echo "======================================"
    echo "$1"
    echo "======================================"
    echo ""
}

check_user() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Do not run this script as root!"
        exit 1
    fi
    print_success "Running as non-root user: $USER"
}

check_requirements() {
    print_header "Checking Requirements"

    # Check if Node.js is installed
    if command -v node &> /dev/null; then
        NODE_VER=$(node --version)
        print_success "Node.js installed: $NODE_VER"
    else
        print_error "Node.js not installed. Please install Node.js $NODE_VERSION first."
        exit 1
    fi

    # Check if npm is installed
    if command -v npm &> /dev/null; then
        NPM_VER=$(npm --version)
        print_success "npm installed: $NPM_VER"
    else
        print_error "npm not installed. Please install npm first."
        exit 1
    fi

    # Check if PM2 is installed
    if command -v pm2 &> /dev/null; then
        print_success "PM2 installed"
    else
        print_info "PM2 not installed. Installing PM2..."
        npm install -g pm2
        print_success "PM2 installed successfully"
    fi

    # Check if git is installed
    if command -v git &> /dev/null; then
        print_success "Git installed"
    else
        print_error "Git not installed. Please install git first."
        exit 1
    fi
}

create_directories() {
    print_header "Creating Directories"

    mkdir -p "$APP_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$HOME/logs"
    mkdir -p "$HOME/scripts"

    print_success "Directories created"
}

backup_existing() {
    print_header "Backing Up Existing Installation"

    if [ -d "$APP_DIR/server/data" ]; then
        DATE=$(date +%Y%m%d_%H%M%S)

        if [ -f "$APP_DIR/server/data/users.sqlite" ]; then
            cp "$APP_DIR/server/data/users.sqlite" "$BACKUP_DIR/users_pre-deploy_$DATE.sqlite"
            print_success "Backed up database"
        fi

        if [ -f "$APP_DIR/server/data/config.json" ]; then
            cp "$APP_DIR/server/data/config.json" "$BACKUP_DIR/config_pre-deploy_$DATE.json"
            print_success "Backed up configuration"
        fi

        if [ -f "$APP_DIR/.env" ]; then
            cp "$APP_DIR/.env" "$BACKUP_DIR/env_pre-deploy_$DATE.txt"
            print_success "Backed up environment file"
        fi
    else
        print_info "No existing installation found, skipping backup"
    fi
}

deploy_application() {
    print_header "Deploying Application"

    # Check if repository exists
    if [ -d "$APP_DIR/.git" ]; then
        print_info "Updating existing repository..."
        cd "$APP_DIR"
        git pull origin main
        print_success "Repository updated"
    else
        print_info "No existing repository. Please clone manually or copy files."
        print_info "Example: git clone <repo-url> $APP_DIR"
        exit 1
    fi
}

install_dependencies() {
    print_header "Installing Dependencies"

    cd "$APP_DIR"

    # Remove node_modules if exists (for clean install)
    if [ -d "node_modules" ]; then
        print_info "Removing old node_modules..."
        rm -rf node_modules
    fi

    # Install production dependencies
    print_info "Installing production dependencies..."
    npm ci --production

    print_success "Dependencies installed"
}

configure_environment() {
    print_header "Configuring Environment"

    cd "$APP_DIR"

    if [ ! -f ".env" ]; then
        print_info "Creating .env file from template..."

        if [ -f ".env.example" ]; then
            cp .env.example .env

            # Generate session secret
            SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

            # Update .env file
            sed -i "s/your-super-secret-session-key-minimum-32-characters-long/$SESSION_SECRET/" .env
            sed -i "s/NODE_ENV=.*/NODE_ENV=production/" .env

            print_success ".env file created with random session secret"
            print_info "Please review and update .env file with your settings"

            # Open .env for editing
            read -p "Edit .env file now? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                nano .env
            fi
        else
            print_error ".env.example not found. Please create .env manually."
            exit 1
        fi
    else
        print_success ".env file already exists"
    fi
}

setup_pm2() {
    print_header "Setting Up PM2"

    cd "$APP_DIR"

    # Stop existing process if running
    if pm2 describe $APP_NAME &> /dev/null; then
        print_info "Stopping existing PM2 process..."
        pm2 stop $APP_NAME
    fi

    # Start application
    print_info "Starting application with PM2..."
    pm2 start ecosystem.config.js --env production

    # Save PM2 configuration
    pm2 save

    print_success "Application started with PM2"
}

setup_pm2_startup() {
    print_header "Configuring PM2 Startup"

    # Check if PM2 startup is already configured
    if pm2 startup | grep -q "already configured"; then
        print_success "PM2 startup already configured"
    else
        print_info "Configuring PM2 to start on boot..."
        pm2 startup
        print_info "Please run the command shown above with sudo"

        read -p "Press enter after running the startup command..."
        pm2 save
        print_success "PM2 startup configured"
    fi
}

create_backup_script() {
    print_header "Creating Backup Script"

    cat > "$HOME/scripts/backup-ulu.sh" << 'EOF'
#!/bin/bash

# Configuration
APP_DIR="$HOME/apps/ulu-calculator"
BACKUP_DIR="$HOME/backups/ulu-calculator"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database..."
cp "$APP_DIR/server/data/users.sqlite" "$BACKUP_DIR/users_$DATE.sqlite"

# Backup configuration
echo "Backing up configuration..."
cp "$APP_DIR/server/data/config.json" "$BACKUP_DIR/config_$DATE.json"
cp "$APP_DIR/server/data/quotas.json" "$BACKUP_DIR/quotas_$DATE.json"

# Backup .env
cp "$APP_DIR/.env" "$BACKUP_DIR/env_$DATE.txt"

# Delete old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.sqlite" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.txt" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
exit 0
EOF

    chmod +x "$HOME/scripts/backup-ulu.sh"
    print_success "Backup script created at $HOME/scripts/backup-ulu.sh"
}

setup_cron_jobs() {
    print_header "Setting Up Scheduled Tasks"

    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "backup-ulu.sh"; then
        print_success "Backup cron job already configured"
    else
        print_info "Adding backup cron job..."
        (crontab -l 2>/dev/null; echo "0 2 * * * $HOME/scripts/backup-ulu.sh >> $HOME/logs/backup.log 2>&1") | crontab -
        print_success "Backup scheduled for 2 AM daily"
    fi
}

verify_deployment() {
    print_header "Verifying Deployment"

    # Wait for application to start
    sleep 5

    # Check PM2 status
    if pm2 describe $APP_NAME | grep -q "online"; then
        print_success "Application is running"
    else
        print_error "Application is not running"
        pm2 logs $APP_NAME --lines 50
        exit 1
    fi

    # Check if application responds
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_success "Application is responding"
    else
        print_error "Application is not responding"
        exit 1
    fi

    # Display application info
    echo ""
    print_info "Application Status:"
    pm2 status $APP_NAME
}

print_next_steps() {
    print_header "Deployment Complete!"

    cat << EOF
${GREEN}✓${NC} Your Ulu Calculator is now deployed and running!

${YELLOW}Next Steps:${NC}

1. Configure SSL/HTTPS with Certbot:
   ${GREEN}sudo certbot --nginx -d your-domain.com${NC}

2. Access the application:
   ${GREEN}http://localhost:3000${NC}
   ${GREEN}https://your-domain.com${NC} (after SSL setup)

3. Login with default credentials:
   Email: ${GREEN}admin@ulu-winery.co.il${NC}
   Password: ${GREEN}Admin123!${NC}
   ${RED}⚠️  Change password immediately!${NC}

4. Configure firewall if not done:
   ${GREEN}sudo ufw allow 'Nginx Full'${NC}
   ${GREEN}sudo ufw enable${NC}

5. Monitor application:
   ${GREEN}pm2 monit${NC}
   ${GREEN}pm2 logs $APP_NAME${NC}

6. View backups:
   ${GREEN}ls -lh $BACKUP_DIR${NC}

${YELLOW}Useful Commands:${NC}
- Restart app: ${GREEN}pm2 restart $APP_NAME${NC}
- View logs: ${GREEN}pm2 logs $APP_NAME${NC}
- Monitor: ${GREEN}pm2 monit${NC}
- Backup now: ${GREEN}$HOME/scripts/backup-ulu.sh${NC}

${YELLOW}Documentation:${NC}
- Full guide: ${GREEN}docs/RASPBERRY-PI-DEPLOYMENT.md${NC}
- Deployment guide: ${GREEN}docs/DEPLOYMENT.md${NC}

EOF
}

# Main execution
main() {
    print_header "Ulu Calculator - Raspberry Pi Deployment"

    check_user
    check_requirements
    create_directories
    backup_existing
    deploy_application
    install_dependencies
    configure_environment
    setup_pm2
    setup_pm2_startup
    create_backup_script
    setup_cron_jobs
    verify_deployment
    print_next_steps
}

# Run main function
main

exit 0
