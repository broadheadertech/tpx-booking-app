// React import not needed for JSX in React 17+
import { useState, useEffect } from 'react';
import { Wallet, X, AlertCircle, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { createPortal } from 'react-dom';

/**
 * WalletPaymentConfirmDialog - Story 24.2: Process Full Wallet Payment
 *
 * Confirmation dialog for staff to confirm wallet payment at POS.
 * Shows payment details, balance impact, and points to be earned.
 *
 * Props:
 * - isOpen: boolean - Whether dialog is visible
 * - onClose: () => void - Close dialog callback
 * - onSuccess: (result) => void - Called after successful payment with result
 * - onInsufficientBalance: () => void - Called when balance is insufficient (offer combo)
 * - customerId: Id<"users"> - Customer user ID
 * - customerName: string - Customer display name
 * - amount: number - Payment amount in pesos
 * - walletBalance: number - Customer's current wallet balance
 * - serviceName: string - Service being paid for
 * - branchId: Id<"branches"> - Branch processing payment
 * - bookingId: Id<"bookings"> | undefined - Optional booking ID
 * - staffId: Id<"users"> | undefined - Staff processing payment
 */
export function WalletPaymentConfirmDialog({
  isOpen,
  onClose,
  onSuccess,
  onInsufficientBalance,
  customerId,
  customerName,
  amount,
  walletBalance,
  serviceName,
  branchId,
  bookingId,
  staffId,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Reset error state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Use the existing payBookingWithWallet mutation
  const payWithWallet = useMutation(api.services.wallet.payBookingWithWallet);

  // Format currency display
  const formatCurrency = (value) => {
    return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Calculate values
  const balanceAfterPayment = walletBalance - amount;
  const hasSufficientBalance = walletBalance >= amount;
  const basePointsEarned = Math.floor(amount); // 1 peso = 1 point

  const handleConfirm = async () => {
    if (!customerId || !amount) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await payWithWallet({
        userId: customerId,
        amount: amount,
        bookingId: bookingId,
        branchId: branchId,
        serviceName: serviceName,
        staffId: staffId,
      });

      console.log('[POS_WALLET_PAYMENT] Payment successful:', result);

      // Call success callback with result
      onSuccess?.(result);
      onClose();
    } catch (err) {
      console.error('[POS_WALLET_PAYMENT] Payment failed:', err);

      // Check for insufficient balance error
      if (err.message?.includes('Insufficient') || err.data?.code === 'INSUFFICIENT_BALANCE') {
        setError('Insufficient wallet balance. The customer balance may have changed.');
        onInsufficientBalance?.();
      } else {
        setError(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={!isProcessing ? onClose : undefined}
        />

        {/* Dialog */}
        <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] shadow-2xl transition-all z-[10000] border border-purple-500/30">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Wallet Payment</h3>
                <p className="text-sm text-gray-400">{customerName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Close wallet payment dialog"
              className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Service Info */}
            <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
              <p className="text-sm text-gray-400">Service</p>
              <p className="text-white font-medium">{serviceName || 'Booking Payment'}</p>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Payment Amount</span>
                <span className="text-xl font-bold text-white">{formatCurrency(amount)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Current Balance</span>
                <span className={`font-medium ${hasSufficientBalance ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(walletBalance)}
                </span>
              </div>

              <div className="h-px bg-[#2A2A2A]" />

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Balance After Payment</span>
                <span className={`font-bold ${balanceAfterPayment >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                  {formatCurrency(Math.max(0, balanceAfterPayment))}
                </span>
              </div>
            </div>

            {/* Points Earning */}
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">
                  Customer earns <strong className="text-purple-200">+{basePointsEarned} points</strong>
                </span>
              </div>
            </div>

            {/* Insufficient Balance Warning */}
            {!hasSufficientBalance && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-300">
                    <p className="font-medium">Insufficient Balance</p>
                    <p className="text-red-300/70 mt-1">
                      Customer needs {formatCurrency(amount - walletBalance)} more.
                      Consider using combo payment (wallet + cash/card).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 pt-0">
            <button
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Cancel wallet payment"
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || !hasSufficientBalance}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default WalletPaymentConfirmDialog;
