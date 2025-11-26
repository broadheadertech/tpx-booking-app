import React from 'react'
import { Heart, Code } from 'lucide-react'
import { APP_VERSION } from '../../config/version'
import { useBranding } from '../../context/BrandingContext'


const DashboardFooter = () => {
  const currentYear = new Date().getFullYear()
    const { branding } = useBranding()
  
  return (
    <footer className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] border-t border-[#333333]/50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Left section - Copyright */}
          <div className="text-center lg:text-left">
            <p className="text-gray-400 text-sm">
              © {currentYear} {branding?.display_name}. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Professional barbershop management solution
            </p>
          </div>

          {/* Center section - Developed by BroadHeader */}
          <div className="flex items-center justify-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 bg-[#2A2A2A] border border-[#444444]/50 rounded-lg hover:border-[var(--color-primary)]/30 transition-colors">
              <Code className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-gray-300 text-sm font-medium">Developed by</span>
              <img 
                src="/img/bg-logo.png" 
                alt="BroadHeader Logo" 
                className="h-6 w-auto"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'inline'
                }}
              />
              <span 
                className="text-white font-bold text-sm hidden"
                style={{ display: 'none' }}
              >
                BroadHeader
              </span>
            </div>
          </div>

          {/* Right section - Version & Links */}
          <div className="text-center lg:text-right">
            <div className="flex items-center justify-center lg:justify-end space-x-4">
              <span className="text-gray-500 text-xs">v{APP_VERSION}</span>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <span className="text-gray-500 text-xs">Multi-Branch System</span>
            </div>

          </div>
        </div>

      </div>
    </footer>
  )
}

export default DashboardFooter