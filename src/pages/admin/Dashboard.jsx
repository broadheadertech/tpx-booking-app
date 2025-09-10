import React, { useState, useEffect } from 'react'
import DashboardHeader from '../../components/admin/DashboardHeader'
import QuickActions from '../../components/admin/QuickActions'
import StatsCards from '../../components/admin/StatsCards'
import RecentActivity from '../../components/admin/RecentActivity'
import TabNavigation from '../../components/admin/TabNavigation'
import BranchManagement from '../../components/admin/BranchManagement'
import UserManagement from '../../components/admin/UserManagement'
import SystemReports from '../../components/admin/SystemReports'
import GlobalSettings from '../../components/admin/GlobalSettings'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('admin_dashboard_active_tab') || 'overview'
  })

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('admin_dashboard_active_tab', activeTab)
  }, [activeTab])

  // Global queries for super admin
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const users = useQuery(api.services.auth.getAllUsers) || []
  const bookings = useQuery(api.services.bookings.getAllBookings) || []
  const services = useQuery(api.services.services.getAllServices) || []
  const barbers = useQuery(api.services.barbers.getAllBarbers) || []
  const transactions = useQuery(api.services.transactions.getAllTransactions) || []

  // Calculate global stats
  const calculateStats = () => {
    if (!branches || !users || !bookings || !transactions) {
      return null
    }

    const activeBranches = branches.filter(b => b.is_active).length
    const totalRevenue = transactions
      .filter(t => t.payment_status === 'completed')
      .reduce((sum, t) => sum + t.total_amount, 0)
    
    const todayBookings = bookings.filter(b => {
      const today = new Date().toDateString()
      return new Date(b.date).toDateString() === today
    }).length

    const thisMonthRevenue = transactions
      .filter(t => {
        const transactionDate = new Date(t.createdAt)
        const thisMonth = new Date().toISOString().slice(0, 7)
        return transactionDate.toISOString().slice(0, 7) === thisMonth && t.payment_status === 'completed'
      })
      .reduce((sum, t) => sum + t.total_amount, 0)

    return {
      totalBranches: branches.length,
      activeBranches,
      totalUsers: users.length,
      totalBookings: bookings.length,
      todayBookings,
      totalRevenue,
      thisMonthRevenue,
      totalBarbers: barbers.length,
      totalServices: services.length
    }
  }

  const stats = calculateStats()

  // Helper functions
  const handleRefresh = () => {
    window.location.reload()
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      navigate('/auth/login')
    }
  }

  // Render overview
  const renderOverview = () => {
    if (!stats) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading dashboard data...</p>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <StatsCards stats={[
          { label: 'Total Branches', value: stats.totalBranches, icon: 'building', subtext: `${stats.activeBranches} active` },
          { label: 'Total Users', value: stats.totalUsers, icon: 'users' },
          { label: 'Total Bookings', value: stats.totalBookings, icon: 'calendar', subtext: `${stats.todayBookings} today` },
          { label: 'Total Revenue', value: `₱${stats.totalRevenue.toLocaleString()}`, icon: 'dollar', subtext: `₱${stats.thisMonthRevenue.toLocaleString()} this month` },
          { label: 'Total Barbers', value: stats.totalBarbers, icon: 'user' },
          { label: 'Total Services', value: stats.totalServices, icon: 'scissors' }
        ]} />
        <RecentActivity activities={[]} />
      </div>
    )
  }

  // Render different tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()

      case 'branches':
        return <BranchManagement onRefresh={handleRefresh} />

      case 'users':
        return <UserManagement onRefresh={handleRefresh} />

      case 'reports':
        return <SystemReports onRefresh={handleRefresh} />

      case 'settings':
        return <GlobalSettings onRefresh={handleRefresh} />

      default:
        return renderOverview()
    }
  }

  // Tab configuration for admin
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'branches', label: 'Branches', icon: 'building' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'reports', label: 'Reports', icon: 'chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] via-[#1A1A1A] to-[#2A2A2A]">
      <DashboardHeader onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <QuickActions />
          <TabNavigation 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
          />
          <div className="bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] rounded-3xl shadow-2xl border border-[#333333]/50 p-10 backdrop-blur-sm">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard