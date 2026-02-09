/**
 * Earnings Transaction List - Story 22.3, 22.4
 *
 * Displays individual wallet transactions with date filtering and pagination.
 * Branch Managers can see transaction details and filter by date range.
 * Includes CSV export functionality (Story 22.4).
 *
 * Story 22.3 ACs: #1 (transaction list), #2 (sorting/pagination), #3 (date filtering),
 *                 #4 (skeleton loaders), #5 (branch isolation)
 * Story 22.4 ACs: #1 (CSV export), #2 (filtered export), #3 (loading state), #4 (filename)
 */
import React, { useState, useMemo } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Receipt,
  User,
  ArrowRight,
  Loader2,
  Download,
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
 * Format timestamp to readable date
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
const formatDate = (timestamp) => {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format timestamp to readable time
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time string
 */
const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format date for CSV filename (YYYY-MM-DD)
 * @param {string} dateString - Date string from input
 * @returns {string} Formatted date for filename
 */
const formatDateForFilename = (dateString) => {
  if (!dateString) return "";
  return dateString; // Already in YYYY-MM-DD format from date input
};

/**
 * Generate CSV content from earnings data (Story 22.4 AC #1)
 * @param {Array} earnings - Array of earning records
 * @param {Object} totals - Totals object with count, totalGross, totalCommission, totalNet
 * @returns {string} CSV content string
 */
const generateCSV = (earnings, totals) => {
  // CSV Headers
  const headers = [
    "Date",
    "Time",
    "Service",
    "Customer",
    "Gross Amount (₱)",
    "Commission %",
    "Commission Amount (₱)",
    "Net Amount (₱)",
    "Status",
  ];

  // CSV Rows
  const rows = earnings.map((earning) => [
    formatDate(earning.created_at),
    formatTime(earning.created_at),
    `"${earning.service_name.replace(/"/g, '""')}"`, // Escape quotes
    `"${earning.customer_name.replace(/"/g, '""')}"`,
    earning.gross_amount.toFixed(2),
    earning.commission_percent,
    earning.commission_amount.toFixed(2),
    earning.net_amount.toFixed(2),
    earning.status === "pending" ? "Pending" : "Settled",
  ]);

  // Add totals row
  const totalsRow = [
    "TOTALS",
    "",
    "",
    `${totals.count} transactions`,
    totals.totalGross.toFixed(2),
    "",
    totals.totalCommission.toFixed(2),
    totals.totalNet.toFixed(2),
    "",
  ];

  // Combine headers, rows, and totals
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
    "", // Empty row before totals
    totalsRow.join(","),
  ].join("\n");

  return csvContent;
};

/**
 * Download CSV file (Story 22.4 AC #1)
 * @param {string} content - CSV content
 * @param {string} filename - Filename for download
 */
const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Transaction Row Component
 * Displays a single transaction with expandable details
 */
