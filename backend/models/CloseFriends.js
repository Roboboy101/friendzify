import { getDatabase } from '../config/database.js';

class CloseFriends {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.friend_id = data.friend_id;
    this.created_at = data.created_at;
  }

  // Add a friend to close friends list
  static async addCloseFriend(userId, friendId) {
    const db = getDatabase();
    
    try {
      // Check if they are actually friends first
      const friendship = await db.get(`
        SELECT id FROM friends 
        WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
      `, [userId, friendId, friendId, userId]);
      
      if (!friendship) {
        throw new Error('Cannot add to close friends - users are not friends');
      }

      // Add to close friends
      const result = await db.run(`
        INSERT INTO close_friends (user_id, friend_id) 
        VALUES (?, ?)
      `, [userId, friendId]);

      return { id: result.lastID, success: true };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('User is already in your close friends list');
      }
      throw error;
    }
  }

  // Remove a friend from close friends list
  static async removeCloseFriend(userId, friendId) {
    const db = getDatabase();
    
    const result = await db.run(`
      DELETE FROM close_friends 
      WHERE user_id = ? AND friend_id = ?
    `, [userId, friendId]);

    return { success: result.changes > 0 };
  }

  // Get user's close friends list
  static async getCloseFriends(userId) {
    const db = getDatabase();
    
    const closeFriends = await db.all(`
      SELECT 
        cf.id,
        cf.friend_id,
        u.name,
        u.email,
        u.profile_picture,
        u.department,
        u.batch,
        cf.created_at
      FROM close_friends cf
      JOIN users u ON cf.friend_id = u.id
      WHERE cf.user_id = ? AND u.is_active = TRUE
      ORDER BY cf.created_at DESC
    `, [userId]);

    return closeFriends.map(friend => new CloseFriends(friend));
  }

  // Check if a user is in close friends list
  static async isCloseFriend(userId, friendId) {
    const db = getDatabase();
    
    const result = await db.get(`
      SELECT id FROM close_friends 
      WHERE user_id = ? AND friend_id = ?
    `, [userId, friendId]);

    return !!result;
  }

  // Get users who have this user as close friend (for SOS notifications)
  static async getUsersWhoHaveAsCloseFriend(userId) {
    const db = getDatabase();
    
    const users = await db.all(`
      SELECT 
        cf.user_id,
        u.name,
        u.email,
        u.profile_picture
      FROM close_friends cf
      JOIN users u ON cf.user_id = u.id
      WHERE cf.friend_id = ? AND u.is_active = TRUE
    `, [userId]);

    return users;
  }

  // Get close friends count
  static async getCloseFriendsCount(userId) {
    const db = getDatabase();
    
    const result = await db.get(`
      SELECT COUNT(*) as count 
      FROM close_friends 
      WHERE user_id = ?
    `, [userId]);

    return result.count;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      friend_id: this.friend_id,
      name: this.name,
      email: this.email,
      profile_picture: this.profile_picture,
      department: this.department,
      batch: this.batch,
      created_at: this.created_at
    };
  }
}

export default CloseFriends;
