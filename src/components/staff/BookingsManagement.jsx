import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Search, Filter, Plus, Edit, Trash2, RotateCcw, Save, X } from 'lucide-react'
import { bookingsService, servicesService } from '../../services/staff'
import barbersService from '../../services/staff/barbersService'

const BookingsManagement = ({ bookings = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [isCreating, setIsCreating] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [formData, setFormData] = useState({
    service: '',
    barber: '',
    date: '',
    time: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadServices()
    loadBarbers()
  }, [])

  const loadServices = async () => {
    try {
      const servicesData = await servicesService.getAllServices()
      setServices(servicesData)
    } catch (err) {
      console.error('Failed to load services:', err)
      setError('Failed to load services. Please refresh the page.')
    }
  }

  const loadBarbers = async () => {
    try {
      const barbersData = await barbersService.getAllBarbers()
      setBarbers(barbersData.filter(b => b.is_active))
    } catch (err) {
      console.error('Failed to load barbers:', err)
      setError('Failed to load barbers. Please refresh the page.')
    }
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'confirmed':
        return {
          label: 'Confirmed',
          icon: CheckCircle,
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          iconColor: 'text-green-500'
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: XCircle,
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          iconColor: 'text-red-500'
        }
      default: // pending
        return {
          label: 'Pending',
          icon: AlertCircle,
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          iconColor: 'text-orange-500'
        }
    }
  }

  const filteredBookings = bookings
    .filter(booking => {
      const serviceName = services.find(s => s.id === booking.service)?.name || ''
      const matchesSearch = 
        serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.barber_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.booking_code || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === 'all' || booking.status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date + ' ' + a.time)
        const dateB = new Date(b.date + ' ' + b.time)
        return dateB - dateA
      }
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      if (sortBy === 'service') {
        const serviceA = services.find(s => s.id === a.service)?.name || ''
        const serviceB = services.find(s => s.id === b.service)?.name || ''
        return serviceA.localeCompare(serviceB)
      }
      return a.id - b.id
    })

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    today: bookings.filter(b => {
      const bookingDate = new Date(b.date).toDateString()
      const today = new Date().toDateString()
      return bookingDate === today
    }).length
  }

  const resetForm = () => {
    setFormData({
      service: '',
      barber: '',
      date: '',
      time: ''
    })
    setError('')
  }

  const handleCreate = () => {
    resetForm()
    setIsCreating(true)
    setEditingBooking(null)
  }

  const handleEdit = (booking) => {
    setFormData({
      service: booking.service,
      barber: booking.barber || '',
      date: booking.date,
      time: booking.time && booking.time !== 'N/A' ? booking.time.slice(0, 5) : ''
    })
    setEditingBooking(booking)
    setIsCreating(false)
    setError('')
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingBooking(null)
    resetForm()
  }

  const handleSave = async () => {
    if (!formData.service || !formData.date || !formData.time) {
      setError('Service, date, and time are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const bookingData = {
        service: parseInt(formData.service),
        date: formData.date,
        time: formData.time
      }

      // Only include barber if one is selected (API.md shows barber is optional)
      if (formData.barber) {
        bookingData.barber = parseInt(formData.barber)
      }

      if (editingBooking) {
        await bookingsService.updateBooking(editingBooking.id, bookingData)
      } else {
        await bookingsService.createBooking(bookingData)
      }

      handleCancel()
      onRefresh()
    } catch (err) {
      console.error('Error saving booking:', err)
      setError(err.message || 'Failed to save booking')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (booking) => {
    if (!confirm(`Are you sure you want to delete booking #${booking.booking_code || booking.id}?`)) return

    setLoading(true)
    try {
      await bookingsService.deleteBooking(booking.id)
      onRefresh()
    } catch (err) {
      console.error('Error deleting booking:', err)
      setError(err.message || 'Failed to delete booking')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (booking, newStatus) => {
    setLoading(true)
    try {
      await bookingsService.patchBooking(booking.id, { status: newStatus })
      onRefresh()
    } catch (err) {
      console.error('Error updating booking status:', err)
      setError(err.message || 'Failed to update booking status')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString || timeString === 'N/A') return 'N/A'
    
    // Handle time strings that might have seconds or microseconds
    let cleanTime = timeString
    if (timeString.includes('.')) {
      cleanTime = timeString.split('.')[0] // Remove microseconds
    }
    if (cleanTime.split(':').length > 2) {
      cleanTime = cleanTime.split(':').slice(0, 2).join(':') // Remove seconds
    }
    
    try {
      return new Date(`1970-01-01T${cleanTime}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      return timeString // Return original if parsing fails
    }
  }

  const BookingForm = () => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingBooking ? 'Edit Booking' : 'Create New Booking'}
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Service *</label>
          <select
            value={formData.service}
            onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          >
            <option value="">Select a service</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name} - ₱{parseFloat(service.price).toFixed(2)} ({service.duration_minutes}min)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Barber (Optional)</label>
          <select
            value={formData.barber}
            onChange={(e) => setFormData(prev => ({ ...prev, barber: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Any available barber</option>
            {barbers.map(barber => (
              <option key={barber.id} value={barber.id}>
                {barber.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          />
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
          <span>{loading ? 'Saving...' : 'Save Booking'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today</p>
              <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Confirmed</p>
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
              <option value="service">Sort by Service</option>
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
              <span>New Booking</span>
            </button>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      {(isCreating || editingBooking) && <BookingForm />}

      {/* Bookings Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barber
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => {
                const statusConfig = getStatusConfig(booking.status)
                const StatusIcon = statusConfig.icon
                const service = services.find(s => s.id === booking.service)

                return (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-lg ${statusConfig.bg} flex items-center justify-center`}>
                            <Calendar className="h-5 w-5 text-orange-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-mono font-bold text-gray-900">
                            #{booking.booking_code || booking.id}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {booking.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {service?.name || 'Unknown Service'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service?.duration_minutes}min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(booking.date)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(booking.time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {booking.barber_name || 'Not assigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className={`-ml-0.5 mr-1.5 h-3 w-3 ${statusConfig.iconColor}`} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">
                        ₱{service ? parseFloat(service.price).toFixed(2) : '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking, 'confirmed')}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              disabled={loading}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking, 'cancelled')}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              disabled={loading}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(booking)}
                          className="text-indigo-600 hover:text-indigo-900"
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(booking)}
                          className="text-red-600 hover:text-red-900"
                          disabled={loading}
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

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new booking.'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  New Booking
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingsManagement