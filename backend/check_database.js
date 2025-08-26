import { initDatabase, getDatabase } from './config/database.js';

async function checkDatabase() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    const db = getDatabase();
    
    console.log('\n=== Checking Database Tables ===');
    
    // Check if all tables exist
    const tables = ['users', 'admins', 'friends', 'friend_requests', 'reports', 'chat_messages', 'close_friends', 'sos_alerts', 'sos_notifications'];
    
    for (const tableName of tables) {
      try {
        const tableInfo = await db.all(`PRAGMA table_info(${tableName})`);
        if (tableInfo.length > 0) {
          console.log(`✅ Table '${tableName}' exists with ${tableInfo.length} columns`);
        } else {
          console.log(`❌ Table '${tableName}' does not exist`);
        }
      } catch (error) {
        console.log(`❌ Table '${tableName}' error: ${error.message}`);
      }
    }
    
    // Check specifically for close_friends table columns
    console.log('\n=== Close Friends Table Details ===');
    try {
      const closeFriendsInfo = await db.all(`PRAGMA table_info(close_friends)`);
      if (closeFriendsInfo.length > 0) {
        console.log('Close friends table columns:');
        closeFriendsInfo.forEach(col => {
          console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Check if there are any existing records
        const count = await db.get(`SELECT COUNT(*) as count FROM close_friends`);
        console.log(`Current close friends records: ${count.count}`);
      }
    } catch (error) {
      console.log(`❌ Close friends table error: ${error.message}`);
    }
    
    // Check users table to see if there are any users
    console.log('\n=== Users Check ===');
    try {
      const userCount = await db.get(`SELECT COUNT(*) as count FROM users WHERE is_approved = 1`);
      console.log(`Approved users: ${userCount.count}`);
      
      if (userCount.count > 0) {
        const users = await db.all(`SELECT id, name, email FROM users WHERE is_approved = 1 LIMIT 5`);
        console.log('Sample users:');
        users.forEach(user => {
          console.log(`  - ${user.name} (ID: ${user.id}, Email: ${user.email})`);
        });
      }
    } catch (error) {
      console.log(`❌ Users check error: ${error.message}`);
    }
    
    // Check friends table
    console.log('\n=== Friends Check ===');
    try {
      const friendCount = await db.get(`SELECT COUNT(*) as count FROM friends`);
      console.log(`Total friendships: ${friendCount.count}`);
    } catch (error) {
      console.log(`❌ Friends check error: ${error.message}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Database check failed:', error);
    process.exit(1);
  }
}

checkDatabase();
