import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import AdminReport from '../models/AdminReport.js';

const router = express.Router();

// === ADMIN REPORT MANAGEMENT ROUTES ===

// Get all admin reports (admin only)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      type,
      urgency,
      status,
      user_id,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const [reports, totalCount] = await Promise.all([
      AdminReport.getAllReports({
        type,
        urgency,
        status,
        user_id,
        limit: parseInt(limit),
        offset,
        sortBy,
        sortOrder
      }),
      AdminReport.getReportsCount({
        type,
        urgency,
        status,
        user_id
      })
    ]);

    res.json({
      success: true,
      reports: reports.map(report => report.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get admin reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin reports.'
    });
  }
});

// Get admin report statistics
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = await AdminReport.getStatistics();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get admin report stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin report statistics.'
    });
  }
});

// Get most active reporters
router.get('/active-reporters', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const reporters = await AdminReport.getMostActiveReporters(parseInt(limit));
    
    res.json({
      success: true,
      reporters
    });
  } catch (error) {
    console.error('Get active reporters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active reporters.'
    });
  }
});

// Get specific admin report details
router.get('/:reportId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await AdminReport.findById(parseInt(reportId));
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }
    
    res.json({
      success: true,
      report: report.toJSON()
    });
  } catch (error) {
    console.error('Get admin report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report details.'
    });
  }
});

// Update admin report status
router.put('/:reportId/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    
    const validStatuses = ['new', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    await AdminReport.updateStatus(parseInt(reportId), status, req.user.id, adminNotes);
    
    res.json({
      success: true,
      message: `Report status updated to ${status} successfully.`
    });
  } catch (error) {
    console.error('Update admin report status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update report status.'
    });
  }
});

export default router;
