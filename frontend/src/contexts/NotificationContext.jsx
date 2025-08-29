import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketContext';
import { notificationsAPI, chatAPI } from '../utils/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadBySender, setUnreadBySender] = useState({});
  const { socket } = useSocket();

  // Load persistent notifications on mount
  useEffect(() => {
    const loadPersistentNotifications = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await notificationsAPI.getNotifications({ limit: 100, unread_only: true });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Normalize any stale chat timestamps to ISO now if missing timezone
            const normalized = (data.notifications || []).map(n => {
              if (n.type === 'new_message') {
                // If server delivered normalized timestamp it's used; else fallback to now
                return { ...n, timestamp: n.timestamp || new Date().toISOString() };
              }
              return n;
            });
            setNotifications(normalized);
          }
        }
      } catch (error) {
        console.error('Failed to load persistent notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistentNotifications();
  }, []);

  // Add a new notification
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    // Increment sender-specific counter for chat messages
    try {
      if (newNotification.type === 'new_message' && newNotification.data && newNotification.data.sender) {
        const senderId = parseInt(newNotification.data.sender.id);
        if (!Number.isNaN(senderId)) {
          setUnreadBySender(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
        }
      }
    } catch {}
    return newNotification.id;
  };

  // Remove a notification
  const removeNotification = async (id) => {
    try {
      // Try to delete from server if it's a persistent notification
      if (typeof id === 'number' && id > 1000000) {
        await notificationsAPI.deleteNotification(id);
      }
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Still remove from local state even if server call fails
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }
  };

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      // Try to mark as read on server if it's a persistent notification
      if (typeof id === 'number' && id > 1000000) {
        await notificationsAPI.markAsRead(id);
      }
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Still mark as read locally even if server call fails
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    }
  };

  // Mark all chat message notifications from a specific sender as read
  const markChatNotificationsRead = async (senderId) => {
    try {
      // Tell server to mark as read and dismiss
      await chatAPI.markAsRead(senderId);
    } catch (e) {
      // Non-fatal; still update local state
      console.warn('markChatNotificationsRead: server mark failed, applying locally', e);
    }

    // Update local state regardless so UI clears instantly
    setNotifications(prev => (
      prev.map(notif => {
        if (
          notif.type === 'new_message' &&
          notif.data && notif.data.sender &&
          (parseInt(notif.data.sender.id) === parseInt(senderId) || parseInt(notif.data.senderId) === parseInt(senderId))
        ) {
          return { ...notif, read: true };
        }
        return notif;
      })
    ));
    setUnreadBySender(prev => ({ ...prev, [parseInt(senderId)]: 0 }));
  };

  // Clear all notifications
  const clearAll = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Still clear locally even if server call fails
      setNotifications([]);
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(notif => !notif.read).length;

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Listen for new real-time notifications from server
    socket.on('notification', (data) => {
      // Normalize timestamps; for chat messages, prefer "now" to avoid TZ skew
      const normalizedTimestamp = (data.type === 'new_message')
        ? new Date().toISOString()
        : (() => {
            try {
              if (data.timestamp) return new Date(data.timestamp).toISOString();
              if (data.created_at) return new Date(`${String(data.created_at).replace(' ', 'T')}Z`).toISOString();
            } catch {}
            return new Date().toISOString();
          })();

      const newNotification = {
        id: data.id || Date.now() + Math.random(),
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        priority: data.priority || 'normal',
        actions: data.actions || [],
        read: data.is_read || false,
        timestamp: normalizedTimestamp
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      // bump counters for chat notifications coming via server notification
      try {
        if (newNotification.type === 'new_message' && newNotification.data && newNotification.data.sender) {
          const senderId = parseInt(newNotification.data.sender.id);
          if (!Number.isNaN(senderId)) {
            setUnreadBySender(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
          }
        }
      } catch {}
    });

    // Meetup invitation received
    socket.on('meetup_invitation', (data) => {
      addNotification({
        type: 'meetup_invitation',
        title: 'New Meetup Invitation',
        message: data.message || `You've been invited to "${data.meetup.title}"`,
        data: data,
        actions: [
          {
            label: 'View',
            action: 'view_meetup',
            meetupId: data.meetup.id
          }
        ]
      });
    });

    // Meetup response received (for organizers)
    socket.on('meetup_response', (data) => {
      addNotification({
        type: 'meetup_response',
        title: 'Meetup Response',
        message: data.message || `${data.responder.name} ${data.responder.response} your meetup invitation`,
        data: data,
        actions: [
          {
            label: 'View Meetup',
            action: 'view_meetup',
            meetupId: data.meetup_id
          }
        ]
      });
    });

    // Meetup updated
    socket.on('meetup_updated', (data) => {
      addNotification({
        type: 'meetup_updated',
        title: 'Meetup Updated',
        message: data.message || `Meetup "${data.meetup.title}" has been updated`,
        data: data,
        actions: [
          {
            label: 'View Changes',
            action: 'view_meetup',
            meetupId: data.meetup.id
          }
        ]
      });
    });

    // Meetup cancelled
    socket.on('meetup_cancelled', (data) => {
      addNotification({
        type: 'meetup_cancelled',
        title: 'Meetup Cancelled',
        message: data.message || `Meetup "${data.meetup.title}" has been cancelled`,
        data: data,
        priority: 'high'
      });
    });

    // Meetup reminders
    socket.on('meetup_reminder', (data) => {
      addNotification({
        type: 'meetup_reminder',
        title: 'Meetup Reminder',
        message: data.message || `Reminder: "${data.meetup.title}" starts in 1 hour`,
        data: data,
        priority: 'high',
        actions: [
          {
            label: 'View Meetup',
            action: 'view_meetup',
            meetupId: data.meetup.id
          }
        ]
      });
    });

    // Friend request received
    socket.on('friend_request_received', (data) => {
      addNotification({
        type: 'friend_request_received',
        title: 'New Friend Request',
        message: data.message || `${data.sender.name} sent you a friend request`,
        data: data,
        priority: 'normal',
        actions: [
          {
            label: 'View Requests',
            action: 'view_friend_requests'
          }
        ]
      });
    });

    // Friend request accepted
    socket.on('friend_request_accepted', (data) => {
      addNotification({
        type: 'friend_request_accepted',
        title: 'Friend Request Accepted',
        message: data.message || `${data.accepter.name} accepted your friend request`,
        data: data,
        priority: 'normal',
        actions: [
          {
            label: 'View Profile',
            action: 'view_profile',
            userId: data.accepter.id
          },
          {
            label: 'Send Message',
            action: 'send_message',
            userId: data.accepter.id
          }
        ]
      });
    });

    // New message notification
    socket.on('new_message_notification', (data) => {
      addNotification({
        type: 'new_message',
        title: 'New Message',
        message: data.conversationPreview || `${data.sender.name} sent you a message`,
        data: data,
        priority: 'normal',
        actions: [
          {
            label: 'Reply',
            action: 'open_chat',
            userId: data.sender.id
          }
        ]
      });
    });

    // SOS alerts (existing)
    socket.on('sos_alert', (data) => {
      addNotification({
        type: 'sos_alert',
        title: 'Emergency Alert',
        message: `${data.alert.user_name} sent an SOS alert`,
        data: data,
        priority: 'urgent',
        actions: [
          {
            label: 'View Location',
            action: 'view_sos',
            alertId: data.alert.id
          }
        ]
      });
    });

    // Dismiss message notifications when messages are read
    socket.on('dismiss_message_notifications', (data) => {
      console.log('🔔 Received dismiss_message_notifications event:', data);
      
      setNotifications(prev => {
        const updated = prev.map(notif => {
          if (notif.type === 'new_message' && 
              notif.data && 
              ((notif.data.sender && parseInt(notif.data.sender.id) === parseInt(data.senderId)) ||
               parseInt(notif.data.senderId) === parseInt(data.senderId))) {
            console.log('✅ Dismissing notification:', notif.id, 'from sender:', data.senderId);
            return { ...notif, read: true };
          }
          return notif;
        });
        
        const dismissedCount = updated.filter(n => n.read).length - prev.filter(n => n.read).length;
        console.log(`📋 Dismissed ${dismissedCount} notifications in frontend`);
        
        // reset local counter
        setUnreadBySender(prev => ({ ...prev, [parseInt(data.senderId)]: 0 }));
        return updated;
      });
    });

    return () => {
      socket.off('notification');
      socket.off('meetup_invitation');
      socket.off('meetup_response');
      socket.off('meetup_updated');
      socket.off('meetup_cancelled');
      socket.off('meetup_reminder');
      socket.off('friend_request_received');
      socket.off('friend_request_accepted');
      socket.off('new_message_notification');
      socket.off('dismiss_message_notifications');
      socket.off('sos_alert');
    };
  }, [socket]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    markAsRead,
    markChatNotificationsRead,
    clearAll,
    unreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
