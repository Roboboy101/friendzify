import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Combined middleware for admin authentication
const requireAdminAuth = [verifyToken, requireAdmin];

// Get user analytics for admin dashboard
router.get('/users', requireAdminAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const analytics = await User.getAnalytics(parseInt(days));
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Get online users count
router.get('/online-count', requireAdminAuth, async (req, res) => {
  try {
    console.log('📊 Analytics - Online count requested by admin');
    const onlineCount = await User.getOnlineUsersCount();
    console.log('📊 Analytics - Online count result:', onlineCount);
    res.json({
      success: true,
      data: {
        onlineUsers: onlineCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching online count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch online users count'
    });
  }
});

// Get peak usage hours
router.get('/peak-hours', requireAdminAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const analytics = await User.getAnalytics(parseInt(days));
    
    // Find peak hour
    const peakHour = analytics.hourlyActivity.reduce((peak, current) => {
      return current.activity_count > peak.activity_count ? current : peak;
    }, { hour: '00', activity_count: 0 });
    
    res.json({
      success: true,
      data: {
        peakHour: peakHour.hour,
        peakActivity: peakHour.activity_count,
        hourlyBreakdown: analytics.hourlyActivity,
        period: analytics.period
      }
    });
  } catch (error) {
    console.error('Error fetching peak hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch peak usage hours'
    });
  }
});

// Get detailed user activity status for friends (no admin auth required)
router.get('/activity-status', verifyToken, async (req, res) => {
  try {
    const { userIds } = req.query;
    let userIdArray = [];
    
    if (userIds) {
      userIdArray = Array.isArray(userIds) ? userIds : userIds.split(',').map(id => parseInt(id));
    }
    
    const users = await User.getUsersWithActivityStatus(userIdArray);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching activity status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity status'
    });
  }
});

export default router;
