/**
 * Settlement History List - Story 25.5
 *
 * Displays branch settlement history with status/date filters.
 * Allows viewing details and downloading PDF receipts.
 *
 * ACs: #1 (list settlements), #2 (show date/amount/status),
 *      #3 (filters), #4 (detail view), #5 (download receipt)
 */
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { createPortal } from "react-dom";
import {
  FileText,
  Download,
  X,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Receipt,
  CreditCard,
  FileDown,
} from "lucide-react";
import jsPDF from "jspdf";

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
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format datetime for display
 */
const formatDateTime = (timestamp) => {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Status badge colors and icons
 */
const statusConfig = {
  pending: {
    bg: "bg-yellow-900/50",
    text: "text-yellow-400",
    border: "border-yellow-700",
    icon: Clock,
    label: "Pending",
  },
  approved: {
    bg: "bg-blue-900/50",
    text: "text-blue-400",
    border: "border-blue-700",
    icon: CheckCircle2,
    label: "Approved",
  },
  processing: {
    bg: "bg-purple-900/50",
    text: "text-purple-400",
    border: "border-purple-700",
    icon: AlertCircle,
    label: "Processing",
  },
  completed: {
    bg: "bg-green-900/50",
    text: "text-green-400",
    border: "border-green-700",
    icon: CheckCircle2,
    label: "Completed",
  },
  rejected: {
    bg: "bg-red-900/50",
    text: "text-red-400",
    border: "border-red-700",
    icon: XCircle,
    label: "Rejected",
  },
};

/**
 * Status Badge Component
 */
function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

/**
 * Skeleton loader for settlement list
 */
function SettlementListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-gray-700 rounded" />
              <div className="h-5 w-32 bg-gray-700 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-700 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no settlements
 */
function EmptyState({ hasFilters }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {hasFilters ? "No Matching Settlements" : "No Settlement History"}
      </h3>
      <p className="text-gray-400 text-sm max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your filters to see more results."
          : "Your settlement requests will appear here once you request a settlement."}
      </p>
    </div>
  );
}

/**
 * Settlement Detail Modal - AC #4
 */
