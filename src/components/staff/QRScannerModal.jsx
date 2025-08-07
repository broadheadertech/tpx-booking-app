import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { QrCode, Camera, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

const QRScannerModal = ({ isOpen, onClose, onVoucherScanned }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)

  // Mock QR scanner simulation
  const simulateQRScan = () => {
    setIsScanning(true)
    setError(null)
    setScanResult(null)

    // Simulate scanning delay
    setTimeout(() => {
      const mockVouchers = [
        { code: 'SAVE20', customer: 'John Doe', value: '₱1,000', status: 'active', expires: '2024-12-31' },
        { code: 'FIRST10', customer: 'Jane Smith', value: '₱500', status: 'active', expires: '2024-11-15' },
        { code: 'WELCOME15', customer: 'Mike Johnson', value: '₱750', status: 'expired', expires: '2024-01-15' },
        { code: 'INVALID', customer: 'Unknown', value: '₱100', status: 'redeemed', expires: '2024-06-30' }
      ]

      // Randomly select a voucher or show error
      const randomChoice = Math.random()
      
      if (randomChoice < 0.1) {
        // 10% chance of scan error
        setError('Could not read QR code. Please try again.')
        setScanResult(null)
      } else {
        const selectedVoucher = mockVouchers[Math.floor(Math.random() * mockVouchers.length)]
        setScanResult(selectedVoucher)
        
        if (selectedVoucher.status === 'active') {
          onVoucherScanned(selectedVoucher)
        }
      }
      
      setIsScanning(false)
    }, 2000)
  }

  const handleClose = () => {
    setIsScanning(false)
    setScanResult(null)
    setError(null)
    onClose()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100 border-green-200'
      case 'expired': return 'text-red-700 bg-red-100 border-red-200'
      case 'redeemed': return 'text-gray-700 bg-gray-100 border-gray-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'expired': 
      case 'redeemed': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <XCircle className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="QR Code Scanner" size="md">
      <div className="text-center space-y-6">
        {/* Scanner Area */}
        <div className="relative bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-3xl p-8 h-80 flex flex-col items-center justify-center">
          {isScanning ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-32 h-32 border-4 border-[#FF8C42] rounded-2xl animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="w-12 h-12 text-[#FF8C42] animate-spin" />
                </div>
              </div>
              <p className="text-white font-bold text-lg">Scanning QR Code...</p>
              <div className="w-48 bg-white/20 rounded-full h-2">
                <div className="bg-[#FF8C42] h-2 rounded-full animate-pulse w-full" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32 border-4 border-white/30 rounded-2xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-white/60" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg mb-2">Ready to Scan</p>
                <p className="text-white/70 text-sm">Position QR code within the frame</p>
              </div>
            </div>
          )}
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div className="bg-white border-2 border-[#F5F5F5] rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getStatusIcon(scanResult.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-[#1A1A1A] font-mono">
                    {scanResult.code}
                  </h3>
                  <span className={`px-3 py-1 text-sm font-bold rounded-full border-2 uppercase ${getStatusColor(scanResult.status)}`}>
                    {scanResult.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <p><span className="font-bold text-[#6B6B6B]">Customer:</span> {scanResult.customer}</p>
                  <p><span className="font-bold text-[#6B6B6B]">Value:</span> <span className="text-[#FF8C42] font-black">{scanResult.value}</span></p>
                  <p><span className="font-bold text-[#6B6B6B]">Expires:</span> {scanResult.expires}</p>
                </div>
                
                {scanResult.status === 'active' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-800 font-bold text-sm">✓ Voucher is valid and ready to redeem!</p>
                  </div>
                )}
                
                {scanResult.status === 'expired' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-800 font-bold text-sm">✗ This voucher has expired</p>
                  </div>
                )}
                
                {scanResult.status === 'redeemed' && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-gray-800 font-bold text-sm">✗ This voucher has already been redeemed</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <XCircle className="w-6 h-6 text-red-600" />
              <p className="text-red-800 font-bold">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4 border-t border-[#F5F5F5]">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white"
            disabled={isScanning}
          >
            Close
          </Button>
          <Button
            onClick={simulateQRScan}
            className="flex-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg flex items-center justify-center space-x-2"
            disabled={isScanning}
          >
            <Camera className="w-5 h-5" />
            <span>{isScanning ? 'Scanning...' : 'Start Scanning'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default QRScannerModal