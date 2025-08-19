import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Gift, Clock, CheckCircle, XCircle, QrCode, Ticket, Plus, Camera, Upload, Keyboard, X, RefreshCw } from 'lucide-react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import voucherService from '../../services/customer/voucherService'
import { useAuth } from '../../context/AuthContext'

const VoucherManagement = ({ onBack }) => {
  const { user, isAuthenticated } = useAuth()
  const [vouchers, setVouchers] = useState([])
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [showQRCode, setShowQRCode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [error, setError] = useState(null)
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

  useEffect(() => {
    if (isAuthenticated && user) {
      loadVouchers()
    }
  }, [isAuthenticated, user])

  const loadVouchers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Verify user is authenticated
      if (!isAuthenticated || !user) {
        setError('Please log in to view your vouchers')
        return
      }
      
      // Get user-specific vouchers only
      const userVouchers = await voucherService.getUserVouchers()
      const voucherList = Array.isArray(userVouchers) ? userVouchers : userVouchers.results || []
      setVouchers(voucherList)
    } catch (error) {
      console.error('Error loading vouchers:', error)
      
      // Handle specific error cases
      if (error.message.includes('not authenticated')) {
        setError('Authentication required. Please log in again.')
      } else if (error.status === 500) {
        setError('Server error. The voucher service is temporarily unavailable.')
      } else if (error.status === 404) {
        setError('Voucher service not found. Please contact support.')
      } else if (error.message.includes('Failed to load your vouchers')) {
        setError('Unable to load vouchers. Please check your connection and try again.')
      } else {
        setError('Failed to load vouchers. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'claimed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'redeemed':
        return <Gift className="w-5 h-5 text-blue-500" />
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'claimed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'redeemed':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'expired':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'cash':
        return '💰'
      case 'percentage':
        return '🎯'
      case 'discount':
        return '🎫'
      default:
        return '🎁'
    }
  }

  const formatValue = (voucher) => {
    return voucherService.formatVoucherValue(voucher.value)
  }

  const getVoucherStatus = (voucher) => {
    // Based on the actual API response: {code, value, status, assigned_at, redeemed_at, expired}
    if (voucher.expired) return 'expired'
    if (voucher.status === 'assigned') return 'claimed' // Show "claimed" for assigned status
    if (voucher.status === 'redeemed') return 'redeemed'
    return voucher.status || 'unknown'
  }

  const isExpiringSoon = (expiresAt) => {
    const today = new Date()
    const expireDate = new Date(expiresAt)
    const daysUntilExpiry = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  const handleVoucherClick = (voucher) => {
    // Allow all vouchers to show QR codes, regardless of status
    setSelectedVoucher(voucher)
    setShowQRCode(true)
  }

  const handleClaimVoucher = async (voucherCode, voucherValue = null) => {
    try {
      setClaimLoading(true)
      
      // Only assign/claim the voucher using the redeem endpoint (no confirmation step)
      const claimResult = await voucherService.redeemVoucher(voucherCode, null, voucherValue)
      
      if (claimResult.success) {
        // Reload vouchers to reflect the changes
        await loadVouchers()
        setShowQRCode(false)
        setSelectedVoucher(null)
        // Show success message with voucher details
        const value = claimResult.data?.value || voucherValue || 'Unknown'
        setNotification({
          type: 'success',
          title: '🎉 Voucher Claimed Successfully!',
          message: `Code: ${voucherCode}\nValue: ₱${parseFloat(value).toLocaleString()}\nYou can now use this voucher at the barbershop.`
        })
      } else {
        // Handle assignment/claim error
        let errorMessage = claimResult.error
        if (errorMessage.includes('expired')) {
          errorMessage = '⏰ This voucher has expired'
        } else if (errorMessage.includes('already assigned')) {
          errorMessage = '✅ This voucher has already been claimed'
        } else if (errorMessage.includes('Invalid voucher')) {
          errorMessage = '❌ Invalid voucher code. Please check and try again.'
        } else if (errorMessage.includes('usage limit')) {
          errorMessage = '🚫 This voucher has reached its usage limit'
        } else if (errorMessage.includes('Username is required')) {
          errorMessage = '❌ User authentication error. Please log in again.'
        } else if (errorMessage.includes('Target user not found')) {
          errorMessage = '❌ User account not found. Please log in again.'
        }
        setNotification({
          type: 'error',
          title: 'Claim Failed',
          message: errorMessage
        })
      }
    } catch (error) {
      console.error('Error claiming voucher:', error)
      setNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Please check your connection and try again.'
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
      
      const result = await voucherService.validateVoucherCode(claimCode.trim())
      
      if (result.success) {
        setValidatedVoucher(result.data)
        setValidationError(null)
      } else {
        setValidationError(result.error)
        setValidatedVoucher(null)
      }
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

  const handleClaimByCode = async () => {
    if (!claimCode.trim()) {
      setNotification({
        type: 'warning',
        title: 'Missing Code',
        message: 'Please enter a voucher code'
      })
      return
    }
    
    try {
      await handleClaimVoucher(claimCode.trim())
      setClaimCode('')
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

  // Filter vouchers by status
  const claimedVouchers = vouchers.filter(v => getVoucherStatus(v) === 'claimed')
  const redeemedVouchers = vouchers.filter(v => getVoucherStatus(v) === 'redeemed')
  const expiredVouchers = vouchers.filter(v => getVoucherStatus(v) === 'expired')

  // Notification Modal Component
  const NotificationModal = ({ notification, onClose }) => {
    if (!notification) return null

    const getNotificationStyles = (type) => {
      switch (type) {
        case 'success':
          return {
            bg: '#F0FDF4',
            border: '#22C55E',
            icon: '✅',
            iconBg: '#22C55E'
          }
        case 'error':
          return {
            bg: '#FEF2F2',
            border: '#EF4444',
            icon: '❌',
            iconBg: '#EF4444'
          }
        case 'warning':
          return {
            bg: '#FFFBEB',
            border: '#F59E0B',
            icon: '⚠️',
            iconBg: '#F59E0B'
          }
        default:
          return {
            bg: '#F4F0E6',
            border: '#F68B24',
            icon: 'ℹ️',
            iconBg: '#F68B24'
          }
      }
    }

    const styles = getNotificationStyles(notification.type)

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2" style={{backgroundColor: styles.bg, borderColor: styles.border}}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{backgroundColor: styles.iconBg}}>
              <span className="text-2xl">{styles.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-black mb-2" style={{color: '#36454F'}}>{notification.title}</h3>
              <p className="text-sm whitespace-pre-line" style={{color: '#8B8B8B'}}>{notification.message}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 text-white font-bold rounded-xl transition-all duration-200"
              style={{backgroundColor: '#F68B24'}}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Header */}
      <div className="sticky top-0 z-40 shadow-lg" style={{backgroundColor: '#36454F'}}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl transition-all duration-200"
              style={{
                ':hover': {
                  color: '#F68B24'
                }
              }}
              onMouseEnter={(e) => e.target.style.color = '#F68B24'}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-lg font-bold text-white">My Vouchers</p>
              <p className="text-xs" style={{color: '#F68B24'}}>{claimedVouchers.length + redeemedVouchers.length} total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Title */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg" style={{backgroundColor: '#F68B24'}}>
            <Gift className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black mb-1" style={{color: '#36454F'}}>Your Vouchers</h1>
          <p className="text-sm font-medium mb-4" style={{color: '#8B8B8B'}}>View your claimed and redeemed vouchers</p>
          
          {/* Action Buttons */}
          <div className="flex space-x-3 mb-4">
            <button
              onClick={() => setShowClaimModal(true)}
              className="flex-1 py-4 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
              style={{backgroundColor: '#F68B24'}}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
            >
              <Plus className="w-5 h-5" />
              <span>Claim New Voucher</span>
            </button>
            <button
              onClick={loadVouchers}
              disabled={loading}
              className="px-4 py-4 bg-gray-600 text-white font-bold rounded-xl transition-all duration-200 hover:bg-gray-700 shadow-lg flex items-center justify-center disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#F68B24', opacity: 0.1}}>
              <Gift className="w-8 h-8" style={{color: '#F68B24'}} />
            </div>
            <p className="text-sm" style={{color: '#8B8B8B'}}>Loading vouchers...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#dc3545', opacity: 0.1}}>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={loadVouchers}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors mr-2"
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

        {/* Claimed Vouchers */}
        {!loading && !error && claimedVouchers.length > 0 && (
          <div className="space-y-3 mb-4">
            <h2 className="text-lg font-black flex items-center" style={{color: '#36454F'}}>
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Claimed Vouchers ({claimedVouchers.length})
            </h2>
            <div className="space-y-3">
              {claimedVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="bg-white rounded-xl p-4 shadow-sm" style={{border: '1px solid #E0E0E0'}}
                >
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{getTypeIcon(voucher.type)}</div>
                      <div>
                        <h3 className="text-base font-black" style={{color: '#36454F'}}>{voucher.code}</h3>
                        <p className="text-sm" style={{color: '#8B8B8B'}}>{voucher.description || 'Voucher'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(getVoucherStatus(voucher))}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(getVoucherStatus(voucher))}`}>
                        CLAIMED
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Value</p>
                        <p className="text-sm font-bold text-green-600">{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Claimed on</p>
                        <p className="text-sm font-bold" style={{color: '#36454F'}}>
                          {voucher.assigned_at ? new Date(voucher.assigned_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* View QR Code Button - Only for claimed vouchers */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedVoucher(voucher)
                      setShowQRCode(true)
                    }}
                    className="w-full py-2 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                    style={{backgroundColor: '#22C55E'}}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#16A34A'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#22C55E'}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>View QR Code</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redeemed Vouchers */}
        {!loading && !error && redeemedVouchers.length > 0 && (
          <div className="space-y-3 mb-4">
            <h2 className="text-lg font-black flex items-center" style={{color: '#36454F'}}>
              <Gift className="w-4 h-4 text-blue-500 mr-2" />
              Redeemed Vouchers ({redeemedVouchers.length})
            </h2>
            <div className="space-y-3">
              {redeemedVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="bg-white rounded-xl p-4 shadow-sm opacity-75" style={{border: '1px solid #E0E0E0'}}
                >
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl opacity-50">{getTypeIcon(voucher.type)}</div>
                      <div>
                        <h3 className="text-base font-black" style={{color: '#36454F'}}>{voucher.code}</h3>
                        <p className="text-sm" style={{color: '#8B8B8B'}}>{voucher.description || 'Discount voucher'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(getVoucherStatus(voucher))}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(getVoucherStatus(voucher))}`}>
                        REDEEMED
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Value</p>
                        <p className="text-sm font-bold text-blue-600">{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Redeemed on</p>
                        <p className="text-sm font-bold" style={{color: '#36454F'}}>
                          {voucher.assigned_at ? new Date(voucher.assigned_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* No QR Code button for redeemed vouchers */}
                  <div className="text-center py-2 text-gray-500 text-sm">
                    This voucher has been redeemed
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired Vouchers */}
        {!loading && !error && expiredVouchers.length > 0 && (
          <div className="space-y-3 mb-4">
            <h2 className="text-lg font-black flex items-center" style={{color: '#36454F'}}>
              <XCircle className="w-4 h-4 text-red-500 mr-2" />
              Expired Vouchers ({expiredVouchers.length})
            </h2>
            <div className="space-y-3">
              {expiredVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="bg-white rounded-xl p-4 shadow-sm opacity-50" style={{border: '1px solid #E0E0E0'}}
                >
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl opacity-50">{getTypeIcon(voucher.type)}</div>
                      <div>
                        <h3 className="text-base font-black" style={{color: '#36454F'}}>{voucher.code}</h3>
                        <p className="text-sm" style={{color: '#8B8B8B'}}>{voucher.description || 'Discount voucher'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(getVoucherStatus(voucher))}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(getVoucherStatus(voucher))}`}>
                        {getVoucherStatus(voucher).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Value</p>
                        <p className="text-sm font-bold text-red-600">{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-3 h-3 text-red-500" />
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Used on</p>
                        <p className="text-sm font-bold" style={{color: '#36454F'}}>
                          {voucher.used_at ? new Date(voucher.used_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* No QR Code button for expired vouchers */}
                  <div className="text-center py-2 text-red-500 text-sm">
                    This voucher has expired
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && claimedVouchers.length === 0 && redeemedVouchers.length === 0 && expiredVouchers.length === 0 && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#F68B24', opacity: 0.1}}>
              <Ticket className="w-8 h-8" style={{color: '#F68B24'}} />
            </div>
            <h3 className="text-lg font-black mb-3" style={{color: '#36454F'}}>
              No Vouchers Yet
            </h3>
            <p className="text-sm max-w-md mx-auto mb-4" style={{color: '#8B8B8B'}}>
              Your redeemed vouchers will appear here. Click "Claim New Voucher" above to redeem a voucher code.
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
    voucherId: voucher.id,
    code: voucher.code,
    username: getUsername(),
    value: voucher.value,
    expiresAt: voucher.expires_at,
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

  return <canvas ref={qrRef} className="rounded-xl" />
}

export default VoucherManagement