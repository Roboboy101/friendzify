import React from 'react'

const ScheduleViewModal = ({ friend, onClose }) => {
  const parseSchedule = (scheduleString) => {
    if (!scheduleString || scheduleString === 'No schedule selected') {
      return {}
    }

    const slots = scheduleString.split(', ').filter(Boolean)
    const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
    const byDay = Object.fromEntries(days.map(d => [d, []]))

    slots.forEach(slot => {
      const firstSpace = slot.indexOf(' ')
      if (firstSpace > -1) {
        const day = slot.slice(0, firstSpace)
        const timeRest = slot.slice(firstSpace + 1)
        
        if (byDay[day]) {
          byDay[day].push({
            time: timeRest,
            full: slot
          })
        }
      }
    })

    return byDay
  }

  const parseSelectedCourses = () => {
    if (!friend.selected_courses) return []
    try {
      return JSON.parse(friend.selected_courses)
    } catch {
      return []
    }
  }

  const scheduleByDay = parseSchedule(friend.free_schedule)
  const selectedCourses = parseSelectedCourses()
  const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
  const activeDays = days.filter(day => scheduleByDay[day] && scheduleByDay[day].length > 0)
  
  // Check visibility settings - handle database numbers properly
  const showCourses = Boolean(friend.course_visibility) && selectedCourses.length > 0
  const showFreeSlots = Boolean(friend.free_slot_visibility) && activeDays.length > 0

  // Use the same time slots as CampusSchedule
  const timeSlots = [
    '8:00 AM - 9:20 AM',
    '9:30 AM - 10:50 AM',
    '11:00 AM - 12:20 PM',
    '12:30 PM - 1:50 PM',
    '2:00 PM - 3:20 PM',
    '3:30 PM - 5:00 PM',
    'After 5:00 PM'
  ]

  const getDayAbbr = (day) => {
    const abbrs = {
      'Saturday': 'SAT',
      'Sunday': 'SUN',
      'Monday': 'MON',
      'Tuesday': 'TUE',
      'Wednesday': 'WED',
      'Thursday': 'THU'
    }
    return abbrs[day] || day.slice(0, 3).toUpperCase()
  }

  // Map day/time to slot id similar to CampusSchedule (sat-1, sun-2, etc.)
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

  const getSlotIdForDayTime = (day, timeLabel) => {
    const slots = scheduleData[day] || []
    const slot = slots.find(s => s.time === timeLabel)
    return slot ? slot.id : null
  }

  // Convert course schedules to occupied slot ids (orange)
  const toTimeLabel = (start, end) => {
    const key = `${start}-${end}`
    const map = {
      '08:00:00-09:20:00': '8:00 AM - 9:20 AM',
      '09:30:00-10:50:00': '9:30 AM - 10:50 AM',
      '11:00:00-12:20:00': '11:00 AM - 12:20 PM',
      '12:30:00-13:50:00': '12:30 PM - 1:50 PM',
      '14:00:00-15:20:00': '2:00 PM - 3:20 PM',
      '15:30:00-17:00:00': '3:30 PM - 5:00 PM'
    }
    return map[key] || 'After 5:00 PM'
  }

  const normalizeDay = (d) => {
    const map = {
      'SATURDAY': 'Saturday',
      'SUNDAY': 'Sunday',
      'MONDAY': 'Monday',
      'TUESDAY': 'Tuesday',
      'WEDNESDAY': 'Wednesday',
      'THURSDAY': 'Thursday'
    }
    return map[d] || d
  }

  const getCourseOccupiedSlots = () => {
    const occupied = new Set()
    selectedCourses.forEach((course) => {
      const classSchedules = course.schedule?.classSchedules || []
      const labSchedules = course.labSchedules || []
      const all = [...classSchedules, ...labSchedules]
      all.forEach((s) => {
        const day = normalizeDay(s.day)
        const timeLabel = toTimeLabel(s.startTime, s.endTime)
        const id = getSlotIdForDayTime(day, timeLabel)
        if (id) occupied.add(id)
      })
    })
    return Array.from(occupied)
  }

  const courseOccupiedSlots = showCourses ? getCourseOccupiedSlots() : []

  const isSlotSelected = (day, timeSlot) => {
    const list = scheduleByDay[day] || []
    return list.some(s => s.time === timeSlot)
  }

  const isCourseSlot = (day, timeSlot) => {
    const id = getSlotIdForDayTime(day, timeSlot)
    return id ? courseOccupiedSlots.includes(id) : false
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{friend.name}'s Schedule</h3>
              <p className="text-sm text-gray-600">{friend.department} • Batch {friend.batch}</p>
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

          {(showCourses || showFreeSlots) ? (
            <>
              {/* Overview */}
              <div className="mb-6 space-y-4">
                {showCourses && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="font-medium text-blue-900">Courses</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      {friend.name} is taking {selectedCourses.length} courses ({selectedCourses.reduce((sum, c) => sum + (c.courseCredit || 3), 0)} credits total).
                    </p>
                  </div>
                )}
                
                {showFreeSlots && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-green-900">Free Times</span>
                    </div>
                    <p className="text-sm text-green-800">
                      {friend.name} is available for {friend.free_schedule.split(', ').length} time slots across {activeDays.length} days.
                    </p>
                  </div>
                )}
              </div>

              {/* Course List */}
              {showCourses && (
                <div className="mb-8">
                  <h4 className="font-medium text-gray-900 mb-4">Enrolled Courses</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedCourses.map((course, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-semibold text-gray-900">{course.courseCode}</h5>
                            <p className="text-sm text-gray-600">Section {course.sectionName} • {course.courseCredit} Credits</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Room:</span> {course.roomName || 'TBA'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Grid */}
              {(showCourses || showFreeSlots) && (
                <div className="space-y-6">
                  <h4 className="font-medium text-gray-900">Weekly Schedule</h4>
                
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      {/* Header */}
                      <div className="grid grid-cols-8 gap-2 mb-4">
                        <div className="text-sm font-medium text-gray-700 py-2">Time</div>
                        {days.map(day => (
                          <div key={day} className="text-sm font-medium text-gray-700 py-2 text-center">
                            {getDayAbbr(day)}
                          </div>
                        ))}
                      </div>

                      {/* Time Slots */}
                      <div className="space-y-2">
                        {timeSlots.map(timeSlot => (
                          <div key={timeSlot} className="grid grid-cols-8 gap-2">
                            <div className="text-xs text-gray-600 py-3 font-medium">
                              {timeSlot}
                            </div>
                            {days.map(day => (
                              <div key={`${day}-${timeSlot}`} className="flex justify-center">
                                <div
                                  className={`w-full h-10 rounded-lg border-2 flex items-center justify-center ${
                                    isCourseSlot(day, timeSlot)
                                      ? 'bg-orange-100 border-orange-300 text-orange-600'
                                      : (showFreeSlots && isSlotSelected(day, timeSlot))
                                        ? 'bg-green-100 border-green-300 text-green-700'
                                        : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  {isCourseSlot(day, timeSlot) && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6l3 6H9l3-6z" />
                                    </svg>
                                  )}
                                  {!isCourseSlot(day, timeSlot) && showFreeSlots && isSlotSelected(day, timeSlot) && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Schedule Shared</h4>
              <p className="text-gray-600">
                {friend.name} hasn't shared their course schedule or free time slots yet, or has set them to private.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Schedule shows campus hours: Saturday to Thursday
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScheduleViewModal

