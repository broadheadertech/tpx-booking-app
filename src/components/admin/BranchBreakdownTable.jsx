/**
 * Branch Breakdown Table - Story 26.2
 *
 * Displays per-branch wallet performance metrics in a sortable, filterable table.
 * Includes CSV export and click-to-detail functionality.
 *
 * ACs: #1 (table columns), #2 (sorting), #3 (search/filter), #5 (export)
 */
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  ChevronRight,
  AlertCircle,
  Wallet,
} from "lucide-react";
import BranchWalletDetailModal from "./BranchWalletDetailModal";

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
 * Skeleton row for loading state
 */
function TableRowSkeleton() {
  return (
    <tr className="border-b border-[#2A2A2A]">
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-32 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-16 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-16 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-16 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-20 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-20 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-20 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-24 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-700 rounded w-8 animate-pulse" />
      </td>
    </tr>
  );
}

/**
 * Sort icon component
 */
function SortIcon({ column, sortColumn, sortDirection }) {
  if (sortColumn !== column) {
    return <ArrowUpDown className="w-4 h-4 text-gray-500" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="w-4 h-4 text-blue-400" />
  ) : (
    <ArrowDown className="w-4 h-4 text-blue-400" />
  );
}

/**
 * BranchBreakdownTable Component
 */
