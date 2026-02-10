// React import not needed for JSX in React 17+
import { useState, useEffect } from 'react';
import { Wallet, X, AlertCircle, CheckCircle, Sparkles, Loader2, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { createPortal } from 'react-dom';

/**
 * ComboPaymentDialog - Story 24.3: Process Combo Payment
 *
 * Dialog for staff to process combo payment (wallet + cash/card) at POS.
 * Shows wallet portion, remainder, payment method selection, and optional partial wallet use.
 *
 * Props:
 * - isOpen: boolean - Whether dialog is visible
 * - onClose: () => void - Close dialog callback
 * - onSuccess: (result) => void - Called after successful payment with result
 * - customerId: Id<"users"> - Customer user ID
 * - customerName: string - Customer display name
 * - totalAmount: number - Total payment amount in pesos
 * - walletBalance: number - Customer's current wallet balance
 * - serviceName: string - Service being paid for
 * - branchId: Id<"branches"> - Branch processing payment
 * - bookingId: Id<"bookings"> | undefined - Optional booking ID
 * - staffId: Id<"users"> | undefined - Staff processing payment
 * - initialWalletAmount: number | undefined - Initial wallet amount (defaults to full balance)
 */
export function ComboPaymentDialog({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  customerName,
  totalAmount,
  walletBalance,
  serviceName,
  branchId,
  bookingId,
  staffId,
  initialWalletAmount,
}) {
  // Wallet portion (editable for partial wallet use - AC #5)
  const [walletAmount, setWalletAmount] = useState(
    initialWalletAmount ?? Math.min(walletBalance, totalAmount)
  );
  // Payment method for remainder
  const [remainderMethod, setRemainderMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [walletProcessed, setWalletProcessed] = useState(false);

  // Reset state when dialog opens (deps include props used in calculation)
  // Note: walletBalance/totalAmount/initialWalletAmount deps are needed for
  // the wallet amount calculation; reset only happens when isOpen is true
  useEffect(() => {
    if (isOpen) {
      setWalletAmount(initialWalletAmount ?? Math.min(walletBalance, totalAmount));
      setRemainderMethod('cash');
      setError(null);
      setWalletProcessed(false);
    }
  }, [isOpen, walletBalance, totalAmount, initialWalletAmount]);

  // Use the existing payBookingWithWallet mutation for wallet portion
  const payWithWallet = useMutation(api.services.wallet.payBookingWithWallet);

  // Format currency display
  const formatCurrency = (value) => {
    return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Calculate values
  const remainderAmount = totalAmount - walletAmount;
  const isValidWalletAmount = walletAmount > 0 && walletAmount <= walletBalance;
  const pointsEarned = Math.floor(walletAmount); // 1 peso = 1 point

  // Payment method options
  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-green-400' },
    { id: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-400' },
    { id: 'gcash', label: 'GCash', icon: Smartphone, color: 'text-blue-500' },
    { id: 'maya', label: 'Maya', icon: Smartphone, color: 'text-green-500' },
  ];

  const handleWalletAmountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    // Clamp between 0 and wallet balance (and max total amount)
    const clampedValue = Math.min(Math.max(0, value), walletBalance, totalAmount);
    setWalletAmount(clampedValue);
  };

  const handleConfirm = async () => {
    if (!customerId || walletAmount <= 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Process wallet portion
      const walletResult = await payWithWallet({
        userId: customerId,
        amount: walletAmount,
        bookingId: bookingId,
        branchId: branchId,
        serviceName: serviceName,
        staffId: staffId,
      });

      console.log('[COMBO_PAYMENT] Wallet portion processed:', walletResult);
      setWalletProcessed(true);

      // Step 2: Record remainder payment method
      // The booking is now marked with payment info from wallet portion
      // The remainder is tracked as the additional payment method
      const comboResult = {
        success: true,
        walletPortion: {
          amount: walletAmount,
          ...walletResult,
        },
        remainderPortion: {
          amount: remainderAmount,
          method: remainderMethod,
        },
        totalPaid: totalAmount,
        pointsEarned: walletResult.pointsEarned?.totalPoints || pointsEarned,
      };

      console.log('[COMBO_PAYMENT] Combo payment successful:', comboResult);

      // Call success callback with combined result
      onSuccess?.(comboResult);
      onClose();
    } catch (err) {
      console.error('[COMBO_PAYMENT] Payment failed:', err);

      // Check for insufficient balance error
      if (err.message?.includes('Insufficient') || err.data?.code === 'INSUFFICIENT_BALANCE') {
        setError('Insufficient wallet balance. The customer balance may have changed.');
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-green-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Combo Payment</h3>
                <p className="text-sm text-gray-400">{customerName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Close combo payment dialog"
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
              <p className="text-lg font-bold text-[var(--color-primary)] mt-1">
                Total: {formatCurrency(totalAmount)}
              </p>
            </div>

            {/* Wallet Portion - Editable for partial use (AC #5) */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Wallet Portion</span>
                </div>
                <span className="text-xs text-gray-400">
                  Available: {formatCurrency(walletBalance)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-purple-300">₱</span>
                <input
                  type="number"
                  value={walletAmount}
                  onChange={handleWalletAmountChange}
                  min="0"
                  max={Math.min(walletBalance, totalAmount)}
                  step="1"
                  disabled={isProcessing}
                  aria-label="Wallet amount to use"
                  className="flex-1 bg-[#0A0A0A] border border-[var(--color-primary)]/50 rounded-lg px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
                />
              </div>

              {!isValidWalletAmount && walletAmount !== 0 && (
                <p className="text-xs text-red-400 mt-2">
                  Amount must be between ₱1 and {formatCurrency(walletBalance)}
                </p>
              )}

              {/* Points Earning */}
              {walletAmount > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-purple-300">
                    Customer earns <strong className="text-purple-200">+{pointsEarned} points</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Remainder Portion */}
            <div className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Remainder</span>
                <span className="text-xl font-bold text-white">
                  {formatCurrency(remainderAmount)}
                </span>
              </div>

              {/* Payment Method Selector */}
              {remainderAmount > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const isSelected = remainderMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setRemainderMethod(method.id)}
                          disabled={isProcessing}
                          aria-label={`Pay remainder with ${method.label}`}
                          aria-pressed={isSelected}
                          className={`flex items-center gap-2 p-3 rounded-lg border transition-all min-h-[44px] ${
                            isSelected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                              : 'border-[#333333] bg-[#1A1A1A] text-gray-400 hover:border-gray-500'
                          } disabled:opacity-50`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? method.color : ''}`} />
                          <span className="text-sm font-medium">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Wallet</span>
                <span className="text-purple-400 font-medium">{formatCurrency(walletAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{paymentMethods.find(m => m.id === remainderMethod)?.label || 'Cash'}</span>
                <span className="text-white font-medium">{formatCurrency(remainderAmount)}</span>
              </div>
              <div className="h-px bg-[#2A2A2A]" />
              <div className="flex justify-between">
                <span className="text-gray-300 font-medium">Total</span>
                <span className="text-[var(--color-primary)] font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Wallet Processed Indicator (AC #4) */}
            {walletProcessed && !isProcessing && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-300">
                    <p className="font-medium">Wallet portion processed</p>
                    <p className="text-green-300/70 mt-1">
                      {formatCurrency(walletAmount)} deducted from wallet.
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
              aria-label="Cancel combo payment"
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || !isValidWalletAmount || walletAmount === 0}
              aria-label="Confirm combo payment"
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-[var(--color-primary)] hover:opacity-90 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
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

export default ComboPaymentDialog;
