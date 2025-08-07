import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

function CustomerBooking() {
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const navigate = useNavigate()

  const mockData = {
    services: [
      { id: 1, name: 'Haircut', price: '$25', duration: '30 min', description: 'Classic haircut and styling' },
      { id: 2, name: 'Haircut & Wash', price: '$35', duration: '45 min', description: 'Haircut with premium wash and styling' },
      { id: 3, name: 'Beard Trim', price: '$15', duration: '20 min', description: 'Professional beard trimming and shaping' },
      { id: 4, name: 'Full Service', price: '$45', duration: '60 min', description: 'Haircut, wash, and beard trim' }
    ],
    availableTimes: [
      '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
      '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
      '4:00 PM', '4:30 PM', '5:00 PM'
    ],
    staff: [
      { id: 1, name: 'Mike', specialty: 'Classic cuts' },
      { id: 2, name: 'Sarah', specialty: 'Modern styles' },
      { id: 3, name: 'Alex', specialty: 'Beard specialist' }
    ]
  }

  const handleBooking = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      alert('Please select all required fields')
      return
    }
    
    // TODO: Implement booking logic
    alert('Booking confirmed! You will receive a confirmation email.')
    navigate('/customer/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-light">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center">
          <Link to="/customer/dashboard" className="mr-4">
            <span className="text-xl">←</span>
          </Link>
          <h1 className="text-xl font-bold text-primary-black">Book Appointment</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Step 1: Select Service */}
        <div>
          <h2 className="text-lg font-semibold text-primary-black mb-4">1. Choose Service</h2>
          <div className="grid gap-3">
            {mockData.services.map((service) => (
              <Card 
                key={service.id}
                className={`cursor-pointer transition-all ${
                  selectedService?.id === service.id 
                    ? 'ring-2 ring-primary-orange bg-orange-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedService(service)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary-black">{service.name}</h3>
                    <p className="text-gray-dark text-sm mt-1">{service.description}</p>
                    <p className="text-gray-dark text-sm mt-2">{service.duration}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-primary-orange text-lg">{service.price}</p>
                  </div>
                </div>
                {selectedService?.id === service.id && (
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <span className="text-primary-orange text-sm font-medium">✓ Selected</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Step 2: Select Date */}
        {selectedService && (
          <div>
            <h2 className="text-lg font-semibold text-primary-black mb-4">2. Choose Date</h2>
            <Card>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-orange"
              />
            </Card>
          </div>
        )}

        {/* Step 3: Select Time */}
        {selectedService && selectedDate && (
          <div>
            <h2 className="text-lg font-semibold text-primary-black mb-4">3. Choose Time</h2>
            <div className="grid grid-cols-3 gap-2">
              {mockData.availableTimes.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    selectedTime === time
                      ? 'border-primary-orange bg-primary-orange text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-primary-orange'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Select Staff (Optional) */}
        {selectedService && selectedDate && selectedTime && (
          <div>
            <h2 className="text-lg font-semibold text-primary-black mb-4">4. Choose Staff (Optional)</h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedStaff('')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedStaff === ''
                    ? 'border-primary-orange bg-orange-50'
                    : 'border-gray-300 bg-white hover:border-primary-orange'
                }`}
              >
                <span className="font-medium">No preference</span>
                <p className="text-gray-dark text-sm">Any available staff member</p>
              </button>
              
              {mockData.staff.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff.name)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedStaff === staff.name
                      ? 'border-primary-orange bg-orange-50'
                      : 'border-gray-300 bg-white hover:border-primary-orange'
                  }`}
                >
                  <span className="font-medium">{staff.name}</span>
                  <p className="text-gray-dark text-sm">{staff.specialty}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Booking Summary & Confirm */}
        {selectedService && selectedDate && selectedTime && (
          <Card className="bg-primary-black text-white">
            <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Service:</span>
                <span>{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{selectedTime}</span>
              </div>
              {selectedStaff && (
                <div className="flex justify-between">
                  <span>Staff:</span>
                  <span>{selectedStaff}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-600">
                <span>Total:</span>
                <span>{selectedService.price}</span>
              </div>
            </div>
            <Button 
              onClick={handleBooking}
              className="mt-6 bg-primary-orange hover:bg-orange-600"
            >
              Confirm Booking
            </Button>
          </Card>
        )}
      </div>

      {/* Add padding to prevent content from being cut off */}
      <div className="h-8"></div>
    </div>
  )
}

export default CustomerBooking