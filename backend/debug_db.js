import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function checkDatabase() {
  try {
    const db = await open({
      filename: '../database/friendzify.db',
      driver: sqlite3.Database
    });

    console.log('🔍 Checking database contents...');
    
    // Check users table
    const users = await db.all('SELECT id, email, name, profile_picture FROM users');
    console.log('\n📋 Users in database:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
      console.log(`Profile Picture: ${user.profile_picture || 'NULL'}`);
      console.log('---');
    });

    await db.close();
  } catch (error) {
    console.error('❌ Database check error:', error);
  }
}

checkDatabase();
