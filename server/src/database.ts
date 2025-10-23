import sqlite3 from 'sqlite3';

const DBSOURCE = "db.sqlite";

export const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  }
});

export const initDatabase = () => {
  db.serialize(() => {
    console.log('Initializing database...');
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      CONSTRAINT email_unique UNIQUE (email)
    )`);

    // Create activities table
    db.run(`CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      target_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Create events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER,
      count INTEGER,
      timestamp TEXT,
      FOREIGN KEY (activity_id) REFERENCES activities (id)
    )`);
    console.log('Database initialized.');
  });
};
