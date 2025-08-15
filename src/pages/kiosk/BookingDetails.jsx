import { CheckCircle } from 'lucide-react'

const BookingDetails = ({ scannedBooking, onDone }) => {
  if (!scannedBooking) return null

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
      <div className="text-center space-y-6">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl" style={{backgroundColor: '#4CAF50'}}>
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold mb-2" style={{color: '#36454F'}}>Booking Confirmed!</h3>
          <p className="text-lg" style={{color: '#4CAF50'}}>Welcome to TPX Barbershop</p>
        </div>

        {/* Booking Details */}
        <div className="rounded-xl p-4 text-left" style={{backgroundColor: '#F0F8FF', border: '1px solid #E0E0E0'}}>
          <h4 className="font-bold mb-3" style={{color: '#36454F'}}>Appointment Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{color: '#8B8B8B'}}>Service:</span>
              <span className="font-medium" style={{color: '#36454F'}}>{scannedBooking.service?.name}</span>
            </div>
            <div className="flex justify-between">
              <span style={{color: '#8B8B8B'}}>Date:</span>
              <span className="font-medium" style={{color: '#36454F'}}>{new Date(scannedBooking.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{color: '#8B8B8B'}}>Time:</span>
              <span className="font-medium" style={{color: '#36454F'}}>{scannedBooking.time}</span>
            </div>
            <div className="flex justify-between">
              <span style={{color: '#8B8B8B'}}>Barber:</span>
              <span className="font-medium" style={{color: '#36454F'}}>{scannedBooking.barber?.name || 'Any Barber'}</span>
            </div>
            <div className="flex justify-between pt-2" style={{borderTop: '1px solid #E0E0E0'}}>
              <span style={{color: '#8B8B8B'}}>Booking ID:</span>
              <span className="font-bold" style={{color: '#4CAF50'}}>{scannedBooking.booking_code}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-lg font-medium" style={{color: '#36454F'}}>Please have a seat and wait to be called</p>
          <button
            onClick={onDone}
            className="w-full py-3 text-white font-bold rounded-xl transition-colors duration-200"
            style={{backgroundColor: '#36454F'}}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2A3640'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#36454F'}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookingDetails
