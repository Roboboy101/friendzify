import express from 'express';
import { requireAuth, requireApprovedUser } from '../middleware/auth.js';
import Course from '../models/Course.js';
import User from '../models/User.js';

const router = express.Router();

// All course routes require authentication
router.use(requireAuth);
router.use(requireApprovedUser);

// Get all available courses
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const courses = await Course.searchCourses(search);
    
    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load courses'
    });
  }
});

// Get sections for a specific course
router.get('/:courseCode/sections', async (req, res) => {
  try {
    const { courseCode } = req.params;
    const sections = await Course.getCourseSections(courseCode);
    
    res.json({
      success: true,
      sections
    });
  } catch (error) {
    console.error('Get course sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load course sections'
    });
  }
});

// Get section details
router.get('/sections/:sectionId', async (req, res) => {
  try {
    const { sectionId } = req.params;
    const section = await Course.getSectionById(sectionId);
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    res.json({
      success: true,
      section: section.toJSON()
    });
  } catch (error) {
    console.error('Get section details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load section details'
    });
  }
});

// Save user's selected courses
router.post('/select', async (req, res) => {
  try {
    const { selectedCourses, courseVisibility, freeSlotVisibility } = req.body;
    
    // Validate selected courses
    if (!Array.isArray(selectedCourses)) {
      return res.status(400).json({
        success: false,
        message: 'Selected courses must be an array'
      });
    }

    // Get full section details for validation
    const sectionsWithDetails = [];
    for (const courseSelection of selectedCourses) {
      const section = await Course.getSectionById(courseSelection.sectionId);
      if (!section) {
        return res.status(400).json({
          success: false,
          message: `Section ${courseSelection.sectionId} not found`
        });
      }
      sectionsWithDetails.push({
        sectionId: section.sectionId,
        courseCode: section.courseCode,
        sectionName: section.sectionName,
        courseCredit: section.courseCredit,
        faculties: section.faculties,
        roomName: section.roomName,
        schedule: section.sectionSchedule,
        labSchedules: section.labSchedules
      });
    }

    // Check for schedule conflicts
    const conflictCheck = Course.checkScheduleConflicts(sectionsWithDetails);
    
    if (conflictCheck.hasConflicts) {
      return res.status(400).json({
        success: false,
        message: 'Schedule conflicts detected',
        conflicts: conflictCheck.conflicts
      });
    }

    // Update user's course selection
    const updatedUser = await req.user.updateProfile({
      selected_courses: JSON.stringify(sectionsWithDetails),
      course_visibility: courseVisibility !== undefined ? courseVisibility : true,
      free_slot_visibility: freeSlotVisibility !== undefined ? freeSlotVisibility : true
    });

    res.json({
      success: true,
      message: 'Course selection saved successfully',
      selectedCourses: sectionsWithDetails,
      occupiedSlots: conflictCheck.occupiedSlots,
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Save course selection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save course selection'
    });
  }
});

// Get user's selected courses
router.get('/my-courses', async (req, res) => {
  try {
    // Always fetch fresh user data from database
    const freshUser = await User.findById(req.user.id);
    
    if (!freshUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    let selectedCourses = [];
    
    if (freshUser.selected_courses) {
      try {
        selectedCourses = JSON.parse(freshUser.selected_courses);
      } catch (parseError) {
        console.error('Error parsing selected courses:', parseError);
        selectedCourses = [];
      }
    }

    // Get occupied time slots from selected courses
    const conflictCheck = Course.checkScheduleConflicts(selectedCourses);

    res.json({
      success: true,
      selectedCourses,
      occupiedSlots: conflictCheck.occupiedSlots,
      courseVisibility: Boolean(freshUser.course_visibility), // Convert number to boolean
      freeSlotVisibility: Boolean(freshUser.free_slot_visibility) // Convert number to boolean
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load selected courses'
    });
  }
});

// Update visibility settings only
router.put('/visibility', async (req, res) => {
  try {
    const { courseVisibility, freeSlotVisibility } = req.body;
    
    const updates = {};
    if (courseVisibility !== undefined) updates.course_visibility = courseVisibility;
    if (freeSlotVisibility !== undefined) updates.free_slot_visibility = freeSlotVisibility;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No visibility settings provided'
      });
    }

    const updatedUser = await req.user.updateProfile(updates);

    res.json({
      success: true,
      message: 'Visibility settings updated',
      courseVisibility: Boolean(updatedUser.course_visibility), // Convert number to boolean
      freeSlotVisibility: Boolean(updatedUser.free_slot_visibility) // Convert number to boolean
    });
  } catch (error) {
    console.error('Update visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update visibility settings'
    });
  }
});

// Check schedule conflicts for given sections
router.post('/check-conflicts', async (req, res) => {
  try {
    const { sectionIds } = req.body;
    
    if (!Array.isArray(sectionIds)) {
      return res.status(400).json({
        success: false,
        message: 'Section IDs must be an array'
      });
    }

    // Get section details
    const sections = [];
    for (const sectionId of sectionIds) {
      const section = await Course.getSectionById(sectionId);
      if (section) {
        sections.push({
          sectionId: section.sectionId,
          courseCode: section.courseCode,
          sectionName: section.sectionName,
          schedule: section.sectionSchedule,
          labSchedules: section.labSchedules
        });
      }
    }

    const conflictCheck = Course.checkScheduleConflicts(sections);

    res.json({
      success: true,
      hasConflicts: conflictCheck.hasConflicts,
      conflicts: conflictCheck.conflicts,
      occupiedSlots: conflictCheck.occupiedSlots
    });
  } catch (error) {
    console.error('Check conflicts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check schedule conflicts'
    });
  }
});

export default router;
