import { useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Star, Sparkles, Gift, Crown, TrendingUp, Award, ChevronRight, Ticket, Clock, QrCode } from 'lucide-react'
import StarRewardsCard from '../../common/StarRewardsCard'

/**
 * RewardsTab - Loyalty rewards and tier progress
 *
 * Contains:
 * - Tier progress card
 * - Points balance
 * - Available rewards
 * - Tier benefits
 */

// Tier configuration
const TIERS = [
  { name: 'Bronze', minPoints: 0, color: '#CD7F32', benefits: ['1 point per ₱100 spent', 'Birthday reward'] },
  { name: 'Silver', minPoints: 500, color: '#C0C0C0', benefits: ['1.25x points multiplier', 'Priority booking', 'Free grooming product'] },
  { name: 'Gold', minPoints: 1500, color: '#FFD700', benefits: ['1.5x points multiplier', 'VIP queue skip', 'Monthly free service'] },
  { name: 'Platinum', minPoints: 5000, color: '#E5E4E2', benefits: ['2x points multiplier', 'Personal stylist', 'Exclusive events'] }
]

function RewardsTab({ user }) {
  const navigate = useNavigate()

  // Get tier progress data
  const tierProgress = useQuery(
    api.services.tiers.getTierProgress,
    user?._id ? { userId: user._id } : 'skip'
  )

  // Get VIP stats for current points
  const vipStats = useQuery(
    api.services.tiers.getCustomerVipStats,
    user?._id ? { userId: user._id } : 'skip'
  )

  // Get user's vouchers
  const vouchers = useQuery(
    api.services.vouchers.getVouchersByUser,
    user?._id ? { userId: user._id } : 'skip'
  )

  // Extract data from queries
  const currentTierName = tierProgress?.currentTier?.name || 'Bronze'
  const currentTierColor = tierProgress?.currentTier?.color || '#CD7F32'
  const lifetimePoints = tierProgress?.lifetimePoints ? Math.floor(tierProgress.lifetimePoints / 100) : 0
  const pointsToNext = tierProgress?.pointsToNextTier ? Math.floor(tierProgress.pointsToNextTier / 100) : 0
  const progressPercent = tierProgress?.progressPercent || 0
  const currentPoints = vipStats?.displayCurrentPoints || 0

  // Filter available vouchers
  const availableVouchers = vouchers?.filter(v => v.status === 'assigned' && !v.isExpired) || []

  // Find current tier in local config for benefits display
  const currentTierData = TIERS.find(t => t.name === currentTierName) || TIERS[0]
  const currentTierIndex = TIERS.findIndex(t => t.name === currentTierName)
  const nextTierLocal = TIERS[currentTierIndex + 1]

  // Format voucher expiry
  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return 'No expiry'
    const expireDate = new Date(expiresAt)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24))
    if (daysUntilExpiry <= 0) return 'Expired'
    if (daysUntilExpiry === 1) return 'Expires tomorrow'
    if (daysUntilExpiry <= 7) return `${daysUntilExpiry} days left`
    return expireDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Star Rewards Card - Existing Component */}
      {user?._id && (
        <StarRewardsCard userId={user._id} />
      )}

      {/* Tier Progress Card */}
      <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden">
        {/* Tier Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: `2px solid ${currentTierColor}40` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${currentTierColor}20` }}
            >
              <Crown className="w-6 h-6" style={{ color: currentTierColor }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{currentTierName} Member</p>
              <p className="text-xs text-gray-400">{lifetimePoints.toLocaleString()} lifetime points</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">{currentPoints}</p>
            <p className="text-xs text-gray-400">Available Points</p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {nextTierLocal && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Progress to {nextTierLocal.name}</span>
              <span className="text-xs font-semibold text-[var(--color-primary)]">
                {pointsToNext.toLocaleString()} points to go
              </span>
            </div>
            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: nextTierLocal.color
                }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Earn {nextTierLocal.minPoints.toLocaleString()} lifetime points to unlock {nextTierLocal.name}
            </p>
          </div>
        )}
      </div>

      {/* Current Tier Benefits */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-[var(--color-primary)]" />
          Your {currentTierName} Benefits
        </h3>
        <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden">
          <div className="divide-y divide-[#2A2A2A]">
            {currentTierData.benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm text-white">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Next Tier Preview */}
      {nextTierLocal && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: nextTierLocal.color }} />
            Unlock with {nextTierLocal.name}
          </h3>
          <div
            className="bg-[#1A1A1A] rounded-[20px] border overflow-hidden"
            style={{ borderColor: `${nextTierLocal.color}30` }}
          >
            <div className="divide-y divide-[#2A2A2A]">
              {nextTierLocal.benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 p-4 opacity-60">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${nextTierLocal.color}20` }}
                  >
                    <Star className="w-4 h-4" style={{ color: nextTierLocal.color }} />
                  </div>
                  <span className="text-sm text-gray-400">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Your Vouchers Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Ticket className="w-4 h-4 text-green-400" />
            Your Vouchers
          </h3>
          {availableVouchers.length > 0 && (
            <button
              onClick={() => navigate('/customer/vouchers')}
              className="text-xs font-semibold text-[var(--color-primary)]"
            >
              View All
            </button>
          )}
        </div>

        {availableVouchers.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-3">
              <Ticket className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-400">No vouchers yet</p>
            <p className="text-xs text-gray-500 mt-1">Claim vouchers to get discounts!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableVouchers.slice(0, 3).map((voucher) => (
              <div
                key={voucher._id}
                onClick={() => navigate('/customer/vouchers')}
                className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] hover:border-green-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Voucher Icon */}
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-6 h-6 text-green-400" />
                  </div>

                  {/* Voucher Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{voucher.code}</p>
                    <p className="text-xs text-gray-400 truncate">{voucher.description || 'Discount voucher'}</p>
                  </div>

                  {/* Value & Expiry */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-400">₱{parseFloat(voucher.value).toFixed(0)}</p>
                    <p className="text-[10px] text-gray-500 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {formatExpiry(voucher.expires_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {availableVouchers.length > 3 && (
              <button
                onClick={() => navigate('/customer/vouchers')}
                className="w-full py-3 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] text-sm font-semibold text-gray-400 hover:text-white hover:border-[var(--color-primary)]/30 transition-all"
              >
                +{availableVouchers.length - 3} more vouchers
              </button>
            )}
          </div>
        )}
      </div>

      {/* How to Earn Points */}
      <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white mb-1">Earn Points Fast</p>
            <p className="text-xs text-gray-400">
              Book services, top up your wallet, and refer friends to earn points faster and unlock exclusive rewards!
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </div>
      </div>
    </div>
  )
}

export default RewardsTab
