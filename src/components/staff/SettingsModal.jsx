import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { 
  Settings, 
  Clock, 
  Bell, 
  Shield, 
  Palette,
  Save,
  RefreshCw,
  X
} from 'lucide-react'

const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingReminders: true,
    paymentNotifications: true,
    compactView: false,
    showTutorials: true,
    sessionTimeout: '60',
    autoLogout: true
  })

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field, checked) => {
    setSettings(prev => ({ ...prev, [field]: checked }))
  }

  const handleSave = () => {
    onSave?.(settings)
    onClose()
  }

  const resetToDefaults = () => {
    setSettings({
      emailNotifications: true,
      smsNotifications: false,
      bookingReminders: true,
      paymentNotifications: true,
      compactView: false,
      showTutorials: true,
      sessionTimeout: '60',
      autoLogout: true
    })
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
          <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#FF8C42]" />
              Settings
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
            {/* Notifications */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#FF8C42]" />
                Notifications
              </h3>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                  <span className="text-sm text-gray-300">Email Notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleCheckboxChange('emailNotifications', e.target.checked)}
                    className="w-4 h-4 text-[#FF8C42] rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                  <span className="text-sm text-gray-300">SMS Notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.smsNotifications}
                    onChange={(e) => handleCheckboxChange('smsNotifications', e.target.checked)}
                    className="w-4 h-4 text-[#FF8C42] rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                  <span className="text-sm text-gray-300">Booking Reminders</span>
                  <input
                    type="checkbox"
                    checked={settings.bookingReminders}
                    onChange={(e) => handleCheckboxChange('bookingReminders', e.target.checked)}
                    className="w-4 h-4 text-[#FF8C42] rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                  <span className="text-sm text-gray-300">Payment Notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.paymentNotifications}
                    onChange={(e) => handleCheckboxChange('paymentNotifications', e.target.checked)}
                    className="w-4 h-4 text-[#FF8C42] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="h-px bg-[#2A2A2A]/50" />

            {/* Display */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#FF8C42]" />
                Display
              </h3>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                  <span className="text-sm text-gray-300">Compact View</span>
                  <input
                    type="checkbox"
                    checked={settings.compactView}
                    onChange={(e) => handleCheckboxChange('compactView', e.target.checked)}
                    className="w-4 h-4 text-[#FF8C42] rounded cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                  <span className="text-sm text-gray-300">Show Tutorials</span>
                  <input
                    type="checkbox"
                    checked={settings.showTutorials}
                    onChange={(e) => handleCheckboxChange('showTutorials', e.target.checked)}
                    className="w-4 h-4 text-[#FF8C42] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="h-px bg-[#2A2A2A]/50" />

            {/* Session & Security */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FF8C42]" />
                Security
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Session Timeout</label>
                  <select
                    value={settings.sessionTimeout}
                    onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                  <span className="text-sm text-gray-300">Auto Logout</span>
                  <input
                    type="checkbox"
                    checked={settings.autoLogout}
                    onChange={(e) => handleCheckboxChange('autoLogout', e.target.checked)}
                    className="w-4 h-4 text-[#FF8C42] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A]/50">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-[#FF8C42] transition-colors duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#555555]/70 transition-all duration-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SettingsModal