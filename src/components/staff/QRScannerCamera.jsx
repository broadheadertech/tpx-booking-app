import React, { useState, useRef, useEffect } from 'react'
import QrScanner from 'qr-scanner'
import { Camera, RotateCcw, Settings, CheckCircle, XCircle, AlertCircle, Calendar, Gift } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const QRScannerCamera = ({ onQRDetected, onClose, isOpen, title }) => {
  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [hasPermission, setHasPermission] = useState(null)
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [qrError, setQrError] = useState(null)
  const [qrType, setQrType] = useState(null) // 'booking' or 'voucher'
  const [qrData, setQrData] = useState(null)

  // Convex mutations
  const updateBookingStatus = useMutation(api.services.bookings.updateBooking)
  const redeemVoucher = useMutation(api.services.vouchers.redeemVoucher)
  const validateBookingByCode = useMutation(api.services.bookings.validateBookingByCode)

  // Initialize camera list on component mount
  useEffect(() => {
    if (isOpen) {
      initializeCameras()
    }
    return () => {
      stopScanning()
    }
  }, [isOpen])

  const initializeCameras = async () => {
    try {
      // Check if QR Scanner is supported
      if (!QrScanner.hasCamera()) {
        setCameraError('No camera found on this device')
        return
      }

      // Get available cameras
      const cameras = await QrScanner.listCameras(true)
      setAvailableCameras(cameras)
      
      // Select back camera by default, fallback to first available
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      )
      setSelectedCamera(backCamera || cameras[0])
      
    } catch (error) {
      console.error('Error initializing cameras:', error)
      setCameraError('Failed to access camera. Please check permissions.')
    }
  }

  const startScanning = async () => {
    if (!videoRef.current || !selectedCamera) return

    try {
      setIsScanning(true)
      setCameraError('')
      setHasPermission(null)
      setQrError(null) // Clear any previous errors

      // Create QR Scanner instance
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleQRResult(result),
        {
          onDecodeError: (error) => {
            // Ignore decode errors during normal scanning
            console.debug('QR decode error:', error)
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: selectedCamera.id,
          maxScansPerSecond: 5, // Optimize for performance
        }
      )

      // Start the scanner
      await qrScannerRef.current.start()
      setHasPermission(true)

    } catch (error) {
      console.error('Error starting QR scanner:', error)
      setIsScanning(false)
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access and try again.')
        setHasPermission(false)
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found. Please check your device.')
      } else if (error.name === 'NotSupportedError') {
        setCameraError('Camera not supported on this device.')
      } else {
        setCameraError('Failed to start camera. Please try again.')
      }
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current.destroy()
      qrScannerRef.current = null
    }
    setIsScanning(false)
    setScanResult(null)
    setIsProcessing(false)
    setQrError(null)
    setQrType(null)
    setQrData(null)
  }

  const handleQRResult = async (result) => {
    if (isProcessing) return // Prevent multiple rapid scans
    
    setIsProcessing(true)
    setScanResult(result.data)
    setQrError(null) // Clear any previous errors
    setQrType(null)
    setQrData(null)
    
    // Add haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }

    try {
      // Try to parse the QR code data
      let parsedData
      let isSimpleBookingCode = false
      
      try {
        parsedData = JSON.parse(result.data)
      } catch (parseError) {
        // If JSON parsing fails, check if it's a simple booking code (8 characters, alphanumeric)
        const bookingCodePattern = /^[A-Z0-9]{8}$/
        if (bookingCodePattern.test(result.data)) {
          isSimpleBookingCode = true
          parsedData = { bookingCode: result.data }
        } else {
          throw new Error('Invalid QR code format. Please scan a valid booking or voucher QR code.')
        }
      }

      // Determine QR code type and validate
      if (isSimpleBookingCode || (parsedData.bookingId && parsedData.bookingCode) || parsedData.bookingCode) {
        // This is a booking QR code (either simple code or complex JSON)
        await handleBookingQR(parsedData)
      } else if (parsedData.voucherId && parsedData.code) {
        // This is a voucher QR code
        await handleVoucherQR(parsedData)
      } else {
        throw new Error('Unknown QR code type. Please scan a valid booking or voucher QR code.')
      }

    } catch (error) {
      console.error('Error processing QR result:', error)
      setQrError(error.message || 'Failed to process QR code. Please try again.')
      setScanResult(null)
      
      // Error vibration
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
    }
    
    // Reset processing state after a delay
    setTimeout(() => {
      setIsProcessing(false)
      // Only clear scan result if there's no error
      if (!qrError) {
        setScanResult(null)
        setQrData(null)
      }
    }, 4000) // Longer delay to show success/error message
  }

  const handleBookingQR = async (parsedData) => {
    setQrType('booking')
    console.log('Processing booking QR:', parsedData)

    try {
      // Extract booking code (works for both simple string and complex object)
      const bookingCode = parsedData.bookingCode || parsedData
      
      // First, verify the booking exists and get its current status
      const booking = await validateBookingByCode({ bookingCode: bookingCode })
      
      if (!booking) {
        throw new Error(`Booking not found with code: ${bookingCode}`)
      }

      if (booking.status === 'confirmed') {
        throw new Error('This booking is already confirmed.')
      }

      if (booking.status === 'cancelled') {
        throw new Error('This booking has been cancelled and cannot be confirmed.')
      }

      if (booking.status === 'completed') {
        throw new Error('This booking is already completed.')
      }

      // Update booking status to confirmed
      await updateBookingStatus({
        id: booking._id,
        status: 'confirmed'
      })

      setQrData({
        type: 'booking',
        bookingCode: bookingCode,
        service: booking.service_name,
        customerName: booking.customer_name,
        date: booking.formattedDate,
        time: booking.formattedTime,
        barber: booking.barber_name
      })

      // Success vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }

      // Call parent callback if provided
      if (onQRDetected) {
        await onQRDetected({
          type: 'booking',
          success: true,
          data: parsedData,
          booking: booking
        })
      }

    } catch (error) {
      throw new Error(error.message || 'Failed to confirm booking. Please try again.')
    }
  }

  const handleVoucherQR = async (parsedData) => {
    setQrType('voucher')
    console.log('Processing voucher QR:', parsedData)

    try {
      // Redeem the voucher
      const result = await redeemVoucher({
        code: parsedData.code,
        redeemed_by: 'staff', // You might want to pass actual staff ID
        redeemed_at: Date.now()
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to redeem voucher')
      }

      setQrData({
        type: 'voucher',
        code: parsedData.code,
        value: parsedData.value,
        username: parsedData.username
      })

      // Success vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }

      // Call parent callback if provided
      if (onQRDetected) {
        await onQRDetected({
          type: 'voucher',
          success: true,
          data: parsedData,
          result: result
        })
      }

    } catch (error) {
      throw new Error(error.message || 'Failed to redeem voucher. Please try again.')
    }
  }

  const switchCamera = async (camera) => {
    if (!camera || camera.id === selectedCamera?.id) return

    setSelectedCamera(camera)
    setShowSettings(false)

    if (isScanning && qrScannerRef.current) {
      try {
        await qrScannerRef.current.setCamera(camera.id)
      } catch (error) {
        console.error('Error switching camera:', error)
        setCameraError('Failed to switch camera')
      }
    }
  }

  const getCameraDisplayName = (camera) => {
    if (camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')) {
      return 'Back Camera'
    } else if (camera.label.toLowerCase().includes('front') || 
               camera.label.toLowerCase().includes('user')) {
      return 'Front Camera'
    }
    return camera.label || 'Camera'
  }

  const retryPermission = async () => {
    setCameraError('')
    setHasPermission(null)
    await startScanning()
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#E0E0E0]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[#1A1A1A]">{title || 'QR Code Scanner'}</h3>
        <div className="flex items-center space-x-2">
          {availableCameras.length > 1 && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg border border-[#E0E0E0] hover:bg-gray-50 transition-colors"
              title="Camera Settings"
            >
              <Settings className="w-5 h-5 text-[#6B6B6B]" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[#E0E0E0] hover:bg-gray-50 transition-colors"
          >
            <XCircle className="w-5 h-5 text-[#6B6B6B]" />
          </button>
        </div>
      </div>

      {/* Camera Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-[#E0E0E0]">
          <h4 className="font-semibold text-[#1A1A1A] mb-3">Select Camera</h4>
          <div className="space-y-2">
            {availableCameras.map((camera) => (
              <button
                key={camera.id}
                onClick={() => switchCamera(camera)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                  selectedCamera?.id === camera.id
                    ? 'border-[#FF8C42] bg-orange-50 text-[#FF8C42]'
                    : 'border-[#E0E0E0] hover:border-[#FF8C42] hover:bg-orange-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{getCameraDisplayName(camera)}</span>
                  {selectedCamera?.id === camera.id && (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">{camera.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera Feed */}
      <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          style={{
            transform: selectedCamera?.label.toLowerCase().includes('front') ? 'scaleX(-1)' : 'none'
          }}
        />
        
        {/* Scanning Overlay */}
        {isScanning && !scanResult && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-[#FF8C42] rounded-2xl animate-pulse">
              <div className="absolute inset-4 border border-[#FF8C42] rounded-xl opacity-50"></div>
            </div>
          </div>
        )}

        {/* Success Result Overlay */}
        {qrData && !qrError && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 mx-4 max-w-sm border-2 border-green-200">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-bold text-[#1A1A1A]">
                  {qrData.type === 'booking' ? 'Booking Confirmed!' : 'Voucher Redeemed!'}
                </span>
              </div>
              
              {qrData.type === 'booking' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Code:</span>
                    <span className="font-semibold text-[#1A1A1A]">{qrData.bookingCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Service:</span>
                    <span className="font-semibold text-[#1A1A1A]">{qrData.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Customer:</span>
                    <span className="font-semibold text-[#1A1A1A]">{qrData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Time:</span>
                    <span className="font-semibold text-[#1A1A1A]">{qrData.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Barber:</span>
                    <span className="font-semibold text-[#1A1A1A]">{qrData.barber}</span>
                  </div>
                </div>
              )}
              
              {qrData.type === 'voucher' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Code:</span>
                    <span className="font-semibold text-[#1A1A1A]">{qrData.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Value:</span>
                    <span className="font-semibold text-green-600">₱{qrData.value}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Customer:</span>
                    <span className="font-semibold text-[#1A1A1A]">{qrData.username}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  setQrData(null)
                  setIsProcessing(false)
                  setScanResult(null)
                }}
                className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Continue Scanning
              </button>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {qrError && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 mx-4 max-w-sm border-2 border-red-200">
              <div className="flex items-center space-x-3 mb-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <span className="font-bold text-[#1A1A1A]">Scan Error</span>
              </div>
              <div className="text-sm text-red-700 mb-4">
                {qrError}
              </div>
              <button
                onClick={() => {
                  setQrError(null)
                  setIsProcessing(false)
                  setScanResult(null)
                }}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Ready State */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="text-center text-white">
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-60" />
              <p className="text-lg font-semibold">Ready to Scan</p>
              <p className="text-sm opacity-80">Position QR code in the frame</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {cameraError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">{cameraError}</p>
              {hasPermission === false && (
                <p className="text-red-600 text-sm mt-1">
                  Please enable camera permissions in your browser settings and refresh the page.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-3">
        {!isScanning ? (
          <button
            onClick={startScanning}
            disabled={!selectedCamera || !!cameraError}
            className="flex-1 bg-[#FF8C42] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#FF7A2B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Camera className="w-5 h-5" />
            <span>Start Scanning</span>
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <XCircle className="w-5 h-5" />
            <span>Stop Scanning</span>
          </button>
        )}
        
        {cameraError && hasPermission === false && (
          <button
            onClick={retryPermission}
            className="px-6 py-3 border-2 border-[#FF8C42] text-[#FF8C42] rounded-xl font-semibold hover:bg-[#FF8C42] hover:text-white transition-colors flex items-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-blue-800 text-sm mb-2">
          <strong>Supported QR Codes:</strong>
        </p>
        <div className="flex items-center space-x-4 text-xs text-blue-700">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>Booking QRs → Confirms booking</span>
          </div>
          <div className="flex items-center space-x-1">
            <Gift className="w-4 h-4" />
            <span>Voucher QRs → Redeems voucher</span>
          </div>
        </div>
        <p className="text-blue-800 text-xs mt-2">
          Hold steady and ensure the QR code is well-lit and clearly visible.
        </p>
      </div>
    </div>
  )
}

export default QRScannerCamera
