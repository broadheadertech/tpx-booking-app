import React, { useState } from 'react'
import DashboardHeader from '../../components/staff/DashboardHeader'
import QuickActions from '../../components/staff/QuickActions'
import StatsCards from '../../components/staff/StatsCards'
import RecentActivity from '../../components/staff/RecentActivity'
import TabNavigation from '../../components/staff/TabNavigation'
import ManagementSection from '../../components/staff/ManagementSection'

function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [data, setData] = useState(null)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586l-2 2V5H5v14h7v2H4a1 1 0 01-1-1V4z' },
    { id: 'customers', label: 'Customers', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
    { id: 'bookings', label: 'Bookings', icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z' },
    { id: 'services', label: 'Services', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { id: 'vouchers', label: 'Vouchers', icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' }
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
  const handleAddCustomer = (customer) => {
    console.log('New customer added:', customer)
    // In a real app, this would make an API call to add the customer
    // For now, we'll just log it
  }

  const handleCreateBooking = (booking) => {
    console.log('New booking created:', booking)
    // In a real app, this would make an API call to create the booking
    // For now, we'll just log it
  }

  const handleCreateVoucher = (voucher) => {
    console.log('New voucher created:', voucher)
    // In a real app, this would make an API call to create the voucher
    // For now, we'll just log it
  }

  const handleVoucherScanned = (voucher) => {
    console.log('Voucher scanned:', voucher)
    // In a real app, this would handle voucher redemption
    // For now, we'll just log it
  }

  const handleLogout = () => {
    // Clear any session data, tokens, etc.
    localStorage.removeItem('userToken')
    sessionStorage.clear()
    
    // Redirect to login page
    // In a real app with React Router, you'd use navigate('/login')
    console.log('User logged out - redirecting to login...')
    window.location.href = '/login' // Simple redirect for demo
  }

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="space-y-8">
          <StatsCards stats={mockData.overview.stats} />
          <RecentActivity activities={mockData.overview.recentActivity} />
        </div>
      )
    }

    const data = mockData[activeTab]
    return <ManagementSection activeTab={activeTab} data={data} />
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