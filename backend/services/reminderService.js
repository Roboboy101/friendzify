import Meetup from '../models/Meetup.js';
import { getDatabase } from '../config/database.js';

class ReminderService {
  constructor(io) {
    this.io = io;
    this.reminderInterval = null;
    this.sentReminders = new Set(); // Track sent reminders to avoid duplicates
  }

  // Start the reminder service
  start() {
    console.log('📅 Starting meetup reminder service...');
    
    // Check for reminders every 5 minutes
    this.reminderInterval = setInterval(() => {
      this.checkAndSendReminders();
    }, 5 * 60 * 1000); // 5 minutes

    // Also check immediately on start
    this.checkAndSendReminders();
  }

  // Stop the reminder service
  stop() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
      console.log('📅 Meetup reminder service stopped');
    }
  }

  // Check for upcoming meetups and send reminders
  async checkAndSendReminders() {
    try {
      console.log('📅 Checking for upcoming meetups...');
      
      // Get meetups happening in the next 1 hour
      const upcomingMeetups = await Meetup.getUpcomingMeetups(60 * 60 * 1000); // 1 hour in milliseconds
      
      for (const meetup of upcomingMeetups) {
        const reminderKey = `${meetup.id}-1hour`;
        
        // Skip if we already sent a reminder for this meetup
        if (this.sentReminders.has(reminderKey)) {
          continue;
        }

        const meetupDate = new Date(meetup.date_time);
        const now = new Date();
        const timeUntilMeetup = meetupDate - now;
        
        // Send reminder if meetup is within 1 hour but more than 50 minutes away
        // This gives a 10-minute window to avoid missing reminders
        if (timeUntilMeetup <= 60 * 60 * 1000 && timeUntilMeetup > 50 * 60 * 1000) {
          await this.sendMeetupReminder(meetup);
          this.sentReminders.add(reminderKey);
        }
      }

      // Clean up old reminder keys (older than 2 hours)
      this.cleanupOldReminders();
      
    } catch (error) {
      console.error('❌ Error in reminder service:', error);
    }
  }

  // Send reminder notification to all participants
  async sendMeetupReminder(meetup) {
    try {
      console.log(`📅 Sending reminder for meetup: ${meetup.title}`);
      
      // Get all participants for this meetup
      const participants = await Meetup.getMeetupParticipants(meetup.id);
      
      const reminderData = {
        type: 'meetup_reminder',
        meetup: {
          id: meetup.id,
          title: meetup.title,
          location: meetup.location,
          date_time: meetup.date_time,
          organizer_name: meetup.organizer_name
        },
        message: `Reminder: "${meetup.title}" starts in 1 hour`,
        timestamp: new Date().toISOString()
      };

      // Send reminder to each participant via Socket.IO
      participants.forEach(participant => {
        if (this.io) {
          this.io.to(`user_${participant.user_id}`).emit('meetup_reminder', reminderData);
        }
      });

      // Log the reminder
      await this.logReminder(meetup.id, participants.length);
      
      console.log(`📅 Reminder sent to ${participants.length} participants for meetup: ${meetup.title}`);
      
    } catch (error) {
      console.error('❌ Error sending meetup reminder:', error);
    }
  }

  // Log reminder in database for tracking
  async logReminder(meetupId, participantCount) {
    try {
      const db = getDatabase();
      
      // Create a simple reminder log table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS meetup_reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          meetup_id INTEGER NOT NULL,
          reminder_type TEXT NOT NULL DEFAULT '1hour',
          participant_count INTEGER NOT NULL,
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (meetup_id) REFERENCES meetups(id) ON DELETE CASCADE
        )
      `);

      await db.run(
        'INSERT INTO meetup_reminders (meetup_id, reminder_type, participant_count) VALUES (?, ?, ?)',
        [meetupId, '1hour', participantCount]
      );
      
    } catch (error) {
      console.error('❌ Error logging reminder:', error);
    }
  }

  // Clean up old reminder keys to prevent memory leaks
  cleanupOldReminders() {
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    
    // Remove reminder keys that are older than 2 hours
    for (const key of this.sentReminders) {
      // Extract timestamp from key if it contains one, or assume it's old
      const parts = key.split('-');
      if (parts.length >= 3) {
        const timestamp = parseInt(parts[2]);
        if (timestamp && timestamp < twoHoursAgo) {
          this.sentReminders.delete(key);
        }
      } else {
        // Old format, remove it
        this.sentReminders.delete(key);
      }
    }
  }

  // Get reminder statistics
  async getReminderStats() {
    try {
      const db = getDatabase();
      
      const stats = await db.all(`
        SELECT 
          COUNT(*) as total_reminders,
          SUM(participant_count) as total_notifications,
          DATE(sent_at) as date
        FROM meetup_reminders 
        WHERE sent_at >= datetime('now', '-30 days')
        GROUP BY DATE(sent_at)
        ORDER BY date DESC
      `);

      return stats;
    } catch (error) {
      console.error('❌ Error getting reminder stats:', error);
      return [];
    }
  }

  // Manual trigger for testing
  async triggerReminder(meetupId) {
    try {
      const meetup = await Meetup.getMeetupById(meetupId);
      if (meetup) {
        await this.sendMeetupReminder(meetup);
        return { success: true, message: 'Reminder sent successfully' };
      } else {
        return { success: false, message: 'Meetup not found' };
      }
    } catch (error) {
      console.error('❌ Error triggering manual reminder:', error);
      return { success: false, message: 'Failed to send reminder' };
    }
  }
}

export default ReminderService;
