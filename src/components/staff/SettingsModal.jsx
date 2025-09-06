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
    // Barbershop Info
    shopName: 'TipunoX Angeles Barbershop',
    address: '123 Main Street, Quezon City, Philippines',
    phone: '+63 912 345 6789',
    email: 'info@tpxbarbershop.com',
    
    // Business Hours
    openTime: '09:00',
    closeTime: '18:00',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    
    // Pricing & Services
    currency: 'PHP',
    taxRate: '12',
    loyaltyPointsRate: '1', // 1 point per peso spent
    
    // Staff Settings
    maxConcurrentBookings: '3',
    bookingSlotDuration: '30', // minutes
    advanceBookingDays: '30',
    
    // Notifications
    emailNotifications: true,
    smsNotifications: true,
    reminderHours: '24',
    
    // Security
    sessionTimeout: '60', // minutes
    requireStaffPin: false,
    auditLogging: true,
    
    // System Preferences
    theme: 'professional',
    language: 'en',
    timezone: 'Asia/Manila',
    dateFormat: 'MM/DD/YYYY'
  })

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field, checked) => {
    setSettings(prev => ({ ...prev, [field]: checked }))
  }

  const handleWorkingDayToggle = (day) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }))
  }

  const handleSave = () => {
    onSave?.(settings)
    onClose()
  }

  const resetToDefaults = () => {
    // Reset to default values
    setSettings({
      shopName: 'TipunoX Angeles Barbershop',
      address: '123 Main Street, Quezon City, Philippines',
      phone: '+63 912 345 6789',
      email: 'info@tpxbarbershop.com',
      openTime: '09:00',
      closeTime: '18:00',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      currency: 'PHP',
      taxRate: '12',
      loyaltyPointsRate: '1',
      maxConcurrentBookings: '3',
      bookingSlotDuration: '30',
      advanceBookingDays: '30',
      emailNotifications: true,
      smsNotifications: true,
      reminderHours: '24',
      sessionTimeout: '60',
      requireStaffPin: false,
      auditLogging: true,
      theme: 'professional',
      language: 'en',
      timezone: 'Asia/Manila',
      dateFormat: 'MM/DD/YYYY'
    })
  }

  const days = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="System Settings" size="xl">
      <div className="space-y-8 max-h-[80vh] overflow-y-auto">
        {/* Barbershop Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
            <Store className="w-5 h-5 text-[#FF8C42] mr-2" />
            Barbershop Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Shop Name"
              value={settings.shopName}
              onChange={(e) => handleInputChange('shopName', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Phone Number"
              value={settings.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Email Address"
              type="email"
              value={settings.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <div className="md:col-span-2">
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">Address</label>
              <textarea
                value={settings.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
            <Clock className="w-5 h-5 text-[#FF8C42] mr-2" />
            Business Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Opening Time"
              type="time"
              value={settings.openTime}
              onChange={(e) => handleInputChange('openTime', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Closing Time"
              type="time"
              value={settings.closeTime}
              onChange={(e) => handleInputChange('closeTime', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
          </div>
          <div>
            <label className="block text-[#1A1A1A] font-bold text-base mb-3">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <button
                  key={day.id}
                  onClick={() => handleWorkingDayToggle(day.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    settings.workingDays.includes(day.id)
                      ? 'bg-[#FF8C42] text-white'
                      : 'bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#FF8C42]/10'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing & Loyalty */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
            <DollarSign className="w-5 h-5 text-[#FF8C42] mr-2" />
            Pricing & Loyalty
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="PHP">Philippine Peso (₱)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
            <Input
              label="Tax Rate (%)"
              type="number"
              value={settings.taxRate}
              onChange={(e) => handleInputChange('taxRate', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Loyalty Points per ₱1"
              type="number"
              value={settings.loyaltyPointsRate}
              onChange={(e) => handleInputChange('loyaltyPointsRate', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
          </div>
        </div>

        {/* Staff & Booking Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
            <Users className="w-5 h-5 text-[#FF8C42] mr-2" />
            Staff & Booking Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Max Concurrent Bookings"
              type="number"
              value={settings.maxConcurrentBookings}
              onChange={(e) => handleInputChange('maxConcurrentBookings', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Booking Slot Duration (min)"
              type="number"
              value={settings.bookingSlotDuration}
              onChange={(e) => handleInputChange('bookingSlotDuration', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Advance Booking Days"
              type="number"
              value={settings.advanceBookingDays}
              onChange={(e) => handleInputChange('advanceBookingDays', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
            <Bell className="w-5 h-5 text-[#FF8C42] mr-2" />
            Notifications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleCheckboxChange('emailNotifications', e.target.checked)}
                  className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
                />
                <label htmlFor="emailNotifications" className="text-[#1A1A1A] font-semibold">
                  Email Notifications
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="smsNotifications"
                  checked={settings.smsNotifications}
                  onChange={(e) => handleCheckboxChange('smsNotifications', e.target.checked)}
                  className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
                />
                <label htmlFor="smsNotifications" className="text-[#1A1A1A] font-semibold">
                  SMS Notifications
                </label>
              </div>
            </div>
            <Input
              label="Reminder Hours Before Appointment"
              type="number"
              value={settings.reminderHours}
              onChange={(e) => handleInputChange('reminderHours', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
          </div>
        </div>

        {/* Security Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
            <Shield className="w-5 h-5 text-[#FF8C42] mr-2" />
            Security Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Session Timeout (minutes)"
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <div className="space-y-3 pt-8">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="requireStaffPin"
                  checked={settings.requireStaffPin}
                  onChange={(e) => handleCheckboxChange('requireStaffPin', e.target.checked)}
                  className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
                />
                <label htmlFor="requireStaffPin" className="text-[#1A1A1A] font-semibold">
                  Require Staff PIN for Actions
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="auditLogging"
                  checked={settings.auditLogging}
                  onChange={(e) => handleCheckboxChange('auditLogging', e.target.checked)}
                  className="w-5 h-5 text-[#FF8C42] rounded focus:ring-[#FF8C42]"
                />
                <label htmlFor="auditLogging" className="text-[#1A1A1A] font-semibold">
                  Enable Audit Logging
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* System Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
            <Palette className="w-5 h-5 text-[#FF8C42] mr-2" />
            System Preferences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="professional">Professional</option>
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
              </select>
            </div>
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="en">English</option>
                <option value="fil">Filipino</option>
              </select>
            </div>
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="Asia/Manila">Asia/Manila</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
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