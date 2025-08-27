import React, { useState, useEffect } from 'react'
import { User, Star, Clock, Calendar, DollarSign, Search, Filter, UserCheck, UserX, Phone, Mail, Scissors, Plus, Edit, Trash2, RotateCcw, Save, X, Eye, BookOpen } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const BarbersManagement = ({ barbers = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [initialTab, setInitialTab] = useState('view')
  const [isCreating, setIsCreating] = useState(false)
  const [editingBarber, setEditingBarber] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [formData, setFormData] = useState({
    full_name: '',
    is_active: true,
    services: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [services, setServices] = useState([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [showBookingsModal, setShowBookingsModal] = useState(false)
  const [selectedBarberBookings, setSelectedBarberBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [bookingsFilter, setBookingsFilter] = useState('all')
  const [bookingsSearchTerm, setBookingsSearchTerm] = useState('')

  // Load services for form only when creating new barber
  useEffect(() => {
    const loadServices = async () => {
      if (isCreating) {
        setLoadingServices(true)
        try {
          const servicesData = await servicesService.getAllServices()
          setServices(servicesData)
        } catch (error) {
          console.error('Error loading services:', error)
          setError('Failed to load services')
        } finally {
          setLoadingServices(false)
        }
      }
    }
    
    loadServices()
  }, [isCreating])

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          icon: UserCheck,
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          iconColor: 'text-green-500'
        }
      case 'on_leave':
        return {
          label: 'On Leave',
          icon: Clock,
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          iconColor: 'text-yellow-500'
        }
      default: // inactive
        return {
          label: 'Inactive',
          icon: UserX,
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          iconColor: 'text-red-500'
        }
    }
  }

  const filteredBarbers = barbers
    .filter(barber => {
      const matchesSearch = 
        barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.specialties.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesFilter = filterStatus === 'all' || barber.status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'rating') return parseFloat(b.rating) - parseFloat(a.rating)
      if (sortBy === 'revenue') return b.monthlyRevenue - a.monthlyRevenue
      if (sortBy === 'bookings') return b.totalBookings - a.totalBookings
      return a.id - b.id
    })

  const stats = {
    total: barbers.length,
    active: barbers.filter(b => b.status === 'active').length,
    onLeave: barbers.filter(b => b.status === 'on_leave').length,
    totalRevenue: barbers.reduce((sum, b) => sum + b.monthlyRevenue, 0),
    avgRating: barbers.length ? barbers.reduce((sum, b) => sum + b.rating, 0) / barbers.length : 0
  }

  const getWorkingDays = (schedule) => {
    return Object.values(schedule).filter(day => day.available).length
  }

  const formatRevenue = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      is_active: true,
      services: []
    })
    setError('')
  }

  const handleCreate = () => {
    resetForm()
    setIsCreating(true)
    setEditingBarber(null)
  }

  const handleEdit = (barber) => {
    // Open the modal with the selected barber in edit mode
    setInitialTab('edit')
    setSelectedBarber(barber)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingBarber(null)
    resetForm()
  }

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      setError('Full name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const barberData = {
        user: 1, // For now, using a default user ID - this should be the authenticated user
        full_name: formData.full_name.trim(),
        is_active: formData.is_active,
        services: formData.services
      }

      await barbersService.createBarber(barberData)

      handleCancel()
      onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to save barber')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (barber) => {
    setLoading(true)
    try {
      await barbersService.deleteBarber(barber.id)
      setShowDeleteConfirm(null)
      onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to delete barber')
    } finally {
      setLoading(false)
    }
  }

  const handleViewBookings = async (barber) => {
    console.log('View bookings for barber:', barber)
    // Close the detail modal first if it's open
    if (selectedBarber) {
      setSelectedBarber(null)
    }
    
    setLoadingBookings(true)
    setShowBookingsModal(true)
    try {
      const bookings = await bookingsService.getAllBookings()
      console.log('All bookings received:', bookings)
      
      // Filter bookings for the selected barber using proper field matching
      const barberBookings = bookings.filter(booking => {
        const matches = (
          booking.barber === barber.id ||
          booking.barber_id === barber.id ||
          booking.barber_name === barber.name ||
          booking.barber_name === barber.full_name
        )
        console.log('Booking match check:', {
          booking: booking,
          barber: barber,
          matches: matches
        })
        return matches
      })
      
      console.log('Filtered barber bookings:', barberBookings)
      setSelectedBarberBookings(barberBookings)
    } catch (err) {
      console.error('Error loading bookings:', err)
      setError(err.message || 'Failed to load bookings')
      setSelectedBarberBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  const BarberForm = () => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Create New Barber
        </h3>
        <button
          onClick={handleCancel}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            placeholder="Enter barber's full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
          <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
            {loadingServices ? (
              <p className="text-sm text-gray-500 p-2">Loading services...</p>
            ) : services.length > 0 ? (
              services.map(service => (
                <label key={service.id} className="flex items-center py-1">
                  <input
                    type="checkbox"
                    checked={formData.services.includes(service.id)}
                    onChange={(e) => {
                      const serviceId = service.id
                      setFormData(prev => ({
                        ...prev,
                        services: e.target.checked 
                          ? [...prev.services, serviceId]
                          : prev.services.filter(id => id !== serviceId)
                      }))
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
                onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="is_active"
                checked={formData.is_active === false}
                onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm text-gray-700">Inactive</span>
            </label>
          </div>
        </div>

      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Saving...' : 'Save Barber'}</span>
        </button>
      </div>
    </div>
  )

  const BarberDetailModal = ({ barber, onClose }) => {
    if (!barber) return null

    const workingDays = getWorkingDays(barber.schedule)
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const [activeTab, setActiveTab] = useState('view')

    // Initialize form data only when barber ID changes  
    useEffect(() => {
      if (barber?.id) {
        setFormData({
          full_name: barber.full_name || barber.name,
          is_active: barber.is_active !== undefined ? barber.is_active : (barber.status === 'active'),
          services: barber.services || []
        })
        setError('')
      }
    }, [barber?.id])
    
    // Set initial tab only once when modal opens
    useEffect(() => {
      setActiveTab(initialTab)
    }, [])

    // Load services only when edit tab is clicked
    const loadServicesIfNeeded = async () => {
      if (services.length === 0) {
        setLoadingServices(true)
        try {
          const servicesData = await servicesService.getAllServices()
          setServices(servicesData)
        } catch (error) {
          setError('Failed to load services')
        } finally {
          setLoadingServices(false)
        }
      }
    }


    const handleSaveInModal = async () => {
      if (!formData.full_name.trim()) {
        setError('Full name is required')
        return
      }

      setLoading(true)
      setError('')

      try {
        const barberData = {
          user: 1,
          full_name: formData.full_name.trim(),
          is_active: formData.is_active,
          services: formData.services
        }

        await barbersService.updateBarber(barber.id, barberData)
        setActiveTab('view')
        onRefresh()
        // Don't close modal, just switch back to view tab
      } catch (err) {
        setError(err.message || 'Failed to save barber')
      } finally {
        setLoading(false)
      }
    }

    const handleCancelEdit = () => {
      setActiveTab('view')
      setError('')
      // Reset form data to original values
      setFormData({
        full_name: barber.full_name || barber.name,
        is_active: barber.is_active !== undefined ? barber.is_active : (barber.status === 'active'),
        services: barber.services || []
      })
    }

    return (
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[99999] p-2 sm:p-4 transition-all duration-300 ease-in-out animate-in fade-in-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl transform transition-all duration-300 ease-out animate-in slide-in-from-bottom-4 fade-in-0 zoom-in-95 mx-auto">
          {/* Fixed Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 z-10">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <img
                  src={barber.avatar}
                  alt={barber.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{barber.name}</h2>
                  <p className="text-sm text-gray-600">{barber.experience} Experience</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{barber.rating}</span>
                    <span className="text-sm text-gray-500">({barber.totalBookings} bookings)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                title="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 px-3 sm:px-4">
            <nav className="flex space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab('view')}
                className={`py-3 px-2 border-b-2 font-medium text-sm cursor-pointer select-none ${
                  activeTab === 'view'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                View Details
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit')
                  loadServicesIfNeeded()
                }}
                className={`py-3 px-2 border-b-2 font-medium text-sm cursor-pointer select-none ${
                  activeTab === 'edit'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } transition-colors`}
              >
                Edit Barber
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-4 max-h-[calc(90vh-160px)] sm:max-h-[calc(85vh-160px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {activeTab === 'edit' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter barber's full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {loadingServices ? (
                      <p className="text-sm text-gray-500 p-2">Loading services...</p>
                    ) : services.length > 0 ? (
                      services.map(service => (
                        <label key={service.id} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            checked={formData.services.includes(service.id)}
                            onChange={(e) => {
                              const serviceId = service.id
                              setFormData(prev => ({
                                ...prev,
                                services: e.target.checked 
                                  ? [...prev.services, serviceId]
                                  : prev.services.filter(id => id !== serviceId)
                              }))
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
                        onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="is_active"
                        checked={formData.is_active === false}
                        onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
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
                    <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{barber.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{barber.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {barber.specialties.map((specialty, index) => (
                        <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-sm text-gray-600">{barber.bio}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Performance</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Monthly Revenue</p>
                        <p className="text-lg font-bold text-blue-600">{formatRevenue(barber.monthlyRevenue)}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Total Bookings</p>
                        <p className="text-lg font-bold text-green-600">{barber.totalBookings}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Working Days</p>
                        <p className="text-lg font-bold text-purple-600">{workingDays}/week</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Work Schedule</h3>
                    <div className="space-y-2">
                      {daysOfWeek.map(day => {
                        const daySchedule = barber.schedule[day]
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

          {/* Fixed Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 sm:p-4">
            <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3">
              {activeTab === 'edit' ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInModal}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleViewBookings(barber)}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>View Bookings</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const BookingsModal = () => {
    const filteredBookings = selectedBarberBookings.filter(booking => {
      const matchesSearch = 
        booking.barber_name?.toLowerCase().includes(bookingsSearchTerm.toLowerCase()) ||
        booking.service?.toString().includes(bookingsSearchTerm.toLowerCase()) ||
        booking.status?.toLowerCase().includes(bookingsSearchTerm.toLowerCase()) ||
        booking.booking_code?.toLowerCase().includes(bookingsSearchTerm.toLowerCase())
      
      const matchesFilter = bookingsFilter === 'all' || booking.status === bookingsFilter
      return matchesSearch && matchesFilter
    })

    const getStatusColor = (status) => {
      switch (status) {
        case 'confirmed': return 'bg-green-100 text-green-800'
        case 'pending': return 'bg-yellow-100 text-yellow-800'
        case 'completed': return 'bg-blue-100 text-blue-800'
        case 'cancelled': return 'bg-red-100 text-red-800'
        default: return 'bg-gray-100 text-gray-800'
      }
    }

    return (
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[99998] p-2 sm:p-4 transition-all duration-300 ease-in-out animate-in fade-in-0"
        onClick={(e) => e.target === e.currentTarget && setShowBookingsModal(false)}
      >
        <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl transform transition-all duration-300 ease-out animate-in slide-in-from-bottom-4 fade-in-0 zoom-in-95">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Bookings</h2>
              <button
                onClick={() => setShowBookingsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mt-4 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={bookingsSearchTerm}
                  onChange={(e) => setBookingsSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={bookingsFilter}
                  onChange={(e) => setBookingsFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-auto max-h-[60vh]">
            {loadingBookings ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading bookings...</p>
                </div>
              </div>
            ) : filteredBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking, index) => (
                      <tr key={booking.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{booking.booking_code || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Service ID: {booking.service || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.formattedDate || booking.date || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{booking.formattedTime || booking.time || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">-</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {bookingsSearchTerm || bookingsFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'No bookings available for this barber.'
                  }
                </p>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Showing {filteredBookings.length} of {selectedBarberBookings.length} bookings
              </p>
              <button
                onClick={() => setShowBookingsModal(false)}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const DeleteConfirmModal = ({ barber, onClose, onConfirm }) => (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[99997] p-2 sm:p-4 transition-all duration-300 ease-in-out animate-in fade-in-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl transform transition-all duration-300 ease-out animate-in slide-in-from-bottom-4 fade-in-0 zoom-in-95 mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Delete Barber</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <strong>{barber.name}</strong>? This will permanently remove the barber from the system.
        </p>
        <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <User className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">On Leave</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.onLeave}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Rating</p>
              <p className="text-2xl font-bold text-purple-600">{stats.avgRating.toFixed(1)}</p>
            </div>
            <Star className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatRevenue(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search barbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="revenue">Sort by Revenue</option>
              <option value="bookings">Sort by Bookings</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Barber</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barber Form */}
      {isCreating && <BarberForm />}

      {/* Barbers Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barber</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBarbers.map((barber) => {
                const statusConfig = getStatusConfig(barber.status)
                const StatusIcon = statusConfig.icon
                const workingDays = getWorkingDays(barber.schedule)

                return (
                  <tr key={barber.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={barber.avatar}
                            alt={barber.name}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{barber.name}</div>
                          <div className="text-sm text-gray-500">{barber.experience}</div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-600">{barber.rating}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{barber.email}</div>
                      <div className="text-sm text-gray-500">{barber.phone}</div>
                      <div className="text-xs text-gray-500 mt-1">{barber.specialties.length} specialties</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatRevenue(barber.monthlyRevenue)}</div>
                      <div className="text-sm text-gray-500">{barber.totalBookings} bookings</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{workingDays}/week</div>
                      <div className="text-sm text-gray-500">Working days</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.iconColor}`} />
                        {statusConfig.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setInitialTab('view')
                            setSelectedBarber(barber)
                          }}
                          className="text-orange-600 hover:text-orange-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewBookings(barber)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Bookings"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(barber)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(barber)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredBarbers.length === 0 && (
        <div className="text-center py-12">
          <Scissors className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No barbers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating a new barber profile.'
            }
          </p>
        </div>
      )}

      {/* Barber Detail Modal */}
      {selectedBarber && (
        <BarberDetailModal
          barber={selectedBarber}
          onClose={() => {
            setSelectedBarber(null)
            setInitialTab('view')
          }}
        />
      )}

      {/* Bookings Modal */}
      {showBookingsModal && <BookingsModal />}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          barber={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDelete(showDeleteConfirm)}
        />
      )}
    </div>
  )
}

export default BarbersManagement