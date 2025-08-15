import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode, RefreshCw, CheckCircle } from 'lucide-react'
import bookingService from '../../services/customer/bookingService.js'

function BookingQRGenerator() {
  const [selectedService, setSelectedService] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState('')
  const [bookingQrUrl, setBookingQrUrl] = useState('')
  const [isGeneratingBooking, setIsGeneratingBooking] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const resetBooking = () => {
    setSelectedService(null)
    setSelectedBarber('')
    setBookingQrUrl('')
    setBookingConfirmed(false)
  }

  // Load real data from APIs
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [servicesData, barbersData] = await Promise.all([
          bookingService.getServices(),
          bookingService.getBarbers()
        ])
        
        setServices(servicesData)
        setBarbers(barbersData)
      } catch (err) {
        console.error('Error loading booking data:', err)
        setError('Failed to load services and barbers. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const generateBookingQR = async () => {
    if (!selectedService) return

    setIsGeneratingBooking(true)
    setError(null)

    try {
      // Create booking with real API
      const bookingData = {
        service_id: selectedService.id,
        barber_id: selectedBarber || null,
        date: new Date().toISOString().split('T')[0], // Today's date
        time: '10:00', // Default time
        notes: `Kiosk booking for ${selectedService.name}`
      }

      const booking = await bookingService.createBooking(bookingData)
      
      // Generate QR code with booking code
      const qrData = booking.booking_code
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#36454F',
          light: '#FFFFFF'
        }
      })

      setBookingQrUrl(qrCodeUrl)
      setBookingConfirmed(true)
    } catch (err) {
      console.error('Error creating booking:', err)
      setError('Failed to create booking. Please try again.')
    } finally {
      setIsGeneratingBooking(false)
    }
  }

  const printQRCode = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>TPX Barbershop - Booking QR Code</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .header { 
              color: #36454F; 
              margin-bottom: 20px; 
            }
            .qr-container { 
              margin: 20px 0; 
            }
            .service-info { 
              background: #F0F8FF; 
              padding: 15px; 
              border-radius: 10px; 
              margin: 20px 0; 
              border: 1px solid #E0E0E0;
            }
            .footer { 
              color: #8B8B8B; 
              font-size: 12px; 
              margin-top: 30px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TPX Barbershop</h1>
            <h2>Booking Confirmation</h2>
          </div>
          <div class="service-info">
            <h3>Service: ${selectedService?.name}</h3>
            <p>Price: ₱${selectedService?.price}</p>
            ${selectedBarber ? `<p>Barber: ${barbers.find(b => b.id === selectedBarber)?.name}</p>` : ''}
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="qr-container">
            <img src="${bookingQrUrl}" alt="Booking QR Code" />
          </div>
          <div class="footer">
            <p>Show this QR code at the kiosk to confirm your appointment</p>
            <p>Thank you for choosing TPX Barbershop!</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderColor: '#F68B24', borderTopColor: 'transparent'}}></div>
          <p className="text-lg font-medium" style={{color: '#36454F'}}>Loading Services...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#FEE'}}>
          <X className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{color: '#36454F'}}>Error Loading Data</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 text-white font-bold rounded-xl transition-colors duration-200"
          style={{backgroundColor: '#F68B24'}}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#E67A1F'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!bookingConfirmed ? (
        <>
          {/* Service Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
            <h3 className="text-xl font-bold mb-4" style={{color: '#36454F'}}>Choose Your Service</h3>
            <div className="grid gap-3">
              {services.map((service) => (
                <div 
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                    selectedService?.id === service.id 
                      ? 'ring-2 ring-offset-2' 
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: selectedService?.id === service.id ? '#F0F8FF' : '#F4F0E6',
                    border: '1px solid #E0E0E0',
                    ringColor: selectedService?.id === service.id ? '#F68B24' : 'transparent'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-lg" style={{color: '#36454F'}}>{service.name}</h4>
                      <p className="text-sm" style={{color: '#8B8B8B'}}>{service.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" style={{color: '#36454F'}}>₱{service.price}</p>
                      <p className="text-sm" style={{color: '#8B8B8B'}}>{service.duration} min</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Barber Selection */}
          {selectedService && (
            <div className="bg-white rounded-2xl p-6 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
              <h3 className="text-xl font-bold mb-4" style={{color: '#36454F'}}>Choose Your Barber (Optional)</h3>
              <div className="grid gap-3">
                <div 
                  onClick={() => setSelectedBarber('')}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                    selectedBarber === '' 
                      ? 'ring-2 ring-offset-2' 
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: selectedBarber === '' ? '#F0F8FF' : '#F4F0E6',
                    border: '1px solid #E0E0E0',
                    ringColor: selectedBarber === '' ? '#F68B24' : 'transparent'
                  }}
                >
                  <h4 className="font-bold" style={{color: '#36454F'}}>Any Available Barber</h4>
                  <p className="text-sm" style={{color: '#8B8B8B'}}>We'll assign the next available barber</p>
                </div>
                {barbers.map((barber) => (
                  <div 
                    key={barber.id}
                    onClick={() => setSelectedBarber(barber.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                      selectedBarber === barber.id 
                        ? 'ring-2 ring-offset-2' 
                        : 'hover:shadow-md'
                    }`}
                    style={{
                      backgroundColor: selectedBarber === barber.id ? '#F0F8FF' : '#F4F0E6',
                      border: '1px solid #E0E0E0',
                      ringColor: selectedBarber === barber.id ? '#F68B24' : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold" style={{color: '#36454F'}}>{barber.name}</h4>
                        <p className="text-sm" style={{color: '#8B8B8B'}}>{barber.specialties}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium" style={{color: '#4CAF50'}}>
                          {barber.rating}⭐ ({barber.reviews} reviews)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          {selectedService && (
            <div className="text-center">
              <button
                onClick={generateBookingQR}
                disabled={isGeneratingBooking}
                className="px-8 py-4 text-white font-bold rounded-xl transition-all duration-200 text-lg shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isGeneratingBooking ? '#8B8B8B' : '#F68B24'
                }}
                onMouseEnter={(e) => !isGeneratingBooking && (e.target.style.backgroundColor = '#E67A1F')}
                onMouseLeave={(e) => !isGeneratingBooking && (e.target.style.backgroundColor = '#F68B24')}
              >
                {isGeneratingBooking ? (
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Creating Booking...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <QrCode className="w-5 h-5" />
                    <span>Generate Booking QR</span>
                  </div>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        /* Booking Confirmation */
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center" style={{border: '1px solid #E0E0E0'}}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl" style={{backgroundColor: '#4CAF50'}}>
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold mb-2" style={{color: '#36454F'}}>Booking Confirmed!</h2>
          <p className="text-lg mb-6" style={{color: '#4CAF50'}}>Your appointment has been scheduled</p>

          {/* Service Summary */}
          <div className="rounded-xl p-6 mb-6 text-left" style={{backgroundColor: '#F0F8FF', border: '1px solid #E0E0E0'}}>
            <h3 className="font-bold mb-4" style={{color: '#36454F'}}>Booking Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{color: '#8B8B8B'}}>Service:</span>
                <span className="font-medium" style={{color: '#36454F'}}>{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#8B8B8B'}}>Price:</span>
                <span className="font-medium" style={{color: '#36454F'}}>₱{selectedService?.price}</span>
              </div>
              <div className="flex justify-between">
                <span style={{color: '#8B8B8B'}}>Duration:</span>
                <span className="font-medium" style={{color: '#36454F'}}>{selectedService?.duration} minutes</span>
              </div>
              {selectedBarber && (
                <div className="flex justify-between">
                  <span style={{color: '#8B8B8B'}}>Barber:</span>
                  <span className="font-medium" style={{color: '#36454F'}}>
                    {barbers.find(b => b.id === selectedBarber)?.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{color: '#8B8B8B'}}>Date:</span>
                <span className="font-medium" style={{color: '#36454F'}}>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="rounded-xl p-6 mb-6" style={{backgroundColor: '#FFFFFF', border: '2px solid #F68B24'}}>
            <h3 className="font-bold mb-4" style={{color: '#36454F'}}>Your Booking QR Code</h3>
            <div className="flex justify-center mb-4">
              <img 
                src={bookingQrUrl} 
                alt="Booking QR Code" 
                className="rounded-lg shadow-lg"
                style={{maxWidth: '200px', height: 'auto'}}
              />
            </div>
            <p className="text-sm" style={{color: '#8B8B8B'}}>
              Show this QR code at the kiosk scanner to confirm your appointment
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={printQRCode}
              className="px-6 py-3 text-white font-bold rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
              style={{backgroundColor: '#36454F'}}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2A3640'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#36454F'}
            >
              <span>Print QR Code</span>
            </button>
            <button
              onClick={resetBooking}
              className="px-6 py-3 font-bold rounded-xl transition-colors duration-200 border-2"
              style={{
                color: '#36454F',
                borderColor: '#36454F',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#36454F'
                e.target.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
                e.target.style.color = '#36454F'
              }}
            >
              Book Another Service
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingQRGenerator
