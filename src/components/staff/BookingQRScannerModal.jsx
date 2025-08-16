import React, { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import QRScannerCamera from './QRScannerCamera'
import { QrCode, CheckCircle, XCircle, RefreshCw, Calendar, User, Clock } from 'lucide-react'

const BookingQRScannerModal = ({ isOpen, onClose, onBookingScanned }) => {
  console.log('BookingQRScannerModal render - isOpen:', isOpen)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessingBooking, setIsProcessingBooking] = useState(false)

  const handleQRDetected = async (qrData) => {
    console.log('Booking QR Data:', qrData)
    try {
      setIsProcessingBooking(true)
      setError(null)
      
      // Parse QR data to extract booking information
      let bookingData = null
      
      if (qrData.startsWith('{')) {
        try {
          bookingData = JSON.parse(qrData)
          console.log('Parsed booking data:', bookingData)
        } catch {
          setError('Invalid QR code format.')
          return
        }
      } else {
        setError('Invalid QR code format. Expected JSON data.')
        return
      }
      
      if (!bookingData.bookingId) {
        setError('Missing booking ID in QR code.')
        return
      }

      // Display booking data directly from QR code (no API fetch)
      const bookingResult = {
        id: bookingData.bookingId,
        booking_code: bookingData.bookingCode || 'N/A',
        customer: 'Customer', // Will be populated after validation
        service: bookingData.service || 'N/A',
        date: bookingData.date || 'N/A',
        time: bookingData.time || 'N/A',
        staff: bookingData.barber || 'N/A',
        status: 'scanned', // Initial status before validation
        phone: 'N/A',
        barbershop: bookingData.barbershop || 'N/A'
      }

      setScanResult(bookingResult)
      
      // Don't call onBookingScanned here - only call it after manual validation
      // await onBookingScanned(bookingResult)

    } catch (error) {
      console.error('Error processing booking QR code:', error)
      setError('Failed to process booking QR code. Please try again.')
    } finally {
      setIsProcessingBooking(false)
    }
  }

  const handleValidateAndConfirm = async () => {
    if (!scanResult || !scanResult.id) {
      setError('No booking to validate.')
      return
    }

    try {
      setIsProcessingBooking(true)
      setError(null)

      // Use API service to update booking status
      const apiService = (await import('../../services/api.js')).default
      
      // PATCH /api/bookings/{id}/ with status: "confirmed"
      const response = await apiService.patch(`/bookings/${scanResult.id}/`, {
        status: 'confirmed'
      })

      console.log('Booking confirmed:', response)

      // Update the scan result with confirmed status
      const updatedResult = {
        ...scanResult,
        status: 'confirmed'
      }
      
      setScanResult(updatedResult)
      
      // Show success message
      setError(null)
      
    } catch (error) {
      console.error('Error confirming booking:', error)
      setError('Failed to confirm booking. Please try again.')
    } finally {
      setIsProcessingBooking(false)
    }
  }

  const handleClose = () => {
    setScanResult(null)
    setError(null)
    setIsProcessingBooking(false)
    onClose()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-700 bg-green-100 border-green-200'
      case 'pending': return 'text-yellow-700 bg-yellow-100 border-yellow-200'
      case 'completed': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'cancelled': return 'text-red-700 bg-red-100 border-red-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': 
      case 'pending': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'completed': return <CheckCircle className="w-5 h-5 text-blue-600" />
      case 'cancelled':
      case 'invalid': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <XCircle className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Booking QR Scanner" size="lg">
      <div className="space-y-6">
        {/* Camera Scanner */}
        <QRScannerCamera
          onQRDetected={handleQRDetected}
          onClose={handleClose}
          isOpen={isOpen}
          title="Booking Scanner"
        />

        {/* Processing Indicator */}
        {isProcessingBooking && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-3">
              <RefreshCw className="w-6 h-6 text-[#FF8C42] animate-spin" />
              <span className="text-[#6B6B6B] font-medium">Processing booking...</span>
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
                    {scanResult.id}
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
                        <span className="font-bold text-[#6B6B6B] text-sm">Customer:</span>
                        <p className="text-[#1A1A1A] font-semibold">{scanResult.customer}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <QrCode className="w-4 h-4 text-[#6B6B6B]" />
                      <div>
                        <span className="font-bold text-[#6B6B6B] text-sm">Service:</span>
                        <p className="text-[#1A1A1A] font-semibold">{scanResult.service}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-[#6B6B6B]" />
                      <div>
                        <span className="font-bold text-[#6B6B6B] text-sm">Date & Time:</span>
                        <p className="text-[#1A1A1A] font-semibold">{scanResult.date} at {scanResult.time}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <User className="w-4 h-4 text-[#6B6B6B]" />
                      <div>
                        <span className="font-bold text-[#6B6B6B] text-sm">Staff:</span>
                        <p className="text-[#1A1A1A] font-semibold">{scanResult.staff}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {scanResult.phone !== 'N/A' && (
                  <div className="mt-4 pt-3 border-t border-[#F5F5F5]">
                    <span className="font-bold text-[#6B6B6B] text-sm">Phone:</span>
                    <p className="text-[#1A1A1A] font-semibold">{scanResult.phone}</p>
                  </div>
                )}
                
                {scanResult.status === 'confirmed' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-800 font-bold text-sm">✓ Booking confirmed - Ready for service!</p>
                  </div>
                )}
                
                {scanResult.status === 'pending' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-yellow-800 font-bold text-sm">⏳ Confirming booking...</p>
                  </div>
                )}
                
                {scanResult.status === 'in_progress' && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-blue-800 font-bold text-sm">🔄 Customer checked in - Service in progress</p>
                  </div>
                )}
                
                {scanResult.status === 'completed' && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-gray-800 font-bold text-sm">✓ This booking has already been completed</p>
                  </div>
                )}
                
                {scanResult.status === 'cancelled' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-800 font-bold text-sm">✗ This booking has been cancelled</p>
                  </div>
                )}
                
                {scanResult.status === 'scanned' && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-blue-800 font-bold text-sm">📱 Booking scanned - Ready to validate</p>
                  </div>
                )}
                
                {scanResult.status === 'invalid' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-800 font-bold text-sm">✗ Invalid booking QR code</p>
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
              onClick={handleValidateAndConfirm}
              className="px-8 bg-[#F68B24] hover:bg-[#E67A1A] text-white font-semibold"
              disabled={isProcessingBooking}
            >
              {isProcessingBooking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validate & Confirm Booking
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-8 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white"
            disabled={isProcessingBooking}
          >
            Return to Selection
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default BookingQRScannerModal
