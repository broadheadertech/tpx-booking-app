import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle, AlertCircle, Filter, Search, X, Scissors, MapPin, CreditCard, FileText, ChevronRight, MessageSquare } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { formatTime } from '../../utils/dateUtils'

const BarberBookings = () => {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCompleteModal, setShowCompleteModal] = useState(null)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)

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

  // Get bookings directly for this barber - no pagination limit issues
  const barberBookings = useQuery(
    api.services.bookings.getBookingsByBarber,
    currentBarber?._id ? { barberId: currentBarber._id } : "skip"
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
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Barber Profile Not Found</h2>
          <p className="text-gray-500 text-sm">Please contact admin to set up your barber profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="bg-[#0D0D0D] border-b border-[#1A1A1A] sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-white">Appointments</h1>
              <p className="text-xs text-gray-500">Manage bookings</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : 'Selected'}</div>
              <div className="text-sm font-bold text-[var(--color-primary)]">{filteredBookings.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Filters */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4 mb-4">
          {/* Status Filter Tabs */}
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                    statusFilter === status
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[#2A2A2A] text-gray-400'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Search Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                <label className="text-xs font-medium text-gray-400">Date</label>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-xl focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Search className="w-4 h-4 text-[var(--color-primary)]" />
                <label className="text-xs font-medium text-gray-400">Search</label>
              </div>
              <input
                type="text"
                placeholder="Customer or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white placeholder-gray-500 rounded-xl focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bookings List - Mobile Optimized */}
        <div className="space-y-3 md:space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 text-center">
              <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-white mb-2">No Appointments Found</h3>
              <p className="text-xs text-gray-500">
                {statusFilter === 'all'
                  ? 'No appointments scheduled for this date.'
                  : `No ${statusFilter} appointments for this date.`
                }
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div
                key={booking._id}
                onClick={() => setSelectedBooking(booking)}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                {/* Compact Card Layout */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    <span className="capitalize">{booking.status}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{formatTime(booking.time)}</span>
                </div>

                <h3 className="font-bold text-white text-sm mb-2">{booking.service_name}</h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-400 text-xs">
                    <User className="w-3 h-3 mr-1.5" />
                    <span>{booking.customer_name}</span>
                  </div>
                  <span className="font-bold text-[var(--color-primary)] text-sm">₱{booking.price}</span>
                </div>

                {/* {booking.customer_phone && (
                  <div className="flex items-center text-gray-500 text-xs mt-2">
                    <Phone className="w-3 h-3 mr-1.5" />
                    <span>{booking.customer_phone}</span>
                  </div>
                )} */}
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

      {/* Booking Details Bottom Sheet */}
      {selectedBooking && (
        <BookingDetailsSheet
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onConfirm={(id) => handleStatusUpdate(id, 'confirmed')}
          onCancel={(id) => handleStatusUpdate(id, 'cancelled')}
          onComplete={(booking) => {
            setSelectedBooking(null)
            handleCompleteBooking(booking)
          }}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
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
                <span className="font-medium text-gray-900">{formatTime(booking.time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium text-green-600">₱{booking.price}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {/* <div className="flex space-x-3">
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
          </div> */}
        </div>
      </div>
    </div>
  )
}

// Booking Details Bottom Sheet Component
const BookingDetailsSheet = ({ booking, onClose, onConfirm, onCancel, onComplete, getStatusColor, getStatusIcon }) => {
  if (!booking) return null

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet - positioned above bottom nav */}
      <div className="fixed bottom-20 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-[#0D0D0D] rounded-t-3xl max-h-[75vh] overflow-hidden border-t border-[#2A2A2A]">
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 pb-4 border-b border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Booking Details</h2>
              <button
                onClick={onClose}
                className="p-2 bg-[#1A1A1A] rounded-full"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 overflow-y-auto max-h-[55vh] space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center space-x-2 ${getStatusColor(booking.status)}`}>
                {getStatusIcon(booking.status)}
                <span className="capitalize">{booking.status}</span>
              </div>
              <span className="text-2xl font-bold text-[var(--color-primary)]">₱{booking.price}</span>
            </div>

            {/* Service Info Card */}
            <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-xl flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="text-white font-semibold">{booking.service_name}</p>
                </div>
              </div>
              {booking.duration && (
                <div className="flex items-center text-gray-400 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{booking.duration} minutes</span>
                </div>
              )}
            </div>

            {/* Date & Time Card */}
            <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Schedule</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-white font-medium">{formatDate(booking.date)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-white font-medium">{formatTime(booking.time)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info Card */}
            {/* <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Customer Information</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-white font-medium">{booking.customer_name}</p>
                  </div>
                </div>
                {booking.customer_phone && (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Phone</p>
                      <a href={`tel:${booking.customer_phone}`} className="text-[var(--color-primary)] font-medium">{booking.customer_phone}</a>
                    </div>
                    <a
                      href={`tel:${booking.customer_phone}`}
                      className="p-2 bg-[var(--color-primary)]/20 rounded-xl"
                    >
                      <Phone className="w-4 h-4 text-[var(--color-primary)]" />
                    </a>
                  </div>
                )}
                {booking.customer_email && (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-white font-medium truncate">{booking.customer_email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div> */}

            {/* Payment Info */}
            <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
              <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Payment</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-white font-bold text-lg">₱{booking.price}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  booking.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {booking.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </div>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
                <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Notes</h3>
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-[#2A2A2A] rounded-xl flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-gray-300 text-sm">{booking.notes}</p>
                </div>
              </div>
            )}

            {/* Booking ID */}
            <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Booking ID</p>
                  <p className="text-gray-400 font-mono text-xs">{booking._id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-gray-400 text-xs">{booking._creationTime ? new Date(booking._creationTime).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-5 py-4 border-t border-[#1A1A1A] bg-[#0D0D0D]">
            {booking.status === 'pending' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    onCancel(booking._id)
                    onClose()
                  }}
                  className="flex-1 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 rounded-xl font-medium active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm(booking._id)
                    onClose()
                  }}
                  className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium active:scale-95 transition-all"
                >
                  Confirm Booking
                </button>
              </div>
            )}
            {booking.status === 'confirmed' && (
              <button
                onClick={() => onComplete(booking)}
                className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium active:scale-95 transition-all"
              >
                Mark as Complete
              </button>
            )}
            {booking.status === 'completed' && (
              <div className="flex items-center justify-center py-3 bg-[#1A1A1A] rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-green-400 font-medium">Booking Completed</span>
              </div>
            )}
            {booking.status === 'cancelled' && (
              <div className="flex items-center justify-center py-3 bg-[#1A1A1A] rounded-xl">
                <XCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-400 font-medium">Booking Cancelled</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

export default BarberBookings
