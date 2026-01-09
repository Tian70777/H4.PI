const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/cat_detections.db');
let db = null;

/**
 * Initialize SQLite database
 */
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Database connection failed:', err);
        reject(err);
      } else {
        console.log('✅ Database connected');
        createTables().then(resolve).catch(reject);
      }
    });
  });
}

/**
 * Create database tables
 */
function createTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Detections table
      db.run(`
        CREATE TABLE IF NOT EXISTS detections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_hana BOOLEAN NOT NULL,
          confidence REAL NOT NULL,
          photo_path TEXT NOT NULL,
          color_features TEXT
        )
      `, (err) => {
        if (err) reject(err);
      });
      
      // Statistics table
      db.run(`
        CREATE TABLE IF NOT EXISTS statistics (
          date DATE PRIMARY KEY,
          hana_visits INTEGER DEFAULT 0,
          other_visits INTEGER DEFAULT 0
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

/**
 * Save detection event
 */
function saveDetection({ photoPath, isHana, confidence, colorFeatures }) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO detections (is_hana, confidence, photo_path, color_features)
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [isHana ? 1 : 0, confidence, photoPath, colorFeatures], function(err) {
      if (err) {
        console.error('❌ Failed to save detection:', err);
        reject(err);
      } else {
        console.log(`✅ Detection saved with ID: ${this.lastID}`);
        updateStatistics(isHana);
        resolve(this.lastID);
      }
    });
  });
}

/**
 * Update daily statistics
 */
function updateStatistics(isHana) {
  const today = new Date().toISOString().split('T')[0];
  const column = isHana ? 'hana_visits' : 'other_visits';
  
  db.run(`
    INSERT INTO statistics (date, ${column}) VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET ${column} = ${column} + 1
  `, [today]);
}

/**
 * Get recent detections
 */
function getRecentDetections(limit = 20) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM detections ORDER BY timestamp DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

/**
 * Get statistics
 */
function getStatistics(days = 7) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM statistics ORDER BY date DESC LIMIT ?`,
      [days],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

module.exports = { 
  initializeDatabase, 
  saveDetection, 
  getRecentDetections, 
  getStatistics 
};
