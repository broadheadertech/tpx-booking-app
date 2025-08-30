import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, MapPin, Edit2, LogOut, Save, X, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const Profile = () => {
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    nickname: '',
    mobile_number: '',
    birthday: '',
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
      if (user) {
        setProfileData({
          username: user.username || '',
          email: user.email || '',
          nickname: user.nickname || '',
          mobile_number: user.mobile_number || '',
          birthday: user.birthday || '',
          preferences: {
            notifications: true,
            emailUpdates: true,
            smsReminders: true
          }
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
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

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Force navigation even if logout fails
      navigate('/auth/login')
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8C42] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
      </div>
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-sm font-bold text-white">My Profile</h1>
                <p className="text-xs font-medium text-[#FF8C42]">Account Settings</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors text-sm shadow-lg"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="relative z-10 max-w-md mx-auto px-4 py-6 pb-20">
        {/* Profile Header Card */}
        <div className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl shadow-lg border border-[#555555]/30 mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] px-6 py-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">
                {profileData.nickname || profileData.username || 'User'}
              </h2>
              <p className="text-white/80 text-sm">{profileData.email}</p>
              <div className="mt-2 px-3 py-1 bg-white/20 rounded-full inline-block">
                <span className="text-white/90 text-xs font-medium">
                  {user?.role === 'staff' ? 'Staff Member' : 'Customer'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl shadow-lg border border-[#555555]/30 mb-4">
          <div className="px-4 py-4 border-b border-[#555555]/30">
            <h3 className="text-lg font-semibold text-white">Personal Information</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Username
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#555555] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-[#2A2A2A] text-white rounded-xl">{profileData.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#555555] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-[#2A2A2A] text-white rounded-xl">{profileData.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nickname
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="Enter your preferred name"
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24]"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl" style={{color: '#36454F'}}>{profileData.nickname || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Mobile Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.mobile_number}
                  onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24]"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl" style={{color: '#36454F'}}>{profileData.mobile_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Birthday
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24]"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl" style={{color: '#36454F'}}>
                  {profileData.birthday ? new Date(profileData.birthday).toLocaleDateString('en-PH') : 'Not set'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Account Statistics */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E0E0E0] mb-6">
          <div className="px-4 py-4 border-b border-[#E0E0E0]">
            <h3 className="text-lg font-semibold" style={{color: '#36454F'}}>Account Summary</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-[#F4F0E6] rounded-xl">
                <div className="text-2xl font-bold" style={{color: '#F68B24'}}>0</div>
                <div className="text-sm" style={{color: '#8B8B8B'}}>Total Bookings</div>
              </div>
              <div className="text-center p-4 bg-[#F4F0E6] rounded-xl">
                <div className="text-2xl font-bold" style={{color: '#F68B24'}}>0</div>
                <div className="text-sm" style={{color: '#8B8B8B'}}>Vouchers</div>
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-[#F68B24] to-[#E67A1F] rounded-xl">
              <div className="text-white text-sm font-medium">Member since</div>
              <div className="text-white text-lg font-bold">
                {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Button */}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#F68B24] text-white rounded-xl hover:bg-[#E67A1F] transition-colors shadow-lg mb-4"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        )}

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <div className="flex space-x-3 mb-4">
            <button
              onClick={() => {
                setIsEditing(false)
                loadProfileData() // Reset data
              }}
              className="flex-1 px-4 py-3 border border-[#E0E0E0] rounded-xl hover:bg-[#F4F0E6] transition-colors" 
              style={{color: '#8B8B8B'}}
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
        )}
      </div>
    </div>
  )
}

export default Profile
