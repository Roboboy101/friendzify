import React, { useState } from 'react';
import { adminAPI } from '../utils/api';

const AccountRestrictionModal = ({ user, onClose, onSuccess }) => {
  const [restrictionType, setRestrictionType] = useState('temporary');
  const [reason, setReason] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const restrictionReasons = [
    'Violation of community guidelines',
    'Inappropriate behavior',
    'Harassment or bullying',
    'Spam or unwanted content',
    'Multiple user reports',
    'Fake profile or impersonation',
    'Academic dishonesty',
    'Abusive language',
    'Other policy violations'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for the restriction');
      return;
    }

    if (restrictionType === 'temporary' && (!durationDays || durationDays < 1)) {
      setError('Please provide a valid duration for temporary restrictions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await adminAPI.restrictUser(
        user.id, 
        restrictionType, 
        reason.trim(), 
        restrictionType === 'temporary' ? parseInt(durationDays) : null
      );
      
      const data = await response.json();
      
      if (data.success) {
        // Call onSuccess first, then close modal
        if (onSuccess) {
          onSuccess(data.user);
        }
        // Close the modal
        onClose();
      } else {
        setError(data.message || 'Failed to restrict user account');
      }
    } catch (error) {
      console.error('Restrict user error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Restrict Account</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{user.name}</h4>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500">{user.department} • {user.batch}</p>
              </div>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-900 mb-1">Account Restriction</h4>
                <p className="text-sm text-red-800">
                  This action will prevent the user from logging in. Use this feature responsibly and ensure proper justification.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* Restriction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Restriction Type *
              </label>
              <div className="space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="restrictionType"
                    value="temporary"
                    checked={restrictionType === 'temporary'}
                    onChange={(e) => setRestrictionType(e.target.value)}
                    className="mt-1 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Temporary Restriction</span>
                    <p className="text-xs text-gray-500">Block account for a specific number of days</p>
                  </div>
                </label>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="restrictionType"
                    value="permanent"
                    checked={restrictionType === 'permanent'}
                    onChange={(e) => setRestrictionType(e.target.value)}
                    className="mt-1 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Permanent Block</span>
                    <p className="text-xs text-gray-500">Permanently block the account (requires manual unblocking)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Duration (for temporary restrictions) */}
            {restrictionType === 'temporary' && (
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (days) *
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[1, 3, 7, 14, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDurationDays(days)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        durationDays === days
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
                <input
                  id="duration"
                  type="number"
                  min="1"
                  max="365"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter custom duration"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a preset or enter a custom duration (1-365 days)
                </p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Restriction *
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-3"
              >
                <option value="">Select a reason...</option>
                {restrictionReasons.map(reasonOption => (
                  <option key={reasonOption} value={reasonOption}>{reasonOption}</option>
                ))}
              </select>
              <textarea
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Or provide a custom reason..."
                maxLength="500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {reason.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !reason.trim()}
                className={`flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white transition-colors ${
                  loading || !reason.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : restrictionType === 'permanent'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  restrictionType === 'permanent' ? 'Block Permanently' : `Restrict for ${durationDays} days`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountRestrictionModal;
