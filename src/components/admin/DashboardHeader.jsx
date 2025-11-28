import React, { useState } from 'react'
import { LogOut, Crown, Shield, Building } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useBranding } from '../../context/BrandingContext'

const DashboardHeader = ({ onLogout }) => {
  const { user } = useAuth()
  const { branding } = useBranding()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  
  // Get system stats for admin
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const users = useQuery(api.services.auth.getAllUsers) || []
  const activeBranches = branches.filter(b => b.is_active).length

  return (
    <div className="relative bg-[#050505] border-b border-[#1A1A1A]/30 overflow-hidden">
      {/* Background overlay - more subtle */}
      <div className="absolute inset-0">
        <div
          className="h-full bg-cover bg-center bg-no-repeat opacity-[0.02]"
          style={{
            backgroundImage: `url(/img/pnglog.png)`,
            filter: 'brightness(0.2)'
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 lg:py-3 gap-2">
          {/* Left section - Logo and Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <img
              src={branding?.logo_light_url}
              alt={branding?.display_name || 'Logo'}
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-xs sm:text-lg font-bold text-[var(--color-primary)] tracking-tight truncate">
                  <span className="hidden sm:inline">{branding?.display_name || ''}</span>
                  <span className="sm:hidden">{branding?.display_name || ''}</span>
                </h1>
                <div className="bg-[var(--color-primary)]/15 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-[var(--color-primary)]/25 flex-shrink-0">
                  <span className="text-[10px] font-semibold text-[var(--color-primary)]">v8.1.2</span>
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-1.5 mt-0.5">
                <p className="text-[10px] sm:text-xs font-medium text-[var(--color-primary)]">Admin Dashboard</p>
                <span className="text-gray-600 text-xs hidden sm:inline">•</span>
                <div className="hidden sm:flex items-center space-x-1">
                  <Crown className="w-2.5 h-2.5 text-[var(--color-primary)]" />
                  <span className="text-[10px] font-medium text-gray-400">Super Administrator</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center - System Stats */}
          <div className="hidden lg:flex items-center space-x-3">
            <div className="bg-[var(--color-primary)]/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-[var(--color-primary)]/20">
              <div className="flex items-center space-x-1.5">
                <Building className="w-3 h-3 text-[var(--color-primary)]" />
                <span className="text-xs font-semibold text-white">{activeBranches}</span>
                <span className="text-xs text-gray-400">Branches</span>
              </div>
            </div>
            <div className="bg-green-500/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-green-500/20">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-white">Online</span>
              </div>
            </div>
          </div>

          {/* Right section - Welcome message and buttons */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Welcome message - hidden on mobile */}
            <div className="hidden lg:block text-right">
              <p className="text-sm font-semibold text-white">Welcome back, {user?.username || 'Admin'}</p>
              <p className="text-[10px] text-gray-400 font-medium">{new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-7 h-7 sm:w-9 sm:h-9 bg-red-500/15 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-500/25 transition-all duration-200 border border-red-500/25 group"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 group-hover:text-red-300 transition-colors duration-200" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowLogoutModal(false)}
            />
            <div className="relative w-full max-w-md transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] shadow-2xl transition-all z-[10001] border border-[#444444]/50">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Confirm Logout</h3>
                </div>
                
                <p className="text-gray-300 mb-6">
                  Are you sure you want to logout? You will need to sign in again to access the admin dashboard.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutModal(false)
                      onLogout()
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardHeader