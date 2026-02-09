/**
 * Branch Wallet Detail Modal - Story 26.2
 *
 * Displays detailed wallet information for a specific branch when clicked from the table.
 * Shows earnings history, settlement history, commission rate, and payout details.
 *
 * AC #4: Branch detail view
 */
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Percent,
  CreditCard,
  Smartphone,
  Receipt,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

/**
 * Format currency as Philippine Peso
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "₱0.00";
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format date for display
 */
const formatDate = (timestamp) => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format datetime for display
 */
const formatDateTime = (timestamp) => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * Get payout method icon
 */
const PayoutIcon = ({ method }) => {
  switch (method) {
    case "gcash":
    case "maya":
      return <Smartphone className="w-4 h-4" />;
    case "bank":
      return <CreditCard className="w-4 h-4" />;
    default:
      return <Wallet className="w-4 h-4" />;
  }
};

/**
 * Get status badge for earnings
 */
const EarningStatusBadge = ({ status }) => {
  switch (status) {
    case "pending":
      return (
        <span className="flex items-center gap-1 text-xs text-orange-400">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    case "settled":
      return (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle2 className="w-3 h-3" />
          Settled
        </span>
      );
    default:
      return (
        <span className="text-xs text-gray-500">{status}</span>
      );
  }
};

/**
 * Get status badge for settlements
 */
const SettlementStatusBadge = ({ status }) => {
  switch (status) {
    case "pending":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-900/50 text-orange-400">
          Pending
        </span>
      );
    case "approved":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/50 text-blue-400">
          Approved
        </span>
      );
    case "processing":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-900/50 text-purple-400">
          Processing
        </span>
      );
    case "completed":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/50 text-green-400">
          Completed
        </span>
      );
    case "rejected":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-400">
          Rejected
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-400">
          {status}
        </span>
      );
  }
};

/**
 * Skeleton loader for modal content
 */
function ModalSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-48" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-gray-700 rounded-xl" />
        <div className="h-24 bg-gray-700 rounded-xl" />
      </div>
      <div className="h-48 bg-gray-700 rounded-xl" />
      <div className="h-48 bg-gray-700 rounded-xl" />
    </div>
  );
}

/**
 * BranchWalletDetailModal Component
 */
