import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Clock, DollarSign, User, Calendar, CheckCircle, XCircle } from 'lucide-react'
import QRCode from 'qrcode'
import bookingService from '../../services/customer/bookingService'
import { useAuth } from '../../context/AuthContext'

const ServiceBooking = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth()
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [step, setStep] = useState(1) // 1: services, 2: date & time & staff, 3: confirmation, 4: success
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [error, setError] = useState(null)
  const [createdBooking, setCreatedBooking] = useState(null)
  const [qrCodeLoading, setQrCodeLoading] = useState(true)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const qrRef = useRef(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBookingData()
    }
  }, [isAuthenticated, user])

  // Reset QR code loading state when step changes
  useEffect(() => {
    if (step === 4) {
      setQrCodeLoading(true)
    }
  }, [step])

  // Generate QR code when we reach step 4 and have booking data
  useEffect(() => {
    if (step === 4 && createdBooking?.id) {
      console.log('Step 4 reached with booking ID:', createdBooking.id, 'booking code:', createdBooking.booking_code)
      
      const generateQRCode = (retryCount = 0) => {
        if (qrRef.current) {
          console.log('Canvas found, generating QR code')
          
          // Generate QR code data matching MyBookings format exactly
          const qrData = JSON.stringify({
            bookingId: createdBooking.id,
            bookingCode: createdBooking.booking_code || `BK-${createdBooking.id}`,
            service: selectedService?.name,
            time: createdBooking.time,
            barber: selectedStaff?.full_name || selectedStaff?.name || 'Any Barber',
            date: createdBooking.date,
            barbershop: 'TPX Barbershop'
          })
          
          // Generate QR code as canvas
          QRCode.toCanvas(qrRef.current, qrData, {
            width: 192,
            margin: 2,
            color: {
              dark: '#36454F',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'H'
          }, (error) => {
            if (error) {
              console.error('QR Code generation error:', error)
            } else {
              console.log('QR Code generated successfully')
            }
            setQrCodeLoading(false)
          })
        } else if (retryCount < 5) {
          console.log(`Canvas ref not available, retrying... (${retryCount + 1}/5)`)
          setTimeout(() => generateQRCode(retryCount + 1), 200)
        } else {
          console.error('Canvas ref still not available after 5 retries')
          setQrCodeLoading(false)
        }
      }
      
      // Start QR code generation with initial delay
      const timer = setTimeout(() => generateQRCode(), 100)
      
      return () => clearTimeout(timer)
    }
  }, [step, createdBooking?.id, createdBooking?.booking_code, selectedService, selectedStaff])

  const loadBookingData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [servicesData, barbersData] = await Promise.all([
        bookingService.getServices(),
        bookingService.getBarbers()
      ])
      
      setServices(servicesData)
      setBarbers(barbersData)
    } catch (error) {
      console.error('Error loading booking data:', error)
      setError('Failed to load services and barbers')
    } finally {
      setLoading(false)
    }
  }

  // Generate available time slots for booking
  const generateTimeSlots = () => {
    const slots = []
    const startHour = 9
    const endHour = 18
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-PH', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        
        // Randomly mark some slots as unavailable for demo
        const available = Math.random() > 0.3
        
        slots.push({
          time: time,
          displayTime: displayTime,
          available: available
        })
      }
    }
    
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Get available barbers for selected service
  const getAvailableBarbers = () => {
    if (!selectedService) return barbers
    
    // Filter barbers who provide the specific service
    const serviceBarbers = barbers.filter(barber => 
      barber.services && Array.isArray(barber.services) && barber.services.includes(selectedService.id)
    )
    
    // Only return barbers that specifically offer this service
    // Don't fallback to all barbers to prevent validation errors
    console.log(`Found ${serviceBarbers.length} barbers for service ${selectedService.name} (ID: ${selectedService.id})`)
    return serviceBarbers
  }

  // Helper function to get service icon
  const getServiceIcon = (serviceName) => {
    const name = serviceName?.toLowerCase() || ''
    if (name.includes('haircut') || name.includes('cut')) return '💇‍♂️'
    if (name.includes('beard')) return '🧔'
    if (name.includes('shave')) return '🪒'
    if (name.includes('wash')) return '🧴'
    if (name.includes('package') || name.includes('complete')) return '⭐'
    return '✂️'
  }

  const handleCreateBooking = async (paymentType = 'pay_later', paymentMethod = null) => {
    if (!selectedService || !selectedDate || !selectedTime) {
      alert('Please fill in all booking details')
      return
    }

    try {
      setBookingLoading(true)
      
      // Format time to include seconds for API compatibility
      const formattedTime = selectedTime.includes(':') ? `${selectedTime}:00` : selectedTime
      
      const bookingData = {
        service: selectedService.id,
        barber: selectedStaff?.id || null,
        date: selectedDate,
        time: formattedTime,
        payment_type: paymentType,
        payment_method: paymentMethod
      }

      console.log('Creating booking with data:', bookingData)
      const result = await bookingService.createBooking(bookingData)
      
      if (result.success) {
        setCreatedBooking(result.data)
        setStep(4) // Success step
        
        // Show payment confirmation message
        if (paymentType === 'pay_now') {
          setTimeout(() => {
            alert(`Payment via ${paymentMethod?.toUpperCase()} will be processed. (Demo mode - no actual payment)`)
          }, 1000)
        }
      } else {
        // Show a more user-friendly error message
        const errorMsg = result.error || 'Failed to create booking'
        
        if (errorMsg.includes('does not offer the service')) {
          alert(`⚠️ The selected barber doesn't provide this service. Please choose a different barber or service.`)
        } else {
          alert(`❌ ${errorMsg}`)
        }
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    // Reset selected staff when changing service to avoid validation errors
    setSelectedStaff(null)
    setStep(2)
  }

  const handleTimeSelect = (time) => {
    setSelectedTime(time)
    setStep(3)
  }

  const handleStaffSelect = (staffMember) => {
    setSelectedStaff(staffMember)
  }

  const handleConfirmBooking = async (paymentType = 'pay_later', paymentMethod = null) => {
    await handleCreateBooking(paymentType, paymentMethod)
  }

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Choose Service'
      case 2: return 'Select Date, Time & Barber'
      case 3: return 'Confirm Booking'
      case 4: return 'Booking Confirmed'
      default: return 'Book Service'
    }
  }

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-4 px-4 py-2">
      <div className="flex items-center space-x-3">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step >= stepNumber 
                ? 'text-white shadow-md' 
                : 'text-gray-500'
            }`} style={{
              backgroundColor: step >= stepNumber ? '#F68B24' : '#E0E0E0'
            }}>
              {step > stepNumber ? '✓' : stepNumber}
            </div>
            {stepNumber < 3 && (
              <div className={`w-8 h-0.5 mx-1 rounded transition-all duration-300`} style={{
                backgroundColor: step > stepNumber ? '#F68B24' : '#E0E0E0'
              }}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderServiceSelection = () => {
    if (loading) {
      return (
        <div className="text-center py-12 px-4">
          <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#F68B24', opacity: 0.1}}>
            <Calendar className="w-8 h-8" style={{color: '#F68B24'}} />
          </div>
          <p className="text-sm" style={{color: '#8B8B8B'}}>Loading services...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-12 px-4">
          <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#dc3545', opacity: 0.1}}>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadBookingData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-3 px-4">
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold mb-1" style={{ color: '#36454F' }}>Choose Your Service</h2>
          <p className="text-sm font-medium" style={{ color: '#8B8B8B' }}>Select from our premium grooming services</p>
        </div>
        
        <div className="space-y-2">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceSelect(service)}
              className="w-full bg-white rounded-xl p-4 border hover:shadow-md transition-all duration-200 text-left group"
              style={{ borderColor: '#E0E0E0' }}
              onMouseEnter={(e) => e.target.style.borderColor = '#F68B24'}
              onMouseLeave={(e) => e.target.style.borderColor = '#E0E0E0'}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getServiceIcon(service.name)}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-base font-bold transition-colors duration-200 truncate" style={{ color: '#36454F' }}>
                        {service.name}
                      </h3>
                      <div className="text-right ml-2">
                        <div className="text-lg font-bold" style={{ color: '#F68B24' }}>
                          ₱{parseFloat(service.price || 0).toLocaleString()}
                        </div>
                        <div className="text-xs font-medium" style={{ color: '#8B8B8B' }}>
                          {service.duration_minutes ? `${service.duration_minutes} min` : 'Duration varies'}
                        </div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#F68B24', color: 'white' }}>
                        Service
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: '#8B8B8B' }}>
                      {service.description || 'Professional grooming service'}
                    </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderTimeAndStaffSelection = () => (
    <div className="space-y-3 px-4">
      <div className="text-center mb-3">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#36454F' }}>Select Time & Barber</h2>
        <p className="text-sm font-medium" style={{ color: '#8B8B8B' }}>Choose your preferred time and barber</p>
      </div>

      {/* Selected Service Summary */}
      <div className="bg-white rounded-xl p-3 border shadow-sm" style={{ borderColor: '#E0E0E0' }}>
        <div className="flex items-center space-x-2">
          <div className="text-xl">{selectedService?.image}</div>
          <div className="flex-1">
            <h3 className="text-base font-bold" style={{ color: '#36454F' }}>{selectedService?.name}</h3>
            <div className="flex items-center space-x-3 text-sm">
              <span className="font-bold" style={{ color: '#F68B24' }}>₱{selectedService?.price.toLocaleString()}</span>
              <span className="font-medium" style={{ color: '#8B8B8B' }}>{selectedService?.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0E0E0' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: '#36454F' }}>Available Times - Today</h3>
        <div className="grid grid-cols-3 gap-2">
          {timeSlots.slice(0, 9).map((slot) => (
            <button
              key={slot.time}
              onClick={() => slot.available && setSelectedTime(slot.time)}
              disabled={!slot.available}
              className="p-2 rounded-lg font-semibold text-center transition-all duration-200 border text-sm"
              style={{
                backgroundColor: slot.available 
                  ? selectedTime === slot.time 
                    ? '#F68B24' 
                    : '#F5F5F5'
                  : '#F0F0F0',
                color: slot.available 
                  ? selectedTime === slot.time 
                    ? 'white' 
                    : '#36454F'
                  : '#CCCCCC',
                borderColor: slot.available 
                  ? selectedTime === slot.time 
                    ? '#F68B24' 
                    : 'transparent'
                  : 'transparent',
                cursor: slot.available ? 'pointer' : 'not-allowed'
              }}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Selection */}
      <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0E0E0' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: '#36454F' }}>Choose Your Barber</h3>
        <div className="space-y-2">
          {getAvailableBarbers().length > 0 ? (
            getAvailableBarbers().map((barber) => (
              <button
                key={barber.id}
                onClick={() => handleStaffSelect(barber)}
                className="w-full p-3 rounded-lg border transition-all duration-200 text-left hover:shadow-md"
                style={{
                  borderColor: selectedStaff?.id === barber.id ? '#F68B24' : '#E0E0E0',
                  backgroundColor: selectedStaff?.id === barber.id ? 'rgba(246, 139, 36, 0.1)' : 'white',
                  borderWidth: '2px'
                }}
                onMouseEnter={(e) => {
                  if (selectedStaff?.id !== barber.id) {
                    e.target.style.borderColor = '#F68B24'
                    e.target.style.backgroundColor = 'rgba(246, 139, 36, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedStaff?.id !== barber.id) {
                    e.target.style.borderColor = '#E0E0E0'
                    e.target.style.backgroundColor = 'white'
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <div className="text-xl">👨‍💼</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm" style={{ color: '#36454F' }}>{barber.full_name || barber.name || 'Professional Barber'}</h4>
                    <p className="text-xs" style={{ color: '#8B8B8B' }}>Professional Barber</p>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <div className="flex text-yellow-400 text-xs">★★★★★</div>
                      <span className="text-xs" style={{ color: '#8B8B8B' }}>5.0</span>
                    </div>
                  </div>
                  {selectedStaff?.id === barber.id && (
                    <div className="text-orange-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-sm font-medium" style={{ color: '#F68B24' }}>No barbers available for "{selectedService?.name}"</p>
              <p className="text-xs mt-1" style={{ color: '#8B8B8B' }}>This service may not be offered by our current staff</p>
              <button
                onClick={() => setStep(1)}
                className="mt-3 px-4 py-2 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Choose Different Service
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      {selectedTime && selectedStaff && (
        <button
          onClick={() => setStep(3)}
          className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200 shadow-lg"
          style={{ backgroundColor: '#F68B24' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
        >
          Continue to Confirmation
        </button>
      )}
    </div>
  )

  const renderStaffSelection = () => (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <h2 className="text-3xl font-black text-[#1A1A1A] mb-2">Choose Your Barber</h2>
        <p className="text-lg text-[#6B6B6B] font-medium">Select your preferred professional</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {getAvailableBarbers().map((barber) => (
          <button
            key={barber.id}
            onClick={() => handleStaffSelect(barber)}
            className={`group bg-white rounded-3xl p-6 shadow-xl border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
              selectedStaff?.id === barber.id ? 'border-[#FF8C42]' : 'border-[#F5F5F5] hover:border-[#FF8C42]'
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">👨‍💼</div>
              <h3 className="text-xl font-black text-[#1A1A1A] mb-2 group-hover:text-[#FF8C42] transition-colors duration-200">
                {barber.full_name}
              </h3>
              <div className="space-y-2">
                <div className="px-3 py-1 bg-[#FF8C42]/10 text-[#FF8C42] rounded-full text-sm font-semibold inline-block">
                  Professional Barber
                </div>
                <p className="text-[#6B6B6B] text-sm font-medium">Experienced professional</p>
                <div className="flex items-center justify-center space-x-1">
                  <div className="flex text-yellow-400">
                    {'★'.repeat(5)}
                  </div>
                  <span className="text-sm font-bold text-[#6B6B6B] ml-1">5.0</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderConfirmation = () => (
    <div className="space-y-3 px-4">
      <div className="text-center mb-3">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#36454F' }}>Confirm Your Booking</h2>
        <p className="text-sm font-medium" style={{ color: '#8B8B8B' }}>Please review your appointment details</p>
      </div>

      <div className="bg-white rounded-xl p-4 border shadow-lg" style={{ borderColor: '#E0E0E0' }}>
        <div className="space-y-4">
          {/* Service Details */}
          <div className="text-center border-b pb-3" style={{ borderColor: '#E0E0E0' }}>
            <div className="text-2xl mb-2">{selectedService?.image}</div>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#36454F' }}>{selectedService?.name}</h3>
            <div className="flex justify-center items-center space-x-3">
              <span className="font-bold text-base" style={{ color: '#F68B24' }}>₱{selectedService?.price.toLocaleString()}</span>
              <span className="font-medium text-sm" style={{ color: '#8B8B8B' }}>{selectedService?.duration}</span>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" style={{ color: '#F68B24' }} />
                <span className="font-semibold text-sm" style={{ color: '#36454F' }}>Date & Time</span>
              </div>
              <span className="font-bold text-sm" style={{ color: '#36454F' }}>Today, {selectedTime}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" style={{ color: '#F68B24' }} />
                <span className="font-semibold text-sm" style={{ color: '#36454F' }}>Your Barber</span>
              </div>
              <span className="font-bold text-sm" style={{ color: '#36454F' }}>{selectedStaff?.full_name || selectedStaff?.name || 'Any Barber'}</span>
            </div>
          </div>

          {/* Payment Options */}
          <div className="border-t pt-3" style={{ borderColor: '#E0E0E0' }}>
            <h4 className="text-sm font-bold mb-3" style={{ color: '#36454F' }}>Complete Your Booking</h4>
            
            {!showPaymentMethods ? (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => setShowPaymentMethods(true)}
                  disabled={bookingLoading}
                  className={`py-3 px-4 bg-green-500 text-white font-bold rounded-lg transition-all duration-200 text-sm flex items-center justify-center space-x-2 ${
                    bookingLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  onMouseEnter={(e) => !bookingLoading && (e.target.style.backgroundColor = '#16A34A')}
                  onMouseLeave={(e) => !bookingLoading && (e.target.style.backgroundColor = '#22C55E')}
                >
                  <span>💳</span>
                  <span>Pay Now</span>
                </button>
                <button
                  onClick={() => handleConfirmBooking('pay_later')}
                  disabled={bookingLoading}
                  className={`py-3 px-4 border-2 font-bold rounded-lg transition-all duration-200 text-sm flex items-center justify-center space-x-2 ${
                    bookingLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  style={{ borderColor: '#F68B24', color: bookingLoading ? '#CCCCCC' : '#F68B24' }}
                  onMouseEnter={(e) => !bookingLoading && (e.target.style.backgroundColor = '#F68B24', e.target.style.color = 'white')}
                  onMouseLeave={(e) => !bookingLoading && (e.target.style.backgroundColor = 'transparent', e.target.style.color = '#F68B24')}
                >
                  {bookingLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      <span>Booking...</span>
                    </div>
                  ) : (
                    <>
                      <span>🏪</span>
                      <span>Pay Later</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="text-sm font-bold mb-2" style={{ color: '#36454F' }}>Select Payment Method</h5>
                  <div className="space-y-2">
                    <button
                      key="gcash"
                      onClick={() => setSelectedPaymentMethod('gcash')}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                        selectedPaymentMethod === 'gcash' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">G</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm" style={{ color: '#36454F' }}>GCash</p>
                        <p className="text-xs" style={{ color: '#8B8B8B' }}>Digital wallet payment</p>
                      </div>
                    </button>
                    
                    <button
                      key="maya"
                      onClick={() => setSelectedPaymentMethod('maya')}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                        selectedPaymentMethod === 'maya' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm" style={{ color: '#36454F' }}>Maya</p>
                        <p className="text-xs" style={{ color: '#8B8B8B' }}>Digital wallet payment</p>
                      </div>
                    </button>
                    
                    <button
                      key="card"
                      onClick={() => setSelectedPaymentMethod('card')}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                        selectedPaymentMethod === 'card' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">💳</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm" style={{ color: '#36454F' }}>Credit/Debit Card</p>
                        <p className="text-xs" style={{ color: '#8B8B8B' }}>Visa, Mastercard, etc.</p>
                      </div>
                    </button>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => { setShowPaymentMethods(false); setSelectedPaymentMethod(null); }}
                    className="flex-1 py-2 px-3 border font-bold rounded-lg transition-all duration-200 text-sm"
                    style={{ borderColor: '#E0E0E0', color: '#8B8B8B' }}
                    onMouseEnter={(e) => { e.target.style.backgroundColor = '#F5F5F5'; e.target.style.color = '#36454F'; }}
                    onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#8B8B8B'; }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleConfirmBooking('pay_now', selectedPaymentMethod)}
                    disabled={!selectedPaymentMethod || bookingLoading}
                    className={`flex-1 py-2 px-3 text-white font-bold rounded-lg transition-all duration-200 shadow-lg text-sm ${
                      (!selectedPaymentMethod || bookingLoading) ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                    style={{ backgroundColor: (!selectedPaymentMethod || bookingLoading) ? '#CCCCCC' : '#22C55E' }}
                    onMouseEnter={(e) => (!selectedPaymentMethod || bookingLoading) || (e.target.style.backgroundColor = '#16A34A')}
                    onMouseLeave={(e) => (!selectedPaymentMethod || bookingLoading) || (e.target.style.backgroundColor = '#22C55E')}
                  >
                    {bookingLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      'Confirm & Pay'
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {!showPaymentMethods && (
              <p className="text-xs text-center mb-3" style={{ color: '#8B8B8B' }}>
                Choose your preferred payment option to complete booking
              </p>
            )}
          </div>

          {/* Go Back Button */}
          {!showPaymentMethods && (
            <div className="pt-2">
              <button
                onClick={() => setStep(2)}
                className="w-full py-2 px-3 border font-bold rounded-lg transition-all duration-200 text-sm"
                style={{ borderColor: '#E0E0E0', color: '#8B8B8B' }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#F5F5F5'; e.target.style.color = '#36454F'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#8B8B8B'; }}
              >
                ← Go Back to Edit Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderBookingSuccess = () => {
    return (
      <div className="space-y-6 px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl" style={{ backgroundColor: '#F68B24' }}>
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: '#36454F' }}>Booking Confirmed!</h2>
          <p className="font-medium" style={{ color: '#8B8B8B' }}>Your appointment has been successfully booked</p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-8 border-2 shadow-lg text-center" style={{ borderColor: '#E0E0E0' }}>
          <h3 className="text-lg font-black mb-4" style={{ color: '#36454F' }}>Your Booking QR Code</h3>
          
          {/* Real QR Code */}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white rounded-2xl border-2 shadow-sm" style={{ borderColor: '#E0E0E0' }}>
              <div className="relative w-48 h-48">
                {qrCodeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center space-y-3">
                      <div className="animate-spin w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm" style={{ color: '#8B8B8B' }}>Generating QR Code...</p>
                    </div>
                  </div>
                )}
                <canvas 
                  ref={qrRef} 
                  className="rounded-xl w-full h-full"
                  style={{ display: qrCodeLoading ? 'none' : 'block' }}
                ></canvas>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-lg font-black" style={{ color: '#36454F' }}>Booking ID: {createdBooking?.booking_code || 'Loading...'}</p>
            <p className="text-sm" style={{ color: '#8B8B8B' }}>Show this QR code when you arrive</p>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'rgba(246, 139, 36, 0.05)', borderColor: 'rgba(246, 139, 36, 0.2)' }}>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium" style={{ color: '#36454F' }}>Service:</span>
              <span className="font-bold" style={{ color: '#36454F' }}>{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium" style={{ color: '#36454F' }}>Date & Time:</span>
              <span className="font-bold" style={{ color: '#36454F' }}>
                {createdBooking?.date ? new Date(createdBooking.date).toLocaleDateString() : 'Today'}, {createdBooking?.time || selectedTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium" style={{ color: '#36454F' }}>Barber:</span>
              <span className="font-bold" style={{ color: '#36454F' }}>{selectedStaff?.full_name || selectedStaff?.name || 'Any Barber'}</span>
            </div>
            <div className="flex justify-between border-t pt-3" style={{ borderColor: 'rgba(246, 139, 36, 0.2)' }}>
              <span className="font-bold" style={{ color: '#36454F' }}>Total:</span>
              <span className="font-black text-lg" style={{ color: '#F68B24' }}>₱{selectedService?.price.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onBack}
            className="w-full py-4 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg"
            style={{ backgroundColor: '#F68B24' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
          >
            Back to Home
          </button>
          <button
            onClick={() => {
              // Navigate to bookings section in dashboard
              if (onBack) {
                onBack('bookings') // Pass 'bookings' to indicate which section to show
              }
            }}
            className="w-full py-3 border-2 font-bold rounded-2xl transition-all duration-200"
            style={{ borderColor: '#F68B24', color: '#F68B24' }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = '#F68B24'; e.target.style.color = 'white'; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#F68B24'; }}
          >
            View My Bookings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F0E6' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#36454F' }} className="sticky top-0 z-40 shadow-lg">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
              style={{ color: '#F4F0E6' }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: '#F4F0E6' }}>Book Service</p>
              <p className="text-xs" style={{ color: '#F68B24' }}>Step {step} of 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <div className="pb-8">
        {step === 1 && renderServiceSelection()}
        {step === 2 && renderTimeAndStaffSelection()}
        {step === 3 && renderConfirmation()}
        {step === 4 && renderBookingSuccess()}
      </div>
    </div>
  )
}

export default ServiceBooking