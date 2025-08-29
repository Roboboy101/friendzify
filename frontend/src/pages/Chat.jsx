import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI, analyticsAPI } from '../utils/api';
import OnlineStatus from '../components/OnlineStatus';
import { useSocket } from '../contexts/SocketContext';
import Avatar from '../components/Avatar';

const Chat = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friend, setFriend] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState({ isOnline: false, lastSeen: null });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Socket listeners for real-time status updates
  useEffect(() => {
    if (socket && friend) {
      const handleUserOnline = ({ userId, isOnline, timestamp }) => {
        if (parseInt(userId) === parseInt(friend.id)) {
          console.log('🔄 Friend status changed:', { userId, isOnline, timestamp })
          setOnlineStatus({
            isOnline,
            lastSeen: isOnline ? null : (timestamp || new Date().toISOString())
          })
        }
      }

      const handleUserStatusChanged = ({ userId, isOnline, timestamp }) => {
        if (parseInt(userId) === parseInt(friend.id)) {
          console.log('🔄 Friend status changed (status_changed):', { userId, isOnline, timestamp })
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

  // Load conversation
  useEffect(() => {
    const loadConversation = async () => {
      if (!userId) return;
      
      try {
        const response = await chatAPI.getConversation(userId);
        const data = await response.json();
        
        if (data.success) {
          // Normalize created_at to epoch ms when available from API
          const normalized = (data.messages || []).map(m => ({
            ...m,
            created_at: (typeof m.created_at_epoch !== 'undefined' && m.created_at_epoch !== null)
              ? m.created_at_epoch
              : m.created_at
          }));
          setMessages(normalized);
          // Debug: log first 3 timestamps
          try {
            const sample = normalized.slice(0, 3);
            sample.forEach((m, idx) => {
              const d = parseTimestamp(m.created_at);
              // eslint-disable-next-line no-console
              console.log('[Chat] msg', idx, {
                raw_created_at: m.created_at,
                created_at_epoch: m.created_at_epoch,
                parsed: d?.toISOString?.(),
                local: d?.toLocaleString?.(),
                tz_offset_min: new Date().getTimezoneOffset()
              });
            });
          } catch {}
          if (data.messages.length > 0) {
            // Get friend info from the first message
            const firstMessage = data.messages[0];
            const friendData = firstMessage.sender_id === currentUser?.id 
              ? { id: firstMessage.receiver_id, name: firstMessage.receiver_name, profile_picture: firstMessage.receiver_picture }
              : { id: firstMessage.sender_id, name: firstMessage.sender_name, profile_picture: firstMessage.sender_picture };
            setFriend(friendData);
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [userId, currentUser]);

  // Load conversations for left panel
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await chatAPI.getConversations();
        const data = await res.json();
        if (data.success) {
          setConversations(data.conversations || []);
        }
      } catch (e) {
        console.error('Error loading conversations:', e);
      }
    };
    loadConversations();
  }, []);

  // If friend picture is missing, try to hydrate from conversations list
  useEffect(() => {
    if (!friend || friend.profile_picture) return;
    const match = conversations.find(c => parseInt(c.id) === parseInt(userId));
    if (match) {
      setFriend(prev => ({
        ...prev,
        profile_picture: match.profile_picture
      }));
    }
  }, [friend, conversations, userId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.senderId === parseInt(userId)) {
        setMessages(prev => {
          // Remove any temporary messages with the same content to avoid duplicates
          const filtered = prev.filter(msg => !(msg.isTemporary && msg.message === data.message));
          return [...filtered, {
            id: data.messageId || Date.now(),
            sender_id: data.senderId,
            receiver_id: data.receiverId,
            message: data.message,
            message_type: data.messageType || 'text',
            created_at: data.timestampMs || data.timestamp || Date.now(),
            sender_name: friend?.name,
            sender_picture: friend?.profile_picture
          }];
        });
      }
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
  }, [socket, userId, friend]);

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
                className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 ${parseInt(userId) === parseInt(c.id) ? 'bg-gray-50' : ''}`}
              >
                <Avatar 
                  src={c?.profile_picture ? `http://localhost:5001${c.profile_picture}` : ''}
                  name={c?.name}
                  size={40}
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 ml-2 truncate">{formatTime(c.last_message_time)}</p>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{c.last_message}</p>
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
            {messages.length === 0 ? (
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
        </div>
      </div>
    </div>
  );
};

export default Chat;
