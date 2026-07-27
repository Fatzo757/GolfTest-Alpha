#!/bin/bash

# Golf Card Game - VM Update Script
# This script pulls the latest code from GitHub and restarts the application.

set -e

APP_DIR="golf-card-game"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: Directory $APP_DIR not found. Did you run setup-vm.sh first?"
  exit 1
fi

echo "--- UPDATING GOLF CARD GAME ---"

cd "$APP_DIR"

# 1. Clean old zip archives to prevent disk space accumulation
echo "Cleaning old live update zip bundles..."
rm -f public/live-updates/*.zip 2>/dev/null || true
rm -rf dist 2>/dev/null || true

# 2. Pull latest changes
echo "Pulling latest code..."
git checkout -- public/live-updates/ public/version.json 2>/dev/null || true
git pull

# 3. Install any new dependencies
echo "Installing dependencies..."
npm install

# 4. Rebuild frontend and package Live Update bundle
echo "Building production assets & packaging Live Update bundle..."
npm run bundle:live-update

# 5. Restart with PM2
echo "Restarting application..."
pm2 restart golf-game || pm2 start server.ts --name golf-game --interpreter=node --node-args="--experimental-strip-types --enable-source-maps"
pm2 save

echo "--- UPDATE COMPLETE ---"
pm2 status
