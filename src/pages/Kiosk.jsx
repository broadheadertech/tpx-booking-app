import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode, Download, RefreshCw, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
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
  const [isProcessingBooking, setIsProcessingBooking] = useState(false)

  // Convex mutations
  const updateBookingStatus = useMutation(api.services.bookings.updateBooking)

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
        const appUrl = 'https://tpx-booking-app.vercel.app//download' // Replace with actual app store link
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
      setIsProcessingBooking(false)
    }
  }

  // Handle booking validation and confirmation
  const handleValidateAndConfirm = async () => {
    if (!scannedBooking || !scannedBooking.id) {
      setScannerError('No booking to validate.')
      return
    }

    try {
      setIsProcessingBooking(true)
      setScannerError('')

      // Use Convex mutation to update booking status
      await updateBookingStatus({
        id: scannedBooking.id,
        status: 'confirmed'
      })

      console.log('Booking confirmed successfully')

      // Update the scan result with confirmed status
      const updatedResult = {
        ...scannedBooking,
        status: 'confirmed'
      }

      setScannedBooking(updatedResult)
      setScannerError('')

    } catch (error) {
      console.error('Error confirming booking:', error)
      setScannerError('Failed to confirm booking. Please try again.')
    } finally {
      setIsProcessingBooking(false)
    }
  }

  // Handle QR Code Scan - Parse JSON QR data like BookingQRScannerModal
  const handleQRScan = async (qrData) => {
    console.log('Kiosk QR Data:', qrData)
    setScannerLoading(true)
    setScannerError('')
    
    try {
      // Parse QR data to extract booking information
      let bookingData = null
      
      if (qrData.startsWith('{')) {
        try {
          bookingData = JSON.parse(qrData)
          console.log('Parsed booking data:', bookingData)
        } catch {
          setScannerError('Invalid QR code format.')
          setScannerLoading(false)
          return
        }
      } else {
        setScannerError('Invalid QR code format. Expected JSON data.')
        setScannerLoading(false)
        return
      }
      
      if (!bookingData.bookingId) {
        setScannerError('Missing booking ID in QR code.')
        setScannerLoading(false)
        return
      }

      // Display booking data directly from QR code (no API fetch initially)
      const bookingResult = {
        id: bookingData.bookingId,
        booking_code: bookingData.bookingCode || 'N/A',
        customer: 'Customer', // Will be populated after validation
        service: {
          name: bookingData.service || 'N/A'
        },
        date: bookingData.date || 'N/A',
        time: bookingData.time || 'N/A',
        barber: {
          name: bookingData.barber || 'N/A'
        },
        status: 'scanned', // Initial status before validation
        phone: 'N/A',
        barbershop: bookingData.barbershop || 'N/A'
      }

      console.log('Setting scannedBooking:', bookingResult)
      setScannedBooking(bookingResult)
      setScannerLoading(false)
      console.log('Scanner loading set to false')
      
    } catch (error) {
      console.error('Error processing booking QR code:', error)
      setScannerError('Failed to process booking QR code. Please try again.')
      setScannerLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Tablet and Mobile Optimized Styles */}
      <style>{`
        /* Tablet optimizations */
        @media screen and (min-width: 768px) and (max-width: 1024px) {
          .kiosk-container {
            padding: 2rem;
            max-width: 90vw;
          }
          .camera-container {
            aspect-ratio: 16/10;
            max-height: 50vh;
          }
          .action-cards {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }
        }
        
        /* Mobile optimizations */
        @media screen and (max-width: 767px) {
          .kiosk-container {
            padding: 1rem;
          }
          .camera-container {
            aspect-ratio: 4/3;
            max-height: 60vh;
          }
        }
        
        /* Prevent zoom and improve touch */
        input, select, textarea {
          font-size: 16px !important;
        }
        
        .mobile-optimized {
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Dark mode scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1f2937;
        }
        ::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 bg-gradient-to-r from-[#2A2A2A] to-[#333333] shadow-lg border-b border-[#444444]/50">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-gradient-to-r from-[#FF8C42] to-[#FF8C42]/80 shadow-lg">
            <span className="text-white font-bold text-lg md:text-xl">T</span>
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl md:text-2xl font-bold text-white">TipunoX Angeles Barbershop</h1>
              <div className="bg-[#FF8C42]/20 rounded-full px-2 py-0.5 border border-[#FF8C42]/30">
                <span className="text-xs font-semibold text-[#FF8C42]">v2.0.0</span>
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-300">Self-Service Kiosk</p>
          </div>
        </div>
        
        <Link 
          to="/login"
          className="px-3 py-2 md:px-4 md:py-2 text-white rounded-xl transition-all duration-200 flex items-center space-x-2 text-sm md:text-base bg-[#1A1A1A] border border-[#444444] hover:bg-[#2A2A2A] hover:border-[#FF8C42]/50"
        >
          <span>Back to Login</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto kiosk-container mobile-optimized">
        {mode === 'home' && (
          <div className="space-y-6 md:space-y-8">
            {/* Live Camera Feed */}
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 shadow-xl border border-[#444444]/50">
              <div className="text-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">Live Camera Feed</h1>
                <p className="text-base md:text-lg text-gray-300">Point your camera at a QR code to scan automatically</p>
              </div>
              
              <div className="relative camera-container" style={{ minHeight: '300px' }}>
                <QRScannerCamera
                  onQRDetected={handleQRScan}
                  scannerError={scannerError}
                  setScannerError={setScannerError}
                  showCamera={showHomeCamera}
                  setShowCamera={setShowHomeCamera}
                />
              </div>
              
              {/* Processing Indicator */}
              {isProcessingBooking && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center space-x-3">
                    <RefreshCw className="w-6 h-6 text-[#FF8C42] animate-spin" />
                    <span className="text-gray-300 font-medium">Processing booking...</span>
                  </div>
                </div>
              )}
              
              {/* Error Message */}
              {scannerError && (
                <div className="bg-red-500/20 border-2 border-red-500/50 rounded-2xl p-4 mt-4">
                  <div className="flex items-center space-x-3">
                    <XCircle className="w-6 h-6 text-red-400" />
                    <p className="text-red-300 font-bold">{scannerError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Show booking details if QR code was scanned */}
            {scannedBooking && (
              <BookingDetails 
                scannedBooking={scannedBooking}
                onDone={() => {
                  setScannedBooking(null)
                  setScannerError('')
                  setScannerLoading(false)
                  setIsProcessingBooking(false)
                }}
                onValidateAndConfirm={handleValidateAndConfirm}
                isProcessingBooking={isProcessingBooking}
              />
            )}

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 action-cards">
              {/* Scan Your Booking QR Card */}
              <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 shadow-xl border border-[#444444]/50 transition-all duration-300 hover:scale-105 hover:border-[#FF8C42]/50">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-gradient-to-r from-green-500/20 to-green-600/20 border-2 border-green-500/50">
                    <QrCode className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Scan Your Booking QR</h3>
                    <p className="text-gray-300">Point the camera above at your booking QR code to confirm your appointment</p>
                  </div>
                  
                  {scannerLoading && (
                    <div className="rounded-lg p-4 bg-green-500/20 border border-green-500/50">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-medium text-green-400">Validating Booking...</p>
                      </div>
                    </div>
                  )}
                  
                  {scannerError && (
                    <div className="rounded-lg p-4 bg-red-500/20 border border-red-500/50">
                      <p className="text-red-300 text-sm font-medium text-center">{scannerError}</p>
                    </div>
                  )}
                  
                  {!scannerLoading && !scannerError && (
                    <div className="rounded-lg p-4 bg-[#1A1A1A]/50 border border-[#444444]/50">
                      <h4 className="font-medium mb-2 text-white">Instructions:</h4>
                      <ul className="text-sm space-y-1 text-left text-gray-300">
                        <li>• Hold your device steady</li>
                        <li>• Ensure good lighting</li>
                        <li>• Keep QR code within the camera frame above</li>
                        <li>• Wait for automatic detection</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Download App Card */}
              <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 shadow-xl border border-[#444444]/50 transition-all duration-300 hover:scale-105 hover:border-[#FF8C42]/50">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-r from-[#FF8C42] to-[#FF8C42]/80 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold mb-3 text-white">Download Our App</h2>
                  <p className="mb-4 text-base text-gray-300">Get exclusive vouchers and loyalty rewards</p>
                  <div className="rounded-xl p-3 mb-4 mx-auto w-fit bg-[#1A1A1A]/50 border border-[#444444]/50">
                    <div className="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                      {appDownloadQr ? (
                        <img 
                          src={appDownloadQr} 
                          alt="Download App QR Code" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-center text-gray-500">
                          Loading...
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">Scan to download and unlock exclusive offers!</p>
                </div>
              </div>

              {/* Book Appointment Card */}
              <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 shadow-xl border border-[#444444]/50 transition-all duration-300 hover:scale-105 hover:border-[#FF8C42]/50 md:col-span-2 xl:col-span-1">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-r from-[#FF8C42] to-[#FF8C42]/80 shadow-lg">
                    <QrCode className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold mb-3 text-white">Book Appointment</h2>
                  <p className="mb-4 text-base text-gray-300">Schedule your service and get a QR confirmation</p>
                  <button
                    onClick={() => changeMode('generate')}
                    className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200 text-base shadow-lg bg-gradient-to-r from-[#FF8C42] to-[#FF8C42]/80 hover:from-[#FF8C42]/90 hover:to-[#FF8C42]/70 transform hover:scale-105"
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
              <h1 className="text-2xl md:text-3xl font-bold text-white">Book & Generate QR</h1>
              <button 
                onClick={() => changeMode('home')}
                className="px-4 py-2 text-white rounded-xl transition-all duration-200 flex items-center space-x-2 bg-[#1A1A1A] border border-[#444444] hover:bg-[#2A2A2A] hover:border-[#FF8C42]/50"
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
