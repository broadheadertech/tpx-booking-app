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
import NotificationsManagement from '../../components/staff/NotificationsManagement'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function StaffDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => {
    // Restore active tab from localStorage on component mount
    return localStorage.getItem('staff_dashboard_active_tab') || 'overview'
  })
  const [activeModal, setActiveModal] = useState(null)

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('staff_dashboard_active_tab', activeTab)
  }, [activeTab])

  // Convex queries for data
  const bookings = useQuery(api.services.bookings.getAllBookings)
  const services = useQuery(api.services.services.getAllServices)
  const vouchers = useQuery(api.services.vouchers.getAllVouchers)
  const barbers = useQuery(api.services.barbers.getAllBarbers)
  const events = useQuery(api.services.events.getAllEvents)
  const customers = useQuery(api.services.auth.getAllUsers) // We'll need to create this query

  // Calculate incomplete bookings count (pending, booked, confirmed - not completed or cancelled)
  const incompleteBookingsCount = bookings ? bookings.filter(booking => 
    booking.status !== 'completed' && booking.status !== 'cancelled'
  ).length : 0

  // Helper functions for refresh actions
  const refreshData = () => {
    // Convex queries will automatically refresh
    window.location.reload()
  }

  // Calculate stats from Convex data
  const calculateStats = () => {
    if (!bookings || !services || !vouchers || !barbers || !customers) {
      return null
    }

    return {
      totalBookings: bookings.length,
      totalServices: services.length,
      totalVouchers: vouchers.length,
      totalBarbers: barbers.length,
      totalCustomers: customers.length,
      todayBookings: bookings.filter(b => {
        const today = new Date().toDateString()
        return new Date(b.date).toDateString() === today
      }).length,
      activeVouchers: vouchers.filter(v => v.is_active).length,
      activeServices: services.filter(s => s.is_active).length,
      activeBarbers: barbers.filter(b => b.is_active).length
    }
  }

  const stats = calculateStats()

  // Render overview stats
  const renderOverview = () => {
    if (!stats) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading dashboard data...</p>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <StatsCards stats={[
          { label: 'Total Bookings', value: stats.totalBookings, icon: 'calendar' },
          { label: 'Today\'s Bookings', value: stats.todayBookings, icon: 'clock' },
          { label: 'Active Services', value: stats.activeServices, icon: 'scissors' },
          { label: 'Active Barbers', value: stats.activeBarbers, icon: 'user' },
          { label: 'Total Customers', value: stats.totalCustomers, icon: 'users' },
          { label: 'Active Vouchers', value: stats.activeVouchers, icon: 'gift' }
        ]} />
        <RecentActivity activities={[]} />
      </div>
    )
  }

  // Handle refresh for components
  const handleRefresh = () => {
    window.location.reload()
  }

  // Render different tab content based on Convex data
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()

      case 'bookings':
        return <BookingsManagement bookings={bookings || []} onRefresh={handleRefresh} />

      case 'services':
        return <ServicesManagement services={services || []} onRefresh={handleRefresh} />

      case 'vouchers':
        return <VoucherManagement vouchers={vouchers || []} onRefresh={handleRefresh} onCreateVoucher={() => setActiveModal('voucher')} />

      case 'barbers':
        return <BarbersManagement barbers={barbers || []} onRefresh={handleRefresh} />

      case 'customers':
        return <CustomersManagement customers={customers || []} onRefresh={handleRefresh} onAddCustomer={() => setActiveModal('customer')} />

      case 'events':
        return <EventsManagement events={events || []} onRefresh={handleRefresh} />

      case 'reports':
        return <ReportsManagement onRefresh={handleRefresh} />

      case 'products':
        return <ProductsManagement onRefresh={handleRefresh} />

      case 'notifications':
        return <NotificationsManagement onRefresh={handleRefresh} />

      default:
        return renderOverview()
    }
  }

  // Placeholder functions for actions (to be implemented)
  const handleCreateBooking = () => {
    // TODO: Implement create booking modal
    console.log('Create booking clicked')
  }

  const handleCreateVoucher = () => {
    // TODO: Implement create voucher modal
    console.log('Create voucher clicked')
  }

  const handleAddCustomer = () => {
    // TODO: Implement add customer modal
    console.log('Add customer clicked')
  }

  const handleVoucherScanned = () => {
    // TODO: Implement voucher scanning
    console.log('Voucher scanned')
  }

  const handleBookingScanned = () => {
    // TODO: Implement booking scanning
    console.log('Booking scanned')
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Force navigation even if logout fails
      navigate('/auth/login')
    }
  }

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar' },
    { id: 'services', label: 'Services', icon: 'scissors' },
    { id: 'vouchers', label: 'Vouchers', icon: 'gift' },
    { id: 'barbers', label: 'Barbers', icon: 'user' },
    { id: 'customers', label: 'Customers', icon: 'users' },
    { id: 'events', label: 'Events', icon: 'calendar' },
    { id: 'reports', label: 'Reports', icon: 'chart' },
    { id: 'products', label: 'Products', icon: 'package' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' }
  ]

  console.log('StaffDashboard - User:', user)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] via-[#1A1A1A] to-[#2A2A2A]">
      <DashboardHeader onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <QuickActions 
            onAddCustomer={handleAddCustomer}
            onCreateBooking={handleCreateBooking}
            onCreateVoucher={handleCreateVoucher}
            onVoucherScanned={handleVoucherScanned}
            onBookingScanned={handleBookingScanned}
            activeModal={activeModal}
            setActiveModal={setActiveModal}
          />
          <TabNavigation 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            incompleteBookingsCount={incompleteBookingsCount}
          />
          <div className="bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] rounded-3xl shadow-2xl border border-[#333333]/50 p-10 backdrop-blur-sm">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffDashboard
