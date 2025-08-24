import express from 'express';
import { User } from '../models/User.js';
import { verifyToken, requireApprovedUser } from '../middleware/auth.js';
import { uploadProfilePicture, handleUploadError, deleteOldProfilePicture } from '../middleware/upload.js';
import path from 'path';

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userData = req.user.toJSON();
    console.log('Backend - Returning user profile data:', userData);
    console.log('Backend - Profile picture URL:', userData.profile_picture);
    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile.'
    });
  }
});

// Upload profile picture
router.post('/profile/picture', uploadProfilePicture, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a profile picture.'
      });
    }

    const currentUser = req.user;
    
    // Delete old profile picture if exists
    if (currentUser.profile_picture) {
      const oldPath = path.join(process.cwd(), 'uploads', 'profile-pictures', path.basename(currentUser.profile_picture));
      deleteOldProfilePicture(oldPath);
    }

    // Generate URL for the uploaded file
    const fileUrl = `/uploads/profile-pictures/${req.file.filename}`;
    
    // Update user profile with new picture URL
    const updatedUser = await currentUser.updateProfile({
      profile_picture: fileUrl
    });

    res.json({
      success: true,
      message: 'Profile picture updated successfully!',
      user: updatedUser.toJSON(),
      profilePictureUrl: fileUrl
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture.'
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const allowedUpdates = [
      'name', 'profile_picture', 'bio', 'department', 
      'batch', 'free_schedule'
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
    const { department, batch, search } = req.query;
    
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
    
    if (batch) {
      filteredUsers = filteredUsers.filter(user => 
        user.batch && user.batch.toLowerCase().includes(batch.toLowerCase())
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
