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
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>1. Choose Service</h2>
          <div className="grid gap-3">
            {mockData.services.map((service) => (
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
                    <p className="text-sm mt-2" style={{ color: '#8B8B8B' }}>{service.duration}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-lg" style={{ color: '#F68B24' }}>{service.price}</p>
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
              {mockData.availableTimes.map((time) => (
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
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Select Staff (Optional) */}
        {selectedService && selectedDate && selectedTime && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#36454F' }}>4. Choose Staff (Optional)</h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedStaff('')}
                className="w-full p-4 rounded-lg border-2 text-left transition-colors"
                style={{
                  backgroundColor: selectedStaff === '' ? 'rgba(246, 139, 36, 0.1)' : 'white',
                  borderColor: selectedStaff === '' ? '#F68B24' : '#E0E0E0'
                }}
                onMouseEnter={(e) => {
                  if (selectedStaff !== '') {
                    e.target.style.borderColor = '#F68B24'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedStaff !== '') {
                    e.target.style.borderColor = '#E0E0E0'
                  }
                }}
              >
                <span className="font-medium" style={{ color: '#36454F' }}>No preference</span>
                <p className="text-sm" style={{ color: '#8B8B8B' }}>Any available staff member</p>
              </button>
              
              {mockData.staff.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff.name)}
                  className="w-full p-4 rounded-lg border-2 text-left transition-colors"
                  style={{
                    backgroundColor: selectedStaff === staff.name ? 'rgba(246, 139, 36, 0.1)' : 'white',
                    borderColor: selectedStaff === staff.name ? '#F68B24' : '#E0E0E0'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedStaff !== staff.name) {
                      e.target.style.borderColor = '#F68B24'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedStaff !== staff.name) {
                      e.target.style.borderColor = '#E0E0E0'
                    }
                  }}
                >
                  <span className="font-medium" style={{ color: '#36454F' }}>{staff.name}</span>
                  <p className="text-sm" style={{ color: '#8B8B8B' }}>{staff.specialty}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Booking Summary & Confirm */}
        {selectedService && selectedDate && selectedTime && (
          <Card style={{ backgroundColor: '#36454F', border: '1px solid #36454F' }}>
            <h3 className="font-semibold text-lg mb-4" style={{ color: '#F4F0E6' }}>Booking Summary</h3>
            <div className="space-y-2 text-sm" style={{ color: '#F4F0E6' }}>
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
              <div className="flex justify-between font-bold text-base pt-2" style={{ borderTop: '1px solid #8B8B8B' }}>
                <span>Total:</span>
                <span style={{ color: '#F68B24' }}>{selectedService.price}</span>
              </div>
            </div>
            <Button 
              onClick={handleBooking}
              className="mt-6 transition-colors"
              style={{ backgroundColor: '#F68B24', color: 'white' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
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