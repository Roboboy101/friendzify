import { getDatabase } from '../config/database.js';
import bcrypt from 'bcryptjs';

export class Admin {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new admin (only existing admin can create)
  static async create(adminData) {
    const db = getDatabase();
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 12);
      
      const result = await db.run(`
        INSERT INTO admins (email, password, name) 
        VALUES (?, ?, ?)
      `, [
        adminData.email,
        hashedPassword,
        adminData.name
      ]);

      return await Admin.findById(result.lastID);
    } catch (error) {
      throw error;
    }
  }

  // Find admin by ID
  static async findById(id) {
    const db = getDatabase();
    
    try {
      const admin = await db.get('SELECT * FROM admins WHERE id = ?', [id]);
      return admin ? new Admin(admin) : null;
    } catch (error) {
      throw error;
    }
  }

  // Find admin by email
  static async findByEmail(email) {
    const db = getDatabase();
    
    try {
      const admin = await db.get('SELECT * FROM admins WHERE email = ?', [email]);
      return admin ? new Admin(admin) : null;
    } catch (error) {
      throw error;
    }
  }

  // Get all admins
  static async getAll() {
    const db = getDatabase();
    
    try {
      const admins = await db.all(`
        SELECT * FROM admins 
        ORDER BY created_at DESC
      `);
      
      return admins.map(admin => new Admin(admin));
    } catch (error) {
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Update admin profile
  async updateProfile(updateData) {
    const db = getDatabase();
    
    try {
      const updates = [];
      const values = [];
      
      const allowedFields = ['name', 'email'];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });
      
      if (updateData.password) {
        const hashedPassword = await bcrypt.hash(updateData.password, 12);
        updates.push('password = ?');
        values.push(hashedPassword);
      }
      
      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);
      
      await db.run(`
        UPDATE admins 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `, values);
      
      return await Admin.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Get admin dashboard statistics
  async getDashboardStats() {
    const db = getDatabase();
    
    try {
      // Total users
      const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
      
      // Pending approvals
      const pendingUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_approved = FALSE');
      
      // Active users
      const activeUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_approved = TRUE AND is_active = TRUE');
      
      // Suspended users
      const suspendedUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_active = FALSE');
      
      // Recent registrations (last 7 days)
      const recentRegistrations = await db.get(`
        SELECT COUNT(*) as count FROM users 
        WHERE registration_date >= datetime('now', '-7 days')
      `);

      return {
        totalUsers: totalUsers.count,
        pendingApprovals: pendingUsers.count,
        activeUsers: activeUsers.count,
        suspendedUsers: suspendedUsers.count,
        recentRegistrations: recentRegistrations.count
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user without sensitive data
  toJSON() {
    const { password, ...adminWithoutPassword } = this;
    return adminWithoutPassword;
  }
}
