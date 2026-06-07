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

# 1. Pull latest changes
echo "Pulling latest code..."
git pull

# 2. Install any new dependencies
echo "Installing dependencies..."
npm install

# 3. Rebuild frontend
echo "Building production assets..."
npm run build

# 4. Restart with PM2
echo "Restarting application..."
pm2 restart golf-game || pm2 start server.ts --name golf-game --interpreter=node --node-args="--experimental-strip-types --enable-source-maps"
pm2 save

echo "--- UPDATE COMPLETE ---"
pm2 status
