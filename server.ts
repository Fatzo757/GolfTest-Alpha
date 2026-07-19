import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import db from "./src/db.ts";
import dotenv from "dotenv";
import webpush from "web-push";
import fs from "fs";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

dotenv.config();

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    initializeApp({
      credential: applicationDefault()
    });
    console.log("SERVER: Firebase Admin initialized successfully.");
  } catch (err) {
    console.error("SERVER: Firebase Admin initialization failed:", err);
  }
} else {
  console.log("SERVER: GOOGLE_APPLICATION_CREDENTIALS not set. Firebase Admin not initialized.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAPID_FILE = path.resolve(__dirname, 'vapid.json');
let vapidKeys: { publicKey: string, privateKey: string };

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  };
} else if (fs.existsSync(VAPID_FILE)) {
  vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys));
  console.log("SERVER: Generated new VAPID keys and saved to vapid.json");
}

webpush.setVapidDetails(
  'mailto:fatzo757@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key-123";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string };
    }
  }
}

async function startServer() {
  console.log("SERVER: Initializing server...");
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // 1. Listen immediately to open the port
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`SERVER: Listening on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error("SERVER: Listen error callback:", err);
    if (err.code === 'EADDRINUSE') {
      console.error(`SERVER: Port ${PORT} is already in use.`);
    }
  });

  // 2. Global request logger
  app.use((req, res, next) => {
    next();
  });

  app.use(express.json());

  // SEED ADMINS
  try {
    const admins = ['fatzo757@gmail.com', 'admin', 'system'];
    admins.forEach(username => {
      db.prepare("UPDATE users SET is_admin = 1 WHERE username = ?").run(username);
    });
    console.log("SERVER: Admin users seeded.");
  } catch (e) {
    console.error("SERVER: Failed to seed admins:", e);
  }
  
  // 3. Early API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT key, value FROM system_settings").all() as {key: string, value: string}[];
      const settingsMap = settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, string>);
      res.json(settingsMap);
    } catch (err) {
      res.status(500).json({ error: "Failed to load settings" });
    }
  });

  // DEBUG: verify DB schema
  try {
     console.log("SERVER: Verifying database schema...");
     const cols = db.pragma("table_info(users)") as any[];
     const colNames = cols.map(c => c.name);
     console.log("SERVER: users table columns:", colNames.join(", "));
     if (!colNames.includes("push_game_invites")) {
       db.prepare("ALTER TABLE users ADD COLUMN push_game_invites INTEGER DEFAULT 1").run();
     }
     if (!colNames.includes("push_turn_reminders")) {
       db.prepare("ALTER TABLE users ADD COLUMN push_turn_reminders INTEGER DEFAULT 1").run();
     }
  } catch (e) {
     console.error("SERVER: Failed to verify schema:", e);
  }

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };


  function getPoints(value: string) {
    if (value === 'J') return -2;
    if (value === 'K') return 0;
    if (value === 'Q') return 10;
    if (value === 'A') return 1;
    return parseInt(value) || 10;
  }

  function calculateHandScore(hand: any[]) {
    if (hand.length < 9) {
      return hand.reduce((total, c) => total + getPoints(c.value), 0);
    }
    
    const sortedHand = [...hand].sort((a, b) => a.card_index - b.card_index);
    const partOfSet = new Set<number>();

    // 0 1 2
    // 3 4 5
    // 6 7 8
    const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
    const cols = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];

    // Check rows for 3 of a kind
    rows.forEach(indices => {
      const v0 = sortedHand[indices[0]]?.value;
      const v1 = sortedHand[indices[1]]?.value;
      const v2 = sortedHand[indices[2]]?.value;
      if (v0 && v0 === v1 && v1 === v2) {
        indices.forEach(i => partOfSet.add(i));
      }
    });

    // Check columns for 3 of a kind
    cols.forEach(indices => {
      const v0 = sortedHand[indices[0]]?.value;
      const v1 = sortedHand[indices[1]]?.value;
      const v2 = sortedHand[indices[2]]?.value;
      if (v0 && v0 === v1 && v1 === v2) {
        indices.forEach(i => partOfSet.add(i));
      }
    });

    let total = 0;
    sortedHand.forEach((card, index) => {
      if (!partOfSet.has(index)) {
        total += getPoints(card.value);
      }
    });

    return total;
  }

  async function sendPushNotification(userId: string, title: string, body: string, url: string = '/', tag?: string) {
    if (!tag) {
       const match = url.match(/\/game\/([a-zA-Z0-9_-]+)/);
       if (match) tag = `game_${match[1]}`;
       else tag = 'golf_update';
    }
    
    try {
      // Check user preferences
      const userPrefs: any = db.prepare("SELECT push_game_invites, push_turn_reminders FROM users WHERE id = ?").get(userId);
      if (userPrefs) {
        if (tag.startsWith('game_') && !userPrefs.push_game_invites) return;
        if (tag.startsWith('your_turn_') && !userPrefs.push_turn_reminders) return;
      }

      const subscriptions = db.prepare("SELECT subscription FROM push_subscriptions WHERE user_id = ?").all(userId) as any[];
      
      for (const row of subscriptions) {
        try {
          const subscriptionPayload = JSON.parse(row.subscription);
          
          let platform = subscriptionPayload.platform;
          if (!platform) {
            // Infer platform if missing from old app versions
            if (subscriptionPayload.token && typeof subscriptionPayload.token === 'string') {
              platform = 'android';
            } else if (subscriptionPayload.endpoint) {
              platform = 'web';
            }
          }
          
          if (platform === 'android') {
             if (getApps().length > 0) {
               const messagePayload: any = {
                 token: subscriptionPayload.token,
                 notification: { title, body },
                 data: { url },
                 android: {
                   notification: {
                     title,
                     body,
                     channelId: 'fcm_default_channel',
                     icon: 'ic_stat_golf',
                     color: '#29366f',
                     tag: tag || 'golf_update',
                     sound: 'default',
                     notificationCount: 1
                   }
                 }
               };
               console.log(`SERVER: Sending FCM message to token: ${subscriptionPayload.token.substring(0, 10)}...`);
               const response = await getMessaging().send(messagePayload);
               console.log(`SERVER: FCM message sent successfully, response: ${response}`);
             } else {
               console.warn("SERVER: Cannot send Android push, Firebase Admin not initialized");
             }
          } else {
            const webSub = subscriptionPayload.platform === 'web' ? subscriptionPayload.details : subscriptionPayload;
            await webpush.sendNotification(webSub, JSON.stringify({
              title,
              body,
              url,
              icon: '/notification_icon.png',
              tag
            }));
          }
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 400 || (err.code && err.code.includes('messaging/registration-token-not-registered'))) {
            // Subscription expired, invalid, or VAPID key mismatch
            db.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?").run(userId, row.subscription);
          } else {
            console.error(`SERVER: Push error to user ${userId}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("SERVER: Failed to fetch subscriptions:", err);
    }
  }

  function setupNewRound(gameId: string, player1Id: string, player2Id: string | null, startingPlayerId?: string) {
    const deck = createDeck();
    shuffle(deck);

    const p1Hand = deck.splice(0, 9);
    const p2Hand = deck.splice(0, 9);
    const discard = [deck.pop()];

    const p2ActualId = player2Id || "cpu";
    let actualStarter = startingPlayerId;
    if (!actualStarter) {
      if (player2Id || p2ActualId === "cpu") {
        actualStarter = Math.random() < 0.5 ? player1Id : p2ActualId;
      } else {
        actualStarter = player1Id;
      }
    }

    db.transaction(() => {
      // Clear game cards for the new round, but keep moves for history
      db.prepare("DELETE FROM game_cards WHERE game_id = ?").run(gameId);
      
      // Record round start for replay (or just log)
      db.prepare("INSERT INTO moves (id, game_id, player_id, move_type, card_suit, card_value) VALUES (?, ?, ?, ?, ?, ?)")
        .run(nanoid(), gameId, 'system', 'round_start', null, null);

      const insertCard = db.prepare(`INSERT INTO game_cards (game_id, player_id, card_index, suit, value, is_face_up, id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      const logInitialCard = db.prepare(`INSERT INTO moves (id, game_id, player_id, move_type, card_affected_index, card_suit, card_value) VALUES (?, ?, ?, 'initial_card', ?, ?, ?)`);

      p1Hand.forEach((card, idx) => {
        insertCard.run(gameId, player1Id, idx, card.suit, card.value, 0, card.id); 
        logInitialCard.run(nanoid(), gameId, player1Id, idx, card.suit, card.value);
      });
      p2Hand.forEach((card, idx) => {
        insertCard.run(gameId, p2ActualId, idx, card.suit, card.value, 0, card.id); 
        logInitialCard.run(nanoid(), gameId, p2ActualId, idx, card.suit, card.value);
      });
      
      db.prepare("INSERT INTO moves (id, game_id, player_id, move_type, card_suit, card_value) VALUES (?, ?, ?, 'initial_discard', ?, ?)")
        .run(nanoid(), gameId, 'system', discard[0].suit, discard[0].value);

      db.prepare("UPDATE games SET deck_json = ?, discard_json = ?, drawn_card_json = NULL, status = 'initializing', current_turn_player_id = ?, first_revealer_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(JSON.stringify(deck), JSON.stringify(discard), actualStarter, gameId);
      
      if (p2ActualId === "cpu") {
        const cpuIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        shuffle(cpuIndices);
        const toReveal = cpuIndices.slice(0, 2);
        toReveal.forEach(idx => {
          db.prepare("UPDATE game_cards SET is_face_up = 1 WHERE game_id = ? AND player_id = 'cpu' AND card_index = ?").run(gameId, idx);
        });
      }
      
      // Notify the starting player
      if (actualStarter && actualStarter !== 'cpu') {
        sendPushNotification(actualStarter, "Your Turn!", "A new round of Golf has started. It's your turn!", `/game/${gameId}`, `your_turn_${gameId}`);
      }
    })();
  }

  // User Registration
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    try {
      const id = nanoid();
      const password_hash = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(id, username, password_hash);
      const token = jwt.sign({ id, username }, JWT_SECRET);
      res.json({ token, user: { id, username, is_admin: 0 } });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  });

  // User Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin } });
  });

  // Get Current User
  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const user: any = db.prepare("SELECT id, username, theme, ui_mode, card_style, card_back_style, card_back_color, card_back_secondary_color, avatar, mute_sounds, sound_volume, sound_profile, time_zone, time_format, show_date, show_move_date, is_admin, ui_scale, card_scale, push_game_invites, push_turn_reminders, scanlines_enabled, show_card_points FROM users WHERE id = ?").get(req.user.id);
    res.json({ user });
  });

  // Update Avatar
  app.post("/api/users/avatar", authenticate, (req: any, res) => {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: "Avatar required" });
    db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, req.user.id);
    res.json({ success: true });
  });

  app.post("/api/auth/change-password", authenticate, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Missing current password or invalid new password (min 6 chars)" });
    }

    const user: any = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "Invalid current password" });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, req.user.id);
    res.json({ success: true });
  });

  // Update Preferences
  app.post("/api/auth/preferences", authenticate, (req: any, res) => {
    const { theme, ui_mode, card_style, card_back_style, card_back_color, card_back_secondary_color, mute_sounds, sound_volume, sound_profile, time_zone, time_format, show_date, show_move_date, ui_scale, card_scale, push_game_invites, push_turn_reminders, scanlines_enabled, show_card_points } = req.body;
    db.prepare("UPDATE users SET theme = ?, ui_mode = ?, card_style = ?, card_back_style = ?, card_back_color = ?, card_back_secondary_color = ?, mute_sounds = ?, sound_volume = ?, sound_profile = ?, time_zone = ?, time_format = ?, show_date = ?, show_move_date = ?, ui_scale = ?, card_scale = ?, push_game_invites = ?, push_turn_reminders = ?, scanlines_enabled = ?, show_card_points = ? WHERE id = ?")
      .run(theme, ui_mode || 'retro', card_style, card_back_style || 'classic', card_back_color || 'ui-red', card_back_secondary_color || 'white', mute_sounds ? 1 : 0, sound_volume ?? 1.0, sound_profile || 'classic', time_zone, time_format, show_date ? 1 : 0, show_move_date ? 1 : 0, ui_scale ?? 1.0, card_scale ?? 1.0, push_game_invites === false ? 0 : 1, push_turn_reminders === false ? 0 : 1, scanlines_enabled === false || scanlines_enabled === 0 ? 0 : 1, show_card_points === false || show_card_points === 0 ? 0 : 1, req.user.id);
    res.json({ success: true });
  });

  // Get Online Users
  app.get("/api/users/online", authenticate, (req: any, res) => {
    const userId = req.user.id;
    // Users active in the last 5 minutes
    const users = db.prepare(`
      SELECT id, username, avatar, last_active_at 
      FROM users 
      WHERE id != ? AND last_active_at > datetime('now', '-5 minutes')
      ORDER BY last_active_at DESC
      LIMIT 10
    `).all(userId);
    res.json({ users });
  });

  // Search Users (including offline)
  app.get("/api/users/search", authenticate, (req: any, res) => {
    const userId = req.user.id;
    const { query } = req.query;
    if (!query || typeof query !== 'string') return res.json({ users: [] });

    const users = db.prepare(`
      SELECT id, username, avatar, last_active_at 
      FROM users 
      WHERE id != ? AND username LIKE ?
      ORDER BY last_active_at DESC
      LIMIT 20
    `).all(userId, `%${query}%`);
    res.json({ users });
  });

  // Get Active Games for user (resumable)
  app.get("/api/games/active", authenticate, (req: any, res) => {
    const userId = req.user.id;
    const games = db.prepare(`
      SELECT g.*, 
             u1.username as player1_name, u1.avatar as player1_avatar,
             u2.username as player2_name, u2.avatar as player2_avatar
      FROM games g
      LEFT JOIN users u1 ON g.player1_id = u1.id
      LEFT JOIN users u2 ON g.player2_id = u2.id
      WHERE (g.player1_id = ? OR g.player2_id = ?) AND g.status != 'finished'
      ORDER BY g.updated_at DESC
    `).all(userId, userId);
    res.json({ games });
  });

  // Delete/Abandon Game
  app.delete("/api/games/:id", authenticate, (req: any, res) => {
    const gameId = req.params.id;
    const userId = req.user.id;

    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

    // Only allow participants to delete the game
    if (game.player1_id !== userId && game.player2_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Clean up all related data
    db.transaction(() => {
      db.prepare("DELETE FROM game_cards WHERE game_id = ?").run(gameId);
      db.prepare("DELETE FROM moves WHERE game_id = ?").run(gameId);
      db.prepare("DELETE FROM messages WHERE game_id = ?").run(gameId);
      db.prepare("DELETE FROM games WHERE id = ?").run(gameId);
    })();

    res.json({ success: true });
  });

  // Get Joinable Games (public waiting rooms)
  app.get("/api/games/joinable", authenticate, (req: any, res) => {
    const userId = req.user.id;
    const games = db.prepare(`
      SELECT g.id, g.room_code, g.created_at,
             u1.username as host_name, u1.avatar as host_avatar
      FROM games g
      JOIN users u1 ON g.player1_id = u1.id
      WHERE g.status = 'waiting' AND g.player1_id != ?
      ORDER BY g.created_at DESC
      LIMIT 20
    `).all(userId);
    res.json({ games });
  });

  // Invite to Match
  app.post("/api/games/invite", authenticate, (req: any, res) => {
    const userId = req.user.id;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "Target user ID required" });

    try {
      const gameId = nanoid();
      const roomCode = nanoid(6).toUpperCase();
      
      db.prepare(`
        INSERT INTO games (id, room_code, player1_id, player2_id, is_vs_cpu, status, player1_total_score, player2_total_score)
        VALUES (?, ?, ?, ?, 0, 'initializing', 0, 0)
      `).run(gameId, roomCode, userId, targetUserId);

      setupNewRound(gameId, userId, targetUserId);
      
      // Notify target user
      sendPushNotification(targetUserId, "New Game Started", `${req.user.username} started a new game with you!`, `/game/${gameId}`, `your_turn_${gameId}`);

      res.json({ success: true, gameId });
    } catch (err) {
      console.error("Invite error:", err);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  // Get User Stats
  app.get("/api/users/stats", authenticate, (req: any, res) => {
    const userId = req.user.id;
    const games = db.prepare(`
      SELECT * FROM games 
      WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished'
    `).all(userId, userId);

    const wins = games.filter((g: any) => g.winner_player_id === userId).length;
    const losses = games.length - wins;
    const ratio = games.length > 0 ? ((wins / games.length) * 100).toFixed(0) : "0";

    res.json({ wins, losses, ratio, total: games.length });
  });

  // Get User History
  app.get("/api/games/history", authenticate, (req: any, res) => {
    const userId = req.user.id;
    const history = db.prepare(`
      SELECT g.*, 
             u1.username as player1_name, 
             u1.avatar as player1_avatar,
             u2.username as player2_name,
             u2.avatar as player2_avatar
      FROM games g
      LEFT JOIN users u1 ON g.player1_id = u1.id
      LEFT JOIN users u2 ON g.player2_id = u2.id
      WHERE (g.player1_id = ? OR g.player2_id = ?) AND g.status = 'finished' AND g.is_hidden_from_history = 0
      ORDER BY g.updated_at DESC
      LIMIT 100
    `).all(userId, userId);
    
    res.json({ history });
  });

  // Clear History (Archive)
  app.post("/api/games/history/clear", authenticate, (req: any, res) => {
    const userId = req.user.id;
    const { filter } = req.body; // 'all' or 'old'
    try {
      let query = `UPDATE games SET is_hidden_from_history = 1 WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished'`;
      const params: any[] = [userId, userId];
      
      if (filter === 'old') {
        query += ` AND updated_at < datetime('now', '-30 days')`;
      }

      db.prepare(query).run(...params);
      res.json({ success: true });
    } catch (err) {
      console.error("Clear history error:", err);
      res.status(500).json({ error: "Failed to clear history" });
    }
  });

  // Remind Opponent (Nudge)
  app.post("/api/games/:gameId/remind", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const userId = req.user.id;
    try {
      const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
      if (!game) return res.status(404).json({ error: "Game not found" });
      if (game.status !== 'playing' && game.status !== 'initializing') return res.status(400).json({ error: "Game is not active" });
      if (game.current_turn_player_id === userId) return res.status(400).json({ error: "It is your turn" });
      if (game.current_turn_player_id === 'cpu') return res.status(400).json({ error: "Cannot nudge CPU" });
      
      const playerName = req.user.username;

      sendPushNotification(
        game.current_turn_player_id, 
        "It's your turn!", 
        `${playerName} is waiting for you to make a move in Golf.`, 
        `/play/${gameId}`,
        `your_turn_${gameId}`
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error("Remind error:", err);
      res.status(500).json({ error: "Failed to remind opponent" });
    }
  });

  // Archive Single Match
  app.post("/api/games/:gameId/archive", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const userId = req.user.id;
    try {
      db.prepare(`
        UPDATE games SET is_hidden_from_history = 1 
        WHERE id = ? AND (player1_id = ? OR player2_id = ?)
      `).run(gameId, userId, userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to archive match" });
    }
  });

  // Reset Statistics (Actually Delete EVERYTHING)
  app.post("/api/users/stats/reset", authenticate, (req: any, res) => {
    const userId = req.user.id;
    console.log(`Hard reset requested for user: ${userId}`);
    try {
      const games = db.prepare(`
        SELECT id FROM games 
        WHERE (player1_id = ? OR player2_id = ?)
      `).all(userId, userId) as { id: string }[];
      
      const gameIds = games.map(g => g.id);
      
      if (gameIds.length > 0) {
        const deleteTransaction = db.transaction((ids: string[]) => {
          const CHUNK_SIZE = 500; // Smaller chunks for safety
          for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunk = ids.slice(i, i + CHUNK_SIZE);
            const placeholders = chunk.map(() => "?").join(",");
            
            db.prepare(`DELETE FROM moves WHERE game_id IN (${placeholders})`).run(...chunk);
            db.prepare(`DELETE FROM game_cards WHERE game_id IN (${placeholders})`).run(...chunk);
            db.prepare(`DELETE FROM messages WHERE game_id IN (${placeholders})`).run(...chunk);
            db.prepare(`DELETE FROM games WHERE id IN (${placeholders})`).run(...chunk);
          }
        });

        deleteTransaction(gameIds);
      }
      
      console.log(`Hard reset SUCCESS for user ${userId}. Records cleared for ${gameIds.length} games.`);
      res.json({ success: true, deletedCount: gameIds.length });
    } catch (err) {
      console.error("Hard reset FATAL error:", err);
      res.status(500).json({ error: "Failed to perform hard reset. Database error." });
    }
  });

  // Get Replay Data
  app.get("/api/games/:gameId/replay", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

    const moves = db.prepare("SELECT * FROM moves WHERE game_id = ? ORDER BY timestamp ASC").all(gameId);
    
    // Fetch player info
    const p1: any = db.prepare("SELECT username, avatar, card_style, card_back_style, card_back_color, card_back_secondary_color FROM users WHERE id = ?").get(game.player1_id);
    const p2: any = game.player2_id && game.player2_id !== 'cpu' 
      ? db.prepare("SELECT username, avatar, card_style, card_back_style, card_back_color, card_back_secondary_color FROM users WHERE id = ?").get(game.player2_id)
      : { username: game.player2_id === 'cpu' ? 'CPU' : 'Unknown', avatar: 'robot', card_style: 'classic', card_back_style: 'classic', card_back_color: 'ui-red', card_back_secondary_color: 'white' };

    res.json({ 
      game: {
        ...game,
        player1_name: p1?.username || 'Unknown',
        player1_avatar: p1?.avatar || 'user',
        player1_card_style: p1?.card_style || 'classic',
        player1_card_back_style: p1?.card_back_style || 'classic',
        player1_card_back_color: p1?.card_back_color || 'ui-red',
        player1_card_back_secondary_color: p1?.card_back_secondary_color || 'white',
        player2_name: p2?.username || (game.player2_id === 'cpu' ? 'CPU' : 'Unknown'),
        player2_avatar: p2?.avatar || (game.player2_id === 'cpu' ? 'robot' : 'user'),
        player2_card_style: p2?.card_style || 'classic',
        player2_card_back_style: p2?.card_back_style || 'classic',
        player2_card_back_color: p2?.card_back_color || 'ui-red',
        player2_card_back_secondary_color: p2?.card_back_secondary_color || 'white'
      }, 
      moves 
    });
  });

  // Heartbeat - keep online status alive
  app.post("/api/heartbeat", authenticate, (req: any, res) => {
    db.prepare("UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id);
    res.json({ success: true });
  });

  // --- Rate limiting for chat ---
  const lastMessageTime = new Map<string, number>();
  
  // Cleanup old timestamps every minute to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [key, time] of lastMessageTime.entries()) {
      if (now - time > 10000) {
        lastMessageTime.delete(key);
      }
    }
  }, 60000);

  // --- Push Notification Routes ---
  app.get("/api/push/public-key", authenticate, (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post("/api/push/subscribe", authenticate, (req: any, res) => {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: "Subscription required" });
    
    try {
      const subStr = JSON.stringify(subscription);
      console.log(`SERVER: Registering push subscription for user ${req.user.username}: ${subscription.platform}`);
      db.prepare("INSERT OR IGNORE INTO push_subscriptions (user_id, subscription) VALUES (?, ?)")
        .run(req.user.id, subStr);
      res.json({ success: true });
    } catch (err) {
      console.error("SERVER: Subscription error:", err);
      res.status(500).json({ error: "Failed to store subscription" });
    }
  });

  app.post("/api/push/unsubscribe", authenticate, (req: any, res) => {
    try {
      db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(req.user.id);
      res.json({ success: true });
    } catch (err) {
      console.error("SERVER: Unsubscribe error:", err);
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  app.post("/api/push/test", authenticate, async (req: any, res) => {
    try {
      await sendPushNotification(req.user.id, "Test Notification", "If you see this, push notifications are working!", "/");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // Get game messages
  app.get("/api/games/:gameId/messages", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const messages = db.prepare(`
      SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.game_id = ?
      ORDER BY m.created_at ASC
    `).all(gameId);
    res.json({ messages });
  });

  // Send game message
  app.post("/api/games/:gameId/messages", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });
    
    const userId = req.user.id;
    const now = Date.now();
    const lastTime = lastMessageTime.get(userId) || 0;
    if (now - lastTime < 2000) {
      return res.status(429).json({ error: "Calm down! 2 seconds between messages." });
    }
    lastMessageTime.set(userId, now);

    const messageId = nanoid();
    db.prepare("INSERT INTO messages (id, game_id, sender_id, content) VALUES (?, ?, ?, ?)")
      .run(messageId, gameId, userId, content);

    try {
      const game: any = db.prepare("SELECT player1_id, player2_id FROM games WHERE id = ?").get(gameId);
      if (game) {
        const opponentId = game.player1_id === userId ? game.player2_id : game.player1_id;
        if (opponentId && opponentId !== 'cpu') {
           sendPushNotification(opponentId, "New Message", `${req.user.username}: ${content}`, `/play/${gameId}`, `chat_${gameId}`);
        }
      }
    } catch (err) {
      console.error("SERVER: Failed to send chat notification:", err);
    }
    
    res.json({ success: true });
  });

  // Check online status of opponent
  app.get("/api/games/:gameId/online", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

    const opponentId = game.player1_id === req.user.id ? game.player2_id : game.player1_id;
    if (!opponentId || opponentId === 'cpu') return res.json({ online: true }); // CPU is always online

    const opponent: any = db.prepare("SELECT last_active_at FROM users WHERE id = ?").get(opponentId);
    if (!opponent) return res.json({ online: false });

    const lastActive = new Date(opponent.last_active_at + 'Z').getTime();
    const now = new Date().getTime();
    const isOnline = (now - lastActive) < 15000; // 15 seconds threshold

    res.json({ online: isOnline });
  });

  // Create Game
  app.post("/api/games/create", authenticate, (req: any, res) => {
    const { isVsCpu, difficulty } = req.body;
    const gameId = nanoid();
    const roomCode = nanoid(6).toUpperCase();
    const player1Id = req.user.id;
    const player2Id = isVsCpu ? "cpu" : null;
    const currentTurn = player1Id; // Round 1 always starts with player 1 for round-robin
    const status = isVsCpu ? "initializing" : "waiting";
    const cpuDifficulty = difficulty || 'normal';

    // Initialize Deck
    const deck = createDeck();
    shuffle(deck);

    // Initial hands (all face down now)
    const p1Hand = deck.splice(0, 9);
    const p2Hand = deck.splice(0, 9);
    const discard = [deck.pop()];

    try {
      db.transaction(() => {
        db.prepare(`
          INSERT INTO games (id, room_code, player1_id, player2_id, is_vs_cpu, current_turn_player_id, status, deck_json, discard_json, player1_total_score, player2_total_score, first_revealer_id, cpu_difficulty)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?)
        `).run(gameId, roomCode, player1Id, player2Id, isVsCpu ? 1 : 0, currentTurn, status, JSON.stringify(deck), JSON.stringify(discard), cpuDifficulty);

        // Insert hands
        const insertCard = db.prepare(`INSERT INTO game_cards (game_id, player_id, card_index, suit, value, is_face_up, id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const logInitialCard = db.prepare(`INSERT INTO moves (id, game_id, player_id, move_type, card_affected_index, card_suit, card_value) VALUES (?, ?, ?, 'initial_card', ?, ?, ?)`);

        p1Hand.forEach((card, idx) => {
          insertCard.run(gameId, player1Id, idx, card.suit, card.value, 0, card.id); // Face down
          logInitialCard.run(nanoid(), gameId, player1Id, idx, card.suit, card.value);
        });
        const p2TargetId = player2Id || "cpu";
        p2Hand.forEach((card, idx) => {
          insertCard.run(gameId, p2TargetId, idx, card.suit, card.value, 0, card.id); // Face down
          logInitialCard.run(nanoid(), gameId, p2TargetId, idx, card.suit, card.value);
        });

        // Log initial discard
        db.prepare("INSERT INTO moves (id, game_id, player_id, move_type, card_suit, card_value) VALUES (?, ?, ?, 'initial_discard', ?, ?)")
          .run(nanoid(), gameId, 'system', discard[0].suit, discard[0].value);

        if (isVsCpu) {
          // CPU reveals 2 cards immediately
          const cpuIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
          shuffle(cpuIndices);
          const toReveal = cpuIndices.slice(0, 2);
          toReveal.forEach(idx => {
            db.prepare("UPDATE game_cards SET is_face_up = 1 WHERE game_id = ? AND player_id = 'cpu' AND card_index = ?").run(gameId, idx);
          });
        }
      })();

      res.json({ gameId, roomCode });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Could not create game" });
    }
  });

  // Join Game
  app.post("/api/games/join/:roomCode", authenticate, (req: any, res) => {
    const { roomCode } = req.params;
    const game: any = db.prepare("SELECT * FROM games WHERE room_code = ? AND status = 'waiting'").get(roomCode.toUpperCase());
    if (!game) return res.status(404).json({ error: "Game not found or already full" });
    if (game.player1_id === req.user.id) return res.status(400).json({ error: "You are already in this game" });

    db.transaction(() => {
      const currentTurn = game.player1_id;
      db.prepare("UPDATE games SET player2_id = ?, status = 'initializing', current_turn_player_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, currentTurn, game.id);
      db.prepare("UPDATE game_cards SET player_id = ? WHERE game_id = ? AND player_id = 'cpu'").run(req.user.id, game.id);
      
      // Notify player1
      sendPushNotification(game.player1_id, "Opponent Joined!", `${req.user.username} joined your game. Select your 2 cards to start!`, `/game/${game.id}`);
    })();
    res.json({ gameId: game.id });
  });

  // Get Game State
  app.get("/api/games/:gameId", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

    const cards = db.prepare("SELECT * FROM game_cards WHERE game_id = ?").all(gameId);
    const moves = db.prepare("SELECT * FROM moves WHERE game_id = ? ORDER BY timestamp DESC LIMIT 500").all(gameId);

    // Fetch player info
    const p1: any = db.prepare("SELECT username, avatar FROM users WHERE id = ?").get(game.player1_id);
    const p2: any = game.player2_id && game.player2_id !== 'cpu' 
      ? db.prepare("SELECT username, avatar FROM users WHERE id = ?").get(game.player2_id)
      : { username: game.player2_id === 'cpu' ? 'CPU' : 'Waiting...', avatar: 'robot' };

    // Security: Filter cards and drawn card
    const obscuredCards = cards.map((c: any) => {
      // If card is not face up AND it doesn't belong to the system (like discard initial)
      // Wait, all game_cards belong to a player.
      if (!c.is_face_up) {
        return { ...c, suit: null, value: null };
      }
      return c;
    });

    let drawnCard = game.drawn_card_json ? JSON.parse(game.drawn_card_json) : null;
    if (drawnCard && game.current_turn_player_id !== req.user.id) {
      // Hide drawn card from opponent if it's not their turn
      // Note: If they draw from discard, it's public knowledge, but hiding it keeps the implementation simple and consistent.
      // In Golf, you usually know what they took from discard, but if they took from deck, it's secret.
      drawnCard = { suit: 'hidden', value: 'hidden' };
    }

    res.json({
      game: {
        ...game,
        deck_json: undefined,
        deck_count: JSON.parse(game.deck_json).length,
        discard: JSON.parse(game.discard_json),
        drawn_card: drawnCard,
        player1_name: p1?.username || 'Unknown',
        player1_avatar: p1?.avatar || 'user',
        player2_name: p2?.username || (game.player2_id === 'cpu' ? 'CPU' : 'Waiting...'),
        player2_avatar: p2?.avatar || (game.player2_id === 'cpu' ? 'robot' : 'user')
      },
      cards: obscuredCards,
      moves
    });
  });

  // Draw Action
  app.post("/api/games/:gameId/draw", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const { source } = req.body; // 'deck' or 'discard'
    
    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status === 'initializing') return res.status(400).json({ error: "Flip 2 cards first" });
    if (game.current_turn_player_id !== req.user.id) return res.status(400).json({ error: "Not your turn" });
    if (game.drawn_card_json) return res.status(400).json({ error: "Already holding a card" });

    const deck = JSON.parse(game.deck_json);
    const discard = JSON.parse(game.discard_json);
    let drawn;

    if (source === 'deck') {
      if (deck.length === 0) return res.status(400).json({ error: "Deck is empty" });
      drawn = deck.pop();
      drawn.source = 'deck';
    } else {
      if (discard.length === 0) return res.status(400).json({ error: "Discard is empty" });
      drawn = discard.pop();
      drawn.source = 'discard';
    }

    db.prepare("UPDATE games SET deck_json = ?, discard_json = ?, drawn_card_json = ? WHERE id = ?")
      .run(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(drawn), gameId);

    res.json({ drawn });
  });

  // Execute Move
  app.post("/api/games/:gameId/move", authenticate, (req: any, res) => {
    const { gameId } = req.params;
    const { moveType, cardIndex } = req.body; 
    
    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status === 'initializing') return res.status(400).json({ error: "Flip 2 cards first" });
    if (game.status === 'finished') return res.status(400).json({ error: "Game is over" });
    if (game.current_turn_player_id !== req.user.id) return res.status(400).json({ error: "Not your turn" });
    if (!game.drawn_card_json) return res.status(400).json({ error: "Draw a card first" });

    const deck = JSON.parse(game.deck_json);
    const discard = JSON.parse(game.discard_json);
    const cardToPlace = JSON.parse(game.drawn_card_json);

    try {
      db.transaction(() => {
        let existingCard: any = null;
        if (moveType === 'replace') {
          existingCard = db.prepare("SELECT * FROM game_cards WHERE game_id = ? AND player_id = ? AND card_index = ?").get(gameId, req.user.id, cardIndex);
          db.prepare("UPDATE game_cards SET suit = ?, value = ?, is_face_up = 1, id = ? WHERE game_id = ? AND player_id = ? AND card_index = ?")
            .run(cardToPlace.suit, cardToPlace.value, cardToPlace.id, gameId, req.user.id, cardIndex);
          
          discard.push({ id: existingCard.id, suit: existingCard.suit, value: existingCard.value });
          
          db.prepare("INSERT INTO moves (id, game_id, player_id, move_type, card_affected_index, card_suit, card_value, replaced_card_suit, replaced_card_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .run(nanoid(), gameId, req.user.id, moveType, cardIndex, cardToPlace.suit, cardToPlace.value, existingCard?.suit, existingCard?.value);

        } else if (moveType === 'discard_drawn') {
          discard.push({ id: cardToPlace.id, suit: cardToPlace.suit, value: cardToPlace.value });

          if (cardToPlace.source === 'discard') {
            // Cancel draw from discard
            db.prepare("UPDATE games SET discard_json = ?, drawn_card_json = NULL WHERE id = ?")
              .run(JSON.stringify(discard), gameId);
            return; // End transaction early, DO NOT advance turn!
          } else {
            db.prepare("INSERT INTO moves (id, game_id, player_id, move_type, card_affected_index, card_suit, card_value) VALUES (?, ?, ?, ?, ?, ?, ?)")
              .run(nanoid(), gameId, req.user.id, moveType, null, cardToPlace.suit, cardToPlace.value);
          }
        }

        const faceDownCount: any = db.prepare("SELECT COUNT(*) as count FROM game_cards WHERE game_id = ? AND player_id = ? AND is_face_up = 0").get(gameId, req.user.id);
        
        const nextPlayer = game.player1_id === req.user.id ? game.player2_id : game.player1_id;
        
        let status = game.status;
        let firstRevealerId = game.first_revealer_id;

        if (faceDownCount.count === 0 && game.status === 'playing') {
          status = 'last_turns';
          firstRevealerId = req.user.id;
        } else if (game.status === 'last_turns' && nextPlayer === firstRevealerId) {
          status = 'round_end';
        }

        // DECK COMPRESSION CHECK: If deck is empty and we advanced turn
        if (deck.length === 0 && status !== 'round_end' && status !== 'finished') {
           status = 'round_end';
        }

        if (status === 'round_end') {
          db.prepare("UPDATE game_cards SET is_face_up = 1 WHERE game_id = ?").run(gameId);
          const cards = db.prepare("SELECT * FROM game_cards WHERE game_id = ?").all(gameId);
          const snapshot = JSON.stringify(cards);
          db.prepare("INSERT INTO moves (id, game_id, player_id, move_type, round_number, snapshot_json) VALUES (?, ?, ?, 'round_end', ?, ?)").run(nanoid(), gameId, 'system', game.round_number, snapshot);
          
          const p1Cards = cards.filter((c: any) => c.player_id === game.player1_id);
          const p2Cards = cards.filter((c: any) => c.player_id === (game.player2_id || 'cpu'));
          
          const p1Round = calculateHandScore(p1Cards);
          const p2Round = calculateHandScore(p2Cards);

          const p1Total = game.player1_total_score + p1Round;
          const p2Total = game.player2_total_score + p2Round;

          if (p1Total >= 100 || p2Total >= 100) {
            status = 'finished';
            const winner = p1Total < p2Total ? game.player1_id : (game.player2_id || 'cpu');
            db.prepare("UPDATE games SET player1_total_score = ?, player2_total_score = ?, status = 'finished', winner_player_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
              .run(p1Total, p2Total, winner, gameId);
              
            if (winner !== 'cpu') {
              sendPushNotification(winner, "Grand Victory!", "You won the game of Golf!", `/game/${gameId}`);
              const loser = winner === game.player1_id ? game.player2_id : game.player1_id;
              if (loser && loser !== 'cpu') {
                sendPushNotification(loser, "Game Over", "Better luck next time!", `/game/${gameId}`);
              }
            }
          } else {
            db.prepare("UPDATE games SET player1_total_score = ?, player2_total_score = ?, status = 'round_end' WHERE id = ?").run(p1Total, p2Total, gameId);
          }
        } else {
          db.prepare("UPDATE games SET deck_json = ?, discard_json = ?, drawn_card_json = NULL, current_turn_player_id = ?, status = ?, first_revealer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(JSON.stringify(deck), JSON.stringify(discard), nextPlayer, status, firstRevealerId, gameId);
            
          if (nextPlayer && nextPlayer !== 'cpu') {
            sendPushNotification(nextPlayer, "Your Turn!", "It's your turn to move in Golf.", `/game/${gameId}`);
          }
        }

        if (nextPlayer === "cpu" && status !== "finished" && status !== "round_end") {
          setTimeout(() => executeCpuMove(gameId), 1000);
        }
      })();

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Move failed" });
    }
  });

  function createDeck() {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const deck = [];
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ id: nanoid(), suit, value });
      }
    }
    return deck;
  }

  function shuffle(deck: any[]) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  async function executeCpuMove(gameId: string) {
    try {
      const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game || game.status === 'finished' || game.status === 'round_end' || game.status === 'initializing') return;

    const deck = JSON.parse(game.deck_json);
    const discard = JSON.parse(game.discard_json);
    const topDiscard = discard[discard.length - 1];
    
    const cpuCards = db.prepare("SELECT * FROM game_cards WHERE game_id = ? AND player_id = 'cpu' ORDER BY card_index ASC").all(gameId);
    
    let cardToPlace;
    let indexToReplace = -1;
    let cpuSource: 'deck' | 'discard' = 'deck';

    const difficulty = game.cpu_difficulty || 'normal';

    if (difficulty === 'easy') {
      // Easy: 50% chance for discard, replaces random card
      if (Math.random() < 0.5 && discard.length > 0) {
        cardToPlace = discard.pop();
        cpuSource = 'discard';
      } else if (deck.length > 0) {
        cardToPlace = deck.pop();
        cpuSource = 'deck';
      } else {
        return; // No cards?
      }
      indexToReplace = Math.floor(Math.random() * 9);
    } else if (difficulty === 'normal') {
      const discardValue = getPoints(topDiscard.value);
      if (discardValue <= 3) {
        cardToPlace = discard.pop();
        cpuSource = 'discard';
      } else {
        cardToPlace = deck.pop();
        cpuSource = 'deck';
      }
      const faceDownIndex = (cpuCards as any[]).findIndex(c => !c.is_face_up);
      indexToReplace = faceDownIndex !== -1 ? faceDownIndex : Math.floor(Math.random() * 9);
    } else {
      // Hard: Strategic logic
      const cpuCardsArray = cpuCards as any[];
      const opponentCards = db.prepare("SELECT * FROM game_cards WHERE game_id = ? AND player_id = ?").all(gameId, game.player1_id) as any[];
      const opponentFaceDownCount = opponentCards.filter(c => !c.is_face_up).length;
      const isClosingIn = opponentFaceDownCount <= 2;

      const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
      const cols = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];

      function evaluateSlotValue(slotIndex: number, prospectiveValue: string) {
        const rowIndices = rows.find(r => r.includes(slotIndex))!;
        const colIndices = cols.find(c => c.includes(slotIndex))!;
        
        function getMatches(indices: number[]) {
          const others = indices.filter(idx => idx !== slotIndex);
          let m = 0;
          if (cpuCardsArray[others[0]].is_face_up && cpuCardsArray[others[0]].value === prospectiveValue) m++;
          if (cpuCardsArray[others[1]].is_face_up && cpuCardsArray[others[1]].value === prospectiveValue) m++;
          return m;
        }

        const rowMatches = getMatches(rowIndices);
        const colMatches = getMatches(colIndices);
        const bestMatches = Math.max(rowMatches, colMatches);
        
        if (bestMatches === 2) return -20; // Extremely good
        if (bestMatches === 1) return -5;  // Very good
        
        return getPoints(prospectiveValue);
      }

      // 1. Drawing Phase
      const topDiscardValue = topDiscard.value;
      const discardProspectiveUtility = Math.min(...rows.map(row => {
        return Math.min(...row.map(slotIdx => evaluateSlotValue(slotIdx, topDiscardValue)));
      }));

      // Decide if we take discard
      // Utility < 3 is usually a good bet (J, K, A, 2, 3 or a match)
      if (discardProspectiveUtility <= 3 || (isClosingIn && discardProspectiveUtility <= 5)) {
        cardToPlace = discard.pop();
        cpuSource = 'discard';
      } else {
        cardToPlace = deck.pop();
        cpuSource = 'deck';
      }

      const drawnValue = getPoints(cardToPlace.value);

      // 2. Placement Phase
      // Evaluate all 9 slots and find the one where replacing gives the best improvement
      let bestImprovement = -999;
      
      for (let i = 0; i < 9; i++) {
        const currentCard = cpuCardsArray[i];
        const currentVal = currentCard.is_face_up ? getPoints(currentCard.value) : 8; // Assume hidden cards are average (8 is weighted high to encourage revealing)
        const currentUtility = evaluateSlotValue(i, currentCard.is_face_up ? currentCard.value : '10'); // Placeholder '10' for hidden
        
        const prospectiveUtility = evaluateSlotValue(i, cardToPlace.value);
        const improvement = currentUtility - prospectiveUtility;

        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          indexToReplace = i;
        }
      }

      // Fallback
      if (indexToReplace === -1) indexToReplace = (cpuCardsArray as any[]).findIndex(c => !c.is_face_up) || 0;
    }

    db.transaction(() => {
      const existingCard: any = db.prepare("SELECT * FROM game_cards WHERE game_id = ? AND player_id = 'cpu' AND card_index = ?").get(gameId, indexToReplace);
      db.prepare("UPDATE game_cards SET suit = ?, value = ?, is_face_up = 1, id = ? WHERE game_id = ? AND player_id = 'cpu' AND card_index = ?")
        .run(cardToPlace.suit, cardToPlace.value, cardToPlace.id, gameId, indexToReplace);
      discard.push({ id: existingCard.id, suit: existingCard.suit, value: existingCard.value });

      const nextPlayer = game.player1_id;
      const faceDownCount: any = db.prepare("SELECT COUNT(*) as count FROM game_cards WHERE game_id = ? AND player_id = 'cpu' AND is_face_up = 0").get(gameId);
      
      let status = game.status;
      let firstRevealerId = game.first_revealer_id;

      if (faceDownCount.count === 0 && game.status === 'playing') {
        status = 'last_turns';
        firstRevealerId = 'cpu';
      } else if (game.status === 'last_turns' && nextPlayer === firstRevealerId) {
        status = 'round_end';
      }

      if (deck.length === 0 && status !== 'round_end' && status !== 'finished') {
        status = 'round_end';
      }

      if (status === 'round_end') {
        db.prepare("UPDATE game_cards SET is_face_up = 1 WHERE game_id = ?").run(gameId);
        const cards = db.prepare("SELECT * FROM game_cards WHERE game_id = ?").all(gameId);
        const snapshot = JSON.stringify(cards);
        db.prepare("INSERT INTO moves (id, game_id, player_id, move_type, round_number, snapshot_json) VALUES (?, ?, ?, 'round_end', ?, ?)").run(nanoid(), gameId, 'system', game.round_number, snapshot);
        
        const p1Cards = cards.filter((c: any) => c.player_id === game.player1_id);
        const p2Cards = cards.filter((c: any) => c.player_id === (game.player2_id || 'cpu'));
        
        const p1Round = calculateHandScore(p1Cards);
        const p2Round = calculateHandScore(p2Cards);

        const p1Total = game.player1_total_score + p1Round;
        const p2Total = game.player2_total_score + p2Round;

        if (p1Total >= 100 || p2Total >= 100) {
          status = 'finished';
          const winner = p1Total < p2Total ? game.player1_id : (game.player2_id || 'cpu');
          db.prepare("UPDATE games SET player1_total_score = ?, player2_total_score = ?, status = 'finished', winner_player_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(p1Total, p2Total, winner, gameId);
        } else {
          db.prepare("UPDATE games SET player1_total_score = ?, player2_total_score = ?, status = 'round_end' WHERE id = ?").run(p1Total, p2Total, gameId);
        }
      } else {
        db.prepare("UPDATE games SET deck_json = ?, discard_json = ?, drawn_card_json = NULL, current_turn_player_id = ?, status = ?, first_revealer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(JSON.stringify(deck), JSON.stringify(discard), nextPlayer, status, firstRevealerId, gameId);
      }
      
       db.prepare("INSERT INTO moves (id, game_id, player_id, move_type, card_affected_index, card_suit, card_value, replaced_card_suit, replaced_card_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .run(nanoid(), gameId, 'cpu', `cpu_replace_${cpuSource}`, indexToReplace, cardToPlace.suit, cardToPlace.value, existingCard?.suit, existingCard?.value);
    })();
    } catch (err) {
      console.error("CPU Move error:", err);
    }
  }

  app.post("/api/games/:id/reveal", authenticate, (req: any, res) => {
    const gameId = req.params.id;
    const { cardIndex } = req.body;
    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status !== 'initializing' && game.status !== 'waiting') return res.status(400).json({ error: "Not in a status that allows revealing cards" });

    const card: any = db.prepare("SELECT * FROM game_cards WHERE game_id = ? AND player_id = ? AND card_index = ?").get(gameId, req.user.id, cardIndex);
    if (!card) return res.status(404).json({ error: "Card not found" });
    if (card.is_face_up) return res.status(400).json({ error: "Card already face up" });

    // Limit to 2 cards during initialization
    if (game.status === 'initializing') {
      const currentFaceUp: any = db.prepare("SELECT COUNT(*) as count FROM game_cards WHERE game_id = ? AND player_id = ? AND is_face_up = 1").get(gameId, req.user.id);
      if (currentFaceUp.count >= 2) {
        return res.status(400).json({ error: "You can only reveal 2 cards to start." });
      }
    }

    db.prepare("UPDATE game_cards SET is_face_up = 1 WHERE game_id = ? AND player_id = ? AND card_index = ?").run(gameId, req.user.id, cardIndex);

    // Check if player has 2 cards face up
    const faceUpCount: any = db.prepare("SELECT COUNT(*) as count FROM game_cards WHERE game_id = ? AND player_id = ? AND is_face_up = 1").get(gameId, req.user.id);
    
    if (faceUpCount.count > 2) {
      // This shouldn't happen if we strictly allow only 2, but let's be safe.
      // Already handled by the check below which would prevent the reveal if it's already 2.
    }

    if (faceUpCount.count >= 2 && game.status === 'initializing') {
       // If this player just reached 2 cards, check if we can start the game
      if (game.is_vs_cpu) {
         db.prepare("UPDATE games SET status = 'playing' WHERE id = ?").run(gameId);
         // If it's already CPU's turn, trigger it
         if (game.current_turn_player_id === 'cpu') {
           setTimeout(() => executeCpuMove(gameId), 1000);
         }
      } else {
         // check if both players have 2+ cards face up
         const opponentId = game.player1_id === req.user.id ? game.player2_id : game.player1_id;
         const opponentCount: any = db.prepare("SELECT COUNT(*) as count FROM game_cards WHERE game_id = ? AND player_id = ? AND is_face_up = 1").get(gameId, opponentId);
         if (opponentCount.count >= 2) {
           db.prepare("UPDATE games SET status = 'playing' WHERE id = ?").run(gameId);
           const currentTurnPlayer = game.current_turn_player_id;
           if (currentTurnPlayer && currentTurnPlayer !== 'cpu') {
             sendPushNotification(currentTurnPlayer, "Game Started!", "Both players are ready. It's time to play Golf!", `/game/${gameId}`);
           }
         }
      }
    }

    res.json({ success: true });
  });

  app.post("/api/games/:id/next-round", authenticate, (req: any, res) => {
    const gameId = req.params.id;
    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status !== 'round_end') return res.status(400).json({ error: "Not in round_end status" });

    // Increment round number
    db.prepare("UPDATE games SET round_number = round_number + 1 WHERE id = ?").run(gameId);
    const updatedGame: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);

    // Determine who starts next (round robin) using round_number
    let nextStarter = game.player1_id;
    const p2Id = game.player2_id || 'cpu';

    // If round count is even, player2 starts, if odd, player1 starts
    if (updatedGame.round_number % 2 === 0) {
      nextStarter = p2Id;
    } else {
      nextStarter = game.player1_id;
    }

    setupNewRound(gameId, game.player1_id, game.player2_id, nextStarter);
    res.json({ success: true });
  });

  app.post("/api/games/:id/rematch", authenticate, (req: any, res) => {
    const gameId = req.params.id;
    const game: any = db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status !== 'finished') return res.status(400).json({ error: "Game is not finished" });

    // If a rematch was already created, just return it
    if (game.next_game_id) {
      return res.json({ gameId: game.next_game_id });
    }

    // Otherwise, create a new game with the same players
    const newGameId = nanoid();
    const roomCode = nanoid(6).toUpperCase();
    const player1Id = req.user.id;
    // The opponent is whoever the OTHER player is
    const player2Id = game.player1_id === req.user.id ? game.player2_id : game.player1_id;
    const isVsCpu = game.is_vs_cpu;
    const cpuDifficulty = game.cpu_difficulty || 'normal';

    try {
      db.transaction(() => {
        db.prepare(`
          INSERT INTO games (id, room_code, player1_id, player2_id, is_vs_cpu, status, player1_total_score, player2_total_score, cpu_difficulty)
          VALUES (?, ?, ?, ?, ?, 'initializing', 0, 0, ?)
        `).run(newGameId, roomCode, player1Id, player2Id, isVsCpu ? 1 : 0, cpuDifficulty);

        // Update old game with next_game_id
        db.prepare("UPDATE games SET next_game_id = ? WHERE id = ?").run(newGameId, gameId);
      })();

      // Setup new round after creating the game
      setupNewRound(newGameId, player1Id, player2Id, player1Id);

      // send push notification to opponent
      if (player2Id && player2Id !== 'cpu') {
        sendPushNotification(player2Id, "Rematch Started!", `${req.user.username} wants a rematch!`, `/game/${newGameId}`);
      }
      res.json({ gameId: newGameId });
    } catch (err) {
      console.error("Rematch error:", err);
      res.status(500).json({ error: "Failed to create rematch" });
    }
  });

  // --- Admin Middleware ---
  const isAdmin = (req: any, res: any, next: any) => {
    try {
      const user: any = db.prepare("SELECT is_admin, username FROM users WHERE id = ?").get(req.user.id);
      
      // Hardcoded super admins boostrap check
      const superAdmins = ["fatzo757@gmail.com", "admin", "system"];
      
      if (user && (user.is_admin === 1 || superAdmins.includes(user.username))) {
        next();
      } else {
        res.status(403).json({ error: "Access denied. Admin only." });
      }
    } catch (err) {
      res.status(500).json({ error: "Server error during auth check" });
    }
  };

  // Sync hardcoded admins on startup
  const bootstrapAdmins = ["fatzo757@gmail.com", "admin", "system"];
  bootstrapAdmins.forEach(name => {
    db.prepare("UPDATE users SET is_admin = 1 WHERE username = ?").run(name);
  });

  // --- Admin Routes ---
  app.get("/api/admin/summary", authenticate, isAdmin, (req, res) => {
    try {
      const users = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
      const games = (db.prepare("SELECT COUNT(*) as c FROM games").get() as any).c;
      const activeGames = (db.prepare("SELECT COUNT(*) as c FROM games WHERE status = 'active'").get() as any).c;
      const messages = (db.prepare("SELECT COUNT(*) as c FROM messages").get() as any).c;
      
      res.json({
        users,
        games,
        activeGames,
        messages,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Admin summary error:", err);
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  app.put("/api/admin/settings", authenticate, isAdmin, (req, res) => {
    const { key, value } = req.body;
    if (!key || typeof value !== 'string') {
      return res.status(400).json({ error: "Invalid key or value" });
    }
    try {
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP) 
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(key, value);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/push-check", authenticate, isAdmin, (req, res) => {
    try {
      const subs = db.prepare("SELECT user_id, subscription FROM push_subscriptions").all() as any[];
      const stats = subs.reduce((acc: any, s: any) => {
        const p = JSON.parse(s.subscription).platform || 'unknown';
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      }, {});
      res.json({
        firebaseInitialized: getApps().length > 0,
        credentialEnvSet: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        subscriptionsCount: subs.length,
        platformStats: stats
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/users", authenticate, isAdmin, (req, res) => {
    const users = db.prepare("SELECT id, username, avatar, last_active_at, created_at, is_admin FROM users ORDER BY created_at DESC").all();
    res.json({ users });
  });
  
  app.post("/api/admin/users/:userId/reset-password", authenticate, isAdmin, (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Valid password required (min 6 chars)" });
    
    const password_hash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(password_hash, userId);
    res.json({ success: true });
  });

  app.post("/api/admin/users/:userId/toggle-admin", authenticate, isAdmin, (req: any, res) => {
    const { userId } = req.params;
    if (userId === req.user.id) return res.status(400).json({ error: "Cannot toggle yourself" });
    
    const user: any = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const newState = user.is_admin === 1 ? 0 : 1;
    db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(newState, userId);
    res.json({ success: true, is_admin: newState });
  });

  app.delete("/api/admin/users/:userId", authenticate, isAdmin, (req: any, res) => {
    const { userId } = req.params;
    if (userId === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    
    db.transaction(() => {
      // Execute deletions directly in SQLite using subqueries instead of N+1 loops
      db.prepare("DELETE FROM game_cards WHERE game_id IN (SELECT id FROM games WHERE player1_id = ? OR player2_id = ?)").run(userId, userId);
      db.prepare("DELETE FROM moves WHERE game_id IN (SELECT id FROM games WHERE player1_id = ? OR player2_id = ?)").run(userId, userId);
      db.prepare("DELETE FROM messages WHERE game_id IN (SELECT id FROM games WHERE player1_id = ? OR player2_id = ?)").run(userId, userId);
      db.prepare("DELETE FROM games WHERE player1_id = ? OR player2_id = ?").run(userId, userId);
      
      db.prepare("DELETE FROM messages WHERE sender_id = ?").run(userId);
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    })();
    
    res.json({ success: true });
  });

  app.get("/api/admin/games", authenticate, isAdmin, (req, res) => {
    const games = db.prepare(`
      SELECT g.*, 
             u1.username as player1_name, 
             u2.username as player2_name
      FROM games g
      LEFT JOIN users u1 ON g.player1_id = u1.id
      LEFT JOIN users u2 ON g.player2_id = u2.id
      ORDER BY g.updated_at DESC
      LIMIT 100
    `).all();
    res.json({ games });
  });

  app.delete("/api/admin/games/:gameId", authenticate, isAdmin, (req, res) => {
    const { gameId } = req.params;
    db.transaction(() => {
      db.prepare("DELETE FROM game_cards WHERE game_id = ?").run(gameId);
      db.prepare("DELETE FROM moves WHERE game_id = ?").run(gameId);
      db.prepare("DELETE FROM messages WHERE game_id = ?").run(gameId);
      db.prepare("DELETE FROM games WHERE id = ?").run(gameId);
    })();
    res.json({ success: true });
  });

  app.post("/api/admin/kick/:userId", authenticate, isAdmin, (req, res) => {
    const { userId } = req.params;
    // Effectively log them out by setting last active to long ago
    db.prepare("UPDATE users SET last_active_at = datetime('now', '-1 day') WHERE id = ?").run(userId);
    res.json({ success: true });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    console.log("SERVER: Starting Vite in middleware mode...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("SERVER: Vite middleware attached.");
    } catch (e) {
      console.error("SERVER: Failed to start Vite server:", e);
    }
  } else {
    console.log("SERVER: Running in production mode.");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

}

console.log("SERVER: Calling startServer()...");
startServer().catch(err => {
  console.error("SERVER: Fatal error during startServer():", err);
});
