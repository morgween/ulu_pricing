#!/bin/bash

# ========================================
# Ulu Calculator - Cloudflare Tunnel Setup
# ========================================
# Sets up secure external access without port forwarding
# Run as: ./setup-cloudflare-tunnel.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_header() {
    echo ""
    echo "======================================"
    echo "$1"
    echo "======================================"
    echo ""
}

print_header "Cloudflare Tunnel Setup for Ulu Calculator"

# Check if running as non-root
if [ "$EUID" -eq 0 ]; then
    print_error "Do not run this script as root!"
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    CLOUDFLARED_PKG="cloudflared-linux-arm64.deb"
elif [ "$ARCH" = "armv7l" ]; then
    CLOUDFLARED_PKG="cloudflared-linux-arm.deb"
elif [ "$ARCH" = "x86_64" ]; then
    CLOUDFLARED_PKG="cloudflared-linux-amd64.deb"
else
    print_error "Unsupported architecture: $ARCH"
    exit 1
fi

print_header "Step 1: Install cloudflared"

# Download cloudflared
if ! command -v cloudflared &> /dev/null; then
    print_info "Downloading cloudflared..."
    wget -q "https://github.com/cloudflare/cloudflared/releases/latest/download/$CLOUDFLARED_PKG"
    sudo dpkg -i "$CLOUDFLARED_PKG"
    rm "$CLOUDFLARED_PKG"
    print_success "cloudflared installed"
else
    print_success "cloudflared already installed"
fi

print_header "Step 2: Authenticate with Cloudflare"

print_info "Opening browser for authentication..."
print_info "Please log in to your Cloudflare account"
cloudflared tunnel login

print_header "Step 3: Create Tunnel"

read -p "Enter your domain name (e.g., ulu-winery.com): " DOMAIN
read -p "Enter tunnel name (e.g., ulu-winery): " TUNNEL_NAME

# Create tunnel
print_info "Creating tunnel: $TUNNEL_NAME"
TUNNEL_OUTPUT=$(cloudflared tunnel create "$TUNNEL_NAME" 2>&1)
TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -oP 'Created tunnel.*with id \K[a-f0-9-]+' || echo "")

if [ -z "$TUNNEL_ID" ]; then
    # Try to get existing tunnel ID
    TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
    if [ -z "$TUNNEL_ID" ]; then
        print_error "Failed to create or find tunnel"
        exit 1
    fi
    print_info "Using existing tunnel: $TUNNEL_ID"
else
    print_success "Tunnel created: $TUNNEL_ID"
fi

print_header "Step 4: Configure Tunnel"

# Create config directory
sudo mkdir -p /etc/cloudflared

# Find credentials file
CRED_FILE=$(find ~/.cloudflared -name "${TUNNEL_ID}.json" 2>/dev/null | head -n 1)
if [ -z "$CRED_FILE" ]; then
    print_error "Credentials file not found"
    exit 1
fi

# Create config file
sudo tee /etc/cloudflared/config.yml > /dev/null <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}

ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:3000
  - hostname: www.${DOMAIN}
    service: http://localhost:3000
  - service: http_status:404
EOF

print_success "Configuration created"

print_header "Step 5: Route DNS"

print_info "Setting up DNS routes..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" || print_info "Route may already exist"
cloudflared tunnel route dns "$TUNNEL_NAME" "www.$DOMAIN" || print_info "Route may already exist"
print_success "DNS routes configured"

print_header "Step 6: Install as Service"

# Install service
sudo cloudflared service install
print_success "Service installed"

# Start and enable service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
print_success "Service started and enabled"

print_header "Step 7: Verify Installation"

sleep 5

if sudo systemctl is-active --quiet cloudflared; then
    print_success "Cloudflare tunnel is running!"
else
    print_error "Tunnel service is not running"
    print_info "Check logs with: sudo journalctl -u cloudflared -f"
    exit 1
fi

print_header "Setup Complete!"

cat << EOF
${GREEN}✓${NC} Your Ulu Calculator is now accessible from anywhere!

${YELLOW}Access Points:${NC}
- ${GREEN}https://${DOMAIN}${NC}
- ${GREEN}https://www.${DOMAIN}${NC}

${YELLOW}DNS Propagation:${NC}
DNS changes may take 5-15 minutes to propagate worldwide.
You can check status at: ${GREEN}https://dnschecker.org${NC}

${YELLOW}Test Locally First:${NC}
curl -I http://localhost:3000/api/health

${YELLOW}Useful Commands:${NC}
- Check tunnel status: ${GREEN}sudo systemctl status cloudflared${NC}
- View logs: ${GREEN}sudo journalctl -u cloudflared -f${NC}
- Restart tunnel: ${GREEN}sudo systemctl restart cloudflared${NC}
- List tunnels: ${GREEN}cloudflared tunnel list${NC}

${YELLOW}Security Reminder:${NC}
${RED}⚠️  Change default admin password immediately!${NC}
1. Visit https://${DOMAIN}
2. Login: admin@ulu-winery.co.il / Admin123!
3. Click profile → Change Password

${YELLOW}Next Steps:${NC}
1. Wait 5-15 minutes for DNS propagation
2. Test access from external network
3. Change admin password
4. Enable additional security (fail2ban, firewall)

${YELLOW}Documentation:${NC}
- Full guide: ${GREEN}docs/RASPBERRY-PI-DEPLOYMENT.md${NC}

EOF

exit 0
