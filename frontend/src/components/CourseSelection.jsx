import React, { useState, useEffect } from 'react';
import { courseAPI } from '../utils/api';

const CourseSelection = ({ isOpen, onClose, onCoursesSelected, initialSelectedCourses = [], initialOccupiedSlots = [] }) => {
  const [allCourses, setAllCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [courseVisibility, setCourseVisibility] = useState(true);
  const [freeSlotVisibility, setFreeSlotVisibility] = useState(true);
  const [courseInput, setCourseInput] = useState('');
  const [sectionInput, setSectionInput] = useState('');
  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const [sectionSuggestions, setSectionSuggestions] = useState([]);
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);
  const [showSectionSuggestions, setShowSectionSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllCourses();
      // Use parent data if available, otherwise load from API
      if (initialSelectedCourses.length > 0) {
        setSelectedCourses(initialSelectedCourses);
      } else {
        loadMyCourses();
      }
    }
  }, [isOpen, initialSelectedCourses]);

  // Sync with parent data when it changes
  useEffect(() => {
    if (initialSelectedCourses.length > 0) {
      setSelectedCourses(initialSelectedCourses);
    }
  }, [initialSelectedCourses]);

  useEffect(() => {
    if (courseInput.length > 0) {
      const filtered = allCourses.filter(course => 
        course.courseCode.toLowerCase().includes(courseInput.toLowerCase())
      ).slice(0, 8);
      setCourseSuggestions(filtered);
      setShowCourseSuggestions(filtered.length > 0);
    } else {
      setShowCourseSuggestions(false);
    }
  }, [courseInput, allCourses]);

  useEffect(() => {
    if (sectionInput.length > 0 && courseInput) {
      const course = allCourses.find(c => c.courseCode.toLowerCase() === courseInput.toLowerCase());
      if (course) {
        const filtered = course.sections.filter(section => 
          section.sectionName.toLowerCase().includes(sectionInput.toLowerCase())
        ).slice(0, 6);
        setSectionSuggestions(filtered);
        setShowSectionSuggestions(filtered.length > 0);
      }
    } else {
      setShowSectionSuggestions(false);
    }
  }, [sectionInput, courseInput, allCourses]);

  const loadAllCourses = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getAllCourses('');
      const data = await response.json();
      
      if (data.success) {
        setAllCourses(data.courses);
      } else {
        setError(data.message || 'Failed to load courses');
      }
    } catch (error) {
      console.error('Load courses error:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadMyCourses = async () => {
    try {
      const response = await courseAPI.getMyCourses();
      const data = await response.json();
      
      if (data.success) {
        setSelectedCourses(data.selectedCourses || []);
        setCourseVisibility(data.courseVisibility !== false);
        setFreeSlotVisibility(data.freeSlotVisibility !== false);
      }
    } catch (error) {
      console.error('Load my courses error:', error);
    }
  };

  const addCourse = async () => {
    if (!courseInput.trim() || !sectionInput.trim()) {
      setError('Please enter both course code and section');
      return;
    }

    const course = allCourses.find(c => c.courseCode.toLowerCase() === courseInput.toLowerCase());
    if (!course) {
      setError(`Course "${courseInput}" not found`);
      return;
    }

    const section = course.sections.find(s => s.sectionName.toLowerCase() === sectionInput.toLowerCase());
    if (!section) {
      setError(`Section "${sectionInput}" not found for course "${courseInput}"`);
      return;
    }

    // Check if already selected
    const alreadySelected = selectedCourses.some(s => 
      s.courseCode.toLowerCase() === courseInput.toLowerCase()
    );
    
    if (alreadySelected) {
      setError(`Course "${courseInput}" is already selected`);
      return;
    }

    const newCourse = {
      sectionId: section.sectionId,
      courseCode: course.courseCode,
      sectionName: section.sectionName,
      courseCredit: course.courseCredit,
      faculties: section.faculties,
      roomName: section.roomName,
      schedule: section.schedule,
      labSchedules: section.labSchedules
    };

    const updatedCourses = [...selectedCourses, newCourse];
    setSelectedCourses(updatedCourses);
    
    // Check for conflicts
    await checkConflicts(updatedCourses);
    
    // Clear inputs
    setCourseInput('');
    setSectionInput('');
    setError('');
    setShowCourseSuggestions(false);
    setShowSectionSuggestions(false);
  };

  const handleRemoveCourse = (courseCode) => {
    setSelectedCourses(prev => prev.filter(s => s.courseCode !== courseCode));
    setConflicts([]);
  };

  const checkConflicts = async (selections) => {
    if (selections.length < 2) {
      setConflicts([]);
      return false;
    }

    try {
      const sectionIds = selections.map(s => s.sectionId);
      const response = await courseAPI.checkConflicts(sectionIds);
      const data = await response.json();
      
      if (data.success) {
        const conflictsWithDetails = (data.conflicts || []).map(conflict => ({
          ...conflict,
          courses: conflict.courses.map(courseCode => {
            const course = selections.find(s => s.courseCode === courseCode);
            return {
              courseCode,
              sectionName: course?.sectionName || 'Unknown',
              schedule: getConflictingSchedule(course, conflict.slot)
            };
          })
        }));
        setConflicts(conflictsWithDetails);
        return data.hasConflicts;
      }
    } catch (error) {
      console.error('Check conflicts error:', error);
    }
    return false;
  };

  const getConflictingSchedule = (course, slot) => {
    if (!course) return 'Unknown schedule';
    
    // Convert slot back to day and time for display
    const dayMap = { 'sat': 'Saturday', 'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday' };
    const timeMap = { '1': '8:00-9:20', '2': '9:30-10:50', '3': '11:00-12:20', '4': '12:30-1:50', '5': '2:00-3:20', '6': '3:30-5:00', '7': 'After 5:00' };
    
    const [day, time] = slot.split('-');
    return `${dayMap[day] || day} ${timeMap[time] || time}`;
  };

  const handleSaveCourses = async () => {
    // Prevent multiple saves
    if (loading) return;
    
    try {
      setLoading(true);
      setError('');

      // Minimum 1 course requirement
      if (selectedCourses.length === 0) {
        setError('Please select at least 1 course');
        setLoading(false);
        return;
      }

      // Check for conflicts before saving
      const hasConflicts = await checkConflicts(selectedCourses);
      
      if (hasConflicts) {
        setError('Please resolve schedule conflicts before saving');
        setLoading(false);
        return;
      }

      const response = await courseAPI.saveSelectedCourses(
        selectedCourses.map(course => ({ sectionId: course.sectionId })),
        courseVisibility,
        freeSlotVisibility
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        setError(`Server error: ${response.status} - ${errorText || 'Unknown error'}`);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Clear any existing errors immediately
        setError('');
        
        // Update parent state immediately for smooth transition
        onCoursesSelected(data.selectedCourses, data.occupiedSlots);
        
        // Close modal immediately - no delay needed
        onClose();
      } else {
        if (data.conflicts) {
          setConflicts(data.conflicts);
        }
        setError(data.message || 'Failed to save course selection');
      }
    } catch (error) {
      console.error('Save courses error:', error);
      setError(`Network error: ${error.message || 'Failed to save course selection'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatSchedule = (schedule, labSchedules) => {
    const schedules = [];
    
    if (schedule?.classSchedules) {
      schedule.classSchedules.forEach(s => {
        schedules.push(`${s.day} ${s.startTime}-${s.endTime}`);
      });
    }
    
    if (labSchedules && labSchedules.length > 0) {
      labSchedules.forEach(s => {
        schedules.push(`${s.day} ${s.startTime}-${s.endTime} (Lab)`);
      });
    }
    
    return schedules.join(', ') || 'No schedule';
  };

  const getTotalCredits = () => {
    return selectedCourses.reduce((total, course) => total + (course.courseCredit || 3), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Select Your Courses</h2>
              <p className="text-gray-600 mt-1">
                Choose course codes, then pick specific sections • {selectedCourses.length} courses selected ({getTotalCredits()} credits)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Type Course & Section */}
          <div className="w-2/5 border-r border-gray-200 flex flex-col">
            {/* Input Section */}
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Courses</h3>
              
              <div className="space-y-4">
                {/* Course Code Input */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                  <input
                    type="text"
                    placeholder="Type course code (e.g., MAT120, CSE110)..."
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && sectionInput && addCourse()}
                  />
                  
                  {/* Course Suggestions */}
                  {showCourseSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {courseSuggestions.map((course) => (
                        <button
                          key={course.courseCode}
                          onClick={() => {
                            setCourseInput(course.courseCode);
                            setShowCourseSuggestions(false);
                            // Auto-focus section input
                            setTimeout(() => {
                              const sectionInput = document.querySelector('input[placeholder*="section"]');
                              if (sectionInput) sectionInput.focus();
                            }, 100);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-primary-50 hover:border-primary-200 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{course.courseCode}</div>
                          <div className="text-sm text-gray-600">{course.courseCredit} Credits • {course.sections.length} Sections</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section Input */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                  <input
                    type="text"
                    placeholder="Type section (e.g., 01, 02, 03)..."
                    value={sectionInput}
                    onChange={(e) => setSectionInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && courseInput && addCourse()}
                    disabled={!courseInput}
                  />
                  
                  {/* Section Suggestions */}
                  {showSectionSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                      {sectionSuggestions.map((section) => (
                        <button
                          key={section.sectionId}
                          onClick={() => {
                            setSectionInput(section.sectionName);
                            setShowSectionSuggestions(false);
                            // Auto-add course immediately
                            setTimeout(() => {
                              addCourse();
                            }, 100);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-primary-50 hover:border-primary-200 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">Section {section.sectionName}</div>
                          <div className="text-sm text-gray-600">{section.faculties || 'Faculty TBA'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Button */}
                <button
                  onClick={addCourse}
                  disabled={!courseInput || !sectionInput || loading}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Adding...' : 'Add Course'}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Conflicts Section */}
            {conflicts.length > 0 && (
              <div className="p-6 bg-red-50 border-b border-red-200">
                <h4 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Schedule Conflicts Detected
                </h4>
                <div className="space-y-3">
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="font-medium text-red-800 mb-2">
                        Time Slot Conflict: {conflict.slot}
                      </div>
                      <div className="space-y-1">
                        {conflict.courses.map((course, courseIndex) => (
                          <div key={courseIndex} className="text-sm text-red-700 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="font-medium">{course.courseCode} Section {course.sectionName}</span>
                            <span className="text-red-600">({course.schedule})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friend Visibility Controls */}
            <div className="p-6 border-b border-gray-100 bg-blue-50">
              <h4 className="font-medium text-gray-900 mb-3">Friend Visibility</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={courseVisibility}
                    onChange={(e) => setCourseVisibility(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show my courses to friends</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={freeSlotVisibility}
                    onChange={(e) => setFreeSlotVisibility(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show my free slots to friends</span>
                </label>
              </div>
            </div>

            {/* Quick Guide */}
            <div className="flex-1 p-6">
              <h4 className="font-medium text-gray-900 mb-3">Quick Guide</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Type course code (e.g., MAT120, CSE110)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Select from suggestions or type section number</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Press Enter or click "Add Course"</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Conflicts will be shown immediately</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Selected Courses */}
          <div className="w-3/5 flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Selected Courses</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCourses.length} courses • {getTotalCredits()} total credits
                    {conflicts.length > 0 && (
                      <span className="ml-2 text-red-600 font-medium">
                        • {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
                {selectedCourses.length > 0 && (
                  <button
                    onClick={() => setSelectedCourses([])}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedCourses.length === 0 ? (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Courses Added Yet</h4>
                    <p className="text-gray-600 max-w-sm">
                      Type course codes and sections on the left to build your schedule. 
                      Conflicts will be detected automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {selectedCourses.map((course, index) => {
                    const hasConflict = conflicts.some(conflict => 
                      conflict.courses.some(c => c.courseCode === course.courseCode)
                    );
                    
                    return (
                      <div key={course.sectionId} className={`rounded-lg border transition-all ${
                        hasConflict 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-green-300 bg-green-50'
                      }`}>
                        {/* Course Header */}
                        <div className={`p-3 rounded-t-lg ${
                          hasConflict ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                hasConflict ? 'bg-red-500' : 'bg-green-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">{course.courseCode}</h4>
                                <p className="text-xs text-gray-600">
                                  Section {course.sectionName} • {course.courseCredit} Credits
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              {hasConflict && (
                                <div className="flex items-center text-red-600">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="text-xs font-medium">Conflict</span>
                                </div>
                              )}
                              
                              <button
                                onClick={() => handleRemoveCourse(course.courseCode)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Remove course"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Course Details */}
                        <div className="p-3 bg-white">
                          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                            <div>
                              <span className="font-medium text-gray-700">Faculty:</span>
                              <p className="text-gray-900 truncate">{course.faculties || 'TBA'}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Room:</span>
                              <p className="text-gray-900 truncate">{course.roomName || 'TBA'}</p>
                            </div>
                          </div>
                          
                          {/* Schedule Details */}
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium text-gray-700 flex items-center text-xs mb-1">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Class
                              </span>
                              <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded">
                                {formatSchedule(course.schedule, []) || 'No schedule'}
                              </p>
                            </div>
                            
                            {course.labSchedules && course.labSchedules.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 flex items-center text-xs mb-1">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Lab
                                </span>
                                <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded">
                                  {formatSchedule(null, course.labSchedules)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200 flex-shrink-0">
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <div className="flex items-center space-x-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCourses}
              disabled={loading || selectedCourses.length === 0 || conflicts.length > 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Courses'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseSelection;
