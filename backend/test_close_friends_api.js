import { initDatabase } from './config/database.js';
import CloseFriends from './models/CloseFriends.js';
import Friend from './models/Friend.js';

async function testCloseFriendsAPI() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    console.log('\n=== Testing Close Friends Functionality ===');
    
    // First, let's see if we have any users and friendships
    console.log('1. Checking existing data...');
    
    // Mock user IDs (you can replace with actual user IDs from your database)
    const userId1 = 1;  // Replace with actual user ID
    const userId2 = 2;  // Replace with actual user ID
    
    console.log(`Testing with User ${userId1} and User ${userId2}`);
    
    // Test 1: Check if users are friends first
    console.log('\n2. Checking friendship status...');
    try {
      const friendshipStatus = await Friend.getFriendshipStatus(userId1, userId2);
      console.log(`Friendship status: ${friendshipStatus}`);
      
      if (friendshipStatus !== 'friends') {
        console.log('❌ Users are not friends. Close friends requires existing friendship.');
        
        // Let's check what friendships exist
        const friendsOfUser1 = await Friend.getFriends(userId1);
        console.log(`User ${userId1} has ${friendsOfUser1.length} friends`);
        
        if (friendsOfUser1.length > 0) {
          console.log('Available friends:');
          friendsOfUser1.forEach((friend, index) => {
            console.log(`  - Friend ${index + 1}: ID ${friend.friend_id}, Name: ${friend.name}`);
          });
          
          // Use the first available friend for testing
          if (friendsOfUser1.length > 0) {
            const testFriendId = friendsOfUser1[0].friend_id;
            console.log(`\n3. Testing with actual friend ID ${testFriendId}...`);
            
            // Test adding to close friends
            try {
              const result = await CloseFriends.addCloseFriend(userId1, testFriendId);
              console.log('✅ Successfully added to close friends:', result);
              
              // Test getting close friends list
              const closeFriends = await CloseFriends.getCloseFriends(userId1);
              console.log(`✅ Close friends count: ${closeFriends.length}`);
              
              // Test removing from close friends
              const removeResult = await CloseFriends.removeCloseFriend(userId1, testFriendId);
              console.log('✅ Successfully removed from close friends:', removeResult);
              
            } catch (error) {
              console.log('❌ Error testing close friends:', error.message);
            }
          }
        } else {
          console.log('❌ No friends found for testing. Create some friendships first.');
        }
      }
    } catch (error) {
      console.log('❌ Error checking friendship:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testCloseFriendsAPI();
