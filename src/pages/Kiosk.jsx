import { useState, useRef, useEffect } from 'react'
import QrScanner from 'qr-scanner'
import QRCode from 'qrcode'
import { QrCode, Download, RefreshCw, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

// Booking QR Generator Component
function BookingQRGenerator() {
  const [selectedService, setSelectedService] = useState(null)

  const [selectedBarber, setSelectedBarber] = useState('')
  const [bookingQrUrl, setBookingQrUrl] = useState('')
  const [isGeneratingBooking, setIsGeneratingBooking] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)

  const resetBooking = () => {
    setSelectedService(null)
    setSelectedBarber('')
    setBookingQrUrl('')
    setBookingConfirmed(false)
  }

  

  const mockData = {
    services: [
      { id: 1, name: 'Haircut', price: '₱250', duration: '30 min', description: 'Classic haircut and styling' },
      { id: 2, name: 'Haircut & Wash', price: '₱350', duration: '45 min', description: 'Haircut with premium wash and styling' },
      { id: 3, name: 'Beard Trim', price: '₱150', duration: '20 min', description: 'Professional beard trimming and shaping' },
      { id: 4, name: 'Full Service', price: '₱450', duration: '60 min', description: 'Haircut, wash, and beard trim' }
    ],

    barbers: [
      { id: 1, name: 'Mike', specialty: 'Classic cuts' },
      { id: 2, name: 'Sarah', specialty: 'Modern styles' },
      { id: 3, name: 'Alex', specialty: 'Beard specialist' }
    ]
  }

  const generateBookingQR = async () => {
    if (!selectedService) {
      alert('Please select a service')
      return
    }
    
    setIsGeneratingBooking(true)
    try {
      // Add artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const bookingData = {
        service: selectedService.name,
        price: selectedService.price,
        duration: selectedService.duration,
        barber: selectedBarber || 'Any Barber',
        bookingId: 'BK' + Date.now(),
        timestamp: new Date().toISOString()
      }
      
      const qrContent = JSON.stringify(bookingData)
      const url = await QRCode.toDataURL(qrContent, {
        width: 400,
        margin: 3,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      setBookingQrUrl(url)
      setBookingConfirmed(true)
    } catch (error) {
      console.error('Error generating booking QR code:', error)
    } finally {
      setIsGeneratingBooking(false)
    }
  }

  const printBookingQR = () => {
    if (!bookingQrUrl) return
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Booking QR Code</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              font-family: Arial, sans-serif;
            }
            .booking-container {
              text-align: center;
              page-break-inside: avoid;
              max-width: 500px;
            }
            .qr-code {
              max-width: 300px;
              margin: 20px 0;
            }
            .booking-details {
              margin-top: 20px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              text-align: left;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e9ecef;
            }
            .detail-row:last-child {
              border-bottom: none;
              font-weight: bold;
              font-size: 1.1em;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="booking-container">
            <h2>Booking Confirmation</h2>
            <img src="${bookingQrUrl}" alt="Booking QR Code" class="qr-code" />
            <div class="booking-details">
              <div class="detail-row">
                <span>Service:</span>
                <span>${selectedService.name}</span>
              </div>
              <div class="detail-row">
                <span>Duration:</span>
                <span>${selectedService.duration}</span>
              </div>
              ${selectedBarber ? `<div class="detail-row"><span>Barber:</span><span>${selectedBarber}</span></div>` : ''}
              <div class="detail-row">
                <span>Total:</span>
                <span>${selectedService.price}</span>
              </div>
            </div>
            <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
              Present this QR code at your appointment
            </p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  if (bookingConfirmed && bookingQrUrl) {
    return (
      <div className="space-y-6">
        {/* Booking Confirmation */}
        <div className="bg-white rounded-2xl p-6 text-center shadow-lg" style={{border: '1px solid #E0E0E0'}}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#4CAF50'}}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2" style={{color: '#36454F'}}>Booking Confirmed!</h3>
          <p style={{color: '#8B8B8B'}}>Your appointment has been scheduled</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Booking Details */}
          <div className="bg-white rounded-2xl p-4 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
            <h3 className="font-semibold mb-3 text-base" style={{color: '#36454F'}}>Booking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between" style={{color: '#8B8B8B'}}>
                <span>Service:</span>
                <span className="font-medium" style={{color: '#36454F'}}>{selectedService.name}</span>
              </div>
              <div className="flex justify-between" style={{color: '#8B8B8B'}}>
                <span>Duration:</span>
                <span className="font-medium" style={{color: '#36454F'}}>{selectedService.duration}</span>
              </div>
              {selectedBarber && (
                <div className="flex justify-between" style={{color: '#8B8B8B'}}>
                  <span>Barber:</span>
                  <span className="font-medium" style={{color: '#36454F'}}>{selectedBarber}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2" style={{borderTop: '1px solid #E0E0E0'}}>
                <span style={{color: '#8B8B8B'}}>Total:</span>
                <span style={{color: '#F68B24'}}>{selectedService.price}</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-4 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
            <h3 className="font-semibold mb-3 text-base" style={{color: '#36454F'}}>Your QR Code</h3>
            <div className="rounded-xl p-4 flex items-center justify-center mb-4" style={{backgroundColor: '#F4F0E6', border: '1px solid #E0E0E0'}}>
              <img src={bookingQrUrl} alt="Booking QR Code" className="max-w-full max-h-full" style={{maxWidth: '200px', maxHeight: '200px'}} />
            </div>
            <button
              onClick={printBookingQR}
              className="w-full py-3 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
              style={{
                backgroundColor: '#F68B24'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#E67A1F'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print QR Code</span>
            </button>
            <p className="text-sm text-center mt-3" style={{color: '#8B8B8B'}}>
              Present this QR code at your appointment
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Step 1: Select Service */}
      <div>
        <h2 className="text-xl font-semibold mb-4" style={{color: '#36454F'}}>1. Choose Service</h2>
        <div className="grid gap-3">
          {mockData.services.map((service) => (
            <div 
              key={service.id}
              className={`cursor-pointer transition-all rounded-xl p-4 ${
                selectedService?.id === service.id 
                  ? 'bg-white shadow-lg' 
                  : 'bg-white hover:shadow-md'
              }`}
              style={{
                border: selectedService?.id === service.id 
                  ? '2px solid #F68B24' 
                  : '1px solid #E0E0E0'
              }}
              onClick={() => setSelectedService(service)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-base" style={{color: '#36454F'}}>{service.name}</h3>
                  <p className="text-sm mt-1" style={{color: '#8B8B8B'}}>{service.description}</p>
                  <p className="text-sm mt-2" style={{color: '#8B8B8B'}}>{service.duration}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-lg" style={{color: '#F68B24'}}>{service.price}</p>
                </div>
              </div>
              {selectedService?.id === service.id && (
                <div className="mt-3 pt-3" style={{borderTop: '1px solid #F68B24'}}>
                  <span className="text-sm font-medium" style={{color: '#F68B24'}}>✓ Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>



      {/* Step 2: Select Barber (Optional) */}
      {selectedService && (
        <div>
          <h2 className="text-xl font-semibold mb-4" style={{color: '#36454F'}}>2. Choose Barber (Optional)</h2>
          <div className="space-y-3">
            <button
              onClick={() => setSelectedBarber('')}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                selectedBarber === ''
                  ? 'bg-white shadow-lg'
                  : 'bg-white hover:shadow-md'
              }`}
              style={{
                border: selectedBarber === ''
                  ? '2px solid #F68B24'
                  : '1px solid #E0E0E0'
              }}
            >
              <span className="font-medium" style={{color: '#36454F'}}>Any Barber</span>
              <p className="text-sm" style={{color: '#8B8B8B'}}>Any available barber</p>
            </button>
            
            {mockData.barbers.map((barber) => (
              <button
                key={barber.id}
                onClick={() => setSelectedBarber(barber.name)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedBarber === barber.name
                    ? 'bg-white shadow-lg'
                    : 'bg-white hover:shadow-md'
                }`}
                style={{
                  border: selectedBarber === barber.name
                    ? '2px solid #F68B24'
                    : '1px solid #E0E0E0'
                }}
              >
                <span className="font-medium" style={{color: '#36454F'}}>{barber.name}</span>
                <p className="text-sm" style={{color: '#8B8B8B'}}>{barber.specialty}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Booking */}
      {selectedService && (
        <div className="bg-white rounded-2xl p-6 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
          <h3 className="font-semibold text-lg mb-4" style={{color: '#36454F'}}>Booking Summary</h3>
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between">
              <span style={{color: '#8B8B8B'}}>Service:</span>
              <span className="font-medium" style={{color: '#36454F'}}>{selectedService.name}</span>
            </div>

            {selectedBarber && (
              <div className="flex justify-between">
                <span style={{color: '#8B8B8B'}}>Barber:</span>
                <span className="font-medium" style={{color: '#36454F'}}>{selectedBarber}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-3" style={{borderTop: '1px solid #E0E0E0'}}>
              <span style={{color: '#8B8B8B'}}>Total:</span>
              <span style={{color: '#F68B24'}}>{selectedService.price}</span>
            </div>
          </div>
          <button 
            onClick={generateBookingQR}
            disabled={isGeneratingBooking}
            className="w-full py-4 text-white font-bold rounded-xl transition-all duration-200 disabled:cursor-not-allowed text-base shadow-lg flex items-center justify-center space-x-3"
            style={{
              backgroundColor: isGeneratingBooking ? '#8B8B8B' : '#F68B24'
            }}
            onMouseEnter={(e) => !isGeneratingBooking && (e.target.style.backgroundColor = '#E67A1F')}
            onMouseLeave={(e) => !isGeneratingBooking && (e.target.style.backgroundColor = '#F68B24')}
          >
            {isGeneratingBooking ? (
              <>
                <div className="animate-spin w-5 h-5 border-3 border-white border-t-transparent rounded-full"></div>
                <span>Confirming Booking...</span>
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                <span>Confirm Booking & Generate QR</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function Kiosk() {
  const [mode, setMode] = useState('home') // 'home', 'generate'
  const [generateText, setGenerateText] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [appDownloadQr, setAppDownloadQr] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showHomeCamera, setShowHomeCamera] = useState(false)
  const homeVideoRef = useRef(null)
  const homeQrScannerRef = useRef(null)

  // Generate QR Code with loading
  const generateQRCode = async () => {
    if (!generateText.trim()) return
    
    setIsGenerating(true)
    try {
      // Add artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const url = await QRCode.toDataURL(generateText, {
        width: 400,
        margin: 3,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      setQrCodeUrl(url)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Download QR Code
  const downloadQRCode = () => {
    if (!qrCodeUrl) return
    
    const link = document.createElement('a')
    link.download = 'qrcode.png'
    link.href = qrCodeUrl
    link.click()
  }

  // Print QR Code
  const printQRCode = () => {
    if (!qrCodeUrl) return
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              page-break-inside: avoid;
            }
            .qr-code {
              max-width: 300px;
              margin: 20px 0;
            }
            .qr-text {
              margin-top: 20px;
              padding: 10px;
              background: #f5f5f5;
              border-radius: 8px;
              word-break: break-all;
              max-width: 400px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>Generated QR Code</h2>
            <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
            <div class="qr-text">
              <strong>Content:</strong><br/>
              ${generateText}
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }



  // Start Home Camera
  const startHomeCamera = async () => {
    try {
      if (homeVideoRef.current) {
        homeQrScannerRef.current = new QrScanner(
          homeVideoRef.current,
          (result) => {
            // QR code detected - could handle result here if needed
            console.log('QR Code detected:', result.data)
            stopHomeCamera()
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        )
        await homeQrScannerRef.current.start()
        setShowHomeCamera(true)
      }
    } catch (error) {
      console.error('Error starting home camera:', error)
    }
  }

  // Stop Home Camera
  const stopHomeCamera = () => {
    if (homeQrScannerRef.current) {
      homeQrScannerRef.current.stop()
      homeQrScannerRef.current.destroy()
      homeQrScannerRef.current = null
    }
    setShowHomeCamera(false)
  }



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHomeCamera()
    }
  }, [])

  // Generate app download QR code
  const generateAppDownloadQr = async () => {
    try {
      // Replace with your actual app store URL
      const appStoreUrl = 'https://apps.apple.com/app/your-app-id'
      const qrDataUrl = await QRCode.toDataURL(appStoreUrl, {
        width: 128,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      setAppDownloadQr(qrDataUrl)
    } catch (error) {
      console.error('Error generating app download QR code:', error)
    }
  }

  // Auto-start home camera on mount
  useEffect(() => {
    if (mode === 'home') {
      const timer = setTimeout(() => {
        startHomeCamera()
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      stopHomeCamera()
    }
  }, [mode])

  // Generate app download QR on mount
  useEffect(() => {
    generateAppDownloadQr()
  }, [])

  // Reset states when changing modes
  const changeMode = (newMode) => {
    stopHomeCamera()
    setMode(newMode)
    setGenerateText('')
    setQrCodeUrl('')
    setIsGenerating(false)
  }

  return (
    <div className="min-h-screen p-4" style={{backgroundColor: '#F4F0E6'}}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <QrCode className="w-7 h-7" style={{color: '#F68B24'}} />
          <h1 className="text-2xl font-bold" style={{color: '#36454F'}}>Kiosk Mode</h1>
        </div>
        <Link 
          to="/auth/login" 
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200"
          style={{
            backgroundColor: '#36454F',
            color: 'white'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2A3640'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#36454F'}
        >
          <Home className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {mode === 'home' && (
          <div className="space-y-8">
            {/* Live Camera Feed */}
            <div className="bg-white rounded-2xl p-6 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold mb-2" style={{color: '#36454F'}}>Live Camera Feed</h1>
                <p className="text-base" style={{color: '#8B8B8B'}}>Point your camera at a QR code to scan automatically</p>
              </div>
              
              <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={homeVideoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {/* Professional Camera Overlay */}
                <div className="absolute inset-0">
                  {/* Top Status Bar */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full animate-pulse" style={{backgroundColor: '#F68B24'}}></div>
                          <span className="text-white text-sm font-bold tracking-wider">LIVE</span>
                        </div>
                        <div className="text-white/80 text-sm">QR Scanner Active</div>
                      </div>
                      <div className="text-white/60 text-sm font-mono">
                        {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Center Scanning Frame */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Main scanning frame */}
                      <div className="w-64 h-64 border-2 rounded-2xl relative" style={{borderColor: '#F68B24', opacity: 0.8}}>
                        {/* Corner indicators */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-2xl" style={{borderColor: '#F68B24'}}></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-2xl" style={{borderColor: '#F68B24'}}></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-2xl" style={{borderColor: '#F68B24'}}></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-2xl" style={{borderColor: '#F68B24'}}></div>
                        
                        {/* Scanning line animation */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl">
                          <div className="absolute w-full h-1 animate-pulse" 
                               style={{ 
                                 top: '50%', 
                                 transform: 'translateY(-50%)',
                                 background: 'linear-gradient(to right, transparent, #F68B24, transparent)'
                               }}></div>
                        </div>
                      </div>
                      
                      {/* Instruction text */}
                      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
                        <p className="text-white text-lg font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                          Position QR code within frame
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Loading State */}
                  {!showHomeCamera && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                      <div className="text-center text-white">
                        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderColor: '#F68B24', borderTopColor: 'transparent'}}></div>
                        <p className="text-lg font-medium">Initializing Camera...</p>
                        <p className="text-sm mt-2" style={{color: '#F68B24', opacity: 0.8}}>Please allow camera access</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Download App Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg transition-all duration-300 transform hover:scale-105" style={{border: '1px solid #E0E0E0'}}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{backgroundColor: '#36454F'}}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold mb-3" style={{color: '#36454F'}}>Download Our App</h2>
                  <p className="mb-4 text-base" style={{color: '#8B8B8B'}}>Get exclusive vouchers and loyalty rewards</p>
                  <div className="rounded-xl p-3 mb-4 mx-auto w-fit" style={{backgroundColor: '#F4F0E6', border: '1px solid #E0E0E0'}}>
                    <div className="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden" style={{backgroundColor: '#FFFFFF'}}>
                      {appDownloadQr ? (
                        <img 
                          src={appDownloadQr} 
                          alt="Download App QR Code" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-center" style={{color: '#8B8B8B'}}>
                          Loading...
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm" style={{color: '#8B8B8B'}}>Scan to download and unlock exclusive offers!</p>
                </div>
              </div>

              {/* Book Appointment Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg transition-all duration-300 transform hover:scale-105" style={{border: '1px solid #E0E0E0'}}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{backgroundColor: '#F68B24'}}>
                    <QrCode className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold mb-3" style={{color: '#36454F'}}>Book Appointment</h2>
                  <p className="mb-4 text-base" style={{color: '#8B8B8B'}}>Schedule your service and get a QR confirmation</p>
                  <button
                    onClick={() => changeMode('generate')}
                    className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200 text-base shadow-lg transform hover:scale-105"
                    style={{
                      backgroundColor: '#F68B24'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#E67A1F'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



        {mode === 'generate' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold" style={{color: '#36454F'}}>Book & Generate QR</h1>
              <button 
                onClick={() => changeMode('home')}
                className="px-4 py-2 text-white rounded-xl transition-colors duration-200 flex items-center space-x-2"
                style={{
                  backgroundColor: '#36454F'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2A3640'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#36454F'}
              >
                <span>← Back</span>
              </button>
            </div>
            
            <BookingQRGenerator />
          </div>
        )}
      </div>
    </div>
  )
}

export default Kiosk