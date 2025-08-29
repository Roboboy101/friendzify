import { getDatabase } from '../config/database.js';
import bcrypt from 'bcryptjs';

export class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.profile_picture = data.profile_picture;
    this.bio = data.bio;
    this.department = data.department;
    this.batch = data.batch;
    this.free_schedule = data.free_schedule;
    this.selected_courses = data.selected_courses;
    this.course_visibility = data.course_visibility;
    this.free_slot_visibility = data.free_slot_visibility;
    this.is_approved = data.is_approved;
    this.is_active = data.is_active;
    this.is_restricted = data.is_restricted;
    this.restriction_type = data.restriction_type;
    this.restriction_reason = data.restriction_reason;
    this.restriction_start_date = data.restriction_start_date;
    this.restriction_end_date = data.restriction_end_date;
    this.restricted_by = data.restricted_by;
    this.registration_date = data.registration_date;
    this.approved_date = data.approved_date;
    this.approved_by = data.approved_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // Activity tracking fields
    this.is_online = data.is_online || 0;
    this.last_seen = data.last_seen || null;
    this.total_login_time = data.total_login_time || 0;
    this.session_count = data.session_count || 0;
  }

  // Create new user
  static async create(userData) {
    const db = getDatabase();
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const result = await db.run(`
        INSERT INTO users (
          email, password, name, department, batch
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        userData.email,
        hashedPassword,
        userData.name,
        userData.department || null,
        userData.batch || null
      ]);

      return await User.findById(result.lastID);
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const db = getDatabase();
    
    try {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
      return user ? new User(user) : null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const db = getDatabase();
    
    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      return user ? new User(user) : null;
    } catch (error) {
      throw error;
    }
  }

  // Get all pending users (waiting for approval)
  static async getPendingUsers() {
    const db = getDatabase();
    
    try {
      const users = await db.all(`
        SELECT * FROM users 
        WHERE is_approved = FALSE 
        ORDER BY registration_date DESC
      `);
      
      return users.map(user => new User(user));
    } catch (error) {
      throw error;
    }
  }

  // Get all approved users
  static async getApprovedUsers() {
    const db = getDatabase();
    
    try {
      const users = await db.all(`
        SELECT * FROM users 
        WHERE is_approved = TRUE 
        ORDER BY name ASC
      `);
      
      return users.map(user => new User(user));
    } catch (error) {
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Update user profile
  async updateProfile(updateData) {
    const db = getDatabase();
    
    try {
      const updates = [];
      const values = [];
      
      const allowedFields = [
        'name', 'profile_picture', 'bio', 'department', 
        'batch', 'free_schedule', 'selected_courses', 
        'course_visibility', 'free_slot_visibility'
      ];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });
      
      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);
      
      await db.run(`
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `, values);
      
      return await User.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Approve user
  async approve(adminId) {
    const db = getDatabase();
    
    try {
      await db.run(`
        UPDATE users 
        SET is_approved = TRUE, approved_date = CURRENT_TIMESTAMP, approved_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [adminId, this.id]);
      
      return await User.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Suspend/Activate user
  async setActiveStatus(isActive) {
    const db = getDatabase();
    
    try {
      await db.run(`
        UPDATE users 
        SET is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [isActive, this.id]);
      
      return await User.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Set account restriction
  async setRestriction(restrictionType, reason, adminId, durationDays = null) {
    const db = getDatabase();
    
    try {
      const startDate = new Date().toISOString();
      let endDate = null;
      
      if (restrictionType === 'temporary' && durationDays) {
        const end = new Date();
        end.setDate(end.getDate() + durationDays);
        endDate = end.toISOString();
      }
      
      await db.run(`
        UPDATE users 
        SET is_restricted = TRUE, 
            restriction_type = ?, 
            restriction_reason = ?, 
            restriction_start_date = ?, 
            restriction_end_date = ?, 
            restricted_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [restrictionType, reason, startDate, endDate, adminId, this.id]);
      
      return await User.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Remove account restriction
  async removeRestriction() {
    const db = getDatabase();
    
    try {
      await db.run(`
        UPDATE users 
        SET is_restricted = FALSE, 
            restriction_type = NULL, 
            restriction_reason = NULL, 
            restriction_start_date = NULL, 
            restriction_end_date = NULL, 
            restricted_by = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [this.id]);
      
      return await User.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Check if user's restriction has expired
  static async checkAndUpdateExpiredRestrictions() {
    const db = getDatabase();
    
    try {
      // Find users with expired temporary restrictions
      const expiredUsers = await db.all(`
        SELECT id FROM users 
        WHERE is_restricted = TRUE 
          AND restriction_type = 'temporary' 
          AND restriction_end_date IS NOT NULL 
          AND restriction_end_date <= CURRENT_TIMESTAMP
      `);
      
      // Remove expired restrictions
      if (expiredUsers.length > 0) {
        const userIds = expiredUsers.map(u => u.id);
        await db.run(`
          UPDATE users 
          SET is_restricted = FALSE, 
              restriction_type = NULL, 
              restriction_reason = NULL, 
              restriction_start_date = NULL, 
              restriction_end_date = NULL, 
              restricted_by = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${userIds.map(() => '?').join(',')})
        `, userIds);
      }
      
      return expiredUsers.length;
    } catch (error) {
      throw error;
    }
  }

  // Check if user can login (not restricted or restriction expired)
  async canLogin() {
    // First, check for expired restrictions
    await User.checkAndUpdateExpiredRestrictions();
    
    // Refresh user data
    const updatedUser = await User.findById(this.id);
    
    // Check approval and active status
    if (!updatedUser.is_approved) {
      return { canLogin: false, reason: 'pending_approval', message: 'Your account is pending admin approval.' };
    }
    
    if (!updatedUser.is_active) {
      return { canLogin: false, reason: 'deactivated', message: 'Your account has been deactivated. Please contact support.' };
    }
    
    // Check restriction status
    if (updatedUser.is_restricted) {
      if (updatedUser.restriction_type === 'permanent') {
        return { 
          canLogin: false, 
          reason: 'permanently_blocked', 
          message: 'Your account has been permanently blocked.',
          details: {
            reason: updatedUser.restriction_reason,
            date: updatedUser.restriction_start_date
          }
        };
      } else if (updatedUser.restriction_type === 'temporary') {
        const endDate = new Date(updatedUser.restriction_end_date);
        const now = new Date();
        
        if (endDate > now) {
          const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
          return { 
            canLogin: false, 
            reason: 'temporarily_restricted', 
            message: `Your account is temporarily restricted for ${daysLeft} more day(s).`,
            details: {
              reason: updatedUser.restriction_reason,
              endDate: updatedUser.restriction_end_date,
              daysLeft
            }
          };
        }
      }
    }
    
    return { canLogin: true };
  }

  // Get restricted users for admin
  static async getRestrictedUsers() {
    const db = getDatabase();
    
    try {
      const users = await db.all(`
        SELECT u.*, a.name as restricted_by_name
        FROM users u
        LEFT JOIN admins a ON u.restricted_by = a.id
        WHERE u.is_restricted = TRUE
        ORDER BY u.restriction_start_date DESC
      `);
      
      return users.map(user => new User(user));
    } catch (error) {
      throw error;
    }
  }

  // Update online status
  async setOnlineStatus(isOnline) {
    const db = getDatabase();
    
    try {
      await db.run(`
        UPDATE users 
        SET is_online = ?, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [isOnline ? 1 : 0, this.id]);
      
      return await User.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Log user activity
  async logActivity(actionType, ipAddress = null, userAgent = null, additionalData = null) {
    const db = getDatabase();
    
    try {
      await db.run(`
        INSERT INTO user_activity_logs (user_id, action_type, ip_address, user_agent, additional_data)
        VALUES (?, ?, ?, ?, ?)
      `, [this.id, actionType, ipAddress, userAgent, additionalData ? JSON.stringify(additionalData) : null]);
    } catch (error) {
      throw error;
    }
  }

  // Update session stats
  async updateSessionStats(sessionDuration = null) {
    const db = getDatabase();
    
    try {
      const updates = ['session_count = session_count + 1'];
      const values = [];
      
      if (sessionDuration) {
        updates.push('total_login_time = total_login_time + ?');
        values.push(sessionDuration);
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);
      
      await db.run(`
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);
      
      return await User.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Get users with activity status for friends list
  static async getUsersWithActivityStatus(userIds = []) {
    const db = getDatabase();
    
    try {
      let query = `
        SELECT id, name, profile_picture, is_online, last_seen, updated_at
        FROM users 
        WHERE is_approved = TRUE AND is_active = TRUE
      `;
      let params = [];
      
      if (userIds.length > 0) {
        query += ` AND id IN (${userIds.map(() => '?').join(',')})`;
        params = userIds;
      }
      
      query += ' ORDER BY is_online DESC, last_seen DESC';
      
      const users = await db.all(query, params);
      return users;
    } catch (error) {
      throw error;
    }
  }

  // Get analytics data for admin
  static async getAnalytics(days = 30) {
    const db = getDatabase();
    
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();
      
      // Get hourly activity for peak usage
      const hourlyActivity = await db.all(`
        SELECT 
          strftime('%H', timestamp) as hour,
          COUNT(*) as activity_count
        FROM user_activity_logs 
        WHERE timestamp >= ? AND action_type IN ('login', 'page_view', 'feature_use')
        GROUP BY hour
        ORDER BY hour
      `, [startDateStr]);
      
      // Get daily login counts
      const dailyLogins = await db.all(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(*) as total_logins
        FROM user_activity_logs 
        WHERE timestamp >= ? AND action_type = 'login'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `, [startDateStr]);
      
              // Clean up stale online status (users online for more than 30 minutes without activity)
      await db.run(`
        UPDATE users 
        SET is_online = 0 
        WHERE is_online = 1 
          AND last_seen < datetime('now', '-30 minutes')
          AND is_approved = TRUE 
          AND is_active = TRUE
      `);
  
      // Get current online users (EXCLUDE admins)
      const onlineUsers = await db.get(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE is_online = 1 
          AND is_approved = TRUE 
          AND is_active = TRUE
      `);
      
      // Get average session duration
      const avgSessionDuration = await db.get(`
        SELECT AVG(session_duration) as avg_duration
        FROM user_activity_logs 
        WHERE timestamp >= ? AND session_duration IS NOT NULL
      `, [startDateStr]);
      
      // Get most active users
      const mostActiveUsers = await db.all(`
        SELECT 
          u.id, u.name, u.email,
          COUNT(al.id) as activity_count,
          u.total_login_time,
          u.session_count,
          u.last_seen
        FROM users u
        LEFT JOIN user_activity_logs al ON u.id = al.user_id AND al.timestamp >= ?
        WHERE u.is_approved = TRUE
        GROUP BY u.id, u.name, u.email, u.total_login_time, u.session_count, u.last_seen
        ORDER BY activity_count DESC, u.total_login_time DESC
        LIMIT 10
      `, [startDateStr]);
      
      return {
        hourlyActivity,
        dailyLogins,
        onlineUsers: onlineUsers.count || 0,
        avgSessionDuration: avgSessionDuration.avg_duration || 0,
        mostActiveUsers,
        period: `${days} days`
      };
    } catch (error) {
      throw error;
    }
  }

  // Get current online users count only (excluding admins)
  static async getOnlineUsersCount() {
    const db = getDatabase();
    
    try {
      // Clean up stale online status first
      await db.run(`
        UPDATE users 
        SET is_online = 0 
        WHERE is_online = 1 
          AND last_seen < datetime('now', '-15 minutes')
          AND is_approved = TRUE 
          AND is_active = TRUE
      `);
      
      // Get current online users count
      const result = await db.get(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE is_online = 1 
          AND is_approved = TRUE 
          AND is_active = TRUE
      `);
      
      // Get total online users (including admins) for comparison
      const totalOnline = await db.get(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE is_online = 1 AND is_approved = TRUE AND is_active = TRUE
      `);
      
      // Debug logging
      console.log('📊 User.getOnlineUsersCount - Total online (including admins):', totalOnline.count || 0);
      console.log('📊 User.getOnlineUsersCount - Result:', result.count || 0);
      
      return result.count || 0;
    } catch (error) {
      console.error('Error getting online users count:', error);
      return 0;
    }
  }

  // Get user without sensitive data
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

export default User;
