import React, { useState, useEffect } from 'react'
import DashboardHeader from '../../components/admin/DashboardHeader'
import StatsCards from '../../components/admin/StatsCards'
import RecentActivity from '../../components/admin/RecentActivity'
import TabNavigation from '../../components/admin/TabNavigation'
import BranchManagement from '../../components/admin/BranchManagement'
import UserManagement from '../../components/admin/UserManagement'
import SystemReports from '../../components/admin/SystemReports'
import GlobalSettings from '../../components/admin/GlobalSettings'
import BrandingManagement from '../../components/admin/BrandingManagement'
import EmailNotificationSettings from '../../components/admin/EmailNotificationSettings'
import AdminVoucherManagement from '../../components/admin/VoucherManagement'
import ProductCatalogManager from '../../components/admin/ProductCatalogManager'
import RoyaltyManagement from '../../components/admin/RoyaltyManagement'
import SuperAdminPLDashboard from '../../components/admin/SuperAdminPLDashboard'
import SuperAdminBalanceSheet from '../../components/admin/SuperAdminBalanceSheet'
import AuditTrailViewer from '../../components/admin/AuditTrailViewer'
// SuperAdminPaymentHistory removed - payments managed in staff dashboard
// SuperAdminExpenseManagement removed - expenses now managed in P&L dashboard
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNavigate } from 'react-router-dom'

function AdminDashboard() {
  // Use unified hook that supports both Clerk and legacy auth
  const { user, logout } = useCurrentUser()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('admin_dashboard_active_tab') || 'overview'
  })

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('admin_dashboard_active_tab', activeTab)
  }, [activeTab])

  // Global queries for super admin - with pagination limits to avoid byte limit errors
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const users = useQuery(api.services.auth.getAllUsers) || []
  const bookingsData = useQuery(api.services.bookings.getAllBookings, { limit: 100 })
  const bookings = bookingsData?.bookings || []
  const services = useQuery(api.services.services.getAllServices) || []
  const barbers = useQuery(api.services.barbers.getAllBarbers) || []
  const transactionsData = useQuery(api.services.transactions.getAllTransactions, { limit: 100 })
  const transactions = transactionsData?.transactions || []

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
      totalBookings: bookings.filter(b => b.status !== 'cancelled').length,
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

      case 'branding':
        return user?.role === 'super_admin' ? (
          <BrandingManagement />
        ) : (
          <div className="text-center text-gray-400">You do not have access to branding management.</div>
        )

      case 'emails':
        return user?.role === 'super_admin' ? (
          <EmailNotificationSettings />
        ) : (
          <div className="text-center text-gray-400">You do not have access to email notification settings.</div>
        )

      case 'vouchers':
        return <AdminVoucherManagement />

      case 'catalog':
        return user?.role === 'super_admin' ? (
          <ProductCatalogManager />
        ) : (
          <div className="text-center text-gray-400">You do not have access to product catalog management.</div>
        )

      case 'royalty':
        return user?.role === 'super_admin' ? (
          <RoyaltyManagement />
        ) : (
          <div className="text-center text-gray-400">You do not have access to royalty management.</div>
        )

      case 'pl':
        return user?.role === 'super_admin' ? (
          <SuperAdminPLDashboard />
        ) : (
          <div className="text-center text-gray-400">You do not have access to P&L reports.</div>
        )

      case 'balance_sheet':
        return user?.role === 'super_admin' ? (
          <SuperAdminBalanceSheet />
        ) : (
          <div className="text-center text-gray-400">You do not have access to balance sheet.</div>
        )

      case 'audit_trail':
        return user?.role === 'super_admin' ? (
          <AuditTrailViewer />
        ) : (
          <div className="text-center text-gray-400">You do not have access to audit trail.</div>
        )

      default:
        return renderOverview()
    }
  }

  // Tab configuration for admin
  const baseTabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'branches', label: 'Branches', icon: 'building' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'reports', label: 'Reports', icon: 'chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ]

  const tabs = user?.role === 'super_admin'
    ? [
      ...baseTabs.slice(0, 4),
      { id: 'vouchers', label: 'Vouchers', icon: 'ticket' }, // Added Vouchers tab
      { id: 'catalog', label: 'Catalog', icon: 'package' }, // Central product catalog
      { id: 'royalty', label: 'Royalty', icon: 'percent' }, // Royalty management
      { id: 'pl', label: 'P&L', icon: 'pie-chart' }, // Consolidated P&L (includes expense management)
      { id: 'balance_sheet', label: 'Balance Sheet', icon: 'scale' }, // Consolidated Balance Sheet
      { id: 'audit_trail', label: 'Audit Trail', icon: 'history' }, // Permission audit trail (Story 12-7)
      { id: 'branding', label: 'Branding', icon: 'palette' },
      { id: 'emails', label: 'Emails', icon: 'mail' },
      ...baseTabs.slice(4),
    ]
    : [
      ...baseTabs.slice(0, 4),
      { id: 'vouchers', label: 'Vouchers', icon: 'ticket' }, // Added Vouchers tab for regular admins too?
      ...baseTabs.slice(4),
    ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] via-[#1A1A1A] to-[#2A2A2A]">
      <DashboardHeader onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
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