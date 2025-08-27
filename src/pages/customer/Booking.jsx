import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { useAuth } from '../../context/AuthContext'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function CustomerBooking() {
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [error, setError] = useState('')
  const [bookingResult, setBookingResult] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  // Convex queries and mutations
  const services = useQuery(api.services.services.getActiveServices)
  const barbers = useQuery(api.services.barbers.getActiveBarbers)
  const createBookingMutation = useMutation(api.services.bookings.createBooking)

  const loading = services === undefined || barbers === undefined

  const availableTimes = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00'
  ]

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
  }, [isAuthenticated, navigate])

  const formatPrice = (price) => {
    return `₱${parseFloat(price).toFixed(2)}`
  }

  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${hour12}:${minutes} ${ampm}`
  }

  const generateQRCode = async (bookingCode) => {
    try {
      const qrUrl = await QRCode.toDataURL(bookingCode, {
        width: 200,
        margin: 2,
        color: {
          dark: '#36454F',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(qrUrl)
    } catch (err) {
      console.error('Error generating QR code:', err)
    }
  }

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      setError('Please select service, date, and time')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Format time as HH:MM:SS for API
      const formattedTime = selectedTime.includes(':') ? `${selectedTime}:00` : selectedTime
      
      const bookingData = {
        service: selectedService.id,
        date: selectedDate,
        time: formattedTime,
        ...(selectedBarber && { barber: selectedBarber.id })
      }

      const result = await createBookingMutation({
        customer: user.id,
        service: selectedService._id,
        barber: selectedBarber ? selectedBarber._id : undefined,
        date: selectedDate,
        time: formattedTime,
        status: 'pending'
      })

      setBookingResult(result)
      if (result.booking_code) {
        await generateQRCode(result.booking_code)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Booking error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewBooking = () => {
    setBookingResult(null)
    setQrCodeUrl('')
    setSelectedService(null)
    setSelectedDate('')
    setSelectedTime('')
    setSelectedBarber(null)
    setError('')
  }

  if (loading && !services.length) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F0E6' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#F68B24' }}></div>
          <p style={{ color: '#36454F' }}>Loading booking options...</p>
        </div>
      </div>
    )
  }

  if (bookingResult) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F4F0E6' }}>
        <header style={{ backgroundColor: '#36454F' }} className="shadow-sm sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center">
            <h1 className="text-xl font-bold" style={{ color: '#F4F0E6' }}>Booking Confirmed</h1>
          </div>
        </header>

        <div className="px-4 py-6 space-y-6">
          <Card style={{ backgroundColor: 'white', border: '2px solid #22C55E' }}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-xl font-bold text-green-600 mb-2">Booking Confirmed!</h2>
              <p className="text-sm" style={{ color: '#8B8B8B' }}>Your appointment has been successfully booked</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="font-medium" style={{ color: '#36454F' }}>Booking Code:</span>
                <span className="font-bold" style={{ color: '#F68B24' }}>{bookingResult.booking_code}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#36454F' }}>Service:</span>
                <span style={{ color: '#36454F' }}>{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#36454F' }}>Date:</span>
                <span style={{ color: '#36454F' }}>{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#36454F' }}>Time:</span>
                <span style={{ color: '#36454F' }}>{formatTime(selectedTime)}</span>
              </div>
              {selectedBarber && (
                <div className="flex justify-between">
                  <span style={{ color: '#36454F' }}>Barber:</span>
                  <span style={{ color: '#36454F' }}>{selectedBarber.full_name}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid #E0E0E0' }}>
                <span style={{ color: '#36454F' }}>Total:</span>
                <span style={{ color: '#F68B24' }}>{formatPrice(selectedService.price)}</span>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="text-center mb-6">
                <h3 className="font-semibold mb-3" style={{ color: '#36454F' }}>QR Code</h3>
                <img src={qrCodeUrl} alt="Booking QR Code" className="mx-auto" />
                <p className="text-xs mt-2" style={{ color: '#8B8B8B' }}>Show this QR code at the barbershop</p>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/customer/dashboard')}
                className="w-full"
                style={{ backgroundColor: '#F68B24', color: 'white' }}
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={handleNewBooking}
                className="w-full"
                style={{ backgroundColor: 'white', color: '#36454F', border: '1px solid #E0E0E0' }}
              >
                Book Another Appointment
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F0E6' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#36454F' }} className="shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center">
          <Link to="/customer/dashboard" className="mr-4">
            <span className="text-xl" style={{ color: '#F4F0E6' }}>←</span>
          </Link>
          <h1 className="text-xl font-bold" style={{ color: '#F4F0E6' }}>Book Appointment</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Step 1: Select Service */}
        {error && (
          <Card style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>1. Choose Service</h2>
          <div className="grid gap-3">
            {services.map((service) => (
              <Card 
                key={service.id}
                className="cursor-pointer transition-all"
                style={{
                  backgroundColor: 'white',
                  border: selectedService?.id === service.id ? '2px solid #F68B24' : '1px solid #E0E0E0'
                }}
                onClick={() => setSelectedService(service)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: '#36454F' }}>{service.name}</h3>
                    <p className="text-sm mt-1" style={{ color: '#8B8B8B' }}>{service.description}</p>
                    <p className="text-sm mt-2" style={{ color: '#8B8B8B' }}>{service.duration_minutes} minutes</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-lg" style={{ color: '#F68B24' }}>{formatPrice(service.price)}</p>
                  </div>
                </div>
                {selectedService?.id === service.id && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F68B24' }}>
                    <span className="text-sm font-medium" style={{ color: '#F68B24' }}>✓ Selected</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Step 2: Select Date */}
        {selectedService && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>2. Choose Date</h2>
            <Card style={{ backgroundColor: 'white', border: '1px solid #E0E0E0' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border-2 rounded-lg focus:outline-none"
                style={{ borderColor: '#E0E0E0' }}
                onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              />
            </Card>
          </div>
        )}

        {/* Step 3: Select Time */}
        {selectedService && selectedDate && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>3. Choose Time</h2>
            <div className="grid grid-cols-3 gap-2">
              {availableTimes.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className="p-3 rounded-lg border-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: selectedTime === time ? '#F68B24' : 'white',
                    borderColor: selectedTime === time ? '#F68B24' : '#E0E0E0',
                    color: selectedTime === time ? 'white' : '#36454F'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTime !== time) {
                      e.target.style.borderColor = '#F68B24'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTime !== time) {
                      e.target.style.borderColor = '#E0E0E0'
                    }
                  }}
                >
                  {formatTime(time)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Select Barber (Optional) */}
        {selectedService && selectedDate && selectedTime && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>4. Choose Barber (Optional)</h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedBarber(null)}
                className="w-full p-4 rounded-lg border-2 text-left transition-colors"
                style={{
                  backgroundColor: selectedBarber === null ? 'rgba(246, 139, 36, 0.1)' : 'white',
                  borderColor: selectedBarber === null ? '#F68B24' : '#E0E0E0'
                }}
                onMouseEnter={(e) => {
                  if (selectedBarber !== null) {
                    e.target.style.borderColor = '#F68B24'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedBarber !== null) {
                    e.target.style.borderColor = '#E0E0E0'
                  }
                }}
              >
                <span className="font-medium" style={{ color: '#36454F' }}>No preference</span>
                <p className="text-sm" style={{ color: '#8B8B8B' }}>Any available barber</p>
              </button>
              
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => setSelectedBarber(barber)}
                  className="w-full p-4 rounded-lg border-2 text-left transition-colors"
                  style={{
                    backgroundColor: selectedBarber?.id === barber.id ? 'rgba(246, 139, 36, 0.1)' : 'white',
                    borderColor: selectedBarber?.id === barber.id ? '#F68B24' : '#E0E0E0'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBarber?.id !== barber.id) {
                      e.target.style.borderColor = '#F68B24'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBarber?.id !== barber.id) {
                      e.target.style.borderColor = '#E0E0E0'
                    }
                  }}
                >
                  <span className="font-medium" style={{ color: '#36454F' }}>{barber.full_name}</span>
                  <p className="text-sm" style={{ color: '#8B8B8B' }}>Professional barber</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm Booking Button */}
        {selectedService && selectedDate && selectedTime && !bookingResult && (
          <div className="mt-6">
            <Button 
              onClick={handleBooking}
              disabled={loading}
              className="w-full transition-colors"
              style={{ 
                backgroundColor: loading ? '#8B8B8B' : '#F68B24', 
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.backgroundColor = '#E67E22'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.backgroundColor = '#F68B24'
              }}
            >
              {loading ? 'Creating Booking...' : 'Confirm Booking'}
            </Button>
          </div>
        )}

      </div>

      {/* Add padding to prevent content from being cut off */}
      <div className="h-8"></div>
    </div>
  )
}

export default CustomerBooking