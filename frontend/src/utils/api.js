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

  // Add token if available
  const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
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

  login: (credentials) => 
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

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
    })
}

export default { apiCall, authAPI, userAPI, adminAPI }
