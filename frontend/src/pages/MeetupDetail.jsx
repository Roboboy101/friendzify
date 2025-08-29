import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { meetupsAPI, friendsAPI } from '../utils/api';

const MeetupDetail = () => {
  const { meetupId } = useParams();
  const [meetup, setMeetup] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    loadMeetupData();
  }, [meetupId]);

  const loadMeetupData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await meetupsAPI.getMeetup(meetupId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMeetup(data.meetup);
          setParticipants(data.participants || []);
        } else {
          setError(data.message || 'Failed to load meetup');
        }
      } else {
        if (response.status === 404) {
          setError('Meetup not found');
        } else {
          setError('Failed to load meetup');
        }
      }
    } catch (err) {
      console.error('Error loading meetup:', err);
      setError('Failed to load meetup data');
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await friendsAPI.getFriends();
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out friends who are already participants
          const participantIds = participants.map(p => p.user_id);
          const availableFriends = data.friends.filter(
            friend => !participantIds.includes(friend.id)
          );
          setFriends(availableFriends);
          setFilteredFriends(availableFriends);
        }
      }
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };

  const handleInviteFriends = async () => {
    if (selectedFriends.length === 0) {
      setError('Please select at least one friend to invite');
      return;
    }

    try {
      setInviteLoading(true);
      setError('');

      const response = await meetupsAPI.inviteFriends(meetupId, selectedFriends);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(`Invitations sent to ${data.invited_count} friend${data.invited_count !== 1 ? 's' : ''}`);
          setShowInviteModal(false);
          setSelectedFriends([]);
          
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(data.message || 'Failed to send invitations');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to send invitations');
      }
    } catch (err) {
      console.error('Error sending invitations:', err);
      setError('Network error. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteMeetup = async () => {
    try {
      setDeleteLoading(true);
      setError('');

      const response = await meetupsAPI.deleteMeetup(meetupId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess('Meetup deleted successfully');
          setTimeout(() => {
            navigate('/meetups');
          }, 2000);
        } else {
          setError(data.message || 'Failed to delete meetup');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to delete meetup');
      }
    } catch (err) {
      console.error('Error deleting meetup:', err);
      setError('Network error. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const openInviteModal = async () => {
    await loadFriends();
    setFriendSearchTerm('');
    setShowInviteModal(true);
  };

  // Filter friends based on search term
  useEffect(() => {
    if (!friendSearchTerm.trim()) {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend =>
        friend.name.toLowerCase().includes(friendSearchTerm.toLowerCase()) ||
        friend.email.toLowerCase().includes(friendSearchTerm.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [friendSearchTerm, friends]);

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getMeetupStatus = () => {
    if (!meetup) return { text: '', color: '' };
    
    const now = new Date();
    const meetupDate = new Date(meetup.date_time);
    
    if (meetup.status === 'cancelled') {
      return { text: 'Cancelled', color: 'bg-red-100 text-red-800' };
    } else if (meetup.status === 'completed') {
      return { text: 'Completed', color: 'bg-green-100 text-green-800' };
    } else if (meetupDate < now) {
      return { text: 'Past', color: 'bg-gray-100 text-gray-800' };
    } else {
      return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    }
  };

  const getGoogleMapsLink = (location) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meetup details...</p>
        </div>
      </div>
    );
  }

  if (error && !meetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/meetups')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Meetups
          </button>
        </div>
      </div>
    );
  }

  const isOrganizer = meetup && meetup.organizer_id === userData.id;
  const status = getMeetupStatus();
  const { date, time } = formatDateTime(meetup?.date_time || '');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/meetups')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Meetups
          </button>
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

        {/* Meetup Details */}
        {meetup && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header Section */}
            <div className="px-6 py-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">{meetup.title}</h1>
                    <span className={`px-3 py-1 text-sm rounded-full ${status.color}`}>
                      {status.text}
                    </span>
                    {isOrganizer && (
                      <span className="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-800">
                        Organizer
                      </span>
                    )}
                  </div>
                  {!isOrganizer && (
                    <p className="text-gray-600">Organized by {meetup.organizer_name}</p>
                  )}
                </div>
                
                {isOrganizer && status.text === 'Upcoming' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/meetups/${meetupId}/edit`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={openInviteModal}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Invite Friends
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date & Time */}
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-gray-900">Date & Time</h3>
                    <p className="text-gray-600">{date}</p>
                    <p className="text-gray-600">{time}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-gray-900">Location</h3>
                    <p className="text-gray-600">{meetup.location}</p>
                    <a
                      href={getGoogleMapsLink(meetup.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                </div>
              </div>

              {/* Description */}
              {meetup.description && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{meetup.description}</p>
                </div>
              )}
            </div>

            {/* Participants Section */}
            <div className="px-6 py-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">
                Participants ({participants.length})
              </h3>
              
              {participants.length === 0 ? (
                <p className="text-gray-500">No participants yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map((participant) => (
                    <div key={participant.user_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{participant.name}</p>
                        <p className="text-sm text-gray-500">{participant.email}</p>
                        {participant.user_id === meetup.organizer_id && (
                          <span className="text-xs text-purple-600">Organizer</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite Friends Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Friends</h3>
              
              {/* Search Input */}
              {friends.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search friends..."
                      value={friendSearchTerm}
                      onChange={(e) => setFriendSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {friendSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setFriendSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {friendSearchTerm ? (
                      `${filteredFriends.length} of ${friends.length} friends shown`
                    ) : (
                      `${friends.length} friends available`
                    )}
                  </p>
                </div>
              )}
              
              {friends.length === 0 ? (
                <p className="text-gray-500 mb-4">No friends available to invite</p>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-4 text-gray-500 mb-4">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>No friends match your search.</p>
                </div>
              ) : (
                <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center p-3 border-b border-gray-200 last:border-b-0">
                      <input
                        type="checkbox"
                        id={`invite-${friend.id}`}
                        checked={selectedFriends.includes(friend.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFriends(prev => [...prev, friend.id]);
                          } else {
                            setSelectedFriends(prev => prev.filter(id => id !== friend.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`invite-${friend.id}`} className="ml-3 flex items-center cursor-pointer flex-1">
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
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedFriends([]);
                    setFriendSearchTerm('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteFriends}
                  disabled={inviteLoading || selectedFriends.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {inviteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    `Invite ${selectedFriends.length} Friend${selectedFriends.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Meetup</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this meetup? This action cannot be undone and all participants will be notified.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMeetup}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Meetup'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetupDetail;
