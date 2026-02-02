import React, { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Wallet as WalletIcon, ArrowLeft, Plus, CreditCard, Download, Banknote, Clock, Gift, Star, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useToast } from '../../components/common/ToastNotification'
import { useUser } from '@clerk/clerk-react'
import StarRewardsCard from '../../components/common/StarRewardsCard'

function Wallet() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const topupToastShownRef = useRef(false)
  const { user: authUser } = useAuth()
  const { user: clerkUser } = useUser()
  const { branding } = useBranding()
  const toast = useToast()

  // Get Convex user from Clerk ID (for Clerk-authenticated users)
  const clerkConvexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkUser?.id ? { clerk_user_id: clerkUser.id } : 'skip'
  )

  // Use Clerk user if available, otherwise fall back to AuthContext user
  const user = clerkConvexUser || authUser

  const wallet = useQuery(api.services.wallet.getWallet, user?._id ? { userId: user._id } : 'skip')
  const txs = useQuery(api.services.wallet.listTransactions, user?._id ? { userId: user._id, limit: 10 } : 'skip')
  const ensureWallet = useMutation(api.services.wallet.ensureWallet)
  const finalizeTopUp = useAction(api.services.paymongo.captureSourceAndCreditWallet)

  const iconForTx = (type) => {
    if (type === 'topup' || type === 'Top-up') return Banknote
    if (type === 'Payment' || type === 'payment') return CreditCard
    if (type === 'Refund' || type === 'refund') return Download
    return CreditCard
  }

  const goToTopUp = () => {
    navigate('/customer/wallet/topup')
  }

  React.useEffect(() => {
    if (user?._id) {
      ensureWallet({ userId: user._id }).catch(() => {})
    }
  }, [user, ensureWallet])

  // Story 23.2 - AC#3: Handle top-up success/cancelled query params
  React.useEffect(() => {
    const topupResult = searchParams.get('topup')

    // Prevent multiple toast firings on re-renders
    if (!topupResult || topupToastShownRef.current) return

    if (topupResult === 'success') {
      topupToastShownRef.current = true
      // Show success toast for SA wallet top-up (processed via webhook)
      toast.success('Top-up Successful!', 'Your wallet has been credited. Check your notifications for details.')

      // Also handle legacy paymongo source flow for backwards compatibility
      if (user?._id && txs) {
        const pendingSources = txs.filter(t => t.status === 'pending' && !!t.source_id)
        pendingSources.forEach(async (t) => {
          try {
            await finalizeTopUp({ sourceId: t.source_id, userId: user._id })
          } catch (e) {
            console.error('[Wallet] Legacy finalize top-up failed:', e)
          }
        })
      }

      // Clear the query param to prevent re-firing on navigation
      searchParams.delete('topup')
      setSearchParams(searchParams, { replace: true })
    } else if (topupResult === 'cancelled') {
      topupToastShownRef.current = true
      toast.error('Top-up Cancelled', 'Your payment was cancelled. No charges were made.')

      // Clear the query param
      searchParams.delete('topup')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, user, txs, finalizeTopUp, toast])

  // Format balance
  const balanceDisplay = ((wallet?.balance || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-2xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="flex items-center space-x-2 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-lg font-bold text-white">Pay</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Balance Card - Starbucks Style */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 p-6">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <WalletIcon className="w-5 h-5 text-white/80" />
                <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                  Wallet Balance
                </span>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full">
                <span className="text-xs font-bold text-white">Active</span>
              </div>
            </div>

            {/* Balance Display */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-white/80">₱</span>
                <span className="text-5xl font-black text-white">{balanceDisplay}</span>
              </div>
              <p className="text-sm text-white/60 mt-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated {wallet?.updatedAt ? new Date(wallet.updatedAt).toLocaleDateString('en-PH') : 'now'}
              </p>
            </div>

            {/* Add Money Button */}
            <button
              onClick={goToTopUp}
              className="w-full flex items-center justify-center gap-2 bg-white text-[var(--color-primary)] font-bold py-3.5 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Money
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={goToTopUp}
            className="flex flex-col items-center p-4 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] hover:border-[var(--color-primary)]/30 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center mb-2">
              <Plus className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <span className="text-xs font-semibold text-white">Top Up</span>
          </button>

          <button
            onClick={() => navigate('/customer/bookings')}
            className="flex flex-col items-center p-4 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] hover:border-blue-500/30 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-white">Pay</span>
          </button>

          <button
            onClick={() => navigate('/customer/vouchers')}
            className="flex flex-col items-center p-4 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] hover:border-purple-500/30 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-2">
              <Gift className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs font-semibold text-white">Vouchers</span>
          </button>
        </div>

        {/* Star Rewards Card */}
        {user?._id && (
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              Your Rewards
            </h3>
            <StarRewardsCard userId={user._id} />
          </div>
        )}

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-primary)]" />
              Recent Activity
            </h3>
            {txs && txs.length > 0 && (
              <button className="text-xs font-semibold text-[var(--color-primary)]">
                View All
              </button>
            )}
          </div>

          <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden">
            {!txs || txs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-7 h-7 text-gray-500" />
                </div>
                <p className="text-sm font-semibold text-gray-400">No transactions yet</p>
                <p className="text-xs text-gray-500 mt-1">Your activity will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A2A]">
                {txs.slice(0, 5).map((t) => {
                  const TxIcon = iconForTx(t.type)
                  const isPositive = t.type === 'topup' || t.type === 'refund'
                  const displayAmount = typeof t.amount === 'number' ? t.amount : 0
                  // Story 23.2 - AC#4: Display payment reference
                  const reference = t.payment_id || t.reference_id

                  return (
                    <div key={t._id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isPositive ? 'bg-green-500/20' : 'bg-[#2A2A2A]'
                        }`}>
                          <TxIcon className={`w-5 h-5 ${isPositive ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white capitalize">
                            {t.type === 'topup' ? 'Top Up' : t.type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(t.createdAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {/* Story 23.2 - AC#4: Show reference for top-ups */}
                          {reference && t.type === 'topup' && (
                            <p className="text-[10px] text-gray-600 font-mono truncate max-w-[140px]" title={reference}>
                              Ref: {reference.slice(-12)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-white'}`}>
                          {isPositive ? '+' : '-'}₱{Math.abs(displayAmount).toLocaleString()}
                        </p>
                        <p className={`text-xs font-medium capitalize ${
                          t.status === 'completed' ? 'text-green-400' :
                          t.status === 'pending' ? 'text-[var(--color-primary)]' : 'text-red-400'
                        }`}>
                          {t.status}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">Earn rewards on every top-up!</p>
              <p className="text-xs text-gray-400">Get bonus points when you add money to your wallet. The more you top up, the more you earn.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Wallet
