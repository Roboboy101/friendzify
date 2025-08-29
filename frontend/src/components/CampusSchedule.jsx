import React, { useState, useEffect } from 'react'
import { userAPI, courseAPI } from '../utils/api'
import CourseSelection from './CourseSelection'

const CampusSchedule = ({ isOpen, onClose, currentSchedule, onScheduleUpdate }) => {
  const [selectedSlots, setSelectedSlots] = useState([])
  const [occupiedSlots, setOccupiedSlots] = useState([]) // Course-blocked slots
  const [selectedCourses, setSelectedCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCourseSelection, setShowCourseSelection] = useState(false)
  const [courseVisibility, setCourseVisibility] = useState(true)
  const [freeSlotVisibility, setFreeSlotVisibility] = useState(true)
  const [visibilityLoading, setVisibilityLoading] = useState(false)

  // Campus schedule structure (Saturday to Thursday)
  const scheduleData = {
    'Saturday': [
      { id: 'sat-1', time: '8:00 AM - 9:20 AM' },
      { id: 'sat-2', time: '9:30 AM - 10:50 AM' },
      { id: 'sat-3', time: '11:00 AM - 12:20 PM' },
      { id: 'sat-4', time: '12:30 PM - 1:50 PM' },
      { id: 'sat-5', time: '2:00 PM - 3:20 PM' },
      { id: 'sat-6', time: '3:30 PM - 5:00 PM' },
      { id: 'sat-7', time: 'After 5:00 PM' }
    ],
    'Sunday': [
      { id: 'sun-1', time: '8:00 AM - 9:20 AM' },
      { id: 'sun-2', time: '9:30 AM - 10:50 AM' },
      { id: 'sun-3', time: '11:00 AM - 12:20 PM' },
      { id: 'sun-4', time: '12:30 PM - 1:50 PM' },
      { id: 'sun-5', time: '2:00 PM - 3:20 PM' },
      { id: 'sun-6', time: '3:30 PM - 5:00 PM' },
      { id: 'sun-7', time: 'After 5:00 PM' }
    ],
    'Monday': [
      { id: 'mon-1', time: '8:00 AM - 9:20 AM' },
      { id: 'mon-2', time: '9:30 AM - 10:50 AM' },
      { id: 'mon-3', time: '11:00 AM - 12:20 PM' },
      { id: 'mon-4', time: '12:30 PM - 1:50 PM' },
      { id: 'mon-5', time: '2:00 PM - 3:20 PM' },
      { id: 'mon-6', time: '3:30 PM - 5:00 PM' },
      { id: 'mon-7', time: 'After 5:00 PM' }
    ],
    'Tuesday': [
      { id: 'tue-1', time: '8:00 AM - 9:20 AM' },
      { id: 'tue-2', time: '9:30 AM - 10:50 AM' },
      { id: 'tue-3', time: '11:00 AM - 12:20 PM' },
      { id: 'tue-4', time: '12:30 PM - 1:50 PM' },
      { id: 'tue-5', time: '2:00 PM - 3:20 PM' },
      { id: 'tue-6', time: '3:30 PM - 5:00 PM' },
      { id: 'tue-7', time: 'After 5:00 PM' }
    ],
    'Wednesday': [
      { id: 'wed-1', time: '8:00 AM - 9:20 AM' },
      { id: 'wed-2', time: '9:30 AM - 10:50 AM' },
      { id: 'wed-3', time: '11:00 AM - 12:20 PM' },
      { id: 'wed-4', time: '12:30 PM - 1:50 PM' },
      { id: 'wed-5', time: '2:00 PM - 3:20 PM' },
      { id: 'wed-6', time: '3:30 PM - 5:00 PM' },
      { id: 'wed-7', time: 'After 5:00 PM' }
    ],
    'Thursday': [
      { id: 'thu-1', time: '8:00 AM - 9:20 AM' },
      { id: 'thu-2', time: '9:30 AM - 10:50 AM' },
      { id: 'thu-3', time: '11:00 AM - 12:20 PM' },
      { id: 'thu-4', time: '12:30 PM - 1:50 PM' },
      { id: 'thu-5', time: '2:00 PM - 3:20 PM' },
      { id: 'thu-6', time: '3:30 PM - 5:00 PM' },
      { id: 'thu-7', time: 'After 5:00 PM' }
    ]
  }

  const timeSlots = ['8:00 AM - 9:20 AM', '9:30 AM - 10:50 AM', '11:00 AM - 12:20 PM', '12:30 PM - 1:50 PM', '2:00 PM - 3:20 PM', '3:30 PM - 5:00 PM', 'After 5:00 PM']
  const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']

  useEffect(() => {
    if (isOpen) {
      loadMyCourses()
    }
    if (currentSchedule) {
      // Parse current schedule to get selected slots
      const slots = parseCurrentSchedule(currentSchedule)
      setSelectedSlots(slots)
    }
  }, [currentSchedule, isOpen])

  // Load courses on component mount for persistence
  useEffect(() => {
    loadMyCourses()
  }, []) // Empty dependency array = runs once on mount, regardless of modal state

  const loadMyCourses = async () => {
    try {
      const response = await courseAPI.getMyCourses()
      const data = await response.json()
      
      if (data.success) {
        setSelectedCourses(data.selectedCourses || [])
        setOccupiedSlots(data.occupiedSlots || [])
        // Backend now sends proper boolean values
        setCourseVisibility(data.courseVisibility)
        setFreeSlotVisibility(data.freeSlotVisibility)
      }
    } catch (error) {
      console.error('Load my courses error:', error)
    }
  }

  const parseCurrentSchedule = (schedule) => {
    if (!schedule) return []
    
    // Try to match the schedule string with our slot IDs
    const slots = []
    days.forEach(day => {
      scheduleData[day].forEach(slot => {
        const fullSlotText = `${day} ${slot.time}`
        if (schedule.includes(fullSlotText)) {
          slots.push(slot.id)
        }
      })
    })
    return slots
  }

  const handleSlotClick = (slotId) => {
    // Prevent clicking on course-occupied slots
    if (occupiedSlots.includes(slotId)) {
      return
    }

    // Require at least 1 course to be selected before allowing free slot selection
    if (selectedCourses.length === 0) {
      setError('Please select at least 1 course before choosing free slots')
      return
    }

    setSelectedSlots(prev => {
      if (prev.includes(slotId)) {
        return prev.filter(id => id !== slotId)
      } else {
        return [...prev, slotId]
      }
    })
    setError('')
    setSuccess('')
  }

  const handleCoursesSelected = (courses, courseOccupiedSlots) => {
    setSelectedCourses(courses)
    setOccupiedSlots(courseOccupiedSlots)
    setShowCourseSelection(false)
    
    // Remove any free slots that conflict with course slots
    setSelectedSlots(prev => prev.filter(slotId => !courseOccupiedSlots.includes(slotId)))
  }

  const updateVisibility = async (newCourseVisibility, newFreeSlotVisibility) => {
    if (visibilityLoading) return; // Prevent multiple requests
    
    try {
      setVisibilityLoading(true)
      const response = await courseAPI.updateVisibility(newCourseVisibility, newFreeSlotVisibility)
      const data = await response.json()
      
      if (data.success) {
        setCourseVisibility(newCourseVisibility)
        setFreeSlotVisibility(newFreeSlotVisibility)
        setSuccess('Visibility settings updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to update visibility settings')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      setError('Failed to update visibility settings')
      setTimeout(() => setError(''), 3000)
    } finally {
      setVisibilityLoading(false)
    }
  }

  const handleSelectDay = (day) => {
    // Require at least 1 course to be selected before allowing free slot selection
    if (selectedCourses.length === 0) {
      setError('Please select at least 1 course before choosing free slots')
      return
    }

    const daySlots = scheduleData[day].map(slot => slot.id)
    const availableSlots = daySlots.filter(slotId => !occupiedSlots.includes(slotId))
    const allAvailableSelected = availableSlots.every(slotId => selectedSlots.includes(slotId))
    
    if (allAvailableSelected) {
      // Deselect all available slots for this day
      setSelectedSlots(prev => prev.filter(slotId => !availableSlots.includes(slotId)))
    } else {
      // Select all available slots for this day (skip occupied ones)
      setSelectedSlots(prev => {
        const newSlots = [...prev]
        availableSlots.forEach(slotId => {
          if (!newSlots.includes(slotId)) {
            newSlots.push(slotId)
          }
        })
        return newSlots
      })
    }
  }

  const handleClearAll = () => {
    setSelectedSlots([])
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Convert selected slots to readable format
      const scheduleText = selectedSlots.map(slotId => {
        for (const day of days) {
          const slot = scheduleData[day].find(s => s.id === slotId)
          if (slot) {
            return `${day} ${slot.time}`
          }
        }
        return null
      }).filter(Boolean).join(', ')

      const response = await userAPI.updateProfile({
        free_schedule: scheduleText || 'No schedule selected'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Schedule updated successfully!')
        onScheduleUpdate(scheduleText)
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}')
        userData.free_schedule = scheduleText
        localStorage.setItem('userData', JSON.stringify(userData))
        
        // Trigger profile update event
        window.dispatchEvent(new CustomEvent('profileUpdated'))
        
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(data.message || 'Failed to update schedule')
      }
    } catch (error) {
      console.error('Schedule update error:', error)
      setError('Failed to update schedule. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Campus Free Schedule</h2>
              <p className="text-gray-600 mt-1">Select your available time slots (Saturday to Thursday)</p>
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

        {/* Content */}
        <div className="px-6 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* Controls */}
          {/* Course Selection Button */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Course & Section Selection</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {selectedCourses.length > 0 
                    ? `${selectedCourses.length} courses selected (${selectedCourses.reduce((sum, c) => sum + (c.courseCredit || 3), 0)} credits)`
                    : 'Select your courses first to block class times'
                  }
                </p>
              </div>
              <button
                onClick={() => setShowCourseSelection(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {selectedCourses.length > 0 ? 'Edit Courses' : 'Select Courses'}
              </button>
            </div>
          </div>

          {/* Visibility Controls */}
          {selectedCourses.length > 0 && (
            <div className="mb-6 p-5 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Friend Visibility Settings
                </h3>
                {visibilityLoading && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Updating...</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Course Visibility Toggle */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show my courses to friends</label>
                      <p className="text-xs text-gray-500">Let friends see your enrolled courses and schedules</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      courseVisibility 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {courseVisibility ? 'Visible' : 'Hidden'}
                    </div>
                    
                    {/* Modern Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => updateVisibility(!courseVisibility, freeSlotVisibility)}
                      disabled={visibilityLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                        courseVisibility ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          courseVisibility ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Free Slot Visibility Toggle */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900">Show my free slots to friends</label>
                      <p className="text-xs text-gray-500">Let friends see when you're available for meetups</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      freeSlotVisibility 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {freeSlotVisibility ? 'Visible' : 'Hidden'}
                    </div>
                    
                    {/* Modern Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => updateVisibility(courseVisibility, !freeSlotVisibility)}
                      disabled={visibilityLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 ${
                        freeSlotVisibility ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          freeSlotVisibility ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                Free slots: {selectedSlots.length} selected
              </span>
              <button
                onClick={handleClearAll}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear All Free Slots
              </button>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-primary-100 border border-primary-300 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>Free Time</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                <span>Course</span>
              </div>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 border-b border-gray-200">
                    Time Slots
                  </th>
                  {days.map(day => (
                    <th key={day} className="text-center py-3 px-2 font-medium text-gray-900 border-b border-gray-200 min-w-[120px]">
                      <div className="flex flex-col items-center space-y-1">
                        <span>{day}</span>
                        <button
                          onClick={() => handleSelectDay(day)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Select All
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot, timeIndex) => (
                  <tr key={timeIndex} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900 border-b border-gray-100">
                      {timeSlot}
                    </td>
                    {days.map(day => {
                      const slot = scheduleData[day][timeIndex]
                      const isSelected = selectedSlots.includes(slot.id)
                      const isOccupied = occupiedSlots.includes(slot.id)
                      
                      return (
                        <td key={`${day}-${timeIndex}`} className="py-2 px-2 border-b border-gray-100">
                          <button
                            onClick={() => handleSlotClick(slot.id)}
                            disabled={isOccupied}
                            className={`w-full h-12 rounded-lg border-2 transition-all duration-200 ${
                              isOccupied
                                ? 'bg-orange-100 border-orange-300 text-orange-600 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-green-600 border-green-600 text-white shadow-lg hover:scale-105'
                                  : 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100 hover:border-primary-300 hover:scale-105'
                            }`}
                            title={isOccupied ? 'Occupied by course' : isSelected ? 'Selected as free time' : 'Click to select as free time'}
                          >
                            {isOccupied ? (
                              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            ) : isSelected ? (
                              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Slots Summary */}
          {selectedSlots.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Selected Time Slots:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {selectedSlots.map(slotId => {
                  for (const day of days) {
                    const slot = scheduleData[day].find(s => s.id === slotId)
                    if (slot) {
                      return (
                        <div key={slotId} className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>{day} - {slot.time}</span>
                        </div>
                      )
                    }
                  }
                  return null
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-primary-400 cursor-not-allowed text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {loading ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>

      {/* Course Selection Modal */}
      <CourseSelection
        isOpen={showCourseSelection}
        onClose={() => setShowCourseSelection(false)}
        onCoursesSelected={handleCoursesSelected}
        initialSelectedCourses={selectedCourses}
        initialOccupiedSlots={occupiedSlots}
      />
    </div>
  )
}

export default CampusSchedule
