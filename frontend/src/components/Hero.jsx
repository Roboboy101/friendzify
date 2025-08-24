import React from 'react'

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary-50 to-white py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left animate-slide-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Connect with
              <span className="text-primary-600 block">Classmates</span>
              Like Never Before
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed">
              Join Friendzify and discover a new way to connect with your classmates, 
              share classroom details, and build meaningful friendships that last beyond graduation.
            </p>
            
            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a href="/signup" className="btn-primary text-lg px-8 py-4 text-center">
                Join Friendzify
              </a>
              <a href="#features" className="btn-secondary text-lg px-8 py-4 text-center">
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8 text-center lg:text-left">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-primary-600">1000+</div>
                <div className="text-sm text-gray-600">Active Students</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-primary-600">50+</div>
                <div className="text-sm text-gray-600">Departments</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-primary-600">24/7</div>
                <div className="text-sm text-gray-600">SOS Support</div>
              </div>
            </div>
          </div>

          {/* Right Content - Illustration */}
          <div className="relative animate-fade-in">
            <div className="relative mx-auto w-full max-w-lg">
              {/* Main Card */}
              <div className="card p-8 transform rotate-3 animate-float">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Connect & Chat</h3>
                    <p className="text-sm text-gray-600">Real-time messaging</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 bg-primary-200 rounded-full"></div>
                    <div className="flex-1 bg-gray-100 rounded-lg p-3">
                      <p className="text-sm">Hey! What's the assignment for CS101?</p>
                    </div>
                  </div>
                  <div className="flex space-x-3 justify-end">
                    <div className="flex-1 bg-primary-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Check the classroom portal! Due Friday 📚</p>
                    </div>
                    <div className="w-8 h-8 bg-green-200 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Secondary Card */}
              <div className="card p-6 transform -rotate-2 absolute -bottom-4 -right-4 bg-primary-50 w-64">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">SOS Alert</h4>
                    <p className="text-xs text-gray-600">Emergency assistance</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700">Send location to close friends instantly</p>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-8 -left-8 w-16 h-16 bg-primary-200 rounded-full opacity-20 animate-ping"></div>
              <div className="absolute -bottom-8 -left-12 w-12 h-12 bg-blue-200 rounded-full opacity-30 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary-100 rounded-full opacity-10 transform rotate-45"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-blue-100 rounded-full opacity-10"></div>
      </div>
    </section>
  )
}

export default Hero
