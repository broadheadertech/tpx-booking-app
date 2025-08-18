import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import QRScannerCamera from './QRScannerCamera'
import { QrCode, Camera, CheckCircle, XCircle, RefreshCw, Gift, Calendar, User, DollarSign } from 'lucide-react'

const QRScannerModal = ({ isOpen, onClose, onVoucherScanned }) => {
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessingVoucher, setIsProcessingVoucher] = useState(false)
  const [voucherData, setVoucherData] = useState(null)

  const handleQRDetected = async (qrData) => {
    console.log('Voucher QR Data:', qrData)
    try {
      setIsProcessingVoucher(true)
      setError(null)
      
      // Parse QR data to extract voucher information
      let voucherInfo = null
      
      if (qrData.startsWith('{')) {
        try {
          voucherInfo = JSON.parse(qrData)
          console.log('Parsed voucher data:', voucherInfo)
        } catch {
          setError('Invalid QR code format.')
          setIsProcessingVoucher(false)
          return
        }
      } else {
        // Treat as plain voucher code
        voucherInfo = { code: qrData }
      }
      
      if (!voucherInfo.code) {
        setError('Missing voucher code in QR data.')
        setIsProcessingVoucher(false)
        return
      }

      // Display voucher data directly from QR code (no API fetch initially)
      const voucherResult = {
        id: voucherInfo.voucherId || 'N/A',
        code: voucherInfo.code,
        value: voucherInfo.value || 'N/A',
        expires_at: voucherInfo.expires_at || 'N/A',
        user: voucherInfo.user || voucherInfo.username || 'N/A',
        redeemed: voucherInfo.redeemed || false,
        status: 'scanned', // Initial status before validation
        type: voucherInfo.type || 'voucher',
        brand: voucherInfo.brand || 'TPX Barbershop'
      }

      setScanResult(voucherResult)
       setVoucherData(voucherInfo)
       setIsProcessingVoucher(false)
    } catch (err) {
      console.error('Error processing QR code:', err)
      setError('Failed to process QR code. Please try again.')
    } finally {
      setIsProcessingVoucher(false)
    }
  }

  // Handle voucher validation and redemption
  const handleValidateAndRedeem = async () => {
    if (!scanResult || !scanResult.code) {
      setError('No voucher to validate.')
      return
    }

    try {
      setIsProcessingVoucher(true)
      setError(null)

      // Use API service to redeem voucher
      const apiService = (await import('../../services/api.js')).default
        
      // POST /api/vouchers/redeem/ with voucher code and username
      const response = await apiService.post('/vouchers/redeem/', {
        code: scanResult.code,
        username: scanResult.user
      })

      console.log('Voucher redeemed:', response)

      // Update the scan result based on API response
      const updatedResult = {
        ...scanResult,
        status: response.status === 'already claimed' ? 'redeemed' : 'redeemed',
        value: response.value || scanResult.value,
        user: response.username || scanResult.user
      }
      
      setScanResult(updatedResult)
      
      // Show appropriate success message based on status
      if (response.status === 'already claimed') {
        setError('This voucher has already been claimed by this user.')
      } else {
        setError('')
      }
      
    } catch (error) {
      console.error('Error redeeming voucher:', error)
      if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError('Failed to redeem voucher. Please try again.')
      }
    } finally {
      setIsProcessingVoucher(false)
    }
  }

  const handleClose = () => {
    setScanResult(null)
    setError(null)
    setIsProcessingVoucher(false)
    setVoucherData(null)
    onClose()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'redeemed': return 'text-green-700 bg-green-100 border-green-200'
      case 'scanned': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'expired': return 'text-red-700 bg-red-100 border-red-200'
      case 'used_up': return 'text-orange-700 bg-orange-100 border-orange-200'
      case 'invalid': return 'text-red-700 bg-red-100 border-red-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'redeemed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'scanned': return <QrCode className="w-5 h-5 text-blue-600" />
      case 'expired': 
      case 'used_up':
      case 'invalid': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <XCircle className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Voucher QR Scanner" size="lg">
      <div className="space-y-6">
        {/* Camera Scanner */}
        <QRScannerCamera
          onQRDetected={handleQRDetected}
          onClose={handleClose}
          isOpen={isOpen}
          title="Voucher Scanner"
        />

        {/* Processing Indicator */}
        {isProcessingVoucher && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-3">
              <RefreshCw className="w-6 h-6 text-[#FF8C42] animate-spin" />
              <span className="text-[#6B6B6B] font-medium">Processing voucher...</span>
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className="bg-white border-2 border-[#F5F5F5] rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getStatusIcon(scanResult.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-[#1A1A1A] font-mono">
                    {scanResult.code}
                  </h3>
                  <span className={`px-3 py-1 text-sm font-bold rounded-full border-2 uppercase ${getStatusColor(scanResult.status)}`}>
                    {scanResult.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="w-4 h-4 text-[#6B6B6B]" />
                      <div>
                        <span className="font-bold text-[#6B6B6B] text-sm">User:</span>
                        <p className="text-[#1A1A1A] font-semibold">{scanResult.user}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-4 h-4 text-[#6B6B6B]" />
                      <div>
                        <span className="font-bold text-[#6B6B6B] text-sm">Value:</span>
                        <p className="text-[#FF8C42] font-black text-lg">₱{scanResult.value}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-[#6B6B6B]" />
                      <div>
                        <span className="font-bold text-[#6B6B6B] text-sm">Expires:</span>
                        <p className="text-[#1A1A1A] font-semibold">{new Date(scanResult.expires_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Gift className="w-4 h-4 text-[#6B6B6B]" />
                      <div>
                        <span className="font-bold text-[#6B6B6B] text-sm">Type:</span>
                        <p className="text-[#1A1A1A] font-semibold">{scanResult.type}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {scanResult.brand !== 'N/A' && (
                  <div className="mt-4 pt-3 border-t border-[#F5F5F5]">
                    <span className="font-bold text-[#6B6B6B] text-sm">Brand:</span>
                    <p className="text-[#1A1A1A] font-semibold">{scanResult.brand}</p>
                  </div>
                )}
                
                {/* Status Messages */}
                {scanResult.status === 'redeemed' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-800 font-bold text-sm">✓ Voucher redeemed successfully!</p>
                  </div>
                )}
                
                {scanResult.status === 'scanned' && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-blue-800 font-bold text-sm">📱 Voucher scanned - Ready to validate and redeem</p>
                  </div>
                )}
                
                {scanResult.status === 'expired' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-800 font-bold text-sm">✗ This voucher has expired</p>
                  </div>
                )}
                
                {scanResult.status === 'used_up' && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <p className="text-orange-800 font-bold text-sm">✗ This voucher has reached its usage limit</p>
                  </div>
                )}
                
                {scanResult.status === 'invalid' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-800 font-bold text-sm">✗ Invalid voucher code</p>
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
        <div className="flex justify-center space-x-4 pt-4 border-t border-[#F5F5F5]">
          {scanResult && scanResult.status === 'scanned' && (
            <Button
              onClick={handleValidateAndRedeem}
              className="px-8 bg-[#F68B24] hover:bg-[#E67A1A] text-white font-semibold"
              disabled={isProcessingVoucher}
            >
              {isProcessingVoucher ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validate & Redeem Voucher
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-8 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white"
            disabled={isProcessingVoucher}
          >
            Return to Selection
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default QRScannerModal