import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, Star, Edit3, Save, X, Camera, Award, Clock, MapPin } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const BarberProfile = () => {
  const { user } = useAuth()
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

  if (!currentBarber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white flex items-center justify-center p-4">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Barber Profile Not Found</h2>
          <p className="text-gray-600">Please contact admin to set up your barber profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600 mt-1">Manage your professional profile and settings</p>
            </div>
            
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Avatar */}
            <div className="relative">
              {editForm.avatar ? (
                <img
                  src={editForm.avatar}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#FF8C42] flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-white text-xl font-bold">
                    {getInitials(editForm.full_name || user?.username || 'U')}
                  </span>
                </div>
              )}
              
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-2 bg-[#FF8C42] text-white rounded-full hover:bg-[#E67A1A] transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-[#FF8C42] focus:outline-none mb-2 w-full"
                  placeholder="Full Name"
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentBarber.full_name}</h2>
              )}
              
              <div className="flex items-center justify-center sm:justify-start space-x-4 text-gray-600 mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{currentBarber.rating}/5</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Award className="w-4 h-4" />
                  <span>{currentBarber.totalBookings} bookings</span>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Tell customers about yourself..."
                />
              ) : (
                <p className="text-gray-600">{user?.bio || 'No bio available'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-lg">{currentBarber.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-lg">{currentBarber.phone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Professional Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Experience
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="e.g., 5 years"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-lg">{currentBarber.experience}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Award className="w-4 h-4 inline mr-2" />
                Specialties
              </label>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                      placeholder="Add a specialty"
                      onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                    />
                    <button
                      onClick={addSpecialty}
                      className="px-4 py-3 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {editForm.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-[#FF8C42] text-white rounded-full text-sm"
                      >
                        {specialty}
                        <button
                          onClick={() => removeSpecialty(specialty)}
                          className="ml-2 hover:text-red-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentBarber.specialties?.length > 0 ? (
                    currentBarber.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-[#FF8C42] text-white rounded-full text-sm"
                      >
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No specialties listed</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Overview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">{currentBarber.rating}/5</div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">{currentBarber.totalBookings}</div>
              <div className="text-sm text-gray-600">Total Bookings</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                ₱{currentBarber.monthlyRevenue?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600">Monthly Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarberProfile