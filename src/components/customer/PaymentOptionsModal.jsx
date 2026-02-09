import React, { useState, useEffect } from 'react';
import { X, CreditCard, Wallet, Store, AlertCircle, Loader2, ChevronRight, Star, Sparkles, LogIn, ArrowRight, Plus } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { createPortal } from 'react-dom';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';

/**
 * PaymentOptionsModal - Story 7.4 + Customer Experience (Wallet Payments with Points)
 *
 * Displays available payment options based on branch configuration:
 * - Pay with Wallet: Use wallet balance (earns points) - shown first if sufficient balance
 * - Pay Now: Full service amount via PayMongo (if enabled)
 * - Pay Later: Convenience fee now, service amount at branch (if enabled)
 * - Pay at Shop: No payment now, pay full amount at branch (if enabled)
 *
 * Props:
 * - isOpen: boolean - Whether modal is visible
 * - onClose: () => void - Close modal callback
 * - branchId: Id<"branches"> - Branch to get payment config for
 * - servicePrice: number - Full service price in pesos
 * - serviceName: string - Service name for display
 * - onSelect: (option: "wallet" | "pay_now" | "pay_later" | "pay_at_shop") => void - Selection callback
 */
const PaymentOptionsModal = ({
  isOpen,
  onClose,
  branchId,
  servicePrice,
  serviceName,
  onSelect
}) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Get current user for wallet balance check
  const { user, isAuthenticated } = useCurrentUser();

  // Fetch branch payment configuration (FR25 - branch isolation)
  const paymentConfig = useQuery(
    api.services.paymongo.getPaymentConfig,
    branchId ? { branch_id: branchId } : "skip"
  );

  // Check wallet balance for wallet payment option
  // API expects amount in pesos - it handles centavos conversion internally
  const walletCheck = useQuery(
    api.services.wallet.checkWalletBalance,
    user?._id ? { userId: user._id, amount: servicePrice } : "skip"
  );

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Calculate amounts for each option - supports both percentage and fixed fee
  const convenienceFeeType = paymentConfig?.convenience_fee_type || "percent";
  const convenienceFeePercent = paymentConfig?.convenience_fee_percent || 5;
  const convenienceFeeAmount = paymentConfig?.convenience_fee_amount || 50;

  // Calculate the actual fee based on type
  const convenienceFee = convenienceFeeType === "fixed"
    ? convenienceFeeAmount
    : Math.round(servicePrice * (convenienceFeePercent / 100) * 100) / 100;

  // Description text for pay later
  const convenienceFeeDescription = convenienceFeeType === "fixed"
    ? `Pay ₱${convenienceFeeAmount} convenience fee now`
    : `Pay ${convenienceFeePercent}% convenience fee now`;

  // Calculate points to be earned (1 peso = 1 point, stored as ×100)
  // This is the base rate - promotions may add bonus points
  const basePointsEarned = Math.floor(servicePrice);

  // Determine available options based on branch config
  const hasPayMongoConfig = paymentConfig?.has_public_key && paymentConfig?.has_secret_key;
  const options = [];

  // Wallet Payment option - shown first if user has sufficient balance
  if (user && walletCheck?.hasSufficientBalance) {
    options.push({
      id: 'wallet',
      label: 'Pay with Wallet',
      icon: Wallet,
      description: 'Use your wallet balance',
      payNow: servicePrice,
      dueAtBranch: 0,
      color: 'purple',
      walletBalance: walletCheck.totalBalance, // Already in pesos from API
      pointsEarned: basePointsEarned,
      recommended: true,
    });
  }

  // Combo Payment option - wallet + online payment (when user has partial balance)
  // Only show if: user is logged in, has wallet with some balance, but not enough for full payment
  // AND the online portion is at least ₱100 (PayMongo minimum for e-wallet/card transactions)
  const PAYMONGO_MIN_AMOUNT = 100; // PayMongo minimum is ₱100 for GCash, Maya, Card
  const walletBalancePesos = walletCheck?.totalBalance || 0; // Already in pesos from API
  const hasPartialBalance = user && walletCheck?.hasWallet && walletBalancePesos > 0 && !walletCheck.hasSufficientBalance;
  const onlinePortionAmount = hasPartialBalance ? servicePrice - walletBalancePesos : 0;
  const onlinePortionMeetsMinimum = onlinePortionAmount >= PAYMONGO_MIN_AMOUNT;

  if (hasPartialBalance && hasPayMongoConfig && paymentConfig?.pay_now_enabled && onlinePortionMeetsMinimum) {
    options.push({
      id: 'combo_wallet_online',
      label: 'Wallet + Pay Online',
      icon: Wallet,
      description: `Use ₱${walletBalancePesos.toLocaleString('en-PH')} from wallet`,
      payNow: servicePrice,
      dueAtBranch: 0,
      color: 'purple',
      walletBalance: walletBalancePesos,
      walletPortion: walletBalancePesos,
      onlinePortion: onlinePortionAmount,
      pointsEarned: basePointsEarned,
      isCombo: true,
    });
  }

  // Pay Now option (AC1, AC3)
  if (paymentConfig?.pay_now_enabled && hasPayMongoConfig) {
    options.push({
      id: 'pay_now',
      label: 'Pay Now',
      icon: CreditCard,
      description: 'Pay the full amount online',
      payNow: servicePrice,
      dueAtBranch: 0,
      color: 'green',
      pointsEarned: basePointsEarned,
    });
  }

  // Pay Later option (AC1, AC4)
  if (paymentConfig?.pay_later_enabled && hasPayMongoConfig) {
    options.push({
      id: 'pay_later',
      label: 'Pay Later',
      icon: CreditCard,
      description: convenienceFeeDescription,
      payNow: convenienceFee,
      dueAtBranch: servicePrice,
      color: 'yellow',
      pointsEarned: basePointsEarned, // Points earned on full service price at branch
    });
  }

  // Pay at Shop option (AC1, AC5)
  if (paymentConfig?.pay_at_shop_enabled) {
    options.push({
      id: 'pay_at_shop',
      label: 'Pay at Shop',
      icon: Store,
      description: 'Pay when you arrive at the branch',
      payNow: 0,
      dueAtBranch: servicePrice,
      color: 'blue',
      pointsEarned: basePointsEarned,
    });
  }

  // If no PayMongo config, only show Pay at Shop (AC6)
  if (!hasPayMongoConfig && options.length === 0) {
    options.push({
      id: 'pay_at_shop',
      label: 'Pay at Shop',
      icon: Store,
      description: 'Pay when you arrive at the branch',
      payNow: 0,
      dueAtBranch: servicePrice,
      color: 'blue',
      pointsEarned: basePointsEarned,
    });
  }

  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
  };

  const handleProceed = () => {
    if (!selectedOption) return;
    setLoading(true);
    onSelect(selectedOption);
  };

  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getColorClasses = (color, isSelected) => {
    const colors = {
      purple: {
        border: isSelected ? 'border-purple-500' : 'border-[#444444]',
        bg: isSelected ? 'bg-purple-500/10' : 'bg-[#0A0A0A]',
        icon: 'text-purple-400',
        ring: 'ring-purple-500',
        dot: 'bg-purple-500',
      },
      green: {
        border: isSelected ? 'border-green-500' : 'border-[#444444]',
        bg: isSelected ? 'bg-green-500/10' : 'bg-[#0A0A0A]',
        icon: 'text-green-400',
        ring: 'ring-green-500',
        dot: 'bg-green-500',
      },
      yellow: {
        border: isSelected ? 'border-yellow-500' : 'border-[#444444]',
        bg: isSelected ? 'bg-yellow-500/10' : 'bg-[#0A0A0A]',
        icon: 'text-yellow-400',
        ring: 'ring-yellow-500',
        dot: 'bg-yellow-500',
      },
      blue: {
        border: isSelected ? 'border-blue-500' : 'border-[#444444]',
        bg: isSelected ? 'bg-blue-500/10' : 'bg-[#0A0A0A]',
        icon: 'text-blue-400',
        ring: 'ring-blue-500',
        dot: 'bg-blue-500',
      },
    };
    return colors[color] || colors.blue;
  };

  if (!isOpen) return null;

  // Loading state while fetching config (AC4.2)
  const isLoadingConfig = branchId && paymentConfig === undefined;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] shadow-2xl transition-all z-[10000] border border-[#2A2A2A]/50">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#444444]/30">
            <div>
              <h3 className="text-xl font-bold text-white">Choose Payment Method</h3>
              <p className="text-sm text-gray-400 mt-1">{serviceName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {/* Login prompt for guest users */}
            {!isAuthenticated && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <LogIn className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Have an account?</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Log in to pay with your wallet balance and earn loyalty points!
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/login', { state: { returnTo: window.location.pathname + window.location.search } });
                      }}
                      className="mt-2 flex items-center space-x-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <span>Log in now</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoadingConfig ? (
              // Loading state (AC4.2)
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-[var(--color-primary)] animate-spin" />
                <p className="text-gray-400 mt-3">Loading payment options...</p>
              </div>
            ) : options.length === 0 ? (
              // Error state - no options available (AC4.3)
              <div className="p-4 bg-red-400/20 border border-red-400/30 rounded-lg flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">No payment options available</p>
                  <p className="text-xs text-red-400/70 mt-1">Please contact the branch for assistance.</p>
                </div>
              </div>
            ) : (
              // Payment options (AC1, AC2)
              <div className="space-y-3">
                {options.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedOption === option.id;
                  const colorClasses = getColorClasses(option.color, isSelected);

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all ${colorClasses.border} ${colorClasses.bg} hover:border-opacity-80`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {/* Radio indicator */}
                          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? `${colorClasses.border} ${colorClasses.bg}` : 'border-gray-500'}`}>
                            {isSelected && (
                              <div className={`w-2.5 h-2.5 rounded-full ${colorClasses.dot}`} />
                            )}
                          </div>

                          {/* Option details */}
                          <div className="text-left">
                            <div className="flex items-center space-x-2">
                              <Icon className={`h-5 w-5 ${colorClasses.icon}`} />
                              <span className="font-semibold text-white">{option.label}</span>
                              {option.recommended && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{option.description}</p>

                            {/* Wallet balance display */}
                            {option.walletBalance !== undefined && (
                              <p className="text-xs text-purple-300 mt-1">
                                Wallet: {formatCurrency(option.walletBalance)} available
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment breakdown (AC2 - FR4) */}
                      <div className="mt-3 pt-3 border-t border-[#444444]/30">
                        {option.isCombo ? (
                          // Combo payment breakdown
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400 flex items-center">
                                <Wallet className="h-3 w-3 mr-1" />
                                From wallet:
                              </span>
                              <span className="font-medium text-purple-400">
                                {formatCurrency(option.walletPortion)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-gray-400 flex items-center">
                                <CreditCard className="h-3 w-3 mr-1" />
                                Pay online:
                              </span>
                              <span className="font-medium text-green-400">
                                {formatCurrency(option.onlinePortion)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1 pt-1 border-t border-[#444444]/20">
                              <span className="text-gray-400">Total:</span>
                              <span className="font-medium text-white">
                                {formatCurrency(option.payNow)}
                              </span>
                            </div>
                          </>
                        ) : (
                          // Standard payment breakdown
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Pay now:</span>
                              <span className={`font-medium ${option.payNow > 0 ? 'text-white' : 'text-gray-500'}`}>
                                {formatCurrency(option.payNow)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-gray-400">Due at branch:</span>
                              <span className={`font-medium ${option.dueAtBranch > 0 ? 'text-white' : 'text-gray-500'}`}>
                                {formatCurrency(option.dueAtBranch)}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Points earning display */}
                        {option.pointsEarned > 0 && (
                          <div className="flex justify-between text-sm mt-2 pt-2 border-t border-[#444444]/20">
                            <span className="text-gray-400 flex items-center">
                              <Star className="h-3.5 w-3.5 text-amber-400 mr-1" />
                              Points earned:
                            </span>
                            <span className="font-medium text-amber-400">
                              +{option.pointsEarned} ★
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Info note for Wallet Payment */}
            {selectedOption === 'wallet' && (
              <div className="mt-4 p-3 bg-purple-400/10 border border-purple-400/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Sparkles className="h-4 w-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-purple-300">
                      Instant payment from your wallet balance. You'll earn <strong>{basePointsEarned} points</strong> for this booking!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info note for Pay at Shop */}
            {selectedOption === 'pay_at_shop' && (
              <div className="mt-4 p-3 bg-blue-400/10 border border-blue-400/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  Your booking will be confirmed immediately. Please pay {formatCurrency(servicePrice)} at the branch upon arrival.
                </p>
              </div>
            )}

            {/* Info note for Pay Later */}
            {selectedOption === 'pay_later' && (
              <div className="mt-4 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                <p className="text-sm text-yellow-300">
                  Pay the {formatCurrency(convenienceFee)} convenience fee now to reserve your slot. The remaining {formatCurrency(servicePrice)} is due at the branch.
                </p>
              </div>
            )}

            {/* Info note for Pay Now */}
            {selectedOption === 'pay_now' && (
              <div className="mt-4 p-3 bg-green-400/10 border border-green-400/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Star className="h-4 w-4 text-amber-400 mt-0.5" />
                  <p className="text-sm text-green-300">
                    Pay the full amount now and earn <strong>{basePointsEarned} points</strong> when payment completes!
                  </p>
                </div>
              </div>
            )}

            {/* Info note for Combo Payment */}
            {selectedOption === 'combo_wallet_online' && (
              <div className="mt-4 p-3 bg-purple-400/10 border border-purple-400/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Sparkles className="h-4 w-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-purple-300">
                      Use your <strong>{formatCurrency(walletBalancePesos)}</strong> wallet balance and pay the remaining <strong>{formatCurrency(onlinePortionAmount)}</strong> online.
                    </p>
                    <p className="text-xs text-purple-300/70 mt-1">
                      You'll earn <strong>{basePointsEarned} points</strong> for this booking!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Show wallet balance if user has wallet but insufficient balance and no combo option selected */}
            {user && walletCheck && !walletCheck.hasSufficientBalance && walletCheck.hasWallet && selectedOption !== 'combo_wallet_online' && (
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-500/10 to-green-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Wallet className="h-4 w-4 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">
                      Wallet balance: <span className="text-purple-400 font-medium">{formatCurrency(walletCheck.totalBalance)}</span>
                      <span className="text-gray-500"> ({formatCurrency(servicePrice - walletCheck.totalBalance)} short)</span>
                    </p>
                    {hasPayMongoConfig && paymentConfig?.pay_now_enabled && (
                      <p className="text-xs text-gray-500 mt-1">
                        Select "Wallet + Pay Online" above to use your balance!
                      </p>
                    )}
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/customer/wallet');
                      }}
                      className="mt-2 flex items-center space-x-1 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Top up wallet</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 p-6 pt-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors text-sm font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceed}
              disabled={!selectedOption || loading}
              className="flex items-center space-x-2 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedOption === 'pay_at_shop' ? 'Confirm Booking' :
                     selectedOption === 'wallet' ? 'Pay with Wallet' :
                     selectedOption === 'combo_wallet_online' ? 'Use Wallet + Pay Online' :
                     'Proceed to Payment'}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentOptionsModal;