export function BranchWalletDetailModal({ branchId, isOpen, onClose }) {
  // Query branch detail
  const branchDetail = useQuery(
    api.services.walletAnalytics.getBranchWalletDetail,
    branchId ? { branchId } : "skip"
  );

  // Escape key handler
  useEffect(() => {
    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLoading = branchDetail === undefined;
  const hasError = branchDetail === null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#2A2A2A] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-white">
              {isLoading ? "Loading..." : branchDetail?.branch?.name || "Branch Details"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close branch detail modal"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <ModalSkeleton />
          ) : hasError ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Branch Not Found
              </h3>
              <p className="text-gray-400 text-sm">
                Unable to load branch details. The branch may have been deleted.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0F0F0F] rounded-xl p-3 border border-[#2A2A2A]">
                  <p className="text-xs text-gray-500 uppercase mb-1">Total Earnings</p>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(branchDetail.summary.totalEarnings)}
                  </p>
                </div>
                <div className="bg-[#0F0F0F] rounded-xl p-3 border border-[#2A2A2A]">
                  <p className="text-xs text-gray-500 uppercase mb-1">Pending</p>
                  <p className="text-lg font-bold text-orange-400">
                    {formatCurrency(branchDetail.summary.pendingAmount)}
                  </p>
                </div>
                <div className="bg-[#0F0F0F] rounded-xl p-3 border border-[#2A2A2A]">
                  <p className="text-xs text-gray-500 uppercase mb-1">Settled</p>
                  <p className="text-lg font-bold text-green-400">
                    {formatCurrency(branchDetail.summary.settledAmount)}
                  </p>
                </div>
                <div className="bg-[#0F0F0F] rounded-xl p-3 border border-[#2A2A2A]">
                  <p className="text-xs text-gray-500 uppercase mb-1">Commission</p>
                  <p className="text-lg font-bold text-blue-400">
                    {formatCurrency(branchDetail.summary.totalCommission)}
                  </p>
                </div>
              </div>

              {/* Commission Rate & Payout Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Commission Rate */}
                <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-3">
                    <Percent className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-white">Commission Rate</h3>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {branchDetail.commissionRate}%
                  </p>
                  {branchDetail.isCustomCommission ? (
                    <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded mt-2 inline-block">
                      Custom Override
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 mt-2 inline-block">
                      Using global rate
                    </span>
                  )}
                </div>

                {/* Payout Details */}
                <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="w-4 h-4 text-green-500" />
                    <h3 className="text-sm font-semibold text-white">Payout Details</h3>
                  </div>
                  {branchDetail.payoutDetails ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <PayoutIcon method={branchDetail.payoutDetails.method} />
                        <span className="text-white font-medium capitalize">
                          {branchDetail.payoutDetails.method === "gcash" ? "GCash" :
                           branchDetail.payoutDetails.method === "maya" ? "Maya" :
                           branchDetail.payoutDetails.method === "bank" ? "Bank Transfer" :
                           branchDetail.payoutDetails.method}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {branchDetail.payoutDetails.accountName}
                      </p>
                      <p className="text-sm text-gray-500 font-mono">
                        {branchDetail.payoutDetails.accountNumber}
                      </p>
                      {branchDetail.payoutDetails.bankName && (
                        <p className="text-xs text-gray-600">
                          {branchDetail.payoutDetails.bankName}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Not configured</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Earnings */}
              <div className="bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] overflow-hidden">
                <div className="p-3 border-b border-[#2A2A2A]">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-purple-500" />
                    Recent Earnings
                    <span className="text-xs text-gray-500 font-normal">
                      ({branchDetail.summary.transactionCount} total)
                    </span>
                  </h3>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {branchDetail.recentEarnings.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No earnings recorded yet
                    </div>
                  ) : (
                    <div className="divide-y divide-[#2A2A2A]">
                      {branchDetail.recentEarnings.map((earning) => (
                        <div key={earning.id} className="p-3 hover:bg-[#1A1A1A]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white font-medium">
                                {earning.serviceName || "Service"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDateTime(earning.createdAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm">
                                <span className="text-gray-400">
                                  {formatCurrency(earning.grossAmount)}
                                </span>
                                <ArrowRight className="w-3 h-3 text-gray-600" />
                                <span className="text-green-400 font-medium">
                                  {formatCurrency(earning.netAmount)}
                                </span>
                              </div>
                              <EarningStatusBadge status={earning.status} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Settlements */}
              <div className="bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] overflow-hidden">
                <div className="p-3 border-b border-[#2A2A2A]">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-green-500" />
                    Recent Settlements
                    <span className="text-xs text-gray-500 font-normal">
                      ({branchDetail.summary.settlementCount} total)
                    </span>
                  </h3>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {branchDetail.recentSettlements.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No settlements yet
                    </div>
                  ) : (
                    <div className="divide-y divide-[#2A2A2A]">
                      {branchDetail.recentSettlements.map((settlement) => (
                        <div key={settlement.id} className="p-3 hover:bg-[#1A1A1A]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-white font-medium">
                                {formatCurrency(settlement.amount)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Requested: {formatDate(settlement.createdAt)}
                              </p>
                              {settlement.completedAt && (
                                <p className="text-xs text-gray-600">
                                  Completed: {formatDate(settlement.completedAt)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <SettlementStatusBadge status={settlement.status} />
                              {settlement.transferReference && (
                                <p className="text-xs text-gray-500 mt-1 font-mono">
                                  Ref: {settlement.transferReference}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A2A] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[#2A2A2A] text-white font-medium hover:bg-[#333333] transition-colors min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BranchWalletDetailModal;
