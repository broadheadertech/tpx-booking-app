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
    <div className="relative bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] shadow-xl overflow-hidden">
      {/* Background overlay */}
      <div className="absolute inset-0">
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(/img/pnglog.png)`,
            filter: 'brightness(0.3)'
          }}
        ></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 lg:py-8 gap-4 lg:gap-0">
          <div className="flex items-center space-x-3 sm:space-x-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl ring-2 sm:ring-4 ring-[#FF8C42]/20 p-2">
              <img 
                src="/img/tipuno_x_logo_white.avif" 
                alt="TipunoX Angeles Barbershop Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">TipunoX Angeles Barbershop</h1>
                <div className="bg-[#FF8C42]/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-[#FF8C42]/30">
                  <span className="text-xs font-semibold text-[#FF8C42]">v2.0.0</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs sm:text-sm font-medium text-[#FF8C42]">Staff Dashboard</p>
                {currentBranch && (
                  <>
                    <span className="text-gray-500">•</span>
                    <div className="flex items-center space-x-1">
                      <Building className="w-3 h-3 text-[#FF8C42]" />
                      <span className="text-xs font-medium text-white">{currentBranch.name}</span>
                      <span className="text-xs text-gray-400">({currentBranch.branch_code})</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="text-left sm:text-right order-2 sm:order-1">
              <p className="text-sm sm:text-base font-semibold text-white">Welcome back, Staff</p>
              <p className="text-xs text-gray-300 font-medium hidden sm:block">{new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p className="text-xs text-gray-300 font-medium sm:hidden">{new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-start sm:justify-end space-x-2 sm:space-x-3 order-1 sm:order-2 overflow-x-auto pb-2 sm:pb-0">
              <Link
                to="/staff/pos"
                className="bg-green-500/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 sm:py-3 hover:bg-green-500/30 transition-all duration-300 border border-green-500/30 group whitespace-nowrap"
                title="POS Mode"
              >
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 group-hover:text-green-200 transition-colors duration-300" />
                <span className="text-green-300 group-hover:text-green-200 font-semibold text-xs sm:text-sm transition-colors duration-300">POS</span>
              </Link>
              
              <Link
                to="/kiosk"
                className="bg-blue-500/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 sm:py-3 hover:bg-blue-500/30 transition-all duration-300 border border-blue-500/30 group whitespace-nowrap"
                title="Kiosk Mode"
              >
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300 group-hover:text-blue-200 transition-colors duration-300" />
                <span className="text-blue-300 group-hover:text-blue-200 font-semibold text-xs sm:text-sm transition-colors duration-300">Kiosk</span>
              </Link>
              
              {/* Notification System */}
              <NotificationSystem userId={user._id} />
              
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all duration-300 border border-white/20 group"
                title="Settings"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>
              
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-red-500/30 transition-all duration-300 border border-red-500/30 group"
                title="Logout"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-red-300 group-hover:text-red-200 transition-colors duration-300" />
              </button>
              
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all duration-300 cursor-pointer border border-white/20">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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