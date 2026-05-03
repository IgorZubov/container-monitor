#!/usr/bin/env bash
set -euo pipefail

# StackWatch Agent Installer
# Usage: curl -sSL https://install.stackwatch.dev | bash
# Or:    AGENT_TOKEN=xxx BACKEND_URL=https://... bash install.sh

BACKEND_URL="${BACKEND_URL:-https://dashboard.stackwatch.dev}"
AGENT_TOKEN="${AGENT_TOKEN:-}"
COMPOSE_FILE_URL="https://raw.githubusercontent.com/igorzubov/container-monitor/main/docker-compose.agent.yml"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.stackwatch}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${GREEN}[stackwatch]${NC} $*"; }
warn()    { echo -e "${YELLOW}[stackwatch]${NC} $*"; }
error()   { echo -e "${RED}[stackwatch]${NC} $*" >&2; exit 1; }

# Check dependencies
command -v docker  >/dev/null 2>&1 || error "Docker is not installed. See https://docs.docker.com/get-docker/"
command -v curl    >/dev/null 2>&1 || error "curl is not installed."

# Prompt for token if not set
if [ -z "$AGENT_TOKEN" ]; then
  echo ""
  warn "AGENT_TOKEN is not set."
  read -rp "Paste your agent token from the StackWatch dashboard: " AGENT_TOKEN
  [ -z "$AGENT_TOKEN" ] && error "Agent token is required."
fi

info "Installing StackWatch agent to $INSTALL_DIR ..."
mkdir -p "$INSTALL_DIR"

# Write .env
cat > "$INSTALL_DIR/.env" <<EOF
AGENT_TOKEN=${AGENT_TOKEN}
BACKEND_URL=${BACKEND_URL}
POLL_INTERVAL=30000
CONFIG_PATH=/etc/stackwatch/config.yml
EOF
chmod 600 "$INSTALL_DIR/.env"

# Download compose file
curl -fsSL "$COMPOSE_FILE_URL" -o "$INSTALL_DIR/docker-compose.yml"

# Create empty config.yml if not present
[ -f "$INSTALL_DIR/config.yml" ] || touch "$INSTALL_DIR/config.yml"

# Pull and start
info "Starting agent container ..."
docker compose -f "$INSTALL_DIR/docker-compose.yml" --env-file "$INSTALL_DIR/.env" up -d --pull always

info "Agent is running. View logs with:"
echo "  docker compose -f $INSTALL_DIR/docker-compose.yml logs -f"
echo ""
info "Done! Your services should appear in the dashboard within 30 seconds."
