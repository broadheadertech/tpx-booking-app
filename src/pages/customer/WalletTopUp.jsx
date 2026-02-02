import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wallet as WalletIcon, CreditCard, AlertCircle, Loader2, Gift, Sparkles, ChevronRight } from 'lucide-react'
import { useToast } from '../../components/common/ToastNotification'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useBranding } from '../../context/BrandingContext'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { WalletPromoPreview } from '../../components/common/PromoPreviewCard'

function WalletTopUp() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useCurrentUser()
  const { branding } = useBranding()

  // Branding colors with fallbacks
  const primaryColor = branding?.primary_color || '#F68B24'
  const accentColor = branding?.accent_color || '#E67E22'
  const bgColor = branding?.bg_color || '#0A0A0A'
  const mutedColor = branding?.muted_color || '#6B7280'
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  // Story 23.1: Check if SA wallet top-up is enabled
  const walletTopupStatus = useQuery(api.services.wallet.isWalletTopupEnabled)

  // Story 23.1: Use SA wallet top-up action
  const createSAWalletTopup = useAction(api.services.wallet.createWalletTopupWithSACredentials)

  // Get branch for promo lookup
  const branches = useQuery(api.services.branches.getAllBranches)
  const currentBranch = branches?.find(b => b.is_active) || branches?.[0]

  // Story 23.3: Fetch configurable bonus tiers
  const bonusTiersData = useQuery(api.services.walletConfig.getBonusTiers)
  // AC #5: Only show bonus tiers if explicitly configured by Super Admin
  const bonusTiers = bonusTiersData?.isConfigured ? bonusTiersData.tiers : []
  const bonusTiersLoading = bonusTiersData === undefined

  // Calculate current bonus based on entered amount
  const currentBonus = useMemo(() => {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0 || bonusTiers.length === 0) return null

    // Find applicable tier (highest minAmount that's <= entered amount)
    const sortedTiers = [...bonusTiers].sort((a, b) => b.minAmount - a.minAmount)
    for (const tier of sortedTiers) {
      if (value >= tier.minAmount) {
        return {
          bonus: tier.bonus,
          total: value + tier.bonus,
          tier
        }
      }
    }
    return null
  }, [amount, bonusTiers])

  // Find next tier to encourage higher top-ups
  const nextTier = useMemo(() => {
    const value = parseFloat(amount)
    if (isNaN(value) || bonusTiers.length === 0) return null

    const sortedTiers = [...bonusTiers].sort((a, b) => a.minAmount - b.minAmount)
    return sortedTiers.find(tier => tier.minAmount > value)
  }, [amount, bonusTiers])

  const presets = [100, 200, 500, 1000]

  // PayMongo minimum amount
  const MIN_TOPUP_AMOUNT = 100

  const handleContinue = async () => {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      toast.error('Invalid amount', 'Please enter a valid amount')
      return
    }
    if (value < MIN_TOPUP_AMOUNT) {
      toast.error('Minimum amount required', `Minimum top-up amount is ₱${MIN_TOPUP_AMOUNT}`)
      return
    }

    // Check if user is authenticated
    if (!user?._id) {
      toast.error('Authentication required', 'Please log in to top up your wallet')
      navigate('/auth/login')
      return
    }

    // Story 23.1: Check if SA wallet top-up is enabled
    if (!walletTopupStatus?.enabled) {
      toast.error('Wallet top-up unavailable', walletTopupStatus?.reason || 'Please try again later')
      return
    }

    setLoading(true)
    try {
      // Get current origin (domain) for redirect URLs
      const origin = window.location.origin

      // Story 23.1: Use SA wallet top-up for all payment methods
      // PayMongo checkout session supports GCash, Maya, Card, and GrabPay
      const res = await createSAWalletTopup({
        userId: user._id,
        amount: value,
        origin,
      })

      if (res?.checkoutUrl) {
        // Redirect to PayMongo checkout page
        window.location.href = res.checkoutUrl
      } else {
        toast.error('Unable to start payment', 'No checkout URL returned')
      }
    } catch (err) {
      console.error('[WalletTopUp] Payment error:', err)
      // Extract error message from ConvexError
      const errorMessage = err?.data?.message || err?.message || 'Please try again'
      toast.error('Payment failed', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking wallet config
  if (walletTopupStatus === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          <span className="text-sm text-gray-400">Loading wallet...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <div className="sticky top-0 z-40 backdrop-blur-2xl border-b border-[#1A1A1A]" style={{ backgroundColor: `${bgColor}f8` }}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-5">
            <button 
              onClick={() => navigate('/customer/wallet')} 
              className="flex items-center space-x-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 rounded-2xl border border-[#2A2A2A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${accentColor})` }}
              >
                <WalletIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-black text-white">Add Funds</h1>
            </div>
            <div className="w-[72px]" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Story 23.1: Show error if wallet top-up is unavailable */}
        {walletTopupStatus !== undefined && !walletTopupStatus?.enabled && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">
                <p className="font-medium mb-1">Wallet top-up is currently unavailable</p>
                <p className="text-red-400/80">
                  {walletTopupStatus?.reason || 'Please try again later or contact support.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[28px] border border-[#1A1A1A] p-6" style={{ backgroundColor: bgColor }}>
          <div className="mb-3">
            <img src="/wallet/PayMongo_Logo.svg.png" alt="PayMongo" className="h-8 object-contain opacity-90" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: mutedColor }}>Amount</div>
          <div className="space-y-3">
            <input
              type="number"
              min={MIN_TOPUP_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ₱${MIN_TOPUP_AMOUNT}`}
              className="w-full px-4 py-3 bg-[#121212] border border-[#2A2A2A] text-white rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaryColor }}
              onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}`}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
            <div className="grid grid-cols-4 gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  className="px-3 py-2 rounded-xl bg-[#121212] border text-white text-sm active:scale-95 transition-all"
                  style={{ borderColor: amount === String(p) ? primaryColor : '#2A2A2A' }}
                  onMouseEnter={(e) => e.target.style.borderColor = `${primaryColor}66`}
                  onMouseLeave={(e) => e.target.style.borderColor = amount === String(p) ? primaryColor : '#2A2A2A'}
                >
                  ₱{p}
                </button>
              ))}
            </div>

            {/* Story 23.3: Configurable Bonus Tier Display */}
            {parseFloat(amount) > 0 && currentBonus && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${accentColor})` }}>
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-green-400 font-medium">Top-up Bonus Applied!</p>
                    <p className="text-lg text-white font-bold">
                      ₱{parseFloat(amount).toLocaleString()} → <span className="text-green-400">₱{currentBonus.total.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-green-400/80">+₱{currentBonus.bonus.toLocaleString()} bonus included</p>
                  </div>
                </div>
              </div>
            )}

            {/* Show next tier prompt to encourage higher top-ups */}
            {parseFloat(amount) > 0 && nextTier && (
              <button
                onClick={() => setAmount(String(nextTier.minAmount))}
                className="w-full flex items-center justify-between p-3 bg-[#121212] border border-[#2A2A2A] hover:border-[#FF8C42]/50 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF8C42]" />
                  <span className="text-sm text-gray-300">
                    Top up <span className="font-medium text-white">₱{nextTier.minAmount.toLocaleString()}</span> to get
                    <span className="font-medium text-green-400 ml-1">+₱{nextTier.bonus.toLocaleString()} bonus!</span>
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#FF8C42] transition-colors" />
              </button>
            )}

            {/* Loading skeleton for bonus tiers */}
            {bonusTiersLoading && (
              <div className="p-4 bg-[#121212] border border-[#2A2A2A] rounded-xl animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 bg-[#2A2A2A] rounded" />
                  <div className="h-4 w-32 bg-[#2A2A2A] rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-10 bg-[#2A2A2A] rounded-lg" />
                  <div className="h-10 bg-[#2A2A2A] rounded-lg" />
                </div>
              </div>
            )}

            {/* Show available tiers when no amount entered */}
            {!bonusTiersLoading && (!amount || parseFloat(amount) === 0) && bonusTiers.length > 0 && (
              <div className="p-4 bg-[#121212] border border-[#2A2A2A] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4" style={{ color: primaryColor }} />
                  <span className="text-sm font-medium text-white">Available Bonus Tiers</span>
                </div>
                <div className="space-y-2">
                  {[...bonusTiers].sort((a, b) => a.minAmount - b.minAmount).map((tier, index) => (
                    <button
                      key={index}
                      onClick={() => setAmount(String(tier.minAmount))}
                      className="w-full flex items-center justify-between p-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] rounded-lg transition-colors text-left"
                    >
                      <span className="text-sm text-gray-300">
                        Top up <span className="font-medium text-white">₱{tier.minAmount.toLocaleString()}</span>
                      </span>
                      <span className="text-sm font-medium text-green-400">+₱{tier.bonus.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Wallet Top-up Promo Preview (flash promotions) */}
            {user?._id && currentBranch?._id && parseFloat(amount) > 0 && (
              <WalletPromoPreview
                userId={user._id}
                branchId={currentBranch._id}
                topUpAmount={parseFloat(amount)}
              />
            )}
          </div>
        </div>

        {/* Story 23.1: Payment method info - PayMongo checkout handles all methods */}
        <div className="rounded-[28px] border border-[#1A1A1A] p-6" style={{ backgroundColor: bgColor }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: mutedColor }}>Payment Options</div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#121212] border border-[#2A2A2A] rounded-xl">
              <img src="/wallet/gcash-icon.png" alt="GCash" className="h-5 w-5 object-contain" onError={(e) => e.target.style.display = 'none'} />
              <span className="text-sm text-gray-300">GCash</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#121212] border border-[#2A2A2A] rounded-xl">
              <img src="/wallet/maya-icon.png" alt="Maya" className="h-5 w-5 object-contain" onError={(e) => e.target.style.display = 'none'} />
              <span className="text-sm text-gray-300">Maya</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#121212] border border-[#2A2A2A] rounded-xl">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-300">Card</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#121212] border border-[#2A2A2A] rounded-xl">
              <span className="text-sm text-gray-300">GrabPay</span>
            </div>
          </div>
          <p className="text-xs" style={{ color: mutedColor }}>
            You'll choose your payment method on the next screen. All payments are processed securely via PayMongo.
          </p>
        </div>

        <button
          onClick={handleContinue}
          disabled={loading || !walletTopupStatus?.enabled}
          className="w-full py-3 px-4 rounded-xl font-bold text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: walletTopupStatus?.enabled ? primaryColor : '#4B5563',
            boxShadow: walletTopupStatus?.enabled ? `0 10px 25px -5px ${primaryColor}33` : 'none'
          }}
          onMouseEnter={(e) => !loading && walletTopupStatus?.enabled && (e.target.style.backgroundColor = accentColor)}
          onMouseLeave={(e) => !loading && walletTopupStatus?.enabled && (e.target.style.backgroundColor = primaryColor)}
        >
          {loading ? 'Processing...' : walletTopupStatus?.enabled ? 'Continue' : 'Top-up Unavailable'}
        </button>
      </div>
    </div>
  )
}

export default WalletTopUp