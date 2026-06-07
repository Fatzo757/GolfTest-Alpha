#!/bin/bash

# Golf Card Game - VM Setup Script
# This script installs Node.js, PM2, and sets up your application on a Linux VM (Ubuntu/Debian).

set -e

echo "--- GOLF CARD GAME SYSTEM INITIALIZATION ---"

# 1. Update system
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Node.js (Version 22 - required for native TS type stripping)
echo "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Git
sudo apt-get install -y git

# 4. Install PM2 for process management
sudo npm install -g pm2

# 5. Application Setup
# Prompt for Repo URL if not provided
if [ -z "$1" ]; then
  echo "Error: Please provide your GitHub repository URL."
  echo "Usage: ./setup-vm.sh https://github.com/yourusername/golf-card-game.git"
  exit 1
fi

REPO_URL=$1
APP_DIR="golf-card-game"

if [ -d "$APP_DIR" ]; then
  echo "Directory $APP_DIR already exists. Updating..."
  cd "$APP_DIR"
  git pull
else
  echo "Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# 6. Install dependencies
echo "Installing dependencies..."
npm install

# 7. Environment Setup
if [ ! -f ".env" ]; then
  echo "Creating .env template..."
  echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
  echo "NODE_ENV=production" >> .env
  echo "PORT=3000" >> .env
  echo "GEMINI_API_KEY=your_gemini_key_here" >> .env
  echo "Wrote initial .env. PLEASE EDIT IT LATER."
fi

# 8. Build the frontend
echo "Building production assets..."
npm run build

# 9. Start with PM2
echo "Starting application with PM2..."
pm2 start server.ts --name golf-game --interpreter=node --node-args="--experimental-strip-types --enable-source-maps" || pm2 restart golf-game

# 10. Save PM2 list
pm2 save

echo "--- SETUP COMPLETE ---"
echo "Your app should be running at http://YOUR_VM_IP:3000"
echo "Note: Ensure port 3000 is open in your VM firewall/security groups."