export function BranchBreakdownTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("totalEarnings");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Query branch summaries
  const branchData = useQuery(api.services.walletAnalytics.getBranchWalletSummaries);

  // Handle sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Filter and sort branches
  const filteredBranches = useMemo(() => {
    if (!branchData?.branches) return [];

    let branches = [...branchData.branches];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      branches = branches.filter((b) =>
        b.branchName.toLowerCase().includes(query)
      );
    }

    // Sort
    branches.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null dates
      if (sortColumn === "lastSettlementDate") {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }

      // Handle strings
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return branches;
  }, [branchData, searchQuery, sortColumn, sortDirection]);

  // Export to CSV
  const handleExport = () => {
    if (!branchData?.branches?.length) return;

    setIsExporting(true);

    try {
      // Build CSV content
      const headers = [
        "Branch Name",
        "Wallet Balance",
        "Total Top-Ups",
        "On Hold",
        "Total Earnings",
        "Pending Amount",
        "Settled Amount",
        "Commission",
        "Transactions",
        "Last Settlement",
      ];

      const rows = filteredBranches.map((b) => [
        b.branchName,
        formatCurrency(b.walletBalance || 0),
        formatCurrency(b.walletTotalToppedUp || 0),
        formatCurrency(b.walletHeldBalance || 0),
        formatCurrency(b.totalEarnings),
        formatCurrency(b.pendingAmount),
        formatCurrency(b.settledAmount),
        formatCurrency(b.totalCommission),
        b.transactionCount,
        formatDate(b.lastSettlementDate),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `branch-wallet-breakdown-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // Loading state
  const isLoading = branchData === undefined;

  // Error state
  const hasError = branchData === null;

  // Empty state
  const isEmpty = !isLoading && !hasError && (!branchData?.branches?.length);

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A2A]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-white">
              Branch Wallet Performance
            </h2>
            {!isLoading && (
              <span className="text-sm text-gray-500">
                ({filteredBranches.length} branches)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-primary)] w-48"
                aria-label="Search branches"
              />
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={isExporting || isEmpty}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] ${
                isExporting || isEmpty
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
              aria-label="Export to CSV"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0F0F0F] text-left">
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort("branchName")}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Branch
                  <SortIcon
                    column="branchName"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort("walletBalance")}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Balance
                  <SortIcon
                    column="walletBalance"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort("walletTotalToppedUp")}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Top-Ups
                  <SortIcon
                    column="walletTotalToppedUp"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort("walletHeldBalance")}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  On Hold
                  <SortIcon
                    column="walletHeldBalance"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort("totalEarnings")}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Total Earnings
                  <SortIcon
                    column="totalEarnings"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort("pendingAmount")}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Pending
                  <SortIcon
                    column="pendingAmount"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort("settledAmount")}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Settled
                  <SortIcon
                    column="settledAmount"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort("lastSettlementDate")}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Last Settlement
                  <SortIcon
                    column="lastSettlementDate"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeletons
              <>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </>
            ) : hasError ? (
              // Error state
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-gray-400">Failed to load branch data</p>
                    <p className="text-xs text-gray-500">
                      Please try refreshing the page
                    </p>
                  </div>
                </td>
              </tr>
            ) : isEmpty ? (
              // Empty state
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 text-gray-600" />
                    <p className="text-gray-400">No branches with wallet activity found</p>
                    <p className="text-xs text-gray-500">
                      Branches will appear here once they process wallet payments
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredBranches.length === 0 ? (
              // No results from search
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center">
                  <p className="text-gray-400">No branches match "{searchQuery}"</p>
                </td>
              </tr>
            ) : (
              // Data rows
              filteredBranches.map((branch) => (
                <tr
                  key={branch.branchId}
                  onClick={() => setSelectedBranchId(branch.branchId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedBranchId(branch.branchId);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${branch.branchName}`}
                  className="border-b border-[#2A2A2A] hover:bg-[#252525] cursor-pointer transition-colors focus:outline-none focus:bg-[#252525]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {branch.branchName}
                      </span>
                      {branch.pendingSettlements > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-orange-900/50 text-orange-400 rounded-full">
                          {branch.pendingSettlements} pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={branch.walletBalance > 0 ? "text-green-400 font-medium" : "text-gray-500"}>
                      {formatCurrency(branch.walletBalance || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={branch.walletTotalToppedUp > 0 ? "text-blue-400 font-medium" : "text-gray-500"}>
                      {formatCurrency(branch.walletTotalToppedUp || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={branch.walletHeldBalance > 0 ? "text-yellow-400 font-medium" : "text-gray-500"}>
                      {formatCurrency(branch.walletHeldBalance || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">
                      {formatCurrency(branch.totalEarnings)}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({branch.transactionCount} txns)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={branch.pendingAmount > 0 ? "text-orange-400" : "text-gray-500"}>
                      {formatCurrency(branch.pendingAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-green-400">
                      {formatCurrency(branch.settledAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400">
                      {formatDate(branch.lastSettlementDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals row */}
      {!isLoading && !isEmpty && (
        <div className="p-4 bg-[#0F0F0F] border-t border-[#2A2A2A]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Showing {filteredBranches.length} of {branchData.totalBranches} branches
            </span>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-gray-400">
                Wallet Balance:{" "}
                <span className="text-green-400 font-semibold">
                  {formatCurrency(
                    filteredBranches.reduce((sum, b) => sum + (b.walletBalance || 0), 0)
                  )}
                </span>
              </span>
              <span className="text-gray-400">
                Total Top-Ups:{" "}
                <span className="text-blue-400 font-semibold">
                  {formatCurrency(
                    filteredBranches.reduce((sum, b) => sum + (b.walletTotalToppedUp || 0), 0)
                  )}
                </span>
              </span>
              <span className="text-gray-400">
                Total Earnings:{" "}
                <span className="text-white font-semibold">
                  {formatCurrency(
                    filteredBranches.reduce((sum, b) => sum + b.totalEarnings, 0)
                  )}
                </span>
              </span>
              <span className="text-gray-400">
                Pending:{" "}
                <span className="text-orange-400 font-semibold">
                  {formatCurrency(
                    filteredBranches.reduce((sum, b) => sum + b.pendingAmount, 0)
                  )}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Branch Detail Modal */}
      <BranchWalletDetailModal
        branchId={selectedBranchId}
        isOpen={!!selectedBranchId}
        onClose={() => setSelectedBranchId(null)}
      />
    </div>
  );
}

export default BranchBreakdownTable;
