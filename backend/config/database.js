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
        selected_courses TEXT, -- JSON string of selected course sections
        course_visibility BOOLEAN DEFAULT TRUE, -- Show courses to friends
        free_slot_visibility BOOLEAN DEFAULT TRUE, -- Show free slots to friends
        is_approved BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        is_restricted BOOLEAN DEFAULT FALSE,
        restriction_type TEXT CHECK(restriction_type IN ('temporary', 'permanent', NULL)),
        restriction_reason TEXT,
        restriction_start_date DATETIME,
        restriction_end_date DATETIME,
        restricted_by INTEGER,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_date DATETIME,
        approved_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (approved_by) REFERENCES admins(id),
        FOREIGN KEY (restricted_by) REFERENCES admins(id)
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

    // Friend requests table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(sender_id, receiver_id)
      )
    `);

    // Friends table (accepted relationships)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id INTEGER NOT NULL,
        user2_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user1_id, user2_id)
      )
    `);

    // Reports table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id INTEGER NOT NULL,
        reported_user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
        admin_notes TEXT,
        reviewed_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES admins(id)
      )
    `);

    // Chat messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'file')),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Admin reports table (user reports to admin - bug reports, feedback, etc.)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS admin_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('bug_report', 'feedback', 'suggestion', 'other')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        urgency TEXT NOT NULL DEFAULT 'low' CHECK(urgency IN ('low', 'medium', 'high')),
        status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'in_progress', 'resolved', 'closed')),
        admin_notes TEXT,
        reviewed_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES admins(id)
      )
    `);

    // Create close_friends table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS close_friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, friend_id)
      )
    `);

    // Create sos_alerts table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        location_accuracy REAL,
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_cancelled BOOLEAN DEFAULT FALSE,
        cancelled_at DATETIME,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create sos_notifications table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sos_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sos_alert_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        acknowledged_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sos_alert_id) REFERENCES sos_alerts(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(sos_alert_id, recipient_id)
      )
    `);

    // Add activity tracking columns to users table if they don't exist
    const activityColumns = [
      'is_online INTEGER DEFAULT 0',
      'last_seen DATETIME',
      'total_login_time INTEGER DEFAULT 0',
      'session_count INTEGER DEFAULT 0'
    ];

    for (const column of activityColumns) {
      const columnName = column.split(' ')[0];
      try {
        await db.run(`ALTER TABLE users ADD COLUMN ${column}`);
        console.log(`✅ Added activity column ${columnName} to users table`);
      } catch (error) {
        if (!error.message.includes('duplicate column name')) {
          console.error(`❌ Error adding activity column ${columnName}:`, error.message);
        }
      }
    }

    // Create user_activity_logs table for detailed analytics
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action_type TEXT NOT NULL CHECK(action_type IN ('login', 'logout', 'page_view', 'feature_use')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        session_duration INTEGER,
        additional_data TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create meetups table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS meetups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organizer_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT NOT NULL,
        date_time DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'completed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create meetup_invitations table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS meetup_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meetup_id INTEGER NOT NULL,
        inviter_id INTEGER NOT NULL,
        invitee_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
        response_message TEXT,
        invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        FOREIGN KEY (meetup_id) REFERENCES meetups(id) ON DELETE CASCADE,
        FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(meetup_id, invitee_id)
      )
    `);

    // Create meetup_participants table (for confirmed attendees)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS meetup_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meetup_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meetup_id) REFERENCES meetups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(meetup_id, user_id)
      )
    `);

    // Create notifications table for persistence
    await db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT, -- JSON data
        priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'high', 'urgent')),
        is_read BOOLEAN DEFAULT FALSE,
        actions TEXT, -- JSON array of actions
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Performance indexes to speed up chat
    try {
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_cm_sender_receiver_created_at 
          ON chat_messages(sender_id, receiver_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_cm_receiver_sender_created_at 
          ON chat_messages(receiver_id, sender_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_cm_unread 
          ON chat_messages(receiver_id, sender_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_friends_pair 
          ON friends(user1_id, user2_id);
        CREATE INDEX IF NOT EXISTS idx_friends_pair_rev 
          ON friends(user2_id, user1_id);
      `);
    } catch (e) {
      console.error('❌ Error creating performance indexes:', e);
    }

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
