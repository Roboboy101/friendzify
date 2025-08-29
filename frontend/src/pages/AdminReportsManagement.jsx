import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminReportsAPI } from '../utils/api';

const AdminReportsManagement = () => {
  // All state declarations together
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [activeReporters, setActiveReporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [pagination, setPagination] = useState({});
  
  const [filters, setFilters] = useState({
    type: '',
    urgency: '',
    status: '',
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  
  const navigate = useNavigate();

  // Debug component mounting
  useEffect(() => {
    console.log('🚀 AdminReportsManagement component mounted');
    return () => console.log('🔥 AdminReportsManagement component unmounted');
  }, []);

  // Load data when component mounts or filters change
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('🔍 Loading admin reports data...');
        console.log('🔑 Admin token available:', !!localStorage.getItem('adminToken'));
        
        // Check if adminReportsAPI is available
        if (!adminReportsAPI) {
          throw new Error('adminReportsAPI not available');
        }
        
        const [reportsResponse, statsResponse, reportersResponse] = await Promise.all([
          adminReportsAPI.getReports(filters),
          adminReportsAPI.getStats(),
          adminReportsAPI.getActiveReporters(5)
        ]);

        console.log('📡 Reports response status:', reportsResponse.status);
        console.log('📊 Stats response status:', statsResponse.status);
        console.log('👥 Reporters response status:', reportersResponse.status);

        if (reportsResponse.ok) {
          const reportsData = await reportsResponse.json();
          console.log('📋 Reports data:', reportsData);
          if (reportsData.success) {
            setReports(reportsData.reports);
            setPagination(reportsData.pagination);
          }
        } else {
          const errorText = await reportsResponse.text().catch(() => 'Unknown error');
          console.error('❌ Failed to load reports:', reportsResponse.status, errorText);
          setError(`Failed to load reports: ${reportsResponse.status} ${reportsResponse.statusText}`);
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('📈 Stats data:', statsData);
          if (statsData.success) {
            setStats(statsData.stats);
          }
        } else {
          const errorText = await statsResponse.text().catch(() => 'Unknown error');
          console.error('❌ Failed to load stats:', statsResponse.status, errorText);
        }

        if (reportersResponse.ok) {
          const reportersData = await reportersResponse.json();
          console.log('👥 Reporters data:', reportersData);
          if (reportersData.success) {
            setActiveReporters(Array.isArray(reportersData.reporters) ? reportersData.reporters : []);
          } else {
            setActiveReporters([]);
          }
        } else {
          const errorText = await reportersResponse.text().catch(() => 'Unknown error');
          console.warn('❌ Failed to load reporters:', reportersResponse.status, errorText);
          setActiveReporters([]);
        }
      } catch (error) {
        console.error('💥 useEffect loadReportsData error:', error);
        setError('Failed to load reports: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [filters.type, filters.urgency, filters.status, filters.page, filters.sortBy, filters.sortOrder, filters._refresh]);

  // Type options
  const reportTypes = [
    { value: '', label: 'All Types' },
    { value: 'bug_report', label: 'Bug Reports' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'suggestion', label: 'Suggestions' },
    { value: 'other', label: 'Other' }
  ];

  // Urgency options
  const urgencyLevels = [
    { value: '', label: 'All Urgencies' },
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' }
  ];

  // Status options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const refreshData = () => {
    // Force re-render by updating a filter timestamp
    setFilters(prev => ({ ...prev, _refresh: Date.now() }));
  };

  const handleStatusUpdate = async (reportId, newStatus) => {
    setActionLoading(reportId);

    try {
      const response = await adminReportsAPI.updateStatus(reportId, newStatus, adminNotes);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the report in the list
          setReports(prev => prev.map(report => 
            report.id === reportId 
              ? { ...report, status: newStatus, admin_notes: adminNotes }
              : report
          ));

          setShowModal(false);
          setSelectedReport(null);
          setAdminNotes('');
          
          // Refresh stats
          refreshData();
        } else {
          setError(data.message || 'Failed to update report status');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to update report status');
      }
    } catch (err) {
      console.error('Update report status error:', err);
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const openReportModal = (report) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setShowModal(true);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug_report':
        return <span className="text-red-600">🐛</span>;
      case 'feedback':
        return <span className="text-blue-600">💬</span>;
      case 'suggestion':
        return <span className="text-green-600">💡</span>;
      default:
        return <span className="text-gray-600">📋</span>;
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      bug_report: 'bg-red-100 text-red-800',
      feedback: 'bg-blue-100 text-blue-800',
      suggestion: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      bug_report: 'Bug Report',
      feedback: 'Feedback',
      suggestion: 'Suggestion',
      other: 'Other'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[type] || colors.other}`}>
        {labels[type] || 'Other'}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const colors = {
      high: 'bg-red-100 text-red-800 animate-pulse',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[urgency] || colors.low}`}>
        {urgency?.toUpperCase() || 'LOW'}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      new: 'New',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || colors.new}`}>
        {labels[status] || 'New'}
      </span>
    );
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  try {
    return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports Management</h1>
          <p className="text-gray-600">Manage user reports, feedback, and suggestions</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.total_reports || 0}</h3>
                <p className="text-sm text-gray-600">Total Reports (30d)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.new_reports || 0}</h3>
                <p className="text-sm text-gray-600">New Reports</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.in_progress_reports || 0}</h3>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.resolved_reports || 0}</h3>
                <p className="text-sm text-gray-600">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select 
                value={filters.type} 
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select 
                value={filters.urgency} 
                onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value, page: 1 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {urgencyLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select 
                value={filters.sortBy} 
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value, page: 1 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at">Date Created</option>
                <option value="updated_at">Last Updated</option>
                <option value="urgency">Urgency</option>
                <option value="status">Status</option>
              </select>
            </div>
            
            <button 
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Reports</h3>
          </div>
          
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{report.user_name}</div>
                          <div className="text-sm text-gray-500">{report.user_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(report.type)}
                          <span className="ml-2">{getTypeBadge(report.type)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={report.title}>
                          {report.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getUrgencyBadge(report.urgency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(report.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openReportModal(report)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page || 1} of {pagination.totalPages} ({pagination.total || reports.length} total reports)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                  disabled={(pagination.page || 1) === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, (prev.page || 1) + 1) }))}
                  disabled={(pagination.page || 1) === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Details Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Details</h3>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <div className="mt-1">{getTypeBadge(selectedReport.type)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Urgency</label>
                  <div className="mt-1">{getUrgencyBadge(selectedReport.urgency)}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="mt-1 text-sm text-gray-900">{selectedReport.title}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedReport.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted by</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReport.user_name} ({selectedReport.user_email})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatTimestamp(selectedReport.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this report..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Update Status</label>
              <div className="flex space-x-2">
                {statusOptions.slice(1).map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusUpdate(selectedReport.id, status.value)}
                    disabled={actionLoading === selectedReport.id}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedReport.status === status.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {actionLoading === selectedReport.id ? 'Updating...' : status.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedReport(null);
                  setAdminNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  } catch (renderError) {
    console.error('💥 AdminReportsManagement render error:', renderError);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <h3 className="font-bold">Error Loading Reports Management</h3>
            <p>Something went wrong. Please check the console and try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default AdminReportsManagement;
