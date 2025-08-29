import React, { useState, useEffect } from 'react';
import { adminSosAPI } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';

const AdminSOSManagement = () => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    status: 'all',
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [pagination, setPagination] = useState({});
  
  const { socket } = useSocket();

  useEffect(() => {
    loadSOSData();
  }, [filters]);

  useEffect(() => {
    if (socket) {
      socket.on('sos_alert', handleNewSOSAlert);
      socket.on('sos_cancelled', handleSOSCancelled);
      socket.on('sos_admin_cancelled', handleAdminSOSCancelled);

      return () => {
        socket.off('sos_alert', handleNewSOSAlert);
        socket.off('sos_cancelled', handleSOSCancelled);
        socket.off('sos_admin_cancelled', handleAdminSOSCancelled);
      };
    }
  }, [socket]);

  const loadSOSData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      console.log('🔍 AdminSOSManagement: Loading SOS data with filters:', filters);
      console.log('🔑 AdminSOSManagement: Admin token available:', !!localStorage.getItem('adminToken'));
      
      const [alertsResponse, statsResponse] = await Promise.all([
        adminSosAPI.getAlerts(filters),
        adminSosAPI.getStats()
      ]);

      console.log('📡 AdminSOSManagement: Alerts response status:', alertsResponse.status);
      console.log('📊 AdminSOSManagement: Stats response status:', statsResponse.status);

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        console.log('📋 AdminSOSManagement: Alerts data:', alertsData);
        if (alertsData.success) {
          setAlerts(alertsData.alerts);
          setPagination(alertsData.pagination);
        }
      } else {
        const errorText = await alertsResponse.text().catch(() => 'Unknown error');
        console.error('❌ Failed to load alerts:', alertsResponse.status, errorText);
        setError(`Failed to load SOS alerts: ${alertsResponse.status} ${alertsResponse.statusText}`);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('📈 AdminSOSManagement: Stats data:', statsData);
        if (statsData.success) {
          setStats(statsData.stats);
        }
      } else {
        const errorText = await statsResponse.text().catch(() => 'Unknown error');
        console.error('❌ Failed to load stats:', statsResponse.status, errorText);
        setError(prev => prev ? `${prev}; Stats error: ${statsResponse.statusText}` : `Failed to load SOS statistics: ${statsResponse.statusText}`);
      }
    } catch (err) {
      console.error('💥 Error loading SOS data:', err);
      setError('Failed to load SOS data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSOSAlert = (data) => {
    console.log('New SOS alert received:', data);
    // Refresh data to show new alert
    loadSOSData();
  };

  const handleSOSCancelled = (data) => {
    console.log('SOS alert cancelled:', data);
    // Update the specific alert in the list
    setAlerts(prev => prev.map(alert => 
      alert.id === data.alertId 
        ? { ...alert, is_cancelled: true, is_active: false, cancelled_at: data.timestamp }
        : alert
    ));
  };

  const handleAdminSOSCancelled = (data) => {
    console.log('SOS alert cancelled by admin:', data);
    // Update the specific alert in the list
    setAlerts(prev => prev.map(alert => 
      alert.id === data.alertId 
        ? { ...alert, is_cancelled: true, is_active: false, cancelled_at: data.timestamp }
        : alert
    ));
  };



  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeRemaining = (timeRemaining) => {
    if (!timeRemaining || timeRemaining.minutes <= 0) {
      return 'Expired';
    }
    return `${timeRemaining.minutes} min remaining`;
  };

  const getStatusBadge = (alert) => {
    if (alert.is_cancelled) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Cancelled</span>;
    }
    if (alert.is_active && alert.time_remaining?.minutes > 0) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 animate-pulse">🚨 ACTIVE</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Expired</span>;
  };

  const openGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SOS alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SOS Alert Management</h1>
          <p className="text-gray-600">Monitor and manage emergency SOS alerts from users</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.active_alerts || 0}</h3>
                <p className="text-sm text-gray-600">Active Alerts</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.total_alerts || 0}</h3>
                <p className="text-sm text-gray-600">Total Alerts (30d)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{stats.cancelled_alerts || 0}</h3>
                <p className="text-sm text-gray-600">Cancelled</p>
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
                <h3 className="text-lg font-semibold text-gray-900">{stats.expired_alerts || 0}</h3>
                <p className="text-sm text-gray-600">Expired</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Alerts</option>
                <option value="active">Active Only</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select 
                value={filters.sortBy} 
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value, page: 1 }))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at">Created Time</option>
                <option value="expires_at">Expiry Time</option>
                <option value="user_name">User Name</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select 
                value={filters.sortOrder} 
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value, page: 1 }))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DESC">Newest First</option>
                <option value="ASC">Oldest First</option>
              </select>
            </div>
            
            <button 
              onClick={loadSOSData}
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

        {/* Alerts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">SOS Alerts</h3>
          </div>
          
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No SOS alerts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Left</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{alert.user_name}</div>
                          <div className="text-sm text-gray-500">{alert.user_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(alert)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={alert.message}>
                          {alert.message}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openGoogleMaps(alert.latitude, alert.longitude)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          View Map
                        </button>
                        {alert.address && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={alert.address}>
                            {alert.address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(alert.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimeRemaining(alert.time_remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total alerts)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default AdminSOSManagement;
