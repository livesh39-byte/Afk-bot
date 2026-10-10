const express = require('express');
const mineflayer = require('mineflayer');

// Configuration from Environment Variables with Defaults
const MC_HOST = process.env.MC_HOST || 'blastmc.mangoohost.live';
const MC_PORT = parseInt(process.env.MC_PORT, 10) || 20987;
const MC_VERSION = process.env.MC_VERSION || '1.21.11';
const BOT_USERNAME = process.env.BOT_USERNAME || 'AFK_Bot_Blast';
const BASE_RETRY_MS = parseInt(process.env.RETRY_MS, 10) || 30000;
const AUTHME_PASSWORD = process.env.AUTHME_PASSWORD || null;
const AUTHME_REGISTER_PASSWORD = process.env.AUTHME_REGISTER_PASSWORD || null;
const PORT = process.env.PORT || 10000;

// Bot State Management
let bot = null;
let isConnected = false;
let isConnecting = false;
let reconnectAttempts = 0;
let lastError = null;
let reconnectTimer = null;
let moveInterval = null;
let jumpInterval = null;

// HTTP Health Check Server
const app = express();

app.get('/', (req, res) => {
  res.send('BlastMC AFK Bot Service is Running.');
});

app.get('/health', (req, res) => {
  res.json({
    status: isConnected ? 'online' : 'offline',
    connecting: isConnecting,
    reconnectAttempts: reconnectAttempts,
    host: MC_HOST,
    port: MC_PORT,
    version: MC_VERSION,
    botUsername: BOT_USERNAME,
    lastError: lastError ? lastError.message || String(lastError) : null,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP Server] Health check server listening on port ${PORT}`);
});

// AFK Movement Behavior
function startAfkActions() {
  stopAfkActions(); // Clear existing intervals if any

  console.log('[AFK] Starting movement and jump routines...');

  // Move randomly every 3 seconds
  moveInterval = setInterval(() => {
    if (!bot || !isConnected || !bot.entity) return;

    const controlStates = ['forward', 'back', 'left', 'right'];
    const selectedState = controlStates[Math.floor(Math.random() * controlStates.length)];

    // Reset all movement states first
    controlStates.forEach(state => bot.setControlState(state, false));

    // Enable chosen movement for 1 second
    bot.setControlState(selectedState, true);
    setTimeout(() => {
      if (bot && isConnected) {
        bot.setControlState(selectedState, false);
      }
    }, 1000);
  }, 3000);

  // Jump every 6 seconds
  jumpInterval = setInterval(() => {
    if (!bot || !isConnected || !bot.entity) return;

    bot.setControlState('jump', true);
    setTimeout(() => {
      if (bot && isConnected) {
        bot.setControlState('jump', false);
      }
    }, 500);
  }, 6000);
}

function stopAfkActions() {
  if (moveInterval) clearInterval(moveInterval);
  if (jumpInterval) clearInterval(jumpInterval);
  moveInterval = null;
  jumpInterval = null;
}

// Bot Creation and Reconnection Logic
function createBot() {
  if (isConnecting || isConnected) return;

  isConnecting = true;
  console.log(`[Bot] Connecting to ${MC_HOST}:${MC_PORT} as ${BOT_USERNAME}...`);

  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: BOT_USERNAME,
    version: MC_VERSION,
    auth: 'offline' // Offline mode authentication for cracked/custom servers
  });

  bot.once('spawn', () => {
    isConnecting = false;
    isConnected = true;
    reconnectAttempts = 0;
    lastError = null;
    console.log(`[Bot] Successfully spawned in server ${MC_HOST}:${MC_PORT}!`);

    startAfkActions();
  });

  // Handle AuthMe login/register prompts
  bot.on('messagestr', (message) => {
    console.log(`[Chat] ${message}`);

    const msgLower = message.toLowerCase();

    if (msgLower.includes('/login')) {
      if (AUTHME_PASSWORD) {
        console.log('[AuthMe] Login prompt detected. Sending /login command...');
        bot.chat(`/login ${AUTHME_PASSWORD}`);
      } else {
        console.warn('[AuthMe] Login prompt received but AUTHME_PASSWORD is not configured!');
      }
    } else if (msgLower.includes('/register')) {
      if (AUTHME_REGISTER_PASSWORD) {
        console.log('[AuthMe] Register prompt detected. Sending /register command...');
        bot.chat(`/register ${AUTHME_REGISTER_PASSWORD} ${AUTHME_REGISTER_PASSWORD}`);
      } else {
        console.warn('[AuthMe] Register prompt received but AUTHME_REGISTER_PASSWORD is not configured!');
      }
    }
  });

  bot.on('kicked', (reason) => {
    console.warn(`[Bot] Kicked from server: ${reason}`);
    lastError = `Kicked: ${reason}`;
  });

  bot.on('error', (err) => {
    console.error(`[Bot Error] ${err.message || err}`);
    lastError = err;
  });

  bot.on('end', (reason) => {
    console.log(`[Bot Disconnected] Connection closed. Reason: ${reason}`);
    isConnected = false;
    isConnecting = false;
    stopAfkActions();

    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);

  reconnectAttempts++;
  // Exponential backoff up to a maximum delay of 60 seconds (60000 ms)
  const delay = Math.min(BASE_RETRY_MS * Math.pow(1.2, reconnectAttempts - 1), 60000);

  console.log(`[Reconnect] Attempting reconnect #${reconnectAttempts} in ${Math.round(delay / 1000)} seconds...`);

  reconnectTimer = setTimeout(() => {
    createBot();
  }, delay);
}

// Global Exception Handler
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  lastError = err;
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
  lastError = reason;
});

// Initial startup
createBot();
  
