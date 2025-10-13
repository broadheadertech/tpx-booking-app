import React, { useState } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import { 
  Settings, 
  Store, 
  Clock, 
  DollarSign, 
  Users, 
  Bell, 
  Shield, 
  Palette,
  Save,
  RefreshCw
} from 'lucide-react'

const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    bookingReminders: true,
    paymentNotifications: true,
    
    // Display Preferences
    darkMode: false,
    compactView: false,
    showTutorials: true,
    
    // Session & Security
    sessionTimeout: '60', // minutes
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
      darkMode: false,
      compactView: false,
      showTutorials: true,
      sessionTimeout: '60',
      autoLogout: true
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Preferences" size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        <p className="text-sm text-gray-600">
          Customize your dashboard experience and notification preferences.
        </p>

        {/* Notification Preferences */}
        <div className="space-y-4 bg-gray-50 rounded-xl p-5">
          <h3 className="text-lg font-bold text-[#1A1A1A] flex items-center">
            <Bell className="w-5 h-5 text-[#FF8C42] mr-2" />
            Notification Preferences
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <label htmlFor="emailNotifications" className="text-sm font-semibold text-[#1A1A1A]">
                  Email Notifications
                </label>
                <p className="text-xs text-gray-500">Receive notifications via email</p>
              </div>
              <input
                type="checkbox"
                id="emailNotifications"
                checked={settings.emailNotifications}
                onChange={(e) => handleCheckboxChange('emailNotifications', e.target.checked)}
                className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <label htmlFor="smsNotifications" className="text-sm font-semibold text-[#1A1A1A]">
                  SMS Notifications
                </label>
                <p className="text-xs text-gray-500">Receive notifications via SMS</p>
              </div>
              <input
                type="checkbox"
                id="smsNotifications"
                checked={settings.smsNotifications}
                onChange={(e) => handleCheckboxChange('smsNotifications', e.target.checked)}
                className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <label htmlFor="bookingReminders" className="text-sm font-semibold text-[#1A1A1A]">
                  Booking Reminders
                </label>
                <p className="text-xs text-gray-500">Get reminders for upcoming bookings</p>
              </div>
              <input
                type="checkbox"
                id="bookingReminders"
                checked={settings.bookingReminders}
                onChange={(e) => handleCheckboxChange('bookingReminders', e.target.checked)}
                className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <label htmlFor="paymentNotifications" className="text-sm font-semibold text-[#1A1A1A]">
                  Payment Notifications
                </label>
                <p className="text-xs text-gray-500">Get notified about payment updates</p>
              </div>
              <input
                type="checkbox"
                id="paymentNotifications"
                checked={settings.paymentNotifications}
                onChange={(e) => handleCheckboxChange('paymentNotifications', e.target.checked)}
                className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
              />
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="space-y-4 bg-gray-50 rounded-xl p-5">
          <h3 className="text-lg font-bold text-[#1A1A1A] flex items-center">
            <Palette className="w-5 h-5 text-[#FF8C42] mr-2" />
            Display Preferences
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <label htmlFor="darkMode" className="text-sm font-semibold text-[#1A1A1A]">
                  Dark Mode
                </label>
                <p className="text-xs text-gray-500">Coming soon - Enable dark theme</p>
              </div>
              <input
                type="checkbox"
                id="darkMode"
                checked={settings.darkMode}
                onChange={(e) => handleCheckboxChange('darkMode', e.target.checked)}
                disabled
                className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42] disabled:opacity-50"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <label htmlFor="compactView" className="text-sm font-semibold text-[#1A1A1A]">
                  Compact View
                </label>
                <p className="text-xs text-gray-500">Use compact layout for tables and lists</p>
              </div>
              <input
                type="checkbox"
                id="compactView"
                checked={settings.compactView}
                onChange={(e) => handleCheckboxChange('compactView', e.target.checked)}
                className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <label htmlFor="showTutorials" className="text-sm font-semibold text-[#1A1A1A]">
                  Show Tutorials
                </label>
                <p className="text-xs text-gray-500">Display helpful tips and tutorials</p>
              </div>
              <input
                type="checkbox"
                id="showTutorials"
                checked={settings.showTutorials}
                onChange={(e) => handleCheckboxChange('showTutorials', e.target.checked)}
                className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
              />
            </div>
          </div>
        </div>

        {/* Session & Security */}
        <div className="space-y-4 bg-gray-50 rounded-xl p-5">
          <h3 className="text-lg font-bold text-[#1A1A1A] flex items-center">
            <Shield className="w-5 h-5 text-[#FF8C42] mr-2" />
            Session & Security
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Session Timeout
              </label>
              <select
                value={settings.sessionTimeout}
                onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#FF8C42]"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Auto-logout after inactivity</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <label htmlFor="autoLogout" className="text-sm font-semibold text-[#1A1A1A]">
                  Auto Logout
                </label>
                <p className="text-xs text-gray-500">Automatically logout when session expires</p>
              </div>
              <input
                type="checkbox"
                id="autoLogout"
                checked={settings.autoLogout}
                onChange={(e) => handleCheckboxChange('autoLogout', e.target.checked)}
                className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-8 border-t border-[#F5F5F5]">
        <button
          onClick={resetToDefaults}
          className="flex items-center space-x-2 px-4 py-2 text-[#6B6B6B] hover:text-[#1A1A1A] font-semibold transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset to Defaults</span>
        </button>
        
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white font-semibold rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg font-semibold rounded-xl transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SettingsModal