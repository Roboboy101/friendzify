import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userReportsAPI } from '../utils/api';

const ReportToAdmin = () => {
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    urgency: 'low'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Report type options with descriptions
  const reportTypes = [
    { value: 'bug_report', label: 'Bug Report', description: 'Report technical issues or bugs' },
    { value: 'feedback', label: 'Feedback', description: 'Share your thoughts about the platform' },
    { value: 'suggestion', label: 'Suggestion', description: 'Suggest new features or improvements' },
    { value: 'other', label: 'Other', description: 'Any other concerns or questions' }
  ];

  // Common title options for each type
  const commonTitles = {
    bug_report: [
      'Login/Authentication Issues',
      'Profile Picture Upload Problem',
      'Chat Messages Not Sending',
      'Friend Request Not Working',
      'SOS Alert Not Functioning',
      'Page Loading Issues',
      'Mobile App Crashes',
      'Other Bug'
    ],
    feedback: [
      'User Interface Feedback',
      'User Experience Feedback',
      'Feature Request Feedback',
      'Overall Platform Feedback',
      'Other Feedback'
    ],
    suggestion: [
      'New Feature Suggestion',
      'UI/UX Improvement',
      'Performance Enhancement',
      'Security Improvement',
      'Accessibility Enhancement',
      'Other Suggestion'
    ],
    other: [
      'Account Issue',
      'Privacy Concern',
      'Content Moderation',
      'General Question',
      'Other'
    ]
  };

  const urgencyLevels = [
    { value: 'low', label: 'Low', description: 'Minor issue, can wait' },
    { value: 'medium', label: 'Medium', description: 'Moderate issue, affects usage' },
    { value: 'high', label: 'High', description: 'Critical issue, blocks functionality' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Reset title when type changes
      ...(field === 'type' && { title: '' })
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.type) {
        setError('Please select a report type.');
        setLoading(false);
        return;
      }

      if (!formData.title.trim()) {
        setError('Please provide a title for your report.');
        setLoading(false);
        return;
      }

      if (!formData.description.trim()) {
        setError('Please provide a description for your report.');
        setLoading(false);
        return;
      }

      if (formData.description.trim().length < 10) {
        setError('Description must be at least 10 characters long.');
        setLoading(false);
        return;
      }

      const response = await userReportsAPI.submitReport({
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        urgency: formData.type === 'bug_report' ? formData.urgency : 'low'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(true);
          // Reset form
          setFormData({
            type: '',
            title: '',
            description: '',
            urgency: 'low'
          });
        } else {
          setError(data.message || 'Failed to submit report.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to submit report. Please try again.');
      }
    } catch (err) {
      console.error('Submit report error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-6">
              ✅ Your report/feedback has been submitted successfully.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Our team will review your submission and get back to you if needed.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setSuccess(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Submit Another
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report to Admin</h1>
          <p className="text-gray-600">
            Help us improve the platform by reporting bugs, sharing feedback, or suggesting new features.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Report Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`relative border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleInputChange('type', type.value)}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="type"
                        value={type.value}
                        checked={formData.type === type.value}
                        onChange={() => handleInputChange('type', type.value)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{type.label}</h3>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              {formData.type && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-2">Common issues:</label>
                  <div className="flex flex-wrap gap-2">
                    {commonTitles[formData.type]?.map((title) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => handleInputChange('title', title)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          formData.title === title
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Short description of the issue/feedback"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
            </div>

            {/* Urgency (only for bug reports) */}
            {formData.type === 'bug_report' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Urgency Level *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {urgencyLevels.map((level) => (
                    <div
                      key={level.value}
                      className={`relative border rounded-lg p-3 cursor-pointer transition-colors ${
                        formData.urgency === level.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange('urgency', level.value)}
                    >
                      <div className="flex items-start">
                        <input
                          type="radio"
                          name="urgency"
                          value={level.value}
                          checked={formData.urgency === level.value}
                          onChange={() => handleInputChange('urgency', level.value)}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{level.label}</h4>
                          <p className="text-xs text-gray-500">{level.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed explanation of the issue, feedback, or suggestion. Please include steps to reproduce if reporting a bug."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/1000 characters (minimum 10)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Your reports help us improve the platform for everyone. Thank you for your feedback!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportToAdmin;
