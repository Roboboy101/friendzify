import express from 'express';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Report from '../models/Report.js';
import SOS from '../models/SOS.js';
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

// === REPORT MANAGEMENT ROUTES ===

// Get all reports with filters
router.get('/reports', async (req, res) => {
  try {
    const { status, reason, limit = 50 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (reason) filters.reason = reason;
    if (limit) filters.limit = parseInt(limit);
    
    const reports = await Report.getAllReports(filters);
    
    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports.'
    });
  }
});

// Get report statistics
router.get('/reports/stats', async (req, res) => {
  try {
    const stats = await Report.getStatistics();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report statistics.'
    });
  }
});

// Get most reported users
router.get('/reports/most-reported', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const users = await Report.getMostReportedUsers(parseInt(limit));
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get most reported users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get most reported users.'
    });
  }
});

// Get specific report details
router.get('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await Report.findById(parseInt(reportId));
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }
    
    res.json({
      success: true,
      report: report.toJSON ? report.toJSON() : report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report details.'
    });
  }
});

// Update report status
router.put('/reports/:reportId/status', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    await Report.updateStatus(parseInt(reportId), status, req.user.id, adminNotes);
    
    res.json({
      success: true,
      message: `Report ${status} successfully.`
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update report status.'
    });
  }
});

// === ACCOUNT RESTRICTION ROUTES ===

// Restrict user account
router.post('/users/:userId/restrict', async (req, res) => {
  try {
    const { userId } = req.params;
    const { restrictionType, reason, durationDays } = req.body;
    
    // Validate restriction type
    const validTypes = ['temporary', 'permanent'];
    if (!validTypes.includes(restrictionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid restriction type. Must be temporary or permanent.'
      });
    }
    
    // Validate required fields
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Restriction reason is required.'
      });
    }
    
    // Validate duration for temporary restrictions
    if (restrictionType === 'temporary' && (!durationDays || durationDays < 1 || durationDays > 365)) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 365 days for temporary restrictions.'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    // Prevent restricting already restricted users
    if (user.is_restricted) {
      return res.status(400).json({
        success: false,
        message: 'User is already restricted. Remove existing restriction first.'
      });
    }
    
    const updatedUser = await user.setRestriction(restrictionType, reason, req.user.id, durationDays);
    
    res.json({
      success: true,
      message: `User account ${restrictionType === 'permanent' ? 'permanently blocked' : `temporarily restricted for ${durationDays} days`}.`,
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Restrict user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restrict user account.'
    });
  }
});

// Remove user restriction
router.delete('/users/:userId/restrict', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    if (!user.is_restricted) {
      return res.status(400).json({
        success: false,
        message: 'User is not currently restricted.'
      });
    }
    
    const updatedUser = await user.removeRestriction();
    
    res.json({
      success: true,
      message: 'User restriction removed successfully.',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Remove restriction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove user restriction.'
    });
  }
});

// Get restricted users
router.get('/users/restricted', async (req, res) => {
  try {
    const restrictedUsers = await User.getRestrictedUsers();
    
    res.json({
      success: true,
      users: restrictedUsers.map(user => user.toJSON())
    });
  } catch (error) {
    console.error('Get restricted users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get restricted users.'
    });
  }
});

// === SOS ALERT MANAGEMENT ROUTES ===

// Get all SOS alerts (active and historical)
router.get('/sos/alerts', async (req, res) => {
  try {
    const { 
      status = 'all', 
      page = 1, 
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const [alerts, totalCount] = await Promise.all([
      SOS.getAllAlertsForAdmin({
        status,
        limit: parseInt(limit),
        offset,
        sortBy,
        sortOrder
      }),
      SOS.getAlertsCountForAdmin(status)
    ]);
    
    res.json({
      success: true,
      alerts: alerts.map(alert => alert.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get SOS alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SOS alerts.'
    });
  }
});

// Get SOS alert statistics
router.get('/sos/stats', async (req, res) => {
  try {
    const stats = await SOS.getStatistics();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get SOS stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SOS statistics.'
    });
  }
});

// Get specific SOS alert details
router.get('/sos/alerts/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    const alert = await SOS.getAlertById(parseInt(alertId));
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found.'
      });
    }
    
    res.json({
      success: true,
      alert: alert.toJSON()
    });
  } catch (error) {
    console.error('Get SOS alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SOS alert details.'
    });
  }
});

// Admin cancel SOS alert
router.post('/sos/alerts/:alertId/cancel', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason } = req.body;
    
    const result = await SOS.adminCancelAlert(parseInt(alertId), req.user.id, reason);
    
    // Emit real-time notification about admin cancellation
    const io = req.app.get('io');
    if (io) {
      io.emit('sos_admin_cancelled', {
        alertId: parseInt(alertId),
        cancelledBy: 'admin',
        reason,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'SOS alert cancelled by admin successfully.',
      result
    });
  } catch (error) {
    console.error('Admin cancel SOS alert error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel SOS alert.'
    });
  }
});

export default router;
