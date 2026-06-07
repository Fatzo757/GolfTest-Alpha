import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.USE_MEMORY_DB === 'true' ? ':memory:' : (process.env.DB_PATH || path.resolve(__dirname, '../golf.db'));
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

try {
  db.exec("ALTER TABLE games ADD COLUMN round_number INTEGER DEFAULT 1");
} catch (e) {
  // Column might already exist
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    theme TEXT DEFAULT 'default',
    card_style TEXT DEFAULT 'classic',
    avatar TEXT DEFAULT 'user',
    mute_sounds INTEGER DEFAULT 0,
    sound_volume REAL DEFAULT 1.0,
    time_zone TEXT DEFAULT 'UTC',
    time_format TEXT DEFAULT '12h',
    show_date INTEGER DEFAULT 1,
    show_move_date INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    user_id TEXT,
    subscription TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, subscription)
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    room_code TEXT UNIQUE,
    player1_id TEXT,
    player2_id TEXT,
    is_vs_cpu BOOLEAN DEFAULT 0,
    current_turn_player_id TEXT,
    status TEXT DEFAULT 'waiting', -- waiting, active, finished
    deck_json TEXT,
    discard_json TEXT,
    drawn_card_json TEXT, -- Added for mid-turn persistence
    player1_total_score INTEGER DEFAULT 0,
    player2_total_score INTEGER DEFAULT 0,
    first_revealer_id TEXT,
    cpu_difficulty TEXT DEFAULT 'normal',
    winner_player_id TEXT,
    is_hidden_from_history BOOLEAN DEFAULT 0,
    round_number INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    sender_id TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(game_id) REFERENCES games(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS game_cards (
    game_id TEXT,
    player_id TEXT, -- Can be 'cpu'
    card_index INTEGER, -- 0-8 for 3x3 grid
    suit TEXT,
    value TEXT,
    is_face_up BOOLEAN DEFAULT 0,
    id TEXT,
    PRIMARY KEY(game_id, player_id, card_index)
  );

  CREATE TABLE IF NOT EXISTS moves (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    player_id TEXT,
    move_type TEXT, -- draw_deck, draw_discard, replace_card, discard_drawn
    card_affected_index INTEGER,
    card_suit TEXT,
    card_value TEXT,
    replaced_card_suit TEXT,
    replaced_card_value TEXT,
    round_number INTEGER DEFAULT 1,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TRIGGER IF NOT EXISTS trigger_assign_move_round
  AFTER INSERT ON moves
  FOR EACH ROW
  BEGIN
    UPDATE moves
    SET round_number = (SELECT round_number FROM games WHERE id = NEW.game_id)
    WHERE id = NEW.id;
  END;


  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  INSERT OR IGNORE INTO system_settings (key, value) VALUES ('app_version', 'V0.1-Alpha');
`);

// Simple migration: check if columns exist in existing tables
try {
  const addColumn = (table: string, column: string, type: string) => {
    try {
      const cols = db.pragma(`table_info(${table})`) as any[];
      if (!cols.some(c => c.name === column)) {
        console.log(`Migrating: Adding ${column} to ${table}`);
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
    } catch (err) {
      console.warn(`Could not add ${column} to ${table}:`, err);
    }
  };

  addColumn('users', 'last_active_at', 'DATETIME');
  addColumn('users', 'theme', "TEXT DEFAULT 'default'");
  addColumn('users', 'card_style', "TEXT DEFAULT 'classic'");
  addColumn('users', 'avatar', "TEXT DEFAULT 'user'");
  addColumn('games', 'drawn_card_json', 'TEXT');
  addColumn('games', 'cpu_difficulty', "TEXT DEFAULT 'normal'");
  addColumn('games', 'first_revealer_id', 'TEXT');
  addColumn('games', 'is_hidden_from_history', 'BOOLEAN DEFAULT 0');
  addColumn('game_cards', 'id', 'TEXT');
  addColumn('moves', 'round_number', 'INTEGER DEFAULT 1');
  addColumn('users', 'mute_sounds', 'INTEGER DEFAULT 0');
  addColumn('users', 'sound_volume', 'REAL DEFAULT 1.0');
  addColumn('users', 'time_zone', "TEXT DEFAULT 'UTC'");
  addColumn('users', 'time_format', "TEXT DEFAULT '12h'");
  addColumn('users', 'show_date', "INTEGER DEFAULT 1");
  addColumn('users', 'show_move_date', "INTEGER DEFAULT 0");
  addColumn('users', 'is_admin', "INTEGER DEFAULT 0");

  // If last_active_at was just added, it might be null for existing rows.
  // We can optionally initialize it.
  try {
    db.exec("UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE last_active_at IS NULL");
  } catch (err) {
    // Ignore error if column doesn't exist yet (though it should by now)
  }
} catch (err) {
  console.error("Migration fatal error:", err);
}

export default db;
