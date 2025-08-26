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

  const scheduleByDay = parseSchedule(friend.free_schedule)
  const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
  const activeDays = days.filter(day => scheduleByDay[day] && scheduleByDay[day].length > 0)

  const timeSlots = [
    '8:00AM-9:20',
    '9:30-10:50',
    '11:00-12:20',
    '12:30-1:50',
    '2:00-3:20',
    '3:30-5:00PM',
    'After 5:00PM'
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

  const isSlotSelected = (day, timeSlot) => {
    if (!scheduleByDay[day]) return false
    
    return scheduleByDay[day].some(slot => {
      const normalizedSlot = slot.time
        .replace(/\s*AM|\s*PM/gi, '')
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*-\s*/g, '-')
        .replace(/After\s*5.*$/i, 'After 5')
      
      const normalizedTimeSlot = timeSlot
        .replace(/\s*AM|\s*PM/gi, '')
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*-\s*/g, '-')
        .replace(/After\s*5.*$/i, 'After 5')
      
      return normalizedSlot === normalizedTimeSlot
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{friend.name}'s Available Times</h3>
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

          {activeDays.length > 0 ? (
            <>
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-green-900">Schedule Overview</span>
                  </div>
                  <p className="text-sm text-green-800">
                    {friend.name} is available for {friend.free_schedule.split(', ').length} time slots across {activeDays.length} days.
                  </p>
                </div>
              </div>

              {/* Schedule Grid */}
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
                                  isSlotSelected(day, timeSlot)
                                    ? 'bg-green-100 border-green-300 text-green-700'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {isSlotSelected(day, timeSlot) && (
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

              {/* Available Times List */}
              <div className="mt-8">
                <h4 className="font-medium text-gray-900 mb-4">Available Time Slots</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeDays.map(day => (
                    <div key={day} className="bg-gray-50 rounded-lg p-4">
                      <div className="font-medium text-gray-900 mb-2">{day}</div>
                      <div className="space-y-2">
                        {scheduleByDay[day].map((slot, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">{slot.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Schedule Available</h4>
              <p className="text-gray-600">
                {friend.name} hasn't shared their campus free schedule yet.
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

