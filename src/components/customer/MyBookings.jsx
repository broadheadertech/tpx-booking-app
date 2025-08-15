import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Calendar, Clock, User, QrCode, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import QRCode from 'qrcode'
import bookingService from '../../services/customer/bookingService'
import { useAuth } from '../../context/AuthContext'

const MyBookings = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth()
  const [bookings, setBookings] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [showQRCode, setShowQRCode] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBookingsData()
    }
  }, [isAuthenticated, user])

  const loadBookingsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Verify user is authenticated
      if (!isAuthenticated || !user) {
        setError('Please log in to view your bookings')
        return
      }
      
      // Use the new user-specific bookings endpoint
      const bookingsData = await bookingService.getUserBookings()
      
      // The new API returns bookings with nested service and barber data
      const bookingList = Array.isArray(bookingsData) ? bookingsData : []
      setBookings(bookingList)
      
      // No need to load separate services and barbers data as they're included in bookings
      setServices([])
      setBarbers([])
    } catch (error) {
      console.error('Error loading bookings data:', error)
      if (error.message.includes('not authenticated')) {
        setError('Authentication required. Please log in again.')
      } else {
        setError('Failed to load bookings')
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper functions are no longer needed as data is nested in booking objects
  // Service and barber data are now included directly in each booking

  const handleCancelBooking = async (bookingId) => {
    try {
      setCancelLoading(true)
      const result = await bookingService.cancelBooking(bookingId)
      if (result.success) {
        // Remove the booking from local state immediately for better UX
        setBookings(prevBookings => prevBookings.filter(booking => booking.id !== bookingId))
        setShowCancelModal(null)
        // Show success message briefly
        const successMsg = document.createElement('div')
        successMsg.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        successMsg.textContent = 'Booking cancelled successfully'
        document.body.appendChild(successMsg)
        setTimeout(() => document.body.removeChild(successMsg), 3000)
      } else {
        alert(`Failed to cancel booking: ${result.error}`)
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Failed to cancel booking. Please try again.')
    } finally {
      setCancelLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Calendar className="w-4 h-4" style={{color: '#8B8B8B'}} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const filteredBookings = bookings.filter(booking => {
    if (activeFilter === 'all') return true
    return booking.status === activeFilter
  })

  const filters = [
    { id: 'all', label: 'All Bookings', count: bookings.length },
    { id: 'confirmed', label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length },
    { id: 'pending', label: 'Pending', count: bookings.filter(b => b.status === 'pending').length },
    { id: 'cancelled', label: 'Cancelled', count: bookings.filter(b => b.status === 'cancelled').length }
  ]

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{backgroundColor: '#36454F'}}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-lg transition-all duration-200"
              style={{'&:hover': {color: '#F68B24'}}}
              onMouseEnter={(e) => e.target.style.color = '#F68B24'}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-sm font-bold text-white">My Bookings</p>
              <p className="text-xs" style={{color: '#F68B24'}}>{bookings.length} total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Filter Tabs */}
        <div className="mb-4">
          <div className="bg-white rounded-xl p-2 border shadow-sm" style={{borderColor: '#E0E0E0'}}>
            <div className="grid grid-cols-4 gap-1">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200`}
                  style={{
                    backgroundColor: activeFilter === filter.id ? '#F68B24' : 'transparent',
                    color: activeFilter === filter.id ? 'white' : '#8B8B8B'
                  }}
                  onMouseEnter={(e) => {
                    if (activeFilter !== filter.id) {
                      e.target.style.backgroundColor = '#F4F0E6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeFilter !== filter.id) {
                      e.target.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div>{filter.label}</div>
                  <div className="text-xs mt-1">({filter.count})</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#F68B24', opacity: 0.1}}>
              <Calendar className="w-8 h-8" style={{color: '#F68B24'}} />
            </div>
            <p className="text-sm" style={{color: '#8B8B8B'}}>Loading bookings...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#dc3545', opacity: 0.1}}>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button 
              onClick={loadBookingsData}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Bookings List */}
        {!loading && !error && (
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-3" style={{color: '#8B8B8B'}} />
                <h3 className="text-lg font-bold mb-2" style={{color: '#36454F'}}>No Bookings Found</h3>
                <p className="mb-4" style={{color: '#8B8B8B'}}>
                  {activeFilter === 'all' 
                    ? "You haven't made any bookings yet"
                    : `No ${activeFilter} bookings found`
                  }
                </p>
                <button
                  onClick={onBack}
                  className="px-6 py-3 text-white font-bold rounded-xl transition-all duration-200"
                  style={{backgroundColor: '#F68B24'}}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
                >
                  Book Your First Service
                </button>
              </div>
            ) : (
              filteredBookings.map((booking) => {
                // Service and barber data are now nested in the booking object
                const service = booking.service || {}
                const barber = booking.barber || {}
                
                return (
                  <div key={booking.id} className="bg-white rounded-xl p-4 border shadow-sm hover:shadow-lg transition-all duration-200" style={{borderColor: '#E0E0E0'}}>
                    {/* Booking Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                          <span className="text-white text-lg">✂️</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold" style={{color: '#36454F'}}>{service.name || 'Service'}</h3>
                          <p className="text-xs" style={{color: '#8B8B8B'}}>Code: {booking.booking_code}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(booking.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3" style={{color: '#F68B24'}} />
                        <div>
                          <p className="text-xs" style={{color: '#8B8B8B'}}>Date</p>
                          <p className="text-sm font-bold" style={{color: '#36454F'}}>{bookingService.formatBookingDate(booking.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3" style={{color: '#F68B24'}} />
                        <div>
                          <p className="text-xs" style={{color: '#8B8B8B'}}>Time</p>
                          <p className="text-sm font-bold" style={{color: '#36454F'}}>{bookingService.formatBookingTime(booking.time)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3" style={{color: '#F68B24'}} />
                        <div>
                          <p className="text-xs" style={{color: '#8B8B8B'}}>Barber</p>
                          <p className="text-sm font-bold" style={{color: '#36454F'}}>{barber.name || 'Any Barber'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded" style={{backgroundColor: '#F68B24'}}></div>
                        <div>
                          <p className="text-xs" style={{color: '#8B8B8B'}}>Price</p>
                          <p className="text-sm font-bold" style={{color: '#F68B24'}}>₱{service.price ? parseFloat(service.price).toLocaleString() : '--'}</p>
                        </div>
                      </div>
                    </div>



                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => setShowQRCode({...booking, service, barber})}
                          className="flex-1 py-2 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                          style={{backgroundColor: '#F68B24'}}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
                        >
                          <QrCode className="w-3 h-3" />
                          <span className="text-sm">Show QR</span>
                        </button>
                      )}
                      {booking.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => setShowCancelModal({...booking, service, barber})}
                            className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg transition-all duration-200 text-sm"
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#DC2626'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#EF4444'}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setShowQRCode({...booking, service, barber})}
                            className="flex-1 py-2 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                            style={{backgroundColor: '#F68B24'}}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
                          >
                            <QrCode className="w-3 h-3" />
                            <span>View QR</span>
                          </button>
                        </>
                      )}
                      {booking.status === 'cancelled' && (
                        <button 
                          onClick={onBack}
                          className="flex-1 py-2 text-white font-bold rounded-lg transition-all duration-200 text-sm"
                          style={{backgroundColor: '#F68B24'}}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
                        >
                          Book Again
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRCode && <QRCodeModal booking={showQRCode} onClose={() => setShowQRCode(null)} />}
      
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <CancelBookingModal 
          booking={showCancelModal} 
          onConfirm={() => handleCancelBooking(showCancelModal.id)}
          onClose={() => setShowCancelModal(null)}
          loading={cancelLoading}
        />
      )}
    </div>
  )
}

// QR Code Modal Component
const QRCodeModal = ({ booking, onClose }) => {
  const qrRef = useRef(null)
  
  // Generate QR code data
  const qrData = JSON.stringify({
    bookingId: booking.id,
    bookingCode: booking.booking_code,
    service: booking.service?.name,
    time: booking.time,
    barber: booking.barber?.name || 'Any Barber',
    date: booking.date,
    barbershop: 'TPX Barbershop'
  })

  useEffect(() => {
    // Small delay to ensure canvas is rendered in DOM
    const timer = setTimeout(() => {
      if (qrRef.current) {
        // Generate QR code as canvas
        QRCode.toCanvas(qrRef.current, qrData, {
          width: 160,
          margin: 2,
          color: {
            dark: '#36454F',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        }, (error) => {
          if (error) console.error('QR Code generation error:', error)
        })
      } else {
        console.error('Canvas ref not available in MyBookings QR modal')
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [qrData])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border" style={{borderColor: '#E0E0E0'}}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto" style={{backgroundColor: '#F68B24'}}>
            <QrCode className="w-6 h-6 text-white" />
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-1" style={{color: '#36454F'}}>Booking QR Code</h3>
            <p className="text-sm" style={{color: '#36454F'}}>Show this to staff when you arrive</p>
          </div>

          {/* Real QR Code */}
          <div className="p-4 rounded-xl" style={{backgroundColor: '#F4F0E6'}}>
            <div className="flex justify-center">
              <canvas ref={qrRef} className="rounded-lg"></canvas>
            </div>
          </div>

          {/* Booking Details */}
          <div className="rounded-xl p-3 text-left" style={{backgroundColor: '#F4F0E6', border: '1px solid #E0E0E0'}}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Service:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{booking.service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Date:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{new Date(booking.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Time:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{booking.time}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Barber:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{booking.barber?.name || 'Any Barber'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Code:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{booking.booking_code}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200"
            style={{backgroundColor: '#F68B24'}}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Cancel Booking Modal Component
const CancelBookingModal = ({ booking, onConfirm, onClose, loading }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border" style={{borderColor: '#E0E0E0'}}>
        <div className="text-center space-y-4">
          {/* Warning Icon */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-red-100">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          
          {/* Title and Message */}
          <div>
            <h3 className="text-xl font-bold mb-2" style={{color: '#36454F'}}>Cancel Booking?</h3>
            <p className="text-sm mb-4" style={{color: '#8B8B8B'}}>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
          </div>

          {/* Booking Details */}
          <div className="rounded-xl p-4 text-left" style={{backgroundColor: '#FEF2F2', border: '1px solid #FECACA'}}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Service:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{booking.service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Date:</span>
                <span className="font-bold" style={{color: '#36454F'}}>
                  {booking.date ? new Date(booking.date).toLocaleDateString() : 'Today'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Time:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{booking.time}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#36454F'}}>Barber:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{booking.barber?.name || 'Any Barber'}</span>
              </div>
              <div className="flex justify-between border-t pt-2" style={{borderColor: '#FECACA'}}>
                <span style={{color: '#36454F'}}>Code:</span>
                <span className="font-bold" style={{color: '#36454F'}}>{booking.booking_code}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 border-2 font-bold rounded-xl transition-all duration-200"
              style={{ borderColor: '#E0E0E0', color: '#8B8B8B' }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#F5F5F5')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = 'transparent')}
            >
              Keep Booking
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 text-white font-bold rounded-xl transition-all duration-200 ${
                loading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              style={{ backgroundColor: loading ? '#CCCCCC' : '#EF4444' }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#DC2626')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#EF4444')}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Cancelling...</span>
                </div>
              ) : (
                'Yes, Cancel'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyBookings