import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PendingApproval = () => {
  const [userData, setUserData] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Get user data from localStorage
    const storedUserData = localStorage.getItem('userData')
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData))
    } else {
      // If no user data, redirect to sign in
      navigate('/signin')
    }
  }, [navigate])

  const handleSignOut = () => {
    localStorage.removeItem('userToken')
    localStorage.removeItem('userData')
    navigate('/')
  }

  const handleCheckStatus = async () => {
    try {
      const token = localStorage.getItem('userToken')
      const response = await fetch('/api/user/approval-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isApproved) {
          // Update local storage and redirect to dashboard
          const updatedUserData = { ...userData, is_approved: true }
          localStorage.setItem('userData', JSON.stringify(updatedUserData))
          navigate('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error checking approval status:', error)
    }
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Friendzify</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            {/* Pending Icon */}
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Account Pending Approval
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              Welcome, <span className="font-medium text-gray-900">{userData.name}</span>! 
              Your account has been created successfully and is currently under review by our administrators.
            </p>

            {/* Status Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">What happens next?</h4>
                  <p className="text-sm text-blue-700">
                    Our admin team will review your registration details and approve your account within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Registration Details</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-medium">{userData.email}</span>
                </div>
                {userData.department && (
                  <div className="flex justify-between">
                    <span>Department:</span>
                    <span className="font-medium">{userData.department}</span>
                  </div>
                )}
                {userData.year && (
                  <div className="flex justify-between">
                    <span>Year:</span>
                    <span className="font-medium">{userData.year}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Registered:</span>
                  <span className="font-medium">
                    {new Date(userData.registration_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={handleCheckStatus}
                className="btn-primary w-full"
              >
                Check Approval Status
              </button>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/signin')}
                  className="btn-secondary flex-1"
                >
                  Sign In Again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="btn-secondary flex-1"
                >
                  Go Home
                </button>
              </div>
            </div>

            {/* Contact Support */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Need help? Contact our support team at{' '}
                <a href="mailto:support@friendzify.com" className="text-primary-600 hover:text-primary-500">
                  support@friendzify.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingApproval
