import { getDatabase } from '../config/database.js';

export class Chat {
  constructor(data) {
    this.id = data.id;
    this.sender_id = data.sender_id;
    this.receiver_id = data.receiver_id;
    this.message = data.message;
    this.message_type = data.message_type;
    this.is_read = data.is_read;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Send a message
  static async sendMessage(senderId, receiverId, message, messageType = 'text') {
    const db = getDatabase();
    
    try {
      const result = await db.run(`
        INSERT INTO chat_messages (sender_id, receiver_id, message, message_type)
        VALUES (?, ?, ?, ?)
      `, [senderId, receiverId, message, messageType]);

      const messageData = await db.get(`
        SELECT cm.*, 
               sender.name as sender_name, sender.profile_picture as sender_picture,
               receiver.name as receiver_name, receiver.profile_picture as receiver_picture
        FROM chat_messages cm
        JOIN users sender ON cm.sender_id = sender.id
        JOIN users receiver ON cm.receiver_id = receiver.id
        WHERE cm.id = ?
      `, [result.lastID]);

      return new Chat(messageData);
    } catch (error) {
      throw error;
    }
  }

  // Get conversation between two users
  static async getConversation(userId1, userId2, limit = 50, offset = 0) {
    const db = getDatabase();
    
    try {
      const messages = await db.all(`
        SELECT cm.*, 
               sender.name as sender_name, sender.profile_picture as sender_picture,
               receiver.name as receiver_name, receiver.profile_picture as receiver_picture
        FROM chat_messages cm
        JOIN users sender ON cm.sender_id = sender.id
        JOIN users receiver ON cm.receiver_id = receiver.id
        WHERE (cm.sender_id = ? AND cm.receiver_id = ?) 
           OR (cm.sender_id = ? AND cm.receiver_id = ?)
        ORDER BY cm.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId1, userId2, userId2, userId1, limit, offset]);

      return messages.map(msg => new Chat(msg)).reverse(); // Reverse to show oldest first
    } catch (error) {
      throw error;
    }
  }

  // Get all chat conversations for a user (with last message)
  static async getUserConversations(userId) {
    const db = getDatabase();
    
    try {
      const conversations = await db.all(`
        WITH latest_messages AS (
          SELECT 
            CASE 
              WHEN sender_id = ? THEN receiver_id 
              ELSE sender_id 
            END as other_user_id,
            MAX(created_at) as last_message_time
          FROM chat_messages 
          WHERE sender_id = ? OR receiver_id = ?
          GROUP BY other_user_id
        )
        SELECT 
          u.id, u.name, u.profile_picture,
          cm.message as last_message,
          cm.created_at as last_message_time,
          cm.sender_id as last_sender_id,
          (SELECT COUNT(*) FROM chat_messages 
           WHERE sender_id = u.id AND receiver_id = ? AND is_read = FALSE) as unread_count
        FROM latest_messages lm
        JOIN users u ON u.id = lm.other_user_id
        JOIN chat_messages cm ON (
          (cm.sender_id = ? AND cm.receiver_id = u.id) OR 
          (cm.sender_id = u.id AND cm.receiver_id = ?)
        ) AND cm.created_at = lm.last_message_time
        ORDER BY lm.last_message_time DESC
      `, [userId, userId, userId, userId, userId, userId]);

      return conversations;
    } catch (error) {
      throw error;
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(senderId, receiverId) {
    const db = getDatabase();
    
    try {
      await db.run(`
        UPDATE chat_messages 
        SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
      `, [senderId, receiverId]);
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Get unread message count for a user
  static async getUnreadCount(userId) {
    const db = getDatabase();
    
    try {
      const result = await db.get(`
        SELECT COUNT(*) as count
        FROM chat_messages 
        WHERE receiver_id = ? AND is_read = FALSE
      `, [userId]);
      
      return result.count || 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete a message (soft delete by setting message to empty)
  static async deleteMessage(messageId, userId) {
    const db = getDatabase();
    
    try {
      await db.run(`
        UPDATE chat_messages 
        SET message = '[Message deleted]', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND sender_id = ?
      `, [messageId, userId]);
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      sender_id: this.sender_id,
      receiver_id: this.receiver_id,
      message: this.message,
      message_type: this.message_type,
      is_read: this.is_read,
      created_at: this.created_at,
      updated_at: this.updated_at,
      sender_name: this.sender_name,
      sender_picture: this.sender_picture,
      receiver_name: this.receiver_name,
      receiver_picture: this.receiver_picture
    };
  }
}

export default Chat;
