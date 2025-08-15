import { useRef, useEffect } from 'react'
import QrScanner from 'qr-scanner'
import { useCameraPermissions, CameraPermissionDenied, CameraLoadingState } from './CameraPermissions.jsx'

const QRScannerCamera = ({ 
  onQRDetected, 
  scannerError, 
  setScannerError, 
  showCamera, 
  setShowCamera 
}) => {
  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)
  
  const {
    cameraPermissionDenied,
    setCameraPermissionDenied,
    requestingPermission,
    checkCameraPermissions,
    requestCameraPermission
  } = useCameraPermissions()

  // Get mobile-optimized QR scanner settings
  const getMobileQRSettings = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      return {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
        maxScansPerSecond: 3, // Lower for mobile performance
        calculateScanRegion: (video) => {
          // Custom scan region for mobile - center square
          const smallerDimension = Math.min(video.videoWidth, video.videoHeight)
          const scanSize = Math.floor(smallerDimension * 0.6)
          const x = Math.floor((video.videoWidth - scanSize) / 2)
          const y = Math.floor((video.videoHeight - scanSize) / 2)
          return { x, y, width: scanSize, height: scanSize }
        }
      }
    } else {
      return {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
        maxScansPerSecond: 5
      }
    }
  }

  // Start Camera with mobile optimization
  const startCamera = async () => {
    try {
      if (!videoRef.current) return

      // Check if we have permission first
      const hasPermission = await checkCameraPermissions()
      if (!hasPermission) {
        const result = await requestCameraPermission()
        if (result?.error) {
          setScannerError(result.error)
          return
        }
      }

      // Set video element attributes for mobile
      const video = videoRef.current
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('muted', 'true')
      video.setAttribute('autoplay', 'true')
      
      // Prevent zoom on mobile
      video.style.touchAction = 'manipulation'

      qrScannerRef.current = new QrScanner(
        video,
        async (result) => {
          console.log('QR Code detected:', result.data)
          // Add haptic feedback on mobile
          if (navigator.vibrate) {
            navigator.vibrate(100)
          }
          await onQRDetected(result.data)
        },
        getMobileQRSettings()
      )
      
      await qrScannerRef.current.start()
      setShowCamera(true)
      setCameraPermissionDenied(false)
      setScannerError('')
    } catch (error) {
      console.error('Error starting camera:', error)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraPermissionDenied(true)
        setScannerError('Camera access denied. Please allow camera permissions in your browser settings.')
      } else if (error.name === 'NotFoundError') {
        setScannerError('No camera found on this device.')
      } else if (error.name === 'OverconstrainedError') {
        setScannerError('Camera settings not supported on this device. Please try a different browser.')
      } else {
        setScannerError('Failed to start camera. Please refresh the page and try again.')
      }
    }
  }

  // Stop Camera
  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current.destroy()
      qrScannerRef.current = null
    }
    setShowCamera(false)
  }

  // Auto-start camera on mount
  useEffect(() => {
    startCamera()
    
    return () => {
      stopCamera()
    }
  }, [])

  const handleRetry = async () => {
    setCameraPermissionDenied(false)
    setScannerError('')
    await startCamera()
  }

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        webkit-playsinline="true"
        muted
        autoPlay
        style={{ 
          touchAction: 'manipulation',
          WebkitTransform: 'translateZ(0)', // Hardware acceleration
          transform: 'translateZ(0)'
        }}
      />
      
      {/* Scanning Frame Overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-64 h-64 border-4 rounded-2xl relative" style={{borderColor: '#F68B24', opacity: 0.8}}>
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
        {!showCamera && !cameraPermissionDenied && (
          <CameraLoadingState requestingPermission={requestingPermission} />
        )}
        
        {/* Camera Permission Denied State */}
        {cameraPermissionDenied && (
          <CameraPermissionDenied onRetry={handleRetry} />
        )}
      </div>
    </div>
  )
}

export default QRScannerCamera
