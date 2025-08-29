import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetupsAPI, friendsAPI } from '../utils/api';

const CreateMeetup = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date_time: '',
    invited_friends: []
  });
  
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();

  // Load friends list on component mount
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setFriendsLoading(true);
        const response = await friendsAPI.getFriends();
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setFriends(data.friends);
            setFilteredFriends(data.friends);
          }
        } else {
          setError('Failed to load friends list');
        }
      } catch (err) {
        console.error('Error loading friends:', err);
        setError('Failed to load friends list');
      } finally {
        setFriendsLoading(false);
      }
    };

    loadFriends();
  }, []);

  // Filter friends based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend =>
        friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        friend.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchTerm, friends]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleFriendToggle = (friendId) => {
    setFormData(prev => ({
      ...prev,
      invited_friends: prev.invited_friends.includes(friendId)
        ? prev.invited_friends.filter(id => id !== friendId)
        : [...prev.invited_friends, friendId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form data
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }
      
      if (!formData.location.trim()) {
        setError('Location is required');
        return;
      }
      
      if (!formData.date_time) {
        setError('Date and time are required');
        return;
      }

      // Validate date is in the future
      const selectedDate = new Date(formData.date_time);
      const now = new Date();
      if (selectedDate <= now) {
        setError('Meetup date must be in the future');
        return;
      }

      // Create meetup
      const response = await meetupsAPI.createMeetup(formData);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(`Meetup "${formData.title}" created successfully!`);
          
          // Reset form
          setFormData({
            title: '',
            description: '',
            location: '',
            date_time: '',
            invited_friends: []
          });

          // Redirect to meetups list after 2 seconds
          setTimeout(() => {
            navigate('/meetups');
          }, 2000);
        } else {
          setError(data.message || 'Failed to create meetup');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to create meetup');
      }
    } catch (err) {
      console.error('Error creating meetup:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum datetime for input (current time + 1 hour)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Meetup</h1>
          <p className="text-gray-600 mt-2">Organize a meetup with your friends</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Create Meetup Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meetup Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Group Study for Math Exam"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Date and Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                name="date_time"
                value={formData.date_time}
                onChange={handleInputChange}
                min={getMinDateTime()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Library Study Room 3, Main Campus"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add any additional details about the meetup..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              />
            </div>

            {/* Friend Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Invite Friends
              </label>
              
              {/* Search Input and Bulk Actions */}
              {friends.length > 0 && (
                <div className="mb-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search friends by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-500">
                      {searchTerm ? (
                        `${filteredFriends.length} of ${friends.length} friends shown`
                      ) : (
                        `${friends.length} friends available`
                      )}
                    </div>
                    {filteredFriends.length > 0 && (
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allFilteredIds = filteredFriends.map(f => f.id);
                            setFormData(prev => ({
                              ...prev,
                              invited_friends: [...new Set([...prev.invited_friends, ...allFilteredIds])]
                            }));
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-xs text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            const filteredIds = filteredFriends.map(f => f.id);
                            setFormData(prev => ({
                              ...prev,
                              invited_friends: prev.invited_friends.filter(id => !filteredIds.includes(id))
                            }));
                          }}
                          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {friendsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading friends...</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2m17 0H3m14-8a3 3 0 11-6 0 3 3 0 016 0zm-3-3a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No friends found. You can create the meetup and invite friends later.</p>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>No friends match your search. Try a different search term.</p>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        id={`friend-${friend.id}`}
                        checked={formData.invited_friends.includes(friend.id)}
                        onChange={() => handleFriendToggle(friend.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`friend-${friend.id}`}
                        className="ml-3 flex items-center cursor-pointer flex-1"
                      >
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{friend.name}</p>
                          <p className="text-xs text-gray-500">{friend.email}</p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.invited_friends.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {formData.invited_friends.length} friend{formData.invited_friends.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Meetup'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMeetup;
