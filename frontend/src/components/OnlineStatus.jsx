import React from 'react';

const OnlineStatus = ({ 
  isOnline, 
  lastSeen, 
  showText = true, 
  size = 'sm',
  className = '' 
}) => {
  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return 'Never';
    
    const now = new Date();
    const lastSeenTime = new Date(lastSeenDate);
    const diffMs = now - lastSeenTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return lastSeenTime.toLocaleDateString();
  };

  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3', 
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm', 
    lg: 'text-base'
  };

  if (isOnline) {
    return (
      <div className={`flex items-center space-x-2 ${className} transition-all duration-300`}>
        <div className="relative">
          <div className={`${sizeClasses[size]} bg-green-500 rounded-full transition-all duration-300`}></div>
          <div className={`absolute inset-0 ${sizeClasses[size]} bg-green-500 rounded-full animate-ping opacity-75`}></div>
        </div>
        {showText && (
          <span className={`text-green-600 font-medium ${textSizeClasses[size]} transition-all duration-300`}>
            Online
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className} transition-all duration-300`}>
      <div className={`${sizeClasses[size]} bg-gray-400 rounded-full transition-all duration-300`}></div>
      {showText && (
        <span className={`text-gray-500 ${textSizeClasses[size]} transition-all duration-300`}>
          {formatLastSeen(lastSeen)}
        </span>
      )}
    </div>
  );
};

export default OnlineStatus;