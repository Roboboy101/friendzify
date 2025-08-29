import { getDatabase } from '../config/database.js';

class Friend {
  constructor(data = {}) {
    this.id = data.id;
    this.user1_id = data.user1_id;
    this.user2_id = data.user2_id;
    this.created_at = data.created_at;
  }

  // Search for users to add as friends
  static async searchUsers(currentUserId, searchTerm, filters = {}) {
    const db = getDatabase();
    
    let query = `
      SELECT 
        u.id, u.name, u.email, u.profile_picture, u.bio, u.department, u.batch,
        CASE 
          WHEN f.id IS NOT NULL THEN 'friends'
          WHEN fr_sent.id IS NOT NULL THEN 'request_sent'
          WHEN fr_received.id IS NOT NULL THEN 'request_received'
          ELSE 'none'
        END as friendship_status
      FROM users u
      LEFT JOIN friends f ON (
        (f.user1_id = ? AND f.user2_id = u.id) OR 
        (f.user2_id = ? AND f.user1_id = u.id)
      )
      LEFT JOIN friend_requests fr_sent ON (
        fr_sent.sender_id = ? AND fr_sent.receiver_id = u.id AND fr_sent.status = 'pending'
      )
      LEFT JOIN friend_requests fr_received ON (
        fr_received.sender_id = u.id AND fr_received.receiver_id = ? AND fr_received.status = 'pending'
      )
      WHERE u.id != ? AND u.is_approved = 1 AND u.is_active = 1
    `;
    
    const params = [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId];
    
    // Add search term filter
    if (searchTerm) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.department LIKE ?)`;
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Add department filter
    if (filters.department) {
      query += ` AND u.department = ?`;
      params.push(filters.department);
    }
    
    // Add batch filter
    if (filters.batch) {
      query += ` AND u.batch = ?`;
      params.push(filters.batch);
    }
    
    query += ` ORDER BY u.name ASC LIMIT 50`;
    
    const users = await db.all(query, params);
    return users;
  }

  // Send friend request
  static async sendFriendRequest(senderId, receiverId) {
    const db = getDatabase();
    
    // Check if request already exists
    const existingRequest = await db.get(
      `SELECT id FROM friend_requests 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
      [senderId, receiverId, receiverId, senderId]
    );
    
    if (existingRequest) {
      throw new Error('Friend request already exists');
    }
    
    // Check if already friends
    const existingFriendship = await db.get(
      `SELECT id FROM friends 
       WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
      [senderId, receiverId, receiverId, senderId]
    );
    
    if (existingFriendship) {
      throw new Error('Already friends');
    }
    
    const result = await db.run(
      'INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)',
      [senderId, receiverId]
    );
    
    return { id: result.lastID, sender_id: senderId, receiver_id: receiverId, status: 'pending' };
  }

  // Get friend requests for a user
  static async getFriendRequests(userId, type = 'received') {
    const db = getDatabase();
    
    let query;
    if (type === 'received') {
      query = `
        SELECT fr.*, u.name, u.email, u.profile_picture, u.bio, u.department, u.batch
        FROM friend_requests fr
        JOIN users u ON fr.sender_id = u.id
        WHERE fr.receiver_id = ? AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
      `;
    } else {
      query = `
        SELECT fr.*, u.name, u.email, u.profile_picture, u.bio, u.department, u.batch
        FROM friend_requests fr
        JOIN users u ON fr.receiver_id = u.id
        WHERE fr.sender_id = ? AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
      `;
    }
    
    return await db.all(query, [userId]);
  }

  // Accept friend request
  static async acceptFriendRequest(requestId, userId) {
    const db = getDatabase();
    
    // Get the friend request
    const request = await db.get(
      'SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = "pending"',
      [requestId, userId]
    );
    
    if (!request) {
      throw new Error('Friend request not found or already processed');
    }
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Update request status
      await db.run(
        'UPDATE friend_requests SET status = "accepted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [requestId]
      );
      
      // Create friendship (ensure user1_id < user2_id for consistency)
      const user1_id = Math.min(request.sender_id, request.receiver_id);
      const user2_id = Math.max(request.sender_id, request.receiver_id);
      
      await db.run(
        'INSERT INTO friends (user1_id, user2_id) VALUES (?, ?)',
        [user1_id, user2_id]
      );
      
      await db.run('COMMIT');
      return { success: true, sender_id: request.sender_id, receiver_id: request.receiver_id };
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  // Reject friend request
  static async rejectFriendRequest(requestId, userId) {
    const db = getDatabase();
    
    const result = await db.run(
      'UPDATE friend_requests SET status = "rejected", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND receiver_id = ? AND status = "pending"',
      [requestId, userId]
    );
    
    if (result.changes === 0) {
      throw new Error('Friend request not found or already processed');
    }
    
    return { success: true };
  }

  // Get user's friends list
  static async getFriends(userId) {
    const db = getDatabase();
    
    const friends = await db.all(`
      SELECT 
        u.id, u.name, u.email, u.profile_picture, u.bio, u.department, u.batch, u.free_schedule,
        f.created_at as friendship_date
      FROM friends f
      JOIN users u ON (
        CASE 
          WHEN f.user1_id = ? THEN u.id = f.user2_id
          ELSE u.id = f.user1_id
        END
      )
      WHERE (f.user1_id = ? OR f.user2_id = ?) AND u.is_active = 1
      ORDER BY u.name ASC
    `, [userId, userId, userId]);
    
    return friends;
  }

  // Remove friend
  static async removeFriend(userId, friendId) {
    const db = getDatabase();
    
    const result = await db.run(
      'DELETE FROM friends WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
      [userId, friendId, friendId, userId]
    );
    
    if (result.changes === 0) {
      throw new Error('Friendship not found');
    }
    
    return { success: true };
  }

  // Get friendship status between two users
  static async getFriendshipStatus(userId, otherUserId) {
    const db = getDatabase();
    
    // Check if friends
    const friendship = await db.get(
      'SELECT id FROM friends WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
      [userId, otherUserId, otherUserId, userId]
    );
    
    if (friendship) {
      return 'friends';
    }
    
    // Check for pending requests
    const sentRequest = await db.get(
      'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"',
      [userId, otherUserId]
    );
    
    if (sentRequest) {
      return 'request_sent';
    }
    
    const receivedRequest = await db.get(
      'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"',
      [otherUserId, userId]
    );
    
    if (receivedRequest) {
      return 'request_received';
    }
    
    return 'none';
  }

  // Get user by ID (for notifications)
  static async getUserById(userId) {
    const db = getDatabase();
    
    const user = await db.get(
      'SELECT id, name, email, profile_picture FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );
    
    return user;
  }
}

export default Friend;

