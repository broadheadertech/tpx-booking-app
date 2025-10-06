import React, { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Search, Filter, Plus, Edit, Trash2, RotateCcw, Save, X, QrCode, CreditCard, Receipt, DollarSign, Eye, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import QRCode from 'qrcode'
import { createPortal } from 'react-dom'
import CreateBookingModal from './CreateBookingModal'

const BookingsManagement = ({ onRefresh, user }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [showQRCode, setShowQRCode] = useState(null)
  const [formData, setFormData] = useState({
    service: '',
    barber: '',
    date: '',
    time: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmModal, setConfirmModal] = useState({ show: false, booking: null, action: null })
  const [activeTab, setActiveTab] = useState('bookings')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const [sendSms, setSendSms] = useState(false)

  // Convex queries - use branch-scoped queries for staff, global for super_admin
  const bookings = user?.role === 'super_admin' 
    ? (useQuery(api.services.bookings.getAllBookings) || [])
    : user?.branch_id 
      ? (useQuery(api.services.bookings.getBookingsByBranch, { branch_id: user.branch_id }) || [])
      : []
      
  const services = user?.role === 'super_admin'
    ? (useQuery(api.services.services.getAllServices) || [])
    : user?.branch_id
      ? (useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id }) || [])
      : []
      
  const barbers = user?.role === 'super_admin'
    ? (useQuery(api.services.barbers.getActiveBarbers) || [])
    : user?.branch_id
      ? (useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id }) || []).filter(b => b.is_active)
      : []
  // Always call hooks in the same order to follow Rules of Hooks
  const bookingPayments = useQuery(api.services.bookings.getBookingPayments, { bookingId: selectedBooking?._id })
  const bookingTransactions = useQuery(api.services.bookings.getBookingTransactions, { bookingId: selectedBooking?._id })

  // Convex mutations
  const updateBookingStatus = useMutation(api.services.bookings.updateBooking)
  const deleteBookingMutation = useMutation(api.services.bookings.deleteBooking)
  const updatePaymentStatus = useMutation(api.services.bookings.updatePaymentStatus)

  const getStatusConfig = (status) => {
    switch (status) {
      case 'booked':
        return {
          label: 'Booked',
          icon: CheckCircle,
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          iconColor: 'text-blue-500'
        }
      case 'confirmed':
        return {
          label: 'Confirmed',
          icon: CheckCircle,
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          iconColor: 'text-green-500'
        }
      case 'completed':
        return {
          label: 'Completed',
          icon: CheckCircle,
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          iconColor: 'text-orange-500'
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: XCircle,
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          iconColor: 'text-red-500'
        }
      default: // pending
        return {
          label: 'Pending',
          icon: AlertCircle,
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          iconColor: 'text-orange-500'
        }
    }
  }

  const filteredBookings = bookings
    .filter(booking => {
      const serviceName = services.find(s => s._id === booking.service)?.name || ''
      const matchesSearch =
        serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.barber_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.booking_code || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === 'all' || booking.status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date + ' ' + a.time)
        const dateB = new Date(b.date + ' ' + b.time)
        return dateB - dateA
      }
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      if (sortBy === 'service') {
        const serviceA = services.find(s => s._id === a.service)?.name || ''
        const serviceB = services.find(s => s._id === b.service)?.name || ''
        return serviceA.localeCompare(serviceB)
      }
      return a._id.localeCompare(b._id)
    })

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    booked: bookings.filter(b => b.status === 'booked').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    today: bookings.filter(b => {
      const bookingDate = new Date(b.date).toDateString()
      const today = new Date().toDateString()
      return bookingDate === today
    }).length,
    paid: bookings.filter(b => (b.payment_status || 'unpaid') === 'paid').length,
    unpaid: bookings.filter(b => (b.payment_status || 'unpaid') === 'unpaid').length,
    refunded: bookings.filter(b => (b.payment_status || 'unpaid') === 'refunded').length
  }

  const resetForm = () => {
    setFormData({
      service: '',
      barber: '',
      date: '',
      time: ''
    })
    setError('')
  }

  const handleCreate = () => {
    setShowCreateModal(true)
  }

  const handleCreateBooking = async (newBooking) => {
    console.log('New booking created:', newBooking)
    onRefresh()
  }

  const handleEdit = (booking) => {
    setFormData({
      service: booking.service,
      barber: booking.barber || '',
      date: booking.date,
      time: booking.time && booking.time !== 'N/A' ? booking.time.slice(0, 5) : ''
    })
    setEditingBooking(booking)
    setIsCreating(false)
    setError('')
  }

  const handleCancel = () => {
    setEditingBooking(null)
    resetForm()
  }

  const handleSave = async () => {
    if (!formData.service || !formData.date || !formData.time) {
      setError('Service, date, and time are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const bookingData = {
        service: formData.service,
        date: formData.date,
        time: formData.time
      }

      // Only include barber if one is selected
      if (formData.barber) {
        bookingData.barber = formData.barber
      }

      if (editingBooking) {
        await updateBookingStatus({ id: editingBooking._id, ...bookingData })
      }

      handleCancel()
      onRefresh()
    } catch (err) {
      console.error('Error saving booking:', err)
      setError(err.message || 'Failed to save booking')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (booking) => {
    if (!confirm(`Are you sure you want to delete booking #${booking.booking_code || booking._id}?`)) return

    setLoading(true)
    try {
      await deleteBookingMutation({ id: booking._id })
      onRefresh()
    } catch (err) {
      console.error('Error deleting booking:', err)
      setError(err.message || 'Failed to delete booking')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (booking, newStatus) => {
    setLoading(true)
    try {
      await updateBookingStatus({ id: booking._id, status: newStatus })
      onRefresh()
    } catch (err) {
      console.error('Error updating booking status:', err)
      setError(err.message || 'Failed to update booking status')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmModal.booking || !confirmModal.action) return

    const { booking, action } = confirmModal
    const newStatus = action === 'confirm' ? 'confirmed' : 'completed'

    // Open SMS app with pre-filled message if checkbox is checked
    if (sendSms && booking.customer_phone) {
      const service = services.find(s => s._id === booking.service)
      const message = action === 'confirm'
        ? `Hi ${booking.customer_name || 'Customer'}! Your booking #${booking.booking_code} at TipunoX Barbershop has been confirmed for ${formatDate(booking.date)} at ${formatTime(booking.time)}. Service: ${service?.name}. See you soon!`
        : `Hi ${booking.customer_name || 'Customer'}! Your booking #${booking.booking_code} at TipunoX Barbershop has been completed. Thank you for choosing us!`

      // Create SMS link that works on both web and mobile
      const smsLink = `sms:${booking.customer_phone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(message)}`

      // Open SMS app
      window.location.href = smsLink
    }

    setConfirmModal({ show: false, booking: null, action: null })
    setSendSms(false) // Reset SMS checkbox
    await handleStatusChange(booking, newStatus)
  }

  const getPaymentStatusConfig = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return {
          label: 'Paid',
          icon: CheckCircle,
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          iconColor: 'text-green-500'
        }
      case 'refunded':
        return {
          label: 'Refunded',
          icon: XCircle,
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          iconColor: 'text-yellow-500'
        }
      default: // unpaid
        return {
          label: 'Unpaid',
          icon: CreditCard,
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          iconColor: 'text-red-500'
        }
    }
  }

  const handlePaymentStatusChange = async (booking, newStatus) => {
    setLoading(true)
    try {
      await updatePaymentStatus({ id: booking._id, payment_status: newStatus })
      onRefresh()
    } catch (err) {
      console.error('Error updating payment status:', err)
      setError(err.message || 'Failed to update payment status')
    } finally {
      setLoading(false)
    }
  }

  const handlePOSPayment = async (booking) => {
    // This would integrate with your POS system
    // For now, we'll mark the payment as paid
    try {
      await handlePaymentStatusChange(booking, 'paid')
      alert('Payment processed successfully!')
    } catch (error) {
      alert('Failed to process payment. Please try again.')
    }
  }

  const handleViewTransaction = (booking) => {
    setSelectedBooking(booking)
    setShowTransactionModal(true)
  }

  const handlePOSRedirect = (booking) => {
    // Store booking data in session storage to pass to POS page
    sessionStorage.setItem('posBooking', JSON.stringify(booking))
    // Navigate to POS page
    window.location.href = '/staff/pos'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString || timeString === 'N/A') return 'N/A'
    
    // Handle time strings that might have seconds or microseconds
    let cleanTime = timeString
    if (timeString.includes('.')) {
      cleanTime = timeString.split('.')[0] // Remove microseconds
    }
    if (cleanTime.split(':').length > 2) {
      cleanTime = cleanTime.split(':').slice(0, 2).join(':') // Remove seconds
    }
    
    try {
      return new Date(`1970-01-01T${cleanTime}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      return timeString // Return original if parsing fails
    }
  }

  // QR Code Modal Component
  const QRCodeModal = ({ booking, onClose }) => {
    const qrRef = useRef(null)
    
    // Generate QR code data
    const qrData = JSON.stringify({
      bookingId: booking._id,
      bookingCode: booking.booking_code,
      service: services.find(s => s._id === booking.service)?.name,
      barber: booking.barber_name,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      barbershop: 'TipunoX Angeles Barbershop'
    })

    useEffect(() => {
      if (qrRef.current) {
        // Generate QR code as canvas
        QRCode.toCanvas(qrRef.current, qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#36454F',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        }, (error) => {
          if (error) console.error('QR Code generation error:', error)
        })
      }
    }, [qrData])

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-full max-w-sm transform rounded-2xl bg-[#1A1A1A] shadow-2xl transition-all z-[10000] border border-[#2A2A2A]/50">
            <div className="text-center space-y-4 p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto" style={{backgroundColor: '#F68B24'}}>
                <QrCode className="w-6 h-6 text-white" />
              </div>
            
            <div>
              <h3 className="text-lg font-bold mb-1" style={{color: '#36454F'}}>Booking QR Code</h3>
              <p className="text-sm font-mono font-bold text-orange-600">#{booking.booking_code}</p>
              <p className="text-sm" style={{color: '#8B8B8B'}}>Scan this code for booking verification</p>
            </div>

            {/* QR Code */}
            <div className="p-4 rounded-xl" style={{backgroundColor: '#F4F0E6'}}>
              <div className="flex justify-center">
                <canvas ref={qrRef} className="rounded-lg"></canvas>
              </div>
            </div>

            {/* Booking Details */}
            <div className="text-left space-y-2 p-4 rounded-xl" style={{backgroundColor: '#F9F9F9'}}>
              <div className="flex justify-between">
                <span className="text-sm font-medium" style={{color: '#8B8B8B'}}>Service:</span>
                <span className="text-sm font-bold" style={{color: '#36454F'}}>
                  {services.find(s => s._id === booking.service)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium" style={{color: '#8B8B8B'}}>Date & Time:</span>
                <span className="text-sm font-bold" style={{color: '#36454F'}}>
                  {formatDate(booking.date)} at {formatTime(booking.time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium" style={{color: '#8B8B8B'}}>Barber:</span>
                <span className="text-sm font-bold" style={{color: '#36454F'}}>
                  {booking.barber_name || 'Not assigned'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium" style={{color: '#8B8B8B'}}>Status:</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusConfig(booking.status).bg} ${getStatusConfig(booking.status).text}`}>
                  {getStatusConfig(booking.status).label}
                </span>
              </div>
            </div>

              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl font-medium text-white transition-colors"
                style={{backgroundColor: '#F68B24'}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Mini QR Code Component for table
  const MiniQRCode = ({ booking }) => {
    const miniQrRef = useRef(null)
    
    const qrData = JSON.stringify({
      bookingId: booking._id,
      bookingCode: booking.booking_code,
      barbershop: 'TipunoX Angeles Barbershop'
    })

    useEffect(() => {
      if (miniQrRef.current) {
        QRCode.toCanvas(miniQrRef.current, qrData, {
          width: 28,
          margin: 0,
          color: {
            dark: '#36454F',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        }, (error) => {
          if (error) console.error('Mini QR Code generation error:', error)
        })
      }
    }, [qrData])

    return <canvas ref={miniQrRef} className="rounded" />
  }

  const EditBookingForm = () => (
    <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-[#2A2A2A]/50 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Edit Booking
        </h3>
        <button
          onClick={handleCancel}
          className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Service *</label>
          <select
            value={formData.service}
            onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
            className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            required
          >
            <option value="">Select a service</option>
            {services?.map(service => (
              <option key={service._id} value={service._id}>
                {service.name} - ₱{parseFloat(service.price || 0).toFixed(2)} ({service.duration_minutes}min)
              </option>
            )) || []}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Barber (Optional)</label>
          <select
            value={formData.barber}
            onChange={(e) => setFormData(prev => ({ ...prev, barber: e.target.value }))}
            className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
          >
            <option value="">Any available barber</option>
            {barbers?.map(barber => (
              <option key={barber._id} value={barber._id}>
                {barber.full_name}
              </option>
            )) || []}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Time *</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#333333] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Saving...' : 'Save Booking'}</span>
        </button>
      </div>
    </div>
  )

  // Transaction Details Modal Component
  const TransactionDetailsModal = ({ booking, onClose }) => {
    if (!booking) return null

    const service = services.find(s => s._id === booking.service)

    return (
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-full max-w-4xl transform rounded-2xl bg-[#1A1A1A] shadow-2xl transition-all z-[10000] max-h-[90vh] overflow-y-auto border border-[#2A2A2A]/50">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#444444]/30">
              <h3 className="text-xl font-bold text-white">Transaction Details</h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Booking Summary */}
              <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white">Booking Summary</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Booking Code</p>
                    <p className="text-sm font-mono font-bold text-white">#{booking.booking_code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Service</p>
                    <p className="text-sm font-bold text-white">{service?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Date & Time</p>
                    <p className="text-sm font-bold text-white">
                      {formatDate(booking.date)} at {formatTime(booking.time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Amount</p>
                    <p className="text-sm font-bold text-green-400">₱{service?.price?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-lg border border-[#444444]/50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#444444]/30">
                  <h4 className="text-lg font-bold text-white">Payment History</h4>
                </div>

                <div className="overflow-x-auto">
                  {bookingPayments && bookingPayments.length > 0 ? (
                    <table className="min-w-full divide-y divide-[#444444]/30">
                      <thead className="bg-[#2A2A2A]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Payment ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#1A1A1A] divide-y divide-[#2A2A2A]/30">
                        {bookingPayments.map((payment) => (
                          <tr key={payment._id} className="hover:bg-[#333333]/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-mono text-gray-300">{payment.payment_request_id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">{payment.payment_method}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-green-400">₱{payment.amount?.toFixed(2) || '0.00'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                payment.status === 'completed' ? 'bg-green-50 text-green-700' :
                                payment.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                                'bg-red-50 text-red-700'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-300">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-12">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-500" />
                      <h3 className="mt-2 text-sm font-medium text-white">No payments found</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        No payment records found for this booking.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* POS Transactions */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-lg border border-[#444444]/50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#444444]/30">
                  <h4 className="text-lg font-bold text-white">POS Transactions</h4>
                </div>

                <div className="overflow-x-auto">
                  {bookingTransactions && bookingTransactions.length > 0 ? (
                    <table className="min-w-full divide-y divide-[#444444]/30">
                      <thead className="bg-[#2A2A2A]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Transaction ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Services
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Total Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Payment Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#1A1A1A] divide-y divide-[#2A2A2A]/30">
                        {bookingTransactions.map((transaction) => (
                          <tr key={transaction._id} className="hover:bg-[#333333]/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-mono text-gray-300">{transaction.transaction_id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">
                                {transaction.services?.map(s => s.service_name).join(', ') || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-green-400">₱{transaction.total_amount?.toFixed(2) || '0.00'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white">{transaction.payment_method}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-300">
                                {new Date(transaction.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-12">
                      <Receipt className="mx-auto h-12 w-12 text-gray-500" />
                      <h3 className="mt-2 text-sm font-medium text-white">No transactions found</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        No POS transactions found for this booking.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Transaction Tab Component
  const TransactionTab = () => {
    if (!selectedBooking) {
      return (
        <div className="space-y-6">
          {/* Booking Selector */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
            <h3 className="text-lg font-bold text-white mb-4">Select a Booking</h3>

            {/* Loading State */}
            {(!bookings || !services) ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8C42]"></div>
                <span className="ml-2 text-gray-400">Loading bookings...</span>
              </div>
            ) : (filteredBookings || []).length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-white">No bookings found</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Create some bookings first to view transaction details.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#444444]/30">
                <thead className="bg-[#2A2A2A]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Booking Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#1A1A1A] divide-y divide-[#2A2A2A]/30">
                  {(filteredBookings || []).slice(0, 10).map((booking) => {
                    const statusConfig = getStatusConfig(booking.status)
                    const paymentStatusConfig = getPaymentStatusConfig(booking.payment_status || 'unpaid')
                    const StatusIcon = statusConfig.icon
                    const PaymentStatusIcon = paymentStatusConfig.icon
                    const service = services.find(s => s._id === booking.service)

                    return (
                      <tr key={booking._id} className="hover:bg-[#333333]/50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono font-bold text-white">
                            #{booking.booking_code}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {service?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {formatDate(booking.date)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusConfig.bg} ${paymentStatusConfig.text}`}>
                            {paymentStatusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="inline-flex items-center px-3 py-1 border border-blue-500/30 text-xs font-medium rounded text-blue-400 bg-blue-400/20 hover:bg-blue-400/30 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )
    }

    const booking = selectedBooking
    const service = services ? services.find(s => s._id === booking.service) : null

    return (
      <div className="space-y-6">
        {/* Booking Summary */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Booking Summary</h3>
            <button
              onClick={() => setSelectedBooking(null)}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-400">Booking Code</p>
              <p className="text-sm font-mono font-bold text-white">#{booking.booking_code}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Service</p>
              <p className="text-sm font-bold text-white">{service?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Date & Time</p>
              <p className="text-sm font-bold text-white">
                {formatDate(booking.date)} at {formatTime(booking.time)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Amount</p>
              <p className="text-sm font-bold text-green-400">₱{service?.price?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#444444]/30">
            <h3 className="text-lg font-bold text-white">Payment History</h3>
          </div>

          <div className="overflow-x-auto">
            {!selectedBooking ? (
              <div className="text-center py-8">
                <Receipt className="mx-auto h-12 w-12 text-gray-500" />
                <p className="mt-2 text-sm text-gray-400">Select a booking to view payment history</p>
              </div>
            ) : !bookingPayments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF8C42]"></div>
                <span className="ml-2 text-gray-400">Loading payment history...</span>
              </div>
            ) : bookingPayments.length > 0 ? (
              <table className="min-w-full divide-y divide-[#444444]/30">
                <thead className="bg-[#2A2A2A]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Payment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#1A1A1A] divide-y divide-[#2A2A2A]/30">
                  {bookingPayments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-[#333333]/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-300">{payment.payment_request_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{payment.payment_method}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-400">₱{payment.amount?.toFixed(2) || '0.00'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'completed' ? 'bg-green-50 text-green-700' :
                          payment.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-white">No payments found</h3>
                <p className="mt-1 text-sm text-gray-400">
                  No payment records found for this booking.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* POS Transactions */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#444444]/30">
            <h3 className="text-lg font-bold text-white">POS Transactions</h3>
          </div>

          <div className="overflow-x-auto">
            {!selectedBooking ? (
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-gray-500" />
                <p className="mt-2 text-sm text-gray-400">Select a booking to view POS transactions</p>
              </div>
            ) : !bookingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF8C42]"></div>
                <span className="ml-2 text-gray-400">Loading POS transactions...</span>
              </div>
            ) : bookingTransactions.length > 0 ? (
              <table className="min-w-full divide-y divide-[#444444]/30">
                <thead className="bg-[#2A2A2A]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Services
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#1A1A1A] divide-y divide-[#2A2A2A]/30">
                  {bookingTransactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-[#333333]/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-300">{transaction.transaction_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {transaction.services?.map(s => s.service_name).join(', ') || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-400">₱{transaction.total_amount?.toFixed(2) || '0.00'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{transaction.payment_method}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-white">No transactions found</h3>
                <p className="mt-1 text-sm text-gray-400">
                  No POS transactions found for this booking.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total</p>
              <p className="text-xl font-black text-[#FF8C42]">{stats.total}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-[#FF8C42]" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Today</p>
              <p className="text-xl font-black text-[#FF8C42]">{stats.today}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
              <Clock className="h-4 w-4 text-[#FF8C42]" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pending</p>
              <p className="text-xl font-black text-[#FF8C42]">{stats.pending}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-[#FF8C42]" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Booked</p>
              <p className="text-xl font-black text-[#FF8C42]">{stats.booked}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-[#FF8C42]" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Confirmed</p>
              <p className="text-xl font-black text-[#FF8C42]">{stats.confirmed}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-[#FF8C42]" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Cancelled</p>
              <p className="text-xl font-black text-[#FF8C42]">{stats.cancelled}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FF8C42]/20 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-[#FF8C42]" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Paid</p>
              <p className="text-xl font-black text-green-400">{stats.paid}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Unpaid</p>
              <p className="text-xl font-black text-red-400">{stats.unpaid}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Refunded</p>
              <p className="text-xl font-black text-yellow-400">{stats.refunded}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>



      {/* Controls */}
      <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] text-white placeholder-gray-500 rounded-lg focus:ring-1 focus:ring-[#FF8C42] focus:border-[#FF8C42] text-xs"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="booked">Booked</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
            >
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
              <option value="service">Sort by Service</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1A1A] text-gray-400 rounded-lg hover:bg-[#2A2A2A] hover:text-white transition-colors text-xs border border-[#2A2A2A]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-all duration-200 text-xs shadow-lg"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Booking</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Booking Form */}
      {editingBooking && <EditBookingForm />}

      {/* Tab Navigation */}
      <div className="bg-[#1A1A1A] p-2 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
              activeTab === 'bookings'
                ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-md'
                : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Bookings</span>
          </button>
          <button
            onClick={() => setActiveTab('transaction')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
              activeTab === 'transaction'
                ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-md'
                : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Transaction</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'bookings' ? (
        <>
          {/* Main Content */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#2A2A2A]/30">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Booking
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Barber
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#1A1A1A] divide-y divide-[#2A2A2A]/30">
              {currentBookings.map((booking) => {
                const statusConfig = getStatusConfig(booking.status)
                const paymentStatusConfig = getPaymentStatusConfig(booking.payment_status || 'unpaid')
                const currentPaymentStatus = booking.payment_status || 'unpaid'
                const StatusIcon = statusConfig.icon
                const PaymentStatusIcon = paymentStatusConfig.icon
                const service = services.find(s => s._id === booking.service)

                return (
                  <tr key={booking._id} className="hover:bg-[#1A1A1A]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-bold text-white">
                        #{booking.booking_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {service?.name || 'Unknown Service'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {service?.duration_minutes}min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {formatDate(booking.date)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatTime(booking.time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {booking.barber_name || 'Not assigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className={`-ml-0.5 mr-1.5 h-3 w-3 ${statusConfig.iconColor}`} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-400">
                        ₱{service ? parseFloat(service.price).toFixed(2) : '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusConfig.bg} ${paymentStatusConfig.text}`}>
                          <PaymentStatusIcon className={`-ml-0.5 mr-1.5 h-3 w-3 ${paymentStatusConfig.iconColor}`} />
                          {paymentStatusConfig.label}
                        </span>
                        {booking.status === 'confirmed' && currentPaymentStatus === 'unpaid' && (
                          <button
                            onClick={() => handlePOSRedirect(booking)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-400 bg-green-400/20 hover:bg-green-400/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
                            disabled={loading}
                            title="Process Payment at POS"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            POS
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setShowQRCode(booking)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-[#FF8C42]/30 text-xs font-medium rounded text-[#FF8C42] bg-[#FF8C42]/20 hover:bg-[#FF8C42]/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF8C42]"
                          title="View QR Code"
                        >
                          <QrCode className="h-3 w-3 mr-1" />
                          QR
                        </button>
                        {booking.status === 'completed' && currentPaymentStatus === 'paid' && (
                          <button
                            onClick={() => handleViewTransaction(booking)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-blue-500/30 text-xs font-medium rounded text-blue-400 bg-blue-400/20 hover:bg-blue-400/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                            title="View Transaction Details"
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            TXN
                          </button>
                        )}
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking, 'booked')}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-400 bg-blue-400/20 hover:bg-blue-400/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                              disabled={loading}
                            >
                              Book
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking, 'cancelled')}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-400 bg-red-400/20 hover:bg-red-400/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                              disabled={loading}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {booking.status === 'booked' && (
                          <>
                            <button
                              onClick={() => setConfirmModal({ show: true, booking, action: 'confirm' })}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-400 bg-green-400/20 hover:bg-green-400/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
                              disabled={loading}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking, 'cancelled')}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-400 bg-red-400/20 hover:bg-red-400/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                              disabled={loading}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => setConfirmModal({ show: true, booking, action: 'complete' })}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-[#FF8C42] bg-[#FF8C42]/20 hover:bg-[#FF8C42]/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF8C42]"
                            disabled={loading}
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(booking)}
                          className="text-blue-400 hover:text-blue-300"
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(booking)}
                          className="text-red-400 hover:text-red-300"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-white">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new booking.'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A]"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  New Booking
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredBookings.length > 0 && totalPages > 1 && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-lg p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentPage === 1
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Previous</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                Page <span className="text-[#FF8C42] font-semibold">{currentPage}</span> of <span className="text-white font-semibold">{totalPages}</span>
              </span>
              <span className="text-xs text-gray-500">
                ({startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length})
              </span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentPage === totalPages
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <span className="text-sm">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

        </>
      ) : (
        <TransactionTab />
      )}

      {/* Transaction Details Modal */}
      {showTransactionModal && (
        <TransactionDetailsModal
          booking={selectedBooking}
          onClose={() => {
            setShowTransactionModal(false)
            setSelectedBooking(null)
          }}
        />
      )}

      {/* Create Booking Modal */}
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateBooking}
        user={user}
      />

      {/* QR Code Modal */}
      {showQRCode && <QRCodeModal booking={showQRCode} onClose={() => setShowQRCode(null)} />}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex: 99999}}>
          <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#2A2A2A]/50">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto" style={{backgroundColor: '#F68B24'}}>
                 <CheckCircle className="w-6 h-6 text-white" />
               </div>
              
              <div>
                <h3 className="text-lg font-bold mb-2 text-white">
                  {confirmModal.action === 'confirm' ? 'Confirm Booking' : 'Complete Booking'}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Are you sure you want to {confirmModal.action === 'confirm' ? 'confirm' : 'mark as completed'} booking #{confirmModal.booking?.booking_code}?
                </p>

                {confirmModal.booking && (
                  <div className="text-left space-y-2 p-4 rounded-xl bg-[#2A2A2A]">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-300">Customer:</span>
                      <span className="text-sm font-bold text-white">
                        {confirmModal.booking.customer_name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-300">Phone:</span>
                      <span className="text-sm font-bold text-white">
                        {confirmModal.booking.customer_phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-300">Service:</span>
                      <span className="text-sm font-bold text-white">
                        {services.find(s => s._id === confirmModal.booking.service)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-300">Date & Time:</span>
                      <span className="text-sm font-bold text-white">
                        {formatDate(confirmModal.booking.date)} at {formatTime(confirmModal.booking.time)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-300">Barber:</span>
                      <span className="text-sm font-bold text-white">
                        {confirmModal.booking.barber_name || 'Not assigned'}
                      </span>
                    </div>
                  </div>
                )}

                {/* SMS Checkbox */}
                {confirmModal.booking?.customer_phone && (
                  <div className="mt-4 p-3 rounded-xl bg-[#2A2A2A] border border-[#3A3A3A]">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendSms}
                        onChange={(e) => setSendSms(e.target.checked)}
                        className="w-5 h-5 text-[#F68B24] bg-[#1A1A1A] border-[#3A3A3A] rounded focus:ring-[#F68B24] focus:ring-2"
                      />
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-[#F68B24]" />
                        <span className="text-sm font-medium text-white">Send SMS notification to customer</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setConfirmModal({ show: false, booking: null, action: null })
                    setSendSms(false)
                  }}
                  className="flex-1 py-2 px-4 rounded-xl font-medium text-gray-300 bg-[#2A2A2A] hover:bg-[#333333] transition-colors"
                >
                  Cancel
                </button>
                <button
                   onClick={handleConfirmAction}
                   disabled={loading}
                   className="flex-1 py-2 px-4 rounded-xl font-medium text-white transition-colors bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                   style={{backgroundColor: loading ? undefined : '#F68B24'}}
                 >
                   {loading ? 'Processing...' : (confirmModal.action === 'confirm' ? 'Confirm' : 'Complete')}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingsManagement