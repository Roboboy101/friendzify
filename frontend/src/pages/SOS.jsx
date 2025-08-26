import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { sosAPI, closeFriendsAPI } from '../utils/api';
import SocketContext from '../contexts/SocketContext';

const SOS = () => {
  const navigate = useNavigate();
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const [closeFriendsCount, setCloseFriendsCount] = useState(0);
  const [activeAlert, setActiveAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [cancelCountdown, setCancelCountdown] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadData();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('sos_alert', handleSOSAlert);
      socket.on('sos_cancelled', handleSOSCancelled);
      
      return () => {
        socket.off('sos_alert', handleSOSAlert);
        socket.off('sos_cancelled', handleSOSCancelled);
      };
    }
  }, [socket]);

  // Countdown timer for cancel option
  useEffect(() => {
    let timer;
    if (cancelCountdown > 0) {
      timer = setTimeout(() => {
        setCancelCountdown(cancelCountdown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [cancelCountdown]);

  const loadData = async () => {
    try {
      const [countRes, alertsRes] = await Promise.all([
        closeFriendsAPI.getCloseFriendsCount(),
        sosAPI.getActiveAlerts()
      ]);

      const countData = await countRes.json();
      const alertsData = await alertsRes.json();

      if (countData.success) {
        setCloseFriendsCount(countData.count);
      }

      if (alertsData.success && alertsData.alerts.length > 0) {
        setActiveAlert(alertsData.alerts[0]); // Most recent active alert
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await sosAPI.getNotifications(10);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleSOSAlert = (data) => {
    setNotifications(prev => [data, ...prev]);
    
    // Show emergency notification
    alert(`🚨 EMERGENCY ALERT from ${data.alert?.user_name || 'Friend'}!\n\n"${data.alert?.message}"\n\nClick OK to view location.`);
    
    // Play alert sound/vibration for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate([1000, 500, 1000, 500, 1000]);
    }
    
    // Try to play alert sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      // Audio playback failed, continue silently
    }
  };

  const handleSOSCancelled = (data) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.alert?.id === data.alertId 
          ? { ...notif, alert: { ...notif.alert, is_cancelled: true } }
          : notif
      )
    );
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setLocationStatus('Getting your location...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let message = 'Location access denied';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  const handleSOSTrigger = async () => {
    if (closeFriendsCount === 0) {
      setError('You need to add close friends before you can send SOS alerts.');
      return;
    }

    setLoading(true);
    setError('');
    setLocationStatus('');

    try {
      // Get user's current location
      const location = await getCurrentLocation();
      setLocationStatus('Location obtained. Sending SOS alert...');

      // Optional: Get address from coordinates (reverse geocoding)
      let address = null;
      try {
        const geocodeResponse = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${location.latitude}+${location.longitude}&key=YOUR_API_KEY&limit=1`
        );
        // Note: You'll need to get an API key from OpenCage or use a different service
      } catch (geocodeError) {
        // Address lookup failed, continue without address
        console.log('Address lookup failed:', geocodeError);
      }

      // Create SOS alert
      const alertData = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address,
        message: "I need help! Here's my location"
      };

      const response = await sosAPI.createAlert(alertData);
      const data = await response.json();

      if (data.success) {
        setActiveAlert(data.alert);
        setCancelCountdown(10); // 10 second cancel window
        setLocationStatus(`🚨 Emergency alert sent to ${data.notified_friends} close friend${data.notified_friends !== 1 ? 's' : ''}!`);
      } else {
        setError(data.message || 'Failed to send SOS alert');
      }
    } catch (error) {
      console.error('SOS error:', error);
      setError(error.message || 'Failed to send SOS alert');
      setLocationStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSOS = async () => {
    if (!activeAlert) return;

    try {
      const response = await sosAPI.cancelAlert(activeAlert.id);
      const data = await response.json();

      if (data.success) {
        setActiveAlert(null);
        setCancelCountdown(0);
        setLocationStatus('SOS alert cancelled successfully');
        setTimeout(() => setLocationStatus(''), 3000);
      } else {
        setError(data.message || 'Failed to cancel SOS alert');
      }
    } catch (error) {
      console.error('Cancel SOS error:', error);
      setError('Failed to cancel SOS alert');
    }
  };

  const timeRemaining = activeAlert?.time_remaining;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Emergency SOS</h1>
                <p className="text-sm text-gray-500">Send help alerts to close friends</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/close-friends')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              Manage Close Friends
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

        {locationStatus && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 text-sm">{locationStatus}</p>
          </div>
        )}

        {/* Emergency Alerts from Friends - Moved to Top */}
        {notifications.length > 0 && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>Emergency Alerts from Friends</span>
                <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {notifications.length}
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.map((notification, index) => {
                const alert = notification.alert;
                return (
                  <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-xl">🚨</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Emergency Alert from {alert?.user_name || 'Friend'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(alert?.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-red-50 rounded-lg p-4 mb-4">
                          <p className="text-red-800 font-medium mb-2">"{alert?.message}"</p>
                          {alert?.address && (
                            <p className="text-red-700 text-sm mb-2">
                              📍 Location: {alert.address}
                            </p>
                          )}
                          <p className="text-red-600 text-xs">
                            Accuracy: ±{alert?.location_accuracy || 'Unknown'}m
                          </p>
                        </div>

                        <div className="flex items-center space-x-4">
                          {alert?.google_maps_link && (
                            <a
                              href={alert.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              View Location
                            </a>
                          )}
                          
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            alert?.is_active ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {alert?.is_cancelled ? '❌ Cancelled' : 
                             alert?.is_active ? '🔴 Active' : '⏰ Expired'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Alert Status */}
        {activeAlert && (
          <div className="mb-8 bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white rounded-2xl p-8 shadow-xl border border-red-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Emergency Alert Active</h2>
                    <p className="text-red-100 text-sm">Alert ID: #{activeAlert.id}</p>
                  </div>
                </div>
                <div className="space-y-2 text-red-50">
                  <p className="text-lg">✅ Close friends have been notified</p>
                  <p className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Live location shared</span>
                  </p>
                  {timeRemaining && (
                    <p className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Expires in {timeRemaining.minutes} minutes</span>
                    </p>
                  )}
                </div>
              </div>
              
              <div className="ml-6">
                {cancelCountdown > 0 ? (
                  <button
                    onClick={handleCancelSOS}
                    className="px-6 py-3 bg-white text-red-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg border-2 border-white"
                  >
                    Cancel ({cancelCountdown}s)
                  </button>
                ) : (
                  <button
                    onClick={handleCancelSOS}
                    className="px-6 py-3 bg-white text-red-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg"
                  >
                    Cancel Alert
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SOS Trigger Section */}
        {!activeAlert && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-10 text-center">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Emergency SOS</h2>
                <p className="text-gray-600 text-lg max-w-lg mx-auto leading-relaxed">
                  Send an emergency alert with your live location to your close friends when you need immediate help.
                </p>
              </div>

              {closeFriendsCount > 0 ? (
                <div className="space-y-6">
                  <button
                    onClick={handleSOSTrigger}
                    disabled={loading}
                    className="w-56 h-56 bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white rounded-full font-bold text-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mx-auto block border-4 border-white"
                  >
                    {loading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mb-3"></div>
                        <span className="text-lg">Getting Location...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-5xl mb-2">🚨</span>
                        <span className="text-xl">EMERGENCY</span>
                        <span className="text-lg font-medium">SOS</span>
                      </div>
                    )}
                  </button>
                  
                  <div className="bg-blue-50 rounded-xl p-4 max-w-md mx-auto">
                    <div className="flex items-center justify-center space-x-2 text-blue-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm font-medium">
                        Will alert {closeFriendsCount} close friend{closeFriendsCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-blue-600 space-y-1">
                      <p>✓ Live GPS location shared</p>
                      <p>✓ Google Maps link included</p>
                      <p>✓ 10-second cancel window</p>
                      <p>✓ 1-hour alert duration</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-56 h-56 bg-gray-200 text-gray-400 rounded-full font-bold text-xl flex items-center justify-center mx-auto border-4 border-gray-300">
                    <div className="text-center">
                      <span className="text-4xl mb-2 block">🚫</span>
                      <span className="text-lg">No Close Friends</span>
                      <span className="text-sm block mt-1">Setup Required</span>
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-6 max-w-md mx-auto">
                    <h3 className="text-amber-800 font-semibold mb-2">Setup Required</h3>
                    <p className="text-amber-700 text-sm mb-4">
                      You need to add close friends to use the emergency SOS feature. Close friends will receive your emergency alerts instantly.
                    </p>
                    <button
                      onClick={() => navigate('/close-friends')}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm"
                    >
                      Add Close Friends
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SOS Notifications from Friends */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Emergency Alerts from Friends</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {notifications.slice(0, 5).map((notification) => (
                  <div 
                    key={notification.notification_id}
                    className={`p-4 rounded-lg border-2 ${
                      notification.alert.is_cancelled 
                        ? 'border-gray-300 bg-gray-50' 
                        : 'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">
                            {notification.alert.is_cancelled ? '✅' : '🚨'}
                          </span>
                          <span className="font-medium text-gray-900">
                            {notification.alert.user_name}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            notification.alert.is_cancelled 
                              ? 'bg-gray-200 text-gray-700' 
                              : 'bg-red-200 text-red-700'
                          }`}>
                            {notification.alert.is_cancelled ? 'CANCELLED' : 'ACTIVE'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {notification.alert.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      
                      {!notification.alert.is_cancelled && (
                        <a
                          href={notification.alert.google_maps_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          View Location
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOS;
