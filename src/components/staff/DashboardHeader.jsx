import React, { useState } from 'react'
import { Scissors, User, Settings, LogOut, Monitor } from 'lucide-react'
import { Link } from 'react-router-dom'
import SettingsModal from './SettingsModal'
import LogoutConfirmModal from './LogoutConfirmModal'

const DashboardHeader = ({ onLogout }) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  return (
    <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-8">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-[#FF8C42]/20">
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">TPX Barbershop</h1>
              <p className="text-sm font-medium text-[#FF8C42] mt-1">Staff Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-base font-semibold text-white">Welcome back, Staff</p>
              <p className="text-xs text-gray-300 font-medium">{new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Link
                to="/kiosk"
                className="bg-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center space-x-2 px-4 py-3 hover:bg-blue-500/30 transition-all duration-300 border border-blue-500/30 group"
                title="Kiosk Mode"
              >
                <Monitor className="w-5 h-5 text-blue-300 group-hover:text-blue-200 transition-colors duration-300" />
                <span className="text-blue-300 group-hover:text-blue-200 font-semibold text-sm transition-colors duration-300">Kiosk Mode</span>
              </Link>
              
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all duration-300 border border-white/20 group"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>
              
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-12 h-12 bg-red-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-red-500/30 transition-all duration-300 border border-red-500/30 group"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-red-300 group-hover:text-red-200 transition-colors duration-300" />
              </button>
              
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all duration-300 cursor-pointer border border-white/20">
                <User className="w-5 h-5 text-white" />
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