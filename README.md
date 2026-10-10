# BlastMC Minecraft AFK Bot

Complete Node.js Mineflayer AFK bot configured for BlastMC (`blastmc.mangoohost.live:20987`).

## Features
- Auto-reconnect with backoff strategy (retries indefinitely).
- AuthMe support (`/login` and `/register`).
- Random movement and jumping routines to stay active.
- Integrated HTTP status endpoint (`/health`).
- Error-tolerant code structure.

## Deployment Instructions

### 1. GitHub Setup
Push all files to a public or private GitHub repository.

### 2. Render Deployment
1. Log in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub Repository.
4. Set the following options:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `MC_HOST` = `blastmc.mangoohost.live`
   - `MC_PORT` = `20987`
   - `MC_VERSION` = `1.21.11`
   - `BOT_USERNAME` = `YourBotName`
   - `AUTHME_PASSWORD` = `YourPassword`
   - `AUTHME_REGISTER_PASSWORD` = `YourPassword`
6. Click **Create Web Service**.

## Health Monitoring
Access `https://your-render-app.onrender.com/health` to see bot status.
