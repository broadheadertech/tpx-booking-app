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
  User,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  History,
  Filter,
  Loader2,
  Wallet,
  TrendingUp,
  Ban,
} from "lucide-react";

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================
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
      icon: Wallet,
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

// ============================================================================
// APPROVAL CARD COMPONENT
// ============================================================================
const ApprovalCard = ({ advance, onApprove, onReject, isProcessing }) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) return;
    onReject(advance._id, rejectionReason);
    setShowRejectModal(false);
    setRejectionReason("");
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{advance.barber_name}</h3>
            <p className="text-sm text-gray-400">{advance.barber_email}</p>
          </div>
        </div>
        <StatusBadge status={advance.status} />
      </div>

      {/* Amount */}
      <div className="bg-[#0A0A0A] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Amount Requested</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(advance.amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Max Allowed</p>
            <p className="text-lg font-medium text-gray-300">{formatCurrency(advance.max_allowed)}</p>
          </div>
        </div>
        {/* Percentage indicator */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Utilization</span>
            <span>{Math.round((advance.amount / advance.max_allowed) * 100)}%</span>
          </div>
          <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all"
              style={{ width: `${Math.min((advance.amount / advance.max_allowed) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(advance.requested_at)}</span>
        </div>
        {advance.reason && (
          <div className="col-span-2 flex items-start gap-2 text-gray-400">
            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{advance.reason}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {advance.status === "pending" && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onApprove(advance._id)}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Approve
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 border border-red-600/30 rounded-lg font-medium transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}

      {/* Mark as Paid Out button for approved advances */}
      {advance.status === "approved" && (
        <div className="pt-2">
          <button
            onClick={() => onApprove(advance._id, true)}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            Mark as Paid Out
          </button>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Reject Cash Advance</h3>
            <p className="text-gray-400 text-sm mb-4">
              Please provide a reason for rejecting this request. The barber will be notified.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HISTORY ROW COMPONENT
// ============================================================================
const HistoryRow = ({ advance, onMarkAsPaidOut, isProcessing }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <p className="font-medium text-white text-sm">{advance.barber_name}</p>
          <p className="text-xs text-gray-400">{formatDate(advance.requested_at)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-semibold text-white">{formatCurrency(advance.amount)}</p>
          <StatusBadge status={advance.status} />
        </div>
        {/* Mark as Paid Out button for approved advances */}
        {advance.status === "approved" && onMarkAsPaidOut && (
          <button
            onClick={() => onMarkAsPaidOut(advance._id)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-lg font-medium transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Wallet className="w-3 h-3" />
            )}
            Pay Out
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const CashAdvanceApproval = ({ user, onRefresh }) => {
  const { showAlert } = useAppModal();
  const { user: authUser } = useCurrentUser();
  const currentUser = user || authUser;

  const [activeView, setActiveView] = useState("pending");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [processingId, setProcessingId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Queries
  const pendingAdvances = useQuery(
    api.services.cashAdvance.getPendingAdvances,
    currentUser?.branch_id ? { branch_id: currentUser.branch_id } : "skip"
  );

  const advanceHistory = useQuery(
    api.services.cashAdvance.getBranchAdvanceHistory,
    currentUser?.branch_id
      ? {
          branch_id: currentUser.branch_id,
          status: historyFilter === "all" ? undefined : historyFilter,
        }
      : "skip"
  );

  const pendingCount = useQuery(
    api.services.cashAdvance.getPendingAdvancesCount,
    currentUser?.branch_id ? { branch_id: currentUser.branch_id } : "skip"
  );

  // Mutations
  const approveAdvance = useMutation(api.services.cashAdvance.approveAdvance);
  const rejectAdvance = useMutation(api.services.cashAdvance.rejectAdvance);
  const markAsPaidOut = useMutation(api.services.cashAdvance.markAsPaidOut);

  const handleApprove = async (advanceId, isPaidOut = false) => {
    setProcessingId(advanceId);
    try {
      if (isPaidOut) {
        await markAsPaidOut({
          advance_id: advanceId,
          paid_by: currentUser._id,
        });
      } else {
        await approveAdvance({
          advance_id: advanceId,
          approved_by: currentUser._id,
        });
      }
    } catch (error) {
      console.error("Error processing advance:", error);
      showAlert({ title: 'Advance Error', message: error.message || "Failed to process advance", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (advanceId, reason) => {
    setProcessingId(advanceId);
    try {
      await rejectAdvance({
        advance_id: advanceId,
        rejected_by: currentUser._id,
        rejection_reason: reason,
      });
    } catch (error) {
      console.error("Error rejecting advance:", error);
      showAlert({ title: 'Rejection Error', message: error.message || "Failed to reject advance", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Calculate summary stats
  const totalPending = pendingAdvances?.reduce((sum, a) => sum + a.amount, 0) || 0;
  const approvedThisMonth = advanceHistory?.filter(
    (a) => a.status === "approved" || a.status === "paid_out" || a.status === "repaid"
  ).reduce((sum, a) => sum + a.amount, 0) || 0;

  // Check if user has permission (branch_admin only)
  if (currentUser?.role !== "branch_admin" && currentUser?.role !== "super_admin") {
    return (
      <div className="text-center py-12">
        <Ban className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Access Restricted</h3>
        <p className="text-gray-400">Only Branch Admins can approve cash advances.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[var(--color-primary)]" />
            Cash Advance Requests
          </h2>
          <p className="text-gray-400 text-sm mt-1">Review and manage barber cash advance requests</p>
        </div>

        {/* Toggle History */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-300 hover:bg-[#2A2A2A] transition-colors"
        >
          <History className="w-4 h-4" />
          {showHistory ? "Hide History" : "View History"}
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Requests</p>
              <p className="text-xl font-bold text-white">{pendingCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Pending</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Approved (All Time)</p>
              <p className="text-xl font-bold text-white">{formatCurrency(approvedThisMonth)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          Pending Approval
          {(pendingCount || 0) > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
              {pendingCount}
            </span>
          )}
        </h3>

        {!pendingAdvances ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : pendingAdvances.length === 0 ? (
          <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-400">No pending cash advance requests to review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingAdvances.map((advance) => (
              <ApprovalCard
                key={advance._id}
                advance={advance}
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={processingId === advance._id}
              />
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      {showHistory && (
        <div className="pt-4 border-t border-[#2A2A2A]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Advance History
            </h3>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-300 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid_out">Paid Out</option>
                <option value="repaid">Repaid</option>
              </select>
            </div>
          </div>

          {!advanceHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : advanceHistory.length === 0 ? (
            <div className="text-center py-8 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
              <History className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No advance history found.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {advanceHistory.map((advance) => (
                <HistoryRow
                  key={advance._id}
                  advance={advance}
                  onMarkAsPaidOut={(id) => handleApprove(id, true)}
                  isProcessing={processingId === advance._id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CashAdvanceApproval;
