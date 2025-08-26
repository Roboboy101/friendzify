import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SocketProvider } from './contexts/SocketContext'
import LandingPage from './pages/LandingPage'
import AdminLogin from './pages/auth/AdminLogin'
import UserSignup from './pages/auth/UserSignup'
import UserSignin from './pages/auth/UserSignin'
import PendingApproval from './pages/PendingApproval'
import AccountRestricted from './pages/AccountRestricted'
import UserDashboard from './pages/UserDashboard'
import ProfileEdit from './pages/ProfileEdit'
import AdminDashboard from './pages/AdminDashboard'
import AdminReports from './pages/AdminReports'
import FriendSearch from './pages/FriendSearch'
import FriendRequests from './pages/FriendRequests'
import FriendsList from './pages/FriendsList'
import ChatList from './pages/ChatList'
import Chat from './pages/Chat'

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<UserSignup />} />
            <Route path="/signin" element={<UserSignin />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/account-restricted" element={<AccountRestricted />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            
            {/* Friends Routes */}
            <Route path="/friends" element={<FriendsList />} />
            <Route path="/friends/search" element={<FriendSearch />} />
            <Route path="/friends/requests" element={<FriendRequests />} />
            
            {/* Chat Routes */}
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:userId" element={<Chat />} />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  )
}

export default App