function TransactionRow({ earning }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#1A1A1A] rounded-lg border border-gray-800 overflow-hidden">
      {/* Main row - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[#242424] transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Date column */}
          <div className="flex flex-col min-w-[80px]">
            <span className="text-sm font-medium text-white">
              {formatDate(earning.created_at)}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(earning.created_at)}
            </span>
          </div>

          {/* Service & Customer */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-white truncate">
              {earning.service_name}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
              <User className="w-3 h-3" />
              {earning.customer_name}
            </span>
          </div>
        </div>

        {/* Amount column */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-right">
            <span className="text-sm text-gray-400">
              {formatCurrency(earning.gross_amount)}
            </span>
            <ArrowRight className="w-3 h-3 text-gray-600" />
            <span className="text-sm font-semibold text-green-400">
              {formatCurrency(earning.net_amount)}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 bg-[#151515]">
          <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-500 block">Gross Amount</span>
              <span className="text-white font-medium">
                {formatCurrency(earning.gross_amount)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">
                Commission ({earning.commission_percent}%)
              </span>
              <span className="text-orange-400 font-medium">
                -{formatCurrency(earning.commission_amount)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Net Amount</span>
              <span className="text-green-400 font-medium">
                {formatCurrency(earning.net_amount)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Status</span>
              <span
                className={`font-medium ${
                  earning.status === "pending"
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {earning.status === "pending" ? "Pending" : "Settled"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for transaction rows (AC #4)
 */
function TransactionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-[#1A1A1A] rounded-lg p-4 flex items-center justify-between border border-gray-800"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col gap-1">
              <div className="h-4 w-20 bg-gray-700 rounded" />
              <div className="h-3 w-12 bg-gray-700 rounded" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <div className="h-4 w-32 bg-gray-700 rounded" />
              <div className="h-3 w-24 bg-gray-700 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-gray-700 rounded" />
            <div className="h-4 w-16 bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no transactions
 */
function EmptyState({ hasFilters }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
        <Receipt className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {hasFilters ? "No Transactions Found" : "No Transactions Yet"}
      </h3>
      <p className="text-gray-400 text-sm max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your date range to see more transactions."
          : "When customers pay with their wallet, transactions will appear here."}
      </p>
    </div>
  );
}

/**
 * Date filter input component
 */
function DateFilter({ label, value, onChange, max }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={max}
        className="bg-[#1A1A1A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
      />
    </div>
  );
}

/**
 * Export Button Component (Story 22.4 AC #2)
 * Displays export button with loading state
 */
function ExportButton({ onClick, isExporting, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isExporting}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export CSV
        </>
      )}
    </button>
  );
}

/**
 * Main EarningsTransactionList Component
 *
 * Note: This component should only be used within WalletEarningsDashboard
 * or other protected components that verify user role (branch_admin, admin_staff, super_admin).
 * Branch isolation is enforced at the query level via branch_id filtering.
 *
 * @param {Object} props
 * @param {string} props.branchId - Branch ID to get transactions for
 */
export function EarningsTransactionList({ branchId, branchName = "Branch" }) {
  // Default to last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(
    thirtyDaysAgo.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [limit, setLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const prevLimitRef = React.useRef(limit);

  // Convex client for one-time export queries (AC #2 - fetch ALL filtered data)
  const convex = useConvex();

  // Convert date strings to timestamps for query
  const queryArgs = useMemo(() => {
    const start = startDate
      ? new Date(startDate).setHours(0, 0, 0, 0)
      : undefined;
    // Add 1 day to end date and set to midnight to include full day
    const end = endDate
      ? new Date(endDate).setHours(23, 59, 59, 999)
      : undefined;

    return {
      branch_id: branchId,
      startDate: start,
      endDate: end,
      limit,
    };
  }, [branchId, startDate, endDate, limit]);

  // AC #3 & #5: Query with date filtering and branch isolation
  const data = useQuery(
    api.services.branchEarnings.getBranchEarningsFiltered,
    branchId ? queryArgs : "skip"
  );

  // Track when data loads after limit increase (for "Load More" indicator)
  React.useEffect(() => {
    if (data !== undefined && prevLimitRef.current !== limit) {
      setIsLoadingMore(false);
      prevLimitRef.current = limit;
    }
  }, [data, limit]);

  /**
   * Handle CSV export (Story 22.4 AC #1, #2, #3, #4)
   * Exports ALL transactions in the current date range (not just paginated)
   */
  const handleExport = async () => {
    if (!branchId) return;

    setIsExporting(true);
    setExportError(null);

    try {
      // AC #2: Fetch ALL filtered transactions (high limit for export)
      const start = startDate
        ? new Date(startDate).setHours(0, 0, 0, 0)
        : undefined;
      const end = endDate
        ? new Date(endDate).setHours(23, 59, 59, 999)
        : undefined;

      const exportData = await convex.query(
        api.services.branchEarnings.getBranchEarningsFiltered,
        {
          branch_id: branchId,
          startDate: start,
          endDate: end,
          limit: 10000, // High limit for full export
        }
      );

      if (!exportData?.earnings || exportData.earnings.length === 0) {
        setExportError("No transactions to export");
        return;
      }

      // Generate CSV content from ALL filtered data
      const csvContent = generateCSV(exportData.earnings, exportData.totals);

      // Generate filename with branch and date range (AC #4)
      const sanitizedBranchName = branchName
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase();
      const fromDate = formatDateForFilename(startDate) || "all";
      const toDate = formatDateForFilename(endDate) || "all";
      const filename = `earnings-${sanitizedBranchName}-${fromDate}-to-${toDate}.csv`;

      // Download the file
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error("[EXPORT] Failed to export CSV:", error);
      setExportError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // AC #4: Show skeleton while loading
  if (data === undefined && branchId) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between animate-pulse">
          <div className="flex gap-4">
            <div className="h-10 w-32 bg-gray-700 rounded-lg" />
            <div className="h-10 w-32 bg-gray-700 rounded-lg" />
          </div>
          <div className="h-5 w-40 bg-gray-700 rounded" />
        </div>
        <TransactionSkeleton />
      </div>
    );
  }

  const hasFilters = startDate || endDate;
  const hasTransactions = data?.earnings && data.earnings.length > 0;

  return (
    <div className="space-y-4">
      {/* Header with date filters (AC #3) and export button (Story 22.4) */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div className="flex flex-wrap items-end gap-4">
          <DateFilter
            label="From"
            value={startDate}
            onChange={setStartDate}
            max={endDate || today.toISOString().split("T")[0]}
          />
          <DateFilter
            label="To"
            value={endDate}
            onChange={setEndDate}
            max={today.toISOString().split("T")[0]}
          />
          {/* Export Button (Story 22.4 AC #3) */}
          <div className="flex flex-col gap-1">
            <ExportButton
              onClick={handleExport}
              isExporting={isExporting}
              disabled={!hasTransactions}
            />
            {exportError && (
              <span className="text-xs text-red-400">{exportError}</span>
            )}
          </div>
        </div>

        {/* Filtered totals summary */}
        {data?.totals && hasTransactions && (
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {data.totals.count} transactions •{" "}
              {formatCurrency(data.totals.totalNet)} net
            </span>
          </div>
        )}
      </div>

      {/* Transaction list (AC #1, #2) */}
      {hasTransactions ? (
        <div className="space-y-2">
          {data.earnings.map((earning) => (
            <TransactionRow key={earning._id} earning={earning} />
          ))}

          {/* Load more button (AC #2 - pagination) */}
          {data.hasMore && (
            <button
              onClick={() => {
                setIsLoadingMore(true);
                setLimit((prev) => prev + 50);
              }}
              disabled={isLoadingMore}
              className="w-full py-3 text-sm text-gray-400 hover:text-white bg-[#1A1A1A] hover:bg-[#242424] rounded-lg border border-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                "Load More Transactions"
              )}
            </button>
          )}
        </div>
      ) : (
        <EmptyState hasFilters={hasFilters} />
      )}
    </div>
  );
}

export default EarningsTransactionList;
