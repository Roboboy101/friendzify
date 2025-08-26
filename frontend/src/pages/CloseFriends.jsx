import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { closeFriendsAPI, friendsAPI } from '../utils/api';
import Avatar from '../components/Avatar';

const CloseFriends = () => {
  const navigate = useNavigate();
  const [closeFriends, setCloseFriends] = useState([]);
  const [allFriends, setAllFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [closeFriendsRes, allFriendsRes] = await Promise.all([
        closeFriendsAPI.getCloseFriends(),
        friendsAPI.getFriends()
      ]);

      const closeFriendsData = await closeFriendsRes.json();
      const allFriendsData = await allFriendsRes.json();

      if (closeFriendsData.success) {
        setCloseFriends(closeFriendsData.closeFriends);
      } else {
        setError('Failed to load close friends: ' + (closeFriendsData.message || 'Unknown error'));
      }

      if (allFriendsData.success) {
        setAllFriends(allFriendsData.friends);
      } else {
        setError('Failed to load friends: ' + (allFriendsData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Network error loading friends data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCloseFriend = async (friendId) => {
    setActionLoading(friendId);
    try {
      const response = await closeFriendsAPI.addCloseFriend(friendId);
      const data = await response.json();

      if (data.success) {
        await loadData(); // Refresh the lists
        setError('');
      } else {
        setError(data.message || 'Failed to add close friend');
      }
    } catch (error) {
      console.error('Network error adding close friend:', error);
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveCloseFriend = async (friendId) => {
    if (!confirm('Remove this friend from your close friends list?')) return;

    setActionLoading(friendId);
    try {
      const response = await closeFriendsAPI.removeCloseFriend(friendId);
      const data = await response.json();

      if (data.success) {
        await loadData(); // Refresh the lists
        setError('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error removing close friend:', error);
      setError('Failed to remove close friend');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter out friends who are already close friends
  const availableFriends = allFriends.filter(friend => 
    !closeFriends.some(closeFriend => closeFriend.friend_id === friend.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading close friends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/friends')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Close Friends</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Add Close Friend
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* SOS Info */}
        <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Emergency SOS System</h3>
              <p className="text-red-800 text-sm mb-3">
                Close friends will receive your SOS alerts in emergency situations. They'll get your live location, 
                a help message, and can assist you immediately.
              </p>
              <div className="flex items-center space-x-4 text-sm text-red-700">
                <span>📍 Live GPS Location</span>
                <span>⏰ 1 Hour Duration</span>
                <span>🚨 Instant Notifications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Close Friends List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Close Friends ({closeFriends.length})
              </h2>
              <div className="text-sm text-gray-500">
                Will receive your SOS alerts
              </div>
            </div>
          </div>

          <div className="p-6">
            {closeFriends.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Close Friends Yet</h3>
                <p className="text-gray-600 mb-4">
                  Add friends to your close friends list to enable SOS emergency alerts.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Add Your First Close Friend
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {closeFriends.map((friend) => (
                  <div key={friend.friend_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar
                        src={friend.profile_picture}
                        name={friend.name}
                        size="w-12 h-12"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {friend.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {friend.department} • {friend.batch}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span>SOS Enabled</span>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveCloseFriend(friend.friend_id)}
                        disabled={actionLoading === friend.friend_id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                      >
                        {actionLoading === friend.friend_id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Close Friend Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Add Close Friend</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {availableFriends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">All your friends are already in your close friends list!</p>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableFriends.map((friend) => (
                    <div key={friend.friend_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={friend.profile_picture}
                          name={friend.name}
                          size="w-10 h-10"
                        />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{friend.name}</h4>
                          <p className="text-xs text-gray-500">{friend.department} • {friend.batch}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleAddCloseFriend(friend.id)}
                        disabled={actionLoading === friend.id}
                        className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === friend.id ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloseFriends;
