import { useNavigate } from 'react-router-dom'
import { Wallet as WalletIcon, Plus, CreditCard, Gift, Clock, Banknote, Star, Loader2, RefreshCw } from 'lucide-react'

/**
 * PayTab - Main wallet view with balance and actions
 *
 * Contains:
 * - Full balance card with breakdown
 * - Quick action buttons
 * - Pending top-ups section
 * - Help/promo section
 */
function PayTab({
  user,
  wallet,
  mainBalance,
  bonusBalance,
  totalBalance,
  pendingTopups,
  onTopUp,
  onCheckTopupStatus,
  checkingTopupId,
  isProcessingReturn,
  autoPollingActive
}) {
  const navigate = useNavigate()

  const balanceDisplay = totalBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return (
    <div className="px-4 py-6 space-y-6">
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
            {/* Balance Breakdown - show if user has bonus balance */}
            {bonusBalance > 0 && (
              <div className="mt-2 flex items-center gap-3 text-xs text-white/70">
                <span>Main: ₱{mainBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[var(--color-secondary)]">+ Bonus: ₱{bonusBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <p className="text-sm text-white/60 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Updated {wallet?.updatedAt ? new Date(wallet.updatedAt).toLocaleDateString('en-PH') : 'now'}
            </p>
          </div>

          {/* Add Money Button */}
          <button
            onClick={onTopUp}
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
          onClick={onTopUp}
          className="flex flex-col items-center p-4 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] hover:border-[var(--color-primary)]/30 active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center mb-2">
            <Plus className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <span className="text-xs font-semibold text-white">Top Up</span>
        </button>

        <button
          onClick={() => navigate('/customer/booking')}
          className="flex flex-col items-center p-4 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] hover:border-[var(--color-primary)]/30 active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center mb-2">
            <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <span className="text-xs font-semibold text-white">Pay</span>
        </button>

        <button
          onClick={() => navigate('/customer/vouchers')}
          className="flex flex-col items-center p-4 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] hover:border-[var(--color-primary)]/30 active:scale-[0.98] transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center mb-2">
            <Gift className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <span className="text-xs font-semibold text-white">Vouchers</span>
        </button>
      </div>

      {/* Processing Return from Payment */}
      {isProcessingReturn && (
        <div className="bg-[#1A1A1A] rounded-[20px] border border-[var(--color-primary)]/30 p-6 text-center">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Processing your payment...</p>
          <p className="text-xs text-gray-400 mt-1">Please wait while we confirm your top-up</p>
        </div>
      )}

      {/* Pending Top-ups - Show if any pending */}
      {!isProcessingReturn && pendingTopups && pendingTopups.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            {autoPollingActive ? (
              <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
            ) : (
              <Clock className="w-4 h-4 text-yellow-500" />
            )}
            {autoPollingActive ? 'Verifying Payment...' : 'Pending Top-ups'}
          </h3>
          <div className={`bg-[#1A1A1A] rounded-[20px] border overflow-hidden ${
            autoPollingActive ? 'border-[var(--color-primary)]/30' : 'border-yellow-500/30'
          }`}>
            {/* Auto-processing banner */}
            {autoPollingActive && (
              <div className="bg-[var(--color-primary)]/10 px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-[var(--color-primary)] animate-spin" />
                <span className="text-xs text-[var(--color-primary)]">
                  Automatically checking payment status...
                </span>
              </div>
            )}
            <div className="divide-y divide-[#2A2A2A]">
              {pendingTopups.map((t) => (
                <div key={t._id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      autoPollingActive ? 'bg-[var(--color-primary)]/20' : 'bg-yellow-500/20'
                    }`}>
                      {autoPollingActive ? (
                        <Loader2 className="w-5 h-5 text-[var(--color-primary)] animate-spin" />
                      ) : (
                        <Banknote className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        ₱{t.amount?.toLocaleString()} Top-up
                      </p>
                      <p className={`text-xs ${autoPollingActive ? 'text-[var(--color-primary)]' : 'text-yellow-400'}`}>
                        {autoPollingActive ? 'Verifying payment...' : 'Awaiting confirmation'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onCheckTopupStatus(t.source_id)}
                    disabled={checkingTopupId === t.source_id || autoPollingActive}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      autoPollingActive
                        ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] cursor-not-allowed'
                        : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50'
                    }`}
                  >
                    {checkingTopupId === t.source_id || autoPollingActive ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {autoPollingActive ? 'Auto-checking' : 'Checking...'}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        Check Now
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Helper text */}
          <p className="text-xs text-gray-500 mt-2 text-center">
            {autoPollingActive
              ? 'Your balance will update automatically once payment is confirmed'
              : 'Payment verification happens automatically. Click "Check Now" if needed.'}
          </p>
        </div>
      )}

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
  )
}

export default PayTab
