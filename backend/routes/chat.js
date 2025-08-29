import express from 'express';
import Chat from '../models/Chat.js';
import Friend from '../models/Friend.js';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All chat routes require authentication
router.use(requireAuth);

// Get all conversations for the authenticated user
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Chat.getUserConversations(req.user.id);
    
    // Only show conversations with current friends (security fix applied)
    
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations.'
    });
  }
});

// Get conversation with a specific user
router.get('/conversation/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Check if users are friends
    const friendshipStatus = await Friend.getFriendshipStatus(req.user.id, parseInt(userId));
    
    if (friendshipStatus !== 'friends') {
      return res.status(403).json({
        success: false,
        message: 'You can only chat with friends.'
      });
    }
    
    const messages = await Chat.getConversation(
      req.user.id, 
      parseInt(userId), 
      parseInt(limit), 
      parseInt(offset)
    );
    
    // Mark messages as read
    await Chat.markMessagesAsRead(parseInt(userId), req.user.id);
    
    // Dismiss message notifications from this sender
    await Notification.dismissMessageNotifications(req.user.id, parseInt(userId));
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).emit('dismiss_message_notifications', {
        senderId: parseInt(userId)
      });
    }
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation.'
    });
  }
});

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { receiverId, message, messageType = 'text' } = req.body;
    
    if (!receiverId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and message are required.'
      });
    }
    
    // Check if users are friends
    const friendshipStatus = await Friend.getFriendshipStatus(req.user.id, parseInt(receiverId));
    if (friendshipStatus !== 'friends') {
      return res.status(403).json({
        success: false,
        message: 'You can only send messages to friends.'
      });
    }
    
    const chatMessage = await Chat.sendMessage(
      req.user.id, 
      parseInt(receiverId), 
      message, 
      messageType
    );
    
    // Send persistent notification to receiver
    const senderUser = await Friend.getUserById(req.user.id);
    const io = req.app.get('io');
    
    await Notification.sendNotification(parseInt(receiverId), {
      type: 'new_message',
      title: 'New Message',
      message: `${senderUser.name}: ${message.length > 30 ? message.substring(0, 30) + '...' : message}`,
      data: {
        messageId: chatMessage.id,
        sender: {
          id: req.user.id,
          name: senderUser.name,
          email: senderUser.email,
          profile_picture: senderUser.profile_picture
        },
        messageType: messageType,
        timestamp: chatMessage.created_at
      },
      priority: 'normal',
      actions: [
        {
          label: 'Reply',
          action: 'open_chat',
          userId: req.user.id
        }
      ],
      expiresInHours: 24 // Messages expire after 1 day
    }, io);
    
    res.json({
      success: true,
      message: 'Message sent successfully!',
      chatMessage: chatMessage.toJSON()
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message.'
    });
  }
});

// Mark messages as read
router.post('/read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Chat.markMessagesAsRead(parseInt(userId), req.user.id);
    
    // Dismiss message notifications from this sender
    await Notification.dismissMessageNotifications(req.user.id, parseInt(userId));
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).emit('dismiss_message_notifications', {
        senderId: parseInt(userId)
      });
    }
    
    res.json({
      success: true,
      message: 'Messages marked as read.'
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read.'
    });
  }
});

// Get unread message count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Chat.getUnreadCount(req.user.id);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count.'
    });
  }
});

// Delete a message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    await Chat.deleteMessage(parseInt(messageId), req.user.id);
    
    res.json({
      success: true,
      message: 'Message deleted successfully.'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message.'
    });
  }
});

export default router;
