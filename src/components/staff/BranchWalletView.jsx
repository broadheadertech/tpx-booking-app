import React from 'react'
import {
  Wallet,
  Percent,
  Calendar,
  Clock,
  CreditCard,
  Building2,
  CheckCircle,
  AlertCircle,
  Info,
  Banknote
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'

/**
 * Branch Wallet View
 *
 * Read-only view for branch admins to see their wallet configuration:
 * - Effective commission rate (global or override)
 * - Settlement frequency (global or override)
 * - Payout details status
 * - Settlement eligibility
 *
 * Story 21.4: Configure Branch Wallet Settings
 */
const BranchWalletView = () => {
  const { user } = useCurrentUser()
  const branchId = user?.branch_id

  // Fetch branch wallet settings
  const branchSettings = useQuery(
    api.services.branchWalletSettings.getBranchWalletSettings,
    branchId ? { branch_id: branchId } : "skip"
  )

  // Fetch effective rates
  const effectiveCommission = useQuery(
    api.services.branchWalletSettings.getEffectiveCommissionRate,
    branchId ? { branch_id: branchId } : "skip"
  )

  const effectiveFrequency = useQuery(
    api.services.branchWalletSettings.getEffectiveSettlementFrequency,
    branchId ? { branch_id: branchId } : "skip"
  )

  // Check payout configuration status
  const payoutStatus = useQuery(
    api.services.branchWalletSettings.hasPayoutDetailsConfigured,
    branchId ? { branch_id: branchId } : "skip"
  )

  // Get global config for comparison
  const globalConfig = useQuery(api.services.walletConfig.getCommissionRate)
  const settlementParams = useQuery(api.services.walletConfig.getSettlementParams)

  // Loading state
  if (!branchId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-400">No branch assigned to your account.</p>
        <p className="text-sm text-gray-500 mt-2">Please contact a super admin to assign you to a branch.</p>
      </div>
    )
  }

  if (effectiveCommission === undefined || effectiveFrequency === undefined) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading wallet settings...</p>
      </div>
    )
  }

  // Format frequency label
  const formatFrequency = (freq) => {
    switch (freq) {
      case 'daily': return 'Daily'
      case 'weekly': return 'Weekly'
      case 'biweekly': return 'Bi-weekly'
      default: return freq
    }
  }

  // Format payout method label
  const formatPayoutMethod = (method) => {
    switch (method) {
      case 'gcash': return 'GCash'
      case 'maya': return 'Maya'
      case 'bank': return 'Bank Transfer'
      default: return method || 'Not configured'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
          <Wallet className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Branch Wallet Settings</h2>
          <p className="text-sm text-gray-400">View your branch's wallet configuration</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Wallet settings are managed by Super Admin</p>
            <p className="text-blue-400/80">
              Contact your administrator if you need to update payout details or request a commission rate adjustment.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Rate Card */}
        <div className="p-5 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                <Percent className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-white font-medium">Commission Rate</p>
                <p className="text-xs text-gray-500">Platform fee on wallet payments</p>
              </div>
            </div>
            {effectiveCommission?.is_override && (
              <span className="px-2 py-1 text-xs font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded">
                Custom
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-black text-white">{effectiveCommission?.commission_percent || 5}</span>
            <span className="text-2xl font-bold text-[var(--color-primary)]">%</span>
          </div>

          <p className="text-sm text-gray-400">
            {effectiveCommission?.is_override ? (
              <>Your branch has a custom rate. Global rate is {globalConfig?.commission_percent || 5}%.</>
            ) : (
              <>Using the global commission rate set by Super Admin.</>
            )}
          </p>

          {/* Commission Preview */}
          <div className="mt-4 p-3 bg-[#0A0A0A] rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Example: ₱1,000 wallet payment</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">Payment</p>
                <p className="text-sm font-semibold text-white">₱1,000</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Commission</p>
                <p className="text-sm font-semibold text-[var(--color-primary)]">
                  ₱{Math.round(1000 * ((effectiveCommission?.commission_percent || 5) / 100))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">You Receive</p>
                <p className="text-sm font-semibold text-green-400">
                  ₱{1000 - Math.round(1000 * ((effectiveCommission?.commission_percent || 5) / 100))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settlement Frequency Card */}
        <div className="p-5 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-white font-medium">Settlement Frequency</p>
                <p className="text-xs text-gray-500">How often payouts are processed</p>
              </div>
            </div>
            {effectiveFrequency?.is_override && (
              <span className="px-2 py-1 text-xs font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded">
                Custom
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-6 h-6 text-[var(--color-primary)]" />
            <span className="text-2xl font-bold text-white">
              {formatFrequency(effectiveFrequency?.frequency)}
            </span>
          </div>

          <p className="text-sm text-gray-400">
            {effectiveFrequency?.is_override ? (
              <>Your branch has a custom schedule. Default is {formatFrequency(settlementParams?.default_frequency || 'weekly')}.</>
            ) : (
              <>Using the default settlement schedule.</>
            )}
          </p>

          {/* Minimum Amount Info */}
          <div className="mt-4 p-3 bg-[#0A0A0A] rounded-lg flex items-center gap-3">
            <Banknote className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Minimum Settlement Amount</p>
              <p className="text-sm font-semibold text-white">
                ₱{(settlementParams?.min_settlement_amount || 500).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Payout Details Card */}
        <div className="p-5 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-white font-medium">Payout Details</p>
                <p className="text-xs text-gray-500">Where your earnings will be sent</p>
              </div>
            </div>
            {payoutStatus?.configured ? (
              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                <CheckCircle className="w-3 h-3" />
                Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded">
                <AlertCircle className="w-3 h-3" />
                Incomplete
              </span>
            )}
          </div>

          {branchSettings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Payout Method */}
              <div className="p-3 bg-[#0A0A0A] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Payout Method</p>
                <p className="text-sm font-medium text-white">
                  {formatPayoutMethod(branchSettings.payout_method)}
                </p>
              </div>

              {/* Account Number */}
              <div className="p-3 bg-[#0A0A0A] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Account Number</p>
                <p className="text-sm font-medium text-white">
                  {branchSettings.payout_account_number
                    ? `****${branchSettings.payout_account_number.slice(-4)}`
                    : 'Not set'}
                </p>
              </div>

              {/* Account Name */}
              <div className="p-3 bg-[#0A0A0A] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Account Name</p>
                <p className="text-sm font-medium text-white">
                  {branchSettings.payout_account_name || 'Not set'}
                </p>
              </div>

              {/* Bank Name (if applicable) */}
              {branchSettings.payout_method === 'bank' && (
                <div className="p-3 bg-[#0A0A0A] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Bank Name</p>
                  <p className="text-sm font-medium text-white">
                    {branchSettings.payout_bank_name || 'Not set'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
              <p className="text-gray-400">No payout details configured yet.</p>
              <p className="text-sm text-gray-500 mt-1">
                Contact your Super Admin to set up payout details for your branch.
              </p>
            </div>
          )}

          {/* Payout Status Warning */}
          {!payoutStatus?.configured && payoutStatus?.reason && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{payoutStatus.reason}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BranchWalletView
