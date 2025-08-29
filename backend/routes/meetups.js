import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Meetup from '../models/Meetup.js';
import Friend from '../models/Friend.js';

const router = express.Router();

// Create a new meetup
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, location, date_time, invited_friends = [] } = req.body;
    const organizerId = req.user.id;

    // Validate required fields
    if (!title || !location || !date_time) {
      return res.status(400).json({
        success: false,
        message: 'Title, location, and date/time are required'
      });
    }

    // Validate date is in the future
    const meetupDate = new Date(date_time);
    if (meetupDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Meetup date must be in the future'
      });
    }

    // Create the meetup
    const meetup = await Meetup.createMeetup(organizerId, {
      title,
      description,
      location,
      date_time: meetupDate.toISOString()
    });

    // Send invitations if friends are selected
    let invitedFriends = [];
    if (invited_friends.length > 0) {
      // Verify all invited users are friends
      const friendsList = await Friend.getFriends(organizerId);
      const friendIds = friendsList.map(friend => friend.id);
      const validInvites = invited_friends.filter(friendId => friendIds.includes(friendId));

      if (validInvites.length > 0) {
        invitedFriends = await Meetup.inviteFriends(meetup.id, organizerId, validInvites);

        // Send real-time notifications
        const io = req.app.get('io');
        if (io) {
          for (const friendId of invitedFriends) {
            io.to(`user_${friendId}`).emit('meetup_invitation', {
              type: 'meetup_invitation',
              meetup: meetup.toJSON(),
              organizer: {
                id: organizerId,
                name: meetup.organizer_name,
                email: meetup.organizer_email
              },
              message: `You've been invited to "${title}"`
            });
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Meetup created successfully',
      meetup: meetup.toJSON(),
      invited_count: invitedFriends.length
    });
  } catch (error) {
    console.error('Error creating meetup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create meetup'
    });
  }
});

// Get meetups for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all', status = 'active', limit = 50, offset = 0 } = req.query;

    const meetups = await Meetup.getMeetupsForUser(userId, {
      type,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      meetups: meetups.map(meetup => meetup.toJSON())
    });
  } catch (error) {
    console.error('Error fetching meetups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meetups'
    });
  }
});

// Get specific meetup by ID
router.get('/:meetupId', requireAuth, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const userId = req.user.id;

    const meetup = await Meetup.getMeetupById(meetupId, userId);

    if (!meetup) {
      return res.status(404).json({
        success: false,
        message: 'Meetup not found'
      });
    }

    // Get participants
    const participants = await Meetup.getMeetupParticipants(meetupId);

    res.json({
      success: true,
      meetup: meetup.toJSON(),
      participants
    });
  } catch (error) {
    console.error('Error fetching meetup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meetup'
    });
  }
});

// Update meetup (organizer only)
router.put('/:meetupId', requireAuth, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const organizerId = req.user.id;
    const { title, description, location, date_time, status } = req.body;

    // Validate date is in the future if being updated
    if (date_time) {
      const meetupDate = new Date(date_time);
      if (meetupDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Meetup date must be in the future'
        });
      }
    }

    const updatedMeetup = await Meetup.updateMeetup(meetupId, organizerId, {
      title,
      description,
      location,
      date_time: date_time ? new Date(date_time).toISOString() : undefined,
      status
    });

    // Notify participants of changes via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const participants = await Meetup.getMeetupParticipants(meetupId);
      participants.forEach(participant => {
        if (participant.user_id !== organizerId) {
          io.to(`user_${participant.user_id}`).emit('meetup_updated', {
            type: 'meetup_updated',
            meetup: updatedMeetup.toJSON(),
            message: `Meetup "${title}" has been updated`
          });
        }
      });
    }

    res.json({
      success: true,
      message: 'Meetup updated successfully',
      meetup: updatedMeetup.toJSON()
    });
  } catch (error) {
    console.error('Error updating meetup:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update meetup'
    });
  }
});

