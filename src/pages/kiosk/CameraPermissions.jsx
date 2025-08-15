import { useState } from 'react'

// Camera permission utilities
export const useCameraPermissions = () => {
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false)
  const [requestingPermission, setRequestingPermission] = useState(false)

  // Check camera permissions
  const checkCameraPermissions = async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' })
        return permission.state === 'granted'
      }
      return true // Assume granted if permissions API not available
    } catch (error) {
      console.log('Permissions API not available:', error)
      return true
    }
  }

  // Get optimal camera constraints for mobile
  const getMobileOptimizedConstraints = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      return {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      }
    } else {
      return {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      }
    }
  }

  // Request camera permissions with fallback constraints
  const requestCameraPermission = async () => {
    setRequestingPermission(true)
    setCameraPermissionDenied(false)
    
    try {
      let stream = null
      
      // Try with optimal constraints first
      try {
        stream = await navigator.mediaDevices.getUserMedia(getMobileOptimizedConstraints())
      } catch (constraintError) {
        console.log('Optimal constraints failed, trying fallback:', constraintError)
        
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { min: 320, ideal: 640 },
            height: { min: 240, ideal: 480 }
          },
          audio: false
        })
      }
      
      // Stop the stream immediately as we just needed to get permission
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      
      setRequestingPermission(false)
      return true
    } catch (error) {
      console.error('Camera permission denied:', error)
      setRequestingPermission(false)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraPermissionDenied(true)
        return { error: 'Camera access denied. Please allow camera permissions and refresh the page.' }
      } else if (error.name === 'NotFoundError') {
        return { error: 'No camera found on this device.' }
      } else if (error.name === 'OverconstrainedError') {
        return { error: 'Camera constraints not supported. Please try a different device.' }
      } else {
        return { error: 'Camera access failed. Please check your device settings.' }
      }
    }
  }

  return {
    cameraPermissionDenied,
    setCameraPermissionDenied,
    requestingPermission,
    setRequestingPermission,
    checkCameraPermissions,
    requestCameraPermission
  }
}

// Camera Permission Denied UI Component
export const CameraPermissionDenied = ({ onRetry }) => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="text-center text-white p-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#F44336'}}>
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold mb-2">Camera Access Required</h3>
      <p className="text-sm mb-4 opacity-90">
        This kiosk needs camera access to scan QR codes. Please:
      </p>
      <div className="text-left text-sm mb-6 space-y-2 opacity-90">
        <p>1. Click the camera icon in your browser's address bar</p>
        <p>2. Select "Allow" for camera access</p>
        <p>3. Refresh this page</p>
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-white text-black font-bold rounded-xl transition-colors duration-200 hover:bg-gray-100"
      >
        Try Again
      </button>
    </div>
  </div>
)

// Camera Loading State Component
export const CameraLoadingState = ({ requestingPermission }) => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="text-center text-white">
      <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderColor: '#F68B24', borderTopColor: 'transparent'}}></div>
      <p className="text-lg font-medium">
        {requestingPermission ? 'Requesting Camera Access...' : 'Initializing Camera...'}
      </p>
      <p className="text-sm mt-2" style={{color: '#F68B24', opacity: 0.8}}>
        {requestingPermission ? 'Please allow camera access in the popup' : 'Please allow camera access'}
      </p>
    </div>
  </div>
)
