#!/bin/bash

# Golf Card Game - VM Update Script
# This script pulls the latest code from GitHub and restarts the application.

set -e

# Support running either from parent directory or directly inside the repository directory
APP_DIR="golf-card-game"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
elif [ ! -f "server.ts" ] && [ ! -f "package.json" ]; then
  echo "Error: Could not locate Golf Card Game directory. Did you run setup-vm.sh first?"
  exit 1
fi

echo "=== UPDATING GOLF CARD GAME ($(pwd)) ==="

# 1. Clean local build artifacts and temporary files
echo "[1/5] Cleaning old build & live update artifacts..."
rm -f public/live-updates/*.zip 2>/dev/null || true
rm -rf dist 2>/dev/null || true

# 2. Determine active branch and pull latest changes cleanly
echo "[2/5] Fetching latest code from remote repository..."

# Reset any local tracked modifications that might cause merge conflicts
git reset --hard HEAD || true
git clean -fd -e .env -e "golf.db*" -e "vapid.json" || true

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
echo "Active branch: $CURRENT_BRANCH"

# Fetch latest commits with a 30-second network timeout to avoid hanging
git fetch --prune origin "$CURRENT_BRANCH"

# Fast-forward / reset to origin to prevent opening interactive merge editors (like nano/vi)
git reset --hard "origin/$CURRENT_BRANCH"

# 3. Install any new dependencies
echo "[3/5] Installing dependencies..."
npm install

# 4. Rebuild frontend and package Live Update bundle
echo "[4/5] Building production assets & packaging Live Update bundle..."
npm run bundle:live-update

# 5. Restart process with PM2
echo "[5/5] Restarting application via PM2..."
pm2 restart golf-game || pm2 start server.ts --name golf-game --interpreter=node --node-args="--experimental-strip-types --enable-source-maps"
pm2 save

echo "=== UPDATE COMPLETE ==="
pm2 status
