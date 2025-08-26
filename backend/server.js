import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import friendsRoutes from './routes/friends.js';
import chatRoutes from './routes/chat.js';
import closeFriendsRoutes from './routes/closeFriends.js';
import sosRoutes from './routes/sos.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
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
    sos: '/api/sos'
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
  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.join(`user_${userId}`); // Join user-specific room for SOS alerts
    console.log(`User ${userId} joined with socket ${socket.id}`);
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
          timestamp: new Date().toISOString()
        });
      }
      
      // Acknowledge to sender
      socket.emit('message_sent', {
        receiverId,
        message,
        messageType,
        timestamp: new Date().toISOString()
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
  
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Friendzify server is running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.IO server is ready for real-time connections`);
});