function SettlementDetailModal({ settlementId, onClose, branchName }) {
  const settlement = useQuery(
    api.services.settlements.getSettlementWithEarnings,
    settlementId ? { settlement_id: settlementId } : "skip"
  );

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  if (!settlementId) return null;

  // Generate PDF receipt - AC #5
  const handleDownloadReceipt = async () => {
    if (!settlement || settlement.status !== "completed") return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 45, "F");

      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("Settlement Receipt", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      doc.text(`Receipt Date: ${formatDate(Date.now())}`, pageWidth / 2, 30, {
        align: "center",
      });

      // Branch Info Section
      let yPos = 55;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Branch Information", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Branch Name: ${branchName || settlement.branch_name}`, 20, yPos);
      yPos += 6;
      doc.text(`Settlement ID: ${settlement._id}`, 20, yPos);
      yPos += 6;
      doc.text(`Reference: ${settlement.transfer_reference || "N/A"}`, 20, yPos);
      yPos += 12;

      // Settlement Details
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Settlement Details", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Date Requested: ${formatDateTime(settlement.created_at)}`, 20, yPos);
      yPos += 6;
      doc.text(`Date Completed: ${formatDateTime(settlement.completed_at)}`, 20, yPos);
      yPos += 6;
      doc.text(`Number of Transactions: ${settlement.earnings_count || 0}`, 20, yPos);
      yPos += 12;

      // Payout Details
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Payout Details", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Method: ${settlement.payout_method?.toUpperCase() || "N/A"}`, 20, yPos);
      yPos += 6;
      doc.text(`Account Name: ${settlement.payout_account_name || "N/A"}`, 20, yPos);
      yPos += 6;
      doc.text(`Account Number: ${settlement.payout_account_number || "N/A"}`, 20, yPos);
      yPos += 6;
      if (settlement.payout_bank_name) {
        doc.text(`Bank: ${settlement.payout_bank_name}`, 20, yPos);
        yPos += 6;
      }
      yPos += 6;

      // Amount Breakdown
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Amount Breakdown", 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Gross Amount: ${formatCurrency(settlement.breakdown?.gross || 0)}`, 20, yPos);
      yPos += 6;
      doc.text(`Commission: ${formatCurrency(settlement.breakdown?.commission || 0)}`, 20, yPos);
      yPos += 6;

      doc.setFontSize(12);
      doc.setTextColor(34, 139, 34);
      doc.text(`Net Amount: ${formatCurrency(settlement.amount)}`, 20, yPos);
      yPos += 12;

      // Transactions List (if space allows)
      if (settlement.earnings && settlement.earnings.length > 0 && yPos < 220) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Included Transactions", 20, yPos);
        yPos += 8;

        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);

        const maxTransactions = Math.min(settlement.earnings.length, 10);
        for (let i = 0; i < maxTransactions && yPos < 270; i++) {
          const earning = settlement.earnings[i];
          doc.text(
            `${formatDate(earning.created_at)} - ${earning.service_name || "Service"} - ${formatCurrency(earning.net_amount)}`,
            20,
            yPos
          );
          yPos += 5;
        }

        if (settlement.earnings.length > maxTransactions) {
          doc.text(`... and ${settlement.earnings.length - maxTransactions} more transactions`, 20, yPos);
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "This is an official settlement receipt. Please keep for your records.",
        pageWidth / 2,
        285,
        { align: "center" }
      );

      // Save PDF
      const filename = `settlement-receipt-${settlement._id.slice(-8)}-${formatDate(settlement.completed_at).replace(/[, ]/g, "-")}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Error generating receipt:", error);
      setDownloadError("Failed to generate receipt. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Build timeline events with "who" information (AC #4)
  const timelineEvents = [];
  if (settlement?.created_at) {
    timelineEvents.push({
      date: settlement.created_at,
      status: "pending",
      label: "Requested",
      by: settlement.requester_name,
    });
  }
  if (settlement?.approved_at) {
    timelineEvents.push({
      date: settlement.approved_at,
      status: "approved",
      label: "Approved",
      by: settlement.approver_name,
    });
  }
  if (settlement?.processing_started_at) {
    timelineEvents.push({
      date: settlement.processing_started_at,
      status: "processing",
      label: "Processing Started",
      by: settlement.processor_name,
    });
  }
  if (settlement?.completed_at) {
    timelineEvents.push({
      date: settlement.completed_at,
      status: "completed",
      label: "Completed",
      by: settlement.completer_name,
    });
  }
  if (settlement?.rejected_at) {
    timelineEvents.push({
      date: settlement.rejected_at,
      status: "rejected",
      label: "Rejected",
      by: settlement.rejecter_name,
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-[#1A1A1A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-500" />
            Settlement Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {settlement === undefined ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-700 rounded" />
            </div>
          ) : settlement ? (
            <>
              {/* Status and Amount */}
              <div className="flex items-start justify-between">
                <div>
                  <StatusBadge status={settlement.status} />
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatCurrency(settlement.amount)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {settlement.earnings_count} transactions
                  </p>
                </div>
                {settlement.status === "completed" && (
                  <button
                    onClick={handleDownloadReceipt}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors min-h-[44px]"
                  >
                    {isDownloading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    Download Receipt
                  </button>
                )}
              </div>

              {/* Download Error Message */}
              {downloadError && (
                <div className="bg-red-900/20 border border-red-700 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{downloadError}</p>
                </div>
              )}

              {/* Transfer Reference (for completed) */}
              {settlement.transfer_reference && (
                <div className="bg-green-900/20 border border-green-700 rounded-xl p-4">
                  <p className="text-sm text-green-400 font-medium">
                    Transfer Reference
                  </p>
                  <p className="text-white font-mono mt-1">
                    {settlement.transfer_reference}
                  </p>
                </div>
              )}

              {/* Rejection Reason (for rejected) */}
              {settlement.rejection_reason && (
                <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
                  <p className="text-sm text-red-400 font-medium">
                    Rejection Reason
                  </p>
                  <p className="text-gray-300 mt-1">
                    {settlement.rejection_reason}
                  </p>
                </div>
              )}

              {/* Payout Details */}
              <div className="bg-[#0A0A0A] rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payout Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Method</p>
                    <p className="text-white capitalize">
                      {settlement.payout_method || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account Name</p>
                    <p className="text-white">
                      {settlement.payout_account_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account Number</p>
                    <p className="text-white font-mono">
                      {settlement.payout_account_number || "-"}
                    </p>
                  </div>
                  {settlement.payout_bank_name && (
                    <div>
                      <p className="text-gray-500">Bank</p>
                      <p className="text-white">{settlement.payout_bank_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Breakdown */}
              {settlement.breakdown && (
                <div className="bg-[#0A0A0A] rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">
                    Amount Breakdown
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gross Amount</span>
                      <span className="text-white">
                        {formatCurrency(settlement.breakdown.gross)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Commission</span>
                      <span className="text-orange-400">
                        -{formatCurrency(settlement.breakdown.commission)}
                      </span>
                    </div>
                    <div className="h-px bg-gray-700 my-2" />
                    <div className="flex justify-between font-medium">
                      <span className="text-white">Net Amount</span>
                      <span className="text-green-400">
                        {formatCurrency(settlement.breakdown.net)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {timelineEvents.length > 0 && (
                <div className="bg-[#0A0A0A] rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timeline
                  </h3>
                  <div className="space-y-4">
                    {timelineEvents.map((event, index) => {
                      const config = statusConfig[event.status];
                      const Icon = config.icon;
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div
                            className={`p-1.5 rounded-full ${config.bg} ${config.border} border`}
                          >
                            <Icon className={`w-3 h-3 ${config.text}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-white">{event.label}</p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(event.date)}
                              {event.by && ` by ${event.by}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transactions List */}
              {settlement.earnings && settlement.earnings.length > 0 && (
                <div className="bg-[#0A0A0A] rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Included Transactions ({settlement.earnings.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {settlement.earnings.map((earning) => (
                      <div
                        key={earning._id}
                        className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                      >
                        <div>
                          <p className="text-sm text-white">
                            {earning.service_name || "Service"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(earning.created_at)} •{" "}
                            {earning.customer_name}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-green-400">
                          {formatCurrency(earning.net_amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-center py-8">
              Settlement not found
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Settlement Card Component
 */
function SettlementCard({ settlement, onViewDetails }) {
  // Quick action to view details (for download, user will use modal)
  const handleQuickView = (e) => {
    e.stopPropagation();
    onViewDetails(settlement._id);
  };

  return (
    <div
      className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer"
      onClick={() => onViewDetails(settlement._id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-400">{formatDate(settlement.created_at)}</p>
          <p className="text-xl font-bold text-white mt-1">
            {formatCurrency(settlement.amount)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {settlement.earnings_count} transactions
          </p>
          {settlement.completed_at && (
            <p className="text-xs text-green-400 mt-1">
              Completed: {formatDate(settlement.completed_at)}
            </p>
          )}
          {settlement.rejected_at && (
            <p className="text-xs text-red-400 mt-1">
              Rejected: {formatDate(settlement.rejected_at)}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={settlement.status} />
          <div className="flex items-center gap-1">
            {settlement.status === "completed" && (
              <button
                onClick={handleQuickView}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="View details and download receipt"
              >
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main SettlementHistoryList Component
 */
export function SettlementHistoryList({ branchId, branchName }) {
  // Filter state
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Detail modal state
  const [selectedSettlementId, setSelectedSettlementId] = useState(null);

  // Convert date strings to timestamps for query
  const startTimestamp = startDate
    ? new Date(startDate).setHours(0, 0, 0, 0)
    : undefined;
  const endTimestamp = endDate
    ? new Date(endDate).setHours(23, 59, 59, 999)
    : undefined;

  // Query with filters - AC #1, #3
  const settlements = useQuery(
    api.services.settlements.getBranchSettlementHistory,
    branchId
      ? {
          branch_id: branchId,
          status: statusFilter || undefined,
          startDate: startTimestamp,
          endDate: endTimestamp,
          limit: 50,
        }
      : "skip"
  );

  const hasFilters = statusFilter || startDate || endDate;

  const clearFilters = () => {
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
  };

  // Handle no branch ID
  if (!branchId) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          No Branch Assigned
        </h3>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Please contact your administrator to assign you to a branch.
        </p>
      </div>
    );
  }

  // Loading state - skeleton
  if (settlements === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-gray-700 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-gray-700 rounded-xl animate-pulse" />
        </div>
        <SettlementListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters - AC #3 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2 pr-10 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[44px]"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[44px]"
              placeholder="Start date"
            />
          </div>
          <span className="text-gray-500">to</span>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[44px]"
              placeholder="End date"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Settlements List - AC #1, #2 */}
      {!settlements || settlements.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="space-y-3">
          {settlements.map((settlement) => (
            <SettlementCard
              key={settlement._id}
              settlement={settlement}
              onViewDetails={setSelectedSettlementId}
            />
          ))}
        </div>
      )}

      {/* Detail Modal - AC #4 */}
      {selectedSettlementId && (
        <SettlementDetailModal
          settlementId={selectedSettlementId}
          onClose={() => setSelectedSettlementId(null)}
          branchName={branchName}
        />
      )}
    </div>
  );
}

export default SettlementHistoryList;
