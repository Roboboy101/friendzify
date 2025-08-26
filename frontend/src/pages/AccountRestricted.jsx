import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AccountRestricted = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { reason, message, details } = location.state || {};

  const getIcon = () => {
    switch (reason) {
      case 'permanently_blocked':
        return (
          <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        );
      case 'temporarily_restricted':
        return (
          <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'deactivated':
        return (
          <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        );
      default:
        return (
          <svg className="w-16 h-16 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const getTitle = () => {
    switch (reason) {
      case 'permanently_blocked':
        return 'Account Permanently Blocked';
      case 'temporarily_restricted':
        return 'Account Temporarily Restricted';
      case 'deactivated':
        return 'Account Suspended';
      case 'pending_approval':
        return 'Account Pending Approval';
      default:
        return 'Access Restricted';
    }
  };

  const getDescription = () => {
    switch (reason) {
      case 'permanently_blocked':
        return 'Your account has been permanently blocked due to policy violations. This action cannot be reversed.';
      case 'temporarily_restricted':
        return `Your account access has been temporarily restricted. You will be able to log in again after the restriction period expires.`;
      case 'deactivated':
        return 'Your account has been suspended by an administrator. This may be temporary or permanent depending on the circumstances.';
      case 'pending_approval':
        return 'Your account is still pending admin approval. Please wait for an administrator to review your registration.';
      default:
        return 'Your account access has been restricted. Please contact support for more information.';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              {getIcon()}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {getTitle()}
          </h2>
          <p className="text-gray-600 mb-6">
            {message || getDescription()}
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {details && (
            <div className="space-y-4">
              {details.reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {details.reason}
                  </p>
                </div>
              )}
              
              {details.endDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restriction Ends
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(details.endDate)}
                  </p>
                </div>
              )}
              
              {details.daysLeft !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Remaining
                  </label>
                  <p className="text-sm text-gray-900">
                    {details.daysLeft === 1 ? '1 day' : `${details.daysLeft} days`}
                  </p>
                </div>
              )}
              
              {details.date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restricted On
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(details.date)}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {reason === 'pending_approval' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">What's next?</h4>
                  <p className="text-sm text-blue-800">
                    An administrator will review your registration and approve your account. 
                    You'll receive an email notification once your account is approved.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Support Contact */}
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
          <p className="text-sm text-gray-600 mb-3">
            If you believe this restriction was applied in error or have questions about your account status, please contact our support team.
          </p>
          <div className="text-sm text-gray-700">
            <p><strong>Email:</strong> support@friendzify.com</p>
            <p><strong>Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200 transition-all duration-200"
          >
            Return to Home
          </button>
          
          {reason === 'temporarily_restricted' && (
            <button
              onClick={() => navigate('/signin')}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-200"
            >
              Try Signing In Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountRestricted;
