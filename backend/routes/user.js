import express from 'express';
import { User } from '../models/User.js';
import { verifyToken, requireApprovedUser } from '../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile.'
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const allowedUpdates = [
      'name', 'profile_picture', 'bio', 'department', 
      'year', 'section', 'batch', 'free_schedule'
    ];
    
    const updates = {};
    
    // Filter only allowed fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.'
      });
    }

    const updatedUser = await req.user.updateProfile(updates);
    
    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile.'
    });
  }
});

// Get approval status
router.get('/approval-status', async (req, res) => {
  try {
    res.json({
      success: true,
      isApproved: req.user.is_approved,
      isActive: req.user.is_active,
      registrationDate: req.user.registration_date,
      approvedDate: req.user.approved_date
    });
  } catch (error) {
    console.error('Get approval status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get approval status.'
    });
  }
});

// Routes that require approved status
router.use(requireApprovedUser);

// Get other users (approved users only)
router.get('/discover', async (req, res) => {
  try {
    const { department, year, section, search } = req.query;
    
    // For now, let's get all approved users except the current user
    // In a real application, you'd implement more sophisticated filtering
    const allUsers = await User.getApprovedUsers();
    
    let filteredUsers = allUsers.filter(user => user.id !== req.user.id);
    
    // Apply filters if provided
    if (department) {
      filteredUsers = filteredUsers.filter(user => 
        user.department && user.department.toLowerCase().includes(department.toLowerCase())
      );
    }
    
    if (year) {
      filteredUsers = filteredUsers.filter(user => user.year == year);
    }
    
    if (section) {
      filteredUsers = filteredUsers.filter(user => 
        user.section && user.section.toLowerCase().includes(section.toLowerCase())
      );
    }
    
    if (search) {
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        (user.bio && user.bio.toLowerCase().includes(search.toLowerCase()))
      );
    }

    res.json({
      success: true,
      users: filteredUsers.map(user => user.toJSON())
    });
  } catch (error) {
    console.error('Discover users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to discover users.'
    });
  }
});

// Get user by ID (for viewing profiles)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user || !user.is_approved || !user.is_active) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not available.'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user.'
    });
  }
});

export default router;
