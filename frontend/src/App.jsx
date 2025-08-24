import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <LandingPage />
      </div>
    </Router>
  )
}

export default App
