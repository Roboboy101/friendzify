import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { chatAPI, analyticsAPI } from '../utils/api';
import OnlineStatus from '../components/OnlineStatus';
import { useSocket } from '../contexts/SocketContext';
import { useNotifications } from '../contexts/NotificationContext';
import Avatar from '../components/Avatar';

const Chat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const location = useLocation();
  const { notifications, markAsRead, markChatNotificationsRead } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friend, setFriend] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState({ isOnline: false, lastSeen: null });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatError, setChatError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Sort helper: unread first, then newest last message (memoized for stability)
  const sortConversations = useCallback((list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
      const aUnread = parseInt(a.unread_count || 0) > 0;
      const bUnread = parseInt(b.unread_count || 0) > 0;
      if (aUnread !== bUnread) return bUnread ? 1 : -1;
      const at = new Date(a.last_message_time || 0).getTime();
      const bt = new Date(b.last_message_time || 0).getTime();
      return bt - at;
    });
  }, []); // Empty dependency array makes this stable

  // Socket listeners for real-time status updates
  useEffect(() => {
    if (socket && friend) {
      const handleUserOnline = ({ userId, isOnline, timestamp }) => {
        if (parseInt(userId) === parseInt(friend.id)) {
          setOnlineStatus({
            isOnline,
            lastSeen: isOnline ? null : (timestamp || new Date().toISOString())
          })
        }
      }

      const handleUserStatusChanged = ({ userId, isOnline, timestamp }) => {
        if (parseInt(userId) === parseInt(friend.id)) {
          setOnlineStatus({
            isOnline,
            lastSeen: isOnline ? null : (timestamp || new Date().toISOString())
          })
        }
      }

      socket.on('user_online', handleUserOnline)
      socket.on('user_status_changed', handleUserStatusChanged)

      return () => {
        socket.off('user_online', handleUserOnline)
        socket.off('user_status_changed', handleUserStatusChanged)
      }
    }
  }, [socket, friend])

  // Get current user data
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Set friend header when entering chat (navigation state only)
  useEffect(() => {
    if (userId) {
      // Only use navigation state for instant header (no conversations dependency)
      const navFriend = location.state?.friend;
      if (navFriend && parseInt(navFriend.id) === parseInt(userId)) {
        setFriend({ id: navFriend.id, name: navFriend.name, profile_picture: navFriend.profile_picture });
      }
      // Use shared helper to clear both server + local for this sender
      markChatNotificationsRead(parseInt(userId));
    }
  }, [userId, location.state, markChatNotificationsRead]);

  // Separate effect: Update unread badges when userId changes
  useEffect(() => {
    if (userId) {
      setConversations(prev => sortConversations(prev.map(c => (
        parseInt(c.id) === parseInt(userId) ? { ...c, unread_count: 0 } : c
      ))));
    }
  }, [userId]); // Only depends on userId to avoid loops

  // Separate effect: Set friend from conversations when available (avoid friend dependency)
  useEffect(() => {
    if (userId && conversations.length > 0) {
      const match = conversations.find(c => parseInt(c.id) === parseInt(userId));
      if (match) {
        setFriend(prev => {
          // Only set if no friend is set or if this is a different user
          if (!prev || prev.id !== match.id) {
            return { id: match.id, name: match.name, profile_picture: match.profile_picture };
          }
          return prev;
        });
      }
    }
  }, [userId, conversations]); // REMOVED friend to prevent loops

  // Load conversation quickly (cancel stale request on fast navigation)
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fastSetFriendFromCache = () => {
      const navFriend = location.state?.friend;
      if (navFriend && parseInt(navFriend.id) === parseInt(userId)) {
        setFriend({ id: navFriend.id, name: navFriend.name, profile_picture: navFriend.profile_picture });
        return true;
      }
      // Use a stable snapshot of conversations to avoid dependency issues
      const currentConversations = conversations;
      if (currentConversations && currentConversations.length > 0) {
        const match = currentConversations.find(c => parseInt(c.id) === parseInt(userId));
        if (match) {
          setFriend({ id: match.id, name: match.name, profile_picture: match.profile_picture });
          return true;
        }
      }
      return false;
    };

    const loadConversation = async () => {
      if (!userId) return;

      // Set header ASAP if possible
      fastSetFriendFromCache();

      try {
        const response = await chatAPI.getConversation(userId, 30, 0, { signal: controller.signal });
        
        // CRITICAL FIX: Handle non-2xx responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error('Chat API Error:', response.status, errorData);
          
          if (response.status === 403) {
            // Not friends - show appropriate message
            setMessages([]);
            setChatError({ type: 'not_friends', message: 'You can only chat with friends. Send a friend request first.' });
            if (!cancelled) setLoading(false);
            return;
          } else if (response.status === 401) {
            // Authentication issue - redirect to login
            navigate('/login');
            return;
          }
          throw new Error(`HTTP ${response.status}: ${errorData.message}`);
        }

        const data = await response.json();
        if (cancelled) return;
        
        if (data.success) {
          setChatError(null); // Clear any previous errors
          const normalized = (data.messages || []).map(m => ({
            ...m,
            created_at: (typeof m.created_at_epoch !== 'undefined' && m.created_at_epoch !== null)
              ? m.created_at_epoch
              : m.created_at
          }));
          setMessages(normalized);

          if (data.messages.length > 0) {
            const firstMessage = data.messages[0];
            const friendData = firstMessage.sender_id === currentUser?.id 
              ? { id: firstMessage.receiver_id, name: firstMessage.receiver_name, profile_picture: firstMessage.receiver_picture }
              : { id: firstMessage.sender_id, name: firstMessage.sender_name, profile_picture: firstMessage.sender_picture };
            setFriend(prev => prev || friendData);

            // Fetch activity status in parallel, with timeout fallback
            (async () => {
              try {
                const ac = new AbortController();
                const t = setTimeout(() => ac.abort(), 1200);
                const resp = await analyticsAPI.getActivityStatus([friendData.id], { signal: ac.signal });
                const activity = await resp.json();
                clearTimeout(t);
                if (!cancelled && activity.success && Array.isArray(activity.data) && activity.data.length > 0) {
                  const u = activity.data[0];
                  setOnlineStatus({ isOnline: Boolean(u.is_online), lastSeen: u.last_seen });
                }
              } catch {}
            })();
          }
        } else {
          console.error('Chat API returned success:false', data);
          setChatError({ type: 'api_error', message: data.message || 'Failed to load chat' });
          setMessages([]);
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Error loading conversation:', error);
          setChatError({ type: 'network_error', message: 'Network error. Check your connection.' });
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadConversation();
    return () => { cancelled = true; controller.abort(); };
  }, [userId, currentUser, location.state]); // REMOVED conversations to prevent infinite loop

  // Load conversations for left panel
  useEffect(() => {
    const loadAndSortConversations = async () => {
      try {
        const res = await chatAPI.getConversations();
        const data = await res.json();
        if (data.success) {
          const convs = Array.isArray(data.conversations) ? data.conversations : [];
          setConversations(sortConversations(convs));
        }
      } catch (e) {
        console.error('Error loading conversations:', e);
      }
    };
    loadAndSortConversations();
  }, []);

  // If friend picture is missing, try to hydrate from conversations list
  useEffect(() => {
    if (!userId) return;
    const match = conversations.find(c => parseInt(c.id) === parseInt(userId));
    if (match && match.profile_picture) {
      setFriend(prev => {
        // Only update if friend exists and picture is different/missing
        if (prev && (!prev.profile_picture || prev.profile_picture !== match.profile_picture)) {
          return { ...prev, profile_picture: match.profile_picture };
        }
        return prev;
      });
    }
  }, [conversations, userId]); // Safer: only depends on conversations and userId

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      const activeId = parseInt(userId);
      const senderId = parseInt(data.senderId);
      const receiverId = parseInt(data.receiverId);
      
      if (senderId === activeId || receiverId === activeId) {
        setMessages(prev => {
          // Remove any temporary messages with the same content and sender to avoid duplicates
          const filtered = prev.filter(msg => 
            !(msg.isTemporary && msg.message === data.message && msg.sender_id === senderId)
          );
          
          // Determine sender info based on whether this is from current user or friend
          const isFromCurrentUser = senderId === parseInt(currentUser?.id);
          const senderName = isFromCurrentUser ? currentUser?.name : friend?.name;
          const senderPicture = isFromCurrentUser ? currentUser?.profile_picture : friend?.profile_picture;
          
          return [...filtered, {
            id: data.messageId || Date.now(),
            sender_id: senderId,
            receiver_id: receiverId,
            message: data.message,
            message_type: data.messageType || 'text',
            created_at: data.timestampMs || data.timestamp || Date.now(),
            sender_name: senderName,
            sender_picture: senderPicture
          }];
        });
      }

      // Update left panel conversations in real-time
      setConversations(prev => {
        const meId = currentUser?.id;
        if (!meId) return prev;
        const isIncoming = parseInt(data.receiverId) === parseInt(meId);
        const otherId = parseInt(data.senderId) === parseInt(meId) ? parseInt(data.receiverId) : parseInt(data.senderId);
        const nowIso = new Date(data.timestamp || Date.now()).toISOString();
        let found = false;
        const updated = prev.map(c => {
          if (parseInt(c.id) === otherId) {
            found = true;
            const inc = isIncoming && otherId !== parseInt(userId) ? 1 : 0;
            const nextUnread = Math.max(0, parseInt(c.unread_count || 0) + inc);
            return { ...c, last_message: data.message, last_message_time: nowIso, last_sender_id: data.senderId, unread_count: nextUnread };
          }
          return c;
        });
        const list = found ? updated : [{ id: otherId, name: '', profile_picture: '', last_message: data.message, last_message_time: nowIso, last_sender_id: data.senderId, unread_count: isIncoming ? 1 : 0 }, ...updated];
        return sortConversations(list);
      });
    };

    const handleUserTyping = (data) => {
      if (data.userId === parseInt(userId)) {
        setIsTyping(data.isTyping);
        if (data.isTyping) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, userId, friend, currentUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // Add message to UI immediately
      const tempMessage = {
        id: Date.now(),
        sender_id: currentUser.id,
        receiver_id: parseInt(userId),
        message: messageText,
        message_type: 'text',
        created_at: new Date().toISOString(),
        sender_name: currentUser.name,
        sender_picture: currentUser.profile_picture,
        isTemporary: true // Mark as temporary for potential removal
      };
      setMessages(prev => [...prev, tempMessage]);

      // Send via API
      await chatAPI.sendMessage(userId, messageText);

      // Send via Socket.IO for real-time
      if (socket) {
        socket.emit('send_message', {
          receiverId: userId,
          message: messageText,
          messageType: 'text'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove failed message from UI
      setMessages(prev => prev.filter(msg => !(msg.isTemporary && msg.message === messageText)));
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', { receiverId: userId, isTyping: true });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { receiverId: userId, isTyping: false });
      }, 1000);
    }
  };

  // Robust timestamp parser to handle:
  // - ISO strings (with or without Z)
  // - SQLite CURRENT_TIMESTAMP format: "YYYY-MM-DD HH:MM:SS"
  const parseTimestamp = (ts) => {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    // Numeric epoch (seconds or milliseconds)
    if (typeof ts === 'number') {
      // Heuristic: treat 13-digit as ms, 10-digit as s
      const ms = ts < 1e12 ? ts * 1000 : ts;
      const dNum = new Date(ms);
      return isNaN(dNum.getTime()) ? null : dNum;
    }
    if (typeof ts === 'string' && /^\d{10,13}$/.test(ts)) {
      const num = parseInt(ts, 10);
      const ms = num < 1e12 ? num * 1000 : num;
      const dNum = new Date(ms);
      return isNaN(dNum.getTime()) ? null : dNum;
    }
    let d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
    // Handle "YYYY-MM-DD HH:MM:SS" → treat as LOCAL to avoid post-refresh shifts
    if (typeof ts === 'string' && /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(ts)) {
      d = new Date(ts.replace(' ', 'T'));
      if (!isNaN(d.getTime())) return d;
    }
    // Handle ISO without Z: add Z as UTC
    if (typeof ts === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(ts) && !/[zZ]$/.test(ts)) {
      d = new Date(ts + 'Z');
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const formatTime = (timestamp) => {
    const date = parseTimestamp(timestamp);
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = parseTimestamp(timestamp);
    if (!date) return '';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Left slim panel: conversations */}
      <aside className="w-72 border-r border-gray-200 bg-white flex flex-col">
        <div className="h-16 px-4 flex items-center border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No conversations yet</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id || c.other_user_id || c.user_id || c.name + c.last_message_time}
                onClick={() => navigate(`/chat/${c.id}`)}
                className={`w-full px-4 py-3 flex items-center space-x-3 relative transition-colors
                  ${parseInt(userId) === parseInt(c.id)
                    ? 'bg-blue-50 border-l-2 border-primary-600'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
                aria-current={parseInt(userId) === parseInt(c.id) ? 'true' : 'false'}
              >
                <Avatar 
                  src={c?.profile_picture ? `http://localhost:5001${c.profile_picture}` : ''}
                  name={c?.name}
                  size={40}
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${parseInt(userId) === parseInt(c.id) ? 'font-semibold text-primary-700' : 'font-medium text-gray-900'}`}>{c.name}</p>
                    <div className="flex items-center space-x-2 ml-2">
                      {parseInt(c.unread_count || 0) > 0 && (
                        <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.1rem] h-4 flex items-center justify-center">
                          {parseInt(c.unread_count) > 99 ? '99+' : parseInt(c.unread_count)}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 truncate">{formatTime(c.last_message_time)}</p>
                    </div>
                  </div>
                  <p className={`text-xs truncate ${parseInt(c.unread_count || 0) > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{c.last_message}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Right panel: chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky header with friend pic and name */}
        <div className="h-16 px-4 bg-white border-b border-gray-100 flex items-center sticky top-0 z-10">
          <button
            onClick={() => navigate('/friends')}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 mr-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {friend && (
            <div className="flex items-center space-x-3">
              <Avatar 
                src={friend?.profile_picture ? `http://localhost:5001${friend.profile_picture}` : ''}
                name={friend?.name}
                size={40}
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{friend.name}</h1>
                <OnlineStatus 
                  isOnline={onlineStatus.isOnline}
                  lastSeen={onlineStatus.lastSeen}
                  size="sm"
                  className="mt-0.5"
                />
              </div>
            </div>
          )}
          {isTyping && (
            <p className="ml-auto text-sm text-primary-600">typing...</p>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatError ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Load Chat</h3>
                <p className="text-gray-600 mb-4">{chatError.message}</p>
                {chatError.type === 'not_friends' && (
                  <button
                    onClick={() => navigate('/friends')}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Go to Friends
                  </button>
                )}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start your conversation</h3>
                <p className="text-gray-600">Send a message to start chatting with {friend?.name}.</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isCurrentUser = message.sender_id === currentUser?.id;
                const showDate = index === 0 || 
                  formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                    )}
                    
                    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                        <div className={`px-4 py-2 rounded-2xl ${
                          isCurrentUser 
                            ? 'bg-primary-600 text-white' 
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            isCurrentUser ? 'text-primary-200' : 'text-gray-500'
                          }`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {!chatError && (
            <div className="border-t border-gray-200 bg-white p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    disabled={sending}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
