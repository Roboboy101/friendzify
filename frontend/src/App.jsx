import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AdminLogin from './pages/auth/AdminLogin'
import UserSignup from './pages/auth/UserSignup'
import UserSignin from './pages/auth/UserSignin'
import PendingApproval from './pages/PendingApproval'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<UserSignup />} />
          <Route path="/signin" element={<UserSignin />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          
          {/* Protected Routes - Will be added later */}
          {/* <Route path="/dashboard" element={<UserDashboard />} /> */}
          {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}
          {/* <Route path="/profile" element={<UserProfile />} /> */}
        </Routes>
      </div>
    </Router>
  )
}

export default App
