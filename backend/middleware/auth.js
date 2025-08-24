import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';

// Generate JWT token
export const generateToken = (userId, userType, expiresIn = '7d') => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET || 'friendzify_secret_key_2024',
    { expiresIn }
  );
};

// Store session in database
export const storeSession = async (userId, token, userType) => {
  const db = getDatabase();
  
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await db.run(`
      INSERT INTO user_sessions (${userType}_id, token, user_type, expires_at) 
      VALUES (?, ?, ?, ?)
    `, [userId, token, userType, expiresAt.toISOString()]);
    
    return true;
  } catch (error) {
    console.error('Error storing session:', error);
    return false;
  }
};

// Remove session from database
export const removeSession = async (token) => {
  const db = getDatabase();
  
  try {
    await db.run('DELETE FROM user_sessions WHERE token = ?', [token]);
    return true;
  } catch (error) {
    console.error('Error removing session:', error);
    return false;
  }
};

// Verify token middleware
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'friendzify_secret_key_2024');
    
    // Check if session exists in database
    const db = getDatabase();
    const session = await db.get('SELECT * FROM user_sessions WHERE token = ?', [token]);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please login again.'
      });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await removeSession(token);
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }

    // Get user/admin details
    let user;
    if (decoded.userType === 'user') {
      user = await User.findById(decoded.userId);
      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive or not found.'
        });
      }
    } else if (decoded.userType === 'admin') {
      user = await Admin.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Admin account not found.'
        });
      }
    }

    req.user = user;
    req.userType = decoded.userType;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Admin-only middleware
export const requireAdmin = async (req, res, next) => {
  try {
    if (req.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in admin verification.'
    });
  }
};

// User-only middleware (approved users)
export const requireApprovedUser = async (req, res, next) => {
  try {
    if (req.userType !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User account required.'
      });
    }

    if (!req.user.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Account pending approval. Please wait for admin approval.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in user verification.'
    });
  }
};
