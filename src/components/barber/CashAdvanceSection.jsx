import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useAppModal } from "../../context/AppModalContext";
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Wallet,
  TrendingUp,
  Calendar,
  X,
  Info,
  Banknote,
  History,
} from "lucide-react";

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Status badge component
const StatusBadge = ({ status }) => {
  const config = {
    pending: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      icon: Clock,
      label: "Pending",
    },
    approved: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      icon: CheckCircle,
      label: "Approved",
    },
    rejected: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      icon: XCircle,
      label: "Rejected",
    },
    paid_out: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      icon: Banknote,
      label: "Paid Out",
    },
    repaid: {
      bg: "bg-gray-500/20",
      text: "text-gray-400",
      icon: CheckCircle,
      label: "Repaid",
    },
  };

  const { bg, text, icon: Icon, label } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

// Request Modal
const RequestModal = ({ isOpen, onClose, maxAmount, userId, branchId }) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [repaymentTerms, setRepaymentTerms] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const requestAdvance = useMutation(api.services.cashAdvance.requestAdvance);

  // Calculate amount per installment
  const numAmount = parseFloat(amount) || 0;
  const amountPerInstallment = numAmount > 0 ? Math.ceil(numAmount / repaymentTerms) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isNaN(numAmount) || numAmount <= 0) {
        setError("Please enter a valid amount");
        setIsSubmitting(false);
        return;
      }

      if (numAmount > maxAmount) {
        setError(`Amount cannot exceed ${formatCurrency(maxAmount)}`);
        setIsSubmitting(false);
        return;
      }

      await requestAdvance({
        barber_id: userId,
        branch_id: branchId,
        amount: numAmount,
        reason: reason.trim() || undefined,
        repayment_terms: repaymentTerms,
      });

      onClose();
      setAmount("");
      setReason("");
      setRepaymentTerms(1);
    } catch (err) {
      setError(err.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] sticky top-0 bg-[#1A1A1A] z-10">
          <h2 className="text-lg font-bold text-white">Request Cash Advance</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Max Amount Info */}
          <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#2A2A2A]">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400">
                  Maximum available amount based on your average 2-week earnings:
                </p>
                <p className="text-xl font-bold text-white mt-1">
                  {formatCurrency(maxAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Amount to Request
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                ₱
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                max={maxAmount}
                className="w-full h-12 pl-8 pr-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Repayment Terms Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Repayment Plan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((terms) => (
                <button
                  key={terms}
                  type="button"
                  onClick={() => setRepaymentTerms(terms)}
                  className={`p-3 rounded-xl border transition-all ${
                    repaymentTerms === terms
                      ? "bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "bg-[#0D0D0D] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]"
                  }`}
                >
                  <p className="text-lg font-bold">{terms}x</p>
                  <p className="text-xs mt-0.5">
                    {terms === 1 ? "Full" : `${terms} pay periods`}
                  </p>
                </button>
              ))}
            </div>
            {/* Show per-installment amount */}
            {numAmount > 0 && (
              <div className="mt-3 p-3 bg-[#0D0D0D] rounded-xl border border-[#2A2A2A]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Per payroll deduction:</span>
                  <span className="text-lg font-bold text-[var(--color-primary)]">
                    {formatCurrency(amountPerInstallment)}
                  </span>
                </div>
                {repaymentTerms > 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Split into {repaymentTerms} payroll periods
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need this advance?"
              rows={3}
              className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Repayment Info */}
          <div className="flex items-start gap-2 p-3 bg-[#0D0D0D] rounded-xl">
            <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              If approved, {repaymentTerms === 1
                ? "the full amount will be deducted from your next payroll."
                : `${formatCurrency(amountPerInstallment)} will be deducted from each of your next ${repaymentTerms} payrolls.`}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className="w-full py-3 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:bg-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Request
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Main Component
const CashAdvanceSection = () => {
  const { showConfirm } = useAppModal();
  const { user } = useCurrentUser();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Get current advance status
  const activeAdvance = useQuery(
    api.services.cashAdvance.getBarberAdvanceStatus,
    user?._id ? { barber_id: user._id } : "skip"
  );

  // Get max allowed amount
  const maxAdvanceData = useQuery(
    api.services.cashAdvance.getMaxAdvanceAmount,
    user?._id && user?.branch_id
      ? { barber_id: user._id, branch_id: user.branch_id }
      : "skip"
  );

  // Get advance history
  const advanceHistory = useQuery(
    api.services.cashAdvance.getBarberAdvanceHistory,
    user?._id ? { barber_id: user._id } : "skip"
  );

  // Cancel advance mutation
  const cancelAdvance = useMutation(api.services.cashAdvance.cancelAdvance);

  const handleCancelAdvance = async () => {
    if (!activeAdvance || activeAdvance.status !== "pending") return;
    const confirmed = await showConfirm({ title: 'Cancel Request', message: 'Are you sure you want to cancel this request?', type: 'warning' });
    if (!confirmed) return;

    try {
      await cancelAdvance({
        advance_id: activeAdvance._id,
        barber_id: user._id,
      });
    } catch (error) {
      console.error("Failed to cancel advance:", error);
    }
  };

  const hasActiveAdvance = activeAdvance && ["pending", "approved", "paid_out"].includes(activeAdvance.status);
  const canRequest = !hasActiveAdvance && maxAdvanceData?.maxAllowed >= 500;

  return (
    <div className="px-4 pb-6 space-y-4">
      {/* Header Card */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Cash Advance</h2>
            <p className="text-sm text-gray-500">Request emergency funds</p>
          </div>
        </div>

        {/* Available Amount */}
        <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#2A2A2A]">
          <p className="text-xs text-gray-500 mb-1">Maximum Available</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(maxAdvanceData?.maxAllowed || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            50% of your avg. 2-week earnings ({formatCurrency(maxAdvanceData?.avgTwoWeekEarnings || 0)})
          </p>
        </div>
      </div>

      {/* Active Advance Card */}
      {activeAdvance && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--color-primary)]" />
              Current Request
            </h3>
            <StatusBadge status={activeAdvance.status} />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="text-xl font-bold text-white">
                {formatCurrency(activeAdvance.amount)}
              </span>
            </div>

            {/* Installment Progress */}
            {activeAdvance.repayment_terms > 1 && (
              <div className="bg-[#0D0D0D] rounded-xl p-3 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Repayment Progress</span>
                  <span className="text-xs text-[var(--color-primary)] font-medium">
                    {activeAdvance.installments_paid || 0}/{activeAdvance.repayment_terms} installments
                  </span>
                </div>
                <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                    style={{ width: `${((activeAdvance.installments_paid || 0) / activeAdvance.repayment_terms) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    Paid: {formatCurrency(activeAdvance.total_repaid || 0)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Remaining: {formatCurrency(activeAdvance.amount - (activeAdvance.total_repaid || 0))}
                  </span>
                </div>
                {activeAdvance.status === "paid_out" && (activeAdvance.installments_paid || 0) < activeAdvance.repayment_terms && (
                  <div className="mt-2 text-xs text-gray-400">
                    Next deduction: {formatCurrency(activeAdvance.amount_per_installment || Math.ceil(activeAdvance.amount / activeAdvance.repayment_terms))}
                  </div>
                )}
              </div>
            )}

            {/* Single payment amount display */}
            {(!activeAdvance.repayment_terms || activeAdvance.repayment_terms === 1) && activeAdvance.status === "paid_out" && (
              <div className="bg-[#0D0D0D] rounded-xl p-3 border border-[#2A2A2A]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Payroll Deduction</span>
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(activeAdvance.amount)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Requested</span>
              <span className="text-sm text-gray-300">
                {formatDate(activeAdvance.requested_at)}
              </span>
            </div>

            {activeAdvance.reason && (
              <div className="bg-[#0D0D0D] rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Reason</p>
                <p className="text-sm text-gray-300">{activeAdvance.reason}</p>
              </div>
            )}

            {/* Status-specific messages */}
            {activeAdvance.status === "pending" && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-xl">
                <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-400">
                  Waiting for approval from your branch admin
                </p>
              </div>
            )}

            {activeAdvance.status === "approved" && (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-xl">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-400">
                  Approved! Please collect your cash from the branch admin.
                </p>
              </div>
            )}

            {activeAdvance.status === "paid_out" && (
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-xl">
                <Banknote className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-400">
                  Cash received. This will be deducted from your next payroll.
                </p>
              </div>
            )}

            {activeAdvance.status === "rejected" && activeAdvance.rejection_reason && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-xl">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-red-400 font-medium">Rejected</p>
                  <p className="text-xs text-red-400/70 mt-1">
                    {activeAdvance.rejection_reason}
                  </p>
                </div>
              </div>
            )}

            {/* Cancel Button (only for pending) */}
            {activeAdvance.status === "pending" && (
              <button
                onClick={handleCancelAdvance}
                className="w-full py-3 bg-[#2A2A2A] text-gray-400 font-medium rounded-xl hover:bg-[#333333] transition-colors"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>
      )}

      {/* Request Button */}
      {canRequest && (
        <button
          onClick={() => setShowRequestModal(true)}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:bg-[var(--color-accent)] transition-colors flex items-center justify-center gap-2"
        >
          <DollarSign className="w-5 h-5" />
          Request Cash Advance
        </button>
      )}

      {/* Cannot Request Messages */}
      {!canRequest && !hasActiveAdvance && (
        <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-400">
                You need more earnings history to request a cash advance.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Complete more bookings to increase your available amount.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#222222] transition-colors"
        >
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--color-primary)]" />
            Advance History
          </h3>
          <ArrowRight
            className={`w-4 h-4 text-gray-400 transition-transform ${
              showHistory ? "rotate-90" : ""
            }`}
          />
        </button>

        {showHistory && (
          <div className="border-t border-[#2A2A2A] divide-y divide-[#2A2A2A]">
            {!advanceHistory || advanceHistory.length === 0 ? (
              <div className="p-8 text-center">
                <Wallet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No advance history</p>
              </div>
            ) : (
              advanceHistory.map((advance) => (
                <div key={advance._id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(advance.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(advance.requested_at)}
                    </p>
                  </div>
                  <StatusBadge status={advance.status} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Request Modal */}
      <RequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        maxAmount={maxAdvanceData?.maxAllowed || 0}
        userId={user?._id}
        branchId={user?.branch_id}
      />
    </div>
  );
};

export default CashAdvanceSection;
