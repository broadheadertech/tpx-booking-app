import React, { useState, useRef, useEffect } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import QrScanner from 'qr-scanner'
import { QrCode, Camera, CheckCircle, XCircle, RefreshCw, User, DollarSign, Calendar, Gift, Settings } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const QRScannerModal = ({ isOpen, onClose, onVoucherScanned, onBookingScanned }) => {
  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [showCameraSettings, setShowCameraSettings] = useState(false)

  // Convex mutations and queries
  const validateBookingMutation = useMutation(api.services.bookings.validateBookingByCode)
  const updateBookingMutation = useMutation(api.services.bookings.updateBooking)
  const redeemVoucherMutation = useMutation(api.services.vouchers.redeemVoucherByStaff)

  // Initialize cameras when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeCameras()
    } else {
      cleanup()
    }
    return cleanup
  }, [isOpen])

  const initializeCameras = async () => {
    try {
      if (!QrScanner.hasCamera()) {
        setError('No camera found on this device')
        return
      }

      const cameras = await QrScanner.listCameras(true)
      setAvailableCameras(cameras)
      
      // Prefer back camera
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      )
      setSelectedCamera(backCamera || cameras[0])
      
      // Auto-start scanning
      if (backCamera || cameras[0]) {
        startScanning()
      }
    } catch (err) {
      setError('Failed to access camera. Please check permissions.')
    }
  }

  const startScanning = async () => {
    if (!videoRef.current || !selectedCamera) return

    try {
      setIsScanning(true)
      setError(null)

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        handleQRDetected,
        {
          onDecodeError: () => {}, // Ignore decode errors
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: selectedCamera.id,
          maxScansPerSecond: 3
        }
      )

      await qrScannerRef.current.start()
    } catch (err) {
      setIsScanning(false)
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.')
      } else {
        setError('Failed to start camera. Please try again.')
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
  }

  const cleanup = () => {
    stopScanning()
    setScanResult(null)
    setError(null)
    setIsProcessing(false)
  }

  const handleQRDetected = async (result) => {
    if (isProcessing || scanResult) return
    
    setIsProcessing(true)
    stopScanning() // Stop scanning immediately
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(200)

    try {
      const qrData = result.data
      
      // Check if it's a booking code (8-character alphanumeric)
      const bookingCodePattern = /^[A-Z0-9]{8}$/
      
      if (bookingCodePattern.test(qrData)) {
        await handleBookingQR(qrData)
      } else if (qrData.startsWith('{')) {
        await handleVoucherQR(qrData)
      } else {
        throw new Error('Invalid QR code format')
      }
    } catch (err) {
      setError(err.message || 'Failed to process QR code')
      setIsProcessing(false)
    }
  }

  const handleBookingQR = async (bookingCode) => {
    try {
      const booking = await validateBookingMutation({ bookingCode })
      
      if (!booking) {
        throw new Error('Booking not found')
      }

      setScanResult({
        type: 'booking',
        id: booking._id,
        code: bookingCode,
        customer_name: booking.customer_name,
        service_name: booking.service_name,
        barber_name: booking.barber_name,
        date: booking.formattedDate,
        time: booking.formattedTime,
        price: booking.service_price || booking.price,
        status: 'scanned'
      })
    } catch (err) {
      throw new Error(err.message || 'Failed to validate booking')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVoucherQR = async (qrData) => {
    try {
      const voucherInfo = JSON.parse(qrData)
      
      if (!voucherInfo.code) {
        throw new Error('Invalid voucher QR code')
      }

      // Format expiry date from QR data with fallback
      let formattedExpiry = 'N/A'
      if (voucherInfo.expires_at && voucherInfo.expires_at !== 'N/A') {
        try {
          const expiryDate = new Date(voucherInfo.expires_at)
          if (!isNaN(expiryDate.getTime())) {
            formattedExpiry = expiryDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          }
        } catch (e) {
          console.warn('Failed to parse expiry date:', voucherInfo.expires_at)
        }
      }

      setScanResult({
        type: 'voucher',
        code: voucherInfo.code,
        value: voucherInfo.value || 'N/A',
        expires_at: formattedExpiry,
        user: voucherInfo.user || voucherInfo.username || 'N/A',
        status: 'scanned'
      })
    } catch (err) {
      throw new Error(err.message || 'Invalid voucher QR format')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = async () => {
    if (!scanResult) return
    
    setIsProcessing(true)
    setError(null)

    try {
      if (scanResult.type === 'booking') {
        // If we have a callback for booking scanned, use it (for POS)
        if (onBookingScanned) {
          onBookingScanned(scanResult)
          handleClose()
          return
        }
        
        // Otherwise, confirm the booking (original functionality)
        await updateBookingMutation({
          id: scanResult.id,
          status: 'confirmed'
        })
        setScanResult(prev => ({ ...prev, status: 'confirmed' }))
      } else {
        // If we have a callback for voucher scanned, use it (for POS)
        if (onVoucherScanned) {
          // For POS, just pass the voucher data without redeeming
          // The voucher will be redeemed when the transaction is completed
          const voucherData = {
            _id: scanResult.id || scanResult.code, // Will be converted to proper ID in POS
            code: scanResult.code,
            value: scanResult.value,
            expires_at: scanResult.expires_at
          }
          onVoucherScanned(voucherData)
          handleClose()
          return
        }
        
        // Otherwise, redeem the voucher (original functionality)
        const result = await redeemVoucherMutation({ code: scanResult.code })
        if (result.success) {
          setScanResult(prev => ({ ...prev, status: 'redeemed', value: result.value || prev.value }))
        } else {
          throw new Error('Voucher redemption failed')
        }
      }
    } catch (err) {
      setError(err.message || `Failed to ${scanResult.type === 'booking' ? 'confirm booking' : 'redeem voucher'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleScanAgain = () => {
    setScanResult(null)
    setError(null)
    setIsProcessing(false)
    startScanning()
  }

  const handleClose = () => {
    cleanup()
    onClose()
  }

  const switchCamera = async (camera) => {
    setSelectedCamera(camera)
    setShowCameraSettings(false)
    
    if (isScanning && qrScannerRef.current) {
      try {
        await qrScannerRef.current.setCamera(camera.id)
      } catch (err) {
        setError('Failed to switch camera')
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="QR Scanner" size="md" variant="dark">
      <div className="space-y-3 lg:space-y-4">
        
        {/* Camera Section */}
        {!scanResult && (
          <div className="relative">
            {/* Camera Feed */}
            <div className="relative bg-black rounded-lg lg:rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              
              {/* Scanning Overlay */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 border-2 border-[#FF8C42] rounded-xl lg:rounded-2xl animate-pulse">
                    <div className="absolute inset-2 lg:inset-3 border border-[#FF8C42] rounded-lg lg:rounded-xl opacity-50"></div>
                  </div>
                </div>
              )}

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 shadow-lg">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="w-5 h-5 text-[#FF8C42] animate-spin" />
                      <span className="font-medium text-sm">Processing...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Ready State */}
              {!isScanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="text-center text-white px-4">
                    <QrCode className="w-10 h-10 lg:w-12 lg:h-12 mx-auto mb-2 lg:mb-3 opacity-70" />
                    <p className="font-semibold text-sm lg:text-base">Ready to Scan</p>
                    <p className="text-xs opacity-80 mt-1">Position QR code in frame</p>
                  </div>
                </div>
              )}

              {/* Camera Settings Button */}
              {availableCameras.length > 1 && (
                <button
                  onClick={() => setShowCameraSettings(!showCameraSettings)}
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Camera Settings Dropdown */}
            {showCameraSettings && (
              <div className="absolute top-12 right-0 z-10 bg-white rounded-lg shadow-lg border p-3 min-w-48">
                <h4 className="font-semibold text-sm mb-2">Select Camera</h4>
                <div className="space-y-1">
                  {availableCameras.map((camera) => (
                    <button
                      key={camera.id}
                      onClick={() => switchCamera(camera)}
                      className={`w-full p-2 rounded text-left text-sm transition-colors ${
                        selectedCamera?.id === camera.id
                          ? 'bg-[#FF8C42] text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {camera.label.includes('back') ? 'Back Camera' : 
                       camera.label.includes('front') ? 'Front Camera' : camera.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Camera Controls */}
            <div className="mt-2 lg:mt-3 flex justify-center gap-2">
              {!isScanning ? (
                <Button
                  onClick={startScanning}
                  disabled={!selectedCamera}
                  className="bg-[#FF8C42] hover:bg-[#FF7A2B] text-white px-4 lg:px-6 py-2.5 text-sm lg:text-base"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Scanning
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50 px-4 lg:px-6 py-2.5 text-sm lg:text-base"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-2 lg:mt-3 p-2.5 lg:p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-center space-x-3 lg:space-x-4 text-xs text-blue-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Booking QRs</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Gift className="w-3 h-3" />
                  <span>Voucher QRs</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] border border-[#444444] rounded-lg lg:rounded-xl p-3 lg:p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  scanResult.type === 'booking' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                }`}>
                  {scanResult.type === 'booking' ? (
                    <Calendar className={`w-4 h-4 lg:w-5 lg:h-5 ${
                      scanResult.type === 'booking' ? 'text-blue-400' : 'text-purple-400'
                    }`} />
                  ) : (
                    <Gift className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white font-mono text-sm lg:text-lg truncate">
                    {scanResult.code}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-400 capitalize">
                    {scanResult.type === 'booking' ? 'Booking Details' : 'Voucher Details'}
                  </p>
                </div>
              </div>
              <span className={`px-2 lg:px-3 py-1 text-[10px] lg:text-xs font-bold rounded-full uppercase flex-shrink-0 ${
                scanResult.status === 'confirmed' || scanResult.status === 'redeemed' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : scanResult.status === 'validated'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {scanResult.status}
              </span>
            </div>
            
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2 lg:gap-4 mb-3 lg:mb-4">
              {scanResult.type === 'booking' ? (
                <>
                  <div className="bg-[#1A1A1A] rounded-lg p-2.5 lg:p-3 border border-[#444444]">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 mb-1">
                      <User className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                      <span className="text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</span>
                    </div>
                    <p className="font-semibold text-white text-xs lg:text-sm truncate">{scanResult.customer_name}</p>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-2.5 lg:p-3 border border-[#444444]">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 mb-1">
                      <DollarSign className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                      <span className="text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wide">Price</span>
                    </div>
                    <p className="font-bold text-[#FF8C42] text-base lg:text-lg">₱{scanResult.price}</p>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-2.5 lg:p-3 border border-[#444444]">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 mb-1">
                      <Calendar className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                      <span className="text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wide">Date & Time</span>
                    </div>
                    <p className="font-semibold text-white text-xs lg:text-sm truncate">{scanResult.date}</p>
                    <p className="text-[#FF8C42] font-medium text-xs lg:text-sm">{scanResult.time}</p>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-2.5 lg:p-3 border border-[#444444]">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 mb-1">
                      <User className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                      <span className="text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wide">Barber</span>
                    </div>
                    <p className="font-semibold text-white text-xs lg:text-sm truncate">{scanResult.barber_name}</p>
                    <p className="text-gray-400 text-[10px] lg:text-xs truncate">{scanResult.service_name}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[#1A1A1A] rounded-lg p-2.5 lg:p-3 border border-[#444444]">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 mb-1">
                      <Gift className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                      <span className="text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wide">Code</span>
                    </div>
                    <p className="font-semibold text-white text-xs lg:text-sm truncate">{scanResult.code}</p>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-2.5 lg:p-3 border border-[#444444]">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 mb-1">
                      <DollarSign className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                      <span className="text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wide">Value</span>
                    </div>
                    <p className="font-bold text-[#FF8C42] text-base lg:text-lg">{scanResult.value}</p>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-2.5 lg:p-3 border border-[#444444] col-span-2">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 mb-1">
                      <Calendar className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                      <span className="text-[10px] lg:text-xs font-medium text-gray-500 uppercase tracking-wide">Expires</span>
                    </div>
                    <p className="font-semibold text-white text-xs lg:text-sm">{scanResult.expires_at}</p>
                    {scanResult.user !== 'N/A' && (
                      <p className="text-gray-400 text-xs lg:text-sm mt-1">User: {scanResult.user}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Status Messages */}
            {scanResult.status === 'scanned' && (
              <div className="p-2.5 lg:p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-3 lg:mb-4">
                <div className="flex items-center space-x-2">
                  <QrCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <p className="text-xs lg:text-sm font-medium text-blue-300">
                    {scanResult.type === 'booking' ? 'Booking' : 'Voucher'} scanned — Ready to {scanResult.type === 'booking' ? 'confirm' : 'use'}
                  </p>
                </div>
              </div>
            )}

            {(scanResult.status === 'confirmed' || scanResult.status === 'redeemed') && (
              <div className="p-2.5 lg:p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-3 lg:mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-xs lg:text-sm font-medium text-green-300">
                    ✓ {scanResult.type === 'booking' ? 'Booking confirmed!' : 'Voucher used!'} Transaction completed.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-2.5 lg:p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 font-medium text-xs lg:text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
         <div className="flex justify-center gap-2 lg:gap-3 pt-3 lg:pt-4 border-t border-[#444444]">
           {scanResult && scanResult.status !== 'confirmed' && scanResult.status !== 'redeemed' && (
             <Button
               onClick={handleConfirm}
               disabled={isProcessing}
               className={`flex items-center justify-center text-white px-4 lg:px-6 py-2.5 lg:py-3 font-semibold rounded-lg text-sm lg:text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                 scanResult.type === 'booking'
                   ? 'bg-green-600 hover:bg-green-700'
                   : 'bg-[#FF8C42] hover:bg-[#E67A1A]'
               }`}
             >
               {isProcessing ? (
                 <>
                   <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                   <span className="hidden lg:inline">Processing...</span>
                   <span className="lg:hidden">Processing</span>
                 </>
               ) : (
                 <>
                   <CheckCircle className="w-4 h-4 mr-2" />
                   <span className="hidden lg:inline">{scanResult.type === 'booking' ? 'Confirm Booking' : 'Use Voucher'}</span>
                   <span className="lg:hidden">Confirm</span>
                 </>
               )}
             </Button>
           )}
           
           {scanResult && (
             <Button
               variant="outline"
               onClick={handleScanAgain}
               disabled={isProcessing}
               className="flex items-center justify-center px-4 lg:px-5 py-2.5 lg:py-3 border-2 border-[#555555] text-gray-300 font-medium rounded-lg text-sm lg:text-base hover:border-[#FF8C42] hover:text-[#FF8C42] hover:bg-[#FF8C42]/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Camera className="w-4 h-4 mr-2" />
               <span className="hidden lg:inline">Scan Again</span>
               <span className="lg:hidden">Again</span>
             </Button>
           )}
           
           <Button
             variant="outline"
             onClick={handleClose}
             disabled={isProcessing}
             className="flex items-center justify-center px-4 lg:px-5 py-2.5 lg:py-3 border-2 border-[#555555] text-gray-300 font-medium rounded-lg text-sm lg:text-base hover:border-gray-400 hover:bg-[#1A1A1A] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <span>Close</span>
           </Button>
         </div>
      </div>
    </Modal>
  )
}

export default QRScannerModal