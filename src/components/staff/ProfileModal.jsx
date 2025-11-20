import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { User, Mail, Phone, Briefcase, Shield, Edit, Save, X, AlertCircle, CheckCircle } from 'lucide-react'

const ProfileModal = ({ isOpen, onClose, user, sessionToken }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    nickname: user?.nickname || '',
    mobile_number: user?.mobile_number || ''
  })

  const updateProfile = useMutation(api.services.auth.updateUserProfile)

  const handleInputChange = (field, value) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSave = useCallback(async () => {
    setError(null)
    setSuccess(false)

    if (!sessionToken) {
      setError('Session expired. Please refresh the page.')
      return
    }

    // Validate inputs
    if (editedProfile.mobile_number && !/^\+?[0-9\s\-\(\)]{7,}$/.test(editedProfile.mobile_number)) {
      setError('Invalid mobile number format')
      return
    }

    if (editedProfile.nickname && editedProfile.nickname.length > 100) {
      setError('Nickname must be less than 100 characters')
      return
    }

    try {
      setLoading(true)
      await updateProfile({
        sessionToken,
        nickname: editedProfile.nickname || undefined,
        mobile_number: editedProfile.mobile_number || undefined
      })
      setSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const errorMessage = err.message || 'Failed to update profile'
      setError(errorMessage)
      console.error('Profile update error:', err)
    } finally {
      setLoading(false)
    }
  }, [editedProfile, sessionToken, updateProfile])

  const handleCancel = () => {
    setEditedProfile({
      nickname: user?.nickname || '',
      mobile_number: user?.mobile_number || ''
    })
    setIsEditing(false)
    setError(null)
    setSuccess(false)
  }

  if (!user || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-2xl transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-2xl font-bold">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {user.nickname || user.username}
                </h2>
                <p className="text-sm text-gray-400">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[var(--color-primary)]/20 flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-[var(--color-primary)]" />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-300">Profile updated successfully!</p>
              </div>
            )}

            {/* Role & Status */}
            <div className="flex gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${
                user.role === 'super_admin' ? 'bg-purple-500/20 border border-purple-500/50' :
                user.role === 'branch_admin' ? 'bg-blue-500/20 border border-blue-500/50' :
                user.role === 'staff' ? 'bg-green-500/20 border border-green-500/50' :
                user.role === 'barber' ? 'bg-yellow-500/20 border border-yellow-500/50' :
                'bg-gray-500/20 border border-gray-500/50'
              }`}>
                <Shield className="w-3 h-3 mr-1" />
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
              {user.is_active && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-green-500/20 border border-green-500/50">
                  Active
                </span>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--color-primary)]" />
                Contact
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A]/50">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm text-gray-300 font-mono">{user.email || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A]/50">
                  <p className="text-xs text-gray-500 mb-1">Mobile</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedProfile.mobile_number}
                      onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                      placeholder="09123456789"
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded px-2 py-1 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-300">{user.mobile_number || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-[#2A2A2A]/50" />

            {/* Personal Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--color-primary)]" />
                Personal
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A]/50">
                  <p className="text-xs text-gray-500 mb-1">Nickname</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.nickname}
                      onChange={(e) => handleInputChange('nickname', e.target.value)}
                      placeholder="Your preferred name"
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded px-2 py-1 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-300">{user.nickname || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-[#2A2A2A]/50" />

            {/* Account Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[var(--color-primary)]" />
                Account
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300 mb-1">ID</p>
                  <p className="text-xs font-mono text-gray-300 truncate" title={user._id}>
                    {user._id ? `${user._id.substring(0, 6)}...` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-300 mb-1">Status</p>
                  <p className="text-xs font-semibold text-green-300">
                    {user.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-300 mb-1">Verified</p>
                  <p className="text-xs font-semibold text-purple-300">
                    {user.isVerified ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A]/50">
            <button
              onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isEditing 
                  ? 'bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 hover:bg-[#555555]/70 disabled:opacity-50' 
                  : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50'
              }`}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit
                </>
              )}
            </button>
            
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ProfileModal
