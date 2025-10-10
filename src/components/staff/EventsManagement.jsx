import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, Search, Filter, RefreshCw, Save, X, AlertCircle } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import ErrorDisplay from '../common/ErrorDisplay'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

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

  const validateForm = () => {
    const errors = {}
    
    if (!formData.title.trim()) errors.title = 'Event title is required'
    if (!formData.description.trim()) errors.description = 'Description is required'
    if (!formData.date) errors.date = 'Date is required'
    if (!formData.time) errors.time = 'Time is required'
    if (!formData.location.trim()) errors.location = 'Location is required'
    if (!formData.maxAttendees || formData.maxAttendees < 1) errors.maxAttendees = 'Valid max attendees required'
    if (formData.price < 0) errors.price = 'Price cannot be negative'
    
    // Date validation
    if (formData.date) {
      const eventDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (eventDate < today) {
        errors.date = 'Event date cannot be in the past'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')
    
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
        // Update existing event
        await updateEvent({
          id: editingEvent._id,
          ...eventData
        })
      } else {
        // Create new event
        await createEvent(eventData)
      }
      
      handleCloseModal()
      onRefresh?.()
    } catch (error) {
      console.error('Error saving event:', error)
      setError(error.message || 'Failed to save event')
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
  }

  const handleDelete = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    
    try {
      await deleteEvent({ id: eventId })
      onRefresh?.()
    } catch (error) {
      console.error('Error deleting event:', error)
      setError(error.message || 'Failed to delete event')
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
    setError('')
  }

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

      {/* Create/Edit Event Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={handleCloseModal} 
        title={editingEvent ? 'Edit Event' : 'Create New Event'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <ErrorDisplay
              error={error}
              onClose={() => setError('')}
              variant="compact"
            />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter event title"
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.title}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the event"
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {formErrors.date && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.time ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {formErrors.time && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.time}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.location ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Event location"
              />
              {formErrors.location && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.location}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Attendees *
              </label>
              <input
                type="number"
                value={formData.maxAttendees}
                onChange={(e) => setFormData(prev => ({ ...prev, maxAttendees: e.target.value }))}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.maxAttendees ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Maximum attendees"
              />
              {formErrors.maxAttendees && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.maxAttendees}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₱)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.price ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00 (Free event)"
              />
              {formErrors.price && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.price}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="workshop">Workshop</option>
                <option value="celebration">Celebration</option>
                <option value="training">Training</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {editingEvent ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default EventsManagement