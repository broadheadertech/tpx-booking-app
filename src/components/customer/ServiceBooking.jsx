import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Clock, DollarSign, User, Calendar, CheckCircle, XCircle, Gift, Scissors, Shield, Zap, Star, Crown, Sparkles } from 'lucide-react'
import QRCode from 'qrcode'
import bookingService from '../../services/customer/bookingService'
import voucherService from '../../services/customer/voucherService'
import { useAuth } from '../../context/AuthContext'

const ServiceBooking = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth()
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
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
  const [vouchers, setVouchers] = useState([])
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [loadingVouchers, setLoadingVouchers] = useState(false)
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
            time: createdBooking.time ? new Date(createdBooking.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }) : selectedTime,
            barber: selectedStaff?.full_name || selectedStaff?.name || 'Any Barber',
            date: createdBooking.date,
            barbershop: 'TPX Barbershop',
            voucher_code: createdBooking.voucher_code,
            total_amount: createdBooking.total_amount
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

  // State for time slots
  const [timeSlots, setTimeSlots] = useState([])
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)

  // Load available time slots when date, service, or barber changes
  useEffect(() => {
    if (selectedDate && selectedStaff && step === 2) {
      loadAvailableTimeSlots()
    }
  }, [selectedDate, selectedService?.id, selectedStaff?.id, step])

  // Load available vouchers when reaching confirmation step
  useEffect(() => {
    if (step === 3 && isAuthenticated && user) {
      loadAvailableVouchers()
    }
  }, [step, isAuthenticated, user])

  const loadAvailableTimeSlots = async () => {
    try {
      setLoadingTimeSlots(true)
      const slots = await bookingService.getAvailableTimeSlots(
        selectedDate,
        selectedService?.id,
        selectedStaff?.id
      )
      setTimeSlots(slots)
    } catch (error) {
      console.error('Error loading time slots:', error)
      // Fallback to base slots if API fails
      const baseSlots = bookingService.generateBaseTimeSlots()
      setTimeSlots(baseSlots)
    } finally {
      setLoadingTimeSlots(false)
    }
  }

  const loadAvailableVouchers = async () => {
    try {
      setLoadingVouchers(true)
      const userVouchers = await voucherService.getUserVouchers()

      console.log('Raw user vouchers:', userVouchers)

      // Filter only vouchers with status "assigned" (not redeemed) and not expired
      const availableVouchers = userVouchers.filter(voucher => {
        const isAssigned = voucher.status === 'assigned'
        const isNotExpired = !voucher.expired
        const isNotRedeemed = !voucher.redeemed

        console.log(`Voucher ${voucher.code}: status=${voucher.status}, expired=${voucher.expired}, redeemed=${voucher.redeemed}, will show=${isAssigned && isNotExpired && isNotRedeemed}`)

        return isAssigned && isNotExpired && isNotRedeemed
      })

      console.log('Filtered available vouchers:', availableVouchers)

      setVouchers(availableVouchers)
    } catch (error) {
      console.error('Error loading vouchers:', error)
      setVouchers([])
    } finally {
      setLoadingVouchers(false)
    }
  }

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
    if (name.includes('haircut') || name.includes('cut')) {
      return <Scissors className="w-5 h-5 text-white" />
    }
    if (name.includes('beard')) {
      return <Shield className="w-5 h-5 text-white" />
    }
    if (name.includes('shave')) {
      return <Zap className="w-5 h-5 text-white" />
    }
    if (name.includes('wash')) {
      return <Sparkles className="w-5 h-5 text-white" />
    }
    if (name.includes('package') || name.includes('complete')) {
      return <Crown className="w-5 h-5 text-white" />
    }
    return <Star className="w-5 h-5 text-white" />
  }

  const handleCreateBooking = async (paymentType = 'pay_later', paymentMethod = null) => {
    if (!selectedService || !selectedDate || !selectedTime) {
      alert('Please fill in all booking details')
      return
    }

    try {
      setBookingLoading(true)
      
      // Validate time slot before booking
      const timeValidationErrors = bookingService.validateTimeSlot(
        selectedDate,
        selectedTime,
        selectedService.id,
        selectedStaff?.id
      )
      
      if (timeValidationErrors.length > 0) {
        alert(`❌ Booking validation failed:\n${timeValidationErrors.join('\n')}`)
        setBookingLoading(false)
        return
      }
      
      // Check if time slot is still available
      const currentSlots = await bookingService.getAvailableTimeSlots(
        selectedDate,
        selectedService.id,
        selectedStaff?.id
      )

      const selectedSlot = currentSlots.find(slot => slot.time === selectedTime)
      if (!selectedSlot || !selectedSlot.available) {
        alert('⚠️ This time slot is no longer available. Please select a different time.')
        // Refresh time slots
        loadAvailableTimeSlots()
        setBookingLoading(false)
        return
      }

      // Double-check voucher availability if one is selected
      if (selectedVoucher) {
        const isVoucherStillAvailable = vouchers.some(v => v.code === selectedVoucher.code)
        if (!isVoucherStillAvailable) {
          alert('⚠️ The selected voucher is no longer available. Please select a different voucher or proceed without one.')
          // Refresh vouchers
          loadAvailableVouchers()
          setBookingLoading(false)
          return
        }
      }
      
      // Format time to include seconds for API compatibility
      const formattedTime = selectedTime.includes(':') ? `${selectedTime}:00` : selectedTime
      
      const bookingData = {
        service: selectedService.id,
        barber: selectedStaff?.id || null,
        date: selectedDate,
        time: formattedTime,
        status: 'booked',
        voucher_code: selectedVoucher?.code || null
      }

      console.log('Creating booking with data:', bookingData)
      const result = await bookingService.createBooking(bookingData)
      
      if (result.success) {
        setCreatedBooking(result.data)
        setStep(4) // Success step

        // Clear time slots cache to reflect the new booking
        bookingService.clearUserCache()

        // Redeem voucher if one was selected
        if (selectedVoucher?.code) {
          try {
            console.log('Redeeming voucher:', selectedVoucher.code)
            const voucherRedemption = await voucherService.confirmVoucherRedemption(selectedVoucher.code)

            if (voucherRedemption.success) {
              console.log('Voucher redeemed successfully:', voucherRedemption.data)
              // Update the created booking with redeemed voucher info
              setCreatedBooking(prev => ({
                ...prev,
                voucher_redeemed: true,
                voucher_value: voucherRedemption.data.value
              }))

              // Clear voucher caches to reflect the redemption
              voucherService.clearUserCache()

              // Optional: Show success message for voucher redemption
              setTimeout(() => {
                console.log(`✅ Voucher ${selectedVoucher.code} redeemed successfully!`)
              }, 1500)
            } else {
              console.warn('Voucher redemption failed:', voucherRedemption.error)
              // Don't break the booking flow - the booking is still successful
              // User can try to redeem the voucher manually later
            }
          } catch (voucherError) {
            console.error('Error during voucher redemption:', voucherError)
            // Don't break the booking flow - the booking is still successful
            // The voucher remains unredeemed and user can try again later
          }
        }

        // Show payment confirmation message
        if (paymentType === 'pay_now') {
          setTimeout(() => {
            alert(`Payment via ${paymentMethod?.toUpperCase()} will be processed. (Demo mode - no actual payment)`)
          }, 1000)
        }
      } else {
        // Show a more user-friendly error message
        const errorMsg = result.error || 'Failed to create booking'

        console.log('Booking error details:', result)

        if (errorMsg.includes('does not offer the service')) {
          alert(`⚠️ The selected barber doesn't provide this service. Please choose a different barber or service.`)
        } else if (errorMsg.includes('time slot')) {
          alert(`⚠️ ${errorMsg}. Please select a different time.`)
          // Refresh time slots
          loadAvailableTimeSlots()
        } else if (errorMsg.includes('Voucher usage limit reached')) {
          alert(`❌ The selected voucher has already been used or has reached its usage limit. Please select a different voucher or proceed without one.`)
          // Refresh vouchers to show only available ones
          loadAvailableVouchers()
        } else if (errorMsg.includes('voucher')) {
          alert(`❌ Voucher error: ${errorMsg}. Please try selecting a different voucher or proceed without one.`)
          // Refresh vouchers
          loadAvailableVouchers()
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
    // Reset time selection when barber changes to ensure fresh availability check
    setSelectedTime(null)
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
        <div className="text-center py-8 px-4 min-h-[200px] flex flex-col justify-center">
          <div className="rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(246, 139, 36, 0.1)' }}>
            <Calendar className="w-7 h-7" style={{ color: '#F68B24' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#8B8B8B' }}>Loading premium services...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-8 px-4 min-h-[200px] flex flex-col justify-center">
          <div className="rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)' }}>
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-sm text-red-600 mb-4 font-medium px-4">{error}</p>
          <button
            onClick={loadBookingData}
            className="w-full max-w-xs mx-auto px-6 py-3 bg-gradient-to-r from-[#F68B24] to-orange-500 text-white rounded-xl font-semibold hover:from-orange-500 hover:to-[#F68B24] transition-all duration-300 shadow-lg active:shadow-md active:scale-95 min-h-[44px] touch-manipulation"
          >
            Try Again
          </button>
        </div>
      )
    }

    return (
      <div className="px-4 pb-4">
        {/* Mobile-First Header */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center mb-3">
            <div className="rounded-full w-10 h-10 flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(246, 139, 36, 0.1)' }}>
              <Star className="w-5 h-5" style={{ color: '#F68B24' }} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold leading-tight" style={{ color: '#36454F' }}>Choose Your Service</h2>
              <p className="text-xs font-medium" style={{ color: '#8B8B8B' }}>Premium grooming services</p>
            </div>
          </div>
        </div>

        {/* Mobile-Optimized Service Cards */}
        <div className="space-y-3">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceSelect(service)}
              className="group relative w-full bg-white rounded-2xl shadow-sm active:shadow-md border-2 hover:border-[#F68B24] active:border-[#F68B24] transition-all duration-200 overflow-hidden touch-manipulation min-h-[88px]"
              style={{ borderColor: '#E0E0E0' }}
            >
              {/* Mobile-Optimized Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#F68B24] to-orange-400 opacity-0 group-hover:opacity-3 transition-opacity duration-200"></div>

              {/* Touch-Friendly Content */}
              <div className="relative p-4">
                <div className="flex items-center space-x-3">
                  {/* Mobile-Optimized Icon Badge */}
                  <div className="flex-shrink-0">
                    <div className="rounded-full w-11 h-11 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105"
                         style={{ backgroundColor: '#F68B24' }}>
                      {getServiceIcon(service.name)}
                    </div>
                  </div>

                  {/* Mobile-First Content Layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-sm font-bold leading-tight group-hover:text-[#F68B24] transition-colors duration-200" style={{ color: '#36454F' }}>
                          {service.name}
                        </h3>
                        <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: '#8B8B8B' }}>
                          {service.description || 'Professional grooming service tailored to your needs'}
                        </p>
                      </div>
                    </div>

                    {/* Mobile-Optimized Meta Info */}
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 flex-shrink-0" style={{ color: '#8B8B8B' }} />
                        <span className="text-xs font-medium truncate" style={{ color: '#8B8B8B' }}>
                          {service.duration_minutes ? `${service.duration_minutes} min` : 'Duration varies'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 flex-shrink-0" style={{ color: '#F68B24' }} />
                        <span className="text-xs font-medium" style={{ color: '#8B8B8B' }}>5.0</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile-Friendly Price Display */}
                  <div className="flex-shrink-0">
                    <div className="rounded-lg px-2 py-1.5 shadow-sm text-center min-w-[60px]" style={{ backgroundColor: 'rgba(246, 139, 36, 0.1)' }}>
                      <div className="text-sm font-bold leading-tight" style={{ color: '#F68B24' }}>
                        ₱{parseFloat(service.price || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile-Optimized Accent Line */}
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#F68B24] to-orange-400 scale-x-0 group-hover:scale-x-100 group-active:scale-x-100 transition-transform duration-200 origin-left"></div>
              </div>
            </button>
          ))}
        </div>

        {/* Mobile-Optimized Footer */}
        <div className="text-center mt-5">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full shadow-sm" style={{ backgroundColor: 'rgba(246, 139, 36, 0.1)' }}>
            <Crown className="w-3.5 h-3.5" style={{ color: '#F68B24' }} />
            <span className="text-xs font-semibold" style={{ color: '#F68B24' }}>
              {services.length} Premium Services Available
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderTimeAndStaffSelection = () => (
    <div className="space-y-3 px-4">
      <div className="text-center mb-3">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#36454F' }}>Select Barber & Time</h2>
        <p className="text-sm font-medium" style={{ color: '#8B8B8B' }}>Choose your preferred barber, then pick a time</p>
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

      {/* Staff Selection - Now First */}
      <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0E0E0' }}>
        <h3 className="text-base font-bold mb-3" style={{ color: '#36454F' }}>Step 1: Choose Your Barber</h3>
        <div className="grid grid-cols-1 gap-2">
          {getAvailableBarbers().length > 0 ? (
            getAvailableBarbers().map((barber) => (
              <button
                key={barber.id}
                onClick={() => {
                  handleStaffSelect(barber)
                  // Reset date and time when barber changes
                  setSelectedTime(null)
                }}
                className="w-full p-3 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-sm"
                style={{
                  borderColor: selectedStaff?.id === barber.id ? '#F68B24' : '#E0E0E0',
                  backgroundColor: selectedStaff?.id === barber.id ? 'rgba(246, 139, 36, 0.1)' : 'white'
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedStaff?.id === barber.id ? '#F68B24' : '#F5F5F5' }}>
                    <span className="text-lg">{selectedStaff?.id === barber.id ? '✓' : '👨‍💼'}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm" style={{ color: '#36454F' }}>{barber.full_name || barber.name || 'Professional Barber'}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex text-yellow-400 text-xs">★★★★★</div>
                      <span className="text-xs" style={{ color: '#8B8B8B' }}>5.0 • Professional</span>
                    </div>
                  </div>
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

      {/* Date Selection - Now Second, only show if barber is selected */}
      {selectedStaff && (
        <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0E0E0' }}>
          <h3 className="text-base font-bold mb-3" style={{ color: '#36454F' }}>Step 2: Select Date</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSelectedTime(null) // Reset selected time when date changes
            }}
            min={new Date().toISOString().split('T')[0]} // Prevent past dates
            max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 30 days ahead
            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base font-medium focus:outline-none focus:border-orange-500 transition-colors"
            style={{ color: '#36454F' }}
          />
        </div>
      )}

      {/* Time Slots - Now Third, only show if both barber and date are selected */}
      {selectedStaff && selectedDate && (
        <div className="bg-white rounded-xl p-4 border shadow-sm" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold" style={{ color: '#36454F' }}>Step 3: Available Times</h3>
            <span className="text-xs" style={{ color: '#8B8B8B' }}>
              {new Date(selectedDate).toLocaleDateString('en-PH', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          
          {loadingTimeSlots ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                <span className="text-sm" style={{ color: '#8B8B8B' }}>Loading available times...</span>
              </div>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-sm font-medium" style={{ color: '#F68B24' }}>No available times</p>
              <p className="text-xs mt-1" style={{ color: '#8B8B8B' }}>Please select a different date</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className="p-2 rounded-lg font-semibold text-center transition-all duration-200 border text-sm relative"
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
                    title={slot.available ? `Book at ${slot.displayTime}` : `${slot.displayTime} - ${slot.reason === 'past' ? 'Past time' : slot.reason === 'booked' ? 'Already booked' : 'Unavailable'}`}
                   >
                     {slot.displayTime}
                     {!slot.available && (
                       <div className="absolute top-1 right-1">
                         <div className={`w-2 h-2 rounded-full ${
                           slot.reason === 'past' ? 'bg-gray-400' : 'bg-red-500'
                         }`}></div>
                       </div>
                     )}
                  </button>
                ))}
              </div>
              
              {/* Legend */}
               <div className="flex items-center justify-center space-x-3 text-xs">
                 <div className="flex items-center space-x-1">
                   <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F5F5F5' }}></div>
                   <span style={{ color: '#8B8B8B' }}>Available</span>
                 </div>
                 <div className="flex items-center space-x-1">
                   <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F68B24' }}></div>
                   <span style={{ color: '#8B8B8B' }}>Selected</span>
                 </div>
                 <div className="flex items-center space-x-1">
                   <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F0F0F0' }}></div>
                   <span style={{ color: '#8B8B8B' }}>Booked</span>
                 </div>
                 <div className="flex items-center space-x-1">
                   <div className="w-3 h-3 rounded bg-gray-300"></div>
                   <span style={{ color: '#8B8B8B' }}>Past</span>
                 </div>
               </div>
            </>
          )}
        </div>
      )}

      {/* Continue Button - Only show when all selections are made */}
      {selectedTime && selectedStaff && selectedDate && (
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

      {/* Progress Indicator */}
      {selectedStaff && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full shadow-sm" style={{ backgroundColor: 'rgba(246, 139, 36, 0.1)' }}>
            <span className="text-xs font-semibold" style={{ color: '#F68B24' }}>
              {selectedStaff && !selectedDate ? 'Step 2: Select Date' : 
               selectedStaff && selectedDate && !selectedTime ? 'Step 3: Select Time' :
               selectedStaff && selectedDate && selectedTime ? 'Ready to Continue!' : 'Step 1: Choose Barber'}
            </span>
          </div>
        </div>
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

          {/* Voucher Selection */}
          <div className="border-t pt-3" style={{ borderColor: '#E0E0E0' }}>
            <h4 className="text-sm font-bold mb-3 flex items-center" style={{ color: '#36454F' }}>
              <Gift className="w-4 h-4 mr-2" style={{ color: '#F68B24' }} />
              Apply Voucher (Optional)
            </h4>
            
            {loadingVouchers ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full mr-2"></div>
                <span className="text-sm" style={{ color: '#8B8B8B' }}>Loading vouchers...</span>
              </div>
            ) : vouchers.length > 0 ? (
              <div className="space-y-2 mb-3">
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {vouchers.map((voucher) => (
                    <button
                      key={voucher.id}
                      onClick={() => setSelectedVoucher(selectedVoucher?.id === voucher.id ? null : voucher)}
                      className="w-full p-2 rounded-lg border-2 transition-all duration-200 text-left"
                      style={{
                        borderColor: selectedVoucher?.id === voucher.id ? '#F68B24' : '#E0E0E0',
                        backgroundColor: selectedVoucher?.id === voucher.id ? 'rgba(246, 139, 36, 0.1)' : 'white'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">🎁</div>
                          <div>
                            <p className="text-xs font-bold" style={{ color: '#36454F' }}>{voucher.code}</p>
                            <p className="text-xs" style={{ color: '#F68B24' }}>₱{parseFloat(voucher.value || 0).toFixed(2)}</p>
                          </div>
                        </div>
                        {selectedVoucher?.id === voucher.id && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F68B24' }}>
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedVoucher && (
                  <div className="text-xs text-center p-2 rounded" style={{ backgroundColor: '#F0F8FF', color: '#36454F' }}>
                    💰 You'll save ₱{parseFloat(selectedVoucher.value || 0).toFixed(2)} with this voucher
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs" style={{ color: '#8B8B8B' }}>No vouchers available</p>
              </div>
            )}
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
            {selectedVoucher && (
              <div className="flex justify-between">
                <span className="font-medium" style={{ color: '#36454F' }}>Subtotal:</span>
                <span className="font-bold line-through" style={{ color: '#8B8B8B' }}>₱{selectedService?.price.toLocaleString()}</span>
              </div>
            )}
            {selectedVoucher && (
              <div className="flex justify-between">
                <span className="font-medium" style={{ color: '#36454F' }}>Voucher Discount:</span>
                <span className="font-bold" style={{ color: '#22C55E' }}>-₱{parseFloat(selectedVoucher.value || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3" style={{ borderColor: 'rgba(246, 139, 36, 0.2)' }}>
              <span className="font-bold" style={{ color: '#36454F' }}>Total:</span>
              <span className="font-black text-lg" style={{ color: '#F68B24' }}>
                ₱{createdBooking?.total_amount ? parseFloat(createdBooking.total_amount).toLocaleString() : Math.max(0, (selectedService?.price || 0) - (selectedVoucher?.value || 0)).toLocaleString()}
              </span>
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