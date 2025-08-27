import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import QRScannerCamera from './QRScannerCamera'
import { QrCode, Camera, CheckCircle, XCircle, RefreshCw, Gift, Calendar, User, DollarSign } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const QRScannerModal = ({ isOpen, onClose, onVoucherScanned }) => {
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessingVoucher, setIsProcessingVoucher] = useState(false)
  const [voucherData, setVoucherData] = useState(null)

  // Convex mutation
  const redeemVoucherMutation = useMutation(api.services.vouchers.redeemVoucher)

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
          const errorMessage = 'Invalid QR code format.'
          setError(errorMessage)
          setIsProcessingVoucher(false)
          return { error: errorMessage }
        }
      } else {
        // Treat as plain voucher code
        voucherInfo = { code: qrData }
      }
      
      if (!voucherInfo.code) {
        const errorMessage = 'Missing voucher code in QR data.'
        setError(errorMessage)
        setIsProcessingVoucher(false)
        return { error: errorMessage }
      }

      // Parse and display voucher data without immediate API validation
      // Staff will validate during the redeem process
      console.log('Parsed voucher info:', voucherInfo)
      
      const voucherResult = {
        id: voucherInfo.voucherId || 'N/A',
        code: voucherInfo.code,
        value: voucherInfo.value || 'N/A',
        expires_at: voucherInfo.expires_at || 'N/A',
        user: voucherInfo.user || voucherInfo.username || 'N/A',
        redeemed: voucherInfo.redeemed || false,
        status: voucherInfo.redeemed ? 'redeemed' : 'scanned',
        type: voucherInfo.type || 'voucher',
        brand: voucherInfo.brand || 'TPX Barbershop'
      }
      
      console.log('Created voucher result:', voucherResult)

      setScanResult(voucherResult)
      setVoucherData(voucherInfo)
      setIsProcessingVoucher(false)
      return { success: true, data: voucherResult }

    } catch (err) {
      console.error('Error processing QR code:', err)
      const errorMessage = 'Failed to process QR code. Please try again.'
      setError(errorMessage)
      setIsProcessingVoucher(false)
      return { error: errorMessage }
    }
  }

  // Handle voucher assignment (single-step process)
  const handleValidateAndRedeem = async () => {
    if (!scanResult || !scanResult.code) {
      setError('No voucher to validate.')
      return
    }

    try {
      setIsProcessingVoucher(true)
      setError(null)

      // Prepare voucher redemption data
      const redemptionData = {
        code: scanResult.code
      }

      // Only add user information if we have a valid user from the QR code
      if (scanResult.user && scanResult.user !== 'N/A' && scanResult.user.trim()) {
        redemptionData.redeemed_by = scanResult.user
      }

      console.log('Attempting voucher redemption with:', redemptionData)
      const redeemResponse = await redeemVoucherMutation(redemptionData)
      console.log('Voucher redemption response:', redeemResponse)

      // Check if the response indicates success
      if (redeemResponse.success || redeemResponse.value) {
        // Update the scan result based on redemption response
        const updatedResult = {
          ...scanResult,
          status: 'redeemed', // Set to redeemed after successful redemption
          value: redeemResponse.value || scanResult.value,
          user: scanResult.user
        }
        
        setScanResult(updatedResult)
        setError('') // Clear any errors on success
      } else {
        // Handle case where response doesn't indicate success
        throw new Error('Voucher redemption failed - no success indicator in response')
      }
      
    } catch (error) {
      console.error('Error processing voucher:', error)
      let errorMessage = 'Failed to process voucher. Please try again.'
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }
      
      // Handle specific error cases based on API documentation
      if (errorMessage.includes('expired') || errorMessage.includes('Voucher has expired')) {
        errorMessage = 'This voucher has expired and cannot be assigned.'
      } else if (errorMessage.includes('Invalid voucher code')) {
        errorMessage = 'Invalid voucher code. Please verify the QR code.'
      } else if (errorMessage.includes('Target user not found')) {
        errorMessage = 'Target user not found. Please check the username.'
      } else if (errorMessage.includes('already assigned') || errorMessage.includes('Voucher already assigned')) {
        errorMessage = 'This voucher has already been assigned to the user.'
      } else if (errorMessage.includes('Voucher code is required')) {
        errorMessage = 'Voucher code is missing. Please scan a valid QR code.'
      }
      
      setError(errorMessage)
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
      case 'assigned': return 'text-emerald-700 bg-emerald-100 border-emerald-200'
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
      case 'assigned': return <CheckCircle className="w-5 h-5 text-emerald-600" />
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
                
                {scanResult.status === 'assigned' && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-emerald-800 font-bold text-sm">✓ Voucher assigned successfully!</p>
                  </div>
                )}
                
                {scanResult.status === 'scanned' && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-blue-800 font-bold text-sm">📱 Voucher scanned - Ready to redeem</p>
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
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Redeem Voucher
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