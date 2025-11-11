import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User, Mail, Phone, Scissors, Camera, Upload, X, Clock, ChevronDown, ChevronUp } from 'lucide-react'
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
    avatar: '',
    avatarStorageId: undefined,
    schedule: {
      monday: { available: true, start: '09:00', end: '22:00' },
      tuesday: { available: true, start: '09:00', end: '22:00' },
      wednesday: { available: true, start: '09:00', end: '22:00' },
      thursday: { available: true, start: '09:00', end: '22:00' },
      friday: { available: true, start: '09:00', end: '22:00' },
      saturday: { available: true, start: '09:00', end: '22:00' },
      sunday: { available: false, start: '09:00', end: '22:00' }
    }
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
        avatar: editingBarber.avatar || '',
        avatarStorageId: editingBarber.avatarStorageId || undefined,
        schedule: editingBarber.schedule || {
          monday: { available: true, start: '09:00', end: '17:00' },
          tuesday: { available: true, start: '09:00', end: '17:00' },
          wednesday: { available: true, start: '09:00', end: '17:00' },
          thursday: { available: true, start: '09:00', end: '17:00' },
          friday: { available: true, start: '09:00', end: '17:00' },
          saturday: { available: true, start: '09:00', end: '17:00' },
          sunday: { available: false, start: '09:00', end: '17:00' }
        }
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
        avatar: '',
        avatarStorageId: undefined,
        schedule: {
          monday: { available: true, start: '09:00', end: '17:00' },
          tuesday: { available: true, start: '09:00', end: '17:00' },
          wednesday: { available: true, start: '09:00', end: '17:00' },
          thursday: { available: true, start: '09:00', end: '17:00' },
          friday: { available: true, start: '09:00', end: '17:00' },
          saturday: { available: true, start: '09:00', end: '17:00' },
          sunday: { available: false, start: '09:00', end: '17:00' }
        }
      })
    }
  }, [editingBarber])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

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

  const handleScheduleChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value
        }
      }
    }))
  }

  const handleSetAllDays = (available, start = '09:00', end = '22:00') => {
    const newSchedule = {}
    Object.keys(formData.schedule).forEach(day => {
      newSchedule[day] = { available, start, end }
    })
    setFormData(prev => ({ ...prev, schedule: newSchedule }))
  }

  const generateTimeOptions = () => {
    const times = []
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        // Convert to 12-hour format
        const period = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
        
        times.push({ value: time24, label: time12 })
      }
    }
    return times
  }

  const formatTimeTo12Hour = (time24) => {
    const [hour, minute] = time24.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
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
    setSuccess('')

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
          avatar: formData.avatar || '',
          avatarStorageId: formData.avatarStorageId || undefined,
          schedule: formData.schedule
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
        if (!user?.branch_id) {
          setError('Branch ID is required. Please contact your administrator.')
          setLoading(false)
          return
        }

        const barberData = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          mobile_number: formData.mobile_number.trim(),
          full_name: formData.full_name.trim(),
          phone: formData.mobile_number.trim(), // Use mobile_number as phone for new barbers
          is_active: formData.is_active,
          services: formData.services,
          branch_id: user.branch_id,
          experience: formData.experience || '0 years',
          avatar: formData.avatar || '',
          avatarStorageId: formData.avatarStorageId || undefined,
          schedule: formData.schedule
        }

        await createBarberWithAccount(barberData)
      }

      // Show success message
      setSuccess(editingBarber ? 'Barber updated successfully!' : 'Barber created successfully!')
      
      // Call parent success handler
      if (onSubmit) {
        onSubmit()
      }
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
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
          avatar: '',
          avatarStorageId: undefined,
          schedule: {
            monday: { available: true, start: '09:00', end: '17:00' },
            tuesday: { available: true, start: '09:00', end: '17:00' },
            wednesday: { available: true, start: '09:00', end: '17:00' },
            thursday: { available: true, start: '09:00', end: '17:00' },
            friday: { available: true, start: '09:00', end: '17:00' },
            saturday: { available: true, start: '09:00', end: '17:00' },
            sunday: { available: false, start: '09:00', end: '17:00' }
          }
        })
        setSuccess('')
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error saving barber:', err)
      
      // Parse Convex error format
      let errorMessage = 'Failed to save barber'
      
      if (err.message) {
        try {
          // Try to parse if it's a JSON string
          const parsedError = JSON.parse(err.message)
          if (parsedError.message) {
            errorMessage = parsedError.message
            // Add details if available
            if (parsedError.details) {
              errorMessage += ` ${parsedError.details}`
            }
            // Add suggested action if available
            if (parsedError.action) {
              errorMessage += ` ${parsedError.action}`
            }
          }
        } catch {
          // If not JSON, use the message as-is
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
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
      avatar: '',
      avatarStorageId: undefined,
      schedule: {
        monday: { available: true, start: '09:00', end: '17:00' },
        tuesday: { available: true, start: '09:00', end: '17:00' },
        wednesday: { available: true, start: '09:00', end: '17:00' },
        thursday: { available: true, start: '09:00', end: '17:00' },
        friday: { available: true, start: '09:00', end: '17:00' },
        saturday: { available: true, start: '09:00', end: '17:00' },
        sunday: { available: false, start: '09:00', end: '17:00' }
      }
    })
    setError('')
    setExpandedDay(null)
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
        <div className="relative w-full max-w-5xl max-h-[95vh] transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 shadow-2xl transition-all z-[10000] my-4">
          <div className="flex items-center justify-between p-4 border-b border-[#444444]/50">
            <h2 className="text-lg font-bold text-white">{editingBarber ? 'Edit Barber' : 'Create New Barber'}</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
            </button>
          </div>
          <div className="max-h-[calc(95vh-120px)] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              {/* Success Message */}
              {success && (
                <div className="bg-green-500/10 border-l-4 border-green-500 px-4 py-3 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-400 font-medium">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border-l-4 border-red-500 px-4 py-3 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-400 font-medium">{error}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="ml-auto flex-shrink-0 text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
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

            {/* Work Schedule */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-300 font-medium text-sm flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-[#FF8C42]" />
                  Work Schedule
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllDays(true, '09:00', '22:00')}
                    className="px-2 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
                  >
                    All On
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllDays(false)}
                    className="px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                  >
                    All Off
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border border-[#444444] rounded-lg p-2 bg-[#1A1A1A] space-y-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const daySchedule = formData.schedule[day]
                  const isExpanded = expandedDay === day
                  const timeOptions = generateTimeOptions()

                  return (
                    <div
                      key={day}
                      className={`bg-[#2A2A2A] border rounded-lg overflow-hidden transition-all ${
                        daySchedule.available ? 'border-green-500/30' : 'border-[#444444]'
                      }`}
                    >
                      <div className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="checkbox"
                              checked={daySchedule.available}
                              onChange={(e) => handleScheduleChange(day, 'available', e.target.checked)}
                              className="h-4 w-4 text-[#FF8C42] focus:ring-[#FF8C42] rounded"
                            />
                            <span className="text-sm capitalize font-medium text-white">
                              {day}
                            </span>
                            {!isExpanded && daySchedule.available && (
                              <span className="text-xs text-gray-400 ml-2">
                                {formatTimeTo12Hour(daySchedule.start)} – {formatTimeTo12Hour(daySchedule.end)}
                              </span>
                            )}
                          </div>
                          
                          {daySchedule.available && (
                            <button
                              type="button"
                              onClick={() => setExpandedDay(isExpanded ? null : day)}
                              className="p-1 hover:bg-[#333333] rounded transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                            </button>
                          )}
                        </div>

                        {isExpanded && daySchedule.available && (
                          <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-[#444444]">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Start</label>
                              <select
                                value={daySchedule.start}
                                onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                                className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#444444] text-white rounded text-xs focus:ring-1 focus:ring-[#FF8C42]"
                              >
                                {timeOptions.map(time => (
                                  <option key={time.value} value={time.value}>{time.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">End</label>
                              <select
                                value={daySchedule.end}
                                onChange={(e) => handleScheduleChange(day, 'end', e.target.value)}
                                className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#444444] text-white rounded text-xs focus:ring-1 focus:ring-[#FF8C42]"
                              >
                                {timeOptions.map(time => (
                                  <option key={time.value} value={time.value}>{time.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Set the days and hours when this barber is available for bookings
              </p>
            </div>
          </div>
        </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-6 mt-6 border-t border-[#444444]/50">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 bg-[#444444]/50 border border-[#555555] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#555555]/70 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !services}
                    className="flex-1 px-4 py-2.5 bg-[#FF8C42] text-white rounded-lg text-sm font-medium hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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