import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetupsAPI } from '../utils/api';

const MeetupList = () => {
  const [meetups, setMeetups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  // Load meetups and invitations
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load meetups based on active tab
      let meetupsParams = {};
      if (activeTab === 'created') {
        meetupsParams.type = 'created';
      } else if (activeTab === 'participating') {
        meetupsParams.type = 'participating';
      }

      const [meetupsResponse, invitationsResponse] = await Promise.all([
        meetupsAPI.getMeetups(meetupsParams),
        meetupsAPI.getInvitations('pending')
      ]);

      // Handle meetups response
      if (meetupsResponse.ok) {
        const meetupsData = await meetupsResponse.json();
        if (meetupsData.success) {
          setMeetups(meetupsData.meetups);
        }
      } else {
        setError('Failed to load meetups');
      }

      // Handle invitations response
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        if (invitationsData.success) {
          setInvitations(invitationsData.invitations);
        }
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load meetup data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId, response) => {
    try {
      const apiResponse = await meetupsAPI.respondToInvitation(invitationId, response);
      
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        if (data.success) {
          setSuccess(`Invitation ${response} successfully`);
          
          // Remove invitation from list
          setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
          
          // Reload meetups to show updated data
          setTimeout(() => {
            loadData();
            setSuccess('');
          }, 2000);
        } else {
          setError(data.message || `Failed to ${response} invitation`);
        }
      } else {
        const errorData = await apiResponse.json().catch(() => ({}));
        setError(errorData.message || `Failed to ${response} invitation`);
      }
    } catch (err) {
      console.error('Error responding to invitation:', err);
      setError('Network error. Please try again.');
    }
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getMeetupStatus = (meetup) => {
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

  const getInvitationStatus = (invitation) => {
    const now = new Date();
    const meetupDate = new Date(invitation.date_time);
    
    if (invitation.meetup_status === 'cancelled') {
      return { text: 'Cancelled', color: 'bg-red-100 text-red-800' };
    } else if (meetupDate < now) {
      return { text: 'Expired', color: 'bg-gray-100 text-gray-800' };
    } else {
      return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const tabOptions = [
    { key: 'all', label: 'All Meetups', count: meetups.length },
    { key: 'created', label: 'Created by Me', count: meetups.filter(m => m.organizer_id === parseInt(localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')).id : 0)).length },
    { key: 'participating', label: 'Participating', count: meetups.filter(m => m.organizer_id !== parseInt(localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')).id : 0)).length }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
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
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Meetups</h1>
              <p className="text-gray-600 mt-1">Manage your meetups and invitations</p>
            </div>
            
            <button
              onClick={() => navigate('/meetups/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Meetup
            </button>
          </div>
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

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Invitations</h2>
              <p className="text-sm text-gray-600">Respond to meetup invitations</p>
            </div>
            <div className="divide-y divide-gray-200">
              {invitations.map((invitation) => {
                const { date, time } = formatDateTime(invitation.date_time);
                const status = getInvitationStatus(invitation);
                
                return (
                  <div key={invitation.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{invitation.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><span className="font-medium">Organized by:</span> {invitation.organizer_name}</p>
                          <p><span className="font-medium">Date:</span> {date} at {time}</p>
                          <p><span className="font-medium">Location:</span> {invitation.location}</p>
                          {invitation.description && (
                            <p><span className="font-medium">Description:</span> {invitation.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {status.text === 'Pending' && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleInvitationResponse(invitation.id, 'declined')}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabOptions.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } transition-colors`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Meetups List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading meetups...</p>
            </div>
          ) : meetups.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2m17 0H3m14-8a3 3 0 11-6 0 3 3 0 016 0zm-3-3a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-500 mb-4">No meetups found</p>
              <button
                onClick={() => navigate('/meetups/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Your First Meetup
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {meetups.map((meetup) => {
                const { date, time } = formatDateTime(meetup.date_time);
                const status = getMeetupStatus(meetup);
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const isOrganizer = meetup.organizer_id === userData.id;
                
                return (
                  <div key={meetup.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{meetup.title}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                          {isOrganizer && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                              Organizer
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          {!isOrganizer && (
                            <p><span className="font-medium">Organized by:</span> {meetup.organizer_name}</p>
                          )}
                          <p><span className="font-medium">Date:</span> {date} at {time}</p>
                          <p><span className="font-medium">Location:</span> {meetup.location}</p>
                          {meetup.description && (
                            <p><span className="font-medium">Description:</span> {meetup.description}</p>
                          )}
                          <p><span className="font-medium">Participants:</span> {meetup.participant_count || 0}</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => navigate(`/meetups/${meetup.id}`)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                        {isOrganizer && status.text === 'Upcoming' && (
                          <button
                            onClick={() => navigate(`/meetups/${meetup.id}/edit`)}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetupList;
