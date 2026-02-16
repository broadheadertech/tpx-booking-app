import React, { useState, useCallback } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Heart,
  Building2,
  Phone,
  Mail,
  DollarSign,
  Send,
  ChevronDown,
  ChevronUp,
  Target,
  HelpCircle,
  Search,
} from 'lucide-react'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { customerAnalyticsSteps } from '../../config/walkthroughSteps'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'

/**
 * Branch Customer Analytics Dashboard
 *
 * Displays customer-branch activity metrics for marketing and churn prevention:
 * - Customer status distribution (active, at-risk, churned)
 * - At-risk customers list for win-back campaigns
 * - Top customers by spending
 * - Churn metrics and trends
 *
 * Status thresholds:
 * - Active: 0-12 days since last visit
 * - At-risk: 13-30 days since last visit
 * - Churned: 31+ days since last visit
 */
const BranchCustomerAnalytics = ({ branchId }) => {
  const { user } = useCurrentUser()
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showAtRiskList, setShowAtRiskList] = useState(true)
  const [showTopCustomers, setShowTopCustomers] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')

  const isSuperAdmin = user?.role === 'super_admin'
  const isBranchAdmin = user?.role === 'branch_admin' || user?.role === 'admin'

  // Get all branches for super admin
  const branches = useQuery(
    api.services.branches.getAllBranches,
    isSuperAdmin ? {} : 'skip'
  )

  // For branch admin, use their assigned branch
  const userBranchId = user?.branch_id || branchId

  const [selectedBranchId, setSelectedBranchId] = useState(branchId)

  // Use the selected branch for super admin, or the user's branch for branch admin
  const activeBranchId = isSuperAdmin ? selectedBranchId : userBranchId

  // Get churn metrics for the branch
  const churnMetrics = useQuery(
    api.services.customerBranchActivity.getBranchChurnMetrics,
    activeBranchId ? { branchId: activeBranchId } : 'skip'
  )

  // Get at-risk customers
  const atRiskCustomers = useQuery(
    api.services.customerBranchActivity.getAtRiskCustomers,
    activeBranchId ? { branchId: activeBranchId, optedInOnly: false } : 'skip'
  )

  // Get top customers
  const topCustomers = useQuery(
    api.services.customerBranchActivity.getTopCustomers,
    activeBranchId ? { branchId: activeBranchId, limit: 10 } : 'skip'
  )

  // Get customers by status filter
  const filteredCustomers = useQuery(
    api.services.customerBranchActivity.getBranchCustomers,
    activeBranchId && selectedStatus !== 'all'
      ? { branchId: activeBranchId, status: selectedStatus }
      : 'skip'
  )

  // Get all users for customer list (super admin only)
  const allUsers = useQuery(
    api.services.auth.getAllUsers,
    isSuperAdmin ? undefined : 'skip'
  )

  // Filter to customers only + apply search
  const customerList = React.useMemo(() => {
    if (!allUsers) return []
    let customers = allUsers.filter((u) => u.role === 'customer')
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase()
      customers = customers.filter(
        (u) =>
          (u.nickname || u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.mobile_number || '').toLowerCase().includes(q)
      )
    }
    return customers
  }, [allUsers, customerSearch])

  // Format currency
  const formatPeso = (amount) => {
    if (amount === undefined || amount === null) return '₱0'
    return `₱${amount.toLocaleString()}`
  }

  // Format days
  const formatDays = (days) => {
    if (days === undefined || days === null) return 'N/A'
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'at_risk':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'churned':
        return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'win_back':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      case 'new':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <UserCheck className="w-4 h-4" />
      case 'at_risk':
        return <AlertTriangle className="w-4 h-4" />
      case 'churned':
        return <UserX className="w-4 h-4" />
      case 'win_back':
        return <Heart className="w-4 h-4" />
      case 'new':
        return <Users className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  // Loading state — only block for branch admins who have a fixed branch
  // Super admin can see the page without a branch selected (wallet section doesn't need one)
  if (!isSuperAdmin && !churnMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="analytics-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-[var(--color-primary)]" />
              Customer Analytics
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Track customer activity, identify churn risk, and optimize retention
            </p>
          </div>
          <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Branch Selector for Super Admin */}
        {isSuperAdmin && branches && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Branch Name Display for Branch Admin */}
        {!isSuperAdmin && isBranchAdmin && (
          <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-2">
            <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-white text-sm font-medium">Your Branch Customers</span>
          </div>
        )}
      </div>

      {/* Branch-specific sections — require a branch to be selected */}
      {isSuperAdmin && !activeBranchId && (
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl border border-[#333] p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Select a branch above to view customer activity, churn metrics, and top customers.</p>
        </div>
      )}

      {churnMetrics && (
      <>
      {/* Status Cards */}
      <div data-tour="analytics-status-cards" className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Customers */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl p-4 border border-[#333]">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{churnMetrics.total}</p>
          <p className="text-xs text-gray-400 mt-1">Customers</p>
        </div>

        {/* Active Customers */}
        <div
          className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl p-4 border border-green-500/30 cursor-pointer hover:border-green-500/50 transition-colors"
          onClick={() => setSelectedStatus(selectedStatus === 'active' ? 'all' : 'active')}
        >
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="w-5 h-5 text-green-400" />
            <span className="text-xs text-green-400">{churnMetrics.active_rate}%</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{churnMetrics.active}</p>
          <p className="text-xs text-gray-400 mt-1">Active (0-12 days)</p>
        </div>

        {/* At-Risk Customers */}
        <div
          className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl p-4 border border-yellow-500/30 cursor-pointer hover:border-yellow-500/50 transition-colors"
          onClick={() => setSelectedStatus(selectedStatus === 'at_risk' ? 'all' : 'at_risk')}
        >
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-yellow-400">{churnMetrics.at_risk_rate}%</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{churnMetrics.at_risk}</p>
          <p className="text-xs text-gray-400 mt-1">At Risk (13-30 days)</p>
        </div>

        {/* Churned Customers */}
        <div
          className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl p-4 border border-red-500/30 cursor-pointer hover:border-red-500/50 transition-colors"
          onClick={() => setSelectedStatus(selectedStatus === 'churned' ? 'all' : 'churned')}
        >
          <div className="flex items-center justify-between mb-2">
            <UserX className="w-5 h-5 text-red-400" />
            <span className="text-xs text-red-400">{churnMetrics.churn_rate}%</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{churnMetrics.churned}</p>
          <p className="text-xs text-gray-400 mt-1">Churned (31+ days)</p>
        </div>

        {/* Win-Back */}
        <div
          className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl p-4 border border-purple-500/30 cursor-pointer hover:border-purple-500/50 transition-colors"
          onClick={() => setSelectedStatus(selectedStatus === 'win_back' ? 'all' : 'win_back')}
        >
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-purple-400">{churnMetrics.win_back_rate}%</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{churnMetrics.win_back}</p>
          <p className="text-xs text-gray-400 mt-1">Won Back</p>
        </div>
      </div>

      {/* Revenue & Marketing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl p-5 border border-[#333]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Customer Revenue</p>
              <p className="text-3xl font-bold text-white mt-1">
                {formatPeso(churnMetrics.total_revenue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* Marketing Opted-In */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl p-5 border border-[#333]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Opted-in for Marketing</p>
              <p className="text-3xl font-bold text-white mt-1">
                {churnMetrics.opted_in_marketing}
                <span className="text-lg text-gray-400 ml-2">
                  / {churnMetrics.total}
                </span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* At-Risk Customers Section */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl border border-[#333] overflow-hidden">
        <button
          onClick={() => setShowAtRiskList(!showAtRiskList)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">
              At-Risk Customers
              <span className="text-yellow-400 ml-2">({atRiskCustomers?.length || 0})</span>
            </h3>
          </div>
          {showAtRiskList ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showAtRiskList && atRiskCustomers && atRiskCustomers.length > 0 && (
          <div className="border-t border-[#333]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#252525]">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Customer
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Last Visit
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Total Bookings
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Total Spent
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Contact
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333]">
                  {atRiskCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-[#252525]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <span className="text-yellow-400 font-semibold text-sm">
                              {customer.customer_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium text-sm">
                                {customer.customer_name || 'Unknown'}
                              </p>
                              {customer.is_guest && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/20 text-orange-400 rounded">
                                  Guest
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs">{customer.customer_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 text-sm font-medium">
                            {formatDays(customer.days_since_last_visit)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{customer.total_bookings}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-400 text-sm font-medium">
                          {formatPeso(customer.total_spent)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {customer.customer_phone && (
                            <a
                              href={`tel:${customer.customer_phone}`}
                              className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {customer.customer_email && (
                            <a
                              href={`mailto:${customer.customer_email}`}
                              className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                              title="Email"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showAtRiskList && (!atRiskCustomers || atRiskCustomers.length === 0) && (
          <div className="p-8 text-center border-t border-[#333]">
            <UserCheck className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-400">No at-risk customers! Great retention.</p>
          </div>
        )}
      </div>

      {/* Top Customers Section */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl border border-[#333] overflow-hidden">
        <button
          onClick={() => setShowTopCustomers(!showTopCustomers)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">
              Top Customers by Spending
            </h3>
          </div>
          {showTopCustomers ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showTopCustomers && topCustomers && topCustomers.length > 0 && (
          <div className="border-t border-[#333]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#252525]">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Rank
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Customer
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Total Bookings
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                      Total Spent
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333]">
                  {topCustomers.map((customer, index) => {
                    return (
                    <tr key={customer._id} className="hover:bg-[#252525]/50 transition-colors cursor-pointer" onClick={() => setSelectedCustomerId(customer.customer_id)}>
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          index === 1 ? 'bg-gray-400/20 text-gray-300' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-[#333] text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                            <span className="text-[var(--color-primary)] font-semibold text-sm">
                              {customer.customer_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium text-sm">
                                {customer.customer_name || 'Unknown'}
                              </p>
                              {customer.is_guest && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/20 text-orange-400 rounded">
                                  Guest
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs">{customer.customer_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(customer.status)}`}>
                          {getStatusIcon(customer.status)}
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{customer.total_bookings}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-400 text-sm font-bold">
                          {formatPeso(customer.total_spent)}
                        </span>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showTopCustomers && (!topCustomers || topCustomers.length === 0) && (
          <div className="p-8 text-center border-t border-[#333]">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No customer data yet.</p>
          </div>
        )}
      </div>

      {/* Filtered Customers List (when status is selected) */}
      {selectedStatus !== 'all' && filteredCustomers && (
        <div data-tour="analytics-table" className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl border border-[#333] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#333]">
            <div className="flex items-center gap-3">
              {getStatusIcon(selectedStatus)}
              <h3 className="text-lg font-semibold text-white capitalize">
                {selectedStatus.replace('_', ' ')} Customers
                <span className="text-gray-400 ml-2">({filteredCustomers.length})</span>
              </h3>
            </div>
            <button
              onClick={() => setSelectedStatus('all')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear Filter
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-[#252525] sticky top-0">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                    Last Visit
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                    Bookings
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">
                    Spent
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {filteredCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-[#252525]/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium text-sm">
                        {customer.customer_name || 'Unknown'}
                      </p>
                      <p className="text-gray-500 text-xs">{customer.customer_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-sm">
                        {formatDays(customer.days_since_last_visit)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white text-sm">{customer.total_bookings}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-400 text-sm font-medium">
                        {formatPeso(customer.total_spent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}

      {/* All Customers List (Super Admin Only) */}
      {isSuperAdmin && customerList && (
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] rounded-xl border border-[#333] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#333]">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[var(--color-primary)]" />
              <h3 className="text-lg font-semibold text-white">
                All Customers
                <span className="text-gray-400 ml-2">({customerList.length})</span>
              </h3>
            </div>
          </div>

          <div className="p-3 border-b border-[#333]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#333] rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full">
              <thead className="bg-[#252525] sticky top-0">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Contact</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {customerList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500 text-sm">
                      {customerSearch ? 'No customers match your search' : 'No customers found'}
                    </td>
                  </tr>
                ) : (
                  customerList.map((c) => (
                    <tr key={c._id} className="hover:bg-[#252525]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                            <span className="text-[var(--color-primary)] font-semibold text-sm">
                              {(c.nickname || c.username || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{c.nickname || c.username || 'Unknown'}</p>
                            <p className="text-gray-500 text-xs">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-sm">{c.mobile_number || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {c.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                        {c.is_guest && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/20 text-orange-400 rounded">Guest</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTutorial && (
        <WalkthroughOverlay steps={customerAnalyticsSteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
      )}
    </div>
  )
}

export default BranchCustomerAnalytics
