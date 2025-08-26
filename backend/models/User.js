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
        'batch', 'free_schedule'
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

  // Get user without sensitive data
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

export default User;
