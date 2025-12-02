import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [guestMode, setGuestMode] = useState(false)
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

  const queryLoading = selectedBranch && (services === undefined || barbers === undefined)

  // Check for pre-selected barber from barber profile page
  useEffect(() => {
    const preSelectedBarberData = sessionStorage.getItem("preSelectedBarber");
    if (preSelectedBarberData && barbers && barbers.length > 0) {
      try {
        const preSelectedBarber = JSON.parse(preSelectedBarberData);
        // Find the matching barber from the current barbers list
        const matchingBarber = barbers.find(
          (barber) => barber._id === preSelectedBarber.barberId
        );

        if (matchingBarber) {
          setSelectedBarber(matchingBarber);
        }

        // Clear the stored barber after using it
        sessionStorage.removeItem("preSelectedBarber");
      } catch (error) {
        console.error("Error parsing pre-selected barber:", error);
        sessionStorage.removeItem("preSelectedBarber");
      }
    }
  }, [barbers]);

  // Generate available times based on barber schedule
  const availableTimes = React.useMemo(() => {
    if (!selectedBarber || !selectedDate) {
      // Default times if no barber selected
      return [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00'
      ]
    }

    // Get day of week from selected date
    const dateObj = new Date(selectedDate)
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    
    // Check if barber has schedule and if day is available
    if (!selectedBarber.schedule || !selectedBarber.schedule[dayOfWeek]) {
      return [] // No schedule defined
    }

    const daySchedule = selectedBarber.schedule[dayOfWeek]
    
    // If barber is not available on this day, return empty array
    if (!daySchedule.available) {
      return []
    }

    // Parse start and end times
    const [startHour, startMin] = daySchedule.start.split(':').map(Number)
    const [endHour, endMin] = daySchedule.end.split(':').map(Number)
    
    // Generate time slots in 30-minute intervals
    const times = []
    let currentHour = startHour
    let currentMin = startMin
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`
      times.push(timeString)
      
      // Increment by 30 minutes
      currentMin += 30
      if (currentMin >= 60) {
        currentMin = 0
        currentHour += 1
      }
    }
    
    return times
  }, [selectedBarber, selectedDate])

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
      const formattedTime = selectedTime.includes(':') ? `${selectedTime}:00` : selectedTime

      const customerId = user?._id || 'guest'
      const result = await createBookingMutation({
        customer: customerId,
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
    setGuestMode(false)
  }

  if (queryLoading && !services?.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading booking options...</p>
        </div>
      </div>
    )
  }

  if (bookingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
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
                className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white hover:from-[var(--color-accent)] hover:brightness-110 transition-colors"
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
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A] sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center">
          <Link to="/customer/dashboard" className="mr-4 text-white hover:text-white/80">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Book Appointment</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {error && (
          <Card className="bg-red-500/20 border border-red-500/30 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </Card>
        )}

        {/* Steps 1-4 unchanged (branch, service, date, time) */}

        {/* Step 5: Sign In or Continue as Guest */}
        {selectedBranch && selectedService && selectedDate && selectedTime && !isAuthenticated && !guestMode && (
          <Card className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 text-center">
            <h2 className="text-lg font-semibold mb-3 text-white">5. Sign In or Continue as Guest</h2>
            <p className="text-sm text-gray-400 mb-5">Sign in to track your booking history or continue as a guest for a one-time booking.</p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full bg-[#1F1F1F] text-white border border-[#2A2A2A] hover:bg-[#2A2A2A] transition-all"
              >
                Sign In
              </Button>
              <Button
                onClick={() => setGuestMode(true)}
                className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white hover:shadow-lg transition-all"
              >
                Continue as Guest
              </Button>
            </div>
          </Card>
        )}

        {/* Step 6: Select Barber + Confirm Booking */}
        {(isAuthenticated || guestMode) && selectedBranch && selectedService && selectedDate && selectedTime && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-white">6. Choose Barber (Optional)</h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedBarber(null)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${selectedBarber === null ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[#2A2A2A] bg-[#1A1A1A]'}`}
              >
                <span className="font-medium text-white">No preference</span>
                <p className="text-sm text-gray-400">Any available barber</p>
              </button>

              {barbers && barbers.length > 0 ? barbers.map((barber) => (
                <button
                  key={barber._id}
                  onClick={() => setSelectedBarber(barber)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${selectedBarber?._id === barber._id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[var(--color-primary)]/50'}`}
                >
                  <span className="font-medium text-white">{barber.full_name}</span>
                  <p className="text-sm text-gray-400">Professional barber</p>
                </button>
              )) : (
                <Card style={{ backgroundColor: 'white', border: '1px solid #E0E0E0' }}>
                  <p className="text-center text-gray-500 py-4">
                    {barbers === undefined ? 'Loading barbers...' : 'No barbers available at this branch'}
                  </p>
                </Card>
              )}
            </div>

            <div className="mt-6">
              <Button 
                onClick={handleBooking}
                disabled={loading}
                className={`w-full transition-colors ${loading ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white hover:shadow-lg'}`}
              >
                {loading ? 'Creating Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerBooking
