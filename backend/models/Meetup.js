import { getDatabase } from '../config/database.js';

class Meetup {
  constructor(data = {}) {
    this.id = data.id;
    this.organizer_id = data.organizer_id;
    this.title = data.title;
    this.description = data.description;
    this.location = data.location;
    this.date_time = data.date_time;
    this.status = data.status || 'active';
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // Additional fields from joins
    this.organizer_name = data.organizer_name;
    this.organizer_email = data.organizer_email;
    this.organizer_profile_picture = data.organizer_profile_picture;
    this.invitation_status = data.invitation_status; // For invited users
    this.participant_count = data.participant_count;
    this.invited_count = data.invited_count;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      organizer_id: this.organizer_id,
      title: this.title,
      description: this.description,
      location: this.location,
      date_time: this.date_time,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      organizer_name: this.organizer_name,
      organizer_email: this.organizer_email,
      organizer_profile_picture: this.organizer_profile_picture,
      invitation_status: this.invitation_status,
      participant_count: this.participant_count,
      invited_count: this.invited_count
    };
  }

  // Create a new meetup
  static async createMeetup(organizerId, meetupData) {
    const db = getDatabase();
    const { title, description, location, date_time } = meetupData;

    try {
      const result = await db.run(
        `INSERT INTO meetups (organizer_id, title, description, location, date_time, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [organizerId, title, description, location, date_time]
      );

      // Automatically add organizer as participant
      await db.run(
        `INSERT INTO meetup_participants (meetup_id, user_id, joined_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [result.lastID, organizerId]
      );

      // Fetch the created meetup with organizer details
      const meetup = await this.getMeetupById(result.lastID, organizerId);
      return meetup;
    } catch (error) {
      console.error('Error creating meetup:', error);
      throw error;
    }
  }

  // Get meetup by ID with organizer details
  static async getMeetupById(meetupId, userId = null) {
    const db = getDatabase();

    try {
      const query = `
        SELECT 
          m.*,
          u.name as organizer_name,
          u.email as organizer_email,
          u.profile_picture as organizer_profile_picture,
          ${userId ? `mi.status as invitation_status,` : ''}
          (SELECT COUNT(*) FROM meetup_participants WHERE meetup_id = m.id) as participant_count,
          (SELECT COUNT(*) FROM meetup_invitations WHERE meetup_id = m.id) as invited_count
        FROM meetups m
        JOIN users u ON m.organizer_id = u.id
        ${userId ? `LEFT JOIN meetup_invitations mi ON m.id = mi.meetup_id AND mi.invitee_id = ?` : ''}
        WHERE m.id = ?
      `;

      const params = userId ? [userId, meetupId] : [meetupId];
      const row = await db.get(query, params);

      return row ? new Meetup(row) : null;
    } catch (error) {
      console.error('Error fetching meetup by ID:', error);
      throw error;
    }
  }

  // Get meetups for a user (created, invited to, or participating in)
  static async getMeetupsForUser(userId, filters = {}) {
    const db = getDatabase();
    const { type = 'all', status = 'active', limit = 50, offset = 0 } = filters;

    try {
      let whereConditions = [];
      let joinConditions = '';
      let params = [];

      // Base query with organizer details
      let query = `
        SELECT DISTINCT
          m.*,
          u.name as organizer_name,
          u.email as organizer_email,
          u.profile_picture as organizer_profile_picture,
          mi.status as invitation_status,
          (SELECT COUNT(*) FROM meetup_participants WHERE meetup_id = m.id) as participant_count,
          (SELECT COUNT(*) FROM meetup_invitations WHERE meetup_id = m.id) as invited_count
        FROM meetups m
        JOIN users u ON m.organizer_id = u.id
        LEFT JOIN meetup_invitations mi ON m.id = mi.meetup_id AND mi.invitee_id = ?
        LEFT JOIN meetup_participants mp ON m.id = mp.meetup_id AND mp.user_id = ?
      `;

      params.push(userId, userId);

      // Filter by type
      if (type === 'created') {
        whereConditions.push('m.organizer_id = ?');
        params.push(userId);
      } else if (type === 'invited') {
        whereConditions.push('mi.invitee_id = ? AND mi.status = "pending"');
        params.push(userId);
      } else if (type === 'participating') {
        whereConditions.push('mp.user_id = ?');
        params.push(userId);
      } else {
        // All meetups related to user
        whereConditions.push('(m.organizer_id = ? OR mi.invitee_id = ? OR mp.user_id = ?)');
        params.push(userId, userId, userId);
      }

      // Filter by status
      if (status !== 'all') {
        whereConditions.push('m.status = ?');
        params.push(status);
      }

      // Add WHERE clause
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Order by date
      query += ' ORDER BY m.date_time ASC';

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = await db.all(query, params);
      return rows.map(row => new Meetup(row));
    } catch (error) {
      console.error('Error fetching meetups for user:', error);
      throw error;
    }
  }

  // Update meetup
  static async updateMeetup(meetupId, organizerId, updateData) {
    const db = getDatabase();

    try {
      const { title, description, location, date_time, status } = updateData;
      
      const result = await db.run(
        `UPDATE meetups 
         SET title = ?, description = ?, location = ?, date_time = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND organizer_id = ?`,
        [title, description, location, date_time, status, meetupId, organizerId]
      );

      if (result.changes === 0) {
        throw new Error('Meetup not found or you are not the organizer');
      }

      return await this.getMeetupById(meetupId, organizerId);
    } catch (error) {
      console.error('Error updating meetup:', error);
      throw error;
    }
  }

  // Delete meetup
  static async deleteMeetup(meetupId, organizerId) {
    const db = getDatabase();

    try {
      const result = await db.run(
        'DELETE FROM meetups WHERE id = ? AND organizer_id = ?',
        [meetupId, organizerId]
      );

      if (result.changes === 0) {
        throw new Error('Meetup not found or you are not the organizer');
      }

      return true;
    } catch (error) {
      console.error('Error deleting meetup:', error);
      throw error;
    }
  }

  // Invite friends to meetup
  static async inviteFriends(meetupId, organizerId, friendIds) {
    const db = getDatabase();

    try {
      // Verify organizer owns the meetup
      const meetup = await db.get(
        'SELECT id FROM meetups WHERE id = ? AND organizer_id = ?',
        [meetupId, organizerId]
      );

      if (!meetup) {
        throw new Error('Meetup not found or you are not the organizer');
      }

      // Insert invitations
      const invitations = [];
      for (const friendId of friendIds) {
        try {
          await db.run(
            `INSERT OR IGNORE INTO meetup_invitations (meetup_id, inviter_id, invitee_id, invited_at) 
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [meetupId, organizerId, friendId]
          );
          invitations.push(friendId);
        } catch (err) {
          console.warn(`Failed to invite friend ${friendId}:`, err.message);
        }
      }

      return invitations;
    } catch (error) {
      console.error('Error inviting friends:', error);
      throw error;
    }
  }

  // Respond to meetup invitation
  static async respondToInvitation(invitationId, userId, response, responseMessage = null) {
    const db = getDatabase();

    try {
      // Update invitation status
      const result = await db.run(
        `UPDATE meetup_invitations 
         SET status = ?, response_message = ?, responded_at = CURRENT_TIMESTAMP
         WHERE id = ? AND invitee_id = ?`,
        [response, responseMessage, invitationId, userId]
      );

      if (result.changes === 0) {
        throw new Error('Invitation not found');
      }

      // If accepted, add to participants
      if (response === 'accepted') {
        const invitation = await db.get(
          'SELECT meetup_id FROM meetup_invitations WHERE id = ?',
          [invitationId]
        );

        if (invitation) {
          await db.run(
            `INSERT OR IGNORE INTO meetup_participants (meetup_id, user_id, joined_at) 
             VALUES (?, ?, CURRENT_TIMESTAMP)`,
            [invitation.meetup_id, userId]
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Error responding to invitation:', error);
      throw error;
    }
  }

  // Get meetup invitations for user
  static async getInvitationsForUser(userId, status = 'pending') {
    const db = getDatabase();

    try {
      const query = `
        SELECT 
          mi.*,
          m.title,
          m.description,
          m.location,
          m.date_time,
          m.status as meetup_status,
          u.name as organizer_name,
          u.email as organizer_email,
          u.profile_picture as organizer_profile_picture
        FROM meetup_invitations mi
        JOIN meetups m ON mi.meetup_id = m.id
        JOIN users u ON mi.inviter_id = u.id
        WHERE mi.invitee_id = ? AND mi.status = ?
        ORDER BY mi.invited_at DESC
      `;

      const rows = await db.all(query, [userId, status]);
      return rows;
    } catch (error) {
      console.error('Error fetching invitations for user:', error);
      throw error;
    }
  }

  // Get meetup participants
  static async getMeetupParticipants(meetupId) {
    const db = getDatabase();

    try {
      const query = `
        SELECT 
          mp.*,
          u.name,
          u.email,
          u.profile_picture
        FROM meetup_participants mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.meetup_id = ?
        ORDER BY mp.joined_at ASC
      `;

      const rows = await db.all(query, [meetupId]);
      return rows;
    } catch (error) {
      console.error('Error fetching meetup participants:', error);
      throw error;
    }
  }

  // Get upcoming meetups (for reminders)
  static async getUpcomingMeetups(timeWindow = 3600000) { // 1 hour in milliseconds
    const db = getDatabase();

    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + timeWindow);

      const query = `
        SELECT DISTINCT
          m.*,
          u.name as organizer_name,
          u.email as organizer_email
        FROM meetups m
        JOIN users u ON m.organizer_id = u.id
        JOIN meetup_participants mp ON m.id = mp.meetup_id
        WHERE m.status = 'active' 
        AND datetime(m.date_time) BETWEEN datetime('now') AND datetime(?)
      `;

      const rows = await db.all(query, [reminderTime.toISOString()]);
      return rows.map(row => new Meetup(row));
    } catch (error) {
      console.error('Error fetching upcoming meetups:', error);
      throw error;
    }
  }
}

export default Meetup;
