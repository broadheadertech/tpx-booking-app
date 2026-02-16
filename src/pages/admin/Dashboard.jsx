import React, { useState, useEffect, useCallback } from 'react'
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
import SAEmailMarketing from '../../components/admin/SAEmailMarketing'
import AdminVoucherManagement from '../../components/admin/VoucherManagement'
import ProductCatalogManager from '../../components/admin/ProductCatalogManager'
import RoyaltyManagement from '../../components/admin/RoyaltyManagement'
import SuperAdminPLDashboard from '../../components/admin/SuperAdminPLDashboard'
import SuperAdminBalanceSheet from '../../components/admin/SuperAdminBalanceSheet'
import AuditTrailViewer from '../../components/admin/AuditTrailViewer'
import PointsConfigPanel from '../../components/admin/PointsConfigPanel'
import FlashPromotionsPage from './FlashPromotionsPage'
import WalletConfigPanel from '../../components/admin/WalletConfigPanel'
import BranchWalletSettingsPanel from '../../components/admin/BranchWalletSettingsPanel'
import SettlementApprovalQueue from '../../components/admin/SettlementApprovalQueue'
import WalletOverviewDashboard from '../../components/admin/WalletOverviewDashboard'
import BranchCustomerAnalytics from '../../components/admin/BranchCustomerAnalytics'
import DeliveryOrdersManagement from '../../components/admin/DeliveryOrdersManagement'
import DamageClaimsManagement from '../../components/admin/DamageClaimsManagement'
import DefaultServicesManager from '../../components/admin/DefaultServicesManager'
import ShopBannerManagement from '../../components/admin/ShopBannerManagement'
import ShopConfigPanel from '../../components/admin/ShopConfigPanel'
// SuperAdminPaymentHistory removed - payments managed in staff dashboard
// SuperAdminExpenseManagement removed - expenses now managed in P&L dashboard
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNavigate } from 'react-router-dom'
import WalkthroughOverlay from '../../components/common/WalkthroughOverlay'
import { superAdminSteps } from '../../config/walkthroughSteps'
import { HelpCircle } from 'lucide-react'

