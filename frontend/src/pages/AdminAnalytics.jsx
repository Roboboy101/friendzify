import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [realTimeOnlineCount, setRealTimeOnlineCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  // Real-time updates for online count
  useEffect(() => {
    if (socket) {
      console.log('📊 Admin Analytics - Setting up socket listeners');
      
      const handleUserOnline = ({ userId, isOnline }) => {
        console.log('📊 Admin Analytics - User status changed:', { userId, isOnline });
        
        // Update real-time online count immediately
        setRealTimeOnlineCount(prev => {
          const newCount = isOnline ? prev + 1 : Math.max(0, prev - 1);
          console.log('📊 Online count updated:', prev, '→', newCount);
          return newCount;
        });
        
        // Update last updated timestamp
        setLastUpdated(new Date());
        
        // Always refresh from server for accuracy
        refreshOnlineCount();
      };

      const handleUserStatusChanged = ({ userId, isOnline }) => {
        console.log('📊 Admin Analytics - User status changed (global):', { userId, isOnline });
        handleUserOnline({ userId, isOnline });
      };

      const handleBulkUserOffline = ({ message, timestamp }) => {
        console.log('📊 Bulk cleanup:', message);
        // Refresh online count from server after bulk cleanup
        refreshOnlineCount();
      };

      // Listen for all relevant socket events
      socket.on('user_online', handleUserOnline);
      socket.on('user_status_changed', handleUserStatusChanged);
      socket.on('bulk_user_offline', handleBulkUserOffline);
      
      console.log('📊 Admin Analytics - Socket listeners attached');

      return () => {
        console.log('📊 Admin Analytics - Cleaning up socket listeners');
        socket.off('user_online', handleUserOnline);
        socket.off('user_status_changed', handleUserStatusChanged);
        socket.off('bulk_user_offline', handleBulkUserOffline);
      };
    } else {
      console.log('📊 Admin Analytics - No socket available');
    }
  }, [socket]);

  // Periodic refresh for accuracy
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('📊 Periodic analytics refresh');
      refreshOnlineCount();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshOnlineCount = async () => {
    try {
      console.log('📊 Refreshing online count from server...');
      const response = await analyticsAPI.getOnlineCount();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setRealTimeOnlineCount(data.data.onlineUsers);
        setLastUpdated(new Date());
        console.log('📊 Server online count updated:', data.data.onlineUsers);
      } else {
        console.warn('📊 Server returned error:', data.message);
      }
    } catch (error) {
      console.error('❌ Error refreshing online count:', error);
      // Don't update state on error, keep previous value
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      // Debug logging for tokens
      const adminToken = localStorage.getItem('adminToken');
      const userToken = localStorage.getItem('userToken');
      console.log('🔑 Admin Token:', adminToken ? 'Present' : 'Missing');
      console.log('🔑 User Token:', userToken ? 'Present' : 'Missing');
      
      const response = await analyticsAPI.getUserAnalytics(selectedPeriod);
      console.log('📊 Analytics API Response Status:', response.status);
      
      const data = await response.json();
      console.log('📊 Analytics API Response Data:', data);
      
      if (data.success) {
        setAnalytics(data.data);
        // Initialize real-time online count
        setRealTimeOnlineCount(data.data.onlineUsers || 0);
        setLastUpdated(new Date());
      } else {
        setError(data.message || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPeakHour = () => {
    if (!analytics?.hourlyActivity) return null;
    
    return analytics.hourlyActivity.reduce((peak, current) => {
      return current.activity_count > peak.activity_count ? current : peak;
    }, { hour: '00', activity_count: 0 });
  };

  const formatHour = (hour) => {
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:00 ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const peakHour = getPeakHour();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor user activity and platform usage</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadAnalytics}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-2">
            {[7, 30, 60, 90].map(days => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === days
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-2a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 flex items-center space-x-2">
                  <span>Online Users</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-400">
                    {new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                </p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-300">
                  {realTimeOnlineCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Peak Hour</p>
                <p className="text-2xl font-bold text-gray-900">
                  {peakHour ? formatHour(peakHour.hour) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Session</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(analytics?.avgSessionDuration)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Activity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.hourlyActivity?.reduce((sum, hour) => sum + hour.activity_count, 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Summary</h3>
          <p className="text-gray-600">
            Detailed analytics data for the selected {selectedPeriod} day period.
            Peak activity occurs at {peakHour ? formatHour(peakHour.hour) : 'N/A'} with {realTimeOnlineCount} users currently online (live).
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;