import React, { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useBranding } from '../../context/BrandingContext'
import { useAppModal } from '../../context/AppModalContext'
import {
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  Scissors,
  CreditCard,
  RotateCcw,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Phone,
  Navigation,
  MessageCircle,
  Star,
  QrCode,
  Copy,
  Check,
} from 'lucide-react'
import QRCode from 'qrcode'

/**
 * BookingDetailModal - Full booking details with actions
 */
const BookingDetailModal = ({ booking, onClose, onRebook, onCancel }) => {
  const { branding } = useBranding()
  const { showAlert } = useAppModal()
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showFullscreenQR, setShowFullscreenQR] = useState(false)

  const cancelBooking = useMutation(api.services.bookings.cancelBooking)

  // Generate QR code
  useEffect(() => {
    if (booking?._id) {
      QRCode.toDataURL(booking._id, {
        width: 200,
        margin: 2,
        color: { dark: '#ffffff', light: '#00000000' }
      }).then(url => setQrCodeUrl(url))
    }
  }, [booking?._id])

  if (!booking) return null

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const statusConfig = {
    booked: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Confirmed' },
    pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Pending' },
    completed: { icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Completed' },
    cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelled' },
  }

  const status = statusConfig[booking.status] || statusConfig.pending
  const StatusIcon = status.icon

  const isUpcoming = ['booked', 'pending'].includes(booking.status)
  const canCancel = isUpcoming && booking.status !== 'cancelled'
  const canRebook = booking.status === 'completed' || booking.status === 'cancelled'

  const handleCopyId = () => {
    navigator.clipboard.writeText(booking._id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await cancelBooking({ bookingId: booking._id })
      onCancel?.(booking)
      onClose()
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      showAlert({ title: 'Cancellation Failed', message: 'Failed to cancel booking. Please try again.', type: 'error' })
    } finally {
      setCancelling(false)
      setShowCancelConfirm(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0A0A0A] rounded-t-3xl sm:rounded-3xl border border-[#2A2A2A]">
        {/* Header with gradient */}
        <div
          className="relative p-6 pb-16 rounded-t-3xl sm:rounded-t-3xl"
          style={{
            background: `linear-gradient(135deg, ${branding?.primary_color || '#F68B24'}40, ${branding?.accent_color || '#F68B24'}40)`
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/30 rounded-full hover:bg-black/50 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 ${status.bg} px-4 py-2 rounded-full`}>
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className={`font-semibold ${status.color}`}>{status.label}</span>
          </div>

          {/* Service Name */}
          <h2 className="text-2xl font-bold text-white mt-4">
            {booking.service?.name || 'Service'}
          </h2>
        </div>

        {/* QR Code Card (overlapping) */}
        <div className="relative -mt-12 mx-6 mb-4">
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Booking Reference</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-white font-mono">
                  {booking._id?.slice(-8).toUpperCase()}
                </code>
                <button
                  onClick={handleCopyId}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
            {qrCodeUrl && (
              <button
                onClick={() => setShowFullscreenQR(true)}
                className="relative group"
                title="Tap to enlarge QR code"
              >
                <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-active:bg-black/30 rounded-lg flex items-center justify-center transition-all">
                  <QrCode className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Date & Time */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Date</span>
                </div>
                <p className="text-white font-semibold">{formatDate(booking.date)}</p>
              </div>
              <div className="w-px h-12 bg-[#2A2A2A]" />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Time</span>
                </div>
                <p className="text-white font-semibold">{formatTime(booking.time)}</p>
              </div>
            </div>
          </div>

          {/* Barber */}
          {booking.barber && (
            <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#2A2A2A] overflow-hidden">
                  {booking.barber.avatar ? (
                    <img
                      src={booking.barber.avatar}
                      alt={booking.barber.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Your Barber</p>
                  <p className="text-white font-semibold">{booking.barber.name}</p>
                  {booking.barber.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm text-gray-400">{booking.barber.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Branch Location */}
          {booking.branch && (
            <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${branding?.primary_color || '#F68B24'}20` }}
                >
                  <MapPin className="w-5 h-5" style={{ color: branding?.primary_color || '#F68B24' }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Location</p>
                  <p className="text-white font-semibold">{booking.branch.name}</p>
                  {booking.branch.address && (
                    <p className="text-sm text-gray-400 mt-0.5">{booking.branch.address}</p>
                  )}
                </div>
                <button
                  className="p-2.5 bg-[#2A2A2A] rounded-xl hover:bg-[#3A3A3A] transition-colors"
                  onClick={() => {
                    if (booking.branch.address) {
                      window.open(`https://maps.google.com/?q=${encodeURIComponent(booking.branch.address)}`, '_blank')
                    }
                  }}
                >
                  <Navigation className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {/* Price Summary */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">Service Price</span>
              <span className="text-white">₱{(booking.final_price || booking.price || booking.service?.price || 0).toLocaleString()}</span>
            </div>
            {booking.booking_fee > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400">Booking Fee</span>
                <span className="text-white">₱{booking.booking_fee.toLocaleString()}</span>
              </div>
            )}
            {booking.discount_amount > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-green-400">Discount</span>
                <span className="text-green-400">-₱{booking.discount_amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
              <span className="text-white font-semibold">Total</span>
              <span className="text-xl font-bold" style={{ color: branding?.primary_color || '#F68B24' }}>
                ₱{(booking.final_price || (
                  (booking.price || booking.service?.price || 0) +
                  (booking.booking_fee || 0) -
                  (booking.discount_amount || 0)
                )).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">
                {booking.payment_status === 'paid' ? 'Paid' : 'Payment pending'}
              </span>
            </div>

            {/* Payment history note when price was updated at POS */}
            {booking.amount_paid > 0 && (booking.final_price || booking.price || 0) > booking.amount_paid && (
              <div className="mt-3 p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] space-y-1.5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment History</p>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-400">Online Payment</span>
                  <span className="text-blue-400">₱{booking.amount_paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-400">Paid at Shop</span>
                  <span className="text-green-400">₱{((booking.final_price || booking.price || 0) - booking.amount_paid).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {canRebook && (
              <button
                onClick={() => onRebook?.(booking)}
                className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${branding?.primary_color || '#F68B24'}, ${branding?.accent_color || '#F68B24'})`
                }}
              >
                <RotateCcw className="w-5 h-5" />
                Book Again
              </button>
            )}

            {canCancel && !showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-4 rounded-2xl font-semibold text-red-400 bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-2 transition-all hover:bg-red-500/20"
              >
                <XCircle className="w-5 h-5" />
                Cancel Booking
              </button>
            )}

            {showCancelConfirm && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold">Cancel this booking?</p>
                    <p className="text-sm text-gray-400 mt-1">This action cannot be undone. Any payments may be subject to our refund policy.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-3 rounded-xl font-medium text-gray-400 bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-colors"
                    disabled={cancelling}
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {cancelling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      'Yes, Cancel'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Contact Branch */}
            {booking.branch?.phone && (
              <button
                onClick={() => window.open(`tel:${booking.branch.phone}`, '_self')}
                className="w-full py-4 rounded-2xl font-medium text-gray-300 bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center gap-2 hover:bg-[#2A2A2A] transition-colors"
              >
                <Phone className="w-5 h-5" />
                Contact Branch
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen QR Modal */}
      {showFullscreenQR && qrCodeUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={() => setShowFullscreenQR(false)}
        >
          <div className="relative flex flex-col items-center p-6">
            {/* Close hint */}
            <p className="text-gray-400 text-sm mb-6">Tap anywhere to close</p>

            {/* Large QR Code */}
            <div
              className="bg-white p-6 rounded-3xl shadow-2xl"
              style={{
                boxShadow: `0 0 60px ${branding?.primary_color || '#F68B24'}40`
              }}
            >
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-64 h-64"
                style={{ filter: 'invert(1)' }}
              />
            </div>

            {/* Booking reference */}
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-xs mb-1">Booking Reference</p>
              <p
                className="text-2xl font-bold font-mono"
                style={{ color: branding?.primary_color || '#F68B24' }}
              >
                {booking._id?.slice(-8).toUpperCase()}
              </p>
            </div>

            {/* Instructions */}
            <p className="text-gray-500 text-sm mt-4 text-center max-w-xs">
              Show this QR code to the staff when you arrive for your appointment
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingDetailModal
