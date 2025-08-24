import express from 'express';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(verifyToken, requireAdmin);

// Get admin dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await req.user.getDashboardStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics.'
    });
  }
});

// Get pending user registrations
router.get('/users/pending', async (req, res) => {
  try {
    const pendingUsers = await User.getPendingUsers();
    
    res.json({
      success: true,
      users: pendingUsers.map(user => user.toJSON())
    });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending users.'
    });
  }
});

// Get all approved users
router.get('/users/approved', async (req, res) => {
  try {
    const approvedUsers = await User.getApprovedUsers();
    
    res.json({
      success: true,
      users: approvedUsers.map(user => user.toJSON())
    });
  } catch (error) {
    console.error('Get approved users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get approved users.'
    });
  }
});

// Approve user registration
router.post('/users/:userId/approve', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (user.is_approved) {
      return res.status(400).json({
        success: false,
        message: 'User is already approved.'
      });
    }

    const updatedUser = await user.approve(req.user.id);
    
    res.json({
      success: true,
      message: 'User approved successfully!',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve user.'
    });
  }
});

// Suspend/Activate user
router.post('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const updatedUser = await user.setActiveStatus(isActive);
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'suspended'} successfully!`,
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status.'
    });
  }
});

// Get user details by ID
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details.'
    });
  }
});

// Get all admins (admin only)
router.get('/admins', async (req, res) => {
  try {
    const admins = await Admin.getAll();
    
    res.json({
      success: true,
      admins: admins.map(admin => admin.toJSON())
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin list.'
    });
  }
});

// Delete user account (admin only)
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Note: In a real application, you might want to soft delete or archive users
    // For now, we'll just deactivate them
    await user.setActiveStatus(false);
    
    res.json({
      success: true,
      message: 'User account deactivated successfully.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user account.'
    });
  }
});

export default router;
