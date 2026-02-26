#!/bin/bash
# ===========================================
# Newsroom AI - Hetzner CX22 VM Setup
# Run as root on fresh Ubuntu 22.04
# ===========================================
set -euo pipefail

echo "=== Newsroom AI VM Setup ==="

# 1. System updates
echo "[1/9] Updating system..."
apt-get update && apt-get upgrade -y

# 2. Install Docker (official repo)
echo "[2/9] Installing Docker..."
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Create deploy user
echo "[3/9] Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
fi

# 4. UFW Firewall
echo "[4/9] Configuring firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. SSH Hardening
echo "[5/9] Hardening SSH..."
sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# 6. Swap (2 GB)
echo "[6/9] Setting up 2GB swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl -p
fi

# 7. Timezone
echo "[7/9] Setting timezone..."
timedatectl set-timezone Europe/Warsaw

# 8. Unattended upgrades
echo "[8/9] Enabling unattended upgrades..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# 9. App directory
echo "[9/9] Creating app directory..."
mkdir -p /opt/newsroom/logs
chown -R deploy:deploy /opt/newsroom

echo ""
echo "=== Setup complete! ==="
echo "Next steps:"
echo "  1. SSH as deploy: ssh deploy@<VM_IP>"
echo "  2. Clone repo: git clone <REPO_URL> /opt/newsroom/app"
echo "  3. Copy .env.production.template → .env.production and fill in values"
echo "  4. Run: cd /opt/newsroom/app && scripts/deploy.sh"
