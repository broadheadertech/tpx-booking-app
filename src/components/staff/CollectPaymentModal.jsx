import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X, Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';

/**
 * CollectPaymentModal - Modal for collecting payment at POS (Story 8.2 - FR15)
 * Allows staff to record cash/manual payments from customers
 */
export default function CollectPaymentModal({
  isOpen,
  onClose,
  booking,
  staffUserId,
  onPaymentCollected
}) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const recordPayment = useMutation(api.services.bookings.recordCashPayment);

  if (!isOpen || !booking) return null;

  // Calculate amounts
  // Note: Convenience fee is a separate reservation payment, NOT deducted from service price
  const servicePrice = booking.service_price || booking.price || 0;
  const cashCollected = booking.cash_collected || 0;
  const remainingBalance = Math.max(0, servicePrice - cashCollected);

  const amountToCollect = useCustomAmount && customAmount
    ? parseFloat(customAmount)
    : remainingBalance;

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'gcash_manual', label: 'GCash', icon: Smartphone },
    { id: 'maya_manual', label: 'Maya', icon: Wallet },
    { id: 'card_manual', label: 'Card', icon: CreditCard },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (amountToCollect <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (amountToCollect > remainingBalance) {
        throw new Error(`Amount cannot exceed remaining balance of ₱${remainingBalance.toLocaleString()}`);
      }

      await recordPayment({
        booking_id: booking._id,
        amount: amountToCollect,
        payment_method: paymentMethod,
        collected_by: staffUserId,
      });

      onPaymentCollected?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Collect Payment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Booking Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-sm text-gray-600">
              Booking: <span className="font-medium text-gray-900">{booking.booking_code}</span>
            </p>
            <p className="text-sm text-gray-600">
              Customer: <span className="font-medium text-gray-900">{booking.customer_name}</span>
            </p>
          </div>

          {/* Amount Due */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700 mb-1">Amount Due</p>
            <p className="text-2xl font-bold text-amber-900">
              ₱{remainingBalance.toLocaleString()}
            </p>
            {convenienceFeePaid > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                (₱{convenienceFeePaid.toLocaleString()} convenience fee already paid)
              </p>
            )}
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === method.id
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomAmount}
                onChange={(e) => setUseCustomAmount(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700">Enter custom amount (partial payment)</span>
            </label>

            {useCustomAmount && (
              <div className="mt-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    max={remainingBalance}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || amountToCollect <= 0}
            className="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Confirm Payment - ₱${amountToCollect.toLocaleString()}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
