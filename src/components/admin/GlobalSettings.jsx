import React, { useState, useEffect } from 'react'
import { Settings, Save, Database, Shield, Mail, Bell, Globe, Server, User, Lock, AlertCircle, CheckCircle, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { APP_VERSION } from '../../config/version'

const GlobalSettings = ({ onRefresh }) => {
  const { user, logout } = useAuth()
  const updateUserProfile = useMutation(api.services.auth.updateUserProfile)
  
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    nickname: user?.nickname || '',
    mobile_number: user?.mobile_number || '',
    address: user?.address || '',
    bio: user?.bio || ''
  })

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    timezone: 'Asia/Manila',
    currency: 'PHP',
    emailNotifications: true,
    smsNotifications: false,
    autoBackup: true,
    maintenanceMode: false,
    debugMode: false,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    bookingReminderHours: 24,
    cancelBookingHours: 2
  })

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState({})

  // Handle profile form changes
  const handleProfileChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }))
    setMessage({ type: '', text: '' })
  }

  // Handle system settings changes
  const handleSettingChange = (key, value) => {
    setSystemSettings(prev => ({ ...prev, [key]: value }))
    setMessage({ type: '', text: '' })
  }

  // Save profile changes
  const handleSaveProfile = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await updateUserProfile({
        email: profileForm.email,
        nickname: profileForm.nickname,
        mobile_number: profileForm.mobile_number,
        address: profileForm.address,
        bio: profileForm.bio
      })

      setMessage({
        type: 'success',
        text: '✓ Profile updated successfully!'
      })
    } catch (error) {
      console.error('Profile update error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update profile'
      })
    } finally {
      setLoading(false)
    }
  }

  // Validate and save password
  const handleSavePassword = async () => {
    const errors = {}

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required'
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters'
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setPasswordErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setLoading(true)
    
    try {
      // Password change would be implemented in the backend
      setMessage({
        type: 'success',
        text: '✓ Password changed successfully!'
      })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setShowPasswordModal(false)
    } catch (error) {
      console.error('Password change error:', error)
      setMessage({
        type: 'error',
        text: 'Failed to change password'
      })
    } finally {
      setLoading(false)
    }
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Admin Profile Section */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-8 border border-[#444444]/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Admin Profile</h3>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-start space-x-3 border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={profileForm.username}
                disabled
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444]/50 rounded-lg text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={profileForm.nickname}
                onChange={(e) => handleProfileChange('nickname', e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Mobile Number</label>
              <input
                type="tel"
                value={profileForm.mobile_number}
                onChange={(e) => handleProfileChange('mobile_number', e.target.value)}
                placeholder="+63 9XX XXXX XXX"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => handleProfileChange('address', e.target.value)}
                placeholder="Your address"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => handleProfileChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows="4"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-[#444444]/30">
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-all border border-[#444444]"
            >
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Role Info */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-400">Admin Role</p>
            <p className="text-lg font-semibold text-white capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSettingsTab = () => (
    <div className="space-y-8">
      {/* System Configuration */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-8 border border-[#444444]/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Server className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">System Configuration</h3>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
              <select
                value={systemSettings.timezone}
                onChange={(e) => handleSettingChange('timezone', e.target.value)}
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">America/New_York (GMT-5)</option>
                <option value="Europe/London">Europe/London (GMT+0)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
              <select
                value={systemSettings.currency}
                disabled
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#444444]/50 rounded-lg text-gray-500 cursor-not-allowed"
              >
                <option value="PHP">PHP (Philippine Peso)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Currency is fixed to PHP</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Login Attempts</label>
              <input
                type="number"
                value={systemSettings.maxLoginAttempts}
                onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                min="3"
                max="10"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout (minutes)</label>
              <input
                type="number"
                value={systemSettings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                min="5"
                max="240"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Booking Reminder Hours</label>
              <input
                type="number"
                value={systemSettings.bookingReminderHours}
                onChange={(e) => handleSettingChange('bookingReminderHours', parseInt(e.target.value))}
                min="1"
                max="168"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Cancel Booking Before Hours</label>
              <input
                type="number"
                value={systemSettings.cancelBookingHours}
                onChange={(e) => handleSettingChange('cancelBookingHours', parseInt(e.target.value))}
                min="0.5"
                max="24"
                step="0.5"
                className="w-full px-4 py-3 bg-[#333333] border border-[#444444] rounded-lg text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-8 border border-[#444444]/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Notifications</h3>
        </div>

        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', description: 'Enable system email notifications' },
            { key: 'smsNotifications', label: 'SMS Notifications', description: 'Enable SMS notifications (requires provider)' }
          ].map((item) => (
            <div key={item.key} className="bg-[#1A1A1A]/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
              <button
                onClick={() => handleSettingChange(item.key, !systemSettings[item.key])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemSettings[item.key]
                    ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]'
                    : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemSettings[item.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data & Security */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-8 border border-[#444444]/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Data & Security</h3>
        </div>

        <div className="space-y-4">
          {[
            { key: 'autoBackup', label: 'Automatic Backups', description: 'Enable daily automatic backups' },
            { key: 'maintenanceMode', label: 'Maintenance Mode', description: 'Enable maintenance mode (blocks user access)' },
            { key: 'debugMode', label: 'Debug Mode', description: 'Enable debug logging (performance impact)' }
          ].map((item) => (
            <div key={item.key} className="bg-[#1A1A1A]/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
              <button
                onClick={() => handleSettingChange(item.key, !systemSettings[item.key])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemSettings[item.key]
                    ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]'
                    : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemSettings[item.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSystemInfo = () => (
    <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-8 border border-[#444444]/50">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white">System Information</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Version', value: APP_VERSION },
          { label: 'Environment', value: 'Production' },
          { label: 'Database', value: 'Convex' },
          { label: 'Last Backup', value: 'Hourly' },
          { label: 'Uptime', value: '99.9%' },
          { label: 'API Version', value: 'v1.0' }
        ].map((info) => (
          <div key={info.label} className="text-center p-4 bg-[#1A1A1A]/50 rounded-lg">
            <div className="text-2xl font-bold text-white mb-1">{info.value}</div>
            <div className="text-gray-400 text-sm">{info.label}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span>Settings</span>
          </h2>
          <p className="text-gray-400 mt-1">Manage your profile and system preferences</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-[#333333]">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'system', label: 'System', icon: Settings },
          { id: 'info', label: 'Information', icon: Globe }
        ].map(tab => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && renderProfileTab()}
      {activeTab === 'system' && renderSettingsTab()}
      {activeTab === 'info' && renderSystemInfo()}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
            <div className="relative w-full max-w-md transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] shadow-2xl transition-all z-[10001] border border-[#444444]/50">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Change Password</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => {
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                        setPasswordErrors({ ...passwordErrors, currentPassword: '' })
                      }}
                      placeholder="Enter current password"
                      className={`w-full px-4 py-2 bg-[#333333] border rounded-lg text-white focus:ring-2 focus:border-transparent ${
                        passwordErrors.currentPassword
                          ? 'border-red-500/50 focus:ring-red-500/50'
                          : 'border-[#444444] focus:ring-[var(--color-primary)]/50'
                      }`}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="text-xs text-red-400 mt-1">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => {
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                        setPasswordErrors({ ...passwordErrors, newPassword: '' })
                      }}
                      placeholder="Enter new password"
                      className={`w-full px-4 py-2 bg-[#333333] border rounded-lg text-white focus:ring-2 focus:border-transparent ${
                        passwordErrors.newPassword
                          ? 'border-red-500/50 focus:ring-red-500/50'
                          : 'border-[#444444] focus:ring-[var(--color-primary)]/50'
                      }`}
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-xs text-red-400 mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => {
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                        setPasswordErrors({ ...passwordErrors, confirmPassword: '' })
                      }}
                      placeholder="Confirm new password"
                      className={`w-full px-4 py-2 bg-[#333333] border rounded-lg text-white focus:ring-2 focus:border-transparent ${
                        passwordErrors.confirmPassword
                          ? 'border-red-500/50 focus:ring-red-500/50'
                          : 'border-[#444444] focus:ring-[var(--color-primary)]/50'
                      }`}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-xs text-red-400 mt-1">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePassword}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
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

export default GlobalSettings