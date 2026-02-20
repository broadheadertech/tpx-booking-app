import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, User, UserPlus, QrCode, CreditCard, Receipt, Trash2, Plus, Minus, Search, Scissors, Package, Gift, Calculator, CheckCircle, Grid3X3, List, ChevronLeft, ChevronRight, X, AlertCircle, Banknote, Store, Calendar, Clock, ChevronDown, ChevronUp, Filter, ShoppingBag, History, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import QRScannerModal from '../../components/staff/QRScannerModal'
import AddCustomerModal from '../../components/staff/AddCustomerModal'
import PaymentConfirmationModal from '../../components/staff/PaymentConfirmationModal'
import CollectPaymentModal from '../../components/staff/CollectPaymentModal'
import CustomerSelectionModal from '../../components/staff/CustomerSelectionModal'
import ReceiptModal from '../../components/staff/ReceiptModal'
import Modal from '../../components/common/Modal'
import { sendWelcomeEmail, isEmailServiceConfigured, sendBarberBookingNotification } from '../../services/emailService'
import { APP_VERSION } from '../../config/version'
import { useAppModal } from '../../context/AppModalContext'
import WalkthroughOverlay from '../../components/common/WalkthroughOverlay'
import { posSteps } from '../../config/walkthroughSteps'

// Barber Avatar Component for POS
const BarberAvatar = ({ barber, className = "w-12 h-12" }) => {
  const [imageError, setImageError] = useState(false)

  // Get image URL from Convex storage if available (pass undefined if no storageId)
  const imageUrlFromStorage = useQuery(api.services.barbers.getImageUrl, {
    storageId: barber.avatarStorageId
  })

  // Use storage URL if available, otherwise fallback to regular avatar or default
  const imageSrc = imageUrlFromStorage || barber.avatarUrl || '/img/avatar_default.jpg'

  if (imageError || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 rounded-full ${className}`}>
        <User className="w-6 h-6 text-gray-500" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={`${barber.full_name} avatar`}
      className={`${className} rounded-full object-cover`}
      onError={() => setImageError(true)}
    />
  )
}

const POS = () => {
  const { showAlert, showPrompt } = useAppModal()
  const { user, loading } = useCurrentUser()
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [currentTransaction, setCurrentTransaction] = useState({
    customer: null,
    customer_name: null,
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    services: [],
    products: [],
    subtotal: 0,
    discount_amount: 0,
    voucher_applied: null,
    tax_amount: 0,
    booking_fee: 0,
    late_fee: 0,
    total_amount: 0
  })
  const [activeModal, setActiveModal] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('services') // 'services' or 'products'
  const [posMode, setPosMode] = useState('service') // 'service' or 'retail' - retail mode for product-only sales
  const [selectedCategory, setSelectedCategory] = useState(null) // Category filter: 'Haircut', 'Package', 'Other Services', or null for all
  const [openCategory, setOpenCategory] = useState(null) // For category dropdown toggle
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [viewMode, setViewMode] = useState('card') // 'card' or 'table'
  const [currentPage, setCurrentPage] = useState(1)
  const [currentBooking, setCurrentBooking] = useState(null) // Store booking data for POS
  const [newCustomerCredentials, setNewCustomerCredentials] = useState(null) // Store new customer credentials
  const [completedTransaction, setCompletedTransaction] = useState(null) // Store completed transaction for receipt
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'warning' }) // Alert modal state
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false) // Collect Payment modal (Story 8.2)
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false) // Mark Complete confirmation (Story 8.3)
  const [unpaidBalanceWarning, setUnpaidBalanceWarning] = useState(null) // Unpaid balance warning data
  const [showTodaysBookings, setShowTodaysBookings] = useState(false) // Today's Bookings section (Story 8.4)
  const [todaysBookingsFilter, setTodaysBookingsFilter] = useState('all') // Payment status filter
  const [showTutorial, setShowTutorial] = useState(false)
  const [showProductHistory, setShowProductHistory] = useState(false) // Product transaction history

  // Mobile-specific states
  const [showMobileCart, setShowMobileCart] = useState(false)
  const [expandedSection, setExpandedSection] = useState('catalog') // 'barber', 'customer', 'catalog'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  const itemsPerPage = 9 // For card view
  const tableItemsPerPage = 15 // For table view

  // Ref to track when we're intentionally clearing a booking (prevents useEffect from re-applying booking fee)
  const clearingBookingRef = useRef(false)

  // Detect mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Convex queries - use branch-scoped queries for staff
  const services = user?.role === 'super_admin'
    ? useQuery(api.services.services.getAllServices)
    : user?.branch_id
      ? useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id })
      : []

  const products = useQuery(api.services.products.getAllProducts) // Products remain global

  const barbers = user?.role === 'super_admin'
    ? useQuery(api.services.barbers.getAllBarbers)
    : user?.branch_id
      ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
      : []

  const customers = user?.role === 'super_admin'
    ? useQuery(api.services.auth.getAllUsers)
    : user?.branch_id
      ? useQuery(api.services.auth.getUsersByBranch, { branch_id: user.branch_id })
      : []

  // Get branch information for the current user
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const currentBranch = branches.find(b => b._id === user?.branch_id)

  // Convex mutations
  const createTransaction = useMutation(api.services.transactions.createTransaction)
  const updateBookingPaymentStatus = useMutation(api.services.bookings.updatePaymentStatus)
  const updateBookingStatus = useMutation(api.services.bookings.updateBooking)
  const createUser = useMutation(api.services.auth.createUser)
  const markBookingComplete = useMutation(api.services.bookings.markBookingComplete) // Story 8.3

  // Query for today's bookings with payment status (Story 8.4 - FR17)
  const todaysBookings = useQuery(
    api.services.bookings.getTodaysBookingsWithPaymentStatus,
    user?.branch_id ? { branch_id: user.branch_id, payment_status_filter: todaysBookingsFilter } : "skip"
  ) || []
  const getVoucherByCode = useQuery(
    api.services.vouchers.getVoucherByCode,
    currentTransaction.voucher_applied && typeof currentTransaction.voucher_applied === 'string' && /[A-Z]/.test(currentTransaction.voucher_applied) && !/[a-z]/.test(currentTransaction.voucher_applied)
      ? { code: currentTransaction.voucher_applied }
      : "skip"
  )

  // Query for product transaction history
  const productTransactionHistory = useQuery(
    api.services.transactions.getProductTransactionHistory,
    user?.branch_id ? { branch_id: user.branch_id, limit: 20 } : "skip"
  ) || []

  // Query wallet balance for registered customers (for wallet payment option at POS)
  const customerIdForWallet = currentTransaction.customer?._id || currentBooking?.customer || null
  const customerWalletBalance = useQuery(
    api.services.wallet.getCustomerWalletBalance,
    customerIdForWallet ? { user_id: customerIdForWallet } : "skip"
  )

  // Filter active services and products
  const activeServices = services?.filter(service => service.is_active) || []
  const activeProducts = products?.filter(product => product.status === 'active') || []
  const activeBarbers = barbers?.filter(barber => barber.is_active) || []

  // Check for booking data from BookingsManagement
  useEffect(() => {
    const posBooking = sessionStorage.getItem('posBooking')
    if (posBooking && services !== undefined) {
      try {
        const booking = JSON.parse(posBooking)

        // Store booking data for display
        setCurrentBooking(booking)

        // Try to find the customer from the customers query
        let customer = null
        if (customers && customers.length > 0) {
          customer = customers.find(c => c._id === booking.customer)
        }

        // If customer not found in query, use booking's stored customer data
        if (!customer && booking.customer_name) {
          // Create a customer object from booking data
          customer = {
            _id: booking.customer,
            username: booking.customer_name,
            mobile_number: booking.customer_phone || '',
            email: booking.customer_email || '',
            address: booking.customer_address || ''
          }
          console.log('Using customer data from booking:', customer)
        }

        if (!customer) {
          console.error('Customer not found for booking and no customer data in booking')
          return
        }

        // Find the service - with optional chaining and error handling
        const service = services?.find(s => s._id === booking.service)
        if (!service) {
          console.error('Service not found for booking:', booking.service)
          return
        }

        // Populate transaction with booking data
        setCurrentTransaction(prev => ({
          ...prev,
          customer: customer,
          customer_name: customer.username,
          customer_phone: customer.mobile_number || '',
          customer_email: customer.email || '',
          customer_address: customer.address || '',
          services: [{
            service_id: service._id,
            service_name: service.name,
            price: booking.price || service.price, // Use original price as discount is applied separately
            quantity: 1
          }],
          subtotal: booking.price || service.price,
          discount_amount: booking.discount_amount || 0, // Track discount from booking
          voucher_applied: booking.voucher_id || null, // Track voucher if used
          booking_fee: booking.booking_fee || 0, // Track booking fee
          late_fee: 0, // Initialize late fee as 0
          total_amount: (booking.price || service.price) - (booking.discount_amount || 0) + (booking.booking_fee || 0) // Calculate initial total
        }))

        // Find and set the barber
        if (booking.barber && barbers) {
          const barber = barbers.find(b => b._id === booking.barber)
          if (barber) {
            setSelectedBarber(barber)
          }
        }

        // Don't clear session storage here - we'll clear it after payment

      } catch (error) {
        console.error('Error parsing booking data:', error)
      }
    }
  }, [services, customers, barbers])

  // Ensure booking fee is 0 for walk-ins (no booking attached)
  // Booking fees only apply to online bookings
  useEffect(() => {
    // Skip if we're intentionally clearing a booking (prevents race condition)
    if (clearingBookingRef.current) {
      return
    }

    // Walk-ins should NEVER have a booking fee
    if (!currentBooking && currentTransaction.booking_fee !== 0) {
      setCurrentTransaction(prev => ({ ...prev, booking_fee: 0 }))
    }
  }, [currentBooking, currentTransaction.booking_fee])

  const customerUsers = customers?.filter(customer => customer.role === 'customer') || []

  // Handle canceling booking attachment
  const handleCancelBookingAttachment = () => {
    setActiveModal('cancelBooking')
  }

  // Handle confirmed booking cancellation
  const handleConfirmCancelBooking = () => {
    // Set flag to prevent useEffect from re-applying booking fee during clearing
    clearingBookingRef.current = true

    // Clear booking data
    setCurrentBooking(null)
    sessionStorage.removeItem('posBooking')

    // Reset transaction to remove booking-specific data
    setCurrentTransaction(prev => ({
      ...prev,
      // Keep customer and barber information if they exist
      customer: prev.customer,
      customer_name: prev.customer_name,
      customer_phone: prev.customer_phone,
      customer_email: prev.customer_email,
      customer_address: prev.customer_address,
      barber: prev.barber || null,
      // Clear services and products that were loaded from booking
      services: [],
      products: [],
      // Reset financial data
      subtotal: 0,
      discount_amount: 0,
      voucher_applied: null,
      tax_amount: 0,
      booking_fee: 0,
      late_fee: 0,
      total_amount: 0,
      // Reset fee metadata
      late_fee_minutes: 0,
      late_fee_hours: 0
    }))

    console.log('Booking attachment canceled - converted to regular POS transaction')
    setActiveModal(null)

    // Reset the flag after state updates have completed
    setTimeout(() => {
      clearingBookingRef.current = false
    }, 100)
  }

  // Handle marking booking as complete (Story 8.3 - FR16)
  const handleMarkComplete = async (forceComplete = false) => {
    if (!currentBooking || !user?._id) return

    try {
      const result = await markBookingComplete({
        booking_id: currentBooking._id,
        completed_by: user._id,
        force_complete: forceComplete,
      })

      if (result.requires_confirmation) {
        // Show warning modal with unpaid balance
        setUnpaidBalanceWarning({
          amount: result.unpaid_balance,
          message: result.message,
        })
        setShowCompleteConfirmModal(true)
        return
      }

      if (result.success) {
        // Update local booking state to completed
        setCurrentBooking(prev => ({ ...prev, status: 'completed' }))
        setShowCompleteConfirmModal(false)
        setUnpaidBalanceWarning(null)

        // Update booking price if services were changed at POS
        const originalServicePrice = currentBooking.service_price || currentBooking.price || 0
        const bookingFee = currentBooking.convenience_fee_paid || 0
        const currentTotal = currentTransaction.total_amount || (originalServicePrice + bookingFee)
        if (currentTotal !== originalServicePrice) {
          try {
            await updateBookingPaymentStatus({
              id: currentBooking._id,
              payment_status: 'paid',
              price: currentTotal,
              final_price: currentTotal - (currentTransaction.discount_amount || 0)
            })
          } catch (err) {
            console.error('Failed to update booking price:', err)
          }
        }

        // Generate receipt data for the completed booking
        const timestamp = Date.now()
        const receiptNumber = `RCP-${timestamp}`
        const total = currentTotal

        // Determine payment info based on booking payment status
        let paymentMethod = 'cash'
        let amountPaid = 0
        let amountDue = total

        if (currentBooking.payment_status === 'paid') {
          const onlinePaid = originalServicePrice + bookingFee
          paymentMethod = 'online_payment'
          amountPaid = onlinePaid
          amountDue = Math.max(0, total - onlinePaid)
        } else if (currentBooking.payment_status === 'partial') {
          paymentMethod = 'partial_online'
          amountPaid = bookingFee
          amountDue = total - bookingFee
        }

        const receiptData = {
          transaction_id: `TXN-${timestamp}`,
          receipt_number: receiptNumber,
          timestamp,
          customer_name: currentBooking.customer_name || 'Walk-in Customer',
          barber_name: selectedBarber?.name || currentBooking.barber_name || 'Not assigned',
          services: [{
            service_name: currentBooking.service_name,
            name: currentBooking.service_name,
            quantity: 1,
            price: originalServicePrice
          }],
          products: [],
          subtotal: originalServicePrice,
          discount_amount: 0,
          tax_amount: 0,
          booking_fee: bookingFee,
          late_fee: 0,
          total_amount: total,
          payment_method: paymentMethod,
          amount_paid: amountPaid,
          amount_due: amountDue,
          payment_status: currentBooking.payment_status || 'unpaid',
          booking_code: currentBooking.booking_code,
          booking_date: currentBooking.date,
          booking_time: currentBooking.time,
        }

        // Show receipt modal instead of alert
        setCompletedTransaction(receiptData)
        setActiveModal('receipt')
      }
    } catch (error) {
      console.error('Failed to mark booking complete:', error)
      setAlertModal({
        show: true,
        title: 'Error',
        message: 'Failed to mark booking as complete. Please try again.',
        type: 'error'
      })
    }
  }

  // Generate receipt data from current booking/transaction
  const generateBookingReceipt = () => {
    if (!currentBooking && currentTransaction.services.length === 0 && currentTransaction.products.length === 0) {
      return null
    }

    const timestamp = Date.now()
    const receiptNumber = `RCP-${timestamp}`

    // Build services array from currentTransaction or currentBooking
    const services = currentTransaction.services.length > 0
      ? currentTransaction.services.map(s => ({
          service_name: s.name,
          name: s.name,
          quantity: s.quantity || 1,
          price: s.price || 0
        }))
      : currentBooking ? [{
          service_name: currentBooking.service_name,
          name: currentBooking.service_name,
          quantity: 1,
          price: currentBooking.service_price || 0
        }] : []

    // Build products array
    const products = currentTransaction.products.map(p => ({
      product_name: p.name,
      name: p.name,
      quantity: p.quantity || 1,
      price: p.price || 0
    }))

    // Calculate totals
    const serviceTotal = services.reduce((sum, s) => sum + (s.price * (s.quantity || 1)), 0)
    const productTotal = products.reduce((sum, p) => sum + (p.price * (p.quantity || 1)), 0)
    const subtotal = currentTransaction.subtotal || serviceTotal + productTotal
    const bookingFee = currentTransaction.booking_fee || currentBooking?.convenience_fee_paid || 0
    const discount = currentTransaction.discount_amount || 0
    const total = currentTransaction.total_amount || (subtotal + bookingFee - discount)

    // Determine payment method and amounts based on booking status
    let paymentMethod = 'pending'
    let amountPaid = 0
    let amountDue = total

    if (currentBooking) {
      if (currentBooking.payment_status === 'paid') {
        const onlinePaid = (currentBooking.service_price || 0) + (currentBooking.convenience_fee_paid || 0)
        paymentMethod = 'online_payment'
        amountPaid = onlinePaid
        amountDue = Math.max(0, total - onlinePaid)
      } else if (currentBooking.payment_status === 'partial') {
        paymentMethod = 'partial_online'
        amountPaid = currentBooking.convenience_fee_paid || 0
        amountDue = total - amountPaid
      } else {
        paymentMethod = 'pay_at_shop'
        amountPaid = 0
        amountDue = total
      }
    }

    return {
      transaction_id: `TXN-${timestamp}`,
      receipt_number: receiptNumber,
      timestamp,
      customer_name: currentTransaction.customer?.full_name || currentBooking?.customer_name || 'Walk-in Customer',
      barber_name: selectedBarber?.name || currentBooking?.barber_name || 'Not assigned',
      services,
      products,
      subtotal,
      discount_amount: discount,
      tax_amount: currentTransaction.tax_amount || 0,
      booking_fee: bookingFee,
      late_fee: currentTransaction.late_fee || 0,
      total_amount: total,
      payment_method: paymentMethod,
      amount_paid: amountPaid,
      amount_due: amountDue,
      payment_status: currentBooking?.payment_status || 'unpaid',
      booking_code: currentBooking?.booking_code || null,
      booking_date: currentBooking?.date || null,
      booking_time: currentBooking?.time || null,
    }
  }

  // Handle showing receipt for current booking/transaction
  const handleShowReceipt = () => {
    const receiptData = generateBookingReceipt()
    if (!receiptData) {
      setAlertModal({
        show: true,
        title: 'No Data',
        message: 'Please load a booking or add items to generate a receipt.',
        type: 'warning'
      })
      return
    }
    setCompletedTransaction(receiptData)
    setActiveModal('receipt')
  }

  // Handle loading a booking from Today's Bookings list (Story 8.4)
  const handleLoadBookingFromList = (booking) => {
    setCurrentBooking({
      _id: booking._id,
      booking_code: booking.booking_code,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      service_name: booking.service_name,
      barber_name: booking.barber_name,
      date: booking.date,
      time: booking.time,
      payment_status: booking.payment_status,
      service_price: booking.service_price,
      convenience_fee_paid: booking.convenience_fee_paid,
      cash_collected: booking.cash_collected,
      status: booking.status,
    })
    setShowTodaysBookings(false)
  }

  // Map service categories to standard categories
  const mapServiceCategory = (category) => {
    if (!category) return 'Other Services'
    const catLower = category.toLowerCase()
    if (catLower.includes('haircut') || catLower.includes('hair')) {
      return 'Haircut'
    }
    if (catLower.includes('package')) {
      return 'Package'
    }
    return 'Other Services'
  }

  // Group services by category
  const servicesByCategory = activeServices.reduce((acc, service) => {
    const category = mapServiceCategory(service.category)
    if (!acc[category]) acc[category] = []
    acc[category].push(service)
    return acc
  }, {})

  // Filter items based on search term and category
  const filterServicesByCategory = (services) => {
    return services.filter(service =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.category && service.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }

  const filteredServices = selectedCategory
    ? filterServicesByCategory(servicesByCategory[selectedCategory] || [])
    : filterServicesByCategory(activeServices)

  const filteredProducts = activeProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Pagination logic
  const currentItemsPerPage = viewMode === 'card' ? itemsPerPage : tableItemsPerPage
  const currentFilteredItems = activeTab === 'services' ? filteredServices : filteredProducts
  const totalPages = Math.ceil(currentFilteredItems.length / currentItemsPerPage)
  const startIndex = (currentPage - 1) * currentItemsPerPage
  const endIndex = startIndex + currentItemsPerPage
  const paginatedItems = currentFilteredItems.slice(startIndex, endIndex)

  // Reset to page 1 when search term changes or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab, viewMode, selectedCategory])

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  // Calculate totals
  useEffect(() => {
    // Skip calculation if we're clearing (prevents race conditions)
    if (clearingBookingRef.current) {
      return
    }

    const servicesTotal = currentTransaction.services.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const productsTotal = currentTransaction.products.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const subtotal = servicesTotal + productsTotal
    const taxAmount = 0 // No tax

    // Calculate booking fee - ONLY for online bookings with items in cart
    let bookingFee = 0

    // Only apply booking fee if:
    // 1. There's an attached booking (online booking)
    // 2. AND there are items in the cart (subtotal > 0)
    // If cart is empty, no booking fee should show
    if (currentBooking && subtotal > 0) {
      // For online bookings, use the stored booking fee from the booking
      bookingFee = currentTransaction.booking_fee || currentBooking.booking_fee || currentBooking.convenience_fee_paid || 0
    }
    // Walk-ins OR empty cart: booking fee stays 0

    const lateFee = currentTransaction.late_fee || 0
    // Total = Subtotal - Discount + Booking Fee + Late Fee
    const totalAmount = Math.max(0, subtotal - currentTransaction.discount_amount + bookingFee + lateFee)

    // Only update if values actually changed to prevent infinite loops
    if (
      subtotal !== currentTransaction.subtotal ||
      totalAmount !== currentTransaction.total_amount ||
      bookingFee !== currentTransaction.booking_fee
    ) {
      setCurrentTransaction(prev => ({
        ...prev,
        subtotal,
        tax_amount: taxAmount,
        booking_fee: bookingFee,
        total_amount: totalAmount
      }))
    }
  }, [currentTransaction.services, currentTransaction.products, currentTransaction.discount_amount, currentTransaction.booking_fee, currentTransaction.late_fee, currentBranch, currentBooking])

  // Add service to transaction
  const addService = (service) => {
    setCurrentTransaction(prev => {
      // When a booking is attached, REPLACE the service instead of adding
      // This allows staff to change the service for the booking
      if (currentBooking) {
        // Check if clicking the same service that's already in cart
        const existingIndex = prev.services.findIndex(item => item.service_id === service._id)
        if (existingIndex >= 0) {
          // Same service clicked - increment quantity (immutable update)
          const updatedServices = prev.services.map((item, idx) =>
            idx === existingIndex
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
          return { ...prev, services: updatedServices }
        } else {
          // Different service clicked - REPLACE the entire services array
          // This clears the booking service and sets the new one
          return {
            ...prev,
            services: [{
              service_id: service._id,
              service_name: service.name,
              price: service.price,
              quantity: 1
            }],
            // Also reset the voucher/discount since we're changing the service
            discount_amount: 0,
            voucher_applied: null
          }
        }
      }

      // Normal behavior when no booking is attached - add to cart
      const existingIndex = prev.services.findIndex(item => item.service_id === service._id)
      if (existingIndex >= 0) {
        // Immutable update - create new array with new object
        const updatedServices = prev.services.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        return { ...prev, services: updatedServices }
      } else {
        return {
          ...prev,
          services: [...prev.services, {
            service_id: service._id,
            service_name: service.name,
            price: service.price,
            quantity: 1
          }]
        }
      }
    })
  }

  // Add product to transaction
  const addProduct = (product) => {
    setCurrentTransaction(prev => {
      const existingIndex = prev.products.findIndex(item => item.product_id === product._id)
      if (existingIndex >= 0) {
        // Create new array with new object to avoid mutation
        const updatedProducts = prev.products.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
        return { ...prev, products: updatedProducts }
      } else {
        return {
          ...prev,
          products: [...prev.products, {
            product_id: product._id,
            product_name: product.name,
            price: product.price,
            quantity: 1
          }]
        }
      }
    })
  }

  // Update item quantity
  const updateQuantity = (type, index, change) => {
    setCurrentTransaction(prev => {
      const newQuantity = Math.max(0, prev[type][index].quantity + change)
      if (newQuantity === 0) {
        // Remove item - create new array without the item
        return { ...prev, [type]: prev[type].filter((_, idx) => idx !== index) }
      }
      // Update quantity - create new array with new object
      const items = prev[type].map((item, idx) =>
        idx === index
          ? { ...item, quantity: newQuantity }
          : item
      )
      return { ...prev, [type]: items }
    })
  }

  // Remove item from transaction
  const removeItem = (type, index) => {
    setCurrentTransaction(prev => {
      const items = [...prev[type]]
      items.splice(index, 1)
      return { ...prev, [type]: items }
    })
  }

  // Clear transaction
  const clearTransaction = () => {
    // Set flag to prevent useEffect from re-applying booking fee during clearing
    clearingBookingRef.current = true

    setCurrentTransaction({
      customer: null,
      customer_name: null,
      customer_phone: '',
      customer_email: '',
      customer_address: '',
      services: [],
      products: [],
      subtotal: 0,
      discount_amount: 0,
      voucher_applied: null,
      tax_amount: 0,
      booking_fee: 0,
      late_fee: 0,
      total_amount: 0
    })

    // Also clear any attached booking
    setCurrentBooking(null)
    sessionStorage.removeItem('posBooking')

    // Reset the flag after state updates have completed
    setTimeout(() => {
      clearingBookingRef.current = false
    }, 100)
  }

  // Handle POS mode switch (service <-> retail)
  const handleModeSwitch = (newMode) => {
    if (newMode !== posMode) {
      // Clear transaction when switching modes
      clearTransaction()
      setSelectedBarber(null)
      setPosMode(newMode)
      // Auto-switch to products tab in retail mode
      if (newMode === 'retail') {
        setActiveTab('products')
      }
    }
  }

  // Open payment confirmation modal
  const openPaymentModal = () => {
    if (!user || !user._id) {
      setAlertModal({
        show: true,
        title: 'Authentication Required',
        message: 'User not authenticated. Please log in again.',
        type: 'error'
      })
      return
    }

    // Barber only required for service mode
    if (posMode === 'service' && !selectedBarber) {
      setAlertModal({
        show: true,
        title: 'Barber Required',
        message: 'Please select a barber before processing payment.',
        type: 'warning'
      })
      return
    }

    // Ensure we have a valid branch context (prefer barber's branch, then user's branch)
    const resolvedBranchId = selectedBarber?.branch_id || user?.branch_id
    if (!resolvedBranchId) {
      setAlertModal({
        show: true,
        title: 'Branch Required',
        message: 'No branch selected or associated. Please select a barber from a branch or set your branch.',
        type: 'warning'
      })
      return
    }

    // Validate items based on mode
    if (posMode === 'service' && currentTransaction.services.length === 0) {
      setAlertModal({
        show: true,
        title: 'Service Required',
        message: 'Please add at least one service before processing payment in Service Mode.',
        type: 'warning'
      })
      return
    }

    if (posMode === 'retail' && currentTransaction.products.length === 0) {
      setAlertModal({
        show: true,
        title: 'Product Required',
        message: 'Please add at least one product before processing payment in Retail Mode.',
        type: 'warning'
      })
      return
    }

    // Validate customer information for walk-in customers
    if (!currentTransaction.customer && (!currentTransaction.customer_name || currentTransaction.customer_name.trim() === '')) {
      setAlertModal({
        show: true,
        title: 'Customer Name Required',
        message: 'Please enter customer name for walk-in customer.',
        type: 'warning'
      })
      return
    }

    setActiveModal('paymentConfirmation')
  }

  // Generate secure password for new users
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  // Process payment after confirmation
  const processPayment = async (paymentData) => {
    try {
      // Resolve branch to use for the transaction (barber branch takes precedence)
      const resolvedBranchId = selectedBarber?.branch_id || user?.branch_id
      if (!resolvedBranchId) {
        setAlertModal({
          show: true,
          title: 'Branch Required',
          message: 'Cannot process payment: Missing branch. Please select a barber from a branch or set your branch.',
          type: 'error'
        })
        return
      }

      let finalCustomerId = currentTransaction.customer?._id

      // Auto-register walk-in customer ONLY if they have a valid email
      // Check if email exists and is not empty after trimming
      const hasValidEmail = currentTransaction.customer_email &&
        currentTransaction.customer_email.trim() !== '' &&
        currentTransaction.customer_email.includes('@')

      if (!currentTransaction.customer && currentTransaction.customer_name && hasValidEmail) {
        try {
          const generatedPassword = generateSecurePassword()
          const newUser = await createUser({
            username: currentTransaction.customer_name.trim(),
            email: currentTransaction.customer_email.trim(),
            password: generatedPassword,
            mobile_number: currentTransaction.customer_phone?.trim() || undefined,
            role: 'customer',
            branch_id: user.branch_id // Assign new customers to the current branch
          })

          finalCustomerId = newUser._id

          // Send welcome email to the new customer
          if (isEmailServiceConfigured()) {
            try {
              const emailResult = await sendWelcomeEmail({
                email: currentTransaction.customer_email.trim(),
                username: currentTransaction.customer_name.trim(),
                password: generatedPassword,
                loginUrl: `${window.location.origin}/auth/login`
              })

              if (emailResult.success) {
                console.log('Welcome email sent successfully to:', currentTransaction.customer_email.trim())
              } else {
                console.warn('Failed to send welcome email:', emailResult.error)
              }
            } catch (emailError) {
              console.error('Error sending welcome email:', emailError)
            }
          } else {
            console.warn('Email service not configured - welcome email not sent')
          }

          // Show password to staff for customer
          setActiveModal('customerCreated')
          setNewCustomerCredentials({
            email: currentTransaction.customer_email.trim(),
            password: generatedPassword
          })
        } catch (error) {
          console.error('Failed to create user account:', error)
          // Continue with transaction even if user creation fails
          // The transaction will still record customer_name without an account
        }
      }
      // Debug logging
      console.log('Current transaction voucher_applied:', currentTransaction.voucher_applied)
      console.log('Current transaction voucher_applied type:', typeof currentTransaction.voucher_applied)

      // Handle voucher ID conversion if needed
      let voucherApplied = currentTransaction.voucher_applied
      if (typeof voucherApplied === 'string') {
        const looksLikeConvexId = voucherApplied.includes(':')
        if (!looksLikeConvexId && getVoucherByCode?._id) {
          console.log('Converting voucher code to ID via query:', voucherApplied)
          voucherApplied = getVoucherByCode._id
        }
      }

      // Validate all required fields before creating transaction
      if (!resolvedBranchId) {
        throw new Error('Branch ID is required for transaction')
      }
      // Barber only required for service mode
      if (posMode === 'service' && !selectedBarber?._id) {
        throw new Error('Barber ID is required for service transactions')
      }
      if (!user?._id) {
        throw new Error('Staff ID (processed_by) is required for transaction')
      }
      // Validate based on mode
      if (posMode === 'service' && (!currentTransaction.services || currentTransaction.services.length === 0)) {
        throw new Error('At least one service is required for service transactions')
      }
      if (posMode === 'retail' && (!currentTransaction.products || currentTransaction.products.length === 0)) {
        throw new Error('At least one product is required for retail transactions')
      }

      const transactionData = {
        customer: finalCustomerId || undefined,
        customer_name: currentTransaction.customer_name?.trim() || undefined, // Always record name, even without account
        customer_phone: currentTransaction.customer_phone?.trim() || undefined,
        customer_email: currentTransaction.customer_email?.trim() || undefined, // Only include if provided
        branch_id: resolvedBranchId, // Ensure branch_id is provided (barber branch preferred)
        transaction_type: posMode, // 'service' or 'retail'
        barber: posMode === 'service' ? selectedBarber._id : undefined, // Barber only for service mode
        services: posMode === 'service' ? currentTransaction.services : [], // Empty array for retail
        products: currentTransaction.products.length > 0 ? currentTransaction.products : undefined,
        subtotal: currentTransaction.subtotal,
        discount_amount: currentTransaction.discount_amount,
        voucher_applied: (typeof voucherApplied === 'string' && !voucherApplied.includes(':'))
          ? undefined
          : voucherApplied || undefined,
        tax_amount: currentTransaction.tax_amount,
        booking_fee: currentTransaction.booking_fee,
        late_fee: currentTransaction.late_fee,
        total_amount: paymentData.total_amount ?? currentTransaction.total_amount,
        payment_method: paymentData.payment_method,
        payment_status: 'completed',
        processed_by: user._id,
        cash_received: paymentData.cash_received,
        change_amount: paymentData.change_amount,
        // Combo payment fields (wallet + cash/card)
        wallet_used: paymentData.wallet_used,
        cash_collected: paymentData.cash_collected
      }

      console.log('Final voucher_applied value:', voucherApplied)
      console.log('Final voucher_applied type:', typeof voucherApplied)
      console.log('Transaction data voucher_applied:', transactionData.voucher_applied)

      // Check if this transaction is for a booking payment
      const posBooking = sessionStorage.getItem('posBooking')
      const isBookingPayment = !!posBooking && currentTransaction.services.length > 0
      // Skip booking creation for retail mode or if it's a booking payment
      const shouldSkipBookingCreation = posMode === 'retail' || isBookingPayment

      console.log('[POS] Transaction preparation:', {
        posMode: posMode,
        hasBookingInSession: !!posBooking,
        servicesCount: currentTransaction.services.length,
        productsCount: currentTransaction.products.length,
        isBookingPayment: isBookingPayment,
        skip_booking_creation: shouldSkipBookingCreation
      })

      // Include the skip_booking_creation flag in transaction data
      console.log('[POS] Creating transaction with data:', {
        ...transactionData,
        skip_booking_creation: shouldSkipBookingCreation
      })

      // Parse booking ID for server-side price update
      const parsedBookingId = isBookingPayment ? JSON.parse(posBooking)?._id : undefined

      const result = await createTransaction({
        ...transactionData,
        skip_booking_creation: shouldSkipBookingCreation,
        booking_id: parsedBookingId
      })

      console.log('[POS] Transaction created successfully:', result)
      console.log('[POS] Booking update info:', { booking_updated: result.booking_updated, booking_id: result.booking_id, parsedBookingId })

      // Send email notification to the barber about the new POS transaction (only for service mode)
      console.log('📧 [POS] Attempting to send barber notification...');
      console.log('  → posMode:', posMode);
      console.log('  → selectedBarber:', selectedBarber?.full_name);
      console.log('  → selectedBarber.email:', selectedBarber?.email);
      console.log('  → services count:', currentTransaction.services.length);

      // Only send barber notification for service transactions
      if (posMode === 'service' && selectedBarber?.email && currentTransaction.services.length > 0) {
        try {
          // Get the current date in Philippine timezone
          const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
          const phDateString = `${phNow.getFullYear()}-${String(phNow.getMonth() + 1).padStart(2, '0')}-${String(phNow.getDate()).padStart(2, '0')}`;
          const phTimeString = `${String(phNow.getHours()).padStart(2, '0')}:${String(phNow.getMinutes()).padStart(2, '0')}`;

          const emailResult = await sendBarberBookingNotification({
            barberEmail: selectedBarber.email,
            barberName: selectedBarber.full_name,
            customerName: currentTransaction.customer_name || currentTransaction.customer?.username || 'Walk-in Customer',
            customerPhone: currentTransaction.customer_phone || currentTransaction.customer?.mobile_number,
            customerEmail: currentTransaction.customer_email || currentTransaction.customer?.email,
            serviceName: currentTransaction.services.map(s => s.service_name).join(', '),
            servicePrice: currentTransaction.total_amount,
            bookingDate: phDateString,
            bookingTime: phTimeString,
            branchName: currentBranch?.name,
            bookingCode: result.receipt_number || null,
            bookingType: 'pos'
          });
          console.log('📧 [POS] Email send result:', emailResult);
        } catch (emailError) {
          // Don't fail the transaction if email fails
          console.error('❌ [POS] Failed to send barber notification email:', emailError);
        }
      } else {
        console.warn('⚠️ [POS] Barber notification skipped: No barber email or no services');
        console.warn('  → selectedBarber:', JSON.stringify(selectedBarber, null, 2));
        console.warn('  → services count:', currentTransaction.services.length);
      }

      // Update the existing booking if this is a booking payment
      if (isBookingPayment) {
        const booking = JSON.parse(posBooking)
        const finalTotal = currentTransaction.total_amount

        // ALWAYS update booking with final price — no conditional checks
        console.log('[POS] Updating booking:', { bookingId: booking._id, finalTotal })
        try {
          await updateBookingPaymentStatus({
            id: booking._id,
            payment_status: 'paid',
            price: finalTotal,
            final_price: finalTotal - (currentTransaction.discount_amount || 0),
            notes: result.receipt_number,
          })
          console.log('[POS] Booking price set to:', finalTotal)
        } catch (error) {
          console.error('[POS] FAILED to update booking:', error)
          showAlert({ title: 'Price Update Issue', message: `Failed: ${error.message}`, type: 'warning' })
        }

        // Clear the session storage after successful processing
        sessionStorage.removeItem('posBooking')
        setCurrentBooking(null)
      }

      // Show enhanced success message based on transaction type
      const hasServices = currentTransaction.services.length > 0
      const hasProducts = currentTransaction.products.length > 0

      let successMessage = 'Transaction completed successfully!'

      if (isBookingPayment) {
        const booking = JSON.parse(posBooking)
        successMessage = `Booking payment completed! Booking #${booking.booking_code} has been marked as completed and paid.`
      } else if (hasServices || hasProducts) {
        const serviceCount = currentTransaction.services.length
        const productCount = currentTransaction.products.length
        const items = []
        if (serviceCount > 0) items.push(`${serviceCount} service${serviceCount > 1 ? 's' : ''}`)
        if (productCount > 0) items.push(`${productCount} product${productCount > 1 ? 's' : ''}`)
        successMessage = `POS transaction completed! ${items.join(' and ')} processed successfully.`
      }

      // Generate transaction identifiers for receipt
      const timestamp = Date.now()
      const transactionId = `TXN-${timestamp}`
      const receiptNumber = `RCP-${timestamp}`

      // Store completed transaction data for receipt
      const completedTransactionData = {
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        timestamp: timestamp,
        customer_name: currentTransaction.customer_name,
        barber_name: selectedBarber?.full_name || (posMode === 'retail' ? 'Retail Sale' : 'N/A'),
        services: currentTransaction.services,
        products: currentTransaction.products,
        subtotal: currentTransaction.subtotal,
        discount_amount: currentTransaction.discount_amount,
        tax_amount: currentTransaction.tax_amount,
        booking_fee: currentTransaction.booking_fee,
        late_fee: currentTransaction.late_fee,
        total_amount: currentTransaction.total_amount,
        payment_method: paymentData.payment_method,
        cash_received: paymentData.cash_received,
        change_amount: paymentData.change_amount
      }

      setCompletedTransaction(completedTransactionData)

      // Show receipt modal instead of generic success
      setActiveModal('receipt')

      // Clear transaction data after showing receipt
      clearTransaction()
      setSelectedBarber(null)
    } catch (error) {
      console.error('Transaction failed:', error)
      console.error('Error details:', {
        message: error.message,
        data: error.data,
        stack: error.stack
      })

      // Provide more specific error messages
      let errorMessage = 'Transaction failed. Please try again.'
      if (error.message) {
        if (error.message.includes('TRANSACTION_INVALID_CUSTOMER_NAME')) {
          errorMessage = 'Please enter a valid customer name for walk-in customers.'
        } else if (error.message.includes('validation')) {
          errorMessage = 'Invalid transaction data. Please check all fields and try again.'
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check your access rights.'
        } else {
          errorMessage = `Transaction failed: ${error.message}`
        }
      }

      showAlert({ title: 'Transaction Failed', message: errorMessage, type: 'error' })
      setActiveModal(null)
    }
  }

  // Handle customer selection
  const handleCustomerSelection = (customerData) => {
    setCurrentTransaction(prev => ({
      ...prev,
      customer: customerData.customer,
      customer_name: customerData.customer_name,
      customer_phone: customerData.customer_phone,
      customer_email: customerData.customer_email || '',
      customer_address: customerData.customer_address || ''
    }))
  }

  // Handle voucher scanning with discount application
  const handleVoucherScanned = (voucher) => {
    console.log('Voucher scanned:', voucher) // Debug log

    // Ensure we have a valid voucher ID
    const voucherId = voucher._id || voucher.id
    if (!voucherId) {
      setAlertModal({
        show: true,
        title: 'Invalid Voucher',
        message: 'Invalid voucher: No ID found',
        type: 'error'
      })
      return
    }

    // Apply voucher discount
    setCurrentTransaction(prev => ({
      ...prev,
      voucher_applied: voucherId,
      discount_amount: voucher.value || 0
    }))
    setActiveModal(null)
    setAlertModal({
      show: true,
      title: 'Voucher Applied',
      message: `Voucher applied successfully! Discount: ₱${voucher.value || 0}`,
      type: 'success'
    })
  }

  // Show loading if user is not loaded yet
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading POS system...</p>
        </div>
      </div>
    )
  }

  // Mobile Layout
  if (isMobile) {
    const totalItems = currentTransaction.services.length + currentTransaction.products.length

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] pb-32">
        {/* Mobile Header - Compact */}
        <div className="sticky top-0 z-50 bg-[#050505] border-b border-[#1A1A1A]/30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <Link to="/staff" className="w-9 h-9 bg-[#0A0A0A] rounded-lg flex items-center justify-center border border-[#1A1A1A]/50">
                <ArrowLeft className="w-4 h-4 text-gray-400" />
              </Link>

              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="w-9 h-9 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-bold text-white truncate">POS System</h1>
                  <p className="text-[10px] text-[var(--color-primary)]">Point of Sale</p>
                </div>
              </div>

              <button
                onClick={() => setShowMobileCart(!showMobileCart)}
                className="relative w-9 h-9 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center border border-[var(--color-primary)]/30"
              >
                <Receipt className="w-4 h-4 text-[var(--color-primary)]" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="relative z-10 px-3 py-3 space-y-3">
          {/* Barber Selection - Collapsible (Only in Service Mode) */}
          {posMode === 'service' && (
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl border border-[#444444]/50 overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'barber' ? null : 'barber')}
                className="w-full px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Scissors className="w-5 h-5 text-[var(--color-primary)]" />
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white">
                      {selectedBarber ? selectedBarber.full_name : 'Select Barber'}
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      {selectedBarber ? 'Tap to change' : 'Required'}
                    </p>
                  </div>
                </div>
                {selectedBarber ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--color-primary)]/30">
                    <BarberAvatar barber={selectedBarber} className="w-10 h-10" />
                  </div>
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSection === 'barber' && (
                <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                  {activeBarbers.map((barber) => (
                    <button
                      key={barber._id}
                      onClick={() => {
                        setSelectedBarber(barber)
                        setExpandedSection(null)
                      }}
                      className={`p-3 rounded-lg border transition-all ${selectedBarber?._id === barber._id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[#555555] hover:border-[var(--color-primary)]/50'
                        }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-2 border-2 border-[var(--color-primary)]/30">
                        <BarberAvatar barber={barber} className="w-12 h-12" />
                      </div>
                      <p className="text-[10px] font-semibold text-white text-center truncate">{barber.full_name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Retail Mode Indicator */}
          {posMode === 'retail' && (
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl border border-green-500/30 p-4">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-5 h-5 text-green-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Retail Mode Active</h3>
                  <p className="text-[10px] text-gray-400">Product-only sales - No barber required</p>
                </div>
              </div>
            </div>
          )}

          {/* Customer Selection - Collapsible */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl border border-[#444444]/50 overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'customer' ? null : 'customer')}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-[var(--color-primary)]" />
                <div className="text-left">
                  <h3 className="text-sm font-bold text-white">
                    {currentTransaction.customer?.username || currentTransaction.customer_name || 'Select Customer'}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {currentTransaction.customer ? 'Registered' : currentTransaction.customer_name ? 'Walk-in' : 'Required'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveModal('scanner')
                  }}
                  className="p-2 bg-[var(--color-primary)]/20 rounded-lg border border-[var(--color-primary)]/30 cursor-pointer hover:bg-[var(--color-primary)]/30 transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      setActiveModal('scanner')
                    }
                  }}
                >
                  <QrCode className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>

            {expandedSection === 'customer' && (
              <div className="px-4 pb-4 space-y-2">
                <button
                  onClick={() => {
                    setActiveModal('customerSelection')
                    setExpandedSection(null)
                  }}
                  className="w-full p-3 border-2 border-dashed border-[#555555] rounded-lg hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 flex items-center justify-center space-x-2 text-gray-400"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Select Existing</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTransaction(prev => ({ ...prev, customer: null, customer_name: '', customer_phone: '', customer_email: '' }))
                    setExpandedSection(null)
                  }}
                  className="w-full p-3 border-2 border-dashed border-[var(--color-primary)]/30 rounded-lg hover:border-[var(--color-primary)]hover:bg-[var(--color-primary)]/10 flex items-center justify-center space-x-2 text-[var(--color-primary)]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="text-sm font-medium">Walk-in Customer</span>
                </button>
              </div>
            )}
          </div>

          {/* Walk-in Customer Form */}
          {currentTransaction.customer_name !== undefined && currentTransaction.customer_name !== null && !currentTransaction.customer && (
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl border border-[#444444]/50 p-4 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center">
                <UserPlus className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
                Walk-in Customer Details
              </h4>
              <input
                type="text"
                placeholder="Enter customer full name"
                value={currentTransaction.customer_name || ''}
                onChange={(e) => setCurrentTransaction(prev => ({ ...prev, customer_name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg text-sm"
                required
                autoFocus
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={currentTransaction.customer_phone}
                onChange={(e) => setCurrentTransaction(prev => ({ ...prev, customer_phone: e.target.value }))}
                className="w-full px-3 py-2.5 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg text-sm"
              />
              <input
                type="email"
                placeholder="Email (for account creation)"
                value={currentTransaction.customer_email}
                onChange={(e) => setCurrentTransaction(prev => ({ ...prev, customer_email: e.target.value }))}
                className="w-full px-3 py-2.5 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg text-sm"
              />
            </div>
          )}

          {/* Current Booking Badge */}
          {currentBooking && (
            <div className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 border border-[var(--color-primary)]/30 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs font-bold text-white">Booking #{currentBooking.booking_code}</p>
                    <p className="text-[10px] text-gray-400">Processing payment</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelBookingAttachment}
                  className="p-1.5 bg-red-500/20 rounded-lg"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#2A2A2A] border border-[#444444]/50 text-white placeholder-gray-400 rounded-xl text-sm"
            />
          </div>

          {/* POS Mode Toggle - Service vs Retail */}
          <div className="flex gap-2 p-1 bg-[#1A1A1A] rounded-xl">
            <button
              onClick={() => handleModeSwitch('service')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                posMode === 'service'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Scissors className="w-4 h-4" />
              Service Mode
            </button>
            <button
              onClick={() => handleModeSwitch('retail')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                posMode === 'retail'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Retail Mode
            </button>
          </div>

          {/* Services/Products Tabs - Only show in Service Mode or when switching */}
          {posMode === 'service' && (
            <div className="flex space-x-2 bg-[#1A1A1A] rounded-xl p-1">
              <button
                onClick={() => {
                  setActiveTab('services')
                  setSelectedCategory(null)
                  setOpenCategory(null)
                }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'services'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-gray-400'
                  }`}
              >
                <Scissors className="w-4 h-4 inline mr-2" />
                Services
              </button>
              <button
                onClick={() => {
                  setActiveTab('products')
                  setSelectedCategory(null)
                  setOpenCategory(null)
                }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'products'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-gray-400'
                  }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Products
              </button>
            </div>
          )}

          {/* Category Dropdown - Only for Services */}
          {activeTab === 'services' && (
            <div className="space-y-2">
              {['Haircut', 'Package', 'Other Services'].map((categoryName) => {
                const categoryServices = servicesByCategory[categoryName] || []
                const filteredCategoryServices = filterServicesByCategory(categoryServices)

                if (filteredCategoryServices.length === 0) return null

                const isOpen = openCategory === categoryName

                return (
                  <div
                    key={categoryName}
                    className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]"
                  >
                    <button
                      onClick={() => setOpenCategory(isOpen ? null : categoryName)}
                      className="w-full text-left px-4 py-3 flex justify-between items-center text-white font-semibold hover:bg-[#222222] transition-colors rounded-lg"
                    >
                      <span className="text-sm">{categoryName}</span>
                      <span className="text-lg text-gray-400">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && (
                      <div className="space-y-2 px-4 pb-4 pt-2">
                        {filteredCategoryServices.map((service) => (
                          <button
                            key={service._id}
                            onClick={() => addService(service)}
                            className="w-full p-4 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl border border-[#444444]/50 text-left hover:border-[var(--color-primary)] transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-white text-sm mb-1">{service.name}</h4>
                                {service.description && (
                                  <p className="text-xs text-gray-400 line-clamp-1 mb-2">{service.description}</p>
                                )}
                                <div className="flex items-center space-x-3">
                                  <span className="text-base font-bold text-[var(--color-primary)]">₱{service.price}</span>
                                  {service.duration_minutes && (
                                    <span className="text-xs text-gray-500">{service.duration_minutes} min</span>
                                  )}
                                </div>
                              </div>
                              <div className="ml-3 w-10 h-10 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <Plus className="w-5 h-5 text-[var(--color-primary)]" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Products List - No Categories */}
          {activeTab === 'products' && (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product._id}
                  onClick={() => addProduct(product)}
                  className="w-full p-4 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl border border-[#444444]/50 text-left hover:border-[var(--color-primary)] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm mb-1">{product.name}</h4>
                      {product.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 mb-2">{product.description}</p>
                      )}
                      <div className="flex items-center space-x-3">
                        <span className="text-base font-bold text-[var(--color-primary)]">₱{product.price}</span>
                        <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                      </div>
                    </div>
                    <div className="ml-3 w-10 h-10 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Plus className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Mobile Product Sales History */}
          <div className="mt-4">
            <button
              onClick={() => setShowProductHistory(!showProductHistory)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl border border-[#444444]/50"
            >
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-white font-semibold text-sm">Product Sales</span>
                <span className="px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold rounded-full">
                  {productTransactionHistory.length}
                </span>
              </div>
              {showProductHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showProductHistory && (
              <div className="mt-2 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl border border-[#444444]/50 p-3">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {productTransactionHistory.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No product sales yet</p>
                  ) : (
                    productTransactionHistory.map((tx) => (
                      <div
                        key={tx._id}
                        className={`p-2 rounded-lg border ${
                          tx.transaction_type === 'retail'
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-[#1A1A1A] border-[#333333]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            {new Date(tx.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {tx.transaction_type === 'retail' ? (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded">RETAIL</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold rounded">SERVICE+</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-300 truncate">
                              {tx.products.map(p => `${p.product_name} x${p.quantity}`).join(', ')}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-green-400 ml-2">₱{tx.product_total.toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Cart Drawer */}
        {showMobileCart && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileCart(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-t-3xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#2A2A2A] border-b border-[#444444]/50 px-4 py-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Order Summary</h3>
                <button onClick={() => setShowMobileCart(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {currentTransaction.services.map((service, index) => (
                  <div key={`service-${index}`} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{service.service_name}</p>
                      <p className="text-xs text-gray-400">₱{service.price} each</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => updateQuantity('services', index, -1)}
                        className="w-7 h-7 bg-[#444444] rounded-full flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5 text-gray-300" />
                      </button>
                      <span className="w-6 text-center font-semibold text-white text-sm">{service.quantity}</span>
                      <button
                        onClick={() => updateQuantity('services', index, 1)}
                        className="w-7 h-7 bg-[var(--color-primary)] rounded-full flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}

                {currentTransaction.products.map((product, index) => (
                  <div key={`product-${index}`} className="flex items-center justify-between p-3 bg-[var(--color-primary)]/10 rounded-lg border border-[var(--color-primary)]/20">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{product.product_name}</p>
                      <p className="text-xs text-gray-400">₱{product.price} each</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => updateQuantity('products', index, -1)}
                        className="w-7 h-7 bg-[#444444] rounded-full flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5 text-gray-300" />
                      </button>
                      <span className="w-6 text-center font-semibold text-white text-sm">{product.quantity}</span>
                      <button
                        onClick={() => updateQuantity('products', index, 1)}
                        className="w-7 h-7 bg-[var(--color-primary)]rounded-full flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}

                {totalItems === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-gray-400">No items added yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation - Fixed */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#050505] border-t border-[#1A1A1A]/30 px-3 py-3 space-y-2">
          {/* Payment Summary Row */}
          <div className="flex items-center justify-between px-3">
            <div>
              <p className="text-xs text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-white">₱{currentTransaction.total_amount.toFixed(2)}</p>
              {currentTransaction.discount_amount > 0 && (
                <p className="text-xs text-green-400">-₱{currentTransaction.discount_amount.toFixed(2)} discount</p>
              )}
              {currentTransaction.booking_fee > 0 && (
                <p className="text-xs text-orange-400">+₱{currentTransaction.booking_fee.toFixed(2)} booking fee</p>
              )}
              {currentTransaction.late_fee > 0 && (
                <p className="text-xs text-red-400">+₱{currentTransaction.late_fee.toFixed(2)} late fee</p>
              )}
            </div>
            <button
              onClick={() => {
                setShowMobileCart(!showMobileCart)
              }}
              className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-white text-sm"
            >
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </button>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => clearTransaction()}
              disabled={totalItems === 0}
              className="py-3 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>

            <button
              onClick={openPaymentModal}
              disabled={
                (posMode === 'service' && !selectedBarber) ||
                (posMode === 'service' && currentTransaction.services.length === 0) ||
                (posMode === 'retail' && currentTransaction.products.length === 0)
              }
              className="py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl hover:from-[var(--color-accent)] hover:to-[var(--color-accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Now</span>
            </button>
          </div>
        </div>

        {/* All Modals - Shared between mobile and desktop */}
        {activeModal === 'scanner' && (
          <QRScannerModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            onVoucherScanned={handleVoucherScanned}
            onBookingScanned={(booking) => {
              if (booking.customer) {
                setCurrentTransaction(prev => ({
                  ...prev,
                  customer: booking.customer
                }))
              }
              setActiveModal(null)
            }}
          />
        )}

        {activeModal === 'customerSelection' && (
          <CustomerSelectionModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            onCustomerSelected={handleCustomerSelection}
            onScanQR={() => setActiveModal('scanner')}
            onAddNewCustomer={() => setActiveModal('addCustomer')}
          />
        )}

        {activeModal === 'addCustomer' && (
          <AddCustomerModal
            isOpen={true}
            onClose={() => setActiveModal('customerSelection')}
            onCustomerAdded={(customer) => {
              setCurrentTransaction(prev => ({
                ...prev,
                customer: customer
              }))
              setActiveModal(null)
            }}
          />
        )}

        {activeModal === 'paymentConfirmation' && (
          <PaymentConfirmationModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            onConfirm={processPayment}
            transactionData={{
              subtotal: currentTransaction.subtotal,
              discount_amount: currentTransaction.discount_amount,
              tax_amount: currentTransaction.tax_amount,
              booking_fee: currentTransaction.booking_fee,
              late_fee: currentTransaction.late_fee,
              total_amount: currentTransaction.total_amount,
              services: currentTransaction.services,
              products: currentTransaction.products,
              online_payment_amount: currentBooking?.payment_status === 'paid'
                ? (currentBooking.service_price || currentBooking.total_amount || 0)
                : currentBooking?.payment_status === 'partial'
                  ? (currentBooking.convenience_fee_paid || 0)
                  : 0
            }}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            walletBalance={customerWalletBalance}
            customerId={customerIdForWallet}
          />
        )}

        {activeModal === 'receipt' && completedTransaction && (
          <ReceiptModal
            isOpen={true}
            onClose={() => {
              setActiveModal(null)
              setCompletedTransaction(null)
            }}
            transactionData={completedTransaction}
            branchInfo={currentBranch}
            staffInfo={user}
          />
        )}

        {activeModal === 'cancelBooking' && (
          <Modal isOpen={true} onClose={() => setActiveModal(null)} title="Cancel Booking" size="sm">
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-red-500/30">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Booking #{currentBooking?.booking_code}?</h3>
              <p className="text-red-700 text-sm mb-4 px-2">
                This will detach the booking and convert to a regular POS transaction.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200 text-sm"
                >
                  Keep
                </button>
                <button
                  onClick={handleConfirmCancelBooking}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg transition-all duration-200 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'customerCreated' && newCustomerCredentials && (
          <Modal isOpen={true} onClose={() => { setActiveModal(null); setNewCustomerCredentials(null); }} title="Customer Account Created" size="md">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/30">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Account Created!</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Please provide the following credentials to the customer:
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                      <span className="font-mono text-sm text-gray-900">{newCustomerCredentials.email}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(newCustomerCredentials.email)}
                        className="text-[var(--color-primary)] hover:text-[var(--color-accent)] text-sm font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                      <span className="font-mono text-sm text-gray-900">{newCustomerCredentials.password}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(newCustomerCredentials.password)}
                        className="text-[var(--color-primary)] hover:text-[var(--color-accent)] text-sm font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setActiveModal(null); setNewCustomerCredentials(null); }}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Continue with Transaction
              </button>
            </div>
          </Modal>
        )}
      </div>
    )
  }

  // Desktop Layout (existing code)
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(/img/pnglog.png)`,
            filter: 'brightness(0.3)'
          }}
        ></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-[#050505] border-b border-[#1A1A1A]/30 overflow-hidden">
        {/* Background overlay - more subtle */}
        <div className="absolute inset-0">
          <div
            className="h-full bg-cover bg-center bg-no-repeat opacity-[0.02]"
            style={{
              backgroundImage: `url(/img/pnglog.png)`,
              filter: 'brightness(0.2)'
            }}
          ></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 lg:py-3 gap-2">
            {/* Left section - Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <Link
                to="/staff"
                className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0A0A0A] rounded-lg sm:rounded-xl flex items-center justify-center hover:bg-[var(--color-primary)]/10 transition-all duration-200 border border-[#1A1A1A]/50 flex-shrink-0 ring-1 ring-[var(--color-primary)]/20 group"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-[var(--color-primary)] transition-colors duration-200" />
              </Link>
              <div className="w-8 h-8 sm:w-11 sm:h-11 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg ring-1 ring-[var(--color-primary)]/20 p-1.5 border border-[#1A1A1A]/50 flex-shrink-0">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <h1 className="text-xs sm:text-lg font-bold text-white tracking-tight truncate">
                    <span className="hidden sm:inline">POS System</span>
                    <span className="sm:hidden">POS</span>
                  </h1>
                  <div className="bg-[var(--color-primary)]/15 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-[var(--color-primary)]/25 flex-shrink-0">
                    <span className="text-[10px] font-semibold text-[var(--color-primary)]">v{APP_VERSION}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-1.5 mt-0.5">
                  <p className="text-[10px] sm:text-xs font-medium text-[var(--color-primary)]">Point of Sale</p>
                  {currentBranch && (
                    <>
                      <span className="text-gray-600 text-xs hidden sm:inline">•</span>
                      <div className="hidden sm:flex items-center space-x-1">
                        <span className="text-[10px] font-medium text-gray-400">{currentBranch.name}</span>
                        <span className="text-[10px] text-gray-500">({currentBranch.branch_code})</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right section - Welcome message and buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Welcome message - hidden on mobile */}
              <div className="hidden lg:block text-right">
                <p className="text-sm font-semibold text-white">Welcome back, {user?.username || 'Staff'}</p>
                <p className="text-[10px] text-gray-400 font-medium">{new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 sm:space-x-1.5">
                <Link
                  to="/staff"
                  className="bg-[var(--color-primary)]/15 backdrop-blur-sm rounded-lg flex items-center space-x-1 px-2 sm:px-3 py-1.5 hover:bg-[var(--color-primary)]/25 transition-all duration-200 border border-[var(--color-primary)]/25 group"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-200" />
                  <span className="hidden sm:inline text-[var(--color-primary)] group-hover:text-[var(--color-primary)] font-semibold text-xs transition-colors duration-200">Back</span>
                </Link>

                <button
                  onClick={() => setShowTutorial(true)}
                  className="w-7 h-7 sm:w-9 sm:h-9 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/10 transition-all duration-200 border border-white/10 group"
                  title="Show tutorial"
                >
                  <HelpCircle className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-200" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Product/Service Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* POS Mode Toggle - Desktop */}
            <div data-tour="pos-mode-toggle" className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-4">
              <div className="flex gap-3">
                <button
                  onClick={() => handleModeSwitch('service')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    posMode === 'service'
                      ? 'bg-[var(--color-primary)] text-white shadow-lg'
                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#444444]'
                  }`}
                >
                  <Scissors className="w-5 h-5" />
                  Service Mode
                </button>
                <button
                  onClick={() => handleModeSwitch('retail')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    posMode === 'retail'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#444444]'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Retail Mode
                </button>
              </div>
            </div>

            {/* Barber Selection - Only in Service Mode */}
            {posMode === 'service' && (
              <div data-tour="pos-barber-selection" className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Select Barber</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {activeBarbers.map((barber) => (
                    <button
                      key={barber._id}
                      onClick={() => setSelectedBarber(barber)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 ${selectedBarber?._id === barber._id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'border-[#555555] hover:border-[var(--color-primary)]/50 text-gray-300 hover:text-[var(--color-primary)]'
                        }`}
                    >
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden mx-auto mb-2 border-2 border-[var(--color-primary)]/30">
                          <BarberAvatar barber={barber} className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-semibold">{barber.full_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Retail Mode Info - Desktop */}
            {posMode === 'retail' && (
              <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-2xl shadow-lg border border-green-500/30 p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <ShoppingBag className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Retail Mode Active</h3>
                    <p className="text-sm text-gray-400">Product-only sales - No barber or service required</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Tabs */}
            <div data-tour="pos-catalog" className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
              <div className="flex flex-col space-y-4 mb-6">
                {/* Top row: Tabs and View Mode Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex space-x-1 bg-[#1A1A1A] rounded-xl p-1 mb-4 sm:mb-0">
                    {/* Services tab - only show in Service Mode */}
                    {posMode === 'service' && (
                      <button
                        onClick={() => {
                          setActiveTab('services')
                          setSelectedCategory(null)
                          setOpenCategory(null)
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === 'services'
                          ? 'bg-[var(--color-primary)] text-white shadow-lg'
                          : 'text-gray-400 hover:text-[var(--color-primary)]'
                          }`}
                      >
                        <Scissors className="w-4 h-4 inline mr-2" />
                        Services
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveTab('products')
                        setSelectedCategory(null)
                        setOpenCategory(null)
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === 'products'
                        ? 'bg-[var(--color-primary)] text-white shadow-lg'
                        : 'text-gray-400 hover:text-[var(--color-primary)]'
                        }`}
                    >
                      <Package className="w-4 h-4 inline mr-2" />
                      Products
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400 font-medium">View:</span>
                    <div className="flex space-x-1 bg-[#1A1A1A] rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('card')}
                        className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'card'
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-gray-400 hover:text-[var(--color-primary)]'
                          }`}
                        title="Card View"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'table'
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-gray-400 hover:text-[var(--color-primary)]'
                          }`}
                        title="Table View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom row: Search and Pagination Info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    />
                  </div>

                  {/* Results count */}
                  <div className="text-sm text-gray-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, currentFilteredItems.length)} of {currentFilteredItems.length} {activeTab}
                  </div>
                </div>
              </div>

              {/* Category Dropdown - Only for Services */}
              {activeTab === 'services' && (
                <div className="mb-6 space-y-3">
                  {['Haircut', 'Package', 'Other Services'].map((categoryName) => {
                    const categoryServices = servicesByCategory[categoryName] || []
                    const filteredCategoryServices = filterServicesByCategory(categoryServices)

                    if (filteredCategoryServices.length === 0) return null

                    const isOpen = openCategory === categoryName

                    return (
                      <div
                        key={categoryName}
                        className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]"
                      >
                        <button
                          onClick={() => setOpenCategory(isOpen ? null : categoryName)}
                          className="w-full text-left px-4 py-3 flex justify-between items-center text-white font-semibold hover:bg-[#222222] transition-colors rounded-lg"
                        >
                          <span className="text-sm">{categoryName}</span>
                          <span className="text-lg text-gray-400">{isOpen ? "−" : "+"}</span>
                        </button>

                        {isOpen && (
                          <div className="p-4">
                            {viewMode === 'card' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredCategoryServices.map((service) => (
                                  <button
                                    key={service._id}
                                    onClick={() => addService(service)}
                                    className="p-4 bg-[#1A1A1A] border border-[#555555] rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all duration-200 text-left group"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-white group-hover:text-[var(--color-primary)]">{service.name}</h4>
                                      <Plus className="w-4 h-4 text-gray-400 group-hover:text-[var(--color-primary)]" />
                                    </div>
                                    {service.description && (
                                      <p className="text-sm text-gray-400 mb-2">{service.description}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="text-lg font-bold text-[var(--color-primary)]">₱{service.price}</span>
                                      {service.duration_minutes && (
                                        <span className="text-xs text-gray-500">{service.duration_minutes} min</span>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full bg-[#1A1A1A] rounded-xl border border-[#555555]">
                                  <thead className="bg-[#2A2A2A]">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-[#555555]">Name</th>
                                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-[#555555]">Description</th>
                                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-[#555555]">Price</th>
                                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-[#555555]">Duration</th>
                                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300 border-b border-[#555555]">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredCategoryServices.map((service) => (
                                      <tr
                                        key={service._id}
                                        className="hover:bg-[#333333] transition-colors border-b border-[#444444] last:border-b-0"
                                      >
                                        <td className="px-4 py-3 text-sm font-medium text-white">{service.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">{service.description || '-'}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-[var(--color-primary)]">₱{service.price}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{service.duration_minutes || '-'} min</td>
                                        <td className="px-4 py-3 text-center">
                                          <button
                                            onClick={() => addService(service)}
                                            className="px-3 py-1 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:brightness-90 transition-colors flex items-center justify-center space-x-1 mx-auto"
                                          >
                                            <Plus className="w-3 h-3" />
                                            <span>Add</span>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Services/Products Display - Only show if no category dropdown (for products) */}
              {activeTab === 'products' && (
                viewMode === 'card' ? (
                  /* Card View */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedItems.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => addProduct(product)}
                        className="p-4 bg-[#1A1A1A] border border-[#555555] rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all duration-200 text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white group-hover:text-[var(--color-primary)]">{product.name}</h4>
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-[var(--color-primary)]" />
                        </div>
                        {product.description && (
                          <p className="text-sm text-gray-400 mb-2">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-[var(--color-primary)]">₱{product.price}</span>
                          <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Table View */
                  <div className="overflow-x-auto">
                    <table className="w-full bg-[#1A1A1A] rounded-xl border border-[#555555]">
                      <thead className="bg-[#2A2A2A]">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-[#555555]">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-[#555555]">Description</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-[#555555]">Price</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-[#555555]">Stock</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300 border-b border-[#555555]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item) => (
                          <tr
                            key={item._id}
                            className="hover:bg-[#333333] transition-colors border-b border-[#444444] last:border-b-0"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-white">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">{item.description || '-'}</td>
                            <td className="px-4 py-3 text-sm font-bold text-[var(--color-primary)]">₱{item.price}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.stock}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => addProduct(item)}
                                className="px-3 py-1 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:brightness-90 transition-colors flex items-center justify-center space-x-1 mx-auto"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 bg-[#1A1A1A] border border-[#555555] text-gray-400 rounded-lg hover:bg-[#333333] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${currentPage === pageNum
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[#1A1A1A] border border-[#555555] text-gray-400 hover:bg-[#333333] hover:text-white'
                            }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-[#1A1A1A] border border-[#555555] text-gray-400 rounded-lg hover:bg-[#333333] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Panel - Transaction Summary */}
          <div className="space-y-6">
            {/* Customer Selection */}
            <div data-tour="pos-customer" className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Customer</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveModal('scanner')}
                    className="p-2 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/30 transition-colors border border-[var(--color-primary)]/30"
                    title="Scan QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveModal('customerSelection')}
                    className="p-2 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/30 transition-colors border border-[var(--color-primary)]/30"
                    title="Select Customer"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {currentTransaction.customer ? (
                <div className="p-4 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-lg border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center border border-green-500/40">
                        <User className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{currentTransaction.customer.username}</p>
                        <p className="text-sm text-gray-400">{currentTransaction.customer.email}</p>
                        {currentTransaction.customer.mobile_number && (
                          <p className="text-sm text-gray-400">{currentTransaction.customer.mobile_number}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentTransaction(prev => ({ ...prev, customer: null, customer_name: '', customer_phone: '', customer_email: '' }))}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Remove Customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : currentTransaction.customer_name !== undefined && currentTransaction.customer_name !== null ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 rounded-lg border border-[var(--color-primary)]/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[var(--color-primary)]/30 rounded-lg flex items-center justify-center border border-[var(--color-primary)]/40">
                          <UserPlus className="w-5 h-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{(currentTransaction.customer_name && currentTransaction.customer_name.trim()) || 'Walk-in Customer'}</p>
                          <p className="text-sm text-gray-400">Walk-in Customer</p>
                          {currentTransaction.customer_phone && (
                            <p className="text-sm text-gray-400">{currentTransaction.customer_phone}</p>
                          )}
                          {currentTransaction.customer_email && (
                            <p className="text-sm text-gray-400">{currentTransaction.customer_email}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentTransaction(prev => ({ ...prev, customer: null, customer_name: null, customer_phone: '', customer_email: '' }))}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Remove Customer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Walk-in Customer Input Fields */}
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      placeholder="Enter customer full name"
                      value={currentTransaction.customer_name || ''}
                      onChange={(e) => setCurrentTransaction(prev => ({ ...prev, customer_name: e.target.value }))}
                      className="px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      required
                      autoFocus
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={currentTransaction.customer_phone}
                      onChange={(e) => setCurrentTransaction(prev => ({ ...prev, customer_phone: e.target.value }))}
                      className="px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    />
                    <input
                      type="email"
                      placeholder="Email Address (for account creation)"
                      value={currentTransaction.customer_email}
                      onChange={(e) => setCurrentTransaction(prev => ({ ...prev, customer_email: e.target.value }))}
                      className="px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    />
                  </div>

                  {currentTransaction.customer_email &&
                    currentTransaction.customer_email.trim() !== '' &&
                    currentTransaction.customer_email.includes('@') && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-xs text-green-400 font-medium flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Customer account will be created automatically
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveModal('customerSelection')}
                    className="w-full p-4 border-2 border-dashed border-[#555555] rounded-lg hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all duration-200 flex items-center justify-center space-x-2 text-gray-400 hover:text-[var(--color-primary)]"
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">Select Existing Customer</span>
                  </button>

                  <div className="text-center text-gray-500 text-sm">or</div>

                  <button
                    onClick={() => setCurrentTransaction(prev => ({ ...prev, customer: null, customer_name: '', customer_phone: '', customer_email: '' }))}
                    className="w-full p-4 border-2 border-dashed border-[var(--color-primary)]/30 rounded-lg hover:border-[var(--color-primary)]hover:bg-[var(--color-primary)]/10 transition-all duration-200 flex items-center justify-center space-x-2 text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span className="font-medium">Add Walk-in Customer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Today's Bookings Section (Story 8.4 - FR17) */}
            <div data-tour="pos-bookings" className="mt-4">
              <button
                onClick={() => setShowTodaysBookings(!showTodaysBookings)}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl shadow-lg border border-[#444444]/50 hover:border-[var(--color-primary)]/30 transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                  <span className="text-white font-semibold">Today's Bookings</span>
                  <span className="px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold rounded-full">
                    {todaysBookings.length}
                  </span>
                </div>
                {showTodaysBookings ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showTodaysBookings && (
                <div className="mt-2 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl shadow-lg border border-[#444444]/50 p-4">
                  {/* Filter */}
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={todaysBookingsFilter}
                      onChange={(e) => setTodaysBookingsFilter(e.target.value)}
                      className="bg-[#1A1A1A] text-white text-sm rounded-lg border border-[#444444] px-3 py-1.5 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partially Paid</option>
                      <option value="unpaid">Pay at Branch</option>
                    </select>
                  </div>

                  {/* Bookings List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {todaysBookings.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">No bookings found</p>
                    ) : (
                      todaysBookings.map((booking) => (
                        <button
                          key={booking._id}
                          onClick={() => handleLoadBookingFromList(booking)}
                          className="w-full p-3 bg-[#1A1A1A] rounded-lg border border-[#333333] hover:border-[var(--color-primary)]/50 transition-all duration-200 text-left"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-white font-medium">{booking.time}</span>
                            </div>
                            {/* Payment Status Badge */}
                            {booking.payment_status === 'paid' && (
                              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                booking.payment_method === 'wallet'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-green-500/20 text-green-400'
                              }`}>
                                {booking.payment_method === 'wallet' ? '👛 WALLET' : booking.payment_method === 'combo' ? '🔄 COMBO' : '💳 PAID'}
                              </span>
                            )}
                            {booking.payment_status === 'partial' && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full">FEE PAID</span>
                            )}
                            {booking.payment_status === 'unpaid' && (
                              <span className="px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold rounded-full">💵 PAY HERE</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-white">{booking.customer_name}</p>
                              <p className="text-xs text-gray-400">{booking.service_name} • {booking.barber_name}</p>
                            </div>
                            <div className="text-right">
                              {booking.remaining_balance > 0 ? (
                                <p className="text-sm font-semibold text-yellow-400">₱{booking.remaining_balance.toLocaleString()}</p>
                              ) : (
                                <p className="text-sm font-semibold text-green-400">₱0</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Product Sales History Section */}
            <div className="mt-4">
              <button
                onClick={() => setShowProductHistory(!showProductHistory)}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl shadow-lg border border-[#444444]/50 hover:border-[var(--color-primary)]/30 transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-[var(--color-primary)]" />
                  <span className="text-white font-semibold">Product Sales</span>
                  <span className="px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold rounded-full">
                    {productTransactionHistory.length}
                  </span>
                </div>
                {showProductHistory ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showProductHistory && (
                <div className="mt-2 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl shadow-lg border border-[#444444]/50 p-4">
                  {/* Filter */}
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Recent product transactions</span>
                  </div>

                  {/* Product Sales List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {productTransactionHistory.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">No product sales yet</p>
                    ) : (
                      productTransactionHistory.map((tx) => (
                        <div
                          key={tx._id}
                          className={`p-3 rounded-lg border ${
                            tx.transaction_type === 'retail'
                              ? 'bg-green-500/10 border-green-500/20'
                              : 'bg-[#1A1A1A] border-[#333333]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-white font-medium text-sm">
                                {new Date(tx.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {/* Transaction Type Badge */}
                            {tx.transaction_type === 'retail' ? (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">RETAIL</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold rounded-full">SERVICE+</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-white">{tx.customer_name}</p>
                              <p className="text-xs text-gray-400">
                                {tx.products.map(p => `${p.product_name} x${p.quantity}`).join(', ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-green-400">₱{tx.product_total.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">by {tx.processed_by_name}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Items */}
            <div data-tour="pos-order-summary" className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Order Summary</h3>
                {(currentTransaction.services.length > 0 || currentTransaction.products.length > 0) && (
                  <button
                    onClick={clearTransaction}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                {/* Services */}
                {currentTransaction.services.map((service, index) => (
                  <div key={`service-${index}`} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-[#555555]/30">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{service.service_name}</p>
                      <p className="text-sm text-gray-400">₱{service.price} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity('services', index, -1)}
                        className="w-6 h-6 bg-[#444444] border border-[#555555] rounded-full flex items-center justify-center hover:bg-[#555555] transition-colors"
                      >
                        <Minus className="w-3 h-3 text-gray-300" />
                      </button>
                      <span className="w-8 text-center font-semibold text-white">{service.quantity}</span>
                      <button
                        onClick={() => updateQuantity('services', index, 1)}
                        className="w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center hover:bg-[var(--color-accent)] text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Products */}
                {currentTransaction.products.map((product, index) => (
                  <div key={`product-${index}`} className="flex items-center justify-between p-3 bg-[var(--color-primary)]/10 rounded-lg border border-[var(--color-primary)]/20">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{product.product_name}</p>
                      <p className="text-sm text-gray-400">₱{product.price} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity('products', index, -1)}
                        className="w-6 h-6 bg-[#444444] border border-[#555555] rounded-full flex items-center justify-center hover:bg-[#555555] transition-colors"
                      >
                        <Minus className="w-3 h-3 text-gray-300" />
                      </button>
                      <span className="w-8 text-center font-semibold text-white">{product.quantity}</span>
                      <button
                        onClick={() => updateQuantity('products', index, 1)}
                        className="w-6 h-6 bg-[var(--color-primary)]rounded-full flex items-center justify-center hover:bg-[var(--color-accent)] text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {currentTransaction.services.length === 0 && currentTransaction.products.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-400" />
                    <p className="text-gray-400">No items added yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Barber Display */}
            {selectedBarber && (
              <div className="mt-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                  <Scissors className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                  Selected Barber
                </h3>
                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl shadow-lg border border-[#444444]/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--color-primary)]/30">
                        <BarberAvatar barber={selectedBarber} className="w-10 h-10" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-base">{selectedBarber.full_name}</p>
                        <p className="text-xs text-gray-400">Selected barber</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBarber(null)}
                      className="inline-flex items-center px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-all duration-200 font-medium text-xs"
                      title="Remove barber"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div data-tour="pos-payment" className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl shadow-lg border border-[#444444]/50 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Payment</h3>

              {/* Booking Payment Details (if booking attached) */}
              {currentBooking && currentBooking.payment_status && (() => {
                // Calculate what was already paid online
                const onlinePaidAmount = currentBooking.payment_status === 'paid'
                  ? (currentBooking.service_price || currentBooking.total_amount || 0) + (currentBooking.convenience_fee_paid || 0)
                  : currentBooking.payment_status === 'partial'
                    ? (currentBooking.convenience_fee_paid || 0)
                    : 0
                // Compare against current transaction total (which updates when services change)
                const currentTotal = currentTransaction.total_amount || 0
                const remainingBalance = Math.max(0, currentTotal - onlinePaidAmount)

                return (
                <div className="bg-[#1A1A1A] rounded-lg p-3 space-y-2 mb-4">
                  {/* Payment Type Label */}
                  <div className="flex justify-between items-center text-sm pb-2 border-b border-[#333333]">
                    <span className="text-gray-400">Payment Type:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                      currentBooking.payment_status === 'unpaid'
                        ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                        : currentBooking.payment_method === 'wallet'
                          ? 'bg-purple-500/20 text-purple-400'
                          : currentBooking.payment_method === 'combo'
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-green-500/20 text-green-400'
                    }`}>
                      {currentBooking.payment_status === 'unpaid'
                        ? '💵 PAY AT SHOP'
                        : currentBooking.payment_method === 'wallet'
                          ? '👛 WALLET PAY'
                          : currentBooking.payment_method === 'combo'
                            ? '🔄 COMBO (Wallet + Online)'
                            : '💳 ONLINE PAY'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Service Total:</span>
                    <span className="text-white font-semibold">
                      ₱{currentTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Amount Paid */}
                  {currentBooking.payment_status === 'paid' && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Amount Paid:</span>
                      <span className="text-green-400 font-semibold">
                        ₱{(currentBooking.service_price || currentBooking.total_amount || 0).toLocaleString()}
                        {currentBooking.payment_method === 'wallet' && ' (Wallet)'}
                        {currentBooking.payment_method === 'paymongo' && ' (Online)'}
                        {currentBooking.payment_method === 'combo' && ' (Wallet + Online)'}
                      </span>
                    </div>
                  )}
                  {currentBooking.payment_status === 'partial' && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Booking Fee Paid:</span>
                      <span className="text-green-400 font-semibold">
                        ₱{(currentBooking.convenience_fee_paid || 0).toLocaleString()} (Online)
                      </span>
                    </div>
                  )}
                  {currentBooking.payment_status === 'unpaid' && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Amount Paid:</span>
                      <span className="text-gray-500 font-semibold">₱0 (Pay at Shop)</span>
                    </div>
                  )}

                  {/* Remaining Balance */}
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-[#333333]">
                    <span className="text-white font-semibold">Balance Due:</span>
                    {remainingBalance <= 0 ? (
                      <span className="text-green-400 font-bold">₱0 (Paid)</span>
                    ) : (
                      <span className="text-yellow-400 font-bold">
                        ₱{remainingBalance.toLocaleString()} (Remaining)
                      </span>
                    )}
                  </div>
                </div>
                )
              })()}

              {/* Totals */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal:</span>
                  <span className="text-white">₱{currentTransaction.subtotal.toFixed(2)}</span>
                </div>
                {currentTransaction.discount_amount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount:</span>
                    <span>-₱{currentTransaction.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                {currentTransaction.booking_fee > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Booking Fee:</span>
                    <span>+₱{currentTransaction.booking_fee.toFixed(2)}</span>
                  </div>
                )}
                {currentTransaction.late_fee > 0 && (
                  <div className="flex justify-between text-red-400">
                    <div className="flex items-center">
                      <span>Late Fee:</span>
                      <button
                        onClick={() => setCurrentTransaction(prev => ({ ...prev, late_fee: 0 }))}
                        className="ml-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 p-0.5 rounded transition-colors"
                        title="Remove Late Fee"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <span>+₱{currentTransaction.late_fee.toFixed(2)}</span>
                  </div>
                )}
                {currentBranch?.enable_late_fee && currentTransaction.late_fee === 0 && (
                  <div className="flex justify-end pt-1 pb-1">
                    <button
                      onClick={async () => {
                        const lateFeeType = currentBranch.late_fee_type || 'fixed';
                        const feeAmount = currentBranch.late_fee_amount || 0;

                        if (lateFeeType === 'fixed') {
                          setCurrentTransaction(prev => ({ ...prev, late_fee: feeAmount }));
                        } else {
                          // Prompt for duration
                          const unit = lateFeeType === 'per_minute' ? 'minutes' : 'hours';
                          const duration = await showPrompt({ title: 'Late Fee Duration', message: `Enter number of ${unit} late:`, placeholder: `Number of ${unit}`, inputType: 'number' });
                          if (duration && !isNaN(duration) && duration > 0) {
                            const fee = feeAmount * parseFloat(duration);
                            setCurrentTransaction(prev => ({
                              ...prev,
                              late_fee: fee,
                              late_fee_units: parseFloat(duration), // Optional: store for record
                              late_fee_unit_type: unit
                            }));
                          }
                        }
                      }}
                      className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Apply Late Fee ({currentBranch.late_fee_type === 'fixed'
                        ? `₱${currentBranch.late_fee_amount?.toFixed(2)}`
                        : `₱${currentBranch.late_fee_amount?.toFixed(2)}/${currentBranch.late_fee_type === 'per_minute' ? 'min' : 'hr'}`})
                    </button>
                  </div>
                )}
                <div className="border-t border-[#555555] pt-2">
                  <div className="flex justify-between text-xl font-bold text-white">
                    <span>Total:</span>
                    <span>₱{currentTransaction.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                >
                  <option value="cash" className="bg-[#1A1A1A] text-white">Cash</option>
                  <option value="card" className="bg-[#1A1A1A] text-white">Card</option>
                  <option value="digital_wallet" className="bg-[#1A1A1A] text-white">Digital Wallet</option>
                  <option value="bank_transfer" className="bg-[#1A1A1A] text-white">Bank Transfer</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Show Complete button only if booking is fully paid AND no remaining balance from service changes */}
                {(() => {
                  const onlinePaid = currentBooking?.payment_status === 'paid'
                    ? (currentBooking.service_price || currentBooking.total_amount || 0) + (currentBooking.convenience_fee_paid || 0)
                    : 0
                  const hasRemainingBalance = currentBooking?.payment_status === 'paid' && currentTransaction.total_amount > onlinePaid
                  const isFullyPaid = currentBooking?.payment_status === 'paid' && !hasRemainingBalance
                  const remainingAmount = Math.max(0, currentTransaction.total_amount - onlinePaid)

                  if (isFullyPaid) {
                    return (
                      <button
                        onClick={() => handleMarkComplete()}
                        disabled={posMode === 'service' && !selectedBarber}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl hover:from-green-500 hover:to-green-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span>Complete (Already Paid)</span>
                      </button>
                    )
                  }

                  return (
                    <button
                      onClick={openPaymentModal}
                      disabled={
                        (posMode === 'service' && !selectedBarber) ||
                        (posMode === 'service' && currentTransaction.services.length === 0) ||
                        (posMode === 'retail' && currentTransaction.products.length === 0)
                      }
                      className="w-full py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl hover:from-[var(--color-accent)] hover:to-[var(--color-accent)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>{hasRemainingBalance ? `Process Payment (₱${remainingAmount.toLocaleString()} remaining)` : 'Process Payment'}</span>
                    </button>
                  )
                })()}

                <button
                  onClick={handleShowReceipt}
                  disabled={!currentBooking && currentTransaction.services.length === 0 && currentTransaction.products.length === 0}
                  className="w-full py-2 border border-[#555555] text-gray-300 font-semibold rounded-xl hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'scanner' && (
        <QRScannerModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onVoucherScanned={handleVoucherScanned}
          onBookingScanned={(booking) => {
            // Load booking details
            if (booking.customer) {
              setCurrentTransaction(prev => ({
                ...prev,
                customer: booking.customer
              }))
            }
            setActiveModal(null)
          }}
        />
      )}

      {activeModal === 'customerSelection' && (
        <CustomerSelectionModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onCustomerSelected={handleCustomerSelection}
          onScanQR={() => setActiveModal('scanner')}
          onAddNewCustomer={() => setActiveModal('addCustomer')}
        />
      )}

      {activeModal === 'addCustomer' && (
        <AddCustomerModal
          isOpen={true}
          onClose={() => setActiveModal('customerSelection')}
          onCustomerAdded={(customer) => {
            setCurrentTransaction(prev => ({
              ...prev,
              customer: customer
            }))
            setActiveModal(null)
          }}
        />
      )}

      {activeModal === 'paymentConfirmation' && (
        <PaymentConfirmationModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onConfirm={processPayment}
          transactionData={{
            subtotal: currentTransaction.subtotal,
            discount_amount: currentTransaction.discount_amount,
            tax_amount: currentTransaction.tax_amount,
            booking_fee: currentTransaction.booking_fee,
            late_fee: currentTransaction.late_fee,
            total_amount: currentTransaction.total_amount,
            services: currentTransaction.services,
            products: currentTransaction.products,
            online_payment_amount: currentBooking?.payment_status === 'paid'
              ? (currentBooking.service_price || currentBooking.total_amount || 0)
              : currentBooking?.payment_status === 'partial'
                ? (currentBooking.convenience_fee_paid || 0)
                : 0
          }}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          walletBalance={customerWalletBalance}
          customerId={customerIdForWallet}
        />
      )}

      {activeModal === 'receipt' && completedTransaction && (
        <ReceiptModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null)
            setCompletedTransaction(null)
          }}
          transactionData={completedTransaction}
          branchInfo={currentBranch}
          staffInfo={user}
        />
      )}

      {activeModal === 'paymentSuccess' && (
        <Modal isOpen={true} onClose={() => { }} title="Payment Successful" size="sm">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">
              {currentTransaction.services.length > 0
                ? `Transaction completed! ${currentTransaction.services.length} service${currentTransaction.services.length > 1 ? 's' : ''} recorded as completed booking${currentTransaction.services.length > 1 ? 's' : ''}.`
                : 'Transaction completed successfully!'
              }
            </p>
            <div className="text-2xl font-bold text-green-600">₱{currentTransaction.total_amount.toFixed(2)}</div>
            <p className="text-sm text-gray-500 mt-2">
              {currentTransaction.services.length > 0
                ? 'Receipt generated and bookings updated automatically'
                : 'Receipt will be generated automatically'
              }
            </p>
          </div>
        </Modal>
      )}

      {activeModal === 'cancelBooking' && (
        <Modal isOpen={true} onClose={() => setActiveModal(null)} title="Cancel Booking" size="sm">
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-red-500/30">
              <X className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Booking #{currentBooking?.booking_code}?</h3>
            <p className="text-red-700 text-sm mb-4 px-2">
              This will detach the booking and convert to a regular POS transaction.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200 text-sm"
              >
                Keep
              </button>
              <button
                onClick={handleConfirmCancelBooking}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg transition-all duration-200 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Alert Modal for Validation Messages */}
      {alertModal.show && (
        <Modal
          isOpen={true}
          onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'warning' })}
          title={alertModal.title}
          size="sm"
        >
          <div className="text-center py-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${alertModal.type === 'error' ? 'bg-red-500/20 border-red-500/30' :
              alertModal.type === 'success' ? 'bg-green-500/20 border-green-500/30' :
                'bg-yellow-500/20 border-yellow-500/30'
              }`}>
              <AlertCircle className={`w-8 h-8 ${alertModal.type === 'error' ? 'text-red-500' :
                alertModal.type === 'success' ? 'text-green-500' :
                  'text-yellow-500'
                }`} />
            </div>
            <p className="text-gray-700 mb-6 text-base">
              {alertModal.message}
            </p>
            <button
              onClick={() => setAlertModal({ show: false, title: '', message: '', type: 'warning' })}
              className={`w-full px-6 py-3 text-white font-medium rounded-lg transition-all duration-200 ${alertModal.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' :
                alertModal.type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                  'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                }`}
            >
              OK
            </button>
          </div>
        </Modal>
      )}

      {activeModal === 'customerCreated' && newCustomerCredentials && (
        <Modal isOpen={true} onClose={() => { setActiveModal(null); setNewCustomerCredentials(null); }} title="Customer Account Created" size="md">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/30">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Account Created Successfully!</h3>
            <p className="text-gray-600 mb-6">
              Please provide the following login credentials to the customer:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address:</label>
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                    <span className="font-mono text-sm text-gray-900">{newCustomerCredentials.email}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(newCustomerCredentials.email)}
                      className="text-[var(--color-primary)] hover:text-[var(--color-accent)] text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password:</label>
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                    <span className="font-mono text-sm text-gray-900">{newCustomerCredentials.password}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(newCustomerCredentials.password)}
                      className="text-[var(--color-primary)] hover:text-[var(--color-accent)] text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-[var(--color-accent)]">
                <strong>Important:</strong> The customer should change their password after first login for security.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                <strong>📧 Welcome Email:</strong> A welcome email with login instructions has been sent to the customer's email address.
              </p>
            </div>

            <button
              onClick={() => { setActiveModal(null); setNewCustomerCredentials(null); }}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200"
            >
              Continue with Transaction
            </button>
          </div>
        </Modal>
      )}

      {/* Collect Payment Modal (Story 8.2 - FR15) */}
      <CollectPaymentModal
        isOpen={showCollectPaymentModal}
        onClose={() => setShowCollectPaymentModal(false)}
        booking={currentBooking}
        staffUserId={user?._id}
        onPaymentCollected={() => {
          setShowCollectPaymentModal(false)
          // Refresh the booking data by re-triggering the scan
          // The booking will be updated in the database
          setAlertModal({
            show: true,
            title: 'Payment Collected',
            message: 'Payment has been recorded successfully.',
            type: 'success'
          })
        }}
      />

      {/* Mark Complete Confirmation Modal (Story 8.3 - FR16) */}
      {showCompleteConfirmModal && unpaidBalanceWarning && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowCompleteConfirmModal(false)
            setUnpaidBalanceWarning(null)
          }}
          title="Unpaid Balance Warning"
          size="sm"
        >
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500/30">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unpaid Balance</h3>
            <p className="text-gray-600 mb-4">
              {unpaidBalanceWarning.message}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 font-semibold">
                Amount Due: ₱{unpaidBalanceWarning.amount?.toLocaleString()}
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Would you like to collect payment first or mark as complete anyway?
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowCompleteConfirmModal(false)
                  setUnpaidBalanceWarning(null)
                  setShowCollectPaymentModal(true)
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Collect Payment
              </button>
              <button
                onClick={() => handleMarkComplete(true)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:to-[var(--color-primary)] text-white font-medium rounded-lg transition-all duration-200"
              >
                Complete Anyway
              </button>
            </div>
          </div>
        </Modal>
      )}
      <WalkthroughOverlay steps={posSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />
    </div>
  )
}

export default POS