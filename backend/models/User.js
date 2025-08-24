import { getDatabase } from '../config/database.js';
import bcrypt from 'bcryptjs';

export class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.profile_picture = data.profile_picture;
    this.bio = data.bio;
    this.department = data.department;
    this.year = data.year;
    this.section = data.section;
    this.batch = data.batch;
    this.free_schedule = data.free_schedule;
    this.is_approved = data.is_approved;
    this.is_active = data.is_active;
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
          email, password, name, department, year, section, batch
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userData.email,
        hashedPassword,
        userData.name,
        userData.department || null,
        userData.year || null,
        userData.section || null,
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
        'year', 'section', 'batch', 'free_schedule'
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

  // Get user without sensitive data
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}
