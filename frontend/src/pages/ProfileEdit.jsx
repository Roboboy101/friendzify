import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userAPI } from '../utils/api'
import CampusSchedule from '../components/CampusSchedule'
import Avatar from '../components/Avatar'

const ProfileEdit = () => {
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    department: '',
    batch: '',
    free_schedule: ''
  })
  const [profilePicture, setProfilePicture] = useState(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState(null)
  const [currentProfilePicture, setCurrentProfilePicture] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [avatarVersion, setAvatarVersion] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const departments = [
    'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
    'Civil Engineering', 'Business Administration', 'Mathematics',
    'Physics', 'Chemistry', 'Biology', 'English', 'Other'
  ]



  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('userToken')
        if (!token) {
          navigate('/signin')
          return
        }

        const response = await userAPI.getProfile()
        if (response.ok) {
          const data = await response.json()
          setFormData({
            name: data.user.name || '',
            bio: data.user.bio || '',
            department: data.user.department || '',
            batch: data.user.batch || '',
            free_schedule: data.user.free_schedule || ''
          })
          setCurrentProfilePicture(data.user.profile_picture || null)
          setAvatarVersion(data.user.updated_at || data.user.approved_date || data.user.registration_date || Date.now().toString())
        } else {
          setError('Failed to load profile data')
        }
      } catch (error) {
        setError('Failed to load profile data')
        console.error('Error fetching user data:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    fetchUserData()
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
    setSuccess('')
  }

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.')
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Please select an image smaller than 5MB.')
        return
      }

      setProfilePicture(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfilePicturePreview(e.target.result)
      }
      reader.readAsDataURL(file)
      
      setError('')
    }
  }

  const handleUploadProfilePicture = async () => {
    if (!profilePicture) return

    setUploadingPicture(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('profilePicture', profilePicture)

      const response = await userAPI.uploadProfilePicture(formData)
      const data = await response.json()

      if (data.success) {
        setCurrentProfilePicture(data.profilePictureUrl)
        setProfilePicture(null)
        setProfilePicturePreview(null)
        setSuccess('Profile picture updated successfully!')
        setAvatarVersion(Date.now().toString())
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}')
        userData.profile_picture = data.profilePictureUrl
        localStorage.setItem('userData', JSON.stringify(userData))
        
        // Trigger profile update event
        window.dispatchEvent(new CustomEvent('profileUpdated'))
      } else {
        setError(data.message || 'Failed to upload profile picture')
      }
    } catch (error) {
      console.error('Profile picture upload error:', error)
      setError('Failed to upload profile picture. Please try again.')
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleScheduleUpdate = (newSchedule) => {
    setFormData(prev => ({
      ...prev,
      free_schedule: newSchedule
    }))
  }

  const handleOpenSchedule = () => {
    setShowScheduleModal(true)
  }

  const handleCloseSchedule = () => {
    setShowScheduleModal(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await userAPI.updateProfile(formData)
      const data = await response.json()

      if (data.success) {
        setSuccess('Profile updated successfully!')
        // Update localStorage with new user data
        localStorage.setItem('userData', JSON.stringify(data.user))
        
        // Trigger profile update event
        window.dispatchEvent(new CustomEvent('profileUpdated'))
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } else {
        setError(data.message || 'Failed to update profile')
      }
    } catch (error) {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Edit Profile</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Update Your Profile
            </h1>
            <p className="text-gray-600">
              Keep your information current to help classmates connect with you
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-700">{success}</span>
              </div>
            )}

            {/* Profile Picture */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
              
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                {/* Current/Preview Picture */}
                {profilePicturePreview ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden">
                    <img
                      src={profilePicturePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <Avatar
                    src={currentProfilePicture ? `http://localhost:5001${currentProfilePicture}` : ''}
                    name={formData.name}
                    size={96}
                    className=""
                    version={avatarVersion}
                  />
                )}

                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <div>
                    <input
                      type="file"
                      id="profilePicture"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="profilePicture"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Choose Image
                    </label>
                  </div>
                  
                  {profilePicture && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">{profilePicture.name}</span>
                      <button
                        type="button"
                        onClick={handleUploadProfilePicture}
                        disabled={uploadingPicture}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          uploadingPicture
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-primary-600 hover:bg-primary-700 text-white'
                        }`}
                      >
                        {uploadingPicture ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    JPEG, PNG, GIF or WebP. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows="3"
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Tell others about yourself..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  A brief description to help classmates get to know you better.
                </p>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Academic Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="batch" className="block text-sm font-medium text-gray-700 mb-2">
                    Batch
                  </label>
                  <input
                    id="batch"
                    name="batch"
                    type="text"
                    value={formData.batch}
                    onChange={handleChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., 2024, Fall 2023"
                  />
                </div>
              </div>
            </div>

            {/* Campus Free Schedule */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Campus Free Schedule</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select your available time slots during campus hours (Saturday to Thursday)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSchedule}
                  className="inline-flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 12l-4-8h8l-4 8z" />
                  </svg>
                  <span>Manage Schedule</span>
                </button>
              </div>
              
              {formData.free_schedule && formData.free_schedule !== 'No schedule selected' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="font-medium text-green-900">Current Schedule ({formData.free_schedule.split(', ').length} slots)</h4>
                  </div>
                  <div className="grid gap-2">
                    {formData.free_schedule.split(', ').slice(0, 3).map((slot, index) => {
                      const [day, time] = slot.split(' ', 2)
                      const remainingTime = slot.substring(day.length + 1)
                      
                      return (
                        <div key={index} className="flex items-center space-x-3 text-sm">
                          <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center font-bold text-xs">
                            {day.substring(0, 3).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{day}</span>
                            <span className="text-gray-600 ml-2">{remainingTime}</span>
                          </div>
                        </div>
                      )
                    })}
                    {formData.free_schedule.split(', ').length > 3 && (
                      <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-medium">+{formData.free_schedule.split(', ').length - 3}</span>
                        </div>
                        <span>more time slots...</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">No Schedule Set</h4>
                      <p className="text-blue-800 text-sm mb-3">
                        Add your free time slots to help classmates know when you're available for study sessions and hangouts.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenSchedule}
                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Set Schedule</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                  loading 
                    ? 'bg-primary-400 cursor-not-allowed' 
                    : 'bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-200'
                } transition-all duration-200`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update Profile'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Campus Schedule Modal */}
      <CampusSchedule
        isOpen={showScheduleModal}
        onClose={handleCloseSchedule}
        currentSchedule={formData.free_schedule}
        onScheduleUpdate={handleScheduleUpdate}
      />
    </div>
  )
}

export default ProfileEdit
