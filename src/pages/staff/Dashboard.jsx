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
import BranchUserManagement from '../../components/staff/BranchUserManagement'
import CustomersManagement from '../../components/staff/CustomersManagement'
import ReportsManagement from '../../components/staff/ReportsManagement'
import EventsManagement from '../../components/staff/EventsManagement'
import ProductsManagement from '../../components/staff/ProductsManagement'
import NotificationsManagement from '../../components/staff/NotificationsManagement'
import EmailMarketing from '../../components/staff/EmailMarketing'
import PayrollManagement from '../../components/staff/PayrollManagement'
import DashboardFooter from '../../components/common/DashboardFooter'
import { NotificationModal, NotificationBell } from '../../components/common/NotificationSystem'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { useBookingNotificationListener } from '../../utils/bookingNotifications'

function StaffDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => {
    // Restore active tab from localStorage on component mount
    return localStorage.getItem('staff_dashboard_active_tab') || 'overview'
  })
  const [activeModal, setActiveModal] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Hook for real-time notifications with toast alerts
  const { unreadCount } = useRealtimeNotifications()
  
  // Hook for booking notification events
  useBookingNotificationListener()

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('staff_dashboard_active_tab', activeTab)
  }, [activeTab])

  // Convex queries for data - adjust based on user role
  const bookings = user?.role === 'super_admin' 
    ? useQuery(api.services.bookings.getAllBookings)
    : user?.branch_id 
      ? useQuery(api.services.bookings.getBookingsByBranch, { branch_id: user.branch_id })
      : undefined
  
  const services = user?.role === 'super_admin'
    ? useQuery(api.services.services.getAllServices)
    : user?.branch_id
      ? useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id })
      : undefined
  
  const barbers = user?.role === 'super_admin'
    ? useQuery(api.services.barbers.getAllBarbers)
    : user?.branch_id
      ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
      : undefined
  
  const vouchers = user?.role === 'super_admin'
    ? useQuery(api.services.vouchers.getAllVouchers)
    : user?.branch_id
      ? useQuery(api.services.vouchers.getVouchersByBranch, { branch_id: user.branch_id })
      : undefined
  const events = user?.role === 'super_admin'
    ? useQuery(api.services.events.getAllEvents)
    : user?.branch_id
      ? useQuery(api.services.events.getEventsByBranch, { branch_id: user.branch_id })
      : undefined
  const customers = user?.role === 'super_admin'
    ? useQuery(api.services.auth.getAllUsers)
    : user?.branch_id
      ? useQuery(api.services.auth.getUsersByBranch, { branch_id: user.branch_id })
      : undefined
  

  // Calculate incomplete bookings count (pending, booked, confirmed - not completed or cancelled)
  const incompleteBookingsCount = bookings ? bookings.filter(booking => 
    booking.status !== 'completed' && booking.status !== 'cancelled'
  ).length : 0

  // Helper functions for refresh actions
  const refreshData = () => {
    // Convex queries will automatically refresh through their real-time subscriptions
    // No page reload needed - let the data update naturally
    console.log('Data refresh triggered - Convex will handle updates')
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
      <div className="space-y-6">
        <StatsCards stats={[
          { label: 'Total Bookings', value: stats.totalBookings, icon: 'calendar' },
          { label: 'Today\'s Bookings', value: stats.todayBookings, icon: 'clock' },
          { label: 'Active Services', value: stats.activeServices, icon: 'scissors' },
          { label: 'Active Barbers', value: stats.activeBarbers, icon: 'user' },
          { label: 'Total Customers', value: stats.totalCustomers, icon: 'users' },
          { label: 'Active Vouchers', value: stats.activeVouchers, icon: 'gift' }
        ]} />
        <RecentActivity />
      </div>
    )
  }

  // Handle refresh for components - no page reload needed
  const handleRefresh = () => {
    // Convex queries automatically update through real-time subscriptions
    console.log('Refresh triggered - data will update automatically')
  }

  // Render different tab content based on Convex data
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()

      case 'bookings':
        return <BookingsManagement onRefresh={handleRefresh} user={user} />

      case 'services':
        return <ServicesManagement services={services || []} onRefresh={handleRefresh} user={user} />

      case 'vouchers':
        return <VoucherManagement vouchers={vouchers || []} onRefresh={handleRefresh} onCreateVoucher={() => setActiveModal('voucher')} />

      case 'barbers':
        return <BarbersManagement barbers={barbers || []} onRefresh={handleRefresh} />

      case 'users':
        return <BranchUserManagement onRefresh={handleRefresh} />

      case 'customers':
        return <CustomersManagement customers={customers || []} onRefresh={handleRefresh} />

      case 'events':
        return <EventsManagement events={events || []} onRefresh={handleRefresh} user={user} />

      case 'reports':
        return <ReportsManagement onRefresh={handleRefresh} user={user} />

      case 'products':
        return <ProductsManagement onRefresh={handleRefresh} />

      case 'notifications':
        return <NotificationsManagement onRefresh={handleRefresh} />

      case 'payroll':
        return <PayrollManagement onRefresh={handleRefresh} user={user} />

      case 'email_marketing':
        return <EmailMarketing onRefresh={handleRefresh} />

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

  // Tab configuration for staff
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar' },
    { id: 'services', label: 'Services', icon: 'scissors' },
    { id: 'vouchers', label: 'Vouchers', icon: 'gift' },
    { id: 'barbers', label: 'Barbers', icon: 'user' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'customers', label: 'Customers', icon: 'users' },
    { id: 'events', label: 'Events', icon: 'calendar' },
    { id: 'reports', label: 'Reports', icon: 'chart' },
    { id: 'payroll', label: 'Payroll', icon: 'dollar-sign' },
    { id: 'products', label: 'Products', icon: 'package' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'email_marketing', label: 'Email Marketing', icon: 'mail' }
  ]

  console.log('StaffDashboard - User:', user)

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <DashboardHeader
        onLogout={handleLogout}
        user={user}
        onOpenNotifications={() => setShowNotifications(true)}
      />
      
      <div className="flex-1">
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
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-3xl shadow-2xl border border-[#2A2A2A]/50 p-10 backdrop-blur-sm">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      <DashboardFooter />

      {/* Notification Modal */}
      <NotificationModal
        userId={user._id}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userRole={user?.role}
      />
    </div>
  )
}

export default StaffDashboard
