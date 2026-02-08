#!/bin/bash
set -e

# ============================================
# Deploy Script - Super Bowl Party App
# Usage: ./deploy.sh
# ============================================

# --- Configuration ---
VPS_USER="root"
VPS_HOST="159.89.185.76"       # <-- Replace with your VPS IP
APP_DIR="/root/BettingDashboard"
REPO="https://github.com/aaslocum/BettingDashboard.git"
BRANCH="main"

SSH_TARGET="${VPS_USER}@${VPS_HOST}"

echo ""
echo "========================================="
echo "  Deploying Super Bowl Party App"
echo "========================================="
echo "  Target: ${SSH_TARGET}:${APP_DIR}"
echo "  Branch: ${BRANCH}"
echo ""

# --- Step 1: Push local changes ---
echo "[1/5] Pushing to GitHub..."
git push origin "${BRANCH}" 2>/dev/null && echo "  ✓ Pushed" || echo "  ✓ Already up to date"

# --- Step 2: Sync .env from local ---
echo "[2/5] Syncing .env to VPS..."
LOCAL_ENV="$(cd "$(dirname "$0")" && pwd)/server/.env"
ssh "${SSH_TARGET}" "mkdir -p ${APP_DIR}/server"
if [ -f "$LOCAL_ENV" ]; then
  scp -q "$LOCAL_ENV" "${SSH_TARGET}:${APP_DIR}/server/.env"
  echo "  ✓ server/.env synced"
else
  echo "  ⚠ No local server/.env found — skipping"
fi

# --- Step 3: Pull, install, build on VPS ---
echo "[3/5] Pulling & building on VPS..."
ssh "${SSH_TARGET}" << 'REMOTE_SCRIPT'
set -e

APP_DIR="/root/BettingDashboard"
REPO="https://github.com/aaslocum/BettingDashboard.git"
BRANCH="main"

# Clone if first deploy, otherwise pull
if [ ! -d "$APP_DIR/.git" ]; then
  echo "  First deploy — cloning..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$BRANCH"
fi

# Ensure data directory exists (gitignored, never overwritten)
mkdir -p data/games

echo "  Installing dependencies..."
npm install 2>&1 | tail -1

echo "  Building client..."
npm run build 2>&1 | tail -3

echo "  Pruning dev dependencies..."
npm prune --omit=dev 2>&1 | tail -1

echo "  ✓ Build complete"
REMOTE_SCRIPT

# --- Step 4: Restart the app ---
echo "[4/5] Restarting app on VPS..."
ssh "${SSH_TARGET}" << 'REMOTE_SCRIPT'
set -e

APP_DIR="/root/BettingDashboard"
cd "$APP_DIR"

# Use PM2 if available, otherwise fall back to basic restart
if command -v pm2 &> /dev/null; then
  if pm2 describe superbowl &> /dev/null; then
    pm2 restart superbowl
    echo "  ✓ Restarted with PM2"
  else
    pm2 start server/index.js --name superbowl
    pm2 save
    echo "  ✓ Started with PM2 (first run)"
  fi
else
  # Kill existing process on port 3001 if running
  PID=$(lsof -ti :3001 2>/dev/null || true)
  if [ -n "$PID" ]; then
    kill "$PID" 2>/dev/null || true
    sleep 1
  fi
  nohup node server/index.js > /tmp/superbowl.log 2>&1 &
  echo "  ✓ Started (install PM2 for better process management: npm i -g pm2)"
fi
REMOTE_SCRIPT

# --- Step 5: Health check ---
echo "[5/5] Checking health..."
sleep 2
ssh "${SSH_TARGET}" "curl -sf http://localhost:3001/api/health > /dev/null && echo '  ✓ App is healthy' || echo '  ✗ Health check failed — check logs'"

echo ""
echo "========================================="
echo "  Deploy complete!"
echo "  http://${VPS_HOST}:3001"
echo "========================================="
echo ""
