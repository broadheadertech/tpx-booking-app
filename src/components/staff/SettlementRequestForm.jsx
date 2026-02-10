/**
 * Settlement Request Form - Story 25.1
 *
 * Modal component for branch managers to request settlement of pending earnings.
 * Displays pending earnings summary and payout details before submission.
 *
 * ACs: #1 (settlement button), #2 (form display), #3 (payout details), #4 (submission)
 */
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  X,
  Wallet,
  Receipt,
  CreditCard,
  Building2,
  Smartphone,
  AlertCircle,
  Check,
  Loader2,
  BanknoteIcon,
} from "lucide-react";

/**
 * Format currency as Philippine Peso
 * @param {number} amount - Amount in whole pesos
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "₱0.00";
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Get icon for payout method
 */
const getPayoutIcon = (method) => {
  switch (method) {
    case "gcash":
      return <Smartphone className="w-4 h-4" />;
    case "maya":
      return <CreditCard className="w-4 h-4" />;
    case "bank":
      return <Building2 className="w-4 h-4" />;
    default:
      return <BanknoteIcon className="w-4 h-4" />;
  }
};

/**
 * Get display name for payout method
 */
const getPayoutMethodName = (method) => {
  switch (method) {
    case "gcash":
      return "GCash";
    case "maya":
      return "Maya";
    case "bank":
      return "Bank Transfer";
    default:
      return method;
  }
};

/**
 * SettlementRequestForm Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Callback when modal closes
 * @param {string} props.branchId - Branch ID requesting settlement
 * @param {string} props.userId - User ID making the request
 * @param {Object} props.pendingTotal - Pending earnings summary from parent
 * @param {function} props.onSuccess - Callback on successful submission
 */
export function SettlementRequestForm({
  isOpen,
  onClose,
  branchId,
  userId,
  pendingTotal,
  onSuccess,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Query branch wallet settings for payout details
  const branchSettings = useQuery(
    api.services.branchWalletSettings.getBranchWalletSettings,
    branchId ? { branch_id: branchId } : "skip"
  );

  // Query for existing pending settlement
  const pendingSettlement = useQuery(
    api.services.settlements.hasPendingSettlement,
    branchId ? { branch_id: branchId } : "skip"
  );

  // Query settlement params for minimum amount (accessible by branch managers)
  const settlementParams = useQuery(api.services.walletConfig.getSettlementParams);

  // Request settlement mutation
  const requestSettlement = useMutation(
    api.services.settlements.requestSettlement
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const minSettlementAmount = settlementParams?.min_settlement_amount ?? 500;
  const hasPayoutDetails =
    branchSettings?.payout_method &&
    branchSettings?.payout_account_number &&
    branchSettings?.payout_account_name;
  const needsBankName =
    branchSettings?.payout_method === "bank" && !branchSettings?.payout_bank_name;

  // Validation checks
  const canSubmit =
    pendingTotal &&
    pendingTotal.totalNet >= minSettlementAmount &&
    hasPayoutDetails &&
    !needsBankName &&
    !pendingSettlement?.hasPending &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await requestSettlement({
        branch_id: branchId,
        requested_by: userId,
      });

      setShowSuccess(true);

      // Call success callback after brief delay
      setTimeout(() => {
        onSuccess?.(result);
        onClose();
      }, 2000);
    } catch (err) {
      console.error("[SETTLEMENT_FORM] Request failed:", err);
      setError(err.data?.message || err.message || "Failed to submit settlement request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading skeleton
  if (branchSettings === undefined || pendingSettlement === undefined) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-md p-6 border border-[#2A2A2A]">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded w-3/4" />
            <div className="h-24 bg-gray-700 rounded" />
            <div className="h-16 bg-gray-700 rounded" />
            <div className="h-12 bg-gray-700 rounded" />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Success state
  if (showSuccess) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-md p-6 border border-green-700 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-900/50 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Settlement Request Submitted
          </h2>
          <p className="text-gray-400 text-sm">
            Your request for {formatCurrency(pendingTotal?.totalNet)} has been submitted.
            You'll be notified once it's approved.
          </p>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-md border border-[#2A2A2A] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-white">Request Settlement</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close settlement request form"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Pending settlement warning */}
          {pendingSettlement?.hasPending && (
            <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)] rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[var(--color-primary)] text-sm font-medium">
                  Settlement Already Pending
                </p>
                <p className="text-[var(--color-primary)]/80 text-xs mt-1">
                  Status: {pendingSettlement.settlement?.status} •{" "}
                  {formatCurrency(pendingSettlement.settlement?.amount)}
                </p>
              </div>
            </div>
          )}

          {/* Amount Summary Card */}
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Settlement Amount</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Receipt className="w-3 h-3" />
                <span>{pendingTotal?.count || 0} transactions</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(pendingTotal?.totalNet)}
            </p>
            <div className="mt-3 pt-3 border-t border-green-800/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Gross Earnings</span>
                <span className="text-gray-400">
                  {formatCurrency(pendingTotal?.totalGross)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Commission Deducted</span>
                <span className="text-[var(--color-primary)]">
                  -{formatCurrency(pendingTotal?.totalCommission)}
                </span>
              </div>
            </div>
          </div>

          {/* Minimum amount warning */}
          {pendingTotal?.totalNet < minSettlementAmount && (
            <div className="bg-red-900/20 border border-red-700 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">
                Minimum settlement amount is {formatCurrency(minSettlementAmount)}.
                You need {formatCurrency(minSettlementAmount - pendingTotal.totalNet)} more.
              </p>
            </div>
          )}

          {/* Payout Details Section */}
          <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Payout Details
            </h3>

            {hasPayoutDetails && !needsBankName ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {getPayoutIcon(branchSettings.payout_method)}
                  <span className="text-white font-medium">
                    {getPayoutMethodName(branchSettings.payout_method)}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>{branchSettings.payout_account_name}</p>
                  <p className="font-mono">{branchSettings.payout_account_number}</p>
                  {branchSettings.payout_bank_name && (
                    <p className="text-xs text-gray-500">
                      {branchSettings.payout_bank_name}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-[var(--color-primary)]">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Payout Details Not Configured</p>
                  <p className="text-xs text-[var(--color-primary)]/80 mt-1">
                    Please contact your Super Admin to configure payout details
                    before requesting settlement.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info text */}
          <p className="text-xs text-gray-500 text-center">
            Your settlement request will be reviewed by the Super Admin.
            You'll receive a notification when it's processed.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A2A] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-[#2A2A2A] text-white font-medium hover:bg-[#333333] transition-colors min-h-[44px]"
            aria-label="Cancel settlement request"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
              canSubmit
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
            aria-label="Submit settlement request"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Settlement"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SettlementRequestForm;
