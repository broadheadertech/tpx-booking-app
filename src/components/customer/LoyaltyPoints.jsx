import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, Gift, Crown, Zap, TrendingUp, Clock, CalendarHeart, ArrowUpRight, RefreshCw, CreditCard } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEnsureClerkUser } from '../../hooks/useEnsureClerkUser'
import StarRewardsCard from '../common/StarRewardsCard'
import CardPurchaseFlow from './CardPurchaseFlow'

const LoyaltyPoints = ({ onBack }) => {
  const navigate = useNavigate()
  const [showCardPurchase, setShowCardPurchase] = useState(false)
  const [cardFlowMode, setCardFlowMode] = useState('purchase') // purchase | upgrade | renew
  const [cardFlowTarget, setCardFlowTarget] = useState(null) // Gold | Platinum (for upgrade)

  // Use the hook that ensures Clerk users have Convex records
  const { user } = useEnsureClerkUser()

  // Fetch real data from Convex
  const ledger = useQuery(
    api.services.points.getPointsLedger,
    user?._id ? { userId: user._id } : 'skip'
  )

  const pointsHistory = useQuery(
    api.services.points.getPointsHistory,
    user?._id ? { userId: user._id, limit: 10 } : 'skip'
  )

  // Membership card data
  const activeCard = useQuery(
    api.services.membershipCards.getActiveCard,
    user?._id ? { userId: user._id } : 'skip'
  )

  const cardOptions = useQuery(api.services.membershipCards.getCardPurchaseOptions)

  // Calculate display values
  const currentBalance = ledger?.current_balance ? ledger.current_balance / 100 : 0
  const lifetimePoints = ledger?.lifetime_earned ? ledger.lifetime_earned / 100 : 0

  // Tier icon mapping
  const getTierIcon = (tierName) => {
    const icons = {
      'Silver': '🥈',
      'Gold': '🥇',
      'Platinum': '💎'
    }
    return icons[tierName] || '⭐'
  }

  // Tier gradient mapping
  const getTierGradient = (tierName) => {
    const gradients = {
      'Silver': 'from-[#8E8E8E] to-[#C0C0C0]',
      'Gold': 'from-[#B8860B] to-[#FFD700]',
      'Platinum': 'from-[#6B6B6B] to-[#E5E4E2]'
    }
    return gradients[tierName] || 'from-gray-400 to-gray-500'
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/customer/dashboard')
    }
  }

  const openCardFlow = (mode, target = null) => {
    setCardFlowMode(mode)
    setCardFlowTarget(target)
    setShowCardPurchase(true)
  }

  // Loading state
  if (ledger === undefined) {
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
        <StarRewardsCard userId={user?._id} onGetCard={() => openCardFlow('purchase')} />

        {/* Card Purchase / Renew / Upgrade Flow Modal */}
        {user?._id && (
          <CardPurchaseFlow
            userId={user._id}
            isOpen={showCardPurchase}
            onClose={() => setShowCardPurchase(false)}
            mode={cardFlowMode}
            targetTier={cardFlowTarget}
          />
        )}

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

        {/* Card Management / Membership Section */}
        {activeCard ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--color-primary)]" />
              Your Membership Card
            </h3>

            {/* Card Status */}
            <div className={`rounded-[20px] p-5 border ${
              activeCard.status === 'grace_period'
                ? 'border-yellow-500/30 bg-yellow-500/5'
                : 'border-[#2A2A2A] bg-[#1A1A1A]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTierGradient(activeCard.tier_name)} flex items-center justify-center`}>
                    <span className="text-2xl">{getTierIcon(activeCard.tier_name)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{activeCard.tier_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeCard.status === 'active'
                          ? 'text-green-400 bg-green-500/20'
                          : 'text-yellow-400 bg-yellow-500/20'
                      }`}>
                        {activeCard.status === 'active' ? 'ACTIVE' : 'GRACE PERIOD'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {activeCard.points_multiplier}x points multiplier
                    </span>
                  </div>
                </div>
              </div>

              {/* XP Progress */}
              {!activeCard.isMaxTier && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-gray-400">XP to {activeCard.nextTierName}</span>
                    <span className="text-[11px] text-white/70 font-semibold">
                      {(activeCard.card_xp / 100).toLocaleString()} / {(activeCard.nextTierThreshold / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#2A2A2A] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${activeCard.xpProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {activeCard.xpProgress}% — Earn XP from bookings and spending
                  </p>
                </div>
              )}
              {activeCard.isMaxTier && (
                <div className="mb-4 flex items-center gap-2 bg-[var(--color-primary)]/10 rounded-xl p-3">
                  <Crown className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-xs text-[var(--color-primary)] font-semibold">Maximum tier reached!</span>
                </div>
              )}

              {/* Expiry Info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0A0A]">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-white/70">
                    {activeCard.status === 'grace_period' ? 'Grace period ends' : 'Expires'} on{' '}
                    <span className="font-semibold text-white">
                      {new Date(activeCard.status === 'grace_period' ? activeCard.grace_period_ends_at : activeCard.expires_at).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  </p>
                  {activeCard.status === 'active' && activeCard.daysToExpiry <= 30 && (
                    <p className="text-[10px] text-yellow-400 mt-0.5">{activeCard.daysToExpiry} days remaining</p>
                  )}
                </div>
              </div>

              {/* Grace period renewal CTA */}
              {activeCard.status === 'grace_period' && (
                <button
                  onClick={() => openCardFlow('renew')}
                  className="w-full mt-3 py-2.5 rounded-xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Renew Now — Keep Your {activeCard.tier_name} Tier
                </button>
              )}
            </div>

            {/* Birthday Freebie Status */}
            {activeCard.birthday_freebie_year === new Date().getFullYear() ? (
              <div className="rounded-[16px] p-4 border border-[#2A2A2A] bg-[#1A1A1A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <CalendarHeart className="w-5 h-5 text-pink-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Birthday Freebie</p>
                    <p className="text-xs text-green-400">Claimed this year! Check your vouchers.</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[16px] p-4 border border-[#2A2A2A] bg-[#1A1A1A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                    <CalendarHeart className="w-5 h-5 text-pink-400/50" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Birthday Freebie</p>
                    <p className="text-xs text-gray-500">Free haircut voucher on your birthday month</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upgrade Shortcuts */}
            {activeCard.tier_name !== 'Platinum' && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fast-Track Upgrade</h4>
                <div className="space-y-2">
                  {activeCard.tier_name === 'Silver' && (
                    <button
                      onClick={() => openCardFlow('upgrade', 'Gold')}
                      className="w-full rounded-[16px] p-4 border border-[#2A2A2A] bg-[#1A1A1A] hover:border-yellow-500/30 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B8860B] to-[#FFD700] flex items-center justify-center">
                          <span className="text-lg">🥇</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-white">Upgrade to Gold</p>
                          <p className="text-xs text-gray-500">Top up ₱{(cardOptions?.goldTopupThreshold || 2000).toLocaleString()} to wallet</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-yellow-400">2x</span>
                        <ArrowUpRight className="w-4 h-4 text-gray-500" />
                      </div>
                    </button>
                  )}
                  {(activeCard.tier_name === 'Silver' || activeCard.tier_name === 'Gold') && (
                    <button
                      onClick={() => openCardFlow('upgrade', 'Platinum')}
                      className="w-full rounded-[16px] p-4 border border-[#2A2A2A] bg-[#1A1A1A] hover:border-purple-500/30 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B6B6B] to-[#E5E4E2] flex items-center justify-center">
                          <span className="text-lg">💎</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-white">Upgrade to Platinum</p>
                          <p className="text-xs text-gray-500">Top up ₱{(cardOptions?.platinumTopupThreshold || 5000).toLocaleString()} to wallet</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-purple-400">3x</span>
                        <ArrowUpRight className="w-4 h-4 text-gray-500" />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No card — show tier roadmap */
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-[var(--color-primary)]" />
              Membership Tiers
            </h3>
            <div className="space-y-3">
              {['Silver', 'Gold', 'Platinum'].map((name) => {
                const tierConfig = {
                  Silver: { icon: '🥈', multiplier: '1.5x', desc: `Purchase for ₱${cardOptions?.silverPrice || 299}`, gradient: 'from-[#8E8E8E] to-[#C0C0C0]' },
                  Gold: { icon: '🥇', multiplier: '2x', desc: `Earn XP or top up ₱${(cardOptions?.goldTopupThreshold || 2000).toLocaleString()}`, gradient: 'from-[#B8860B] to-[#FFD700]' },
                  Platinum: { icon: '💎', multiplier: '3x', desc: `Earn XP or top up ₱${(cardOptions?.platinumTopupThreshold || 5000).toLocaleString()}`, gradient: 'from-[#6B6B6B] to-[#E5E4E2]' },
                }
                const t = tierConfig[name]
                return (
                  <div key={name} className="rounded-[16px] p-4 border border-[#2A2A2A] bg-[#1A1A1A]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                          <span className="text-lg">{t.icon}</span>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white">{name}</span>
                          <p className="text-xs text-gray-500">{t.desc}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-[var(--color-primary)]">{t.multiplier}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
