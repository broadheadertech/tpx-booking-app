import React, { useState, useMemo } from 'react'
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Search, X, Scissors, CreditCard, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { formatTime } from '../../utils/dateUtils'

const BarberBookings = () => {
  const { user } = useCurrentUser()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  // Get barber data
  const barbers = user?.branch_id
    ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
    : useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)

  // Auto-create barber profile
  const createBarberProfile = useMutation(api.services.barbers.createBarberProfile)
  React.useEffect(() => {
    if (user?.role === 'barber' && barbers && !currentBarber && user._id && user.branch_id) {
      createBarberProfile({ userId: user._id, branch_id: user.branch_id })
        .catch((error) => console.error('Failed to create barber profile:', error))
    }
  }, [user, barbers, currentBarber, createBarberProfile])

  // Get bookings
  const allBookingsData = user?.branch_id
    ? useQuery(api.services.bookings.getBookingsByBranch, { branch_id: user.branch_id, limit: 100 })
    : useQuery(api.services.bookings.getAllBookings, { limit: 100 })
  const allBookings = allBookingsData?.bookings || []
  const barberBookings = allBookings.filter(booking => booking.barber === currentBarber?._id)

  // Sort and filter bookings
  const filteredBookings = useMemo(() => {
    return barberBookings
      .filter(booking => {
        const matchesDate = booking.date === selectedDate
        const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
        const matchesSearch = searchTerm === '' ||
          booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.service_name?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesDate && matchesStatus && matchesSearch
      })
      .sort((a, b) => {
        if (!a.time || !b.time) return 0
        return a.time.localeCompare(b.time)
      })
  }, [barberBookings, selectedDate, statusFilter, searchTerm])

  // Status counts for filter badges
  const statusCounts = useMemo(() => {
    const dateBookings = barberBookings.filter(b => b.date === selectedDate)
    return {
      all: dateBookings.length,
      pending: dateBookings.filter(b => b.status === 'pending').length,
      confirmed: dateBookings.filter(b => b.status === 'confirmed').length,
      completed: dateBookings.filter(b => b.status === 'completed').length,
      cancelled: dateBookings.filter(b => b.status === 'cancelled').length,
    }
  }, [barberBookings, selectedDate])

  // Now-line position for today
  const currentMinutes = useMemo(() => {
    if (!isToday) return -1
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  }, [isToday])

  // Find focus index (for today only)
  const focusIndex = useMemo(() => {
    if (!isToday || filteredBookings.length === 0) return -1
    for (let i = 0; i < filteredBookings.length; i++) {
      const b = filteredBookings[i]
      if (b.status === 'completed' || b.status === 'cancelled') continue
      if (!b.time) continue
      const [h, m] = b.time.split(':').map(Number)
      const bookingMins = h * 60 + m
      if (bookingMins + (b.service_duration || 30) > currentMinutes) return i
    }
    return -1
  }, [isToday, filteredBookings, currentMinutes])

  // Date navigation helpers
  const navigateDate = (direction) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + direction)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const formatDateLabel = (dateStr) => {
    if (dateStr === today) return 'Today'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Barber Profile Not Found</h2>
          <p className="text-gray-500 text-sm">Please contact admin to set up your barber profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6 max-w-4xl mx-auto">
      {/* Sticky Filters Section */}
      <div className="sticky top-[52px] md:top-[60px] z-10 bg-[#0D0D0D] px-4 pt-3 pb-2 space-y-3">
        {/* Date Navigation */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDate(-1)}
              className="w-9 h-9 flex items-center justify-center bg-[#2A2A2A] rounded-xl active:scale-95 transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => setSelectedDate(today)}
              className="flex-1 mx-3 text-center"
            >
              <p className={`text-sm font-bold ${isToday ? 'text-[var(--color-primary)]' : 'text-white'}`}>
                {formatDateLabel(selectedDate)}
              </p>
              <p className="text-[10px] text-gray-500">
                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </button>
            <button
              onClick={() => navigateDate(1)}
              className="w-9 h-9 flex items-center justify-center bg-[#2A2A2A] rounded-xl active:scale-95 transition-all"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Status Filters with Counts */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'completed', label: 'Done' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 flex items-center space-x-1 ${
                statusFilter === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400'
              }`}
            >
              <span>{label}</span>
              {statusCounts[key] > 0 && (
                <span className={`px-1 py-0.5 rounded-full text-[10px] font-bold ${
                  statusFilter === key ? 'bg-white/20' : 'bg-[#2A2A2A]'
                }`}>
                  {statusCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search customer or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white placeholder-gray-500 rounded-xl text-sm focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Bookings Timeline */}
      <div className="px-4 mt-2">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-white mb-1">No Appointments</h3>
            <p className="text-xs text-gray-500">
              {statusFilter === 'all'
                ? `No bookings for ${formatDateLabel(selectedDate).toLowerCase()}.`
                : `No ${statusFilter} bookings for ${formatDateLabel(selectedDate).toLowerCase()}.`
              }
            </p>
          </div>
        ) : (
          <div className="relative">
            {filteredBookings.map((booking, index) => {
              const isFocused = index === focusIndex
              const isPast = booking.status === 'completed'
              const isCancelled = booking.status === 'cancelled'
              const [bH, bM] = (booking.time || '00:00').split(':').map(Number)
              const bookingMins = bH * 60 + bM

              // Show now-line before this booking if applicable
              const prevBooking = index > 0 ? filteredBookings[index - 1] : null
              const prevMins = prevBooking?.time
                ? prevBooking.time.split(':').map(Number).reduce((h, m) => h * 60 + m)
                : 0
              const showNowLine = isToday && !isPast && !isCancelled &&
                currentMinutes >= (prevBooking ? prevMins : 0) &&
                currentMinutes < bookingMins &&
                index === focusIndex

              return (
                <div key={booking._id}>
                  {/* Now Line */}
                  {showNowLine && (
                    <div className="relative flex items-center px-4 py-1 border-l-2 border-l-transparent">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <div className="flex-1 h-[2px] bg-red-500 ml-1" />
                      <span className="text-[10px] text-red-400 font-medium ml-2 shrink-0">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Booking Row */}
                  <div
                    onClick={() => setSelectedBooking(booking)}
                    className={`px-3 md:px-4 py-3 cursor-pointer active:bg-[#2A2A2A] transition-all border-l-2 ${
                      isFocused
                        ? 'bg-[var(--color-primary)]/5 border-l-[var(--color-primary)]'
                        : 'border-l-transparent'
                    } ${isPast ? 'opacity-40' : ''} ${isCancelled ? 'opacity-25' : ''} ${
                      index < filteredBookings.length - 1 ? 'border-b border-[#2A2A2A]/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Time */}
                      <div className="w-12 text-center shrink-0">
                        <p className={`text-xs font-bold ${isFocused ? 'text-white' : 'text-gray-400'}`}>
                          {formatTime(booking.time).split(" ")[0]}
                        </p>
                        <p className="text-[9px] text-gray-600">
                          {formatTime(booking.time).split(" ")[1]}
                        </p>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isFocused ? 'text-white' : 'text-gray-300'}`}>
                          {booking.customer_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] text-gray-500 truncate">
                            {booking.service_name}
                          </p>
                          {booking.service_duration > 0 && (
                            <span className="text-[10px] text-gray-600 shrink-0">
                              · {booking.service_duration}min
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5 shrink-0 ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                      </div>

                      {/* Price + Arrow */}
                      <div className="text-right shrink-0 flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isFocused ? 'text-[var(--color-primary)]' : 'text-gray-400'}`}>
                          ₱{booking.price}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Now line at bottom if all past */}
            {isToday && focusIndex === -1 && filteredBookings.length > 0 && (
              <div className="relative flex items-center px-4 py-1 border-l-2 border-l-transparent">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 h-[2px] bg-red-500 ml-1" />
                <span className="text-[10px] text-red-400 font-medium ml-2 shrink-0">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Booking Details Bottom Sheet */}
      {selectedBooking && (
        <BookingDetailsSheet
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      )}
    </div>
  )
}

