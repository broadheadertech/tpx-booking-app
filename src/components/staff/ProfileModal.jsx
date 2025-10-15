import React, { useState } from 'react'
import Modal from '../common/Modal'
import { User, Mail, Phone, Calendar, MapPin, Briefcase, Shield, Edit, Save, X } from 'lucide-react'

const ProfileModal = ({ isOpen, onClose, user }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    nickname: user?.nickname || '',
    mobile_number: user?.mobile_number || '',
    address: user?.address || '',
    birthday: user?.birthday || ''
  })

  const handleInputChange = (field, value) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    // TODO: Save to backend via Convex mutation
    console.log('Saving profile:', editedProfile)
    setIsEditing(false)
    // In production, call Convex mutation here
  }

  const handleCancel = () => {
    setEditedProfile({
      nickname: user?.nickname || '',
      mobile_number: user?.mobile_number || '',
      address: user?.address || '',
      birthday: user?.birthday || ''
    })
    setIsEditing(false)
  }

  if (!user) return null

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="My Profile"
      size="lg"
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#1A1A1A]">
                {user.nickname || user.username}
              </h3>
              <p className="text-sm text-gray-600">@{user.username}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'branch_admin' ? 'bg-blue-100 text-blue-800' :
                  user.role === 'staff' ? 'bg-green-100 text-green-800' :
                  user.role === 'barber' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user.role.replace('_', ' ').toUpperCase()}
                </span>
                {user.is_active && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isEditing 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-[#FF8C42] text-white hover:bg-[#FF7A2B]'
            }`}
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </>
            )}
          </button>
        </div>

        {/* Profile Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center">
              <Mail className="h-5 w-5 text-[#FF8C42] mr-2" />
              Contact Information
            </h4>
            
            <div className="space-y-3">
              {/* Email (Read-only) */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900">{user.email || 'Not provided'}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">Cannot be changed</p>
              </div>

              {/* Mobile Number */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-xs text-gray-500 mb-1">Mobile Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.mobile_number}
                    onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                    placeholder="09123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-sm"
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{user.mobile_number || 'Not provided'}</p>
                  </div>
                )}
              </div>

              {/* Nickname */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-xs text-gray-500 mb-1">Nickname / Display Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    placeholder="Your preferred name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-sm"
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{user.nickname || 'Not set'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center">
              <User className="h-5 w-5 text-[#FF8C42] mr-2" />
              Personal Information
            </h4>
            
            <div className="space-y-3">
              {/* Username (Read-only) */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-xs text-gray-500 mb-1">Username</label>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 font-mono">{user.username}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">Cannot be changed</p>
              </div>

              {/* Birthday */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-xs text-gray-500 mb-1">Birthday</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedProfile.birthday}
                    onChange={(e) => handleInputChange('birthday', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-sm"
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">
                      {user.birthday ? new Date(user.birthday).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                {isEditing ? (
                  <textarea
                    value={editedProfile.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Your address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-sm resize-none"
                  />
                ) : (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <p className="text-sm font-medium text-gray-900">{user.address || 'Not provided'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center mb-4">
            <Briefcase className="h-5 w-5 text-[#FF8C42] mr-2" />
            Account Information
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <p className="text-xs text-blue-700 mb-1">Account ID</p>
              <p className="text-sm font-mono font-bold text-blue-900 truncate" title={user._id}>
                {user._id ? `${user._id.substring(0, 8)}...` : 'N/A'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <p className="text-xs text-green-700 mb-1">Account Status</p>
              <p className="text-sm font-bold text-green-900">
                {user.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <p className="text-xs text-purple-700 mb-1">Email Verified</p>
              <p className="text-sm font-bold text-purple-900">
                {user.isVerified ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-6 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF7A2B] transition-colors text-sm font-medium"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        )}

        {!isEditing && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ProfileModal
