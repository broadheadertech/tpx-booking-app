import React, { useState } from 'react'
import { User, Settings, LogOut, Monitor, CreditCard, Building } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import SettingsModal from './SettingsModal'
import LogoutConfirmModal from './LogoutConfirmModal'
import { NotificationSystem } from '../common/NotificationSystem'

const DashboardHeader = ({ onLogout, user }) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  
  // Get branch information for the current user
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const currentBranch = branches.find(b => b._id === user?.branch_id)
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-2.5 lg:py-3 gap-3 lg:gap-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#0A0A0A] rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg ring-1 ring-[#FF8C42]/20 p-1.5 border border-[#1A1A1A]/50">
              <img
                src="/img/tipuno_x_logo_white.avif"
                alt="TipunoX Angeles Barbershop Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight">TipunoX Angeles Barbershop</h1>
                <div className="bg-[#FF8C42]/15 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-[#FF8C42]/25">
                  <span className="text-[10px] font-semibold text-[#FF8C42]">v2.0.0</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <p className="text-[10px] sm:text-xs font-medium text-[#FF8C42]">Staff Dashboard</p>
                {currentBranch && (
                  <>
                    <span className="text-gray-600 text-xs">•</span>
                    <div className="flex items-center space-x-1">
                      <Building className="w-2.5 h-2.5 text-[#FF8C42]" />
                      <span className="text-[10px] font-medium text-gray-400">{currentBranch.name}</span>
                      <span className="text-[10px] text-gray-500">({currentBranch.branch_code})</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="text-left sm:text-right order-2 sm:order-1">
              <p className="text-xs sm:text-sm font-semibold text-white">Welcome back, Staff</p>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block">{new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p className="text-[10px] text-gray-400 font-medium sm:hidden">{new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-start sm:justify-end space-x-1.5 sm:space-x-2 order-1 sm:order-2 overflow-x-auto pb-1 sm:pb-0">
              <Link
                to="/staff/pos"
                className="bg-green-500/15 backdrop-blur-sm rounded-lg flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-green-500/25 transition-all duration-200 border border-green-500/25 group whitespace-nowrap"
                title="POS Mode"
              >
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 group-hover:text-green-300 transition-colors duration-200" />
                <span className="text-green-400 group-hover:text-green-300 font-semibold text-[10px] sm:text-xs transition-colors duration-200">POS</span>
              </Link>

              <Link
                to="/kiosk"
                className="bg-blue-500/15 backdrop-blur-sm rounded-lg flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-blue-500/25 transition-all duration-200 border border-blue-500/25 group whitespace-nowrap"
                title="Kiosk Mode"
              >
                <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 group-hover:text-blue-300 transition-colors duration-200" />
                <span className="text-blue-400 group-hover:text-blue-300 font-semibold text-[10px] sm:text-xs transition-colors duration-200">Kiosk</span>
              </Link>

              {/* Notification System */}
              <NotificationSystem userId={user._id} />

              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/10 transition-all duration-200 border border-white/10 group"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-white group-hover:rotate-90 transition-all duration-200" />
              </button>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-red-500/15 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-500/25 transition-all duration-200 border border-red-500/25 group"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 group-hover:text-red-300 transition-colors duration-200" />
              </button>

              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/10 transition-all duration-200 cursor-pointer border border-white/10">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={(settings) => {
          console.log('Settings saved:', settings)
          // In a real app, this would save to database/API
        }}
      />
      
      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={onLogout}
      />
    </div>
  )
}

export default DashboardHeader