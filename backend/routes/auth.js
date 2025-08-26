import express from 'express';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { generateToken, storeSession, removeSession, verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, department, year, section, batch } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists.'
      });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      department,
      year,
      section,
      batch
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please wait for admin approval.',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password first
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      console.log(`Failed login attempt for user ${email}: Invalid password`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check if user can login (handles approval, active status, and restrictions)
    const loginCheck = await user.canLogin();
    if (!loginCheck.canLogin) {
      return res.status(401).json({
        success: false,
        message: loginCheck.message,
        reason: loginCheck.reason,
        details: loginCheck.details
      });
    }

    console.log(`Successful login for user ${email} (ID: ${user.id})`);
    console.log(`User approval status: ${user.is_approved}, Active status: ${user.is_active}`);

    // Generate token
    const token = generateToken(user.id, 'user');
    
    // Store session
    await storeSession(user.id, token, 'user');

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Find admin
    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials.'
      });
    }

    // Verify password
    const isPasswordValid = await admin.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials.'
      });
    }

    // Generate token
    const token = generateToken(admin.id, 'admin');
    
    // Store session
    await storeSession(admin.id, token, 'admin');

    res.json({
      success: true,
      message: 'Admin login successful!',
      token,
      admin: admin.toJSON()
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed. Please try again.'
    });
  }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await removeSession(req.token);
    
    res.json({
      success: true,
      message: 'Logout successful!'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed.'
    });
  }
});

// Get current user/admin info
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toJSON(),
      userType: req.userType
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information.'
    });
  }
});

// Create new admin (admin only)
router.post('/admin/create', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required.'
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists.'
      });
    }

    // Create new admin
    const admin = await Admin.create({
      email,
      password,
      name
    });

    res.status(201).json({
      success: true,
      message: 'New admin created successfully!',
      admin: admin.toJSON()
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin.'
    });
  }
});

export default router;
