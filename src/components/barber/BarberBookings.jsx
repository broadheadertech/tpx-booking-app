import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle, AlertCircle, Filter, Search } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const BarberBookings = () => {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCompleteModal, setShowCompleteModal] = useState(null)
  const [completeLoading, setCompleteLoading] = useState(false)

  // Get barber data - only for current user's branch
  const barbers = user?.branch_id 
    ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
    : useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)

  // Get services data for validation - only for current user's branch
  const allServices = user?.branch_id
    ? useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id })
    : useQuery(api.services.services.getAllServices)

  // Mutation to create barber profile
  const createBarberProfile = useMutation(api.services.barbers.createBarberProfile)

  // Auto-create barber profile if user has barber role but no profile
  React.useEffect(() => {
    if (user?.role === 'barber' && barbers && !currentBarber && user._id && user.branch_id) {
      createBarberProfile({ 
        userId: user._id,
        branch_id: user.branch_id
      })
        .catch((error) => {
          console.error('Failed to create barber profile:', error)
        })
    }
  }, [user, barbers, currentBarber, createBarberProfile])

  // Get bookings for this barber - only from their branch
  const allBookings = user?.branch_id 
    ? useQuery(api.services.bookings.getBookingsByBranch, { branch_id: user.branch_id })
    : useQuery(api.services.bookings.getAllBookings)
  const barberBookings = allBookings?.filter(booking => 
    booking.barber === currentBarber?._id
  ) || []

  // Filter bookings
  const filteredBookings = barberBookings.filter(booking => {
    const matchesDate = booking.date === selectedDate
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    const matchesSearch = searchTerm === '' || 
      booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.service_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesDate && matchesStatus && matchesSearch
  })

  // Mutations for booking management
  const updateBooking = useMutation(api.services.bookings.updateBooking)

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await updateBooking({ id: bookingId, status: newStatus })
      // Refresh the data by re-querying
      window.location.reload()
    } catch (error) {
      console.error('Failed to update booking status:', error)
      alert('Failed to update booking status')
    }
  }

  const handleCompleteBooking = (booking) => {
    setShowCompleteModal(booking)
  }

  const confirmCompleteBooking = async () => {
    if (!showCompleteModal) return

    setCompleteLoading(true)
    try {
      // Check if service exists and is valid
      const service = allServices?.find(s => s._id === showCompleteModal.service)
      if (!service) {
        alert('Service not found. Cannot complete booking.')
        return
      }

      await updateBooking({
        id: showCompleteModal._id,
        status: 'completed'
      })

      setShowCompleteModal(null)
      // Refresh the data
      window.location.reload()
    } catch (error) {
      console.error('Failed to complete booking:', error)
      alert('Failed to complete booking. Please try again.')
    } finally {
      setCompleteLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-400 bg-green-500/10 border border-green-500/20'
      case 'completed': return 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
      case 'cancelled': return 'text-red-400 bg-red-500/10 border border-red-500/20'
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border border-gray-500/20'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-3 h-3" />
      case 'completed': return <CheckCircle className="w-3 h-3" />
      case 'cancelled': return <XCircle className="w-3 h-3" />
      case 'pending': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  if (!currentBarber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
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
      </div>
      
      {/* Mobile Header - Ultra Compact */}
      <div className="relative z-10 bg-gradient-to-r from-[#1A1A1A]/95 to-[#2A2A2A]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-white">Appointments</h1>
              <p className="text-xs text-gray-400">Manage bookings</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : 'Selected'}</div>
              <div className="text-sm font-semibold text-[var(--color-primary)]">{filteredBookings.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8 py-4 md:py-6">
        {/* Compact Filters - No Horizontal Scroll */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-4 mb-4">
          {/* Status Filter Tabs - Compact & No Scroll */}
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 flex-shrink-0 ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-md'
                      : 'bg-[#1A1A1A] border border-[#444444] text-gray-300 hover:bg-[#333333] hover:border-[#555555]'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Search and Date Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date Filter - Compact */}
            <div className="relative">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                <label className="text-sm font-semibold text-gray-300">Date</label>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-sm"
              />
            </div>

            {/* Search Filter - Compact */}
            <div className="relative">
              <div className="flex items-center space-x-2 mb-2">
                <Search className="w-4 h-4 text-[var(--color-primary)]" />
                <label className="text-sm font-semibold text-gray-300">Search</label>
              </div>
              <input
                type="text"
                placeholder="Customer or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bookings List - Mobile Optimized */}
        <div className="space-y-3 md:space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-6 text-center">
              <Calendar className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-2">No Appointments Found</h3>
              <p className="text-xs text-gray-400">
                {statusFilter === 'all'
                  ? 'No appointments scheduled for this date.'
                  : `No ${statusFilter} appointments for this date.`
                }
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking._id} className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg shadow-md border border-[#444444]/30 p-3 active:scale-[0.98] transition-all duration-200 hover:border-[var(--color-primary)]/50">
                {/* Ultra Compact Layout */}
                <div className="flex items-center space-x-3">
                  {/* Left Side - Info */}
                  <div className="flex-1 min-w-0">
                    {/* Status Badge & Time */}
                    <div className="flex items-center justify-between mb-2">
                      <div className={`px-2 py-0.5 rounded-full border text-xs font-medium flex items-center space-x-1 ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="capitalize text-xs">{booking.status}</span>
                      </div>
                      <span className="text-gray-400 text-xs font-medium">{booking.time}</span>
                    </div>

                    {/* Service Name */}
                    <h3 className="font-bold text-white text-sm truncate mb-1">{booking.service_name}</h3>

                    {/* Customer Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-400 text-xs min-w-0 flex-1">
                        <User className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{booking.customer_name}</span>
                      </div>
                      <span className="font-bold text-[var(--color-primary)] text-sm ml-2 flex-shrink-0">₱{booking.price}</span>
                    </div>

                    {/* Phone (if available) */}
                    {booking.customer_phone && (
                      <div className="flex items-center text-gray-500 text-xs mt-1">
                        <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{booking.customer_phone}</span>
                      </div>
                    )}

                    {/* Notes (compact) */}
                    {booking.notes && (
                      <div className="mt-2 p-2 bg-[#1A1A1A]/50 rounded-md border-l-2 border-[var(--color-primary)]/50">
                        <p className="text-xs text-gray-300 truncate">
                          📝 {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Action Buttons */}
                  <div className="flex flex-col space-y-1 flex-shrink-0">
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                          className="px-2 py-1.5 bg-green-600 text-white rounded text-xs font-medium active:scale-95 transition-all hover:bg-green-700 min-w-[60px]"
                        >
                          ✓ Confirm
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
                          className="px-2 py-1.5 bg-red-600 text-white rounded text-xs font-medium active:scale-95 transition-all hover:bg-red-700 min-w-[60px]"
                        >
                          ✕ Cancel
                        </button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleCompleteBooking(booking)}
                        className="px-2 py-1.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded text-xs font-medium active:scale-95 transition-all hover:from-[var(--color-accent)] hover:brightness-110 min-w-[60px]"
                      >
                        ✓ Complete
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <div className="px-2 py-1.5 bg-green-600/20 border border-green-500/30 rounded text-xs text-green-400 font-medium text-center min-w-[60px]">
                        ✓ Done
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Complete Booking Modal */}
      {showCompleteModal && (
        <CompleteBookingModal
          booking={showCompleteModal}
          onConfirm={confirmCompleteBooking}
          onClose={() => setShowCompleteModal(null)}
          loading={completeLoading}
        />
      )}
    </div>
  )
}

// Complete Booking Modal Component
const CompleteBookingModal = ({ booking, onConfirm, onClose, loading }) => {
  if (!booking) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl border border-gray-200">
        <div className="text-center space-y-4">
          {/* Check Circle Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          {/* Title and Message */}
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Complete Booking?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to mark this booking as completed? This will finalize the service and update customer records.
            </p>
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-medium text-gray-900">{booking.service_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium text-gray-900">{booking.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium text-gray-900">{booking.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium text-gray-900">{booking.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium text-green-600">₱{booking.price}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Completing...</span>
                </div>
              ) : (
                "Complete Booking"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Cancel Booking Modal Component
const CancelBookingModal = ({ booking, onConfirm, onClose, loading }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl border border-gray-200">
        <div className="text-center space-y-4">
          {/* Warning Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>

          {/* Title and Message */}
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Cancel Booking?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
          </div>

          {/* Booking Details */}
          <div className="bg-red-50 rounded-lg p-4 text-left mb-6 border border-red-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-medium text-gray-900">{booking.service_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium text-gray-900">{booking.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium text-gray-900">{booking.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium text-gray-900">{booking.time}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Keep Booking
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Cancelling...</span>
                </div>
              ) : (
                "Yes, Cancel"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarberBookings