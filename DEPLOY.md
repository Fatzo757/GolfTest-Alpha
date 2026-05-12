# Deployment Guide: Golf Card Game (VM)

This guide explains how to deploy the **Golf Card Game** to a Linux Virtual Machine (e.g., AWS EC2, DigitalOcean Droplet, GCP Compute Engine).

## 1. Export to GitHub
The first step is to move your code from AI Studio to GitHub:
1. Open the **Settings** menu in AI Studio.
2. Select **Export to GitHub**.
3. Authenticate and create a new repository.

## 2. Prepare your VM
Access your VM via SSH:
```bash
ssh your-user@your-vm-ip
```

## 3. Run the Setup Script
The repository includes a `setup-vm.sh` script to automate the installation of Node.js 22+, Git, and PM2.

```bash
# Download the setup script from your repo (raw URL)
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/setup-vm.sh

# Make it executable
chmod +x setup-vm.sh

# Run it with your repository URL
./setup-vm.sh https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

## 4. Configuration
After the script runs, you need to configure your secrets:
1. Open the `.env` file: `nano ~/golf-card-game/.env`
2. Update the `GEMINI_API_KEY` (if using AI features).
3. Set your `JWT_SECRET` to a secure string.
4. Restart the app: `pm2 restart golf-game`

## 5. Network Requirements
Ensure your VM's firewall allows incoming traffic on the application port (default: 3000):
- **AWS:** Update Security Group Inbound Rules.
- **GCP:** Update VPC Firewall Rules.
- **Ubuntu (ufw):** `sudo ufw allow 3000/tcp`

## 6. Maintenance
- **View Logs:** `pm2 logs golf-game`
- **Restart App:** `pm2 restart golf-game`
- **Update Code:** 
  You can use the provided update script to pull changes and redeploy:
  ```bash
  cd ~/
  chmod +x ./golf-card-game/update-vm.sh
  ./golf-card-game/update-vm.sh
  ```
  
  Alternatively, run manually:
  ```bash
  cd ~/golf-card-game
  git pull
  npm run build
  pm2 restart golf-game
  ```

---
*Note: This application uses SQLite. For a VM deployment, the database file (`database.sqlite`) will be stored locally in the project folder. Ensure you backup this file if you need to migrate.*
