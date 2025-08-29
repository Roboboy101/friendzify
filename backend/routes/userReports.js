import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import AdminReport from '../models/AdminReport.js';

const router = express.Router();

// Submit a report to admin (user only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, title, description, urgency } = req.body;
    const userId = req.user.id;

    // Validation
    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, and description are required.'
      });
    }

    // Validate type
    const validTypes = ['bug_report', 'feedback', 'suggestion', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Must be one of: ' + validTypes.join(', ')
      });
    }

    // Validate urgency for bug reports
    if (type === 'bug_report' && urgency) {
      const validUrgencies = ['low', 'medium', 'high'];
      if (!validUrgencies.includes(urgency)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid urgency level. Must be one of: ' + validUrgencies.join(', ')
        });
      }
    }

    // Check for spam (limit to 5 reports per day per user)
    const { getDatabase } = await import('../config/database.js');
    const db = getDatabase();
    
    const todayReportsCount = await db.get(`
      SELECT COUNT(*) as count 
      FROM admin_reports 
      WHERE user_id = ? AND date(created_at) = date('now')
    `, [userId]);

    if (todayReportsCount.count >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Daily report limit reached. Please wait until tomorrow to submit more reports.'
      });
    }

    // Create the report
    const report = await AdminReport.create({
      user_id: userId,
      type,
      title: title.trim(),
      description: description.trim(),
      urgency: type === 'bug_report' ? (urgency || 'low') : 'low'
    });

    res.status(201).json({
      success: true,
      message: 'Your report/feedback has been submitted successfully.',
      report: report.toJSON()
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit report. Please try again.'
    });
  }
});

// Get user's own reports
router.get('/my-reports', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const [reports, totalCount] = await Promise.all([
      AdminReport.getAllReports({
        user_id: userId,
        limit: parseInt(limit),
        offset,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      }),
      AdminReport.getReportsCount({ user_id: userId })
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
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get your reports.'
    });
  }
});

// Get specific report details (user can only see their own)
router.get('/:reportId', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    
    const report = await AdminReport.findById(parseInt(reportId));
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }

    // Check if user owns this report
    if (report.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own reports.'
      });
    }
    
    res.json({
      success: true,
      report: report.toJSON()
    });
  } catch (error) {
    console.error('Get report details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report details.'
    });
  }
});

export default router;
