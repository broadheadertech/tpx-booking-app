// React import not needed for JSX in React 17+
import { Wallet, AlertCircle, CreditCard, Sparkles } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

/**
 * POSWalletPayment - Story 24.1: Display Wallet Payment Option at POS
 *
 * Displays customer wallet balance and payment options for staff at POS.
 * Handles sufficient balance, partial balance, zero balance, and guest scenarios.
 *
 * Props:
 * - customerId: Id<"users"> | null - Customer user ID (null for guests)
 * - totalAmount: number - Payment amount in pesos (whole pesos, e.g., 500 = ₱500)
 * - onPayWithWallet: () => void - Callback when "Pay with Wallet" is clicked (full payment)
 * - onComboPayment: (walletAmount: number) => void - Callback for combo payment (partial wallet)
 * - disabled: boolean - Whether buttons should be disabled (e.g., during processing)
 *
 * Acceptance Criteria:
 * - AC #1: Show wallet balance when customer is identified
 * - AC #2: Enable "Pay with Wallet" when balance >= total
 * - AC #3: Show "Use ₱{balance} + pay remainder" when balance < total && balance > 0
 * - AC #4: Show disabled state with "No wallet balance" when balance === 0
 * - AC #5: Hide component entirely for guests
 */
export function POSWalletPayment({
  customerId,
  totalAmount,
  onPayWithWallet,
  onComboPayment,
  disabled = false,
}) {
  // Task 5: Handle guest customer case - return null if no customerId (AC #5)
  // Use "skip" to prevent query execution for guests
  const walletBalance = useQuery(
    api.services.wallet.getCustomerWalletBalance,
    customerId ? { user_id: customerId } : "skip"
  );

  // Task 5.1 & 5.2: If no customerId, don't render component
  if (!customerId) {
    return null;
  }

  // Task 3.5: Handle skeleton loading state when data === undefined
  if (walletBalance === undefined) {
    return (
      <div
        className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] animate-pulse"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading customer wallet balance"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#333333]" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-[#333333] rounded mb-2" />
            <div className="h-6 w-32 bg-[#333333] rounded" />
          </div>
        </div>
        <div className="mt-4 h-11 bg-[#333333] rounded-xl" />
      </div>
    );
  }

  // Task 4: Handle case where customer has no wallet
  if (!walletBalance || !walletBalance.hasWallet) {
    // AC #4: Show "No wallet balance" message
    return (
      <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Customer Wallet</p>
            <p className="text-lg font-bold text-gray-500">No wallet</p>
          </div>
        </div>
        <button
          disabled
          aria-label="No wallet balance available"
          className="mt-4 w-full py-3 px-4 rounded-xl text-sm font-medium bg-gray-700/50 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Wallet className="w-4 h-4" />
          No wallet balance
        </button>
      </div>
    );
  }

  const { totalBalance, bonusBalance } = walletBalance;

  // Task 3: Implement balance comparison logic
  // Convert totalAmount from centavos if needed (checking if it's > 10000 suggests centavos)
  // Per project-context.md, currency is stored as whole pesos: 500 = ₱500
  const amountInPesos = totalAmount;

  // Task 3.1: Compare wallet_balance vs booking total amount
  const hasSufficientBalance = totalBalance >= amountInPesos; // AC #2
  const hasPartialBalance = totalBalance > 0 && totalBalance < amountInPesos; // AC #3
  const hasZeroBalance = totalBalance === 0; // AC #4

  // Format currency display
  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Calculate remainder for combo payment
  const remainder = hasPartialBalance ? amountInPesos - totalBalance : 0;

  return (
    <div className="p-4 bg-[#1A1A1A] rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
      {/* AC #1: Display customer wallet balance */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400">Customer Wallet</p>
          <p className="text-lg font-bold text-white">
            {formatCurrency(totalBalance)}
          </p>
          {bonusBalance > 0 && (
            <p className="text-xs text-purple-300">
              Includes {formatCurrency(bonusBalance)} bonus
            </p>
          )}
        </div>
        {hasSufficientBalance && (
          <div className="px-2 py-1 bg-green-500/20 rounded-full">
            <span className="text-xs font-medium text-green-400">Sufficient</span>
          </div>
        )}
      </div>

      {/* AC #2: Full wallet payment - enabled when balance >= total */}
      {hasSufficientBalance && (
        <button
          onClick={onPayWithWallet}
          disabled={disabled}
          aria-label={`Pay ${formatCurrency(amountInPesos)} with customer wallet`}
          className="mt-4 w-full py-3 px-4 rounded-xl text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Wallet className="w-4 h-4" />
          Pay {formatCurrency(amountInPesos)} with Wallet
        </button>
      )}

      {/* AC #3: Combo payment - partial wallet + pay remainder */}
      {hasPartialBalance && (
        <>
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-300">
                <p>Insufficient balance for full payment</p>
                <p className="text-xs text-yellow-300/70 mt-1">
                  Wallet: {formatCurrency(totalBalance)} | Remaining: {formatCurrency(remainder)}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => onComboPayment?.(totalBalance)}
            disabled={disabled}
            aria-label={`Use ${formatCurrency(totalBalance)} from wallet and pay ${formatCurrency(remainder)} remainder`}
            className="mt-3 w-full py-3 px-4 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-[var(--color-primary)] hover:opacity-90 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <CreditCard className="w-4 h-4" />
            Use {formatCurrency(totalBalance)} + pay {formatCurrency(remainder)} remainder
          </button>
        </>
      )}

      {/* AC #4: Zero balance - disabled state */}
      {hasZeroBalance && (
        <button
          disabled
          aria-label="Customer has zero wallet balance"
          className="mt-4 w-full py-3 px-4 rounded-xl text-sm font-medium bg-gray-700/50 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Wallet className="w-4 h-4" />
          No wallet balance
        </button>
      )}

      {/* Points earning indicator */}
      {(hasSufficientBalance || hasPartialBalance) && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-purple-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            Customer earns +{Math.floor(hasSufficientBalance ? amountInPesos : totalBalance)} points
          </span>
        </div>
      )}
    </div>
  );
}

export default POSWalletPayment;
