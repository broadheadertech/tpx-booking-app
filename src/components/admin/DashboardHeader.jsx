import React from 'react'
import { LogOut, Crown, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const DashboardHeader = ({ onLogout }) => {
  const { user } = useAuth()

  return (
    <header className="relative bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] backdrop-blur-xl border-b border-[#333333]/50 shadow-2xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.05),transparent_50%)]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          {/* Left Side - Logo and Title */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <img
                src="/img/tipuno_x_logo_white.avif"
                alt="TPX Barbershop Logo"
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <Crown className="w-6 h-6 text-[#FF8C42]" />
                  <span>Admin Dashboard</span>
                </h1>
                <p className="text-sm text-gray-400">System Administration Panel</p>
              </div>
            </div>
          </div>

          {/* Center - Status Badge */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-gradient-to-r from-[#FF8C42]/20 to-[#FF7A2B]/20 border border-[#FF8C42]/30 rounded-full px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-white">System Online</span>
              </div>
            </div>
          </div>

          {/* Right Side - User Info and Actions */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3 bg-gradient-to-r from-[#2A2A2A] to-[#333333] rounded-xl p-3 border border-[#444444]/50">
              <div className="w-10 h-10 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {user?.username || 'Admin'}
                </p>
                <p className="text-xs text-[#FF8C42] font-medium">Super Administrator</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF8C42]/50 to-transparent"></div>
    </header>
  )
}

export default DashboardHeader