import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, Gift, Trophy, Crown, Zap, TrendingUp, Sparkles, ChevronRight } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEnsureClerkUser } from '../../hooks/useEnsureClerkUser'
import StarRewardsCard from '../common/StarRewardsCard'

const LoyaltyPoints = ({ onBack }) => {
  const navigate = useNavigate()

  // Use the hook that ensures Clerk users have Convex records
  const { user } = useEnsureClerkUser()

  // Fetch real data from Convex
  const ledger = useQuery(
    api.services.points.getPointsLedger,
    user?._id ? { userId: user._id } : 'skip'
  )

  const tierProgress = useQuery(
    api.services.tiers.getTierProgress,
    user?._id ? { userId: user._id } : 'skip'
  )

  const allTiers = useQuery(api.services.tiers.getTiers)

  const pointsHistory = useQuery(
    api.services.points.getPointsHistory,
    user?._id ? { userId: user._id, limit: 10 } : 'skip'
  )

  // Calculate display values
  const currentBalance = ledger?.current_balance ? ledger.current_balance / 100 : 0
  const lifetimePoints = ledger?.lifetime_earned ? ledger.lifetime_earned / 100 : 0
  const currentTier = tierProgress?.currentTier
  const nextTier = tierProgress?.nextTier
  const progressPercent = tierProgress?.progressPercent || 0
  const pointsToNext = tierProgress?.pointsToNextTier ? tierProgress.pointsToNextTier / 100 : 0
  const isMaxTier = tierProgress?.isMaxTier || false

  // Tier icon mapping
  const getTierIcon = (tierName) => {
    const icons = {
      'Bronze': '🥉',
      'Silver': '🥈',
      'Gold': '🥇',
      'Platinum': '👑'
    }
    return icons[tierName] || '⭐'
  }

  // Tier color mapping
  const getTierColor = (tierName) => {
    const colors = {
      'Bronze': 'from-amber-600 to-amber-700',
      'Silver': 'from-gray-400 to-gray-500',
      'Gold': 'from-yellow-500 to-yellow-600',
      'Platinum': 'from-purple-500 to-purple-600'
    }
    return colors[tierName] || 'from-gray-400 to-gray-500'
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/customer/dashboard')
    }
  }

  // Loading state
  if (ledger === undefined || tierProgress === undefined) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading rewards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-2xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-lg font-bold text-white">Rewards</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Star Rewards Hero Card */}
        <StarRewardsCard userId={user?._id} />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1A1A1A] rounded-[20px] p-5 border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-gold)]/20 flex items-center justify-center">
                <Star className="w-4 h-4 text-[var(--color-gold)]" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Available</span>
            </div>
            <div className="text-2xl font-black text-white">{currentBalance.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Stars to redeem</div>
          </div>

          <div className="bg-[#1A1A1A] rounded-[20px] p-5 border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lifetime</span>
            </div>
            <div className="text-2xl font-black text-white">{lifetimePoints.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Stars earned</div>
          </div>
        </div>

        {/* Membership Tiers */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-[var(--color-primary)]" />
            Membership Tiers
          </h3>
          <div className="space-y-3">
            {(allTiers || []).map((tier) => {
              const isCurrentTier = currentTier?.name === tier.name
              const isUnlocked = lifetimePoints >= (tier.min_points / 100)
              const tierThreshold = tier.min_points / 100

              return (
                <div
                  key={tier._id}
                  className={`relative overflow-hidden rounded-[16px] p-4 border transition-all ${
                    isCurrentTier
                      ? 'border-[var(--color-primary)] bg-gradient-to-r from-[var(--color-primary)]/20 to-transparent'
                      : isUnlocked
                      ? 'border-[#2A2A2A] bg-[#1A1A1A]'
                      : 'border-[#2A2A2A] bg-[#1A1A1A] opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTierColor(tier.name)} flex items-center justify-center`}>
                        <span className="text-2xl">{getTierIcon(tier.name)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{tier.name}</span>
                          {isCurrentTier && (
                            <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/20 px-2 py-0.5 rounded-full">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {tierThreshold.toLocaleString()}+ lifetime stars
                        </span>
                      </div>
                    </div>
                    {isUnlocked ? (
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        {(tierThreshold - lifetimePoints).toLocaleString()} more
                      </div>
                    )}
                  </div>

                  {/* Benefits preview */}
                  {tier.benefits && tier.benefits.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                      <div className="flex flex-wrap gap-2">
                        {tier.benefits.slice(0, 2).map((benefit, idx) => (
                          <span key={idx} className="text-[10px] text-gray-400 bg-[#2A2A2A] px-2 py-1 rounded-full">
                            {benefit}
                          </span>
                        ))}
                        {tier.benefits.length > 2 && (
                          <span className="text-[10px] text-gray-500">
                            +{tier.benefits.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Points History */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--color-primary)]" />
            Recent Activity
          </h3>
          <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden">
            {!pointsHistory || pointsHistory.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4">
                  <Star className="w-7 h-7 text-gray-500" />
                </div>
                <p className="text-sm font-semibold text-gray-400">No activity yet</p>
                <p className="text-xs text-gray-500 mt-1">Start earning stars with your next booking!</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A2A]">
                {pointsHistory.map((entry) => {
                  const points = entry.amount / 100
                  const isPositive = entry.type === 'earn'

                  // Generate display text based on source_type
                  const getDescription = () => {
                    if (entry.notes) return entry.notes
                    switch (entry.source_type) {
                      case 'payment': return 'Service Payment'
                      case 'wallet_payment': return 'Wallet Payment Bonus'
                      case 'top_up_bonus': return 'Top-up Bonus'
                      case 'redemption': return 'Reward Redeemed'
                      case 'manual_adjustment': return 'Points Adjustment'
                      case 'expiry': return 'Points Expired'
                      default: return entry.type
                    }
                  }

                  return (
                    <div key={entry._id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {isPositive ? (
                            <Star className="w-5 h-5 text-green-400" />
                          ) : (
                            <Gift className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{getDescription()}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.created_at).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{points.toLocaleString()} ★
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* How to Earn */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-white" />
              <h3 className="text-lg font-bold text-white">How to Earn Stars</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-sm">✂️</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Book Services</p>
                  <p className="text-xs text-white/70">Earn 1 star per ₱1 spent</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-sm">💳</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Pay with Wallet</p>
                  <p className="text-xs text-white/70">Get bonus stars on wallet payments</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-sm">🎉</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Flash Promos</p>
                  <p className="text-xs text-white/70">Double stars during promotions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoyaltyPoints
