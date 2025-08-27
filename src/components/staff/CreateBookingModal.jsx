import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import { Calendar, Clock, User, Scissors, RefreshCw } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const CreateBookingModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    customer: '',
    service: '',
    barber: '',
    date: '',
    time: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  // Convex queries for dropdown data
  const services = useQuery(api.services.services.getAllServices)
  const barbers = useQuery(api.services.barbers.getActiveBarbers)
  const customers = useQuery(api.services.auth.getAllUsers)

  // Convex mutation for creating booking
  const createBooking = useMutation(api.services.bookings.createBooking)

  // Convex handles data loading automatically

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})
    
    try {
      // Validate required fields
      if (!formData.customer) {
        setFieldErrors({ customer: 'Please select a customer' })
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
        customer: formData.customer,
        service: formData.service,
        barber: formData.barber || undefined,
        date: formData.date,
        time: convertTo24Hour(formData.time),
        status: 'booked'
      }

      console.log('Creating booking:', bookingData)

      // Create booking via Convex
      const bookingId = await createBooking(bookingData)

      console.log('Booking created successfully:', bookingId)

      // Call parent success handler
      if (onSubmit) {
        await onSubmit({ _id: bookingId, ...bookingData })
      }
      
      // Reset form and close modal
      resetForm()
      onClose()
      
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
      customer: '',
      service: '',
      barber: '',
      date: '',
      time: ''
    })
    setError(null)
    setFieldErrors({})
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
  ]

  // Format service display
  const formatServiceOption = (service) => {
    const price = `₱${parseFloat(service.price).toFixed(2)}`
    const duration = `${service.duration_minutes} min`
    return `${service.name} - ${price} (${duration})`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Booking" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loadingData && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-orange-500 mr-2" />
            <span className="text-gray-600">Loading services and staff...</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <Scissors className="w-5 h-5 text-[#FF8C42] mr-2" />
              Service & Staff
            </h3>
            
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Service <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.service}
                onChange={(e) => handleInputChange('service', e.target.value)}
                required
                disabled={loadingData}
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 disabled:opacity-50"
              >
                <option value="">Select a service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {formatServiceOption(service)}
                  </option>
                ))}
              </select>
              {fieldErrors.service && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.service[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Barber (Optional)
              </label>
              <select
                value={formData.barber}
                onChange={(e) => handleInputChange('barber', e.target.value)}
                disabled={loadingData}
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 disabled:opacity-50"
              >
                <option value="">Any available barber</option>
                {barbers.filter(barber => barber.is_active).map(barber => (
                  <option key={barber.id} value={barber.id}>
                    {barber.full_name}
                  </option>
                ))}
              </select>
              {fieldErrors.barber && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.barber[0]}</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <User className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Staff Booking
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>This creates a booking for walk-in customers or phone bookings. The booking will be associated with the staff member making the reservation.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <Calendar className="w-5 h-5 text-[#FF8C42] mr-2" />
              Schedule
            </h3>
            
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]} // Prevent booking in the past
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
              error={fieldErrors.date?.[0]}
            />

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Time <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="">Select time</option>
                {timeSlots.map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              {fieldErrors.time && (
                <p className="text-red-500 text-sm mt-1">{fieldErrors.time[0]}</p>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Booking Information
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <ul className="list-disc pl-5">
                      <li>Status will be set to "Booked"</li>
                      <li>Customer will receive confirmation</li>
                      <li>Booking can be managed from the Bookings tab</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 pt-6 border-t border-[#F5F5F5]">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm()
              onClose()
            }}
            disabled={loading}
            className="flex-1 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || loadingData}
            className="flex-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Booking'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateBookingModal