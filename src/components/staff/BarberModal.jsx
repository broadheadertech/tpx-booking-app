import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { User, Star, Phone, Mail, X, Edit, Save, BookOpen, Calendar, Clock, MapPin } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import LoadingSpinner from '../common/LoadingSpinner'

const BarberModal = ({ 
  isOpen, 
  onClose, 
  barber, 
  services = [], 
  onRefresh,
  initialView = 'details' // 'details' or 'bookings'
}) => {
  const [activeView, setActiveView] = useState(initialView)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    is_active: true,
    services: []
  })

  // Convex mutation and queries
  const updateBarber = useMutation(api.services.barbers.updateBarber)
  
  // Fetch barber bookings
  const barberBookings = useQuery(
    api.services.bookings.getBookingsByBarber, 
    barber?._id ? { barberId: barber._id } : "skip"
  )

  // Initialize form data when barber changes
  const initializeFormData = useCallback(() => {
    if (barber) {
      setFormData({
        full_name: barber.full_name || '',
        is_active: barber.is_active !== undefined ? barber.is_active : true,
        services: barber.services || []
      })
    }
  }, [barber])

  // Reset state when modal opens/closes or barber changes
  useEffect(() => {
    if (isOpen && barber) {
      setActiveView(initialView)
      setIsEditing(false)
      setError('')
      initializeFormData()
    }
  }, [isOpen, barber, initialView, initializeFormData])

  const handleClose = useCallback(() => {
    setIsEditing(false)
    setError('')
    setActiveView('details')
    onClose()
  }, [onClose])

  const handleEdit = useCallback(() => {
    setIsEditing(true)
    initializeFormData()
  }, [initializeFormData])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setError('')
    initializeFormData()
  }, [initializeFormData])

  const handleSave = useCallback(async () => {
    if (!formData.full_name.trim()) {
      setError('Full name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const barberData = {
        full_name: formData.full_name.trim(),
        is_active: formData.is_active,
        services: formData.services
      }

      await updateBarber({ id: barber._id, ...barberData })
      setIsEditing(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to save barber')
    } finally {
      setLoading(false)
    }
  }, [formData, barber?._id, updateBarber, onRefresh])

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const getWorkingDays = useCallback((schedule) => {
    return Object.values(schedule || {}).filter(day => day?.available).length
  }, [])

  const formatRevenue = useCallback((amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }, [])

  const getStatusBadge = useCallback((status) => {
    const statusStyles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      booked: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
      completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return statusStyles[status] || statusStyles.pending
  }, [])

  if (!isOpen || !barber) return null

  const workingDays = getWorkingDays(barber.schedule)
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
        <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 shadow-2xl transition-all z-[10000]">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#2A2A2A] to-[#333333] border-b border-[#444444]/50 p-3 z-10">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#444444]/50 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{barber.full_name}</h2>
                  <p className="text-sm text-gray-400">{barber.experience || '0 years'} Experience</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="h-3 w-3 text-[#FF8C42] fill-current" />
                    <span className="text-sm font-medium text-white">{barber.rating || 0}</span>
                    <span className="text-sm text-gray-400">({barber.totalBookings || 0} bookings)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
                title="Close"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-[#444444]/50 px-3">
            <nav className="flex space-x-4">
              <button
                type="button"
                onClick={() => setActiveView('details')}
                className={`py-2 px-2 border-b-2 font-medium text-sm cursor-pointer select-none ${
                  activeView === 'details'
                    ? 'border-[#FF8C42] text-[#FF8C42]'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                } transition-colors`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveView('bookings')}
                className={`py-2 px-2 border-b-2 font-medium text-sm cursor-pointer select-none ${
                  activeView === 'bookings'
                    ? 'border-[#FF8C42] text-[#FF8C42]'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                } transition-colors`}
              >
                Bookings
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-3 max-h-[calc(85vh-160px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {activeView === 'details' ? (
              <div>
                {isEditing ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Enter barber's full name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                        {services && services.length > 0 ? (
                          services.map(service => (
                            <label key={service._id} className="flex items-center py-1">
                              <input
                                type="checkbox"
                                checked={formData.services.includes(service._id)}
                                onChange={(e) => {
                                  const serviceId = service._id
                                  handleInputChange('services', e.target.checked 
                                    ? [...formData.services, serviceId]
                                    : formData.services.filter(id => id !== serviceId)
                                  )
                                }}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {service.name} - ₱{parseFloat(service.price).toFixed(2)}
                              </span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 p-2">No services available</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="is_active"
                            checked={formData.is_active === true}
                            onChange={() => handleInputChange('is_active', true)}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="is_active"
                            checked={formData.is_active === false}
                            onChange={() => handleInputChange('is_active', false)}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Inactive</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-white mb-2">Contact Information</h3>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">{barber.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">{barber.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-white mb-2">Specialties</h3>
                        <div className="flex flex-wrap gap-2">
                          {barber.specialties?.map((specialty, index) => (
                            <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                              {specialty}
                            </span>
                          )) || <span className="text-sm text-gray-500">No specialties listed</span>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-white mb-2">Performance</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-400">Monthly Revenue</p>
                            <p className="text-lg font-bold text-blue-600">{formatRevenue(barber.monthlyRevenue)}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-400">Total Bookings</p>
                            <p className="text-lg font-bold text-green-600">{barber.totalBookings || 0}</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-400">Working Days</p>
                            <p className="text-lg font-bold text-purple-600">{workingDays}/week</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-white mb-2">Work Schedule</h3>
                        <div className="space-y-2">
                          {daysOfWeek.map(day => {
                            const daySchedule = barber.schedule?.[day] || { available: false }
                            return (
                              <div key={day} className="flex justify-between items-center">
                                <span className="text-sm capitalize font-medium">
                                  {day}
                                </span>
                                {daySchedule.available ? (
                                  <span className="text-sm text-green-600 font-medium">
                                    {daySchedule.start} - {daySchedule.end}
                                  </span>
                                ) : (
                                  <span className="text-sm text-red-500">Off</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white">Booking History</h3>
                  </div>
                  {barberBookings && barberBookings.length > 0 && (
                    <span className="text-sm text-gray-400">
                      {barberBookings.length} total bookings
                    </span>
                  )}
                </div>

                {barberBookings === undefined ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" message="Loading bookings..." />
                  </div>
                ) : barberBookings && barberBookings.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {barberBookings.map((booking) => (
                      <div 
                        key={booking._id} 
                        className="bg-[#1A1A1A] border border-[#444444]/50 rounded-lg p-4 hover:border-[#FF8C42]/30 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-white">{booking.customer_name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(booking.status)}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 mb-1">{booking.service_name}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{booking.formattedDate}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{booking.formattedTime}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-[#FF8C42]">₱{booking.service_price}</p>
                            <p className="text-xs text-gray-500">{booking.booking_code}</p>
                          </div>
                        </div>
                        
                        {booking.customer_phone && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-2">
                            <Phone className="h-3 w-3" />
                            <span>{booking.customer_phone}</span>
                          </div>
                        )}
                        
                        {booking.notes && (
                          <div className="mt-2 p-2 bg-[#2A2A2A] rounded text-xs text-gray-400">
                            <strong>Notes:</strong> {booking.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-medium text-white">No bookings found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No bookings available for this barber yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#444444]/50 flex justify-between items-center">
            <div className="flex space-x-3">
              {activeView === 'details' && !isEditing && (
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-[#1A1A1A] transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default BarberModal