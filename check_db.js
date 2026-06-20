import Database from 'better-sqlite3';
const db = new Database('golf.db');
const rows = db.prepare('SELECT * FROM push_subscriptions').all();
console.log("SUBSCRIPTIONS:", JSON.stringify(rows, null, 2));
