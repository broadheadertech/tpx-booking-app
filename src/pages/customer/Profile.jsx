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
      <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}} className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#F68B24'}}></div>
          <p style={{color: '#8B8B8B'}}>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{backgroundColor: '#36454F'}}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center" 
                style={{backgroundColor: '#F68B24'}}
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div>
                <h1 className="text-sm font-bold text-white">My Profile</h1>
                <p className="text-xs font-medium" style={{color: '#F68B24'}}>Account Settings</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm shadow-sm"
            >
              <LogOut className="w-3 h-3" />
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
        <div className="bg-white rounded-2xl shadow-lg border border-[#E0E0E0] mb-4">
          <div className="px-4 py-4 border-b border-[#E0E0E0]">
            <h3 className="text-lg font-semibold" style={{color: '#36454F'}}>Personal Information</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6B6B6B] mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Username
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F68B24]"
                />
              ) : (
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl" style={{color: '#36454F'}}>{profileData.username}</p>
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
                <p className="px-4 py-3 bg-[#F4F0E6] rounded-xl" style={{color: '#36454F'}}>{profileData.email}</p>
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
