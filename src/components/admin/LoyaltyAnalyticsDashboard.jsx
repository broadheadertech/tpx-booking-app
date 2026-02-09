import React, { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  Award,
  RefreshCw
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'

/**
 * Loyalty Analytics Dashboard
 *
 * Displays loyalty program metrics:
 * - Wallet metrics (top-ups, payments, net float)
 * - Points metrics (earned, redeemed, circulation)
 * - VIP tier distribution
 * - Branch comparison (Super Admin)
 *
 * Story 19.3: Loyalty Analytics Dashboard
 */
const LoyaltyAnalyticsDashboard = () => {
  const { user } = useCurrentUser()
  const [datePreset, setDatePreset] = useState('this_month')
  const isSuperAdmin = user?.role === 'super_admin'

  // Wallet metrics (system-wide)
  const walletMetrics = useQuery(
    api.services.loyaltyAnalytics.getSystemWideWalletMetrics,
    { preset: datePreset }
  )

  // Total wallet balances
  const walletBalances = useQuery(
    api.services.loyaltyAnalytics.getTotalWalletBalances
  )

  // Points metrics
  const pointsMetrics = useQuery(
    api.services.loyaltyAnalytics.getSystemWidePointsMetrics,
    { preset: datePreset }
  )

  // Tier distribution
  const tierDistribution = useQuery(
    api.services.loyaltyAnalytics.getSystemWideTierDistribution
  )

  // Retention metrics
  const retentionMetrics = useQuery(
    api.services.loyaltyAnalytics.getVIPRetentionMetrics,
    { days: 30 }
  )

  // Branch comparison (Super Admin only)
  const branchComparison = useQuery(
    api.services.loyaltyAnalytics.getBranchComparison,
    isSuperAdmin ? { preset: datePreset } : 'skip'
  )

  // Format currency
  const formatPeso = (amount) => {
    if (amount === undefined || amount === null) return '₱0.00'
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format points
  const formatPoints = (points) => {
    if (points === undefined || points === null) return '0'
    return points.toLocaleString('en-PH')
  }

  // Format percentage
  const formatPercent = (value) => {
    if (value === undefined || value === null) return '0%'
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  // Get trend icon and color
  const getTrendIndicator = (value) => {
    if (value === undefined || value === null || value === 0) {
      return { icon: null, color: 'text-gray-400' }
    }
    return value > 0
      ? { icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-green-400' }
      : { icon: <ArrowDownRight className="w-4 h-4" />, color: 'text-red-400' }
  }

  // Date preset options
  const datePresets = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_30_days', label: 'Last 30 Days' },
  ]

  // Loading state
  if (!walletMetrics || !pointsMetrics || !tierDistribution) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[var(--color-primary)]" />
            Loyalty Analytics
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[var(--color-primary)]" />
          Loyalty Analytics
        </h2>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {datePresets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Wallet Top-ups */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Wallet className="w-5 h-5 text-green-400" />
            {walletMetrics?.trends?.topUps !== undefined && (
              <div className={`flex items-center text-xs ${getTrendIndicator(walletMetrics.trends.topUps).color}`}>
                {getTrendIndicator(walletMetrics.trends.topUps).icon}
                <span>{formatPercent(walletMetrics.trends.topUps)}</span>
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPeso(walletMetrics.topUps)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Wallet Top-ups</div>
          <div className="text-xs text-gray-500">{walletMetrics.topUpCount} transactions</div>
        </div>

        {/* Wallet Payments */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Coins className="w-5 h-5 text-blue-400" />
            {walletMetrics?.trends?.payments !== undefined && (
              <div className={`flex items-center text-xs ${getTrendIndicator(walletMetrics.trends.payments).color}`}>
                {getTrendIndicator(walletMetrics.trends.payments).icon}
                <span>{formatPercent(walletMetrics.trends.payments)}</span>
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPeso(walletMetrics.payments)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Wallet Payments</div>
          <div className="text-xs text-gray-500">{walletMetrics.paymentCount} transactions</div>
        </div>

        {/* Net Float */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className={`text-2xl font-bold ${walletMetrics.netFloat >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPeso(walletMetrics.netFloat)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Net Wallet Float</div>
          <div className="text-xs text-gray-500">Top-ups - Payments</div>
        </div>

        {/* Points in Circulation */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPoints(pointsMetrics.displayCirculating)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Points Circulating</div>
          <div className="text-xs text-gray-500">Liability: {formatPeso(pointsMetrics.liabilityValue)}</div>
        </div>
      </div>

      {/* Points & Wallet Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Points Metrics Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-[var(--color-primary)]" />
            Points Activity
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">Points Earned</div>
                <div className="text-xl font-bold text-green-400">
                  +{formatPoints(pointsMetrics.displayPointsEarned)}
                </div>
              </div>
              {pointsMetrics?.trends?.earned !== undefined && (
                <div className={`text-sm ${getTrendIndicator(pointsMetrics.trends.earned).color}`}>
                  {formatPercent(pointsMetrics.trends.earned)} vs prev
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">Points Redeemed</div>
                <div className="text-xl font-bold text-red-400">
                  -{formatPoints(pointsMetrics.displayPointsRedeemed)}
                </div>
              </div>
              {pointsMetrics?.trends?.redeemed !== undefined && (
                <div className={`text-sm ${getTrendIndicator(pointsMetrics.trends.redeemed).color}`}>
                  {formatPercent(pointsMetrics.trends.redeemed)} vs prev
                </div>
              )}
            </div>

            <div className="border-t border-[#2A2A2A] pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Lifetime Earned</span>
                <span className="text-white">{formatPoints(pointsMetrics.totalLifetimeEarned / 100)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Lifetime Redeemed</span>
                <span className="text-white">{formatPoints(pointsMetrics.totalLifetimeRedeemed / 100)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Active Users w/ Points</span>
                <span className="text-white">{pointsMetrics.activeUsers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Balances Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
            Wallet Balances
          </h3>

          {walletBalances && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-400">Total Main Balance</div>
                  <div className="text-xl font-bold text-white">
                    {formatPeso(walletBalances.totalMainBalance)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-400">Total Bonus Balance</div>
                  <div className="text-xl font-bold text-yellow-400">
                    {formatPeso(walletBalances.totalBonusBalance)}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#2A2A2A] pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Combined Balance</span>
                  <span className="text-green-400 font-semibold">{formatPeso(walletBalances.totalBalance)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Active Wallets</span>
                  <span className="text-white">{walletBalances.activeWallets}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Total Wallets</span>
                  <span className="text-white">{walletBalances.totalWallets}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIP Tier Distribution & Retention Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tier Distribution */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-primary)]" />
            VIP Tier Distribution
          </h3>

          <div className="space-y-3">
            {tierDistribution.tiers.map((tier) => {
              const percentage = tierDistribution.totalVIPCustomers > 0
                ? (tier.count / tierDistribution.totalVIPCustomers) * 100
                : 0

              return (
                <div key={tier.tierId} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tier.icon}</span>
                      <span className="text-white">{tier.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold">{tier.count}</span>
                      <span className="text-gray-400 text-sm ml-2">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percentage, 1)}%`,
                        backgroundColor: tier.color,
                      }}
                    />
                  </div>
                </div>
              )
            })}

            <div className="border-t border-[#2A2A2A] pt-3 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total VIP Customers</span>
                <span className="text-white font-semibold">{tierDistribution.totalVIPCustomers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Retention Metrics */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
            Customer Retention (30 Days)
          </h3>

          {retentionMetrics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[#2A2A2A] rounded-lg">
                  <div className="text-2xl font-bold text-white">
                    {retentionMetrics.currentPeriodCustomers}
                  </div>
                  <div className="text-xs text-gray-400">Active Customers</div>
                </div>
                <div className="text-center p-3 bg-[#2A2A2A] rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {retentionMetrics.returningCustomers}
                  </div>
                  <div className="text-xs text-gray-400">Returning</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[#2A2A2A] rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {retentionMetrics.newCustomers}
                  </div>
                  <div className="text-xs text-gray-400">New Customers</div>
                </div>
                <div className="text-center p-3 bg-[#2A2A2A] rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">
                    {retentionMetrics.retentionRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400">Retention Rate</div>
                </div>
              </div>

              <div className="border-t border-[#2A2A2A] pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">VIP Customers Active</span>
                  <span className="text-white">{retentionMetrics.vipCustomersInPeriod}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">VIP Returning</span>
                  <span className="text-white">{retentionMetrics.vipReturning}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">VIP Retention Rate</span>
                  <span className="text-green-400 font-semibold">{retentionMetrics.vipRetentionRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Branch Comparison (Super Admin Only) */}
      {isSuperAdmin && branchComparison && branchComparison.branches.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
            Branch Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left text-gray-400 font-medium py-3 px-2">Branch</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-2">Points Earned</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-2">Points Redeemed</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-2">Net Points</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-2">Customers</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-2">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {branchComparison.branches.map((branch, index) => (
                  <tr
                    key={branch.branchId}
                    className={`border-b border-[#2A2A2A] ${index === 0 ? 'bg-[#2A2A2A]/30' : ''}`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-yellow-400">🏆</span>}
                        <span className="text-white">{branch.branchName}</span>
                      </div>
                    </td>
                    <td className="text-right text-green-400 py-3 px-2">
                      +{formatPoints(branch.displayPointsEarned)}
                    </td>
                    <td className="text-right text-red-400 py-3 px-2">
                      -{formatPoints(branch.displayPointsRedeemed)}
                    </td>
                    <td className={`text-right py-3 px-2 ${branch.netPoints >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPoints(branch.netPoints / 100)}
                    </td>
                    <td className="text-right text-white py-3 px-2">
                      {branch.uniqueCustomers}
                    </td>
                    <td className="text-right text-gray-400 py-3 px-2">
                      {branch.transactionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-400 text-right">
            Showing {branchComparison.totalBranches} branches • Sorted by Points Earned
          </div>
        </div>
      )}
    </div>
  )
}

export default LoyaltyAnalyticsDashboard
