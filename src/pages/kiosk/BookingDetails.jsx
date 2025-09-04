import { CheckCircle, XCircle, RefreshCw, Calendar, User, Clock, QrCode } from 'lucide-react'

const BookingDetails = ({ scannedBooking, onDone, onValidateAndConfirm, isProcessingBooking }) => {
  console.log('BookingDetails rendering with:', scannedBooking)
  if (!scannedBooking) return null

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-700 bg-green-100 border-green-200'
      case 'pending': return 'text-yellow-700 bg-yellow-100 border-yellow-200'
      case 'completed': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'cancelled': return 'text-red-700 bg-red-100 border-red-200'
      case 'scanned': return 'text-blue-700 bg-blue-100 border-blue-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': 
      case 'pending': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'completed': return <CheckCircle className="w-5 h-5 text-blue-600" />
      case 'cancelled':
      case 'invalid': return <XCircle className="w-5 h-5 text-red-600" />
      case 'scanned': return <QrCode className="w-5 h-5 text-blue-600" />
      default: return <XCircle className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 shadow-xl border border-[#444444]/50">
      <div className="space-y-6">
        {/* Booking Header with Status */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {getStatusIcon(scannedBooking.status)}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white font-mono">
                {scannedBooking.id}
              </h3>
              <span className={`px-3 py-1 text-sm font-bold rounded-full border-2 uppercase ${getStatusColor(scannedBooking.status)}`}>
                {scannedBooking.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="font-bold text-gray-400 text-sm">Customer:</span>
                    <p className="text-white font-semibold">{scannedBooking.customer}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <QrCode className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="font-bold text-gray-400 text-sm">Service:</span>
                    <p className="text-white font-semibold">{scannedBooking.service?.name}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="font-bold text-gray-400 text-sm">Date & Time:</span>
                    <p className="text-white font-semibold">{scannedBooking.date} at {scannedBooking.time}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="font-bold text-gray-400 text-sm">Staff:</span>
                    <p className="text-white font-semibold">{scannedBooking.barber?.name}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {scannedBooking.phone !== 'N/A' && (
              <div className="mt-4 pt-3 border-t border-[#444444]/50">
                <span className="font-bold text-gray-400 text-sm">Phone:</span>
                <p className="text-white font-semibold">{scannedBooking.phone}</p>
              </div>
            )}
            
            {/* Status Messages */}
            {scannedBooking.status === 'confirmed' && (
              <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-xl">
                <p className="text-green-300 font-bold text-sm">✓ Booking confirmed - Ready for service!</p>
              </div>
            )}
            
            {scannedBooking.status === 'scanned' && (
              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-xl">
                <p className="text-blue-300 font-bold text-sm">📱 QR Code scanned - Please confirm your booking</p>
              </div>
            )}
            
            {scannedBooking.status === 'pending' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-800 font-bold text-sm">⏳ Confirming booking...</p>
              </div>
            )}
            
            {scannedBooking.status === 'completed' && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-gray-800 font-bold text-sm">✓ This booking has already been completed</p>
              </div>
            )}
            
            {scannedBooking.status === 'cancelled' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 font-bold text-sm">✗ This booking has been cancelled</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {scannedBooking.status === 'scanned' && (
            <button
              onClick={onValidateAndConfirm}
              disabled={isProcessingBooking}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl transition-all duration-200 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isProcessingBooking ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Confirm Booking</span>
                </>
              )}
            </button>
          )}
          
          <button
            onClick={onDone}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-[#1A1A1A] border border-[#444444] text-white font-bold rounded-xl transition-all duration-200 hover:bg-[#2A2A2A] hover:border-[#FF8C42]/50 shadow-lg"
          >
            <XCircle className="w-5 h-5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingDetails
