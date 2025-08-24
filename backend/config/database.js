import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const DB_PATH = path.join(__dirname, '../../database/friendzify.db');

let db = null;

// Initialize database connection
export const initDatabase = async () => {
  try {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    console.log('📄 Connected to SQLite database');
    
    // Create tables if they don't exist
    await createTables();
    
    // Create default admin if doesn't exist
    await createDefaultAdmin();
    
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Create database tables
const createTables = async () => {
  try {
    // Admins table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        profile_picture TEXT,
        bio TEXT,
        department TEXT,
        batch TEXT,
        free_schedule TEXT,
        is_approved BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_date DATETIME,
        approved_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (approved_by) REFERENCES admins(id)
      )
    `);

    // User sessions table for token management
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        admin_id INTEGER,
        token TEXT UNIQUE NOT NULL,
        user_type TEXT NOT NULL CHECK(user_type IN ('user', 'admin')),
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (admin_id) REFERENCES admins(id)
      )
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

// Create default admin account
const createDefaultAdmin = async () => {
  try {
    const bcrypt = await import('bcryptjs');
    
    // Check if default admin exists
    const existingAdmin = await db.get(
      'SELECT id FROM admins WHERE email = ?',
      ['admin@friendzify.com']
    );

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.default.hash('admin', 12);
      
      await db.run(
        'INSERT INTO admins (email, password, name) VALUES (?, ?, ?)',
        ['admin@friendzify.com', hashedPassword, 'System Administrator']
      );
      
      console.log('✅ Default admin account created');
      console.log('📧 Email: admin@friendzify.com');
      console.log('🔑 Password: admin');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    throw error;
  }
};

// Get database instance
export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export default { initDatabase, getDatabase };
