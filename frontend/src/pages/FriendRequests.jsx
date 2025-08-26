import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendsAPI } from '../utils/api'
import Avatar from '../components/Avatar'

const FriendRequests = () => {
  const [activeTab, setActiveTab] = useState('received')
  const [receivedRequests, setReceivedRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [processingRequests, setProcessingRequests] = useState(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    loadRequests('received')
    loadRequests('sent')
  }, [])

  const loadRequests = async (type) => {
    setLoading(true)
    setError('')
    
    try {
      const response = await friendsAPI.getFriendRequests(type)
      const data = await response.json()
      
      if (data.success) {
        if (type === 'received') {
          setReceivedRequests(data.requests)
        } else {
          setSentRequests(data.requests)
        }
      } else {
        setError(data.message || 'Failed to load friend requests')
      }
    } catch (error) {
      console.error('Load requests error:', error)
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId) => {
    setProcessingRequests(prev => new Set(prev).add(requestId))
    
    try {
      const response = await friendsAPI.acceptFriendRequest(requestId)
      const data = await response.json()
      
      if (data.success) {
        // Remove from received requests
        setReceivedRequests(prev => prev.filter(req => req.id !== requestId))
        // You could also show a success message or redirect to friends list
      } else {
        setError(data.message || 'Failed to accept friend request')
      }
    } catch (error) {
      console.error('Accept request error:', error)
      setError('Network error. Please try again.')
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleRejectRequest = async (requestId) => {
    setProcessingRequests(prev => new Set(prev).add(requestId))
    
    try {
      const response = await friendsAPI.rejectFriendRequest(requestId)
      const data = await response.json()
      
      if (data.success) {
        // Remove from received requests
        setReceivedRequests(prev => prev.filter(req => req.id !== requestId))
      } else {
        setError(data.message || 'Failed to reject friend request')
      }
    } catch (error) {
      console.error('Reject request error:', error)
      setError('Network error. Please try again.')
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/friends/search')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Friend Requests</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/friends')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                My Friends
              </button>
              <button
                onClick={() => navigate('/friends/search')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Friends
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('received')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'received'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Received ({receivedRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sent'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sent ({sentRequests.length})
              </button>
            </nav>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-6 border-b border-gray-200">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Requests List */}
          <div className="divide-y divide-gray-200">
            {currentRequests.length > 0 ? (
              currentRequests.map(request => (
                <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar
                        src={request.profile_picture ? `http://localhost:5001${request.profile_picture}` : ''}
                        name={request.name}
                        size={56}
                        className=""
                      />
                      
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{request.name}</h4>
                        <p className="text-sm text-gray-600">{request.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                            {request.department}
                          </span>
                          {request.batch && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-medium">
                              Batch {request.batch}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDate(request.created_at)}
                          </span>
                        </div>
                        {request.bio && (
                          <p className="text-sm text-gray-700 mt-2 line-clamp-2">{request.bio}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex-shrink-0">
                      {activeTab === 'received' ? (
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingRequests.has(request.id)}
                            className={`px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg ${
                              processingRequests.has(request.id)
                                ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            } transition-colors`}
                          >
                            {processingRequests.has(request.id) ? 'Processing...' : 'Decline'}
                          </button>
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={processingRequests.has(request.id)}
                            className={`px-4 py-2 border border-transparent text-sm font-medium rounded-lg ${
                              processingRequests.has(request.id)
                                ? 'bg-primary-400 cursor-not-allowed'
                                : 'bg-primary-600 hover:bg-primary-700'
                            } text-white transition-colors`}
                          >
                            {processingRequests.has(request.id) ? 'Processing...' : 'Accept'}
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {activeTab} requests
                </h3>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'received' 
                    ? "You don't have any pending friend requests." 
                    : "You haven't sent any friend requests yet."
                  }
                </p>
                {activeTab === 'sent' && (
                  <button
                    onClick={() => navigate('/friends/search')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find Friends
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FriendRequests

