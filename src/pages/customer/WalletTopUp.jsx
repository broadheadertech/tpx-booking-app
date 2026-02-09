/**
 * Wallet Top-Up Page - Modern Fintech Design
 *
 * Inspired by GCash, Maya, and Cash App.
 * Features custom numpad, large amount display, and streamlined flow.
 */
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, Sparkles, CreditCard, AlertCircle, Loader2, Delete } from 'lucide-react'
import { useToast } from '../../components/common/ToastNotification'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useBranding } from '../../context/BrandingContext'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { WalletPromoPreview } from '../../components/common/PromoPreviewCard'

// Custom Numpad Component
function Numpad({ onInput, onDelete, onClear, disabled = false }) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'delete'],
  ]

  const handleKeyPress = (key) => {
    if (disabled) return
    if (navigator.vibrate) navigator.vibrate(10)
    if (key === 'delete') {
      onDelete?.()
    } else {
      onInput?.(key)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {keys.flat().map((key, index) => (
        <button
          key={index}
          onClick={() => handleKeyPress(key)}
          onContextMenu={(e) => {
            e.preventDefault()
            if (key === 'delete' && onClear) {
              if (navigator.vibrate) navigator.vibrate(50)
              onClear()
            }
          }}
          disabled={disabled}
          className={`
            h-14 rounded-2xl font-bold text-xl
            transition-all duration-100 ease-out
            active:scale-95 active:brightness-125
            disabled:opacity-40 disabled:cursor-not-allowed
            ${key === 'delete'
              ? 'bg-[#252525] text-gray-400'
              : 'bg-[#1A1A1A] text-white'
            }
            border border-[#2A2A2A] hover:border-[#3A3A3A]
          `}
        >
          {key === 'delete' ? (
            <Delete className="w-5 h-5 mx-auto" />
          ) : (
            <span>{key}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function WalletTopUp() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useCurrentUser()
  const { branding } = useBranding()

  // Branding colors with fallbacks
  const primaryColor = branding?.primary_color || '#00704A'
  const accentColor = branding?.accent_color || '#1E3932'

  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(null)

  // Story 23.1: Check if SA wallet top-up is enabled
  const walletTopupStatus = useQuery(api.services.wallet.isWalletTopupEnabled)

  // Get current wallet balance
  const wallet = useQuery(api.services.wallet.getWallet, user?._id ? { userId: user._id } : 'skip')

  // Story 23.1: Use SA wallet top-up action
  const createSAWalletTopup = useAction(api.services.wallet.createWalletTopupWithSACredentials)

  // Get branch for promo lookup
  const branches = useQuery(api.services.branches.getAllBranches)
  const currentBranch = branches?.find(b => b.is_active) || branches?.[0]

  // Story 23.3: Fetch configurable bonus tiers (shows default or custom tiers)
  const bonusTiersData = useQuery(api.services.walletConfig.getBonusTiers)
  const bonusTiers = bonusTiersData?.tiers || []
  const monthlyBonusCap = bonusTiersData?.monthlyBonusCap ?? 0

  // Story 23.4: Get user's remaining bonus eligibility for the month
  const bonusEligibility = useQuery(
    api.services.walletConfig.getUserBonusEligibility,
    user?._id ? { userId: user._id } : 'skip'
  )

  // Preset amounts
  const presets = [100, 200, 500, 1000]

  // PayMongo minimum amount
  const MIN_TOPUP_AMOUNT = 100
  const MAX_AMOUNT = 50000

  // Parse current amount
  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount)
    return isNaN(parsed) ? 0 : parsed
  }, [amount])

  // Story 23.4: Calculate current bonus considering monthly cap
  const currentBonus = useMemo(() => {
    if (numericAmount <= 0 || bonusTiers.length === 0) return null

    // Calculate eligible amount based on monthly cap
    const remainingEligible = bonusEligibility?.remainingEligible ?? Infinity
    const isUnlimited = bonusEligibility?.isUnlimited !== false

    // If no remaining eligibility, no bonus
    if (!isUnlimited && remainingEligible <= 0) {
      return {
        bonus: 0,
        total: numericAmount,
        tier: null,
        wasLimited: true,
        eligibleAmount: 0
      }
    }

    // Calculate eligible portion of this top-up
    const eligibleAmount = isUnlimited
      ? numericAmount
      : Math.min(numericAmount, remainingEligible)

    // Find matching tier for the ELIGIBLE amount
    const sortedTiers = [...bonusTiers].sort((a, b) => b.minAmount - a.minAmount)
    for (const tier of sortedTiers) {
      if (eligibleAmount >= tier.minAmount) {
        return {
          bonus: tier.bonus,
          total: numericAmount + tier.bonus,
          tier,
          wasLimited: eligibleAmount < numericAmount,
          eligibleAmount
        }
      }
    }

    return {
      bonus: 0,
      total: numericAmount,
      tier: null,
      wasLimited: eligibleAmount < numericAmount,
      eligibleAmount
    }
  }, [numericAmount, bonusTiers, bonusEligibility])

  // Find next tier to encourage higher top-ups
  const nextTier = useMemo(() => {
    if (bonusTiers.length === 0) return null

    const sortedTiers = [...bonusTiers].sort((a, b) => a.minAmount - b.minAmount)
    return sortedTiers.find(tier => tier.minAmount > numericAmount)
  }, [numericAmount, bonusTiers])

  // Handle numpad input
  const handleNumpadInput = useCallback((key) => {
    setSelectedPreset(null)
    setAmount(prev => {
      if (key === '.' && prev.includes('.')) return prev
      if (prev.includes('.')) {
        const [, decimal] = prev.split('.')
        if (decimal && decimal.length >= 2) return prev
      }
      if (prev.length >= 8) return prev
      const newAmount = prev + key
      const parsed = parseFloat(newAmount)
      if (!isNaN(parsed) && parsed > MAX_AMOUNT) return prev
      return newAmount
    })
  }, [])

  const handleNumpadDelete = useCallback(() => {
    setSelectedPreset(null)
    setAmount(prev => prev.slice(0, -1))
  }, [])

  const handleNumpadClear = useCallback(() => {
    setSelectedPreset(null)
    setAmount('')
  }, [])

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset)
    setAmount(String(preset))
  }

  const handleContinue = async () => {
    if (numericAmount <= 0) {
      toast.error('Invalid amount', 'Please enter a valid amount')
      return
    }
    if (numericAmount < MIN_TOPUP_AMOUNT) {
      toast.error('Minimum amount required', `Minimum top-up is ₱${MIN_TOPUP_AMOUNT}`)
      return
    }

    if (!user?._id) {
      toast.error('Authentication required', 'Please log in to top up your wallet')
      navigate('/auth/login')
      return
    }

    if (!walletTopupStatus?.enabled) {
      toast.error('Wallet top-up unavailable', walletTopupStatus?.reason || 'Please try again later')
      return
    }

    setLoading(true)
    try {
      const origin = window.location.origin

      const res = await createSAWalletTopup({
        userId: user._id,
        amount: numericAmount,
        origin,
      })

      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl
      } else {
        toast.error('Unable to start payment', 'No checkout URL returned')
      }
    } catch (err) {
      console.error('[WalletTopUp] Payment error:', err)
      const errorMessage = err?.data?.message || err?.message || 'Please try again'
      toast.error('Payment failed', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Format amount for display
  const displayAmount = useMemo(() => {
    if (!amount) return '0'
    return amount
  }, [amount])

  // Current wallet balance - getWallet returns CENTAVOS, convert to PESOS
  const currentBalance = ((wallet?.balance || 0) + (wallet?.bonus_balance || 0)) / 100

  // Loading state
  if (walletTopupStatus === undefined) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    )
  }

  const isValidAmount = numericAmount >= MIN_TOPUP_AMOUNT
  const canContinue = isValidAmount && walletTopupStatus?.enabled && !loading

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate('/customer/wallet')}
              className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center hover:bg-[#252525] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white">Add Money</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col">
        {/* Error Banner */}
        {walletTopupStatus !== undefined && !walletTopupStatus?.enabled && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                <p className="font-medium">Top-up unavailable</p>
                <p className="text-red-400/80 text-xs mt-1">
                  {walletTopupStatus?.reason || 'Please try again later.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Balance - Small Display */}
        <div className="text-center mb-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Current Balance</p>
          <p className="text-sm font-semibold text-gray-400">
            ₱{currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Hero Amount Display */}
        <div className="flex-shrink-0 py-6">
          <div className="text-center">
            <div className="inline-flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-gray-500">₱</span>
              <span
                className={`text-5xl font-black transition-colors ${
                  numericAmount > 0 ? 'text-white' : 'text-gray-600'
                }`}
              >
                {displayAmount}
              </span>
              <span className="w-0.5 h-10 bg-white/80 animate-pulse ml-1" />
            </div>

            {numericAmount > 0 && numericAmount < MIN_TOPUP_AMOUNT && (
              <p className="text-xs text-orange-400 mt-2">
                Minimum is ₱{MIN_TOPUP_AMOUNT}
              </p>
            )}
          </div>

          {/* Bonus Preview */}
          {currentBonus && currentBonus.bonus > 0 && (
            <div
              className="mt-3 mx-auto max-w-xs p-3 rounded-2xl border"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}15, ${accentColor}15)`,
                borderColor: `${primaryColor}40`
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Gift className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="text-sm font-medium text-white">
                  +₱{currentBonus.bonus.toLocaleString()} bonus
                </span>
                <span className="text-xs text-gray-400">
                  = ₱{currentBonus.total.toLocaleString()} total
                </span>
              </div>
              {/* Story 23.4: Warning when bonus is limited by monthly cap */}
              {currentBonus.wasLimited && (
                <p className="text-xs text-yellow-400/80 text-center mt-2">
                  Bonus based on ₱{currentBonus.eligibleAmount?.toLocaleString()} (monthly limit)
                </p>
              )}
            </div>
          )}

          {/* Story 23.4: No bonus message when cap is exhausted */}
          {currentBonus && currentBonus.bonus === 0 && currentBonus.wasLimited && numericAmount >= MIN_TOPUP_AMOUNT && (
            <div className="mt-3 mx-auto max-w-xs p-3 rounded-2xl border border-gray-500/30 bg-gray-500/10">
              <p className="text-xs text-gray-400 text-center">
                No bonus available (monthly limit reached)
              </p>
            </div>
          )}

          {/* Next tier hint */}
          {!currentBonus && nextTier && numericAmount > 0 && (
            <button
              onClick={() => handlePresetSelect(nextTier.minAmount)}
              className="mt-3 mx-auto flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full text-xs hover:border-[#3A3A3A] transition-colors"
            >
              <Sparkles className="w-3 h-3 text-yellow-500" />
              <span className="text-gray-400">
                Add ₱{(nextTier.minAmount - numericAmount).toLocaleString()} more for{' '}
                <span className="text-green-400 font-medium">+₱{nextTier.bonus} bonus</span>
              </span>
            </button>
          )}

          {/* Wallet Top-up Promo Preview */}
          {user?._id && currentBranch?._id && numericAmount > 0 && (
            <div className="mt-3">
              <WalletPromoPreview
                userId={user._id}
                branchId={currentBranch._id}
                topUpAmount={numericAmount}
              />
            </div>
          )}
        </div>

        {/* Quick Amount Presets with Bonus Display */}
        <div className="flex-shrink-0 mb-3">
          {/* Story 23.4: Monthly Bonus Eligibility Notice */}
          {monthlyBonusCap > 0 && bonusEligibility && !bonusEligibility.isUnlimited && (
            <div className="mb-3 px-2">
              <div className={`
                p-2.5 rounded-xl text-center text-xs
                ${bonusEligibility.remainingEligible <= 0
                  ? 'bg-gray-500/10 border border-gray-500/20'
                  : 'bg-green-500/10 border border-green-500/20'
                }
              `}>
                {bonusEligibility.remainingEligible <= 0 ? (
                  <span className="text-gray-400">
                    You've used your monthly bonus limit (₱{monthlyBonusCap.toLocaleString()}/mo)
                  </span>
                ) : (
                  <span className="text-gray-300">
                    <span className="text-green-400 font-medium">₱{bonusEligibility.remainingEligible.toLocaleString()}</span>
                    {' '}remaining for bonus this month
                    <span className="text-gray-500 ml-1">(of ₱{monthlyBonusCap.toLocaleString()})</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bonus Tiers Info - Show when available */}
          {bonusTiers.length > 0 && (
            <div className="mb-4 px-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Top-up Bonuses</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[...bonusTiers]
                  .sort((a, b) => a.minAmount - b.minAmount)
                  .map((tier, index) => {
                    const isActive = numericAmount >= tier.minAmount
                    const isCurrentTier = currentBonus?.tier?.minAmount === tier.minAmount
                    return (
                      <button
                        key={index}
                        onClick={() => handlePresetSelect(tier.minAmount)}
                        className={`
                          px-3 py-1.5 rounded-xl text-xs font-medium
                          transition-all duration-150 active:scale-95
                          ${isCurrentTier
                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                            : isActive
                              ? 'bg-green-500/10 border-green-500/30 text-green-400/80'
                              : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'
                          }
                          border
                        `}
                      >
                        ₱{tier.minAmount.toLocaleString()} → <span className="text-green-400">+₱{tier.bonus}</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="flex gap-2 justify-center">
            {presets.map((preset) => {
              const isSelected = selectedPreset === preset
              const tierForPreset = [...bonusTiers]
                .sort((a, b) => b.minAmount - a.minAmount)
                .find(t => preset >= t.minAmount)

              return (
                <button
                  key={preset}
                  onClick={() => handlePresetSelect(preset)}
                  className={`
                    relative px-4 py-2 rounded-full font-semibold text-sm
                    transition-all duration-150 active:scale-95
                    ${isSelected
                      ? 'text-white shadow-lg'
                      : 'bg-[#1A1A1A] text-gray-300 border border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }
                  `}
                  style={isSelected ? {
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`
                  } : undefined}
                >
                  ₱{preset}
                  {tierForPreset && !isSelected && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                      <Gift className="w-2 h-2 text-white" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Numpad */}
        <div className="flex-1 flex flex-col justify-center px-2">
          <Numpad
            onInput={handleNumpadInput}
            onDelete={handleNumpadDelete}
            onClear={handleNumpadClear}
            disabled={loading}
          />
        </div>

        {/* Continue Button with Payment Methods */}
        <div className="flex-shrink-0 pt-4 pb-6">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`
              w-full py-4 rounded-2xl font-bold text-base
              transition-all duration-200 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              flex flex-col items-center gap-1
            `}
            style={{
              background: canContinue
                ? `linear-gradient(135deg, ${primaryColor}, ${accentColor})`
                : '#2A2A2A',
              boxShadow: canContinue ? `0 10px 30px -5px ${primaryColor}40` : 'none'
            }}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span className="text-white">Processing...</span>
              </div>
            ) : (
              <>
                <span className="text-white">
                  {isValidAmount ? 'Continue to Payment' : `Enter at least ₱${MIN_TOPUP_AMOUNT}`}
                </span>
                {isValidAmount && (
                  <div className="flex items-center gap-3 opacity-80">
                    <img
                      src="/wallet/gcash-icon.png"
                      alt="GCash"
                      className="h-4 w-4 object-contain"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <img
                      src="/wallet/maya-icon.png"
                      alt="Maya"
                      className="h-4 w-4 object-contain"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <CreditCard className="w-4 h-4 text-white/80" />
                    <span className="text-xs text-white/60">& more</span>
                  </div>
                )}
              </>
            )}
          </button>

          {/* Security note */}
          <p className="text-center text-xs text-gray-600 mt-3">
            Secure Online Payment
          </p>
        </div>
      </div>
    </div>
  )
}

export default WalletTopUp
