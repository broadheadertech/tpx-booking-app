import React, { useState } from 'react'
import { User, Settings, LogOut, Monitor, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import SettingsModal from './SettingsModal'
import LogoutConfirmModal from './LogoutConfirmModal'

const DashboardHeader = ({ onLogout }) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  return (
    <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 lg:py-8 gap-4 lg:gap-0">
          <div className="flex items-center space-x-3 sm:space-x-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl ring-2 sm:ring-4 ring-[#FF8C42]/20 p-2">
              <img 
                src="/img/pnglog.png" 
                alt="TPX Barbershop Logo" 
                className="w-full h-full object-contain filter brightness-0 saturate-100 invert-[0.5] sepia-[1] saturate-[10000%] hue-rotate-[25deg] brightness-[1.2] contrast-[1]"
                style={{
                  filter: 'brightness(0) saturate(100%) invert(64%) sepia(85%) saturate(1328%) hue-rotate(358deg) brightness(102%) contrast(102%)'
                }}
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">TPX Barbershop</h1>
              <p className="text-xs sm:text-sm font-medium text-[#FF8C42] mt-1">Staff Dashboard</p>
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