import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, Star, Edit3, Save, X, Camera, Award, Clock, MapPin, LogOut } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const BarberProfile = () => {
  const { user, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
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

  // Get user profile data
  const updateUserProfile = useMutation(api.services.auth.updateUserProfile)
  const createBarberProfile = useMutation(api.services.barbers.createBarberProfile)
  
  // Auto-create barber profile if user has barber role but no profile
  useEffect(() => {
    if (user?.role === 'barber' && barbers && !currentBarber && user._id) {
      createBarberProfile({ userId: user._id })
        .catch((error) => {
          console.error('Failed to create barber profile:', error)
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
    try {
      // Update user profile
      const sessionToken = localStorage.getItem('sessionToken')
      if (sessionToken) {
        await updateUserProfile({
          sessionToken,
          bio: editForm.bio,
          avatar: editForm.avatar
        })
      }
      
      // Note: In a real implementation, you'd also update the barber record
      // This would require a separate mutation for barber-specific fields
      
      setIsEditing(false)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
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

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
    }
  }

  if (!currentBarber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Barber Profile Not Found</h2>
          <p className="text-gray-400">Please contact admin to set up your barber profile.</p>
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-bold text-white">My Profile</h1>
                  <div className="bg-[#FF8C42]/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-[#FF8C42]/30">
                    <span className="text-xs font-semibold text-[#FF8C42]">Barber</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-[#FF8C42]">Professional Dashboard</p>
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
                    className="p-2 text-green-400 rounded-xl hover:bg-green-500/10 transition-all duration-200"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-2 text-gray-400 rounded-xl hover:bg-white/10 transition-all duration-200"
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
                  className="w-16 h-16 rounded-xl object-cover border-2 border-[#FF8C42]/50 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">
                    {getInitials(editForm.full_name || user?.username || 'U')}
                  </span>
                </div>
              )}
              
              {isEditing && (
                <button className="absolute -bottom-1 -right-1 p-1.5 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors shadow-lg">
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
                  className="text-lg font-bold text-white bg-transparent border-b border-[#FF8C42]/50 focus:outline-none focus:border-[#FF8C42] mb-2 w-full"
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
                  <Award className="w-3 h-3 text-[#FF8C42]" />
                  <span>{currentBarber.totalBookings} bookings</span>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="w-full p-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[#FF8C42] focus:border-[#FF8C42] resize-none text-white text-sm"
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
            <Mail className="w-4 h-4 mr-2 text-[#FF8C42]" />
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
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-white text-sm"
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
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-white text-sm"
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
            <Award className="w-4 h-4 mr-2 text-[#FF8C42]" />
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
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-white text-sm"
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
                      className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-[#555555] rounded-lg focus:ring-1 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-white text-sm"
                      placeholder="Add a specialty"
                      onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                    />
                    <button
                      onClick={addSpecialty}
                      className="px-3 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {editForm.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-[#FF8C42] text-white rounded-lg text-xs"
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
                        className="inline-flex items-center px-2 py-1 bg-[#FF8C42] text-white rounded-lg text-xs"
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
            <Star className="w-4 h-4 mr-2 text-[#FF8C42]" />
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
            
            <div className="text-center p-3 bg-gradient-to-br from-[#FF8C42]/20 to-[#FF7A2B]/20 rounded-xl border border-[#FF8C42]/30">
              <div className="text-lg font-bold text-[#FF8C42] mb-1">
                ₱{currentBarber.monthlyRevenue?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-400">Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarberProfile