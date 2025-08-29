import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import User from './models/User.js';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase, getDatabase } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import friendsRoutes from './routes/friends.js';
import chatRoutes from './routes/chat.js';
import closeFriendsRoutes from './routes/closeFriends.js';
import sosRoutes from './routes/sos.js';
import analyticsRoutes from './routes/analytics.js';
import adminReportsRoutes from './routes/adminReports.js';
import userReportsRoutes from './routes/userReports.js';
import meetupsRoutes from './routes/meetups.js';
import notificationsRoutes from './routes/notifications.js';
import ReminderService from './services/reminderService.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000, // 1 minute
  pingInterval: 25000 // 25 seconds
});

// Initialize database
await initDatabase();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for profile pictures
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/close-friends', closeFriendsRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin/feedback-reports', adminReportsRoutes);
app.use('/api/reports', userReportsRoutes);
app.use('/api/meetups', meetupsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Friendzify API Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      user: '/api/user',
      friends: '/api/friends',
      chat: '/api/chat',
      closeFriends: '/api/close-friends',
      sos: '/api/sos',
      analytics: '/api/analytics',
      adminReports: '/api/admin/reports',
      userReports: '/api/reports',
      meetups: '/api/meetups',
      notifications: '/api/notifications'
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
const connectedUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // User joins with their userId
  socket.on('join', async (userId) => {
    try {
      const uid = parseInt(userId);
      connectedUsers.set(uid, socket.id);
      socket.userId = uid;
      socket.join(`user_${uid}`); // Join user-specific room for SOS alerts
      
      // Update user online status
      const user = await User.findById(uid);
      if (user) {
        await user.setOnlineStatus(true);
        await user.logActivity('login', socket.handshake.address, socket.handshake.headers['user-agent']);
        
        // Store login time for session duration tracking
        socket.loginTime = Date.now();
      }
      
      console.log(`User ${uid} joined with socket ${socket.id} and set online`);
      
      // Broadcast online status to ALL connected users immediately
      socket.broadcast.emit('user_online', { userId: uid, isOnline: true });
      
      // Also broadcast to specific rooms if needed
      io.emit('user_status_changed', { userId: uid, isOnline: true, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error handling user join:', error);
    }
  });
  
  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { receiverId, message, messageType = 'text' } = data;
      const senderId = socket.userId;
      
      if (!senderId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      // Send message to receiver if they're online
      const receiverSocketId = connectedUsers.get(parseInt(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', {
          senderId,
          receiverId,
          message,
          messageType,
          timestamp: new Date().toISOString(),
          timestampMs: Date.now(),
          messageId: Date.now() // Add unique message ID
        });
      }
      
      // Acknowledge to sender
      socket.emit('message_sent', {
        receiverId,
        message,
        messageType,
        timestamp: new Date().toISOString(),
        timestampMs: Date.now()
      });
      
    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;
    const receiverSocketId = connectedUsers.get(parseInt(receiverId));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', {
        userId: socket.userId,
        isTyping
      });
    }
  });
  
  // Handle message read receipts
  socket.on('message_read', (data) => {
    const { senderId } = data;
    const senderSocketId = connectedUsers.get(parseInt(senderId));
    if (senderSocketId) {
      io.to(senderSocketId).emit('message_read_by', {
        readerId: socket.userId
      });
    }
  });
  
  // Handle meetup invitation responses
  socket.on('meetup_invitation_response', async (data) => {
    try {
      const { invitationId, response, message } = data;
      const userId = socket.userId;
      
      if (!userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      // The actual database update is handled by the API route
      // This is just for real-time acknowledgment
      socket.emit('meetup_response_sent', {
        invitationId,
        response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Socket meetup response error:', error);
      socket.emit('error', { message: 'Failed to process meetup response' });
    }
  });

  socket.on('disconnect', async () => {
    if (socket.userId) {
      try {
        // Update user offline status
        const user = await User.findById(socket.userId);
        if (user) {
          await user.setOnlineStatus(false);
          
          // Calculate session duration and update stats
          if (socket.loginTime) {
            const sessionDuration = Math.floor((Date.now() - socket.loginTime) / 1000); // in seconds
            await user.updateSessionStats(sessionDuration);
            await user.logActivity('logout', socket.handshake.address, socket.handshake.headers['user-agent'], { sessionDuration });
          }
        }
        
        connectedUsers.delete(socket.userId);
        
        // Broadcast offline status to ALL connected users immediately
        socket.broadcast.emit('user_online', { userId: socket.userId, isOnline: false });
        
        // Also broadcast to all rooms
        io.emit('user_status_changed', { userId: socket.userId, isOnline: false, timestamp: new Date().toISOString() });
        
        console.log(`User ${socket.userId} disconnected and set offline`);
      } catch (error) {
        console.error('Error handling user disconnect:', error);
        connectedUsers.delete(socket.userId);
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Initialize reminder service
const reminderService = new ReminderService(io);
reminderService.start();

// Periodic cleanup of stale online users (every 5 minutes)
setInterval(async () => {
  try {
    const db = getDatabase();
    const result = await db.run(`
      UPDATE users 
      SET is_online = 0, updated_at = CURRENT_TIMESTAMP
      WHERE is_online = 1 
        AND last_seen < datetime('now', '-15 minutes')
        AND is_approved = TRUE 
        AND is_active = TRUE
    `);
    
    if (result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} stale online users`);
      
      // Broadcast updated online status
      io.emit('bulk_user_offline', { 
        message: `${result.changes} users marked offline due to inactivity`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in periodic cleanup:', error);
  }
}, 10 * 60 * 1000); // 10 minutes

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Friendzify server is running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.IO server is ready for real-time connections`);
});

