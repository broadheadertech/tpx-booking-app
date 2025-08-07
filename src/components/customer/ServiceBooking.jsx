import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Clock, DollarSign, User, Calendar, CheckCircle } from 'lucide-react'
import QRCode from 'qrcode'

const ServiceBooking = ({ onBack }) => {
  const [selectedService, setSelectedService] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [step, setStep] = useState(1) // 1: services, 2: time & staff, 3: confirmation

  const services = [
    {
      id: 1,
      name: 'Premium Haircut',
      price: 1750,
      duration: '45 min',
      category: 'Hair Services',
      description: 'Complete haircut with wash, styling, and premium products',
      image: '💇‍♂️'
    },
    {
      id: 2,
      name: 'Beard Trim & Style',
      price: 1250,
      duration: '30 min',
      category: 'Beard Services',
      description: 'Professional beard trimming and styling with hot towel',
      image: '🧔'
    },
    {
      id: 3,
      name: 'Classic Cut',
      price: 1000,
      duration: '30 min',
      category: 'Hair Services',
      description: 'Traditional barbershop haircut with basic styling',
      image: '✂️'
    },
    {
      id: 4,
      name: 'Hot Towel Shave',
      price: 1500,
      duration: '40 min',
      category: 'Shave Services',
      description: 'Luxury wet shave with hot towel treatment',
      image: '🪒'
    },
    {
      id: 5,
      name: 'Hair Wash & Dry',
      price: 500,
      duration: '20 min',
      category: 'Hair Services',
      description: 'Professional hair wash with premium shampoo and styling',
      image: '🧴'
    },
    {
      id: 6,
      name: 'Complete Package',
      price: 2500,
      duration: '75 min',
      category: 'Premium Services',
      description: 'Haircut, beard trim, hot towel shave, and styling',
      image: '⭐'
    }
  ]

  const timeSlots = [
    { time: '9:00 AM', available: true },
    { time: '9:30 AM', available: false },
    { time: '10:00 AM', available: true },
    { time: '10:30 AM', available: true },
    { time: '11:00 AM', available: false },
    { time: '11:30 AM', available: true },
    { time: '1:00 PM', available: true },
    { time: '1:30 PM', available: true },
    { time: '2:00 PM', available: false },
    { time: '2:30 PM', available: true },
    { time: '3:00 PM', available: true },
    { time: '3:30 PM', available: true },
    { time: '4:00 PM', available: true },
    { time: '4:30 PM', available: false }
  ]

  const staff = [
    {
      id: 1,
      name: 'Alex Rodriguez',
      specialty: 'Master Barber',
      experience: '8 years',
      rating: 4.9,
      image: '👨‍💼'
    },
    {
      id: 2,
      name: 'Mike Johnson',
      specialty: 'Hair Styling Expert',
      experience: '6 years',
      rating: 4.8,
      image: '👨‍💼'
    },
    {
      id: 3,
      name: 'Sarah Wilson',
      specialty: 'Beard Specialist',
      experience: '5 years',
      rating: 4.7,
      image: '👩‍💼'
    }
  ]

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    setStep(2)
  }

  const handleTimeAndStaffSelect = (time, staffMember) => {
    setSelectedTime(time)
    setSelectedStaff(staffMember)
    setStep(3)
  }

  const handleConfirmBooking = () => {
    // Generate booking ID
    const bookingId = 'BK' + Date.now().toString().slice(-8)
    
    // Here you would typically make an API call to create the booking
    const bookingData = {
      id: bookingId,
      service: selectedService,
      time: selectedTime,
      staff: selectedStaff,
      date: new Date().toISOString().split('T')[0],
      status: 'confirmed'
    }
    console.log('Booking confirmed:', bookingData)
    
    // Store in localStorage for demo (in real app, this would be in database)
    const existingBookings = JSON.parse(localStorage.getItem('userBookings') || '[]')
    existingBookings.push(bookingData)
    localStorage.setItem('userBookings', JSON.stringify(existingBookings))
    
    // Set booking data for QR display
    setStep(4) // Add QR step
  }

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8 px-4 py-4">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step >= stepNumber 
                ? 'bg-[#FF6644] text-white shadow-lg' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {stepNumber}
            </div>
            {stepNumber < 3 && (
              <div className={`w-12 h-1 mx-2 rounded transition-all duration-300 ${
                step > stepNumber ? 'bg-[#FF6644]' : 'bg-gray-200'
              }`}></div>
            )}
          </div>
        ))}
      </div>
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600 font-medium">
          {step === 1 && 'Choose your service'}
          {step === 2 && 'Select time & barber'}
          {step === 3 && 'Confirm booking'}
        </p>
      </div>
    </div>
  )

  const renderServiceSelection = () => (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-black text-black mb-2">Choose Your Service</h2>
        <p className="text-gray-600 font-medium">Select from our premium grooming services</p>
      </div>
      
      <div className="space-y-4">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceSelect(service)}
            className="w-full bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#FF6644] hover:shadow-lg transition-all duration-200 text-left group"
          >
            <div className="flex items-center space-x-4">
              <div className="text-3xl">{service.image}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-black text-black group-hover:text-[#FF6644] transition-colors duration-200 truncate">
                    {service.name}
                  </h3>
                  <div className="text-right ml-3">
                    <div className="text-xl font-black text-[#FF6644]">₱{service.price.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 font-medium">{service.duration}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="px-3 py-1 bg-[#FF6644]/10 text-[#FF6644] rounded-full text-sm font-semibold">
                    {service.category}
                  </span>
                </div>
                <p className="text-gray-600 text-sm font-medium leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderTimeAndStaffSelection = () => (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-black text-black mb-2">Select Time & Barber</h2>
        <p className="text-gray-600 font-medium">Choose your preferred time and barber</p>
      </div>

      {/* Selected Service Summary */}
      <div className="bg-white rounded-2xl p-4 border-2 border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{selectedService?.image}</div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-black">{selectedService?.name}</h3>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-[#FF6644] font-bold">₱{selectedService?.price.toLocaleString()}</span>
              <span className="text-gray-600 font-medium">{selectedService?.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm">
        <h3 className="text-lg font-black text-black mb-4">Available Times - Today</h3>
        <div className="grid grid-cols-3 gap-3">
          {timeSlots.slice(0, 9).map((slot) => (
            <button
              key={slot.time}
              onClick={() => slot.available && setSelectedTime(slot.time)}
              disabled={!slot.available}
              className={`p-3 rounded-xl font-semibold text-center transition-all duration-200 ${
                slot.available
                  ? selectedTime === slot.time
                    ? 'bg-[#FF6644] text-white shadow-lg'
                    : 'bg-gray-100 text-black hover:bg-[#FF6644]/10 hover:border-[#FF6644] border-2 border-transparent'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Selection */}
      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm">
        <h3 className="text-lg font-black text-black mb-4">Choose Your Barber</h3>
        <div className="space-y-3">
          {staff.map((staffMember) => (
            <button
              key={staffMember.id}
              onClick={() => setSelectedStaff(staffMember)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedStaff?.id === staffMember.id
                  ? 'border-[#FF6644] bg-[#FF6644]/5'
                  : 'border-gray-200 hover:border-[#FF6644]/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{staffMember.image}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-black">{staffMember.name}</h4>
                  <p className="text-sm text-gray-600">{staffMember.specialty}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex text-yellow-400 text-sm">★★★★★</div>
                    <span className="text-xs text-gray-500">{staffMember.rating}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      {selectedTime && selectedStaff && (
        <button
          onClick={() => handleTimeAndStaffSelect(selectedTime, selectedStaff)}
          className="w-full py-4 bg-[#FF6644] hover:bg-[#FF5533] text-white font-bold rounded-2xl transition-all duration-200 shadow-lg"
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
        {staff.map((staffMember) => (
          <button
            key={staffMember.id}
            onClick={() => handleStaffSelect(staffMember)}
            className="group bg-white rounded-3xl p-6 shadow-xl border-2 border-[#F5F5F5] hover:border-[#FF8C42] hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">{staffMember.image}</div>
              <h3 className="text-xl font-black text-[#1A1A1A] mb-2 group-hover:text-[#FF8C42] transition-colors duration-200">
                {staffMember.name}
              </h3>
              <div className="space-y-2">
                <div className="px-3 py-1 bg-[#FF8C42]/10 text-[#FF8C42] rounded-full text-sm font-semibold inline-block">
                  {staffMember.specialty}
                </div>
                <p className="text-[#6B6B6B] text-sm font-medium">{staffMember.experience} experience</p>
                <div className="flex items-center justify-center space-x-1">
                  <div className="flex text-yellow-400">
                    {'★'.repeat(5)}
                  </div>
                  <span className="text-sm font-bold text-[#6B6B6B] ml-1">{staffMember.rating}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderConfirmation = () => (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-black text-black mb-2">Confirm Your Booking</h2>
        <p className="text-gray-600 font-medium">Please review your appointment details</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
        <div className="space-y-6">
          {/* Service Details */}
          <div className="text-center border-b border-gray-200 pb-6">
            <div className="text-3xl mb-3">{selectedService?.image}</div>
            <h3 className="text-xl font-black text-black mb-2">{selectedService?.name}</h3>
            <div className="flex justify-center items-center space-x-4">
              <span className="text-[#FF6644] font-bold text-lg">₱{selectedService?.price.toLocaleString()}</span>
              <span className="text-gray-600 font-medium">{selectedService?.duration}</span>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-[#FF6644]" />
                <span className="font-semibold text-black">Date & Time</span>
              </div>
              <span className="font-bold text-black">Today, {selectedTime}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-[#FF6644]" />
                <span className="font-semibold text-black">Your Barber</span>
              </div>
              <span className="font-bold text-black">{selectedStaff?.name}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-600 hover:bg-gray-300 hover:text-black font-bold rounded-xl transition-all duration-200"
            >
              Go Back
            </button>
            <button
              onClick={handleConfirmBooking}
              className="flex-1 py-3 px-4 bg-[#FF6644] hover:bg-[#FF5533] text-white font-bold rounded-xl transition-all duration-200 shadow-lg"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBookingSuccess = () => {
    const qrRef = useRef(null)
    const bookingId = 'BK' + Date.now().toString().slice(-8)
    
    // Generate QR code data
    const qrData = JSON.stringify({
      bookingId: bookingId,
      service: selectedService?.name,
      time: selectedTime,
      staff: selectedStaff?.name,
      date: new Date().toISOString().split('T')[0],
      barbershop: 'TPX Barbershop'
    })

    useEffect(() => {
      if (qrRef.current) {
        // Generate QR code as canvas
        QRCode.toCanvas(qrRef.current, qrData, {
          width: 192,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        }, (error) => {
          if (error) console.error('QR Code generation error:', error)
        })
      }
    }, [qrData])

    return (
      <div className="space-y-6 px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-black mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 font-medium">Your appointment has been successfully booked</p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg text-center">
          <h3 className="text-lg font-black text-black mb-4">Your Booking QR Code</h3>
          
          {/* Real QR Code */}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
              <canvas ref={qrRef} className="rounded-xl"></canvas>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-lg font-black text-black">Booking ID: {bookingId}</p>
            <p className="text-sm text-gray-600">Show this QR code when you arrive</p>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-[#FF6644]/5 rounded-2xl p-6 border border-[#FF6644]/20">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-black font-medium">Service:</span>
              <span className="text-black font-bold">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black font-medium">Date & Time:</span>
              <span className="text-black font-bold">Today, {selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black font-medium">Barber:</span>
              <span className="text-black font-bold">{selectedStaff?.name}</span>
            </div>
            <div className="flex justify-between border-t border-[#FF6644]/20 pt-3">
              <span className="text-black font-bold">Total:</span>
              <span className="text-[#FF6644] font-black text-lg">₱{selectedService?.price.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onBack}
            className="w-full py-4 bg-[#FF6644] hover:bg-[#FF5533] text-white font-bold rounded-2xl transition-all duration-200 shadow-lg"
          >
            Back to Home
          </button>
          <button
            onClick={() => {
              // In a real app, this would navigate to bookings page
              alert('View My Bookings feature coming soon!')
            }}
            className="w-full py-3 border-2 border-[#FF6644] text-[#FF6644] hover:bg-[#FF6644] hover:text-white font-bold rounded-2xl transition-all duration-200"
          >
            View My Bookings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-black sticky top-0 z-40 shadow-lg">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white hover:text-[#FF6644] font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-lg font-bold text-white">Book Service</p>
              <p className="text-xs text-[#FF6644]">Step {step} of 3</p>
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