function AdminDashboard() {
  // Use unified hook that supports both Clerk and legacy auth
  const { user, logout } = useCurrentUser()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('admin_dashboard_active_tab') || 'overview'
  })
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const markTutorialComplete = useMutation(api.services.auth.markTutorialComplete)

  // Show walkthrough tutorial for first-time users
  useEffect(() => {
    if (user?._id && !user.has_seen_tutorial && activeTab === 'overview') {
      const timer = setTimeout(() => setShowWalkthrough(true), 800)
      return () => clearTimeout(timer)
    }
  }, [user, activeTab])

  const handleWalkthroughDone = useCallback(async () => {
    setShowWalkthrough(false)
    if (user?._id) {
      try { await markTutorialComplete({ user_id: user._id }) } catch (e) { console.error('[Walkthrough]', e) }
    }
  }, [user?._id, markTutorialComplete])

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

      case 'email_marketing':
        return user?.role === 'super_admin' ? (
          <SAEmailMarketing />
        ) : (
          <div className="text-center text-gray-400">You do not have access to email marketing.</div>
        )

      case 'vouchers':
        return <AdminVoucherManagement />

      case 'default_services':
        return <DefaultServicesManager />

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

      case 'loyalty':
        return user?.role === 'super_admin' ? (
          <PointsConfigPanel />
        ) : (
          <div className="text-center text-gray-400">You do not have access to loyalty configuration.</div>
        )

      case 'promotions':
        return user?.role === 'super_admin' ? (
          <FlashPromotionsPage />
        ) : (
          <div className="text-center text-gray-400">You do not have access to promotions management.</div>
        )

      case 'wallet':
        return user?.role === 'super_admin' ? (
          <div className="space-y-8">
            <WalletConfigPanel />
            <BranchWalletSettingsPanel />
          </div>
        ) : (
          <div className="text-center text-gray-400">You do not have access to wallet configuration.</div>
        )

      case 'settlements':
        return user?.role === 'super_admin' ? (
          <SettlementApprovalQueue />
        ) : (
          <div className="text-center text-gray-400">You do not have access to settlement management.</div>
        )

      case 'wallet_analytics':
        return user?.role === 'super_admin' ? (
          <WalletOverviewDashboard />
        ) : (
          <div className="text-center text-gray-400">You do not have access to wallet analytics.</div>
        )

      case 'customer_analytics':
        // Available for super_admin (all branches) and branch_admin (their branch only)
        return (user?.role === 'super_admin' || user?.role === 'branch_admin' || user?.role === 'admin') ? (
          <BranchCustomerAnalytics branchId={user?.branch_id} />
        ) : (
          <div className="text-center text-gray-400">You do not have access to customer analytics.</div>
        )

      case 'delivery_orders':
        return user?.role === 'super_admin' ? (
          <DeliveryOrdersManagement />
        ) : (
          <div className="text-center text-gray-400">You do not have access to delivery orders management.</div>
        )

      case 'damage_claims':
        return user?.role === 'super_admin' ? (
          <DamageClaimsManagement user={user} />
        ) : (
          <div className="text-center text-gray-400">You do not have access to damage claims management.</div>
        )

      case 'shop_banners':
        return user?.role === 'super_admin' ? (
          <ShopBannerManagement />
        ) : (
          <div className="text-center text-gray-400">You do not have access to shop banner management.</div>
        )

      case 'shop_config':
        return user?.role === 'super_admin' ? (
          <ShopConfigPanel />
        ) : (
          <div className="text-center text-gray-400">You do not have access to shop configuration.</div>
        )

      default:
        return renderOverview()
    }
  }

  // Tab configuration for admin - categorized hub-style navigation
  const tabs = user?.role === 'super_admin'
    ? [
      // Simple tabs (no category - direct navigation)
      { id: 'overview', label: 'Overview', icon: 'dashboard' },
      { id: 'branches', label: 'Branches', icon: 'building' },
      { id: 'users', label: 'Users', icon: 'users' },
      // Commerce category
      { id: 'default_services', label: 'Services', icon: 'scissors', category: 'Commerce' },
      { id: 'catalog', label: 'Catalog', icon: 'package', category: 'Commerce' },
      { id: 'vouchers', label: 'Vouchers', icon: 'ticket', category: 'Commerce' },
      { id: 'shop_config', label: 'Shop Config', icon: 'shopping-cart', category: 'Commerce' },
      { id: 'shop_banners', label: 'Banners', icon: 'image', category: 'Commerce' },
      { id: 'delivery_orders', label: 'Deliveries', icon: 'truck', category: 'Commerce' },
      { id: 'damage_claims', label: 'Damage Claims', icon: 'alert-triangle', category: 'Commerce' },
      // Finance category
      { id: 'pl', label: 'P&L', icon: 'pie-chart', category: 'Finance' },
      { id: 'balance_sheet', label: 'Balance Sheet', icon: 'scale', category: 'Finance' },
      { id: 'royalty', label: 'Royalty', icon: 'percent', category: 'Finance' },
      { id: 'settlements', label: 'Settlements', icon: 'banknote', category: 'Finance' },
      { id: 'wallet', label: 'Wallet', icon: 'wallet', category: 'Finance' },
      { id: 'wallet_analytics', label: 'Wallet Analytics', icon: 'activity', category: 'Finance' },
      // Marketing category
      { id: 'loyalty', label: 'Loyalty', icon: 'star', category: 'Marketing' },
      { id: 'promotions', label: 'Promos', icon: 'zap', category: 'Marketing' },
      { id: 'email_marketing', label: 'Email AI', icon: 'brain', category: 'Marketing' },
      { id: 'branding', label: 'Branding', icon: 'palette', category: 'Marketing' },
      { id: 'emails', label: 'Emails', icon: 'mail', category: 'Marketing' },
      { id: 'customer_analytics', label: 'Customers', icon: 'target', category: 'Marketing' },
      // Reports category
      { id: 'reports', label: 'Reports', icon: 'chart', category: 'Reports' },
      { id: 'audit_trail', label: 'Audit Trail', icon: 'history', category: 'Reports' },
      // Simple tab
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ]
    : [
      { id: 'overview', label: 'Overview', icon: 'dashboard' },
      { id: 'branches', label: 'Branches', icon: 'building' },
      { id: 'users', label: 'Users', icon: 'users' },
      { id: 'reports', label: 'Reports', icon: 'chart' },
      { id: 'vouchers', label: 'Vouchers', icon: 'ticket' },
      { id: 'customer_analytics', label: 'Customers', icon: 'target' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
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

      {/* Walkthrough Tutorial */}
      <WalkthroughOverlay
        steps={superAdminSteps}
        isVisible={showWalkthrough}
        onComplete={handleWalkthroughDone}
        onSkip={handleWalkthroughDone}
      />

      {/* Help button to re-trigger tutorial */}
      {!showWalkthrough && user?.has_seen_tutorial && (
        <button
          onClick={() => setShowWalkthrough(true)}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all shadow-lg shadow-black/40"
          title="Show tutorial"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export default AdminDashboard