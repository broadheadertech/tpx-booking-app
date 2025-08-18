import React, { useState, useEffect } from 'react'
import DashboardHeader from '../../components/staff/DashboardHeader'
import QuickActions from '../../components/staff/QuickActions'
import StatsCards from '../../components/staff/StatsCards'
import RecentActivity from '../../components/staff/RecentActivity'
import TabNavigation from '../../components/staff/TabNavigation'
import ManagementSection from '../../components/staff/ManagementSection'
import VoucherManagement from '../../components/staff/VoucherManagement'
import ServicesManagement from '../../components/staff/ServicesManagement'
import BookingsManagement from '../../components/staff/BookingsManagement'
import BarbersManagement from '../../components/staff/BarbersManagement'
import CustomersManagement from '../../components/staff/CustomersManagement'
import ReportsManagement from '../../components/staff/ReportsManagement'
import EventsManagement from '../../components/staff/EventsManagement'
import ProductsManagement from '../../components/staff/ProductsManagement'
import { bookingsService, servicesService, vouchersService, salesService, loyaltyService, usersService, overviewService } from '../../services/staff'
import barbersService from '../../services/staff/barbersService'
import clientsService from '../../services/staff/clientsService'
import { useAuth } from '../../context/AuthContext'

function StaffDashboard() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [data, setData] = useState({
    overview: null,
    customers: null,
    bookings: null,
    services: null,
    vouchers: null,
    barbers: null,
    reports: null,
    events: null,
    products: null
  })
  const [loading, setLoading] = useState({
    overview: false,
    customers: false,
    bookings: false,
    services: false,
    vouchers: false,
    barbers: false,
    reports: false,
    events: false,
    products: false
  })
  const [error, setError] = useState({
    overview: null,
    customers: null,
    bookings: null,
    services: null,
    vouchers: null,
    barbers: null,
    reports: null,
    events: null,
    products: null
  })

  // Load overview data on mount
  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData()
    }
  }, [])

  // Load data when tab changes
  useEffect(() => {
    loadTabData(activeTab)
  }, [activeTab])

  const setTabLoading = (tab, isLoading) => {
    setLoading(prev => ({ ...prev, [tab]: isLoading }))
  }

  const setTabError = (tab, errorMessage) => {
    setError(prev => ({ ...prev, [tab]: errorMessage }))
  }

  const setTabData = (tab, tabData) => {
    setData(prev => ({ ...prev, [tab]: tabData }))
  }

  const loadTabData = async (tab) => {
    console.log('loadTabData called with tab:', tab)
    console.log('Current data state:', data)
    console.log('Does data[tab] exist?', !!data[tab])
    console.log('data[tab] value:', data[tab])
    
    // Don't reload if data already exists
    if (data[tab] && tab !== 'overview') {
      console.log('Data already exists for tab:', tab, ', skipping reload')
      return
    }

    console.log('Loading data for tab:', tab)
    switch (tab) {
      case 'overview':
        console.log('Calling loadOverviewData()')
        await loadOverviewData()
        break
      case 'vouchers':
        console.log('Calling loadVouchersData()')
        await loadVouchersData()
        break
      case 'services':
        console.log('Calling loadServicesData()')
        await loadServicesData()
        break
      case 'bookings':
        console.log('Calling loadBookingsData()')
        await loadBookingsData()
        break
      case 'customers':
        console.log('Calling loadCustomersData()')
        await loadCustomersData()
        break
      case 'barbers':
        console.log('Calling loadBarbersData()')
        await loadBarbersData()
        break
      case 'reports':
        console.log('Calling loadReportsData()')
        await loadReportsData()
        break
      case 'events':
        console.log('Calling loadEventsData()')
        await loadEventsData()
        break
      case 'products':
        console.log('Calling loadProductsData()')
        await loadProductsData()
        break
      default:
        console.log('Unknown tab:', tab)
    }
  }

  const loadOverviewData = async () => {
    try {
      setTabLoading('overview', true)
      setTabError('overview', null)

      console.log('Loading comprehensive overview data from APIs...')
      const overviewData = await overviewService.getDashboardOverview()
      
      console.log('Overview data loaded successfully:', overviewData)
      setTabData('overview', {
        stats: overviewData.stats,
        recentActivity: overviewData.recentActivity,
        totals: overviewData.totals
      })

    } catch (err) {
      console.error('Error loading overview data:', err)
      setTabError('overview', `Failed to load overview data: ${err.message}`)
    } finally {
      setTabLoading('overview', false)
    }
  }

  const loadVouchersData = async () => {
    try {
      setTabLoading('vouchers', true)
      setTabError('vouchers', null)

      const vouchers = await vouchersService.getAllVouchers()
      
      setTabData('vouchers', vouchers.map(v => ({
        ...v,
        formattedValue: vouchersService.formatValue(v.value),
        isExpired: vouchersService.isExpired(v.expires_at)
      })))

    } catch (err) {
      setTabError('vouchers', 'Failed to load vouchers data')
    } finally {
      setTabLoading('vouchers', false)
    }
  }

  const loadServicesData = async () => {
    console.log('🚨 loadServicesData called - THIS SHOULD NOT HAPPEN FOR BOOKINGS TAB!')
    console.trace('loadServicesData: Call stack trace')
    try {
      setTabLoading('services', true)
      setTabError('services', null)

      const services = await servicesService.getAllServices()
      
      setTabData('services', services.map(s => ({
        ...s,
        formattedPrice: servicesService.formatPrice(s.price),
        formattedDuration: servicesService.formatDuration(s.duration_minutes)
      })))

    } catch (err) {
      setTabError('services', 'Failed to load services data')
    } finally {
      setTabLoading('services', false)
    }
  }

  const loadBookingsData = async () => {
    console.log('loadBookingsData called - about to fetch bookings')
    try {
      setTabLoading('bookings', true)
      setTabError('bookings', null)

      console.log('Calling bookingsService.getAllBookings()')
      const bookings = await bookingsService.getAllBookings()
      console.log('Bookings fetched successfully:', bookings)
      
      // No need to format data here since the service now provides pre-formatted data
      setTabData('bookings', bookings)

    } catch (err) {
      console.error('Bookings error:', err)
      if (err.message.includes('database schema')) {
        setTabError('bookings', 'Bookings API temporarily unavailable (database schema needs update)')
      } else {
        setTabError('bookings', err.message || 'Failed to load bookings data')
      }
    } finally {
      setTabLoading('bookings', false)
    }
  }

  const loadCustomersData = async () => {
    console.log('loadCustomersData called - fetching clients')
    try {
      setTabLoading('customers', true)
      setTabError('customers', null)

      console.log('Calling clientsService.getAllClients()')
      const customers = await clientsService.getAllClients()
      console.log('Clients fetched successfully:', customers)
      
      setTabData('customers', customers)

    } catch (err) {
      console.error('Customers error:', err)
      setTabError('customers', err.message || 'Failed to load customers data')
    } finally {
      setTabLoading('customers', false)
    }
  }

  const loadBarbersData = async () => {
    try {
      setTabLoading('barbers', true)
      setTabError('barbers', null)

      const barbers = await barbersService.getAllBarbers()
      setTabData('barbers', barbers)

    } catch (err) {
      setTabError('barbers', 'Failed to load barbers data')
    } finally {
      setTabLoading('barbers', false)
    }
  }

  const loadReportsData = async () => {
    try {
      setTabLoading('reports', true)
      setTabError('reports', null)

      // Mock reports data - in a real app, this would come from an API
      const reportsData = {
        revenue: { current: 125430, previous: 98750, change: 27.0, trend: 'up' },
        customers: { current: 342, previous: 298, change: 14.8, trend: 'up' },
        bookings: { current: 156, previous: 142, change: 9.9, trend: 'up' },
        vouchers: { current: 89, previous: 76, change: 17.1, trend: 'up' }
      }
      
      setTabData('reports', reportsData)

    } catch (err) {
      setTabError('reports', 'Failed to load reports data')
    } finally {
      setTabLoading('reports', false)
    }
  }

  const generateRecentActivity = (bookings = [], vouchers = [], sales = []) => {
    const activities = []
    
    // Recent bookings
    if (bookings.length > 0) {
      bookings.slice(0, 2).forEach(booking => {
        activities.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          message: `New appointment scheduled for ${booking.date || 'unknown date'}`,
          time: booking.created_at ? new Date(booking.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
          status: booking.status || 'pending'
        })
      })
    }

    // Recent voucher redemptions
    const redeemedVouchers = vouchers.filter(v => v.redeemed)
    if (redeemedVouchers.length > 0) {
      redeemedVouchers.slice(0, 2).forEach(voucher => {
        activities.push({
          id: `voucher-${voucher.id}`,
          type: 'voucher',
          message: `Voucher ${voucher.code} redeemed`,
          time: voucher.created_at ? new Date(voucher.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
          status: 'completed'
        })
      })
    }

    // Recent sales
    if (sales.length > 0) {
      sales.slice(0, 2).forEach(sale => {
        activities.push({
          id: `sale-${sale.id}`,
          type: 'sale',
          message: `Sale completed: ${salesService.formatCurrency(sale.discounted_amount || sale.total_amount)}`,
          time: sale.sale_date ? new Date(sale.sale_date).toLocaleTimeString() : new Date().toLocaleTimeString(),
          status: 'completed'
        })
      })
    }

    // If no real activities, show placeholder
    if (activities.length === 0) {
      activities.push({
        id: 'placeholder-1',
        type: 'info',
        message: 'No recent activity',
        time: new Date().toLocaleTimeString(),
        status: 'info'
      })
    }

    return activities.slice(0, 4)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586l-2 2V5H5v14h7v2H4a1 1 0 01-1-1V4z' },
    { id: 'customers', label: 'Customers', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
    { id: 'bookings', label: 'Bookings', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z' },
    { id: 'services', label: 'Services', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { id: 'vouchers', label: 'Vouchers', icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' },
    { id: 'barbers', label: 'Barbers', icon: 'M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C18 14.17 13.33 13 11 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h4v-2.5c0-2.33-4.67-3.5-7-3.5z' },
    { id: 'reports', label: 'Reports', icon: 'M3 3v18h18v-2H5V3H3zm4 14h2v-6H7v6zm4 0h2V9h-2v8zm4 0h2v-4h-2v4z' },
    { id: 'events', label: 'Events', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z' },
    { id: 'products', label: 'Products', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }
  ]

  const mockData = {
    overview: {
      stats: [
        { label: 'Today\'s Revenue', value: '₱62,350', change: '+12%', trend: 'up', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
        { label: 'Appointments', value: '24', change: '+8%', trend: 'up', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z' },
        { label: 'New Customers', value: '8', change: '+15%', trend: 'up', icon: 'M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0018.54 8H16c-.8 0-1.54.37-2.01.95L12 11.1 9.01 8.95A2.5 2.5 0 007 8H4.46c-.8 0-1.49.59-1.62 1.37L.5 16H3v6h2v-6h2.5l1.5-4.5L12 14l2.5-2.5L16 16h2.5v6h2z' },
        { label: 'Active Vouchers', value: '156', change: '-3%', trend: 'down', icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' }
      ],
      recentActivity: [
        { id: 1, type: 'booking', message: 'New appointment booked by John Doe', time: '5 min ago', status: 'new' },
        { id: 2, type: 'voucher', message: 'Voucher SAVE20 redeemed by Jane Smith', time: '12 min ago', status: 'completed' },
        { id: 3, type: 'customer', message: 'New customer registration: Mike Johnson', time: '1 hour ago', status: 'new' },
        { id: 4, type: 'service', message: 'Haircut service completed for Sarah Wilson', time: '2 hours ago', status: 'completed' }
      ]
    },
    customers: [
      { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1 (555) 123-4567', points: 150, visits: 12, lastVisit: '2024-01-15', status: 'active' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+1 (555) 987-6543', points: 280, visits: 8, lastVisit: '2024-01-10', status: 'active' },
      { id: 3, name: 'Mike Johnson', email: 'mike@example.com', phone: '+1 (555) 456-7890', points: 50, visits: 2, lastVisit: '2024-01-08', status: 'new' }
    ],
    vouchers: [
      { id: 1, code: 'SAVE20', customer: 'John Doe', value: '₱1,000', status: 'active', expires: '2024-12-31', created: '2024-01-01' },
      { id: 2, code: 'FIRST10', customer: 'Jane Smith', value: '₱500', status: 'redeemed', expires: '2024-11-15', created: '2024-01-05' },
      { id: 3, code: 'WELCOME15', customer: 'Mike Johnson', value: '₱750', status: 'active', expires: '2024-06-30', created: '2024-01-08' }
    ],
    bookings: [
      { id: 1, customer: 'John Doe', service: 'Premium Haircut', date: '2024-01-20', time: '2:00 PM', staff: 'Alex', status: 'confirmed', price: '₱1,750' },
      { id: 2, customer: 'Jane Smith', service: 'Beard Trim & Style', date: '2024-01-20', time: '3:30 PM', staff: 'Mike', status: 'pending', price: '₱1,250' },
      { id: 3, customer: 'Mike Johnson', service: 'Classic Cut', date: '2024-01-21', time: '10:00 AM', staff: 'Sarah', status: 'confirmed', price: '₱1,000' }
    ],
    services: [
      { id: 1, name: 'Premium Haircut', price: '₱1,750', duration: '45 min', category: 'Hair Services', bookings: 156, revenue: '₱273,000' },
      { id: 2, name: 'Beard Trim & Style', price: '₱1,250', duration: '30 min', category: 'Beard Services', bookings: 89, revenue: '₱111,250' },
      { id: 3, name: 'Classic Cut', price: '₱1,000', duration: '30 min', category: 'Hair Services', bookings: 203, revenue: '₱203,000' },
      { id: 4, name: 'Hot Towel Shave', price: '₱1,500', duration: '40 min', category: 'Shave Services', bookings: 67, revenue: '₱100,500' }
    ]
  }

  // Handler functions for modals
  const handleAddCustomer = async (customer) => {
    try {
      console.log('New customer added:', customer)
      
      // Refresh overview and customers data if they're loaded
      if (data.overview) {
        await loadOverviewData()
      }
      if (data.customers) {
        await loadCustomersData()
      }
      
      return { success: true, data: customer }
    } catch (error) {
      console.error('Error handling new customer:', error)
      return { success: false, error: error.message }
    }
  }

  const handleCreateBooking = async (bookingData) => {
    try {
      console.log('New booking created:', bookingData)
      
      // Refresh overview and bookings data if they're loaded
      if (data.overview) {
        await loadOverviewData()
      }
      if (data.bookings) {
        await loadBookingsData()
      }
      
      return { success: true, data: bookingData }
    } catch (error) {
      console.error('Error handling new booking:', error)
      return { success: false, error: error.message }
    }
  }

  const handleCreateVoucher = async (voucherData) => {
    try {
      const newVoucher = await vouchersService.createVoucher(voucherData)
      console.log('New voucher created:', newVoucher)
      // Reload vouchers data
      await loadVouchersData()
      return { success: true, data: newVoucher }
    } catch (error) {
      console.error('Error creating voucher:', error)
      return { success: false, error: error.message }
    }
  }

  const handleVoucherScanned = async (code, totalAmount) => {
    try {
      const result = await vouchersService.redeemVoucher(code, totalAmount)
      console.log('Voucher redeemed:', result)
      // Reload vouchers data
      await loadVouchersData()
      return { success: true, data: result }
    } catch (error) {
      console.error('Error redeeming voucher:', error)
      return { success: false, error: error.message }
    }
  }

  const handleBookingScanned = async (booking) => {
    try {
      console.log('Booking scanned:', booking)
      
      // Mock booking check-in process (replace with actual API call)
      // This would typically update the booking status to 'checked-in'
      
      // Refresh bookings data if loaded
      if (data.bookings) {
        await loadBookingsData()
      }
      
      return { success: true, data: booking }
    } catch (error) {
      console.error('Error processing booking check-in:', error)
      return { success: false, error: error.message }
    }
  }

  const handleLogout = () => {
    // Clear any session data, tokens, etc.
    localStorage.removeItem('userToken')
    sessionStorage.clear()
    
    // Redirect to login page
    // In a real app with React Router, you'd use navigate('/auth/login')
    console.log('User logged out - redirecting to login...')
    window.location.href = '/auth/login' // Redirect to actual login page
  }

  const renderTabContent = () => {
    const currentLoading = loading[activeTab]
    const currentError = error[activeTab]
    const currentData = data[activeTab]

    if (currentLoading) {
      return (
        <div className="space-y-6">
          {/* Loading header */}
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8C42]"></div>
            <div className="ml-4 text-[#6B6B6B] text-lg">Loading {activeTab} data...</div>
          </div>
          
          {/* Skeleton loading based on tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats cards skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F5F5]">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Recent activity skeleton */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F5F5]">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="animate-pulse flex items-center space-x-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {(activeTab === 'customers' || activeTab === 'vouchers' || activeTab === 'bookings' || activeTab === 'services' || activeTab === 'barbers' || activeTab === 'reports') && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F5F5]">
              <div className="animate-pulse">
                {/* Table header skeleton */}
                <div className="flex items-center justify-between mb-6">
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
                </div>
                
                {/* Table rows skeleton */}
                <div className="space-y-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center space-x-4 py-3 border-b border-gray-100">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (currentError) {
      return (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Failed to Load {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
            <p className="text-[#6B6B6B] mb-6 max-w-md mx-auto">{currentError}</p>
            <div className="flex items-center justify-center space-x-4">
              <button 
                onClick={() => loadTabData(activeTab)}
                className="px-6 py-2 bg-[#FF8C42] text-white rounded-xl hover:bg-[#FF7A2B] transition-colors"
              >
                Try Again
              </button>
              <button 
                onClick={() => setActiveTab('overview')}
                className="px-6 py-2 border-2 border-[#F5F5F5] text-[#6B6B6B] rounded-xl hover:border-[#FF8C42] hover:text-[#FF8C42] transition-colors"
              >
                Go to Overview
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (!currentData) return null

    if (activeTab === 'overview') {
      return (
        <div className="space-y-8">
          <StatsCards stats={currentData.stats} />
          <RecentActivity activities={currentData.recentActivity} />
        </div>
      )
    }

    if (activeTab === 'vouchers') {
      return <VoucherManagement vouchers={currentData} onRefresh={loadVouchersData} />
    }

    if (activeTab === 'services') {
      return <ServicesManagement services={currentData} onRefresh={loadServicesData} />
    }

    if (activeTab === 'bookings') {
      return <BookingsManagement bookings={currentData} onRefresh={loadBookingsData} />
    }

    if (activeTab === 'barbers') {
      return <BarbersManagement barbers={currentData} onRefresh={loadBarbersData} />
    }

    if (activeTab === 'customers') {
      return <CustomersManagement customers={currentData} onRefresh={loadCustomersData} />
    }

    if (activeTab === 'reports') {
      return <ReportsManagement onRefresh={loadReportsData} />
    }

    return (
      <ManagementSection 
        activeTab={activeTab} 
        data={currentData}
        onCreateBooking={handleCreateBooking}
        onCreateVoucher={handleCreateVoucher}
        onVoucherScanned={handleVoucherScanned}
        onRefresh={() => loadTabData(activeTab)}
      />
    )
  }

  // Debug logging
  console.log('Staff Dashboard - Auth State:', {
    authLoading,
    isAuthenticated,
    user,
    userIsStaff: user?.is_staff
  })

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white flex items-center justify-center">
        <div className="text-gray-500">Loading authentication...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated or not staff
  if (!isAuthenticated || !user?.is_staff) {
    console.log('Redirecting to login - Not authenticated or not staff:', {
      isAuthenticated,
      isStaff: user?.is_staff
    })
    window.location.href = '/auth/login'
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white">
      <DashboardHeader onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <QuickActions 
            onAddCustomer={handleAddCustomer}
            onCreateBooking={handleCreateBooking}
            onCreateVoucher={handleCreateVoucher}
            onVoucherScanned={handleVoucherScanned}
            onBookingScanned={handleBookingScanned}
          />
          <TabNavigation 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#F5F5F5] p-10 backdrop-blur-sm">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffDashboard