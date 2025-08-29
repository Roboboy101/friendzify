import express from 'express';
import { requireAuth, requireApprovedUser } from '../middleware/auth.js';
import Friend from '../models/Friend.js';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Search users for adding friends
router.get('/search', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const { q: searchTerm, department, batch } = req.query;
    const userId = req.user.id;
    
    const users = await Friend.searchUsers(userId, searchTerm, { department, batch });
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
});

// Send friend request
router.post('/request', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const { userId: receiverId } = req.body;
    const senderId = req.user.id;
    
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    if (senderId === parseInt(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }
    
    const request = await Friend.sendFriendRequest(senderId, receiverId);
    
    // Send persistent notification to receiver
    const senderUser = await Friend.getUserById(senderId);
    const io = req.app.get('io');
    
    await Notification.sendNotification(receiverId, {
      type: 'friend_request_received',
      title: 'New Friend Request',
      message: `${senderUser.name} sent you a friend request`,
      data: {
        requestId: request.id,
        sender: {
          id: senderId,
          name: senderUser.name,
          email: senderUser.email,
          profile_picture: senderUser.profile_picture
        }
      },
      priority: 'normal',
      actions: [
        {
          label: 'View Requests',
          action: 'view_friend_requests'
        }
      ]
    }, io);
    
    res.json({
      success: true,
      message: 'Friend request sent successfully',
      request
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    
    if (error.message.includes('already exists') || error.message.includes('Already friends')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request'
    });
  }
});

// Get friend requests (received and sent)
router.get('/requests', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const { type = 'received' } = req.query;
    const userId = req.user.id;
    
    const requests = await Friend.getFriendRequests(userId, type);
    
    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get friend requests'
    });
  }
});

// Accept friend request
router.post('/requests/:requestId/accept', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    
    const requestDetails = await Friend.acceptFriendRequest(parseInt(requestId), userId);
    
    // Send persistent notification to requester
    if (requestDetails) {
      const accepterUser = await Friend.getUserById(userId);
      const io = req.app.get('io');
      
      await Notification.sendNotification(requestDetails.sender_id, {
        type: 'friend_request_accepted',
        title: 'Friend Request Accepted',
        message: `${accepterUser.name} accepted your friend request`,
        data: {
          requestId: parseInt(requestId),
          accepter: {
            id: userId,
            name: accepterUser.name,
            email: accepterUser.email,
            profile_picture: accepterUser.profile_picture
          }
        },
        priority: 'normal',
        actions: [
          {
            label: 'View Profile',
            action: 'view_profile',
            userId: userId
          },
          {
            label: 'Send Message',
            action: 'send_message',
            userId: userId
          }
        ]
      }, io);
    }
    
    res.json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    
    if (error.message.includes('not found') || error.message.includes('already processed')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to accept friend request'
    });
  }
});

// Reject friend request
router.post('/requests/:requestId/reject', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;
    
    await Friend.rejectFriendRequest(parseInt(requestId), userId);
    
    res.json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject friend request error:', error);
    
    if (error.message.includes('not found') || error.message.includes('already processed')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to reject friend request'
    });
  }
});

// Get friends list
router.get('/', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const friends = await Friend.getFriends(userId);
    
    res.json({
      success: true,
      friends
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get friends list'
    });
  }
});

// Remove friend
router.delete('/:friendId', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;
    
    await Friend.removeFriend(userId, parseInt(friendId));
    
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to remove friend'
    });
  }
});

// Get friendship status
router.get('/status/:userId', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const userId = req.user.id;
    
    const status = await Friend.getFriendshipStatus(userId, parseInt(otherUserId));
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get friendship status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get friendship status'
    });
  }
});

// Report a friend
router.post('/report', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const { reportedUserId, reason, description } = req.body;
    const reporterId = req.user.id;
    
    if (!reportedUserId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Reported user ID and reason are required'
      });
    }
    
    // Validate reason
    const validReasons = Report.getReportReasons();
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report reason'
      });
    }
    
    const report = await Report.create({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      description
    });
    
    res.json({
      success: true,
      message: 'Report submitted successfully. Our admin team will review it.',
      report: {
        id: report.id,
        reason: report.reason,
        status: report.status
      }
    });
  } catch (error) {
    console.error('Report friend error:', error);
    
    if (error.message.includes('already reported') || 
        error.message.includes('cannot report yourself') ||
        error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit report'
    });
  }
});

// Get report reasons
router.get('/report/reasons', requireAuth, requireApprovedUser, async (req, res) => {
  try {
    const reasons = Report.getReportReasons();
    
    res.json({
      success: true,
      reasons
    });
  } catch (error) {
    console.error('Get report reasons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report reasons'
    });
  }
});

export default router;

