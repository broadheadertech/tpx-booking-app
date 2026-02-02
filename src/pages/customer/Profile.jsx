import { useState, useEffect } from 'react'
import { User, Edit2, LogOut, ArrowLeft, Settings, ChevronRight, Shield, Bell, HelpCircle, Star, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEnsureClerkUser } from '../../hooks/useEnsureClerkUser'
import { useNavigate } from 'react-router-dom'
import { APP_VERSION } from '../../config/version'
import { useBranding } from '../../context/BrandingContext'
import StarRewardsCard from '../../components/common/StarRewardsCard'

const Profile = ({ onBack }) => {
  const { logout: authLogout, sessionToken } = useAuth()
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const updateUserProfileMutation = useMutation(api.services.auth.updateUserProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { branding } = useBranding()

  // Use the hook that ensures Clerk users have Convex records
  const { user, isLoading: userLoading, isClerkAuth } = useEnsureClerkUser()

  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    nickname: '',
    mobile_number: '',
    birthday: ''
  })

  useEffect(() => {
    loadProfileData()
  }, [user, clerkUser])

  const loadProfileData = async () => {
    try {
      if (user) {
        setProfileData({
          username: user.username || user.first_name || '',
          email: user.email || clerkUser?.primaryEmailAddress?.emailAddress || '',
          nickname: user.nickname || user.first_name || '',
          mobile_number: user.mobile_number || clerkUser?.primaryPhoneNumber?.phoneNumber || '',
          birthday: user.birthday || ''
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

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (profileData.nickname && profileData.nickname.length > 100) {
        throw new Error('Nickname must be less than 100 characters')
      }
      if (profileData.mobile_number && profileData.mobile_number.length > 0) {
        if (!/^\+?[0-9\s\-\(\)]{7,}$/.test(profileData.mobile_number)) {
          throw new Error('Please enter a valid phone number')
        }
      }

      const result = await updateUserProfileMutation({
        sessionToken: sessionToken || '',
        nickname: profileData.nickname || undefined,
        email: undefined,
        mobile_number: profileData.mobile_number || undefined,
        birthday: profileData.birthday || undefined,
      })

      if (result) {
        setSuccess('Profile updated!')
        setIsEditing(false)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setError(error?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (isClerkAuth) {
        await signOut()
        window.location.href = '/auth/clerk-login'
      } else {
        await authLogout()
        window.location.href = '/auth/login'
      }
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/auth/login'
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/customer/dashboard')
    }
  }

  // Loading state
  if (userLoading || (!user && !clerkUser)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Get display name
  const displayName = profileData.nickname || profileData.username || clerkUser?.firstName || 'User'
  const avatarUrl = user?.avatar || clerkUser?.imageUrl || '/img/avatar_default.jpg'

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-2xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-lg font-bold text-white">Account</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 p-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white/20">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isClerkAuth && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-[var(--color-primary)]">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-xl font-black text-white mb-1">{displayName}</h2>
                <p className="text-sm text-white/80 mb-2">{profileData.email}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full">
                  <Star className="w-3 h-3 text-white" />
                  <span className="text-xs font-bold text-white">
                    {user?.role === 'staff' ? 'Staff' : 'Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Star Rewards Card */}
        {user?._id && (
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              Your Rewards
            </h3>
            <StarRewardsCard userId={user._id} />
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4">
            <p className="text-sm text-green-300">{success}</p>
          </div>
        )}

        {/* Personal Information */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--color-primary)]" />
              Personal Information
            </h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>

          <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden">
            {/* Nickname */}
            <div className="p-4 border-b border-[#2A2A2A]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Nickname</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="Your preferred name"
                  className="w-full bg-[#0A0A0A] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:border-[var(--color-primary)] focus:outline-none"
                />
              ) : (
                <p className="text-white font-medium">{profileData.nickname || 'Not set'}</p>
              )}
            </div>

            {/* Email */}
            <div className="p-4 border-b border-[#2A2A2A]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
              <p className="text-white font-medium">{profileData.email}</p>
              {isClerkAuth && (
                <p className="text-xs text-gray-500 mt-1">Managed by Clerk</p>
              )}
            </div>

            {/* Phone */}
            <div className="p-4 border-b border-[#2A2A2A]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.mobile_number}
                  onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                  placeholder="+63 XXX XXX XXXX"
                  className="w-full bg-[#0A0A0A] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:border-[var(--color-primary)] focus:outline-none"
                />
              ) : (
                <p className="text-white font-medium">{profileData.mobile_number || 'Not set'}</p>
              )}
            </div>

            {/* Birthday */}
            <div className="p-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Birthday</label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                  className="w-full bg-[#0A0A0A] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:border-[var(--color-primary)] focus:outline-none"
                />
              ) : (
                <p className="text-white font-medium">
                  {profileData.birthday ? new Date(profileData.birthday).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}
                </p>
              )}
            </div>
          </div>

          {/* Save/Cancel for edit mode */}
          {isEditing && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setIsEditing(false)
                  loadProfileData()
                }}
                className="flex-1 py-3 bg-[#1A1A1A] text-white font-semibold rounded-2xl border border-[#2A2A2A] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--color-primary)]" />
            Settings
          </h3>
          <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] divide-y divide-[#2A2A2A]">
            <button
              onClick={() => navigate('/customer/notifications')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors first:rounded-t-[20px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-white">Notifications</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm font-medium text-white">Help & Support</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors last:rounded-b-[20px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-sm font-medium text-red-400">Sign Out</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center pt-4">
          <p className="text-xs text-gray-500">{branding?.display_name || 'TPX Booking'}</p>
          <p className="text-xs text-gray-600 mt-1">Version {APP_VERSION}</p>
          {isClerkAuth && (
            <p className="text-xs text-[var(--color-primary)] mt-2 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Secured by Clerk
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
