import { initDatabase, getDatabase } from './config/database.js';

async function checkFriendsTable() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    const db = getDatabase();
    
    console.log('Checking friends table structure...');
    const tableInfo = await db.all('PRAGMA table_info(friends)');
    console.log('Friends table columns:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Check sample data
    const friendCount = await db.get('SELECT COUNT(*) as count FROM friends');
    console.log(`\nFriends table has ${friendCount.count} records`);
    
    if (friendCount.count > 0) {
      const sampleFriends = await db.all('SELECT * FROM friends LIMIT 3');
      console.log('\nSample friends records:');
      sampleFriends.forEach(friend => {
        console.log(`  - Record:`, friend);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Check failed:', error);
    process.exit(1);
  }
}

checkFriendsTable();
