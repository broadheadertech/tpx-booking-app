import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User, Mail, Phone, Scissors, Camera, Upload, X, Clock, ChevronDown, ChevronUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import LoadingSpinner from '../common/LoadingSpinner'
import ErrorDisplay from '../common/ErrorDisplay'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { parseError } from '../../utils/errorHandler'

const CreateBarberModal = ({ isOpen, onClose, onSubmit, editingBarber = null, services = [] }) => {
  const { user } = useCurrentUser()

  // Track if form has been initialized to prevent resetting on services refetch
  const [formInitialized, setFormInitialized] = useState(false)
  const [lastEditingBarberId, setLastEditingBarberId] = useState(null)

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    newPassword: '', // For password updates when editing
    mobile_number: '',
    full_name: '',
    phone: '',
    is_active: true,
    custom_booking_enabled: false, // Custom booking process toggle
    services: [],
    experience: '0 years',
    avatar: '',
    avatarStorageId: undefined,
    schedule_type: 'weekly',
    specific_dates: [],
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

  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Reset form initialization when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormInitialized(false)
      setLastEditingBarberId(null)
    }
  }, [isOpen])

  // Update form data when editingBarber changes - only run once per barber
  useEffect(() => {
    // Skip if services are not loaded yet
    if (!services || services.length === 0) return

    // Check if we're editing a different barber or creating new
    const currentBarberId = editingBarber?._id || null
    const isNewBarber = currentBarberId !== lastEditingBarberId

    // Only initialize form if it's a new barber or not yet initialized
    if (!isNewBarber && formInitialized) return

    if (editingBarber) {
      // Keep all existing services from the barber - don't filter them out
      // Only filter if we have a valid services list to check against
      const availableServiceIds = services.map(s => s._id)
      const barberServices = editingBarber.services || []

      // Keep services that exist in the current services list
      // If a service ID doesn't exist, it might have been deleted, so we exclude it
      const validServices = barberServices.filter(id => availableServiceIds.includes(id))

      setFormData({
        username: '', // Don't populate username for editing
        email: editingBarber.email || '',
        password: '', // Don't populate password for editing
        newPassword: '', // Always start empty for password updates
        mobile_number: editingBarber.phone || '',
        full_name: editingBarber.full_name || '',
        phone: editingBarber.phone || '',
        is_active: editingBarber.is_active ?? true,
        custom_booking_enabled: editingBarber.custom_booking_enabled ?? false,
        services: validServices,
        experience: editingBarber.experience || '0 years',
        avatar: editingBarber.avatar || '',
        avatarStorageId: editingBarber.avatarStorageId || undefined,
        schedule_type: editingBarber.schedule_type || 'weekly',
        specific_dates: editingBarber.specific_dates || [],
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
        custom_booking_enabled: false,
        services: [],
        experience: '0 years',
        avatar: '',
        avatarStorageId: undefined,
        schedule_type: 'weekly',
        specific_dates: [],
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

    setFormInitialized(true)
    setLastEditingBarberId(currentBarberId)
  }, [editingBarber, services, formInitialized, lastEditingBarberId])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  // Convex queries and mutations
  // Remove separate services query since it's passed as prop
  // const services = useQuery(api.services.services.getAllServices)
  const createBarber = useMutation(api.services.barbers.createBarber)
  const createBarberWithAccount = useAction(api.services.barbers.createBarberWithClerk)
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

  const toggleScheduleType = (type) => {
    setFormData(prev => ({ ...prev, schedule_type: type }))
  }

  const handleDateClick = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existingDateIndex = formData.specific_dates.findIndex(d => d.date === dateStr)

    if (existingDateIndex >= 0) {
      // Remove date
      setFormData(prev => ({
        ...prev,
        specific_dates: prev.specific_dates.filter(d => d.date !== dateStr)
      }))
    } else {
      // Add date with default hours
      setFormData(prev => ({
        ...prev,
        specific_dates: [...prev.specific_dates, {
          date: dateStr,
          available: true,
          start: '09:00',
          end: '22:00'
        }]
      }))
    }
  }

  const handleSpecificDateChange = (dateStr, field, value) => {
    setFormData(prev => ({
      ...prev,
      specific_dates: prev.specific_dates.map(d =>
        d.date === dateStr ? { ...d, [field]: value } : d
      )
    }))
  }

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

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
        if (!user?._id && !user?.id) {
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
          schedule: formData.schedule,
          schedule_type: formData.schedule_type,
          specific_dates: formData.specific_dates,
          custom_booking_enabled: formData.custom_booking_enabled
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
          schedule: formData.schedule,
          schedule_type: formData.schedule_type,
          specific_dates: formData.specific_dates,
          custom_booking_enabled: formData.custom_booking_enabled
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
      // Don't log raw error to avoid confusing stack traces in console
      // console.error('Error saving barber:', err)
      const parsedError = parseError(err)
      setError(parsedError)
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
      schedule_type: 'weekly',
      specific_dates: [],
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
    setFormInitialized(false)
    setLastEditingBarberId(null)
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
              className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[var(--color-primary)]/20 flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-[var(--color-primary)]" />
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
                <div className="mb-4">
                  <ErrorDisplay 
                    error={error}
                    onClose={() => setError('')}
                  />
                </div>
              )}

              {/* Loading State */}
              {!services && (
                <LoadingSpinner size="sm" message="Loading services..." className="py-3" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center">
                    <User className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
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
                          className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200"
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
                          className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200"
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
                            className="w-full h-9 pl-9 pr-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200"
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
                      className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200"
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
                        className="w-full h-9 pl-9 pr-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200"
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
                          className="w-full h-9 pl-9 pr-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200"
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
                        className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200"
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
                      className="w-full h-9 px-3 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200"
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
                        <label className="flex items-center justify-center px-3 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors cursor-pointer">
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
                          className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300"
                        />
                        <span className="ml-2 text-gray-300 font-medium">Active</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="is_active"
                          checked={formData.is_active === false}
                          onChange={() => handleInputChange('is_active', false)}
                          className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300"
                        />
                        <span className="ml-2 text-gray-300 font-medium">Inactive</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Booking Toggle */}
                  <div>
                    <label className="block text-gray-300 font-medium text-sm mb-2">
                      Booking Process
                    </label>
                    <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-[#444444]">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-gray-200 font-medium">Custom Booking Form</span>
                          {formData.custom_booking_enabled && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full">
                              Enabled
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.custom_booking_enabled
                            ? 'Customers will fill out a custom form instead of the regular booking flow'
                            : 'Enable to use a customizable booking form for this barber'
                          }
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInputChange('custom_booking_enabled', !formData.custom_booking_enabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[#1A1A1A] ${
                          formData.custom_booking_enabled ? 'bg-[var(--color-primary)]' : 'bg-[#444444]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.custom_booking_enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center">
                    <Scissors className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
                    Services & Skills
                  </h3>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-gray-300 font-medium text-sm">
                        Services Offered
                      </label>
                      {services && services.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {formData.services?.length || 0} of {services.length} selected
                        </span>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-[#444444] rounded-xl bg-[#1A1A1A] divide-y divide-[#333333]">
                      {!services ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-[var(--color-primary)] border-t-transparent mr-2"></div>
                          <span className="text-sm text-gray-400">Loading services...</span>
                        </div>
                      ) : services && services.length > 0 ? (
                        services.map(service => {
                          const isSelected = formData.services?.includes(service._id) || false
                          return (
                            <label
                              key={service._id}
                              className={`flex items-center p-3 cursor-pointer transition-all duration-200 hover:bg-[#2A2A2A] ${
                                isSelected ? 'bg-[var(--color-primary)]/10' : ''
                              }`}
                            >
                              <div className={`relative flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all duration-200 ${
                                isSelected
                                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                  : 'border-[#555555] hover:border-[var(--color-primary)]/50'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const serviceId = service._id
                                    setFormData(prev => ({
                                      ...prev,
                                      services: e.target.checked
                                        ? [...(prev.services || []), serviceId]
                                        : (prev.services || []).filter(id => id !== serviceId)
                                    }))
                                  }}
                                  className="sr-only"
                                />
                                {isSelected && (
                                  <svg className="absolute inset-0 w-full h-full text-white p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3 flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                    {service.name}
                                  </span>
                                  <span className={`ml-2 text-sm font-semibold whitespace-nowrap ${
                                    isSelected ? 'text-[var(--color-primary)]' : 'text-gray-400'
                                  }`}>
                                    ₱{parseFloat(service.price).toFixed(0)}
                                  </span>
                                </div>
                                {service.duration && (
                                  <div className="flex items-center mt-0.5">
                                    <Clock className="w-3 h-3 text-gray-500 mr-1" />
                                    <span className="text-xs text-gray-500">{service.duration} min</span>
                                    {service.category && (
                                      <>
                                        <span className="mx-1.5 text-gray-600">•</span>
                                        <span className="text-xs text-gray-500 capitalize">{service.category}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </label>
                          )
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Scissors className="w-8 h-8 text-gray-600 mb-2" />
                          <p className="text-sm text-gray-400">No services available</p>
                          <p className="text-xs text-gray-500 mt-1">Add services in the Services section</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Work Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-gray-300 font-medium text-sm flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
                        Work Schedule
                      </label>

                      <div className="flex items-center space-x-2">
                        {/* Schedule Type Toggle */}
                        <div className="flex bg-[#1A1A1A] rounded-lg p-1 border border-[#444444] mr-2">
                          <button
                            type="button"
                            onClick={() => toggleScheduleType('weekly')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${formData.schedule_type === 'weekly'
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                              }`}
                          >
                            Weekly
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleScheduleType('specific_dates')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${formData.schedule_type === 'specific_dates'
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                              }`}
                          >
                            Specific Dates
                          </button>
                        </div>

                        {formData.schedule_type === 'weekly' && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>

                    {formData.schedule_type === 'weekly' ? (
                      <>
                        <div className="max-h-64 overflow-y-auto border border-[#444444] rounded-lg p-2 bg-[#1A1A1A] space-y-2">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                            const daySchedule = formData.schedule[day]
                            const isExpanded = expandedDay === day
                            const timeOptions = generateTimeOptions()

                            return (
                              <div
                                key={day}
                                className={`bg-[#2A2A2A] border rounded-lg overflow-hidden transition-all ${daySchedule.available ? 'border-green-500/30' : 'border-[#444444]'
                                  }`}
                              >
                                <div className="p-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={daySchedule.available}
                                        onChange={(e) => handleScheduleChange(day, 'available', e.target.checked)}
                                        className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] rounded"
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
                                          className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#444444] text-white rounded text-xs focus:ring-1 focus:ring-[var(--color-primary)]"
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
                                          className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#444444] text-white rounded text-xs focus:ring-1 focus:ring-[var(--color-primary)]"
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
                      </>
                    ) : (
                      <div className="space-y-4">
                        {/* Calendar View */}
                        <div className="bg-[#1A1A1A] border border-[#444444] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium text-white">
                              {format(currentMonth, 'MMMM yyyy')}
                            </h4>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={prevMonth}
                                className="p-1 hover:bg-[#333333] rounded text-gray-400 hover:text-white"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={nextMonth}
                                className="p-1 hover:bg-[#333333] rounded text-gray-400 hover:text-white"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                              <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
                                {day}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {(() => {
                              const monthStart = startOfMonth(currentMonth)
                              const monthEnd = endOfMonth(monthStart)
                              const startDate = startOfWeek(monthStart)
                              const endDate = endOfWeek(monthEnd)
                              const days = eachDayOfInterval({ start: startDate, end: endDate })

                              return days.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const isSelected = formData.specific_dates ? formData.specific_dates.some(d => d.date === dateStr) : false
                                const isCurrentMonth = isSameMonth(day, monthStart)
                                const isTodayDate = isToday(day)

                                return (
                                  <button
                                    key={dateStr}
                                    type="button"
                                    onClick={() => handleDateClick(day)}
                                    className={`
                                      h-8 rounded-md text-xs flex items-center justify-center transition-all
                                      ${!isCurrentMonth ? 'text-gray-700' : ''}
                                      ${isSelected
                                        ? 'bg-[var(--color-primary)] text-white font-bold shadow-sm'
                                        : isCurrentMonth ? 'text-gray-300 hover:bg-[#333333]' : 'text-gray-600'}
                                      ${isTodayDate && !isSelected ? 'border border-[var(--color-primary)] text-[var(--color-primary)]' : ''}
                                    `}
                                  >
                                    {format(day, 'd')}
                                  </button>
                                )
                              })
                            })()}
                          </div>
                        </div>

                        {/* Selected Dates List */}
                        {(() => {
                          console.log('CreateBarberModal Debug:', {
                            formData: formData,
                            specific_dates: formData.specific_dates,
                            isArray: Array.isArray(formData.specific_dates),
                            length: formData.specific_dates?.length
                          });
                          return formData.specific_dates && Array.isArray(formData.specific_dates) && formData.specific_dates.length > 0;
                        })() && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Selected Dates</h4>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                              {formData.specific_dates
                                ?.sort((a, b) => new Date(a.date) - new Date(b.date))
                                ?.map((dateObj) => {
                                  const timeOptions = generateTimeOptions()
                                  return (
                                    <div key={dateObj.date} className="bg-[#1A1A1A] border border-[#444444] rounded-lg p-3 flex items-center space-x-3">
                                      <div className="flex-shrink-0 w-12 text-center">
                                        <div className="text-xs text-red-400 font-bold uppercase">{format(new Date(dateObj.date), 'MMM')}</div>
                                        <div className="text-lg text-white font-bold">{format(new Date(dateObj.date), 'd')}</div>
                                      </div>

                                      <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] text-gray-500 mb-0.5">Start</label>
                                          <select
                                            value={dateObj.start}
                                            onChange={(e) => handleSpecificDateChange(dateObj.date, 'start', e.target.value)}
                                            className="w-full px-2 py-1 bg-[#2A2A2A] border border-[#444444] text-white rounded text-xs focus:ring-1 focus:ring-[var(--color-primary)]"
                                          >
                                            {timeOptions.map(time => (
                                              <option key={time.value} value={time.value}>{time.label}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-gray-500 mb-0.5">End</label>
                                          <select
                                            value={dateObj.end}
                                            onChange={(e) => handleSpecificDateChange(dateObj.date, 'end', e.target.value)}
                                            className="w-full px-2 py-1 bg-[#2A2A2A] border border-[#444444] text-white rounded text-xs focus:ring-1 focus:ring-[var(--color-primary)]"
                                          >
                                            {timeOptions.map(time => (
                                              <option key={time.value} value={time.value}>{time.label}</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleDateClick(new Date(dateObj.date))}
                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#2A2A2A] rounded transition-colors"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                  className="flex-1 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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