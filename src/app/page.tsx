'use client';

import { useState, useEffect } from 'react';

export default function WelcomePage() {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('en-US'));    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('en-US'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🚀 Welcome to OxichStudio
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Professional Standalone Web Server Development Platform
          </p>
          <div className="text-sm text-gray-500 mb-8">
            {currentTime}
          </div>
        </header>

        {/* Welcome Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* What is OxichStudio */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
              <span className="text-blue-500 mr-3">🎯</span>
              What is OxichStudio?
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>OxichStudio</strong> enables you to create powerful standalone web server applications with desktop control interfaces.
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✅</span>
                  <span>Develop using standard Next.js workflow</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✅</span>
                  <span>Desktop control interface with Electron</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✅</span>
                  <span>Deploy as single executable files</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✅</span>
                  <span>Share applications on local networks</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Quick Start */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
              <span className="text-green-500 mr-3">⚡</span>
              Quick Start
            </h2>
            <div className="space-y-4">
              <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-1 flex-shrink-0">1</span>
                <div>
                  <div className="font-medium text-gray-800">Install & Setup</div>
                  <div className="text-sm text-gray-600">Follow the Quick Start guide to get running in 5 minutes</div>
                </div>
              </div>

              <div className="flex items-start p-4 bg-green-50 rounded-lg">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-1 flex-shrink-0">2</span>
                <div>
                  <div className="font-medium text-gray-800">Learn the Interface</div>
                  <div className="text-sm text-gray-600">Explore the control panel and web interface</div>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-purple-50 rounded-lg">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-1 flex-shrink-0">3</span>
                  <div>
                  <div className="font-medium text-gray-800">Start Building</div>
                  <div className="text-sm text-gray-600">Develop your application using Next.js</div>
                </div>
              </div>
              </div>
            </div>
          </div>

        {/* Documentation Links */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
            <span className="text-orange-500 mr-3">📚</span>
            Documentation & Resources
            </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <a href="https://github.com/oxich/oxichstudio/blob/main/docs/guides/QUICK_START.md" target="_blank" rel="noopener noreferrer" className="group p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
              <div className="text-blue-500 text-2xl mb-2">⚡</div>
              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">Quick Start Guide</h3>
              <p className="text-sm text-gray-600 mt-1">Get OxichStudio running in 5 minutes</p>
            </a>

            <a href="https://github.com/oxich/oxichstudio/blob/main/docs/guides/USER_GUIDE.md" target="_blank" rel="noopener noreferrer" className="group p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors">
              <div className="text-green-500 text-2xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-800 group-hover:text-green-600">User Guide</h3>
              <p className="text-sm text-gray-600 mt-1">Complete interface and features guide</p>
            </a>

            <a href="https://github.com/oxich/oxichstudio/blob/main/docs/guides/TROUBLESHOOTING.md" target="_blank" rel="noopener noreferrer" className="group p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 transition-colors">
              <div className="text-red-500 text-2xl mb-2">🚨</div>
              <h3 className="font-semibold text-gray-800 group-hover:text-red-600">Troubleshooting</h3>
              <p className="text-sm text-gray-600 mt-1">Solutions to common issues</p>
            </a>
                </div>
              </div>

        {/* GitHub Repository Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
            <span className="text-purple-500 mr-3">🐙</span>
            Open Source & Community
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <a href="https://github.com/oxich/oxichstudio" target="_blank" rel="noopener noreferrer" className="group p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors">
              <div className="text-purple-500 text-2xl mb-2">📦</div>
              <h3 className="font-semibold text-gray-800 group-hover:text-purple-600">Source Code</h3>
              <p className="text-sm text-gray-600 mt-1">View the complete OxichStudio source code</p>
            </a>

            <a href="https://github.com/oxich/oxichstudio/issues" target="_blank" rel="noopener noreferrer" className="group p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 transition-colors">
              <div className="text-orange-500 text-2xl mb-2">🐛</div>
              <h3 className="font-semibold text-gray-800 group-hover:text-orange-600">Report Issues</h3>
              <p className="text-sm text-gray-600 mt-1">Found a bug? Report it on GitHub</p>
            </a>

            <a href="https://github.com/oxich/oxichstudio/releases" target="_blank" rel="noopener noreferrer" className="group p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors">
              <div className="text-green-500 text-2xl mb-2">🚀</div>
              <h3 className="font-semibold text-gray-800 group-hover:text-green-600">Latest Releases</h3>
              <p className="text-sm text-gray-600 mt-1">Download the latest version</p>
            </a>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Start Building?</h2>
            <p className="text-lg mb-6 opacity-90">
              You&apos;re all set! Start developing your standalone web server application.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://github.com/oxich/oxichstudio/blob/main/docs/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-blue-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-colors inline-block"
              >
                📖 Read Documentation
              </a>
              <a 
                href="https://github.com/oxich/oxichstudio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
              >
                🐙 View on GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500">
          <p className="text-sm mb-2">
            OxichStudio v2.0.0 - Professional Standalone Web Server Development Platform
          </p>
          <p className="text-xs">
            Open Source • MIT License • 
            <a 
              href="https://github.com/oxich/oxichstudio" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 ml-1"
            >
              GitHub Repository
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
