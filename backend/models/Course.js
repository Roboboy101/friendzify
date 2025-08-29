import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Course {
  constructor(data = {}) {
    this.sectionId = data.sectionId;
    this.courseId = data.courseId;
    this.sectionName = data.sectionName;
    this.courseCredit = data.courseCredit;
    this.courseCode = data.courseCode;
    this.sectionType = data.sectionType;
    this.capacity = data.capacity;
    this.consumedSeat = data.consumedSeat;
    this.faculties = data.faculties;
    this.roomName = data.roomName;
    this.sectionSchedule = data.sectionSchedule;
    this.labSchedules = data.labSchedules || [];
  }

  // Load all courses from JSON file
  static async getAllCourses() {
    try {
      const coursePath = path.join(__dirname, '..', 'course_schedule.json');
      const courseData = await fs.readFile(coursePath, 'utf8');
      const courses = JSON.parse(courseData);
      
      return courses.map(course => new Course(course));
    } catch (error) {
      console.error('Error loading courses:', error);
      throw new Error('Failed to load course data');
    }
  }

  // Get unique course codes with their sections
  static async getCourseList() {
    try {
      const allCourses = await Course.getAllCourses();
      const courseMap = new Map();

      allCourses.forEach(course => {
        const key = course.courseCode;
        if (!courseMap.has(key)) {
          courseMap.set(key, {
            courseCode: course.courseCode,
            courseCredit: course.courseCredit,
            sections: []
          });
        }
        
        courseMap.get(key).sections.push({
          sectionId: course.sectionId,
          sectionName: course.sectionName,
          sectionType: course.sectionType,
          capacity: course.capacity,
          consumedSeat: course.consumedSeat,
          availableSeats: course.capacity - course.consumedSeat,
          faculties: course.faculties,
          roomName: course.roomName,
          schedule: course.sectionSchedule,
          labSchedules: course.labSchedules
        });
      });

      return Array.from(courseMap.values()).sort((a, b) => a.courseCode.localeCompare(b.courseCode));
    } catch (error) {
      console.error('Error getting course list:', error);
      throw error;
    }
  }

  // Search courses by code or name
  static async searchCourses(searchTerm) {
    try {
      const courses = await Course.getCourseList();
      if (!searchTerm) return courses;

      const term = searchTerm.toLowerCase();
      return courses.filter(course => 
        course.courseCode.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching courses:', error);
      throw error;
    }
  }

  // Get specific course sections by course code
  static async getCourseSections(courseCode) {
    try {
      const courses = await Course.getCourseList();
      const course = courses.find(c => c.courseCode === courseCode);
      return course ? course.sections : [];
    } catch (error) {
      console.error('Error getting course sections:', error);
      throw error;
    }
  }

  // Get section details by section ID
  static async getSectionById(sectionId) {
    try {
      const allCourses = await Course.getAllCourses();
      return allCourses.find(course => course.sectionId === parseInt(sectionId));
    } catch (error) {
      console.error('Error getting section by ID:', error);
      throw error;
    }
  }

  // Convert course schedule to campus time slots
  static convertScheduleToSlots(sectionSchedule, labSchedules = []) {
    const timeSlotMap = {
      '08:00:00': 'slot-1', // 8:00 AM - 9:20 AM
      '09:30:00': 'slot-2', // 9:30 AM - 10:50 AM  
      '11:00:00': 'slot-3', // 11:00 AM - 12:20 PM
      '12:30:00': 'slot-4', // 12:30 PM - 1:50 PM
      '14:00:00': 'slot-5', // 2:00 PM - 3:20 PM
      '15:30:00': 'slot-6', // 3:30 PM - 5:00 PM
      '17:00:00': 'slot-7'  // After 5:00 PM
    };

    const dayMap = {
      'SATURDAY': 'sat',
      'SUNDAY': 'sun', 
      'MONDAY': 'mon',
      'TUESDAY': 'tue',
      'WEDNESDAY': 'wed',
      'THURSDAY': 'thu'
    };

    const occupiedSlots = [];

    // Process class schedules
    if (sectionSchedule?.classSchedules) {
      sectionSchedule.classSchedules.forEach(schedule => {
        const day = dayMap[schedule.day];
        const timeSlot = timeSlotMap[schedule.startTime];
        
        if (day && timeSlot) {
          occupiedSlots.push(`${day}-${timeSlot.split('-')[1]}`);
        }
      });
    }

    // Process lab schedules
    if (labSchedules && Array.isArray(labSchedules)) {
      labSchedules.forEach(schedule => {
        const day = dayMap[schedule.day];
        const timeSlot = timeSlotMap[schedule.startTime];
        
        if (day && timeSlot) {
          occupiedSlots.push(`${day}-${timeSlot.split('-')[1]}`);
        }
      });
    }

    return occupiedSlots;
  }

  // Check for schedule conflicts between selected sections
  static checkScheduleConflicts(selectedSections) {
    const allOccupiedSlots = [];
    const conflicts = [];

    selectedSections.forEach(section => {
      const sectionSlots = Course.convertScheduleToSlots(
        section.schedule, 
        section.labSchedules
      );
      
      sectionSlots.forEach(slot => {
        const existingSection = allOccupiedSlots.find(occupied => occupied.slot === slot);
        if (existingSection) {
          conflicts.push({
            slot,
            courses: [existingSection.courseCode, section.courseCode]
          });
        } else {
          allOccupiedSlots.push({
            slot,
            courseCode: section.courseCode,
            sectionName: section.sectionName
          });
        }
      });
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      occupiedSlots: allOccupiedSlots.map(item => item.slot)
    };
  }

  // Format section for display
  toJSON() {
    return {
      sectionId: this.sectionId,
      courseId: this.courseId,
      sectionName: this.sectionName,
      courseCredit: this.courseCredit,
      courseCode: this.courseCode,
      sectionType: this.sectionType,
      capacity: this.capacity,
      consumedSeat: this.consumedSeat,
      availableSeats: this.capacity - this.consumedSeat,
      faculties: this.faculties,
      roomName: this.roomName,
      schedule: this.sectionSchedule,
      labSchedules: this.labSchedules
    };
  }
}

export default Course;