// Booking Details Bottom Sheet (View Only)
const BookingDetailsSheet = ({ booking, onClose, getStatusColor, getStatusIcon }) => {
  if (!booking) return null

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed bottom-20 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-[#0D0D0D] rounded-t-3xl max-h-[70vh] overflow-hidden border-t border-[#2A2A2A]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 pb-3 border-b border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">{booking.customer_name}</h2>
                <p className="text-xs text-gray-500">{formatDate(booking.date)} at {formatTime(booking.time)}</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-[#1A1A1A] rounded-xl">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 overflow-y-auto max-h-[50vh] space-y-3">
            {/* Status + Price Row */}
            <div className="flex items-center justify-between">
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 ${getStatusColor(booking.status)}`}>
                {getStatusIcon(booking.status)}
                <span className="capitalize">{booking.status}</span>
              </div>
              <span className="text-xl font-bold text-[var(--color-primary)]">₱{booking.price}</span>
            </div>

            {/* Service */}
            <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{booking.service_name}</p>
                  {booking.service_duration > 0 && (
                    <p className="text-[10px] text-gray-500">{booking.service_duration} minutes</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-[#2A2A2A] rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment</p>
                    <p className="text-white font-medium text-sm">₱{booking.price}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${
                  booking.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {booking.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </div>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 bg-[#2A2A2A] rounded-lg flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-gray-300 text-xs pt-2">{booking.notes}</p>
                </div>
              </div>
            )}

            {/* Booking Code */}
            {booking.booking_code && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-gray-600">Code: {booking.booking_code}</span>
              </div>
            )}
          </div>

          {/* Status Footer */}
          <div className="px-5 py-3 border-t border-[#1A1A1A] bg-[#0D0D0D]">
            <div className={`flex items-center justify-center py-2.5 rounded-xl ${
              booking.status === 'completed' ? 'bg-green-500/10' :
              booking.status === 'cancelled' ? 'bg-red-500/10' :
              booking.status === 'confirmed' ? 'bg-blue-500/10' :
              'bg-yellow-500/10'
            }`}>
              {getStatusIcon(booking.status)}
              <span className={`ml-2 font-medium text-sm capitalize ${
                booking.status === 'completed' ? 'text-green-400' :
                booking.status === 'cancelled' ? 'text-red-400' :
                booking.status === 'confirmed' ? 'text-blue-400' :
                'text-yellow-400'
              }`}>{booking.status}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

export default BarberBookings
