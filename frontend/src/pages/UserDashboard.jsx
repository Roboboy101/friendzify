import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userAPI, authAPI } from '../utils/api'
import CampusSchedule from '../components/CampusSchedule'
import Avatar from '../components/Avatar'
import NotificationCenter from '../components/NotificationCenter'

const UserDashboard = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('userToken')
        if (!token) {
          navigate('/signin')
          return
        }

        const response = await userAPI.getProfile()
        if (response.ok) {
          const data = await response.json()
          console.log('UserDashboard - Fetched user data:', data.user)
          console.log('UserDashboard - Profile picture URL:', data.user?.profile_picture)
          setUser(data.user)
          // Update localStorage with fresh data
          localStorage.setItem('userData', JSON.stringify(data.user))
        } else {
          // Token might be invalid
          localStorage.removeItem('userToken')
          localStorage.removeItem('userData')
          navigate('/signin')
        }
      } catch (error) {
        setError('Failed to load user data')
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log('Profile update event received, refreshing user data...')
      setLoading(true)
      fetchUserData()
    }

    // Listen for both custom event and focus event (when returning to dashboard)
    const handleWindowFocus = () => {
      console.log('Window focused, checking for profile updates...')
      fetchUserData()
    }

    window.addEventListener('profileUpdated', handleProfileUpdate)
    window.addEventListener('focus', handleWindowFocus)
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [navigate])

  const handleSignOut = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    localStorage.removeItem('userToken')
    localStorage.removeItem('userData')
    navigate('/')
  }

  const handleEditProfile = () => {
    navigate('/profile/edit')
  }

  const handleScheduleUpdate = (newSchedule) => {
    setUser(prev => ({
      ...prev,
      free_schedule: newSchedule
    }))
  }

  const handleOpenSchedule = () => {
    setShowScheduleModal(true)
  }

  const handleCloseSchedule = () => {
    setShowScheduleModal(false)
    // Refresh user data when schedule modal closes
    setTimeout(() => {
      console.log('Schedule modal closed, refreshing user data...')
      const token = localStorage.getItem('userToken')
      if (token) {
        setLoading(true)
        const fetchUserData = async () => {
          try {
            const response = await userAPI.getProfile()
            if (response.ok) {
              const data = await response.json()
              setUser(data.user)
              localStorage.setItem('userData', JSON.stringify(data.user))
            }
          } catch (error) {
            console.error('Error refreshing user data:', error)
          } finally {
            setLoading(false)
          }
        }
        fetchUserData()
      }
    }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
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
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Friendzify</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700 font-medium">{user?.name}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <div className="text-center">
                <Avatar
                  src={user?.profile_picture ? `http://localhost:5001${user.profile_picture}` : ''}
                  name={user?.name}
                  size={96}
                  className="mb-4"
                  version={user?.updated_at || user?.approved_date || user?.registration_date}
                />
                
                <h2 className="text-xl font-bold text-gray-900 mb-2">{user?.name}</h2>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                
                {user?.bio && (
                  <p className="text-gray-700 text-sm mb-4 bg-gray-50 rounded-lg p-3">
                    {user.bio}
                  </p>
                )}
                
                <div className="space-y-2 text-sm text-gray-600 mb-6">
                  {user?.department && (
                    <div className="flex justify-between">
                      <span>Department:</span>
                      <span className="font-medium">{user.department}</span>
                    </div>
                  )}
                  {user?.batch && (
                    <div className="flex justify-between">
                      <span>Batch:</span>
                      <span className="font-medium">{user.batch}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Joined:</span>
                    <span className="font-medium">
                      {new Date(user?.registration_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleEditProfile}
                  className="btn-primary w-full"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Welcome Section */}
            <div className="card p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome back, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-600 mb-6">
                You're all set to connect with your classmates and make the most of your academic journey.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-center transition-colors">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900">Find Friends</h3>
                  <p className="text-sm text-gray-600">Discover classmates</p>
                </button>
                
                <button onClick={() => navigate('/chat')} className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-center transition-colors">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900">Messages</h3>
                  <p className="text-sm text-gray-600">Chat with friends</p>
                </button>
                
                <button className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg text-center transition-colors">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900">Classes</h3>
                  <p className="text-sm text-gray-600">Share details</p>
                </button>
              </div>
            </div>

            {/* Quick Actions (moved above Campus Free Schedule) */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => navigate('/sos')}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">SOS Emergency</h3>
                      <p className="text-sm text-gray-600">Send emergency alert</p>
                    </div>
                  </div>
                </button>
                
                <button 
                  onClick={() => navigate('/close-friends')}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Close Friends</h3>
                      <p className="text-sm text-gray-600">Manage emergency contacts</p>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => navigate('/meetups')}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2m17 0H3m14-8a3 3 0 11-6 0 3 3 0 016 0zm-3-3a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Meetups</h3>
                      <p className="text-sm text-gray-600">Organize & join meetups</p>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => navigate('/report-to-admin')}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Report to Admin</h3>
                      <p className="text-sm text-gray-600">Bug reports & feedback</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Campus Free Schedule Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Campus Free Schedule</h2>
                <button
                  onClick={handleOpenSchedule}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Manage Schedule</span>
                </button>
              </div>
              
              {user?.free_schedule && user.free_schedule !== 'No schedule selected' ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-5">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-900">Your Available Times</h4>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        {user.free_schedule.split(', ').length} slots
                      </span>
                    </div>
                    
                    <div className="grid gap-3">
                      {user.free_schedule.split(', ').map((slot, index) => {
                        const [day, time] = slot.split(' ', 2)
                        const remainingTime = slot.substring(day.length + 1)
                        
                        return (
                          <div key={index} className="group hover:scale-105 transition-all duration-200">
                            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-primary-300 transition-all duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                    {day.substring(0, 3).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{day}</p>
                                    <p className="text-sm text-gray-600">{remainingTime}</p>
                                  </div>
                                </div>
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Classmates can see when you're available for study sessions and hangouts.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 12l-4-8h8l-4 8z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Set Your Campus Schedule</h4>
                      <p className="text-blue-800 text-sm mb-3">
                        Add your free time slots to help classmates know when you're available for study sessions and hangouts.
                      </p>
                      <button
                        onClick={handleOpenSchedule}
                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add Schedule</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Friends Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Friends & Network</h2>
                <button
                  onClick={() => navigate('/friends/search')}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Find Friends</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="text-lg font-bold text-blue-900">0</div>
                  <div className="text-xs text-blue-700">Friends</div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-lg font-bold text-green-900">0</div>
                  <div className="text-xs text-green-700">Pending</div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/friends')}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">My Friends</div>
                      <div className="text-sm text-gray-600">View and chat with friends</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate('/friends/requests')}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0l-3-3m3 3l-3 3m-6 2l3 3m-3-3l3-3" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Friend Requests</div>
                      <div className="text-sm text-gray-600">Manage pending requests</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            
          </div>
        </div>
      </div>

      {/* Campus Schedule Modal */}
      <CampusSchedule
        isOpen={showScheduleModal}
        onClose={handleCloseSchedule}
        currentSchedule={user?.free_schedule}
        onScheduleUpdate={handleScheduleUpdate}
      />
    </div>
  )
}

export default UserDashboard
