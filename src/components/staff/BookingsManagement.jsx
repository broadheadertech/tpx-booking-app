import React, { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Search, Filter, Plus, Edit, Trash2, RotateCcw, Save, X, QrCode, CreditCard, Receipt, DollarSign, Eye, ChevronLeft, ChevronRight, MessageSquare, MoreVertical, Check, Ban, Settings, Banknote, HelpCircle } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAppModal } from '../../context/AppModalContext'
import QRCode from 'qrcode'
import { createPortal } from 'react-dom'
import CreateBookingModal from './CreateBookingModal'
import Modal from '../common/Modal'
import BookingSettingsModal from './BookingSettingsModal'
import PaymentHistory from './PaymentHistory'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { bookingsManagementSteps } from '../../config/walkthroughSteps'

const BookingsManagement = ({ onRefresh, user }) => {
  const { showAlert } = useAppModal()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)

  const [showQRCode, setShowQRCode] = useState(null)
  const [editFormData, setEditFormData] = useState({
    service: '',
    barber: '',
    date: '',
    time: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmModal, setConfirmModal] = useState({ show: false, booking: null, action: null })
  const [deleteModal, setDeleteModal] = useState({ show: false, booking: null })
  const [cancelModal, setCancelModal] = useState({ show: false, booking: null })
  const [activeTab, setActiveTab] = useState('bookings')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const [sendSms, setSendSms] = useState(false)
  const [dropdownState, setDropdownState] = useState({ id: null, position: null })
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showTutorial, setShowTutorial] = useState(false)

  // Update time every minute for countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Convex queries - use branch-scoped queries for staff, global for super_admin
  // Added pagination limits to avoid Convex byte limit errors
  // If date filter is applied, use server-side date filtering
  const hasDateFilter = startDate && endDate

  const bookingsData = hasDateFilter
    ? useQuery(api.services.bookings.getBookingsByDateRange, {
      startDate,
      endDate,
      branch_id: user?.branch_id
    })
    : user?.role === 'super_admin'
      ? useQuery(api.services.bookings.getAllBookings, { limit: 100 })
      : user?.branch_id
        ? useQuery(api.services.bookings.getBookingsByBranch, { branch_id: user.branch_id, limit: 100 })
        : null

  // Handle data structure differences: getBookingsByDateRange returns raw array, others return { bookings: [...] }
  const bookings = hasDateFilter
    ? (bookingsData || [])
    : (bookingsData?.bookings || [])

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
  const editBookingTransactions = useQuery(api.services.bookings.getBookingTransactions, { bookingId: editingBooking?._id })

  // Convex mutations
  const updateBookingStatus = useMutation(api.services.bookings.updateBooking)
  const deleteBookingMutation = useMutation(api.services.bookings.deleteBooking)
  const updatePaymentStatus = useMutation(api.services.bookings.updatePaymentStatus)
  const cancelBookingMutation = useMutation(api.services.bookings.cancelBooking)

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
        (booking.booking_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === 'all' || booking.status === filterStatus

      // Date filter
      let matchesDate = true
      if (startDate || endDate) {
        const bookingDate = new Date(booking.date)
        bookingDate.setHours(0, 0, 0, 0)

        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (bookingDate < start) matchesDate = false
        }

        if (endDate && matchesDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (bookingDate > end) matchesDate = false
        }
      }

      return matchesSearch && matchesFilter && matchesDate
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
  }, [filterStatus, searchTerm, sortBy, startDate, endDate]);

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

  const resetEditForm = () => {
    setEditFormData({
      service: '',
      barber: '',
      date: '',
      time: '',
      notes: ''
    })
  }

  const handleEdit = (booking) => {
    setEditFormData({
      service: booking.service,
      barber: booking.barber || '',
      date: booking.date,
      time: booking.time && booking.time !== 'N/A' ? booking.time.slice(0, 5) : '',
      notes: booking.notes || ''
    })
    setEditingBooking(booking)
    setShowEditModal(true)
    setError('')
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingBooking(null)
    resetEditForm()
    setError('')
  }

  const handleSaveEdit = async () => {
    if (!editFormData.service || !editFormData.date || !editFormData.time) {
      setError('Service, date, and time are required')
      return
    }

    if (!editingBooking) {
      setError('No booking selected for editing')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Check if date was changed (affects payroll calculations)
      const dateChanged = editFormData.date !== editingBooking.date

      const bookingData = {
        id: editingBooking._id,
        service: editFormData.service,
        date: editFormData.date,
        time: editFormData.time,
        notes: editFormData.notes?.trim() || undefined
      }

      // Only include barber if one is selected (empty string means no barber)
      if (editFormData.barber && editFormData.barber.trim() !== '') {
        bookingData.barber = editFormData.barber
      } else {
        // Explicitly set to undefined to remove the barber assignment
        bookingData.barber = undefined
      }

      await updateBookingStatus(bookingData)
      handleCloseEditModal()

      // Show payroll recalculation warning if date changed
      if (dateChanged) {
        // Could add a toast notification here or set a temporary message
        console.log('Booking date changed - payroll may need recalculation')
      }

      // No need to call onRefresh() - Convex will automatically update the UI
    } catch (err) {
      console.error('Error updating booking:', err)
      setError(err.message || 'Failed to update booking')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (booking) => {
    setDeleteModal({ show: true, booking })
  }

  const confirmDelete = async () => {
    if (!deleteModal.booking) return

    setLoading(true)
    try {
      await deleteBookingMutation({ id: deleteModal.booking._id })
      setDeleteModal({ show: false, booking: null })
      // Convex will automatically update the UI via real-time subscription
      // No need to call onRefresh()
    } catch (err) {
      console.error('Error deleting booking:', err)
      setError(err.message || 'Failed to delete booking')
      setDeleteModal({ show: false, booking: null })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (booking, newStatus) => {
    setLoading(true)
    try {
      await updateBookingStatus({ id: booking._id, status: newStatus })
      // Convex will automatically update the UI via real-time subscription
      // No need to call onRefresh()
    } catch (err) {
      console.error('Error updating booking status:', err)
      setError(err.message || 'Failed to update booking status')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!cancelModal.booking) return

    setLoading(true)
    try {
      await cancelBookingMutation({
        id: cancelModal.booking._id,
        reason: 'Cancelled by staff'
      })
      setCancelModal({ show: false, booking: null })
      // Convex will automatically update the UI via real-time subscription
    } catch (err) {
      console.error('Error cancelling booking:', err)
      setError(err.message || 'Failed to cancel booking')
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
        ? `Hi ${booking.customer_name || 'Customer'}! Your booking #${booking.booking_code} at  Barbershop has been confirmed for ${formatDate(booking.date)} at ${formatTime(booking.time)}. Service: ${service?.name}. See you soon!`
        : `Hi ${booking.customer_name || 'Customer'}! Your booking #${booking.booking_code} at  Barbershop has been completed. Thank you for choosing us!`

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
      // Convex will automatically update the UI via real-time subscription
      // No need to call onRefresh()
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
      showAlert({ title: 'Success', message: 'Payment processed successfully!', type: 'success' })
    } catch (error) {
      showAlert({ title: 'Error', message: 'Failed to process payment. Please try again.', type: 'error' })
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

  // Calculate time remaining until booking
  const getTimeRemaining = (bookingDate, bookingTime) => {
    try {
      const now = new Date()
      const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`)
      const diffMs = bookingDateTime - now
      const diffMins = Math.floor(diffMs / 60000)

      if (diffMins < 0) {
        return { text: 'Past', color: 'gray', show: false }
      }

      if (diffMins < 10) {
        return {
          text: `${diffMins}m`,
          color: 'red',
          show: true,
          bgClass: 'bg-red-500/20',
          textClass: 'text-red-400',
          borderClass: 'border-red-500/30'
        }
      }

      if (diffMins < 20) {
        return {
          text: `${diffMins}m`,
          color: 'yellow',
          show: true,
          bgClass: 'bg-yellow-500/20',
          textClass: 'text-yellow-400',
          borderClass: 'border-yellow-500/30'
        }
      }

      if (diffMins < 30) {
        return {
          text: `${diffMins}m`,
          color: 'green',
          show: true,
          bgClass: 'bg-green-500/20',
          textClass: 'text-green-400',
          borderClass: 'border-green-500/30'
        }
      }

      if (diffMins < 60) {
        return {
          text: `${diffMins}m`, color: 'blue', show: true,
          bgClass: 'bg-blue-500/20',
          textClass: 'text-blue-400',
          borderClass: 'border-blue-500/30'
        }
      }

      const hours = Math.floor(diffMins / 60)
      if (hours < 24) {
        return {
          text: `${hours}h`, color: 'blue', show: true,
          bgClass: 'bg-blue-500/20',
          textClass: 'text-blue-400',
          borderClass: 'border-blue-500/30'
        }
      }

      const days = Math.floor(hours / 24)
      return {
        text: `${days}d`, color: 'gray', show: true,
        bgClass: 'bg-gray-500/20',
        textClass: 'text-gray-400',
        borderClass: 'border-gray-500/30'
      }
    } catch (error) {
      return { text: '', color: 'gray', show: false }
    }
  }

  // QR Code Modal Component
  const QRCodeModal = ({ booking, onClose }) => {
    const qrRef = useRef(null)

    const qrData = JSON.stringify({
      bookingId: booking._id,
      bookingCode: booking.booking_code,
      service: services.find(s => s._id === booking.service)?.name,
      barber: booking.barber_name,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      barbershop: ' Barbershop'
    })

    useEffect(() => {
      if (qrRef.current) {
        // Generate QR code as canvas
        QRCode.toCanvas(qrRef.current, qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: 'var(--color-primary)',
            light: '#1A1A1A'
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
          <div className="relative w-full max-w-sm transform rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#222222] shadow-2xl transition-all z-[10000] border border-[#333333]/50">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#333333]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Booking QR Code</h3>
                  <p className="text-xs text-gray-400 font-mono">#{booking.booking_code}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* QR Code */}
              <div className="p-4 rounded-xl bg-white flex justify-center">
                <canvas ref={qrRef} className="rounded-lg"></canvas>
              </div>

              {/* Quick Details */}
              <div className="space-y-2.5 bg-[#0F0F0F]/50 rounded-lg p-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Service:</span>
                  <span className="text-white font-medium">{services.find(s => s._id === booking.service)?.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Date & Time:</span>
                  <span className="text-white font-medium">{formatDate(booking.date)} {formatTime(booking.time)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Barber:</span>
                  <span className="text-white font-medium">{booking.barber_name || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#333333]">
                  <span className="text-gray-400">Status:</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusConfig(booking.status).bg} ${getStatusConfig(booking.status).text}`}>
                    {getStatusConfig(booking.status).label}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110 transition-all text-sm"
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
      barbershop: ' Barbershop'
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

  // Edit Booking Modal Component
  const EditBookingModal = () => {
    if (!editingBooking) return null

    const currentService = services?.find(s => s._id === editFormData.service)

    return (
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Edit Booking"
        size="xl"
        variant="dark"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Current Info */}
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Current Booking Info */}
            <div className="bg-[#0F0F0F]/50 rounded-lg p-4 border border-[#333333]/50">
              <h4 className="text-sm font-bold text-gray-200 mb-3 flex items-center">
                <Eye className="w-4 h-4 text-[var(--color-primary)] mr-2" />
                Current Booking
              </h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Booking Code:</span>
                  <div className="text-white font-mono font-semibold">#{editingBooking.booking_code}</div>
                </div>
                <div>
                  <span className="text-gray-400">Service:</span>
                  <div className="text-white font-medium">{services?.find(s => s._id === editingBooking.service)?.name || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Date & Time:</span>
                  <div className="text-white font-medium">
                    {formatDate(editingBooking.date)} at {formatTime(editingBooking.time)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Barber:</span>
                  <div className="text-white font-medium">{editingBooking.barber_name || 'Not assigned'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Current Status:</span>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusConfig(editingBooking.status).bg} ${getStatusConfig(editingBooking.status).text}`}>
                    {getStatusConfig(editingBooking.status).label}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Payment Status:</span>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getPaymentStatusConfig(editingBooking.payment_status || 'unpaid').bg} ${getPaymentStatusConfig(editingBooking.payment_status || 'unpaid').text}`}>
                    {getPaymentStatusConfig(editingBooking.payment_status || 'unpaid').label}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details Section */}
            <div className="bg-[#0F0F0F]/50 rounded-lg p-4 border border-[#333333]/50">
              <h4 className="text-sm font-bold text-gray-200 mb-3 flex items-center">
                <User className="w-4 h-4 text-[var(--color-primary)] mr-2" />
                Customer Details
              </h4>

              {/* Loading state for transactions */}
              {editingBooking && editBookingTransactions === undefined ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-xs text-gray-400">Loading customer details...</span>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {/* Customer Name */}
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <div className="text-white font-medium">
                      {editingBooking?.customer_name || 'N/A'}
                      {editingBooking?.customer && (
                        <span className="text-xs text-gray-400 ml-2">(Registered Customer)</span>
                      )}
                      {!editingBooking?.customer && editingBooking?.customer_name && (
                        <span className="text-xs text-[var(--color-primary)] ml-2">(Walk-in Customer)</span>
                      )}
                    </div>
                  </div>

                  {/* Customer Phone */}
                  <div>
                    <span className="text-gray-400">Phone:</span>
                    <div className="text-white font-medium">
                      {editingBooking?.customer_phone || 'N/A'}
                    </div>
                  </div>

                  {/* Customer Email */}
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <div className="text-white font-medium">
                      {editingBooking?.customer_email || 'N/A'}
                    </div>
                  </div>

                  {/* Customer Address (from transaction if available) */}
                  <div>
                    <span className="text-gray-400">Address:</span>
                    <div className="text-white font-medium">
                      {editBookingTransactions && editBookingTransactions.length > 0
                        ? (editBookingTransactions[0]?.customer_address || 'N/A')
                        : 'N/A'
                      }
                    </div>
                  </div>

                  {/* Transaction Details */}
                  {editBookingTransactions && editBookingTransactions.length > 0 && (
                    <>
                      <div className="border-t border-[#333333]/50 pt-3 mt-4">
                        <span className="text-gray-300 text-xs font-semibold">POS Transaction Details:</span>
                      </div>

                      {/* Transaction ID */}
                      <div>
                        <span className="text-gray-400">Transaction ID:</span>
                        <div className="text-white font-mono text-xs">
                          {editBookingTransactions[0]?.transaction_id}
                        </div>
                      </div>

                      {/* Transaction Date */}
                      <div>
                        <span className="text-gray-400">Transaction Date:</span>
                        <div className="text-white font-medium">
                          {new Date(editBookingTransactions[0]?.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <span className="text-gray-400">Payment Method:</span>
                        <div className="text-white font-medium">
                          {editBookingTransactions[0]?.payment_method || 'N/A'}
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div>
                        <span className="text-gray-400">Total Amount:</span>
                        <div className="text-green-400 font-bold">
                          ₱{editBookingTransactions[0]?.total_amount?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Edit Form */}
          <div className="space-y-6">
            <div className="bg-[#0F0F0F]/50 rounded-lg p-4 border border-[#333333]/50">
              <h4 className="text-sm font-bold text-gray-200 mb-4 flex items-center">
                <Edit className="w-4 h-4 text-[var(--color-primary)] mr-2" />
                Edit Booking Details
              </h4>

              <div className="grid grid-cols-1 gap-4">
                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Service <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editFormData.service}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, service: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                    required
                  >
                    <option value="">Select a service</option>
                    {services?.map(service => (
                      <option key={service._id} value={service._id}>
                        {service.name} - ₱{parseFloat(service.price || 0).toFixed(2)} ({service.duration_minutes}min)
                      </option>
                    )) || []}
                  </select>
                  {currentService && (
                    <p className="text-xs text-gray-400 mt-1">
                      Duration: {currentService.duration_minutes}min • Price: ₱{parseFloat(currentService.price || 0).toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Barber Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Barber</label>
                  <select
                    value={editFormData.barber}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, barber: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                  >
                    <option value="">Any available barber</option>
                    {barbers?.map(barber => (
                      <option key={barber._id} value={barber._id}>
                        {barber.full_name}
                      </option>
                    )) || []}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                    required
                  />
                  <p className="text-xs text-amber-400 mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Changing the date may affect payroll calculations
                  </p>
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={editFormData.time}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any additional notes about this booking..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={handleCloseEditModal}
                className="px-6 py-2 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#333333] hover:text-white transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

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
          <div className="relative w-full max-w-4xl transform rounded-2xl bg-[#1A1A1A] shadow-2xl transition-all z-[10000] max-h-[90vh] overflow-y-auto custom-scrollbar border border-[#2A2A2A]/50">
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
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'completed' ? 'bg-green-50 text-green-700' :
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

  // Skeleton Loading Component
  const BookingSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-[#2A2A2A] rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-[#2A2A2A] rounded w-32 mb-2"></div>
        <div className="h-3 bg-[#2A2A2A] rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-[#2A2A2A] rounded w-28"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-[#2A2A2A] rounded w-20 mb-2"></div>
        <div className="h-3 bg-[#2A2A2A] rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-[#2A2A2A] rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-[#2A2A2A] rounded-full w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-[#2A2A2A] rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-[#2A2A2A] rounded-full w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-5 bg-[#2A2A2A] rounded-full w-16 mb-1"></div>
        <div className="h-3 bg-[#2A2A2A] rounded w-12"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end space-x-2">
          <div className="h-8 bg-[#2A2A2A] rounded w-16"></div>
          <div className="h-8 bg-[#2A2A2A] rounded w-8"></div>
        </div>
      </td>
    </tr>
  )

  // Cancel Confirmation Modal
  const CancelConfirmationModal = () => {
    if (!cancelModal.show || !cancelModal.booking) return null

    const booking = cancelModal.booking
    const service = services.find(s => s._id === booking.service)

    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
        <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#2A2A2A]/50">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto bg-red-500/20">
              <Ban className="w-6 h-6 text-red-400" />
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2 text-white">
                Cancel Confirmed Booking
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Are you sure you want to cancel this confirmed booking? The customer and barber will be notified.
              </p>

              <div className="text-left space-y-2 p-4 rounded-xl bg-[#2A2A2A]">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Booking Code:</span>
                  <span className="text-sm font-mono font-bold text-white">
                    #{booking.booking_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Customer:</span>
                  <span className="text-sm font-bold text-white">
                    {booking.customer_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Service:</span>
                  <span className="text-sm font-bold text-white">
                    {service?.name || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Date & Time:</span>
                  <span className="text-sm font-bold text-white">
                    {formatDate(booking.date)} at {formatTime(booking.time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Barber:</span>
                  <span className="text-sm font-bold text-white">
                    {booking.barber_name || 'Not assigned'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setCancelModal({ show: false, booking: null })}
                className="flex-1 py-2 px-4 rounded-xl font-medium text-gray-300 bg-[#2A2A2A] hover:bg-[#333333] transition-colors"
                disabled={loading}
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={loading}
                className="flex-1 py-2 px-4 rounded-xl font-medium text-white transition-colors bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Cancel Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!deleteModal.show || !deleteModal.booking) return null

    const booking = deleteModal.booking
    const service = services.find(s => s._id === booking.service)

    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
        <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#2A2A2A]/50">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto bg-red-500/20">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2 text-white">
                Delete Booking
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Are you sure you want to delete booking <span className="font-mono font-semibold text-white">#{booking.booking_code}</span>? This action cannot be undone.
              </p>

              <div className="text-left space-y-2 p-4 rounded-xl bg-[#2A2A2A]">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Customer:</span>
                  <span className="text-sm font-bold text-white">
                    {booking.customer_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Service:</span>
                  <span className="text-sm font-bold text-white">
                    {service?.name || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Date & Time:</span>
                  <span className="text-sm font-bold text-white">
                    {formatDate(booking.date)} at {formatTime(booking.time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-300">Status:</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusConfig(booking.status).bg} ${getStatusConfig(booking.status).text}`}>
                    {getStatusConfig(booking.status).label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, booking: null })}
                className="flex-1 py-2 px-4 rounded-xl font-medium text-gray-300 bg-[#2A2A2A] hover:bg-[#333333] transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="flex-1 py-2 px-4 rounded-xl font-medium text-white transition-colors bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                <span className="ml-2 text-gray-400">Loading bookings...</span>
              </div>
            ) : (filteredBookings || []).length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-white" />
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
                        Online Payment
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
                            {booking.convenience_fee_paid > 0 ? (
                              <div className="text-right">
                                <span className="text-sm text-blue-400 font-medium">
                                  ₱{(booking.convenience_fee_paid || 0).toLocaleString()}
                                </span>
                                <p className="text-xs text-gray-500">Conv. Fee</p>
                              </div>
                            ) : booking.booking_fee > 0 ? (
                              <div className="text-right">
                                <span className="text-sm text-green-400 font-medium">
                                  ₱{((service?.price || 0) + booking.booking_fee).toLocaleString()}
                                </span>
                                <p className="text-xs text-gray-500">Full + Fee</p>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Pay at Shop</span>
                            )}
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

          {/* Payment Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-4 pt-4 border-t border-[#444444]/30">
            <div>
              <p className="text-sm font-medium text-gray-400">Payment Status</p>
              <p className={`text-sm font-bold ${
                booking.payment_status === 'paid' ? 'text-green-400' :
                booking.payment_status === 'partial' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {booking.payment_status === 'paid' ? 'Fully Paid' :
                 booking.payment_status === 'partial' ? 'Partially Paid' :
                 'Unpaid'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Payment Type</p>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                booking.payment_status === 'unpaid' || (!booking.payment_status)
                  ? 'bg-blue-500/20 text-blue-400'
                  : booking.payment_method === 'wallet'
                    ? 'bg-purple-500/20 text-purple-400'
                    : booking.payment_method === 'combo'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-green-500/20 text-green-400'
              }`}>
                {booking.payment_status === 'unpaid' || (!booking.payment_status)
                  ? '💵 Pay at Shop'
                  : booking.payment_method === 'wallet'
                    ? '👛 Wallet Pay'
                    : booking.payment_method === 'combo'
                      ? '🔄 Combo'
                      : booking.payment_status === 'partial'
                        ? '💳 Fee Paid (Online)'
                        : '💳 Online Pay'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Booking Fee Paid</p>
              {booking.booking_fee > 0 ? (
                <p className="text-sm font-bold text-green-400">
                  ₱{booking.booking_fee.toLocaleString()}
                </p>
              ) : (
                <p className="text-sm font-bold text-gray-500">₱0</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Convenience Fee Paid</p>
              {booking.convenience_fee_paid > 0 ? (
                <p className="text-sm font-bold text-blue-400">
                  ₱{(booking.convenience_fee_paid || 0).toLocaleString()}
                </p>
              ) : (
                <p className="text-sm font-bold text-gray-500">₱0</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Total Online Paid</p>
              {booking.convenience_fee_paid > 0 ? (
                <p className="text-sm font-bold text-blue-400">
                  ₱{(booking.convenience_fee_paid || 0).toLocaleString()}
                </p>
              ) : booking.booking_fee > 0 ? (
                <div>
                  <p className="text-sm font-bold text-green-400">
                    ₱{((service?.price || 0) + booking.booking_fee).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    (Service + Fee)
                  </p>
                </div>
              ) : (
                <p className="text-sm font-bold text-gray-500">₱0</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Balance Due at Shop</p>
              <p className={`text-sm font-bold ${
                booking.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {booking.payment_status === 'paid' ? '₱0 (Paid)' :
                 booking.convenience_fee_paid > 0 ? `₱${(service?.price || 0).toLocaleString()}` :
                 booking.booking_fee > 0 ? '₱0 (Paid Online)' :
                 `₱${((service?.price || 0) - (booking.cash_collected || 0)).toLocaleString()}`}
              </p>
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
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]"></div>
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'completed' ? 'bg-green-50 text-green-700' :
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
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]"></div>
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
    <div className="space-y-3 sm:space-y-4">
      {/* Ultra Compact Stats Bar */}
      <div data-tour="bm-stats" className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] px-4 py-2.5">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Left: Booking Stats */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs text-gray-400 font-medium">Total:</span>
              <span className="text-sm font-bold text-white">{stats.total}</span>
            </div>

            <div className="h-4 w-px bg-[#2A2A2A]"></div>

            <div className="flex items-center gap-2 px-2 py-1 rounded bg-[var(--color-primary)]/10">
              <Clock className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <span className="text-xs text-gray-400 font-medium">Today:</span>
              <span className="text-sm font-bold text-white">{stats.today}</span>
            </div>

            <div className="h-4 w-px bg-[#2A2A2A]"></div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Pending</span>
                <span className="text-sm font-bold text-white">{stats.pending}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Booked</span>
                <span className="text-sm font-bold text-white">{stats.booked}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Confirmed</span>
                <span className="text-sm font-bold text-white">{stats.confirmed}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">Cancelled</span>
                <span className="text-sm font-bold text-white">{stats.cancelled}</span>
              </div>
            </div>
          </div>

          {/* Right: Payment Stats */}
          <div className="flex items-center gap-3 pl-4 border-l border-[#2A2A2A]">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">Paid</span>
              <span className="text-sm font-bold text-white">{stats.paid}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">Unpaid</span>
              <span className="text-sm font-bold text-white">{stats.unpaid}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">Refunded</span>
              <span className="text-sm font-bold text-white">{stats.refunded}</span>
            </div>
          </div>
        </div>
      </div>



      {/* Compact Filters Bar */}
      <div data-tour="bm-filters" className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] px-3 py-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Search & Filters */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[250px]">
            {/* Search */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-40 bg-[#0A0A0A] border border-[#2A2A2A] text-white placeholder-gray-500 rounded-md focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0A0A0A] border border-[#2A2A2A] text-white text-gray-400 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] hover:border-[var(--color-primary)]/50 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="booked">Booked</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0A0A0A] border border-[#2A2A2A] text-white text-gray-400 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] hover:border-[var(--color-primary)]/50 transition-colors"
            >
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
              <option value="service">Sort by Service</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 w-32 bg-[#0A0A0A] border border-[#2A2A2A] text-white text-gray-400 rounded-md text-xs focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="px-2 py-1.5 w-32 bg-[#0A0A0A] border border-[#2A2A2A] text-white text-gray-400 rounded-md text-xs focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded transition-colors"
                  title="Clear dates"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-md transition-colors"
              title="Refresh"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2A2A] text-white rounded-md hover:bg-[#333333] transition-all text-xs font-medium border border-[#3A3A3A] mr-1"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Booking Settings</span>
            </button>
            <button
              data-tour="bm-create-btn"
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-md hover:from-[var(--color-accent)] hover:brightness-110 transition-all text-xs font-medium shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">New</span>
            </button>
            <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Booking Modal */}
      <EditBookingModal />

      {/* Tab Navigation */}
      <div data-tour="bm-tabs" className="bg-[#1A1A1A] p-2 rounded-lg border border-[#2A2A2A]/50 shadow-lg">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${activeTab === 'bookings'
              ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-md'
              : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Bookings</span>
          </button>
          <button
            onClick={() => setActiveTab('transaction')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${activeTab === 'transaction'
              ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-md'
              : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
              }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Transaction</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${activeTab === 'payments'
              ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-md'
              : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
              }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Payment History</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'bookings' ? (
        <>
          {/* Main Content */}
          <div data-tour="bm-table" className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-lg overflow-hidden">
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
                      Customer
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
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Booking Fee
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Conv. Fee
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Payment Type
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#1A1A1A] divide-y divide-[#2A2A2A]/30">
                  {bookings === undefined ? (
                    // Skeleton loading state
                    Array.from({ length: itemsPerPage }).map((_, index) => (
                      <BookingSkeleton key={`skeleton-${index}`} />
                    ))
                  ) : currentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-white mb-3" />
                        <h3 className="text-sm font-medium text-white mb-1">No bookings found</h3>
                        <p className="text-sm text-gray-400">
                          {searchTerm || filterStatus !== 'all' || startDate || endDate
                            ? 'Try adjusting your search or filter criteria.'
                            : 'Get started by creating a new booking.'
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentBookings.map((booking) => {
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
                            <div>
                              <div className="text-sm font-medium text-white">
                                {(() => {
                                  const name = booking.customer_name || 'N/A'
                                  // Clean up guest names like guest_samples_1762847861795_qvbv
                                  if (name.startsWith('guest_')) {
                                    // Extract the base name and show just "Guest (samples)"
                                    const parts = name.split('_')
                                    if (parts.length >= 2) {
                                      const baseName = parts[1].replace(/[_\d]/g, '')
                                      return `Guest${baseName ? ` (${baseName.substring(0, 10)})` : ''}`
                                    }
                                    return 'Guest'
                                  }
                                  // Clean up walk-in names like walkin_1762840519194_e9587qljl
                                  if (name.startsWith('walkin_')) {
                                    return 'Walk-in'
                                  }
                                  return name
                                })()}
                              </div>
                              {booking.customer_phone && (
                                <div className="text-xs text-gray-400 font-mono mt-0.5">
                                  {booking.customer_phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="text-sm text-white">
                                  {formatDate(booking.date)}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {formatTime(booking.time)}
                                </div>
                              </div>
                              {(() => {
                                const timeRemaining = getTimeRemaining(booking.date, booking.time)
                                if (timeRemaining.show && booking.status !== 'completed' && booking.status !== 'cancelled') {
                                  return (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${timeRemaining.bgClass} ${timeRemaining.textClass} ${timeRemaining.borderClass}`}>
                                      <Clock className="h-3 w-3 mr-1" />
                                      {timeRemaining.text}
                                    </span>
                                  )
                                }
                                return null
                              })()}
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
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {booking.booking_fee > 0 ? (
                              <span className="text-sm font-bold text-green-400">
                                ₱{booking.booking_fee.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">₱0</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {booking.convenience_fee_paid > 0 ? (
                              <span className="text-sm font-bold text-blue-400">
                                ₱{(booking.convenience_fee_paid || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">₱0</span>
                            )}
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(() => {
                              // Determine payment type based on payment_method and status
                              if (booking.payment_status === 'paid') {
                                if (booking.payment_method === 'wallet') {
                                  return (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                      👛 Wallet
                                    </span>
                                  )
                                } else if (booking.payment_method === 'combo') {
                                  return (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                      🔄 Combo
                                    </span>
                                  )
                                } else {
                                  return (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                      💳 Online
                                    </span>
                                  )
                                }
                              } else if (booking.payment_status === 'partial' || booking.convenience_fee_paid > 0) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                    💳 Fee Paid
                                  </span>
                                )
                              } else if (booking.cash_collected > 0) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    💵 Cash
                                  </span>
                                )
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    💵 Pay at Shop
                                  </span>
                                )
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {/* Quick Actions - Always visible */}
                              <button
                                onClick={() => setShowQRCode(booking)}
                                className="p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-md transition-colors"
                                title="View QR Code"
                              >
                                <QrCode className="h-4 w-4" />
                              </button>
                              {booking.status === 'completed' && currentPaymentStatus === 'paid' && (
                                <button
                                  onClick={() => handleViewTransaction(booking)}
                                  className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                                  title="View Transaction"
                                >
                                  <Receipt className="h-4 w-4" />
                                </button>
                              )}

                              {/* Dropdown Menu */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setDropdownState(prev => prev.id === booking._id
                                      ? { id: null, position: null }
                                      : {
                                        id: booking._id,
                                        position: {
                                          top: rect.bottom + window.scrollY,
                                          left: rect.right + window.scrollX
                                        }
                                      }
                                    );
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-md transition-colors"
                                  title="More actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {dropdownState.id === booking._id && createPortal(
                                  <>
                                    <div
                                      className="fixed inset-0 z-[9999]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDropdownState({ id: null, position: null });
                                      }}
                                    />
                                    <div
                                      className="absolute z-[10000] w-48 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl py-1"
                                      style={{
                                        top: dropdownState.position.top + 4,
                                        left: dropdownState.position.left,
                                        transform: 'translateX(-100%)'
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* Status Actions */}
                                      {booking.status === 'pending' && (
                                        <>
                                          <button
                                            onClick={() => {
                                              handleStatusChange(booking, 'booked')
                                              setDropdownState({ id: null, position: null })
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                                            disabled={loading}
                                          >
                                            <Check className="h-4 w-4 text-blue-400" />
                                            <span>Book</span>
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleStatusChange(booking, 'cancelled')
                                              setDropdownState({ id: null, position: null })
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                                            disabled={loading}
                                          >
                                            <Ban className="h-4 w-4 text-red-400" />
                                            <span>Cancel</span>
                                          </button>
                                        </>
                                      )}
                                      {booking.status === 'booked' && (
                                        <>
                                          <button
                                            onClick={() => {
                                              setConfirmModal({ show: true, booking, action: 'confirm' })
                                              setDropdownState({ id: null, position: null })
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                                            disabled={loading}
                                          >
                                            <CheckCircle className="h-4 w-4 text-green-400" />
                                            <span>Confirm</span>
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleStatusChange(booking, 'cancelled')
                                              setDropdownState({ id: null, position: null })
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                                            disabled={loading}
                                          >
                                            <Ban className="h-4 w-4 text-red-400" />
                                            <span>Cancel</span>
                                          </button>
                                        </>
                                      )}
                                      {booking.status === 'confirmed' && (
                                        <>
                                          <button
                                            onClick={() => {
                                              handlePOSRedirect(booking)
                                              setDropdownState({ id: null, position: null })
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                                            disabled={loading}
                                          >
                                            <CreditCard className="h-4 w-4 text-green-400" />
                                            <span>POS</span>
                                          </button>
                                          <button
                                            onClick={() => {
                                              setCancelModal({ show: true, booking })
                                              setDropdownState({ id: null, position: null })
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                                            disabled={loading}
                                          >
                                            <Ban className="h-4 w-4 text-red-400" />
                                            <span>Cancel Booking</span>
                                          </button>
                                        </>
                                      )}

                                      {/* Divider */}
                                      {(booking.status === 'pending' || booking.status === 'booked' || booking.status === 'confirmed') && (
                                        <div className="my-1 border-t border-[#2A2A2A]"></div>
                                      )}

                                      {/* Edit & Delete */}
                                      <button
                                        onClick={() => {
                                          handleEdit(booking)
                                          setDropdownState({ id: null, position: null })
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                                        disabled={loading}
                                      >
                                        <Edit className="h-4 w-4 text-blue-400" />
                                        <span>Edit</span>
                                      </button>
                                      {(user?.role === 'branch_admin' || user?.role === 'super_admin') && (
                                        <button
                                          onClick={() => {
                                            handleDelete(booking)
                                            setDropdownState({ id: null, position: null })
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2A2A2A] transition-colors flex items-center gap-2"
                                          disabled={loading}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-400" />
                                          <span>Delete</span>
                                        </button>
                                      )}
                                    </div>
                                  </>,
                                  document.body
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Pagination Controls */}
          {filteredBookings.length > 0 && totalPages > 1 && (
            <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-lg p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentPage === 1
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-white hover:bg-[#2A2A2A]'
                    }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm">Previous</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    Page <span className="text-[var(--color-primary)] font-semibold">{currentPage}</span> of <span className="text-white font-semibold">{totalPages}</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    ({startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length})
                  </span>
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentPage === totalPages
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
      ) : activeTab === 'transaction' ? (
        <TransactionTab />
      ) : (
        <PaymentHistory />
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

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal />

      {/* Confirmation Modal - rendered via portal to escape parent overflow constraints */}
      {confirmModal.show && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#2A2A2A]/50">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto" style={{ backgroundColor: '#F68B24' }}>
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
                  style={{ backgroundColor: loading ? undefined : '#F68B24' }}
                >
                  {loading ? 'Processing...' : (confirmModal.action === 'confirm' ? 'Confirm' : 'Complete')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <BookingSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        branchId={user?.branch_id}
      />
      <WalkthroughOverlay steps={bookingsManagementSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />
    </div>
  )
}

export default BookingsManagement