import { getDatabase } from '../config/database.js';

class Notification {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.title = data.title;
    this.message = data.message;
    this.data = data.data;
    this.priority = data.priority || 'normal';
    this.is_read = data.is_read || false;
    this.actions = data.actions;
    this.created_at = data.created_at;
    this.expires_at = data.expires_at;
  }

  // Convert to JSON for API responses
  toJSON() {
    // Normalize timestamp to ISO with timezone to avoid client TZ skew
    let normalizedTimestamp = this.created_at;
    try {
      if (typeof this.created_at === 'string' && this.created_at.length > 0) {
        // SQLite CURRENT_TIMESTAMP is UTC without 'Z' (YYYY-MM-DD HH:MM:SS)
        // Append 'Z' to ensure proper UTC parsing in browsers
        const iso = this.created_at.endsWith('Z')
          ? this.created_at
          : `${this.created_at.replace(' ', 'T')}Z`;
        normalizedTimestamp = new Date(iso).toISOString();
      } else if (this.created_at instanceof Date) {
        normalizedTimestamp = this.created_at.toISOString();
      } else {
        normalizedTimestamp = new Date().toISOString();
      }
    } catch {
      normalizedTimestamp = new Date().toISOString();
    }

    return {
      id: this.id,
      user_id: this.user_id,
      type: this.type,
      title: this.title,
      message: this.message,
      data: this.data ? JSON.parse(this.data) : null,
      priority: this.priority,
      is_read: Boolean(this.is_read),
      actions: this.actions ? JSON.parse(this.actions) : [],
      created_at: this.created_at,
      expires_at: this.expires_at,
      timestamp: normalizedTimestamp
    };
  }

  // Create a notification
  static async create(userId, notificationData) {
    const db = getDatabase();
    
    const {
      type,
      title,
      message,
      data = null,
      priority = 'normal',
      actions = [],
      expiresInHours = 72 // Default 3 days
    } = notificationData;

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      const result = await db.run(
        `INSERT INTO notifications (user_id, type, title, message, data, priority, actions, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          type,
          title,
          message,
          data ? JSON.stringify(data) : null,
          priority,
          JSON.stringify(actions),
          expiresAt.toISOString()
        ]
      );

      const notification = await db.get(
        'SELECT * FROM notifications WHERE id = ?',
        [result.lastID]
      );

      return new Notification(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getForUser(userId, options = {}) {
    const db = getDatabase();
    const {
      unreadOnly = false,
      limit = 50,
      offset = 0,
      type = null
    } = options;

    try {
      let query = `
        SELECT * FROM notifications 
        WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
      `;
      const params = [userId];

      if (unreadOnly) {
        query += ' AND is_read = FALSE';
      }

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = await db.all(query, params);
      return rows.map(row => new Notification(row));
    } catch (error) {
      console.error('Error getting notifications for user:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    const db = getDatabase();

    try {
      const result = await db.run(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    const db = getDatabase();

    try {
      const result = await db.run(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );

      return result.changes;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  static async delete(notificationId, userId) {
    const db = getDatabase();

    try {
      const result = await db.run(
        'DELETE FROM notifications WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Clean up expired notifications
  static async cleanupExpired() {
    const db = getDatabase();

    try {
      const result = await db.run(
        'DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at <= datetime("now")'
      );

      console.log(`🧹 Cleaned up ${result.changes} expired notifications`);
      return result.changes;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  // Get unread count for a user
  static async getUnreadCount(userId) {
    const db = getDatabase();

    try {
      const result = await db.get(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = ? AND is_read = FALSE 
         AND (expires_at IS NULL OR expires_at > datetime('now'))
         AND type != 'new_message'`,
        [userId]
      );

      const chatResult = await db.get(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = ? AND is_read = FALSE 
         AND (expires_at IS NULL OR expires_at > datetime('now'))
         AND type = 'new_message'`,
        [userId]
      );

      return (result.count || 0) + (chatResult.count || 0);
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Send notification (real-time + persistent)
  static async sendNotification(userId, notificationData, io = null) {
    try {
      // Create persistent notification
      const notification = await this.create(userId, notificationData);

      // Send real-time notification if user is online
      if (io) {
        io.to(`user_${userId}`).emit('notification', notification.toJSON());
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Batch send notifications to multiple users
  static async sendToMultipleUsers(userIds, notificationData, io = null) {
    const notifications = [];

    for (const userId of userIds) {
      try {
        const notification = await this.sendNotification(userId, notificationData, io);
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error);
      }
    }

    return notifications;
  }

  // Dismiss message notifications from a specific sender
  static async dismissMessageNotifications(userId, senderId) {
    const db = getDatabase();

    try {
      const result = await db.run(
        `UPDATE notifications 
         SET is_read = TRUE 
         WHERE user_id = ? 
         AND type IN ('new_message', 'new_message_notification')
         AND is_read = FALSE
         AND CAST(
           COALESCE(
             json_extract(data, '$.sender.id'),
             json_extract(data, '$.senderId'),
             json_extract(data, '$.sender')
           ) AS TEXT
         ) = CAST(? AS TEXT)`,
        [userId, senderId]
      );
      return result.changes;
    } catch (error) {
      // Avoid noisy logs; propagate for higher-level handling
      throw error;
    }
  }
}

export default Notification;
