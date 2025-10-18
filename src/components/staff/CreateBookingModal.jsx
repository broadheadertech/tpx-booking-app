import React, { useState, useEffect, useRef } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import { Calendar, Clock, User, Scissors, RefreshCw, ChevronDown, Check, UserPlus, Phone, Mail, MapPin, FileText, CreditCard, AlertCircle, Plus } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const CreateBookingModal = ({ isOpen, onClose, onSubmit, user }) => {
  const [formData, setFormData] = useState({
    customerType: 'existing', // 'existing' or 'walkin'
    customer: '',
    // Walk-in customer fields
    walkinName: '',
    walkinPhone: '',
    walkinEmail: '',
    // Booking fields
    service: '',
    barber: '',
    date: '',
    time: '',
    notes: '',
    paymentMethod: 'cash'
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [barberDropdownOpen, setBarberDropdownOpen] = useState(false)
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [timeSlots, setTimeSlots] = useState([])
  const [bookingCreated, setBookingCreated] = useState(null)
  const barberDropdownRef = useRef(null)
  const customerDropdownRef = useRef(null)

  // Convex queries for dropdown data - use branch-scoped queries for staff
  const services = user?.role === 'super_admin'
    ? useQuery(api.services.services.getAllServices)
    : user?.branch_id
      ? useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id })
      : undefined
      
  const barbers = user?.role === 'super_admin'
    ? useQuery(api.services.barbers.getActiveBarbers)
    : user?.branch_id
      ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })?.filter(b => b.is_active)
      : undefined
      
  const customers = user?.role === 'super_admin'
    ? useQuery(api.services.auth.getAllUsers)
    : user?.branch_id
      ? useQuery(api.services.auth.getUsersByBranch, { branch_id: user.branch_id })
      : undefined
  const barberAvailability = useQuery(api.services.bookings.getBookingsByBarberAndDate,
    (formData.barber && formData.date) ? {
      barberId: formData.barber,
      date: formData.date
    } : "skip"
  )

  // Convex mutations
  const createBooking = useMutation(api.services.bookings.createBooking)
  const createWalkinCustomer = useMutation(api.services.auth.registerUser)

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (barberDropdownRef.current && !barberDropdownRef.current.contains(event.target)) {
        setBarberDropdownOpen(false)
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setCustomerDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate time slots based on barber availability
  useEffect(() => {
    if (formData.date && formData.barber && barberAvailability && barberAvailability !== "skip") {
      const bookedTimes = barberAvailability
        .filter(booking => booking.status !== 'cancelled')
        .map(booking => booking.time)

      const service = services?.find(s => s._id === formData.service)
      const duration = service?.duration_minutes || 60

      const slots = generateTimeSlots(formData.date, bookedTimes, duration)
      setTimeSlots(slots)
    } else {
      setTimeSlots(generateTimeSlots(formData.date, [], 60))
    }
  }, [formData.date, formData.barber, formData.service, barberAvailability, services])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      let customerId = formData.customer

      // Validate customer selection
      if (formData.customerType === 'existing' && !formData.customer) {
        setFieldErrors({ customer: 'Please select a customer' })
        setLoading(false)
        return
      }

      // Validate walk-in customer fields
      if (formData.customerType === 'walkin') {
        if (!formData.walkinName.trim()) {
          setFieldErrors({ walkinName: 'Customer name is required' })
          setLoading(false)
          return
        }
        if (formData.walkinName.trim().length < 2) {
          setFieldErrors({ walkinName: 'Customer name must be at least 2 characters' })
          setLoading(false)
          return
        }
        if (!formData.walkinPhone.trim()) {
          setFieldErrors({ walkinPhone: 'Phone number is required' })
          setLoading(false)
          return
        }
        // Validate Philippine phone number format
        const phoneRegex = /^(\+63|0)[9][0-9]{9}$/
        if (!phoneRegex.test(formData.walkinPhone.replace(/\s/g, ''))) {
          setFieldErrors({ walkinPhone: 'Please enter a valid Philippine phone number (e.g., 09123456789)' })
          setLoading(false)
          return
        }
        if (formData.walkinEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.walkinEmail)) {
          setFieldErrors({ walkinEmail: 'Please enter a valid email address' })
          setLoading(false)
          return
        }

        // Create walk-in customer with branch_id
        try {
          const walkinCustomerData = {
            username: `walkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            password: 'walkin_temp', // Temporary password
            email: formData.walkinEmail || `walkin_${Date.now()}@temp.local`,
            mobile_number: formData.walkinPhone,
            role: 'customer',
            branch_id: user?.branch_id // IMPORTANT: Add branch_id for walk-in customers
          }

          const walkinResult = await createWalkinCustomer(walkinCustomerData)
          customerId = walkinResult.userId

          console.log('Walk-in customer created:', customerId)
        } catch (walkinErr) {
          console.error('Error creating walk-in customer:', walkinErr)
          setError(`Failed to create walk-in customer: ${walkinErr.message || 'Unknown error'}`)
          setLoading(false)
          return
        }
      }

      // Validate other required fields
      if (!formData.service) {
        setFieldErrors({ service: 'Please select a service' })
        setLoading(false)
        return
      }
      if (!formData.date) {
        setFieldErrors({ date: 'Please select a date' })
        setLoading(false)
        return
      }
      if (!formData.time) {
        setFieldErrors({ time: 'Please select a time' })
        setLoading(false)
        return
      }

      // Validate service exists
      const selectedService = services?.find(s => s._id === formData.service)
      if (!selectedService) {
        setError('Selected service is no longer available. Please refresh and try again.')
        setLoading(false)
        return
      }

      // Validate date constraints
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        setFieldErrors({ date: 'Cannot book appointments in the past' })
        setLoading(false)
        return
      }

      // Check if selected date is more than 30 days in advance
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 30)
      if (selectedDate > maxDate) {
        setFieldErrors({ date: 'Cannot book appointments more than 30 days in advance' })
        setLoading(false)
        return
      }

      // Parse time - handle both 12-hour (with AM/PM) and 24-hour formats
      const timeParts = formData.time.split(' ')
      let hour = 0
      
      if (timeParts.length === 2) {
        // 12-hour format with AM/PM
        const [time, modifier] = timeParts
        const [hours] = time.split(':')
        hour = parseInt(hours, 10)
        if (modifier === 'PM' && hour !== 12) hour += 12
        if (modifier === 'AM' && hour === 12) hour = 0
      } else {
        // 24-hour format
        hour = parseInt(formData.time.split(':')[0], 10)
      }

      // Validate business hours (9 AM to 5 PM)
      if (hour < 9 || hour >= 17) {
        setFieldErrors({ time: 'Please select a time between 9:00 AM and 5:00 PM' })
        setLoading(false)
        return
      }

      // Check if selected time slot is available
      const selectedSlot = timeSlots.find(slot => slot.display === formData.time)
      if (selectedSlot && !selectedSlot.available) {
        setFieldErrors({ time: 'This time slot is already booked. Please select another time.' })
        setLoading(false)
        return
      }

      // Validate notes length if provided
      if (formData.notes && formData.notes.length > 500) {
        setFieldErrors({ notes: 'Notes cannot exceed 500 characters' })
        setLoading(false)
        return
      }

      // Convert 12-hour time to 24-hour format for API (if needed)
      const convertTo24Hour = (displayTime) => {
        const timeParts = displayTime.split(' ')
        
        // If already in 24-hour format or only has one part, parse directly
        if (timeParts.length === 1) {
          return timeParts[0] // Already 24-hour format
        }
        
        // Convert from 12-hour to 24-hour format
        const [time, modifier] = timeParts
        let [hours, minutes] = time.split(':')
        hours = parseInt(hours, 10)
        
        if (modifier === 'AM') {
          if (hours === 12) hours = 0
        } else if (modifier === 'PM') {
          if (hours !== 12) hours += 12
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`
      }

      // Prepare booking data for Convex
      const bookingData = {
        customer: customerId,
        service: formData.service,
        branch_id: user.branch_id, // Required for branch-scoped booking
        barber: formData.barber || undefined,
        date: formData.date,
        time: convertTo24Hour(formData.time),
        status: 'booked',
        notes: formData.notes || undefined
      }

      // Validate barber exists if provided
      if (formData.barber) {
        const selectedBarber = barbers?.find(b => b._id === formData.barber)
        if (!selectedBarber) {
          setError('Selected barber is no longer available. Please select another.')
          setLoading(false)
          return
        }
      }

      console.log('Creating booking:', bookingData)

      // Create booking via Convex
      const bookingId = await createBooking(bookingData)

      console.log('Booking created successfully:', bookingId)

      // Get booking details for success display
      const serviceDetails = services?.find(s => s._id === formData.service)
      const barberDetails = formData.barber ? barbers?.find(b => b._id === formData.barber) : null

      // Show success modal with booking details
      setBookingCreated({
        bookingCode: `BK${Date.now().toString().slice(-6)}`,
        service: serviceDetails?.name || 'Unknown Service',
        barber: barberDetails?.full_name || 'Any available',
        date: formData.date,
        time: formData.time,
        price: serviceDetails?.price || 0,
        customerName: formData.customerType === 'walkin' ? formData.walkinName : undefined
      })

      // Call parent success handler
      if (onSubmit) {
        await onSubmit({
          _id: bookingId,
          ...bookingData,
          customer_name: formData.customerType === 'walkin' ? formData.walkinName : undefined
        })
      }

      // Reset form after showing success
      resetForm()

    } catch (err) {
      console.error('Error creating booking:', err)

      // Handle different error types
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === 'object') {
          setFieldErrors(errorData)

          if (errorData.non_field_errors) {
            setError(errorData.non_field_errors[0])
          } else {
            const errorMessages = Object.entries(errorData)
              .filter(([key]) => key !== 'non_field_errors')
              .map(([field, errors]) => `${field}: ${errors[0]}`)
            setError(`Please fix the following errors: ${errorMessages.join(', ')}`)
          }
        } else {
          setError(errorData || 'Failed to create booking')
        }
      } else if (err.message) {
        // Handle Convex or other errors with message property
        setError(`Booking error: ${err.message}`)
      } else {
        setError('Failed to create booking. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      customerType: 'existing',
      customer: '',
      walkinName: '',
      walkinPhone: '',
      walkinEmail: '',
      service: '',
      barber: '',
      date: '',
      time: '',
      notes: '',
      paymentMethod: 'cash'
    })
    setError(null)
    setFieldErrors({})
    setTimeSlots([])
  }

  // Generate available time slots
  const generateTimeSlots = (date, bookedTimes, duration) => {
    if (!date) return []

    const slots = []
    const startHour = 9 // 9 AM
    const endHour = 17 // 5 PM
    const interval = 30 // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })

        // Check if this slot conflicts with existing bookings
        const isBooked = bookedTimes.some(bookedTime => {
          const bookedHour = parseInt(bookedTime.split(':')[0])
          const bookedMinute = parseInt(bookedTime.split(':')[1])
          const slotHour = hour
          const slotMinute = minute

          // Overlap check: booking duration matters
          return bookedHour === slotHour && Math.abs(bookedMinute - slotMinute) < duration
        })

        slots.push({
          value: timeString,
          display: displayTime,
          available: !isBooked
        })
      }
    }

    return slots
  }

  const handleInputChange = (field, value) => {
    // Clear field-specific errors when user starts editing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    
    // If switching customer type, clear all validation errors
    if (field === 'customerType') {
      setFieldErrors({})
      setError(null)
    }
    
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Format service display
  const formatServiceOption = (service) => {
    const price = `₱${parseFloat(service.price).toFixed(2)}`
    const duration = `${service.duration_minutes} min`
    return `${service.name} - ${price} (${duration})`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Booking" size="xl" compact variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2.5 rounded-lg flex items-center space-x-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {(!services || !barbers || !customers) && (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="w-5 h-5 animate-spin text-[#FF8C42] mr-2" />
            <span className="text-gray-300 text-sm font-medium">Loading...</span>
          </div>
        )}

        {/* Customer Type Selection */}
        <div className="bg-[#0F0F0F]/50 rounded-lg p-4 border border-[#333333]/50">
          <h3 className="text-sm font-bold text-gray-200 mb-3 flex items-center">
            <User className="w-4 h-4 text-[#FF8C42] mr-2" />
            Customer
          </h3>

          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="customerType"
                value="existing"
                checked={formData.customerType === 'existing'}
                onChange={(e) => handleInputChange('customerType', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-gray-300">Existing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="customerType"
                value="walkin"
                checked={formData.customerType === 'walkin'}
                onChange={(e) => handleInputChange('customerType', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-gray-300">Walk-in</span>
            </label>
          </div>

          {formData.customerType === 'existing' ? (
            <div>
              <div className="relative" ref={customerDropdownRef}>
                <button
                  type="button"
                  onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                  disabled={!customers}
                  className="w-full h-10 px-3 border border-[#444444] rounded-lg text-left text-sm flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#FF8C42] transition-all disabled:opacity-50 bg-[#1A1A1A] text-gray-300 hover:border-[#555555]"
                >
                  <div className="flex items-center gap-2">
                    {formData.customer ? (
                      (() => {
                        const selectedCustomer = customers?.find(c => c._id === formData.customer)
                        return selectedCustomer ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-[#FF8C42] flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-white" />
                            </div>
                            <div className="text-left min-w-0">
                              <div className="font-medium text-gray-200 text-xs">{selectedCustomer.username}</div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">Select customer</span>
                        )
                      })()
                    ) : (
                      <span className="text-gray-400 text-xs">Select customer</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {customerDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-[#1A1A1A] border border-[#444444] rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {customers?.filter(customer => customer.role === 'customer').map(customer => (
                      <button
                        key={customer._id}
                        type="button"
                        onClick={() => {
                          handleInputChange('customer', customer._id)
                          setCustomerDropdownOpen(false)
                        }}
                        className="w-full px-3 py-2 flex items-center hover:bg-[#2A2A2A] transition-colors text-left"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#FF8C42] flex items-center justify-center mr-2 flex-shrink-0">
                          <User className="w-3 h-3 text-white" />
                        </div>
                        <div className="text-xs flex-1 min-w-0">
                          <div className="font-medium text-gray-200">{customer.username}</div>
                        </div>
                        {formData.customer === customer._id && <Check className="w-4 h-4 text-[#FF8C42] flex-shrink-0" />}
                      </button>
                    )) || []}
                  </div>
                )}
              </div>
              {fieldErrors.customer && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.customer}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.walkinName}
                  onChange={(e) => handleInputChange('walkinName', e.target.value)}
                  className="w-full h-8 px-2 border border-[#444444] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 text-xs"
                  placeholder="Name"
                />
                {fieldErrors.walkinName && <p className="text-red-400 text-xs mt-0.5">{fieldErrors.walkinName}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={formData.walkinPhone}
                  onChange={(e) => handleInputChange('walkinPhone', e.target.value)}
                  className="w-full h-8 px-2 border border-[#444444] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 text-xs"
                  placeholder="09..."
                />
                {fieldErrors.walkinPhone && <p className="text-red-400 text-xs mt-0.5">{fieldErrors.walkinPhone}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.walkinEmail}
                  onChange={(e) => handleInputChange('walkinEmail', e.target.value)}
                  className="w-full h-8 px-2 border border-[#444444] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 text-xs"
                  placeholder="Email"
                />
              </div>
            </div>
          )}
        </div>

        {/* Service & Schedule Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Service Section */}
          <div className="bg-[#0F0F0F]/50 rounded-lg p-3 border border-[#333333]/50">
            <h3 className="text-xs font-bold text-gray-200 mb-2 flex items-center">
              <Scissors className="w-3.5 h-3.5 text-[#FF8C42] mr-1.5" />
              Service
            </h3>
            <select
              value={formData.service}
              onChange={(e) => handleInputChange('service', e.target.value)}
              required
              disabled={!services}
              className="w-full h-9 px-2 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 disabled:opacity-50"
            >
              <option value="">Select service</option>
              {services?.filter(service => service.is_active).map(service => (
                <option key={service._id} value={service._id}>
                  {service.name} - ₱{parseFloat(service.price).toFixed(0)}
                </option>
              )) || []}
            </select>
            {fieldErrors.service && <p className="text-red-400 text-xs mt-1">{fieldErrors.service}</p>}

            <div className="mt-2">
              <label className="block text-xs text-gray-400 mb-1">Barber (Optional)</label>
              <div className="relative" ref={barberDropdownRef}>
                <button
                  type="button"
                  onClick={() => setBarberDropdownOpen(!barberDropdownOpen)}
                  disabled={!barbers}
                  className="w-full h-8 px-2 border border-[#444444] rounded-lg text-left text-xs flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 disabled:opacity-50 hover:border-[#555555]"
                >
                  <span className="truncate">
                    {formData.barber ? barbers?.find(b => b._id === formData.barber)?.full_name : 'Any'}
                  </span>
                  <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${barberDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {barberDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-[#1A1A1A] border border-[#444444] rounded-lg shadow-lg max-h-32 overflow-y-auto text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange('barber', '')
                        setBarberDropdownOpen(false)
                      }}
                      className="w-full px-2 py-1.5 hover:bg-[#2A2A2A] transition-colors text-left text-gray-300"
                    >
                      Any available
                      {!formData.barber && <Check className="w-3 h-3 text-[#FF8C42] float-right mt-0.5" />}
                    </button>
                    {barbers?.filter(barber => barber.is_active).map(barber => (
                      <button
                        key={barber._id}
                        type="button"
                        onClick={() => {
                          handleInputChange('barber', barber._id)
                          setBarberDropdownOpen(false)
                        }}
                        className="w-full px-2 py-1.5 hover:bg-[#2A2A2A] transition-colors text-left text-gray-300"
                      >
                        {barber.full_name}
                        {formData.barber === barber._id && <Check className="w-3 h-3 text-[#FF8C42] float-right mt-0.5" />}
                      </button>
                    )) || []}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="bg-[#0F0F0F]/50 rounded-lg p-3 border border-[#333333]/50">
            <h3 className="text-xs font-bold text-gray-200 mb-2 flex items-center">
              <Calendar className="w-3.5 h-3.5 text-[#FF8C42] mr-1.5" />
              Schedule
            </h3>
            <div>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-9 px-2 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300"
                required
              />
              {fieldErrors.date && <p className="text-red-400 text-xs mt-1">{fieldErrors.date}</p>}
            </div>

            <div className="mt-2">
              <select
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className="w-full h-9 px-2 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300"
                required
              >
                <option value="">Select time</option>
                {timeSlots.map(slot => (
                  <option
                    key={slot.value}
                    value={slot.display}
                    disabled={!slot.available}
                  >
                    {slot.display} {!slot.available ? '(Booked)' : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.time && <p className="text-red-400 text-xs mt-1">{fieldErrors.time}</p>}
            </div>

            <div className="mt-2">
              <label className="block text-xs text-gray-400 mb-1">Payment</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full h-8 px-2 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="digital_wallet">Digital Wallet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-[#0F0F0F]/50 rounded-lg p-3 border border-[#333333]/50">
          <label className="block text-xs text-gray-400 mb-1">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full h-12 px-2 py-1.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 resize-none"
            placeholder="Special requests..."
          />
        </div>

        {/* Booking Summary */}
        {(formData.service && formData.date && formData.time) && (
          <div className="bg-gradient-to-r from-[#1A1A1A] to-[#222222] rounded-lg p-3 border border-[#FF8C42]/20">
            <h3 className="text-xs font-bold text-white mb-2 flex items-center">
              <Check className="w-3.5 h-3.5 text-[#FF8C42] mr-1.5" />
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-400">Service</p>
                <p className="text-white font-medium">{services?.find(s => s._id === formData.service)?.name}</p>
              </div>
              <div>
                <p className="text-gray-400">Date & Time</p>
                <p className="text-white font-medium">{formData.date ? new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'} {formData.time}</p>
              </div>
              <div>
                <p className="text-gray-400">Barber</p>
                <p className="text-white font-medium text-xs">{formData.barber ? barbers?.find(b => b._id === formData.barber)?.full_name : 'Any'}</p>
              </div>
              <div>
                <p className="text-gray-400">Price</p>
                <p className="text-[#FF8C42] font-bold">₱{services?.find(s => s._id === formData.service)?.price?.toFixed(0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3 border-t border-[#333333]">
          <button
            type="button"
            onClick={() => {
              resetForm()
              onClose()
            }}
            disabled={loading}
            className="flex-1 h-9 bg-[#2A2A2A] text-gray-300 rounded-lg font-medium hover:bg-[#333333] transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !services || !barbers || !customers}
            className="flex-1 h-9 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {bookingCreated && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => {
              setBookingCreated(null)
              onClose()
            }} />
            <div className="relative w-full max-w-sm transform rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#222222] shadow-2xl transition-all z-[10000] border border-[#333333]/50">
              <div className="text-center space-y-3 p-5">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-green-500/20 border border-green-500/30">
                  <Check className="w-6 h-6 text-green-400" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white mb-1">Booking Created!</h3>
                  <p className="text-xs text-gray-400">Details saved and customer notified</p>
                </div>

                {/* Booking Details */}
                <div className="text-left space-y-1.5 p-3 rounded-lg bg-[#0F0F0F]/50 border border-[#333333]/50 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Code:</span><span className="font-mono text-[#FF8C42]">#{bookingCreated.bookingCode}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Service:</span><span className="text-gray-300">{bookingCreated.service}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Date & Time:</span><span className="text-gray-300">{new Date(bookingCreated.date).toLocaleDateString()} {bookingCreated.time}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Barber:</span><span className="text-gray-300">{bookingCreated.barber}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Price:</span><span className="text-green-400 font-bold">₱{bookingCreated.price?.toFixed(2)}</span></div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setBookingCreated(null)
                      onClose()
                    }}
                    className="flex-1 py-2 px-3 rounded-lg font-medium text-gray-300 bg-[#2A2A2A] hover:bg-[#333333] transition-colors text-sm"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setBookingCreated(null)
                      onClose()
                    }}
                    className="flex-1 py-2 px-3 rounded-lg font-medium text-white bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:shadow-lg transition-all text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default CreateBookingModal