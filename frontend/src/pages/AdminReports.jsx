import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import AccountRestrictionModal from '../components/AccountRestrictionModal';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [reportStats, setReportStats] = useState(null);
  const [mostReportedUsers, setMostReportedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    reason: ''
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [selectedUserForRestriction, setSelectedUserForRestriction] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    reviewed: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800'
  };

  const reportReasons = [
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

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [reportsResponse, statsResponse, mostReportedResponse] = await Promise.all([
        adminAPI.getReports(filters),
        adminAPI.getReportStats(),
        adminAPI.getMostReportedUsers(5)
      ]);

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData.reports || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setReportStats(statsData.stats);
      }

      if (mostReportedResponse.ok) {
        const mostReportedData = await mostReportedResponse.json();
        setMostReportedUsers(mostReportedData.users || []);
      }
    } catch (error) {
      console.error('Load reports error:', error);
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus) => {
    setActionLoading(reportId);

    try {
      const response = await adminAPI.updateReportStatus(reportId, newStatus, adminNotes);
      const data = await response.json();

      if (data.success) {
        // Update the report in the list
        setReports(prev => prev.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus, admin_notes: adminNotes, reviewed_by: 'Current Admin' }
            : report
        ));

        // Update stats
        setReportStats(prev => ({
          ...prev,
          pending_reports: newStatus === 'pending' ? prev.pending_reports + 1 : prev.pending_reports - 1,
          [`${newStatus}_reports`]: prev[`${newStatus}_reports`] + 1
        }));

        setShowReportModal(false);
        setSelectedReport(null);
        setAdminNotes('');
      } else {
        setError(data.message || 'Failed to update report status');
      }
    } catch (error) {
      console.error('Update report status error:', error);
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportClick = (report) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setShowReportModal(true);
  };

  const handleRestrictReportedUser = (report) => {
    setSelectedUserForRestriction({
      id: report.reported_user_id,
      name: report.reported_user_name,
      email: report.reported_user_email,
      department: 'N/A', // We'll get this from the full user data if needed
      batch: 'N/A'
    });
    setShowRestrictionModal(true);
  };

  const handleSuspendReportedUser = async (report, suspend = true) => {
    if (!confirm(`Are you sure you want to ${suspend ? 'suspend' : 'reactivate'} ${report.reported_user_name}?`)) {
      return;
    }

    setActionLoading(report.reported_user_id);
    try {
      const response = await adminAPI.updateUserStatus(report.reported_user_id, !suspend);
      const data = await response.json();
      
      if (data.success) {
        // Update the report status and add admin note
        await handleStatusUpdate(report.id, 'resolved', `User ${suspend ? 'suspended' : 'reactivated'} in response to this report.`);
      } else {
        setError(data.message || `Failed to ${suspend ? 'suspend' : 'reactivate'} user`);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestrictionSuccess = (updatedUser) => {
    setShowRestrictionModal(false);
    setSelectedUserForRestriction(null);
    
    // Update the report status if we have a selected report
    if (selectedReport) {
      handleStatusUpdate(selectedReport.id, 'resolved', `User account restricted in response to this report.`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Report Management</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Statistics Cards */}
        {reportStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{reportStats.total_reports}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{reportStats.pending_reports}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Reviewed</p>
                  <p className="text-2xl font-bold text-blue-600">{reportStats.reviewed_reports}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{reportStats.resolved_reports}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-purple-600">{reportStats.reports_this_week}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reports List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
                  <div className="flex space-x-3">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                    <select
                      value={filters.reason}
                      onChange={(e) => setFilters(prev => ({ ...prev, reason: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="">All Reasons</option>
                      {reportReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {reports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                    <p className="text-gray-600">No reports match the current filters.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{report.reporter_name}</div>
                              <div className="text-sm text-gray-500">{report.reporter_email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{report.reported_user_name}</div>
                              <div className="text-sm text-gray-500">{report.reported_user_email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{report.reason}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(report.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleReportClick(report)}
                                className="text-primary-600 hover:text-primary-900 text-xs font-medium"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => handleSuspendReportedUser(report, true)}
                                disabled={actionLoading === report.reported_user_id}
                                className="text-orange-600 hover:text-orange-900 text-xs font-medium disabled:opacity-50"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => handleRestrictReportedUser(report)}
                                className="text-red-600 hover:text-red-900 text-xs font-medium"
                              >
                                Restrict
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Most Reported Users */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Reported Users</h3>
              {mostReportedUsers.length === 0 ? (
                <p className="text-gray-600 text-sm">No users have been reported yet.</p>
              ) : (
                <div className="space-y-4">
                  {mostReportedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-500">{user.department} • {user.batch}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-red-600">{user.report_count}</div>
                        <div className="text-xs text-gray-500">reports</div>
                        {user.pending_reports > 0 && (
                          <div className="text-xs text-yellow-600">{user.pending_reports} pending</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Report Details</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reporter</label>
                    <div className="text-sm text-gray-900">{selectedReport.reporter_name}</div>
                    <div className="text-xs text-gray-500">{selectedReport.reporter_email}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reported User</label>
                    <div className="text-sm text-gray-900">{selectedReport.reported_user_name}</div>
                    <div className="text-xs text-gray-500">{selectedReport.reported_user_email}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <div className="text-sm text-gray-900">{selectedReport.reason}</div>
                </div>

                {selectedReport.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReport.description}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedReport.status]}`}>
                      {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reported On</label>
                    <div className="text-sm text-gray-900">{formatDate(selectedReport.created_at)}</div>
                  </div>
                </div>

                {selectedReport.admin_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Admin Notes</label>
                    <div className="text-sm text-gray-900 bg-blue-50 p-3 rounded-lg">{selectedReport.admin_notes}</div>
                  </div>
                )}

                <div>
                  <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    id="adminNotes"
                    rows="3"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add your notes about this report..."
                  />
                </div>
              </div>

              {/* User Actions */}
              <div className="pt-4 border-t border-gray-200 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">User Actions</h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSuspendReportedUser(selectedReport, true)}
                    disabled={actionLoading === selectedReport.reported_user_id}
                    className="px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    Suspend User
                  </button>
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      handleRestrictReportedUser(selectedReport);
                    }}
                    className="px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Restrict Account
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These actions will be applied to {selectedReport.reported_user_name} and the report will be marked as resolved.
                </p>
              </div>

              {/* Report Actions */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedReport.id, 'dismissed')}
                  disabled={actionLoading === selectedReport.id}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedReport.id, 'reviewed')}
                  disabled={actionLoading === selectedReport.id}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Mark Reviewed
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedReport.id, 'resolved')}
                  disabled={actionLoading === selectedReport.id}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Restriction Modal */}
      {showRestrictionModal && selectedUserForRestriction && (
        <AccountRestrictionModal
          user={selectedUserForRestriction}
          onClose={() => {
            setShowRestrictionModal(false);
            setSelectedUserForRestriction(null);
          }}
          onSuccess={handleRestrictionSuccess}
        />
      )}
    </div>
  );
};

export default AdminReports;
