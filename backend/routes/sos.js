import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import SOS from '../models/SOS.js';
import CloseFriends from '../models/CloseFriends.js';

const router = express.Router();

// Create a new SOS alert
router.post('/alert', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, address, message } = req.body;
    const userId = req.user.id;

    // Validate required location data
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }

    // Check if user has close friends
    const closeFriendsCount = await CloseFriends.getCloseFriendsCount(userId);
    if (closeFriendsCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'You need to have close friends to send SOS alerts'
      });
    }

    // Create the SOS alert
    const alert = await SOS.createAlert(userId, {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      address,
      message
    });

    // Emit real-time notification to close friends via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const closeFriends = await CloseFriends.getCloseFriends(userId);
      
      closeFriends.forEach(friend => {
        io.to(`user_${friend.friend_id}`).emit('sos_alert', {
          alert: alert.toJSON(),
          type: 'emergency'
        });
      });
    }

    res.json({
      success: true,
      message: 'SOS alert sent successfully',
      alert: alert.toJSON(),
      notified_friends: closeFriendsCount
    });
  } catch (error) {
    console.error('Error creating SOS alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send SOS alert'
    });
  }
});

// Cancel an SOS alert
router.post('/alert/:alertId/cancel', requireAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = req.user.id;

    const result = await SOS.cancelAlert(alertId, userId);
    
    // Emit cancellation to close friends
    const io = req.app.get('io');
    if (io) {
      const closeFriends = await CloseFriends.getCloseFriends(userId);
      
      closeFriends.forEach(friend => {
        io.to(`user_${friend.friend_id}`).emit('sos_cancelled', {
          alertId: parseInt(alertId),
          userId,
          message: 'SOS alert has been cancelled'
        });
      });
    }

    res.json({
      success: true,
      message: 'SOS alert cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling SOS alert:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found or cannot be cancelled'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to cancel SOS alert'
    });
  }
});

// Get user's active SOS alerts
router.get('/alerts/active', requireAuth, async (req, res) => {
  try {
    const alerts = await SOS.getActiveAlertsForUser(req.user.id);
    
    res.json({
      success: true,
      alerts: alerts.map(alert => alert.toJSON())
    });
  } catch (error) {
    console.error('Error getting active alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active alerts'
    });
  }
});

// Get SOS notifications for user (alerts from close friends)
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const notifications = await SOS.getNotificationsForUser(req.user.id, parseInt(limit));
    
    res.json({
      success: true,
      notifications: notifications.map(notif => ({
        notification_id: notif.notification_id,
        is_read: notif.is_read,
        acknowledged_at: notif.acknowledged_at,
        alert: notif.alert.toJSON()
      }))
    });
  } catch (error) {
    console.error('Error getting SOS notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SOS notifications'
    });
  }
});

// Mark SOS notification as read
router.post('/notifications/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const result = await SOS.markNotificationAsRead(notificationId, userId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Get unread SOS notifications count
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await SOS.getUnreadNotificationsCount(req.user.id);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread notifications count'
    });
  }
});

// Get specific SOS alert details
router.get('/alert/:alertId', requireAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const alert = await SOS.getAlertById(alertId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found'
      });
    }

    // Check if user is authorized to view this alert
    const userId = req.user.id;
    const isOwner = alert.user_id === userId;
    const isNotified = await CloseFriends.isCloseFriend(alert.user_id, userId);
    
    if (!isOwner && !isNotified) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this SOS alert'
      });
    }

    res.json({
      success: true,
      alert: alert.toJSON()
    });
  } catch (error) {
    console.error('Error getting SOS alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SOS alert'
    });
  }
});

export default router;
