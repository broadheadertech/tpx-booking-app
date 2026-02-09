import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User, Settings, LogOut, Monitor, CreditCard, Building, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useBranding } from '../../context/BrandingContext'
import SettingsModal from './SettingsModal'
import LogoutConfirmModal from './LogoutConfirmModal'
import ProfileModal from './ProfileModal'
import { NotificationBell } from '../common/NotificationSystem'
import { BranchSelector } from '../common/BranchSelector'
import { APP_VERSION } from '../../config/version'

const DashboardHeader = ({ onLogout, user, onOpenNotifications }) => {
  const { sessionToken } = useCurrentUser()
  const { branding } = useBranding()
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Get branch information for the current user
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const currentBranch = branches.find(b => b._id === user?.branch_id)

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [showMobileMenu])

  const handleMobileMenuAction = (action) => {
    setShowMobileMenu(false)
    if (action === 'profile') setShowProfileModal(true)
    if (action === 'settings') setShowSettingsModal(true)
    if (action === 'logout') setShowLogoutModal(true)
  }
  return (
    <div className="relative bg-[#050505] border-b border-[#1A1A1A]/30 overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Background overlay - more subtle */}
      <div className="absolute inset-0">
        <div
          className="h-full bg-cover bg-center bg-no-repeat opacity-[0.02]"
          style={{
            backgroundImage: branding?.logo_dark_url
              ? `url(${branding.logo_dark_url})`
              : '',
            filter: 'brightness(0.2)'
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 sm:py-2.5 md:py-3 gap-1.5 sm:gap-2 md:gap-3">
          {/* Left section - Logo and Title */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 min-w-0 flex-1">
            <img
              src={branding?.logo_light_url }
              alt={branding?.display_name || 'Logo'}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 object-contain flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 flex-wrap">
                <h1 className="text-[11px] sm:text-sm md:text-base lg:text-lg font-bold text-[var(--color-primary)] tracking-tight truncate">
                  <span className="hidden md:inline">{branding?.display_name || ''}</span>
                  <span className="hidden sm:inline md:hidden">{branding?.display_name || ''}</span>
                  <span className="sm:hidden">{branding?.display_name || ''}</span>
                </h1>
                <div className="bg-[var(--color-primary)]/15 backdrop-blur-sm rounded-md px-1 sm:px-1.5 py-0.5 border border-[var(--color-primary)]/25 flex-shrink-0 hidden sm:block">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[var(--color-primary)]">v{APP_VERSION}</span>
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-1.5 mt-0.5 flex-wrap">
                <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-[var(--color-primary)] hidden sm:inline">Staff Dashboard</p>
                <span className="text-gray-600 text-xs hidden md:inline">•</span>
                {/* Branch Selector - shows dropdown for admin_staff/super_admin, read-only for others */}
                <div className="hidden md:block">
                  <BranchSelector />
                </div>
              </div>
            </div>
          </div>

          {/* Right section - Welcome message and buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-4 flex-shrink-0">
            {/* Welcome message - hidden on mobile and tablet */}
            <div className="hidden xl:block text-right">
              <p className="text-sm font-semibold text-white">Welcome back, Staff</p>
              <p className="text-[10px] text-gray-400 font-medium">{new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}</p>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center space-x-1.5">
              {user?.role !== 'branch_owner' && (
                <>
                  <Link
                    to="/staff/pos"
                    className="bg-green-500/15 backdrop-blur-sm rounded-xl flex items-center justify-start space-x-1 px-3 py-2 hover:bg-green-500/25 active:scale-95 transition-all duration-200 border border-green-500/25 group touch-manipulation min-w-[44px] h-[44px]"
                    title="POS Mode"
                  >
                    <CreditCard className="w-5 h-5 text-green-400 group-hover:text-green-300 transition-colors duration-200 flex-shrink-0" />
                    <span className="text-green-400 group-hover:text-green-300 font-semibold text-xs transition-colors duration-200">POS</span>
                  </Link>

                  <Link
                    to="/kiosk"
                    className="bg-blue-500/15 backdrop-blur-sm rounded-xl flex items-center justify-start space-x-1 px-3 py-2 hover:bg-blue-500/25 active:scale-95 transition-all duration-200 border border-blue-500/25 group touch-manipulation min-w-[44px] h-[44px]"
                    title="Kiosk Mode"
                  >
                    <Monitor className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors duration-200 flex-shrink-0" />
                    <span className="text-blue-400 group-hover:text-blue-300 font-semibold text-xs transition-colors duration-200">Kiosk</span>
                  </Link>
                </>
              )}

              {/* Notification Bell */}
              <div className="flex-shrink-0">
                <NotificationBell userId={user._id} onOpenModal={onOpenNotifications} />
              </div>

              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-11 h-11 bg-white/5 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all duration-200 border border-white/10 group touch-manipulation"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:rotate-90 transition-all duration-200" />
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className="w-11 h-11 bg-white/5 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer border border-white/10 group touch-manipulation"
                title="My Profile"
              >
                <User className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-200" />
              </button>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-11 h-11 bg-red-500/15 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-red-500/25 active:scale-95 transition-all duration-200 border border-red-500/25 group touch-manipulation"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors duration-200" />
              </button>
            </div>

            {/* Mobile Action Buttons - Simplified */}
            <div className="flex md:hidden items-center space-x-1">
              {/* Notification Bell - Always visible */}
              <div className="flex-shrink-0">
                <NotificationBell userId={user._id} onOpenModal={onOpenNotifications} />
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="w-9 h-9 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all duration-200 border border-white/10 touch-manipulation relative z-[9998]"
                title="Menu"
                type="button"
              >
                {showMobileMenu ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        sessionToken={sessionToken}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentBranch={currentBranch}
        user={user}
        onSave={(settings) => {
          console.log('Settings saved:', settings)
          // Refresh or update UI if needed
        }}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={onLogout}
      />

      {/* Fullscreen Mobile Menu */}
      {showMobileMenu && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Menu Content */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg)] via-[#1A1A1A] to-[#0F0F0F] overflow-y-auto"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[#2A2A2A]/50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={branding?.logo_light_url }
                  alt={branding?.display_name || 'Logo'}
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <h2 className="text-base font-bold text-white">Menu</h2>
                  <p className="text-xs text-gray-400"> Staff Dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="w-10 h-10 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all duration-200 border border-white/10 touch-manipulation"
                title="Close Menu"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 py-6 space-y-2">
              {/* Quick Actions */}
              {/* Quick Actions */}
              {user?.role !== 'branch_owner' && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Quick Actions</h3>
                  <div className="space-y-2">
                    <Link
                      to="/staff/pos"
                      onClick={() => setShowMobileMenu(false)}
                      className="w-full flex items-center space-x-4 px-4 py-4 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20 hover:border-green-500/40 transition-all duration-200 touch-manipulation active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-base">POS Mode</p>
                        <p className="text-gray-400 text-xs mt-0.5">Point of Sale system</p>
                      </div>
                    </Link>

                    <Link
                      to="/kiosk"
                      onClick={() => setShowMobileMenu(false)}
                      className="w-full flex items-center space-x-4 px-4 py-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 touch-manipulation active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Monitor className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-base">Kiosk Mode</p>
                        <p className="text-gray-400 text-xs mt-0.5">Customer self-service</p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}

              {/* Account Section */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Account</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleMobileMenuAction('profile')}
                    className="w-full flex items-center space-x-4 px-4 py-4 bg-[#1A1A1A]/50 rounded-xl border border-[#2A2A2A]/50 hover:bg-[#222222] hover:border-[#333333] transition-all duration-200 touch-manipulation active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold text-base">My Profile</p>
                      <p className="text-gray-400 text-xs mt-0.5">View and edit profile</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleMobileMenuAction('settings')}
                    className="w-full flex items-center space-x-4 px-4 py-4 bg-[#1A1A1A]/50 rounded-xl border border-[#2A2A2A]/50 hover:bg-[#222222] hover:border-[#333333] transition-all duration-200 touch-manipulation active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Settings className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold text-base">Settings</p>
                      <p className="text-gray-400 text-xs mt-0.5">App preferences</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Branch Info */}
              {currentBranch && (
                <div className="mb-6 px-4 py-3 bg-[#1A1A1A]/30 rounded-xl border border-[#2A2A2A]/30">
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-[var(--color-primary)]" />
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{currentBranch.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">Branch Code: {currentBranch.branch_code}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Logout */}
              <div className="pt-4 border-t border-[#2A2A2A]/50">
                <button
                  onClick={() => handleMobileMenuAction('logout')}
                  className="w-full flex items-center space-x-4 px-4 py-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 touch-manipulation active:scale-[0.98]"
                >
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-red-400 font-semibold text-base">Logout</p>
                    <p className="text-gray-400 text-xs mt-0.5">Sign out of your account</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default DashboardHeader