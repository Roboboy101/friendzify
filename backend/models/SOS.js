import { getDatabase } from '../config/database.js';
import CloseFriends from './CloseFriends.js';

class SOS {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.message = data.message;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.location_accuracy = data.location_accuracy;
    this.address = data.address;
    this.is_active = data.is_active;
    this.is_cancelled = data.is_cancelled;
    this.cancelled_at = data.cancelled_at;
    this.expires_at = data.expires_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // User details (when joined)
    this.user_name = data.user_name;
    this.user_email = data.user_email;
  }

  // Create a new SOS alert
  static async createAlert(userId, alertData) {
    const db = getDatabase();
    
    try {
      // Set expiry time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Default SOS message if not provided
      const message = alertData.message || "I need help! Here's my location";
      
      // Create the SOS alert
      const result = await db.run(`
        INSERT INTO sos_alerts (
          user_id, message, latitude, longitude, 
          location_accuracy, address, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, 
        message, 
        alertData.latitude, 
        alertData.longitude,
        alertData.accuracy || null,
        alertData.address || null,
        expiresAt.toISOString()
      ]);

      const alertId = result.lastID;

      // Get user's close friends
      const closeFriends = await CloseFriends.getCloseFriends(userId);
      
      // Create notifications for each close friend
      if (closeFriends.length > 0) {
        const notificationValues = closeFriends.map(friend => 
          `(${alertId}, ${friend.friend_id})`
        ).join(', ');
        
        await db.exec(`
          INSERT INTO sos_notifications (sos_alert_id, recipient_id) 
          VALUES ${notificationValues}
        `);
      }

      // Return the created alert with details
      return await SOS.getAlertById(alertId);
    } catch (error) {
      console.error('Error creating SOS alert:', error);
      throw error;
    }
  }

  // Cancel an SOS alert
  static async cancelAlert(alertId, userId) {
    const db = getDatabase();
    
    const result = await db.run(`
      UPDATE sos_alerts 
      SET is_cancelled = TRUE, 
          is_active = FALSE,
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ? AND is_active = TRUE
    `, [alertId, userId]);

    if (result.changes === 0) {
      throw new Error('SOS alert not found or cannot be cancelled');
    }

    return { success: true, alertId };
  }

  // Get SOS alert by ID
  static async getAlertById(alertId) {
    const db = getDatabase();
    
    const alert = await db.get(`
      SELECT 
        sa.*,
        u.name as user_name,
        u.email as user_email
      FROM sos_alerts sa
      JOIN users u ON sa.user_id = u.id
      WHERE sa.id = ?
    `, [alertId]);

    return alert ? new SOS(alert) : null;
  }

  // Get active alerts for a user
  static async getActiveAlertsForUser(userId) {
    const db = getDatabase();
    
    const alerts = await db.all(`
      SELECT sa.*, u.name as user_name, u.email as user_email
      FROM sos_alerts sa
      JOIN users u ON sa.user_id = u.id
      WHERE sa.user_id = ? AND sa.is_active = TRUE AND sa.expires_at > CURRENT_TIMESTAMP
      ORDER BY sa.created_at DESC
    `, [userId]);

    return alerts.map(alert => new SOS(alert));
  }

  // Get SOS notifications for a user (alerts from their close friends)
  static async getNotificationsForUser(userId, limit = 50) {
    const db = getDatabase();
    
    const notifications = await db.all(`
      SELECT 
        sn.*,
        sa.*,
        u.name as user_name,
        u.email as user_email
      FROM sos_notifications sn
      JOIN sos_alerts sa ON sn.sos_alert_id = sa.id
      JOIN users u ON sa.user_id = u.id
      WHERE sn.recipient_id = ? AND sa.is_active = TRUE
      ORDER BY sa.created_at DESC
      LIMIT ?
    `, [userId, limit]);

    return notifications.map(notif => ({
      notification_id: notif.id,
      is_read: notif.is_read,
      acknowledged_at: notif.acknowledged_at,
      alert: new SOS(notif)
    }));
  }

  // Mark SOS notification as read
  static async markNotificationAsRead(notificationId, userId) {
    const db = getDatabase();
    
    const result = await db.run(`
      UPDATE sos_notifications 
      SET is_read = TRUE, acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = ? AND recipient_id = ?
    `, [notificationId, userId]);

    return { success: result.changes > 0 };
  }

  // Get unread SOS notifications count
  static async getUnreadNotificationsCount(userId) {
    const db = getDatabase();
    
    const result = await db.get(`
      SELECT COUNT(*) as count 
      FROM sos_notifications sn
      JOIN sos_alerts sa ON sn.sos_alert_id = sa.id
      WHERE sn.recipient_id = ? AND sn.is_read = FALSE AND sa.is_active = TRUE
    `, [userId]);

    return result.count;
  }

  // Clean up expired alerts
  static async cleanupExpiredAlerts() {
    const db = getDatabase();
    
    const result = await db.run(`
      UPDATE sos_alerts 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE is_active = TRUE AND expires_at <= CURRENT_TIMESTAMP
    `);

    return { cleaned: result.changes };
  }

  // Get SOS statistics (for admin)
  static async getStatistics() {
    const db = getDatabase();
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_alerts,
        COUNT(CASE WHEN is_cancelled = TRUE THEN 1 END) as cancelled_alerts,
        COUNT(CASE WHEN is_active = FALSE AND is_cancelled = FALSE THEN 1 END) as expired_alerts
      FROM sos_alerts
      WHERE created_at >= date('now', '-30 days')
    `);

    return stats;
  }

  // Get all SOS alerts for admin (active and historical)
  static async getAllAlertsForAdmin(options = {}) {
    const db = getDatabase();
    const { 
      status = 'all', // 'all', 'active', 'cancelled', 'expired'
      limit = 50, 
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    let whereClause = '1=1';
    const params = [];

    if (status === 'active') {
      whereClause = 'sa.is_active = TRUE AND sa.expires_at > CURRENT_TIMESTAMP';
    } else if (status === 'cancelled') {
      whereClause = 'sa.is_cancelled = TRUE';
    } else if (status === 'expired') {
      whereClause = 'sa.is_active = FALSE AND sa.is_cancelled = FALSE';
    }

    const alerts = await db.all(`
      SELECT 
        sa.*,
        u.name as user_name,
        u.email as user_email,
        COUNT(sn.id) as notifications_sent
      FROM sos_alerts sa
      JOIN users u ON sa.user_id = u.id
      LEFT JOIN sos_notifications sn ON sa.id = sn.sos_alert_id
      WHERE ${whereClause}
      GROUP BY sa.id
      ORDER BY sa.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return alerts.map(alert => new SOS(alert));
  }

  // Get total count of SOS alerts for admin pagination
  static async getAlertsCountForAdmin(status = 'all') {
    const db = getDatabase();
    
    let whereClause = '1=1';
    if (status === 'active') {
      whereClause = 'is_active = TRUE AND expires_at > CURRENT_TIMESTAMP';
    } else if (status === 'cancelled') {
      whereClause = 'is_cancelled = TRUE';
    } else if (status === 'expired') {
      whereClause = 'is_active = FALSE AND is_cancelled = FALSE';
    }

    const result = await db.get(`
      SELECT COUNT(*) as count 
      FROM sos_alerts 
      WHERE ${whereClause}
    `);

    return result.count;
  }

  // Admin force cancel SOS alert
  static async adminCancelAlert(alertId, adminId, reason = null) {
    const db = getDatabase();
    
    const result = await db.run(`
      UPDATE sos_alerts 
      SET is_cancelled = TRUE, 
          is_active = FALSE,
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = TRUE
    `, [alertId]);

    if (result.changes === 0) {
      throw new Error('SOS alert not found or already cancelled');
    }

    // Log admin action (we could add an admin_actions table later)
    console.log(`Admin ${adminId} cancelled SOS alert ${alertId}${reason ? ` - Reason: ${reason}` : ''}`);

    return { success: true, alertId };
  }

  // Generate Google Maps link
  getGoogleMapsLink() {
    return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
  }

  // Get time remaining until expiry
  getTimeRemaining() {
    const now = new Date();
    const expiry = new Date(this.expires_at);
    const remaining = expiry - now;
    
    if (remaining <= 0) return null;
    
    const minutes = Math.floor(remaining / (1000 * 60));
    return { minutes, total_ms: remaining };
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      user_name: this.user_name,
      user_email: this.user_email,
      message: this.message,
      latitude: this.latitude,
      longitude: this.longitude,
      location_accuracy: this.location_accuracy,
      address: this.address,
      is_active: this.is_active,
      is_cancelled: this.is_cancelled,
      cancelled_at: this.cancelled_at,
      expires_at: this.expires_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
      google_maps_link: this.getGoogleMapsLink(),
      time_remaining: this.getTimeRemaining()
    };
  }
}

export default SOS;
