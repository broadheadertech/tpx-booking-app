import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Gift, Clock, CheckCircle, XCircle, QrCode, Ticket, Camera, Upload, Keyboard, X, Banknote, Percent, Info, AlertTriangle } from 'lucide-react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const VoucherManagement = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth()
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [showQRCode, setShowQRCode] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimCode, setClaimCode] = useState('')
  const [claimMethod, setClaimMethod] = useState('code') // 'code', 'scan', 'upload'
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [validatedVoucher, setValidatedVoucher] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  const [notification, setNotification] = useState(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Convex queries - only call when user exists
  const vouchers = user?.id ? useQuery(api.services.vouchers.getVouchersByUser, { userId: user.id }) : undefined
  const debugData = user?.id ? useQuery(api.services.vouchers.debugUserVouchers, { userId: user.id }) : undefined
  const loading = vouchers === undefined && user?.id // Loading when user exists but vouchers not loaded yet
  const error = null // No global error state needed for vouchers - handled individually

  // Convex mutations
  const claimVoucher = useMutation(api.services.vouchers.claimVoucher)

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'redeemed':
        return <Gift className="w-5 h-5 text-blue-400" />
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'redeemed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'expired':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-[#FF8C42]" />
      case 'percentage':
        return <Percent className="w-4 h-4 text-[#FF8C42]" />
      case 'discount':
        return <Ticket className="w-4 h-4 text-[#FF8C42]" />
      default:
        return <Gift className="w-4 h-4 text-[#FF8C42]" />
    }
  }

  const formatValue = (voucher) => {
    return `₱${parseFloat(voucher.value).toFixed(2)}`
  }

  const getVoucherStatus = (voucher) => {
    // Priority: expired first, then assignment status
    if (voucher.isExpired) return 'expired'
    
    // Map assignment status to display status
    if (voucher.status === 'assigned') return 'available' // Show "available" for assigned status
    if (voucher.status === 'redeemed') return 'redeemed'
    
    // Fallback
    return voucher.status || 'unknown'
  }

  const isExpiringSoon = (expiresAt) => {
    const today = new Date()
    const expireDate = new Date(expiresAt)
    const daysUntilExpiry = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  const formatExpiryDate = (expiresAt) => {
    if (!expiresAt) return 'No expiry'
    const expireDate = new Date(expiresAt)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) return 'Expired'
    if (daysUntilExpiry === 0) return 'Expires today'
    if (daysUntilExpiry === 1) return 'Expires tomorrow'
    if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`
    return expireDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Process vouchers into categories (after helper functions are defined)
  const availableVouchers = vouchers ? vouchers.filter(v => {
    // Show assigned (available) vouchers that are not expired
    return v.status === 'assigned' && !v.isExpired
  }) : []

  const redeemedVouchers = vouchers ? vouchers.filter(v => {
    // Show redeemed vouchers regardless of expiry
    return v.status === 'redeemed'
  }) : []

  const expiredVouchers = vouchers ? vouchers.filter(v => {
    // Show expired vouchers (regardless of assignment status)
    return v.isExpired
  }) : []

  // Debug logging
  console.log('=== VoucherManagement Debug ===')
  console.log('User ID:', user?.id, typeof user?.id)
  console.log('Raw vouchers from API:', vouchers)
  console.log('Vouchers count:', vouchers?.length || 0)
  console.log('Categorized vouchers:', {
    available: availableVouchers.length,
    redeemed: redeemedVouchers.length,
    expired: expiredVouchers.length
  })
  console.log('Debug data from API:', debugData)

  // Sample voucher structure debug
  if (vouchers && vouchers.length > 0) {
    console.log('First voucher structure:', vouchers[0])
  }

  const handleClaimVoucher = async (voucherCode, voucherValue = null) => {
    try {
      setClaimLoading(true)
      
      // Claim the voucher using Convex (assign it to the user)
      const result = await claimVoucher({
        code: voucherCode,
        user_id: user.id
      })

      // Show success message with voucher details
      const value = result.voucher.value || voucherValue || 'Unknown'
      setNotification({
        type: 'success',
        title: 'Voucher Claimed Successfully',
        message: `Code: ${voucherCode}\nValue: ₱${parseFloat(value).toLocaleString()}\nYou can now use this voucher at the barbershop.`
      })

      setShowQRCode(false)
      setSelectedVoucher(null)
      setShowClaimModal(false)
      setClaimCode('')
    } catch (error) {
        // Handle claim error
        let errorMessage = error.message
        if (errorMessage.includes('expired')) {
          errorMessage = 'This voucher has expired'
        } else if (errorMessage.includes('already') || errorMessage.includes('assigned')) {
          errorMessage = 'This voucher has already been claimed'
        } else if (errorMessage.includes('Invalid') || errorMessage.includes('not found')) {
          errorMessage = 'Invalid voucher code. Please check and try again.'
        } else if (errorMessage.includes('maximum') || errorMessage.includes('limit')) {
          errorMessage = 'This voucher has reached its usage limit'
        } else {
          errorMessage = errorMessage || 'Failed to claim voucher. Please try again.'
        }
        setNotification({
          type: 'error',
          title: 'Claim Failed',
          message: errorMessage
        })
      } finally {
      setClaimLoading(false)
    }
  }

  const handleValidateVoucher = async () => {
    if (!claimCode.trim()) {
      setNotification({
        type: 'warning',
        title: 'Missing Code',
        message: 'Please enter a voucher code'
      })
      return
    }

    try {
      setIsValidating(true)
      setValidationError(null)
      setValidatedVoucher(null)
      
      // Just try to claim the voucher directly
      await handleClaimVoucher(claimCode.trim())
    } catch (error) {
      console.error('Error validating voucher:', error)
      setValidationError('Failed to validate voucher. Please try again.')
      setValidatedVoucher(null)
    } finally {
      setIsValidating(false)
    }
  }

  const handleClaimValidatedVoucher = async () => {
    if (!validatedVoucher) return
    
    try {
      await handleClaimVoucher(validatedVoucher.code, validatedVoucher.value)
      setClaimCode('')
      setValidatedVoucher(null)
      setValidationError(null)
      setShowClaimModal(false)
    } catch (error) {
      // Error is already handled in handleClaimVoucher
    }
  }


  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      // Create an image element to read the uploaded file
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = await decodeQRFromImageData(imageData)
            if (code) {
              await handleClaimVoucher(code)
              setShowClaimModal(false)
          } else {
            setNotification({
              type: 'warning',
              title: 'QR Code Not Found',
              message: 'No QR code found in the image. Please try again.'
            })
          }
        } catch (error) {
          console.error('Error decoding QR code:', error)
          setNotification({
              type: 'error',
              title: 'QR Code Error',
              message: 'Failed to decode QR code from image.'
            })
        }
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error processing uploaded file:', error)
      setNotification({
        type: 'error',
        title: 'Upload Error',
        message: 'Failed to process uploaded file.'
      })
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startScanning = async () => {
    try {
      setScanError(null)
      setIsScanning(true)

      // Try different camera constraints for better compatibility
      let stream
      try {
        // First try with back camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        })
      } catch (backCameraError) {
        console.log('Back camera not available, trying front camera:', backCameraError)
        // Fallback to front camera or any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        })
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        
        // Wait for video to be ready before starting scan
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
          videoRef.current.play().then(() => {
            console.log('Video started successfully')
            // Add a small delay to ensure video is fully loaded
            setTimeout(() => {
              startQRScanning()
            }, 500)
          }).catch(playError => {
            console.error('Error playing video:', playError)
            setScanError('Failed to start camera preview.')
            setIsScanning(false)
          })
        }
        
        // Add additional event listeners for debugging
        videoRef.current.oncanplay = () => {
          console.log('Video can start playing')
        }
        
        videoRef.current.onplaying = () => {
          console.log('Video is playing')
        }
        
        // Handle video errors
        videoRef.current.onerror = (error) => {
          console.error('Video error:', error)
          setScanError('Camera error occurred.')
          setIsScanning(false)
        }
      }
    } catch (error) {
      console.error('Error starting camera:', error)
      let errorMessage = 'Failed to access camera.'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.'
      }
      setScanError(errorMessage)
      setIsScanning(false)
    }
  }

  const startQRScanning = () => {
    // Start scanning for QR codes
    const scanInterval = setInterval(async () => {
      if (videoRef.current && canvasRef.current && isScanning && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current
        const video = videoRef.current
        const ctx = canvas.getContext('2d')
        
        // Only proceed if video has dimensions
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = await decodeQRFromImageData(imageData)
            
            if (code) {
              clearInterval(scanInterval)
              stopScanning()
              await handleClaimVoucher(code)
              setShowClaimModal(false)
            }
          } catch (error) {
            // Continue scanning if no QR code found
          }
        }
      } else if (!isScanning) {
        clearInterval(scanInterval)
      }
    }, 500) // Scan every 500ms
    
    // Stop scanning after 30 seconds
    setTimeout(() => {
      clearInterval(scanInterval)
      if (isScanning) {
        stopScanning()
        setScanError('Scanning timeout. Please try again.')
      }
    }, 30000)
  }

  const stopScanning = () => {
    setIsScanning(false)
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  // QR code detection function using jsQR
  const decodeQRFromImageData = async (imageData) => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code) {
        // Try to extract voucher code from QR data
        let voucherCode = null
        
        try {
          // If QR contains JSON data, try to extract the code
          const qrData = JSON.parse(code.data)
          voucherCode = qrData.code || qrData.voucherCode || qrData.voucher_code
        } catch {
          // If not JSON, treat the entire data as the voucher code
          voucherCode = code.data
        }
        
        return voucherCode
      }
      return null
    } catch (error) {
      console.error('Error decoding QR:', error)
      return null
    }
  }


  // Notification Modal Component
  const NotificationModal = ({ notification, onClose }) => {
    if (!notification) return null

    const getNotificationStyles = (type) => {
      switch (type) {
        case 'success':
          return { bg: '#F0FDF4', border: '#22C55E', Icon: CheckCircle, iconBg: '#22C55E' }
        case 'error':
          return { bg: '#FEF2F2', border: '#EF4444', Icon: XCircle, iconBg: '#EF4444' }
        case 'warning':
          return { bg: '#FFFBEB', border: '#F59E0B', Icon: AlertTriangle, iconBg: '#F59E0B' }
        default:
          return { bg: '#F4F0E6', border: '#F68B24', Icon: Info, iconBg: '#F68B24' }
      }
    }

    const styles = getNotificationStyles(notification.type)

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2" style={{backgroundColor: styles.bg, borderColor: styles.border}} role="dialog" aria-modal="true" aria-labelledby="notification-title" tabIndex="-1">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{backgroundColor: styles.iconBg}}>
              <styles.Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 id="notification-title" className="text-lg font-black mb-2" style={{color: '#36454F'}}>{notification.title}</h3>
              <p className="text-sm whitespace-pre-line" style={{color: '#8B8B8B'}}>{notification.message}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#F68B24] hover:bg-[#E67E22] text-white font-bold rounded-xl transition-all duration-200"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header - Mobile Native */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#0A0A0A] to-[#0A0A0A]/95 backdrop-blur-2xl border-b border-[#1A1A1A] shadow-lg">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-br from-[#1A1A1A] to-[#141414] text-white font-bold rounded-2xl hover:bg-[#1A1A1A] border border-[#2A2A2A] active:scale-95 transition-all duration-200 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-xl font-black text-white">Vouchers</p>
              <p className="text-xs font-bold text-[#FF8C42]">{availableVouchers.length + redeemedVouchers.length} total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* Hero Section - Mobile Native */}
        <div className="relative overflow-hidden rounded-[32px] p-6 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] shadow-2xl mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black mb-2 text-white">Your Vouchers</h1>
            <p className="text-sm font-semibold text-white/90">Tap vouchers to view details</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 bg-[#FF8C42]/20 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-[#FF8C42]" />
            </div>
            <p className="text-sm text-gray-400">Loading vouchers...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg font-medium hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors mr-2"
              >
                Try Again
              </button>
              <button 
                onClick={async () => {
                  console.log('=== VOUCHER ENDPOINT DIAGNOSTIC ===')
                  const results = await voucherService.testVoucherEndpoints()
                  console.log('Diagnostic results:', results)
                  alert('Check browser console for endpoint diagnostic results')
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Debug API
              </button>
            </div>
          </div>
        )}

        {/* Available Vouchers - Mobile Native Cards */}
        {!loading && !error && availableVouchers.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-black flex items-center text-white">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                Available ({availableVouchers.length})
              </h2>
            </div>
            <div className="space-y-3">
              {availableVouchers.map((voucher) => (
                <div
                  key={voucher._id}
                  className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-3xl p-5 border border-[#2A2A2A] hover:border-[#FF8C42]/50 active:scale-98 transition-all duration-200 shadow-lg"
                >
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="text-lg flex-shrink-0">{getTypeIcon(voucher.type)}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black truncate text-white">{voucher.code}</h3>
                        <p className="text-xs truncate text-gray-400">{voucher.description || 'Discount voucher'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {getStatusIcon(getVoucherStatus(voucher))}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(getVoucherStatus(voucher))}`}>
                        {getVoucherStatus(voucher).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500">Value</p>
                        <p className="text-xs font-bold text-green-600 truncate">{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-2 h-2 text-green-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{color: '#8B8B8B'}}>Claimed</p>
                        <p className="text-xs font-bold truncate" style={{color: '#36454F'}}>
                          {voucher.assigned_at ? new Date(voucher.assigned_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${voucher.isExpired || isExpiringSoon(voucher.expires_at) ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{color: '#8B8B8B'}}>Expires</p>
                        <p className={`text-xs font-bold truncate ${voucher.isExpired || isExpiringSoon(voucher.expires_at) ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatExpiryDate(voucher.expires_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* View QR Code Button - Mobile Native */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedVoucher(voucher)
                      setShowQRCode(true)
                    }}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black rounded-2xl active:scale-95 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-sm">View QR Code</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redeemed Vouchers */}
        {!loading && !error && redeemedVouchers.length > 0 && (
          <div className="space-y-2 mb-3">
            <h2 className="text-base font-black flex items-center px-2" style={{color: '#36454F'}}>
              <Gift className="w-3.5 h-3.5 text-blue-500 mr-2" />
              Redeemed Vouchers ({redeemedVouchers.length})
            </h2>
            <div className="space-y-2">
              {redeemedVouchers.map((voucher) => (
                <div
                  key={voucher._id}
                  className="bg-white rounded-lg p-3 shadow-sm opacity-75 touch-manipulation" style={{border: '1px solid #E0E0E0'}}
                >
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="text-lg opacity-50 flex-shrink-0">{getTypeIcon(voucher.type)}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black truncate text-white">{voucher.code}</h3>
                        <p className="text-xs truncate text-gray-400">{voucher.description || 'Discount voucher'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {getStatusIcon(getVoucherStatus(voucher))}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(getVoucherStatus(voucher))}`}>
                        REDEEMED
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500">Value</p>
                        <p className="text-xs font-bold text-blue-600 truncate">{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-2 h-2 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{color: '#8B8B8B'}}>Redeemed</p>
                        <p className="text-xs font-bold truncate" style={{color: '#36454F'}}>
                          {voucher.assigned_at ? new Date(voucher.assigned_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${voucher.isExpired || isExpiringSoon(voucher.expires_at) ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{color: '#8B8B8B'}}>Expired</p>
                        <p className={`text-xs font-bold truncate ${voucher.isExpired || isExpiringSoon(voucher.expires_at) ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatExpiryDate(voucher.expires_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* No QR Code button for redeemed vouchers */}
                  <div className="text-center py-1.5 text-gray-500 text-xs">
                    This voucher has been redeemed
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired Vouchers */}
        {!loading && !error && expiredVouchers.length > 0 && (
          <div className="space-y-2 mb-3">
            <h2 className="text-base font-black flex items-center px-2" style={{color: '#36454F'}}>
              <XCircle className="w-3.5 h-3.5 text-red-500 mr-2" />
              Expired Vouchers ({expiredVouchers.length})
            </h2>
            <div className="space-y-2">
              {expiredVouchers.map((voucher) => (
                <div
                  key={voucher._id}
                  className="bg-white rounded-lg p-3 shadow-sm opacity-50 touch-manipulation" style={{border: '1px solid #E0E0E0'}}
                >
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="text-lg opacity-50 flex-shrink-0">{getTypeIcon(voucher.type)}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black truncate text-white">{voucher.code}</h3>
                        <p className="text-xs truncate text-gray-400">{voucher.description || 'Discount voucher'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {getStatusIcon(getVoucherStatus(voucher))}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(getVoucherStatus(voucher))}`}>
                        {getVoucherStatus(voucher).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500">Value</p>
                        <p className="text-xs font-bold text-red-600 truncate">{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <XCircle className="w-2 h-2 text-red-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{color: '#8B8B8B'}}>Expired</p>
                        <p className="text-xs font-bold truncate" style={{color: '#36454F'}}>
                          {voucher.expires_at ? new Date(voucher.expires_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <div className="min-w-0">
                        <p className="text-[10px]" style={{color: '#8B8B8B'}}>Status</p>
                        <p className="text-xs font-bold text-gray-600 truncate">Expired</p>
                      </div>
                    </div>
                  </div>

                  {/* No QR Code button for expired vouchers */}
                  <div className="text-center py-1.5 text-red-500 text-xs">
                    This voucher has expired
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && availableVouchers.length === 0 && redeemedVouchers.length === 0 && expiredVouchers.length === 0 && (
          <div className="text-center py-8">
            <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3" style={{backgroundColor: '#F68B24', opacity: 0.1}}>
              <Ticket className="w-6 h-6" style={{color: '#F68B24'}} />
            </div>
            <h3 className="text-base font-black mb-2" style={{color: '#36454F'}}>
              No Vouchers Yet
            </h3>
            <p className="text-xs max-w-md mx-auto mb-3" style={{color: '#8B8B8B'}}>
              Your vouchers will appear here. 
            </p>
          </div>
        )}
      </div>

      {/* Claim Voucher Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" style={{backgroundColor: '#F4F0E6'}}>
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{backgroundColor: '#F68B24'}}>
                <Gift className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-black mb-2" style={{color: '#36454F'}}>Claim Voucher</h3>
                <p className="font-medium" style={{color: '#8B8B8B'}}>Enter your voucher code to claim</p>
              </div>

              {/* Claim Method Tabs */}
              <div className="rounded-xl p-1" style={{backgroundColor: '#E0E0E0'}}>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setClaimMethod('code')}
                    className="py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-1"
                    style={{
                      backgroundColor: claimMethod === 'code' ? '#F68B24' : 'transparent',
                      color: claimMethod === 'code' ? 'white' : '#8B8B8B'
                    }}
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>Code</span>
                  </button>
                  <button
                    onClick={() => setClaimMethod('scan')}
                    className="py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-1"
                    style={{
                      backgroundColor: claimMethod === 'scan' ? '#F68B24' : 'transparent',
                      color: claimMethod === 'scan' ? 'white' : '#8B8B8B'
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan</span>
                  </button>
                  <button
                    onClick={() => setClaimMethod('upload')}
                    className="py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-1"
                    style={{
                      backgroundColor: claimMethod === 'upload' ? '#F68B24' : 'transparent',
                      color: claimMethod === 'upload' ? 'white' : '#8B8B8B'
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {/* Claim Content */}
              {claimMethod === 'code' && (
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={claimCode}
                      onChange={(e) => {
                        setClaimCode(e.target.value.toUpperCase())
                        setValidatedVoucher(null)
                        setValidationError(null)
                      }}
                      placeholder="Enter voucher code"
                      className="w-full p-4 border-2 rounded-xl text-center font-mono text-lg tracking-widest focus:outline-none"
                      style={{
                        borderColor: '#E0E0E0',
                        backgroundColor: 'white',
                        color: '#36454F'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                      onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                      maxLength={12}
                    />
                  </div>
                  
                  {!validatedVoucher && (
                    <button
                      onClick={handleValidateVoucher}
                      disabled={isValidating || !claimCode.trim()}
                      className="w-full py-4 text-white font-bold rounded-2xl hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{backgroundColor: '#36454F'}}
                      onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#2D3748')}
                      onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#36454F')}
                    >
                      {isValidating ? 'Validating...' : 'Validate Voucher'}
                    </button>
                  )}

                  {validationError && (
                    <div className="border rounded-xl p-4" style={{backgroundColor: '#FEF2F2', borderColor: '#F87171'}}>
                      <p className="text-sm text-center" style={{color: '#DC2626'}}>{validationError}</p>
                    </div>
                  )}

                  {validatedVoucher && (
                    <div className="space-y-4">
                      {/* Voucher Details Card */}
                      <div className="border rounded-xl p-4" style={{backgroundColor: '#F4F0E6', borderColor: '#F68B24'}}>
                        <div className="text-center space-y-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{backgroundColor: '#F68B24'}}>
                            <Gift className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black" style={{color: '#36454F'}}>{validatedVoucher.code}</h4>
                            <p className="text-2xl font-black" style={{color: '#F68B24'}}>{voucherService.formatVoucherValue(validatedVoucher.value)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p style={{color: '#8B8B8B'}}>Points Required</p>
                              <p className="font-bold" style={{color: '#36454F'}}>{validatedVoucher.points_required}</p>
                            </div>
                            <div>
                              <p style={{color: '#8B8B8B'}}>Expires</p>
                              <p className="font-bold" style={{color: '#36454F'}}>{voucherService.formatVoucherExpiry(validatedVoucher.expires_at)}</p>
                            </div>
                          </div>
                          <div className="text-xs" style={{color: '#8B8B8B'}}>
                            <p>Uses: {validatedVoucher.used_count}/{validatedVoucher.max_uses}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Claim Button */}
                      <button
                        onClick={handleClaimValidatedVoucher}
                        disabled={claimLoading}
                        className="w-full py-4 text-white font-bold rounded-2xl hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{backgroundColor: '#F68B24'}}
                        onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#E67E22')}
                        onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#F68B24')}
                      >
                        {claimLoading ? 'Claiming...' : 'Claim This Voucher'}
                      </button>
                      
                      {/* Reset Button */}
                      <button
                        onClick={() => {
                          setValidatedVoucher(null)
                          setValidationError(null)
                          setClaimCode('')
                        }}
                        className="w-full py-2 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-all duration-200"
                      >
                        Enter Different Code
                      </button>
                    </div>
                  )}
                </div>
              )}

              {claimMethod === 'scan' && (
                <div className="space-y-4">
                  {!isScanning ? (
                    <div className="space-y-4">
                      <div className="border rounded-xl p-6" style={{backgroundColor: '#F4F0E6', borderColor: '#F68B24'}}>
                        <Camera className="w-12 h-12 mx-auto mb-3" style={{color: '#F68B24'}} />
                        <p className="text-sm mb-3" style={{color: '#36454F'}}>
                          Position the QR code within the camera frame to scan
                        </p>
                        <button
                          onClick={startScanning}
                          className="w-full py-3 text-white font-semibold rounded-lg transition-colors"
                          style={{backgroundColor: '#F68B24'}}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
                        >
                          Start Camera
                        </button>
                      </div>
                      {scanError && (
                        <div className="border rounded-xl p-4" style={{backgroundColor: '#FEF2F2', borderColor: '#F87171'}}>
                          <p className="text-sm" style={{color: '#DC2626'}}>{scanError}</p>
                          <button
                            onClick={() => setScanError(null)}
                            className="mt-2 px-3 py-1 rounded text-xs transition-colors"
                            style={{backgroundColor: '#FEE2E2', color: '#DC2626'}}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#FECACA'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#FEE2E2'}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative bg-gray-900 rounded-xl overflow-hidden border-2" style={{borderColor: '#F68B24'}}>
                        <video
                          ref={videoRef}
                          className="w-full h-64 object-cover bg-transparent"
                          autoPlay
                          playsInline
                          muted
                          style={{ transform: 'scaleX(-1)', backgroundColor: 'transparent' }}
                        />
                        <canvas
                          ref={canvasRef}
                          className="hidden"
                        />
                        
                        {/* Scanner overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white border-dashed rounded-lg"></div>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                            <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-green-400"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-green-400"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-green-400"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-green-400"></div>
                          </div>
                        </div>
                        
                        {/* Stop scanning button */}
                        <button
                          onClick={stopScanning}
                          className="absolute top-4 right-4 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="border rounded-xl p-4" style={{backgroundColor: '#F4F0E6', borderColor: '#F68B24'}}>
                        <p className="text-sm text-center" style={{color: '#36454F'}}>
                          📱 Position the QR code within the frame above
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {claimMethod === 'upload' && (
                <div className="space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 cursor-pointer text-center"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm mb-2 font-medium">
                      Upload QR Code Image
                    </p>
                    <p className="text-gray-500 text-xs">
                      Supports JPG, PNG, WebP formats
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-700 text-xs">
                      💡 <strong>Tip:</strong> Make sure the QR code is clear and well-lit for best results
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  if (isScanning) {
                    stopScanning()
                  }
                  setShowClaimModal(false)
                  setClaimCode('')
                  setClaimMethod('code')
                  setScanError(null)
                  setValidatedVoucher(null)
                  setValidationError(null)
                }}
                className="w-full py-4 text-white font-bold rounded-2xl transition-all duration-200"
                style={{backgroundColor: '#36454F'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2D3748'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#36454F'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && selectedVoucher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-orange to-primary-orange-light rounded-full flex items-center justify-center mx-auto">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-primary-black mb-2">Voucher QR Code</h3>
        <p className="text-gray-dark font-medium">Show this QR code to staff</p>
              </div>

              {/* QR Code */}
              <div className="bg-gray-light p-6 rounded-2xl">
                <div className="flex justify-center">
                  <QRCodeDisplay voucher={selectedVoucher} />
                </div>
              </div>

              {/* Voucher Details */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4">
                <div className="text-center">
                  <h4 className="text-xl font-black text-primary-black mb-1">{selectedVoucher.code}</h4>
                  <p className="text-2xl font-black text-green-600 mb-1">{formatValue(selectedVoucher)}</p>
                  <p className="text-sm text-gray-dark font-medium">{selectedVoucher.description}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowQRCode(false)}
                  className="w-full py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold rounded-2xl hover:shadow-xl transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal 
        notification={notification} 
        onClose={() => setNotification(null)} 
      />
    </div>
  )
}

// QR Code Display Component
const QRCodeDisplay = ({ voucher }) => {
  const { user } = useAuth()
  const qrRef = useRef(null)
  
  // Get username from localStorage or user context
  const getUsername = () => {
    // First try to get from localStorage
    const storedUsername = localStorage.getItem('username')
    if (storedUsername) return storedUsername
    
    // Fallback to user context if available
    return user?.username || 'N/A'
  }
  
  // Generate QR code data for voucher
  const qrData = JSON.stringify({
    voucherId: voucher._id,
    code: voucher.code,
    username: getUsername(),
    value: voucher.value,
    expiresAt: voucher.expires_at,
    barbershop: 'TipunoX Angeles Barbershop'
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

  return <canvas ref={qrRef} className="rounded-xl" />
}

export default VoucherManagement