import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, MapPin, Edit2, LogOut, Save, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Profile = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    preferences: {
      notifications: true,
      emailUpdates: true,
      smsReminders: true
    }
  })

  useEffect(() => {
    loadProfileData()
  }, [user])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      // Mock profile data - replace with actual API call
      setProfileData({
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+63 912 345 6789',
        address: '123 Main St, Manila, Philippines',
        dateOfBirth: '1990-01-15',
        preferences: {
          notifications: true,
          emailUpdates: true,
          smsReminders: true
        }
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePreferenceChange = (preference, value) => {
    setProfileData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      // Mock save - replace with actual API call
      console.log('Saving profile:', profileData)
      // await profileService.updateProfile(profileData)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (loading && !profileData.name) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B4513] mx-auto mb-4"></div>
          <p className="text-[#6B6B6B]">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-[#E0E0E0]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{color: '#36454F'}}>My Profile</h1>
                <p className="text-sm font-medium text-[#6B6B6B]">Account Settings</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-md mx-auto px-4 py-6 pb-20">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E0E0E0] mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-[#36454F] to-[#2A3439] px-6 py-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{profileData.name}</h2>
              <p className="text-white/80 text-sm">{profileData.email}</p>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="mt-4 flex items-center space-x-2 px-4 py-2 bg-[#F68B24] text-white rounded-xl hover:bg-[#E67A1F] transition-colors mx-auto text-sm"
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E0E0E0] mb-4">
          <div className="px-4 py-4 border-b border-[#E0E0E0]">
            <h3 className="text-lg font-semibold" style={{color: '#36454F'}}>Personal Information</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24]"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl text-[#1A1A1A]">{profileData.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24]"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl text-[#1A1A1A]">{profileData.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24]"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl text-[#1A1A1A]">{profileData.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date of Birth
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24]"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl text-[#1A1A1A]">
                  {new Date(profileData.dateOfBirth).toLocaleDateString('en-PH')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Preferences Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E0E0E0] mb-4">
          <div className="px-4 py-4 border-b border-[#E0E0E0]">
            <h3 className="text-lg font-semibold" style={{color: '#36454F'}}>Contact & Preferences</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Address
              </label>
              {isEditing ? (
                <textarea
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24] resize-none"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl text-[#1A1A1A]">{profileData.address}</p>
              )}
            </div>

            {/* Notification Preferences */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[#6B6B6B]">Notification Preferences</h4>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-3 rounded-xl bg-[#F4F0E6]">
                  <input
                    type="checkbox"
                    checked={profileData.preferences.notifications}
                    onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                    disabled={!isEditing}
                    className="w-4 h-4 text-[#F68B24] border-[#E0E0E0] rounded focus:ring-[#F68B24]"
                  />
                  <span className="text-sm text-[#1A1A1A]">Push notifications</span>
                </label>

                <label className="flex items-center space-x-3 p-3 rounded-xl bg-[#F4F0E6]">
                  <input
                    type="checkbox"
                    checked={profileData.preferences.emailUpdates}
                    onChange={(e) => handlePreferenceChange('emailUpdates', e.target.checked)}
                    disabled={!isEditing}
                    className="w-4 h-4 text-[#F68B24] border-[#E0E0E0] rounded focus:ring-[#F68B24]"
                  />
                  <span className="text-sm text-[#1A1A1A]">Email updates</span>
                </label>

                <label className="flex items-center space-x-3 p-3 rounded-xl bg-[#F4F0E6]">
                  <input
                    type="checkbox"
                    checked={profileData.preferences.smsReminders}
                    onChange={(e) => handlePreferenceChange('smsReminders', e.target.checked)}
                    disabled={!isEditing}
                    className="w-4 h-4 text-[#F68B24] border-[#E0E0E0] rounded focus:ring-[#F68B24]"
                  />
                  <span className="text-sm text-[#1A1A1A]">SMS reminders</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="bg-white rounded-2xl shadow-lg border border-[#E0E0E0] p-4">
            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-3 border border-[#E0E0E0] text-[#6B6B6B] rounded-xl hover:bg-[#F4F0E6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-[#F68B24] text-white rounded-xl hover:bg-[#E67A1F] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
