import React, { useState, useRef, useEffect } from 'react'
import QrScanner from 'qr-scanner'
import { Camera, RotateCcw, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

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
  }

  const handleQRResult = async (result) => {
    if (isProcessing) return // Prevent multiple rapid scans
    
    setIsProcessing(true)
    setScanResult(result.data)
    
    // Add haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }

    try {
      // Pass the QR result to parent component
      await onQRDetected(result.data)
    } catch (error) {
      console.error('Error processing QR result:', error)
    }
    
    // Reset processing state after a delay
    setTimeout(() => {
      setIsProcessing(false)
      setScanResult(null)
    }, 2000)
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

        {/* Scan Result Overlay */}
        {scanResult && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 mx-4 max-w-sm">
              <div className="flex items-center space-x-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-bold text-[#1A1A1A]">QR Code Detected!</span>
              </div>
              <div className="text-sm text-[#6B6B6B] break-all">
                {scanResult}
              </div>
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
        <p className="text-blue-800 text-sm">
          <strong>Tips:</strong> Hold your device steady and ensure the QR code is well-lit and clearly visible within the scanning area.
        </p>
      </div>
    </div>
  )
}

export default QRScannerCamera
