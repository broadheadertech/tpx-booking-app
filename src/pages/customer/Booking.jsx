import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import BranchSelection from '../../components/customer/BranchSelection'
import { useAuth } from '../../context/AuthContext'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function CustomerBooking() {
  const [selectedBranch, setSelectedBranch] = useState(null)
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
  const services = selectedBranch 
    ? useQuery(api.services.services.getActiveServicesByBranch, { branch_id: selectedBranch._id })
    : undefined
  const barbers = selectedBranch
    ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: selectedBranch._id })
    : undefined
  const createBookingMutation = useMutation(api.services.bookings.createBooking)

  const loading = selectedBranch && (services === undefined || barbers === undefined)

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
    if (!selectedBranch || !selectedService || !selectedDate || !selectedTime) {
      setError('Please select branch, service, date, and time')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Format time as HH:MM:SS for API
      const formattedTime = selectedTime.includes(':') ? `${selectedTime}:00` : selectedTime

      const result = await createBookingMutation({
        customer: user.id,
        branch_id: selectedBranch._id,
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
    setSelectedBranch(null)
    setSelectedService(null)
    setSelectedDate('')
    setSelectedTime('')
    setSelectedBarber(null)
    setError('')
  }

  if (loading && !services.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8C42] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading booking options...</p>
        </div>
      </div>
    )
  }

  if (bookingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
        {/* Subtle background pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        </div>
        
        <header className="bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30 shadow-sm sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center">
            <h1 className="text-xl font-bold text-white">Booking Confirmed</h1>
          </div>
        </header>

        <div className="relative z-10 px-4 py-6 space-y-6">
          <Card className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl border-2 border-green-500/50">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-green-400">✓</span>
              </div>
              <h2 className="text-xl font-bold text-green-400 mb-2">Booking Confirmed!</h2>
              <p className="text-sm text-gray-400">Your appointment has been successfully booked</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="font-medium text-gray-300">Booking Code:</span>
                <span className="font-bold text-[#FF8C42]">{bookingResult.booking_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Branch:</span>
                <span className="text-white">{selectedBranch.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Service:</span>
                <span className="text-white">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Date:</span>
                <span className="text-white">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Time:</span>
                <span className="text-white">{formatTime(selectedTime)}</span>
              </div>
              {selectedBarber && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Barber:</span>
                  <span className="text-white">{selectedBarber.full_name}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-[#555555]">
                <span className="text-gray-300">Total:</span>
                <span className="text-[#FF8C42]">{formatPrice(selectedService.price)}</span>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="text-center mb-6">
                <h3 className="font-semibold mb-3 text-white">QR Code</h3>
                <div className="bg-white p-4 rounded-xl inline-block">
                  <img src={qrCodeUrl} alt="Booking QR Code" className="mx-auto" />
                </div>
                <p className="text-xs mt-2 text-gray-400">Show this QR code at the barbershop</p>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/customer/dashboard')}
                className="w-full bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={handleNewBooking}
                className="w-full bg-[#444444] text-gray-300 border border-[#555555] hover:bg-[#555555] transition-colors"
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
        {/* Error Display */}
        {error && (
          <Card style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        {/* Step 1: Select Branch */}
        {!selectedBranch && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>1. Choose Branch</h2>
            <BranchSelection 
              onBranchSelect={setSelectedBranch} 
              selectedBranchId={selectedBranch?._id}
            />
          </div>
        )}

        {/* Step 2: Select Service */}
        {selectedBranch && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: '#36454F' }}>2. Choose Service</h2>
              <button
                onClick={() => setSelectedBranch(null)}
                className="text-sm px-3 py-1 rounded border"
                style={{ color: '#F68B24', borderColor: '#F68B24' }}
              >
                Change Branch
              </button>
            </div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{selectedBranch.name}</strong> - {selectedBranch.address}
              </p>
            </div>
            {!services || services.length === 0 ? (
              <Card style={{ backgroundColor: 'white', border: '1px solid #E0E0E0' }}>
                <p className="text-center text-gray-500 py-4">
                  {services === undefined ? 'Loading services...' : 'No services available at this branch'}
                </p>
              </Card>
            ) : (
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
            )}
          </div>
        )}

        {/* Step 3: Select Date */}
        {selectedBranch && selectedService && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>3. Choose Date</h2>
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

        {/* Step 4: Select Time */}
        {selectedBranch && selectedService && selectedDate && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>4. Choose Time</h2>
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

        {/* Step 5: Select Barber (Optional) */}
        {selectedBranch && selectedService && selectedDate && selectedTime && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>5. Choose Barber (Optional)</h2>
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
              
              {barbers && barbers.length > 0 ? barbers.map((barber) => (
                <button
                  key={barber._id}
                  onClick={() => setSelectedBarber(barber)}
                  className="w-full p-4 rounded-lg border-2 text-left transition-colors"
                  style={{
                    backgroundColor: selectedBarber?._id === barber._id ? 'rgba(246, 139, 36, 0.1)' : 'white',
                    borderColor: selectedBarber?._id === barber._id ? '#F68B24' : '#E0E0E0'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBarber?._id !== barber._id) {
                      e.target.style.borderColor = '#F68B24'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBarber?._id !== barber._id) {
                      e.target.style.borderColor = '#E0E0E0'
                    }
                  }}
                >
                  <span className="font-medium" style={{ color: '#36454F' }}>{barber.full_name}</span>
                  <p className="text-sm" style={{ color: '#8B8B8B' }}>Professional barber</p>
                </button>
              )) : (
                <Card style={{ backgroundColor: 'white', border: '1px solid #E0E0E0' }}>
                  <p className="text-center text-gray-500 py-4">
                    {barbers === undefined ? 'Loading barbers...' : 'No barbers available at this branch'}
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Confirm Booking Button */}
        {selectedBranch && selectedService && selectedDate && selectedTime && !bookingResult && (
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