import React, { useState, useEffect, useRef } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import { Calendar, Clock, User, Scissors, RefreshCw, ChevronDown, Check, UserPlus, Phone, Mail, MapPin, FileText, CreditCard, AlertCircle, Plus } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const CreateBookingModal = ({ isOpen, onClose, onSubmit }) => {
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

  // Convex queries for dropdown data
  const services = useQuery(api.services.services.getAllServices)
  const barbers = useQuery(api.services.barbers.getActiveBarbers)
  const customers = useQuery(api.services.auth.getAllUsers)
  const barberAvailability = useQuery(api.services.bookings.getBookingsByBarberAndDate,
    (formData.barber && formData.date) ? {
      barberId: formData.barber,
      date: formData.date
    } : "skip"
  )

  // Convex mutations
  const createBooking = useMutation(api.services.bookings.createBooking)
  const createWalkinCustomer = useMutation(api.services.auth.registerUser)

  // Convex handles data loading automatically

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
        return
      }

      // Validate walk-in customer fields
      if (formData.customerType === 'walkin') {
        if (!formData.walkinName.trim()) {
          setFieldErrors({ walkinName: 'Customer name is required' })
          return
        }
        if (formData.walkinName.trim().length < 2) {
          setFieldErrors({ walkinName: 'Customer name must be at least 2 characters' })
          return
        }
        if (!formData.walkinPhone.trim()) {
          setFieldErrors({ walkinPhone: 'Phone number is required' })
          return
        }
        // Validate Philippine phone number format
        const phoneRegex = /^(\+63|0)[9][0-9]{9}$/
        if (!phoneRegex.test(formData.walkinPhone.replace(/\s/g, ''))) {
          setFieldErrors({ walkinPhone: 'Please enter a valid Philippine phone number (e.g., 09123456789)' })
          return
        }
        if (formData.walkinEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.walkinEmail)) {
          setFieldErrors({ walkinEmail: 'Please enter a valid email address' })
          return
        }

        // Create walk-in customer
        try {
          const walkinCustomerData = {
            username: `walkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            password: 'walkin_temp', // Temporary password
            email: formData.walkinEmail || `walkin_${Date.now()}@temp.local`,
            mobile_number: formData.walkinPhone,
            role: 'customer'
          }

          const walkinResult = await createWalkinCustomer(walkinCustomerData)
          customerId = walkinResult.userId

          console.log('Walk-in customer created:', customerId)
        } catch (walkinErr) {
          console.error('Error creating walk-in customer:', walkinErr)
          setError('Failed to create walk-in customer. Please try again.')
          return
        }
      }

      // Validate other required fields
      if (!formData.service) {
        setFieldErrors({ service: 'Please select a service' })
        return
      }
      if (!formData.date) {
        setFieldErrors({ date: 'Please select a date' })
        return
      }
      if (!formData.time) {
        setFieldErrors({ time: 'Please select a time' })
        return
      }

      // Validate date constraints
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        setFieldErrors({ date: 'Cannot book appointments in the past' })
        return
      }

      // Check if selected date is more than 30 days in advance
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 30)
      if (selectedDate > maxDate) {
        setFieldErrors({ date: 'Cannot book appointments more than 30 days in advance' })
        return
      }

      // Validate business hours (9 AM to 5 PM)
      const selectedTime = formData.time
      const hour = parseInt(selectedTime.split(':')[0])
      if (hour < 9 || hour >= 17) {
        setFieldErrors({ time: 'Please select a time between 9:00 AM and 5:00 PM' })
        return
      }

      // Check if selected time slot is available
      const selectedSlot = timeSlots.find(slot => slot.display === formData.time)
      if (selectedSlot && !selectedSlot.available) {
        setFieldErrors({ time: 'This time slot is already booked. Please select another time.' })
        return
      }

      // Validate notes length if provided
      if (formData.notes && formData.notes.length > 500) {
        setFieldErrors({ notes: 'Notes cannot exceed 500 characters' })
        return
      }

      // Convert 12-hour time to 24-hour format for API
      const convertTo24Hour = (time12h) => {
        const [time, modifier] = time12h.split(' ')
        let [hours, minutes] = time.split(':')
        if (hours === '12') {
          hours = '00'
        }
        if (modifier === 'PM') {
          hours = parseInt(hours, 10) + 12
        }
        return `${hours.toString().padStart(2, '0')}:${minutes}`
      }

      // Prepare booking data for Convex
      const bookingData = {
        customer: customerId,
        service: formData.service,
        barber: formData.barber || undefined,
        date: formData.date,
        time: convertTo24Hour(formData.time),
        status: 'booked',
        notes: formData.notes || undefined
      }

      console.log('Creating booking:', bookingData)

      // Create booking via Convex
      const bookingId = await createBooking(bookingData)

      console.log('Booking created successfully:', bookingId)

      // Get booking details for success display
      const serviceDetails = services?.find(s => s._id === formData.service)
      const barberDetails = barbers?.find(b => b._id === formData.barber)

      // Show success modal with booking details
      setBookingCreated({
        bookingCode: `BK${Date.now().toString().slice(-6)}`, // Temporary code for display
        service: serviceDetails?.name,
        barber: barberDetails?.full_name || 'Any available',
        date: formData.date,
        time: formData.time,
        price: serviceDetails?.price,
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

      // Reset form and close modal after showing success
      resetForm()
      // Don't close modal immediately - let user see the success message

    } catch (err) {
      console.error('Error creating booking:', err)

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
      } else {
        setError(err.message || 'Failed to create booking. Please try again.')
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

          // Simple overlap check (could be improved)
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
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Time slots are now generated dynamically

  // Format service display
  const formatServiceOption = (service) => {
    const price = `₱${parseFloat(service.price).toFixed(2)}`
    const duration = `${service.duration_minutes} min`
    return `${service.name} - ${price} (${duration})`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Booking" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {(!services || !barbers || !customers) && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FF8C42] mr-3" />
            <span className="text-gray-600 font-medium">Loading services and staff...</span>
          </div>
        )}

        {/* Customer Type Selection */}
        <div className="bg-gradient-to-br from-[#F4F0E6] to-[#E8DCC0] rounded-xl p-6 border border-[#D4C4A8]">
          <h3 className="text-lg font-bold text-[#36454F] mb-4 flex items-center">
            <User className="w-5 h-5 text-[#FF8C42] mr-2" />
            Customer Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="customerType"
                  value="existing"
                  checked={formData.customerType === 'existing'}
                  onChange={(e) => handleInputChange('customerType', e.target.value)}
                  className="w-4 h-4 text-[#FF8C42] focus:ring-[#FF8C42]"
                />
                <span className="text-[#36454F] font-medium">Existing Customer</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="customerType"
                  value="walkin"
                  checked={formData.customerType === 'walkin'}
                  onChange={(e) => handleInputChange('customerType', e.target.value)}
                  className="w-4 h-4 text-[#FF8C42] focus:ring-[#FF8C42]"
                />
                <span className="text-[#36454F] font-medium">Walk-in Customer</span>
              </label>
            </div>
          </div>

          {formData.customerType === 'existing' ? (
            <div>
              <label className="block text-[#36454F] font-bold text-base mb-2">
                Select Customer <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={customerDropdownRef}>
                <button
                  type="button"
                  onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                  disabled={!customers}
                  className="w-full h-12 px-4 border-2 border-[#D4C4A8] rounded-xl text-left flex items-center justify-between focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 disabled:opacity-50 bg-white"
                >
                  <div className="flex items-center">
                    {formData.customer ? (
                      (() => {
                        const selectedCustomer = customers?.find(c => c._id === formData.customer)
                        return selectedCustomer ? (
                          <>
                            <div className="w-8 h-8 rounded-full bg-[#FF8C42] flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-[#36454F]">{selectedCustomer.username}</div>
                              <div className="text-sm text-[#8B8B8B]">{selectedCustomer.mobile_number}</div>
                            </div>
                          </>
                        ) : (
                          <span className="text-[#8B8B8B]">Select a customer</span>
                        )
                      })()
                    ) : (
                      <span className="text-[#8B8B8B]">Select a customer</span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-[#8B8B8B] transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {customerDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[#D4C4A8] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {customers?.filter(customer => customer.role === 'customer').map(customer => (
                      <button
                        key={customer._id}
                        type="button"
                        onClick={() => {
                          handleInputChange('customer', customer._id)
                          setCustomerDropdownOpen(false)
                        }}
                        className="w-full px-4 py-3 flex items-center hover:bg-[#F4F0E6] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#FF8C42] flex items-center justify-center mr-3">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-[#36454F]">{customer.username}</div>
                          <div className="text-sm text-[#8B8B8B]">{customer.mobile_number}</div>
                        </div>
                        {formData.customer === customer._id && <Check className="w-5 h-5 text-[#FF8C42] ml-auto" />}
                      </button>
                    )) || []}
                  </div>
                )}
              </div>
              {fieldErrors.customer && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.customer}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B8B8B]" />
                  <input
                    type="text"
                    value={formData.walkinName}
                    onChange={(e) => handleInputChange('walkinName', e.target.value)}
                    className="w-full h-12 pl-10 pr-4 border-2 border-[#D4C4A8] rounded-xl focus:outline-none focus:border-[#FF8C42] transition-colors bg-white"
                    placeholder="Enter customer name"
                  />
                </div>
                {fieldErrors.walkinName && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.walkinName}</p>
                )}
              </div>
              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B8B8B]" />
                  <input
                    type="tel"
                    value={formData.walkinPhone}
                    onChange={(e) => handleInputChange('walkinPhone', e.target.value)}
                    className="w-full h-12 pl-10 pr-4 border-2 border-[#D4C4A8] rounded-xl focus:outline-none focus:border-[#FF8C42] transition-colors bg-white"
                    placeholder="Enter phone number"
                  />
                </div>
                {fieldErrors.walkinPhone && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.walkinPhone}</p>
                )}
              </div>
              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B8B8B]" />
                  <input
                    type="email"
                    value={formData.walkinEmail}
                    onChange={(e) => handleInputChange('walkinEmail', e.target.value)}
                    className="w-full h-12 pl-10 pr-4 border-2 border-[#D4C4A8] rounded-xl focus:outline-none focus:border-[#FF8C42] transition-colors bg-white"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service & Staff Section */}
          <div className="bg-gradient-to-br from-[#F4F0E6] to-[#E8DCC0] rounded-xl p-6 border border-[#D4C4A8]">
            <h3 className="text-lg font-bold text-[#36454F] mb-4 flex items-center">
              <Scissors className="w-5 h-5 text-[#FF8C42] mr-2" />
              Service & Staff
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Service <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.service}
                  onChange={(e) => handleInputChange('service', e.target.value)}
                  required
                  disabled={!services}
                  className="w-full h-12 px-4 border-2 border-[#D4C4A8] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 disabled:opacity-50 bg-white"
                >
                  <option value="">Select a service</option>
                  {services?.filter(service => service.is_active).map(service => (
                    <option key={service._id} value={service._id}>
                      {formatServiceOption(service)}
                    </option>
                  )) || []}
                </select>
                {fieldErrors.service && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.service}</p>
                )}
              </div>

              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Barber (Optional)
                </label>
                <div className="relative" ref={barberDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setBarberDropdownOpen(!barberDropdownOpen)}
                    disabled={!barbers}
                    className="w-full h-12 px-4 border-2 border-[#D4C4A8] rounded-xl text-left flex items-center justify-between focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 disabled:opacity-50 bg-white"
                  >
                    <div className="flex items-center">
                      {formData.barber ? (
                        (() => {
                          const selectedBarber = barbers?.find(b => b._id === formData.barber)
                          return selectedBarber ? (
                            <>
                              <img
                                src={selectedBarber.avatarUrl || '/img/avatar_default.jpg'}
                                alt={selectedBarber.full_name}
                                className="w-8 h-8 rounded-full object-cover mr-3"
                              />
                              <div className="text-left">
                                <div className="font-medium text-[#36454F]">{selectedBarber.full_name}</div>
                                <div className="text-sm text-[#8B8B8B]">{selectedBarber.experience}</div>
                              </div>
                            </>
                          ) : (
                            <span className="text-[#8B8B8B]">Any available barber</span>
                          )
                        })()
                      ) : (
                        <span className="text-[#8B8B8B]">Any available barber</span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-[#8B8B8B] transition-transform ${barberDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {barberDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[#D4C4A8] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange('barber', '')
                          setBarberDropdownOpen(false)
                        }}
                        className="w-full px-4 py-3 flex items-center hover:bg-[#F4F0E6] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-[#36454F]">Any available barber</span>
                        {!formData.barber && <Check className="w-5 h-5 text-[#FF8C42] ml-auto" />}
                      </button>

                      {barbers?.filter(barber => barber.is_active).map(barber => (
                        <button
                          key={barber._id}
                          type="button"
                          onClick={() => {
                            handleInputChange('barber', barber._id)
                            setBarberDropdownOpen(false)
                          }}
                          className="w-full px-4 py-3 flex items-center hover:bg-[#F4F0E6] transition-colors"
                        >
                          <img
                            src={barber.avatarUrl || '/img/avatar_default.jpg'}
                            alt={barber.full_name}
                            className="w-8 h-8 rounded-full object-cover mr-3"
                          />
                          <div className="text-left">
                            <div className="font-medium text-[#36454F]">{barber.full_name}</div>
                            <div className="text-sm text-[#8B8B8B]">{barber.experience}</div>
                          </div>
                          {formData.barber === barber._id && <Check className="w-5 h-5 text-[#FF8C42] ml-auto" />}
                        </button>
                      )) || []}
                    </div>
                  )}
                </div>
                {fieldErrors.barber && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.barber}</p>
                )}
              </div>

              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Notes (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-[#8B8B8B]" />
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full h-20 pl-10 pr-4 pt-3 border-2 border-[#D4C4A8] rounded-xl focus:outline-none focus:border-[#FF8C42] transition-colors bg-white resize-none"
                    placeholder="Any special requests or notes..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="bg-gradient-to-br from-[#F4F0E6] to-[#E8DCC0] rounded-xl p-6 border border-[#D4C4A8]">
            <h3 className="text-lg font-bold text-[#36454F] mb-4 flex items-center">
              <Calendar className="w-5 h-5 text-[#FF8C42] mr-2" />
              Schedule
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B8B8B]" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full h-12 pl-10 pr-4 border-2 border-[#D4C4A8] rounded-xl focus:outline-none focus:border-[#FF8C42] transition-colors bg-white"
                    required
                  />
                </div>
                {fieldErrors.date && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B8B8B]" />
                  <select
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full h-12 pl-10 pr-4 border-2 border-[#D4C4A8] rounded-xl focus:outline-none focus:border-[#FF8C42] transition-colors bg-white"
                    required
                  >
                    <option value="">Select time</option>
                    {timeSlots.map(slot => (
                      <option
                        key={slot.value}
                        value={slot.display}
                        disabled={!slot.available}
                        className={!slot.available ? 'text-red-400' : ''}
                      >
                        {slot.display} {!slot.available ? '(Booked)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.time && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.time}</p>
                )}
              </div>

              <div>
                <label className="block text-[#36454F] font-bold text-base mb-2">
                  Payment Method
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8B8B8B]" />
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="w-full h-12 pl-10 pr-4 border-2 border-[#D4C4A8] rounded-xl focus:outline-none focus:border-[#FF8C42] transition-colors bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="digital_wallet">Digital Wallet</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        {(formData.service && formData.date && formData.time) && (
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl p-6 border border-[#444444]/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Check className="w-5 h-5 text-[#FF8C42] mr-2" />
              Booking Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-[#8B8B8B] mb-1">Service</p>
                <p className="text-white font-medium">
                  {services?.find(s => s._id === formData.service)?.name || 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[#8B8B8B] mb-1">Date & Time</p>
                <p className="text-white font-medium">
                  {formData.date ? new Date(formData.date).toLocaleDateString() : 'N/A'} at {formData.time || 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[#8B8B8B] mb-1">Barber</p>
                <p className="text-white font-medium">
                  {formData.barber ? barbers?.find(b => b._id === formData.barber)?.full_name : 'Any available'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[#8B8B8B] mb-1">Price</p>
                <p className="text-green-400 font-bold">
                  ₱{services?.find(s => s._id === formData.service)?.price?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-6 border-t border-[#D4C4A8]">
          <button
            type="button"
            onClick={() => {
              resetForm()
              onClose()
            }}
            disabled={loading}
            className="flex-1 h-12 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !services || !barbers || !customers}
            className="flex-1 h-12 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Create Booking</span>
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
            <div className="relative w-full max-w-md transform rounded-2xl bg-white shadow-2xl transition-all z-[10000]">
              <div className="text-center space-y-4 p-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-green-100">
                  <Check className="w-8 h-8 text-green-600" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Created Successfully!</h3>
                  <p className="text-sm text-gray-600 mb-4">Booking details have been saved and customer notified.</p>
                </div>

                {/* Booking Details */}
                <div className="text-left space-y-3 p-4 rounded-xl bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Booking Code:</span>
                    <span className="text-sm font-mono font-bold text-[#FF8C42]">#{bookingCreated.bookingCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Service:</span>
                    <span className="text-sm font-bold text-gray-900">{bookingCreated.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Date & Time:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {new Date(bookingCreated.date).toLocaleDateString()} at {bookingCreated.time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Barber:</span>
                    <span className="text-sm font-bold text-gray-900">{bookingCreated.barber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Price:</span>
                    <span className="text-sm font-bold text-green-600">₱{bookingCreated.price?.toFixed(2)}</span>
                  </div>
                  {bookingCreated.customerName && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Customer:</span>
                      <span className="text-sm font-bold text-gray-900">{bookingCreated.customerName}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setBookingCreated(null)
                      onClose()
                    }}
                    className="flex-1 py-2 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Could add print receipt functionality here
                      setBookingCreated(null)
                      onClose()
                    }}
                    className="flex-1 py-2 px-4 rounded-xl font-medium text-white transition-colors"
                    style={{backgroundColor: '#FF8C42'}}
                  >
                    Print Receipt
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