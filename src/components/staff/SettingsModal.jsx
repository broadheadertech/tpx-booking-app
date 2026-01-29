import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { 
  Settings, 
  Clock, 
  Bell, 
  Shield, 
  Palette,
  Save,
  RefreshCw,
  X,
  Building,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload
} from 'lucide-react'

const SettingsModal = ({ isOpen, onClose, onSave, currentBranch, user }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingReminders: true,
    paymentNotifications: true,
    compactView: false,
    showTutorials: true,
    sessionTimeout: '60',
    autoLogout: true,
    bookingStartHour: 10,
    bookingEndHour: 20,
    carouselImages: []
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const updateBranch = useMutation(api.services.branches.updateBranch)
  
  // Default carousel images
  const defaultCarouselImages = [
    '/carousel/IMG_0154-min.JPG',
    '/carousel/IMG_0155-min.JPG',
    '/carousel/IMG_0164-min.JPG',
    '/carousel/IMG_0165-min.JPG',
    '/carousel/IMG_0166-min.JPG',
  ]
  
  // Load branch settings when modal opens or branch changes
  useEffect(() => {
    if (isOpen && currentBranch) {
      setSettings(prev => ({
        ...prev,
        bookingStartHour: currentBranch.booking_start_hour ?? 10,
        bookingEndHour: currentBranch.booking_end_hour ?? 20,
        carouselImages: currentBranch.carousel_images && currentBranch.carousel_images.length > 0
          ? currentBranch.carousel_images
          : defaultCarouselImages
      }))
    }
  }, [isOpen, currentBranch])

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field, checked) => {
    setSettings(prev => ({ ...prev, [field]: checked }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setUploadingImage(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      const imageUrl = reader.result
      setSettings(prev => ({
        ...prev,
        carouselImages: [...prev.carouselImages, imageUrl]
      }))
      setUploadingImage(false)
      e.target.value = '' // Reset input
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = (index) => {
    setSettings(prev => ({
      ...prev,
      carouselImages: prev.carouselImages.filter((_, i) => i !== index)
    }))
  }

  const handleImageUrlAdd = (url) => {
    if (url.trim()) {
      setSettings(prev => ({
        ...prev,
        carouselImages: [...prev.carouselImages, url.trim()]
      }))
    }
  }

  const handleSave = async () => {
    if (currentBranch && (user?.role === 'branch_admin' || user?.role === 'super_admin' || user?.role === 'staff')) {
      setLoading(true)
      setError('')
      setSuccessMessage('')
      
      try {
        await updateBranch({
          id: currentBranch._id,
          booking_start_hour: settings.bookingStartHour,
          booking_end_hour: settings.bookingEndHour,
          carousel_images: settings.carouselImages.length > 0 ? settings.carouselImages : defaultCarouselImages
        })
        setSuccessMessage('Settings updated successfully!')
        
        setTimeout(() => {
          onSave?.(settings)
          onClose()
        }, 1500)
      } catch (err) {
        console.error('Error updating settings:', err)
        setError(err.message || 'Failed to update settings')
        setLoading(false)
      }
    } else {
      onSave?.(settings)
      onClose()
    }
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
      autoLogout: true,
      bookingStartHour: 10,
      bookingEndHour: 20,
      carouselImages: defaultCarouselImages
    })
    setError('')
    setSuccessMessage('')
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'general', label: 'General', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'carousel', label: 'Carousel', icon: ImageIcon },
    { id: 'security', label: 'Security', icon: Shield, href: '/settings/security' },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-4xl transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
          <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-[var(--color-primary)]" />
              Settings
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[var(--color-primary)]/20 flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-[var(--color-primary)]" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#2A2A2A]/50 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.href) {
                      onClose()
                      navigate(tab.href)
                    } else {
                      setActiveTab(tab.id)
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Success/Error Messages */}
            {error && (
              <div className="p-3 bg-red-400/20 border border-red-400/30 rounded-lg text-sm text-red-400 mb-4">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-green-400/20 border border-green-400/30 rounded-lg text-sm text-green-400 flex items-center gap-2 mb-4">
                <span>✓</span> {successMessage}
              </div>
            )}
            
            {/* General Tab */}
            {activeTab === 'general' && currentBranch && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Building className="w-4 h-4 text-[var(--color-primary)]" />
                    Branch Booking Hours
                  </h3>
                  <div className="bg-[#232323] rounded-lg p-4 space-y-3">
                    <div className="text-xs text-gray-400 mb-2">
                      Configure available booking hours for {currentBranch.name}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">Start Time</label>
                        <select
                          value={settings.bookingStartHour}
                          onChange={(e) => handleInputChange('bookingStartHour', parseInt(e.target.value))}
                          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2">End Time</label>
                        <select
                          value={settings.bookingEndHour}
                          onChange={(e) => handleInputChange('bookingEndHour', parseInt(e.target.value))}
                          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      These hours determine when customers can book appointments at this branch.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[var(--color-primary)]" />
                  Notifications
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                    <span className="text-sm text-gray-300">Email Notifications</span>
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleCheckboxChange('emailNotifications', e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                    <span className="text-sm text-gray-300">SMS Notifications</span>
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={(e) => handleCheckboxChange('smsNotifications', e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                    <span className="text-sm text-gray-300">Booking Reminders</span>
                    <input
                      type="checkbox"
                      checked={settings.bookingReminders}
                      onChange={(e) => handleCheckboxChange('bookingReminders', e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                    <span className="text-sm text-gray-300">Payment Notifications</span>
                    <input
                      type="checkbox"
                      checked={settings.paymentNotifications}
                      onChange={(e) => handleCheckboxChange('paymentNotifications', e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Display Tab */}
            {activeTab === 'display' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[var(--color-primary)]" />
                  Display
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                    <span className="text-sm text-gray-300">Compact View</span>
                    <input
                      type="checkbox"
                      checked={settings.compactView}
                      onChange={(e) => handleCheckboxChange('compactView', e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#232323] cursor-pointer transition-colors">
                    <span className="text-sm text-gray-300">Show Tutorials</span>
                    <input
                      type="checkbox"
                      checked={settings.showTutorials}
                      onChange={(e) => handleCheckboxChange('showTutorials', e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Carousel Tab */}
            {activeTab === 'carousel' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[var(--color-primary)]" />
                  Carousel Banner Settings
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Manage carousel images displayed on the client dashboard. Minimum 5 images recommended.
                </p>

                {/* Upload Image */}
                <div className="bg-[#232323] rounded-lg p-4 space-y-3">
                  <label className="block text-xs text-gray-400 mb-2">Upload Image</label>
                  <div className="flex gap-3">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition-colors">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {uploadingImage ? 'Uploading...' : 'Choose File'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Add Image URL */}
                <div className="bg-[#232323] rounded-lg p-4 space-y-3">
                  <label className="block text-xs text-gray-400 mb-2">Add Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleImageUrlAdd(e.target.value)
                          e.target.value = ''
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.target.previousElementSibling
                        if (input) {
                          handleImageUrlAdd(input.value)
                          input.value = ''
                        }
                      }}
                      className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {settings.carouselImages.map((img, index) => (
                    <div key={index} className="relative group bg-[#232323] rounded-lg overflow-hidden">
                      <img
                        src={img}
                        alt={`Carousel ${index + 1}`}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          e.target.src = '/carousel/IMG_0154-min.JPG'
                        }}
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                        <p className="text-xs text-white truncate">{img.substring(0, 30)}...</p>
                      </div>
                    </div>
                  ))}
                </div>

                {settings.carouselImages.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No carousel images. Add images to display on the client dashboard.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A]/50">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-[var(--color-primary)] transition-colors duration-200"
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
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </>
                )}
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
