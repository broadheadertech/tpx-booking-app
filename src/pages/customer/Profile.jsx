import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, MapPin, Edit2, LogOut, Save, X, ArrowLeft, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useNavigate } from 'react-router-dom'
import { APP_VERSION } from '../../config/version'
import { useBranding } from '../../context/BrandingContext'

const Profile = ({ onBack }) => {
  const { user, logout, loading: authLoading, sessionToken } = useAuth()
  const navigate = useNavigate()
  const updateUserProfileMutation = useMutation(api.services.auth.updateUserProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
   const { branding } = useBranding()
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
      setError('')
      setSuccess('')
      
      // Validate inputs
      if (profileData.nickname && profileData.nickname.length > 100) {
        throw new Error('Nickname must be less than 100 characters')
      }
      if (profileData.mobile_number && profileData.mobile_number.length > 0) {
        if (!/^\+?[0-9\s\-\(\)]{7,}$/.test(profileData.mobile_number)) {
          throw new Error('Please enter a valid phone number with at least 7 digits')
        }
      }
      
      // Call backend mutation
      const result = await updateUserProfileMutation({
        sessionToken: sessionToken || '',
        nickname: profileData.nickname || undefined,
        email: undefined, // Email should not be changed
        mobile_number: profileData.mobile_number || undefined,
        birthday: profileData.birthday || undefined,
      })
      
      if (result) {
        setSuccess('Profile updated successfully!')
        setIsEditing(false)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      const errorMessage = error?.message || 'Failed to update profile. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('Logging out...')
      await logout()
      console.log('Logout successful, navigating to login...')
      // Use window.location for a hard redirect to ensure clean state
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, redirect to login
      window.location.href = '/auth/login'
    }
  }

  const handleResetOnboarding = () => {
    // Clear the onboarding completion flag from session storage
    sessionStorage.removeItem('onboarding_completed')
    
    // Show confirmation message
    alert('Onboarding has been reset! You will see the welcome tour on your next visit to the dashboard.')
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/customer/dashboard')
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-lg font-bold text-white">Profile</h1>
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors text-sm shadow-lg"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="relative z-10 max-w-md mx-auto px-4 py-6 pb-20">
        {/* Profile Header Card */}
        <div className="bg-[#1A1A1A] rounded-2xl shadow-lg border border-[#2A2A2A] mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] px-6 py-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 ring-4 ring-white/30">
                <img
                  src={user?.avatar || '/img/avatar_default.jpg'}
                  alt={profileData.nickname || profileData.username || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {profileData.nickname || profileData.username || 'User'}
              </h2>
              <p className="text-white/90 text-sm">{profileData.email}</p>
              <div className="mt-3 px-4 py-1.5 bg-white/20 rounded-full inline-block">
                <span className="text-white text-xs font-medium uppercase tracking-wide">
                  {user?.role === 'staff' ? 'Staff Member' : 'Customer'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">{success}</p>
          </div>
        )}

        {/* Personal Information Card */}
        <div className="bg-[#1A1A1A] rounded-2xl shadow-lg border border-[#2A2A2A] mb-4">
          <div className="px-4 py-4 border-b border-[#2A2A2A]">
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
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-[#0A0A0A] text-white rounded-xl">{profileData.username}</p>
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
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-[#0A0A0A] text-white rounded-xl">{profileData.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nickname
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="Enter your preferred name"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-[#0A0A0A] text-gray-300 rounded-xl">{profileData.nickname || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Mobile Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.mobile_number}
                  onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-[#0A0A0A] text-gray-300 rounded-xl">{profileData.mobile_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Birthday
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-[#0A0A0A] text-gray-300 rounded-xl">
                  {profileData.birthday ? new Date(profileData.birthday).toLocaleDateString('en-PH') : 'Not set'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Account Statistics */}
        <div className="bg-[#1A1A1A] rounded-2xl shadow-lg border border-[#2A2A2A] mb-6">
          <div className="px-4 py-4 border-b border-[#2A2A2A]">
            <h3 className="text-lg font-semibold text-white">Account Summary</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="text-center p-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-xl">
              <div className="text-white text-sm font-medium">Member since</div>
              <div className="text-white text-lg font-bold">
                {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Version Display */}
        <div className="text-center mb-6">
          <p className="text-xs text-gray-500">v{APP_VERSION}</p>
          <p className="text-xs text-gray-600">{branding?.display_name}</p>
        </div>

        {/* Edit Button */}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 shadow-lg mb-4"
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
              className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#2A2A2A] transition-colors"
            >
              <X className="w-4 h-4 inline mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50"
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
