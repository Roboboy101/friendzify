import { getDatabase } from '../config/database.js';

class Report {
  constructor(data = {}) {
    this.id = data.id;
    this.reporter_id = data.reporter_id;
    this.reported_user_id = data.reported_user_id;
    this.reason = data.reason;
    this.description = data.description;
    this.status = data.status;
    this.admin_notes = data.admin_notes;
    this.reviewed_by = data.reviewed_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new report
  static async create(reportData) {
    const db = getDatabase();
    
    // Check if user has already reported this person recently (within 24 hours)
    const recentReport = await db.get(`
      SELECT id FROM reports 
      WHERE reporter_id = ? AND reported_user_id = ? 
      AND created_at > datetime('now', '-24 hours')
      AND status IN ('pending', 'reviewed')
    `, [reportData.reporter_id, reportData.reported_user_id]);
    
    if (recentReport) {
      throw new Error('You have already reported this user recently. Please wait before submitting another report.');
    }
    
    // Validate that reporter and reported user are different
    if (reportData.reporter_id === reportData.reported_user_id) {
      throw new Error('You cannot report yourself.');
    }
    
    // Check if reported user exists and is active
    const reportedUser = await db.get(
      'SELECT id FROM users WHERE id = ? AND is_active = 1',
      [reportData.reported_user_id]
    );
    
    if (!reportedUser) {
      throw new Error('Reported user not found or inactive.');
    }
    
    const result = await db.run(`
      INSERT INTO reports (reporter_id, reported_user_id, reason, description)
      VALUES (?, ?, ?, ?)
    `, [
      reportData.reporter_id,
      reportData.reported_user_id,
      reportData.reason,
      reportData.description || null
    ]);
    
    return new Report({
      id: result.lastID,
      ...reportData,
      status: 'pending'
    });
  }

  // Get all reports for admin
  static async getAllReports(filters = {}) {
    const db = getDatabase();
    
    let query = `
      SELECT 
        r.*,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        reported.name as reported_user_name,
        reported.email as reported_user_email,
        admin.name as reviewed_by_name
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      LEFT JOIN admins admin ON r.reviewed_by = admin.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by status
    if (filters.status) {
      query += ` AND r.status = ?`;
      params.push(filters.status);
    }
    
    // Filter by reason
    if (filters.reason) {
      query += ` AND r.reason = ?`;
      params.push(filters.reason);
    }
    
    query += ` ORDER BY r.created_at DESC`;
    
    // Add limit if specified
    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
    }
    
    return await db.all(query, params);
  }

  // Get report by ID
  static async findById(id) {
    const db = getDatabase();
    
    const report = await db.get(`
      SELECT 
        r.*,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        reported.name as reported_user_name,
        reported.email as reported_user_email,
        admin.name as reviewed_by_name
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      LEFT JOIN admins admin ON r.reviewed_by = admin.id
      WHERE r.id = ?
    `, [id]);
    
    return report ? new Report(report) : null;
  }

  // Update report status (admin action)
  static async updateStatus(reportId, status, adminId, adminNotes = null) {
    const db = getDatabase();
    
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    const result = await db.run(`
      UPDATE reports 
      SET status = ?, reviewed_by = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, adminId, adminNotes, reportId]);
    
    if (result.changes === 0) {
      throw new Error('Report not found');
    }
    
    return { success: true };
  }

  // Get reports statistics for admin dashboard
  static async getStatistics() {
    const db = getDatabase();
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reports,
        SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed_reports,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_reports,
        SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed_reports,
        SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN 1 ELSE 0 END) as reports_this_week
      FROM reports
    `);
    
    return stats;
  }

  // Get most reported users
  static async getMostReportedUsers(limit = 10) {
    const db = getDatabase();
    
    return await db.all(`
      SELECT 
        u.id, u.name, u.email, u.department, u.batch,
        COUNT(r.id) as report_count,
        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending_reports
      FROM users u
      JOIN reports r ON u.id = r.reported_user_id
      WHERE u.is_active = 1
      GROUP BY u.id, u.name, u.email, u.department, u.batch
      ORDER BY report_count DESC
      LIMIT ?
    `, [limit]);
  }

  // Get available report reasons
  static getReportReasons() {
    return [
      'Inappropriate behavior',
      'Harassment or bullying',
      'Spam or unwanted messages',
      'Fake profile or impersonation',
      'Sharing inappropriate content',
      'Violation of community guidelines',
      'Abusive language',
      'Unwanted romantic advances',
      'Academic dishonesty',
      'Other'
    ];
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      reporter_id: this.reporter_id,
      reported_user_id: this.reported_user_id,
      reason: this.reason,
      description: this.description,
      status: this.status,
      admin_notes: this.admin_notes,
      reviewed_by: this.reviewed_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      reporter_name: this.reporter_name,
      reporter_email: this.reporter_email,
      reported_user_name: this.reported_user_name,
      reported_user_email: this.reported_user_email,
      reviewed_by_name: this.reviewed_by_name
    };
  }
}

export default Report;

