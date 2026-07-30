import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'budget.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // 1. Plaid items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plaid_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      institution_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plaid_account_id TEXT UNIQUE NOT NULL,
      item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      official_name TEXT,
      type TEXT NOT NULL,
      subtype TEXT,
      mask TEXT,
      current_balance REAL DEFAULT 0,
      available_balance REAL DEFAULT 0,
      iso_currency_code TEXT DEFAULT 'USD',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES plaid_items(item_id) ON DELETE CASCADE
    );
  `);

  // 3. Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT '📁',
      color TEXT DEFAULT '#3b82f6',
      budget_limit REAL DEFAULT 0
    );
  `);

  // 4. Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plaid_transaction_id TEXT UNIQUE,
      account_id TEXT NOT NULL,
      category_id INTEGER,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      merchant_name TEXT,
      payment_channel TEXT,
      pending INTEGER DEFAULT 0,
      notes TEXT,
      flagged INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Migration check: Add flagged column if missing on existing databases
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(transactions)`).all();
    const hasFlagged = tableInfo.some(col => col.name === 'flagged');
    if (!hasFlagged) {
      db.exec(`ALTER TABLE transactions ADD COLUMN flagged INTEGER DEFAULT 0;`);
      console.log('Added "flagged" column to transactions table.');
    }
  } catch (err) {
    console.error('Error during migration check for flagged column:', err.message);
  }

  // Seed default categories if empty
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (categoryCount === 0) {
    const seedCategories = [
      { name: 'Housing & Utilities', icon: '🏠', color: '#6366f1', limit: 1500 },
      { name: 'Groceries & Dining', icon: '🍔', color: '#f59e0b', limit: 600 },
      { name: 'Transportation & Gas', icon: '🚗', color: '#10b981', limit: 350 },
      { name: 'Shopping & Entertainment', icon: '🛍️', color: '#ec4899', limit: 400 },
      { name: 'Subscriptions & Services', icon: '📱', color: '#8b5cf6', limit: 150 },
      { name: 'Health & Personal Care', icon: '💊', color: '#06b6d4', limit: 200 },
      { name: 'Income', icon: '💰', color: '#22c55e', limit: 0 },
      { name: 'Uncategorized', icon: '❓', color: '#6b7280', limit: 0 }
    ];

    const insertCat = db.prepare('INSERT INTO categories (name, icon, color, budget_limit) VALUES (?, ?, ?, ?)');
    for (const cat of seedCategories) {
      insertCat.run(cat.name, cat.icon, cat.color, cat.limit);
    }
  }

  console.log('Database initialized successfully with schema and default categories.');
}

export default db;
