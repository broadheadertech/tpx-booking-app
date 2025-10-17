import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, Search, Filter, RefreshCw, Save, X, AlertCircle, CheckCircle } from 'lucide-react'
import ErrorDisplay from '../common/ErrorDisplay'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { createPortal } from 'react-dom'

const EventsManagement = ({ onRefresh, user }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxAttendees: '',
    price: '',
    category: 'workshop',
    status: 'upcoming'
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [isFormValid, setIsFormValid] = useState(false)

  // Convex queries and mutations - use branch-scoped queries for staff
  const events = user?.role === 'super_admin' 
    ? useQuery(api.services.events.getAllEvents)
    : user?.branch_id 
      ? useQuery(api.services.events.getEventsByBranch, { branch_id: user.branch_id })
      : []
  const createEvent = useMutation(api.services.events.createEvent)
  const updateEvent = useMutation(api.services.events.updateEvent)
  const deleteEvent = useMutation(api.services.events.deleteEvent)

  const loading = !events

  // Real-time field validation
  const validateField = (field, value) => {
    const errors = { ...validationErrors }
    
    switch (field) {
      case 'title':
        if (!value.trim()) {
          errors.title = 'Event title is required'
        } else if (value.trim().length < 3) {
          errors.title = 'Title must be at least 3 characters'
        } else if (value.trim().length > 100) {
          errors.title = 'Title must be less than 100 characters'
        } else {
          delete errors.title
        }
        break
        
      case 'description':
        if (!value.trim()) {
          errors.description = 'Description is required'
        } else if (value.trim().length < 10) {
          errors.description = 'Description must be at least 10 characters'
        } else if (value.trim().length > 500) {
          errors.description = 'Description must be less than 500 characters'
        } else {
          delete errors.description
        }
        break
        
      case 'date':
        if (!value) {
          errors.date = 'Date is required'
        } else {
          const eventDate = new Date(value)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (eventDate < today) {
            errors.date = 'Event date cannot be in the past'
          } else {
            delete errors.date
          }
        }
        break
        
      case 'time':
        if (!value) {
          errors.time = 'Time is required'
        } else {
          delete errors.time
        }
        break
        
      case 'location':
        if (!value.trim()) {
          errors.location = 'Location is required'
        } else if (value.trim().length < 3) {
          errors.location = 'Location must be at least 3 characters'
        } else if (value.trim().length > 200) {
          errors.location = 'Location must be less than 200 characters'
        } else {
          delete errors.location
        }
        break
        
      case 'maxAttendees':
        const attendees = parseInt(value)
        if (!value || isNaN(attendees)) {
          errors.maxAttendees = 'Valid number of attendees required'
        } else if (attendees < 1) {
          errors.maxAttendees = 'Must have at least 1 attendee'
        } else if (attendees > 1000) {
          errors.maxAttendees = 'Maximum 1000 attendees allowed'
        } else {
          delete errors.maxAttendees
        }
        break
        
      case 'price':
        const price = parseFloat(value)
        if (value && (isNaN(price) || price < 0)) {
          errors.price = 'Price must be a valid positive number'
        } else if (price > 100000) {
          errors.price = 'Price cannot exceed ₱100,000'
        } else {
          delete errors.price
        }
        break
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Check if form is valid for submission
  const checkFormValidity = () => {
    const requiredFields = ['title', 'description', 'date', 'time', 'location', 'maxAttendees']
    const hasRequiredFields = requiredFields.every(field => formData[field] && formData[field].toString().trim())
    const hasNoErrors = Object.keys(validationErrors).length === 0
    setIsFormValid(hasRequiredFields && hasNoErrors)
  }

  // Validate entire form
  const validateForm = () => {
    const errors = {}
    
    // Validate all fields
    Object.keys(formData).forEach(field => {
      validateField(field, formData[field])
    })
    
    // Check final validation state
    const hasErrors = Object.keys(validationErrors).length > 0
    setFormErrors(validationErrors)
    return !hasErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')
    
    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date,
        time: formData.time,
        location: formData.location.trim(),
        maxAttendees: parseInt(formData.maxAttendees),
        price: parseFloat(formData.price) || 0,
        category: formData.category,
        status: formData.status,
        branch_id: user.branch_id // Add branch_id for branch-scoped events
      }
      
      if (editingEvent) {
        // Update existing event - don't include branch_id for updates
        const { branch_id, ...updateData } = eventData
        await updateEvent({
          id: editingEvent._id,
          ...updateData
        })
        setSuccessMessage('Event updated successfully!')
      } else {
        // Create new event
        await createEvent(eventData)
        setSuccessMessage('Event created successfully!')
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
      
      handleCloseModal()
      onRefresh?.()
    } catch (error) {
      console.error('Error saving event:', error)
      
      // Handle specific error types
      let errorMessage = 'Failed to save event'
      
      if (error.message?.includes('EVENT_PAST_DATE')) {
        errorMessage = 'Event date cannot be in the past'
      } else if (error.message?.includes('EVENT_NOT_FOUND')) {
        errorMessage = 'Event not found'
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.'
      } else if (error.message?.includes('unauthorized')) {
        errorMessage = 'You are not authorized to perform this action'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (event) => {
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      maxAttendees: event.maxAttendees.toString(),
      price: event.price.toString(),
      category: event.category,
      status: event.status
    })
    setEditingEvent(event)
    setShowCreateModal(true)
    setError('')
    setSuccessMessage('')
    setValidationErrors({})
  }

  const handleDelete = async (eventId) => {
    setShowDeleteConfirm(eventId)
  }

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return
    
    try {
      await deleteEvent({ id: showDeleteConfirm })
      setSuccessMessage('Event deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      onRefresh?.()
    } catch (error) {
      console.error('Error deleting event:', error)
      
      let errorMessage = 'Failed to delete event'
      
      if (error.message?.includes('EVENT_NOT_FOUND')) {
        errorMessage = 'Event not found'
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (error.message?.includes('unauthorized')) {
        errorMessage = 'You are not authorized to delete this event'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setShowDeleteConfirm(null)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingEvent(null)
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      maxAttendees: '',
      price: '',
      category: 'workshop',
      status: 'upcoming'
    })
    setFormErrors({})
    setValidationErrors({})
    setError('')
    setSuccessMessage('')
    setIsFormValid(false)
  }

  // Render Create/Edit Event Modal via Portal (outside tabs)
  const renderCreateEditModal = () => {
    if (!showCreateModal) return null

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-2xl transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <h2 className="text-xl font-bold text-white">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Display */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-red-400 font-medium">{error}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Event Title *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, title: e.target.value }))
                          validateField('title', e.target.value)
                        }}
                        className={`w-full bg-[#1A1A1A] border text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                          validationErrors.title ? 'border-red-500' : 
                          formData.title && !validationErrors.title ? 'border-green-500' : 'border-[#2A2A2A]'
                        }`}
                        placeholder="Enter event title"
                      />
                      {formData.title && !validationErrors.title && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {validationErrors.title && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.title}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {formData.title.length}/100 characters
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    <div className="relative">
                      <textarea
                        value={formData.description}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, description: e.target.value }))
                          validateField('description', e.target.value)
                        }}
                        rows={3}
                        className={`w-full bg-[#1A1A1A] border text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent resize-none ${
                          validationErrors.description ? 'border-red-500' : 
                          formData.description && !validationErrors.description ? 'border-green-500' : 'border-[#2A2A2A]'
                        }`}
                        placeholder="Describe the event"
                      />
                      {formData.description && !validationErrors.description && (
                        <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {validationErrors.description && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {formData.description.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, date: e.target.value }))
                          validateField('date', e.target.value)
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full bg-[#1A1A1A] border text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                          validationErrors.date ? 'border-red-500' : 
                          formData.date && !validationErrors.date ? 'border-green-500' : 'border-[#2A2A2A]'
                        }`}
                      />
                      {formData.date && !validationErrors.date && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {validationErrors.date && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Time *
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, time: e.target.value }))
                          validateField('time', e.target.value)
                        }}
                        className={`w-full bg-[#1A1A1A] border text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                          validationErrors.time ? 'border-red-500' : 
                          formData.time && !validationErrors.time ? 'border-green-500' : 'border-[#2A2A2A]'
                        }`}
                      />
                      {formData.time && !validationErrors.time && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {validationErrors.time && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.time}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, location: e.target.value }))
                          validateField('location', e.target.value)
                        }}
                        className={`w-full bg-[#1A1A1A] border text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                          validationErrors.location ? 'border-red-500' : 
                          formData.location && !validationErrors.location ? 'border-green-500' : 'border-[#2A2A2A]'
                        }`}
                        placeholder="Event location"
                      />
                      {formData.location && !validationErrors.location && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {validationErrors.location && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.location}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {formData.location.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Attendees *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.maxAttendees}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, maxAttendees: e.target.value }))
                          validateField('maxAttendees', e.target.value)
                        }}
                        min="1"
                        max="1000"
                        className={`w-full bg-[#1A1A1A] border text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                          validationErrors.maxAttendees ? 'border-red-500' : 
                          formData.maxAttendees && !validationErrors.maxAttendees ? 'border-green-500' : 'border-[#2A2A2A]'
                        }`}
                        placeholder="Maximum attendees"
                      />
                      {formData.maxAttendees && !validationErrors.maxAttendees && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {validationErrors.maxAttendees && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.maxAttendees}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price (₱)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, price: e.target.value }))
                          validateField('price', e.target.value)
                        }}
                        min="0"
                        max="100000"
                        step="0.01"
                        className={`w-full bg-[#1A1A1A] border text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                          validationErrors.price ? 'border-red-500' : 
                          formData.price && !validationErrors.price ? 'border-green-500' : 'border-[#2A2A2A]'
                        }`}
                        placeholder="0.00 (Free event)"
                      />
                      {formData.price && !validationErrors.price && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {validationErrors.price && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.price}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      Enter 0 for free events
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    >
                      <option value="workshop">Workshop</option>
                      <option value="celebration">Celebration</option>
                      <option value="training">Training</option>
                      <option value="promotion">Promotion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                    className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                        {editingEvent ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2 inline" />
                        {editingEvent ? 'Update Event' : 'Create Event'}
                      </>
                    )}
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

  // Render Delete Confirmation Modal via Portal (outside tabs)
  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <h2 className="text-xl font-bold text-white">Delete Event</h2>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Delete Event</h3>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete this event? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200"
                  >
                    Delete Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Real-time form validation
  useEffect(() => {
    checkFormValidity()
  }, [formData, validationErrors])

  // Clear success message after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const getStatusConfig = (status) => {
    switch (status) {
      case 'upcoming':
        return {
          label: 'Upcoming',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200'
        }
      case 'ongoing':
        return {
          label: 'Ongoing',
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200'
        }
      case 'completed':
        return {
          label: 'Completed',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200'
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200'
        }
      default:
        return {
          label: 'Unknown',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200'
        }
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'workshop': return '🎓'
      case 'celebration': return '🎉'
      case 'training': return '📚'
      case 'promotion': return '🏷️'
      default: return '📅'
    }
  }

  const filteredEvents = events ? events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || event.status === filterStatus
    return matchesSearch && matchesFilter
  }) : []

  const stats = {
    total: events?.length || 0,
    upcoming: events?.filter(e => e.status === 'upcoming').length || 0,
    completed: events?.filter(e => e.status === 'completed').length || 0,
    totalAttendees: events?.reduce((sum, e) => sum + e.currentAttendees, 0) || 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-white">Events Management</h2>
          <p className="text-gray-400 mt-1">Organize and manage barbershop events and workshops</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onRefresh?.()}
            className="flex items-center space-x-2 px-4 py-2 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onClose={() => setError('')}
          variant="inline"
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Events</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Upcoming</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.upcoming}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Completed</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.completed}</p>
            </div>
            <Calendar className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Attendees</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.totalAttendees}</p>
            </div>
            <Users className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-[#444444] rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-[#444444] rounded w-full mb-2"></div>
                <div className="h-3 bg-[#444444] rounded w-2/3 mb-4"></div>
                <div className="h-8 bg-[#444444] rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const statusConfig = getStatusConfig(event.status)
            const attendancePercentage = (event.currentAttendees / event.maxAttendees) * 100
            
            return (
              <div key={event._id} className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getCategoryIcon(event.category)}</span>
                    <div>
                      <h3 className="font-semibold text-white text-lg">{event.title}</h3>
                      <p className="text-sm text-gray-400 capitalize">{event.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                    {statusConfig.label}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Clock className="h-4 w-4 mr-2" />
                    {new Date(`1970-01-01T${event.time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Users className="h-4 w-4 mr-2" />
                    {event.currentAttendees}/{event.maxAttendees} attendees
                  </div>
                </div>

                {/* Attendance Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Attendance</span>
                    <span>{Math.round(attendancePercentage)}%</span>
                  </div>
                  <div className="w-full bg-[#444444] rounded-full h-2">
                    <div 
                      className="bg-[#FF8C42] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(attendancePercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-[#FF8C42]">
                    {event.price === 0 ? 'Free' : `₱${event.price.toLocaleString()}`}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="p-2 text-gray-400 hover:text-[#FF8C42] hover:bg-[#FF8C42]/20 rounded-lg transition-colors"
                      title="Edit Event"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(event._id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredEvents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first event.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                New Event
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {renderCreateEditModal()}
      {renderDeleteConfirmModal()}
    </div>
  )
}

export default EventsManagement