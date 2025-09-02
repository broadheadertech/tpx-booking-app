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

  // Get barber data
  const barbers = useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)
  
  // Mutation to create barber profile
  const createBarberProfile = useMutation(api.services.barbers.createBarberProfile)
  
  // Auto-create barber profile if user has barber role but no profile
  React.useEffect(() => {
    if (user?.role === 'barber' && barbers && !currentBarber && user._id) {
      createBarberProfile({ userId: user._id })
        .catch((error) => {
          console.error('Failed to create barber profile:', error)
        })
    }
  }, [user, barbers, currentBarber, createBarberProfile])

  // Get bookings for this barber
  const allBookings = useQuery(api.services.bookings.getAllBookings)
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
  const updateBookingStatus = useMutation(api.services.bookings.updateBookingStatus)

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await updateBookingStatus({ id: bookingId, status: newStatus })
    } catch (error) {
      console.error('Failed to update booking status:', error)
      alert('Failed to update booking status')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'completed': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      case 'pending': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
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
      
      {/* Mobile Header */}
      <div className="relative z-10 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 py-3 md:max-w-7xl md:mx-auto md:px-6 lg:px-8 md:py-6">
          <div className="flex items-center justify-between md:block">
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-white">Appointments</h1>
              <p className="text-sm text-gray-400 mt-1 hidden md:block">Manage your daily bookings and appointments</p>
            </div>
            <div className="text-right md:hidden">
              <div className="text-xs text-gray-400">Total</div>
              <div className="text-sm font-semibold text-[#FF8C42]">{filteredBookings.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8 py-4 md:py-6">
        {/* Mobile-First Filters */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 mb-4 md:mb-6">
          {/* Mobile Filter Tabs */}
          <div className="md:hidden mb-4">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white'
                      : 'bg-[#444444] text-gray-300 hover:bg-[#555555]'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 md:inline">
                <Calendar className="w-4 h-4 inline mr-2" />
                <span className="hidden md:inline">Date</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-base"
              />
            </div>

            {/* Desktop Status Filter */}
            <div className="hidden md:block">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 md:inline">
                <Search className="w-4 h-4 inline mr-2" />
                <span className="hidden md:inline">Search</span>
              </label>
              <input
                type="text"
                placeholder="Search customer or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-base"
              />
            </div>
          </div>
        </div>

        {/* Bookings List - Mobile Optimized */}
        <div className="space-y-3 md:space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-6 md:p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">No Appointments Found</h3>
              <p className="text-sm md:text-base text-gray-400">
                {statusFilter === 'all' 
                  ? 'No appointments scheduled for this date.'
                  : `No ${statusFilter} appointments for this date.`
                }
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking._id} className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 active:scale-[0.98] transition-transform">
                {/* Mobile-First Layout */}
                <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
                  <div className="flex-1">
                    {/* Header with Status and Time */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`px-3 py-1 rounded-full border text-xs md:text-sm font-medium flex items-center space-x-1 ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="capitalize">{booking.status}</span>
                      </div>
                      <div className="flex items-center text-gray-400 text-sm font-medium">
                        <Clock className="w-4 h-4 mr-1" />
                        {booking.time}
                      </div>
                    </div>

                    {/* Service and Customer Info */}
                    <div className="mb-3">
                      <h3 className="text-base md:text-lg font-bold text-white mb-1">{booking.service_name}</h3>
                      <div className="flex items-center text-gray-400 text-sm">
                        <User className="w-4 h-4 mr-2" />
                        <span className="truncate">{booking.customer_name}</span>
                      </div>
                    </div>
                    
                    {/* Contact Info - Collapsible on Mobile */}
                    <div className="space-y-1 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                      {booking.customer_phone && (
                        <div className="flex items-center text-gray-400 text-sm">
                          <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{booking.customer_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between md:justify-start">
                        <span className="text-gray-400 text-sm md:hidden">Price:</span>
                        <span className="font-semibold text-[#FF8C42] text-lg md:text-base">₱{booking.price}</span>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mt-3 p-3 bg-[#1A1A1A] rounded-lg">
                        <p className="text-sm text-gray-300">
                          <strong>Notes:</strong> {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Mobile Optimized */}
                  <div className="flex gap-2 md:flex-col md:ml-6 md:min-w-[120px]">
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                          className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all text-sm font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
                          className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusUpdate(booking._id, 'completed')}
                        className="w-full md:w-auto px-4 py-3 md:py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] active:scale-95 transition-all text-sm font-medium"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default BarberBookings