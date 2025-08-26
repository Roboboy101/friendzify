import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendsAPI } from '../utils/api'
import Avatar from '../components/Avatar'
import ReportModal from '../components/ReportModal'
import ScheduleViewModal from '../components/ScheduleViewModal'

const FriendsList = () => {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [removingFriend, setRemovingFriend] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadFriends()
  }, [])

  const loadFriends = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await friendsAPI.getFriends()
      const data = await response.json()
      
      if (data.success) {
        setFriends(data.friends)
      } else {
        setError(data.message || 'Failed to load friends')
      }
    } catch (error) {
      console.error('Load friends error:', error)
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFriend = async (friend) => {
    if (!confirm(`Are you sure you want to remove ${friend.name} from your friends?`)) {
      return
    }

    setRemovingFriend(friend.id)
    
    try {
      const response = await friendsAPI.removeFriend(friend.id)
      const data = await response.json()
      
      if (data.success) {
        setFriends(prev => prev.filter(f => f.id !== friend.id))
      } else {
        setError(data.message || 'Failed to remove friend')
      }
    } catch (error) {
      console.error('Remove friend error:', error)
      setError('Network error. Please try again.')
    } finally {
      setRemovingFriend(null)
    }
  }

  const handleViewSchedule = (friend) => {
    setSelectedFriend(friend)
    setShowScheduleModal(true)
  }

  const handleReportFriend = (friend) => {
    setSelectedFriend(friend)
    setShowReportModal(true)
  }

  const formatFriendshipDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
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
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">My Friends ({friends.length})</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/friends/requests')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0l-3-3m3 3l-3 3m-6 2l3 3m-3-3l3-3" />
                </svg>
                Requests
              </button>
              <button
                onClick={() => navigate('/friends/search')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find More
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Friends List */}
        {friends.length > 0 ? (
          <div className="grid gap-6">
            {friends.map(friend => (
              <div key={friend.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar
                      src={friend.profile_picture ? `http://localhost:5001${friend.profile_picture}` : ''}
                      name={friend.name}
                      size={64}
                      className=""
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{friend.name}</h4>
                        <span className="text-xs text-gray-500">
                          Friends since {formatFriendshipDate(friend.friendship_date)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{friend.email}</p>
                      
                      <div className="flex items-center space-x-4 mb-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                          {friend.department}
                        </span>
                        {friend.batch && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-medium">
                            Batch {friend.batch}
                          </span>
                        )}
                      </div>
                      
                      {friend.bio && (
                        <p className="text-sm text-gray-700 mb-4 line-clamp-2">{friend.bio}</p>
                      )}

                      {/* Schedule Preview */}
                      {friend.free_schedule && friend.free_schedule !== 'No schedule selected' ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm font-medium text-green-900">Available Times</span>
                            </div>
                            <button
                              onClick={() => handleViewSchedule(friend)}
                              className="text-xs text-green-700 hover:text-green-800 font-medium"
                            >
                              View Full Schedule →
                            </button>
                          </div>
                          <div className="text-xs text-green-800">
                            {friend.free_schedule.split(', ').slice(0, 2).join(', ')}
                            {friend.free_schedule.split(', ').length > 2 && (
                              <span className="text-green-600">
                                {' '}and {friend.free_schedule.split(', ').length - 2} more...
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-gray-600">No schedule shared</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => navigate(`/chat/${friend.id}`)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Chat
                          </button>
                          
                          {friend.free_schedule && friend.free_schedule !== 'No schedule selected' && (
                            <button
                              onClick={() => handleViewSchedule(friend)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Schedule
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleReportFriend(friend)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Report user"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleRemoveFriend(friend)}
                            disabled={removingFriend === friend.id}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Remove friend"
                          >
                            {removingFriend === friend.id ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg className="w-20 h-20 text-gray-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-3">No friends yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start building your network by finding and connecting with your classmates.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/friends/search')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Friends
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showReportModal && selectedFriend && (
        <ReportModal
          friend={selectedFriend}
          onClose={() => {
            setShowReportModal(false)
            setSelectedFriend(null)
          }}
        />
      )}

      {showScheduleModal && selectedFriend && (
        <ScheduleViewModal
          friend={selectedFriend}
          onClose={() => {
            setShowScheduleModal(false)
            setSelectedFriend(null)
          }}
        />
      )}
    </div>
  )
}

export default FriendsList

