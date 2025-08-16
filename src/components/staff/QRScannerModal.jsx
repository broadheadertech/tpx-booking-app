import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import QRScannerCamera from './QRScannerCamera'
import { QrCode, Camera, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

const QRScannerModal = ({ isOpen, onClose, onVoucherScanned }) => {
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessingVoucher, setIsProcessingVoucher] = useState(false)

  const handleQRDetected = async (qrData) => {
    try {
      setIsProcessingVoucher(true)
      setError(null)
      
      // Try to parse the QR data as a voucher code
      let voucherCode = qrData
      
      // If it's a URL or JSON, try to extract the voucher code
      if (qrData.startsWith('http')) {
        const url = new URL(qrData)
        voucherCode = url.searchParams.get('code') || url.pathname.split('/').pop()
      } else if (qrData.startsWith('{')) {
        try {
          const parsed = JSON.parse(qrData)
          voucherCode = parsed.code || parsed.voucher || qrData
        } catch {
          // Use original data if JSON parsing fails
        }
      }

      // Use actual voucher service to validate and redeem
      const { vouchersService } = await import('../../services/staff')
      
      try {
        // Get all vouchers and find the matching one
        const allVouchers = await vouchersService.getAllVouchers()
        const voucher = allVouchers.find(v => 
          v.code && v.code.toLowerCase() === voucherCode.toLowerCase()
        )

        if (!voucher) {
          setScanResult({
            code: voucherCode,
            customer: 'Unknown',
            value: '₱0',
            status: 'invalid',
            expires: 'N/A'
          })
          setError('Voucher code not found.')
          return
        }

        // Check voucher status
        const now = new Date()
        const expiresAt = new Date(voucher.expires_at)
        let status = 'active'
        
        if (voucher.redeemed) {
          status = 'redeemed'
        } else if (expiresAt < now) {
          status = 'expired'
        } else if (voucher.used_count >= voucher.max_uses) {
          status = 'used_up'
        }

        const voucherResult = {
          code: voucher.code,
          customer: voucher.customer_name || 'N/A',
          value: vouchersService.formatValue(voucher.value),
          status: status,
          expires: expiresAt.toLocaleDateString('en-PH'),
          description: voucher.description || 'Discount voucher'
        }

        setScanResult(voucherResult)

        // If voucher is valid, proceed with redemption
        if (status === 'active') {
          await onVoucherScanned(voucher.code, voucher.value)
        }

      } catch (apiError) {
        console.error('API Error:', apiError)
        setError('Failed to validate voucher. Please try again.')
      }
    } catch (err) {
      console.error('Error processing QR code:', err)
      setError('Failed to process QR code. Please try again.')
    } finally {
      setIsProcessingVoucher(false)
    }
  }

  const handleClose = () => {
    setScanResult(null)
    setError(null)
    setIsProcessingVoucher(false)
    onClose()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100 border-green-200'
      case 'expired': return 'text-red-700 bg-red-100 border-red-200'
      case 'redeemed': return 'text-gray-700 bg-gray-100 border-gray-200'
      case 'used_up': return 'text-orange-700 bg-orange-100 border-orange-200'
      case 'invalid': return 'text-red-700 bg-red-100 border-red-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'expired': 
      case 'redeemed':
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
        <div className="flex justify-center pt-4 border-t border-[#F5F5F5]">
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