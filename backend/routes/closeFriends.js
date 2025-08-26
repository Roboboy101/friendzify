import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import CloseFriends from '../models/CloseFriends.js';

const router = express.Router();

// Get user's close friends list
router.get('/', requireAuth, async (req, res) => {
  try {
    const closeFriends = await CloseFriends.getCloseFriends(req.user.id);
    
    res.json({
      success: true,
      closeFriends: closeFriends.map(friend => friend.toJSON()),
      count: closeFriends.length
    });
  } catch (error) {
    console.error('Error getting close friends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get close friends'
    });
  }
});

// Add a friend to close friends
router.post('/:friendId', requireAuth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    // Prevent adding self
    if (parseInt(friendId) === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add yourself to close friends'
      });
    }

    const result = await CloseFriends.addCloseFriend(userId, friendId);
    
    res.json({
      success: true,
      message: 'Friend added to close friends',
      closeFriendId: result.id
    });
  } catch (error) {
    console.error('Error adding close friend:', error);
    
    if (error.message.includes('not friends')) {
      return res.status(400).json({
        success: false,
        message: 'You can only add existing friends to close friends'
      });
    }
    
    if (error.message.includes('already in')) {
      return res.status(400).json({
        success: false,
        message: 'User is already in your close friends list'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add close friend'
    });
  }
});

// Remove a friend from close friends
router.delete('/:friendId', requireAuth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    const result = await CloseFriends.removeCloseFriend(userId, friendId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Friend not found in close friends list'
      });
    }

    res.json({
      success: true,
      message: 'Friend removed from close friends'
    });
  } catch (error) {
    console.error('Error removing close friend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove close friend'
    });
  }
});

// Check if a user is a close friend
router.get('/check/:friendId', requireAuth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    const isCloseFriend = await CloseFriends.isCloseFriend(userId, friendId);
    
    res.json({
      success: true,
      isCloseFriend
    });
  } catch (error) {
    console.error('Error checking close friend status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check close friend status'
    });
  }
});

// Get close friends count
router.get('/count', requireAuth, async (req, res) => {
  try {
    const count = await CloseFriends.getCloseFriendsCount(req.user.id);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting close friends count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get close friends count'
    });
  }
});

export default router;
