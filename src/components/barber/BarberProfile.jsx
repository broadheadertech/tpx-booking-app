import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, Star, Edit3, Save, X, Camera, Award, Clock, MapPin, LogOut, Image, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const BarberProfile = () => {
  const { user, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    experience: '',
    specialties: [],
    bio: '',
    avatar: ''
  })
  const [newSpecialty, setNewSpecialty] = useState('')

  // Get barber data
  const barbers = useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)
  
  // Debug logging
  useEffect(() => {
    console.log('BarberProfile Debug:', {
      user: user?._id,
      userRole: user?.role,
      barbersLoaded: barbers !== undefined,
      barbersCount: barbers?.length,
      currentBarber: currentBarber?._id,
      allBarberUsers: barbers?.map(b => b.user)
    })
  }, [user, barbers, currentBarber])

  // Get user profile data
  const updateUserProfile = useMutation(api.services.auth.updateUserProfile)
  const updateBarberMutation = useMutation(api.services.barbers.updateBarber)
  const createBarberProfile = useMutation(api.services.barbers.createBarberProfile)
  
  // Auto-create barber profile if user has barber role but no profile
  useEffect(() => {
    if (user?.role === 'barber' && barbers && !currentBarber && user._id) {
      console.log('Auto-creating barber profile for user:', user._id, 'branch:', user.branch_id)
      createBarberProfile({ 
        userId: user._id,
        branch_id: user.branch_id 
      })
        .then((barberId) => {
          console.log('Barber profile created successfully:', barberId)
        })
        .catch((error) => {
          console.error('Failed to create barber profile:', error)
          alert('Failed to create barber profile. Please contact admin.')
        })
    }
  }, [user, barbers, currentBarber, createBarberProfile])

  // Initialize form when barber data loads
  useEffect(() => {
    if (currentBarber && user) {
      setEditForm({
        full_name: currentBarber.full_name || '',
        email: currentBarber.email || user.email || '',
        phone: currentBarber.phone || user.mobile_number || '',
        experience: currentBarber.experience || '',
        specialties: currentBarber.specialties || [],
        bio: user.bio || '',
        avatar: user.avatar || ''
      })
    }
  }, [currentBarber, user])

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addSpecialty = () => {
    if (newSpecialty.trim() && !editForm.specialties.includes(newSpecialty.trim())) {
      setEditForm(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }))
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (specialty) => {
    setEditForm(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      console.log('Saving profile...', editForm)
      
      // Update user profile (bio and avatar)
      const sessionToken = localStorage.getItem('session_token')
      if (sessionToken) {
        console.log('Updating user profile...')
        await updateUserProfile({
          sessionToken,
          bio: editForm.bio,
          avatar: editForm.avatar
        })
      }
      
      // Update barber profile (barber-specific fields)
      if (currentBarber?._id) {
        console.log('Updating barber profile...')
        await updateBarberMutation({
          id: currentBarber._id,
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone,
          experience: editForm.experience,
          specialties: editForm.specialties,
          avatar: editForm.avatar
        })
      }
      
      console.log('Profile updated successfully!')
      setIsEditing(false)
      setShowSuccessModal(true)
      
      // Auto-close success modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to update profile:', error)
      setErrorMessage(error.message || 'Failed to update profile. Please try again.')
      setShowErrorModal(true)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form to original values
    if (currentBarber && user) {
      setEditForm({
        full_name: currentBarber.full_name || '',
        email: currentBarber.email || user.email || '',
        phone: currentBarber.phone || user.mobile_number || '',
        experience: currentBarber.experience || '',
        specialties: currentBarber.specialties || [],
        bio: user.bio || '',
        avatar: user.avatar || ''
      })
    }
    setIsEditing(false)
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await logout()
        // Use window.location for a hard redirect to ensure clean state
        window.location.href = '/auth/login'
      } catch (error) {
        console.error('Logout error:', error)
        // Even if there's an error, redirect to login
        window.location.href = '/auth/login'
      }
    }
  }

  // Show loading state while data is being fetched
  if (barbers === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Only show "not found" if data has loaded but no barber profile exists
  if (!currentBarber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-400">Setting up your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] pb-20 md:pb-0">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(/img/pnglog.png)`,
            filter: 'brightness(0.3)'
          }}
        ></div>
      </div>
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-bold text-white">My Profile</h1>
                  <div className="bg-[var(--color-primary)]/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-[var(--color-primary)]/30">
                    <span className="text-xs font-semibold text-[var(--color-primary)]">Barber</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-[var(--color-primary)]">Professional Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-white rounded-xl hover:bg-white/10 transition-all duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-red-400 rounded-xl hover:bg-red-500/10 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`p-2 rounded-xl transition-all duration-200 ${
                      isSaving 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-green-400 hover:bg-green-500/10'
                    }`}
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="p-2 text-gray-400 rounded-xl hover:bg-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl p-5 border border-[#555555]/30 shadow-lg mb-4">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="relative">
              {editForm.avatar ? (
                <img
                  src={editForm.avatar}
                  alt="Profile"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-[var(--color-primary)]/50 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">
                    {getInitials(editForm.full_name || user?.username || 'U')}
                  </span>
                </div>
              )}
              
              {isEditing && (
                <button className="absolute -bottom-1 -right-1 p-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[#E67A1A] transition-colors shadow-lg">
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="text-lg font-bold text-white bg-transparent border-b border-[var(--color-primary)]/50 focus:outline-none focus:border-[var(--color-primary)] mb-2 w-full"
                  placeholder="Full Name"
                />
              ) : (
                <h2 className="text-lg font-bold text-white mb-1">{currentBarber.full_name}</h2>
              )}
              
              <div className="flex items-center space-x-3 text-sm text-gray-400 mb-2">
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span>{currentBarber.rating}/5</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Award className="w-3 h-3 text-[var(--color-primary)]" />
                  <span>{currentBarber.totalBookings} bookings</span>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="w-full p-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] resize-none text-white text-sm"
                  rows="2"
                  placeholder="Tell customers about yourself..."
                />
              ) : (
                <p className="text-gray-400 text-sm">{user?.bio || 'No bio available'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl p-4 border border-[#555555]/30 shadow-lg mb-4">
          <h3 className="text-base font-bold text-white mb-3 flex items-center">
            <Mail className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Contact Information
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-white text-sm"
                />
              ) : (
                <p className="px-3 py-2 bg-[#2A2A2A]/50 rounded-lg text-white text-sm">{currentBarber.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-white text-sm"
                />
              ) : (
                <p className="px-3 py-2 bg-[#2A2A2A]/50 rounded-lg text-white text-sm">{currentBarber.phone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl p-4 border border-[#555555]/30 shadow-lg mb-4">
          <h3 className="text-base font-bold text-white mb-3 flex items-center">
            <Award className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Professional Information
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Experience
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-white text-sm"
                  placeholder="e.g., 5 years"
                />
              ) : (
                <p className="px-3 py-2 bg-[#2A2A2A]/50 rounded-lg text-white text-sm">{currentBarber.experience}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Specialties
              </label>
              
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-white text-sm"
                      placeholder="Add a specialty"
                      onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                    />
                    <button
                      onClick={addSpecialty}
                      className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[#E67A1A] transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {editForm.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-[var(--color-primary)] text-white rounded-lg text-xs"
                      >
                        {specialty}
                        <button
                          onClick={() => removeSpecialty(specialty)}
                          className="ml-1 hover:text-red-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {currentBarber.specialties?.length > 0 ? (
                    currentBarber.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-[var(--color-primary)] text-white rounded-lg text-xs"
                      >
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No specialties listed</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl p-4 border border-[#555555]/30 shadow-lg">
          <h3 className="text-base font-bold text-white mb-3 flex items-center">
            <Star className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Performance Overview
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border border-green-500/30">
              <div className="text-lg font-bold text-green-400 mb-1">{currentBarber.rating}/5</div>
              <div className="text-xs text-gray-400">Rating</div>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
              <div className="text-lg font-bold text-blue-400 mb-1">{currentBarber.totalBookings}</div>
              <div className="text-xs text-gray-400">Bookings</div>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 rounded-xl border border-[var(--color-primary)]/30">
              <div className="text-lg font-bold text-[var(--color-primary)] mb-1">
                ₱{currentBarber.monthlyRevenue?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-400">Revenue</div>
            </div>
          </div>
        </div>

        {/* Portfolio Section */}
        <div className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl p-4 border border-[#555555]/30 shadow-lg mt-4">
          <h3 className="text-base font-bold text-white mb-3 flex items-center">
            <Image className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
            Portfolio
          </h3>
          <p className="text-xs text-gray-400 mb-3">Showcase your best work to attract more customers</p>

          {currentBarber.portfolio && currentBarber.portfolio.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {currentBarber.portfolio.map((image, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img
                    src={image.url}
                    alt={image.caption || `Portfolio ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {isEditing && (
                    <button
                      onClick={() => {/* Handle delete portfolio image */}}
                      className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  )}
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white truncate">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
              {isEditing && (
                <button className="aspect-square rounded-lg border-2 border-dashed border-[#555555] flex flex-col items-center justify-center text-gray-500 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors">
                  <Plus className="w-6 h-6 mb-1" />
                  <span className="text-xs">Add Photo</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#2A2A2A] rounded-full flex items-center justify-center mx-auto mb-3">
                <Image className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm mb-2">No portfolio images yet</p>
              <p className="text-gray-500 text-xs mb-3">Add photos of your best haircuts to showcase your skills</p>
              {isEditing && (
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[#E67A1A] transition-colors text-sm">
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add First Photo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 max-w-sm w-full border border-green-500/30 shadow-2xl animate-[slideIn_0.3s_ease-out]">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Profile Updated!</h3>
              <p className="text-gray-400 text-sm">Your profile has been successfully updated.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 max-w-sm w-full border border-red-500/30 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Update Failed</h3>
              <p className="text-gray-400 text-sm mb-4">{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BarberProfile