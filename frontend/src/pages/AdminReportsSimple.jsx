import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminReportsSimple = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🚀 AdminReportsSimple component mounted');
    
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
      console.log('✅ AdminReportsSimple loaded successfully');
    }, 1000);
    
    return () => console.log('🔥 AdminReportsSimple component unmounted');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports Management (Simple)</h1>
          <p className="text-gray-600">Basic version for debugging</p>
        </div>

        {/* Test Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Component Test</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-green-800 font-medium">✅ Component Rendered Successfully</h3>
              <p className="text-green-600 text-sm">The React component is working correctly.</p>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-blue-800 font-medium">🔍 Debug Information</h3>
              <ul className="text-blue-600 text-sm space-y-1">
                <li>• Component mounted successfully</li>
                <li>• Navigation working: <button onClick={() => navigate('/admin/dashboard')} className="underline">Test navigation</button></li>
                <li>• Admin token: {localStorage.getItem('adminToken') ? '✅ Available' : '❌ Missing'}</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-yellow-800 font-medium">⚠️ Next Steps</h3>
              <p className="text-yellow-600 text-sm">
                If this simple version works, the issue is in the complex AdminReportsManagement component.
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/admin/reports-management')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try Full Version
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsSimple;