// Delete meetup (organizer only)
router.delete('/:meetupId', requireAuth, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const organizerId = req.user.id;

    // Get participants before deletion for notifications
    const participants = await Meetup.getMeetupParticipants(meetupId);
    const meetup = await Meetup.getMeetupById(meetupId, organizerId);

    await Meetup.deleteMeetup(meetupId, organizerId);

    // Notify participants of cancellation via Socket.IO
    const io = req.app.get('io');
    if (io && meetup) {
      participants.forEach(participant => {
        if (participant.user_id !== organizerId) {
          io.to(`user_${participant.user_id}`).emit('meetup_cancelled', {
            type: 'meetup_cancelled',
            meetup: meetup.toJSON(),
            message: `Meetup "${meetup.title}" has been cancelled`
          });
        }
      });
    }

    res.json({
      success: true,
      message: 'Meetup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meetup:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete meetup'
    });
  }
});

// Invite friends to meetup
router.post('/:meetupId/invite', requireAuth, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const organizerId = req.user.id;
    const { friend_ids } = req.body;

    if (!Array.isArray(friend_ids) || friend_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Friend IDs are required'
      });
    }

    // Verify all invited users are friends
    const friendsList = await Friend.getFriends(organizerId);
    const friendIds = friendsList.map(friend => friend.id);
    const validInvites = friend_ids.filter(friendId => friendIds.includes(friendId));

    if (validInvites.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid friends found to invite'
      });
    }

    const invitedFriends = await Meetup.inviteFriends(meetupId, organizerId, validInvites);
    const meetup = await Meetup.getMeetupById(meetupId, organizerId);

    // Send real-time notifications
    const io = req.app.get('io');
    if (io && meetup) {
      for (const friendId of invitedFriends) {
        io.to(`user_${friendId}`).emit('meetup_invitation', {
          type: 'meetup_invitation',
          meetup: meetup.toJSON(),
          organizer: {
            id: organizerId,
            name: meetup.organizer_name,
            email: meetup.organizer_email
          },
          message: `You've been invited to "${meetup.title}"`
        });
      }
    }

    res.json({
      success: true,
      message: 'Invitations sent successfully',
      invited_count: invitedFriends.length
    });
  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send invitations'
    });
  }
});

// Get user's meetup invitations
router.get('/invitations/pending', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'pending' } = req.query;

    const invitations = await Meetup.getInvitationsForUser(userId, status);

    res.json({
      success: true,
      invitations
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invitations'
    });
  }
});

// Respond to meetup invitation
router.post('/invitations/:invitationId/respond', requireAuth, async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;
    const { response, message } = req.body;

    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Response must be "accepted" or "declined"'
      });
    }

    await Meetup.respondToInvitation(invitationId, userId, response, message);

    // Get invitation details for notification
    const { getDatabase } = await import('../config/database.js');
    const db = getDatabase();
    
    const invitation = await db.get(`
      SELECT 
        mi.*,
        m.title,
        m.organizer_id,
        u.name as user_name
      FROM meetup_invitations mi
      JOIN meetups m ON mi.meetup_id = m.id
      JOIN users u ON mi.invitee_id = u.id
      WHERE mi.id = ?
    `, [invitationId]);

    // Notify organizer of response via Socket.IO
    const io = req.app.get('io');
    if (io && invitation) {
      io.to(`user_${invitation.organizer_id}`).emit('meetup_response', {
        type: 'meetup_response',
        meetup_id: invitation.meetup_id,
        meetup_title: invitation.title,
        responder: {
          name: invitation.user_name,
          response: response
        },
        message: `${invitation.user_name} ${response} your meetup invitation`
      });
    }

    res.json({
      success: true,
      message: `Invitation ${response} successfully`
    });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to respond to invitation'
    });
  }
});

// Get meetup participants
router.get('/:meetupId/participants', requireAuth, async (req, res) => {
  try {
    const { meetupId } = req.params;
    
    const participants = await Meetup.getMeetupParticipants(meetupId);

    res.json({
      success: true,
      participants
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch participants'
    });
  }
});

export default router;
