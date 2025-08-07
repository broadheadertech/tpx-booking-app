import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Calendar, Clock, User, QrCode, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import QRCode from 'qrcode'

const MyBookings = ({ onBack }) => {
  const [bookings, setBookings] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [showQRCode, setShowQRCode] = useState(null)

  useEffect(() => {
    // Load bookings from localStorage (in real app, this would be from API)
    const savedBookings = JSON.parse(localStorage.getItem('userBookings') || '[]')
    setBookings(savedBookings)
  }, [])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Calendar className="w-5 h-5 text-gray-500" />
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
        return 'bg-gray-50 text-gray-700 border-gray-200'
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black sticky top-0 z-40 shadow-lg">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white hover:text-[#FF6644] font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-lg font-bold text-white">My Bookings</p>
              <p className="text-xs text-[#FF6644]">{bookings.length} total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl p-2 border-2 border-gray-200 shadow-sm">
            <div className="grid grid-cols-4 gap-1">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeFilter === filter.id
                      ? 'bg-[#FF6644] text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div>{filter.label}</div>
                  <div className="text-xs mt-1">({filter.count})</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-black mb-2">No Bookings Found</h3>
              <p className="text-gray-600 mb-6">
                {activeFilter === 'all' 
                  ? "You haven't made any bookings yet"
                  : `No ${activeFilter} bookings found`
                }
              </p>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-[#FF6644] hover:bg-[#FF5533] text-white font-bold rounded-2xl transition-all duration-200"
              >
                Book Your First Service
              </button>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200">
                {/* Booking Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{booking.service?.image || '✂️'}</div>
                    <div>
                      <h3 className="text-lg font-black text-black">{booking.service?.name}</h3>
                      <p className="text-sm text-gray-600">Booking ID: {booking.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(booking.status)}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(booking.status)}`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[#FF6644]" />
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-bold text-black">{new Date(booking.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#FF6644]" />
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="text-sm font-bold text-black">{booking.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-[#FF6644]" />
                    <div>
                      <p className="text-xs text-gray-500">Barber</p>
                      <p className="text-sm font-bold text-black">{booking.staff?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-[#FF6644] rounded"></div>
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-sm font-bold text-[#FF6644]">₱{booking.service?.price?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => setShowQRCode(booking)}
                      className="flex-1 py-3 bg-[#FF6644] hover:bg-[#FF5533] text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Show QR Code</span>
                    </button>
                  )}
                  {booking.status === 'pending' && (
                    <>
                      <button className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all duration-200">
                        Cancel
                      </button>
                      <button className="flex-1 py-3 bg-[#FF6644] hover:bg-[#FF5533] text-white font-bold rounded-xl transition-all duration-200">
                        Reschedule
                      </button>
                    </>
                  )}
                  {booking.status === 'cancelled' && (
                    <button className="flex-1 py-3 bg-[#FF6644] hover:bg-[#FF5533] text-white font-bold rounded-xl transition-all duration-200">
                      Book Again
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRCode && <QRCodeModal booking={showQRCode} onClose={() => setShowQRCode(null)} />}
    </div>
  )
}

// QR Code Modal Component
const QRCodeModal = ({ booking, onClose }) => {
  const qrRef = useRef(null)
  
  // Generate QR code data
  const qrData = JSON.stringify({
    bookingId: booking.id,
    service: booking.service?.name,
    time: booking.time,
    staff: booking.staff?.name,
    date: booking.date,
    barbershop: 'TPX Barbershop'
  })

  useEffect(() => {
    if (qrRef.current) {
      // Generate QR code as canvas
      QRCode.toCanvas(qrRef.current, qrData, {
        width: 192,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      }, (error) => {
        if (error) console.error('QR Code generation error:', error)
      })
    }
  }, [qrData])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-[#FF6644] rounded-full flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h3 className="text-xl font-black text-black mb-2">Booking QR Code</h3>
            <p className="text-gray-600 font-medium">Show this to staff when you arrive</p>
          </div>

          {/* Real QR Code */}
          <div className="bg-gray-50 p-6 rounded-2xl">
            <div className="flex justify-center">
              <canvas ref={qrRef} className="rounded-xl"></canvas>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-[#FF6644]/5 rounded-2xl p-4 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-bold text-black">{booking.service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-bold text-black">{new Date(booking.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-bold text-black">{booking.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Barber:</span>
                <span className="font-bold text-black">{booking.staff?.name}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-4 bg-[#FF6644] hover:bg-[#FF5533] text-white font-bold rounded-2xl transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default MyBookings