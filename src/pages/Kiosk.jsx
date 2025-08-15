import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import bookingService from '../services/customer/bookingService.js'
import BookingQRGenerator from './kiosk/BookingQRGenerator.jsx'
import QRScannerCamera from './kiosk/QRScanner.jsx'
import BookingDetails from './kiosk/BookingDetails.jsx'

function Kiosk() {
  const [mode, setMode] = useState('home') // 'home', 'generate'
  const [generateText, setGenerateText] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [appDownloadQr, setAppDownloadQr] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showHomeCamera, setShowHomeCamera] = useState(false)
  const [scannedBooking, setScannedBooking] = useState(null)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [scannerError, setScannerError] = useState('')

  // Generate QR Code with loading
  const generateQRCode = async () => {
    if (!generateText.trim()) return
    
    setIsGenerating(true)
    try {
      const url = await QRCode.toDataURL(generateText, {
        width: 300,
        margin: 2,
        color: {
          dark: '#36454F',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(url)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate App Download QR on component mount
  useEffect(() => {
    const generateAppQR = async () => {
      try {
        const appUrl = 'https://tpxbarbershop.com/download' // Replace with actual app store link
        const qrUrl = await QRCode.toDataURL(appUrl, {
          width: 200,
          margin: 1,
          color: {
            dark: '#36454F',
            light: '#FFFFFF'
          }
        })
        setAppDownloadQr(qrUrl)
      } catch (error) {
        console.error('Error generating app download QR:', error)
      }
    }
    
    generateAppQR()
  }, [])

  // Change mode handler
  const changeMode = (newMode) => {
    setMode(newMode)
    // Reset states when changing modes
    if (newMode === 'home') {
      setScannedBooking(null)
      setScannerError('')
      setScannerLoading(false)
    }
  }

  // Handle QR Code Scan
  const handleQRScan = async (qrData) => {
    setScannerLoading(true)
    setScannerError('')
    
    try {
      // Try to get booking by QR code
      const booking = await bookingService.getBookingByCode(qrData)
      
      if (booking) {
        setScannedBooking(booking)
        setScannerLoading(false)
      } else {
        setScannerError('Invalid booking QR code. Please check your code and try again.')
        setScannerLoading(false)
      }
    } catch (error) {
      console.error('Error validating booking:', error)
      setScannerError('Failed to validate booking. Please try again.')
      setScannerLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Mobile viewport meta tag handling */}
      <style jsx>{`
        @media screen and (max-width: 768px) {
          .kiosk-container {
            padding: 1rem;
          }
          .camera-container {
            aspect-ratio: 4/3;
            max-height: 60vh;
          }
        }
        
        /* Prevent zoom on mobile */
        input, select, textarea {
          font-size: 16px !important;
        }
        
        /* Mobile-specific styles */
        @media screen and (max-device-width: 768px) {
          .mobile-optimized {
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 bg-white shadow-sm">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
            <span className="text-white font-bold text-lg md:text-xl">T</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold" style={{color: '#36454F'}}>TPX Barbershop</h1>
            <p className="text-xs md:text-sm" style={{color: '#8B8B8B'}}>Self-Service Kiosk</p>
          </div>
        </div>
        
        <Link 
          to="/login"
          className="px-3 py-2 md:px-4 md:py-2 text-white rounded-xl transition-colors duration-200 flex items-center space-x-2 text-sm md:text-base"
          style={{backgroundColor: '#36454F'}}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2A3640'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#36454F'}
        >
          <span>Back to Login</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto kiosk-container mobile-optimized">
        {mode === 'home' && (
          <div className="space-y-8">
            {/* Live Camera Feed */}
            <div className="bg-white rounded-2xl p-6 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold mb-2" style={{color: '#36454F'}}>Live Camera Feed</h1>
                <p className="text-base" style={{color: '#8B8B8B'}}>Point your camera at a QR code to scan automatically</p>
              </div>
              
              <div className="relative" style={{ minHeight: '300px' }}>
                <QRScannerCamera
                  onQRDetected={handleQRScan}
                  scannerError={scannerError}
                  setScannerError={setScannerError}
                  showCamera={showHomeCamera}
                  setShowCamera={setShowHomeCamera}
                />
              </div>
            </div>

            {/* Show booking details if QR code was scanned */}
            {scannedBooking && (
              <BookingDetails 
                scannedBooking={scannedBooking}
                onDone={() => {
                  setScannedBooking(null)
                  setScannerError('')
                  setScannerLoading(false)
                }}
              />
            )}

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Scan Your Booking QR Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg" style={{border: '1px solid #E0E0E0'}}>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{backgroundColor: '#F0F8FF', border: '2px solid #4CAF50'}}>
                    <QrCode className="w-8 h-8" style={{color: '#4CAF50'}} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2" style={{color: '#36454F'}}>Scan Your Booking QR</h3>
                    <p style={{color: '#8B8B8B'}}>Point the camera above at your booking QR code to confirm your appointment</p>
                  </div>
                  
                  {scannerLoading && (
                    <div className="rounded-lg p-4" style={{backgroundColor: '#F0F8FF', border: '1px solid #4CAF50'}}>
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor: '#4CAF50', borderTopColor: 'transparent'}}></div>
                        <p className="font-medium" style={{color: '#4CAF50'}}>Validating Booking...</p>
                      </div>
                    </div>
                  )}
                  
                  {scannerError && (
                    <div className="rounded-lg p-4" style={{backgroundColor: '#FEE', border: '1px solid #FCC'}}>
                      <p className="text-red-600 text-sm font-medium text-center">{scannerError}</p>
                    </div>
                  )}
                  
                  {!scannerLoading && !scannerError && (
                    <div className="rounded-lg p-4" style={{backgroundColor: '#F0F8FF', border: '1px solid #E0E0E0'}}>
                      <h4 className="font-medium mb-2" style={{color: '#36454F'}}>Instructions:</h4>
                      <ul className="text-sm space-y-1 text-left" style={{color: '#8B8B8B'}}>
                        <li>• Hold your phone steady</li>
                        <li>• Ensure good lighting</li>
                        <li>• Keep QR code within the camera frame above</li>
                        <li>• Wait for automatic detection</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

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
