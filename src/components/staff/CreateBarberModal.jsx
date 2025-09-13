import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User, Mail, Phone, Scissors, Camera, Upload, X } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

const CreateBarberModal = ({ isOpen, onClose, onSubmit, editingBarber = null }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    newPassword: '', // For password updates when editing
    mobile_number: '',
    full_name: '',
    phone: '',
    is_active: true,
    services: [],
    experience: '0 years',
    specialties: [],
    avatar: '',
    avatarStorageId: undefined
  })

  // Update form data when editingBarber changes
  useEffect(() => {
    if (editingBarber) {
      setFormData({
        username: '', // Don't populate username for editing
        email: editingBarber.email || '',
        password: '', // Don't populate password for editing
        newPassword: '', // Always start empty for password updates
        mobile_number: editingBarber.phone || '',
        full_name: editingBarber.full_name || '',
        phone: editingBarber.phone || '',
        is_active: editingBarber.is_active ?? true,
        services: editingBarber.services || [],
        experience: editingBarber.experience || '0 years',
        specialties: editingBarber.specialties || [],
        avatar: editingBarber.avatar || '',
        avatarStorageId: editingBarber.avatarStorageId || undefined
      })
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        newPassword: '',
        mobile_number: '',
        full_name: '',
        phone: '',
        is_active: true,
        services: [],
        experience: '0 years',
        specialties: [],
        avatar: '',
        avatarStorageId: undefined
      })
    }
  }, [editingBarber])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Convex queries and mutations
  const services = useQuery(api.services.services.getAllServices)
  const createBarber = useMutation(api.services.barbers.createBarber)
  const createBarberWithAccount = useMutation(api.services.barbers.createBarberWithAccount)
  const updateBarber = useMutation(api.services.barbers.updateBarber)
  const updateBarberPassword = useMutation(api.services.barbers.updateBarberPassword)
  const generateUploadUrl = useMutation(api.services.barbers.generateUploadUrl)

  // Get image URL for preview
  const avatarUrl = useQuery(api.services.barbers.getImageUrl, {
    storageId: formData.avatarStorageId
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Image upload function using Convex storage
  const handleImageUpload = async (file) => {
    setUploadingImage(true)
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl()

      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!result.ok) {
        throw new Error('Failed to upload image')
      }

      const { storageId } = await result.json()
      return storageId
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    try {
      const storageId = await handleImageUpload(file)
      handleInputChange('avatarStorageId', storageId)
      setError('') // Clear any previous error
    } catch (error) {
      setError('Failed to upload image. Please try again.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (editingBarber) {
      // For editing, only validate basic fields
      if (!formData.full_name.trim() || !formData.email.trim()) {
        setError('Full name and email are required')
        return
      }
    } else {
      // For creating new barber, validate all required fields
      if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim() || 
          !formData.mobile_number.trim() || !formData.full_name.trim()) {
        setError('Username, email, password, mobile number, and full name are required')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      if (editingBarber) {
        // Update existing barber
        if (!user?.id) {
          setError('You must be logged in to update a barber')
          return
        }

        const barberData = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone || '',
          is_active: formData.is_active,
          services: formData.services,
          experience: formData.experience || '0 years',
          specialties: formData.specialties,
          avatar: formData.avatar || '',
          avatarStorageId: formData.avatarStorageId || undefined
        }

        // Update barber profile
        await updateBarber({ id: editingBarber._id, ...barberData })

        // Update password if provided
        if (formData.newPassword && formData.newPassword.trim()) {
          await updateBarberPassword({
            barberId: editingBarber._id,
            newPassword: formData.newPassword.trim()
          })
        }
      } else {
        // Create new barber with account
        const barberData = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          mobile_number: formData.mobile_number.trim(),
          full_name: formData.full_name.trim(),
          phone: formData.mobile_number.trim(), // Use mobile_number as phone for new barbers
          is_active: formData.is_active,
          services: formData.services,
          experience: formData.experience || '0 years',
          specialties: formData.specialties,
          avatar: formData.avatar || '',
          avatarStorageId: formData.avatarStorageId || undefined
        }

        await createBarberWithAccount(barberData)
      }

      // Call parent success handler
      if (onSubmit) {
        onSubmit()
      }
      
      // Reset form and close modal
      setFormData({
        username: '',
        email: '',
        password: '',
        newPassword: '',
        mobile_number: '',
        full_name: '',
        phone: '',
        is_active: true,
        services: [],
        experience: '0 years',
        specialties: [],
        avatar: '',
        avatarStorageId: undefined
      })
      onClose()
    } catch (err) {
      console.error('Error saving barber:', err)
      setError(err.message || 'Failed to save barber')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      newPassword: '',
      mobile_number: '',
      full_name: '',
      phone: '',
      is_active: true,
      services: [],
      experience: '0 years',
      specialties: [],
      avatar: '',
      avatarStorageId: undefined
    })
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
        <div className="relative w-full max-w-2xl transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 shadow-2xl transition-all z-[10000]">
          <div className="flex items-center justify-between p-4 border-b border-[#444444]/50">
            <h2 className="text-lg font-bold text-white">{editingBarber ? 'Edit Barber' : 'Create New Barber'}</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
            </button>
          </div>
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Loading State */}
              {!services && (
                <LoadingSpinner size="sm" message="Loading services..." className="py-3" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center">
                    <User className="w-4 h-4 mr-2 text-[#FF8C42]" />
                    {editingBarber ? 'Personal Info' : 'Account & Personal Info'}
                  </h3>

            {!editingBarber && (
              <>
                <div>
                  <label className="block text-gray-300 font-medium text-sm mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Enter username for login"
                    required
                    className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium text-sm mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter password for login"
                    required
                    className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium text-sm mb-2">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.mobile_number}
                      onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                      placeholder="+63 XXX XXX XXXX"
                      required
                      className="w-full h-9 pl-9 pr-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-gray-300 font-medium text-sm mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter barber's full name"
                required
                className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium text-sm mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="barber@example.com"
                  required
                  className="w-full h-9 pl-9 pr-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {editingBarber && (
              <div>
                <label className="block text-gray-300 font-medium text-sm mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+63 XXX XXX XXXX"
                    className="w-full h-9 pl-9 pr-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {editingBarber && (
              <div>
                <label className="block text-gray-300 font-medium text-sm mb-2">
                  Update Password (Optional)
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Enter new password (leave empty to keep current)"
                  className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave empty to keep the current password unchanged
                </p>
              </div>
            )}

            <div>
              <label className="block text-gray-300 font-medium text-sm mb-2">
                Experience
              </label>
              <input
                type="text"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="e.g., 5 years"
                className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-medium text-sm mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[#444444] overflow-hidden bg-[#1A1A1A]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Barber avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : formData.avatar ? (
                      <img
                        src={formData.avatar}
                        alt="Barber avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src="/img/avatar_default.jpg"
                        alt="Default avatar"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                      <LoadingSpinner size="xs" variant="white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="flex items-center justify-center px-3 py-2 border border-[#FF8C42] text-[#FF8C42] rounded-lg hover:bg-[#FF8C42] hover:text-white transition-colors cursor-pointer">
                    <Camera className="w-4 h-4 mr-2" />
                    <span className="text-xs font-medium">
                      {formData.avatarStorageId || formData.avatar ? 'Change Photo' : 'Upload Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Max 5MB. JPG, PNG, or GIF files only.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 font-medium text-sm mb-2">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === true}
                    onChange={() => handleInputChange('is_active', true)}
                    className="h-4 w-4 text-[#FF8C42] focus:ring-[#FF8C42] border-gray-300"
                  />
                  <span className="ml-2 text-gray-300 font-medium">Active</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === false}
                    onChange={() => handleInputChange('is_active', false)}
                    className="h-4 w-4 text-[#FF8C42] focus:ring-[#FF8C42] border-gray-300"
                  />
                  <span className="ml-2 text-gray-300 font-medium">Inactive</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center">
              <Scissors className="w-4 h-4 mr-2 text-[#FF8C42]" />
              Services & Skills
            </h3>

            <div>
              <label className="block text-gray-300 font-medium text-sm mb-2">
                Services Offered
              </label>
              <div className="max-h-32 overflow-y-auto border border-[#444444] rounded-lg p-3 bg-[#1A1A1A]">
                {!services ? (
                  <p className="text-sm text-gray-400 p-2">Loading services...</p>
                ) : services.length > 0 ? (
                  services.map(service => (
                    <label key={service._id} className="flex items-center py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service._id)}
                        onChange={(e) => {
                          const serviceId = service._id
                          setFormData(prev => ({
                            ...prev,
                            services: e.target.checked 
                              ? [...prev.services, serviceId]
                              : prev.services.filter(id => id !== serviceId)
                          }))
                        }}
                        className="h-4 w-4 text-[#FF8C42] focus:ring-[#FF8C42] rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-300">
                        {service.name} - ₱{parseFloat(service.price).toFixed(2)}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 p-2">No services available</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-300 font-medium text-sm mb-2">
                Specialties (comma-separated)
              </label>
              <textarea
                value={formData.specialties.join(', ')}
                onChange={(e) => {
                  const specialties = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  handleInputChange('specialties', specialties)
                }}
                placeholder="e.g., Fade cuts, Beard styling, Hair coloring"
                rows={3}
                className="w-full px-3 py-2 border border-[#444444] rounded-lg text-sm bg-[#1A1A1A] text-white focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent transition-all duration-200 resize-none"
              />
            </div>

            {/* Barber Preview */}
            <div className="bg-gradient-to-br from-[#FF8C42]/5 to-[#FF7A2B]/5 border-2 border-[#FF8C42]/20 rounded-xl p-4">
              <h4 className="text-gray-200 font-medium text-sm mb-2 uppercase tracking-wide">Barber Preview</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Name:</span>
                  <span className="text-gray-200 font-medium text-sm">{formData.full_name || 'Barber Name'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Email:</span>
                  <span className="text-gray-200 font-medium text-sm">{formData.email || 'email@example.com'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Experience:</span>
                  <span className="text-gray-200 font-medium text-sm">{formData.experience}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Services:</span>
                  <span className="text-[#FF8C42] font-bold text-sm">{formData.services.length} selected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Status:</span>
                  <span className={`font-bold text-sm ${
                    formData.is_active ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-[#444444]/50">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-3 py-2 bg-[#444444]/50 border border-[#555555] text-gray-300 rounded-lg text-sm hover:bg-[#555555]/70 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !services}
                    className="flex-1 px-3 py-2 bg-[#FF8C42] text-white rounded-lg text-sm hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : (editingBarber ? 'Update Barber' : 'Create Barber')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
}

export default CreateBarberModal