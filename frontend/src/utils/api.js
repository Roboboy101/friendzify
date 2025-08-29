// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    ...options
  }

  // Set default headers only if not uploading files
  if (!(options.body instanceof FormData)) {
    config.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
  } else {
    // For FormData, let browser set Content-Type automatically
    config.headers = {
      ...options.headers
    }
  }

  // Add token if available - prioritize adminToken for admin endpoints
  let token
  if (endpoint.includes('/admin/') || endpoint.includes('/analytics/')) {
    token = localStorage.getItem('adminToken') || localStorage.getItem('userToken')
    console.log('🔑 Using admin-priority token for:', endpoint, token ? 'Found' : 'Missing')
  } else {
    token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    console.log('🔑 Using user-priority token for:', endpoint, token ? 'Found' : 'Missing')
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, config)
    return response
  } catch (error) {
    console.error('API call error:', error)
    throw error
  }
}

// Auth API calls
export const authAPI = {
  // User authentication
  register: (userData) => 
    apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  login: async (credentials) => {
    const response = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
    return await response.json()
  },

  // Admin authentication
  adminLogin: (credentials) => 
    apiCall('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  logout: () => 
    apiCall('/api/auth/logout', {
      method: 'POST'
    }),

  getMe: () => 
    apiCall('/api/auth/me'),

  createAdmin: (adminData) => 
    apiCall('/api/auth/admin/create', {
      method: 'POST',
      body: JSON.stringify(adminData)
    })
}

// User API calls
export const userAPI = {
  getProfile: () => 
    apiCall('/api/user/profile'),

  updateProfile: (profileData) => 
    apiCall('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),

  uploadProfilePicture: (formData) => 
    apiCall('/api/user/profile/picture', {
      method: 'POST',
      body: formData
    }),

  getApprovalStatus: () => 
    apiCall('/api/user/approval-status'),

  discoverUsers: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString()
    return apiCall(`/api/user/discover${queryParams ? `?${queryParams}` : ''}`)
  },

  getUserById: (userId) => 
    apiCall(`/api/user/${userId}`)
}

// Close Friends API calls
export const closeFriendsAPI = {
  getCloseFriends: () => 
    apiCall('/api/close-friends'),

  addCloseFriend: (friendId) => 
    apiCall(`/api/close-friends/${friendId}`, {
      method: 'POST'
    }),

  removeCloseFriend: (friendId) => 
    apiCall(`/api/close-friends/${friendId}`, {
      method: 'DELETE'
    }),

  checkCloseFriend: (friendId) => 
    apiCall(`/api/close-friends/check/${friendId}`),

  getCloseFriendsCount: () => 
    apiCall('/api/close-friends/count')
};

// SOS API calls
export const sosAPI = {
  createAlert: (locationData) => 
    apiCall('/api/sos/alert', {
      method: 'POST',
      body: JSON.stringify(locationData)
    }),

  cancelAlert: (alertId) => 
    apiCall(`/api/sos/alert/${alertId}/cancel`, {
      method: 'POST'
    }),

  getActiveAlerts: () => 
    apiCall('/api/sos/alerts/active'),

  getNotifications: (limit = 50) => 
    apiCall(`/api/sos/notifications?limit=${limit}`),

  markNotificationAsRead: (notificationId) => 
    apiCall(`/api/sos/notifications/${notificationId}/read`, {
      method: 'POST'
    }),

  getUnreadCount: () => 
    apiCall('/api/sos/notifications/unread-count'),

  getAlertDetails: (alertId) => 
    apiCall(`/api/sos/alert/${alertId}`)
};

// Admin API calls
export const adminAPI = {
  getDashboardStats: () => 
    apiCall('/api/admin/dashboard/stats'),

  getPendingUsers: () => 
    apiCall('/api/admin/users/pending'),

  getApprovedUsers: () => 
    apiCall('/api/admin/users/approved'),

  approveUser: (userId) => 
    apiCall(`/api/admin/users/${userId}/approve`, {
      method: 'POST'
    }),

  updateUserStatus: (userId, isActive) => 
    apiCall(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ isActive })
    }),

  getUserById: (userId) => 
    apiCall(`/api/admin/users/${userId}`),

  getAdmins: () => 
    apiCall('/api/admin/admins'),

  deleteUser: (userId) => 
    apiCall(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    }),

  // Report management
  getReports: (filters = {}) => {
    const params = new URLSearchParams(filters).toString()
    return apiCall(`/api/admin/reports${params ? `?${params}` : ''}`)
  },

  getReportStats: () => 
    apiCall('/api/admin/reports/stats'),

  getMostReportedUsers: (limit = 10) => 
    apiCall(`/api/admin/reports/most-reported?limit=${limit}`),

  getReportDetails: (reportId) => 
    apiCall(`/api/admin/reports/${reportId}`),

  updateReportStatus: (reportId, status, adminNotes = '') => 
    apiCall(`/api/admin/reports/${reportId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes })
    }),

  // Account restrictions
  restrictUser: (userId, restrictionType, reason, durationDays = null) => 
    apiCall(`/api/admin/users/${userId}/restrict`, {
      method: 'POST',
      body: JSON.stringify({ restrictionType, reason, durationDays })
    }),

  removeRestriction: (userId) => 
    apiCall(`/api/admin/users/${userId}/restrict`, {
      method: 'DELETE'
    }),

  getRestrictedUsers: () => 
    apiCall('/api/admin/users/restricted')
}

// Friends API calls
export const friendsAPI = {
  searchUsers: (searchTerm = '', filters = {}) => {
    const params = new URLSearchParams()
    if (searchTerm) params.append('q', searchTerm)
    if (filters.department) params.append('department', filters.department)
    if (filters.batch) params.append('batch', filters.batch)
    return apiCall(`/api/friends/search?${params.toString()}`)
  },

  sendFriendRequest: (userId) => 
    apiCall('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),

  getFriendRequests: (type = 'received') => 
    apiCall(`/api/friends/requests?type=${type}`),

  acceptFriendRequest: (requestId) => 
    apiCall(`/api/friends/requests/${requestId}/accept`, {
      method: 'POST'
    }),

  rejectFriendRequest: (requestId) => 
    apiCall(`/api/friends/requests/${requestId}/reject`, {
      method: 'POST'
    }),

  getFriends: () => 
    apiCall('/api/friends'),

  removeFriend: (friendId) => 
    apiCall(`/api/friends/${friendId}`, {
      method: 'DELETE'
    }),

  getFriendshipStatus: (userId) => 
    apiCall(`/api/friends/status/${userId}`),

  reportFriend: (reportData) => 
    apiCall('/api/friends/report', {
      method: 'POST',
      body: JSON.stringify(reportData)
    }),

  getReportReasons: () => 
    apiCall('/api/friends/report/reasons')
}

// Chat API calls
export const chatAPI = {
  getConversations: () => 
    apiCall('/api/chat/conversations'),

  getConversation: (userId, limit = 50, offset = 0) => 
    apiCall(`/api/chat/conversation/${userId}?limit=${limit}&offset=${offset}`),

  sendMessage: (receiverId, message, messageType = 'text') => 
    apiCall('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ receiverId, message, messageType })
    }),

  markAsRead: (userId) => 
    apiCall(`/api/chat/read/${userId}`, {
      method: 'POST'
    }),

  getUnreadCount: () => 
    apiCall('/api/chat/unread-count'),

  deleteMessage: (messageId) => 
    apiCall(`/api/chat/${messageId}`, {
      method: 'DELETE'
    })
}

// Analytics API calls
export const analyticsAPI = {
  // Admin-only analytics endpoints
  getUserAnalytics: (days = 30) => 
    apiCall(`/api/analytics/users?days=${days}`),

  getOnlineCount: () => 
    apiCall('/api/analytics/online-count'),

  getPeakHours: (days = 7) => 
    apiCall(`/api/analytics/peak-hours?days=${days}`),

  // User-accessible activity status (no special admin token needed)
  getActivityStatus: (userIds = []) => {
    const query = userIds.length > 0 ? `?userIds=${userIds.join(',')}` : '';
    return apiCall(`/api/analytics/activity-status${query}`);
  }
}

// Admin SOS Management API calls
export const adminSosAPI = {
  // Get all SOS alerts with filtering and pagination
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/api/admin/sos/alerts?${query}`);
  },

  // Get SOS statistics
  getStats: () => 
    apiCall('/api/admin/sos/stats'),

  // Get specific SOS alert details
  getAlert: (alertId) => 
    apiCall(`/api/admin/sos/alerts/${alertId}`),

  // Admin cancel SOS alert
  cancelAlert: (alertId, reason = null) => 
    apiCall(`/api/admin/sos/alerts/${alertId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
}

export default { apiCall, authAPI, userAPI, adminAPI, friendsAPI, chatAPI, closeFriendsAPI, sosAPI, analyticsAPI, adminSosAPI }
