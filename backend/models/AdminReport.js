import { getDatabase } from '../config/database.js';

class AdminReport {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.title = data.title;
    this.description = data.description;
    this.urgency = data.urgency;
    this.status = data.status;
    this.admin_notes = data.admin_notes;
    this.reviewed_by = data.reviewed_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // User details (when joined)
    this.user_name = data.user_name;
    this.user_email = data.user_email;
    
    // Admin details (when joined)
    this.reviewer_name = data.reviewer_name;
  }

  // Create a new admin report
  static async create(reportData) {
    const db = getDatabase();
    
    // Validate required fields
    if (!reportData.user_id || !reportData.type || !reportData.title || !reportData.description) {
      throw new Error('Missing required fields: user_id, type, title, description');
    }

    // Validate type
    const validTypes = ['bug_report', 'feedback', 'suggestion', 'other'];
    if (!validTypes.includes(reportData.type)) {
      throw new Error('Invalid report type');
    }

    // Validate urgency
    const validUrgencies = ['low', 'medium', 'high'];
    if (reportData.urgency && !validUrgencies.includes(reportData.urgency)) {
      throw new Error('Invalid urgency level');
    }

    // Set default urgency for non-bug reports
    const urgency = reportData.type === 'bug_report' ? (reportData.urgency || 'low') : 'low';
    
    const result = await db.run(`
      INSERT INTO admin_reports (user_id, type, title, description, urgency)
      VALUES (?, ?, ?, ?, ?)
    `, [
      reportData.user_id,
      reportData.type,
      reportData.title,
      reportData.description,
      urgency
    ]);
    
    return new AdminReport({
      id: result.lastID,
      ...reportData,
      urgency,
      status: 'new'
    });
  }

  // Get all admin reports with filters and pagination
  static async getAllReports(filters = {}) {
    const db = getDatabase();
    const {
      type,
      urgency,
      status,
      user_id,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = filters;

    let whereConditions = [];
    let params = [];

    if (type) {
      whereConditions.push('ar.type = ?');
      params.push(type);
    }

    if (urgency) {
      whereConditions.push('ar.urgency = ?');
      params.push(urgency);
    }

    if (status) {
      whereConditions.push('ar.status = ?');
      params.push(status);
    }

    if (user_id) {
      whereConditions.push('ar.user_id = ?');
      params.push(user_id);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    const validSortColumns = ['created_at', 'updated_at', 'urgency', 'status', 'type'];
    const orderBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const reports = await db.all(`
      SELECT 
        ar.*,
        u.name as user_name,
        u.email as user_email,
        a.name as reviewer_name
      FROM admin_reports ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN admins a ON ar.reviewed_by = a.id
      ${whereClause}
      ORDER BY ar.${orderBy} ${order}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return reports.map(report => new AdminReport(report));
  }

  // Get total count of reports for pagination
  static async getReportsCount(filters = {}) {
    const db = getDatabase();
    const { type, urgency, status, user_id } = filters;

    let whereConditions = [];
    let params = [];

    if (type) {
      whereConditions.push('type = ?');
      params.push(type);
    }

    if (urgency) {
      whereConditions.push('urgency = ?');
      params.push(urgency);
    }

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    if (user_id) {
      whereConditions.push('user_id = ?');
      params.push(user_id);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    const result = await db.get(`
      SELECT COUNT(*) as count 
      FROM admin_reports 
      ${whereClause}
    `, params);

    return result.count;
  }

  // Get report statistics
  static async getStatistics() {
    const db = getDatabase();
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_reports,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_reports,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_reports,
        COUNT(CASE WHEN type = 'bug_report' THEN 1 END) as bug_reports,
        COUNT(CASE WHEN type = 'feedback' THEN 1 END) as feedback_reports,
        COUNT(CASE WHEN type = 'suggestion' THEN 1 END) as suggestion_reports,
        COUNT(CASE WHEN urgency = 'high' THEN 1 END) as high_urgency,
        COUNT(CASE WHEN urgency = 'medium' THEN 1 END) as medium_urgency,
        COUNT(CASE WHEN urgency = 'low' THEN 1 END) as low_urgency
      FROM admin_reports
      WHERE created_at >= date('now', '-30 days')
    `);

    return stats;
  }

  // Get report by ID
  static async findById(reportId) {
    const db = getDatabase();
    
    const report = await db.get(`
      SELECT 
        ar.*,
        u.name as user_name,
        u.email as user_email,
        a.name as reviewer_name
      FROM admin_reports ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN admins a ON ar.reviewed_by = a.id
      WHERE ar.id = ?
    `, [reportId]);

    return report ? new AdminReport(report) : null;
  }

  // Update report status
  static async updateStatus(reportId, status, adminId, adminNotes = null) {
    const db = getDatabase();

    const validStatuses = ['new', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const result = await db.run(`
      UPDATE admin_reports 
      SET status = ?, 
          reviewed_by = ?, 
          admin_notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, adminId, adminNotes, reportId]);

    if (result.changes === 0) {
      throw new Error('Report not found');
    }

    return { success: true };
  }

  // Get most active reporters
  static async getMostActiveReporters(limit = 10) {
    const db = getDatabase();
    
    const reporters = await db.all(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(ar.id) as report_count,
        COUNT(CASE WHEN ar.status = 'new' THEN 1 END) as pending_reports
      FROM users u
      JOIN admin_reports ar ON u.id = ar.user_id
      WHERE ar.created_at >= date('now', '-30 days')
      GROUP BY u.id, u.name, u.email
      ORDER BY report_count DESC
      LIMIT ?
    `, [limit]);

    return reporters;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      user_name: this.user_name,
      user_email: this.user_email,
      type: this.type,
      title: this.title,
      description: this.description,
      urgency: this.urgency,
      status: this.status,
      admin_notes: this.admin_notes,
      reviewed_by: this.reviewed_by,
      reviewer_name: this.reviewer_name,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default AdminReport;
