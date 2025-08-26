import { initDatabase, getDatabase } from './config/database.js';

async function fixCloseFriendsTable() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    const db = getDatabase();
    
    console.log('Checking close_friends table structure...');
    
    // Check current table structure
    const tableInfo = await db.all('PRAGMA table_info(close_friends)');
    console.log('Current close_friends columns:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Check if user_id column exists
    const hasUserId = tableInfo.some(col => col.name === 'user_id');
    const hasFriendId = tableInfo.some(col => col.name === 'friend_id');
    
    if (!hasUserId || !hasFriendId) {
      console.log('❌ Missing required columns. Recreating close_friends table...');
      
      // Drop and recreate the table
      await db.exec('DROP TABLE IF EXISTS close_friends');
      
      await db.exec(`
        CREATE TABLE close_friends (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          friend_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, friend_id)
        )
      `);
      
      console.log('✅ close_friends table recreated successfully');
    } else {
      console.log('✅ close_friends table already has required columns');
    }
    
    // Verify the table structure
    const newTableInfo = await db.all('PRAGMA table_info(close_friends)');
    console.log('\nFinal close_friends table structure:');
    newTableInfo.forEach(col => {
      console.log(`  ✅ ${col.name} (${col.type})`);
    });
    
    console.log('\n🎉 Database fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  }
}

fixCloseFriendsTable();
