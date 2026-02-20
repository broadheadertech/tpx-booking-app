import React, { useState, useEffect, useCallback } from 'react'
import DashboardHeader from '../../components/admin/DashboardHeader'
import StatsCards from '../../components/admin/StatsCards'
import RecentActivity from '../../components/admin/RecentActivity'
import ITAdminTabNavigation from '../../components/it-admin/ITAdminTabNavigation'
// Reuse all existing admin components
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
import FlashPromotionsPage from '../admin/FlashPromotionsPage'
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
// IT Admin specific components
import SubscriptionManager from '../../components/it-admin/SubscriptionManager'
import LicenseManager from '../../components/it-admin/LicenseManager'
import ErrorMonitorDashboard from '../../components/it-admin/ErrorMonitorDashboard'
import SecurityMonitorDashboard from '../../components/it-admin/SecurityMonitorDashboard'
import BanManager from '../../components/it-admin/BanManager'
import { Wrench, Clock } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useNavigate } from 'react-router-dom'

function ITAdminDashboard() {
  const { user, logout } = useCurrentUser()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('it_admin_dashboard_active_tab') || 'overview'
  })

  useEffect(() => {
    localStorage.setItem('it_admin_dashboard_active_tab', activeTab)
  }, [activeTab])

  // Global queries
  const branches = useQuery(api.services.branches.getAllBranches) || []
  const users = useQuery(api.services.auth.getAllUsers) || []
  const bookingsData = useQuery(api.services.bookings.getAllBookings, { limit: 100 })
  const bookings = bookingsData?.bookings || []
  const services = useQuery(api.services.services.getAllServices) || []
  const barbers = useQuery(api.services.barbers.getAllBarbers) || []
  const transactionsData = useQuery(api.services.transactions.getAllTransactions, { limit: 100 })
  const transactions = transactionsData?.transactions || []

  // IT Admin stats
  const itStats = useQuery(api.services.itAdmin.getItAdminDashboardStats) || null

  // Maintenance mode
  const maintenanceStatus = useQuery(api.services.maintenanceConfig.getMaintenanceStatus)
  const updateMaintenance = useMutation(api.services.maintenanceConfig.updateMaintenanceConfig)
  const [maintenanceDuration, setMaintenanceDuration] = useState('2h')
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)

  const calculateStats = () => {
    if (!branches || !users || !bookings || !transactions) return null

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

  const handleRefresh = () => window.location.reload()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      navigate('/auth/login')
    }
  }

  const renderOverview = () => {
    if (!stats) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
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

        {/* IT Admin Platform Stats */}
        {itStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <p className="text-xs text-gray-500 mb-1">Active Subscriptions</p>
              <p className="text-2xl font-bold text-emerald-400">{itStats.activeSubscriptions}</p>
              <p className="text-xs text-gray-500 mt-1">{itStats.overdueSubscriptions} overdue</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <p className="text-xs text-gray-500 mb-1">Active Licenses</p>
              <p className="text-2xl font-bold text-blue-400">{itStats.activeLicenses}</p>
              <p className="text-xs text-gray-500 mt-1">{itStats.expiringLicenses} expiring</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <p className="text-xs text-gray-500 mb-1">Errors (24h)</p>
              <p className="text-2xl font-bold text-orange-400">{itStats.recentErrors}</p>
              <p className="text-xs text-gray-500 mt-1">{itStats.criticalErrors} critical</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <p className="text-xs text-gray-500 mb-1">Active Threats</p>
              <p className="text-2xl font-bold text-red-400">{itStats.activeThreats}</p>
              <p className="text-xs text-gray-500 mt-1">{itStats.bannedUsers} banned users</p>
            </div>
          </div>
        )}

        <RecentActivity activities={[]} />
      </div>
    )
  }

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
        return <BrandingManagement />
      case 'emails':
        return <EmailNotificationSettings />
      case 'email_marketing':
        return <SAEmailMarketing />
      case 'vouchers':
        return <AdminVoucherManagement />
      case 'default_services':
        return <DefaultServicesManager />
      case 'catalog':
        return <ProductCatalogManager />
      case 'royalty':
        return <RoyaltyManagement />
      case 'pl':
        return <SuperAdminPLDashboard />
      case 'balance_sheet':
        return <SuperAdminBalanceSheet />
      case 'audit_trail':
        return <AuditTrailViewer />
      case 'loyalty':
        return <PointsConfigPanel />
      case 'promotions':
        return <FlashPromotionsPage />
      case 'wallet':
        return (
          <div className="space-y-8">
            <WalletConfigPanel />
            <BranchWalletSettingsPanel />
          </div>
        )
      case 'settlements':
        return <SettlementApprovalQueue />
      case 'wallet_analytics':
        return <WalletOverviewDashboard />
      case 'customer_analytics':
        return <BranchCustomerAnalytics branchId={user?.branch_id} />
      case 'delivery_orders':
        return <DeliveryOrdersManagement />
      case 'damage_claims':
        return <DamageClaimsManagement user={user} />
      case 'shop_banners':
        return <ShopBannerManagement />
      case 'shop_config':
        return <ShopConfigPanel />
      // IT Admin Platform tabs
      case 'subscriptions':
        return <SubscriptionManager />
      case 'licenses':
        return <LicenseManager />
      case 'error_monitor':
        return <ErrorMonitorDashboard />
      case 'security_monitor':
        return <SecurityMonitorDashboard />
      case 'bans':
        return <BanManager />
      case 'maintenance':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Maintenance Mode</h2>
                <p className="text-sm text-gray-400">Control app availability during maintenance</p>
              </div>
            </div>

            {/* Current Status */}
            <div className={`rounded-xl p-4 flex items-center justify-between ${
              maintenanceStatus?.is_enabled
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'bg-[#1A1A1A] border border-[#2A2A2A]'
            }`}>
              <div>
                <p className="text-white font-medium">
                  {maintenanceStatus?.is_enabled ? 'Maintenance is ACTIVE' : 'Maintenance Mode'}
                </p>
                <p className="text-sm text-gray-400">
                  {maintenanceStatus?.is_enabled
                    ? 'Users cannot access the app right now'
                    : 'Enable to block user access during maintenance'}
                </p>
                {maintenanceStatus?.is_enabled && maintenanceStatus?.end_time && (
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ends: {new Date(maintenanceStatus.end_time).toLocaleString('en-PH', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              <button
                disabled={maintenanceSaving}
                onClick={async () => {
                  if (maintenanceStatus?.is_enabled) {
                    setMaintenanceSaving(true)
                    try {
                      await updateMaintenance({ is_enabled: false })
                    } catch (e) {
                      console.error('Failed to disable maintenance:', e)
                    } finally {
                      setMaintenanceSaving(false)
                    }
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  maintenanceStatus?.is_enabled
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                    : 'bg-gray-600'
                } ${maintenanceStatus?.is_enabled ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  maintenanceStatus?.is_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Enable Maintenance Controls (only show when OFF) */}
            {!maintenanceStatus?.is_enabled && (
              <div className="space-y-4 bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Duration</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: '30m', label: '30 min' },
                      { value: '1h', label: '1 hour' },
                      { value: '2h', label: '2 hours' },
                      { value: '4h', label: '4 hours' },
                      { value: '8h', label: '8 hours' },
                      { value: '24h', label: '24 hours' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMaintenanceDuration(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          maintenanceDuration === opt.value
                            ? 'bg-amber-500 text-white'
                            : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Message (optional)</label>
                  <textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="We're making improvements. Please check back soon."
                    rows={2}
                    className="w-full bg-[#2A2A2A] text-white rounded-lg p-3 text-sm border border-[#3A3A3A] focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  disabled={maintenanceSaving}
                  onClick={async () => {
                    setMaintenanceSaving(true)
                    try {
                      const durationMap = {
                        '30m': 30 * 60 * 1000,
                        '1h': 60 * 60 * 1000,
                        '2h': 2 * 60 * 60 * 1000,
                        '4h': 4 * 60 * 60 * 1000,
                        '8h': 8 * 60 * 60 * 1000,
                        '24h': 24 * 60 * 60 * 1000,
                      }
                      const durationMs = durationMap[maintenanceDuration] || 2 * 60 * 60 * 1000
                      await updateMaintenance({
                        is_enabled: true,
                        end_time: Date.now() + durationMs,
                        message: maintenanceMessage || undefined,
                      })
                    } catch (e) {
                      console.error('Failed to enable maintenance:', e)
                    } finally {
                      setMaintenanceSaving(false)
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  {maintenanceSaving ? 'Enabling...' : 'Enable Maintenance Mode'}
                </button>
              </div>
            )}
          </div>
        )
      default:
        return renderOverview()
    }
  }

  const tabs = [
    // Simple tabs
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'branches', label: 'Branches', icon: 'building' },
    { id: 'users', label: 'Users', icon: 'users' },
    // Commerce category
    { id: 'default_services', label: 'Services', icon: 'scissors', category: 'Commerce' },
    { id: 'catalog', label: 'Catalog', icon: 'package', category: 'Commerce' },
    { id: 'vouchers', label: 'Vouchers', icon: 'ticket', category: 'Commerce' },
    { id: 'shop_banners', label: 'Banners', icon: 'image', category: 'Commerce' },
    { id: 'delivery_orders', label: 'Deliveries', icon: 'truck', category: 'Commerce' },
    { id: 'damage_claims', label: 'Damage Claims', icon: 'alert-triangle', category: 'Commerce' },
    // Finance category
    { id: 'pl', label: 'P&L', icon: 'pie-chart', category: 'Finance' },
    { id: 'balance_sheet', label: 'Balance Sheet', icon: 'scale', category: 'Finance' },
    { id: 'royalty', label: 'Royalty', icon: 'percent', category: 'Finance' },
    { id: 'settlements', label: 'Settlements', icon: 'banknote', category: 'Finance' },
    { id: 'wallet_analytics', label: 'Wallet Analytics', icon: 'activity', category: 'Finance' },
    // Marketing category
    { id: 'promotions', label: 'Promos', icon: 'zap', category: 'Marketing' },
    { id: 'email_marketing', label: 'Email AI', icon: 'brain', category: 'Marketing' },
    { id: 'branding', label: 'Branding', icon: 'palette', category: 'Marketing' },
    { id: 'emails', label: 'Emails', icon: 'mail', category: 'Marketing' },
    { id: 'customer_analytics', label: 'Customers', icon: 'target', category: 'Marketing' },
    // Configs category
    { id: 'shop_config', label: 'Shop Config', icon: 'shopping-cart', category: 'Configs' },
    { id: 'wallet', label: 'Wallet Config', icon: 'wallet', category: 'Configs' },
    { id: 'loyalty', label: 'Loyalty Config', icon: 'star', category: 'Configs' },
    // Reports category
    { id: 'reports', label: 'Reports', icon: 'chart', category: 'Reports' },
    { id: 'audit_trail', label: 'Audit Trail', icon: 'history', category: 'Reports' },
    // Platform category (IT Admin exclusive)
    { id: 'subscriptions', label: 'Subscriptions', icon: 'credit-card', category: 'Platform' },
    { id: 'licenses', label: 'Licenses', icon: 'key', category: 'Platform' },
    { id: 'error_monitor', label: 'Errors', icon: 'bug', category: 'Platform' },
    { id: 'security_monitor', label: 'Security', icon: 'shield-alert', category: 'Platform' },
    { id: 'bans', label: 'Bans', icon: 'ban', category: 'Platform' },
    { id: 'maintenance', label: 'Maintenance', icon: 'wrench', category: 'Platform' },
    // Simple tab
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] via-[#1A1A1A] to-[#2A2A2A]">
      <DashboardHeader onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <ITAdminTabNavigation
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

export default ITAdminDashboard
