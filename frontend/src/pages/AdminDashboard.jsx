import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI, authAPI } from '../utils/api'
import AccountRestrictionModal from '../components/AccountRestrictionModal'

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null)
  const [stats, setStats] = useState(null)
  const [pendingUsers, setPendingUsers] = useState([])
  const [approvedUsers, setApprovedUsers] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')
  const [showRestrictionModal, setShowRestrictionModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken')
        if (!token) {
          navigate('/admin')
          return
        }

        // Fetch admin data, stats, and users
        const [statsResponse, pendingResponse, approvedResponse] = await Promise.all([
          adminAPI.getDashboardStats(),
          adminAPI.getPendingUsers(),
          adminAPI.getApprovedUsers()
        ])

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.stats)
        }

        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json()
          setPendingUsers(pendingData.users)
        }

        if (approvedResponse.ok) {
          const approvedData = await approvedResponse.json()
          setApprovedUsers(approvedData.users)
        }

        // Get admin data from localStorage
        const adminData = localStorage.getItem('adminData')
        if (adminData) {
          setAdmin(JSON.parse(adminData))
        }

      } catch (error) {
        setError('Failed to load dashboard data')
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  const handleSignOut = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    navigate('/')
  }

  const handleApproveUser = async (userId) => {
    setActionLoading(userId)
    try {
      const response = await adminAPI.approveUser(userId)
      if (response.ok) {
        // Move user from pending to approved
        const user = pendingUsers.find(u => u.id === userId)
        setPendingUsers(prev => prev.filter(u => u.id !== userId))
        setApprovedUsers(prev => [...prev, { ...user, is_approved: true }])
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pendingApprovals: prev.pendingApprovals - 1,
          activeUsers: prev.activeUsers + 1
        }))
      }
    } catch (error) {
      console.error('Error approving user:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspendUser = async (userId, isActive) => {
    setActionLoading(userId)
    try {
      const response = await adminAPI.updateUserStatus(userId, isActive)
      if (response.ok) {
        // Update user status in approved users list
        setApprovedUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, is_active: isActive }
              : user
          )
        )
        
        // Update stats
        setStats(prev => ({
          ...prev,
          activeUsers: isActive ? prev.activeUsers + 1 : prev.activeUsers - 1,
          suspendedUsers: isActive ? prev.suspendedUsers - 1 : prev.suspendedUsers + 1
        }))
      }
    } catch (error) {
      console.error('Error updating user status:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestrictUser = (user) => {
    setSelectedUser(user)
    setShowRestrictionModal(true)
  }

  const handleRemoveRestriction = async (userId) => {
    if (!confirm('Are you sure you want to remove this user\'s restriction?')) {
      return
    }

    setActionLoading(userId)
    try {
      const response = await adminAPI.removeRestriction(userId)
      const data = await response.json()
      
      if (data.success) {
        // Update user in the list
        setApprovedUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, is_restricted: false, restriction_type: null, restriction_reason: null }
              : user
          )
        )
      } else {
        setError(data.message || 'Failed to remove restriction')
      }
    } catch (error) {
      console.error('Error removing restriction:', error)
      setError('Network error. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestrictionSuccess = (updatedUser) => {
    // Update user in the list
    setApprovedUsers(prev => 
      prev.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      )
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Admin Dashboard</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/reports')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Reports
              </button>
              
              <button
                onClick={() => navigate('/admin/analytics')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-medium text-sm">
                    {admin?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700 font-medium">{admin?.name}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Suspended</p>
                  <p className="text-2xl font-bold text-red-600">{stats.suspendedUsers}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.recentRegistrations}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tabs */}
        <div className="card">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'pending'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Approval ({pendingUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'approved'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Users ({approvedUsers.filter(u => u.is_active).length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'pending' && (
              <div>
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
                    <p className="text-gray-600">All user registrations have been reviewed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((user) => (
                      <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">{user.name}</h4>
                                <p className="text-gray-600">{user.email}</p>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                  {user.department && <span>Department: {user.department}</span>}
                                  {user.batch && <span>Batch: {user.batch}</span>}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                  Registered: {new Date(user.registration_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              disabled={actionLoading === user.id}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === user.id ? 'Approving...' : 'Approve'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'approved' && (
              <div>
                {approvedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No active users</h3>
                    <p className="text-gray-600">No users have been approved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedUsers.map((user) => (
                      <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-lg font-semibold text-gray-900">{user.name}</h4>
                                  <div className="flex space-x-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      user.is_active 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {user.is_active ? 'Active' : 'Suspended'}
                                    </span>
                                    {user.is_restricted && (
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        user.restriction_type === 'permanent' 
                                          ? 'bg-red-100 text-red-800' 
                                          : 'bg-orange-100 text-orange-800'
                                      }`}>
                                        {user.restriction_type === 'permanent' ? 'Blocked' : 'Restricted'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-gray-600">{user.email}</p>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                  {user.department && <span>Department: {user.department}</span>}
                                  {user.batch && <span>Batch: {user.batch}</span>}
                                </div>
                                {user.bio && (
                                  <p className="text-sm text-gray-600 mt-1 max-w-md">{user.bio}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            {/* Restriction Info */}
                            {user.is_restricted && (
                              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                <strong>Restricted:</strong> {user.restriction_reason}
                                {user.restriction_type === 'temporary' && user.restriction_end_date && (
                                  <div>Ends: {new Date(user.restriction_end_date).toLocaleDateString()}</div>
                                )}
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="mb-2">
                              <div className="text-xs text-gray-500 mb-1">
                                <strong>Suspend:</strong> Deactivate login • <strong>Restrict:</strong> Time-based blocking with reason
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSuspendUser(user.id, !user.is_active)}
                                disabled={actionLoading === user.id}
                                className={`px-3 py-1 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                  user.is_active
                                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                                title={user.is_active ? 'Suspend user account (deactivate login)' : 'Reactivate user account'}
                              >
                                {actionLoading === user.id 
                                  ? 'Processing...' 
                                  : user.is_active 
                                    ? 'Suspend' 
                                    : 'Reactivate'
                                }
                              </button>
                              
                              {user.is_restricted ? (
                                <button
                                  onClick={() => handleRemoveRestriction(user.id)}
                                  disabled={actionLoading === user.id}
                                  className="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Remove Restriction
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestrictUser(user)}
                                  disabled={actionLoading === user.id}
                                  className="px-3 py-1 rounded text-xs font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Restrict Account
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Restriction Modal */}
      {showRestrictionModal && selectedUser && (
        <AccountRestrictionModal
          user={selectedUser}
          onClose={() => {
            setShowRestrictionModal(false)
            setSelectedUser(null)
          }}
          onSuccess={handleRestrictionSuccess}
        />
      )}
    </div>
  )
}

export default AdminDashboard
