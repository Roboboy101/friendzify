import React from 'react';

const OnlineStatus = ({ 
  isOnline, 
  lastSeen, 
  showText = true, 
  size = 'sm',
  className = '' 
}) => {
  const parseLastSeen = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    // Epoch numeric or string
    if (typeof value === 'number') return new Date(value < 1e12 ? value * 1000 : value);
    if (typeof value === 'string' && /^\d{10,13}$/.test(value)) {
      const n = parseInt(value, 10);
      return new Date(n < 1e12 ? n * 1000 : n);
    }
    // SQLite "YYYY-MM-DD HH:MM:SS" -> store is UTC in DB, parse as UTC
    if (typeof value === 'string' && /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value.replace(' ', 'T') + 'Z');
    }
    // ISO
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatLastSeen = (lastSeenDate) => {
    const lastSeenTime = parseLastSeen(lastSeenDate);
    if (!lastSeenTime) {
      try {
        // Debug output to help trace invalid values
        // eslint-disable-next-line no-console
        console.warn('OnlineStatus debug: Unparseable lastSeen', { lastSeenDate });
      } catch {}
      return 'Unknown';
    }

    const now = new Date();
    const diffMs = now - lastSeenTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins >= 2 && diffMins <= 5) return 'few mins ago';
    if (diffMins < 60) return diffMins === 1 ? '1 min ago' : `${diffMins} mins ago`;
    if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    if (diffDays < 7) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

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
            Active
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