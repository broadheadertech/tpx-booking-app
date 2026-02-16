import { useState, useEffect, useCallback } from 'react'
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Lock,
  RefreshCw,
  Plus,
  Clock,
  CreditCard,
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useAppModal } from '../../context/AppModalContext'

/**
 * Branch Admin Wallet
 *
 * Prepaid ordering wallet for branch admins to fund product orders from HQ.
 * Features: balance display, online top-up via PayMongo, transaction history, held balance tracking.
 */
const BranchAdminWallet = () => {
  const { user } = useCurrentUser()
  const { showAlert } = useAppModal()
  const branchId = user?.branch_id

  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpDescription, setTopUpDescription] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Queries
  const wallet = useQuery(
    api.services.branchWallet.getBranchWallet,
    branchId ? { branch_id: branchId } : 'skip'
  )

  const transactions = useQuery(
    api.services.branchWallet.getBranchWalletTransactions,
    branchId ? { branch_id: branchId, limit: 50 } : 'skip'
  )

  const pendingTopups = useQuery(
    api.services.branchWalletTopup.getPendingBranchTopups,
    branchId ? { branch_id: branchId } : 'skip'
  )

  const onlineTopupEnabled = useQuery(api.services.wallet.isWalletTopupEnabled)

  // Mutations & Actions
  const ensureWallet = useMutation(api.services.branchWallet.ensureBranchWallet)
  const createTopupSession = useAction(api.services.branchWalletTopup.createBranchWalletTopupSession)
  const checkTopupStatus = useAction(api.services.branchWalletTopup.checkBranchTopupPaymentStatus)

  // Auto-create wallet on first visit
  useEffect(() => {
    if (branchId && wallet === null) {
      ensureWallet({ branch_id: branchId })
    }
  }, [branchId, wallet, ensureWallet])

  // Handle redirect return from PayMongo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const topupStatus = params.get('topup')
    if (topupStatus === 'success') {
      showAlert({ title: 'Top-Up Successfully Submitted!', message: 'Your online payment has been received and is now being processed. Your wallet balance will update automatically once confirmed.', type: 'success' })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (topupStatus === 'cancelled') {
      showAlert({ title: 'Top-Up Cancelled', message: 'Your top-up request was cancelled. Don\'t worry — no charges were made to your account.', type: 'warning' })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for pending online topups
  useEffect(() => {
    if (!pendingTopups?.length) return

    const interval = setInterval(async () => {
      for (const pending of pendingTopups) {
        try {
          const result = await checkTopupStatus({ sessionId: pending.paymongo_session_id })
          if (result.status === 'paid') {
            showAlert({ title: 'Top-Up Successful!', message: `₱${pending.amount.toLocaleString()} has been successfully added to your branch wallet. Your updated balance is now reflected.`, type: 'success' })
            break
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [pendingTopups, checkTopupStatus, showAlert])

  // Online top-up handler (PayMongo)
  const handleOnlineTopUp = async () => {
    const amount = parseInt(topUpAmount)
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      showAlert({ title: 'Invalid Amount', message: 'Please enter a valid whole number amount in pesos (e.g. 500, 1000).', type: 'warning' })
      return
    }
    if (amount < 100) {
      showAlert({ title: 'Minimum Not Met', message: 'The minimum amount for online top-up is ₱100. Please enter a higher amount.', type: 'warning' })
      return
    }

    setIsRedirecting(true)
    try {
      const result = await createTopupSession({
        branch_id: branchId,
        amount,
        created_by: user._id,
        description: topUpDescription.trim() || undefined,
        origin: window.location.origin,
      })

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        showAlert({ title: 'Session Error', message: 'We couldn\'t create your payment session. Please check your connection and try again.', type: 'error' })
        setIsRedirecting(false)
      }
    } catch (error) {
      showAlert({ title: 'Payment Error', message: error.data?.message || error.message || 'Something went wrong while processing your top-up. Please try again later.', type: 'error' })
      setIsRedirecting(false)
    }
  }

  const closeModal = useCallback(() => {
    setShowTopUpModal(false)
    setTopUpAmount('')
    setTopUpDescription('')
    setIsRedirecting(false)
  }, [])

  const formatDate = (timestamp) => {
    if (!timestamp) return '—'
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionIcon = (txn) => {
    if (txn.type === 'topup' && txn.reference_type === 'online_topup') {
      return <CreditCard className="w-4 h-4 text-blue-400" />
    }
    switch (txn.type) {
      case 'topup': return <ArrowUpCircle className="w-4 h-4 text-green-400" />
      case 'hold': return <Lock className="w-4 h-4 text-yellow-400" />
      case 'release_hold': return <RefreshCw className="w-4 h-4 text-blue-400" />
      case 'payment': return <ArrowDownCircle className="w-4 h-4 text-red-400" />
      case 'credit': return <Plus className="w-4 h-4 text-green-400" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getTransactionBadge = (txn) => {
    if (txn.type === 'topup' && txn.reference_type === 'online_topup') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400">
          Online Top Up
        </span>
      )
    }

    const config = {
      topup: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Top Up' },
      hold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Hold' },
      release_hold: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Released' },
      payment: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Payment' },
      credit: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Credit' },
    }
    const c = config[txn.type] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: txn.type }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    )
  }

  if (!branchId) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No branch assigned. Branch wallet requires a branch.</p>
      </div>
    )
  }

  const balance = wallet?.balance ?? 0
  const heldBalance = wallet?.held_balance ?? 0
  const totalBalance = balance + heldBalance
  const isOnlineAvailable = onlineTopupEnabled?.enabled

  return (
    <div className="space-y-4">
      {/* Wallet Balance Card */}
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, var(--color-primary), var(--color-accent, var(--color-primary)))`,
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/80 text-sm font-medium">Branch Wallet</span>
            <Wallet className="w-5 h-5 text-white/60" />
          </div>

          <div className="mb-4">
            <span className="text-white/60 text-xs">Available Balance</span>
            <div className="text-white text-4xl font-bold tracking-tight">
              ₱{balance.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-6 mb-4">
            {heldBalance > 0 && (
              <div>
                <span className="text-white/50 text-[10px] uppercase tracking-wider">On Hold</span>
                <div className="text-white/80 text-sm font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  ₱{heldBalance.toLocaleString()}
                </div>
              </div>
            )}
            <div>
              <span className="text-white/50 text-[10px] uppercase tracking-wider">Total</span>
              <div className="text-white/80 text-sm font-semibold">
                ₱{totalBalance.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (!isOnlineAvailable) {
                showAlert({ title: 'Online Payment Unavailable', message: 'Online top-up hasn\'t been set up by HQ yet. Please contact your administrator to enable this feature.', type: 'info' })
                return
              }
              setShowTopUpModal(true)
            }}
            className="w-full py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-all backdrop-blur-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Top Up Wallet
          </button>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] text-gray-400 uppercase">Topped Up</span>
          </div>
          <div className="text-white text-sm font-bold">
            ₱{(wallet?.total_topped_up ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] text-gray-400 uppercase">Spent</span>
          </div>
          <div className="text-white text-sm font-bold">
            ₱{(wallet?.total_spent ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
          <div className="flex items-center gap-1.5 mb-1">
            <Lock className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] text-gray-400 uppercase">On Hold</span>
          </div>
          <div className="text-white text-sm font-bold">
            ₱{heldBalance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Pending Online Top-Up Banner */}
      {pendingTopups && pendingTopups.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-yellow-400 text-sm font-medium">Payment Processing</p>
            <p className="text-yellow-400/70 text-xs">
              ₱{pendingTopups[0].amount.toLocaleString()} online top-up is being confirmed...
            </p>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h3 className="text-white text-sm font-semibold">Transaction History</h3>
          <span className="text-gray-500 text-xs">{transactions?.length ?? 0} transactions</span>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {!transactions || transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No transactions yet</p>
              <p className="text-xs mt-1">Top up your wallet to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {transactions.map((txn) => (
                <div key={txn._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#222]">
                  <div className="flex-shrink-0">
                    {getTransactionIcon(txn)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getTransactionBadge(txn)}
                      {txn.reference_id && txn.reference_type !== 'online_topup' && (
                        <span className="text-[10px] text-gray-500">{txn.reference_id}</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">
                      {txn.description}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-semibold ${
                      txn.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {txn.amount > 0 ? '+' : ''}₱{Math.abs(txn.amount).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {formatDate(txn.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-Up Modal (Online Only) */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-lg font-semibold">Top Up Wallet</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Method Label */}
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Pay via GCash / Maya / Card</span>
              </div>

              {/* Current Balance */}
              <div className="bg-[#0A0A0A] rounded-xl p-3 border border-[#2A2A2A]">
                <span className="text-gray-400 text-xs">Current Balance</span>
                <div className="text-white text-lg font-bold">₱{balance.toLocaleString()}</div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-gray-300 text-sm mb-1.5 block">Amount (₱)</label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Enter amount in pesos"
                  min="100"
                  step="1"
                  className="w-full px-4 py-3 bg-[#3A3A3A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-lg font-semibold focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <p className="text-gray-500 text-[10px] mt-1">Minimum ₱100</p>
              </div>

              {/* Quick Amounts */}
              <div className="flex gap-2">
                {[1000, 2000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTopUpAmount(String(amt))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      topUpAmount === String(amt)
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    ₱{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Description */}
              <div>
                <label className="text-gray-300 text-sm mb-1.5 block">Note (optional)</label>
                <input
                  type="text"
                  value={topUpDescription}
                  onChange={(e) => setTopUpDescription(e.target.value)}
                  placeholder="e.g., Monthly fund top-up"
                  className="w-full px-4 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>

              {/* New Balance Preview */}
              {topUpAmount && parseInt(topUpAmount) > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                  <span className="text-green-400 text-xs">New Balance After Top-Up</span>
                  <div className="text-green-400 text-lg font-bold">
                    ₱{(balance + parseInt(topUpAmount)).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={handleOnlineTopUp}
                disabled={isRedirecting || !topUpAmount || parseInt(topUpAmount) < 100}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to PayMongo...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay ₱{topUpAmount ? parseInt(topUpAmount).toLocaleString() : '0'} via PayMongo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchAdminWallet
