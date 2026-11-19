// --- SECTION 1: Imports and Configuration ---
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
// --- SECTION 2: Database Connection and Schema Initialization ---
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      description TEXT,
      amount REAL,
      type TEXT,
      category TEXT
    )`);
    // Add column if table already exists from previous version
    db.run(`ALTER TABLE transactions ADD COLUMN category TEXT`, (err) => {
        // Error is expected if column already exists
    });
  }
});

// --- SECTION 3: Module Export ---
module.exports = db;
